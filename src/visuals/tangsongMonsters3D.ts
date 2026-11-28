/**
 * tangsongMonsters3D.ts — 《唐宋荣耀》全 6 种野怪东方神兽雕塑级重塑
 *
 * 在完整保留原作高完成度骨骼（Wa / Lm 四足逆向屈伸 / 翅膀振翅 / 应龙蛇颈龙尾须物理链 /
 * 麒麟浑天仪三环悬浮躯干）、碰撞尺寸与全动作状态机（spawn/idle/move/attack/windup/dead）的基础上：
 *   1. 全套材质色阶重铸为宋代青绿釉彩、商周青铜、鎏金与朱砂矿彩；
 *   2. 在原有仅 1 枚小挂件的基础上全面加雕唐宋建筑/法器/神兽重甲与背光剪影：
 *      - 负碑灵龟 (mossback)：宋式赑屃青石碑（龟甲背负雕花碑座、发光翡翠篆刻碑身与螭首鎏金碑冠）+ 古铜云纹甲边
 *      - 提灯青鸟 (glimwing)：三羽鎏金凤冠翎 + 悬胸八角朱金彩绘宋式宫灯与垂坠红穗 + 翠金尾羽飘带
 *      - 九色玄鹿 (frost_golem)：敦煌飞天石青云肩璎珞 + 颈后悬空碧玉圆光环 + 双角分叉鎏金玉枝与太阴灵珠
 *      - 赤炎狻猊 (ember_golem)：唐式明光赤铜吞肩兽铠 + 赤绶鎏金镇殿狮铃 + 背后八角鎏金风火轮背光
 *      - 沧溟应龙 (abyss_drake)：分叉鎏金唐龙角 + 龙脊千里江山青金云纹背鳍 + 青铜云纹翼甲 + 双环护珠（彻底告别紫色）
 *      - 镇岳神兽 (star_colossus)：商周饕餮青铜飞檐重肩甲 + 三戟帝玉冠与浑天星阵大光轮 + 环间朱金玉简符石 + 震岳双拳甲
 */

export interface MonsterRig {
  count: number;
  names: string[];
  bind: number[];
  add: (name: string, parent: number, x: number, y: number, z: number) => number;
  addChain: (name: string, parent: number, pts: number[][]) => number[];
  chain: (opts: Record<string, unknown>) => void;
  id: (name: string) => number;
  bx: (id: number) => number;
  by: (id: number) => number;
  bz: (id: number) => number;
}

export interface MonsterMeshBuilder {
  crease: number;
  rough: number;
  boneId: number;
  bone: (id: number) => MonsterMeshBuilder;
  bind: (fn: unknown) => MonsterMeshBuilder;
  paint: (hex: number, opts?: Record<string, unknown>) => MonsterMeshBuilder;
  g: (mat: unknown, fn: () => void) => void;
  lathe: (pts: number[][], opts?: Record<string, unknown>) => void;
  tube: (pts: number[][], opts?: Record<string, unknown>) => void;
  ball: (x: number, y: number, z: number, rx: number, ry: number, rz: number, flat?: number, deg?: number) => void;
  box: (x: number, y: number, z: number, w: number, h: number, d: number, bevel?: number) => void;
  extrude: (poly: number[][], depth: number, bevel?: number) => void;
  sheet: (nu: number, nv: number, point: (u: number, v: number) => number[], doubleSided?: boolean, crease?: number) => MonsterMeshBuilder;
  torus: (r: number, r1: number, r2?: number, seg?: number, tseg?: number, opts?: Record<string, unknown>) => void;
  crystal: (r: number, h: number, seg: number, taper?: number, sharp?: number) => void;
  bakeGrounding: (h?: number, minAo?: number, groundDark?: number) => void;
  build: () => unknown;
  triangleCount: number;
}

export type MonsterKind =
  | 'mossback'
  | 'glimwing'
  | 'frost_golem'
  | 'ember_golem'
  | 'abyss_drake'
  | 'star_colossus';

export interface MonsterDef {
  key: string;
  geometry: unknown;
  rig: MonsterRig;
  height: number;
  radius: number;
  scale: number;
  stride: number;
  triangles: number;
  deathDur: number;
  spawnDur: number;
  outline: number;
  attach: Record<string, { joint: number; x: number; y: number; z: number }>;
  blend: (...args: unknown[]) => number;
  animate: (...args: unknown[]) => void;
}

