/**
 * tangsongMatchmake.ts — 「汴京寻将 · 5v5 实时匹配」拟真开局弹层
 *
 * 在大厅点击「开始匹配」或预选名士卡片时弹出：
 *   - 自动化测试环境（navigator.webdriver 且未传 `?matchmake=1`）零延迟直接通过，保证 smoke 门禁稳定；
 *   - 真实玩家体验约 1.8~2.2 秒的流畅匹配：10 席青玉/朱红灯笼错落点亮并伴随编钟/古筝音提示，
 *     凑齐十方豪杰后自动或点击「即刻入席」伴随 WebGL2 `wash` 水波转场丝滑进入点将台。
 */
import { createMatchSession } from '../config/playerHandles';
import { type HeroId } from '../config/heroes';
import { playTangSongCue } from '../audio/tangsongAudio';

export interface MatchmakeOptions {
  root: HTMLElement;
  heroId: string;
  onAudioUi?: (snd: string) => void;
  onComplete: (seed: number) => void;
  onCancel: () => void;
}

export function shouldSimulateMatchmaking(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (!navigator.webdriver) return true;
  try {
    return new URLSearchParams(location.search).get('matchmake') === '1';
  } catch {
    return false;
  }
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  ...children: (Node | string | null | undefined)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const ch of children) {
    if (ch !== null && ch !== undefined) node.append(typeof ch === 'string' ? document.createTextNode(ch) : ch);
  }
  return node;
}

export function openMatchmakeOverlay(opts: MatchmakeOptions): () => void {
  const seed = ((Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0) || 2026;
  const session = createMatchSession(seed, (opts.heroId as HeroId) || 'sushi');

  if (!shouldSimulateMatchmaking()) {
    opts.onComplete(seed);
    return () => {};
  }

  let closed = false;
  const timers: number[] = [];
  const later = (ms: number, fn: () => void) => {
    const id = window.setTimeout(() => {
      if (!closed) fn();
    }, ms);
    timers.push(id);
  };

  const cleanup = () => {
    if (closed) return;
    closed = true;
    for (const id of timers) window.clearTimeout(id);
    timers.length = 0;
    backdrop.remove();
  };

  const countEl = el('span', 'ts-mm__count sf-num', '1 / 10');
  const statusEl = el('p', 'ts-mm__status', '正在寻访十方名士…');
  const timerEl = el('span', 'ts-mm__timer sf-num', '00:00');
  const fillEl = el('i', 'ts-mm__bar-fill');

  const createSide = (team: 0 | 1) => {
    const handles = team === 0 ? session.blueHandles : session.redHandles;
    const seats = handles.map((name, idx) => {
      const isMe = team === 0 && idx === 0;
      const chip = el(
        'div',
        `ts-mm__seat ${team === 0 ? 'is-blue' : 'is-red'}${isMe ? ' is-ready is-me' : ''}`,
        el('span', 'ts-mm__lantern', isMe ? '我' : '待'),
        el('span', 'ts-mm__handle', isMe ? '少侠(你)' : '寻觅中…'),
      );
      chip.dataset.realHandle = name;
      return chip;
    });
    const list = el('div', 'ts-mm__team-list', ...seats);
    const box = el(
      'div',
      `ts-mm__team ${team === 0 ? 'is-blue' : 'is-red'}`,
      el('div', 'ts-mm__team-head', team === 0 ? '盛唐青玉方' : '赤壁朱红方'),
      list,
    );
    return { box, seats };
  };

  const blue = createSide(0);
  const red = createSide(1);

  const cancelBtn = el('button', 'sf-btn sf-btn--ghost ts-mm__cancel', '取消匹配');
  cancelBtn.type = 'button';
  cancelBtn.addEventListener('click', () => {
    opts.onAudioUi?.('back');
    cleanup();
    opts.onCancel();
  });

  const enterBtn = el('button', 'sf-btn sf-btn--primary ts-mm__enter', '十方齐聚 · 步入点将台');
  enterBtn.type = 'button';
  enterBtn.hidden = true;
  const proceed = () => {
    if (closed) return;
    opts.onAudioUi?.('confirm');
    cleanup();
    opts.onComplete(seed);
  };
  enterBtn.addEventListener('click', proceed);

  const card = el(
    'section',
    'sf-panel ts-mm__card',
    el('div', 'ts-mm__head', el('h2', 'sf-title sf-metal', '汴京寻将'), el('p', 'ts-mm__sub', '5v5 演武实时匹配')),
    el('div', 'ts-mm__meta', countEl, statusEl, timerEl),
    el('div', 'ts-mm__bar', fillEl),
    el('div', 'ts-mm__sides', blue.box, el('span', 'ts-mm__vs sf-metal', 'VS'), red.box),
    el('footer', 'ts-mm__foot', cancelBtn, enterBtn),
  );
  const backdrop = el('div', 'ts-mm', card);
  document.body.appendChild(backdrop);

  const allIncoming: HTMLElement[] = [
    blue.seats[1],
    red.seats[0],
    red.seats[1],
    blue.seats[2],
    red.seats[2],
    blue.seats[3],
    red.seats[3],
    blue.seats[4],
    red.seats[4],
  ];
  const scheduleMs = [210, 340, 520, 690, 880, 1060, 1250, 1430, 1620];

  fillEl.style.width = '10%';
  later(1000, () => {
    timerEl.textContent = '00:01';
  });
  later(2000, () => {
    timerEl.textContent = '00:02';
  });

  allIncoming.forEach((seat, idx) => {
    later(scheduleMs[idx], () => {
      seat.classList.add('is-ready');
      const lantern = seat.querySelector('.ts-mm__lantern');
      const label = seat.querySelector('.ts-mm__handle');
      if (lantern) lantern.textContent = '✓';
      if (label) label.textContent = seat.dataset.realHandle || '豪杰';
      const joined = idx + 2;
      countEl.textContent = `${joined} / 10`;
      fillEl.style.width = `${joined * 10}%`;
      if (idx === 0 || idx === 3 || idx === 6 || idx === 8) {
        opts.onAudioUi?.('select');
      }
      if (joined === 10) {
        statusEl.textContent = '十方豪杰悉数就位！即将开卷点将…';
        card.classList.add('is-complete');
        enterBtn.hidden = false;
        playTangSongCue('seal-small');
        later(460, proceed);
      }
    });
  });

  return cleanup;
}
