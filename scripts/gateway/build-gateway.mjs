// Assemble the requested source-based Gateway. No network requests at build time.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildBubbleIntro } from "./build-bubble-intro.mjs";
import { buildEncryptedIntro } from "./build-encrypted-intro.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const bubbleSource = read("assets/reference/gateway/bubble-multi.html");
const gateway = read("assets/reference/gateway/gateway-v1-claude.html");
const styleOf = (html) => html.match(/<style>([\s\S]*?)<\/style>/)[1];

let gatewayStyle = styleOf(gateway);
gatewayStyle = gatewayStyle.replace(/  \/\* ---------- 00 GATEWAY:[\s\S]*?(?=  \/\* ---------- 02 VOICES:)/, "");
gatewayStyle = gatewayStyle.replace(/  \/\* ---------- the hero on a phone ----------[\s\S]*?(?=\n  \.placeholder-section \{)/, "");
const logo = '<svg viewBox="0 0 48 60" aria-hidden="true"><path d="M0 0 L48 37 L19 37 L0 60 Z" fill="currentColor" /></svg>';
let sections = gateway.slice(gateway.indexOf('  <section class="gateway-section placeholder-section"'), gateway.indexOf('</main>'));
sections = sections.replace(/<svg viewBox="0 0 515 692"[\s\S]*?<\/svg>/g, logo);
sections = sections.replace('href="index.html" data-app-href="/setup"', 'href="/#setup" target="_top"');
sections = sections.replace('href="/initiation"', 'href="/#journey" target="_top"');
sections = sections.replace('第2段階で、最近動いているプロジェクト、投稿、クエスト、Check-in を短いカードとして順に現れる構成へ差し替えます。', 'コミュニティの入口を、みんなでつくる。');
sections = sections.replace('第2段階で、権利確認前の抽象プレースホルダーを使い、3〜5曲の再生ログを個人情報なしで表示します。', '世界のどこかで聴かれている音楽から、次の一曲に出会う。');
sections = sections.replace('aria-label="Community Pulse placeholder"', 'aria-label="最近のプロジェクト、投稿、クエスト、Check-in"');
sections = sections.replace(/[ \t]*<p class="microcopy">縦スクロールの途中で、場面だけが横へ流れる比較用セクションです。音声の自動再生は行いません。<\/p>\n/, '');
// Keep the source's four abstract scenes without constructing or loading embedded players.
sections = sections.replace(/<div class="placeholder-grid" aria-label="Recently played placeholder">[\s\S]*?<div class="placeholder-list" data-track-list><\/div>\s*<\/div>/, `<p class="frequency-summary">ListenBrainz / WEEKLY TOP TRACKS <span data-frequency-period></span></p>
          <p class="frequency-status" data-frequency-status role="status">音楽ランキングを取得中…</p>
          <ol class="frequency-list" data-track-list aria-label="ListenBrainzの週間音楽ランキング" aria-busy="true"></ol>
          <button class="frequency-retry" data-frequency-retry type="button" hidden>もう一度取得</button>
          <p class="frequency-disclaimer">ListenBrainz全体の公開ランキングです。<a href="https://listenbrainz.org/statistics/?range=week" target="_blank" rel="noopener noreferrer">ListenBrainzで見る ↗</a><br />（将来的にはコミュニティメンバーが聞いている曲が共有されるかも！？）</p>
          <noscript>音楽ランキングの表示にはJavaScriptが必要です。ListenBrainzのリンクから確認できます。</noscript>`);
sections = sections.replace('aria-label="Podcast placeholder"', 'aria-label="Joi Itoのポッドキャスト紹介"');
sections = sections.replace('<div class="placeholder-list" data-podcast-card></div>', '<div class="placeholder-list" data-podcast-card></div><p class="podcast-source"><a href="https://joi.ito.com/podcast/" target="_blank" rel="noopener noreferrer">公式サイトで番組を聴く ↗</a><span>紹介文：公式情報をもとに編集</span></p>');
sections = sections.replace('<div class="placeholder-grid" aria-label="最近のプロジェクト、投稿、クエスト、Check-in">\n            <div class="media-block" aria-hidden="true"></div>', '<div class="placeholder-grid pulse-grid" aria-label="最近のプロジェクト、投稿、クエスト、Check-in">');
sections = sections.replace('aria-label="最近のプロジェクト、投稿、クエスト、Check-in"', 'aria-label="本家リポジトリの重要な未解決Issue"');
sections = sections.replace('<div class="placeholder-grid pulse-grid"', '<p class="pulse-development-note">開発中のため、本家リポジトリの未解決Issueから4件を紹介しています。<small>2026年9月9日確認 · 検討・検証中の内容を含みます。</small></p><div class="placeholder-grid pulse-grid"');

const inlineScroll = gateway.match(/<script>\s*const root = document.documentElement;([\s\S]*?)<\/script>/)[1];
let scrollCode = 'const root = document.documentElement;' + inlineScroll;
scrollCode = scrollCode.replace('function card({ label, title, detail })', 'function card({ label, title, detail, href })');
scrollCode = scrollCode.replace('const item = document.createElement("div");', 'const item = document.createElement(href ? "a" : "div");\n    if (href) { item.href = href; item.target = href.startsWith("/#") ? "_top" : "_blank"; item.rel = "noopener noreferrer"; }');
scrollCode = scrollCode.replace(/    const trackList = document.querySelector\("\[data-track-list\]"\);[\s\S]*?\n  }/, '  }');
scrollCode = scrollCode.replace('title: window.gatewayMock.podcast.title,', 'title: window.gatewayMock.podcast.title,\n      href: window.gatewayMock.podcast.href,');
// Each Pulse card enters separately while its section is pinned.
scrollCode += `\n
const pulseSection = document.querySelector('[data-gateway-section="01-community-pulse"]');
const pulseCards = [...document.querySelectorAll('[data-pulse-list] .placeholder-card')];
function updatePulseCards() {
  const progress = reduceMotion.matches ? 1 : Math.min(1, 0.35 + progressFor(pulseSection) * 0.8);
  pulseCards.forEach((item, index) => item.style.setProperty('--card-progress', String(Math.min(1, Math.max(0, (progress - index * 0.12) / 0.28)))));
}
window.addEventListener('scroll', updatePulseCards, { passive:true });
window.addEventListener('resize', updatePulseCards);
reduceMotion.addEventListener('change', updatePulseCards);
updatePulseCards();

// Let the owning app route Gateway links so previews remain inside /demo.
document.addEventListener('click', (event) => {
  const link = event.target.closest?.('a[target="_top"]');
  if (!link || window.parent === window) return;
  const url = new URL(link.href, location.href);
  const routes = { home:'/', setup:'/setup', journey:'/initiation', community:'/community', passport:'/passport' };
  const destination = url.hash.slice(1) || Object.keys(routes).find((name) => routes[name] === url.pathname);
  if (url.origin !== location.origin || !Object.hasOwn(routes, destination)) return;
  event.preventDefault();
  window.parent.postMessage({ type:'henkaku:home:navigate', screen:destination }, location.origin);
});
`;

