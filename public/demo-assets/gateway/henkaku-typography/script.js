// ABOUTME: 各単語の7文字を独立した行列で変形し、SVGで変革を描く。
// ABOUTME: 各単語の初期座標と変形値を保持し、開発用ガイドを切り替える。
const FONT = 'Times New Roman';

const strokes = [
  { kanji: 'hen', id: 'hen-01', path: 'M484 65 C479 39 518 44 561 65 C615 92 652 131 626 151 C598 168 534 150 493 145', min: 3, max: 10,
    words: [[500, 97, 131, 31, 11], [508, 125, 134, 32, 7], [492, 154, 145, 33, 4]] },
  { kanji: 'hen', id: 'hen-02', words: [
    [190, 205, 110, 34, -8], [304, 197, 124, 37, -2], [432, 198, 188, 39, 2],
    [624, 208, 140, 43, 5], [769, 213, 124, 42, 9]
  ] },
  { kanji: 'hen', id: 'hen-02-tip', path: 'M860 114 C902 111 932 137 930 168 C928 191 913 208 888 216', min: 4, max: 20 },
  { kanji: 'hen', id: 'hen-03', path: 'M182 244 C225 219 333 211 437 215 C561 221 687 229 783 273 C892 317 956 389 931 422 C915 440 885 408 849 383', min: 4, max: 16 },
  { kanji: 'hen', id: 'hen-04', path: 'M182 466 C179 448 238 441 297 392 C352 346 400 313 415 275 C427 245 390 231 352 247', min: 6, max: 31 },
  { kanji: 'hen', id: 'hen-05', path: 'M283 392 C325 356 372 332 393 290 C409 262 386 248 354 256', min: 4, max: 14 },
  { kanji: 'hen', id: 'hen-06', path: 'M182 455 C191 486 242 477 296 459 C392 427 484 365 523 304 C547 270 534 240 498 228', min: 6, max: 32 },
  { kanji: 'hen', id: 'hen-07', path: 'M614 226 C649 248 689 298 690 340 C688 391 666 425 621 434 C599 439 582 425 571 407', min: 4, max: 14 },
  { kanji: 'hen', id: 'hen-08', path: 'M510 374 C545 380 592 379 627 400 C655 418 655 438 618 438', min: 6, max: 20 },
  { kanji: 'hen', id: 'hen-09', path: 'M486 411 C514 405 553 413 563 437 C565 457 536 474 501 491', min: 6, max: 29 },
  { kanji: 'hen', id: 'hen-10', path: 'M112 661 C123 634 210 598 302 553 C406 501 486 462 539 420 C548 413 561 425 557 446', min: 5, max: 45 },
  { kanji: 'hen', id: 'hen-11', path: 'M112 677 C131 710 225 704 309 682 C400 658 459 614 539 603 C635 587 732 647 824 672 C916 697 984 691 1007 665', min: 5, max: 42 },
  { kanji: 'hen', id: 'hen-12', path: 'M452 501 C495 533 546 587 606 621', min: 6, max: 31 },
  { kanji: 'hen', id: 'hen-20', path: 'M591 617 C624 576 675 520 735 476', min: 6, max: 28 },
  { kanji: 'hen', id: 'hen-19', path: 'M508 483 C568 480 634 482 706 492 C738 497 763 490 749 470', min: 7, max: 24 },
  { kanji: 'hen', id: 'hen-13', column: [348, 264, 4, 31, -13, 27, 90] },
  { kanji: 'hen', id: 'hen-14', column: [476, 251, 5, 29, 7, 29, 92] },
  { kanji: 'hen', id: 'hen-15', column: [610, 254, 6, 31, -8, 31, 93] },
  { kanji: 'hen', id: 'hen-16', column: [486, 428, 3, 29, 14, 27, 90] },
  { kanji: 'hen', id: 'hen-17', column: [659, 488, 6, 28, 14, 30, 94] },
  { kanji: 'hen', id: 'hen-18', words: [[868, 139, 56, 16, 18], [871, 157, 59, 18, 12], [864, 176, 65, 19, 3]] },

  { kanji: 'kaku', id: 'kaku-01', words: [
    [192, 833, 74, 31, -8], [273, 831, 103, 35, -3], [384, 831, 111, 36, 0],
    [502, 834, 125, 38, 2], [634, 836, 111, 36, 5], [752, 837, 172, 36, -8]
  ] },
  { kanji: 'kaku', id: 'kaku-01-right-tip', path: 'M889 763 C924 768 950 786 945 807 C942 829 915 849 882 839', min: 4, max: 21 },
  { kanji: 'kaku', id: 'kaku-01-left-tip', path: 'M186 851 C165 850 155 836 165 822 C176 806 206 802 231 803', min: 4, max: 17 },
  { kanji: 'kaku', id: 'kaku-02', path: 'M169 846 C229 867 334 842 447 847 C573 857 732 871 854 849', min: 4, max: 13 },
  { kanji: 'kaku', id: 'kaku-03', column: [391, 750, 7, 29, -5, 27, 91] },
  { kanji: 'kaku', id: 'kaku-04', column: [638, 752, 7, 28, 5, 27, 92] },
  { kanji: 'kaku', id: 'kaku-05', words: [
    [279, 970, 111, 38, 3], [397, 974, 111, 39, 4], [516, 978, 100, 39, 3],
    [623, 980, 111, 38, 1], [741, 981, 98, 37, -8]
  ] },
  { kanji: 'kaku', id: 'kaku-05-right-tip', path: 'M807 932 C836 919 868 925 872 951 C874 974 845 987 812 979', min: 4, max: 20 },
  { kanji: 'kaku', id: 'kaku-06', path: 'M379 1075 C462 1066 530 1059 602 1070 C704 1084 800 1116 843 1088', min: 5, max: 23,
    words: [[378, 1080, 113, 25, -8], [481, 1075, 105, 25, -4], [635, 1087, 115, 25, 8]] },
  { kanji: 'kaku', id: 'kaku-07', column: [279, 945, 8, 29, 6, 27, 89] },
  { kanji: 'kaku', id: 'kaku-08', column: [754, 954, 8, 28, -4, 27, 89] },
  { kanji: 'kaku', id: 'kaku-09', words: [
    [163, 1154, 88, 35, 12], [251, 1159, 87, 38, 4], [339, 1164, 99, 39, 0],
    [439, 1174, 182, 43, 1], [622, 1184, 129, 42, 7], [751, 1195, 194, 43, 10]
  ] },
  { kanji: 'kaku', id: 'kaku-09-under', path: 'M174 1173 C259 1193 399 1173 510 1184 C682 1192 853 1235 949 1207', min: 3, max: 11 },
  { kanji: 'kaku', id: 'kaku-09-right-tip', path: 'M908 1125 C951 1132 981 1153 976 1178 C972 1200 943 1212 908 1204', min: 4, max: 21 },
  { kanji: 'kaku', id: 'kaku-09-left-tip', path: 'M201 1170 C171 1173 155 1158 163 1139 C170 1125 192 1118 213 1125', min: 4, max: 17 },
  { kanji: 'kaku', id: 'kaku-10', column: [513, 943, 13, 31, -3, 31, 102] },
  { kanji: 'kaku', id: 'kaku-11', path: 'M522 1170 C550 1214 565 1270 544 1306 C528 1336 488 1336 462 1324', min: 4, max: 17 }
];

