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
import { createBattleViewDrag } from './ui/battleViewDrag';
import { mountTeamCommands, teamTactics, type TeamState } from './engine/teamTactics';
import { hasTeamSight, teamVision } from './visuals/teamVision';
import { RenderResolution } from './visuals/renderResolution';
import { createMatchAssetLoader } from './platform/matchAssets';
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

function resolveHero(heroId: string) {
  return (HEROES as Record<string, (typeof HEROES)[HeroId]>)[heroId] ?? heroesByKit[heroId as KitId] ?? HEROES.sushi;
}

function triggerEyesCutin(
  host: HTMLElement | null | undefined,
  heroId: string,
  label?: string,
  badgeText = '绝技 · 大招',
): void {
  if (typeof document === 'undefined' || !document.body) return;
  const hero = resolveHero(heroId);
  document.querySelector('.ts-eyes-cutin')?.remove();
  const feed = host?.querySelector('.sf-hud__feed');
  const banner = document.createElement('div');
  banner.className = 'ts-eyes-cutin';
  banner.style.setProperty('--ts-cutin-color', hero.palette.glow);

  const img = document.createElement('img');
  img.className = 'ts-eyes-cutin__img';
  img.src = hero.assets.eyes;
  img.alt = `${hero.name}眼神特写`;
  img.draggable = false;

  const meta = document.createElement('div');
  meta.className = 'ts-eyes-cutin__meta';

  const heroEl = document.createElement('span');
  heroEl.className = 'ts-eyes-cutin__hero';
  heroEl.textContent = hero.name;

  const labelEl = document.createElement('span');
  labelEl.className = 'ts-eyes-cutin__label';
  labelEl.textContent = label || hero.skills.ult.name;

  meta.append(heroEl, labelEl);
  banner.setAttribute('aria-label', `${badgeText} · ${hero.name} · ${labelEl.textContent}`);
  banner.append(img, meta);
  banner.addEventListener('animationend', () => banner.remove(), { once: true });
  (feed ?? document.body).appendChild(banner);
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
  pos?: { x: number; y: number };
  dir?: { x: number; y: number };
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
  teamTactics,
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
  createMatchAssetLoader,
  createBattleViewDrag,
  RenderResolution,
  hasTeamSight,
  teamVision,
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
      if (phase === 'match') requestAnimationFrame(() => {
        const game = window.__moba as { phase?: string; state?: TeamState; hud?: { el?: HTMLElement } } | undefined;
        if (game?.phase === 'match' && game.state && game.hud?.el) mountTeamCommands(game.hud.el, game.state);
      });
    }
  },
});

if (typeof document !== 'undefined' && document.fonts?.ready) {
  document.fonts.ready.then(() => {
    (window as { __moba?: { refreshTextCache?: () => void } }).__moba?.refreshTextCache?.();
  });
}
