/**
 * tangsongMinions3D.ts — 《唐宋荣耀》v4.0 全新国风四兵种 3D 重构建模
 *
 * 彻底抛弃前作硬质石块机器人与「清朝帽/小僵尸」僵硬动作，为四类小兵重塑极具辨识度与想象力的唐宋造型：
 * 1. minion:melee  (「盛唐陌刀虎贲卫」): 开源凤翅金冠 + 明光鱼鳞战甲 + 朱/靛虎纹圆盾 + 唐横刀 + 飘动披风
 * 2. minion:ranged (「御墨浮云书童灵」): 凌空旋转青墨云涡底座 + 双髻玉簪宽袍书童 + 悬空宫灯 + 巨毫鎏金毛笔
 * 3. minion:siege  (「墨家青铜麒麟神火辇」): 真·四辐车轮滚动 + 朱漆雕栏战车 + 麒麟首青铜神火炮 + 燕尾战旗
 * 4. minion:super  (「敦煌飞天金甲天王」): 三叉金冠 + 吞肩兽重铠 + 背后旋转敦煌火焰背光轮 + 方天鎏金长戟 + 飞天飘带
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { clothFoldDepth } from './tangsongCloth';

export interface MinionEngineApi {
  Wa: any;
  Ls: any;
  pt: (...args: number[]) => any;
  kf: number;
  K: Record<string, number>;
  Qt: {
    stone: number;
    stoneLight: number;
    stoneDark: number;
    iron: number;
    brass: number;
    cloth: number;
    wood: number;
  };
  As: Record<string, unknown>;
  wa: Record<string, unknown>;
  $o: Record<string, unknown>;
  ya: Record<string, unknown>;
  Ai: (glow: number) => Record<string, unknown>;
  En: { scale: number; strata: number; fur: number; weave: number; bark: number };
  Pm: (t: number) => { slump: number; burst: number; fall: number };
  Go: (pose: any, joint: number, burst: number, fall: number, dx: number, dy: number, dz: number, rx: number, rz: number) => void;
  Qo: (p: number, windup: number) => number;
  Kn: (x: number) => number;
  Ct: (x: number, a: number, b: number) => number;
  Gn: (x: number) => number;
  Xe: (x: number, c: number, w: number) => number;
  Jo: (hitT: number, dur?: number) => number;
}

const SKIN_WARM = 0xe3b18c;
const SKIN_LIGHT = 0xedc4a4;
const HAIR_INK = 0x191c22;
const IVORY_SILK = 0xf2e7cf;
const LACQUER_RED = 0x992c21;
const IRON_DARK = 0x262d36;
const IRON_BRIGHT = 0x9aa9b8;
const CLOUD_MIST = 0xdbe3df;

function bindCapeChain(joints: number[]) {
  const [j0, j1] = joints;
  // sheet 的第四个蒙皮参数沿布长递增，横跨同一排的顶点应跟随同一节骨骼。
  return (_x: number, _y: number, _z: number, drop: number) => [j1, j0, Math.max(0, Math.min(1, (drop - 0.45) / 0.35))];
}

function addClothPanel(m: any, top: number, bottom: number, length: number, tip: number, facing: number) {
  m.sheet(8, 4, (u: number, v: number) => {
    const side = 2 * u - 1;
    const width = top + (bottom - top) * v;
    const depth = 0.008 + 0.035 * v * (1 + 0.65 * clothFoldDepth(u, v, 2, 0.8));
    return [
      side * width,
      0.02 - length * v - tip * v ** 5 * (1 - Math.abs(side)),
      facing * depth,
    ];
  }, true);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. 近战兵 · 「盛唐陌刀虎贲卫」
// ─────────────────────────────────────────────────────────────────────────────
function buildMeleeTigerGuard(api: MinionEngineApi) {
  const { Wa, Ls, pt, kf, K, Qt, $o, ya, Ai, En, Pm, Go, Qo, Kn, Ct, Gn, Xe, Jo } = api;
  const n = new Wa();
  const t = n.add('root', -1, 0, 0, 0);
  const e = n.add('body', t, 0, 0.5, 0);
  const s = n.add('head', e, 0, 0.96, 0.02);
  const i = n.add('armL', e, 0.3, 0.84, 0.01);
  const a = n.add('armR', e, -0.3, 0.84, 0.01);
  const o = n.add('legL', t, 0.13, 0.44, 0);
  const r = n.add('legR', t, -0.13, 0.44, 0);
  const cape0 = n.add('cape0', e, 0, 0.9, -0.18);
  const cape1 = n.add('cape1', cape0, 0, 0.64, -0.25);
  n.chain({ joints: [cape0, cape1], tip: [0, -0.36, -0.12], stiffness: 10, drag: 0.88, gravity: 4.5, maxAngle: 48, wind: 3.5 });

  const scaleArmor = { gloss: 0.65, mat: K.metal, pattern: En.scale, patternScale: 10, patternAmt: 0.32 };
  const f = new Ls();
  f.crease = 34;

  // 双腿战靴与玄甲护胫
  f.sym((side: number) => {
    f.bone(side > 0 ? o : r);
    f.paint(IRON_DARK, { ...scaleArmor });
    f.lathe(
      [
        [0.12, 0.085, 0.095, 0.13, 0],
        [0.34, 0.105, 0.11, 0.13, 0],
        [0.46, 0.088, 0.09, 0.13, 0],
      ],
      { seg: 8 },
    );
    // 唐式翘头皮革战靴
    f.paint(Qt.wood, { mat: K.leather });
    f.lathe(
      [
        [0, 0.105, 0.145, 0.13, 0.03],
        [0.11, 0.095, 0.12, 0.13, 0.01],
      ],
      { seg: 8 },
    );
    f.paint(Qt.brass, { ...ya });
    f.ball(0.13, 0.31, 0.095, 0.048, 0.052, 0.03, 0);
  });

  // 躯干明光鳞甲 + 玉带 + 队色战裙与披风
  f.bone(e);
  f.paint(0x3a424d, { c2: 0x5c6674, ...scaleArmor });
  f.lathe(
    [
      [0.44, 0.18, 0.15],
      [0.6, 0.22, 0.17],
      [0.78, 0.28, 0.21],
      [0.92, 0.24, 0.18],
    ],
    { seg: 8, phase: 22.5, power: 2.2 },
  );
  // 亮铜护心镜 + 鎏金腰带
  f.paint(Qt.brass, { ...ya });
  f.lathe(
    [
      [0.52, 0.22, 0.175],
      [0.58, 0.225, 0.18],
    ],
    { seg: 8, phase: 22.5, cap0: false, cap1: false },
  );
  f.ball(0, 0.77, 0.195, 0.1, 0.1, 0.038, 0);
  // 队色织锦战裙摆
  f.paint(0xffffff, { ...$o });
  f.g(pt(0, 0.53, 0.185, 8, 0, 0), () => addClothPanel(f, 0.13, 0.15, 0.26, 0.06, 1));
  f.sym(() =>
    f.g(pt(0.22, 0.54, 0, 0, 90, -10), () =>
      addClothPanel(f, 0.1, 0.12, 0.24, 0, 1),
    ),
  );

  // 飘动唐将披风（绑定 cape0 -> cape1 物理链）
  f.bind(bindCapeChain([cape0, cape1]));
  f.paint(0xffffff, { ...$o });
  f.sheet(
    12,
    6,
    (u: number, drop: number) => [
      (u - 0.5) * (0.44 + drop * 0.26),
      0.92 - drop * 0.58 + 0.035 * drop * drop * (2 * u - 1) ** 2,
      -0.18 - drop * 0.2 + Math.sin(u * Math.PI) * 0.05 - 0.065 * clothFoldDepth(u, drop, 2, 1.4),
    ],
    true,
  );

  // 头部（真人面庞 + 贴合唐代凤翅金冠，零笠帽宽檐！）
  f.bone(s);
  f.paint(SKIN_WARM, { c2: SKIN_LIGHT, mat: K.skin });
  f.lathe(
    [
      [0.93, 0.09, 0.09, 0, 0.02],
      [1.01, 0.155, 0.165, 0, 0.03],
      [1.15, 0.16, 0.17, 0, 0.025],
      [1.24, 0.11, 0.12, 0, 0.015],
    ],
    { seg: 10 },
  );
  // 眉额与墨发鬓角
  f.paint(HAIR_INK, { mat: K.fur });
  f.g(pt(0, 1.12, 0.168), () => f.box(0, 0, 0, 0.15, 0.028, 0.02, 0.005));
  // 紧贴颅顶的金边玄甲抹额与双凤翅冠
  f.paint(IRON_DARK, { ...scaleArmor });
  f.lathe(
    [
      [1.13, 0.17, 0.18, 0, 0.01],
      [1.23, 0.165, 0.175, 0, 0.01],
      [1.3, 0.09, 0.095, 0, 0],
    ],
    { seg: 10 },
  );
  f.paint(Qt.brass, { ...ya });
  f.lathe(
    [
      [1.12, 0.176, 0.186, 0, 0.01],
      [1.16, 0.178, 0.188, 0, 0.01],
    ],
    { seg: 10, cap0: false, cap1: false },
  );
  // 左右上扬鎏金凤翅 + 冠顶红缨
  f.sym(() =>
    f.g(pt(0.17, 1.19, -0.02, 12, -20, -24), () =>
      f.extrude([[0, 0], [0.06, 0.08], [0.03, 0.24], [-0.04, 0.28], [-0.05, 0.1]], 0.022, 0.006),
    ),
  );
  f.paint(0xffffff, { ...Ai(0.75) });
  f.g(pt(0, 1.32, -0.04, -28, 0, 0), () =>
    f.tube([[0, 0, 0, 0.045], [0, 0.1, -0.08, 0.05], [0, 0.08, -0.22, 0.02]], { seg: 6 }),
  );

  // 左臂 + 虎纹漆盾
  f.bone(i);
  f.paint(0x454e59, { ...scaleArmor });
  f.ball(0.32, 0.85, 0, 0.11, 0.1, 0.11, 0); // 吞肩甲
  f.paint(SKIN_WARM, { mat: K.skin });
  f.limb([0.32, 0.82, 0], [0.39, 0.56, 0.08], 0.065, 0.055, { seg: 8 });
  f.g(pt(0.45, 0.55, 0.12, 0, 72, 0), () => {
    f.g(pt(0, 0, 0, 90, 0, 0), () => {
      f.paint(0xffffff, { ...$o });
      f.lathe([[-0.03, 0.26, 0.26], [0.03, 0.25, 0.25]], { seg: 8, phase: 22.5 });
      f.paint(Qt.brass, { ...ya });
      f.torus(0.26, 0.028, 0.024, 16, 4);
    });
    f.paint(Qt.brass, { ...ya });
    f.ball(0, 0, 0.04, 0.085, 0.085, 0.045, 0);
    f.paint(0xffffff, { ...Ai(0.95) });
    f.ball(0, 0, 0.068, 0.04, 0.04, 0.022, 0);
  });

  // 右臂 + 银锋唐横刀
  f.bone(a);
  f.paint(0x454e59, { ...scaleArmor });
  f.ball(-0.32, 0.85, 0, 0.11, 0.1, 0.11, 0);
  f.paint(SKIN_WARM, { mat: K.skin });
  f.limb([-0.32, 0.82, 0], [-0.38, 0.56, 0.06], 0.065, 0.055, { seg: 8 });
  f.g(pt(-0.39, 0.53, 0.12, 6, 0, 0), () => {
    f.paint(Qt.brass, { ...ya });
    f.tube([[0, 0, -0.22, 0.024], [0, 0, 0.08, 0.028]], { seg: 6 });
    f.box(0, 0, 0.1, 0.12, 0.1, 0.026, 0.008); // 刀镡
    f.paint(IRON_BRIGHT, { gloss: 0.95, mat: K.metal });
    f.g(pt(0, 0, 0.11, 0, -90, 0), () =>
      f.extrude([[0, -0.035], [0.76, -0.015], [0.92, 0.04], [0.72, 0.045], [0, 0.032]], 0.016, 0.004),
    );
    f.paint(0xffffff, { ...Ai(0.85) });
    f.box(0, 0.036, 0.48, 0.01, 0.012, 0.68);
  });

  f.bakeGrounding(1.48, 0.78, 0.95);

  const animate = (h: any, u: any, m: any) => {
    const x = u.time * 2.6 + u.seed * 6;
    switch (u.anim) {
      case 'dead': {
        const g = Pm(u.t);
        h.pos(e, 0, -0.1 * g.slump - 0.32 * g.fall * g.fall, 0);
        h.rot(e, 14 * g.slump + 42 * g.burst, 0, 10 * g.burst);
        Go(h, s, g.burst, g.fall, 0.1, -0.45, 0.7, -110, 35);
        Go(h, i, g.burst, g.fall, 0.48, 0.2, 0.5, 25, 78);
        Go(h, a, g.burst, g.fall, -0.45, 0.3, 0.5, -40, -88);
        h.rot(o, -28 * g.burst, 0, 26 * g.burst);
        h.rot(r, 20 * g.burst, 0, -30 * g.burst);
        m.glow = Math.max(0.02, 1 - g.slump * 1.2);
        break;
      }
      case 'move': {
        const g = u.stride * kf;
        const y = Math.sin(g);
        h.rot(o, y * 40, 0, 0);
        h.rot(r, -y * 40, 0, 0);
        h.pos(e, 0, Math.abs(Math.cos(g)) * 0.045, 0);
        h.rot(e, 12 + Math.cos(g * 2) * 2.5, -y * 9, 0);
        h.rot(s, -6 - Math.cos(g * 2) * 2, y * 4, 0);
        h.rot(i, -12 - y * 24, 14, 10);
        h.rot(a, 14 + y * 28, -8, -12);
        break;
      }
      case 'attack': {
        const g = Qo(u.p, u.windup);
        const y = Kn(Ct(g, 0, 0.26));
        const v = Ct(g, 0.26, 0.36);
        const c = Gn(Ct(g, 0.5, 1));
        const k = y * (1 - v);
        const M = v * (1 - c);
        const S = Xe(g, 0.42, 0.1);
        h.rot(a, -118 * k - 68 * M + 14 * S, -22 * k + 18 * M, -28 * k + 14 * M);
        h.rot(e, -10 * k + 18 * M, 28 * k - 24 * M, 0);
        h.pos(e, 0, 0.03 * k - 0.04 * M, -0.05 * k + 0.15 * M);
        h.rot(o, 12 * k - 20 * M, 0, 0);
        h.rot(r, -8 * k + 14 * M, 0, 0);
        h.rot(i, -18 - 14 * k, 20, 10);
        h.rot(s, 5 * k - 6 * M, -14 * k + 10 * M, 0);
        m.glow = 1 + 0.35 * k + 0.75 * Xe(g, 0.36, 0.14);
        break;
      }
      case 'stunned': {
        h.rot(e, 8 + Math.sin(x * 2.2) * 6, 0, Math.cos(x * 2.2) * 8);
        h.rot(s, 14, Math.sin(x * 2.2) * 20, 0);
        h.rot(i, -12, 0, 20);
        h.rot(a, 12, 0, -20);
        m.glow = 0.6;
        break;
      }
      case 'airborne': {
        h.rot(t, -20 * Math.sin(u.p * Math.PI), 0, 0);
        h.rot(i, -55, 0, 62);
        h.rot(a, -55, 0, -62);
        h.rot(o, -28, 0, 14);
        h.rot(r, 20, 0, -14);
        break;
      }
      default: {
        h.pos(e, 0, Math.sin(x) * 0.015, 0);
        h.rot(s, 0, Math.sin(x * 0.45) * 9, 0);
        h.rot(i, -8 + Math.sin(x) * 3, 18, 10);
        h.rot(a, 8 - Math.sin(x) * 3, -6, -12);
        m.glow = 1 + 0.12 * Math.sin(x * 1.4);
      }
    }
    const p = Jo(u.hitT, 0.18);
    if (p > 0 && u.anim !== 'dead') {
      h.add(e, -10 * p, 0, 0);
      h.add(s, 12 * p, 0, 0);
    }
  };

  return {
    key: 'minion:melee',
    geometry: f.build(),
    rig: n,
    height: 1.48,
    radius: 0.5,
    scale: 1,
    stride: 1.5,
    triangles: f.triangleCount,
    deathDur: 1.1,
    outline: 1.2,
    attach: {
      chest: { joint: e, x: 0, y: 0.22, z: 0 },
      head: { joint: s, x: 0, y: 0.2, z: 0 },
      weapon: { joint: a, x: -0.06, y: -0.32, z: 0.92 },
      muzzle: { joint: a, x: -0.06, y: -0.32, z: 0.92 },
      handL: { joint: i, x: 0.14, y: -0.24, z: 0.12 },
      handR: { joint: a, x: -0.06, y: -0.3, z: 0.08 },
    },
    blend: (_h: string, u: string) => (u === 'attack' ? 0.07 : 0.12),
    animate,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. 远程兵 · 「御墨浮云书童灵」（凌空青墨云涡底座 + 双髻书童 + 悬空宫灯 + 巨毫毛笔）
// ─────────────────────────────────────────────────────────────────────────────
function buildRangedCloudScholar(api: MinionEngineApi) {
  const { Wa, Ls, pt, kf, K, Qt, $o, ya, Ai, En, Pm, Go, Qo, Kn, Ct, Gn, Xe, Jo } = api;
  const n = new Wa();
  const t = n.add('root', -1, 0, 0, 0);
  const cloud = n.add('cloud', t, 0, 0.22, 0);
  const e = n.add('body', t, 0, 0.42, 0);
  const s = n.add('head', e, 0, 1.08, 0.02);
  const a = n.add('armL', e, 0.25, 0.94, 0.02);
  const o = n.add('armR', e, -0.25, 0.94, 0.02);
  const flame = n.add('flame', a, 0.46, 0.88, 0.28);

  const c = new Ls();
  c.crease = 30;

  // 凌空旋舞的青墨灵云涡底座 (cloud 骨骼，绝非僵尸站桩！)
  c.bone(cloud);
  c.paint(CLOUD_MIST, { c2: 0x9ab0ad, mat: K.cloth });
  c.lathe(
    [
      [0.06, 0.06, 0.06],
      [0.14, 0.24, 0.24],
      [0.24, 0.34, 0.34],
      [0.32, 0.18, 0.18],
    ],
    { seg: 12 },
  );
  for (let k = 0; k < 6; k++) {
    const ang = (k / 6) * kf;
    c.ball(Math.cos(ang) * 0.29, 0.21 + (k % 2) * 0.04, Math.sin(ang) * 0.29, 0.13, 0.085, 0.13, 0);
  }
  c.paint(0xffffff, { ...Ai(0.85) });
  c.g(pt(0, 0.23, 0), () => c.torus(0.38, 0.02, 0.018, 16, 4));

  // 飘逸唐宋长衫广袖袍服 (body 骨骼)
  c.bone(e);
  c.paint(IVORY_SILK, { c2: 0xd9cbb0, mat: K.cloth, pattern: En.weave, patternScale: 10, patternAmt: 0.25 });
  c.lathe(
    [
      [0.32, 0.25, 0.23],
      [0.54, 0.21, 0.18],
      [0.82, 0.19, 0.15],
      [1.02, 0.17, 0.14],
      [1.1, 0.1, 0.1],
    ],
    { seg: 10, power: 2.1 },
  );
  // 队色锦缎外袍与云肩
  c.paint(0xffffff, { ...$o });
  c.g(pt(0, 1.0, 0.15, 7, 0, 0), () => addClothPanel(c, 0.14, 0.17, 0.54, 0.12, 1));
  c.g(pt(0, 1.0, -0.15, -7, 0, 0), () => addClothPanel(c, 0.14, 0.16, 0.54, 0, -1));
  c.lathe(
    [
      [0.95, 0.28, 0.2],
      [1.04, 0.25, 0.18],
      [1.09, 0.13, 0.11],
    ],
    { seg: 10, cap0: false },
  );
  c.paint(Qt.brass, { ...ya });
  c.lathe([[0.66, 0.195, 0.16], [0.71, 0.2, 0.165]], { seg: 10, cap0: false, cap1: false });

  // 书童面庞 + 唐代双发髻与玉簪（彻底摆脱大黑帽子！）
  c.bone(s);
  c.paint(SKIN_LIGHT, { c2: SKIN_WARM, mat: K.skin });
  c.lathe(
    [
      [1.08, 0.08, 0.08, 0, 0.02],
      [1.15, 0.145, 0.15, 0, 0.025],
      [1.29, 0.15, 0.155, 0, 0.02],
      [1.37, 0.1, 0.105, 0, 0.01],
    ],
    { seg: 10 },
  );
  c.paint(HAIR_INK, { mat: K.fur });
  c.lathe(
    [
      [1.26, 0.155, 0.16, 0, 0.005],
      [1.37, 0.14, 0.145, 0, 0],
      [1.41, 0.07, 0.07, 0, -0.01],
    ],
    { seg: 10 },
  );
  // 双髻 + 鎏金玉簪
  c.sym(() => {
    c.paint(HAIR_INK, { mat: K.fur });
    c.ball(0.14, 1.4, -0.01, 0.075, 0.085, 0.075, 0);
    c.paint(Qt.brass, { ...ya });
    c.g(pt(0.14, 1.4, -0.01, 0, 0, 28), () => c.tube([[-0.08, 0, 0, 0.012], [0.08, 0, 0, 0.012]], { seg: 6 }));
    c.paint(0xffffff, { ...Ai(0.8) });
    c.ball(0.14, 1.4, 0.04, 0.032, 0.032, 0.032, 0);
  });

  // 左手举一盏凌空鎏金彩绘小宫灯 (flame 骨骼为施法源点)
  c.bone(a);
  c.paint(0xffffff, { ...$o });
  c.limb([0.26, 0.94, 0.02], [0.38, 0.7, 0.12], 0.095, 0.12, { seg: 8 });
  c.paint(SKIN_LIGHT, { mat: K.skin });
  c.ball(0.39, 0.69, 0.14, 0.042, 0.042, 0.042, 0);

  c.bone(flame);
  c.paint(0xffffff, { ...Ai(0.96) });
  c.lathe(
    [
      [0.77, 0.04, 0.04, 0.46, 0.28],
      [0.82, 0.11, 0.11, 0.46, 0.28],
      [0.95, 0.12, 0.12, 0.46, 0.28],
      [1.0, 0.05, 0.05, 0.46, 0.28],
    ],
    { seg: 6, phase: 30 },
  );
  c.paint(Qt.brass, { ...ya });
  c.lathe(
    [
      [1.0, 0.06, 0.06, 0.46, 0.28],
      [1.04, 0.13, 0.13, 0.46, 0.28],
      [1.07, 0.03, 0.03, 0.46, 0.28],
    ],
    { seg: 6, phase: 30 },
  );
  c.lathe(
    [
      [0.73, 0.03, 0.03, 0.46, 0.28],
      [0.78, 0.09, 0.09, 0.46, 0.28],
    ],
    { seg: 6, phase: 30 },
  );

  // 右手执超大鎏金御毫毛笔 (armR)
  c.bone(o);
  c.paint(0xffffff, { ...$o });
  c.limb([-0.26, 0.94, 0.02], [-0.36, 0.72, 0.1], 0.095, 0.12, { seg: 8 });
  c.paint(SKIN_LIGHT, { mat: K.skin });
  c.ball(-0.37, 0.71, 0.12, 0.042, 0.042, 0.042, 0);
  c.g(pt(-0.37, 0.7, 0.14, 14, 0, -10), () => {
    c.paint(Qt.brass, { ...ya });
    c.tube([[0, -0.34, 0, 0.024], [0, 0.44, 0, 0.028]], { seg: 6 });
    c.paint(0xffffff, { ...Ai(0.9) });
    c.lathe(
      [
        [0.44, 0.03, 0.03],
        [0.52, 0.068, 0.068],
        [0.64, 0.035, 0.035],
        [0.72, 0.008, 0.008],
      ],
      { seg: 8 },
    );
  });

  c.bakeGrounding(1.72, 0.78, 0.95);

  const animate = (d: any, h: any, u: any) => {
    const m = h.time * 2.3 + h.seed * 6;
    const hover = Math.sin(m * 1.8) * 0.06;
    const pulse = 1 + 0.06 * Math.sin(m * 5.1);
    d.rot(cloud, 0, m * 95, 0);
    d.scale(flame, pulse);
    u.glow = 0.95 + 0.22 * Math.sin(m * 2.1);

    switch (h.anim) {
      case 'dead': {
        const g = Pm(h.t);
        d.pos(e, 0, -0.14 * g.slump - 0.36 * g.fall * g.fall, 0);
        d.rot(e, 10 * g.slump + 46 * g.burst, 0, -14 * g.burst);
        d.scale(cloud, Math.max(0.001, 1 - g.slump));
        Go(d, s, g.burst, g.fall, -0.2, 0.45, 0.85, 140, -45);
        Go(d, a, g.burst, g.fall, 0.4, 0.1, 0.6, 30, 80);
        Go(d, o, g.burst, g.fall, -0.4, -0.1, 0.6, -30, -80);
        u.glow = Math.max(0.02, 1 - g.slump * 1.3);
        break;
      }
      case 'move': {
        const g = h.stride * kf;
        d.pos(e, 0, hover + Math.sin(g * 2) * 0.04, 0);
        d.rot(e, 14 + Math.cos(g) * 3, Math.sin(g) * 6, -Math.sin(g) * 4);
        d.rot(s, -10 + Math.sin(g * 2) * 4, 0, Math.sin(g) * 4);
        d.rot(a, -18 + Math.sin(g) * 14, 12, 16);
        d.rot(o, 16 - Math.sin(g) * 18, -10, -16);
        break;
      }
      case 'attack': {
        const g = Qo(h.p, h.windup);
        const y = Kn(Ct(g, 0, 0.27));
        const v = Ct(g, 0.27, 0.36);
        const f = Gn(Ct(g, 0.5, 1));
        const k = y * (1 - v);
        const M = v * (1 - f);
        d.pos(e, 0, hover + 0.08 * k - 0.04 * M, -0.06 * k + 0.1 * M);
        d.rot(e, -14 * k + 18 * M, 18 * k - 14 * M, 0);
        d.rot(s, -14 * k + 20 * M - 6 * Xe(g, 0.44, 0.1), 0, 0);
        d.rot(a, -68 * y * (1 - f) - 24 * M, 24 * k, 28 * y * (1 - f));
        d.rot(o, -120 * k - 54 * M, -26 * k + 20 * M, -24 * k);
        d.scale(flame, pulse * (1 + 0.45 * k - 0.2 * M));
        u.glow = 1 + 0.75 * k + 0.85 * Xe(g, 0.36, 0.12);
        break;
      }
      case 'stunned': {
        d.rot(e, 10 + Math.sin(m * 2.4) * 6, 0, Math.cos(m * 2.4) * 10);
        d.rot(s, 0, Math.sin(m * 2.4) * 24, 14);
        u.glow = 0.55;
        break;
      }
      case 'airborne': {
        d.rot(t, -22 * Math.sin(h.p * Math.PI), 0, 12);
        d.rot(a, -75, 0, 48);
        d.rot(o, -42, 0, -28);
        break;
      }
      default: {
        d.pos(e, 0, hover * 0.7, 0);
        d.rot(s, Math.sin(m * 0.9) * 3, Math.sin(m * 0.5) * 11, 0);
        d.rot(a, -10 + Math.sin(m) * 4, 8, 8);
        d.rot(o, -8 - Math.sin(m) * 4, -8, -8);
      }
    }
    const p = Jo(h.hitT, 0.18);
    if (p > 0 && h.anim !== 'dead') {
      d.add(e, -10 * p, 0, 0);
      d.add(s, 14 * p, 0, 7 * p);
    }
  };

  return {
    key: 'minion:ranged',
    geometry: c.build(),
    rig: n,
    height: 1.72,
    radius: 0.45,
    scale: 1,
    stride: 1.4,
    triangles: c.triangleCount,
    deathDur: 1.1,
    outline: 1.2,
    attach: {
      chest: { joint: e, x: 0, y: 0.32, z: 0 },
      head: { joint: s, x: 0, y: 0.24, z: 0 },
      weapon: { joint: flame, x: 0, y: 0, z: 0.16 },
      muzzle: { joint: flame, x: 0, y: 0, z: 0.16 },
      core: { joint: flame, x: 0, y: 0, z: 0 },
    },
    blend: (_d: string, h: string) => (h === 'attack' ? 0.07 : 0.14),
    animate,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. 攻城兵 · 「墨家青铜麒麟神火辇」（四辐真滚轮 + 朱漆雕栏 + 麒麟火炮 + 飘动战旗）
// ─────────────────────────────────────────────────────────────────────────────
function buildSiegeQilinChariot(api: MinionEngineApi) {
  const { Wa, Ls, pt, kf, K, Qt, $o, ya, Ai, En, Pm, Go, Qo, Kn, Ct, Gn, Jo } = api;
  const n = new Wa();
  const t = n.add('root', -1, 0, 0, 0);
  const e = n.add('body', t, 0, 0.48, 0);
  const s = n.add('head', e, 0, 0.72, 0.72);
  const i = n.add('mount', e, 0, 1.06, -0.05);
  const a = n.add('slide', i, 0, 1.15, 0.56);
  const wheelCoords: [number, number, number][] = [
    [0.6, 0.34, 0.48],
    [-0.6, 0.34, 0.48],
    [0.6, 0.34, -0.48],
    [-0.6, 0.34, -0.48],
  ];
  const wheels = wheelCoords.map(([wx, wy, wz], idx) => n.add(`wheel${idx}`, t, wx, wy, wz));
  const flag0 = n.add('flag0', e, 0, 1.56, -0.58);
  const flag1 = n.add('flag1', flag0, 0, 1.54, -0.95);
  n.chain({ joints: [flag0, flag1], tip: [0, -0.04, -0.45], stiffness: 11, drag: 0.86, gravity: 3.8, maxAngle: 52, wind: 4.5 });

  const f = new Ls();
  f.crease = 34;

  // 四枚青铜镶边木辐战车滚轮 (wheel0..3)
  wheels.forEach((wJoint: number, idx: number) => {
    const [wx, wy, wz] = wheelCoords[idx];
    f.bone(wJoint);
    f.g(pt(wx, wy, wz), () => {
      f.paint(Qt.brass, { ...ya });
      f.g(pt(0, 0, 0, 0, 0, 90), () => {
        f.torus(0.32, 0.042, 0.048, 16, 6);
        f.lathe([[wx > 0 ? -0.06 : 0.06, 0.09, 0.09], [wx > 0 ? 0.07 : -0.07, 0.08, 0.08]], { seg: 8 });
      });
      f.paint(Qt.wood, { mat: K.leather, pattern: En.bark, patternScale: 8, patternAmt: 0.3 });
      for (let sp = 0; sp < 4; sp++) {
        f.g(pt(0, 0, 0, sp * 45, 0, 0), () => f.box(0, 0, 0, 0.04, 0.58, 0.04, 0.008));
      }
    });
  });

  // 朱漆战车车厢底盘与雕花护板 + 队色垂幔
  f.bone(e);
  f.paint(Qt.wood, { mat: K.leather, pattern: En.bark, patternScale: 7, patternAmt: 0.25 });
  f.box(0, 0.52, 0, 0.94, 0.14, 1.38, 0.03);
  f.paint(LACQUER_RED, { mat: K.leather });
  f.box(0, 0.7, 0, 0.86, 0.22, 1.24, 0.025);
  // 队色两侧战车锦幛
  f.paint(0xffffff, { ...$o });
  f.sym(() => {
    f.g(pt(0.49, 0.68, 0, 0, 90, 0), () =>
      f.extrude([[-0.5, 0.14], [0.5, 0.14], [0.46, -0.18], [-0.46, -0.18]], 0.025, 0.008),
    );
  });
  f.paint(Qt.brass, { ...ya });
  f.box(0, 0.34, 0.48, 1.28, 0.075, 0.075, 0.015);
  f.box(0, 0.34, -0.48, 1.28, 0.075, 0.075, 0.015);
  // 车尾鎏金战旗杆
  f.limb([0, 0.72, -0.58], [0, 1.98, -0.58], 0.035, 0.026, { seg: 6 });
  f.g(pt(0, 1.98, -0.58), () => f.crystal(0.055, 0.18, 4, 0.65, 0.25));

  // 飘动燕尾战旗 (flag0 -> flag1 物理链)
  f.bind(bindCapeChain([flag0, flag1]));
  f.paint(0xffffff, { ...$o });
  f.sheet(
    6,
    8,
    (u: number, reach: number) => [
      0.065 * clothFoldDepth(u, reach, 1, 0.8) + reach * 0.06 * Math.sin(5 * reach - 2 * u),
      1.92 - u * 0.46 * (1 - reach * 0.28) - reach * reach * 0.045,
      -0.6 - reach * 0.68 + 0.11 * reach ** 4 * (1 - Math.abs(2 * u - 1)),
    ],
    true,
  );

  // 车首鎏金麒麟神兽饰首 (head)
  f.bone(s);
  f.paint(Qt.brass, { ...ya });
  f.g(pt(0, 0.72, 0.72, -14, 0, 0), () => {
    f.box(0, 0, 0, 0.32, 0.26, 0.34, 0.05);
    f.sym(() => f.limb([0.11, 0.12, -0.02], [0.16, 0.34, -0.14], 0.04, 0.014, { seg: 5 }));
  });
  f.paint(0xffffff, { ...Ai(0.95) });
  f.sym(() => f.ball(0.09, 0.77, 0.87, 0.034, 0.03, 0.025, 0));

  // 青铜麒麟神火炮身 (mount)
  f.bone(i);
  f.paint(IRON_DARK, { gloss: 0.75, mat: K.metal });
  f.g(pt(0, 1.12, -0.04, 82, 0, 0), () =>
    f.lathe(
      [
        [-0.48, 0.19, 0.19],
        [-0.25, 0.21, 0.21],
        [0.12, 0.175, 0.175],
        [0.52, 0.155, 0.155],
        [0.62, 0.21, 0.21],
      ],
      { seg: 10 },
    ),
  );
  f.paint(Qt.brass, { ...ya });
  f.box(0, 1.06, -0.04, 0.42, 0.18, 0.2, 0.03);
  f.box(0, 1.16, 0.56, 0.34, 0.28, 0.12, 0.03);

  // 炮膛内炽热火珠 (slide)
  f.bone(a);
  f.paint(0xffffff, { ...Ai(1.0) });
  f.ball(0, 1.16, 0.62, 0.13, 0.13, 0.13, 0);

  f.bakeGrounding(1.85);

  const animate = (h: any, u: any, m: any) => {
    const x = u.time * 1.9 + u.seed * 6;
    let p = 1;
    const roll = u.stride * kf * 1.45;
    switch (u.anim) {
      case 'dead': {
        const y = Pm(u.t);
        const v = y.fall * y.fall;
        h.pos(e, 0, -0.1 * y.slump - 0.36 * v, 0);
        h.rot(e, 7 * v, 0, 12 * v);
        wheels.forEach((w: number, idx: number) =>
          h.rot(w, (idx < 2 ? -55 : 55) * v, 0, (idx % 2 === 0 ? 45 : -45) * v),
        );
        Go(h, i, y.burst, y.fall, 0.3, -0.3, 0.6, -28, 48);
        h.rot(s, 26 * v, 0, 0);
        p = 1 - y.burst;
        m.glow = Math.max(0.02, 1 - y.slump * 1.3);
        break;
      }
      case 'move': {
        wheels.forEach((w: number) => h.rot(w, roll, 0, 0));
        h.pos(e, 0, Math.abs(Math.sin(roll * 2)) * 0.028, 0);
        h.rot(e, Math.cos(roll * 2) * 1.8, 0, Math.sin(roll) * 2.2);
        h.rot(i, Math.sin(roll * 2) * 2.5, 0, 0);
        break;
      }
      case 'attack': {
        const y = Qo(u.p, u.windup);
        const v = Kn(Ct(y, 0, 0.3));
        const rec = Ct(y, 0.33, 0.38);
        const f2 = Ct(y, 0.42, 1);
        const M = rec * (1 - f2) * (1 - f2);
        h.rot(i, -16 * v * (1 - f2) - 8 * M, 0, 0);
        h.rot(e, -5 * M + 3 * v * (1 - rec), 0, 0);
        h.pos(e, 0, -0.04 * M, -0.16 * M);
        p = 1 + 0.35 * v * (1 - rec);
        h.scale(a, Math.max(0.001, 1 - rec + Gn(Ct(y, 0.72, 0.96))));
        h.pos(a, 0, 0, 0.52 * rec * (1 - Ct(y, 0.4, 0.52)));
        m.glow = 1 + 0.75 * v * (1 - rec) + 0.85 * M;
        break;
      }
      case 'stunned': {
        h.rot(e, Math.sin(x * 2.5) * 4, 0, Math.cos(x * 2.5) * 6);
        h.rot(s, 14, Math.sin(x * 2.5) * 18, 0);
        m.glow = 0.6;
        break;
      }
      case 'airborne': {
        h.rot(t, -16 * Math.sin(u.p * Math.PI), 0, 8);
        wheels.forEach((w: number, idx: number) => h.rot(w, idx < 2 ? -35 : 35, 0, 0));
        break;
      }
      default: {
        h.pos(e, 0, Math.sin(x) * 0.012, 0);
        h.rot(s, Math.sin(x * 0.7) * 4, Math.sin(x * 0.35) * 10, 0);
        h.rot(i, Math.sin(x * 0.5) * 2, 0, 0);
        m.glow = 1 + 0.14 * Math.sin(x * 1.4);
      }
    }
    h.scale(a, p);
    const g = Jo(u.hitT, 0.18);
    if (g > 0 && u.anim !== 'dead') {
      h.add(e, 0, 0, 5 * g);
      h.add(s, 12 * g, 0, 0);
    }
  };

  return {
    key: 'minion:siege',
    geometry: f.build(),
    rig: n,
    height: 1.85,
    radius: 0.85,
    scale: 1,
    stride: 1.9,
    triangles: f.triangleCount,
    deathDur: 1.2,
    outline: 1.2,
    attach: {
      chest: { joint: e, x: 0, y: 0.25, z: 0 },
      head: { joint: s, x: 0, y: 0.1, z: 0.2 },
      weapon: { joint: i, x: 0, y: 0.18, z: 0.9 },
      muzzle: { joint: i, x: 0, y: 0.18, z: 0.9 },
    },
    blend: () => 0.14,
    animate,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. 超级兵 · 「敦煌飞天金甲天王」（三叉金冠 + 吞肩重铠 + 旋转火焰背光 + 方天鎏金戟）
// ─────────────────────────────────────────────────────────────────────────────
function buildSuperHeavenlyGuardian(api: MinionEngineApi) {
  const { Wa, Ls, pt, kf, K, Qt, $o, ya, Ai, En, Pm, Go, Qo, Kn, Ct, Gn, Xe, Jo } = api;
  const n = new Wa();
  const t = n.add('root', -1, 0, 0, 0);
  const e = n.add('hips', t, 0, 0.82, 0);
  const s = n.add('chest', e, 0, 1.26, 0);
  const i = n.add('head', s, 0, 1.82, 0.04);
  const halo = n.add('halo', s, 0, 1.66, -0.26);
  const a = n.add('armL', s, 0.56, 1.58, 0);
  const o = n.add('armR', s, -0.56, 1.58, 0);
  const r = n.add('foreL', a, 0.62, 1.14, 0);
  const l = n.add('foreR', o, -0.62, 1.14, 0);
  const c = n.add('maul', l, -0.62, 0.78, 0.05);
  const f = n.add('legL', e, 0.22, 0.78, 0);
  const d = n.add('legR', e, -0.22, 0.78, 0);
  const h = n.add('flag0', s, 0, 1.72, -0.34);
  const u = n.add('flag1', h, 0, 1.38, -0.65);
  n.chain({ joints: [h, u], tip: [0, -0.35, -0.25], stiffness: 9, drag: 0.88, gravity: 4, maxAngle: 56, wind: 4.2 });

  const scaleGold = { gloss: 0.85, mat: K.metal, pattern: En.scale, patternScale: 9, patternAmt: 0.3 };
  const p = new Ls();
  p.crease = 34;

  // 金甲战靴与山文护腿
  p.sym((side: number) => {
    p.bone(side > 0 ? f : d);
    p.paint(0x3a3d45, { ...scaleGold });
    p.lathe(
      [
        [0.14, 0.15, 0.17, 0.22, 0],
        [0.48, 0.17, 0.18, 0.22, 0],
        [0.82, 0.2, 0.19, 0.22, 0],
      ],
      { seg: 8, phase: 22.5, power: 2.3 },
    );
    p.paint(Qt.brass, { ...ya });
    p.lathe(
      [
        [0, 0.2, 0.25, 0.22, 0.05],
        [0.14, 0.18, 0.21, 0.22, 0.02],
      ],
      { seg: 8, phase: 22.5 },
    );
    p.ball(0.22, 0.48, 0.18, 0.095, 0.1, 0.06, 0);
  });

  // 胯甲与队色金绣战裙
  p.bone(e);
  p.paint(Qt.brass, { ...ya });
  p.lathe(
    [
      [0.72, 0.26, 0.22],
      [0.98, 0.35, 0.27],
      [1.08, 0.32, 0.25],
    ],
    { seg: 8, phase: 22.5, power: 2.4 },
  );
  p.paint(0xffffff, { ...$o });
  p.g(pt(0, 0.88, 0.28, 7, 0, 0), () => addClothPanel(p, 0.22, 0.2, 0.42, 0.12, 1));
  p.g(pt(0, 0.88, -0.27, -7, 0, 0), () => addClothPanel(p, 0.22, 0.19, 0.4, 0, -1));
  p.sym(() =>
    p.g(pt(0.35, 0.88, 0, 0, 90, -10), () =>
      addClothPanel(p, 0.16, 0.13, 0.32, 0, 1),
    ),
  );

  // 鎏金明光胸铠 (chest)
  p.bone(s);
  p.paint(0x454952, { c2: 0x737985, ...scaleGold });
  p.lathe(
    [
      [1.08, 0.34, 0.26],
      [1.26, 0.48, 0.35],
      [1.52, 0.58, 0.39],
      [1.72, 0.52, 0.35],
      [1.82, 0.28, 0.25],
    ],
    { seg: 8, phase: 22.5, power: 2.3 },
  );
  p.paint(Qt.brass, { ...ya });
  p.sym(() => p.ball(0.22, 1.46, 0.34, 0.14, 0.15, 0.07, 0)); // 明光双圆护
  p.paint(0xffffff, { ...Ai(0.88) });
  p.ball(0, 1.46, 0.39, 0.1, 0.11, 0.05, 0);

  // 敦煌旋转鎏金火焰背光轮 (halo 骨骼，超级兵标志！)
  p.bone(halo);
  p.paint(Qt.brass, { ...ya });
  p.g(pt(0, 1.66, -0.26, 90, 0, 0), () => p.torus(0.76, 0.048, 0.042, 20, 6));
  p.paint(0xffffff, { ...Ai(0.95) });
  for (let k = 0; k < 8; k++) {
    const ang = (k / 8) * kf;
    p.g(pt(Math.cos(ang) * 0.78, 1.66 + Math.sin(ang) * 0.78, -0.26, 0, 0, (ang * 180) / Math.PI - 90), () =>
      p.crystal(0.06, 0.22, 4, 0.65, 0.2),
    );
  }

  // 飞天披帛战旗飘带 (flag0 -> flag1 链)
  p.bind(bindCapeChain([h, u]));
  p.paint(0xffffff, { ...$o });
  p.sheet(
    12,
    6,
    (u: number, drop: number) => [
      (u - 0.5) * (0.58 + drop * 0.28),
      1.74 - drop * 0.92 + 0.055 * drop * drop * (2 * u - 1) ** 2,
      -0.34 - drop * 0.42 + Math.sin(u * Math.PI) * 0.06 - 0.09 * clothFoldDepth(u, drop, 2, 2.8),
    ],
    true,
  );

  // 面庞与三叉金冠 (head)
  p.bone(i);
  p.paint(SKIN_WARM, { c2: SKIN_LIGHT, mat: K.skin });
  p.lathe(
    [
      [1.8, 0.14, 0.15, 0, 0.04],
      [1.89, 0.21, 0.21, 0, 0.05],
      [2.05, 0.2, 0.21, 0, 0.04],
      [2.16, 0.12, 0.13, 0, 0.02],
    ],
    { seg: 10 },
  );
  p.paint(Qt.brass, { ...ya });
  p.lathe(
    [
      [2.03, 0.22, 0.23, 0, 0.03],
      [2.14, 0.21, 0.22, 0, 0.02],
      [2.21, 0.13, 0.14, 0, 0.01],
    ],
    { seg: 10 },
  );
  // 三叉唐代火焰金冠
  p.g(pt(0, 2.16, 0.16, -8, 0, 0), () =>
    p.extrude([[-0.18, 0], [0.18, 0], [0.22, 0.18], [0.12, 0.1], [0, 0.3], [-0.12, 0.1], [-0.22, 0.18]], 0.03, 0.008),
  );
  p.paint(0xffffff, { ...Ai(0.95) });
  p.ball(0, 2.26, 0.18, 0.05, 0.055, 0.035, 0);

  // 双臂 + 吞肩兽金甲 + 方天鎏金大戟
  p.sym((side: number) => {
    p.bone(side > 0 ? a : o);
    p.paint(Qt.brass, { ...ya });
    p.ball(0.58, 1.6, 0, 0.22, 0.2, 0.22, 0); // 吞肩甲
    p.paint(0x3a3d45, { ...scaleGold });
    p.limb([0.58, 1.56, 0], [0.62, 1.14, 0.02], 0.14, 0.12, { seg: 8 });
    p.bone(side > 0 ? r : l);
    p.paint(Qt.brass, { ...ya });
    p.limb([0.62, 1.14, 0.02], [0.62, 0.78, 0.05], 0.13, 0.11, { seg: 8 });
  });

  // 方天鎏金长戟 (maul 骨骼)
  p.bone(c);
  p.g(pt(-0.62, 0.78, 0.05), () => {
    p.paint(IRON_DARK, { gloss: 0.7, mat: K.metal });
    p.tube([[0, 0, -0.58, 0.036], [0, 0, 1.25, 0.04]], { seg: 8 });
    p.paint(Qt.brass, { ...ya });
    p.box(0, 0, 1.22, 0.24, 0.18, 0.18, 0.03);
    p.paint(IRON_BRIGHT, { gloss: 0.95, mat: K.metal });
    p.g(pt(0, 0, 1.48, 90, 0, 0), () => p.crystal(0.085, 0.56, 4, 0.55, 0.25));
    // 双侧月牙戟刃
    p.sym(() =>
      p.g(pt(0.14, 0, 1.22, 90, 0, 0), () =>
        p.extrude([[0, 0.26], [0.22, 0.12], [0.24, -0.18], [0.06, -0.24], [0, -0.08]], 0.024, 0.006),
      ),
    );
    p.paint(0xffffff, { ...Ai(0.95) });
    p.ball(0, 0, 1.22, 0.1, 0.1, 0.1, 0);
  });

  p.bakeGrounding(2.52, 0.78, 0.95);

  const animate = (y: any, v: any, _: any) => {
    const k = v.time * 2.1 + v.seed * 6;
    y.rot(halo, 0, 0, k * 48);
    y.rot(l, -92, 0, 0);
    y.rot(a, 10, 0, 14);
    y.rot(r, -24, 0, 0);

    switch (v.anim) {
      case 'dead': {
        const S = Pm(v.t * 0.85);
        y.pos(e, 0, -0.14 * S.slump - 0.46 * S.fall * S.fall, 0);
        y.rot(e, 10 * S.slump + 30 * S.burst, 0, 8 * S.burst);
        y.rot(s, 20 * S.burst, 0, -10 * S.burst);
        y.scale(halo, Math.max(0.001, 1 - S.slump));
        Go(y, i, S.burst, S.fall, 0.2, 0.6, 1.4, 140, 30);
        Go(y, a, S.burst, S.fall, 0.6, 0, 1, 20, 90);
        Go(y, o, S.burst, S.fall, -0.6, 0.2, 1, 40, -90);
        y.rot(l, -92 + 86 * S.burst, 0, 0);
        y.rot(f, -20 * S.burst, 0, 24 * S.burst);
        y.rot(d, 14 * S.burst, 0, -26 * S.burst);
        _.glow = Math.max(0.02, 1 - S.slump * 1.3);
        break;
      }
      case 'move': {
        const S = v.stride * kf;
        const b = Math.sin(S);
        y.rot(f, b * 32, 0, 0);
        y.rot(d, -b * 32, 0, 0);
        y.pos(e, 0, Math.abs(Math.cos(S)) * 0.06 - 0.02, 0);
        y.rot(e, 8, -b * 6, b * 2);
        y.rot(s, 3 + Math.cos(S * 2) * 2, b * 8, 0);
        y.rot(a, 10 - b * 24, 0, 14);
        y.rot(c, Math.sin(S * 2 - 1) * 5, 0, 0);
        break;
      }
      case 'attack': {
        const S = Qo(v.p, v.windup);
        const b = Kn(Ct(S, 0, 0.26));
        const w = Ct(S, 0.26, 0.36);
        const T = Gn(Ct(S, 0.55, 1));
        const E = b * (1 - w);
        const A = w * (1 - T);
        const C = Xe(S, 0.42, 0.1);
        y.rot(o, -20 - 135 * E - 42 * A + 10 * C, 0, -10 - 10 * E);
        y.rot(l, -92 + 45 * E + 80 * A, 0, 0);
        y.rot(a, 10 - 115 * E - 40 * A, 0, 14 - 28 * E - 18 * A);
        y.rot(r, -24 - 55 * E, 0, 0);
        y.rot(c, -28 * E + 34 * A, 0, 0);
        y.rot(i, -14 * E + 22 * A, 14 * E - 10 * A, 0);
        y.rot(e, -4 * E + 10 * A, 0, 0);
        y.pos(e, 0, 0.05 * E - 0.12 * A, 0.14 * A);
        y.rot(f, 8 * E - 20 * A, 0, 0);
        y.rot(d, -6 * E + 14 * A, 0, 0);
        y.rot(halo, 0, 0, k * 140);
        _.glow = 1 + 0.35 * E + 0.85 * Xe(S, 0.36, 0.16);
        break;
      }
      case 'stunned': {
        y.rot(e, 6 + Math.sin(k * 2.6) * 4, 0, Math.cos(k * 2.6) * 6);
        y.rot(i, 16, Math.sin(k * 2.6) * 20, 0);
        _.glow = 0.6;
        break;
      }
      case 'airborne': {
        y.rot(t, -18 * Math.sin(v.p * Math.PI), 0, 0);
        y.rot(f, -30, 0, 10);
        y.rot(d, 16, 0, -10);
        y.rot(a, -50, 0, 60);
        break;
      }
      default: {
        y.pos(e, 0, Math.sin(k) * 0.015, 0);
        y.rot(s, Math.sin(k) * 1.8, 0, 0);
        y.rot(i, 0, Math.sin(k * 0.45) * 9, 0);
        _.glow = 1 + 0.16 * Math.sin(k * 2);
      }
    }
    const M = Jo(v.hitT, 0.18);
    if (M > 0 && v.anim !== 'dead') {
      y.add(s, -8 * M, 0, 0);
      y.add(i, 10 * M, 0, 0);
    }
  };

  return {
    key: 'minion:super',
    geometry: p.build(),
    rig: n,
    height: 2.52,
    radius: 0.9,
    scale: 1,
    stride: 2.4,
    triangles: p.triangleCount,
    deathDur: 1.3,
    outline: 1.3,
    attach: {
      chest: { joint: s, x: 0, y: 0.15, z: 0 },
      head: { joint: i, x: 0, y: 0.22, z: 0 },
      weapon: { joint: c, x: 0, y: 0, z: 1.32 },
      muzzle: { joint: c, x: 0, y: 0, z: 1.32 },
      handL: { joint: r, x: 0, y: -0.38, z: 0 },
      handR: { joint: l, x: 0, y: -0.38, z: 0 },
    },
    blend: (_y: string, v: string) => (v === 'attack' ? 0.08 : 0.15),
    animate,
  };
}

export function createTangSongMinions(api: MinionEngineApi) {
  return {
    melee: () => buildMeleeTigerGuard(api),
    ranged: () => buildRangedCloudScholar(api),
    siege: () => buildSiegeQilinChariot(api),
    super: () => buildSuperHeavenlyGuardian(api),
  };
}
