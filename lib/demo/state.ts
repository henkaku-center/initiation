// Browser-only demonstration model. No production repositories or wallet calls.
export const DEMO_STORAGE_KEY = "henkaku.portal-demo.v1";
import { interestOptions } from "@/lib/initiation/journey";
export { interestOptions, contributionOptions } from "@/lib/initiation/journey";
export type DemoAnswers = {
  name: string;
  interests: string[];
  curiosity: string;
  experience: string;
  readiness: string;
  contribution: string;
};
export type DemoState = {
  version: 1;
  connected: boolean;
  account: "newcomer" | "member";
  network: "polygon" | "other";
  signedIn: boolean;
  readStatus: "ready" | "loading" | "error";
  tokenAdded: boolean;
  stage: number;
  finalQuestion: number;
  answers: DemoAnswers;
  completed: boolean;
  participantNFT: boolean;
  application: "none" | "pending" | "needs_info" | "approved" | "rejected";
  rewardClaimed: boolean;
  checkins: string[];
};
export type DemoAction =
  | { type: "connect"; account: DemoState["account"] }
  | {
      type:
        | "disconnect"
        | "signIn"
        | "addToken"
        | "nextStage"
        | "previousStage"
        | "revisitJourney"
        | "finish"
        | "claimNFT"
        | "apply"
        | "claimReward"
        | "reset";
    }
  | { type: "network"; network: DemoState["network"] }
  | { type: "reading"; status: DemoState["readStatus"] }
  | {
      type: "answer";
      key: Exclude<keyof DemoAnswers, "interests">;
      value: string;
    }
  | { type: "interest"; value: string }
  | { type: "review"; result: "approved" | "needs_info" | "rejected" }
  | { type: "checkin"; date: string };

export function createDemoState(): DemoState {
  return {
    version: 1,
    connected: false,
    account: "newcomer",
    network: "polygon",
    signedIn: false,
    readStatus: "ready",
    tokenAdded: false,
    stage: 0,
    finalQuestion: 0,
    answers: {
      name: "",
      interests: [],
      curiosity: "",
      experience: "",
      readiness: "",
      contribution: "",
    },
    completed: false,
    participantNFT: false,
    application: "none",
    rewardClaimed: false,
    checkins: [],
  };
}

export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case "reset":
      return createDemoState();
    case "connect":
      return {
        ...(state.account === action.account ? state : createDemoState()),
        connected: true,
        account: action.account,
        network: "polygon",
        readStatus: "ready",
      };
    case "disconnect":
      return {
        ...state,
        connected: false,
        signedIn: false,
        readStatus: "ready",
      };
    case "network":
      return {
        ...state,
        network: action.network,
        signedIn: action.network === "other" ? false : state.signedIn,
      };
    case "signIn":
      return state.connected && state.network === "polygon"
        ? { ...state, signedIn: true }
        : state;
    case "addToken":
      return state.connected && state.network === "polygon"
        ? { ...state, tokenAdded: true }
        : state;
    case "reading":
      return { ...state, readStatus: action.status };
    case "answer":
      return {
        ...state,
        answers: {
          ...state.answers,
          [action.key]: action.value.slice(
            0,
            action.key === "name" ? 40 : 2000,
          ),
        },
      };
    case "interest": {
      if (!(interestOptions as readonly string[]).includes(action.value))
        return state;
      const selected = state.answers.interests;
      return {
        ...state,
        answers: {
          ...state.answers,
          interests: selected.includes(action.value)
            ? selected.filter((v) => v !== action.value)
            : [...selected, action.value],
        },
      };
    }
    case "revisitJourney":
      return state.completed ? { ...state, stage: 1, finalQuestion: 0 } : state;
    case "nextStage":
      return state.stage === 4
        ? { ...state, finalQuestion: Math.min(2, state.finalQuestion + 1) }
        : { ...state, stage: state.stage + 1 };
    case "previousStage":
      return state.stage === 4 && state.finalQuestion > 0
        ? { ...state, finalQuestion: state.finalQuestion - 1 }
        : { ...state, stage: Math.max(0, state.stage - 1) };
    case "finish":
      return state.stage === 4 && state.finalQuestion === 2
        ? { ...state, completed: true }
        : state;
    case "claimNFT":
      return state.completed ? { ...state, participantNFT: true } : state;
    case "apply":
      return state.connected &&
        state.signedIn &&
        state.network === "polygon" &&
        state.participantNFT &&
        ["none", "needs_info"].includes(state.application)
        ? { ...state, application: "pending" }
        : state;
    case "review":
      return state.application === "pending"
        ? { ...state, application: action.result }
        : state;
    case "claimReward":
      return state.connected &&
        state.signedIn &&
        state.network === "polygon" &&
        state.application === "approved" &&
        state.participantNFT
        ? { ...state, rewardClaimed: true }
        : state;
    case "checkin":
      return /^\d{4}-\d{2}-\d{2}$/.test(action.date) &&
        !state.checkins.includes(action.date)
        ? { ...state, checkins: [...state.checkins, action.date].slice(-90) }
        : state;
  }
}

export function walletSnapshot(
  state: DemoState,
):
  | { kind: "disconnected" | "unsupported" | "loading" | "error" }
  | { kind: "ready"; balance: number; allowlisted: boolean } {
  if (!state.connected) return { kind: "disconnected" };
  if (state.network !== "polygon") return { kind: "unsupported" };
  if (state.readStatus !== "ready") return { kind: state.readStatus };
  return {
    kind: "ready",
    balance:
      (state.account === "member" ? 250 : 0) + (state.rewardClaimed ? 100 : 0),
    allowlisted: state.account === "member" || state.application === "approved",
  };
}

export function restoreDemoState(raw: string | null): DemoState {
  if (!raw) return createDemoState();
  try {
    const s = JSON.parse(raw) as DemoState;
    const bools = [
      s.connected,
      s.signedIn,
      s.tokenAdded,
      s.completed,
      s.participantNFT,
      s.rewardClaimed,
    ];
    if (
      s.version !== 1 ||
      bools.some((v) => typeof v !== "boolean") ||
      !["newcomer", "member"].includes(s.account) ||
      !["polygon", "other"].includes(s.network) ||
      !["ready", "loading", "error"].includes(s.readStatus) ||
      !Number.isInteger(s.stage) ||
      s.stage < 0 ||
      s.stage > 4 ||
      !Number.isInteger(s.finalQuestion) ||
      s.finalQuestion < 0 ||
      s.finalQuestion > 2 ||
      !["none", "pending", "needs_info", "approved", "rejected"].includes(
        s.application,
      ) ||
      !s.answers ||
      !["name", "curiosity", "experience", "readiness", "contribution"].every(
        (k) =>
          typeof s.answers[k as Exclude<keyof DemoAnswers, "interests">] ===
            "string" &&
          s.answers[k as Exclude<keyof DemoAnswers, "interests">].length <=
            2000,
      ) ||
      !Array.isArray(s.answers.interests) ||
      s.answers.interests.length > 9 ||
      !s.answers.interests.every((v) =>
        (interestOptions as readonly string[]).includes(v),
      ) ||
      !Array.isArray(s.checkins) ||
      s.checkins.length > 90 ||
      !s.checkins.every(
        (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v),
      )
    )
      return createDemoState();
    // A pending read is transient; don't restore an endless spinner after reload.
    return {
      ...s,
      readStatus: s.readStatus === "loading" ? "ready" : s.readStatus,
    };
  } catch {
    return createDemoState();
  }
}
