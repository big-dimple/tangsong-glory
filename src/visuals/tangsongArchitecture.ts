/**
 * tangsongArchitecture.ts — 彻头彻尾的唐宋建筑 3D 模型工坊
 *
 * 1. buildTower(api, tier, team): 替换原版科幻石晶塔 Ec(tier, team)
 *    - 八角汉白玉/玄墨须弥座台基 + 四角唐宋小石灯笼
 *    - 朱漆/玄木重柱殿身 + 1/2/3 层宽大翘角飞檐琉璃瓦屋顶（蓝方盛唐青玉琉璃、红方赤壁朱丹琉璃）
 *    - 顶悬鎏金龙珠火球、旋转祥云法环与高耸宝葫芦塔刹；三层高地塔自带唐宋战幡
 *    - 100% 保留原有 rig 骨骼名 (root/lower/upper/core/ring0..n-1/tip/alert/chunk0..3/crack0..2/flag) 与 anim 合约
 * 2. buildCore(api, team): 替换原版科幻晶体核心 Yw(team)
 *    - 三层圜丘玉坛 + 四隅唐宋朱漆盘龙华表柱（含云板与宫灯顶珠）
 *    - 悬浮六棱传国玉玺金核 + 双层交错苏颂浑天仪鎏金铜环 + 七曜玉圭浮符
 *    - 100% 保留原有 rig 骨骼名与碎裂/坍塌演出
 * 3. buildRuin(api, team): 替换原版废墟 Xw(team)
 *    - 焦黑石台、折断朱漆殿柱残桩、碎裂琉璃瓦与余烬斜旗
 */

export interface ArchApi {
  Wa: new () => {
    add(name: string, parent: number, x: number, y: number, z: number): number;
  };
  Ls: new () => LsLike;
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
  bt: (a: number, b: number, t: number) => number;
  Ct: (x: number, a: number, b: number) => number;
  Xe: (t: number, center: number, width: number) => number;
  Kn: (x: number) => number;
  Ux: (hex: number, k: number) => number;
  K: Record<string, number>;
  En: Record<string, number>;
  $x: {
    stone: number;
    stoneDark: number;
    stoneLight: number;
    trim: number;
    crystal: number;
    crystalMid: number;
    crystalHot: number;
    glowK: number;
    spiky: boolean;
  }[];
  rs: (n: number, s: number) => number;
  qi: Record<string, unknown>;
  xa: Record<string, unknown>;
  ao: Record<string, unknown>;
  jc: number;
}

export interface LsLike {
  crease: number;
  rough: number;
  triangleCount: number;
  paint(hex: number, opts?: Record<string, unknown>): LsLike;
  bone(id: number): LsLike;
  g(m: unknown, fn: () => void): LsLike;
  lathe(pts: number[][], opts?: Record<string, unknown>): LsLike;
  tube(pts: number[][], opts?: Record<string, unknown>): LsLike;
  box(x: number, y: number, z: number, w: number, h: number, d: number, bevel?: number): LsLike;
  ball(x: number, y: number, z: number, rx: number, ry: number, rz: number, flat?: number, deg?: number): LsLike;
  crystal(r: number, h: number, seg?: number, mid?: number, bias?: number, flat?: number): LsLike;
  extrude(poly: number[][], depth: number, bevel?: number): LsLike;
  torus(r: number, r1: number, r2?: number, seg?: number, tseg?: number, opts?: Record<string, unknown>): LsLike;
  limb(p0: number[], p1: number[], r0: number, r1: number, opts?: Record<string, unknown>): LsLike;
  sheet(nu: number, nv: number, fn: (u: number, v: number) => number[], flip?: boolean, crease?: number): LsLike;
  sym(fn: (side: number) => void): LsLike;
  bakeGrounding(h: number, a?: number, b?: number): void;
  build(): unknown;
}

interface TangSongArchTheme {
  stone: number;
  stoneDark: number;
  stoneLight: number;
  wood: number;
  woodDark: number;
  tile: number;
  tileDark: number;
  tileHi: number;
  gold: number;
  goldDark: number;
  glow: number;
  glowHot: number;
  banner: number;
}

const ARCH_THEMES: [TangSongArchTheme, TangSongArchTheme] = [
  {
    // 蓝方：盛唐青靛琉璃瓦 × 汉白玉须弥座 × 朱漆廊柱 × 御金缀饰
    stone: 0xd0c6b2,
    stoneDark: 0x7a7060,
    stoneLight: 0xe6decb,
    wood: 0x7d231a,
    woodDark: 0x45120e,
    tile: 0x27455e,
    tileDark: 0x152838,
    tileHi: 0x4f7fa3,
    gold: 0xe8ba54,
    goldDark: 0x9e6c1e,
    glow: 0x5ba6d9,
    glowHot: 0xd9f0ff,
    banner: 0x255680,
  },
  {
    // 红方：赤壁朱丹琉璃 × 玄墨玉石 × 紫檀廊柱 × 古铜赤金
    stone: 0x574841,
    stoneDark: 0x2c221e,
    stoneLight: 0x857066,
    wood: 0x3b1412,
    woodDark: 0x1e0908,
    tile: 0x9c231a,
    tileDark: 0x54110d,
    tileHi: 0xd64133,
    gold: 0xe2a846,
    goldDark: 0x875617,
    glow: 0xff5a3c,
    glowHot: 0xffc699,
    banner: 0xc9352a,
  },
];

