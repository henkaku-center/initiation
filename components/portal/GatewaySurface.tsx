// ABOUTME: Render the existing Gateway chapters in the same scroll document as the hero.
// ABOUTME: Shadow DOM keeps the source artwork's styles from changing the real portal.
"use client";

import { useEffect, useRef } from "react";
import { portalRoutes, type PortalScreen } from "@/lib/portal/navigation";
import { scopeGatewayStyles } from "@/lib/portal/gatewaySurface";
import { useTheme } from "@/lib/useTheme";

const podcast = {
  date: "FEATURED PODCAST / JOI ITO",
  title: "Joi Ito's Podcast — 変革への道",
  summary: "伊藤穰一が多彩なゲストとの対話を通じて、テクノロジーと社会、文化のつながりを探る番組。AIやデジタル社会の変化から、茶の湯、ものづくり、受け継がれる知恵まで、分野を越えて考えます。公式サイトには各回の関連キーワードや視聴先の案内もあり、気になるテーマから聴き進められます。",
  href: "https://joi.ito.com/podcast/",
};

type DecryptWindow = Window & { henkakuArmGatewayDecrypt?: (root: ShadowRoot) => void | (() => void) };
let decryptScript: Promise<void> | null = null;
function loadDecryptScript() {
  if (!decryptScript) decryptScript = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.type = "module";
    script.src = "/demo-assets/gateway/gateway-v1-claude-decrypt.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Gateway decrypt unavailable"));
    document.head.append(script);
  });
  return decryptScript;
}

function addPodcast(root: ShadowRoot) {
  const slot = root.querySelector("[data-podcast-card]");
  if (!slot) return;
  const link = document.createElement("a");
  link.className = "placeholder-card";
  link.href = podcast.href;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  for (const [tag, value] of [["span", podcast.date], ["strong", podcast.title], ["span", podcast.summary]]) {
    const element = document.createElement(tag);
    element.textContent = value;
    link.append(element);
  }
  slot.append(link);
}

function startGatewayMotion(root: ShadowRoot, signal: AbortSignal) {
  const sections = [...root.querySelectorAll<HTMLElement>("[data-gateway-section]")];
  const threshold = root.querySelector<HTMLElement>('[data-gateway-section="04-threshold"]');
  const voices = root.querySelector<HTMLElement>('[data-gateway-section="02-voices-podcast"]');
  const voicesScroll = root.querySelector<HTMLElement>("[data-voices-scroll]");
  const photoStrip = root.querySelector<HTMLElement>("[data-photo-strip]");
  const pulse = root.querySelector<HTMLElement>('[data-gateway-section="01-community-pulse"]');
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const progressFor = (section: HTMLElement | null) => {
    if (!section) return 0;
    const rect = section.getBoundingClientRect();
    return Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height - innerHeight)));
  };
  let frame = 0;
  const update = () => {
    frame = 0;
    (root.host as HTMLElement).style.setProperty("--threshold-progress", String(reducedMotion.matches ? 1 : progressFor(threshold).toFixed(4)));
    for (const section of sections) section.style.setProperty("--section-progress", String(reducedMotion.matches ? 1 : progressFor(section).toFixed(4)));
    if (voices && voicesScroll && photoStrip) {
      const distance = Math.max(0, photoStrip.scrollWidth - (photoStrip.parentElement?.clientWidth ?? 0));
      voices.style.setProperty("--voices-shift", `${(reducedMotion.matches ? 0 : distance * progressFor(voicesScroll)).toFixed(2)}px`);
    }
    const pulseProgress = reducedMotion.matches ? 1 : Math.min(1, .35 + progressFor(pulse) * .8);
    root.querySelectorAll<HTMLElement>("[data-pulse-list] .placeholder-card").forEach((card, index) => {
      card.style.setProperty("--card-progress", String(Math.min(1, Math.max(0, (pulseProgress - index * .12) / .28))));
    });
  };
  const request = () => { if (!frame) frame = requestAnimationFrame(update); };
  window.addEventListener("scroll", request, { passive: true, signal });
  window.addEventListener("resize", request, { signal });
  reducedMotion.addEventListener("change", request, { signal });
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  }, { threshold: 0, rootMargin: "0px 0px -15% 0px" });
  root.querySelectorAll(".reveal-once").forEach((item) => observer.observe(item));
  request();
  return { request, dispose: () => { observer.disconnect(); if (frame) cancelAnimationFrame(frame); } };
}

