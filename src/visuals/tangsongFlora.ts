/**
 * tangsongFlora.ts — 唐宋山水草木工坊（迎客苍松 / 汴河垂柳 / 翠竹林 / 古柏 / 御苑花丛 / 苔石灵芝）
 *
 * 彻底替换原版西式圆团西蓝花树 c2()、欧洲圆锥冷杉 dN()/hN() 与卡通毒蘑菇 mN()，
 * 严守 Be / gn / Ho / Ts / bs 顶点属性合约（sway、ao、normals），零外部贴图即可在场景内批渲染。
 */

export interface FloraApi {
  Be: new () => BeLike;
  ke: new (seed: number) => RngLike;
  gn: (b: BeLike, rings: number[][], opts: Record<string, unknown>) => void;
  Ho: (b: BeLike, x: number, y: number, z: number, r: number, opts: Record<string, unknown>) => void;
  Ts: (
    b: BeLike,
    x: number,
    y: number,
    z: number,
    rx: number,
    ry: number,
    rz: number,
    opts: Record<string, unknown>,
  ) => void;
  bs: (b: BeLike) => unknown;
  Pt: (a: number[], b: number[], t: number) => number[];
  Ht: (c: number[], k: number) => number[];
  yt: (hex: number) => number[];
  nn: (a: number, b: number, c: number) => number;
  Dn: number;
  Rh: number[];
  Ch: number[];
}

export interface BeLike {
  readonly vertexCount: number;
  readonly triangleCount: number;
  vertex(
    x: number,
    y: number,
    z: number,
    col: number[],
    nx?: number,
    ny?: number,
    nz?: number,
    sway?: number,
    glow?: number,
    team?: number,
    ao?: number,
  ): number;
  tri(a: number, b: number, c: number): void;
  quad(a: number, b: number, c: number, d: number): void;
  computeNormals?(crease?: number): void;
  build(): unknown;
}

export interface RngLike {
  next(): number;
  range(a: number, b: number): number;
  int(n: number): number;
  chance(p: number): boolean;
}

export interface AccentTreePalette {
  dark: number;
  mid: number;
  light: number;
}

/**
 * 1. 古松 c2(seed) / 赏景红梅·金银杏·丹枫 (accentTrees)
 *    苍劲曲干 + 多股斜伸横枝 + 5~7 盘扁阔平展的马远式层叠松盖（或绯梅/金杏/丹枫层冠）。
 */
