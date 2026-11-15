// The wheel as a real 3D object: a thick lacquered body leaning back on its axle, chrome bezel, raised
// dividers, brass pegs, glossy hub dome and a sprung flapper. A key light casts real shadows from the
// pegs, flapper and bezel onto the face, and an environment map makes the metal reflect.
// Units: 1 unit = 600px of the original 1200px design, so the wheel's outer radius is ~1.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { ARC, N } from "../game/config";
import { TAU, seeded } from "../core/util";
import { drawFace, drawHubLabel, HUB, R_FACE, R_SEG } from "./faceArt";
import { PEG_R } from "./physics";

const U = (px: number) => px / 600;
const R_BEZ = 546, R_OUT = 598;
const CANVAS_SCALE = 1.28;   // the canvas extends past the wheel so the ice around it fits
const FOV = 30;              // a fairly wide lens, so depth reads as depth
// The wheel faces the camera dead-on, like a game-show wheel on a broadcast: pointer and hub exactly centred.
// Depth comes from the bevels, the lighting and real shadows, not from turning the wheel.
const WOBBLE = .0045;        // a real wheel is never perfectly true: it wobbles once per turn
const DEPTH = .2;            // thickness of the wheel body
const Z = new THREE.Vector3(0, 0, 1), X = new THREE.Vector3(1, 0, 0);

