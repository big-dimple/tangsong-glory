/**
 * tangsongSkillsEx.ts — 零数值改动技能交互与视觉奇观系统
 *
 * 1. 全英雄通用状态识别（石化 / 墨封 / 击飞 / 强减速）+ 三大轻功飞天姿态计算（花蕊御剑 / 文成敦煌飞天 / 辛弃疾高空刀影）。
 * 2. 花蕊夫人御剑踏梅：脚踏青金飞剑悬空 ~2.35m、高空双旋剑环、真·飞越薄墙收招落地安全保护。
 * 3. 文成公主敦煌飞天：腾空 ~3.0m 脚踏旋转金莲祥云、双螺旋朱金飞天飘带与高空弓弦天音线。
 * 4. 辛弃疾高空三影：隐踪期跃上 ~3.9m 悬停 3 道赤金持刀残影，现身瞬间四面俯冲十字交叉斩。
 * 5. 刘娥「青石石化 + 巨型鎏金凤印」、苏轼「水墨定格 + 青绿浪墙竹简」、秦琼「霸王高跃滞空 + 八根玄铁断碑结界」。
 */
import { kitOf } from '../config/heroes';

export type UnitCcState = '' | 'petrify' | 'ink_seal' | 'airborne' | 'chill';
export type FlightKind = '' | 'huarui' | 'wencheng' | 'xinqiji';

export interface BuffLike {
  id: string;
  key?: string;
  stacks?: number;
  value?: number;
  timeLeft?: number;
  duration?: number;
  startTime?: number;
}

export interface UnitLike {
  id: number;
  kind?: string;
  heroId?: string;
  alive?: boolean;
  facing?: number;
  pos?: { x: number; y: number };
  buffs?: BuffLike[];
}

export interface GlowMeshHandle {
  at: (x: number, y: number, z: number) => GlowMeshHandle;
  vel?: (x: number, y: number, z: number) => GlowMeshHandle;
  scale: (s: number) => GlowMeshHandle;
  scale3: (x: number, y: number, z: number, ex?: number, ey?: number, ez?: number) => GlowMeshHandle;
  rot: (x: number, y: number, z: number) => GlowMeshHandle;
  color: (c: unknown, intensity?: number, tintAmt?: number) => GlowMeshHandle;
  fade: (fi: number, fo: number) => GlowMeshHandle;
  opt?: (add?: number, k?: number, progress?: number) => GlowMeshHandle;
  spin?: (rx: number, ry: number, rz: number) => GlowMeshHandle;
  a: number;
  add?: number;
  k?: number;
  progress?: number;
}

export interface SkillsExKit {
  lowQ?: boolean;
  a: { x: number; y: number; z: number; height: number; radius: number; unit?: UnitLike };
  rnd: { next: () => number; signed: () => number; range: (a: number, b: number) => number; chance: (p: number) => boolean };
  n: (cnt: number) => number;
  focusDist: (x: number, z: number) => number;
  anchor: (id: number) => boolean;
  anchors: { unit: (id: number) => UnitLike | undefined };
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
  ribbons?: {
    trace: (
      style: unknown,
      x0: number,
      y0: number,
      z0: number,
      x1: number,
      y1: number,
      z1: number,
      dur: number,
      c1: unknown,
      c2: unknown,
    ) => void;
  };
  decals: {
    add: (kind: string, x: number, z: number, r: number, dur: number) => {
      y?: (v: number) => unknown;
      rot: (a: number, tilt?: number) => { params: (...args: number[]) => { color: (...args: unknown[]) => { under: (...args: unknown[]) => void } } };
      params: (...args: number[]) => { color: (...args: unknown[]) => { under: (...args: unknown[]) => void } };
      color: (...args: unknown[]) => { under: (...args: unknown[]) => void };
    };
    at: (slot: number) => {
      at: (x: number, z: number) => { radius: (r: number) => unknown };
      rot: (a: number, tilt?: number) => unknown;
    };
  };
  glow: {
    hold: (geom: number, mat: number) => GlowMeshHandle;
    spawn: (geom: number, mat: number, dur: number) => GlowMeshHandle;
    release: (m: GlowMeshHandle) => void;
  };
  sprites?: {
    draw: (...args: unknown[]) => void;
  };
  track?: (
    unitId: number,
    dur: number,
    fn: (u: { x: number; y: number; z: number; unit?: UnitLike }, p: number, dt: number) => void,
    onEnd?: () => void,
  ) => void;
  after: (sec: number, fn: () => void) => void;
  light: (x: number, z: number, y: number, color: unknown, strength: number, radius: number, dur: number) => void;
  shake: (amt: number, x: number, z: number) => void;
}

export interface SkillsExHelpers {
  Lt: (hex: number) => unknown;
  Mt: Record<string, string>;
  Xt: Record<string, string>;
  Ft: Record<string, number>;
  qe: Record<string, number>;
  sn: Record<string, number>;
  $n: Record<string, unknown>;
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
  vs: (...args: unknown[]) => void;
  oe: number;
}

export interface AreaStateLike {
  x: number;
  y?: number;
  z: number;
  radius: number;
  age: number;
  duration: number;
  t: number;
  phase: number;
  ownerId: number;
  slots: number[];
  meshes: GlowMeshHandle[];
  _isLiue?: boolean;
  _tsArenaCount?: number;
  _tsFlightBaseCount?: number;
  _lastX?: number;
  _lastY?: number;
  _lastZ?: number;
}

export function isUnitLiue(unit?: UnitLike): boolean {
  return unit?.heroId === 'liue';
}

