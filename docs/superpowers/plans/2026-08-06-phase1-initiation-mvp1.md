# フェーズ1: Initiation MVP-1 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新入りが自分で Initiation を完走し、申請が承認者に届き、人手で Allowlist 追加とトークン配布まで一巡できる状態を作る。

**Architecture:** Next.js(App Router)モノリス。DB アクセスは Repository 層(`lib/repositories/`)に隔離し、Supabase(PostgreSQL)実装を注入する。書き込みは Server Actions / Route Handlers、認証はフェーズ0の SIWE + iron-session を引き継ぎ、管理画面は管理者アドレスの allowlist(env)で保護する。Allowlist 更新・トークン配布の実行はアプリに含めない(申請の記録と状態管理のみ)。

**Tech Stack:** Next.js 15(App Router)/ TypeScript(strict)/ wagmi v2 + viem / siwe + iron-session / Supabase(PostgreSQL + migration CLI)/ Vitest

## Global Constraints

- フェーズ0計画の Global Constraints をすべて引き継ぐ(mise 経由、Polygon 137、トークン設定は env、Cookie は HttpOnly/Secure/SameSite=Lax、watchAsset を完了条件にしない、シークレット非コミット)。
- **前提**: フェーズ0 Task 6 で DB に Supabase が選定されていること。別の DB になった場合は Task 1〜2 の実装(SQL・クライアント)を差し替える。Repository インターフェース(Task 2)は DB 非依存に保つ。
- ウォレットアドレスは保存・比較の前に必ず小文字に正規化する(`normalizeAddress`)。
- Allowlist 更新・トークン配布をアプリから実行するコードを書かない。配布権限を持つ鍵はアプリに置かない。
- 状態の遷移はすべて `application_events` に監査記録を残す(実行者・時刻・理由・トランザクションID)。
- 管理系のページ・API は `requireAdmin()` を通さずに公開しない。
- Repository の統合テストはローカル Supabase(`npx supabase start`)に対して実行する。テストは各ケース冒頭でテーブルを truncate して独立させる。
- UI 文言は日本語。コード・識別子は英語。

## 人の決定が必要な入力(実装前に確定させる)

- **Initiation の質問・クエストの本文**: Task 6 に仮コンテンツを定義するが、公開前にコミュニティで確定した本文に差し替える(データファイル `lib/initiation/content.ts` の書き換えのみで済む構造にする)。
- **管理者アドレス一覧**: `ADMIN_ADDRESSES` に設定する実アドレス。
- **HENKAKU トークンのコントラクトアドレス**: `NEXT_PUBLIC_HENKAKU_TOKEN_ADDRESS`。
- **プライバシー方針**: MVP-1の方針は `docs/privacy-policy.md` と Issue #36 の決定記録に従う。質問箱、外部公開ビュー、AI機能は導入前に方針を更新する。

---

### Task 1: DB スキーマと migration

**Files:**
- Delete: `supabase/migrations/00000000000000_spike.sql`(フェーズ0の残骸)
- Create: `supabase/migrations/20260806000001_core_tables.sql`

**Interfaces:**
- Consumes: フェーズ0 Task 6 の Supabase セットアップ(`supabase/` ディレクトリ)
- Produces: `members` / `initiation_progress` / `applications` / `application_events` / `checkins` テーブル。Task 2 の Repository が読み書きする。

- [x] **Step 1: migration SQL を書く**

`supabase/migrations/20260806000001_core_tables.sql`:

```sql
-- MVP-1 コアテーブル。questions/answers(質問箱)はフェーズ2で追加する。

create table members (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null unique
    check (wallet_address = lower(wallet_address)),
  display_name text,
  first_authenticated_at timestamptz not null default now()
);

create table initiation_progress (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id),
  step_id text not null,
  answer text,
  completed_at timestamptz not null default now(),
  unique (member_id, step_id)
);

create table applications (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id),
  review_status text not null default 'pending'
    check (review_status in ('pending', 'needs_info', 'approved', 'rejected')),
  allowlist_status text not null default 'pending'
    check (allowlist_status in ('pending', 'added', 'failed')),
  distribution_status text not null default 'pending'
    check (distribution_status in ('pending', 'sent', 'failed')),
  distribution_tx_id text,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 重複申請防止: rejected 以外の申請は member あたり 1 件
create unique index applications_active_per_member
  on applications (member_id)
  where review_status <> 'rejected';

create table application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id),
  field text not null check (field in ('review', 'allowlist', 'distribution')),
  from_status text,
  to_status text not null,
  actor_address text not null,
  reason text,
  tx_id text,
  created_at timestamptz not null default now()
);

create table checkins (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id),
  checkin_date date not null default ((now() at time zone 'Asia/Tokyo')::date),
  created_at timestamptz not null default now(),
  unique (member_id, checkin_date)
);
```

- [x] **Step 2: migration が適用できることを確認する**

```bash
mise exec -- npx supabase start
mise exec -- npx supabase db reset
```

Expected: エラーなく全 migration が適用される。`npx supabase db reset` の出力で 5 テーブルの作成を確認。

- [x] **Step 3: コミット**

```bash
git add supabase/
git commit -m "feat: core tables migration (members, progress, applications, events, checkins)"
```

---

### Task 2: ドメイン型・アドレス正規化・Repository 層

**Files:**
- Create: `lib/domain/types.ts`
- Create: `lib/domain/address.ts`
- Create: `lib/repositories/index.ts`
- Create: `lib/repositories/supabase.ts`
- Create: `tests/support/repositories.ts`
- Test: `tests/unit/lib/domain/address.test.ts`
- Test: `tests/integration/repositories.test.ts`

**Interfaces:**
- Consumes: Task 1 のテーブル、`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`
- Produces(以降の全タスクが使う):

```ts
// lib/domain/types.ts
export type Address = `0x${string}`;
export type ReviewStatus = "pending" | "needs_info" | "approved" | "rejected";
export type AllowlistStatus = "pending" | "added" | "failed";
export type DistributionStatus = "pending" | "sent" | "failed";
export type StatusField = "review" | "allowlist" | "distribution";

export type Member = {
  id: string;
  walletAddress: Address;
  displayName: string | null;
  firstAuthenticatedAt: string;
};

export type ProgressEntry = { stepId: string; answer: string | null; completedAt: string };

export type Application = {
  id: string;
  memberId: string;
  reviewStatus: ReviewStatus;
  allowlistStatus: AllowlistStatus;
  distributionStatus: DistributionStatus;
  distributionTxId: string | null;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApplicationWithMember = Application & { walletAddress: Address; displayName: string | null };

export type Checkin = { id: string; memberId: string; checkinDate: string; createdAt: string };
```

```ts
// lib/domain/address.ts
export function normalizeAddress(address: string): Address; // 小文字化。0x + 40 hex でなければ throw
```

```ts
// lib/repositories/index.ts
export interface MemberRepository {
  findByAddress(address: Address): Promise<Member | null>;
  upsertByAddress(address: Address): Promise<Member>;
  updateDisplayName(memberId: string, displayName: string): Promise<void>;
}
export interface ProgressRepository {
  listByMember(memberId: string): Promise<ProgressEntry[]>;
  save(memberId: string, stepId: string, answer: string | null): Promise<void>; // upsert
}
export interface ApplicationRepository {
  findActiveByMember(memberId: string): Promise<Application | null>; // rejected 以外
  create(memberId: string): Promise<Application>; // アクティブ申請が既にあれば throw DuplicateApplicationError
  listAll(): Promise<ApplicationWithMember[]>; // createdAt 降順
  transition(params: {
    applicationId: string;
    field: StatusField;
    toStatus: string;
    actorAddress: Address;
    reason?: string;
    txId?: string;
  }): Promise<void>; // applications 更新 + application_events 追記
}
export interface CheckinRepository {
  checkinToday(memberId: string): Promise<{ created: boolean; checkin: Checkin }>; // 同日 2 回目は created: false
  listByMember(memberId: string): Promise<Checkin[]>;
}
export class DuplicateApplicationError extends Error {}
export type Repositories = {
  members: MemberRepository;
  progress: ProgressRepository;
  applications: ApplicationRepository;
  checkins: CheckinRepository;
};
export function getRepositories(): Repositories; // Supabase 実装を返す唯一の入口
```

- [x] **Step 1: `normalizeAddress` の失敗するテストを書く**

