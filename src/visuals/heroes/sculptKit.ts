/**
 * sculptKit.ts — 《唐宋荣耀》国风工笔 3D 英雄核心雕刻工坊
 *
 * 彻底摆脱原版 qh 卤蛋球与 Cm 塑料帽：
 * 1. 自研骨相级东方头颅 buildSculptedTangSongHead（鹅蛋/瓜子下颌 vs 剑眉棱角男颜 + 工笔丹凤眸 + 立体鼻唇 + 分缕蓬松乌发）；
 * 2. 唐宋多褶大广袖、层叠交错垂地长裙、破损撕裂感披风飘带；
 * 3. 三维立体雕塑鎏金吞口狮头兽面、带刺玄铁流星大锤、梅花金步摇、凤冠珠钗、双节醉翁酒葫芦、竹简与狼毫毛笔。
 */

import { clothFoldDepth } from '../tangsongCloth';
import {
  clamp01,
  mixVal,
  type FullHeroEngineApi,
  type HeadObj,
  type HeroModelApi,
} from './types';

export interface SculptedHeadOpts {
  skin: number;
  skinShade?: number;
  hair: number;
  hairHi: number;
  iris: number;
  lip: number;
  headScale: number;
  female?: boolean;
  jawWidth?: number;
  huadian?: number;
  eyeSlant?: number;
  eyeWidth?: number;
  eyeHeight?: number;
  irisScale?: number;
  gazeX?: number;
  lidArch?: number;
  eyeTail?: number;
  browAngle?: number;
  browThickness?: number;
  browLift?: number;
  browArch?: number;
  frown?: boolean;
  smile?: number;
  smileAsymmetry?: number;
  mouthOpen?: number;
  noseWidth?: number;
  beard?: 'none' | 'general';
  bangStyle?: 'swept' | 'parted' | 'wild' | 'noble';
  sideLockLen?: number;
}

/**
 * 自研骨相级东方头颅 + 工笔丹凤五官 + 分层蓬松发底
 * lathe 角度约定：ang = π/2 为正脸 (+Z)，ang = 0/+π 为左右耳，ang = 3π/2 为后脑 (-Z)
 */