function buildAncientPine(api: FloraApi, seed: number, accentPalette?: AccentTreePalette): unknown {
  const { Be, ke, gn, Ho, Ts, bs, Pt, Ht, yt, Dn, Rh, Ch } = api;
  const rng = new ke(seed);
  const b = new Be();

  const trunkH = rng.range(1.9, 2.45);
  const leanX = rng.range(-0.32, 0.32);
  const leanZ = rng.range(-0.26, 0.26);
  const midX = leanX * 0.45 + rng.range(-0.14, 0.14);
  const midZ = leanZ * 0.45 + rng.range(-0.14, 0.14);

  // 曲折苍劲主干与根蘖抓地
  gn(
    b,
    [
      [0, -0.22, 0, 0.34],
      [0, 0.08, 0, 0.25],
      [midX, trunkH * 0.42, midZ, 0.19],
      [leanX * 0.85, trunkH * 0.78, leanZ * 0.85, 0.14],
      [leanX, trunkH + 0.68, leanZ, 0.055],
    ],
    { sides: 5, c0: Rh, c1: Ch, sway0: 0, sway1: 0.12 },
  );

  const cDark = yt(accentPalette?.dark ?? 0x1b2922);
  const cMid = yt(accentPalette?.mid ?? 0x2f4336);
  const cLight = yt(accentPalette?.light ?? 0x596b52);
  const crownCenter = [leanX, trunkH + 0.38, leanZ];
  const baseAngle = rng.range(0, Dn);

  // 底层 3~4 支横斜迎客枝与扁平分层云盖（绝非球形西蓝花）
  const lowCount = accentPalette ? 4 : 3;
  for (let i = 0; i < lowCount; i++) {
    const ang = baseAngle + (i / lowCount) * Dn + rng.range(-0.34, 0.34);
    const reach = rng.range(0.68, 1.02);
    const padR = rng.range(0.84, 1.08);
    const bx = leanX + Math.cos(ang) * reach;
    const bz = leanZ + Math.sin(ang) * reach;
    const by = trunkH * rng.range(0.68, 0.88) + rng.range(-0.08, 0.16);
    gn(
      b,
      [
        [midX * 0.85, trunkH * 0.56, midZ * 0.85, 0.085],
        [bx * 0.75 + midX * 0.25, by - 0.1, bz * 0.75 + midZ * 0.25, 0.048],
      ],
      { sides: 3, c0: Rh, c1: Ch, sway1: 0.18 },
    );
    Ho(b, bx, by, bz, padR, {
      lobes: accentPalette ? 8 : 9,
      dark: Ht(cDark, 0.86),
      mid: Pt(cDark, cMid, 0.58),
      light: Pt(cMid, cLight, 0.45),
      seed: seed + i * 17,
      sway0: 0.22,
      sway1: 0.48,
      puffCenter: crownCenter,
      puff: 0.22,
      thick: accentPalette ? 0.32 : 0.22,
    });
    // 枝梢错落辅松簇，打破单调整圆饼感
    Ho(b, bx + Math.cos(ang + 0.55) * padR * 0.52, by + 0.08, bz + Math.sin(ang + 0.55) * padR * 0.52, padR * 0.56, {
      lobes: 7,
      dark: Ht(cDark, 0.9),
      mid: cMid,
      light: cLight,
      seed: seed + 131 + i * 11,
      sway0: 0.28,
      sway1: 0.54,
      puffCenter: crownCenter,
      puff: 0.18,
      thick: 0.2,
    });
  }

  // 中上层 2~3 层错落平展松盖 / 花冠
  const midCount = accentPalette ? 3 : 2;
  for (let i = 0; i < midCount; i++) {
    const ang = baseAngle + Math.PI / 3 + (i / midCount) * Dn + rng.range(-0.36, 0.36);
    const reach = rng.range(0.32, 0.52);
    const padR = rng.range(0.7, 0.88);
    Ho(
      b,
      leanX + Math.cos(ang) * reach,
      trunkH + rng.range(0.34, 0.52),
      leanZ + Math.sin(ang) * reach,
      padR,
      {
        lobes: accentPalette ? 8 : 9,
        dark: cDark,
        mid: cMid,
        light: Pt(cMid, cLight, 0.52),
        seed: seed + 53 + i * 19,
        sway0: 0.32,
        sway1: 0.62,
        puffCenter: crownCenter,
        puff: 0.24,
        thick: accentPalette ? 0.3 : 0.21,
      },
    );
  }

  // 冠顶主云盖
  Ho(b, leanX + rng.range(-0.1, 0.1), trunkH + rng.range(0.78, 0.94), leanZ + rng.range(-0.1, 0.1), rng.range(0.56, 0.72), {
    lobes: 9,
    dark: Pt(cDark, cMid, 0.65),
    mid: Pt(cMid, cLight, 0.4),
    light: cLight,
    seed: seed + 109,
    sway0: 0.44,
    sway1: 0.75,
    puffCenter: crownCenter,
    puff: 0.2,
    thick: accentPalette ? 0.3 : 0.24,
  });

  // 红梅/银杏/丹枫额外点缀几簇高光花枝与落英芽
  if (accentPalette) {
    for (let i = 0; i < 4; i++) {
      const a = baseAngle + i * 1.57 + rng.range(-0.3, 0.3);
      const dist = rng.range(0.45, 0.92);
      Ts(
        b,
        leanX + Math.cos(a) * dist,
        trunkH + rng.range(0.15, 0.68),
        leanZ + Math.sin(a) * dist,
        0.18,
        0.12,
        0.18,
        {
          detail: 0,
          seed: seed + 200 + i,
          bottom: cMid,
          top: cLight,
          glow: 0.08,
          swayBottom: 0.4,
          swayTop: 0.7,
        },
      );
    }
  }

  return bs(b);
}

