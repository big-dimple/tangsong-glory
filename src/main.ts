import './styles/tangsong-theme.css';
import {
  createTangSongMusic,
  attachTangSongSfx,
  type AudioMixerLike,
  type SfxEntryLike,
} from './audio/tangsongAudio';
import { BRAND } from './config/brand';
import {
  CAMERA_PRESET_LIST,
  getCameraPresetConfig,
  loadCameraPreset,
  saveCameraPreset,
} from './config/camera';
import {
  HEROES,
  HERO_ORDER,
  KIT_MAP,
  selectMatchTeams,
  type HeroId,
  type KitId,
} from './config/heroes';
import { createArchitectureBuilders, type ArchApi } from './visuals/tangsongArchitecture';
import { createTangSongFlora, type FloraApi } from './visuals/tangsongFlora';
import {
  animateHeroCompanion,
  buildHuaRuiWarriorFull,
  buildMageFull,
  buildQinQiongFull,
  buildWenchengFull,
  buildXinQijiAssassinFull,
} from './visuals/tangsongHeroes3D';
import { createTangSongMinions, type MinionEngineApi } from './visuals/tangsongMinions3D';
import { createTangSongMonsters, type MonsterEngineApi } from './visuals/tangsongMonsters3D';
import { createTangSongWildlife, type WildlifeApi } from './visuals/tangsongWildlife';
import { createTangSongLobby, type LobbyScreenContext } from './ui/tangsongLobby';
import { getSkillIcon, getSummonerIcon } from './visuals/tangsongIcons';
import {
  addTangSongRiverAndGateLandmarks,
  buildTangSongHorizon,
  createBaseWallBuilders,
  createLandmarkPropBuilders,
  type MapSdfLike,
  type PropsApi,
  type SceneryAccumLike,
} from './visuals/tangsongProps';
import {
  TANGSONG_GF_PLAZA_PATCH,
  TANGSONG_GF_RIVER_PATCH,
  TANGSONG_MF_SHADER_BODY,
  TANGSONG_WO_SHIELD_BODY,
  buildTangSongCliffTexture,
  buildTangSongDirtTexture,
  buildTangSongGroundTexture,
  buildTangSongStoneTexture,
  drawTangSongMinimapBase,
  type CliffTexHelpers,
  type GroundTexHelpers,
  type StoneTexHelpers,
} from './visuals/tangsongTerrain';
import {
  TANGSONG_ACCENT_TREE_PALETTES,
  TANGSONG_GRADE,
  TANGSONG_PALETTE,
  buildBrazierEmber,
  buildPalaceLantern,
  buildTaihuGardenBoulder,
  buildTaihuLanternRock,
  type SceneryApi,
} from './visuals/tangsongWorld';
import { TANGSONG_COMBAT_FEEL } from './config/combatFeel';
import {
  TANGSONG_VFX_SHADERS,
  patchTangSongSpriteAtlas,
  type SpriteAtlasApi,
  type SpriteEntry,
} from './visuals/tangsongVfx';
import { bootTangSongGlory } from './engine/mobaCore.js';

declare global {
  interface Window {
    __moba?: Record<string, unknown>;
    __mobaBooted?: boolean;
  }
}

const heroesByKit: Partial<Record<KitId, (typeof HEROES)[HeroId]>> = {};
for (const id of HERO_ORDER) {
  const hero = HEROES[id];
  if (!heroesByKit[hero.kitId]) {
    heroesByKit[hero.kitId] = hero;
  }
}

let activeCutinTimer = 0;
let cutinRafId = 0;
const eyesPreloadCache: HTMLImageElement[] = [];

function preloadEyesAssets(): void {
  if (typeof Image === 'undefined') return;
  for (const id of HERO_ORDER) {
    const img = new Image();
    img.decoding = 'async';
    img.src = HEROES[id].assets.eyes;
    eyesPreloadCache.push(img);
  }
}

function resolveHero(heroId: string) {
  return (HEROES as Record<string, (typeof HEROES)[HeroId]>)[heroId] ?? heroesByKit[heroId as KitId] ?? HEROES.sushi;
}

