// The live round loop, running forever whether or not the player bets:
//   bet (countdown) -> closed (multipliers drop) -> spin -> result | bonus -> settle -> next round
// It owns the outcome and payouts and emits events; the presenter, HUD and sounds only react.
import { $, rnd } from "../core/util";
import { BET_TIME, CHIPS, KEYS, N, NEXT_ROUND, RESULT_HOLD, TYPES, WHEEL, type BetKey } from "./config";
import { clearBets, game, totalBet } from "../core/state";
import { bus } from "../core/events";
import { WheelPhysics, RAMP, TENSE_W } from "../wheel/physics";
import type { Wheel3D } from "../wheel/Wheel3D";
import { chime, clack, duck, heartbeat, thud, tone } from "../audio/audio";
import { autoRebet, markWin, renderUI, setDockOpen, showBadges } from "../ui/dock";
import { banner, setStatus, timerUI, toast } from "../ui/hud";
import { burst } from "../ui/confetti";
import { playBonus } from "../bonus/BonusScene";

export class Round {
  readonly physics = new WheelPhysics();
  private timerEnd: number | null = null;
  private timerDur = 0;
  private lastSec: number | null = null;
  private lastIdx = -1;
  private lastClick = 0;
  private tense = false;
  private beat = 0;
  private lastFrame = 0;

  constructor(private wheel: Wheel3D) {}

  start() { this.startBetting(); }

  // ---------- phases ----------
  private startBetting() {
    game.phase = "bet"; this.physics.idle(); clearBets();
    if (Object.keys(game.mults).length || game.highlight !== null) { game.mults = {}; game.highlight = null; this.wheel.setHighlight(null); this.wheel.setMultipliers({}); }
    showBadges(); setDockOpen(true);
    setStatus("PLACE YOUR BETS"); bus.emit("BETTING_OPEN");
    this.timerDur = BET_TIME * 1000; this.timerEnd = performance.now() + this.timerDur; this.lastSec = null; timerUI.show(true);
    if (game.auto) autoRebet();
    if (game.balance < CHIPS[0].v) toast("Out of chips — tap Add chips");
    renderUI();
  }

  private updateTimer(now: number) {
    if (game.phase !== "bet" || this.timerEnd === null) return;
    const left = this.timerEnd - now;
    if (left <= 0) { this.timerEnd = null; this.closeBets(); return; }
    const sec = Math.ceil(left / 1000);
    if (sec !== this.lastSec) {
      this.lastSec = sec; timerUI.set(sec, left / this.timerDur);
      if (sec <= 3) tone(sec === 1 ? 1320 : 990, .12, .12, "square");
      if (sec === 3) bus.emit("BETTING_CLOSING");
    }
    timerUI.ring(left / this.timerDur);
  }

  private closeBets() {
    game.phase = "closed"; timerUI.show(false); setDockOpen(false);
    const total = totalBet();
    game.balance -= total; if (total) game.lastBets = { ...game.bets };
    renderUI(); setStatus("BETS CLOSED"); tone(660, .25, .12, "triangle"); bus.emit("BETTING_CLOSED", { total });
    // random boosts drop onto a few segments, one at a time
    const picks: number[] = [], count = rnd(3, 6);
    while (picks.length < count) { const i = rnd(0, N - 1); if (!picks.includes(i)) picks.push(i); }
    setTimeout(() => setStatus("MULTIPLIERS!", "res"), 900);
    picks.forEach((i, n) => setTimeout(() => {
      game.mults[i] = TYPES[WHEEL[i]].bonus ? rnd(2, 6) : rnd(2, 8);
      this.wheel.setMultipliers(game.mults); showBadges(); tone(900 + n * 120, .18, .1, "triangle");
    }, 1000 + n * 230));
    setTimeout(() => bus.emit("MULTIPLIERS", { count, max: Math.max(...Object.values(game.mults)) }), 1000 + count * 230);
    setTimeout(() => this.runSpin(), 1000 + count * 230 + 500);
  }

