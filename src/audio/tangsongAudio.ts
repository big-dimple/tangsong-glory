/**
 * tangsongAudio.ts — 《唐宋荣耀》v5.1 实录随机轮播配乐 + 程序化唐宋 SFX 音频引擎
 *
 * 1. 背景配乐（BGM）：精选 4 首完整实录乐曲（public/assets/audio/bgm/*.ogg|mp3），
 *    经 MediaElementAudioSourceNode 接入引擎混音总线（musicIn），兼容静音/音量、
 *    阵亡低通、公告闪避与切后台自动暂停，采用防连续重复的 Fisher-Yates 洗牌队列随机轮播。
 * 2. 局内音效（SFX）：保留纯程序化 WebAudio 五声古琴、古筝、琵琶、洞箫、竹笛、二胡、
 *    编钟、堂鼓与建鼓物理/节点合成声效，全量覆写引擎内建 r1 音效表。
 */
import { playPluckedString } from './pluckedString';
import { installTangSongSpace } from './tangsongSpace';

export interface SynthOscOpts {
  w?: string;
  f: number;
  f1?: number;
  ft?: number;
  det?: number;
  t?: number;
  a?: number;
  h?: number;
  d: number;
  g?: number;
  lin?: boolean;
  vib?: number;
  vr?: number;
  vd?: number;
  to?: AudioNode;
}

export interface SynthFmOpts extends SynthOscOpts {
  ratio: number;
  idx: number;
  idx1?: number;
  idt?: number;
}

export interface SynthNoiseOpts {
  k?: 'white' | 'pink' | 'brown';
  flt?: BiquadFilterType;
  fc?: number;
  fc1?: number;
  fct?: number;
  q?: number;
  rate?: number;
  t?: number;
  a?: number;
  h?: number;
  d: number;
  g?: number;
  lin?: boolean;
  to?: AudioNode;
}

export interface SynthPatchLike {
  ctx: AudioContext;
  out: AudioNode;
  t0: number;
  end: number;
  pm: number;
  dur: number;
  osc(o: SynthOscOpts): OscillatorNode;
  fm(o: SynthFmOpts): OscillatorNode;
  noise(o: SynthNoiseOpts): AudioBufferSourceNode;
  ring(f: number, ratios: number[], o: Partial<SynthOscOpts> & { d: number }): void;
  scatter(n: number, t0: number, span: number, fn: (t: number, i: number) => void): void;
  filt(type: BiquadFilterType, freq: number, q?: number, to?: AudioNode): BiquadFilterNode;
  gain(v: number, to?: AudioNode): GainNode;
  drive(amt: number, to?: AudioNode): WaveShaperNode;
  pan(v: number, to?: AudioNode): AudioNode;
  ramp(param: AudioParam, pts: [number, number][], exp?: boolean): void;
  lfo(param: AudioParam, f: number, amp: number, t: number, d: number, f1?: number): void;
  echo(delay: number, fb: number, wet: number, tail: number, to?: AudioNode): GainNode;
  sub(gainVal: number, cb: (subPatch: SynthPatchLike) => void): void;
  rr(a: number, b: number): number;
  rnd(): number;
}

export interface SfxEntryLike {
  fn: (patch: SynthPatchLike, v?: number) => void;
  label?: string;
  cat?: string;
  bus?: string;
  loud?: number;
  rev?: number;
  gap?: number;
  poly?: number;
  prio?: number;
  jitter?: number;
  len?: number;
  range?: number;
  group?: string;
}

export interface AudioMixerLike {
  ctx: AudioContext;
  musicIn: GainNode;
  musicRev: GainNode;
  sfxBus: GainNode;
  uiBus: GainNode;
  sfxRev: GainNode;
  now: () => number;
  kit: {
    canPan?: boolean;
    rnd: () => number;
  };
  note: (dest: AudioNode, time: number) => SynthPatchLike;
  play: (key: string, opts?: Record<string, unknown>) => unknown;
  noteCount?: number;
  voiceCount?: number;
  graph?: AudioNode[];
  duck?: (level: number, hold: number) => void;
  __tsSfxAttached?: boolean;
  __tsAudioDebug?: () => Record<string, unknown>;
}

export interface MusicController {
  readonly track: string;
  readonly channels: string[];
  readonly scheduledNotes: number;
  readonly currentSong: string | null;
  readonly playlist: readonly string[];
  readonly playing: boolean;
  setTrack(track: string): void;
  setMood(intensity: number, tension: number): void;
  setBattleBgmEnabled?(enabled: boolean): void;
  tick(lookahead?: number): void;
  nextSong(): string | null;
  fork(mixer: AudioMixerLike): MusicController;
  dispose(): void;
}

export const BGM_TRACK_IDS = ['tianhu-begin', 'moon-shop', 'go-cake', 'vsboss'] as const;
export type BgmTrackId = (typeof BGM_TRACK_IDS)[number];

const MENU_BGM_GAIN = 0.36;
const BATTLE_BGM_GAIN = 0.11;
const BATTLE_BGM_DUCKED = 0.048;
const BGM_GAP_MS = 5000;

const midi = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const safeHz = (f: number) => Math.max(24, Math.min(18000, f));

// ─────────────────────────────────────────────────────────────────────────────
// 1. 纯程序化唐宋民族乐器合奏库 (基于引擎 L1 节点微合成器)
// ─────────────────────────────────────────────────────────────────────────────

/** 山水空灵铺底（纯五度 / 九度开放声部，干净正弦与微弱泛音，给主旋律留足呼吸空间） */
function playInkPad(
  p: SynthPatchLike,
  freqs: number[],
  t: number,
  dur: number,
  vel: number,
  bright = 1.0,
): void {
  const f = p.filt('lowpass', 380 * bright, 0.55);
  p.ramp(f.frequency, [
    [t, 380 * bright],
    [t + dur * 0.45, 1150 * bright],
    [t + dur + 0.9, 460 * bright],
  ]);
  const l = p.pan(-0.45, f);
  const r = p.pan(0.45, f);
  const a = Math.min(0.8, dur * 0.34);
  const h = Math.max(0, dur - a);
  for (let i = 0; i < freqs.length; i++) {
    const hz = safeHz(freqs[i]);
    const g = (0.048 * vel) / (1 + i * 0.16);
    const ti = t + i * 0.01;
    const dest = i % 2 === 0 ? l : r;
    p.osc({ w: 'sine', f: hz, det: i % 2 === 0 ? -3 : 3, t: ti, a, h, d: 1.05, g, to: dest });
    if (i >= freqs.length - 2) {
      p.osc({ w: 'triangle', f: safeHz(hz * 2), t: ti + 0.04, a: a * 1.15, h: Math.max(0, h * 0.7), d: 0.7, g: 0.012 * vel, to: dest });
    }
  }
  p.osc({ w: 'sine', f: safeHz(freqs[0] * 0.5), t, a, h, d: 0.95, g: 0.032 * vel, to: f });
}

/** 古筝拨奏：物理丝弦 + 指甲清脆触弦 + 温润共鸣 */
function playGuzheng(
  p: SynthPatchLike,
  f: number,
  t: number,
  dur: number,
  vel: number,
): void {
  const hz = safeHz(f);
  const lpf = p.filt('lowpass', 820, 1.05);
  p.ramp(lpf.frequency, [
    [t, Math.min(7200, 1600 + 4200 * vel)],
    [t + 0.1, Math.max(520, hz * 2.5)],
    [t + dur + 0.28, Math.max(340, hz * 1.2)],
  ]);
  playPluckedString(p, hz, t, dur, 0.48 * vel, 0.72, lpf, undefined, 0.17);
  p.osc({ w: 'sine', f: safeHz(hz * 2), t, a: 0.003, d: Math.min(0.16, dur * 0.45), g: 0.028 * vel, to: lpf });
  p.noise({ k: 'pink', flt: 'bandpass', fc: Math.min(4200, Math.max(1500, hz * 2.8)), q: 1.1, t, a: 0.001, d: 0.011, g: 0.018 * vel });
}

/** 琵琶弹挑 / 轮指：近品脆拨 + 清晰木腔颗粒子 */
function playPipa(
  p: SynthPatchLike,
  f: number,
  t: number,
  dur: number,
  vel: number,
  tremolo = false,
): void {
  const hz = safeHz(f);
  const hits = tremolo ? 3 : 1;
  const step = Math.min(0.046, dur * 0.28);
  for (let i = 0; i < hits; i++) {
    const ti = t + i * step;
    const vi = vel * (i === 0 ? 1 : 0.74 - i * 0.11);
    const body = p.filt('lowpass', Math.min(4600, hz * 3.8 + 900), 0.65);
    playPluckedString(p, hz, ti, Math.max(0.11, dur * 0.56), 0.50 * vi, 0.82, body, undefined, 0.12);
    p.noise({ k: 'pink', flt: 'bandpass', fc: 1950, q: 1.1, t: ti, a: 0.002, d: 0.013, g: 0.032 * vi });
  }
}

/** 古琴低音 / 泛音（温厚走手音滑弦，靠内侧拨弦） */
function playGuqin(
  p: SynthPatchLike,
  f: number,
  t: number,
  dur: number,
  vel: number,
  slideFrom?: number,
): void {
  const hz = safeHz(f);
  const fStart = slideFrom ? safeHz(slideFrom) : hz;
  const lpf = p.filt('lowpass', 920, 0.82);
  p.ramp(lpf.frequency, [
    [t, Math.min(3200, hz * 4.2 + 700 * vel)],
    [t + 0.18, Math.max(240, hz * 2.1)],
    [t + dur + 0.32, Math.max(180, hz * 1.25)],
  ]);
  playPluckedString(p, hz, t, dur, 0.56 * vel, 0.34, lpf, slideFrom ? fStart : undefined, 0.24);
  p.osc({
    w: 'sine',
    f: safeHz(fStart * 0.5),
    f1: slideFrom ? safeHz(hz * 0.5) : undefined,
    ft: 0.16,
    t,
    a: 0.012,
    h: dur * 0.35,
    d: dur * 0.65 + 0.2,
    g: 0.088 * vel,
  });
}

/** 洞箫：温润竹腔 + 柔气声 + 婉转吟揉 */
function playXiao(
  p: SynthPatchLike,
  f: number,
  t: number,
  dur: number,
  vel: number,
  slideFrom?: number,
): void {
  const hz = safeHz(f);
  const fStart = slideFrom ? safeHz(slideFrom) : hz * 0.993;
  const lpf = p.filt('lowpass', Math.min(4000, hz * 3.2), 0.65);
  const h = Math.max(0, dur - 0.09);
  p.osc({
    w: 'sine',
    f: fStart,
    f1: hz,
    ft: Math.min(0.1, dur * 0.3),
    t,
    a: 0.068,
    h,
    d: 0.26,
    g: 0.21 * vel,
    vib: 6.5,
    vr: 4.6,
    vd: 0.22,
    to: lpf,
  });
  p.osc({ w: 'triangle', f: safeHz(hz * 2), t: t + 0.02, a: 0.09, h: Math.max(0, h - 0.05), d: 0.16, g: 0.02 * vel, to: lpf });
  p.noise({ k: 'pink', flt: 'bandpass', fc: Math.min(2800, hz * 1.9), q: 1.0, t, a: 0.035, h: Math.max(0, h * 0.32), d: 0.13, g: 0.02 * vel });
}

