#!/usr/bin/env node
/**
 * slice-skill-icons.mjs — 将 7 张 2×2 宫格技能图标原画按象限内缩裁剪为 256×256 高清 .webp
 * 输出：
 *   public/assets/icons/skills/{hero}-{passive,s1,s2,ult}.webp   (24 枚)
 *   public/assets/icons/summoner/{recall,heal,flash,attack}.webp (4 枚)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SOURCE_DIR = path.resolve(
  process.argv[2] || process.env.ICON_SOURCE_DIR || path.join(PROJECT_ROOT, '.cache/icon-sheets'),
);
const SKILLS_OUT = path.join(PROJECT_ROOT, 'public/assets/icons/skills');
const SUMMONER_OUT = path.join(PROJECT_ROOT, 'public/assets/icons/summoner');

const SIZE = 256;
const QUALITY = 0.9;
const TRIM_RATIO = 0.055; // 内缩 5.5% 避开四象限接缝边缘与外缘阴影

const SHEET_MAP = [
  {
    sheet: 'icons_qinqiong',
    outputs: [
      { col: 0, row: 0, dest: 'skills/qinqiong-passive.webp' },
      { col: 1, row: 0, dest: 'skills/qinqiong-s1.webp' },
      { col: 0, row: 1, dest: 'skills/qinqiong-s2.webp' },
      { col: 1, row: 1, dest: 'skills/qinqiong-ult.webp' },
    ],
  },
  {
    sheet: 'icons_xinqiji',
    outputs: [
      { col: 0, row: 0, dest: 'skills/xinqiji-passive.webp' },
      { col: 1, row: 0, dest: 'skills/xinqiji-s1.webp' },
      { col: 0, row: 1, dest: 'skills/xinqiji-s2.webp' },
      { col: 1, row: 1, dest: 'skills/xinqiji-ult.webp' },
    ],
  },
  {
    sheet: 'icons_sushi',
    outputs: [
      { col: 0, row: 0, dest: 'skills/sushi-passive.webp' },
      { col: 1, row: 0, dest: 'skills/sushi-s1.webp' },
      { col: 0, row: 1, dest: 'skills/sushi-s2.webp' },
      { col: 1, row: 1, dest: 'skills/sushi-ult.webp' },
    ],
  },
  {
    sheet: 'icons_wencheng',
    outputs: [
      { col: 0, row: 0, dest: 'skills/wencheng-passive.webp' },
      { col: 1, row: 0, dest: 'skills/wencheng-s1.webp' },
      { col: 0, row: 1, dest: 'skills/wencheng-s2.webp' },
      { col: 1, row: 1, dest: 'skills/wencheng-ult.webp' },
    ],
  },
  {
    sheet: 'icons_huarui',
    outputs: [
      { col: 0, row: 0, dest: 'skills/huarui-passive.webp' },
      { col: 1, row: 0, dest: 'skills/huarui-s1.webp' },
      { col: 0, row: 1, dest: 'skills/huarui-s2.webp' },
      { col: 1, row: 1, dest: 'skills/huarui-ult.webp' },
    ],
  },
  {
    sheet: 'icons_liue',
    outputs: [
      { col: 0, row: 0, dest: 'skills/liue-passive.webp' },
      { col: 1, row: 0, dest: 'skills/liue-s1.webp' },
      { col: 0, row: 1, dest: 'skills/liue-s2.webp' },
      { col: 1, row: 1, dest: 'skills/liue-ult.webp' },
    ],
  },
  {
    sheet: 'icons_summoner',
    outputs: [
      { col: 0, row: 0, dest: 'summoner/recall.webp' },
      { col: 1, row: 0, dest: 'summoner/heal.webp' },
      { col: 0, row: 1, dest: 'summoner/flash.webp' },
      { col: 1, row: 1, dest: 'summoner/attack.webp' },
    ],
  },
];

function findBrowser() {
  const candidates = [
    process.env.SMOKE_CHROMIUM_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('未找到 Chrome/Chromium/Edge 可执行文件');
}

function findSheetFile(baseName) {
  for (const ext of ['.png', '.jpg', '.jpeg', '.webp']) {
    const exact = path.join(SOURCE_DIR, `${baseName}${ext}`);
    if (fs.existsSync(exact)) {
      return { path: exact, mime: ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg' };
    }
  }
  const files = fs
    .readdirSync(SOURCE_DIR)
    .filter((f) => f.startsWith(`${baseName}_`) && /\.(png|jpe?g|webp)$/i.test(f))
    .sort();
  if (files.length > 0) {
    const picked = path.join(SOURCE_DIR, files[files.length - 1]);
    const ext = path.extname(picked).toLowerCase();
    return { path: picked, mime: ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg' };
  }
  throw new Error(`未找到原画文件: ${SOURCE_DIR}/${baseName}.{png,jpg,webp}`);
}

async function main() {
  fs.mkdirSync(SKILLS_OUT, { recursive: true });
  fs.mkdirSync(SUMMONER_OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: findBrowser(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    let totalBytes = 0;
    let totalCount = 0;
    for (const group of SHEET_MAP) {
      const src = findSheetFile(group.sheet);
      const dataUrl = `data:${src.mime};base64,${fs.readFileSync(src.path).toString('base64')}`;
      const results = await page.evaluate(
        ({ url, outputs, size, quality, trimRatio }) =>
          new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              const cellW = img.naturalWidth / 2;
              const cellH = img.naturalHeight / 2;
              const trimX = cellW * trimRatio;
              const trimY = cellH * trimRatio;
              const srcW = cellW - trimX * 2;
              const srcH = cellH - trimY * 2;
              const side = Math.min(srcW, srcH);
              const out = [];
              for (const item of outputs) {
                const sx = item.col * cellW + (cellW - side) * 0.5;
                const sy = item.row * cellH + (cellH - side) * 0.5;
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error('No 2d context'));
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
                out.push({ dest: item.dest, webp: canvas.toDataURL('image/webp', quality) });
              }
              resolve(out);
            };
            img.onerror = () => reject(new Error('Failed to decode sheet image'));
            img.src = url;
          }),
        { url: dataUrl, outputs: group.outputs, size: SIZE, quality: QUALITY, trimRatio: TRIM_RATIO },
      );
      for (const r of results) {
        const buf = Buffer.from(r.webp.split(',')[1], 'base64');
        const outPath = path.join(PROJECT_ROOT, 'public/assets/icons', r.dest);
        fs.writeFileSync(outPath, buf);
        totalBytes += buf.length;
        totalCount++;
        console.log(`[slice-skill-icons] ${r.dest}: ${(buf.length / 1024).toFixed(1)} KB`);
      }
    }
    console.log(`[slice-skill-icons] 完成 ${totalCount} 枚图标，总计 ${(totalBytes / 1024).toFixed(1)} KB`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('[slice-skill-icons] FAILED:', err);
  process.exit(1);
});