// Baselines traced separately: crossing strokes share space without duplicate words.
const rowOverrides = {
 'hen-13': [[354,254,67,23,14,-7],[347,280,77,24,15,-5],[335,310,88,26,15,-3]],
 'hen-14': [[485,239,61,24,17,-3],[478,267,67,27,15,-2],[470,296,70,28,16,-1]],
 'hen-15': [[605,256,80,30,18,-8],[615,287,83,30,17,-6],[622,319,82,30,13,-4],[619,352,82,30,11,-3],[611,384,81,29,12,0],[594,411,79,26,22,2]],
 'hen-16': [[481,425,83,24,12,-8],[469,449,81,26,15,-5]],
 'hen-17': [[688,479,70,24,15,-6],[674,504,81,27,14,-5],[660,531,79,29,17,-5],[645,558,79,31,17,-2],[619,586,83,31,13,2]],
 'kaku-03': [[384,738,122,24,9,-12],[400,762,79,26,4,-8],[401,788,77,28,2,-4],[400,850,74,25,5,-4],[396,877,75,25,8,-2],[393,904,75,26,9,0],[389,925,66,20,4,4]],
 'kaku-04': [[623,738,124,24,9,-12],[640,765,84,26,4,-8],[640,793,78,28,3,-3],[638,866,79,25,5,-4],[635,893,77,25,7,-2],[632,918,69,23,7,1]],
 'kaku-07': [[263,949,71,23,16,-5],[281,995,91,27,8,-5],[289,1023,82,28,7,-3],[289,1052,83,28,7,-1],[287,1080,82,27,9,0],[280,1105,83,25,9,3],[273,1125,77,21,0,6]],
 'kaku-08': [[795,938,70,23,22,-7],[756,1023,79,26,8,-5],[757,1050,79,27,9,-3],[752,1078,79,26,13,-1],[746,1106,76,25,17,0],[739,1129,70,22,18,3]],
 'kaku-10': [[513,933,95,29,7,-9],[517,963,96,31,9,-7],[517,996,99,32,10,-5],[518,1030,102,32,10,-4],[518,1065,103,33,10,-3],[519,1101,101,33,12,-1],[518,1137,103,34,13,0],[516,1174,106,34,14,1],[514,1212,105,34,14,2],[508,1250,106,34,14,3],[501,1288,102,31,15,4],[485,1320,101,27,-3,7]]
};
for (const stroke of strokes) {
 if (rowOverrides[stroke.id]) { delete stroke.column; stroke.words = rowOverrides[stroke.id]; }
}
for (const id of ['hen-05','hen-07','hen-09','hen-20','kaku-06','kaku-11']) {
 const stroke = strokes.find(item => item.id === id);
 if (id === 'kaku-06') delete stroke.path;
 else if (stroke) stroke.max = stroke.min = 0;
}

