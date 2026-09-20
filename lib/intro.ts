// ABOUTME: イントロを見たかどうかを、アプリのJavaScriptが届く前に文書へ印として残す。
// ABOUTME: showModal() は hydration 後なので、この印がないと表示が決まるまで画面が空白になる(Issue #123)。
export const INTRO_SEEN_KEY = "henkaku.intro.seen.bubble-multi.v1";

/** テーマの初期化と同じく `<head>` で同期実行する。描画より先に印を付けるのが目的。 */
export const introInitializationScript = `(() => {
  try { if (sessionStorage.getItem("${INTRO_SEEN_KEY}") === "1") document.documentElement.dataset.introSeen = "1"; } catch {}
})();`;
