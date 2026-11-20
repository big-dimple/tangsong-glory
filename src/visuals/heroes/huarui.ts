/**
 * huarui.ts — 花蕊夫人 3D 英雄模型（100% 按立绘 xiemu.pc.webp 精雕重构）
 *
 * 立绘标志特征：
 * - 彻底告别旧版粉红超短裙露腿与双丸子！100% 还原冷艳英气的后蜀绯金海棠剑舞女侠；
 * - 乌黑高盘发髻 + 鎏金花冠 + 淡粉梅花/海棠立体花簇金步摇 + 金流苏 + 脑后长及腰际的蓬松黑卷发与绯红发带；
 * - 象牙米白织金海棠高腰抹胸长裙 + 绯红织金海棠大广袖长外袍（内翻象牙白广袖）+ 玄黑鎏金海棠扣宽腰封；
 * - 标志性【绯红织金 × 象牙米白 × 玄黑暗金三色多层放射交错垂地大舞裙】，脚下微露朱红织金绣花鞋；
 * - 右手执修长清冷百炼精钢长剑（镂空鎏金圆云纹剑格、细长剑柄、绯红金穗剑坠），100% 兼容 AU()/TU() 剑舞动作。
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

export function buildHuaRuiWarriorFull(api: FullHeroEngineApi, pal: Record<string, number>) {
  const { Gh, Ls, K, En, pt, bt, Zi, Bl, Ox, Ko, af } = api;
  const n = Gh(TS_FEMALE_RIG);
  const { rig: t, J: e, d: s } = n;
  const i = new Ls();
  const headScale = 0.74;

  // 严格匹配 AU()/TU() 握剑骨骼
  const a = t.add('gripR', e.chest, 0, s.chestY, 0);
  const o = t.add('aim', e.chest, 0, s.chestY, 0);
  const r = t.add('gripL', e.chest, 0, s.chestY, 0);

  // 立绘标志性飘逸长黑卷发（绑 pony 物理链）+ 绯红发带
  const cyRef = s.headY + 0.2 * headScale;
  const ponyPts = [
    [0.04, cyRef + 0.04, -0.15],
    [0.14, cyRef - 0.16, -0.26],
    [0.24, cyRef - 0.38, -0.34],
    [0.32, cyRef - 0.62, -0.38],
  ];
  const fChain = t.addChain('pony', e.head, ponyPts.slice(0, 3));
  t.chain({
    joints: fChain,
    tip: [0.06, -0.18, -0.04],
    stiffness: 5.0,
    drag: 0.9,
    gravity: 6.5,
    maxAngle: 64,
    wind: 2.8,
    colliders: [{ joint: e.chest, x: 0, y: 0.05, z: -0.04, r: 0.22 }],
  });

  // 背后绯红织金大披摆（绑 scarf 物理链）
  const scarfPts = [
    [0, 1.44, -0.14],
    [0, 1.16, -0.28],
    [0, 0.84, -0.38],
    [0, 0.5, -0.45],
    [0, 0.2, -0.5],
  ];
  const hChain = t.addChain('scarf', e.chest, scarfPts.slice(0, 4));
  t.chain({
    joints: hChain,
    tip: [0, -0.22, -0.04],
    stiffness: 3.1,
    drag: 0.92,
    gravity: 6.8,
    maxAngle: 74,
    wind: 3.0,
    colliders: [
      { joint: e.chest, x: 0, y: 0, z: 0.02, r: 0.24 },
      { joint: e.hips, x: 0, y: 0, z: 0, r: 0.25 },
    ],
  });

  // 右侧长飘绯红绸带（绑 sash 物理链）
  const sashPts = [
    [0.16, 1.04, 0.1],
    [0.28, 0.78, 0.14],
    [0.4, 0.5, 0.12],
    [0.52, 0.24, 0.08],
  ];
  const mChain = t.addChain('sash', e.hips, sashPts.slice(0, 3));
  t.chain({ joints: mChain, tip: [0.06, -0.18, -0.02], stiffness: 4.5, drag: 0.9, gravity: 8, maxAngle: 68, wind: 2.4 });

  // 前腰垂落绯红流苏丝带（绑 tab 物理链）
  const tabPts = [
    [0, 1.04, 0.16],
    [0.04, 0.8, 0.21],
    [0.06, 0.56, 0.23],
    [0.08, 0.32, 0.24],
  ];
  const pChain = t.addChain('tab', e.hips, tabPts.slice(0, 3));
  t.chain({ joints: pChain, tip: [0.02, -0.16, 0], stiffness: 6.5, drag: 0.88, gravity: 9, maxAngle: 56, wind: 1.6 });

  // 左侧绯红金花飞摆（绑 tail 物理链）
  const tailPts = [
    [-0.16, 1.04, 0.06],
    [-0.3, 0.76, 0.04],
    [-0.42, 0.48, -0.02],
    [-0.52, 0.22, -0.06],
  ];
  const gChain = t.addChain('tail', e.hips, tailPts.slice(0, 3));
  t.chain({ joints: gChain, tip: [-0.06, -0.16, -0.02], stiffness: 4.6, drag: 0.9, gravity: 8, maxAngle: 68, wind: 2.5 });

  // 剑柄尾端绯红剑穗
  const tasselPts = [
    [-s.shoulderX, s.handY - 0.03, -0.34],
    [-s.shoulderX, s.handY - 0.16, -0.34],
    [-s.shoulderX, s.handY - 0.29, -0.34],
  ];
  const tasselChain = t.addChain('tassel', e.propR, tasselPts.slice(0, 2));
  t.chain({ joints: tasselChain, tip: [0, -0.12, 0], stiffness: 2.8, drag: 0.9, gravity: 13, maxAngle: 145, wind: 1.5 });

  const crimson = pal.red ?? 0x9e2420;
  const crimsonDark = pal.redDark ?? 0x5c1212;
  const blossomPink = pal.redLight ?? 0xf7bec4;
  const ivory = pal.ironLight ?? 0xf0e9dc;
  const ivoryShade = 0xcfc4b0;
  const noir = pal.robeDark ?? 0x1a181e;
  const noirGold = 0x544530;
  const gold = pal.brass ?? 0xd8a848;
  const goldHi = 0xfff0b4;

  // ── 1. 内腿隐于垂地舞裙之下 + 立绘朱红织金绣花鞋 ──
  i.sym((side) => {
    const hx = s.hipX;
    i.bone(side > 0 ? e.thighL : e.thighR).paint(ivoryShade, { c2: ivory, mat: K.cloth, line: 0.3 });
    i.limb([hx, s.hipY + 0.04, 0], [hx, s.kneeY, 0], 0.078, 0.062, { seg: 8 });
    i.bone(side > 0 ? e.shinL : e.shinR).paint(pal.skin, { ao: 0.88, mat: K.skin, line: 0.32 });
    i.limb([hx, s.kneeY, 0], [hx, s.ankleY, 0], 0.056, 0.044, { seg: 8 });
  });
  for (const side of [1, -1]) {
    i.paint(crimson, { c2: gold, gloss: 0.4, mat: K.cloth, pattern: En.weave, patternScale: 12, patternAmt: 0.35, line: 0.42 });
    Ox(i, n, side, { top: 0.14, rTop: 0.054, rAnkle: 0.044, len: 0.21, toe: 0.032, seg: 10 });
  }

  // ── 2. 核心立绘特征：【绯红织金 × 象牙米白 × 玄黑暗金三色多层交错垂地大舞裙】 ──
  const skirtBind = (sideX: number, y: number) => {
    const th = sideX >= 0 ? e.thighL : e.thighR;
    const sh = sideX >= 0 ? e.shinL : e.shinR;
    if (y >= 0.96) return [e.hips, e.hips, 1];
    if (y >= 0.5) return [e.hips, th, clamp01(1 - (0.96 - y) / 0.46)];
    return [th, sh, clamp01(1 - clamp01((0.5 - y) / 0.38) * 0.52)];
  };

  // 2a. 里层：修长垂地象牙米白百褶长裙（立绘裙前大面积优雅褶皱白裙！）
  i.bind(skirtBind).paint(ivory, {
    c2: ivoryShade,
    ao: 0.92,
    mat: K.cloth,
    pattern: En.weave,
    patternScale: 11,
    patternAmt: 0.2,
    line: 0.56,
    by: (_x: number, yVal: number, _z: number, _r: number, nx: number) => clamp01(0.18 + Math.abs(nx) * 0.3 + (0.35 - yVal) * 0.4),
  });
  i.lathe(
    [
      [0.09, 0.46, 0.44],
      [0.36, 0.35, 0.33],
      [0.7, 0.225, 0.2],
      [1.0, 0.158, 0.128],
    ],
    {
      seg: 26,
      cap0: false,
      cap1: false,
      shape: (ang: number, idx: number) =>
        1 + (idx < 3 ? (0.088 - idx * 0.022) * Math.sin(ang * 12) : 0),
    },
  );

  // 2b. 中层：玄黑暗金织锦交错放射片层（明显外浮于白裙两侧前缘，突出立绘红白黑三色交错舞裙！）
  i.bind(skirtBind).paint(noir, {
    c2: noirGold,
    mat: K.cloth,
    pattern: En.weave,
    patternScale: 14,
    patternAmt: 0.42,
    line: 0.48,
  });
  const blackPanels: [number, number][] = [
    [22, 54],
    [126, 158],
    [-46, -12],
    [-168, -134],
  ];
  for (const [a0, a1] of blackPanels) {
    i.sheet(
      6,
      9,
      (u, v) => {
        const ang = bt(a0, a1, u) * (Math.PI / 180);
        const rad = bt(0.178, 0.53, v);
        const wave = Math.sin(u * Math.PI) * 0.032 * v;
        return [Math.cos(ang) * (rad + wave), bt(1.01, 0.11, v), Math.sin(ang) * (rad * 0.96 + wave)];
      },
      true,
      180,
    );
  }

  // 2c. 外层：冷艳深绯织金海棠花放射外舞裙片（与玄黑、象牙白三色交错绽放，告别发橘！）
  i.bind(skirtBind).paint(crimson, {
    c2: crimsonDark,
    mat: K.cloth,
    pattern: En.weave,
    patternScale: 13,
    patternAmt: 0.34,
    line: 0.5,
  });
  const redPanels: [number, number][] = [
    [48, 72],
    [108, 132],
    [-16, 22],
    [158, 196],
    [-136, -44],
  ];
  for (const [a0, a1] of redPanels) {
    i.sheet(
      6,
      9,
      (u, v) => {
        const ang = bt(a0, a1, u) * (Math.PI / 180);
        const rad = bt(0.184, 0.555, v);
        const wave = Math.sin(u * Math.PI) * 0.038 * v;
        return [Math.cos(ang) * (rad + wave), bt(1.02, 0.15, v), Math.sin(ang) * (rad * 0.96 + wave)];
      },
      true,
      180,
    );
  }

  // 腰际飘带物理链（深绯海棠大长带向左右飞舞）
  i.bind(Zi(mChain, sashPts, e.hips)).paint(crimson, { c2: crimsonDark, mat: K.cloth, pattern: En.weave, patternScale: 13, patternAmt: 0.32, line: 0.42 });
  buildTatteredCape(api, i, sashPts, {
    widthFn: (v) => mixVal(0.065, 0.14, v),
    axis: [0.25, 0, 0.95],
    bow: [0.03, 0, 0.02],
    nu: 5,
    nv: 10,
    tatterAmp: 0.08,
    wave: 0.3,
    seed: 1.6,
  });
  i.bind(Zi(gChain, tailPts, e.hips)).paint(crimson, { c2: crimsonDark, mat: K.cloth, pattern: En.weave, patternScale: 13, patternAmt: 0.32, line: 0.42 });
  buildTatteredCape(api, i, tailPts, {
    widthFn: (v) => mixVal(0.065, 0.145, v),
    axis: [0.25, 0, 0.95],
    bow: [-0.03, 0, -0.02],
    nu: 5,
    nv: 10,
    tatterAmp: 0.08,
    wave: 0.32,
    seed: 3.4,
  });
  i.bind(Zi(pChain, tabPts, e.hips)).paint(crimson, { c2: crimsonDark, mat: K.cloth, line: 0.35 });
  buildTatteredCape(api, i, tabPts, {
    widthFn: (v) => mixVal(0.032, 0.048, v),
    bow: [0, 0, 0.02],
    nu: 3,
    nv: 8,
    tatterAmp: 0.06,
    seed: 2.2,
  });

  // ── 3. 象牙白织金高腰抹胸上衣 + 玄黑鎏金海棠扣宽腰封 + 绯红外袍领襟 ──
  i.bind(Bl(n)).paint(ivory, {
    c2: crimson,
    ao: 0.9,
    mat: K.cloth,
    pattern: En.weave,
    patternScale: 13,
    patternAmt: 0.25,
    line: 0.48,
    by: (_x: number, yVal: number) => clamp01((yVal - 1.24) * 2.2) * 0.25,
  });
  i.lathe(
    [
      [0.95, 0.156, 0.125],
      [1.08, 0.134, 0.106],
      [1.22, 0.172, 0.13],
      [1.36, 0.194, 0.14],
      [1.45, 0.155, 0.114],
      [1.5, 0.084, 0.074],
    ],
    { seg: 16 },
  );
  // 修长优雅颈项与微露锁骨抹胸上缘
  i.bone(e.neck).paint(pal.skin, { ao: 0.82, mat: K.skin, line: 0.32 });
  i.lathe([[1.44, 0.052, 0.052], [1.59, 0.048, 0.048]], { seg: 10, cap0: false });
  i.bone(e.chest).paint(pal.skin, { ao: 0.85, mat: K.skin, line: 0 });
  i.lathe([[1.37, 0.132, 0.105], [1.47, 0.086, 0.076]], { seg: 14, cap0: false });

  // 绯红织金外袍披肩领襟（斜披双肩露出优雅象牙抹胸）
  i.paint(crimson, { c2: gold, mat: K.cloth, pattern: En.weave, patternScale: 13, patternAmt: 0.35, line: 0.42 });
  i.sym(() => {
    i.tube(
      [
        [0.095, 1.46, 0.02, 0.038, 0.016],
        [0.12, 1.32, 0.115, 0.044, 0.018],
        [0.105, 1.12, 0.132, 0.042, 0.016],
      ],
      { seg: 6, up: [1, 0.2, 0] },
    );
  });

  // 立绘标志性【玄黑鎏金海棠花扣宽腰封】+ 绯红细腰绳
  i.bone(e.spine).paint(noir, { c2: gold, gloss: 0.65, mat: K.cloth, pattern: En.weave, patternScale: 14, patternAmt: 0.36, line: 0.4 });
  i.lathe([[1.02, 0.152, 0.122], [1.15, 0.158, 0.126]], { seg: 18 });
  i.paint(crimson, { c2: crimsonDark, mat: K.cloth, line: 0.25 });
  i.g(pt(0, 1.07, 0, 5, 0, 0), () => i.torus(0.158, 0.012, 0.012, 16, 4));
  i.paint(gold, { c2: goldHi, gloss: 1, glow: 0.18, mat: K.metal, line: 0.15 });
  i.g(pt(0, 1.085, 0.132, 0, 0, 0), () => {
    buildBlossomHairpin(api, i, gold, goldHi, 0xb82428, 1.4);
  });

  // ── 4. 华丽绯红织金海棠大广袖外袍（外绯金海棠 + 内翻象牙白宽袖） ──
  i.sym((side) => {
    buildWideSleeve(api, i, n, side, {
      outer: crimson,
      outerDark: crimsonDark,
      trim: gold,
      trimHi: crimson,
      inner: ivory,
      innerShade: ivoryShade,
      flare: 0.172,
      drop: 0.13,
      pattern: En.weave,
      trimWidth: 0.038,
    });
  });
  i.paint(pal.skin, { ao: 0.88, mat: K.skin, line: 0.32 });
  Ko(i, n, 1, 0.046);
  Ko(i, n, -1, 0.046);

  // 背后绯红织金长外袍飘摆（绑 scarf 物理链）
  i.bind(Zi(hChain, scarfPts, e.chest)).paint(crimson, {
    c2: gold,
    mat: K.cloth,
    pattern: En.weave,
    patternScale: 12,
    patternAmt: 0.36,
    line: 0.5,
  });
  buildTatteredCape(api, i, scarfPts, {
    widthFn: (v) => mixVal(0.24, 0.44, v),
    bow: [0, 0, -0.08],
    nu: 9,
    nv: 11,
    tatterAmp: 0.1,
    wave: 0.24,
    seed: 2.5,
  });

  // ── 5. 后蜀冷艳英气剑侠娇容 + 高盘云髻 + 淡粉海棠梅花金步摇 + 飘逸长黑卷发 ──
  const hairCol = pal.hair ?? pal.beard ?? 0x1c171e;
  const hairHi = pal.hairHi ?? pal.beardHi ?? 0x423648;
  const head = buildSculptedTangSongHead(api, i, n, {
    skin: pal.skin,
    skinShade: 0xe6b69b,
    hair: hairCol,
    hairHi,
    iris: 0x381e1c,
    lip: 0xc93b44,
    headScale,
    female: true,
    eyeSlant: 10,
    browAngle: 9,
    smile: -0.002,
    huadian: 0xcf363c,
    bangStyle: 'parted',
    sideLockLen: 0.22,
  });

  const yH = head.cy;
  const hs = head.s;
  i.bone(e.head);
  // 精致偏高盛唐云髻（告别旧版双小丸子！）
  i.paint(hairCol, { c2: hairHi, gloss: 0.22, mat: K.fur, pattern: En.fur, patternScale: 12, patternAmt: 0.3, line: 0.4 });
  i.ball(0, yH + 0.165 * hs, -0.03, 0.152, 0.115, 0.15, 1);
  i.ball(-0.02, yH + 0.265 * hs, -0.05, 0.11, 0.092, 0.108, 1);
  i.ball(0.078, yH + 0.21 * hs, -0.04, 0.068, 0.068, 0.066, 1);

  // 冠顶鎏金花冠 + 立绘标志性右侧【淡粉海棠/梅花花簇金步摇与金穗】
  i.paint(gold, { c2: goldHi, gloss: 1, glow: 0.18, mat: K.metal, line: 0.2 });
  i.g(pt(0, yH + 0.2 * hs, 0.012, -14, 0, 0), () => i.torus(0.145, 0.011, 0.015, 16, 4));
  i.g(pt(0, yH + 0.29 * hs, 0.045, -10, 0, 0), () =>
    i.extrude(
      [
        [0, 0.088],
        [0.036, 0.03],
        [0.082, 0.048],
        [0.04, -0.024],
        [-0.04, -0.024],
        [-0.082, 0.048],
        [-0.036, 0.03],
      ],
      0.012,
      0.003,
    ),
  );
  // 发侧精致淡粉海棠花簇（放大并略前倾，正面清晰可见娇嫩粉梅花簇！）+ 长金穗步摇
  i.g(pt(-0.132, yH + 0.195 * hs, 0.068, 0, -22, 16), () => {
    buildBlossomHairpin(api, i, blossomPink, 0xfff4f6, gold, 1.55);
  });
  i.g(pt(-0.158, yH + 0.125 * hs, 0.052, 0, -28, 12), () => {
    buildBlossomHairpin(api, i, blossomPink, 0xfff4f6, gold, 1.25);
  });
  i.g(pt(0.126, yH + 0.2 * hs, 0.055, 0, 22, -16), () => {
    buildBlossomHairpin(api, i, blossomPink, 0xfff4f6, gold, 1.2);
  });
  // 金步摇垂穗 + 双耳红珠金坠
  i.paint(gold, { c2: goldHi, gloss: 1, mat: K.metal, line: 0 });
  i.tube([[-0.155, yH + 0.14 * hs, 0.02, 0.004], [-0.195, yH + 0.01 * hs, 0.035, 0.003]], { seg: 4 });
  i.tube([[-0.195, yH + 0.01 * hs, 0.035, 0.009], [-0.205, yH - 0.07 * hs, 0.04, 0.016]], { seg: 5 });
  i.sym(() => {
    const earX = head.ring(-0.02 * hs)[0] * 1.02;
    buildDropEarring(api, i, earX, yH - 0.052 * hs, -0.005 * hs, crimson, gold, 1.05);
  });

  // 脑后飘逸长及腰际的蓬松黑卷发丝 + 两条绯红飘带（绑 pony 物理链）
  i.bind(Zi(fChain, ponyPts, e.head)).paint(hairCol, {
    c2: hairHi,
    gloss: 0.22,
    mat: K.fur,
    pattern: En.fur,
    patternScale: 12,
    patternAmt: 0.3,
    line: 0.35,
  });
  for (const [ox, sc] of [
    [0, 1.0],
    [0.068, 0.72],
    [-0.068, 0.72],
    [0.125, 0.5],
  ]) {
    i.tube(
      [
        [ponyPts[0][0] + ox * 0.4, ponyPts[0][1], ponyPts[0][2], 0.048 * sc, 0.026 * sc],
        [ponyPts[1][0] + ox * 0.85, ponyPts[1][1], ponyPts[1][2], 0.044 * sc, 0.024 * sc],
        [ponyPts[2][0] + ox * 1.25, ponyPts[2][1], ponyPts[2][2], 0.032 * sc, 0.018 * sc],
        [ponyPts[3][0] + ox * 1.6, ponyPts[3][1], ponyPts[3][2], 0.006 * sc, 0.006 * sc],
      ],
      { seg: 6, up: [1, 0, 0], crease: 180 },
    );
  }
  // 伴随长发飘扬的两条绯红发带
  i.paint(crimson, { c2: crimsonDark, mat: K.cloth, line: 0.22 });
  buildTatteredCape(
    api,
    i,
    ponyPts.map(([px, py, pz], idx) => [px + 0.05 * idx, py + 0.02 * idx, pz - 0.02 * idx]),
    {
      widthFn: (v) => mixVal(0.022, 0.038, v),
      bow: [0.01, 0, 0],
      nu: 3,
      nv: 8,
      tatterAmp: 0.08,
      wave: 0.34,
      seed: 2.7,
    },
  );

  // ── 6. 右手兵器：立绘同款【清冷百炼精钢长剑 · 镂空鎏金圆云纹剑格】(沿 +Z 严格对齐 AU() 握剑) ──
  i.bone(e.propR);
  i.g(pt(-s.shoulderX, s.handY, 0), () => {
    // 缠革细长剑柄 + 鎏金雕花剑首
    i.paint(pal.leatherDark ?? 0x261418, { c2: crimsonDark, gloss: 0.3, mat: K.leather, line: 0.35 });
    i.tube([[0, 0, -0.32, 0.014], [0, 0, 0.19, 0.016]], { seg: 8 });
    i.paint(gold, { c2: goldHi, gloss: 1, mat: K.metal, line: 0.25 });
    i.tube([[0, 0, -0.36, 0.008], [0, 0, -0.32, 0.026], [0, 0, -0.28, 0.019]], { seg: 8, crease: 28 });
    // 立绘极精致的镂空鎏金圆形云纹剑格
    i.g(pt(0, 0, 0.2, 90, 0, 0), () => {
      i.torus(0.068, 0.012, 0.016, 14, 5, { crease: 26 });
      i.torus(0.038, 0.008, 0.012, 10, 4);
      i.box(0, 0, 0, 0.026, 0.026, 0.14, 0.005);
    });
    // 修长清冷百炼精钢长剑刃（长度舒展优美，菱形剑脊）
    i.paint(pal.steel ?? 0xecf2f8, {
      c2: pal.steelDark ?? 0x768296,
      gloss: 1,
      mat: K.metal,
      pattern: En.meteor,
      patternScale: 12,
      patternAmt: 0.26,
      line: 0.42,
    });
    i.tube(
      [
        [0, 0, 0.22, 0.009, 0.036],
        [0, 0, 0.72, 0.008, 0.031],
        [0, 0, 1.06, 0.006, 0.022],
        [0, 0, 1.24, 0.002, 0.003],
      ],
      { seg: 4, up: [1, 0, 0], crease: 8 },
    );
    // 寒锋微光中脊
    i.paint(0xfff4f6, { c2: 0xffffff, glow: 0.5, gloss: 1, mat: K.metal, line: 0 });
    i.tube([[0, 0, 0.23, 0.01, 0.008], [0, 0, 1.08, 0.006, 0.006]], { seg: 4, up: [1, 0, 0], crease: 0 });
  });
  i.bind(Zi(tasselChain, tasselPts, e.propR)).paint(crimson, { c2: blossomPink, mat: K.fur, line: 0.15 });
  for (let idx = 0; idx < 4; idx++) {
    const ang = (idx / 4) * Math.PI * 2 + 0.6;
    af(
      i,
      [-s.shoulderX + Math.cos(ang) * 0.018, s.handY - 0.03, -0.34 + Math.sin(ang) * 0.018],
      [Math.cos(ang) * 0.2, -1, Math.sin(ang) * 0.2],
      0.22,
      0.022,
      { n: 3, seg: 4, tip: 0.28 },
    );
  }

  // ── 7. 伴生灵宠：大宋宫廷奶油三花小狸奴 ──
  const pet = addHeroCompanion(i, t, e.root, K, En, pt, 'cat');
  i.bakeGrounding(2.1, 0.8, 0.92);
  return { h: n, b: i, extra: { gripR: a, aim: o, gripL: r, pet } };
}
