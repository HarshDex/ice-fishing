// The wheel as a real 3D object: chrome bezel, raised dividers, brass pegs, glossy hub dome, a sprung
// flapper and ice crystals around it, lit by an environment map so the metal actually reflects.
// Units: 1 unit = 600px of the original 1200px design, so the wheel's outer radius is ~1.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { ARC, N } from "../game/config";
import { TAU, seeded } from "../core/util";
import { drawFace, drawHubLabel, HUB, R_FACE, R_SEG } from "./faceArt";
import { PEG_R } from "./physics";

const U = (px: number) => px / 600;
const R_BEZ = 546, R_OUT = 598;
const CANVAS_SCALE = 1.28;            // the canvas extends past the wheel so the ice around it fits
const FOV = 22;

export class Wheel3D {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(FOV, 1, .1, 60);
  private rotor = new THREE.Group();
  private flapper = new THREE.Group();
  private faceCanvas = document.createElement("canvas");
  private blurCanvas = document.createElement("canvas");
  private faceTex: THREE.CanvasTexture;
  private blurTex: THREE.CanvasTexture;
  private blurMat: THREE.MeshStandardMaterial;
  private hlMesh: THREE.Mesh | null = null;
  private hlMat = new THREE.MeshBasicMaterial({ color: 0xffd95a, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  private tense = 0;
  private tenseTarget = 0;
  private baseDist = U(600) * CANVAS_SCALE / Math.tan(THREE.MathUtils.degToRad(FOV / 2));

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = .92;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;

    const small = Math.min(screen.width, screen.height) < 700;
    const size = small ? 1024 : 2048;
    this.faceCanvas.width = this.faceCanvas.height = size;
    this.blurCanvas.width = this.blurCanvas.height = size / 2;
    this.faceTex = new THREE.CanvasTexture(this.faceCanvas);
    this.blurTex = new THREE.CanvasTexture(this.blurCanvas);
    for (const t of [this.faceTex, this.blurTex]) { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = this.renderer.capabilities.getMaxAnisotropy(); }
    this.blurMat = new THREE.MeshStandardMaterial({ map: this.blurTex, transparent: true, opacity: 0, roughness: .45, metalness: .05, depthWrite: false });

    this.buildLights();
    this.buildBackGlow();
    this.buildIce();
    this.buildBezel();
    this.buildRotor();
    this.buildHub();
    this.buildFlapper();
    this.scene.add(this.rotor);
    this.setMultipliers({});
    this.camera.position.set(0, 0, this.baseDist);
  }

  // ---------- construction ----------
  private buildLights() {
    this.scene.add(new THREE.HemisphereLight(0xd8f2ff, 0x0a2a48, .45));
    const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(-2.2, 3, 4); this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x7fe0ff, .7); fill.position.set(3, -1.5, 2); this.scene.add(fill);
    const back = new THREE.PointLight(0x59d8ff, 6, 6, 1.6); back.position.set(0, .2, -1.1); this.scene.add(back);
  }
  private buildBackGlow() { // soft cyan light behind the wheel, shining through the ice
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const x = c.getContext("2d")!, g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "rgba(160,235,255,.9)"); g.addColorStop(.45, "rgba(70,170,230,.35)"); g.addColorStop(1, "rgba(70,170,230,0)");
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.position.z = -1.2; this.scene.add(m);
  }
  private buildIce() {
    const r = seeded(41);
    const geo = new THREE.ConeGeometry(.5, 1, 5, 1); geo.translate(0, .5, 0); // base at the origin, tip along +y
    const mat = new THREE.MeshPhysicalMaterial({ color: 0xd6f2ff, roughness: .1, metalness: 0, clearcoat: 1, clearcoatRoughness: .08, transparent: true, opacity: .86, flatShading: true, emissive: 0x0b3a5c, emissiveIntensity: .35, envMapIntensity: 1.6 });
    const ringN = 70, backN = 40, ice = new THREE.InstancedMesh(geo, mat, ringN + backN);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), qz = new THREE.Quaternion(), qx = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), col = new THREE.Color();
    const Z = new THREE.Vector3(0, 0, 1), X = new THREE.Vector3(1, 0, 0);
    let i = 0;
    for (; i < ringN; i++) { // crystals the wheel is set into
      const a = i / ringN * TAU + (r() - .5) * .08, top = Math.max(0, Math.sin(a)); // keep the area under the pointer clear
      const nearPointer = Math.abs(a - Math.PI / 2) < .22;
      const h = (nearPointer ? .05 : .12 + r() * .24) * (1 - top * .45), w = .045 + r() * .07;
      p.set(Math.cos(a) * (.965 + r() * .04), Math.sin(a) * (.965 + r() * .04), -.03 - r() * .05);
      qz.setFromAxisAngle(Z, a - Math.PI / 2 + (r() - .5) * .5); qx.setFromAxisAngle(X, .15 + r() * .6); q.multiplyQuaternions(qz, qx);
      ice.setMatrixAt(i, m.compose(p, q, s.set(w, h, w * (.7 + r() * .5))));
      ice.setColorAt(i, col.setHSL(.54 + r() * .03, .55 + r() * .3, .78 + r() * .16));
    }
    for (let k = 0; k < backN; k++, i++) { // a wall of bigger crystals behind, for depth
      const a = k / backN * TAU + (r() - .5) * .2, rad = 1.02 + r() * .5;
      p.set(Math.cos(a) * rad, Math.sin(a) * rad - .1, -.35 - r() * .6);
      qz.setFromAxisAngle(Z, a - Math.PI / 2 + (r() - .5) * .9); qx.setFromAxisAngle(X, r() * .4); q.multiplyQuaternions(qz, qx);
      const w = .14 + r() * .2;
      ice.setMatrixAt(i, m.compose(p, q, s.set(w, .45 + r() * .9, w)));
      ice.setColorAt(i, col.setHSL(.55 + r() * .03, .6, .55 + r() * .25));
    }
    ice.instanceColor!.needsUpdate = true;
    this.scene.add(ice);

    const snowN = 30, snow = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 18, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .85, emissive: 0x9fd8f2, emissiveIntensity: .18 }), snowN);
    for (let k = 0; k < snowN; k++) { // snow resting along the top of the rim
      const a = Math.PI * (.1 + r() * .8); if (Math.abs(a - Math.PI / 2) < .16) { k--; continue; }
      p.set(Math.cos(a) * (1.0 + r() * .05), Math.sin(a) * (1.0 + r() * .05), .01 + r() * .03);
      q.setFromAxisAngle(Z, a - Math.PI / 2);
      snow.setMatrixAt(k, m.compose(p, q, s.set(.035 + r() * .04, .016 + r() * .016, .022)));
    }
    this.scene.add(snow);
  }
  private lathe(points: [number, number][], mat: THREE.Material) {
    const g = new THREE.LatheGeometry(points.map(([rr, h]) => new THREE.Vector2(rr, h)), 160);
    g.rotateX(Math.PI / 2); // lie flat in the wheel plane, height becomes depth (+z, toward the viewer)
    const mesh = new THREE.Mesh(g, mat); this.scene.add(mesh); return mesh;
  }
  private buildBezel() {
    const chrome = new THREE.MeshStandardMaterial({ color: 0xf2f6fa, metalness: 1, roughness: .16, side: THREE.DoubleSide });
    const lacquer = new THREE.MeshPhysicalMaterial({ color: 0x14365c, metalness: .35, roughness: .32, clearcoat: 1, clearcoatRoughness: .12, side: THREE.DoubleSide });
    const gold = new THREE.MeshStandardMaterial({ color: 0xe8b84a, metalness: 1, roughness: .25 });
    this.lathe([[U(R_FACE - 4), 0], [U(R_FACE), .022], [U(510), .04], [U(522), .05], [U(535), .042], [U(543), .024], [U(R_BEZ + 1), .004]], chrome);
    this.lathe([[U(R_BEZ), .004], [U(558), .014], [U(580), .016], [U(594), .009], [U(R_OUT), -.01]], lacquer);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(U(R_OUT - 3), .006, 10, 160), gold); rim.position.z = .008; this.scene.add(rim);
    const inner = new THREE.Mesh(new THREE.TorusGeometry(U(R_SEG + 1), .0045, 8, 160), gold); inner.position.z = .003; this.rotor.add(inner);
  }
  private buildRotor() {
    const face = new THREE.Mesh(new THREE.CircleGeometry(U(R_FACE), 160), new THREE.MeshStandardMaterial({ map: this.faceTex, roughness: .55, metalness: 0, envMapIntensity: .55 }));
    this.rotor.add(face);
    const blur = new THREE.Mesh(new THREE.CircleGeometry(U(R_FACE), 160), this.blurMat); blur.position.z = .001; this.rotor.add(blur);

    const chrome = new THREE.MeshStandardMaterial({ color: 0xe6edf3, metalness: 1, roughness: .2 });
    const len = U(R_SEG - HUB), mid = U((R_SEG + HUB) / 2), ridges = new THREE.InstancedMesh(new THREE.BoxGeometry(len, .0065, .009), chrome, N);
    const brass = new THREE.MeshStandardMaterial({ color: 0xe0b04a, metalness: 1, roughness: .26 });
    const pegGeo = new THREE.CylinderGeometry(U(9.5), U(10.5), U(30), 18); pegGeo.rotateX(Math.PI / 2);
    const pegs = new THREE.InstancedMesh(pegGeo, brass, N);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), Z = new THREE.Vector3(0, 0, 1), one = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < N; i++) {
      const a = -i * ARC; // canvas angles run clockwise, 3D angles run counter-clockwise
      q.setFromAxisAngle(Z, a);
      ridges.setMatrixAt(i, m.compose(new THREE.Vector3(Math.cos(a) * mid, Math.sin(a) * mid, .004), q, one));
      pegs.setMatrixAt(i, m.compose(new THREE.Vector3(Math.cos(a) * U(PEG_R), Math.sin(a) * U(PEG_R), U(15)), q, one));
    }
    this.rotor.add(ridges, pegs);
  }
  private buildHub() {
    const chrome = new THREE.MeshStandardMaterial({ color: 0xf2f6fa, metalness: 1, roughness: .14 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(U(119), U(16), 24, 96), chrome); ring.position.z = .02; this.scene.add(ring);
    const c = document.createElement("canvas"); c.width = c.height = 512; drawHubLabel(c.getContext("2d")!, 512);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const R = U(104), dome = new THREE.SphereGeometry(R, 64, 24, 0, TAU, 0, Math.PI / 2);
    dome.rotateX(Math.PI / 2); dome.scale(1, 1, .42);
    const pos = dome.attributes.position, uv = dome.attributes.uv; // planar UVs so the label reads straight on
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / (2 * R) + .5, pos.getY(i) / (2 * R) + .5);
    const mesh = new THREE.Mesh(dome, new THREE.MeshPhysicalMaterial({ map: tex, roughness: .18, metalness: .1, clearcoat: 1, clearcoatRoughness: .05 }));
    mesh.position.z = .03; this.scene.add(mesh);
  }
  private buildFlapper() {
    const sc = .0018, P = (x: number, y: number): [number, number] => [(x - 30) * sc, -(y - 18) * sc];
    const sh = new THREE.Shape();
    sh.moveTo(...P(14, 18)); sh.quadraticCurveTo(...P(14, 4), ...P(30, 4)); sh.quadraticCurveTo(...P(46, 4), ...P(46, 18));
    sh.lineTo(...P(35, 88)); sh.quadraticCurveTo(...P(30, 96), ...P(25, 88)); sh.lineTo(...P(14, 18));
    const geo = new THREE.ExtrudeGeometry(sh, { depth: .012, bevelEnabled: true, bevelThickness: .006, bevelSize: .004, bevelSegments: 3, curveSegments: 16 });
    const red = new THREE.MeshPhysicalMaterial({ color: 0xe0301a, roughness: .28, metalness: .1, clearcoat: 1, clearcoatRoughness: .06 });
    const flap = new THREE.Mesh(geo, red); flap.position.z = -.006;
    const chrome = new THREE.MeshStandardMaterial({ color: 0xf2f6fa, metalness: 1, roughness: .15 });
    const capGeo = new THREE.CylinderGeometry(9 * sc, 9 * sc, .03, 32); capGeo.rotateX(Math.PI / 2);
    const cap = new THREE.Mesh(capGeo, chrome); cap.position.z = .012;
    this.flapper.add(flap, cap);
    this.flapper.position.set(0, .9096, .07);
    this.scene.add(this.flapper);

    // chrome housing the flapper hangs from
    const C = 600, M = (x: number, y: number): [number, number] => [(x - C) / 600, 1 - y / 600];
    const hs = new THREE.Shape();
    hs.moveTo(...M(C - 54, 3)); hs.lineTo(...M(C + 54, 3)); hs.quadraticCurveTo(...M(C + 54, 34), ...M(C + 28, 78));
    hs.quadraticCurveTo(...M(C, 92), ...M(C - 28, 78)); hs.quadraticCurveTo(...M(C - 54, 34), ...M(C - 54, 3));
    const housing = new THREE.Mesh(new THREE.ExtrudeGeometry(hs, { depth: .02, bevelEnabled: true, bevelThickness: .01, bevelSize: .008, bevelSegments: 4, curveSegments: 20 }), chrome);
    housing.position.z = .03; this.scene.add(housing);
  }

  // ---------- updates ----------
  /** Repaint the face (call when multipliers change) and refresh the motion-blur copy. */
  setMultipliers(mults: Record<number, number>) {
    const size = this.faceCanvas.width, c = this.faceCanvas.getContext("2d")!, k = size / (2 * R_FACE);
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, size, size);
    c.setTransform(k, 0, 0, k, size / 2, size / 2);
    drawFace(c, mults);
    this.faceTex.needsUpdate = true;
    const b = this.blurCanvas.getContext("2d")!, H = this.blurCanvas.width, n = 19;
    b.setTransform(1, 0, 0, 1, 0, 0); b.clearRect(0, 0, H, H);
    for (let i = 0; i < n; i++) { // rotational smear of the face, faded in at speed
      b.save(); b.globalAlpha = 1 / (i + 1); b.translate(H / 2, H / 2); b.rotate((i / (n - 1) - .5) * .22);
      b.drawImage(this.faceCanvas, -H / 2, -H / 2, H, H); b.restore();
    }
    this.blurTex.needsUpdate = true;
  }
  /** Glow on the segment the wheel landed on (canvas segment index), or null to clear. */
  setHighlight(idx: number | null) {
    if (this.hlMesh) { this.rotor.remove(this.hlMesh); this.hlMesh.geometry.dispose(); this.hlMesh = null; }
    if (idx === null) return;
    this.hlMesh = new THREE.Mesh(new THREE.RingGeometry(U(HUB), U(R_SEG), 24, 1, -(idx + 1) * ARC, ARC), this.hlMat);
    this.hlMesh.position.z = .006; this.rotor.add(this.hlMesh);
  }
  /** Zoom the camera onto the flapper for the last few pegs. */
  setTense(on: boolean) { this.tenseTarget = on ? 1 : 0; }

  setSize(cssPx: number) {
    const px = Math.round(cssPx * CANVAS_SCALE);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.setSize(px, px, false);
    this.camera.aspect = 1; this.camera.updateProjectionMatrix();
  }

  render(now: number, dt: number, rot: number, flap: number, speed: number) {
    this.rotor.rotation.z = -rot;
    this.flapper.rotation.z = -flap;
    this.blurMat.opacity = Math.max(0, Math.min(.75, (speed - 2.2) / 2.8));
    if (this.hlMesh) this.hlMat.opacity = .25 + .3 * (.5 + .5 * Math.sin(now / 160));
    this.tense += (this.tenseTarget - this.tense) * (1 - Math.exp(-dt * 2.2));
    const e = this.tense * this.tense * (3 - 2 * this.tense);
    this.camera.position.set(0, .62 * e, this.baseDist + (3.0 - this.baseDist) * e);
    this.camera.lookAt(0, .68 * e, 0);
    this.renderer.render(this.scene, this.camera);
  }
}