`tests/unit/lib/domain/address.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { normalizeAddress } from "@/lib/domain/address";

describe("normalizeAddress", () => {
  it("lowercases a checksummed address", () => {
    expect(normalizeAddress("0xAbCd567890123456789012345678901234567890"))
      .toBe("0xabcd567890123456789012345678901234567890");
  });
  it("throws on a non-address string", () => {
    expect(() => normalizeAddress("hello")).toThrow(/address/i);
  });
  it("throws on wrong length", () => {
    expect(() => normalizeAddress("0x1234")).toThrow(/address/i);
  });
});
```

Run: `mise exec -- npm test` → Expected: FAIL(モジュールなし)

- [x] **Step 2: `lib/domain/address.ts` と `lib/domain/types.ts` を実装してテストを通す**

```ts
// ABOUTME: ウォレットアドレスの正規化。保存・比較の前に必ずこれを通す。
import { isAddress } from "viem";
import type { Address } from "./types";

export function normalizeAddress(address: string): Address {
  if (!isAddress(address)) throw new Error(`invalid address: ${address}`);
  return address.toLowerCase() as Address;
}
```

`lib/domain/types.ts` は Interfaces 節のとおり作成する。

Run: `mise exec -- npm test` → Expected: PASS

- [x] **Step 3: Repository 統合テストを書く**

`tests/support/repositories.ts`:

```ts
// ABOUTME: Repository 統合テスト用のローカル Supabase 接続とテーブル初期化。
import { createClient } from "@supabase/supabase-js";

export function testClient() {
  const url = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY を設定してください(supabase status で取得)");
  return createClient(url, key);
}

export async function truncateAll() {
  const client = testClient();
  // FK の子から順に消す
  for (const table of ["application_events", "applications", "initiation_progress", "checkins", "members"]) {
    await client.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
  }
}
```

`tests/integration/repositories.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { getRepositories, DuplicateApplicationError } from "@/lib/repositories";
import { truncateAll } from "@/tests/support/repositories";
import { normalizeAddress } from "@/lib/domain/address";

const ADDR = normalizeAddress("0x1111111111111111111111111111111111111111");
const ADMIN = normalizeAddress("0x2222222222222222222222222222222222222222");

describe("repositories (local supabase)", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it("upserts a member idempotently by address", async () => {
    const { members } = getRepositories();
    const first = await members.upsertByAddress(ADDR);
    const second = await members.upsertByAddress(ADDR);
    expect(second.id).toBe(first.id);
    expect(second.walletAddress).toBe(ADDR);
  });

  it("saves and overwrites progress per step", async () => {
    const { members, progress } = getRepositories();
    const m = await members.upsertByAddress(ADDR);
    await progress.save(m.id, "q1", "最初の回答");
    await progress.save(m.id, "q1", "書き直した回答");
    const entries = await progress.listByMember(m.id);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ stepId: "q1", answer: "書き直した回答" });
  });

  it("prevents duplicate active applications", async () => {
    const { members, applications } = getRepositories();
    const m = await members.upsertByAddress(ADDR);
    await applications.create(m.id);
    await expect(applications.create(m.id)).rejects.toBeInstanceOf(DuplicateApplicationError);
  });

  it("allows re-application after rejection", async () => {
    const { members, applications } = getRepositories();
    const m = await members.upsertByAddress(ADDR);
    const app = await applications.create(m.id);
    await applications.transition({
      applicationId: app.id, field: "review", toStatus: "rejected",
      actorAddress: ADMIN, reason: "情報不足",
    });
    const second = await applications.create(m.id);
    expect(second.id).not.toBe(app.id);
  });

  it("records an audit event on transition", async () => {
    const { members, applications } = getRepositories();
    const m = await members.upsertByAddress(ADDR);
    const app = await applications.create(m.id);
    await applications.transition({
      applicationId: app.id, field: "distribution", toStatus: "sent",
      actorAddress: ADMIN, txId: "0xdeadbeef",
    });
    const listed = await applications.listAll();
    expect(listed[0].distributionStatus).toBe("sent");
    expect(listed[0].distributionTxId).toBe("0xdeadbeef");
    // イベントは testClient で直接確認
    const { testClient } = await import("@/tests/support/repositories");
    const { data } = await testClient().from("application_events").select("*").eq("application_id", app.id);
    expect(data).toHaveLength(1);
    expect(data![0]).toMatchObject({ field: "distribution", to_status: "sent", actor_address: ADMIN, tx_id: "0xdeadbeef" });
  });

  it("checks in once per day", async () => {
    const { members, checkins } = getRepositories();
    const m = await members.upsertByAddress(ADDR);
    const first = await checkins.checkinToday(m.id);
    const second = await checkins.checkinToday(m.id);
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(await checkins.listByMember(m.id)).toHaveLength(1);
  });
});
```

Run: `mise exec -- npx supabase start && mise exec -- npm test`
Expected: FAIL(`@/lib/repositories` が存在しない)

- [x] **Step 4: Supabase 実装を書く**

`lib/repositories/supabase.ts`(要点。行↔ドメイン型のマッピング関数を各テーブルに書く):

```ts
// ABOUTME: Repositories の Supabase 実装。snake_case 行を camelCase ドメイン型に変換する。
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type {
  Address, Member, ProgressEntry, Application, ApplicationWithMember, Checkin, StatusField,
} from "@/lib/domain/types";
import {
  DuplicateApplicationError,
  type Repositories, type MemberRepository, type ProgressRepository,
  type ApplicationRepository, type CheckinRepository,
} from "./index";

function client(): SupabaseClient {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

function toMember(row: Record<string, unknown>): Member {
  return {
    id: row.id as string,
    walletAddress: row.wallet_address as Address,
    displayName: (row.display_name as string) ?? null,
    firstAuthenticatedAt: row.first_authenticated_at as string,
  };
}

const members: MemberRepository = {
  async findByAddress(address) {
    const { data } = await client().from("members").select("*").eq("wallet_address", address).maybeSingle();
    return data ? toMember(data) : null;
  },
  async upsertByAddress(address) {
    const { data, error } = await client()
      .from("members")
      .upsert({ wallet_address: address }, { onConflict: "wallet_address" })
      .select()
      .single();
    if (error) throw error;
    return toMember(data);
  },
  async updateDisplayName(memberId, displayName) {
    const { error } = await client().from("members").update({ display_name: displayName }).eq("id", memberId);
    if (error) throw error;
  },
};

const progress: ProgressRepository = {
  async listByMember(memberId) {
    const { data, error } = await client().from("initiation_progress").select("*").eq("member_id", memberId);
    if (error) throw error;
    return (data ?? []).map((r) => ({
      stepId: r.step_id, answer: r.answer ?? null, completedAt: r.completed_at,
    })) as ProgressEntry[];
  },
  async save(memberId, stepId, answer) {
    const { error } = await client()
      .from("initiation_progress")
      .upsert(
        { member_id: memberId, step_id: stepId, answer, completed_at: new Date().toISOString() },
        { onConflict: "member_id,step_id" }
      );
    if (error) throw error;
  },
};

function toApplication(row: Record<string, unknown>): Application {
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

const STATUS_COLUMN: Record<StatusField, string> = {
  review: "review_status",
  allowlist: "allowlist_status",
  distribution: "distribution_status",
};

const applications: ApplicationRepository = {
  async findActiveByMember(memberId) {
    const { data } = await client()
      .from("applications").select("*")
      .eq("member_id", memberId).neq("review_status", "rejected")
      .maybeSingle();
    return data ? toApplication(data) : null;
  },
  async create(memberId) {
    const { data, error } = await client().from("applications").insert({ member_id: memberId }).select().single();
    if (error) {
      if (error.code === "23505") throw new DuplicateApplicationError("active application already exists");
      throw error;
    }
    return toApplication(data);
  },
  async listAll() {
    const { data, error } = await client()
      .from("applications")
      .select("*, members(wallet_address, display_name)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => ({
      ...toApplication(r),
      walletAddress: r.members.wallet_address as Address,
      displayName: (r.members.display_name as string) ?? null,
    }));
  },
  async transition({ applicationId, field, toStatus, actorAddress, reason, txId }) {
    const c = client();
    const { data: current, error: readError } = await c.from("applications").select("*").eq("id", applicationId).single();
    if (readError) throw readError;
    const update: Record<string, unknown> = {
      [STATUS_COLUMN[field]]: toStatus,
      updated_at: new Date().toISOString(),
    };
    if (reason !== undefined) update.reason = reason;
    if (field === "distribution" && txId !== undefined) update.distribution_tx_id = txId;
    const { error: updateError } = await c.from("applications").update(update).eq("id", applicationId);
    if (updateError) throw updateError;
    const { error: eventError } = await c.from("application_events").insert({
      application_id: applicationId,
      field,
      from_status: current[STATUS_COLUMN[field]],
      to_status: toStatus,
      actor_address: actorAddress,
      reason: reason ?? null,
      tx_id: txId ?? null,
    });
    if (eventError) throw eventError;
  },
};

const checkins: CheckinRepository = {
  async checkinToday(memberId) {
    const { data, error } = await client().from("checkins").insert({ member_id: memberId }).select().single();
    if (error && error.code === "23505") {
      const { data: existing } = await client()
        .from("checkins").select("*").eq("member_id", memberId)
        .order("created_at", { ascending: false }).limit(1).single();
      return { created: false, checkin: toCheckin(existing!) };
    }
    if (error) throw error;
    return { created: true, checkin: toCheckin(data) };
  },
  async listByMember(memberId) {
    const { data, error } = await client()
      .from("checkins").select("*").eq("member_id", memberId)
      .order("checkin_date", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toCheckin);
  },
};

function toCheckin(row: Record<string, unknown>): Checkin {
  return {
    id: row.id as string,
    memberId: row.member_id as string,
    checkinDate: row.checkin_date as string,
    createdAt: row.created_at as string,
  };
}

export const supabaseRepositories: Repositories = { members, progress, applications, checkins };
```

