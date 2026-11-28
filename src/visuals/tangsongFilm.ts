/**
 * tangsongFilm.ts — 成片参数表（Blender AgX + 暖色 Halation + 三角时间抖动）、水墨阵亡、大招曝光呼吸与入画镜头。
 *
 * 复用内核 HDR → 泛光 → 合成链路，在此基础上注入源自 5MB 视觉工程的核心成片手法：
 *   1. Blender AgX 色调映射（高光保持暖金、朱砂、天青本色，不漂白偏黄）；
 *   2. 暖色 Halation 辉光（为宫灯、烈焰与大招增润一圈胶片暖红金晕）；
 *   3. 中间调保护微胶片颗粒 + 三角分布时间抖动（消除云海、远岚、暗角色带且锁定纯白）；
 *   4. 水墨阵亡（朱色留三成）、大招曝光脉冲与开局入画阻尼镜头。
 */
import { cinematicFlowEnabled, prefersReducedMotion } from '../ui/tangsongMotion';

/** 成片参数表：石青远岚压底，适配 Blender AgX 暖调柔焦肩部与暖金 Halation。 */
export const TANGSONG_FILM = {
  exposure: 1.15,
  vignette: 0.21,
  contrast: 1.06,
  saturation: 1.09,
  vibrance: 0.1,
  /** 屏幕上沿（远处）薄霾的颜色：淡石青云岚，呼应青绿远山与石绿草地。 */
  hazeColor: 0xbed2ce,
  quality: {
    high: { bloom: 0.34, bloomThreshold: 1.38, haze: 0.14 },
    medium: { bloom: 0.25, bloomThreshold: 1.44, haze: 0.1 },
  } as Record<string, { bloom: number; bloomThreshold: number; haze: number } | undefined>,
  /** 大招曝光脉冲：75ms 快速聚光压暗(-22%)并起暗角与泛光 → 稳住 80ms → 指数回弹。 */
  ultPulse: { depth: 0.22, attack: 0.075, hold: 0.08, release: 0.16, vignette: 0.26, bloomBoost: 0.2 },
  /** 入画镜头：先停 0.28s（破纸揭幕），再用临界阻尼落到预设，全程约 1.8s。 */
  entry: { hold: 0.28, stiffness: 5, duration: 1.8, distanceScale: 0.4, pitchLift: (7 * Math.PI) / 180 },
} as const;

// ── 合成着色器锚点 ──
const UNIFORM_ANCHOR = 'uniform float uDim;';
const MAIN_ANCHOR = 'void main() {';
const BLOOM_ANCHOR = '  c += texture2D(tBloom, vUv).rgb * uBloom;';
const TONEMAP_ANCHOR = '  c = CustomToneMapping(c);';
const DEATH_ANCHOR = '  c = mix(c, vec3(g) * vec3(0.92, 0.97, 1.08), uDesaturate);';
const DITHER_ANCHOR = '  gl_FragColor.rgb += (hash(gl_FragCoord.xy) - 0.5) / 255.0;';

const FILM_HELPERS = `
// 3D 时间哈希：用于中间调微颗粒与三角分布时间抖动
float tsHash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}

// Blender AgX 色调映射（高光保留唐宋金红翠青本色，肩部柔和过渡不发白偏黄）
vec3 tsAgx(vec3 v) {
  const mat3 M = mat3(
    0.842479062253094, 0.0423282422610123, 0.0423756549057051,
    0.0784335999999992, 0.878468636469772, 0.0784336,
    0.0792237451477643, 0.0791661274605434, 0.879142973793104
  );
  v = M * max(v, 0.0);
  v = clamp(log2(max(v, 1e-10)), -12.47393, 4.026069);
  v = (v + 12.47393) / (4.026069 + 12.47393);
  vec3 x2 = v * v, x4 = x2 * x2;
  v = 15.5 * x4 * x2 - 40.14 * x4 * v + 31.96 * x4 - 6.868 * x2 * v + 0.4298 * x2 + 0.1191 * v - 0.00232;
  const mat3 I = mat3(
    1.19687900512017, -0.0528968517574562, -0.0529716355144438,
    -0.0980208811401368, 1.15190312990417, -0.0980434501171241,
    -0.0990297440797205, -0.0989611768448433, 1.15107367264116
  );
  return pow(max(I * v, 0.0), vec3(2.2));
}

// 绢纹噪声：两层值噪声，给墨的洇化边缘一点纤维感
float tsPaper(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
`;