const curveOverrides = {
 'hen-04': 'M180 459 C180 440 239 416 297 375 C327 354 355 333 380 312',
 'hen-06': 'M184 470 C220 493 299 471 367 433 C430 398 484 350 508 312',
 'hen-10': 'M114 663 C134 643 208 622 290 582 C366 545 441 500 508 460',
 'hen-11': 'M114 677 C132 711 225 707 316 685 C415 662 507 620 597 576',
 'hen-12': 'M472 525 C541 587 633 641 734 674 C842 711 962 692 1007 640'
};
for (const stroke of strokes) if (curveOverrides[stroke.id]) stroke.path = curveOverrides[stroke.id];
strokes.find(s => s.id === 'hen-12').max = 43;
strokes.find(s => s.id === 'hen-11').max = 39;
strokes.find(s => s.id === 'hen-01').words = [[502,98,122,26,12,-10],[510,125,126,27,8,-6],[490,154,143,28,3,-3]];
strokes.find(s => s.id === 'hen-02-tip').words = [[847,129,43,10,9,-2],[866,149,57,15,12,-5],[858,172,64,18,14,-7],[841,194,79,23,-8,-6]];
strokes.find(s => s.id === 'hen-18').words = [];
strokes.find(s => s.id === 'kaku-05-right-tip').words = [[794,949,62,16,22,-6],[772,970,91,24,3,-9]];
strokes.find(s => s.id === 'kaku-09-right-tip').words = [[916,1145,43,12,24,-4],[913,1165,56,17,27,-6],[888,1191,82,23,7,-7]];

