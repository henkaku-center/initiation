// ABOUTME: 急なスクロールでも文字の拡大過程が飛ばないよう表示の進み幅を制限する。
// ABOUTME: ゆっくりしたスクロールでは目標位置へそのまま追従する。
function advanceZoom(current, target, elapsedMs, durationMs) {
  const distance = target - current;
  const step = Math.max(0, elapsedMs) / durationMs;
  if (Math.abs(distance) <= step) return target;
  return current + Math.sign(distance) * step;
}

if (typeof module !== 'undefined') module.exports = { advanceZoom };
