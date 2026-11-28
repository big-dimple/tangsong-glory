/**
 * tangsongImpact.ts — 高燃打击感、硬控反馈、微顿帧与技能华丽表现系统
 *
 * 1. 微顿帧（Hit-Stop）：仅作用于表现层渲染 dt（绝不阻塞确定性逻辑模拟），严格限幅 <= 0.06s 且带 0.18s 防抖冷却。
 * 2. 硬控爆发特效（cc_impact）：击飞（airborne）、眩晕（stun）、击退（knockback）、聚拢（pull）均有清晰可见的
 *    3D 冲击波、地面扩散印记、高空火花与角色受击高光闪白。
 * 3. 天马行空的唐宋技能奇观（skill_spectacle）：为五套技能体系注入标志性高光收尾与气浪意象。
 * 4. 飘字标签映射（getCcPopup）：在敌我头顶直接弹出「击飞!」「眩晕!」「击退!」「聚拢!」战报浮字。
 */
import { kitOf } from '../config/heroes';
import { cinematicFlowEnabled } from '../ui/tangsongMotion';
import type { MonsterVfxHelpers, MonsterVfxKit } from './tangsongMonsterVfx';
import {
  playInkSealCast,
  playLiueSealSlam,
  playPetrifyCast,
  playSushiWaveWall,
  type SkillsExHelpers,
  type SkillsExKit,
} from './tangsongSkillsEx';

export type CcKind = 'airborne' | 'stun' | 'knockback' | 'pull' | 'petrify' | 'ink_seal';

export interface CcPopupSpec {
  text: string;
  color: string;
  stroke: string;
  size: number;
}

export interface ImpactEventLike {
  key?: string;
  cc?: CcKind;
  style?: string;
  unitId?: number;
  targetId?: number;
  pos?: { x: number; y: number };
  dir?: { x: number; y: number };
  dx?: number;
  dy?: number;
  radius?: number;
  angle?: number;
}

export interface ImpactStateLike {
  playerId?: number;
  playerTeam?: number;
}

const CC_POPUPS: Record<CcKind, CcPopupSpec> = {
  airborne: { text: '击飞!', color: '#fff099', stroke: 'rgba(92,42,0,0.96)', size: 19 },
  stun: { text: '眩晕!', color: '#ffc966', stroke: 'rgba(84,28,0,0.96)', size: 18 },
  petrify: { text: '石化!', color: '#e9d2ff', stroke: 'rgba(54,18,88,0.96)', size: 20 },
  ink_seal: { text: '墨封!', color: '#b4fff0', stroke: 'rgba(10,42,48,0.96)', size: 20 },
  knockback: { text: '击退!', color: '#ff9468', stroke: 'rgba(86,16,8,0.96)', size: 17 },
  pull: { text: '聚拢!', color: '#84f5e4', stroke: 'rgba(8,52,58,0.96)', size: 17 },
};

let hitStopLeft = 0;
let hitStopCooldownUntil = 0;

export function triggerHitStop(sec = 0.045): void {
  if (!cinematicFlowEnabled()) return;
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (now < hitStopCooldownUntil) return;
  hitStopLeft = Math.max(hitStopLeft, Math.min(0.06, Math.max(0.02, sec)));
  hitStopCooldownUntil = now + 180;
}

export function scaleRenderDt(dt: number): number {
  if (!cinematicFlowEnabled() || hitStopLeft <= 0 || dt <= 0) {
    hitStopLeft = 0;
    return dt;
  }
  const consume = Math.min(hitStopLeft, dt);
  hitStopLeft -= consume;
  return dt * 0.16;
}

export function getCcPopup(kind: string): CcPopupSpec | null {
  return (CC_POPUPS as Record<string, CcPopupSpec | undefined>)[kind] ?? null;
}

function isPlayerRelated(ev: ImpactEventLike, state?: ImpactStateLike): boolean {
  if (!state) return false;
  return ev.unitId === state.playerId || ev.targetId === state.playerId;
}