function buffProgress(b: BuffLike, now: number): number {
  const dur = Math.max(0.05, b.duration ?? 1);
  if (typeof b.timeLeft === 'number') {
    return Math.max(0, Math.min(1, 1 - b.timeLeft / dur));
  }
  if (typeof b.startTime === 'number') {
    return Math.max(0, Math.min(1, (now - b.startTime) / dur));
  }
  return 0.5;
}

function envelopeLift(p: number, peak: number, attackFrac = 0.14, releaseFrac = 0.16, bobAmp = 0.16, bobCycles = 3): number {
  const clamped = Math.max(0, Math.min(1, p));
  let env = 1;
  if (clamped < attackFrac) {
    const k = clamped / attackFrac;
    env = 1 - (1 - k) * (1 - k);
  } else if (clamped > 1 - releaseFrac) {
    const k = (1 - clamped) / releaseFrac;
    env = Math.max(0, k * k);
  }
  const cruiseBob = clamped > attackFrac && clamped < 1 - releaseFrac ? Math.sin(clamped * Math.PI * bobCycles * 2) * bobAmp : 0;
  return Math.max(0, peak * env + cruiseBob * env);
}

/** 计算英雄当前的控制定格/染霜视觉状态与轻功腾空高度，完全不涉及逻辑数值 */
export function computeUnitVisualState(
  unit: UnitLike,
  now: number,
): { ccState: UnitCcState; flightKind: FlightKind; flightLift: number } {
  const buffs = unit.buffs;
  if (!buffs || buffs.length === 0) {
    return { ccState: '', flightKind: '', flightLift: 0 };
  }

  let hasPetrify = false;
  let hasInkSeal = false;
  let hasAirborne = false;
  let hasStrongSlow = false;
  let flightKind: FlightKind = '';
  let flightLift = 0;

  for (let i = 0; i < buffs.length; i++) {
    const b = buffs[i];
    if (b.id === 'ts_petrify') hasPetrify = true;
    else if (b.id === 'ts_ink_seal') hasInkSeal = true;
    else if (b.id === 'airborne') hasAirborne = true;
    else if (b.id === 'slow' && (b.value ?? 0) >= 0.25) hasStrongSlow = true;
    else if (b.id === 'chijin_spin') {
      flightKind = 'huarui';
      const p = buffProgress(b, now);
      flightLift = Math.max(flightLift, envelopeLift(p, 3.65, 0.1, 0.14, 0.18, 3));
    } else if (b.id === 'ts_qinggong_dash') {
      flightKind = 'huarui';
      const p = buffProgress(b, now);
      flightLift = Math.max(flightLift, Math.sin(Math.PI * Math.max(0, Math.min(1, p))) * 2.15);
    } else if (b.id === 'ts_qinggong_wencheng') {
      flightKind = 'wencheng';
      const p = buffProgress(b, now);
      flightLift = Math.max(flightLift, envelopeLift(p, 3.0, 0.18, 0.22, 0.18, 2));
    } else if (b.id === 'untargetable' && b.key === 'yeque_ult') {
      flightKind = 'xinqiji';
      const p = buffProgress(b, now);
      flightLift = Math.max(flightLift, Math.sin(Math.PI * Math.max(0, Math.min(1, p))) * 3.9);
    }
  }

  const ccState: UnitCcState = hasPetrify
    ? 'petrify'
    : hasInkSeal
      ? 'ink_seal'
      : hasAirborne
        ? 'airborne'
        : hasStrongSlow
          ? 'chill'
          : '';

  return { ccState, flightKind, flightLift };
}

/** 花蕊夫人御剑踏梅：创建脚下青金飞剑（horizontal +X blade）与高空剑光环 */
export function initChijinFlight(kit: SkillsExKit, area: AreaStateLike, fx: SkillsExHelpers): void {
  const { qe, sn, Lt } = fx;
  area._tsFlightBaseCount = area.meshes.length;
  area._lastX = area.x;
  area._lastY = 3.2;
  area._lastZ = area.z;

  // 清透竖直上升风柱（从地面直连高空飞剑，制造强立体纵深对比）
  const cone = area.meshes[0];
  if (cone) {
    cone.color(Lt(0x8ff5e0), 0.9, 0.65);
    cone.add = 0.24;
  }

  const blade = kit.glow.hold(qe.dagger, sn.solid);
  blade.color(Lt(0xa8fff0), 1.85, 0.92);
  blade.add = 0.35;
  area.meshes.push(blade);

  const hiltGlow = kit.glow.hold(qe.diamond, sn.core);
  hiltGlow.color(Lt(0xffe082), 2.15, 0.95);
  hiltGlow.add = 0.55;
  area.meshes.push(hiltGlow);

  const footHalo = kit.glow.hold(qe.hoop, sn.hoop);
  footHalo.color(Lt(0xff9eb8), 1.65, 0.92);
  footHalo.add = 0.4;
  area.meshes.push(footHalo);
}