export function buildSculptedTangSongHead(
  api: FullHeroEngineApi,
  m: HeroModelApi['m'],
  h: ReturnType<FullHeroEngineApi['Gh']>,
  opts: SculptedHeadOpts,
): HeadObj {
  const { K, En, pt, bt } = api;
  const s = opts.headScale;
  const female = !!opts.female;
  const cy = h.d.headY + 0.2 * s;
  const headBone = h.J.head;

  // 骨相纵剖面 [dy, rx, rz, cz]（精致短下颌东方鹅蛋/剑眉俊颜，拒绝拉长马脸与对称卤蛋）
  const baseProfile: [number, number, number, number][] = female
    ? [
        [-0.222, 0.03, 0.034, 0.062], // 娇巧下巴尖
        [-0.185, 0.088, 0.094, 0.048], // 柔和下颌收束
        [-0.12, 0.146, 0.15, 0.025], // 柔美下颊
        [-0.04, 0.188, 0.19, 0.008], // 苹果肌/颧骨
        [0.042, 0.198, 0.204, -0.002], // 眼眶太阳穴
        [0.125, 0.194, 0.21, -0.014], // 额头与颅骨
        [0.192, 0.166, 0.184, -0.022], // 颅顶过渡
        [0.238, 0.104, 0.116, -0.025],
        [0.258, 0.02, 0.022, -0.024],
      ]
    : [
        [-0.228, 0.046, 0.045, 0.064], // 硬朗精悍下巴
        [-0.188, 0.108, 0.108, 0.048], // 下颌角棱角
        [-0.118, 0.16, 0.16, 0.024], // 坚毅脸颊
        [-0.036, 0.196, 0.198, 0.008], // 颧骨线
        [0.046, 0.206, 0.212, -0.002], // 眉弓
        [0.13, 0.202, 0.216, -0.014], // 额颞
        [0.196, 0.172, 0.19, -0.022],
        [0.242, 0.108, 0.12, -0.025],
        [0.262, 0.022, 0.024, -0.024],
      ];
  const jawWidth = opts.jawWidth ?? 1;
  const profile: [number, number, number, number][] = baseProfile.map(([dy, rx, rz, cz]) => [
    dy,
    rx * (1 + (jawWidth - 1) * clamp01((-0.04 - dy) / 0.1)),
    rz,
    cz,
  ]);

  const ring = (offsetY: number): [number, number, number] => {
    const dy = offsetY / s;
    if (dy <= profile[0][0]) {
      return [profile[0][1] * s, profile[0][2] * s, profile[0][3] * s];
    }
    for (let idx = 1; idx < profile.length; idx++) {
      if (dy <= profile[idx][0]) {
        const t = (dy - profile[idx - 1][0]) / (profile[idx][0] - profile[idx - 1][0]);
        const prev = profile[Math.max(0, idx - 2)];
        const next = profile[Math.min(profile.length - 1, idx + 1)];
        const left = profile[idx - 1], right = profile[idx];
        const span = right[0] - left[0];
        const smooth = (column: 1 | 2 | 3) => {
          const m0 = (right[column] - prev[column]) / (right[0] - prev[0]) * span;
          const m1 = (next[column] - left[column]) / (next[0] - left[0]) * span;
          const value = (2 * t ** 3 - 3 * t ** 2 + 1) * left[column] + (t ** 3 - 2 * t ** 2 + t) * m0 +
            (-2 * t ** 3 + 3 * t ** 2) * right[column] + (t ** 3 - t ** 2) * m1;
          return Math.max(Math.min(left[column], right[column]), Math.min(Math.max(left[column], right[column]), value)) * s;
        };
        return [smooth(1), smooth(2), smooth(3)];
      }
    }
    const last = profile[profile.length - 1];
    return [last[1] * s, last[2] * s, last[3] * s];
  };

  const noseWidth = opts.noseWidth ?? 1;
  const facialDepth = (x: number, y: number) => {
    const area = (cx: number, cy0: number, wx: number, wy: number) =>
      Math.exp(-(((Math.abs(x) - cx) / wx) ** 2 + ((y - cy0) / wy) ** 2));
    return -0.012 * area(0.077, 0, 0.043, 0.028) + // 眼窝
      0.009 * area(0.078, 0.039, 0.052, 0.024) + // 眉弓
      0.008 * area(0.108, -0.061, 0.052, 0.041) + // 颧骨
      0.018 * area(0, -0.025, 0.022 * noseWidth, 0.062) + // 鼻梁
      0.016 * area(0, -0.054, 0.025 * noseWidth, 0.019) + // 鼻尖
      0.004 * area(0, -0.105, 0.06, 0.03); // 口周
  };

  const surf = (x: number, y: number): number => {
    const r = ring(y - cy);
    const ratio = Math.min(0.99, Math.abs(x) / Math.max(0.001, r[0]));
    const front = Math.sqrt(Math.max(0, 1 - ratio * ratio));
    return r[2] + r[1] * front + facialDepth(x / s, (y - cy) / s) * s * front ** 3;
  };

  const skinShade = opts.skinShade ?? (female ? 0xe5b296 : 0xc28664);

  m.bone(headBone);
  m.paint(opts.skin, {
    c2: skinShade,
    ao: 0.86,
    ao2: 1.0,
    glow: 0.05,
    mat: K.skin,
    line: 0.24,
    by: (x: number, yVal: number, z: number, _r: number, _nx: number, ny: number) => {
      const eyeShadow = Math.exp(-(((Math.abs(x) / s - 0.077) / 0.045) ** 2 + ((yVal - cy) / s / 0.035) ** 2));
      return clamp01(0.24 - ny * 0.24 + (cy - yVal) * 0.42 + (z > 0 ? eyeShadow * 0.16 : 0));
    },
  });
  const rows = 40, segments = 56;
  const vertices: number[] = [], triangles: number[] = [];
  for (let row = 0; row <= rows; row++) {
    const dy = bt(profile[0][0], profile[profile.length - 1][0], row / rows);
    const [rx, rz, cz] = ring(dy * s);
    for (let column = 0; column < segments; column++) {
      const angle = column / segments * Math.PI * 2;
      const x = Math.cos(angle) * rx;
      const front = Math.sin(angle);
      vertices.push(x, cy + dy * s, cz + front * rz + facialDepth(x / s, dy) * s * Math.max(0, front) ** 3);
      if (row < rows) {
        const a = row * segments + column, b = (row + 1) * segments + column;
        const c = row * segments + (column + 1) % segments, d = (row + 1) * segments + (column + 1) % segments;
        triangles.push(a, b, c, c, b, d);
      }
    }
  }
  m.emit(vertices, triangles, null, 180);

  // 精致贴合双耳（含耳廓内影）
  m.sym(() => {
    const ey = cy - 0.02 * s;
    const earX = ring(-0.02 * s)[0] * 0.97;
    m.paint(opts.skin, { c2: skinShade, ao: 0.82, mat: K.skin, line: 0.35 });
    m.g(pt(earX, ey, -0.015 * s, 0, -18, 6), () => {
      m.ball(0, 0, 0, 0.02 * s, 0.048 * s, 0.028 * s, 1, 180);
    });
  });

  // ── 丹凤明眸与剑眉 / 柳叶眉（完全 line: 0，放大灵动比例，呈现国风工笔神韵） ──
  const eyeY = cy - 0.004 * s;
  const eyeX = (female ? 0.075 : 0.08) * s;
  const eyeRing = ring(eyeY - cy);
  const eyeZ = surf(eyeX, eyeY);
  const eyeYaw =
    Math.atan2(
      eyeX / (eyeRing[0] * eyeRing[0]),
      (eyeZ - eyeRing[2]) / (eyeRing[1] * eyeRing[1]),
    ) *
    (180 / Math.PI);
  const ew = (female ? 0.041 : 0.04) * (opts.eyeWidth ?? 1) * s;
  const eh = (female ? 0.019 : 0.017) * (opts.eyeHeight ?? 1) * s;
  const slant = opts.eyeSlant ?? (female ? 7 : 5);
  const irisScale = opts.irisScale ?? 1;
  const lidArch = opts.lidArch ?? 0.9;
  const eyeTail = opts.eyeTail ?? 0.24;

  m.sym((side) => {
    m.g(pt(eyeX, eyeY, eyeZ - 0.004 * s, 0, eyeYaw * 0.7, slant), () => {
      const gazeX = (opts.gazeX ?? 0) * s * side;
      // 杏仁形眼裂贴入眼窝，不再使用凸起的圆球眼白。
      m.paint(0xfff9ef, { c2: 0xe8dacc, line: 0, glow: 0.12 });
      m.sheet(14, 6, (u, v) => {
        const x = (u * 2 - 1) * ew;
        const arch = Math.sin(Math.PI * u) ** 0.72;
        const lower = -eh * 0.58 * arch;
        const upper = eh * (0.76 + 0.16 * u) * arch;
        return [x, bt(lower, upper, v), (0.006 + 0.003 * arch) * s];
      }, true, 180);
      // 温润深邃大瞳眸（水灵明亮）
      m.paint(opts.iris, { c2: 0x160f0e, glow: 0.14, line: 0 });
      m.ball(gazeX, 0, 0.009 * s, eh * 0.66 * irisScale, eh * 0.7 * irisScale, 0.0035 * s, 1);
      // 瞳孔
      m.paint(0x110c0c, { line: 0 });
      m.ball(gazeX, 0, 0.012 * s, eh * 0.32 * irisScale, eh * 0.36 * irisScale, 0.0025 * s, 1);
      // 双眼神高光点
      m.paint(0xffffff, { glow: 0.72, line: 0 });
      m.ball(gazeX + eh * 0.18 * irisScale, eh * 0.21 * irisScale, 0.014 * s, eh * 0.12, eh * 0.12, 0.0015 * s, 0);
      // 上睫毛墨线 + 凤尾轻扬
      m.paint(0x3d2928, { line: 0 });
      m.tube(
        [
          [-ew * 0.98, 0, 0.008 * s, 0.0012 * s],
          [-ew * 0.3, eh * lidArch * 0.78, 0.0112 * s, 0.0024 * s],
          [ew * 0.45, eh * lidArch * 0.8, 0.0104 * s, 0.0026 * s],
          [ew * 0.96, eh * 0.1, 0.0084 * s, 0.0018 * s],
          [ew * (1.02 + eyeTail * 0.45), eh * eyeTail * 0.5, 0.004 * s, 0.0008 * s],
        ],
        { seg: 5, up: [0, 0, 1] },
      );
      // 下眼睑与上眼褶分层，避免不同神态只靠眉毛区分。
      m.paint(skinShade, { c2: opts.skin, line: 0 });
      m.tube(
        [
          [-ew * 0.9, -eh * 0.16, 0.008 * s, 0.0015 * s],
          [-ew * 0.28, -eh * 0.92, 0.0105 * s, 0.002 * s],
          [ew * 0.55, -eh * 0.75, 0.0095 * s, 0.0017 * s],
          [ew * 1.02, -eh * 0.02, 0.006 * s, 0.001 * s],
        ],
        { seg: 4, up: [0, 0, 1] },
      );
      m.tube(
        [
          [-ew * 0.72, eh * 1.24, 0.006 * s, 0.001 * s],
          [-ew * 0.08, eh * (lidArch + 0.38), 0.009 * s, 0.0017 * s],
          [ew * 0.7, eh * (lidArch + 0.25), 0.006 * s, 0.001 * s],
        ],
        { seg: 4, up: [0, 0, 1] },
      );
      // 女角眼尾丹霞淡红晕染
      if (female) {
        m.paint(0xd6686e, { c2: opts.skin, line: 0, glow: 0.08 });
        m.ball(ew * 1.08, eh * 0.14, 0.0055 * s, 0.016 * s, 0.007 * s, 0.003 * s, 0);
      }
    });

    // 剑眉 / 柳叶黛眉
    const browY = eyeY + eh + ((female ? 0.02 : 0.018) + (opts.browLift ?? 0)) * s;
    const browZ = surf(eyeX, browY) + 0.002 * s;
    const bAng = opts.browAngle ?? (female ? 4 : 11);
    m.paint(opts.hair, { c2: opts.hairHi, line: 0 });
    m.g(pt(eyeX * 0.94, browY, browZ, -6, eyeYaw * 0.62, bAng), () => {
      const thick = (female ? 0.0038 : 0.0062) * (opts.browThickness ?? 1) * s;
      m.tube(
        [
          [-ew * 1.04, -0.003 * s, 0, thick * 0.9, thick * 0.65],
          [0, (opts.browArch ?? 0.006) * s, 0.002 * s, thick, thick * 0.72],
          [ew * 1.1, female ? -0.004 * s : 0.008 * s, -0.003 * s, thick * 0.44, thick * 0.44],
        ],
        { seg: 4 },
      );
    });

  });

  // 武将眉间收紧的两道肌理，让怒意在正面也能辨认。
  if (opts.frown) {
    m.paint(skinShade, { c2: opts.skin, line: 0 });
    m.sym(() => {
      m.tube(
        [
          [0.019 * s, eyeY + 0.038 * s, surf(0.019 * s, eyeY + 0.038 * s) + 0.003 * s, 0.0015 * s],
          [0.025 * s, eyeY + 0.059 * s, surf(0.025 * s, eyeY + 0.059 * s) + 0.003 * s, 0.002 * s],
          [0.022 * s, eyeY + 0.077 * s, surf(0.022 * s, eyeY + 0.077 * s) + 0.003 * s, 0.001 * s],
        ],
        { seg: 4 },
      );
    });
  }

  // 鼻梁由脸部网格连续塑形，鼻翼与鼻孔只做轻微层次。
  const noseTipY = eyeY - 0.052 * s;
  m.sym(() => {
    const x = 0.012 * noseWidth * s;
    m.paint(opts.skin, { c2: skinShade, ao: 0.94, mat: K.skin, line: 0 });
    m.ball(x, noseTipY, surf(x, noseTipY) + 0.001 * s, 0.008 * noseWidth * s, 0.006 * s, 0.004 * s, 1);
    m.paint(skinShade, { c2: opts.skin, line: 0 });
    m.ball(x * 0.82, noseTipY - 0.006 * s, surf(x * 0.82, noseTipY - 0.006 * s) + 0.003 * s, 0.003 * s, 0.0015 * s, 0.0015 * s, 0);
  });
  m.paint(opts.skin, { c2: skinShade, ao: 0.96, mat: K.skin, line: 0 });
  m.ball(0, noseTipY + 0.002 * s, surf(0, noseTipY + 0.002 * s), 0.014 * noseWidth * s, 0.01 * s, 0.006 * s, 2);

  // ── 饱满点绛樱桃唇 / 俊朗薄唇 ──
  const lipY = cy - 0.106 * s;
  const lipZ = surf(0, lipY) + 0.003 * s;
  const mw = (female ? 0.031 : 0.035) * s;
  const smile = opts.smile ?? (female ? 0.005 : 0.002);
  const smileAsymmetry = opts.smileAsymmetry ?? 0;
  if (opts.mouthOpen) {
    m.paint(0x6e3830, { c2: opts.lip, line: 0 });
    m.ball(0, lipY + 0.002 * s, lipZ + 0.002 * s, mw * 0.78, opts.mouthOpen * s, 0.003 * s, 2);
    m.paint(0xf7e9d7, { c2: opts.skin, line: 0, glow: 0.04 });
    m.ball(0, lipY + 0.003 * s, lipZ + 0.005 * s, mw * 0.55, opts.mouthOpen * 0.35 * s, 0.0018 * s, 1);
  }
  m.paint(opts.lip, { c2: opts.skin, line: 0 });
  m.tube(
    [
      [-mw, lipY + (smile - smileAsymmetry) * s, lipZ - 0.004 * s, 0.0025 * s],
      [-mw * 0.42, lipY + 0.004 * s, lipZ + 0.002 * s, (female ? 0.0062 : 0.005) * s],
      [0, lipY + 0.0025 * s, lipZ + 0.0035 * s, (female ? 0.0055 : 0.0045) * s],
      [mw * 0.42, lipY + 0.004 * s, lipZ + 0.002 * s, (female ? 0.0062 : 0.005) * s],
      [mw, lipY + (smile + smileAsymmetry) * s, lipZ - 0.004 * s, 0.0025 * s],
    ],
    { seg: 4, up: [0, 1, 0] },
  );
  m.ball(0, lipY - 0.004 * s, lipZ + 0.001 * s, mw * 0.72, (female ? 0.0045 : 0.0038) * s, 0.004 * s, 1);

  // ── 唐宋额间精细红金花钿（多瓣花形，零黑边） ──
  if (opts.huadian) {
    const hY = cy + 0.068 * s;
    const hZ = surf(0, hY) + 0.0045 * s;
    m.paint(opts.huadian, { c2: 0xffd584, glow: 0.28, line: 0 });
    m.g(pt(0, hY, hZ, -12, 0, 0), () => {
      m.ball(0, 0, 0, 0.0075 * s, 0.012 * s, 0.003 * s, 0);
      m.ball(0.01 * s, 0.004 * s, -0.001 * s, 0.0055 * s, 0.0075 * s, 0.0025 * s, 0);
      m.ball(-0.01 * s, 0.004 * s, -0.001 * s, 0.0055 * s, 0.0075 * s, 0.0025 * s, 0);
      m.ball(0, 0.015 * s, -0.001 * s, 0.0045 * s, 0.0065 * s, 0.0025 * s, 0);
    });
  }

  // ── 秦琼专属猛将络腮短颌须（贴合短下颌骨线，英武阳刚） ──
  if (opts.beard === 'general') {
    m.paint(opts.hair, { c2: opts.hairHi, mat: K.fur, pattern: En.fur, patternScale: 10, patternAmt: 0.35, line: 0 });
    m.sym(() => {
      m.tube(
        [
          [0.003 * s, lipY + 0.017 * s, surf(0.003 * s, lipY + 0.017 * s) + 0.004 * s, 0.0035 * s],
          [0.018 * s, lipY + 0.019 * s, surf(0.018 * s, lipY + 0.019 * s) + 0.004 * s, 0.005 * s],
          [0.035 * s, lipY + 0.011 * s, surf(0.035 * s, lipY + 0.011 * s) + 0.003 * s, 0.0035 * s],
          [0.046 * s, lipY + 0.004 * s, surf(0.046 * s, lipY + 0.004 * s) + 0.002 * s, 0.001 * s],
        ],
        { seg: 6 },
      );
    });
    for (let strand = -5; strand <= 5; strand++) {
      const x = strand * 0.005 * s;
      const startY = cy - (0.15 + Math.abs(strand) * 0.0015) * s;
      const endY = cy - (0.222 - Math.abs(strand) * 0.004) * s;
      m.tube([
        [x, startY, surf(x, startY) + 0.002 * s, 0.0017 * s],
        [x * 0.9, (startY + endY) / 2, surf(x * 0.9, (startY + endY) / 2) + 0.002 * s, 0.0015 * s],
        [x * 0.65, endY, surf(x * 0.65, endY) + 0.001 * s, 0.0004 * s],
      ], { seg: 4 });
    }
  }

  // ── 丰盈发底颅罩（前额发际线顺柔下压，彻底告别方帽高发际线！） ──
  const hairThick = (female ? 0.027 : 0.025) * s;
  const hairRows = [-0.19, -0.15, -0.11, -0.07, -0.03, 0.01, 0.05, 0.085, 0.115, 0.14, 0.17, 0.195, 0.22, 0.238, 0.262];
  const hairPts = hairRows.map((dy) => {
    const r = ring(dy * s);
    const crownBoost = dy > 0.15 ? hairThick * 0.95 : 0;
    const topCap = dy > 0.25 ? 0.35 : 1.0;
    return [cy + dy * s + crownBoost, r[0] + hairThick * topCap, r[1] + hairThick * topCap, 0, r[2] - hairThick * 0.3];
  });
  m.paint(opts.hair, {
    c2: opts.hairHi,
    gloss: 0.08,
    mat: K.fur,
    pattern: En.fur,
    patternScale: 12,
    patternAmt: 0.32,
    line: 0.45,
  });
  m.lathe(hairPts, {
    seg: 48,
    crease: 180,
    cap0: false,
    shape: (ang: number, idx: number) => {
      let dFront = Math.abs(ang - Math.PI / 2);
      if (dFront > Math.PI) dFront = Math.PI * 2 - dFront;
      const dy = hairRows[idx];
      const hairline =
        dFront < 0.72
          ? 0.115 - 0.028 * Math.cos((dFront / 0.72) * Math.PI * 0.5)
          : dFront < 1.36
            ? bt(0.087, -0.12, (dFront - 0.72) / 0.64)
            : -0.22;
      const transition = clamp01((dy - hairline + 0.02) / 0.06);
      return bt(0.76, 1.0 + (dFront > 1.35 ? 0.06 : 0), transition);
    },
  });

  // ── 蓬松自然分缕刘海与鬓角碎发（流畅大缕弧线，彻底告别额前条形码细杠！） ──
  const bang = opts.bangStyle ?? (female ? 'noble' : 'swept');
  const sideLen = opts.sideLockLen ?? (female ? 0.19 : 0.12);
  m.paint(opts.hair, {
    c2: opts.hairHi,
    gloss: 0.24,
    mat: K.fur,
    pattern: En.fur,
    patternScale: 14,
    patternAmt: 0.28,
    line: 0,
  });

  // 两侧丰盈蓬松垂鬓碎发（柔化脸廓，修饰瓜子/剑眉骨相）
  m.sym(() => {
    const rMid = ring(0.02 * s);
    const fx = rMid[0] * 0.96;
    m.tube(
      [
        [fx * 0.7, cy + 0.14 * s, 0.12 * s, 0.032 * s, 0.02 * s],
        [fx * 1.02, cy + 0.045 * s, 0.07 * s, 0.026 * s, 0.018 * s],
        [fx * 1.06, cy - 0.06 * s, 0.025 * s, 0.018 * s, 0.014 * s],
        [fx * 0.96, cy - sideLen * s, -0.02 * s, 0.006 * s, 0.005 * s],
      ],
      { seg: 6, crease: 180 },
    );
    // 两侧丰盈弧形八字偏分刘海（饱满自然，修饰额角）
    m.tube(
      [
        [0.012 * s, cy + 0.175 * s, surf(0.012 * s, cy + 0.175 * s) + 0.016 * s, 0.025 * s, 0.014 * s],
        [0.088 * s, cy + 0.128 * s, surf(0.088 * s, cy + 0.128 * s) + 0.018 * s, 0.021 * s, 0.012 * s],
        [0.148 * s, cy + 0.055 * s, surf(0.148 * s, cy + 0.055 * s) + 0.014 * s, 0.014 * s, 0.009 * s],
        [0.168 * s, cy - 0.03 * s, 0.035 * s, 0.005 * s, 0.004 * s],
      ],
      { seg: 6, crease: 180 },
    );
  });

  // 沿发际留下不对称的细缕，呼应立绘中被风吹散的额发。
  m.paint(opts.hair, { c2: opts.hairHi, mat: K.fur, line: 0 });
  const wisps = bang === 'wild'
    ? [[-0.045, 0.035, 0.035], [0.045, 0.12, 0.045], [-0.105, -0.145, 0.01]]
    : bang === 'swept'
      ? [[-0.05, 0.075, 0.055], [0.025, 0.13, 0.03], [-0.1, -0.15, 0.015]]
      : [[-0.055, -0.13, 0.02], [0.055, 0.145, 0.035]];
  for (const [startX, endX, endY] of wisps) {
    const topY = cy + 0.15 * s, tipY = cy + endY * s;
    const midX = bt(startX, endX, 0.55) * s, midY = cy + 0.095 * s;
    m.tube([
      [startX * s, topY, surf(startX * s, topY) + 0.018 * s, 0.008 * s, 0.005 * s],
      [midX, midY, surf(midX, midY) + 0.019 * s, 0.006 * s, 0.004 * s],
      [endX * s, tipY, surf(endX * s, tipY) + 0.009 * s, 0.001 * s, 0.001 * s],
    ], { seg: 6, crease: 180 });
  }

  // 男角豪放偏分大缕斜扫刘海（不居中遮额，改自然斜扫左右眉梢，飒爽帅气！）
  if (bang === 'swept' || bang === 'wild') {
    const sweepStrands: [number, number, number, number][] =
      bang === 'wild'
        ? [
            [-0.02, 0.11, 0.055, 0.028],
            [-0.08, -0.15, 0.02, 0.026],
            [0.06, 0.15, 0.015, 0.024],
          ]
        : [
            [-0.01, 0.12, 0.06, 0.026],
            [-0.07, -0.14, 0.03, 0.024],
          ];
    for (const [x0, x1, yEnd, r0] of sweepStrands) {
      const xm = mixVal(x0, x1, 0.55);
      const yTop = cy + 0.175 * s;
      const yMid = cy + 0.115 * s;
      const yLow = cy + yEnd * s;
      m.tube(
        [
          [x0 * s, yTop, surf(x0 * s, yTop) + 0.016 * s, r0 * s, r0 * 0.55 * s],
          [xm * s, yMid, surf(xm * s, yMid) + 0.02 * s, r0 * 0.85 * s, r0 * 0.5 * s],
          [x1 * s, yLow, surf(x1 * s, yLow) + 0.014 * s, 0.006 * s, 0.004 * s],
        ],
        { seg: 5, crease: 180 },
      );
    }
  }

  return { cy, s, ring, surf };
}

