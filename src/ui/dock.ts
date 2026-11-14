// The betting panel: bet tiles, chips, Auto / Repeat / Undo / Double, balance, results strip and the
// free play-chip top-up menu. It only edits `game` state; the round engine decides when bets count.
import { $, fmt, short } from "../core/util";
import { BONUS_KEYS, CHIPS, CRYSTAL_D, FISH_D, KEYS, START_BALANCE, TOPUPS, TYPES, WHEEL, snowD, type BetKey } from "../game/config";
import { clearBets, game, saveBalance, sumOf, totalBet, type BetPair } from "../core/state";
import { chipSound, tone } from "../audio/audio";
import { cartoonFish } from "../art/cartoonFish";
import { burst } from "./confetti";
import { toast } from "./hud";

function iconSVG(k: BetKey) {
  if (k === "snow") return '<svg viewBox="-34 -34 68 68"><path d="' + snowD(28) + '" fill="none" stroke="#134a68" stroke-width="5" stroke-linecap="round"/></svg>';
  return '<svg viewBox="-34 -36 68 76"><path d="' + CRYSTAL_D + '" fill="#eaf8ff" stroke="#0d3550" stroke-width="3" stroke-linejoin="round"/><path d="M0-30V34M-13-10H13" stroke="#0d355077" stroke-width="2"/></svg>';
}

export function buildDock() {
  KEYS.forEach(k => {
    const t = TYPES[k], b = document.createElement("button");
    b.id = "bet-" + k; b.className = "tile " + (t.bonus ? "bonus" : "base");
    b.style.cssText = "grid-area:" + k + ";--c1:" + t.card[0] + ";--c2:" + t.card[1] + ";color:" + t.cardInk;
    if (t.bonus) {
      b.innerHTML = "<canvas width='330' height='228'></canvas><b>" + t.name.toUpperCase() + "</b><small>BONUS " + t.bonus[0] + "x–" + t.bonus[1] + "x</small><span class='stake'></span><span class='mbadge'></span>";
      cartoonFish(b.querySelector("canvas")!.getContext("2d"), k);
    } else b.innerHTML = iconSVG(k) + "<span>" + t.name + " · 1:1</span><span class='stake'></span><span class='mbadge'></span>";
    b.onclick = () => addBets([[k, game.chip]]);
    $("tiles").appendChild(b);
  });
  const all = document.createElement("button");
  all.id = "bet-all"; all.className = "tile all"; all.style.cssText = "grid-area:all;--c1:#2c5684;--c2:#0a1f38";
  all.innerHTML = '<svg viewBox="-50 -40 100 80">' + ([["blue", -22, -6], ["orange", 0, 8], ["red", 22, -6]] as [BetKey, number, number][]).map(f =>
    '<g transform="translate(' + f[2] + " " + f[1] + ') scale(.5)"><path d="' + FISH_D + '" fill="' + TYPES[f[0]].card[0] + '" stroke="#000a" stroke-width="4" stroke-linejoin="round"/></g>').join("") +
    "</svg><span>ALL BONUSES</span>";
  all.onclick = () => addBets(BONUS_KEYS.map(k => [k, game.chip] as BetPair));
  $("tiles").appendChild(all);
  CHIPS.forEach(c => {
    const b = document.createElement("button");
    b.className = "chip"; b.style.setProperty("--c", c.c); b.textContent = c.l; b.dataset.v = String(c.v);
    b.onclick = () => { game.chip = c.v; tone(1600, .03, .08); renderUI(); };
    $("chips").appendChild(b);
  });
  wireControls();
}

export function addBets(pairs: BetPair[], quiet = false) {
  if (game.phase !== "bet") return toast("Bets are closed — wait for the next round");
  if (!pairs.length) return;
  const cost = pairs.reduce((s, p) => s + p[1], 0);
  if (totalBet() + cost > game.balance) return toast("Not enough chips");
  pairs.forEach(p => (game.bets[p[0]] += p[1])); game.undo.push(pairs);
  if (!quiet) chipSound();
  renderUI();
}
const lastBetPairs = () => KEYS.filter(k => game.lastBets[k]).map(k => [k, game.lastBets[k]!] as BetPair);
/** Auto mode: put last round's bet back on the table (called when betting opens). */
export function autoRebet() {
  const sum = sumOf(game.lastBets);
  if (!sum) toast("Auto: place a bet and it will repeat");
  else if (sum > game.balance) { game.auto = false; toast("Auto stopped — not enough chips"); }
  else addBets(lastBetPairs(), true);
}

