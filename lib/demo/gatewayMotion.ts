export function sceneScrollPosition(
  top: number,
  height: number,
  viewport: number,
  overflow: number,
) {
  if (overflow <= 0 || viewport <= 0 || height <= 0) return 0;
  const progress = (viewport * 0.68 - top) / (viewport * 0.5 + height);
  return Math.max(0, Math.min(1, progress)) * overflow;
}

export function visibleSceneIndex(
  left: number,
  viewport: number,
  panel: number,
  gap: number,
  count: number,
) {
  if (panel <= 0 || count <= 0) return 0;
  return Math.max(
    0,
    Math.min(count - 1, Math.floor((left + viewport / 2) / (panel + gap))),
  );
}
