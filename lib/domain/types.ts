// ABOUTME: Initiation MVP-1の永続化モデルと状態値を定義する。
// ABOUTME: Repositoryと画面の間で使うDB非依存のドメイン型を提供する。
export type Address = `0x${string}`;
export type ReviewStatus = "pending" | "needs_info" | "approved" | "rejected";
export type AllowlistStatus = "pending" | "added" | "failed";
export type DistributionStatus = "pending" | "sent" | "failed";
export type StatusField = "review" | "allowlist" | "distribution";

export type Member = {
  id: string;
  walletAddress: Address;
  displayName: string | null;
  /** 承認後に運営が連絡するための参加の前提。未登録は null(Issue #117)。 */
  discordUsername: string | null;
  firstAuthenticatedAt: string;
};

export type ProgressEntry = {
  stepId: string;
  answer: string | null;
  completedAt: string;
};

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

/**
 * 状態遷移1回の記録。`applications.reason` は直近の理由で上書きされるため、
 * 「どの操作にどの理由が付いたか」はこちらが正本になる(Issue #19)。
 */
export type ApplicationEvent = {
  id: string;
  applicationId: string;
  field: StatusField;
  fromStatus: string | null;
  toStatus: string;
  actorAddress: Address;
  reason: string | null;
  txId: string | null;
  createdAt: string;
};

export type ApplicationWithMember = Application & {
  walletAddress: Address;
  displayName: string | null;
  discordUsername: string | null;
};

export type Checkin = {
  id: string;
  memberId: string;
  checkinDate: string;
  /** その日のSignal。書いていなければ null(Issue #119)。 */
  note: string | null;
  createdAt: string;
};
