import { BRAND } from '../config/brand';
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
const LOBBY_SUBTITLE = `${BRAND.mapName} · 5v5 实时匹配`;

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

  const quoteEl = el('p', 'ts-lobby__quote', LOBBY_SUBTITLE);
  const quoteReset = () => {
    quoteEl.textContent = LOBBY_SUBTITLE;
  };

  const scrollBg = el('img', 'ts-lobby__bg');
  scrollBg.src = '/assets/art/lobby-scroll.webp';
  scrollBg.alt = '';
  scrollBg.draggable = false;

  const backdrop = el('div', 'ts-lobby__canvas', scrollBg, el('div', 'ts-lobby__scrim'));

  const howtoBtn = el('button', 'ts-lobby__pill', '操作说明');
  howtoBtn.type = 'button';
  howtoBtn.dataset.sfSnd = 'click';
  howtoBtn.addEventListener('click', () => {
    if (!frozen) ctx.openHowto();
  });

  const settingsBtn = el('button', 'ts-lobby__pill', '设置');
  settingsBtn.type = 'button';
  settingsBtn.dataset.sfSnd = 'click';
  settingsBtn.addEventListener('click', () => {
    if (!frozen) ctx.openSettings(syncTutorial);
  });

  const masthead = el('header', 'ts-lobby__masthead', howtoBtn, settingsBtn);

  const titleEl = el('h1', 'sf-logo__name', ...Array.from(BRAND.title, (ch) => el('span', undefined, ch)));
  titleEl.setAttribute('aria-label', BRAND.title);
  const sealEl = el('span', 'ts-lobby__seal', '演武');
  sealEl.setAttribute('aria-hidden', 'true');

  const brand = el(
    'div',
    'ts-lobby__brand',
    el('div', 'ts-lobby__wordmark', titleEl, sealEl),
    quoteEl,
  );

  const fan = el('div', 'ts-lobby__fan');
  for (const heroId of DECK_HERO_IDS) {
    const hero = HEROES[heroId];
    const artImg = el('img', 'ts-lobby__card-img');
    artImg.src = hero.assets.portrait;
    artImg.alt = '';
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
    btn.setAttribute('aria-label', `预选${hero.name}`);

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
  }

  const deck = el(
    'figure',
    'ts-lobby__deck',
    fan,
    el('figcaption', 'ts-lobby__deck-hint', '点画卷预选英雄'),
  );

  const heroSection = el('section', 'ts-lobby__hero', backdrop, masthead, brand, deck);
  heroSection.setAttribute('aria-label', '开场画卷');

  const guideCheck = el('i', 'ts-lobby__guide-seal', '✓');
  guideCheck.setAttribute('aria-hidden', 'true');
  const guideBtn = el('button', 'ts-lobby__guide', guideCheck, '新手引导');
  guideBtn.type = 'button';
  guideBtn.setAttribute('role', 'checkbox');

  function syncTutorial() {
    guideBtn.setAttribute('aria-checked', String(ctx.getTutorial()));
  }
  syncTutorial();

  guideBtn.addEventListener('click', () => {
    if (frozen) return;
    const next = !ctx.getTutorial();
    ctx.setTutorial(next);
    ctx.host.audio.ui('click');
    syncTutorial();
  });

  const startBtn = el('button', 'ts-btn-seal', '开始匹配');
  startBtn.type = 'button';
  startBtn.dataset.sfSnd = 'confirm';
  startBtn.addEventListener('click', () => {
    if (!frozen) ctx.onStart();
  });

  const dockSection = el('section', 'ts-lobby__dock', guideBtn, startBtn);
  dockSection.setAttribute('aria-label', '开局入口');

  const rootScreen = el('div', 'sf-screen ts-lobby', heroSection, dockSection);

  const onKeyDown = (ev: KeyboardEvent) => {
    if (frozen || ev.defaultPrevented || ev.repeat || ctx.isInputFocused() || ctx.hasOpenDialog()) return;
    if (ev.target instanceof HTMLButtonElement) return;
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