async function loadPulse(root: ShadowRoot, signal: AbortSignal, update: () => void) {
  const list = root.querySelector<HTMLElement>("[data-pulse-list]");
  const status = root.querySelector<HTMLElement>("[data-pulse-status]");
  const timestamp = root.querySelector<HTMLElement>("[data-pulse-time]");
  if (!list || !status || !timestamp) return;
  const validTime = (value: unknown): value is string => typeof value === "string" && Number.isFinite(Date.parse(value));
  const date = new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Tokyo", timeZoneName: "short" });
  const time = (value: string) => {
    const node = document.createElement("time");
    node.dateTime = value;
    node.textContent = date.format(new Date(value));
    return node;
  };
  list.setAttribute("aria-busy", "true");
  try {
    const response = await fetch("/api/community-pulse", { credentials: "omit", signal });
    if (!response.ok) throw new Error("Feed unavailable");
    const data = await response.json();
    if (!data || !["fresh", "stale"].includes(data.status) || !validTime(data.lastSuccessAt) || !Array.isArray(data.issues) || data.issues.length > 6) throw new Error("Invalid feed");
    const cards = data.issues.map((item: { number: number; title: string; updatedAt: string; url: string }) => {
      if (!item || !Number.isSafeInteger(item.number) || item.number <= 0 || typeof item.title !== "string" || !item.title.trim() || !validTime(item.updatedAt) || item.url !== `https://github.com/henkaku-center/initiation/issues/${item.number}`) throw new Error("Invalid issue");
      const link = document.createElement("a");
      link.className = "placeholder-card";
      link.href = item.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      const label = document.createElement("span");
      label.textContent = `OPEN ISSUE / #${item.number}`;
      const title = document.createElement("strong");
      title.textContent = item.title;
      const updated = document.createElement("span");
      updated.textContent = "Issue更新：";
      updated.append(time(item.updatedAt));
      link.append(label, title, updated);
      return link;
    });
    if (signal.aborted) return;
    list.replaceChildren(...cards);
    timestamp.textContent = "最終取得：";
    timestamp.append(time(data.lastSuccessAt));
    status.textContent = `${cards.length ? "" : "最終取得時点で掲載対象のIssueはありません。"}${data.status === "stale" ? "前回取得した情報を表示しています。最新情報ではない可能性があります。" : ""}`;
    update();
  } catch {
    if (signal.aborted) return;
    list.replaceChildren();
    timestamp.textContent = "";
    status.textContent = "Issueを取得できませんでした。時間をおいてページを開き直すか、GitHubの一覧をご確認ください。";
  } finally {
    list.setAttribute("aria-busy", "false");
  }
}

function loadFrequency(root: ShadowRoot, signal: AbortSignal) {
  const list = root.querySelector<HTMLOListElement>("[data-track-list]");
  const status = root.querySelector<HTMLElement>("[data-frequency-status]");
  const period = root.querySelector<HTMLElement>("[data-frequency-period]");
  const retry = root.querySelector<HTMLButtonElement>("[data-frequency-retry]");
  if (!list || !status || !period || !retry) return;
  const source = "https://listenbrainz.org/statistics/?range=week";
  const api = "https://api.listenbrainz.org/1/stats/sitewide/recordings?range=week&count=4";
  const date = new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "UTC" });
  const validTimestamp = (value: unknown): value is number => Number.isInteger(value) && Number(value) > 0 && Number(value) < 8640000000000;
  const make = (tag: string, className: string, text = "") => {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = text;
    return node;
  };
  const load = async () => {
    if (retry.disabled) return;
    retry.disabled = true;
    retry.hidden = true;
    status.textContent = "音楽ランキングを取得中…";
    period.textContent = "";
    list.replaceChildren();
    list.setAttribute("aria-busy", "true");
    try {
      const response = await fetch(api, { credentials: "omit", referrerPolicy: "no-referrer", signal });
      if (!response.ok) throw new Error("Ranking unavailable");
      if (response.status === 204) { status.textContent = "公開ランキングはまだありません。"; return; }
      const data = (await response.json())?.payload;
      if (!data || !Array.isArray(data.recordings) || data.range !== "week" || !validTimestamp(data.from_ts) || !validTimestamp(data.to_ts) || data.from_ts >= data.to_ts || !validTimestamp(data.last_updated)) throw new Error("Invalid ranking");
      const entries = data.recordings.slice(0, 4).map((item: { track_name: string; artist_name: string; listen_count: number; recording_mbid?: string }, index: number) => {
        if (!item || typeof item.track_name !== "string" || !item.track_name.trim() || typeof item.artist_name !== "string" || !item.artist_name.trim() || !Number.isSafeInteger(item.listen_count) || item.listen_count < 0) throw new Error("Invalid recording");
        const entry = make("li", "frequency-entry");
        const link = make("a", "frequency-link") as HTMLAnchorElement;
        const hasId = typeof item.recording_mbid === "string" && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(item.recording_mbid);
        link.href = hasId ? `https://musicbrainz.org/recording/${item.recording_mbid}` : source;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        const art = make("div", "frequency-art");
        art.setAttribute("aria-hidden", "true");
        art.append(make("span", "frequency-record"), make("span", "frequency-rank", String(index + 1).padStart(2, "0")));
        const copy = make("div", "frequency-copy");
        copy.append(make("strong", "frequency-title", item.track_name), make("span", "frequency-guest", item.artist_name), make("span", "frequency-meta", `${item.listen_count.toLocaleString("ja-JP")} 再生 · ListenBrainz`), make("span", "frequency-meta", hasId ? "曲の情報を見る ↗" : "ランキングを見る ↗"));
        link.append(art, copy);
        entry.append(link);
        return entry;
      });
      if (signal.aborted) return;
      list.replaceChildren(...entries);
      period.textContent = `${date.format(data.from_ts * 1000)} – ${date.format((data.to_ts - 1) * 1000)} · UTC / 更新 ${date.format(data.last_updated * 1000)}`;
      status.textContent = entries.length ? "" : "公開ランキングはまだありません。";
    } catch {
      if (signal.aborted) return;
      status.textContent = "音楽ランキングを取得できませんでした。ListenBrainzのサイトでも確認できます。";
      retry.hidden = false;
    } finally {
      list.setAttribute("aria-busy", "false");
      retry.disabled = false;
    }
  };
  retry.addEventListener("click", load, { signal });
  void load();
}