/** Gold badge on each bet tile with the best boost currently on that spot. */
export function showBadges() {
  KEYS.forEach(k => {
    let mx = 0;
    for (const i in game.mults) if (WHEEL[+i] === k) mx = Math.max(mx, game.mults[+i]);
    const tile = $("bet-" + k), b = tile.querySelector(".mbadge"), txt = mx ? mx + "x" : "";
    tile.classList.toggle("boosted", mx > 0);
    if (b.textContent === txt) return;
    b.textContent = txt; b.style.display = mx ? "flex" : "none";
    b.classList.remove("pop"); void b.offsetWidth; if (mx) b.classList.add("pop");
  });
}

export function renderUI() {
  saveBalance();
  $("balance").textContent = fmt(game.balance - (game.phase === "bet" ? totalBet() : 0));
  $("total").textContent = fmt(totalBet());
  document.querySelectorAll<HTMLElement>(".chip").forEach(c => c.classList.toggle("sel", +c.dataset.v! === game.chip));
  KEYS.forEach(k => { const s = $("bet-" + k).querySelector(".stake"); s.textContent = game.bets[k] ? short(game.bets[k]) : ""; s.style.display = game.bets[k] ? "flex" : "none"; });
  $("auto").classList.toggle("on", game.auto);
  $("past").innerHTML = game.past.map(h => "<span style='background:linear-gradient(160deg," + TYPES[h.k].card[0] + "," + TYPES[h.k].card[1] + ")' title='" + TYPES[h.k].name + "'>" + (h.m > 1 ? "<em>" + h.m + "x</em>" : "") + "</span>").join("");
}

export function setDockOpen(open: boolean) {
  $("dock").classList.toggle("closed", !open);
  if (open) document.querySelectorAll(".tile").forEach(b => b.classList.remove("win"));
}
export const markWin = (k: BetKey) => $("bet-" + k).classList.add("win");

function wireControls() {
  $("undo").onclick = () => {
    if (game.phase !== "bet") return toast("Bets are closed");
    const p = game.undo.pop(); if (p) { p.forEach(q => (game.bets[q[0]] -= q[1])); renderUI(); }
  };
  $("double").onclick = () => addBets(KEYS.filter(k => game.bets[k]).map(k => [k, game.bets[k]] as BetPair));
  $("rebet").onclick = () => {
    if (!sumOf(game.lastBets)) return toast("No previous bet yet");
    if (totalBet()) return toast("Bets already placed");
    addBets(lastBetPairs());
  };
  $("auto").onclick = () => {
    game.auto = !game.auto; toast(game.auto ? "Auto on — repeats your last bet every round" : "Auto off");
    if (game.auto && game.phase === "bet" && !totalBet() && sumOf(game.lastBets) && sumOf(game.lastBets) <= game.balance) addBets(lastBetPairs());
    renderUI();
  };

  // free play-chip top-ups (no real money anywhere)
  const m = $("chipMenu");
  m.innerHTML = "<b>ADD PLAY CHIPS</b>" + TOPUPS.map(t => "<button data-v='" + t.v + "'>" + t.l + "</button>").join("") +
    "<button data-v='reset' class='reset'>Reset to " + fmt(START_BALANCE) + "</button><div class='vnote'>Free play chips for fun only. They have no real value.</div>";
  m.querySelectorAll("button").forEach((b: HTMLButtonElement) => (b.onclick = () => {
    if (b.dataset.v === "reset") {
      if (game.phase !== "bet") return toast("Reset between rounds, while bets are open");
      clearBets(); game.balance = START_BALANCE; toast("Balance reset to " + fmt(START_BALANCE));
    } else {
      const v = +b.dataset.v!; game.balance += v; toast(fmt(v) + " play chips added!");
      const r = $("balance").getBoundingClientRect(); burst(r.left + r.width / 2, r.top, 40);
    }
    chipSound(); m.classList.remove("on"); renderUI();
  }));
  $("refill").onclick = (e: Event) => { e.stopPropagation(); m.classList.toggle("on"); };
  addEventListener("pointerdown", e => { if (!(e.target as HTMLElement).closest("#chipMenu, #refill")) m.classList.remove("on"); });
}
