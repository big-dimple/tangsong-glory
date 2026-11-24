/**
 * liue.ts — 刘娥 3D 英雄模型（100% 按立绘 erxiang.pc.webp 精雕重构）
 *
 * 立绘标志特征：
 * - 彻底告别旧版荧光紫桶裙与蓝罐帽！100% 还原大宋摄政太后【正朱红织金凤纹大礼服 + 玄黑织金云凤垂地宽领襟 + 象牙米白百褶曳地大长裙】；
 * - 端庄冷峻、凤目含威、微微仰首的太后仪态；乌黑高耸饱满盘发髻，贴合发髻精雕繁复鎏金珠花凤钗与两侧垂珠金步摇 + 红玉金耳坠；
 * - 宽大华贵的正朱红织金凤纹大广袖礼服大衫（重工鎏金宽凤纹滚边 + 内露象牙白宽袖）+ 领口直垂至脚面的两条玄黑底织金云纹宽礼襟（襈边）；
 * - 高腰束朱红玄黑金扣御带，垂挂标志性青碧圆玉佩 + 一红一金双长流苏；
 * - 胸前 pipa 骨骼重塑为纤巧雅致的【悬浮朱金凤印玉圭】，流转皇金微光而不遮挡华美大礼服（100% 兼容 $U 法师动作）。
 */

import { clothFoldDepth } from '../tangsongCloth';
import { addHeroCompanion } from './companions';
import {
  buildBlossomHairpin,
  buildDropEarring,
  buildSculptedTangSongHead,
  buildTatteredCape,
  buildWideSleeve,
} from './sculptKit';
import { clamp01, mixVal, TS_FEMALE_RIG, type FullHeroEngineApi } from './types';

