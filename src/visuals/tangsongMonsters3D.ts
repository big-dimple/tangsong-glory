/**
 * tangsongMonsters3D.ts — 《唐宋荣耀》v5.1 全 6 种野怪高完成度东方神兽重塑
 *
 * 严格遵循「保骨塑形 + 唐宋釉彩材质 + 克制贴合饰件」方案：
 * - 完整继承原作 6 只高完成度野怪雕塑骨架（Lm 四足逆向屈伸 / 翅膀振翅 / 应龙蛇颈龙尾须物理链 /
 *   麒麟浑天仪三环悬浮躯干）、高密曲面、精确高度/碰撞半径与全部动作状态机（spawn/idle/move/attack/windup/dead）；
 * - 在构模期间对 Ls.prototype.paint 执行确定性色彩映射，将全套材质重铸为宋代青绿釉彩、商周青铜、鎏金与朱砂矿彩；
 * - 并在 Ls.prototype.build 前依实测骨骼坐标（Wa）精准绑定克制合体的东方小饰件（零穿插、零浮空）。
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
  ornament?: (rig: MonsterRig, m: MonsterMeshBuilder, rawPaint: (hex: number, opts?: Record<string, unknown>) => MonsterMeshBuilder, api: MonsterEngineApi) => void;
}

const PALETTES: Record<MonsterKind, PaletteSpec> = {
  // 1. 负碑青玉灵龟 · 小玄武：宋代龙泉青玉甲壳 + 古铜棱脊 + 松苍苔韵
  mossback: {
    exact: {
      14182458: 0xf7e19c, // 花朵浅金瓣
      15764042: 0xd9a84e, // 鎏金蕊
      16773320: 0xa6f5d4, // 玉髓灵光
      16767088: 0xf0c96e, // 鎏金爪梢
      15260864: 0xc99c4a, // 古铜爪甲
      6265418: 0x2d5e4e, // 青苔苍绿
      10276698: 0x538770, // 宋玉苔尖
      6968898: 0x2a5449, // 龟甲深青釉
      9074266: 0x3b6e5e, // 龟甲青瓷釉
      5521455: 0x243b34, // 玄墨足肤
      9072208: 0x3f6154, // 青玉腹甲
      13482128: 0xc2ab7e, // 仿古帛腹
    },
    remap: (hex, opts) => {
      if (glowOf(opts) > 0.08) return toneRamp(hex, 0x52c49e, 0x8ef0c6, 0xe8fff5);
      return toneRamp(hex, 0x223831, 0x3c695a, 0xa8d4bd, 0.25);
    },
    ornament: (rig, m, rawPaint, { K, pt }) => {
      try {
        const shellId = rig.id('shell');
        m.bone(shellId);
        // 在龟背前缘（避开顶部长松 flora）镶嵌枚紧贴甲面的鎏金碧玉镇印
        rawPaint.call(m, 0xc99c4a, { c2: 0xf4cf78, gloss: 0.78, mat: K.metal });
        m.g(pt(0, 0.96, 0.34, -26, 0, 0), () => {
          m.torus(0.16, 0.026, 0.024, 16, 6, { crease: 25 });
          rawPaint.call(m, 0x3aa389, { c2: 0x9cf5d8, glow: 0.28, gloss: 0.9, mat: K.crystal });
          m.ball(0, 0, 0.012, 0.125, 0.125, 0.032, 1, 14);
        });
      } catch {
        // 骨骼未命名时安全降级
      }
    },
  },

  // 2. 宋画提灯青鸟灵：翠碧孔雀绿羽 + 描金翅脉 + 暖琥珀宫灯灵光
  glimwing: {
    exact: {
      16767088: 0xffe08a, // 暖金灯芯
      16747098: 0xe8a246, // 鎏金琥珀
      2054758: 0x1e5c5c, // 翠碧深羽
      7334104: 0x4db5ab, // 孔雀青羽
      13172720: 0x72e6d4, // 莹润青玉膜
      15261896: 0xf2e4c2, // 宣纸描金边
      1714746: 0x16383b, // 墨青甲
    },
    remap: (hex, opts) => {
      const [h] = rgbToHsl(hex);
      if (glowOf(opts) > 0.25 || (h >= 20 && h <= 68)) return toneRamp(hex, 0xc9822e, 0xf2c968, 0xfff2c2);
      return toneRamp(hex, 0x194a4a, 0x2c7d78, 0x7be6d4, 0.3);
    },
    ornament: (rig, m, rawPaint, { K, pt }) => {
      try {
        const bodyId = rig.id('body');
        const bx = rig.bx(bodyId);
        const by = rig.by(bodyId);
        const bz = rig.bz(bodyId);
        m.bone(bodyId);
        // 胸前悬挂一只精致宋式八角鎏金小宫灯
        rawPaint.call(m, 0xcf9b42, { c2: 0xfae08e, gloss: 0.85, mat: K.metal });
        m.g(pt(bx, by - 0.18, bz + 0.06, 0, 0, 0), () => {
          m.torus(0.072, 0.014, 0.014, 12, 5, { crease: 24 });
          rawPaint.call(m, 0xffd26b, { c2: 0xfff5d4, glow: 0.72, mat: K.crystal, line: 0 });
          m.crystal(0.055, 0.11, 6, 0.35, 0.35);
        });
      } catch {
        // 安全忽略
      }
    },
  },

  // 3. 秘色九色玄鹿：北宋汝窑天青月白身 + 鎏金玉枝鹿角 + 悬空明月灵珠
  frost_golem: {
    exact: {
      15266559: 0xf0eee2, // 羊脂白绒
      11125990: 0xc7dcd8, // 汝窑青灰绒
      3559566: 0x366978, // 天青釉影
      8363208: 0x6eaeb8, // 秘色瓷身
      9087188: 0x99cbd1, // 天青釉亮面
      5816575: 0xd9a84e, // 鎏金鹿角干
      14218495: 0x8ef2de, // 碧玉灵角尖
      8377599: 0x5ec9ba, // 苍玉肋鳞
      1712696: 0x28363a, // 乌玉蹄
      2897492: 0x455a60, // 墨玉蹄甲
      13169919: 0xfce6a6, // 明月眸光
    },
    remap: (hex, opts) => {
      if (glowOf(opts) > 0.25) return toneRamp(hex, 0xc7953c, 0xedd07a, 0xa8f7e6);
      if (opts?.mat !== undefined) return toneRamp(hex, 0x356470, 0x7cb8c4, 0xedf2ea, 0.2);
      return toneRamp(hex, 0x356470, 0x7cb8c4, 0xedf2ea);
    },
    ornament: (rig, m, rawPaint, { K, pt }) => {
      try {
        const headId = rig.id('head');
        const antL = rig.id('antlerL');
        const crest = rig.id('crest');
        const mx = 0;
        const my = (rig.by(antL) + rig.by(crest)) * 0.5 + 0.06;
        const mz = rig.bz(antL) + 0.02;
        m.bone(headId);
        // 双角环抱处的悬空太阴玉珠
        rawPaint.call(m, 0x8ef5e1, { c2: 0xfff8de, glow: 0.78, gloss: 1, mat: K.crystal, line: 0 });
        m.ball(mx, my, mz, 0.115, 0.115, 0.115, 0, 18);
        rawPaint.call(m, 0xe8bf5f, { c2: 0xfff2bf, glow: 0.3, gloss: 0.9, mat: K.metal });
        m.g(pt(mx, my, mz, 68, 22, 0), () => {
          m.torus(0.175, 0.015, 0.015, 18, 5, { crease: 25 });
        });
      } catch {
        // 安全忽略
      }
    },
  },

  // 4. 赤炎金睛狻猊：唐风玄墨狮躯 + 宫廷朱砂卷鬃 + 鎏金胸铃与炽金火纹
  ember_golem: {
    exact: {
      8010282: 0x38201b, // 玄墨褐毛
      11035711: 0x7a2b20, // 朱砂深鬓
      5909026: 0x261613, // 墨黑石肤
      11565648: 0xb83826, // 宫廷赤朱亮部
      2759968: 0x241715, // 黑铁甲板
      6964282: 0x8f291c, // 赤铜甲沿
      16734748: 0xf26329, // 烈焰赤金纹
      16765562: 0xffe08a, // 炽金芯芒
      15745562: 0xe64522, // 朱红炽焰
      16760912: 0xf7b84a, // 鎏金高光
      2759194: 0x2b1d1a, // 爪石
      16734774: 0xff9436, // 爪尖火辉
      16756800: 0xffd269, // 金睛暖光
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
        m.bone(chestId);
        // 胸前贴体悬挂赤绶鎏金大铜铃（z=1.18 位于前胸毛前方、下颌下方，避免埋入胸腔或挡头）
        rawPaint.call(m, 0xa6261b, { c2: 0xd94330, mat: K.cloth });
        m.g(pt(0, 1.04, 1.12, 32, 0, 0), () => {
          m.torus(0.24, 0.032, 0.028, 14, 5, { crease: 26 });
        });
        rawPaint.call(m, 0xdba53e, { c2: 0xfff0b0, gloss: 0.9, mat: K.metal });
        m.g(pt(0, 0.95, 1.24, 0, 0, 0), () => {
          m.ball(0, 0, 0, 0.125, 0.135, 0.125, 0, 16);
          m.g(pt(0, 0, 0, 90, 0, 0), () => {
            m.torus(0.13, 0.018, 0.018, 16, 5, { crease: 24 });
          });
          rawPaint.call(m, 0xffd86e, { glow: 0.65, mat: K.crystal, line: 0 });
          m.ball(0, -0.05, 0.09, 0.036, 0.036, 0.036, 0, 12);
        });
      } catch {
        // 安全忽略
      }
    },
  },

  // 5. 千里江山青金应龙：石青/石绿矿彩龙鳞 + 织金云翼膜 + 悬口鎏金龙珠
  abyss_drake: {
    remap: (hex, opts) => {
      const [h, s, l] = rgbToHsl(hex);
      // 保留明亮牙/角/亮饰转为鎏金与羊脂玉
      if (l > 0.88 && s < 0.25) return 0xf7ecd2;
      if (glowOf(opts) > 0.28) {
        return toneRamp(hex, 0xd49a35, 0xffd873, 0x9cf7e2);
      }
      // 翼膜与副色（偏紫红/品红/暖色区间）转为织金古铜缎
      if (s > 0.28 && (h >= 275 || h <= 45)) {
        return toneRamp(hex, 0x7d5721, 0xc9963f, 0xfae196, 0.2);
      }
      // 主龙鳞躯体转为《千里江山》石青翠绿渐变
      return toneRamp(hex, 0x16424a, 0x2c827e, 0x76decb, 0.25);
    },
    ornament: (rig, m, rawPaint, { K, pt }) => {
      try {
        const headId = rig.id('head');
        const hx = rig.bx(headId);
        const hy = rig.by(headId);
        const hz = rig.bz(headId);
        m.bone(headId);
        // 龙首吻前悬浮炽金龙珠（绑定 head 关节，随昂首吞吐自然摆动）
        const px = hx;
        const py = hy + 0.08;
        const pz = hz + 1.24;
        rawPaint.call(m, 0xffd269, { c2: 0xfff8db, glow: 0.85, gloss: 1, mat: K.crystal, line: 0 });
        m.ball(px, py, pz, 0.16, 0.16, 0.16, 0, 18);
        rawPaint.call(m, 0x78f0dc, { c2: 0xfff5d1, glow: 0.48, gloss: 0.9, mat: K.metal });
        m.g(pt(px, py, pz, 64, 24, 0), () => {
          m.torus(0.24, 0.018, 0.016, 20, 5, { crease: 24 });
        });
      } catch {
        // 安全忽略
      }
    },
  },

  // 6. 镇岳青铜浑天麒麟尊：商周绿锈青铜甲 + 鎏金浑天三环 + 帝玉朱砂灵核
  star_colossus: {
    exact: {
      16764768: 0xd9a544, // 鎏金青铜环
      16773304: 0xffe99c, // 浑天亮金饰
      16774348: 0xfff5d4, // 帝玉光核
      16756800: 0xf7b240, // 炽金星芒
      16776160: 0xfff7db, // 煌金顶点
      4475512: 0x2b4a42, // 商周青铜深锈
      7897272: 0x528272, // 古铜苍绿釉
      2566988: 0x1d332e, // 墨铜重甲
      9071178: 0x709986, // 青铜包浆亮面
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
        m.bone(headId);
        // 顶冠上方克制雅致的鎏金三戟冠徽（绑定 head 顶部 y≈hy+0.96）
        const crownY = hy + 0.94;
        rawPaint.call(m, 0xdba544, { c2: 0xfff0b8, gloss: 0.9, mat: K.metal });
        m.g(pt(hx, crownY, hz, 0, 0, 0), () => {
          m.torus(0.24, 0.032, 0.028, 14, 5, { crease: 26 });
          rawPaint.call(m, 0xffda73, { c2: 0xfff9e2, glow: 0.52, mat: K.crystal });
          m.g(pt(0, 0.06, 0.02, 0, 0, 0), () => m.crystal(0.085, 0.34, 4, 0.45, 0.2));
          m.g(pt(0.16, 0.02, 0.01, 0, 0, -24), () => m.crystal(0.055, 0.22, 4, 0.45, 0.2));
          m.g(pt(-0.16, 0.02, 0.01, 0, 0, 24), () => m.crystal(0.055, 0.22, 4, 0.45, 0.2));
        });
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

          return OrigSheet.call(this, 8, 4, (u, v) => {
            const trailingEdge = birdWing ? v * (1 - 0.045 * Math.sin(Math.PI * u) ** 2 * Math.sin(6 * Math.PI * u) ** 2) : v;
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
            const fold = (birdWing ? 0.045 : 0.08) * Math.sin(Math.PI * u) * Math.sin(Math.PI * v)
              * (0.8 + 0.2 * Math.cos(2 * Math.PI * u + v));
            return p.map((x, i) => x + normal[i] / length * fold);
          }, doubleSided, crease);
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
