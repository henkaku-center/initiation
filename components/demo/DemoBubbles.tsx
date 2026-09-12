"use client";
import { useEffect, useId, useRef } from "react";
import {
  advanceBubbles,
  createBubbles,
  type BubblePointer,
} from "@/lib/demo/bubbles";
import { createGlassRenderer } from "@/lib/demo/glassRenderer";

export function DemoBubbles({ still }: { still: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controller = useRef<{ setStill: (value: boolean) => void } | null>(
    null,
  );
  const gradientId = "glass-" + useId().replace(/[^\w-]/g, "");
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    container.dataset.renderer = "fallback";
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      powerPreference: "low-power",
    });
    if (!gl) return;
    let renderer: ReturnType<typeof createGlassRenderer>;
    try {
      renderer = createGlassRenderer(gl);
    } catch {
      return;
    }
    let scene = createBubbles({ width: 1, height: 1 });
    let pointer: BubblePointer | null = null;
    let frame: number | null = null;
    let last: number | null = null;
    let visible = true;
    let stillFlag = false;
    let alive = true;
    let lost = false;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const coarse = matchMedia("(pointer: coarse)");
    const allowed = () =>
      alive &&
      !lost &&
      !stillFlag &&
      !reduced.matches &&
      !coarse.matches &&
      visible &&
      !document.hidden;
    const stop = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      last = null;
    };
    const tick = (time: number) => {
      frame = null;
      if (!allowed()) return;
      if (last !== null)
        scene = advanceBubbles(scene, (time - last) / 1000, pointer);
      last = time;
      renderer.draw(scene);
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      if (allowed()) {
        if (frame === null) frame = requestAnimationFrame(tick);
      } else {
        stop();
        if (!lost) renderer.draw(scene);
      }
      container.dataset.motion = allowed() ? "flowing" : "still";
    };
    const resize = () => {
      const box = container.getBoundingClientRect();
      if (!box.width || !box.height || lost) return;
      const scale = Math.min(
        devicePixelRatio || 1,
        1.5,
        1000 / Math.max(box.width, box.height),
      );
      const width = Math.max(1, Math.round(box.width * scale));
      const height = Math.max(1, Math.round(box.height * scale));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        const shortest = Math.min(box.width, box.height);
        scene = createBubbles({
          width: box.width / shortest,
          height: box.height / shortest,
        });
        last = null;
      }
      renderer.resize(width, height);
      renderer.draw(scene);
      container.dataset.renderer = "glass";
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || stillFlag || reduced.matches) return;
      const box = container.getBoundingClientRect();
      const shortest = Math.min(box.width, box.height);
      pointer = {
        x: (event.clientX - box.left) / shortest,
        y: (event.clientY - box.top) / shortest,
      };
    };
    const leave = () => {
      pointer = null;
    };
    const contextLost = (event: Event) => {
      event.preventDefault();
      lost = true;
      stop();
      container.dataset.renderer = "fallback";
    };
    const contextRestored = () => {
      try {
        renderer = createGlassRenderer(gl);
        lost = false;
        resize();
        sync();
      } catch {
        container.dataset.renderer = "fallback";
      }
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    const visibility = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      sync();
    });
    visibility.observe(container);
    container.addEventListener("pointermove", move, { passive: true });
    container.addEventListener("pointerleave", leave);
    canvas.addEventListener("webglcontextlost", contextLost);
    canvas.addEventListener("webglcontextrestored", contextRestored);
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    coarse.addEventListener("change", sync);
    controller.current = {
      setStill(value) {
        stillFlag = value;
        sync();
      },
    };
    resize();
    sync();
    return () => {
      alive = false;
      stop();
      controller.current = null;
      observer.disconnect();
      visibility.disconnect();
      renderer.dispose();
      container.removeEventListener("pointermove", move);
      container.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("webglcontextlost", contextLost);
      canvas.removeEventListener("webglcontextrestored", contextRestored);
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", sync);
      coarse.removeEventListener("change", sync);
    };
  }, []);
  useEffect(() => {
    controller.current?.setStill(still);
  }, [still]);
  return (
    <div
      className="pd-glass-scene"
      ref={containerRef}
      data-renderer="fallback"
      aria-hidden="true"
    >
      <svg
        className="pd-glass-fallback"
        viewBox="0 0 720 720"
        preserveAspectRatio="none"
      >
        <defs>
          <radialGradient id={gradientId} cx=".35" cy=".3" r=".7">
            <stop offset="0" stopColor="#fff" stopOpacity=".9" />
            <stop offset=".35" stopColor="#fff" stopOpacity=".04" />
            <stop offset=".78" stopColor="#a1b8ee" stopOpacity=".12" />
            <stop offset=".97" stopColor="#5e74ac" stopOpacity=".7" />
            <stop offset="1" stopColor="#b6c6ee" stopOpacity=".5" />
          </radialGradient>
        </defs>
        <rect width="720" height="720" fill="#f6f6f2" />
        <ellipse
          cx="374"
          cy="360"
          rx="150"
          ry="338"
          stroke="#adb3c445"
          fill="none"
          transform="rotate(-30 374 360)"
        />
        <ellipse
          cx="374"
          cy="360"
          rx="150"
          ry="338"
          stroke="#adb3c445"
          fill="none"
          transform="rotate(32 374 360)"
        />
        <path d="M180 36 648 454 144 648Z" fill="#11131a" />
        <text
          x="440"
          y="360"
          transform="rotate(90 440 360)"
          fill="#263df5"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Arial,sans-serif"
          fontWeight="900"
          fontSize="129"
        >
          HENKAKU
        </text>
        {createBubbles({ width: 1, height: 1 }).bubbles.map((bubble, i) => (
          <circle
            key={i}
            cx={bubble.x * 720}
            cy={bubble.y * 720}
            r={bubble.radius * 720}
            fill={`url(#${gradientId})`}
            stroke="#c9d3eb80"
          />
        ))}
      </svg>
      <canvas ref={canvasRef} className="pd-glass-canvas" />
    </div>
  );
}
