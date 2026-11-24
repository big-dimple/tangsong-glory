/**
 * qinqiong.ts — 秦琼 3D 英雄模型（100% 按立绘 touye.pc.webp 精雕重构）
 *
 * 立绘标志特征：
 * - 无头盔！高耸奔放乌黑高马尾 + 鎏金束发冠 + 硬朗剑眉浓须猛将颜；
 * - 暗玄铁密排札甲胸铠（En.scale）+ 正胸/腰扣/双肩/双膝立体鎏金吞口狮头兽面；
 * - 破损裂尾浓烈血红大披风 + 缠腰宽红战带与双侧破损长红飘带；
 * - 分片玄铁金边战裙 + 宽大水墨白灰×墨黑灯笼战裤 + 红绳绑小腿 + 玄铁鎏金战靴；
 * - 双手持巨型带刺玄铁鎏金流星骨朵大锤（右手 propR，左手挂于 shield 骨骼完全兼容 FU 动作）。
 */

import { addHeroCompanion } from './companions';
import {
  buildLionMedallion,
  buildSculptedTangSongHead,
  buildSpikedIronMace,
  buildTatteredCape,
} from './sculptKit';
import { clamp01, mixVal, TS_GENERAL_RIG, type FullHeroEngineApi } from './types';

export function buildQinQiongFull(api: FullHeroEngineApi, pal: Record<string, number>) {
  const { Gh, Ls, K, En, pt, Zi, Bl, Ox, Ko, bc } = api;
  const n = Gh(TS_GENERAL_RIG);
  const { rig: t, J: e, d: s } = n;
  const i = new Ls();
  i.crease = 36;

  // 严格兼容 FU() 的骨骼：shield (挂于 foreL 手掌位，承接立绘左手流星大锤) + mane (高马尾) + tail (血红破损披风) + tab (血红腰带前摆)
  const shieldBone = t.add('shield', e.foreL, s.shoulderX, s.handY, 0);

  const tabPts = [
    [0.04, 0.94, 0.21],
    [0.14, 0.72, 0.26],
    [0.24, 0.48, 0.28],
    [0.34, 0.25, 0.26],
  ];
  const tabChain = t.addChain('tab', e.hips, tabPts.slice(0, 3));
  t.chain({ joints: tabChain, tip: [0.06, -0.2, 0], stiffness: 9, drag: 0.8, gravity: 9, maxAngle: 46, wind: 2.8 });

  const tabPtsL = [
    [-0.14, 0.92, 0.14],
    [-0.26, 0.68, 0.12],
    [-0.36, 0.44, 0.08],
    [-0.44, 0.22, 0.04],
  ];
  const tabChainL = t.addChain('tabL', e.hips, tabPtsL.slice(0, 3));
  t.chain({ joints: tabChainL, tip: [-0.08, -0.18, -0.02], stiffness: 8, drag: 0.8, gravity: 8.5, maxAngle: 48, wind: 3 });

  const cloakPts = [
    [0, 1.5, -0.16],
    [0, 1.2, -0.32],
    [0, 0.88, -0.44],
    [0, 0.56, -0.52],
    [0, 0.26, -0.56],
  ];
  const cloakChain = t.addChain('tail', e.chest, cloakPts.slice(0, 4));
  t.chain({
    joints: cloakChain,
    tip: [0, -0.24, -0.04],
    stiffness: 4.5,
    drag: 0.7,
    gravity: 14,
    maxAngle: 44,
    wind: 3,
    colliders: [{ joint: e.chest, x: 0, y: 0, z: 0, r: 0.34 }],
  });

  const headScale = 0.79;
  const cyRef = s.headY + 0.2 * headScale;
  // 奔放飘扬的乌黑高马尾物理链（挂于原 mane 链）
  const manePts = [
    [0, cyRef + 0.29 * headScale, -0.06],
    [0.08, cyRef + 0.38 * headScale, -0.22],
    [0.14, cyRef + 0.3 * headScale, -0.42],
    [0.12, cyRef + 0.1 * headScale, -0.56],
  ];
  const maneChain = t.addChain('mane', e.head, manePts.slice(0, 3));
  t.chain({ joints: maneChain, tip: [0.04, -0.14, -0.16], stiffness: 8.5, drag: 0.88, gravity: 6, maxAngle: 52, wind: 2.8 });

  const ironDark = pal.ironDark ?? 0x22262e;
  const ironLight = pal.ironLight ?? 0x4b5362;
  const gold = pal.bronze ?? 0xdead48;
  const goldHi = pal.amber ?? 0xffe08a;
  const goldDark = pal.bronzeDark ?? 0x8a5f1c;
  const red = pal.red ?? 0xb3201b;
  const redDark = pal.redDark ?? 0x6b1210;
  const pantWhite = pal.clothLight ?? 0xdcd7cd;
  const pantDark = pal.clothDark ?? 0x262930;

  // ── 1. 宽大水墨白灰×墨黑灯笼战裤 + 狮头护膝玄铁金边战靴 + 红绳绑小腿 ──
  i.sym((side) => {
    const hx = s.hipX;
    // 大腿：极富层次的水墨宽大灯笼裤（白灰与墨黑深褶交错）
    i.bone(side > 0 ? e.thighL : e.thighR).paint(pantWhite, {
      c2: pantDark,
      mat: K.cloth,
      pattern: En.fur,
      patternScale: 7,
      patternAmt: 0.26,
      line: 0.55,
      by: (_x: number, _y: number, zVal: number, _r: number, nx: number) => clamp01(0.28 + (zVal < 0 ? 0.55 : 0) + Math.abs(nx) * 0.25),
    });
    i.lathe(
      [
        [s.kneeY - 0.02, 0.148, 0.156, hx + 0.015, 0],
        [mixVal(s.kneeY, s.hipY, 0.32), 0.208, 0.212, hx + 0.024, 0.01],
        [mixVal(s.kneeY, s.hipY, 0.68), 0.195, 0.192, hx + 0.016, 0],
        [s.hipY + 0.06, 0.155, 0.15, hx, 0],
      ],
      {
        seg: 16,
        cap0: false,
        cap1: false,
        shape: (ang: number, idx: number) => 1 + (idx < 3 ? 0.1 * Math.sin(ang * 6) : 0.03 * Math.sin(ang * 6)),
      },
    );

    // 膝下玄铁金边护胫战靴
    i.bone(side > 0 ? e.shinL : e.shinR).paint(ironDark, {
      c2: ironLight,
      gloss: 0.78,
      mat: K.metal,
      pattern: En.scale,
      patternScale: 10,
      patternAmt: 0.25,
      line: 0.6,
    });
    i.lathe(
      [
        [s.ankleY - 0.02, 0.095, 0.105, hx, 0],
        [0.29, 0.114, 0.122, hx, 0],
        [s.kneeY + 0.05, 0.118, 0.124, hx, 0],
      ],
      { seg: 12 },
    );
    // 护胫鎏金滚边与小腿红绳缠带（立绘脚踝标志红绳）
    i.paint(gold, { c2: goldHi, gloss: 1, mat: K.metal, line: 0.2 });
    i.g(pt(hx, s.kneeY + 0.04, 0, 8, 0, 0), () => i.torus(0.118, 0.014, 0.016, 12, 4));
    i.paint(red, { c2: redDark, mat: K.cloth, line: 0.25 });
    i.g(pt(hx, 0.23, 0, 6, 0, 0), () => i.torus(0.112, 0.018, 0.016, 12, 4));
    i.g(pt(hx, 0.185, 0, -6, 0, 0), () => i.torus(0.104, 0.016, 0.014, 12, 4));

    // 双膝立体鎏金狮头护膝
    i.g(pt(hx, s.kneeY + 0.015, 0.122, -6, 0, 0), () => {
      buildLionMedallion(api, i, gold, goldHi, goldDark, 0.72);
    });
  });

  // 玄铁金边翘头战靴
  for (const side of [1, -1]) {
    i.paint(ironDark, { c2: pal.leather ?? 0x3b281c, gloss: 0.55, mat: K.leather, line: 0.55 });
    Ox(i, n, side, { top: 0.26, rTop: 0.102, rAnkle: 0.084, len: 0.3, toe: 0.032, seg: 10 });
    i.bone(side > 0 ? e.footL : e.footR).paint(gold, { c2: goldHi, gloss: 1, mat: K.metal, line: 0 });
    i.g(pt(side * s.hipX, 0.068, 0.22, -16, 0, 0), () => i.torus(0.052, 0.01, 0.01, 10, 4));
  }

  // ── 2. 分片玄铁金边札甲战裙 + 墨黑底衬 + 缠腰血红宽带与破损飘带 ──
  const skirtBind = (sideX: number, y: number) => {
    const th = sideX >= 0 ? e.thighL : e.thighR;
    return y >= 0.92 ? [e.hips, e.hips, 1] : [e.hips, th, clamp01((y - 0.52) / 0.4)];
  };
  i.bind(skirtBind).paint(pantDark, { c2: pantWhite, mat: K.cloth, line: 0.5 });
  i.lathe(
    [
      [0.48, 0.31, 0.27],
      [0.7, 0.26, 0.22],
      [0.94, 0.23, 0.185],
    ],
    {
      seg: 32, cap0: false, cap1: false,
      shape: (ang: number, idx: number) => 1 + (0.055 - idx * 0.018) * Math.sin(ang * 8),
    },
  );
  // 左右两片玄铁密排札甲战裙（无跨腿悬空横杠，双腿灯笼裤动作更干净利落）
  i.paint(ironDark, {
    c2: ironLight,
    gloss: 0.8,
    mat: K.metal,
    pattern: En.scale,
    patternScale: 14,
    patternAmt: 0.38,
    line: 0.55,
  });
  if (bc) {
    bc(i, { yTop: 0.95, yBot: 0.56, top: [0.24, 0.2], bot: [0.33, 0.27], a0: -62, a1: 58, n: 6, double: true });
    bc(i, { yTop: 0.95, yBot: 0.56, top: [0.24, 0.2], bot: [0.33, 0.27], a0: 122, a1: 242, n: 6, double: true });
  }

  // 破损血红宽腰带飘带（右前斜摆 + 左侧飞扬摆）
  i.bind(Zi(tabChain, tabPts, e.hips)).paint(red, { c2: redDark, mat: K.cloth, pattern: En.weave, patternScale: 8, patternAmt: 0.22, line: 0.45 });
  buildTatteredCape(api, i, tabPts, {
    widthFn: (v) => mixVal(0.11, 0.19, v),
    bow: [0.02, 0, 0.03],
    nu: 6,
    nv: 10,
    tatterAmp: 0.22,
    seed: 2.1,
  });
  i.bind(Zi(tabChainL, tabPtsL, e.hips)).paint(red, { c2: redDark, mat: K.cloth, pattern: En.weave, patternScale: 8, patternAmt: 0.22, line: 0.45 });
  buildTatteredCape(api, i, tabPtsL, {
    widthFn: (v) => mixVal(0.09, 0.16, v),
    axis: [0.25, 0, 0.95],
    bow: [-0.03, 0, 0.02],
    nu: 5,
    nv: 9,
    tatterAmp: 0.2,
    seed: 4.3,
  });

  // ── 3. 玄铁密排札甲胸铠 + 素白交领内衬 + 正胸/腰正中立体鎏金狮头 ──
  i.bind(Bl(n)).paint(ironDark, {
    c2: ironLight,
    gloss: 0.82,
    mat: K.metal,
    pattern: En.scale,
    patternScale: 16,
    patternAmt: 0.4,
    line: 0.62,
  });
  i.lathe(
    [
      [0.9, 0.228, 0.178],
      [1.03, 0.206, 0.16],
      [1.18, 0.26, 0.19],
      [1.37, 0.316, 0.214],
      [1.49, 0.226, 0.154],
      [1.54, 0.118, 0.108],
    ],
    { seg: 18 },
  );
  // 素白内衣领边（立绘颈口可见一抹白领）+ 结实颈部
  i.bone(e.chest).paint(0xede8dc, { c2: 0xc9c2b4, mat: K.cloth, line: 0.3 });
  i.g(pt(0, 1.525, 0.015, 10, 0, 0), () => i.torus(0.108, 0.02, 0.018, 12, 4));
  i.bone(e.neck).paint(pal.skin, { ao: 0.82, mat: K.skin, line: 0.35 });
  i.lathe([[1.51, 0.088, 0.088], [1.65, 0.082, 0.082]], { seg: 12, cap0: false });

  // 胸甲鎏金边缘框 + 胸前交叉红革束带
  i.bone(e.chest).paint(gold, { c2: goldHi, gloss: 1, mat: K.metal, line: 0.25 });
  i.g(pt(0, 1.48, 0.01, 14, 0, 0), () => i.torus(0.155, 0.014, 0.016, 14, 4));
  i.paint(redDark, { c2: red, mat: K.leather, line: 0.2 });
  i.tube(
    [
      [-0.22, 1.24, 0.16, 0.016, 0.008],
      [0, 1.28, 0.22, 0.018, 0.008],
      [0.22, 1.24, 0.16, 0.016, 0.008],
    ],
    { seg: 5, up: [0, 1, 0] },
  );

  // 正胸立体鎏金吞口狮头护心镜！
  i.g(pt(0, 1.35, 0.214, -4, 0, 0), () => {
    buildLionMedallion(api, i, gold, goldHi, goldDark, 1.15);
  });

  // 颈肩缠绕的厚重血红披风领围（立绘双肩外侧浓重红绸翻卷）
  i.paint(red, { c2: redDark, mat: K.cloth, pattern: En.weave, patternScale: 9, patternAmt: 0.25, line: 0.5 });
  i.g(pt(0, 1.5, -0.02, 12, 0, 0), () => i.torus(0.195, 0.056, 0.048, 16, 6));
  i.sym(() => {
    i.tube(
      [
        [0.14, 1.53, 0.06, 0.055, 0.042],
        [0.24, 1.44, 0.02, 0.062, 0.046],
        [0.34, 1.38, -0.08, 0.058, 0.042],
        [0.22, 1.32, -0.2, 0.065, 0.045],
      ],
      { seg: 8 },
    );
  });

  // 束腰革带 + 缠绕血红布带 + 腰正中巨型鎏金狮头带扣！
  i.bone(e.spine).paint(pal.leatherDark ?? 0x291c14, { c2: pal.leather ?? 0x453124, mat: K.leather, line: 0.45 });
  i.lathe([[0.95, 0.236, 0.188], [1.07, 0.216, 0.172]], { seg: 16 });
  i.paint(red, { c2: redDark, mat: K.cloth, line: 0.35 });
  i.g(pt(0, 0.94, 0, 4, 0, 0), () => i.torus(0.225, 0.036, 0.032, 16, 5));
  i.g(pt(0, 1.01, 0.186, 0, 0, 0), () => {
    buildLionMedallion(api, i, gold, goldHi, goldDark, 1.22);
  });

  // ── 4. 鎏金吞肩狮头双肩甲 + 札甲宽披膊 + 墨黑内袖 + 雕金玄铁护臂 ──
  i.sym((side) => {
    const sx = s.shoulderX;
    i.bone(side > 0 ? e.clavL : e.clavR);
    // 札甲金边宽大披膊（斜覆上臂外侧）
    i.paint(ironDark, {
      c2: ironLight,
      gloss: 0.82,
      mat: K.metal,
      pattern: En.scale,
      patternScale: 14,
      patternAmt: 0.38,
      line: 0.55,
    });
    i.g(pt(0.355, 1.48, 0, 0, 0, -24), () => {
      i.lathe(
        [
          [-0.14, 0.195, 0.185],
          [-0.04, 0.21, 0.196],
          [0.08, 0.155, 0.15],
          [0.14, 0.06, 0.06],
        ],
        { seg: 14 },
      );
      // 披膊下缘鎏金宽边
      i.paint(gold, { c2: goldHi, gloss: 1, mat: K.metal, line: 0.25 });
      i.lathe([[-0.148, 0.198, 0.188], [-0.118, 0.204, 0.194]], { seg: 14, cap0: false, cap1: false });
    });
    // 肩头立体鎏金大狮头兽面！
    i.g(pt(0.415, 1.525, 0.055, -14, 58, -12), () => {
      buildLionMedallion(api, i, gold, goldHi, goldDark, 1.38);
    });

    // 上臂：宽松褶皱墨黑武衫内袖
    i.bone(side > 0 ? e.armL : e.armR).paint(pantDark, { c2: 0x3b404d, mat: K.cloth, pattern: En.weave, patternScale: 10, patternAmt: 0.22, line: 0.55 });
    i.ball(sx, s.shoulderY, 0, 0.118, 0.108, 0.118, 1);
    i.lathe(
      [
        [s.elbowY - 0.04, 0.105, 0.108, sx, 0],
        [mixVal(s.elbowY, s.shoulderY, 0.5), 0.125, 0.128, sx, 0],
        [s.shoulderY + 0.04, 0.112, 0.112, sx, 0],
      ],
      { seg: 12, shape: (ang: number) => 1 + 0.05 * Math.sin(ang * 5) },
    );

    // 前臂：玄铁鎏金雕花护臂（紧扣前臂，腕口微露皮肤）
    i.bone(side > 0 ? e.foreL : e.foreR).paint(ironDark, {
      c2: ironLight,
      gloss: 0.85,
      mat: K.metal,
      pattern: En.scale,
      patternScale: 12,
      patternAmt: 0.3,
      line: 0.55,
    });
    i.ball(sx, s.elbowY, 0, 0.096, 0.088, 0.096, 1);
    i.lathe(
      [
        [s.wristY + 0.01, 0.078, 0.08, sx, 0],
        [s.wristY + 0.11, 0.094, 0.096, sx, 0],
        [s.elbowY - 0.02, 0.1, 0.102, sx, 0],
      ],
      { seg: 12 },
    );
    i.paint(gold, { c2: goldHi, gloss: 1, mat: K.metal, line: 0.2 });
    i.g(pt(sx, s.wristY + 0.02, 0), () => i.torus(0.082, 0.012, 0.014, 10, 4));
    i.g(pt(sx, s.elbowY - 0.02, 0), () => i.torus(0.102, 0.012, 0.014, 10, 4));
    i.paint(pal.skin, { ao: 0.88, mat: K.skin, line: 0.35 });
    i.limb([sx, s.wristY + 0.02, 0], [sx, s.handY + 0.02, 0], 0.068, 0.062, { seg: 8 });
  });

  i.paint(pal.skin, { ao: 0.88, mat: K.skin, line: 0.4 });
  Ko(i, n, 1, 0.074);
  Ko(i, n, -1, 0.074);

  // 背后破损撕裂感浓烈血红大披风（绑 cloakChain 随冲锋猎猎狂舞）
  i.bind(Zi(cloakChain, cloakPts, e.chest)).paint(red, {
    c2: redDark,
    mat: K.cloth,
    pattern: En.weave,
    patternScale: 8,
    patternAmt: 0.25,
    line: 0.55,
  });
  buildTatteredCape(api, i, cloakPts, {
    widthFn: (v) => mixVal(0.32, 0.58, v),
    bow: [0, 0, -0.08],
    nu: 10,
    nv: 12,
    tatterAmp: 0.28,
    wave: 0.26,
    seed: 1.4,
  });

  // ── 5. 秦琼精雕威武面庞 + 鎏金束发冠 + 奔放乌黑高马尾（彻底无头盔！） ──
  const head = buildSculptedTangSongHead(api, i, n, {
    skin: pal.skin,
    skinShade: 0xb57756,
    hair: pal.hair,
    hairHi: pal.hairHi,
    iris: 0x261610,
    lip: 0xa65c4a,
    headScale,
    female: false,
    eyeSlant: 7,
    browAngle: 16,
    smile: -0.002,
    beard: 'general',
    bangStyle: 'wild',
    sideLockLen: 0.14,
  });

  const cy = head.cy;
  // 头顶束发鎏金小冠（立绘高马尾根部精致金冠）
  i.bone(e.head).paint(gold, { c2: goldHi, gloss: 1, glow: 0.12, mat: K.metal, line: 0.25 });
  i.g(pt(0, cy + 0.26 * headScale, -0.055, -24, 0, 0), () => {
    i.lathe(
      [
        [-0.01, 0.082, 0.082],
        [0.04, 0.076, 0.076],
        [0.082, 0.088, 0.088],
        [0.095, 0.072, 0.072],
      ],
      { seg: 12, crease: 26 },
    );
    i.torus(0.082, 0.012, 0.014, 12, 4);
  });
  // 束发冠下朱红发带结
  i.paint(red, { c2: redDark, mat: K.cloth, line: 0.2 });
  i.g(pt(0, cy + 0.24 * headScale, -0.055, -24, 0, 0), () => i.torus(0.086, 0.014, 0.014, 12, 4));

  // 奔放多缕飞扬乌黑高马尾（加粗高挑，对标立绘火焰般狂野马尾！）
  i.bind(Zi(maneChain, manePts, e.head)).paint(pal.hair, {
    c2: pal.hairHi,
    gloss: 0.24,
    mat: K.fur,
    pattern: En.fur,
    patternScale: 12,
    patternAmt: 0.32,
    line: 0.4,
  });
  const tailOffsets: [number, number, number, number][] = [
    [0, 0.04, 0, 1.32],
    [0.06, 0.08, -0.02, 0.95],
    [-0.06, 0.05, -0.02, 0.95],
    [0.03, -0.04, 0.02, 0.85],
    [-0.04, -0.03, 0.03, 0.8],
  ];
  for (const [ox, oy, oz, sc] of tailOffsets) {
    i.tube(
      [
        [manePts[0][0] + ox * 0.25, manePts[0][1] + oy * 0.25, manePts[0][2], 0.068 * sc, 0.054 * sc],
        [manePts[1][0] + ox * 0.95, manePts[1][1] + oy * 1.1, manePts[1][2] + oz, 0.082 * sc, 0.06 * sc],
        [manePts[2][0] + ox * 1.65, manePts[2][1] + oy * 1.5, manePts[2][2] + oz * 1.4, 0.056 * sc, 0.042 * sc],
        [manePts[3][0] + ox * 2.25, manePts[3][1] + oy * 1.7, manePts[3][2] + oz * 1.8, 0.008 * sc, 0.008 * sc],
      ],
      { seg: 7, up: [0, 1, 0], crease: 180 },
    );
  }

  // ── 6. 立绘同款双手巨型【带刺玄铁鎏金流星骨朵大锤】 ──
  // 右手主锤（挂于 propR，严格沿 +Z 延伸，兼容 FU 挥砸）
  i.bone(e.propR);
  i.g(pt(-s.shoulderX, s.handY, 0), () => {
    buildSpikedIronMace(api, i, pal, 1.04);
  });

  // 左手副锤（挂于 shieldBone，略外垂于左侧下方，完整亮出正胸鎏金狮头与札甲！）
  i.bone(shieldBone);
  i.g(pt(s.shoulderX + 0.04, s.handY - 0.02, 0, 108, -28, -24), () => {
    buildSpikedIronMace(api, i, pal, 1.0);
  });

  // ── 7. 伴生灵宠：玄金赤缨镇岳小瑞狮（外移侧后方伴随） ──
  const pet = addHeroCompanion(i, t, e.root, K, En, pt, 'lion');

  i.bakeGrounding(2.15, 0.78, 0.9);
  return { h: n, b: i, extra: { shield: shieldBone, mane: maneChain, pet } };
}
