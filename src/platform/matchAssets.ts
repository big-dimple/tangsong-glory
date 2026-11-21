import { HEROES, type HeroId } from '../config/heroes';
import { getSkillIconUrl, getSummonerIconUrl } from '../visuals/tangsongIcons';

const MATCH_IMAGES = [
  '/assets/art/loading-bg.webp',
  '/assets/art/victory-bg.webp',
  '/assets/art/defeat-bg.webp',
  '/assets/ui/coin-handdrawn.webp',
  '/assets/ui/xuan-paper.svg',
];
const MATCH_FONTS = ['TangSongBrush', 'TangSongSerif', 'TangSongNum'];
const decodedImages = new Map<string, HTMLImageElement>();

async function decodeImage(image: HTMLImageElement): Promise<void> {
  try {
    await image.decode();
  } catch (cause) {
    throw new Error(`战场图片加载失败：${image.getAttribute('src')}`, { cause });
  }
}

async function preloadImage(url: string): Promise<void> {
  if (decodedImages.has(url)) return;
  const image = new Image();
  image.src = url;
  await decodeImage(image);
  decodedImages.set(url, image);
}

async function waitForResources(tasks: Promise<unknown>[]): Promise<void> {
  let timer = 0;
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error('战场资源加载超时，请重试。')), 30_000);
  });
  try {
    await Promise.race([Promise.all(tasks), timeout]);
  } finally {
    window.clearTimeout(timer);
  }
}

export async function prepareMatchAssets(heroIds: readonly HeroId[], playerId: HeroId): Promise<string[]> {
  const urls = new Set(MATCH_IMAGES);
  for (const id of heroIds) {
    const { avatar, portrait } = HEROES[id].assets;
    urls.add(avatar);
    urls.add(portrait);
  }
  urls.add(HEROES[playerId].assets.eyes);
  for (const slot of ['passive', 's1', 's2', 'ult'] as const) {
    urls.add(getSkillIconUrl(playerId, slot));
  }
  for (const key of ['recall', 'heal', 'flash', 'attack']) {
    urls.add(getSummonerIconUrl(key));
  }

  await waitForResources([
    ...Array.from(urls, preloadImage),
    ...MATCH_FONTS.map((font) => document.fonts.load(`16px ${font}`)),
  ]);
  return [...urls];
}

export function prepareMatchHud(root: HTMLElement): Promise<void> {
  return waitForResources(Array.from(root.querySelectorAll('img'), decodeImage));
}