`lib/repositories/index.ts` に Interfaces 節のインターフェース定義と、次を書く:

```ts
export function getRepositories(): Repositories {
  // DB 差し替え時はここだけ変える(フェーズ0 Task 6 の選定結果に依存)
  const { supabaseRepositories } = require("./supabase") as typeof import("./supabase");
  return supabaseRepositories;
}
```

`@supabase/supabase-js` を dependencies に移す: `mise exec -- npm install @supabase/supabase-js`

- [x] **Step 5: 統合テストが通ることを確認する**

Run: `mise exec -- npx supabase status`(service role key を `.env.local` / テスト環境変数に設定)→ `mise exec -- npm test`
Expected: PASS(address 3 + repositories 6 + フェーズ0からの既存テスト)

- [ ] **Step 6: コミット**

```bash
git add -A
git commit -m "feat: domain types and Supabase repository layer"
```

---

### Task 3: 認証の本実装(member 紐付け・管理者ロール)

**Files:**
- Create: `lib/auth/admin.ts`
- Create: `lib/auth/guards.ts`
- Modify: `app/api/auth/verify/route.ts`(フェーズ0実装に member upsert を追加)
- Modify: `.env.example`(`ADMIN_ADDRESSES` を追加)
- Test: `tests/unit/lib/auth/admin.test.ts`

**Interfaces:**
- Consumes: フェーズ0の `getSession()` / `verifySiweMessage()`、Task 2 の `getRepositories()` / `normalizeAddress()`
- Produces:
  - `lib/auth/admin.ts`: `isAdminAddress(address: Address): boolean`(`ADMIN_ADDRESSES` はカンマ区切り。比較は正規化後)
  - `lib/auth/guards.ts`:
    - `requireMember(): Promise<Member>`(未認証なら `throw new UnauthenticatedError()`)
    - `requireAdmin(): Promise<{ member: Member; address: Address }>`(非管理者なら `throw new ForbiddenError()`)
    - `class UnauthenticatedError extends Error {}` / `class ForbiddenError extends Error {}`

- [x] **Step 1: `isAdminAddress` の失敗するテストを書く**

`tests/unit/lib/auth/admin.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { isAdminAddress } from "@/lib/auth/admin";
import { normalizeAddress } from "@/lib/domain/address";

describe("isAdminAddress", () => {
  beforeEach(() => {
    process.env.ADMIN_ADDRESSES =
      "0xAAA1111111111111111111111111111111111111, 0xbbb2222222222222222222222222222222222222";
  });

  it("matches regardless of case and whitespace", () => {
    expect(isAdminAddress(normalizeAddress("0xaaa1111111111111111111111111111111111111"))).toBe(true);
    expect(isAdminAddress(normalizeAddress("0xBBB2222222222222222222222222222222222222"))).toBe(true);
  });

  it("rejects a non-admin address", () => {
    expect(isAdminAddress(normalizeAddress("0xccc3333333333333333333333333333333333333"))).toBe(false);
  });

  it("returns false when env is empty", () => {
    process.env.ADMIN_ADDRESSES = "";
    expect(isAdminAddress(normalizeAddress("0xaaa1111111111111111111111111111111111111"))).toBe(false);
  });
});
```

Run: `mise exec -- npm test` → Expected: FAIL

- [x] **Step 2: 実装してテストを通す**

`lib/auth/admin.ts`:

```ts
// ABOUTME: 管理者判定。ADMIN_ADDRESSES(カンマ区切り)との正規化済み比較のみ。
import type { Address } from "@/lib/domain/types";

export function isAdminAddress(address: Address): boolean {
  const raw = process.env.ADMIN_ADDRESSES ?? "";
  const admins = raw
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .filter((a) => a.length > 0);
  return admins.includes(address);
}
```

Run: `mise exec -- npm test` → Expected: PASS

- [x] **Step 3: guards を実装する**

`lib/auth/guards.ts`:

```ts
// ABOUTME: Server Action / Route Handler 用の認可ガード。セッション→member 解決を一元化する。
import { getSession } from "@/lib/session";
import { getRepositories } from "@/lib/repositories";
import { isAdminAddress } from "./admin";
import type { Member, Address } from "@/lib/domain/types";

export class UnauthenticatedError extends Error {}
export class ForbiddenError extends Error {}

export async function requireMember(): Promise<Member> {
  const session = await getSession();
  if (!session.address) throw new UnauthenticatedError();
  const member = await getRepositories().members.findByAddress(session.address);
  if (!member) throw new UnauthenticatedError();
  return member;
}

export async function requireAdmin(): Promise<{ member: Member; address: Address }> {
  const member = await requireMember();
  if (!isAdminAddress(member.walletAddress)) throw new ForbiddenError();
  return { member, address: member.walletAddress };
}
```

- [x] **Step 4: verify ルートで member を upsert する**

`app/api/auth/verify/route.ts` の成功パス(`session.address = result.address;` の前)に追加:

```ts
import { getRepositories } from "@/lib/repositories";
import { normalizeAddress } from "@/lib/domain/address";
// ...成功時:
const address = normalizeAddress(result.address);
await getRepositories().members.upsertByAddress(address);
session.address = address;
```

`.env.example` に追記: `ADMIN_ADDRESSES=`(カンマ区切りで管理者ウォレットアドレス)

- [x] **Step 5: 手動検証とコミット**

dev サーバーでサインイン → ローカル Supabase の `members` に小文字アドレスの行ができることを確認。

```bash
git add -A
git commit -m "feat: bind SIWE session to members and add admin guard"
```

---

### Task 4: 申請の状態遷移ルール(純粋ロジック)

**Files:**
- Create: `lib/domain/applicationTransitions.ts`
- Test: `tests/unit/lib/domain/applicationTransitions.test.ts`

**Interfaces:**
- Consumes: Task 2 の型(`ReviewStatus` など)
- Produces: `validateTransition(app: Application, field: StatusField, toStatus: string): { ok: true } | { ok: false; reason: string }`。Task 9 の管理アクションが遷移実行前に必ずこれを通す。

ルール(開発計画の状態設計から確定):
- review: `pending → needs_info | approved | rejected`、`needs_info → approved | rejected`。`approved`/`rejected` からは変更不可。
- allowlist / distribution: review が `approved` のときだけ変更可。`pending → added|failed`(allowlist)、`pending → sent|failed`(distribution)、`failed → added|sent`(再試行)。`added`/`sent` は終端。
- distribution を `sent` にするとき txId 必須(検証は Task 9 のアクション側で行う)。

- [x] **Step 1: 失敗するテストを書く**