/** 绘制一层方形攒尖反宇曲面飞檐唐宋大屋顶（四角严格对准 45° 垂脊） */
function buildCurvedPagodaRoof(
  m: LsLike,
  api: ArchApi,
  th: TangSongArchTheme,
  yBase: number,
  radiusOuter: number,
  radiusTop: number,
  height: number,
  withCorners = true,
) {
  const { pt, K, En, xa, Ux } = api;
  const tileMat = { c2: th.tileHi, gloss: 0.55, mat: K.rock, pattern: En.weave, patternScale: 8, patternAmt: 0.25 };
  const eaveDark = { c2: th.wood, mat: K.leather, gloss: 0.25 };
  const sqOuter = radiusOuter * 1.28;
  const sqTop = radiusTop * 1.28;

  // 下缘椽木枋斗拱暗衬
  m.paint(th.woodDark, eaveDark);
  m.lathe(
    [
      [yBase - 0.14, sqOuter * 0.72],
      [yBase - 0.04, sqOuter * 0.88],
      [yBase + 0.02, sqOuter * 0.96],
    ],
    { seg: 4, phase: 45, crease: 26, cap1: false },
  );

  // 凹曲琉璃瓦方檐坡顶（seg=4, phase=45 令屋脊角精准落在 45°/135°/225°/315°）
  m.paint(th.tileDark, tileMat);
  m.lathe(
    [
      [yBase + 0.02, sqOuter * 1.02],
      [yBase + 0.09, sqOuter * 0.94],
      [yBase + height * 0.36, sqOuter * 0.66],
      [yBase + height * 0.72, sqTop * 1.16],
      [yBase + height, sqTop],
    ],
    { seg: 4, phase: 45, crease: 26, cap0: false },
  );

  // 金边檐口
  m.paint(th.gold, { c2: th.goldDark, ...xa });
  m.lathe(
    [
      [yBase - 0.01, sqOuter * 1.04],
      [yBase + 0.05, sqOuter * 1.03],
    ],
    { seg: 4, phase: 45, cap0: false, cap1: false },
  );

  if (!withCorners) return;

  // 四向翘角垂脊与戗脊吻兽（严格沿方形屋顶四角 45° 对角线外挑上扬）
  for (let i = 0; i < 4; i++) {
    const ang = (i * Math.PI) / 2 + Math.PI / 4;
    const degY = -(ang * 180) / Math.PI + 90;
    m.g(pt(0, yBase, 0, 0, degY, 0), () => {
      m.paint(th.gold, { c2: Ux(th.gold, 0.8), ...xa });
      const rIn = sqTop * 0.96;
      const rMid = sqOuter * 0.68;
      const rTip = sqOuter * 1.16;
      m.tube(
        [
          [0, height * 0.96, rIn, 0.06, 0.08],
          [0, height * 0.36, rMid, 0.075, 0.09],
          [0, 0.06, sqOuter * 0.99, 0.085, 0.11],
          [0, 0.3, rTip, 0.055, 0.08],
          [0, 0.48, rTip + 0.14, 0.015, 0.02],
        ],
        { seg: 5, up: [1, 0, 0], crease: 28 },
      );
      // 檐角悬暖红宫灯金饰（暖琥珀烛火芯，取代电光蓝珠）
      m.paint(0x9e2218, { c2: th.gold, ...xa });
      m.ball(0, -0.02, sqOuter * 1.04, 0.065, 0.04, 0.065, 0);
      m.paint(0xffb94a, { c2: 0xffe49c, glow: 0.68, mat: K.crystal, line: 0 });
      m.ball(0, -0.09, sqOuter * 1.04, 0.062, 0.085, 0.062, 0);
    });
  }
}

