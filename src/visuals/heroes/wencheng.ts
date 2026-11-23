/**
 * wencheng.ts — 文成公主 3D 英雄模型（100% 按立绘 azao.pc.webp 精雕重构）
 *
 * 立绘标志特征：
 * - 彻底摒弃旧版蓝橙锥裙与硬圆环！主色调 100% 还原盛唐【象牙米白织金团花 + 浓郁朱红织金宝相花宽镶边 + 鎏金红宝 + 绿松石点缀】；
 * - 温婉明媚盛唐少女娇容 + 眉心朱红花钿 + 乌黑高云盘发 + 华美镂空鎏金红宝凤冠 + 绿松石长耳坠 + 多条飘扬朱红发带；
 * - 盛唐高腰大广袖象牙织金襦裙（宽大朱红织金袖缘）+ 玄黑鎏金镶绿松石华丽腰封 + 珠串金穗禁步；
 * - 三层蓬松垂地大裙摆（外象牙织金滚红边 + 中红金绸带 + 底朱红百褶裙）+ 绣金朱红翘头丝履；
 * - 双臂优雅缠绕并向两侧飞扬的多层朱红织金飞天披帛（末端缀红珠与金色流苏穗）；
 * - 配象牙白玉×朱红漆×鎏金雕凤反曲角弓与朱红织金箭箙（100% 兼容 PU 拉弦射箭动画）。
 */

import { addHeroCompanion } from './companions';
import {
  buildBlossomHairpin,
  buildDropEarring,
  buildSculptedTangSongHead,
  buildTatteredCape,
  buildWideSleeve,
} from './sculptKit';
import { clamp01, mixVal, TS_FEMALE_RIG, type FullHeroEngineApi } from './types';

