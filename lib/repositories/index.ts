// ABOUTME: DB非依存のRepository契約と実装選択の入口を定義する。
// ABOUTME: 各機能はこの契約だけを使い、Supabase依存を一箇所に隔離する。
import { supabaseRepositories } from "./supabase";
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

export interface MemberRepository {
  findByAddress(address: Address): Promise<Member | null>;
  upsertByAddress(address: Address): Promise<Member>;
  updateDisplayName(memberId: string, displayName: string): Promise<void>;
}

export interface ProgressRepository {
  listByMember(memberId: string): Promise<ProgressEntry[]>;
  save(memberId: string, stepId: string, answer: string | null): Promise<void>;
}

export interface ApplicationRepository {
  /**
   * 却下済みも含めた直近の申請。申請者へ却下の結果を伝えるために使う。
   * 重複申請の判定はここではなく、`create` が返す DuplicateApplicationError
   * (DBの一意インデックス applications_active_per_member)が担う。
   */
  findLatestByMember(memberId: string): Promise<Application | null>;
  create(memberId: string): Promise<Application>;
  listAll(): Promise<ApplicationWithMember[]>;
  /** 指定した申請の遷移履歴を新しい順で返す。理由の表示に使う。 */
  listEvents(applicationIds: string[]): Promise<ApplicationEvent[]>;
  /**
   * 状態を遷移させる。`expectedStatus` は呼び出し側が遷移ルールを検証した時点の値で、
   * 実装はこれを条件にした条件付き更新を行う。DB上の値が変わっていた場合は
   * 何も書き換えずに ConcurrentTransitionError を投げる。
   */
  transition(params: {
    applicationId: string;
    field: StatusField;
    toStatus: string;
    expectedStatus: string;
    actorAddress: Address;
    reason?: string;
    txId?: string;
  }): Promise<void>;
}

export interface CheckinRepository {
  checkinToday(memberId: string): Promise<{ created: boolean; checkin: Checkin }>;
  /** その日の行の一言を上書きする。本人の行だけを対象にするため memberId も絞り込む。 */
  updateNote(memberId: string, checkinId: string, note: string | null): Promise<void>;
  listByMember(memberId: string): Promise<Checkin[]>;
}

export interface RateLimitRepository {
  /**
   * 1回分を数えて、上限内なら true、越えていれば false を返す。
   * 数え上げと判定はDB側の関数が1文で行う(同時呼び出しで上限を越えないため)。
   */
  consume(params: {
    bucket: string;
    subject: Address;
    limit: number;
    windowSeconds: number;
  }): Promise<boolean>;
}

export class DuplicateApplicationError extends Error {
  constructor(message = "active application already exists") {
    super(message);
    this.name = "DuplicateApplicationError";
  }
}

/** 検証時のステータスから変わっていたため、遷移を適用しなかったことを示す。 */
export class ConcurrentTransitionError extends Error {
  constructor(message = "application status changed since validation") {
    super(message);
    this.name = "ConcurrentTransitionError";
  }
}

export type Repositories = {
  members: MemberRepository;
  progress: ProgressRepository;
  applications: ApplicationRepository;
  checkins: CheckinRepository;
  rateLimits: RateLimitRepository;
};

export function getRepositories(): Repositories {
  return supabaseRepositories;
}
