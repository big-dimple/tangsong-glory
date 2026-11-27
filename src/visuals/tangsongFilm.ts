/**
 * tangsongFilm.ts — 成片参数表、水墨阵亡、大招曝光呼吸与入画镜头。
 *
 * 内核已经有一条完整的成片链（半浮点 HDR → 泛光 → 色调映射 → 调色 → 抖动），这里不建第二条，
 * 只做三件事：
 *   1. 每帧把下面这张表写进内核的调色参数（内核会按画质档把泛光与霾覆盖成自己的默认值）；
 *   2. 给合成着色器换一行：阵亡不再是整屏冷灰，而是墨从四周洇进来、朱色留三成；
 *   3. 两段只靠改参数的演出：大招时整张画暗一下再亮回来；开局镜头从略高略远处落进画里。
 * low 档没有后期，1、2 自动不生效（内核回落到 CSS 灰度），画面仍然完整。
 */
import { cinematicFlowEnabled, prefersReducedMotion } from '../ui/tangsongMotion';

/** 成片参数表：只让金、火、技能核心发光；远处冷而淡。数值对着 Vulkan 实机 A/B 截图定。 */
export const TANGSONG_FILM = {
  exposure: 1.02,
  vignette: 0.18,
  /** 屏幕上沿（远处）薄霾的颜色：淡石青雾灰，贴合石绿草地并取代原先的暖米色。 */
  hazeColor: 0xb9c9c8,
  quality: {
    high: { bloom: 0.33, bloomThreshold: 1.6, haze: 0.11 },
    medium: { bloom: 0.25, bloomThreshold: 1.6, haze: 0.075 },
  } as Record<string, { bloom: number; bloomThreshold: number; haze: number } | undefined>,
  /** 大招曝光呼吸：90ms 压到 -12%，再约 380ms 指数回弹；暗角同步加深。 */
  ultPulse: { depth: 0.12, attack: 0.09, release: 0.11, vignette: 0.14 },
  /** 入画镜头：先停 0.3s（手卷正在收），再用临界阻尼落到预设，全程约 1.8s。 */
  entry: { hold: 0.3, stiffness: 5, duration: 1.8, distanceScale: 0.4, pitchLift: (7 * Math.PI) / 180 },
} as const;

// ── 水墨阵亡：替换内核合成着色器里的一行 ──
const DEATH_ANCHOR = '  c = mix(c, vec3(g) * vec3(0.92, 0.97, 1.08), uDesaturate);';
const MAIN_ANCHOR = 'void main() {';

const INK_HELPERS = `
// 绢纹噪声：两层值噪声，给墨的洇化边缘一点纤维感
float tsPaper(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
`;

const INK_BODY = `  // 水墨阵亡：墨从四周洇进来，颜色被洗走只剩墨；朱色留三成。进度沿用 uDesaturate(0..0.9)
  // 活着的时候 uDesaturate 为 0，整段跳过，常驻开销为零
  if (uDesaturate > 0.001) {
    float tsP = clamp(uDesaturate / 0.9, 0.0, 1.0);
    #ifdef TS_INK_FLAT
    float tsInk = tsP;
    #else
    vec2 tsUv = (vUv - 0.5) * vec2(uAspect, 1.0);
    float tsR = length((vUv - 0.5) * vec2(min(uAspect, 1.8) / 1.8, 1.0)) * 1.6;
    float tsN = (tsPaper(tsUv * 9.0) + 0.5 * tsPaper(tsUv * 23.0)) / 1.5 - 0.5;
    float tsFront = 1.6 - 2.0 * tsP;
    float tsInk = smoothstep(tsFront - 0.12, tsFront + 0.22, tsR + tsN * 0.35);
    // 洇化前沿略深一线：墨在纸上走到头会积一圈
    c *= 1.0 - 0.16 * tsInk * (1.0 - tsInk) * 4.0;
    #endif
    float tsZhu = clamp((c.r - max(c.g, c.b)) * 3.0, 0.0, 1.0);
    c = mix(c, vec3(g) * vec3(1.0, 0.985, 0.95), tsInk * 0.9 * (1.0 - 0.3 * tsZhu));
  }`;