strokes.find(s => s.id === 'hen-03').words = [[747,281,85,17,41,-4],[782,316,84,19,45,-5],[815,353,83,20,48,-5],[843,384,70,19,30,-6],[864,402,60,15,-5,-4]];
strokes.find(s => s.id === 'hen-02').words.push([175,227,31,10,-48,-3]);
strokes.find(s => s.id === 'hen-04').max = 28;
strokes.find(s => s.id === 'hen-06').max = 30;
strokes.find(s => s.id === 'hen-19').max = 15;
strokes.find(s => s.id === 'hen-08').max = 15;
strokes.find(s => s.id === 'hen-17').words[0] = [686,481,69,23,19,-7];
strokes.find(s => s.id === 'kaku-01').words[5] = [752,840,133,33,3,-3];
strokes.find(s => s.id === 'kaku-01-right-tip').words = [[892,786,36,10,17,-3],[882,806,55,16,7,-4],[866,825,71,20,-8,-6]];
strokes.find(s => s.id === 'kaku-05-right-tip').words = [[794,942,55,12,23,-6]];
strokes.find(s => s.id === 'kaku-09').words[0] = [180,1170,71,27,4,-4];
strokes.find(s => s.id === 'kaku-09').words[3] = [439,1174,182,34,1,-3];
strokes.find(s => s.id === 'kaku-09').words[5] = [751,1195,162,34,6,-6];
strokes.find(s => s.id === 'kaku-09-under').max = 6;
strokes.find(s => s.id === 'kaku-10').words.push([464,1335,88,19,-15,-8]);
strokes.push({kanji:'kaku',id:'kaku-12',words:[[474,899,77,18,0,-2],[553,900,81,18,3,-2]]});

for (const id of ['hen-04','hen-06','hen-10','hen-11']) strokes.find(s => s.id === id).taper = 'rise';
strokes.find(s => s.id === 'hen-10').path = 'M114 663 C143 643 228 622 311 585 C390 550 467 505 512 478';
strokes.find(s => s.id === 'hen-11').path = 'M114 677 C131 710 237 715 337 689 C449 663 542 623 629 577';
strokes.find(s => s.id === 'hen-13').words[2] = [333,306,83,24,21,-7];
strokes.find(s => s.id === 'hen-14').words[2] = [467,296,69,26,20,-5];
strokes.find(s => s.id === 'hen-17').words[4] = [608,577,83,27,20,-5];
strokes.find(s => s.id === 'kaku-05').words = [[279,970,110,32,3,-5],[392,971,117,33,1,-2],[623,980,111,32,1,-2],[741,981,98,31,-8,-4]];
strokes.find(s => s.id === 'kaku-06').words = [[378,1080,113,21,-8,-2],[635,1087,115,21,8,-2]];
strokes.find(s => s.id === 'kaku-09').words.splice(3,1);
strokes.find(s => s.id === 'kaku-01').words.splice(2,1);
strokes.find(s => s.id === 'kaku-01').words.splice(3,1);
strokes.find(s => s.id === 'kaku-03').words.splice(3,0,[399,827,102,30,2,-2]);
strokes.find(s => s.id === 'kaku-04').words.splice(3,0,[638,835,108,30,3,-3]);

strokes.find(s => s.id === 'kaku-09').words.splice(3,0,[439,1174,73,30,1,-2]);
strokes.find(s => s.id === 'hen-13').words = [[353,251,72,21,25,-10,13],[345,278,80,23,27,-8,13],[334,306,88,24,29,-7,12]];
strokes.find(s => s.id === 'hen-14').words = [[485,240,60,23,27,-9,10],[478,269,66,25,27,-7,10],[470,299,68,26,29,-5,12]];
strokes.find(s => s.id === 'hen-15').words = [[607,250,80,27,25,-11,7],[618,283,83,29,23,-8,7],[623,317,81,29,18,-6,5],[623,349,77,28,18,-6,3],[613,381,78,28,23,-7,4],[600,408,77,25,28,-8,6]];
strokes.find(s => s.id === 'hen-17').words = [[686,476,72,22,27,-10,12],[674,502,81,24,27,-8,12],[660,530,80,25,29,-8,10],[640,557,78,26,30,-7,9],[619,583,75,25,25,-8,5]];
for (const id of ['kaku-03','kaku-04']) { const stroke = strokes.find(s => s.id === id); stroke.words[0][3] = 19; stroke.words[0][5] = -10; }
strokes.find(s => s.id === 'kaku-10').wordCurves = {12:'M464 1329 C493 1350 537 1343 558 1311'};
strokes.find(s => s.id === 'hen-02').wordCurves = {4:'M769 213 C810 221 869 218 894 197'};
strokes.find(s => s.id === 'kaku-01').wordCurves = {3:'M752 840 C803 850 858 846 883 825'};
strokes.find(s => s.id === 'kaku-09').wordCurves = {5:'M751 1195 C806 1217 866 1220 913 1189'};