const HALATION_BODY = `  // 暖色 Halation 辉光（源自 5MB 胶片合成：红通道微涨、蓝通道微收）
  c += texture2D(tBloom, vUv).rgb * uBloom * vec3(1.16, 1.0, 0.84);`;

const AGX_TONEMAP_BODY = `  c = tsAgx(max(c, 0.0) * toneMappingExposure);`;

const INK_BODY = `  // 水墨阵亡：墨从四周洇进来，颜色被洗走只剩墨；朱色留三成。进度沿用 uDesaturate(0..0.9)
  // 活着的时候 uDesaturate 为 0，整段跳过，常驻开销为零
  if (uDesaturate > 0.001) {
    float tsP = clamp(uDesaturate / 0.9, 0.0, 1.0);
    #ifdef TS_INK_FLAT
    float tsInk = tsP;
    #else
    vec2 tsUv = (vUv - 0.5) * vec2(uAspect, 1.0);
    float tsR = length((vUv - 0.5) * 1.6);
    float tsN = (tsPaper(tsUv * 9.0) + 0.5 * tsPaper(tsUv * 23.0)) / 1.5 - 0.5;
    float tsFront = 1.6 - 2.0 * tsP;
    float tsInk = smoothstep(tsFront - 0.12, tsFront + 0.22, tsR + tsN * 0.35);
    // 洇化前沿略深一线：墨在纸上走到头会积一圈
    c *= 1.0 - 0.16 * tsInk * (1.0 - tsInk) * 4.0;
    #endif
    float tsZhu = clamp((c.r - max(c.g, c.b)) * 3.0, 0.0, 1.0);
    c = mix(c, vec3(g) * vec3(1.0, 0.985, 0.95), tsInk * 0.9 * (1.0 - 0.3 * tsZhu));
  }`;

const DITHER_BODY = `  // 中间调微胶片颗粒 + 三角 PDF 时间抖动（彻底消色带且锁定纯白 >0.9985）
  float tsLum = dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  float tsGr = (tsHash13(vec3(gl_FragCoord.xy, fract(uTsTime * 7.3) * 97.0)) - 0.5) * 0.014 * (1.0 - abs(tsLum - 0.5));
  vec3 tsBase = clamp(gl_FragColor.rgb + tsGr, 0.0, 1.0);
  float tsTri = tsHash13(vec3(gl_FragCoord.xy, fract(uTsTime) * 61.0)) + tsHash13(vec3(gl_FragCoord.xy, fract(uTsTime) * 61.0 + 7.0)) - 1.0;
  gl_FragColor.rgb = all(greaterThan(tsBase, vec3(0.9985))) ? vec3(1.0) : clamp(tsBase + tsTri / 255.0, 0.0, 1.0);`;

/** K1：给内核合成着色器做多锚点精确替换。任意锚点对不上即原样返回，不做半生效替换。 */
export function patchFinalShader(source: string): string {
  const anchors = [UNIFORM_ANCHOR, MAIN_ANCHOR, BLOOM_ANCHOR, TONEMAP_ANCHOR, DEATH_ANCHOR, DITHER_ANCHOR];
  if (anchors.some((a) => source.split(a).length !== 2)) return source;
  if (!source.includes('float hash(vec2 p)') || !source.includes('uniform float uAspect;')) return source;

  return source
    .replace(UNIFORM_ANCHOR, `${UNIFORM_ANCHOR}\nuniform float uTsTime;`)
    .replace(MAIN_ANCHOR, `${FILM_HELPERS}${MAIN_ANCHOR}`)
    .replace(BLOOM_ANCHOR, HALATION_BODY)
    .replace(TONEMAP_ANCHOR, AGX_TONEMAP_BODY)
    .replace(DEATH_ANCHOR, INK_BODY)
    .replace(DITHER_ANCHOR, DITHER_BODY);
}

// ── 每帧钩子（K2） ──
interface FilmEngineLike {
  quality: string;
  grade: {
    exposure: number;
    bloomStrength: number;
    contrast?: number;
    saturation?: number;
    vibrance?: number;
    haze: number;
    vignette: number;
    hazeColor?: { setHex?: (hex: number) => unknown };
  };
  post: null | {
    bloomPass?: { threshold?: { x: number } };
    finalPass?: {
      material?: {
        defines?: Record<string, string>;
        uniforms?: { uTsTime?: { value: number } };
        needsUpdate?: boolean;
      };
    };
  };
  rig?: { distance: number; pitch: number; applyLens?: () => void };
}

