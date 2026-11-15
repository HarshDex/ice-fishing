// Boot: wire the modules together, size the stage, and run one animation loop for everything.
import { $ } from "./core/util";
import { game } from "./core/state";
import { initAudio, musicOn, sfxOn, setMusic, setSfx } from "./audio/audio";
import { Wheel3D } from "./wheel/Wheel3D";
import { Round } from "./game/round";
import { Presenter } from "./host/Presenter";
import { SvgAvatar } from "./host/SvgAvatar";
import { findRealAvatar } from "./host/RealAvatar";
import { buildDock, renderUI } from "./ui/dock";
import { drawFx, sizeFx } from "./ui/confetti";
import { drawBg, snowTile } from "./ui/background";

const wheel = new Wheel3D($("wheel3d"));
const round = new Round(wheel);
const host = new Presenter(new SvgAvatar());
// a real presenter (clips or a photo in public/host/) replaces the painted portrait as soon as it loads
findRealAvatar(document.querySelector(".host-frame")!).then(real => {
  if (!real) return;
  host.setAvatar(real);
  ($("hostSvg") as SVGElement).style.display = "none";
});

// ---------- audio buttons ----------
function renderAudioBtns() {
  $("musicBtn").classList.toggle("off", !musicOn);
  $("sfxBtn").classList.toggle("off", !sfxOn);
  $("voiceBtn").classList.toggle("off", !host.voiceEnabled);
}
$("musicBtn").onclick = () => { setMusic(!musicOn); renderAudioBtns(); };
$("sfxBtn").onclick = () => { setSfx(!sfxOn); renderAudioBtns(); };
$("voiceBtn").onclick = (e: Event) => {
  e.stopPropagation(); initAudio();
  const m = $("voiceMenu"); if (m.classList.toggle("on")) host.fillMenu(m, renderAudioBtns);
};
addEventListener("pointerdown", e => { if (!(e.target as HTMLElement).closest("#voiceMenu, #voiceBtn")) $("voiceMenu").classList.remove("on"); });
addEventListener("pointerdown", initAudio);
addEventListener("keydown", initAudio);

// ---------- layout: fit the wheel into the stage, clear of the host panel on wide screens ----------
let laidOut = "";
const layoutKey = () => { const st = $("stage").getBoundingClientRect(); return [Math.round(st.width), Math.round(st.height), innerWidth, innerHeight, $("host").offsetWidth].join(); };
function layout() {
  laidOut = layoutKey();
  const st = $("stage").getBoundingClientRect();
  const hostW = innerWidth >= 900 ? $("host").offsetWidth + 30 : 0;
  let availW = st.width, D = Math.max(220, Math.min(st.width * .86, st.height * .9, 680));
  if (hostW && (st.width - D) / 2 < hostW) { availW = st.width - hostW; D = Math.max(220, Math.min(availW * .86, st.height * .9, 680)); }
  const w = $("wrap");
  w.style.width = w.style.height = D + "px"; w.style.left = (availW - D) / 2 + "px"; w.style.top = Math.max(2, (st.height - D) / 2) + "px";
  $("status").style.right = (st.width - availW) + "px"; $("banner").style.left = availW / 2 + "px"; $("toast").style.left = availW / 2 + "px";
  document.documentElement.style.setProperty("--capB", Math.round(innerHeight - st.bottom + 46) + "px");
  wheel.setSize(D);
  sizeFx();
}
let resizeT = 0;
const onResize = () => { clearTimeout(resizeT); resizeT = window.setTimeout(() => { layout(); drawBg($("bg")); }, 120); };
addEventListener("resize", onResize);
new ResizeObserver(onResize).observe($("stage"));

// ---------- go ----------
$("s1").style.backgroundImage = snowTile(512, 46, 31);
$("s2").style.backgroundImage = snowTile(340, 26, 77);
buildDock(); renderAudioBtns(); layout(); drawBg($("bg")); renderUI();
round.start();
let frame = 0;
function loop(now: number) {
  if (++frame % 30 === 0 && layoutKey() !== laidOut) onResize(); // resize events can be missed (slow phones, embedded views): re-check twice a second
  round.tick(now);
  host.tick(now);
  drawFx();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
// the first frame is on screen: fade the loading screen out
const hideLoader = () => { const l = $("loader"); if (l) { l.classList.add("done"); setTimeout(() => l.remove(), 600); } };
requestAnimationFrame(() => requestAnimationFrame(hideLoader));
setTimeout(hideLoader, 2500); // safety net if the browser is holding frames back

// Handy for testing in the browser console, e.g. game.debugBonus("red", 2, 300)
Object.assign(window, { game: { state: game, debugBonus: round.debugBonus.bind(round) } });
