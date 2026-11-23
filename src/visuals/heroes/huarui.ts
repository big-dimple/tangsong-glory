/** 花蕊夫人：高髻簪花、绯衣广袖与曳地剑舞长裙。 */

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
    stiffness: 8,
    drag: 0.78,
    gravity: 6.5,
    maxAngle: 48,
    wind: 3,
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
    stiffness: 3.5,
    drag: 0.72,
    gravity: 12,
    maxAngle: 46,
    wind: 3,
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
  t.chain({ joints: mChain, tip: [0.06, -0.18, -0.02], stiffness: 8, drag: 0.8, gravity: 8, maxAngle: 46, wind: 3 });

  // 左侧绯红金花飞摆（绑 tail 物理链）
  const tailPts = [
    [-0.16, 1.04, 0.06],
    [-0.3, 0.76, 0.04],
    [-0.42, 0.48, -0.02],
    [-0.52, 0.22, -0.06],
  ];
  const gChain = t.addChain('tail', e.hips, tailPts.slice(0, 3));
  t.chain({ joints: gChain, tip: [-0.06, -0.16, -0.02], stiffness: 8, drag: 0.8, gravity: 8, maxAngle: 46, wind: 3 });

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

  // 鞋与短袜随足踝运动，膝部由外层舞裙覆盖。
  for (const side of [1, -1]) {
    i.paint(crimson, { c2: crimsonDark, gloss: 0.23, mat: K.cloth, pattern: En.weave, patternScale: 12, patternAmt: 0.35, line: 0.42 });
    Ox(i, n, side, { top: 0.24, rTop: 0.050, rAnkle: 0.044, len: 0.21, toe: 0.032, seg: 10 });
  }

  // 共用一张裙面。前襟基本随腰，只有侧褶少量随大腿，让膝盖能在布下活动。
  i.bind((x: number, y: number) => {
    const leg = x < 0 ? e.thighR : e.thighL;
    const weight = 0.38 * clamp01(Math.abs(x) / 0.32) * clamp01((0.98 - y) / 0.62);
    return [e.hips, leg, 1 - weight];
  });

  // 从前中线向两侧铺开白绢、墨缘和绯色外袍。各幅共用边缘，腰细、前短、后曳。
  const panels = [
    [-180, -155, noir, noirGold], [-155, -58, crimson, crimsonDark],
    [-58, -52, noir, noirGold], [-52, -49, gold, noirGold],
    [-49, 34, ivory, ivoryShade], [34, 53, crimson, crimsonDark],
    [53, 70, ivory, ivoryShade], [70, 82, noir, noirGold],
    [82, 159, crimson, crimsonDark], [159, 180, noir, noirGold],
  ];
  function skirtPoint(degrees: number, v: number, relief = 0) {
    const a = degrees * Math.PI / 180;
    const angle = a + 0.16 * v + 0.05 * Math.sin(a) * v;
    const front = (1 + Math.cos(angle)) / 2;
    const pleat = Math.cos(12 * a + 0.7 * v) + 0.28 * Math.cos(7 * a - v);
    const flare = v * (0.48 + 0.52 * v);
    const fold = pleat * (0.003 + 0.032 * flare) + relief;
    return [
      Math.sin(angle) * (0.146 + 0.275 * flare + fold),
      bt(1.09, 0.135 + 0.08 * front + 0.018 * pleat, v),
      Math.cos(angle) * (0.114 + 0.21 * flare + fold) - 0.09 * flare,
    ];
  }
  for (const [start, end, color, shade] of panels) {
    i.paint(color, { c2: shade, mat: K.cloth, pattern: En.weave, patternAmt: 0.23, patternScale: 13, line: 0.23 });
    i.sheet(Math.ceil((end - start) / 4), 9, (u, v) => skirtPoint(bt(end, start, u), v), false, 180);
  }
  // 金线海棠贴着红绢起伏，使用与裙面相同的蒙皮。
  i.paint(noirGold, { c2: gold, mat: K.cloth, gloss: 0.22, line: 0 });
  for (const [azimuth, drop] of [[-71, .56], [-88, .77], [43, .66], [96, .73]]) {
    i.sheet(25, 1, (u, v) => {
      const angle = u * Math.PI * 2;
      const radius = (0.78 + 0.22 * Math.cos(5 * angle)) * (0.66 + 0.34 * v);
      return skirtPoint(azimuth + 5.4 * radius * Math.cos(angle), drop + 0.034 * radius * Math.sin(angle), 0.006);
    }, true, 180);
  }

  // 腰际飘带物理链（深绯海棠大长带向左右飞舞）
  i.bind(Zi(mChain, sashPts, e.hips)).paint(crimson, { c2: crimsonDark, mat: K.cloth, pattern: En.weave, patternScale: 13, patternAmt: 0.32, line: 0.42 });
  buildTatteredCape(api, i, sashPts, {
    widthFn: (v) => mixVal(0.036, 0.063, v),
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
    widthFn: (v) => mixVal(0.038, 0.07, v),
    axis: [0.25, 0, 0.95],
    bow: [-0.03, 0, -0.02],
    nu: 5,
    nv: 10,
    tatterAmp: 0.08,
    wave: 0.32,
    seed: 3.4,
  });
  // ── 3. 象牙白织金高腰抹胸上衣 + 玄黑鎏金海棠扣宽腰封 + 绯红外袍领襟 ──
  i.bind(Bl(n)).paint(ivory, {
    c2: ivoryShade,
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
  i.paint(crimson, { c2: crimsonDark, mat: K.cloth, pattern: En.weave, patternScale: 13, patternAmt: 0.35, line: 0.32 });
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
  i.bone(e.spine).paint(noir, { c2: noirGold, gloss: 0.3, mat: K.cloth, pattern: En.weave, patternScale: 14, patternAmt: 0.36, line: 0.4 });
  i.lathe([[1.025, 0.158, 0.135], [1.10, 0.155, 0.137], [1.16, 0.169, 0.14]], { seg: 20 });
  i.paint(noirGold, { c2: gold, gloss: 0.4, mat: K.cloth, line: 0.12 });
  i.lathe([[1.149, 0.17, 0.141], [1.16, 0.17, 0.141]], { seg: 20, cap0: false, cap1: false });
  i.paint(crimson, { c2: crimsonDark, mat: K.cloth, line: 0.25 });
  i.g(pt(0, 1.07, 0, 5, 0, 0), () => i.torus(0.158, 0.012, 0.012, 16, 4));
  i.paint(gold, { c2: goldHi, gloss: 1, glow: 0.18, mat: K.metal, line: 0.15 });
  i.g(pt(0, 1.085, 0.146, 0, 0, 0), () => {
    buildBlossomHairpin(api, i, gold, goldHi, 0xb82428, 1.4);
  });

  // ── 4. 华丽绯红织金海棠大广袖外袍（外绯金海棠 + 内翻象牙白宽袖） ──
  i.sym((side) => {
    buildWideSleeve(api, i, n, side, {
      outer: crimson,
      outerDark: crimsonDark,
      trim: gold,
      trimHi: ivoryShade,
      inner: ivory,
      innerShade: ivoryShade,
      flare: 0.151,
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
    widthFn: (v) => mixVal(0.18, 0.25, v),
    bow: [0, 0, -0.08],
    nu: 9,
    nv: 11,
    tatterAmp: 0.035,
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