/**
 * 2. 汴河垂柳 fN(seed) — 俯水老柳干 + 柔绿扁冠 + 20 条随风轻曳的细分柳丝垂帘
 */
function buildBianheWillow(api: FloraApi, seed: number): unknown {
  const { Be, ke, gn, Ho, bs, Pt, yt, Dn, Rh, Ch } = api;
  const rng = new ke(seed);
  const b = new Be();

  const trunkH = rng.range(2.1, 2.55);
  const bendX = rng.range(0.24, 0.45) * (rng.chance(0.5) ? 1 : -1);
  const bendZ = rng.range(-0.2, 0.2);

  gn(
    b,
    [
      [0, -0.22, 0, 0.3],
      [bendX * 0.42, trunkH * 0.48, bendZ * 0.4, 0.2],
      [bendX, trunkH, bendZ, 0.13],
      [bendX * 1.12, trunkH + 0.65, bendZ, 0.055],
    ],
    { sides: 5, c0: Rh, c1: Ch, sway1: 0.16 },
  );

  const wDark = yt(0x6b5626);
  const wMid = yt(0xa6873a);
  const wLight = yt(0xdec16a);
  const crownCenter = [bendX, trunkH + 0.24, bendZ];
  const baseAngle = rng.range(0, Dn);
  const hubs: number[][] = [];

  for (let i = 0; i < 4; i++) {
    const a = baseAngle + (i / 4) * Dn + rng.range(-0.24, 0.24);
    const d = rng.range(0.55, 0.78);
    const r = rng.range(0.78, 0.96);
    const x = bendX + Math.cos(a) * d;
    const z = bendZ + Math.sin(a) * d;
    const y = trunkH + rng.range(-0.02, 0.18);
    hubs.push([x, y, z, r]);
    Ho(b, x, y, z, r, {
      lobes: 7,
      dark: wDark,
      mid: Pt(wDark, wMid, 0.72),
      light: Pt(wMid, wLight, 0.4),
      seed: seed + i * 11,
      sway0: 0.32,
      sway1: 0.6,
      puffCenter: crownCenter,
      puff: 0.28,
      thick: 0.34,
    });
  }

  Ho(b, bendX, trunkH + 0.62, bendZ, 0.82, {
    lobes: 8,
    dark: Pt(wDark, wMid, 0.48),
    mid: wMid,
    light: wLight,
    seed: seed + 47,
    sway0: 0.45,
    sway1: 0.78,
    puffCenter: crownCenter,
    puff: 0.22,
    thick: 0.36,
  });

  // 20 挂三段式柔软柳枝帷幔（风吹拂水面）
  const curtainCount = 20;
  for (let i = 0; i < curtainCount; i++) {
    const hub = hubs[i % hubs.length];
    const ang = (i / curtainCount) * Dn + rng.range(-0.18, 0.18);
    const rad = hub[3] * rng.range(0.58, 0.96);
    const sx = hub[0] + Math.cos(ang) * rad;
    const sz = hub[2] + Math.sin(ang) * rad;
    const sy = hub[1] + 0.04;
    const drop = rng.range(0.95, 1.65);
    const outX = Math.cos(ang);
    const outZ = Math.sin(ang);
    const tangentX = -outZ;
    const tangentZ = outX;
    const rows: number[][] = [];
    for (let row = 0; row < 3; row++) {
      const v = row / 3;
      const width = 0.044 * (1 - 0.68 * v);
      const bend = 0.095 * Math.sin(v * Math.PI * 0.62);
      const color = Pt(wMid, wLight, v);
      const vertices: number[] = [];
      for (const side of [-1, 1]) {
        const twist = 0.008 * side * Math.sin(v * Math.PI * 2 + i * 0.7) * v;
        const normalTilt = side * 0.38;
        vertices.push(b.vertex(
          sx + outX * (bend + twist) + tangentX * side * width,
          sy - drop * v,
          sz + outZ * (bend + twist) + tangentZ * side * width,
          color, outX + tangentX * normalTilt, 0.2, outZ + tangentZ * normalTilt, 0.38 + v * 1.2,
        ));
      }
      if (row > 0) b.quad(rows[row - 1][0], rows[row - 1][1], vertices[1], vertices[0]);
      rows.push(vertices);
    }
    const tip = b.vertex(sx + outX * 0.08, sy - drop, sz + outZ * 0.08, wLight, outX, 0.1, outZ, 1.58);
    b.tri(rows[2][0], rows[2][1], tip);
  }

  return bs(b);
}

