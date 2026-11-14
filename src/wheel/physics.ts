// Wheel physics, kept free of any rendering so it can be tested on its own or run on a server.
//
// One fixed-step simulation (480 Hz) drives the wheel the whole time:
//   idle – a motor turns it slowly (2.5 rpm) while bets are open and between games
//   spin – it is pushed smoothly from its idle speed up to ~40–50 rpm, then coasts under friction;
//          each peg has to bend the spring-loaded flapper to get past, so the last pegs can stall it at the edge
//   hold – parked on the result
//
// Angles follow the screen: `rot` grows clockwise, and the pointer sits at the top (-90°).
import { ARC } from "../game/config";
import { TAU } from "../core/util";

export const PEG_R = 485, PEG_FACE = 600;        // peg radius on the 1200px face drawing
const FR_A = .14, FR_B = .3, PEG_K = 13, CONTACT = .34 * ARC, FLAP_LEN = 72, FLAP_K = 19000, FLAP_C = 50;
export const SUB = 1 / 480;
export const IDLE_W = TAU * 2.5 / 60, RAMP = 1.5, TENSE_W = 1.0;

export type WheelMode = "idle" | "spin" | "hold";

export class WheelPhysics {
  rot = 0;            // wheel angle (rad, clockwise)
  w = IDLE_W;         // angular speed (rad/s)
  mode: WheelMode = "idle";
  t = 0;              // time since the current spin started
  private w0 = 0;
  private peak = 0;
  fd = 0;             // flapper deflection (rad, negative = pushed back by a peg)
  private fv = 0;
  private acc = 0;
  private last = 0;

  /** Angle to the peg that is about to reach the pointer. */
  pegGap() { const a = (((-Math.PI / 2 - this.rot) % TAU) + TAU) % TAU, q = a / ARC; return (q - Math.floor(q)) * ARC; }
  /** Segment index currently under the pointer. */
  index() { const a = (((-Math.PI / 2 - this.rot) % TAU) + TAU) % TAU; return Math.floor(a / ARC) % Math.round(TAU / ARC); }

  startSpin(peak = 4.2 + Math.random() * 1.1) { this.mode = "spin"; this.t = 0; this.w0 = this.w; this.peak = peak; }
  hold() { this.mode = "hold"; this.rot = ((this.rot % TAU) + TAU) % TAU; }
  idle() { this.mode = "idle"; }

  private flapStep(gap: number) {
    this.fv += (-FLAP_K * this.fd - FLAP_C * this.fv) * SUB; this.fd += this.fv * SUB;
    if (gap < CONTACT) {
      const target = -Math.asin(Math.min(1, (CONTACT - gap) * PEG_R / FLAP_LEN));
      if (this.fd > target) { this.fd = target; if (this.fv > 0) this.fv = 0; }
    }
  }

  /** One 1/480 s step; returns true when a spin has come to rest. */
  private step() {
    const gap = this.pegGap();
    if (this.mode === "idle") this.w += (IDLE_W - this.w) * SUB / .8; // motor eases toward 2.5 rpm
    else if (this.mode === "hold") this.w = 0;
    else {
      this.t += SUB;
      if (this.t < RAMP) { const x = this.t / RAMP; this.w = this.w0 + (this.peak - this.w0) * x * x * (3 - 2 * x); }
      else {
        const spring = gap < CONTACT ? -PEG_K * (CONTACT - gap) : 0;
        if (Math.abs(this.w) < 1e-4 && Math.abs(spring) <= FR_A) { this.w = 0; return true; }
        const dir = this.w !== 0 ? Math.sign(this.w) : Math.sign(spring);
        let nw = this.w + (spring - dir * (FR_A + FR_B * Math.abs(this.w))) * SUB;
        if (this.w !== 0 && Math.sign(nw) !== Math.sign(this.w) && Math.abs(spring) <= FR_A) nw = 0;
        this.w = nw;
      }
    }
    this.rot += this.w * SUB;
    this.flapStep(gap);
    return false;
  }

  /** Advance to wall-clock time `now` (ms). Catches up after dropped frames, so the wheel keeps real time. */
  advance(now: number) {
    if (!this.last) this.last = now;
    this.acc += Math.min(3, (now - this.last) / 1000); this.last = now;
    while (this.acc >= SUB) { this.acc -= SUB; if (this.step()) { this.acc = 0; return true; } }
    return false;
  }
}
