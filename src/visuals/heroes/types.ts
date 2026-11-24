/**
 * 共享类型与国风写意人体骨架常量（完全兼容 mobaCore.js 骨骼驱动与足部/上肢 IK）
 */

export interface HeroModelApi {
  m: {
    crease?: number;
    bone(id: number): HeroModelApi['m'];
    bind(fn: unknown): HeroModelApi['m'];
    paint(hex: number, opts?: Record<string, unknown>): HeroModelApi['m'];
    emit(positions: number[], indices: number[], gradient?: number[] | null, crease?: number): void;
    g(mat: unknown, fn: () => void): void;
    sym(fn: (side: number) => void): void;
    lathe(pts: number[][], opts?: Record<string, unknown>): void;
    tube(pts: number[][], opts?: Record<string, unknown>): void;
    ball(
      x: number,
      y: number,
      z: number,
      rx: number,
      ry: number,
      rz: number,
      flat?: number,
      deg?: number,
    ): void;
    box(
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      bevel?: number,
    ): void;
    extrude(poly: number[][], depth: number, bevel?: number, crease?: number): void;
    torus(
      r: number,
      r1: number,
      r2?: number,
      seg?: number,
      tseg?: number,
      opts?: Record<string, unknown>,
    ): void;
    limb(
      p0: number[],
      p1: number[],
      r0: number,
      r1: number,
      opts?: Record<string, unknown>,
    ): void;
    sheet(
      nu: number,
      nv: number,
      fn: (u: number, v: number) => number[],
      doubleSided?: boolean,
      crease?: number,
    ): void;
    crystal(
      r: number,
      h: number,
      seg: number,
      taper?: number,
      sharp?: number,
      mid?: number,
    ): void;
    bakeGrounding(h?: number, minAo?: number, groundDark?: number): void;
  };
  K: Record<string, number>;
  En?: Record<string, number>;
  pt: (
    x?: number,
    y?: number,
    z?: number,
    rx?: number,
    ry?: number,
    rz?: number,
    sx?: number,
    sy?: number,
    sz?: number,
  ) => { elements: number[] };
  Zi: (joints: number[], pts: number[][], baseBone: number) => unknown;
  af: (
    m: unknown,
    pos: number[],
    dir: number[],
    len: number,
    r: number,
    opts?: Record<string, unknown>,
  ) => void;
  bt: (a: number, b: number, t: number) => number;
}

export interface FullHeroEngineApi extends HeroModelApi {
  Gh: (spec: Record<string, number>) => {
    rig: {
      add: (name: string, parent: number, x: number, y: number, z: number) => number;
      addChain: (name: string, parent: number, pts: number[][]) => number[];
      chain: (opts: Record<string, unknown>) => void;
    };
    J: Record<string, number>;
    d: Record<string, number>;
  };
  Am: Record<string, number>;
  OU: Record<string, number>;
  RU: Record<string, number>;
  GU: Record<string, number>;
  kU: Record<string, number>;
  DU?: Record<string, number>;
  Ra: { tip: number; string: number };
  Co: { head: number; butt: number };
  io: number;
  Sp: number;
  Ls: new () => HeroModelApi['m'];
  En: Record<string, number>;
  Bl: (h: unknown) => unknown;
  Ox: (m: unknown, h: unknown, side: number, opts: Record<string, unknown>) => void;
  Ko: (m: unknown, h: unknown, side: number, r?: number, longSleeve?: boolean) => void;
  Js: (
    m: unknown,
    pts: number[][],
    opts: { width?: number | ((t: number) => number); [k: string]: unknown },
  ) => void;
  Li: (pts: number[][], t: number) => number[];
  Wd: (
    m: unknown,
    x: number,
    y: number,
    z: number,
    rx: number,
    rz: number,
    r1?: number,
    r2?: number,
    seg?: number,
  ) => void;
  qh: (
    m: unknown,
    h: unknown,
    skinHex: number,
    scale?: number,
    neckOff?: number,
    widthScale?: number,
  ) => HeadObj;
  Xh?: (
    m: unknown,
    h: unknown,
    headObj: HeadObj,
    opts: Record<string, unknown>,
  ) => void;
  Cm: (
    m: unknown,
    h: unknown,
    headObj: HeadObj,
    opts: { line?: (v: number) => number; [k: string]: unknown },
  ) => void;
  bc?: (m: unknown, opts: Record<string, unknown>) => void;
}

export interface HeroCompanionMeta {
  kind: 'lion' | 'crane' | 'phoenix' | 'fox' | 'cat' | 'hawk';
  root: number;
  a: number;
  b: number;
  c: number;
}

export interface HeroPoseWriter {
  pos(bone: number, x: number, y: number, z: number): void;
  rot(bone: number, x: number, y: number, z: number): void;
  scale(bone: number, s: number): void;
}

export interface HeroAnimState {
  anim: string;
  t: number;
  p: number;
  time: number;
  seed: number;
}

export interface HeadObj {
  cy: number;
  s: number;
  ring: (offsetY: number) => [number, number, number];
  surf: (x: number, y: number) => number;
}

export const clamp01 = (v: number): number => (v <= 0 ? 0 : v >= 1 ? 1 : v);
export const mixVal = (a: number, b: number, t: number): number => a + (b - a) * clamp01(t);

// ─────────────────────────────────────────────────────────────────────────────
// 四套东方高挑修长英雄骨架（1 : 6.4 ~ 6.8 写意武侠/工笔头身比，兼容原版 IK）
// ─────────────────────────────────────────────────────────────────────────────
export const TS_FEMALE_RIG = {
  ankleY: 0.09,
  kneeY: 0.5,
  hipY: 0.9,
  hipX: 0.096,
  pelvisY: 0.94,
  spineY: 1.1,
  chestY: 1.27,
  neckY: 1.5,
  headY: 1.56,
  clavX: 0.072,
  shoulderX: 0.246,
  shoulderY: 1.44,
  elbowY: 1.15,
  wristY: 0.87,
  handY: 0.78,
};

export const TS_SCHOLAR_RIG = {
  ankleY: 0.09,
  kneeY: 0.5,
  hipY: 0.9,
  hipX: 0.114,
  pelvisY: 0.94,
  spineY: 1.1,
  chestY: 1.28,
  neckY: 1.52,
  headY: 1.58,
  clavX: 0.086,
  shoulderX: 0.278,
  shoulderY: 1.45,
  elbowY: 1.15,
  wristY: 0.88,
  handY: 0.79,
};

export const TS_ASSASSIN_RIG = {
  ankleY: 0.09,
  kneeY: 0.5,
  hipY: 0.9,
  hipX: 0.114,
  pelvisY: 0.94,
  spineY: 1.1,
  chestY: 1.28,
  neckY: 1.52,
  headY: 1.58,
  clavX: 0.088,
  shoulderX: 0.286,
  shoulderY: 1.45,
  elbowY: 1.14,
  wristY: 0.86,
  handY: 0.77,
};

export const TS_GENERAL_RIG = {
  ankleY: 0.1,
  kneeY: 0.49,
  hipY: 0.88,
  hipX: 0.156,
  pelvisY: 0.93,
  spineY: 1.12,
  chestY: 1.31,
  neckY: 1.57,
  headY: 1.63,
  clavX: 0.128,
  shoulderX: 0.376,
  shoulderY: 1.49,
  elbowY: 1.14,
  wristY: 0.81,
  handY: 0.7,
};
