/**
 * companions.ts — 六大唐宋名士伴生灵宠精雕版（配色与立绘新色盘统一，站位优雅外移不遮挡主体）
 */

import { buildFeatheredWing } from '../tangsongWings';
import {
  clamp01,
  type FullHeroEngineApi,
  type HeroAnimState,
  type HeroCompanionMeta,
  type HeroModelApi,
  type HeroPoseWriter,
} from './types';

export function addHeroCompanion(
  m: HeroModelApi['m'],
  rig: ReturnType<FullHeroEngineApi['Gh']>['rig'],
  rootBone: number,
  K: Record<string, number>,
  En: Record<string, number>,
  pt: HeroModelApi['pt'],
  kind: HeroCompanionMeta['kind'],
): HeroCompanionMeta {
  const isBird = kind === 'crane' || kind === 'phoenix' || kind === 'hawk';
  // 站位外移至英雄侧后方，既保留完整伴飞灵动感，又绝不遮挡人物主体与衣袂剪影
  const bx =
    kind === 'phoenix'
      ? -0.76
      : kind === 'lion'
        ? 0.84
        : kind === 'crane'
          ? 0.78
          : kind === 'hawk'
            ? 0.76
            : 0.72;
  const by = isBird ? 1.72 : 0.36;
  const bz = isBird ? -0.34 : -0.26;

  const petRoot = rig.add('petRoot', rootBone, bx, by, bz);

  if (isBird) {
    const wingL = rig.add('petWingL', petRoot, bx + 0.04, by + 0.02, bz + 0.01);
    const wingR = rig.add('petWingR', petRoot, bx - 0.04, by + 0.02, bz + 0.01);
    const tail = rig.add('petTail', petRoot, bx, by - 0.02, bz - 0.14);
    const addWings = (span: number, chord: number, rise: number, sweep: number) => {
      const geometry = buildFeatheredWing(span, chord, rise, sweep);
      for (const side of [1, -1]) {
        m.bone(side > 0 ? wingL : wingR);
        m.g(pt(bx + side * 0.04, by + 0.02, bz + 0.05, 0, 0, 0, side, 1, 1), () =>
          m.emit(geometry.positions, geometry.indices, geometry.shades, 180),
        );
      }
    };
    const addTailFan = (rootWidth: number, flare: number, rootY: number, rootZ: number, drop: number, length: number) => {
      m.sheet(16, 5, (u, v) => {
        const feather = 0.5 + 0.5 * Math.cos(u * Math.PI * 8);
        return [
          bx + (u - 0.5) * (rootWidth + v * flare),
          by + rootY - v * drop + 0.012 * v * Math.sin(u * Math.PI * 8),
          bz + rootZ - v * length + 0.014 * v ** 4 * (1 - feather),
        ];
      }, true, 180);
    };

    if (kind === 'crane') {
      // 苏轼：水墨丹顶白仙鹤（墨青羽尖呼应苏轼水墨竹袍）
      m.bone(petRoot).paint(0xf7f5ef, { c2: 0xd5dfe2, mat: K.fur, pattern: En.fur, patternScale: 10, patternAmt: 0.25, line: 0.35 });
      m.tube(
        [
          [bx, by - 0.025, bz - 0.11, 0.034, 0.032],
          [bx, by, bz, 0.064, 0.06],
          [bx, by + 0.03, bz + 0.11, 0.042, 0.042],
          [bx, by + 0.11, bz + 0.14, 0.022, 0.022],
          [bx, by + 0.19, bz + 0.12, 0.018, 0.018],
          [bx, by + 0.24, bz + 0.15, 0.026, 0.028],
        ],
        { seg: 10 },
      );
      m.paint(0xcf3428, { glow: 0.22, line: 0 });
      m.ball(bx, by + 0.268, bz + 0.15, 0.02, 0.015, 0.022, 0);
      m.paint(0x1b1e24, { line: 0 });
      m.ball(bx + 0.018, by + 0.248, bz + 0.17, 0.007, 0.007, 0.007, 0);
      m.ball(bx - 0.018, by + 0.248, bz + 0.17, 0.007, 0.007, 0.007, 0);
      m.paint(0x28323c, { c2: 0xd9a84c, mat: K.leather, line: 0.2 });
      m.tube([[bx, by + 0.238, bz + 0.175, 0.012], [bx, by + 0.228, bz + 0.275, 0.003]], { seg: 5 });
      m.paint(0x2a313a, { mat: K.leather, line: 0 });
      m.tube([[bx + 0.022, by - 0.045, bz - 0.04, 0.007], [bx + 0.028, by - 0.15, bz - 0.18, 0.004]], { seg: 4 });
      m.tube([[bx - 0.022, by - 0.045, bz - 0.04, 0.007], [bx - 0.028, by - 0.15, bz - 0.18, 0.004]], { seg: 4 });
      m.paint(0xf7f5ef, {
        c2: 0x1d2530,
        by: (x: number, _y: number, _z: number, shade: number) => clamp01(Math.max(0, (Math.abs(x - bx) - 0.14) / 0.18) + shade * 0.55),
        mat: K.fur, pattern: En.vein, patternScale: 8, patternAmt: 0.25, line: 0.35,
      });
      addWings(0.33, 0.18, 0.065, 0.08);
      m.bone(tail).paint(0x1e2530, { c2: 0xf4f2ec, mat: K.fur, line: 0.3 });
      addTailFan(0.055, 0.08, -0.01, -0.11, 0.045, 0.16);
    } else if (kind === 'phoenix') {
      // 刘娥：皇室朱金点翠金凤雏（正朱红+鎏金尾羽，呼应刘娥大宋礼服）
      m.bone(petRoot).paint(0xb52620, { c2: 0xe8b84e, mat: K.fur, pattern: En.vein, patternScale: 8, patternAmt: 0.3, line: 0.35 });
      m.tube(
        [
          [bx, by - 0.02, bz - 0.1, 0.036, 0.034],
          [bx, by + 0.01, bz + 0.01, 0.064, 0.058],
          [bx, by + 0.08, bz + 0.1, 0.035, 0.035],
          [bx, by + 0.165, bz + 0.13, 0.033, 0.035],
        ],
        { seg: 10 },
      );
      m.paint(0xf2c556, { c2: 0xfff0b2, glow: 0.28, gloss: 0.95, mat: K.metal, line: 0 });
      m.tube([[bx, by + 0.165, bz + 0.16, 0.013], [bx, by + 0.155, bz + 0.22, 0.003]], { seg: 5 });
      m.tube([[bx, by + 0.195, bz + 0.13, 0.009], [bx, by + 0.265, bz + 0.05, 0.005], [bx, by + 0.28, bz - 0.05, 0.002]], { seg: 4 });
      m.paint(0xa6201c, {
        c2: 0xf4cc62, glow: 0.16,
        by: (x: number, _y: number, _z: number, shade: number) => clamp01((Math.abs(x - bx) - 0.05) / 0.26 - shade * 0.35),
        mat: K.fur, pattern: En.vein, patternScale: 9, patternAmt: 0.32, line: 0.3,
      });
      addWings(0.31, 0.17, 0.075, 0.10);
      m.bone(tail).paint(0xf0c250, { c2: 0xb82420, glow: 0.22, mat: K.fur, line: 0.2 });
      for (const ang of [-0.22, 0, 0.22]) {
        m.tube(
          [
            [bx, by - 0.02, bz - 0.1, 0.014, 0.005],
            [bx + ang * 0.18, by - 0.045, bz - 0.25, 0.02, 0.005],
            [bx + ang * 0.28, by - 0.015, bz - 0.4, 0.007, 0.003],
          ],
          { seg: 4, up: [0, 1, 0] },
        );
      }
    } else {
      // 辛弃疾：墨羽赤金海东青（玄墨锐翼 + 朱红尾尖 + 金睛）
      m.bone(petRoot).paint(0x1b1d24, { c2: 0x4b515e, mat: K.fur, pattern: En.fur, patternScale: 10, patternAmt: 0.3, line: 0.35 });
      m.tube(
        [
          [bx, by - 0.025, bz - 0.1, 0.036, 0.034],
          [bx, by + 0.01, bz + 0.01, 0.068, 0.06],
          [bx, by + 0.06, bz + 0.095, 0.048, 0.046],
          [bx, by + 0.125, bz + 0.12, 0.04, 0.042],
        ],
        { seg: 10 },
      );
      m.paint(0xeae3d5, { mat: K.fur, line: 0 });
      m.ball(bx, by - 0.008, bz + 0.028, 0.046, 0.042, 0.044, 0);
      m.paint(0xe0a23a, { glow: 0.28, gloss: 0.9, mat: K.metal, line: 0 });
      m.tube([[bx, by + 0.125, bz + 0.158, 0.016], [bx, by + 0.095, bz + 0.21, 0.003]], { seg: 5 });
      m.paint(0xffb838, { glow: 0.55, line: 0 });
      m.ball(bx + 0.024, by + 0.135, bz + 0.145, 0.009, 0.009, 0.009, 0);
      m.ball(bx - 0.024, by + 0.135, bz + 0.145, 0.009, 0.009, 0.009, 0);
      m.paint(0x191b22, {
        c2: 0x9e241e,
        by: (x: number, _y: number, _z: number, shade: number) => clamp01((Math.abs(x - bx) - 0.2) / 0.15 + shade * 0.3),
        mat: K.fur, pattern: En.vein, patternScale: 9, patternAmt: 0.28, line: 0.35,
      });
      addWings(0.34, 0.16, 0.055, 0.14);
      m.bone(tail).paint(0x232630, { c2: 0xa82820, mat: K.fur, line: 0.25 });
      addTailFan(0.075, 0.08, -0.025, -0.1, 0.04, 0.17);
    }

    return { kind, root: petRoot, a: wingL, b: wingR, c: tail };
  }

  // 踩祥云伴生小瑞兽（狮、狐、狸奴）
  const head = rig.add('petHead', petRoot, bx, by + 0.14, bz + 0.075);
  const tail = rig.add('petTail', petRoot, bx, by + 0.075, bz - 0.11);
  const dummy = rig.add('petAux', petRoot, bx, by, bz);

  // 底层祥云托座（配色同步各英雄立绘）
  const cloudHex = kind === 'lion' ? 0xe8c77b : kind === 'cat' ? 0xf5ddd2 : 0xf7e6d4;
  m.bone(petRoot).paint(cloudHex, { c2: 0xffffff, glow: 0.14, mat: K.cloth, line: 0.3 });
  m.ball(bx, by - 0.02, bz, 0.13, 0.04, 0.145, 1);
  m.ball(bx + 0.082, by - 0.015, bz + 0.035, 0.076, 0.034, 0.076, 1);
  m.ball(bx - 0.082, by - 0.015, bz - 0.028, 0.076, 0.034, 0.076, 1);

  if (kind === 'lion') {
    // 秦琼：玄金赤缨镇岳小瑞狮
    m.bone(petRoot).paint(0xdca840, { c2: 0x8f5b18, gloss: 0.65, mat: K.fur, pattern: En.fur, patternScale: 10, patternAmt: 0.28, line: 0.4 });
    m.tube([[bx, by + 0.075, bz - 0.1, 0.062, 0.058], [bx, by + 0.085, bz + 0.038, 0.076, 0.07]], { seg: 10 });
    for (const sgn of [-1, 1]) {
      m.ball(bx + sgn * 0.042, by + 0.022, bz + 0.072, 0.024, 0.018, 0.03, 0);
    }
    m.paint(0xa8201a, { mat: K.cloth, line: 0.2 });
    m.g(pt(bx, by + 0.105, bz + 0.038, 80, 0, 0), () => m.torus(0.072, 0.013, 0.013, 10, 4));
    m.paint(0xffe188, { gloss: 1, glow: 0.25, mat: K.metal, line: 0 });
    m.ball(bx, by + 0.062, bz + 0.098, 0.022, 0.022, 0.022, 0);

    m.bone(head).paint(0xebb84c, { c2: 0xb86e1c, mat: K.fur, line: 0.35 });
    m.ball(bx, by + 0.16, bz + 0.075, 0.08, 0.075, 0.08, 1);
    m.paint(0xa8201a, { c2: 0xf4c75e, mat: K.fur, line: 0.2 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      m.ball(bx + Math.cos(a) * 0.072, by + 0.16 + Math.sin(a) * 0.072, bz + 0.05, 0.029, 0.029, 0.024, 0);
    }
    m.paint(0x161210, { line: 0 });
    m.ball(bx + 0.033, by + 0.175, bz + 0.145, 0.014, 0.014, 0.011, 0);
    m.ball(bx - 0.033, by + 0.175, bz + 0.145, 0.014, 0.014, 0.011, 0);
    m.paint(0xffffff, { glow: 0.55, line: 0 });
    m.ball(bx + 0.037, by + 0.18, bz + 0.154, 0.0055, 0.0055, 0.0045, 0);
    m.ball(bx - 0.037, by + 0.18, bz + 0.154, 0.0055, 0.0055, 0.0045, 0);

    m.bone(tail).paint(0xd49630, { c2: 0xa8201a, mat: K.fur, line: 0.25 });
    m.tube([[bx, by + 0.085, bz - 0.1, 0.015], [bx, by + 0.17, bz - 0.185, 0.02], [bx, by + 0.235, bz - 0.15, 0.03]], { seg: 6 });
  } else if (kind === 'fox') {
    // 文成公主：朱红金铃盛唐踏云小雪狐
    m.bone(petRoot).paint(0xfaf7f0, { c2: 0xe8dfd0, mat: K.fur, pattern: En.fur, patternScale: 12, patternAmt: 0.22, line: 0.35 });
    m.tube([[bx, by + 0.056, bz - 0.1, 0.05, 0.046], [bx, by + 0.075, bz + 0.038, 0.06, 0.054]], { seg: 10 });
    for (const sgn of [-1, 1]) {
      m.ball(bx + sgn * 0.035, by + 0.018, bz + 0.068, 0.018, 0.015, 0.024, 0);
    }
    m.paint(0xc43624, { c2: 0xe6a844, mat: K.cloth, line: 0.2 });
    m.g(pt(bx, by + 0.095, bz + 0.038, 80, 0, 0), () => m.torus(0.058, 0.011, 0.011, 10, 4));
    m.paint(0xffe084, { gloss: 1, glow: 0.25, mat: K.metal, line: 0 });
    m.ball(bx, by + 0.052, bz + 0.09, 0.016, 0.016, 0.016, 0);

    m.bone(head).paint(0xfffdf8, { c2: 0xefe6d8, mat: K.fur, line: 0.35 });
    m.ball(bx, by + 0.152, bz + 0.075, 0.068, 0.062, 0.072, 1);
    m.ball(bx, by + 0.138, bz + 0.136, 0.031, 0.024, 0.038, 0);
    for (const sgn of [-1, 1]) {
      m.paint(0xfffcf6, { c2: 0xd44a32, mat: K.fur, line: 0.25 });
      m.g(pt(bx + sgn * 0.043, by + 0.21, bz + 0.06, 0, 0, -sgn * 22), () => m.crystal(0.022, 0.068, 5, 0.65, 0.1));
      m.paint(0xea8b84, { line: 0 });
      m.g(pt(bx + sgn * 0.043, by + 0.205, bz + 0.067, 0, 0, -sgn * 22), () => m.crystal(0.012, 0.042, 4, 0.65, 0.1));
    }
    m.paint(0x4a241a, { line: 0 });
    m.ball(bx + 0.03, by + 0.164, bz + 0.136, 0.012, 0.012, 0.009, 0);
    m.ball(bx - 0.03, by + 0.164, bz + 0.136, 0.012, 0.012, 0.009, 0);

    m.bone(tail).paint(0xfffdf8, { c2: 0xd94832, by: (_x: number, yVal: number) => clamp01((yVal - by - 0.14) / 0.08), mat: K.fur, line: 0.25 });
    for (const ang of [-0.052, 0.052]) {
      m.tube(
        [
          [bx, by + 0.065, bz - 0.095, 0.018],
          [bx + ang * 1.4, by + 0.132, bz - 0.19, 0.04],
          [bx + ang * 1.85, by + 0.198, bz - 0.228, 0.013],
        ],
        { seg: 6 },
      );
    }
  } else {
    // 花蕊夫人：大宋宫廷奶油三花小狸奴（绯红海棠金铃项圈）
    m.bone(petRoot).paint(0xfaf2e4, { c2: 0xd98442, by: (x: number) => clamp01((x - bx) * 6 + 0.4), mat: K.fur, line: 0.35 });
    m.tube([[bx, by + 0.056, bz - 0.095, 0.052, 0.048], [bx, by + 0.075, bz + 0.038, 0.06, 0.056]], { seg: 10 });
    for (const sgn of [-1, 1]) {
      m.ball(bx + sgn * 0.035, by + 0.018, bz + 0.066, 0.019, 0.015, 0.023, 0);
    }
    m.paint(0xb3262e, { mat: K.cloth, line: 0.2 });
    m.g(pt(bx, by + 0.095, bz + 0.038, 80, 0, 0), () => m.torus(0.058, 0.011, 0.011, 10, 4));
    m.paint(0xffe18a, { gloss: 1, glow: 0.25, mat: K.metal, line: 0 });
    m.ball(bx, by + 0.056, bz + 0.088, 0.016, 0.016, 0.016, 0);

    m.bone(head).paint(0xfaf2e4, { c2: 0x262024, by: (x: number) => clamp01((bx - x) * 7 + 0.2), mat: K.fur, line: 0.35 });
    m.ball(bx, by + 0.152, bz + 0.07, 0.068, 0.063, 0.067, 1);
    for (const sgn of [-1, 1]) {
      m.paint(sgn > 0 ? 0xd9803c : 0x251f23, { mat: K.fur, line: 0.25 });
      m.g(pt(bx + sgn * 0.044, by + 0.208, bz + 0.06, 0, 0, -sgn * 20), () => m.crystal(0.02, 0.056, 4, 0.7, 0.1));
      m.paint(0xf296a8, { line: 0 });
      m.g(pt(bx + sgn * 0.044, by + 0.204, bz + 0.065, 0, 0, -sgn * 20), () => m.crystal(0.011, 0.034, 4, 0.7, 0.1));
    }
    m.paint(0xc88a28, { glow: 0.22, line: 0 });
    m.ball(bx + 0.03, by + 0.164, bz + 0.134, 0.014, 0.014, 0.009, 0);
    m.ball(bx - 0.03, by + 0.164, bz + 0.134, 0.014, 0.014, 0.009, 0);
    m.paint(0xeb7e8f, { line: 0 });
    m.ball(bx, by + 0.144, bz + 0.14, 0.007, 0.005, 0.005, 0);

    m.bone(tail).paint(0xd9803c, { c2: 0x262024, mat: K.fur, line: 0.25 });
    m.tube([[bx, by + 0.066, bz - 0.085, 0.015], [bx, by + 0.17, bz - 0.16, 0.018], [bx + 0.028, by + 0.235, bz - 0.12, 0.015]], { seg: 6 });
  }

  return { kind, root: petRoot, a: head, b: tail, c: dummy };
}

export function animateHeroCompanion(
  pose: HeroPoseWriter,
  pet: HeroCompanionMeta | undefined,
  st: HeroAnimState,
): void {
  if (!pet) return;
  if (st.anim === 'dead') {
    const s = Math.max(0.001, 1 - Math.min(1, st.t * 1.4));
    pose.scale(pet.root, s);
    pose.pos(pet.root, 0, -0.35 * (1 - s), 0);
    return;
  }
  const active =
    st.anim === 'attack' || st.anim === 'spin' || st.anim === 'dash' || st.anim.startsWith('cast_');
  const spd = active ? 9.5 : 3.2;
  const ph = st.time * spd + st.seed * 6.28;
  const bob = Math.sin(ph * 0.72) * (active ? 0.085 : 0.048);

  if (pet.kind === 'crane' || pet.kind === 'phoenix' || pet.kind === 'hawk') {
    const flap = Math.sin(ph) * (active ? 34 : 22) + 8;
    pose.pos(pet.root, Math.cos(ph * 0.4) * 0.03, bob, Math.sin(ph * 0.4) * 0.03);
    pose.rot(pet.root, active ? -10 : Math.sin(ph * 0.5) * 4, Math.cos(ph * 0.35) * 6, 0);
    pose.rot(pet.a, 0, 0, flap);
    pose.rot(pet.b, 0, 0, -flap);
    pose.rot(pet.c, Math.sin(ph * 0.8) * 10 - 6, 0, 0);
  } else {
    const bounce = Math.abs(Math.sin(ph * 0.65)) * (active ? 0.09 : 0.032);
    pose.pos(pet.root, 0, bounce, 0);
    pose.rot(pet.root, active ? -6 : 0, Math.sin(ph * 0.3) * 5, 0);
    pose.rot(pet.a, Math.sin(ph * 0.55) * 6 + (active ? -10 : 0), Math.sin(ph * 0.35) * 14, Math.cos(ph * 0.4) * 5);
    pose.rot(pet.b, Math.sin(ph * 1.1) * 12, Math.sin(ph * 1.4) * 28, Math.cos(ph * 1.2) * 8);
  }
}