const adapters = `
/* Keep the homepage source composition and viewport math. */
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
@media(prefers-reduced-motion:reduce){[data-pulse-list] .placeholder-card{opacity:1;transform:none}}
@media(max-width:820px){.pulse-grid .placeholder-list{grid-template-columns:1fr;gap:6px}}
`;

const homeShell = read("assets/reference/gateway/home-shell.css");
const homeTheme = read("assets/reference/gateway/home-theme.js");
const podcastStyles = read("assets/reference/gateway/podcast.css");
const bubbleShell = read("assets/reference/gateway/bubble-intro-shell.css");
sections = sections.replace('<h2 class="section-title" id="pulse-title">COMMUNITY PULSE</h2>', '<h1 class="section-title" id="pulse-title">COMMUNITY PULSE</h1>');
const introHtml = buildBubbleIntro({ source: bubbleSource, shell: bubbleShell, logo });
const encryptedIntroHtml = buildEncryptedIntro({
  liquid: read("assets/reference/gateway/archive/encrypted-intro/liquid.html"),
  introShell: read("assets/reference/gateway/archive/encrypted-intro/intro-shell.css"),
  logo,
});
const html = `<!doctype html>
<!-- The four source chapters form the homepage; the multiple-bubble intro lives in bubble-multi.html. -->
<html lang="ja" data-theme="light"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="robots" content="noindex,nofollow"/><title>HENKAKU Community</title>
<script>${homeTheme}</script>
<style>${gatewayStyle}</style><style>${adapters}</style><style>${homeShell}</style><style>${podcastStyles}</style></head><body>
<div class="home-intro">
  <p>いま、コミュニティで動いていること。</p><span>COMMUNITY GATEWAY / DEMO</span>
  <button type="button" class="home-replay">イントロを再生</button>
</div>
<main aria-label="HENKAKU トップページ">${sections}</main>
<script type="module" src="./gateway-v1-claude-decrypt.js"></script>
<script src="./gateway-data.js"></script><script>${scrollCode}
document.querySelector('.home-replay').addEventListener('click', () => window.parent.postMessage({ type:'henkaku:intro:replay' }, location.origin));
</script><script src="./frequency.js"></script></body></html>`;
fs.writeFileSync(path.join(root,"public/demo-assets/gateway/frequency.js"), read("assets/reference/gateway/frequency.js"));
fs.writeFileSync(path.join(root,"public/demo-assets/gateway/index.html"), html);
fs.writeFileSync(path.join(root,"public/demo-assets/gateway/bubble-multi.html"), introHtml);
fs.writeFileSync(path.join(root,"public/demo-assets/gateway/intro.html"), encryptedIntroHtml);

// The normal app shares the source artwork, with directly addressable routes.
// Frequency uses public music statistics and never reads a member's viewing history.
const applicationRoutes = { home: "/", setup: "/setup", journey: "/initiation", community: "/community", passport: "/passport" };
function applicationLinks(document) {
  for (const [screen, route] of Object.entries(applicationRoutes)) {
    document = document.replaceAll(`href="/#${screen}"`, `href="${route}"`);
  }
  // The encrypted reference intercepts clicks, so its dispatcher needs the same route mapping.
  return document.replace("const screen = url.hash.slice(1);", `const routes = ${JSON.stringify(applicationRoutes)};
        const screen = url.hash.slice(1) || Object.keys(routes).find((name) => routes[name] === url.pathname);`);
}
const applicationHome = applicationLinks(html)
  .replace("COMMUNITY GATEWAY / DEMO", "COMMUNITY GATEWAY")
  .replace("いま、コミュニティで動いていること。", "コミュニティの入口へ、ようこそ。");
fs.writeFileSync(path.join(root,"public/demo-assets/gateway/app-index.html"), applicationHome);
fs.writeFileSync(path.join(root,"public/demo-assets/gateway/app-bubble-multi.html"), applicationLinks(introHtml));
fs.writeFileSync(path.join(root,"public/demo-assets/gateway/app-intro.html"), applicationLinks(encryptedIntroHtml));
