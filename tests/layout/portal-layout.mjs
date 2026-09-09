// Browser-side geometry checks. This suite intentionally excludes backend/domain tests.
// Pass this function to a connected browser's read-only page.evaluate.
export function auditPortalLayout() {
  const issues = [];
  const viewport = { width: innerWidth, height: innerHeight };
  const rect = (selector) => document.querySelector(selector)?.getBoundingClientRect();
  const visible = (element) => element && getComputedStyle(element).display !== "none" && getComputedStyle(element).visibility !== "hidden";
  if (document.documentElement.scrollWidth > innerWidth + 2) issues.push("Page overflows horizontally");
  if (location.pathname === "/" && ["", "#home"].includes(location.hash) && !document.querySelector(".pd-homepage-frame")) issues.push("Separate intro/homepage layout is missing");
  const intro = document.querySelector(".pd-intro-overlay");
  if (intro) {
    const bounds = intro.getBoundingClientRect();
    if (Math.abs(bounds.width - innerWidth) > 2 || Math.abs(bounds.height - innerHeight) > 2) issues.push("Intro does not fill the viewport");
    const button = document.querySelector(".pd-intro-enter");
    const box = button?.getBoundingClientRect();
    if (!box || box.height < 44 || box.left < 0 || box.right > innerWidth || box.bottom > innerHeight) issues.push("Intro entry button is clipped or too small");
    if (box && !button.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2))) issues.push("Intro entry button is covered");
  }
  const gatewayHeading = rect(".gateway h2");
  const gatewayList = rect(".gateway ul");
  if (gatewayHeading && gatewayList && gatewayHeading.bottom + 6 > gatewayList.top) issues.push("PUBLIC GATEWAY overlaps the navigation links");
  const bottomStrip = document.querySelector(".bottom");
  if (gatewayList && visible(bottomStrip) && gatewayList.bottom > bottomStrip.getBoundingClientRect().top + 1) issues.push("Intro links overlap the bottom strip");
  const navLinks = [...document.querySelectorAll(".gateway a")];
  if (navLinks.length && new Set(navLinks.map(link => link.getAttribute("href"))).size !== navLinks.length) issues.push("Intro navigation has duplicate destinations");
  for (const link of navLinks) {
    const bounds = link.getBoundingClientRect();
    if (bounds.left < 0 || bounds.right > innerWidth + 1 || bounds.top < 0 || bounds.bottom > innerHeight) issues.push("An intro link is clipped");
  }
  const game = rect(".pd-game");
  if (game) {
    const card = rect(".pd-game-card");
    const explorer = rect(".pd-explorer-image");
    if (card && !explorer) issues.push("Explorer is missing from the journey");
    if (card && (card.left < game.left - 1 || card.right > game.right + 1 || card.bottom > game.bottom + 1)) issues.push("Question card is clipped");
    if (card && explorer && explorer.left < card.right && explorer.right > card.left && explorer.top < card.bottom && explorer.bottom > card.top) issues.push("Explorer covers the question card");
  }
  for (const selector of [".home-header", ".pulse-grid", ".threshold-inner", ".pd-panel", ".pd-reward-grid", ".pd-community-grid"]) {
    document.querySelectorAll(selector).forEach((element) => {
      if (!visible(element)) return;
      const box = element.getBoundingClientRect();
      if (box.left < -2 || box.right > innerWidth + 2) issues.push(`${selector} exceeds the viewport`);
    });
  }
  return { viewport, issues };
}

// Run in the intro iframe after the reveal has handed the links back to the DOM.
export function auditIntroLinkPlacement() {
  const issues = [];
  const bottom = document.querySelector(".bottom");
  const list = document.querySelector(".gateway ul");
  if (bottom && list && getComputedStyle(bottom).display !== "none" && list.getBoundingClientRect().bottom > bottom.getBoundingClientRect().top + 1) issues.push("Intro links overlap the bottom strip");
  for (const link of document.querySelectorAll(".gateway a")) {
    const box = link.getBoundingClientRect();
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    if (!link.contains(hit)) issues.push(`${link.textContent} is covered`);
  }
  return { viewport: { width: innerWidth, height: innerHeight }, issues };
}
