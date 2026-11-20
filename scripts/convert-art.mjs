#!/usr/bin/env node
/**
 * convert-art.mjs — 将 artifact 目录生成的 5 张 16:9 唐宋主视觉原图
 * 统一规范缩放至 1600x900 高质量 .webp 并输出至 public/assets/art/
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const ARTIFACT_DIR = path.resolve(
  process.argv[2] || process.env.ART_SOURCE_DIR || path.join(PROJECT_ROOT, '.cache/art-sources'),
);
const OUT_DIR = path.join(PROJECT_ROOT, 'public/assets/art');

const ART_SOURCES = [
  {
    src: path.join(ARTIFACT_DIR, 'lobby_bg_v2_1795134818570.jpg'),
    out: 'lobby-bg.webp',
    width: 1600,
    height: 900,
    quality: 0.86,
  },
  {
    src: path.join(ARTIFACT_DIR, 'select_bg_1795134802195.jpg'),
    out: 'select-bg.webp',
    width: 1600,
    height: 900,
    quality: 0.86,
  },
  {
    src: path.join(ARTIFACT_DIR, 'loading_bg_1795134803864.jpg'),
    out: 'loading-bg.webp',
    width: 1600,
    height: 900,
    quality: 0.86,
  },
  {
    src: path.join(ARTIFACT_DIR, 'victory_bg_v3_1795134838621.jpg'),
    out: 'victory-bg.webp',
    width: 1600,
    height: 900,
    quality: 0.86,
  },
  {
    src: path.join(ARTIFACT_DIR, 'defeat_bg_1795134809181.jpg'),
    out: 'defeat-bg.webp',
    width: 1600,
    height: 900,
    quality: 0.86,
  },
];

function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean);
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('未找到 Chrome 或 Edge 可执行文件');
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: findBrowser(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    let totalBytes = 0;
    for (const item of ART_SOURCES) {
      if (!fs.existsSync(item.src)) {
        throw new Error(`源画作缺失: ${item.src}`);
      }
      const b64 = fs.readFileSync(item.src).toString('base64');
      const dataUrl = `data:image/jpeg;base64,${b64}`;
      const webpDataUrl = await page.evaluate(
        ({ srcUrl, w, h, q }) =>
          new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = w;
              canvas.height = h;
              const ctx = canvas.getContext('2d');
              if (!ctx) return reject(new Error('No 2d context'));
              // cover fit centered
              const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
              const dw = img.naturalWidth * scale;
              const dh = img.naturalHeight * scale;
              const dx = (w - dw) * 0.5;
              const dy = (h - dh) * 0.5;
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(img, dx, dy, dw, dh);
              resolve(canvas.toDataURL('image/webp', q));
            };
            img.onerror = () => reject(new Error('Image decode failed'));
            img.src = srcUrl;
          }),
        { srcUrl: dataUrl, w: item.width, h: item.height, q: item.quality },
      );
      const outBuf = Buffer.from(webpDataUrl.split(',')[1], 'base64');
      const outPath = path.join(OUT_DIR, item.out);
      fs.writeFileSync(outPath, outBuf);
      totalBytes += outBuf.length;
      console.log(`[convert-art] ${item.out}: ${(outBuf.length / 1024).toFixed(1)} KB (${item.width}x${item.height})`);
    }
    console.log(`[convert-art] 全部完成: ${(totalBytes / 1024).toFixed(1)} KB -> ${OUT_DIR}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('[convert-art] FAILED:', err);
  process.exit(1);
});
