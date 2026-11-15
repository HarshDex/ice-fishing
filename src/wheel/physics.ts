// Wheel physics, kept free of any rendering so it can be tested on its own (see scripts/sim.ts)
// or run on a server.
//
// One fixed-step simulation (480 Hz) drives the wheel the whole time:
//   idle – a motor turns it slowly (2.5 rpm) while bets are open and between games
//   spin – a motor torque winds it up to ~45 rpm, then it coasts freely
//   hold – parked on the result
//
// Forces while coasting (all per unit of wheel inertia):
//   bearing friction   constant, always opposing motion (this is what finally stops it)
//   viscous drag       proportional to speed
//   air drag           proportional to speed squared (matters only when fast)
//   flapper            every peg has to bend the spring-loaded flapper to get past: a spring force
//                      plus contact damping, and a small impact loss each time a peg strikes it.
// Near the end a peg can bend the flapper to its limit and either just slip through or get shoved
// back, which is the nail-biting finish. The wheel can never rest with a peg under the pointer.
//
// Angles follow the screen: `rot` grows clockwise, and the pointer sits at the top (-90°).
import { ARC, N } from "../game/config";
import { TAU } from "../core/util";

export const PEG_R = 485;                              // peg circle radius on the 1200px face design
const FR_A = .13, FR_B = .26, FR_C = .010;              // bearing, viscous, air
const PEG_K = 13, PEG_C = .55, PEG_IMPACT = .0016;      // flapper spring, contact damping, loss per peg strike
const RELEASE = .13 * ARC, RELEASE_K = 30;             // just after a peg slips past, the flapper slides off its back and nudges the wheel on
const CONTACT = .34 * ARC, FLAP_LEN = 72, FLAP_K = 19000, FLAP_C = 50;
const MOTOR_GAIN = 3.4;                                 // how hard the launch motor pulls toward its target speed
export const SUB = 1 / 480;
export const IDLE_W = TAU * 2.5 / 60, RAMP = 1.5, TENSE_W = 1.0;

export type WheelMode = "idle" | "spin" | "hold";

export class WheelPhysics {
  rot = 0;            // wheel angle (rad, clockwise)
  w = IDLE_W;         // angular speed (rad/s)
  mode: WheelMode = "idle";
  t = 0;              // time since the current spin started
  fd = 0;             // flapper deflection (rad, negative = pushed back by a peg)
  pegHits = 0;        // pegs that have struck the flapper (renderers use it for clicks and shakes)
  private peak = 0;
  private fv = 0;
  private acc = 0;
  private last = 0;
  private wasContact = false;

  /** Angle to the peg that is about to reach the pointer. */
  pegGap() { const a = (((-Math.PI / 2 - this.rot) % TAU) + TAU) % TAU, q = a / ARC; return (q - Math.floor(q)) * ARC; }
  /** Segment index currently under the pointer. */
  index() { const a = (((-Math.PI / 2 - this.rot) % TAU) + TAU) % TAU; return Math.floor(a / ARC) % N; }
  /** True while the motor is still winding the wheel up. */
  get launching() { return this.mode === "spin" && this.t < RAMP; }

  /** Launch speed varies enough that the wheel can end anywhere, whatever angle it started from. */
  startSpin(peak = 4.3 + Math.random() * 2.3) { this.mode = "spin"; this.t = 0; this.peak = peak; }
  hold() { this.mode = "hold"; this.rot = ((this.rot % TAU) + TAU) % TAU; }
  idle() { this.mode = "idle"; }

  private flapStep(gap: number) {
    this.fv += (-FLAP_K * this.fd - FLAP_C * this.fv) * SUB; this.fd += this.fv * SUB;
    if (gap < CONTACT) { // the peg holds the flapper bent
      const target = -Math.asin(Math.min(1, (CONTACT - gap) * PEG_R / FLAP_LEN));
      if (this.fd > target) { this.fd = target; if (this.fv > 0) this.fv = 0; }
    }
  }

  /** One 1/480 s step; returns true when a spin has come to rest. */
  private step() {
    const gap = this.pegGap(), contact = gap < CONTACT;
    if (contact && !this.wasContact && this.w > 0) { this.pegHits++; if (this.mode === "spin") this.w *= 1 - PEG_IMPACT; } // a peg strikes the flapper
    this.wasContact = contact;

    if (this.mode === "idle") this.w += (IDLE_W - this.w) * SUB / .8; // motor eases toward 2.5 rpm
    else if (this.mode === "hold") this.w = 0;
    else {
      this.t += SUB;
      const hold = contact ? -PEG_K * (CONTACT - gap)                   // flapper spring pushing back on the peg in front
        : gap > ARC - RELEASE ? RELEASE_K * (gap - (ARC - RELEASE)) : 0; // ...or sliding off the peg that just passed
      if (this.t >= RAMP && Math.abs(this.w) < 1e-4 && Math.abs(hold) <= FR_A) { this.w = 0; return true; }
      const dir = this.w !== 0 ? Math.sign(this.w) : Math.sign(hold);
      const drag = dir * (FR_A + FR_B * Math.abs(this.w) + FR_C * this.w * this.w);
      const damp = contact ? -PEG_C * this.w : 0;
      const motor = this.t < RAMP ? (this.peak - this.w) * MOTOR_GAIN : 0;
      let nw = this.w + (motor + hold + damp - drag) * SUB;
      // friction can stop the wheel but never reverse it; only the flapper can push it back
      if (this.t >= RAMP && this.w !== 0 && Math.sign(nw) !== Math.sign(this.w) && Math.abs(hold) <= FR_A) nw = 0;
      this.w = nw;
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
