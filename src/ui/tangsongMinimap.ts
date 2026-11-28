/**
 * tangsongMinimap.ts — 手机端可折叠小地图增强
 *
 * 特点：
 *   - 竖屏 / 小屏横屏下默认缩小为紧凑小地图（约占原面积 40%，不遮挡视野与按键）；
 *   - 轻点小地图或右下角「放大/收起」角标可一键展开（约 2.5 倍边长），拖动依然支持移动镜头预览，
 *     再次点击空白区域、点击收起角标或轻点放大后的小地图即可平滑缩回。
 */

const COMPACT_MEDIA = '(orientation: portrait), (max-width: 960px), (max-height: 520px)';

const EXPAND_SVG =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9.5 2.5H13.5V6.5M6.5 13.5H2.5V9.5M13.5 2.5L9 7M2.5 13.5L7 9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const COLLAPSE_SVG =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 6H13.5V2.5M6 10H2.5V13.5M10 6L14 2M6 10L2 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export function enhanceMinimap(miniEl: HTMLElement, onPeekReset?: () => void): () => void {
  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'ts-mini-toggle';
  toggleBtn.setAttribute('aria-label', '放大或收起小地图');
  toggleBtn.setAttribute('aria-expanded', 'false');
  toggleBtn.innerHTML = EXPAND_SVG;
  miniEl.appendChild(toggleBtn);

  const isCompactViewport = () =>
    typeof window !== 'undefined' && window.matchMedia(COMPACT_MEDIA).matches;

  const setExpanded = (next: boolean) => {
    const active = next && isCompactViewport();
    miniEl.classList.toggle('is-expanded', active);
    toggleBtn.setAttribute('aria-expanded', active ? 'true' : 'false');
    toggleBtn.innerHTML = active ? COLLAPSE_SVG : EXPAND_SVG;
    if (!active) onPeekReset?.();
  };

  let tapId: number | null = null;
  let tapX = 0;
  let tapY = 0;
  let tapT0 = 0;
  let moved = false;

  const onTogglePointerDown = (ev: PointerEvent) => {
    ev.stopPropagation();
  };

  const onToggleClick = (ev: MouseEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    setExpanded(!miniEl.classList.contains('is-expanded'));
  };

  const onMiniPointerDown = (ev: PointerEvent) => {
    if (!isCompactViewport()) return;
    if (ev.target === toggleBtn || toggleBtn.contains(ev.target as Node)) return;
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    tapId = ev.pointerId;
    tapX = ev.clientX;
    tapY = ev.clientY;
    tapT0 = performance.now();
    moved = false;
  };

  const onMiniPointerMove = (ev: PointerEvent) => {
    if (tapId === null || ev.pointerId !== tapId) return;
    if (Math.hypot(ev.clientX - tapX, ev.clientY - tapY) >= 10) {
      moved = true;
    }
  };

  const onMiniPointerUp = (ev: PointerEvent) => {
    if (tapId === null || ev.pointerId !== tapId) return;
    const elapsed = performance.now() - tapT0;
    const wasTap = !moved && elapsed < 260;
    tapId = null;
    if (!wasTap || !isCompactViewport()) return;
    const expanded = miniEl.classList.contains('is-expanded');
    setExpanded(!expanded);
    if (!expanded) {
      // 从紧凑态轻点放大时，取消一次短暂的镜头预览跳动，让玩家看清大地图
      onPeekReset?.();
    }
  };

  const onMiniPointerCancel = (ev: PointerEvent) => {
    if (ev.pointerId === tapId) tapId = null;
  };

  const onDocPointerDown = (ev: PointerEvent) => {
    if (!miniEl.classList.contains('is-expanded')) return;
    const target = ev.target as Node | null;
    if (target && !miniEl.contains(target)) {
      setExpanded(false);
    }
  };

  const onResize = () => {
    if (!isCompactViewport() && miniEl.classList.contains('is-expanded')) {
      setExpanded(false);
    }
  };

  toggleBtn.addEventListener('pointerdown', onTogglePointerDown, { capture: true });
  toggleBtn.addEventListener('click', onToggleClick);
  miniEl.addEventListener('pointerdown', onMiniPointerDown, { capture: true });
  miniEl.addEventListener('pointermove', onMiniPointerMove, { capture: true });
  miniEl.addEventListener('pointerup', onMiniPointerUp, { capture: true });
  miniEl.addEventListener('pointercancel', onMiniPointerCancel, { capture: true });
  document.addEventListener('pointerdown', onDocPointerDown, { capture: true });
  window.addEventListener('resize', onResize);

  return () => {
    toggleBtn.removeEventListener('pointerdown', onTogglePointerDown, { capture: true });
    toggleBtn.removeEventListener('click', onToggleClick);
    miniEl.removeEventListener('pointerdown', onMiniPointerDown, { capture: true });
    miniEl.removeEventListener('pointermove', onMiniPointerMove, { capture: true });
    miniEl.removeEventListener('pointerup', onMiniPointerUp, { capture: true });
    miniEl.removeEventListener('pointercancel', onMiniPointerCancel, { capture: true });
    document.removeEventListener('pointerdown', onDocPointerDown, { capture: true });
    window.removeEventListener('resize', onResize);
    toggleBtn.remove();
    miniEl.classList.remove('is-expanded');
  };
}
