import { HEROES, type HeroId } from '../config/heroes';
import { getSkillIconUrl, getSummonerIconUrl } from '../visuals/tangsongIcons';

const MATCH_IMAGES = [
  '/assets/art/loading-bg.webp',
  '/assets/art/victory-bg.webp',
  '/assets/art/defeat-bg.webp',
  '/assets/ui/coin-handdrawn.webp',
  '/assets/ui/xuan-paper.svg',
];
const MATCH_FONTS = {
  TangSongBrush: '/assets/fonts/tangsong-brush.woff2',
  TangSongSerif: '/assets/fonts/tangsong-serif.woff2',
  TangSongNum: '/assets/fonts/tangsongpai-score-numbers.woff',
};
const decodedImages = new Map<string, HTMLImageElement>();
const loadedFonts = new Set<string>();
const retryDelays = [1000, 3000, 8000, 30_000, 60_000];

type LoadTask = (retry: boolean, signal: AbortSignal, progress: () => void) => Promise<void>;

async function refresh(url: string, signal: AbortSignal, progress: () => void) {
  const response = await fetch(url, { cache: 'reload', signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (!response.body || typeof TransformStream === 'undefined') return response.arrayBuffer();
  const stream = response.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      progress();
      controller.enqueue(chunk);
    },
  }));
  return new Response(stream).arrayBuffer();
}

function imageTask(url: string, element?: HTMLImageElement): LoadTask {
  return async (retry, signal, progress) => {
    if (!element && decodedImages.has(url)) return;
    const image = element ?? new Image();
    if (retry) await refresh(url, signal, progress);
    if (!element || retry || (image.complete && !image.naturalWidth)) image.src = url;
    await image.decode();
    if (!signal.aborted && !element) decodedImages.set(url, image);
  };
}

function fontTask(family: string, url: string): LoadTask {
  return async (retry, signal, progress) => {
    if (loadedFonts.has(family)) return;
    if (retry) {
      // A failed CSS FontFace stays rejected even after connectivity returns.
      const face = new FontFace(family, await refresh(url, signal, progress));
      await face.load();
      if (!signal.aborted) document.fonts.add(face);
    } else {
      const faces = await document.fonts.load(`16px ${family}`);
      if (!faces.length) throw new Error(family);
    }
    if (!signal.aborted) loadedFonts.add(family);
  };
}

export function createMatchAssetLoader(root: HTMLElement, parentSignal: AbortSignal, backToMenu: () => void) {
  const life = new AbortController();
  const cancel = () => life.abort();
  parentSignal.addEventListener('abort', cancel);
  if (parentSignal.aborted) cancel();

  const notice = document.createElement('div');
  notice.className = 'ts-loading-recovery';
  const status = document.createElement('span');
  status.setAttribute('role', 'status');
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = '立即重试';
  const back = document.createElement('button');
  back.type = 'button';
  back.textContent = '返回大厅';
  back.onclick = backToMenu;
  notice.append(status, button, back);

  async function waitForRetry(count: number, delay: number) {
    const prefix = `还有 ${count} 项资源待加载`;
    root.querySelector('.sf-loading__foot')?.prepend(notice);
    button.disabled = false;
    let timer = 0;
    await new Promise<void>((resolve) => {
      function resume() {
        clearTimeout(timer);
        window.removeEventListener('online', resume);
        window.removeEventListener('offline', schedule);
        life.signal.removeEventListener('abort', resume);
        button.onclick = null;
        resolve();
      }
      function schedule() {
        clearTimeout(timer);
        status.textContent = navigator.onLine
          ? `${prefix}，${Math.ceil(delay / 1000)} 秒后重试。`
          : `${prefix}，网络恢复后自动继续。`;
        if (navigator.onLine) timer = window.setTimeout(resume, delay);
      }
      window.addEventListener('online', resume);
      window.addEventListener('offline', schedule);
      life.signal.addEventListener('abort', resume);
      button.onclick = resume;
      schedule();
      if (life.signal.aborted) resume();
    });
    button.disabled = true;
    status.textContent = `正在重新加载剩余 ${count} 项资源…`;
  }

  async function load(tasks: LoadTask[]) {
    const pending = new Set(tasks);
    for (let attempt = 0; pending.size; attempt++) {
      if (life.signal.aborted) throw new DOMException('加载已取消', 'AbortError');
      const round = new AbortController();
      const stop = () => round.abort();
      life.signal.addEventListener('abort', stop);
      let timeout = 0;
      const progress = () => {
        if (round.signal.aborted) return;
        clearTimeout(timeout);
        timeout = window.setTimeout(stop, attempt ? 60_000 : 30_000);
      };
      progress();
      const stopped = new Promise<void>((resolve) => round.signal.addEventListener('abort', () => resolve(), { once: true }));
      try {
        await Promise.race([stopped, Promise.all(Array.from(pending, async (task) => {
          try {
            await task(attempt > 0, round.signal, progress);
            if (!round.signal.aborted) { pending.delete(task); progress(); }
          } catch {
            // Keep only failed or unfinished resources for the next round.
          }
        }))]);
      } finally {
        clearTimeout(timeout);
        life.signal.removeEventListener('abort', stop);
        stop();
      }
      if (pending.size && !life.signal.aborted) {
        await waitForRetry(pending.size, retryDelays[Math.min(attempt, retryDelays.length - 1)]);
      }
    }
    notice.remove();
  }

  function prepareImagesIn(container: HTMLElement) {
    return load(Array.from(container.querySelectorAll('img'), (image) => imageTask(image.src, image)));
  }

  return {
    async prepareAssets(heroIds: readonly HeroId[], playerId: HeroId) {
      const urls = new Set(MATCH_IMAGES);
      for (const id of heroIds) {
        const { avatar, portrait } = HEROES[id].assets;
        urls.add(avatar);
        urls.add(portrait);
      }
      urls.add(HEROES[playerId].assets.eyes);
      for (const slot of ['passive', 's1', 's2', 'ult'] as const) urls.add(getSkillIconUrl(playerId, slot));
      for (const key of ['recall', 'heal', 'flash', 'attack']) urls.add(getSummonerIconUrl(key));
      await load([
        ...Array.from(urls, (url) => imageTask(url)),
        ...Object.entries(MATCH_FONTS).map(([name, url]) => fontTask(name, url)),
      ]);
      await prepareImagesIn(root);
      return urls;
    },
    prepareHud: prepareImagesIn,
    dispose() {
      parentSignal.removeEventListener('abort', cancel);
      cancel();
      notice.remove();
    },
  };
}