/**
 * 3. 唐宋修竹林 dN(seed) — 6~8 竿修长有竹节的翠竹 + 轻盈舒展的竹叶云梢（代替欧洲圆锥冷杉）
 */
function buildBambooGrove(api: FloraApi, seed: number): unknown {
  const { Be, ke, gn, Ho, bs, Pt, yt, Dn } = api;
  const rng = new ke(seed);
  const b = new Be();

  const stalkDark = yt(0x3b4832);
  const stalkLight = yt(0x758056);
  const nodeRing = yt(0xa8ab74);
  const leafDark = yt(0x2e3e2c);
  const leafMid = yt(0x5d6d48);
  const leafLight = yt(0xa2a666);

  const count = 6 + rng.int(3);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Dn + rng.range(-0.28, 0.28);
    const dist = i === 0 ? rng.range(0, 0.12) : rng.range(0.18, 0.56);
    const ox = Math.cos(a) * dist;
    const oz = Math.sin(a) * dist;
    const h = (i === 0 ? rng.range(3.0, 3.6) : rng.range(2.2, 3.2));
    const swayX = Math.cos(a + rng.range(-0.4, 0.4)) * rng.range(0.14, 0.34);
    const swayZ = Math.sin(a + rng.range(-0.4, 0.4)) * rng.range(0.14, 0.34);
    const segs = 5;
    const rings: number[][] = [];
    for (let s = 0; s <= segs; s++) {
      const t = s / segs;
      const curve = t * t;
      const r = 0.048 * (1 - t * 0.48);
      rings.push([ox + swayX * curve, -0.15 + h * t, oz + swayZ * curve, r]);
    }
    gn(b, rings, {
      sides: 5,
      c0: stalkDark,
      c1: stalkLight,
      sway0: 0,
      sway1: 0.42,
    });
    // 竹节凸环（每节一圈浅青竹节，唐宋绘竹特征）
    for (let s = 1; s < segs; s++) {
      const t = s / segs;
      const curve = t * t;
      const nx = ox + swayX * curve;
      const ny = -0.15 + h * t;
      const nz = oz + swayZ * curve;
      const r = 0.052 * (1 - t * 0.42);
      gn(
        b,
        [
          [nx, ny - 0.018, nz, r],
          [nx, ny + 0.018, nz, r * 1.15],
        ],
        { sides: 5, c0: nodeRing, c1: nodeRing, sway0: 0.15 * t, sway1: 0.42 * t },
      );
    }

    // 竿梢竹叶簇
    const topX = ox + swayX;
    const topZ = oz + swayZ;
    Ho(b, topX, h * 0.9, topZ, rng.range(0.46, 0.64), {
      lobes: 6,
      dark: leafDark,
      mid: leafMid,
      light: Pt(leafMid, leafLight, 0.55),
      seed: seed + i * 29,
      sway0: 0.36,
      sway1: 0.72,
      puffCenter: [topX, h * 0.82, topZ],
      puff: 0.25,
      thick: 0.26,
    });
    if (i < 4) {
      Ho(b, ox + swayX * 0.58 + Math.cos(a) * 0.16, h * 0.72, oz + swayZ * 0.58 + Math.sin(a) * 0.16, rng.range(0.38, 0.52), {
        lobes: 5,
        dark: leafDark,
        mid: leafMid,
        light: leafLight,
        seed: seed + i * 41 + 7,
        sway0: 0.28,
        sway1: 0.58,
        thick: 0.24,
      });
    }
  }

  return bs(b);
}

