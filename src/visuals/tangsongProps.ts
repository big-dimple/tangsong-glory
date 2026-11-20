/**
 * tangsongProps.ts — 唐宋建筑群配件、汴河虹桥、御街牌坊、河灯莲池与《千里江山》远山古塔工坊
 *
 * 彻底改造：
 * - 基地城墙 PN / DN / zN / LN / IN / NN / uF：青砖挑檐女墙、马面扶壁、朱金八角龙纹壁、门阙朱柱、飞檐宫灯阙顶、白玉莲池栏杆
 * - 地图地标 MN / YF / KF / q_ / X_ / K_ / Y_：燕尾朱漆帅旗、镇宅石狮（消灭西式兜帽雕像）、螭首青石碑、古铜纹路缘、汴河拴船石柱
 * - 汴河与御街新增地标：中路宋代虹桥朱漆栏杆 + 大红宫灯、蓝/红御街飞檐牌坊、汴河漂浮荷花河灯
 * - 远景天际线 aU()：删除 150m 外星蓝晶巨碑与浮空石块，重塑《千里江山图》青绿黛山与远山古塔轮廓
 */

import type { BeLike, RngLike } from './tangsongFlora';

export interface PropsApi {
  Be: new () => BeLike;
  ke: new (seed: number) => RngLike;
  Ke: new () => { identity(): unknown; makeTranslation(x: number, y: number, z: number): unknown };
  yf: (
    b: BeLike,
    mat: unknown,
    w: number,
    d: number,
    h: number,
    bevel: number,
    cTop: number[],
    cBot: number[],
    glow?: number,
  ) => void;
  gn: (b: BeLike, rings: number[][], opts: Record<string, unknown>) => void;
  Xo: (
    b: BeLike,
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
    b: BeLike,
    x: number,
    y: number,
    z: number,
    rx: number,
    ry: number,
    rz: number,
    opts: Record<string, unknown>,
  ) => void;
  Ho?: (b: BeLike, x: number, y: number, z: number, r: number, opts: Record<string, unknown>) => void;
  bs: (b: BeLike) => unknown;
  Pt: (a: number[], b: number[], t: number) => number[];
  Ht: (c: number[], k: number) => number[];
  yt: (hex: number) => number[];
  nn: (a: number, b: number, c: number) => number;
  un?: (x: number, y: number, oct: number, seed: number) => number;
  vr: (x: number, z: number) => number;
  ae: (x: number, y: number, z: number, ry: number, s?: number, sy?: number, rx?: number, rz?: number) => unknown;
  Qc?: (opts: Record<string, unknown>) => unknown;
  Sn?: new (geo: unknown, mat: unknown) => {
    name: string;
    matrixAutoUpdate: boolean;
    frustumCulled: boolean;
  };
  env: Record<string, number>;
  waterLevel: number;
}

export interface BaseWallTheme {
  stone: number[];
  stoneDark: number[];
  trim: number[];
  glow: number[];
  cloth: number[];
}

export interface MapSdfLike {
  map: {
    bound: number;
    laneWidth: number;
    riverWidth: number;
    lanes: Record<string, { x: number; y: number }[]>;
    camps: { pos: { x: number; y: number }; monsterType: string }[];
  };
  riverLine: { x: number; y: number }[];
  laneDist(x: number, z: number): number;
  riverDist(x: number, z: number): number;
  baseDist(x: number, z: number, margin?: number): number;
  padDist(x: number, z: number): number;
  solidDist(x: number, z: number): number;
  boundDist(x: number, z: number): number;
  campDist(x: number, z: number): number;
}

export interface SceneryAccumLike {
  add(geo: unknown, mat4: unknown, opts?: Record<string, unknown>): void;
  at(x: number, z: number, shadow?: boolean): BeLike;
}

const TAU = Math.PI * 2;

function addWorldBox(
  b: BeLike,
  cx: number,
  cy: number,
  cz: number,
  w: number,
  h: number,
  d: number,
  cTop: number[],
  cBot: number[],
  glow = 0,
): void {
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const y0 = cy - h / 2;
  const y1 = cy + h / 2;
  const z0 = cz - d / 2;
  const z1 = cz + d / 2;

  const q = (
    p0: [number, number, number],
    p1: [number, number, number],
    p2: [number, number, number],
    p3: [number, number, number],
    nx: number,
    ny: number,
    nz: number,
    cA: number[],
    cB: number[],
  ) => {
    const v0 = b.vertex(p0[0], p0[1], p0[2], cA, nx, ny, nz, 0, glow);
    const v1 = b.vertex(p1[0], p1[1], p1[2], cA, nx, ny, nz, 0, glow);
    const v2 = b.vertex(p2[0], p2[1], p2[2], cB, nx, ny, nz, 0, glow);
    const v3 = b.vertex(p3[0], p3[1], p3[2], cB, nx, ny, nz, 0, glow);
    b.quad(v0, v1, v2, v3);
  };

  // Top & Bottom
  q([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], 0, 1, 0, cTop, cTop);
  q([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], 0, -1, 0, cBot, cBot);
  // Sides (+X, -X, +Z, -Z)
  q([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], 1, 0, 0, cBot, cTop);
  q([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], -1, 0, 0, cBot, cTop);
  q([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], 0, 0, 1, cBot, cTop);
  q([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], 0, 0, -1, cBot, cTop);
}

/**
 * 1. 唐宋基地城垣与门阙配件 w_(team) + 泉水白玉栏杆 uF(...)
 */
