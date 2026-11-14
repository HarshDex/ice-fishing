// Everything that defines the game's rules and look: bet types, wheel layout, chips, timings.
import { TAU } from "../core/util";

export type BetKey = "snow" | "ice" | "blue" | "orange" | "red";
export interface BetType {
  name: string;
  c0: string; c1: string;          // wheel segment gradient (hub -> rim)
  ink?: string;
  card: [string, string];          // bet tile gradient
  cardInk: string;
  bonus?: [number, number];        // fishing bonus multiplier range; absent = pays 1:1
}

export const TYPES: Record<BetKey, BetType> = {
  snow:   { name: "Snowflake",   c0: "#7fb2cc", c1: "#f9feff", ink: "#134a68", card: ["#f6fcff", "#a3cfe3"], cardInk: "#0d3550" },
  ice:    { name: "Icicle",      c0: "#10405c", c1: "#5db3d8", ink: "#eaf8ff", card: ["#63b9dd", "#1b5475"], cardInk: "#fff" },
  blue:   { name: "Blue Bite",   c0: "#06245a", c1: "#2f8ff0", card: ["#45a6ff", "#0b3f86"], cardInk: "#fff", bonus: [3, 50] },
  orange: { name: "Orange Haul", c0: "#5e2400", c1: "#ff8a1c", card: ["#ffa53d", "#b04800"], cardInk: "#fff", bonus: [5, 150] },
  red:    { name: "Red Giant",   c0: "#4f0404", c1: "#ef2b22", card: ["#ff5244", "#8a0a0a"], cardInk: "#fff", bonus: [10, 400] },
};
export const KEYS = Object.keys(TYPES) as BetKey[];
export const BONUS_KEYS = KEYS.filter(k => TYPES[k].bonus);

// Icon shapes shared by the wheel face and the bet tiles.
export const FISH_D = "M42 0C30-20 0-24-20-6L-44-22C-38-8-38 8-44 22L-20 6C0 24 30 20 42 0Z";
export const FIN_D = "M-2-17C6-32 20-30 24-15Z";
export const CRYSTAL_D = "M0-30L13-10 8 24 0 34-8 24-13-10Z";
export function snowD(r: number) {
  let d = "";
  for (let k = 0; k < 6; k++) {
    const a = k * Math.PI / 3, c = Math.cos(a), s = Math.sin(a), px = c * r * .58, py = s * r * .58;
    d += "M0 0L" + (c * r).toFixed(1) + " " + (s * r).toFixed(1);
    for (const side of [-1, 1]) {
      const b = a + side * Math.PI / 3;
      d += "M" + px.toFixed(1) + " " + py.toFixed(1) + "L" + (px + Math.cos(b) * r * .34).toFixed(1) + " " + (py + Math.sin(b) * r * .34).toFixed(1);
    }
  }
  return d;
}
export const P_FISH = new Path2D(FISH_D), P_FIN = new Path2D(FIN_D), P_CRYSTAL = new Path2D(CRYSTAL_D), P_SNOW = new Path2D(snowD(15));

// 48 segments: 1 Red, 2 Orange, 5 Blue, 20 Snowflake, 20 Icicle (bonus chance 8/48 ≈ 1 spin in 6)
export const N = 48, ARC = TAU / N;
export const WHEEL: BetKey[] = (() => {
  const w: (BetKey | null)[] = new Array(N).fill(null);
  w[0] = "red";
  [16, 32].forEach(i => (w[i] = "orange"));
  [5, 11, 22, 27, 40].forEach(i => (w[i] = "blue"));
  let alt = 0;
  for (let i = 0; i < N; i++) if (!w[i]) w[i] = alt++ % 2 ? "ice" : "snow";
  return w as BetKey[];
})();

export const CHIPS = [
  { v: 10, l: "10", c: "#c0392b" }, { v: 100, l: "100", c: "#1e9e58" }, { v: 500, l: "500", c: "#22313f" },
  { v: 1000, l: "1K", c: "#8e44ad" }, { v: 5000, l: "5K", c: "#d35400" },
];
/** Free play-chip top-ups. There is no real money anywhere in this game. */
export const TOPUPS = [{ v: 10000, l: "+10K" }, { v: 50000, l: "+50K" }, { v: 100000, l: "+1 Lakh" }, { v: 1000000, l: "+10 Lakh" }];

export const START_BALANCE = 100000;
export const BET_TIME = 8;          // seconds bets stay open
export const RESULT_HOLD = 1900;    // ms the result stays on screen before "NEXT GAME SOON"
export const NEXT_ROUND = 3300;     // ms after a result before betting reopens
