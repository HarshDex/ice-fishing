// Boot: wire the modules together, size the stage, and run one animation loop for everything.
import "./styles.css";
import { $ } from "./core/util";
import { game } from "./core/state";
import { initAudio, musicOn, sfxOn, setMusic, setSfx } from "./audio/audio";
import { Wheel3D } from "./wheel/Wheel3D";
import { Round } from "./game/round";
import { Presenter } from "./host/Presenter";
import { SvgAvatar } from "./host/SvgAvatar";
import { buildDock, renderUI } from "./ui/dock";
import { drawFx, sizeFx } from "./ui/confetti";
import { drawBg, snowTile } from "./ui/background";

const wheel = new Wheel3D($("wheel3d"));
const round = new Round(wheel);
const host = new Presenter(new SvgAvatar());

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
function layout() {
  const st = $("stage").getBoundingClientRect();
  const hostW = innerWidth >= 900 ? $("host").offsetWidth + 30 : 0;
  let availW = st.width, D = Math.max(220, Math.min(st.width * .98, st.height * 1.1, 760));
  if (hostW && (st.width - D) / 2 < hostW) { availW = st.width - hostW; D = Math.max(220, Math.min(availW * .98, st.height * 1.1, 760)); }
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
function loop(now: number) {
  round.tick(now);
  host.tick(now);
  drawFx();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Handy for testing in the browser console, e.g. game.debugBonus("red", 2, 300)
Object.assign(window, { game: { state: game, debugBonus: round.debugBonus.bind(round) } });
