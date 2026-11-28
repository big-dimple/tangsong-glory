/**
 * combatFeel.ts — 参照《王者荣耀》重构的走A前摇、移动施法参数与上下半身分离骨架合成配置
 *
 * 原则：
 * 1. 所有 Se 机械数值保持零偏差，仅调整玩家输入响应窗口、前摇保护与骨架上下半身分离表现。
 * 2. 走A（边走边打）：缩短玩家普攻抬手前摇至顺手甜区（95~155ms），前摇期间保护不被连续移动指令打断且脚步踩实地面不滑步；
 *    攻击出手瞬间立刻解除移速锁并切入上半身收招 + 下半身跨步奔跑，若移动中无目标则不触发空挥原地僵直。
 * 3. 移动施法 vs 站桩重招：区分顺发走位技（mobile: true）与乾坤重招（mobile: false），消除「僵硬站桩」或「僵直脚底冰面滑步」病态。
 */

export interface CastFeelProfile {
  lockTime: number;
  mobile: boolean;
  actDur: number;
}

export const PLAYER_ATTACK_FEEL = {
  minWindup: 0.085,
  maxWindup: 0.14,
  windupRatio: 0.19,
  followThroughDur: 0.22,
  kiteRangePad: 0.9,
} as const;

export const PLAYER_CAST_PROFILES: Record<string, CastFeelProfile> = {
  // 顺发移动施法类：极短微顿（40~55ms），立即进入下半身奔跑 + 上半身朝目标施法
  'panyue:s2': { lockTime: 0.04, mobile: true, actDur: 0.34 },
  'chijin:s2': { lockTime: 0.045, mobile: true, actDur: 0.32 },
  'xingli:s1': { lockTime: 0.045, mobile: true, actDur: 0.34 },
  'xingli:s2': { lockTime: 0.045, mobile: true, actDur: 0.36 },
  'fengling:s2': { lockTime: 0.045, mobile: true, actDur: 0.32 },
  'yeque:s1': { lockTime: 0.055, mobile: true, actDur: 0.32 },
  'yeque:s2': { lockTime: 0.04, mobile: true, actDur: 0.3 },

  // 紧凑蓄力重招类：踩实落地发力（95~150ms，零滑步），出手后立刻允许走位取消后摇
  'panyue:s1': { lockTime: 0.1, mobile: false, actDur: 0.34 },
  'panyue:ult': { lockTime: 0.14, mobile: false, actDur: 0.44 },
  'chijin:s1': { lockTime: 0.095, mobile: false, actDur: 0.32 },
  'chijin:ult': { lockTime: 0.13, mobile: false, actDur: 0.42 },
  'fengling:s1': { lockTime: 0.11, mobile: false, actDur: 0.34 },
  'fengling:ult': { lockTime: 0.15, mobile: false, actDur: 0.46 },
  'xingli:ult': { lockTime: 0.14, mobile: false, actDur: 0.46 },
  'yeque:ult': { lockTime: 0.13, mobile: false, actDur: 0.42 },
};

export const UPPER_LOWER_CONFIG = {
  minSpeed: 0.35,
  fullSpeed: 1.45,
  maxTwistDeg: 66,
  twistWeights: [0.35, 0.45, 0.2] as const,
} as const;

export function getPlayerAttackWindup(cycleDur: number, baseWindup: number): number {
  return Math.min(
    cycleDur * baseWindup,
    Math.max(
      PLAYER_ATTACK_FEEL.minWindup,
      Math.min(PLAYER_ATTACK_FEEL.maxWindup, cycleDur * PLAYER_ATTACK_FEEL.windupRatio),
    ),
  );
}

export function getPlayerCastProfile(kitId: string, slot: string): CastFeelProfile | null {
  return PLAYER_CAST_PROFILES[`${kitId}:${slot}`] ?? null;
}

export const TANGSONG_COMBAT_FEEL = {
  attack: PLAYER_ATTACK_FEEL,
  castProfiles: PLAYER_CAST_PROFILES,
  upperLower: UPPER_LOWER_CONFIG,
  getPlayerAttackWindup,
  getPlayerCastProfile,
};
