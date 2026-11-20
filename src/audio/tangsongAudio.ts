/**
 * tangsongAudio.ts — 《唐宋荣耀》v5.0 纯程序化 WebAudio 唐宋配乐与音效引擎
 *
 * 与原版引擎使用完全同款的 WebAudio 节点合成手法（L1 微合成器 + 分层步进调度 +
 * 立体声乒乓延迟 + 卷积混响总线 + 音量/闪避/阵亡低通全兼容），从零重谱四首唐宋原创配乐，
 * 并全量重塑 r1 内核音效表（五声古琴、古筝、琵琶轮指、洞箫竹笛、二胡滑音、建鼓编钟、大锣丝竹）：
 * 1. menu   — 《长安月夜 · 丝竹雅集》(68 BPM, D 徵调五声)
 * 2. battle — 《破阵乐 · 汴京点兵》(124 BPM, D 羽调双层动态交叉淡入：日常琵琶竹笛 / 激战建鼓唢呐大锣)
 * 3. victory— 《凯旋长安 · 礼乐大典》(132 BPM, D 宫调编钟华彩)
 * 4. defeat — 《孤城残照 · 洞箫挽歌》(84 BPM, D 羽调孤钟洞箫二胡)
 */

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
  __tsSfxAttached?: boolean;
  __tsAudioDebug?: () => Record<string, unknown>;
}

export interface MusicController {
  readonly track: string;
  readonly channels: string[];
  setTrack(track: string): void;
  setMood(intensity: number, tension: number): void;
  tick(lookahead?: number): void;
  dispose(): void;
}

const midi = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const safeHz = (f: number) => Math.max(24, Math.min(18000, f));
const clamp01 = (v: number) => (v <= 0 ? 0 : v >= 1 ? 1 : v);

type MelNote = [step: number, midi: number, lenSteps: number, vel: number, slideFrom?: number];

function indexMelody(notes: MelNote[], loopSteps: number): MelNote[][] {
  const bins: MelNote[][] = Array.from({ length: loopSteps }, () => []);
  for (const n of notes) {
    const idx = ((n[0] % loopSteps) + loopSteps) % loopSteps;
    bins[idx].push(n);
  }
  return bins;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. 纯程序化唐宋民族乐器合奏库 (基于引擎 L1 节点微合成器)
// ─────────────────────────────────────────────────────────────────────────────

/** 山水空灵铺底（纯五度 / 九度开放声部，柔和低通包络） */
function playInkPad(
  p: SynthPatchLike,
  freqs: number[],
  t: number,
  dur: number,
  vel: number,
  bright = 1.0,
): void {
  const f = p.filt('lowpass', 420 * bright, 0.65);
  p.ramp(f.frequency, [
    [t, 440 * bright],
    [t + dur * 0.42, 1650 * bright],
    [t + dur + 1.1, 680 * bright],
  ]);
  const l = p.pan(-0.52, f);
  const r = p.pan(0.52, f);
  const a = Math.min(0.85, dur * 0.34);
  const h = Math.max(0, dur - a);
  for (let i = 0; i < freqs.length; i++) {
    const hz = safeHz(freqs[i]);
    const g = (0.072 * vel) / (1 + i * 0.14);
    const ti = t + i * 0.008;
    p.osc({ w: 'softsaw', f: hz, det: -8, t: ti, a, h, d: 1.25, g, to: l });
    p.osc({ w: 'softsaw', f: hz, det: 8, t: ti + 0.01, a: a * 1.08, h, d: 1.25, g, to: r });
  }
  p.osc({ w: 'sine', f: safeHz(freqs[0] * 0.5), t, a, h, d: 1.1, g: 0.04 * vel, to: f });
}

/** 古筝拨奏：明丽弦身 + 指甲脆响 + 共振腔余韵 */
function playGuzheng(
  p: SynthPatchLike,
  f: number,
  t: number,
  dur: number,
  vel: number,
): void {
  const hz = safeHz(f);
  const lpf = p.filt('lowpass', 720, 1.35);
  p.ramp(lpf.frequency, [
    [t, Math.min(8200, 1400 + 4600 * vel)],
    [t + 0.09, Math.max(480, hz * 2.3)],
    [t + dur + 0.28, Math.max(320, hz * 1.15)],
  ]);
  p.osc({ w: 'string', f: hz, t, a: 0.002, d: dur * 1.35 + 0.18, g: 0.22 * vel, vib: 5, vr: 4.5, vd: 0.16, to: lpf });
  p.osc({ w: 'triangle', f: safeHz(hz * 2), det: 3, t, a: 0.002, d: Math.min(0.28, dur * 0.55), g: 0.075 * vel, to: lpf });
  p.noise({ flt: 'bandpass', fc: Math.min(7200, Math.max(1800, hz * 4.5)), q: 2.4, t, a: 0.001, d: 0.018, g: 0.055 * vel });
}

/** 琵琶弹挑 / 轮指：高颗粒感短衰减拨弦 + 清脆木板膛音 */
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
  const step = Math.min(0.048, dur * 0.28);
  for (let i = 0; i < hits; i++) {
    const ti = t + i * step;
    const vi = vel * (i === 0 ? 1 : 0.72 - i * 0.12);
    const lpf = p.filt('bandpass', Math.min(4800, hz * 2.1), 0.75);
    const dry = p.gain(0.75);
    p.osc({ w: 'string', f: hz, t: ti, a: 0.001, d: Math.max(0.11, dur * 0.58), g: 0.22 * vi, to: dry });
    p.osc({ w: 'softsq', f: safeHz(hz * 1.995), t: ti, a: 0.001, d: Math.max(0.055, dur * 0.22), g: 0.08 * vi, to: lpf });
    p.noise({ k: 'pink', flt: 'bandpass', fc: 2800, q: 2.0, t: ti, a: 0.001, d: 0.014, g: 0.095 * vi });
  }
}

/** 古琴低音 / 泛音（含标志性走手音滑弦） */
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
  const lpf = p.filt('lowpass', 950, 0.9);
  p.ramp(lpf.frequency, [
    [t, Math.min(3400, hz * 4.5 + 800 * vel)],
    [t + 0.18, Math.max(240, hz * 2.2)],
    [t + dur + 0.35, Math.max(180, hz * 1.3)],
  ]);
  p.osc({
    w: 'string',
    f: fStart,
    f1: slideFrom ? hz : undefined,
    ft: slideFrom ? Math.min(0.16, dur * 0.4) : undefined,
    t,
    a: 0.005,
    h: dur * 0.45,
    d: dur * 0.9 + 0.25,
    g: 0.26 * vel,
    vib: 7,
    vr: 4.2,
    vd: 0.18,
    to: lpf,
  });
  p.osc({ w: 'sine', f: safeHz(fStart * 0.5), f1: slideFrom ? safeHz(hz * 0.5) : undefined, ft: 0.16, t, a: 0.006, h: dur * 0.5, d: dur * 0.8 + 0.2, g: 0.16 * vel });
}

