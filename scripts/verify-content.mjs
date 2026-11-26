#!/usr/bin/env node
/**
 * verify-content.mjs — 《唐宋荣耀》内容、资产清单与开源隐私防线静态校验
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const HERO_SPECS = [
  ['qinqiong', 'touye'],
  ['xinqiji', 'laohuan'],
  ['sushi', 'amo'],
  ['wencheng', 'azao'],
  ['huarui', 'xiemu'],
  ['liue', 'erxiang'],
];

const ART_FILES = [
  'assets/art/lobby-bg.webp',
  'assets/art/lobby-scroll.webp',
  'assets/art/select-bg.webp',
  'assets/art/select-pavilion.webp',
  'assets/art/loading-bg.webp',
  'assets/art/victory-bg.webp',
  'assets/art/defeat-bg.webp',
  'assets/ui/xuan-paper.svg',
  'assets/ui/coin-handdrawn.webp',
  'assets/fonts/tangsong-brush.woff2',
  'assets/fonts/tangsong-serif.woff2',
  'assets/fonts/tangsongpai-score-numbers.woff',
];

const BGM_TRACKS = ['tianhu-begin', 'moon-shop', 'go-cake', 'vsboss'];

const FORBIDDEN_TERMS = [
  '王者农药',
  'WANGZHE',
  '王者高原',
  '王者巨灵',
  '王者祝福',
  '樊哙',
  '程咬金',
  '王昭君',
  '李广',
  '荆轲',
];

// 运行时动态拼装正则，避免本文件自身命中仓库秘密扫描
const SECRET_PATTERNS = [
  new RegExp(['ali', 'yun-api', 'key'].join(''), 'i'),
  new RegExp(['cf', 'at_[A-Za-z0-9_-]{8,}'].join('')),
  new RegExp(['gh', 'p_[A-Za-z0-9]{16,}'].join('')),
  new RegExp(['github_', 'pat_[A-Za-z0-9_]{16,}'].join('')),
  new RegExp(['BEGIN ', 'OPENSSH PRIVATE ', 'KEY'].join('')),
  new RegExp(['101', '\\.47\\.'].join('')),
  new RegExp(['[A-Za-z]:\\\\', 'Users\\\\'].join('')),
  new RegExp(['/ho', 'me/', 'peter'].join('')),
];

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (['node_modules', 'dist', '.git', '.cache', 'shots', '__pycache__'].includes(ent.name)) continue;
      walkFiles(full, out);
    } else {
      out.push(full);
    }
  }
  return out;
}

function main() {
  const brandSrc = fs.readFileSync(path.join(ROOT, 'src/config/brand.ts'), 'utf8');
  const heroesSrc = fs.readFileSync(path.join(ROOT, 'src/config/heroes.ts'), 'utf8');
  const lobbySrc = fs.readFileSync(path.join(ROOT, 'src/ui/tangsongLobby.ts'), 'utf8');

  assert(brandSrc.includes("versionStamp: 'v5.1 · 唐宋荣耀'"), 'brand.ts versionStamp 必须为 v5.1 · 唐宋荣耀');
  assert(!lobbySrc.includes('v4.0') && !lobbySrc.includes('v5.0'), 'tangsongLobby.ts 不得残留旧版本文案');

  const requiredAssets = [...ART_FILES];
  for (const [heroId, assetId] of HERO_SPECS) {
    assert(heroesSrc.includes(`${heroId}: {`), `heroes.ts 缺少英雄配置: ${heroId}`);
    for (const kind of ['avatar', 'focus', 'portrait', 'selection']) {
      requiredAssets.push(`assets/heroes/portraits/${assetId}.${kind}.webp`);
    }
    requiredAssets.push(`assets/heroes/pc/${assetId}.pc.webp`);
    requiredAssets.push(`assets/heroes/eyes/${heroId}.eyes.webp`);
    for (const slot of ['passive', 's1', 's2', 'ult']) {
      requiredAssets.push(`assets/icons/skills/${heroId}-${slot}.webp`);
    }
  }
  for (const key of ['recall', 'heal', 'flash', 'attack']) {
    requiredAssets.push(`assets/icons/summoner/${key}.webp`);
  }
  for (const track of BGM_TRACKS) {
    requiredAssets.push(`assets/audio/bgm/${track}.ogg`, `assets/audio/bgm/${track}.mp3`);
  }

  for (const rel of requiredAssets) {
    const full = path.join(ROOT, 'public', rel);
    assert(fs.existsSync(full), `缺少必需运行时资产: public/${rel}`);
    const sz = fs.statSync(full).size;
    assert(sz > 0, `运行时资产为空文件: public/${rel}`);
  }

  assert(fs.existsSync(path.join(ROOT, 'src/engine/mobaCore.js')), '缺少 src/engine/mobaCore.js');

  const sourceFiles = walkFiles(path.join(ROOT, 'src')).filter((f) => /\.(ts|js|css)$/.test(f));
  sourceFiles.push(path.join(ROOT, 'index.html'));
  for (const file of sourceFiles) {
    const txt = fs.readFileSync(file, 'utf8');
    for (const term of FORBIDDEN_TERMS) {
      assert(!txt.includes(term), `${path.relative(ROOT, file)} 包含禁止残留文案 "${term}"`);
    }
  }

  const auditFiles = walkFiles(ROOT).filter((f) =>
    /\.(ts|tsx|js|mjs|cjs|py|sh|yml|yaml|json|md|css|html)$/i.test(f) && path.basename(f) !== 'package-lock.json',
  );
  for (const file of auditFiles) {
    const txt = fs.readFileSync(file, 'utf8');
    for (const re of SECRET_PATTERNS) {
      assert(!re.test(txt), `发现敏感模式 (${re}) 于 ${path.relative(ROOT, file)}`);
    }
  }

  console.log(
    `[verify-content] OK: 6 heroes, ${requiredAssets.length} assets, 0 legacy terms, 0 private patterns (${auditFiles.length} files audited)`,
  );
}

main();
