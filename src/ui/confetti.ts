// Confetti bursts on a full-screen canvas that only redraws while pieces are flying.
import { $, TAU, rnd } from "../core/util";

const fx = $("fx") as HTMLCanvasElement, fctx = fx.getContext("2d")!;
let parts = [], fxDirty = false;
const CONFETTI = ["#ffd95a", "#ffffff", "#59d8ff", "#ff8a3c", "#20d3a3", "#c485ea"];
export function burst(x, y, n) {
  for (let i = 0; i < n; i++) parts.push({
    x, y, vx: (Math.random() - .5) * 20, vy: -Math.random() * 13 - 2, life: 1, rot: Math.random() * 6, vr: (Math.random() - .5) * .5,
    s: 4 + Math.random() * 7, c: CONFETTI[rnd(0, CONFETTI.length - 1)], round: Math.random() < .35
  });
}
export function drawFx() {
  if (!parts.length && !fxDirty) return;
  fctx.clearRect(0, 0, fx.width, fx.height); fxDirty = parts.length > 0;
  parts = parts.filter(p => p.life > 0 && p.y < fx.height + 20);
  for (const p of parts) {
    p.x += p.vx; p.y += p.vy; p.vy += .32; p.vx *= .985; p.rot += p.vr; p.life -= .011;
    fctx.save(); fctx.globalAlpha = Math.min(1, p.life * 2.5); fctx.translate(p.x, p.y); fctx.rotate(p.rot); fctx.fillStyle = p.c;
    if (p.round) { fctx.beginPath(); fctx.arc(0, 0, p.s / 2, 0, TAU); fctx.fill(); } else fctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
    fctx.restore();
  }
}


export function sizeFx() { fx.width = innerWidth; fx.height = innerHeight; }
