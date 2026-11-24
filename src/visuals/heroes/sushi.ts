/**
 * sushi.ts — 苏轼 3D 英雄模型（100% 按立绘 amo.pc.webp 精雕重构）
 *
 * 立绘标志特征：
 * - 无乌纱展脚官帽！无长胡须！意气风发的北宋青年文豪面容，乌黑蓬松束发高髻系青黛墨蓝飘带；
 * - 内着月白交领长袍与极大飘逸的多层百褶水墨白裙摆（底摆晕染墨青飞白）；
 * - 外罩玄墨靛青水墨竹叶暗金大广袖外袍（En.vein 墨竹纹，袖口露雪白宽内袖）；
 * - 青墨腰带右侧垂挂棕褐双节醉翁酒葫芦 + 朱橙红长流苏穗，足蹬玄墨白边宋式布履；
 * - 左手捧竹简诗卷（绑于 pipa 骨骼），右手执狼毫大毛笔（绑于 handR 骨骼），完美兼容 $U 施法挥毫动作！
 */

import { clothFoldDepth } from '../tangsongCloth';
import { addHeroCompanion } from './companions';
import {
  buildSculptedTangSongHead,
  buildTatteredCape,
  buildWideSleeve,
  buildWineGourd,
} from './sculptKit';
import { clamp01, mixVal, TS_SCHOLAR_RIG, type FullHeroEngineApi } from './types';

