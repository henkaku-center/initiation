// ABOUTME: Keeps the threshold card enciphered until it is reached, then decrypts it.
// ABOUTME: Plain DOM characters, so it runs wherever scripts run and needs no canvas.

/* Written from scratch rather than ported. The DecryptReveal on the earlier hero
   study is a canvas-ui component that draws the type into a canvas and runs a
   shader over it — a lot of machinery, and a lot of ways to render nothing, for
   a handful of short lines. This does the same trick with the letters
   themselves: the text in the DOM stays the text, and only the characters that
   have not landed yet are swapped for noise.

   What that buys, and why it is worth not reusing the existing file:

     - No WebGL, no canvas, no 2D context, no shader to fail to compile. The
       only thing it needs is the ability to set textContent.
     - The markup already holds the real words, so this can only ever scramble
       them and never has to supply them. With the script blocked, or with less
       motion asked for, the card simply reads.
     - The type stays real, selectable text rather than becoming a picture of
       text, so it can still be copied, translated and zoomed.
     - It is our own code, so it carries none of the Commons Clause condition
       that the ported components do.

   The card stays enciphered for the whole of the page and breaks in the last
   chapter, as it rises into the panel and 04's gradient goes black behind it.
   What the reader gets is noise for the whole way down and a card that reads
   itself out on the climb, rather than one that is still working once the
   scrolling has stopped. Scroll back up and it enciphers itself again — this
   is a prototype meant to be looked at more than once. */

/* Letters and symbols for the words. The frame gets its own set: random letters
   sitting where a border should be read as debris, where box-drawing pieces read
   as a frame still finding its shape. */
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+<>/\\:;=?@[]^_|~";
const FRAME_GLYPHS = "─│┌┐└┘├┤┬┴┼╱╲+*=:·.";

/* Half the page's 0.7s, and half its 0.08s between lines. Matching the page
   exactly is what these were before, and it was the right instinct for a card
   that resolved sitting still: the settle read as one more of the page's own
   transitions. It resolves on the way up now, with the reader still scrolling,
   and against that a 0.7s settle is something you arrive after rather than
   something you watch happen. So the card is given the page's rhythm at double
   speed rather than a rhythm of its own.

   The noise is refreshed on its own slower clock — rerolling every frame reads
   as a flicker rather than as something being worked out. The cap keeps the
   frame, which is thousands of characters long, from taking most of a minute. */
const SETTLE = 380;
const STAGGER = 45;
const REROLL = 50;
const LONGEST = 850;

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

function pick(set) {
  return set[(Math.random() * set.length) | 0];
}

/* ------------------------------------------------------------------ *
 * The frame
 *
 * The card's border is drawn as characters so that it can be enciphered
 * along with everything inside it. It is built from measurements rather
 * than hard-coded, and if the measuring comes back nonsense the CSS
 * border stays and the frame is simply never added.
 * ------------------------------------------------------------------ */

function buildFrame(frame, gate) {
  const box = gate.getBoundingClientRect();
  if (!box.width || !box.height) return false;

  // One monospace cell, measured rather than assumed: the font stack differs
  // between platforms and a guess would leave the frame short or overflowing.
  const probe = document.createElement("span");
  probe.textContent = "0".repeat(20);
  probe.style.cssText = "position:absolute;visibility:hidden;white-space:pre";
  frame.append(probe);
  const cell = probe.getBoundingClientRect().width / 20;
  probe.remove();

  const leading = parseFloat(window.getComputedStyle(frame).lineHeight);
  if (!cell || !leading) return false;

  const cols = Math.max(8, Math.floor(box.width / cell));
  const rows = Math.max(5, Math.floor(box.height / leading));

  // Where the card's own divisions fall, so the frame can carry them across
  // instead of leaving hairlines behind to disagree with it.
  const seams = new Set();
  for (const child of gate.children) {
    if (child === frame) continue;
    const row = Math.round((child.offsetTop + child.offsetHeight) / leading);
    if (row > 0 && row < rows - 1) seams.add(row);
  }
  seams.delete(rows - 1);

  const run = (n, ch) => ch.repeat(Math.max(0, n));
  const lines = [];
  for (let row = 0; row < rows; row += 1) {
    if (row === 0) lines.push("┌" + run(cols - 2, "─") + "┐");
    else if (row === rows - 1) lines.push("└" + run(cols - 2, "─") + "┘");
    else if (seams.has(row)) lines.push("├" + run(cols - 2, "─") + "┤");
    else lines.push("│" + run(cols - 2, " ") + "│");
  }

  frame.textContent = lines.join("\n");
  return true;
}

