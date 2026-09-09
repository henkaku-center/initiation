// One stable mock history for this browser's user, without membership tiers.
(() => {
  const data = window.gatewayMock;
  const list = document.querySelector("[data-track-list]");
  if (!data?.listeningHistory || !list) return;
  const storageKey = "henkaku.podcast-demo.history.v1";
  const episodes = new Map(data.episodes.map((episode) => [episode.id, episode]));
  const history = new Map(data.listeningHistory.map((entry) => [entry.id, entry]));
  const times = ["今日 · 08:10", "昨日 · 21:35", "2日前 · 12:20", "3日前 · 19:00"];
  let chosen;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (Array.isArray(saved) && saved.length === 4 && new Set(saved).size === 4 && saved.every((id) => history.has(id) && episodes.has(id))) chosen = saved;
  } catch { /* The mock also works without browser storage. */ }
  if (!chosen) {
    chosen = [...history.keys()].filter((id) => episodes.has(id));
    for (let i = chosen.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [chosen[i], chosen[j]] = [chosen[j], chosen[i]];
    }
    chosen = chosen.slice(0, 4);
    try { localStorage.setItem(storageKey, JSON.stringify(chosen)); } catch { /* Keep this visit's selection. */ }
  }
  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  list.replaceChildren();
  chosen.forEach((id, index) => {
    const episode = episodes.get(id);
    const entry = history.get(id);
    const item = make("li", "frequency-entry");
    const link = make("a", "frequency-link");
    link.href = `https://www.youtube.com/watch?v=${id}&t=${entry.resumeSeconds}s`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    const art = make("div", "frequency-art");
    const thumbnail = make("img", "");
    thumbnail.src = `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
    thumbnail.alt = "";
    thumbnail.loading = "lazy";
    thumbnail.width = 320;
    thumbnail.height = 180;
    thumbnail.addEventListener("error", () => { thumbnail.hidden = true; });
    art.append(thumbnail);
    const copy = make("div", "frequency-copy");
    copy.append(make("span", "frequency-meta", times[index]), make("strong", "frequency-title", episode.title), make("span", "frequency-guest", episode.guest));
    const progress = make("div", "frequency-progress");
    progress.setAttribute("aria-hidden", "true");
    const fill = make("span", "");
    fill.style.width = `${entry.progress}%`;
    progress.append(fill);
    copy.append(progress, make("span", "frequency-meta", entry.progress === 100 ? "聴き終えた回 · もう一度聴く ↗" : `聴いた割合 ${entry.progress}% · 続きをYouTubeで ↗`));
    link.append(art, copy);
    item.append(link);
    list.append(item);
  });
})();
