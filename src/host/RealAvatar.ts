// A real presenter instead of the painted portrait. Drop clips or a photo into public/host/ (see the README
// there) and the game picks them up automatically on load:
//   idle.mp4 / idle.webm  + talk.mp4 / talk.webm   two looping clips, cross-faded while Mira speaks
//   mira.jpg / .png / .webp                        a still portrait with gentle breathing and nods
// Nothing found -> the painted SvgAvatar stays.
import type { Avatar, AvatarState } from "./avatar";

const BASE = import.meta.env.BASE_URL + "host/";
const LOAD_TIMEOUT = 15000; // generous: the first seconds are busy setting up the 3D wheel

function layer(el: HTMLElement) {
  el.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 20%;transition:opacity .22s ease;";
  return el;
}

/** Resolves with a playable, muted, looping video, or null if the file is missing or unplayable. */
function loadVideo(names: string[]): Promise<HTMLVideoElement | null> {
  return new Promise(resolve => {
    const v = document.createElement("video");
    v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true; v.preload = "auto";
    v.setAttribute("muted", ""); v.setAttribute("playsinline", "");
    let i = 0, done = false;
    const finish = (ok: boolean) => { if (done) return; done = true; clearTimeout(timer); clearInterval(poll); resolve(ok ? v : null); };
    const next = () => { if (i >= names.length) return finish(false); v.src = BASE + names[i++]; v.load(); };
    v.onloadeddata = () => finish(true);
    v.onerror = () => next();
    // some browsers (background tabs, headless) load the data without firing the event, so also watch the state
    const poll = setInterval(() => { if (v.readyState >= 2 && v.videoWidth > 0) finish(true); }, 200);
    const timer = setTimeout(() => finish(v.readyState >= 2 && v.videoWidth > 0), LOAD_TIMEOUT);
    next();
  });
}
function loadImage(names: string[]): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image(); let i = 0;
    const next = () => { if (i >= names.length) return resolve(null); img.src = BASE + names[i++]; };
    img.onload = () => resolve(img.naturalWidth > 0 ? img : null);
    img.onerror = next;
    next();
  });
}

/** Two clips of a real person: idle (listening, blinking) and talking, cross-faded by the speech state. */
export class VideoAvatar implements Avatar {
  private talking = false;
  constructor(private frame: HTMLElement, private idle: HTMLVideoElement, private talk: HTMLVideoElement) {
    const tag = frame.querySelector(".host-tag");
    frame.insertBefore(layer(idle), tag); frame.insertBefore(layer(talk), tag);
    talk.style.opacity = "0";
    for (const v of [idle, talk]) v.play().catch(() => { /* will start on the first user tap */ });
    addEventListener("pointerdown", () => { for (const v of [idle, talk]) if (v.paused) v.play().catch(() => {}); }, { once: true });
  }
  update(_now: number, s: AvatarState) {
    if (s.talking === this.talking) return;
    this.talking = s.talking;
    if (s.talking && this.talk.duration) this.talk.currentTime = Math.random() * this.talk.duration; // each line starts somewhere new
    this.talk.style.opacity = s.talking ? "1" : "0";
  }
}

/** One real photo, kept alive with breathing, small head movements while talking and a nod on big moments. */
export class PhotoAvatar implements Avatar {
  constructor(frame: HTMLElement, private img: HTMLImageElement) {
    frame.insertBefore(layer(img), frame.querySelector(".host-tag"));
    img.style.transition = "none"; img.style.transformOrigin = "50% 85%";
  }
  update(now: number, s: AvatarState) {
    const t = now / 1000;
    const breathe = 1.012 + Math.sin(t * 1.5) * .006;
    const tilt = (s.talking ? Math.sin(t * 2.7) * .7 : Math.sin(t * .6) * .3) + s.look * .6;
    const nod = s.gesture ? Math.sin(t * 7) * 1.5 : 0;
    this.img.style.transform = `translateY(${nod.toFixed(2)}px) rotate(${tilt.toFixed(2)}deg) scale(${breathe.toFixed(4)})`;
  }
}

/** Look for presenter media in public/host/. Resolves null when there is none (keep the painted portrait). */
export async function findRealAvatar(frame: HTMLElement): Promise<Avatar | null> {
  const [idle, talk] = await Promise.all([loadVideo(["idle.mp4", "idle.webm"]), loadVideo(["talk.mp4", "talk.webm"])]);
  if (idle && talk) return new VideoAvatar(frame, idle, talk);
  if (idle || talk) return new VideoAvatar(frame, (idle || talk)!, (talk || idle)!.cloneNode(true) as HTMLVideoElement);
  const img = await loadImage(["mira.jpg", "mira.png", "mira.webp"]);
  return img ? new PhotoAvatar(frame, img) : null;
}
