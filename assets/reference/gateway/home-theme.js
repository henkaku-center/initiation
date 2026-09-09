// The portal owns theme selection; apply its choice before the iframe paints.
(() => {
  const applyTheme = (theme) => {
    if (theme !== "light" && theme !== "dark") return;
    document.documentElement.dataset.theme = theme;
  };

  try {
    applyTheme(window.parent.document.documentElement.dataset.theme);
  } catch {
    // Standalone or cross-origin embeds keep the document's light default.
  }

  window.addEventListener("message", (event) => {
    if (event.origin !== location.origin || event.source !== window.parent) return;
    if (event.data?.type === "henkaku:theme") applyTheme(event.data.theme);
  });
})();
