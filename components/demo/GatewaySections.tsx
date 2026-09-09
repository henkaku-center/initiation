"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  sceneScrollPosition,
  visibleSceneIndex,
} from "@/lib/demo/gatewayMotion";

export function GatewayVoices({ still }: { still: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const manual = useRef(false);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const section = sectionRef.current;
    const strip = stripRef.current;
    if (!section || !strip) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const small = matchMedia("(max-width: 800px), (pointer: coarse)");
    let frame: number | null = null;
    const update = () => {
      frame = null;
      if (
        still ||
        reduced.matches ||
        small.matches ||
        manual.current ||
        strip.contains(document.activeElement)
      ) {
        strip.dataset.driver = "manual";
        return;
      }
      const box = section.getBoundingClientRect();
      if (box.bottom < 0 || box.top > innerHeight) return;
      strip.dataset.driver = "scroll";
      strip.scrollLeft = sceneScrollPosition(
        box.top,
        box.height,
        innerHeight,
        strip.scrollWidth - strip.clientWidth,
      );
    };
    const schedule = () => {
      if (frame === null) frame = requestAnimationFrame(update);
    };
    const wheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey) {
        manual.current = true;
        strip.dataset.driver = "manual";
      }
    };
    strip.addEventListener("wheel", wheel, { passive: true });
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    reduced.addEventListener("change", schedule);
    small.addEventListener("change", schedule);
    schedule();
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      reduced.removeEventListener("change", schedule);
      small.removeEventListener("change", schedule);
      strip.removeEventListener("wheel", wheel);
    };
  }, [still]);
  const claimManual = () => {
    manual.current = true;
    if (stripRef.current) stripRef.current.dataset.driver = "manual";
  };
  const go = (next: number) => {
    const strip = stripRef.current;
    if (!strip) return;
    manual.current = true;
    strip.dataset.driver = "manual";
    const panel = strip.children[Math.max(0, Math.min(2, next))] as HTMLElement;
    strip.scrollTo({
      left: panel.offsetLeft,
      behavior:
        still || matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
    });
  };
  return (
    <section
      className="pd-voices"
      ref={sectionRef}
      aria-labelledby="voices-title"
    >
      <div className="pd-voices-heading">
        <div>
          <p className="pd-eyebrow">02 / VOICES</p>
          <h2 id="voices-title">
            いくつもの声が、
            <br />
            次の景色をつくる。
          </h2>
        </div>
        <p>
          正解を探すより、問いを持ち寄る。
          <br />
          そんな会話から、何かが動きはじめます。
        </p>
      </div>
      <div
        className="pd-voice-strip"
        ref={stripRef}
        tabIndex={0}
        role="region"
        aria-label="3つのコミュニティの場面。左右にスクロールできます"
        onPointerDown={claimManual}
        onFocus={claimManual}
        onScroll={() => {
          const node = stripRef.current;
          if (node) {
            const width = (node.children[0] as HTMLElement).offsetWidth;
            setIndex(
              visibleSceneIndex(
                node.scrollLeft,
                node.clientWidth,
                width,
                20,
                3,
              ),
            );
          }
        }}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            go(index + (e.key === "ArrowRight" ? 1 : -1));
          }
        }}
      >
        <article className="pd-voice-scene pd-voice-listen">
          <div className="pd-voice-meta">
            <span>SCENE 01 / LISTEN</span>
            <span>DEMO VOICE</span>
          </div>
          <div className="pd-ascii-field" aria-hidden="true">
            {Array.from({ length: 8 }, (_, i) => (
              <span key={i}>
                {i % 2 ? "+ · + + · + · · + + · +" : "· + · · + + · + · · + +"}
              </span>
            ))}
          </div>
          <h3>
            「まだ、うまく
            <br />
            言葉にできなくても。」
          </h3>
          <p>まずは、聞くところから。</p>
        </article>
        <article className="pd-voice-scene pd-voice-share">
          <div className="pd-voice-meta">
            <span>SCENE 02 / SHARE</span>
            <span>DEMO VOICE</span>
          </div>
          <div className="pd-fragmented-mark" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </div>
          <h3>
            「完成してなくても、
            <br />
            見せ合ってみよう。」
          </h3>
          <p>違う得意が、ひとつのきっかけになる。</p>
        </article>
        <article className="pd-voice-scene pd-voice-enter">
          <div className="pd-voice-meta">
            <span>SCENE 03 / YOUR TURN</span>
            <span>5 STAGES AHEAD</span>
          </div>
          <h3>
            次は、
            <br />
            あなたの番。
          </h3>
          <a href="#journey">
            Initiationの世界へ <span>↗</span>
          </a>
        </article>
      </div>
      <div className="pd-voice-controls">
        <span>
          場面 {index + 1} / 3 <i>· 会話はデモ用のサンプルです</i>
        </span>
        <div>
          <button
            aria-label="前の場面"
            disabled={index === 0}
            onClick={() => go(index - 1)}
          >
            ←
          </button>
          <button
            aria-label="次の場面"
            disabled={index === 2}
            onClick={() => go(index + 1)}
          >
            →
          </button>
        </div>
      </div>
    </section>
  );
}

