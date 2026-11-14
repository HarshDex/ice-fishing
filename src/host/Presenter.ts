// Mira, the presenter. She never guesses: the round engine emits events carrying the real numbers,
// and every line she says is built from those. Speech uses the browser's voices (best ones first);
// swap `speak()` for a cloud TTS later without touching the dialogue rules.
import { bus, type EventMap, type EventType } from "../core/events";
import { TYPES } from "../game/config";
import { fmt, pref, rnd, savePref } from "../core/util";
import { ac, applyDuck, duckS } from "../audio/audio";
import type { Avatar, Mood } from "./avatar";

interface Line { text: string; pri: number; exp: number; mood?: Mood; gesture?: boolean; lock?: boolean; guard?: number }
interface SayOpts { ttl?: number; mood?: Mood; gesture?: boolean; lock?: boolean }

const LIFT: (string[] | null)[] = [null,
  ["That's too much for the rod. We need the crane!", "The rod can't hold it. Bring in the crane!"],
  ["It's still coming! Send the helicopter!", "The crane is not enough. Helicopter, please!"],
  ["This fish is enormous! Call the cargo jet!", "Still more fish! We need the cargo jet!"],
  ["I don't believe it. Release the robot!", "Only one thing can lift this. Send the robot!"]];

export class Presenter {
  private synth = window.speechSynthesis;
  private voiceOn = pref("flsVoice", true);
  private voice: SpeechSynthesisVoice | null = null;
  private savedName: string | null = null;
  private queue: Line[] = [];
  private cur: Line | null = null;
  private welcomed = false;
  private lastPick: Record<string, number> = {};
  private mood: Mood = "happy";
  private look = 0;
  private gestureUntil = 0;
  private pulse = 0;
  private caption = document.getElementById("caption")!;

  constructor(private avatar: Avatar) {
    try { this.savedName = localStorage.getItem("flsVoiceName"); } catch { /* storage blocked */ }
    if (this.synth) { this.pickVoice(); this.synth.onvoiceschanged = () => this.pickVoice(); }
    bus.on((type, data) => this.react(type, data));
  }

  get voiceEnabled() { return this.voiceOn; }

  // ---------- voices ----------
  /** Neural / online voices sound human; the old desktop voices sound robotic. Female voices first. */
  private vscore(v: SpeechSynthesisVoice) {
    const n = v.name; let s = 0;
    if (/natural|neural/i.test(n)) s += 60;
    if (/google/i.test(n)) s += 35;
    if (/online/i.test(n) || !v.localService) s += 8;
    if (/Neerja|Aria|Jenny|Sonia|Libby|Ava|Emma|Michelle|Natasha|Clara|Female|Samantha|Karen|Moira|Tessa|Serena|Molly|Maisie|Heera|Zira|Hazel|Susan|Catherine/i.test(n)) s += 20;
    if (/en-IN/i.test(v.lang)) s += 6;
    if (/Desktop|eSpeak/i.test(n) || (v.localService && !/natural|neural|google/i.test(n))) s -= 25;
    if (/\bMale\b|Guy|Ryan|Prabhat|Christopher|Eric|Roger|Steffan|Andrew|Brian|Thomas|William|Ravi|David|Mark|George|James|Richard|Sean/i.test(n)) s -= 40;
    return s;
  }
  private ranked() { return this.synth ? this.synth.getVoices().filter(v => /^en/i.test(v.lang)).sort((a, b) => this.vscore(b) - this.vscore(a)) : []; }
  private pickVoice() { const vs = this.ranked(); this.voice = vs.find(v => v.name === this.savedName) || vs[0] || null; }