/**
 * 立体三维雕塑【鎏金吞口狮头兽面浮雕】（秦琼双肩、护心、腰扣、护膝核心特征）
 */
export function buildLionMedallion(
  api: HeroModelApi,
  m: HeroModelApi['m'],
  gold: number,
  goldHi: number,
  goldDark: number,
  scale = 1,
): void {
  const { K, pt } = api;
  const u = scale;

  // 外圈环绕怒张金狮卷鬣毛（10 簇立体发卷）
  m.paint(goldDark, { c2: gold, gloss: 0.95, mat: K.metal, line: 0.25 });
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2;
    const rx = Math.cos(ang) * 0.062 * u;
    const ry = Math.sin(ang) * 0.056 * u;
    m.g(pt(rx, ry, 0.006 * u, 0, 0, (ang * 180) / Math.PI), () => {
      m.ball(0, 0, 0, 0.025 * u, 0.019 * u, 0.018 * u, 0);
    });
  }

  // 狮头饱满主颅与双颊
  m.paint(gold, { c2: goldHi, gloss: 1, glow: 0.14, mat: K.metal, line: 0.2 });
  m.ball(0, 0.006 * u, 0.024 * u, 0.052 * u, 0.048 * u, 0.032 * u, 1);
  // 怒眉脊
  m.g(pt(-0.02 * u, 0.024 * u, 0.045 * u, 0, 0, -24), () => m.box(0, 0, 0, 0.032 * u, 0.012 * u, 0.014 * u, 0.003 * u));
  m.g(pt(0.02 * u, 0.024 * u, 0.045 * u, 0, 0, 24), () => m.box(0, 0, 0, 0.032 * u, 0.012 * u, 0.014 * u, 0.003 * u));
  // 宽狮鼻梁与狮鼻头
  m.ball(0, 0.002 * u, 0.052 * u, 0.02 * u, 0.016 * u, 0.016 * u, 0);
  // 双腮鼓吻
  m.ball(-0.022 * u, -0.016 * u, 0.046 * u, 0.018 * u, 0.014 * u, 0.015 * u, 0);
  m.ball(0.022 * u, -0.016 * u, 0.046 * u, 0.018 * u, 0.014 * u, 0.015 * u, 0);
  // 咆哮阔口与微露獠牙
  m.paint(0x28120c, { line: 0 });
  m.ball(0, -0.028 * u, 0.042 * u, 0.022 * u, 0.013 * u, 0.012 * u, 0);
  m.paint(0xfff4d4, { glow: 0.35, line: 0 });
  m.ball(-0.013 * u, -0.024 * u, 0.05 * u, 0.0045 * u, 0.008 * u, 0.004 * u, 0);
  m.ball(0.013 * u, -0.024 * u, 0.05 * u, 0.0045 * u, 0.008 * u, 0.004 * u, 0);
  // 威严炽金双目
  m.paint(0xffe17d, { c2: 0xffffff, glow: 0.55, line: 0 });
  m.ball(-0.02 * u, 0.012 * u, 0.05 * u, 0.008 * u, 0.007 * u, 0.006 * u, 0);
  m.ball(0.02 * u, 0.012 * u, 0.05 * u, 0.008 * u, 0.007 * u, 0.006 * u, 0);
}

