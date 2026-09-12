"use client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTheme } from "@/lib/useTheme";
import { portalRoutes, type PortalScreen } from "@/lib/portal/navigation";

const seenKey = "henkaku.intro.seen.bubble-multi.v1";
let seenInMemory = false;
function getSeen() {
  try { return seenInMemory || sessionStorage.getItem(seenKey) === "1"; }
  catch { return seenInMemory; }
}
function subscribe(listener: () => void) {
  window.addEventListener("henkaku:intro-change", listener);
  return () => window.removeEventListener("henkaku:intro-change", listener);
}
function markSeen() {
  seenInMemory = true;
  try { sessionStorage.setItem(seenKey, "1"); } catch { /* memory is enough */ }
  window.dispatchEvent(new Event("henkaku:intro-change"));
}

export function ReferenceGateway({ paused, onNavigate, application = false }: {
  paused: boolean;
  onNavigate: (screen: PortalScreen) => void;
  application?: boolean;
}) {
  const theme = useTheme();
  const seen = useSyncExternalStore(subscribe, getSeen, () => false);
  const [replaying, setReplaying] = useState(false);
  const [variant, setVariant] = useState<"bubble-multi" | "encrypted">("bubble-multi");
  const [destination, setDestination] = useState<PortalScreen | null>(null);
  const leaving = destination !== null;
  const intro = useRef<HTMLIFrameElement>(null);
  const introDialog = useRef<HTMLDialogElement>(null);
  const homepage = useRef<HTMLIFrameElement>(null);
  const enterButton = useRef<HTMLButtonElement>(null);
  const showIntro = replaying || !seen;
  const syncHomeState = useCallback(() => {
    homepage.current?.contentWindow?.postMessage({ type: "henkaku:theme", theme }, location.origin);
    homepage.current?.contentWindow?.postMessage({ type: "henkaku:home-state", paused, active: !showIntro }, location.origin);
  }, [theme, paused, showIntro]);
  const selectVariant = (next: typeof variant) => {
    if (leaving || next === variant) return;
    intro.current?.contentWindow?.postMessage({ type: "henkaku:intro:stop" }, location.origin);
    setVariant(next);
  };

  useEffect(syncHomeState, [syncHomeState]);
  useEffect(() => {
    const dialog = introDialog.current;
    if (showIntro) {
      if (dialog && !dialog.open) dialog.showModal();
      enterButton.current?.focus({ preventScroll: true });
    } else {
      document.getElementById(application ? "portal-main" : "demo-main")?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "instant" });
    }
    return () => dialog?.close();
  }, [showIntro, application]);
  useEffect(() => {
    if (destination === null) return;
    intro.current?.contentWindow?.postMessage({ type: "henkaku:intro:stop" }, location.origin);
    const timeout = setTimeout(() => {
      markSeen();
      setReplaying(false);
      setDestination(null);
      onNavigate(destination);
    }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 440);
    return () => clearTimeout(timeout);
  }, [destination, onNavigate]);
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== location.origin || leaving) return;
      if (event.source === homepage.current?.contentWindow && event.data?.type === "henkaku:podcast:ready") syncHomeState();
      if (event.source === homepage.current?.contentWindow && event.data?.type === "henkaku:intro:replay") setReplaying(true);
      if (event.source === intro.current?.contentWindow && event.data?.type === "henkaku:intro:navigate" && typeof event.data.screen === "string" && Object.hasOwn(portalRoutes, event.data.screen)) setDestination(event.data.screen);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [leaving, syncHomeState]);

  return <div className="pd-gateway-shell" data-intro={showIntro ? leaving ? "leaving" : "visible" : "dismissed"}>
    <iframe ref={homepage} className="pd-reference-gateway pd-homepage-frame" src={`/demo-assets/gateway/${application ? "app-" : ""}index.html`} title="HENKAKU トップページ" inert={showIntro} aria-hidden={showIntro} onLoad={syncHomeState} allow="autoplay" />
    {showIntro && <dialog ref={introDialog} className={`pd-intro-overlay ${leaving ? "is-leaving" : ""}`} aria-label="HENKAKU 全画面イントロ" onCancel={(event) => { event.preventDefault(); if (!leaving) setDestination("home"); }}>
      <iframe key={variant} ref={intro} className="pd-intro-frame" src={`/demo-assets/gateway/${application ? "app-" : ""}${variant === "bubble-multi" ? "bubble-multi" : "intro"}.html`} title={variant === "bubble-multi" ? "複数の泡が漂うイントロ" : "暗号化と泡のイントロ（比較用）"} tabIndex={leaving ? -1 : 0} />
      <div className="pd-intro-access">
        <button ref={enterButton} className="pd-intro-enter" aria-label="イントロをスキップ" disabled={leaving} onClick={() => { if (!leaving) setDestination("home"); }}>スキップ <span aria-hidden="true">↗</span></button>
        <div className="pd-intro-variants" role="group" aria-label="イントロの比較">
          <button type="button" aria-pressed={variant === "bubble-multi"} disabled={leaving} onClick={() => selectVariant("bubble-multi")}>複数の泡</button>
          <button type="button" aria-pressed={variant === "encrypted"} disabled={leaving} onClick={() => selectVariant("encrypted")}>暗号化＋泡</button>
        </div>
      </div>
    </dialog>}
  </div>;
}