`tests/unit/lib/domain/applicationTransitions.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { validateTransition } from "@/lib/domain/applicationTransitions";
import type { Application } from "@/lib/domain/types";

function app(overrides: Partial<Application> = {}): Application {
  return {
    id: "a1", memberId: "m1",
    reviewStatus: "pending", allowlistStatus: "pending", distributionStatus: "pending",
    distributionTxId: null, reason: null,
    createdAt: "2026-08-06T00:00:00Z", updatedAt: "2026-08-06T00:00:00Z",
    ...overrides,
  };
}

describe("validateTransition", () => {
  it("allows pending -> approved for review", () => {
    expect(validateTransition(app(), "review", "approved")).toEqual({ ok: true });
  });
  it("allows needs_info -> rejected for review", () => {
    expect(validateTransition(app({ reviewStatus: "needs_info" }), "review", "rejected")).toEqual({ ok: true });
  });
  it("forbids changing a rejected review", () => {
    expect(validateTransition(app({ reviewStatus: "rejected" }), "review", "approved").ok).toBe(false);
  });
  it("forbids allowlist change before approval", () => {
    expect(validateTransition(app(), "allowlist", "added").ok).toBe(false);
  });
  it("allows allowlist pending -> added after approval", () => {
    expect(validateTransition(app({ reviewStatus: "approved" }), "allowlist", "added")).toEqual({ ok: true });
  });
  it("allows distribution failed -> sent retry after approval", () => {
    expect(
      validateTransition(app({ reviewStatus: "approved", distributionStatus: "failed" }), "distribution", "sent")
    ).toEqual({ ok: true });
  });
  it("forbids leaving a terminal sent state", () => {
    expect(
      validateTransition(app({ reviewStatus: "approved", distributionStatus: "sent" }), "distribution", "failed").ok
    ).toBe(false);
  });
  it("rejects an unknown status value", () => {
    expect(validateTransition(app(), "review", "banana").ok).toBe(false);
  });
});
```

Run: `mise exec -- npm test` → Expected: FAIL

- [x] **Step 2: 実装してテストを通す**

`lib/domain/applicationTransitions.ts`:

```ts
// ABOUTME: 申請ステータスの遷移ルール。管理アクションは実行前に必ずここを通す。
import type { Application, StatusField } from "./types";

const REVIEW_TRANSITIONS: Record<string, string[]> = {
  pending: ["needs_info", "approved", "rejected"],
  needs_info: ["approved", "rejected"],
  approved: [],
  rejected: [],
};

const EXECUTION_TRANSITIONS: Record<string, Record<string, string[]>> = {
  allowlist: { pending: ["added", "failed"], failed: ["added"], added: [] },
  distribution: { pending: ["sent", "failed"], failed: ["sent"], sent: [] },
};

export function validateTransition(
  app: Application,
  field: StatusField,
  toStatus: string
): { ok: true } | { ok: false; reason: string } {
  if (field === "review") {
    const allowed = REVIEW_TRANSITIONS[app.reviewStatus] ?? [];
    if (!allowed.includes(toStatus)) {
      return { ok: false, reason: `review: ${app.reviewStatus} -> ${toStatus} は許可されていません` };
    }
    return { ok: true };
  }
  if (app.reviewStatus !== "approved") {
    return { ok: false, reason: "承認前に実行状態は変更できません" };
  }
  const current = field === "allowlist" ? app.allowlistStatus : app.distributionStatus;
  const allowed = EXECUTION_TRANSITIONS[field][current] ?? [];
  if (!allowed.includes(toStatus)) {
    return { ok: false, reason: `${field}: ${current} -> ${toStatus} は許可されていません` };
  }
  return { ok: true };
}
```

Run: `mise exec -- npm test` → Expected: PASS

- [x] **Step 3: コミット**

```bash
git add lib/domain/applicationTransitions.ts tests/unit/lib/domain/applicationTransitions.test.ts
git commit -m "feat: application status transition rules"
```

---

### Task 5: ウォレットセットアップ導線ページ

**Files:**
- Create: `app/setup/page.tsx`
- Modify: `app/page.tsx`(トップを導線ハブにする)
- (再利用: フェーズ0の `components/ConnectWallet.tsx` / `components/SignInWithEthereum.tsx` / `components/WalletSetup.tsx`)

**Interfaces:**
- Consumes: フェーズ0 Task 2〜4 のコンポーネント
- Produces: `/setup` ページ(接続 → SIWE → Polygon 切替 → トークン追加の順に並ぶ)。完了後 `/initiation` へのリンクを出す。

- [x] **Step 1: `/setup` ページを実装する**

`app/setup/page.tsx`:

```tsx
// ABOUTME: 新入り向けウォレットセットアップ導線。shiniri 相当 + SIWE サインイン。
import { ConnectWallet } from "@/components/ConnectWallet";
import { SignInWithEthereum } from "@/components/SignInWithEthereum";
import { WalletSetup } from "@/components/WalletSetup";
import Link from "next/link";

export default function SetupPage() {
  return (
    <main>
      <h1>ウォレットセットアップ</h1>
      <section>
        <h2>1. ウォレットを接続</h2>
        <ConnectWallet />
      </section>
      <section>
        <h2>2. 署名してサインイン</h2>
        <SignInWithEthereum />
      </section>
      <section>
        <h2>3. Polygon と HENKAKU トークン</h2>
        <WalletSetup />
      </section>
      <p>
        準備ができたら <Link href="/initiation">Initiation をはじめる</Link>
      </p>
    </main>
  );
}
```

`app/page.tsx` はタイトルと `/setup` への導線だけのトップページにする。

- [x] **Step 2: 手動検証**

フェーズ0 Task 4 と同じチェックリスト(接続拒否・切替拒否・チェーン未登録・watchAsset 拒否からの復帰)を `/setup` 上で通す。

- [x] **Step 3: コミット**

```bash
git add -A
git commit -m "feat: wallet setup flow page"
```

---

### Task 6: Initiation コンテンツ定義

**Files:**
- Create: `lib/initiation/content.ts`
- Test: `tests/unit/lib/initiation/content.test.ts`

**Interfaces:**
- Consumes: なし(データ定義)
- Produces:

```ts
export type InitiationStep =
  | { id: string; kind: "question"; title: string; prompt: string }
  | { id: string; kind: "quest"; title: string; description: string };
export const initiationSteps: InitiationStep[];
export function findStep(stepId: string): InitiationStep | undefined;
```

Task 7 の画面と進捗保存が `initiationSteps` を唯一のコンテンツソースとして使う。**本文は仮**であり、公開前にコミュニティ確定版へ書き換える(このファイルの編集のみで完結する)。

- [x] **Step 1: 失敗するテストを書く**

`tests/unit/lib/initiation/content.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { initiationSteps, findStep } from "@/lib/initiation/content";

describe("initiation content", () => {
  it("has unique step ids", () => {
    const ids = initiationSteps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("has at least one question and one quest", () => {
    expect(initiationSteps.some((s) => s.kind === "question")).toBe(true);
    expect(initiationSteps.some((s) => s.kind === "quest")).toBe(true);
  });
  it("finds a step by id", () => {
    expect(findStep(initiationSteps[0].id)).toBe(initiationSteps[0]);
    expect(findStep("no-such-step")).toBeUndefined();
  });
});
```

Run: `mise exec -- npm test` → Expected: FAIL

- [x] **Step 2: 仮コンテンツで実装してテストを通す**

`lib/initiation/content.ts`:

```ts
// ABOUTME: Initiation の質問・クエスト定義。画面と進捗保存の唯一のコンテンツソース。
// ABOUTME: 本文は仮。公開前にコミュニティで確定した文面に差し替える(構造は変えない)。

export type InitiationStep =
  | { id: string; kind: "question"; title: string; prompt: string }
  | { id: string; kind: "quest"; title: string; description: string };

export const initiationSteps: InitiationStep[] = [
  {
    id: "q-introduction",
    kind: "question",
    title: "自己紹介",
    prompt: "HENKAKU で何をしてみたいですか?一言で教えてください。",
  },
  {
    id: "q-how-found",
    kind: "question",
    title: "きっかけ",
    prompt: "HENKAKU をどこで知りましたか?",
  },
  {
    id: "quest-wallet-setup",
    kind: "quest",
    title: "ウォレットの準備",
    description: "/setup でウォレット接続・Polygon 切り替え・HENKAKU トークン追加を済ませよう。",
  },
  {
    id: "quest-discord-hello",
    kind: "quest",
    title: "あいさつ",
    description: "Discord の自己紹介チャンネルであいさつしよう。",
  },
];

export function findStep(stepId: string) {
  return initiationSteps.find((s) => s.id === stepId);
}
```