/** 花蕊夫人御剑踏梅：3.65m 高空清晰御剑、通天升腾风柱、空中流光剑迹 */
export function updateChijinFlight(
  kit: SkillsExKit,
  area: AreaStateLike,
  dt: number,
  fx: SkillsExHelpers,
): void {
  const baseIdx = area._tsFlightBaseCount ?? 4;
  const p = Math.max(0, Math.min(1, area.duration > 0 ? area.age / area.duration : 0.5));
  const lift = envelopeLift(p, 3.65, 0.1, 0.14, 0.18, 3);
  const fade = Math.max(0, Math.min(1, (area.duration - area.age) * 3.2));
  const grow = Math.min(1, area.age * 4.5);
  const owner = kit.anchors.unit(area.ownerId);
  const facing = owner?.facing ?? area.age * 2.4;
  const hoverTilt = 0.06 * Math.sin(area.age * 6);

  // 1) 从地面（y=0.06）延伸至御剑脚底的细长升腾灵风柱，凸显地面影子与高空的高度差
  const cone = area.meshes[0];
  if (cone) {
    const colR = 0.72 * grow;
    const colH = Math.max(0.45, lift - 0.22);
    cone.at(area.x, 0.06, area.z).scale3(colR, colH, colR).rot(0, area.age * 6.5, 0);
    cone.a = (kit.lowQ ? 0.14 : 0.22) * fade;
  }

  // 2) 高空薄纱剑环：收轻透明度与直径，不遮挡角色御剑身姿
  for (let i = 1; i < baseIdx; i++) {
    const slash = area.meshes[i];
    if (!slash) continue;
    const c = area.radius * (0.76 + 0.06 * i) * (0.45 + 0.55 * grow);
    slash
      .at(area.x, lift + 0.38 + (i - 1) * 0.34, area.z)
      .scale(c)
      .rot(i === 1 ? 0.12 : i === 2 ? -0.12 : 0.04, area.phase + area.age * (12 + i) + (i * fx.oe) / 3, 0);
    slash.a = 0.36 * fade;
  }

  // 3) 脚下横置青金飞剑（qe.dagger 沿 +X 展平，rot.y = -facing 精准顺向踏剑而行）
  const blade = area.meshes[baseIdx];
  if (blade) {
    blade
      .at(area.x, Math.max(0.22, lift - 0.18), area.z)
      .scale3(3.6, 2.6, 2.8)
      .rot(0, -facing, hoverTilt);
    blade.a = 0.96 * fade;
  }
  const hilt = area.meshes[baseIdx + 1];
  if (hilt) {
    hilt
      .at(area.x, Math.max(0.22, lift - 0.18), area.z)
      .scale3(1.15, 0.32, 1.35)
      .rot(0, -facing, hoverTilt);
    hilt.a = 0.9 * fade;
  }
  const halo = area.meshes[baseIdx + 2];
  if (halo) {
    halo.at(area.x, Math.max(0.16, lift - 0.24), area.z).scale(1.42 * (0.65 + 0.35 * grow)).rot(0, area.age * 5.2, 0);
    halo.a = 0.82 * fade;
  }

  // 4) 空中御剑流光拖尾（翻墙掠空时在半空留下青金/绯红丝带轨迹）
  const lx = area._lastX ?? area.x;
  const ly = area._lastY ?? lift;
  const lz = area._lastZ ?? area.z;
  if (kit.ribbons && Math.hypot(area.x - lx, area.z - lz) > 0.36) {
    kit.ribbons.trace(fx.$n.string, lx, ly + 0.05, lz, area.x, lift + 0.05, area.z, 0.44, fx.Lt(0xa8fff0), fx.Lt(0xff6b88));
    area._lastX = area.x;
    area._lastY = lift;
    area._lastZ = area.z;
  }

  // 5) 地面垂直升腾气流线 + 高空落梅与绯绸
  if (kit.rnd.chance(Math.min(1, dt * 36))) {
    const a = kit.rnd.next() * fx.oe;
    const rr = area.radius * kit.rnd.range(0.32, 0.9);
    kit.particles
      .use(fx.Mt.streak)
      .tint(fx.Lt(0xa8fff0), fx.Lt(0xffffff))
      .spawn(
        area.x + Math.cos(a) * 0.65,
        kit.rnd.range(0.25, Math.max(0.8, lift * 0.5)),
        area.z + Math.sin(a) * 0.65,
        0,
        kit.rnd.range(6.5, 11.5),
        0,
        0.28,
        0.16,
        0.04,
        0,
      );
    kit.particles
      .use(fx.Mt.leaf)
      .tint(fx.Lt(0xff9eb8), fx.Lt(0xe83a5c))
      .spawn(
        area.x + Math.cos(a) * rr,
        lift + kit.rnd.range(0.2, 1.45),
        area.z + Math.sin(a) * rr,
        Math.cos(a) * 1.8,
        kit.rnd.range(-1.4, 0.4),
        Math.sin(a) * 1.8,
        0.58,
        0.28,
        0.16,
        0,
      );
    kit.particles
      .use(fx.Mt.silk)
      .tint(fx.Lt(0xffd896), fx.Lt(0xff6b88))
      .spawn(
        area.x + kit.rnd.signed() * 0.5,
        lift + kit.rnd.range(0.3, 1.1),
        area.z + kit.rnd.signed() * 0.5,
        kit.rnd.signed() * 1.5,
        kit.rnd.range(-0.6, 0.9),
        kit.rnd.signed() * 1.5,
        0.48,
        0.24,
        0.12,
        0,
      );
  }
}

