/**
 * tangsongWorld.ts — 《千里江山图》青绿山水 × 北宋汴京演武 3D 色彩、光影与场景道具覆写
 *
 * 1. TANGSONG_PALETTE: 覆盖原版偏冷科幻蓝色盘 `Yt`，塑造：
 *    - 蓝方「盛唐青玉」 (#2ca58d / #45d1ba / 宣白石 #d9cfb9 / 鎏金 #e6bc5e)
 *    - 红方「赤壁朱丹」 (#c9382b / #ff5a3c / 暖墨石 #574840 / 古铜金 #e2a846)
 *    - 环境「千里江山青绿暖金」 (青绿山岩、碧玉汴河、宋代砂石御道、松柏、红梅、晨晖黄雾)
 * 2. TANGSONG_GRADE: 暖金宣纸高光 + 青绿暗部色调映射
 * 3. createTangSongSceneryFactories(api):
 *    - 把原版路边科幻晶簇 v_() 改造为「太湖奇石灯柱 / 松石碑」
 *    - 把路灯 XF() 改造为「唐宋六角翘角飞檐宫灯」
 *    - 提供 accentTrees 盛唐红梅 & 御苑金银杏参数
 */

export const TANGSONG_PALETTE = {
  blue: {
    main: 0x2a5a78,
    light: 0x7cb8de,
    dark: 0x17344a,
    glow: 0x4e96c4,
    stone: 0xd0c6b2,
    stoneDark: 0x7a7060,
    trim: 0xe2b24e,
    plaza: 0x998e7c,
  },
  red: {
    main: 0xb83024,
    light: 0xff8c6e,
    dark: 0x631712,
    glow: 0xe65336,
    stone: 0x5c493e,
    stoneDark: 0x2c201b,
    trim: 0xe0a242,
    plaza: 0x634b3f,
  },
  neutral: {
    main: 0xd9ad4e,
    light: 0xfff1c4,
    dark: 0x735220,
    glow: 0xf2c662,
    stone: 0xa69c84,
    stoneDark: 0x5c5445,
    trim: 0xd9ad4e,
    plaza: 0x8f856f,
  },
  player: {
    main: 0xdea93c,
    light: 0xfff3be,
    dark: 0x6b4a14,
    glow: 0xffd46b,
    stone: 0xe8dec6,
    stoneDark: 0xa39579,
    trim: 0xf4cd6c,
    plaza: 0x9aa38c,
  },
  env: {
    sun: 0xffe4b2,
    sky: 0xe2ccb0,
    bounce: 0xc9a374,
    fog: 0xd2c8b2,
    haze: 0xe3caa0,
    horizon: 0xf2d9af,
    zenith: 0x43536e,
    cloud: 0xfff6e5,
    cloudShade: 0xb0a496,
    grass: 0x2e8694,
    grassWarm: 0x4ea6ae,
    grassCool: 0x2e7a8e,
    grassDark: 0x1b5059,
    cliffGrass: 0x2f848e,
    cliffGrassLight: 0x58a8ac,
    lane: 0xc4b79f,
    laneAlt: 0xa69882,
    laneDark: 0x6c6254,
    laneGrout: 0x383028,
    dirt: 0x8c8170,
    dirtDark: 0x585048,
    sand: 0xc9ab78,
    rock: 0x80603f,
    rockDark: 0x40301f,
    rockLight: 0x7fa09c,
    rockWarm: 0x3c84a8,
    moss: 0x36787a,
    waterShallow: 0x6b8285,
    water: 0x244654,
    waterDeep: 0x132630,
    foam: 0xf2e6cc,
    caustic: 0xebd4a4,
    reed: 0xa87d43,
    reedTip: 0xe8c98a,
    reedDark: 0x594228,
    canopy: 0x2f3f34,
    canopyLight: 0x6c7554,
    canopyDark: 0x19241e,
    trunk: 0x4f3526,
    crystal: 0x5c96bd,
    crystalDeep: 0x204560,
    starGold: 0xf4c864,
    ember: 0xff6e32,
    frost: 0x7ec4b8,
    abyss: 0x865dc0,
    amber: 0xffb347,
    glowCyan: 0xe6b85c,
    violet: 0x9c6eb8,
    petalWhite: 0xfff3e6,
    petalPink: 0xff8fa3,
    outline: 0x1e1914,
    shadeUnit: 0xc7bba6,
    shadeRock: 0xaec4d0,
    rimWarm: 0xffdea0,
    kickCool: 0xa0bed6,
  },
} as const;

