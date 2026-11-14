// The fishing bonus: the fish rises head-first and its multiplier climbs with every bit that clears the water.
// When the rod stalls, bigger lifters arrive in turn: crane -> helicopter -> cargo jet -> giant robot.
// Everything is drawn on a 2D canvas for now; this is the module to rebuild in Three.js next.
import { $, DISPLAY, TAU, fmt, seeded, smooth } from "../core/util";
import { TYPES, type BetKey } from "../game/config";
import { bus } from "../core/events";
import { ac, chime, hiss, splashSound, thud, tone } from "../audio/audio";
import { burst } from "../ui/confetti";
import { aurora, drawRidge, ridge } from "../art/scenery";
import { SPR_K, fishSprite } from "./fishArt";

// The fish comes out head first and the multiplier climbs with every bit of fish that clears the water,
// so nobody knows how long it is until the tail appears. Each lifter can only raise so much fish:
// rod -> crane -> helicopter -> cargo jet -> giant robot. When one stalls, the next is called in.
export const sc = $("scene") as HTMLCanvasElement, sceneCtx = sc.getContext("2d")!;
export const SW = 720, SH = 460, ICE = 300, HX = 440, HY = 356;
export const WX0 = -580, WY0 = -660, WW = 1900, WH = 1180, BGQ = 1.5; // the world is painted once; the camera zooms out over it
sc.width = SW * 2; sc.height = SH * 2;
export let sx: CanvasRenderingContext2D = sceneCtx, drops: any[] = [], bonusRun: object | null = null, cableCol = "#e6eef5";
export const rr = (x, y, w, h, r) => { sx.beginPath(); sx.roundRect(x, y, w, h, r); sx.fill(); };
export const circ = (x, y, r) => { sx.beginPath(); sx.arc(x, y, r, 0, TAU); sx.fill(); };
export const ell = (x, y, rx, ry) => { sx.beginPath(); sx.ellipse(x, y, rx, ry, 0, 0, TAU); sx.fill(); };
export const line = (x1, y1, x2, y2) => { sx.beginPath(); sx.moveTo(x1, y1); sx.lineTo(x2, y2); sx.stroke(); };
export function drawPine(x, y, h) {
  sx.fillStyle = "#3b2413"; sx.fillRect(x - 2, y - h * .15, 4, h * .15);
  for (let k = 0; k < 3; k++) {
    const w = h * (.34 - k * .08), tp = y - h * (.5 + k * .25), base = y - h * (.12 + k * .24);
    sx.fillStyle = "#0e3a3a"; sx.beginPath(); sx.moveTo(x - w, base); sx.lineTo(x, tp); sx.lineTo(x + w, base); sx.closePath(); sx.fill();
    sx.fillStyle = "#e4f5fccc"; sx.beginPath(); sx.moveTo(x - w * .45, base - (base - tp) * .55); sx.lineTo(x, tp); sx.lineTo(x + w * .3, base - (base - tp) * .7); sx.closePath(); sx.fill();
  }
}
export const sceneBg = (() => {
  const cv = document.createElement("canvas"); cv.width = WW * BGQ; cv.height = WH * BGQ;
  const main = sx; sx = cv.getContext("2d"); sx.scale(BGQ, BGQ); sx.translate(-WX0, -WY0);
  const r = seeded(3), Y1 = WY0 + WH;
  let g = sx.createLinearGradient(0, WY0, 0, ICE); g.addColorStop(0, "#02060f"); g.addColorStop(.5, "#061630"); g.addColorStop(.85, "#0e3558"); g.addColorStop(1, "#4a9cba");
  sx.fillStyle = g; sx.fillRect(WX0, WY0, WW, ICE - WY0);
  for (let i = 0; i < 420; i++) { sx.globalAlpha = .3 + r() * .6; sx.fillStyle = "#fff"; const s = 1.2 + r() * 1.8; sx.fillRect(WX0 + r() * WW, WY0 + r() * (ICE - 70 - WY0), s, s); }
  sx.globalAlpha = 1;
  g = sx.createRadialGradient(108, 66, 10, 108, 66, 90); g.addColorStop(0, "rgba(220,245,255,.5)"); g.addColorStop(1, "rgba(220,245,255,0)");
  sx.fillStyle = g; circ(108, 66, 90); sx.fillStyle = "#f4fbff"; circ(108, 66, 24); sx.fillStyle = "#d6e9f3"; circ(100, 60, 5); circ(116, 74, 3.5);
  sx.save(); sx.translate(WX0, 0); sx.globalCompositeOperation = "lighter";
  aurora(sx, WW, 1.3, 46, 90, 18, "70,255,170", 0); aurora(sx, WW, 1.3, 92, 80, 14, "80,190,255", 2); aurora(sx, WW, 1.3, 26, 70, 12, "190,120,255", 4.2);
  aurora(sx, WW, 2.1, -250, 160, 40, "70,255,170", 1); aurora(sx, WW, .4, -480, 190, 50, "190,120,255", 3);
  sx.globalCompositeOperation = "source-over";
  g = sx.createLinearGradient(0, ICE - 130, 0, ICE); g.addColorStop(0, "#9ccbe2"); g.addColorStop(1, "#356d90");
  drawRidge(sx, ridge(7, 36), WW, ICE, 130, g);
  g = sx.createLinearGradient(0, ICE - 60, 0, ICE); g.addColorStop(0, "#f1faff"); g.addColorStop(1, "#9fcfe5");
  drawRidge(sx, ridge(21, 24), WW, ICE, 62, g);
  sx.restore();
  g = sx.createLinearGradient(0, ICE, 0, Y1); g.addColorStop(0, "#cfeaf7"); g.addColorStop(.3, "#f6fcff"); g.addColorStop(1, "#a4cfe4");
  sx.fillStyle = g; sx.fillRect(WX0, ICE, WW, Y1 - ICE);
  sx.fillStyle = "#ffffffcc";
  [[120, 330, 110, 10], [600, 322, 130, 9], [330, 430, 180, 14], [660, 420, 90, 10], [60, 420, 100, 12]].forEach(d => ell(d[0], d[1], d[2], d[3]));
  for (let i = 0; i < 16; i++) ell(WX0 + r() * WW, ICE + 20 + r() * (Y1 - ICE - 30), 70 + r() * 120, 7 + r() * 8);
  g = sx.createLinearGradient(0, ICE - 46, 0, ICE + 34); g.addColorStop(0, "rgba(225,242,255,0)"); g.addColorStop(.55, "rgba(225,242,255,.5)"); g.addColorStop(1, "rgba(225,242,255,0)");
  sx.fillStyle = g; sx.fillRect(WX0, ICE - 46, WW, 80); // haze on the horizon
  const hx = 64, hy = ICE + 4; // cabin
  sx.fillStyle = "#5b3a1e"; sx.fillRect(hx, hy - 26, 44, 26);
  sx.fillStyle = "#3b2413"; sx.fillRect(hx + 7, hy - 18, 10, 18); sx.fillRect(hx + 31, hy - 46, 6, 14);
  sx.fillStyle = "#f4fbff"; sx.beginPath(); sx.moveTo(hx - 6, hy - 25); sx.lineTo(hx + 22, hy - 46); sx.lineTo(hx + 50, hy - 25); sx.closePath(); sx.fill();
  g = sx.createRadialGradient(hx + 31, hy - 14, 1, hx + 31, hy - 14, 26); g.addColorStop(0, "rgba(255,217,90,.7)"); g.addColorStop(1, "rgba(255,217,90,0)");
  sx.fillStyle = g; circ(hx + 31, hy - 14, 26); sx.fillStyle = "#ffe27a"; sx.fillRect(hx + 26, hy - 19, 10, 10);
  drawPine(150, ICE + 6, 62); drawPine(-40, ICE + 4, 70); drawPine(-180, ICE + 2, 50); drawPine(-330, ICE + 6, 84); drawPine(-470, ICE + 3, 58);
  sx.strokeStyle = "#7fbcd9aa"; sx.lineWidth = 1.2;
  [[[372, 372], [340, 392], [300, 398]], [[470, 398], [500, 424], [540, 432]], [[300, 440], [250, 470], [180, 476]]].forEach(p => { sx.beginPath(); p.forEach((q, i) => i ? sx.lineTo(q[0], q[1]) : sx.moveTo(q[0], q[1])); sx.stroke(); });
  sx = main; return cv;
})();