/** 竹笛：清越明亮、笛膜泛音克制不刺耳 */
function playDizi(
  p: SynthPatchLike,
  f: number,
  t: number,
  dur: number,
  vel: number,
  slideFrom?: number,
): void {
  const hz = safeHz(f);
  const fStart = slideFrom ? safeHz(slideFrom) : hz * 0.996;
  const h = Math.max(0, dur - 0.055);
  const bore = p.filt('lowpass', Math.min(3400, hz * 3.5), 0.65);
  p.osc({
    w: 'sine',
    f: fStart,
    f1: hz,
    ft: Math.min(0.065, dur * 0.24),
    t,
    a: 0.022,
    h,
    d: 0.18,
    g: 0.2 * vel,
    vib: 6.5,
    vr: 5.6,
    vd: 0.16,
    to: bore,
  });
  p.osc({
    w: 'reed',
    f: hz,
    det: 4,
    t: t + 0.012,
    a: 0.04,
    h: Math.max(0, h - 0.02),
    d: 0.15,
    g: 0.038 * vel,
    vib: 6.5,
    vr: 5.6,
    vd: 0.18,
    to: bore,
  });
  p.noise({ k: 'pink', flt: 'bandpass', fc: Math.min(3600, hz * 2.2), q: 1.1, t, a: 0.008, d: 0.075, g: 0.035 * vel });
}

/** 二胡：双琴筒共振峰 + 柔润起弓 + 深情揉弦 */
function playErhu(
  p: SynthPatchLike,
  f: number,
  t: number,
  dur: number,
  vel: number,
  slideFrom?: number,
): void {
  const hz = safeHz(f);
  const fStart = slideFrom ? safeHz(slideFrom) : hz * 0.992;
  const out = p.gain(0.95);
  const f1 = p.filt('bandpass', 780, 1.9, out);
  const f2 = p.filt('bandpass', 2150, 2.2, p.gain(0.42, out));
  const h = Math.max(0, dur - 0.08);
  const ft = Math.min(0.14, dur * 0.36);
  p.osc({ w: 'softsaw', f: fStart, f1: hz, ft, det: -3, t, a: 0.068, h, d: 0.24, g: 0.18 * vel, vib: 12, vr: 5.2, vd: 0.18, to: f1 });
  p.osc({ w: 'reed', f: fStart, f1: hz, ft, det: 4, t, a: 0.072, h, d: 0.22, g: 0.12 * vel, vib: 12, vr: 5.2, vd: 0.18, to: f2 });
  p.noise({ k: 'pink', flt: 'bandpass', fc: 1850, q: 1.5, t, a: 0.024, d: 0.065, g: 0.024 * vel });
}

/** 盛唐礼乐号角（温暖厚实铜管/唢呐合奏质感，控制高频不刺耳） */
function playTangHorn(
  p: SynthPatchLike,
  f: number,
  t: number,
  dur: number,
  vel: number,
): void {
  const hz = safeHz(f);
  const lpf = p.filt('lowpass', 580, 0.85);
  p.ramp(lpf.frequency, [
    [t, 580],
    [t + 0.08, 1850 + 1350 * vel],
    [t + dur * 0.65, 1300 + 850 * vel],
    [t + dur + 0.18, 620],
  ]);
  const h = Math.max(0, dur - 0.09);
  p.osc({ w: 'brass', f: hz, det: -3, t, a: 0.05, h, d: 0.22, g: 0.17 * vel, vib: 6, vr: 4.8, vd: 0.24, to: lpf });
  p.osc({ w: 'reed', f: hz, det: 4, t, a: 0.06, h, d: 0.2, g: 0.095 * vel, to: lpf });
}

/** 青铜编钟 / 玉磬：青铜泛音击槌 + 庄严基音余韵 */
function playBianzhong(
  p: SynthPatchLike,
  f: number,
  t: number,
  dur: number,
  vel: number,
): void {
  const hz = safeHz(f);
  p.fm({ f: hz, ratio: 2.42, idx: 0.45 + 1.15 * vel, idx1: 0.02, idt: Math.min(0.14, dur * 0.25), t, a: 0.002, d: dur, g: 0.16 * vel });
  p.osc({ w: 'sine', f: hz, t, a: 0.002, d: dur * 0.92, g: 0.14 * vel });
  p.osc({ w: 'sine', f: safeHz(hz * 2), t, a: 0.002, d: dur * 0.36, g: 0.042 * vel });
  // 钟体分音：小三度的「侧鼓音」、八度与其上的非谐分音，衰减逐级加快——金属钟体而不是电子铃
  p.ring(hz, [1.19, 2.0, 2.52], { t, a: 0.002, d: dur * 0.62, g: 0.03 * vel });
}

/** 石磬：板振动的非谐分音，起音干脆、余音清而短 */
function playQing(p: SynthPatchLike, f: number, t: number, dur: number, vel: number): void {
  const hz = safeHz(f);
  p.ring(hz, [1, 1.52, 2.38, 3.41], { t, a: 0.0015, d: dur, g: 0.12 * vel });
  p.osc({ w: 'sine', f: safeHz(hz * 0.5), t, a: 0.004, d: dur * 0.7, g: 0.045 * vel });
  p.noise({ k: 'pink', flt: 'bandpass', fc: Math.min(9000, hz * 3.2), q: 2.2, t, a: 0.001, d: 0.012, g: 0.06 * vel });
}

/** 印身（木）：硬木印章磕在案上的一声短促闷响 */
function playSealWood(p: SynthPatchLike, t: number, vel: number, pitch = 1): void {
  p.osc({ w: 'triangle', f: 520 * pitch, f1: 430 * pitch, ft: 0.04, t, a: 0.001, d: 0.07, g: 0.34 * vel });
  p.osc({ f: 860 * pitch, t, a: 0.001, d: 0.03, g: 0.13 * vel });
  p.noise({ k: 'pink', flt: 'bandpass', fc: 1800 * pitch, q: 1.2, t, a: 0.001, d: 0.014, g: 0.2 * vel });
}

/** 案面（革）：印落下去时案面与垫皮的一记低频 */
function playSealThump(p: SynthPatchLike, t: number, vel: number, pitch = 1): void {
  p.osc({ f: safeHz(96 * pitch), f1: safeHz(48 * pitch), ft: 0.09, t, a: 0.003, d: 0.34, g: 0.5 * vel });
  p.noise({ k: 'brown', flt: 'lowpass', fc: 420, fc1: 160, t, a: 0.002, d: 0.06, g: 0.14 * vel });
}

/** 唐代大建鼓（激战重鼓与大招低频冲击） */
function playWarDrum(p: SynthPatchLike, t: number, vel: number, pitchScale = 1.0): void {
  const base = 98 * pitchScale;
  p.osc({ f: safeHz(base), f1: safeHz(52 * pitchScale), ft: 0.11, t, a: 0.004, d: 0.42, g: 0.48 * vel });
  p.osc({ w: 'triangle', f: safeHz(base * 1.55), f1: safeHz(base), ft: 0.09, t, a: 0.003, d: 0.16, g: 0.18 * vel });
  p.noise({ k: 'brown', flt: 'lowpass', fc: 820, fc1: 240, t, a: 0.002, d: 0.06, g: 0.16 * vel });
}

/** 宋代堂鼓（对线巡阵与号令轻鼓，清脆不浑浊） */
function playTanggu(p: SynthPatchLike, t: number, vel: number, pitchScale = 1.0): void {
  const base = 156 * pitchScale;
  p.osc({ f: safeHz(base), f1: safeHz(106 * pitchScale), ft: 0.07, t, a: 0.002, d: 0.22, g: 0.36 * vel });
  p.osc({ w: 'triangle', f: safeHz(base * 1.5), f1: safeHz(base * 1.2), ft: 0.05, t, a: 0.002, d: 0.1, g: 0.14 * vel });
  p.noise({ k: 'pink', flt: 'bandpass', fc: 1100, q: 0.9, t, a: 0.001, d: 0.025, g: 0.12 * vel });
}

function playWoodblock(p: SynthPatchLike, t: number, vel: number, hi = true): void {
  const f = hi ? 1320 : 880;
  p.osc({ w: 'triangle', f, f1: f * 0.92, ft: 0.03, t, a: 0.001, d: 0.048, g: 0.24 * vel });
  p.osc({ f: f * 1.62, t, a: 0.001, d: 0.025, g: 0.12 * vel });
}

function playSnareRoll(p: SynthPatchLike, t: number, vel: number): void {
  p.noise({ k: 'pink', flt: 'bandpass', fc: 1950, q: 0.75, t, a: 0.001, d: 0.14, g: 0.34 * vel });
  p.osc({ w: 'triangle', f: 196, f1: 138, ft: 0.05, t, a: 0.001, d: 0.075, g: 0.24 * vel });
}

