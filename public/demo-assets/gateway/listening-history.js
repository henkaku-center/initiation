// Shared fictional community activity. Never read or write personal history.
(() => {
  const data = window.gatewayMock;
  const list = document.querySelector("[data-track-list]");
  if (!data?.communityPlays || !list) return;
  const episodes = new Map(data.episodes.map((episode) => [episode.id, episode]));
  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  list.replaceChildren();
  data.communityPlays.forEach((entry) => {
    const episode = episodes.get(entry.episodeId);
    if (!episode) return;
    const item = make("li", "frequency-entry");
    const listener = make("div", "frequency-listener");
    const avatar = make("span", "frequency-avatar");
    avatar.dataset.avatar = entry.avatar;
    avatar.setAttribute("aria-hidden", "true");
    avatar.append(make("span", "frequency-avatar-shape"));
    const identity = make("div", "frequency-identity");
    identity.append(make("span", "frequency-listener-name", entry.listener), make("span", "frequency-meta", `${entry.playedAt}に再生`));
    listener.append(avatar, identity);
    const link = make("a", "frequency-link");
    link.href = episode.source;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    const art = make("div", "frequency-art");
    const thumbnail = make("img", "");
    thumbnail.src = `https://i.ytimg.com/vi/${episode.id}/mqdefault.jpg`;
    thumbnail.alt = "";
    thumbnail.loading = "lazy";
    thumbnail.width = 320;
    thumbnail.height = 180;
    thumbnail.addEventListener("error", () => { thumbnail.hidden = true; });
    art.append(thumbnail);
    const copy = make("div", "frequency-copy");
    copy.append(make("strong", "frequency-title", episode.title), make("span", "frequency-guest", episode.guest), make("span", "frequency-meta", "この回をYouTubeで聴く ↗"));
    link.append(art, copy);
    item.append(listener, link);
    list.append(item);
  });
})();