/**
 * 立绘同款【带刺玄铁鎏金流星骨朵大锤】（秦琼双手重锤）
 * 默认沿 +Z 延伸（握柄在 z∈[-0.22, 0.14]，巨型玄铁球锤在 z=0.40）
 */
export function buildSpikedIronMace(
  api: HeroModelApi,
  m: HeroModelApi['m'],
  pal: Record<string, number>,
  scale = 1,
): void {
  const { K, En, pt } = api;
  const u = scale;

  // 缠革粗握柄 + 底部鎏金锤尾箍
  m.paint(pal.leatherDark ?? 0x261a14, { c2: pal.leather ?? 0x473024, mat: K.leather, line: 0.45 });
  m.tube(
    [
      [0, 0, -0.28 * u, 0.024 * u],
      [0, 0, 0.18 * u, 0.028 * u],
    ],
    { seg: 8 },
  );
  m.paint(pal.bronze ?? 0xdca944, { c2: pal.amber ?? 0xffe08a, gloss: 1, mat: K.metal, line: 0.35 });
  // 握柄尾座金箍
  m.tube(
    [
      [0, 0, -0.34 * u, 0.018 * u],
      [0, 0, -0.3 * u, 0.042 * u],
      [0, 0, -0.25 * u, 0.032 * u],
    ],
    { seg: 10, crease: 30 },
  );
  // 锤颈鎏金护环与莲托
  m.tube(
    [
      [0, 0, 0.14 * u, 0.032 * u],
      [0, 0, 0.18 * u, 0.054 * u],
      [0, 0, 0.23 * u, 0.092 * u],
    ],
    { seg: 12, crease: 26 },
  );

  // 巨型玄铁陨铁纹球形锤头
  const cz = 0.42 * u;
  const r = 0.21 * u;
  m.paint(pal.ironDark ?? 0x232730, {
    c2: pal.ironLight ?? 0x525a68,
    gloss: 0.78,
    mat: K.metal,
    pattern: En?.meteor ?? 8,
    patternScale: 9,
    patternAmt: 0.38,
    line: 0.72,
  });
  m.ball(0, 0, cz, r, r, r, 2, 180);

  // 锤头底/顶两枚浮雕鎏金兽面莲瓣托
  m.paint(pal.bronze ?? 0xdca944, { c2: pal.amber ?? 0xffe08a, gloss: 1, glow: 0.14, mat: K.metal, line: 0.2 });
  m.g(pt(0, 0, cz - r * 0.92, -90, 0, 0), () => m.lathe([[0, 0.088 * u], [0.022 * u, 0.072 * u], [0.032 * u, 0.02 * u]], { seg: 10 }));
  m.g(pt(0, 0, cz + r * 0.92, 90, 0, 0), () => m.lathe([[0, 0.088 * u], [0.022 * u, 0.072 * u], [0.035 * u, 0.015 * u]], { seg: 10 }));

  // 20 枚环绕放射状玄铁尖刺（赤道 8 枚 + 上下两环各 6 枚）
  m.paint(pal.steelDark ?? 0x626b7a, { c2: pal.steel ?? 0xdde4ed, gloss: 0.92, mat: K.metal, line: 0 });
  const spikeRings: [number, number][] = [
    [0, 8],
    [38, 6],
    [-38, 6],
  ];
  for (const [latDeg, count] of spikeRings) {
    const lat = (latDeg * Math.PI) / 180;
    const cosL = Math.cos(lat);
    const sinL = Math.sin(lat);
    for (let k = 0; k < count; k++) {
      const lon = ((k + (latDeg !== 0 ? 0.5 : 0)) / count) * Math.PI * 2;
      const dx = cosL * Math.cos(lon);
      const dy = cosL * Math.sin(lon);
      const dz = sinL;
      const bx = dx * (r * 0.92);
      const by = dy * (r * 0.92);
      const bz = cz + dz * (r * 0.92);
      const tx = dx * (r + 0.068 * u);
      const ty = dy * (r + 0.068 * u);
      const tz = cz + dz * (r + 0.068 * u);
      m.tube(
        [
          [bx, by, bz, 0.024 * u],
          [tx, ty, tz, 0.003 * u],
        ],
        { seg: 5, crease: 15 },
      );
    }
  }
}