export const TANGSONG_GRADE = {
  exposure: 1.02,
  bloomStrength: 0.28,
  shadowTint: [-0.008, -0.004, 0.016] as [number, number, number],
  highlightTint: [0.032, 0.014, -0.018] as [number, number, number],
  haze: 0.065,
};

export interface SceneryApi {
  Be: new () => { build(): unknown; computeNormals?(crease?: number): void };
  ke: new (seed: number) => {
    range(a: number, b: number): number;
    int(n: number): number;
  };
  gn: (b: unknown, rings: number[][], opts: Record<string, unknown>) => void;
  Xo: (
    b: unknown,
    x: number,
    y: number,
    z: number,
    h: number,
    r: number,
    rx: number,
    rz: number,
    c0: number[],
    c1: number[],
    glow: number,
    seed: number,
  ) => void;
  Ts: (
    b: unknown,
    x: number,
    y: number,
    z: number,
    rx: number,
    ry: number,
    rz: number,
    opts: Record<string, unknown>,
  ) => void;
  bs: (b: unknown) => unknown;
  Pt: (a: number[], b: number[], t: number) => number[];
  Ht: (c: number[], k: number) => number[];
  yt: (hex: number) => number[];
}

/**
 * 改造路边水晶 v_(seed, big) -> 唐宋太湖奇石 & 雕花鎏金石灯台（消灭地图上的科幻蓝水晶簇）
 */
