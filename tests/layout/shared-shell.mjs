// Read-only responsive geometry checks, run after dismissing the intro.
// Repeat at each documented viewport, screen, and light/dark appearance.
export function auditSharedShellLayout() {
  const issues = [];
  const visible = (element) => element && element.getBoundingClientRect().height > 0 && getComputedStyle(element).display !== "none";
  const header = document.querySelector(".pd-header");
  const footer = document.querySelector(".pd-footer");
  const main = document.querySelector("#demo-main");
  const navigation = [...document.querySelectorAll('.pd-header nav a')];
  if (navigation[0]?.textContent.trim() !== 'Setup' || navigation[1]?.textContent.trim() !== 'Community' || navigation[0]?.getAttribute('href') !== '#setup') issues.push('Setup must appear immediately before Community and link to wallet setup');
  if (location.hash === '#community' && document.querySelector('.pd-page-heading .pd-eyebrow')?.textContent !== 'DAILY CHECK-IN') issues.push('Community tab must identify the daily check-in screen');
  if (location.hash === '#community') {
    const daily = document.querySelector('.pd-daily-checkin');
    const history = daily?.querySelector('.pd-checkin-history');
    const activities = document.querySelector('.pd-community-grid');
    if (!history || !daily?.querySelector('.pd-checkin-panel') || !history.querySelector('h2')) issues.push('Your Footprints must be a subsection of Daily Check-in');
    if (daily?.contains(activities)) issues.push('Sample activities must remain outside Daily Check-in');
    if (history && activities && history.getBoundingClientRect().bottom > activities.getBoundingClientRect().top) issues.push('Check-in history must appear before sample activities');
  }
  if (document.documentElement.scrollWidth > innerWidth + 2) issues.push("Page overflows horizontally");
  for (const [name, element] of [["Shared header", header], ["Shared footer", footer]]) {
    if (!visible(element)) { issues.push(`${name} is missing from the layout`); continue; }
    const box = element.getBoundingClientRect();
    if (box.left < -1 || box.right > innerWidth + 1) issues.push(`${name} exceeds the viewport`);
    const targets = [...element.querySelectorAll("a,button")].filter(visible);
    for (const target of targets) {
      const rect = target.getBoundingClientRect();
      if (rect.width < 44 || rect.height < 44) issues.push(`${target.textContent.trim()} target is smaller than 44px`);
      if (rect.left < box.left - 1 || rect.right > box.right + 1 || rect.top < box.top - 1 || rect.bottom > box.bottom + 1) issues.push(`${target.textContent.trim()} is clipped by ${name}`);
    }
    for (let i = 0; i < targets.length; i++) for (let j = i + 1; j < targets.length; j++) {
      const a = targets[i].getBoundingClientRect(), b = targets[j].getBoundingClientRect();
      if (a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1) issues.push(`${name} controls overlap`);
    }
  }
  const theme = header?.querySelector(".theme-toggle");
  if (!visible(theme)) issues.push("Theme control is missing from the shared header");
  if (visible(header) && main && header.getBoundingClientRect().bottom > main.getBoundingClientRect().top + 1) issues.push("Header overlaps main content");
  if (visible(footer) && main && main.getBoundingClientRect().bottom > footer.getBoundingClientRect().top + 1) issues.push("Footer overlaps main content");
  return { viewport: { width: innerWidth, height: innerHeight }, screen: location.hash || "#home", theme: document.documentElement.dataset.theme, issues };
}

// Run in the home iframe with a frame-scoped body.evaluate.
export function auditHomeContentLayout(body) {
  const doc = body.ownerDocument;
  const view = doc.defaultView;
  const issues = [];
  if (doc.documentElement.scrollWidth > view.innerWidth + 2) issues.push("Home content overflows horizontally");
  if (doc.querySelector("header,footer")) issues.push("Home iframe still has a separate header or footer");
  for (const selector of [".home-intro", ".pulse-grid", ".threshold-inner"]) {
    for (const element of doc.querySelectorAll(selector)) {
      const box = element.getBoundingClientRect();
      if (box.left < -2 || box.right > view.innerWidth + 2) issues.push(`${selector} exceeds the viewport`);
    }
  }
  return { viewport: { width: view.innerWidth, height: view.innerHeight }, issues };
}