  // ---------- speech queue: one voice at a time, urgent lines cut in, stale small talk is dropped ----------
  private pick(key: string, arr: string[]) {
    let i: number; do { i = rnd(0, arr.length - 1); } while (arr.length > 1 && this.lastPick[key] === i);
    this.lastPick[key] = i; return arr[i];
  }
  private start(it: Line, afterCancel = false) {
    this.cur = it; if (it.mood) this.mood = it.mood; if (it.gesture) this.gestureUntil = performance.now() + 1800;
    this.caption.textContent = it.text; this.caption.classList.add("on"); duckS.talk = true; applyDuck();
    const est = 700 + it.text.length * 62, speak = this.voiceOn && this.synth && ac;
    it.guard = window.setTimeout(() => this.done(it), speak ? est + 2500 : est);
    if (!speak) return;
    const u = new SpeechSynthesisUtterance(it.text), human = this.voice && this.vscore(this.voice) >= 35;
    if (this.voice) { u.voice = this.voice; u.lang = this.voice.lang; }
    u.rate = human ? 1.02 : .96; u.pitch = human ? 1 : 1.04; u.volume = 1;
    u.onend = u.onerror = () => this.done(it);
    u.onboundary = () => { this.pulse = 1; };
    const go = () => { if (this.cur === it) try { this.synth.speak(u); } catch { /* speech unavailable */ } };
    afterCancel ? setTimeout(go, 90) : go();
  }
  private done(it: Line) {
    if (this.cur !== it) return;
    clearTimeout(it.guard); this.cur = null;
    const now = performance.now(); let nx: Line | undefined;
    while ((nx = this.queue.shift())) if (nx.exp > now) break;
    if (nx) { const n = nx; this.cur = n; setTimeout(() => { if (this.cur === n) this.start(n); }, 240); return; } // a short breath between lines
    duckS.talk = false; applyDuck(); this.mood = "happy";
    setTimeout(() => { if (!this.cur) this.caption.classList.remove("on"); }, 900);
  }
  say(text: string, pri: number, o: SayOpts = {}) {
    const it: Line = { text, pri, exp: performance.now() + (o.ttl || 3500), mood: o.mood, gesture: o.gesture, lock: o.lock };
    if (!this.cur) return this.start(it);
    if (pri > this.cur.pri && !this.cur.lock) {
      clearTimeout(this.cur.guard); this.cur = null; if (this.synth) this.synth.cancel();
      this.queue = this.queue.filter(q => q.pri >= pri); return this.start(it, true);
    }
    this.queue = this.queue.filter(q => q.pri >= pri).slice(-1); this.queue.push(it);
  }

  // ---------- dialogue rules: only facts from the event ----------
  private react<K extends EventType>(type: K, d: EventMap[K]) {
    const e = d as any, nm = e.key ? TYPES[e.key as keyof typeof TYPES].name : "";
    switch (type) {
      case "BETTING_OPEN":
        this.look = 0;
        if (!this.welcomed) { this.welcomed = true; return this.say("Welcome to Frozen Lake Spin! I'm Mira. Place your bets!", 1, { ttl: 6000, gesture: true }); }
        return this.say(this.pick(type, ["Bets are open! Pick your spots.", "New round, everyone. Place your bets!", "Here we go again. Where are your chips going?", "The ice is waiting. Get your bets in!", "Fresh round! Choose your fish."]), 1, { ttl: 3000 });
      case "BETTING_CLOSING": return this.say(this.pick(type, ["Last few seconds!", "Hurry, betting is closing!", "Final call for bets!"]), 1, { ttl: 1400 });
      case "BETTING_CLOSED":
        return this.say(e.total ? this.pick(type, ["No more bets. Good luck!", "Bets are closed. Fingers crossed!", "That's it, bets are in!"]) : this.pick(type + "0", ["Bets are closed. Let's watch this one.", "No bets from you this time. Let's see."]), 2, { ttl: 2000 });
      case "MULTIPLIERS": return this.say(this.pick(type, [e.count + " boosts on the wheel, up to " + e.max + " times!", "Multipliers are in. The best one is " + e.max + " times!", "Look at those boosts. " + e.max + " times is up there!"]), 1, { ttl: 2200 });
      case "SPIN_STARTED": this.look = -1; return this.say(this.pick(type, ["And the wheel is off!", "Here we go. Round and round!", "Spinning! Where will it stop?", "Off it goes!"]), 1, { ttl: 2500 });
      case "SPIN_TENSE": this.look = -1; return this.say(this.pick(type, ["Slowing down... come on!", "Ooh, this is close!", "Almost there. Which one is it?", "One more peg? Maybe?"]), 2, { ttl: 2500, mood: "suspense" });
      case "BONUS_TRIGGERED": {
        this.look = 0;
        const lines: Record<string, string[]> = { blue: ["Blue Bite! Let's go fishing!", "A Blue Bite bonus! Grab the rod!"], orange: ["Orange Haul! This could be a big one!", "It's the Orange Haul bonus. Let's see what's down there!"], red: ["Red Giant! Oh my, this is the big one!", "It's the Red Giant! Hold on tight!"] };
        return this.say(this.pick(type + e.key, lines[e.key]) + (e.mult > 1 ? " And it has a " + e.mult + " times boost!" : ""), 3, { ttl: 4500, mood: "excited", gesture: true });
      }
      case "ROUND_RESULT": {
        this.look = 0;
        const head = e.mult > 1 ? nm + " with a " + e.mult + " times boost!" : this.pick(type, ["It's " + nm + ".", nm + " it is.", "We've landed on " + nm + "."]);
        const tail = e.win > 0 ? (e.net > 0 ? this.pick(type + "w", ["You win " + fmt(e.win) + " chips!", "That's " + fmt(e.win) + " chips for you!", fmt(e.win) + " chips. Nicely done!"]) : "You get " + fmt(e.win) + " chips back.")
          : e.total > 0 ? this.pick(type + "l", ["Not this time.", "No luck there.", "So close. Next round!"]) : "";
        return this.say(head + " " + tail, 3, { ttl: 4000, mood: e.net > 0 ? "excited" : "happy", gesture: e.net > 0, lock: true });
      }
      case "FISH_HOOKED": this.look = -1; return this.say(this.pick(type, ["Something's on the line!", "We've got a bite!", "Fish on!"]), 1, { ttl: 2000, mood: "excited" });
      case "FISH_STUCK": if (!this.cur && Math.random() < .45) this.say(this.pick(type, ["Is that all of it?", "Come on, a little more!", "Ooh, it's fighting!", "Is there more down there?"]), 0, { ttl: 900, mood: "suspense" }); return;
      case "LIFTER_CALLED": return this.say(this.pick(type + e.stage, LIFT[e.stage]!), 2, { ttl: 3500, mood: "excited", gesture: true });
      case "BONUS_RESULT": {
        this.look = 0;
        const head = e.wheelMult > 1 ? "A " + e.fishMult + " times fish, times " + e.wheelMult + " from the wheel. That's " + e.total + " times!"
          : this.pick(type, [e.fishMult + " times! What a catch!", "It's a " + e.fishMult + " times fish!", "Out it comes. " + e.fishMult + " times!"]);
        return this.say(head + (e.stake ? " You win " + fmt(e.payout) + " chips!" : ""), 3, { ttl: 5000, mood: "excited", gesture: true, lock: true });
      }
    }
  }

