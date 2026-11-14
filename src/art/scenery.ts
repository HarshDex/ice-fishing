// Shared scenery helpers: mountain ridges and aurora bands.
import { seeded } from "../core/util";

export function ridge(seed, n) { const r = seeded(seed); return Array.from({ length: n + 1 }, (_, i) => i % 2 ? .55 + r() * .45 : .15 + r() * .3); }
export function drawRidge(c, arr, W, baseY, h, fill) {
  c.beginPath(); c.moveTo(0, baseY);
  arr.forEach((v, i) => c.lineTo(i / (arr.length - 1) * W, baseY - v * h));
  c.lineTo(W, baseY); c.closePath(); c.fillStyle = fill; c.fill();
}
export function aurora(c, W, t, y0, h, amp, rgb, ph) {
  const g = c.createLinearGradient(0, y0 - amp, 0, y0 + h + amp * 2);
  g.addColorStop(0, "rgba(" + rgb + ",0)"); g.addColorStop(.3, "rgba(" + rgb + ",.32)"); g.addColorStop(1, "rgba(" + rgb + ",0)");
  const f = x => y0 + Math.sin(x / W * 5 + t * .5 + ph) * amp + Math.sin(x / W * 11 - t * .3 + ph * 2) * amp * .4;
  c.fillStyle = g; c.beginPath();
  for (let x = 0; x <= W + 16; x += 16) c.lineTo(x, f(x));
  for (let x = W + 16; x >= -16; x -= 16) c.lineTo(x, f(x) + h + Math.sin(x / W * 7 + t * .4) * amp * .6);
  c.closePath(); c.fill();
}
