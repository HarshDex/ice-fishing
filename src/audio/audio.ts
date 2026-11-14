// Procedural sound: every effect and the music loop are synthesised with the Web Audio API, so the
// game ships with no audio files. Swap any function for a sample player later without touching callers.
import { game } from "../core/state";
import { pref, savePref } from "../core/util";

export let ac: AudioContext | null = null, musicG, sfxG, delayN, noiseBuf, nextNote = 0, step = 0;
export let musicOn = pref("flsMusic", true), sfxOn = pref("flsSfx", true);
export function initAudio() {
  if (ac) { if (ac.state === "suspended" && !document.hidden) ac.resume(); return; }
  const AC = window.AudioContext || (window as any).webkitAudioContext; if (!AC) return;
  ac = new AC();
  musicG = ac.createGain(); musicG.gain.value = musicOn ? .55 : 0; musicG.connect(ac.destination);
  sfxG = ac.createGain(); sfxG.gain.value = sfxOn ? .8 : 0; sfxG.connect(ac.destination);
  delayN = ac.createDelay(1); delayN.delayTime.value = .36;
  const fb = ac.createGain(); fb.gain.value = .38; delayN.connect(fb); fb.connect(delayN); delayN.connect(musicG);
  noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  nextNote = ac.currentTime + .1; setInterval(scheduler, 80);
}
addEventListener("pointerdown", initAudio); addEventListener("keydown", initAudio);
document.addEventListener("visibilitychange", () => { if (ac) document.hidden ? ac.suspend() : ac.resume(); });
export function tone(f: number, dur: number, vol: number, type?: OscillatorType, when?: number): OscillatorNode | null {
  if (!ac) return null;
  const t = ac.currentTime + (when || 0), o = ac.createOscillator(), g = ac.createGain();
  o.type = type || "sine"; o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .006); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g); g.connect(sfxG); o.start(t); o.stop(t + dur + .03); return o;
}
export function hiss(dur: number, vol: number, type: BiquadFilterType, freq: number, q?: number, when?: number): BiquadFilterNode | null {
  if (!ac) return null;
  const t = ac.currentTime + (when || 0), s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuf; s.loop = true; f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q || 1;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(sfxG); s.start(t, Math.random() * .5); s.stop(t + dur + .03); return f;
}
export function clack(speed, idle) { // flapper slipping off a peg: soft tick when idling, light tick when fast, heavy tock when slow
  if (idle) { hiss(.018, .1, "bandpass", 2300, 3); return; }
  if (speed > 1.6) { hiss(.02, .3 + Math.min(.3, speed / 30), "bandpass", 2600, 3); tone(1400, .014, .04, "square"); }
  else { hiss(.035, .7, "bandpass", 1500, 2.5); tone(430, .07, .22, "triangle"); tone(860, .03, .08, "square"); }
}
export function chipSound() { hiss(.03, .35, "bandpass", 4200, 6); tone(2400, .03, .05, "triangle"); hiss(.03, .25, "bandpass", 3600, 6, .045); }
export function chime(notes) { notes.forEach((f, i) => { tone(f, .55, .12, "sine", i * .11); tone(f * 2, .3, .03, "sine", i * .11); }); }
export function thud() { const o = tone(120, .35, .3, "sine"); if (o) o.frequency.exponentialRampToValueAtTime(45, ac.currentTime + .3); }
export function heartbeat() { tone(58, .16, .5, "sine"); tone(52, .2, .4, "sine", .17); }
export function splashSound(vol) { const f = hiss(.6, vol, "lowpass", 4500, .7); if (f) f.frequency.exponentialRampToValueAtTime(350, ac.currentTime + .55); }
export const duckS = { tense: false, talk: false }; // music dips for the tense finish and, a little, whenever the host speaks
export function applyDuck() { if (ac && musicOn) musicG.gain.setTargetAtTime(duckS.tense ? .14 : duckS.talk ? .3 : .55, ac.currentTime, .2); }
export function duck(on) { duckS.tense = on; applyDuck(); }

const STEP = .15, mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const CHORDS = [[50, 57, 60, 65, 69], [46, 53, 57, 62, 65], [41, 53, 57, 60, 64], [48, 55, 60, 64, 67]];
const ARP = [0, 1, 2, 3, 2, 1, 3, 2];
function mNote(f, t, dur, vol, type, dest) {
  const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + .05);
}
function pad(f, t, dur) {
  const lp = ac.createBiquadFilter(), g = ac.createGain(); lp.type = "lowpass"; lp.frequency.value = 750;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.042, t + .7); g.gain.setValueAtTime(.042, t + dur - .5); g.gain.linearRampToValueAtTime(0, t + dur + .3);
  lp.connect(g); g.connect(musicG);
  for (const det of [-7, 7]) { const o = ac.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + dur + .35); }
}
function kick(t, vol) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + .13);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + .24);
  o.connect(g); g.connect(musicG); o.start(t); o.stop(t + .26);
}
function hat(t, vol) {
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuf; f.type = "highpass"; f.frequency.value = 7500;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + .05);
  s.connect(f); f.connect(g); g.connect(musicG); s.start(t, Math.random() * .5); s.stop(t + .07);
}
function playStep(s, t) {
  const ch = CHORDS[(s >> 4) % 4], st = s & 15, hot = game.phase === "spin";
  if (st === 0) for (let i = 1; i < 5; i++) pad(mtof(ch[i]), t, 16 * STEP);
  if (st === 0 || st === 10 || (hot && st === 6)) mNote(mtof(ch[0] - 12), t, .5, .16, "triangle", musicG);
  if (st % 2 === 0) { const n = ch[1 + ARP[st / 2]] + 12; mNote(mtof(n), t, .9, .05, "sine", delayN); mNote(mtof(n), t, .9, .045, "sine", musicG); mNote(mtof(n + 12), t, .35, .012, "sine", musicG); }
  if (st % 8 === 0 || (hot && st % 4 === 0)) kick(t, hot ? .3 : .2);
  if (st % 4 === 2 || hot) hat(t, st % 4 === 2 ? .05 : .025);
}
function scheduler() {
  if (!ac || ac.state !== "running") return;
  if (nextNote < ac.currentTime) nextNote = ac.currentTime + .05;
  while (nextNote < ac.currentTime + .3) { if (musicOn) playStep(step, nextNote); nextNote += STEP; step = (step + 1) % 64; }
}

export function setMusic(on: boolean) { musicOn = on; savePref("flsMusic", on); initAudio(); if (ac) musicG.gain.setTargetAtTime(on ? .55 : 0, ac.currentTime, .05); }
export function setSfx(on: boolean) { sfxOn = on; savePref("flsSfx", on); initAudio(); if (ac) sfxG.gain.setTargetAtTime(on ? .8 : 0, ac.currentTime, .02); }