/**
 * 4. 峭壁千尺古柏 hN(seed) — 挺拔古柏干 + 4~5 层错落宽平古柏枝盘
 */
function buildCypressPine(api: FloraApi, seed: number): unknown {
  const { Be, ke, gn, Ho, bs, Pt, Ht, yt, Dn, Rh, Ch } = api;
  const rng = new ke(seed);
  const b = new Be();

  const h = rng.range(3.0, 4.1);
  const tiltX = rng.range(-0.18, 0.18);
  const tiltZ = rng.range(-0.18, 0.18);

  gn(
    b,
    [
      [0, -0.22, 0, 0.25],
      [tiltX * 0.4, h * 0.42, tiltZ * 0.4, 0.16],
      [tiltX, h * 0.88, tiltZ, 0.08],
    ],
    { sides: 5, c0: Rh, c1: Ch, sway0: 0, sway1: 0.15 },
  );

  const cDark = yt(0x1a2620);
  const cMid = yt(0x324236);
  const cLight = yt(0x5e6b54);
  const tiers = 5;
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1);
    const y = h * (0.24 + t * 0.64);
    const ox = tiltX * t + rng.range(-0.22, 0.22);
    const oz = tiltZ * t + rng.range(-0.22, 0.22);
    const r = (1.16 - t * 0.58) * rng.range(0.92, 1.08);
    Ho(b, ox, y, oz, r, {
      lobes: 10,
      dark: Ht(cDark, 0.88),
      mid: Pt(cDark, cMid, 0.42 + t * 0.38),
      light: Pt(cMid, cLight, 0.35 + t * 0.45),
      seed: seed + i * 19,
      sway0: 0.16 + t * 0.18,
      sway1: 0.36 + t * 0.28,
      puffCenter: [tiltX, h * 0.55, tiltZ],
      puff: 0.18,
      thick: 0.19,
    });
    // 附生错落侧枝小松簇，打破整齐叠饼感
    const sideCount = i < 3 ? 2 : 1;
    for (let sIdx = 0; sIdx < sideCount; sIdx++) {
      const a = rng.range(0, Dn) + sIdx * 2.1;
      Ho(b, ox + Math.cos(a) * r * 0.62, y - 0.1, oz + Math.sin(a) * r * 0.62, r * 0.56, {
        lobes: 7,
        dark: cDark,
        mid: cMid,
        light: cLight,
        seed: seed + 80 + i * 13 + sIdx,
        sway0: 0.2,
        sway1: 0.45,
        thick: 0.18,
      });
    }
  }

  return bs(b);
}

/**
 * 5. 御苑石畔花丛 uN(seed) — 小太湖石脚配低矮竹叶/蕨丛 + 唐风丹红/缃金牡丹花苞
 */
