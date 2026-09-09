// Assemble the requested source-based Gateway. No network requests at build time.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const liquid = read("assets/reference/gateway/liquid.html");
const gateway = read("assets/reference/gateway/gateway-v1-claude.html");
const styleOf = (html) => html.match(/<style>([\s\S]*?)<\/style>/)[1];

let gatewayStyle = styleOf(gateway);
gatewayStyle = gatewayStyle.replace(/  \/\* ---------- 00 GATEWAY:[\s\S]*?(?=  \/\* ---------- 02 VOICES:)/, "");
gatewayStyle = gatewayStyle.replace(/  \/\* ---------- the hero on a phone ----------[\s\S]*?(?=\n  \.placeholder-section \{)/, "");
let liquidStyle = styleOf(liquid).replace(/--(bg|ink|blue|rule)\b/g, "--liquid-$1");
liquidStyle = liquidStyle.replace(/  \/\* ---------- embedded preview: chrome off ----------[\s\S]*?(?=  \.row \{)/, "");

const logo = '<svg viewBox="0 0 48 60" aria-hidden="true"><path d="M0 0 L48 37 L19 37 L0 60 Z" fill="currentColor" /></svg>';
let hero = liquid.slice(liquid.indexOf('<div class="notice"'), liquid.indexOf('<script type="module">'));
hero = hero.replace(/<svg viewBox="0 0 515 692"[\s\S]*?<\/svg>/, logo);
hero = hero.replace('<h1 class="headline">', '<h1 class="headline" id="gateway-title">');
hero = hero.replace('<p class="label">HENKAKU<br />COMMUNITY</p>', '<p class="label"><a href="/#home" target="_top">HENKAKU<br />COMMUNITY</a></p>');
hero = hero.replace(/<ul>[\s\S]*?<\/ul>/, `<ul>
  <li><a href="/#setup" target="_top">WALLET SETUP</a></li>
  <li><a href="/#journey" target="_top">INITIATION</a></li>
  <li><a href="/#community" target="_top">COMMUNITY</a></li>
  <li><a href="/#community" target="_top">CHECK-IN</a></li>
  <li><a href="/#passport" target="_top">ALLOWLIST</a></li>
  <li><a href="/#passport" target="_top">HENKAKU</a></li>
  <li><a href="/#passport" target="_top">MY PASSPORT</a></li>
</ul>`);
hero = hero.replace('PEOPLE<br />IDEAS<br />SYSTEMS<br />FUTURES', 'CONNECT<br />SIGN IN<br />POLYGON<br />HENKAKU');
hero = hero.replace('SHARED OWNERSHIP<br />TRANSPARENT SYSTEMS<br />DISTRIBUTED IMPACT', 'INITIATION<br />ALLOWLIST APPLICATION<br />MEMBERSHIP');
hero = hero.replace('BUILD<br />CONNECT<br />ITERATE<br />EVOLVE', 'COMMUNITY<br />CHECK-IN<br />MY PASSPORT');
hero = hero.replace('CO-CREATE THE FUTURE', '<a href="/#journey" target="_top">BEGIN INITIATION →</a>');

const panelStart = hero.indexOf('<div class="panelbox"');
const panel = hero.slice(panelStart);
hero = hero.slice(0, panelStart);
let liquidModule = liquid.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
liquidModule = liquidModule.replace('card.addEventListener("click", (event) => {', 'card.addEventListener("click", (event) => {\n    if (event.target.closest?.("a")) return;');

let sections = gateway.slice(gateway.indexOf('  <section class="gateway-section placeholder-section"'), gateway.indexOf('</main>'));
sections = sections.replace(/<svg viewBox="0 0 515 692"[\s\S]*?<\/svg>/g, logo);
sections = sections.replace('href="index.html" data-app-href="/setup"', 'href="/#setup" target="_top"');
sections = sections.replace('href="/initiation"', 'href="/#journey" target="_top"');
sections = sections.replace('第2段階で、最近動いているプロジェクト、投稿、クエスト、Check-in を短いカードとして順に現れる構成へ差し替えます。', 'プロジェクト、投稿、クエスト、Check-in。コミュニティの動きを、短いカードで。');
sections = sections.replace('第2段階で、権利確認前の抽象プレースホルダーを使い、3〜5曲の再生ログを個人情報なしで表示します。', '4つの音のしるし。権利確認前の抽象プレースホルダーと、個人情報を含まない仮の再生ログです。');
sections = sections.replace('aria-label="Community Pulse placeholder"', 'aria-label="最近のプロジェクト、投稿、クエスト、Check-in"');
sections = sections.replace('aria-label="Recently played placeholder"', 'aria-label="個人情報を含まない4件の仮再生ログ"');
sections = sections.replace('<div class="placeholder-grid" aria-label="最近のプロジェクト、投稿、クエスト、Check-in">\n            <div class="media-block" aria-hidden="true"></div>', '<div class="placeholder-grid pulse-grid" aria-label="最近のプロジェクト、投稿、クエスト、Check-in">');

const inlineScroll = gateway.match(/<script>\s*const root = document.documentElement;([\s\S]*?)<\/script>/)[1];
let scrollCode = 'const root = document.documentElement;' + inlineScroll;
scrollCode = scrollCode.replace('function card({ label, title, detail })', 'function card({ label, title, detail, href, abstract })');
scrollCode = scrollCode.replace('const item = document.createElement("div");', 'const item = document.createElement(href ? "a" : "div");\n    if (href) { item.href = href; item.target = href.startsWith("/#") ? "_top" : "_blank"; item.rel = "noopener noreferrer"; }');
scrollCode = scrollCode.replace('item.className = "placeholder-card";', 'item.className = "placeholder-card";\n    if (abstract) item.dataset.abstract = abstract;');
scrollCode = scrollCode.replace('detail: track.artist,', 'detail: track.detail,\n      abstract: track.abstract,');
scrollCode = scrollCode.replace('title: window.gatewayMock.podcast.title,', 'title: window.gatewayMock.podcast.title,\n      href: window.gatewayMock.podcast.href,');
scrollCode = scrollCode.replace('scrollSections.forEach((section) => {\n      section.style.setProperty', 'scrollSections.forEach((section) => {\n      section.style.setProperty');
// Each Pulse card enters separately while its section is pinned.
scrollCode += `\n
const pulseSection = document.querySelector('[data-gateway-section="01-community-pulse"]');
const pulseCards = [...document.querySelectorAll('[data-pulse-list] .placeholder-card')];
function updatePulseCards() {
  const progress = reduceMotion.matches ? 1 : progressFor(pulseSection);
  pulseCards.forEach((item, index) => item.style.setProperty('--card-progress', String(Math.min(1, Math.max(0, (progress - index * 0.12) / 0.28)))));
}
window.addEventListener('scroll', updatePulseCards, { passive:true });
window.addEventListener('resize', updatePulseCards);
reduceMotion.addEventListener('change', updatePulseCards);
updatePulseCards();
`;

const adapters = `
/* Integration only: keep the two source compositions and their viewport math. */
.liquid-hero-section { min-height:0; color:var(--liquid-ink); background:var(--liquid-bg); }
.liquid-hero-section .hero { touch-action:pan-y; }
.arrow { color:#333; }
.label a,.gateway a,.bcol a { color:inherit; text-decoration:none; }
.gateway a:hover,.gateway a:focus-visible,.bcol a:hover { text-decoration:underline; text-underline-offset:4px; }
.panelbox { z-index:40; }
.panelbox .row { min-width:0; }
.panelbox .row label { font-size:12px; }
.placeholder-card { color:inherit; text-decoration:none; }
.pulse-grid { display:block; }
.pulse-grid .placeholder-list { grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(18px,3vw,38px); }
a.placeholder-card:hover,a.placeholder-card:focus-visible { color:var(--accent); outline-offset:4px; }
[data-pulse-list] .placeholder-card { opacity:calc(.18 + var(--card-progress,0)*.82); transform:translateX(calc((1 - var(--card-progress,0))*60px)); transition:opacity .16s linear,transform .16s linear; }
[data-pulse-list] .placeholder-card:focus-visible { opacity:1; transform:none; }
[data-track-list] .placeholder-card { position:relative; padding-left:68px; min-height:82px; }
[data-track-list] .placeholder-card::before { content:""; position:absolute; left:0; top:18px; width:48px; height:48px; border:1px solid #2228; background:repeating-linear-gradient(135deg,#1737ff 0 2px,transparent 2px 10px),#e3dcd0; }
[data-track-list] [data-abstract="02"]::before { background:radial-gradient(circle,#eee5d8 18%,#141414 19% 36%,#cab8a2 37% 44%,#141414 45%); }
[data-track-list] [data-abstract="03"]::before { background:conic-gradient(from 45deg,#1737ff,#f7f2e8,#141414,#f7f2e8,#1737ff); }
[data-track-list] [data-abstract="04"]::before { background:repeating-linear-gradient(0deg,#111 0 1px,transparent 1px 8px),repeating-linear-gradient(90deg,#111 0 1px,#dbd7ce 1px 8px); }
@media(prefers-reduced-motion:reduce){[data-pulse-list] .placeholder-card{opacity:1;transform:none}}
@media(max-width:820px){.pulse-grid .placeholder-list{grid-template-columns:1fr;gap:6px}}
`;

const html = `<!doctype html>
<!-- Adapted from henkaku-ui.vercel.app/liquid and gateway-v1-claude. See CREDITS.md and LICENSE-canvas-ui.txt. -->
<html lang="ja"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="robots" content="noindex,nofollow"/><title>HENKAKU Community Gateway</title>
<style>${gatewayStyle}</style><style>${liquidStyle}</style><style>${adapters}</style></head><body>
<p class="prototype-label">PUBLIC GATEWAY / DEMO</p>
<main aria-label="HENKAKU Community Gateway"><section class="gateway-section liquid-hero-section" data-gateway-section="00-gateway" aria-labelledby="gateway-title">${hero}</section>${sections}</main>
${panel}
<script type="module">${liquidModule}</script>
<script type="module" src="./gateway-v1-claude-decrypt.js"></script>
<script src="./gateway-data.js"></script><script>${scrollCode}</script>
</body></html>`;
fs.writeFileSync(path.join(root,"public/demo-assets/gateway/index.html"), html);
