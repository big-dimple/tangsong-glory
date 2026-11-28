/**
 * tangsongMatchmake.ts — 王者荣耀式「5v5 匹配确认」弹窗
 *
 * 特点：
 *   - 纯固定几何 + GPU scaleX 进度条 + 零负外扩装饰框 + 暂停背后手卷动画，彻底消灭高频抖动与滚动条；
 *   - 采用 10 枚环形英雄席位灯（上排盛唐青玉 5 席 / 下排赤壁朱红 5 席），亮灯仅切换边框/颜色/亮绿「✓」对勾，无任何位移跳动；
 *   - 自动化测试环境（navigator.webdriver 且未传 `?matchmake=1`）零延迟直接通过，保证 smoke 门禁稳定。
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

  if (typeof document !== 'undefined') {
    document.body.classList.add('ts-mm-open');
  }

  const cleanup = () => {
    if (closed) return;
    closed = true;
    for (const id of timers) window.clearTimeout(id);
    timers.length = 0;
    if (typeof document !== 'undefined') {
      document.body.classList.remove('ts-mm-open');
    }
    backdrop.remove();
  };

  const titleEl = el('h2', 'sf-title sf-metal', '汴京寻将');
  const countEl = el('span', 'ts-mm__count sf-num', '1 / 10 已就绪');
  const timerEl = el('span', 'ts-mm__timer sf-num', '00:00');
  const statusEl = el('p', 'ts-mm__status', '正在等待十方豪杰确认入席…');
  const fillEl = el('i', 'ts-mm__bar-fill');

  const createRow = (team: 0 | 1) => {
    const handles = team === 0 ? session.blueHandles : session.redHandles;
    const slots = handles.map((name, idx) => {
      const isMe = team === 0 && idx === 0;
      const glyph = el('span', 'ts-mm__glyph', isMe ? '✓' : String(idx + 1));
      const ring = el('div', 'ts-mm__ring', glyph);
      const label = el('span', 'ts-mm__name', isMe ? '少侠(你)' : '等待中');
      const cell = el(
        'div',
        `ts-mm__slot ${team === 0 ? 'is-blue' : 'is-red'}${isMe ? ' is-ready is-me' : ''}`,
        ring,
        label,
      );
      cell.dataset.realHandle = name;
      return cell;
    });
    const row = el(
      'div',
      `ts-mm__team ${team === 0 ? 'is-blue' : 'is-red'}`,
      el('div', 'ts-mm__team-head', team === 0 ? '盛唐青玉方' : '赤壁朱红方'),
      el('div', 'ts-mm__row', ...slots),
    );
    return { row, slots };
  };

  const blue = createRow(0);
  const red = createRow(1);

  const cancelBtn = el('button', 'sf-btn sf-btn--ghost ts-mm__cancel', '取消匹配');
  cancelBtn.type = 'button';
  cancelBtn.addEventListener('click', () => {
    opts.onAudioUi?.('back');
    cleanup();
    opts.onCancel();
  });

  const enterBtn = el('button', 'sf-btn sf-btn--primary ts-mm__enter', '等待全员就绪…');
  enterBtn.type = 'button';
  enterBtn.disabled = true;

  const proceed = () => {
    if (closed) return;
    opts.onAudioUi?.('confirm');
    cleanup();
    opts.onComplete(seed);
  };
  enterBtn.addEventListener('click', () => {
    if (!enterBtn.disabled) proceed();
  });

  const card = el(
    'section',
    'ts-mm__card',
    el('div', 'ts-mm__head', titleEl, el('span', 'ts-mm__sub', '5v5 演武实时匹配')),
    el('div', 'ts-mm__meta', countEl, statusEl, timerEl),
    el('div', 'ts-mm__bar', fillEl),
    el('div', 'ts-mm__grid', blue.row, el('div', 'ts-mm__divider', el('span', 'ts-mm__vs sf-metal', 'VS')), red.row),
    el('footer', 'ts-mm__foot', cancelBtn, enterBtn),
  );
  const mountHost = opts.root && opts.root.isConnected ? opts.root : document.body;
  const backdrop = el('div', mountHost === document.body ? 'sf-root ts-mm' : 'ts-mm', card);
  mountHost.appendChild(backdrop);

  const incoming: HTMLElement[] = [
    blue.slots[1],
    red.slots[0],
    red.slots[1],
    blue.slots[2],
    red.slots[2],
    blue.slots[3],
    red.slots[3],
    blue.slots[4],
    red.slots[4],
  ];
  const scheduleMs = [180, 310, 460, 620, 790, 960, 1140, 1320, 1500];

  fillEl.style.transform = 'scaleX(0.1)';
  later(1000, () => {
    timerEl.textContent = '00:01';
  });
  later(2000, () => {
    timerEl.textContent = '00:02';
  });

  incoming.forEach((slot, idx) => {
    later(scheduleMs[idx], () => {
      slot.classList.add('is-ready');
      const glyph = slot.querySelector('.ts-mm__glyph');
      const nameEl = slot.querySelector('.ts-mm__name');
      if (glyph) glyph.textContent = '✓';
      if (nameEl) nameEl.textContent = slot.dataset.realHandle || '豪杰';
      const joined = idx + 2;
      countEl.textContent = `${joined} / 10 已就绪`;
      fillEl.style.transform = `scaleX(${(joined / 10).toFixed(2)})`;
      if (idx === 0 || idx === 3 || idx === 6 || idx === 8) {
        opts.onAudioUi?.('select');
      }
      if (joined === 10) {
        titleEl.textContent = '匹配成功';
        statusEl.textContent = '十方豪杰悉数就绪！即将步入点将台…';
        card.classList.add('is-complete');
        enterBtn.disabled = false;
        enterBtn.textContent = '进入选将';
        playTangSongCue('seal-small');
        later(380, proceed);
      }
    });
  });

  return cleanup;
}