/**
 * 破损撕裂感国风血红/水墨飘带披风（带锯齿破口尾缘与横向波澜）
 */
export function buildTatteredCape(
  api: FullHeroEngineApi,
  m: HeroModelApi['m'],
  pts: number[][],
  opts: {
    widthFn: (v: number) => number;
    axis?: [number, number, number];
    bow?: [number, number, number];
    nu?: number;
    nv?: number;
    tatterAmp?: number;
    seed?: number;
    wave?: number;
  },
): void {
  const { Li } = api;
  const nu = opts.nu ?? 8;
  const nv = opts.nv ?? 12;
  const axis = opts.axis ?? [1, 0, 0];
  const bow = opts.bow ?? [0, 0, -0.06];
  const tatterAmp = opts.tatterAmp ?? 0.22;
  const seed = opts.seed ?? 1.7;
  const wave = opts.wave ?? 0.22;
  // 一条窄带只需一道卷褶；宽披风可从肩头散出两到三道主褶。
  const pleats = Math.max(1, Math.min(3, Math.ceil(opts.widthFn(0.65) / 0.16)));

  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  let tx = last[0] - prev[0];
  let ty = last[1] - prev[1];
  let tz = last[2] - prev[2];
  const tLen = Math.hypot(tx, ty, tz) || 1;
  tx /= tLen;
  ty /= tLen;
  tz /= tLen;

  // 褶深沿布面的法向展开。斜挂在腰侧的飘带也能鼓起来。
  const first = pts[0];
  const dx = last[0] - first[0];
  const dy = last[1] - first[1];
  const dz = last[2] - first[2];
  const nx = axis[1] * dz - axis[2] * dy;
  const ny = axis[2] * dx - axis[0] * dz;
  const nz = axis[0] * dy - axis[1] * dx;
  const normalLength = Math.hypot(nx, ny, nz) || 1;
  const facing = nx * bow[0] + ny * bow[1] + nz * bow[2] < 0 ? -1 : 1;
  const depthScale = (0.20 + wave * 0.22) * facing / normalLength;

  m.sheet(
    Math.max(nu, pleats * 7),
    nv,
    (u, v) => {
      const p = Li(pts, v);
      const xNorm = (u - 0.5) * 2; // [-1, 1]
      const w = opts.widthFn(v);
      const arch = 1 - xNorm * xNorm;
      const ripple = wave * Math.sin(v * 8.5 + xNorm * 2.2 + seed) * v;
      const fold = clothFoldDepth(u, v, pleats, seed) * w * depthScale;
      const edge = xNorm ** 4 * v * v;
      const spread = xNorm * w * (1 - 0.075 * edge);
      // 尾缘参差破损裂口（多频正弦叠加）
      let tailExt = -w * 0.18 * edge;
      if (v > 0.68) {
        const tv = (v - 0.68) / 0.32;
        const jag =
          0.5 +
          0.32 * Math.sin(u * Math.PI * 5 + seed) +
          0.22 * Math.cos(u * Math.PI * 9 - seed * 1.3);
        tailExt += tv * tv * (jag - 0.45) * tatterAmp;
      }
      return [
        p[0] + axis[0] * spread + bow[0] * (arch + ripple) + nx * fold + tx * tailExt,
        p[1] + axis[1] * spread + bow[1] * (arch + ripple) + ny * fold + ty * tailExt,
        p[2] + axis[2] * spread + bow[2] * (arch + ripple) + nz * fold + tz * tailExt,
      ];
    },
    true,
    180,
  );
}

