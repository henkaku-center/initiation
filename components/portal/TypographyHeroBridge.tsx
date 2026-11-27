// ABOUTME: Add the published typography hero before the unchanged experience demo.
// ABOUTME: Its scroll zoom and darkening hand off to the original demo shell.
"use client";

import { useEffect, useRef } from "react";
import { createHeroScrollPacer } from "@/lib/portal/heroScrollPacer";
import { heroScrollGateMs } from "@/lib/portal/heroScrollGate";
import "./typography-hero-bridge.css";

type HeroWindow = Window & {
  henkakuGatewayMoveIntent?: (delta: number) => boolean;
  henkakuGatewayReset?: () => void;
  henkakuGatewayScrollIntent?: () => boolean;
  henkakuGatewayReverseIntent?: () => boolean;
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
    const pacer = createHeroScrollPacer();
    let motionFrame: number | null = null;
    let previousTime: number | null = null;
    const bounds = () => {
      const rect = section.current?.getBoundingClientRect();
      const start = (rect?.top ?? 0) + window.scrollY;
      const distance = Math.max(1, (rect?.height ?? innerHeight) - innerHeight);
      return { start, distance, end: start + distance };
    };
    const stopMotion = () => {
      pacer.reset();
      if (motionFrame !== null) cancelAnimationFrame(motionFrame);
      motionFrame = null;
      previousTime = null;
    };
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
      child()?.henkakuSetZoom?.(value, true);
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
    const animate = (time: number) => {
      motionFrame = null;
      const { start, distance, end } = bounds();
      const step = pacer.advance(previousTime === null ? 16 : time - previousTime, distance);
      previousTime = time;
      if (!step) { previousTime = null; return; }
      window.scrollTo({ top: Math.max(start, Math.min(end, window.scrollY + step)), behavior: "instant" });
      update();
      if (window.scrollY >= end - 1 || window.scrollY <= start) stopMotion();
      else motionFrame = requestAnimationFrame(animate);
    };
    const move = (delta: number) => {
      if (!delta || reducedMotion.matches) return false;
      const { start, distance, end } = bounds();
      if (window.scrollY < start || window.scrollY >= end - 1 || (delta < 0 && window.scrollY <= start)) {
        stopMotion();
        if (delta < 0) reverse();
        return false;
      }
      if (delta > 0 && forward()) return true;
      if (delta < 0) reverse();
      pacer.push(delta, distance);
      if (motionFrame === null) motionFrame = requestAnimationFrame(animate);
      return true;
    };
    const reset = () => {
      stopMotion();
      startedAt = null;
      assembled = false;
      previousScrollY = 0;
      child()?.henkakuDisperse?.();
      child()?.henkakuSetZoom?.(0, true);
      window.scrollTo({ top: 0, behavior: "instant" });
      requestUpdate();
    };
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.defaultPrevented) return;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1;
      if (move(event.deltaY * unit)) event.preventDefault();
    };
    const onTouchStart = (event: TouchEvent) => { touchY = event.touches[0]?.clientY ?? null; };
    const onTouchMove = (event: TouchEvent) => {
      const next = event.touches[0]?.clientY ?? null;
      if (next !== null && touchY !== null && move(touchY - next)) event.preventDefault();
      touchY = next;
    };
    const onScroll = () => {
      const { start, end } = bounds();
      if (window.scrollY < start || window.scrollY >= end - 1) stopMotion();
      if (window.scrollY < previousScrollY) reverse();
      if (window.scrollY > previousScrollY && visible() && progress() > .02 && !assembled) {
        assembled = true;
        child()?.henkakuAssemble?.();
      }
      previousScrollY = window.scrollY;
      requestUpdate();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      // Leave editing and the native activation keys of controls alone.
      if (target?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
      if (event.key === " " && target?.closest('button, [role="button"]')) return;
      if (event.key === "Home" || event.key === "End") {
        stopMotion();
        // Inside the iframe, the browser would jump in the child document, not the portal.
        if (target && target.ownerDocument !== document) {
          event.preventDefault();
          window.scrollTo({ top: event.key === "Home" ? 0 : document.documentElement.scrollHeight, behavior: "instant" });
        }
        return;
      }
      const down = ["ArrowDown", "PageDown"].includes(event.key) || (event.key === " " && !event.shiftKey);
      const up = ["ArrowUp", "PageUp"].includes(event.key) || (event.key === " " && event.shiftKey);
      const distance = event.key.startsWith("Arrow") ? 48 : innerHeight * .85;
      if ((down || up) && move(down ? distance : -distance)) event.preventDefault();
    };
    const onMotionChange = () => { stopMotion(); requestUpdate(); };
    let frameDocument: Document | null = null;
    const bindFrameKeys = () => {
      frameDocument?.removeEventListener("keydown", onKeyDown);
      frameDocument = frame.current?.contentDocument ?? null;
      frameDocument?.addEventListener("keydown", onKeyDown);
    };

    heroWindow.henkakuGatewayMoveIntent = move;
    heroWindow.henkakuGatewayReset = reset;
    heroWindow.henkakuGatewayScrollIntent = forward;
    heroWindow.henkakuGatewayReverseIntent = reverse;
    const iframe = frame.current;
    iframe?.addEventListener("load", bindFrameKeys);
    bindFrameKeys();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", requestUpdate);
    reducedMotion.addEventListener("change", onMotionChange);
    requestUpdate();
    return () => {
      stopMotion();
      delete heroWindow.henkakuGatewayMoveIntent;
      delete heroWindow.henkakuGatewayReset;
      delete heroWindow.henkakuGatewayScrollIntent;
      delete heroWindow.henkakuGatewayReverseIntent;
      iframe?.removeEventListener("load", bindFrameKeys);
      frameDocument?.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", requestUpdate);
      reducedMotion.removeEventListener("change", onMotionChange);
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
