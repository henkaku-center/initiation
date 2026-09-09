/*!
 * DecryptReveal — ported to vanilla JavaScript for the HENKAKU hero demo,
 * from canvas-ui (src/lib/DecryptReveal/DecryptRevealVanilla.ts), with local modifications.
 * https://github.com/DavidHDev/canvas-ui
 *
 * MIT + Commons Clause License Condition v1.0
 *
 * Copyright (c) 2026 David Haz
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, and distribute the Software **as part of
 * an application, website, or product**, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * ## Commons Clause Restriction
 *
 * You may use this Software, including for any commercial purpose, **so long as
 * you do not sell, sublicense, or redistribute the components themselves -
 * whether alone, in a bundle, or as a ported version.**
 *
 * ## No Warranty
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
const PRINTABLE_ASCII = Array.from(
  { length: 95 },
  (_, i) => String.fromCharCode(32 + i)
).join("");
const DEFAULTS = {
  radius: 400,
  softness: 0.5,
  cell: 10,
  aspect: 0.75,
  charset: PRINTABLE_ASCII,
  colored: 1,
  color: "#4ade80",
  brightness: 1,
  legibility: 1,
  contrast: 1,
  exposure: 1,
  scramble: 0.1,
  scrambleSpeed: 6,
  edgeWidth: 0.2,
  edgeFlicker: 1,
  edgeGlow: 2,
  edgeTint: 0.75,
  aberration: 10,
  passthrough: 0.15,
  threshold: 0.025,
  background: "#000000",
  smoothing: 0.2
};
const ATLAS_CELL = 64;
const ATLAS_PAD = 8;
const MAX_GLYPHS = 255;
const INNER_CIRCLES = [
  [0.28, 0.26],
  [0.72, 0.14],
  [0.28, 0.56],
  [0.72, 0.44],
  [0.28, 0.86],
  [0.72, 0.74]
];
const VERT = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main () {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;
const CELL_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uContent;
uniform sampler2D uShapes;
uniform vec2 uContentRes;
uniform vec2 uCellPx;
uniform int uGlyphCount;
uniform float uContrast;
uniform float uExposure;
uniform float uThreshold;
uniform vec3 uBg;

const vec2 INNER[6] = vec2[6](
  vec2(0.28, 0.26), vec2(0.72, 0.14),
  vec2(0.28, 0.56), vec2(0.72, 0.44),
  vec2(0.28, 0.86), vec2(0.72, 0.74)
);
const vec2 OUTER[10] = vec2[10](
  vec2(0.28, -0.2), vec2(0.72, -0.2),
  vec2(-0.22, 0.25), vec2(1.22, 0.25),
  vec2(-0.22, 0.5), vec2(1.22, 0.5),
  vec2(-0.22, 0.75), vec2(1.22, 0.75),
  vec2(0.28, 1.2), vec2(0.72, 1.2)
);
const vec2 RING[6] = vec2[6](
  vec2(1.0, 0.0), vec2(0.5, 0.8660254), vec2(-0.5, 0.8660254),
  vec2(-1.0, 0.0), vec2(-0.5, -0.8660254), vec2(0.5, -0.8660254)
);

vec2 cellBase;

vec4 fetchTap (vec2 p) {
  vec2 uv = p / uContentRes;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec4(0.0);
  return texture(uContent, uv);
}

vec4 sampleCircle (vec2 c) {
  vec2 middle = cellBase + c * uCellPx;
  float r = uCellPx.y * 0.161;
  vec4 acc = fetchTap(middle);
  for (int k = 0; k < 6; k++) acc += fetchTap(middle + RING[k] * r);
  return acc / 7.0;
}

float tapLevel (vec4 t) {
  vec3 straight = t.rgb / max(t.a, 1e-4);
  return dot(abs(straight - uBg), vec3(0.299, 0.587, 0.114)) * t.a;
}

float circleSig (vec4 acc) {
  return clamp(tapLevel(acc) * uExposure, 0.0, 1.0);
}

float dirContrast (float value, float ext) {
  float peak = max(value, ext);
  if (peak < 1e-4) return value;
  return pow(value / peak, uContrast) * peak;
}

void main () {
  cellBase = floor(gl_FragCoord.xy) * uCellPx;
  float v[6];
  vec3 colAcc = vec3(0.0);
  float alphaAcc = 0.0;
  for (int i = 0; i < 6; i++) {
    vec4 acc = sampleCircle(INNER[i]);
    v[i] = circleSig(acc);
    colAcc += acc.rgb;
    alphaAcc += acc.a;
  }
  float e[10];
  for (int i = 0; i < 10; i++) e[i] = circleSig(sampleCircle(OUTER[i]));
  v[0] = dirContrast(v[0], max(max(e[0], e[1]), max(e[2], e[4])));
  v[1] = dirContrast(v[1], max(max(e[0], e[1]), max(e[3], e[5])));
  v[2] = dirContrast(v[2], max(e[2], max(e[4], e[6])));
  v[3] = dirContrast(v[3], max(e[3], max(e[5], e[7])));
  v[4] = dirContrast(v[4], max(max(e[4], e[6]), max(e[8], e[9])));
  v[5] = dirContrast(v[5], max(max(e[5], e[7]), max(e[8], e[9])));
  float gm[6];
  for (int i = 0; i < 6; i++) gm[i] = 0.0;
  float levSum = 0.0;
  float inkLev = 0.0;
  vec3 inkCol = vec3(0.0);
  int nx = int(clamp(uCellPx.x, 6.0, 20.0));
  int ny = int(clamp(uCellPx.y, 8.0, 32.0));
  float fx = float(nx - 1);
  float fy = float(ny - 1);
  for (int gy = 0; gy < ny; gy++) {
    for (int gx = 0; gx < nx; gx++) {
      vec2 p = vec2(float(gx) / fx, float(gy) / fy);
      vec4 t = fetchTap(cellBase + p * uCellPx);
      float lev = tapLevel(t);
      int idx = (p.y < 0.41 ? 0 : (p.y < 0.71 ? 2 : 4)) + (p.x < 0.5 ? 0 : 1);
      gm[idx] = max(gm[idx], lev);
      levSum += lev;
      if (lev > inkLev) {
        inkLev = lev;
        inkCol = t.rgb / max(t.a, 1e-4);
      }
    }
  }
  inkLev *= uExposure;
  for (int i = 0; i < 6; i++)
    v[i] = max(v[i], clamp(gm[i] * uExposure, 0.0, 1.0));
  float peak = max(max(max(v[0], v[1]), max(v[2], v[3])), max(v[4], v[5]));
  vec3 avgCol = colAcc / max(alphaAcc, 1e-4);
  if (peak < uThreshold) {
    outColor = vec4(avgCol, 0.0);
    return;
  }
  float mean = levSum * uExposure / float(nx * ny);
  float sharp = inkLev / max(mean, 1e-4);
  float solid = smoothstep(uThreshold, uThreshold * 1.6, inkLev);
  float lift = smoothstep(1.5, 3.0, sharp) * solid;
  float lifted = mix(peak, 1.0, lift);
  for (int i = 0; i < 6; i++)
    v[i] = pow(min(v[i] / max(peak, 1e-4), 1.0), uContrast) * lifted;
  vec3 cellCol = mix(avgCol, inkCol, lift);
  int best = 0;
  float bestD = 1e9;
  for (int g = 0; g < uGlyphCount; g++) {
    float d = 0.0;
    for (int i = 0; i < 6; i++) {
      float diff = v[i] - texelFetch(uShapes, ivec2(i, g), 0).r;
      d += diff * diff;
    }
    if (d < bestD) {
      bestD = d;
      best = g;
    }
  }
  outColor = vec4(cellCol, float(best) / 255.0);
}`;
const MAIN_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uContent;
uniform sampler2D uCells;
uniform sampler2D uAtlas;
uniform vec2 uRes;
uniform float uDpr;
uniform vec2 uCellPx;
uniform vec2 uGrid;
uniform vec2 uAtlasGrid;
uniform vec2 uAtlasPad;
uniform vec2 uAtlasInner;
uniform int uGlyphCount;
uniform vec2 uPointer;
uniform float uActive;
uniform float uRadius;
uniform float uSoftness;
uniform float uColored;
uniform vec3 uColor;
uniform float uBrightness;
uniform float uLegibility;
uniform float uScramble;
uniform float uScrambleSpeed;
uniform float uEdgeWidth;
uniform float uEdgeFlicker;
uniform float uEdgeGlow;
uniform float uEdgeTint;
uniform float uAberration;
uniform float uPassthrough;
uniform vec3 uBg;
uniform float uTime;
uniform float uMaxX;
uniform float uCrisp;

float hash (vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec4 samp (vec2 p) {
  vec2 uv = p / uRes;
  uv = clamp(uv, vec2(0.001), vec2(uMaxX - 0.001, 0.999));
  return texture(uContent, uv);
}

void main () {
  vec2 pc = vec2(vUv.x, 1.0 - vUv.y) * uRes;
  if (pc.x > uMaxX * uRes.x) {
    outColor = vec4(0.0);
    return;
  }
  if (uCrisp > 0.5) {
    outColor = samp(pc);
    return;
  }

  float dist = length(pc - uPointer);
  float radius = max(uRadius, 1.0);
  float inner = radius * (1.0 - clamp(uSoftness, 0.02, 1.0));
  float e = (1.0 - smoothstep(inner, radius, dist)) * uActive;

  float bandW = max(radius * clamp(uEdgeWidth, 0.0, 1.0) * 0.5, 6.0);
  float bandD = dist - mix(inner, radius, 0.5);
  float ring = exp(-bandD * bandD / (2.0 * bandW * bandW)) * uActive;

  vec2 dir = (pc - uPointer) / max(dist, 1e-3);
  float ca = uAberration * ring;
  vec4 rC = samp(pc);
  vec3 real = vec3(samp(pc + dir * ca).r, rC.g, samp(pc - dir * ca).b);

  vec2 cellPos = pc * uDpr / uCellPx;
  vec2 cell = clamp(floor(cellPos), vec2(0.0), uGrid - 1.0);
  vec4 info = texelFetch(uCells, ivec2(cell), 0);
  float glyph = floor(info.a * 255.0 + 0.5);

  float rerollP = clamp(uScramble * 0.35 + ring * uEdgeFlicker, 0.0, 1.0);
  float speed = max(uScrambleSpeed, 0.001) * (1.0 + ring * 2.5);
  float ft = floor(uTime * speed);
  float swap = step(1.0 - rerollP, hash(cell * 3.3 + vec2(ft * 0.717, ft * 0.523)))
    * step(0.5, glyph);
  float pick = hash(cell + vec2(ft * 0.613, ft * 0.831));
  glyph = mix(glyph, floor(pick * float(uGlyphCount - 1)) + 1.0, swap);

  vec2 local = clamp(cellPos - cell, 0.0, 1.0);
  float gx = mod(glyph, uAtlasGrid.x);
  float gy = floor(glyph / uAtlasGrid.x);
  vec2 atlasUv = vec2(
    (gx + uAtlasPad.x + local.x * uAtlasInner.x) / uAtlasGrid.x,
    (gy + uAtlasPad.y + local.y * uAtlasInner.y) / uAtlasGrid.y
  );
  vec2 atlasStep = uAtlasInner / uAtlasGrid;
  float mask = textureGrad(
    uAtlas,
    atlasUv,
    dFdx(cellPos) * atlasStep,
    dFdy(cellPos) * atlasStep
  ).a * step(0.5, glyph);

  vec3 cellCol = info.rgb;
  vec3 lw = vec3(0.299, 0.587, 0.114);
  vec3 dev = cellCol - uBg;
  float mag = dot(abs(dev), lw);
  float target = clamp(uLegibility, 0.0, 1.0) * 0.75;
  float boost = clamp(target / max(mag, 0.01), 1.0, 32.0);
  vec3 vivid = clamp(uBg + dev * boost, 0.0, 1.0);
  float vividMag = dot(abs(vivid - uBg), lw);
  vec3 ink = mix(vec3(1.0), vec3(0.06), step(0.5, dot(uBg, lw)));
  vivid = mix(vivid, ink, clamp((target - vividMag) / max(target, 1e-3), 0.0, 1.0));
  float cellSig = clamp(mag * 1.6, 0.0, 1.0);
  vec3 mono = uColor * mix(0.35, 1.2, cellSig);
  vec3 glyphColor = mix(mono, vivid, clamp(uColored, 0.0, 1.0));
  glyphColor = clamp(uBg + (glyphColor - uBg) * uBrightness, 0.0, 1.0);
  float cellLum = dot(vivid, lw);
  glyphColor = mix(
    glyphColor,
    uColor * max(uBrightness, 1.0) * (0.6 + cellLum),
    ring * clamp(uEdgeTint, 0.0, 1.0)
  );
  glyphColor = clamp(
    uBg + (glyphColor - uBg) * (1.0 + ring * uEdgeGlow * 1.6),
    0.0,
    1.0
  );

  vec3 base = mix(uBg, real, clamp(uPassthrough, 0.0, 1.0));
  vec3 encrypted = mix(base, glyphColor, mask);
  vec3 col = mix(encrypted, real, e);
  float alpha = mix(max(rC.a, mask), rC.a, e);
  outColor = vec4(col, alpha);
}`;
let colorProbe = null;
function parseColor(input) {
  if (typeof document === "undefined") return [0, 0, 0];
  if (!colorProbe) {
    const probe = document.createElement("canvas");
    probe.width = 1;
    probe.height = 1;
    colorProbe = probe.getContext("2d", { willReadFrequently: true });
  }
  if (!colorProbe) return [0, 0, 0];
  colorProbe.fillStyle = "#000000";
  colorProbe.fillStyle = input;
  colorProbe.clearRect(0, 0, 1, 1);
  colorProbe.fillRect(0, 0, 1, 1);
  const data = colorProbe.getImageData(0, 0, 1, 1).data;
  return [data[0] / 255, data[1] / 255, data[2] / 255];
}
function buildGlyphList(charset) {
  const seen = /* @__PURE__ */ new Set([" "]);
  const glyphs = [" "];
  for (const ch of charset) {
    if (glyphs.length >= MAX_GLYPHS) break;
    if (ch === "\n" || ch === "\r" || ch === "	" || seen.has(ch)) continue;
    seen.add(ch);
    glyphs.push(ch);
  }
  return glyphs;
}
function glyphShapes(image, cols, cellW, cellH, count) {
  const vectors = new Float32Array(count * 6);
  const radius = cellH * 0.26;
  const padW = cellW + ATLAS_PAD * 2;
  const padH = cellH + ATLAS_PAD * 2;
  for (let g = 0; g < count; g++) {
    const originX = g % cols * padW + ATLAS_PAD;
    const originY = Math.floor(g / cols) * padH + ATLAS_PAD;
    for (let c = 0; c < 6; c++) {
      const cx = INNER_CIRCLES[c][0] * cellW;
      const cy = INNER_CIRCLES[c][1] * cellH;
      let sum = 0;
      let total = 0;
      for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
        for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
          const dx = x + 0.5 - cx;
          const dy = y + 0.5 - cy;
          if (dx * dx + dy * dy > radius * radius) continue;
          total += 1;
          if (x < -ATLAS_PAD || y < -ATLAS_PAD || x >= cellW + ATLAS_PAD || y >= cellH + ATLAS_PAD)
            continue;
          sum += image.data[((originY + y) * image.width + originX + x) * 4 + 3];
        }
      }
      vectors[g * 6 + c] = total ? sum / (total * 255) : 0;
    }
  }
  for (let c = 0; c < 6; c++) {
    let peak = 0;
    for (let g = 0; g < count; g++) {
      peak = Math.max(peak, vectors[g * 6 + c]);
    }
    if (peak > 0) {
      for (let g = 0; g < count; g++) vectors[g * 6 + c] /= peak;
    }
  }
  return vectors;
}
function clampAspect(aspect) {
  return Math.min(Math.max(aspect || DEFAULTS.aspect, 0.35), 1.25);
}
function supportsHtmlInCanvas() {
  if (typeof document === "undefined") return false;
  const probe = document.createElement("canvas");
  const ctx = probe.getContext("2d");
  return Boolean(
    ctx && typeof ctx.drawElementImage === "function" && typeof probe.requestPaint === "function"
  );
}
function createDecryptReveal(elements, options = {}) {
  const config = { ...DEFAULTS, ...options };
  // Local lifecycle fix: callbacks queued before destroy must become inert.
  let destroyed = false;
  const { source, content, output } = elements;
  const gl = output.getContext("webgl2", {
    alpha: true,
    depth: false,
    stencil: false,
    antialias: false,
    premultipliedAlpha: false
  });
  if (!gl || gl.isContextLost()) return null;
  const sourceCtx = source.getContext("2d");
  const paintable = source;
  // PATCH (henkaku demo): `forceSnapshot` pins the capture path, so a page
  // whose animation depends on how frames are composited behaves the same
  // everywhere instead of branching on an experimental API.
  const htmlInCanvas = !config.forceSnapshot && Boolean(
    sourceCtx && typeof sourceCtx.drawElementImage === "function" && typeof paintable.requestPaint === "function"
  );
  let contentDirty = false;
  let cellsDirty = true;
  let wake = () => {
  };
  // --- PATCH (henkaku demo): snapshot fallback ---------------------------
  // Upstream disables the effect entirely without the html-in-canvas API.
  // When a `paint(canvas, dpr)` callback is supplied we let the caller
  // rasterise the DOM itself, so the effect also runs in plain browsers.
  const manualPaint = !htmlInCanvas && typeof config.paint === "function";
  const effectActive = htmlInCanvas || manualPaint;
  let painted = false;
  let paintPending = false;
  let repaintQueued = false;
  function schedulePaint() {
    if (destroyed || !manualPaint) return;
    if (paintPending) {
      repaintQueued = true;
      return;
    }
    paintPending = true;
    Promise.resolve().then(() => {
      if (!destroyed) return config.paint(source, source.width / Math.max(source.clientWidth || output.clientWidth, 1));
    }).then(() => {
      if (destroyed) return;
      paintPending = false;
      painted = true;
      contentDirty = true;
      cellsDirty = true;
      wake();
      if (repaintQueued) {
        repaintQueued = false;
        schedulePaint();
      }
    }).catch(() => {
      if (destroyed) return;
      paintPending = false;
      repaintQueued = false;
    });
  }
  // --- END PATCH ---------------------------------------------------------
  if (htmlInCanvas) {
    paintable.onpaint = () => {
      if (destroyed) return;
      try {
        sourceCtx.reset();
        sourceCtx.drawElementImage(content, 0, 0);
        contentDirty = true;
        wake();
      } catch {
      }
    };
  }
  function compile(type, text) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, text);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(
        "DecryptReveal shader error:",
        gl.getShaderInfoLog(shader)
      );
    }
    return shader;
  }
  function link(frag) {
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, frag);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    const uniforms = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(program, i);
      uniforms[info.name] = gl.getUniformLocation(program, info.name);
    }
    return { program, vs, fs, uniforms };
  }
  const cellPass = link(CELL_FRAG);
  const mainPass = link(MAIN_FRAG);
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW
  );
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  function makeTexture(filter) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  }
  const contentTexture = makeTexture(gl.LINEAR);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([0, 0, 0, 0])
  );
  const cellTexture = makeTexture(gl.NEAREST);
  const cellFbo = gl.createFramebuffer();
  let cellCols = 0;
  let cellRows = 0;
  const shapeTexture = makeTexture(gl.NEAREST);
  const atlasTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, atlasTexture);
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    gl.LINEAR_MIPMAP_LINEAR
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  let glyphCount = 0;
  let atlasCols = 1;
  let atlasRows = 1;
  let atlasPad = [0, 0];
  let atlasInner = [1, 1];
  let builtCharset = "";
  let builtAspect = 0;
  function rebuildAtlas() {
    const aspect = clampAspect(config.aspect);
    if (builtCharset === config.charset && builtAspect === aspect) return;
    const glyphs = buildGlyphList(config.charset);
    const cellH = ATLAS_CELL;
    const cellW = Math.max(Math.round(cellH * aspect), 8);
    const padW = cellW + ATLAS_PAD * 2;
    const padH = cellH + ATLAS_PAD * 2;
    const cols = Math.ceil(Math.sqrt(glyphs.length));
    const rows = Math.ceil(glyphs.length / cols);
    const surface = document.createElement("canvas");
    surface.width = cols * padW;
    surface.height = rows * padH;
    const ctx = surface.getContext("2d");
    if (!ctx) return;
    builtCharset = config.charset;
    builtAspect = aspect;
    ctx.clearRect(0, 0, surface.width, surface.height);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const fontPx = Math.floor(Math.min(cellH * 0.92, cellW / 0.58));
    ctx.font = `600 ${fontPx}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
    for (let g = 0; g < glyphs.length; g++) {
      ctx.fillText(
        glyphs[g],
        g % cols * padW + padW / 2,
        Math.floor(g / cols) * padH + padH / 2
      );
    }
    const image = ctx.getImageData(0, 0, surface.width, surface.height);
    const vectors = glyphShapes(image, cols, cellW, cellH, glyphs.length);
    gl.bindTexture(gl.TEXTURE_2D, atlasTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      surface
    );
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, shapeTexture);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R32F,
      6,
      glyphs.length,
      0,
      gl.RED,
      gl.FLOAT,
      vectors
    );
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    glyphCount = glyphs.length;
    atlasCols = cols;
    atlasRows = rows;
    atlasPad = [ATLAS_PAD / padW, ATLAS_PAD / padH];
    atlasInner = [cellW / padW, cellH / padH];
    cellsDirty = true;
  }
  let contentMaxX = 1;
  function cellSizePx(dpr) {
    const h = Math.min(Math.max(config.cell, 4), 40) * dpr;
    return [h * clampAspect(config.aspect), h];
  }
  function syncCanvasSize() {
    if (destroyed) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(output.clientWidth * dpr));
    const height = Math.max(1, Math.round(output.clientHeight * dpr));
    if (output.width !== width || output.height !== height) {
      output.width = width;
      output.height = height;
    }
    contentMaxX = Math.min(
      1,
      Math.max(0.05, content.clientWidth / Math.max(output.clientWidth, 1))
    );
    if (htmlInCanvas) {
      const cssWidth = Math.max(1, Math.round(source.clientWidth));
      const cssHeight = Math.max(1, Math.round(source.clientHeight));
      if (source.width !== cssWidth * dpr || source.height !== cssHeight * dpr) {
        source.width = cssWidth * dpr;
        source.height = cssHeight * dpr;
      }
      paintable.requestPaint();
    }
    if (manualPaint) {
      if (source.width !== width || source.height !== height) {
        source.width = width;
        source.height = height;
        painted = false;
      }
      schedulePaint();
    }
    cellsDirty = true;
  }
  function syncCellGrid() {
    const dpr = output.width / Math.max(output.clientWidth, 1);
    const [cw, ch] = cellSizePx(dpr);
    const cols = Math.max(Math.ceil(output.width / cw), 1);
    const rows = Math.max(Math.ceil(output.height / ch), 1);
    if (cols === cellCols && rows === cellRows) return;
    cellCols = cols;
    cellRows = rows;
    gl.bindTexture(gl.TEXTURE_2D, cellTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      cols,
      rows,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, cellFbo);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      cellTexture,
      0
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    cellsDirty = true;
  }
  const pointer = {
    x: -1e5,
    y: -1e5,
    tx: -1e5,
    ty: -1e5,
    active: 0,
    target: 0
  };
  let time = 0;
  let bgKey = "";
  let bg = [0, 0, 0];
  let colorKey = "";
  let fg = [0.29, 0.87, 0.5];
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = motionQuery.matches;
  rebuildAtlas();
  syncCanvasSize();
  function uploadContent() {
    if (!effectActive || !contentDirty) return;
    contentDirty = false;
    cellsDirty = true;
    gl.bindTexture(gl.TEXTURE_2D, contentTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      source
    );
  }
  function renderCells() {
    if (!cellsDirty) return;
    cellsDirty = false;
    const dpr = output.width / Math.max(output.clientWidth, 1);
    const [cw, ch] = cellSizePx(dpr);
    const u = cellPass.uniforms;
    gl.useProgram(cellPass.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, contentTexture);
    gl.uniform1i(u.uContent, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, shapeTexture);
    gl.uniform1i(u.uShapes, 1);
    gl.uniform2f(u.uContentRes, output.width, output.height);
    gl.uniform2f(u.uCellPx, cw, ch);
    gl.uniform1i(u.uGlyphCount, glyphCount);
    gl.uniform1f(u.uContrast, Math.min(Math.max(config.contrast, 0.3), 3));
    gl.uniform1f(u.uExposure, Math.min(Math.max(config.exposure, 0.2), 3));
    gl.uniform1f(u.uThreshold, Math.max(config.threshold, 5e-3));
    gl.uniform3f(u.uBg, bg[0], bg[1], bg[2]);
    gl.bindFramebuffer(gl.FRAMEBUFFER, cellFbo);
    gl.viewport(0, 0, cellCols, cellRows);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  function render() {
    uploadContent();
    if (config.background !== bgKey) {
      bgKey = config.background;
      bg = parseColor(config.background);
      cellsDirty = true;
    }
    if (config.color !== colorKey) {
      colorKey = config.color;
      fg = parseColor(config.color);
    }
    rebuildAtlas();
    syncCellGrid();
    renderCells();
    const w = Math.max(output.clientWidth, 1);
    const h = Math.max(output.clientHeight, 1);
    const dpr = output.width / w;
    const [cw, ch] = cellSizePx(dpr);
    const u = mainPass.uniforms;
    gl.useProgram(mainPass.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, contentTexture);
    gl.uniform1i(u.uContent, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, cellTexture);
    gl.uniform1i(u.uCells, 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, atlasTexture);
    gl.uniform1i(u.uAtlas, 2);
    gl.uniform2f(u.uRes, w, h);
    gl.uniform1f(u.uDpr, dpr);
    gl.uniform2f(u.uCellPx, cw, ch);
    gl.uniform2f(u.uGrid, cellCols, cellRows);
    gl.uniform2f(u.uAtlasGrid, atlasCols, atlasRows);
    gl.uniform2f(u.uAtlasPad, atlasPad[0], atlasPad[1]);
    gl.uniform2f(u.uAtlasInner, atlasInner[0], atlasInner[1]);
    gl.uniform1i(u.uGlyphCount, glyphCount);
    gl.uniform2f(u.uPointer, pointer.x, pointer.y);
    gl.uniform1f(u.uActive, pointer.active);
    gl.uniform1f(u.uRadius, Math.max(config.radius, 1));
    gl.uniform1f(u.uSoftness, config.softness);
    gl.uniform1f(u.uColored, config.colored);
    gl.uniform3f(u.uColor, fg[0], fg[1], fg[2]);
    gl.uniform1f(u.uBrightness, Math.min(Math.max(config.brightness, 0.2), 3));
    gl.uniform1f(u.uLegibility, Math.min(Math.max(config.legibility, 0), 1));
    gl.uniform1f(u.uScramble, Math.min(Math.max(config.scramble, 0), 1));
    gl.uniform1f(
      u.uScrambleSpeed,
      Math.min(Math.max(config.scrambleSpeed, 0), 30)
    );
    gl.uniform1f(u.uEdgeWidth, config.edgeWidth);
    gl.uniform1f(u.uEdgeFlicker, Math.min(Math.max(config.edgeFlicker, 0), 1));
    gl.uniform1f(u.uEdgeGlow, Math.min(Math.max(config.edgeGlow, 0), 3));
    gl.uniform1f(u.uEdgeTint, config.edgeTint);
    gl.uniform1f(u.uAberration, Math.max(config.aberration, 0));
    gl.uniform1f(u.uPassthrough, config.passthrough);
    gl.uniform3f(u.uBg, bg[0], bg[1], bg[2]);
    gl.uniform1f(u.uTime, time);
    gl.uniform1f(u.uMaxX, contentMaxX);
    gl.uniform1f(u.uCrisp, reducedMotion || !effectActive || manualPaint && !painted ? 1 : 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, output.width, output.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  let raf = 0;
  let lastTime = performance.now();
  let running = false;
  let visible = true;
  function frame(now) {
    if (destroyed || contextLost) return;
    if (!visible) {
      running = false;
      return;
    }
    const delta = Math.min((now - lastTime) / 1e3, 1 / 30);
    lastTime = now;
    time += delta;
    const tau = Math.max(config.smoothing, 1e-4);
    const k = reducedMotion ? 1 : 1 - Math.exp(-delta / tau);
    pointer.x += (pointer.tx - pointer.x) * k;
    pointer.y += (pointer.ty - pointer.y) * k;
    pointer.active += (pointer.target - pointer.active) * k;
    render();
    const settled = Math.abs(pointer.tx - pointer.x) < 0.1 && Math.abs(pointer.ty - pointer.y) < 0.1 && Math.abs(pointer.target - pointer.active) < 1e-3;
    const churning = config.scramble > 0 && config.scrambleSpeed > 0 || pointer.active > 1e-3 && config.edgeFlicker > 0;
    if (settled && !contentDirty && (reducedMotion || !effectActive || !churning)) {
      pointer.x = pointer.tx;
      pointer.y = pointer.ty;
      pointer.active = pointer.target;
      running = false;
      return;
    }
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (destroyed || running || !visible) return;
    running = true;
    lastTime = performance.now();
    raf = requestAnimationFrame(frame);
  }
  wake = start;
  start();
  function onMotionChange() {
    reducedMotion = motionQuery.matches;
    start();
  }
  motionQuery.addEventListener("change", onMotionChange);
  // --- PATCH (henkaku demo): survive GPU context loss -------------------
  // Mobile Safari / Android Chrome drop the WebGL context under memory
  // pressure. Upstream only checks once at creation, so the canvas would
  // stay blank forever. Stop the loop and let the host restore plain DOM.
  let contextLost = false;
  function handleContextLost(event) {
    event.preventDefault();
    contextLost = true;
    running = false;
    cancelAnimationFrame(raf);
    if (typeof config.onContextLost === "function") {
      try {
        config.onContextLost();
      } catch {
      }
    }
  }
  output.addEventListener("webglcontextlost", handleContextLost);
  // --- END PATCH ---------------------------------------------------------
  const observer = new ResizeObserver(() => {
    syncCanvasSize();
    start();
  });
  observer.observe(output);
  observer.observe(content);
  const intersection = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1]?.isIntersecting ?? true;
    if (visible) start();
  });
  intersection.observe(output);
  const listenTarget = output.parentElement ?? output;
  function onPointerMove(event) {
    if (config.interactive === false) return;
    const rect = output.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (pointer.target === 0 && pointer.active < 1e-3) {
      pointer.x = x;
      pointer.y = y;
    }
    pointer.tx = x;
    pointer.ty = y;
    pointer.target = 1;
    start();
  }
  function onPointerLeave() {
    if (config.interactive === false) return;
    pointer.target = 0;
    start();
  }
  listenTarget.addEventListener("pointermove", onPointerMove, { passive: true });
  listenTarget.addEventListener("pointerleave", onPointerLeave, { passive: true });
  return {
    setOptions(next) {
      if (destroyed) return;
      let changed = false;
      for (const [key, value] of Object.entries(next)) {
        if (typeof value === "function") continue;
        if (config[key] !== value) {
          changed = true;
          break;
        }
      }
      if (!changed) {
        Object.assign(config, next);
        return;
      }
      const prev = {
        cell: config.cell,
        aspect: config.aspect,
        contrast: config.contrast,
        exposure: config.exposure,
        threshold: config.threshold
      };
      Object.assign(config, next);
      if (config.cell !== prev.cell || config.aspect !== prev.aspect || config.contrast !== prev.contrast || config.exposure !== prev.exposure || config.threshold !== prev.threshold) {
        cellsDirty = true;
      }
      start();
    },
    resize() {
      if (destroyed) return;
      syncCanvasSize();
      start();
    },
    // PATCH (henkaku demo): which capture path is live, and a manual re-capture.
    mode: htmlInCanvas ? "html-in-canvas" : manualPaint ? "snapshot" : "off",
    // PATCH (henkaku demo): drive the reveal circle from script (auto tour,
    // tap-to-expand) instead of only from a real cursor.
    setPointer(x, y, active) {
      if (destroyed) return;
      pointer.tx = x;
      pointer.ty = y;
      if (active !== void 0) pointer.target = active;
      start();
    },
    snapPointer(x, y) {
      if (destroyed) return;
      pointer.x = pointer.tx = x;
      pointer.y = pointer.ty = y;
      start();
    },
    isLost() {
      return contextLost;
    },
    repaint() {
      if (destroyed) return;
      painted = false;
      schedulePaint();
      start();
    },
    // PATCH (henkaku demo): re-capture for an animation frame. Unlike
    // repaint() it keeps `painted` true, so the shader never drops back to
    // the crisp fallback mid-motion.
    invalidate() {
      if (destroyed) return;
      schedulePaint();
      start();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      repaintQueued = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
      intersection.disconnect();
      motionQuery.removeEventListener("change", onMotionChange);
      output.removeEventListener("webglcontextlost", handleContextLost);
      listenTarget.removeEventListener("pointermove", onPointerMove);
      listenTarget.removeEventListener("pointerleave", onPointerLeave);
      gl.deleteTexture(contentTexture);
      gl.deleteTexture(cellTexture);
      gl.deleteTexture(shapeTexture);
      gl.deleteTexture(atlasTexture);
      gl.deleteFramebuffer(cellFbo);
      gl.deleteProgram(cellPass.program);
      gl.deleteShader(cellPass.vs);
      gl.deleteShader(cellPass.fs);
      gl.deleteProgram(mainPass.program);
      gl.deleteShader(mainPass.vs);
      gl.deleteShader(mainPass.fs);
      gl.deleteBuffer(quad);
      if (htmlInCanvas) paintable.onpaint = null;
    }
  };
}
export {
  createDecryptReveal,
  supportsHtmlInCanvas
};
