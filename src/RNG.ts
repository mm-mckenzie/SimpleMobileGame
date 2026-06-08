/** Stateless RNG utilities — import and call freely. */
export const RNG = {
  /** Float in [0, 1) */
  rand(): number { return Math.random(); },

  /** Integer in [min, max] inclusive */
  int(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /** True with probability percent/100 */
  chance(percent: number): boolean {
    return Math.random() * 100 < percent;
  },

  /** Pick one element from an array */
  pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  /** Pick N unique elements from an array (no replacement) */
  pickN<T>(arr: T[], n: number): T[] {
    const copy = [...arr];
    const result: T[] = [];
    for (let i = 0; i < n && copy.length; i++) {
      const idx = Math.floor(Math.random() * copy.length);
      result.push(copy.splice(idx, 1)[0]);
    }
    return result;
  },

  /** Weighted pick: items is [{value, weight}, ...] */
  weighted<T>(items: { value: T; weight: number }[]): T {
    const total = items.reduce((s, i) => s + i.weight, 0);
    let r = Math.random() * total;
    for (const item of items) {
      r -= item.weight;
      if (r <= 0) return item.value;
    }
    return items[items.length - 1].value;
  },

  /** Apply ±variance% to a base number, return integer */
  vary(base: number, variancePct: number): number {
    const delta = base * (variancePct / 100);
    return Math.round(base + (Math.random() * 2 - 1) * delta);
  },

  /** Fisher-Yates shuffle (returns new array) */
  shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },

  /** True 50% of the time */
  coinFlip(): boolean { return Math.random() < 0.5; },
};
