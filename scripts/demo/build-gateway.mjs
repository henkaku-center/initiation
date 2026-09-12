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
sections = sections.replace('第2段階で、権利確認前の抽象プレースホルダーを使い、3〜5曲の再生ログを個人情報なしで表示します。', 'コミュニティの誰かが聴いた対話から、次の一回に出会う。');
sections = sections.replace('aria-label="Community Pulse placeholder"', 'aria-label="最近のプロジェクト、投稿、クエスト、Check-in"');
sections = sections.replace('縦スクロールの途中で、場面だけが横へ流れる比較用セクションです。音声の自動再生は行いません。', 'Joi Itoとゲストの対話から、ランダムな一場面。映像は無音で流れます。');
sections = sections.replace('<div class="voices-photo-stage" aria-label="Voices horizontal scene strip">', '<div class="podcast-toolbar"><span>JOI ITO’S PODCAST · SOUND OFF</span><button type="button" data-podcast-toggle aria-pressed="true">映像を無音で再開</button></div><div class="voices-photo-stage" aria-label="Joi Itoのポッドキャスト・無音プレビュー">');
const previewScenes = Array.from({ length: 4 }, (_, index) => `
                <figure class="voices-scene podcast-scene" data-podcast-scene aria-label="ポッドキャストの場面 ${index + 1}">
                  <div class="podcast-screen"><div data-podcast-player></div></div>
                  <figcaption>
                    <p class="podcast-scene-label" data-podcast-label>JOI ITO’S PODCAST</p>
                    <a data-podcast-link href="https://www.youtube.com/@joiito/podcasts" target="_blank" rel="noopener noreferrer">YouTubeでこの回を見る ↗</a>
                    <p class="podcast-status" data-podcast-status>無音プレビューを準備しています</p>
                  </figcaption>
                </figure>`).join("");
sections = sections.replace(/(<div class="voices-photo-track" data-photo-strip>)[\s\S]*?(?=\n              <\/div>\n            <\/div>)/, `$1${previewScenes}`);
// The moving strip belongs to the full-width panel, outside the text column.
sections = sections.replace(/(<div class="voices-photo-stage"[^>]*>[\s\S]*?\n              <\/div>\n            <\/div>)\n          <\/div>\n        <\/div>/, '</div>\n        </div>\n        $1');
sections = sections.replace(/<div class="placeholder-grid" aria-label="Recently played placeholder">[\s\S]*?<div class="placeholder-list" data-track-list><\/div>\s*<\/div>/, `<p class="frequency-summary">みんなの最近のプレイ履歴 <span>COMMUNITY PLAYS / MOCK</span></p>
          <ol class="frequency-list" data-track-list aria-label="コミュニティ全体の最近のプレイ履歴"></ol>
          <p class="frequency-disclaimer">リスナー・アイコン・再生時刻は架空のサンプルです。実際の視聴履歴ではありません。</p>`);
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
</script><script src="./listening-history.js"></script><script src="./podcast-preview.js"></script></body></html>`;
fs.writeFileSync(path.join(root,"public/demo-assets/gateway/index.html"), html);
fs.writeFileSync(path.join(root,"public/demo-assets/gateway/bubble-multi.html"), introHtml);
fs.writeFileSync(path.join(root,"public/demo-assets/gateway/intro.html"), encryptedIntroHtml);

// The normal app shares the source artwork, with directly addressable routes.
// Demo histories stay in the explicit demo documents only.
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
  .replace(/[ \t]*<section\b[^>]*data-gateway-section="03-frequency"[\s\S]*?<\/section>/, "")
  .replace('<script src="./listening-history.js"></script>', "")
  .replace("COMMUNITY GATEWAY / DEMO", "COMMUNITY GATEWAY")
  .replace("いま、コミュニティで動いていること。", "コミュニティの入口へ、ようこそ。");
fs.writeFileSync(path.join(root,"public/demo-assets/gateway/app-index.html"), applicationHome);
fs.writeFileSync(path.join(root,"public/demo-assets/gateway/app-bubble-multi.html"), applicationLinks(introHtml));
fs.writeFileSync(path.join(root,"public/demo-assets/gateway/app-intro.html"), applicationLinks(encryptedIntroHtml));