export function createBaseWallBuilders(api: PropsApi) {
  const { Be, Ke, yf, gn, Pt, Ht, yt } = api;
  const slateTile = yt(0x263333);
  const slateHi = yt(0x3a4a49);
  const lacquer = yt(0x7c1f17);
  const lacquerDark = yt(0x47110c);
  const bronzeGold = yt(0xd9a848);
  const darkGold = yt(0x8c6320);
  const marble = yt(0xd8cfbc);
  const marbleDark = yt(0x9a8f7a);
  const warmFlame = [1, 0.78, 0.36];
  const warmFlameTop = [1, 0.94, 0.72];

  // PN(t): 青砖挑檐女墙垛口（替代浅米色方块）
  function merlon(th: BaseWallTheme) {
    const b = new Be();
    const m = new Ke();
    const brickBase = Pt(th.stoneDark, yt(0x4a5250), 0.52);
    const brickTop = Pt(th.stone, yt(0x6c7571), 0.45);
    m.identity();
    yf(b, m, 0.96, 0.58, 0.58, 0.02, brickTop, brickBase);
    // 垛口箭孔暗凹线
    addWorldBox(b, 0, 0.32, 0, 0.14, 0.34, 0.6, Pt(brickBase, [0.1, 0.1, 0.1], 0.5), brickBase);
    // 挑檐青灰坡顶压帽 + 微金色边脊
    m.makeTranslation(0, 0.58, 0);
    yf(b, m, 1.12, 0.72, 0.13, 0.04, slateHi, slateTile);
    addWorldBox(b, 0, 0.71, 0, 1.06, 0.04, 0.12, bronzeGold, darkGold);
    return b.build();
  }

  // DN(t): 马面砖石扶壁（沿 +X 朝外）
  function buttress(th: BaseWallTheme) {
    const b = new Be();
    const e = 0.42;
    const brickDark = Pt(th.stoneDark, yt(0x383f3e), 0.45);
    const brick = Pt(th.stone, yt(0x636b67), 0.5);
    const pts = [
      [0.54, -0.1],
      [0.54, 0.34],
      [0.4, 0.5],
      [0.32, 1.52],
      [0.2, 1.7],
      [0.12, 2.34],
      [0.0, 2.46],
    ];
    const qFace = (p0: number[], p1: number[], p2: number[], p3: number[], c0: number[], c1: number[]) => {
      const u = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
      const v = [p3[0] - p0[0], p3[1] - p0[1], p3[2] - p0[2]];
      let nx = u[1] * v[2] - u[2] * v[1];
      let ny = u[2] * v[0] - u[0] * v[2];
      let nz = u[0] * v[1] - u[1] * v[0];
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;
      b.quad(
        b.vertex(p0[0], p0[1], p0[2], c0, nx, ny, nz),
        b.vertex(p1[0], p1[1], p1[2], c0, nx, ny, nz),
        b.vertex(p2[0], p2[1], p2[2], c1, nx, ny, nz),
        b.vertex(p3[0], p3[1], p3[2], c1, nx, ny, nz),
      );
    };
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      const t0 = i / (pts.length - 1);
      const t1 = (i + 1) / (pts.length - 1);
      const c0 = i >= pts.length - 2 ? slateTile : Pt(brickDark, brick, t0);
      const c1 = i >= pts.length - 2 ? slateHi : Pt(brickDark, brick, t1);
      qFace([x0, y0, e], [x0, y0, -e], [x1, y1, -e], [x1, y1, e], c0, c1);
      qFace([-0.1, y0, e], [x0, y0, e], [x1, y1, e], [-0.1, y1, e], Ht(c0, 0.9), Ht(c1, 0.9));
      qFace([x0, y0, -e], [-0.1, y0, -e], [-0.1, y1, -e], [x1, y1, -e], Ht(c0, 0.9), Ht(c1, 0.9));
    }
    // 腰线朱金箍带与顶部挑檐 tile 帽
    qFace([0.41, 0.5, e + 0.01], [0.41, 0.5, -e - 0.01], [0.4, 0.6, -e - 0.01], [0.4, 0.6, e + 0.01], bronzeGold, bronzeGold);
    qFace([0.22, 1.66, e + 0.015], [0.22, 1.66, -e - 0.015], [0.18, 1.76, -e - 0.015], [0.18, 1.76, e + 0.015], lacquer, bronzeGold);
    return b.build();
  }

  // zN(t, isRed): 八角朱漆鎏金宫墙徽璧（取代西方八角星盾，+X 朝外）
  function emblem(th: BaseWallTheme, isRed: boolean) {
    const b = new Be();
    const rad = 0.86;
    const segs = 8;
    const frameDark = th.stoneDark;
    const plaqueCol = isRed ? lacquer : Pt(yt(0x1f6b64), lacquer, 0.35);
    const center = b.vertex(0.11, 0, 0, plaqueCol, 1, 0, 0);
    const innerRing: number[] = [];
    const outerRing: number[] = [];
    for (let i = 0; i < segs; i++) {
      const a = ((i + 0.5) / segs) * TAU;
      innerRing.push(b.vertex(0.1, Math.sin(a) * rad * 0.84, Math.cos(a) * rad * 0.84, plaqueCol, 1, 0, 0));
      outerRing.push(
        b.vertex(0.0, Math.sin(a) * rad, Math.cos(a) * rad, frameDark, 0.45, Math.sin(a) * 0.88, Math.cos(a) * 0.88),
      );
    }
    for (let i = 0; i < segs; i++) {
      const nxt = (i + 1) % segs;
      b.tri(center, innerRing[i], innerRing[nxt]);
      b.quad(innerRing[i], outerRing[i], outerRing[nxt], innerRing[nxt]);
    }
    // 鎏金八角边圈与回纹中印（极微暖光，绝非星盾）
    const ribbon = (pts: number[][], halfW: number, glow = 0.14) => {
      for (let i = 0; i < pts.length; i++) {
        const [y0, z0] = pts[i];
        const [y1, z1] = pts[(i + 1) % pts.length];
        const dy = y1 - y0;
        const dz = z1 - z0;
        const len = Math.hypot(dy, dz) || 1;
        const py = (-dz / len) * halfW;
        const pz = (dy / len) * halfW;
        const v0 = b.vertex(0.125, y0 - py, z0 - pz, bronzeGold, 1, 0, 0, 0, glow);
        const v1 = b.vertex(0.125, y0 + py, z0 + pz, bronzeGold, 1, 0, 0, 0, glow);
        const v2 = b.vertex(0.125, y1 + py, z1 + pz, bronzeGold, 1, 0, 0, 0, glow);
        const v3 = b.vertex(0.125, y1 - py, z1 - pz, bronzeGold, 1, 0, 0, 0, glow);
        b.quad(v0, v1, v2, v3);
        b.quad(v3, v2, v1, v0);
      }
    };
    const rimPts: number[][] = [];
    const innerPts: number[][] = [];
    for (let i = 0; i < 8; i++) {
      const a = ((i + 0.5) / 8) * TAU;
      rimPts.push([Math.sin(a) * rad * 0.72, Math.cos(a) * rad * 0.72]);
      innerPts.push([Math.sin(a) * rad * 0.36, Math.cos(a) * rad * 0.36]);
    }
    ribbon(rimPts, 0.032, 0.15);
    ribbon(innerPts, 0.025, 0.2);
    ribbon(
      [
        [-0.16, -0.16],
        [0.16, -0.16],
        [0.16, 0.16],
        [-0.16, 0.16],
      ],
      0.025,
      0.22,
    );
    return b.build();
  }

  // LN(t): 唐宋朱漆御城门阙柱（白玉须弥石基 + 圆柱朱漆柱身 + 鎏金斗拱托）
  function gatePillar(th: BaseWallTheme) {
    const b = new Be();
    // 汉白玉须弥基墩（y=-0.2..0.85）
    gn(
      b,
      [
        [0, -0.2, 0, 0.94],
        [0, 0.42, 0, 0.94],
        [0, 0.52, 0, 0.78],
        [0, 0.8, 0, 0.78],
      ],
      { sides: 8, c0: Pt(th.stoneDark, marbleDark, 0.45), c1: Pt(th.stone, marble, 0.45), cap: true },
    );
    // 朱漆木门阙主柱（y=0.8..3.25）
    gn(
      b,
      [
        [0, 0.8, 0, 0.56],
        [0, 3.22, 0, 0.48],
      ],
      { sides: 10, c0: lacquerDark, c1: lacquer, cap: true },
    );
    // 两道古铜金箍 + 顶部额枋斗拱承盘
    for (const yBand of [1.22, 2.74]) {
      gn(
        b,
        [
          [0, yBand, 0, 0.57],
          [0, yBand + 0.14, 0, 0.56],
        ],
        { sides: 10, c0: darkGold, c1: bronzeGold },
      );
    }
    gn(
      b,
      [
        [0, 3.2, 0, 0.62],
        [0, 3.36, 0, 0.76],
        [0, 3.55, 0, 0.78],
        [0, 3.62, 0, 0.68],
      ],
      { sides: 4, phase: 45, c0: lacquerDark, c1: bronzeGold, cap: true },
    );
    return b.build();
  }

  // IN(t): 门阙双层重檐飞角望楼亭盖 + 暖金悬灯 + 御铜葫芦宝顶（消除扁平盖与白色大光球）
  function gateRoofCap(th: BaseWallTheme) {
    const b = new Be();
    const isRed = th.glow[0] > th.glow[1];
    const glazedDark = isRed ? yt(0x4e1410) : yt(0x1b3044);
    const glazedHi = isRed ? yt(0x9e281d) : yt(0x3e6f94);

    // 暗木暖灯明堂亭身（y=3.24..3.72，露出崖草上方）
    addWorldBox(b, 0, 3.48, 0, 1.06, 0.48, 1.06, lacquer, lacquerDark);
    addWorldBox(b, 0, 3.48, 0, 1.1, 0.28, 0.72, warmFlame, yt(0xd98026), 0.55);
    addWorldBox(b, 0, 3.48, 0, 0.72, 0.28, 1.1, warmFlame, yt(0xd98026), 0.55);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      addWorldBox(b, Math.cos(a) * 0.56, 3.48, Math.sin(a) * 0.56, 0.14, 0.5, 0.14, bronzeGold, darkGold);
    }

    // 下层飞檐四坡大屋顶（y=3.72..4.28, seg=4, phase=45）
    gn(
      b,
      [
        [0, 3.7, 0, 1.28],
        [0, 3.82, 0, 1.16],
        [0, 4.04, 0, 0.84],
        [0, 4.28, 0, 0.58],
      ],
      { sides: 4, phase: 45, c0: glazedDark, c1: glazedHi, cap: true },
    );
    // 二层重檐阁顶（y=4.28..4.68）
    gn(
      b,
      [
        [0, 4.26, 0, 0.84],
        [0, 4.38, 0, 0.68],
        [0, 4.56, 0, 0.36],
        [0, 4.68, 0, 0.16],
      ],
      { sides: 4, phase: 45, c0: glazedDark, c1: glazedHi, cap: true },
    );

    // 四角翘脊金角梁 + 檐下温暖小宫灯
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      const tipX = Math.cos(a) * 1.3;
      const tipZ = Math.sin(a) * 1.3;
      addWorldBox(b, Math.cos(a) * 1.16, 3.76, Math.sin(a) * 1.16, 0.22, 0.12, 0.22, bronzeGold, darkGold);
      addWorldBox(b, tipX, 3.84, tipZ, 0.14, 0.14, 0.14, bronzeGold, darkGold, 0.18);
      addWorldBox(b, Math.cos(a) * 0.72, 4.34, Math.sin(a) * 0.72, 0.16, 0.12, 0.16, bronzeGold, darkGold);
      const lx = Math.cos(a) * 1.16;
      const lz = Math.sin(a) * 1.16;
      gn(
        b,
        [
          [lx, 3.4, lz, 0.08],
          [lx, 3.58, lz, 0.09],
        ],
        { sides: 6, c0: lacquer, c1: warmFlame, cap: true },
      );
      api.Ts(b, lx, 3.48, lz, 0.11, 0.14, 0.11, {
        detail: 0,
        seed: 31 + i,
        bottom: warmFlame,
        top: warmFlameTop,
        glow: 0.65,
      });
    }

    // 顶央雅致古铜葫芦宝顶（y=4.68..5.08，微暖金光，告别白刺眼大球）
    gn(
      b,
      [
        [0, 4.68, 0, 0.2],
        [0, 4.78, 0, 0.22],
        [0, 4.88, 0, 0.1],
        [0, 4.98, 0, 0.13],
        [0, 5.08, 0, 0.025],
      ],
      { sides: 8, c0: darkGold, c1: bronzeGold, cap: true },
    );
    return b.build();
  }

  // NN(t): 汉白玉六角庭园石灯笼（暖琥珀烛火芯，取代电光青灯）
  function lowLamp(th: BaseWallTheme) {
    const b = new Be();
    gn(
      b,
      [
        [0, -0.05, 0, 0.21],
        [0, 0.1, 0, 0.21],
        [0, 0.14, 0, 0.13],
        [0, 0.22, 0, 0.11],
        [0, 0.26, 0, 0.17],
      ],
      { sides: 6, c0: th.stoneDark, c1: th.stone, cap: true },
    );
    api.Ts(b, 0, 0.34, 0, 0.085, 0.095, 0.085, {
      detail: 0,
      seed: 5,
      bottom: warmFlame,
      top: warmFlameTop,
      glow: 0.78,
    });
    gn(
      b,
      [
        [0, 0.42, 0, 0.19],
        [0, 0.5, 0, 0.04],
      ],
      { sides: 6, c0: slateTile, c1: bronzeGold, cap: true },
    );
    return b.build();
  }

  // uF(...): 汉白玉八角荷花池栏望柱围边（取代现代环砖池沿）
  function fountainCurb(
    accum: SceneryAccumLike,
    cx: number,
    cz: number,
    radius: number,
    th: { stone: number[]; stoneDark: number[]; trim: number[] },
    bound: number,
  ) {
    const b = accum.at(cx, cz, false);
    const segs = 32;
    const rIn = radius * 0.875;
    const rOut = radius * 0.985;
    const curbTop = Pt(th.stone, marble, 0.35);
    const curbBot = th.stoneDark;
    for (let u = 0; u < segs; u++) {
      const a0 = (u / segs) * TAU;
      const a1 = ((u + 1) / segs) * TAU;
      const am = (a0 + a1) / 2;
      if (Math.max(Math.abs(cx + Math.cos(am) * rOut), Math.abs(cz + Math.sin(am) * rOut)) > bound - 0.05) {
        continue;
      }
      const k = 0.92 + ((u * 7) % 5) * 0.025;
      const cTop = Ht(curbTop, k);
      const pad = 0.012;
      const ca0 = Math.cos(a0 + pad);
      const sa0 = Math.sin(a0 + pad);
      const ca1 = Math.cos(a1 - pad);
      const sa1 = Math.sin(a1 - pad);
      const g0 = Math.cos(a0);
      const s0 = Math.sin(a0);
      const g1 = Math.cos(a1);
      const s1 = Math.sin(a1);
      const v = (r: number, x: number, z: number, y: number, col: number[], nx: number, ny: number, nz: number) =>
        b.vertex(cx + x * r, y, cz + z * r, col, nx, ny, nz);
      // 白玉石沿平盖 + 内外立邦
      b.quad(
        v(rIn + 0.02, ca0, sa0, 0.12, cTop, 0, 1, 0),
        v(rIn + 0.02, ca1, sa1, 0.12, cTop, 0, 1, 0),
        v(rOut - 0.02, ca1, sa1, 0.12, cTop, 0, 1, 0),
        v(rOut - 0.02, ca0, sa0, 0.12, cTop, 0, 1, 0),
      );
      const nx = Math.cos(am);
      const nz = Math.sin(am);
      b.quad(
        v(rOut, g0, s0, -0.02, curbBot, nx, 0.3, nz),
        v(rOut - 0.02, g0, s0, 0.12, cTop, nx, 0.3, nz),
        v(rOut - 0.02, g1, s1, 0.12, cTop, nx, 0.3, nz),
        v(rOut, g1, s1, -0.02, curbBot, nx, 0.3, nz),
      );
      b.quad(
        v(rIn, g1, s1, -0.02, curbBot, -nx, 0.3, -nz),
        v(rIn + 0.02, g1, s1, 0.12, cTop, -nx, 0.3, -nz),
        v(rIn + 0.02, g0, s0, 0.12, cTop, -nx, 0.3, -nz),
        v(rIn, g0, s0, -0.02, curbBot, -nx, 0.3, -nz),
      );

      // 每 4 段起一座汉白玉雕莲望柱
      if (u % 4 === 0) {
        const px = cx + Math.cos(a0) * (rIn + rOut) * 0.5;
        const pz = cz + Math.sin(a0) * (rIn + rOut) * 0.5;
        if (Math.max(Math.abs(px), Math.abs(pz)) <= bound - 0.25) {
          addWorldBox(b, px, 0.22, pz, 0.24, 0.24, 0.24, cTop, curbBot);
          addWorldBox(b, px, 0.38, pz, 0.16, 0.1, 0.16, bronzeGold, darkGold);
        }
      }
    }
  }

  return { merlon, buttress, emblem, gatePillar, gateCrystal: gateRoofCap, lowLamp, fountainCurb };
}

