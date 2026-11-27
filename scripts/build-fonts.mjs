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
    repairs: [[0x56de, repairXiaoWeiHui]],
  },
];

/**
 * 上游 ZCOOL XiaoWei 的「回」(U+56DE) 字形有缺陷：外框的内白与外轮廓同向，里面的小「口」又缺了内白，
 * 非零环绕填充下整个字是一块实心方块（结算页「返回主菜单」、按键提示「回城」）。
 * 这里只修这一个字：把外框内白反向，并给小「口」补一个内白矩形（横画粗细取外框横画的 28/32）。
 * 字形与预期不符（上游已修或改版）时直接抛错，不做静默的半修复。
 */
function repairXiaoWeiHui(glyph) {
  const { contours } = glyph;
  const sameRect = (c, pts) => c.length === pts.length && c.every((pt, i) => pt.x === pts[i][0] && pt.y === pts[i][1]);
  const box = (c) => [
    Math.min(...c.map((pt) => pt.x)),
    Math.min(...c.map((pt) => pt.y)),
    Math.max(...c.map((pt) => pt.x)),
    Math.max(...c.map((pt) => pt.y)),
  ];
  const expected =
    contours.length === 3 &&
    contours[0].length === 32 &&
    contours[1].length === 31 &&
    sameRect(contours[2], [[770, 92], [248, 92], [248, 686], [770, 686]]) &&
    box(contours[1]).join(',') === '358,220,664,558';
  if (!expected) {
    throw new Error('[build-fonts] ZCOOL XiaoWei「回」字形与已知缺陷版本不符，请人工核对后更新 repairXiaoWeiHui');
  }
  contours[2].reverse();
  const on = (x, y) => ({ x, y, on: true });
  contours.push([on(434, 292), on(586, 292), on(586, 516), on(434, 516)]);
}

// ── 最小 TrueType 字形修补器：只支持简单字形（非复合），修补后丢弃该字形的 hint 指令 ──
function readTables(buf) {
  const numTables = buf.readUInt16BE(4);
  const tables = [];
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    const offset = buf.readUInt32BE(rec + 8);
    const length = buf.readUInt32BE(rec + 12);
    tables.push({ tag: buf.toString('latin1', rec, rec + 4), data: buf.subarray(offset, offset + length), offset });
  }
  return tables;
}

function glyphIdFor(cmap, codePoint) {
  const numSub = cmap.readUInt16BE(2);
  for (let i = 0; i < numSub; i++) {
    const sub = cmap.readUInt32BE(4 + i * 8 + 4);
    const format = cmap.readUInt16BE(sub);
    if (format === 12) {
      const groups = cmap.readUInt32BE(sub + 12);
      for (let g = 0; g < groups; g++) {
        const at = sub + 16 + g * 12;
        const start = cmap.readUInt32BE(at);
        const end = cmap.readUInt32BE(at + 4);
        if (codePoint >= start && codePoint <= end) return cmap.readUInt32BE(at + 8) + (codePoint - start);
      }
    } else if (format === 4 && codePoint <= 0xffff) {
      const segX2 = cmap.readUInt16BE(sub + 6);
      const endAt = sub + 14;
      const startAt = endAt + segX2 + 2;
      const deltaAt = startAt + segX2;
      const rangeAt = deltaAt + segX2;
      for (let seg = 0; seg < segX2; seg += 2) {
        const end = cmap.readUInt16BE(endAt + seg);
        const start = cmap.readUInt16BE(startAt + seg);
        if (codePoint < start || codePoint > end) continue;
        const delta = cmap.readInt16BE(deltaAt + seg);
        const rangeOffset = cmap.readUInt16BE(rangeAt + seg);
        if (rangeOffset === 0) return (codePoint + delta) & 0xffff;
        const gid = cmap.readUInt16BE(rangeAt + seg + rangeOffset + (codePoint - start) * 2);
        return gid === 0 ? 0 : (gid + delta) & 0xffff;
      }
    }
  }
  return 0;
}

function decodeSimpleGlyph(data) {
  const numContours = data.readInt16BE(0);
  if (numContours < 0) throw new Error('[build-fonts] 字形修补器不支持复合字形');
  let at = 10;
  const ends = [];
  for (let i = 0; i < numContours; i++, at += 2) ends.push(data.readUInt16BE(at));
  at += 2 + data.readUInt16BE(at);
  const total = numContours ? ends[numContours - 1] + 1 : 0;
  const flags = [];
  while (flags.length < total) {
    const flag = data[at++];
    flags.push(flag);
    if (flag & 8) for (let n = data[at++]; n > 0; n--) flags.push(flag);
  }
  const axis = (shortBit, sameBit) => {
    const out = [];
    let value = 0;
    for (const flag of flags) {
      if (flag & shortBit) value += flag & sameBit ? data[at++] : -data[at++];
      else if (!(flag & sameBit)) {
        value += data.readInt16BE(at);
        at += 2;
      }
      out.push(value);
    }
    return out;
  };
  const xs = axis(2, 16);
  const ys = axis(4, 32);
  const contours = [];
  let start = 0;
  for (const end of ends) {
    const contour = [];
    for (let i = start; i <= end; i++) contour.push({ x: xs[i], y: ys[i], on: (flags[i] & 1) === 1 });
    contours.push(contour);
    start = end + 1;
  }
  return { contours };
}

