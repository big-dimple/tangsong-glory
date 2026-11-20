#!/usr/bin/env node
/**
 * sync-assets.mjs — 从同级 ../tangsongpai/public/assets/（或 TANGSONGPAI_PUBLIC_ASSETS）同步：
 * 1. 6 位唐宋英雄高清 .webp 头像 / 全身立绘 / 眼部特写
 * 2. 唐宋书法数字字体 (.woff)
 * （v5.0 起 BGM 与音效已完全切换纯程序化 WebAudio，不再同步外置音频）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SRC_ASSETS = path.resolve(
  process.env.TANGSONGPAI_PUBLIC_ASSETS || path.join(PROJECT_ROOT, '../tangsongpai/public/assets'),
);
const OUT_HEROES = path.join(PROJECT_ROOT, 'public/assets/heroes');
const OUT_FONTS = path.join(PROJECT_ROOT, 'public/assets/fonts');

const HERO_ASSETS = [
  { heroId: 'qinqiong', assetId: 'touye', eyesFile: 'touye.eyes-12194e100f85.webp' },
  { heroId: 'xinqiji', assetId: 'laohuan', eyesFile: 'laohuan.eyes-375b308030e5.webp' },
  { heroId: 'sushi', assetId: 'amo', eyesFile: 'amo.eyes-14056db36a63.webp' },
  { heroId: 'wencheng', assetId: 'azao', eyesFile: 'azao.eyes-f6d4675e5bc3.webp' },
  { heroId: 'huarui', assetId: 'xiemu', eyesFile: 'xiemu.eyes-8b93601ca4cc.webp' },
  { heroId: 'liue', assetId: 'erxiang', eyesFile: 'erxiang.eyes-3a23269ca3b5.webp' },
];

const PORTRAIT_KINDS = ['avatar', 'focus', 'portrait', 'selection'];

function copyChecked(src, dst) {
  if (!fs.existsSync(src)) {
    throw new Error(`源资产缺失: ${src}`);
  }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  const stat = fs.statSync(dst);
  if (stat.size <= 0) {
    throw new Error(`目标资产为空文件: ${dst}`);
  }
  return stat.size;
}

function main() {
  if (!fs.existsSync(SRC_ASSETS)) {
    throw new Error(`找不到 tangsongpai 资产目录: ${SRC_ASSETS}`);
  }

  let totalFiles = 0;
  let totalBytes = 0;

  for (const h of HERO_ASSETS) {
    for (const kind of PORTRAIT_KINDS) {
      const name = `${h.assetId}.${kind}.webp`;
      totalBytes += copyChecked(
        path.join(SRC_ASSETS, 'tangsong-portraits', name),
        path.join(OUT_HEROES, 'portraits', name),
      );
      totalFiles++;
    }

    const pcName = `${h.assetId}.pc.webp`;
    totalBytes += copyChecked(
      path.join(SRC_ASSETS, 'tangsong-pc-heroes', pcName),
      path.join(OUT_HEROES, 'pc', pcName),
    );
    totalFiles++;

    totalBytes += copyChecked(
      path.join(SRC_ASSETS, 'tangsong-eyes', h.eyesFile),
      path.join(OUT_HEROES, 'eyes', `${h.heroId}.eyes.webp`),
    );
    totalFiles++;
  }

  totalBytes += copyChecked(
    path.join(SRC_ASSETS, 'fonts/score/tangsongpai-score-numbers.woff'),
    path.join(OUT_FONTS, 'tangsongpai-score-numbers.woff'),
  );
  totalFiles++;

  console.log(
    `[sync-assets] 完成: 已同步 ${totalFiles} 个资产文件 (${(totalBytes / 1024 / 1024).toFixed(2)} MB)`,
  );
}

main();