/**
 * 2. 唐宋地标道具工坊：燕尾帅旗 / 镇宅石狮 / 螭首青石碑 / 虹桥朱栏 / 御街牌坊 / 汴河莲花河灯
 */
export function createLandmarkPropBuilders(api: PropsApi) {
  const { Be, ke, gn, Xo, Ts, bs, Pt, Ht, yt } = api;

  const stoneDark = yt(0x4c5652);
  const stoneMid = yt(0x7c867e);
  const stoneLight = yt(0xb0b7ab);
  const stoneStele = yt(0x3a4240);
  const lacquer = yt(0x7c1f17);
  const lacquerDark = yt(0x46100b);
  const bronzeGold = yt(0xd9a848);
  const darkGold = yt(0x8c6320);
  const crimsonCloth = yt(0xaa2319);
  const roofSlate = yt(0x233030);
  const warmAmber = [1, 0.8, 0.38];
  const warmAmberTop = [1, 0.95, 0.76];

  // 燕尾朱漆大帅旗 / 军幡（双面网格 + 金边框 + maskedTint 可随阵营染色）
  function buildBanner(poleH: number, width: number, length: number) {
    const b = new Be();
    // 朱漆旗杆 + 鎏金宝顶 + 横挑杆
    gn(
      b,
      [
        [0, -0.15, 0, 0.075],
        [0, poleH, 0, 0.055],
      ],
      { sides: 6, c0: lacquerDark, c1: lacquer },
    );
    gn(
      b,
      [
        [-width * 0.56, poleH - 0.26, 0, 0.036],
        [width * 0.56, poleH - 0.26, 0, 0.036],
      ],
      { sides: 5, c0: bronzeGold, c1: bronzeGold },
    );
    Xo(b, 0, poleH + 0.02, 0, 0.36, 0.09, 0, 0, bronzeGold, Ht(bronzeGold, 1.25), 0.16, 5);

    // 燕尾垂幡（主布面 team=1 染色 + 金边 team=0 锁定）
    const rows = 6;
    const cols = 4;
    const yStart = poleH - 0.28;
    const buildGrid = (zOff: number, flip: boolean) => {
      const grid: number[][] = [];
      for (let r = 0; r <= rows; r++) {
        const vr = r / rows;
        const rowV: number[] = [];
        for (let c = 0; c <= cols; c++) {
          const vc = c / cols;
          const x = (vc - 0.5) * width;
          const swallow = r === rows ? (1 - Math.abs(vc - 0.5) * 2) * 0.34 : 0;
          const y = yStart - vr * length + swallow;
          const isTrim = Math.abs(vc - 0.5) > 0.38 || r === 0;
          const tintCol = isTrim ? bronzeGold : [0.88 + 0.12 * (1 - vr), 0.88 + 0.12 * (1 - vr), 0.88 + 0.12 * (1 - vr)];
          const sway = vr * vr * 0.82;
          const z = zOff + Math.sin(vr * 4 + vc * 2) * 0.035;
          rowV.push(b.vertex(x, y, z, tintCol, 0, 0.12, flip ? -1 : 1, sway, isTrim ? 0.08 : 0, isTrim ? 0 : 1, 1));
        }
        grid.push(rowV);
      }
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (!flip) b.quad(grid[r][c], grid[r + 1][c], grid[r + 1][c + 1], grid[r][c + 1]);
          else b.quad(grid[r][c + 1], grid[r + 1][c + 1], grid[r + 1][c], grid[r][c]);
        }
      }
    };
    buildGrid(0.055, false);
    buildGrid(0.035, true);

    // 中央鎏金方印菱纹
    const midY = yStart - length * 0.4;
    const d = width * 0.18;
    const dv0 = b.vertex(0, midY + d * 1.35, 0.075, bronzeGold, 0, 0, 1, 0.16, 0.22);
    const dv1 = b.vertex(-d, midY, 0.075, bronzeGold, 0, 0, 1, 0.2, 0.22);
    const dv2 = b.vertex(0, midY - d * 1.35, 0.075, bronzeGold, 0, 0, 1, 0.24, 0.22);
    const dv3 = b.vertex(d, midY, 0.075, bronzeGold, 0, 0, 1, 0.2, 0.22);
    b.quad(dv0, dv1, dv2, dv3);
    return b.build();
  }

  // YF(): 飘动斜垂唐宋军旗（悬于主城墙与高地箭楼旁，maskedTint）
  function buildSmallPennant() {
    const b = new Be();
    gn(
      b,
      [
        [0, -0.1, 0, 0.05],
        [0, 2.58, 0, 0.038],
      ],
      { sides: 5, c0: lacquerDark, c1: lacquer },
    );
    Xo(b, 0, 2.66, 0, 0.24, 0.065, 0, 0, bronzeGold, Ht(bronzeGold, 1.25), 0.18, 5);
    const cols = 4;
    const zStart = 2.48;
    const dropH = 0.72;
    const reach = 1.15;
    let prev: number[] | null = null;
    for (let i = 0; i <= cols; i++) {
      const t = i / cols;
      const hHalf = (dropH * (1 - t * 0.65)) / 2;
      const f = 0.04 + t * reach;
      const col = i === 0 ? bronzeGold : [0.9 + 0.1 * (1 - t), 0.9 + 0.1 * (1 - t), 0.9 + 0.1 * (1 - t)];
      const topV = b.vertex(0, zStart - dropH * 0.5 + hHalf, f, col, 1, 0.1, 0, t * t * 1.1, 0, i === 0 ? 0 : 1, 1);
      const botV = b.vertex(0, zStart - dropH * 0.5 - hHalf, f, col, 1, 0.1, 0, t * t * 1.1, 0, i === 0 ? 0 : 1, 1);
      if (prev) {
        b.quad(prev[0], prev[1], botV, topV);
        b.quad(topV, botV, prev[1], prev[0]);
      }
      prev = [topV, botV];
    }
    return b.build();
  }

  // KF(): 唐宋镇宅石狮（面向 +X，彻底消灭山崖兜帽魔法石像！）
  function buildGuardianLion() {
    const b = new Be();
    // 须弥座四方台基
    addWorldBox(b, 0, 0.18, 0, 0.86, 0.36, 0.86, stoneMid, stoneDark);
    addWorldBox(b, 0, 0.42, 0, 0.68, 0.14, 0.68, stoneLight, stoneMid);
    addWorldBox(b, 0, 0.54, 0, 0.78, 0.12, 0.78, stoneMid, stoneDark);
    // 蹲坐后躯（略微后坐）与紧实腹背
    Ts(b, -0.06, 0.88, 0, 0.34, 0.34, 0.3, {
      detail: 1,
      bump: 0.06,
      seed: 13,
      bottom: stoneDark,
      top: stoneMid,
      flat: true,
    });
    // 挺立雄健前胸（朝 +X）
    Ts(b, 0.08, 1.24, 0, 0.3, 0.32, 0.28, {
      detail: 1,
      bump: 0.06,
      seed: 17,
      bottom: stoneMid,
      top: stoneLight,
      flat: true,
    });
    // 左右前腿与狮爪按地
    for (const sz of [-0.18, 0.18]) {
      gn(
        b,
        [
          [0.24, 0.6, sz, 0.085],
          [0.2, 0.92, sz, 0.078],
          [0.14, 1.18, sz * 0.92, 0.085],
        ],
        { sides: 6, c0: stoneDark, c1: stoneLight, cap: true },
      );
      Ts(b, 0.28, 0.64, sz, 0.1, 0.06, 0.09, { detail: 0, seed: 21, bottom: stoneDark, top: stoneMid });
    }
    // 朱漆系带 + 鎏金大铜铃（古狮标志！）
    gn(
      b,
      [
        [0.08, 1.38, 0, 0.24],
        [0.1, 1.46, 0, 0.22],
      ],
      { sides: 8, c0: lacquer, c1: bronzeGold },
    );
    Ts(b, 0.32, 1.32, 0, 0.08, 0.08, 0.08, { detail: 0, seed: 31, bottom: darkGold, top: bronzeGold, glow: 0.15 });
    // 怒目雄狮首 + 卷毛鬓鬃 + 耳尖（面朝 +X）
    Ts(b, 0.14, 1.62, 0, 0.25, 0.25, 0.26, {
      detail: 1,
      bump: 0.14,
      seed: 43,
      bottom: stoneMid,
      top: stoneLight,
      flat: true,
    });
    // 狮吻鼻梁朝 +X
    addWorldBox(b, 0.34, 1.58, 0, 0.18, 0.16, 0.18, stoneLight, stoneMid);
    // 炯炯双目琥珀微光
    for (const ez of [-0.11, 0.11]) {
      Ts(b, 0.34, 1.68, ez, 0.04, 0.04, 0.04, { detail: 0, seed: 7, bottom: bronzeGold, top: warmAmberTop, glow: 0.45 });
    }
    // 后颈连串螺旋石狮鬃（3颗圆石发卷沿脊背落下）
    for (let i = 0; i < 3; i++) {
      Ts(b, -0.1 - i * 0.07, 1.72 - i * 0.18, 0, 0.1, 0.09, 0.12, {
        detail: 0,
        seed: 51 + i,
        bottom: stoneDark,
        top: stoneMid,
      });
    }
    return b.build();
  }

  // q_(seed): 唐宋螭首青石碑（正面朝 +X，碑额挑檐 + 朱金篆刻竖纹，零发光蓝符！）
  function buildChishouStele(seed: number) {
    const rng = new ke(seed);
    const b = new Be();
    const h = rng.range(1.42, 1.68);
    // 龟趺感青石座
    Ts(b, 0.02, 0.06, 0, 0.34, 0.16, 0.64, { detail: 0, bump: 0.16, seed, bottom: stoneDark, top: stoneMid, flat: true });
    // 碑身青石板（宽 0.96 沿 Z，厚 0.2 沿 X）
    addWorldBox(b, 0, h * 0.5 + 0.04, 0, 0.22, h, 0.96, stoneMid, stoneStele);
    // 螭首碑额帽 + 微金额篆题字牌
    addWorldBox(b, 0, h + 0.1, 0, 0.3, 0.24, 1.08, roofSlate, stoneDark);
    addWorldBox(b, 0, h + 0.25, 0, 0.2, 0.1, 0.88, bronzeGold, darkGold);
    // 正面 (+X) 三列竖排淡金/朱砂碑文沟刻（零电光青）
    for (let col = -1; col <= 1; col++) {
      const z = col * 0.24;
      addWorldBox(b, 0.115, h * 0.55 + 0.04, z, 0.02, h * 0.58, 0.055, col === 0 ? bronzeGold : Pt(stoneMid, lacquer, 0.6), darkGold, 0.08);
    }
    return b.build();
  }

  // X_(seed): 半倾苔藓古青石碑界桩（微暖金篆纹，无蓝符）
  function buildFallenStele(seed: number) {
    const rng = new ke(seed);
    const b = new Be();
    const len = rng.range(1.05, 1.38);
    addWorldBox(b, 0, 0.1, 0, len, 0.16, 0.78, stoneMid, stoneStele);
    addWorldBox(b, len * 0.12, 0.19, 0, len * 0.56, 0.03, 0.08, bronzeGold, darkGold, 0.06);
    Ts(b, len * 0.45, 0.08, rng.range(-0.18, 0.18), 0.36, 0.14, 0.36, {
      detail: 0,
      bump: 0.18,
      seed: seed + 3,
      bottom: stoneDark,
      top: stoneMid,
      flat: true,
    });
    return b.build();
  }

  // K_(seed): 青石云纹路缘嵌石弧（古铜金线装饰，零发光青符）
  function buildRoadCurbArc(seed: number) {
    const rng = new ke(seed);
    const b = new Be();
    const rIn = 0.96;
    const rOut = 1.28;
    const span = rng.range(1.2, 1.8);
    const segs = 7;
    const ringPts: number[][] = [];
    for (let i = 0; i <= segs; i++) {
      const a = -span / 2 + (span * i) / segs;
      const shade = 0.88 + (i % 2) * 0.1;
      ringPts.push([
        b.vertex(Math.cos(a) * rIn, 0.035, Math.sin(a) * rIn, Ht(stoneMid, shade), 0, 1, 0),
        b.vertex(Math.cos(a) * rOut, 0.035, Math.sin(a) * rOut, Ht(stoneDark, shade), 0, 1, 0),
      ]);
    }
    for (let i = 0; i < segs; i++) {
      b.quad(ringPts[i][0], ringPts[i + 1][0], ringPts[i + 1][1], ringPts[i][1]);
    }
    // 古铜回纹中嵌片
    for (let i = 0; i < segs; i++) {
      const a = -span / 2 + (span * (i + 0.5)) / segs;
      const rm = (rIn + rOut) * 0.5;
      addWorldBox(b, Math.cos(a) * rm, 0.042, Math.sin(a) * rm, 0.08, 0.015, 0.08, bronzeGold, darkGold);
    }
    return b.build();
  }

  // Y_(seed): 汴河贴地青石嵌铜渡口地界石（maxY <= 0.09m 平铺石砧，零穿模）
  function buildMooringPost(seed: number) {
    const rng = new ke(seed);
    const b = new Be();
    const r = rng.range(0.22, 0.28);
    gn(
      b,
      [
        [0, -0.05, 0, r * 1.12],
        [0, 0.03, 0, r],
        [0, 0.065, 0, r * 0.84],
      ],
      { sides: 8, c0: stoneDark, c1: stoneLight, cap: true },
    );
    gn(
      b,
      [
        [0, 0.065, 0, r * 0.46],
        [0, 0.085, 0, r * 0.32],
      ],
      { sides: 8, c0: darkGold, c1: bronzeGold, cap: true },
    );
    return b.build();
  }

  // 宋代汴河平铺青石汉白玉踏步渡口堰缘（沿 Z 方向跨越河道 -3.85..+3.85；全贴地 maxY <= 0.12m，彻底杜绝穿模立柱）
  function buildSongFordSteppingCurb() {
    const b = new Be();
    const halfLen = 3.85;
    const postZ = [-halfLen, -halfLen * 0.5, 0, halfLen * 0.5, halfLen];

    // 低矮倒角青石卧槛底基（y = -0.02..+0.08，总高仅 0.10m，可顺畅踏过不卡穿模）
    for (let i = 0; i < 6; i++) {
      const t0 = i / 6;
      const t1 = (i + 1) / 6;
      const zMid = ((t0 + t1) * 0.5 - 0.5) * halfLen * 2;
      const segLen = (halfLen * 2) / 6 + 0.04;
      addWorldBox(b, 0, 0.03, zMid, 0.56, 0.1, segLen, stoneMid, stoneDark);
      // 镶嵌平贴古铜回纹金线压条（y = 0.08..0.095）
      addWorldBox(b, 0, 0.0875, zMid, 0.16, 0.015, segLen * 0.94, bronzeGold, darkGold);
    }

    // 5 块低矮贴地汉白玉雕莲踏步石界标（y = 0.04..0.11，最大高度 <= 0.12m，无任何立柱或栏杆）
    for (let i = 0; i < postZ.length; i++) {
      const pz = postZ[i];
      addWorldBox(b, 0, 0.075, pz, 0.44, 0.07, 0.44, stoneLight, stoneMid);
      addWorldBox(b, 0, 0.108, pz, 0.24, 0.024, 0.24, bronzeGold, darkGold);
    }
    return b.build();
  }

  function addPitchedGableRoof(
    b: BeLike,
    centerZ: number,
    yEave: number,
    spanZ: number,
    halfDepthX: number,
    ridgeH: number,
    tileBot: number[],
    tileTop: number[],
    ridgeGold: number[],
    eaveLift = 0.24,
  ) {
    const segs = 8;
    const halfSpan = spanZ * 0.5;
    const yRidgeBase = yEave + ridgeH;
    const invNormLen = 1 / Math.hypot(ridgeH, halfDepthX);
    const nx = ridgeH * invNormLen;
    const ny = halfDepthX * invNormLen;

    const rPts: { r0: number; eBack: number; eFront: number }[] = [];
    for (let i = 0; i <= segs; i++) {
      const u = i / segs - 0.5;
      const z = centerZ + u * spanZ;
      const endCurve = Math.pow(Math.abs(u) * 2, 2.2) * eaveLift;
      const ye = yEave + endCurve;
      const yr = yRidgeBase + endCurve * 0.52;
      rPts.push({
        r0: b.vertex(0, yr, z, tileTop, 0, 1, 0),
        eBack: b.vertex(halfDepthX, ye, z, tileBot, nx, ny, 0),
        eFront: b.vertex(-halfDepthX, ye, z, tileBot, -nx, ny, 0),
      });
    }

    for (let i = 0; i < segs; i++) {
      const a = rPts[i];
      const c = rPts[i + 1];
      // 双向悬山斜坡屋面
      b.quad(a.r0, c.r0, c.eBack, a.eBack);
      b.quad(a.r0, a.eFront, c.eFront, c.r0);
      // 竖向瓦垄凸筋（45度俯视也呈明显唐宋筒瓦纹理）
      const zMid = centerZ + (((i + 0.5) / segs) - 0.5) * spanZ;
      const endCurve = Math.pow(Math.abs((i + 0.5) / segs - 0.5) * 2, 2.2) * eaveLift;
      addWorldBox(b, 0, yRidgeBase + endCurve * 0.52 + 0.08, zMid, 0.2, 0.16, spanZ / segs + 0.02, ridgeGold, darkGold);
      addWorldBox(
        b,
        halfDepthX * 0.52,
        yEave + ridgeH * 0.48 + endCurve * 0.72,
        zMid,
        halfDepthX * 0.92,
        0.06,
        0.08,
        Pt(tileBot, tileTop, 0.4),
        tileBot,
      );
      addWorldBox(
        b,
        -halfDepthX * 0.52,
        yEave + ridgeH * 0.48 + endCurve * 0.72,
        zMid,
        halfDepthX * 0.92,
        0.06,
        0.08,
        Pt(tileBot, tileTop, 0.4),
        tileBot,
      );
    }

    // 两端山花三角封堵 + 飞檐下斗拱托 + 脊端金螭吻
    for (const dir of [-1, 1] as const) {
      const zEnd = centerZ + dir * halfSpan;
      const endEave = yEave + eaveLift;
      const endRidge = yRidgeBase + eaveLift * 0.52;
      const vR = b.vertex(0, endRidge, zEnd, lacquerDark, 0, 0, dir);
      const vB = b.vertex(halfDepthX, endEave, zEnd, lacquerDark, 0, 0, dir);
      const vF = b.vertex(-halfDepthX, endEave, zEnd, lacquerDark, 0, 0, dir);
      if (dir > 0) b.tri(vR, vF, vB);
      else b.tri(vR, vB, vF);
      // 下衬悬山暗木枋 + 檐角螭吻
      addWorldBox(b, 0, endEave - 0.08, zEnd - dir * 0.24, halfDepthX * 1.56, 0.16, 0.46, lacquer, lacquerDark);
      addWorldBox(b, 0, endRidge + 0.18, zEnd, 0.28, 0.3, 0.32, ridgeGold, darkGold, 0.16);
    }
    // 主檐暗木椽底衬
    addWorldBox(b, 0, yEave - 0.08, centerZ, halfDepthX * 1.65, 0.16, spanZ * 0.94, lacquerDark, lacquerDark);
  }

  // 唐宋三间重檐飞角御街牌坊（主跨沿 Z 轴 ±5.18m，净通宽 10m、过梁底高 y >= 4.38m，绝不挡兵/人）
  function buildImperialArchway(team: number) {
    const b = new Be();
    const isRed = team === 1;
    const tileBot = isRed ? yt(0x2e1a16) : yt(0x162b3d);
    const tileTop = isRed ? yt(0x7a3422) : yt(0x3a678a);
    const plaqueCol = isRed ? yt(0x7c1c15) : yt(0x1c3d59);

    const buildPillar = (zPos: number, height: number, rCol: number) => {
      // 汉白玉抱鼓石墩
      addWorldBox(b, 0, 0.35, zPos, 0.94, 0.72, 0.86, stoneLight, stoneDark);
      addWorldBox(b, 0, 0.76, zPos, 0.76, 0.16, 0.72, bronzeGold, darkGold);
      // 朱漆大柱
      gn(
        b,
        [
          [0, 0.82, zPos, rCol],
          [0, height, zPos, rCol * 0.9],
        ],
        { sides: 10, c0: lacquerDark, c1: lacquer, cap: true },
      );
      addWorldBox(b, 0, height + 0.08, zPos, rCol * 2.8, 0.22, rCol * 2.8, lacquer, bronzeGold);
    };

    buildPillar(-5.18, 4.78, 0.25);
    buildPillar(5.18, 4.78, 0.25);

    // 高空横跨双层额枋（y=4.38..5.16，完全高出于人物头顶）
    addWorldBox(b, 0, 4.46, 0, 0.44, 0.28, 11.4, lacquer, lacquerDark);
    addWorldBox(b, 0, 4.94, 0, 0.54, 0.36, 11.0, lacquer, bronzeGold);
    // 夹柱斗拱镂空短柱
    for (const cz of [-3.9, -2.2, 2.2, 3.9]) {
      addWorldBox(b, 0, 4.68, cz, 0.26, 0.3, 0.24, bronzeGold, darkGold);
    }

    // 中央金框御笔牌匾（「长安/汴京」鎏金印匾）
    addWorldBox(b, 0, 4.92, 0, 0.58, 0.78, 2.74, plaqueCol, lacquerDark);
    addWorldBox(b, 0, 4.92, 0, 0.62, 0.84, 2.82, bronzeGold, darkGold);
    for (const sx of [-0.32, 0.32]) {
      addWorldBox(b, sx, 4.92, 0, 0.03, 0.44, 1.9, bronzeGold, warmAmberTop, 0.28);
    }

    // 三间高低错落真斜坡重檐琉璃顶（双耳侧殿顶 + 中央高脊主亭顶）
    addPitchedGableRoof(b, -4.55, 4.78, 2.55, 0.78, 0.58, tileBot, tileTop, bronzeGold, 0.22);
    addPitchedGableRoof(b, 4.55, 4.78, 2.55, 0.78, 0.58, tileBot, tileTop, bronzeGold, 0.22);
    addPitchedGableRoof(b, 0, 5.42, 6.2, 0.98, 0.96, tileBot, tileTop, bronzeGold, 0.28);

    // 顶部正中莲座金葫芦宝顶 (y=6.38..6.98)
    gn(
      b,
      [
        [0, 6.38, 0, 0.3],
        [0, 6.52, 0, 0.34],
        [0, 6.66, 0, 0.16],
        [0, 6.82, 0, 0.2],
        [0, 6.98, 0, 0.03],
      ],
      { sides: 8, c0: darkGold, c1: bronzeGold, cap: true },
    );

    // 4 盏悬空大红宫灯（±4.42 与 ±2.10，y=3.92 高挑不挡视野）
    for (const lz of [-4.42, -2.1, 2.1, 4.42]) {
      addWorldBox(b, 0, 4.22, lz, 0.04, 0.32, 0.04, bronzeGold, darkGold);
      Ts(b, 0, 3.92, lz, 0.22, 0.26, 0.22, {
        detail: 1,
        seed: isRed ? 91 + Math.round(lz * 10) : 41 + Math.round(lz * 10),
        bottom: crimsonCloth,
        top: warmAmber,
        glow: 0.9,
      });
    }

    return b.build();
  }

  // 汴河漂浮荷花河灯（红莲瓣托暖金烛火）
  function buildRiverLantern(seed: number) {
    const rng = new ke(seed);
    const b = new Be();
    const petalCount = 8;
    const petalBot = yt(0xd94865);
    const petalTop = yt(0xffb5c2);
    const woodBase = yt(0x4c2818);
    gn(
      b,
      [
        [0, -0.02, 0, 0.26],
        [0, 0.03, 0, 0.24],
      ],
      { sides: 8, c0: woodBase, c1: bronzeGold },
    );
    const center = b.vertex(0, 0.05, 0, bronzeGold, 0, 1, 0);
    for (let i = 0; i < petalCount; i++) {
      const a = (i / petalCount) * TAU + rng.range(-0.1, 0.1);
      const aL = a - 0.36;
      const aR = a + 0.36;
      const vL = b.vertex(Math.cos(aL) * 0.2, 0.1, Math.sin(aL) * 0.2, petalBot, Math.cos(aL) * 0.4, 0.9, Math.sin(aL) * 0.4);
      const vR = b.vertex(Math.cos(aR) * 0.2, 0.1, Math.sin(aR) * 0.2, petalBot, Math.cos(aR) * 0.4, 0.9, Math.sin(aR) * 0.4);
      const tip = b.vertex(Math.cos(a) * 0.34, 0.2, Math.sin(a) * 0.34, petalTop, Math.cos(a) * 0.5, 0.85, Math.sin(a) * 0.5, 0, 0.22);
      b.tri(center, vL, tip);
      b.tri(center, tip, vR);
      b.tri(center, tip, vL);
      b.tri(center, vR, tip);
    }
    Ts(b, 0, 0.14, 0, 0.11, 0.13, 0.11, {
      detail: 0,
      seed,
      bottom: warmAmber,
      top: warmAmberTop,
      glow: 0.95,
    });
    return b.build();
  }

  // 野区地形点缀重构：消除冻蓝尖晶、紫色符文弧与紫色结晶片，改为寒梅冻枝/余烬焦木/铜鼎残灶/卧松灵芝/断龙石拱
  function buildFrostPlumBranch(seed: number) {
    const rng = new ke(seed);
    const b = new Be();
    const bark = yt(0x473832);
    const snow = yt(0xe4eceb);
    const h = rng.range(1.25, 1.65);
    const tilt = rng.range(-0.22, 0.22);
    gn(
      b,
      [
        [0, -0.15, 0, 0.11],
        [tilt * 0.5, h * 0.55, 0.05, 0.075],
        [tilt, h, 0.08, 0.035],
      ],
      { sides: 5, c0: Ht(bark, 0.8), c1: Pt(bark, snow, 0.45) },
    );
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + rng.range(-0.35, 0.35);
      const y = h * rng.range(0.42, 0.85);
      const reach = rng.range(0.45, 0.72);
      const ox = tilt * (y / h);
      gn(
        b,
        [
          [ox, y, 0.05, 0.045],
          [ox + Math.cos(a) * reach, y + reach * 0.55, Math.sin(a) * reach, 0.015],
        ],
        { sides: 3, c0: bark, c1: snow },
      );
      Ts(b, ox + Math.cos(a) * reach, y + reach * 0.55, Math.sin(a) * reach, 0.08, 0.07, 0.08, {
        detail: 0,
        seed: seed + i,
        bottom: yt(0xe0eef2),
        top: yt(0xfff6e5),
        glow: 0.16,
      });
    }
    return b.build();
  }

  function buildCharredBannerStump(seed: number) {
    const rng = new ke(seed);
    const b = new Be();
    const h = rng.range(0.7, 1.15);
    gn(
      b,
      [
        [0, -0.15, 0, 0.35],
        [0.02, h * 0.4, 0, 0.26],
        [0.05, h * 0.85, 0.02, 0.21],
        [0.09, h, 0.05, 0.12],
      ],
      { sides: 7, c0: yt(0x281e1a), c1: yt(0x523c31) },
    );
    Ts(b, 0.05, h * 0.86, 0.02, 0.16, 0.065, 0.16, {
      detail: 0,
      seed,
      bottom: [0.98, 0.38, 0.1],
      top: [1, 0.68, 0.22],
      glow: 0.75,
    });
    return b.build();
  }

  function buildEmberCauldronCrater(seed: number) {
    const rng = new ke(seed);
    const b = new Be();
    gn(
      b,
      [
        [0, -0.06, 0, 0.42],
        [0, 0.14, 0, 0.3],
        [0, 0.26, 0, 0.2],
        [0, 0.2, 0, 0.14],
      ],
      { sides: 7, c0: yt(0x2d241c), c1: yt(0x594430) },
    );
    Ts(b, 0, 0.18, 0, 0.14, 0.05, 0.14, { detail: 0, seed, bottom: [0.95, 0.42, 0.1], top: [1, 0.78, 0.3], glow: 0.88 });
    for (let i = 0; i < 3; i++) {
      const a = rng.range(0, TAU);
      Ts(b, Math.cos(a) * 0.4, 0.05, Math.sin(a) * 0.4, 0.13, 0.1, 0.11, {
        detail: 0,
        bump: 0.25,
        seed: seed + i,
        bottom: stoneDark,
        top: stoneMid,
        flat: true,
      });
    }
    return b.build();
  }

  function buildMossyPineLog(seed: number) {
    const rng = new ke(seed);
    const b = new Be();
    const len = rng.range(1.9, 2.35);
    const r = 0.34;
    gn(
      b,
      [
        [-len / 2, r * 0.9, 0, r],
        [-len * 0.15, r * 0.92, 0.04, r * 0.96],
        [len * 0.2, r * 0.88, -0.03, r * 0.9],
        [len / 2, r * 0.85, 0, r * 0.84],
      ],
      { sides: 8, c0: yt(0x4e3b2d), c1: yt(0x735c46), cap: true },
    );
    Ts(b, rng.range(-0.4, 0.4), r * 1.72, 0, 0.5, 0.085, 0.3, {
      detail: 0,
      bump: 0.2,
      seed,
      bottom: yt(0x3f6b3c),
      top: yt(0x7aa362),
    });
    Ts(b, len * 0.25, r * 1.72, 0.06, 0.14, 0.06, 0.14, {
      detail: 0,
      seed: seed + 1,
      bottom: darkGold,
      top: bronzeGold,
    });
    return b.build();
  }

  function buildOrchidLampStem(seed: number) {
    const rng = new ke(seed);
    const b = new Be();
    const h = rng.range(0.55, 0.8);
    const reach = 0.26;
    gn(
      b,
      [
        [0, -0.1, 0, 0.055],
        [0.08, h * 0.6, 0, 0.045],
        [reach, h, 0, 0.035],
      ],
      { sides: 4, c0: yt(0x2c5c34), c1: yt(0x4d874b), sway1: 0.28 },
    );
    Ts(b, reach, h + 0.08, 0, 0.12, 0.12, 0.12, {
      detail: 1,
      seed,
      bottom: [0.95, 0.7, 0.28],
      top: warmAmberTop,
      glow: 0.85,
      swayBottom: 0.35,
      swayTop: 0.35,
    });
    return b.build();
  }

  // $_(seed) 替代紫色星门弧 -> 古青石盘龙断拱（无紫晶体）
  function buildBrokenDragonArch(seed: number) {
    const rng = new ke(seed);
    const b = new Be();
    const r = rng.range(1.45, 1.95);
    const sweep = rng.range(1.15, 1.5);
    const segs = 6;
    const rings: number[][] = [];
    for (let i = 0; i <= segs; i++) {
      const f = -0.12 + (sweep * i) / segs;
      rings.push([0, Math.sin(f) * r, -Math.cos(f) * r + r * 0.75, 0.21 - i * 0.01]);
    }
    gn(b, rings, { sides: 6, c0: stoneStele, c1: stoneMid, cap: true });
    Ts(b, 0, 0.08, -r * 0.24, 0.44, 0.22, 0.38, {
      detail: 0,
      bump: 0.22,
      seed,
      bottom: stoneDark,
      top: stoneMid,
      flat: true,
    });
    return b.build();
  }

  // V_(seed) 替代紫色符文晶块 -> 苔藓雕印小石碑
  function buildSmallMossTablet(seed: number) {
    const rng = new ke(seed);
    const b = new Be();
    const h = rng.range(0.3, 0.4);
    Ts(b, 0, h * 0.42, 0, 0.26, h * 0.62, 0.19, {
      detail: 0,
      bump: 0.12,
      seed,
      bottom: stoneStele,
      top: stoneMid,
      flat: true,
    });
    addWorldBox(b, 0, h * 0.48, 0.18, 0.055, h * 0.42, 0.02, bronzeGold, darkGold, 0.22);
    return b.build();
  }

  return {
    banner: buildBanner(4.2, 1.12, 2.52),
    flag: buildSmallPennant(),
    watcher: buildGuardianLion(),
    steles: [buildChishouStele(61), buildChishouStele(67)],
    fallenSteles: [buildFallenStele(71), buildFallenStele(73)],
    mooringPosts: [buildMooringPost(79), buildMooringPost(83)],
    inlayArcs: [buildRoadCurbArc(89), buildRoadCurbArc(97)],
    bridgeRail: buildSongFordSteppingCurb(),
    archways: [buildImperialArchway(0), buildImperialArchway(1)],
    riverLanterns: [buildRiverLantern(101), buildRiverLantern(107)],
    // 野区装饰重写映射
    frostBranch: [buildFrostPlumBranch(401), buildFrostPlumBranch(409)],
    charStump: [buildCharredBannerStump(421), buildCharredBannerStump(431)],
    vent: buildEmberCauldronCrater(433),
    log: buildMossyPineLog(439),
    lampFlower: [buildOrchidLampStem(443), buildOrchidLampStem(449)],
    starArc: [buildBrokenDragonArch(457), buildBrokenDragonArch(461)],
    rune: [buildSmallMossTablet(479), buildSmallMossTablet(487)],
  };
}

