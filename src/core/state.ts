// The single source of truth for one player's game. Every module reads and writes this object,
// so a future server-driven version only has to fill it from the network instead.
import { KEYS, START_BALANCE, type BetKey } from "../game/config";

export type Phase = "idle" | "bet" | "closed" | "spin" | "result" | "bonus";
export type BetPair = [BetKey, number];

function loadBalance() {
  try { const b = parseFloat(localStorage.getItem("flsBalance") ?? ""); if (isFinite(b) && b >= 0) return Math.round(b); } catch { /* storage blocked */ }
  return START_BALANCE;
}

export const game = {
  phase: "idle" as Phase,
  balance: loadBalance(),
  chip: 100,
  bets: Object.fromEntries(KEYS.map(k => [k, 0])) as Record<BetKey, number>,
  lastBets: {} as Partial<Record<BetKey, number>>,
  mults: {} as Record<number, number>,        // wheel segment index -> pre-spin multiplier
  past: [] as { k: BetKey; m: number }[],     // most recent first
  undo: [] as BetPair[][],
  auto: false,
  highlight: null as number | null,           // segment the wheel landed on
};

export const totalBet = () => KEYS.reduce((s, k) => s + game.bets[k], 0);
export const sumOf = (o: Partial<Record<BetKey, number>>) => KEYS.reduce((s, k) => s + (o[k] || 0), 0);
export const clearBets = () => { KEYS.forEach(k => (game.bets[k] = 0)); game.undo = []; };
export function saveBalance() {
  try { localStorage.setItem("flsBalance", String(game.balance)); } catch { /* storage blocked */ }
}