/* ------------------------------------------------------------------ *
 * The cipher
 * ------------------------------------------------------------------ */

function mask(line) {
  if (line.masked) return;
  line.masked = true;

  /* The real string is put beside the element and the element itself taken out
     of the accessibility tree, so a screen reader that reaches the card while
     it is enciphered is never read the ciphertext. The frame is decoration and
     was never in the tree to begin with. */
  if (!line.decorative) {
    const shadow = document.createElement("span");
    shadow.className = "sr-only";
    shadow.textContent = line.text;
    line.el.after(shadow);
    line.el.setAttribute("aria-hidden", "true");
    line.shadow = shadow;
  }

  // Noise is not the same width as the word it stands in for, and a button that
  // shuffles its own width while resolving looks broken rather than encrypted.
  const width = line.el.getBoundingClientRect().width;
  if (width && !line.decorative) line.el.style.minWidth = `${width}px`;
}

function unmask(line) {
  line.el.textContent = line.text;
  line.el.removeAttribute("aria-hidden");
  line.el.style.minWidth = "";
  line.shadow?.remove();
  line.shadow = null;
  line.masked = false;
}

/* Whitespace never scrambles, so a line keeps its shape — and the frame keeps
   its hollow middle — while its characters are still unknown. */
function cipher(line, landed) {
  let out = "";
  for (let i = 0; i < line.text.length; i += 1) {
    const ch = line.text[i];
    out += i < landed || ch.trim() === "" ? ch : pick(line.glyphs);
  }
  line.el.textContent = out;
}

function freeze(lines) {
  for (const line of lines) {
    mask(line);
    line.landed = false;
    cipher(line, 0);
  }
}