export class Wheel3D {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(FOV, 1, .1, 60);
  private rig = new THREE.Group();      // everything that leans back together
  private rotor = new THREE.Group();    // the part that spins
  private flapper = new THREE.Group();
  private housing!: THREE.Mesh;
  private faceCanvas = document.createElement("canvas");
  private blurCanvas = document.createElement("canvas");
  private faceTex: THREE.CanvasTexture;
  private blurTex: THREE.CanvasTexture;
  private blurMat: THREE.MeshStandardMaterial;
  private hlMesh: THREE.Mesh | null = null;
  private hlMat = new THREE.MeshBasicMaterial({ color: 0xffd95a, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  private qWobble = new THREE.Quaternion().setFromAxisAngle(X, WOBBLE);
  private small = Math.min(screen.width, screen.height) < 700;
  private shake = 0;
  private lastHits = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
    this.scene.environmentIntensity = .7; // reflections, but let the key light and its shadows carry the contrast

    const size = 2048; // the face texture stays sharp even when the wheel zooms in on the flapper
    this.faceCanvas.width = this.faceCanvas.height = size;
    this.blurCanvas.width = this.blurCanvas.height = size / 2;
    this.faceTex = new THREE.CanvasTexture(this.faceCanvas);
    this.blurTex = new THREE.CanvasTexture(this.blurCanvas);
    for (const t of [this.faceTex, this.blurTex]) { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = this.renderer.capabilities.getMaxAnisotropy(); }
    this.blurMat = new THREE.MeshStandardMaterial({ map: this.blurTex, transparent: true, opacity: 0, roughness: .62, metalness: 0, depthWrite: false, envMapIntensity: .1 });

    this.scene.add(this.rig);
    this.buildLights();
    this.buildBacking();
    this.buildIceFrame();
    this.buildBody();
    this.buildRotor();
    this.buildHub();
    this.buildFlapper();
    this.rig.add(this.rotor);
    this.setMultipliers({});

    this.camera.position.set(0, 0, U(600) * CANVAS_SCALE / Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
    this.camera.lookAt(0, 0, 0);
  }

  // ---------- construction ----------
  private buildLights() {
    this.scene.add(new THREE.HemisphereLight(0xcfeaff, 0x061a30, .4));
    const key = new THREE.DirectionalLight(0xfff3e2, 3.0); // warm key from the upper left: it draws the shadows
    key.position.set(-2.5, 2.7, 2.2);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const sc = key.shadow.camera; sc.left = -1.35; sc.right = 1.35; sc.top = 1.35; sc.bottom = -1.35; sc.near = .5; sc.far = 12;
    key.shadow.bias = -.0004; key.shadow.normalBias = .012; key.shadow.radius = 5;
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x6fd0ff, .55); fill.position.set(3, -1.2, 2.2); this.scene.add(fill);   // cold fill from the ice
    const rim = new THREE.PointLight(0x59d8ff, 5, 5, 1.6); rim.position.set(0, .4, -1); this.scene.add(rim);          // glow behind the rim
  }
  private buildBacking() { // soft dark shadow the wheel throws on whatever is behind it; separates it from the bright ice
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const x = c.getContext("2d")!, g = x.createRadialGradient(128, 128, 60, 128, 128, 128);
    g.addColorStop(0, "rgba(0,6,16,.85)"); g.addColorStop(.7, "rgba(0,6,16,.7)"); g.addColorStop(1, "rgba(0,6,16,0)");
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.42, 2.42), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    m.position.set(.025, -.035, -DEPTH - .06); this.rig.add(m);
  }
  /** A thick collar of rough, faceted ice the wheel is set into, with snow lying along the top. */
  private buildIceFrame() {
    const r = seeded(41), ph = Array.from({ length: 6 }, () => r() * TAU);
    // lumpy surface: a few overlapping waves around the ring and across the tube, all repeating once per turn
    const bump = (a: number, v: number) => .55 * Math.sin(5 * a + ph[0]) + .35 * Math.sin(11 * a + ph[1]) + .25 * Math.sin(23 * a + ph[2] + v * 2)
      + .2 * Math.sin(37 * a + ph[3] + v * 3) + .15 * Math.sin(3 * v + 7 * a + ph[4]);
    const R0 = 1.075, TUBE = .095;
    const frame = (radius: number, tube: number, amp: number, arc: number, start: number, zScale: number, colour: (a: number, v: number, n: number) => THREE.Color) => {
      const g = new THREE.TorusGeometry(radius, tube, 14, Math.round(260 * arc / TAU), arc); g.rotateZ(start);
      const pos = g.attributes.position, nrm = g.attributes.normal, cols: number[] = [], P = new THREE.Vector3(), Nn = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        P.fromBufferAttribute(pos, i); Nn.fromBufferAttribute(nrm, i);
        const a = Math.atan2(P.y, P.x), v = Math.atan2(Nn.z, Math.hypot(Nn.x, Nn.y));
        const n = bump(a, v);
        P.addScaledVector(Nn, n * amp); P.z *= zScale;
        pos.setXYZ(i, P.x, P.y, P.z);
        const c = colour(a, v, n); cols.push(c.r, c.g, c.b);
      }
      g.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
      g.computeVertexNormals();
      return g;
    };
    const ice = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: .12, metalness: 0, clearcoat: 1, clearcoatRoughness: .08, flatShading: true, emissive: 0x062b4a, emissiveIntensity: .5, envMapIntensity: 1.3 });
    const iceGeo = frame(R0, TUBE, .045, TAU, 0, .7, (a, v, n) => new THREE.Color().setHSL(.56 + n * .012, .7, .42 + n * .09 + Math.sin(a) * .05 + v * .06));
    const iceMesh = new THREE.Mesh(iceGeo, ice); iceMesh.position.z = -DEPTH * .45; iceMesh.receiveShadow = true; this.rig.add(iceMesh);
    // snow lying on the upper part of the frame (two drifts, leaving the pointer housing clear)
    const snow = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9, metalness: 0, emissive: 0x9fd8f2, emissiveIntensity: .12 });
    for (const [start, arc] of [[.32, .95], [1.88, .92]] as [number, number][]) {
      const g = frame(R0 + .05, .042, .022, arc, start, .5, (_a, _v, n) => new THREE.Color().setHSL(.56, .3, .93 + n * .02));
      const m = new THREE.Mesh(g, snow); m.position.z = -DEPTH * .45 + .045; this.rig.add(m);
    }
  }
  private lathe(points: [number, number][], mat: THREE.Material) {
    const g = new THREE.LatheGeometry(points.map(([rr, h]) => new THREE.Vector2(rr, h)), 160);
    g.rotateX(Math.PI / 2); // lie flat in the wheel plane; profile height becomes depth (+z, toward the viewer)
    const mesh = new THREE.Mesh(g, mat); mesh.castShadow = mesh.receiveShadow = true; this.rig.add(mesh); return mesh;
  }
  private buildBody() {
    const chrome = new THREE.MeshStandardMaterial({ color: 0xaab7c4, metalness: 1, roughness: .2, side: THREE.DoubleSide });
    const lacquer = new THREE.MeshPhysicalMaterial({ color: 0x0a2444, metalness: .3, roughness: .35, clearcoat: .6, clearcoatRoughness: .15, envMapIntensity: .5, side: THREE.DoubleSide });
    const gold = new THREE.MeshStandardMaterial({ color: 0xe8b84a, metalness: 1, roughness: .22 });
    // a tall rounded chrome bezel that stands proud of the face and throws a shadow onto it
    this.lathe([[U(R_FACE - 4), 0], [U(R_FACE - 1), .034], [U(509), .062], [U(521), .078], [U(533), .07], [U(542), .044], [U(R_BEZ + 1), .012]], chrome);
    // lacquered outer band, then the side wall of the wheel body running back
    this.lathe([[U(R_BEZ), .012], [U(556), .03], [U(576), .034], [U(591), .024], [U(R_OUT), .002], [U(R_OUT), -DEPTH], [U(R_OUT - 40), -DEPTH - .03]], lacquer);
    for (const [rad, z] of [[R_OUT - 4, .02], [R_OUT, -DEPTH * .5]] as [number, number][]) { // gold trim lines
      const t = new THREE.Mesh(new THREE.TorusGeometry(U(rad), .0065, 10, 200), gold); t.position.z = z; this.rig.add(t);
    }
    const bolts = new THREE.InstancedMesh(new THREE.SphereGeometry(.0125, 14, 10), chrome, 24), m = new THREE.Matrix4();
    for (let i = 0; i < 24; i++) { const a = (i + .5) / 24 * TAU; bolts.setMatrixAt(i, m.makeTranslation(Math.cos(a) * U(567), Math.sin(a) * U(567), .034)); }
    bolts.castShadow = true; this.rig.add(bolts);
  }
  private buildRotor() {
    const faceMat = new THREE.MeshStandardMaterial({ map: this.faceTex, roughness: .62, metalness: 0, envMapIntensity: .1 }); // a printed face: saturated colour, only a soft sheen
    const face = new THREE.Mesh(new THREE.CircleGeometry(U(R_FACE), 160), faceMat); face.receiveShadow = true; this.rotor.add(face);
    const blur = new THREE.Mesh(new THREE.CircleGeometry(U(R_FACE), 160), this.blurMat); blur.position.z = .001; blur.receiveShadow = true; this.rotor.add(blur);

    const chrome = new THREE.MeshStandardMaterial({ color: 0xb4c0cc, metalness: 1, roughness: .22 });
    const brass = new THREE.MeshStandardMaterial({ color: 0xd9a233, metalness: 1, roughness: .26 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xe8b84a, metalness: 1, roughness: .22 });
    const len = U(R_SEG - HUB), mid = U((R_SEG + HUB) / 2);
    const ridges = new THREE.InstancedMesh(new THREE.BoxGeometry(len, .0075, .013), chrome, N);
    const pegGeo = new THREE.CapsuleGeometry(U(9.5), U(26), 6, 18); pegGeo.rotateX(Math.PI / 2); // rounded-top pins standing out of the face
    const pegs = new THREE.InstancedMesh(pegGeo, brass, N);
    const collars = new THREE.InstancedMesh(new THREE.TorusGeometry(U(11.5), U(3), 8, 20), chrome, N);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < N; i++) {
      const a = -i * ARC; // canvas angles run clockwise, 3D angles run counter-clockwise
      q.setFromAxisAngle(Z, a);
      const px = Math.cos(a) * U(PEG_R), py = Math.sin(a) * U(PEG_R);
      ridges.setMatrixAt(i, m.compose(new THREE.Vector3(Math.cos(a) * mid, Math.sin(a) * mid, .006), q, one));
      pegs.setMatrixAt(i, m.compose(new THREE.Vector3(px, py, U(17)), q, one));
      collars.setMatrixAt(i, m.makeTranslation(px, py, .003));
    }
    ridges.castShadow = pegs.castShadow = true; ridges.receiveShadow = true;
    const inner = new THREE.Mesh(new THREE.TorusGeometry(U(R_SEG + 1), .005, 8, 200), gold); inner.position.z = .004;
    this.rotor.add(ridges, pegs, collars, inner);
  }
  private buildHub() {
    const chrome = new THREE.MeshStandardMaterial({ color: 0xaab7c4, metalness: 1, roughness: .18 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(U(119), U(17), 28, 120), chrome); ring.position.z = .024; ring.castShadow = true; this.rig.add(ring);
    const c = document.createElement("canvas"); c.width = c.height = 512; drawHubLabel(c.getContext("2d")!, 512);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const R = U(104), dome = new THREE.SphereGeometry(R, 64, 24, 0, TAU, 0, Math.PI / 2);
    dome.rotateX(Math.PI / 2); dome.scale(1, 1, .5);
    const pos = dome.attributes.position, uv = dome.attributes.uv; // planar UVs so the label reads straight on
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / (2 * R) + .5, pos.getY(i) / (2 * R) + .5);
    const mesh = new THREE.Mesh(dome, new THREE.MeshPhysicalMaterial({ map: tex, roughness: .22, metalness: 0, clearcoat: .5, clearcoatRoughness: .1, envMapIntensity: .45 }));
    mesh.position.z = .034; mesh.castShadow = true; this.rig.add(mesh);
  }
  private buildFlapper() {
    const sc = .0021, P = (x: number, y: number): [number, number] => [(x - 30) * sc, -(y - 18) * sc];
    const sh = new THREE.Shape();
    sh.moveTo(...P(14, 18)); sh.quadraticCurveTo(...P(14, 4), ...P(30, 4)); sh.quadraticCurveTo(...P(46, 4), ...P(46, 18));
    sh.lineTo(...P(35, 88)); sh.quadraticCurveTo(...P(30, 96), ...P(25, 88)); sh.lineTo(...P(14, 18));
    const geo = new THREE.ExtrudeGeometry(sh, { depth: .014, bevelEnabled: true, bevelThickness: .007, bevelSize: .005, bevelSegments: 4, curveSegments: 18 });
    const red = new THREE.MeshPhysicalMaterial({ color: 0xe01f0c, roughness: .35, metalness: 0, clearcoat: .35, clearcoatRoughness: .2, envMapIntensity: .3 });
    const flap = new THREE.Mesh(geo, red); flap.position.z = -.007; flap.castShadow = true;
    const chrome = new THREE.MeshStandardMaterial({ color: 0xaab7c4, metalness: 1, roughness: .18 });
    const capGeo = new THREE.CylinderGeometry(9 * sc, 10 * sc, .034, 32); capGeo.rotateX(Math.PI / 2);
    const cap = new THREE.Mesh(capGeo, chrome); cap.position.z = .014; cap.castShadow = true;
    this.flapper.add(flap, cap);
    this.flapper.position.set(0, .925, .11);
    this.rig.add(this.flapper);

    // chrome housing the flapper hangs from, bolted to the top of the bezel
    const C = 600, M = (x: number, y: number): [number, number] => [(x - C) / 600, 1 - y / 600];
    const hs = new THREE.Shape();
    hs.moveTo(...M(C - 54, 3)); hs.lineTo(...M(C + 54, 3)); hs.quadraticCurveTo(...M(C + 54, 34), ...M(C + 28, 78));
    hs.quadraticCurveTo(...M(C, 92), ...M(C - 28, 78)); hs.quadraticCurveTo(...M(C - 54, 34), ...M(C - 54, 3));
    this.housing = new THREE.Mesh(new THREE.ExtrudeGeometry(hs, { depth: .04, bevelEnabled: true, bevelThickness: .012, bevelSize: .009, bevelSegments: 5, curveSegments: 24 }), chrome);
    this.housing.position.z = .04; this.housing.castShadow = true; this.rig.add(this.housing);
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
    this.hlMesh.position.z = .009; this.rotor.add(this.hlMesh);
  }

  // Resolution: never below the screen's own pixel density. Normally 1.5x above it for smooth edges; if the
  // device genuinely can't keep up it drops back toward 1x and climbs again once frames are fast. While the
  // wheel is zoomed on the flapper (CSS scale 1.5) it always renders at 1.5x so the zoom stays sharp.
  private cssPx = 0;
  private quality = 1;          // 0 = screen resolution, 1 = 1.5x supersampled
  private zoomed = false;
  private slowFrames = 0;
  private fastFrames = 0;
  private appliedRatio = 0;
  private targetRatio() {
    const dpr = devicePixelRatio || 1;
    return Math.min(dpr * (this.zoomed ? 1.5 : 1 + .5 * this.quality), 3);
  }
  setSize(cssPx: number) { this.cssPx = cssPx; this.applySize(true); }
  setZoomed(on: boolean) { this.zoomed = on; this.applySize(); }
  private applySize(force = false) {
    const ratio = this.targetRatio();
    if (!force && Math.abs(ratio - this.appliedRatio) < .01) return;
    this.appliedRatio = ratio;
    const px = Math.round(this.cssPx * CANVAS_SCALE);
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(px, px, false);
    this.camera.aspect = 1; this.camera.updateProjectionMatrix();
  }
  private adaptQuality(dt: number) {
    if (document.hidden || dt > .25 || this.zoomed) return; // throttled tabs and one-off hitches say nothing about the GPU
    if (dt > 1 / 35) { this.slowFrames++; this.fastFrames = 0; } else if (dt < 1 / 55) { this.fastFrames++; this.slowFrames = Math.max(0, this.slowFrames - 1); }
    if (this.slowFrames > 90 && this.quality > 0) { this.quality = Math.max(0, this.quality - .5); this.slowFrames = 0; this.applySize(); }
    else if (this.fastFrames > 300 && this.quality < 1) { this.quality = Math.min(1, this.quality + .5); this.fastFrames = 0; this.applySize(); }
  }

  /** `pegHits` is the physics' running count of pegs striking the flapper: each one jolts the housing a little. */
  render(now: number, dt: number, rot: number, flap: number, speed: number, pegHits: number) {
    this.rotor.quaternion.setFromAxisAngle(Z, -rot).multiply(this.qWobble); // spin, with the wobble fixed to the wheel
    this.flapper.rotation.z = -flap;
    if (pegHits !== this.lastHits) { this.lastHits = pegHits; this.shake = Math.min(1, .35 + speed * .12); }
    this.shake *= Math.exp(-dt * 26);
    const j = this.shake * .0035 * Math.sin(now * .09);
    this.housing.position.x = j; this.flapper.position.x = j;
    this.blurMat.opacity = Math.max(0, Math.min(.4, (speed - 3.2) / 4)); // a touch of motion blur only at full speed
    if (this.hlMesh) this.hlMat.opacity = .25 + .3 * (.5 + .5 * Math.sin(now / 160));
    this.renderer.render(this.scene, this.camera);
    this.adaptQuality(dt);
  }
}