export function buildTaihuLanternRock(api: SceneryApi, seed: number, isBig: boolean): unknown {
  const { Be, ke, gn, Ts, bs, yt } = api;
  const rng = new ke(seed);
  const b = new Be();

  const lacquer = yt(0x6b1d15);
  const lacquerDark = yt(0x3b0f0a);
  const gold = yt(0xe2b348);
  const rockBot = yt(0x3e3934);
  const rockTop = yt(0x8d8273);
  const warmGlow = yt(0xffcf70);

  if (isBig) {
    // 基地外围景观：庄严唐宋汉白玉须弥石灯亭碑（多层雕石台基 + 稳固朱漆木柱 + 暗雕明堂琥珀灯芯 + 深靛灰琉璃重檐顶）
    const marbleLight = yt(0xd8d0be);
    const roofDark = yt(0x262f3b);
    const roofMid = yt(0x3f4e61);
    const hearthWarm = yt(0xffb84c);
    gn(
      b,
      [
        [0, -0.1, 0, 1.25],
        [0, 0.28, 0, 1.2],
        [0, 0.42, 0, 0.92],
        [0, 0.72, 0, 0.88],
      ],
      { sides: 8, c0: rockBot, c1: marbleLight, cap: true },
    );
    // 4 根粗壮敦实的漆金石柱
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      const cx = Math.cos(a) * 0.62;
      const cz = Math.sin(a) * 0.62;
      gn(
        b,
        [
          [cx, 0.7, cz, 0.135],
          [cx, 1.94, cz, 0.12],
        ],
        { sides: 6, c0: lacquerDark, c1: lacquer, cap: true },
      );
    }
    // 稳重暗雕明堂灯龛 + 克制温暖琥珀火芯
    gn(
      b,
      [
        [0, 0.96, 0, 0.46],
        [0, 1.56, 0, 0.46],
      ],
      { sides: 8, c0: lacquerDark, c1: rockBot, cap: true },
    );
    Ts(b, 0, 1.26, 0, 0.24, 0.28, 0.24, {
      detail: 1,
      bump: 0.06,
      seed: seed + 3,
      bottom: hearthWarm,
      top: [1, 0.93, 0.72],
      glow: 0.75,
      flat: true,
    });
    // 下层沉稳八角靛青石瓦重檐（1.32 -> 0.65）
    gn(
      b,
      [
        [0, 1.88, 0, 1.32],
        [0, 2.02, 0, 1.3],
        [0, 2.38, 0, 0.65],
      ],
      { sides: 8, c0: roofDark, c1: roofMid, cap: true },
    );
    // 二层小阁楼身 + 上层八角翘檐宝盖（0.92 -> 0.22）
    gn(
      b,
      [
        [0, 2.36, 0, 0.54],
        [0, 2.74, 0, 0.48],
      ],
      { sides: 8, c0: lacquerDark, c1: lacquer, cap: true },
    );
    gn(
      b,
      [
        [0, 2.72, 0, 0.92],
        [0, 2.84, 0, 0.9],
        [0, 3.16, 0, 0.22],
      ],
      { sides: 8, c0: roofDark, c1: gold, cap: true },
    );
    // 顶部雅致鎏金宝刹
    gn(
      b,
      [
        [0, 3.15, 0, 0.24],
        [0, 3.28, 0, 0.14],
        [0, 3.4, 0, 0.16],
        [0, 3.52, 0, 0.025],
      ],
      { sides: 8, c0: gold, c1: [1, 0.92, 0.66], cap: true },
    );
  } else {
    // 路边奇趣太湖叠石盆景 + 微光暖琥珀萤石珠（暖水墨赭灰岩色，彻底去绿）
    const rocks = 3 + rng.int(2);
    for (let i = 0; i < rocks; i++) {
      const ang = (i / rocks) * Math.PI * 2 + rng.range(-0.3, 0.3);
      const dist = i === 0 ? 0 : rng.range(0.28, 0.55);
      const rx = rng.range(0.32, 0.55) * (i === 0 ? 1.25 : 0.85);
      const ry = rng.range(0.42, 0.88) * (i === 0 ? 1.35 : 0.75);
      const rz = rng.range(0.3, 0.52) * (i === 0 ? 1.2 : 0.85);
      Ts(b, Math.cos(ang) * dist, ry * 0.42, Math.sin(ang) * dist, rx, ry, rz, {
        detail: 1,
        bump: 0.34,
        seed: seed + i * 17,
        bottom: rockBot,
        top: i === 0 ? yt(0xa8977e) : rockTop,
        flat: true,
      });
    }
    // 岩间嵌入一点琥珀萤石灯珠，保留微弱夜晚识别度
    Ts(b, 0, 0.75, 0, 0.14, 0.16, 0.14, {
      detail: 0,
      bump: 0.1,
      seed: seed + 99,
      bottom: warmGlow,
      top: [1, 0.96, 0.8],
      glow: 0.65,
      flat: true,
    });
  }
  return bs(b);
}

/**
 * 替换原版低模切面圆石 y_(seed, isBig) -> 宋代园林「皱·瘦·漏·透」太湖石与层叠斧劈风化片麻岩
 */
