// Adapt the saved multi-bubble reference without changing its source file.
// This builder is pure: the caller owns reading references and writing output.

function replaceOnce(value, search, replacement, label) {
  const first = value.indexOf(search);
  if (first < 0 || value.indexOf(search, first + search.length) >= 0) {
    throw new Error(`Bubble intro reference changed: ${label}`);
  }
  return value.slice(0, first) + replacement + value.slice(first + search.length);
}

const link = (screen, text) =>
  `<a href="/#${screen}" target="_top" data-intro-screen="${screen}">${text}</a>`;

const lifecycle = String.raw`
// All input belongs to this iframe and can be retired together.
const resizeObserver = new ResizeObserver(() => {
  if (!stopped) relayout();
});
resizeObserver.observe(stage);

const intersectionObserver = new IntersectionObserver((entries) => {
  if (stopped) return;
  onStage = entries[entries.length - 1]?.isIntersecting ?? true;
  if (onStage) wake();
  else pauseFrames();
});
intersectionObserver.observe(stage);

function pauseFrames() {
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  running = false;
  rollLast = 0;
}

function stopIntro() {
  if (stopped) return;
  stopped = true;
  onStage = false;
  pointerHere = false;
  pauseFrames();
  input.abort();
  resizeObserver.disconnect();
  intersectionObserver.disconnect();
  lens?.destroy();
  plateReady = false;
  for (const canvas of [plate, markPlate, flatPlate, lens2d, lens3d]) {
    canvas.width = canvas.height = 1;
  }
}

stage.addEventListener("pointermove", (event) => {
  if (stopped || mode !== "gl") return;
  const box = stage.getBoundingClientRect();
  pointerTarget.x = event.clientX - box.left;
  pointerTarget.y = event.clientY - box.top;
  if (!pointerHere) settleTail(pointerTarget.x, pointerTarget.y);
  pointerHere = true;
  wake();
}, { passive: true, signal: input.signal });

stage.addEventListener("pointerleave", () => {
  if (stopped) return;
  pointerHere = false;
  wake();
}, { passive: true, signal: input.signal });

function environmentChanged() {
  if (stopped) return;
  updateReadout();
  applyMode();
}
motionQuery.addEventListener("change", environmentChanged, { signal: input.signal });
pointerQuery.addEventListener("change", environmentChanged, { signal: input.signal });
document.addEventListener("visibilitychange", () => {
  if (stopped) return;
  if (document.hidden) pauseFrames();
  else wake();
}, { signal: input.signal });

// A font promise may finish after the parent has already removed the intro.
if (document.fonts?.ready) {
  document.fonts.ready.then(() => {
    if (!stopped) relayout();
  }, () => {});
}

for (const button of document.querySelectorAll(".panel button")) {
  button.addEventListener("click", () => {
    if (stopped) return;
    force = button.dataset.force;
    for (const other of document.querySelectorAll(".panel button")) {
      other.setAttribute("aria-pressed", String(other === button));
    }
    applyMode();
  }, { signal: input.signal });
}

// The anchors work on their own; only ordinary iframe clicks use the parent
// transition. Modified clicks keep the browser's normal link behavior.
document.addEventListener("click", (event) => {
  if (stopped || event.defaultPrevented || event.button !== 0 ||
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const anchor = event.target instanceof Element
    ? event.target.closest("a[data-intro-screen]") : null;
  if (!anchor || window.parent === window) return;
  const url = new URL(anchor.href, location.href);
  const screen = anchor.dataset.introScreen;
  if (url.origin !== location.origin || url.hash !== "#" + screen ||
      !["home", "setup", "journey", "community", "passport"].includes(screen)) return;
  try {
    if (window.parent.location.origin !== location.origin) return;
  } catch { return; }
  event.preventDefault();
  window.parent.postMessage({ type: "henkaku:intro:navigate", screen }, location.origin);
}, { signal: input.signal });

window.addEventListener("message", (event) => {
  if (event.source !== window.parent || event.origin !== location.origin) return;
  if (event.data?.type === "henkaku:intro:stop") stopIntro();
}, { signal: input.signal });
window.addEventListener("pagehide", stopIntro, { once: true, signal: input.signal });
`;