/** 花蕊夫人二技能「凌波突进」：前中期立即可见的轻功御剑跃空弧线 */
export function playChijinDashFlight(
  kit: SkillsExKit,
  ev: { unitId?: number; from?: { x: number; y: number }; to?: { x: number; y: number }; dir?: { x: number; y: number } },
  fx: SkillsExHelpers,
): void {
  const uid = ev.unitId ?? -1;
  if (uid < 0 || !kit.track || !kit.anchor(uid)) return;
  const x0 = ev.from?.x ?? kit.a.x;
  const z0 = ev.from?.y ?? kit.a.z;
  if (kit.focusDist(x0, z0) > 54) return;

  const x1 = ev.to?.x ?? x0;
  const z1 = ev.to?.y ?? z0;
  const dist = Math.hypot(x1 - x0, z1 - z0);
  const dur = Math.max(0.34, dist / 14);
  const baseYaw = Math.atan2(ev.dir?.y ?? (z1 - z0), ev.dir?.x ?? (x1 - x0));

  const { qe, sn, Lt, Mt, $n } = fx;
  const blade = kit.glow.hold(qe.dagger, sn.solid);
  blade.color(Lt(0xa8fff0), 1.75, 0.9);
  blade.add = 0.35;

  const ring = kit.glow.hold(qe.hoop, sn.hoop);
  ring.color(Lt(0xff9eb8), 1.55, 0.9);
  ring.add = 0.35;

  const petal = kit.particles.use(Mt.leaf).tint(Lt(0xffb4c8), Lt(0xe83a5c));
  let prevX = x0;
  let prevY = 0.4;
  let prevZ = z0;

  kit.track(
    uid,
    dur,
    (u, p, dt) => {
      const fade = p > 0.78 ? Math.max(0, (1 - p) / 0.22) : Math.min(1, p * 6);
      const facing = u.unit?.facing ?? baseYaw;
      const by = Math.max(0.2, u.y - 0.14);

      blade.at(u.x, by, u.z).scale3(2.9, 2.2, 2.2).rot(0, -facing, -0.08 * Math.cos(Math.PI * p));
      blade.a = 0.92 * fade;
      ring.at(u.x, by - 0.06, u.z).scale(1.18).rot(0, p * fx.oe * 2, 0);
      ring.a = 0.72 * fade;

      if (kit.ribbons && Math.hypot(u.x - prevX, u.z - prevZ) > 0.28) {
        kit.ribbons.trace($n.string, prevX, prevY, prevZ, u.x, u.y + 0.55, u.z, 0.32, Lt(0xffe096), Lt(0xff6b88));
        prevX = u.x;
        prevY = u.y + 0.55;
        prevZ = u.z;
      }
      if (kit.rnd.chance(Math.min(1, dt * 32))) {
        petal.spawn(
          u.x + kit.rnd.signed() * 0.45,
          u.y + 0.55,
          u.z + kit.rnd.signed() * 0.45,
          kit.rnd.signed() * 1.4,
          kit.rnd.range(-0.6, 1.2),
          kit.rnd.signed() * 1.4,
          0.46,
          0.26,
          0.14,
          0,
        );
      }
    },
    () => {
      kit.glow.release(blade);
      kit.glow.release(ring);
    },
  );
}

/** 文成公主敦煌飞天：脚踏金莲祥云 + 飞天飘带 + 空中天音弦线 */
export function playWenchengFlight(
  kit: SkillsExKit,
  ev: { unitId?: number; pos?: { x: number; y: number }; targetPos?: { x: number; y: number } },
  fx: SkillsExHelpers,
): void {
  const uid = ev.unitId ?? -1;
  if (uid < 0 || !kit.track || !kit.anchor(uid)) return;
  const x0 = kit.a.x;
  const z0 = kit.a.z;
  if (kit.focusDist(x0, z0) > 54) return;

  const { qe, sn, Lt, Mt, Xt, $n, oe } = fx;
  const cGold = Lt(0xffdf7a);
  const cCoral = Lt(0xe86a3c);
  const cJade = Lt(0x7be0d0);

  // 脚下双层金色莲华祥云环（托管随英雄高空移动）
  const lotusOuter = kit.glow.hold(qe.hoop, sn.hoop);
  lotusOuter.color(cGold, 1.75, 0.92);
  lotusOuter.add = 0.42;

  const lotusInner = kit.glow.hold(qe.hoop, sn.hoop);
  lotusInner.color(cCoral, 1.45, 0.85);
  lotusInner.add = 0.32;

  kit.decals.add(Xt.star, x0, z0, 2.3, 1.85).params(8, 1.2).color(cGold, 1.7, 0.9).under(Lt(0x6e3a10), 0.35);

  const puff = kit.particles.use(Mt.puff).tint(Lt(0xfff4d6), cGold);
  const silk = kit.particles.use(Mt.silk).tint(cCoral, cGold);
  const glint = kit.particles.use(Mt.glint).tint(Lt(0xffffff), cJade);
  let stringAcc = 0;

  kit.track(
    uid,
    1.85,
    (u, p, dt) => {
      const lift = envelopeLift(p, 3.0, 0.18, 0.22, 0.18, 2);
      const fade = p > 0.8 ? Math.max(0, (1 - p) / 0.2) : Math.min(1, p * 5);
      const cy = Math.max(0.2, lift - 0.12);

      lotusOuter.at(u.x, cy, u.z).scale(1.45 * (0.7 + 0.3 * fade)).rot(0, p * oe * 1.8, 0);
      lotusOuter.a = 0.88 * fade;
      lotusInner.at(u.x, cy + 0.16, u.z).scale(0.95 * (0.7 + 0.3 * fade)).rot(0, -p * oe * 2.4, 0);
      lotusInner.a = 0.78 * fade;

      if (kit.rnd.chance(Math.min(1, dt * 26))) {
        const a = p * oe * 3 + kit.rnd.signed() * 0.4;
        puff.spawn(
          u.x + Math.cos(a) * 0.8,
          cy + 0.05,
          u.z + Math.sin(a) * 0.8,
          Math.cos(a) * 0.65,
          0.35,
          Math.sin(a) * 0.65,
          0.42,
          0.55,
          0.85,
          0,
        );
        silk.spawn(
          u.x + Math.cos(a) * 0.95,
          lift + 0.85,
          u.z + Math.sin(a) * 0.95,
          -Math.sin(a) * 1.9,
          0.55,
          Math.cos(a) * 1.9,
          0.46,
          0.28,
          0.14,
          0,
        );
        glint.spawn(
          u.x + kit.rnd.signed() * 0.7,
          lift + kit.rnd.range(0.3, 1.4),
          u.z + kit.rnd.signed() * 0.7,
          0,
          1.1,
          0,
          0.38,
          0.24,
          0.08,
          0,
        );
      }

      // 悬空前摇期间向目标箭阵拉出金色天音弧光弦
      stringAcc += dt;
      if (ev.targetPos && p < 0.52 && stringAcc >= 0.14 && kit.ribbons) {
        stringAcc = 0;
        const tx = ev.targetPos.x + kit.rnd.signed() * 1.4;
        const tz = ev.targetPos.y + kit.rnd.signed() * 1.4;
        kit.ribbons.trace($n.string, u.x, lift + 1.3, u.z, tx, 0.35, tz, 0.22, Lt(0xfff4c8), cGold);
      }
    },
    () => {
      kit.glow.release(lotusOuter);
      kit.glow.release(lotusInner);
    },
  );
}