function triggerEyesCutin(
  _host: HTMLElement | null | undefined,
  heroId: string,
  label?: string,
  badgeText = '绝技 · 大招',
): void {
  if (typeof document === 'undefined' || !document.body) return;
  const hero = resolveHero(heroId);
  const existing = document.querySelectorAll('.ts-eyes-cutin');
  existing.forEach((el) => el.remove());
  if (cutinRafId) {
    window.cancelAnimationFrame(cutinRafId);
    cutinRafId = 0;
  }
  if (activeCutinTimer) {
    window.clearTimeout(activeCutinTimer);
    activeCutinTimer = 0;
  }

  const banner = document.createElement('div');
  banner.className = 'ts-eyes-cutin';
  banner.style.setProperty('--ts-cutin-color', hero.palette.glow);

  const img = document.createElement('img');
  img.className = 'ts-eyes-cutin__img';
  img.src = hero.assets.eyes;
  img.alt = `${hero.name}眼神特写`;
  img.draggable = false;

  const sheen = document.createElement('span');
  sheen.className = 'ts-eyes-cutin__sheen';

  const meta = document.createElement('div');
  meta.className = 'ts-eyes-cutin__meta';

  const badgeEl = document.createElement('span');
  badgeEl.className = 'ts-eyes-cutin__badge';
  badgeEl.textContent = badgeText;

  const heroEl = document.createElement('span');
  heroEl.className = 'ts-eyes-cutin__hero';
  heroEl.textContent = `${hero.era} · ${hero.name}`;

  const labelEl = document.createElement('span');
  labelEl.className = 'ts-eyes-cutin__label';
  labelEl.textContent = label || hero.skills.ult.name;

  meta.append(badgeEl, heroEl, labelEl);
  banner.append(img, sheen, meta);
  document.body.appendChild(banner);
  void banner.offsetWidth;

  const createdAt = performance.now();
  let shownSince = 0;
  let shownFrames = 0;
  const holdTick = (now: number) => {
    if (!banner.isConnected) {
      cutinRafId = 0;
      return;
    }
    const imgReady = (img.complete && img.naturalWidth > 0) || now - createdAt >= 600;
    if (imgReady) {
      if (!shownSince) shownSince = now;
      shownFrames += 1;
    }
    const minHoldMet = shownSince > 0 && now - shownSince >= 4200 && shownFrames >= 45;
    const hardCapMet = now - createdAt >= 15000 || (document.hidden && now - createdAt >= 3000);
    if (minHoldMet || hardCapMet) {
      cutinRafId = 0;
      banner.classList.add('is-leaving');
      activeCutinTimer = window.setTimeout(() => {
        banner.remove();
        activeCutinTimer = 0;
      }, 320);
      return;
    }
    cutinRafId = window.requestAnimationFrame(holdTick);
  };
  cutinRafId = window.requestAnimationFrame(holdTick);
}

function mountVersionStamp(): void {
  if (typeof document === 'undefined' || document.getElementById('sf-ver')) return;
  const ver = document.createElement('div');
  ver.id = 'sf-ver';
  ver.textContent = BRAND.versionStamp;
  document.body.appendChild(ver);
}

interface HudEventLike {
  type?: string;
  key?: string;
  slot?: string;
  unitId?: number;
  heroId?: string;
}

interface HudCtxLike {
  root?: HTMLElement;
  me?: { id?: number; heroId?: string };
  host?: { getSettings?: () => { eyesCutin?: boolean } };
  hero?: (id: number) => { heroId?: string } | undefined;
}

function handleHudEvents(events: HudEventLike[], hudCtx: HudCtxLike): void {
  const settings = hudCtx.host?.getSettings?.();
  if (settings && settings.eyesCutin === false) return;

  const HIGHLIGHT_KEYS = new Set([
    'first_blood',
    'double_kill',
    'triple_kill',
    'quadra_kill',
    'penta_kill',
    'legendary',
    'shutdown',
  ]);

  for (const ev of events) {
    if (ev.type === 'skillCast' && ev.slot === 'ult' && ev.unitId === hudCtx.me?.id) {
      const heroId = ev.heroId ?? hudCtx.me?.heroId ?? 'sushi';
      const hero = resolveHero(heroId);
      triggerEyesCutin(hudCtx.root, hero.id, hero.skills.ult.name, '绝技 · 终极奥义');
      return;
    }
    if (ev.type === 'announce' && ev.key && HIGHLIGHT_KEYS.has(ev.key) && ev.unitId === hudCtx.me?.id) {
      const actor = typeof ev.unitId === 'number' ? hudCtx.hero?.(ev.unitId) : undefined;
      const heroId = actor?.heroId ?? hudCtx.me?.heroId ?? 'sushi';
      const label = (BRAND.announces as Record<string, string>)[ev.key] ?? ev.key;
      triggerEyesCutin(hudCtx.root, heroId, label, '战场高光 · 连捷');
      return;
    }
  }
}

mountVersionStamp();
preloadEyesAssets();