interface FilmRendererLike {
  engine?: FilmEngineLike;
}

interface FilmStateLike {
  playerId?: number;
  heroes?: { id: number; alive?: boolean; buffs?: { id: string; key?: string }[] }[];
}

const toned = new WeakSet<object>();
let ultPulseAge = Infinity;
let entryAge = Infinity;
let flightZoom = 0;
let filmTime = 0;

function isPlayerFlying(state: FilmStateLike | null | undefined): boolean {
  const heroes = state?.heroes;
  if (!heroes) return false;
  const me = heroes.find((h) => h.id === state?.playerId) ?? heroes[0];
  if (!me || me.alive === false || !me.buffs) return false;
  return me.buffs.some(
    (b) =>
      b.id === 'chijin_spin' ||
      b.id === 'ts_qinggong_wencheng' ||
      (b.id === 'untargetable' && b.key === 'yeque_ult'),
  );
}

/** 我方大招出手时调用。关闭「演出动效」时不呼吸。 */
export function pulseUltExposure(): void {
  if (!prefersReducedMotion()) ultPulseAge = 0;
}

/** 进入对局时调用：只在完整菜单流里播放入画镜头。 */
export function beginEntryShot(): void {
  entryAge = cinematicFlowEnabled() ? 0 : Infinity;
}

function ultPulseLevel(): number {
  const { attack, hold, release } = TANGSONG_FILM.ultPulse;
  if (!(ultPulseAge < attack + hold + release * 6)) return 0;
  if (ultPulseAge < attack) {
    const k = ultPulseAge / attack;
    return k * k * (3 - 2 * k);
  }
  if (ultPulseAge < attack + hold) return 1;
  return Math.exp(-(ultPulseAge - attack - hold) / release);
}

function applyGrade(engine: FilmEngineLike, step: number): void {
  const post = engine.post;
  if (!post) return;
  const look = TANGSONG_FILM.quality[engine.quality];
  if (!look) return;
  const grade = engine.grade;
  const pulse = ultPulseLevel();
  grade.bloomStrength = look.bloom + TANGSONG_FILM.ultPulse.bloomBoost * pulse;
  grade.haze = look.haze;
  grade.contrast = TANGSONG_FILM.contrast;
  grade.saturation = TANGSONG_FILM.saturation;
  grade.vibrance = TANGSONG_FILM.vibrance;
  const threshold = post.bloomPass?.threshold;
  if (threshold) threshold.x = look.bloomThreshold;
  if (!toned.has(grade)) {
    toned.add(grade);
    grade.hazeColor?.setHex?.(TANGSONG_FILM.hazeColor);
  }
  grade.exposure = TANGSONG_FILM.exposure * (1 - TANGSONG_FILM.ultPulse.depth * pulse);
  grade.vignette = TANGSONG_FILM.vignette + TANGSONG_FILM.ultPulse.vignette * pulse;

  const material = post.finalPass?.material;
  if (material?.uniforms?.uTsTime) {
    filmTime = (filmTime + step) % 3600;
    material.uniforms.uTsTime.value = filmTime;
  }

  // 关闭「演出动效」时：墨不做径向洇化，整屏一起褪色
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
export function filmFrame(
  renderer: FilmRendererLike | null | undefined,
  dt: number,
  state?: FilmStateLike | null,
): void {
  const engine = renderer?.engine;
  if (!engine) return;
  const step = dt > 0 ? Math.min(dt, 0.1) : 0;
  ultPulseAge += step;
  applyGrade(engine, step);
  if (entryAge !== Infinity) {
    applyEntryShot(engine);
    entryAge += step;
  } else {
    const flying = cinematicFlowEnabled() && isPlayerFlying(state);
    const targetZoom = flying ? 1 : 0;
    if (flightZoom > 0.001 || targetZoom > 0) {
      const rate = flying ? 5.5 : 4.2;
      flightZoom += (targetZoom - flightZoom) * Math.min(1, step * rate);
      if (flightZoom < 0.001 && targetZoom === 0) flightZoom = 0;
      const rig = engine.rig;
      if (rig && typeof rig.applyLens === 'function') {
        rig.applyLens();
        if (flightZoom > 0) {
          rig.distance *= 1 + 0.07 * flightZoom;
          rig.pitch -= 0.042 * flightZoom;
        }
      }
    }
  }
}
