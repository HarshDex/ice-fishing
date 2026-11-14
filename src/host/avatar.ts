// What the presenter tells the face to do. Any avatar — the current SVG portrait, a glTF/VRM 3D head
// with ARKit blendshapes, or a MetaHuman exported to the web — only has to implement `Avatar`.
export type Mood = "happy" | "excited" | "suspense";

export interface AvatarState {
  talking: boolean;   // a line is being spoken
  pulse: number;      // 0..1 spike on each spoken word (from speech boundary events) for livelier lip motion
  mood: Mood;
  look: number;       // -1 = towards the wheel/scene, 0 = at the camera
  gesture: boolean;   // emphasise this moment (nod, raised brows, a hand gesture on 3D avatars)
}

export interface Avatar {
  /** Called every frame with the current time (ms) and what the presenter is doing. */
  update(now: number, s: AvatarState): void;
}
