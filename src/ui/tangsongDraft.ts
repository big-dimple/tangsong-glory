/**
 * tangsongDraft.ts — 选将殿堂「实时 5v5 点将席位带」与锁定等待逻辑
 *
 * 将原本冷冰冰的单人选将改造为 5v5 实时同台点将：
 *   - 左侧青玉 5 席：第 1 席为玩家本人，实时联动当前预览英雄与待锁定态；第 2~5 席队友带着唐宋雅号陆续亮出英雄与「已锁」印，若玩家选中队友刚预选的英雄，该队友会自动换补空位；
 *   - 右侧朱红 5 席：盲选机制下展示敌方 5 位侠客雅号与隐墨牌背，陆续亮起「已就绪 ✓」封蜡印；
 *   - 玩家点击「锁定出战」时，若尚有未锁席位会在 0.75s 内陆续落锁（自动化环境即时完成）。
 */
import { HEROES, type HeroId } from '../config/heroes';
import { ensureMatchSession, type MatchSessionState } from '../config/playerHandles';
import { shouldSimulateMatchmaking } from './tangsongMatchmake';
import { playTangSongCue } from '../audio/tangsongAudio';

export interface DraftBarHandle {
  updateHero: (heroId: string) => void;
  lockPlayerAndFinish: (onAllLocked: (seed: number) => void, onUiAudio?: (snd: string) => void) => void;
  dispose: () => void;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  ...children: (Node | string | null | undefined)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const c of children) {
    if (c !== null && c !== undefined) node.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

export function mountTangSongDraftBar(
  selectScreen: HTMLElement,
  initialHeroId: string,
  getPortraitUrl: (heroId: string) => string,
): DraftBarHandle {
  let session: MatchSessionState = ensureMatchSession((initialHeroId as HeroId) || 'sushi');
  let playerHero = session.playerHeroId;
  let playerLocked = false;
  let disposed = false;

  const timers: number[] = [];
  const later = (ms: number, fn: () => void) => {
    const id = window.setTimeout(() => {
      if (!disposed) fn();
    }, ms);
    timers.push(id);
  };

  // 每席的选定与锁定时间（非等距，真实玩家错落感）
  const allyPickMs = [0, 620, 1280, 1950, 2650];
  const allyLockMs = [0, 1450, 2350, 3150, 3980];
  const enemyLockMs = [920, 1680, 2500, 3420, 4350];

  const allyPicked = [true, false, false, false, false];
  const allyLocked = [false, false, false, false, false];
  const enemyLocked = [false, false, false, false, false];

  interface SeatDom {
    root: HTMLElement;
    avatar: HTMLImageElement | null;
    heroLabel: HTMLElement;
    stateLabel: HTMLElement;
  }

  const blueSeats: SeatDom[] = [];
  const redSeats: SeatDom[] = [];

  const bar = el('div', 'ts-draft-bar');
  bar.setAttribute('aria-label', '双方点将席位');

  const blueRow = el('div', 'ts-draft-bar__side is-blue');
  const redRow = el('div', 'ts-draft-bar__side is-red');
  const statusPill = el('div', 'ts-draft-bar__center', el('span', 'ts-draft-bar__phase', '点将中'));

  for (let i = 0; i < 5; i++) {
    const isMe = i === 0;
    const handle = session.blueHandles[i] ?? '队友';
    const img = el('img', 'ts-draft-seat__img');
    img.alt = '';
    img.draggable = false;
    const heroSpan = el('span', 'ts-draft-seat__hero');
    const stSpan = el('span', 'ts-draft-seat__state', isMe ? '待定' : '寻策');
    const node = el(
      'div',
      `ts-draft-seat is-blue${isMe ? ' is-me' : ''}`,
      el('span', 'ts-draft-seat__pic', img),
      el('span', 'ts-draft-seat__meta', el('span', 'ts-draft-seat__name', isMe ? '你 · 本尊' : handle), heroSpan),
      stSpan,
    );
    blueSeats.push({ root: node, avatar: img, heroLabel: heroSpan, stateLabel: stSpan });
    blueRow.append(node);
  }

  for (let i = 0; i < 5; i++) {
    const handle = session.redHandles[i] ?? '豪杰';
    const heroSpan = el('span', 'ts-draft-seat__hero', '隐墨待出');
    const stSpan = el('span', 'ts-draft-seat__state', '选将');
    const node = el(
      'div',
      'ts-draft-seat is-red',
      el('span', 'ts-draft-seat__pic is-mystery', '墨'),
      el('span', 'ts-draft-seat__meta', el('span', 'ts-draft-seat__name', handle), heroSpan),
      stSpan,
    );
    redSeats.push({ root: node, avatar: null, heroLabel: heroSpan, stateLabel: stSpan });
    redRow.append(node);
  }

  bar.append(blueRow, statusPill, redRow);

  const mainEl = selectScreen.querySelector('.sf-select__main');
  if (mainEl) selectScreen.insertBefore(bar, mainEl);
  else selectScreen.append(bar);

  function refreshSeats(): void {
    if (disposed) return;
    session = ensureMatchSession(playerHero, session.seed);
    for (let i = 0; i < 5; i++) {
      const seat = blueSeats[i];
      const hid = session.teams.blue[i];
      const hero = HEROES[hid] ?? HEROES.sushi;
      const picked = i === 0 || allyPicked[i];
      const locked = i === 0 ? playerLocked : allyLocked[i];
      seat.root.classList.toggle('is-picked', picked);
      seat.root.classList.toggle('is-locked', locked);
      if (seat.avatar) {
        if (picked) {
          seat.avatar.src = getPortraitUrl(hero.id);
          seat.avatar.style.opacity = '1';
        } else {
          seat.avatar.removeAttribute('src');
          seat.avatar.style.opacity = '0';
        }
      }
      seat.heroLabel.textContent = picked ? hero.name : '思索中';
      seat.stateLabel.textContent = locked ? '✓' : picked ? '选' : '…';
    }
    for (let i = 0; i < 5; i++) {
      const seat = redSeats[i];
      const locked = enemyLocked[i];
      seat.root.classList.toggle('is-locked', locked);
      seat.heroLabel.textContent = locked ? '已就位' : '挑选中';
      seat.stateLabel.textContent = locked ? '✓' : '…';
    }
    const lockedCount =
      (playerLocked ? 1 : 0) +
      allyLocked.slice(1).filter(Boolean).length +
      enemyLocked.filter(Boolean).length;
    const phaseEl = statusPill.querySelector('.ts-draft-bar__phase');
    if (phaseEl) {
      phaseEl.textContent =
        lockedCount === 10 ? '十将齐聚' : playerLocked ? `待余将落锁 ${lockedCount}/10` : `点将 ${lockedCount}/10`;
    }
  }

  for (let i = 1; i < 5; i++) {
    later(allyPickMs[i], () => {
      allyPicked[i] = true;
      refreshSeats();
    });
    later(allyLockMs[i], () => {
      allyPicked[i] = true;
      allyLocked[i] = true;
      refreshSeats();
    });
  }
  for (let i = 0; i < 5; i++) {
    later(enemyLockMs[i], () => {
      enemyLocked[i] = true;
      refreshSeats();
    });
  }

  refreshSeats();

  return {
    updateHero(heroId: string) {
      if (disposed || playerLocked) return;
      const safe = (heroId in HEROES ? heroId : 'sushi') as HeroId;
      playerHero = safe;
      refreshSeats();
    },
    lockPlayerAndFinish(onAllLocked: (seed: number) => void, onUiAudio?: (snd: string) => void) {
      if (disposed || playerLocked) return;
      playerLocked = true;
      const simulate = shouldSimulateMatchmaking();
      if (!simulate) {
        allyPicked.fill(true);
        allyLocked.fill(true);
        enemyLocked.fill(true);
        refreshSeats();
        onAllLocked(session.seed);
        return;
      }

      refreshSeats();
      const pendingSteps: (() => void)[] = [];
      for (let i = 1; i < 5; i++) {
        if (!allyLocked[i]) {
          pendingSteps.push(() => {
            allyPicked[i] = true;
            allyLocked[i] = true;
            onUiAudio?.('select');
            refreshSeats();
          });
        }
      }
      for (let i = 0; i < 5; i++) {
        if (!enemyLocked[i]) {
          pendingSteps.push(() => {
            enemyLocked[i] = true;
            refreshSeats();
          });
        }
      }

      if (pendingSteps.length === 0) {
        playTangSongCue('seal-small');
        later(220, () => onAllLocked(session.seed));
        return;
      }

      const span = Math.min(720, Math.max(260, pendingSteps.length * 105));
      pendingSteps.forEach((stepFn, idx) => {
        later(Math.round(((idx + 1) / pendingSteps.length) * span), stepFn);
      });
      later(span + 240, () => {
        playTangSongCue('seal-small');
        onAllLocked(session.seed);
      });
    },
    dispose() {
      disposed = true;
      for (const id of timers) window.clearTimeout(id);
      timers.length = 0;
      bar.remove();
    },
  };
}
