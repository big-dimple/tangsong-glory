/**
 * tangsongIcons.ts — 《唐宋荣耀》v5.1 28 枚手绘矿彩描金技能与行动图标映射
 *
 * 全部由唐宋国风工笔原画切图并统一压缩至 256×256 WebP：
 * - 英雄技能（24 枚）：/assets/icons/skills/{qinqiong,xinqiji,sushi,wencheng,huarui,liue}-{passive,s1,s2,ult}.webp
 * - 通用与普攻（4 枚）：/assets/icons/summoner/{recall,heal,flash,attack}.webp
 */

const VALID_HERO_IDS = new Set([
  'qinqiong',
  'xinqiji',
  'sushi',
  'wencheng',
  'huarui',
  'liue',
]);

const VALID_SLOTS = new Set(['passive', 's1', 's2', 'ult']);
const VALID_SUMMONER = new Set(['recall', 'heal', 'flash', 'attack']);

export function getSkillIconUrl(heroId: string, slot: 'passive' | 's1' | 's2' | 'ult'): string {
  const safeHero = VALID_HERO_IDS.has(heroId) ? heroId : 'sushi';
  const safeSlot = VALID_SLOTS.has(slot) ? slot : 'passive';
  return `/assets/icons/skills/${safeHero}-${safeSlot}.webp`;
}

export function getSummonerIconUrl(key: string): string {
  const safeKey = VALID_SUMMONER.has(key) ? key : 'recall';
  return `/assets/icons/summoner/${safeKey}.webp`;
}

export function getSkillIcon(heroId: string, slot: 'passive' | 's1' | 's2' | 'ult'): string {
  return `<img class="sf-ico ts-ico-img" src="${getSkillIconUrl(heroId, slot)}" alt="" draggable="false"/>`;
}

export function getSummonerIcon(key: string): string {
  return `<img class="sf-ico ts-ico-img" src="${getSummonerIconUrl(key)}" alt="" draggable="false"/>`;
}