// --- fish size: thickness is fixed per bonus type, the length (a stretch of the mid-body) carries the multiplier
export const FISH_G = { blue: 1.1, orange: 1.7, red: 2.6 }, ST_MIN = .6, ST_MAX = 2.4, LEN_GAMMA = .8;
export const CAP = [150, 230, 300, 365, 1e9];                 // how much fish (px) each lifter can raise: rod, crane, helicopter, cargo jet, robot
export const SPEED = [46, 42, 40, 38, 36], ARRIVE = [0, 2.2, 2.2, 2.5, 3.1], ZOOM = [1, .86, .7, .58, .44];
export const CALL = ["", "BRING IN THE CRANE!", "SEND THE HELICOPTER!", "CALL THE CARGO JET!", "RELEASE THE ROBOT!"];
export const lenRange = k => [FISH_G[k] * (56 + 44 * ST_MIN), FISH_G[k] * (56 + 44 * ST_MAX)];
export function fishLen(key, m) { const [lo, hi] = TYPES[key].bonus, [a, b] = lenRange(key); return a + (b - a) * Math.pow(Math.log(m / lo) / Math.log(hi / lo), LEN_GAMMA); }
export function multAt(key, v) { // the multiplier a fish of visible length v would be worth
  const [lo, hi] = TYPES[key].bonus, [a, b] = lenRange(key);
  if (v <= a) return Math.max(1, Math.round(1 + (lo - 1) * v / a));
  return Math.round(lo * Math.pow(hi / lo, Math.pow(Math.min(1, (v - a) / (b - a)), 1 / LEN_GAMMA)));
}
export function rollFish(key) {
  const [lo, hi] = TYPES[key].bonus;
  return lo + Math.floor((hi - lo) * Math.pow(Math.random(), 3));
}
export function drawFish(spr, x, y, g, st, ang, t, wig, th) { // mouth at (x,y); head and tail keep their shape, the mid-body is stretched by st, th fattens the body
  const n = 55, wu = 110 / n, total = 56 + 44 * st;
  const dOf = xu => { const du = 50 - xu; return du < 28 ? du : du < 72 ? 28 + (du - 28) * st : 28 + 44 * st + (du - 72); };
  sx.save(); sx.translate(x, y); sx.rotate(ang - Math.PI / 2);
  for (let i = 0; i < n; i++) {
    const xa = -55 + i * wu, d0 = dOf(xa + wu), d1 = dOf(xa), u = Math.max(0, (d0 + d1) / 2 / total);
    const offY = Math.sin(t * 14 - u * 5) * wig * Math.pow(u, 1.6);
    sx.drawImage(spr, i * wu * SPR_K, 0, wu * SPR_K, spr.height, -d1 * g, (-38 + offY) * g * th, (d1 - d0) * g + .7, 76 * g * th);
  }
  sx.restore();
}
export function drawFisher(lean, cheer) {
  const fxp = 248, fy = 372, hip = fy - 46;
  sx.fillStyle = "rgba(30,80,110,.22)"; ell(fxp + 4, fy + 2, 42, 8);
  sx.fillStyle = "#1f2f46"; rr(fxp - 15, hip - 2, 13, 40, 5); rr(fxp + 2, hip - 2, 13, 40, 5);
  sx.fillStyle = "#4a2c12"; rr(fxp - 18, fy - 12, 19, 13, 5); rr(fxp, fy - 12, 22, 13, 5);
  sx.save(); sx.translate(fxp, hip); sx.rotate(lean);
  const g = sx.createLinearGradient(-22, 0, 22, 0); g.addColorStop(0, "#a82315"); g.addColorStop(.5, "#f0603f"); g.addColorStop(1, "#c4321f");
  sx.fillStyle = g; rr(-21, -64, 42, 70, 14);
  sx.fillStyle = "#f6efe4"; rr(-23, -3, 46, 10, 5);
  sx.strokeStyle = "#7d140b"; sx.lineWidth = 1.5; line(0, -54, 0, -3);
  sx.fillStyle = "#f6efe4"; for (let k = 0; k < 14; k++) circ(2 + Math.cos(k / 14 * TAU) * 17, -80 + Math.sin(k / 14 * TAU) * 17, 6);
  sx.fillStyle = "#c4321f"; circ(2, -80, 16);
  sx.fillStyle = "#f4cfa6"; circ(5, -79, 11.5);
  sx.fillStyle = "#222"; circ(10.5, -81, 1.7);
  sx.fillStyle = "#f29b8b99"; circ(8, -75, 2.8);
  sx.strokeStyle = "#8a4b2a"; sx.lineWidth = 1.3; sx.beginPath(); sx.arc(9, -77.5, 4, .3, 1.5); sx.stroke();
  sx.fillStyle = "#1e88c9"; rr(-10, -68, 25, 8, 4);
  sx.strokeStyle = "#a82315"; sx.lineWidth = 13; sx.lineCap = "round";
  sx.beginPath(); sx.moveTo(4, -50);
  if (cheer) sx.quadraticCurveTo(26, -60, 30, -92); else sx.quadraticCurveTo(14, -26, 34, -34);
  sx.stroke();
  sx.restore();
  const c = Math.cos(lean), s = Math.sin(lean), ax = cheer ? 30 : 36, ay = cheer ? -92 : -34;
  return { x: fxp + c * ax - s * ay, y: hip + s * ax + c * ay };
}
export function drawCrane(ox, active, hookX, hookY) {
  sx.save(); sx.translate(ox, 0);
  const bx = HX + 262, gy = HY + 28, tipX = HX, tipY = HY - 340, px = bx - 8, py = gy - 86;
  sx.fillStyle = "rgba(30,80,110,.2)"; ell(bx + 14, gy + 2, 110, 10);
  sx.fillStyle = "#1b222b"; rr(bx - 70, gy - 26, 172, 26, 13);
  sx.fillStyle = "#3a4654"; for (let k = 0; k < 6; k++) circ(bx - 52 + k * 27, gy - 13, 8);
  let g = sx.createLinearGradient(0, gy - 80, 0, gy - 24); g.addColorStop(0, "#ffd84d"); g.addColorStop(1, "#d99a00");
  sx.fillStyle = g; rr(bx - 58, gy - 80, 142, 56, 8);
  sx.fillStyle = "#1b222b"; rr(bx + 52, gy - 76, 30, 48, 4);
  for (let k = 0; k < 5; k++) { sx.fillStyle = k % 2 ? "#1b222b" : "#ffd84d"; sx.fillRect(bx - 56 + k * 20, gy - 34, 20, 8); }
  sx.fillStyle = "#ffe27a"; rr(bx - 52, gy - 116, 54, 42, 6); sx.fillStyle = "#9fe3ff"; rr(bx - 46, gy - 110, 32, 24, 4);
  sx.lineCap = "round";
  sx.strokeStyle = "#5d6b78"; sx.lineWidth = 8; line(bx + 34, gy - 80, px + (tipX - px) * .42, py + (tipY - py) * .42);
  sx.strokeStyle = "#8a6400"; sx.lineWidth = 18; line(px, py, tipX, tipY);
  sx.strokeStyle = "#ffd23f"; sx.lineWidth = 12; line(px, py, tipX, tipY);
  sx.strokeStyle = "#7a5200"; sx.lineWidth = 2;
  const nx = -(tipY - py), ny = tipX - px, nl = Math.hypot(nx, ny), ux = nx / nl * 5, uy = ny / nl * 5;
  sx.beginPath();
  for (let k = 0; k <= 16; k++) { const f = k / 16, s = k % 2 ? 1 : -1, x = px + (tipX - px) * f + ux * s, y = py + (tipY - py) * f + uy * s; k ? sx.lineTo(x, y) : sx.moveTo(x, y); }
  sx.stroke();
  sx.fillStyle = "#1b222b"; circ(tipX, tipY, 9);
  sx.strokeStyle = active ? cableCol : "#e6eef5"; sx.lineWidth = 2;
  if (active) line(tipX, tipY, hookX - ox, hookY); else { line(tipX, tipY, tipX, tipY + 46); sx.fillStyle = "#ffd23f"; rr(tipX - 6, tipY + 44, 12, 15, 3); }
  sx.restore();
}
export function drawHeli(cx, cy, t, active, hookX, hookY) { // (cx,cy) is the belly where the cable hangs
  if (active) { sx.strokeStyle = cableCol; sx.lineWidth = 2; line(cx, cy, hookX, hookY); }
  sx.save(); sx.translate(cx, cy - 36); sx.rotate(-.04 + Math.sin(t * 1.7) * .02);
  sx.fillStyle = "#0b6876"; sx.beginPath(); sx.moveTo(40, -10); sx.lineTo(176, -24); sx.lineTo(178, -10); sx.lineTo(40, 16); sx.closePath(); sx.fill();
  sx.beginPath(); sx.moveTo(160, -22); sx.lineTo(186, -58); sx.lineTo(198, -56); sx.lineTo(180, -10); sx.closePath(); sx.fill();
  sx.fillStyle = "rgba(230,245,255,.45)"; ell(190, -38, 5, 24);
  let g = sx.createLinearGradient(0, -36, 0, 36); g.addColorStop(0, "#22c4d8"); g.addColorStop(1, "#0b6876");
  sx.fillStyle = g; ell(0, 0, 80, 36);
  sx.fillStyle = "#f4fbff"; rr(-58, 8, 118, 9, 4);
  sx.fillStyle = "#c9f1ffdd"; sx.beginPath(); sx.ellipse(-44, -6, 28, 20, 0, 0, TAU); sx.fill();
  sx.strokeStyle = "#0b3a44"; sx.lineWidth = 2; sx.beginPath(); sx.ellipse(-44, -6, 28, 20, 0, 0, TAU); sx.stroke();
  sx.strokeStyle = "#22313f"; sx.lineWidth = 4; sx.lineCap = "round"; line(-54, 44, 54, 44); line(-30, 32, -36, 44); line(30, 32, 36, 44); line(0, -36, 0, -50);
  sx.fillStyle = "rgba(230,245,255,.3)"; ell(0, -52, 160, 8);
  sx.fillStyle = "rgba(20,35,50,.55)"; ell(0, -52, 160 * Math.abs(Math.cos(t * 38)) + 6, 3.5);
  sx.restore();
}
export function drawJet(cx, cy, t, active, hookX, hookY) { // hovering cargo jet, belly at (cx,cy)
  if (active) { sx.strokeStyle = cableCol; sx.lineWidth = 2.5; line(cx, cy, hookX, hookY); }
  sx.save(); sx.translate(cx, cy - 50);
  for (const nx of [-170, 170]) { // downward thrusters
    const fl = 70 + Math.sin(t * 50 + nx) * 12, g2 = sx.createLinearGradient(0, 40, 0, 40 + fl * 2);
    g2.addColorStop(0, "rgba(160,235,255,.9)"); g2.addColorStop(1, "rgba(160,235,255,0)");
    sx.fillStyle = g2; sx.beginPath(); sx.moveTo(nx - 20, 44); sx.lineTo(nx + 20, 44); sx.lineTo(nx + 8, 44 + fl * 2); sx.lineTo(nx - 8, 44 + fl * 2); sx.closePath(); sx.fill();
  }
  sx.fillStyle = "#3d4a59"; rr(-250, -30, 500, 22, 11);
  sx.fillStyle = "#4a5766"; sx.beginPath(); sx.moveTo(210, -40); sx.lineTo(292, -124); sx.lineTo(318, -124); sx.lineTo(276, -30); sx.closePath(); sx.fill();
  rr(250, -132, 96, 14, 7);
  let g = sx.createLinearGradient(0, -50, 0, 50); g.addColorStop(0, "#f4f8fb"); g.addColorStop(.6, "#b8c6d2"); g.addColorStop(1, "#6c7a88");
  sx.fillStyle = g; sx.beginPath(); sx.moveTo(-270, 10); sx.quadraticCurveTo(-268, -44, -200, -50); sx.lineTo(220, -50); sx.quadraticCurveTo(300, -40, 300, -6);
  sx.quadraticCurveTo(250, 48, 180, 50); sx.lineTo(-200, 50); sx.quadraticCurveTo(-262, 44, -270, 10); sx.closePath(); sx.fill();
  sx.fillStyle = "#7b4bd6"; sx.fillRect(-246, 2, 520, 9);
  sx.fillStyle = "#0b2a4d"; sx.beginPath(); sx.moveTo(-258, -6); sx.quadraticCurveTo(-250, -34, -212, -38); sx.lineTo(-200, -12); sx.closePath(); sx.fill();
  sx.fillStyle = "#0b2a4dcc"; for (let k = 0; k < 9; k++) rr(-170 + k * 38, -30, 16, 12, 4);
  for (const nx of [-170, 170]) { sx.fillStyle = "#22313f"; rr(nx - 30, -16, 60, 62, 18); sx.fillStyle = "#9fe3ff"; ell(nx, 44, 22, 6); }
  sx.restore();
}
export const ROBOT_X = HX + 500, ROBOT_ARM = 440;
export function limb(x1, y1, x2, y2, w, dark, mid, hi) { // armoured limb: outline, plate, lit edge
  sx.lineCap = "round"; sx.strokeStyle = dark; sx.lineWidth = w; line(x1, y1, x2, y2);
  sx.strokeStyle = mid; sx.lineWidth = w - 12; line(x1, y1, x2, y2);
  const nx = -(y2 - y1), ny = x2 - x1, nl = Math.hypot(nx, ny) || 1, o = (w - 12) * .28;
  sx.strokeStyle = hi; sx.lineWidth = Math.max(3, w * .14); line(x1 + nx / nl * o, y1 + ny / nl * o, x2 + nx / nl * o, y2 + ny / nl * o);
}
export function joint(x, y, r) {
  sx.fillStyle = "#141c26"; circ(x, y, r); sx.fillStyle = "#ffc93c"; circ(x, y, r * .72);
  sx.fillStyle = "#2a3644"; circ(x, y, r * .42); sx.fillStyle = "#8fa6bb"; circ(x - r * .12, y - r * .12, r * .16);
}
export function drawRobotBody(ox, bob, walk, t) { // walk: stride phase in radians while marching in, null when standing
  sx.save(); sx.translate(ox, 0);
  const cx = ROBOT_X, gy = HY + 44, hipY = HY - 292 + bob, shY = HY - 596 + bob;
  let g;
  sx.fillStyle = "rgba(20,60,90,.3)"; ell(cx - 10, gy + 4, 230, 18);
  for (const s of [-1, 1]) { // exhaust stacks with steam
    sx.fillStyle = "#1a2430"; rr(cx + s * 96 - 13, shY - 100, 26, 96, 8);
    for (let k = 0; k < 3; k++) { const p = (t * .5 + k / 3 + (s > 0 ? .17 : 0)) % 1; sx.fillStyle = "rgba(230,240,250," + (1 - p) * .35 + ")"; circ(cx + s * 96 + Math.sin(p * 5) * 8, shY - 104 - p * 90, 10 + p * 22); }
  }
  const fa = walk === null ? .06 : Math.sin(walk) * .3; // far arm swings with the stride
  const fsx = cx + 150, fsy = shY + 30, fex = fsx + Math.sin(fa) * 190, fey = fsy + Math.cos(fa) * 190, fhx = fex + Math.sin(fa * .5 - .1) * 170, fhy = fey + Math.cos(fa * .5 - .1) * 170;
  limb(fsx, fsy, fex, fey, 62, "#10171f", "#3c4e61", "#5d7389"); limb(fex, fey, fhx, fhy, 54, "#10171f", "#465a6e", "#6a8197");
  joint(fex, fey, 24); sx.fillStyle = "#141c26"; circ(fhx, fhy, 30); sx.fillStyle = "#3c4e61"; circ(fhx, fhy, 20);
  for (const s of [1, -1]) { // legs: far one first
    const far = s > 0, ph = walk === null ? 0 : Math.sin(walk + (far ? Math.PI : 0)), a = ph * .24, b = a + Math.max(0, -ph) * .5;
    const hx = cx + s * 62, kx = hx + Math.sin(a) * 150, ky = hipY + Math.cos(a) * 150, fx = kx + Math.sin(b) * 150, fy = ky + Math.cos(b) * 150;
    const mid = far ? "#3c4e61" : "#6f879d", hi = far ? "#566b80" : "#b4c6d6";
    limb(hx, hipY, kx, ky, 84, "#10171f", mid, hi); limb(kx, ky, fx, fy, 76, "#10171f", mid, hi);
    sx.fillStyle = far ? "#2a3848" : "#51677c"; sx.save(); sx.translate((kx + fx) / 2, (ky + fy) / 2); sx.rotate(-b); rr(-22, -44, 44, 88, 14); sx.restore(); // shin guard
    joint(kx, ky, 32);
    sx.save(); sx.translate(fx, fy); // boot, toe pointing at the hole
    sx.fillStyle = "#10171f"; sx.beginPath(); sx.moveTo(-82, 36); sx.lineTo(-88, 14); sx.quadraticCurveTo(-62, -18, -20, -20); sx.lineTo(42, -20); sx.quadraticCurveTo(60, -10, 60, 36); sx.closePath(); sx.fill();
    sx.fillStyle = mid; sx.beginPath(); sx.moveTo(-68, 12); sx.quadraticCurveTo(-50, -8, -18, -10); sx.lineTo(34, -10); sx.quadraticCurveTo(46, -6, 46, 12); sx.closePath(); sx.fill();
    sx.fillStyle = "#ffc93c"; rr(-76, 20, 44, 10, 3); sx.fillStyle = "#10171f"; sx.fillRect(-64, 20, 8, 10); sx.fillRect(-48, 20, 8, 10);
    sx.restore();
  }
  g = sx.createLinearGradient(cx - 112, 0, cx + 112, 0); g.addColorStop(0, "#263545"); g.addColorStop(.4, "#7d94aa"); g.addColorStop(1, "#1f2c3a"); // pelvis
  sx.fillStyle = g; sx.beginPath(); sx.moveTo(cx - 112, hipY - 50); sx.lineTo(cx + 112, hipY - 50); sx.lineTo(cx + 92, hipY + 34); sx.quadraticCurveTo(cx, hipY + 60, cx - 92, hipY + 34); sx.closePath(); sx.fill();
  sx.fillStyle = "#ffc93c"; sx.beginPath(); sx.moveTo(cx - 26, hipY - 36); sx.lineTo(cx + 26, hipY - 36); sx.lineTo(cx + 16, hipY + 30); sx.lineTo(cx - 16, hipY + 30); sx.closePath(); sx.fill();
  sx.fillStyle = "#10171f"; for (let k = 0; k < 3; k++) sx.fillRect(cx - 22 + k * 3, hipY - 22 + k * 18, 44 - k * 6, 7);
  joint(cx - 62, hipY, 30); joint(cx + 62, hipY, 30);
  for (let k = 0; k < 3; k++) { sx.fillStyle = k % 2 ? "#1d2833" : "#2f3f50"; rr(cx - 74 + k * 4, hipY - 50 - (k + 1) * 26, 148 - k * 8, 24, 10); } // waist rings
  const ty = shY - 30, by = hipY - 128; // torso
  g = sx.createLinearGradient(cx - 150, 0, cx + 150, 0); g.addColorStop(0, "#263545"); g.addColorStop(.3, "#7d94aa"); g.addColorStop(.45, "#b4c6d6"); g.addColorStop(.75, "#51677c"); g.addColorStop(1, "#1f2c3a");
  sx.fillStyle = g; sx.beginPath(); sx.moveTo(cx - 150, ty + 18); sx.quadraticCurveTo(cx - 150, ty, cx - 128, ty); sx.lineTo(cx + 128, ty); sx.quadraticCurveTo(cx + 150, ty, cx + 150, ty + 18);
  sx.lineTo(cx + 104, by); sx.quadraticCurveTo(cx, by + 22, cx - 104, by); sx.closePath(); sx.fill(); sx.strokeStyle = "#0f161d"; sx.lineWidth = 3; sx.stroke();
  sx.fillStyle = "rgba(255,255,255,.13)"; sx.beginPath(); sx.moveTo(cx - 132, ty + 22); sx.lineTo(cx - 16, ty + 22); sx.lineTo(cx - 24, ty + 126); sx.lineTo(cx - 110, ty + 108); sx.closePath(); sx.fill();
  sx.fillStyle = "rgba(0,0,0,.16)"; sx.beginPath(); sx.moveTo(cx + 132, ty + 22); sx.lineTo(cx + 16, ty + 22); sx.lineTo(cx + 24, ty + 126); sx.lineTo(cx + 110, ty + 108); sx.closePath(); sx.fill();
  sx.fillStyle = "#0c1218"; for (let k = 0; k < 4; k++) { rr(cx + 34, ty + 138 + k * 14, 54, 8, 4); rr(cx - 88, ty + 138 + k * 14, 54, 8, 4); }
  for (let k = 0; k < 8; k++) { sx.fillStyle = k % 2 ? "#10171f" : "#ffc93c"; sx.fillRect(cx - 88 + k * 22, by - 30, 22, 12); }
  sx.fillStyle = "#8fa6bb"; for (const s of [-1, 1]) for (let k = 0; k < 3; k++) circ(cx + s * 122, ty + 34 + k * 30, 4);
  g = sx.createRadialGradient(cx, ty + 78, 4, cx, ty + 78, 72); g.addColorStop(0, "rgba(233,253,255,.95)"); g.addColorStop(.3, "rgba(89,240,255,.7)"); g.addColorStop(1, "rgba(89,240,255,0)"); // reactor
  sx.fillStyle = g; circ(cx, ty + 78, 72);
  sx.strokeStyle = "#0c1218"; sx.lineWidth = 11; sx.beginPath(); sx.arc(cx, ty + 78, 34, 0, TAU); sx.stroke();
  sx.strokeStyle = "#59f0ff"; sx.lineWidth = 5; sx.lineCap = "butt";
  for (let k = 0; k < 3; k++) { sx.beginPath(); sx.arc(cx, ty + 78, 34, t * 2 + k * TAU / 3, t * 2 + k * TAU / 3 + 1.3); sx.stroke(); }
  sx.fillStyle = "#e9fdff"; circ(cx, ty + 78, 17);
  for (const s of [1, -1]) { // shoulder guards
    const x = cx + s * 150, y = shY + 24;
    sx.fillStyle = "#10171f"; circ(x, y, 66);
    g = sx.createRadialGradient(x - 20, y - 24, 6, x, y, 62); g.addColorStop(0, "#d2deea"); g.addColorStop(.5, "#5d7389"); g.addColorStop(1, "#223040");
    sx.fillStyle = g; circ(x, y, 59);
    sx.strokeStyle = "#ffc93c"; sx.lineWidth = 9; sx.lineCap = "round"; sx.beginPath(); sx.arc(x, y, 43, -2.4, -.7); sx.stroke();
  }
  sx.fillStyle = "#10171f"; rr(cx - 30, shY - 56, 60, 34, 8); sx.fillStyle = "#2f3f50"; sx.fillRect(cx - 30, shY - 44, 60, 5); // neck
  const hy = shY - 152; // head
  g = sx.createLinearGradient(cx - 66, 0, cx + 66, 0); g.addColorStop(0, "#2c3e52"); g.addColorStop(.38, "#a9bccd"); g.addColorStop(1, "#33475c");
  sx.fillStyle = g; sx.beginPath(); sx.moveTo(cx - 58, hy + 96); sx.lineTo(cx - 66, hy + 30); sx.quadraticCurveTo(cx - 62, hy, cx - 34, hy); sx.lineTo(cx + 34, hy); sx.quadraticCurveTo(cx + 62, hy, cx + 66, hy + 30);
  sx.lineTo(cx + 58, hy + 96); sx.quadraticCurveTo(cx, hy + 112, cx - 58, hy + 96); sx.closePath(); sx.fill(); sx.strokeStyle = "#0f161d"; sx.lineWidth = 3; sx.stroke();
  sx.fillStyle = "#ffc93c"; sx.beginPath(); sx.moveTo(cx - 10, hy + 2); sx.lineTo(cx, hy - 28); sx.lineTo(cx + 10, hy + 2); sx.closePath(); sx.fill();
  sx.fillStyle = "#05101a"; rr(cx - 54, hy + 30, 108, 32, 13);
  sx.fillStyle = "#59f0ff"; rr(cx - 47, hy + 37, 94, 18, 9);
  sx.fillStyle = "#e9fdff"; rr(cx - 45 + (Math.sin(t * 2.4) * .5 + .5) * 60, hy + 39, 22, 14, 7);
  sx.fillStyle = "#0c1218"; for (let k = 0; k < 3; k++) rr(cx - 26, hy + 72 + k * 9, 52, 5, 2);
  joint(cx - 66, hy + 50, 14); joint(cx + 66, hy + 50, 14);
  sx.strokeStyle = "#7f97ad"; sx.lineWidth = 5; sx.lineCap = "round"; line(cx + 40, hy + 4, cx + 56, hy - 46);
  sx.fillStyle = Math.sin(t * 6) > 0 ? "#ff5a3c" : "#5a1a10"; circ(cx + 56, hy - 48, 7);
  sx.restore();
}
export function drawRobotArm(ox, bob, hx, hy, grip) { // near arm reaches for the fish (two-bone IK)
  const S = { x: ROBOT_X - 150 + ox, y: HY - 572 + bob };
  const dx = hx - S.x, dy = hy - S.y, d = Math.min(ROBOT_ARM * 2 - 2, Math.max(60, Math.hypot(dx, dy)));
  const base = Math.atan2(dy, dx), bend = Math.acos(d / (2 * ROBOT_ARM));
  const ex = S.x + Math.cos(base + bend) * ROBOT_ARM, ey = S.y + Math.sin(base + bend) * ROBOT_ARM;
  limb(S.x, S.y, ex, ey, 72, "#10171f", "#5d7389", "#b4c6d6");
  limb(ex, ey, hx, hy, 62, "#10171f", "#6f879d", "#c3d3e2");
  const fx = hx - ex, fy = hy - ey, fl = Math.hypot(fx, fy) || 1, px = -fy / fl * -17, py = fx / fl * -17; // hydraulic ram along the forearm
  sx.strokeStyle = "#10171f"; sx.lineWidth = 11; line(ex + fx * .2 + px, ey + fy * .2 + py, ex + fx * .78 + px, ey + fy * .78 + py);
  sx.strokeStyle = "#dfe8ee"; sx.lineWidth = 5; line(ex + fx * .2 + px, ey + fy * .2 + py, ex + fx * .78 + px, ey + fy * .78 + py);
  sx.strokeStyle = "#ffc93c"; sx.lineWidth = 9; sx.lineCap = "butt";
  for (const q of [.4, .86]) line(ex + fx * q - fy / fl * 24, ey + fy * q + fx / fl * 24, ex + fx * q + fy / fl * 24, ey + fy * q - fx / fl * 24);
  joint(S.x, S.y, 40); joint(ex, ey, 32);
  const open = 1 - grip; sx.lineCap = "round"; sx.lineJoin = "round"; // three-finger claw
  sx.strokeStyle = "#10171f"; sx.lineWidth = 15; line(hx, hy + 18, hx, hy + 46);
  for (const s of [-1, 1]) {
    const path = () => { sx.beginPath(); sx.moveTo(hx + s * 16, hy + 14); sx.lineTo(hx + s * (36 + open * 20), hy + 52); sx.lineTo(hx + s * (17 + open * 18), hy + 88); sx.stroke(); };
    sx.strokeStyle = "#10171f"; sx.lineWidth = 17; path(); sx.strokeStyle = "#ffc93c"; sx.lineWidth = 9; path();
  }
  sx.fillStyle = "#10171f"; circ(hx, hy, 30); sx.fillStyle = "#ffc93c"; circ(hx, hy, 21); sx.fillStyle = "#10171f"; circ(hx, hy, 11);
}
export function drawPlate(txt, sub, scale) {
  sx.save(); sx.translate(628, 180); sx.scale(scale, scale);
  const g = sx.createLinearGradient(0, -40, 0, 40); g.addColorStop(0, "#fff6b8"); g.addColorStop(.5, "#ffd23f"); g.addColorStop(1, "#e08a00");
  sx.fillStyle = "rgba(0,0,0,.35)"; rr(-72, -34, 148, 80, 14);
  sx.fillStyle = g; rr(-74, -40, 148, 80, 14);
  sx.strokeStyle = "#5a3b00"; sx.lineWidth = 4; sx.beginPath(); sx.roundRect(-74, -40, 148, 80, 14); sx.stroke();
  sx.strokeStyle = "#ffffffaa"; sx.lineWidth = 1.5; sx.beginPath(); sx.roundRect(-68, -34, 136, 68, 10); sx.stroke();
  sx.fillStyle = "#3b2200"; sx.font = "50px " + DISPLAY; sx.textAlign = "center"; sx.textBaseline = "middle"; sx.fillText(txt, 0, 3);
  sx.restore();
  if (sub) {
    sx.font = "bold 14px 'Segoe UI', sans-serif"; sx.textAlign = "center"; sx.textBaseline = "middle";
    const w = sx.measureText(sub).width + 22;
    sx.fillStyle = "#06243fdd"; rr(628 - w / 2, 232, w, 26, 13);
    sx.fillStyle = "#cfefff"; sx.fillText(sub, 628, 246);
  }
}
export interface BonusOutcome { fishMult: number; total: number }
/** Play the fishing bonus for `key`. `stake` is the player's bet on it (0 = watching only).
 *  Resolves once the catch is shown, with the fish multiplier and the total (fish × wheel boost). */
