#!/usr/bin/env node
/**
 * verify.mjs — 《唐宋荣耀》v5.0 全链路自动化验收台（本地 + GitHub Actions CI 通用）
 *
 * 校验项：
 * 1. 构建产物 dist/（含 build-info.json）旧品牌与旧英雄名零残留断言；若存在只读母本则核验其 MD5 未被篡改
 * 2. 6 位唐宋英雄核心数值与原版 5 内核基线（母本或仓内 kitBaselines）100% 零偏差深比对
 * 3. 唐宋主视觉 .webp / 毛笔书法字体 .woff2 / 6 英雄独立 3D 模型与伴生灵宠 / 6 山海野怪 / 4 国风小兵 / 24 独立技能 SVG / 纯程序化 WebAudio 校验
 * 4. 全场景视觉验收截图输出至 VERIFY_SHOT_DIR 或 shots/
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const WORKSPACE_ROOT = path.resolve(PROJECT_ROOT, '..');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
const WZRY_HTML = process.env.MOBA_MOTHER_HTML
  ? path.resolve(process.env.MOBA_MOTHER_HTML)
  : path.join(WORKSPACE_ROOT, 'wzry.html');
const HAS_MOTHER_HTML = fs.existsSync(WZRY_HTML);
const EXPECTED_WZRY_MD5 = '5CCA29C298847897318BDE23EBF89506';
const SHOT_DIR = process.env.VERIFY_SHOT_DIR
  ? path.resolve(process.env.VERIFY_SHOT_DIR)
  : path.join(PROJECT_ROOT, 'shots');

const HERO_IDS = ['qinqiong', 'xinqiji', 'sushi', 'wencheng', 'huarui', 'liue'];
const KIT_MAP = {
  qinqiong: 'panyue',
  xinqiji: 'yeque',
  sushi: 'xingli',
  wencheng: 'fengling',
  huarui: 'chijin',
  liue: 'xingli',
};
const FORBIDDEN_TEXT = [
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

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function findBrowser() {
  const candidates = [
    process.env.SMOKE_CHROMIUM_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean);
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('未找到 Chrome、Chromium 或 Edge 可执行文件，请设置 SMOKE_CHROMIUM_EXECUTABLE_PATH 或 CHROME_PATH');
}

function md5File(filePath) {
  return crypto.createHash('md5').update(fs.readFileSync(filePath)).digest('hex').toUpperCase();
}

function walkFiles(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkFiles(full));
    else out.push(full);
  }
  return out;
}

function extractWzryBaselineHeroes() {
  if (!HAS_MOTHER_HTML) return null;
  const html = fs.readFileSync(WZRY_HTML, 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  const main = scripts[1][2];
  const s = main.indexOf('Se={panyue:');
  const e = main.indexOf('};function z0(', s);
  assert(s > 0 && e > s, '无法从 wzry.html 提取原版 Se 英雄表');
  const Ry = Math.PI / 180;
  return new Function('Ry', `return (${main.slice(s + 3, e + 1)});`)(Ry);
}

function checkMotherAndBundle() {
  let motherTag = 'standalone-clone';
  if (HAS_MOTHER_HTML) {
    const actualMd5 = md5File(WZRY_HTML);
    assert.equal(
      actualMd5,
      EXPECTED_WZRY_MD5,
      `wzry.html MD5 发生变更! expected=${EXPECTED_WZRY_MD5}, actual=${actualMd5}`,
    );
    motherTag = `wzry.html MD5 ${actualMd5}`;
  }
  assert(fs.existsSync(DIST_DIR), 'dist/ 不存在，请先运行 npm run build');
  const buildInfoPath = path.join(DIST_DIR, 'build-info.json');
  assert(fs.existsSync(buildInfoPath), 'dist/build-info.json 缺失');
  const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, 'utf8'));
  assert.equal(buildInfo.version, 'v5.1', `dist/build-info.json version 应为 v5.1，实际 ${buildInfo.version}`);

  const textFiles = walkFiles(DIST_DIR).filter((f) => /\.(html|js|css)$/i.test(f));
  assert(textFiles.length >= 3, 'dist/ 缺少构建产物');

  for (const file of textFiles) {
    const content = fs.readFileSync(file, 'utf8');
    for (const term of FORBIDDEN_TEXT) {
      assert(
        !content.includes(term),
        `产物 ${path.relative(PROJECT_ROOT, file)} 发现残余旧文案: "${term}"`,
      );
    }
  }
  console.log(`[1/4] ${motherTag} 校验通过，build-info (${buildInfo.version}) 就绪，dist/ (${textFiles.length} 文件) 0 旧文案残留`);
  return buildInfo;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function startStaticServer(rootDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
      const full = path.resolve(rootDir, rel);
      if (!full.startsWith(rootDir)) {
        res.writeHead(403).end('Forbidden');
        return;
      }
      if (!fs.existsSync(full) || fs.statSync(full).isDirectory()) {
        res.writeHead(404).end('Not Found');
        return;
      }
      const ext = path.extname(full).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(full).pipe(res);
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${addr.port}` });
    });
  });
}

function pickMechanicalFields(def) {
  return {
    attackType: def.attackType,
    radius: def.radius,
    role: def.role,
    roleName: def.roleName,
    lane: def.lane,
    difficulty: def.difficulty,
    base: def.base,
    growth: def.growth,
    basicAttack: def.basicAttack,
    passiveValues: def.passive.values,
    skills: {
      s1: {
        slot: def.skills.s1.slot,
        maxLevel: def.skills.s1.maxLevel,
        cooldown: def.skills.s1.cooldown,
        manaCost: def.skills.s1.manaCost,
        cast: def.skills.s1.cast,
        values: def.skills.s1.values,
        castTime: def.skills.s1.castTime,
      },
      s2: {
        slot: def.skills.s2.slot,
        maxLevel: def.skills.s2.maxLevel,
        cooldown: def.skills.s2.cooldown,
        manaCost: def.skills.s2.manaCost,
        cast: def.skills.s2.cast,
        values: def.skills.s2.values,
        castTime: def.skills.s2.castTime,
      },
      ult: {
        slot: def.skills.ult.slot,
        maxLevel: def.skills.ult.maxLevel,
        cooldown: def.skills.ult.cooldown,
        manaCost: def.skills.ult.manaCost,
        cast: def.skills.ult.cast,
        values: def.skills.ult.values,
        castTime: def.skills.ult.castTime,
      },
    },
    build: def.build,
  };
}

function attachTrackers(page) {
  const errors = [];
  const badHttp = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  page.on('response', (res) => {
    if (res.status() >= 400) badHttp.push(`${res.status()} ${res.url()}`);
  });
  return { errors, badHttp };
}

async function waitForCondition(page, predicate, timeoutMs = 45_000) {
  await page.waitForFunction(predicate, { timeout: timeoutMs, polling: 100 });
}

async function run() {
  checkMotherAndBundle();
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const wzrySe = extractWzryBaselineHeroes();
  const { server, baseUrl } = await startStaticServer(DIST_DIR);

  const browser = await puppeteer.launch({
    executablePath: findBrowser(),
    headless: 'new',
    args: [
      '--enable-unsafe-swiftshader',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--autoplay-policy=no-user-gesture-required',
    ],
    defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
  });

  try {
    const page = await browser.newPage();
    const { errors, badHttp } = attachTrackers(page);

    // ── 2. 大厅、新国风资源 HTTP 200、音频切换、数值零偏差与 6 英雄 3D 演武 ──
    await page.goto(`${baseUrl}/`, { waitUntil: 'load', timeout: 60_000 });
    await waitForCondition(page, () => !!window.__moba && window.__moba.phase === 'menu');
    // 模拟点击以解锁 WebAudio 并等待程序化乐曲首拍调度生效后再做状态采样
    await page.mouse.click(10, 10);
    await waitForCondition(
      page,
      () => {
        const s = window.__moba?.audio?.debug?.stats?.();
        return !!s && s.state === 'running' && s.notes > 0;
      },
      15_000,
    );
    await wait(250);

    const lobbyChecks = await page.evaluate(async () => {
      const moba = window.__moba;
      if (document.fonts?.load) {
        await document.fonts.load('16px TangSongBrush', '唐');
        await document.fonts.load('16px TangSongSerif', '唐');
        await document.fonts.ready;
      }
      const urls = [
        '/assets/art/lobby-scroll.webp',
        '/assets/art/select-pavilion.webp',
        '/assets/art/lobby-bg.webp',
        '/assets/art/select-bg.webp',
        '/assets/art/loading-bg.webp',
        '/assets/art/victory-bg.webp',
        '/assets/art/defeat-bg.webp',
        '/assets/ui/xuan-paper.svg',
        '/assets/ui/coin-handdrawn.webp',
        '/assets/fonts/tangsong-brush.woff2',
        '/assets/fonts/tangsong-serif.woff2',
        '/assets/fonts/tangsongpai-score-numbers.woff',
        ...['qinqiong', 'xinqiji', 'sushi', 'wencheng', 'huarui', 'liue'].flatMap((h) =>
          ['passive', 's1', 's2', 'ult'].map((s) => `/assets/icons/skills/${h}-${s}.webp`),
        ),
        ...['recall', 'heal', 'flash', 'attack'].map((k) => `/assets/icons/summoner/${k}.webp`),
      ];
      const fetched = {};
      for (const u of urls) {
        const r = await fetch(u);
        const buf = await r.arrayBuffer();
        fetched[u] = { status: r.status, bytes: buf.byteLength };
      }

      // 全 6 位唐宋名士 3D 模型与伴生灵宠骨骼、6 大山海唐宋野怪、4 类国风小兵与独立技能图标断言
      const heroModels = {};
      for (const id of ['qinqiong', 'xinqiji', 'sushi', 'wencheng', 'huarui', 'liue']) {
        const md = moba.modelRegistry[`hero:${id}`]();
        heroModels[id] = {
          triangles: md.triangles,
          hasPet: !!md.rig?.names?.includes('petRoot'),
        };
      }
      const monsterTriangles = {};
      for (const mId of ['mossback', 'glimwing', 'frost_golem', 'ember_golem', 'abyss_drake', 'star_colossus']) {
        monsterTriangles[mId] = moba.modelRegistry[`monster:${mId}`]().triangles;
      }
      const sushiTri = heroModels.sushi.triangles;
      const liueTri = heroModels.liue.triangles;
      const towerTri = moba.modelRegistry['tower:2:0']().triangles;
      const coreTri = moba.modelRegistry['core:0']().triangles;
      const minionTriangles = {
        melee: moba.modelRegistry['minion:melee']().triangles,
        ranged: moba.modelRegistry['minion:ranged']().triangles,
        siege: moba.modelRegistry['minion:siege']().triangles,
        super: moba.modelRegistry['minion:super']().triangles,
      };
      const lobbyRootOk = !!document.querySelector('.ts-lobby');
      const deckCardCount = document.querySelectorAll('.ts-lobby__card').length;
      const sushiUltIcon = moba.skillIcon('sushi', 'ult');
      const liueUltIcon = moba.skillIcon('liue', 'ult');
      const logoEl = document.querySelector('.sf-logo__name');
      const logoFont = logoEl ? getComputedStyle(logoEl).fontFamily : '';
      const brushLoaded = !!document.fonts?.check('16px TangSongBrush', '唐');
      const serifLoaded = !!document.fonts?.check('16px TangSongSerif', '唐');

      moba.audio.ui('select');
      const audioStats = moba.audio.debug.stats();
      const proceduralAudioInfo = moba.audio.mixer?.__tsAudioDebug?.() ?? null;

      return {
        title: document.title,
        ver: document.getElementById('sf-ver')?.textContent || '',
        bodyText: document.body.innerText,
        heroTable: moba.heroTable,
        kitBaselines: moba.kitBaselines,
        defaultPreset: moba.getCameraPreset(),
        fetched,
        heroModels,
        monsterTriangles,
        sushiTri,
        liueTri,
        towerTri,
        coreTri,
        minionTriangles,
        lobbyRootOk,
        deckCardCount,
        sushiUltIconLen: sushiUltIcon.length,
        liueUltIconLen: liueUltIcon.length,
        iconsDiffer: sushiUltIcon !== liueUltIcon,
        logoFont,
        brushLoaded,
        serifLoaded,
        audioStats,
        proceduralAudioInfo,
      };
    });

    assert.equal(lobbyChecks.title, '唐宋荣耀');
    assert(lobbyChecks.ver.includes('v5.1'), `版本戳未升级 v5.1: ${lobbyChecks.ver}`);
    assert.equal(lobbyChecks.lobbyRootOk, true, '新版唐宋手卷开场大厅 .ts-lobby 未挂载');
    assert.equal(lobbyChecks.deckCardCount, 4, `大厅右侧宣纸名士画卷应为 4 张，实际 ${lobbyChecks.deckCardCount}`);
    for (const [hId, hInfo] of Object.entries(lobbyChecks.heroModels)) {
      assert(hInfo.triangles > 400, `英雄 3D 模型 hero:${hId} 三角面异常过少: ${hInfo.triangles}`);
      assert.equal(hInfo.hasPet, true, `英雄 hero:${hId} 缺少伴生灵宠骨骼 petRoot`);
    }
    for (const [monId, monTri] of Object.entries(lobbyChecks.monsterTriangles)) {
      assert(monTri > 350, `野怪 3D 模型 monster:${monId} 三角面异常过少: ${monTri}`);
    }
    for (const [mType, mTri] of Object.entries(lobbyChecks.minionTriangles)) {
      assert(mTri > 200, `小兵 3D 模型 minion:${mType} 三角面异常过少: ${mTri}`);
    }
    assert.equal(lobbyChecks.brushLoaded, true, '毛笔书法字体 TangSongBrush 未加载完成');
    assert.equal(lobbyChecks.serifLoaded, true, '古籍刊本字体 TangSongSerif 未加载完成');
    assert(
      lobbyChecks.logoFont.includes('TangSongBrush'),
      `.sf-logo__name 未使用毛笔书法字体 TangSongBrush: ${lobbyChecks.logoFont}`,
    );
    assert.equal(lobbyChecks.defaultPreset, 'standard');
    assert.notEqual(lobbyChecks.sushiTri, lobbyChecks.liueTri, '苏轼与刘娥 3D 模型三角形数必须不同！');
    assert.equal(lobbyChecks.iconsDiffer, true, '苏轼与刘娥技能图标必须完全独立！');
    assert.equal(lobbyChecks.audioStats.track, 'menu', `大厅 BGM track 应为 menu，实际 ${lobbyChecks.audioStats.track}`);
    assert(
      lobbyChecks.audioStats.notes > 0 && lobbyChecks.audioStats.played > 0,
      `纯程序化唐宋 WebAudio 大厅演奏异常: ${JSON.stringify(lobbyChecks.audioStats)}`,
    );
    assert.equal(
      lobbyChecks.proceduralAudioInfo?.mode,
      'procedural-tangsong',
      `r1 SFX 未切换纯程序化唐宋音色: ${JSON.stringify(lobbyChecks.proceduralAudioInfo)}`,
    );
    assert.equal(
      lobbyChecks.proceduralAudioInfo?.unpatchedCount,
      0,
      `存在未覆写的旧作 r1 SFX: ${JSON.stringify(lobbyChecks.proceduralAudioInfo)}`,
    );
    assert(
      (lobbyChecks.proceduralAudioInfo?.patchedSfxCount ?? 0) >= 154,
      `覆写 r1 SFX 数量异常偏少: ${JSON.stringify(lobbyChecks.proceduralAudioInfo)}`,
    );
    for (const [u, info] of Object.entries(lobbyChecks.fetched)) {
      assert.equal(info.status, 200, `资源 ${u} HTTP 状态异常: ${info.status}`);
      assert(info.bytes > (u.startsWith('/assets/icons/') ? 500 : 100), `资源 ${u} 字节异常偏小: ${info.bytes}`);
    }
    for (const term of FORBIDDEN_TEXT) {
      assert(!lobbyChecks.bodyText.includes(term), `大厅 DOM 出现旧文案: ${term}`);
    }
    const baselineSe = wzrySe ?? lobbyChecks.kitBaselines;
    assert(baselineSe, '缺少英雄技能机制基线');
    for (const heroId of HERO_IDS) {
      const runtimeHero = lobbyChecks.heroTable[heroId];
      assert(runtimeHero, `运行时 heroTable 缺少英雄: ${heroId}`);
      assert.deepStrictEqual(
        pickMechanicalFields(runtimeHero),
        pickMechanicalFields(baselineSe[KIT_MAP[heroId]]),
        `${heroId} 核心数值与 ${KIT_MAP[heroId]} 存在偏差`,
      );
    }
    console.log(
      `[2/4] 6 英雄 0 偏差 + 全6英雄伴生灵宠(${HERO_IDS.map((id) => `${id}:${lobbyChecks.heroModels[id].triangles}`).join(',')}) + 6野怪(${JSON.stringify(lobbyChecks.monsterTriangles)}) + 程序化音轨(${lobbyChecks.audioStats.track}, notes=${lobbyChecks.audioStats.notes}, played=${lobbyChecks.audioStats.played}, sfx=${lobbyChecks.proceduralAudioInfo?.patchedSfxCount}) 就绪`,
    );

    await page.screenshot({ path: path.join(SHOT_DIR, 'v2_01_lobby_1280x720.png') });

    // 竖屏手机 390x844 下检验手卷大厅响应式布局不重叠/不横向溢出
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await wait(350);
    const portraitLobbyCheck = await page.evaluate(() => ({
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      startRect: document.querySelector('.ts-btn-seal')?.getBoundingClientRect()?.toJSON() ?? null,
    }));
    assert(
      portraitLobbyCheck.overflowX <= 2,
      `竖屏大厅存在横向溢出: ${portraitLobbyCheck.overflowX}px`,
    );
    await page.screenshot({ path: path.join(SHOT_DIR, 'v4_lobby_portrait_390x844.png') });
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
    await wait(250);

    // 验证大厅设置面板含「全屏显示」「大招特写切镜」开关与「预览」按钮且预览可真实弹出眼神切镜
    await page.evaluate(() => {
      const sBtn = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('设置'));
      if (!sBtn) throw new Error('大厅找不到设置按钮');
      sBtn.click();
    });
    await wait(350);
    await page.screenshot({ path: path.join(SHOT_DIR, 'v4_settings_dialog_1280x720.png') });
    const settingsCheck = await page.evaluate(() => {
      const dlg = document.querySelector('.sf-dialog--settings');
      if (!dlg) throw new Error('未打开设置面板');
      const txt = dlg.textContent || '';
      const previewBtn = [...dlg.querySelectorAll('button')].find((b) => b.textContent?.includes('预览'));
      previewBtn?.click();
      return {
        hasFullscreen: txt.includes('全屏显示'),
        hasEyesToggle: txt.includes('大招特写切镜'),
        hasPreview: !!previewBtn,
      };
    });
    assert.equal(settingsCheck.hasFullscreen, true, '设置面板缺少「全屏显示」开关');
    assert.equal(settingsCheck.hasEyesToggle, true, '设置面板缺少「大招特写切镜」开关');
    assert.equal(settingsCheck.hasPreview, true, '设置面板缺少「预览」按钮');
    await waitForCondition(page, () => !!document.querySelector('.ts-eyes-cutin__img'), 5_000);
    await page.evaluate(() => {
      document.querySelector('.ts-eyes-cutin')?.remove();
      const doneBtn = [...document.querySelectorAll('.sf-dialog--settings button')].find((b) =>
        b.textContent?.includes('完成'),
      );
      doneBtn?.click();
    });
    await wait(250);

    // 进入选将殿堂
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('开始对战'));
      if (!btn) throw new Error('找不到开始对战按钮');
      btn.click();
    });
    await waitForCondition(page, () => document.querySelectorAll('.sf-hcard').length === 6);
    await wait(900);
    await page.screenshot({ path: path.join(SHOT_DIR, 'v2_02_select_sushi_pc_1280x720.png') });

    // 切至 3D 演武模式并依次截取 6 大唐宋名士 3D 特写！
    await page.evaluate(() => {
      const b3d = [...document.querySelectorAll('.ts-stage-toggle button')].find((b) =>
        b.textContent?.includes('3D'),
      );
      b3d?.click();
    });
    await wait(600);

    for (const heroId of HERO_IDS) {
      await page.evaluate((id) => {
        document.querySelector(`.sf-hcard[data-hero="${id}"]`)?.click();
      }, heroId);
      await wait(750);
      await page.screenshot({ path: path.join(SHOT_DIR, `v2_select_3d_${heroId}.png`) });
    }

    // 竖屏手机 390x844 选将殿截图
    await page.setViewport({
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await waitForCondition(page, () => !!window.__moba?.phase, 30_000);
    const cardCountPortrait = await page.evaluate(() => document.querySelectorAll('.sf-hcard').length);
    if (cardCountPortrait !== 6) {
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('开始对战'));
        btn?.click();
      });
      await waitForCondition(page, () => document.querySelectorAll('.sf-hcard').length === 6, 30_000);
      await wait(700);
    }
    await page.screenshot({ path: path.join(SHOT_DIR, 'v2_13_mobile_select_390x844.png') });

    // ── 3. 6 英雄全通进局 + 局内基地/中路塔/BGM切换/eyes切镜截图 ──
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
    const matchReports = [];

    for (const heroId of HERO_IDS) {
      await page.goto(`${baseUrl}/?skipmenu=1&hero=${heroId}&seed=2026&tutorial=0`, {
        waitUntil: 'load',
        timeout: 60_000,
      });
      await waitForCondition(
        page,
        () => window.__moba?.phase === 'match' && (window.__moba?.state?.heroes?.length || 0) === 10,
        60_000,
      );
      await page.mouse.click(10, 10);
      await wait(700);

      if (heroId === 'sushi') {
        // 先截蓝方基地（圜丘社稷玉玺坛 + 四隅华表 + 朱漆匾额比分牌 + 古风舆图小地图）
        await page.evaluate(() => {
          const moba = window.__moba;
          moba.renderer.snapCamera();
          moba.renderer.render(moba.state, 1, 0.016);
        });
        await wait(250);
        await page.screenshot({ path: path.join(SHOT_DIR, 'v2_09_match_base_core_1280x720.png') });

        // 将苏轼移至中路一塔附近并推进模拟，检阅唐宋重檐箭楼 + 小兵 + 青石条板御道！
        await page.evaluate(() => {
          const moba = window.__moba;
          const { world, state, renderer } = moba;
          const me = state.heroes.find((h) => h.id === state.playerId);
          const outerTower = state.units.find(
            (u) => u.kind === 'tower' && u.team === 0 && Math.hypot(u.pos.x, u.pos.y) < 35,
          );
          if (me && outerTower) {
            me.pos.x = outerTower.pos.x + 2.8;
            me.pos.y = outerTower.pos.y - 2.6;
            me.prevPos.x = me.pos.x;
            me.prevPos.y = me.pos.y;
          }
          for (let i = 0; i < 6; i++) world.step();
          renderer.snapCamera();
          renderer.render(state, 1, 0.016);
        });
        await wait(300);
        await page.screenshot({ path: path.join(SHOT_DIR, 'v2_10_match_mid_tower_1280x720.png') });

        // 新增场景专项 1：中路汴河虹桥、大红宫灯、漂浮河灯与垂柳渡口 (0, 0)
        await page.evaluate(() => {
          const { world, state, renderer } = window.__moba;
          const me = state.heroes.find((h) => h.id === state.playerId);
          if (me) {
            me.pos.x = 0;
            me.pos.y = 0;
            me.prevPos.x = 0;
            me.prevPos.y = 0;
          }
          for (let i = 0; i < 2; i++) world.step();
          renderer.snapCamera();
          renderer.render(state, 1, 0.016);
        });
        await wait(250);
        await page.screenshot({ path: path.join(SHOT_DIR, 'v3_scene_river_bridge_1280x720.png') });

        // 新增场景专项 1b：中路河道平齐石梁渡口无阻挡穿行校验 (3.8, 3.8) -> (0, 0) -> (-3.8, -3.8)
        const riverCross = await page.evaluate(() => {
          const { world, state, renderer } = window.__moba;
          const me = state.heroes.find((h) => h.id === state.playerId);
          if (!me) throw new Error('找不到主角苏轼');
          const startX = 3.8;
          const startY = 3.8;
          me.pos.x = startX;
          me.pos.y = startY;
          me.prevPos.x = startX;
          me.prevPos.y = startY;
          me.rt.lockUntil = 0;
          me.rt.dash = null;
          me.visible = [true, true];
          world.grid.rebuild(state.units);
          const dir = { x: -Math.SQRT1_2, y: -Math.SQRT1_2 };
          let steps = 0;
          while (steps < 180) {
            world.command(me.id, { type: 'move', dir });
            world.step();
            steps++;
            if (Math.hypot(me.pos.x - startX, me.pos.y - startY) >= 6.8) break;
          }
          const walkedDist = Math.hypot(me.pos.x - startX, me.pos.y - startY);
          const endPos = { x: +me.pos.x.toFixed(2), y: +me.pos.y.toFixed(2) };
          renderer.snapCamera();
          renderer.render(state, 1, 0.016);
          return { steps, walkedDist: +walkedDist.toFixed(2), endPos };
        });
        assert(
          riverCross.walkedDist > 3.5,
          `中路河道渡口行走受阻: walked=${riverCross.walkedDist}, end=${JSON.stringify(riverCross.endPos)}`,
        );
        await wait(200);
        await page.screenshot({ path: path.join(SHOT_DIR, 'v32_river_crossing_1280x720.png') });
        console.log('[v3.2 river crossing]', JSON.stringify(riverCross));

        // 新增场景专项 1c：王者荣耀式「防御塔置中 + 双侧大通道自由绕行」几何与物理穿行校验
        const towerDualPass = await page.evaluate(() => {
          const { world, state, renderer } = window.__moba;
          const me = state.heroes.find((h) => h.id === state.playerId);
          const mid1 = state.units.find((u) => u.kind === 'tower' && u.team === 0 && u.lane === 'mid' && u.tier === 1);
          if (!me || !mid1) throw new Error('未找到我方中路一塔');
          const walkPast = (sx, sy) => {
            me.pos.x = sx;
            me.pos.y = sy;
            me.prevPos.x = sx;
            me.prevPos.y = sy;
            me.rt.lockUntil = 0;
            me.rt.dash = null;
            me.visible = [true, true];
            world.grid.rebuild(state.units);
            const dir = { x: Math.SQRT1_2, y: -Math.SQRT1_2 };
            let steps = 0;
            while (steps < 120) {
              world.command(me.id, { type: 'move', dir });
              world.step();
              steps++;
              if (Math.hypot(me.pos.x - sx, me.pos.y - sy) >= 6.0) break;
            }
            return +Math.hypot(me.pos.x - sx, me.pos.y - sy).toFixed(2);
          };
          const walkedSideA = walkPast(-15.5, 10.5);
          const walkedSideB = walkPast(-10.5, 15.5);
          // 将苏轼置于居中防御塔侧旁，展示塔身居中与双侧宽敞石板通道
          me.pos.x = -8.2;
          me.pos.y = 12.8;
          me.prevPos.x = -8.2;
          me.prevPos.y = 12.8;
          me.hp = me.stats.maxHp;
          world.grid.rebuild(state.units);
          renderer.snapCamera();
          renderer.render(state, 1, 0.016);
          return {
            towerPos: { x: +mid1.pos.x.toFixed(2), y: +mid1.pos.y.toFixed(2) },
            walkedSideA,
            walkedSideB,
          };
        });
        assert(
          Math.hypot(towerDualPass.towerPos.x + 10.5, towerDualPass.towerPos.y - 10.5) < 0.25,
          `中路一塔未置于路中 (-10.5, 10.5): ${JSON.stringify(towerDualPass.towerPos)}`,
        );
        assert(
          towerDualPass.walkedSideA > 4.0 && towerDualPass.walkedSideB > 4.0,
          `防御塔双侧绕行通道受阻: ${JSON.stringify(towerDualPass)}`,
        );
        await wait(200);
        await page.screenshot({ path: path.join(SHOT_DIR, 'v4_tower_centered_mid_1280x720.png') });
        console.log('[v4.0 centered tower]', JSON.stringify(towerDualPass));

        // 新增场景专项 2：野区与山崖（苍松、竹林、丹枫、镇宅石狮、螭首石碑、苔石灵芝）(-23, 6)
        await page.evaluate(() => {
          const { world, state, renderer } = window.__moba;
          const me = state.heroes.find((h) => h.id === state.playerId);
          if (me) {
            me.pos.x = -23;
            me.pos.y = 6;
            me.prevPos.x = -23;
            me.prevPos.y = 6;
          }
          for (let i = 0; i < 2; i++) world.step();
          renderer.snapCamera();
          renderer.render(state, 1, 0.016);
        });
        await wait(250);
        await page.screenshot({ path: path.join(SHOT_DIR, 'v3_scene_jungle_cliff_1280x720.png') });

        // 新增场景专项 3：红方赤壁朱丹皇城、御街牌坊与御印宝亭 (42, -42)
        await page.evaluate(() => {
          const { world, state, renderer } = window.__moba;
          const me = state.heroes.find((h) => h.id === state.playerId);
          if (me) {
            me.pos.x = 42;
            me.pos.y = -42;
            me.prevPos.x = 42;
            me.prevPos.y = -42;
          }
          for (let i = 0; i < 2; i++) world.step();
          renderer.snapCamera();
          renderer.render(state, 1, 0.016);
        });
        await wait(250);
        await page.screenshot({ path: path.join(SHOT_DIR, 'v3_scene_red_base_1280x720.png') });

        // 复位苏轼回蓝方泉水区以便执行后续技能/移动零偏差冒烟
        await page.evaluate(() => {
          const { world, state, renderer } = window.__moba;
          const me = state.heroes.find((h) => h.id === state.playerId);
          if (me) {
            me.hp = me.stats.maxHp;
            me.mana = me.stats.maxMana;
            me.pos.x = -44;
            me.pos.y = 44;
            me.prevPos.x = -44;
            me.prevPos.y = 44;
          }
          world.grid.rebuild(state.units);
          renderer.snapCamera();
          renderer.render(state, 1, 0.016);
        });
      }

      const res = await page.evaluate((expectedHero) => {
        const moba = window.__moba;
        const { world, state, renderer, hud } = moba;
        const me = state.heroes.find((h) => h.id === state.playerId);
        const blue = state.heroes.filter((h) => h.team === 0);
        const red = state.heroes.filter((h) => h.team === 1);
        const allIds = state.heroes.map((h) => h.id).sort((a, b) => a - b);
        const uniqueAllHeroIds = [...new Set(state.heroes.map((h) => h.heroId))];

        const imgs = [...document.querySelectorAll('img')].map((img) => ({
          src: img.getAttribute('src'),
          ok: img.complete && img.naturalWidth > 0,
        }));

        const startX = me.pos.x;
        const startY = me.pos.y;
        world.command(me.id, { type: 'attack' });
        for (let i = 0; i < 4; i++) world.step();
        const atkOrderAtBase = me.h.atkOrder;

        world.command(me.id, { type: 'move', dir: { x: 1, y: 1 } });
        for (let i = 0; i < 8; i++) world.step();
        const movedDist = Math.hypot(me.pos.x - startX, me.pos.y - startY);
        const atkOrderAfterMove = me.h.atkOrder;

        me.level = 4;
        me.skills.s1.level = 1;
        me.skills.s2.level = 1;
        me.skills.ult.level = 1;
        me.mana = me.stats.maxMana;
        me.skills.s1.cd = 0;
        me.skills.s2.cd = 0;
        me.skills.ult.cd = 0;
        me.rt.lockUntil = 0;

        const foe = red[0];
        foe.pos.x = me.pos.x + 3.5;
        foe.pos.y = me.pos.y;
        foe.prevPos.x = foe.pos.x;
        foe.prevPos.y = foe.pos.y;
        foe.visible[me.team] = true;
        world.grid.rebuild(state.units);

        const fired = {};
        for (const slot of ['s1', 's2', 'ult']) {
          me.mana = me.stats.maxMana;
          me.rt.lockUntil = 0;
          me.rt.dash = null;
          world.command(me.id, {
            type: 'cast',
            slot,
            dir: { x: 1, y: 0 },
            pos: { x: foe.pos.x, y: foe.pos.y },
            targetId: foe.id,
          });
          for (let i = 0; i < 3; i++) {
            world.step();
            const evs = world.drainEvents();
            if (evs.length) {
              renderer?.handleEvents?.(evs, state);
              hud?.handleEvents?.(evs, state);
              if (evs.some((ev) => ev.type === 'skillCast' && ev.slot === slot && ev.unitId === me.id)) {
                fired[slot] = true;
              }
            }
          }
        }
        renderer?.render?.(state, 1, 0.016);

        return {
          heroId: me.heroId,
          expectedHero,
          blueCount: blue.length,
          redCount: red.length,
          allIds,
          uniqueAllHeroIdsCount: uniqueAllHeroIds.length,
          blueHeroes: blue.map((h) => h.heroId),
          redHeroes: red.map((h) => h.heroId),
          distance: +renderer.engine.rig.getDistance().toFixed(2),
          atkOrderAtBase,
          atkOrderAfterMove,
          movedDist: +movedDist.toFixed(2),
          fired,
          hasCutin: !!document.querySelector('.ts-eyes-cutin'),
          brokenImgs: imgs.filter((x) => !x.ok),
          battleAudioStats: moba.audio.debug.stats(),
        };
      }, heroId);

      await waitForCondition(
        page,
        () => {
          const img = document.querySelector('.ts-eyes-cutin__img');
          return !!img && img.complete && img.naturalWidth > 0;
        },
        10_000,
      );

      assert.equal(res.heroId, heroId);
      assert.equal(res.blueCount, 5);
      assert.equal(res.redCount, 5);
      assert.deepStrictEqual(res.allIds, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      assert.equal(res.uniqueAllHeroIdsCount, 6);
      assert.equal(res.atkOrderAtBase, false);
      assert.equal(res.atkOrderAfterMove, false);
      assert(res.movedDist > 0.2);
      assert.equal(res.fired.s1, true);
      assert.equal(res.fired.s2, true);
      assert.equal(res.fired.ult, true);
      assert.equal(res.hasCutin, true);
      assert.equal(
        res.battleAudioStats.track,
        'battle',
        `局内 BGM track 应为 battle，实际 ${res.battleAudioStats.track}`,
      );
      assert(
        res.battleAudioStats.notes > 0,
        `局内程序化战鼓乐音符未调度: ${JSON.stringify(res.battleAudioStats)}`,
      );
      assert.equal(res.brokenImgs.length, 0, `存在破损图片: ${JSON.stringify(res.brokenImgs)}`);

      if (heroId === 'xinqiji') {
        await page.evaluate(
          () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
        );
        const vis = await page.evaluate(() => {
          const el = document.querySelector('.ts-eyes-cutin');
          if (!el) return null;
          return {
            opacity: parseFloat(getComputedStyle(el).opacity),
            width: el.getBoundingClientRect().width,
          };
        });
        assert(vis && vis.opacity > 0.7 && vis.width > 200, `Eyes cutin 未清晰显现: ${JSON.stringify(vis)}`);
        await page.evaluate(() => window.__moba?.session?.loop?.stop?.());
        let afterShot = null;
        try {
          await page.screenshot({ path: path.join(SHOT_DIR, 'v2_11_match_eyes_cutin_1280x720.png') });
          afterShot = await page.evaluate(() => {
            const el = document.querySelector('.ts-eyes-cutin');
            return {
              exists: !!el,
              opacity: el ? parseFloat(getComputedStyle(el).opacity) : 0,
            };
          });
        } finally {
          await page.evaluate(() => window.__moba?.session?.loop?.start?.());
        }
        assert(
          afterShot?.exists && afterShot.opacity > 0.7,
          `Eyes cutin 截图期间已消退: ${JSON.stringify(afterShot)}`,
        );
      }

      // 新增 Milestone 2 战斗技能特效专项截图（苏轼/刘娥/花蕊夫人/辛弃疾中路演武绽放）
      if (['sushi', 'liue', 'huarui', 'xinqiji'].includes(heroId)) {
        await page.evaluate(async (hid) => {
          const { world, state, renderer } = window.__moba;
          const cutin = document.querySelector('.ts-eyes-cutin');
          if (cutin) cutin.remove();
          const me = state.heroes.find((h) => h.id === state.playerId);
          const foe = state.heroes.find((h) => h.team !== me.team && h.alive) || state.heroes.find((h) => h.team !== me.team);
          if (!me || !foe) return;
          me.pos.x = -18;
          me.pos.y = 18;
          me.prevPos.x = -18;
          me.prevPos.y = 18;
          me.facing = -Math.PI / 4;
          foe.alive = true;
          foe.hp = Math.max(foe.stats.maxHp * 0.35, 1200);
          foe.pos.x = -14.2;
          foe.pos.y = 14.2;
          foe.prevPos.x = foe.pos.x;
          foe.prevPos.y = foe.pos.y;
          foe.visible[me.team] = true;
          world.grid.rebuild(state.units);

          me.level = 6;
          me.skills.s1.level = 2;
          me.skills.s2.level = 2;
          me.skills.ult.level = 1;
          me.hp = me.stats.maxHp;
          me.mana = me.stats.maxMana;
          for (const sl of ['s1', 's2', 'ult']) {
            me.skills[sl].cd = 0;
            me.rt.lockUntil = 0;
          }
          me.rt.dash = null;

          const dir = { x: Math.SQRT1_2, y: -Math.SQRT1_2 };
          const firstSlot = hid === 'huarui' ? 's1' : 's2';
          world.command(me.id, {
            type: 'cast',
            slot: firstSlot,
            dir,
            pos: { x: foe.pos.x, y: foe.pos.y },
            targetId: foe.id,
          });
          for (let i = 0; i < 3; i++) {
            world.step();
            const evs = world.drainEvents();
            if (evs.length) renderer?.handleEvents?.(evs, state);
            renderer?.render?.(state, 1, 0.033);
          }

          me.mana = me.stats.maxMana;
          me.skills.ult.cd = 0;
          me.rt.lockUntil = 0;
          me.rt.dash = null;
          world.command(me.id, {
            type: 'cast',
            slot: 'ult',
            dir,
            pos: { x: foe.pos.x, y: foe.pos.y },
            targetId: foe.id,
          });
          const frames = hid === 'xinqiji' ? 11 : 9;
          for (let i = 0; i < frames; i++) {
            world.step();
            const evs = world.drainEvents();
            if (evs.length) renderer?.handleEvents?.(evs, state);
            renderer?.render?.(state, 1, 0.033);
          }
          renderer.snapCamera();
          renderer.render(state, 1, 0.016);
        }, heroId);
        await wait(200);
        await page.screenshot({ path: path.join(SHOT_DIR, `v3_vfx_${heroId}_ult_1280x720.png`) });
      }

      // ── v3.1 王者荣耀式走A前摇保护、无空挥、移动施法上下半身分离与防滑步验证 ──
      if (heroId === 'sushi') {
        let feelMetrics;
        try {
          feelMetrics = await page.evaluate(async () => {
            const moba = window.__moba;
            const { world, state, renderer, session } = moba;
            session?.loop?.stop?.();
            const me = state.heroes.find((h) => h.id === state.playerId);
            const enemies = state.heroes.filter((h) => h.team !== me.team);
            const foe = enemies[0];
            const resetUnit = (u, x, y) => {
              u.alive = true;
              u.invulnerable = false;
              u.hp = u.stats.maxHp;
              u.mana = u.stats.maxMana;
              u.pos.x = x;
              u.pos.y = y;
              u.prevPos.x = x;
              u.prevPos.y = y;
              u.visible = [true, true];
              u.rt.untargetable = false;
              u.rt.stunned = false;
              u.rt.rooted = false;
              u.rt.silenced = false;
              u.rt.dash = null;
              u.rt.act = null;
              u.rt.lockUntil = 0;
              u.rt.atkCd = 0;
              u.rt.windupLeft = 0;
              u.rt.windupTarget = -1;
              u.h && ((u.h.atkOrder = false), (u.h.pendingCast = null));
            };
            const stepRender = (dt = 0.033) => {
              world.step();
              const evs = world.drainEvents();
              if (evs.length) renderer?.handleEvents?.(evs, state);
              renderer?.render?.(state, 1, dt);
            };

            // 1. 无空挥检验：移动中无目标按普攻不触发原地空挥、不抢走位
            resetUnit(me, -18, 18);
            for (const u of state.units) {
              if (u.team !== me.team && u.alive && Math.hypot(u.pos.x - (-18), u.pos.y - 18) < 16) {
                u.pos.x = 42;
                u.pos.y = -42;
                u.prevPos.x = 42;
                u.prevPos.y = -42;
              }
            }
            world.grid.rebuild(state.units);
            world.command(me.id, { type: 'move', dir: { x: 1, y: 0 } });
            for (let i = 0; i < 3; i++) stepRender();
            const mStartX = me.pos.x;
            world.command(me.id, { type: 'attack' });
            for (let i = 0; i < 4; i++) stepRender();
            const noEmptySwing = {
              windupLeft: me.rt.windupLeft,
              anim: me.anim,
              atkOrder: me.h.atkOrder,
              movedDist: +(me.pos.x - mStartX).toFixed(3),
            };

            // 2. 走A前摇保护 + 零滑步 + 释放瞬间秒接走位取消后摇
            resetUnit(me, -18, 18);
            resetUnit(foe, -13.5, 18);
            foe.rt.stunned = true;
            world.command(me.id, { type: 'move', dir: { x: 0, y: 0 } });
            world.grid.rebuild(state.units);
            const ax0 = me.pos.x;
            const ay0 = me.pos.y;
            const foeHp0 = foe.hp;
            const ownProj0 = state.projectiles.filter((p) => p.ownerId === me.id).length;
            world.command(me.id, { type: 'attack' });
            world.command(me.id, { type: 'move', dir: { x: -1, y: 1 } });
            for (let i = 0; i < 2; i++) stepRender();
            const windupProtected = me.rt.windupLeft > 0;
            const windupSlideDist = +Math.hypot(me.pos.x - ax0, me.pos.y - ay0).toFixed(4);
            const launchX = me.pos.x;
            const launchY = me.pos.y;
            for (let i = 0; i < 6; i++) stepRender();
            const ownProjNow = state.projectiles.filter((p) => p.ownerId === me.id).length;
            const kiting = {
              windupProtected,
              windupSlideDist,
              launched: foe.hp < foeHp0 || ownProjNow > ownProj0,
              postLaunchMoveDist: +Math.hypot(me.pos.x - launchX, me.pos.y - launchY).toFixed(3),
            };

            // 3. 移动施法 + 上下半身分离 + 躯干朝目标扭转 + 腿部真实迈步周期
            resetUnit(me, -18, 18);
            resetUnit(foe, -14.2, 14.2);
            foe.rt.stunned = true;
            me.level = 6;
            me.skills.s1.level = 2;
            me.skills.s1.cd = 0;
            world.grid.rebuild(state.units);
            const quatDelta = (a, b) => {
              const dot = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]);
              return 1 - dot + Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2], a[3] - b[3]) * 0.5;
            };
            const puppet = renderer.getUnitPuppet(me.id);
            const thighIdx = puppet?.def?.rig?.names?.indexOf('thighL') ?? -1;
            const kiteDir = { x: -0.9239, y: 0.3827 };
            world.command(me.id, { type: 'move', dir: kiteDir });
            // 对齐至迈步中段高速摆动相位，避免固定帧数恰好落在正弦波峰导致 8 帧摆幅统计偶发偏低
            let prevWarmThigh = null;
            for (let w = 0; w < 20; w++) {
              stepRender();
              if (puppet && thighIdx >= 0) {
                const q = puppet.pose.q;
                const cur = [q[thighIdx * 4], q[thighIdx * 4 + 1], q[thighIdx * 4 + 2], q[thighIdx * 4 + 3]];
                if (w >= 3 && prevWarmThigh && quatDelta(prevWarmThigh, cur) >= 0.03) break;
                prevWarmThigh = cur;
              } else if (w >= 3) {
                break;
              }
            }
            me.pos.x = -18;
            me.pos.y = 18;
            me.prevPos.x = -18;
            me.prevPos.y = 18;
            const sx = me.pos.x;
            const sy = me.pos.y;
            world.command(me.id, {
              type: 'cast',
              slot: 's1',
              dir: { x: Math.SQRT1_2, y: -Math.SQRT1_2 },
              pos: { x: foe.pos.x, y: foe.pos.y },
              targetId: foe.id,
            });
            world.command(me.id, { type: 'move', dir: kiteDir });

            let maxMoveBlend = 0;
            let maxAbsTwist = 0;
            let maxThighDelta = 0;
            const thighSamples = [];
            for (let i = 0; i < 8; i++) {
              stepRender();
              if (puppet) {
                maxMoveBlend = Math.max(maxMoveBlend, puppet.input.moveBlend || 0);
                maxAbsTwist = Math.max(maxAbsTwist, Math.abs(puppet.input.upperTwist || 0));
                if (thighIdx >= 0) {
                  const q = puppet.pose.q;
                  const cur = [q[thighIdx * 4], q[thighIdx * 4 + 1], q[thighIdx * 4 + 2], q[thighIdx * 4 + 3]];
                  for (const prev of thighSamples) {
                    maxThighDelta = Math.max(maxThighDelta, quatDelta(prev, cur));
                  }
                  thighSamples.push(cur);
                }
              }
            }
            renderer.snapCamera();
            renderer.render(state, 1, 0.016);
            return {
              noEmptySwing,
              kiting,
              mobileCast: {
                movedDist: +Math.hypot(me.pos.x - sx, me.pos.y - sy).toFixed(3),
                maxMoveBlend: +maxMoveBlend.toFixed(3),
                maxAbsTwist: +maxAbsTwist.toFixed(2),
                maxThighDelta: +maxThighDelta.toFixed(4),
              },
            };
          });

          assert.equal(feelMetrics.noEmptySwing.windupLeft, 0, `无目标移动中应无空挥前摇: ${JSON.stringify(feelMetrics)}`);
          assert.equal(feelMetrics.noEmptySwing.anim, 'move', `无目标移动中应维持 move: ${JSON.stringify(feelMetrics)}`);
          assert.equal(feelMetrics.noEmptySwing.atkOrder, false);
          assert(feelMetrics.noEmptySwing.movedDist > 0.4, `无目标按攻移动距离不足: ${JSON.stringify(feelMetrics)}`);

          assert.equal(feelMetrics.kiting.windupProtected, true, `走A前摇被走位指令误取消: ${JSON.stringify(feelMetrics)}`);
          assert(feelMetrics.kiting.windupSlideDist < 0.08, `普攻前摇出现滑步(${feelMetrics.kiting.windupSlideDist}): ${JSON.stringify(feelMetrics)}`);
          assert.equal(feelMetrics.kiting.launched, true, `走A攻击未正常出手: ${JSON.stringify(feelMetrics)}`);
          assert(feelMetrics.kiting.postLaunchMoveDist > 0.25, `出手后未流畅接续走位: ${JSON.stringify(feelMetrics)}`);

          assert(feelMetrics.mobileCast.movedDist > 0.35, `移动施法位移不足: ${JSON.stringify(feelMetrics)}`);
          assert(feelMetrics.mobileCast.maxMoveBlend > 0.5, `未进入上下半身分离 moveBlend: ${JSON.stringify(feelMetrics)}`);
          assert(feelMetrics.mobileCast.maxAbsTwist > 5, `上半身未朝目标扭转 upperTwist: ${JSON.stringify(feelMetrics)}`);
          assert(feelMetrics.mobileCast.maxThighDelta > 0.08, `下半身双腿僵硬未迈步: ${JSON.stringify(feelMetrics)}`);

          await page.screenshot({ path: path.join(SHOT_DIR, 'v31_kiting_mobile_cast_1280x720.png') });
          console.log('[v3.1 feel:sushi]', JSON.stringify(feelMetrics));

          // v4.0 国风四兵种小兵实局集结近景截图（筛选并齐聚开阔石板路面，清晰检阅三兵种 3D 造型与轮辐/布风）
          const minionInfo = await page.evaluate(() => {
            const moba = window.__moba;
            const { world, state, renderer } = moba;
            const me = state.heroes.find((h) => h.id === state.playerId);
            const tStart = performance.now();
            let steps = 0;
            while (steps < 2500) {
              world.step();
              steps++;
              const allAlive = state.units.filter((u) => u.kind === 'minion' && u.alive);
              const hasSiege = allAlive.some((u) => u.team === 0 && u.minionType === 'siege');
              const hasMelee = allAlive.some((u) => u.team === 0 && u.minionType === 'melee');
              const hasRanged = allAlive.some((u) => u.team === 0 && u.minionType === 'ranged');
              if (hasSiege && hasMelee && hasRanged) break;
              if (state.time > 75 && performance.now() - tStart > 4500 && hasMelee && hasRanged) break;
            }
            document.querySelectorAll('.sf-hud__banner, .ts-eyes-cutin').forEach((el) => el.remove());

            const pickMinion = (team, type) =>
              state.units.find((u) => u.kind === 'minion' && u.alive && u.team === team && u.minionType === type);
            const blueMelee = pickMinion(0, 'melee');
            const blueRanged = pickMinion(0, 'ranged');
            const blueSiege = pickMinion(0, 'siege');
            const redMelee = pickMinion(1, 'melee');
            const redRanged = pickMinion(1, 'ranged');

            const placeUnit = (u, x, y, facing) => {
              if (!u) return;
              u.pos.x = x;
              u.pos.y = y;
              u.prevPos.x = x;
              u.prevPos.y = y;
              u.facing = facing;
              u.aimFacing = facing;
              u.visible = [true, true];
            };
            // 把其它英雄暂移开中路视野中心，避免遮挡小兵近景造型
            for (const h of state.heroes) {
              if (h.id !== state.playerId) placeUnit(h, h.team === 0 ? -42 : 42, h.team === 0 ? 42 : -42, 0);
            }
            placeUnit(blueMelee, -5.0, 5.4, -Math.PI * 0.65);
            placeUnit(blueRanged, -3.6, 3.8, -Math.PI * 0.65);
            placeUnit(blueSiege, -7.2, 4.6, -Math.PI * 0.65);
            placeUnit(redMelee, -1.6, 4.6, Math.PI * 0.65);
            placeUnit(redRanged, -1.8, 2.2, Math.PI * 0.65);

            if (me) {
              me.pos.x = -4.2;
              me.pos.y = 4.6;
              me.prevPos.x = me.pos.x;
              me.prevPos.y = me.pos.y;
              me.facing = -Math.PI / 4;
            }
            world.grid.rebuild(state.units);
            moba.setCameraPreset('near');
            renderer.snapCamera();
            // 推进多帧渲染让新近景小兵的显隐渐入不透明度完全稳定到 1.0（消除网格镂空虚影）
            for (let f = 0; f < 16; f++) renderer.render(state, 1, 0.05);
            return {
              time: +state.time.toFixed(1),
              steps,
              totalMinions: state.units.filter((u) => u.kind === 'minion' && u.alive).length,
              showcased: [
                blueMelee && 'blue:melee',
                blueRanged && 'blue:ranged',
                blueSiege && 'blue:siege',
                redMelee && 'red:melee',
                redRanged && 'red:ranged',
              ].filter(Boolean),
            };
          });
          assert(minionInfo.totalMinions >= 6, `小兵未正常出兵: ${JSON.stringify(minionInfo)}`);
          await wait(200);
          await page.screenshot({ path: path.join(SHOT_DIR, 'v4_minions_showcase_1280x720.png') });
          await page.evaluate(() => window.__moba?.setCameraPreset?.('standard'));
          console.log('[v4.0 minions showcase]', JSON.stringify(minionInfo));

          // v5.0 战场生灵小动物挂载断言 + 6 大《山海经》× 唐宋神兽野怪大合照
          const monsterInfo = await page.evaluate(() => {
            const moba = window.__moba;
            const { world, state, renderer } = moba;
            const counts = renderer.getTerrainCounts?.() ?? null;
            for (const c of world.camps) {
              if (!c.members.length && c.respawnAt > state.time) c.respawnAt = state.time;
            }
            world.step();
            world.step();
            document.querySelectorAll('.sf-hud__banner, .ts-eyes-cutin').forEach((el) => el.remove());

            const placeUnit = (u, x, y, facing) => {
              if (!u) return;
              u.pos.x = x;
              u.pos.y = y;
              u.prevPos.x = x;
              u.prevPos.y = y;
              u.facing = facing;
              u.aimFacing = facing;
              u.visible = [true, true];
            };
            for (const u of state.units) {
              if (u.kind === 'hero' && u.id !== state.playerId) {
                placeUnit(u, 52, -52, 0);
              } else if (u.kind === 'minion' || u.kind === 'monster') {
                placeUnit(u, 48, -48, 0);
              }
            }

            const types = ['mossback', 'glimwing', 'frost_golem', 'ember_golem', 'abyss_drake', 'star_colossus'];
            const picked = {};
            for (const t of types) {
              const m = state.units.find((u) => u.kind === 'monster' && u.alive && u.monsterType === t);
              if (m) picked[t] = m;
            }
            const layout = {
              abyss_drake: [-42.2, 36.8, Math.PI / 2 - 0.28],
              star_colossus: [-36.6, 36.6, Math.PI / 2 + 0.28],
              mossback: [-43.2, 41.2, Math.PI / 2 - 0.25],
              glimwing: [-40.6, 41.5, Math.PI / 2 - 0.12],
              frost_golem: [-38.0, 41.4, Math.PI / 2 + 0.12],
              ember_golem: [-35.4, 40.8, Math.PI / 2 + 0.25],
            };
            for (const t of types) {
              const m = picked[t];
              const [px, py, pf] = layout[t];
              if (m) placeUnit(m, px, py, pf);
            }

            const me = state.heroes.find((h) => h.id === state.playerId);
            if (me) {
              me.pos.x = -39.4;
              me.pos.y = 39.2;
              me.prevPos.x = -39.4;
              me.prevPos.y = 39.2;
              me.facing = Math.PI / 2;
              me.aimFacing = Math.PI / 2;
            }
            world.grid.rebuild(state.units);
            moba.setCameraPreset('wide');
            renderer.snapCamera();
            for (let f = 0; f < 75; f++) renderer.render(state, 1, 0.05);

            return {
              counts,
              present: types.filter((t) => !!picked[t]),
            };
          });
          assert(
            (monsterInfo.counts?.wildlife ?? 0) >= 25,
            `地图环境小动物数量不足: ${JSON.stringify(monsterInfo.counts)}`,
          );
          assert.equal(
            monsterInfo.present.length,
            6,
            `未能同框集齐全部 6 种野怪: ${JSON.stringify(monsterInfo.present)}`,
          );
          await wait(200);
          await page.screenshot({ path: path.join(SHOT_DIR, 'v5_monsters_showcase_1280x720.png') });

          // v5.1 野怪近距特写检验（4 只中小野怪 + 2 只史诗神兽分两组 near 预设拉近拍）
          await page.evaluate(() => {
            const { world, state, renderer, setCameraPreset } = window.__moba;
            const types = ['mossback', 'glimwing', 'frost_golem', 'ember_golem', 'abyss_drake', 'star_colossus'];
            const picked = {};
            for (const t of types) {
              picked[t] = state.units.find((u) => u.kind === 'monster' && u.alive && u.monsterType === t);
            }
            const park = (u, x, y, f) => {
              if (!u) return;
              u.pos.x = x;
              u.pos.y = y;
              u.prevPos.x = x;
              u.prevPos.y = y;
              u.facing = f;
              u.aimFacing = f;
            };
            park(picked.abyss_drake, 48, -48, 0);
            park(picked.star_colossus, 48, -48, 0);
            park(picked.mossback, -42.4, 39.8, Math.PI * 0.48);
            park(picked.glimwing, -40.3, 39.8, Math.PI * 0.48);
            park(picked.frost_golem, -38.3, 39.7, Math.PI * 0.48);
            park(picked.ember_golem, -36.2, 39.6, Math.PI * 0.48);
            const me = state.heroes.find((h) => h.id === state.playerId);
            if (me) park(me, -39.4, 37.8, Math.PI * 0.5);
            world.grid.rebuild(state.units);
            setCameraPreset('near');
            renderer.snapCamera();
            for (let f = 0; f < 40; f++) renderer.render(state, 1, 0.05);
          });
          await wait(200);
          await page.screenshot({ path: path.join(SHOT_DIR, 'v6_monsters_closeup_small.png') });

          await page.evaluate(() => {
            const { world, state, renderer } = window.__moba;
            const types = ['mossback', 'glimwing', 'frost_golem', 'ember_golem', 'abyss_drake', 'star_colossus'];
            const picked = {};
            for (const t of types) {
              picked[t] = state.units.find((u) => u.kind === 'monster' && u.alive && u.monsterType === t);
            }
            const park = (u, x, y, f) => {
              if (!u) return;
              u.pos.x = x;
              u.pos.y = y;
              u.prevPos.x = x;
              u.prevPos.y = y;
              u.facing = f;
              u.aimFacing = f;
            };
            for (const s of ['mossback', 'glimwing', 'frost_golem', 'ember_golem']) park(picked[s], 48, -48, 0);
            park(picked.abyss_drake, -41.6, 39.5, Math.PI * 0.48);
            park(picked.star_colossus, -37.0, 39.4, Math.PI * 0.48);
            const me = state.heroes.find((h) => h.id === state.playerId);
            if (me) park(me, -39.3, 38.0, Math.PI * 0.5);
            world.grid.rebuild(state.units);
            renderer.snapCamera();
            for (let f = 0; f < 40; f++) renderer.render(state, 1, 0.05);
          });
          await wait(200);
          await page.screenshot({ path: path.join(SHOT_DIR, 'v6_monsters_closeup_epics.png') });

          await page.evaluate(() => window.__moba?.setCameraPreset?.('standard'));
          console.log('[v5.1 wildlife + 6 monsters showcase & closeups]', JSON.stringify(monsterInfo));
        } finally {
          await page.evaluate(() => window.__moba?.session?.loop?.start?.());
        }
      }

      if (heroId === 'huarui') {
        let spinMetrics;
        try {
          spinMetrics = await page.evaluate(async () => {
            const moba = window.__moba;
            const { world, state, renderer, session } = moba;
            session?.loop?.stop?.();
            const me = state.heroes.find((h) => h.id === state.playerId);
            const foe = state.heroes.find((h) => h.team !== me.team);
            me.alive = true;
            me.hp = me.stats.maxHp;
            me.mana = me.stats.maxMana;
            me.pos.x = -18;
            me.pos.y = 18;
            me.prevPos.x = -18;
            me.prevPos.y = 18;
            me.visible = [true, true];
            me.rt.stunned = false;
            me.rt.rooted = false;
            me.rt.silenced = false;
            me.rt.windupLeft = 0;
            me.rt.windupTarget = -1;
            me.rt.dash = null;
            me.rt.act = null;
            me.rt.lockUntil = 0;
            me.h && ((me.h.atkOrder = false), (me.h.pendingCast = null));
            me.skills.ult.level = 1;
            me.skills.ult.cd = 0;
            if (foe) {
              foe.alive = true;
              foe.invulnerable = false;
              foe.rt.untargetable = false;
              foe.visible = [true, true];
              foe.pos.x = -14.2;
              foe.pos.y = 14.2;
              foe.prevPos.x = -14.2;
              foe.prevPos.y = 14.2;
            }
            world.grid.rebuild(state.units);
            const stepRender = (dt = 0.033) => {
              world.step();
              const evs = world.drainEvents();
              if (evs.length) renderer?.handleEvents?.(evs, state);
              renderer?.render?.(state, 1, dt);
            };
            const moveDir = { x: Math.SQRT1_2, y: -Math.SQRT1_2 };
            world.command(me.id, { type: 'move', dir: moveDir });
            for (let i = 0; i < 3; i++) stepRender();
            world.command(me.id, {
              type: 'cast',
              slot: 'ult',
              dir: moveDir,
              pos: { x: me.pos.x, y: me.pos.y },
              targetId: foe?.id ?? -1,
            });
            world.command(me.id, { type: 'move', dir: moveDir });
            const puppet = renderer.getUnitPuppet(me.id);
            const thighIdx = puppet?.def?.rig?.names?.indexOf('thighL') ?? -1;
            let maxMoveBlend = 0;
            let maxThighDelta = 0;
            let firstThigh = null;
            for (let i = 0; i < 10; i++) {
              stepRender();
              if (puppet) {
                maxMoveBlend = Math.max(maxMoveBlend, puppet.input.moveBlend || 0);
                if (thighIdx >= 0) {
                  const q = puppet.pose.q;
                  const cur = [q[thighIdx * 4], q[thighIdx * 4 + 1], q[thighIdx * 4 + 2], q[thighIdx * 4 + 3]];
                  if (!firstThigh) firstThigh = cur;
                  else {
                    const dot = Math.abs(
                      firstThigh[0] * cur[0] + firstThigh[1] * cur[1] + firstThigh[2] * cur[2] + firstThigh[3] * cur[3],
                    );
                    maxThighDelta = Math.max(maxThighDelta, 1 - dot + Math.hypot(
                      firstThigh[0] - cur[0], firstThigh[1] - cur[1], firstThigh[2] - cur[2], firstThigh[3] - cur[3],
                    ) * 0.5);
                  }
                }
              }
            }
            renderer.snapCamera();
            renderer.render(state, 1, 0.016);
            return {
              anim: me.anim,
              maxMoveBlend: +maxMoveBlend.toFixed(3),
              maxThighDelta: +maxThighDelta.toFixed(4),
            };
          });

          assert.equal(spinMetrics.anim, 'spin', `花蕊夫人大招应进入 spin: ${JSON.stringify(spinMetrics)}`);
          assert(spinMetrics.maxMoveBlend > 0.5, `花蕊旋斩移动未启用上下半身分离: ${JSON.stringify(spinMetrics)}`);
          assert(spinMetrics.maxThighDelta > 0.08, `花蕊旋斩下半身僵硬滑步: ${JSON.stringify(spinMetrics)}`);

          await page.screenshot({ path: path.join(SHOT_DIR, 'v31_huarui_spin_run_1280x720.png') });
          console.log('[v3.1 feel:huarui]', JSON.stringify(spinMetrics));
        } finally {
          await page.evaluate(() => window.__moba?.session?.loop?.start?.());
        }
      }
      matchReports.push(res);
    }
    console.log('[3/4] 6 位英雄全部通过 5v5 进局、普攻移动、三技能、国风战斗 BGM 与 eyes 特写切镜验收');

    // ── 4. 三档视角持久化 & 手机横屏 844x390 局内截图 ──
    const viewMetrics = {};
    for (const [vpName, vp] of [
      ['1280x720', { width: 1280, height: 720, deviceScaleFactor: 1 }],
      ['844x390', { width: 844, height: 390, deviceScaleFactor: 2, isMobile: true, hasTouch: true }],
      ['390x844', { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }],
    ]) {
      await page.setViewport(vp);
      await page.goto(`${baseUrl}/?skipmenu=1&hero=sushi&seed=2026&tutorial=0`, {
        waitUntil: 'load',
        timeout: 60_000,
      });
      await waitForCondition(page, () => window.__moba?.phase === 'match' && !!window.__moba?.renderer, 60_000);
      await wait(450);
      viewMetrics[vpName] = {};

      for (const preset of ['near', 'standard', 'wide']) {
        const m = await page.evaluate((key) => {
          const moba = window.__moba;
          moba.setCameraPreset(key);
          moba.renderer.snapCamera();
          moba.renderer.render(moba.state, 1, 0.016);
          const rig = moba.renderer.engine.rig;
          return {
            key: moba.getCameraPreset(),
            stored: localStorage.getItem('tsry.cameraPreset'),
            distance: +rig.getDistance().toFixed(2),
            fov: +rig.camera.fov.toFixed(2),
          };
        }, preset);
        assert.equal(m.key, preset);
        assert.equal(m.stored, preset);
        viewMetrics[vpName][preset] = m;
      }
      if (vpName === '844x390') {
        await page.evaluate(() => {
          const moba = window.__moba;
          moba.setCameraPreset('standard');
          moba.renderer.snapCamera();
          moba.renderer.render(moba.state, 1, 0.016);
        });
        await wait(250);
        await page.screenshot({ path: path.join(SHOT_DIR, 'v2_12_mobile_match_844x390.png') });
      }
      assert(viewMetrics[vpName].standard.distance > viewMetrics[vpName].near.distance);
      assert(viewMetrics[vpName].wide.distance > viewMetrics[vpName].standard.distance);
    }

    await page.evaluate(() => window.__moba.setCameraPreset('standard'));
    await page.reload({ waitUntil: 'load', timeout: 60_000 });
    await waitForCondition(page, () => window.__moba?.phase === 'match', 60_000);
    const persisted = await page.evaluate(() => window.__moba.getCameraPreset());
    assert.equal(persisted, 'standard');

    assert.equal(errors.length, 0, `发现运行时报错: ${errors.join(' | ')}`);
    assert.equal(badHttp.length, 0, `发现 HTTP >= 400 资源请求: ${badHttp.join(' | ')}`);

    console.log('[4/4] 全场景与国风战斗特效截图、三档视角持久化与全量冒烟全部通过');
    console.log(
      JSON.stringify(
        {
          ok: true,
          wzryMd5: HAS_MOTHER_HTML ? EXPECTED_WZRY_MD5 : null,
          triangles: {
            sushi: lobbyChecks.sushiTri,
            liue: lobbyChecks.liueTri,
            tower2: lobbyChecks.towerTri,
            core: lobbyChecks.coreTri,
          },
          viewMetrics,
          persisted,
          screenshotsDir: SHOT_DIR,
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch((err) => {
  console.error('[verify] FAILED:', err);
  process.exit(1);
});
