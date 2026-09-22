// ABOUTME: RepositoriesのSupabase実装。snake_case行をcamelCaseドメイン型に変換する。
// ABOUTME: サーバー専用のservice_role接続でMVP-1の永続化操作を提供する。
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalizeAddress } from "@/lib/domain/address";
import type {
  Address,
  Application,
  ApplicationEvent,
  ApplicationWithMember,
  Checkin,
  Member,
  ProgressEntry,
  StatusField,
} from "@/lib/domain/types";
import {
  ConcurrentTransitionError,
  DuplicateApplicationError,
  type ApplicationRepository,
  type CheckinRepository,
  type MemberRepository,
  type ProgressRepository,
  type RateLimitRepository,
  type Repositories,
} from "./index";

type Row = Record<string, unknown>;

function client(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }
  return createClient(url, key);
}

function toMember(row: Row): Member {
  return {
    id: row.id as string,
    walletAddress: row.wallet_address as Address,
    displayName: (row.display_name as string) ?? null,
    discordUsername: (row.discord_username as string) ?? null,
    firstAuthenticatedAt: row.first_authenticated_at as string,
  };
}

const members: MemberRepository = {
  async findByAddress(address) {
    const normalizedAddress = normalizeAddress(address);
    const { data, error } = await client()
      .from("members")
      .select("*")
      .eq("wallet_address", normalizedAddress)
      .maybeSingle();
    if (error) throw error;
    return data ? toMember(data as Row) : null;
  },

  async upsertByAddress(address) {
    const normalizedAddress = normalizeAddress(address);
    const { data, error } = await client()
      .from("members")
      .upsert({ wallet_address: normalizedAddress }, { onConflict: "wallet_address" })
      .select()
      .single();
    if (error) throw error;
    return toMember(data as Row);
  },

  async updateDisplayName(memberId, displayName) {
    const { error } = await client()
      .from("members")
      .update({ display_name: displayName })
      .eq("id", memberId);
    if (error) throw error;
  },

  async updateDiscordUsername(memberId, discordUsername) {
    const { error } = await client()
      .from("members")
      .update({ discord_username: discordUsername })
      .eq("id", memberId);
    if (error) throw error;
  },
};

const progress: ProgressRepository = {
  async listByMember(memberId) {
    const { data, error } = await client()
      .from("initiation_progress")
      .select("*")
      .eq("member_id", memberId)
      .order("completed_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row) => {
      const r = row as Row;
      return {
        stepId: r.step_id as string,
        answer: (r.answer as string) ?? null,
        completedAt: r.completed_at as string,
      } satisfies ProgressEntry;
    });
  },

  async save(memberId, stepId, answer) {
    const { error } = await client()
      .from("initiation_progress")
      .upsert(
        {
          member_id: memberId,
          step_id: stepId,
          answer,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "member_id,step_id" },
      );
    if (error) throw error;
  },
};