Run: `mise exec -- npm test` → Expected: PASS

- [x] **Step 3: コミット**

```bash
git add lib/initiation/
git commit -m "feat: initiation steps content (placeholder copy, structure final)"
```

---

### Task 7: Initiation 画面と進捗保存

**Files:**
- Create: `app/initiation/page.tsx`
- Create: `app/initiation/actions.ts`
- Create: `lib/initiation/complete.ts`
- Create: `components/InitiationSteps.tsx`
- Test: `tests/unit/app/initiation/actions.test.ts`

**Interfaces:**
- Consumes: Task 2 `ProgressRepository`、Task 3 `requireMember`、Task 6 `initiationSteps` / `findStep`
- Produces:
  - Server Action `saveStep(stepId: string, answer: string | null): Promise<{ ok: boolean; error?: string }>`
  - `/initiation` ページ: 全ステップと完了状態を表示し、質問には回答フォーム、クエストには完了ボタンを出す
  - `isInitiationComplete(entries: ProgressEntry[]): boolean`(`lib/initiation/complete.ts` から export。Task 8 の申請フォームが完走判定に使う)

- [x] **Step 1: アクションの失敗するテストを書く**

Repository と guard をモックし、アクションの入力検証と委譲を確認する。

`tests/unit/app/initiation/actions.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const saveMock = vi.fn();
vi.mock("@/lib/repositories", () => ({
  getRepositories: () => ({ progress: { save: saveMock, listByMember: vi.fn().mockResolvedValue([]) } }),
}));
vi.mock("@/lib/auth/guards", () => ({
  requireMember: vi.fn().mockResolvedValue({ id: "m1", walletAddress: "0x" + "11".repeat(20) }),
  UnauthenticatedError: class extends Error {},
}));

import { saveStep, isInitiationComplete } from "@/app/initiation/actions";
import { initiationSteps } from "@/lib/initiation/content";

describe("saveStep", () => {
  beforeEach(() => saveMock.mockClear());

  it("saves an answer for a question step", async () => {
    const result = await saveStep("q-introduction", "AI とハードウェアをやりたい");
    expect(result.ok).toBe(true);
    expect(saveMock).toHaveBeenCalledWith("m1", "q-introduction", "AI とハードウェアをやりたい");
  });

  it("rejects an unknown step id", async () => {
    const result = await saveStep("no-such-step", "x");
    expect(result.ok).toBe(false);
    expect(saveMock).not.toHaveBeenCalled();
  });

  it("rejects an empty answer for a question step", async () => {
    const result = await saveStep("q-introduction", "   ");
    expect(result.ok).toBe(false);
  });

  it("accepts null answer for a quest step (completion mark)", async () => {
    const result = await saveStep("quest-discord-hello", null);
    expect(result.ok).toBe(true);
    expect(saveMock).toHaveBeenCalledWith("m1", "quest-discord-hello", null);
  });
});

describe("isInitiationComplete", () => {
  it("is complete only when every step has an entry", () => {
    const all = initiationSteps.map((s) => ({ stepId: s.id, answer: "x", completedAt: "t" }));
    expect(isInitiationComplete(all)).toBe(true);
    expect(isInitiationComplete(all.slice(1))).toBe(false);
    expect(isInitiationComplete([])).toBe(false);
  });
});
```

Run: `mise exec -- npm test` → Expected: FAIL

- [x] **Step 2: アクションを実装してテストを通す**

`app/initiation/actions.ts`:

```ts
// ABOUTME: Initiation 進捗の Server Actions と完走判定。
"use server";
import { requireMember, UnauthenticatedError } from "@/lib/auth/guards";
import { getRepositories } from "@/lib/repositories";
import { findStep, initiationSteps } from "@/lib/initiation/content";
import type { ProgressEntry } from "@/lib/domain/types";

export async function saveStep(
  stepId: string,
  answer: string | null
): Promise<{ ok: boolean; error?: string }> {
  const step = findStep(stepId);
  if (!step) return { ok: false, error: "不明なステップです" };
  if (step.kind === "question" && (!answer || answer.trim() === "")) {
    return { ok: false, error: "回答を入力してください" };
  }
  try {
    const member = await requireMember();
    await getRepositories().progress.save(member.id, stepId, answer);
    return { ok: true };
  } catch (e) {
    if (e instanceof UnauthenticatedError) return { ok: false, error: "サインインしてください" };
    throw e;
  }
}

export function isInitiationComplete(entries: ProgressEntry[]): boolean {
  const done = new Set(entries.map((e) => e.stepId));
  return initiationSteps.every((s) => done.has(s.id));
}
```

注: `isInitiationComplete` は同期の純粋関数なので、"use server" ファイルに置けない場合(Next.js の制約で export が async 必須)は `lib/initiation/complete.ts` に移し、テストの import も合わせて変える。

Run: `mise exec -- npm test` → Expected: PASS

- [x] **Step 3: ページとコンポーネントを実装する**

`app/initiation/page.tsx`(Server Component):

```tsx
// ABOUTME: Initiation 画面。ステップ一覧・進捗・回答フォームを表示する。
import { requireMember, UnauthenticatedError } from "@/lib/auth/guards";
import { getRepositories } from "@/lib/repositories";
import { initiationSteps } from "@/lib/initiation/content";
import { isInitiationComplete } from "@/app/initiation/actions";
import { InitiationSteps } from "@/components/InitiationSteps";
import Link from "next/link";

export default async function InitiationPage() {
  let entries;
  try {
    const member = await requireMember();
    entries = await getRepositories().progress.listByMember(member.id);
  } catch (e) {
    if (e instanceof UnauthenticatedError) {
      return (
        <main>
          <p>先に <Link href="/setup">ウォレットセットアップ</Link> でサインインしてください。</p>
        </main>
      );
    }
    throw e;
  }
  const complete = isInitiationComplete(entries);
  return (
    <main>
      <h1>Initiation</h1>
      <InitiationSteps steps={initiationSteps} entries={entries} />
      {complete && (
        <p>
          完走おめでとう! <Link href="/apply">Allowlist と HENKAKU の申請へ</Link>
        </p>
      )}
    </main>
  );
}
```

`components/InitiationSteps.tsx`:

```tsx
// ABOUTME: ステップ一覧。質問は回答フォーム、クエストは完了ボタンを表示する。
"use client";
import { useState, useTransition } from "react";
import type { InitiationStep } from "@/lib/initiation/content";
import type { ProgressEntry } from "@/lib/domain/types";
import { saveStep } from "@/app/initiation/actions";

export function InitiationSteps({ steps, entries }: { steps: InitiationStep[]; entries: ProgressEntry[] }) {
  const byId = new Map(entries.map((e) => [e.stepId, e]));
  return (
    <ol>
      {steps.map((step) => (
        <li key={step.id}>
          <StepItem step={step} entry={byId.get(step.id)} />
        </li>
      ))}
    </ol>
  );
}

function StepItem({ step, entry }: { step: InitiationStep; entry?: ProgressEntry }) {
  const [answer, setAnswer] = useState(entry?.answer ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(Boolean(entry));
  const [pending, startTransition] = useTransition();

  function submit(value: string | null) {
    setError(null);
    startTransition(async () => {
      const result = await saveStep(step.id, value);
      if (result.ok) setSaved(true);
      else setError(result.error ?? "保存できませんでした");
    });
  }

  return (
    <div>
      <h3>
        {step.title} {saved && "✅"}
      </h3>
      {step.kind === "question" ? (
        <>
          <p>{step.prompt}</p>
          <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} />
          <button disabled={pending} onClick={() => submit(answer)}>保存</button>
        </>
      ) : (
        <>
          <p>{step.description}</p>
          {!saved && (
            <button disabled={pending} onClick={() => submit(null)}>完了にする</button>
          )}
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
```

- [x] **Step 4: 手動検証**

- サインイン済みで `/initiation` → ステップが並ぶ
- 質問に回答して保存 → リロードしても ✅ と回答が残る(進捗保存)
- 全ステップ完了 → 申請への導線が出る
- 未サインインで `/initiation` → セットアップへの案内が出る