/**
 * 唐宋华美大广袖构建器（宽大垂坠袖袋 + 滚金锦边 + 露白内袖，sym 内单侧正坐标调用）
 */
export function buildWideSleeve(
  api: FullHeroEngineApi,
  m: HeroModelApi['m'],
  h: ReturnType<FullHeroEngineApi['Gh']>,
  side: number,
  opts: {
    outer: number;
    outerDark: number;
    trim: number;
    trimHi: number;
    inner: number;
    innerShade: number;
    flare?: number;
    drop?: number;
    pattern?: number;
    trimWidth?: number;
  },
): void {
  const { K, En } = api;
  const s = h.d;
  const e = h.J;
  const sx = s.shoulderX;
  const armBone = side > 0 ? e.armL : e.armR;
  const foreBone = side > 0 ? e.foreL : e.foreR;
  const flare = opts.flare ?? 0.145;
  const drop = opts.drop ?? 0.085;
  const pat = opts.pattern ?? En.weave;
  const trimW = opts.trimWidth ?? 0.045;

  // 顺滑溜肩过渡罩（柔和衔接胸肩至上臂，彻底消除方肩断层感！）
  const clavBone = side > 0 ? e.clavL : e.clavR;
  m.bone(clavBone).paint(opts.outer, {
    c2: opts.outerDark,
    mat: K.cloth,
    pattern: pat,
    patternScale: 10,
    patternAmt: 0.28,
    line: 0.5,
  });
  m.tube(
    [
      [sx * 0.42, s.shoulderY + 0.055, 0, 0.072, 0.088],
      [sx * 0.78, s.shoulderY + 0.025, 0, 0.082, 0.094],
      [sx, s.shoulderY - 0.02, 0, 0.084, 0.092],
    ],
    { seg: 12, up: [0, 1, 0], crease: 180 },
  );

  // 上臂宽松广袖（柔顺收顶进溜肩）
  m.bone(armBone).paint(opts.outer, {
    c2: opts.outerDark,
    mat: K.cloth,
    pattern: pat,
    patternScale: 10,
    patternAmt: 0.28,
    line: 0.55,
  });
  m.ball(sx, s.shoulderY - 0.01, 0, 0.084, 0.082, 0.088, 1);
  m.lathe(
    [
      [s.elbowY - 0.03, 0.104, 0.118, sx, -0.015],
      [mixVal(s.elbowY, s.shoulderY, 0.5), 0.092, 0.1, sx, -0.008],
      [s.shoulderY + 0.005, 0.078, 0.082, sx * 0.96, 0],
    ],
    { seg: 14, cap0: false, cap1: false },
  );

  // 前臂大幅垂坠广袖袖袋（-Z 后下方大幅垂摆，还原唐宋长袖飘逸廓形）
  m.bone(foreBone).paint(opts.outer, {
    c2: opts.outerDark,
    mat: K.cloth,
    pattern: pat,
    patternScale: 10,
    patternAmt: 0.3,
    line: 0.6,
  });
  m.lathe(
    [
      [s.wristY - drop, flare, flare * 1.32, sx + 0.012, -drop * 0.52],
      [s.wristY + 0.02, flare * 0.88, flare * 1.12, sx + 0.008, -drop * 0.35],
      [s.elbowY + 0.03, 0.088, 0.102, sx, -0.01],
    ],
    {
      seg: 16,
      cap0: false,
      shape: (ang: number, idx: number) =>
        1 + (idx === 0 ? 0.07 * Math.sin(ang * 5) : 0.03 * Math.sin(ang * 5)),
    },
  );

  // 袖口厚重织金/朱红宽锦边
  m.paint(opts.trim, {
    c2: opts.trimHi,
    mat: K.cloth,
    pattern: En.weave,
    patternScale: 14,
    patternAmt: 0.38,
    line: 0.35,
  });
  m.lathe(
    [
      [s.wristY - drop - 0.006, flare * 1.03, flare * 1.35, sx + 0.012, -drop * 0.52],
      [s.wristY - drop + trimW, flare * 0.99, flare * 1.28, sx + 0.011, -drop * 0.46],
    ],
    {
      seg: 16,
      cap0: false,
      cap1: false,
      shape: (ang: number) => 1 + 0.07 * Math.sin(ang * 5),
    },
  );

  // 袖筒内露出的象牙白里袖
  m.paint(opts.inner, { c2: opts.innerShade, mat: K.cloth, line: 0.25 });
  m.lathe(
    [
      [s.wristY - drop * 0.62, flare * 0.72, flare * 0.88, sx + 0.005, -drop * 0.28],
      [s.wristY + 0.04, 0.062, 0.068, sx, 0],
    ],
    { seg: 12, cap0: false, cap1: false },
  );
}