  /** Per-frame: drive the avatar from the speech state. */
  tick(now: number) {
    this.pulse *= .8;
    this.avatar.update(now, { talking: !!this.cur, pulse: this.pulse, mood: this.mood, look: this.look, gesture: now < this.gestureUntil });
  }

  // ---------- voice picker ----------
  toggleVoice() { this.voiceOn = !this.voiceOn; savePref("flsVoice", this.voiceOn); if (!this.voiceOn && this.synth) this.synth.cancel(); return this.voiceOn; }
  fillMenu(m: HTMLElement, onChange: () => void) {
    const vs = this.ranked().slice(0, 12);
    m.innerHTML = "<b>MIRA'S VOICE</b>";
    const mk = (label: string, sel: boolean, fn: () => void) => {
      const b = document.createElement("button"); b.textContent = label; if (sel) b.className = "sel";
      b.onclick = () => { fn(); m.classList.remove("on"); onChange(); }; m.appendChild(b);
    };
    mk("\u{1F507}  Voice off", !this.voiceOn, () => { this.voiceOn = false; savePref("flsVoice", false); if (this.synth) this.synth.cancel(); });
    vs.forEach(v => mk((this.vscore(v) >= 35 ? "★ " : "") + v.name.replace(/^(Microsoft|Google) /, "").replace(/ - .*$/, "") + "  ·  " + v.lang, this.voiceOn && this.voice === v, () => {
      this.voice = v; this.voiceOn = true; this.savedName = v.name; savePref("flsVoice", true);
      try { localStorage.setItem("flsVoiceName", v.name); } catch { /* storage blocked */ }
      this.say("Hi, I'm Mira! This is how I'll sound. Let's go fishing!", 4, { ttl: 5000, mood: "excited" });
    }));
    const note = document.createElement("div"); note.className = "vnote";
    note.textContent = vs.length ? "★ = natural-sounding voice. For the most human voices, open the game in Microsoft Edge or Chrome." : "This browser has no English voices. Try Microsoft Edge or Chrome.";
    m.appendChild(note);
  }
}