export function buildTaihuGardenBoulder(api: SceneryApi, seed: number, isBig: boolean): unknown {
  const { Be, ke, gn, Ts, bs, Pt, yt } = api;
  const rng = new ke(seed + 131);
  const b = new Be();

  const stoneDark = yt(0x3b3530);
  const stoneMid = yt(0x746a5d);
  const stoneLight = yt(0x9e917e);
  const stoneOchre = yt(0xb39a78);
  const ginkgoLeaf = yt(0xd99e32);
  const mapleLeaf = yt(0xa83424);

  // 底层宽厚扁平风化叠页石砧
  const slabCount = isBig ? 3 : 2;
  for (let i = 0; i < slabCount; i++) {
    const a = rng.range(0, Math.PI * 2);
    const d = i === 0 ? 0 : rng.range(0.45, 0.88);
    const sx = rng.range(0.65, 1.05) * (isBig ? 1.2 : 0.9);
    const sy = rng.range(0.24, 0.38);
    const sz = rng.range(0.55, 0.95) * (isBig ? 1.15 : 0.88);
    Ts(b, Math.cos(a) * d, sy * 0.42 + i * 0.06, Math.sin(a) * d, sx, sy, sz, {
      detail: 1,
      bump: 0.32,
      seed: seed + i * 29,
      bottom: stoneDark,
      top: i === 0 ? stoneMid : stoneLight,
      flat: true,
    });
  }

  // 主立峰：束腰上丰「太湖瘦峰」（典型宋代艮岳太湖立石造型）
  const peakCount = isBig ? 2 + rng.int(2) : 1 + rng.int(2);
  for (let i = 0; i < peakCount; i++) {
    const ang = (i / Math.max(1, peakCount)) * Math.PI * 2 + rng.range(-0.35, 0.35);
    const offset = i === 0 ? rng.range(0, 0.14) : rng.range(0.38, 0.72);
    const px = Math.cos(ang) * offset;
    const pz = Math.sin(ang) * offset;
    const h = (i === 0 ? rng.range(1.15, 1.55) : rng.range(0.7, 1.05)) * (isBig ? 1.25 : 0.92);
    const rBase = (i === 0 ? 0.5 : 0.34) * (isBig ? 1.15 : 0.9);
    const leanX = Math.cos(ang + 0.4) * h * rng.range(0.14, 0.28);
    const leanZ = Math.sin(ang + 0.4) * h * rng.range(0.14, 0.28);

    gn(
      b,
      [
        [px, -0.08, pz, rBase * 1.1],
        [px + leanX * 0.2, h * 0.28, pz + leanZ * 0.2, rBase * 0.72],
        [px + leanX * 0.58, h * 0.62, pz + leanZ * 0.58, rBase * 1.04],
        [px + leanX * 0.92, h * 0.9, pz + leanZ * 0.92, rBase * 0.88],
        [px + leanX, h, pz + leanZ, rBase * 0.32],
      ],
      {
        sides: i === 0 ? 7 : 6,
        c0: stoneDark,
        c1: Pt(stoneLight, stoneOchre, i === 0 ? 0.45 : 0.3),
        cap: true,
      },
    );

    // 上檐崖肩与偶发风化小石笋，增强斧劈棱角感
    if (i === 0 || isBig) {
      Ts(
        b,
        px + leanX * 0.68,
        h * 0.68,
        pz + leanZ * 0.68,
        rBase * 0.75,
        h * 0.22,
        rBase * 0.62,
        {
          detail: 1,
          bump: 0.34,
          seed: seed + 51 + i * 19,
          bottom: stoneMid,
          top: stoneOchre,
          flat: true,
        },
      );
      // 岩肩零星栖落的金秋银杏叶/丹枫叶点缀
      Ts(
        b,
        px + leanX * 0.74 + rng.range(-0.1, 0.1),
        h * 0.8 + 0.03,
        pz + leanZ * 0.74 + rng.range(-0.1, 0.1),
        0.13,
        0.035,
        0.11,
        {
          detail: 0,
          seed: seed + 190 + i,
          bottom: i % 2 === 0 ? ginkgoLeaf : mapleLeaf,
          top: Pt(ginkgoLeaf, [1, 0.9, 0.62], 0.35),
          glow: 0,
          flat: true,
        },
      );
    }
  }

  b.computeNormals?.(32);
  return bs(b);
}

/**
 * 改造路灯 XF() -> 唐宋六角翘角飞檐宫灯
 */