/**
 * 盛唐/北宋立体花簇金步摇（梅花/海棠/凤冠珠花）
 */
export function buildBlossomHairpin(
  api: HeroModelApi,
  m: HeroModelApi['m'],
  petalCol: number,
  petalHi: number,
  gold: number,
  scale = 1,
): void {
  const { K, pt } = api;
  const u = scale;
  // 五瓣立体花朵
  m.paint(petalCol, { c2: petalHi, glow: 0.25, mat: K.cloth, line: 0 });
  for (let p = 0; p < 5; p++) {
    const a = (p / 5) * Math.PI * 2;
    m.g(pt(Math.cos(a) * 0.022 * u, Math.sin(a) * 0.022 * u, 0, 0, 0, (a * 180) / Math.PI), () => {
      m.ball(0, 0, 0, 0.018 * u, 0.014 * u, 0.008 * u, 0);
    });
  }
  // 鎏金花蕊
  m.paint(gold, { c2: 0xfff0b0, gloss: 1, glow: 0.22, mat: K.metal, line: 0 });
  m.ball(0, 0, 0.007 * u, 0.011 * u, 0.011 * u, 0.008 * u, 0);
}

/**
 * 长垂耳坠（绿松石/朱红珠 + 金丝，sym 内单侧正坐标调用）
 */