/** K1：给内核合成着色器做锚点替换。任何一个锚点对不上就原样返回，不做半生效的替换。 */
export function patchFinalShader(source: string): string {
  if (source.split(DEATH_ANCHOR).length !== 2 || source.split(MAIN_ANCHOR).length !== 2) return source;
  if (!source.includes('float hash(vec2 p)') || !source.includes('uniform float uAspect;')) return source;
  return source.replace(MAIN_ANCHOR, `${INK_HELPERS}${MAIN_ANCHOR}`).replace(DEATH_ANCHOR, INK_BODY);
}

// ── 每帧钩子（K2） ──
interface FilmEngineLike {
  quality: string;
  grade: {
    exposure: number;
    bloomStrength: number;
    haze: number;
    vignette: number;
    hazeColor?: { setHex?: (hex: number) => unknown };
  };
  post: null | {
    bloomPass?: { threshold?: { x: number } };
    finalPass?: { material?: { defines?: Record<string, string>; needsUpdate?: boolean } };
  };
  rig?: { distance: number; pitch: number; applyLens?: () => void };
}

interface FilmRendererLike {
  engine?: FilmEngineLike;
}

const toned = new WeakSet<object>();
let ultPulseAge = Infinity;
let entryAge = Infinity;

/** 我方大招出手时调用。减少动态下不呼吸。 */
export function pulseUltExposure(): void {
  if (!prefersReducedMotion()) ultPulseAge = 0;
}

/** 进入对局时调用：只在完整菜单流里播放入画镜头。 */
export function beginEntryShot(): void {
  entryAge = cinematicFlowEnabled() ? 0 : Infinity;
}

function ultPulseLevel(): number {
  const { attack, release } = TANGSONG_FILM.ultPulse;
  if (!(ultPulseAge < attack + release * 6)) return 0;
  if (ultPulseAge < attack) {
    const k = ultPulseAge / attack;
    return k * k * (3 - 2 * k);
  }
  return Math.exp(-(ultPulseAge - attack) / release);
}

function applyGrade(engine: FilmEngineLike): void {
  const post = engine.post;
  if (!post) return;
  const look = TANGSONG_FILM.quality[engine.quality];
  if (!look) return;
  const grade = engine.grade;
  grade.bloomStrength = look.bloom;
  grade.haze = look.haze;
  const threshold = post.bloomPass?.threshold;
  if (threshold) threshold.x = look.bloomThreshold;
  if (!toned.has(grade)) {
    toned.add(grade);
    grade.hazeColor?.setHex?.(TANGSONG_FILM.hazeColor);
  }
  const pulse = ultPulseLevel();
  grade.exposure = TANGSONG_FILM.exposure * (1 - TANGSONG_FILM.ultPulse.depth * pulse);
  grade.vignette = TANGSONG_FILM.vignette + TANGSONG_FILM.ultPulse.vignette * pulse;

  // 减少动态：墨不做径向洇化，整屏一起褪色
  const material = post.finalPass?.material;
  if (material?.defines) {
    const flat = prefersReducedMotion();
    if (flat !== 'TS_INK_FLAT' in material.defines) {
      if (flat) material.defines.TS_INK_FLAT = '';
      else delete material.defines.TS_INK_FLAT;
      material.needsUpdate = true;
    }
  }
}

function applyEntryShot(engine: FilmEngineLike): void {
  const rig = engine.rig;
  if (!rig || typeof rig.applyLens !== 'function') {
    entryAge = Infinity;
    return;
  }
  // 先让内核按当前预设与屏幕比例算出基准镜头，再在它上面叠加偏移；结束时这一步就是复位
  rig.applyLens();
  const { hold, stiffness, duration, distanceScale, pitchLift } = TANGSONG_FILM.entry;
  if (entryAge >= duration) {
    entryAge = Infinity;
    return;
  }
  const t = Math.max(0, entryAge - hold);
  const k = (1 + stiffness * t) * Math.exp(-stiffness * t);
  rig.distance *= 1 + distanceScale * k;
  rig.pitch -= pitchLift * k;
}

/** K2 每帧钩子：内核推进完阵亡色调之后、渲染之前调用。 */
export function filmFrame(renderer: FilmRendererLike | null | undefined, dt: number): void {
  const engine = renderer?.engine;
  if (!engine) return;
  const step = dt > 0 ? Math.min(dt, 0.1) : 0;
  ultPulseAge += step;
  applyGrade(engine);
  if (entryAge !== Infinity) {
    applyEntryShot(engine);
    entryAge += step;
  }
}