function buildTower(api: ArchApi, tier: number, team: number) {
  const th = ARCH_THEMES[team] ?? ARCH_THEMES[0];
  const { Wa, Ls, pt, bt, Ct, Xe, K, qi, xa, ao, jc } = api;

  const rig = new Wa();
  const root = rig.add('root', -1, 0, 0, 0);
  const scaleW = tier === 3 ? 1.16 : tier === 2 ? 1.06 : 1.0;
  const hLowerRoof = 2.35;
  const hUpperRoof = tier >= 2 ? 3.85 : 3.4;
  const hTopCrown = hUpperRoof + (tier === 3 ? 1.55 : tier === 2 ? 1.25 : 0.9);
  const coreY = hTopCrown + 1.05;

  const lower = rig.add('lower', root, 0, 0.4, 0);
  const upper = rig.add('upper', lower, 0, hLowerRoof, 0);
  const core = rig.add('core', root, 0, coreY, 0);
  const rings = Array.from({ length: tier }, (_, idx) =>
    rig.add(`ring${idx}`, root, 0, coreY - 0.1 + idx * 0.18, 0),
  );
  const tip = rig.add('tip', root, 0, coreY + 1.15, 0);
  const alert = rig.add('alert', tip, 0, coreY + 1.65, 0);
  const chunks = [0, 1, 2, 3].map((idx) =>
    rig.add(`chunk${idx}`, idx < 2 ? lower : upper, 0, idx < 2 ? 1.45 : 3.05, 0),
  );
  const cracks = [0, 1, 2].map((idx) =>
    rig.add(`crack${idx}`, idx === 0 ? upper : lower, 0, idx === 0 ? 3.1 : 1.4, 0),
  );
  const flag = tier === 3 ? rig.add('flag', upper, 0, hTopCrown - 0.25, 0) : -1;

  const m = new Ls();
  m.crease = 30;

  // ── 1. 八角须弥座基台 + 四角小石灯笼 (root) ──
  m.bone(root);
  m.paint(th.stoneDark, { c2: th.stone, ...qi });
  m.lathe(
    [
      [0, 1.72 * scaleW],
      [0.2, 1.72 * scaleW],
      [0.26, 1.48 * scaleW],
      [0.42, 1.46 * scaleW],
      [0.48, 1.58 * scaleW],
      [0.58, 1.56 * scaleW],
    ],
    { seg: 8, phase: 22.5, crease: 30 },
  );
  m.paint(th.gold, { c2: th.goldDark, ...xa });
  m.lathe(
    [
      [0.2, 1.75 * scaleW],
      [0.25, 1.75 * scaleW],
    ],
    { seg: 8, phase: 22.5, cap0: false, cap1: false },
  );
  m.lathe(
    [
      [0.54, 1.61 * scaleW],
      [0.6, 1.61 * scaleW],
    ],
    { seg: 8, phase: 22.5, cap0: false, cap1: false },
  );

  // 四隅石灯笼台柱
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const dist = 1.46 * scaleW;
    const lx = Math.cos(a) * dist;
    const lz = Math.sin(a) * dist;
    m.paint(th.stoneDark, { c2: th.stone, ...qi });
    m.lathe(
      [
        [0.18, 0.14, 0.14, lx, lz],
        [0.62, 0.1, 0.1, lx, lz],
        [0.68, 0.15, 0.15, lx, lz],
      ],
      { seg: 6 },
    );
    m.paint(th.glow, { c2: th.glowHot, glow: 0.72, mat: K.crystal, line: 0 });
    m.box(lx, 0.78, lz, 0.16, 0.16, 0.16, 0.02);
    m.paint(th.tile, { c2: th.gold, mat: K.rock });
    m.g(pt(lx, 0.9, lz, 0, 45, 0), () =>
      m.lathe(
        [
          [0, 0.21],
          [0.08, 0.12],
          [0.14, 0.02],
        ],
        { seg: 4, phase: 45 },
      ),
    );
  }

  // ── 2. 首层朱漆阁楼与重柱斗拱 (lower) ──
  m.bone(lower);
  // 内殿漆木墙芯
  m.paint(th.woodDark, { c2: th.wood, mat: K.leather, gloss: 0.35 });
  m.lathe(
    [
      [0.56, 1.02 * scaleW],
      [0.75, 0.9 * scaleW],
      [2.15, 0.84 * scaleW],
      [2.32, 0.94 * scaleW],
    ],
    { seg: 8, phase: 22.5, cap0: false, cap1: false },
  );
  // 四根外围 朱漆承重圆柱 + 金柱础
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const px = Math.cos(a) * 1.02 * scaleW;
    const pz = Math.sin(a) * 1.02 * scaleW;
    m.paint(th.gold, { c2: th.goldDark, ...xa });
    m.lathe(
      [
        [0.56, 0.16, 0.16, px, pz],
        [0.66, 0.13, 0.13, px, pz],
      ],
      { seg: 8 },
    );
    m.paint(th.wood, { c2: th.woodDark, mat: K.leather, gloss: 0.45 });
    m.lathe(
      [
        [0.66, 0.11, 0.11, px, pz],
        [2.28, 0.1, 0.1, px, pz],
      ],
      { seg: 8, cap0: false },
    );
  }
  // 首层四面暖光朱金镂空宫格窗
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    m.paint(0xf5a638, { c2: 0xffe3a3, glow: 0.42, mat: K.crystal, line: 0 });
    m.g(pt(Math.cos(a) * 0.9 * scaleW, 1.45, Math.sin(a) * 0.9 * scaleW, 0, -(a * 180) / Math.PI + 90, 0), () => {
      m.box(0, 0, 0, 0.34, 0.78, 0.08, 0.02);
      m.paint(th.gold, { c2: th.goldDark, ...xa });
      m.box(0, 0.44, 0.02, 0.42, 0.08, 0.1, 0.02);
      m.box(0, -0.44, 0.02, 0.42, 0.08, 0.1, 0.02);
      m.box(0, 0.04, 0.03, 0.06, 0.72, 0.06, 0.01);
      m.box(0, 0.04, 0.03, 0.34, 0.06, 0.06, 0.01);
    });
  }
  // 首层宽广翘角飞檐屋顶
  buildCurvedPagodaRoof(m, api, th, hLowerRoof - 0.05, 1.56 * scaleW, 0.92 * scaleW, 0.65, true);

  // ── 3. 二层/三层重檐楼阁 (upper) ──
  m.bone(upper);
  // 二层围栏平台与楼身
  m.paint(th.stone, { c2: th.stoneLight, ...qi });
  m.lathe(
    [
      [hLowerRoof + 0.52, 0.88 * scaleW],
      [hLowerRoof + 0.68, 0.92 * scaleW],
    ],
    { seg: 8, phase: 22.5 },
  );
  m.paint(th.woodDark, { c2: th.wood, mat: K.leather, gloss: 0.35 });
  m.lathe(
    [
      [hLowerRoof + 0.66, 0.72 * scaleW],
      [hUpperRoof + 0.12, 0.66 * scaleW],
    ],
    { seg: 8, phase: 22.5, cap0: false },
  );
  // 四面暖金宫灯镂窗
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    m.paint(0xf5a638, { c2: 0xffe3a3, glow: 0.46, mat: K.crystal, line: 0 });
    m.g(
      pt(
        Math.cos(a) * 0.7 * scaleW,
        (hLowerRoof + 0.68 + hUpperRoof) * 0.5,
        Math.sin(a) * 0.7 * scaleW,
        0,
        -(a * 180) / Math.PI + 90,
        0,
      ),
      () => {
        m.box(0, 0, 0, 0.24, 0.52, 0.07, 0.02);
        m.paint(th.gold, { c2: th.goldDark, ...xa });
        m.box(0, 0.28, 0.02, 0.3, 0.06, 0.08, 0.01);
        m.box(0, -0.28, 0.02, 0.3, 0.06, 0.08, 0.01);
      },
    );
  }
  // 二层飞檐屋顶
  buildCurvedPagodaRoof(m, api, th, hUpperRoof, 1.38 * scaleW, 0.68 * scaleW, 0.72, true);

  // 若为 2 塔/3 塔：加筑最高第三层重檐箭亭或承露顶阁！
  if (tier >= 2) {
    m.paint(th.wood, { c2: th.woodDark, mat: K.leather });
    m.lathe(
      [
        [hUpperRoof + 0.66, 0.56 * scaleW],
        [hTopCrown - 0.18, 0.5 * scaleW],
      ],
      { seg: 8, phase: 22.5 },
    );
    buildCurvedPagodaRoof(
      m,
      api,
      th,
      hTopCrown - 0.22,
      tier === 3 ? 1.18 * scaleW : 1.02 * scaleW,
      0.34,
      0.74,
      tier === 3,
    );
  }

  // ── 4. 墙体残砖崩裂块 (chunks) & 破损裂纹 (cracks) ──
  chunks.forEach((boneId, idx) => {
    const a = (idx * Math.PI) / 2 + Math.PI / 4;
    const cy = idx < 2 ? 1.1 + idx * 0.55 : hLowerRoof + 0.8 + (idx - 2) * 0.45;
    m.bone(boneId).paint(th.stone, { c2: th.gold, ...qi });
    m.g(pt(Math.cos(a) * 0.96, cy, Math.sin(a) * 0.96, 0, 90 - (a * 180) / Math.PI, 0), () =>
      m.box(0, 0, 0, 0.36 * scaleW, 0.44, 0.14, 0.04),
    );
  });
  cracks.forEach((boneId, idx) => {
    m.bone(boneId).paint(th.glowHot, { c2: th.glow, glow: 0.9, mat: K.crystal, line: 0 });
    const a = idx * 2.1 + 0.3;
    m.g(pt(Math.cos(a) * 0.78, idx === 0 ? hLowerRoof + 0.95 : 1.35, Math.sin(a) * 0.78), () =>
      m.box(0, 0, 0, 0.1, 0.7, 0.08, 0.02),
    );
  });

  // 高地三塔战幡 (flag)
  if (tier === 3 && flag >= 0) {
    m.bone(flag);
    m.paint(th.gold, { c2: th.goldDark, ...xa });
    m.tube(
      [
        [0, hTopCrown - 0.3, 0, 0.045],
        [0, hTopCrown + 1.5, 0, 0.032],
      ],
      { seg: 6 },
    );
    m.box(0.32, hTopCrown + 1.35, 0, 0.68, 0.05, 0.05, 0.01);
    m.paint(th.banner, { c2: th.gold, team: 0.85, mat: K.cloth, pattern: api.En.weave, patternScale: 8 });
    m.sheet(4, 3, (u, v) => [0.06 + u * 0.56, hTopCrown + 1.32 - v * 0.85 - (u > 0.75 ? 0.16 : 0), Math.sin(u * 4 + v * 3) * 0.05]);
  }

  // ── 5. 塔顶鎏金龙珠火鼎 (core)、精工古铜祥云环 (rings)、宝葫芦塔刹 (tip/alert) ──
  m.bone(core).paint(0xf7b239, { c2: 0xffeaa8, glow: 0.62, mat: K.crystal, line: 0 });
  m.ball(0, coreY, 0, 0.3, 0.34, 0.3, 0);
  m.paint(th.gold, { c2: th.goldDark, ...xa });
  m.g(pt(0, coreY, 0, 90, 0, 0), () => m.torus(0.42, 0.04, 0.032, 16, 4));
  m.g(pt(0, coreY - 0.24, 0), () =>
    m.lathe(
      [
        [-0.08, 0.18],
        [0.06, 0.34],
        [0.14, 0.26],
      ],
      { seg: 8 },
    ),
  );

  rings.forEach((boneId, idx) => {
    m.bone(boneId).paint(th.gold, { c2: th.goldDark, ...xa, glow: 0.08 });
    const rr = 0.64 + idx * 0.13;
    m.g(pt(0, coreY - 0.08 + idx * 0.14, 0), () => {
      m.torus(rr, 0.04, 0.052, 20, 4, { crease: 28 });
      m.paint(0xf7b239, { c2: th.tileHi, glow: 0.35, ...ao });
      for (let k = 0; k < 4; k++) {
        const ka = (k / 4) * jc;
        m.ball(Math.cos(ka) * rr, 0, Math.sin(ka) * rr, 0.07, 0.05, 0.07, 0);
      }
    });
  });

  // 宝葫芦鎏金塔刹 (tip)
  m.bone(tip).paint(th.gold, { c2: th.glow, ...xa, glow: 0.25 });
  m.lathe(
    [
      [coreY + 0.55, 0.22],
      [coreY + 0.75, 0.28],
      [coreY + 0.96, 0.1],
      [coreY + 1.15, 0.2],
      [coreY + 1.38, 0.08],
      [coreY + 1.68, 0.015],
    ],
    { seg: 10 },
  );
  m.bone(alert).paint(0xffeed6, { c2: 0xffffff, glow: 0.95, mat: K.crystal, line: 0 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * jc + 0.4;
    m.ball(Math.cos(a) * 0.42, coreY + 1.55, Math.sin(a) * 0.42, 0.075, 0.075, 0.075, 0);
  }

  m.bakeGrounding(8, 0.75, 0.9);
  const totalHeight = coreY + 1.9;

  const animate = (pose: {
    pos: (j: number, x: number, y: number, z: number) => void;
    rot: (j: number, x: number, y: number, z: number) => void;
    scale: (j: number, s: number) => void;
  }, inp: {
    time: number;
    seed: number;
    hp: number;
    mode: number;
    anim: string;
    windup: number;
    p: number;
    deathT: number;
  }, out: { glow: number }) => {
    const T = inp.time + inp.seed * 10;
    const dmg = 1 - inp.hp;
    chunks.forEach((bId, idx) => {
      const thres = idx < 2 ? 0.25 : idx === 2 ? 0.5 : 0.75;
      const k = Ct(dmg, thres - 0.01 + idx * 0.03, thres + 0.05 + idx * 0.03);
      if (k > 0) {
        pose.scale(bId, Math.max(0.001, 1 - k));
        pose.pos(bId, 0, -k * 1.2, 0);
      }
    });
    cracks.forEach((bId, idx) => {
      pose.scale(bId, Math.max(0.001, Ct(dmg, 0.25 * (idx + 1) - 0.02, 0.25 * (idx + 1) + 0.04)));
    });
    const low = Ct(dmg, 0.45, 0.85);
    const alerting = (inp.mode & 2) !== 0;
    let charge = 0;
    let spinMul = 1;
    let burst = 0;
    if (inp.anim === 'attack') {
      const w = inp.windup;
      charge = inp.p < w ? inp.p / w : Math.max(0, 1 - (inp.p - w) / 0.25);
      burst = Xe(inp.p, w + 0.04, 0.09);
      spinMul = 1 + 3 * charge;
      out.glow = inp.p >= w ? 1 + 1.6 * charge : 1 + charge * charge;
    } else {
      out.glow = 1 + 0.14 * Math.sin(T * 2);
    }
    out.glow *= 1 - low * (0.35 + 0.25 * Math.sin(T * 17) * Math.sin(T * 7.3));
    pose.pos(core, 0, Math.sin(T * 1.3) * 0.1 - low * 0.2, 0);
    pose.rot(core, 0, T * 28 * spinMul, low * 8 * Math.sin(T * 3));
    pose.scale(core, 1 + 0.22 * charge + 0.03 * Math.sin(T * 2.6));
    rings.forEach((bId, idx) => {
      const dir = idx % 2 === 0 ? 1 : -1;
      pose.rot(
        bId,
        14 + idx * 14 + low * 16 * Math.sin(T * 2 + idx),
        dir * T * (34 + idx * 12) * spinMul,
        10 - idx * 16 + low * 12 * Math.cos(T * 1.7 + idx) + dmg * 14,
      );
      pose.pos(bId, 0, Math.sin(T * 1.1 + idx * 2) * 0.07 - low * 0.18 * idx, 0);
      pose.scale(bId, 1 + 0.08 * charge + 0.26 * burst);
    });
    pose.pos(tip, 0, Math.sin(T * 1.3 + 1) * 0.06, 0);
    pose.rot(tip, 0, T * (alerting ? 140 : 40), 0);
    pose.scale(alert, alerting ? 1 + 0.22 * Math.sin(T * 12) : 0.001);
    pose.rot(alert, 0, alerting ? T * 220 : 0, 0);
    if (flag >= 0) pose.rot(flag, Math.sin(T * 1.4) * 1.5, 0, Math.sin(T * 1.1) * 2);

    if (inp.deathT >= 0) {
      const G = inp.deathT;
      const q = Ct(G, 0, 0.35);
      const et = Ct(G, 0.2, 1.3);
      const ct = Ct(G, 0.9, 2.2);
      const rt = inp.seed > 0.5 ? 1 : -1;
      pose.scale(core, Math.max(0.001, (1 + q * 0.5) * (1 - Ct(G, 0.25, 0.45))));
      rings.forEach((bId, idx) => {
        const st = Ct(G, 0.1, 0.9);
        pose.scale(bId, Math.max(0.001, (1 + st * 0.8) * (1 - Ct(G, 0.6, 1))));
        pose.pos(bId, rt * st * (0.5 + idx * 0.4), -st * st * 3.5, st * (idx - 0.5) * 0.8);
        pose.rot(bId, 16 + st * 120, 0, 10 + st * 80 * rt);
      });
      pose.pos(tip, rt * et * 2, -et * et * (coreY + 1), 0);
      pose.rot(tip, 0, 0, -rt * et * 140);
      pose.scale(tip, Math.max(0.001, 1 - Ct(G, 1, 1.5)));
      cracks.forEach((bId) => pose.scale(bId, 1));
      const mt = et * et;
      pose.rot(upper, 0, 0, -rt * mt * 84);
      pose.pos(upper, rt * mt * 0.3, -mt * 0.9 - ct * 1.2, 0);
      pose.scale(upper, Math.max(0.001, 1 - ct));
      pose.pos(lower, 0, -ct * 1.4, 0);
      pose.scale(lower, 1 - ct * 0.9);
      pose.scale(root, 1 - Ct(G, 1.9, 2.4) * 0.999);
      pose.rot(root, 0, 0, Math.sin(G * 50) * 0.6 * (1 - ct));
      out.glow = (1 + 3 * Xe(G, 0.3, 0.2)) * (1 - Ct(G, 0.4, 1));
    }
  };

  return {
    key: `tower:${tier}:${team}`,
    geometry: m.build(),
    rig,
    height: totalHeight,
    radius: 1.7,
    scale: 1,
    stride: 1,
    triangles: m.triangleCount,
    deathDur: 2.4,
    attach: {
      core: { joint: core, x: 0, y: 0, z: 0 },
      muzzle: { joint: core, x: 0, y: 0, z: 0 },
      chest: { joint: root, x: 0, y: 2.6, z: 0 },
      head: { joint: tip, x: 0, y: 1, z: 0 },
    },
    blend: () => 0,
    animate,
  };
}

