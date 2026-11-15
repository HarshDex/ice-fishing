// Headless check of the wheel physics: spins the wheel thousands of times and reports how long
// spins last, whether every segment comes up equally often, and that it never rests on a divider.
//   npm run sim            (default 4000 spins)
//   npm run sim -- 20000
import { WheelPhysics } from "../src/wheel/physics";
import { ARC, N, WHEEL } from "../src/game/config";

const spins = +(process.argv[2] ?? 4000), FRAME = 1000 / 60;
const hits = new Array(N).fill(0), byType: Record<string, number> = {};
let tMin = 1e9, tMax = 0, tSum = 0, turnsSum = 0, crawlSum = 0, worstEdge = 1, rollbacks = 0, stuck = 0;

for (let s = 0; s < spins; s++) {
  const p = new WheelPhysics();
  p.rot = Math.random() * Math.PI * 2;                    // in the game the wheel keeps its angle between rounds
  let now = 1000;
  p.advance(now);
  const idle = 500 + Math.random() * 9000;                 // idle for a random while so the start angle varies
  for (let t = 0; t < idle; t += FRAME) p.advance((now += FRAME));
  const startRot = p.rot, t0 = now;
  p.startSpin();
  let stopped = false, tenseAt = 0, minW = 0;
  while (!stopped && now - t0 < 60000) {
    stopped = p.advance((now += FRAME));
    if (!tenseAt && !p.launching && p.w < 1) tenseAt = now;
    if (p.w < minW) minW = p.w;
  }
  if (!stopped) { stuck++; continue; }
  const dur = (now - t0) / 1000;
  tMin = Math.min(tMin, dur); tMax = Math.max(tMax, dur); tSum += dur;
  turnsSum += (p.rot - startRot) / (Math.PI * 2);
  crawlSum += (now - tenseAt) / 1000;
  if (minW < -1e-3) rollbacks++;
  const idx = p.index(); hits[idx]++; byType[WHEEL[idx]] = (byType[WHEEL[idx]] ?? 0) + 1;
  const f = p.pegGap() / ARC;                               // 0 or 1 = a peg exactly under the pointer
  worstEdge = Math.min(worstEdge, f, 1 - f);
}

const done = spins - stuck, exp = done / N;
const chi2 = hits.reduce((a, h) => a + (h - exp) ** 2 / exp, 0);
console.log(`spins            ${spins}  (never stopped: ${stuck})`);
console.log(`spin length      min ${tMin.toFixed(1)}s  avg ${(tSum / done).toFixed(1)}s  max ${tMax.toFixed(1)}s`);
console.log(`turns per spin   avg ${(turnsSum / done).toFixed(2)}`);
console.log(`slow finish      avg ${(crawlSum / done).toFixed(1)}s below 1 rad/s`);
console.log(`pushed back      ${(100 * rollbacks / done).toFixed(1)}% of spins end with the flapper shoving the wheel back`);
console.log(`closest to peg   ${(worstEdge * 100).toFixed(1)}% of a segment (0% would be resting on a divider)`);
console.log(`fairness         chi-square ${chi2.toFixed(1)} over ${N} segments (about ${N - 1} is ideal, above ~75 is suspicious)`);
console.log(`by type          ` + Object.entries(byType).map(([k, v]) => `${k} ${(100 * v / done).toFixed(1)}%`).join("  "));
console.log(`expected         ` + ["snow", "ice", "blue", "orange", "red"].map(k => `${k} ${(100 * WHEEL.filter(w => w === k).length / N).toFixed(1)}%`).join("  "));
