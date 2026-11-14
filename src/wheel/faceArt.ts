// Paints the wheel face (segments, labels, multipliers, hub plate) into a canvas that becomes the
// texture of the 3D wheel. Coordinates are the original 1200px design, centred on (0,0).
import { ARC, N, P_CRYSTAL, P_FIN, P_FISH, P_SNOW, TYPES, WHEEL } from "../game/config";
import { DISPLAY, TAU } from "../core/util";
import { PEG_R } from "./physics";

export const R_FACE = 502, R_SEG = 468, HUB = 152;

const grain = (() => {
  const n = document.createElement("canvas"); n.width = n.height = 220;
  const x = n.getContext("2d")!, d = x.createImageData(220, 220);
  for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  x.putImageData(d, 0, 0); return n;
})();

function disc(c: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string | CanvasGradient) {
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = fill; c.fill();
}
function embossText(c: CanvasRenderingContext2D, txt: string, x: number, y: number, top: string, bottom: string) {
  c.lineWidth = 6; c.strokeStyle = "rgba(0,0,0,.72)"; c.strokeText(txt, x, y + 1.5);
  c.fillStyle = "rgba(0,0,0,.55)"; c.fillText(txt, x + 1.5, y + 3);
  const g = c.createLinearGradient(0, y - 17, 0, y + 17); g.addColorStop(0, top); g.addColorStop(1, bottom);
  c.fillStyle = g; c.fillText(txt, x, y);
}

