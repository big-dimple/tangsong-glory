/**
 * tangsongMonsterVfx.ts — 全 6 种野怪唐宋专属攻击技能动效 + 青金应龙吐息视觉重塑
 *
 * 注意严格遵循内核粒子/染色接口约束：
 *   - particles.use(key).tint(c1, c2) 必须传 `Lt(0xRRGGBB)` 构造的 Color 实例，绝不传裸数字；
 *   - 仅使用内核图集实际存在的粒子键（如 `Mt.smoke`、`Mt.flame`、`Mt.frost`、`Mt.glint`、`Mt.streak`、`Mt.broadleaf`、`Mt.petal`、`Mt.ember`、`Mt.rock`）。
 */

export interface MonsterVfxHelpers {
  qo: (...args: unknown[]) => {
    k: number;
    rot: (rx: number, ry: number, rz: number) => unknown;
    vel: (vx: number, vy: number, vz: number) => unknown;
    scale: (s0: number, s1: number) => unknown;
    fade: (a0: number, a1: number) => unknown;
  };
  bn: (
    k: unknown,
    x: number,
    z: number,
    r: number,
    dur: number,
    color: unknown,
    gain: number,
    w: number,
    inner: number,
  ) => void;
  Lr: (...args: unknown[]) => void;
  Ni: (...args: unknown[]) => void;
  H0: (...args: unknown[]) => void;
  U0: (...args: unknown[]) => void;
  jo: (...args: unknown[]) => void;
  vs: (...args: unknown[]) => void;
  Lt: (hex: number) => unknown;
  Mt: Record<string, string>;
  Xt: Record<string, string>;
  Ft: Record<string, string>;
  oe: number;
}

export interface MonsterVfxKit {
  a: { x: number; y: number; z: number; height: number; radius: number; unit?: MonsterUnitLike };
  rnd: { next: () => number; signed: () => number; range: (a: number, b: number) => number; chance: (p: number) => boolean };
  particles: {
    use: (key: string) => {
      tint: (c1: unknown, c2?: unknown) => {
        spawn: (...args: number[]) => void;
        orbit?: (...args: number[]) => void;
      };
      spawn: (...args: number[]) => void;
      orbit?: (...args: number[]) => void;
    };
  };
  decals: {
    add: (kind: string, x: number, z: number, r: number, dur: number) => {
      y?: (v: number) => unknown;
      rot: (a: number, tilt?: number) => { params: (...args: number[]) => { color: (...args: unknown[]) => { under: (...args: unknown[]) => void } } };
      params: (...args: number[]) => { color: (...args: unknown[]) => { under: (...args: unknown[]) => void } };
      color: (...args: unknown[]) => { under: (...args: unknown[]) => void };
    };
  };
  anchor: (id: number) => boolean;
  anchors: { unit: (id: number) => MonsterUnitLike | undefined };
  focusDist: (x: number, z: number) => number;
  after: (sec: number, fn: () => void) => void;
  light: (x: number, z: number, y: number, color: unknown, strength: number, radius: number, dur: number) => void;
  shake: (amt: number, x: number, z: number) => void;
  n: (cnt: number) => number;
}

export interface MonsterUnitLike {
  id: number;
  kind: string;
  alive: boolean;
  anim: string;
  animDur?: number;
  facing: number;
  monsterType?: string;
  pos: { x: number; y: number };
}

const MAX_VFX_DIST = 46;

function spawnBurst(
  kit: MonsterVfxKit,
  key: string,
  c1: unknown,
  c2: unknown,
  count: number,
  x: number,
  y: number,
  z: number,
  spreadR: number,
  speedH: number,
  speedUp: [number, number],
  life: [number, number],
  size: [number, number],
) {
  const pool = kit.particles.use(key).tint(c1, c2);
  const d = kit.rnd;
  const total = kit.n(count);
  for (let i = 0; i < total; i++) {
    const a = d.next() * Math.PI * 2;
    const rad = spreadR * Math.sqrt(d.next());
    pool.spawn(
      x + Math.cos(a) * rad,
      y + d.range(0, 0.35),
      z + Math.sin(a) * rad,
      Math.cos(a) * speedH * d.range(0.5, 1.15),
      d.range(speedUp[0], speedUp[1]),
      Math.sin(a) * speedH * d.range(0.5, 1.15),
      d.range(life[0], life[1]),
      d.range(size[0], size[1]),
      size[1] * 0.45,
      d.next() * 0.05,
    );
  }
}

