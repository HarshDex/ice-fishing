// Small shared helpers used across the game.

export const TAU = Math.PI * 2;
export const DISPLAY = 'Impact, Haettenschweiler, "Arial Narrow Bold", "Arial Black", sans-serif';

/** getElementById that returns `any`, so DOM-heavy code reads like the original plain-JS version. */
export const $ = (id: string): any => document.getElementById(id);

/** Random integer in [a, b]. */
export const rnd = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

/** Deterministic pseudo-random generator (mulberry32), so scenery looks the same every load. */
export function seeded(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const smooth = (x: number) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
export const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
export const short = (n: number) => (n >= 1000 ? +(n / 1000).toFixed(1) + "K" : String(n));

/** Boolean preference stored in localStorage (silently falls back when storage is blocked). */
export function pref(k: string, d: boolean) {
  try { const v = localStorage.getItem(k); return v === null ? d : v === "1"; } catch { return d; }
}
export function savePref(k: string, v: boolean) {
  try { localStorage.setItem(k, v ? "1" : "0"); } catch { /* storage blocked */ }
}