export interface MonsterEngineApi {
  Wa: new () => MonsterRig;
  Ls: {
    prototype: MonsterMeshBuilder;
  } & (new () => MonsterMeshBuilder);
  K: Record<string, number>;
  En: Record<string, unknown>;
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
  ) => unknown;
  origMonsters: Record<MonsterKind, () => MonsterDef>;
}

function rgbToHsl(hex: number): [number, number, number] {
  const r = ((hex >>> 16) & 255) / 255;
  const g = ((hex >>> 8) & 255) / 255;
  const b = (hex & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) * 0.5;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

function mixHex(a: number, b: number, t: number): number {
  const k = t <= 0 ? 0 : t >= 1 ? 1 : t;
  const ar = (a >>> 16) & 255;
  const ag = (a >>> 8) & 255;
  const ab = a & 255;
  const br = (b >>> 16) & 255;
  const bg = (b >>> 8) & 255;
  const bb = b & 255;
  const r = Math.round(ar + (br - ar) * k);
  const g = Math.round(ag + (bg - ag) * k);
  const bl = Math.round(ab + (bb - ab) * k);
  return (r << 16) | (g << 8) | bl;
}

function toneRamp(hex: number, dark: number, mid: number, light: number, satShift = 0): number {
  const [, s, l] = rgbToHsl(hex);
  const base = l < 0.45 ? mixHex(dark, mid, l / 0.45) : mixHex(mid, light, (l - 0.45) / 0.55);
  return satShift > 0 ? mixHex(base, light, Math.min(0.45, s * satShift)) : base;
}

const glowOf = (opts?: Record<string, unknown>): number => Number(opts?.glow ?? 0);

interface PaletteSpec {
  exact?: Record<number, number>;
  remap: (hex: number, opts?: Record<string, unknown>) => number;
  ornament?: (
    rig: MonsterRig,
    m: MonsterMeshBuilder,
    rawPaint: (hex: number, opts?: Record<string, unknown>) => MonsterMeshBuilder,
    api: MonsterEngineApi,
  ) => void;
}

const PALETTES: Record<MonsterKind, PaletteSpec> = {
  // 1. 负碑青玉灵龟 · 小玄武：宋代龙泉青玉甲壳 + 背负雕刻御碑 + 古铜云纹包边
  mossback: {
    exact: {
      14182458: 0xf7e19c,
      15764042: 0xd9a84e,
      16773320: 0xa6f5d4,
      16767088: 0xf0c96e,
      15260864: 0xc99c4a,
      6265418: 0x2d5e4e,
      10276698: 0x538770,
      6968898: 0x2a5449,
      9074266: 0x3b6e5e,
      5521455: 0x243b34,
      9072208: 0x3f6154,
      13482128: 0xc2ab7e,
    },
    remap: (hex, opts) => {
      if (glowOf(opts) > 0.08) return toneRamp(hex, 0x52c49e, 0x8ef0c6, 0xe8fff5);
      return toneRamp(hex, 0x223831, 0x3c695a, 0xa8d4bd, 0.25);
    },
    ornament: (rig, m, rawPaint, { K, pt }) => {
      try {
        const shellId = rig.id('shell');
        m.bone(shellId);
        // 龟甲中后方竖立宋式「赑屃青石御碑」（避开左右松花），一眼看出「负碑灵龟」剪影
        m.g(pt(0.02, 0.96, -0.18, -8, 0, 0), () => {
          // 碑座：古铜莲台底座
          rawPaint.call(m, 0x9b7432, { c2: 0xe6be68, gloss: 0.78, mat: K.metal });
          m.box(0, 0.05, 0, 0.44, 0.1, 0.24, 0.02);
          // 碑身：青玉石刻碑体 + 两侧鎏金边柱
          rawPaint.call(m, 0x2c4b47, { c2: 0x5a887d, gloss: 0.55, mat: K.rock });
          m.box(0, 0.34, 0, 0.32, 0.5, 0.12, 0.025);
          rawPaint.call(m, 0xd4a448, { c2: 0xf7dc8e, gloss: 0.85, mat: K.metal });
          m.box(-0.17, 0.34, 0, 0.04, 0.48, 0.13, 0.01);
          m.box(0.17, 0.34, 0, 0.04, 0.48, 0.13, 0.01);
          // 碑首：仿宋螭首弧冠 + 玉圭宝顶
          m.g(pt(0, 0.62, 0, 0, 0, 0), () => {
            m.extrude([[-0.19, -0.04], [0.19, -0.04], [0.14, 0.12], [0, 0.2], [-0.14, 0.12]], 0.11, 0.02);
          });
          // 碑心翡翠灵篆核心（前后双面嵌玉）
          rawPaint.call(m, 0x62f0ca, { c2: 0xdcfff4, glow: 0.65, mat: K.crystal, line: 0 });
          m.box(0, 0.35, 0, 0.15, 0.28, 0.135, 0.015);
          m.ball(0, 0.72, 0, 0.048, 0.065, 0.048, 0, 10);
        });
        // 龟甲前缘嵌鎏金碧玉护心镜
        rawPaint.call(m, 0xc99c4a, { c2: 0xf4cf78, gloss: 0.78, mat: K.metal });
        m.g(pt(0, 0.92, 0.42, -32, 0, 0), () => {
          m.torus(0.16, 0.026, 0.024, 14, 5, { crease: 25 });
          rawPaint.call(m, 0x3aa389, { c2: 0x9cf5d8, glow: 0.35, gloss: 0.9, mat: K.crystal });
          m.ball(0, 0, 0.01, 0.12, 0.12, 0.032, 1, 12);
        });
      } catch {
        // 骨骼未命名时安全降级
      }
    },
  },

  // 2. 宋画提灯青鸟：三羽鎏金凤冠翎 + 胸前垂挂宋式八角朱金大宫灯 + 翠金尾羽飘带
  glimwing: {
    exact: {
      16767088: 0xffe08a,
      16747098: 0xe8a246,
      2054758: 0x1e5c5c,
      7334104: 0x4db5ab,
      13172720: 0x72e6d4,
      15261896: 0xf2e4c2,
      1714746: 0x16383b,
    },
    remap: (hex, opts) => {
      const [h] = rgbToHsl(hex);
      if (glowOf(opts) > 0.25 || (h >= 20 && h <= 68)) return toneRamp(hex, 0xc9822e, 0xf2c968, 0xfff2c2);
      return toneRamp(hex, 0x194a4a, 0x2c7d78, 0x7be6d4, 0.3);
    },
    ornament: (rig, m, rawPaint, { K, pt }) => {
      try {
        const bodyId = rig.id('body');
        const headId = rig.id('head');
        const bx = rig.bx(bodyId);
        const by = rig.by(bodyId);
        const bz = rig.bz(bodyId);
        const hx = rig.bx(headId);
        const hy = rig.by(headId);
        const hz = rig.bz(headId);

        // 头顶三羽鎏金翠玉凤冠翎
        m.bone(headId);
        rawPaint.call(m, 0xe8bd60, { c2: 0xfff4c8, gloss: 0.9, mat: K.metal });
        m.g(pt(hx, hy + 0.13, hz + 0.04, -22, 0, 0), () => {
          m.crystal(0.025, 0.24, 4, 0.7, 0.15);
          m.g(pt(0.04, -0.02, -0.02, 0, 0, -24), () => m.crystal(0.018, 0.18, 4, 0.7, 0.15));
          m.g(pt(-0.04, -0.02, -0.02, 0, 0, 24), () => m.crystal(0.018, 0.18, 4, 0.7, 0.15));
        });

        // 胸下垂挂宋式八角朱金彩绘大宫灯（提灯链 + 鎏金宝顶 + 暖光灯芯 + 朱砂流苏穗）
        m.bone(bodyId);
        m.g(pt(bx, by - 0.32, bz + 0.14, 0, 0, 0), () => {
          rawPaint.call(m, 0xcf9b42, { c2: 0xfae08e, gloss: 0.85, mat: K.metal });
          m.tube([[0, 0.16, 0, 0.014], [0, 0.07, 0, 0.016]], { seg: 6 });
          m.torus(0.095, 0.016, 0.014, 12, 4, { crease: 24 });
          m.g(pt(0, -0.1, 0, 0, 0, 0), () => m.torus(0.075, 0.014, 0.012, 12, 4));
          rawPaint.call(m, 0xffd56e, { c2: 0xfff8de, glow: 0.88, mat: K.crystal, line: 0 });
          m.lathe([[-0.09, 0.03], [-0.05, 0.082], [0.04, 0.086], [0.08, 0.03]], { seg: 6 });
          rawPaint.call(m, 0xb83024, { c2: 0xec563c, mat: K.cloth });
          m.crystal(0.026, -0.14, 5, 0.8, 0.1);
        });

        // 双尾羽加配翡翠描金尾翎
        for (const side of [1, -1]) {
          const tailId = rig.id(`tail${side}a`);
          const tx = rig.bx(tailId);
          const ty = rig.by(tailId);
          const tz = rig.bz(tailId);
          m.bone(tailId);
          rawPaint.call(m, 0x5ae0c8, { c2: 0xffe49c, glow: 0.42, mat: K.crystal });
          m.g(pt(tx, ty - 0.02, tz - 0.16, -92, side * 12, 0), () => {
            m.crystal(0.045, 0.34, 4, 0.72, 0.2);
          });
        }
      } catch {
        // 安全忽略
      }
    },
  },

  // 3. 秘色九色玄鹿：敦煌云肩璎珞 + 颈后悬空碧玉圆光环 + 分叉鎏金玉角梢 + 太阴灵珠
  frost_golem: {
    exact: {
      15266559: 0xf0eee2,
      11125990: 0xc7dcd8,
      3559566: 0x366978,
      8363208: 0x6eaeb8,
      9087188: 0x99cbd1,
      5816575: 0xd9a84e,
      14218495: 0x8ef2de,
      8377599: 0x5ec9ba,
      1712696: 0x28363a,
      2897492: 0x455a60,
      13169919: 0xfce6a6,
    },
    remap: (hex, opts) => {
      if (glowOf(opts) > 0.25) return toneRamp(hex, 0xc7953c, 0xedd07a, 0xa8f7e6);
      if (opts?.mat !== undefined) return toneRamp(hex, 0x356470, 0x7cb8c4, 0xedf2ea, 0.2);
      return toneRamp(hex, 0x356470, 0x7cb8c4, 0xedf2ea);
    },
    ornament: (rig, m, rawPaint, { K, pt }) => {
      try {
        const chestId = rig.id('chest');
        const headId = rig.id('head');
        const antL = rig.id('antlerL');
        const crest = rig.id('crest');

        // 敦煌飞天石青鎏金云肩璎珞 + 颈后悬空碧玉圆光环（九色玄鹿仙韵识别标志！）
        m.bone(chestId);
        rawPaint.call(m, 0xdca746, { c2: 0xfff1ba, gloss: 0.88, mat: K.metal });
        m.g(pt(0, 1.92, 0.62, 62, 0, 0), () => {
          m.torus(0.5, 0.032, 0.026, 20, 5, { crease: 26 });
          rawPaint.call(m, 0x66ecd8, { c2: 0xe6fff9, glow: 0.65, mat: K.crystal, line: 0 });
          m.ball(0, 0.48, -0.02, 0.09, 0.09, 0.045, 0, 14);
        });
        // 鹿背上方敦煌天青玉轮圆光
        rawPaint.call(m, 0x6ce8d4, { c2: 0xfff5d4, glow: 0.56, mat: K.crystal });
        m.g(pt(0, 2.52, 0.12, 86, 0, 0), () => {
          m.torus(0.72, 0.026, 0.022, 24, 5, { crease: 28 });
          rawPaint.call(m, 0xe8bf5f, { c2: 0xfff3c6, glow: 0.35, mat: K.metal });
          m.torus(0.62, 0.015, 0.014, 20, 4);
        });

        // 双角环抱处的扩大版太阴月珠 + 交错星环
        const mx = 0;
        const my = (rig.by(antL) + rig.by(crest)) * 0.5 + 0.08;
        const mz = rig.bz(antL) + 0.03;
        m.bone(headId);
        rawPaint.call(m, 0x8ef5e1, { c2: 0xfff9e2, glow: 0.85, gloss: 1, mat: K.crystal, line: 0 });
        m.ball(mx, my, mz, 0.145, 0.145, 0.145, 0, 18);
        rawPaint.call(m, 0xe8bf5f, { c2: 0xfff2bf, glow: 0.38, gloss: 0.9, mat: K.metal });
        m.g(pt(mx, my, mz, 68, 22, 0), () => m.torus(0.22, 0.017, 0.016, 18, 5, { crease: 25 }));
        m.g(pt(mx, my, mz, -42, 48, 24), () => m.torus(0.19, 0.013, 0.012, 16, 4, { crease: 25 }));
      } catch {
        // 安全忽略
      }
    },
  },

  // 4. 赤炎金睛狻猊：唐风明光肩铠 + 赤绶鎏金大铜铃 + 背后八角鎏金风火轮背光
  ember_golem: {
    exact: {
      8010282: 0x38201b,
      11035711: 0x7a2b20,
      5909026: 0x261613,
      11565648: 0xb83826,
      2759968: 0x241715,
      6964282: 0x8f291c,
      16734748: 0xf26329,
      16765562: 0xffe08a,
      15745562: 0xe64522,
      16760912: 0xf7b84a,
      2759194: 0x2b1d1a,
      16734774: 0xff9436,
      16756800: 0xffd269,
    },
    remap: (hex, opts) => {
      const [h, , l] = rgbToHsl(hex);
      if (glowOf(opts) > 0.25 || l > 0.68 || h <= 48) {
        return toneRamp(hex, 0xa82a1e, 0xf26f2b, 0xffe494, 0.25);
      }
      return toneRamp(hex, 0x241512, 0x5c231a, 0xc4482e);
    },
    ornament: (rig, m, rawPaint, { K, pt }) => {
      try {
        const chestId = rig.id('chest');
        const craterId = rig.id('crater');

        // 胸前赤绶鎏金大铜铃 + 唐式明光双肩兽甲
        m.bone(chestId);
        rawPaint.call(m, 0xa6261b, { c2: 0xd94330, mat: K.cloth });
        m.g(pt(0, 1.04, 1.12, 32, 0, 0), () => m.torus(0.24, 0.032, 0.028, 14, 5, { crease: 26 }));
        rawPaint.call(m, 0xdba53e, { c2: 0xfff0b0, gloss: 0.9, mat: K.metal });
        m.g(pt(0, 0.95, 1.24, 0, 0, 0), () => {
          m.ball(0, 0, 0, 0.135, 0.145, 0.135, 0, 16);
          m.g(pt(0, 0, 0, 90, 0, 0), () => m.torus(0.14, 0.02, 0.018, 16, 5, { crease: 24 }));
          rawPaint.call(m, 0xffd86e, { glow: 0.72, mat: K.crystal, line: 0 });
          m.ball(0, -0.05, 0.095, 0.04, 0.04, 0.04, 0, 12);
        });
        for (const side of [1, -1]) {
          rawPaint.call(m, 0xa83824, { c2: 0xe6a84c, gloss: 0.78, mat: K.metal });
          m.g(pt(side * 0.78, 1.62, 0.44, 10, side * 14, side * -28), () => {
            m.box(0, 0, 0, 0.34, 0.12, 0.44, 0.04);
            rawPaint.call(m, 0xf2b94e, { glow: 0.3, gloss: 0.9, mat: K.metal });
            m.ball(side * 0.06, 0.06, 0.1, 0.09, 0.06, 0.1, 0, 10);
          });
        }

        // 背后唐宫炽金「八焰风火轮」背光（远景一眼区别旧作石头怪！）
        m.bone(craterId);
        rawPaint.call(m, 0xdfa642, { c2: 0xfff2bf, glow: 0.25, gloss: 0.9, mat: K.metal });
        m.g(pt(0, 2.38, -0.22, 90, 0, 0), () => {
          m.torus(0.74, 0.045, 0.04, 22, 5, { crease: 28 });
          rawPaint.call(m, 0xff7828, { c2: 0xffe48c, glow: 0.75, mat: K.crystal, line: 0 });
          for (let i = 0; i < 8; i++) {
            const ang = (i / 8) * Math.PI * 2;
            const deg = (ang * 180) / Math.PI - 90;
            m.g(pt(Math.cos(ang) * 0.78, 0, Math.sin(ang) * 0.78, 0, -deg, -90), () =>
              m.crystal(0.062, i % 2 === 0 ? 0.32 : 0.2, 4, 0.7, 0.18),
            );
          }
        });
      } catch {
        // 安全忽略
      }
    },
  },

  // 5. 千里江山青金应龙：石青/石绿龙鳞 + 织金云翼 + 龙角背鳍翼甲 + 双环护持炽金龙珠
  abyss_drake: {
    remap: (hex, opts) => {
      const [h, s, l] = rgbToHsl(hex);
      if (l > 0.88 && s < 0.25) return 0xf7ecd2;
      if (glowOf(opts) > 0.28) {
        return toneRamp(hex, 0xd49a35, 0xffd873, 0x9cf7e2);
      }
      if (s > 0.28 && (h >= 275 || h <= 45)) {
        return toneRamp(hex, 0x7d5721, 0xc9963f, 0xfae196, 0.2);
      }
      return toneRamp(hex, 0x16424a, 0x2c827e, 0x76decb, 0.25);
    },
    ornament: (rig, m, rawPaint, { K, pt }) => {
      try {
        const headId = rig.id('head');
        const chestId = rig.id('chest');
        const hx = rig.bx(headId);
        const hy = rig.by(headId);
        const hz = rig.bz(headId);

        // 龙首：吻前炽金双环龙珠 + 鎏金分叉唐龙双角
        m.bone(headId);
        const px = hx;
        const py = hy + 0.08;
        const pz = hz + 1.28;
        rawPaint.call(m, 0xffd269, { c2: 0xfff8db, glow: 0.9, gloss: 1, mat: K.crystal, line: 0 });
        m.ball(px, py, pz, 0.185, 0.185, 0.185, 0, 18);
        rawPaint.call(m, 0x78f0dc, { c2: 0xfff5d1, glow: 0.52, gloss: 0.9, mat: K.metal });
        m.g(pt(px, py, pz, 64, 24, 0), () => m.torus(0.28, 0.02, 0.018, 20, 5, { crease: 24 }));
        m.g(pt(px, py, pz, -36, -54, 18), () => m.torus(0.24, 0.015, 0.014, 18, 4, { crease: 24 }));

        for (const side of [1, -1]) {
          rawPaint.call(m, 0xe8bf5f, { c2: 0xfff2c2, gloss: 0.9, mat: K.metal });
          m.g(pt(hx + side * 0.22, hy + 0.34, hz - 0.12, -32, side * 18, side * -18), () => {
            m.crystal(0.055, 0.54, 5, 0.68, 0.18);
            m.g(pt(side * 0.04, 0.24, -0.02, 18, 0, side * -28), () => m.crystal(0.032, 0.26, 4, 0.72, 0.18));
          });
        }

        // 龙脊与翼肩：鎏金青玉脊鳍 + 翼根云纹青铜甲
        m.bone(chestId);
        for (let k = 0; k < 3; k++) {
          rawPaint.call(m, 0xdfa742, { c2: 0xfff0b8, gloss: 0.85, mat: K.metal });
          m.g(pt(0, 2.48 - k * 0.18, 0.9 - k * 0.65, -28, 0, 0), () => {
            m.extrude([[0, 0], [0.05, 0.34], [0, 0.48], [-0.05, 0.24]], 0.06, 0.015);
            rawPaint.call(m, 0x6ef2d6, { glow: 0.55, mat: K.crystal, line: 0 });
            m.ball(0, 0.26, 0, 0.04, 0.08, 0.04, 0, 8);
          });
        }
        for (const side of [1, -1]) {
          const wId = rig.id(`wingA${side}`);
          const wx = rig.bx(wId);
          const wy = rig.by(wId);
          const wz = rig.bz(wId);
          m.bone(wId);
          rawPaint.call(m, 0xc9963e, { c2: 0xfae08e, gloss: 0.88, mat: K.metal });
          m.g(pt(wx + side * 0.12, wy + 0.08, wz + 0.04, 8, side * 18, side * -16), () => {
            m.box(0, 0, 0, 0.44, 0.14, 0.36, 0.04);
          });
        }
      } catch {
        // 安全忽略
      }
    },
  },

  // 6. 镇岳青铜浑天麒麟尊：商周饕餮重肩甲 + 三戟帝玉冠 + 浑天朱金符石环 + 镇岳双拳甲
  star_colossus: {
    exact: {
      16764768: 0xd9a544,
      16773304: 0xffe99c,
      16774348: 0xfff5d4,
      16756800: 0xf7b240,
      16776160: 0xfff7db,
      4475512: 0x2b4a42,
      7897272: 0x528272,
      2566988: 0x1d332e,
      9071178: 0x709986,
    },
    remap: (hex, opts) => {
      const [h, , l] = rgbToHsl(hex);
      if (glowOf(opts) > 0.25 || l > 0.72 || (h >= 25 && h <= 75)) {
        return toneRamp(hex, 0xc7892c, 0xf2c25a, 0xfff5cc, 0.25);
      }
      return toneRamp(hex, 0x1c302b, 0x355c50, 0x6ea18e);
    },
    ornament: (rig, m, rawPaint, { K, pt }) => {
      try {
        const headId = rig.id('head');
        const hx = rig.bx(headId);
        const hy = rig.by(headId);
        const hz = rig.bz(headId);

        // 顶冠鎏金三戟帝玉冠徽
        m.bone(headId);
        const crownY = hy + 0.94;
        rawPaint.call(m, 0xdba544, { c2: 0xfff0b8, gloss: 0.9, mat: K.metal });
        m.g(pt(hx, crownY, hz, 0, 0, 0), () => {
          m.torus(0.28, 0.036, 0.03, 16, 5, { crease: 26 });
          rawPaint.call(m, 0xffda73, { c2: 0xfff9e2, glow: 0.62, mat: K.crystal });
          m.g(pt(0, 0.08, 0.02, 0, 0, 0), () => m.crystal(0.095, 0.42, 4, 0.45, 0.2));
          m.g(pt(0.18, 0.02, 0.01, 0, 0, -24), () => m.crystal(0.062, 0.26, 4, 0.45, 0.2));
          m.g(pt(-0.18, 0.02, 0.01, 0, 0, 24), () => m.crystal(0.062, 0.26, 4, 0.45, 0.2));
        });

        // 商周饕餮青铜飞檐重肩甲
        for (const side of [1, -1]) {
          const shId = rig.id(`shoulder${side}`);
          const sx = rig.bx(shId);
          const sy = rig.by(shId);
          const sz = rig.bz(shId);
          m.bone(shId);
          rawPaint.call(m, 0x2b4a42, { c2: 0x6ea18e, gloss: 0.62, mat: K.metal });
          m.g(pt(sx, sy + 0.34, sz, 0, 0, side * -14), () => {
            m.box(0, 0, 0, 0.86, 0.16, 0.72, 0.04);
            rawPaint.call(m, 0xdba544, { c2: 0xfff0b8, gloss: 0.9, mat: K.metal });
            m.box(0, 0.09, 0, 0.9, 0.05, 0.76, 0.02);
            rawPaint.call(m, 0xe8482e, { c2: 0xffd27a, glow: 0.65, mat: K.crystal, line: 0 });
            m.ball(side * 0.24, 0.14, 0.2, 0.09, 0.09, 0.09, 0, 12);
          });

          // 镇岳巨拳鎏金护指腕轮
          const fId = rig.id(`fist${side}`);
          const fx = rig.bx(fId);
          const fy = rig.by(fId);
          const fz = rig.bz(fId);
          m.bone(fId);
          rawPaint.call(m, 0xd9a544, { c2: 0xfff2c2, gloss: 0.9, mat: K.metal });
          m.g(pt(fx, fy + 0.32, fz, 0, 0, 0), () => m.torus(0.68, 0.055, 0.045, 16, 5, { crease: 26 }));
        }

        // 浑天环镶嵌四枚炽金朱玉符简
        for (const rIdx of [0, 1]) {
          const rId = rig.id(`ring${rIdx}`);
          const rx = rig.bx(rId);
          const ry = rig.by(rId);
          const rz = rig.bz(rId);
          m.bone(rId);
          rawPaint.call(m, 0xffe288, { c2: 0xfff9e2, glow: 0.65, mat: K.crystal, line: 0 });
          const rad = rIdx === 0 ? 1.55 : 1.25;
          for (let q = 0; q < 2; q++) {
            const ang = rIdx * 0.9 + q * Math.PI;
            m.g(pt(rx + Math.cos(ang) * rad, ry + Math.sin(ang) * rad, rz, 0, 0, (ang * 180) / Math.PI), () =>
              m.box(0, 0, 0, 0.16, 0.34, 0.12, 0.02),
            );
          }
        }
      } catch {
        // 安全忽略
      }
    },
  },
};

export function createTangSongMonsters(api: MonsterEngineApi) {
  const { Wa, Ls, origMonsters } = api;

  const buildTangSongVariant = (kind: MonsterKind): (() => MonsterDef) => {
    const baseBuilder = origMonsters?.[kind];
    if (!baseBuilder) {
      throw new Error(`[tangsongMonsters3D] 缺少原作野怪构造器: ${kind}`);
    }
    const spec = PALETTES[kind];

    return () => {
      const capturedRigs: MonsterRig[] = [];
      const OrigWaAdd = Wa.prototype.add;
      const OrigPaint = Ls.prototype.paint;
      const OrigBuild = Ls.prototype.build;
      const OrigSheet = Ls.prototype.sheet;
      let ornamentApplied = false;

      Wa.prototype.add = function patchedWaAdd(
        this: MonsterRig,
        name: string,
        parent: number,
        x: number,
        y: number,
        z: number,
      ) {
        if (!capturedRigs.includes(this)) capturedRigs.push(this);
        return OrigWaAdd.call(this, name, parent, x, y, z);
      };

      Ls.prototype.paint = function patchedPaint(
        this: MonsterMeshBuilder,
        hex: number,
        opts?: Record<string, unknown>,
      ) {
        const mappedHex = spec.exact?.[hex] ?? spec.remap(hex, opts);
        let mappedOpts = opts;
        if (opts && opts.c2 !== undefined) {
          const c2Num = Number(opts.c2);
          mappedOpts = {
            ...opts,
            c2: spec.exact?.[c2Num] ?? spec.remap(c2Num, opts),
          };
        }
        return OrigPaint.call(this, mappedHex, mappedOpts);
      };

      Ls.prototype.build = function patchedBuild(this: MonsterMeshBuilder) {
        if (!ornamentApplied && spec.ornament && capturedRigs.length > 0) {
          ornamentApplied = true;
          spec.ornament(capturedRigs[0], this, OrigPaint, api);
        }
        return OrigBuild.call(this);
      };

      if (kind === 'glimwing' || kind === 'abyss_drake') {
        Ls.prototype.sheet = function patchedWingSheet(
          this: MonsterMeshBuilder,
          nu: number,
          nv: number,
          point: (u: number, v: number) => number[],
          doubleSided?: boolean,
          crease?: number,
        ) {
          const bone = capturedRigs[0]?.names[this.boneId] ?? '';
          const birdWing = kind === 'glimwing' && (bone.startsWith('fw') || bone.startsWith('hw'));
          const dragonWing = kind === 'abyss_drake' && nu === 5 && nv === 4;
          if (!birdWing && !dragonWing) return OrigSheet.call(this, nu, nv, point, doubleSided, crease);

          return OrigSheet.call(
            this,
            8,
            4,
            (u, v) => {
              const trailingEdge = birdWing
                ? v * (1 - 0.045 * Math.sin(Math.PI * u) ** 2 * Math.sin(6 * Math.PI * u) ** 2)
                : v;
              const p = point(u, trailingEdge);
              const left = point(Math.max(0, u - 0.001), trailingEdge);
              const right = point(Math.min(1, u + 0.001), trailingEdge);
              const near = point(u, Math.max(0, trailingEdge - 0.001));
              const far = point(u, Math.min(1, trailingEdge + 0.001));
              const along = right.map((x, i) => x - left[i]);
              const across = far.map((x, i) => x - near[i]);
              const normal = [
                along[1] * across[2] - along[2] * across[1],
                along[2] * across[0] - along[0] * across[2],
                along[0] * across[1] - along[1] * across[0],
              ];
              const length = Math.hypot(...normal) || 1;
              const fold =
                (birdWing ? 0.045 : 0.08) *
                Math.sin(Math.PI * u) *
                Math.sin(Math.PI * v) *
                (0.8 + 0.2 * Math.cos(2 * Math.PI * u + v));
              return p.map((x, i) => x + (normal[i] / length) * fold);
            },
            doubleSided,
            crease,
          );
        };
      }

      try {
        return baseBuilder();
      } finally {
        Wa.prototype.add = OrigWaAdd;
        Ls.prototype.paint = OrigPaint;
        Ls.prototype.build = OrigBuild;
        Ls.prototype.sheet = OrigSheet;
      }
    };
  };

  return {
    mossback: buildTangSongVariant('mossback'),
    glimwing: buildTangSongVariant('glimwing'),
    frost_golem: buildTangSongVariant('frost_golem'),
    ember_golem: buildTangSongVariant('ember_golem'),
    abyss_drake: buildTangSongVariant('abyss_drake'),
    star_colossus: buildTangSongVariant('star_colossus'),
  };
}
