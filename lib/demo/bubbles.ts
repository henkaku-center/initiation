// Original, deterministic motion for the decorative Gateway glass field.
export type BubblePointer = { x: number; y: number };
export type BubbleBounds = { width: number; height: number };
type Bubble = {
  x: number;
  y: number;
  radius: number;
  offsetX: number;
  offsetY: number;
};
export type BubbleScene = {
  bounds: BubbleBounds;
  time: number;
  accumulator: number;
  bubbles: Bubble[];
  cursor: {
    x: number;
    y: number;
    radius: number;
    stretch: number;
    vx: number;
    vy: number;
  };
};
const seeds = [
  [0.28, 0.4, 0.1, 0.065, 0],
  [0.52, 0.46, 0.09, 0.1, Math.PI],
  [0.76, 0.2, 0.064, 0.035, 1.7],
  [0.79, 0.66, 0.078, 0.06, 4.1],
  [0.18, 0.77, 0.078, 0.04, 2.4],
  [0.49, 0.79, 0.056, 0.045, 5.2],
];
const step = 1 / 120;
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

function home(index: number, time: number, bounds: BubbleBounds) {
  const [x, y, radius, amplitude, phase] = seeds[index];
  return {
    x: x * bounds.width + Math.sin(time * 0.22 + phase) * amplitude,
    y: y * bounds.height + Math.cos(time * 0.18 + phase) * amplitude * 0.6,
    radius,
  };
}

export function createBubbles(bounds: BubbleBounds): BubbleScene {
  return {
    bounds,
    time: 0,
    accumulator: 0,
    bubbles: seeds.map((_, index) => ({
      ...home(index, 0, bounds),
      offsetX: 0,
      offsetY: 0,
    })),
    cursor: {
      x: bounds.width / 2,
      y: bounds.height / 2,
      radius: 0,
      stretch: 1,
      vx: 0,
      vy: 0,
    },
  };
}

export function advanceBubbles(
  previous: BubbleScene,
  elapsed: number,
  pointer: BubblePointer | null,
): BubbleScene {
  const scene = {
    ...previous,
    bubbles: previous.bubbles.map((b) => ({ ...b })),
    cursor: { ...previous.cursor },
  };
  scene.accumulator += Number.isFinite(elapsed) ? clamp(elapsed, 0, 0.05) : 0;
  while (scene.accumulator >= step - 1e-10) {
    scene.accumulator = Math.max(0, scene.accumulator - step);
    scene.time += step;
    scene.bubbles.forEach((bubble, index) => {
      const anchor = home(index, scene.time, scene.bounds);
      const dx = pointer ? pointer.x - anchor.x : 0;
      const dy = pointer ? pointer.y - anchor.y : 0;
      const distance = Math.hypot(dx, dy);
      const influence = pointer ? Math.max(0, 1 - distance / 0.42) ** 2 : 0;
      const travel = Math.min(0.18, distance) * influence;
      const targetX = distance ? (dx / distance) * travel : 0;
      const targetY = distance ? (dy / distance) * travel : 0;
      const alpha = 1 - Math.exp(-step / (pointer ? 1.1 : 1.8));
      bubble.offsetX += clamp(
        (targetX - bubble.offsetX) * alpha,
        -0.1 * step,
        0.1 * step,
      );
      bubble.offsetY += clamp(
        (targetY - bubble.offsetY) * alpha,
        -0.1 * step,
        0.1 * step,
      );
      bubble.x = clamp(
        anchor.x + bubble.offsetX,
        bubble.radius,
        scene.bounds.width - bubble.radius,
      );
      bubble.y = clamp(
        anchor.y + bubble.offsetY,
        bubble.radius,
        scene.bounds.height - bubble.radius,
      );
    });
    const cursor = scene.cursor;
    const alpha = 1 - Math.exp(-step / 0.09);
    let dx = pointer ? (pointer.x - cursor.x) * alpha : 0;
    let dy = pointer ? (pointer.y - cursor.y) * alpha : 0;
    const distance = Math.hypot(dx, dy);
    if (distance > 3 * step) {
      dx *= (3 * step) / distance;
      dy *= (3 * step) / distance;
    }
    cursor.x += dx;
    cursor.y += dy;
    cursor.vx += (dx / step - cursor.vx) * 0.1;
    cursor.vy += (dy / step - cursor.vy) * 0.1;
    cursor.radius +=
      ((pointer ? 0.028 : 0) - cursor.radius) * (1 - Math.exp(-step / 0.25));
    cursor.stretch = clamp(1 + Math.hypot(cursor.vx, cursor.vy) * 0.35, 1, 1.8);
  }
  return scene;
}
