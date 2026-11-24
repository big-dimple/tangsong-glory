/**
 * xinqiji.ts — 辛弃疾 3D 英雄模型（100% 按立绘 laohuan.pc.webp 精雕重构）
 *
 * 立绘标志特征：
 * - 无头盔！高束乌黑丸子发髻缠绕暗红发带（两条飘扬红发带）+ 披散黑长发丝 + 冷峻俊朗剑眉青年将领颜；
 * - 素白交领中衣 + 外披宽松暗朱红挽袖短袍（露白内袖卷边与结实肤色小臂）+ 黑铁鎏金花纹长护腕；
 * - 胸前紧缚玄铁山文/札甲护胸背心（金属肩带与鎏金胸扣）+ 双肩玄黑暗金云肩绣片；
 * - 素白宽布腰封 + 红黑双色交错破损长战摆与绯红长飘带 + 宽松月白灯笼武裤 + 黑铁鎏金兽纹高筒战靴；
 * - 右手执修长黑铁鎏金护手唐宋长横刀（带深红长刀穗），左手执雕金黑漆长刀鞘，大招保留隐藏式山河军令图。
 */

import { clothFoldDepth } from '../tangsongCloth';
import { addHeroCompanion } from './companions';
import { buildSculptedTangSongHead, buildTatteredCape } from './sculptKit';
import { clamp01, mixVal, TS_ASSASSIN_RIG, type FullHeroEngineApi } from './types';