function useAudioClock(audio: HTMLAudioElement | null) {
  const subscribe = useCallback(
    (listener: () => void) => {
      const events = [
        "timeupdate",
        "durationchange",
        "loadedmetadata",
        "seeked",
        "play",
        "pause",
      ];
      events.forEach((event) => audio?.addEventListener(event, listener));
      return () =>
        events.forEach((event) => audio?.removeEventListener(event, listener));
    },
    [audio],
  );
  const snapshot = useCallback(
    () =>
      `${Math.floor(audio?.currentTime || 0)}/${audio && Number.isFinite(audio.duration) ? audio.duration : 51.15}`,
    [audio],
  );
  return useSyncExternalStore(subscribe, snapshot, () => "0/51.15")
    .split("/")
    .map(Number);
}
const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;

export function GatewayFrequency({
  audio,
  sound,
  toggleSound,
  seekAudio,
}: {
  audio: HTMLAudioElement | null;
  sound: boolean;
  toggleSound: () => void;
  seekAudio: (seconds: number) => void;
}) {
  const [time, duration] = useAudioClock(audio);
  return (
    <section className="pd-frequency" aria-labelledby="frequency-title">
      <div className="pd-frequency-title">
        <p className="pd-eyebrow">03 / FREQUENCY</p>
        <h2 id="frequency-title">
          この場所の、
          <br />
          いまの音。
        </h2>
        <p>
          少し耳を澄ませて、
          <br />
          次の一歩までひと息。
        </p>
      </div>
      <div className="pd-frequency-player">
        <div
          className={`pd-record ${sound ? "is-playing" : ""}`}
          aria-hidden="true"
        >
          <div>
            H<br />
            <span>BREEZE ZERO</span>
          </div>
        </div>
        <div className="pd-track">
          <span className="pd-track-label">FROM THE COMMUNITY</span>
          <h3>Breeze Zero</h3>
          <p>karawapo</p>
          <div
            className={`pd-wave-bars ${sound ? "is-playing" : ""}`}
            aria-hidden="true"
          >
            {Array.from({ length: 42 }, (_, i) => (
              <i
                key={i}
                style={{
                  height: `${14 + Math.abs(Math.sin(i * 2.1) * Math.cos(i * 0.37)) * 36}px`,
                  animationDelay: `${-i * 0.11}s`,
                }}
              />
            ))}
          </div>
          <div className="pd-track-seek">
            <span>{clock(time)}</span>
            <input
              type="range"
              min="0"
              max={duration}
              step="1"
              value={time}
              disabled={!audio || !Number.isFinite(audio.duration)}
              aria-label="Breeze Zeroの再生位置"
              onChange={(e) => seekAudio(Number(e.target.value))}
            />
            <span>{clock(duration)}</span>
          </div>
          <div className="pd-track-controls">
            <button onClick={toggleSound} aria-pressed={sound}>
              {sound ? "Ⅱ 一時停止" : "▷ 音楽を聴く"}
            </button>
            <span>CC BY 4.0 · SYNTH PREVIEW</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function GatewayThreshold({
  still,
  href,
}: {
  still: boolean;
  href: string;
}) {
  const label = useRef<HTMLSpanElement>(null);
  const frame = useRef<number | null>(null);
  const word = "JOIN HENKAKU";
  const finish = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    if (label.current) label.current.textContent = word;
  };
  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );
  const reveal = () => {
    finish();
    if (still || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 650);
      const glyphs = "01/#<>+*";
      if (label.current)
        label.current.textContent = [...word]
          .map((char, i) =>
            char === " " || i < progress * word.length
              ? char
              : glyphs[(i + Math.floor((now - start) / 55)) % glyphs.length],
          )
          .join("");
      if (progress < 1) frame.current = requestAnimationFrame(tick);
      else finish();
    };
    frame.current = requestAnimationFrame(tick);
  };
  return (
    <section className="pd-threshold">
      <div className="pd-threshold-top">
        <p className="pd-eyebrow">04 / THRESHOLD</p>
        <span>ENTRY : OPEN</span>
      </div>
      <p className="pd-threshold-intro">まだない世界の、その入口へ。</p>
      <a
        className="pd-decrypt-entry"
        href={href}
        aria-label="HENKAKUの参加体験へ進む"
        onPointerEnter={reveal}
        onFocus={reveal}
        onPointerLeave={finish}
        onBlur={finish}
      >
        <span ref={label} aria-hidden="true">
          {word}
        </span>
        <i aria-hidden="true">↗</i>
      </a>
      <div className="pd-threshold-bottom">
        <p>
          5つの景色をめぐる、小さな旅。
          <br />
          あなたの好奇心を、持ってきてください。
        </p>
        <span>SETUP → INITIATION → YOUR PASSPORT</span>
      </div>
    </section>
  );
}