/** 辛弃疾五十骑破营·隐踪期：目标头顶 3 道高空赤金持刀残影 + 绕空火影 */
export function playXinqijiAerialShadows(
  kit: SkillsExKit,
  ev: { unitId?: number; targetId?: number; pos?: { x: number; y: number } },
  fx: SkillsExHelpers,
): void {
  const tid = ev.targetId ?? -1;
  if (tid < 0 || !kit.track || !kit.anchor(tid)) return;
  if (kit.focusDist(kit.a.x, kit.a.z) > 54) return;

  const { qe, sn, Lt, Mt, oe } = fx;
  const cFlame = Lt(0xff6b2e);
  const cGold = Lt(0xffe08a);

  const clones: { body: GlowMeshHandle; blade: GlowMeshHandle; ring: GlowMeshHandle; ang: number }[] = [];
  for (let i = 0; i < 3; i++) {
    const body = kit.glow.hold(qe.pillar, sn.pillar);
    body.color(cFlame, 1.75, 0.85);
    body.add = 0.42;

    const blade = kit.glow.hold(qe.slash, sn.slash);
    blade.color(cGold, 2.0, 0);
    blade.add = 0.55;

    const ring = kit.glow.hold(qe.hoop, sn.hoop);
    ring.color(cFlame, 1.4, 0.8);
    ring.add = 0.3;

    clones.push({ body, blade, ring, ang: (i / 3) * oe + 0.35 });
  }

  const ember = kit.particles.use(Mt.ember).tint(cGold, cFlame);
  const streak = kit.particles.use(Mt.streak).tint(Lt(0xffffff), cGold);

  kit.track(
    tid,
    0.72,
    (u, p, dt) => {
      const emerge = Math.min(1, p * 4.5);
      const shrink = 1 - 0.32 * p * p;
      const rad = 2.85 * shrink;
      const hBase = 3.25 - p * 0.7;

      for (let i = 0; i < clones.length; i++) {
        const cl = clones[i];
        const a = cl.ang + p * 2.1;
        const cx = u.x + Math.cos(a) * rad;
        const cz = u.z + Math.sin(a) * rad;
        const yawToTarget = Math.atan2(u.x - cx, u.z - cz);

        cl.body.at(cx, hBase, cz).scale3(0.42, 1.65 * emerge, 0.42).rot(0.28, yawToTarget, 0);
        cl.body.a = 0.78 * emerge;
        cl.blade.at(cx, hBase + 0.75, cz).scale(1.35 * emerge).rot(0.45, yawToTarget + p * 6, 0.25);
        cl.blade.a = 0.92 * emerge;
        cl.ring.at(cx, hBase - 0.15, cz).scale(0.82 * emerge).rot(0, -a * 2, 0);
        cl.ring.a = 0.65 * emerge;
      }

      if (kit.rnd.chance(Math.min(1, dt * 40))) {
        const oa = p * oe * 4;
        const ox = u.x + Math.cos(oa) * rad * 0.92;
        const oz = u.z + Math.sin(oa) * rad * 0.92;
        ember.spawn(ox, hBase + 0.4, oz, -Math.sin(oa) * 3.5, 1.4, Math.cos(oa) * 3.5, 0.36, 0.28, 0.1, 0);
        streak.spawn(ox, hBase + 0.5, oz, (u.x - ox) * 4, -2.5, (u.z - oz) * 4, 0.16, 0.18, 0.05, 0);
      }
    },
    () => {
      for (const cl of clones) {
        kit.glow.release(cl.body);
        kit.glow.release(cl.blade);
        kit.glow.release(cl.ring);
      }
    },
  );
}

