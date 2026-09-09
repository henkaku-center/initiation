/* Official YouTube embeds only; media stays on YouTube. */
(() => {
  function initialize() {
    const elements = [...document.querySelectorAll("[data-podcast-scene]")];
    const toggle = document.querySelector("[data-podcast-toggle]");
    const voicesScroll = document.querySelector("[data-voices-scroll]");
    const episodes = [...new Map((window.gatewayMock?.episodes || [])
      .filter((episode) => /^[\w-]{11}$/.test(episode.id))
      .map((episode) => [episode.id, episode])).values()];
    if (!elements.length || !toggle || episodes.length < elements.length) return;

    for (let i = episodes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [episodes[i], episodes[j]] = [episodes[j], episodes[i]];
    }

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Keep the development preview still until the visitor explicitly starts it.
    let locallyPaused = true;
    let homeActive = window.parent === window;
    let parentPaused = false;
    let selected = null;
    let disposed = false;
    let pageSuspended = false;

    function setStatus(scene, message, state) {
      if (scene.status.textContent !== message) scene.status.textContent = message;
      scene.element.dataset.podcastState = state;
    }

    const scenes = elements.map((element, index) => {
      const episode = episodes[index];
      const link = element.querySelector("[data-podcast-link]");
      element.querySelector("[data-podcast-label]").textContent = [episode.episode, episode.guest].filter(Boolean).join(" · ");
      element.dataset.podcastEpisode = episode.id;
      link.textContent = `${episode.title} ↗`;
      link.href = `https://www.youtube.com/watch?v=${episode.id}&t=0s`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute("aria-label", `${episode.title}をYouTubeで見る（新しいタブ）`);
      const scene = {
        element, episode, link, index,
        screen: element.querySelector(".podcast-screen"),
        status: element.querySelector("[data-podcast-status]"),
        placeholder: element.querySelector("[data-podcast-player]"),
        player: null, ready: false, failed: false, blocked: false,
        ratio: 0, start: null, end: null, requested: false,
        metadataAt: 0, readyTimeout: null,
      };
      setStatus(scene, "公式映像を読み込み中 · 音声なし", "loading");
      return scene;
    });

    function silence(scene) {
      scene.player.mute();
      scene.player.setVolume(0);
    }

    function pause(scene) {
      scene.requested = false;
      scene.metadataAt = 0;
      if (!scene.ready) return;
      silence(scene);
      const state = scene.player.getPlayerState();
      if (state === 1 || state === 3) scene.player.pauseVideo();
    }

    function updateToggle() {
      const failed = scenes.every((scene) => scene.failed);
      const resume = locallyPaused || scenes.some((scene) => scene.blocked);
      toggle.disabled = failed;
      toggle.textContent = failed ? "映像を読み込めません" : resume ? "映像を無音で再開" : "映像を一時停止";
      toggle.setAttribute("aria-pressed", String(locallyPaused));
    }

    function fail(scene, message) {
      if (scene.failed) return;
      pause(scene);
      scene.failed = true;
      scene.ready = false;
      clearTimeout(scene.readyTimeout);
      scene.player?.destroy();
      scene.player = null;
      const thumbnail = document.createElement("img");
      thumbnail.src = `https://i.ytimg.com/vi/${scene.episode.id}/hqdefault.jpg`;
      thumbnail.alt = `${scene.episode.title} — 公式動画のサムネイル`;
      thumbnail.className = "podcast-fallback";
      thumbnail.dataset.podcastFallback = "";
      thumbnail.width = 480;
      thumbnail.height = 360;
      thumbnail.loading = "lazy";
      scene.screen.replaceChildren(thumbnail);
      setStatus(scene, message, "unavailable");
      updateToggle();
    }

    function allowed() {
      return !disposed && !pageSuspended && homeActive && !parentPaused && !locallyPaused && !document.hidden;
    }

    // Use the real duration; never guess a timestamp from a catalogue entry.
    function prepareScene(scene) {
      if (!scene.ready || scene.failed || scene.start !== null) return;
      const duration = scene.player.getDuration();
      if (!Number.isFinite(duration) || duration <= 0) return;
      scene.start = Math.floor(Math.random() * (Math.floor(Math.max(0, duration - 20)) + 1));
      scene.end = Math.min(duration, scene.start + 20);
      scene.link.href = `https://www.youtube.com/watch?v=${scene.episode.id}&t=${scene.start}s`;
      silence(scene);
      if (scene === selected && allowed() && scene.requested) {
        scene.player.seekTo(scene.start, true);
      } else {
        scene.player.cueVideoById({ videoId: scene.episode.id, startSeconds: scene.start, endSeconds: scene.end });
      }
    }

    function synchronize() {
      if (disposed) return;
      const candidates = allowed() ? scenes.filter((scene) => scene.ready && !scene.failed && !scene.blocked && scene.ratio > 0.5) : [];
      // Follow the same scroll progress as the strip, including on wide screens
      // where several previews can remain visible throughout a handoff.
      const rect = voicesScroll?.getBoundingClientRect();
      const progress = rect ? Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height - window.innerHeight))) : 0;
      const desiredIndex = progress * (scenes.length - 1);
      selected = candidates.sort((a, b) =>
        (rect ? Math.abs(a.index - desiredIndex) - Math.abs(b.index - desiredIndex) : 0) || b.ratio - a.ratio
      )[0] || null;
      for (const scene of scenes) {
        if (scene !== selected) pause(scene);
        if (scene.failed || scene.blocked || !scene.ready) continue;
        if (scene !== selected) {
          setStatus(scene, locallyPaused || parentPaused || !homeActive || document.hidden
            ? "映像は一時停止中 · 音声なし" : "表示中の1本を無音でプレビュー", "paused");
        }
      }
      if (!selected) return;
      prepareScene(selected);
      silence(selected);
      if (!selected.requested && selected.player.getPlayerState() !== 1) {
        selected.requested = true;
        // YouTube may expose duration only after muted playback has begun.
        if (selected.start === null) selected.metadataAt = Date.now();
        setStatus(selected, selected.start === null ? "場面を準備中 · 音声なし" : "無音映像を読み込み中", "loading");
        selected.player.playVideo();
      }
    }

    function attachPlayers() {
      if (disposed) return;
      scenes.forEach((scene, index) => {
        const frame = document.createElement("iframe");
        const params = new URLSearchParams({
          enablejsapi: "1", autoplay: "0", controls: "0", disablekb: "1",
          playsinline: "1", origin: location.origin, rel: "0",
        });
        frame.id = `joi-podcast-preview-${index}`;
        frame.dataset.podcastPlayer = "";
        frame.src = `https://www.youtube-nocookie.com/embed/${scene.episode.id}?${params}`;
        frame.title = `${scene.episode.title} — 無音プレビュー`;
        frame.allow = "autoplay; encrypted-media; picture-in-picture";
        frame.referrerPolicy = "strict-origin-when-cross-origin";
        frame.width = "640";
        frame.height = "360";
        frame.setAttribute("frameborder", "0");
        // All interaction is through the adjacent controls, so a click cannot unmute.
        frame.inert = true;
        frame.tabIndex = -1;
        scene.placeholder.replaceWith(frame);
        scene.readyTimeout = setTimeout(() => {
          if (!scene.ready) fail(scene, "映像を読み込めません。公式動画からご覧ください。");
        }, 15000);
        scene.player = new window.YT.Player(frame.id, {
          events: {
            onReady(event) {
              if (scene.failed || disposed) { event.target.destroy(); return; }
              scene.player = event.target;
              scene.ready = true;
              clearTimeout(scene.readyTimeout);
              silence(scene);
              prepareScene(scene);
              if (scene.start === null) scene.player.cueVideoById({ videoId: scene.episode.id, startSeconds: 0 });
              synchronize();
            },
            onStateChange(event) {
              if (!scene.ready) return;
              if (event.data === 1) {
                silence(scene);
                if (scene !== selected || !allowed() || scene.failed || scene.blocked) {
                  pause(scene);
                  return;
                }
                prepareScene(scene);
                setStatus(scene, scene.start === null ? "場面を準備中 · 音声なし" : "無音でプレビュー中", scene.start === null ? "loading" : "playing");
              } else if (event.data === 0) {
                scene.requested = false;
                if (scene === selected && allowed() && !scene.failed && !scene.blocked && scene.start !== null) {
                  silence(scene);
                  scene.player.seekTo(scene.start, true);
                  scene.player.playVideo();
                }
              } else if (event.data === 2) {
                scene.requested = false;
                if (!scene.failed && !scene.blocked) setStatus(scene, "映像は一時停止中 · 音声なし", "paused");
              } else if (event.data === 3 && !scene.failed && !scene.blocked) {
                setStatus(scene, "無音映像を読み込み中", "loading");
              }
            },
            onAutoplayBlocked() {
              if (scene.failed || disposed) return;
              scene.blocked = true;
              pause(scene);
              setStatus(scene, "再生には操作が必要です。「映像を無音で再開」または公式動画へ。", "blocked");
              updateToggle();
            },
            onError(event) {
              scene.element.dataset.podcastError = String(event.data);
              fail(scene, "この映像は埋め込みで再生できません。公式動画からご覧ください。");
            },
          },
        });
      });
    }

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const scene = scenes.find((candidate) => candidate.screen === entry.target);
        if (scene) scene.ratio = entry.isIntersecting ? entry.intersectionRatio : 0;
      }
      synchronize();
    }, { threshold: [0, 0.5, 0.51, 0.75, 1] });
    scenes.forEach((scene) => observer.observe(scene.screen));

    toggle.addEventListener("click", () => {
      if (scenes.some((scene) => scene.blocked)) locallyPaused = false;
      else locallyPaused = !locallyPaused;
      if (!locallyPaused) scenes.forEach((scene) => { scene.blocked = false; scene.requested = false; });
      updateToggle();
      synchronize();
    });
    document.addEventListener("visibilitychange", synchronize);
    motion.addEventListener("change", () => {
      if (motion.matches) locallyPaused = true;
      updateToggle();
      synchronize();
    });
    window.addEventListener("message", (event) => {
      if (event.origin !== location.origin || event.source !== window.parent || event.data?.type !== "henkaku:home-state") return;
      homeActive = event.data.active === true;
      parentPaused = event.data.paused === true;
      synchronize();
    });

    const interval = setInterval(() => {
      if (disposed || pageSuspended || document.hidden) return;
      for (const scene of scenes) {
        prepareScene(scene);
        if (scene.ready && !scene.failed && scene.start === null && scene.metadataAt && Date.now() - scene.metadataAt > 15000) {
          fail(scene, "場面を取得できません。公式動画からご覧ください。");
        }
      }
      if (selected?.ready && !selected.failed && selected.start !== null && selected.player.getPlayerState() === 1) {
        silence(selected);
        if (selected.player.getCurrentTime() >= selected.end) selected.player.seekTo(selected.start, true);
      }
      synchronize();
    }, 250);

    window.addEventListener("pagehide", (event) => {
      pageSuspended = true;
      scenes.forEach(pause);
      if (event.persisted) return;
      disposed = true;
      clearInterval(interval);
      observer.disconnect();
      scenes.forEach((scene) => {
        clearTimeout(scene.readyTimeout);
        scene.ready = false;
        scene.player?.destroy();
        scene.player = null;
      });
    });
    window.addEventListener("pageshow", (event) => {
      if (!event.persisted) return;
      pageSuspended = false;
      homeActive = window.parent === window;
      observer.disconnect();
      scenes.forEach((scene) => { scene.ratio = 0; observer.observe(scene.screen); });
      if (window.parent !== window) window.parent.postMessage({ type: "henkaku:podcast:ready" }, location.origin);
      synchronize();
    });

    updateToggle();
    if (window.parent !== window) window.parent.postMessage({ type: "henkaku:podcast:ready" }, location.origin);

    if (window.YT?.Player) { attachPlayers(); return; }
    let settled = false;
    const apiTimeout = setTimeout(apiUnavailable, 15000);
    function apiUnavailable() {
      if (settled || disposed) return;
      settled = true;
      clearTimeout(apiTimeout);
      scenes.forEach((scene) => fail(scene, "YouTubeに接続できません。公式動画からご覧ください。"));
    }
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousReady === "function") previousReady();
      if (settled || disposed) return;
      settled = true;
      clearTimeout(apiTimeout);
      attachPlayers();
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.addEventListener("error", apiUnavailable, { once: true });
    document.head.appendChild(script);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else initialize();
})();
