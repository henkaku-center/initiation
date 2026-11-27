/* Official, user-operated YouTube players. Media stays on YouTube. */
(() => {
  let apiPromise = null;
  function loadAPI() {
    if (window.YT?.Player) return Promise.resolve(window.YT);
    if (apiPromise) return apiPromise;
    apiPromise = new Promise((resolve) => {
      const previous = window.onYouTubeIframeAPIReady;
      let timer;
      const finish = (api) => {
        clearTimeout(timer);
        if (window.onYouTubeIframeAPIReady === ready) window.onYouTubeIframeAPIReady = previous;
        if (!api) apiPromise = null;
        resolve(api);
      };
      const ready = () => {
        if (typeof previous === "function") previous();
        finish(window.YT);
      };
      window.onYouTubeIframeAPIReady = ready;
      timer = setTimeout(() => finish(null), 15000);
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => finish(null);
      document.head.append(script);
    });
    return apiPromise;
  }

  function initialize(root = document, signal) {
    if (signal?.aborted) return;
    const elements = [...root.querySelectorAll("[data-podcast-scene]")];
    const episodes = [...new Map((window.gatewayContent?.episodes || [])
      .filter((episode) => /^[\w-]{11}$/.test(episode.id))
      .map((episode) => [episode.id, episode])).values()];
    if (!elements.length || episodes.length < elements.length) return;
    for (let i = episodes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [episodes[i], episodes[j]] = [episodes[j], episodes[i]];
    }
    let disposed = false;
    let loaded = false;
    const lifecycle = new AbortController();
    const scenes = elements.map((element, index) => {
      const episode = episodes[index];
      element.dataset.podcastEpisode = episode.id;
      element.dataset.podcastState = "ready";
      element.querySelector("[data-podcast-label]").textContent = [episode.episode, episode.guest].filter(Boolean).join(" · ");
      const link = element.querySelector("[data-podcast-link]");
      link.textContent = `${episode.title} ↗`;
      link.href = episode.source || `https://www.youtube.com/watch?v=${episode.id}`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute("aria-label", `${episode.title}をYouTubeで見る（新しいタブ）`);
      const status = element.querySelector("[data-podcast-status]");
      status.textContent = "";
      return { element, episode, status, frame: null, player: null, ready: false };
    });
    const pause = (scene) => {
      if (scene.ready) scene.player.pauseVideo();
    };
    function loadPlayers() {
      if (loaded || disposed) return;
      loaded = true;
      observer.disconnect();
      scenes.forEach((scene, index) => {
        const frame = document.createElement("iframe");
        frame.id = `joi-podcast-player-${index}`;
        frame.dataset.podcastPlayer = "";
        const params = new URLSearchParams({ enablejsapi: "1", autoplay: "0", controls: "1", playsinline: "1", origin: location.origin, rel: "0" });
        frame.src = `https://www.youtube-nocookie.com/embed/${scene.episode.id}?${params}`;
        frame.title = `${scene.episode.title} — YouTube`;
        frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
        frame.allowFullscreen = true;
        frame.referrerPolicy = "strict-origin-when-cross-origin";
        frame.width = "640";
        frame.height = "360";
        scene.element.querySelector("[data-podcast-player]").replaceWith(frame);
        scene.frame = frame;
      });
      // Native iframe controls remain usable even when the optional API fails.
      void loadAPI().then((api) => {
        if (!api?.Player || disposed) return;
        scenes.forEach((scene) => {
          scene.player = new api.Player(scene.frame, {
            events: {
              onReady(event) {
                if (disposed) { event.target.destroy(); return; }
                scene.player = event.target;
                scene.ready = true;
              },
              onStateChange(event) {
                if (disposed) return;
                scene.element.dataset.podcastState = event.data === 1 ? "playing" : "ready";
                // Only a user's YouTube action starts playback; never mute,
                // seek, loop or start a different episode on scroll.
                if (event.data === 1) scenes.filter((other) => other !== scene).forEach(pause);
              },
              onError() {
                if (!disposed) scene.status.textContent = "この動画は埋め込みで再生できません。YouTubeのリンクからご覧ください。";
              },
            },
          });
        });
      });
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadPlayers();
    }, { rootMargin: "600px 0px" });
    observer.observe(root.querySelector("[data-voices-scroll]") || elements[0]);
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      observer.disconnect();
      lifecycle.abort();
      scenes.forEach((scene) => {
        if (scene.player) scene.player.destroy();
        else scene.frame?.remove();
      });
    };
    window.addEventListener("pagehide", (event) => {
      if (event.persisted) scenes.forEach(pause);
      else dispose();
    }, { signal: lifecycle.signal });
    signal?.addEventListener("abort", dispose, { once: true });
    return dispose;
  }
  window.henkakuStartPodcast = initialize;
  if (document.querySelector(".pd-inline-gateway")) return;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => initialize(), { once: true });
  else initialize();
})();