function resolveHeroHex(kit: MonsterVfxKit, unitId?: number): { glow: number; hot: number; deep: number } {
  const unit = typeof unitId === 'number' ? kit.anchors.unit(unitId) : undefined;
  const heroKey = (unit as { heroId?: string } | undefined)?.heroId;
  const kitKey = heroKey ? kitOf(heroKey) : '';
  if (heroKey === 'liue') return { glow: 0xd46aff, hot: 0xffe4ff, deep: 0x5c188a };
  if (kitKey === 'panyue') return { glow: 0xf4be4a, hot: 0xfff2be, deep: 0x8a4810 };
  if (kitKey === 'chijin') return { glow: 0xf04854, hot: 0xffd2b8, deep: 0x701018 };
  if (kitKey === 'xingli') return { glow: 0x4fd2bf, hot: 0xe6fff9, deep: 0x104c52 };
  if (kitKey === 'fengling') return { glow: 0xf2b84e, hot: 0xfff5d4, deep: 0x7a4c14 };
  if (kitKey === 'yeque') return { glow: 0xff6234, hot: 0xffdca0, deep: 0x8c1b12 };
  return { glow: 0xf0be4a, hot: 0xfff2c0, deep: 0x5a3210 };
}

function spawnRingParticles(
  kit: MonsterVfxKit,
  key: string,
  c1: unknown,
  c2: unknown,
  x: number,
  y: number,
  z: number,
  count: number,
  speed: number,
  upMin: number,
  upMax: number,
  life = 0.42,
  size = 0.24,
): void {
  if (!key) return;
  const pool = kit.particles.use(key).tint(c1, c2);
  const n = kit.n(count);
  const d = kit.rnd;
  for (let i = 0; i < n; i++) {
    const a = (i / Math.max(1, n)) * Math.PI * 2 + d.signed() * 0.24;
    const sp = speed * d.range(0.65, 1.2);
    pool.spawn(
      x + Math.cos(a) * 0.25,
      y,
      z + Math.sin(a) * 0.25,
      Math.cos(a) * sp,
      d.range(upMin, upMax),
      Math.sin(a) * sp,
      life * d.range(0.8, 1.2),
      size * d.range(0.75, 1.25),
      size * 0.3,
      d.next() * 0.04,
    );
  }
}