export function playMonsterAttackVfx(
  kit: MonsterVfxKit,
  unit: MonsterUnitLike,
  event: { targetId?: number },
  fx: MonsterVfxHelpers,
): void {
  if (!unit || unit.kind !== 'monster' || !kit.anchor(unit.id)) return;
  if (kit.focusDist(kit.a.x, kit.a.z) > MAX_VFX_DIST) return;

  const kind = unit.monsterType ?? 'mossback';
  const unitId = unit.id;
  const windupRatio = kind === 'star_colossus' ? 0.34 : kind === 'abyss_drake' ? 0.32 : 0.28;
  const delay = Math.max(0.05, (unit.animDur && unit.animDur > 0 ? unit.animDur : 0.7) * windupRatio);

  // 起手蓄势微光，保证从前摇第一帧就有灵气聚拢感
  const { Lt, vs } = fx;
  const tellHex =
    kind === 'ember_golem'
      ? 0xf05224
      : kind === 'star_colossus'
        ? 0xf0b848
        : kind === 'glimwing'
          ? 0xe89b38
          : kind === 'abyss_drake'
            ? 0x2fa89c
            : kind === 'frost_golem'
              ? 0x68d4cb
              : 0x3ba886;
  const tellColor = Lt(tellHex);
  const tellHot = Lt(0xfff4d0);
  vs(
    kit,
    kit.a.x + Math.cos(unit.facing) * ((kit.a.radius || 1) * 0.65),
    kit.a.y + (kit.a.height || 2) * 0.62,
    kit.a.z + Math.sin(unit.facing) * ((kit.a.radius || 1) * 0.65),
    0.75,
    tellHot,
    tellColor,
    Math.cos(unit.facing),
    Math.sin(unit.facing),
    3,
    0.14,
    2,
  );

  kit.after(delay, () => {
    if (!kit.anchor(unitId) || !kit.a.unit || !kit.a.unit.alive || kit.a.unit.anim !== 'attack') return;
    const g = globalThis as { __tsMonsterVfxFired?: Record<string, number> };
    g.__tsMonsterVfxFired ??= {};
    g.__tsMonsterVfxFired[kind] = (g.__tsMonsterVfxFired[kind] ?? 0) + 1;
    const ux = kit.a.x;
    const uy = kit.a.y;
    const uz = kit.a.z;
    const h = kit.a.height || 2;
    const rad = kit.a.radius || 1;
    let facing = kit.a.unit.facing;

    let tx = ux + Math.cos(facing) * (rad + 1.2);
    let ty = uy + 0.8;
    let tz = uz + Math.sin(facing) * (rad + 1.2);
    if (event.targetId !== undefined && kit.anchor(event.targetId)) {
      tx = kit.a.x;
      ty = kit.a.y + kit.a.height * 0.52;
      tz = kit.a.z;
      facing = Math.atan2(tz - uz, tx - ux);
    }
    const dirX = Math.cos(facing);
    const dirZ = Math.sin(facing);
    const { Lt, Mt, Xt, qo, bn, vs, H0, U0, Ni } = fx;

    switch (kind) {
      case 'mossback': {
        // 负碑灵龟 · 「碑镇碧波震」：青玉震波环 + 翠玉碑文地印 + 青苔石屑
        const jadeHot = Lt(0xa8f7d6);
        const jade = Lt(0x3ba886);
        const deep = Lt(0x163d34);
        const hitX = ux + dirX * (rad + 0.9);
        const hitZ = uz + dirZ * (rad + 0.9);
        bn(kit, hitX, hitZ, 2.3, 0.38, jade, 1.45, 0.24, 0.35);
        kit.decals.add(Xt.sigil, hitX, hitZ, 2.1, 0.75).params(2, 0.3).color(jade, 1.35, 0.9).under(deep, 0.35);
        vs(kit, hitX, 0.65, hitZ, 1.2, jadeHot, jade, dirX, dirZ, 4, 0.16, 4);
        spawnBurst(kit, Mt.broadleaf, jade, deep, 7, hitX, 0.35, hitZ, 0.7, 2.6, [0.9, 2.4], [0.45, 0.75], [0.16, 0.26]);
        kit.light(hitX, hitZ, 0.9, jade, 1.6, 4.5, 0.22);
        break;
      }

      case 'glimwing': {
        // 提灯青鸟 · 「宫灯金羽振」：扇形暖金羽芒弧线 + 翠玉羽毛飞散
        const lanternHot = Lt(0xfff0b0);
        const lanternGold = Lt(0xe89b38);
        const jadeFeather = Lt(0x52c4b4);
        const mx = ux + dirX * 0.65;
        const my = uy + h * 0.72;
        const mz = uz + dirZ * 0.65;
        const slash = qo(kit, mx, my, mz, facing, 1.25, 0.16, lanternGold, 1.8, 0.25, true, 0.85);
        slash.k = 0.75;
        vs(kit, mx, my, mz, 0.95, lanternHot, lanternGold, dirX, dirZ, 3, 0.14, 3);
        spawnBurst(kit, Mt.glint, lanternHot, jadeFeather, 6, mx, my, mz, 0.35, 3.4, [0.4, 1.6], [0.32, 0.55], [0.14, 0.22]);
        kit.light(mx, mz, my, lanternGold, 1.5, 4.0, 0.18);
        break;
      }

      case 'frost_golem': {
        // 九色玄鹿 · 「天青月华斩」：汝窑天青月弧斩 + 寒玉花晶漫散 + 足下月印
        const moonWhite = Lt(0xf2fff8);
        const celadon = Lt(0x68d4cb);
        const deep = Lt(0x215762);
        const sx = ux + dirX * (rad * 0.7);
        const sy = uy + h * 0.58;
        const sz = uz + dirZ * (rad * 0.7);
        const slash1 = qo(kit, sx, sy, sz, facing, rad * 1.15 + 0.9, 0.22, celadon, 2.1, 0.42, true, 0.95);
        slash1.k = 0.78;
        bn(kit, tx, tz, 2.1, 0.36, celadon, 1.5, 0.2, 0.3);
        kit.decals.add(Xt.sigil, tx, tz, 1.8, 0.7).params(3, 0.2).color(celadon, 1.4, 0.9).under(deep, 0.3);
        vs(kit, tx, ty, tz, 1.35, moonWhite, celadon, dirX, dirZ, 4, 0.18, 4);
        spawnBurst(kit, Mt.frost, moonWhite, celadon, 9, tx, ty, tz, 0.55, 2.8, [0.6, 2.0], [0.45, 0.75], [0.16, 0.28]);
        kit.light(tx, tz, ty, celadon, 1.8, 5.2, 0.24);
        break;
      }

      case 'ember_golem': {
        // 赤炎狻猊 · 「赤炎狮爪裂」：交叉双道朱金烈焰爪弧 + 焚地赤纹 + 烈焰火星溅射
        const fireHot = Lt(0xffe08a);
        const fireRed = Lt(0xf05224);
        const fireDeep = Lt(0x6e180c);
        const sx = ux + dirX * (rad * 0.68);
        const sy = uy + h * 0.55;
        const sz = uz + dirZ * (rad * 0.68);
        const clawL = qo(kit, sx, sy + 0.14, sz, facing, rad * 1.2 + 0.85, 0.24, fireRed, 2.25, 0.48, true, 0.92);
        clawL.k = 0.82;
        const clawR = qo(kit, sx, sy - 0.1, sz, facing, rad * 1.12 + 0.8, 0.22, fireHot, 2.1, -0.46, true, 0.9);
        clawR.k = 0.75;
        bn(kit, tx, tz, 2.25, 0.34, fireRed, 1.55, 0.24, 0.28);
        kit.decals.add(Xt.cracks, tx, tz, 2.0, 0.85).params(0, 0.5).color(fireRed, 1.45).under(fireDeep, 0.45);
        H0(kit, tx, ty, tz, 6, 6, fireHot, fireRed, 0, 0, 0, 0.34, 0.15);
        spawnBurst(kit, Mt.flame, fireHot, fireRed, 8, tx, ty, tz, 0.5, 2.9, [1.2, 3.0], [0.35, 0.6], [0.22, 0.34]);
        kit.light(tx, tz, ty, fireRed, 2.1, 5.8, 0.26);
        break;
      }

      case 'abyss_drake': {
        // 沧溟应龙 · 「苍溟青金龙爪浪」：千里江山石青金横扫巨弧 + 青水雾浪 + 龙雷星爆（全去旧紫色）
        const dragonHot = Lt(0xa8fff0);
        const dragonTeal = Lt(0x2fa89c);
        const dragonGold = Lt(0xffd670);
        const dragonDeep = Lt(0x134a52);
        const sx = ux + dirX * (rad * 0.75);
        const sy = uy + h * 0.52;
        const sz = uz + dirZ * (rad * 0.75);
        const sweep = qo(kit, sx, sy, sz, facing, rad * 1.45 + 1.1, 0.32, dragonTeal, 2.45, 0.55, true, 0.95);
        sweep.k = 0.86;
        const goldArc = qo(kit, sx, sy + 0.18, sz, facing, rad * 1.25 + 0.9, 0.18, dragonGold, 2.1, -0.32, true, 0.9);
        goldArc.k = 0.75;
        bn(kit, tx, tz, 3.1, 0.42, dragonTeal, 1.65, 0.26, 0.26);
        vs(kit, tx, ty, tz, 1.85, dragonHot, dragonGold, dirX, dirZ, 5, 0.2, 6);
        U0(kit, tx, ty, tz, 5, 5, 5, dragonGold, dragonTeal, 0.2);
        spawnBurst(kit, Mt.smoke, dragonHot, dragonDeep, 5, tx, 0.45, tz, 0.9, 2.5, [0.6, 1.7], [0.48, 0.8], [0.42, 0.7]);
        kit.light(tx, tz, ty, dragonTeal, 2.4, 7.0, 0.28);
        break;
      }

      case 'star_colossus': {
        // 镇岳神兽 · 「浑天金印震岳击」：玄重鎏金震地印 + 浑天星纹双环 + 冲天金芒 + 轻震屏幕
        const goldHot = Lt(0xfff4c2);
        const bronzeGold = Lt(0xf0b848);
        const cinnabar = Lt(0xd4402c);
        const darkBronze = Lt(0x1e352e);
        const hx = tx;
        const hz = tz;
        bn(kit, hx, hz, 3.8, 0.48, bronzeGold, 1.8, 0.32, 0.22);
        bn(kit, hx, hz, 2.3, 0.32, cinnabar, 1.6, 0.22, 0.38);
        kit.decals.add(Xt.sigil, hx, hz, 3.2, 1.05).params(3, 0.35).color(bronzeGold, 1.6, 0.95).under(darkBronze, 0.5);
        kit.decals.add(Xt.star, hx, hz, 2.6, 0.9).params(8, 1.8).color(goldHot, 1.5, 0.9).under(cinnabar, 0.35);
        vs(kit, hx, 0.85, hz, 2.1, goldHot, bronzeGold, 0, 1, 6, 0.22, 6);
        Ni(kit, hx, 0.3, hz, 6, 0.9, 2.2, bronzeGold, darkBronze, 0.65);
        spawnBurst(kit, Mt.ember, goldHot, cinnabar, 10, hx, 0.6, hz, 1.1, 3.6, [1.5, 3.6], [0.42, 0.72], [0.22, 0.36]);
        kit.light(hx, hz, 1.4, bronzeGold, 2.8, 8.2, 0.3);
        kit.shake(0.11, hx, hz);
        break;
      }
    }
  });
}