/**
 * 3. 在 eU 结尾落位：中路宋代虹桥、边路渡口灯柱、蓝红御街牌坊、汴河漂浮荷花灯
 */
export function addTangSongRiverAndGateLandmarks(
  api: PropsApi,
  accum: SceneryAccumLike,
  bundle: {
    bridgeRail: unknown;
    archways: unknown[];
    riverLanterns: unknown[];
    mooringPosts: unknown[];
    lilyPads?: unknown[];
    lotusBud?: unknown;
  },
  mapSdf: MapSdfLike,
  effects: {
    glows: { x: number; z: number; y: number; r: number; color: number[] }[];
    ripples: { x: number; z: number; r: number }[];
    aoBlobs: { x: number; y: number; z: number; r: number; strength: number }[];
  },
  particleSpots: { x: number; y: number; z: number; radius: number; color: number[]; count: number; mode: number; range: number; size: number }[],
) {
  const { ae, ke, yt } = api;
  const rng = new ke(2026);
  const lanternAmber = yt(0xffb44c);
  const lotusPink = yt(0xf48fb1);

  const wy = api.waterLevel + 0.015;

  // A. 中路汴河平铺青石白玉渡口堰缘（全贴地 <=0.12m 零穿模）+ 两侧水上低矮荷花河灯
  // 垂直于中路向量 n = (1/sqrt2, 1/sqrt2)；沿中路向量 = (-1/sqrt2, 1/sqrt2) -> angle -PI/4 与 +3PI/4
  const dPerp = Math.SQRT1_2;
  const bridgeOffset = 5.38;
  for (const side of [-1, 1]) {
    const bx = side * bridgeOffset * dPerp;
    const bz = side * bridgeOffset * dPerp;
    const ry = side > 0 ? -Math.PI / 4 : (3 * Math.PI) / 4;
    accum.add(bundle.bridgeRail, ae(bx, -0.01, bz, ry, 1), { shadow: false });
    effects.aoBlobs.push({ x: bx, y: 0.02, z: bz, r: 1.8, strength: 0.25 });
    for (const endS of [-3.85, 3.85]) {
      const lx = bx - side * endS * dPerp + side * 0.92 * dPerp;
      const lz = bz + side * endS * dPerp + side * 0.92 * dPerp;
      accum.add(bundle.riverLanterns[0], ae(lx, wy, lz, rng.range(0, TAU), 0.9), { shadow: false, glow: 1 });
      effects.glows.push({ x: lx, z: lz, y: 0.04, r: 1.8, color: lanternAmber });
      effects.ripples.push({ x: lx, z: lz, r: 0.75 });
    }
  }

  // B. 上下边路河道渡口水面莲灯（移除一切通行区立柱，仅置贴水荷灯防穿模）
  for (const cross of [
    [-49.5, -49.5],
    [49.5, 49.5],
  ]) {
    const [cx, cz] = cross;
    for (const off of [
      [3.9, -3.9],
      [-3.9, 3.9],
    ]) {
      const px = cx + off[0];
      const pz = cz + off[1];
      if (
        Math.abs(px) < mapSdf.map.bound - 0.6 &&
        Math.abs(pz) < mapSdf.map.bound - 0.6 &&
        mapSdf.laneDist(px, pz) > 1.2 &&
        mapSdf.solidDist(px, pz) > 0.35
      ) {
        accum.add(bundle.riverLanterns[1 % bundle.riverLanterns.length], ae(px, wy, pz, 0, 0.95), {
          shadow: false,
          glow: 1,
        });
        effects.glows.push({ x: px, z: pz, y: 0.06, r: 1.8, color: lanternAmber });
        effects.ripples.push({ x: px, z: pz, r: 0.72 });
      }
    }
  }

  // C. 蓝/红方中路御街门阙牌坊（位于基地外门槛 s = ±35.8，两柱落于 10m 路沿外 ±5.18m，绝不触碰山崖与主路）
  // 蓝方牌坊位于 (-35.8, 35.8) 面朝 (0,0)；红方牌坊位于 (35.8, -35.8) 面朝 (0,0)
  for (const [teamIdx, ax, az, ang] of [
    [0, -35.8, 35.8, Math.PI / 4],
    [1, 35.8, -35.8, (-3 * Math.PI) / 4],
  ] as [number, number, number, number][]) {
    accum.add(bundle.archways[teamIdx], ae(ax, 0, az, ang, 1), { shadow: true });
    for (const s of [-5.18, 5.18]) {
      const px = ax + s * dPerp;
      const pz = az + s * dPerp;
      effects.aoBlobs.push({ x: px, y: 0.03, z: pz, r: 1.4, strength: 0.4 });
      effects.glows.push({ x: px, z: pz, y: 0.06, r: 2.5, color: lanternAmber });
      particleSpots.push({
        x: px,
        y: 3.9,
        z: pz,
        radius: 0.45,
        color: lanternAmber,
        count: 3,
        mode: 0,
        range: 1.4,
        size: 0.72,
      });
    }
  }

  // D. 汴河水上飘浮莲花与荷叶河灯群（绕开三条兵线渡口与大小龙深潭）
  const riverPts = mapSdf.riverLine;
  const epicPits = mapSdf.map.camps.filter(
    (c) => c.monsterType === 'abyss_drake' || c.monsterType === 'star_colossus',
  );
  let placed = 0;
  for (let i = 0; i < riverPts.length - 1; i++) {
    const p0 = riverPts[i];
    const p1 = riverPts[i + 1];
    const segLen = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    const steps = Math.max(4, Math.floor(segLen / 3.4));
    for (let k = 1; k < steps; k++) {
      const t = k / steps;
      const bx = p0.x + (p1.x - p0.x) * t;
      const bz = p0.y + (p1.y - p0.y) * t;
      for (let m = 0; m < 2; m++) {
        const lx = bx + rng.range(-3.1, 3.1);
        const lz = bz + rng.range(-3.1, 3.1);
        if (Math.max(Math.abs(lx), Math.abs(lz)) > mapSdf.map.bound - 1.5) continue;
        if (mapSdf.laneDist(lx, lz) < 1.85 || mapSdf.solidDist(lx, lz) < 0.75) continue;
        if (epicPits.some((c) => Math.hypot(c.pos.x - lx, c.pos.y - lz) < 6.4)) continue;

        if (placed < 22 && rng.chance(0.58)) {
          placed++;
          const lanternGeo = bundle.riverLanterns[placed % bundle.riverLanterns.length];
          accum.add(lanternGeo, ae(lx, wy, lz, rng.range(0, TAU), rng.range(0.9, 1.2)), {
            shadow: false,
            glow: 1,
          });
          effects.glows.push({ x: lx, z: lz, y: wy + 0.02, r: 1.5, color: lanternAmber });
          effects.ripples.push({ x: lx, z: lz, r: 0.7 });
        } else if (bundle.lilyPads?.length && bundle.lotusBud) {
          const pad = bundle.lilyPads[placed % bundle.lilyPads.length];
          accum.add(pad, ae(lx, wy, lz, rng.range(0, TAU), rng.range(0.85, 1.2)), { shadow: false });
          if (rng.chance(0.65)) {
            accum.add(bundle.lotusBud, ae(lx + 0.08, wy, lz - 0.06, rng.range(0, TAU), 1.05), {
              shadow: false,
              tint: lotusPink,
              maskedTint: true,
            });
          }
        }
      }
    }
  }
}