export function buildWenchengFull(api: FullHeroEngineApi, pal: Record<string, number>) {
  const { Gh, Ra, Ls, K, En, pt, bt, Zi, Bl, Ox, Ko, Wd } = api;
  const n = Gh(TS_FEMALE_RIG);
  const { rig: t, J: e, d: s } = n;
  const i = new Ls();
  const a = s.shoulderX;
  const o = s.handY;
  const headScale = 0.74;

  // 严格匹配 PU() 拉弦射箭骨骼
  const l = t.add('bowUp', e.propL, a, o, 0.12);
  const c = t.add('bowDn', e.propL, a, o, -0.12);
  const f = t.add('nock', e.propL, a, o + Ra.string, 0);
  const d = t.add('arrow', f, a, o + Ra.string, 0);

  // 左右两侧舒展飞扬的朱红织金飞天长披帛（正面清晰可见红金丝带与金穗！）
  const makeRibbon = (side: number) => [
    [side * 0.18, 1.44, -0.02],
    [side * 0.4, 1.24, 0.02],
    [side * 0.58, 0.94, -0.02],
    [side * 0.68, 0.58, 0.02],
    [side * 0.74, 0.28, 0.04],
  ];
  const uChain = t.addChain('capeL', e.chest, makeRibbon(1).slice(0, 4));
  const mChain = t.addChain('capeR', e.chest, makeRibbon(-1).slice(0, 4));
  for (const rb of [uChain, mChain]) {
    t.chain({
      joints: rb,
      tip: [0, -0.2, 0.04],
      stiffness: 3.5,
      drag: 0.72,
      gravity: 11,
      maxAngle: 46,
      wind: 2.5,
      colliders: [
        { joint: e.hips, x: 0, y: -0.04, z: 0, r: 0.26 },
        { joint: e.chest, x: 0, y: 0, z: 0, r: 0.22 },
      ],
    });
  }

  // 头冠后垂落的多条朱红丝发带物理链
  const cyRef = s.headY + 0.2 * headScale;
  const headRibPts = [
    [0.06, cyRef + 0.12 * headScale, -0.14],
    [0.18, cyRef - 0.04 * headScale, -0.28],
    [0.3, cyRef - 0.24 * headScale, -0.4],
    [0.38, cyRef - 0.46 * headScale, -0.48],
  ];
  const headRibChain = t.addChain('headRib', e.head, headRibPts.slice(0, 3));
  t.chain({ joints: headRibChain, tip: [0.06, -0.16, -0.08], stiffness: 7, drag: 0.8, gravity: 5.5, maxAngle: 50, wind: 4 });

  const ivory = pal.lining ?? 0xf4ecdc;
  const ivoryShade = pal.liningShade ?? 0xd6c4a4;
  const vermilion = pal.silk ?? 0xc43622;
  const vermilionDark = pal.robeDark ?? 0x7d1c14;
  const gold = pal.brass ?? 0xe4b54c;
  const goldHi = 0xfff0b2;
  const turquoise = pal.jade ?? 0x3ba89e;
  const darkBelt = pal.lacquer ?? 0x261a18;

  // ── 1. 绣金朱红翘头丝履（内腿隐于三层大裙之下） ──
  i.sym((side) => {
    const hx = s.hipX;
    i.bone(side > 0 ? e.thighL : e.thighR).paint(ivoryShade, { c2: ivory, mat: K.cloth, line: 0.3 });
    i.limb([hx, s.hipY + 0.04, 0], [hx, s.kneeY, 0], 0.078, 0.064, { seg: 8 });
    i.bone(side > 0 ? e.shinL : e.shinR).paint(ivory, { c2: ivoryShade, mat: K.cloth, line: 0.3 });
    i.limb([hx, s.kneeY, 0], [hx, s.ankleY, 0], 0.058, 0.046, { seg: 6 });
  });
  for (const side of [1, -1]) {
    i.paint(vermilion, { c2: gold, gloss: 0.45, mat: K.cloth, pattern: En.weave, patternScale: 12, patternAmt: 0.3, line: 0.4 });
    Ox(i, n, side, { top: 0.16, rTop: 0.058, rAnkle: 0.048, len: 0.21, toe: 0.034, seg: 10 });
    i.bone(side > 0 ? e.footL : e.footR).paint(gold, { c2: goldHi, gloss: 1, mat: K.metal, line: 0 });
    i.ball(side * s.hipX, 0.068, 0.18, 0.014, 0.012, 0.014, 0);
  }

  // ── 2. 盛唐三层蓬松象牙织金×朱红宝相花大长裙（完全忠实立绘绝美蓬松褶摆！） ──
  const skirtBind = (sideX: number, y: number) => {
    const th = sideX >= 0 ? e.thighL : e.thighR;
    const sh = sideX >= 0 ? e.shinL : e.shinR;
    if (y >= 0.98) return [e.chest, e.chest, 1];
    if (y >= 0.5) return [e.hips, th, clamp01(1 - (0.98 - y) / 0.48)];
    return [th, sh, clamp01(1 - clamp01((0.5 - y) / 0.38) * 0.52)];
  };

  // 2a. 最底层：浓郁朱红百褶底裙（露出于象牙外裙底部波浪之下！）
  i.bind(skirtBind).paint(vermilion, {
    c2: vermilionDark,
    mat: K.cloth,
    pattern: En.weave,
    patternScale: 10,
    patternAmt: 0.26,
    line: 0.55,
  });
  i.lathe(
    [
      [0.09, 0.44, 0.42],
      [0.34, 0.34, 0.32],
      [0.68, 0.23, 0.21],
      [1.04, 0.168, 0.136],
    ],
    {
      seg: 24,
      cap0: false,
      cap1: false,
      shape: (ang: number, idx: number) =>
        1 + (idx < 2 ? 0.075 * Math.sin(ang * 14) : 0.02 * Math.sin(ang * 14)),
    },
  );

  // 2b. 主外层：大开幅象牙米白织金团花长裙（高分段大波浪褶摆 + 宽厚朱红织金宝相花滚边）
  i.bind(skirtBind).paint(ivory, {
    c2: gold,
    ao: 0.92,
    mat: K.cloth,
    pattern: En.weave,
    patternScale: 12,
    patternAmt: 0.32,
    line: 0.58,
    by: (_x: number, yVal: number, _z: number, _r: number, nx: number) =>
      clamp01(0.14 + Math.abs(nx) * 0.22 + (0.4 - yVal) * 0.35),
  });
  i.lathe(
    [
      [0.2, 0.46, 0.43],
      [0.48, 0.34, 0.32],
      [0.78, 0.22, 0.196],
      [1.08, 0.165, 0.134],
      [1.22, 0.172, 0.136],
    ],
    {
      seg: 26,
      cap0: false,
      cap1: false,
      shape: (ang: number, idx: number) =>
        1 + (idx < 3 ? (0.09 - idx * 0.022) * Math.sin(ang * 8) : 0),
    },
  );
  // 象牙外裙底缘宽厚朱红织金锦边
  i.paint(vermilion, {
    c2: gold,
    mat: K.cloth,
    pattern: En.weave,
    patternScale: 15,
    patternAmt: 0.42,
    line: 0.35,
  });
  i.lathe(
    [
      [0.185, 0.472, 0.442],
      [0.265, 0.442, 0.412],
    ],
    {
      seg: 26,
      cap0: false,
      cap1: false,
      shape: (ang: number) => 1 + 0.09 * Math.sin(ang * 8),
    },
  );

  // 2c. 中前对称垂落的两条宽幅朱红织金绸带外摆（充分外浮远离白裙表面，零穿模零 Z-fighting！）
  i.sym(() => {
    i.sheet(
      5,
      10,
      (u, v) => {
        const xOff = mixVal(0.075, 0.35, v) + (u - 0.5) * mixVal(0.052, 0.095, v);
        const yOff = bt(1.13, 0.22, v);
        // 严格高于白裙前表面弧线 (+0.045 净空)
        const baseZ = mixVal(0.165, 0.48, Math.pow(v, 1.05));
        const zOff = baseZ + 0.032 - Math.abs(xOff) * 0.28 + (u - 0.5) * 0.01;
        return [xOff, yOff, zOff];
      },
      true,
      180,
    );
  });

  // ── 3. 高腰象牙织金短襦 + 玄黑鎏金绿松石腰封 + 珠串金穗禁步 ──
  i.bind(Bl(n)).paint(ivory, {
    c2: gold,
    ao: 0.92,
    mat: K.cloth,
    pattern: En.weave,
    patternScale: 13,
    patternAmt: 0.28,
    line: 0.5,
  });
  i.lathe(
    [
      [1.18, 0.166, 0.132],
      [1.31, 0.186, 0.138],
      [1.42, 0.172, 0.124],
      [1.49, 0.095, 0.082],
    ],
    { seg: 16 },
  );
  i.bone(e.neck).paint(pal.skin, { ao: 0.82, mat: K.skin, line: 0.32 });
  i.lathe([[1.47, 0.05, 0.05], [1.59, 0.047, 0.047]], { seg: 10, cap0: false });

  // 领口朱红织金镶边
  i.bone(e.chest).paint(vermilion, { c2: gold, mat: K.cloth, pattern: En.weave, patternScale: 14, patternAmt: 0.38, line: 0.3 });
  i.g(pt(0, 1.465, 0.008, 12, 0, 0), () => i.torus(0.118, 0.016, 0.018, 14, 4));

  // 立绘标志性【玄黑鎏金镶绿松石华丽高腰封】
  i.paint(darkBelt, { c2: gold, gloss: 0.72, mat: K.metal, pattern: En.weave, patternScale: 14, patternAmt: 0.38, line: 0.38 });
  i.lathe([[1.12, 0.174, 0.14], [1.22, 0.178, 0.142]], { seg: 18 });
  i.paint(gold, { c2: goldHi, gloss: 1, glow: 0.15, mat: K.metal, line: 0.2 });
  i.g(pt(0, 1.17, 0.144, 0, 0, 0), () => i.box(0, 0, 0, 0.072, 0.064, 0.022, 0.008));
  i.paint(turquoise, { c2: 0xd0fff8, glow: 0.38, gloss: 0.95, mat: K.crystal, line: 0 });
  i.ball(0, 1.17, 0.156, 0.02, 0.02, 0.012, 1);
  i.ball(0.055, 1.17, 0.146, 0.012, 0.012, 0.008, 0);
  i.ball(-0.055, 1.17, 0.146, 0.012, 0.012, 0.008, 0);
  // 腰封垂挂珠串金穗禁步
  i.sym(() => {
    i.paint(vermilion, { c2: gold, mat: K.cloth, line: 0 });
    i.tube([[0.05, 1.13, 0.15, 0.008], [0.09, 0.88, 0.19, 0.007]], { seg: 4 });
    i.paint(gold, { c2: goldHi, gloss: 0.9, mat: K.fur, line: 0.15 });
    i.tube([[0.09, 0.88, 0.19, 0.012], [0.1, 0.77, 0.2, 0.022]], { seg: 6 });
  });

  // ── 4. 盛唐极大飘逸象牙织金大广袖（宽朱红锦边 + 绕臂朱红金穗飞天披帛） ──
  i.sym((side) => {
    buildWideSleeve(api, i, n, side, {
      outer: ivory,
      outerDark: ivoryShade,
      trim: vermilion,
      trimHi: gold,
      inner: 0xfffaf0,
      innerShade: ivoryShade,
      flare: 0.175,
      drop: 0.13,
      pattern: En.weave,
      trimWidth: 0.055,
    });
  });
  i.paint(pal.skin, { ao: 0.88, mat: K.skin, line: 0.32 });
  Ko(i, n, 1, 0.044);
  Ko(i, n, -1, 0.044);

  // 优雅绕肩舒展的多层朱红织金飞天披帛（末端红珠 + 鎏金大流苏穗！）
  for (const [rb, side] of [
    [uChain, 1],
    [mChain, -1],
  ] as [number[], number][]) {
    const pts = makeRibbon(side);
    i.bind(Zi(rb, pts, e.chest)).paint(vermilion, {
      c2: gold,
      mat: K.cloth,
      pattern: En.weave,
      patternScale: 13,
      patternAmt: 0.4,
      line: 0.4,
    });
    buildTatteredCape(api, i, pts, {
      widthFn: (v) => mixVal(0.068, 0.115, Math.sin(v * Math.PI * 0.75)),
      axis: [0.35, 0, side * 0.9],
      bow: [side * 0.04, 0, -0.04],
      nu: 5,
      nv: 11,
      tatterAmp: 0.04,
      wave: 0.32,
      seed: side > 0 ? 1.2 : 3.5,
    });
    // 披帛末端标志红珠 + 金色流苏穗
    const endP = pts[pts.length - 1];
    i.paint(vermilion, { c2: 0xff8070, glow: 0.2, mat: K.crystal, line: 0 });
    i.ball(endP[0], endP[1], endP[2], 0.02, 0.022, 0.02, 0);
    i.paint(gold, { c2: goldHi, gloss: 0.9, mat: K.fur, line: 0.15 });
    i.tube([[endP[0], endP[1] - 0.02, endP[2], 0.015], [endP[0], endP[1] - 0.13, endP[2], 0.028]], { seg: 6 });
  }

  // ── 5. 朱红鎏金织锦箭箙与白羽金箭 ──
  i.bone(e.hips);
  i.g(pt(-0.22, 0.96, -0.14, -30, 0, 24), () => {
    i.paint(vermilion, { c2: vermilionDark, gloss: 0.45, mat: K.leather, pattern: En.weave, patternScale: 12, patternAmt: 0.32, line: 0.4 });
    i.lathe([[-0.26, 0.03, 0.026], [0.14, 0.066, 0.052], [0.2, 0.072, 0.056]], { seg: 10, cap1: false });
    i.paint(gold, { c2: goldHi, gloss: 1, mat: K.metal, line: 0.2 });
    Wd(i, 0, 0.18, 0, 0.074, 0.058, 0.008, 0.012, 10);
    for (let b = 0; b < 5; b++) {
      const w = bt(-0.038, 0.038, b / 4);
      const zOff = b % 2 ? 0.012 : -0.01;
      i.paint(ivory, { c2: gold, mat: K.leather, line: 0 });
      i.tube([[w, 0.1, zOff, 0.0055], [w * 1.1, 0.42, zOff, 0.0055]], { seg: 4 });
      i.paint(0xfffaf2, { mat: K.fur, line: 0 });
      i.g(pt(w * 1.1, 0.37, zOff, 0, 60 + b * 24, 0), () =>
        i.extrude([[-0.03, -0.075], [0.03, -0.075], [0.034, 0.045], [0, 0.075], [-0.034, 0.045]], 0.004, 0),
      );
    }
  });

  // ── 6. 盛唐明媚娇容 + 高云盘发 + 华美鎏金红宝凤冠 + 绿松石长耳坠 + 飘扬红发带 ──
  const head = buildSculptedTangSongHead(api, i, n, {
    skin: pal.skin,
    skinShade: 0xe6b498,
    hair: pal.hair,
    hairHi: pal.hairHi,
    iris: 0x3b2118,
    lip: 0xd44b4b,
    headScale,
    female: true,
    eyeSlant: 7,
    browAngle: 4,
    smile: 0.009,
    huadian: 0xd9382c,
    bangStyle: 'noble',
    sideLockLen: 0.17,
  });

  const k = head.cy;
  const hs = head.s;
  i.bone(e.head);
  // 盛唐丰盈高耸云髻（多层发包叠加）
  i.paint(pal.hair, { c2: pal.hairHi, gloss: 0.22, mat: K.fur, pattern: En.fur, patternScale: 12, patternAmt: 0.3, line: 0.4 });
  i.ball(0, k + 0.17 * hs, -0.035, 0.155, 0.115, 0.15, 1);
  i.ball(0, k + 0.27 * hs, -0.055, 0.115, 0.095, 0.11, 1);
  i.sym(() => {
    i.ball(0.118, k + 0.22 * hs, -0.04, 0.072, 0.075, 0.07, 1);
  });

  // 华美繁复的盛唐鎏金红宝凤冠（镂空金丝凤翅 + 中心红宝石 + 两侧梅花金簪与细步摇！）
  i.paint(gold, { c2: goldHi, gloss: 1, glow: 0.2, mat: K.metal, line: 0.2 });
  i.g(pt(0, k + 0.18 * hs, 0.015, -14, 0, 0), () => i.torus(0.152, 0.012, 0.016, 16, 4));
  // 冠顶镂空雕凤主体
  i.g(pt(0, k + 0.31 * hs, 0.055, -8, 0, 0), () =>
    i.extrude(
      [
        [0, 0.12],
        [0.032, 0.05],
        [0.095, 0.085],
        [0.065, 0.01],
        [0.115, 0.015],
        [0.048, -0.032],
        [-0.048, -0.032],
        [-0.115, 0.015],
        [-0.065, 0.01],
        [-0.095, 0.085],
        [-0.032, 0.05],
      ],
      0.014,
      0.004,
    ),
  );
  // 冠心朱红宝石 + 绿松石点翠
  i.paint(vermilion, { c2: 0xffa696, glow: 0.4, gloss: 0.95, mat: K.crystal, line: 0 });
  i.ball(0, k + 0.3 * hs, 0.075, 0.022, 0.028, 0.014, 1);
  i.sym(() => {
    i.paint(turquoise, { c2: 0xd8fff8, glow: 0.35, mat: K.crystal, line: 0 });
    i.ball(0.058, k + 0.28 * hs, 0.065, 0.012, 0.014, 0.01, 0);
    // 冠侧鎏金红花步摇与金丝坠珠
    i.g(pt(0.118, k + 0.24 * hs, 0.025, 0, 24, -18), () => {
      buildBlossomHairpin(api, i, vermilion, 0xff9a8a, gold, 0.85);
    });
    i.paint(gold, { c2: goldHi, gloss: 1, mat: K.metal, line: 0 });
    i.tube([[0.135, k + 0.22 * hs, 0.01, 0.004], [0.185, k + 0.12 * hs, 0.03, 0.003]], { seg: 4 });
    i.ball(0.185, k + 0.09 * hs, 0.032, 0.011, 0.015, 0.011, 0);
    // 立绘绿松石+红珠鎏金长耳坠
    const earX = head.ring(-0.02 * hs)[0] * 1.02;
    buildDropEarring(api, i, earX, k - 0.055 * hs, -0.005 * hs, turquoise, gold, 1.05);
  });

  // 头冠后飞扬的多条修长朱红发带（绑 headRibChain 物理链）
  i.bind(Zi(headRibChain, headRibPts, e.head)).paint(vermilion, { c2: gold, mat: K.cloth, line: 0.25 });
  buildTatteredCape(api, i, headRibPts, {
    widthFn: (v) => mixVal(0.024, 0.044, v),
    bow: [0.02, 0, -0.02],
    nu: 3,
    nv: 9,
    tatterAmp: 0.08,
    wave: 0.36,
    seed: 1.7,
  });
  buildTatteredCape(
    api,
    i,
    headRibPts.map(([px, py, pz], idx) => [px - 0.05 * idx, py - 0.03 * idx, pz + 0.02 * idx]),
    {
      widthFn: (v) => mixVal(0.02, 0.036, v),
      bow: [-0.02, 0, -0.02],
      nu: 3,
      nv: 8,
      tatterAmp: 0.08,
      wave: 0.3,
      seed: 3.1,
    },
  );

  // ── 7. 象牙白玉×朱红漆×鎏金雕凤反曲角弓（与立绘红金象牙配色完美融为一体！） ──
  const bowZCurve = (b: number) => -0.04 + (Ra.string + 0.04) * (b * b * 0.7 + 0.3 * Math.pow(b, 4));
  const bowLimbPts = (dir: number, t0: number, t1: number) => {
    const out: number[][] = [];
    for (let idx = 0; idx <= 6; idx++) {
      const C = bt(t0, t1, idx / 6);
      out.push([0, bowZCurve(C), dir * (0.06 + C * (Ra.tip - 0.06)), bt(0.022, 0.013, C), bt(0.03, 0.016, C)]);
    }
    return out;
  };
  i.g(pt(a, o, 0), () => {
    // 鎏金雕花弓把
    i.bone(e.propL).paint(gold, { c2: goldHi, gloss: 1, mat: K.metal, line: 0.35 });
    i.tube([[0, -0.04, -0.1, 0.021, 0.025], [0, -0.046, 0, 0.025, 0.03], [0, -0.04, 0.1, 0.021, 0.025]], { seg: 8 });
    for (const dir of [1, -1]) {
      const limbBone = dir > 0 ? l : c;
      i.bind((_x: number, _y: number, zVal: number) => [limbBone, e.propL, clamp01((Math.abs(zVal) - 0.1) / 0.14)]);
      // 朱红大漆×象牙白玉渐变弓臂
      i.paint(vermilion, { c2: ivory, gloss: 0.7, mat: K.leather, line: 0.4 });
      i.tube(bowLimbPts(dir, 0, 1), { seg: 6, up: [1, 0, 0] });
      i.bone(limbBone).paint(gold, { c2: goldHi, gloss: 1, glow: 0.22, mat: K.metal, line: 0.2 });
      const A = dir * Ra.tip;
      i.tube(
        [
          [0, Ra.string, A - dir * 0.03, 0.014, 0.018],
          [0, Ra.string - 0.02, A + dir * 0.06, 0.012, 0.016],
          [0, Ra.string - 0.08, A + dir * 0.14, 0.006, 0.008],
        ],
        { seg: 5, up: [1, 0, 0] },
      );
    }
    const strBind = (_x: number, _y: number, zVal: number) => [zVal >= 0 ? l : c, f, clamp01(Math.abs(zVal) / Ra.tip)];
    i.bind(strBind).paint(0xfff1c4, { line: 0, glow: 0.28, mat: K.cloth });
    const strPts: number[][] = [];
    for (let idx = 0; idx <= 8; idx++) strPts.push([0, Ra.string, bt(-0.86, Ra.tip, idx / 8), 0.0045]);
    i.tube(strPts, { seg: 3, up: [1, 0, 0] });

    i.bone(d).paint(ivory, { c2: gold, mat: K.leather, line: 0.25 });
    i.tube([[0, Ra.string, 0, 0.008], [0, -0.78, 0, 0.008]], { seg: 5 });
    i.paint(gold, { c2: goldHi, gloss: 1, glow: 0.28, mat: K.metal, line: 0 });
    i.g(pt(0, -0.78, 0, 180, 0, 0), () => i.crystal(0.026, 0.11, 4, 0.75, 0.05));
    i.paint(0xfffaf2, { mat: K.fur, line: 0 });
    for (let T = 0; T < 3; T++) {
      i.g(pt(0, 0.1, 0, 0, T * 120, 0), () => i.extrude([[0, -0.06], [0.036, -0.035], [0.036, 0.045], [0, 0.06]], 0.004, 0));
    }
  });

  // ── 8. 伴生灵宠：朱红金铃盛唐小雪狐 ──
  const pet = addHeroCompanion(i, t, e.root, K, En, pt, 'fox');
  i.bakeGrounding(2.1, 0.8, 0.92);
  return { h: n, b: i, extra: { bowUp: l, bowDn: c, nock: f, arrow: d, pet } };
}
