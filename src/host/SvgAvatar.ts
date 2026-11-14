// The painted 2D portrait of Mira (markup lives in index.html). Animates mouth, blinks, eyes and head.
// To upgrade to a 3D host, write a GltfAvatar that implements the same `Avatar` interface.
import type { Avatar, AvatarState } from "./avatar";
import { seeded } from "../core/util";

const el = (id: string): any => document.getElementById(id);
const f = (n: number) => n.toFixed(1);

export class SvgAvatar implements Avatar {
  private A = { open: 0, smile: .6, brow: 0, look: 0, lid: 0, nextBlink: 2, blinkT: -9, frame: 0 };

  constructor() { this.paintDetail(); }

  update(now: number, s: AvatarState) {
    const A = this.A;
    if (A.frame++ & 1) return; // 30 fps is plenty for a portrait
    const t = now / 1000, talking = s.talking, mood = s.mood;
    const tgtOpen = talking ? Math.min(1, .12 + .6 * Math.abs(Math.sin(t * 15.5)) * (.45 + .55 * Math.abs(Math.sin(t * 5.3 + 1))) + s.pulse * .25) : 0;
    A.open += (tgtOpen - A.open) * .55;
    A.smile += ((mood === "excited" ? 1 : mood === "suspense" ? .15 : .65) - A.smile) * .15;
    A.brow += ((mood === "excited" || s.gesture ? -5 : mood === "suspense" ? 2.5 : 0) - A.brow) * .2;
    A.look += (s.look * 4.5 - A.look) * .12;
    if (t > A.nextBlink) { A.blinkT = t; A.nextBlink = t + 2 + Math.random() * 3.5; }
    const bp = (t - A.blinkT) / .16; A.lid = bp >= 0 && bp < 1 ? Math.sin(bp * Math.PI) : 0;
    const nod = s.gesture ? Math.sin(t * 7) * 1.2 : 0;
    const sway = Math.sin(t * .9) * 1.4 + (talking ? Math.sin(t * 3.1) * 1.1 : 0) - A.look * .35;
    el("hHead").setAttribute("transform", "rotate(" + sway.toFixed(2) + " 150 292) translate(0 " + ((talking ? Math.sin(t * 6.2) * .8 : 0) + nod).toFixed(2) + ")");
    el("hBody").setAttribute("transform", "translate(0 " + (Math.sin(t * 1.5) * 1.2).toFixed(2) + ")");
    el("hPupils").setAttribute("transform", "translate(" + A.look.toFixed(2) + " " + (mood === "suspense" ? -1 : 0) + ")");
    el("hBrows").setAttribute("transform", "translate(0 " + A.brow.toFixed(2) + ")");
    const lidH = f(A.lid * 19 + (mood === "excited" ? 0 : 2)); el("hLidL").setAttribute("height", lidH); el("hLidR").setAttribute("height", lidH);
    const o = A.open, sm = A.smile, w = 16 + sm * 4 - o * 2, cy = -sm * 3.5, low = 1 + o * 17 + sm * 2;
    el("hMouthIn").setAttribute("d", "M" + f(-w + 1) + " " + f(cy) + "Q0 " + f(low + 2) + " " + f(w - 1) + " " + f(cy) + "Q0 " + f(cy - 1 + sm) + " " + f(-w + 1) + " " + f(cy) + "Z");
    el("hLipU").setAttribute("d", "M" + f(-w) + " " + f(cy) + "Q" + f(-w / 2) + " " + f(-6 - sm) + " 0 -3.5Q" + f(w / 2) + " " + f(-6 - sm) + " " + f(w) + " " + f(cy) + "Q0 " + f(cy + 1.5 + sm * 2) + " " + f(-w) + " " + f(cy) + "Z");
    el("hLipL").setAttribute("d", "M" + f(-w + 1.5) + " " + f(cy + .3) + "Q0 " + f(low + 2) + " " + f(w - 1.5) + " " + f(cy + .3) + "Q0 " + f(low + 12) + " " + f(-w + 1.5) + " " + f(cy + .3) + "Z");
    el("hTeeth").setAttribute("height", f(Math.max(0, Math.min(4.5, o * 9 - .8)))); el("hTeeth").setAttribute("y", f(cy * .3 + 1));
  }

  /** Hair strands and fur collar, scattered once with a fixed seed. */
  private paintDetail() {
    const NS = "http://www.w3.org/2000/svg", r = seeded(77), P = (x: number, y: number) => x.toFixed(1) + " " + y.toFixed(1);
    const add = (g: Element, d: string, col: string, w: string, op: string) => {
      const e = document.createElementNS(NS, "path");
      e.setAttribute("d", d); e.setAttribute("stroke", col); e.setAttribute("stroke-width", w); e.setAttribute("fill", "none"); e.setAttribute("opacity", op); e.setAttribute("stroke-linecap", "round");
      g.appendChild(e);
    };
    const HC = ["#8f5e3f", "#6b412c", "#1f1009", "#a87050", "#2e190f"];
    type Pt = [number, number];
    const curve = (g: Element, n: number, pts: () => Pt[]) => {
      for (let i = 0; i < n; i++) { const q = pts(); add(g, "M" + P(...q[0]) + "C" + P(...q[1]) + " " + P(...q[2]) + " " + P(...q[3]), HC[i % 5], (.5 + r() * .9).toFixed(2), (.22 + r() * .4).toFixed(2)); }
    };
    const back = el("hStrandB"), front = el("hStrandF"), fur = el("hFur");
    if (!back || !front || !fur) return;
    curve(back, 90, () => { const x = 96 + r() * 108; return [[x, 98 + r() * 12], [x + (x - 150) * .3, 170 + r() * 30], [x + (x - 150) * .2 + (r() - .5) * 20, 260 + r() * 30], [80 + r() * 140, 352]]; });
    for (const side of [-1, 1]) {
      const X = (x: number) => 150 + side * (150 - x);
      curve(front, 70, () => [[X(108 + r() * 28), 126 + r() * 12], [X(94 + r() * 14), 172 + r() * 22], [X(96 + r() * 14), 240 + r() * 22], [X(88 + r() * 26), 300 + r() * 14]]);
    }
    curve(front, 40, () => [[100 + r() * 70, 100 + r() * 8], [130 + r() * 40, 112 + r() * 10], [160 + r() * 30, 124 + r() * 12], [176 + r() * 28, 142 + r() * 14]]);
    const FC = ["#ffffff", "#f3ede5", "#e2d7ca", "#cdbfaf", "#faf6f0"];
    for (let i = 0; i < 360; i++) {
      const side = i % 2 ? 1 : -1, u = r(), w0 = (1 - u) * (1 - u), w1 = 2 * (1 - u) * u, w2 = u * u;
      const bx = w0 * 150 + w1 * (150 + side * 32) + w2 * (150 + side * 74), by = w0 * 334 + w1 * 296 + w2 * 316 + (r() - .5) * 24;
      const ang = Math.PI / 2 + side * (.2 + u * .8) + (r() - .5) * 1.6, len = 5 + r() * 8;
      add(fur, "M" + P(bx, by) + "l" + P(Math.cos(ang) * len, Math.sin(ang) * len), FC[i % 5], (1 + r() * 1.5).toFixed(2), (.5 + r() * .5).toFixed(2));
    }
  }
}
