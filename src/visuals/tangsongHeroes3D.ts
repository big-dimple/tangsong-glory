/**
 * tangsongHeroes3D.ts — 《唐宋荣耀》3D 英雄模型统一导出入口（按全身国风立绘精细化重塑）
 *
 * 保持与 src/main.ts 及 src/engine/mobaCore.js 100% 兼容的函数与类型签名，
 * 内部拆分至 src/visuals/heroes/ 按英雄独立精雕维护。
 */

export type {
  FullHeroEngineApi,
  HeadObj,
  HeroAnimState,
  HeroCompanionMeta,
  HeroModelApi,
  HeroPoseWriter,
} from './heroes/types';

export { animateHeroCompanion } from './heroes/companions';
export { buildQinQiongFull } from './heroes/qinqiong';
export { buildXinQijiAssassinFull } from './heroes/xinqiji';
export { buildWenchengFull } from './heroes/wencheng';
export { buildHuaRuiWarriorFull } from './heroes/huarui';

import { buildLiuEFull } from './heroes/liue';
import { buildSuShiFull } from './heroes/sushi';
import type { FullHeroEngineApi } from './heroes/types';

export function buildMageFull(
  api: FullHeroEngineApi,
  pal: Record<string, number>,
  variant: string,
) {
  return variant === 'liue' ? buildLiuEFull(api, pal) : buildSuShiFull(api, pal);
}
