import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DemoJourney } from "@/components/demo/DemoJourney";
import {
  createDemoState,
  demoReducer,
  restoreDemoState,
  walletSnapshot,
} from "@/lib/demo/state";

describe("portal demo journey", () => {
  it("lets a completed traveler revisit saved answers without losing the passport", () => {
    const complete = { ...createDemoState(), stage:4, finalQuestion:2, completed:true, participantNFT:true, answers:{ ...createDemoState().answers, name:"保存した呼び名" } };
    const revisiting = demoReducer(complete, { type:"revisitJourney" });
    expect(revisiting).toMatchObject({ stage:1, finalQuestion:0, completed:true, participantNFT:true, answers:complete.answers });
    const html = renderToStaticMarkup(createElement(DemoJourney, { state:complete, audioRef:{current:null}, sound:false, toggleSound:() => {} }));
    expect(html).toContain("回答を見直す");
  });
  it("keeps an unavailable wallet reading distinct from zero balances", () => {
    let state = createDemoState();
    expect(walletSnapshot(state).kind).toBe("disconnected");
    state = demoReducer(state, { type: "connect", account: "newcomer" });
    expect(walletSnapshot(state)).toMatchObject({
      kind: "ready",
      balance: 0,
      allowlisted: false,
    });
    state = demoReducer(state, { type: "reading", status: "error" });
    expect(walletSnapshot(state)).toEqual({ kind: "error" });
    state = demoReducer(state, { type: "network", network: "other" });
    expect(walletSnapshot(state)).toEqual({ kind: "unsupported" });
  });

  it("requires completing the journey before the NFT and application", () => {
    let state = demoReducer(createDemoState(), {
      type: "connect",
      account: "newcomer",
    });
    state = demoReducer(state, { type: "signIn" });
    expect(demoReducer(state, { type: "claimNFT" }).participantNFT).toBe(false);
    expect(demoReducer(state, { type: "apply" }).application).toBe("none");
    expect(demoReducer(state, { type: "finish" }).completed).toBe(false);
    for (let i = 0; i < 4; i++)
      state = demoReducer(state, { type: "nextStage" });
    expect(demoReducer(state, { type: "finish" }).completed).toBe(false);
    state = demoReducer(state, { type: "nextStage" });
    expect(restoreDemoState(JSON.stringify(state)).finalQuestion).toBe(1);
    state = demoReducer(state, { type: "nextStage" });
    state = demoReducer(state, { type: "finish" });
    expect(state.completed).toBe(true); // A name and answers are optional.
    state = demoReducer(state, { type: "claimNFT" });
    state = demoReducer(state, { type: "apply" });
    expect(state.application).toBe("pending");
    expect(demoReducer(state, { type: "claimReward" }).rewardClaimed).toBe(
      false,
    );
    state = demoReducer(state, { type: "review", result: "approved" });
    expect(walletSnapshot(state)).toMatchObject({
      balance: 0,
      allowlisted: true,
    });
    state = demoReducer(state, { type: "claimReward" });
    expect(walletSnapshot(state)).toMatchObject({
      balance: 100,
      allowlisted: true,
    });
    expect(demoReducer(state, { type: "claimReward" })).toEqual(state);
  });

  it("invalidates sign-in and does not carry a previous account's progress", () => {
    let state = demoReducer(createDemoState(), {
      type: "connect",
      account: "newcomer",
    });
    state = demoReducer(state, { type: "signIn" });
    state = demoReducer(state, { type: "answer", key: "name", value: "Demo" });
    state = demoReducer(state, { type: "network", network: "other" });
    expect(state.signedIn).toBe(false);
    state = demoReducer(state, { type: "connect", account: "member" });
    expect(state.answers.name).toBe("");
    expect(state.completed).toBe(false);
    expect(walletSnapshot(state)).toMatchObject({
      balance: 250,
      allowlisted: true,
    });
  });

  it("records at most one check-in per date and allows a new day", () => {
    let state = createDemoState();
    state = demoReducer(state, { type: "checkin", date: "2026-09-09" });
    state = demoReducer(state, { type: "checkin", date: "2026-09-09" });
    expect(state.checkins).toEqual(["2026-09-09"]);
    expect(
      demoReducer(state, { type: "checkin", date: "2026-09-10" }).checkins,
    ).toHaveLength(2);
    expect(demoReducer(state, { type: "checkin", date: "not-a-date" })).toEqual(
      state,
    );
  });

  it("rejects broken or incompatible browser saves", () => {
    expect(restoreDemoState("broken")).toEqual(createDemoState());
    expect(restoreDemoState('{"version":0}')).toEqual(createDemoState());
    expect(
      restoreDemoState(JSON.stringify({ ...createDemoState(), stage: 80 })),
    ).toEqual(createDemoState());
    const state = demoReducer(createDemoState(), {
      type: "answer",
      key: "name",
      value: "Demo",
    });
    expect(restoreDemoState(JSON.stringify(state))).toEqual(state);
  });
});
