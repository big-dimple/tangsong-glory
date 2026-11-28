/**
 * tangsongStealth.ts — 进草隐蔽状态 HUD 与四周水墨潜行暗晕。
 *
 * 只在玩家进草状态在 none / hidden / revealed 之间切换时更新 DOM 类名，
 * 平时每帧零 DOM 写入。
 */

export type StealthState = 'none' | 'hidden' | 'revealed';

interface StealthHeroLike {
  id: number;
  alive?: boolean;
  bushId?: number;
  rt?: { revealUntil?: number };
}

interface StealthWorldStateLike {
  playerId?: number;
  time?: number;
  heroes?: StealthHeroLike[];
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgIcon(revealed: boolean): SVGSVGElement {
  const el = document.createElementNS(SVG_NS, 'svg');
  el.setAttribute('viewBox', '0 0 24 24');
  el.setAttribute('aria-hidden', 'true');
  el.setAttribute('class', 'ts-stealth-badge__ico');

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '2');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  if (revealed) {
    path.setAttribute('d', 'M2 12s3.8-6 10-6 10 6 10 6-3.8 6-10 6-10-6-10-6z');
    const pupil = document.createElementNS(SVG_NS, 'circle');
    pupil.setAttribute('cx', '12');
    pupil.setAttribute('cy', '12');
    pupil.setAttribute('r', '2.8');
    pupil.setAttribute('fill', 'currentColor');
    el.append(path, pupil);
  } else {
    path.setAttribute('d', 'M3 10.5c2.2 3.2 5.3 4.8 9 4.8s6.8-1.6 9-4.8M6.5 13.8l-1.5 2.4M12 15.3v2.7M17.5 13.8l1.5 2.4');
    el.append(path);
  }
  return el;
}

let currentState: StealthState = 'none';
let veilEl: HTMLElement | null = null;
let badgeEl: HTMLElement | null = null;
let labelEl: HTMLElement | null = null;
let iconHiddenEl: SVGSVGElement | null = null;
let iconRevealedEl: SVGSVGElement | null = null;

function ensureMounted(): boolean {
  if (typeof document === 'undefined') return false;
  const hud = document.querySelector<HTMLElement>('.sf-hud');
  if (!hud) return false;

  if (!veilEl || !veilEl.isConnected) {
    veilEl = document.createElement('div');
    veilEl.className = 'ts-stealth-veil';
    veilEl.setAttribute('aria-hidden', 'true');
    hud.prepend(veilEl);
  }
  if (!badgeEl || !badgeEl.isConnected) {
    badgeEl = document.createElement('div');
    badgeEl.className = 'ts-stealth-badge';
    badgeEl.setAttribute('aria-live', 'polite');

    iconHiddenEl = svgIcon(false);
    iconRevealedEl = svgIcon(true);
    iconRevealedEl.style.display = 'none';
    labelEl = document.createElement('span');
    labelEl.className = 'ts-stealth-badge__text';
    labelEl.textContent = '隐蔽中';

    badgeEl.append(iconHiddenEl, iconRevealedEl, labelEl);
    hud.append(badgeEl);
  }
  return true;
}

function applyState(next: StealthState): void {
  if (!ensureMounted() || !veilEl || !badgeEl || !labelEl || !iconHiddenEl || !iconRevealedEl) return;
  const isHidden = next === 'hidden';
  const isRevealed = next === 'revealed';
  const active = isHidden || isRevealed;

  veilEl.classList.toggle('is-active', active);
  veilEl.classList.toggle('is-revealed', isRevealed);
  badgeEl.classList.toggle('is-active', active);
  badgeEl.classList.toggle('is-revealed', isRevealed);

  if (isRevealed) {
    labelEl.textContent = '已暴露';
    iconHiddenEl.style.display = 'none';
    iconRevealedEl.style.display = '';
  } else if (isHidden) {
    labelEl.textContent = '隐蔽中';
    iconHiddenEl.style.display = '';
    iconRevealedEl.style.display = 'none';
  }
}

/** 每帧对照玩家位置与暴露时间，仅在状态变化时同步潜行暗晕与提示印标。 */
export function updateStealth(
  state: StealthWorldStateLike | null | undefined,
  onEnterStealth?: () => void,
): void {
  if (!state?.heroes?.length) {
    if (currentState !== 'none') resetStealth();
    return;
  }
  const me = state.heroes.find((h) => h.id === state.playerId);
  let next: StealthState = 'none';
  if (me && me.alive !== false && (me.bushId ?? -1) >= 0) {
    const now = state.time ?? 0;
    next = (me.rt?.revealUntil ?? 0) > now ? 'revealed' : 'hidden';
  }
  if (next === currentState && badgeEl?.isConnected) return;
  const prev = currentState;
  currentState = next;
  applyState(next);
  if (prev === 'none' && next !== 'none') {
    onEnterStealth?.();
  }
}

export function resetStealth(): void {
  currentState = 'none';
  veilEl?.classList.remove('is-active', 'is-revealed');
  badgeEl?.classList.remove('is-active', 'is-revealed');
  if (!veilEl?.isConnected) veilEl = null;
  if (!badgeEl?.isConnected) {
    badgeEl = null;
    labelEl = null;
    iconHiddenEl = null;
    iconRevealedEl = null;
  }
}
