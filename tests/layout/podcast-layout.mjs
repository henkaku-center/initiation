// Responsive geometry only. Run in the home iframe with body.evaluate.
export function auditPodcastLayout(body) {
  const doc = body.ownerDocument;
  const view = doc.defaultView;
  const issues = [];
  const scenes = [...doc.querySelectorAll(".podcast-scene")];
  const panel = doc.querySelector(".voices-sticky-panel");
  const stage = doc.querySelector(".voices-photo-stage");
  const track = doc.querySelector(".voices-photo-track");
  const reducedMotion = view.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (stage && !reducedMotion) {
    const box = stage.getBoundingClientRect();
    if (Math.abs(box.left) > 1 || Math.abs(box.width - view.innerWidth) > 1) issues.push("Podcast strip does not reach both viewport edges");
    if (track && view.getComputedStyle(track).transform === "none") issues.push("Vertical-to-horizontal podcast movement is disabled");
  }
  const heading = panel?.querySelector(".section-title")?.getBoundingClientRect();
  const description = panel?.querySelector(".microcopy")?.getBoundingClientRect();
  if (heading && description && heading.bottom + 6 > description.top) issues.push("Podcast heading overlaps its description");
  if (scenes.length !== 4) issues.push("Four podcast preview scenes are missing");
  for (const scene of scenes) {
    const bounds = scene.getBoundingClientRect();
    const screen = scene.querySelector(".podcast-screen")?.getBoundingClientRect();
    const caption = scene.querySelector("figcaption")?.getBoundingClientRect();
    if (!screen || screen.width < 200 || screen.height < 200) issues.push("Podcast player is smaller than 200px");
    if (screen && caption && screen.bottom > caption.top + 1) issues.push("Podcast caption covers the player");
    if (screen && (screen.left < bounds.left - 1 || screen.right > bounds.right + 1)) issues.push("Podcast player exceeds its scene");
    if (panel && view.getComputedStyle(panel).position === "sticky" && bounds.bottom - panel.getBoundingClientRect().top > view.innerHeight + 1) issues.push("Pinned podcast scene clips its caption below the viewport");
  }
  const frequency = doc.querySelector(".frequency-list");
  if (!frequency || frequency.querySelectorAll(".frequency-entry").length !== 4) issues.push("Four listening-history entries are missing");
  for (const element of doc.querySelectorAll(".frequency-summary, .frequency-entry, .pulse-development-note")) {
    const box = element.getBoundingClientRect();
    if (box.left < -1 || box.right > view.innerWidth + 1) issues.push("Listening history exceeds the viewport");
    if (element.scrollWidth > element.clientWidth + 2) issues.push("Listening history content is clipped");
  }
  if (doc.documentElement.scrollWidth > view.innerWidth + 2) issues.push("Page overflows horizontally");
  return { viewport: { width: view.innerWidth, height: view.innerHeight }, issues };
}