strokes.find(s => s.id === 'hen-13').words[2][4] = 10;
strokes.find(s => s.id === 'hen-14').words[2][4] = 15;
strokes.find(s => s.id === 'hen-15').words.forEach((word, i) => { word[4] = [19,19,15,11,16,29][i]; });
strokes.find(s => s.id === 'hen-17').words.forEach((word, i) => { word[4] = [18,18,20,19,12][i]; });
strokes.find(s => s.id === 'hen-02').words.pop();
strokes.push({kanji:'hen',id:'hen-21',path:'M212 258 C190 250 171 239 174 225 C177 214 188 212 198 208',min:2,max:9});
strokes.find(s => s.id === 'kaku-07').words[0] = [261,949,65,16,8,-7,10];
strokes.find(s => s.id === 'kaku-08').words[0] = [795,938,63,15,17,-6,12];

function escapeXML(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
}

function sampleCurve(path) {
  const tokens = path.match(/[MC]|-?\d+(?:\.\d+)?/g);
  const samples = [];
  let index = 0;
  let current = null;
  let distance = 0;
  while (index < tokens.length) {
    const command = tokens[index++];
    if (command === 'M') {
      current = { x: Number(tokens[index++]), y: Number(tokens[index++]) };
      samples.push({ ...current, distance });
    } else if (command === 'C') {
      const p0 = current;
      const p1 = { x: Number(tokens[index++]), y: Number(tokens[index++]) };
      const p2 = { x: Number(tokens[index++]), y: Number(tokens[index++]) };
      const p3 = { x: Number(tokens[index++]), y: Number(tokens[index++]) };
      for (let step = 1; step <= 64; step++) {
        const t = step / 64;
        const u = 1 - t;
        const point = {
          x: u ** 3 * p0.x + 3 * u ** 2 * t * p1.x + 3 * u * t ** 2 * p2.x + t ** 3 * p3.x,
          y: u ** 3 * p0.y + 3 * u ** 2 * t * p1.y + 3 * u * t ** 2 * p2.y + t ** 3 * p3.y
        };
        distance += Math.hypot(point.x - current.x, point.y - current.y);
        samples.push({ ...point, distance });
        current = point;
      }
    }
  }
  return { samples, length: distance };
}

function pointAt(curve, distance) {
  const samples = curve.samples;
  const target = Math.max(0, Math.min(curve.length, distance));
  let low = 0;
  let high = samples.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (samples[middle].distance < target) low = middle + 1;
    else high = middle;
  }
  const next = samples[low];
  const previous = samples[Math.max(0, low - 1)];
  const segment = next.distance - previous.distance || 1;
  const fraction = (target - previous.distance) / segment;
  const x = previous.x + (next.x - previous.x) * fraction;
  const y = previous.y + (next.y - previous.y) * fraction;
  const angle = Math.atan2(next.y - previous.y, next.x - previous.x) * 180 / Math.PI;
  return { x, y, angle };
}

