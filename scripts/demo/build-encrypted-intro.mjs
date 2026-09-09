// Reference-only encrypted variant retained for the intro comparison.
export function buildEncryptedIntro({ liquid, introShell, logo }) {
let liquidStyle = liquid.match(/<style>([\s\S]*?)<\/style>/)[1].replace(/--(bg|ink|blue|rule)\b/g, "--liquid-$1");
liquidStyle = liquidStyle.replace(/  \/\* ---------- embedded preview: chrome off ----------[\s\S]*?(?=  \.row \{)/, "");

let hero = liquid.slice(liquid.indexOf('<div class="notice"'), liquid.indexOf('<script type="module">'));
hero = hero.replace(/<svg viewBox="0 0 515 692"[\s\S]*?<\/svg>/, logo);
hero = hero.replace('<h1 class="headline">', '<h1 class="headline" id="gateway-title">');
hero = hero.replace('<p class="label">HENKAKU<br />COMMUNITY</p>', '<p class="label"><a href="/#home" target="_top">HENKAKU<br />COMMUNITY</a></p>');
hero = hero.replace(/<ul>[\s\S]*?<\/ul>/, `<ul>
  <li><a href="/#setup" target="_top">WALLET SETUP</a></li>
  <li><a href="/#journey" target="_top">BEGIN INITIATION</a></li>
  <li><a href="/#community" target="_top">COMMUNITY</a></li>
  <li><a href="/#passport" target="_top">MY PASSPORT</a></li>
</ul>`);
hero = hero.replace('PEOPLE<br />IDEAS<br />SYSTEMS<br />FUTURES', 'QUESTS<br />ANSWERS<br />PROGRESS');
hero = hero.replace('SHARED OWNERSHIP<br />TRANSPARENT SYSTEMS<br />DISTRIBUTED IMPACT', 'ALLOWLIST<br />TOKEN DISTRIBUTION');
hero = hero.replace('BUILD<br />CONNECT<br />ITERATE<br />EVOLVE', 'CHECK-IN<br />ACTIVITY');
hero = hero.replace('CO-CREATE THE FUTURE', '<a href="/#home" target="_top">ENTER PORTAL →</a>');

const panelStart = hero.indexOf('<div class="panelbox"');
const panel = hero.slice(panelStart);
hero = hero.slice(0, panelStart);
let liquidModule = liquid.match(/<script type="module">([\s\S]*?)<\/script>/)[1];

return `<!doctype html>
<!-- Liquid reference, with local replay/teardown fixes. See CREDITS.md. -->
<html lang="ja"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="robots" content="noindex,nofollow"/><title>HENKAKU Intro</title>
<style>${liquidStyle}</style><style>${introShell}</style></head><body>
${hero}${panel}
<script type="module">${liquidModule}</script>
</body></html>`;
}
