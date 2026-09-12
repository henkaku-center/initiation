// Read-only checks for the homepage iframe. Run before and after the change.
export function auditCommunityFrequency(body) {
  const doc = body.ownerDocument;
  const view = doc.defaultView;
  const issues = [];
  const section = doc.querySelector('[data-gateway-section="03-frequency"]');
  const entries = [...doc.querySelectorAll('.frequency-entry')];
  if (!section?.textContent.includes('みんなの最近のプレイ履歴')) issues.push('Community-wide history heading is missing');
  if (entries.length !== 4) issues.push('Four community play events are required');
  if (section?.textContent.match(/あなたの|続きを|聴いた割合/)) issues.push('Personal-history wording remains');
  if (section?.querySelector('.frequency-progress')) issues.push('Personal progress remains');
  if (!section?.textContent.includes('架空')) issues.push('Fictional listener disclosure is missing');
  const variants = new Set();
  for (const entry of entries) {
    const avatar = entry.querySelector('.frequency-avatar');
    const listener = entry.querySelector('.frequency-listener');
    if (!avatar || !listener?.textContent.trim()) issues.push('Play event is missing its listener');
    if (avatar) {
      variants.add(avatar.getAttribute('data-avatar'));
      const box = avatar.getBoundingClientRect();
      if (box.width < 32 || box.height < 32) issues.push('Listener icon is too small');
      if (avatar.getAttribute('aria-hidden') !== 'true') issues.push('Decorative avatar duplicates the listener label');
    }
    const url = new URL(entry.querySelector('.frequency-link').href);
    if (url.searchParams.has('t')) issues.push('Community link resumes someone else’s progress');
    for (const element of [entry, listener].filter(Boolean)) {
      const box = element.getBoundingClientRect();
      if (box.left < -1 || box.right > view.innerWidth + 1 || element.scrollWidth > element.clientWidth + 2) issues.push('Community history is clipped');
    }
  }
  if (variants.size !== 4 || !variants.has('anonymous')) issues.push('Three abstract icons and one anonymous icon are required');
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