export function buildBubbleIntro({ source, shell, logo }) {
  if (![source, shell, logo].every((value) => typeof value === "string" && value.trim())) {
    throw new TypeError("Bubble intro requires source, shell, and logo strings");
  }
  const style = source.match(/<style>([\s\S]*?)<\/style>/)?.[1];
  let introScript = source.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
  const body = source.match(/<body>([\s\S]*?)<script type="module">/)?.[1];
  if (!style || !introScript || !body) throw new Error("Bubble intro reference is incomplete");

  let hero = body.replace(/<p class="hint">[\s\S]*?<\/p>/g, "");
  hero = hero.replace(/<svg viewBox="0 0 515 692"[\s\S]*?<\/svg>/, () => logo);
  hero = replaceOnce(hero, '<p class="label">HENKAKU<br />COMMUNITY</p>',
    `<p class="label">${link("home", "HENKAKU<br />COMMUNITY")}</p>`, "home brand");
  hero = replaceOnce(hero, '<h1 class="headline">',
    '<h1 class="headline" id="gateway-title">', "hero title");
  hero = hero.replace(/<ul>[\s\S]*?<\/ul>/, `<ul aria-label="参加とコミュニティのメニュー">
  <li>${link("setup", "WALLET SETUP")}</li>
  <li>${link("journey", "BEGIN INITIATION")}</li>
  <li>${link("community", "COMMUNITY")}</li>
  <li>${link("passport", "MY PASSPORT")}</li>
</ul>`);
  hero = replaceOnce(hero, "PEOPLE<br />IDEAS<br />SYSTEMS<br />FUTURES",
    "QUESTS<br />ANSWERS<br />PROGRESS", "quest caption");
  hero = replaceOnce(hero, "SHARED OWNERSHIP<br />TRANSPARENT SYSTEMS<br />DISTRIBUTED IMPACT",
    "ALLOWLIST<br />TOKEN DISTRIBUTION", "application caption");
  hero = replaceOnce(hero, "BUILD<br />CONNECT<br />ITERATE<br />EVOLVE",
    "CHECK-IN<br />ACTIVITY", "activity caption");
  hero = replaceOnce(hero, "CO-CREATE THE FUTURE", link("home", "ENTER PORTAL →"), "portal entry");
  hero = replaceOnce(hero, '<details class="panel" id="panel" open>',
    '<details class="panel" id="panel">', "collapsed display panel");
  hero = replaceOnce(hero, "<summary>環境と表示の状態</summary>",
    "<summary>表示モード</summary>", "display panel label");

  const patch = (search, replacement, label) => {
    introScript = replaceOnce(introScript, search, replacement, label);
  };
  patch('const lens3d = document.getElementById("lens3d");',
    'const lens3d = document.getElementById("lens3d");\nlet stopped = false;\nconst input = new AbortController();',
    "lifecycle ownership");
  patch("let rollShift = 0;", "let rollShift = 0;\nlet markClip = { x: 0, y: 0, width: 0, height: 0 };", "wordmark clip state");
  patch('  const cell = content.querySelector(".wordmark");', `  const cell = content.querySelector(".wordmark");
  const clip = cell.getBoundingClientRect();
  markClip = { x: clip.left - origin.left, y: clip.top - origin.top, width: clip.width, height: clip.height };`,
  "wordmark clip measurement");
  // Resolve currentColor on the supplied logo using the same computed fill as
  // the real SVG, rather than the canvas element's unrelated inherited color.
  patch('const fill = path.getAttribute("fill") || getComputedStyle(path).fill;',
    'const fill = getComputedStyle(path).fill || path.getAttribute("fill");', "logo paint color");

  // Clip after composing the moving wordmark. Clipping its original texture
  // before wrapping would erase letters that should roll into view later.
  patch("uniform vec2  uRes;", "uniform vec4 uMarkClip; // top-down pixel bounds of the graphic cell\nuniform vec2  uRes;", "GL clip uniform");
  patch("  return mix(base, mark.rgb, mark.a);", `  float x = uv.x * uRes.x;
  float inside = step(uMarkClip.x, x) * step(uMarkClip.y, y)
    * (1.0 - step(uMarkClip.x + uMarkClip.z, x))
    * (1.0 - step(uMarkClip.y + uMarkClip.w, y));
  return mix(base, mark.rgb, mark.a * inside);`, "GL wordmark clipping");
  patch("      gl.uniform1f(u.uMarkTop, rollTop * dpr);", `      gl.uniform1f(u.uMarkTop, rollTop * dpr);
      gl.uniform4f(u.uMarkClip, markClip.x * dpr, markClip.y * dpr, markClip.width * dpr, markClip.height * dpr);`, "GL clip upload");
  patch("  flatCtx.drawImage(plate, 0, 0);", `  flatCtx.drawImage(plate, 0, 0);
  flatCtx.save();
  flatCtx.beginPath();
  flatCtx.rect(markClip.x * dpr, markClip.y * dpr, markClip.width * dpr, markClip.height * dpr);
  flatCtx.clip();`, "2D wordmark clipping");
  patch("    flatCtx.drawImage(markPlate, 0, 0); // not rolling, but still needed back",
    "    flatCtx.drawImage(markPlate, 0, 0); // not rolling, but still needed back\n    flatCtx.restore();", "2D static clip restore");
  patch("    flatCtx.drawImage(markPlate, 0, (rollShift + k * rollPeriod) * dpr);\n  }\n  return flatPlate;",
    "    flatCtx.drawImage(markPlate, 0, (rollShift + k * rollPeriod) * dpr);\n  }\n  flatCtx.restore();\n  return flatPlate;", "2D rolling clip restore");

  patch("  if (!gl || gl.isContextLost()) return null;", `  if (!gl || gl.isContextLost()) return null;
  const owned = { shaders: [], programs: [], buffers: [], textures: [] };
  let released = false;
  function release() {
    if (released) return;
    released = true;
    gl.useProgram(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    for (const unit of [gl.TEXTURE0, gl.TEXTURE1]) {
      gl.activeTexture(unit);
      gl.bindTexture(gl.TEXTURE_2D, null);
    }
    for (const texture of owned.textures) gl.deleteTexture(texture);
    for (const buffer of owned.buffers) gl.deleteBuffer(buffer);
    for (const program of owned.programs) gl.deleteProgram(program);
    for (const shader of owned.shaders) gl.deleteShader(shader);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }`, "owned GPU resources");
  patch("    const sh = gl.createShader(type);", "    const sh = gl.createShader(type);\n    if (!sh) return null;", "shader allocation failure");
  patch('      console.error("bubble shader:", gl.getShaderInfoLog(sh));',
    '      console.error("bubble shader:", gl.getShaderInfoLog(sh));\n      gl.deleteShader(sh);', "failed shader release");
  patch("    return sh;", "    owned.shaders.push(sh);\n    return sh;", "shader ownership");
  patch("  if (!vs || !fs) return null;", "  if (!vs || !fs) { release(); return null; }", "compile failure release");
  patch("  const prog = gl.createProgram();", "  const prog = gl.createProgram();\n  if (!prog) { release(); return null; }\n  owned.programs.push(prog);", "program ownership");
  patch('    console.error("bubble link:", gl.getProgramInfoLog(prog));',
    '    console.error("bubble link:", gl.getProgramInfoLog(prog));\n    release();', "link failure release");
  patch("  const quad = gl.createBuffer();", "  const quad = gl.createBuffer();\n  if (!quad) { release(); return null; }\n  owned.buffers.push(quad);", "buffer ownership");
  patch("    const tex = gl.createTexture();", "    const tex = gl.createTexture();\n    if (!tex) return null;\n    owned.textures.push(tex);", "texture ownership");
  patch("  const markTex = makeTexture();", "  const markTex = makeTexture();\n  if (!tex || !markTex) { release(); return null; }", "texture failure release");
  patch("    markPlateDirty() { plateDirty = true; },", "    destroy: release,\n    markPlateDirty() { if (!released && !stopped) plateDirty = true; },", "lens teardown export");
  for (const signature of ["    resize() {", "    clear() {", "    draw(spheres, count, time) {"]) {
    patch(signature, signature + "\n      if (released || stopped) return;", "retired lens " + signature.trim());
  }
  patch('  if (mode !== "gl" || !lens || !onStage) { running = false; return; }',
    '  if (stopped || document.hidden || mode !== "gl" || !lens || !onStage) { running = false; return; }', "stopped frame guard");
  patch('  if (running || mode !== "gl") return;',
    '  if (stopped || document.hidden || !onStage || running || mode !== "gl") return;', "stopped wake guard");
  for (const name of ["measureRadius", "paintPlate", "applyRoll", "applyMode", "relayout"]) {
    patch(`function ${name}() {`, `function ${name}() {\n  if (stopped) return;`, "stopped " + name + " guard");
  }
  const inputStart = introScript.indexOf("/* ---------- input ---------- */");
  const inputEnd = introScript.indexOf("function updateReadout() {", inputStart);
  if (inputStart < 0 || inputEnd < inputStart) throw new Error("Bubble intro input boundary changed");
  introScript = introScript.slice(0, inputStart) + lifecycle + "\n" + introScript.slice(inputEnd);

  return `<!doctype html>
<!-- Multi-bubble reference with local navigation, viewport, clipping, and lifecycle adapters. -->
<html lang="ja"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex,nofollow" /><title>HENKAKU Intro</title>
<style>${style}</style><style>${shell}</style></head><body>
${hero}
<script type="module">${introScript}</script>
</body></html>`;
}