export function playImpactFx(
  kit: MonsterVfxKit,
  ev: ImpactEventLike,
  state: ImpactStateLike | undefined,
  fx: MonsterVfxHelpers,
): void {
  const { Lt, Mt, Xt, qo, bn, vs, oe } = fx;
  const x = ev.pos?.x ?? 0;
  const z = ev.pos?.y ?? 0;
  if (kit.focusDist(x, z) > 48) return;

  const target = typeof ev.targetId === 'number' ? kit.anchors.unit(ev.targetId) : undefined;
  const tx = target?.pos?.x ?? x;
  const tz = target?.pos?.y ?? z;
  const pal = resolveHeroHex(kit, ev.unitId);
  const cGlow = Lt(pal.glow);
  const cHot = Lt(pal.hot);
  const cDeep = Lt(pal.deep);
  const mine = isPlayerRelated(ev, state);

  if (ev.key === 'cc_impact' && ev.cc) {
    const cc = ev.cc;
    const kits = kit as MonsterVfxKit & {
      anchors: MonsterVfxKit['anchors'] & {
        flashTint?: (id: number, col: unknown, amt: number, dur: number) => void;
        flashRim?: (id: number, dur: number) => void;
      };
      glow?: {
        spawn: (g: number, m: number, d: number) => {
          at: (x: number, y: number, z: number) => {
            scale3: (a: number, b: number, c: number, d?: number, e?: number, f?: number) => {
              color: (c: unknown, i: number, a?: number) => {
                fade: (a: number, b: number) => { opt?: (a: number, b: number, c: number) => void };
              };
            };
          };
        };
      };
    };

    if (cc === 'airborne') {
      bn(kit, tx, tz, 2.35, 0.45, cHot, 1.65, 0.24, 0.25);
      kit.decals.add(Xt.star, tx, tz, 2.1, 0.52).params(6, 1).color(cGlow, 1.85, 0.92).under(cDeep, 0.35);
      spawnRingParticles(kit, Mt.glint, cHot, cGlow, tx, 0.35, tz, 14, 2.8, 4.8, 9.4, 0.48, 0.26);
      spawnRingParticles(kit, Mt.spark, cGlow, Lt(0xffffff), tx, 0.5, tz, 10, 4.2, 2.5, 6.5, 0.36, 0.22);
      vs(kit, tx, 1.15, tz, 1.65, cHot, cGlow, 0, 0, 10, 0.14, 12);
      if (typeof ev.targetId === 'number') {
        kits.anchors.flashTint?.(ev.targetId, cHot, 0.85, 0.26);
        kits.anchors.flashRim?.(ev.targetId, 0.38);
      }
      kit.light(tx, tz, 1.4, cGlow, 4.5, 7, 0.26);
      kit.shake(mine ? 0.22 : 0.09, tx, tz);
      if (mine) triggerHitStop(0.048);
      return;
    }

    if (cc === 'stun' || cc === 'petrify' || cc === 'ink_seal') {
      const isPet = cc === 'petrify';
      const isInk = cc === 'ink_seal';
      const cMain = isPet ? Lt(0xd488ff) : isInk ? Lt(0x64e0cb) : Lt(0xffc966);
      const cSpark = isPet ? Lt(0xe8d4ff) : isInk ? Lt(0xb4fff0) : Lt(0xfff0aa);
      const cHotStun = isPet ? Lt(0xf5ebff) : isInk ? Lt(0xe8fff9) : Lt(0xfff5cc);
      bn(kit, tx, tz, isPet || isInk ? 2.15 : 1.9, 0.38, cMain, 1.55, 0.22, 0.28);
      spawnRingParticles(kit, Mt.bolt, cSpark, cMain, tx, 1.3, tz, 10, 3.6, 1.4, 3.8, 0.32, 0.24);
      spawnRingParticles(kit, Mt.glint, Lt(0xffffff), cMain, tx, 1.4, tz, 8, 2.4, 0.8, 2.6, 0.34, 0.2);
      vs(kit, tx, 1.25, tz, 1.5, cHotStun, cMain, 0, 0, 8, 0.12, 10);
      if (isPet) playPetrifyCast(kit as unknown as SkillsExKit, tx, tz, fx as unknown as SkillsExHelpers);
      if (isInk) playInkSealCast(kit as unknown as SkillsExKit, tx, tz, fx as unknown as SkillsExHelpers);
      if (typeof ev.targetId === 'number') {
        kits.anchors.flashTint?.(ev.targetId, isPet ? Lt(0x9ea8b4) : isInk ? Lt(0x1e282d) : Lt(0xffdc80), 0.82, 0.26);
      }
      kit.shake(mine ? 0.19 : 0.08, tx, tz);
      if (mine) triggerHitStop(isPet || isInk ? 0.048 : 0.042);
      return;
    }

    if (cc === 'knockback') {
      const dx = ev.dx ?? 1;
      const dy = ev.dy ?? 0;
      const dLen = Math.hypot(dx, dy) || 1;
      const nx = dx / dLen;
      const nz = dy / dLen;
      const ang = Math.atan2(nz, nx);
      qo(kit, tx, 0.95, tz, ang, 1.55, 0.26, cHot, 2.0, 0.35);
      bn(kit, tx, tz, 1.65, 0.3, cGlow, 1.25, 0.18, 0.35);
      const dust = kit.particles.use(Mt.puff).tint(Lt(0xe8dec8), Lt(0x7c7060));
      const spk = kit.particles.use(Mt.spark).tint(cHot, cGlow);
      for (let i = 0; i < kit.n(8); i++) {
        const jx = kit.rnd.signed() * 0.45;
        const jz = kit.rnd.signed() * 0.45;
        dust.spawn(tx + jx, 0.22, tz + jz, nx * kit.rnd.range(2.8, 6.2), kit.rnd.range(0.5, 1.4), nz * kit.rnd.range(2.8, 6.2), 0.38, 0.46, 0.72, 0);
        spk.spawn(tx, 0.85, tz, nx * kit.rnd.range(4.5, 8.8) + jx * 2, kit.rnd.range(1.2, 3.2), nz * kit.rnd.range(4.5, 8.8) + jz * 2, 0.28, 0.24, 0.08, 0);
      }
      if (typeof ev.targetId === 'number') {
        kits.anchors.flashTint?.(ev.targetId, cHot, 0.7, 0.2);
      }
      kit.shake(mine ? 0.16 : 0.06, tx, tz);
      if (mine) triggerHitStop(0.036);
      return;
    }

    if (cc === 'pull') {
      kit.decals.add(Xt.sigil, x, z, 2.8, 0.52).params(2, 0.4).color(cGlow, 1.75, 0.9).under(cDeep, 0.4);
      const pPool = kit.particles.use(Mt.glint).tint(cHot, cGlow);
      for (let i = 0; i < kit.n(12); i++) {
        const a = (i / 12) * oe;
        const r = 2.6;
        pPool.spawn(x + Math.cos(a) * r, 0.45, z + Math.sin(a) * r, -Math.cos(a) * 6.4, 1.1, -Math.sin(a) * 6.4, 0.36, 0.24, 0.08, 0);
      }
      kit.shake(mine ? 0.12 : 0.05, x, z);
      return;
    }
  }

  if (ev.key === 'skill_spectacle' && ev.style) {
    const r = Math.max(2.2, ev.radius ?? 3.8);
    switch (ev.style) {
      case 'panyue_slam':
      case 'panyue_ult': {
        const big = ev.style === 'panyue_ult';
        kit.decals.add(Xt.rune, x, z, r * 1.15, big ? 1.25 : 0.75).params(8, 0.65).color(cHot, 2.0, 0.95).under(cDeep, 0.45);
        bn(kit, x, z, r * 1.1, big ? 0.58 : 0.4, cHot, 1.8, 0.28, 0.22);
        spawnRingParticles(kit, Mt.debris, Lt(0xd4a45a), Lt(0x4a3824), x, 0.25, z, big ? 18 : 11, 5.4, 4.2, 8.8, 0.58, 0.32);
        spawnRingParticles(kit, Mt.glint, cHot, cGlow, x, 0.45, z, big ? 16 : 10, 4.6, 5.2, 10.5, 0.52, 0.26);
        kit.light(x, z, 2.0, cGlow, big ? 7.5 : 5, r * 2.2, 0.38);
        kit.shake(mine ? (big ? 0.36 : 0.24) : 0.11, x, z);
        if (mine) triggerHitStop(big ? 0.058 : 0.044);
        break;
      }
      case 'chijin_wave': {
        const dx = ev.dir?.x ?? 1;
        const dz = ev.dir?.y ?? 0;
        const dLen = Math.hypot(dx, dz) || 1;
        const ux = dx / dLen;
        const uz = dz / dLen;
        const baseAng = Math.atan2(uz, ux);
        const angle = Math.max(0.6, Math.min(Math.PI * 1.4, ev.angle ?? 1.92));
        const halfAng = angle * 0.5;
        const rnd = kit.rnd;

        // 1) 贴合真实扇形判定区的绯金地面印记（严格前向 fan，零身后 360° 圆圈）
        kit.decals
          .add(Xt.cone, x, z, r, 0.56)
          .rot(baseAng)
          .params(halfAng, 0.84)
          .color(cHot, 1.95, 0.94)
          .under(cDeep, 0.56);

        // 2) 扇区内部 3 道错落纵深新月剑气弧（严格按 k = angle / 2.5 裁剪至扇形角内）
        const kArc = Math.min(1, angle / 2.5);
        const layers: Array<[number, number, number, number, unknown, number, number]> = [
          [r * 0.44, 0.72, 0.24, 0.08, cHot, 2.25, 0.0],
          [r * 0.72, 0.96, 0.30, -0.09, cGlow, 1.95, Math.PI],
          [r * 0.98, 1.12, 0.36, 0.05, cHot, 2.4, 0.0],
        ];
        for (const [arcR, ay, dur, tilt, col, gain, flip] of layers) {
          const arc = qo(kit, x, ay, z, baseAng, arcR, dur, col, gain, flip + tilt, true, 0.92) as {
            scale: (a: number, b?: number) => { fade: (a: number, b: number) => void };
            k?: number;
          };
          arc.scale(arcR * 0.9, arcR).fade(0.02, 0.55);
          arc.k = kArc;
        }

        // 3) 扇区内部漫天落红花瓣（Mt.leaf）与绯金剑丝（Mt.silk）—— 面积均匀洒满整个扇形区域
        const petalPool = kit.particles.use(Mt.leaf).tint(Lt(0xffb4c8), Lt(0xe02848));
        const silkPool = kit.particles.use(Mt.silk).tint(Lt(0xffe096), Lt(0xff5272));
        const fanCount = kit.n(28);
        for (let i = 0; i < fanCount; i++) {
          const frac = Math.sqrt(rnd.next());
          const rr = r * (0.20 + 0.78 * frac);
          const a = baseAng + (rnd.next() * 2 - 1) * halfAng * 0.92;
          const px = x + Math.cos(a) * rr;
          const pz = z + Math.sin(a) * rr;
          const tx = -Math.sin(a);
          const tz = Math.cos(a);
          const sweepSp = rnd.range(2.2, 5.4);
          petalPool.spawn(
            px,
            rnd.range(0.35, 1.35),
            pz,
            tx * sweepSp + Math.cos(a) * rnd.range(0.8, 2.4),
            rnd.range(1.1, 3.0),
            tz * sweepSp + Math.sin(a) * rnd.range(0.8, 2.4),
            rnd.range(0.45, 0.78),
            rnd.range(0.24, 0.36),
            0.14,
            (i / Math.max(1, fanCount)) * 0.08,
          );
          if (i % 2 === 0) {
            silkPool.spawn(
              px,
              rnd.range(0.45, 1.2),
              pz,
              tx * sweepSp * 1.15 + Math.cos(a) * 1.4,
              rnd.range(0.5, 1.8),
              tz * sweepSp * 1.15 + Math.sin(a) * 1.4,
              0.38,
              0.24,
              0.10,
              (i / Math.max(1, fanCount)) * 0.06,
            );
          }
        }

        // 4) 扇区纵深刀光掠影 + 外弧边沿剑芒星火（全部严格落在 [baseAng - halfAng, baseAng + halfAng]）
        const streakPool = kit.particles.use(Mt.streak).tint(Lt(0xffffff), cGlow);
        const sparkPool = kit.particles.use(Mt.spark).tint(cHot, cDeep);
        const glintPool = kit.particles.use(Mt.glint).tint(Lt(0xffffff), cGlow);
        const slashCount = kit.n(14);
        for (let i = 0; i < slashCount; i++) {
          const u = (i + 0.5) / slashCount;
          const a = baseAng - halfAng * 0.92 + u * angle * 0.92;
          const rr = r * rnd.range(0.28, 0.95);
          const px = x + Math.cos(a) * rr;
          const pz = z + Math.sin(a) * rr;
          const tx = -Math.sin(a);
          const tz = Math.cos(a);
          streakPool.spawn(px, rnd.range(0.55, 1.3), pz, tx * 9.5 + ux * 2.5, rnd.signed() * 0.9, tz * 9.5 + uz * 2.5, 0.16, 0.13, 0.04, u * 0.07);
          const rimR = r * rnd.range(0.84, 1.0);
          sparkPool.spawn(
            x + Math.cos(a) * rimR,
            rnd.range(0.4, 1.15),
            z + Math.sin(a) * rimR,
            Math.cos(a) * rnd.range(2.2, 4.8) + tx * 3.0,
            rnd.range(1.2, 3.2),
            Math.sin(a) * rnd.range(2.2, 4.8) + tz * 3.0,
            0.32,
            0.16,
            0.05,
            u * 0.06,
          );
          if (i % 2 === 0) {
            glintPool.spawn(
              x + Math.cos(a) * r * rnd.range(0.45, 0.92),
              rnd.range(0.45, 1.1),
              z + Math.sin(a) * r * rnd.range(0.45, 0.92),
              Math.cos(a) * 1.6,
              rnd.range(0.8, 2.1),
              Math.sin(a) * 1.6,
              0.38,
              0.24,
              0.08,
              u * 0.05,
            );
          }
        }

        kit.light(x + ux * r * 0.52, z + uz * r * 0.52, 1.45, cGlow, 5.8, r * 1.8, 0.32);
        if (mine) triggerHitStop(0.036);
        break;
      }
      case 'chijin_finisher': {
        kit.decals.add(Xt.star, x, z, r, 0.85).params(6, 1).color(cGlow, 1.9, 0.92).under(cDeep, 0.38);
        spawnRingParticles(kit, Mt.star, Lt(0xffc6d4), Lt(0xd8324c), x, 0.8, z, 22, 5.5, 2.2, 6.2, 0.65, 0.28);
        bn(kit, x, z, r, 0.42, cHot, 1.7, 0.25, 0.2);
        kit.light(x, z, 1.3, cGlow, 5.2, r * 2, 0.3);
        if (mine) triggerHitStop(0.05);
        break;
      }
      case 'xingli_vortex':
      case 'xingli_wave': {
        const isVortex = ev.style === 'xingli_vortex';
        const actor = typeof ev.unitId === 'number' ? kit.anchors.unit(ev.unitId) : undefined;
        const isLiue = (actor as { heroId?: string } | undefined)?.heroId === 'liue';
        kit.decals.add(Xt.rune, x, z, r, 0.85).params(8, 1.1).color(cGlow, 1.85, 0.94).under(cDeep, 0.35);
        spawnRingParticles(kit, Mt.glint, cHot, cGlow, x, 0.5, z, isVortex ? 16 : 12, isVortex ? 3.2 : 4.8, 3.8, 8.2, 0.52, 0.26);
        bn(kit, x, z, r * 0.95, 0.46, cHot, 1.55, 0.22, 0.28);
        if (isVortex && isLiue && (fx as unknown as SkillsExHelpers).qe) {
          playLiueSealSlam(kit as unknown as SkillsExKit, x, z, r, fx as unknown as SkillsExHelpers);
        }
        if (!isVortex && !isLiue && (fx as unknown as SkillsExHelpers).qe) {
          playSushiWaveWall(kit as unknown as SkillsExKit, x, z, r, fx as unknown as SkillsExHelpers);
        }
        kit.light(x, z, 1.8, cGlow, 5.5, r * 2, 0.34);
        if (mine && isVortex) triggerHitStop(0.042);
        break;
      }
      case 'fengling_pierce':
      case 'fengling_rain': {
        const isRain = ev.style === 'fengling_rain';
        kit.decals.add(Xt.star, x, z, isRain ? r * 0.92 : 2.1, 0.6).params(5, 1).color(cHot, 1.75, 0.9).under(cDeep, 0.32);
        spawnRingParticles(kit, Mt.glint, cHot, cGlow, x, 0.9, z, isRain ? 18 : 12, 5.2, 3.4, 7.6, 0.48, 0.25);
        bn(kit, x, z, isRain ? r * 0.95 : 2.0, 0.36, cHot, 1.6, 0.22, 0.25);
        kit.light(x, z, 1.4, cGlow, 5, r * 1.8, 0.28);
        if (mine) triggerHitStop(0.04);
        break;
      }
      case 'yeque_cross': {
        kit.decals.add(Xt.star, x, z, 2.8, 0.72).params(4, 1.2).color(cHot, 2.2, 0.98).under(cDeep, 0.45);
        bn(kit, x, z, 3.2, 0.42, cHot, 2.0, 0.3, 0.16);
        spawnRingParticles(kit, Mt.ember, cHot, cGlow, x, 0.9, z, 20, 6.8, 3.5, 8.5, 0.46, 0.28);
        spawnRingParticles(kit, Mt.glint, Lt(0xffffff), cHot, x, 1.1, z, 12, 4.5, 4.5, 9.2, 0.4, 0.26);
        vs(kit, x, 1.2, z, 2.2, Lt(0xffffff), cGlow, 0, 0, 12, 0.18, 12);
        kit.light(x, z, 1.8, cGlow, 7.5, 10, 0.36);
        kit.shake(mine ? 0.34 : 0.14, x, z);
        if (mine) triggerHitStop(0.056);
        break;
      }
    }
  }
}

export const TANGSONG_IMPACT_API = {
  triggerHitStop,
  scaleRenderDt,
  getCcPopup,
  playImpactFx,
} as const;
