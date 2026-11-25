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

  const white = yt(0xfaf6ee);
  const red = yt(0xd93824);
  const gold = yt(0xf0b844);
  const black = yt(0x1f2228);
  const azure = yt(0x3a92b8);
  const teal = yt(0x78e0d8);
  const beakGold = yt(0xd99e36);

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
    // 躯干与尾
    gn(
      b,
      [
        [0, -0.02, -0.45, 0.04],
        [0, 0, -0.2, 0.14],
        [0, 0.02, 0.14, 0.15],
        [0, 0.04, 0.35, 0.07],
      ],
      { sides: 8, axis: 'z', c0: black, c1: white, cap: true },
    );
    // 优雅前伸长颈与丹顶喙
    gn(
      b,
      [
        [0, 0.03, 0.32, 0.05],
        [0, 0.08, 0.62, 0.042],
        [0, 0.12, 0.86, 0.055],
      ],
      { sides: 7, axis: 'z', c0: white, c1: white, cap: true },
    );
    gn(
      b,
      [
        [0, 0.15, 0.85, 0.042],
        [0, 0.19, 0.86, 0.02],
      ],
      { sides: 6, c0: red, c1: red, cap: true },
    );
    gn(
      b,
      [
        [0, 0.12, 0.91, 0.025],
        [0, 0.11, 1.14, 0.005],
      ],
      { sides: 5, axis: 'z', c0: beakGold, c1: beakGold, cap: true },
    );
    // 后伸双细腿
    for (const sx of [-0.05, 0.05]) {
      gn(
        b,
        [
          [sx, -0.04, -0.25, 0.015],
          [sx, -0.06, -0.78, 0.012],
        ],
        { sides: 4, axis: 'z', c0: black, c1: beakGold, cap: true },
      );
    }
    b.computeNormals?.();
    return b.build();
  };

  const buildCraneWing = () => {
    const b = new Be();
    const span = 1.25;
    const { positions, indices, shades } = buildFeatheredWing(span, 0.52, 0.18, 0.26);
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const ink = Math.min(1, Math.max(0, (x / span - 0.46) * 1.75) + shades[i / 3]);
      const col = white.map((c, k) => c + (black[k] - c) * ink);
      b.vertex(x, positions[i + 1], 0.18 + positions[i + 2], col);
    }
    for (let i = 0; i < indices.length; i += 3) {
      b.tri(indices[i], indices[i + 1], indices[i + 2]);
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
  const geoCraneWing = buildCraneWing();
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

  // 3. 放置 5 只云巅盘旋白仙鹤
  const craneActors: {
    group: WildlifeGroup;
    wingL: WildlifeGroup;
    wingR: WildlifeGroup;
    cx: number;
    cz: number;
    cy: number;
    rx: number;
    rz: number;
    speed: number;
    phase: number;
  }[] = [];

  const craneCenters = [
    [-24, 18, 18.8],
    [24, -18, 19.5],
    [-10, -26, 20.6],
    [-38, -32, 18.8],
    [38, 32, 18.8],
  ];
  craneCenters.forEach(([cx, cz, cy], idx) => {
    const grp = new Ji();
    grp.name = `crane_${idx}`;
    grp.scale.setScalar(rng.range(0.68, 0.84));
    const body = new Sn(geoCraneBody, mat);
    const wingL = new Sn(geoCraneWing, mat);
    const wingR = new Sn(geoCraneWing, mat);
    wingR.scale.x = -1;
    wingL.position.set(0.11, 0.04, 0.04);
    wingR.position.set(-0.11, 0.04, 0.04);
    grp.add(body);
    grp.add(wingL);
    grp.add(wingR);
    root.add(grp);

    craneActors.push({
      group: grp,
      wingL,
      wingR,
      cx,
      cz,
      cy,
      rx: rng.range(12, 20),
      rz: rng.range(10, 18),
      speed: rng.range(0.16, 0.24) * (idx % 2 === 0 ? 1 : -1),
      phase: (idx / craneCenters.length) * TAU,
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

    // 白鹤云巅盘旋（优雅滑翔 + 周期轻扇）
    for (let i = 0; i < craneActors.length; i++) {
      const c = craneActors[i];
      const a = simTime * c.speed + c.phase;
      const x = c.cx + Math.cos(a) * c.rx;
      const z = c.cz + Math.sin(a) * c.rz;
      const vx = -Math.sin(a) * c.rx * c.speed;
      const vz = Math.cos(a) * c.rz * c.speed;
      const flapCycle = (simTime * 0.5 + i * 0.7) % 1;
      const flapEnv = flapCycle < 0.55 ? Math.sin((flapCycle / 0.55) * Math.PI) : 0;
      const stroke = simTime * 7.2 + c.phase;
      const flap = Math.sin(stroke) * 0.55 * flapEnv + 0.08;
      const pitch = Math.cos(stroke) * 0.13 * flapEnv;
      c.group.position.set(x, c.cy + Math.sin(simTime * 0.9 + c.phase) * 0.65, z);
      c.group.rotation.set(-0.04, Math.atan2(vx, vz), c.speed > 0 ? 0.18 : -0.18);
      c.wingL.rotation.set(pitch, 0, flap);
      c.wingR.rotation.set(pitch, 0, -flap);
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
      geoCraneWing,
      geoBflyGold,
      geoBflyBlue,
    ].forEach((g) => g.dispose?.());
    mat.dispose?.();
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