- [x] **Step 5: コミット**

```bash
git add -A
git commit -m "feat: initiation steps screen with progress persistence"
```

---

### Task 8: チェックイン

**Files:**
- Create: `app/checkin/page.tsx`
- Create: `app/checkin/actions.ts`
- Test: `tests/unit/app/checkin/actions.test.ts`

**Interfaces:**
- Consumes: Task 2 `CheckinRepository`、Task 3 `requireMember`
- Produces: Server Action `checkin(): Promise<{ ok: boolean; alreadyCheckedIn?: boolean; error?: string }>`、`/checkin` ページ(ボタン + 履歴一覧)

- [x] **Step 1: 失敗するテストを書く**

`tests/unit/app/checkin/actions.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const checkinTodayMock = vi.fn();
vi.mock("@/lib/repositories", () => ({
  getRepositories: () => ({ checkins: { checkinToday: checkinTodayMock, listByMember: vi.fn() } }),
}));
vi.mock("@/lib/auth/guards", () => ({
  requireMember: vi.fn().mockResolvedValue({ id: "m1" }),
  UnauthenticatedError: class extends Error {},
}));

import { checkin } from "@/app/checkin/actions";

describe("checkin", () => {
  beforeEach(() => checkinTodayMock.mockReset());

  it("returns ok on first checkin of the day", async () => {
    checkinTodayMock.mockResolvedValue({ created: true, checkin: { id: "c1" } });
    expect(await checkin()).toEqual({ ok: true, alreadyCheckedIn: false });
  });

  it("reports already checked in on second call", async () => {
    checkinTodayMock.mockResolvedValue({ created: false, checkin: { id: "c1" } });
    expect(await checkin()).toEqual({ ok: true, alreadyCheckedIn: true });
  });
});
```

Run: `mise exec -- npm test` → Expected: FAIL

- [x] **Step 2: 実装してテストを通す**

`app/checkin/actions.ts`:

```ts
// ABOUTME: チェックインの Server Action。1 日 1 回(JST)は Repository/DB 制約で保証される。
"use server";
import { requireMember, UnauthenticatedError } from "@/lib/auth/guards";
import { getRepositories } from "@/lib/repositories";

export async function checkin(): Promise<{ ok: boolean; alreadyCheckedIn?: boolean; error?: string }> {
  try {
    const member = await requireMember();
    const result = await getRepositories().checkins.checkinToday(member.id);
    return { ok: true, alreadyCheckedIn: !result.created };
  } catch (e) {
    if (e instanceof UnauthenticatedError) return { ok: false, error: "サインインしてください" };
    throw e;
  }
}
```

Run: `mise exec -- npm test` → Expected: PASS

- [x] **Step 3: ページを実装する**

`app/checkin/page.tsx`(Server Component で履歴取得 + 小さな Client ボタン。ボタンは `components/` に切らずページ内 Client Component ファイルにしてよいが、ここでは同パターンの `InitiationSteps` に合わせ `components/CheckinButton.tsx` を作っても可。最小実装):

```tsx
// ABOUTME: チェックインページ。今日のチェックインと履歴表示。
import { requireMember, UnauthenticatedError } from "@/lib/auth/guards";
import { getRepositories } from "@/lib/repositories";
import { CheckinButton } from "@/components/CheckinButton";
import Link from "next/link";

export default async function CheckinPage() {
  try {
    const member = await requireMember();
    const history = await getRepositories().checkins.listByMember(member.id);
    return (
      <main>
        <h1>チェックイン</h1>
        <CheckinButton />
        <h2>これまでのチェックイン</h2>
        <ul>
          {history.map((c) => (
            <li key={c.id}>{c.checkinDate}</li>
          ))}
        </ul>
      </main>
    );
  } catch (e) {
    if (e instanceof UnauthenticatedError) {
      return <main><p>先に <Link href="/setup">サインイン</Link> してください。</p></main>;
    }
    throw e;
  }
}
```

`components/CheckinButton.tsx`:

```tsx
// ABOUTME: チェックイン実行ボタン。同日 2 回目は「チェックイン済み」を表示する。
"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkin } from "@/app/checkin/actions";

export function CheckinButton() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div>
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await checkin();
            if (!result.ok) setMessage(result.error ?? "失敗しました");
            else if (result.alreadyCheckedIn) setMessage("今日はチェックイン済みです");
            else {
              setMessage("チェックインしました!");
              router.refresh();
            }
          })
        }
      >
        今日のチェックイン
      </button>
      {message && <p>{message}</p>}
    </div>
  );
}
```

- [x] **Step 4: 手動検証とコミット**

チェックイン → 履歴に今日の日付。もう一度押す → 「チェックイン済み」。

```bash
git add -A
git commit -m "feat: daily checkin"
```

---

### Task 9: 申請フォーム(Allowlist 追加 + HENKAKU 配布の申請)

**Files:**
- Create: `app/apply/page.tsx`
- Create: `app/apply/actions.ts`
- Create: `components/ApplyForm.tsx`
- Test: `tests/unit/apply/actions.test.ts`

**Interfaces:**
- Consumes: Task 2 `ApplicationRepository` / `DuplicateApplicationError`、Task 3 `requireMember`、Task 7 `isInitiationComplete`
- Produces: Server Action `submitApplication(): Promise<{ ok: boolean; error?: string }>`、`/apply` ページ(申請状態の表示 + 申請ボタン)

- [x] **Step 1: 失敗するテストを書く**

`tests/unit/apply/actions.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { initiationSteps } from "@/lib/initiation/content";

const createMock = vi.fn();
const listByMemberMock = vi.fn();
vi.mock("@/lib/repositories", async () => {
  const actual = await vi.importActual<typeof import("@/lib/repositories")>("@/lib/repositories");
  return {
    ...actual,
    getRepositories: () => ({
      applications: { create: createMock },
      progress: { listByMember: listByMemberMock },
    }),
  };
});
vi.mock("@/lib/auth/guards", () => ({
  requireMember: vi.fn().mockResolvedValue({ id: "m1" }),
  UnauthenticatedError: class extends Error {},
}));

import { submitApplication } from "@/app/apply/actions";
import { DuplicateApplicationError } from "@/lib/repositories";

const allDone = initiationSteps.map((s) => ({ stepId: s.id, answer: "x", completedAt: "t" }));

describe("submitApplication", () => {
  beforeEach(() => {
    createMock.mockReset();
    listByMemberMock.mockReset();
  });

  it("creates an application when initiation is complete", async () => {
    listByMemberMock.mockResolvedValue(allDone);
    createMock.mockResolvedValue({ id: "a1" });
    expect(await submitApplication()).toEqual({ ok: true });
    expect(createMock).toHaveBeenCalledWith("m1");
  });

  it("rejects when initiation is not complete", async () => {
    listByMemberMock.mockResolvedValue([]);
    const result = await submitApplication();
    expect(result.ok).toBe(false);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("reports duplicate application as a user-facing error", async () => {
    listByMemberMock.mockResolvedValue(allDone);
    createMock.mockRejectedValue(new DuplicateApplicationError("dup"));
    const result = await submitApplication();
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/申請済み/);
  });
});
```

Run: `mise exec -- npm test` → Expected: FAIL

- [x] **Step 2: 実装してテストを通す**

`app/apply/actions.ts`:

```ts
// ABOUTME: Allowlist 追加 + HENKAKU 配布申請の Server Action。完走が申請条件。
"use server";
import { requireMember, UnauthenticatedError } from "@/lib/auth/guards";
import { getRepositories, DuplicateApplicationError } from "@/lib/repositories";
import { isInitiationComplete } from "@/app/initiation/actions";

export async function submitApplication(): Promise<{ ok: boolean; error?: string }> {
  try {
    const member = await requireMember();
    const repos = getRepositories();
    const entries = await repos.progress.listByMember(member.id);
    if (!isInitiationComplete(entries)) {
      return { ok: false, error: "先に Initiation を完走してください" };
    }
    await repos.applications.create(member.id);
    return { ok: true };
  } catch (e) {
    if (e instanceof DuplicateApplicationError) {
      return { ok: false, error: "すでに申請済みです。審査をお待ちください" };
    }
    if (e instanceof UnauthenticatedError) return { ok: false, error: "サインインしてください" };
    throw e;
  }
}
```