function encodeSimpleGlyph({ contours }) {
  const points = contours.flat();
  const head = Buffer.alloc(10 + contours.length * 2 + 2);
  head.writeInt16BE(contours.length, 0);
  head.writeInt16BE(Math.min(...points.map((pt) => pt.x)), 2);
  head.writeInt16BE(Math.min(...points.map((pt) => pt.y)), 4);
  head.writeInt16BE(Math.max(...points.map((pt) => pt.x)), 6);
  head.writeInt16BE(Math.max(...points.map((pt) => pt.y)), 8);
  let end = -1;
  contours.forEach((contour, i) => {
    end += contour.length;
    head.writeUInt16BE(end, 10 + i * 2);
  });
  const flags = [];
  const xBytes = [];
  const yBytes = [];
  const pushDelta = (delta, bytes, shortBit, sameBit) => {
    if (delta === 0) return sameBit;
    if (Math.abs(delta) < 256) {
      bytes.push(Math.abs(delta));
      return shortBit | (delta > 0 ? sameBit : 0);
    }
    bytes.push((delta >> 8) & 0xff, delta & 0xff);
    return 0;
  };
  let px = 0;
  let py = 0;
  for (const pt of points) {
    flags.push((pt.on ? 1 : 0) | pushDelta(pt.x - px, xBytes, 2, 16) | pushDelta(pt.y - py, yBytes, 4, 32));
    px = pt.x;
    py = pt.y;
  }
  const body = Buffer.from([...flags, ...xBytes, ...yBytes]);
  const raw = Buffer.concat([head, body]);
  return Buffer.concat([raw, Buffer.alloc((4 - (raw.length % 4)) % 4)]);
}

function tableChecksum(data) {
  let sum = 0;
  for (let i = 0; i + 4 <= data.length; i += 4) sum = (sum + data.readUInt32BE(i)) >>> 0;
  return sum;
}

function repairGlyphs(ttf, repairs) {
  const tables = readTables(ttf);
  const table = (tag) => {
    const found = tables.find((t) => t.tag === tag);
    if (!found) throw new Error('[build-fonts] 源字体缺少表 ' + tag);
    return found;
  };
  const longLoca = table('head').data.readInt16BE(50) === 1;
  const numGlyphs = table('maxp').data.readUInt16BE(4);
  const loca = table('loca').data;
  const glyf = table('glyf').data;
  const offsetOf = (gid) => (longLoca ? loca.readUInt32BE(gid * 4) : loca.readUInt16BE(gid * 2) * 2);
  const patched = new Map();
  for (const [codePoint, repair] of repairs) {
    const gid = glyphIdFor(table('cmap').data, codePoint);
    if (!gid) throw new Error('[build-fonts] 源字体里找不到待修补的字 U+' + codePoint.toString(16));
    const glyph = decodeSimpleGlyph(glyf.subarray(offsetOf(gid), offsetOf(gid + 1)));
    repair(glyph);
    patched.set(gid, encodeSimpleGlyph(glyph));
  }
  const parts = [];
  const newLoca = Buffer.alloc(longLoca ? (numGlyphs + 1) * 4 : (numGlyphs + 1) * 2);
  let cursor = 0;
  for (let gid = 0; gid <= numGlyphs; gid++) {
    if (longLoca) newLoca.writeUInt32BE(cursor, gid * 4);
    else newLoca.writeUInt16BE(cursor / 2, gid * 2);
    if (gid === numGlyphs) break;
    const data = patched.get(gid) ?? glyf.subarray(offsetOf(gid), offsetOf(gid + 1));
    parts.push(data);
    cursor += data.length;
    if (cursor % 2) {
      parts.push(Buffer.alloc(1));
      cursor++;
    }
  }
  table('glyf').data = Buffer.concat(parts);
  table('loca').data = newLoca;

  const ordered = [...tables].sort((a, b) => a.offset - b.offset);
  const header = Buffer.from(ttf.subarray(0, 12 + tables.length * 16));
  const chunks = [header];
  let offset = header.length;
  const placed = new Map();
  for (const t of ordered) {
    const padded = Buffer.concat([t.data, Buffer.alloc((4 - (t.data.length % 4)) % 4)]);
    if (t.tag === 'head') padded.writeUInt32BE(0, 8);
    placed.set(t.tag, { offset, length: t.data.length, checksum: tableChecksum(padded) });
    chunks.push(padded);
    offset += padded.length;
  }
  tables.forEach((t, i) => {
    const info = placed.get(t.tag);
    header.writeUInt32BE(info.checksum, 12 + i * 16 + 4);
    header.writeUInt32BE(info.offset, 12 + i * 16 + 8);
    header.writeUInt32BE(info.length, 12 + i * 16 + 12);
  });
  const out = Buffer.concat(chunks);
  out.writeUInt32BE((0xb1b0afba - tableChecksum(out)) >>> 0, placed.get('head').offset + 8);
  return out;
}

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
  // 朱印落款用字：胜利「大捷」、失败墨印「再战」、击杀小印「斩」
  '大', '捷', '再', '战', '斩',
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
    const source = await ensureCachedFont(spec);
    const ttfBuf = spec.repairs ? repairGlyphs(source, spec.repairs) : source;
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