function buildGardenShrub(api: FloraApi, seed: number): unknown {
  const { Be, ke, Ho, Ts, bs, Pt, yt, Dn } = api;
  const rng = new ke(seed);
  const b = new Be();

  const cDark = yt(0x4d3422);
  const cMid = yt(0x87562c);
  const cLight = yt(0xc98c42);
  const stoneDark = yt(0x4d463f);
  const stoneLight = yt(0x877b6d);
  const petalRed = yt(0xc93b4b);
  const petalGold = yt(0xf2be5c);

  // 嵌一小块青苔太湖庭园石
  Ts(b, rng.range(-0.12, 0.12), 0.16, rng.range(-0.12, 0.12), 0.26, 0.22, 0.22, {
    detail: 0,
    bump: 0.28,
    seed: seed + 1,
    bottom: stoneDark,
    top: stoneLight,
    flat: true,
  });

  const count = 2 + rng.int(2);
  for (let i = 0; i < count; i++) {
    const a = rng.range(0, Dn);
    const d = i === 0 ? 0.04 : rng.range(0.24, 0.44);
    const rad = i === 0 ? rng.range(0.46, 0.6) : rng.range(0.32, 0.44);
    const cx = Math.cos(a) * d;
    const cy = rad * (i === 0 ? 0.36 : 0.24);
    const cz = Math.sin(a) * d;
    Ho(b, cx, cy, cz, rad, {
      lobes: 6,
      dark: cDark,
      mid: cMid,
      light: Pt(cMid, cLight, 0.55),
      seed: seed + i * 7,
      sway0: 0.06,
      sway1: 0.26,
      puffCenter: [0, 0.1, 0],
      puff: 0.25,
      thick: 0.38,
    });
    if (rng.chance(0.7)) {
      Ts(b, cx + rng.range(-0.1, 0.1), cy + rad * 0.22, cz + rng.range(-0.1, 0.1), 0.075, 0.06, 0.075, {
        detail: 0,
        seed: seed + 30 + i,
        bottom: petalRed,
        top: Pt(petalRed, petalGold, 0.55),
        glow: 0.12,
        swayBottom: 0.12,
        swayTop: 0.28,
      });
    }
  }

  return bs(b);
}

/**
 * 6. 苔石灵芝丛 mN(seed) — 彻底消灭红点西式卡通毒蘑菇！
 *    改为青灰苔石上层叠生出的琥珀金边灵芝群与细金野菊花蕊。
 */
function buildLingzhiCluster(api: FloraApi, seed: number): unknown {
  const { Be, ke, gn, Ts, bs, Pt, Ht, yt, Dn } = api;
  const rng = new ke(seed);
  const b = new Be();

  const stoneBot = yt(0x47403a);
  const stoneTop = yt(0x7a6e5f);
  const stemCol = yt(0x4c2414);
  const capDeep = yt(0x7a3418);
  const capEdge = yt(0xd99b43);
  const budCol = yt(0xf7dc88);

  // 低矮青苔石墩
  Ts(b, 0, 0.12, 0, 0.36, 0.18, 0.32, {
    detail: 0,
    bump: 0.25,
    seed,
    bottom: stoneBot,
    top: stoneTop,
    flat: true,
  });

  // 2~3 株扇形古铜金边灵芝
  const count = 2 + rng.int(2);
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Dn + rng.range(-0.3, 0.3);
    const dist = i === 0 ? 0.02 : rng.range(0.18, 0.32);
    const bx = Math.cos(ang) * dist;
    const bz = Math.sin(ang) * dist;
    const h = i === 0 ? rng.range(0.32, 0.44) : rng.range(0.2, 0.32);
    const rCap = h * rng.range(0.55, 0.72);
    const dirX = Math.cos(ang);
    const dirZ = Math.sin(ang);

    gn(
      b,
      [
        [bx, 0.12, bz, 0.045],
        [bx + dirX * 0.03, h * 0.7, bz + dirZ * 0.03, 0.035],
        [bx + dirX * 0.06, h, bz + dirZ * 0.06, 0.04],
      ],
      { sides: 5, c0: stemCol, c1: Pt(stemCol, capDeep, 0.5) },
    );

    // 扁平扇形灵芝菌盖（云纹边缘，暖金渐层）
    const cx = bx + dirX * 0.1;
    const cz = bz + dirZ * 0.1;
    const topV = b.vertex(cx, h + rCap * 0.24, cz, capDeep, 0, 1, 0);
    const botV = b.vertex(cx, h - 0.02, cz, Ht(capDeep, 0.65), 0, -1, 0);
    const rim: number[] = [];
    const segs = 8;
    for (let k = 0; k < segs; k++) {
      const ka = (k / segs) * Dn;
      const lob = 1 + 0.16 * Math.sin(ka * 3 + seed);
      const vx = cx + Math.cos(ka) * rCap * lob;
      const vz = cz + Math.sin(ka) * rCap * 0.84 * lob;
      rim.push(b.vertex(vx, h + 0.04, vz, capEdge, Math.cos(ka) * 0.35, 0.85, Math.sin(ka) * 0.35, 0, 0.14));
    }
    for (let k = 0; k < segs; k++) {
      const nxt = (k + 1) % segs;
      b.tri(topV, rim[nxt], rim[k]);
      b.tri(botV, rim[k], rim[nxt]);
    }
  }

  // 一点秋菊小金花蕾
  for (let i = 0; i < 2; i++) {
    const a = rng.range(0, Dn);
    Ts(b, Math.cos(a) * 0.28, 0.24, Math.sin(a) * 0.28, 0.05, 0.04, 0.05, {
      detail: 0,
      seed: seed + 70 + i,
      bottom: capEdge,
      top: budCol,
      glow: 0.18,
    });
  }

  return bs(b);
}

