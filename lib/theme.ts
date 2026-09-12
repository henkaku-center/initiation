// Shared by the initial document and client controls; no cookies or server state.
export type Theme = "light" | "dark";
export const THEME_STORAGE_KEY = "henkaku.appearance.v1";
export const themeInitializationScript = `(() => {
  let theme = "light";
  try { if (localStorage.getItem("${THEME_STORAGE_KEY}") === "dark") theme = "dark"; } catch {}
  document.documentElement.dataset.theme = theme;
})();`;
