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

function stringBuffer(
  ctx: BaseAudioContext,
  frequency: number,
  decay: number,
  brightness: number,
  pickPos: number,
): AudioBuffer {
  let cache = buffers.get(ctx);
  if (!cache) {
    cache = new Map();
    buffers.set(ctx, cache);
  }
  const key = [
    (Math.round(frequency * 2) / 2).toFixed(1),
    (Math.round(decay * 4) / 4).toFixed(2),
    (Math.round(brightness * 20) / 20).toFixed(2),
    (Math.round(pickPos * 25) / 25).toFixed(2),
  ].join(':');
  const cached = cache.get(key);
  if (cached) return cached;

  const sr = ctx.sampleRate;
  const length = Math.ceil(sr * (decay + 0.05));
  const blend = 0.5 * (1 - brightness);
  const w = (2 * Math.PI * frequency) / sr;
  const phaseDelay = (b: number) => Math.atan2(b * Math.sin(w), 1 - b + b * Math.cos(w)) / w;
  const target = Math.max(2, sr / frequency - phaseDelay(blend));
  const delay = Math.floor(target);
  let lo = 0;
  let hi = 1;
  let fraction = 0.5;
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
  const excLen = Math.min(length, delay + 2);
  const raw = new Float32Array(excLen);
  let lowpass = 0;
  for (let i = 0; i < excLen; i++) {
    lowpass += attack * (random() * 2 - 1 - lowpass);
    raw[i] = lowpass * 1.65;
  }
  // Pluck-position comb filter shapes string harmonic balance by plucking point.
  const pickDelay = Math.max(1, Math.round(delay * clamp(pickPos, 0.08, 0.45)));
  for (let i = 0; i < excLen; i++) {
    data[i] = raw[i] - (i >= pickDelay ? 0.72 * raw[i - pickDelay] : 0);
  }

  const loss = Math.pow(0.001, 1 / (Math.max(0.05, decay * 1.5) * frequency));
  for (let i = delay + 2; i < length; i++) {
    const x0 = data[i - delay] * (1 - fraction) + data[i - delay - 1] * fraction;
    const x1 = data[i - delay - 1] * (1 - fraction) + data[i - delay - 2] * fraction;
    data[i] = loss * ((1 - blend) * x0 + blend * x1);
  }
  cache.set(key, buffer);
  if (cache.size > 128) cache.delete(cache.keys().next().value!);
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
  pickPos = 0.18,
): void {
  const hz = clamp(frequency, 40, 8000);
  const decay = Math.round(clamp(duration * 1.4 + 0.35, 0.4, 2.6) * 10) / 10;
  const buffer = stringBuffer(patch.ctx, hz, decay, clamp(brightness, 0, 1), pickPos);
  const start = patch.t0 + time;
  const releaseStart = start + Math.min(buffer.duration * 0.85, Math.max(0.08, duration));
  const end = Math.min(start + buffer.duration, releaseStart + Math.max(0.18, duration * 0.45));
  const peak = Math.max(0.0002, volume);

  const source = patch.ctx.createBufferSource();
  const gain = patch.ctx.createGain();
  source.buffer = buffer;
  if (slideFrom) {
    source.playbackRate.setValueAtTime(clamp(slideFrom / hz, 0.5, 2), start);
    source.playbackRate.exponentialRampToValueAtTime(1, start + Math.min(0.16, duration * 0.4));
  }
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peak, start + 0.005);
  gain.gain.setValueAtTime(peak, releaseStart);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  source.connect(gain);
  gain.connect(destination);
  source.onended = () => {
    source.disconnect();
    gain.disconnect();
  };
  source.start(start);
  source.stop(end);
  patch.end = Math.max(patch.end, end);
}
