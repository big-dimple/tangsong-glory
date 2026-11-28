/**
 * playerHandles.ts — 唐宋豪杰名录与同局 10 席动态阵容会话
 *
 * 为大厅、寻将匹配、5v5 实时点将、加载对阵与结算战绩表提供统一且拟真的玩家昵称与阵容，
 * 全面替代“AI / 人机 / 电脑”显性标签。
 */
import { HEROES, selectMatchTeams, type HeroId } from './heroes';

export const TANGSONG_PLAYER_HANDLES = [
  '长安客',
  '醉挑灯',
  '清风徐来',
  '汴梁书生',
  '玉笛飞声',
  '青衫落拓',
  '踏雪寻梅',
  '寒江独钓',
  '曲江听雨',
  '墨染山河',
  '半盏清茶',
  '杏花微雨',
  '白衣渡江',
  '平沙落雁',
  '一蓑烟雨',
  '江上清风',
  '月上柳梢',
  '竹杖芒鞋',
  '铁马冰河',
  '剑指幽州',
  '千古风流',
  '兰亭墨客',
  '青莲居士',
  '云深不知处',
  '风起青萍',
  '疏影横斜',
  '浮生若梦',
  '南山采菊',
  '故人西辞',
  '烟波钓徒',
  '雁过留声',
  '松风煮茶',
  '金戈铁马',
  '霜叶红于',
  '白鹭洲客',
  '画船听雨',
] as const;

export interface MatchSeatInfo {
  team: 0 | 1;
  slot: number;
  handle: string;
  isMe: boolean;
  heroId: HeroId;
}

export interface MatchSessionState {
  seed: number;
  blueHandles: string[];
  redHandles: string[];
  playerHeroId: HeroId;
  teams: { blue: HeroId[]; red: HeroId[] };
}

function nextRand(state: { v: number }): number {
  state.v = (Math.imul(state.v, 1664525) + 1013904223) >>> 0;
  return state.v / 4294967296;
}

let activeSession: MatchSessionState | null = null;
let pendingSeedForMatch: number | null = null;

export function pickSessionHandles(seed: number, playerLabel = '少侠(你)'): {
  blueHandles: string[];
  redHandles: string[];
} {
  const pool = [...TANGSONG_PLAYER_HANDLES];
  const rng = { v: (seed ^ 0x9e3779b9) >>> 0 };
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(nextRand(rng) * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  return {
    blueHandles: [playerLabel, pool[0], pool[1], pool[2], pool[3]],
    redHandles: [pool[4], pool[5], pool[6], pool[7], pool[8]],
  };
}

export function createMatchSession(seed: number, playerHeroId: HeroId): MatchSessionState {
  const safeHero: HeroId = playerHeroId in HEROES ? playerHeroId : 'sushi';
  const { blueHandles, redHandles } = pickSessionHandles(seed);
  const teams = selectMatchTeams(safeHero, seed);
  activeSession = {
    seed,
    blueHandles,
    redHandles,
    playerHeroId: safeHero,
    teams,
  };
  pendingSeedForMatch = seed;
  return activeSession;
}

export function ensureMatchSession(playerHeroId: HeroId, seed?: number): MatchSessionState {
  if (activeSession && (seed === undefined || activeSession.seed === seed)) {
    if (activeSession.playerHeroId !== playerHeroId) {
      activeSession.playerHeroId = playerHeroId;
      activeSession.teams = selectMatchTeams(playerHeroId, activeSession.seed);
    }
    return activeSession;
  }
  const s = seed ?? ((Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0);
  return createMatchSession(s, playerHeroId);
}

export function getActiveMatchSession(): MatchSessionState | null {
  return activeSession;
}

export function consumePendingMatchSeed(): number | null {
  const out = pendingSeedForMatch;
  pendingSeedForMatch = null;
  return out;
}

export function getSessionHandle(team: number, slot: number, isMe = false, seed = 2026): string {
  if (isMe || (team === 0 && slot === 0)) return '你';
  const sess = activeSession ?? ensureMatchSession('sushi', seed);
  const list = team === 0 ? sess.blueHandles : sess.redHandles;
  return list[slot] ?? TANGSONG_PLAYER_HANDLES[(team * 5 + slot) % TANGSONG_PLAYER_HANDLES.length];
}
