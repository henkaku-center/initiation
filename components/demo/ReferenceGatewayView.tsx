"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { navigateDemo, screens, type DemoScreen } from "@/lib/demo/useDemo";

const seenKey = "henkaku.intro.seen.v2";
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

export function ReferenceGateway() {
  const seen = useSyncExternalStore(subscribe, getSeen, () => false);
  const [replaying, setReplaying] = useState(false);
  const [destination, setDestination] = useState<DemoScreen | null>(null);
  const leaving = destination !== null;
  const intro = useRef<HTMLIFrameElement>(null);
  const homepage = useRef<HTMLIFrameElement>(null);
  const enterButton = useRef<HTMLButtonElement>(null);
  const showIntro = replaying || !seen;

  useEffect(() => {
    if (showIntro) enterButton.current?.focus({ preventScroll: true });
    else homepage.current?.focus({ preventScroll: true });
  }, [showIntro]);
  useEffect(() => {
    if (destination === null) return;
    intro.current?.contentWindow?.postMessage({ type: "henkaku:intro:stop" }, location.origin);
    const timeout = setTimeout(() => {
      markSeen();
      setReplaying(false);
      setDestination(null);
      navigateDemo(destination);
    }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 440);
    return () => clearTimeout(timeout);
  }, [destination]);
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== location.origin || leaving) return;
      if (event.source === homepage.current?.contentWindow && event.data?.type === "henkaku:intro:replay") setReplaying(true);
      if (event.source === intro.current?.contentWindow && event.data?.type === "henkaku:intro:navigate" && screens.includes(event.data.screen)) setDestination(event.data.screen);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [leaving]);

  return <div className="pd-gateway-shell" data-intro={showIntro ? leaving ? "leaving" : "visible" : "dismissed"}>
    <iframe ref={homepage} className="pd-reference-gateway pd-homepage-frame" src="/demo-assets/gateway/index.html" title="HENKAKU トップページ" inert={showIntro} aria-hidden={showIntro} />
    {showIntro && <section className={`pd-intro-overlay ${leaving ? "is-leaving" : ""}`} aria-label="HENKAKU 全画面イントロ">
      <iframe ref={intro} className="pd-intro-frame" src="/demo-assets/gateway/intro.html" title="泡と解読のイントロ" tabIndex={leaving ? -1 : 0} />
      <div className="pd-intro-access"><button ref={enterButton} className="pd-intro-enter" disabled={leaving} onClick={() => { if (!leaving) setDestination("home"); }}>イントロをスキップ <span aria-hidden="true">↗</span></button></div>
    </section>}
  </div>;
}
