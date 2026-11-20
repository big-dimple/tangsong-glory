import { HEROES } from '../config/heroes';

export interface LobbyScreenContext {
  host: {
    getSettings: () => Record<string, unknown>;
    updateSettings: (patch: Record<string, unknown>) => void;
    audio: { ui: (snd: string) => void };
  };
  root: HTMLElement;
  onStart: () => void;
  onPickHero?: (heroId: string) => void;
  openHowto: () => void;
  openSettings: (onAfterUpdate?: () => void) => void;
  getTutorial: () => boolean;
  setTutorial: (enabled: boolean) => void;
  isInputFocused: () => boolean;
  hasOpenDialog: () => boolean;
}

const DECK_HERO_IDS = ['sushi', 'xinqiji', 'huarui', 'qinqiong'] as const;
const DEFAULT_QUOTE = '金秋长安烽火起，挥毫持戟定山河';

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  ...children: (Node | string | null | undefined)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const child of children) {
    if (child === null || child === undefined) continue;
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

export function createTangSongLobby(ctx: LobbyScreenContext) {
  let frozen = false;
  let tutorialOn = !!ctx.getTutorial();

  const quoteEl = el('p', 'ts-lobby__quote', DEFAULT_QUOTE);
  const quoteReset = () => {
    quoteEl.textContent = DEFAULT_QUOTE;
  };

  // ── 1. 上半部：唐宋工笔秋山长卷画卷区 ──
  const scrollBg = el('img', 'ts-lobby__bg');
  scrollBg.src = '/assets/art/lobby-scroll.webp';
  scrollBg.alt = '';
  scrollBg.draggable = false;

  const backdrop = el('div', 'ts-lobby__canvas', scrollBg, el('div', 'ts-lobby__scrim'));

  const howtoTopBtn = el('button', 'ts-lobby__pill', '操作说明');
  howtoTopBtn.type = 'button';
  howtoTopBtn.dataset.sfSnd = 'click';
  howtoTopBtn.addEventListener('click', () => {
    if (!frozen) ctx.openHowto();
  });

  const settingsTopBtn = el('button', 'ts-lobby__pill', '弈局设置');
  settingsTopBtn.type = 'button';
  settingsTopBtn.dataset.sfSnd = 'click';
  settingsTopBtn.addEventListener('click', () => {
    if (!frozen) ctx.openSettings(() => syncTutorial());
  });

  const masthead = el(
    'header',
    'ts-lobby__masthead',
    el('span', 'ts-lobby__genre', '唐宋名士 · 5v5 丹青演武'),
    el('div', 'ts-lobby__top-tools', howtoTopBtn, settingsTopBtn),
  );

  const titleEl = el('h1', 'sf-logo__name', ...'唐宋荣耀'.split('').map((ch) => el('span', undefined, ch)));
  titleEl.setAttribute('aria-label', '唐宋荣耀');
  const sealEl = el('span', 'ts-lobby__seal', '演武');
  sealEl.setAttribute('aria-hidden', 'true');

  const brand = el(
    'div',
    'ts-lobby__brand',
    el('div', 'ts-lobby__wordmark', titleEl, sealEl),
    el('p', 'ts-lobby__chapters', el('i'), el('span', undefined, '六大唐宋名士 · 汴京三路演武')),
    quoteEl,
  );

  // 右侧四枚宣纸名士折扇画卷
  const fan = el('div', 'ts-lobby__fan');
  DECK_HERO_IDS.forEach((heroId, idx) => {
    const hero = HEROES[heroId];
    const artImg = el('img', 'ts-lobby__card-img');
    artImg.src = hero.assets.portrait;
    artImg.alt = hero.name;
    artImg.draggable = false;

    const frame = el(
      'span',
      'ts-lobby__card-face',
      artImg,
      el('span', 'ts-lobby__card-era', hero.era),
      el('span', 'ts-lobby__card-name', hero.name),
    );
    const btn = el('button', 'ts-lobby__card', frame);
    btn.type = 'button';
    btn.dataset.hero = hero.id;
    btn.dataset.sfSnd = 'select';
    btn.style.setProperty('--ts-card-idx', String(idx));
    btn.setAttribute('aria-label', `选择${hero.name}进入选将殿堂`);

    const showHeroQuote = () => {
      quoteEl.textContent = `${hero.era} · ${hero.name}：「${hero.motto}」`;
    };
    btn.addEventListener('mouseenter', showHeroQuote);
    btn.addEventListener('focus', showHeroQuote);
    btn.addEventListener('mouseleave', quoteReset);
    btn.addEventListener('blur', quoteReset);
    btn.addEventListener('click', () => {
      if (frozen) return;
      ctx.host.audio.ui('confirm');
      if (ctx.onPickHero) ctx.onPickHero(hero.id);
      else ctx.onStart();
    });

    fan.append(btn);
  });

  const deck = el(
    'figure',
    'ts-lobby__deck',
    fan,
    el('figcaption', 'ts-lobby__deck-hint', '轻点名士画卷，择将直入演武'),
  );

  const heroSection = el('section', 'ts-lobby__hero', backdrop, masthead, brand, deck);
  heroSection.setAttribute('aria-label', '开场画卷');

  // ── 2. 下半部：宋式朱漆沉木案几与朱文印章操作栏 ──
  const guideCheck = el('i', 'ts-lobby__guide-seal', '✓');
  const guideBtn = el(
    'button',
    'ts-lobby__guide',
    guideCheck,
    el('span', undefined, '新手引导'),
    el('small', undefined, '首次游玩建议开启'),
  );
  guideBtn.type = 'button';
  guideBtn.setAttribute('role', 'checkbox');

  function syncTutorial() {
    tutorialOn = !!ctx.getTutorial();
    guideBtn.setAttribute('aria-checked', tutorialOn ? 'true' : 'false');
  }
  syncTutorial();

  guideBtn.addEventListener('click', () => {
    if (frozen) return;
    const next = !ctx.getTutorial();
    ctx.setTutorial(next);
    ctx.host.audio.ui('click');
    syncTutorial();
  });

  const startBtn = el(
    'button',
    'ts-btn-seal',
    el('span', 'ts-btn-seal__sub', '出征演武'),
    el('span', 'ts-btn-seal__main', '开始对战'),
  );
  startBtn.type = 'button';
  startBtn.dataset.sfSnd = 'confirm';
  startBtn.addEventListener('click', () => {
    if (!frozen) ctx.onStart();
  });

  const howtoDockBtn = el('button', 'ts-btn-ink', el('span', undefined, '操作说明'));
  howtoDockBtn.type = 'button';
  howtoDockBtn.dataset.sfSnd = 'click';
  howtoDockBtn.addEventListener('click', () => {
    if (!frozen) ctx.openHowto();
  });

  const settingsDockBtn = el('button', 'ts-btn-ink', el('span', undefined, '设置'));
  settingsDockBtn.type = 'button';
  settingsDockBtn.dataset.sfSnd = 'click';
  settingsDockBtn.addEventListener('click', () => {
    if (!frozen) ctx.openSettings(() => syncTutorial());
  });

  const copyCol = el(
    'div',
    'ts-lobby__copy',
    el('h2', 'ts-lobby__dock-title', '择一唐宋名士，共赴汴京演武'),
    el('p', 'ts-lobby__meta', '1 名玩家 + 9 名 AI · 实时 5v5 推塔对决 · v5.0'),
    guideBtn,
  );

  const actionsCol = el('div', 'ts-lobby__actions', settingsDockBtn, howtoDockBtn, startBtn);
  const dockSection = el('section', 'ts-lobby__dock', copyCol, actionsCol);
  dockSection.setAttribute('aria-label', '开局入口');

  const rootScreen = el('div', 'sf-screen ts-lobby', heroSection, dockSection);

  const onKeyDown = (ev: KeyboardEvent) => {
    if (frozen || ctx.isInputFocused() || ev.repeat || ctx.hasOpenDialog()) return;
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      ctx.host.audio.ui('confirm');
      ctx.onStart();
    }
  };
  window.addEventListener('keydown', onKeyDown);

  return {
    el: rootScreen,
    freeze: () => {
      frozen = true;
    },
    dispose: () => {
      window.removeEventListener('keydown', onKeyDown);
    },
  };
}