export function playBonus(key: BetKey, wheelMult: number, stake: number, forceMult?: number): Promise<BonusOutcome> {
  return new Promise(resolve => {
  const T = TYPES[key], fishMult = forceMult || rollFish(key), total = fishMult * wheelMult, spr = fishSprite(key);
  const g = FISH_G[key], L = fishLen(key, fishMult), st = (L / g - 56) / 44, hs = 1 + (g - 1.1) * .45;
  const thickOf = m => { const [lo, hi] = T.bonus; return 1 + 1.3 * Math.max(0, Math.min(1, Math.log(Math.max(1, m) / lo) / Math.log(hi / lo))); }; // 1x at the lowest prize, 2.3x at the top
  let holeS = hs;
  const finalStage = CAP.findIndex(c => L <= c), stalls = [];
  for (let i = 0; i <= finalStage; i++) { // fake-out pauses, so a pause never tells you whether the fish is done
    const a = i ? CAP[i - 1] + 8 : 24, b = Math.min(L, CAP[i]) - 8;
    if (b - a > 14) { if (Math.random() < .85) stalls.push(a + Math.random() * (b - a)); if (Math.random() < .4) stalls.push(a + Math.random() * (b - a)); }
  }
  stalls.sort((p, q) => p - q);
  const shards = Array.from({ length: 12 }, (_, i) => ({ a: i / 12 * TAU + Math.random() * .3, r: .95 + Math.random() * .2, h: 9 + Math.random() * 20, w: 9 + Math.random() * 12, tilt: (Math.random() - .5) * .7 }));
  const flakes = Array.from({ length: 55 }, () => ({ x: Math.random() * SW, y: Math.random() * SH, v: 20 + Math.random() * 50, r: .8 + Math.random() * 1.8 }));
  const drawShards = front => { // broken ice around the hole: back pieces behind the fish, front pieces over it
    for (const q of shards) {
      if ((Math.sin(q.a) >= 0) !== front) continue;
      const x = HX + Math.cos(q.a) * 84 * holeS * q.r, y = HY + Math.sin(q.a) * 24 * holeS * q.r, W = q.w * hs, H = q.h * hs, tx = x + q.tilt * H;
      sx.fillStyle = "#f4fbff"; sx.beginPath(); sx.moveTo(x - W / 2, y + 2); sx.lineTo(tx, y - H); sx.lineTo(x + W / 2, y + 2); sx.closePath(); sx.fill();
      sx.fillStyle = "#9fd3ee"; sx.beginPath(); sx.moveTo(x, y + 2); sx.lineTo(tx, y - H); sx.lineTo(x + W / 2, y + 2); sx.closePath(); sx.fill();
    }
  };
  const S = { mode: "drop", tm: 0, t: 0, v: 0, stage: 0, arr: [1, 0, 0, 0, 0], heliGo: 0, jetGo: 0, shake: 0, stallDur: 0, step: 0, callout: "", callT: -9, said: false, snd: 0, z: 1, th: 1 };
  $("bonusTitle").textContent = T.name.toUpperCase() + " BONUS!";
  $("bonusText").textContent = wheelMult > 1 ? "Wheel multiplier " + wheelMult + "x is waiting to stack…" : "How big is it?";
  $("bonus").classList.add("show"); document.body.classList.add("inbonus");
  drops = [];
  const run = bonusRun = {};
  const set = m => { S.mode = m; S.tm = 0; };
  const say = txt => { S.callout = txt; S.callT = S.t; };
  const creak = () => { const o = tone(90, .5, .16, "sawtooth"); if (o) o.frequency.linearRampToValueAtTime(60, ac.currentTime + .45); };
  const splash = (n, pow) => { for (let i = 0; i < n; i++) drops.push({ x: HX + (Math.random() - .5) * 60 * hs, y: HY, vx: (Math.random() - .5) * pow * hs, vy: -Math.random() * pow * (.6 + hs * .4) - 2, r: 1.5 + Math.random() * 2.6 * hs }); };
  function finish() {
    chime([880, 1100, 1320, 1760, 2100]);
    const r = sc.getBoundingClientRect();
    bus.emit("BONUS_RESULT", { key, fishMult, wheelMult, total, stake, payout: stake * total + stake });
    burst(r.left + r.width * .5, r.top + r.height * .45, stake ? 160 : 60);
    $("bonusText").innerHTML = "Fish <b>" + fishMult + "x</b>" + (wheelMult > 1 ? " × wheel <b>" + wheelMult + "x</b> = <b>" + total + "x</b>" : "") +
      "<br>" + (stake ? "Your " + fmt(stake) + " chips pay <b>" + fmt(stake * total + stake) + "</b>!" : "No chips on " + T.name + " this round.");
    setTimeout(() => { if (bonusRun !== run) return; bonusRun = null; $("bonus").classList.remove("show"); document.body.classList.remove("inbonus"); resolve({ fishMult, total }); }, 3800);
  }
  function update(dt) {
    S.t += dt; S.tm += dt; S.shake *= Math.pow(.03, dt);
    if (S.mode === "drop") { if (S.tm >= 1) { set("bite"); splash(10, 4); splashSound(.15); } }
    else if (S.mode === "bite") { if (S.tm >= 1.5) { set("pull"); splash(50, 9); splashSound(.5); bus.emit("FISH_HOOKED"); } }
    else if (S.mode === "pull") {
      S.v += SPEED[S.stage] * (.5 + .5 * Math.abs(Math.sin(S.tm * 3.4))) * dt;   // heave… heave…
      if (stalls.length && S.v >= stalls[0]) { S.v = stalls.shift(); S.stallDur = .45 + Math.random() * .6; set("stall"); creak(); bus.emit("FISH_STUCK"); }
      else if (S.v >= L) { S.v = L; set("out"); splash(70, 11); splashSound(.6); S.shake = 9; finish(); }
      else if (S.v >= CAP[S.stage]) { S.v = CAP[S.stage]; S.said = false; set("strain"); creak(); }
    }
    else if (S.mode === "stall") { if (S.tm >= S.stallDur) set("pull"); }
    else if (S.mode === "strain") {
      if (S.tm >= .85 && !S.said) { S.said = true; creak(); S.shake = 7; }
      if (Math.random() < .5) splash(1, 6); // water churns while the lifter strains
      if (S.tm >= 1.9) { S.stage++; S.step = 0; set("arrive"); say(CALL[S.stage]); bus.emit("LIFTER_CALLED", { stage: S.stage }); tone(440, .5, .14, "square"); tone(660, .5, .14, "square", .18); }
    }
    else if (S.mode === "arrive") {
      const p = Math.min(1, S.tm / ARRIVE[S.stage]); S.arr[S.stage] = p;
      if (S.stage === 4) { const stp = Math.floor(p * 6); if (stp !== S.step && p < .86) { S.step = stp; thud(); S.shake = 12; } }
      if (p >= 1) { set("pull"); splash(16, 5); tone(520, .12, .12, "triangle"); }
    }
    const holder = S.mode === "arrive" ? S.stage - 1 : S.stage;
    if (holder >= 3) S.heliGo = Math.min(1, S.heliGo + dt / 2.2);
    if (holder >= 4) S.jetGo = Math.min(1, S.jetGo + dt / 2.4);
    drops = drops.filter(d => d.y < HY + 10 || d.vy < 0);
    for (const d of drops) { d.x += d.vx * dt * 60; d.y += d.vy * dt * 60; d.vy += .4 * dt * 60; }
    if (S.mode !== "drop" && S.mode !== "bite" && S.t < 60 && HY - S.v < HY - 6 && Math.random() < .35) drops.push({ x: HX + (Math.random() - .5) * 20 * g, y: HY - Math.random() * S.v * .5, vx: 0, vy: 1, r: 1.6 });
  }
  function draw() {
    const t = S.t, mode = S.mode, out = mode === "out", stuck = mode === "stall" || mode === "strain";
    const holder = mode === "arrive" ? S.stage - 1 : S.stage, fishing = mode !== "drop" && mode !== "bite";
    cableCol = mode === "strain" && Math.sin(t * 42) > 0 ? "#ff6a4a" : "#e6eef5"; // the line flashes red while it strains
    // camera
    const ct = (1 - S.z) / .56, chx = 440 - 60 * ct, chy = 356 + 42 * ct, shx = (Math.random() - .5) * S.shake, shy = (Math.random() - .5) * S.shake;
    sx.setTransform(2 * S.z, 0, 0, 2 * S.z, 2 * (chx - HX * S.z + shx), 2 * (chy - HY * S.z + shy));
    sx.drawImage(sceneBg, WX0, WY0, WW, WH);
    for (let k = 0; k < 3; k++) { const p = (t * .25 + k / 3) % 1; sx.fillStyle = "rgba(255,255,255," + (1 - p) * .3 + ")"; circ(98 + Math.sin(p * 6) * 4 + p * 14, ICE - 46 - p * 42, 4 + p * 8); }
    // where the fish is
    const outLift = out ? 30 * smooth(S.tm / .6) : 0, wob = stuck ? Math.sin(t * 34) * 1.6 : 0;
    const mouthX = HX + (out ? Math.sin(t * 2.2) * 5 : 0), mouthY = HY - S.v - outLift + wob;
    if (out) { // victory rays
      const a = Math.min(1, S.tm * 2), cy = mouthY + L / 2, R = 260 + L;
      const gr = sx.createRadialGradient(mouthX, cy, 10, mouthX, cy, R); gr.addColorStop(0, "rgba(255,225,120," + .5 * a + ")"); gr.addColorStop(1, "rgba(255,225,120,0)");
      sx.save(); sx.translate(mouthX, cy); sx.rotate(t * .4); sx.fillStyle = gr;
      for (let k = 0; k < 12; k++) { sx.rotate(TAU / 12); sx.beginPath(); sx.moveTo(0, 0); sx.lineTo(-R * .1, -R); sx.lineTo(R * .1, -R); sx.closePath(); sx.fill(); }
      sx.restore();
    }
    // machines behind the fish
    const robWalk = S.arr[4] < .86 ? S.arr[4] * Math.PI * 6 : null, robOx = 1000 * (1 - Math.min(1, S.arr[4] / .86)), robBob = robWalk === null ? 0 : -Math.abs(Math.sin(robWalk)) * 14;
    if (S.arr[4] > 0) drawRobotBody(robOx, robBob, robWalk, t);
    if (S.arr[1] > 0) drawCrane(700 * (1 - smooth(S.arr[1])), holder === 1 && fishing, mouthX, mouthY);
    // hole
    // the fish gets fatter as its multiplier climbs, and the ice hole cracks wider to fit it
    const curM = out ? fishMult : Math.min(fishMult, multAt(key, S.v));
    S.th += (thickOf(curM) - S.th) * .12; holeS = hs * Math.max(1, .5 + .5 * S.th);
    sx.fillStyle = "#ffffff"; ell(HX, HY, 80 * holeS, 22 * hs);
    sx.fillStyle = "#b9dcee"; ell(HX, HY + 1, 70 * holeS, 18 * hs);
    sx.fillStyle = "#07314d"; ell(HX, HY + 3, 64 * holeS, 15 * hs);
    const agit = mode === "drop" ? .15 : mode === "bite" ? .4 + S.tm * .3 : out ? .2 : stuck ? 1 : .7;
    for (let k = 0; k < 3; k++) {
      const p = (t * .7 + k / 3) % 1;
      sx.strokeStyle = "rgba(200,240,255," + (1 - p) * agit * .8 + ")"; sx.lineWidth = 1.5;
      sx.beginPath(); sx.ellipse(HX, HY + 3, (8 + p * 50) * holeS, (8 + p * 50) * hs * .23, 0, 0, TAU); sx.stroke();
    }
    drawShards(false);
    // rod state
    const mine = holder === 0;
    const bend = !mine ? 0 : mode === "drop" ? 0 : mode === "bite" ? 6 + S.tm * 9 + Math.sin(t * 38) * S.tm * 3 : stuck ? 37 + Math.sin(t * 40) * 3 : out ? 20 + Math.sin(t * 2.2) * 1.5 : 27 + Math.sin(t * 30) * 2;
    const lean = !mine ? 0 : mode === "bite" ? -.04 * S.tm : stuck ? -.3 : out ? -.1 : mode === "pull" ? -.2 + Math.sin(t * 12) * .02 : 0;
    const tipX = HX - bend * .3, tipY = HY - 256 + bend;
    // bobber or fish
    sx.save(); sx.beginPath(); sx.rect(HX - 700, WY0, 1400, HY + 3 - WY0); sx.clip();
    if (!fishing) {
      const by = mode === "drop" ? tipY + (HY - tipY) * S.tm * S.tm : HY + Math.sin(t * 20) * (1 + S.tm * 3);
      sx.fillStyle = "#fff"; circ(HX, by, 6); sx.fillStyle = "#ff4d2e"; sx.beginPath(); sx.arc(HX, by, 6, Math.PI, 0); sx.fill();
      sx.restore();
      sx.strokeStyle = "#ffffffcc"; sx.lineWidth = 1.2; line(tipX, tipY, HX, Math.min(by, HY + 3) - 6);
    } else {
      const swing = out ? Math.sin(t * 2.2) * .045 : stuck ? Math.sin(t * 26) * .02 : Math.sin(t * 9) * .03;
      drawFish(spr, mouthX, mouthY, g, st, swing, t, out ? 1 : stuck ? 3.4 : 1.8, S.th);
      sx.restore();
      if (mine) { sx.strokeStyle = cableCol; sx.lineWidth = 1.2; line(tipX, tipY, mouthX, mouthY); }
    }
    if (fishing) drawShards(true);
    // fisher + rod
    const hand = drawFisher(lean, !mine && (out || mode === "arrive"));
    sx.lineCap = "round";
    const rod = () => { sx.beginPath(); sx.moveTo(hand.x - 6, hand.y + 18); sx.lineTo(hand.x, hand.y); if (mine) sx.quadraticCurveTo(350, 86, tipX, tipY); else sx.lineTo(hand.x + 30, hand.y - 150); sx.stroke(); };
    sx.strokeStyle = "#2e1b0d"; sx.lineWidth = 4.5; rod(); sx.strokeStyle = "#c98a4b"; sx.lineWidth = 1.5; rod();
    sx.fillStyle = "#1f2f46"; circ(hand.x, hand.y, 7.5);
    // machines in the air
    if (S.arr[2] > 0 && S.heliGo < 1) {
      const p = smooth(S.arr[2]), go = S.heliGo * S.heliGo;
      drawHeli(HX - 700 * (1 - p) - 1000 * go, HY - 440 - 260 * (1 - p) - 420 * go + Math.sin(t * 2.3) * 5, t, holder === 2 && fishing, mouthX, mouthY);
    }
    if (S.arr[3] > 0 && S.jetGo < 1) {
      const p = smooth(S.arr[3]), go = S.jetGo * S.jetGo;
      drawJet(HX + 10 + 1100 * (1 - p) + 1300 * go, HY - 540 - 220 * (1 - p) - 340 * go + Math.sin(t * 1.9) * 4, t, holder === 3 && fishing, mouthX, mouthY);
    }
    if (S.arr[4] > 0) {
      const reach = smooth((S.arr[4] - .86) / .14), rx = ROBOT_X - 190 + robOx + (robWalk === null ? 0 : Math.sin(robWalk + Math.PI) * 60), ry = HY - 170 + robBob;
      drawRobotArm(robOx, robBob, rx + (mouthX + 4 - rx) * reach, ry + (mouthY - 20 - ry) * reach, reach);
    }
    if (fishing) { // gold tag clipped to the fish's lip, showing what the fish is worth right now
      const k = 1 / S.z, tx = mouthX + 34 * k, ty = mouthY - 30 * k, txt = (out ? fishMult : curM) + "x";
      sx.strokeStyle = "#ffe9a8"; sx.lineWidth = 1.6 * k; line(mouthX + 2 * k, mouthY - 2 * k, tx - 20 * k, ty + 8 * k);
      sx.save(); sx.translate(tx, ty); sx.scale(k, k); sx.rotate(Math.sin(t * 3) * .08 - .06);
      const tg = sx.createLinearGradient(0, -15, 0, 15); tg.addColorStop(0, "#fff6c2"); tg.addColorStop(.55, "#ffcf2a"); tg.addColorStop(1, "#d98a00");
      sx.font = "22px " + DISPLAY; const tw = Math.max(52, sx.measureText(txt).width + 22);
      sx.shadowColor = "#ffd95a"; sx.shadowBlur = 14; sx.fillStyle = tg; rr(-tw / 2, -15, tw, 30, 9); sx.shadowBlur = 0;
      sx.strokeStyle = "#5a3b00"; sx.lineWidth = 2.5; sx.beginPath(); sx.roundRect(-tw / 2, -15, tw, 30, 9); sx.stroke();
      sx.fillStyle = "#5a3b00"; circ(-tw / 2 + 7, 0, 2.6);
      sx.fillStyle = "#3b2200"; sx.textAlign = "center"; sx.textBaseline = "middle"; sx.fillText(txt, 4, 1.5);
      sx.restore();
    }
    sx.fillStyle = "#d9f4ff"; for (const d of drops) circ(d.x, d.y, d.r);

    // HUD (screen space)
    sx.setTransform(2, 0, 0, 2, 0, 0);
    sx.fillStyle = "rgba(255,255,255,.75)"; // falling snow and a soft dark edge, in front of the camera
    for (const q of flakes) circ((((q.x + Math.sin(t * .7 + q.y) * 8 - t * 12) % SW) + SW) % SW, (q.y + t * q.v) % SH, q.r);
    const vg = sx.createRadialGradient(360, 230, 190, 360, 230, 480); vg.addColorStop(0, "rgba(0,10,30,0)"); vg.addColorStop(1, "rgba(0,10,30,.55)");
    sx.fillStyle = vg; sx.fillRect(0, 0, SW, SH);
    if (wheelMult > 1) { // the wheel boost rides along for the whole bonus
      const pulse = 1 + Math.sin(t * 4) * .04, mg = sx.createRadialGradient(54, 50, 3, 62, 58, 38);
      mg.addColorStop(0, "#fffbe0"); mg.addColorStop(.45, "#ffd23f"); mg.addColorStop(1, "#b36d00");
      sx.save(); sx.translate(62, 58); sx.scale(pulse, pulse);
      sx.shadowColor = "#ffd95a"; sx.shadowBlur = 20; sx.fillStyle = mg; circ(0, 0, 36); sx.shadowBlur = 0;
      sx.strokeStyle = "#5a3b00"; sx.lineWidth = 3.5; sx.beginPath(); sx.arc(0, 0, 36, 0, TAU); sx.stroke();
      sx.fillStyle = "#3b2200"; sx.textAlign = "center"; sx.textBaseline = "middle"; sx.font = "30px " + DISPLAY; sx.fillText("×" + wheelMult, 0, -2);
      sx.font = "bold 9px 'Segoe UI', sans-serif"; sx.fillText("WHEEL BOOST", 0, 20);
      sx.restore();
    }
    if (!fishing) {
      const msg = mode === "drop" ? "Dropping the line…" : "Something's biting" + ".".repeat(1 + Math.floor(t * 3) % 3);
      sx.font = "bold 17px 'Segoe UI', sans-serif"; sx.textAlign = "center"; sx.textBaseline = "middle";
      sx.fillStyle = "#06243fcc"; rr(528, 160, 200, 40, 20); sx.fillStyle = "#fff"; sx.fillText(msg, 628, 181);
    } else if (!out) {
      drawPlate(Math.min(fishMult, multAt(key, S.v)) + "x", wheelMult > 1 ? "then × wheel " + wheelMult + "x" : "", 1 + (stuck ? Math.sin(t * 30) * .03 : Math.sin(t * 12) * .015));
    } else {
      drawPlate(total + "x", wheelMult > 1 ? "fish " + fishMult + "x  ×  wheel " + wheelMult + "x" : "", 1 + Math.max(0, .35 - S.tm) * .9 + Math.sin(t * 4) * .02);
    }
    const ca = t - S.callT;
    if (S.callout && ca < 2.4) { // shout banner
      const sc2 = 1 + Math.max(0, .25 - ca) * 1.6;
      sx.save(); sx.translate(360, 52); sx.scale(sc2, sc2); sx.globalAlpha = Math.min(1, (2.4 - ca) * 3);
      sx.font = "40px " + DISPLAY; sx.textAlign = "center"; sx.textBaseline = "middle"; sx.lineJoin = "round";
      sx.lineWidth = 9; sx.strokeStyle = "#3d0600"; sx.strokeText(S.callout, 0, 0);
      sx.fillStyle = "#ffd95a"; sx.fillText(S.callout, 0, 0);
      sx.restore();
    }
  }
  let last = performance.now();
  (function frame(now) {
    if (bonusRun !== run) return;
    let dt = Math.min(.25, (now - last) / 1000); last = now;
    S.z += (ZOOM[S.stage] - S.z) * (1 - Math.exp(-dt * 2.2));
    for (; dt > 0; dt -= 1 / 60) update(Math.min(dt, 1 / 60));
    draw();
    if (ac && now - S.snd > 110) { // running sound of whatever is lifting
      S.snd = now;
      if (S.mode === "pull" && S.stage === 0) hiss(.02, .16, "bandpass", 1900, 4);
      if (S.arr[1] > 0 && S.arr[1] < 1) tone(62, .16, .1, "sawtooth");
      if (S.arr[2] > 0 && S.heliGo < 1) hiss(.07, .2, "lowpass", 240, 1);
      if (S.arr[3] > 0 && S.jetGo < 1) hiss(.14, .16, "lowpass", 900, .7);
    }
    requestAnimationFrame(frame);
  })(last);
  });
}

