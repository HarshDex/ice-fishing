// Realistic fish, painted once into sprites (head at +x, mouth at 50,0, 100 units long) and then
// drawn in slices by the bonus scene so the body can flex.
import { TAU, seeded } from "../core/util";

// Each fish is painted once into a sprite (head at +x, mouth at 50,0, 100 units long), then drawn in slices so the body can flex.
export const FISH = {
  blue:   { seed: 4, d: .9, back: "#0a1f45", flank: "#2a74c8", low: "#86c2f0", belly: "#eef7ff", fin: "#2f8ee6", finDark: "#0a2a5a", tail: "#2470c0", iris: "#f2d24a", eye: 3.4, barCol: "rgba(4,16,44,.45)",
            dorsal: [{ x0: 25, x1: 3, h: 13, spiny: true, col: "#16407a" }, { x0: 0, x1: -20, h: 9.5, col: "#1f5aa0" }], anal: { x0: -8, x1: -22, h: 8.5 }, pelvicX: 11, marks: "bars" },
  orange: { seed: 15, d: .98, back: "#622600", flank: "#ee7414", low: "#ffae52", belly: "#fff0d8", fin: "#ff8a1c", finDark: "#6a2400", tail: "#e06a0e", iris: "#ffe36a", eye: 3,
            spotCol: "rgba(70,24,0,.72)", ringDot: "#7a2600",
            dorsal: [{ x0: 11, x1: -8, h: 12.5, col: "#b24d06" }], adipose: true, anal: { x0: -12, x1: -24, h: 8.5 }, pelvicX: 0, marks: "spots" },
  red:    { seed: 23, d: 1.08, back: "#560505", flank: "#d6241a", low: "#f2664c", belly: "#ffe0d2", fin: "#e0261a", finDark: "#5a0505", tail: "#c01810", iris: "#ffd23a", eye: 3.6,
            dorsal: [{ x0: 24, x1: -2, h: 14, spiny: true, col: "#a8120c" }, { x0: -3, x1: -21, h: 10, col: "#c41a12" }], anal: { x0: -7, x1: -22, h: 9.5 }, pelvicX: 10, marks: "none" },
};
export function renderFish(c, sp) {
  const ped = 4.2 + 1.6 * sp.d, HT = 15.5 * sp.d, HB = 17 * sp.d, p = sp.snout ? .9 : .74, q = sp.snout ? .72 : 1;
  const lobe = (u, pw) => Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(u, pw))), q);
  const top = u => HT * lobe(u, p) + ped * u * u, bot = u => HB * lobe(u, p + .06) + ped * u * u;
  const U = x => Math.min(1, Math.max(0, (50 - x) / 82)), yT = x => -top(U(x)), yB = x => bot(U(x));
  const r = seeded(sp.seed), lerp = (a, b, v) => a + (b - a) * v;
  const body = new Path2D();
  for (let i = 0; i <= 64; i++) body.lineTo(50 - 82 * i / 64, -top(i / 64));
  for (let i = 64; i >= 0; i--) body.lineTo(50 - 82 * i / 64, bot(i / 64));
  body.closePath();
  c.lineJoin = "round"; c.lineCap = "round";
  let g;
  const td = .75 + .3 * sp.d, tail = new Path2D();
  tail.moveTo(-30, -ped); tail.quadraticCurveTo(-41, -ped - 3, -50, -17 * td); tail.quadraticCurveTo(-46, -6 * td, -43.5, 0);
  tail.quadraticCurveTo(-46, 6 * td, -50, 17 * td); tail.quadraticCurveTo(-41, ped + 3, -30, ped); tail.closePath();
  g = c.createLinearGradient(-30, 0, -51, 0); g.addColorStop(0, sp.tail); g.addColorStop(.6, sp.fin); g.addColorStop(1, sp.finDark);
  c.fillStyle = g; c.fill(tail);
  c.save(); c.clip(tail); c.lineWidth = .35;
  for (let k = -10; k <= 10; k++) { c.strokeStyle = k % 2 ? "rgba(0,0,0,.3)" : "rgba(255,255,255,.18)"; c.beginPath(); c.moveTo(-30, k * ped / 10 * .9); c.lineTo(-53, k * 1.9 * td); c.stroke(); }
  c.restore(); c.strokeStyle = "rgba(0,0,0,.5)"; c.lineWidth = .5; c.stroke(tail);
  const fin = (x0, x1, h, side, spiny, col) => {
    const n = spiny ? 9 : 8, pts = [];
    for (let i = 0; i <= n; i++) {
      const v = i / n, x = lerp(x0, x1, v), base = (side < 0 ? yT(x) : yB(x)) - side;
      const sh = Math.pow(Math.sin(Math.PI * (.2 + .7 * v)), .7) * (spiny ? 1 : 1 - .3 * v);
      pts.push([x, base, x - (spiny ? 1.2 : 3.2), base + side * h * sh]);
    }
    const P = new Path2D(); P.moveTo(pts[0][0], pts[0][1]); P.lineTo(pts[0][2], pts[0][3]);
    for (let i = 1; i <= n; i++) {
      if (spiny) P.quadraticCurveTo((pts[i - 1][2] + pts[i][2]) / 2, lerp((pts[i - 1][3] + pts[i][3]) / 2, pts[i][1], .2), pts[i][2], pts[i][3]);
      else P.lineTo(pts[i][2], pts[i][3]);
    }
    P.lineTo(pts[n][0], pts[n][1]); P.closePath();
    const by = pts[4][1];
    g = c.createLinearGradient(0, by, 0, by + side * h); g.addColorStop(0, col); g.addColorStop(1, sp.finDark);
    c.globalAlpha = .93; c.fillStyle = g; c.fill(P); c.globalAlpha = 1;
    c.lineWidth = spiny ? .45 : .32;
    pts.forEach(q2 => { c.strokeStyle = spiny ? "rgba(255,255,255,.4)" : "rgba(0,0,0,.3)"; c.beginPath(); c.moveTo(q2[0], q2[1]); c.lineTo(q2[2], q2[3]); c.stroke(); });
    c.strokeStyle = "rgba(0,0,0,.5)"; c.lineWidth = .45; c.stroke(P);
  };
  sp.dorsal.forEach(d => fin(d.x0, d.x1, d.h, -1, d.spiny, d.col));
  fin(sp.anal.x0, sp.anal.x1, sp.anal.h, 1, false, sp.fin);
  if (sp.adipose) { c.fillStyle = sp.finDark; c.beginPath(); c.ellipse(-22, yT(-22) - 1.2, 2.6, 1.8, -.5, 0, TAU); c.fill(); }
  const px = sp.pelvicX, pyb = yB(px), pel = new Path2D();
  pel.moveTo(px + 3, pyb - 1); pel.quadraticCurveTo(px - 1, pyb + 8, px - 10, pyb + 9); pel.quadraticCurveTo(px - 6, pyb + 3, px - 4, pyb - 1); pel.closePath();
  c.fillStyle = sp.fin; c.fill(pel); c.strokeStyle = "rgba(0,0,0,.45)"; c.lineWidth = .4; c.stroke(pel);
  g = c.createLinearGradient(0, -HT, 0, HB);
  g.addColorStop(0, sp.back); g.addColorStop(.2, sp.back); g.addColorStop(.46, sp.flank); g.addColorStop(.7, sp.low); g.addColorStop(.86, sp.belly); g.addColorStop(1, sp.belly);
  c.fillStyle = g; c.fill(body);
  c.save(); c.clip(body);
  if (sp.marks === "bars") {
    c.fillStyle = sp.barCol || "rgba(22,30,10,.52)";
    [23, 15, 7, -2, -11, -20, -27].forEach(bx => { c.beginPath(); c.moveTo(bx - 2.5, yT(bx) - 1); c.lineTo(bx + 2.5, yT(bx) - 1); c.lineTo(bx + .5, HB * .28); c.lineTo(bx - 1, HB * .32); c.closePath(); c.fill(); });
  } else if (sp.marks === "ovals") {
    c.fillStyle = "rgba(235,238,172,.72)";
    for (let i = 0; i < 80; i++) { const x = -31 + r() * 58, y = lerp(yT(x) * .72, yB(x) * .5, r()); c.beginPath(); c.ellipse(x, y, 1.1 + r() * 1.6, .55 + r() * .45, r() * .3 - .15, 0, TAU); c.fill(); }
  } else if (sp.marks === "spots") {
    for (let i = 0; i < 95; i++) {
      const x = -31 + r() * 72, y = lerp(yT(x) * .92, yB(x) * .28, r()), rad = .45 + r() * .8;
      if (i % 7 === 0) { c.fillStyle = "rgba(255,240,205,.65)"; c.beginPath(); c.arc(x, y, rad + .7, 0, TAU); c.fill(); c.fillStyle = sp.ringDot || "#b8361a"; }
      else c.fillStyle = sp.spotCol || "rgba(32,20,6,.78)";
      c.beginPath(); c.arc(x, y, rad, 0, TAU); c.fill();
    }
  }
  c.save(); c.beginPath(); c.rect(-34, -40, 63, 80); c.clip(); c.lineWidth = .32;
  for (let x = -33; x < 30; x += 3) for (let y = -HT - 2, row = 0; y < HB + 2; y += 2.6, row++) {
    const cx = x + (row % 2 ? 1.5 : 0);
    c.strokeStyle = "rgba(0,0,0,.22)"; c.beginPath(); c.arc(cx, y, 2.25, Math.PI * .5, Math.PI * 1.5); c.stroke();
    c.strokeStyle = "rgba(255,255,255,.2)"; c.beginPath(); c.arc(cx + .55, y, 2.25, Math.PI * .62, Math.PI * 1.38); c.stroke();
  }
  c.restore();
  c.strokeStyle = "rgba(0,0,0,.25)"; c.lineWidth = .45; c.beginPath(); c.moveTo(28, -1.6 * sp.d); c.quadraticCurveTo(0, -4.2 * sp.d, -31, 0); c.stroke();
  g = c.createLinearGradient(0, -HT, 0, -HT * .4); g.addColorStop(0, "rgba(0,0,0,.42)"); g.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = g; c.fillRect(-60, -40, 120, 80);
  g = c.createLinearGradient(0, -HT * .8, 0, HT * .05); g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(.42, "rgba(255,255,255,.36)"); g.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = g; c.fillRect(-60, -40, 120, 80);
  g = c.createLinearGradient(0, HB * .42, 0, HB); g.addColorStop(0, "rgba(60,40,20,0)"); g.addColorStop(1, "rgba(60,40,20,.42)"); c.fillStyle = g; c.fillRect(-60, -40, 120, 80);
  g = c.createLinearGradient(-18, 0, -34, 0); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.24)"); c.fillStyle = g; c.fillRect(-60, -40, 120, 80);
  const hx = sp.snout ? 26 : 29;
  g = c.createRadialGradient(40, -2, 1, 40, -2, 17); g.addColorStop(0, "rgba(255,255,255,.2)"); g.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = g; c.fillRect(20, -30, 32, 60);
  c.lineWidth = .7; c.strokeStyle = "rgba(0,0,0,.45)"; c.beginPath(); c.moveTo(hx + 1.5, yT(hx) * .82); c.quadraticCurveTo(hx - 8, 1, hx, yB(hx) * .8); c.stroke();
  c.lineWidth = .4; c.strokeStyle = "rgba(255,255,255,.34)"; c.beginPath(); c.moveTo(hx + 2.3, yT(hx) * .8); c.quadraticCurveTo(hx - 7, 1, hx + .9, yB(hx) * .78); c.stroke();
  c.lineWidth = .5; c.strokeStyle = "rgba(0,0,0,.24)"; c.beginPath(); c.moveTo(hx + 7, yT(hx + 7) * .55); c.quadraticCurveTo(hx + 2, 2, hx + 6.5, yB(hx + 7) * .72); c.stroke();
  g = c.createLinearGradient(-26, 0, 34, 0); g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(.5, "rgba(255,255,255,.62)"); g.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = g; c.beginPath(); c.ellipse(4, -HT * .6, 30, 1.05 * sp.d, 0, 0, TAU); c.fill();
  c.fillStyle = "rgba(255,255,255,.5)";
  for (let i = 0; i < 6; i++) { const x = -24 + r() * 50; c.beginPath(); c.ellipse(x, yT(x) * (.5 + r() * .3), 1.5 + r() * 2.5, .35, 0, 0, TAU); c.fill(); }
  c.restore();
  c.strokeStyle = "rgba(10,10,5,.6)"; c.lineWidth = .5; c.stroke(body);
  const ex = sp.snout ? 35 : 39.5, ey = yT(ex) * .44, er = sp.eye;
  c.fillStyle = "#15100a"; c.beginPath(); c.arc(ex, ey, er + .55, 0, TAU); c.fill();
  g = c.createRadialGradient(ex - .6, ey - .7, .2, ex, ey, er); g.addColorStop(0, "#fff6c8"); g.addColorStop(.45, sp.iris); g.addColorStop(1, "#6a4208");
  c.fillStyle = g; c.beginPath(); c.arc(ex, ey, er, 0, TAU); c.fill();
  c.fillStyle = "#050505"; c.beginPath(); c.arc(ex + .2, ey, er * .56, 0, TAU); c.fill();
  c.fillStyle = "#fff"; c.beginPath(); c.arc(ex - er * .3, ey - er * .36, er * .24, 0, TAU); c.fill();
  c.fillStyle = "rgba(255,255,255,.6)"; c.beginPath(); c.arc(ex + er * .32, ey + er * .3, er * .1, 0, TAU); c.fill();
  const mx = sp.snout ? 38.5 : 43.5;
  c.strokeStyle = "rgba(0,0,0,.65)"; c.lineWidth = .6; c.beginPath(); c.moveTo(50, .2); c.quadraticCurveTo(46.5, yB(46.5) * .3 + .8, mx, yB(mx) * .5); c.stroke();
  c.strokeStyle = "rgba(255,255,255,.3)"; c.lineWidth = .35; c.beginPath(); c.moveTo(49.5, -.5); c.quadraticCurveTo(46.5, yB(46.5) * .3, mx + .5, yB(mx) * .5 - .7); c.stroke();
  c.fillStyle = "rgba(0,0,0,.6)"; c.beginPath(); c.arc(46, yT(46) * .55, .42, 0, TAU); c.fill();
  const fb = yB(25) * .34, pec = new Path2D();
  pec.moveTo(26, fb); pec.quadraticCurveTo(19, fb + 1.5, 11, fb + 7.5 * sp.d + 2); pec.quadraticCurveTo(18.5, fb + 8.5 * sp.d + 2.5, 25, fb + 4.5); pec.closePath();
  g = c.createLinearGradient(26, fb, 11, fb + 9); g.addColorStop(0, sp.fin); g.addColorStop(1, sp.finDark);
  c.globalAlpha = .85; c.fillStyle = g; c.fill(pec); c.globalAlpha = 1;
  c.save(); c.clip(pec); c.strokeStyle = "rgba(0,0,0,.3)"; c.lineWidth = .3;
  for (let k = 0; k < 8; k++) { c.beginPath(); c.moveTo(26, fb + 1.5); c.lineTo(9, fb + 2 + k * 1.5 * sp.d + k * .4); c.stroke(); }
  c.restore(); c.strokeStyle = "rgba(0,0,0,.5)"; c.lineWidth = .4; c.stroke(pec);
}
export const SPR_K = 5, fishSprites = {};
export function fishSprite(key) {
  if (fishSprites[key]) return fishSprites[key];
  const cv = document.createElement("canvas"); cv.width = 110 * SPR_K; cv.height = 76 * SPR_K;
  const c = cv.getContext("2d"); c.scale(SPR_K, SPR_K); c.translate(55, 38);
  renderFish(c, FISH[key]);
  return fishSprites[key] = cv;
}

