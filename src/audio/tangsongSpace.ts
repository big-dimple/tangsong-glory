/**
 * tangsongSpace.ts — 代码生成的两种空间：城外「山谷」长混响与城内「城阙」短混响。
 *
 * 只给活动的（真实播放的）混音器用：离线渲染用的混音器不经过这里，连线保持内核原样。
 * 冲激响应与内核自带的那条一样按声道做能量归一（卷积器 normalize=false），所以各音效原有的发送量不用重调。
 */

interface SpaceShape {
  seconds: number;
  /** 混响时间（衰减 60dB 的秒数）。 */
  rt60: number;
  /** 直达声之后到混响起来之前的空隙。 */
  preDelay: number;
  /** 起始 / 结尾的明亮度（一阶低通系数，越小越暗）；尾巴越往后越暗。 */
  brightStart: number;
  brightEnd: number;
  /** 稀疏的离散回声：[秒, 增益]，左右声道各一组。 */
  echoes: [number, number][][];
}

const VALLEY: SpaceShape = {
  // 商业 MOBA 收紧战场混响（rt60 0.68s），保留空间层次同时彻底避免团战闷糊打架
  seconds: 1.05,
  rt60: 0.68,
  preDelay: 0.012,
  brightStart: 0.58,
  brightEnd: 0.14,
  echoes: [
    [[0.075, 0.34], [0.16, 0.14]],
    [[0.095, 0.32], [0.18, 0.14]],
  ],
};

const CITY: SpaceShape = {
  seconds: 0.55,
  rt60: 0.38,
  preDelay: 0.004,
  brightStart: 0.7,
  brightEnd: 0.3,
  // 城墙之间又近又密的早期反射
  echoes: [
    [[0.009, 0.6], [0.017, -0.45], [0.026, 0.36], [0.038, -0.26], [0.053, 0.18]],
    [[0.011, 0.55], [0.02, -0.42], [0.031, 0.34], [0.043, -0.24], [0.059, 0.17]],
  ],
};

function buildImpulse(ctx: BaseAudioContext, shape: SpaceShape): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(rate * shape.seconds));
  const buffer = ctx.createBuffer(2, length, rate);
  const start = Math.floor(rate * shape.preDelay);
  const fadeIn = rate * 0.02;
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let seed = ch === 0 ? 0x2f6e2b1 : 0x51a7c3d;
    const noise = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 2147483648 - 1;
    };
    let low = 0;
    for (let i = start; i < length; i++) {
      const t = i / rate;
      const k = Math.min(1, t / (shape.seconds * 0.7));
      low += (noise() - low) * (shape.brightStart + (shape.brightEnd - shape.brightStart) * k);
      data[i] = low * Math.exp((-6.91 * t) / shape.rt60) * Math.min(1, (i - start) / fadeIn);
    }
    for (const [time, gain] of shape.echoes[ch]) {
      const at = Math.floor(time * rate);
      if (at < length) data[at] += gain;
    }
    let energy = 0;
    for (let i = 0; i < length; i++) energy += data[i] * data[i];
    const norm = 1 / Math.sqrt(energy || 1);
    for (let i = 0; i < length; i++) data[i] *= norm;
  }
  return buffer;
}

interface SpaceMixerLike {
  ctx: AudioContext;
  sfxBus: GainNode;
  uiBus: GainNode;
  graph?: AudioNode[];
}

/**
 * 给活动混音器换上「山谷」冲激响应，并给界面总线并联一条「城阙」短混响。
 * 任何一步失败都保持内核原有的声场，不影响出声。
 */
export function installTangSongSpace(mixer: SpaceMixerLike): { valley: boolean; city: boolean } {
  const result = { valley: false, city: false };
  const ctx = mixer.ctx;
  if (!ctx || typeof ctx.createConvolver !== 'function' || typeof OfflineAudioContext === 'undefined') return result;
  if (ctx instanceof OfflineAudioContext) return result;
  try {
    const hall = mixer.graph?.find((node): node is ConvolverNode => node instanceof ConvolverNode);
    if (hall) {
      hall.buffer = buildImpulse(ctx, VALLEY);
      result.valley = true;
    }
  } catch {
    result.valley = false;
  }
  try {
    const room = ctx.createConvolver();
    room.normalize = false;
    room.buffer = buildImpulse(ctx, CITY);
    const send = ctx.createGain();
    send.gain.value = 0.14;
    mixer.uiBus.connect(send);
    send.connect(room);
    // 回送到音效总线（之后同样经过内核的压缩与软削波），不形成回路
    room.connect(mixer.sfxBus);
    mixer.graph?.push(send, room);
    result.city = true;
  } catch {
    result.city = false;
  }
  return result;
}