function toApplication(row: Row): Application {
  return {
    id: row.id as string,
    memberId: row.member_id as string,
    reviewStatus: row.review_status as Application["reviewStatus"],
    allowlistStatus: row.allowlist_status as Application["allowlistStatus"],
    distributionStatus: row.distribution_status as Application["distributionStatus"],
    distributionTxId: (row.distribution_tx_id as string) ?? null,
    reason: (row.reason as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function toApplicationEvent(row: Row): ApplicationEvent {
  return {
    id: row.id as string,
    applicationId: row.application_id as string,
    field: row.field as StatusField,
    fromStatus: (row.from_status as string) ?? null,
    toStatus: row.to_status as string,
    actorAddress: row.actor_address as Address,
    reason: (row.reason as string) ?? null,
    txId: (row.tx_id as string) ?? null,
    createdAt: row.created_at as string,
  };
}

// どのフィールドがどの列に対応するかは transition_application 関数が持つ。
// ここは受け付ける値の網羅性だけをRecordで担保する(StatusFieldを増やすと型エラーになる)。
const VALID_STATUS_FIELDS: Record<StatusField, true> = {
  review: true,
  allowlist: true,
  distribution: true,
};

const applications: ApplicationRepository = {
  async findLatestByMember(memberId) {
    // 却下済みは member あたり複数行あり得る(applications_active_per_member は
    // rejected を対象外にしている)ため、maybeSingle ではなく最新の1件を取る。
    const { data, error } = await client()
      .from("applications")
      .select("*")
      .eq("member_id", memberId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? toApplication(data as Row) : null;
  },

  async create(memberId) {
    const { data, error } = await client()
      .from("applications")
      .insert({ member_id: memberId })
      .select()
      .single();
    if (error) {
      if (error.code === "23505") {
        throw new DuplicateApplicationError();
      }
      throw error;
    }
    return toApplication(data as Row);
  },

  async listAll() {
    const { data, error } = await client()
      .from("applications")
      .select("*, members(wallet_address, display_name, discord_username)")
      .order("created_at", { ascending: false });
    if (error) throw error;

    return (data ?? []).map((row) => {
      const r = row as Row;
      const relatedMember = Array.isArray(r.members) ? r.members[0] : r.members;
      if (!relatedMember || typeof relatedMember !== "object") {
        throw new Error(`member relation missing for application ${String(r.id)}`);
      }
      const member = relatedMember as Row;
      return {
        ...toApplication(r),
        walletAddress: member.wallet_address as Address,
        displayName: (member.display_name as string) ?? null,
        discordUsername: (member.discord_username as string) ?? null,
      } satisfies ApplicationWithMember;
    });
  },

  async listEvents(applicationIds) {
    if (applicationIds.length === 0) return [];
    const { data, error } = await client()
      .from("application_events")
      .select("*")
      .in("application_id", applicationIds)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => toApplicationEvent(row as Row));
  },

  async transition({ applicationId, field, toStatus, expectedStatus, actorAddress, reason, txId }) {
    if (!VALID_STATUS_FIELDS[field]) throw new Error(`invalid application field: ${field}`);

    // 条件付きUPDATEと監査イベントのINSERTをPostgres関数側で1トランザクションにする。
    // 別々に発行すると、UPDATE成功後にINSERTが失敗したときUPDATEが巻き戻らず、
    // 状態だけが変わって監査ログが残らない(Issue #21)。
    const { data, error } = await client().rpc("transition_application", {
      p_application_id: applicationId,
      p_field: field,
      p_to_status: toStatus,
      p_expected_status: expectedStatus,
      p_actor_address: normalizeAddress(actorAddress),
      p_reason: reason ?? null,
      p_tx_id: txId ?? null,
    });
    if (error) throw error;
    // 0行更新のとき関数はNULLを返す。検証時から状態が変わっていたことを意味する。
    if (!data) throw new ConcurrentTransitionError();
  },
};

function toCheckin(row: Row): Checkin {
  return {
    id: row.id as string,
    memberId: row.member_id as string,
    checkinDate: row.checkin_date as string,
    createdAt: row.created_at as string,
  };
}

const checkins: CheckinRepository = {
  async checkinToday(memberId) {
    const { data, error } = await client()
      .from("checkins")
      .insert({ member_id: memberId })
      .select()
      .single();
    if (error && error.code === "23505") {
      const { data: existing, error: existingError } = await client()
        .from("checkins")
        .select("*")
        .eq("member_id", memberId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (existingError) throw existingError;
      return { created: false, checkin: toCheckin(existing as Row) };
    }
    if (error) throw error;
    return { created: true, checkin: toCheckin(data as Row) };
  },

  async listByMember(memberId) {
    const { data, error } = await client()
      .from("checkins")
      .select("*")
      .eq("member_id", memberId)
      .order("checkin_date", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => toCheckin(row as Row));
  },
};

const rateLimits: RateLimitRepository = {
  async consume({ bucket, subject, limit, windowSeconds }) {
    const { data, error } = await client().rpc("consume_rate_limit", {
      p_bucket: bucket,
      p_subject: subject,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) throw error;
    // 判定はDB側で完結している。ここで data を数値と比較し直さないのは、
    // 上限の解釈が2箇所に分かれると片方だけ直したときにずれるため。
    return data === true;
  },
};

export const supabaseRepositories: Repositories = {
  members,
  progress,
  applications,
  checkins,
  rateLimits,
};