export function buildLiuEFull(api: FullHeroEngineApi, pal: Record<string, number>) {
  const { Gh, Ls, K, En, pt, bt, Zi, Bl, Ko } = api;
  const n = Gh(TS_FEMALE_RIG);
  const { rig: t, J: e, d: s } = n;
  const i = new Ls();

  // 严格匹配 $U() 动画控制器骨骼：pipa 承接纤巧悬浮朱金凤印玉圭（略前移，在双红广袖前流转微光）
  const pipaOrigin: [number, number, number] = [-0.04, 1.15, 0.34];
  const o = pt(pipaOrigin[0], pipaOrigin[1], pipaOrigin[2], -10, 6, -14, 0.92);
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

  const uScale = 0.74;
  const topY = s.headY + 0.2 * uScale;

  // 脑后垂落的一缕端庄盘发编辫物理链（绑 hair 链）
  const hairPts = [
    [0, topY - 0.04, -0.15],
    [0, 1.44, -0.22],
    [0, 1.24, -0.25],
    [0, 1.06, -0.26],
  ];
  const hairChain = t.addChain('hair', e.head, hairPts.slice(0, 3));
  t.chain({
    joints: hairChain,
    tip: [0, -0.15, -0.01],
    stiffness: 10,
    drag: 0.8,
    gravity: 10,
    maxAngle: 38,
    wind: 2,
    colliders: [{ joint: e.chest, x: 0, y: 0.05, z: -0.04, r: 0.24 }],
  });

  // 立绘标志性腰间【一红一金双长流苏禁步】（绑 ribL / ribR 物理链）
  const makeRib = (side: number) => [
    [side * 0.055, 1.12, 0.16],
    [side * 0.068, 0.88, 0.2],
    [side * 0.075, 0.64, 0.22],
    [side * 0.08, 0.42, 0.23],
  ];
  const ribL = t.addChain('ribL', e.hips, makeRib(1).slice(0, 3));
  const ribR = t.addChain('ribR', e.hips, makeRib(-1).slice(0, 3));
  for (const rb of [ribL, ribR]) {
    t.chain({ joints: rb, tip: [0, -0.18, 0.02], stiffness: 8, drag: 0.8, gravity: 8.5, maxAngle: 42, wind: 2.4 });
  }

  // 背后正朱红重工织金凤纹拖尾礼披（绑 cloak 物理链）
  const cloakPts = [
    [0, 1.45, -0.1],
    [0, 1.12, -0.24],
    [0, 0.78, -0.36],
    [0, 0.44, -0.46],
    [0, 0.14, -0.54],
  ];
  const cloakChain = t.addChain('cloak', e.chest, cloakPts.slice(0, 4));
  t.chain({
    joints: cloakChain,
    tip: [0, -0.24, -0.05],
    stiffness: 3.5,
    drag: 0.72,
    gravity: 12,
    maxAngle: 44,
    wind: 2.5,
    colliders: [
      { joint: e.hips, x: 0, y: -0.1, z: 0.1, r: 0.32 },
      { joint: e.chest, x: 0, y: 0, z: 0.08, r: 0.26 },
    ],
  });

  const imperialRed = pal.cloak ?? 0x9e1f1c;
  const imperialRedDark = pal.cloakDark ?? 0x5c0f10;
  const imperialRedLight = pal.cloakLight ?? 0xc43228;
  const noirTrim = pal.trim ?? 0x202328;
  const gold = pal.gold ?? 0xe8b84e;
  const goldHi = 0xfff0b2;
  const ivory = pal.robe ?? 0xf3eadc;
  const ivoryShade = pal.robeShade ?? 0xd2c4ad;
  const jade = 0x76c2b4;

  // ── 1. 隐藏于曳地礼裙下的宫廷绣履 ──
  const legBind = (sideX: number, y: number) => {
    const thigh = sideX >= 0 ? e.thighL : e.thighR;
    const shin = sideX >= 0 ? e.shinL : e.shinR;
    if (y >= 0.96) return [e.hips, e.hips, 1];
    if (y >= 0.5) return [e.hips, thigh, 1 - (0.96 - y) / 0.46];
    return [thigh, shin, 1 - clamp01((0.5 - y) / 0.4) * 0.55];
  };
  i.sym((side) => {
    i.bone(side > 0 ? e.footL : e.footR).paint(imperialRedDark, { c2: gold, mat: K.cloth, line: 0.35 });
    i.tube(
      [
        [s.hipX, 0.045, -0.05, 0.048, 0.036],
        [s.hipX, 0.055, 0.07, 0.056, 0.044],
        [s.hipX, 0.072, 0.19, 0.036, 0.024],
        [s.hipX, 0.11, 0.23, 0.022, 0.016],
      ],
      { seg: 8 },
    );
  });

  // ── 2. 恢弘庄重的大宋皇后三层曳地大礼服（白百褶底裙 + 玄黑织金垂地宽襟 + 正红织金凤纹大衫！） ──
  // 2a. 里层：极大垂坠的象牙米白百褶曳地大长裙（高分段立体深褶，钟形皇室礼服大摆）
  i.bind(legBind).paint(ivory, {
    c2: ivoryShade,
    ao: 0.92,
    mat: K.cloth,
    pattern: En.weave,
    patternScale: 10,
    patternAmt: 0.18,
    line: 0.58,
    by: (_x: number, yVal: number, _z: number, _r: number, nx: number) =>
      clamp01(0.16 + Math.abs(nx) * 0.25 + (0.32 - yVal) * 0.45),
  });
  i.lathe(
    [
      [0.06, 0.52, 0.48],
      [0.32, 0.4, 0.37],
      [0.64, 0.265, 0.235],
      [0.94, 0.175, 0.145],
      [1.14, 0.162, 0.132],
    ],
    {
      seg: 56,
      cap0: false,
      cap1: false,
      shape: (ang: number, idx: number) =>
        1 + (idx < 3 ? (0.08 - idx * 0.02) * Math.sin(ang * 14) : 0),
    },
  );

  // 2b. 中层（立绘最震撼视觉标志！）：两条宽大【玄黑底织金云纹垂地宽领襟（襈边）】，明显外浮于白裙与红衫之间！
  i.bind(legBind).paint(noirTrim, {
    c2: gold,
    mat: K.cloth,
    pattern: En.weave,
    patternScale: 15,
    patternAmt: 0.45,
    line: 0.5,
  });
  i.sym(() => {
    i.sheet(
      12,
      11,
      (u, v) => {
        // u=0 为靠近中轴的白裙边，u=1 为外侧衔接正红大衫边；明显外浮 +0.035 确保红/黑/白三层界限无比清晰！
        const ang = bt(78 - v * 22, 34 - v * 16, u) * (Math.PI / 180);
        const fold = 0.026 * Math.sin(u * Math.PI) * clothFoldDepth(u, v, 1, 0.8);
        const rad = bt(0.185, 0.568, v) + 0.024 + Math.sin(u * Math.PI) * 0.02 + fold;
        const hem = 0.012 * v * v * Math.cos(u * Math.PI * 2);
        return [Math.cos(ang) * rad, bt(1.16, 0.09, v) + hem, Math.sin(ang) * rad * 0.96];
      },
      true,
      180,
    );
  });

  // 2c. 外层：极为华贵舒展的【正朱红织金凤纹大礼服大衫】左右大摆（位于黑金领襟外侧，不遮挡黑金襟！）
  i.bind(legBind).paint(imperialRed, {
    c2: imperialRedDark,
    mat: K.cloth,
    pattern: En.vein,
    patternScale: 9,
    patternAmt: 0.36,
    line: 0.58,
  });
  i.sym(() => {
    i.sheet(
      16,
      10,
      (u, v) => {
        // u=0 紧贴黑金宽领襟外缘 (ang ≈ 36°~20°)，向两侧及后方恢弘展开
        const ang = bt(36 - v * 14, -98, u) * (Math.PI / 180);
        const rad = bt(0.19, 0.59, v) + Math.sin(u * Math.PI) * 0.048 * v;
        const wave = Math.sin(u * Math.PI * 3 + v * 3.5) * 0.022 * v
          + 0.03 * Math.sin(u * Math.PI) * clothFoldDepth(u, v, 2, 1.2);
        const hem = 0.015 * v * v * Math.sin(u * Math.PI * 3);
        return [Math.cos(ang) * (rad + wave), bt(1.16, 0.12, v) + hem, Math.sin(ang) * (rad * 0.94 + wave)];
      },
      true,
      180,
    );
  });
  // 大衫前外缘重工鎏金凤纹锦带
  i.paint(gold, {
    c2: imperialRedLight,
    gloss: 0.85,
    mat: K.cloth,
    pattern: En.weave,
    patternScale: 16,
    patternAmt: 0.45,
    line: 0.25,
  });
  i.sym(() => {
    i.sheet(
      3,
      9,
      (u, v) => {
        const ang = bt(38 - v * 14, 28 - v * 14, u) * (Math.PI / 180);
        const rad = bt(0.194, 0.596, v);
        return [Math.cos(ang) * rad, bt(1.16, 0.12, v), Math.sin(ang) * rad * 0.95];
      },
      true,
      180,
    );
  });

  // ── 3. 上身象牙白内衬 + 玄黑织金深 V 礼服领襟 + 朱红金扣高腰带 + 青玉佩双流苏 ──
  i.bind(Bl(n)).paint(ivory, { c2: ivoryShade, ao: 0.92, mat: K.cloth, line: 0.45 });
  i.lathe(
    [
      [0.95, 0.168, 0.136],
      [1.1, 0.145, 0.116],
      [1.24, 0.182, 0.138],
      [1.38, 0.198, 0.14],
      [1.48, 0.112, 0.092],
    ],
    { seg: 16 },
  );
  i.bone(e.neck).paint(pal.skin, { ao: 0.82, mat: K.skin, line: 0.32 });
  i.lathe([[1.46, 0.052, 0.052], [1.6, 0.048, 0.048]], { seg: 10, cap0: false });

  // 玄黑织金云纹大交领 + 正朱红织金凤纹肩领外翻
  i.bone(e.chest).paint(noirTrim, {
    c2: gold,
    mat: K.cloth,
    pattern: En.weave,
    patternScale: 15,
    patternAmt: 0.48,
    line: 0.38,
  });
  i.sym(() => {
    i.tube(
      [
        [0.088, 1.5, 0.032, 0.036, 0.016],
        [0.102, 1.36, 0.128, 0.044, 0.018],
        [0.09, 1.15, 0.142, 0.046, 0.018],
      ],
      { seg: 6, up: [1, 0.2, 0] },
    );
  });
  // 正朱红织金外礼服肩襟滚金边
  i.paint(imperialRed, { c2: gold, mat: K.cloth, pattern: En.vein, patternScale: 12, patternAmt: 0.4, line: 0.45 });
  i.g(pt(0, 1.43, -0.01, 12, 0, 0), () => i.torus(0.182, 0.034, 0.03, 16, 5));

  // 高腰朱红玄黑金扣御带 + 立绘标志性【青碧圆玉佩 + 一红一金双长流苏】
  i.bone(e.spine).paint(imperialRed, { c2: noirTrim, mat: K.cloth, line: 0.38 });
  i.lathe([[1.12, 0.166, 0.136], [1.21, 0.172, 0.14]], { seg: 18 });
  i.paint(gold, { c2: goldHi, gloss: 1, glow: 0.16, mat: K.metal, line: 0.2 });
  i.ball(0, 1.165, 0.144, 0.024, 0.024, 0.016, 1);
  i.ball(0.056, 1.165, 0.136, 0.016, 0.016, 0.012, 0);
  i.ball(-0.056, 1.165, 0.136, 0.016, 0.016, 0.012, 0);
  // 左侧垂悬青碧圆玉佩
  i.paint(jade, { c2: 0xd8fff6, gloss: 0.95, glow: 0.26, mat: K.crystal, line: 0 });
  i.g(pt(0.055, 1.04, 0.175, 12, 0, 0), () => i.torus(0.022, 0.009, 0.009, 12, 4));

  // 一红一金两条精致长流苏垂带（绑 ribL=金穗, ribR=红穗）
  for (const [rb, side, col, col2] of [
    [ribL, 1, gold, goldHi],
    [ribR, -1, imperialRedLight, imperialRedDark],
  ] as [number[], number, number, number][]) {
    const pts = makeRib(side);
    i.bind(Zi(rb, pts, e.hips)).paint(col, { c2: col2, mat: K.fur, line: 0.22 });
    buildTatteredCape(api, i, pts, {
      widthFn: (v) => mixVal(0.02, 0.042, v),
      bow: [0, 0, 0.015],
      nu: 3,
      nv: 8,
      tatterAmp: 0.04,
      wave: 0.18,
      seed: side > 0 ? 1.1 : 2.9,
    });
  }

  // ── 4. 宽大华贵的正朱红织金凤纹大广袖礼服袖（滚宽金凤边 + 露米白广袖） ──
  i.sym((side) => {
    buildWideSleeve(api, i, n, side, {
      outer: imperialRed,
      outerDark: imperialRedDark,
      trim: gold,
      trimHi: imperialRedLight,
      inner: ivory,
      innerShade: ivoryShade,
      flare: 0.19,
      drop: 0.15,
      pattern: En.vein,
      trimWidth: 0.06,
    });
  });
  i.paint(pal.skin, { ao: 0.88, mat: K.skin, line: 0.32 });
  Ko(i, n, 1, 0.044, true);
  Ko(i, n, -1, 0.044, true);

  // 背后正朱红重工织金拖尾礼披（绑 cloak 物理链）
  i.bind(Zi(cloakChain, cloakPts, e.chest)).paint(imperialRed, {
    c2: imperialRedDark,
    mat: K.cloth,
    pattern: En.vein,
    patternScale: 9,
    patternAmt: 0.35,
    line: 0.55,
  });
  buildTatteredCape(api, i, cloakPts, {
    widthFn: (v) => mixVal(0.28, 0.52, v),
    bow: [0, 0, -0.1],
    nu: 10,
    nv: 11,
    tatterAmp: 0.03,
    wave: 0.16,
    seed: 1.8,
  });

  // ── 5. 雍容冷峻太后仪容 + 高耸饱满盘发髻 + 贴合式繁复鎏金珠花凤钗（告别呆板蓝帽大罐！） ──
  const head = buildSculptedTangSongHead(api, i, n, {
    skin: pal.skin,
    skinShade: 0xe6b69b,
    hair: pal.hair,
    hairHi: pal.hairHi,
    iris: 0x361d1a,
    lip: 0xb83834,
    headScale: uScale,
    female: true,
    jawWidth: 1.04,
    eyeSlant: 9,
    eyeWidth: 1.12,
    eyeHeight: 0.78,
    irisScale: 0.92,
    lidArch: 0.72,
    eyeTail: 0.34,
    browAngle: 6,
    browThickness: 1.1,
    browLift: -0.002,
    browArch: 0.003,
    smile: -0.004,
    bangStyle: 'noble',
    sideLockLen: 0.14,
  });

  const C = head.cy;
  const hs = head.s;
  i.bone(e.head);
  // 雍容高耸饱满盘发髻（端庄贵气）
  i.paint(pal.hair, { c2: pal.hairHi, gloss: 0.22, mat: K.fur, pattern: En.fur, patternScale: 12, patternAmt: 0.3, line: 0.42 });
  i.ball(0, C + 0.165 * hs, -0.025, 0.162, 0.125, 0.16, 1);
  i.ball(0, C + 0.28 * hs, -0.045, 0.125, 0.105, 0.122, 1);
  i.sym(() => {
    i.ball(0.118, C + 0.2 * hs, -0.03, 0.072, 0.076, 0.07, 1);
  });

  // 贴合发髻轮廓的精致鎏金珠花凤钗（细金丝花冠 + 错落金花 + 红宝珠点缀，告别粗金横杠！）
  i.paint(gold, { c2: goldHi, gloss: 1, glow: 0.16, mat: K.metal, line: 0 });
  i.g(pt(0, C + 0.195 * hs, 0.015, -14, 0, 0), () => i.torus(0.152, 0.007, 0.009, 16, 4));
  // 中心精致鎏金展翅小凤饰 + 红宝珠
  i.g(pt(0, C + 0.285 * hs, 0.068, -10, 0, 0), () =>
    i.extrude(
      [
        [0, 0.082],
        [0.028, 0.028],
        [0.088, 0.056],
        [0.048, -0.012],
        [-0.048, -0.012],
        [-0.088, 0.056],
        [-0.028, 0.028],
      ],
      0.01,
      0.003,
    ),
  );
  i.paint(imperialRedLight, { c2: 0xffb8a8, glow: 0.38, gloss: 0.95, mat: K.crystal, line: 0 });
  i.ball(0, C + 0.275 * hs, 0.086, 0.019, 0.024, 0.013, 1);

  i.sym(() => {
    // 发髻两侧错落鎏金花钗
    i.g(pt(0.115, C + 0.24 * hs, 0.035, 0, 22, -16), () => {
      buildBlossomHairpin(api, i, gold, goldHi, imperialRedLight, 0.92);
    });
    i.g(pt(0.145, C + 0.185 * hs, 0.005, 0, 42, -22), () => {
      buildBlossomHairpin(api, i, gold, goldHi, jade, 0.78);
    });
    // 皇太后精致金丝步摇流苏（向后掠展金凤羽簪 + 垂珠）
    i.paint(gold, { c2: goldHi, gloss: 1, mat: K.metal, line: 0 });
    i.tube([[0.125, C + 0.26 * hs, -0.02, 0.006], [0.215, C + 0.24 * hs, -0.035, 0.004]], { seg: 4 });
    i.tube([[0.21, C + 0.23 * hs, -0.03, 0.0035], [0.22, C + 0.06 * hs, -0.01, 0.003]], { seg: 4 });
    i.ball(0.218, C + 0.13 * hs, -0.018, 0.01, 0.012, 0.01, 0);
    i.ball(0.22, C + 0.05 * hs, -0.01, 0.012, 0.016, 0.012, 0);
    // 红玉鎏金宫廷长耳坠
    const earX = head.ring(-0.02 * hs)[0] * 1.02;
    buildDropEarring(api, i, earX, C - 0.052 * hs, -0.005 * hs, imperialRedLight, gold, 1.05);
  });

  // 脑后端庄长发辫
  i.bind(Zi(hairChain, hairPts, e.head)).paint(pal.hair, { c2: pal.hairHi, mat: K.fur, line: 0.35 });
  i.tube(
    [
      [0, topY - 0.04, -0.15, 0.062, 0.034],
      [0, 1.44, -0.22, 0.056, 0.034],
      [0, 1.24, -0.25, 0.044, 0.028],
      [0, 1.06, -0.26, 0.016, 0.014],
    ],
    { seg: 8, up: [1, 0, 0], crease: 180 },
  );

  // ── 6. 纤巧雅致的【悬浮朱金凤印玉圭】（置于 pipaBone，微光精致不遮大礼服与玄黑领襟！） ──
  i.bone(c);
  i.g(o, () => {
    // 纤细玄墨玉圭主体 + 鎏金雕凤尖首与边框
    i.paint(noirTrim, { c2: 0x3b3842, gloss: 0.85, mat: K.crystal, line: 0.3 });
    i.extrude(
      [
        [0, 0.2],
        [0.052, 0.13],
        [0.046, -0.17],
        [-0.046, -0.17],
        [-0.052, 0.13],
      ],
      0.014,
      0.004,
    );
    i.paint(gold, { c2: goldHi, gloss: 1, glow: 0.28, mat: K.metal, line: 0.15 });
    i.box(0, -0.165, 0, 0.108, 0.02, 0.022, 0.004);
    i.g(pt(0, 0.03, 0.012, 0, 0, 0), () => i.torus(0.048, 0.007, 0.008, 14, 4));
    // 玉圭中心悬浮微光朱砂凤印星芒
    i.paint(imperialRedLight, { c2: 0xffe49c, glow: 0.65, mat: K.crystal, line: 0 });
    i.box(0, 0.03, 0.016, 0.044, 0.044, 0.01, 0.003);
    i.paint(0xfff0b8, { c2: 0xffffff, glow: 0.85, mat: K.crystal, line: 0 });
    i.ball(0, 0.03, 0.026, 0.016, 0.016, 0.008, 0);
    // 底部轻巧红金流苏穗
    i.paint(imperialRedLight, { c2: gold, mat: K.fur, line: 0 });
    i.tube([[0, -0.18, 0, 0.009], [0, -0.27, 0, 0.018]], { seg: 5 });
  });

  // ── 7. 伴生灵宠：皇室朱金点翠金凤雏 ──
  const pet = addHeroCompanion(i, t, e.root, K, En, pt, 'phoenix');
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
      handR: (() => {
        const p = localToChest(-0.11, -0.02, 0.06);
        return [p[0], p[1], p[2]];
      })(),
      handL: (() => {
        const p = localToChest(0.11, 0.06, 0.04);
        return [p[0], p[1], p[2]];
      })(),
      face: localToChest(0, 0.02, 0.08),
      pet,
    },
  };
}
