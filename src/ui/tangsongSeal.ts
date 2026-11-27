/**
 * tangsongSeal.ts — 朱印落款：胜利「大捷」朱印、失败「再战」墨印、击杀横幅上的小朱印「斩」。
 *
 * 与大厅「演武」印同族：朱底白文、圆角方印、边缘残破。一屏至多一方印。
 * 三拍语法（与《唐宋牌》同一套数值，动画在 tangsong-theme.css 的 ts-seal-* 关键帧里）：
 *   蓄 120ms 放大到 1.15 → 落 70ms 三次方缓入 → 压扁 50ms → 留；落定瞬间震动 180ms，印泥 300ms 外洇。
 */
import { prefersReducedMotion, shakeAllowed, syncMotionClasses } from './tangsongMotion';

const SVG_NS = 'http://www.w3.org/2000/svg';
/** 蓄 + 落：从动画开始到印面触纸的毫秒数。 */
const SEAL_IMPACT_MS = 190;
const SEAL_SHAKE_MS = 180;

export type SealKind = 'cinnabar' | 'ink';
export type SealCue = 'seal' | 'seal-ink' | 'seal-small';

export interface SealOptions {
  text: string;
  kind: SealKind;
  /** 落印前的等待（毫秒）：等标题或横幅自己的入场走完。 */
  delayMs: number;
  /** 震动谁：结算页震整屏，击杀小印只震横幅。 */
  shakeTarget?: HTMLElement | null;
  onImpact?: () => void;
}

let sealSerial = 0;

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
}