Run: `mise exec -- npm test` → Expected: PASS

- [x] **Step 3: ページを実装する**

`app/apply/page.tsx`:

```tsx
// ABOUTME: 申請ページ。現在の申請状態を表示し、未申請なら申請ボタンを出す。
import { requireMember, UnauthenticatedError } from "@/lib/auth/guards";
import { getRepositories } from "@/lib/repositories";
import { ApplyForm } from "@/components/ApplyForm";
import Link from "next/link";

const REVIEW_LABEL: Record<string, string> = {
  pending: "審査待ち",
  needs_info: "追加情報が必要です(運営から連絡します)",
  approved: "承認済み",
  rejected: "見送りになりました",
};

export default async function ApplyPage() {
  try {
    const member = await requireMember();
    const app = await getRepositories().applications.findActiveByMember(member.id);
    return (
      <main>
        <h1>Allowlist と HENKAKU の申請</h1>
        {app ? (
          <dl>
            <dt>審査</dt><dd>{REVIEW_LABEL[app.reviewStatus]}</dd>
            <dt>Allowlist</dt><dd>{app.allowlistStatus === "added" ? "追加済み" : "未実施"}</dd>
            <dt>HENKAKU 配布</dt>
            <dd>{app.distributionStatus === "sent" ? `送付済み (tx: ${app.distributionTxId})` : "未実施"}</dd>
          </dl>
        ) : (
          <ApplyForm />
        )}
      </main>
    );
  } catch (e) {
    if (e instanceof UnauthenticatedError) {
      return <main><p>先に <Link href="/setup">サインイン</Link> してください。</p></main>;
    }
    throw e;
  }
}
```

`components/ApplyForm.tsx`:

```tsx
// ABOUTME: 申請実行ボタン。承認・配布は人が行うことを明記する。
"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitApplication } from "@/app/apply/actions";

export function ApplyForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <div>
      <p>申請すると運営メンバーが内容を確認し、Allowlist 追加と HENKAKU の送付を手作業で行います。</p>
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await submitApplication();
            if (result.ok) router.refresh();
            else setError(result.error ?? "申請できませんでした");
          })
        }
      >
        申請する
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
```

- [x] **Step 4: 手動検証とコミット**

完走前に `/apply` → 申請するとエラー。完走後 → 申請成功、状態「審査待ち」表示。再申請 → 「すでに申請済み」。

```bash
git add -A
git commit -m "feat: allowlist and token distribution application form"
```

---

### Task 10: 管理画面(申請一覧・承認操作・監査)

**Files:**
- Create: `app/admin/page.tsx`
- Create: `app/admin/actions.ts`
- Create: `components/AdminApplicationRow.tsx`
- Test: `tests/unit/app/admin/actions.test.ts`

**Interfaces:**
- Consumes: Task 2 `ApplicationRepository`、Task 3 `requireAdmin` / `ForbiddenError`、Task 4 `validateTransition`
- Produces: Server Action `transitionApplication(params: { applicationId: string; field: StatusField; toStatus: string; reason?: string; txId?: string }): Promise<{ ok: boolean; error?: string }>`、`/admin` ページ(申請一覧 + 操作ボタン)

- [x] **Step 1: 失敗するテストを書く**

`tests/unit/app/admin/actions.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Application } from "@/lib/domain/types";

const transitionMock = vi.fn();
const listAllMock = vi.fn();
vi.mock("@/lib/repositories", () => ({
  getRepositories: () => ({ applications: { transition: transitionMock, listAll: listAllMock } }),
}));
const requireAdminMock = vi.fn();
vi.mock("@/lib/auth/guards", () => ({
  requireAdmin: (...args: unknown[]) => requireAdminMock(...args),
  ForbiddenError: class extends Error {},
  UnauthenticatedError: class extends Error {},
}));

import { transitionApplication } from "@/app/admin/actions";

const ADMIN_ADDR = "0x" + "22".repeat(20);
function app(overrides: Partial<Application> = {}): Application & { walletAddress: string; displayName: null } {
  return {
    id: "a1", memberId: "m1",
    reviewStatus: "pending", allowlistStatus: "pending", distributionStatus: "pending",
    distributionTxId: null, reason: null, createdAt: "t", updatedAt: "t",
    walletAddress: "0x" + "11".repeat(20), displayName: null,
    ...overrides,
  };
}

describe("transitionApplication", () => {
  beforeEach(() => {
    transitionMock.mockReset();
    listAllMock.mockReset();
    requireAdminMock.mockResolvedValue({ address: ADMIN_ADDR });
  });

  it("applies a valid review transition with actor recorded", async () => {
    listAllMock.mockResolvedValue([app()]);
    const result = await transitionApplication({ applicationId: "a1", field: "review", toStatus: "approved" });
    expect(result.ok).toBe(true);
    expect(transitionMock).toHaveBeenCalledWith(
      expect.objectContaining({ applicationId: "a1", field: "review", toStatus: "approved", actorAddress: ADMIN_ADDR })
    );
  });

  it("rejects an invalid transition without touching the repository", async () => {
    listAllMock.mockResolvedValue([app({ reviewStatus: "rejected" })]);
    const result = await transitionApplication({ applicationId: "a1", field: "review", toStatus: "approved" });
    expect(result.ok).toBe(false);
    expect(transitionMock).not.toHaveBeenCalled();
  });

  it("requires txId when marking distribution as sent", async () => {
    listAllMock.mockResolvedValue([app({ reviewStatus: "approved" })]);
    const result = await transitionApplication({ applicationId: "a1", field: "distribution", toStatus: "sent" });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/トランザクション/);
  });

  it("returns error for unknown application id", async () => {
    listAllMock.mockResolvedValue([]);
    const result = await transitionApplication({ applicationId: "nope", field: "review", toStatus: "approved" });
    expect(result.ok).toBe(false);
  });
});
```

Run: `mise exec -- npm test` → Expected: FAIL

- [x] **Step 2: アクションを実装してテストを通す**

`app/admin/actions.ts`:

```ts
// ABOUTME: 管理者用の申請状態遷移アクション。requireAdmin + validateTransition を必ず通す。
"use server";
import { requireAdmin, ForbiddenError, UnauthenticatedError } from "@/lib/auth/guards";
import { getRepositories } from "@/lib/repositories";
import { validateTransition } from "@/lib/domain/applicationTransitions";
import type { StatusField } from "@/lib/domain/types";

export async function transitionApplication(params: {
  applicationId: string;
  field: StatusField;
  toStatus: string;
  reason?: string;
  txId?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { address } = await requireAdmin();
    const repos = getRepositories();
    const all = await repos.applications.listAll();
    const app = all.find((a) => a.id === params.applicationId);
    if (!app) return { ok: false, error: "申請が見つかりません" };
    const validation = validateTransition(app, params.field, params.toStatus);
    if (!validation.ok) return { ok: false, error: validation.reason };
    if (params.field === "distribution" && params.toStatus === "sent" && !params.txId?.trim()) {
      return { ok: false, error: "トランザクションIDを入力してください" };
    }
    await repos.applications.transition({
      applicationId: params.applicationId,
      field: params.field,
      toStatus: params.toStatus,
      actorAddress: address,
      reason: params.reason,
      txId: params.txId,
    });
    return { ok: true };
  } catch (e) {
    if (e instanceof ForbiddenError || e instanceof UnauthenticatedError) {
      return { ok: false, error: "権限がありません" };
    }
    throw e;
  }
}
```

Run: `mise exec -- npm test` → Expected: PASS

- [x] **Step 3: 管理ページを実装する**

`app/admin/page.tsx`:

```tsx
// ABOUTME: 管理者用の申請一覧。requireAdmin で保護し、一般メンバーには 404 相当を返す。
import { requireAdmin, ForbiddenError, UnauthenticatedError } from "@/lib/auth/guards";
import { getRepositories } from "@/lib/repositories";
import { AdminApplicationRow } from "@/components/AdminApplicationRow";
import { notFound } from "next/navigation";

export default async function AdminPage() {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof ForbiddenError || e instanceof UnauthenticatedError) notFound();
    throw e;
  }
  const applications = await getRepositories().applications.listAll();
  return (
    <main>
      <h1>申請一覧</h1>
      <table>
        <thead>
          <tr>
            <th>アドレス</th><th>審査</th><th>Allowlist</th><th>配布</th><th>操作</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((app) => (
            <AdminApplicationRow key={app.id} application={app} />
          ))}
        </tbody>
      </table>
    </main>
  );
}
```