// Times Roman advances at an em of 100; every glyph receives its own affine matrix.
const ADVANCES = [50, 44.4, 50, 50, 44.4, 50, 50];
const WORD_WIDTH = ADVANCES.reduce((a, b) => a + b, 0);
function wordMarkup(stroke, index, options) {
  const { x, y, angle = 0, size, width, curve, offset = 0, bend = 0, skew = 0 } = options;
  const glyphs = [];
  const heightFactor = 1.28;
  let advance = 0;
  for (const [i, char] of [...'henkaku'].entries()) {
    const fraction = advance / WORD_WIDTH;
    let px, py, theta, sy = size / 100 * heightFactor;
    if (curve) {
      const position = pointAt(curve, offset + fraction * width);
      px = position.x; py = position.y; theta = position.angle * Math.PI / 180;
      const progress = (offset + fraction * width) / curve.length;
      sy *= stroke.taper === 'rise' ? 1 : .65 + .35 * Math.pow(Math.sin(Math.PI * Math.max(0, Math.min(1, progress))), .5);
    } else {
      const localX = fraction * width;
      const localY = bend * Math.sin(fraction * Math.PI);
      const rotation = angle * Math.PI / 180;
      px = x + Math.cos(rotation) * localX - Math.sin(rotation) * localY;
      py = y + Math.sin(rotation) * localX + Math.cos(rotation) * localY;
      theta = rotation + Math.atan2(bend * Math.PI * Math.cos(fraction * Math.PI), width);
      sy *= 1 + .10 * Math.sin(fraction * Math.PI * 2);
    }
    const sx = width / WORD_WIDTH;
    const c = Math.cos(theta), t = Math.sin(theta);
    const shear = Math.tan(skew * Math.PI / 180);
    const matrix = [c * sx, t * sx, (c * shear - t) * sy, (t * shear + c) * sy, px, py];
    glyphs.push(`<text class="glyph" data-char="${char}" data-glyph="${i}" data-initial-matrix="${matrix.map(v => v.toFixed(5)).join(' ')}" font-size="100" transform="matrix(${matrix.map(v => v.toFixed(5)).join(' ')})">${char}</text>`);
    advance += ADVANCES[i];
  }
  return `<g class="motion-node"><g class="float-node"><g class="word henkaku-word" data-word="${stroke.id}-${index}" data-kanji="${stroke.kanji}" data-stroke="${stroke.id}" data-index="${index}" data-x="${x.toFixed(2)}" data-y="${y.toFixed(2)}" data-rotation="${angle.toFixed(2)}" data-scale-x="${(width / WORD_WIDTH).toFixed(4)}" data-scale-y="${(size / 100).toFixed(4)}" data-opacity="1">${glyphs.join('')}</g></g></g>`;
}
function buildArtworkSVG({ preview = false } = {}) {
  const guides = [];
  const groups = { hen: [], kaku: [] };
  for (const stroke of strokes) {
    const words = [];
    let index = 0;
    if (stroke.path && stroke.max > 0) {
      guides.push(`<path d="${escapeXML(stroke.path)}"/>`);
      const curve = sampleCurve(stroke.path);
      let offset = 0;
      while (offset < curve.length - 4) {
        const progress = Math.min(1, (offset + stroke.min * 1.5) / curve.length);
        const lens = Math.pow(Math.max(0, Math.sin(Math.PI * progress * (stroke.taper === 'rise' ? .5 : 1))), .78);
        const size = stroke.min + (stroke.max - stroke.min) * lens;
        const width = Math.min(size * 3.05, curve.length - offset);
        if (width < 3) break;
        const origin = pointAt(curve, offset);
        words.push(wordMarkup(stroke, index++, { ...origin, size, width, curve, offset }));
        offset += width + Math.max(1, size * .045);
      }
    }
    if (stroke.column) {
      const [x, y, count, gap, angle, baseSize, width] = stroke.column;
      for (let row = 0; row < count; row++) {
        const progress = row / Math.max(1, count - 1);
        const drift = stroke.id === 'kaku-10' ? -(Math.max(0, row - 8) ** 2) * 2 : 0;
        const xx = x + Math.sin(progress * Math.PI) * 8 + drift;
        const yy = y + row * gap;
        const lens = Math.sin(Math.PI * progress);
        const size = baseSize * (.90 + .12 * lens);
        const rowWidth = width * (.80 + .22 * lens);
        words.push(wordMarkup(stroke, index++, { x: xx, y: yy, angle: angle + progress * 9, size, width: rowWidth, bend: -6 + 12 * progress, skew: -5 + progress * 10 }));
      }
    }
    for (const [row, values] of (stroke.words || []).entries()) {
      const [x, y, width, size, angle, bend = 0, skew = 0] = values;
      const curve = stroke.wordCurves?.[row] ? sampleCurve(stroke.wordCurves[row]) : null;
      words.push(wordMarkup(stroke, index++, { x, y, width: curve ? curve.length : width, size, angle, bend, skew, curve }));
    }
    if (stroke.words?.length && !stroke.path) {
      const centers = stroke.words.map(([x, y, width, size]) => `${(x + width / 2).toFixed(2)} ${(y - size * .4).toFixed(2)}`);
      guides.push(`<path d="M${centers.join(' L')}" data-stroke="${stroke.id}"/>`);
    }
    groups[stroke.kanji].push(`<g id="${stroke.id}" class="stroke-group" data-kanji="${stroke.kanji}" data-stroke="${stroke.id}">${words.join('')}</g>`);
  }
  const background = preview ? '<defs><radialGradient id="paper"><stop offset="0" stop-color="#efefef"/><stop offset=".62" stop-color="#dedede"/><stop offset="1" stop-color="#b8b8b8"/></radialGradient></defs><rect width="1122" height="1402" fill="url(#paper)"/>' : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1122 1402" role="img" aria-label="独立した文字の変形で描いた変革"><style>.glyph{fill:#101010;font-family: &quot;${FONT}&quot;,serif;font-weight:400}.guide{display:none}</style>${background}<g id="hen">${groups.hen.join('')}</g><g id="kaku">${groups.kaku.join('')}</g><g class="guide guide-centerlines">${guides.join('')}</g><g class="guide guide-boxes"></g><g class="guide guide-origins"></g><g class="guide guide-labels"></g></svg>`;
}

