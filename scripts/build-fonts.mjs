#!/usr/bin/env node
/**
 * build-fonts.mjs — 下载（本地 .cache 缓存）SIL OFL 国风毛笔书法与古籍宋体，并按实际使用字集裁剪为轻量 .woff2。
 *
 * 产出（提交至仓库 / 随 dist/ 打包）：
 *   public/assets/fonts/tangsong-brush.woff2  (Ma Shan Zheng 毛笔书法)
 *   public/assets/fonts/tangsong-serif.woff2  (ZCOOL XiaoWei 古籍刻本)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const CACHE_DIR = path.join(PROJECT_ROOT, '.cache', 'fonts');
const OUT_DIR = path.join(PROJECT_ROOT, 'public', 'assets', 'fonts');
const MAX_WOFF2_BYTES = 900 * 1024;

const FONT_SPECS = [
  {
    cacheFile: 'MaShanZheng-Regular.ttf',
    outFile: 'tangsong-brush.woff2',
    url: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/mashanzheng/MaShanZheng-Regular.ttf',
    label: 'TangSongBrush (Ma Shan Zheng)',
  },
  {
    cacheFile: 'ZCOOLXiaoWei-Regular.ttf',
    outFile: 'tangsong-serif.woff2',
    url: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/zcoolxiaowei/ZCOOLXiaoWei-Regular.ttf',
    label: 'TangSongSerif (ZCOOL XiaoWei)',
  },
];

const CORE_CHARS = [
  // ASCII 可打印字符
  ...Array.from({ length: 0x7f - 0x20 }, (_, i) => String.fromCharCode(0x20 + i)),
  '，', '。', '！', '？', '、', '；', '：', '“', '”', '‘', '’', '（', '）', '【', '】', '《', '》', '—', '…', '·', '「', '」', '『', '』',
  '唐', '宋', '荣', '耀', '汴', '京', '演', '武', '长', '安', '金', '秋',
  '苏', '轼', '辛', '弃', '疾', '花', '蕊', '夫', '人', '文', '成', '公', '主', '秦', '琼', '刘', '娥',
  '第', '一', '滴', '血', '双', '杀', '三', '连', '破', '阵', '四', '海', '惊', '雷', '五', '名', '垂', '青', '史',
  '势', '如', '竹', '锐', '不', '可', '当', '千', '古', '风', '流', '终', '结', '胜', '敌', '军', '全', '灭',
  '大', '获', '败', '走', '沙', '场', '升', '级', '暴', '击', '眩', '晕', '沉', '默', '飞', '减', '速', '护', '盾',
  '亡', '复', '活', '回', '城', '疗', '伤', '闪', '现', '普', '攻', '爆', '发', '控', '制', '位', '移', '招',
  '商', '店', '战', '况', '暂', '停', '设', '置', '画', '质', '镜', '头', '视', '角', '屏', '显', '示', '特', '写', '切',
  '开', '始', '对', '立', '绘', '青', '玉', '方', '朱', '红', '我', '玺', '箭', '楼', '小', '兵', '野', '怪',
  '镇', '岳', '神', '兽', '河', '苍', '龙', '渊', '蛟', '鸾', '玄', '鹿', '赤', '炎', '狻', '猊', '苔', '灵', '萤', '火', '蝶',
].join('');

function walkFiles(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walkFiles(full, exts, out);
    } else if (exts.some((ext) => ent.name.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

function collectCharSet() {
  const chars = new Set();
  const addText = (txt) => {
    for (const ch of txt) {
      const cp = ch.codePointAt(0);
      if (cp !== undefined && cp >= 0x20 && cp !== 0x7f) {
        chars.add(ch);
      }
    }
  };

  addText(CORE_CHARS);

  const indexHtml = path.join(PROJECT_ROOT, 'index.html');
  if (fs.existsSync(indexHtml)) addText(fs.readFileSync(indexHtml, 'utf8'));

  const srcFiles = walkFiles(path.join(PROJECT_ROOT, 'src'), ['.ts', '.css']);
  for (const f of srcFiles) {
    addText(fs.readFileSync(f, 'utf8'));
  }

  const mobaCorePath = path.join(PROJECT_ROOT, 'src', 'engine', 'mobaCore.js');
  if (fs.existsSync(mobaCorePath)) {
    addText(fs.readFileSync(mobaCorePath, 'utf8'));
  } else {
    const wzryHtml = path.resolve(PROJECT_ROOT, '..', 'wzry.html');
    if (fs.existsSync(wzryHtml)) {
      const raw = fs.readFileSync(wzryHtml, 'utf8');
      // 提取中文文案字符以控制全量汉字覆盖且不引入二进制噪声
      const cjkMatches = raw.match(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]+/g);
      if (cjkMatches) addText(cjkMatches.join(''));
    }
  }

  return Array.from(chars).join('');
}

async function ensureCachedFont(spec) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const cachePath = path.join(CACHE_DIR, spec.cacheFile);
  if (fs.existsSync(cachePath) && fs.statSync(cachePath).size > 500_000) {
    return fs.readFileSync(cachePath);
  }
  console.log(`[build-fonts] 下载源字体 ${spec.cacheFile} -> .cache/fonts/ ...`);
  const res = await fetch(spec.url, {
    headers: { 'User-Agent': 'tangsong-glory-build-fonts/1.0' },
  });
  if (!res.ok) {
    throw new Error(`[build-fonts] 下载失败 ${spec.url}: HTTP ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 500_000) {
    throw new Error(`[build-fonts] 字体体积异常过小 (${buf.length} B): ${spec.url}`);
  }
  fs.writeFileSync(cachePath, buf);
  return buf;
}

async function main() {
  const text = collectCharSet();
  const cjkCount = Array.from(text).filter((c) => c.codePointAt(0) >= 0x3000).length;
  console.log(`[build-fonts] 采集唯一字符 ${text.length} 个（其中中文/标点 ${cjkCount} 字）`);

  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const spec of FONT_SPECS) {
    const ttfBuf = await ensureCachedFont(spec);
    const woff2 = await subsetFont(ttfBuf, text, { targetFormat: 'woff2' });
    if (!woff2 || woff2.length === 0 || woff2.length > MAX_WOFF2_BYTES) {
      throw new Error(
        `[build-fonts] ${spec.outFile} 裁剪体积越界 (${woff2?.length ?? 0} B，上限 ${MAX_WOFF2_BYTES} B)`,
      );
    }
    const outPath = path.join(OUT_DIR, spec.outFile);
    fs.writeFileSync(outPath, woff2);
    console.log(
      `[build-fonts] OK -> ${path.relative(PROJECT_ROOT, outPath)} (${(woff2.length / 1024).toFixed(1)} KB) [${spec.label}]`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