export function buildDropEarring(
  api: HeroModelApi,
  m: HeroModelApi['m'],
  x: number,
  y: number,
  z: number,
  gemHex: number,
  goldHex: number,
  scale = 1,
): void {
  const { K } = api;
  const u = scale;
  m.paint(goldHex, { c2: 0xfff0b0, gloss: 1, mat: K.metal, line: 0 });
  m.tube([[x, y, z, 0.003 * u], [x, y - 0.048 * u, z + 0.004 * u, 0.0025 * u]], { seg: 4 });
  m.ball(x, y - 0.016 * u, z + 0.002 * u, 0.007 * u, 0.007 * u, 0.007 * u, 0);
  m.paint(gemHex, { c2: 0xffffff, glow: 0.3, gloss: 0.9, mat: K.crystal, line: 0 });
  m.ball(x, y - 0.036 * u, z + 0.003 * u, 0.009 * u, 0.013 * u, 0.009 * u, 0);
  m.paint(goldHex, { c2: 0xffe49c, gloss: 1, mat: K.metal, line: 0 });
  m.ball(x, y - 0.056 * u, z + 0.004 * u, 0.006 * u, 0.01 * u, 0.006 * u, 0);
}

/**
 * 精美双节醉翁酒葫芦 + 朱红穗（苏轼腰间标志性挂件）
 */
export function buildWineGourd(
  api: HeroModelApi,
  m: HeroModelApi['m'],
  scale = 1,
): void {
  const { K, En } = api;
  const u = scale;
  m.paint(0x8c5a32, { c2: 0xc9965c, gloss: 0.52, mat: K.leather, pattern: En?.vein ?? 7, patternScale: 8, patternAmt: 0.2, line: 0.4 });
  m.lathe(
    [
      [-0.125 * u, 0.018 * u],
      [-0.105 * u, 0.056 * u],
      [-0.068 * u, 0.068 * u],
      [-0.025 * u, 0.042 * u],
      [0.0, 0.024 * u],
      [0.032 * u, 0.044 * u],
      [0.065 * u, 0.038 * u],
      [0.09 * u, 0.016 * u],
      [0.108 * u, 0.012 * u],
    ],
    { seg: 12, crease: 180 },
  );
  // 葫芦塞
  m.paint(0x4a2614, { mat: K.leather, line: 0 });
  m.ball(0, 0.114 * u, 0, 0.014 * u, 0.012 * u, 0.014 * u, 0);
  // 腰绳与橙红流苏穗
  m.paint(0xc94228, { c2: 0xeb7844, mat: K.cloth, line: 0.2 });
  m.torus(0.028 * u, 0.008 * u, 0.008 * u, 10, 4);
  m.tube([[0.026 * u, 0, 0.01 * u, 0.006 * u], [0.042 * u, -0.095 * u, 0.025 * u, 0.005 * u]], { seg: 4 });
  m.tube([[0.042 * u, -0.095 * u, 0.025 * u, 0.015 * u], [0.052 * u, -0.175 * u, 0.032 * u, 0.026 * u]], { seg: 6 });
}
