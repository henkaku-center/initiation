// ABOUTME: Exercise the normal build with ephemeral wallet signatures and a disposable local DB.
// ABOUTME: Refuse remote targets and keep test keys in memory; no wallet extension is contacted.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { createClient } from "@supabase/supabase-js";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const origin = "http://127.0.0.1:3102";
assert.equal(process.env.SUPABASE_URL, "http://127.0.0.1:65421", "Use the disposable test Supabase on port 65421");
assert.ok(process.env.SUPABASE_SERVICE_ROLE_KEY, "Local test service key is required");
const playwright = process.argv[2] ? pathToFileURL(resolve(process.argv[2], "index.mjs")).href : "playwright";
const { chromium } = await import(playwright);
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const accounts = [privateKeyToAccount(generatePrivateKey()), privateKeyToAccount(generatePrivateKey())];
const output = resolve(process.argv[3] ?? "/private/tmp/henkaku-portal-browser");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.argv[4] ?? chromium.executablePath() });
console.log(`Browser verification: Chromium ${browser.version()}`);
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
const page = await context.newPage();
page.setDefaultTimeout(12000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
// Public previews can be inspected without requesting videos, analytics, fonts or chain RPC.
await context.route("**/*", (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
await context.exposeFunction("portalTestSign", (index, message) => accounts[index].signMessage({ message: { raw: message } }));
await context.addInitScript(({ addresses }) => {
  const events = new Map();
  let active = Number(sessionStorage.getItem("portal.test.account") ?? 0);
  let chain = sessionStorage.getItem("portal.test.chain") ?? "0x1";
  let connected = sessionStorage.getItem("portal.test.connected") === "1";
  let rejectSignature = false;
  let releaseSignature;
  let holdSignature = false;
  const emit = (event, value) => (events.get(event) ?? []).forEach((listener) => listener(value));
  const provider = {
    isMetaMask: true,
    on(event, listener) { events.set(event, [...(events.get(event) ?? []), listener]); },
    removeListener(event, listener) { events.set(event, (events.get(event) ?? []).filter((item) => item !== listener)); },
    async request({ method, params }) {
      switch (method) {
        case "eth_accounts": return connected ? [addresses[active]] : [];
        case "eth_requestAccounts":
          connected = true;
          sessionStorage.setItem("portal.test.connected", "1");
          return [addresses[active]];
        case "eth_chainId": return chain;
        case "net_version": return String(parseInt(chain, 16));
        case "wallet_switchEthereumChain":
          chain = params[0].chainId;
          sessionStorage.setItem("portal.test.chain", chain);
          emit("chainChanged", chain);
          return null;
        case "wallet_requestPermissions":
        case "wallet_getPermissions": return [{ parentCapability: "eth_accounts" }];
        case "wallet_revokePermissions": connected = false; sessionStorage.removeItem("portal.test.connected"); return null;
        case "personal_sign":
          if (rejectSignature) { rejectSignature = false; throw Object.assign(new Error("User rejected"), { code: 4001 }); }
          if (holdSignature) await new Promise((done) => { releaseSignature = done; });
          return window.portalTestSign(active, params[0]);
        default: throw new Error(`Unexpected test wallet method: ${method}`);
      }
    },
  };
  window.ethereum = provider;
  window.portalTestWallet = {
    rejectSignature() { rejectSignature = true; },
    holdSignature() { holdSignature = true; },
    releaseSignature() { holdSignature = false; releaseSignature?.(); },
    account(index) { active = index; sessionStorage.setItem("portal.test.account", String(index)); emit("accountsChanged", [addresses[index]]); },
    disconnect() { connected = false; sessionStorage.removeItem("portal.test.connected"); emit("accountsChanged", []); },
  };
}, { addresses: accounts.map((account) => account.address) });

async function visible(locator) { await locator.first().waitFor({ state: "visible" }); }
async function textPresent(text) { await visible(page.getByText(text, { exact: false })); }
async function member(index) {
  const { data, error } = await db.from("members").select("id").eq("wallet_address", accounts[index].address.toLowerCase()).single();
  assert.ifError(error);
  return data.id;
}
async function rows(table, id) {
  const { data, error } = await db.from(table).select("*").eq("member_id", id);
  assert.ifError(error);
  return data;
}
async function waitSession(address) {
  for (let attempt = 0; attempt < 120; attempt++) {
    const current = await page.evaluate(async () => {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      return response.status === 401 ? null : (await response.json()).address;
    });
    if (current === address) return;
    await delay(100);
  }
  throw new Error("The server session did not reach the expected test identity");
}
async function screenshot(name, width = 1440, theme = "light") {
  await page.setViewportSize({ width, height: 1000 });
  await page.getByRole("button", { name: theme === "light" ? "ライトモード" : "ダークモード", exact: true }).click();
  await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${name}: horizontal overflow`);
}
async function failedAction(path, button, message) {
  const handler = (route) => route.request().method() === "POST" ? route.abort("failed") : route.continue();
  await page.route(`${origin}${path}`, handler);
  await button.click();
  await textPresent(message);
  await page.unroute(`${origin}${path}`, handler);
}
async function replay(action, body = action.body) {
  return page.evaluate(async ({ url, id, body }) => {
    const result = await fetch(url, { method: "POST", headers: { "next-action": id, "content-type": "text/plain;charset=UTF-8" }, body });
    return { status: result.status, text: await result.text() };
  }, { ...action, body });
}

try {
  await page.goto(origin);
  await page.getByRole("button", { name: "イントロをスキップ", exact: true }).click();
  await page.locator("dialog").waitFor({ state: "hidden" });
  const home = page.frameLocator('iframe[title="HENKAKU トップページ"]');
  await visible(home.locator('a[href="/setup"]'));
  await home.getByRole("button", { name: "イントロを再生", exact: true }).click();
  await page.getByRole("button", { name: "暗号化＋泡", exact: true }).click();
  const encrypted = page.frameLocator('iframe[title="暗号化と泡のイントロ（比較用）"]');
  const portalLink = encrypted.locator('a[href="/"]').last();
  await portalLink.focus();
  await portalLink.click();
  await page.locator("dialog").waitFor({ state: "hidden" });
  assert.equal(await home.locator("#frequency").count(), 0);
  await screenshot("home-desktop");
  await screenshot("home-mobile-dark", 360, "dark");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await home.locator('a[href="/setup"]').first().click();
  await page.waitForURL(`${origin}/setup`);
  await visible(page.getByRole("button", { name: "ウォレットを接続", exact: true }));
  await page.getByRole("button", { name: "ウォレットを接続", exact: true }).click();
  await textPresent("Polygon以外のネットワーク");
  assert.equal(await page.getByRole("button", { name: "署名してサインイン", exact: true }).isDisabled(), true);
  await page.getByRole("button", { name: "Polygon に切り替える", exact: true }).click();
  await textPresent("Polygon に接続済み");
  const connectionNotice = page.getByText("✓ Polygon に接続済み", { exact: true });
  await page.getByRole("button", { name: "ライトモード", exact: true }).click();
  const lightNotice = await connectionNotice.evaluate((element) => getComputedStyle(element).color);
  await page.getByRole("button", { name: "ダークモード", exact: true }).click();
  const darkNotice = await connectionNotice.evaluate((element) => getComputedStyle(element).color);
  assert.notEqual(lightNotice, darkNotice, "Connection status must follow the chosen theme rather than the OS theme");
  await waitSession(null);
  await page.route(`${origin}/api/auth/nonce`, (route) => route.fulfill({ status: 503, body: "unavailable" }));
  await page.getByRole("button", { name: "署名してサインイン", exact: true }).click();
  await textPresent("認証の準備に失敗");
  await page.unroute(`${origin}/api/auth/nonce`);
  await page.route(`${origin}/api/auth/verify`, (route) => route.fulfill({ status: 401, body: "invalid test signature" }));
  await page.getByRole("button", { name: "署名してサインイン", exact: true }).click();
  await textPresent("認証に失敗");
  await page.unroute(`${origin}/api/auth/verify`);
  await waitSession(null);
  await page.evaluate(() => window.portalTestWallet.rejectSignature());
  await page.getByRole("button", { name: "署名してサインイン", exact: true }).click();
  await textPresent("署名が拒否されました");
  await waitSession(null);
  await page.evaluate(() => window.portalTestWallet.holdSignature());
  await page.getByRole("button", { name: "署名してサインイン", exact: true }).click();
  await visible(page.getByRole("button", { name: "ウォレットでの署名を待っています…", exact: true }));
  assert.equal(await page.getByRole("button", { name: "ウォレットでの署名を待っています…", exact: true }).isDisabled(), true);
  await page.evaluate(() => window.portalTestWallet.releaseSignature());
  await textPresent("サインイン済み:");
  await waitSession(accounts[0].address.toLowerCase());
  const idA = await member(0);
  console.log("PASS setup: wrong chain, refused/pending signature and actual SIWE session");
  await screenshot("setup-desktop");
  await screenshot("setup-mobile-dark", 360, "dark");
  await page.setViewportSize({ width: 1440, height: 1000 });

  await page.getByRole("link", { name: "Initiation", exact: true }).click();
  await page.getByRole("button", { name: "名前を入力せずにはじめる", exact: true }).click();
  await page.getByRole("textbox", { name: "回答", exact: true }).fill("Aの自己紹介：一緒に作る活動");
  let saveAction;
  page.on("request", (request) => {
    if (request.url() === `${origin}/initiation` && request.method() === "POST") saveAction = { url: request.url(), id: request.headers()["next-action"], body: request.postData() };
  });
  await failedAction("/initiation", page.getByRole("button", { name: "回答を保存して次へ →", exact: true }), "保存できませんでした");
  assert.equal(await page.getByRole("textbox", { name: "回答", exact: true }).inputValue(), "Aの自己紹介：一緒に作る活動");
  assert.equal((await rows("initiation_progress", idA)).length, 0);
  await page.getByRole("button", { name: "回答を保存して次へ →", exact: true }).click();
  await textPresent("HENKAKUをどこで知りましたか？");
  const introductionAction = { ...saveAction };
  await page.reload();
  await textPresent("HENKAKUをどこで知りましたか？");
  assert.equal((await rows("initiation_progress", idA)).length, 1);
  await screenshot("journey-desktop");
  await screenshot("journey-tablet", 768);
  await screenshot("journey-mobile-dark", 360, "dark");
  await page.getByRole("textbox", { name: "回答", exact: true }).fill("公開Podcast");
  await page.getByRole("button", { name: "回答を保存して次へ →", exact: true }).click();
  await textPresent("ご自身で実施したことを確認");
  await page.getByRole("button", { name: "完了を保存して次へ →", exact: true }).click();
  await textPresent("Discordの自己紹介チャンネル");
  await page.getByRole("button", { name: "完了を保存して次へ →", exact: true }).click();
  await textPresent("4項目の保存を確認しました");
  const progress = await rows("initiation_progress", idA);
  assert.deepEqual(progress.map((entry) => entry.step_id).sort(), ["q-how-found", "q-introduction", "quest-discord-hello", "quest-wallet-setup"]);
  assert.equal(progress.filter((entry) => entry.answer === null).length, 2);
  await page.getByRole("link", { name: "あなたのパスポートへ ↗", exact: true }).click();
  let applyAction;
  page.on("request", (request) => {
    if (request.url() === `${origin}/passport` && request.method() === "POST") applyAction = { url: request.url(), id: request.headers()["next-action"], body: request.postData() };
  });
  await failedAction("/passport", page.getByRole("button", { name: "申請する", exact: true }), "申請結果を確認できませんでした");
  assert.equal((await rows("applications", idA)).length, 0);
  await page.getByRole("button", { name: "申請する", exact: true }).click();
  await textPresent("審査待ち");
  const applicationRequest = { ...applyAction };
  await replay(applicationRequest);
  assert.equal((await rows("applications", idA)).length, 1);
  await screenshot("passport-desktop");
  await screenshot("passport-mobile-dark", 360, "dark");
  await page.goto(`${origin}/apply`);
  await textPresent("審査待ち");
  console.log("PASS journey/passport: failure recovery, reload/resume, four server entries, application and duplicate prevention");

  await page.getByRole("link", { name: "Community", exact: true }).click();
  let checkinAction;
  page.on("request", (request) => {
    if (request.url() === `${origin}/community` && request.method() === "POST") checkinAction = { url: request.url(), id: request.headers()["next-action"], body: request.postData() };
  });
  await failedAction("/community", page.getByRole("button", { name: "今日のチェックイン", exact: true }), "チェックイン結果を確認できませんでした");
  await page.getByRole("button", { name: "今日のチェックイン", exact: true }).click();
  await visible(page.getByRole("button", { name: "今日はチェックイン済みです", exact: true }));
  const checkinRequest = { ...checkinAction };
  await replay(checkinRequest, JSON.stringify(["1900-01-01", { memberId: "forged" }]));
  const checkins = await rows("checkins", idA);
  assert.equal(checkins.length, 1);
  assert.equal(checkins[0].checkin_date, new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date()));
  await page.goto(`${origin}/checkin`);
  await visible(page.getByRole("button", { name: "今日はチェックイン済みです", exact: true }));
  await screenshot("community-desktop");
  await screenshot("community-mobile-dark", 360, "dark");
  console.log("PASS community: persisted JST check-in, duplicate/date-forgery rejection and legacy route");

  await page.evaluate(() => window.portalTestWallet.account(1));
  await waitSession(null);
  assert.equal(await page.getByRole("button", { name: "今日はチェックイン済みです", exact: true }).count(), 0);
  await page.goto(`${origin}/setup`);
  await page.getByRole("button", { name: "署名してサインイン", exact: true }).click();
  await waitSession(accounts[1].address.toLowerCase());
  const idB = await member(1);
  await page.evaluate(() => localStorage.setItem("henkaku.portal-demo.v1", JSON.stringify({
    version: 1, connected: true, account: "member", network: "polygon", signedIn: true,
    readStatus: "ready", tokenAdded: true, stage: 4, finalQuestion: 2,
    answers: { name: "偽の完走", interests: ["AI"], curiosity: "", experience: "", readiness: "", contribution: "" },
    completed: true, participantNFT: true, application: "approved", rewardClaimed: true, checkins: ["2099-01-01"],
  })));
  await page.goto(`${origin}/passport`);
  await textPresent("旅の途中です");
  assert.equal(await page.getByRole("button", { name: "申請する", exact: true }).count(), 0);
  const forbiddenApply = await replay(applicationRequest);
  assert.match(forbiddenApply.text, /完走してください/);
  assert.equal((await rows("applications", idB)).length, 0);
  const forgedStep = await replay(introductionAction, JSON.stringify(["fake-finished", "done", { memberId: idA }]));
  assert.match(forgedStep.text, /不明なステップ/);
  await replay(introductionAction, JSON.stringify(["q-introduction", "Bの自己紹介", { memberId: idA }]));
  assert.equal((await rows("initiation_progress", idB))[0].answer, "Bの自己紹介");
  assert.equal((await rows("initiation_progress", idA)).find((entry) => entry.step_id === "q-introduction").answer, "Aの自己紹介：一緒に作る活動");
  const admin = await page.goto(`${origin}/admin`);
  assert.equal(admin.status(), 404);
  await page.goto(`${origin}/initiation`);
  await textPresent("HENKAKUをどこで知りましたか？");
  assert.equal(await page.getByText("Aの自己紹介：一緒に作る活動").count(), 0);
  await page.evaluate(() => window.portalTestWallet.disconnect());
  await waitSession(null);
  const unauthenticated = await replay(introductionAction);
  assert.match(unauthenticated.text, /サインイン/);
  console.log("PASS identity: account switch/disconnect, demo tampering, unknown step, own-member write scope and admin denial");

  await page.goto(`${origin}/setup`);
  await page.route(`${origin}/api/auth/me`, (route) => route.fulfill({ status: 503, body: "unavailable" }));
  await page.reload();
  await textPresent("サインイン状態を取得できませんでした");
  await page.unroute(`${origin}/api/auth/me`);
  await page.getByRole("button", { name: "再取得", exact: true }).first().click();
  await page.getByText("サインイン状態を取得できませんでした", { exact: false }).waitFor({ state: "hidden" });
  await waitSession(null);
  console.log("PASS session retrieval failure and retry");

  await page.goto(`${origin}/#setup`);
  await page.waitForURL(`${origin}/setup`);
  await page.getByRole("link", { name: "Community", exact: true }).click();
  await page.waitForURL(`${origin}/community`);
  await page.goBack();
  await page.waitForURL(`${origin}/setup`);
  await page.goForward();
  await page.waitForURL(`${origin}/community`);
  await page.locator(".pd-skip").focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.evaluate(() => document.activeElement.id), "portal-main");
  await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => ["A", "BUTTON"].includes(document.activeElement.tagName)), true);
  await page.getByRole("button", { name: "素材・クレジット", exact: true }).focus();
  await page.keyboard.press("Enter");
  await visible(page.getByRole("dialog", { name: "素材・クレジット", exact: true }));
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  assert.deepEqual(errors, [], "No unhandled browser errors");
  console.log("PASS routes, keyboard, light/dark and 360/768/1440 viewport overflow checks");
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true });
  throw error;
} finally {
  await context.close();
  await browser.close();
}