/** 洞箫：温润竹腔 + 起吹气声 + 婉转吟揉 */
function playXiao(
  p: SynthPatchLike,
  f: number,
  t: number,
  dur: number,
  vel: number,
  slideFrom?: number,
): void {
  const hz = safeHz(f);
  const fStart = slideFrom ? safeHz(slideFrom) : hz * 0.96;
  const lpf = p.filt('lowpass', Math.min(4400, hz * 3.4), 0.7);
  const h = Math.max(0, dur - 0.09);
  p.osc({
    w: 'glass',
    f: fStart,
    f1: hz,
    ft: Math.min(0.095, dur * 0.3),
    t,
    a: 0.065,
    h,
    d: 0.26,
    g: 0.24 * vel,
    vib: 11,
    vr: 5.1,
    vd: 0.18,
    to: lpf,
  });
  p.osc({ w: 'sine', f: safeHz(hz * 2), t, a: 0.08, h: Math.max(0, h - 0.04), d: 0.16, g: 0.035 * vel, to: lpf });
  p.noise({ k: 'pink', flt: 'bandpass', fc: Math.min(5600, hz * 2.2), q: 2.2, t, a: 0.035, h: Math.max(0, h * 0.4), d: 0.16, g: 0.06 * vel });
}

/** 竹笛：清越明亮、带笛膜清脆震颤泛音 */
function playDizi(
  p: SynthPatchLike,
  f: number,
  t: number,
  dur: number,
  vel: number,
  slideFrom?: number,
): void {
  const hz = safeHz(f);
  const fStart = slideFrom ? safeHz(slideFrom) : hz * 0.95;
  const h = Math.max(0, dur - 0.055);
  p.osc({
    w: 'glass',
    f: fStart,
    f1: hz,
    ft: Math.min(0.065, dur * 0.24),
    t,
    a: 0.024,
    h,
    d: 0.18,
    g: 0.21 * vel,
    vib: 14,
    vr: 5.8,
    vd: 0.11,
  });
  p.osc({
    w: 'reed',
    f: hz,
    det: 5,
    t: t + 0.01,
    a: 0.04,
    h: Math.max(0, h - 0.02),
    d: 0.15,
    g: 0.075 * vel,
    vib: 14,
    vr: 5.8,
    vd: 0.12,
  });
  p.noise({ flt: 'bandpass', fc: Math.min(6400, hz * 2.5), q: 1.8, t, a: 0.01, d: 0.09, g: 0.045 * vel });
}

/** 二胡：双琴筒共振峰 + 深情滑音揉弦 */
function playErhu(
  p: SynthPatchLike,
  f: number,
  t: number,
  dur: number,
  vel: number,
  slideFrom?: number,
): void {
  const hz = safeHz(f);
  const fStart = slideFrom ? safeHz(slideFrom) : hz * 0.91;
  const out = p.gain(0.95);
  const f1 = p.filt('bandpass', 780, 1.9, out);
  const f2 = p.filt('bandpass', 2150, 2.2, p.gain(0.45, out));
  const h = Math.max(0, dur - 0.08);
  const ft = Math.min(0.14, dur * 0.36);
  p.osc({ w: 'softsaw', f: fStart, f1: hz, ft, det: -4, t, a: 0.055, h, d: 0.22, g: 0.19 * vel, vib: 16, vr: 5.4, vd: 0.14, to: f1 });
  p.osc({ w: 'reed', f: fStart, f1: hz, ft, det: 5, t, a: 0.06, h, d: 0.2, g: 0.14 * vel, vib: 16, vr: 5.4, vd: 0.14, to: f2 });
  p.noise({ k: 'pink', flt: 'bandpass', fc: 1900, q: 1.6, t, a: 0.02, d: 0.07, g: 0.028 * vel });
}

/** 盛唐礼乐号角（铜管+唢呐合奏质感，仅用于凯旋或战斗副歌） */
function playTangHorn(
  p: SynthPatchLike,
  f: number,
  t: number,
  dur: number,
  vel: number,
): void {
  const hz = safeHz(f);
  const lpf = p.filt('lowpass', 700, 1.0);
  p.ramp(lpf.frequency, [
    [t, 640],
    [t + 0.075, 2200 + 1800 * vel],
    [t + dur * 0.65, 1450 + 1100 * vel],
    [t + dur + 0.18, 720],
  ]);
  const h = Math.max(0, dur - 0.09);
  p.osc({ w: 'brass', f: hz, det: -4, t, a: 0.045, h, d: 0.22, g: 0.19 * vel, vib: 7, vr: 5.0, vd: 0.24, to: lpf });
  p.osc({ w: 'reed', f: hz, det: 5, t, a: 0.055, h, d: 0.2, g: 0.11 * vel, to: lpf });
}

/** 青铜编钟 / 玉磬：谐和古铜钟韵 */
function playBianzhong(
  p: SynthPatchLike,
  f: number,
  t: number,
  dur: number,
  vel: number,
): void {
  const hz = safeHz(f);
  p.fm({ f: hz, ratio: 2.0, idx: 0.42 + 1.45 * vel, idx1: 0.03, idt: Math.min(0.4, dur * 0.5), t, a: 0.002, d: dur, g: 0.21 * vel });
  p.osc({ w: 'sine', f: safeHz(hz * 2), t, a: 0.002, d: dur * 0.42, g: 0.055 * vel });
  p.osc({ w: 'sine', f: safeHz(hz * 3.01), t, a: 0.001, d: 0.07, g: 0.03 * vel });
}

/** 唐代建鼓 / 堂鼓与梆子击边 */
function playWarDrum(p: SynthPatchLike, t: number, vel: number, pitchScale = 1.0): void {
  const base = 132 * pitchScale;
  p.osc({ f: safeHz(base), f1: safeHz(46 * pitchScale), ft: 0.11, t, a: 0.002, d: 0.42, g: 0.62 * vel });
  p.osc({ w: 'triangle', f: safeHz(base * 1.9), f1: safeHz(88 * pitchScale), ft: 0.075, t, a: 0.002, d: 0.17, g: 0.34 * vel });
  p.noise({ k: 'pink', flt: 'lowpass', fc: 1350, fc1: 280, t, a: 0.001, d: 0.065, g: 0.28 * vel });
}

function playWoodblock(p: SynthPatchLike, t: number, vel: number, hi = true): void {
  const f = hi ? 1320 : 880;
  p.osc({ w: 'triangle', f, f1: f * 0.92, ft: 0.03, t, a: 0.001, d: 0.048, g: 0.24 * vel });
  p.osc({ f: f * 1.62, t, a: 0.001, d: 0.025, g: 0.12 * vel });
}

function playSnareRoll(p: SynthPatchLike, t: number, vel: number): void {
  p.noise({ k: 'pink', flt: 'bandpass', fc: 1950, q: 0.75, t, a: 0.001, d: 0.14, g: 0.36 * vel });
  p.osc({ w: 'triangle', f: 196, f1: 138, ft: 0.05, t, a: 0.001, d: 0.075, g: 0.26 * vel });
}

