/**
 * tangsongMonsters3D.ts — 《唐宋荣耀》v5.0 全 6 种野怪《山海经》× 唐宋神兽彻底重塑
 *
 * 100% 脱离原版科幻/西方奇幻生物，逐一重铸为东方古风瑞兽与神话巨灵：
 * 1. mossback     -> 《负碑青苔灵龟 · 小玄武》(青玉甲壳+八卦金棱+苔藓石碑+微松+玄武灵蛇尾)
 * 2. glimwing     -> 《宋画提灯青鸟灵》(翠碧鎏金工笔羽躯+展翅双羽+双飘尾羽+胸悬暖光小宫灯)
 * 3. frost_golem  -> 《敦煌秘色九色玄鹿》(月白秘色瓷釉身+九枝金玉鹿角+悬空明月灵珠+飞天祥云)
 * 4. ember_golem  -> 《赤炎金睛狻猊》(唐狮怒目首+烈焰卷云鬃+朱绶鎏金大铜铃+燃火巨爪)
 * 5. abyss_drake  -> 《汴河青金应龙》(100% 东方蛇形长颈鹿角应龙+双缕龙须物理链+青金羽翼+吐息龙珠)
 * 6. star_colossus-> 《镇岳青铜麒麟尊》(青铜饕餮重甲+鎏金八卦浑天仪三环+敦煌火焰背光+玉玺灵核)
 */

export interface MonsterRig {
  count: number;
  add: (name: string, parent: number, x: number, y: number, z: number) => number;
  addChain: (name: string, parent: number, pts: number[][]) => number[];
  chain: (opts: Record<string, unknown>) => void;
  bx: (id: number) => number;
  by: (id: number) => number;
  bz: (id: number) => number;
}

export interface QuadLeg {
  upper: number;
  lower: number;
  foot: number;
  side: number;
  front: boolean;
  bend: number;
  rx: number;
  ry: number;
  rz: number;
}

export interface QuadRigBundle {
  rig: MonsterRig;
  root: number;
  pelvis: number;
  chest: number;
  neck: number[];
  head: number;
  jaw: number;
  tail: number[];
  legs: QuadLeg[];
}

export interface MonsterMeshBuilder {
  crease: number;
  rough: number;
  bone: (id: number) => MonsterMeshBuilder;
  bind: (fn: unknown) => MonsterMeshBuilder;
  paint: (hex: number, opts?: Record<string, unknown>) => MonsterMeshBuilder;
  g: (mat: unknown, fn: () => void) => void;
  sym: (fn: (side: number) => void) => void;
  lathe: (pts: number[][], opts?: Record<string, unknown>) => void;
  tube: (pts: number[][], opts?: Record<string, unknown>) => void;
  ball: (x: number, y: number, z: number, rx: number, ry: number, rz: number, flat?: number, deg?: number) => void;
  box: (x: number, y: number, z: number, w: number, h: number, d: number, bevel?: number) => void;
  extrude: (poly: number[][], depth: number, bevel?: number) => void;
  torus: (r: number, r1: number, r2?: number, seg?: number, tseg?: number, opts?: Record<string, unknown>) => void;
  sheet: (nu: number, nv: number, fn: (u: number, v: number) => number[], doubleSided?: boolean, crease?: number) => void;
  crystal: (r: number, h: number, seg: number, taper?: number, sharp?: number) => void;
  bakeGrounding: (h?: number, minAo?: number, groundDark?: number) => void;
  build: () => unknown;
  triangleCount: number;
}

export interface MonsterPoseWriter {
  q: Float32Array;
  t: Float32Array;
  s: Float32Array;
  rot: (bone: number, x: number, y: number, z: number) => void;
  add: (bone: number, x: number, y: number, z: number) => void;
  pos: (bone: number, x: number, y: number, z: number) => void;
  move: (bone: number, x: number, y: number, z: number) => void;
  scale: (bone: number, sc: number) => void;
}

export interface MonsterAnimState {
  anim: string;
  p: number;
  t: number;
  time: number;
  stride: number;
  seed: number;
  variant: number;
  windup: number;
  mode: number;
  spawnT: number;
  hitT: number;
}

export interface MonsterEngineApi {
  Wa: new () => MonsterRig;
  Lm: (spec: Record<string, unknown>) => QuadRigBundle;
  Ls: new () => MonsterMeshBuilder;
  K: Record<string, number>;
  En: Record<string, unknown>;
  pt: (x?: number, y?: number, z?: number, rx?: number, ry?: number, rz?: number, sx?: number, sy?: number, sz?: number) => unknown;
  bt: (a: number, b: number, t: number) => number;
  Di: (rig: MonsterRig, bones: number[], blend?: number, end?: number[]) => unknown;
  Ds: (qrig: QuadRigBundle, pose: MonsterPoseWriter, legIdx: number, x: number, y: number, z: number, toe?: number) => void;
  _a: (qrig: QuadRigBundle, pose: MonsterPoseWriter, dx?: number, dz?: number, mask?: number) => void;
  Im: (qrig: QuadRigBundle, pose: MonsterPoseWriter, stride: number, opts: Record<string, unknown>) => void;
  V1: (qrig: QuadRigBundle, pose: MonsterPoseWriter, amt: number, angle?: number, drop?: number) => void;
  XU: (qrig: QuadRigBundle, pose: MonsterPoseWriter, legIdx: number, u?: number, l?: number, f?: number) => void;
  Qn: (a: number, b: number, x: number) => number;
  Gn: (x: number) => number;
  Ct: (x: number, a: number, b: number) => number;
  Xe: (x: number, center: number, width: number) => number;
  Jo: (hitT: number, dur?: number) => number;
}

const TAU = Math.PI * 2;
const clamp01 = (v: number) => (v <= 0 ? 0 : v >= 1 ? 1 : v);
const easePow = (p: number, w: number) => {
  const e = Math.min(0.6, Math.max(0.15, w));
  return p < e ? (p / e) * 0.35 : 0.35 + ((p - e) / (1 - e)) * 0.65;
};