  private runSpin() {
    if (game.phase !== "closed") return;
    game.phase = "spin"; this.tense = false;
    $("wrap").classList.add("spinning"); setStatus(""); bus.emit("SPIN_STARTED");
    this.physics.startSpin(); // ~40–50 rpm
  }

  private spinStopped() {
    this.physics.hold(); clearInterval(this.beat); $("wrap").classList.remove("spinning");
    setTimeout(() => { this.land(this.physics.index()); duck(false); }, 700);
    setTimeout(() => { this.wheel.setTense(false); $("vig").classList.remove("on"); }, 1900);
  }

  private land(idx: number) {
    game.phase = "result";
    const key = WHEEL[idx], wm = game.mults[idx] || 1;
    game.highlight = idx; this.wheel.setHighlight(idx);
    if (TYPES[key].bonus) {
      setStatus(TYPES[key].name.toUpperCase() + " BONUS!", "res"); chime([660, 880, 1100, 1320]); bus.emit("BONUS_TRIGGERED", { key, mult: wm });
      setTimeout(async () => {
        game.phase = "bonus";
        const { total } = await playBonus(key, wm, game.bets[key]);
        game.phase = "result";
        this.settle(key, total, true);
      }, 2000);
    } else this.settle(key, wm, false);
  }

  private settle(key: BetKey, mult: number, fromBonus: boolean) {
    const t = TYPES[key], stake = game.bets[key], total = totalBet();
    const win = stake ? stake * mult + stake : 0;
    game.balance += win;
    game.past.unshift({ k: key, m: mult }); game.past = game.past.slice(0, 18);
    markWin(key);
    setStatus(t.name.toUpperCase() + (mult > 1 ? "  " + mult + "x" : ""), "res");
    if (win) {
      banner(win); chime([880, 1100, 1320, 1760]);
      const r = $("stage").getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height * .4, Math.min(170, 30 + Math.round(win / 8)));
    } else if (total) thud(); else tone(520, .2, .08, "triangle");
    if (!fromBonus) bus.emit("ROUND_RESULT", { key, mult, win, net: win - total, total });
    renderUI();
    setTimeout(() => { if (game.phase === "result") { setStatus("NEXT GAME SOON"); this.physics.idle(); } }, RESULT_HOLD);
    setTimeout(() => this.startBetting(), NEXT_ROUND);
  }

  // ---------- per frame ----------
  tick(now: number) {
    const dt = this.lastFrame ? Math.min(.1, (now - this.lastFrame) / 1000) : 1 / 60; this.lastFrame = now;
    const p = this.physics, stopped = p.advance(now);
    const idx = p.index();
    if (idx !== this.lastIdx) {
      if (this.lastIdx >= 0 && now - this.lastClick > 40) { clack(p.w, p.mode !== "spin"); this.lastClick = now; }
      this.lastIdx = idx;
    }
    if (p.mode === "spin" && !this.tense && p.t > RAMP && p.w < TENSE_W) { // the last few pegs: zoom in on the flapper
      this.tense = true; this.wheel.setTense(true); $("vig").classList.add("on"); duck(true); bus.emit("SPIN_TENSE");
      heartbeat(); this.beat = window.setInterval(heartbeat, 620);
    }
    if (stopped && p.mode === "spin") this.spinStopped();
    this.wheel.render(now, dt, p.rot, p.fd, p.mode === "spin" ? p.w : 0);
    this.updateTimer(now);
  }

  /** For testing: force the next landing and bonus (used from the browser console). */
  debugBonus(key: BetKey, wheelMult = 1, fishMult?: number) {
    if (game.phase !== "bet") return toast("Wait for betting to open");
    this.timerEnd = null; timerUI.show(false); setDockOpen(false);
    game.phase = "bonus"; game.balance -= totalBet(); renderUI();
    playBonus(key, wheelMult, game.bets[key], fishMult).then(({ total }) => { game.phase = "result"; this.settle(key, total, true); });
  }
}

export { KEYS };