/** 辛弃疾五十骑破营·现身瞬：4 方位高空残影交叉俯冲十字斩 */
export function playXinqijiCrossDive(
  kit: SkillsExKit,
  ev: { pos?: { x: number; y: number } },
  fx: SkillsExHelpers,
): void {
  const x = ev.pos?.x ?? 0;
  const z = ev.pos?.y ?? 0;
  if (kit.focusDist(x, z) > 54) return;
  const { qe, sn, Lt, $n, oe } = fx;
  const cFlame = Lt(0xff5a22);
  const cGold = Lt(0xffebaa);

  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * oe + 0.4;
    const sx = x + Math.cos(a) * 3.1;
    const sz = z + Math.sin(a) * 3.1;
    const yaw = Math.atan2(x - sx, z - sz);
    if (kit.ribbons) {
      kit.ribbons.trace($n.fire, sx, 3.6, sz, x - Math.cos(a) * 1.2, 0.3, z - Math.sin(a) * 1.2, 0.24, cGold, cFlame);
    }
    kit.glow
      .spawn(qe.slash, sn.slash, 0.28)
      .at(x, 1.15, z)
      .scale(2.8)
      .rot(0.58 * (i % 2 === 0 ? 1 : -1), yaw, 0.35)
      .color(i % 2 === 0 ? cGold : cFlame, 2.2, 0.95)
      .fade(0.02, 0.2);
  }
}

/** 刘娥「青石石化」触发特效：脚下裂纹青石莲座 + 紫金封印环 */
export function playPetrifyCast(kit: SkillsExKit, x: number, z: number, fx: SkillsExHelpers): void {
  const { qe, sn, Lt, Mt, Xt, oe } = fx;
  const stoneC = Lt(0x7c8792);
  const sealC = Lt(0xd488ff);
  kit.decals.add(Xt.cracks, x, z, 2.0, 0.85).params(0, 0.2).color(sealC, 1.5, 0.85).under(Lt(0x281e36), 0.72);
  kit.glow.spawn(qe.hoop, sn.hoop, 0.75).at(x, 0.9, z).scale(1.18).rot(0, 0.4, 0).color(sealC, 1.8, 0.9).fade(0.03, 0.16);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * oe;
    const rx = x + Math.cos(a) * 0.68;
    const rz = z + Math.sin(a) * 0.68;
    kit.glow
      .spawn(qe.rock, sn.solid, 0.78)
      .at(rx, 0.22, rz)
      .scale3(0.42, 0.72, 0.42)
      .rot(0.18, a, -0.15)
      .color(stoneC, 1.05, 0.95)
      .fade(0.03, 0.16);
  }
  const deb = kit.particles.use(Mt.debris).tint(Lt(0xa6b2be), Lt(0x4a525c));
  for (let i = 0; i < kit.n(8); i++) {
    const a = (i / 8) * oe;
    deb.spawn(x + Math.cos(a) * 0.5, 0.35, z + Math.sin(a) * 0.5, Math.cos(a) * 1.4, 2.4, Math.sin(a) * 1.4, 0.4, 0.2, 0.12, 0);
  }
}

/** 刘娥「石化解除」碎石炸裂特效 */
export function playPetrifyBreak(
  kit: SkillsExKit,
  ev: { targetId?: number; pos?: { x: number; y: number } },
  fx: SkillsExHelpers,
): void {
  const tid = ev.targetId ?? -1;
  const u = tid >= 0 && kit.anchor(tid) ? kit.a : null;
  const x = u?.x ?? ev.pos?.x ?? 0;
  const z = u?.z ?? ev.pos?.y ?? 0;
  if (kit.focusDist(x, z) > 48) return;
  const { qe, sn, Lt, Mt, bn, oe } = fx;
  const stoneLight = Lt(0xcbd5df);
  const stoneDark = Lt(0x4f5963);
  bn(kit, x, z, 2.1, 0.28, Lt(0xe8d4ff), 1.45, 0.22, 0.2);

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * oe + kit.rnd.signed() * 0.2;
    const sp = kit.rnd.range(2.6, 4.6);
    const m = kit.glow
      .spawn(qe.rock, sn.solid, 0.42)
      .at(x + Math.cos(a) * 0.45, 0.85, z + Math.sin(a) * 0.45)
      .scale3(0.28, 0.24, 0.28)
      .rot(i, a, i * 0.6)
      .color(stoneLight, 1.15, 0.9)
      .fade(0.01, 0.24);
    m.vel?.(Math.cos(a) * sp, kit.rnd.range(2.8, 4.8), Math.sin(a) * sp);
    m.spin?.(5, 7, 4);
  }

  const deb = kit.particles.use(Mt.debris).tint(stoneLight, stoneDark);
  for (let i = 0; i < kit.n(18); i++) {
    const a = kit.rnd.next() * oe;
    const sp = kit.rnd.range(2.8, 6.2);
    deb.spawn(
      x + kit.rnd.signed() * 0.35,
      kit.rnd.range(0.5, 1.4),
      z + kit.rnd.signed() * 0.35,
      Math.cos(a) * sp,
      kit.rnd.range(2.6, 6.4),
      Math.sin(a) * sp,
      0.48,
      0.26,
      0.14,
      0,
    );
  }
}

