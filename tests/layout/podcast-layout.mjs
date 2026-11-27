// ABOUTME: Audit the source's official podcast scenes and fictional sample history geometry.
// ABOUTME: Run in the home iframe after the chart is ready.
export function auditPodcastLayout(body) {
  const doc = body.ownerDocument;
  const view = doc.defaultView;
  const issues = [];
  const scenes = [...doc.querySelectorAll(".voices-scene")];
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
  if (scenes.length !== 4) issues.push("Four official podcast scenes are missing");
for (const scene of scenes) {
  if (!scene.querySelector('iframe, [data-podcast-player], [data-podcast-fallback]')) issues.push('An official video or fallback is missing');
  const bounds = scene.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0) issues.push('Podcast scene is not visible');
}
  const frequency = doc.querySelector(".frequency-list");
  if (!frequency || frequency.querySelectorAll(".frequency-entry").length !== 4) issues.push("Four sample plays are missing");
  for (const element of doc.querySelectorAll(".frequency-summary, .frequency-entry, .pulse-development-note")) {
    const box = element.getBoundingClientRect();
    if (box.left < -1 || box.right > view.innerWidth + 1) issues.push("Music chart exceeds the viewport");
    if (element.scrollWidth > element.clientWidth + 2) issues.push("Music chart content is clipped");
  }
  if (doc.documentElement.scrollWidth > view.innerWidth + 2) issues.push("Page overflows horizontally");
  return { viewport: { width: view.innerWidth, height: view.innerHeight }, issues };
}
