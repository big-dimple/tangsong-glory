/**
 * tangsongMotion.ts — 演出开关：哪些场合播放「展卷 / 入画」这类转场演出。
 *
 * 规则（导演裁决）：只在完整菜单流里播放；直进对局（skipmenu）、自动化环境（navigator.webdriver）
 * 与「减少动态」一律跳过，回落到内核原有的快速淡入淡出。`?film=1` 可在自动化环境里强制打开，
 * 只用于实机采集演出序列帧。
 */

interface MobaParamsLike {
  params?: { skipMenu?: boolean };
  settings?: { cameraShake?: boolean };
}

function moba(): MobaParamsLike | undefined {
  return (window as { __moba?: MobaParamsLike }).__moba;
}

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
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
  if (prefersReducedMotion()) return false;
  if (moba()?.params?.skipMenu) return false;
  if (navigator.webdriver && !filmForced()) return false;
  return true;
}

/** 玩家是否关掉了「镜头震动」：朱印落款的震动跟随同一个开关。 */
export function shakeAllowed(): boolean {
  return !prefersReducedMotion() && moba()?.settings?.cameraShake !== false;
}

/** 把演出开关同步成 body 上的类名，转场的 CSS 都挂在这两个类下面。 */
export function syncMotionClasses(): void {
  if (typeof document === 'undefined' || !document.body) return;
  document.body.classList.toggle('ts-film', cinematicFlowEnabled());
  document.body.classList.toggle('ts-no-shake', !shakeAllowed());
}

/** 加载页收卷需要的关闭时长（毫秒）；不播演出时保持内核原值。 */
export function loadingCloseMs(): number {
  syncMotionClasses();
  return cinematicFlowEnabled() ? 1000 : 400;
}