export function GatewaySurface({ onNavigate }: { onNavigate: (screen: PortalScreen) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  useEffect(() => { if (host.current) host.current.dataset.theme = theme; }, [theme]);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const controller = new AbortController();
    const shadow = element.shadowRoot ?? element.attachShadow({ mode: "open" });
    const header = document.querySelector<HTMLElement>(".pd-reference-home .pd-header");
    const measureHeader = () => element.style.setProperty("--portal-header-height", `${header?.getBoundingClientRect().height ?? 99}px`);
    const headerObserver = new ResizeObserver(measureHeader);
    if (header) headerObserver.observe(header);
    measureHeader();
    let disposeMotion = () => {};
    let disposeDecrypt = () => {};
    const mount = async () => {
      const response = await fetch("/demo-assets/gateway/index.html", { signal: controller.signal });
      if (!response.ok) throw new Error("Gateway unavailable");
      const parsed = new DOMParser().parseFromString(await response.text(), "text/html");
      if (controller.signal.aborted) return;
      const intro = parsed.querySelector(".home-intro");
      const main = parsed.querySelector("main");
      if (!intro || !main) throw new Error("Gateway chapters missing");
      const style = document.createElement("style");
      style.textContent = scopeGatewayStyles([...parsed.querySelectorAll("style")].map((item) => item.textContent ?? "").join("\n")) + "\n:host { display:block; } .gateway-panel { top:var(--portal-header-height,99px);min-height:calc(100svh - var(--portal-header-height,99px)); }";
      const page = document.createElement("div");
      page.className = "gateway-root";
      page.innerHTML = intro.outerHTML + main.outerHTML;
      shadow.replaceChildren(style, page);
      addPodcast(shadow);
      const motion = startGatewayMotion(shadow, controller.signal);
      disposeMotion = motion.dispose;
      void loadDecryptScript().then(() => {
        if (controller.signal.aborted) return;
        disposeDecrypt = (window as DecryptWindow).henkakuArmGatewayDecrypt?.(shadow) ?? (() => {});
      }).catch(() => { /* The original text remains readable without its animation. */ });
      void loadPulse(shadow, controller.signal, motion.request);
      loadFrequency(shadow, controller.signal);
      shadow.addEventListener("click", (event) => {
        const target = event.target as Element | null;
        const link = target?.closest?.('a[target="_top"]');
        if (!(link instanceof HTMLAnchorElement)) return;
        const url = new URL(link.href, location.href);
        const destination = (Object.keys(portalRoutes) as PortalScreen[]).find((screen) => portalRoutes[screen] === url.pathname);
        if (url.origin !== location.origin || !destination) return;
        event.preventDefault();
        onNavigate(destination);
      }, { signal: controller.signal });
    };
    void mount().catch(() => { if (!controller.signal.aborted) element.textContent = "Gatewayを読み込めませんでした。ページを更新してください。"; });
    return () => { controller.abort(); headerObserver.disconnect(); disposeMotion(); disposeDecrypt(); shadow.replaceChildren(); };
  }, [onNavigate]);
  return <div ref={host} className="pd-inline-gateway" data-theme={theme} aria-label="HENKAKU トップページ" />;
}