function playGongCrash(p: SynthPatchLike, t: number, vel: number, dur = 2.4): void {
  p.ring(88, [1, 1.38, 1.91, 2.57, 3.31], { t, a: 0.015, d: dur, g: 0.17 * vel });
  p.noise({ k: 'pink', flt: 'bandpass', fc: 1100, fc1: 320, q: 0.7, t, a: 0.02, d: dur * 0.85, g: 0.26 * vel });
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. 实录背景配乐随机轮播控制器（4 首唐宋风实录乐曲，接入引擎 musicIn 总线）
// ─────────────────────────────────────────────────────────────────────────────

function shuffleTrackIds(excludeFirst?: BgmTrackId | null): BgmTrackId[] {
  const pool: BgmTrackId[] = [...BGM_TRACK_IDS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  if (excludeFirst && pool.length > 1 && pool[0] === excludeFirst) {
    const swapIdx = 1 + Math.floor(Math.random() * (pool.length - 1));
    [pool[0], pool[swapIdx]] = [pool[swapIdx], pool[0]];
  }
  return pool;
}

export function createTangSongMusic(mixer: AudioMixerLike): MusicController {
  let curTrack = 'none';
  let disposed = false;
  let currentSongId: BgmTrackId | null = null;
  let queue: BgmTrackId[] = shuffleTrackIds(null);
  let playedCount = 0;
  let needsRetry = false;
  let preferMp3 = false;
  let mp3RetriedForSong = false;
  let battleBgmEnabled = true;
  let curIntensity = 0;
  let fadingOutEnd = false;
  let freshEntryFade = true;
  let gapTimer: ReturnType<typeof setTimeout> | null = null;
  let stopTimer: ReturnType<typeof setTimeout> | null = null;

  const canMediaStream =
    typeof window !== 'undefined' &&
    typeof Audio !== 'undefined' &&
    typeof mixer.ctx?.createMediaElementSource === 'function';

  let audioEl: HTMLAudioElement | null = null;
  let mediaSource: MediaElementAudioSourceNode | null = null;
  let carveEq: BiquadFilterNode | null = null;
  let battleLp: BiquadFilterNode | null = null;
  let bgmGain: GainNode | null = null;

  const clearTimers = () => {
    if (gapTimer !== null) {
      clearTimeout(gapTimer);
      gapTimer = null;
    }
    if (stopTimer !== null) {
      clearTimeout(stopTimer);
      stopTimer = null;
    }
  };

  const resolveUrl = (songId: BgmTrackId): string => {
    const useOgg = !preferMp3 && !!audioEl?.canPlayType?.('audio/ogg; codecs="vorbis"');
    return `/assets/audio/bgm/${songId}.${useOgg ? 'ogg' : 'mp3'}`;
  };

  const computeTargetGain = (): number => {
    if (curTrack === 'none') return 0;
    if (curTrack === 'battle') {
      if (!battleBgmEnabled) return 0;
      const combatT = Math.max(0, Math.min(1, (curIntensity - 0.15) / 0.7));
      return BATTLE_BGM_GAIN + (BATTLE_BGM_DUCKED - BATTLE_BGM_GAIN) * combatT;
    }
    return MENU_BGM_GAIN;
  };

  const applyMixProfile = (tau = 0.25) => {
    if (!mixer.ctx) return;
    const now = mixer.now();
    if (bgmGain) {
      bgmGain.gain.cancelScheduledValues(now);
      bgmGain.gain.setTargetAtTime(computeTargetGain(), now, tau);
    }
    const inBattle = curTrack === 'battle';
    if (carveEq) {
      const combatT = Math.max(0, Math.min(1, (curIntensity - 0.15) / 0.7));
      const eqDb = inBattle ? -5.5 - 1.5 * combatT : 0;
      carveEq.gain.setTargetAtTime(eqDb, now, tau);
    }
    if (battleLp) {
      battleLp.frequency.setTargetAtTime(inBattle ? 3600 : 18000, now, tau);
    }
  };

  const rampGain = (target: number, tau: number) => {
    if (!bgmGain || !mixer.ctx) return;
    const now = mixer.now();
    bgmGain.gain.cancelScheduledValues(now);
    bgmGain.gain.setTargetAtTime(target, now, tau);
  };

  const attemptPlay = (songId: BgmTrackId) => {
    if (!audioEl || disposed || curTrack === 'none') return;
    const entryTau = freshEntryFade ? 0.75 : 0.25;
    freshEntryFade = false;
    try {
      const result = audioEl.play();
      if (result && typeof result.then === 'function') {
        void result
          .then(() => {
            if (!disposed && currentSongId === songId && curTrack !== 'none') {
              needsRetry = false;
              applyMixProfile(entryTau);
            }
          })
          .catch(() => {
            if (!disposed && curTrack !== 'none') {
              needsRetry = true;
            }
          });
      } else {
        needsRetry = false;
        applyMixProfile(entryTau);
      }
    } catch {
      needsRetry = true;
    }
  };

  const playSong = (songId: BgmTrackId) => {
    if (disposed || !audioEl) return;
    clearTimers();
    fadingOutEnd = false;
    currentSongId = songId;
    mp3RetriedForSong = false;
    playedCount++;
    audioEl.src = resolveUrl(songId);
    audioEl.currentTime = 0;
    if (bgmGain && mixer.ctx && freshEntryFade) {
      const now = mixer.now();
      bgmGain.gain.cancelScheduledValues(now);
      bgmGain.gain.setValueAtTime(0.0001, now);
    } else {
      applyMixProfile(0.28);
    }
    attemptPlay(songId);
  };

  const takeNextSongId = (): BgmTrackId => {
    if (queue.length === 0) {
      queue = shuffleTrackIds(currentSongId);
    }
    const next = queue.shift() ?? BGM_TRACK_IDS[0];
    return next;
  };

  const startNextShuffled = (): BgmTrackId | null => {
    if (disposed) return null;
    const nextId = takeNextSongId();
    if (!audioEl) {
      currentSongId = nextId;
      playedCount++;
      return nextId;
    }
    playSong(nextId);
    return nextId;
  };

  const onEnded = () => {
    if (disposed || curTrack === 'none') return;
    clearTimers();
    fadingOutEnd = false;
    freshEntryFade = true;
    rampGain(0, 0.06);
    gapTimer = setTimeout(() => {
      gapTimer = null;
      if (!disposed && curTrack !== 'none') {
        startNextShuffled();
      }
    }, BGM_GAP_MS);
  };

  const onError = () => {
    if (disposed || !currentSongId || !audioEl) return;
    if (!preferMp3 && !mp3RetriedForSong) {
      preferMp3 = true;
      mp3RetriedForSong = true;
      audioEl.src = `/assets/audio/bgm/${currentSongId}.mp3`;
      if (curTrack !== 'none') {
        attemptPlay(currentSongId);
      }
      return;
    }
    // Skip broken track cleanly instead of stalling playlist
    if (curTrack !== 'none') {
      clearTimers();
      gapTimer = setTimeout(() => {
        gapTimer = null;
        if (!disposed && curTrack !== 'none') startNextShuffled();
      }, 400);
    }
  };

  const onVisibility = () => {
    if (!audioEl || disposed) return;
    if (document.hidden) {
      if (!audioEl.paused) {
        audioEl.pause();
      }
      return;
    }
    if (curTrack !== 'none' && currentSongId && audioEl.paused && !audioEl.ended) {
      attemptPlay(currentSongId);
    }
  };

  if (canMediaStream) {
    try {
      audioEl = new Audio();
      audioEl.crossOrigin = 'anonymous';
      audioEl.preload = 'auto';
      audioEl.loop = false;
      bgmGain = mixer.ctx.createGain();
      bgmGain.gain.value = 0;
      bgmGain.connect(mixer.musicIn);
      // 商业 MOBA 频段避让（1.8kHz 让出英雄/技能瞬态中频）+ 局内温柔低通
      carveEq = mixer.ctx.createBiquadFilter();
      carveEq.type = 'peaking';
      carveEq.frequency.value = 1800;
      carveEq.Q.value = 0.85;
      carveEq.gain.value = 0;
      battleLp = mixer.ctx.createBiquadFilter();
      battleLp.type = 'lowpass';
      battleLp.frequency.value = 18000;
      battleLp.Q.value = 0.55;
      carveEq.connect(battleLp);
      battleLp.connect(bgmGain);
      mediaSource = mixer.ctx.createMediaElementSource(audioEl);
      mediaSource.connect(carveEq);
      audioEl.addEventListener('ended', onEnded);
      audioEl.addEventListener('error', onError);
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', onVisibility);
      }
    } catch {
      audioEl = null;
      mediaSource = null;
      carveEq = null;
      battleLp = null;
      bgmGain = null;
    }
  }

  return {
    get track() {
      return curTrack;
    },
    get channels() {
      return currentSongId ? [`bgm:${currentSongId}`] : [];
    },
    get scheduledNotes() {
      return playedCount;
    },
    get currentSong() {
      return currentSongId;
    },
    get playlist() {
      return [...queue];
    },
    get playing() {
      return !!audioEl && !audioEl.paused && !audioEl.ended && curTrack !== 'none';
    },
    setTrack(track: string) {
      if (disposed || track === curTrack) return;
      curTrack = track;
      clearTimers();

      if (track === 'none') {
        needsRetry = false;
        rampGain(0, 0.12);
        if (audioEl && !audioEl.paused) {
          const el = audioEl;
          stopTimer = setTimeout(() => {
            stopTimer = null;
            if (!disposed && curTrack === 'none') {
              el.pause();
            }
          }, 260);
        }
        return;
      }

      if (!audioEl) {
        if (!currentSongId) startNextShuffled();
        return;
      }

      // Already playing a recorded song: keep it flowing smoothly across menu -> battle -> match end
      if (currentSongId && !audioEl.paused && !audioEl.ended) {
        applyMixProfile(0.28);
        return;
      }

      // Returning from 'none' with a buffered track not yet ended: resume gracefully
      if (currentSongId && audioEl.src && !audioEl.ended) {
        applyMixProfile(0.25);
        attemptPlay(currentSongId);
        return;
      }

      startNextShuffled();
    },
    setMood(intensity: number, _tension: number) {
      curIntensity = Math.max(0, Math.min(1, intensity || 0));
      if (!disposed && curTrack === 'battle') {
        applyMixProfile(0.22);
      }
    },
    setBattleBgmEnabled(enabled: boolean) {
      battleBgmEnabled = enabled !== false;
      if (!disposed && curTrack === 'battle') {
        applyMixProfile(0.2);
      }
    },
    tick(_lookahead = 0.9) {
      if (disposed || curTrack === 'none' || !audioEl) return;
      const hidden = typeof document !== 'undefined' && document.hidden;
      if (hidden || mixer.ctx?.state !== 'running') return;
      if (!audioEl.paused && Number.isFinite(audioEl.duration) && audioEl.duration > 8) {
        const rem = audioEl.duration - audioEl.currentTime;
        if (!fadingOutEnd && rem > 0 && rem <= 1.6) {
          fadingOutEnd = true;
          rampGain(0, 0.45);
        }
      }
      if (needsRetry) {
        needsRetry = false;
        if (currentSongId) {
          attemptPlay(currentSongId);
        } else {
          startNextShuffled();
        }
      }
    },
    nextSong() {
      freshEntryFade = false;
      return startNextShuffled();
    },
    fork(otherMixer: AudioMixerLike) {
      return createTangSongMusic(otherMixer);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      curTrack = 'none';
      clearTimers();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
      if (audioEl) {
        audioEl.removeEventListener('ended', onEnded);
        audioEl.removeEventListener('error', onError);
        try {
          audioEl.pause();
          audioEl.removeAttribute('src');
          audioEl.load();
        } catch {
          // ignore
        }
        audioEl = null;
      }
      try {
        mediaSource?.disconnect();
        carveEq?.disconnect();
        battleLp?.disconnect();
        bgmGain?.disconnect();
      } catch {
        // ignore
      }
      mediaSource = null;
      carveEq = null;
      battleLp = null;
      bgmGain = null;
      currentSongId = null;
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. 全量重塑引擎内建 SFX 声效表 r1（彻底去除科幻合成感）
// ─────────────────────────────────────────────────────────────────────────────
const PENTA_D = [62, 64, 67, 69, 71, 74, 76, 79, 81];

export function attachTangSongSfx(
  mixer: AudioMixerLike,
  r1?: Record<string, SfxEntryLike>,
): void {
  if (!mixer || mixer.__tsSfxAttached || !mixer.ctx) return;
  mixer.__tsSfxAttached = true;

  const patchedKeys = new Set<string>();
  let uiStep = 0;

  const patch = (key: string, fn: (p: SynthPatchLike, v?: number) => void, meta?: Partial<SfxEntryLike>) => {
    if (!r1) return;
    const entry = r1[key];
    if (!entry) return;
    entry.fn = fn;
    if (meta) Object.assign(entry, meta);
    // 商业 MOBA 信息剥离：压紧战斗短效混响发送量，避免团战音效混成一锅泥
    if (!key.startsWith('ann_') && !key.startsWith('cue_') && typeof entry.rev === 'number' && entry.rev > 0.14) {
      entry.rev = 0.14;
    }
    patchedKeys.add(key);
  };

  /** 唐宋礼乐连奏辅助（用于击杀/升级/多杀等国风器乐短句） */
  const playPentatonicPhrase = (
    p: SynthPatchLike,
    notes: number[],
    stepSec: number,
    dur: number,
    vel: number,
    instrument: 'guzheng' | 'pipa' | 'bianzhong',
  ) => {
    notes.forEach((m, idx) => {
      const t = idx * stepSec;
      if (instrument === 'guzheng') playGuzheng(p, midi(m), t, dur, vel);
      else if (instrument === 'pipa') playPipa(p, midi(m), t, dur, vel);
      else playBianzhong(p, midi(m), t, dur, vel);
    });
  };

  if (r1) {
    // 刘娥与苏轼共用技能机制，但施法音色各自独立。
    for (const slot of ['s1', 's2', 'ult']) {
      const shared = r1[`cast_xingli_${slot}`];
      if (shared) r1[`cast_liue_${slot}`] = { ...shared };
    }
    // 局内集合信号音效
    const orderBase = r1.ui_confirm;
    if (orderBase && !r1.ui_order_gather) {
      r1.ui_order_gather = { ...orderBase };
    }
    // ── UI 全系：白玉碰磬 + 宣纸翻卷 + 五声古筝 ──
    patch('ui_hover', (p) => {
      playGuqin(p, midi(74), 0, 0.075, 0.18);
    });
    patch('ui_click', (p) => {
      playGuzheng(p, midi(74), 0, 0.14, 0.58);
      p.osc({ w: 'sine', f: 420, f1: 280, ft: 0.03, a: 0.001, d: 0.035, g: 0.22 });
    });
    patch('ui_select', (p) => {
      const m = PENTA_D[uiStep++ % 5] + 12;
      playGuzheng(p, midi(m), 0, 0.34, 0.72);
      p.noise({ flt: 'bandpass', fc: 2200, q: 1.5, a: 0.003, d: 0.045, g: 0.12 });
    });
    patch('ui_confirm', (p) => {
      playBianzhong(p, midi(74), 0, 0.32, 0.72);
      playBianzhong(p, midi(81), 0.055, 0.45, 0.82);
    });
    patch('ui_back', (p) => {
      playGuzheng(p, midi(74), 0, 0.18, 0.55);
      playGuzheng(p, midi(69), 0.05, 0.24, 0.48);
      p.noise({ k: 'pink', flt: 'bandpass', fc: 1400, fc1: 700, q: 1.4, a: 0.005, d: 0.07, g: 0.1 });
    });
    patch('ui_buy', (p) => {
      p.ring(2200, [1, 1.52, 2.38], { a: 0.001, d: 0.16, g: 0.16 });
      p.ring(2850, [1, 1.48], { t: 0.045, a: 0.001, d: 0.18, g: 0.18 });
      playBianzhong(p, midi(81), 0.07, 0.28, 0.65);
    });
    patch('ui_ready', (p) => {
      playWarDrum(p, 0, 0.85, 0.9);
      playBianzhong(p, midi(74), 0.03, 0.55, 0.85);
      playBianzhong(p, midi(81), 0.11, 0.65, 0.9);
    });
    patch('ui_error', (p) => {
      playWoodblock(p, 0, 0.65, false);
      playWoodblock(p, 0.06, 0.52, false);
    });
    patch('ui_countdown', (p) => {
      playWoodblock(p, 0, 0.72, true);
      playBianzhong(p, midi(79), 0, 0.35, 0.5);
    });
    patch('ui_order_gather', (p) => {
      playTanggu(p, 0, 0.58, 1.04);
      playBianzhong(p, midi(74), 0.015, 0.32, 0.7);
      playGuzheng(p, midi(81), 0.055, 0.38, 0.74);
    });

    // ── 秦琼 (panyue)：短促干脆的沉钢挥锏 + 拳肉实感闷砸 ──
    patch('atk_panyue_swing', (p) => {
      p.noise({ k: 'pink', flt: 'bandpass', fc: 340, fc1: 760, fct: 0.07, q: 1.1, a: 0.008, d: 0.082, g: 0.36 });
      p.noise({ k: 'brown', flt: 'lowpass', fc: 280, a: 0.006, d: 0.07, g: 0.28 });
    }, { len: 0.14, rev: 0.03 });
    patch('atk_panyue_hit', (p) => {
      p.osc({ f: 132, f1: 56, ft: 0.045, a: 0.001, d: 0.095, g: 0.48 });
      p.ring(540, [1, 1.48], { a: 0.001, d: 0.085, g: 0.24 });
      p.noise({ k: 'pink', flt: 'bandpass', fc: 1500, q: 1.0, a: 0.001, d: 0.036, g: 0.38 });
    }, { len: 0.16, rev: 0.05 });
    patch('cast_panyue_s1', (p) => {
      playWarDrum(p, 0, 0.85, 0.92);
      playTangHorn(p, midi(50), 0.02, 0.32, 0.7);
      p.noise({ k: 'brown', flt: 'bandpass', fc: 320, fc1: 980, q: 1.1, a: 0.02, d: 0.22, g: 0.45 });
    });
    patch('cast_panyue_s2', (p) => {
      p.ring(420, [1, 1.48, 2.18, 3.1], { a: 0.003, d: 0.45, g: 0.28 });
      playWarDrum(p, 0.04, 0.72, 0.85);
    });
    patch('cast_panyue_ult', (p) => {
      playWarDrum(p, 0, 0.95, 0.72);
      playGongCrash(p, 0.08, 0.82, 0.95);
      playTangHorn(p, midi(50), 0.04, 0.48, 0.85);
    });
    patch('fx_panyue_passive_hit', (p) => {
      playWarDrum(p, 0, 0.58, 1.18);
      p.ring(620, [1, 1.48], { a: 0.001, d: 0.22, g: 0.24 });
    });
    patch('fx_panyue_s1_dash', (p) => {
      playWarDrum(p, 0, 0.52, 1.08);
      p.noise({ k: 'brown', flt: 'bandpass', fc: 380, fc1: 860, q: 1.0, a: 0.015, d: 0.18, g: 0.34 });
    });
    patch('fx_panyue_s1_impact', (p) => {
      playWarDrum(p, 0, 0.88, 0.86);
      p.ring(390, [1, 1.54, 2.3], { a: 0.002, d: 0.32, g: 0.26 });
    });
    patch('fx_panyue_s2_cast', (p) => {
      p.ring(520, [1, 1.49, 2.12], { a: 0.002, d: 0.34, g: 0.22 });
      playBianzhong(p, midi(62), 0, 0.3, 0.52);
    });
    patch('fx_panyue_ult_leap', (p) => {
      p.noise({ k: 'pink', flt: 'bandpass', fc: 280, fc1: 1120, q: 0.9, a: 0.02, d: 0.26, g: 0.38 });
      playTangHorn(p, midi(57), 0, 0.28, 0.62);
    });
    patch('fx_panyue_ult_land', (p) => {
      playWarDrum(p, 0, 1.0, 0.65);
      playGongCrash(p, 0.02, 0.75, 1.0);
    });
    patch('area_panyue_aura', (p) => {
      playBianzhong(p, midi(50), 0, 0.48, 0.45);
      p.ring(415, [1, 1.48], { t: 0.02, a: 0.02, d: 0.45, g: 0.15 });
    });
    patch('area_panyue_fissure', (p) => {
      playWarDrum(p, 0, 0.9, 0.72);
      p.noise({ k: 'brown', flt: 'lowpass', fc: 780, fc1: 180, a: 0.005, d: 0.55, g: 0.42 });
    });

    // ── 花蕊夫人 (chijin)：凌风细剑短疾破风 + 干净利刃入肉（去除上扬口哨电子音） ──
    patch('atk_chijin_swing', (p) => {
      p.noise({ k: 'white', flt: 'bandpass', fc: 2600, fc1: 4800, fct: 0.055, q: 1.8, a: 0.003, d: 0.072, g: 0.34 });
      p.noise({ k: 'pink', flt: 'bandpass', fc: 1400, fc1: 2600, fct: 0.055, q: 1.2, a: 0.004, d: 0.068, g: 0.22 });
      p.ring(2900, [1, 1.41], { t: 0.01, a: 0.001, d: 0.045, g: 0.07 });
    }, { len: 0.13, rev: 0.03 });
    patch('atk_chijin_hit', (p) => {
      p.osc({ f: 172, f1: 78, ft: 0.035, a: 0.001, d: 0.072, g: 0.32 });
      p.ring(p.rr(1420, 1580), [1, 1.42], { a: 0.001, d: 0.078, g: 0.18 });
      p.noise({ k: 'pink', flt: 'bandpass', fc: 2800, q: 0.9, a: 0.001, d: 0.028, g: 0.28 });
    }, { len: 0.14, rev: 0.04 });
    patch('cast_chijin_s1', (p) => {
      p.noise({ flt: 'bandpass', fc: 2200, fc1: 5200, q: 1.4, a: 0.01, d: 0.16, g: 0.38 });
      playGuzheng(p, midi(79), 0, 0.22, 0.7);
      p.ring(2180, [1, 1.5], { a: 0.002, d: 0.2, g: 0.2 });
    });
    patch('cast_chijin_s2', (p) => {
      p.noise({ k: 'pink', flt: 'bandpass', fc: 1800, fc1: 4200, q: 1.1, a: 0.01, d: 0.18, g: 0.35 });
      playPipa(p, midi(74), 0, 0.14, 0.68);
      playPipa(p, midi(81), 0.06, 0.18, 0.72);
    });
    patch('cast_chijin_ult', (p) => {
      playPentatonicPhrase(p, [74, 79, 81, 86], 0.045, 0.34, 0.72, 'guzheng');
      p.ring(1760, [1, 1.48, 2.15], { t: 0.04, a: 0.004, d: 0.48, g: 0.22 });
      p.noise({ k: 'pink', flt: 'bandpass', fc: 2400, fc1: 4800, q: 1.0, a: 0.05, d: 0.42, g: 0.36 });
    });
    patch('fx_chijin_passive_hit', (p) => {
      p.ring(1680, [1, 1.46], { a: 0.001, d: 0.2, g: 0.2 });
      playGuzheng(p, midi(86), 0.02, 0.26, 0.55);
    });
    patch('fx_chijin_s1_slash', (p) => {
      p.noise({ k: 'white', flt: 'bandpass', fc: 2400, fc1: 5800, q: 1.6, a: 0.004, d: 0.14, g: 0.34 });
      p.ring(2240, [1, 1.44], { a: 0.001, d: 0.16, g: 0.18 });
    });
    patch('fx_chijin_s2_dash', (p) => {
      p.noise({ k: 'pink', flt: 'bandpass', fc: 1600, fc1: 4200, q: 1.2, a: 0.008, d: 0.16, g: 0.32 });
      playPipa(p, midi(81), 0.01, 0.16, 0.62);
    });
    patch('fx_chijin_ult_start', (p) => {
      playGongCrash(p, 0, 0.45, 0.65);
      playPentatonicPhrase(p, [74, 81, 86], 0.04, 0.28, 0.7, 'pipa');
    });
    patch('fx_chijin_ult_tick', (p) => {
      p.noise({ flt: 'bandpass', fc: 2800, fc1: 5600, q: 1.6, a: 0.004, d: 0.09, g: 0.24 });
      p.ring(2200, [1, 1.41], { a: 0.001, d: 0.12, g: 0.14 });
    });
    patch('area_chijin_spin', (p) => {
      p.noise({ k: 'pink', flt: 'bandpass', fc: 2200, fc1: 4600, q: 1.2, a: 0.02, d: 0.36, g: 0.26 });
      p.ring(1980, [1, 1.5], { t: 0.04, a: 0.01, d: 0.28, g: 0.14 });
    });

    // ── 苏轼 / 刘娥 (xingli)：短促拂袖点弦 + 墨浪玉磬点水（收紧余韵，不拖泥带水） ──
    patch('atk_xingli_charge', (p) => {
      p.noise({ k: 'pink', flt: 'bandpass', fc: 1800, fc1: 2800, q: 1.6, a: 0.005, d: 0.05, g: 0.18 });
      p.osc({ w: 'sine', f: midi(74), a: 0.002, d: 0.045, g: 0.09 });
    }, { len: 0.1, rev: 0.03 });
    patch('atk_xingli_launch', (p, v = 0) => {
      const hz = midi(PENTA_D[Math.abs(Math.round(v)) % PENTA_D.length]);
      p.osc({ w: 'triangle', f: hz, a: 0.001, d: 0.088, g: 0.34 });
      p.osc({ w: 'sine', f: safeHz(hz * 2), a: 0.001, d: 0.052, g: 0.11 });
      p.noise({ k: 'pink', flt: 'bandpass', fc: 2600, fc1: 1400, fct: 0.065, q: 1.5, a: 0.002, d: 0.072, g: 0.38 });
    }, { len: 0.15, rev: 0.05 });
    patch('atk_xingli_hit', (p) => {
      playQing(p, midi(81), 0, 0.095, 0.42);
      p.osc({ f: 260, f1: 125, ft: 0.03, a: 0.001, d: 0.055, g: 0.22 });
      p.noise({ k: 'pink', flt: 'bandpass', fc: 1600, q: 1.2, a: 0.001, d: 0.032, g: 0.24 });
    }, { len: 0.14, rev: 0.05 });
    patch('cast_xingli_s1', (p) => {
      playGuzheng(p, midi(74), 0, 0.25, 0.75);
      playXiao(p, midi(81), 0.03, 0.3, 0.75);
    });
    patch('xingli_s1_fly', (p) => {
      playDizi(p, midi(86), 0, 0.2, 0.45);
      p.noise({ k: 'pink', flt: 'bandpass', fc: 1900, fc1: 2800, q: 2.0, a: 0.01, d: 0.16, g: 0.14 });
    });
    patch('xingli_s1_hit', (p) => {
      playGuzheng(p, midi(79), 0, 0.28, 0.76);
      playBianzhong(p, midi(86), 0, 0.28, 0.58);
    });
    patch('cast_xingli_s2', (p) => {
      playPentatonicPhrase(p, [62, 69, 74, 79], 0.04, 0.35, 0.68, 'guzheng');
      playBianzhong(p, midi(74), 0.12, 0.45, 0.62);
    });
    patch('cast_xingli_ult', (p) => {
      playBianzhong(p, midi(62), 0, 0.65, 0.85);
      playPentatonicPhrase(p, [74, 79, 81, 86], 0.045, 0.55, 0.72, 'guzheng');
    });
    patch('cast_liue_s1', (p) => {
      playGuqin(p, midi(62), 0, 0.3, 0.64);
      playBianzhong(p, midi(74), 0.04, 0.38, 0.55);
    });
    patch('cast_liue_s2', (p) => {
      playGuqin(p, midi(69), 0, 0.35, 0.65);
      playBianzhong(p, midi(81), 0.09, 0.5, 0.48);
      playBianzhong(p, midi(74), 0.2, 0.55, 0.5);
    });
    patch('cast_liue_ult', (p) => {
      playWarDrum(p, 0, 0.52, 0.8);
      playBianzhong(p, midi(62), 0.03, 0.75, 0.72);
      playPentatonicPhrase(p, [69, 74, 81], 0.11, 0.65, 0.58, 'bianzhong');
    });
    patch('fx_xingli_passive_burst', (p) => {
      playBianzhong(p, midi(74), 0, 0.36, 0.72);
      playGuzheng(p, midi(86), 0.03, 0.32, 0.72);
    });
    patch('fx_xingli_s1_cast', (p) => {
      playGuzheng(p, midi(76), 0, 0.22, 0.65);
    });
    patch('fx_xingli_s2_burst', (p) => {
      playPentatonicPhrase(p, [79, 74, 69], 0.035, 0.28, 0.72, 'guzheng');
      playWarDrum(p, 0.04, 0.45, 1.15);
    });
    patch('fx_xingli_ult_cast', (p) => {
      playBianzhong(p, midi(69), 0, 0.55, 0.75);
      playXiao(p, midi(81), 0.04, 0.45, 0.65);
    });
    patch('fx_xingli_meteor', (p) => {
      playWarDrum(p, 0, 0.62, 1.15);
      playBianzhong(p, midi(79), 0.01, 0.42, 0.72);
    });
    patch('area_xingli_well', (p) => {
      playGuqin(p, midi(62), 0, 0.45, 0.55);
      playInkPad(p, [midi(62), midi(69), midi(74)], 0, 0.45, 0.45, 1.1);
    });
    patch('area_xingli_storm', (p) => {
      playPentatonicPhrase(p, [74, 79, 81, 86], 0.06, 0.3, 0.55, 'pipa');
    });

    // ── 文成公主 (fengling)：彻底删掉弹簧拨弦，改成干脆弦响 + 利箭破空「嗖/咻」风声 ──
    patch('atk_fengling_draw', (p) => {
      p.noise({ k: 'pink', flt: 'bandpass', fc: 720, fc1: 1250, q: 1.8, a: 0.006, d: 0.055, g: 0.18 });
    }, { len: 0.12, rev: 0.02 });
    patch('atk_fengling_launch', (p) => {
      // 极短实木弓弰回弹闷响（无滑音弹簧味）
      p.noise({ k: 'brown', flt: 'lowpass', fc: 320, a: 0.001, d: 0.02, g: 0.24 });
      p.osc({ w: 'triangle', f: 145, f1: 92, ft: 0.018, a: 0.001, d: 0.024, g: 0.16 });
      // 高速羽箭划破空气的「咻——嗖——」降频风切声
      p.noise({ k: 'white', flt: 'bandpass', fc: 5400, fc1: 2100, fct: 0.095, q: 2.3, a: 0.004, h: 0.012, d: 0.115, g: 0.44 });
      p.noise({ k: 'pink', flt: 'bandpass', fc: 3600, fc1: 1500, fct: 0.088, q: 1.4, a: 0.004, h: 0.01, d: 0.105, g: 0.30 });
    }, { len: 0.17, rev: 0.03 });
    patch('atk_fengling_hit', (p) => {
      p.osc({ w: 'triangle', f: 240, f1: 105, ft: 0.028, a: 0.001, d: 0.048, g: 0.34 });
      p.noise({ k: 'pink', flt: 'bandpass', fc: 2200, q: 1.2, a: 0.001, d: 0.026, g: 0.36 });
      p.osc({ w: 'sine', f: 760, f1: 480, ft: 0.016, a: 0.001, d: 0.022, g: 0.14 });
    }, { len: 0.12, rev: 0.03 });
    patch('cast_fengling_s1', (p) => {
      p.osc({ w: 'glass', f: 1680, f1: 2450, ft: 0.16, a: 0.004, d: 0.24, g: 0.26 });
      p.noise({ flt: 'bandpass', fc: 3600, fc1: 6800, q: 1.4, a: 0.002, d: 0.16, g: 0.38 });
      playPipa(p, midi(81), 0, 0.22, 0.72);
    });
    patch('fengling_s1_fly', (p) => {
      p.noise({ k: 'white', flt: 'bandpass', fc: 3200, fc1: 5600, q: 2.2, a: 0.005, d: 0.14, g: 0.22 });
      p.osc({ w: 'glass', f: 1840, f1: 1420, ft: 0.12, a: 0.002, d: 0.12, g: 0.14 });
    });
    patch('fengling_s1_hit', (p) => {
      playWoodblock(p, 0, 0.85, true);
      p.ring(1540, [1, 1.5], { a: 0.001, d: 0.16, g: 0.2 });
    });
    patch('cast_fengling_s2', (p) => {
      p.noise({ k: 'pink', flt: 'bandpass', fc: 1400, fc1: 3200, q: 1.2, a: 0.005, d: 0.16, g: 0.36 });
      playDizi(p, midi(86), 0, 0.22, 0.62);
    });
    patch('cast_fengling_ult', (p) => {
      playPentatonicPhrase(p, [74, 79, 81, 86, 91], 0.045, 0.22, 0.78, 'pipa');
      playBianzhong(p, midi(86), 0.12, 0.55, 0.72);
    });
    patch('fx_fengling_s1_cast', (p) => {
      playPipa(p, midi(86), 0, 0.16, 0.62);
    });
    patch('fx_fengling_s2_dash', (p) => {
      p.noise({ k: 'pink', flt: 'bandpass', fc: 1800, fc1: 3600, q: 1.3, a: 0.005, d: 0.14, g: 0.28 });
      playDizi(p, midi(91), 0, 0.16, 0.52);
    });
    patch('fx_fengling_ult_cast', (p) => {
      playPipa(p, midi(81), 0, 0.22, 0.72, true);
      playDizi(p, midi(86), 0.04, 0.32, 0.62);
    });
    patch('fx_fengling_ult_tick', (p) => {
      playWoodblock(p, 0, 0.5, true);
      p.noise({ k: 'white', flt: 'bandpass', fc: 3800, fc1: 6200, q: 1.6, a: 0.001, d: 0.06, g: 0.24 });
    });
    patch('area_fengling_rain', (p) => {
      p.scatter(4, 0, 0.28, (ti, idx) => {
        playWoodblock(p, ti, 0.32, idx % 2 === 0);
        p.noise({ flt: 'bandpass', fc: 3600, q: 1.8, t: ti, a: 0.001, d: 0.05, g: 0.16 });
      });
    });

    // ── 辛弃疾 (yeque)：短快冷冽刀锋破空 + 清脆刺击确认 ──
    patch('atk_yeque_swing', (p) => {
      p.noise({ k: 'white', flt: 'bandpass', fc: 3200, fc1: 5800, fct: 0.048, q: 1.9, a: 0.002, d: 0.062, g: 0.44 });
      p.noise({ k: 'pink', flt: 'bandpass', fc: 1500, fc1: 2900, fct: 0.048, q: 1.3, a: 0.002, d: 0.056, g: 0.28 });
      p.ring(3400, [1, 1.37], { t: 0.006, a: 0.001, d: 0.038, g: 0.07 });
    }, { len: 0.11, rev: 0.03 });
    patch('atk_yeque_hit', (p) => {
      p.osc({ f: 150, f1: 64, ft: 0.032, a: 0.001, d: 0.068, g: 0.36 });
      p.ring(p.rr(1720, 1940), [1, 1.46], { a: 0.001, d: 0.065, g: 0.18 });
      p.noise({ k: 'white', flt: 'bandpass', fc: 3400, q: 1.1, a: 0.001, d: 0.024, g: 0.3 });
    }, { len: 0.13, rev: 0.04 });
    patch('cast_yeque_s1', (p) => {
      p.noise({ k: 'white', flt: 'bandpass', fc: 1800, fc1: 6400, q: 1.4, a: 0.004, d: 0.16, g: 0.45 });
      p.ring(1760, [1, 1.5], { a: 0.001, d: 0.22, g: 0.22 });
      playWarDrum(p, 0, 0.58, 1.25);
    });
    patch('cast_yeque_s2', (p) => {
      for (let i = 0; i < 3; i++) {
        p.ring(2400 + i * 260, [1, 1.42], { t: i * 0.032, a: 0.001, d: 0.11, g: 0.14 });
        p.noise({ flt: 'highpass', fc: 4200, t: i * 0.032, a: 0.001, d: 0.045, g: 0.2 });
      }
    });
    patch('yeque_s2_fly', (p) => {
      p.noise({ k: 'white', flt: 'bandpass', fc: 3200, fc1: 6400, q: 2.0, a: 0.002, d: 0.09, g: 0.2 });
      p.ring(2600, [1, 1.44], { a: 0.001, d: 0.08, g: 0.1 });
    });
    patch('yeque_s2_hit', (p) => {
      p.ring(2100, [1, 1.46], { a: 0.001, d: 0.15, g: 0.22 });
      p.noise({ flt: 'highpass', fc: 3600, a: 0.001, d: 0.035, g: 0.28 });
    });
    patch('cast_yeque_ult', (p) => {
      playWarDrum(p, 0, 0.85, 0.88);
      p.noise({ k: 'pink', flt: 'bandpass', fc: 1200, fc1: 3800, q: 1.5, a: 0.01, d: 0.24, g: 0.4 });
      playPipa(p, midi(62), 0.02, 0.22, 0.85, true);
    });
    patch('fx_yeque_s1_dash', (p) => {
      p.noise({ k: 'white', flt: 'bandpass', fc: 2000, fc1: 5600, q: 1.5, a: 0.003, d: 0.14, g: 0.36 });
      playWarDrum(p, 0, 0.45, 1.32);
    });
    patch('fx_yeque_s2_cast', (p) => {
      p.ring(2480, [1, 1.45], { a: 0.001, d: 0.12, g: 0.16 });
    });
    patch('fx_yeque_ult_vanish', (p) => {
      p.noise({ k: 'pink', flt: 'bandpass', fc: 2800, fc1: 520, q: 1.4, a: 0.005, d: 0.24, g: 0.32 });
      playGuqin(p, midi(74), 0, 0.28, 0.65, midi(81));
    });
    patch('fx_yeque_ult_strike', (p) => {
      playWarDrum(p, 0, 0.95, 0.78);
      playGongCrash(p, 0, 0.55, 0.65);
      p.ring(1920, [1, 1.48, 2.3], { a: 0.001, d: 0.32, g: 0.28 });
    });
    patch('yeque_refresh', (p) => {
      playBianzhong(p, midi(81), 0, 0.28, 0.62);
      p.ring(2620, [1, 1.5], { t: 0.03, a: 0.001, d: 0.22, g: 0.18 });
    });

    // ── 通用召唤师技能与地面阵法预警 ──
    patch('cast_recall', (p) => {
      playBianzhong(p, midi(69), 0, 0.48, 0.58);
      playGuzheng(p, midi(74), 0.04, 0.45, 0.62);
    });
    patch('cast_heal', (p) => {
      playPentatonicPhrase(p, [69, 74, 81], 0.055, 0.42, 0.68, 'guzheng');
      playXiao(p, midi(81), 0.06, 0.45, 0.48);
    });
    patch('cast_flash', (p) => {
      p.noise({ k: 'pink', flt: 'bandpass', fc: 1200, fc1: 4800, q: 1.3, a: 0.002, d: 0.15, g: 0.38 });
      playPipa(p, midi(86), 0, 0.18, 0.72);
    });
    patch('area_telegraph', (p) => {
      playGuqin(p, midi(74), 0, 0.25, 0.42);
    });
    patch('area_telegraph_enemy', (p) => {
      playWoodblock(p, 0, 0.65, false);
      p.ring(980, [1, 1.48], { t: 0.02, a: 0.002, d: 0.18, g: 0.16 });
    });

    // ── 通用命中火花 & 弹道落空 ──
    patch('fx_hit_physical', (p) => {
      p.osc({ f: 175, f1: 70, ft: 0.045, a: 0.001, d: 0.08, g: 0.28 });
      p.noise({ k: 'pink', flt: 'bandpass', fc: 1900, q: 1.3, a: 0.001, d: 0.04, g: 0.26 });
    });
    patch('fx_hit_magic', (p) => {
      playBianzhong(p, midi(79) * p.rr(0.98, 1.02), 0, 0.12, 0.39);
      p.osc({ f: 235, f1: 130, ft: 0.045, a: 0.002, d: 0.07, g: 0.16 });
    });
    patch('fx_hit_crit', (p) => {
      playWarDrum(p, 0, 0.72, 1.15);
      p.ring(1260, [1, 1.48, 2.2], { a: 0.002, d: 0.16, g: 0.19 });
      p.noise({ k: 'pink', flt: 'bandpass', fc: 2500, q: 1, a: 0.002, d: 0.04, g: 0.22 });
    });
    patch('fx_hit_tower', (p) => {
      playWarDrum(p, 0, 0.55, 0.92);
      playWoodblock(p, 0, 0.45, false);
    });
    patch('proj_fizzle', (p) => {
      p.noise({ k: 'pink', flt: 'lowpass', fc: 900, fc1: 300, a: 0.004, d: 0.09, g: 0.16 });
    });

    // ── 小兵与野怪攻防、龙息与刷新 ──
    patch('minion_swing', (p) => {
      p.noise({ k: 'pink', flt: 'bandpass', fc: 900, fc1: 1800, q: 1.4, a: 0.008, d: 0.075, g: 0.2 });
    });
    patch('minion_melee_hit', (p) => {
      playWoodblock(p, 0, p.rr(0.21, 0.29), false);
      p.osc({ f: 150, f1: 78, ft: 0.03, a: 0.001, d: 0.055, g: 0.2 });
    });
    patch('minion_ranged_launch', (p) => {
      playPipa(p, midi(79), 0, 0.09, 0.42);
    });
    patch('minion_ranged_hit', (p) => {
      p.noise({ k: 'pink', flt: 'bandpass', fc: p.rr(900, 1300), q: 1.2, a: 0.002, d: 0.048, g: 0.22 });
    });
    patch('minion_siege_launch', (p) => {
      playWarDrum(p, 0, 0.55, 0.9);
      p.noise({ k: 'brown', flt: 'bandpass', fc: 420, q: 1.2, a: 0.004, d: 0.12, g: 0.3 });
    });
    patch('minion_siege_hit', (p) => {
      playWarDrum(p, 0, 0.7, 0.78);
      p.noise({ k: 'brown', flt: 'lowpass', fc: 980, fc1: 240, a: 0.002, d: 0.18, g: 0.32 });
    });
    patch('super_hit', (p) => {
      playWarDrum(p, 0, 0.72, 0.88);
      p.ring(740, [1, 1.52], { a: 0.002, d: 0.16, g: 0.18 });
    });
    patch('monster_swing', (p) => {
      p.noise({ k: 'brown', flt: 'bandpass', fc: 380, fc1: 920, q: 1.1, a: 0.015, d: 0.13, g: 0.32 });
    });
    patch('monster_hit', (p) => {
      playWarDrum(p, 0, 0.62, 0.96);
      p.noise({ k: 'pink', flt: 'bandpass', fc: 1100, q: 1.1, a: 0.001, d: 0.055, g: 0.28 });
    });
    patch('monster_spit_launch', (p) => {
      p.noise({ k: 'pink', flt: 'bandpass', fc: 2200, fc1: 3800, q: 2.2, a: 0.006, d: 0.11, g: 0.22 });
      playGuzheng(p, midi(86), 0, 0.12, 0.36);
    });
    patch('monster_spit_hit', (p) => {
      p.ring(1820, [1, 1.48], { a: 0.002, d: 0.16, g: 0.14 });
    });
    patch('epic_hit', (p) => {
      playWarDrum(p, 0, 0.92, 0.68);
      playGongCrash(p, 0.01, 0.42, 0.55);
    });
    patch('monster_spawn', (p) => {
      playBianzhong(p, midi(62), 0, 0.45, 0.55);
      playGuqin(p, midi(69), 0.05, 0.42, 0.55);
    });
    patch('fx_drake_breath_warn', (p) => {
      playTangHorn(p, midi(45), 0, 0.55, 0.68);
      p.noise({ k: 'brown', flt: 'bandpass', fc: 420, fc1: 1100, q: 1.5, a: 0.08, d: 0.48, g: 0.32 });
    });
    patch('fx_drake_breath', (p) => {
      playWarDrum(p, 0, 0.85, 0.65);
      p.noise({ k: 'pink', flt: 'bandpass', fc: 1600, fc1: 420, q: 0.9, a: 0.04, d: 0.65, g: 0.48 });
      playTangHorn(p, midi(50), 0.02, 0.55, 0.72);
    });
    patch('fx_monster_slain', (p) => {
      playGongCrash(p, 0, 0.48, 0.7);
      playBianzhong(p, midi(74), 0.04, 0.4, 0.65);
    });
    patch('fx_buff_gain', (p) => {
      playPentatonicPhrase(p, [69, 74, 81, 86], 0.05, 0.42, 0.72, 'guzheng');
    });

    // ── 防御塔、铜钱、升级、状态反馈、阵亡与复活 ──
    patch('tower_charge', (p) => {
      playBianzhong(p, midi(79), 0, 0.24, 0.45);
      p.osc({ w: 'glass', f: 680, f1: 980, ft: 0.18, a: 0.04, d: 0.18, g: 0.12 });
    });
    patch('tower_launch', (p) => {
      playBianzhong(p, midi(74), 0, 0.26, 0.6);
      p.noise({ k: 'pink', flt: 'bandpass', fc: 1400, fc1: 3600, q: 1.4, a: 0.01, d: 0.16, g: 0.26 });
    });
    patch('tower_hit', (p) => {
      playWarDrum(p, 0, 0.72, 0.85);
      p.ring(680, [1, 1.52, 2.3], { a: 0.002, d: 0.32, g: 0.24 });
    });
    patch('tower_hit_player', (p) => {
      playWarDrum(p, 0, 0.92, 0.75);
      playGongCrash(p, 0, 0.55, 0.75);
    });
    patch('fx_tower_destroyed', (p) => {
      playGongCrash(p, 0, 0.95, 1.6);
      playWarDrum(p, 0.04, 0.95, 0.68);
    });
    patch('fx_core_destroyed', (p) => {
      playGongCrash(p, 0, 1.0, 2.5);
      playWarDrum(p, 0, 1.0, 0.62);
      playBianzhong(p, midi(62), 0.08, 1.8, 0.9);
    });
    patch('epic_roar', (p) => {
      playWarDrum(p, 0, 0.85, 0.68);
      p.osc({ w: 'brass', f: 112, f1: 72, ft: 0.45, a: 0.08, d: 0.65, g: 0.35 });
      p.noise({ k: 'brown', flt: 'bandpass', fc: 420, fc1: 190, q: 1.4, a: 0.06, d: 0.55, g: 0.45 });
    });
    patch('epic_fall', (p) => {
      playGongCrash(p, 0, 0.9, 1.6);
      playWarDrum(p, 0.05, 0.9, 0.72);
    });
    patch('coin', (p) => {
      p.ring(2560, [1, 1.48], { a: 0.001, d: 0.14, g: 0.18 });
      p.ring(3120, [1, 1.5], { t: 0.04, a: 0.001, d: 0.16, g: 0.16 });
    });
    patch('coin_big', (p) => {
      [74, 81, 86].forEach((m, idx) => p.ring(midi(m) * 4, [1, 1.48], { t: idx * 0.045, a: 0.001, d: 0.2, g: 0.18 }));
    });
    patch('fx_gold_gain', (p) => {
      p.ring(2720, [1, 1.48], { a: 0.001, d: 0.14, g: 0.14 });
    });
    patch('buy', (p) => {
      p.ring(2200, [1, 1.5], { a: 0.001, d: 0.16, g: 0.18 });
      playBianzhong(p, midi(81), 0.04, 0.28, 0.65);
    });
    patch('fx_heal', (p) => {
      playGuzheng(p, midi(74), 0, 0.28, 0.52);
      playGuzheng(p, midi(81), 0.05, 0.32, 0.52);
    });
    patch('fx_shield_break', (p) => {
      p.ring(1480, [1, 1.62], { a: 0.001, d: 0.18, g: 0.22 });
      p.noise({ k: 'white', flt: 'bandpass', fc: 3400, fc1: 1200, q: 1.4, a: 0.002, d: 0.11, g: 0.24 });
    });
    patch('fx_level_up', (p) => {
      playPentatonicPhrase(p, [69, 74, 81], 0.05, 0.38, 0.48, 'bianzhong');
    });
    patch('levelup_player', (p) => {
      playPentatonicPhrase(p, [62, 64, 67, 69, 74], 0.055, 0.55, 0.65, 'bianzhong');
    });
    patch('fx_respawn', (p) => {
      playBianzhong(p, midi(74), 0, 0.45, 0.48);
    });
    patch('respawn_player', (p) => {
      playPentatonicPhrase(p, [62, 69, 74, 81], 0.055, 0.65, 0.72, 'guzheng');
      playBianzhong(p, midi(74), 0.1, 0.6, 0.75);
    });
    patch('fx_recall_start', (p) => {
      playGuqin(p, midi(69), 0, 0.42, 0.55);
      playBianzhong(p, midi(81), 0.06, 0.42, 0.45);
    });
    patch('recall_channel', (p) => {
      playXiao(p, midi(74), 0, 0.42, 0.45);
      playGuqin(p, midi(81), 0.04, 0.38, 0.42);
    });
    patch('fx_recall_done', (p) => {
      playPentatonicPhrase(p, [74, 81, 86], 0.04, 0.48, 0.72, 'bianzhong');
    });
    patch('fx_flash', (p) => {
      p.noise({ k: 'pink', flt: 'bandpass', fc: 1400, fc1: 4400, q: 1.2, a: 0.002, d: 0.14, g: 0.3 });
      playGuzheng(p, midi(86), 0, 0.18, 0.55);
    });
    patch('player_hurt', (p) => {
      playWarDrum(p, 0, 0.55, 1.05);
      p.noise({ k: 'pink', flt: 'lowpass', fc: 1200, a: 0.001, d: 0.08, g: 0.3 });
    });
    patch('player_hurt_heavy', (p) => {
      playWarDrum(p, 0, 0.92, 0.74);
      playGongCrash(p, 0, 0.35, 0.45);
    });
    patch('skill_hit', (p) => {
      p.ring(1860, [1, 1.48], { a: 0.001, d: 0.11, g: 0.18 });
      playWoodblock(p, 0, 0.45, true);
    });
    patch('heartbeat', (p) => {
      playWarDrum(p, 0, 0.52, 0.54);
      playWarDrum(p, 0.18, 0.38, 0.52);
    });
    patch('reject', (p) => {
      playWoodblock(p, 0, 0.62, false);
      playWoodblock(p, 0.055, 0.48, false);
    });
    patch('death_minion', (p) => {
      p.noise({ k: 'pink', flt: 'lowpass', fc: 800, fc1: 260, a: 0.002, d: 0.11, g: 0.22 });
    });
    patch('death_minion_big', (p) => {
      playWarDrum(p, 0, 0.5, 0.85);
      p.noise({ k: 'brown', flt: 'lowpass', fc: 760, fc1: 220, a: 0.004, d: 0.22, g: 0.28 });
    });
    patch('death_monster', (p) => {
      playWarDrum(p, 0, 0.62, 0.78);
      playWoodblock(p, 0.03, 0.45, false);
    });
    patch('death_hero_ally', (p) => {
      playGongCrash(p, 0, 0.42, 0.95);
      playXiao(p, midi(69), 0.04, 0.55, 0.62, midi(72));
    });
    patch('death_hero_enemy', (p) => {
      playGongCrash(p, 0, 0.52, 0.9);
      playBianzhong(p, midi(74), 0.04, 0.45, 0.68);
    });
    patch('death_player', (p) => {
      playGongCrash(p, 0, 0.78, 1.8);
      playXiao(p, midi(62), 0.08, 0.95, 0.75, midi(64));
      playErhu(p, midi(69), 0.14, 0.9, 0.62, midi(72));
    });
    patch('kill_ally', (p) => {
      playBianzhong(p, midi(74), 0, 0.45, 0.68);
      playGuzheng(p, midi(81), 0.04, 0.35, 0.62);
    });
    patch('kill_enemy', (p) => {
      playWarDrum(p, 0, 0.62, 0.86);
      playErhu(p, midi(64), 0.03, 0.42, 0.52, midi(67));
    });
    patch('kill_player', (p) => {
      playGongCrash(p, 0, 0.65, 0.9);
      playPentatonicPhrase(p, [74, 79, 86], 0.06, 0.5, 0.72, 'bianzhong');
    });

    // ── 战局礼乐播报全系 (zS)：建鼓 × 编钟 × 古筝五声华彩 ──
    patch('ann_match_start', (p) => {
      // 让位给开局「起」动机（0~0.41s 古筝五声上行刮奏），在落宫那一拍以沉稳建鼓与轻远锣托底
      playWarDrum(p, 0.41, 0.62, 0.82);
      playGongCrash(p, 0.42, 0.36, 1.5);
    });
    patch('ann_minions_spawn', (p) => {
      playWarDrum(p, 0, 0.72, 0.9);
      playTangHorn(p, midi(62), 0.04, 0.45, 0.68);
      playSnareRoll(p, 0.12, 0.55);
    });
    patch('ann_super_minions', (p) => {
      playWarDrum(p, 0, 0.85, 0.8);
      playTangHorn(p, midi(69), 0.04, 0.55, 0.78);
      playGongCrash(p, 0.08, 0.55, 0.85);
    });
    patch('ann_epic_spawn', (p) => {
      playGongCrash(p, 0, 0.78, 1.4);
      playWarDrum(p, 0.06, 0.82, 0.68);
      playTangHorn(p, midi(50), 0.08, 0.72, 0.75);
    });
    patch('ann_epic_slain', (p) => {
      playGongCrash(p, 0, 0.85, 1.4);
      playPentatonicPhrase(p, [62, 69, 74, 81], 0.06, 0.65, 0.8, 'bianzhong');
    });
    patch('ann_tower_destroyed', (p) => {
      playGongCrash(p, 0, 0.82, 1.35);
      playWarDrum(p, 0.04, 0.85, 0.72);
      playPentatonicPhrase(p, [74, 69, 62], 0.07, 0.48, 0.68, 'bianzhong');
    });
    patch('ann_first_blood', (p) => {
      playGongCrash(p, 0, 0.72, 1.1);
      playWarDrum(p, 0.02, 0.85, 0.95);
      playPentatonicPhrase(p, [74, 81, 86], 0.055, 0.5, 0.78, 'bianzhong');
    });
    patch('ann_double_kill', (p) => {
      playWarDrum(p, 0, 0.75, 1.0);
      playPentatonicPhrase(p, [74, 81], 0.07, 0.45, 0.78, 'bianzhong');
    });
    patch('ann_triple_kill', (p) => {
      playWarDrum(p, 0, 0.82, 1.02);
      playPentatonicPhrase(p, [74, 79, 86], 0.065, 0.55, 0.82, 'bianzhong');
    });
    patch('ann_quadra_kill', (p) => {
      playGongCrash(p, 0, 0.65, 1.2);
      playPentatonicPhrase(p, [69, 74, 81, 86], 0.06, 0.65, 0.85, 'bianzhong');
    });
    patch('ann_penta_kill', (p) => {
      playGongCrash(p, 0, 0.95, 2.0);
      playWarDrum(p, 0.04, 0.92, 0.78);
      playPentatonicPhrase(p, [62, 69, 74, 81, 86, 93], 0.065, 0.9, 0.9, 'bianzhong');
      playTangHorn(p, midi(74), 0.14, 0.75, 0.75);
    });
    patch('ann_killing_spree', (p) => {
      playWarDrum(p, 0, 0.72, 1.05);
      playPentatonicPhrase(p, [74, 76, 81], 0.06, 0.45, 0.72, 'guzheng');
    });
    patch('ann_unstoppable', (p) => {
      playGongCrash(p, 0, 0.55, 1.0);
      playPentatonicPhrase(p, [74, 79, 81, 86], 0.055, 0.55, 0.78, 'bianzhong');
    });
    patch('ann_legendary', (p) => {
      playGongCrash(p, 0, 0.88, 1.8);
      playWarDrum(p, 0.05, 0.88, 0.82);
      playPentatonicPhrase(p, [62, 69, 74, 79, 86], 0.065, 0.8, 0.88, 'bianzhong');
    });
    patch('ann_shutdown', (p) => {
      playGongCrash(p, 0, 0.62, 0.95);
      playPentatonicPhrase(p, [86, 81, 74], 0.055, 0.45, 0.76, 'guzheng');
    });
    patch('ann_ace', (p) => {
      playGongCrash(p, 0, 0.92, 1.9);
      playWarDrum(p, 0.06, 0.9, 0.74);
      playPentatonicPhrase(p, [62, 69, 74, 81, 86], 0.07, 0.85, 0.86, 'bianzhong');
    });
    patch('ann_victory', (p) => {
      playGongCrash(p, 0, 0.9, 2.2);
      playPentatonicPhrase(p, [74, 76, 78, 81, 86], 0.08, 1.1, 0.78, 'bianzhong');
    });
    patch('ann_defeat', (p) => {
      playGongCrash(p, 0, 0.78, 2.4);
      playXiao(p, midi(69), 0.12, 1.1, 0.72, midi(72));
    });
  }

  if (r1?.ui_confirm) {
    // ── 朱印落款与「唐宋动机」：由 playTangSongCue 触发，不走内核事件 ──
    const cue = (key: string, meta: Partial<SfxEntryLike>, fn: (p: SynthPatchLike) => void) => {
      if (!r1[key]) r1[key] = { ...r1.ui_confirm };
      patch(key, fn, { poly: 1, prio: 3, jitter: 0, ...meta });
    };
    // 朱印 = 木（印身）+ 革（案面低频）+ 磬的泛音；重而空旷
    cue(CUE_KEYS.seal, { len: 1.9, gap: 0.3, rev: 0.44 }, (p) => {
      playSealWood(p, 0, 1);
      playSealThump(p, 0.004, 1);
      playQing(p, midi(86), 0.012, 1.5, 0.92);
    });
    // 墨印：同一个动作，更干更暗，磬音压低、不亮
    cue(CUE_KEYS['seal-ink'], { len: 1.3, gap: 0.3, rev: 0.24 }, (p) => {
      playSealWood(p, 0, 0.9, 0.76);
      playSealThump(p, 0.004, 0.95, 0.86);
      playQing(p, midi(74), 0.014, 0.8, 0.5);
    });
    // 击杀小印：轻轻一点，不抢战斗的声音
    cue(CUE_KEYS['seal-small'], { len: 0.7, gap: 0.2, rev: 0.2 }, (p) => {
      playSealWood(p, 0, 0.62, 1.42);
      playSealThump(p, 0.003, 0.4, 1.4);
      playQing(p, midi(93), 0.01, 0.5, 0.42);
    });
    // 起（开卷 / 入场）：徵–羽–宫–商–角 上行刮奏，落在高八度宫音（D 宫）
    cue(CUE_KEYS['motif-qi'], { len: 2.4, gap: 1, rev: 0.5 }, (p) => {
      [69, 71, 74, 76, 78].forEach((m, i) => playGuzheng(p, midi(m), i * 0.075, 0.5, 0.52 + i * 0.06));
      playGuzheng(p, midi(86), 0.41, 1.3, 0.86);
      playBianzhong(p, midi(86), 0.41, 1.5, 0.6);
      playGuqin(p, midi(62), 0.41, 1.4, 0.4);
    });
    // 收（落印 / 结算）：商→宫 下行二度，垫一个低八度宫音
    cue(CUE_KEYS['motif-shou'], { len: 2.8, gap: 1, rev: 0.5 }, (p) => {
      playGuzheng(p, midi(76), 0.26, 0.5, 0.72);
      playBianzhong(p, midi(76), 0.26, 0.6, 0.5);
      playGuzheng(p, midi(74), 0.6, 1.6, 0.8);
      playBianzhong(p, midi(74), 0.6, 1.7, 0.6);
      playGuqin(p, midi(62), 0.6, 1.8, 0.7);
      playBianzhong(p, midi(62), 0.6, 1.6, 0.46);
    });
    // 隐草（方案 1 · 干脆拨草）：双层物理草叶沙沙 + 极轻衣袂落定闷声，零乐器笛哨杂音
    cue(CUE_KEYS['stealth-in'], { len: 0.28, gap: 0.35, rev: 0.06 }, (p) => {
      p.noise({ k: 'white', flt: 'bandpass', fc: 3400, fc1: 1750, fct: 0.09, q: 1.6, t: 0, a: 0.008, h: 0.018, d: 0.085, g: 0.14 });
      p.noise({ k: 'pink', flt: 'bandpass', fc: 1050, fc1: 520, fct: 0.16, q: 1.2, t: 0.025, a: 0.015, h: 0.035, d: 0.13, g: 0.16 });
      p.osc({ w: 'sine', f: 96, f1: 58, ft: 0.09, t: 0.04, a: 0.008, d: 0.085, g: 0.07 });
    });
    // 硬控爆发（击飞 / 眩晕 / 击退 / 聚拢）：沉稳建鼓低频重砸 + 编钟清脆震音，加强打击确认感
    cue('fx_cc_impact', { len: 0.55, gap: 0.16, poly: 2, prio: 2, rev: 0.14, range: 36, jitter: 0.06 }, (p) => {
      playWarDrum(p, 0, 0.72, 1.12);
      playBianzhong(p, midi(79), 0.012, 0.24, 0.48);
      p.noise({ k: 'pink', flt: 'bandpass', fc: 1750, q: 1.1, t: 0, a: 0.002, d: 0.07, g: 0.24 });
    });
    // 刘娥·青石石化：低沉石印镇封 + 矿物结晶锁紧脆鸣
    cue('fx_petrify_hit', { len: 0.52, gap: 0.14, poly: 2, prio: 3, rev: 0.14, range: 40, jitter: 0.05 }, (p) => {
      p.osc({ f: 145, f1: 58, ft: 0.12, a: 0.002, d: 0.28, g: 0.62 });
      playSealThump(p, 0.005, 0.85, 0.78);
      p.noise({ k: 'white', flt: 'bandpass', fc: 3200, fc1: 4600, fct: 0.14, q: 2.2, t: 0.012, a: 0.004, d: 0.14, g: 0.28 });
      playQing(p, midi(62), 0.015, 0.24, 0.38);
    });
    // 刘娥·石化崩解：三声错落碎岩爆裂 + 碎石洒落
    cue('fx_petrify_break', { len: 0.42, gap: 0.14, poly: 2, prio: 2, rev: 0.12, range: 40, jitter: 0.06 }, (p) => {
      [0, 0.032, 0.068].forEach((t, i) => {
        p.noise({ k: 'white', flt: 'bandpass', fc: 2400 + i * 1300, q: 1.8, t, a: 0.001, d: 0.055, g: 0.34 - i * 0.06 });
      });
      p.noise({ k: 'pink', flt: 'bandpass', fc: 1100, fc1: 380, fct: 0.2, q: 1.1, t: 0.01, a: 0.004, d: 0.22, g: 0.26 });
      p.osc({ f: 195, f1: 72, ft: 0.08, t: 0, a: 0.002, d: 0.12, g: 0.28 });
    });
    // 苏轼·赤壁墨封：泼墨顿笔声 + 清脆收弦泛音定格
    cue('fx_ink_seal', { len: 0.46, gap: 0.14, poly: 2, prio: 3, rev: 0.18, range: 40, jitter: 0.05 }, (p) => {
      p.noise({ k: 'pink', flt: 'bandpass', fc: 1650, fc1: 440, fct: 0.18, q: 1.2, t: 0, a: 0.005, d: 0.18, g: 0.32 });
      playGuqin(p, midi(74), 0.01, 0.24, 0.58);
      playQing(p, midi(81), 0.02, 0.18, 0.32);
    });
    // 轻功腾空起势：衣袂御风上扬呼啸 + 高频气丝 + 极轻风铃点缀
    cue('fx_qinggong_soar', { len: 0.48, gap: 0.2, poly: 2, prio: 3, rev: 0.16, range: 42, jitter: 0.05 }, (p) => {
      p.noise({ k: 'pink', flt: 'bandpass', fc: 420, fc1: 2200, fct: 0.24, q: 1.4, t: 0, a: 0.015, h: 0.08, d: 0.2, g: 0.28 });
      p.noise({ k: 'white', flt: 'highpass', fc: 3400, t: 0.04, a: 0.02, d: 0.18, g: 0.15 });
      playQing(p, midi(86), 0.03, 0.22, 0.22);
    });
  }

  // 空间：活动混音器换「收紧实战声场」冲激响应，并联「城阙」短混响（离线混音器不经过 attach，保持原样）
  if (r1) {
    const crowdGuards: [string, number, number][] = [
      ['minion_swing', 0.22, 1],
      ['minion_melee_hit', 0.24, 1],
      ['minion_ranged_launch', 0.24, 1],
      ['minion_ranged_hit', 0.24, 1],
      ['coin', 0.28, 1],
      ['fx_gold_gain', 0.35, 1],
      ['fx_hit_physical', 0.16, 2],
      ['fx_hit_magic', 0.16, 2],
    ];
    for (const [k, minGap, maxPoly] of crowdGuards) {
      const e = r1[k];
      if (!e) continue;
      if (typeof e.gap !== 'number' || e.gap < minGap) e.gap = minGap;
      e.poly = maxPoly;
    }
  }
  const space = installTangSongSpace(mixer);
  liveMixer = mixer;

  const totalSfxCount = r1 ? Object.keys(r1).length : 0;
  const unpatchedKeys = r1 ? Object.keys(r1).filter((k) => !patchedKeys.has(k)) : [];

  mixer.__tsAudioDebug = () => ({
    mode: 'recorded-bgm-procedural-sfx',
    bgmMode: 'recorded-shuffle',
    sfxMode: 'procedural-tangsong',
    totalSfxCount,
    patchedSfxCount: patchedKeys.size,
    unpatchedCount: unpatchedKeys.length,
    unpatchedKeys,
    space,
  });
}

export type TangSongCue = 'seal' | 'seal-ink' | 'seal-small' | 'motif-qi' | 'motif-shou' | 'stealth-in';

const CUE_KEYS: Record<TangSongCue, string> = {
  seal: 'cue_seal',
  'seal-ink': 'cue_seal_ink',
  'seal-small': 'cue_seal_small',
  'motif-qi': 'cue_motif_qi',
  'motif-shou': 'cue_motif_shou',
  'stealth-in': 'cue_stealth_in',
};

let liveMixer: AudioMixerLike | null = null;

/**
 * 表现层的听觉落款：朱印三声与「唐宋动机」起 / 收。动机与其余音效一样固定 D 宫。
 * 活动混音器未就绪（还没有用户手势、页面在后台）时静默返回；响的时候让 BGM 闪避约 6dB / 0.8s。
 */
export function playTangSongCue(cue: TangSongCue): void {
  const mixer = liveMixer;
  if (!mixer?.ctx || mixer.ctx.state !== 'running') return;
  if (typeof document !== 'undefined' && document.hidden) return;
  try {
    if (!mixer.play(CUE_KEYS[cue])) return;
    if (cue !== 'seal-small') mixer.duck?.(0.5, 0.8);
  } catch {
    // 听觉落款不是必需品：出错就不响
  }
}