/**
 * 构建唐宋帝国基底大晶坛：三层圜丘玉坛 × 4 根朱漆盘龙华表 × 传国玉玺与苏颂浑天仪
 */
function buildCore(api: ArchApi, team: number) {
  const th = ARCH_THEMES[team] ?? ARCH_THEMES[0];
  const { Wa, Ls, pt, Ct, Kn, K, qi, xa, ao, rs, jc } = api;

  const rig = new Wa();
  const root = rig.add('root', -1, 0, 0, 0);
  const sealY = 3.95;
  const star = rig.add('star', root, 0, sealY, 0);
  const inner = rig.add('inner', star, 0, sealY, 0);
  const ringA = rig.add('ringA', root, 0, sealY, 0);
  const ringB = rig.add('ringB', root, 0, sealY, 0);
  const orbit = rig.add('orbit', root, 0, sealY, 0);
  const cracks = [0, 1, 2].map((i) => rig.add(`crack${i}`, star, 0, sealY, 0));
  const pylons = [0, 1, 2, 3].map((i) =>
    rig.add(
      `pylon${i}`,
      root,
      Math.cos((i * Math.PI) / 2 + Math.PI / 4) * 2.25,
      0.9,
      Math.sin((i * Math.PI) / 2 + Math.PI / 4) * 2.25,
    ),
  );

  const m = new Ls();
  m.crease = 30;

  // ── 1. 三层圜丘玉石祭坛底座 (root) ──
  m.bone(root);
  m.paint(th.stone, { c2: th.stoneLight, ...qi });
  m.lathe(
    [
      [0, 2.86],
      [0.32, 2.86],
      [0.36, 2.74],
      [0.36, 2.46],
      [0.66, 2.46],
      [0.7, 2.34],
      [0.7, 2.02],
      [1.0, 2.02],
      [1.04, 1.9],
    ],
    { seg: 16, crease: 30 },
  );
  // 御金三层台阶沿边 + 16 根玉栏柱望柱
  m.paint(th.gold, { c2: th.goldDark, ...xa });
  m.lathe(
    [
      [0.28, 2.89],
      [0.36, 2.89],
      [0.365, 2.5],
    ],
    { seg: 16, cap0: false, cap1: false },
  );
  m.lathe(
    [
      [0.62, 2.49],
      [0.7, 2.49],
      [0.705, 2.06],
    ],
    { seg: 16, cap0: false, cap1: false },
  );
  m.g(pt(0, 1.05, 0), () => m.torus(1.22, 0.08, 0.06, 20, 4, { crease: 30 }));
  // 中心鎏金雕龙坛心玉璧（温润御金浮雕，消灭科幻亮青圆盘）
  m.paint(th.goldDark, { c2: th.gold, glow: 0.12, ...xa });
  m.lathe(
    [
      [1.02, 1.08],
      [1.04, 0.04],
    ],
    { seg: 16, cap0: false },
  );
  m.paint(th.tile, { c2: th.tileHi, glow: 0.15, ...qi });
  m.lathe(
    [
      [1.04, 0.62],
      [1.05, 0.04],
    ],
    { seg: 12, cap0: false },
  );
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * jc;
    m.paint(th.gold, { c2: th.goldDark, ...xa });
    m.box(Math.cos(a) * 1.56, 1.04, Math.sin(a) * 1.56, 0.08, 0.18, 0.08, 0.02);
  }

  // ── 1B. 四方攒尖飞檐重檐琉璃御亭天盖与四隅飞檐悬灯 (root，凌空覆护玉玺坛顶 y=4.74..7.78) ──
  m.paint(th.gold, { c2: th.goldDark, ...xa });
  m.g(pt(0, 4.72, 0), () => m.torus(2.38, 0.1, 0.08, 16, 4, { crease: 30 }));
  // 下层宽阔反宇曲坡重檐顶（四角飞檐精准对准 45° 四根朱漆华表）
  buildCurvedPagodaRoof(m, api, th, 4.74, 2.52, 1.32, 1.02, true);
  // 四角飞檐最外挑端高悬大红宫灯（向外移出至 r=3.04，45° 视角清晰可见垂落灯影）
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const lx = Math.cos(a) * 3.04;
    const lz = Math.sin(a) * 3.04;
    m.paint(th.gold, { c2: th.goldDark, ...xa });
    m.box(lx, 4.78, lz, 0.045, 0.26, 0.045, 0.01);
    m.paint(0x9e2218, { c2: th.gold, ...xa });
    m.ball(lx, 4.64, lz, 0.12, 0.07, 0.12, 0);
    m.paint(0xffb848, { c2: 0xffe8a6, glow: 0.9, mat: K.crystal, line: 0 });
    m.ball(lx, 4.46, lz, 0.15, 0.19, 0.15, 0);
    m.paint(th.gold, { c2: th.goldDark, ...xa });
    m.box(lx, 4.3, lz, 0.05, 0.1, 0.05, 0.01);
  }
  // 二层八角楼阁暖灯明堂窗 (y=5.74..6.20)
  m.paint(th.woodDark, { c2: th.wood, mat: K.leather });
  m.lathe(
    [
      [5.74, 1.48],
      [6.2, 1.36],
    ],
    { seg: 8, phase: 22.5, cap0: false },
  );
  m.paint(0xf5a638, { c2: 0xffe3a3, glow: 0.48, mat: K.crystal, line: 0 });
  m.lathe(
    [
      [5.84, 1.44],
      [6.1, 1.39],
    ],
    { seg: 8, phase: 22.5, cap0: false, cap1: false },
  );
  // 上层琉璃重檐攒尖宝顶 (y=6.18..7.08) + 莲座金葫芦 (y=7.06..7.78)
  buildCurvedPagodaRoof(m, api, th, 6.18, 1.48, 0.22, 0.9, true);
  m.paint(th.gold, { c2: 0xffe8a6, glow: 0.26, ...xa });
  m.lathe(
    [
      [7.06, 0.3],
      [7.22, 0.36],
      [7.36, 0.13],
      [7.52, 0.23],
      [7.78, 0.02],
    ],
    { seg: 10 },
  );

  // ── 2. 四隅唐宋朱漆盘龙华表柱 (pylons) ──
  pylons.forEach((bId, idx) => {
    const a = (idx * Math.PI) / 2 + Math.PI / 4;
    const degY = -(a * 180) / Math.PI - 90;
    m.bone(bId);
    m.g(pt(Math.cos(a) * 2.25, 0.9, Math.sin(a) * 2.25, 0, degY, 0), () => {
      // 白玉须弥柱墩
      m.paint(th.stoneDark, { c2: th.stone, ...qi });
      m.lathe(
        [
          [-0.3, 0.44],
          [0.35, 0.4],
          [0.5, 0.28],
        ],
        { seg: 8, phase: 22.5 },
      );
      // 笔直庄严的朱漆盘龙华表柱（同轴居中，不偏斜）
      m.paint(th.wood, { c2: th.woodDark, mat: K.leather, gloss: 0.45 });
      m.tube(
        [
          [0, 0.48, 0, 0.23, 0.23],
          [0, 1.5, 0, 0.2, 0.2],
          [0, 2.55, 0, 0.17, 0.17],
          [0, 3.35, 0, 0.15, 0.15],
        ],
        { seg: 10, crease: 36 },
      );
      // 华表金雕云翼板
      m.paint(th.gold, { c2: th.goldDark, ...xa });
      m.g(pt(0, 2.55, 0, 0, 0, 0), () => m.box(0, 0, 0, 1.08, 0.14, 0.2, 0.03));
      m.g(pt(0, 0.55, 0, 0, 0, 0), () => m.box(0, 0, 0, 0.62, 0.14, 0.62, 0.03));
      // 承露金盘 + 发光御珠（与柱心严格同轴）
      m.lathe(
        [
          [3.3, 0.28],
          [3.42, 0.34],
          [3.48, 0.22],
        ],
        { seg: 8 },
      );
      m.paint(th.glowHot, { c2: th.glow, glow: 0.85, mat: K.crystal, line: 0 });
      m.ball(0, 3.68, 0, 0.2, 0.26, 0.2, 0);
    });
  });

  // ── 3. 中央传国盘龙金玉大玺与御印宝座 (star + inner) ──
  m.bone(star);
  m.paint(th.gold, { c2: th.goldDark, ...xa, glow: 0.18 });
  m.g(pt(0, sealY - 0.54, 0), () => {
    m.box(0, 0, 0, 1.48, 0.36, 1.48, 0.1);
    m.box(0, 0.26, 0, 1.2, 0.2, 1.2, 0.07);
  });
  m.paint(th.tileHi, { c2: th.gold, glow: 0.26, ...ao, gloss: 0.85 });
  m.g(pt(0, sealY + 0.14, 0), () => {
    // 玉玺主印体与金嵌盘龙拱钮
    m.box(0, 0, 0, 1.08, 0.84, 1.08, 0.09);
    m.paint(th.gold, { c2: 0xffe49e, ...xa, glow: 0.25 });
    m.g(pt(0, 0.52, 0, 90, 0, 0), () => m.torus(0.28, 0.09, 0.08, 14, 5));
    m.lathe(
      [
        [0.42, 0.36],
        [0.64, 0.44],
        [0.82, 0.18],
        [0.98, 0.04],
      ],
      { seg: 8, phase: 22.5 },
    );
  });
  // 内核改为暖御金印心（去除刺眼白青钻石晶柱）
  m.bone(inner).paint(0xffcf60, { c2: 0xfff0be, glow: 0.52, mat: K.crystal, line: 0 });
  m.g(pt(0, sealY + 0.15, 0), () => m.ball(0, 0, 0, 0.34, 0.38, 0.34, 0));

  cracks.forEach((bId, idx) => {
    m.bone(bId).paint(0xffd46b, { c2: 0xffeab0, glow: 0.65, mat: K.crystal, line: 0 });
    const a = idx * 2.1 + 0.6;
    m.box(Math.cos(a) * 0.58, sealY + 0.14, Math.sin(a) * 0.58, 0.1, 0.72, 0.1, 0.02);
  });

  // ── 4. 苏颂浑天仪古铜黄道赤道双环 (ringA + ringB) ──
  for (const [bId, rad] of [
    [ringA, 1.82],
    [ringB, 2.12],
  ] as [number, number][]) {
    m.bone(bId).paint(th.gold, { c2: th.goldDark, ...xa, glow: 0.08 });
    m.g(pt(0, sealY, 0), () => {
      m.torus(rad, 0.068, 0.095, 32, 4, { crease: 30, phase: 45 });
      for (let g = 0; g < 12; g++) {
        const y = (g / 12) * jc;
        const starNode = g % 3 === 0;
        if (starNode) m.paint(0xffd268, { c2: th.gold, glow: 0.36, mat: K.crystal, line: 0 });
        else m.paint(th.gold, { c2: th.goldDark, ...xa });
        m.g(pt(Math.cos(y) * (rad - 0.1), 0, Math.sin(y) * (rad - 0.1), 0, -(y * 180) / Math.PI, 0), () =>
          m.box(0, 0, 0, starNode ? 0.28 : 0.14, starNode ? 0.18 : 0.16, starNode ? 0.16 : 0.07),
        );
      }
    });
  }

  // ── 5. 环绕玉圭星符 (orbit) ──
  m.bone(orbit).paint(th.gold, { c2: 0xffe49e, glow: 0.25, ...xa });
  for (let x = 0; x < 7; x++) {
    const p = (x / 7) * jc;
    const g = sealY + (rs(x, 3) - 0.5) * 1.4;
    m.g(pt(Math.cos(p) * 1.5, g, Math.sin(p) * 1.5, rs(x, 4) * 26 - 13, -(p * 180) / Math.PI, 0), () =>
      m.box(0, 0, 0, 0.1, 0.36 + rs(x, 6) * 0.18, 0.2, 0.02),
    );
  }

  m.bakeGrounding(6, 0.75, 0.9);

  const animate = (pose: {
    pos: (j: number, x: number, y: number, z: number) => void;
    rot: (j: number, x: number, y: number, z: number) => void;
    scale: (j: number, s: number) => void;
  }, p: {
    time: number;
    seed: number;
    hp: number;
    anim: string;
    windup: number;
    p: number;
    deathT: number;
  }, out: { glow: number }) => {
    const y = p.time + p.seed * 10;
    const v = 1 - p.hp;
    const _ = Ct(v, 0.5, 0.9);
    const k = p.hp < 0.25 && p.deathT < 0;
    let M = 0;
    if (p.anim === 'attack') {
      const b = p.windup;
      M = p.p < b ? p.p / b : Math.max(0, 1 - (p.p - b) / 0.25);
      out.glow = 1 + 1.2 * M;
    } else {
      out.glow = 1 + 0.14 * Math.sin(y * 1.8);
    }
    out.glow *= 1 + 0.5 * v - _ * (0.3 + 0.3 * Math.sin(y * 19) * Math.sin(y * 6.1));
    if (k) out.glow *= 1 + 0.5 * Math.max(0, Math.sin(y * 7));

    cracks.forEach((b, w) => pose.scale(b, Math.max(0.001, Ct(v, 0.25 * (w + 1) - 0.02, 0.25 * (w + 1) + 0.04))));
    pose.pos(star, 0, Math.sin(y * 0.9) * 0.16, 0);
    pose.rot(star, _ * 6 * Math.sin(y * 2.3), y * 14 * (1 + 2 * M), _ * 6 * Math.cos(y * 1.9));
    pose.scale(star, 1 + 0.1 * M + 0.02 * Math.sin(y * 2.2));
    pose.rot(inner, y * 40, -y * 60, 0);
    pose.scale(inner, 1 + 0.2 * Math.sin(y * 3) + 0.5 * M);

    const S = 1 + v * 0.8 * Math.sin(y * 3.1) + _ * 0.8 * Math.sin(y * 7.7);
    pose.rot(ringA, 24 + _ * 18 * Math.sin(y * 1.4), y * 30 * S, 12 + _ * 16 * Math.cos(y));
    pose.rot(ringB, -30 + _ * 18 * Math.cos(y * 1.2), -y * 22 * S, -18 + v * 10 * Math.sin(y * 0.9));
    pose.rot(orbit, 0, -y * 18, 0);
    pose.scale(orbit, 1 - _ * 0.3);

    if (p.deathT >= 0) {
      const b = p.deathT;
      const w = Ct(b, 0, 0.6);
      const T = Ct(b, 0.6, 0.9);
      const E = Ct(b, 0.7, 2.2);
      pose.scale(star, Math.max(0.001, (1 + w * 0.45 + Math.sin(b * 60) * 0.03 * w) * (1 - T)));
      pose.scale(inner, (1 + w * 1.6) * (1 - T));
      pose.scale(ringA, Math.max(0.001, (1 + T * 2.2) * (1 - Ct(b, 1, 1.5))));
      pose.scale(ringB, Math.max(0.001, (1 + T * 2.8) * (1 - Ct(b, 1, 1.5))));
      pose.pos(ringA, 0, -E * 2.5, 0);
      pose.pos(ringB, 0, -E * 2.8, 0);
      pose.scale(orbit, Math.max(0.001, (1 + T * 3) * (1 - Ct(b, 0.9, 1.4))));
      pylons.forEach((A, C) => {
        const R = (C * Math.PI) / 2 + Math.PI / 4;
        const I = Kn(E) * E;
        pose.rot(A, Math.sin(R) * I * 66 * (0.8 + rs(C, 2) * 0.4), 0, -Math.cos(R) * I * 66 * (0.8 + rs(C, 3) * 0.4));
        pose.pos(A, 0, -I * 0.3, 0);
      });
      pose.rot(root, 0, 0, Math.sin(b * 46) * 0.5 * (1 - E));
      out.glow = (1 + 4 * w) * (1 - Ct(b, 0.75, 1.3)) + 0.05;
    }
  };

  return {
    key: `core:${team}`,
    geometry: m.build(),
    rig,
    height: 7.8,
    radius: 2.9,
    scale: 1,
    stride: 1,
    triangles: m.triangleCount,
    attach: {
      core: { joint: star, x: 0, y: 0, z: 0 },
      muzzle: { joint: star, x: 0, y: 0, z: 0 },
      chest: { joint: root, x: 0, y: 3.2, z: 0 },
      head: { joint: star, x: 0, y: 1.8, z: 0 },
    },
    blend: () => 0,
    animate,
  };
}

