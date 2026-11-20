// ABOUTME: Add the published typography hero before the unchanged experience demo.
// ABOUTME: Its scroll zoom and darkening hand off to the original demo shell.
"use client";

import { useEffect, useRef } from "react";
import { heroScrollGateMs } from "@/lib/portal/heroScrollGate";
import "./typography-hero-bridge.css";

type HeroWindow = Window & {
  henkakuGatewayReset?: () => void;
};
type HeroFrame = Window & {
  henkakuAssemble?: () => void;
  henkakuDisperse?: () => void;
  henkakuSetZoom?: (progress: number, immediate?: boolean) => void;
};

export function TypographyHeroBridge() {
  const section = useRef<HTMLElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const heroWindow = window as HeroWindow;
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    const narrowScreen = matchMedia("(max-width: 820px)");
    let startedAt: number | null = null;
    let assembled = false;
    let previousScrollY = window.scrollY;
    let touchY: number | null = null;
    let ticking = false;
    const child = () => frame.current?.contentWindow as HeroFrame | null;
    const progress = () => {
      const rect = section.current?.getBoundingClientRect();
      if (!rect) return 0;
      return Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height - innerHeight)));
    };
    const visible = () => {
      const rect = section.current?.getBoundingClientRect();
      return Boolean(rect && rect.top < innerHeight && rect.bottom > innerHeight);
    };
    const update = () => {
      ticking = false;
      const value = reducedMotion.matches ? 0 : progress();
      section.current?.style.setProperty("--hero-progress", value.toFixed(4));
      child()?.henkakuSetZoom?.(value, reducedMotion.matches);
    };
    const requestUpdate = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    const forward = () => {
      if (reducedMotion.matches || !visible()) return false;
      if (startedAt === null) {
        startedAt = performance.now();
        assembled = true;
        child()?.henkakuAssemble?.();
        return true;
      }
      return performance.now() - startedAt < heroScrollGateMs(narrowScreen.matches);
    };
    const reverse = () => {
      if (!visible() || progress() > .02 || !assembled) return false;
      startedAt = null;
      assembled = false;
      child()?.henkakuSetZoom?.(0, true);
      child()?.henkakuDisperse?.();
      return true;
    };
    const reset = () => {
      startedAt = null;
      assembled = false;
      child()?.henkakuDisperse?.();
      child()?.henkakuSetZoom?.(0, true);
      window.scrollTo({ top: 0, behavior: "instant" });
      requestUpdate();
    };
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY > 0 && forward()) event.preventDefault();
      if (event.deltaY < 0) reverse();
    };
    const onTouchStart = (event: TouchEvent) => { touchY = event.touches[0]?.clientY ?? null; };
    const onTouchMove = (event: TouchEvent) => {
      const next = event.touches[0]?.clientY ?? null;
      if (next !== null && touchY !== null && next < touchY && forward()) event.preventDefault();
      if (next !== null && touchY !== null && next > touchY) reverse();
      touchY = next;
    };
    const onScroll = () => {
      if (window.scrollY < previousScrollY) reverse();
      if (window.scrollY > previousScrollY && visible() && progress() > .02 && !assembled) {
        assembled = true;
        child()?.henkakuAssemble?.();
      }
      previousScrollY = window.scrollY;
      requestUpdate();
    };

    heroWindow.henkakuGatewayReset = reset;
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", requestUpdate);
    reducedMotion.addEventListener("change", requestUpdate);
    requestUpdate();
    return () => {
      delete heroWindow.henkakuGatewayReset;
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", requestUpdate);
      reducedMotion.removeEventListener("change", requestUpdate);
    };
  }, []);

  return <section ref={section} className="pd-typography-hero" aria-label="文字から変革へのヒーロー">
    <div className="pd-typography-hero-panel">
      <iframe ref={frame} src="/demo-assets/gateway/henkaku-typography-hero.html" title="文字で描く変革" onLoad={() => {
        const child = frame.current?.contentWindow as HeroFrame | null;
        if (child) child.henkakuSetZoom?.(0, true);
      }} />
    </div>
  </section>;
}
