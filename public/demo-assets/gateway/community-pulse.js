// ABOUTME: Load the curated public Issue feed once, independently of the participation flow.
// ABOUTME: Preserve the server's success time and render external titles only as text.
(async () => {
  const list = document.querySelector("[data-pulse-list]");
  const status = document.querySelector("[data-pulse-status]");
  const timestamp = document.querySelector("[data-pulse-time]");
  if (!list || !status || !timestamp) return;

  const date = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    hour12: false, timeZone: "Asia/Tokyo", timeZoneName: "short",
  });
  const validTime = (value) => typeof value === "string" && Number.isFinite(Date.parse(value));
  const make = (tag, text = "") => {
    const node = document.createElement(tag);
    node.textContent = text;
    return node;
  };
  const time = (value) => {
    const node = make("time", date.format(new Date(value)));
    node.dateTime = value;
    return node;
  };
  function card(item) {
    if (!item || !Number.isSafeInteger(item.number) || item.number <= 0
      || typeof item.title !== "string" || !item.title.trim() || !validTime(item.updatedAt)
      || item.url !== `https://github.com/henkaku-center/initiation/issues/${item.number}`) throw new Error("Invalid issue");
    const link = make("a");
    link.className = "placeholder-card";
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    const updated = make("span", "Issue更新：");
    updated.append(time(item.updatedAt));
    link.append(make("span", `OPEN ISSUE / #${item.number}`), make("strong", item.title), updated);
    return link;
  }

  list.setAttribute("aria-busy", "true");
  status.textContent = "注目のIssueを取得中…";
  try {
    const response = await fetch("/api/community-pulse", {
      cache: "no-store", credentials: "omit", signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("Feed unavailable");
    const data = await response.json();
    if (!data || !["fresh", "stale"].includes(data.status) || !validTime(data.lastSuccessAt)
      || !Array.isArray(data.issues) || data.issues.length > 6) throw new Error("Invalid feed");
    // Validate and build every card before publishing anything to the page.
    const cards = data.issues.map(card);
    const successTime = time(data.lastSuccessAt);
    list.replaceChildren(...cards);
    timestamp.textContent = "最終取得：";
    timestamp.append(successTime);
    const empty = cards.length ? "" : "最終取得時点で掲載対象のIssueはありません。";
    status.textContent = empty + (data.status === "stale" ? "前回取得した情報を表示しています。最新情報ではない可能性があります。" : "");
    window.dispatchEvent(new Event("henkaku:pulse-rendered"));
  } catch {
    list.replaceChildren();
    timestamp.textContent = "";
    status.textContent = "Issueを取得できませんでした。時間をおいてページを開き直すか、GitHubの一覧をご確認ください。";
  } finally {
    list.setAttribute("aria-busy", "false");
  }
})();