/**
 * 7. 悬崖赤灵芝 / 古木耳 gN(seed) — 取代崖壁刺眼荧光青菌扇，全暖赭赤褐色零自发光
 */
function buildCliffBracketMoss(api: FloraApi, seed: number): unknown {
  const { Be, ke, bs, yt } = api;
  const rng = new ke(seed);
  const b = new Be();
  const darkBark = yt(0x592917);
  const warmRim = yt(0xba6b32);
  const shelves = 2 + rng.int(2);

  for (let i = 0; i < shelves; i++) {
    const y = i * rng.range(0.15, 0.22);
    const rad = rng.range(0.18, 0.3) * (1 - i * 0.15);
    const zOff = rng.range(-0.14, 0.14);
    const topV = b.vertex(-0.02, y + 0.06, zOff, darkBark, 0.2, 1, 0, 0, 0, 1, 0.72);
    const botV = b.vertex(-0.02, y - 0.055, zOff, darkBark, 0, -1, 0, 0, 0, 1, 0.65);
    const rim: number[] = [];
    const segs = 6;
    for (let m = 0; m <= segs; m++) {
      const ang = -Math.PI / 2 + (m / segs) * Math.PI;
      const lob = 1 + 0.12 * Math.sin(m * 1.9 + i);
      rim.push(
        b.vertex(
          Math.cos(ang) * rad * lob,
          y + 0.01,
          zOff + Math.sin(ang) * rad * 1.18 * lob,
          warmRim,
          Math.cos(ang) * 0.45,
          0.8,
          Math.sin(ang) * 0.45,
          0,
          0,
        ),
      );
    }
    for (let m = 0; m < segs; m++) {
      b.tri(topV, rim[m + 1], rim[m]);
      b.tri(botV, rim[m], rim[m + 1]);
    }
  }
  return bs(b);
}

/**
 * 8. 唐宋庭园木钩宫灯 / 青石雪见灯笼 __(seed, isSmall) — 取代原版弯茎悬橘球与青色风铃
 */
