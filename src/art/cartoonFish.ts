// Friendly cartoon fish for the bet tiles. The realistic fish appear only in the fishing bonus.
import { TAU } from "../core/util";

const TOON = { blue: ["#c9e9ff", "#3d9cf0", "#1560bd"], orange: ["#ffe6b3", "#ff9a2e", "#dd6400"], red: ["#ffcdc4", "#f0483a", "#ad120b"] };
export function cartoonFish(c, k) { // friendly cartoon fish for the bet tiles (330x228 canvas); the realistic ones appear only while fishing
  const [light, mid, fin] = TOON[k], ink = "#0b1830";
  const el = (x, y, rx, ry, rot?) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot || 0, 0, TAU); };
  c.save(); c.translate(168, 108); c.lineJoin = c.lineCap = "round"; c.lineWidth = 7; c.strokeStyle = ink;
  c.fillStyle = fin;
  c.beginPath(); c.moveTo(-68, 0); c.quadraticCurveTo(-108, -22, -132, -64); c.quadraticCurveTo(-112, 0, -132, 64); c.quadraticCurveTo(-108, 22, -68, 0); c.closePath(); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(-34, -56); c.quadraticCurveTo(0, -108, 48, -60); c.closePath(); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(-22, 58); c.quadraticCurveTo(-8, 94, 28, 60); c.closePath(); c.fill(); c.stroke();
  const g = c.createLinearGradient(0, -66, 0, 66); g.addColorStop(0, mid); g.addColorStop(.55, mid); g.addColorStop(1, light);
  c.fillStyle = g; el(10, 0, 96, 66); c.fill(); c.stroke();
  c.fillStyle = "rgba(255,255,255,.4)"; el(0, -40, 46, 10, -.12); c.fill();
  c.fillStyle = fin; c.lineWidth = 5;
  c.beginPath(); c.moveTo(-2, 8); c.quadraticCurveTo(-46, 20, -30, 48); c.quadraticCurveTo(-4, 40, -2, 8); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = "rgba(255,120,150,.55)"; el(36, 26, 11, 8); c.fill();
  c.lineWidth = 6; c.fillStyle = "#fff"; el(58, -16, 25, 25); c.fill(); c.stroke();
  c.fillStyle = ink; el(65, -13, 12, 12); c.fill();
  c.fillStyle = "#fff"; el(60, -20, 5, 5); c.fill();
  c.lineWidth = 5; c.beginPath(); c.arc(72, 16, 20, .3, 1.65); c.stroke();
  c.restore();
}