export function createTangSongMonsters(api: MonsterEngineApi) {
  const { Wa, Lm, Ls, K, En, pt, bt, Di, Ds, _a, Im, V1, XU, Qn, Gn, Ct, Xe, Jo } = api;

  // ───────────────────────────────────────────────────────────────────────────
  // 1. mossback -> 《负碑青苔灵龟 · 小玄武》
  // ───────────────────────────────────────────────────────────────────────────
  function buildMossbackTurtle() {
    const qrig = Lm({
      pelvis: [0.52, -0.45],
      chest: [0.54, 0.35],
      neck: [[0.62, 0.68]],
      head: [0.7, 0.94],
      tail: [
        [0.52, -0.82],
        [0.68, -1.16],
        [0.86, -1.3],
      ],
      front: [
        [0.44, 0.48, 0.42],
        [0.56, 0.28, 0.32],
        [0.58, 0.08, 0.5],
      ],
      hind: [
        [0.46, 0.48, -0.5],
        [0.58, 0.28, -0.4],
        [0.58, 0.08, -0.62],
      ],
      bendFront: -1,
      bendHind: 1,
    });
    const rig = qrig.rig;
    const shellBone = rig.add('shell', qrig.pelvis, 0, 0.72, -0.05);
    const steleBone = rig.add('flora', shellBone, 0, 1.02, -0.08);
    const m = new Ls();
    m.crease = 50;

    // 四足龟肢 + 鎏金护甲爪
    qrig.legs.forEach((leg) => {
      const side = leg.side;
      m.bind(Di(rig, [leg.upper, leg.lower, leg.foot], 0.45)).paint(0x3b4d3e, { c2: 0x5c7356, mat: K.leather });
      if (leg.front) {
        m.tube([[side * 0.42, 0.5, 0.42, 0.16, 0.17], [side * 0.54, 0.28, 0.34, 0.13, 0.14], [side * 0.58, 0.12, 0.48, 0.14, 0.15]], { seg: 8, cap0: false });
      } else {
        m.tube([[side * 0.44, 0.5, -0.5, 0.17, 0.18], [side * 0.56, 0.28, -0.4, 0.13, 0.14], [side * 0.58, 0.12, -0.58, 0.13, 0.14]], { seg: 8, cap0: false });
      }
      m.bone(leg.foot).paint(0x344236, { c2: 0x627358, mat: K.leather });
      m.ball(leg.rx, 0.08, leg.rz + 0.05, 0.18, 0.08, 0.2, 1);
      m.paint(0xd8b468, { c2: 0xfff0b2, gloss: 0.7, mat: K.metal });
      for (let k = -1; k <= 1; k++) {
        m.g(pt(leg.rx + k * 0.08, 0.06, leg.rz + 0.21, 76, k * 18 * side, 0), () => m.crystal(0.028, 0.14, 4, 0.75, 0.1));
      }
    });

    // 龟腹暖玉甲 + 墨青颈首 + 双眉翠眸
    m.bind(Di(rig, [qrig.pelvis, qrig.chest], 0.8)).paint(0xcbb382, { c2: 0x806a45, mat: K.rock });
    m.tube(
      [
        [0, 0.48, -0.78, 0.18, 0.12],
        [0, 0.48, -0.45, 0.54, 0.28],
        [0, 0.48, 0.05, 0.6, 0.3],
        [0, 0.48, 0.48, 0.44, 0.24],
        [0, 0.52, 0.7, 0.2, 0.18],
      ],
      { seg: 10, up: [1, 0, 0] },
    );

    m.bind(Di(rig, [qrig.chest, qrig.neck[0], qrig.head], 0.5)).paint(0x4a614c, { c2: 0x708c68, mat: K.leather });
    m.tube([[0, 0.56, 0.54, 0.2, 0.18], [0, 0.64, 0.76, 0.18, 0.16], [0, 0.72, 0.96, 0.22, 0.2]], { seg: 9, up: [1, 0, 0] });
    m.bone(qrig.head);
    m.paint(0x526b54, { c2: 0x89a678, mat: K.leather });
    m.ball(0, 0.72, 1.04, 0.24, 0.2, 0.28, 1);
    m.paint(0xd8b25a, { gloss: 0.8, mat: K.metal });
    m.g(pt(0, 0.68, 1.24, 96, 0, 0), () => m.crystal(0.085, 0.14, 5, 0.65, 0.1));
    m.sym(() => {
      m.paint(0xf7d668, { glow: 0.48, line: 0 });
      m.ball(0.14, 0.78, 1.15, 0.042, 0.046, 0.036, 0);
      m.paint(0x161412, { line: 0 });
      m.ball(0.145, 0.78, 1.18, 0.02, 0.024, 0.014, 0);
      m.paint(0x88a878, { mat: K.rock });
      m.ball(0.11, 0.88, 0.98, 0.045, 0.045, 0.08, 0);
    });

    // 青玉八卦龟甲壳 + 金镶沿
    m.bone(shellBone);
    m.paint(0x2d4a44, { c2: 0x5c8568, ao: 0.85, mat: K.rock, pattern: En.scale, patternScale: 5, patternAmt: 0.3 });
    m.lathe(
      [
        [0.5, 0.76, 0.94, 0, -0.05],
        [0.64, 0.78, 0.96, 0, -0.05],
        [0.86, 0.62, 0.78, 0, -0.05],
        [1.02, 0.36, 0.46, 0, -0.05],
        [1.08, 0.12, 0.16, 0, -0.05],
      ],
      { seg: 8, crease: 35 },
    );
    m.paint(0xd9ae52, { c2: 0xffeba8, gloss: 0.9, mat: K.metal });
    m.g(pt(0, 0.56, -0.05), () => m.torus(0.84, 0.045, 0.04, 8, 4, { crease: 30 }));
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU;
      m.ball(Math.cos(a) * 0.44, 0.88, -0.05 + Math.sin(a) * 0.55, 0.055, 0.03, 0.055, 0);
    }

    // 龟甲上负碑（宋代苔藓青石碑 + 小迎客松）
    m.bone(steleBone);
    m.paint(0x4f5952, { c2: 0x7c877c, mat: K.rock });
    m.box(0, 1.14, -0.1, 0.48, 0.14, 0.34, 0.02);
    m.box(0, 1.38, -0.12, 0.36, 0.44, 0.14, 0.02);
    m.paint(0x283230, { c2: 0xd9a848, mat: K.rock });
    m.box(0, 1.62, -0.12, 0.44, 0.1, 0.22, 0.02);
    m.paint(0xdba844, { glow: 0.22, mat: K.metal, line: 0 });
    m.box(0, 1.38, -0.04, 0.06, 0.28, 0.02, 0);
    // 碑侧微松
    m.paint(0x523928, { mat: K.rock });
    m.tube([[0.16, 1.08, -0.04, 0.04], [0.28, 1.34, -0.06, 0.028], [0.38, 1.48, -0.04, 0.018]], { seg: 5 });
    m.paint(0x4c7a48, { c2: 0x99b860, mat: K.cloth });
    m.ball(0.38, 1.54, -0.04, 0.16, 0.075, 0.15, 1);
    m.ball(0.24, 1.44, 0.02, 0.12, 0.06, 0.11, 1);

    // 玄武盘曲灵蛇尾（3 节 + 灵蛇小首朝 +Z/+Y 扬起）
    m.bind(Di(rig, [qrig.pelvis, ...qrig.tail], 0.5)).paint(0x264a46, { c2: 0x5c9e82, mat: K.leather, pattern: En.scale, patternScale: 10, patternAmt: 0.3 });
    m.tube(
      [
        [0, 0.52, -0.78, 0.12, 0.11],
        [0.06, 0.62, -1.04, 0.095, 0.09],
        [0.04, 0.84, -1.26, 0.075, 0.075],
        [0, 1.0, -1.22, 0.095, 0.085],
      ],
      { seg: 8, up: [1, 0, 0] },
    );
    m.bone(qrig.tail[2]);
    m.paint(0x4c9e84, { c2: 0xe6c86e, mat: K.leather });
    m.ball(0, 1.02, -1.16, 0.095, 0.075, 0.13, 0);
    m.paint(0xffae38, { glow: 0.5, line: 0 });
    m.ball(0.065, 1.05, -1.12, 0.02, 0.02, 0.02, 0);
    m.ball(-0.065, 1.05, -1.12, 0.02, 0.02, 0.02, 0);

    m.bakeGrounding(1.65);

    const animate = (pose: MonsterPoseWriter, st: MonsterAnimState, fx: { glow: number; tint?: number; tintColor?: number }) => {
      const t = st.time + st.seed * 12;
      const move = st.anim === 'move';
      let legsOk = true;
      let glow = 1;
      switch (st.anim) {
        case 'dead': {
          const d = Math.min(1, st.t / 1.4);
          const s1 = Gn(Ct(d, 0, 0.4));
          const s2 = Gn(Ct(d, 0.38, 1));
          pose.pos(qrig.root, 0, -0.28 * s2, 0);
          pose.rot(qrig.root, 12 * s1 - 14 * s2, 0, 14 * s2);
          pose.rot(qrig.head, 16 * s2, 0, 0);
          qrig.legs.forEach((lg, idx) => XU(qrig, pose, idx, -40 * s2, 20 * s2, 10 * s2));
          legsOk = false;
          glow = Math.max(0.05, 1 - d);
          break;
        }
        case 'attack': {
          const p = easePow(st.p, st.windup);
          const w = Gn(Ct(p, 0, 0.32));
          const s = Gn(Ct(p, 0.32, 0.44)) * (1 - Gn(Ct(p, 0.56, 1)));
          pose.move(qrig.pelvis, 0, -0.06 * w, -0.14 * w + 0.32 * s);
          pose.add(qrig.pelvis, -10 * w + 8 * s, 0, 0);
          pose.add(qrig.head, -14 * w + 20 * s, 0, 0);
          pose.rot(qrig.tail[2], -18 * w + 26 * s, 0, 0);
          glow = 1 + 0.9 * s;
          break;
        }
        case 'move': {
          Im(qrig, pose, st.stride, { style: 'walk', stride: 2.2, lift: 0.22, bob: 0.04, pitch: 2, sway: 5, roll: 3, curl: 22 });
          legsOk = false;
          pose.rot(qrig.head, -6, Math.sin(st.stride * TAU) * 8, 0);
          break;
        }
        case 'stunned': {
          pose.rot(qrig.head, 14, Math.sin(t * 4) * 20, Math.cos(t * 4) * 10);
          break;
        }
        case 'airborne': {
          pose.rot(qrig.root, -16 * Math.sin(st.p * Math.PI), 0, 12);
          qrig.legs.forEach((lg, idx) => Ds(qrig, pose, idx, lg.rx + lg.side * 0.1, lg.ry + 0.12, lg.rz + (lg.front ? 0.15 : -0.15), 25));
          legsOk = false;
          break;
        }
        default: {
          if (st.spawnT >= 0) {
            const p = st.spawnT / 1;
            const d = Gn(Ct(p, 0.2, 0.9));
            pose.pos(qrig.root, 0, -0.95 * (1 - d), 0);
            pose.rot(qrig.root, -22 * (1 - d), 0, 0);
          } else if (move) {
            legsOk = false;
          } else {
            pose.rot(qrig.head, Math.sin(t * 1.4) * 4, Math.sin(t * 0.65) * 14, 0);
            pose.rot(qrig.tail[0], 0, Math.sin(t * 1.2) * 12, 0);
            pose.rot(qrig.tail[2], Math.sin(t * 1.8) * 10, Math.sin(t * 1.1) * 18, 0);
          }
        }
      }
      const h = Jo(st.hitT);
      if (h > 0 && st.anim !== 'dead') {
        pose.add(qrig.head, 14 * h, 0, (st.seed > 0.5 ? 1 : -1) * 10 * h);
        pose.move(qrig.pelvis, 0, -0.04 * h, -0.04 * h);
      }
      fx.glow = glow;
      if (legsOk) _a(qrig, pose);
    };

    return {
      key: 'monster:mossback',
      geometry: m.build(),
      rig,
      height: 1.6,
      radius: 1,
      scale: 1,
      stride: 2.2,
      triangles: m.triangleCount,
      deathDur: 1.4,
      spawnDur: 1,
      outline: 1.4,
      attach: {
        chest: { joint: qrig.chest, x: 0, y: 0.1, z: 0 },
        head: { joint: qrig.head, x: 0, y: 0.1, z: 0.3 },
        muzzle: { joint: qrig.head, x: 0, y: -0.05, z: 0.66 },
        weapon: { joint: qrig.legs[1].foot, x: 0, y: 0, z: 0.25 },
        tail: { joint: qrig.tail[0], x: 0, y: 0, z: -0.3 },
      },
      blend: (_a0: string, a1: string) => (a1 === 'attack' ? 0.08 : 0.16),
      animate,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. glimwing -> 《宋画提灯青鸟灵》
  // ───────────────────────────────────────────────────────────────────────────
  function buildGlimwingQingniao() {
    const rig = new Wa();
    const root = rig.add('root', -1, 0, 0, 0);
    const body = rig.add('body', root, 0, 1.18, 0.05);
    const abd1 = rig.add('abd1', body, 0, 1.06, -0.22);
    const head = rig.add('head', body, 0, 1.38, 0.32);
    const lantern = rig.add('lantern', body, 0, 0.94, 0.28);
    const wingsOut = [1, -1].map((s) => rig.add(`fw${s}`, body, s * 0.16, 1.24, 0.1));
    const wingsFan = [1, -1].map((s) => rig.add(`hw${s}`, body, s * 0.12, 1.14, -0.06));
    const tailChains = [1, -1].map((s) => {
      const a = rig.add(`tail${s}a`, abd1, s * 0.08, 1.02, -0.45);
      const b = rig.add(`tail${s}b`, a, s * 0.16, 0.94, -0.82);
      rig.chain({ joints: [a, b], tip: [s * 0.06, -0.05, -0.35], stiffness: 8, drag: 0.9, gravity: 4, maxAngle: 65, wind: 2.2 });
      return [a, b];
    });

    const m = new Ls();
    m.crease = 55;

    // 翠蓝鎏金鸟身 + 浅玉杏腹羽
    m.bone(body).paint(0x286e75, { c2: 0x62b4b0, by: (_x: number, y: number) => clamp01((1.3 - y) * 2.5), mat: K.fur });
    m.tube([[0, 1.04, -0.28, 0.12, 0.11], [0, 1.14, -0.05, 0.24, 0.22], [0, 1.22, 0.18, 0.2, 0.19], [0, 1.34, 0.3, 0.12, 0.12]], { seg: 10 });
    m.paint(0xf7ebd2, { c2: 0xd9c28a, mat: K.fur });
    m.ball(0, 1.15, 0.18, 0.16, 0.16, 0.18, 1);

    // 工笔青鸟首 + 金羽冠 + 金喙 + 明眸
    m.bone(head).paint(0x286e75, { c2: 0x52a6a2, mat: K.fur });
    m.ball(0, 1.39, 0.34, 0.15, 0.145, 0.155, 1);
    m.paint(0xffe188, { c2: 0xd49428, gloss: 0.85, mat: K.metal });
    m.tube([[0, 1.39, 0.48, 0.042, 0.036], [0, 1.37, 0.65, 0.008, 0.006]], { seg: 6 });
    // 三翎飘逸金凤顶冠
    for (const dx of [-0.04, 0, 0.04]) {
      m.tube([[dx, 1.5, 0.34, 0.018], [dx * 1.4, 1.62, 0.16, 0.012], [dx * 1.8, 1.65, -0.02, 0.004]], { seg: 4 });
    }
    m.sym(() => {
      m.paint(0x161414, { line: 0 });
      m.ball(0.11, 1.42, 0.42, 0.03, 0.034, 0.022, 0);
      m.paint(0xffdf78, { glow: 0.6, line: 0 });
      m.ball(0.122, 1.425, 0.432, 0.012, 0.014, 0.01, 0);
    });

    // 展翅翠金神翼（多羽层次，正对上方）
    m.sym((side) => {
      const wb = wingsOut[side > 0 ? 0 : 1];
      const fb = wingsFan[side > 0 ? 0 : 1];
      m.bone(wb).paint(0x286f78, { c2: 0xf2ca62, by: (x: number) => clamp01((Math.abs(x) - 0.3) / 0.8), mat: K.fur });
      m.sheet(
        8,
        4,
        (u, v) => {
          const x = side * (0.16 + u * 1.08);
          const arcY = 1.24 + Math.sin(u * Math.PI * 0.85) * 0.24 - v * 0.06;
          const chordZ = 0.24 - v * 0.52 - u * u * 0.22;
          return [x, arcY, chordZ];
        },
        true,
        40,
      );
      m.bone(fb).paint(0x3ba89e, { c2: 0xffe08a, glow: 0.2, by: (_x: number, _y: number, z: number) => clamp01((-z - 0.1) / 0.6), mat: K.fur });
      m.sheet(
        6,
        3,
        (u, v) => [side * (0.12 + u * 0.72), 1.15 - v * 0.08 + u * 0.08, -0.04 - v * 0.56 - u * 0.14],
        true,
        40,
      );
    });

    // 翠尾 + 飘逸丝羽尾带
    m.bone(abd1).paint(0x205860, { c2: 0x52a6a2, mat: K.fur });
    m.sheet(6, 3, (u, v) => [(u - 0.5) * (0.28 + v * 0.36), 1.04 - v * 0.08, -0.25 - v * 0.38], true);
    for (const [tc, sgn] of [
      [tailChains[0], 1],
      [tailChains[1], -1],
    ] as [number[], number][]) {
      m.bind(Di(rig, [abd1, ...tc], 0.5)).paint(0xf2cb64, { c2: 0x3ea89e, glow: 0.25, mat: K.fur });
      m.tube([[sgn * 0.06, 1.04, -0.4, 0.032, 0.012], [sgn * 0.14, 0.96, -0.78, 0.028, 0.01], [sgn * 0.22, 0.9, -1.16, 0.055, 0.01]], {
        seg: 4,
        up: [0, 1, 0],
      });
    }

    // 胸前细爪吊挂的【暖琥珀迷你八角宫灯】
    m.bone(lantern);
    m.paint(0x2d1a14, { c2: 0xd9a848, gloss: 0.8, mat: K.metal });
    m.tube([[0, 1.08, 0.28, 0.012], [0, 0.94, 0.28, 0.012]], { seg: 4 });
    m.g(pt(0, 0, 0.28), () => {
      m.paint(0x2d1a14, { c2: 0xd9a848, gloss: 0.8, mat: K.metal });
      m.lathe([[0.91, 0.12], [0.94, 0.14], [0.96, 0.06]], { seg: 6 });
      m.lathe([[0.72, 0.05], [0.75, 0.11]], { seg: 6 });
      m.paint(0xffcb5e, { c2: 0xfff5d4, glow: 0.85, mat: K.crystal, line: 0 });
      m.lathe([[0.75, 0.095], [0.91, 0.105]], { seg: 6 });
    });
    m.paint(0xc9352a, { mat: K.cloth });
    m.tube([[0, 0.72, 0.28, 0.025], [0, 0.58, 0.28, 0.008]], { seg: 5 });

    m.bakeGrounding(1.9, 0.75, 0.88);

    const animate = (pose: MonsterPoseWriter, st: MonsterAnimState, fx: { glow: number; tint?: number; tintColor?: number }) => {
      const t = st.time + st.seed * 12;
      let bob = Math.sin(t * 2.4) * 0.08;
      let flapAmp = 1;
      let wingRate = 3.2;
      let pitchBias = 0;
      let glow = 1.0 + 0.18 * Math.sin(t * 3.1);

      switch (st.anim) {
        case 'dead': {
          const d = Math.min(1, st.t / 1.2);
          const fall = Gn(Ct(d, 0, 0.85));
          flapAmp = 1 - Ct(d, 0, 0.25);
          bob *= flapAmp;
          pose.pos(root, Math.sin(fall * 7) * 0.3 * (1 - fall), -1.05 * fall, 0);
          pose.rot(root, 12 * Math.sin(fall * 9) * (1 - fall), fall * 280, 18 * Math.sin(fall * 8 + 1) * (1 - fall));
          glow = Math.max(0.04, 1 - Ct(d, 0.4, 1));
          break;
        }
        case 'attack': {
          const p = easePow(st.p, st.windup);
          const w = Gn(Ct(p, 0, 0.3));
          const s = Ct(p, 0.3, 0.4) * (1 - Gn(Ct(p, 0.5, 1)));
          pose.rot(body, -24 * w + 18 * s, 0, 0);
          pose.pos(root, 0, 0.14 * w, -0.2 * w + 0.26 * s);
          pitchBias = 0.65 * w - 0.4 * s;
          glow = 1.4 + 0.8 * Xe(p, 0.36, 0.14);
          break;
        }
        case 'move': {
          pose.rot(body, 18, 0, 0);
          wingRate = 5.4;
          break;
        }
        case 'stunned': {
          pose.rot(root, 0, 0, Math.sin(t * 8) * 12);
          pose.rot(head, 18, Math.sin(t * 7) * 18, 0);
          bob -= 0.28;
          flapAmp = 0.5;
          break;
        }
        case 'airborne': {
          pose.rot(root, -28 * Math.sin(st.p * Math.PI), 0, 18);
          break;
        }
        default: {
          if (st.spawnT >= 0) {
            const p = st.spawnT / 1;
            const e = 1 - Gn(Ct(p, 0, 0.9));
            const a = e * 5.2 + st.seed * 3;
            pose.pos(root, Math.sin(a) * 1.5 * e, 1.8 * e, Math.cos(a) * 1.5 * e - 0.7 * e);
            pose.rot(root, 0, (-a * 180) / Math.PI + 90 * e, -24 * e);
            wingRate = 6.8;
          } else {
            pose.rot(body, Math.sin(t * 0.9) * 4, Math.sin(t * 0.5) * 8, 0);
            pose.rot(head, 0, Math.sin(t * 0.7 + 1) * 14, 0);
          }
        }
      }
      const h = Jo(st.hitT, 0.3);
      if (h > 0 && st.anim !== 'dead') {
        pose.move(root, 0, 0.1 * h, -0.35 * h);
        pose.add(root, -40 * h, 0, (st.seed > 0.5 ? 1 : -1) * 32 * h);
      }
      pose.move(root, 0, bob, 0);
      const wAng = Math.sin(t * wingRate * 2) * flapAmp;
      const wAng2 = Math.sin(t * wingRate * 2 - 0.7) * flapAmp;
      for (let i = 0; i < 2; i++) {
        const sgn = i === 0 ? 1 : -1;
        pose.rot(wingsOut[i], 0, sgn * -12 * pitchBias, sgn * (8 + wAng * 36 + pitchBias * 50));
        pose.rot(wingsFan[i], 0, sgn * 8 * pitchBias, sgn * (4 + wAng2 * 28 + pitchBias * 40));
      }
      pose.rot(lantern, Math.sin(t * 2.2) * 10 + (st.anim === 'move' ? -22 : 0), 0, Math.cos(t * 1.8) * 6);
      fx.glow = Math.max(0.04, glow);
    };

    return {
      key: 'monster:glimwing',
      geometry: m.build(),
      rig,
      height: 2.1,
      radius: 1.05,
      scale: 1.22,
      stride: 1.5,
      triangles: m.triangleCount,
      deathDur: 1.2,
      spawnDur: 1,
      outline: 1.3,
      attach: {
        chest: { joint: body, x: 0, y: 0, z: 0 },
        head: { joint: head, x: 0, y: 0.08, z: 0.1 },
        muzzle: { joint: lantern, x: 0, y: -0.04, z: 0.2 },
        weapon: { joint: lantern, x: 0, y: -0.04, z: 0.2 },
        wingL: { joint: wingsOut[0], x: 0.9, y: 0.05, z: 0.1 },
        wingR: { joint: wingsOut[1], x: -0.9, y: 0.05, z: 0.1 },
        tail: { joint: abd1, x: 0, y: -0.04, z: -0.24 },
      },
      blend: (_a0: string, a1: string) => (a1 === 'attack' ? 0.08 : 0.16),
      animate,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. frost_golem (蓝 Buff) -> 《敦煌秘色九色玄鹿》
  // ───────────────────────────────────────────────────────────────────────────
  function buildNineColoredDeer() {
    const qrig = Lm({
      pelvis: [1.56, -0.9],
      chest: [1.62, 0.42],
      neck: [
        [1.96, 0.88],
        [2.36, 1.14],
      ],
      head: [2.72, 1.34],
      tail: [[1.74, -1.52]],
      front: [
        [0.32, 1.48, 0.56],
        [0.32, 0.82, 0.62],
        [0.32, 0.12, 0.56],
      ],
      hind: [
        [0.34, 1.52, -0.94],
        [0.34, 0.84, -1.24],
        [0.34, 0.12, -1.12],
      ],
      bendFront: 1,
      bendHind: -1,
    });
    const rig = qrig.rig;
    const earL = rig.add('earL', qrig.head, 0.15, 2.9, 1.24);
    const earR = rig.add('earR', qrig.head, -0.15, 2.9, 1.24);
    const pearl = rig.add('pearl', qrig.head, 0, 3.45, 1.42);
    const m = new Ls();
    m.crease = 55;

    // 优雅修长四鹿腿 + 鎏金玄鹿蹄
    qrig.legs.forEach((leg) => {
      const side = leg.side;
      m.bind(Di(rig, [leg.upper, leg.lower, leg.foot], 0.55)).paint(0xf6f3eb, {
        c2: 0x3b7a8c,
        by: (_x: number, y: number) => clamp01((0.9 - y) * 1.1),
        mat: K.fur,
      });
      if (leg.front) {
        m.tube([[side * 0.32, 1.5, 0.56, 0.16, 0.18], [side * 0.32, 0.84, 0.62, 0.085, 0.09], [side * 0.32, 0.18, 0.56, 0.068, 0.072]], { seg: 8, cap0: false });
      } else {
        m.tube([[side * 0.34, 1.54, -0.94, 0.2, 0.25], [side * 0.34, 0.86, -1.24, 0.095, 0.11], [side * 0.34, 0.18, -1.12, 0.068, 0.072]], { seg: 8, cap0: false });
      }
      m.bone(leg.foot).paint(0xd4a448, { c2: 0x203b46, gloss: 0.75, mat: K.metal });
      m.lathe([[0.04, 0.088, 0.105, leg.rx, leg.rz + 0.02], [0.16, 0.07, 0.08, leg.rx, leg.rz]], { seg: 8 });
    });

    // 敦煌九色鹿身躯（月白底毛+宋秘色青瓷背斑+金线云纹）
    m.bind(Di(rig, [qrig.pelvis, qrig.chest], 1.1)).paint(0xf7f2e6, {
      c2: 0x2d6d7c,
      by: (_x: number, y: number) => clamp01((y - 1.5) * 1.4),
      mat: K.fur,
    });
    m.tube(
      [
        [0, 1.54, -1.5, 0.18, 0.18],
        [0, 1.62, -1.1, 0.38, 0.42],
        [0, 1.56, -0.4, 0.36, 0.44],
        [0, 1.64, 0.42, 0.44, 0.48],
        [0, 1.72, 0.8, 0.3, 0.32],
      ],
      { seg: 12, up: [1, 0, 0] },
    );
    // 身体两侧金斑点
    m.paint(0xe6ba56, { c2: 0xfff0b2, glow: 0.22, mat: K.metal });
    m.sym(() => {
      for (const [bx, by, bz] of [
        [0.37, 1.72, 0.1],
        [0.4, 1.68, -0.32],
        [0.36, 1.66, -0.76],
      ]) {
        m.ball(bx, by, bz, 0.04, 0.048, 0.068, 0);
      }
    });

    // 优雅长颈 + 飘逸青白长鬃
    m.bind(Di(rig, [qrig.chest, qrig.neck[0], qrig.neck[1], qrig.head], 0.8)).paint(0xf7f2e6, { c2: 0x3b8696, by: (_x: number, y: number) => clamp01((y - 2.1) * 1.3), mat: K.fur });
    m.tube(
      [
        [0, 1.68, 0.56, 0.3, 0.32],
        [0, 2.02, 0.9, 0.22, 0.24],
        [0, 2.38, 1.15, 0.18, 0.2],
        [0, 2.68, 1.34, 0.16, 0.17],
      ],
      { seg: 10, up: [1, 0, 0] },
    );
    m.paint(0xe6f2f6, { c2: 0x5ca4b8, glow: 0.15, mat: K.fur });
    m.sheet(4, 5, (u, v) => [(u - 0.5) * 0.06, 1.85 + v * 0.82, 0.68 + v * 0.48 - Math.sin(v * Math.PI) * 0.16], true);

    // 高贵鹿首 + 九枝鎏金玉角 + 悬空青瓷明月灵珠
    m.bone(qrig.head);
    m.paint(0xf8f3e8, { c2: 0x3a7a8c, mat: K.fur });
    m.tube([[0, 2.7, 1.24, 0.18, 0.19], [0, 2.74, 1.52, 0.15, 0.16], [0, 2.66, 1.82, 0.095, 0.09]], { seg: 10, up: [1, 0, 0] });
    m.sym(() => {
      m.paint(0x161414, { line: 0 });
      m.ball(0.145, 2.77, 1.56, 0.036, 0.04, 0.03, 0);
      m.paint(0x8ee8f5, { glow: 0.65, line: 0 });
      m.ball(0.155, 2.775, 1.57, 0.016, 0.018, 0.014, 0);
      // 鎏金九色枝鹿角
      m.paint(0xe2b656, { c2: 0xfff0ba, gloss: 0.9, glow: 0.28, mat: K.metal });
      m.tube([[0.1, 2.88, 1.36, 0.034], [0.22, 3.16, 1.3, 0.026], [0.34, 3.48, 1.34, 0.018], [0.28, 3.74, 1.46, 0.006]], { seg: 6 });
      m.tube([[0.22, 3.16, 1.3, 0.02], [0.28, 3.3, 1.52, 0.008]], { seg: 5 });
      m.tube([[0.34, 3.48, 1.34, 0.016], [0.46, 3.6, 1.22, 0.006]], { seg: 5 });
    });
    m.bone(earL).paint(0xf7f2e6, { c2: 0x3b8696, mat: K.fur });
    m.tube([[0.15, 2.86, 1.24, 0.032], [0.34, 2.94, 1.18, 0.055, 0.022], [0.44, 2.96, 1.15, 0.008]], { seg: 6 });
    m.bone(earR).paint(0xf7f2e6, { c2: 0x3b8696, mat: K.fur });
    m.tube([[-0.15, 2.86, 1.24, 0.032], [-0.34, 2.94, 1.18, 0.055, 0.022], [-0.44, 2.96, 1.15, 0.008]], { seg: 6 });

    // 角间青瓷明月宝珠 + 敦煌飘浮仙云
    m.bone(pearl);
    m.paint(0x7ee2f2, { c2: 0xffffff, glow: 0.88, mat: K.crystal, line: 0 });
    m.ball(0, 3.45, 1.42, 0.14, 0.14, 0.14, 0);
    m.paint(0xffe084, { glow: 0.45, mat: K.metal });
    m.g(pt(0, 3.45, 1.42, 72, 0, 0), () => m.torus(0.22, 0.016, 0.016, 14, 4));

    m.bone(qrig.chest);
    m.paint(0xd8f2f6, { c2: 0xe6bc5c, glow: 0.25, mat: K.cloth });
    m.sym(() => {
      m.tube([[0.46, 1.78, 0.6, 0.035], [0.64, 1.94, 0.1, 0.048, 0.018], [0.58, 1.82, -0.58, 0.02]], { seg: 6, up: [0, 1, 0] });
    });

    m.bone(qrig.tail[0]).paint(0xf7f2e6, { c2: 0x70c6d4, mat: K.fur });
    m.tube([[0, 1.74, -1.52, 0.08], [0, 1.9, -1.78, 0.14], [0, 2.04, -1.86, 0.03]], { seg: 7 });

    m.bakeGrounding(3.95);

    const animate = (pose: MonsterPoseWriter, st: MonsterAnimState, fx: { glow: number; tint?: number; tintColor?: number }) => {
      const t = st.time + st.seed * 12;
      let legsOk = true;
      let glow = 1.0 + 0.2 * Math.sin(t * 2.5);
      pose.rot(pearl, t * 25, t * 48, 0);
      pose.rot(earL, 0, 0, Math.sin(t * 2.1) * 6);
      pose.rot(earR, 0, 0, -Math.sin(t * 2.1 + 0.5) * 6);

      switch (st.anim) {
        case 'dead': {
          const d = Math.min(1, st.t / 2.2);
          const s1 = Gn(Ct(d, 0, 0.45));
          const s2 = Gn(Ct(d, 0.4, 1));
          pose.pos(qrig.root, 0, -1.4 * s2, 0);
          pose.rot(qrig.root, 0, 0, 82 * s2);
          pose.rot(qrig.head, 24 * s1, 0, 0);
          qrig.legs.forEach((_lg, idx) => XU(qrig, pose, idx, idx < 2 ? -35 * s2 : 25 * s2, 40 * s2, 10 * s2));
          legsOk = false;
          glow = Math.max(0.04, 1 - d);
          break;
        }
        case 'move': {
          Im(qrig, pose, st.stride, { style: 'trot', stride: 3.2, lift: 0.42, bob: 0.06, pitch: 3, sway: 4, roll: 3, curl: 34 });
          legsOk = false;
          pose.add(qrig.neck[0], Math.sin(st.stride * TAU * 2) * 5, 0, 0);
          break;
        }
        case 'attack': {
          const p = easePow(st.p, st.windup);
          const rear = Gn(Ct(p, 0, 0.34)) * (1 - Ct(p, 0.34, 0.48));
          const strike = Ct(p, 0.34, 0.48) * (1 - Gn(Ct(p, 0.58, 1)));
          V1(qrig, pose, rear * 0.8, 36, 0.16);
          pose.add(qrig.neck[0], -18 * rear + 28 * strike, 0, 0);
          pose.add(qrig.head, -20 * rear + 34 * strike, 0, 0);
          glow = 1.2 + 0.9 * Xe(p, 0.38, 0.15);
          legsOk = false;
          break;
        }
        case 'stunned': {
          pose.add(qrig.neck[0], 0, Math.sin(t * 5) * 12, 0);
          pose.add(qrig.head, 0, 0, Math.sin(t * 5 + 1) * 16);
          break;
        }
        case 'airborne': {
          pose.rot(qrig.root, -16 * Math.sin(st.p * Math.PI), 0, 10);
          for (let i = 0; i < 4; i++) XU(qrig, pose, i, i < 2 ? -40 : 34, i < 2 ? 70 : -50, 20);
          legsOk = false;
          break;
        }
        default: {
          if (st.spawnT >= 0) {
            const p = st.spawnT / 1.2;
            const e = Gn(Ct(p, 0.15, 0.75));
            V1(qrig, pose, (1 - e) * 0.9, 32, 0.12);
            legsOk = false;
          } else {
            pose.add(qrig.neck[0], Math.sin(t * 0.9) * 3, Math.sin(t * 0.45) * 9, 0);
            pose.add(qrig.head, Math.sin(t * 1.1) * 3, Math.sin(t * 0.45 + 0.6) * 11, 0);
          }
        }
      }
      const h = Jo(st.hitT);
      if (h > 0 && st.anim !== 'dead') {
        pose.add(qrig.neck[0], -8 * h, (st.seed > 0.5 ? 1 : -1) * 16 * h, 0);
        pose.add(qrig.head, 0, (st.seed > 0.5 ? 1 : -1) * 14 * h, 0);
      }
      if (legsOk) _a(qrig, pose);
      fx.glow = Math.max(0.04, glow);
    };

    return {
      key: 'monster:frost_golem',
      geometry: m.build(),
      rig,
      height: 3.95,
      radius: 1.5,
      scale: 1,
      stride: 3.2,
      triangles: m.triangleCount,
      deathDur: 2.2,
      spawnDur: 1.2,
      outline: 1.6,
      attach: {
        chest: { joint: qrig.chest, x: 0, y: 0, z: 0.1 },
        head: { joint: qrig.head, x: 0, y: 0.1, z: 0.3 },
        muzzle: { joint: qrig.head, x: 0, y: -0.1, z: 0.8 },
        weapon: { joint: qrig.head, x: 0, y: 0.5, z: 0.5 },
        crest: { joint: pearl, x: 0, y: 0, z: 0 },
        tail: { joint: qrig.tail[0], x: 0, y: -0.15, z: -0.3 },
      },
      blend: (_a0: string, a1: string) => (a1 === 'attack' ? 0.1 : 0.2),
      animate,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. ember_golem (红 Buff) -> 《赤炎金睛狻猊》
  // ───────────────────────────────────────────────────────────────────────────
  function buildFireSuanniLion() {
    const qrig = Lm({
      pelvis: [1.28, -0.96],
      chest: [1.38, 0.48],
      neck: [[1.58, 1.06]],
      head: [1.72, 1.44],
      jaw: [1.54, 1.54],
      tail: [[1.38, -1.64]],
      front: [
        [0.64, 1.36, 0.58],
        [0.74, 0.76, 0.46],
        [0.76, 0.12, 0.68],
      ],
      hind: [
        [0.56, 1.22, -1.0],
        [0.64, 0.68, -0.76],
        [0.64, 0.12, -1.04],
      ],
      bendFront: -1,
      bendHind: 1,
    });
    const rig = qrig.rig;
    const crownFlame = rig.add('crownFlame', qrig.chest, 0, 2.02, 0.15);
    const bellBone = rig.add('bell', qrig.chest, 0, 1.44, 1.15);
    const manes = [0, 1, 2, 3].map((idx) => rig.add(`mane${idx}`, qrig.head, 0, 1.72, 1.18));
    const m = new Ls();
    m.crease = 55;

    // 雄健玄金兽腿与炎爪
    qrig.legs.forEach((leg) => {
      const side = leg.side;
      m.bind(Di(rig, [leg.upper, leg.lower, leg.foot], 0.5)).paint(0x281e1c, { c2: 0x6b281c, by: (_x: number, y: number) => clamp01((1.2 - y) * 1.1), mat: K.fur });
      if (leg.front) {
        m.tube([[side * 0.62, 1.6, 0.56, 0.34, 0.44], [side * 0.72, 1.08, 0.52, 0.28, 0.34], [side * 0.76, 0.48, 0.56, 0.22, 0.25], [side * 0.76, 0.2, 0.66, 0.24, 0.28]], { seg: 9, cap0: false });
      } else {
        m.tube([[side * 0.52, 1.48, -1.0, 0.34, 0.48], [side * 0.64, 0.96, -0.86, 0.28, 0.38], [side * 0.64, 0.42, -0.94, 0.2, 0.22], [side * 0.64, 0.18, -1.04, 0.22, 0.25]], { seg: 9, cap0: false });
      }
      m.bone(leg.foot).paint(0x3a2018, { mat: K.fur });
      m.ball(leg.rx, 0.12, leg.rz + 0.1, 0.26, 0.13, 0.34, 1);
      m.paint(0xff7828, { c2: 0xffe48c, glow: 0.65, mat: K.crystal, line: 0 });
      for (let b = 0; b < 4; b++) {
        const w = (b - 1.5) * 0.11;
        m.g(pt(leg.rx + w, 0.11, leg.rz + 0.34 - Math.abs(b - 1.5) * 0.04, 76, (b - 1.5) * 9 * side, 0), () => m.crystal(0.045, 0.24, 4, 0.75, 0.1));
      }
    });

    // 玄黑焦岩与赤金瑞狮身躯
    m.bind(Di(rig, [qrig.pelvis, qrig.chest], 1.1)).paint(0x2d1e1c, { c2: 0x7c281c, mat: K.fur });
    m.tube([[0, 1.28, -1.66, 0.24, 0.26], [0, 1.32, -1.12, 0.68, 0.64], [0, 1.28, -0.35, 0.72, 0.64], [0, 1.38, 0.44, 0.88, 0.76], [0, 1.52, 1.05, 0.62, 0.58]], {
      seg: 12,
      up: [1, 0, 0],
    });

    // 朱红项圈 + 巨型鎏金大铜铃
    m.bone(qrig.chest).paint(0xaa2319, { c2: 0xd9a848, mat: K.cloth });
    m.g(pt(0, 1.52, 1.02, 58, 0, 0), () => m.torus(0.56, 0.095, 0.085, 14, 5));
    m.bone(bellBone).paint(0xe6b64c, { c2: 0xfff0b2, gloss: 1, glow: 0.25, mat: K.metal });
    m.ball(0, 1.22, 1.32, 0.18, 0.18, 0.18, 0);
    m.paint(0x28120c, { line: 0 });
    m.box(0, 1.14, 1.48, 0.18, 0.04, 0.05, 0);

    // 环首赤炎螺旋狮鬃（4 组骨骼可呼吸脉动）
    manes.forEach((mb, idx) => {
      m.bone(mb).paint(idx % 2 === 0 ? 0xd94426 : 0xff9232, { c2: 0xffe48c, glow: idx % 2 ? 0.55 : 0.2, mat: K.fur });
      for (let k = 0; k < 6; k++) {
        const a = ((k + idx * 0.4) / 6) * TAU;
        const r = 0.6 + idx * 0.06;
        m.ball(Math.cos(a) * r, 1.74 + Math.sin(a) * r, 1.18 - idx * 0.14, 0.24, 0.24, 0.2, 0);
      }
    });

    // 唐代铜狮怒目首 + 獠牙下颌 + 金睛
    m.bone(qrig.head).paint(0x4a221c, { c2: 0xd99e42, mat: K.leather });
    m.ball(0, 1.78, 1.48, 0.54, 0.48, 0.5, 0);
    m.ball(0, 1.68, 1.88, 0.34, 0.24, 0.26, 0);
    m.paint(0xb82820, { mat: K.leather });
    m.ball(0, 1.8, 1.98, 0.16, 0.12, 0.12, 0);
    m.sym(() => {
      m.paint(0xffcc38, { glow: 0.78, line: 0 });
      m.ball(0.28, 1.9, 1.84, 0.09, 0.08, 0.06, 0);
      m.paint(0xf7ebd2, { glow: 0.2, mat: K.metal });
      m.g(pt(0.22, 1.56, 1.96, 170, 0, 0), () => m.crystal(0.045, 0.18, 4, 0.75, 0.1));
    });
    m.bone(qrig.jaw).paint(0x3b1b18, { c2: 0x6b281c, mat: K.leather });
    m.ball(0, 1.48, 1.72, 0.28, 0.12, 0.28, 1);

    // 炽焰背脊冠
    m.bone(crownFlame).paint(0xff7224, { c2: 0xfff0a2, glow: 0.75, mat: K.crystal, line: 0 });
    for (let i = 0; i < 4; i++) {
      m.g(pt(0, 2.02 - i * 0.06, 0.2 - i * 0.45, -18, 0, 0), () => m.crystal(0.22 - i * 0.03, 0.56 - i * 0.08, 5, 0.75, 0.1));
    }

    m.bone(qrig.tail[0]).paint(0xd94426, { c2: 0xffd066, glow: 0.35, mat: K.fur });
    m.tube([[0, 1.38, -1.64, 0.11], [0, 1.78, -2.06, 0.16], [0, 2.1, -1.9, 0.28]], { seg: 8 });

    m.bakeGrounding(2.95);

    const animate = (pose: MonsterPoseWriter, st: MonsterAnimState, fx: { glow: number; tint?: number; tintColor?: number }) => {
      const t = st.time + st.seed * 12;
      let legsOk = true;
      let jawAng = 6;
      let glow = 1.0 + 0.25 * Math.sin(t * 2.8);
      pose.rot(bellBone, Math.sin(t * 3.1) * 8 + (st.anim === 'move' ? -20 : 0), 0, Math.cos(t * 2.4) * 6);

      switch (st.anim) {
        case 'dead': {
          const d = Math.min(1, st.t / 2.2);
          const s1 = Gn(Ct(d, 0, 0.42));
          const s2 = Gn(Ct(d, 0.4, 1));
          pose.pos(qrig.root, 0, -1.1 * s2, 0);
          pose.rot(qrig.root, 0, 0, 78 * s2);
          pose.rot(qrig.neck[0], -22 * s1 + 16 * s2, 0, 0);
          qrig.legs.forEach((_lg, idx) => XU(qrig, pose, idx, idx < 2 ? -34 * s2 : 24 * s2, 32 * s2, 12 * s2));
          legsOk = false;
          glow = Math.max(0.04, 1 - d);
          break;
        }
        case 'move': {
          Im(qrig, pose, st.stride, { style: 'bound', stride: 3.0, lift: 0.44, bob: 0.08, pitch: 5, curl: 28 });
          legsOk = false;
          jawAng = 14 + Math.sin(st.stride * TAU) * 6;
          break;
        }
        case 'attack': {
          const p = easePow(st.p, st.windup);
          const w = Gn(Ct(p, 0, 0.34)) * (1 - Ct(p, 0.34, 0.46));
          const s = Ct(p, 0.34, 0.46) * (1 - Gn(Ct(p, 0.56, 1)));
          V1(qrig, pose, w * 0.7, 32, 0.14);
          pose.add(qrig.neck[0], -18 * w + 24 * s, 0, 0);
          pose.add(qrig.head, -16 * w + 20 * s, 0, 0);
          jawAng = 6 + 34 * Math.max(w, s);
          glow = 1.3 + 0.9 * Xe(p, 0.38, 0.15);
          legsOk = false;
          break;
        }
        case 'stunned': {
          pose.add(qrig.neck[0], 10, Math.sin(t * 5) * 14, 0);
          pose.add(qrig.head, 12, 0, Math.sin(t * 5 + 1) * 16);
          jawAng = 22;
          break;
        }
        case 'airborne': {
          pose.rot(qrig.root, -16 * Math.sin(st.p * Math.PI), 0, 12);
          for (let i = 0; i < 4; i++) XU(qrig, pose, i, -36, 48, 20);
          legsOk = false;
          break;
        }
        default: {
          if (st.spawnT >= 0) {
            const p = st.spawnT / 1.2;
            const e = Gn(Ct(p, 0.15, 0.72));
            pose.pos(qrig.root, 0, -2.1 * (1 - e), 0);
            jawAng = 28 * e * (1 - e) * 3 + 6;
          } else {
            pose.add(qrig.neck[0], 0, Math.sin(t * 0.4) * 9, 0);
            pose.add(qrig.head, Math.sin(t * 0.9) * 3, Math.sin(t * 0.4 + 0.5) * 10, 0);
          }
        }
      }
      const h = Jo(st.hitT);
      if (h > 0 && st.anim !== 'dead') {
        pose.add(qrig.neck[0], 10 * h, (st.seed > 0.5 ? 1 : -1) * 14 * h, 0);
        pose.move(qrig.pelvis, 0, -0.05 * h, -0.06 * h);
      }
      pose.rot(qrig.jaw, jawAng, 0, 0);
      manes.forEach((mb, idx) => {
        pose.scale(mb, 1 + 0.05 * Math.sin(t * 6 + idx * 1.5));
        pose.rot(mb, Math.sin(t * 4 + idx) * 4, 0, Math.cos(t * 4.5 + idx) * 3);
      });
      if (legsOk) _a(qrig, pose);
      fx.glow = Math.max(0.04, glow);
    };

    return {
      key: 'monster:ember_golem',
      geometry: m.build(),
      rig,
      height: 2.95,
      radius: 1.6,
      scale: 1,
      stride: 3.0,
      triangles: m.triangleCount,
      deathDur: 2.2,
      spawnDur: 1.2,
      outline: 1.6,
      attach: {
        chest: { joint: qrig.chest, x: 0, y: 0, z: 0.2 },
        head: { joint: qrig.head, x: 0, y: 0.2, z: 0.3 },
        muzzle: { joint: qrig.head, x: 0, y: -0.12, z: 0.8 },
        weapon: { joint: qrig.legs[1].foot, x: 0, y: 0, z: 0.3 },
        handL: { joint: qrig.legs[0].foot, x: 0, y: 0, z: 0.3 },
        handR: { joint: qrig.legs[1].foot, x: 0, y: 0, z: 0.3 },
        crest: { joint: crownFlame, x: 0, y: 0.2, z: 0 },
        tail: { joint: qrig.tail[0], x: 0, y: 0, z: -0.3 },
      },
      blend: (_a0: string, a1: string) => (a1 === 'attack' ? 0.1 : 0.2),
      animate,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 5. abyss_drake (小龙) -> 《汴河青金应龙》(100% 东方神龙，绝非西方大蜥蜴)
  // ───────────────────────────────────────────────────────────────────────────
  function buildYinglongDragon() {
    const qrig = Lm({
      pelvis: [1.75, -1.2],
      chest: [2.05, 0.85],
      neck: [
        [2.5, 1.48],
        [3.12, 2.02],
        [3.78, 1.92],
        [4.22, 2.15],
      ],
      head: [4.38, 2.52],
      jaw: [4.2, 2.58],
      tail: [
        [1.62, -2.0],
        [1.36, -2.85],
        [1.12, -3.7],
        [0.92, -4.55],
        [0.78, -5.3],
        [0.72, -6.0],
      ],
      front: [
        [0.75, 1.85, 0.92],
        [1.08, 1.02, 0.65],
        [1.12, 0.2, 1.15],
      ],
      hind: [
        [0.72, 1.65, -1.25],
        [1.08, 0.92, -0.9],
        [1.08, 0.2, -1.55],
      ],
      bendFront: -1,
      bendHind: 1,
    });
    const rig = qrig.rig;
    const crest = rig.add('crest', qrig.head, 0, 4.78, 2.65);
    const vent = rig.add('vent', qrig.head, 0, 4.25, 3.35);
    const wingL = rig.add('wingL', qrig.chest, 0.62, 2.38, 0.72);
    const wingR = rig.add('wingR', qrig.chest, -0.62, 2.38, 0.72);
    const whiskers = [1, -1].map((s) => {
      const a = rig.add(`wh${s}0`, qrig.head, s * 0.26, 4.28, 3.45);
      const b = rig.add(`wh${s}1`, a, s * 0.45, 4.02, 3.3);
      const c = rig.add(`wh${s}2`, b, s * 0.56, 3.74, 3.0);
      rig.chain({ joints: [a, b, c], tip: [s * 0.14, -0.25, -0.25], stiffness: 6, drag: 0.9, gravity: 8, maxAngle: 65, wind: 2.2 });
      return [a, b, c];
    });

    const m = new Ls();
    m.crease = 50;

    // 东方神龙五爪四足 + 肘生流云羽簇
    qrig.legs.forEach((leg) => {
      const side = leg.side;
      m.bind(Di(rig, [leg.upper, leg.lower, leg.foot], 0.55)).paint(0x1f5c6e, { c2: 0xd9a848, by: (x: number, y: number) => clamp01((y - 0.8) * 0.7), mat: K.leather, pattern: En.scale, patternScale: 8, patternAmt: 0.35 });
      if (leg.front) {
        m.tube([[side * 0.72, 1.9, 0.9, 0.28, 0.32], [side * 1.06, 1.04, 0.66, 0.2, 0.22], [side * 1.1, 0.3, 1.1, 0.16, 0.18]], { seg: 8, cap0: false });
      } else {
        m.tube([[side * 0.68, 1.7, -1.24, 0.32, 0.38], [side * 1.06, 0.94, -0.9, 0.22, 0.24], [side * 1.08, 0.3, -1.5, 0.16, 0.18]], { seg: 8, cap0: false });
      }
      m.bone(leg.foot).paint(0x1a4858, { c2: 0xd9b054, mat: K.leather });
      m.ball(leg.rx, 0.16, leg.rz + 0.12, 0.24, 0.12, 0.28, 1);
      m.paint(0xffe08a, { gloss: 0.9, mat: K.metal });
      for (let c = -2; c <= 2; c++) {
        m.g(pt(leg.rx + c * 0.085, 0.12, leg.rz + 0.36 - Math.abs(c) * 0.04, 72, c * 12, 0), () => m.crystal(0.036, 0.22, 4, 0.75, 0.1));
      }
    });

    // 修长蜿蜒青金鳞躯与六节长尾（+金色背脊火鳍）
    m.bind(Di(rig, [qrig.pelvis, qrig.chest, qrig.neck[0], qrig.neck[1], qrig.neck[2], qrig.neck[3], qrig.head], 0.9)).paint(0x1b4e5e, {
      c2: 0x52a6a2,
      by: (_x: number, y: number) => clamp01((y - 1.5) * 0.3),
      mat: K.leather,
      pattern: En.scale,
      patternScale: 9,
      patternAmt: 0.4,
    });
    m.tube(
      [
        [0, 1.72, -1.35, 0.64, 0.56],
        [0, 1.88, -0.25, 0.68, 0.58],
        [0, 2.08, 0.85, 0.72, 0.64],
        [0, 2.52, 1.48, 0.48, 0.46],
        [0, 3.12, 2.02, 0.42, 0.4],
        [0, 3.78, 1.92, 0.38, 0.36],
        [0, 4.24, 2.22, 0.36, 0.34],
      ],
      { seg: 12, up: [1, 0, 0] },
    );
    // 腹底金色龙鳞甲片
    m.paint(0xdfb056, { c2: 0xffe49c, mat: K.leather });
    m.tube(
      [
        [0, 1.38, -1.1, 0.4, 0.18],
        [0, 1.54, 0.0, 0.44, 0.2],
        [0, 1.72, 0.9, 0.46, 0.2],
        [0, 2.34, 1.62, 0.32, 0.16],
        [0, 3.04, 2.22, 0.26, 0.14],
        [0, 3.92, 2.26, 0.22, 0.14],
      ],
      { seg: 8, up: [1, 0, 0] },
    );

    // 六节神龙鞭尾 + 鎏金焰状尾鳍
    m.bind(Di(rig, [qrig.pelvis, ...qrig.tail], 0.8)).paint(0x1b4e5e, { c2: 0x3b8ea6, mat: K.leather, pattern: En.scale, patternScale: 9, patternAmt: 0.4 });
    m.tube(
      [
        [0, 1.72, -1.3, 0.58, 0.52],
        [0, 1.6, -2.02, 0.44, 0.42],
        [0, 1.36, -2.85, 0.34, 0.34],
        [0, 1.12, -3.7, 0.26, 0.26],
        [0, 0.92, -4.55, 0.2, 0.2],
        [0, 0.78, -5.3, 0.14, 0.14],
        [0, 0.72, -6.0, 0.04, 0.04],
      ],
      { seg: 10, up: [1, 0, 0] },
    );
    m.bone(qrig.tail[5]).paint(0xe6b852, { c2: 0xfff0b2, glow: 0.35, mat: K.cloth });
    m.sheet(6, 3, (u, v) => [(u - 0.5) * (0.28 + v * 0.72), 0.74 - Math.sin(u * Math.PI) * 0.18, -5.85 - v * 0.92], true);

    // 威严东方神龙首 + 分叉金玉鹿角 + 浓眉龙脊 + 吐息明珠 + 飘逸龙须
    m.bone(qrig.head);
    m.paint(0x215c6e, { c2: 0x52b0ac, mat: K.leather });
    m.tube([[0, 4.38, 2.42, 0.44, 0.38], [0, 4.36, 2.95, 0.36, 0.28], [0, 4.32, 3.48, 0.28, 0.2]], { seg: 10, up: [1, 0, 0] });
    m.paint(0xffe084, { c2: 0xb87624, glow: 0.35, gloss: 0.9, mat: K.metal });
    m.sym(() => {
      // 金玉神龙鹿角
      m.tube([[0.18, 4.62, 2.52, 0.06], [0.4, 5.18, 2.24, 0.044], [0.52, 5.72, 1.88, 0.018]], { seg: 6 });
      m.tube([[0.36, 5.06, 2.3, 0.036], [0.56, 5.26, 2.52, 0.014]], { seg: 5 });
      m.paint(0xffdf68, { glow: 0.85, line: 0 });
      m.ball(0.28, 4.5, 2.92, 0.075, 0.068, 0.068, 0);
    });
    m.bone(crest).paint(0xe6ba56, { glow: 0.4, mat: K.metal });
    m.g(pt(0, 4.78, 2.65, -26, 0, 0), () => m.crystal(0.12, 0.42, 5, 0.7, 0.1));

    m.bone(qrig.jaw).paint(0x1f5868, { c2: 0xdfb256, mat: K.leather });
    m.tube([[0, 4.16, 2.58, 0.34, 0.18], [0, 4.14, 3.1, 0.26, 0.14], [0, 4.14, 3.44, 0.18, 0.1]], { seg: 8, up: [1, 0, 0] });

    // 龙口明珠 (vent)
    m.bone(vent).paint(0xa6f2ff, { c2: 0xffffff, glow: 0.95, mat: K.crystal, line: 0 });
    m.ball(0, 4.25, 3.35, 0.16, 0.16, 0.16, 0);

    // 两条长龙须物理链
    for (const [wc, sgn] of [
      [whiskers[0], 1],
      [whiskers[1], -1],
    ] as [number[], number][]) {
      m.bind(Di(rig, [qrig.head, ...wc], 0.5)).paint(0xe6bc5c, { c2: 0x8ef0f5, glow: 0.3, mat: K.fur });
      m.tube([[sgn * 0.24, 4.28, 3.42, 0.024], [sgn * 0.45, 4.02, 3.28, 0.018], [sgn * 0.56, 3.74, 3.0, 0.012], [sgn * 0.66, 3.48, 2.75, 0.004]], { seg: 5 });
    }

    // 东方应龙青金神羽双翼（对称舒展羽翼，绝非西方蝙蝠肉翼！）
    for (const [wb, sgn] of [
      [wingL, 1],
      [wingR, -1],
    ] as [number, number][]) {
      m.bone(wb);
      // 羽翼鎏金肩脊骨架
      m.paint(0xe2b454, { c2: 0xfff0ba, gloss: 0.9, mat: K.metal });
      m.tube([[sgn * 0.62, 2.38, 0.72, 0.11], [sgn * 1.9, 3.05, 0.35, 0.085], [sgn * 3.2, 3.42, -0.25, 0.045], [sgn * 4.1, 3.35, -0.95, 0.018]], { seg: 6 });
      // 青碧渐变金边层叠大羽扇面
      m.paint(0x287886, { c2: 0xf4cc68, glow: 0.22, by: (x: number) => clamp01((Math.abs(x) - 1.2) / 2.6), mat: K.fur });
      m.sheet(
        10,
        4,
        (u, v) => {
          const span = Math.pow(u, 0.85);
          const x = sgn * (0.64 + span * 3.45);
          const y = 2.38 + Math.sin(u * Math.PI * 0.82) * 1.05 - v * 0.22;
          const z = 0.72 - u * 1.55 - v * (1.45 - u * 0.35);
          return [x, y, z];
        },
        true,
        42,
      );
    }

    m.bakeGrounding(4.9);

    const animate = (pose: MonsterPoseWriter, st: MonsterAnimState, fx: { glow: number; tint?: number; tintColor?: number }) => {
      const t = st.time + st.seed * 12;
      let legsOk = true;
      let jawAng = 6;
      let wingLift = 0;
      let wingRate = 2.2;
      let glow = 1.0 + 0.18 * Math.sin(t * 2.4);
      let pearlScale = 0.12;

      switch (st.anim) {
        case 'dead': {
          const d = Math.min(1, st.t / 3.2);
          const fall = Gn(Ct(d, 0, 0.5));
          pose.pos(qrig.root, 0, -2.2 * fall, 0);
          pose.rot(qrig.root, 12 * fall, 0, 74 * fall);
          qrig.legs.forEach((lg, idx) => Ds(qrig, pose, idx, lg.rx + lg.side * 0.1 * fall, lg.ry - 0.1 * fall, lg.rz, 20 * fall));
          legsOk = false;
          glow = Math.max(0.04, 1 - d);
          break;
        }
        case 'move': {
          Im(qrig, pose, st.stride, { style: 'walk', stride: 3.6, lift: 0.4, bob: 0.06, pitch: 2, sway: 4, roll: 2.5, curl: 22 });
          legsOk = false;
          wingRate = 4.2;
          wingLift = 12;
          break;
        }
        case 'attack': {
          const p = easePow(st.p, st.windup);
          const w = Gn(Ct(p, 0, 0.3));
          const s = Ct(p, 0.3, 0.4) * (1 - Gn(Ct(p, 0.52, 1)));
          pose.add(qrig.neck[1], -16 * w + 24 * s, 0, 0);
          pose.add(qrig.head, -12 * w + 22 * s, 0, 0);
          jawAng = 6 + 34 * Math.max(w, s);
          wingLift = 22 * Math.max(w, s);
          pearlScale = 0.35 + 0.65 * s;
          glow = 1.3 + 0.8 * Xe(p, 0.36, 0.16);
          break;
        }
        case 'cast_s1': {
          // 吐息龙珠扫射动画
          const wEnd = 0.32;
          const warn = Ct(st.p, 0, wEnd);
          const fire = Ct(st.p, wEnd, 1);
          const sweep = Math.sin((fire * 2 - 1) * 1.1);
          pose.add(qrig.neck[0], -18 * warn + 14 * fire, 0, 0);
          pose.add(qrig.neck[2], 0, sweep * 22 * fire, 0);
          pose.add(qrig.head, -14 * warn + 10 * fire, sweep * 18 * fire, 0);
          jawAng = 8 + 38 * Math.max(warn, fire);
          pearlScale = 0.4 + 0.8 * fire;
          wingLift = 28 * Math.max(warn, fire);
          glow = 1.5 + 1.1 * Math.max(warn, fire);
          break;
        }
        case 'stunned': {
          pose.add(qrig.neck[1], 16, Math.sin(t * 2.5) * 16, 0);
          pose.add(qrig.head, 0, 0, Math.sin(t * 2.5 + 1) * 14);
          jawAng = 14;
          break;
        }
        default: {
          if (st.spawnT >= 0) {
            const p = st.spawnT / 2.4;
            const e = Gn(Ct(p, 0.25, 0.95));
            pose.pos(qrig.root, 0, -3.8 * (1 - e), 0);
            pose.add(qrig.pelvis, -20 * (1 - e), 0, 0);
            wingLift = 26 * (1 - e);
          } else {
            pose.add(qrig.neck[1], Math.sin(t * 1.2) * 5, Math.sin(t * 0.55) * 12, 0);
            pose.add(qrig.head, Math.sin(t * 1.4) * 4, Math.sin(t * 0.55 + 0.6) * 10, 0);
          }
        }
      }
      const h = Jo(st.hitT);
      if (h > 0 && st.anim !== 'dead') {
        pose.add(qrig.neck[2], 6 * h, (st.seed > 0.5 ? 1 : -1) * 14 * h, 0);
      }
      for (let i = 0; i < 6; i++) {
        pose.add(qrig.tail[i], Math.sin(t * 1.1 - i * 0.6) * 3, Math.sin(t * 0.9 - i * 0.7) * (6 + i * 2.5), 0);
      }
      const flap = Math.sin(t * wingRate) * 14 + wingLift;
      pose.rot(wingL, 0, -8, flap);
      pose.rot(wingR, 0, 8, -flap);
      pose.rot(qrig.jaw, jawAng, 0, 0);
      pose.scale(vent, Math.max(0.001, pearlScale));
      if (legsOk) _a(qrig, pose);
      fx.glow = Math.max(0.05, glow);
    };

    return {
      key: 'monster:abyss_drake',
      geometry: m.build(),
      rig,
      height: 4.9,
      radius: 2.6,
      scale: 1,
      stride: 3.6,
      triangles: m.triangleCount,
      deathDur: 3.2,
      spawnDur: 2.4,
      outline: 1.8,
      attach: {
        chest: { joint: qrig.chest, x: 0, y: 0.1, z: 0.3 },
        head: { joint: qrig.head, x: 0, y: 0.35, z: 0.3 },
        muzzle: { joint: vent, x: 0, y: 0, z: 0.4 },
        weapon: { joint: vent, x: 0, y: 0, z: 0.4 },
        vent: { joint: vent, x: 0, y: 0, z: 0.3 },
        crest: { joint: crest, x: 0, y: 0, z: 0 },
        tail: { joint: qrig.tail[5], x: 0, y: 0, z: -0.7 },
        wingL: { joint: wingL, x: 2.6, y: 0.5, z: 0 },
        wingR: { joint: wingR, x: -2.6, y: 0.5, z: 0 },
      },
      blend: (_a0: string, a1: string) => (a1 === 'attack' || a1 === 'cast_s1' ? 0.1 : 0.2),
      animate,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 6. star_colossus (史诗 Boss) -> 《镇岳青铜麒麟尊》
  // ───────────────────────────────────────────────────────────────────────────
  function buildBronzeQilinColossus() {
    const rig = new Wa();
    const root = rig.add('root', -1, 0, 0, 0);
    const torso = rig.add('torso', root, 0, 3.85, 0);
    const core = rig.add('core', torso, 0, 3.85, 0.15);
    const rings = [0, 1, 2].map((i) => rig.add(`ring${i}`, torso, 0, 3.85, 0.1));
    const head = rig.add('head', torso, 0, 5.42, 0.28);
    const halo = rig.add('halo', torso, 0, 5.3, -0.82);
    const shoulders = [1, -1].map((s) => rig.add(`shoulder${s}`, torso, s * 1.98, 4.92, 0));
    const plates = [0, 1, 2, 3].map((i) => rig.add(`plate${i}`, torso, (i % 2 ? -1 : 1) * 0.88, 3.85, i < 2 ? 0.7 : -0.7));
    const fists = [1, -1].map((s) => rig.add(`fist${s}`, root, s * 2.75, 2.85, 0.78));
    const waistH = [2.65, 2.18, 1.72, 1.28, 0.85];
    const waistR = [1.05, 0.85, 0.66, 0.48, 0.32];
    const waist = waistH.map((h, i) => rig.add(`waist${i}`, root, 0, h, 0));

    const m = new Ls();
    m.crease = 34;

    // 浮空青铜鼎基阶梯片 + 鎏金云纹环
    waist.forEach((wb, i) => {
      const wr = waistR[i];
      m.bone(wb).paint(0x283634, { c2: 0x5c756c, gloss: 0.72, mat: K.metal });
      m.lathe([[-0.18 * wr + waistH[i], wr * 0.8], [waistH[i], wr], [0.18 * wr + waistH[i], wr * 0.86]], { seg: 8, crease: 30 });
      m.paint(0xdca844, { c2: 0xfff0b2, gloss: 1, glow: 0.28, mat: K.metal });
      m.g(pt(0, waistH[i], 0), () => m.torus(wr * 1.04, 0.04, 0.036, 8, 4));
    });

    // 重型青铜饕餮四分甲胄胸廓（合围悬浮玉玺灵核）
    [
      [20, 76],
      [104, 160],
      [-76, -20],
      [-160, -104],
    ].forEach(([a0, a1], idx) => {
      m.bone(plates[idx]).paint(0x2a3b38, { c2: 0x628076, gloss: 0.78, mat: K.metal });
      m.sheet(
        4,
        4,
        (u, v) => {
          const ang = (bt(a0, a1, u) * Math.PI) / 180;
          const y = bt(2.9, 4.85, v);
          const r = bt(0.88, 1.54, Math.pow(v, 1.1));
          return [Math.cos(ang) * r, y, Math.sin(ang) * r * 0.86];
        },
        true,
        30,
      );
      m.paint(0xe6b852, { c2: 0xfff0b2, gloss: 1, glow: 0.3, mat: K.metal });
      const midA = (((a0 + a1) * 0.5) * Math.PI) / 180;
      m.box(Math.cos(midA) * 1.24, 3.88, Math.sin(midA) * 1.08, 0.14, 1.15, 0.14, 0.02);
    });

    // 胸腔悬浮旋转【传国鎏金翡翠玉玺核心】
    m.bone(core).paint(0x52e0c8, { c2: 0xffffff, glow: 0.92, mat: K.crystal, line: 0 });
    m.g(pt(0, 3.85, 0.15, 0, 45, 0), () => {
      m.box(0, -0.08, 0, 0.52, 0.44, 0.52, 0.05);
      m.paint(0xffdf78, { glow: 0.7, gloss: 1, mat: K.metal });
      m.g(pt(0, 0.25, 0), () => m.torus(0.24, 0.05, 0.05, 8, 4));
    });

    // 三道鎏金八卦浑天星仪旋环
    rings.forEach((rb, idx) => {
      m.bone(rb).paint(0xe6b852, { c2: 0xfff4be, gloss: 1, glow: 0.42, mat: K.metal });
      m.g(pt(0, 3.85, 0.1, idx === 0 ? 78 : idx === 1 ? 35 : -55, 0, idx * 40), () => m.torus(1.42 + idx * 0.28, 0.042, 0.036, 12, 4, { crease: 25 }));
    });

    // 深古铜饕餮多层叠瓣双巨肩 + 精雕兽爪重拳（消除泛白方盒积木感）
    shoulders.forEach((sb, idx) => {
      const s = idx === 0 ? 1 : -1;
      m.bone(sb).paint(0x21312e, { c2: 0x3b524b, gloss: 0.72, glow: 0, mat: K.metal });
      m.g(pt(s * 1.98, 4.92, 0, 0, 0, -s * 18), () => {
        m.lathe(
          [
            [-0.36, 0.56, 0.62],
            [0, 0.72, 0.76],
            [0.36, 0.52, 0.56],
            [0.5, 0.18, 0.2],
          ],
          { seg: 10, crease: 30 },
        );
        m.paint(0xc99636, { c2: 0xffe49c, gloss: 0.9, glow: 0.12, mat: K.metal });
        m.g(pt(0, -0.02, 0), () => m.torus(0.7, 0.05, 0.04, 10, 4, { crease: 25 }));
        m.g(pt(s * 0.42, 0.42, 0, 0, 0, -s * 28), () => m.crystal(0.13, 0.52, 5, 0.72, 0.1));
      });
    });

    fists.forEach((fb, idx) => {
      const s = idx === 0 ? 1 : -1;
      m.bone(fb).paint(0x233431, { c2: 0x456159, gloss: 0.72, glow: 0, mat: K.metal });
      m.g(pt(s * 2.65, 2.85, 0.75), () => {
        m.lathe(
          [
            [0.38, 0.34, 0.34],
            [0.62, 0.42, 0.42],
            [0.78, 0.3, 0.3],
          ],
          { seg: 8, crease: 28 },
        );
        m.box(0, -0.04, 0, 0.68, 0.64, 0.68, 0.12);
        m.paint(0xc99636, { c2: 0xffe088, gloss: 0.9, glow: 0.14, mat: K.metal });
        m.g(pt(0, 0.38, 0), () => m.torus(0.4, 0.045, 0.04, 8, 4, { crease: 25 }));
        for (let c = -1; c <= 1; c++) {
          m.g(pt(c * 0.18, -0.32, 0.26, 138, c * 10, 0), () => m.crystal(0.08, 0.34, 4, 0.72, 0.1));
        }
        m.g(pt(s * 0.3, -0.22, 0.08, 128, 0, -s * 22), () => m.crystal(0.075, 0.28, 4, 0.72, 0.1));
        m.paint(0x52e0c8, { c2: 0xffffff, glow: 0.78, mat: K.crystal, line: 0 });
        m.ball(0, 0, 0.35, 0.13, 0.13, 0.07, 0);
      });
    });

    // 威严双角【青铜麒麟神兽首】+ 脑后旋转【敦煌火焰金环背光轮】(rx=90 垂直正对正面!)
    m.bone(head).paint(0x2a3b38, { c2: 0x64887c, gloss: 0.85, mat: K.metal });
    m.box(0, 5.45, 0.32, 0.86, 0.94, 0.92, 0.1);
    m.box(0, 5.25, 0.68, 0.62, 0.42, 0.46, 0.06);
    m.paint(0xe6b852, { c2: 0xfff0b2, gloss: 1, glow: 0.35, mat: K.metal });
    m.sym(() => {
      // 威严麒麟双角
      m.tube([[0.28, 5.9, 0.25, 0.09], [0.58, 6.45, 0.05, 0.065], [0.76, 6.95, -0.25, 0.02]], { seg: 6 });
      m.paint(0x58ecd4, { glow: 0.92, line: 0 });
      m.box(0.24, 5.56, 0.8, 0.18, 0.09, 0.08, 0.02);
    });
    m.paint(0xe6b852, { glow: 0.45, mat: K.metal });
    m.g(pt(0, 5.95, 0.78, 12, 0, 0), () => m.crystal(0.16, 0.48, 4, 0.75, 0.1));

    m.bone(halo).paint(0xe6b852, { c2: 0xfff0b2, gloss: 1, glow: 0.48, mat: K.metal });
    m.g(pt(0, 5.3, -0.82, 90, 0, 0), () => {
      m.torus(1.48, 0.065, 0.05, 16, 4);
      m.torus(1.08, 0.04, 0.036, 12, 4);
    });
    m.paint(0xffdf78, { glow: 0.72, mat: K.crystal, line: 0 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      m.g(pt(Math.cos(a) * 1.62, 5.3 + Math.sin(a) * 1.62, -0.82, 0, 0, (a * 180) / Math.PI - 90), () => m.crystal(0.11, 0.34, 4, 0.75, 0.1));
    }

    m.bakeGrounding(7.0);

    const animate = (pose: MonsterPoseWriter, st: MonsterAnimState, fx: { glow: number; tint?: number; tintColor?: number }) => {
      const t = st.time + st.seed * 12;
      const move = st.anim === 'move';
      let ringSpeed = 1;
      let haloSpeed = 1;
      let coreScale = 1;
      let glow = 1.0 + 0.15 * Math.sin(t * 2.2);

      // 悬浮呼吸
      pose.move(torso, 0, Math.sin(t * 1.6) * 0.12, 0);
      pose.rot(core, t * 22, t * 40, t * 14);
      waist.forEach((wb, i) => pose.move(wb, 0, Math.sin(t * 1.8 - i * 0.5) * 0.06, 0));

      switch (st.anim) {
        case 'dead': {
          const d = Math.min(1, st.t / 3.6);
          const s1 = Gn(Ct(d, 0.1, 0.85));
          pose.pos(root, 0, -3.4 * s1, 0);
          pose.rot(torso, 18 * s1, 0, 24 * s1);
          fists.forEach((fb, i) => pose.move(fb, (i === 0 ? 1 : -1) * 0.6 * s1, -2.5 * s1, 0.5 * s1));
          pose.scale(core, Math.max(0.001, 1 - d));
          ringSpeed = 0;
          haloSpeed = 0;
          glow = Math.max(0.04, 1 - d * 1.1);
          break;
        }
        case 'attack': {
          const p = easePow(st.p, st.windup);
          const w = Gn(Ct(p, 0, 0.34));
          const s = Ct(p, 0.34, 0.45) * (1 - Gn(Ct(p, 0.58, 1)));
          pose.add(torso, -14 * w + 20 * s, 0, 0);
          fists.forEach((fb, idx) => {
            const side = idx === 0 ? 1 : -1;
            pose.move(fb, -side * 1.1 * (w + s), 3.1 * w - 1.5 * s, -0.5 * w + 1.4 * s);
            pose.add(fb, -95 * w + 22 * s, 0, 0);
          });
          coreScale = 1 + 0.4 * w;
          ringSpeed = 1 + 2.8 * w;
          glow = 1.4 + 0.8 * Xe(p, 0.38, 0.16);
          break;
        }
        case 'stunned': {
          pose.add(torso, 10, 0, Math.sin(t * 5) * 5);
          pose.add(head, 12, Math.sin(t * 5) * 16, 16);
          ringSpeed = 0;
          break;
        }
        default: {
          if (st.spawnT >= 0) {
            const p = st.spawnT / 3.0;
            const e = Gn(Ct(p, 0.25, 0.95));
            pose.pos(root, 0, -4.5 * (1 - e), 0);
            pose.scale(core, Math.max(0.001, e));
            ringSpeed = 2.5 - 1.5 * e;
          } else if (move) {
            fists.forEach((fb, i) => {
              const s = i === 0 ? 1 : -1;
              pose.move(fb, -s * 0.7, 1.1, 0.6);
              pose.add(fb, -42, 0, 0);
            });
            pose.add(torso, 5, 0, 0);
          } else {
            fists.forEach((fb, i) => pose.add(fb, Math.sin(t * 0.7 + i * Math.PI) * 12, 0, 0));
          }
        }
      }
      const h = Jo(st.hitT);
      if (h > 0 && st.anim !== 'dead') {
        pose.add(head, -8 * h, 0, 0);
        coreScale += 0.28 * h;
      }
      const rotSpeeds = [22, 34, -18];
      const tilts = [16, 34, -27];
      rings.forEach((rb, i) => {
        pose.rot(rb, tilts[i], st.time * rotSpeeds[i] * ringSpeed + i * 70, 0);
      });
      pose.rot(halo, 0, 0, st.time * 24 * haloSpeed);
      pose.scale(core, Math.max(0.001, coreScale));
      fx.glow = Math.max(0.04, glow);
    };

    return {
      key: 'monster:star_colossus',
      geometry: m.build(),
      rig,
      height: 7,
      radius: 3,
      scale: 1,
      stride: 3,
      triangles: m.triangleCount,
      deathDur: 3.6,
      spawnDur: 3,
      outline: 1.8,
      attach: {
        chest: { joint: core, x: 0, y: 0, z: 0.3 },
        core: { joint: core, x: 0, y: 0, z: 0 },
        head: { joint: head, x: 0, y: 0.5, z: 0.2 },
        weapon: { joint: fists[1], x: 0, y: -0.4, z: 0.5 },
        handL: { joint: fists[0], x: 0, y: -0.2, z: 0.4 },
        handR: { joint: fists[1], x: 0, y: -0.2, z: 0.4 },
        muzzle: { joint: core, x: 0, y: 0, z: 0.6 },
        crest: { joint: halo, x: 0, y: 0, z: 0 },
      },
      blend: () => 0.22,
      animate,
    };
  }

  return {
    mossback: buildMossbackTurtle,
    glimwing: buildGlimwingQingniao,
    frost_golem: buildNineColoredDeer,
    ember_golem: buildFireSuanniLion,
    abyss_drake: buildYinglongDragon,
    star_colossus: buildBronzeQilinColossus,
  };
}