function buildGardenLantern(api: FloraApi, seed: number, isSmall = false): unknown {
  const { Be, ke, gn, Ts, bs, Ht, yt } = api;
  const rng = new ke(seed);
  const b = new Be();
  const stoneDark = yt(0x524c44);
  const stoneLight = yt(0x968c7d);
  const lacquerDark = yt(0x3b140d);
  const lacquer = yt(0x782319);
  const bronzeGold = yt(0xe3b450);

  if (isSmall) {
    // 青石雪见石灯笼（紧凑矮蹲于水岸石阶旁）
    const warmCore = yt(0xffcf72);
    gn(
      b,
      [
        [0, -0.05, 0, 0.24],
        [0, 0.1, 0, 0.2],
        [0, 0.16, 0, 0.13],
        [0, 0.34, 0, 0.12],
      ],
      { sides: 6, c0: stoneDark, c1: stoneLight, cap: true },
    );
    Ts(b, 0, 0.44, 0, 0.11, 0.12, 0.11, {
      detail: 0,
      seed,
      bottom: warmCore,
      top: [1, 0.96, 0.8],
      glow: 0.72,
    });
    gn(
      b,
      [
        [0, 0.52, 0, 0.28],
        [0, 0.56, 0, 0.29],
        [0, 0.68, 0, 0.1],
        [0, 0.78, 0, 0.03],
      ],
      { sides: 6, c0: stoneDark, c1: bronzeGold, cap: true },
    );
    return bs(b);
  }

  // 唐宋木钩悬灯灯柱（古石础 + 直挺紫檀木柱 + 挑梁 + 垂挂八角琥珀宫灯）
  const amberBot = yt(0xffa638);
  const amberTop = yt(0xffefad);
  const yaw = rng.range(0, 6.28);
  const reachX = Math.cos(yaw) * 0.42;
  const reachZ = Math.sin(yaw) * 0.42;

  gn(
    b,
    [
      [0, -0.05, 0, 0.16],
      [0, 0.12, 0, 0.14],
    ],
    { sides: 6, c0: stoneDark, c1: stoneLight, cap: true },
  );
  gn(
    b,
    [
      [0, 0.12, 0, 0.06],
      [0, 1.42, 0, 0.048],
    ],
    { sides: 6, c0: lacquerDark, c1: lacquer, cap: true },
  );
  // 上挑木悬臂
  gn(
    b,
    [
      [0, 1.34, 0, 0.042],
      [reachX * 0.6, 1.4, reachZ * 0.6, 0.036],
      [reachX, 1.38, reachZ, 0.028],
    ],
    { sides: 5, c0: lacquer, c1: bronzeGold, cap: true },
  );
  // 垂索 + 宫灯帽 + 八角琥珀灯芯
  gn(
    b,
    [
      [reachX, 1.38, reachZ, 0.014],
      [reachX, 1.24, reachZ, 0.014],
    ],
    { sides: 4, c0: bronzeGold, c1: bronzeGold },
  );
  gn(
    b,
    [
      [reachX, 1.24, reachZ, 0.05],
      [reachX, 1.18, reachZ, 0.16],
    ],
    { sides: 8, c0: bronzeGold, c1: lacquer, cap: true },
  );
  Ts(b, reachX, 1.03, reachZ, 0.13, 0.16, 0.13, {
    detail: 1,
    seed: seed + 17,
    bottom: amberBot,
    top: amberTop,
    glow: 0.85,
  });
  gn(
    b,
    [
      [reachX, 0.88, reachZ, 0.12],
      [reachX, 0.82, reachZ, 0.03],
    ],
    { sides: 8, c0: Ht(lacquerDark, 0.9), c1: bronzeGold, cap: true },
  );
  return bs(b);
}

export function createTangSongFlora(api: FloraApi) {
  return {
    ancientPine: (seed: number, accent?: AccentTreePalette) => buildAncientPine(api, seed, accent),
    willow: (seed: number) => buildBianheWillow(api, seed),
    bamboo: (seed: number) => buildBambooGrove(api, seed),
    cypress: (seed: number) => buildCypressPine(api, seed),
    shrub: (seed: number) => buildGardenShrub(api, seed),
    lingzhi: (seed: number) => buildLingzhiCluster(api, seed),
    cliffMoss: (seed: number) => buildCliffBracketMoss(api, seed),
    gardenLantern: (seed: number, isSmall?: boolean) => buildGardenLantern(api, seed, isSmall),
  };
}