`components/AdminApplicationRow.tsx`:

```tsx
// ABOUTME: 申請 1 件の行。現在状態に応じて実行可能な操作ボタンだけを出す。
"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ApplicationWithMember, StatusField } from "@/lib/domain/types";
import { transitionApplication } from "@/app/admin/actions";

export function AdminApplicationRow({ application }: { application: ApplicationWithMember }) {
  const [error, setError] = useState<string | null>(null);
  const [txId, setTxId] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function run(field: StatusField, toStatus: string, extra?: { reason?: string; txId?: string }) {
    setError(null);
    startTransition(async () => {
      const result = await transitionApplication({ applicationId: application.id, field, toStatus, ...extra });
      if (result.ok) router.refresh();
      else setError(result.error ?? "失敗しました");
    });
  }

  const review = application.reviewStatus;
  return (
    <tr>
      <td>{application.walletAddress}</td>
      <td>{review}</td>
      <td>{application.allowlistStatus}</td>
      <td>{application.distributionStatus}</td>
      <td>
        {(review === "pending" || review === "needs_info") && (
          <>
            <button disabled={pending} onClick={() => run("review", "approved")}>承認</button>
            <button disabled={pending} onClick={() => run("review", "rejected", { reason: "運営判断" })}>却下</button>
            {review === "pending" && (
              <button disabled={pending} onClick={() => run("review", "needs_info")}>要追加情報</button>
            )}
          </>
        )}
        {review === "approved" && application.allowlistStatus !== "added" && (
          <button disabled={pending} onClick={() => run("allowlist", "added")}>Allowlist 追加済みにする</button>
        )}
        {review === "approved" && application.distributionStatus !== "sent" && (
          <>
            <input
              placeholder="配布 tx hash"
              value={txId}
              onChange={(e) => setTxId(e.target.value)}
            />
            <button disabled={pending} onClick={() => run("distribution", "sent", { txId })}>配布済みにする</button>
          </>
        )}
        {error && <p role="alert">{error}</p>}
      </td>
    </tr>
  );
}
```

- [x] **Step 4: 手動検証**

- `ADMIN_ADDRESSES` に自分のアドレスを設定してサインイン → `/admin` に申請が並ぶ
- 承認 → Allowlist/配布ボタンが出る → 配布は tx hash 未入力だとエラー
- `ADMIN_ADDRESSES` から外したアドレスでサインイン → `/admin` は 404
- 遷移のたびにローカル Supabase の `application_events` に行が増える(実行者アドレス入り)

- [x] **Step 5: コミット**

```bash
git add -A
git commit -m "feat: admin application list with audited status transitions"
```

---

### Task 11: 手動運用フローの文書化

**Files:**
- Create: `docs/runbook-manual-operations.md`

**Interfaces:**
- Consumes: Task 9〜10 の申請・管理フロー
- Produces: 承認者向け運用手順書(フェーズ1完了条件の成果物)

- [x] **Step 1: runbook を書く**

`docs/runbook-manual-operations.md` に以下の章立てで、実際の手順を書く(担当者名・鍵の保管場所は書かない。役割名のみ):

```markdown
# 手動運用 Runbook: 申請の承認・Allowlist 追加・HENKAKU 配布

## 役割
- 承認者: ADMIN_ADDRESSES に登録されたウォレットの保持者。申請の審査と状態更新を行う
- 配布実行者: HENKAKU 配布権限を持つ鍵の保持者。承認済み申請にのみ配布する
(同一人物でもよいが、役割としては分ける)

## 日次フロー
1. /admin を開き、審査 pending / needs_info の申請を確認する
2. 申請者の Initiation 回答を確認し、承認 / 却下 / 要追加情報 を選ぶ(判断基準は下記)
3. 承認した申請について:
   a. Allowlist へアドレスを追加する(手順: 実際のコントラクト/リストの操作手順をここに記載)
   b. 完了したら /admin で「Allowlist 追加済みにする」を押す
   c. HENKAKU を送付し、トランザクション hash を控える
   d. /admin で hash を入力して「配布済みにする」を押す
4. 失敗した場合は failed にし、原因を控えて再試行する

## 判断基準
(コミュニティで決めた承認基準をここに記載。未確定の間は「承認者 2 名の合意」など暫定ルールを明記)

## 権限と鍵
- 配布権限を持つ鍵・アカウントは限定し、このアプリおよびリポジトリには置かない
- ADMIN_ADDRESSES の変更は Vercel の環境変数変更 + 再デプロイで行う

## 記録
- すべての状態変更は application_events に自動記録される(実行者・時刻・理由・tx)
- アプリ外で行った特記事項はこの文書の下の運用ログに追記する
```

「Allowlist へアドレスを追加する」の実手順と判断基準は人の決定が必要(オープンクエスチョン「最終確認する人と承認フローの具体」)。暫定運用を明記した上で、確定後に更新する。

- [x] **Step 2: コミット**

```bash
git add docs/runbook-manual-operations.md
git commit -m "docs: manual operations runbook for approval and distribution"
```

---

### Task 12: 通し確認とデプロイ(フェーズ1完了条件)

**Files:**
- Create: `docs/decisions/YYYY-MM-DD-phase-1-completion.md`(完了記録)
- Modify: `AGENTS.md`(ページ構成・テスト実行方法を追記)

**Interfaces:**
- Consumes: Task 1〜11 のすべて
- Produces: フェーズ1完了の判定。本番(Vercel + Supabase 本番プロジェクト)で一巡確認。

- [ ] **Step 1: ローカルで完走シナリオを通す**

新しいテストアドレスで:
1. `/setup`: 接続 → SIWE → Polygon 切替 → トークン追加
2. `/initiation`: 全ステップ完了(リロードで進捗が残ること)
3. `/checkin`: チェックイン
4. `/apply`: 申請 → 「審査待ち」
5. 管理者アドレスで `/admin`: 承認 → Allowlist 追加済み → tx hash 入れて配布済み
6. 申請者で `/apply`: 「承認済み / 追加済み / 送付済み (tx)」が見える
7. `mise exec -- npm test` 全 PASS、`mise exec -- npm run build` 成功

- [ ] **Step 2: Vercel + Supabase 本番プロジェクトへデプロイする**

- Supabase 本番プロジェクトを作成し `npx supabase db push` で migration 適用
- Vercel に環境変数を設定(`SESSION_PASSWORD` / `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `ADMIN_ADDRESSES` / `NEXT_PUBLIC_HENKAKU_TOKEN_*`)
- デプロイ後、本番 URL で Step 1 のシナリオを通す(配布は実トークンなので少額 or テスト運用ルールに従う)
- **公開前チェック**: `docs/privacy-policy.md` の初版が公開され、保存期間・削除依頼・問い合わせの運用担当が確認できていること

- [ ] **Step 3: 完了記録を書いてコミット**

`docs/decisions/YYYY-MM-DD-phase-1-completion.md` を作成し、フェーズ1完了日・本番 URL・残課題(仮コンテンツの差し替え状況、runbook の暫定箇所)を記録。`AGENTS.md` にページ構成(/setup, /initiation, /checkin, /apply, /admin)とテスト・migration の実行方法を追記。

```bash
git add -A
git commit -m "docs: phase 1 completion notes and deploy record"
```

---

## Self-Review 結果(計画作成時に確認済み)

- **スコープ対応**: MVP-1 の5項目(SIWE 認証 / セットアップ導線 / Initiation 画面+進捗 / チェックイン / 申請+承認画面)と「手動運用フローの文書化」はそれぞれ Task 3・5 / 5 / 6〜7 / 8 / 9〜10 / 11 が対応。質問箱(`questions`/`answers`)と `ai_usage` テーブルはフェーズ2/3 スコープのため意図的に migration から除外。
- **人の決定待ち**: Initiation 本文(Task 6)、承認基準と Allowlist 実手順(Task 11)。実装は進められるが、公開はこれらの確定が条件。
- **型整合**: `getRepositories()` / `requireMember()` / `validateTransition()` / `isInitiationComplete()` の署名は定義タスクと利用タスクで一致していることを確認済み。
