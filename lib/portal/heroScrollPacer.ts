// Bound both velocity and pending input: a flick cannot skip the hero or coast for seconds.
export function createHeroScrollPacer() {
  let pending = 0;
  return {
    push(delta: number, distance: number) {
      if (Math.sign(delta) !== Math.sign(pending)) pending = 0;
      const limit = distance * .1;
      pending = Math.max(-limit, Math.min(limit, pending + delta));
    },
    advance(elapsedMs: number, distance: number) {
      const limit = distance * Math.min(32, Math.max(0, elapsedMs)) / 1600;
      const step = Math.sign(pending) * Math.min(Math.abs(pending), limit);
      pending -= step;
      return step;
    },
    reset() { pending = 0; },
  };
}