/** Draw the face into `c`, which must already be transformed so (0,0) is the wheel centre. */
export function drawFace(c: CanvasRenderingContext2D, mults: Record<number, number>) {
  let g = c.createRadialGradient(0, 0, R_SEG, 0, 0, R_FACE);
  g.addColorStop(0, "#040d18"); g.addColorStop(.45, "#1b4169"); g.addColorStop(1, "#06141f");
  disc(c, 0, 0, R_FACE, g);
  for (let i = 0; i < N; i++) {
    const t = TYPES[WHEEL[i]];
    c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, R_SEG, i * ARC, (i + 1) * ARC); c.closePath();
    g = c.createRadialGradient(0, 0, HUB * .8, 0, 0, R_SEG); g.addColorStop(0, t.c0); g.addColorStop(.75, t.c1); g.addColorStop(1, t.c1);
    c.fillStyle = g; c.fill();
  }
  c.save(); c.beginPath(); c.arc(0, 0, R_SEG, 0, TAU); c.clip(); // printed-surface grain
  c.globalAlpha = .09; c.globalCompositeOperation = "overlay"; c.fillStyle = c.createPattern(grain, "repeat")!; c.fillRect(-R_FACE, -R_FACE, R_FACE * 2, R_FACE * 2); c.restore();
  for (let i = 0; i < N; i++) { // painted divider lines (the raised metal ones are 3D)
    const cs = Math.cos(i * ARC), sn = Math.sin(i * ARC);
    c.beginPath(); c.moveTo(cs * HUB, sn * HUB); c.lineTo(cs * R_SEG, sn * R_SEG);
    c.strokeStyle = "rgba(0,0,0,.5)"; c.lineWidth = 5.5; c.stroke();
    c.strokeStyle = "#dfe8ee"; c.lineWidth = 2; c.stroke();
  }
  c.lineWidth = 3; c.strokeStyle = "#e0b345"; c.beginPath(); c.arc(0, 0, R_SEG, 0, TAU); c.stroke();
  c.lineWidth = 1.5; c.strokeStyle = "rgba(0,0,0,.6)"; c.beginPath(); c.arc(0, 0, R_SEG + 2.5, 0, TAU); c.stroke();
  c.textAlign = "center"; c.textBaseline = "middle"; c.lineJoin = "round"; c.lineCap = "round";
  for (let i = 0; i < N; i++) {
    const t = TYPES[WHEEL[i]], m = mults[i], a = ARC / 2 - 0.014;
    c.save(); c.rotate(i * ARC + ARC / 2);
    if (t.bonus) {
      if (m) {
        c.beginPath(); c.arc(0, 0, R_SEG - 5, -a, a); c.arc(0, 0, HUB + 6, a, -a, true); c.closePath();
        c.fillStyle = "rgba(255,217,90,.24)"; c.fill();
        c.strokeStyle = "#ffe27a"; c.lineWidth = 6; c.shadowColor = "#ffd95a"; c.shadowBlur = 16; c.stroke(); c.shadowBlur = 0;
        c.save(); c.translate(R_SEG * .905, 0); c.rotate(Math.PI / 2); // gold medallion, upright when it passes the pointer
        g = c.createRadialGradient(-7, -9, 2, 0, 0, 28); g.addColorStop(0, "#fffbe0"); g.addColorStop(.45, "#ffd23f"); g.addColorStop(1, "#b36d00");
        c.shadowColor = "#ffd95a"; c.shadowBlur = 20; disc(c, 0, 0, 27, g); c.shadowBlur = 0;
        c.lineWidth = 3.5; c.strokeStyle = "#5a3b00"; c.beginPath(); c.arc(0, 0, 27, 0, TAU); c.stroke();
        c.lineWidth = 1.5; c.strokeStyle = "rgba(255,255,255,.7)"; c.beginPath(); c.arc(0, 0, 22, 0, TAU); c.stroke();
        c.font = (m >= 10 ? 25 : 30) + "px " + DISPLAY; c.fillStyle = "#3b2200"; c.fillText(m + "x", 0, 2);
        c.restore();
      } else {
        c.save(); c.translate(R_SEG * .93, 0); c.scale(.44, .44);
        c.fillStyle = "rgba(0,0,0,.45)"; c.translate(3, 4); c.fill(P_FISH); c.translate(-3, -4);
        c.fillStyle = "#fffdf2"; c.fill(P_FIN); c.fill(P_FISH); disc(c, 27, -5, 4.5, t.c0); c.restore();
      }
      c.font = (m ? 28 : 31) + "px " + DISPLAY;
      embossText(c, (m ? m + "x " : "") + t.name.toUpperCase(), R_SEG * .565, 1, m ? "#fff6c2" : "#ffffff", m ? "#ffb300" : "#c3dbe8");
    } else {
      c.save(); c.translate(R_SEG * .925, 0);
      if (WHEEL[i] === "snow") { c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 3; c.translate(1, 1.5); c.stroke(P_SNOW); c.translate(-1, -1.5); c.strokeStyle = t.ink!; c.stroke(P_SNOW); }
      else { c.rotate(Math.PI / 2); c.scale(.48, .48); c.fillStyle = "#eaf8ffee"; c.fill(P_CRYSTAL); c.strokeStyle = "#082a40"; c.lineWidth = 4; c.stroke(P_CRYSTAL); }
      c.restore();
      if (m) {
        c.beginPath(); c.arc(0, 0, R_SEG * .85, -a, a); c.arc(0, 0, R_SEG * .5, a, -a, true); c.closePath();
        g = c.createRadialGradient(0, 0, R_SEG * .5, 0, 0, R_SEG * .85);
        g.addColorStop(0, "#a86a00"); g.addColorStop(.3, "#ffd75a"); g.addColorStop(.5, "#fff3b0"); g.addColorStop(.7, "#ffc93c"); g.addColorStop(1, "#b97700");
        c.shadowColor = "#ffd95a"; c.shadowBlur = 18; c.fillStyle = g; c.fill(); c.shadowBlur = 0;
        c.strokeStyle = "#4a2e00"; c.lineWidth = 3; c.stroke();
        c.font = "39px " + DISPLAY; c.fillStyle = "rgba(255,255,255,.6)"; c.fillText(m + "x", R_SEG * .68, 3.5);
        c.fillStyle = "#3b2200"; c.fillText(m + "x", R_SEG * .68, 2);
      }
    }
    c.restore();
  }
  for (let i = 0; i < N; i++) { // dark sockets the 3D brass pegs sit in
    const x = Math.cos(i * ARC) * PEG_R, y = Math.sin(i * ARC) * PEG_R;
    g = c.createRadialGradient(x, y, 5, x, y, 17); g.addColorStop(0, "rgba(0,0,0,.75)"); g.addColorStop(1, "rgba(0,0,0,0)"); disc(c, x, y, 17, g);
  }
  g = c.createRadialGradient(0, 0, HUB * .6, 0, 0, HUB); g.addColorStop(0, "#0a1f36"); g.addColorStop(.7, "#1b4169"); g.addColorStop(1, "#050f1b");
  disc(c, 0, 0, HUB, g);
  c.lineWidth = 3; c.strokeStyle = "#e0b345"; c.beginPath(); c.arc(0, 0, HUB - 2, 0, TAU); c.stroke();
  for (let i = 0; i < 8; i++) {
    const x = Math.cos(i / 8 * TAU + .39) * 143, y = Math.sin(i / 8 * TAU + .39) * 143;
    g = c.createRadialGradient(x, y, 0, x, y, 5); g.addColorStop(0, "#ffffff"); g.addColorStop(.5, "#aab8c4"); g.addColorStop(1, "#27333f"); disc(c, x, y, 5, g);
  }
}

/** The "FROZEN LAKE" label for the glossy hub dome. */
export function drawHubLabel(c: CanvasRenderingContext2D, size: number) {
  const g = c.createRadialGradient(size * .36, size * .3, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "#ffffff"); g.addColorStop(.18, "#d4f4ff"); g.addColorStop(.55, "#5cb8e4"); g.addColorStop(1, "#0d4b7c");
  c.fillStyle = g; c.fillRect(0, 0, size, size);
  c.fillStyle = "#06304f"; c.textAlign = "center"; c.textBaseline = "middle";
  c.font = Math.round(size * .17) + "px " + DISPLAY;
  c.fillText("FROZEN", size / 2, size * .42); c.fillText("LAKE", size / 2, size * .6);
}