export function buildXinQijiAssassinFull(api: FullHeroEngineApi, pal: Record<string, number>) {
  const { Gh, io, Sp, Ls, K, En, pt, bt, Zi, Bl, Ox, Ko, Wd } = api;
  const n = Gh(TS_ASSASSIN_RIG);
  const { rig: t, J: e, d: s } = n;
  const i = new Ls();
  const headScale = 0.77;

  // 严格兼容 jU() 动画控制器骨骼（大招军令图 furl / furlRows / furlPts + 飘带链）
  const scarfPts = [
    [0.06, 1.44, -0.14],
    [0.14, 1.2, -0.3],
    [0.2, 0.9, -0.44],
    [0.24, 0.58, -0.52],
    [0.26, 0.28, -0.56],
  ];
  const rChain = t.addChain('scarf', e.chest, scarfPts.slice(0, 4));
  t.chain({
    joints: rChain,
    tip: [0.02, -0.24, -0.06],
    stiffness: 4,
    drag: 0.72,
    gravity: 13,
    maxAngle: 46,
    wind: 3,
    colliders: [{ joint: e.chest, x: 0, y: 0, z: 0, r: 0.24 }],
  });

  const scarfBPts = [
    [-0.1, 1.4, -0.14],
    [-0.18, 1.14, -0.28],
    [-0.26, 0.84, -0.38],
    [-0.3, 0.5, -0.44],
    [-0.32, 0.24, -0.48],
  ];
  const cChain = t.addChain('scarfB', e.chest, scarfBPts.slice(0, 4));
  t.chain({
    joints: cChain,
    tip: [-0.02, -0.22, -0.05],
    stiffness: 4,
    drag: 0.72,
    gravity: 13,
    maxAngle: 46,
    wind: 2.5,
    colliders: [{ joint: e.chest, x: 0, y: 0, z: 0, r: 0.24 }],
  });

  // 前腰垂落两条立绘同款长红飘带
  const sashPts = [
    [-0.08, 0.96, 0.16],
    [-0.16, 0.72, 0.22],
    [-0.24, 0.46, 0.25],
    [-0.34, 0.22, 0.24],
  ];
  const dChain = t.addChain('sash', e.hips, sashPts.slice(0, 3));
  t.chain({ joints: dChain, tip: [-0.06, -0.18, -0.02], stiffness: 8, drag: 0.8, gravity: 8.5, maxAngle: 46, wind: 3 });

  const sashRPts = [
    [0.08, 0.96, 0.16],
    [0.14, 0.72, 0.21],
    [0.2, 0.48, 0.23],
    [0.26, 0.24, 0.2],
  ];
  const dChainR = t.addChain('sashR', e.hips, sashRPts.slice(0, 3));
  t.chain({ joints: dChainR, tip: [0.05, -0.18, -0.02], stiffness: 8, drag: 0.8, gravity: 8.5, maxAngle: 44, wind: 2.6 });

  // 后脑飘逸黑长发丝 + 暗红发带物理链
  const cyRef = s.headY + 0.2 * headScale;
  const hairBackPts = [
    [0, cyRef + 0.04, -0.15],
    [0.04, cyRef - 0.14, -0.26],
    [0.06, cyRef - 0.34, -0.34],
    [0.08, cyRef - 0.54, -0.38],
  ];
  const hairBackChain = t.addChain('hairBack', e.head, hairBackPts.slice(0, 3));
  t.chain({
    joints: hairBackChain,
    tip: [0.02, -0.18, -0.04],
    stiffness: 8,
    drag: 0.8,
    gravity: 7,
    maxAngle: 46,
    wind: 3.5,
    colliders: [{ joint: e.chest, x: 0, y: 0.06, z: -0.04, r: 0.22 }],
  });

  const ribBandPts = [
    [0.02, cyRef + 0.25 * headScale, -0.09],
    [0.12, cyRef + 0.22 * headScale, -0.26],
    [0.22, cyRef + 0.12 * headScale, -0.44],
    [0.32, cyRef - 0.02 * headScale, -0.58],
  ];
  const ribBandChain = t.addChain('headRib', e.head, ribBandPts.slice(0, 3));
  t.chain({ joints: ribBandChain, tip: [0.08, -0.1, -0.12], stiffness: 6.5, drag: 0.8, gravity: 4.5, maxAngle: 50, wind: 4 });

  // 隐藏大招军令图骨骼
  const h = t.add('furl', e.handL, s.shoulderX, s.handY, 0);
  const furlFn = (b: number) => [s.shoulderX, s.handY - 0.02 - b * Sp, 0.05 + 0.3 * Math.sin(b * Math.PI * 0.55)];
  const m = Array.from({ length: io + 1 }, (_v, idx) => furlFn(idx / io));
  const x = m.slice(1).map((p, idx) => t.add(`furl${idx + 1}`, h, p[0], p[1], p[2]));

  const ironDark = pal.suitDark ?? 0x191b22;
  const ironMid = pal.suit ?? 0x2b2f3a;
  const ironHi = pal.suitHi ?? 0x4c5262;
  const red = pal.sash ?? 0xa62520;
  const redDark = pal.sashDark ?? 0x5c1312;
  const whiteCloth = pal.silk ?? 0xe8e2d5;
  const whiteShade = pal.silkShade ?? 0xb8b0a0;
  const gold = pal.bronze ?? 0xdca040;
  const goldHi = pal.edge ?? 0xffd782;

  // ── 1. 宽松月白褶皱灯笼武裤 + 黑铁鎏金兽纹高筒战靴（红绳绑饰） ──
  i.sym((side) => {
    const hx = s.hipX;
    // 立绘核心下半身识别度：蓬松褶皱月白灯笼裤
    i.bone(side > 0 ? e.thighL : e.thighR).paint(whiteCloth, {
      c2: whiteShade,
      mat: K.cloth,
      pattern: En.weave,
      patternScale: 9,
      patternAmt: 0.16,
      line: 0.55,
      by: (_x: number, _y: number, zVal: number) => clamp01(0.25 + (zVal < 0 ? 0.5 : 0)),
    });
    i.lathe(
      [
        [s.kneeY - 0.04, 0.115, 0.122, hx + 0.01, 0],
        [mixVal(s.kneeY, s.hipY, 0.35), 0.165, 0.168, hx + 0.016, 0.008],
        [mixVal(s.kneeY, s.hipY, 0.72), 0.152, 0.15, hx + 0.008, 0],
        [s.hipY + 0.05, 0.122, 0.118, hx, 0],
      ],
      {
        seg: 16,
        cap0: false,
        cap1: false,
        shape: (ang: number, idx: number) => 1 + (idx < 3 ? 0.085 * Math.sin(ang * 6) : 0.02 * Math.sin(ang * 6)),
      },
    );

    // 膝下高筒黑铁鎏金雕花战靴
    i.bone(side > 0 ? e.shinL : e.shinR).paint(ironDark, {
      c2: ironHi,
      gloss: 0.65,
      mat: K.leather,
      pattern: En.scale,
      patternScale: 12,
      patternAmt: 0.24,
      line: 0.55,
    });
    i.lathe(
      [
        [s.ankleY - 0.02, 0.072, 0.078, hx, 0],
        [0.29, 0.084, 0.09, hx, 0],
        [s.kneeY + 0.02, 0.092, 0.098, hx, 0],
      ],
      { seg: 12 },
    );
    // 膝口尖顶鎏金兽纹护膝饰片 + 脚踝红绳
    i.paint(gold, { c2: goldHi, gloss: 1, mat: K.metal, line: 0.2 });
    i.g(pt(hx, s.kneeY + 0.01, 0.095, -6, 0, 0), () =>
      i.extrude(
        [
          [0, 0.065],
          [0.045, 0.012],
          [0.032, -0.055],
          [-0.032, -0.055],
          [-0.045, 0.012],
        ],
        0.014,
        0.004,
      ),
    );
    i.paint(red, { c2: redDark, mat: K.cloth, line: 0.2 });
    i.g(pt(hx, s.kneeY - 0.06, 0, 5, 0, 0), () => i.torus(0.094, 0.012, 0.012, 12, 4));
    i.g(pt(hx, 0.16, 0, -5, 0, 0), () => i.torus(0.078, 0.011, 0.011, 12, 4));
  });

  for (const side of [1, -1]) {
    i.paint(ironDark, { c2: pal.leather ?? 0x3b2820, mat: K.leather, gloss: 0.35, line: 0.5 });
    Ox(i, n, side, { top: 0.26, rTop: 0.082, rAnkle: 0.068, len: 0.25, toe: 0.024, seg: 10 });
  }

  // ── 2. 玄黑×暗红交错撕裂感战裙摆 + 素白宽腰封 + 红绳 ──
  const flapBind = (sideX: number, y: number) => {
    const th = sideX >= 0 ? e.thighL : e.thighR;
    return y >= 0.94 ? [e.hips, e.hips, 1] : [e.hips, th, clamp01((y - 0.56) / 0.38)];
  };
  // 前中玄黑织纹开衩短战摆（立绘白裤前垂的深墨黑长片）
  i.bind(flapBind).paint(ironDark, { c2: ironMid, mat: K.cloth, pattern: En.weave, patternScale: 10, patternAmt: 0.25, line: 0.5 });
  i.sheet(
    14,
    7,
    (u, v) => {
      const ang = bt(-72, 72, u) * (Math.PI / 180) + Math.PI / 2;
      const rad = bt(0.18, 0.24, v) + 0.012 * v * (1 + clothFoldDepth(u, v, 2, 1.3));
      const split = v * 0.05 * Math.max(0, 1 - Math.abs(u - 0.5) / 0.12);
      const hem = 0.01 * v * v * Math.cos(u * Math.PI * 4);
      return [Math.cos(ang) * rad, bt(0.96, 0.42, v) + split + hem, Math.sin(ang) * rad * 0.88];
    },
    true,
  );
  // 侧后破损黑红双层长摆（绑物理链随身法狂舞）
  i.bind(Zi(rChain, scarfPts, e.chest)).paint(red, {
    c2: redDark,
    mat: K.cloth,
    pattern: En.weave,
    patternScale: 9,
    patternAmt: 0.24,
    line: 0.5,
  });
  buildTatteredCape(api, i, scarfPts, {
    widthFn: (v) => mixVal(0.24, 0.44, v),
    bow: [0.04, 0, -0.06],
    nu: 9,
    nv: 12,
    tatterAmp: 0.28,
    wave: 0.28,
    seed: 1.9,
  });
  i.bind(Zi(cChain, scarfBPts, e.chest)).paint(ironDark, {
    c2: ironMid,
    mat: K.cloth,
    pattern: En.weave,
    patternScale: 10,
    patternAmt: 0.26,
    line: 0.5,
  });
  buildTatteredCape(api, i, scarfBPts, {
    widthFn: (v) => mixVal(0.2, 0.38, v),
    bow: [-0.04, 0, -0.05],
    nu: 8,
    nv: 11,
    tatterAmp: 0.26,
    wave: 0.26,
    seed: 3.7,
  });
  // 前垂两条飘逸血红长腰带
  i.bind(Zi(dChain, sashPts, e.hips)).paint(red, { c2: redDark, mat: K.cloth, line: 0.4 });
  buildTatteredCape(api, i, sashPts, {
    widthFn: (v) => mixVal(0.055, 0.1, v),
    bow: [0, 0, 0.025],
    nu: 4,
    nv: 9,
    tatterAmp: 0.16,
    seed: 5.1,
  });
  i.bind(Zi(dChainR, sashRPts, e.hips)).paint(red, { c2: redDark, mat: K.cloth, line: 0.4 });
  buildTatteredCape(api, i, sashRPts, {
    widthFn: (v) => mixVal(0.048, 0.088, v),
    bow: [0, 0, 0.02],
    nu: 4,
    nv: 8,
    tatterAmp: 0.14,
    seed: 6.4,
  });

  // ── 3. 素白交领中衣 + 朱红短袍上身 + 紧身玄铁山文护胸背心 ──
  i.bind(Bl(n)).paint(redDark, { c2: red, mat: K.cloth, pattern: En.weave, patternScale: 10, patternAmt: 0.22, line: 0.55 });
  i.lathe(
    [
      [0.92, 0.19, 0.148],
      [1.06, 0.168, 0.132],
      [1.2, 0.212, 0.154],
      [1.37, 0.242, 0.168],
      [1.48, 0.164, 0.124],
      [1.53, 0.088, 0.082],
    ],
    { seg: 16 },
  );
  // 修长颈部与素白 V 形交领中衣
  i.bone(e.neck).paint(pal.skin, { ao: 0.8, mat: K.skin, line: 0.35 });
  i.lathe([[1.49, 0.065, 0.065], [1.62, 0.062, 0.062]], { seg: 10, cap0: false });
  i.bone(e.chest).paint(whiteCloth, { c2: whiteShade, mat: K.cloth, line: 0.35 });
  i.tube(
    [
      [0.085, 1.5, 0.055, 0.028, 0.014],
      [0.03, 1.4, 0.155, 0.028, 0.014],
      [-0.075, 1.26, 0.172, 0.024, 0.012],
    ],
    { seg: 5, up: [1, 0.4, 0] },
  );
  i.tube(
    [
      [-0.085, 1.5, 0.055, 0.028, 0.014],
      [-0.02, 1.41, 0.152, 0.026, 0.014],
      [0.05, 1.32, 0.168, 0.022, 0.012],
    ],
    { seg: 5, up: [-1, 0.4, 0] },
  );

  // 立绘标志性【玄铁密排山文/札甲护胸背心】（上包至锁骨下、高金属质感鳞纹，配革带与鎏金胸扣）
  i.bind(Bl(n)).paint(0x282d38, {
    c2: 0x626b7e,
    gloss: 0.88,
    mat: K.metal,
    pattern: En.scale,
    patternScale: 16,
    patternAmt: 0.48,
    line: 0.55,
  });
  i.lathe(
    [
      [1.06, 0.184, 0.15],
      [1.22, 0.226, 0.172],
      [1.37, 0.246, 0.18],
      [1.46, 0.182, 0.14],
    ],
    { seg: 18, cap0: false },
  );
  // 胸甲肩革带与两枚鎏金云纹胸扣
  i.bone(e.chest).sym(() => {
    i.paint(pal.leatherDark ?? 0x261812, { c2: pal.leather ?? 0x452d22, mat: K.leather, line: 0.25 });
    i.tube(
      [
        [0.11, 1.5, -0.02, 0.022, 0.01],
        [0.125, 1.44, 0.128, 0.022, 0.01],
        [0.13, 1.32, 0.182, 0.022, 0.01],
      ],
      { seg: 5, up: [1, 0, 0] },
    );
    i.paint(gold, { c2: goldHi, gloss: 1, mat: K.metal, line: 0 });
    i.g(pt(0.132, 1.35, 0.19, 82, 20, 0), () => i.torus(0.024, 0.007, 0.008, 10, 4));
  });

  // 素白宽布腰封 + 缠腰朱红系带
  i.bone(e.spine).paint(whiteCloth, { c2: whiteShade, mat: K.cloth, line: 0.45 });
  i.lathe([[0.96, 0.198, 0.158], [1.07, 0.184, 0.148]], { seg: 16 });
  i.paint(red, { c2: redDark, mat: K.cloth, line: 0.3 });
  i.g(pt(0, 1.0, 0, 6, 0, 0), () => i.torus(0.196, 0.016, 0.015, 16, 4));
  i.g(pt(0, 0.96, 0, -4, 0, 0), () => i.torus(0.202, 0.014, 0.014, 16, 4));

  // ── 4. 宽松挽袖朱红短袍（自然落肩 + 贴肩暗金绣纹肩片，彻底去掉鼓碗肩甲！） ──
  i.sym((side) => {
    const sx = s.shoulderX;
    // 自然贴服的红袍落肩与肩头暗金云纹绣片
    i.bone(side > 0 ? e.clavL : e.clavR).paint(red, { c2: redDark, mat: K.cloth, pattern: En.weave, patternScale: 10, patternAmt: 0.24, line: 0.5 });
    i.tube(
      [
        [sx * 0.44, s.shoulderY + 0.05, 0, 0.078, 0.088],
        [sx * 0.82, s.shoulderY + 0.02, 0, 0.092, 0.096],
        [sx, s.shoulderY - 0.02, 0, 0.092, 0.094],
      ],
      { seg: 12, up: [0, 1, 0], crease: 180 },
    );
    i.paint(ironDark, {
      c2: gold,
      gloss: 0.6,
      mat: K.cloth,
      pattern: En.weave,
      patternScale: 14,
      patternAmt: 0.45,
      line: 0.3,
    });
    i.g(pt(sx * 0.86, s.shoulderY + 0.048, 0, 0, 0, -26), () => i.box(0, 0, 0, 0.13, 0.022, 0.11, 0.008));

    // 上臂：宽松褶皱暗朱红短袍袖
    i.bone(side > 0 ? e.armL : e.armR).paint(red, { c2: redDark, mat: K.cloth, pattern: En.weave, patternScale: 10, patternAmt: 0.24, line: 0.55 });
    i.ball(sx, s.shoulderY, 0, 0.095, 0.088, 0.095, 1);
    i.lathe(
      [
        [s.elbowY + 0.01, 0.102, 0.105, sx, 0],
        [mixVal(s.elbowY, s.shoulderY, 0.48), 0.118, 0.116, sx, 0],
        [s.shoulderY + 0.03, 0.096, 0.096, sx, 0],
      ],
      { seg: 14, shape: (ang: number) => 1 + 0.06 * Math.sin(ang * 5) },
    );
    // 挽起的素白内袖卷边（立绘极有辨识度的卷袖白边！）
    i.paint(whiteCloth, { c2: whiteShade, mat: K.cloth, line: 0.4 });
    i.g(pt(sx, s.elbowY + 0.02, 0), () => i.torus(0.096, 0.022, 0.02, 12, 5));

    // 前臂：上段露结实肤色小臂，下段配黑铁鎏金花纹长护腕
    i.bone(side > 0 ? e.foreL : e.foreR).paint(pal.skin, { c2: 0xc28664, ao: 0.86, mat: K.skin, line: 0.4 });
    i.ball(sx, s.elbowY - 0.01, 0, 0.068, 0.066, 0.068, 1);
    i.limb([sx, s.elbowY + 0.02, 0], [sx, s.wristY - 0.01, 0], 0.068, 0.056, { seg: 10 });
    // 黑铁鎏金护腕
    i.paint(ironDark, {
      c2: gold,
      gloss: 0.85,
      mat: K.metal,
      pattern: En.weave,
      patternScale: 14,
      patternAmt: 0.35,
      line: 0.45,
    });
    i.lathe(
      [
        [s.wristY - 0.01, 0.062, 0.062, sx, 0],
        [s.wristY + 0.06, 0.07, 0.07, sx, 0],
        [s.wristY + 0.17, 0.075, 0.075, sx, 0],
      ],
      { seg: 12 },
    );
    i.paint(gold, { c2: goldHi, gloss: 1, mat: K.metal, line: 0 });
    Wd(i, sx, s.wristY + 0.01, 0, 0.066, 0.066, 0.008, 0.012, 10);
    Wd(i, sx, s.wristY + 0.16, 0, 0.078, 0.078, 0.008, 0.012, 10);
  });

  i.paint(pal.skin, { ao: 0.88, mat: K.skin, line: 0.38 });
  Ko(i, n, 1, 0.056);
  Ko(i, n, -1, 0.056);

  // ── 5. 俊朗凌厉青年将领面容 + 高丸子头暗红发带 + 披散长发（彻底无头盔！） ──
  const head = buildSculptedTangSongHead(api, i, n, {
    skin: pal.skin,
    skinShade: 0xc99272,
    hair: pal.hair,
    hairHi: pal.hairHi,
    iris: 0x241612,
    lip: 0xb06658,
    headScale,
    female: false,
    eyeSlant: 8,
    browAngle: 15,
    smile: 0.005,
    beard: 'none',
    bangStyle: 'wild',
    sideLockLen: 0.24,
  });

  const cy = head.cy;
  // 头顶蓬松高丸子发髻 + 暗红缠绕发带
  i.bone(e.head).paint(pal.hair, {
    c2: pal.hairHi,
    gloss: 0.22,
    mat: K.fur,
    pattern: En.fur,
    patternScale: 12,
    patternAmt: 0.32,
    line: 0.4,
  });
  i.ball(0, cy + 0.275 * headScale, -0.05, 0.078, 0.072, 0.078, 1);
  i.ball(0, cy + 0.33 * headScale, -0.055, 0.056, 0.048, 0.056, 1);
  i.paint(red, { c2: redDark, mat: K.cloth, line: 0.25 });
  i.g(pt(0, cy + 0.245 * headScale, -0.05, -22, 0, 0), () => i.torus(0.082, 0.016, 0.016, 12, 4));

  // 两条随风飘扬的修长暗红发带（立绘最具辨识度的头部飘逸线条！）
  i.bind(Zi(ribBandChain, ribBandPts, e.head)).paint(red, { c2: redDark, mat: K.cloth, line: 0.25 });
  buildTatteredCape(api, i, ribBandPts, {
    widthFn: (v) => mixVal(0.022, 0.036, v),
    bow: [0, 0.015, 0],
    nu: 3,
    nv: 9,
    tatterAmp: 0.08,
    wave: 0.32,
    seed: 2.3,
  });
  buildTatteredCape(
    api,
    i,
    ribBandPts.map(([px, py, pz], idx) => [px - 0.03 * idx, py - 0.04 * idx, pz + 0.02 * idx]),
    {
      widthFn: (v) => mixVal(0.018, 0.03, v),
      bow: [0, -0.01, 0],
      nu: 3,
      nv: 8,
      tatterAmp: 0.08,
      wave: 0.28,
      seed: 4.1,
    },
  );

  // 披散后背的多缕飘逸黑长发丝
  i.bind(Zi(hairBackChain, hairBackPts, e.head)).paint(pal.hair, {
    c2: pal.hairHi,
    gloss: 0.22,
    mat: K.fur,
    pattern: En.fur,
    patternScale: 12,
    patternAmt: 0.3,
    line: 0.35,
  });
  for (const [ox, sc] of [
    [0, 1.0],
    [0.075, 0.72],
    [-0.075, 0.72],
    [0.13, 0.5],
    [-0.13, 0.5],
  ]) {
    i.tube(
      [
        [hairBackPts[0][0] + ox * 0.5, hairBackPts[0][1], hairBackPts[0][2], 0.052 * sc, 0.026 * sc],
        [hairBackPts[1][0] + ox * 0.9, hairBackPts[1][1], hairBackPts[1][2], 0.048 * sc, 0.024 * sc],
        [hairBackPts[2][0] + ox * 1.25, hairBackPts[2][1], hairBackPts[2][2], 0.034 * sc, 0.018 * sc],
        [hairBackPts[3][0] + ox * 1.5, hairBackPts[3][1], hairBackPts[3][2], 0.006 * sc, 0.006 * sc],
      ],
      { seg: 6, up: [1, 0, 0], crease: 180 },
    );
  }

  // ── 6. 右手修长唐宋长横刀（带深红长刀穗）& 左手黑漆鎏金刀鞘 + 隐藏大招军令图 ──
  i.bone(e.propR);
  i.g(pt(-s.shoulderX, s.handY, 0), () => {
    // 缠革细长刀柄 + 鎏金雕花刀镡 + 刀尾金箍与红穗
    i.paint(pal.leatherDark ?? 0x241814, { c2: pal.leather ?? 0x3b2820, mat: K.leather, line: 0.4 });
    i.tube([[0, 0, -0.06, 0.018], [0, 0, 0.19, 0.017]], { seg: 8 });
    i.paint(gold, { c2: goldHi, gloss: 1, mat: K.metal, line: 0.25 });
    i.tube([[0, 0, -0.055, 0.028, 0.044], [0, 0, -0.085, 0.028, 0.044]], { seg: 8, crease: 26 });
    i.ball(0, 0, 0.2, 0.022, 0.022, 0.024, 0);
    // 刀柄尾端深红流苏长刀穗
    i.paint(red, { c2: redDark, mat: K.fur, line: 0.2 });
    i.tube([[0, 0, 0.21, 0.014], [0, -0.1, 0.25, 0.024], [0, -0.22, 0.27, 0.008]], { seg: 6 });

    // 百炼精钢修长唐宋横刀刃（沿 -Z 严格兼容 jU 刺杀挥斩）
    i.paint(pal.steel ?? 0xdde5f0, {
      c2: pal.steelDark ?? 0x6f7a8c,
      gloss: 1,
      mat: K.metal,
      pattern: En.meteor,
      patternScale: 12,
      patternAmt: 0.25,
      line: 0.45,
    });
    const bladePts: number[][] = [];
    for (let idx = 0; idx <= 8; idx++) {
      const tVal = idx / 8;
      const w = 0.036 * (1 - 0.35 * Math.pow(tVal, 2.2)) * (idx === 8 ? 0.12 : 1);
      const curveY = 0.028 * tVal * tVal;
      bladePts.push([0, curveY, -0.085 - tVal * 0.82, 0.008 * (1 - tVal * 0.5), w]);
    }
    i.tube(bladePts, { seg: 4, up: [0, 1, 0], crease: 0 });
    // 寒锋微光刃线
    i.paint(0xfff0cc, { glow: 0.45, gloss: 1, mat: K.metal, line: 0 });
    i.tube(bladePts.slice(1).map((p) => [p[0], p[1] - p[4] * 0.9, p[2], 0.003, 0.004]), { seg: 3, up: [0, 1, 0], crease: 0 });
  });

  // 左手黑漆雕金长刀鞘（带红穗，与立绘左手握鞘拔刀的豪迈姿致呼应）
  i.bone(e.propL);
  i.g(pt(s.shoulderX, s.handY, 0), () => {
    i.paint(ironDark, { c2: ironMid, gloss: 0.55, mat: K.leather, line: 0.45 });
    i.tube([[0, 0, 0.14, 0.018, 0.024], [0, 0, -0.56, 0.017, 0.022]], { seg: 8 });
    i.paint(gold, { c2: goldHi, gloss: 1, mat: K.metal, line: 0.2 });
    for (const zPos of [0.1, -0.14, -0.48]) {
      i.g(pt(0, 0, zPos, 90, 0, 0), () => i.torus(0.022, 0.008, 0.009, 10, 4));
    }
    i.paint(red, { c2: redDark, mat: K.fur, line: 0.2 });
    i.tube([[0, -0.02, -0.16, 0.012], [0, -0.14, -0.18, 0.022], [0, -0.24, -0.19, 0.008]], { seg: 5 });
  });

  // 隐藏大招山河军令图（仅 cast_ult 时展开，平时 scale=0 完全隐藏）
  i.bone(h);
  const M = (idx: number) => (idx <= 0 ? h : x[Math.min(io, idx) - 1]);
  const furlBind = (_x: number, yVal: number) => {
    const fIdx = clamp01((s.handY - 0.02 - yVal) / Sp) * io;
    const baseIdx = Math.min(io - 1, Math.floor(fIdx + 1e-4));
    return [M(baseIdx), M(baseIdx + 1), clamp01(1 - (fIdx - baseIdx))];
  };
  i.g(pt(s.shoulderX, s.handY - 0.02, 0), () => {
    i.paint(pal.tube ?? 0x5c221b, { c2: pal.tubeDark ?? 0x33110d, gloss: 0.55, mat: K.leather, line: 0.35 });
    i.tube([[-0.22, 0, 0.03, 0.02], [0.22, 0, 0.03, 0.02]], { seg: 6 });
    const scrollPt = (u: number, v: number, dz = 0) => [
      bt(-0.2, 0.2, u),
      -v * Sp,
      0.05 + 0.3 * Math.sin(v * Math.PI * 0.55)
        + 0.012 * Math.sin(u * Math.PI * 2 + 0.5) * Math.sin(v * Math.PI) + dz,
    ];
    i.bind(furlBind).paint(whiteCloth, { c2: whiteShade, mat: K.cloth, by: (_u: number, yVal: number) => clamp01((s.handY - 0.02 - yVal) / Sp), line: 0.35 });
    i.sheet(8, io, (u, v) => scrollPt(u, v));
    i.paint(red, { mat: K.cloth, line: 0 });
    for (const [yv, amp] of [
      [0.3, 0.06],
      [0.55, 0.04],
    ]) {
      const pts: number[][] = [];
      for (let C = 0; C <= 6; C++) {
        const p = scrollPt(0.1 + (C / 6) * 0.8, yv - amp * Math.abs(Math.sin(C * 1.7)), 0.006);
        pts.push([p[0], p[1], p[2], 0.006, 0.003]);
      }
      i.tube(pts, { seg: 3, up: [0, 0, 1] });
    }
    i.bone(x[io - 1]).paint(pal.tube ?? 0x5c221b, { c2: pal.tubeDark ?? 0x33110d, gloss: 0.5, mat: K.leather, line: 0.35 });
    const bot = scrollPt(0.5, 1);
    i.tube([[-0.21, bot[1], bot[2], 0.022], [0.21, bot[1], bot[2], 0.022]], { seg: 6 });
  });

  // ── 7. 伴生灵宠：墨羽赤金海东青 ──
  const pet = addHeroCompanion(i, t, e.root, K, En, pt, 'hawk');
  i.bakeGrounding(2.1, 0.78, 0.9);
  return { h: n, b: i, extra: { furl: h, furlRows: x, furlPts: m, pet } };
}