/** 苏轼「赤壁墨封」触发特效：宣纸墨圈 + 悬停墨滴 + 青玉清音环 */
export function playInkSealCast(kit: SkillsExKit, x: number, z: number, fx: SkillsExHelpers): void {
  const { qe, sn, Lt, Mt, Xt, oe } = fx;
  const jadeC = Lt(0x64e0cb);
  const inkC = Lt(0x162226);
  kit.decals.add(Xt.swirl, x, z, 2.2, 0.82).params(3, -1.8).color(jadeC, 1.4, 0.9).under(inkC, 0.82);
  kit.glow.spawn(qe.hoop, sn.hoop, 0.78).at(x, 0.95, z).scale(1.15).rot(0, -0.6, 0).color(jadeC, 1.65, 0.92).fade(0.04, 0.18);
  const ink = kit.particles.use(Mt.ink);
  for (let i = 0; i < kit.n(10); i++) {
    const a = (i / 10) * oe;
    ink.spawn(x + Math.cos(a) * 0.75, 0.9, z + Math.sin(a) * 0.75, Math.cos(a) * 0.8, 0.45, Math.sin(a) * 0.8, 0.65, 0.55, 0.82, 0);
  }
}

/** 苏轼「墨封解除」：墨滴与青绿竹叶飘散 */
export function playInkSealBreak(
  kit: SkillsExKit,
  ev: { targetId?: number; pos?: { x: number; y: number } },
  fx: SkillsExHelpers,
): void {
  const tid = ev.targetId ?? -1;
  const u = tid >= 0 && kit.anchor(tid) ? kit.a : null;
  const x = u?.x ?? ev.pos?.x ?? 0;
  const z = u?.z ?? ev.pos?.y ?? 0;
  if (kit.focusDist(x, z) > 48) return;
  const { Lt, Mt, oe } = fx;
  const inkDot = kit.particles.use(Mt.inkDot);
  const leaf = kit.particles.use(Mt.leaf).tint(Lt(0x8af2df), Lt(0x287872));
  for (let i = 0; i < kit.n(12); i++) {
    const a = kit.rnd.next() * oe;
    const sp = kit.rnd.range(2.2, 5.2);
    inkDot.spawn(x, 0.9, z, Math.cos(a) * sp, kit.rnd.range(1.8, 4.2), Math.sin(a) * sp, 0.48, 0.24, 0.1, 0);
    if (i % 2 === 0) {
      leaf.spawn(x, 1.0, z, Math.cos(a) * sp * 0.8, kit.rnd.range(1.2, 3.0), Math.sin(a) * sp * 0.8, 0.56, 0.28, 0.16, 0);
    }
  }
}

/** 刘娥二技能「合围统御」：半空天降巨型鎏金凤印玉玺虚影 */
export function initLiueSealWell(kit: SkillsExKit, area: AreaStateLike, fx: SkillsExHelpers): void {
  if (!area._isLiue) return;
  const { qe, sn, Lt } = fx;
  const cPurple = Lt(0xc862ff);
  const cGold = Lt(0xffe07a);

  const sealBase = kit.glow.hold(qe.pillar, sn.solid);
  sealBase.color(cPurple, 1.45, 0.82);

  const sealKnob = kit.glow.hold(qe.diamond, sn.core);
  sealKnob.color(cGold, 1.8, 0.9);
  sealKnob.add = 0.4;

  const sealRing = kit.glow.hold(qe.hoop, sn.hoop);
  sealRing.color(cGold, 1.5, 0.85);
  sealRing.add = 0.35;

  area.meshes.push(sealBase, sealKnob, sealRing);
}

export function updateLiueSealWell(area: AreaStateLike): void {
  if (!area._isLiue || area.meshes.length < 4) return;
  const t = Math.max(0, Math.min(1, area.t));
  const dropY = 5.6 - 4.55 * (t * t * t);
  const fade = Math.min(1, area.age * 4.5);
  const sealBase = area.meshes[1];
  const sealKnob = area.meshes[2];
  const sealRing = area.meshes[3];
  const s = area.radius * 0.46;

  sealBase.at(area.x, dropY, area.z).scale3(s, 0.72, s).rot(0, area.age * 0.9, 0);
  sealBase.a = 0.52 * fade;
  sealKnob.at(area.x, dropY + 0.85, area.z).scale3(s * 0.48, 0.56, s * 0.48).rot(0, area.age * 1.4, 0);
  sealKnob.a = 0.74 * fade;
  sealRing.at(area.x, dropY + 0.15, area.z).scale(s * 1.25).rot(0, -area.age * 2.5, 0);
  sealRing.a = 0.72 * fade;
}

export function playLiueSealSlam(kit: SkillsExKit, x: number, z: number, radius: number, fx: SkillsExHelpers): void {
  const { qe, sn, Lt, Xt, bn } = fx;
  kit.decals.add(Xt.rune, x, z, radius * 1.08, 1.15).params(4, 0.25).color(Lt(0xffe084), 2.1, 0.96).under(Lt(0x4a166e), 0.75);
  kit.glow.spawn(qe.pillar, sn.pillar, 0.42).at(x, 0.05, z).scale3(radius * 0.48, 3.8, radius * 0.48).color(Lt(0xd46aff), 1.9, 0.9).fade(0.02, 0.3);
  bn(kit, x, z, radius * 1.05, 0.42, Lt(0xffe084), 1.85, 0.26, 0.22);
}

