// ABOUTME: Show weekly music rankings from ListenBrainz's public aggregate API.
// ABOUTME: Fetch no personal history and render external metadata only as text.
(async () => {
  const list = document.querySelector("[data-track-list]");
  const status = document.querySelector("[data-frequency-status]");
  const period = document.querySelector("[data-frequency-period]");
  const retry = document.querySelector("[data-frequency-retry]");
  if (!list || !status || !period || !retry) return;
  const source = "https://listenbrainz.org/statistics/?range=week";
  const api = "https://api.listenbrainz.org/1/stats/sitewide/recordings?range=week&count=4";
  const date = new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "UTC" });
  const timestamp = (value) => Number.isInteger(value) && value > 0 && value < 8640000000000;
  const make = (tag, className, text = "") => {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = text;
    return node;
  };

  function track(item, index) {
    if (!item || typeof item.track_name !== "string" || !item.track_name.trim()
      || typeof item.artist_name !== "string" || !item.artist_name.trim()
      || !Number.isSafeInteger(item.listen_count) || item.listen_count < 0) throw new Error("Invalid recording");
    const entry = make("li", "frequency-entry");
    const link = make("a", "frequency-link");
    const hasId = typeof item.recording_mbid === "string" && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(item.recording_mbid);
    link.href = hasId ? `https://musicbrainz.org/recording/${item.recording_mbid}` : source;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    const art = make("div", "frequency-art");
    art.setAttribute("aria-hidden", "true");
    art.append(make("span", "frequency-record"), make("span", "frequency-rank", String(index + 1).padStart(2, "0")));
    const copy = make("div", "frequency-copy");
    copy.append(make("strong", "frequency-title", item.track_name), make("span", "frequency-guest", item.artist_name), make("span", "frequency-meta", `${item.listen_count.toLocaleString("ja-JP")} 再生 · ListenBrainz`), make("span", "frequency-meta", hasId ? "曲の情報を見る ↗" : "ランキングを見る ↗"));
    link.append(art, copy);
    entry.append(link);
    return entry;
  }

  async function load() {
    if (retry.disabled) return;
    retry.disabled = true;
    retry.hidden = true;
    status.textContent = "音楽ランキングを取得中…";
    period.textContent = "";
    list.replaceChildren();
    list.setAttribute("aria-busy", "true");
    try {
      const response = await fetch(api, { credentials: "omit", referrerPolicy: "no-referrer", signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error("Ranking unavailable");
      if (response.status === 204) { status.textContent = "公開ランキングはまだありません。"; return; }
      const data = (await response.json())?.payload;
      if (!data || !Array.isArray(data.recordings) || data.range !== "week"
        || !timestamp(data.from_ts) || !timestamp(data.to_ts) || data.from_ts >= data.to_ts
        || !timestamp(data.last_updated)) throw new Error("Invalid ranking");
      const entries = data.recordings.slice(0, 4).map(track);
      list.replaceChildren(...entries);
      period.textContent = `${date.format(data.from_ts * 1000)} – ${date.format((data.to_ts - 1) * 1000)} · UTC / 更新 ${date.format(data.last_updated * 1000)}`;
      status.textContent = entries.length ? "" : "公開ランキングはまだありません。";
    } catch {
      status.textContent = "音楽ランキングを取得できませんでした。ListenBrainzのサイトでも確認できます。";
      retry.hidden = false;
    } finally {
      retry.disabled = false;
      list.setAttribute("aria-busy", "false");
    }
  }
  retry.addEventListener("click", load);
  await load();
})();
