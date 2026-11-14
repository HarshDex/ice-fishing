// The ice cave behind everything, painted once per resize, and the drifting snow tiles.
import { $, TAU, seeded } from "../core/util";

function iceShard(c, x, y, w, h, lean, light, alpha) { // a faceted crystal standing on (x,y): lit left face, shaded right face
  const sh = .72, tip = [x + lean * h, y - h], sl = [x - w / 2 + lean * h * sh, y - h * sh], sr = [x + w / 2 + lean * h * sh, y - h * sh], rb = [x + w * .08, y];
  const poly = pts => { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); };
  c.globalAlpha = alpha;
  let g = c.createLinearGradient(x - w / 2, y - h, x, y);
  g.addColorStop(0, light ? "#f2fbff" : "#9fd3ee"); g.addColorStop(.5, light ? "#9fd8f2" : "#3f86b5"); g.addColorStop(1, light ? "#4f9ccc" : "#123d63");
  poly([[x - w / 2, y], sl, tip, rb]); c.fillStyle = g; c.fill();
  g = c.createLinearGradient(x, y - h, x + w / 2, y); g.addColorStop(0, light ? "#8fcbe9" : "#4a93c0"); g.addColorStop(1, light ? "#1d5f8c" : "#0a2a48");
  poly([rb, tip, sr, [x + w / 2, y]]); c.fillStyle = g; c.fill();
  c.strokeStyle = "rgba(255,255,255," + (light ? .75 : .35) + ")"; c.lineWidth = Math.max(1, w * .025);
  c.beginPath(); c.moveTo(sl[0], sl[1]); c.lineTo(tip[0], tip[1]); c.lineTo(rb[0], rb[1]); c.stroke();
  c.strokeStyle = "rgba(255,255,255,.22)"; c.lineWidth = 1; // a fracture inside the ice
  c.beginPath(); c.moveTo(x - w * .2 + lean * h * .3, y - h * .3); c.lineTo(x - w * .05 + lean * h * .55, y - h * .55); c.lineTo(x - w * .15 + lean * h * .62, y - h * .68); c.stroke();
  c.globalAlpha = 1;
}
function sparkle(c, x, y, z) {
  c.beginPath(); c.moveTo(x, y - z * 2); c.lineTo(x + z * .4, y); c.lineTo(x, y + z * 2); c.lineTo(x - z * .4, y); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(x - z * 2, y); c.lineTo(x, y + z * .4); c.lineTo(x + z * 2, y); c.lineTo(x, y - z * .4); c.closePath(); c.fill();
}
export function drawBg(bg: HTMLCanvasElement) { // an ice cave, painted once per resize; nothing behind the wheel is redrawn per frame
  const W = bg.width = innerWidth, H = bg.height = innerHeight, c = bg.getContext("2d"), r = seeded(5);
  const wr = $("wrap").getBoundingClientRect(), has = wr.width > 0;
  const cx = has ? wr.left + wr.width / 2 : W / 2, cy = has ? wr.top + wr.height / 2 : H * .4, R = has ? wr.width / 2 : Math.min(W, H) * .35;
  const s = Math.max(.6, Math.min(1.6, H / 800));
  let g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#04122a"); g.addColorStop(.45, "#0a3058"); g.addColorStop(1, "#165a86");
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  g = c.createRadialGradient(cx, cy, R * .3, cx, cy, R * 2.3); // cold light glowing through the ice behind the wheel
  g.addColorStop(0, "rgba(150,230,255,.6)"); g.addColorStop(.45, "rgba(60,160,220,.24)"); g.addColorStop(1, "rgba(60,160,220,0)");
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 28; i++) iceShard(c, r() * W, H + 10, (50 + r() * 90) * s, H * (.25 + r() * .55), (r() - .5) * .35, false, .5); // back wall
  for (const side of [0, 1]) for (let i = 0; i < 9; i++) { // bright crystal clusters on both sides
    const x = side ? W - r() * W * .3 : r() * W * .3;
    iceShard(c, x, H + 10, (60 + r() * 110) * s, H * (.35 + r() * .55), (side ? 1 : -1) * (.05 + r() * .25), true, .88);
  }
  g = c.createLinearGradient(0, 0, 0, 90 * s); g.addColorStop(0, "rgba(225,245,255,.85)"); g.addColorStop(1, "rgba(225,245,255,0)"); // icy ceiling
  c.fillStyle = g; c.fillRect(0, 0, W, 90 * s);
  for (let x = -10; x < W + 10; x += 9 + r() * 22) { // icicles
    const len = (18 + Math.pow(r(), 2) * 130) * s, w = (6 + r() * 12) * s;
    g = c.createLinearGradient(0, 0, 0, len); g.addColorStop(0, "rgba(240,250,255,.95)"); g.addColorStop(.6, "rgba(160,220,245,.75)"); g.addColorStop(1, "rgba(160,220,245,.1)");
    c.fillStyle = g; c.beginPath(); c.moveTo(x - w / 2, 0); c.quadraticCurveTo(x - w * .2, len * .6, x, len); c.quadraticCurveTo(x + w * .2, len * .6, x + w / 2, 0); c.closePath(); c.fill();
    c.fillStyle = "rgba(255,255,255,.6)"; c.fillRect(x - w * .25, 2, Math.max(1, w * .12), len * .55);
  }
  g = c.createLinearGradient(0, H * .82, 0, H); g.addColorStop(0, "rgba(230,246,255,0)"); g.addColorStop(.5, "rgba(230,246,255,.5)"); g.addColorStop(1, "rgba(230,246,255,.85)");
  c.fillStyle = g; c.fillRect(0, H * .82, W, H * .18); // snow on the floor
  for (let i = 0; i < 70; i++) { c.fillStyle = "rgba(255,255,255," + (.4 + r() * .5) + ")"; sparkle(c, r() * W, r() * H, (1 + r() * 2.5) * s); }
  g = c.createRadialGradient(cx, cy, R * .95, cx, cy, R * 1.7); // keep the area right around the wheel calm so it reads clearly
  g.addColorStop(0, "rgba(4,18,40,.4)"); g.addColorStop(1, "rgba(4,18,40,0)"); c.fillStyle = g; c.fillRect(0, 0, W, H);
}
export function snowTile(size, n, seed) {
  const cv = document.createElement("canvas"); cv.width = cv.height = size;
  const c = cv.getContext("2d"), r = seeded(seed); c.fillStyle = "#fff";
  for (let i = 0; i < n; i++) { c.globalAlpha = .45 + r() * .5; c.beginPath(); c.arc(6 + r() * (size - 12), 6 + r() * (size - 12), 1 + r() * 2.2, 0, TAU); c.fill(); }
  return "url(" + cv.toDataURL() + ")";
}