export function buildSuShiFull(api: FullHeroEngineApi, pal: Record<string, number>) {
  const { Gh, Ls, K, En, pt, bt, Zi, Bl, Ox, Ko } = api;
  const n = Gh(TS_SCHOLAR_RIG);
  const { rig: t, J: e, d: s } = n;
  const i = new Ls();

  // 严格匹配 $U() 动画控制器骨骼：pipa 承接左手竹简诗卷，handR 挂狼毫大毛笔挥毫施法
  const pipaOrigin: [number, number, number] = [0.16, 1.12, 0.22];
  const o = pt(pipaOrigin[0], pipaOrigin[1], pipaOrigin[2], -10, -24, 14, 1.0);
  const r = o.elements;
  const localToChest = (x: number, y: number, z: number): [number, number, number] => [
    r[0] * x + r[4] * y + r[8] * z,
    r[1] * x + r[5] * y + r[9] * z,
    r[2] * x + r[6] * y + r[10] * z,
  ];
  const c = t.add('pipa', e.chest, pipaOrigin[0], pipaOrigin[1], pipaOrigin[2]);
  const f = t.add('pipaPos', e.chest, 0, s.chestY, 0);
  const d = t.add('pluck', e.chest, 0, s.chestY, 0);
  const h = t.add('free', e.chest, 0, s.chestY, 0);

  const uScale = 0.77;
  const topY = s.headY + 0.2 * uScale;

  // 发髻青黛墨蓝飘带物理链（绑于 hair 链）
  const hairPts = [
    [0.02, topY + 0.22 * uScale, -0.09],
    [0.14, topY + 0.16 * uScale, -0.26],
    [0.24, topY + 0.04 * uScale, -0.44],
    [0.32, topY - 0.12 * uScale, -0.58],
  ];
  const hairChain = t.addChain('hair', e.head, hairPts.slice(0, 3));
  t.chain({
    joints: hairChain,
    tip: [0.08, -0.1, -0.1],
    stiffness: 6.5,
    drag: 0.8,
    gravity: 5,
    maxAngle: 48,
    wind: 3.5,
  });

  // 腰间青墨飘带物理链
  const makeRib = (side: number) => [
    [side * 0.14, 1.02, 0.12],
    [side * 0.24, 0.76, 0.14],
    [side * 0.34, 0.5, 0.12],
    [side * 0.42, 0.26, 0.08],
  ];
  const ribL = t.addChain('ribL', e.hips, makeRib(1).slice(0, 3));
  const ribR = t.addChain('ribR', e.hips, makeRib(-1).slice(0, 3));
  for (const rb of [ribL, ribR]) {
    t.chain({ joints: rb, tip: [0, -0.2, 0.03], stiffness: 7.5, drag: 0.8, gravity: 6.5, maxAngle: 46, wind: 3.2 });
  }

  // 水墨墨青外罩大披摆（绑于 cloak 链）
  const cloakPts = [
    [0, 1.44, -0.12],
    [0, 1.12, -0.24],
    [0, 0.78, -0.34],
    [0, 0.44, -0.42],
    [0, 0.18, -0.48],
  ];
  const cloakChain = t.addChain('cloak', e.chest, cloakPts.slice(0, 4));
  t.chain({
    joints: cloakChain,
    tip: [0, -0.22, -0.05],
    stiffness: 3.5,
    drag: 0.72,
    gravity: 12,
    maxAngle: 46,
    wind: 2.5,
    colliders: [
      { joint: e.hips, x: 0, y: -0.08, z: 0.08, r: 0.3 },
      { joint: e.chest, x: 0, y: 0, z: 0.06, r: 0.25 },
    ],
  });

  const inkDark = pal.cloakDark ?? 0x1a222b;
  const inkMid = pal.cloak ?? 0x2c3b4a;
  const inkHi = pal.cloakLight ?? 0x4f6478;
  const white = pal.robe ?? 0xf3f1ea;
  const whiteShade = pal.robeShade ?? 0xc8ccd0;
  const goldBamboo = pal.gold ?? 0xd4b678;

  // ── 1. 腿部内衬与玄墨白边宋式布履 ──
  i.sym((side) => {
    const hx = s.hipX;
    i.bone(side > 0 ? e.thighL : e.thighR).paint(whiteShade, { c2: white, mat: K.cloth, line: 0.4 });
    i.limb([hx, s.hipY + 0.04, 0], [hx, s.kneeY, 0], 0.1, 0.08, { seg: 8 });
    i.bone(side > 0 ? e.shinL : e.shinR).paint(whiteShade, { c2: white, mat: K.cloth, line: 0.4 });
    i.limb([hx, s.kneeY, 0], [hx, s.ankleY, 0], 0.076, 0.058, { seg: 8 });
  });
  for (const side of [1, -1]) {
    i.paint(0x181c22, { c2: 0x353d4a, gloss: 0.25, mat: K.cloth, line: 0.5 });
    Ox(i, n, side, { top: 0.22, rTop: 0.074, rAnkle: 0.062, len: 0.24, toe: 0.028, seg: 10 });
    // 宋式布履素白滚边（立绘脚面可见标志白边）
    i.bone(side > 0 ? e.footL : e.footR).paint(white, { mat: K.cloth, line: 0 });
    i.g(pt(side * s.hipX, 0.036, 0.08, 0, 0, 0), () => i.box(0, 0, 0, 0.088, 0.016, 0.23, 0.005));
  }

  // ── 2. 宽大飘逸的水墨百褶月白长袍裙摆 + 外层玄墨竹韵大开襟 ──
  const robeBind = (sideX: number, y: number) => {
    const th = sideX >= 0 ? e.thighL : e.thighR;
    const sh = sideX >= 0 ? e.shinL : e.shinR;
    if (y >= 0.94) return [e.hips, e.hips, 1];
    if (y >= 0.5) return [e.hips, th, clamp01(1 - (0.94 - y) / 0.44)];
    return [th, sh, clamp01(1 - clamp01((0.5 - y) / 0.38) * 0.55)];
  };

  // 里层宽大百褶月白长裙摆（底摆渐染水墨青灰，高分段立体深褶）
  i.bind(robeBind).paint(white, {
    c2: inkMid,
    ao: 0.92,
    mat: K.cloth,
    pattern: En.fur,
    patternScale: 7,
    patternAmt: 0.16,
    line: 0.62,
    by: (_x: number, yVal: number, _z: number, _r: number, nx: number) =>
      clamp01((0.28 - yVal) * 2.1 + Math.abs(nx) * 0.15),
  });
  i.lathe(
    [
      [0.12, 0.44, 0.38],
      [0.34, 0.34, 0.29],
      [0.62, 0.245, 0.205],
      [0.88, 0.195, 0.158],
      [1.02, 0.184, 0.146],
    ],
    {
      seg: 40,
      cap0: false,
      cap1: false,
      shape: (ang: number, idx: number) =>
        1 + (idx < 3 ? (0.095 - idx * 0.025) * Math.sin(ang * 10) : 0),
    },
  );

  // 外层左右大开襟玄墨竹叶飘逸外袍片（露出前中大面积雪白长袍，完全忠实立绘剪影！）
  i.bind(robeBind).paint(inkDark, {
    c2: inkHi,
    mat: K.cloth,
    pattern: En.vein,
    patternScale: 9,
    patternAmt: 0.38,
    line: 0.55,
  });
  i.sym(() => {
    i.sheet(
      16,
      9,
      (u, v) => {
        // u=0 为前开襟边缘 (ang ≈ 68°)，u=1 为后侧 (ang ≈ -110°)
        const ang = bt(66, -98, u) * (Math.PI / 180);
        const flare = bt(0.205, 0.48, v) + Math.sin(u * Math.PI) * v * 0.09;
        const wave = Math.sin(u * Math.PI * 3 + v * 4) * 0.022 * v
          + 0.028 * Math.sin(u * Math.PI) * clothFoldDepth(u, v, 2, 1.8);
        const hem = 0.014 * v * v * Math.sin(u * Math.PI * 3);
        return [Math.cos(ang) * (flare + wave), bt(1.0, 0.16, v) + hem, Math.sin(ang) * (flare * 0.86 + wave)];
      },
      true,
      180,
    );
  });

  // ── 3. 上身月白深 V 交领中衣 + 外罩玄墨竹叶金纹披袍 + 青墨缠腰带 + 醉翁酒葫芦 ──
  i.bind(Bl(n)).paint(white, { c2: whiteShade, ao: 0.92, mat: K.cloth, line: 0.5 });
  i.lathe(
    [
      [0.94, 0.19, 0.15],
      [1.08, 0.172, 0.136],
      [1.22, 0.202, 0.152],
      [1.36, 0.236, 0.166],
      [1.47, 0.178, 0.132],
      [1.54, 0.088, 0.082],
    ],
    { seg: 16 },
  );
  // 修长颈部与潇洒微敞交领（立绘微露锁骨颈线的飘逸文人风度）
  i.bone(e.neck).paint(pal.skin, { ao: 0.82, mat: K.skin, line: 0.35 });
  i.lathe([[1.48, 0.064, 0.064], [1.62, 0.06, 0.06]], { seg: 10, cap0: false });

  // 外罩玄墨靛青大交领（带淡金竹叶暗纹）
  i.bone(e.chest).paint(inkDark, {
    c2: goldBamboo,
    mat: K.cloth,
    pattern: En.vein,
    patternScale: 12,
    patternAmt: 0.42,
    line: 0.45,
  });
  i.sym(() => {
    i.tube(
      [
        [0.092, 1.51, 0.03, 0.044, 0.018],
        [0.12, 1.38, 0.12, 0.052, 0.02],
        [0.11, 1.2, 0.158, 0.05, 0.018],
        [0.08, 1.02, 0.16, 0.044, 0.016],
      ],
      { seg: 6, up: [1, 0.2, 0] },
    );
  });
  // 内层雪白交领襟边
  i.paint(white, { c2: whiteShade, mat: K.cloth, line: 0.3 });
  i.tube(
    [
      [0.065, 1.5, 0.055, 0.026, 0.012],
      [0.025, 1.36, 0.158, 0.028, 0.012],
      [-0.065, 1.18, 0.174, 0.024, 0.012],
    ],
    { seg: 5, up: [1, 0.3, 0] },
  );

  // 青墨缠绕宽腰带 + 橙红腰结 + 立绘标志性右腰【棕褐双节酒葫芦 + 橙红长穗】
  i.bone(e.spine).paint(inkMid, { c2: inkDark, mat: K.cloth, pattern: En.weave, patternScale: 10, patternAmt: 0.25, line: 0.45 });
  i.lathe([[0.99, 0.196, 0.158], [1.09, 0.184, 0.148]], { seg: 16 });
  i.paint(0xc94828, { c2: goldBamboo, mat: K.cloth, line: 0.2 });
  i.g(pt(0, 1.03, 0, 5, 0, 0), () => i.torus(0.194, 0.013, 0.013, 16, 4));
  // 右侧偏前挂双节醉翁酒葫芦（外移放大，正面一眼清晰醒目！）
  i.bone(e.hips).g(pt(-0.22, 0.94, 0.175, 16, 22, 26), () => {
    buildWineGourd(api, i, 1.38);
  });

  // 腰间两条青墨水墨长飘带
  for (const [rb, side] of [
    [ribL, 1],
    [ribR, -1],
  ] as [number[], number][]) {
    const pts = makeRib(side);
    i.bind(Zi(rb, pts, e.hips)).paint(inkMid, { c2: inkDark, mat: K.cloth, pattern: En.vein, patternScale: 10, patternAmt: 0.28, line: 0.4 });
    buildTatteredCape(api, i, pts, {
      widthFn: (v) => mixVal(0.042, 0.08, v),
      bow: [0, 0, 0.02],
      nu: 4,
      nv: 9,
      tatterAmp: 0.14,
      seed: side > 0 ? 1.5 : 3.2,
    });
  }

  // ── 4. 极其潇洒宽大的水墨竹纹大广袖（外玄墨淡金竹纹 + 内雪白宽袖！） ──
  i.sym((side) => {
    buildWideSleeve(api, i, n, side, {
      outer: inkDark,
      outerDark: inkHi,
      trim: goldBamboo,
      trimHi: inkMid,
      inner: white,
      innerShade: whiteShade,
      flare: 0.175,
      drop: 0.125,
      pattern: En.vein,
      trimWidth: 0.032,
    });
  });

  i.paint(pal.skin, { ao: 0.88, mat: K.skin, line: 0.35 });
  Ko(i, n, 1, 0.052);
  Ko(i, n, -1, 0.052);

  // 背后飘逸玄墨水墨飞白大外摆（绑 cloakChain 物理链）
  i.bind(Zi(cloakChain, cloakPts, e.chest)).paint(inkDark, {
    c2: white,
    mat: K.cloth,
    pattern: En.vein,
    patternScale: 8,
    patternAmt: 0.35,
    line: 0.5,
    by: (_x: number, yVal: number) => clamp01((0.42 - yVal) * 1.4),
  });
  buildTatteredCape(api, i, cloakPts, {
    widthFn: (v) => mixVal(0.28, 0.52, v),
    bow: [0, 0, -0.09],
    nu: 9,
    nv: 11,
    tatterAmp: 0.2,
    wave: 0.22,
    seed: 2.8,
  });

  // ── 5. 潇洒清逸北宋青年文豪面容 + 束发高髻 + 青黛墨蓝双飘带（彻底无官帽！） ──
  const head = buildSculptedTangSongHead(api, i, n, {
    skin: pal.skin,
    skinShade: 0xd19f7e,
    hair: pal.hair,
    hairHi: pal.hairHi,
    iris: 0x241c18,
    lip: 0xb8705e,
    headScale: uScale,
    female: false,
    eyeSlant: 6,
    browAngle: 12,
    smile: 0.008,
    beard: 'none',
    bangStyle: 'swept',
    sideLockLen: 0.16,
  });

  const cy = head.cy;
  // 蓬松高束文士发髻（发丝凌乱洒脱，还原立绘不羁才子气质）
  i.bone(e.head).paint(pal.hair, {
    c2: pal.hairHi,
    gloss: 0.22,
    mat: K.fur,
    pattern: En.fur,
    patternScale: 12,
    patternAmt: 0.3,
    line: 0.4,
  });
  i.ball(0, cy + 0.265 * uScale, -0.045, 0.088, 0.075, 0.088, 1);
  i.ball(0.032, cy + 0.31 * uScale, -0.055, 0.056, 0.048, 0.058, 1);
  i.ball(-0.028, cy + 0.29 * uScale, -0.065, 0.052, 0.046, 0.052, 1);
  // 青黛墨蓝束发带环 + 两条飞扬青墨发带（绑 hairChain 物理链）
  i.paint(inkMid, { c2: inkHi, mat: K.cloth, line: 0.25 });
  i.g(pt(0, cy + 0.235 * uScale, -0.045, -20, 0, 0), () => i.torus(0.092, 0.016, 0.016, 12, 4));
  i.bind(Zi(hairChain, hairPts, e.head)).paint(inkMid, { c2: inkHi, mat: K.cloth, line: 0.25 });
  buildTatteredCape(api, i, hairPts, {
    widthFn: (v) => mixVal(0.026, 0.042, v),
    bow: [0, 0.01, 0],
    nu: 3,
    nv: 8,
    tatterAmp: 0.08,
    wave: 0.3,
    seed: 1.9,
  });
  buildTatteredCape(
    api,
    i,
    hairPts.map(([px, py, pz], idx) => [px - 0.04 * idx, py - 0.035 * idx, pz + 0.02 * idx]),
    {
      widthFn: (v) => mixVal(0.022, 0.036, v),
      bow: [0, -0.01, 0],
      nu: 3,
      nv: 7,
      tatterAmp: 0.08,
      wave: 0.26,
      seed: 3.4,
    },
  );

  // ── 6. 立绘同款手持物：左手抱【竹简诗卷】(pipaBone) + 右手执【狼毫大毛笔】(handR) ──
  // 6a. 左手捧持的温润竹简书卷（由 11 片排立竹简与双道古铜编绳雕成）
  i.bone(c);
  i.g(o, () => {
    i.paint(0xc49f68, { c2: 0x8f6b3c, gloss: 0.42, mat: K.leather, pattern: En.strata, patternScale: 10, patternAmt: 0.25, line: 0.38 });
    // 卷起的主竹简束 + 半展开的竹简片
    for (let k = -5; k <= 5; k++) {
      const ang = k * 0.14;
      const sx = Math.sin(ang) * 0.135;
      const sz = (1 - Math.cos(ang)) * 0.12;
      i.g(pt(sx, 0, sz, 0, (-ang * 180) / Math.PI, 0), () => {
        i.box(0, 0, 0, 0.022, 0.34, 0.012, 0.003);
      });
    }
    // 左侧卷紧的圆柱简轴
    i.g(pt(-0.11, 0, 0.04, 0, 0, 0), () => {
      i.lathe([[-0.17, 0.046], [0.17, 0.046]], { seg: 10 });
    });
    // 上下两道编简麻绳与淡墨书法灵光
    i.paint(0x52341c, { mat: K.leather, line: 0 });
    for (const yRope of [-0.11, 0.11]) {
      i.tube(
        [
          [-0.12, yRope, 0.045, 0.006],
          [0, yRope, 0.01, 0.006],
          [0.12, yRope, 0.04, 0.006],
        ],
        { seg: 4 },
      );
    }
    // 简面微光青碧诗韵
    i.paint(0x88f0e2, { c2: 0xffffff, glow: 0.48, line: 0 });
    i.box(0.01, 0.02, 0.014, 0.11, 0.012, 0.006, 0.002);
    i.box(-0.01, -0.04, 0.014, 0.09, 0.01, 0.006, 0.002);
  });

  // 6b. 右手执立绘同款【紫竹狼毫大毛笔】（挂于 handR，笔杆舒展上挑，正面清晰可见挥毫意态！）
  i.bone(e.handR);
  i.g(pt(-s.shoulderX, s.handY, 0, -48, 26, -18), () => {
    // 紫竹漆杆笔身 + 金铜笔箍
    i.paint(0x52301a, { c2: 0x8f5b34, gloss: 0.58, mat: K.leather, line: 0.45 });
    i.tube(
      [
        [0, 0, -0.32, 0.015],
        [0, 0, 0.24, 0.019],
      ],
      { seg: 8 },
    );
    i.paint(goldBamboo, { c2: 0xfff0b8, gloss: 1, mat: K.metal, line: 0.2 });
    i.tube([[0, 0, 0.22, 0.022], [0, 0, 0.27, 0.025]], { seg: 8 });
    // 饱满雪白狼毫笔锋 + 蘸饱墨韵笔尖
    i.paint(0xfaf8f2, {
      c2: 0x16202a,
      by: (_x: number, _y: number, _z: number, rVal: number) => clamp01((rVal - 0.5) / 0.5),
      mat: K.fur,
      line: 0.35,
    });
    i.tube(
      [
        [0, 0, 0.27, 0.026],
        [0, 0, 0.35, 0.036],
        [0, 0, 0.44, 0.024],
        [0, 0, 0.51, 0.004],
      ],
      { seg: 10 },
    );
  });

  // ── 7. 伴生灵宠：水墨丹顶白仙鹤 ──
  const pet = addHeroCompanion(i, t, e.root, K, En, pt, 'crane');
  i.bakeGrounding(2.1, 0.8, 0.92);

  return {
    h: n,
    b: i,
    extra: {
      pipa: c,
      pipaPos: f,
      pluck: d,
      free: h,
      ax: [localToChest(1, 0, 0), localToChest(0, 1, 0), localToChest(0, 0, 1)],
      // 右手执笔悬于书卷前右侧，挥毫泼墨姿态洒脱自然
      handR: (() => {
        const p = localToChest(-0.24, 0.04, 0.12);
        return [p[0], p[1], p[2]];
      })(),
      // 左手轻托竹简书卷底侧
      handL: (() => {
        const p = localToChest(0.02, -0.06, 0.04);
        return [p[0], p[1], p[2]];
      })(),
      face: localToChest(-0.18, 0.05, 0.18),
      pet,
    },
  };
}
