/**
 * tangsongWildlife.ts — 《唐宋荣耀》v5.0 汴河锦鲤 · 云巅白鹤 · 秋苑彩蝶 活态生灵工坊
 *
 * 为《千里江山》汴京演武场注入灵动生机：
 * 1. 汴河游弋锦鲤群（12 尾）：红白丹顶锦鲤与鎏金锦鲤，在碧水荷叶下摆尾巡游；
 * 2. 云巅盘旋白仙鹤（5 只）：雪羽丹顶黑翅尖白鹤，双翼周期性舒展振翅，悠然盘旋天际；
 * 3. 秋苑翩跹金/青蝶（14 只）：在汴河芦苇、银杏与红枫林间轻快翩飞。
 */

import { buildFeatheredWing } from './tangsongWings';

export interface WildlifeVertexBuilder {
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
  ): number;
  tri(a: number, b: number, c: number): void;
  quad(a: number, b: number, c: number, d: number): void;
  computeNormals?: () => void;
  build(): { dispose?: () => void };
}

export interface WildlifeGroup {
  name: string;
  position: { set: (x: number, y: number, z: number) => void; x: number; y: number; z: number };
  rotation: { set: (x: number, y: number, z: number) => void; x: number; y: number; z: number };
  scale: { x: number; setScalar: (s: number) => void };
  add: (child: unknown) => void;
}

export interface WildlifeApi {
  Be: new () => WildlifeVertexBuilder;
  Ji: new () => WildlifeGroup;
  Sn: new (geo: unknown, mat: unknown) => WildlifeGroup;
  Qc: (opts: Record<string, unknown>) => { dispose?: () => void };
  gn: (b: WildlifeVertexBuilder, rings: number[][], opts: Record<string, unknown>) => void;
  yt: (hex: number) => number[];
  ke: new (seed: number) => {
    range: (a: number, b: number) => number;
    next: () => number;
  };
  mapSdf: {
    map: { bound: number; camps: { pos: { x: number; y: number }; monsterType: string }[] };
    riverLine: { x: number; y: number }[];
  };
  waterLevel: number;
}

const TAU = Math.PI * 2;