function setupDebug(sheet, svg) {
  const panel = document.getElementById('debug-panel');
  panel.hidden = false;
  const svgNS = 'http://www.w3.org/2000/svg';
  const boxes = svg.querySelector('.guide-boxes');
  const origins = svg.querySelector('.guide-origins');
  const labels = svg.querySelector('.guide-labels');
  for (const stroke of svg.querySelectorAll('.stroke-group')) {
    const box = stroke.getBBox();
    const rect = document.createElementNS(svgNS, 'rect');
    for (const [name, value] of Object.entries({ x: box.x, y: box.y, width: box.width, height: box.height })) rect.setAttribute(name, value);
    boxes.append(rect);
    const label = document.createElementNS(svgNS, 'text');
    label.setAttribute('x', box.x);
    label.setAttribute('y', box.y - 3);
    label.textContent = stroke.id;
    labels.append(label);
  }
  for (const word of svg.querySelectorAll('.henkaku-word')) {
    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', word.dataset.x);
    circle.setAttribute('cy', word.dataset.y);
    circle.setAttribute('r', '3');
    origins.append(circle);
  }
  for (const input of panel.querySelectorAll('[data-guide]')) {
    input.addEventListener('change', () => sheet.classList.toggle(`show-${input.dataset.guide}`, input.checked));
  }
  const overlay = document.getElementById('reference-overlay');
  const artwork = document.getElementById('artwork');
  const referenceSlider = document.getElementById('reference-opacity');
  const svgSlider = document.getElementById('svg-opacity');
  let referenceURL = null;
  const updateComparison = () => {
    const mode = panel.querySelector('input[name="comparison"]:checked').value;
    overlay.classList.toggle('visible', Boolean(referenceURL && mode !== 'svg'));
    overlay.style.opacity = mode === 'reference' ? '1' : referenceSlider.value;
    artwork.style.opacity = mode === 'reference' ? '0' : svgSlider.value;
    document.getElementById('reference-value').value = Number(referenceSlider.value).toFixed(2);
    document.getElementById('svg-value').value = Number(svgSlider.value).toFixed(2);
  };
  document.getElementById('reference-file').addEventListener('change', event => {
    if (referenceURL) URL.revokeObjectURL(referenceURL);
    const file = event.target.files[0];
    referenceURL = file ? URL.createObjectURL(file) : null;
    overlay.style.backgroundImage = referenceURL ? `url("${referenceURL}")` : '';
    if (referenceURL) panel.querySelector('[value="overlay"]').checked = true;
    updateComparison();
  });
  for (const input of panel.querySelectorAll('input[name="comparison"], input[type="range"]')) {
    input.addEventListener('input', updateComparison);
  }
  updateComparison();
}