bootTangSongGlory({
  brand: BRAND,
  heroOrder: HERO_ORDER,
  heroes: HEROES,
  heroesByKit,
  kitMap: KIT_MAP,
  selectMatchTeams,
  cameraPresetList: CAMERA_PRESET_LIST,
  getInitialCameraPresetKey: loadCameraPreset,
  getCameraPreset: getCameraPresetConfig,
  saveCameraPreset,
  palette: TANGSONG_PALETTE,
  grade: TANGSONG_GRADE,
  accentTrees: TANGSONG_ACCENT_TREE_PALETTES,
  buildTaihuRock: (api: SceneryApi, seed: number, isBig: boolean) => buildTaihuLanternRock(api, seed, isBig),
  buildTaihuBoulder: (api: SceneryApi, seed: number, isBig: boolean) => buildTaihuGardenBoulder(api, seed, isBig),
  buildPalaceLantern: (api: SceneryApi) => buildPalaceLantern(api),
  buildBrazierEmber: (api: SceneryApi) => buildBrazierEmber(api),
  createArchitectureBuilders: (api: ArchApi) => createArchitectureBuilders(api),
  createFlora: (api: FloraApi) => createTangSongFlora(api),
  createBaseWallBuilders: (api: PropsApi) => createBaseWallBuilders(api),
  createLandmarkPropBuilders: (api: PropsApi) => createLandmarkPropBuilders(api),
  addTangSongRiverLandmarks: (
    api: PropsApi,
    accum: SceneryAccumLike,
    bundle: {
      bridgeRail: unknown;
      archways: unknown[];
      riverLanterns: unknown[];
      mooringPosts: unknown[];
      lilyPads?: unknown[];
      lotusBud?: unknown;
    },
    mapSdf: MapSdfLike,
    effects: {
      glows: { x: number; z: number; y: number; r: number; color: number[] }[];
      ripples: { x: number; z: number; r: number }[];
      aoBlobs: { x: number; y: number; z: number; r: number; strength: number }[];
    },
    particleSpots: {
      x: number;
      y: number;
      z: number;
      radius: number;
      color: number[];
      count: number;
      mode: number;
      range: number;
      size: number;
    }[],
  ) => addTangSongRiverAndGateLandmarks(api, accum, bundle, mapSdf, effects, particleSpots),
  buildTangSongHorizon: (api: PropsApi) => buildTangSongHorizon(api),
  buildTangSongStoneTexture: (
    sunDir: { x: number; y: number; z: number },
    size: number,
    maxAniso: number,
    helpers: StoneTexHelpers,
  ) => buildTangSongStoneTexture(sunDir, size, maxAniso, helpers),
  buildTangSongGroundTexture: (size: number, helpers: GroundTexHelpers) =>
    buildTangSongGroundTexture(size, helpers),
  buildTangSongDirtTexture: (size: number, sx: number, sz: number, helpers: GroundTexHelpers) =>
    buildTangSongDirtTexture(size, sx, sz, helpers),
  buildTangSongCliffTexture: (helpers: CliffTexHelpers) => buildTangSongCliffTexture(helpers),
  drawTangSongMinimapBase,
  terrainShaders: {
    mfBody: TANGSONG_MF_SHADER_BODY,
    woBody: TANGSONG_WO_SHIELD_BODY,
    gfPlaza: TANGSONG_GF_PLAZA_PATCH,
    gfRiver: TANGSONG_GF_RIVER_PATCH,
  },
  vfxShaders: TANGSONG_VFX_SHADERS,
  patchTangSongSpriteAtlas: (
    vb: Record<number, SpriteEntry>,
    Ft: Record<string, number>,
    api: SpriteAtlasApi,
  ) => patchTangSongSpriteAtlas(vb, Ft, api),
  combatFeel: TANGSONG_COMBAT_FEEL,
  heroes3D: {
    buildQinQiongFull,
    buildMageFull,
    buildWenchengFull,
    buildXinQijiAssassinFull,
    buildHuaRuiWarriorFull,
    animateHeroCompanion,
  },
  createMinionBuilders: (api: MinionEngineApi) => createTangSongMinions(api),
  createMonsterBuilders: (api: MonsterEngineApi) => createTangSongMonsters(api),
  createWildlife: (api: WildlifeApi) => createTangSongWildlife(api),
  createLobbyScreen: (ctx: LobbyScreenContext) => createTangSongLobby(ctx),
  getSkillIcon,
  getSummonerIcon,
  createMusicController: (mixer: AudioMixerLike) => createTangSongMusic(mixer),
  attachSfx: (mixer: AudioMixerLike, r1?: Record<string, SfxEntryLike>) => attachTangSongSfx(mixer, r1),
  getPortraitUrl(heroId: string, variant: 'avatar' | 'portrait' | 'focus' | 'selection' | 'eyes' = 'avatar') {
    const hero = resolveHero(heroId);
    return hero.assets[variant] ?? hero.assets.avatar;
  },
  getPcUrl(heroId: string) {
    return resolveHero(heroId).assets.pc;
  },
  triggerEyesCutin,
  onHudEvents: handleHudEvents,
  onPhaseChange(phase: string) {
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('ts-in-match', phase === 'match' || phase === 'loading');
    }
  },
});

if (typeof document !== 'undefined' && document.fonts?.ready) {
  document.fonts.ready.then(() => {
    (window as { __moba?: { refreshTextCache?: () => void } }).__moba?.refreshTextCache?.();
  });
}