export function buildPalaceLantern(api: SceneryApi): { build(): unknown } {
  const { gn, Xo, Ts, Pt, Ht, yt } = api;
  const b = new api.Be() as InstanceType<SceneryApi['Be']> & { build(): unknown };

  const stone = yt(0x8e8676);
  const lacquer = yt(0x6e2018);
  const gold = yt(0xe6ba52);
  const darkRoof = yt(0x283534);
  const ember = yt(0xffb44c);

  // 八角汉白玉柱础
  gn(
    b,
    [
      [0, -0.08, 0, 0.34],
      [0, 0.12, 0, 0.34],
      [0, 0.18, 0, 0.24],
      [0, 0.28, 0, 0.22],
    ],
    { sides: 8, c0: Ht(stone, 0.78), c1: stone },
  );
  // 朱漆木立柱 + 金箍
  gn(
    b,
    [
      [0, 0.28, 0, 0.12],
      [0, 0.9, 0, 0.095],
      [0, 0.96, 0, 0.18],
      [0, 1.02, 0, 0.2],
    ],
    { sides: 8, c0: lacquer, c1: Pt(lacquer, gold, 0.4), cap: true },
  );
  // 六角宫灯窗柱
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const x = Math.cos(a) * 0.165;
    const z = Math.sin(a) * 0.165;
    gn(
      b,
      [
        [x, 1.02, z, 0.022],
        [x, 1.34, z, 0.022],
      ],
      { sides: 4, c0: lacquer, c1: gold },
    );
  }
  // 温暖琥珀灯笼内芯
  Xo(b, 0, 1.04, 0, 0.32, 0.13, 0, 0, Ht(ember, 0.9), [1, 0.92, 0.65], 1.1, 7);
  // 翘角攒尖灰瓦宫灯盖
  gn(
    b,
    [
      [0, 1.33, 0, 0.32],
      [0, 1.37, 0, 0.34],
      [0, 1.46, 0, 0.18],
      [0, 1.58, 0, 0.05],
      [0, 1.65, 0, 0.025],
    ],
    { sides: 6, c0: darkRoof, c1: Pt(darkRoof, gold, 0.3), cap: true },
  );
  // 金宝顶葫芦
  Ts(b, 0, 1.68, 0, 0.055, 0.065, 0.055, {
    detail: 0,
    seed: 5,
    bottom: gold,
    top: Ht(gold, 1.25),
    glow: 0.25,
  });

  return b;
}

/**
 * 城墙烽火台火盆（替代原版几何蓝青尖晶 SN()）
 * 采用唐代鎏金青铜双耳鼎炉钵托 + 温暖层叠炉火，经阵营 crystalTint 染色后呈现温润青玉幽火或朱丹烽火。
 */
export function buildBrazierEmber(api: SceneryApi) {
  const { Be, gn, Ts, bs } = api;
  const b = new Be();
  // 鎏金青铜鼎炉口沿钵托
  gn(
    b,
    [
      [0, 1.84, 0, 0.4],
      [0, 1.96, 0, 0.52],
      [0, 2.04, 0, 0.48],
      [0, 2.06, 0, 0.38],
    ],
    { sides: 8, c0: [0.34, 0.24, 0.15], c1: [0.76, 0.58, 0.26], cap: true },
  );
  // 双侧直立鼎耳
  for (const s of [-1, 1]) {
    gn(
      b,
      [
        [s * 0.44, 1.98, 0, 0.055],
        [s * 0.48, 2.2, 0, 0.06],
        [s * 0.43, 2.26, 0, 0.03],
      ],
      { sides: 4, c0: [0.68, 0.5, 0.22], c1: [0.88, 0.72, 0.34], cap: true },
    );
  }
  // 炽热内焰核与层叠火苗
  Ts(b, 0, 2.1, 0, 0.31, 0.2, 0.31, {
    detail: 1,
    bump: 0.22,
    seed: 11,
    bottom: [0.98, 0.82, 0.52],
    top: [1, 0.96, 0.84],
    glow: 0.88,
    flat: true,
  });
  Ts(b, 0.03, 2.28, -0.02, 0.19, 0.16, 0.19, {
    detail: 1,
    bump: 0.26,
    seed: 23,
    bottom: [1, 0.86, 0.56],
    top: [1, 0.98, 0.9],
    glow: 0.92,
    flat: true,
  });
  return bs(b);
}

export const TANGSONG_ACCENT_TREE_PALETTES = {
  redPlum: { dark: 0x7d1c2b, mid: 0xd6485e, light: 0xffb8c6 },
  goldenGinkgo: { dark: 0x8c5a12, mid: 0xdf9e24, light: 0xffe47a },
  crimsonMaple: { dark: 0x6b1414, mid: 0xbd2d22, light: 0xf27649 },
  burntAmber: { dark: 0x5e2c14, mid: 0xb86426, light: 0xeba954 },
};
