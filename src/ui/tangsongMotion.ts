/**
 * tangsongMotion.ts — 演出开关：控制「展卷 / 入画 / 落印 / 水墨阵亡 / 大招呼吸」演出是否播放。
 *
 * 规则：
 *   1. 转场类大演出只在完整菜单流里播放，直进对局（skipMenu）与自动化环境（除非带 `?film=1`）跳过；
 *   2. 开关彻底收归游戏内「设置 -> 演出动效」（默认开启），不再被宿主系统「减少动态」静默全关；
 *   3. 玩家只要把「演出动效」关掉（或画质切到 low），立刻回落到干净的无动效静态表现。
 */

interface MobaParamsLike {
  params?: { skipMenu?: boolean };
  settings?: { cameraShake?: boolean; cinematicFlow?: boolean };
}

const SETTINGS_STORAGE_KEY = 'tsry.settings.v1';

function moba(): MobaParamsLike | undefined {
  return (window as { __moba?: MobaParamsLike }).__moba;
}

function readStoredCinematicFlow(): boolean {
  try {
    if (typeof localStorage === 'undefined') return true;
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return true;
    const parsed = JSON.parse(raw) as { cinematicFlow?: unknown };
    return typeof parsed?.cinematicFlow === 'boolean' ? parsed.cinematicFlow : true;
  } catch {
    return true;
  }
}

/** 玩家是否在游戏内开启了「演出动效」（默认开启）。 */
export function cinematicSettingEnabled(): boolean {
  const live = moba()?.settings?.cinematicFlow;
  if (typeof live === 'boolean') return live;
  return readStoredCinematicFlow();
}

/** 等效「减弱动态」状态：仅当玩家手动关闭「演出动效」时返回 true。 */
export function prefersReducedMotion(): boolean {
  return !cinematicSettingEnabled();
}

function filmForced(): boolean {
  try {
    return new URLSearchParams(location.search).get('film') === '1';
  } catch {
    return false;
  }
}

/** 是否播放转场演出（收卷、入画镜头、展卷）。 */
export function cinematicFlowEnabled(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (!cinematicSettingEnabled()) return false;
  if (moba()?.params?.skipMenu) return false;
  if (navigator.webdriver && !filmForced()) return false;
  return true;
}

/** 玩家是否关掉了「镜头震动」或「演出动效」：朱印落款的震动跟随同一个开关。 */
export function shakeAllowed(): boolean {
  return cinematicSettingEnabled() && moba()?.settings?.cameraShake !== false;
}

/** 把演出开关同步成 body 上的类名，转场与静态降级 CSS 都挂在这些类下面。 */
export function syncMotionClasses(): void {
  if (typeof document === 'undefined' || !document.body) return;
  document.body.classList.toggle('ts-film', cinematicFlowEnabled());
  document.body.classList.toggle('ts-reduce-motion', prefersReducedMotion());
  document.body.classList.toggle('ts-no-shake', !shakeAllowed());
}

/** 加载页收卷/撕纸关闭时长（毫秒）；GPU 撕纸转场提前截帧后快速收掉底层 DOM，不播演出时保持内核原值。 */
export function loadingCloseMs(): number {
  syncMotionClasses();
  return cinematicFlowEnabled() ? 140 : 400;
}
