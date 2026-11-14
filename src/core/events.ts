// Typed game events. The round engine emits these with the real numbers; the presenter (and anything
// else, e.g. analytics or a future 3D host) only reacts to them and never decides outcomes itself.
import type { BetKey } from "../game/config";

export interface EventMap {
  BETTING_OPEN: {};
  BETTING_CLOSING: {};
  BETTING_CLOSED: { total: number };
  MULTIPLIERS: { count: number; max: number };
  SPIN_STARTED: {};
  SPIN_TENSE: {};
  BONUS_TRIGGERED: { key: BetKey; mult: number };
  ROUND_RESULT: { key: BetKey; mult: number; win: number; net: number; total: number };
  FISH_HOOKED: {};
  FISH_STUCK: {};
  LIFTER_CALLED: { stage: number };
  BONUS_RESULT: { key: BetKey; fishMult: number; wheelMult: number; total: number; stake: number; payout: number };
}
export type EventType = keyof EventMap;
type Listener = <K extends EventType>(type: K, data: EventMap[K]) => void;

const listeners: Listener[] = [];
export const bus = {
  on(fn: Listener) { listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; },
  emit<K extends EventType>(type: K, data?: EventMap[K]) { for (const fn of listeners) fn(type, (data ?? {}) as EventMap[K]); },
};