/**
 * 构建唐宋箭楼倒塌后的残垣废墟
 */
function buildRuin(api: ArchApi, team: number) {
  const th = ARCH_THEMES[team] ?? ARCH_THEMES[0];
  const { Wa, Ls, pt, bt, K, En, qi, rs } = api;
  const rig = new Wa();
  const root = rig.add('root', -1, 0, 0, 0);
  const stump = rig.add('stump', root, 0, 0.35, 0);

  const m = new Ls();
  m.crease = 28;
  // 焦黑塌陷地坪
  m.bone(root).paint(0x1b1715, { c2: 0x3b312a, mat: K.rock, by: (x: number, _y: number, z: number) => Math.hypot(x, z) / 2.9, line: 0 });
  m.lathe(
    [
      [0.04, 2.9],
      [0.05, 0.02],
    ],
    { seg: 12, cap0: false, cap1: false, shape: (a: number) => 0.78 + 0.22 * Math.sin(a * 3 + 1) * Math.sin(a * 5) },
  );
  // 断壁须弥座与烧焦朱漆残柱
  m.bone(stump).paint(th.stoneDark, { c2: th.stone, ...qi });
  m.lathe(
    [
      [0.35, 1.05],
      [0.98, 0.92],
      [1.46, 0.85],
    ],
    { seg: 8, phase: 22.5, cap1: false, shape: (a: number, r: number) => (r === 2 ? 0.75 + 0.3 * rs(Math.round(a * 3), 5) : 1) },
  );
  m.paint(th.woodDark, { c2: th.wood, mat: K.leather });
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const px = Math.cos(a) * 0.78;
    const pz = Math.sin(a) * 0.78;
    m.g(pt(px, 1.05, pz, rs(i, 1) * 26 - 13, 0, rs(i, 2) * 26 - 13), () =>
      m.limb([0, 0, 0], [0, 0.5 + rs(i, 3) * 0.5, 0], 0.12, 0.09, { seg: 6 }),
    );
  }
  // 散落琉璃瓦残片与余烬
  m.bone(root);
  for (let i = 0; i < 12; i++) {
    const a = i * 2.4 + 0.5;
    const dist = 1.1 + rs(i, 7) * 1.4;
    const s = 0.24 + rs(i, 8) * 0.32;
    m.paint(i % 2 === 0 ? th.tile : th.stone, { c2: th.tileDark, ...qi });
    m.g(pt(Math.cos(a) * dist, 0.25, Math.sin(a) * dist, rs(i, 9) * 50, rs(i, 10) * 180, rs(i, 11) * 50), () =>
      m.box(0, 0, 0, s * 1.3, s * 0.35, s * 1.1, 0.03),
    );
  }
  for (let i = 0; i < 8; i++) {
    const a = i * 2.1 + 0.9;
    const dist = 0.5 + rs(i, 21) * 1.8;
    m.paint(0xff6b2c, { c2: 0xffd268, glow: 0.7, mat: K.crystal, line: 0 });
    m.ball(Math.cos(a) * dist, 0.14, Math.sin(a) * dist, 0.07, 0.04, 0.06, 0);
  }
  // 斜倒战幡
  m.paint(th.woodDark, { mat: K.leather });
  m.limb([1.05, 0.3, 0.5], [1.5, 1.9, 0.26], 0.04, 0.03, { seg: 5 });
  m.paint(th.banner, { team: 0.8, mat: K.cloth, pattern: En.weave, patternScale: 8, patternAmt: 0.35 });
  m.sheet(3, 2, (u, v) => {
    const k = v > 0.6 ? 0.16 * Math.abs(Math.sin(u * 9)) : 0;
    return [bt(1.5, 1.24, v) + u * 0.5, 1.9 - v * 0.9 - u * 0.2 + k * 0.3 - k * 0.5, 0.26 + bt(0, 0.14, v) + u * 0.18];
  });

  m.bakeGrounding(2.4, 0.7, 0.85);
  return {
    key: `ruin:${team}`,
    geometry: m.build(),
    rig,
    height: 2.2,
    radius: 2.9,
    scale: 1,
    stride: 1,
    triangles: m.triangleCount,
    attach: {},
    blend: () => 0,
    animate(
      pose: { scale: (j: number, s: number) => void; pos: (j: number, x: number, y: number, z: number) => void },
      r: { p: number; time: number; seed: number; t: number },
      out: { glow: number },
    ) {
      const c = r.p;
      pose.scale(root, 0.3 + 0.7 * c);
      pose.pos(root, 0, -0.3 * (1 - c), 0);
      pose.scale(stump, 0.4 + 0.6 * c * c);
      out.glow = (0.6 + 0.4 * Math.sin(r.time * 1.3 + r.seed * 6)) * (1 + 1.2 * Math.max(0, 1 - r.t / 12));
    },
  };
}

export function createArchitectureBuilders(api: ArchApi) {
  return {
    tower: (tier: number, team: number) => buildTower(api, tier, team),
    core: (team: number) => buildCore(api, team),
    ruin: (team: number) => buildRuin(api, team),
  };
}
