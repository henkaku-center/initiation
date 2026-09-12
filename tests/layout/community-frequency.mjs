// ABOUTME: Check the public aggregate music chart and preserved threshold theme.
// ABOUTME: Run on a ready chart response; failure and loading states use the browser suite.
export function auditCommunityFrequency(body) {
  const doc = body.ownerDocument;
  const view = doc.defaultView;
  const issues = [];
  const section = doc.querySelector('[data-gateway-section="03-frequency"]');
  const entries = [...doc.querySelectorAll('.frequency-entry')];
if (!section?.textContent.includes('ListenBrainz / WEEKLY TOP TRACKS')) issues.push('Music ranking heading is missing');
if (entries.length !== 4) issues.push('Four public tracks are required for this ready-state audit');
if (section?.querySelector('.frequency-listener, .frequency-avatar, .frequency-progress')) issues.push('Personal-history indicators remain');
if (!section?.textContent.includes('ListenBrainz全体の公開ランキング')) issues.push('Source disclosure is missing');
for (const entry of entries) {
  const link = entry.querySelector('.frequency-link');
  const url = link && new URL(link.href);
  if (!url || !['musicbrainz.org', 'listenbrainz.org'].includes(url.hostname)) issues.push('Track source link is missing');
  for (const element of [entry, link].filter(Boolean)) {
    const box = element.getBoundingClientRect();
    if (box.left < -1 || box.right > view.innerWidth + 1 || element.scrollWidth > element.clientWidth + 2) issues.push('Music chart is clipped');
  }
}
  const threshold = doc.querySelector('.threshold-section');
  const thresholdStyle = threshold && view.getComputedStyle(threshold);
  const dark = doc.documentElement.dataset.theme === 'dark';
  const expectedBackground = dark ? 'rgb(19, 23, 31)' : 'rgb(246, 246, 242)';
  if (thresholdStyle?.backgroundColor !== expectedBackground) issues.push('Page background must retain the current appearance');
  const gate = doc.querySelector('.gate');
  const expectedGate = dark ? 'rgb(255, 255, 255)' : 'rgb(27, 35, 45)';
  if (!gate || view.getComputedStyle(gate).backgroundColor !== expectedGate) issues.push('Only the JoiN column should invert its appearance');
  const join = doc.querySelector('.button-primary');
  const expectedInk = dark ? 'rgb(18, 20, 26)' : 'rgb(242, 243, 246)';
  if (!join || view.getComputedStyle(join).color !== expectedInk) issues.push('JoiN text does not invert the current appearance');
  return { viewport: { width: view.innerWidth, height: view.innerHeight }, theme: dark ? 'dark' : 'light', issues };
}