/** 苏轼大招「赤壁惊涛」：青绿水墨浪墙弧与环绕竹简诗卷 */
export function playSushiWaveWall(kit: SkillsExKit, x: number, z: number, radius: number, fx: SkillsExHelpers): void {
  const { qe, sn, Lt, Mt, oe } = fx;
  const cJade = Lt(0x52e0c8);
  const cInk = Lt(0x162426);

  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * oe + kit.rnd.range(-0.2, 0.2);
    kit.glow
      .spawn(qe.slash, sn.slash, 0.48)
      .at(x, 0.9, z)
      .scale(radius * 0.92)
      .rot(Math.PI * 0.42, a, 0)
      .color(cJade, 1.65, 0.92)
      .fade(0.05, 0.26);
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * oe + kit.rnd.range(-0.15, 0.15);
    const rr = radius * 0.78;
    kit.glow
      .spawn(qe.pillar, sn.solid, 0.56)
      .at(x + Math.cos(a) * rr, 0.8 + kit.rnd.range(0, 0.5), z + Math.sin(a) * rr)
      .scale3(0.16, 0.95, 0.34)
      .rot(0.15, -a, 0.1)
      .color(Lt(0xdfecc8), 1.25, 0.88)
      .fade(0.06, 0.24);
  }
  const ink = kit.particles.use(Mt.ink);
  for (let i = 0; i < kit.n(8); i++) {
    const a = (i / 8) * oe;
    ink.spawn(x + Math.cos(a) * radius * 0.6, 0.6, z + Math.sin(a) * radius * 0.6, Math.cos(a) * 1.6, 1.2, Math.sin(a) * 1.6, 0.55, 0.65, 1.05, 0);
  }
  void cInk;
}

/** 秦琼大招起跳：霸王滞空鎏金威压光环追踪 */
export function playQinqiongTitanLeap(
  kit: SkillsExKit,
  ev: { unitId?: number; pos?: { x: number; y: number } },
  fx: SkillsExHelpers,
): void {
  const uid = ev.unitId ?? -1;
  if (uid < 0 || !kit.track || !kit.anchor(uid)) return;
  const { qe, sn, Lt } = fx;
  const cGold = Lt(0xf6c95e);
  const cCrimson = Lt(0xe04f2a);

  const aura = kit.glow.hold(qe.hoop, sn.hoop);
  aura.color(cGold, 1.85, 0.92);
  aura.add = 0.42;

  const crown = kit.glow.hold(qe.cone, sn.vortex);
  crown.color(cCrimson, 1.15, 0.8);
  crown.add = 0.3;

  kit.track(
    uid,
    0.76,
    (u, p) => {
      const lift = Math.pow(Math.max(0, 4 * p * (1 - p)), 0.72) * 4.65;
      const fade = p > 0.82 ? Math.max(0, (1 - p) / 0.18) : 1;
      aura.at(u.x, lift + 0.9, u.z).scale(1.65 * (0.7 + 0.3 * Math.sin(Math.PI * p))).rot(0.18, p * 8, 0);
      aura.a = 0.88 * fade;
      crown.at(u.x, lift + 0.25, u.z).scale3(1.1, 1.8, 1.1).rot(Math.PI, -p * 6, 0);
      crown.a = 0.46 * fade;
    },
    () => {
      kit.glow.release(aura);
      kit.glow.release(crown);
    },
  );
}

/** 秦琼大招落地：减速区外缘拔地升起 8 根玄铁断碑石柱结界 */
export function initQinqiongArena(kit: SkillsExKit, area: AreaStateLike, fx: SkillsExHelpers): void {
  const { qe, sn, Lt, Mt, oe } = fx;
  const count = kit.lowQ ? 6 : 8;
  area._tsArenaCount = count;
  const stoneIron = Lt(0x3a404c);

  for (let i = 0; i < count; i++) {
    const pillar = kit.glow.hold(i % 2 === 0 ? qe.rock : qe.spike, sn.solid);
    pillar.color(stoneIron, 1.1, 0.95);
    area.meshes.push(pillar);
    const a = area.phase + (i / count) * oe;
    const px = area.x + Math.cos(a) * area.radius * 0.94;
    const pz = area.z + Math.sin(a) * area.radius * 0.94;
    kit.particles.use(Mt.debris).tint(Lt(0x8d8272), Lt(0x383430)).spawn(px, 0.2, pz, Math.cos(a) * 1.4, 3.6, Math.sin(a) * 1.4, 0.5, 0.26, 0.14, 0);
  }
}

export function updateQinqiongArena(area: AreaStateLike, fx: SkillsExHelpers): void {
  const count = area._tsArenaCount ?? 0;
  if (count <= 0 || area.meshes.length < count) return;
  const emerge = Math.min(1, area.age / 0.18);
  const fade = Math.max(0, Math.min(1, (area.duration - area.age) / 0.26));
  const r = area.radius * 0.94;
  for (let i = 0; i < count; i++) {
    const m = area.meshes[i];
    const a = area.phase + (i / count) * fx.oe;
    const px = area.x + Math.cos(a) * r;
    const pz = area.z + Math.sin(a) * r;
    const h = (i % 2 === 0 ? 1.55 : 1.9) * emerge * (0.45 + 0.55 * fade);
    m.at(px, -0.35 + h * 0.42, pz).scale3(0.56, Math.max(0.15, h), 0.56).rot(0.16 * Math.cos(a), a + 0.5, 0.16 * Math.sin(a));
    m.a = 0.95 * fade;
  }
}

export const TANGSONG_SKILLS_EX_API = {
  isUnitLiue,
  computeUnitVisualState,
  initChijinFlight,
  updateChijinFlight,
  playChijinDashFlight,
  playWenchengFlight,
  playXinqijiAerialShadows,
  playXinqijiCrossDive,
  playPetrifyCast,
  playPetrifyBreak,
  playInkSealCast,
  playInkSealBreak,
  initLiueSealWell,
  updateLiueSealWell,
  playLiueSealSlam,
  playSushiWaveWall,
  playQinqiongTitanLeap,
  initQinqiongArena,
  updateQinqiongArena,
  resolveKitOf: kitOf,
} as const;
