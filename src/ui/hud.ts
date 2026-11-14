// On-screen messages: the big status line, toasts, the win banner and the betting countdown ring.
import { $, fmt } from "../core/util";

export function setStatus(t: string, cls = "") {
  const s = $("status"); s.textContent = t; s.className = cls; void s.offsetWidth; s.classList.add("pop");
}

let toastT = 0;
export function toast(msg: string) {
  const e = $("toast"); e.textContent = msg; e.classList.add("on");
  clearTimeout(toastT); toastT = window.setTimeout(() => e.classList.remove("on"), 1900);
}

export function banner(amount: number) {
  const b = $("banner"); $("bannerAmt").textContent = fmt(amount);
  b.classList.remove("show"); void b.offsetWidth; b.classList.add("show");
}

export const timerUI = {
  show(on: boolean) { $("timerBox").classList.toggle("on", on); },
  set(sec: number, frac: number) {
    $("timerNum").textContent = sec; $("timerBox").classList.toggle("hot", sec <= 3);
    $("ringArc").style.strokeDashoffset = (292.2 * (1 - frac)).toFixed(1);
  },
  ring(frac: number) { $("ringArc").style.strokeDashoffset = (292.2 * (1 - frac)).toFixed(1); },
};
