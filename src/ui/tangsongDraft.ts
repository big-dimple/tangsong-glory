/**
 * tangsongDraft.ts — 王者荣耀式左侧英雄卡内嵌就绪打勾逻辑（彻底移除顶部冗余席位横带）
 *
 * 职责：
 *   1. 不再向选将页顶部插入任何额外席位条（零顶部复杂度、保持主舞台清爽大气）；
 *   2. 复用左侧 6 张英雄卡片 `.sf-hcard[data-hero]`，直接在每张卡右侧（竖屏右上角）
 *      展示「我 · 已选 / ✓ 已就绪」与队友的实时选将、绿色「✓ 就绪」动态标记；
 *   3. 保持 `DraftBarHandle` 对接接口完全兼容，点击「锁定出战」后平稳过渡等待余位就绪并触发 `onAllLocked`。
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

export function mountTangSongDraftBar(
  selectScreen: HTMLElement,
  initialHeroId: string,
  _getPortraitUrl: (heroId: string) => string,
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

  // 若旧 DOM 中残留历史席位条则先清理
  selectScreen.querySelector('.ts-draft-bar')?.remove();

  // 每位队友错落选将与打勾确认的时间（ms）
  const allyPickMs = [0, 520, 1080, 1680, 2260];
  const allyLockMs = [0, 1250, 1980, 2720, 3450];
  const allyPicked = [true, false, false, false, false];
  const allyLocked = [false, false, false, false, false];

  const cardMap = new Map<string, { card: HTMLElement; statusEl: HTMLElement }>();
  for (const card of Array.from(selectScreen.querySelectorAll<HTMLElement>('.sf-hcard[data-hero]'))) {
    const id = card.dataset.hero;
    if (!id) continue;
    card.querySelector('.ts-hcard-status')?.remove();
    const statusEl = document.createElement('span');
    statusEl.className = 'ts-hcard-status';
    statusEl.setAttribute('aria-hidden', 'true');
    card.appendChild(statusEl);
    cardMap.set(id, { card, statusEl });
  }

  const goBtn = selectScreen.querySelector<HTMLButtonElement>('.sf-select__go .sf-btn--primary');

  function setStatus(
    entry: { card: HTMLElement; statusEl: HTMLElement },
    mode: 'idle' | 'me' | 'me-locked' | 'ally-pick' | 'ally-locked',
    handleName = '',
  ): void {
    const { card, statusEl } = entry;
    card.classList.remove('is-pick-me', 'is-pick-ally', 'is-pick-locked');
    statusEl.innerHTML = '';

    if (mode === 'idle') return;

    const shortHandle = handleName.length > 4 ? handleName.slice(0, 4) : handleName;
    const dot = document.createElement('i');
    dot.className = 'ts-hcard-status__dot';
    const text = document.createElement('span');
    text.className = 'ts-hcard-status__txt';

    if (mode === 'me') {
      card.classList.add('is-pick-me');
      dot.textContent = '我';
      text.textContent = '已选';
    } else if (mode === 'me-locked') {
      card.classList.add('is-pick-me', 'is-pick-locked');
      dot.textContent = '✓';
      text.textContent = '就绪';
    } else if (mode === 'ally-pick') {
      card.classList.add('is-pick-ally');
      dot.textContent = '…';
      text.textContent = '选将';
    } else {
      card.classList.add('is-pick-ally', 'is-pick-locked');
      dot.textContent = '✓';
      text.textContent = '就绪';
    }
    if (shortHandle) statusEl.title = shortHandle;
    statusEl.append(dot, text);
  }

  function refreshSeats(): void {
    if (disposed) return;
    session = ensureMatchSession(playerHero, session.seed);

    for (const entry of cardMap.values()) {
      setStatus(entry, 'idle');
    }

    const myEntry = cardMap.get(session.teams.blue[0]);
    if (myEntry) {
      setStatus(myEntry, playerLocked ? 'me-locked' : 'me');
    }

    for (let i = 1; i < 5; i++) {
      const hid = session.teams.blue[i];
      const entry = cardMap.get(hid);
      if (!entry) continue;
      if (!allyPicked[i] && !allyLocked[i]) continue;
      setStatus(entry, allyLocked[i] ? 'ally-locked' : 'ally-pick', session.blueHandles[i] ?? '队友');
    }

    if (playerLocked && goBtn) {
      const readyAllies = 1 + allyLocked.slice(1).filter(Boolean).length;
      goBtn.textContent = readyAllies >= 5 ? '全员就绪 · 进入对阵' : `等待队友就绪 ${readyAllies}/5…`;
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
        refreshSeats();
        onAllLocked(session.seed);
        return;
      }

      refreshSeats();
      const pendingAllies: number[] = [];
      for (let i = 1; i < 5; i++) {
        if (!allyLocked[i]) pendingAllies.push(i);
      }

      if (pendingAllies.length === 0) {
        playTangSongCue('seal-small');
        later(180, () => onAllLocked(session.seed));
        return;
      }

      const span = Math.min(540, Math.max(220, pendingAllies.length * 130));
      pendingAllies.forEach((slotIdx, step) => {
        later(Math.round(((step + 1) / pendingAllies.length) * span), () => {
          allyPicked[slotIdx] = true;
          allyLocked[slotIdx] = true;
          onUiAudio?.('select');
          refreshSeats();
        });
      });
      later(span + 180, () => {
        playTangSongCue('seal-small');
        onAllLocked(session.seed);
      });
    },
    dispose() {
      disposed = true;
      for (const id of timers) window.clearTimeout(id);
      timers.length = 0;
      for (const { card, statusEl } of cardMap.values()) {
        card.classList.remove('is-pick-me', 'is-pick-ally', 'is-pick-locked');
        statusEl.remove();
      }
      cardMap.clear();
    },
  };
}