/** 生成一方印。竖排，一字一格；残破边缘用固定种子的噪声位移，每次都一样。 */
export function createSealElement(text: string, kind: SealKind): HTMLElement {
  const chars = Array.from(text);
  const cell = 50;
  const pad = 7;
  const width = cell + pad * 2;
  const height = cell * chars.length + pad * 2;
  const id = `ts-seal-rough-${++sealSerial}`;

  const root = svg('svg', { viewBox: `0 0 ${width} ${height}`, class: 'ts-seal__face', 'aria-hidden': 'true' });
  const filter = svg('filter', { id, x: '-8%', y: '-8%', width: '116%', height: '116%' });
  // 低频噪声推歪边缘（残破），高频噪声在印面上咬出细小的漏白（印泥不匀）
  filter.append(
    svg('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.085, numOctaves: 2, seed: 7, result: 'warp' }),
    svg('feDisplacementMap', { in: 'SourceGraphic', in2: 'warp', scale: 2.6, xChannelSelector: 'R', yChannelSelector: 'G', result: 'worn' }),
    svg('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.4, numOctaves: 2, seed: 23, result: 'grit' }),
    svg('feColorMatrix', { in: 'grit', type: 'matrix', values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -10 3.2', result: 'holes' }),
    svg('feComposite', { in: 'worn', in2: 'holes', operator: 'out' }),
  );
  const defs = svg('defs', {});
  defs.append(filter);

  const body = svg('g', { filter: `url(#${id})` });
  body.append(svg('rect', { x: 2.5, y: 2.5, width: width - 5, height: height - 5, rx: 7, class: 'ts-seal__ground' }));
  chars.forEach((ch, index) => {
    const glyph = svg('text', {
      x: width / 2,
      y: pad + cell * index + cell / 2,
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
      'font-size': cell * 0.92,
      class: 'ts-seal__glyph',
    });
    glyph.textContent = ch;
    body.append(glyph);
  });
  root.append(defs, body);

  const seal = document.createElement('span');
  seal.className = `ts-seal ts-seal--${kind}`;
  seal.style.setProperty('--ts-seal-ratio', String(width / height));
  seal.setAttribute('aria-hidden', 'true');
  const bleed = document.createElement('span');
  bleed.className = 'ts-seal__bleed';
  seal.append(bleed, root);
  return seal;
}

/** 把一方印落到 host 上；返回印的元素。 */
export function stampSeal(host: HTMLElement, options: SealOptions): HTMLElement {
  syncMotionClasses();
  const seal = createSealElement(options.text, options.kind);
  seal.style.setProperty('--ts-seal-delay', `${options.delayMs}ms`);
  host.appendChild(seal);

  const still = prefersReducedMotion();
  const impactAt = still ? 0 : options.delayMs + SEAL_IMPACT_MS;
  const target = options.shakeTarget;
  if (target && !still && shakeAllowed()) {
    target.style.setProperty('--ts-seal-hit', `${impactAt}ms`);
    target.classList.add('ts-seal-shake');
    window.setTimeout(() => target.classList.remove('ts-seal-shake'), impactAt + SEAL_SHAKE_MS + 60);
  }
  if (options.onImpact) {
    const fire = options.onImpact;
    window.setTimeout(() => {
      if (seal.isConnected) fire();
    }, impactAt);
  }
  return seal;
}

/** 结算页：胜利落朱印「大捷」，失败落墨印「再战」。结算页由内核挂载，这里等它出现。 */
export function stampResultSeal(onCue: (cue: SealCue) => void): void {
  let tries = 0;
  const attempt = () => {
    const screen = document.querySelector<HTMLElement>('.sf-result');
    const wrap = screen?.querySelector<HTMLElement>('.sf-result__titlewrap');
    if (!screen || !wrap) {
      if (++tries < 90) requestAnimationFrame(attempt);
      return;
    }
    if (wrap.querySelector('.ts-seal')) return;
    const win = screen.classList.contains('sf-result--win');
    stampSeal(wrap, {
      text: win ? '大捷' : '再战',
      kind: win ? 'cinnabar' : 'ink',
      delayMs: 620,
      shakeTarget: screen.closest<HTMLElement>('.sf-result-root'),
      onImpact: () => onCue(win ? 'seal' : 'seal-ink'),
    });
  };
  attempt();
}

interface KillEventLike {
  type?: string;
  key?: string;
  team?: number;
  killerId?: number;
}

const MULTI_KILL_KEYS = new Set(['double_kill', 'triple_kill', 'quadra_kill', 'penta_kill']);
const KILL_SEAL_WINDOW_MS = 2600;

/**
 * 击杀小印「斩」：本人击杀、我方多杀的横幅，在阵亡者头像上落一方小朱印，只震横幅自身。
 * 横幅由内核排队显示，所以这里记下「该落印」的时刻，等对应的我方横幅真的挂出来再落。
 */
export function createKillSealWatcher(onCue: (cue: SealCue) => void) {
  let observer: MutationObserver | null = null;
  let armedUntil = 0;

  const onBanner = (banner: HTMLElement) => {
    if (performance.now() > armedUntil) return;
    if (!banner.classList.contains('is-ally')) return;
    const face = banner.querySelector<HTMLElement>('.sf-hud__banner-face.is-r.is-slain');
    if (!face || document.querySelector('.ts-seal')) return;
    armedUntil = 0;
    stampSeal(face, {
      text: '斩',
      kind: 'cinnabar',
      delayMs: 400,
      shakeTarget: banner.parentElement,
      onImpact: () => onCue('seal-small'),
    });
  };

  return {
    /** 对局 HUD 挂好后调用；重复调用会先解绑旧的。 */
    attach(hudRoot: HTMLElement) {
      observer?.disconnect();
      observer = null;
      const wrap = hudRoot.querySelector('.sf-hud__banner-wrap');
      if (!wrap || typeof MutationObserver === 'undefined') return;
      observer = new MutationObserver((records) => {
        for (const record of records) {
          for (const node of record.addedNodes) {
            if (node instanceof HTMLElement && node.classList.contains('sf-hud__banner')) onBanner(node);
          }
        }
      });
      observer.observe(wrap, { childList: true });
    },
    detach() {
      observer?.disconnect();
      observer = null;
      armedUntil = 0;
    },
    /** 喂入本帧的 HUD 事件：本人击杀或我方多杀就上膛。 */
    notice(events: readonly KillEventLike[], me: { id?: number; team?: number } | undefined) {
      if (!me) return;
      for (const ev of events) {
        const mine = ev.type === 'heroKill' && ev.killerId === me.id;
        const allied = ev.type === 'announce' && !!ev.key && MULTI_KILL_KEYS.has(ev.key) && ev.team === me.team;
        if (mine || allied) armedUntil = performance.now() + KILL_SEAL_WINDOW_MS;
      }
    },
  };
}