export function createTangSongWildlife(api: WildlifeApi) {
  const { Be, Ji, Sn, Qc, gn, yt, ke, mapSdf, waterLevel } = api;
  const rng = new ke(5028);

  const root = new Ji();
  root.name = 'tangsong-wildlife';

  const mat = Qc({
    vertexColors: true,
    flat: false,
    steps: 2,
    softness: 0.14,
    rim: 0.08,
    lightTint: false,
    glowBoost: 1.0,
  });

  const craneMat = Qc({
    vertexColors: true,
    flat: false,
    steps: 3,
    softness: 0.24,
    rim: 0.28,
    lightTint: false,
    glowBoost: 1.0,
  });

  const white = yt(0xfaf6ee);
  const red = yt(0xd93824);
  const gold = yt(0xf0b844);
  const black = yt(0x1f2228);
  const azure = yt(0x3a92b8);
  const teal = yt(0x78e0d8);
  const beakGold = yt(0xd99e36);
  const featherShade = yt(0xd6d1c6);

  // 1. 共享几何体：锦鲤身体 / 摆动尾扇 / 白鹤身 / 白鹤扇翼 / 蝴蝶身+翼
  const buildKoiBody = (isGold: boolean) => {
    const b = new Be();
    const cHead = isGold ? gold : red;
    const cBody = isGold ? yt(0xffe48c) : white;
    const cTail = isGold ? red : red;
    gn(
      b,
      [
        [0, 0, -0.34, 0.02],
        [0, 0, -0.18, 0.06],
        [0, 0, 0.02, 0.11],
        [0, 0, 0.22, 0.1],
        [0, 0, 0.36, 0.03],
      ],
      { sides: 8, axis: 'z', c0: cTail, c1: cHead, cap: true },
    );
    // 背中绣金/朱斑背脊
    const v0 = b.vertex(0, 0.12, 0.12, cHead, 0, 1, 0);
    const v1 = b.vertex(-0.04, 0.05, 0.18, cBody, -1, 0.5, 0);
    const v2 = b.vertex(0.04, 0.05, 0.18, cBody, 1, 0.5, 0);
    const v3 = b.vertex(0, 0.09, -0.16, cTail, 0, 1, 0);
    b.tri(v0, v1, v3);
    b.tri(v0, v3, v2);
    b.computeNormals?.();
    return b.build();
  };

  const buildKoiTail = (colA: number[], colB: number[]) => {
    const b = new Be();
    // 从尾柄向外张开的鳍条在中间拱起，尾缘留出柔和的分叉。
    for (const face of [1, -1]) {
      const root = b.vertex(0, 0, 0, colA, face, 0, 0);
      let previous: number[] = [];
      for (let row = 1; row <= 3; row++) {
        const v = row / 3;
        const color = colA.map((c, k) => c + (colB[k] - c) * v);
        const current: number[] = [];
        for (let col = 0; col <= 4; col++) {
          const u = col / 4;
          const side = 2 * u - 1;
          const x = 0.024 * v * Math.sin(u * Math.PI * 4) + 0.018 * Math.sin(v * Math.PI) * (1 - side * side);
          const y = 0.14 * side * v;
          const z = -0.26 * v + 0.08 * (1 - Math.abs(side)) * v ** 4;
          current.push(b.vertex(x, y, z, color, face, 0, 0));
        }
        for (let col = 0; col < 4; col++) {
          if (row === 1) {
            if (face > 0) b.tri(root, current[col], current[col + 1]);
            else b.tri(root, current[col + 1], current[col]);
          } else if (face > 0) {
            b.quad(previous[col], current[col], current[col + 1], previous[col + 1]);
          } else {
            b.quad(previous[col + 1], current[col + 1], current[col], previous[col]);
          }
        }
        previous = current;
      }
    }
    b.computeNormals?.();
    return b.build();
  };

  const buildCraneBody = () => {
    const b = new Be();
    // 饱满流线型躯干（10 边平滑受光 + 收束尾基）
    gn(
      b,
      [
        [0, -0.02, -0.52, 0.035],
        [0, -0.005, -0.26, 0.145],
        [0, 0.025, 0.08, 0.185],
        [0, 0.035, 0.28, 0.13],
        [0, 0.055, 0.42, 0.072],
      ],
      { sides: 10, axis: 'z', c0: black, c1: white, cap: true },
    );
    // 叠层墨白尾羽（三级飞羽蓬松收束）
    for (const [ox, oy, len] of [
      [0, 0.02, -0.68],
      [-0.065, 0.005, -0.62],
      [0.065, 0.005, -0.62],
    ]) {
      gn(
        b,
        [
          [ox, oy, -0.28, 0.065],
          [ox * 1.15, oy - 0.015, len, 0.016],
        ],
        { sides: 6, axis: 'z', c0: featherShade, c1: black, cap: true },
      );
    }
    // 优雅 S 曲长颈（白羽根 + 丹顶鹤标志性墨颊喉斑）
    gn(
      b,
      [
        [0, 0.05, 0.4, 0.064],
        [0, 0.11, 0.62, 0.048],
        [0, 0.15, 0.84, 0.042],
        [0, 0.155, 0.98, 0.056],
      ],
      { sides: 8, axis: 'z', c0: white, c1: white, cap: true },
    );
    gn(
      b,
      [
        [0, 0.115, 0.72, 0.045],
        [0, 0.14, 0.92, 0.046],
      ],
      { sides: 6, axis: 'z', c0: black, c1: black },
    );
    // 朱丹额顶
    gn(
      b,
      [
        [0, 0.185, 0.96, 0.042],
        [0, 0.225, 0.97, 0.018],
      ],
      { sides: 8, c0: red, c1: red, cap: true },
    );
    // 青金长喙
    gn(
      b,
      [
        [0, 0.15, 1.03, 0.024],
        [0, 0.135, 1.28, 0.005],
      ],
      { sides: 6, axis: 'z', c0: beakGold, c1: beakGold, cap: true },
    );
    // 后掠细长双足
    for (const sx of [-0.055, 0.055]) {
      gn(
        b,
        [
          [sx, -0.04, -0.28, 0.016],
          [sx, -0.065, -0.88, 0.011],
        ],
        { sides: 5, axis: 'z', c0: black, c1: beakGold, cap: true },
      );
    }
    b.computeNormals?.();
    return b.build();
  };

  /** 内侧覆羽翼段：从肩部延展至腕关节，带有真实 3D 翼剖面弧度与厚度。 */
  const buildCraneInnerWing = () => {
    const b = new Be();
    const span = 0.64;
    const { positions, indices, shades } = buildFeatheredWing(span, 0.56, 0.09, 0.08);
    for (let i = 0; i < positions.length; i += 3) {
      const shade = shades[i / 3];
      const y = positions[i + 1];
      const inkMix = Math.min(0.28, Math.max(0, shade * 0.35 + (y < 0 ? 0.12 : 0)));
      const col = white.map((c, k) => c + (featherShade[k] - c) * inkMix);
      b.vertex(positions[i], y, 0.14 + positions[i + 2], col);
    }
    for (let i = 0; i < indices.length; i += 3) {
      b.tri(indices[i], indices[i + 1], indices[i + 2]);
    }
    b.computeNormals?.();
    return b.build();
  };

  /** 外侧飞羽翼段：绕腕关节独立折曲滞后，外梢带明显分叉墨黑初级飞羽。 */
  const buildCraneOuterWing = () => {
    const b = new Be();
    const span = 0.78;
    const { positions, indices, shades } = buildFeatheredWing(span, 0.44, 0.11, 0.24);
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const ink = Math.min(1, Math.max(0, (x / span - 0.18) * 1.45) + shades[i / 3] * 0.55);
      const col = white.map((c, k) => c + (black[k] - c) * ink);
      b.vertex(x, positions[i + 1] + (x / span) ** 2 * 0.06, 0.08 + positions[i + 2], col);
    }
    for (let i = 0; i < indices.length; i += 3) {
      b.tri(indices[i], indices[i + 1], indices[i + 2]);
    }
    // 5 根微微上翘分指的墨黑初级飞羽尖，强化立体剪影
    for (let f = 0; f < 5; f++) {
      const frac = f / 4;
      const sx = span * (0.58 + 0.14 * frac);
      const sz = 0.04 - 0.26 * frac;
      const sy = 0.045 + 0.025 * (1 - frac);
      gn(
        b,
        [
          [sx, sy, sz, 0.028],
          [sx + 0.24 + 0.06 * (1 - frac), sy + 0.045, sz - 0.14 * frac, 0.008],
        ],
        { sides: 4, c0: black, c1: black, cap: true },
      );
    }
    b.computeNormals?.();
    return b.build();
  };

  const buildButterflyWing = (cA: number[], cB: number[]) => {
    const b = new Be();
    // 蝶翼前瓣稍翘，后瓣圆收；薄边两侧的浅弧各自受光。
    const outline = [
      [0, 0, 0.045], [0.080, 0.027, 0.10], [0.14, 0.035, 0.115],
      [0.15, 0.024, 0.075], [0.095, 0.010, 0.004], [0.12, 0.013, -0.038],
      [0.097, 0.009, -0.082], [0.054, 0.002, -0.085], [0, 0, -0.035],
    ];
    for (const face of [1, -1]) {
      const vein = b.vertex(0.05, 0.018 + face * 0.008, 0.006, cA, 0, face, 0, 0, 0.25);
      const rim = outline.map(([x, y, z]) => b.vertex(x, y, z, x === 0 ? cA : cB, 0, face, 0, 0, 0.3));
      for (let j = 0; j < rim.length; j++) {
        const next = rim[(j + 1) % rim.length];
        if (face > 0) b.tri(vein, rim[j], next);
        else b.tri(vein, next, rim[j]);
      }
    }
    b.computeNormals?.();
    return b.build();
  };

  const geoKoiRB = buildKoiBody(false);
  const geoKoiGold = buildKoiBody(true);
  const geoKoiTailRed = buildKoiTail(white, red);
  const geoKoiTailGold = buildKoiTail(gold, red);
  const geoCraneBody = buildCraneBody();
  const geoCraneInner = buildCraneInnerWing();
  const geoCraneOuter = buildCraneOuterWing();
  const geoBflyGold = buildButterflyWing(gold, yt(0xffe8a6));
  const geoBflyBlue = buildButterflyWing(azure, teal);

  // 2. 放置 12 尾汴河锦鲤（避开河道大龙坑正中心太近的位置）
  const riverPts = mapSdf.riverLine;
  const koiActors: {
    group: WildlifeGroup;
    tail: WildlifeGroup;
    baseX: number;
    baseZ: number;
    dirX: number;
    dirZ: number;
    phase: number;
    speed: number;
    amp: number;
  }[] = [];

  for (let i = 0; i < 12; i++) {
    const segIdx = Math.min(riverPts.length - 2, Math.floor((i / 12) * (riverPts.length - 1)));
    const p0 = riverPts[segIdx];
    const p1 = riverPts[segIdx + 1];
    const tSeg = rng.range(0.15, 0.85);
    const x = p0.x + (p1.x - p0.x) * tSeg + rng.range(-2.2, 2.2);
    const z = p0.y + (p1.y - p0.y) * tSeg + rng.range(-2.2, 2.2);
    if (Math.max(Math.abs(x), Math.abs(z)) > mapSdf.map.bound - 2) continue;

    const dx = p1.x - p0.x;
    const dz = p1.y - p0.y;
    const len = Math.hypot(dx, dz) || 1;
    const isGold = i % 2 === 1;
    const grp = new Ji();
    grp.name = `koi_${i}`;
    grp.scale.setScalar(rng.range(0.85, 1.28));
    const body = new Sn(isGold ? geoKoiGold : geoKoiRB, mat);
    const tail = new Sn(isGold ? geoKoiTailGold : geoKoiTailRed, mat);
    tail.position.set(0, 0, -0.32);
    grp.add(body);
    grp.add(tail);
    grp.position.set(x, waterLevel - 0.14, z);
    root.add(grp);

    koiActors.push({
      group: grp,
      tail,
      baseX: x,
      baseZ: z,
      dirX: (dx / len) * (i % 3 === 0 ? -1 : 1),
      dirZ: (dz / len) * (i % 3 === 0 ? -1 : 1),
      phase: rng.range(0, TAU),
      speed: rng.range(0.32, 0.55),
      amp: rng.range(2.4, 4.2),
    });
  }

  // 3. 放置 6 只掠过汴河山谷的灵动白仙鹤（肩腕双关节折翼 + 大半径高速穿行）
  const craneActors: {
    group: WildlifeGroup;
    wingL: WildlifeGroup;
    wingR: WildlifeGroup;
    outerL: WildlifeGroup;
    outerR: WildlifeGroup;
    cx: number;
    cz: number;
    cy: number;
    rx: number;
    rz: number;
    speed: number;
    phase: number;
    fig8: boolean;
  }[] = [];

  const craneRoutes: [number, number, number, number, number, number, boolean][] = [
    [-8, 6, 11.8, 30, 22, 0.34, false],
    [-6, 8, 12.6, 28, 20, 0.34, false],
    [10, -8, 12.2, 34, 24, -0.32, true],
    [0, 0, 13.4, 38, 28, 0.3, true],
    [-28, -22, 11.5, 24, 18, -0.38, false],
    [28, 22, 12.0, 24, 18, 0.38, false],
  ];
  craneRoutes.forEach(([cx, cz, cy, rx, rz, spd, fig8], idx) => {
    const grp = new Ji();
    grp.name = `crane_${idx}`;
    grp.scale.setScalar(rng.range(0.52, 0.62));
    const body = new Sn(geoCraneBody, craneMat);
    const wingL = new Sn(geoCraneInner, craneMat);
    const wingR = new Sn(geoCraneInner, craneMat);
    wingR.scale.x = -1;
    wingL.position.set(0.11, 0.04, 0.04);
    wingR.position.set(-0.11, 0.04, 0.04);

    const outerL = new Sn(geoCraneOuter, craneMat);
    const outerR = new Sn(geoCraneOuter, craneMat);
    outerL.position.set(0.58, 0.04, -0.02);
    outerR.position.set(0.58, 0.04, -0.02);
    wingL.add(outerL);
    wingR.add(outerR);

    grp.add(body);
    grp.add(wingL);
    grp.add(wingR);
    root.add(grp);

    craneActors.push({
      group: grp,
      wingL,
      wingR,
      outerL,
      outerR,
      cx,
      cz,
      cy,
      rx,
      rz,
      speed: spd,
      phase: idx === 1 ? 0.28 : (idx / craneRoutes.length) * TAU,
      fig8,
    });
  });

  // 4. 放置 14 只秋苑翩跹蝴蝶（金蝶 / 青蝶）
  const butterflyActors: {
    group: WildlifeGroup;
    wingL: WildlifeGroup;
    wingR: WildlifeGroup;
    bx: number;
    by: number;
    bz: number;
    rad: number;
    phase: number;
    spd: number;
  }[] = [];

  for (let i = 0; i < 14; i++) {
    const segIdx = Math.min(riverPts.length - 2, Math.floor((i / 14) * (riverPts.length - 1)));
    const pt = riverPts[segIdx];
    const side = i % 2 === 0 ? 1 : -1;
    const bx = pt.x + side * rng.range(5.2, 10.5);
    const bz = pt.y - side * rng.range(4.0, 9.5);
    const by = rng.range(0.75, 2.1);
    const isBlue = i % 3 === 0;
    const grp = new Ji();
    grp.name = `butterfly_${i}`;
    grp.scale.setScalar(rng.range(0.9, 1.25));
    const wing = isBlue ? geoBflyBlue : geoBflyGold;
    const wL = new Sn(wing, mat);
    const wR = new Sn(wing, mat);
    wR.scale.x = -1;
    grp.add(wL);
    grp.add(wR);
    root.add(grp);

    butterflyActors.push({
      group: grp,
      wingL: wL,
      wingR: wR,
      bx,
      by,
      bz,
      rad: rng.range(1.1, 2.2),
      phase: rng.range(0, TAU),
      spd: rng.range(1.1, 1.8),
    });
  }

  let simTime = 0;
  function update(dt: number) {
    simTime += Math.max(0, Math.min(0.1, dt || 0.016));

    // 锦鲤摆尾游弋
    for (let i = 0; i < koiActors.length; i++) {
      const k = koiActors[i];
      const u = simTime * k.speed + k.phase;
      const travel = Math.sin(u) * k.amp;
      const sway = Math.cos(u * 2) * 0.65;
      const vx = Math.cos(u) * k.speed * k.amp;
      const px = k.baseX + k.dirX * travel - k.dirZ * sway;
      const pz = k.baseZ + k.dirZ * travel + k.dirX * sway;
      k.group.position.set(px, waterLevel - 0.14 + Math.sin(u * 3) * 0.02, pz);
      const heading = Math.atan2(k.dirX * vx, k.dirZ * vx);
      k.group.rotation.set(0, heading, Math.sin(simTime * 5 + k.phase) * 0.08);
      k.tail.rotation.set(0, Math.sin(simTime * 7.5 + k.phase) * 0.45, 0);
    }

    // 白鹤高速掠空穿行（肩腕两段折翼振翅 + 弓翼滑翔 + 转向压坡）
    for (let i = 0; i < craneActors.length; i++) {
      const c = craneActors[i];
      const a = simTime * c.speed + c.phase;
      const x = c.cx + Math.cos(a) * c.rx;
      const z = c.cz + (c.fig8 ? Math.sin(a * 2) * c.rz * 0.65 : Math.sin(a) * c.rz);
      const vx = -Math.sin(a) * c.rx * c.speed;
      const vz = c.fig8
        ? Math.cos(a * 2) * 2 * c.rz * 0.65 * c.speed
        : Math.cos(a) * c.rz * c.speed;
      const ax = -Math.cos(a) * c.rx * c.speed * c.speed;
      const az = c.fig8
        ? -Math.sin(a * 2) * 4 * c.rz * 0.65 * c.speed * c.speed
        : -Math.sin(a) * c.rz * c.speed * c.speed;
      const spdSq = Math.max(1, vx * vx + vz * vz);
      const latAccel = (vx * az - vz * ax) / spdSq;

      const cycle = (simTime * 0.36 + i * 0.43) % 1;
      const flapEnv = cycle < 0.62 ? Math.sin((cycle / 0.62) * Math.PI) : 0;
      const stroke = simTime * 9.6 + c.phase;
      const innerFlap = flapEnv > 0.02 ? Math.sin(stroke) * 0.48 * flapEnv + 0.06 : 0.14;
      const outerFlap = flapEnv > 0.02
        ? Math.sin(stroke - 1.08) * 0.68 * flapEnv - 0.12
        : -0.22;
      const pitch = Math.cos(stroke) * 0.14 * flapEnv;
      const heave = -Math.sin(stroke) * 0.14 * flapEnv + Math.sin(a * 2 + c.phase) * 0.55;
      const bank = Math.max(-0.42, Math.min(0.42, latAccel * 0.85));

      c.group.position.set(x, c.cy + heave, z);
      c.group.rotation.set(-0.05 + flapEnv * 0.03, Math.atan2(vx, vz), bank);
      c.wingL.rotation.set(pitch, 0, innerFlap);
      c.wingR.rotation.set(pitch, 0, -innerFlap);
      c.outerL.rotation.set(pitch * 0.45, -0.06, outerFlap);
      c.outerR.rotation.set(pitch * 0.45, -0.06, outerFlap);
    }

    // 彩蝶花间翩跹
    for (let i = 0; i < butterflyActors.length; i++) {
      const bf = butterflyActors[i];
      const a = simTime * bf.spd + bf.phase;
      const x = bf.bx + Math.cos(a) * bf.rad;
      const z = bf.bz + Math.sin(a * 1.3) * bf.rad;
      const y = bf.by + Math.sin(simTime * 2.8 + bf.phase) * 0.35;
      bf.group.position.set(x, y, z);
      bf.group.rotation.set(0.15, Math.atan2(-Math.sin(a), Math.cos(a * 1.3)), 0);
      const w = Math.sin(simTime * 18 + bf.phase) * 0.78;
      bf.wingL.rotation.set(0, 0, w);
      bf.wingR.rotation.set(0, 0, -w);
    }
  }

  function dispose() {
    [
      geoKoiRB,
      geoKoiGold,
      geoKoiTailRed,
      geoKoiTailGold,
      geoCraneBody,
      geoCraneInner,
      geoCraneOuter,
      geoBflyGold,
      geoBflyBlue,
    ].forEach((g) => g.dispose?.());
    mat.dispose?.();
    craneMat.dispose?.();
  }

  // 先执行一次初始布位
  update(0.016);

  return {
    group: root,
    count: koiActors.length + craneActors.length + butterflyActors.length,
    update,
    dispose,
  };
}
