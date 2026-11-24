// Adapted from SFX Brew's MIT-licensed physically modelled string synthesizer.
// See THIRD_PARTY_NOTICES.md for the copyright and license.
interface PluckPatch {
  ctx: AudioContext;
  t0: number;
  end: number;
  out: AudioNode;
}

const buffers = new WeakMap<BaseAudioContext, Map<string, AudioBuffer>>();
const clamp = (value: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, value));

function stringBuffer(ctx: BaseAudioContext, frequency: number, decay: number, brightness: number): AudioBuffer {
  let cache = buffers.get(ctx);
  if (!cache) { cache = new Map(); buffers.set(ctx, cache); }
  const key = `${frequency.toFixed(1)}:${decay.toFixed(1)}:${brightness.toFixed(2)}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const sr = ctx.sampleRate;
  const length = Math.ceil(sr * (decay + 0.05));
  const blend = 0.5 * (1 - brightness);
  const w = 2 * Math.PI * frequency / sr;
  const phaseDelay = (b: number) => Math.atan2(b * Math.sin(w), (1 - b) + b * Math.cos(w)) / w;
  const target = Math.max(2, sr / frequency - phaseDelay(blend));
  const delay = Math.floor(target);
  let lo = 0, hi = 1, fraction = 0.5;
  for (let i = 0; i < 30; i++) {
    fraction = (lo + hi) / 2;
    if (phaseDelay(fraction) < target - delay) lo = fraction;
    else hi = fraction;
  }

  const buffer = ctx.createBuffer(1, length, sr);
  const data = buffer.getChannelData(0);
  let seed = Math.floor(frequency * 100) + 1;
  const random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const attack = 0.15 + 0.85 * brightness;
  let lowpass = 0;
  for (let i = 0; i <= delay + 1 && i < length; i++) {
    lowpass += attack * (random() * 2 - 1 - lowpass);
    data[i] = lowpass * 1.6;
  }
  const loss = Math.pow(0.001, 1 / (Math.max(0.05, decay * 1.5) * frequency));
  for (let i = delay + 2; i < length; i++) {
    const x0 = data[i - delay] * (1 - fraction) + data[i - delay - 1] * fraction;
    const x1 = data[i - delay - 1] * (1 - fraction) + data[i - delay - 2] * fraction;
    data[i] = loss * ((1 - blend) * x0 + blend * x1);
  }
  cache.set(key, buffer);
  if (cache.size > 48) cache.delete(cache.keys().next().value!);
  return buffer;
}

export function playPluckedString(
  patch: PluckPatch,
  frequency: number,
  time: number,
  duration: number,
  volume: number,
  brightness: number,
  destination: AudioNode = patch.out,
  slideFrom?: number,
): void {
  const hz = clamp(frequency, 40, 8000);
  const decay = Math.round(clamp(duration * 1.4 + 0.35, 0.5, 3) * 10) / 10;
  const buffer = stringBuffer(patch.ctx, hz, decay, clamp(brightness, 0, 1));
  const start = patch.t0 + time;
  const end = start + buffer.duration;
  const source = patch.ctx.createBufferSource();
  const gain = patch.ctx.createGain();
  source.buffer = buffer;
  if (slideFrom) {
    source.playbackRate.setValueAtTime(clamp(slideFrom / hz, 0.5, 2), start);
    source.playbackRate.exponentialRampToValueAtTime(1, start + Math.min(0.16, duration * 0.4));
  }
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.006);
  gain.gain.setValueAtTime(volume * 0.65, start + buffer.duration * 0.65);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  source.connect(gain);
  gain.connect(destination);
  source.onended = () => { source.disconnect(); gain.disconnect(); };
  source.start(start);
  source.stop(end);
  patch.end = Math.max(patch.end, end);
}