function resolve(lines) {
  const opened = performance.now();
  let rolled = -Infinity;

  function step(now) {
    const elapsed = now - opened;
    const reroll = elapsed - rolled >= REROLL;
    if (reroll) rolled = elapsed;

    let working = false;

    for (const line of lines) {
      if (line.landed) continue;
      if (elapsed < line.start) { working = true; continue; }

      const progress = (elapsed - line.start) / line.span;
      if (progress >= 1) {
        line.landed = true;
        unmask(line);
        continue;
      }

      working = true;
      if (!reroll) continue;
      // The front sweeps left to right, and for the frame that means top-left
      // to bottom-right: everything behind it has landed, everything ahead of
      // it is still noise.
      cipher(line, Math.floor(progress * line.text.length));
    }

    if (working) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

/* ------------------------------------------------------------------ */

function collect(scope) {
  return Array.from(scope.querySelectorAll("[data-decrypt]")).map((el, index) => {
    const decorative = el.hasAttribute("data-decrypt-frame");
    const text = el.textContent;
    return {
      el,
      text,
      decorative,
      glyphs: decorative ? FRAME_GLYPHS : GLYPHS,
      // The frame goes first so the box is drawing itself while the words
      // inside it are still settling.
      start: decorative ? 0 : (index + 1) * STAGGER,
      // Longer lines get a little longer, so everything settles at roughly the
      // same rate rather than in the same wall-clock time.
      span: Math.min(LONGEST, Math.max(SETTLE, text.length * 26)),
      landed: true,
      masked: false,
    };
  });
}

function arm() {
  const scope = document.querySelector("[data-decrypt-scope]");
  if (!scope) return;

  /* Both of these leave the card exactly as the markup wrote it. Asked for less
     motion there is nothing to decrypt, and with no observer there is no way to
     tell when the card is being looked at — enciphering it then would risk
     leaving the way out unreadable, which is the one thing worth more than the
     effect. */
  if (reduced.matches) return;
  if (typeof IntersectionObserver !== "function") return;

  const frame = scope.querySelector("[data-decrypt-frame]");
  if (frame && buildFrame(frame, scope)) scope.classList.add("has-frame");

  const lines = collect(scope);
  if (!lines.length) return;

  // Enciphered straight away, before anything of it is on screen.
  freeze(lines);

  /* Measured against the foot of the document rather than against 04's own
     height — the chapter is sized differently on a phone, but running out of
     page means the same thing everywhere.

     This used to wait for the foot, and then for a third of a screen short of
     it. Both put the settle after the scrolling was over: the reader stopped,
     and only then did the card start working. The break has walked forward
     twice since, and this is where it ends up — not late in the last screen
     but early, while the card is still climbing into the middle of the panel.
     The reader watches it resolve on the way up and arrives to a card that
     already reads.

     Why it can sit this far out at all: the panel pins for only the last two
     thirds of a screen, so 0.65 is the whole of what a break "once the card is
     settled in place" could ever have. Past that the card is still rising, and
     what mattered then was not the card but what is behind it — which is why
     04's gradient now reaches black a fifth of the way down the chapter
     instead of a third. The dark arrives before the card does, so it has
     something to resolve out of. Higher up the screen the fade is still
     running, and 03's paper is still in the top of the frame: the card comes
     out of the dark while the page is still going dark around it, which is a
     different picture from the one this had when it broke at the foot, and the
     one that was chosen.

     The two distances are apart on purpose: coming back up has to travel
     meaningfully before the card enciphers again, or it would flicker on and
     off around a single point. At 1.2 the card is below the foot of the screen
     when it re-enciphers, so that is done out of sight. */
  const REVEAL = 0.85;
  const HIDE = 1.2;

  const chapter = scope.closest("[data-gateway-section]") || scope;
  let shown = false;
  let near = false;
  let queued = false;

  function check() {
    queued = false;
    const doc = document.documentElement;
    const scrolled = window.scrollY ?? doc.scrollTop ?? 0;
    const left = doc.scrollHeight - window.innerHeight - scrolled;
    const screens = left / Math.max(1, window.innerHeight);

    if (!shown && screens <= REVEAL) { shown = true; resolve(lines); }
    else if (shown && screens > HIDE) { shown = false; freeze(lines); }
  }

  function request() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(check);
  }

  /* Scroll is only worth listening to while the last chapter is somewhere on
     screen. Everywhere else on the page this costs nothing at all. */
  const watcher = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting === near) continue;
      near = entry.isIntersecting;
      if (near) {
        window.addEventListener("scroll", request, { passive: true });
        window.addEventListener("resize", request);
        check();
      } else {
        window.removeEventListener("scroll", request);
        window.removeEventListener("resize", request);
        if (shown) { shown = false; freeze(lines); }
      }
    }
  }, { threshold: 0 });

  watcher.observe(chapter);

  /* The frame is measured, so a change of width invalidates it. Rebuilding
     while it is enciphered would leave stale noise on screen, so the state is
     laid down again after. */
  if (frame && typeof ResizeObserver === "function") {
    let known = "";
    new ResizeObserver(() => {
      // Height as well as width: web fonts settle after first paint and take the
      // card's height with them, which a frame measured in rows has to follow.
      const box = scope.getBoundingClientRect();
      const size = `${Math.round(box.width)}x${Math.round(box.height)}`;
      if (size === known) return;
      known = size;
      scope.classList.remove("has-frame");
      if (!buildFrame(frame, scope)) return;
      scope.classList.add("has-frame");
      const line = lines.find((l) => l.decorative);
      if (!line) return;
      line.text = frame.textContent;
      if (!shown) cipher(line, 0);
    }).observe(scope);
  }
}

arm();