/**
 * 4. 远景《千里江山图》青绿叠嶂群峰与远山唐宋古塔轮廓 aU()
 *    彻底删除原版 9 块浮空科幻石与 150 米倾斜外星蓝晶巨碑！
 */
export function buildTangSongHorizon(api: PropsApi) {
  const { Be, ke, Pt, Ht, yt, nn, un, gn, Qc, Sn } = api;
  if (!Qc || !Sn) return null;

  const NX = -46;
  const mat = Qc({
    vertexColors: true,
    flat: true,
    steps: 2,
    softness: 0.16,
    rim: 0,
    lightTint: false,
    glowBoost: 1.0,
  });
  const b = new Be();
  const rng = new ke(8086);

  // 金秋长安丹青设色：水墨暖石山脚 -> 秋赭山腰 -> 鎏金秋霭云峰
  const baseGreen = yt(0x4c4338);
  const midMalachite = yt(0x786852);
  const mistyGoldPeak = yt(0xebd4aa);

  const addPeak = (px: number, pz: number, rBase: number, height: number, rotSeed: number) => {
    const rings: number[][] = [];
    const ringVerts: number[][] = [];
    for (let d = 0; d <= 4; d++) {
      const h = d / 4;
      const y = NX - 12 + (height + 12) * h;
      const rr = rBase * Math.pow(1 - h, 0.8) + (d === 4 ? 0 : rBase * 0.04);
      const row: number[] = [];
      for (let p = 0; p < 10; p++) {
        const a = (p / 10) * TAU + rotSeed;
        const rad = rr * (0.76 + nn(p + d * 13, rotSeed * 100, 7) * 0.46);
        const vy = y + (d > 0 && d < 4 ? (nn(p, d + rotSeed * 50, 9) - 0.5) * height * 0.14 : 0);
        const mistMix = Math.min(1, Math.max(0, (h - 0.54) * 2.8 + (nn(p, d, 11) - 0.5) * 0.25));
        const bodyCol = Pt(Ht(baseGreen, 0.88), midMalachite, Math.min(1, h * 1.4));
        const col = Pt(bodyCol, mistyGoldPeak, mistMix);
        row.push(b.vertex(px + Math.cos(a) * rad, vy, pz + Math.sin(a) * rad, col));
      }
      rings.push([y]);
      ringVerts.push(row);
    }
    for (let d = 0; d < 4; d++) {
      for (let p = 0; p < 10; p++) {
        const nxt = (p + 1) % 10;
        b.quad(ringVerts[d][p], ringVerts[d + 1][p], ringVerts[d + 1][nxt], ringVerts[d][nxt]);
      }
    }
  };

  const count = 36;
  for (let f = 0; f < count; f++) {
    const a = (f / count) * TAU + rng.range(-0.05, 0.05);
    const dist = rng.range(235, 420);
    const noiseFactor = un ? un(Math.cos(a) * 2, Math.sin(a) * 2, 2, 5) : 0.5;
    const h = rng.range(72, 182) * (0.7 + 0.5 * noiseFactor);
    addPeak(Math.cos(a) * dist, Math.sin(a) * dist, h * rng.range(0.58, 0.88), h, rng.next() * TAU);
  }

  // 在遥远西北方与东南方苍山之巅立两座唐宋多层八角古塔剪影（大雁塔/开封铁塔意象）
  for (const [px, pz, scale] of [
    [-165, -185, 1.0],
    [168, -172, 0.88],
  ]) {
    addPeak(px, pz, 46 * scale, 56 * scale, 1.4);
    const topY = 8 * scale;
    const towerBrick = yt(0x4c4a46);
    const towerRoof = yt(0x2c3b4a);
    const towerGold = yt(0xd9b36c);
    gn(
      b,
      [
        [px, -18, pz, 7.5 * scale],
        [px, topY + 24 * scale, pz, 4.2 * scale],
      ],
      { sides: 8, c0: towerBrick, c1: Pt(towerBrick, mistyGoldPeak, 0.35), cap: true },
    );
    for (let tier = 0; tier < 4; tier++) {
      const ty = topY + (3 + tier * 5.6) * scale;
      const tr = (9.8 - tier * 1.4) * scale;
      gn(
        b,
        [
          [px, ty, pz, tr],
          [px, ty + 1.8 * scale, pz, tr * 0.55],
        ],
        { sides: 8, c0: towerRoof, c1: towerGold, cap: true },
      );
    }
    gn(
      b,
      [
        [px, topY + 24 * scale, pz, 1.4 * scale],
        [px, topY + 32 * scale, pz, 0.25 * scale],
      ],
      { sides: 6, c0: towerGold, c1: mistyGoldPeak },
    );
  }

  b.computeNormals?.();
  const mesh = new Sn(b.build(), mat);
  mesh.name = 'mountains';
  mesh.matrixAutoUpdate = false;
  mesh.frustumCulled = false;
  return mesh;
}