// Motion is applied outside the glyph matrices; returning to identity restores every letter.
function createMotionPlan(index, count, groupIndex, angle) {
  const progress = count > 1 ? index / (count - 1) : .5;
  const edgeDistance = Math.min(progress, 1 - progress);
  const flow = angle * Math.PI / 180;
  const side = Math.sin(progress * Math.PI * 2 + groupIndex * .7) * 82;
  const along = (progress - .5) * 370;
  const duration = 680 + ((index + groupIndex * 3) % 7) * 45;
  const scatterDelay = Math.round(edgeDistance * 220 + groupIndex * 3);
  return {
    dx: Math.cos(flow) * along - Math.sin(flow) * side + Math.sin(groupIndex * 2.3) * 45,
    dy: Math.sin(flow) * along + Math.cos(flow) * side + Math.cos(groupIndex * 1.9) * 36,
    turn: (progress - .5) * 65 + Math.sin(index * 1.7 + groupIndex) * 18,
    scale: .90 + ((index * 7 + groupIndex * 3) % 8) * .033,
    faded: .54 + ((index + groupIndex) % 5) * .075,
    duration,
    scatterDelay,
    returnDelay: Math.round((.5 - edgeDistance) * 230),
    floatX: Math.sin(index + groupIndex) * 32,
    floatY: Math.cos(index * 1.4 + groupIndex) * 40,
    floatDuration: 2.4 + ((index + groupIndex) % 5) * .26,
    floatDelay: duration + scatterDelay
  };
}
function setupMotion(sheet, svg) {
  [...svg.querySelectorAll('.stroke-group')].forEach((group, groupIndex) => {
    const words = [...group.querySelectorAll('.word')];
    const first = words[0], last = words.at(-1);
    if (!first) return;
    const vertical = Math.abs(Number(last.dataset.y) - Number(first.dataset.y)) > Math.abs(Number(last.dataset.x) - Number(first.dataset.x));
    words.forEach((word, index) => {
      const plan = createMotionPlan(index, words.length, groupIndex, vertical ? 90 : Number(word.dataset.rotation));
      const motion = word.parentElement.parentElement;
      const float = word.parentElement;
      const properties = { dx: 'px', dy: 'px', turn: 'deg', scale: '', faded: '', duration: 'ms', scatterDelay: 'ms', returnDelay: 'ms' };
      for (const [name, unit] of Object.entries(properties)) {
        const cssName = name.replace(/[A-Z]/g, char => `-${char.toLowerCase()}`);
        motion.style.setProperty(`--${cssName}`, `${plan[name].toFixed(3)}${unit}`);
      }
      float.style.setProperty('--float-x', `${plan.floatX.toFixed(2)}px`);
      float.style.setProperty('--float-y', `${plan.floatY.toFixed(2)}px`);
      float.style.setProperty('--float-duration', `${plan.floatDuration}s`);
      float.style.setProperty('--float-delay', `${plan.floatDelay}ms`);
    });
  });
  const toggle = () => {
    const dispersed = sheet.classList.toggle('is-dispersed');
    sheet.setAttribute('aria-pressed', String(dispersed));
    sheet.setAttribute('aria-label', dispersed ? '変革の文字を再構築する' : '変革の文字を分散する');
  };
  sheet.addEventListener('click', toggle);
  sheet.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(); }
  });
}

if (typeof document !== 'undefined') {
  const mount = document.getElementById('artwork');
  mount.innerHTML = buildArtworkSVG();
  const sheet = document.getElementById('sheet');
  const svg = mount.querySelector('svg');
  setupMotion(sheet, svg);

  if (new URLSearchParams(location.search).has('debug')) setupDebug(sheet, svg);
}
if (typeof module !== 'undefined') module.exports = { buildArtworkSVG, strokes, createMotionPlan };