function playGongCrash(p: SynthPatchLike, t: number, vel: number, dur = 2.4): void {
  p.ring(88, [1, 1.38, 1.91, 2.57, 3.31], { t, a: 0.015, d: dur, g: 0.18 * vel });
  p.noise({ k: 'pink', flt: 'bandpass', fc: 1100, fc1: 320, q: 0.7, t, a: 0.02, d: dur * 0.85, g: 0.28 * vel });
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. 分层步进调度基类（镜像原版 fm 调度器 + stereo ping-pong delay）
// ─────────────────────────────────────────────────────────────────────────────
abstract class TangSongScore {
  protected m: AudioMixerLike;
  protected step = 0;
  protected nextT: number;
  killAt = Infinity;
  protected out: GainNode;
  protected wetOut: GainNode;
  protected delayIn: GainNode;
  protected nodes: AudioNode[] = [];
  chanNames: string[] = [];

  constructor(mixer: AudioMixerLike, startAt: number, delaySec: number) {
    this.m = mixer;
    this.nextT = startAt;
    const ctx = mixer.ctx;
    this.out = this.keep(ctx.createGain());
    this.out.gain.value = 0;
    this.out.connect(mixer.musicIn);
    this.wetOut = this.keep(ctx.createGain());
    this.wetOut.gain.value = 0;
    this.wetOut.connect(mixer.musicRev);
    this.delayIn = this.keep(ctx.createGain());

    const dL = this.keep(ctx.createDelay(1.5));
    const dR = this.keep(ctx.createDelay(1.5));
    dL.delayTime.value = delaySec;
    dR.delayTime.value = delaySec;
    const fbL = this.keep(ctx.createGain());
    const fbR = this.keep(ctx.createGain());
    fbL.gain.value = 0.36;
    fbR.gain.value = 0.36;
    const lp = this.keep(ctx.createBiquadFilter());
    lp.type = 'lowpass';
    lp.frequency.value = 2400;

    this.delayIn.connect(dL);
    dL.connect(fbL);
    fbL.connect(lp);
    lp.connect(dR);
    dR.connect(fbR);
    fbR.connect(dL);

    if (mixer.kit?.canPan && typeof ctx.createStereoPanner === 'function') {
      const pL = this.keep(ctx.createStereoPanner());
      const pR = this.keep(ctx.createStereoPanner());
      pL.pan.value = -0.6;
      pR.pan.value = 0.6;
      dL.connect(pL);
      dR.connect(pR);
      pL.connect(this.out);
      pR.connect(this.out);
    } else {
      dL.connect(this.out);
      dR.connect(this.out);
    }
  }

  protected keep<T extends AudioNode>(node: T): T {
    this.nodes.push(node);
    return node;
  }

  protected layer(weight: number): { dry: GainNode; wet: GainNode; dly: GainNode } {
    const mk = (dest: AudioNode) => {
      const g = this.keep(this.m.ctx.createGain());
      g.gain.value = weight;
      g.connect(dest);
      return g;
    };
    return { dry: mk(this.out), wet: mk(this.wetOut), dly: mk(this.delayIn) };
  }

  protected setLayer(l: { dry: GainNode; wet: GainNode; dly: GainNode }, v: number, tau: number): void {
    const now = this.m.now();
    l.dry.gain.setTargetAtTime(v, now, tau);
    l.wet.gain.setTargetAtTime(v, now, tau);
    l.dly.gain.setTargetAtTime(v, now, tau);
  }

  protected chan(
    name: string,
    gainVal: number,
    opts: { pan?: number; rev?: number; dly?: number; layer?: { dry: GainNode; wet: GainNode; dly: GainNode } } = {},
  ): GainNode {
    const ctx = this.m.ctx;
    const g = this.keep(ctx.createGain());
    g.gain.value = gainVal;
    this.chanNames.push(name);
    let tail: AudioNode = g;
    if (opts.pan && this.m.kit?.canPan && typeof ctx.createStereoPanner === 'function') {
      const p = this.keep(ctx.createStereoPanner());
      p.pan.value = opts.pan;
      g.connect(p);
      tail = p;
    }
    tail.connect(opts.layer ? opts.layer.dry : this.out);
    if (opts.rev) {
      const rg = this.keep(ctx.createGain());
      rg.gain.value = opts.rev;
      tail.connect(rg);
      rg.connect(opts.layer ? opts.layer.wet : this.wetOut);
    }
    if (opts.dly) {
      const dg = this.keep(ctx.createGain());
      dg.gain.value = opts.dly;
      tail.connect(dg);
      dg.connect(opts.layer ? opts.layer.dly : this.delayIn);
    }
    return g;
  }

  protected play(ch: AudioNode, time: number, fn: (patch: SynthPatchLike) => void): void {
    fn(this.m.note(ch, time));
  }

  protected rnd(): number {
    return this.m.kit.rnd();
  }

  fade(target: number, tau: number): void {
    const now = this.m.now();
    this.out.gain.setTargetAtTime(target, now, tau);
    this.wetOut.gain.setTargetAtTime(target, now, tau);
  }

  schedule(now: number, lookahead: number): void {
    const dur = this.stepDur();
    if (this.nextT < now - 0.12) {
      const skip = Math.ceil((now - this.nextT) / dur);
      this.step += skip;
      this.nextT += skip * dur;
    }
    while (this.nextT < now + lookahead) {
      const sd = this.stepDur();
      this.onStep(this.step, this.nextT, sd);
      this.nextT += sd;
      this.step++;
    }
  }

  abstract stepDur(): number;
  abstract onStep(step: number, time: number, sd: number): void;
  mood(_intensity: number, _tension: number): void {}

  dispose(): void {
    for (const n of this.nodes) {
      try {
        n.disconnect();
      } catch {
        // ignore
      }
    }
    this.nodes.length = 0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. 四首原创唐宋乐章
// ─────────────────────────────────────────────────────────────────────────────

// 《长安月夜 · 丝竹雅集》68 BPM, 16小节=128八分音符 (D徵调五声: D E G A B)
const MENU_CHORDS = [
  { bass: 38, pad: [50, 57, 62, 64] }, // D5sus2
  { bass: 43, pad: [55, 62, 67, 69] }, // G5sus2
  { bass: 40, pad: [52, 59, 64, 67] }, // Em7(no5) -> 清雅商音
  { bass: 45, pad: [57, 64, 69, 71] }, // A5sus2
  { bass: 38, pad: [50, 57, 62, 67] }, // Dadd11
  { bass: 43, pad: [55, 62, 67, 71] }, // G6
  { bass: 40, pad: [52, 57, 64, 69] }, // E-A-E-A
  { bass: 45, pad: [57, 62, 64, 69] }, // Asus4->2
  { bass: 47, pad: [59, 62, 66, 71] }, // Bm pentatonic flavor
  { bass: 43, pad: [55, 62, 67, 69] }, // Gadd9
  { bass: 38, pad: [50, 57, 62, 64] }, // Dsus2
  { bass: 45, pad: [57, 62, 64, 69] }, // Asus4
  { bass: 43, pad: [55, 62, 67, 71] }, // G6
  { bass: 40, pad: [52, 59, 64, 69] }, // E-B-E-A
  { bass: 45, pad: [57, 64, 69, 71] }, // A5add9
  { bass: 38, pad: [50, 57, 62, 69] }, // D5-9 收束
];

const MENU_MELODY: MelNote[] = [
  // A 段 (0..63): 洞箫与古筝夜吟长安月色
  [0, 74, 3, 0.82, 71], [3, 76, 1, 0.65], [4, 79, 4, 0.9], [8, 81, 3, 0.86], [11, 79, 1, 0.62], [12, 76, 4, 0.78],
  [16, 74, 2, 0.76], [18, 71, 2, 0.68], [20, 74, 4, 0.84], [24, 76, 3, 0.78], [27, 74, 1, 0.58], [28, 69, 4, 0.74],
  [32, 74, 3, 0.85, 72], [35, 76, 1, 0.66], [36, 79, 2, 0.84], [38, 81, 2, 0.88], [40, 83, 4, 0.94, 81], [44, 81, 4, 0.82],
  [48, 79, 2, 0.78], [50, 76, 2, 0.7], [52, 74, 4, 0.8], [56, 76, 6, 0.78], [62, 74, 2, 0.62],
  // B 段 (64..127): 二胡接过缠绵曲调，再合洞箫归于平远
  [64, 86, 3, 0.9, 83], [67, 83, 1, 0.68], [68, 81, 4, 0.86], [72, 79, 2, 0.78], [74, 81, 2, 0.82], [76, 83, 4, 0.88],
  [80, 79, 3, 0.82], [83, 76, 1, 0.64], [84, 74, 4, 0.8], [88, 76, 2, 0.74], [90, 79, 2, 0.8], [92, 81, 4, 0.86],
  [96, 83, 3, 0.9, 81], [99, 86, 1, 0.76], [100, 88, 4, 0.92], [104, 86, 2, 0.8], [106, 83, 2, 0.74], [108, 81, 4, 0.82],
  [112, 79, 3, 0.78], [115, 76, 1, 0.6], [116, 74, 4, 0.78], [120, 76, 3, 0.72], [123, 74, 5, 0.76],
];

const GUZHENG_PATTERNS = [
  [0, 1, 2, 3, 2, 1, 2, 3],
  [0, 2, 1, 3, 2, 3, 1, 2],
  [3, 2, 1, 0, 1, 2, 3, 1],
];

class MenuMusic extends TangSongScore {
  cPad = this.chan('ts-ink-pad', 0.42, { rev: 0.42 });
  cBass = this.chan('ts-guqin', 0.28, { rev: 0.18 });
  cGuzheng = this.chan('ts-guzheng', 0.88, { rev: 0.36, dly: 0.32, pan: -0.26 });
  cXiao = this.chan('ts-xiao', 0.64, { rev: 0.48, dly: 0.22, pan: 0.16 });
  cErhu = this.chan('ts-erhu', 0.56, { rev: 0.44, dly: 0.22, pan: -0.14 });
  cChime = this.chan('ts-bianzhong', 0.72, { rev: 0.58, dly: 0.32, pan: 0.32 });
  mel = indexMelody(MENU_MELODY, 128);

  constructor(mixer: AudioMixerLike, startAt: number) {
    super(mixer, startAt, (60 / 68) * 0.75);
  }
  stepDur() {
    return 60 / 68 / 2;
  }
  onStep(step: number, t: number, sd: number) {
    const cycle = Math.floor(step / 128);
    const local = step % 128;
    const bar = local >> 3;
    const beat = local & 7;
    const ch = MENU_CHORDS[bar];

    if (beat === 0) {
      this.play(this.cPad, t, (p) => playInkPad(p, ch.pad.map(midi), 0, sd * 8, 0.82, 0.92));
      this.play(this.cBass, t, (p) => playGuqin(p, midi(ch.bass), 0, sd * 6.5, 0.78, bar > 0 ? midi(ch.bass - 2) : undefined));
      if (bar % 4 === 0) {
        this.play(this.cChime, t, (p) => playBianzhong(p, midi(ch.pad[2] + 12), 0, sd * 6, 0.44));
      }
    }
    if (beat === 4 && bar % 2 === 1) {
      this.play(this.cBass, t, (p) => playGuqin(p, midi(ch.bass + 7), 0, sd * 3.2, 0.46));
    }

    // 古筝流水分解
    if (cycle > 0 || bar >= 2) {
      const pat = GUZHENG_PATTERNS[(cycle + (bar >> 2)) % GUZHENG_PATTERNS.length];
      const nMidi = ch.pad[pat[beat]] + 12;
      const vel = beat % 2 === 0 ? 0.56 : 0.36;
      this.play(this.cGuzheng, t, (p) => playGuzheng(p, midi(nMidi), 0, sd * 1.6, vel));
    }

    // 主旋律：洞箫 & 二胡轮流应答
    for (const note of this.mel[local]) {
      const dur = note[2] * sd;
      const hz = midi(note[1]);
      const sl = note[4] ? midi(note[4]) : undefined;
      if (bar >= 8 && bar < 12) {
        this.play(this.cErhu, t, (p) => playErhu(p, hz, 0, dur * 0.95, note[3] * 0.95, sl));
      } else {
        this.play(this.cXiao, t, (p) => playXiao(p, hz, 0, dur * 0.95, note[3], sl));
      }
    }

    // 月夜星点泛音与拍板点缀
    if (beat === 6 && this.rnd() < 0.34) {
      const harmonic = ch.pad[Math.floor(this.rnd() * ch.pad.length)] + 24;
      this.play(this.cChime, t, (p) => playGuqin(p, midi(harmonic), 0, 1.15, 0.22));
    }
  }
}

// 《破阵乐 · 汴京点兵》124 BPM, 16小节=256十六分音符 (D羽调五声: D F G A C + E)
const BATTLE_CHORDS = [
  { bass: 38, pad: [50, 57, 62, 65] }, // Dm7(no3+4)->D5m
  { bass: 38, pad: [50, 57, 62, 67] },
  { bass: 36, pad: [48, 55, 60, 62] }, // Csus2
  { bass: 36, pad: [48, 55, 60, 64] },
  { bass: 34, pad: [46, 53, 58, 62] }, // Bbadd9
  { bass: 36, pad: [48, 55, 60, 64] }, // C
  { bass: 38, pad: [50, 57, 62, 64] }, // Dsus2
  { bass: 45, pad: [57, 64, 67, 69] }, // A7sus4
  { bass: 41, pad: [53, 60, 65, 67] }, // Fadd9
  { bass: 43, pad: [55, 62, 67, 69] }, // Gsus2
  { bass: 45, pad: [57, 64, 69, 72] }, // Am
  { bass: 45, pad: [57, 64, 69, 71] }, // A5add9
  { bass: 34, pad: [46, 53, 58, 62] }, // Bb
  { bass: 36, pad: [48, 55, 60, 64] }, // C
  { bass: 45, pad: [57, 62, 64, 69] }, // Asus4
  { bass: 38, pad: [50, 57, 62, 69] }, // D5-9
];

const BATTLE_MELODY: MelNote[] = [
  // A 段：琵琶与竹笛英挺对线主调 (0..127)
  [0, 74, 4, 0.85, 72], [4, 77, 4, 0.82], [8, 79, 4, 0.88], [12, 81, 4, 0.9],
  [16, 79, 6, 0.86], [22, 77, 2, 0.72], [24, 74, 8, 0.88],
  [32, 72, 4, 0.8], [36, 74, 4, 0.82], [40, 77, 6, 0.88], [46, 74, 2, 0.7],
  [48, 72, 4, 0.78], [52, 69, 4, 0.72], [56, 72, 8, 0.84],
  [64, 74, 3, 0.86], [67, 77, 1, 0.66], [68, 79, 4, 0.88], [72, 81, 4, 0.92, 79], [76, 84, 4, 0.95],
  [80, 81, 6, 0.88], [86, 79, 2, 0.74], [88, 77, 8, 0.86],
  [96, 79, 4, 0.85], [100, 77, 4, 0.82], [104, 74, 4, 0.84], [108, 72, 4, 0.78],
  [112, 74, 16, 0.92],
  // B 段：破阵激昂副歌 (128..255)
  [128, 86, 4, 0.95, 84], [132, 84, 2, 0.84], [134, 81, 2, 0.8], [136, 79, 4, 0.88], [140, 81, 4, 0.9],
  [144, 84, 6, 0.92], [150, 81, 2, 0.78], [152, 79, 8, 0.88],
  [160, 77, 4, 0.86], [164, 79, 4, 0.88], [168, 81, 4, 0.92], [172, 84, 4, 0.95],
  [176, 86, 8, 0.98, 84], [184, 84, 4, 0.86], [188, 81, 4, 0.84],
  [192, 89, 4, 1.0, 86], [196, 86, 4, 0.92], [200, 84, 4, 0.9], [204, 81, 4, 0.86],
  [208, 84, 6, 0.92], [214, 81, 2, 0.78], [216, 79, 8, 0.88],
  [224, 81, 4, 0.9], [228, 79, 4, 0.86], [232, 77, 4, 0.84], [236, 79, 4, 0.88],
  [240, 81, 8, 0.92], [248, 74, 8, 0.94],
];

const EXPLORE_DRUM = [0.85, 0, 0, 0, 0.35, 0, 0.65, 0, 0.75, 0, 0.45, 0, 0.35, 0, 0.55, 0];
const COMBAT_KICK = [1, 0, 0, 0.6, 0, 0, 0.85, 0, 1, 0, 0, 0.55, 0, 0, 0.8, 0];
const COMBAT_SNARE = [0, 0, 0, 0, 0.92, 0, 0, 0.35, 0, 0, 0, 0, 0.95, 0, 0.35, 0.5];
const PIPA_ACCENT = [0.9, 0.45, 0.75, 0.5, 0.85, 0.48, 0.7, 0.5, 0.92, 0.45, 0.75, 0.52, 0.88, 0.5, 0.78, 0.62];

class BattleMusic extends TangSongScore {
  lExplore = this.layer(1);
  lCombat = this.layer(0);
  cPad = this.chan('ts-battle-pad', 0.36, { rev: 0.35 });
  eGuqin = this.chan('ts-explore-guqin', 0.3, { layer: this.lExplore, rev: 0.14 });
  ePipa = this.chan('ts-explore-pipa', 0.95, { layer: this.lExplore, rev: 0.25, dly: 0.28, pan: -0.26 });
  eDizi = this.chan('ts-explore-dizi', 0.72, { layer: this.lExplore, rev: 0.44, dly: 0.2, pan: 0.14 });
  eChime = this.chan('ts-explore-chime', 0.68, { layer: this.lExplore, rev: 0.5, dly: 0.28, pan: 0.26 });
  ePerc = this.chan('ts-explore-perc', 0.64, { layer: this.lExplore, rev: 0.16 });
  cBass = this.chan('ts-combat-bass', 0.34, { layer: this.lCombat });
  cDrum = this.chan('ts-combat-drum', 0.82, { layer: this.lCombat, rev: 0.2 });
  cPipa = this.chan('ts-combat-pipa', 0.92, { layer: this.lCombat, rev: 0.24, dly: 0.22, pan: -0.32 });
  cHorn = this.chan('ts-combat-horn', 0.68, { layer: this.lCombat, rev: 0.38, dly: 0.18, pan: 0.16 });
  cErhu = this.chan('ts-combat-erhu', 0.62, { layer: this.lCombat, rev: 0.36, dly: 0.18, pan: -0.18 });
  mel = indexMelody(BATTLE_MELODY, 256);
  private iVal = 0;
  private tVal = 0;
  private applied = -1;

  constructor(mixer: AudioMixerLike, startAt: number) {
    super(mixer, startAt, (60 / 124) * 0.75);
  }
  stepDur() {
    return 60 / 124 / 4;
  }
  mood(intensity: number, tension: number) {
    this.iVal = clamp01(intensity);
    this.tVal = clamp01(tension);
    const driver = Math.max(this.iVal, this.tVal * 1.15);
    const combatMix = clamp01((driver - 0.26) / 0.42);
    if (Math.abs(combatMix - this.applied) < 0.025 && this.applied >= 0) return;
    this.applied = combatMix;
    this.setLayer(this.lExplore, 1 - combatMix * 0.72, 0.55);
    this.setLayer(this.lCombat, combatMix, 0.45);
  }
  onStep(step: number, t: number, sd: number) {
    const cycle = Math.floor(step / 256);
    const local = step % 256;
    const bar = local >> 4;
    const sub = local & 15;
    const ch = BATTLE_CHORDS[bar];
    const m = this.applied >= 0 ? this.applied : 0;
    const heavy = bar % 8 === 7;
    const j = () => (this.rnd() - 0.5) * 0.008;

    if (sub === 0) {
      this.play(this.cPad, t, (p) => playInkPad(p, ch.pad.map(midi), 0, sd * 16, 0.75 + m * 0.25, 0.85 + m * 0.5));
    }

    // 对线/巡逻层 (Pipa + Dizi + Guqin + Light Tanggu)
    if (m < 0.92) {
      if ((sub & 3) === 0) {
        const octave = sub === 8 ? 12 : 0;
        this.play(this.eGuqin, t, (p) => playGuqin(p, midi(ch.bass + octave), 0, sd * 3.5, sub === 0 ? 0.8 : 0.52));
      }
      if ((sub & 1) === 0 && (cycle > 0 || bar >= 1)) {
        const idx = [0, 2, 1, 3, 2, 3, 1, 2][sub >> 1];
        const pitch = ch.pad[idx] + 12;
        this.play(this.ePipa, t + j(), (p) => playPipa(p, midi(pitch), 0, sd * 2.2, PIPA_ACCENT[sub] * 0.65, sub === 0 && bar % 4 === 0));
      }
      if (EXPLORE_DRUM[sub] > 0) {
        this.play(this.ePerc, t, (p) => playWarDrum(p, 0, EXPLORE_DRUM[sub] * 0.48, 1.05));
      }
      if ((sub & 3) === 2) {
        this.play(this.ePerc, t + j(), (p) => playWoodblock(p, 0, 0.34, (sub & 4) === 0));
      }
      for (const note of this.mel[local]) {
        const dur = note[2] * sd;
        const hz = midi(note[1]);
        const sl = note[4] ? midi(note[4]) : undefined;
        if (bar % 8 < 4) {
          this.play(this.eDizi, t, (p) => playDizi(p, hz, 0, dur * 0.94, note[3], sl));
        } else {
          this.play(this.eChime, t, (p) => playBianzhong(p, hz, 0, Math.max(0.75, dur * 1.25), note[3] * 0.82));
        }
      }
    }

    // 激战高潮层 (War Drums + Gong + Tang Horn + Pipa Rapid + Urgent Erhu)
    if (m > 0.04) {
      if ((sub & 1) === 0) {
        this.play(this.cBass, t, (p) => playGuqin(p, midi(ch.bass + (sub % 4 === 2 ? 12 : 0)), 0, sd * 1.8, sub % 4 === 0 ? 0.86 : 0.62));
      }
      const isFill = heavy && sub >= 12;
      if (!isFill && COMBAT_KICK[sub] > 0) {
        this.play(this.cDrum, t, (p) => playWarDrum(p, 0, COMBAT_KICK[sub] * 0.95, 0.92));
      }
      if (!isFill && COMBAT_SNARE[sub] > 0) {
        this.play(this.cDrum, t, (p) => playSnareRoll(p, 0, COMBAT_SNARE[sub] * 0.85));
      }
      if (isFill) {
        this.play(this.cDrum, t, (p) => playWarDrum(p, 0, 0.55 + (sub - 12) * 0.14, 1.15));
      }
      if (sub === 0 && (bar === 0 || bar === 8)) {
        this.play(this.cDrum, t, (p) => playGongCrash(p, 0, 0.72, 2.2));
      }
      if ((sub & 1) === 0) {
        const pNote = ch.pad[(sub >> 1) % ch.pad.length] + 12;
        this.play(this.cPipa, t + j(), (p) => playPipa(p, midi(pNote), 0, sd * 1.6, PIPA_ACCENT[sub] * 0.82, sub === 0));
      }
      for (const note of this.mel[local]) {
        const dur = note[2] * sd;
        const hz = midi(note[1]);
        this.play(this.cHorn, t, (p) => {
          playTangHorn(p, hz * 0.5, 0, dur * 0.94, note[3] * 0.9);
          playDizi(p, hz, 0, dur * 0.92, note[3] * 0.82);
        });
      }
      if (this.tVal > 0.25 && (sub & 1) === 0) {
        const eMidi = ch.pad[sub % 4] + 12;
        this.play(this.cErhu, t, (p) => playErhu(p, midi(eMidi), 0, sd * 1.9, (0.28 + 0.36 * this.tVal) * (sub % 4 === 0 ? 1 : 0.7)));
      }
    }
  }
}

// 《凯旋长安 · 礼乐大典》132 BPM, D宫调 (D E F# A B)
const VICTORY_MELODY: MelNote[] = [
  [4, 74, 2, 0.9], [6, 76, 2, 0.88], [8, 78, 4, 0.94], [12, 81, 4, 0.96],
  [16, 86, 4, 1.0, 83], [20, 83, 2, 0.9], [22, 81, 2, 0.88], [24, 86, 12, 1.0],
];

class VictoryMusic extends TangSongScore {
  cPad = this.chan('ts-win-pad', 0.45, { rev: 0.42 });
  cHorn = this.chan('ts-win-horn', 0.58, { rev: 0.4, dly: 0.14 });
  cChime = this.chan('ts-win-chime', 0.95, { rev: 0.58, dly: 0.28 });
  cDrum = this.chan('ts-win-drum', 0.75, { rev: 0.22 });
  mel = indexMelody(VICTORY_MELODY, 38);

  constructor(mixer: AudioMixerLike, startAt: number) {
    super(mixer, startAt, (60 / 132) * 0.75);
  }
  stepDur() {
    return 60 / 132 / 2;
  }
  onStep(step: number, t: number, sd: number) {
    if (step < 36) {
      if (step < 4) {
        this.play(this.cDrum, t, (p) => {
          playSnareRoll(p, 0, 0.38 + step * 0.12);
          playSnareRoll(p, sd * 0.5, 0.42 + step * 0.12);
        });
      }
      if (step === 0 || step === 8 || step === 16 || step === 24) {
        const root = step === 16 ? 43 : step === 24 ? 38 : 38;
        const chord = step === 16 ? [55, 62, 67, 71] : [50, 57, 62, 66];
        this.play(this.cPad, t, (p) => playInkPad(p, chord.map(midi), 0, sd * 8, 0.92, 1.35));
        this.play(this.cDrum, t, (p) => playWarDrum(p, 0, step === 24 ? 0.95 : 0.7, 0.9));
        if (step === 24) this.play(this.cDrum, t, (p) => playGongCrash(p, 0, 0.82, 2.8));
        this.play(this.cHorn, t, (p) => playGuqin(p, midi(root), 0, sd * 7, 0.72));
      }
      for (const note of this.mel[step]) {
        const dur = note[2] * sd;
        this.play(this.cHorn, t, (p) => {
          playTangHorn(p, midi(note[1] - 12), 0, dur * 0.92, note[3]);
          playDizi(p, midi(note[1]), 0, dur * 0.92, note[3] * 0.85);
        });
        this.play(this.cChime, t, (p) => playBianzhong(p, midi(note[1] + 12), 0, Math.max(0.95, dur * 1.4), note[3] * 0.72));
      }
      if (step >= 26 && step <= 30) {
        const pent = [74, 76, 78, 81, 86];
        this.play(this.cChime, t, (p) => playBianzhong(p, midi(pent[step - 26]), 0, 1.65, 0.66));
      }
      return;
    }
    const tail = step - 36;
    if (tail % 16 === 0) {
      this.play(this.cPad, t, (p) => playInkPad(p, [50, 57, 62, 66, 74].map(midi), 0, sd * 17, 0.65, 1.1));
    }
    if (this.rnd() < 0.24) {
      const notes = [74, 76, 78, 81, 83, 86, 90];
      const m = notes[Math.floor(this.rnd() * notes.length)];
      this.play(this.cChime, t, (p) => playGuzheng(p, midi(m), 0, 1.2, 0.24 + this.rnd() * 0.18));
    }
  }
}

// 《孤城残照 · 洞箫挽歌》84 BPM, D羽调 (D F G A C)
const DEFEAT_MELODY: MelNote[] = [
  [1, 69, 3, 0.8, 72], [4, 67, 2, 0.72], [6, 65, 2, 0.7], [8, 62, 4, 0.78],
  [12, 64, 2, 0.64], [14, 65, 2, 0.68], [16, 67, 3, 0.78, 65], [19, 65, 1, 0.6],
  [20, 64, 4, 0.7], [24, 62, 8, 0.82],
];

class DefeatMusic extends TangSongScore {
  cPad = this.chan('ts-loss-pad', 0.5, { rev: 0.48 });
  cXiao = this.chan('ts-loss-xiao', 0.65, { rev: 0.55, dly: 0.22 });
  cErhu = this.chan('ts-loss-erhu', 0.52, { rev: 0.5, dly: 0.18 });
  cChime = this.chan('ts-loss-chime', 0.85, { rev: 0.62, dly: 0.3 });
  cDrum = this.chan('ts-loss-drum', 0.55, { rev: 0.28 });
  mel = indexMelody(DEFEAT_MELODY, 32);

  constructor(mixer: AudioMixerLike, startAt: number) {
    super(mixer, startAt, (60 / 84) * 1.25);
  }
  stepDur() {
    return 60 / 84 / 2;
  }
  onStep(step: number, t: number, sd: number) {
    if (step < 32) {
      if (step === 0 || step === 8 || step === 16 || step === 24) {
        const chord = step === 8 ? [46, 53, 58, 62] : step === 16 ? [48, 55, 60, 62] : [50, 57, 62, 65];
        this.play(this.cPad, t, (p) => playInkPad(p, chord.map(midi), 0, sd * 8, 0.85, 0.65));
        if (step === 0 || step === 24) {
          this.play(this.cDrum, t, (p) => playWarDrum(p, 0, 0.56, 0.76));
          this.play(this.cChime, t, (p) => playBianzhong(p, midi(50), 0, 2.8, 0.62));
        }
      }
      for (const note of this.mel[step]) {
        const dur = note[2] * sd;
        const sl = note[4] ? midi(note[4]) : undefined;
        this.play(this.cXiao, t, (p) => playXiao(p, midi(note[1]), 0, dur * 0.96, note[3], sl));
        this.play(this.cErhu, t, (p) => playErhu(p, midi(note[1] - 12), 0, dur * 0.92, note[3] * 0.42));
      }
      return;
    }
    const tail = step - 32;
    if (tail % 16 === 0) {
      this.play(this.cPad, t, (p) => playInkPad(p, [50, 57, 62, 64].map(midi), 0, sd * 17, 0.65, 0.55));
    }
    if (tail % 32 === 8) {
      this.play(this.cChime, t, (p) => playBianzhong(p, midi(62), 0, 3.0, 0.34));
    }
  }
}

export function createTangSongMusic(mixer: AudioMixerLike): MusicController {
  let curTrack = 'none';
  let curScore: TangSongScore | null = null;
  let intensity = 0;
  let tension = 0;
  const dying: TangSongScore[] = [];

  return {
    get track() {
      return curTrack;
    },
    get channels() {
      return curScore ? [...new Set(curScore.chanNames)] : [];
    },
    setTrack(track: string) {
      if (track === curTrack) return;
      const now = mixer.now();
      const endScreen = track === 'victory' || track === 'defeat';
      if (curScore) {
        const fadeOut = endScreen ? 0.14 : 0.42;
        curScore.fade(0, fadeOut);
        curScore.killAt = now + fadeOut * 6 + 1.8;
        dying.push(curScore);
        curScore = null;
      }
      curTrack = track;
      if (track === 'none') return;
      const startAt = now + (endScreen ? 0.06 : 0.22);
      const nextScore =
        track === 'menu'
          ? new MenuMusic(mixer, startAt)
          : track === 'battle'
            ? new BattleMusic(mixer, startAt)
            : track === 'victory'
              ? new VictoryMusic(mixer, startAt)
              : new DefeatMusic(mixer, startAt);
      nextScore.mood(intensity, tension);
      nextScore.fade(1, endScreen ? 0.04 : 0.32);
      curScore = nextScore;
    },
    setMood(i: number, t: number) {
      intensity = i;
      tension = t;
      curScore?.mood(i, t);
    },
    tick(lookahead = 0.3) {
      const now = mixer.now();
      curScore?.schedule(now, lookahead);
      for (let i = dying.length - 1; i >= 0; i--) {
        if (dying[i].killAt <= now) {
          dying[i].dispose();
          dying.splice(i, 1);
        }
      }
    },
    dispose() {
      curScore?.dispose();
      curScore = null;
      for (const s of dying) s.dispose();
      dying.length = 0;
      curTrack = 'none';
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

  let patchedSfxCount = 0;
  let uiStep = 0;

  const patch = (key: string, fn: (p: SynthPatchLike, v?: number) => void, meta?: Partial<SfxEntryLike>) => {
    if (!r1) return;
    const entry = r1[key];
    if (!entry) return;
    entry.fn = fn;
    if (meta) Object.assign(entry, meta);
    patchedSfxCount++;
  };

  if (r1) {
    // ── UI 全系：白玉碰磬 + 宣纸翻卷 + 五声古筝 ──
    patch('ui_hover', (p) => {
      playGuqin(p, midi(86), 0, 0.08, 0.25);
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

    // ── 秦琼 (panyue)：熟铜四棱双锏 + 玄甲重盾 + 建鼓振岳 ──
    patch('atk_panyue_swing', (p) => {
      p.noise({ k: 'pink', flt: 'bandpass', fc: 420, fc1: 1100, q: 1.2, a: 0.02, d: 0.14, g: 0.42 });
      p.ring(480, [1, 1.62], { t: 0.03, a: 0.002, d: 0.08, g: 0.14 });
    });
    patch('atk_panyue_hit', (p) => {
      playWarDrum(p, 0, 0.65, 1.05);
      p.ring(540, [1, 1.48, 2.22], { a: 0.002, d: 0.26, g: 0.28 });
      p.noise({ k: 'pink', flt: 'bandpass', fc: 1400, q: 1.1, a: 0.001, d: 0.06, g: 0.48 });
    });
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
    patch('fx_panyue_ult_land', (p) => {
      playWarDrum(p, 0, 1.0, 0.65);
      playGongCrash(p, 0.02, 0.75, 1.0);
    });

    // ── 花蕊夫人 (chijin)：凌风细剑清吟 + 丝绸飘带 + 梅瓣轻铃 ──
    patch('atk_chijin_swing', (p) => {
      p.noise({ k: 'white', flt: 'bandpass', fc: 1600, fc1: 4200, q: 1.5, a: 0.005, d: 0.11, g: 0.34 });
      p.osc({ w: 'sine', f: 1420, f1: 2200, ft: 0.09, a: 0.004, d: 0.11, g: 0.1 });
    });
    patch('atk_chijin_hit', (p) => {
      p.ring(1960, [1, 1.42, 2.15], { a: 0.001, d: 0.18, g: 0.22 });
      p.osc({ f: 165, f1: 72, ft: 0.06, a: 0.001, d: 0.11, g: 0.32 });
      p.noise({ flt: 'highpass', fc: 3800, a: 0.001, d: 0.025, g: 0.25 });
    });
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
      [74, 79, 81, 86].forEach((m, idx) => playGuzheng(p, midi(m), idx * 0.045, 0.34, 0.72));
      p.ring(1760, [1, 1.48, 2.15], { t: 0.04, a: 0.004, d: 0.48, g: 0.22 });
      p.noise({ k: 'pink', flt: 'bandpass', fc: 2400, fc1: 4800, q: 1.0, a: 0.05, d: 0.42, g: 0.36 });
    });
    patch('fx_chijin_ult_tick', (p) => {
      p.noise({ flt: 'bandpass', fc: 2800, fc1: 5600, q: 1.6, a: 0.004, d: 0.09, g: 0.24 });
      p.ring(2200, [1, 1.41], { a: 0.001, d: 0.12, g: 0.14 });
    });

    // ── 苏轼 / 刘娥 (xingli)：五声古琴泛音 + 凤诏玉磬 ──
    patch('atk_xingli_charge', (p) => {
      playGuqin(p, midi(69), 0, 0.18, 0.55);
    });
    patch('atk_xingli_launch', (p, v = 0) => {
      const m = PENTA_D[Math.abs(Math.round(v)) % PENTA_D.length];
      playGuzheng(p, midi(m), 0, 0.28, 0.85);
    });
    patch('atk_xingli_hit', (p) => {
      playBianzhong(p, midi(81), 0, 0.26, 0.68);
      p.noise({ k: 'pink', flt: 'bandpass', fc: 1100, q: 1.3, a: 0.002, d: 0.05, g: 0.24 });
    });
    patch('cast_xingli_s1', (p) => {
      playGuzheng(p, midi(74), 0, 0.25, 0.75);
      playXiao(p, midi(81), 0.03, 0.3, 0.75);
    });
    patch('cast_xingli_s2', (p) => {
      [62, 69, 74, 79].forEach((m, idx) => playGuzheng(p, midi(m), idx * 0.04, 0.35, 0.68));
      playBianzhong(p, midi(74), 0.12, 0.45, 0.62);
    });
    patch('cast_xingli_ult', (p) => {
      playBianzhong(p, midi(62), 0, 0.65, 0.85);
      [74, 79, 81, 86].forEach((m, idx) => playGuzheng(p, midi(m), 0.03 + idx * 0.045, 0.55, 0.72));
    });
    patch('fx_xingli_meteor', (p) => {
      playWarDrum(p, 0, 0.62, 1.15);
      playBianzhong(p, midi(79), 0.01, 0.42, 0.72);
    });

    // ── 文成公主 (fengling)：牛角硬弓绷弦 + 鸣镝破空 + 飞天羽矢雨 ──
    patch('atk_fengling_draw', (p) => {
      p.noise({ k: 'pink', flt: 'bandpass', fc: 900, fc1: 1600, q: 2.0, a: 0.02, d: 0.1, g: 0.28 });
    });
    patch('atk_fengling_launch', (p) => {
      p.osc({ w: 'triangle', f: 340, f1: 165, ft: 0.075, a: 0.001, d: 0.12, g: 0.42 });
      p.noise({ flt: 'bandpass', fc: 3200, fc1: 5800, q: 1.8, a: 0.001, d: 0.065, g: 0.32 });
    });
    patch('atk_fengling_hit', (p) => {
      playWoodblock(p, 0, 0.55, true);
      p.osc({ f: 210, f1: 95, ft: 0.04, a: 0.001, d: 0.06, g: 0.35 });
    });
    patch('cast_fengling_s1', (p) => {
      p.osc({ w: 'glass', f: 1680, f1: 2450, ft: 0.16, a: 0.004, d: 0.24, g: 0.26 });
      p.noise({ flt: 'bandpass', fc: 3600, fc1: 6800, q: 1.4, a: 0.002, d: 0.16, g: 0.38 });
      playPipa(p, midi(81), 0, 0.22, 0.72);
    });
    patch('cast_fengling_s2', (p) => {
      p.noise({ k: 'pink', flt: 'bandpass', fc: 1400, fc1: 3200, q: 1.2, a: 0.005, d: 0.16, g: 0.36 });
      playDizi(p, midi(86), 0, 0.22, 0.62);
    });
    patch('cast_fengling_ult', (p) => {
      [74, 79, 81, 86, 91].forEach((m, idx) => playPipa(p, midi(m), idx * 0.045, 0.22, 0.78));
      playBianzhong(p, midi(86), 0.12, 0.55, 0.72);
    });

    // ── 辛弃疾 (yeque)：单刀寒锋厉啸 + 破阵飞刃 + 铁马雷鼓 ──
    patch('atk_yeque_swing', (p) => {
      p.noise({ k: 'white', flt: 'bandpass', fc: 2000, fc1: 5800, q: 1.6, a: 0.003, d: 0.095, g: 0.38 });
      p.osc({ f: 880, f1: 1580, ft: 0.08, a: 0.002, d: 0.09, g: 0.12 });
    });
    patch('atk_yeque_hit', (p) => {
      p.ring(1540, [1, 1.48, 2.25], { a: 0.001, d: 0.16, g: 0.24 });
      p.osc({ f: 145, f1: 62, ft: 0.05, a: 0.001, d: 0.09, g: 0.38 });
      p.noise({ flt: 'highpass', fc: 3400, a: 0.001, d: 0.025, g: 0.32 });
    });
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
    patch('cast_yeque_ult', (p) => {
      playWarDrum(p, 0, 0.85, 0.88);
      p.noise({ k: 'pink', flt: 'bandpass', fc: 1200, fc1: 3800, q: 1.5, a: 0.01, d: 0.24, g: 0.4 });
      playPipa(p, midi(62), 0.02, 0.22, 0.85, true);
    });
    patch('fx_yeque_ult_strike', (p) => {
      playWarDrum(p, 0, 0.95, 0.78);
      playGongCrash(p, 0, 0.55, 0.65);
      p.ring(1920, [1, 1.48, 2.3], { a: 0.001, d: 0.32, g: 0.28 });
    });

    // ── 野怪、防御塔、铜钱与连杀高光播报 ──
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
    patch('buy', (p) => {
      p.ring(2200, [1, 1.5], { a: 0.001, d: 0.16, g: 0.18 });
      playBianzhong(p, midi(81), 0.04, 0.28, 0.65);
    });
    patch('levelup_player', (p) => {
      [62, 64, 67, 69, 74].forEach((m, idx) => playBianzhong(p, midi(m), idx * 0.055, 0.55, 0.65));
    });
    patch('kill_player', (p) => {
      playGongCrash(p, 0, 0.65, 0.9);
      [74, 79, 86].forEach((m, idx) => playBianzhong(p, midi(m), idx * 0.06, 0.5, 0.72));
    });
    patch('ann_match_start', (p) => {
      playGongCrash(p, 0, 0.85, 1.8);
      playWarDrum(p, 0.15, 0.9, 0.82);
      playWarDrum(p, 0.32, 0.95, 0.82);
    });
    patch('ann_victory', (p) => {
      playGongCrash(p, 0, 0.9, 2.2);
      [74, 76, 78, 81, 86].forEach((m, idx) => playBianzhong(p, midi(m), idx * 0.08, 1.1, 0.78));
    });
    patch('ann_defeat', (p) => {
      playGongCrash(p, 0, 0.78, 2.4);
      playXiao(p, midi(69), 0.12, 1.1, 0.72, midi(72));
    });
  }

  mixer.__tsAudioDebug = () => ({
    mode: 'procedural-tangsong',
    patchedSfxCount,
  });
}
