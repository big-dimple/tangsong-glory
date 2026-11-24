#!/usr/bin/env node
/**
 * build-core.mjs — 从只读母本 ../wzry.html 抽离并生成分层解耦内核 src/engine/mobaCore.js
 * v2.0 彻头彻尾唐宋美术与真国风音频接入（零改动 ../wzry.html，全部锚点严格校验）
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { patchCoreHooks } from './patch-core-hooks.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SOURCE_HTML = process.env.MOBA_MOTHER_HTML
  ? path.resolve(process.env.MOBA_MOTHER_HTML)
  : path.resolve(PROJECT_ROOT, '../wzry.html');
const OUT_FILE = path.join(PROJECT_ROOT, 'src/engine/mobaCore.js');

function countOccurrences(haystack, needle) {
  let count = 0;
  let pos = 0;
  while ((pos = haystack.indexOf(needle, pos)) !== -1) {
    count++;
    pos += needle.length;
  }
  return count;
}

function assertReplace(src, target, replacement, label, expectedCount = 1) {
  const count = countOccurrences(src, target);
  if (count !== expectedCount) {
    throw new Error(`[build-core] 锚点 "${label}" 期望命中 ${expectedCount} 次，实际命中 ${count} 次`);
  }
  return src.split(target).join(replacement);
}

function replaceBetween(src, startStr, endStr, replacement, label) {
  const s = src.indexOf(startStr);
  if (s < 0) throw new Error(`[build-core] 区间起点 "${label}" 未命中: ${startStr}`);
  const e = src.indexOf(endStr, s);
  if (e < 0) throw new Error(`[build-core] 区间终点 "${label}" 未命中: ${endStr}`);
  return src.slice(0, s) + replacement + src.slice(e + endStr.length);
}

function replaceAllChecked(src, target, replacement, label, minCount = 1) {
  const count = countOccurrences(src, target);
  if (count < minCount) {
    throw new Error(`[build-core] 替换 "${label}" 期望至少命中 ${minCount} 次，实际命中 ${count} 次`);
  }
  return src.split(target).join(replacement);
}

function extractMainModule(html) {
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  if (scripts.length < 2 || !/type="module"/i.test(scripts[1][1])) {
    throw new Error('[build-core] 未在 wzry.html 中定位到主 <script type="module">');
  }
  return scripts[1][2];
}

function main() {
  if (!fs.existsSync(SOURCE_HTML)) {
    throw new Error(`找不到只读母本: ${SOURCE_HTML}`);
  }
  const html = fs.readFileSync(SOURCE_HTML, 'utf8');
  let code = extractMainModule(html);

  // ── 1. 提取原版 Se 英雄机械数值表作为 0 偏差基线，移除旧角色文本 ──
  const krSeStart = code.indexOf('kr=["panyue","chijin","xingli","fengling","yeque"],Se={panyue:');
  const krSeEnd = code.indexOf('};function z0(', krSeStart);
  if (krSeStart < 0 || krSeEnd < 0) {
    throw new Error('[build-core] 未找到 kr / Se 定义边界');
  }
  const seExpr = code.slice(code.indexOf('Se={panyue:', krSeStart) + 3, krSeEnd + 1);
  const Ry = Math.PI / 180;
  const origSe = new Function('Ry', `return (${seExpr});`)(Ry);

  const SANITIZE_META = {
    panyue: { name: '秦琼', title: '踏破山河' },
    chijin: { name: '花蕊夫人', title: '执剑凌风' },
    xingli: { name: '苏轼', title: '风起赤壁' },
    fengling: { name: '文成公主', title: '藏地迎宾' },
    yeque: { name: '辛弃疾', title: '单刀破敌营' },
  };
  const cleanKitBaselines = {};
  for (const [k, def] of Object.entries(origSe)) {
    const clone = structuredClone(def);
    clone.name = SANITIZE_META[k].name;
    clone.title = SANITIZE_META[k].title;
    clone.lore = '';
    clone.tips = '';
    clone.look = '';
    clone.passive.name = '';
    clone.passive.brief = '';
    clone.passive.desc = '';
    for (const slot of ['s1', 's2', 'ult']) {
      clone.skills[slot].name = '';
      clone.skills[slot].brief = '';
      clone.skills[slot].desc = '';
    }
    cleanKitBaselines[k] = clone;
  }

  const seReplacement = [
    `KIT_BASELINES=${JSON.stringify(cleanKitBaselines)},`,
    `kr=[...tsConfig.heroOrder],`,
    `Se=(()=>{const o={};for(const k of Object.keys(KIT_BASELINES)){const b=structuredClone(KIT_BASELINES[k]),h=tsConfig.heroesByKit[k];if(h){b.name=h.name;b.title=h.title;b.lore=h.lore;b.tips=h.tips;b.look=h.look;b.palette={...h.palette};}o[k]=b;}for(const id of tsConfig.heroOrder){const h=tsConfig.heroes[id],b=structuredClone(KIT_BASELINES[h.kitId]);b.id=id;b.kitId=h.kitId;b.name=h.name;b.title=h.title;b.era=h.era;b.motto=h.motto;b.lore=h.lore;b.tips=h.tips;b.look=h.look;b.palette={...h.palette};b.passive={...b.passive,...h.passive};b.skills={s1:{...b.skills.s1,...h.skills.s1},s2:{...b.skills.s2,...h.skills.s2},ult:{...b.skills.ult,...h.skills.ult}};o[id]=b;}return o;})()`,
  ].join('');
  code = code.slice(0, krSeStart) + seReplacement + code.slice(krSeEnd + 1);

  // ── 2. 注入顶部桥梁辅助函数 ──
  const prelude = `
  const KIT_MAP = tsConfig.kitMap;
  const kitOf = (id) => KIT_MAP[id] ?? id;
  const selectMatchTeams = tsConfig.selectMatchTeams;
  const heroCostume = (id, kitId) => tsConfig.heroes[id]?.costumePalette ?? tsConfig.heroesByKit[kitId]?.costumePalette;
  const heroVfx = (id, kitId) => {
    const p = tsConfig.heroes[id]?.vfxPalette ?? tsConfig.heroesByKit[kitId]?.vfxPalette;
    return p ? { glow: Lt(p.glow), hot: Lt(p.hot), deep: Lt(p.deep), accent: Lt(p.accent), dark: Lt(p.dark) } : null;
  };
  const isLiueUnit = (mgr, unitId) => unitId !== undefined && unitId >= 0 && mgr.anchor(unitId) && mgr.a.unit?.heroId === "liue";
  const xingliPal = (mgr, unitId) => isLiueUnit(mgr, unitId) ? (ws.liue ?? Zr) : (ws.sushi ?? Zr);
  const cloneForHeroes = (tbl) => {
    const out = { ...tbl };
    for (const id of tsConfig.heroOrder) {
      const k = kitOf(id);
      if (out[id] === void 0 && k in tbl) out[id] = tbl[k];
    }
    return out;
  };
  let _tsArchCache = null;
  let _tsFloraCache = null;
  let _tsBaseWallCache = null;
  let _tsRiverLily = null;
  let _tsRiverLotus = null;
  const _getTsPropsApi = () => ({ Be, ke, Ke, yf, gn, Xo, Ts, Ho, bs, Pt, Ht, yt, nn, un, vr, ae, Qc, Sn, env: Yt.env, waterLevel: Fn });
  const _mkTsProps = () => tsConfig.createLandmarkPropBuilders(_getTsPropsApi());
  const _tsPetalBurst = (n, x, y, z, cnt, r, spd, c1, c2) => {
    const p = n.particles.use(Mt.leaf).tint(c1, c2), d = n.rnd, c = n.n(cnt);
    for (let i = 0; i < c; i++) {
      const a = d.next() * Math.PI * 2, rad = r * Math.sqrt(d.next()), sz = d.range(.16, .3);
      p.spawn(x + Math.cos(a) * rad, y + d.range(.1, .8), z + Math.sin(a) * rad, Math.cos(a) * spd * d.range(.4, 1.1), d.range(1.2, 3.4), Math.sin(a) * spd * d.range(.4, 1.1), d.range(.55, .95), sz, sz * .75, d.next() * .08);
    }
  };
  const _tsSilkBurst = (n, x, y, z, cnt, r, spd, c1, c2) => {
    const p = n.particles.use(Mt.silk).tint(c1, c2), d = n.rnd, c = n.n(cnt);
    for (let i = 0; i < c; i++) {
      const a = d.next() * Math.PI * 2, rad = r * Math.sqrt(d.next()), sz = d.range(.16, .3);
      p.spawn(x + Math.cos(a) * rad, y + d.range(.2, 1.1), z + Math.sin(a) * rad, Math.cos(a) * spd * d.range(.4, 1), d.range(.6, 2.6), Math.sin(a) * spd * d.range(.4, 1), d.range(.65, 1.05), sz, sz * .85, d.next() * .1);
    }
  };
  const _tsEmberBurst = (n, x, y, z, cnt, r, spd, c1, c2) => {
    const p = n.particles.use(Mt.ember).tint(c1, c2), d = n.rnd, c = n.n(cnt);
    for (let i = 0; i < c; i++) {
      const a = d.next() * Math.PI * 2, rad = r * Math.sqrt(d.next()), sz = d.range(.14, .26);
      p.spawn(x + Math.cos(a) * rad, y + d.range(.2, .9), z + Math.sin(a) * rad, Math.cos(a) * spd * d.range(.3, 1), d.range(1.4, 3.8), Math.sin(a) * spd * d.range(.3, 1), d.range(.45, .85), sz, sz * .35, d.next() * .06);
    }
  };
  const _tsRuneBurst = (n, kind, x, y, z, cnt, r, spd, c1, c2) => {
    const m = kind === 1 ? Mt.rune1 : kind === 2 ? Mt.rune2 : Mt.rune3;
    if (!m) return;
    const p = n.particles.use(m).tint(c1, c2), d = n.rnd, c = n.n(cnt);
    for (let i = 0; i < c; i++) {
      const a = d.next() * Math.PI * 2, rad = r * Math.sqrt(d.next()), sz = d.range(.46, .78);
      p.spawn(x + Math.cos(a) * rad, y + d.range(.35, 1.3), z + Math.sin(a) * rad, Math.cos(a) * spd * d.range(.3, .9), d.range(1.2, 2.8), Math.sin(a) * spd * d.range(.3, .9), d.range(.55, .95), sz, sz * .85, d.next() * .08);
    }
  };
`;

  // ── 3. 真国风 BGM + 战鼓/寺钟/五声古琴 SFX + 中文战局播报 ──
  code = replaceBetween(
    code,
    'const MT={first_blood:',
    'function ST(n){const t=n.filter(e=>/^en([-_]|$)/i.test(e.lang));if(!t.length)return null;for(const e of kT){const s=t.find(i=>i.name.toLowerCase().includes(e));if(s)return s}return t.find(e=>/en[-_](us|gb)/i.test(e.lang))??t[0]}',
    'const MT={first_blood:"第一滴血",double_kill:"双杀",triple_kill:"三连破阵",quadra_kill:"四海惊雷",penta_kill:"五杀，名垂青史",killing_spree:"势如破竹",unstoppable:"锐不可当",legendary:"千古风流",shutdown:"终结连胜",ace:"敌军全灭",victory:"大获全胜",defeat:"败走沙场"},kT=[];function ST(n){const t=n.filter(e=>/^zh([-_]|$)/i.test(e.lang));return t[0]??null}',
    'MT & ST Chinese voice announcements',
  );
  code = assertReplace(
    code,
    'o.lang=this.voice?.lang??"en-US",this.voice&&(o.voice=this.voice)',
    'if(!this.voice)return;o.lang=this.voice.lang,o.voice=this.voice',
    'TT.say require Chinese voice (no English fallback)',
  );
  code = assertReplace(
    code,
    'this.mixer=new Ny(this.ctx),this.mixer.kit.reseed(Date.now()),this.music=new Ky(this.mixer),',
    'this.mixer=new Ny(this.ctx),this.mixer.kit.reseed(Date.now()),tsConfig.attachSfx?.(this.mixer,r1),this.music=tsConfig.createMusicController?.(this.mixer)??new Ky(this.mixer),',
    'DT.unlock attach TangSong BGM & procedural SFX',
  );

  // ── 4. 3D《千里江山图》青绿暖金全局调色盘 Yt & 后处理 grade & 光影 ──
  code = replaceBetween(
    code,
    'const Yt={blue:',
    ',rimWarm:16771524,kickCool:12575487}}',
    'const Yt=tsConfig.palette',
    'Yt 3D Tang-Song palette',
  );
  code = assertReplace(
    code,
    'this.grade={exposure:.98,bloomStrength:.55,saturation:k0.saturation,vibrance:k0.vibrance,contrast:k0.contrast,pivot:k0.pivot,vignette:.2,shadowTint:new Ut(-.01,-.002,.022),highlightTint:new Ut(.018,.008,-.014),haze:.06,',
    'this.grade={exposure:tsConfig.grade.exposure,bloomStrength:tsConfig.grade.bloomStrength,saturation:k0.saturation,vibrance:k0.vibrance,contrast:k0.contrast,pivot:k0.pivot,vignette:.18,shadowTint:new Ut(...tsConfig.grade.shadowTint),highlightTint:new Ut(...tsConfig.grade.highlightTint),haze:tsConfig.grade.haze,',
    'Renderer grade warm Song tones',
  );

  // ── 5. 地图植物（迎客古松/汴河垂柳/翠竹林/古柏/御苑花丛/苔石灵芝）、城墙与御街牌坊/虹桥、太湖石灯亭 ──
  code = replaceBetween(
    code,
    'function c2(n,t){',
    'thick:.62})}return bs(e)}',
    'const _getTsFlora=()=>_tsFloraCache??=tsConfig.createFlora({Be,ke,gn,Ho,Ts,bs,Pt,Ht,yt,nn,Dn,Rh,Ch});function c2(n,t){return _getTsFlora().ancientPine(n,t)}function fN(n){return _getTsFlora().willow(n)}function dN(n){return _getTsFlora().bamboo(n)}function hN(n){return _getTsFlora().cypress(n)}function uN(n){return _getTsFlora().shrub(n)}',
    'c2..uN Tang-Song ancient pine, willow, bamboo, cypress, garden shrub',
  );
  code = replaceBetween(
    code,
    'function mN(n){',
    'e.quad(S,b,w,T)}}return bs(e)}',
    'function mN(n){return _getTsFlora().lingzhi(n)}',
    'mN mushrooms -> mossy bluestone Lingzhi clusters',
  );
  code = assertReplace(
    code,
    'function gN(n){const t=new ke(n),e=new Be,s=2+t.int(2);for(let i=0;i<s;i++){const a=i*t.range(.16,.24),o=t.range(.2,.32)*(1-i*.15),r=t.range(-.15,.15),l=[.45,.45,.45],c=[.86,.86,.86],f=e.vertex(-.03,a+.07,r,l,.2,1,0,0,0,1,.7),d=[],h=6;for(let m=0;m<=h;m++){const x=-Math.PI/2+m/h*Math.PI;d.push(e.vertex(Math.cos(x)*o,a,r+Math.sin(x)*o*1.2,c,Math.cos(x)*.5,.8,Math.sin(x)*.5,0,.5,1))}for(let m=0;m<h;m++)e.tri(f,d[m+1],d[m]);const u=e.vertex(-.03,a-.07,r,[.7,.66,.56],0,-1,0);for(let m=0;m<h;m++)e.tri(u,d[m],d[m+1])}return bs(e)}',
    'function gN(n){return _getTsFlora().cliffMoss(n)}',
    'gN cliff glowing cyan fungi -> warm mahogany Lingzhi shelf',
  );
  code = assertReplace(
    code,
    'const E=a.claim(k.x,k.z,10),A=E?XN(u3(e,k.x,k.z,l),.7):yt(14262384);n.add(l.pick(t.brackets),ae(k.x-k.ox*.06,l.range(.25,.42),k.z-k.oz*.06,S,l.range(.9,1.4)),{shadow:!1,tint:A,maskedTint:!0,glow:E?.45:0,rank:E?li:gs(k.x,k.z)}),E&&i.glows.push({x:k.x+k.ox*.4,z:k.z+k.oz*.4,y:.03,r:1,color:A})',
    'const A=yt(0xc48248);n.add(l.pick(t.brackets),ae(k.x-k.ox*.06,l.range(.25,.42),k.z-k.oz*.06,S,l.range(.9,1.4)),{shadow:!1,tint:A,maskedTint:!0,glow:0,rank:gs(k.x,k.z)})',
    't.brackets cliff shelf warm tint zero glow',
  );
  code = assertReplace(
    code,
    'function __(n,t,e,s,i=!1){const a=new ke(n),o=new Be,r=yt(3107397),l=yt(5938262),c=2+a.int(2),f=i?.6:1;for(let d=0;d<c;d++){const h=d/c*Dn+a.range(-.5,.5),u=a.range(.9,1.5)*f,m=a.range(.35,.6)*f,x=Math.cos(h),p=Math.sin(h),g=x*m,y=p*m;gn(o,[[0,-.05,0,.05*f],[x*m*.25,u*.6,p*m*.25,.04*f],[x*m*.7,u,p*m*.7,.03*f],[g,u*.86,y,.02*f]],{sides:3,c0:r,c1:l,sway0:0,sway1:.5});const v=a.range(.13,.18)*(i?.75:1);Ts(o,g,u*.86-v*1.1,y,v,v*1.25,v,{detail:1,seed:n+d,bottom:t,top:e,glow:s,swayBottom:.55,swayTop:.5,team:i?1:0})}for(let d=0;d<4;d++){const h=d/4*Dn+a.range(-.3,.3);Dx(o,0,.02,0,Math.cos(h),Math.sin(h),.36*f,.07*f,.14*f,.06,r,l,.15,2)}return bs(o)}',
    'function __(n,t,e,s,i=!1){return _getTsFlora().gardenLantern(n,!!i)}',
    '__ lanterns & bells -> Tang-Song timber palace lamp post & stone snow lantern',
  );
  code = assertReplace(
    code,
    'const T=Pt(oh,[1,1,1],.25);n.add(y.pick(t.bells),',
    'const T=yt(0xffd278);n.add(y.pick(t.bells),',
    't.bells warm stone lantern glow tint',
  );
  code = assertReplace(
    code,
    'shield:[new Ut(5813503),new Ut(16738882)],xAlly:new Ut(5810943),',
    'shield:[new Ut(0xe8be62),new Ut(0xe66a44)],xAlly:new Ut(0x5ca4d6),',
    'Unit shields gold/vermilion silk + indigo ally xray',
  );
  code = assertReplace(
    code,
    '(D.kind==="hero"?.85:.6)*Y',
    '(D.kind==="hero"?(D.isPlayer?.88:.54):.48)*Y',
    'Unit foot ring balanced alpha (reduce cyan ally glare)',
  );
  code = replaceBetween(
    code,
    'function MN(){',
    'return n.quad(h,u,m,x),bs(n)}',
    'function MN(){return _mkTsProps().banner}',
    'MN banner -> Tang-Song double-sided swallowtail marshal banner',
  );
  code = replaceBetween(
    code,
    'function v_(n,t){const e=new ke(n),s=new Be,',
    'bottom:[.22,.24,.3],top:[.4,.43,.5],flat:!0}),bs(s)}',
    'function v_(n,t){return tsConfig.buildTaihuRock({Be,ke,gn,Xo,Ts,bs,Pt,Ht,yt},n,t)}',
    'v_ crystals -> Taihu Scholar Lantern Rocks & Shrine Pagoda',
  );
  code = replaceBetween(
    code,
    'function XF(){const n=new Be;',
    'top:Ht(_f,1.2),glow:.2}),n.build()}',
    'function XF(){return tsConfig.buildPalaceLantern({Be,ke,gn,Xo,Ts,bs,Pt,Ht,yt}).build()}',
    'XF starLamp -> Tang-Song Palace Lantern',
  );
  code = replaceBetween(
    code,
    'function SN(){const n=new Be;',
    ',bs(n)}',
    'function SN(){return tsConfig.buildBrazierEmber({Be,ke,gn,Xo,Ts,bs,Pt,Ht,yt})}',
    'SN wall brazier cyan crystal -> warm flame embers',
  );
  code = replaceBetween(
    code,
    'function pB(n,t){const e=new Ls;',
    ',e.build()}',
    'function pB(n,t){const e=new Ls;e.crease=36,e.paint(0x284d4a,{c2:0x528078,gloss:.35,mat:K.rock}),e.lathe([[-.14,t*.88],[-.04,t*.94],[0,t*.92]],{seg:16}),e.paint(0xe6ba54,{gloss:1,mat:K.metal}),e.g(pt(0,.002,0),()=>e.torus(t*.9,.014,.01,16,4,{crease:30}));const s=[n.r,n.g,n.b];return e.paint(s,{glow:.28}),e.g(pt(0,.004,0),()=>e.torus(t*.68,.012,.008,16,4,{crease:30})),e.paint([.35,.58,.54],{glow:.06}),e.g(pt(0,.003,0),()=>e.torus(t*.42,.009,.006,12,4)),e.build()}',
    'pB hero pedestal -> Low-Profile Song Celadon-Jade Engraved Lotus Disk',
  );
  code = assertReplace(
    code,
    'accentTrees:[c2(211,{dark:12085892,mid:15247800,light:16770026}),c2(223,{dark:9071156,mid:12884554,light:15257742})]',
    'accentTrees:[c2(211,tsConfig.accentTrees.redPlum),c2(223,tsConfig.accentTrees.goldenGinkgo),c2(239,tsConfig.accentTrees.crimsonMaple),c2(251,tsConfig.accentTrees.burntAmber)]',
    'CN accentTrees red plum, golden ginkgo, crimson maple & burnt amber',
  );
  code = assertReplace(
    code,
    'L<.09?n.add(t.accentTrees[L<.05?0:1],',
    'L<.68?n.add(t.accentTrees[Math.min(t.accentTrees.length-1,Math.floor(L/.68*t.accentTrees.length))],',
    'JN rich autumn/spring Tang-Song accent tree dominance',
  );
  code = assertReplace(
    code,
    'd3=[{stone:yt(Yt.blue.stone),stoneDark:yt(Yt.blue.stoneDark),trim:yt(Yt.blue.trim),glow:yt(Yt.blue.glow),crystal:[Ht(yt(Yt.blue.glow),.7),Pt(yt(Yt.blue.glow),[1,1,1],.35)],crystalTint:yt(Yt.blue.glow),crystalGlow:1,cloth:yt(3108832)},{stone:yt(6969954),stoneDark:yt(Yt.red.stoneDark),trim:yt(Yt.red.trim),glow:yt(Yt.red.glow),crystal:[yt(14039574),yt(15882790)],crystalTint:yt(15222814),crystalGlow:.4,cloth:yt(14169388)}]',
    'd3=[{stone:yt(Yt.blue.stone),stoneDark:yt(Yt.blue.stoneDark),trim:yt(Yt.blue.trim),glow:yt(Yt.blue.glow),crystal:[Ht(yt(Yt.blue.glow),.7),Pt(yt(Yt.blue.glow),[1,1,1],.35)],crystalTint:yt(0xffb44c),crystalGlow:.85,cloth:yt(0x265680)},{stone:yt(0x5c4a40),stoneDark:yt(Yt.red.stoneDark),trim:yt(Yt.red.trim),glow:yt(Yt.red.glow),crystal:[yt(0xd9442e),yt(0xf58b60)],crystalTint:yt(0xff8c40),crystalGlow:.85,cloth:yt(0xc9352a)}]',
    'd3 base wall/flag/warm ember brazier palette',
  );
  code = replaceBetween(
    code,
    'function LN(n){',
    'dispose:()=>Object.values(e).forEach(s=>s.dispose())}}',
    'const _getBaseWallB=()=>_tsBaseWallCache??=tsConfig.createBaseWallBuilders(_getTsPropsApi());function w_(n){const t=d3[n],bw=_getBaseWallB(),e={gatePillar:bw.gatePillar(t),gateCrystal:bw.gateCrystal(t),merlon:bw.merlon(t),buttress:bw.buttress(t),emblem:bw.emblem(t,n===1),lowLamp:bw.lowLamp(t)};return{...e,dispose:()=>Object.values(e).forEach(s=>s.dispose())}}',
    'LN..w_ Tang-Song blue-brick merlons, gate towers, dragon plaques, white marble lamps',
  );
  code = assertReplace(
    code,
    'const i=[],a=n.map.bound,{pts:o,sideStart:r}=aF(a,1.25),l=Px(o),c=l.length,f=yt(Yt.blue.stone),d=yt(Yt.blue.stoneDark),h=yt(6969954),u=yt(Yt.red.stoneDark)',
    'const i=[],a=n.map.bound,{pts:o,sideStart:r}=aF(a,1.25),l=Px(o),c=l.length,f=yt(0x8c8578),d=yt(0x4a453e),h=yt(0x5c473e),u=yt(0x2d211c)',
    'lF base border wall Chang-an weathered bluestone & vermilion dark stone colors',
  );
  code = replaceBetween(
    code,
    'function uF(n,t,e,s,i,a){',
    'b(l,g,y,-.02,h,-C,.3,-R))}}',
    'function uF(n,t,e,s,i,a){return _getBaseWallB().fountainCurb(n,t,e,s,i,a)}',
    'uF white marble octagonal lotus fountain curb',
  );
  code = replaceBetween(
    code,
    'function yF(n){',
    'sway1:.2,thick:.6}),t.build()}',
    'function yF(n){const t=new Be;return Ho(t,0,.22,0,.55,{lobes:5,dark:yt(0x2c3b4a),mid:yt(0x556e85),light:yt(0xd6e2eb),seed:n,sway0:.05,sway1:.2,thick:.52}),Ho(t,.4,.14,.2,.36,{lobes:5,dark:yt(0x2c3b4a),mid:yt(0x556e85),light:yt(0xd6e2eb),seed:n+3,sway0:.05,sway1:.2,thick:.52}),t.build()}',
    'yF frostShrub -> indigo-slate frost pine shrub',
  );
  code = replaceBetween(
    code,
    'const l={frostBranch:[O_(401),O_(409)],',
    'rune:[V_(479),V_(487)]},c=new Map',
    'const _cp=_mkTsProps(),l={frostBranch:_cp.frostBranch,frostShrub:yF(419),charStump:_cp.charStump,vent:_cp.vent,log:_cp.log,lampFlower:_cp.lampFlower,starArc:_cp.starArc,meteor:[G_(463),G_(467)],rune:_cp.rune},c=new Map',
    '_F jungle camp props Tang-Song replacement',
  );
  code = replaceBetween(
    code,
    'function q_(n){',
    'Object.values(n))Array.isArray(e)?t.push(...e):t.push(e);return{...n,dispose:()=>t.forEach(e=>e.dispose())}}',
    'function ZF(){const p=_mkTsProps(),n={starLamp:XF(),steles:p.steles,fallenSteles:p.fallenSteles,flag:p.flag,mooringPosts:p.mooringPosts,watcher:p.watcher,inlayArcs:p.inlayArcs,bridgeRail:p.bridgeRail,archways:p.archways,riverLanterns:p.riverLanterns},t=[];for(const e of Object.values(n))Array.isArray(e)?t.push(...e):t.push(e);return{...n,dispose:()=>t.forEach(e=>e.dispose())}}',
    'q_..ZF Guardian Stone Lion, Chishou Stele, Bridge Rails, Archways, River Lanterns',
  );
  code = assertReplace(
    code,
    'tint:Ht([1,1,1],l.range(.82,.98)),glow:1}))}u-=g}}}',
    'tint:Ht([1,1,1],l.range(.82,.98)),glow:1}))}u-=g}}tsConfig.addTangSongRiverLandmarks?.(_getTsPropsApi(),n,{...t,lilyPads:_tsRiverLily,lotusBud:_tsRiverLotus},e,i,o)}',
    'eU place Hongqiao bridge rails, mid archways & river lotus lanterns',
  );
  code = assertReplace(
    code,
    'const C=CN(),R=ZF();',
    'const C=CN(),R=ZF();_tsRiverLily=C.lilyPads;_tsRiverLotus=C.lotusBud;',
    'nw capture lilyPads & lotusBud for Bianhe river scatter',
  );
  code = replaceBetween(
    code,
    'function aU(){',
    'c.frustumCulled=!1,c}',
    'function aU(){return tsConfig.buildTangSongHorizon(_getTsPropsApi())}',
    'aU Tang-Song emerald-blue misty peaks & far pagodas (remove alien crystal obelisk)',
  );
  code = assertReplace(
    code,
    'const c=[yt(3108832),yt(14169388)];',
    'const c=[yt(0x265680),yt(0xc9352a)];',
    'eU tower banner colors',
  );
  code = assertReplace(
    code,
    'const Q=oU();d.add(Q),i("misc");',
    'const Q=oU();d.add(Q);const _tsWild=tsConfig.createWildlife?.({Be,Ji,Sn,Qc,gn,yt,ke,mapSdf:r,waterLevel:Fn})??null;_tsWild&&(d.add(_tsWild.group),e.wildlife=_tsWild.count);i("misc");',
    'nw attach ambient wildlife (koi, white cranes, butterflies)',
  );
  code = assertReplace(
    code,
    'mt.setFountainAlert(1,Z[1])}',
    'mt.setFountainAlert(1,Z[1]),_tsWild?.update?.(j.dt)}',
    'nw update ambient wildlife',
  );
  code = assertReplace(
    code,
    'dispose(){jM(d),',
    'dispose(){_tsWild?.dispose?.(),jM(d),',
    'nw dispose ambient wildlife',
  );
  code = assertReplace(
    code,
    'const E=Pt(yt(Yt.env.crystal),yt(9411839),o.next()),A=o.range(1.5,2.6);n.add(o.pick(t.bigCrystals),ae(y,b-.2,v,o.range(0,6.28),A,A,o.range(-.15,.15),o.range(-.15,.15)),{tint:E,glow:.9,rank:li}),i.glows.push({x:y,z:v,y:b+.1,r:5.5,color:E})',
    'const E=[1,.98,.94],A=o.range(1.15,1.65);n.add(o.pick(t.bigCrystals),ae(y,b-.15,v,o.range(0,6.28),A,A,0,0),{tint:E,glow:1,rank:li})',
    'bigCrystals upright carved stone lantern pavilion monument',
  );

  // ── 5B. 唐宋地表青石御道、贴花莲瓣八卦阵、护盾云纹薄纱、金秋地面/夯土/斧劈崖纹与叠山太湖石 ──
  code = replaceBetween(
    code,
    'function DF(n=1024){',
    ',{repeat:!0,anisotropy:8})}',
    'function DF(n=1024){return tsConfig.buildTangSongGroundTexture(n,{fx,k8,ke,un,nh})}',
    'DF green grass ground tex -> golden autumn leaves & dry-grass tex',
  );
  code = replaceBetween(
    code,
    'function zF(n,t,e){',
    ',{repeat:!0,anisotropy:8})}',
    'function zF(n,t,e){return tsConfig.buildTangSongDirtTexture(n,t,e,{fx,k8,ke,un,nh})}',
    'zF rammed-earth & chipped bluestone ancient road tex',
  );
  code = replaceBetween(
    code,
    'function hL(){',
    ',{repeat:!0,anisotropy:4}))}',
    'function hL(){return tsConfig.buildTangSongCliffTexture({fL,fx,ke,un,nh,Og})}',
    'hL Song Dynasty ax-cut (大斧劈皴) cliff rock tex',
  );
  code = replaceBetween(
    code,
    'function y_(n,t){',
    'return s.computeNormals(35),bs(s)}',
    'function y_(n,t){return tsConfig.buildTaihuBoulder({Be,ke,gn,Xo,Ts,bs,Pt,Ht,yt},n,t)}',
    'y_ low-poly boulders -> Song Taihu limestone & stratified shale rocks',
  );
  code = assertReplace(
    code,
    'BN=yt(9411154),HN=yt(7037254)',
    'BN=yt(0x9a825b),HN=yt(0x6b5c47)',
    '$N warm autumn cliff crown ochre tones',
  );
  code = assertReplace(
    code,
    'bare:a.chance(.28)',
    'bare:a.chance(.62)',
    '$N expose more bare ink-wash rock strata on cliffs',
  );
  code = assertReplace(
    code,
    'function xN(n){const t=new ke(n),e=new Be,s=yt(3107400),i=yt(8368730),a=5+t.int(3);for(let o=0;o<a;o++){const r=o/a*Dn+t.range(-.35,.35),l=t.range(.42,.7);Dx(e,0,0,0,Math.cos(r),Math.sin(r),l,t.range(.07,.1),l*t.range(.45,.7),l*.3,s,Pt(i,[.7,.9,.5],t.next()*.4),.6)}return bs(e)}',
    'function xN(n){const t=new ke(n),e=new Be,s=yt(0x5e4728),i=yt(0xa87c3e),a=5+t.int(3);for(let o=0;o<a;o++){const r=o/a*Dn+t.range(-.35,.35),l=t.range(.42,.7);Dx(e,0,0,0,Math.cos(r),Math.sin(r),l,t.range(.07,.1),l*t.range(.45,.7),l*.3,s,Pt(i,[.88,.76,.46],t.next()*.4),.6)}return bs(e)}',
    'xN autumn russet ferns',
  );
  code = assertReplace(
    code,
    'function yN(n){const t=new ke(n),e=new Be,s=yt(3828286),i=yt(7317584),a=yt(10274918),',
    'function yN(n){const t=new ke(n),e=new Be,s=yt(0x5c2d1e),i=yt(0x9e4028),a=yt(0xd47c3e),',
    'yN crimson autumn cliff creepers',
  );
  code = assertReplace(code, 'i=yt(10668128)', 'i=yt(0xc29b59)', 'vN autumn cliff drapes');
  code = assertReplace(
    code,
    'function bN(n){const t=new ke(n),e=new Be,s=yt(4880956),i=yt(11059046);',
    'function bN(n){const t=new ke(n),e=new Be,s=yt(0x634a28),i=yt(0xd4af6a);',
    'bN autumn golden reeds',
  );
  code = assertReplace(
    code,
    'function wN(n){const t=new ke(n),e=new Be,s=yt(5212740),i=yt(8368206),a=yt(11849576),',
    'function wN(n){const t=new ke(n),e=new Be,s=yt(0x6b5632),i=yt(0x9e8048),a=yt(0xd1b370),',
    'wN autumn dry grass tufts',
  );
  code = assertReplace(
    code,
    'function EN(n){const t=new ke(n),e=new Be,s=yt(4165461),i=yt(7977058),a=yt(5216848),',
    'function EN(n){const t=new ke(n),e=new Be,s=yt(0x4d5438),i=yt(0x7a7b4c),a=yt(0x5c5b3a),',
    'EN autumn bronze-olive lotus pads',
  );
  code = assertReplace(
    code,
    'broadleaf:$e({scale:1.1,sprite:Ft.broadleaf,add:0,color:9417818,color2:6261306,',
    'broadleaf:$e({scale:1.1,sprite:Ft.broadleaf,add:0,color:0xc99642,color2:0x8c5624,',
    'Mt.broadleaf autumn golden-ochre leaves',
  );
  code = assertReplace(
    code,
    'cPit:{value:new Ut(1327214)},cSky:{value:new Ut(14677247)},',
    'cPit:{value:new Ut(0x162530)},cSky:{value:new Ut(0xe6cfa8)},',
    'dU water shader warm sky reflection & deep indigo pit',
  );
  code = assertReplace(
    code,
    'k0={contrast:1.08,pivot:.42,saturation:1.06,vibrance:.07}',
    'k0={contrast:1.12,pivot:.42,saturation:.95,vibrance:.04}',
    'k0 painterly golden-autumn tone grade',
  );
  code = replaceBetween(
    code,
    'function FF(n,t=512,e=8){',
    'normal:g3(w,t,e)}}',
    'function FF(n,t=512,e=8){return tsConfig.buildTangSongStoneTexture(n,t,e,{ke,g3,lh,Vc,un,u1,so})}',
    'FF Voronoi cobbles -> Tang-Song coursed bluestone ashlar slabs',
  );
  code = replaceBetween(
    code,
    'const float TAU = 6.2831853;\n\nfloat band(float x',
    'paint *= mix(uShadeTintGround, vec3(1.0), shadow);',
    '${tsConfig.terrainShaders.mfBody}',
    'MF ground decal stars/runes -> Tang-Song lotus, bagua & bronze key-fret',
  );
  code = assertReplace(
    code,
    'kF={mossback:{glow:12116090,stone:11120804},glimwing:{glow:8382688,stone:10793140},frost_golem:{glow:8377599,stone:12178408},ember_golem:{glow:16742956,stone:5916224},abyss_drake:{glow:11041023,stone:2365512},star_colossus:{glow:16765040,stone:4864536}}',
    'kF={mossback:{glow:0xd6a652,stone:0x9c8b6e},glimwing:{glow:0xe8b862,stone:0x9e8f76},frost_golem:{glow:0x6ba6cc,stone:0x8c9aa6},ember_golem:{glow:0xe86432,stone:0x523b2c},abyss_drake:{glow:0x4c8ab0,stone:0x223645},star_colossus:{glow:0xe2a846,stone:0x4a3d28}}',
    'kF Tang-Song autumn & indigo camp decal colors',
  );
  code = replaceBetween(
    code,
    '// 轴线：一条略亮的整石带，两侧细缝，中线嵌发光条',
    'albedo = mix(albedo, plaza, plazaMask);',
    '${tsConfig.terrainShaders.gfPlaza}',
    'GF base plaza glowing cyan conduits -> imperial marble processional steps',
  );
  code = replaceBetween(
    code,
    '// 水底星屑：稀疏成簇的发光碎晶，缓慢闪烁',
    'col += emissive;',
    '${tsConfig.terrainShaders.gfRiver}',
    'GF riverbed sci-fi star dust -> golden sunlight ripple shimmer',
  );
  code = assertReplace(
    code,
    'cLeaf:{value:[u(13208116),u(9145918),u(10704174)]}',
    'cLeaf:{value:[u(0xb83524),u(0xd8a336),u(0x7c5b32)]}',
    'GF cLeaf maple red & ginkgo gold fallen leaf colors',
  );
  code = replaceBetween(
    code,
    'void main() {\n  // 到最近格心的六边形距离 d',
    'gl_FragColor = vec4(vCol * alpha * 0.45 + kitAdditive(vCol * glow), alpha);',
    '${tsConfig.terrainShaders.woBody}',
    'WO cyan hex honeycomb shield -> translucent Tang-Song gilded cloud-fret veil',
  );

  // ── 6. 3D 建筑工坊：唐宋重檐飞角箭楼、三层圜丘社稷玉玺坛、焦土遗墟 ──
  code = replaceBetween(
    code,
    'const IO={"tower:1:0":()=>Ec(1,0),',
    '"ruin:1":()=>Xw(1)};',
    'const _getTsArch=()=>(_tsArchCache??=tsConfig.createArchitectureBuilders({Wa,Ls,pt,bt,Ct,Xe,Kn,Ux,K,En,$x,rs,qi,xa,ao,jc})),IO={"tower:1:0":()=>_getTsArch().tower(1,0),"tower:2:0":()=>_getTsArch().tower(2,0),"tower:3:0":()=>_getTsArch().tower(3,0),"tower:1:1":()=>_getTsArch().tower(1,1),"tower:2:1":()=>_getTsArch().tower(2,1),"tower:3:1":()=>_getTsArch().tower(3,1),"core:0":()=>_getTsArch().core(0),"core:1":()=>_getTsArch().core(1),"ruin:0":()=>_getTsArch().ruin(0),"ruin:1":()=>_getTsArch().ruin(1)};',
    'IO Tang-Song Pagoda Towers & Imperial Core & Ruins',
  );

  // ── 7. 相机 WL 三档预设 & 雾效拉远 ──
  code = assertReplace(
    code,
    'class WL{camera;shakeEnabled=!0;bounds={minX:-57.5,maxX:57.5,minZ:-57.5,maxZ:57.5};pitch=p1*ua;distance=ab;lead=0;tall=0;tanHalf=Math.tan(Bu/2*ua);',
    'class WL{preset=tsConfig.getCameraPreset();camera;shakeEnabled=!0;bounds={minX:-57.5,maxX:57.5,minZ:-57.5,maxZ:57.5};pitch=this.preset.pitch*ua;distance=this.preset.distance;lead=0;tall=0;tanHalf=Math.tan(this.preset.fov/2*ua);',
    'WL class fields',
  );
  code = assertReplace(
    code,
    'constructor(){this.camera=new Yi(Bu,this.aspect,1,900),this.camera.up.set(0,1,0),this.applyLens()}',
    'constructor(){this.camera=new Yi(this.preset.fov,this.aspect,1,900),this.camera.up.set(0,1,0),this.applyLens()}setPreset(k){this.preset=tsConfig.getCameraPreset(k),this.applyLens(),this.snapped=!1}',
    'WL constructor + setPreset',
  );
  code = assertReplace(
    code,
    'let s=Bu,i=ab;const a=IL/this.aspect;i*Math.tan(s/2*ua)<a&&(s=Math.min(PL,Math.atan(a/i)*2/ua),i=Math.max(i,a/Math.tan(s/2*ua))),t.fov=s,this.tall=e,this.distance=i,this.pitch=(p1+(LL-p1)*e)*ua,',
    'const pr=this.preset;let s=pr.fov,i=pr.distance;const a=pr.portraitHalfW/this.aspect;i*Math.tan(s/2*ua)<a&&(s=Math.min(pr.portraitMaxFov,Math.atan(a/i)*2/ua),i=Math.max(i,a/Math.tan(s/2*ua))),t.fov=s,this.tall=e,this.distance=i,this.pitch=(pr.pitch+(pr.portraitPitch-pr.pitch)*e)*ua,',
    'WL applyLens preset',
  );
  code = assertReplace(
    code,
    'fov:t.fov??Bu}:null',
    'fov:t.fov??this.preset.fov}:null',
    'WL setOverride fov',
  );
  code = assertReplace(
    code,
    'this.scene.fog=new tx(Yt.env.fog,42,520)',
    'this.scene.fog=new tx(Yt.env.fog,64,560)',
    'Scene fog range for wide/standard camera',
  );

  // Keep dense, shadow-casting scenery in smaller cells. Light scatter can share larger draws.
  code = replaceBetween(
    code,
    'class c_{constructor(t=32)',
    'let a=this.cells.get(i);',
    `class c_{constructor(cell=32,detailCell=cell){this.cell=cell;this.detailCell=detailCell}cells=new Map;
    builder(t,e,s){const size=s?this.cell:this.detailCell;
      const i=[Math.floor(t/size),Math.floor(e/size),s?1:0].join(",");let a=this.cells.get(i);`,
    'scenery batch sizes by caster type',
  );
  code = assertReplace(code, 'const I=new c_(32),P=ZN()', 'const I=new c_(16,32),P=ZN()', 'partition dense scenery');
  // Draw the expensive ground shader after opaque cover. At equal depth the decoration wins.
  code = assertReplace(
    code,
    'y.name="ground",y.receiveShadow=!0',
    'y.name="ground",y.renderOrder=1,g.depthFunc=g5,y.receiveShadow=!0',
    'depth-test covered ground before shading it',
  );
  code = replaceBetween(
    code,
    'const w=[],T=j=>{for(const at of j){at.frustumCulled=!1;',
    'w.push({mesh:at,box:Rt})}};',
    `const w=[],T=meshes=>{
      for(const mesh of meshes){
        mesh.frustumCulled=false;
        const bounds=mesh.geometry.boundingBox.clone().expandByScalar(.8);
        const shadowBounds=mesh.castShadow?bounds.clone():bounds;
        if(mesh.castShadow){
          const reach=hU*KL, dx=mf.x*reach, dz=mf.y*reach;
          shadowBounds.min.x+=Math.min(0,dx);shadowBounds.max.x+=Math.max(0,dx);
          shadowBounds.min.z+=Math.min(0,dz);shadowBounds.max.z+=Math.max(0,dz);
        }
        w.push({mesh,bounds,shadowBounds,box:bounds});
      }
    };`,
    'retain wind and projected shadow bounds',
  );
  code = assertReplace(
    code,
    'for(const at of w)Zz(at.mesh,j.sceneryRank,j.shadowRank)',
    'for(const chunk of w){Zz(chunk.mesh,j.sceneryRank,j.shadowRank);chunk.box=j.shadows?chunk.shadowBounds:chunk.bounds}',
    'switch culling bounds with shadow quality',
  );

  // Sample live match frames. Prewarming, simulation speed and pause menus must not drive resolution.
  code = assertReplace(code, 'resScale=1;slowTime=0;slowFrames=0;slowWindows=0;',
    'resolution=new tsConfig.RenderResolution();get resScale(){return this.resolution.scale}', 'renderer resolution controller');
  code = assertReplace(code, 'this.resScale=1,this.slowWindows=0,this.applyQuality()',
    'this.resolution=new tsConfig.RenderResolution(),this.applyQuality()', 'reset resolution on quality change');
  code = assertReplace(code, 'this.adaptiveResolution&&this.trackPerformance(t),this.fpsAccum>=.5',
    'this.fpsAccum>=.5', 'exclude synthetic renders from resolution samples');
  code = replaceBetween(code, 'trackPerformance(t){if(this.slowTime+=t', 'getStats(){return this.stats}',
    'trackPerformance(dt){if(this.resolution.sample(dt))this.resize()}getStats(){return this.stats}', 'apply resolution transitions');
  code = assertReplace(code, 'q(lt.dt),d?.render(v,lt.alpha,lt.dt);const Y=to();',
    'q(lt.dt),d?.render(v,lt.alpha,lt.dt);if(d?.engine.adaptiveResolution)d.engine.trackPerformance(lt.paused||v.over?0:lt.dt);const Y=to();', 'sample active match frame times');

  // ── 8. 设置默认值 dk、持久化 yH、设置面板 wH、默认英雄与 storage keys ──
  code = assertReplace(
    code,
    'const dk={quality:"high",masterVolume:.8,sfxVolume:.9,musicVolume:.5,showFps:!1,cameraShake:!0,autoBuy:!0,tutorial:!0,objectiveHints:!0},hk="wangzhe.settings.v1"',
    'const dk={quality:"high",cameraPreset:tsConfig.getInitialCameraPresetKey(),eyesCutin:!0,masterVolume:.8,sfxVolume:.9,musicVolume:.5,showFps:!1,cameraShake:!0,autoBuy:!0,tutorial:!0,objectiveHints:!0},hk="tsry.settings.v1"',
    'settings defaults dk + hk',
  );
  code = assertReplace(
    code,
    'typeof e.objectiveHints=="boolean"&&(t.objectiveHints=e.objectiveHints)),t}',
    'typeof e.objectiveHints=="boolean"&&(t.objectiveHints=e.objectiveHints),e.cameraPreset!==void 0&&(t.cameraPreset=tsConfig.getCameraPreset(e.cameraPreset).key),typeof e.eyesCutin=="boolean"&&(t.eyesCutin=e.eyesCutin)),t}',
    'yH restore cameraPreset & eyesCutin',
  );
  code = assertReplace(
    code,
    'function vH(n){Wx(hk,JSON.stringify(n))}',
    'function vH(n){Wx(hk,JSON.stringify(n)),n?.cameraPreset&&tsConfig.saveCameraPreset(n.cameraPreset)}',
    'vH persist cameraPreset',
  );
  code = assertReplace(
    code,
    'const pk="wangzhe.lastChoice.v1",P2={heroId:"chijin",difficulty:"easy"}',
    'const pk="tsry.lastChoice.v1",P2={heroId:"sushi",difficulty:"easy"}',
    'lastChoice key & default hero',
  );
  code = assertReplace(
    code,
    'const xk="wangzhe.hud.tips.v1";',
    'const xk="tsry.hudTipsDismissed.v1";',
    'hud tips storage key',
  );
  code = assertReplace(
    code,
    ',s=z("p","sf-field__hint"),i=V8({options:[{value:"low",label:"低"},{value:"medium",label:"中"},{value:"high",label:"高"}],value:n.get().quality,label:"画质",onChange:w=>{n.update({quality:w}),s.textContent=E4[w]}});',
    ',s=z("p","sf-field__hint"),i=V8({options:[{value:"low",label:"低"},{value:"medium",label:"中"},{value:"high",label:"高"}],value:n.get().quality,label:"画质",onChange:w=>{n.update({quality:w}),s.textContent=E4[w]}}),cpHint=z("p","sf-field__hint"),cp=V8({options:tsConfig.cameraPresetList.map(w=>({value:w.key,label:w.shortLabel})),value:n.get().cameraPreset,label:"镜头视角",onChange:w=>{n.update({cameraPreset:w}),cpHint.textContent=tsConfig.getCameraPreset(w).desc}});',
    'wH cameraPreset segmented control',
  );
  code = assertReplace(
    code,
    'c=r("镜头震动",Vt("shake"),"cameraShake"),',
    'c=r("镜头震动",Vt("shake"),"cameraShake"),_fsSvg=\'<svg viewBox="0 0 24 24" class="sf-ico" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>\',_isFs=()=>!!(document.fullscreenElement||document.webkitFullscreenElement),_fsHint=z("p","sf-field__hint"),_fsToggle=j8({value:_isFs(),label:"全屏显示",onChange:async v=>{const el=document.documentElement;try{if(v){const req=el.requestFullscreen||el.webkitRequestFullscreen;if(!req){_fsToggle.set(!1),_fsHint.textContent="当前环境暂不支持网页全屏，请使用浏览器自带全屏。";return}await req.call(el)}else if(_isFs()){const ex=document.exitFullscreen||document.webkitExitFullscreen;ex&&await ex.call(document)}}catch{_fsToggle.set(_isFs()),_fsHint.textContent="全屏切换被浏览器拦截，请点击页面后再试或用浏览器快捷键。"}}}),fsRow=z("div","sf-field sf-settings__row has-hint",z("span","sf-field__label",_e(_fsSvg),"全屏显示"),z("span","sf-field__ctl",_fsToggle.el));_fsHint.textContent=_isFs()?"当前已进入全屏；再点一次即可退出。":"开启或退出沉浸全屏视野（亦可用 F11 / Esc）。";fsRow.dataset.sfSnd="click";fsRow.addEventListener("click",()=>_fsToggle.flip());const _onFsChange=()=>{const on=_isFs();_fsToggle.set(on),_fsHint.textContent=on?"当前已进入全屏；再点一次即可退出。":"开启或退出沉浸全屏视野（亦可用 F11 / Esc）。"};document.addEventListener("fullscreenchange",_onFsChange),document.addEventListener("webkitfullscreenchange",_onFsChange);const ecPreview=z("button","sf-link sf-settings__replay","预览");ecPreview.type="button",ecPreview.dataset.sfSnd="confirm",ecPreview.setAttribute("aria-label","立即预览大招眼神特写效果"),ecPreview.addEventListener("click",w=>{w.stopPropagation();let hid="xinqiji";try{const sel=document.querySelector(".sf-hcard.is-selected")?.getAttribute("data-hero");if(sel&&tsConfig.heroes[sel])hid=sel;else{const sessMe=window.__moba?.session?.world?.state?.heroes?.find(q=>q.id===window.__moba.session.world.state.playerId)?.heroId;if(sessMe&&tsConfig.heroes[sessMe])hid=sessMe;else{const lc=JSON.parse(localStorage.getItem(pk)||"null");if(lc?.heroId&&tsConfig.heroes[lc.heroId])hid=lc.heroId}}}catch{}tsConfig.triggerEyesCutin(document.body,hid,tsConfig.heroes[hid]?.skills?.ult?.name,"绝技预览 · 高光")});const ec=r("大招特写切镜",Vt("star"),"eyesCutin","施放终极技能或连杀时，在屏幕上方呈现英雄眼神高光切镜。",ecPreview),',
    'wH fullscreen + eyesCutin toggle & preview',
  );
  code = assertReplace(
    code,
    'z("section","sf-settings__group",z("h3","sf-heading","画面"),z("div","sf-field",z("span","sf-field__label",_e(Vt("quality")),"画质"),z("span","sf-field__ctl sf-settings__quality",i.el)),s,l.row,c.row),',
    'z("section","sf-settings__group",z("h3","sf-heading","画面"),z("div","sf-field",z("span","sf-field__label",_e(Vt("quality")),"画质"),z("span","sf-field__ctl sf-settings__quality",i.el)),s,z("div","sf-field",z("span","sf-field__label",_e(Vt("target")),"镜头视角"),z("span","sf-field__ctl sf-settings__quality",cp.el)),cpHint,fsRow,_fsHint,l.row,c.row,ec.row,ec.hint),',
    'wH video section layout with fullscreen',
  );
  code = assertReplace(
    code,
    'dispose:()=>window.clearTimeout(b)',
    'dispose:()=>{window.clearTimeout(b),document.removeEventListener("fullscreenchange",_onFsChange),document.removeEventListener("webkitfullscreenchange",_onFsChange)}',
    'wH dispose cleanup fullscreen listener',
  );
  code = assertReplace(
    code,
    'i.set(w.quality),s.textContent=E4[w.quality],l.toggle.set(w.showFps),c.toggle.set(w.cameraShake),',
    'i.set(w.quality),s.textContent=E4[w.quality],cp.set(w.cameraPreset),cpHint.textContent=tsConfig.getCameraPreset(w.cameraPreset).desc,l.toggle.set(w.showFps),c.toggle.set(w.cameraShake),ec.toggle.set(w.eyesCutin!==!1),',
    'wH refresh k()',
  );
  code = assertReplace(
    code,
    'd&&(lt.quality!==void 0&&d.setQuality(lt.quality),lt.cameraShake!==void 0&&d.setCameraShake?.(lt.cameraShake))',
    'd&&(lt.quality!==void 0&&d.setQuality(lt.quality),lt.cameraShake!==void 0&&d.setCameraShake?.(lt.cameraShake),lt.cameraPreset!==void 0&&(d.engine?.rig?.setPreset?.(lt.cameraPreset),d.resize?.()))',
    'Uq live cameraPreset setting sync',
  );
  code = assertReplace(code, 'heroId:n.hero??"chijin"', 'heroId:n.hero??"sushi"', 'direct fallback hero');
  code = assertReplace(code, 'const L=()=>{T("chijin")}', 'const L=()=>{T("sushi")}', 'idle portrait preload hero');

  // ── 9. 六位唐宋名士完整全身 3D 骨骼重构建模 & 大宋笠盔小兵 ──
  // 9A. 花蕊夫人 (SU / AU, chijin 战士位): 100% 后蜀绯衣女剑侠全身重写（零程咬金胡汉盔体型！）
  code = assertReplace(
    code,
    'const ne={red:13384230,redDark:9052184,redLight:15294778,ironLight:8156794,ironDark:2893609,brass:14852410,brassDark:10118946,steel:13159636,steelDark:6777718,beard:8007196,beardHi:11094568,skin:14260850,robe:10119740,robeDark:7096104,leather:3877669,leatherDark:2234646,shaft:5909538,edge:16756823}',
    'const _palChijin={red:13384230,redDark:9052184,redLight:15294778,ironLight:8156794,ironDark:2893609,brass:14852410,brassDark:10118946,steel:13159636,steelDark:6777718,beard:8007196,beardHi:11094568,skin:14260850,robe:10119740,robeDark:7096104,leather:3877669,leatherDark:2234646,shaft:5909538,edge:16756823}',
    '3D palette _palChijin',
  );
  code = replaceBetween(
    code,
    'function SU(){const n=Gh(kU)',
    'extra:{gripR:a,aim:o,gripL:r}}}',
    'function SU(ne=_palChijin,variant="huarui"){return tsConfig.heroes3D.buildHuaRuiWarriorFull({Gh,Am,kU,Co,Ls,K,En,pt,bt,Zi,Bl,Ox,Ko,Js,Li,Wd,af,qh,Xh,Cm},ne)}',
    'SU full-body reconstruct -> Hua Rui Tang-Shu Sword-Dancer Warrior',
  );
  code = assertReplace(
    code,
    'function AU(){const{h:n,b:t,extra:e}=SU(),',
    'function AU(key="hero:chijin",pal=_palChijin,variant="huarui"){const{h:n,b:t,extra:e}=SU(pal,variant),',
    'AU parameterize with variant',
  );
  code = assertReplace(
    code,
    'return{key:"hero:chijin",geometry:r,rig:n.rig,height:2.3,radius:.64,scale:fw,',
    'return{key,geometry:r,rig:n.rig,height:2.3,radius:.64,scale:variant==="huarui"?1.18:fw,',
    'AU key + sleek feminine warrior scale',
  );
  code = assertReplace(
    code,
    '==="dash"||u==="spin"?.18:.13,animate:h}}',
    '==="dash"||u==="spin"?.18:.13,animate:(u,m,x)=>{h(u,m,x),tsConfig.heroes3D?.animateHeroCompanion?.(u,e?.pet,m)}}}',
    'AU attach companion pet animation',
  );

  // 9B. 文成公主 (CU / PU): 100% 盛唐齐胸翠绣襦裙 + 飞天披帛 + 双环高云髻凤冠 + 踏云小雪狐
  code = assertReplace(
    code,
    'const jt={robe:3108728,robeDark:1919570,pants:2832704,pantsDark:1713451,wrap:12168850,wrapDark:8747874,leather:9069112,leatherDark:5914146,leatherLight:11107660,iron:5857643,ironLight:9410723,brass:13212229,brassDark:9069862,skin:14263678,hair:2763310,hairHi:6974064,cap:1841952,capHi:3815490,pheasant:10515010,pheasantTip:2759698,lining:15327951,liningShade:12564126,lacquer:3811874,lacquerDark:1905938,bone:15260864,silk:11547690,shaft:13150304,head:6975608,feather:16052712,featherShade:13223094,jade:15134688}',
    'const _palFengling={robe:3108728,robeDark:1919570,pants:2832704,pantsDark:1713451,wrap:12168850,wrapDark:8747874,leather:9069112,leatherDark:5914146,leatherLight:11107660,iron:5857643,ironLight:9410723,brass:13212229,brassDark:9069862,skin:14263678,hair:2763310,hairHi:6974064,cap:1841952,capHi:3815490,pheasant:10515010,pheasantTip:2759698,lining:15327951,liningShade:12564126,lacquer:3811874,lacquerDark:1905938,bone:15260864,silk:11547690,shaft:13150304,head:6975608,feather:16052712,featherShade:13223094,jade:15134688}',
    '3D palette _palFengling',
  );
  code = replaceBetween(
    code,
    'function CU(){const n=Gh(RU)',
    'extra:{bowUp:l,bowDn:c,nock:f,arrow:d}}}',
    'function CU(jt=_palFengling,variant="wencheng"){return tsConfig.heroes3D.buildWenchengFull({Gh,Am,RU,Ra,Ls,K,En,pt,bt,Zi,Bl,Ox,Ko,Js,Li,Wd,af,qh,Xh,Cm},jt)}',
    'CU full-body reconstruct -> Wencheng Princess Tang Ruqun + Snow Fox',
  );
  code = assertReplace(
    code,
    'function PU(){const{h:n,b:t,extra:e}=CU(),',
    'function PU(key="hero:fengling",pal=_palFengling,variant="wencheng"){const{h:n,b:t,extra:e}=CU(pal,variant),',
    'PU parameterize with variant',
  );
  code = assertReplace(code, 'return{key:"hero:fengling",geometry:o,', 'return{key,geometry:o,', 'PU key return');
  code = assertReplace(
    code,
    '==="dash"||f==="dead"?.05:.13,animate:l}}',
    '==="dash"||f==="dead"?.05:.13,animate:(c,f,d)=>{l(c,f,d),tsConfig.heroes3D?.animateHeroCompanion?.(c,e?.pet,f)}}}',
    'PU attach companion pet animation',
  );

  // 9C. 秦琼 (zU / UU): 100% 全身明光玄甲大将重写 + 熟铜四棱双锏 + 吞兽玄盾 + 小瑞狮（彻底消灭樊哙！）
  code = assertReplace(
    code,
    'const de={ironLight:8161432,ironDark:3423046,bronze:14263361,bronzeDark:9726250,lacquer:1775645,lacquerHi:3814464,red:11022378,redDark:7216924,cloth:8015408,clothDark:5518370,clothLight:10119746,skirt:9190186,skirtDark:6038297,steel:13226714,steelDark:8161428,skin:14263932,hair:2235420,hairHi:4010544,leather:4994600,leatherDark:2891544,amber:16761690}',
    'const _palPanyue={ironLight:8161432,ironDark:3423046,bronze:14263361,bronzeDark:9726250,lacquer:1775645,lacquerHi:3814464,red:11022378,redDark:7216924,cloth:8015408,clothDark:5518370,clothLight:10119746,skirt:9190186,skirtDark:6038297,steel:13226714,steelDark:8161428,skin:14263932,hair:2235420,hairHi:4010544,leather:4994600,leatherDark:2891544,amber:16761690}',
    '3D palette _palPanyue',
  );
  code = replaceBetween(
    code,
    'function zU(){const n=Gh(DU)',
    'extra:{shield:a,mane:u}}}',
    'function zU(de=_palPanyue,variant="qinqiong"){return tsConfig.heroes3D.buildQinQiongFull({Gh,Am,DU,Ls,K,En,pt,bt,Zi,Bl,Ox,Ko,Js,Li,Wd,af,qh,Xh,Cm,bc},de)}',
    'zU full-body reconstruct -> Qin Qiong Tang Ming-Guang General + Lion',
  );
  code = assertReplace(
    code,
    'function UU(){const{h:n,b:t}=zU(),',
    'function UU(key="hero:panyue",pal=_palPanyue,variant="qinqiong"){const{h:n,b:t,extra}=zU(pal,variant),',
    'UU parameterize with variant & extra',
  );
  code = assertReplace(code, 'return{key:"hero:panyue",geometry:a,', 'return{key,geometry:a,', 'UU key return');
  code = assertReplace(
    code,
    '="dead"?.05:r==="leap"?.2:.16,animate:o}}',
    '="dead"?.05:r==="leap"?.2:.16,animate:(r,l,c)=>{o(r,l,c),tsConfig.heroes3D?.animateHeroCompanion?.(r,extra?.pet,l)}}}',
    'UU attach companion pet animation',
  );

  // 9D. 苏轼 vs 刘娥 (BU / $U): 100% 独立全身重构（苏轼+白仙鹤 vs 刘娥+青鸾凤雏）
  code = assertReplace(
    code,
    'const ie={cloak:11150408,cloakDark:7345975,cloakLight:13124202,fur:16447472,furShade:13225949,robe:15986144,robeShade:13353910,hem:14129824,trim:3104124,trimDark:2048088,skin:16176578,hair:1841698,hairHi:3814472,gold:15777888,goldDark:11830834,lip:13121610,wood:14860426,woodShade:13081954,woodDark:12089658,woodDeep:8145446,string:16771512}',
    'const _palXingli={cloak:11150408,cloakDark:7345975,cloakLight:13124202,fur:16447472,furShade:13225949,robe:15986144,robeShade:13353910,hem:14129824,trim:3104124,trimDark:2048088,skin:16176578,hair:1841698,hairHi:3814472,gold:15777888,goldDark:11830834,lip:13121610,wood:14860426,woodShade:13081954,woodDark:12089658,woodDeep:8145446,string:16771512}',
    '3D palette _palXingli',
  );
  code = replaceBetween(
    code,
    'function BU(){const n=Gh(OU)',
    'face:l(0,-.04,.07)}}}',
    'function BU(ie=_palXingli,variant="sushi"){return tsConfig.heroes3D.buildMageFull({Gh,Am,OU,Ls,K,En,pt,bt,Zi,Bl,Ox,Ko,Js,Li,Wd,af,qh,Xh,Cm},ie,variant)}',
    'BU full-body reconstruct -> Male Song Scholar Su Shi + Crane vs Empress Liu E + Phoenix',
  );
  code = assertReplace(
    code,
    'function $U(){const{h:n,b:t,extra:e}=BU(),',
    'function $U(key="hero:xingli",pal=_palXingli,variant="sushi"){const{h:n,b:t,extra:e}=BU(pal,variant),',
    '$U parameterize with variant',
  );
  code = assertReplace(code, 'return{key:"hero:xingli",geometry:o,', 'return{key,geometry:o,', '$U key return');
  code = assertReplace(
    code,
    ':x.startsWith("cast_")?.3:.14,animate:m}}',
    ':x.startsWith("cast_")?.3:.14,animate:(x,p,g)=>{m(x,p,g),tsConfig.heroes3D?.animateHeroCompanion?.(x,e?.pet,p)}}}',
    '$U attach companion pet animation',
  );

  // 9E. 辛弃疾 (VU / jU, yeque 刺客位): 100% 南宋男将夜袭单刀手全身重写 + 海东青战鹰
  code = assertReplace(
    code,
    'const me={suit:2367536,suitHi:4865894,suitDark:1578015,sash:4864632,sashDark:2892360,scarf:15526110,scarfShade:13222836,ink:1709606,leather:4075046,leatherLight:6967360,bronze:11043900,bronzeDark:7230756,steel:10470088,steelDark:6191746,edge:14218482,plain:12106948,skin:14857872,hair:1578524,hairHi:3814980,tube:5909022,tubeDark:3413519,silk:15261638,silkShade:12563092}',
    'const _palYeque={suit:2367536,suitHi:4865894,suitDark:1578015,sash:4864632,sashDark:2892360,scarf:15526110,scarfShade:13222836,ink:1709606,leather:4075046,leatherLight:6967360,bronze:11043900,bronzeDark:7230756,steel:10470088,steelDark:6191746,edge:14218482,plain:12106948,skin:14857872,hair:1578524,hairHi:3814980,tube:5909022,tubeDark:3413519,silk:15261638,silkShade:12563092}',
    '3D palette _palYeque',
  );
  code = replaceBetween(
    code,
    'function VU(){const n=Gh(GU)',
    'furlRows:x,furlPts:m}}}',
    'function VU(me=_palYeque,variant="xinqiji"){return tsConfig.heroes3D.buildXinQijiAssassinFull({Gh,Am,GU,io,Sp,Ls,K,En,pt,bt,Zi,Bl,Ox,Ko,Js,Li,Wd,af,qh,Xh,Cm},me)}',
    'VU full-body reconstruct -> Xin Qiji Male Song Night-Raid Assassin + Hawk',
  );
  code = assertReplace(
    code,
    'function jU(){const{h:n,b:t,extra:e}=VU(),',
    'function jU(key="hero:yeque",pal=_palYeque,variant="xinqiji"){const{h:n,b:t,extra:e}=VU(pal,variant),',
    'jU parameterize with variant',
  );
  code = assertReplace(
    code,
    'return{key:"hero:yeque",geometry:o,rig:n.rig,height:2.06,radius:.58,scale:_w,',
    'return{key,geometry:o,rig:n.rig,height:2.06,radius:.58,scale:variant==="xinqiji"?1.21:_w,',
    'jU key + masculine Song general scale',
  );
  code = assertReplace(
    code,
    '"dead"?.05:c==="dash"?.14:.12,animate:l}}',
    '"dead"?.05:c==="dash"?.14:.12,animate:(c,f,d)=>{l(c,f,d),tsConfig.heroes3D?.animateHeroCompanion?.(c,e?.pet,f)}}}',
    'jU attach companion pet animation',
  );

  // 9F. Gx 注册表传参（6 英雄 + 4 小兵 + 6 山海唐宋神兽全面重塑！）
  code = assertReplace(
    code,
    'const Gx={"hero:panyue":UU,"hero:chijin":AU,"hero:xingli":$U,"hero:fengling":PU,"hero:yeque":jU,',
    'const _tsMinions=tsConfig.createMinionBuilders({Wa,Ls,pt,kf,K,Qt,As,wa,$o,ya,Ai,En,Pm,Go,Qo,Kn,Ct,Gn,Xe,Jo}),_tsMonsters=tsConfig.createMonsterBuilders({Wa,Lm,Ls,K,En,pt,bt,Di,Ds,_a,Im,V1,XU,Qn,Gn,Ct,Xe,Jo,origMonsters:{mossback:lO,glimwing:pO,frost_golem:CO,ember_golem:yO,abyss_drake:fO,star_colossus:MO}}),Gx={"hero:panyue":()=>UU("hero:panyue",heroCostume("qinqiong","panyue")??_palPanyue,"qinqiong"),"hero:chijin":()=>AU("hero:chijin",heroCostume("huarui","chijin")??_palChijin,"huarui"),"hero:xingli":()=>$U("hero:xingli",heroCostume("sushi","xingli")??_palXingli,"sushi"),"hero:fengling":()=>PU("hero:fengling",heroCostume("wencheng","fengling")??_palFengling,"wencheng"),"hero:yeque":()=>jU("hero:yeque",heroCostume("xinqiji","yeque")??_palYeque,"xinqiji"),"hero:qinqiong":()=>UU("hero:qinqiong",heroCostume("qinqiong","panyue")??_palPanyue,"qinqiong"),"hero:huarui":()=>AU("hero:huarui",heroCostume("huarui","chijin")??_palChijin,"huarui"),"hero:sushi":()=>$U("hero:sushi",heroCostume("sushi","xingli")??_palXingli,"sushi"),"hero:wencheng":()=>PU("hero:wencheng",heroCostume("wencheng","fengling")??_palFengling,"wencheng"),"hero:xinqiji":()=>jU("hero:xinqiji",heroCostume("xinqiji","yeque")??_palYeque,"xinqiji"),"hero:liue":()=>$U("hero:liue",heroCostume("liue","xingli")??_palXingli,"liue"),',
    'Gx 6 independent full-body Tang-Song hero 3D models + _tsMinions + _tsMonsters init',
  );
  code = assertReplace(
    code,
    '"minion:melee":KU,"minion:ranged":ZU,"minion:siege":QU,"minion:super":JU,...IO,"monster:mossback":lO,"monster:glimwing":pO,"monster:frost_golem":CO,"monster:ember_golem":yO,"monster:abyss_drake":fO,"monster:star_colossus":MO}',
    '"minion:melee":_tsMinions.melee,"minion:ranged":_tsMinions.ranged,"minion:siege":_tsMinions.siege,"minion:super":_tsMinions.super,...IO,"monster:mossback":_tsMonsters.mossback,"monster:glimwing":_tsMonsters.glimwing,"monster:frost_golem":_tsMonsters.frost_golem,"monster:ember_golem":_tsMonsters.ember_golem,"monster:abyss_drake":_tsMonsters.abyss_drake,"monster:star_colossus":_tsMonsters.star_colossus}',
    'Gx replace all 4 minions + all 6 jungle monsters',
  );

  // 9G. 小兵共享战队布料/铜甲调色盘 & 防御塔路中对称定位（王者荣耀式双侧可绕行）
  code = assertReplace(
    code,
    'Qt={stone:8031408,stoneLight:10004680,stoneDark:5266554,iron:4541794,brass:13214810,cloth:792624,wood:6969932}',
    'Qt={stone:0x787d72,stoneLight:0xb4b8a6,stoneDark:0x3c4039,iron:0x2e363c,brass:0xdeae45,cloth:0x24466b,wood:0x5e402a}',
    'Qt Song army stone/indigo/bronze palette',
  );
  code = assertReplace(
    code,
    'const a_=[{lane:"top",tier:3,pos:$t(-48.6,27)},{lane:"top",tier:2,pos:$t(-55.4,4)},{lane:"top",tier:1,pos:$t(-48.6,-24)},{lane:"mid",tier:3,pos:$t(-32.4,27.6)},{lane:"mid",tier:2,pos:$t(-18.6,23.4)},{lane:"mid",tier:1,pos:$t(-12.9,8.1)},{lane:"bot",tier:3,pos:I0($t(-48.6,27))},{lane:"bot",tier:2,pos:I0($t(-55.4,4))},{lane:"bot",tier:1,pos:I0($t(-48.6,-24))}];',
    'const a_=[{lane:"top",tier:3,pos:$t(-52,27)},{lane:"top",tier:2,pos:$t(-52,4)},{lane:"top",tier:1,pos:$t(-52,-24)},{lane:"mid",tier:3,pos:$t(-30,30)},{lane:"mid",tier:2,pos:$t(-21,21)},{lane:"mid",tier:1,pos:$t(-10.5,10.5)},{lane:"bot",tier:3,pos:I0($t(-52,27))},{lane:"bot",tier:2,pos:I0($t(-52,4))},{lane:"bot",tier:1,pos:I0($t(-52,-24))}];',
    'a_ center all 18 defense towers in lanes for dual-side traversal',
  );

  // ── 10. ws 特效色板、FI 战阵符印着色器重构与六大英雄唐宋国风技能特效 ──
  code = assertReplace(
    code,
    'yeque:{glow:Lt(9067760),hot:Lt(15266047),deep:Lt(3811960),accent:Lt(12577250),dark:Lt(920086)}},W={',
    'yeque:{glow:Lt(9067760),hot:Lt(15266047),deep:Lt(3811960),accent:Lt(12577250),dark:Lt(920086)}};for(const id of tsConfig.heroOrder){const vp=heroVfx(id,kitOf(id));if(vp)ws[id]=vp;}for(const k of["panyue","chijin","xingli","fengling","yeque"]){const vp=heroVfx(tsConfig.heroesByKit[k]?.id,k);if(vp)ws[k]=vp;}const W={',
    'ws populate 6 heroes + kit defaults',
  );
  code = assertReplace(
    code,
    'magic:Lt(6079743),magicDeep:Lt(3824895),',
    'magic:Lt(0x529cd4),magicDeep:Lt(0x1d476e),',
    'W magic indigo palette',
  );
  code = assertReplace(
    code,
    'frost:Lt(9428223),frostDeep:Lt(5217535),',
    'frost:Lt(0x8ec6e6),frostDeep:Lt(0x285675),',
    'W frost mineral indigo palette',
  );
  code = assertReplace(
    code,
    'blue:Lt(4890879),blueDeep:Lt(2121952),',
    'blue:Lt(0x4d92cc),blueDeep:Lt(0x1b4066),',
    'W blue -> Tang imperial indigo',
  );
  code = assertReplace(
    code,
    'Mb=[{glow:Lt(Yt.blue.glow),hot:Lt(9226495),deep:Lt(Yt.blue.dark)},',
    'Mb=[{glow:Lt(0x529fd9),hot:Lt(0xd4ecff),deep:Lt(0x1c4066)},',
    'Mb[0] indigo tower/core projectile glow',
  );
  code = assertReplace(
    code,
    'Le(.5,0,s))}}};function DI(){',
    'Le(.5,0,s))}}};tsConfig.patchTangSongSpriteAtlas?.(vb,Ft,{Oc,qu,Ro});function DI(){',
    'DI sprite atlas Tang-Song glyph/blossom/coin overrides',
  );
  code = assertReplace(
    code,
    'leaf:$e({scale:1.35,sprite:Ft.leaf,add:.2,color:12124120,color2:6283432,',
    'leaf:$e({scale:1.35,sprite:Ft.leaf,add:.2,color:0xe0a243,color2:0xa83824,',
    'Mt.leaf autumn ginkgo gold & crimson petal defaults',
  );
  code = assertReplace(
    code,
    'rune:$e({pull:.3,scale:1.4,sprite:Ft.rune1,sprite2:Ft.rune2,add:.45,color:16777215,intensity:2.1,intensity2:1.2,gravity:-.8,drag:1.5,rot:0,fadeIn:.15,fadeOut:.55}),',
    'rune:$e({pull:.3,scale:1.4,sprite:Ft.rune1,sprite2:Ft.rune2,add:.45,color:16777215,intensity:2.1,intensity2:1.2,gravity:-.8,drag:1.5,rot:0,fadeIn:.15,fadeOut:.55}),rune1:$e({pull:.2,scale:1.5,sprite:Ft.rune1,add:.45,color:16777215,intensity:2.2,intensity2:1.2,gravity:-1.1,drag:1.4,rot:0,fadeIn:.08,fadeOut:.55}),rune2:$e({pull:.2,scale:1.5,sprite:Ft.rune2,add:.42,color:16777215,intensity:2.1,intensity2:1.2,gravity:-1.0,drag:1.4,rot:0,fadeIn:.08,fadeOut:.55}),rune3:$e({pull:.2,scale:1.5,sprite:Ft.rune3,add:.45,color:16777215,intensity:2.2,intensity2:1.25,gravity:-1.1,drag:1.4,rot:0,fadeIn:.08,fadeOut:.55}),',
    'Mt add Tang-Song calligraphy sprites rune1/rune2/rune3',
  );
  code = replaceBetween(
    code,
    '} else if (type < 4.5) {',
    '} else if (type < 5.5) {',
    '${tsConfig.vfxShaders.fiRune}',
    'FI Xt.rune -> Tang-Song Bagua Lotus array',
  );
  code = replaceBetween(
    code,
    '} else if (type < 11.5) {',
    '} else if (type < 12.5) {',
    '${tsConfig.vfxShaders.fiStar}',
    'FI Xt.star -> Tang Baoxianghua Blossom seal',
  );
  code = replaceBetween(
    code,
    '} else if (type < 15.5) {',
    '} else if (type < 16.5) {',
    '${tsConfig.vfxShaders.fiSigil}',
    'FI Xt.sigil -> Plum/Fire/Ruyi-Cloud/Dragon sigils',
  );
  // 花蕊夫人 chijin：红梅花瓣飞舞 + 墨锋剑意 + 宝相莲华
  code = assertReplace(code, 'ba=Lt(16760928)', 'ba=cs.hot', 'chijin ba peach-rose sword highlight');
  code = assertReplace(
    code,
    'bn(n,s,i,1.3,.26,cs.glow,1.3,.25,.25),bo(t,e)&&n.shake(.1,s,i)}',
    'bn(n,s,i,1.3,.26,cs.glow,1.3,.25,.25),_tsPetalBurst(n,s,a,i,8,1.1,5,cs.glow,cs.hot),bo(t,e)&&n.shake(.1,s,i)}',
    'VP huarui passive crimson petal burst',
  );
  code = assertReplace(
    code,
    'n.light(s+a*l*.5,i+o*l*.5,1.5,cs.glow,7,l*1.6,.3),n.shake(bo(t,e)?le.shakeSkill:.06,s,i)}',
    'n.light(s+a*l*.5,i+o*l*.5,1.5,cs.glow,7,l*1.6,.3),n.decals.add(Xt.ink,s+a*1.8,i+o*1.8,l*.55,.55).rot(r,.28).params(2.5,.7).color(cs.glow,1.2).under(cs.dark,.8),_tsPetalBurst(n,s+a*2.2,1,i+o*2.2,10,l*.55,6,cs.glow,cs.hot),n.shake(bo(t,e)?le.shakeSkill:.06,s,i)}',
    'WP huarui s1 ink sweep & petal burst',
  );
  code = assertReplace(
    code,
    'u.spawn(i.x+d.signed()*.3,.2,i.y+d.signed()*.3,a*d.range(1,3),d.range(.4,1.2),o*d.range(1,3),.5,.6,1.3)}),t.unitId===e.playerId&&n.shake(.08,s.x,s.y)}',
    'u.spawn(i.x+d.signed()*.3,.2,i.y+d.signed()*.3,a*d.range(1,3),d.range(.4,1.2),o*d.range(1,3),.5,.6,1.3)}),_tsPetalBurst(n,(s.x+i.x)/2,.9,(s.y+i.y)/2,9,1.2,5.5,cs.glow,cs.hot),t.unitId===e.playerId&&n.shake(.08,s.x,s.y)}',
    'jP huarui s2 dash petal trail',
  );
  code = assertReplace(
    code,
    'O1(n,s,1,i,10,9,ba,cs.deep),n.light(s,i,1.8,cs.glow,le.lightMax,10,.35),n.shake(bo(t,e)?.3:.15,s,i)}',
    'O1(n,s,1,i,10,9,ba,cs.deep),n.decals.add(Xt.star,s,i,a*.85,1.1).params(6,1).color(cs.accent,1.7,.95).under(cs.dark,.4),_tsPetalBurst(n,s,1,i,16,a*.65,7,cs.glow,cs.hot),n.light(s,i,1.8,cs.glow,le.lightMax,10,.35),n.shake(bo(t,e)?.3:.15,s,i)}',
    'qP huarui ult Baoxianghua seal & plum petals',
  );
  code = assertReplace(
    code,
    'for(let h=0;h<d;h++){const u=a.next()*oe,m=i*a.range(.8,1);f.spawn(e+Math.cos(u)*m,a.range(.5,1.5),s+Math.sin(u)*m,Math.sin(u)*a.range(6,10),a.range(.5,3),-Math.cos(u)*a.range(6,10),a.range(.2,.3),.12,.04)}}',
    'for(let h=0;h<d;h++){const u=a.next()*oe,m=i*a.range(.8,1);f.spawn(e+Math.cos(u)*m,a.range(.5,1.5),s+Math.sin(u)*m,Math.sin(u)*a.range(6,10),a.range(.5,3),-Math.cos(u)*a.range(6,10),a.range(.2,.3),.12,.04)}_tsPetalBurst(n,e,.9,s,7,i*.85,5.5,cs.glow,cs.hot)}',
    'XP huarui ult tick swirl petals',
  );
  // 秦琼 panyue：鎏金战印 + 玄金八卦护体阵 + 镇岳战火星烬
  code = assertReplace(
    code,
    'H0(n,s+l*.9,.8,i+c*.9,6,8,W.bronze,He.deep,l,c,.5,.3,.12),n.light(s,i,1.5,He.glow,le.lightMax,8,.35),n.shake(bo(t,e)?le.shakeSkill:.07,s,i)}',
    'H0(n,s+l*.9,.8,i+c*.9,6,8,W.bronze,He.deep,l,c,.5,.3,.12),n.decals.add(Xt.star,s,i,a*.75,.9).params(8,1).color(He.accent,1.7,.95).under(He.dark,.45),_tsEmberBurst(n,s,.7,i,10,a*.55,6.5,He.hot,He.accent),n.light(s,i,1.5,He.glow,le.lightMax,8,.35),n.shake(bo(t,e)?le.shakeSkill:.07,s,i)}',
    'MD qinqiong s1 golden war seal & sparks',
  );
  code = assertReplace(
    code,
    'Of(n,s,i,5,4,5.5,1.1,.24),n.light(s,i,1.6,He.glow,6,8,.35),n.shake(bo(t,e)?le.shakeSkill:.06,s,i)}',
    'Of(n,s,i,5,4,5.5,1.1,.24),(function(){const _r=n.decals.add(Xt.rune,s,i,a*.86,1.6).params(8,.7).color(He.glow,1.65,.92).under(He.dark,.35);l&&_r.follow(r)})(),_tsEmberBurst(n,s,.8,i,8,1.4,4.5,He.hot,He.glow),n.light(s,i,1.6,He.glow,6,8,.35),n.shake(bo(t,e)?le.shakeSkill:.06,s,i)}',
    'kD qinqiong s2 spinning Bagua armor seal',
  );
  code = assertReplace(
    code,
    'H0(n,s,.5,i,8,9,W.bronze,He.deep,0,0,0,.4,.14),n.light(s,i,2.2,He.glow,le.lightMax,14,.35),n.shake(bo(t,e)?.45:.3,s,i)}',
    'H0(n,s,.5,i,8,9,W.bronze,He.deep,0,0,0,.4,.14),n.decals.add(Xt.rune,s,i,a*.92,1.8).params(8,.55).color(He.glow,1.9,.95).under(He.dark,.45),_tsEmberBurst(n,s,.8,i,18,a*.7,8,He.hot,He.accent),n.light(s,i,2.2,He.glow,le.lightMax,14,.35),n.shake(bo(t,e)?.45:.3,s,i)}',
    'TD qinqiong ult grand Zhenyue Bagua + embers',
  );
  // 苏轼 vs 刘娥 xingli：苏轼碧墨大江鸿雁 vs 刘娥紫金诏柱御玺
  code = assertReplace(
    code,
    'const s=t.pos.x,i=t.pos.y,a=$0(n,t.targetId,.55,1.1);bx(n,s,i,2.3,.6,Pn.glow,3,1.8,!1,.2),n.ribbons.trace($n.string,s,5.2,i,s,.1,i,.06,W.stringGold,Pn.accent),n.glow.spawn(qe.pillar,sn.pillar,.42).at(s,.05,i).scale3(.09,4.6,.09,.05,5.2,.05).color(Pn.accent,1.5,.9).fade(.05,.4).opt(.4,.5,1),n.particles.use(Mt.hitFlash).tint(W.white,Pn.glow).spawn(s,a,i,0,0,0,le.flashSkill,1.3,2.1);const o=n.particles.use(Mt.ringB).tint(Pn.hot,Pn.glow);o.spawn(s,a,i,0,0,0,.3,.6,2.4),o.spawn(s,a,i,0,0,0,.34,.4,1.8,.08),Ex(n,s,a,i,10,4.2),n.light(s,i,a,Pn.glow,6,7,.3)',
    'const _isL=isLiueUnit(n,t.unitId),_p=xingliPal(n,t.unitId),s=t.pos.x,i=t.pos.y,a=$0(n,t.targetId,.55,1.1);bx(n,s,i,2.3,.6,_p.glow,3,1.8,!1,.2),n.ribbons.trace($n.string,s,5.2,i,s,.1,i,.06,W.stringGold,_p.accent),n.glow.spawn(qe.pillar,sn.pillar,.42).at(s,.05,i).scale3(.09,4.6,.09,.05,5.2,.05).color(_p.accent,1.5,.9).fade(.05,.4).opt(.4,.5,1),n.particles.use(Mt.hitFlash).tint(W.white,_p.glow).spawn(s,a,i,0,0,0,le.flashSkill,1.3,2.1);const o=n.particles.use(Mt.ringB).tint(_p.hot,_p.glow);o.spawn(s,a,i,0,0,0,.3,.6,2.4),o.spawn(s,a,i,0,0,0,.34,.4,1.8,.08),Ex(n,s,a,i,10,4.2),_isL?(n.decals.add(Xt.star,s,i,1.85,.95).params(8,1).color(_p.accent,1.8,.95).under(_p.dark,.35),_tsSilkBurst(n,s,a,i,10,1.4,4.5,_p.accent,_p.hot)):(n.decals.add(Xt.rune,s,i,1.75,.9).params(8,.8).color(_p.glow,1.6,.95).under(_p.dark,.3),_tsSilkBurst(n,s,a,i,8,1.2,4,_p.hot,_p.glow)),n.light(s,i,a,_p.glow,6,7,.3)',
    'AD xingli passive sushi ink/bagua vs liue imperial seal',
  );
  code = assertReplace(
    code,
    'RD=(n,t)=>{const e=t.dir?.x??1,s=t.dir?.y??0,i=Math.atan2(s,e),a=t.pos.x+e*.8,o=t.pos.y+s*.8,r=1.45;n.particles.use(Mt.hitFlash).tint(W.white,Pn.glow).spawn(a,r,o,0,0,0,le.flashBasic,.8,1.3),n.glow.spawn(qe.hoop,sn.hoop,.26).at(a,r,o).vel(e*8,0,s*8).rot(0,-i,-Math.PI/2).scale(.22,1.05).color(Pn.glow,1.8,.9).fade(.1,.4);const l=n.particles.use(Mt.wave).tint(Pn.hot,Pn.glow);l.spawn(a,r,o,e*9,0,s*9,.24,.9,1.7),l.spawn(a,r,o,e*6,0,s*6,.28,.7,1.4,.05);const c=n.particles.use(Mt.string);for(let f=0;f<4;f++){const d=(f-1.5)*.17;c.spawn(a-s*d-e*.3,r+(f-1.5)*.05,o+e*d-s*.3,e*17,0,s*17,.15,.07,.03,f*.012)}n.decals.add(Xt.streak,a+e*1.5,o+s*1.5,1.9,.26).rot(i,.14).params(0,6).color(Pn.accent,1.2,.8).under(W.black,0)',
    'RD=(n,t)=>{const _isL=isLiueUnit(n,t.unitId),_p=xingliPal(n,t.unitId),e=t.dir?.x??1,s=t.dir?.y??0,i=Math.atan2(s,e),a=t.pos.x+e*.8,o=t.pos.y+s*.8,r=1.45;n.particles.use(Mt.hitFlash).tint(W.white,_p.glow).spawn(a,r,o,0,0,0,le.flashBasic,.8,1.3),n.glow.spawn(qe.hoop,sn.hoop,.26).at(a,r,o).vel(e*8,0,s*8).rot(0,-i,-Math.PI/2).scale(.22,1.05).color(_p.glow,1.8,.9).fade(.1,.4);const l=n.particles.use(Mt.wave).tint(_p.hot,_p.glow);l.spawn(a,r,o,e*9,0,s*9,.24,.9,1.7),l.spawn(a,r,o,e*6,0,s*6,.28,.7,1.4,.05);const c=n.particles.use(Mt.string);for(let f=0;f<4;f++){const d=(f-1.5)*.17;c.spawn(a-s*d-e*.3,r+(f-1.5)*.05,o+e*d-s*.3,e*17,0,s*17,.15,.07,.03,f*.012)}n.decals.add(Xt.streak,a+e*1.5,o+s*1.5,1.9,.26).rot(i,.14).params(0,6).color(_p.accent,1.2,.8).under(W.black,0),_isL?(_tsSilkBurst(n,a+e*1.6,1,o+s*1.6,7,1.1,6,_p.accent,_p.hot),n.decals.add(Xt.star,a+e*1.8,o+s*1.8,1.5,.65).params(6,1).color(_p.accent,1.6,.92).under(_p.dark,.35)):(n.decals.add(Xt.ink,a+e*2,o+s*2,2.2,.65).rot(i,.34).params(3,.9).color(_p.glow,1.4).under(W.ink,.88),n.particles.use(Mt.inkDot).spawn(a+e*1.5,1,o+s*1.5,e*12,1.5,s*12,.35,.16,.08))',
    'RD xingli s1 calligraphy ink vs decree seal',
  );
  code = assertReplace(
    code,
    'CD=(n,t,e)=>{const s=t.pos.x,i=t.pos.y,a=t.radius??3.4,o=n.rnd;n.decals.add(Xt.ring,s,i,a,.26).params(1,.08).color(Pn.glow,1.9).under(Pn.dark,.35);const r=n.particles.use(Mt.string),l=o.next()*oe;for(let c=0;c<8;c++){const f=l+c*oe/8,d=a*.92/.1;r.spawn(s+Math.cos(f)*a,.55,i+Math.sin(f)*a,-Math.cos(f)*d,0,-Math.sin(f)*d,.1,.07,.03,c*.004)}n.after(.1,()=>{n.particles.use(Mt.hitFlash).tint(W.white,Pn.glow).spawn(s,.9,i,0,0,0,le.flashSkill,a*.5,a*.85),wm(n,s,.7,i,a*.2,a*.98,.6,.3,Pn.hot,1.9,.9),bn(n,s,i,a,.4,Pn.glow,1.6,.12,.25),bx(n,s,i,a*.72,.45,Pn.accent,2,1.3,!1,.2,.04),Lr(n,s,i,.22,5.5,.32,Pn.hot,1.6,.6),Mm(n,s,1.1,i,3,2.4),Ex(n,s,1,i,10,5),n.light(s,i,1.8,Pn.glow,le.lightMax,a*2.4,.35)',
    'CD=(n,t,e)=>{const _isL=isLiueUnit(n,t.unitId),_p=xingliPal(n,t.unitId),s=t.pos.x,i=t.pos.y,a=t.radius??3.4,o=n.rnd;n.decals.add(Xt.ring,s,i,a,.26).params(1,.08).color(_p.glow,1.9).under(_p.dark,.35);const r=n.particles.use(Mt.string),l=o.next()*oe;for(let c=0;c<8;c++){const f=l+c*oe/8,d=a*.92/.1;r.spawn(s+Math.cos(f)*a,.55,i+Math.sin(f)*a,-Math.cos(f)*d,0,-Math.sin(f)*d,.1,.07,.03,c*.004)}n.after(.1,()=>{n.particles.use(Mt.hitFlash).tint(W.white,_p.glow).spawn(s,.9,i,0,0,0,le.flashSkill,a*.5,a*.85),wm(n,s,.7,i,a*.2,a*.98,.6,.3,_p.hot,1.9,.9),bn(n,s,i,a,.4,_p.glow,1.6,.12,.25),bx(n,s,i,a*.72,.45,_p.accent,2,1.3,!1,.2,.04),Lr(n,s,i,.22,5.5,.32,_p.hot,1.6,.6),Mm(n,s,1.1,i,3,2.4),Ex(n,s,1,i,10,5),_isL?(n.decals.add(Xt.rune,s,i,a*.92,1.15).params(8,.6).color(_p.accent,1.8,.95).under(_p.dark,.35),_tsSilkBurst(n,s,.9,i,12,a*.6,5,_p.accent,_p.hot)):(n.decals.add(Xt.rune,s,i,a*.88,1.05).params(8,.7).color(_p.glow,1.7,.92).under(_p.dark,.35),n.particles.use(Mt.ink).spawn(s,.7,i,0,.5,0,.55,1.6,2.4)),n.light(s,i,1.8,_p.glow,le.lightMax,a*2.4,.35)',
    'CD xingli s2 sushi bagua ink vs liue gold decree',
  );
  code = assertReplace(
    code,
    'LD=(n,t)=>{const e=t.unitId??-1,s=n.anchor(e),i=s?n.a.x:t.pos.x,a=s?n.a.z:t.pos.y,o=s&&n.a.unit?n.a.unit.facing:0,r=Math.cos(o),l=Math.sin(o),c=n.decals.add(Xt.moon,i,a,2.1,1.1).params(.7,1).color(Pn.hot,1.5).under(Pn.dark,.35);s&&c.follow(e);const f=Lr(n,s?0:i,s?0:a,.18,9,.6,Pn.hot,1.5,.55);s&&f.follow(e);for(let h=0;h<2;h++){const u=wm(n,s?0:i,.3,s?0:a,1.2-h*.3,.55,5,.55,Pn.glow,1.8,.85).delay(h*.12);s&&u.follow(e)}const d=n.lowQ?3:5;for(let h=0;h<d;h++){const u=Math.ceil(h/2),m=h===0?0:h%2===1?1:-1,x=i-r*(1.6+u*.9)-l*m*u*.8,p=a-l*(1.6+u*.9)+r*m*u*.8;B1(n,x,3.3+u*.12,p,r*12,-1.3,l*12,.62,1,1.05,.05+u*.03)}Ex(n,i,1.4,a,8,2.6,.7),n.particles.use(Mt.hitFlash).tint(W.white,Pn.glow).spawn(i,1.6,a,0,0,0,le.flashSkill,1,1.7),n.light(i,a,2.2,Pn.glow,6,8,.35)},ID=(n,t)=>{const e=t.pos.x,s=t.pos.y,i=t.radius??1.7,a=n.rnd,o=ld.x+a.signed()*.5,r=ld.z+a.signed()*.5,l=ld.time,c=-o/l,f=-7.1/l,d=-r/l;B1(n,e+o,ld.y,s+r,c,f,d,l,2.05,1.08);const h=Math.hypot(o,r)||1,u=-r/h*.72,m=o/h*.72;for(const x of[1,-1])n.ribbons.trace($n.thin,e+o*.28+u*x,ld.y*.28+.4,s+r*.28+m*x,e+u*x,.55,s+m*x,l*.28,Pn.hot,Pn.glow);n.after(l,()=>{n.particles.use(Mt.hitFlash).tint(W.white,Pn.glow).spawn(e,.5,s,0,0,0,le.flashSkill,i*.7,i*1.2),B1(n,e,.6,s,c*.012,f*.012,d*.012,.32,2,1.3),bn(n,e,s,i,.36,Pn.glow,1.8,.15,.3),bx(n,e,s,i*.62,.42,Pn.accent,1,1.5,!1,.16,.03),Ni(n,e,.15,s,2,.4,1,W.sand,W.sandDark,.5),Mm(n,e,.9,s,3,1.6),n.light(e,s,1.2,Pn.glow,4,6,.25)',
    'LD=(n,t)=>{const _isL=isLiueUnit(n,t.unitId),_p=xingliPal(n,t.unitId),e=t.unitId??-1,s=n.anchor(e),i=s?n.a.x:t.pos.x,a=s?n.a.z:t.pos.y,o=s&&n.a.unit?n.a.unit.facing:0,r=Math.cos(o),l=Math.sin(o),c=n.decals.add(Xt.moon,i,a,2.1,1.1).params(.7,1).color(_p.hot,1.5).under(_p.dark,.35);s&&c.follow(e);const f=Lr(n,s?0:i,s?0:a,.18,9,.6,_p.hot,1.5,.55);s&&f.follow(e);for(let h=0;h<2;h++){const u=wm(n,s?0:i,.3,s?0:a,1.2-h*.3,.55,5,.55,_p.glow,1.8,.85).delay(h*.12);s&&u.follow(e)}const d=n.lowQ?3:5;for(let h=0;h<d;h++){const u=Math.ceil(h/2),m=h===0?0:h%2===1?1:-1,x=i-r*(1.6+u*.9)-l*m*u*.8,p=a-l*(1.6+u*.9)+r*m*u*.8;_isL?n.glow.spawn(qe.hoop,sn.hoop,.62).at(x,3.3+u*.12,p).vel(r*12,-1.3,l*12).rot(0,-Math.atan2(l,r),0).scale(.25,.75).color(_p.accent,1.8,.95).fade(.05,.4):B1(n,x,3.3+u*.12,p,r*12,-1.3,l*12,.62,1,1.05,.05+u*.03)}_isL?(n.decals.add(Xt.star,i,a,2.5,1.35).params(8,1).color(_p.accent,1.85,.95).under(_p.dark,.35),_tsSilkBurst(n,i,1.5,a,14,1.8,6,_p.accent,_p.hot)):(n.decals.add(Xt.rune,i,a,2.6,1.3).params(8,.6).color(_p.glow,1.6,.95).under(_p.dark,.35),_tsSilkBurst(n,i,1.2,a,10,1.6,5,_p.hot,_p.glow)),Ex(n,i,1.4,a,8,2.6,.7),n.particles.use(Mt.hitFlash).tint(W.white,_p.glow).spawn(i,1.6,a,0,0,0,le.flashSkill,1,1.7),n.light(i,a,2.2,_p.glow,6,8,.35)},ID=(n,t)=>{const _isL=isLiueUnit(n,t.unitId),_p=xingliPal(n,t.unitId),e=t.pos.x,s=t.pos.y,i=t.radius??1.7,a=n.rnd,o=ld.x+a.signed()*.5,r=ld.z+a.signed()*.5,l=ld.time,c=-o/l,f=-7.1/l,d=-r/l;_isL?(n.glow.spawn(qe.pillar,sn.pillar,l+.14).at(e,.05,s).scale3(.18,5.8,.18,.08,6.5,.08).color(_p.accent,1.7,.92).fade(.05,.45).opt(.35,.55,1),n.glow.spawn(qe.hoop,sn.hoop,l).at(e+o,ld.y,s+r).vel(c,f,d).scale(1.1,.45).color(_p.glow,1.9,.95).fade(.04,.3)):B1(n,e+o,ld.y,s+r,c,f,d,l,2.05,1.08);const h=Math.hypot(o,r)||1,u=-r/h*.72,m=o/h*.72;for(const x of[1,-1])n.ribbons.trace($n.thin,e+o*.28+u*x,ld.y*.28+.4,s+r*.28+m*x,e+u*x,.55,s+m*x,l*.28,_p.hot,_p.glow);n.after(l,()=>{n.particles.use(Mt.hitFlash).tint(W.white,_p.glow).spawn(e,.5,s,0,0,0,le.flashSkill,i*.7,i*1.2),_isL?(n.decals.add(Xt.star,e,s,i*.88,.95).params(8,1).color(_p.accent,1.8,.95).under(_p.dark,.4),_tsSilkBurst(n,e,.7,s,8,i*.6,5,_p.accent,_p.hot),_tsEmberBurst(n,e,.7,s,8,i*.55,5.5,_p.hot,_p.glow)):(B1(n,e,.6,s,c*.012,f*.012,d*.012,.32,2,1.3),n.particles.use(Mt.ink).spawn(e,.5,s,0,.4,0,.48,1.2,2)),bn(n,e,s,i,.36,_p.glow,1.8,.15,.3),bx(n,e,s,i*.62,.42,_p.accent,1,1.5,!1,.16,.03),Ni(n,e,.15,s,2,.4,1,W.sand,W.sandDark,.5),Mm(n,e,.9,s,3,1.6),n.light(e,s,1.2,_p.glow,4,6,.25)',
    'LD/ID xingli ult sushi geese+ink vs liue imperial edict pillars+seals',
  );
  // 文成公主 fengling：金丝箭尾 + 碧玉金凤翎飘带 + 天音宝相花阵
  code = assertReplace(
    code,
    'Ob={...ws.fengling,tail:W.white,tail2:ws.fengling.hot}',
    'Ob={...ws.fengling,tail:W.goldHot,tail2:ws.fengling.accent}',
    'Ob wencheng arrow warm Tang gold ribbon trail',
  );
  code = assertReplace(
    code,
    'n.decals.add(Xt.streak,a+e*2.2,o+s*2.2,2.6,.3).rot(i,.1).params(0,6).color(W.white,1.1,.7).under(W.black,0)}',
    'n.decals.add(Xt.streak,a+e*2.2,o+s*2.2,2.6,.3).rot(i,.1).params(0,6).color(di.accent,1.2,.78).under(W.black,0),_tsSilkBurst(n,a,r,o,6,.8,5,di.accent,di.hot)}',
    'ZP wencheng s1 silk ribbon burst',
  );
  code = assertReplace(
    code,
    'n.after(l,()=>{Ni(n,s.x,.15,s.y,2,.3,.8,W.dust,W.dustDark,.4),Mm(n,s.x,1.2,s.y,2,1.4,-i*1.5,-a*1.5)})}',
    '_tsSilkBurst(n,e.x,.9,e.y,8,.9,4.5,di.accent,di.hot),n.after(l,()=>{Ni(n,s.x,.15,s.y,2,.3,.8,W.dust,W.dustDark,.4),Mm(n,s.x,1.2,s.y,2,1.4,-i*1.5,-a*1.5)})}',
    'QP wencheng s2 vault silk burst',
  );
  code = assertReplace(
    code,
    'n.particles.use(Mt.hitFlash).tint(W.white,di.hot).spawn(e,2.1,s,0,0,0,le.flashSkill,.9,1.5),n.light(e,s,2,di.glow,5,7,.3)}',
    'n.particles.use(Mt.hitFlash).tint(W.white,di.hot).spawn(e,2.1,s,0,0,0,le.flashSkill,.9,1.5),n.decals.add(Xt.star,e,s,2.2,1.1).params(8,1).color(di.accent,1.75,.95).under(di.dark,.35),_tsSilkBurst(n,e,1.4,s,12,1.4,5.5,di.accent,di.hot),n.light(e,s,2,di.glow,5,7,.3)}',
    'JP wencheng ult cast golden Baoxianghua seal',
  );
  code = assertReplace(
    code,
    'n.decals.add(Xt.ring,e,s,i,.4).params(.82,1).color(di.glow,1.1,.8).under(di.dark,.2)}',
    'n.decals.add(Xt.ring,e,s,i,.4).params(.82,1).color(di.glow,1.1,.8).under(di.dark,.2),_tsSilkBurst(n,e,.9,s,5,i*.75,4,di.accent,di.hot)}',
    'tD wencheng ult rain golden silk feathers',
  );
  // 辛弃疾 yeque：朱砂破营烽火星烬 + 十字交叉破营巨斩 + 「破」字毛笔符印
  code = assertReplace(
    code,
    'n.after(l,()=>{n.particles.use(Mt.hitFlash).tint(W.white,Ci.hot).spawn(i.x,1,i.y,0,0,0,le.flashBasic,.7,1.2),Sh(n,i.x,.8,i.y,5,5,a,o,.6)}),t.unitId===e.playerId&&n.shake(.08,s.x,s.y)}',
    '_tsEmberBurst(n,(s.x+i.x)/2,.8,(s.y+i.y)/2,9,1.2,5.5,Ci.hot,Ci.glow),_tsRuneBurst(n,1,(s.x+i.x)/2,.85,(s.y+i.y)/2,3,.8,3.2,Ci.hot,Ci.accent),n.after(l,()=>{n.particles.use(Mt.hitFlash).tint(W.white,Ci.hot).spawn(i.x,1,i.y,0,0,0,le.flashBasic,.7,1.2),Sh(n,i.x,.8,i.y,5,5,a,o,.6)}),t.unitId===e.playerId&&n.shake(.08,s.x,s.y)}',
    'FD xinqiji s1 dash war-torch embers & brush glyphs',
  );
  code = assertReplace(
    code,
    'Sh(n,a,r,o,7,7,e,s,l*1.6),Th(n,t.pos.x+e*.3,.9,t.pos.y+s*.3,.7,!1)}',
    'Sh(n,a,r,o,7,7,e,s,l*1.6),Th(n,t.pos.x+e*.3,.9,t.pos.y+s*.3,.7,!1),_tsEmberBurst(n,a,r,o,7,.7,6,Ci.hot,Ci.accent)}',
    'UD xinqiji s2 fan throw torch embers',
  );
  code = assertReplace(
    code,
    'QM(n,s-c*1.7,r-.1,i-f*1.7+.5,h,2.1,.24,Ci.hot,W.white,1.25,-Math.PI/2+.4,!1,2.6)',
    'QM(n,s-c*1.7,r-.1,i-f*1.7+.5,h,2.1,.24,Ci.hot,W.white,1.25,-Math.PI/2+.4,!1,2.6),QM(n,s+c*.35,r+.22,i+f*.35,h+Math.PI*.16,2.25,.24,Ci.accent,Ci.hot,1.35,Math.PI*.42,!0,2.7)',
    'BD xinqiji ult double X-slash',
  );
  code = assertReplace(
    code,
    'n.decals.add(Xt.scorch,s,i,1.25,2.2).color(W.black,0).under(W.ink,.9),n.light(s,i,r,Ci.hot,le.lightMax,8,.3),n.shake(bo(t,e)?.4:.25,s,i)}',
    'n.decals.add(Xt.scorch,s,i,1.25,2.2).color(W.black,0).under(W.ink,.9),n.decals.add(Xt.star,s,i,2.1,1.3).params(8,1).color(Ci.glow,1.9,.95).under(W.cinnabar,.45),_tsEmberBurst(n,s,r,i,16,1.6,7.5,Ci.hot,Ci.glow),_tsRuneBurst(n,1,s,r,i,5,1.4,5.5,Ci.hot,Ci.glow),n.light(s,i,r,Ci.hot,le.lightMax,8,.3),n.shake(bo(t,e)?.4:.25,s,i)}',
    'BD xinqiji ult strike cinnabar seal, rune glyph & war embers',
  );
  // 秦琼 panyue_s2_aura & panyue_ult_fissure：玄甲八卦阵 + 旋转「破」字战印
  code = assertReplace(
    code,
    'panyue_s2_aura:{create(n,t){ad(n,t,0,0,yc.dark);for(let e=0;e<3;e++){const s=n.glow.hold(qe.shield,sn.plate);s.color(yc.hot,1.15,0),s.add=.25,s.k=.16,t.meshes.push(s)}},update(n,t,e){od(n,t);const s=t.meshes.length,i=Math.min(1,t.age*5),a=Math.max(0,Math.min(1,(t.duration-t.age)*4));for(let o=0;o<s;o++){const r=t.phase+t.age*1.1+o*oe/s,l=t.meshes[o];l.at(t.x+Math.cos(r)*2.05,.08,t.z+Math.sin(r)*2.05).scale(1.75*i).rot(0,-r,.05),l.a=.85*a,l.progress=(t.age*.62+o/s)%1}for(let o=xc(n,t,e,6);o>0;o--){const r=n.rnd.next()*oe,l=t.radius*n.rnd.range(.55,1);n.particles.use(Mt.dust).spawn(t.x+Math.cos(r)*l,.15,t.z+Math.sin(r)*l,-Math.cos(r)*1.4,.4,-Math.sin(r)*1.4,.7,.5,.9)}},end(n,t){bn(n,t.x,t.z,t.radius*.5,.35,yc.glow,1.1,.5,.2),Ha(n,t.x,t.z,5,1.4,2.5,W.dust,W.dustDark,1,.6)}},',
    'panyue_s2_aura:{create(n,t){ad(n,t,0,0,yc.dark);const g=Gd(n,t,Xt.rune,.08);n.decals.at(g).params(8,.85).color(yc.glow,1.35,.82).under(yc.dark,.28);for(let e=0;e<3;e++){const s=n.glow.hold(qe.shield,sn.plate);s.color(yc.hot,1.15,0),s.add=.25,s.k=.16,t.meshes.push(s)}},update(n,t,e){od(n,t);const s=t.meshes.length,i=Math.min(1,t.age*5),a=Math.max(0,Math.min(1,(t.duration-t.age)*4));for(let o=0;o<s;o++){const r=t.phase+t.age*1.1+o*oe/s,l=t.meshes[o];l.at(t.x+Math.cos(r)*2.05,.08,t.z+Math.sin(r)*2.05).scale(1.75*i).rot(0,-r,.05),l.a=.85*a,l.progress=(t.age*.62+o/s)%1;n.sprites.draw(Ft.rune1,t.x+Math.cos(-r+oe/6)*2.15,.95,t.z+Math.sin(-r+oe/6)*2.15,.68,0,yc.accent,1.9,.9*a,.6)}for(let o=xc(n,t,e,6);o>0;o--){const r=n.rnd.next()*oe,l=t.radius*n.rnd.range(.55,1);n.particles.use(Mt.dust).spawn(t.x+Math.cos(r)*l,.15,t.z+Math.sin(r)*l,-Math.cos(r)*1.4,.4,-Math.sin(r)*1.4,.7,.5,.9)}},end(n,t){bn(n,t.x,t.z,t.radius*.5,.35,yc.glow,1.1,.5,.2),Ha(n,t.x,t.z,5,1.4,2.5,W.dust,W.dustDark,1,.6)}},',
    'panyue_s2_aura golden Bagua + orbiting war glyphs',
  );
  code = assertReplace(
    code,
    'panyue_ult_fissure:{create(n,t){ad(n,t,0,1,yc.dark)},update(n,t,e){od(n,t);for(let s=xc(n,t,e,12);s>0;s--){const i=n.rnd,a=i.next()*oe,o=t.radius*Math.sqrt(i.next())*.95,r=t.x+Math.cos(a)*o,l=t.z+Math.sin(a)*o,c=i.next();if(c<.55)n.particles.use(Mt.dust).spawn(r,.1,l,0,i.range(.5,1.2),0,.9,.5,1.2);else if(c<.88){const f=i.range(.12,.22);n.particles.use(Mt.debris).tint(W.earth,W.earthDark).spawn(r,.1,l,i.signed()*.6,i.range(2.2,4),i.signed()*.6,.6,f,f*.8)}else n.particles.use(Mt.ember).tint(yc.hot,yc.deep).spawn(r,.1,l,i.signed()*.3,i.range(.8,1.8),i.signed()*.3,i.range(.5,.8),.13,.04)}}},',
    'panyue_ult_fissure:{create(n,t){ad(n,t,0,1,yc.dark);const g=Gd(n,t,Xt.rune,.08);n.decals.at(g).params(8,.35).color(yc.glow,1.6,.92).under(yc.dark,.35)},update(n,t,e){od(n,t);for(let s=xc(n,t,e,12);s>0;s--){const i=n.rnd,a=i.next()*oe,o=t.radius*Math.sqrt(i.next())*.95,r=t.x+Math.cos(a)*o,l=t.z+Math.sin(a)*o,c=i.next();if(c<.5)n.particles.use(Mt.dust).spawn(r,.1,l,0,i.range(.5,1.2),0,.9,.5,1.2);else if(c<.82){const f=i.range(.12,.22);n.particles.use(Mt.debris).tint(W.earth,W.earthDark).spawn(r,.1,l,i.signed()*.6,i.range(2.2,4),i.signed()*.6,.6,f,f*.8)}else{n.particles.use(Mt.ember).tint(yc.hot,yc.deep).spawn(r,.1,l,i.signed()*.3,i.range(.8,1.8),i.signed()*.3,i.range(.5,.8),.13,.04);i.chance(.32)&&n.particles.use(Mt.rune1).tint(yc.hot,yc.accent).spawn(r,.35,l,i.signed()*.25,i.range(1.1,2.2),i.signed()*.25,i.range(.5,.85),.46,.32)}}}},',
    'panyue_ult_fissure Bagua Zhenyue + war glyph embers',
  );
  // 花蕊夫人 chijin_ult_spin：三层红金交错剑弧 + 六瓣宝相地面花阵 + 飞花绯绸漩涡
  code = assertReplace(
    code,
    'chijin_ult_spin:{create(n,t){ad(n,t,0,2,rd.dark);const e=n.glow.hold(qe.cone,sn.vortex);e.color(EP,.9,0),e.add=.3,e.k=4,e.progress=.3,t.meshes.push(e);for(let s=0;s<2;s++){const i=n.glow.hold(qe.slash,sn.slash);i.color(s===0?rd.glow:rd.accent,1.25,0),i.add=.2,i.k=.62,i.progress=-2,t.meshes.push(i)}},update(n,t,e){od(n,t);const s=Math.min(1,t.age*4),i=Math.max(0,Math.min(1,(t.duration-t.age)*3)),a=t.radius*.55*s,o=t.meshes[0];o.at(t.x,.05,t.z).scale3(a,2.1*s,a).rot(0,t.age*7,0),o.a=(n.lowQ?.2:.4)*i;for(let r=1;r<t.meshes.length;r++){const l=t.meshes[r],c=t.radius*.94*(.4+.6*s);l.at(t.x,.85+(r-1)*.45,t.z).scale(c).rot(r===1?.1:-.1,t.phase+t.age*12+r*Math.PI,0),l.a=.55*i}for(let r=xc(n,t,e,22);r>0;r--){const l=n.rnd,c=l.next()*oe;l.chance(.6)?n.particles.use(Mt.dust).tint(W.sand,W.dustDark).orbit(t.x,l.range(.15,.6),t.z,t.radius*l.range(.45,.7),t.radius*l.range(.9,1.05),c,-5,l.range(.3,1),l.range(.4,.6),.5,1):n.particles.use(Mt.spark).tint(TP,rd.deep).orbit(t.x,l.range(.4,1.4),t.z,t.radius*l.range(.7,.9),t.radius*l.range(.95,1.1),c,-9,l.range(.5,2),l.range(.16,.24),.1,.03)}},end(n,t){bn(n,t.x,t.z,t.radius,.4,rd.glow,1.3,.5,.25),Ha(n,t.x,t.z,8,t.radius*.5,3,W.sand,W.dustDark,1.1,.6)}},',
    'chijin_ult_spin:{create(n,t){ad(n,t,0,2,rd.dark);const d=Gd(n,t,Xt.star,.08);n.decals.at(d).params(6,1).color(rd.accent,1.45,.88).under(rd.dark,.38);const e=n.glow.hold(qe.cone,sn.vortex);e.color(rd.deep,.75,0),e.add=.22,e.k=3.6,e.progress=.3,t.meshes.push(e);for(let s=0;s<3;s++){const i=n.glow.hold(qe.slash,sn.slash);i.color(s%2===0?rd.glow:rd.accent,1.3,0),i.add=.22,i.k=.58,i.progress=-2,t.meshes.push(i)}},update(n,t,e){od(n,t);t.slots.length>1&&n.decals.at(t.slots[1]).rot(-t.age*1.4,.12);const s=Math.min(1,t.age*4),i=Math.max(0,Math.min(1,(t.duration-t.age)*3)),a=t.radius*.55*s,o=t.meshes[0];o.at(t.x,.05,t.z).scale3(a,2.05*s,a).rot(0,t.age*7,0),o.a=(n.lowQ?.18:.34)*i;for(let r=1;r<t.meshes.length;r++){const l=t.meshes[r],c=t.radius*(.88+.08*r)*(.4+.6*s);l.at(t.x,.65+(r-1)*.4,t.z).scale(c).rot(r===1?.12:r===2?-.12:.04,t.phase+t.age*(11+r)+r*oe/3,0),l.a=.58*i}for(let r=xc(n,t,e,24);r>0;r--){const l=n.rnd,c=l.next()*oe,w=l.next();w<.48?n.particles.use(Mt.leaf).tint(rd.glow,rd.hot).orbit(t.x,l.range(.3,1.5),t.z,t.radius*l.range(.45,.85),t.radius*l.range(.85,1.1),c,-7,l.range(.5,2),l.range(.22,.34),.25,.05):w<.76?n.particles.use(Mt.silk).tint(rd.accent,rd.hot).orbit(t.x,l.range(.4,1.35),t.z,t.radius*l.range(.55,.8),t.radius*l.range(.9,1.08),c,-8,l.range(.4,1.6),l.range(.18,.28),.22,.04):n.particles.use(Mt.spark).tint(rd.accent,rd.deep).orbit(t.x,l.range(.4,1.4),t.z,t.radius*l.range(.7,.9),t.radius*l.range(.95,1.1),c,-9,l.range(.5,2),l.range(.16,.24),.1,.03)}},end(n,t){bn(n,t.x,t.z,t.radius,.4,rd.glow,1.3,.5,.25),_tsPetalBurst(n,t.x,.8,t.z,12,t.radius*.7,6,rd.glow,rd.hot)}},',
    'chijin_ult_spin 3 staggered arcs + crimson Baoxianghua + flying petals & silk',
  );
  // 苏轼 vs 刘娥 xingli_s2_well / xingli_ult_storm & 文成公主 fengling_ult_rain
  code = assertReplace(
    code,
    'xingli_s2_well:{create(n,t){const e=Gd(n,t,Xt.swirl,.08);n.decals.at(e).params(2,-3).color(Zr.glow,1.2,.55).under(Zr.dark,.14);const s=n.glow.hold(qe.hoop,sn.hoop);s.color(Zr.glow,1.2,.85),s.add=.3,t.meshes.push(s)},update(n,t,e){const s=1-.72*t.t*t.t;n.decals.at(t.slots[0]).at(t.x,t.z).radius(t.radius);const i=t.meshes[0];i.at(t.x,.7+t.t*.6,t.z).scale(t.radius*s),i.rot(0,t.age*3,0);for(let a=0;a<4;a++){const o=t.phase+t.age*(4+t.t*6)+a*oe/4,r=t.x+Math.cos(o)*t.radius*s,l=t.z+Math.sin(o)*t.radius*s;n.sprites.draw(Ft.glow,r,.75+t.t*.6,l,.62,0,Zr.accent,2.1,1,.7)}for(let a=xc(n,t,e,26);a>0;a--){const o=n.rnd;n.particles.use(Mt.mote).orbit(t.x,o.range(.1,.9),t.z,t.radius*o.range(.7,1.05),t.radius*.15,o.next()*oe,5,.6,.3,.2,.06)}}},xingli_ult_storm:{create(n,t){ad(n,t,-9,0,Zr.dark);const e=Gd(n,t,Xt.moon,.3);n.decals.at(e).params(.74,.6).color(Zr.hot,1,.4).under(Zr.dark,.1)},',
    'xingli_s2_well:{create(n,t){const _isL=isLiueUnit(n,t.ownerId),_p=xingliPal(n,t.ownerId);t._isLiue=_isL;t._pal=_p;const e=Gd(n,t,Xt.swirl,.08);n.decals.at(e).params(2,-3).color(_p.glow,1.2,.55).under(_p.dark,.14);const g=Gd(n,t,Xt.rune,.08);n.decals.at(g).params(8,1.1).color(_p.glow,1.25,.75).under(_p.dark,.22);const s=n.glow.hold(qe.hoop,sn.hoop);s.color(_p.glow,1.2,.85),s.add=.3,t.meshes.push(s)},update(n,t,e){const _p=t._pal??Zr,s=1-.72*t.t*t.t;for(const sl of t.slots)n.decals.at(sl).at(t.x,t.z).radius(t.radius);const i=t.meshes[0];i.at(t.x,.7+t.t*.6,t.z).scale(t.radius*s),i.rot(0,t.age*3,0);for(let a=0;a<4;a++){const o=t.phase+t.age*(4+t.t*6)+a*oe/4,r=t.x+Math.cos(o)*t.radius*s,l=t.z+Math.sin(o)*t.radius*s;n.sprites.draw(t._isLiue?Ft.rune3:Ft.rune2,r,.78+t.t*.6,l,.78,0,_p.accent,2.2,1,.75)}for(let a=xc(n,t,e,24);a>0;a--){const o=n.rnd;t._isLiue?n.particles.use(Mt.silk).tint(_p.accent,_p.hot).orbit(t.x,o.range(.15,.9),t.z,t.radius*o.range(.7,1.05),t.radius*.15,o.next()*oe,5,.6,.3,.2,.06):n.particles.use(Mt.inkDot).orbit(t.x,o.range(.1,.9),t.z,t.radius*o.range(.7,1.05),t.radius*.15,o.next()*oe,5,.6,.3,.2,.06)}}},xingli_ult_storm:{create(n,t){const _isL=isLiueUnit(n,t.ownerId),_p=xingliPal(n,t.ownerId);t._isLiue=_isL;t._pal=_p;ad(n,t,-9,0,_p.dark);const e=Gd(n,t,Xt.moon,.3);n.decals.at(e).params(.74,.6).color(_p.hot,1,.4).under(_p.dark,.1);const bg=Gd(n,t,_isL?Xt.star:Xt.rune,.12);n.decals.at(bg).params(8,_isL?1:.6).color(_p.accent,1.35,.78).under(_p.dark,.28)},',
    'xingli_s2_well & xingli_ult_storm create Bagua/decree decals + runes',
  );
  code = assertReplace(
    code,
    'update(n,t,e){od(n,t,s=>s===1?.5:1);for(let s=xc(n,t,e,7);s>0;s--){const i=n.rnd,a=i.next()*oe,o=t.radius*Math.sqrt(i.next())*.9,r=t.x+Math.cos(a)*o,l=t.z+Math.sin(a)*o;if(i.chance(.5)){const c=i.range(.5,.65);B1(n,r+3.2,4.6,l-2.4,-6.4/c,-3.4/c,4.8/c,c,.9,1.05)}else n.particles.use(Mt.plume).spawn(r,i.range(1.5,3),l,i.signed()*.5,-.4,i.signed()*.5,i.range(.9,1.3),.34,.28)}},end(n,t){bn(n,t.x,t.z,t.radius,.5,Zr.glow,1.1,.85,.2)}},fengling_ult_rain:{create(n,t){ad(n,t,30,0,Ku.dark);const e=Gd(n,t,Xt.glow,.25);n.decals.at(e).params(.6).color(W.black,0,.32).under(Ku.dark,.05)},update(n,t,e){od(n,t);for(let s=xc(n,t,e,10);s>0;s--){const i=n.rnd,a=i.next()*oe,o=t.radius*Math.sqrt(i.next())*.95,r=t.x+Math.cos(a)*o,l=t.z+Math.sin(a)*o,c=i.range(.16,.22);n.particles.use(Mt.arrow).tint(W.plume,Ku.hot).spawn(r+1.4,10,l+.9,-1.4/c,-10/c,-.9/c,c,.5,.45),n.particles.use(Mt.dust).spawn(r,.12,l,0,i.range(.4,.9),0,.32,.26,.6,c)}},end(n,t){bn(n,t.x,t.z,t.radius,.5,Ku.glow,1,.85,.2)}},',
    'update(n,t,e){const _p=t._pal??Zr,_isL=!!t._isLiue;od(n,t,s=>s===1?.5:1);for(let s=xc(n,t,e,8);s>0;s--){const i=n.rnd,a=i.next()*oe,o=t.radius*Math.sqrt(i.next())*.9,r=t.x+Math.cos(a)*o,l=t.z+Math.sin(a)*o;if(_isL){if(i.chance(.42))n.glow.spawn(qe.pillar,sn.pillar,.42).at(r,.05,l).scale3(.15,5.2,.15,.06,5.8,.06).color(_p.accent,1.6,.9).fade(.05,.4).opt(.35,.55,1);else if(i.chance(.55))n.particles.use(Mt.silk).tint(_p.accent,_p.hot).spawn(r,i.range(.8,2.2),l,i.signed()*.8,i.range(.6,2),i.signed()*.8,i.range(.6,.95),.24,.18);else n.particles.use(Mt.rune3).tint(_p.accent,_p.hot).spawn(r,.6,l,i.signed()*.35,i.range(1.6,2.8),i.signed()*.35,i.range(.55,.85),.56,.36)}else{if(i.chance(.44)){const c=i.range(.5,.65);B1(n,r+3.2,4.6,l-2.4,-6.4/c,-3.4/c,4.8/c,c,.9,1.05)}else if(i.chance(.5))n.particles.use(Mt.inkRise).spawn(r,.25,l,i.signed()*.6,i.range(1.5,3),i.signed()*.6,i.range(.5,.85),.38,.2);else n.particles.use(Mt.rune2).tint(_p.hot,_p.glow).spawn(r,.7,l,i.signed()*.4,i.range(1.4,2.6),i.signed()*.4,i.range(.55,.85),.56,.36)}}},end(n,t){bn(n,t.x,t.z,t.radius,.5,(t._pal??Zr).glow,1.1,.85,.2)}},fengling_ult_rain:{create(n,t){ad(n,t,30,0,Ku.dark);const e=Gd(n,t,Xt.star,.14);n.decals.at(e).params(8,1).color(Ku.accent,1.4,.85).under(Ku.dark,.22);const s=Gd(n,t,Xt.sigil,.16);n.decals.at(s).params(2,.4).color(Ku.glow,1.35,.82).under(Ku.dark,.12)},update(n,t,e){od(n,t);for(let s=xc(n,t,e,10);s>0;s--){const i=n.rnd,a=i.next()*oe,o=t.radius*Math.sqrt(i.next())*.95,r=t.x+Math.cos(a)*o,l=t.z+Math.sin(a)*o,c=i.range(.16,.22);n.particles.use(Mt.arrow).tint(W.goldHot,Ku.glow).spawn(r+1.4,10,l+.9,-1.4/c,-10/c,-.9/c,c,.52,.45);i.chance(.45)?n.particles.use(Mt.silk).tint(Ku.accent,Ku.hot).spawn(r,i.range(.6,1.8),l,i.signed()*.8,i.range(.4,1.6),i.signed()*.8,i.range(.6,.95),.22,.16,c):n.particles.use(Mt.leaf).tint(Ku.accent,Ku.hot).spawn(r,i.range(1.2,2.4),l,i.signed()*1,-.6,i.signed()*1,i.range(.7,1.1),.22,.16);n.particles.use(Mt.plume).spawn(r,i.range(1,2.5),l,i.signed()*.5,-.4,i.signed()*.5,i.range(.7,1.1),.28,.22,c)}},end(n,t){bn(n,t.x,t.z,t.radius,.5,Ku.glow,1,.85,.2)}},',
    'xingli_ult_storm (ink cranes + rune2 vs gold decree pillars + rune3) & fengling_ult_rain (Dunhuang lotus + silk)',
  );
  code = assertReplace(
    code,
    'xingli_basic:To({shape:qe.slash,mode:sn.slash,scale:[.62,.62,.62],colors:()=>Ub,',
    'xingli_basic:To({shape:qe.slash,mode:sn.slash,scale:[.62,.62,.62],colors:(t,hId)=>hId==="liue"?{...ws.liue,tail:W.stringGold,tail2:ws.liue.accent,ribbon:$n.string,isLiue:!0}:{...Ub,tail:W.ink,tail2:ws.sushi.glow,ribbon:$n.ink,isLiue:!1},',
    'Bb xingli_basic per-hero palette & ribbon',
  );
  code = assertReplace(
    code,
    'n.particles.use(Mt.hitFlash).tint(W.white,t.glow).spawn(e,s,i,0,0,0,le.flashBasic,.5,.85),Ju(n,t,e,s,i,1.25,.24)}}),xingli_s1:To({shape:qe.slash,mode:sn.slash,scale:[1.12,1.12,1.12],colors:()=>Ub,intensity:2.4,add:.35,k:.66,progress:-2,echo:2,echoGap:.56,ribbon:$n.string,ribbonWidth:1.5,halo:1.1,rate:30,ground:1.1,emit(n,t,e,s,i,a,o){const r=n.rnd,l=r.chance(.5)?1:-1,c=r.range(4.5,7.5);n.particles.use(Mt.string).spawn(e-a*r.range(.3,1.4),s+r.signed()*.08,i-o*r.range(.3,1.4),-o*l*c,0,a*l*c,.12,.05,.02)},hit(n,t,e,s,i,a){n.particles.use(Mt.hitFlash).tint(W.white,t.glow).spawn(e,s,i,0,0,0,le.flashSkill,.9,1.5),Ju(n,t,e,s,i,2,.28),Ju(n,t,e,s,i,1.4,.3,.07),n.decals.add(Xt.rings,e,i,1.3,.38).params(2,.22).color(t.glow,1.5).under(W.shadow,.25);const o=n.particles.use(Mt.mote);for(let r=0;r<n.n(4);r++)o.spawn(e,s,i,n.rnd.signed()*3,n.rnd.range(.5,3),n.rnd.signed()*3,.4,.2,.05);a&&n.shake(.08,e,i)},',
    'n.particles.use(Mt.hitFlash).tint(W.white,t.glow).spawn(e,s,i,0,0,0,le.flashBasic,.5,.85),Ju(n,t,e,s,i,1.25,.24),t.isLiue?(n.decals.add(Xt.star,e,i,1.2,.48).params(6,1).color(t.accent,1.45,.9).under(t.dark,.32),_tsRuneBurst(n,3,e,s,i,2,.55,2.4,t.accent,t.hot)):(n.decals.add(Xt.ink,e,i,1.35,.52).color(t.glow,1.2).under(W.ink,.88),_tsRuneBurst(n,2,e,s,i,2,.55,2.4,t.hot,t.glow))}}),xingli_s1:To({shape:qe.slash,mode:sn.slash,scale:[1.12,1.12,1.12],colors:(t,hId)=>hId==="liue"?{...ws.liue,tail:W.stringGold,tail2:ws.liue.accent,ribbon:$n.string,isLiue:!0}:{...Ub,tail:W.ink,tail2:ws.sushi.glow,ribbon:$n.ink,isLiue:!1},intensity:2.4,add:.35,k:.66,progress:-2,echo:2,echoGap:.56,ribbon:$n.string,ribbonWidth:1.5,halo:1.1,rate:30,ground:1.1,emit(n,t,e,s,i,a,o){const r=n.rnd,l=r.chance(.5)?1:-1,c=r.range(4.5,7.5);t.isLiue?(n.particles.use(Mt.silk).tint(t.accent,t.hot).spawn(e-a*r.range(.2,1),s+r.signed()*.12,i-o*r.range(.2,1),-o*l*c*.5,r.range(.2,1.2),a*l*c*.5,.28,.16,.12),r.chance(.35)&&n.particles.use(Mt.rune3).tint(t.accent,t.hot).spawn(e,s+.15,i,0,.8,0,.35,.46,.3)):(n.particles.use(Mt.inkDot).spawn(e-a*r.range(.3,1.4),s+r.signed()*.08,i-o*r.range(.3,1.4),-o*l*c*.4,r.range(0,.9),a*l*c*.4,.24,.1,.05),r.chance(.35)&&n.particles.use(Mt.rune2).tint(t.hot,t.glow).spawn(e,s+.15,i,0,.8,0,.35,.46,.3))},hit(n,t,e,s,i,a){n.particles.use(Mt.hitFlash).tint(W.white,t.glow).spawn(e,s,i,0,0,0,le.flashSkill,.9,1.5),Ju(n,t,e,s,i,2,.28),Ju(n,t,e,s,i,1.4,.3,.07),t.isLiue?(n.decals.add(Xt.star,e,i,1.85,.7).params(8,1).color(t.accent,1.7,.95).under(t.dark,.4),_tsRuneBurst(n,3,e,s,i,4,1.1,4,t.accent,t.hot)):(n.decals.add(Xt.ink,e,i,2.1,.75).color(t.glow,1.3).under(W.ink,.92),_tsRuneBurst(n,2,e,s,i,4,1.1,4,t.hot,t.glow));const o=n.particles.use(Mt.mote);for(let r=0;r<n.n(4);r++)o.spawn(e,s,i,n.rnd.signed()*3,n.rnd.range(.5,3),n.rnd.signed()*3,.4,.2,.05);a&&n.shake(.08,e,i)},',
    'Bb xingli_basic + xingli_s1 ink vs decree impacts & rune bursts',
  );
  code = assertReplace(
    code,
    'n.particles.use(Mt.grass).spawn(e+r.signed()*.3,.1,i+r.signed()*.3,a*r.range(2,5)+r.signed()*1.5,r.range(1.2,2.6),o*r.range(2,5)+r.signed()*1.5,r.range(.35,.55),l,l*.8)},hit(n,t,e,s,i,a,o,r){vs(n,e,s,i,1.6,W.white,t.glow,o,r,6,le.flashSkill,9),bn(n,e,i,1.5,.3,t.glow,1.4,.2,.25);',
    'n.particles.use(Mt.silk).tint(t.accent,t.hot).spawn(e+r.signed()*.3,s+r.signed()*.2,i+r.signed()*.3,a*r.range(1.5,3.5)+r.signed()*1.2,r.range(.5,1.8),o*r.range(1.5,3.5)+r.signed()*1.2,r.range(.35,.55),l*1.4,l)},hit(n,t,e,s,i,a,o,r){vs(n,e,s,i,1.6,W.white,t.glow,o,r,6,le.flashSkill,9),bn(n,e,i,1.5,.3,t.glow,1.4,.2,.25),n.decals.add(Xt.star,e,i,1.85,.7).params(8,1).color(t.accent,1.7,.95).under(t.dark,.35);',
    'Bb fengling_s1 golden silk trail & lotus seal impact',
  );
  code = assertReplace(
    code,
    'l.ribbon=e.ribbons.start(c.ribbon,f,h,d,',
    'l.ribbon=e.ribbons.start(l.colors.ribbon??c.ribbon,f,h,d,',
    'Bb.update support per-hero ribbon override',
  );
  code = assertReplace(
    code,
    'create(t){const e=this.k,s=Bb[t.visual],i=s.colors(t.team),',
    'create(t){const e=this.k,s=Bb[t.visual],_oh=e.anchor(t.ownerId)?e.a.unit?.heroId:void 0,i=s.colors(t.team,_oh),',
    'Bb.create pass owner heroId',
  );
  code = assertReplace(
    code,
    'xingli_mark:{create(n,t){const e=Ks(n,t,Xt.rings,.15);n.decals.at(e).y(.07).params(1,1).color(t2.hot,1.6,.9).under(t2.dark,.3)},update(n,t,e,s){const i=Math.max(1,Math.min(3,s.stacks));n.decals.at(t.slots[0]).at(e.x,e.z).radius(e.radius*Gb).params(i,1).alpha(i>=3?1:.8);const a=Math.min(1,t.age*8),o=e.radius+.5;for(let r=0;r<i;r++){const l=t.phase+t.age*2.6+r*oe/3,c=.42*(r===i-1?.6+.4*a:1),f=e.y+e.height*.55+Math.sin(t.age*3.2+r*2.1)*.12;n.sprites.icon(Ft.glow,e.x+Math.cos(l)*o,f,e.z+Math.sin(l)*o,c*1.5,0,t2.accent,1.9,1,.5,.2)}}}',
    'xingli_mark:{create(n,t){const e=Ks(n,t,Xt.rings,.15);n.decals.at(e).y(.07).params(1,1).color(t2.hot,1.6,.9).under(t2.dark,.3)},update(n,t,e,s){const _p=s?.sourceId!==void 0&&n.anchors.unit(s.sourceId)?.heroId==="liue"?ws.liue:t2;if(!t._markCol){t._markCol=!0;n.decals.at(t.slots[0]).color(_p.hot,1.6,.9).under(_p.dark,.3)}const i=Math.max(1,Math.min(3,s.stacks));n.decals.at(t.slots[0]).at(e.x,e.z).radius(e.radius*Gb).params(i,1).alpha(i>=3?1:.8);const a=Math.min(1,t.age*8),o=e.radius+.5;for(let r=0;r<i;r++){const l=t.phase+t.age*2.6+r*oe/3,c=.42*(r===i-1?.6+.4*a:1),f=e.y+e.height*.55+Math.sin(t.age*3.2+r*2.1)*.12;n.sprites.icon(Ft.glow,e.x+Math.cos(l)*o,f,e.z+Math.sin(l)*o,c*1.5,0,_p.accent,1.9,1,.5,.2)}}}',
    'xingli_mark liue vs sushi tint',
  );

  // ── 11. kitOf 全链路映射 & 24 枚专属唐宋技能图标 ──
  code = assertReplace(code, 'this.at(ET[f.heroId],f.pos', 'this.at(ET[kitOf(f.heroId)],f.pos', 'audio ET[kitOf]');
  code = assertReplace(code, 'const p=AT[h.heroId];', 'const p=AT[kitOf(h.heroId)];', 'audio AT[kitOf]');
  code = assertReplace(code, '`cast_${c.heroId}_${c.slot}`', '`cast_${kitOf(c.heroId)}_${c.slot}`', 'audio cast_kitOf_slot');
  code = assertReplace(code, 'o.kind==="hero"&&o.heroId==="panyue"', 'o.kind==="hero"&&kitOf(o.heroId)==="panyue"', 'vfx dust/splash kitOf panyue');
  code = assertReplace(code, 'a.kind==="hero"&&a.heroId==="panyue"', 'a.kind==="hero"&&kitOf(a.heroId)==="panyue"', 'vfx shield kitOf panyue');
  code = assertReplace(code, 'XO={panyue:1.07,chijin:.97}', 'XO=cloneForHeroes({panyue:1.07,chijin:.97})', 'XO 6-hero map');
  code = assertReplace(
    code,
    'cB={panyue:{cast_s1:["dash",.7],cast_s2:["cast_s2",1.1],cast_ult:["leap",1]},chijin:{cast_s1:["cast_s1",.9],cast_s2:["dash",.55],cast_ult:["spin",1.7]},xingli:{cast_s1:["cast_s1",.9],cast_s2:["cast_s2",1],cast_ult:["cast_ult",1.5]},fengling:{cast_s1:["cast_s1",1],cast_s2:["dash",.5],cast_ult:["cast_ult",1.2]},yeque:{cast_s1:["dash",.45],cast_s2:["cast_s2",.8],cast_ult:["cast_ult",1]}}',
    'cB=cloneForHeroes({panyue:{cast_s1:["dash",.7],cast_s2:["cast_s2",1.1],cast_ult:["leap",1]},chijin:{cast_s1:["cast_s1",.9],cast_s2:["dash",.55],cast_ult:["spin",1.7]},xingli:{cast_s1:["cast_s1",.9],cast_s2:["cast_s2",1],cast_ult:["cast_ult",1.5]},fengling:{cast_s1:["cast_s1",1],cast_s2:["dash",.5],cast_ult:["cast_ult",1.2]},yeque:{cast_s1:["dash",.45],cast_s2:["cast_s2",.8],cast_ult:["cast_ult",1]}})',
    'cB 6-hero map',
  );
  code = assertReplace(
    code,
    'fB={panyue:{drop:.3,dist:3.8,yaw:-14,x:.06,anim:"channel"},chijin:{drop:.26,dist:3,yaw:-12,x:-.08},xingli:{drop:.26,dist:2.75,yaw:-18,x:.04},fengling:{drop:.24,dist:2.75,yaw:26,x:.06,anim:"channel"},yeque:{drop:.24,dist:2.7,yaw:-22,x:0,anim:"attack",p:.17,variant:0}}',
    'fB=cloneForHeroes({panyue:{drop:.27,dist:3.35,yaw:-16,x:.04},chijin:{drop:.26,dist:3,yaw:-12,x:-.08},xingli:{drop:.26,dist:2.75,yaw:-18,x:.04},fengling:{drop:.24,dist:2.75,yaw:26,x:.06,anim:"channel"},yeque:{drop:.25,dist:2.95,yaw:-16,x:.04}})',
    'fB 6-hero map',
  );
  code = assertReplace(
    code,
    'v3={panyue:[-.44,.44],chijin:[-.38,.44],xingli:[.25,.8],fengling:[.25,.8],yeque:[.25,.8]}',
    'v3=cloneForHeroes({panyue:[-.44,.44],chijin:[-.38,.44],xingli:[.25,.8],fengling:[.25,.8],yeque:[.25,.8]})',
    'v3 6-hero map',
  );
  code = assertReplace(code, 'pB(w,b==="panyue"?1.5:1.12)', 'pB(w,kitOf(b)==="panyue"?1.15:.96)', 'gB preview celadon disk size');
  code = assertReplace(
    code,
    'function Rs(n,t=!1){const e=Se[n].palette,s=n==="yeque"?Hn(e.primary,.12):e.primary;',
    'function Rs(n,t=!1){const e=Se[n].palette,s=kitOf(n)==="yeque"?Hn(e.primary,.12):e.primary;',
    'Rs skill icon color palette',
  );
  code = assertReplace(
    code,
    'function Ia(n,t){return XB[n][t]()}',
    'function Ia(n,t){return tsConfig.getSkillIcon?.(n,t)??XB[kitOf(n)][t]()}',
    'Ia Tang-Song per-hero skill icons',
  );
  code = assertReplace(
    code,
    'function K1(n){return YB[n]()}',
    'function K1(n){return tsConfig.getSummonerIcon?.(n)??YB[n]()}',
    'K1 Tang-Song summoner skill icons',
  );
  code = assertReplace(
    code,
    'z("button","sf-hud__sk is-atk",z("span","sf-hud__atk-face",_e(r)),z("span","sf-hud__key",N2.attack))',
    'z("button","sf-hud__sk is-atk",(()=>{const f=z("span","sf-hud__atk-face"),h=tsConfig.getSummonerIcon?.("attack");return h?f.innerHTML=h:f.appendChild(_e(r)),f})(),z("span","sf-hud__key",N2.attack))',
    'Basic Attack button Tang-Song painted icon',
  );
  code = assertReplace(
    code,
    'hH={panyue:{survive:9.6,damage:4.6,control:9.4,mobility:5.4,ease:9},chijin:{survive:7.2,damage:7.6,control:4.4,mobility:7.4,ease:7},xingli:{survive:4.2,damage:9,control:8,mobility:2.6,ease:6.2},fengling:{survive:3.8,damage:9.6,control:5,mobility:6.8,ease:6.6},yeque:{survive:5.4,damage:9.2,control:3.4,mobility:9.6,ease:3.6}}',
    'hH=cloneForHeroes({panyue:{survive:9.6,damage:4.6,control:9.4,mobility:5.4,ease:9},chijin:{survive:7.2,damage:7.6,control:4.4,mobility:7.4,ease:7},xingli:{survive:4.2,damage:9,control:8,mobility:2.6,ease:6.2},fengling:{survive:3.8,damage:9.6,control:5,mobility:6.8,ease:6.6},yeque:{survive:5.4,damage:9.2,control:3.4,mobility:9.6,ease:3.6},liue:{survive:4.5,damage:8.9,control:8.4,mobility:2.6,ease:6.4}})',
    'hH 6-hero radar',
  );
  code = assertReplace(code, 'if(n.heroId!=="yeque"||t.kind==="tower"||t.kind==="core")return 1;', 'if(kitOf(n.heroId)!=="yeque"||t.kind==="tower"||t.kind==="core")return 1;', 'Dk assassin execute multiplier');
  code = assertReplace(code, 'kr.flatMap(n=>[Oa[n].s1,Oa[n].s2,Oa[n].ult]);', 'Object.assign(Oa,cloneForHeroes(Oa));kr.flatMap(n=>[Oa[n].s1,Oa[n].s2,Oa[n].ult]);', 'Oa 6-hero extend');
  code = assertReplace(
    code,
    'const OG={panyue:["ult","s1","s2"],chijin:["s2","ult","s1"],xingli:["s2","ult","s1"],fengling:["s1","ult","s2"],yeque:["s2","s1","ult"]}',
    'const OG=cloneForHeroes({panyue:["ult","s1","s2"],chijin:["s2","ult","s1"],xingli:["s2","ult","s1"],fengling:["s1","ult","s2"],yeque:["s2","s1","ult"]})',
    'OG 6-hero extend',
  );
  code = assertReplace(
    code,
    'const jG={panyue:{fleeHp:.22,recallHp:.33,engage:.9,initiator:!0,diveBackline:.2,support:!0},chijin:{fleeHp:.23,recallHp:.34,engage:.82,initiator:!0,diveBackline:.5,support:!1},xingli:{fleeHp:.3,recallHp:.38,engage:1.05,initiator:!1,diveBackline:0,support:!1},fengling:{fleeHp:.3,recallHp:.38,engage:1.05,initiator:!1,diveBackline:0,support:!1},yeque:{fleeHp:.28,recallHp:.38,engage:.94,initiator:!1,diveBackline:1.2,support:!1}}',
    'const jG=cloneForHeroes({panyue:{fleeHp:.22,recallHp:.33,engage:.9,initiator:!0,diveBackline:.2,support:!0},chijin:{fleeHp:.23,recallHp:.34,engage:.82,initiator:!0,diveBackline:.5,support:!1},xingli:{fleeHp:.3,recallHp:.38,engage:1.05,initiator:!1,diveBackline:0,support:!1},fengling:{fleeHp:.3,recallHp:.38,engage:1.05,initiator:!1,diveBackline:0,support:!1},yeque:{fleeHp:.28,recallHp:.38,engage:.94,initiator:!1,diveBackline:1.2,support:!1}})',
    'jG 6-hero extend',
  );
  code = assertReplace(
    code,
    'const pV={panyue:{cast_s2:"s2",dash:"s1",leap:"ult"},chijin:{cast_s1:"s1",dash:"s2",spin:"ult"},xingli:{cast_s1:"s1",cast_s2:"s2",cast_ult:"ult"},fengling:{cast_s1:"s1",dash:"s2",cast_ult:"ult"},yeque:{dash:"s1",cast_s2:"s2",cast_ult:"ult"}}',
    'const pV=cloneForHeroes({panyue:{cast_s2:"s2",dash:"s1",leap:"ult"},chijin:{cast_s1:"s1",dash:"s2",spin:"ult"},xingli:{cast_s1:"s1",cast_s2:"s2",cast_ult:"ult"},fengling:{cast_s1:"s1",dash:"s2",cast_ult:"ult"},yeque:{dash:"s1",cast_s2:"s2",cast_ult:"ult"}})',
    'pV 6-hero extend',
  );
  code = assertReplace(
    code,
    'const f6={panyue:{slot:"s1",reach:9},chijin:{slot:"s2",reach:5.5},xingli:null,fengling:null,yeque:{slot:"s1",reach:6.5}},d6={panyue:1.2,chijin:.7,xingli:.8,fengling:.6,yeque:.9}',
    'const f6=cloneForHeroes({panyue:{slot:"s1",reach:9},chijin:{slot:"s2",reach:5.5},xingli:null,fengling:null,yeque:{slot:"s1",reach:6.5}}),d6=cloneForHeroes({panyue:1.2,chijin:.7,xingli:.8,fengling:.6,yeque:.9})',
    'f6/d6 6-hero extend',
  );
  code = assertReplace(code, 'switch(n.heroId){case"panyue":', 'switch(kitOf(n.heroId)){case"panyue":', 'AI switch(kitOf(n.heroId))', 5);
  code = assertReplace(code, 'Wk(n,t){return tm.get(`${n}:${t}`)??tm.get(`*:${t}`)??OV}', 'Wk(n,t){const k=kitOf(n);return tm.get(`${k}:${t}`)??tm.get(`*:${t}`)??OV}', 'Wk skill handler kitOf');
  code = assertReplace(code, 'BV(n){return Gk.get(n)}', 'BV(n){return Gk.get(kitOf(n))}', 'BV passive handler kitOf');

  // ── 12. UI 全漆器化色板 Qe + 靛青玉玺徽章 FH + 唐宋书法字体 + 古风舆图小地图 mG ──
  code = replaceBetween(
    code,
    'Qe={void:"#050814",',
    'me:"#b7f36b"}',
    'Qe={void:"#090605",abyss:"#110b08",navy900:"#18100c",navy800:"#231611",navy700:"#311f17",navy600:"#442b20",navy500:"#5c3a2b",gold100:"#fff7de",gold200:"#fce3a6",gold300:"#e9bd62",gold400:"#cf993e",gold500:"#a67226",gold600:"#754d16",gold700:"#4a300c",cyan200:"#dcedfa",cyan300:"#8ac6e8",cyan400:"#589ec9",cyan500:"#2d6b96",cyan600:"#1b4566",text:"#f7eedc",text2:"#d4c3a8",text3:"#9d8b72",text4:"#6e5f4b",blue:"#5ca6d6",blueDeep:"#204f75",red:"#f05a46",redDeep:"#9c241c",green:"#6fe3a1",amber:"#ffb84d",violet:"#c494ff",me:"#ffe070"}',
    'Qe Tang-Song lacquer & indigo & cinnabar palette',
  );
  // 扫除 26 份内置 Jn(...) CSS 样式表中的全部硬编码冷深蓝 / 电光青 / 冷灰紫字面量
  const mapUiRgb = (r, g, b) => {
    if (r <= 115 && g >= 125 && b >= 165 && b > g) {
      if (g >= 200 && b >= 245) return [88, 158, 201];
      if (g >= 150 && b >= 220) return [92, 166, 214];
      return [32, 79, 117];
    }
    if (r >= 130 && r <= 210 && g >= 225 && b >= 245 && g - r >= 35) {
      return r >= 185 ? [220, 237, 250] : [138, 198, 232];
    }
    if (b - r >= 96 && b >= 175 && r <= 170 && g >= 85 && g <= 235) {
      const lum = Math.round((g + b) * 0.5);
      if (lum >= 220) return [168, 210, 240];
      if (lum >= 175) return [92, 166, 214];
      return [32, 79, 117];
    }
    if (r <= 72 && g <= 105 && b > r + 8 && (r < 62 || b - r >= 70)) {
      return [
        Math.min(255, Math.round(b * 0.72 + 16)),
        Math.min(255, Math.round(b * 0.44 + 9)),
        Math.min(255, Math.round(b * 0.3 + 6)),
      ];
    }
    if (b > r + 10 && r > g + 8) return null;
    if (b > r + 10 && r >= 65) {
      return [
        Math.min(255, b),
        Math.min(255, Math.round(r * 0.28 + b * 0.62)),
        Math.min(255, Math.round(r * 0.78)),
      ];
    }
    return null;
  };
  let sheetCount = 0;
  code = code.replace(/\b([A-Za-z0-9_$]{1,3})=Jn\(`([\s\S]*?)`\)/g, (_m, name, css) => {
    sheetCount++;
    let nextCss = css.replace(/#([0-9a-fA-F]{6})\b/g, (hm, hex) => {
      const mapped = mapUiRgb(parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16));
      return mapped ? '#' + mapped.map((v) => v.toString(16).padStart(2, '0')).join('') : hm;
    });
    nextCss = nextCss.replace(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(\s*(?:,\s*[^)]+)?)\)/g, (rm, rS, gS, bS, rest) => {
      const mapped = mapUiRgb(Number(rS), Number(gS), Number(bS));
      if (!mapped) return rm;
      return rm.startsWith('rgba')
        ? `rgba(${mapped[0]}, ${mapped[1]}, ${mapped[2]}${rest})`
        : `rgb(${mapped[0]}, ${mapped[1]}, ${mapped[2]})`;
    });
    return `${name}=Jn(\`${nextCss}\`)`;
  });
  if (sheetCount !== 26) {
    throw new Error(`[build-core] 预期改写 26 份 Jn CSS 样式表，实际命中 ${sheetCount} 份`);
  }
  code = replaceBetween(
    code,
    "FH='<svg viewBox=\"0 0 120 60\"",
    "</svg>'",
    `FH='<svg viewBox="0 0 120 60" aria-hidden="true"><defs><linearGradient id="sfl-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffdf2"/><stop offset=".55" stop-color="#e9bd62"/><stop offset="1" stop-color="#9c681c"/></linearGradient><radialGradient id="sfl-b"><stop offset="0" stop-color="#ffe7ad" stop-opacity=".55"/><stop offset="1" stop-color="#ffe7ad" stop-opacity="0"/></radialGradient></defs><circle cx="60" cy="30" r="27" fill="url(#sfl-b)"/><circle cx="60" cy="30" r="23" fill="none" stroke="#e9bd62" stroke-width="1.2" stroke-dasharray="6 3 2 3" opacity=".75"/><circle cx="60" cy="30" r="18.5" fill="none" stroke="#7ab8de" stroke-width="1" opacity=".68"/><rect x="44" y="14" width="32" height="32" rx="6" transform="rotate(45 60 30)" fill="#2a150e" stroke="url(#sfl-a)" stroke-width="2"/><circle cx="60" cy="30" r="10.5" fill="#b83226" stroke="#fff2c8" stroke-width="1.4"/><path d="M60 22L63.5 29L70 30L63.5 31L60 38L56.5 31L50 30L56.5 29Z" fill="#fff7de"/></svg>'`,
    'FH Tang-Song Imperial Indigo-Lacquer Emblem',
  );
  code = assertReplace(
    code,
    'const jb=\'"PingFang SC","HarmonyOS Sans SC","Microsoft YaHei",sans-serif\',c3=\'"Trebuchet MS","Arial Black","Helvetica Neue",Arial,sans-serif\';',
    'const jb=\'"TangSongBrush","TangSongSerif","KaiTi","Songti SC",serif\',c3=\'"TangSongNum","TangSongBrush","Trebuchet MS",serif\';',
    'jb & c3 TangSongBrush + TangSongNum canvas font stacks',
  );
  code = assertReplace(
    code,
    'setDpr(t){t!==this.dpr&&(this.dpr=t,this.map.clear(),this.gen++)}get dprKey(){return this.gen*16777216}get(t,e,s,i,a=700,o=jb){const r=`${t}|${e}|${s}|${i}|${a}|${o===jb?0:1}`;let l=this.map.get(r);if(l)return l;this.map.size>400&&this.map.clear();const c=`${a} ${e}px ${o}`,',
    'setDpr(t){t!==this.dpr&&(this.dpr=t,this.map.clear(),this.gen++)}clear(){this.map.clear(),this.gen++}get dprKey(){return this.gen*16777216}get(t,e,s,i,a=700,o=jb){const _w=o===jb&&a>=500?400:a,r=`${t}|${e}|${s}|${i}|${_w}|${o===jb?0:1}`;let l=this.map.get(r);if(l)return l;this.map.size>400&&this.map.clear();const c=`${_w} ${e}px ${o}`,',
    'fz single-weight TangSongBrush clarity + clear()',
  );
  code = assertReplace(
    code,
    's2="rgba(8,12,24,0.86)",Yb="#ffe6b0",pz="#f4f8ff",mz="#4aa8ff",Kb="rgba(6,10,20,0.72)",',
    's2="rgba(24,15,11,0.88)",Yb="#ffe6b0",pz="#f7eedc",mz="#6bb4db",Kb="rgba(18,11,8,0.76)",',
    'overlay warm lacquer nameplate backing',
  );
  code = assertReplace(
    code,
    'n.font=`bold ${Math.round(r*.2)}px "PingFang SC","Microsoft YaHei",sans-serif`,',
    'n.font=`${Math.round(r*.2)}px "TangSongBrush","TangSongSerif",serif`,',
    'D8 portrait fallback calligraphy font',
  );
  code = assertReplace(
    code,
    'return{name:"overlay",',
    'return{name:"overlay",refreshTextCache(){o.clear()},',
    'overlay refreshTextCache',
  );
  code = replaceBetween(
    code,
    'function Kx(n,t="menu"){',
    'e.remove()}}}',
    `function Kx(n,t="menu"){const e=document.createElement("canvas");e.className="sf-backdrop",e.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block;z-index:0;pointer-events:none;",n.insertBefore(e,n.firstChild);const s=e.getContext("2d",{alpha:!0});let l=t,c=0,f=0,d=1,m=[],p=[],g=0,y=0,v=0,k=!1;function S(){const A=Math.max(1,n.clientWidth),C=Math.max(1,n.clientHeight);if(A===c&&C===f)return;c=A,f=C,d=Math.min(window.devicePixelRatio||1,1.5),e.width=Math.round(c*d),e.height=Math.round(f*d);m=[];const cnt=Math.round(Math.min(48,Math.max(22,c/28)));for(let I=0;I<cnt;I++){m.push({x:Math.random()*c,y:Math.random()*f,r:1.1+Math.random()*2.1,vy:8+Math.random()*16,vx:3+Math.random()*8,ph:Math.random()*6.28,sp:.8+Math.random()*1.6})}p=[];const pc=Math.round(Math.min(18,Math.max(8,c/75)));for(let I=0;I<pc;I++){p.push({x:Math.random()*c,y:Math.random()*f,sz:2.6+Math.random()*3.4,vy:14+Math.random()*18,vx:-10-Math.random()*16,rot:Math.random()*6.28,vr:(Math.random()-.5)*1.4,ph:Math.random()*6.28})}w(0)}function w(dt){if(!s)return;s.setTransform(1,0,0,1,0,0),s.clearRect(0,0,e.width,e.height),s.setTransform(d,0,0,d,0,0);const isDefeat=l==="defeat",upDir=isDefeat?.35:-1;for(const it of m){it.y+=it.vy*dt*upDir,it.x+=Math.sin(v*.7+it.ph)*it.vx*dt,it.y<-10&&(it.y=f+10),it.y>f+10&&(it.y=-10);const a=(.22+.38*(.5+.5*Math.sin(v*it.sp+it.ph)));s.fillStyle=isDefeat?\`rgba(160, 212, 200, \${a.toFixed(3)})\`:\`rgba(255, 216, 134, \${a.toFixed(3)})\`;s.beginPath(),s.arc(it.x,it.y,it.r,0,Math.PI*2),s.fill()}if(!isDefeat){for(const ptc of p){ptc.y+=ptc.vy*dt,ptc.x+=ptc.vx*dt+Math.sin(v+ptc.ph)*6*dt,ptc.rot+=ptc.vr*dt,ptc.y>f+14&&(ptc.y=-14,ptc.x=Math.random()*c),ptc.x<-14&&(ptc.x=c+14);s.save(),s.translate(ptc.x,ptc.y),s.rotate(ptc.rot),s.fillStyle=l==="victory"?"rgba(255, 224, 140, 0.55)":"rgba(246, 146, 166, 0.42)",s.beginPath(),s.ellipse(0,0,ptc.sz,ptc.sz*.52,0,0,Math.PI*2),s.fill(),s.restore()}}}function T(now){if(k)return;g=requestAnimationFrame(T);const dtMs=now-y;if(dtMs<31)return;y=now;const dt=Math.min(.1,dtMs/1e3);v+=dt,w(dt)}const E=typeof ResizeObserver<"u"?new ResizeObserver(S):null;return E?.observe(n),window.addEventListener("resize",S),S(),g=requestAnimationFrame(T),{el:e,setMood:A=>{l=A},dispose:()=>{k=!0,cancelAnimationFrame(g),E?.disconnect(),window.removeEventListener("resize",S),e.remove()}}}`,
    'Kx translucent lantern embers & plum petals over AI backdrop paintings',
  );
  code = assertReplace(
    code,
    'function A(){r.width=r.height=c;const N=r.getContext("2d");if(!N)return;const J=e.bound;N.fillStyle="#070d1a",N.fillRect(0,0,c,c);const Z=b(-J),ot=w(-J),j=2*J*f,at=4*f;N.save(),N.beginPath(),N.moveTo(Z+at,ot),N.arcTo(Z+j,ot,Z+j,ot+j,at),N.arcTo(Z+j,ot+j,Z,ot+j,at),N.arcTo(Z,ot+j,Z,ot,at),N.arcTo(Z,ot,Z+j,ot,at),N.closePath(),N.clip();const Rt=N.createRadialGradient(c/2,c/2,c*.05,c/2,c/2,c*.72);Rt.addColorStop(0,"#2c6a50"),Rt.addColorStop(1,"#1b4238"),N.fillStyle=Rt,N.fillRect(0,0,c,c),N.lineCap="round",N.lineJoin="round",E(N,e.river),N.strokeStyle="#236f95",N.lineWidth=e.riverWidth*f,N.stroke(),E(N,e.river),N.strokeStyle="rgba(110, 205, 235, 0.55)",N.lineWidth=e.riverWidth*f*.5,N.stroke();for(const V of[e.lanes.top,e.lanes.bot,e.lanes.mid])E(N,V),N.strokeStyle="#8f7d55",N.lineWidth=e.laneWidth*f*.78,N.stroke(),E(N,V),N.strokeStyle="#b9a577",N.lineWidth=e.laneWidth*f*.5,N.stroke();for(const V of e.bases){const U=V.team===0?"77, 163, 255":"255, 93, 93";T(N,V.area),N.fillStyle=`rgba(${U}, 0.32)`,N.fill(),N.strokeStyle=`rgba(${U}, 0.75)`,N.lineWidth=Math.max(1,1.2*d),N.stroke(),N.beginPath(),N.arc(b(V.fountain.x),w(V.fountain.y),V.fountainRadius*f,0,Math.PI*2),N.fillStyle=`rgba(${U}, 0.55)`,N.fill()}N.fillStyle="rgba(132, 178, 74, 0.9)";for(const V of e.bushes)T(N,V),N.fill();for(const V of e.walls)T(N,V),N.fillStyle="#131d30",N.fill(),N.strokeStyle="#42557a",N.lineWidth=Math.max(1,1.1*d),N.stroke();N.restore();const kt=N.createRadialGradient(c/2,c/2,c*.42,c/2,c/2,c*.74);kt.addColorStop(0,"rgba(4, 8, 22, 0)"),kt.addColorStop(1,"rgba(4, 8, 22, 0.55)"),N.fillStyle=kt,N.fillRect(0,0,c,c)}',
    'function A(){tsConfig.drawTangSongMinimapBase(r,e,c,f,d,b,w,T,E)}',
    'mG Ancient Song silk-scroll minimap base renderer',
  );

  // ── 13. 5v5 阵容选人 + 加载界面对齐 + 高清立绘/3D 切换 + HUD 特写切镜 ──
  code = assertReplace(
    code,
    'const o=[s,...kr.filter(c=>c!==s)];for(const c of[0,1])o.forEach((f,d)=>{const h=KV(this,c*5+d,c,f,c===0&&d===0);this.addUnit(h),this.heroes.push(h),this.state.teams[c].gold+=h.goldEarned,h.isPlayer&&(this.state.playerId=h.id)});',
    'const _teams=selectMatchTeams(s,t.seed??0);for(const c of[0,1])(_teams[c===0?"blue":"red"]).forEach((f,d)=>{const h=KV(this,c*5+d,c,f,c===0&&d===0);this.addUnit(h),this.heroes.push(h),this.state.teams[c].gold+=h.goldEarned,h.isPlayer&&(this.state.playerId=h.id)});',
    'Mq 5v5 selectMatchTeams spawn',
  );
  code = assertReplace(code, 'function xB(n){const t=j1.get(n);if(t!==void 0)return t;const e=N8(n);return F8(),e}', 'function xB(n,variant="avatar"){return tsConfig.getPortraitUrl(n,variant)}', 'xB HD portrait override');
  code = assertReplace(
    code,
    ',w=new Map,T=L=>{let B=w.get(L);if(B===void 0){try{B=xB(L)}catch(G){console.warn(G),B=""}w.set(L,B)}return B}',
    ',w=new Map,T=(L,V="avatar")=>{const K=`${L}:${V}`;let B=w.get(K);if(B===void 0){try{B=xB(L,V)}catch(G){console.warn(G),B=""}w.set(K,B)}return B}',
    'menuHost.portrait(heroId, variant)',
  );
  code = assertReplace(code, 'a=n.portrait(t)', 'a=n.portrait(t,e==="sf-lcard__pic"?"portrait":"avatar")', 'Zh portrait variant dispatch');
  code = assertReplace(
    code,
    'function pH(n,t){const e=[],s=new Set;for(const i of t){let a="";try{a=n.portrait(i)}catch{a=""}!a||s.has(a)||Z1.has(a)||(s.add(a),e.push(new Promise(o=>{const r=new Image,l=()=>{Z1.add(a),o()};r.src=a,typeof r.decode=="function"?r.decode().then(l,()=>o()):(r.addEventListener("load",l),r.addEventListener("error",()=>o()))})))}return Promise.all(e).then(()=>{})}',
    '',
    'remove legacy portrait-only warmup',
  );
  code = assertReplace(
    code,
    'z("span","sf-hcard__info",z("span","sf-hcard__name",Qx(q)),z("span","sf-hcard__title",ct.title),',
    'z("span","sf-hcard__info",z("span","sf-hcard__name",Qx(q)),z("span","sf-hcard__title",ct.era?z("span","ts-hcard__era",ct.era):null,ct.title),',
    'RH hero card era badge',
  );
  code = assertReplace(
    code,
    'const h=z("canvas","sf-select__canvas"),u=z("div","sf-select__plate"),m=z("div","sf-select__stage",z("div","sf-select__glow"),z("div","sf-select__rings",z("div","sf-select__ring"),z("div","sf-select__ring sf-select__ring--in")),h,u,z("div","sf-select__nav sf-select__nav--prev",',
    'const h=z("canvas","sf-select__canvas"),pcImg=document.createElement("img");pcImg.className="ts-select__pc-art";pcImg.draggable=!1;const pcWrap=z("div","ts-select__pc-wrap",pcImg);let stageMode="pc";const btnPc=z("button",null,"立绘"),btn3d=z("button",null,"3D演武");btnPc.type=btn3d.type="button";btnPc.classList.add("is-active");const stageToggle=z("div","ts-stage-toggle",btnPc,btn3d),u=z("div","sf-select__plate"),m=z("div","sf-select__stage",z("div","sf-select__glow"),z("div","sf-select__rings",z("div","sf-select__ring"),z("div","sf-select__ring sf-select__ring--in")),h,pcWrap,stageToggle,u,z("div","sf-select__nav sf-select__nav--prev",',
    'RH stage pc.webp + 3D toggle',
  );
  code = assertReplace(
    code,
    'const g=po({label:"开始对战",variant:"primary",size:"lg",pulse:!0,sound:"ready",onClick:()=>S()}),',
    'const setStageMode=md=>{stageMode=md,m.classList.toggle("is-3d-mode",md==="3d"),btnPc.classList.toggle("is-active",md==="pc"),btn3d.classList.toggle("is-active",md==="3d"),md==="3d"&&a?.resize?.()};btnPc.addEventListener("click",()=>{t.audio.ui("select"),setStageMode("pc")});btn3d.addEventListener("click",()=>{t.audio.ui("select"),setStageMode("3d")});const g=po({label:"开始对战",variant:"primary",size:"lg",pulse:!0,sound:"ready",onClick:()=>S()}),',
    'RH stage mode toggle handlers',
  );
  code = assertReplace(
    code,
    'u.textContent="",u.append(z("h3","sf-select__name",z("span","sf-metal",et.name),z("small","sf-select__name-role",_e(Ar(et.role)),et.roleName)),z("span","sf-select__sub",et.title));',
    'pcImg.src=tsConfig.getPcUrl(e);pcImg.alt=et.name;u.textContent="",u.append(et.era?z("span","ts-select__era-pill",`${et.era} · ${et.roleName}`):null,z("h3","sf-select__name",z("span","sf-metal",et.name),z("small","sf-select__name-role",_e(Ar(et.role)),et.roleName)),z("span","sf-select__sub",et.title),et.motto?z("p","ts-select__motto",`「${et.motto}」`):null);',
    'RH plate era + motto + pcImg update',
  );
  code = assertReplace(
    code,
    'function XH(n,t,e){Hf(),Zn("sf-menu-loading",jH);const s=y=>z("section",`sf-loading__team sf-loading__team--${y===0?"blue":"red"}`,z("h3","sf-loading__team-name",y===0?"蓝色方":"红色方",z("small",null,y===0?"我方":`敌方 · AI ${hh[t.difficulty].label}`)),z("div","sf-loading__cards",...Ml.map((v,_)=>qH(e,v,y,y===0&&v===t.heroId,_))))',
    'function XH(n,t,e,teams){Hf(),Zn("sf-menu-loading",jH);const s=y=>{const list=y===0?(teams?.blue??Ml.slice(0,5)):(teams?.red??Ml.slice(0,5));return z("section",`sf-loading__team sf-loading__team--${y===0?"blue":"red"}`,z("h3","sf-loading__team-name",y===0?"盛唐青玉方":"赤壁朱红方",z("small",null,y===0?"我方":`敌方 · AI ${hh[t.difficulty].label}`)),z("div","sf-loading__cards",...list.map((v,_)=>qH(e,v,y,y===0&&v===t.heroId,_))))}',
    'XH 5v5 teams loading cards',
  );
  code = assertReplace(
    code,
    'n.setPhase("loading");const r=XH(i,t,n.menuHost),l=to(),c=document.createElement("div");c.className="app-match";const f=document.createElement("div");f.className="app-stage",c.appendChild(f);let d=null,h=null,u=!1,m=!1,x=()=>{m=!0;try{h?.dispose(),d?.dispose()}catch(g){console.error(g)}d=null,c.remove(),r.close()};const p=()=>s.cancelled?(x(),!0):!1;try{if(r.setProgress(dl.world,"集结双方英雄…"),await zc(),p())return null;const g={seed:e.seed,playerHero:t.heroId,difficulty:t.difficulty,autoPlay:e.autoPlay,autoBuy:n.getSettings().autoBuy},y=Mq(g),',
    'n.setPhase("loading");const matchSeed=e.seed??qq(),matchTeams=selectMatchTeams(t.heroId,matchSeed);const r=XH(i,t,n.menuHost,matchTeams),l=to(),c=document.createElement("div");c.className="app-match";const f=document.createElement("div");f.className="app-stage",c.appendChild(f);let d=null,h=null,u=!1,m=!1,x=()=>{m=!0;try{h?.dispose(),d?.dispose()}catch(g){console.error(g)}d=null,c.remove(),r.close()};const p=()=>s.cancelled?(x(),!0):!1;try{if(r.setProgress(dl.world,"集结双方英雄…"),await zc(),p())return null;const g={seed:matchSeed,playerHero:t.heroId,difficulty:t.difficulty,autoPlay:e.autoPlay,autoBuy:n.getSettings().autoBuy},y=Mq(g),',
    'Uq unified matchSeed + matchTeams',
  );
  // Camera gestures, team sight and the shared fog projection.
  code = assertReplace(
    code,
    "let Z=null,ot=-1;function j(O){",
    "const viewDrag=tsConfig.createBattleViewDrag(i,n);let Z=null,ot=-1;function j(O){",
    "A$ bind field camera gestures",
  );
  code = assertReplace(
    code,
    "m===null&&C(O)&&(O.preventDefault(),T(O));return",
    "if(n.me.alive&&C(O)){m===null&&(O.preventDefault(),T(O))}else if(R===null)viewDrag.start(O);return",
    "A$ arbitrate joystick and camera pointers",
  );
  code = assertReplace(
    code,
    "l(i,\"pointermove\",O=>{if(O.pointerId===m)",
    "l(i,\"pointermove\",O=>{viewDrag.move(O);if(O.pointerId===m)",
    "A$ move camera pointer",
  );
  code = assertReplace(
    code,
    "const at=O=>{O.pointerId===m&&A()",
    "const at=O=>{viewDrag.end(O),O.pointerId===m&&A()",
    "A$ finish field camera gesture",
  );
  code = assertReplace(
    code,
    "function V(){u.up=u.down=u.left=u.right=!1",
    "function V(){viewDrag.reset(),u.up=u.down=u.left=u.right=!1",
    "A$ reset field camera on menu and blur",
  );
  code = assertReplace(
    code,
    "l(s,\"pointerdown\",O=>d(O.pointerType),{capture:!0})",
    "l(s,\"pointerdown\",O=>{d(O.pointerType);if(O.target.closest?.(\".sf-hud__mini, .sf-hud__skills button\"))viewDrag.reset()},{capture:!0})",
    "A$ hand camera to minimap",
  );
  code = assertReplace(
    code,
    "update(O){const Y=O.inputBlocked();if(Y!==lt",
    "update(O){viewDrag.update();const Y=O.inputBlocked();if(Y!==lt",
    "A$ release spectator camera on respawn",
  );
  code = assertReplace(
    code,
    "f(v.autoBuy?\"阵亡期间金币照涨，自动出装照买。\":\"阵亡期间金币照涨，可以打开商店买装备。\")",
    "f(n.mode===\"touch\"?\"滑动战场空地观战，复活后回到英雄。\":v.autoBuy?\"阵亡期间金币照涨，自动出装照买。\":\"阵亡期间金币照涨，可以打开商店买装备。\")",
    "death view gesture hint",
  );

  code = assertReplace(
    code,
    "let c=!1;const f=r.pos.x,d=r.pos.y;for(let h=0;h<Jp.length;h++){const u=Jp[h],m=u.pos.x-f,x=u.pos.y-d,p=m*m+x*x,g=u.rt.sight;if(!(p>g*g)&&!(l&&u.bushId!==r.bushId&&p>i)){c=!0;break}}",
    "const f=r.pos.x,d=r.pos.y,c=tsConfig.hasTeamSight(Jp,f,d,l?r.bushId:-1,i);",
    "x6 shared team sight predicate",
  );
  code = assertReplace(
    code,
    "if(r.visible[a]=c,c&&r.kind===\"hero\")",
    "if(r.visible[a]=c,c&&r.alive&&r.kind===\"hero\")",
    "x6 last seen living heroes",
  );
  code = assertReplace(
    code,
    "||f0[Q.kind]||Q.kind===\"monster\"||Q.visible[$.playerTeam]",
    "||Q.visible[$.playerTeam]",
    "unit render obeys current team sight",
  );
  code = assertReplace(
    code,
    "D.targetOpacity=kt;const U=V-Q.lastHitTime;",
    "D.targetOpacity=kt;if(!Rt)D.opacity=0;const U=V-Q.lastHitTime;",
    "hide occluded units immediately",
  );
  code = assertReplace(
    code,
    "Z.id===$.playerId||Z.opacity<.3||Z.culled",
    "Z.id===$.playerId||Z.targetOpacity===0||Z.opacity<.3||Z.culled",
    "pick only current visible targets",
  );
  code = assertReplace(
    code,
    "o.team!==a&&o.team!==2&&!o.visible[a]",
    "o.team!==a&&!o.visible[a]",
    "ripples require unit sight",
  );
  code = assertReplace(
    code,
    "t.team!==this.team&&t.team!==2&&!t.visible[this.team]",
    "t.team!==this.team&&!t.visible[this.team]",
    "combat text requires unit sight",
  );
  code = assertReplace(
    code,
    "v.team!==o.playerTeam&&v.team!==2&&v.id!==o.playerId",
    "v.team!==o.playerTeam&&v.id!==o.playerId",
    "hit effects require target sight",
  );
  code = assertReplace(
    code,
    "c.visible=f.alive&&(d||r.opacity>.02)",
    "c.visible=f.alive&&d",
    "vfx anchors use current sight",
  );
  code = assertReplace(
    code,
    "function VD(n){switch(n.kind){case\"hero\":return ui.hero;case\"minion\":return ui.minion;case\"tower\":return ui.tower;case\"core\":return ui.core;default:return 0}}function WD(n,t){const e=new Map;let s=new Float32Array(192),i=0,a=n.frame,o;const r={x:0,y:0,z:0,height:2,opacity:1};return{begin(l){a=l,o=n.getModule(\"units\"),e.clear(),i=0;const c=l.playerTeam;for(const f of l.state.units){if(e.set(f.id,f),f.team!==c||!f.alive)continue;const d=VD(f);if(!(d<=0)){if(i*3+3>s.length){const h=new Float32Array(s.length*2);h.set(s),s=h}s[i*3]=f.pos.x,s[i*3+1]=f.pos.y,s[i*3+2]=d*d,i++}}},",
    "function WD(n,t){const e=new Map,s=[];let a=n.frame,o;const r={x:0,y:0,z:0,height:2,opacity:1};return{begin(l){a=l,o=n.getModule(\"units\"),e.clear(),s.length=0;for(const f of l.state.units){e.set(f.id,f);if(f.team===l.playerTeam&&f.alive&&f.rt.sight>0)s.push(f)}},",
    "vfx collect actual sight sources",
  );
  code = assertReplace(
    code,
    "pointVisible(l,c){for(let f=0;f<i;f++){const d=s[f*3]-l,h=s[f*3+1]-c;if(d*d+h*h<=s[f*3+2])return!0}return!1},",
    "pointVisible(l,c){return tsConfig.hasTeamSight(s,l,c,qk(a.state.map,{x:l,y:c}),ui.bushReveal**2)},",
    "vfx point sight accounts for brush",
  );
  code = assertReplace(
    code,
    "posSeen(t,e){const s=this.sight;if(!this.sightReady){s.length=0;for(const i of t.units){if(i.team!==0||!i.alive)continue;const a=i.kind===\"hero\"?ui.hero:i.kind===\"minion\"?ui.minion:i.kind===\"tower\"?ui.tower:ui.core;s.push(i.pos.x,i.pos.y,a*a)}this.sightReady=!0}for(let i=0;i<s.length;i+=3){const a=e.x-s[i],o=e.y-s[i+1];if(a*a+o*o<=s[i+2])return!0}return!1}",
    "posSeen(t,e){const s=this.sight;if(!this.sightReady){s.length=0;for(const u of t.units)if(u.team===0&&u.alive&&u.rt.sight>0)s.push(u);this.sightReady=!0}return tsConfig.hasTeamSight(s,e.x,e.y,qk(t.map,e),ui.bushReveal**2)}",
    "audio point sight accounts for brush",
  );
  code = assertReplace(
    code,
    "a.kind===\"monster\"?this.cMonsters.push(a):a.kind",
    "a.kind===\"monster\"?(a.visible[e]&&this.cMonsters.push(a)):a.kind",
    "jV visible neutral units",
  );
  code = assertReplace(
    code,
    "perceivable(t){return t.team===this.team||t.kind===\"monster\"||",
    "perceivable(t){return t.team===this.team||",
    "jV target perception",
  );
  code = assertReplace(
    code,
    "const Jp=[];function x6(n){",
    "function currentTeamVision(state,team){return tsConfig.teamVision(state,team,qk,ui.bushReveal)}const Jp=[];function x6(n){",
    "share fog between world and minimap",
  );
  code = assertReplace(
    code,
    "const x=GF(r,c,f,h,l,m);d.add(x.mesh);",
    "const x=GF(r,c,f,h,l,m);d.add(x.mesh);\n  const fogTexture = new Z7(document.createElement(\"canvas\"));\n  fogTexture.generateMipmaps = false;\n  fogTexture.minFilter = fogTexture.magFilter = Ns;\n  const fogMesh = new Sn(new Gl(2*o.bound,2*o.bound),new yM({map:fogTexture,transparent:true,depthTest:false,depthWrite:false,toneMapped:false,fog:false}));\n  fogMesh.name = \"team-sight\";\n  fogMesh.rotation.x = -Math.PI / 2;\n  fogMesh.renderOrder = 2000;\n  d.add(fogMesh);\n  let fogTick = -1;\n  ",
    "nw add ground-aligned war fog",
  );
  code = assertReplace(
    code,
    "update(j){ew.multiplyMatrices(n.camera",
    "update(j){\n    const vision = currentTeamVision(j.state,j.playerTeam);\n    if (vision.version !== fogTick || fogTexture.image !== vision.canvas) {\n      fogTick = vision.version;\n      fogTexture.image = vision.canvas;\n      fogTexture.needsUpdate = true;\n    }\n    ew.multiplyMatrices(n.camera",
    "nw update shared fog texture",
  );
  code = assertReplace(
    code,
    "o.drawImage(r,0,0),B(o),M.length=0",
    "o.drawImage(r,0,0);const vision=currentTeamVision(J,n.team),bound=e.bound;o.drawImage(vision.canvas,b(-bound),w(-bound),bound*2*f,bound*2*f),B(o,vision),M.length=0",
    "minimap shade unseen ground",
  );
  code = assertReplace(
    code,
    "function B(N){const J=n.state.camps;",
    "function B(N,vision){const J=n.state.camps;",
    "minimap hide unseen camp status",
  );
  code = assertReplace(
    code,
    "ht=Y4[Z.monsterType];if(!ot||ot.alive)",
    "ht=Y4[Z.monsterType];if(!vision.visible(Z.pos)){L(N,at,V,U,kt);N.strokeStyle=\"rgba(227,219,196,.5)\";N.lineWidth=Math.max(1,d);N.stroke();continue}if(!ot||ot.alive)",
    "minimap mark unknown camps neutrally",
  );
  code = assertReplace(
    code,
    "Z&&nt(Z.pos,\"kill\"",
    "Z&&(Z.team===J.team||Z.visible[J.team])&&nt(Z.pos,\"kill\"",
    "minimap only locate witnessed kills",
  );
  code = assertReplace(code, "if(r.team===a||r.kind===\"tower\"||r.kind===\"core\"||r.kind===\"monster\"||!r.alive){r.visible[a]=!0;continue}", "if(r.team===a){r.visible[a]=!0;continue}", "x6 restrict live structure data to allied sight");
  code = assertReplace(code, "case\"monsterSpawn\":rn[N.monsterType].epic&&nt(N.pos,\"epic\"", "case\"monsterSpawn\":rn[N.monsterType].epic&&currentTeamVision(J.state,J.team).visible(N.pos)&&nt(N.pos,\"epic\"", "minimap conceal unseen monster spawns");
  code = assertReplace(code, "const Jp=[];function x6(n){const t=n.units", "const Jp=[];function x6(n){n.state.sightTick=n.state.tick;const t=n.units", "refresh fog on the simulation sight tick");
  code = assertReplace(code, "visible:[t!==1,t!==0],bushId:-1", "visible:[t===0,t===1],bushId:-1", "neutral units spawn unseen until scouted");
  code = assertReplace(code, "i.classList.remove(\"is-loaded\"),o.remove()", "i.classList.remove(\"is-loaded\")", "preserve failed portrait elements for in-place recovery");
  code = assertReplace(code, "function c(d){e.textContent=\"\",d===\"kbm\"?e.append", "function c(d){e.textContent=\"\",d===\"kbm\"&&e.append", "l$ only construct shortcuts for keyboards");
  code = assertReplace(code, ":e.append(z(\"span\",null,_e(Vt(\"joystick\")),z(\"b\",null,\"左下拖动\"),\"移动\"),z(\"span\",null,_e(Vt(\"touch\")),z(\"b\",null,\"轻点技能\"),\"自动瞄准\"),z(\"span\",null,_e(Vt(\"target\")),z(\"b\",null,\"按住拖动\"),\"手动瞄准，松手施放\"),z(\"span\",null,_e(Vt(\"cancel\")),\"拖到\",z(\"b\",null,\"取消\"),\"松手放弃\"),z(\"span\",null,_e(Vt(\"info\")),z(\"b\",null,\"长按技能\"),\"看说明\"))}c(n.mode);", "}c(n.mode);", "l$ remove the in-battle touch instruction sheet");
  code = assertReplace(code, "onMode(d){o||c(d)},update(d){if(o){r>0&&d.now>=r", "onMode(d){if(!o){c(d);if(d===\"touch\"){i.classList.remove(\"is-on\");a=-1}}},update(d){if(d.mode===\"touch\")return;if(o){r>0&&d.now>=r", "l$ keep touch field clear while retaining keyboard hints");
  code = assertReplace(code, "touch:[\"轻点技能键会自动瞄准；", "touch:[\"左下拖动移动，右侧空地拖动看战场。松手回到英雄。\",\"轻点技能键会自动瞄准；", "WH touch loading tip");
  code = assertReplace(code, "const h=WH(ey());let u=", "const inputMode=ey(),h=WH(inputMode);let u=", "XH choose loading tips for current controls");
  code = assertReplace(code, "%h.length;i.textContent=h[u];let m=0;", "%h.length;i.textContent=inputMode===\"touch\"?VH.touch[0]:h[u];let m=0;", "XH show camera controls before touch matches");
  code = assertReplace(code, "Pa(\"ui\",\"5\",\"小地图\",\"点按并拖动可观察战场，松手回到英雄\")", "Pa(\"ui\",\"5\",\"视野\",\"<em>拖动右侧空地或小地图</em>观察己方视野。阵亡后滑动空地，松手可停留观战。\")", "IH explain field and minimap observation");
  // Match asset readiness
  code = assertReplace(code, 'setProgress(y,v){p||(g=Math.max(g,', 'root:f,setProgress(y,v){p||(g=Math.max(g,', 'XH expose loading screen');
  code = assertReplace(code, 'fastLoad:et==="direct"},G)', 'fastLoad:et==="direct",signal:q,backToMenu:p},G)', 'Uq link navigation cancellation');
  code = assertReplace(code, 'Q.start(),U)}catch(g){throw x(),g}}', 'Q.start(),U)}catch(g){if(p())return null;throw x(),g}finally{assets.dispose()}}', 'Uq dispose asset loader');
  code = assertReplace(code, 'Lq=1200,Iq=.6,Pq=1500,_S=6', 'Lq=1200,Iq=.6,_S=6', 'remove portrait warmup deadline');
  code = assertReplace(
    code,
    'try{if(r.setProgress(dl.world,"集结双方英雄…"),await zc(),p())return null;',
    [
      'const assets = tsConfig.createMatchAssetLoader(r.root, e.signal, e.backToMenu);',
      'try{',
      '  const matchAssets = assets.prepareAssets([...matchTeams.blue, ...matchTeams.red], t.heroId);',
      '  matchAssets.catch(() => {});',
      '  if(r.setProgress(dl.world,"集结双方英雄…"),await zc(),p())return null;',
    ].join('\n'),
    'Uq start asset preparation alongside renderer setup',
  );
  code = assertReplace(
    code,
    'if(d.resize(),typeof d.prewarmAsync=="function"){if(await d.prewarmAsync(k(dl.warm,.9)),p())return null;d.render(v,1,0)}else{if(d.render(v,1,0),r.setProgress(.82,"点亮星辉与光影…"),await zc(),p())return null;d.render(v,1,1/60)}if(d.snapCamera?.(),r.setProgress(dl.hud,"布置战斗界面…"),await Promise.race([pH(n.menuHost,v.heroes.map(lt=>lt.heroId)),X6(Pq)]),await zc(),p())return null;',
    [
      'd.resize();',
      '  const asyncPrewarm = typeof d.prewarmAsync === "function";',
      '  if (asyncPrewarm) {',
      '    await d.prewarmAsync(k(dl.warm,.9));',
      '  } else {',
      '    d.render(v,1,0);',
      '    r.setProgress(.82,"点亮星辉与光影…");',
      '  }',
      '  if (p()) return null;',
      '  r.setProgress(dl.hud,"准备战场图标与字体…");',
      '  for (const url of await matchAssets) Z1.add(url);',
      '  await zc();',
      '  if (p()) return null;',
      '  d.refreshTextCache?.();',
      '  d.render(v, 1, asyncPrewarm ? 0 : 1 / 60);',
      '  d.snapCamera?.();',
      '  r.setProgress(.96,"布置战斗界面…");',
    ].join('\n'),
    'Uq wait for decoded assets before rendering the first match frame',
  );
  code = assertReplace(
    code,
    'x=()=>{U.dispose(),r.close()},rt.update(v,0),r.setProgress(1,"进入战场");',
    [
      'x=()=>{U.dispose(),r.close()};',
      '  rt.update(v,0);',
      '  await assets.prepareHud(c);',
      '  if (p()) return null;',
      '  r.setProgress(1,"进入战场");',
    ].join('\n'),
    'Uq wait for real HUD images before completing loading',
  );
  code = assertReplace(
    code,
    'handleEvents(tt,it){if(!(r||tt.length===0)){if(st(it),l.now=performance.now()/1e3,P){G(tt);return}',
    'handleEvents(tt,it){if(!(r||tt.length===0)){if(st(it),l.now=performance.now()/1e3,tsConfig.onHudEvents?.(tt,l),P){G(tt);return}',
    'FG handleEvents real gameplay event hook (fixes P=false dead code)',
  );
  code = assertReplace(code, 'setPhase(L){a=L}', 'setPhase(L){a=L,tsConfig.onPhaseChange?.(L)}', 'setPhase callback');
  code = assertReplace(
    code,
    'get session(){return o},audio:v,perf:s,settings:_,params:n,get matches(){return f},errors:i,restart:p};window.__moba=A;',
    'get session(){return o},audio:v,perf:s,settings:_,params:n,get matches(){return f},errors:i,restart:p,heroTable:Se,kitBaselines:KIT_BASELINES,kitOf,modelRegistry:Gx,skillIcon:Ia,refreshTextCache:()=>o?.renderer?.refreshTextCache?.(),getCameraPreset:()=>S().cameraPreset,setCameraPreset:L=>{const k=tsConfig.getCameraPreset(L).key;b({cameraPreset:k});o?.renderer?.engine?.rig?.setPreset?.(k);o?.renderer?.resize?.()},triggerEyesCutin:(id,label)=>tsConfig.triggerEyesCutin(o?.hud?.root??e,id,label)};window.__moba=A;',
    'window.__moba extensions',
  );
  code = assertReplace(
    code,
    'p=()=>{c||x(BH({host:t,root:i,onStart:g}))}',
    'p=()=>{c||x(BH({host:t,root:i,onStart:g,onPickHero:v=>{r={...r,heroId:v},I4(r),g()}}))}',
    '$H wire onPickHero from handscroll hero cards',
  );

  // ── 13B. 参照王者荣耀：走A前摇保护、无空挥、移动施法与上下半身分离骨架合成 ──
  code = assertReplace(
    code,
    'function su(n,t,e,s,i,a){return{id:n.allocId(),team:t,pos:{x:e.x,y:e.y},prevPos:{x:e.x,y:e.y},facing:s,',
    'function su(n,t,e,s,i,a){return{id:n.allocId(),team:t,pos:{x:e.x,y:e.y},prevPos:{x:e.x,y:e.y},facing:s,aimFacing:s,',
    'su add aimFacing',
  );
  code = assertReplace(
    code,
    'actMoveCancel:!0,',
    'actMoveCancel:!0,actMobile:!1,',
    'nu add actMobile',
  );
  code = assertReplace(
    code,
    'function ij(n,t,e){const s=t.rt,i=1/Math.max(.1,t.stats.attackSpeed),a=Math.min(i,LV);if(s.atkCd=i,s.windupLeft=a*s.atk.windup,s.windupTarget=e.id,t.targetId=e.id,Bm(t,e.pos.x,e.pos.y),eu(n,t,"attack",a,!0),',
    'function ij(n,t,e){const s=t.rt,i=1/Math.max(.1,t.stats.attackSpeed),a=Math.min(i,LV),_pw=t.isPlayer?tsConfig.combatFeel.getPlayerAttackWindup(a,s.atk.windup):a*s.atk.windup;if(s.atkCd=i,s.windupLeft=_pw,s.windupTarget=e.id,t.targetId=e.id,Bm(t,e.pos.x,e.pos.y),t.aimFacing=t.facing,t.isPlayer?eu(n,t,"attack",Math.max(_pw+tsConfig.combatFeel.attack.followThroughDur,Math.min(a,.44)),!1):eu(n,t,"attack",a,!0),',
    'ij player compressed attack windup + aimFacing + followThrough',
  );
  code = assertReplace(
    code,
    'case"move":{const i=Yc(e.dir)?Math.hypot(e.dir.x,e.dir.y):0;if(!(i>.05)){s.moveMode===Jh&&Hl(t);return}D6(n,t),aW(t,e.dir.x/i,e.dir.y/i);return}case"moveTo":if(!Yc(e.pos))return;D6(n,t),oW(n,t,e.pos.x,e.pos.y);return;',
    'case"move":{const i=Yc(e.dir)?Math.hypot(e.dir.x,e.dir.y):0;if(!(i>.05)){s.moveMode===Jh&&Hl(t);return}t.isPlayer&&s.windupLeft>0?(t.h.atkOrder=!1,vy(n,t),aW(t,e.dir.x/i,e.dir.y/i)):(D6(n,t),aW(t,e.dir.x/i,e.dir.y/i));return}case"moveTo":if(!Yc(e.pos))return;t.isPlayer&&s.windupLeft>0?(t.h.atkOrder=!1,vy(n,t),oW(n,t,e.pos.x,e.pos.y)):(D6(n,t),oW(n,t,e.pos.x,e.pos.y));return;',
    'Aj move/moveTo protect active windup (zero accidental cancel)',
  );
  code = assertReplace(
    code,
    'function Mj(n,t,e){const s=t.h;vy(n,t);let i=null,a=!1;if(e!==void 0&&e>=0){const o=n.byId.get(e);if(!o||!Ui(t,o)){Do(n,t,"no_target");return}i=o,a=!0}else{const o=dS(n,t,pj);if(!o)return;const r=s.atkOrder?n.byId.get(s.atkTargetId):void 0;if(r&&Ui(t,r)&&(t.rt.windupLeft>0||yy(t,r,oS)&&B3(t,r)<=B3(t,o)))return;i=o}s.atkTargetId!==i.id&&Ga(t),s.atkOrder=!0,s.atkTargetId=i.id,s.atkExplicit=a,t.targetId=i.id,Hl(t)}',
    'function Mj(n,t,e){const s=t.h;vy(n,t);let i=null,a=!1;if(e!==void 0&&e>=0){const o=n.byId.get(e);if(!o||!Ui(t,o)){Do(n,t,"no_target");return}i=o,a=!0}else{if(t.isPlayer&&t.rt.moveMode===Jh){const _ko=dS(n,t,tsConfig.combatFeel.attack.kiteRangePad);if(!_ko||!yy(t,_ko,tsConfig.combatFeel.attack.kiteRangePad))return;return t.targetId=_ko.id,void(sj(n,t)&&ij(n,t,_ko))}const o=dS(n,t,pj);if(!o)return;const r=s.atkOrder?n.byId.get(s.atkTargetId):void 0;if(r&&Ui(t,r)&&(t.rt.windupLeft>0||yy(t,r,oS)&&B3(t,r)<=B3(t,o)))return;i=o}s.atkTargetId!==i.id&&Ga(t),s.atkOrder=!0,s.atkTargetId=i.id,s.atkExplicit=a,t.targetId=i.id,Hl(t),t.isPlayer&&yy(t,i,tsConfig.combatFeel.attack.kiteRangePad)&&sj(n,t)&&ij(n,t,i)}',
    'Mj zero empty air-swing while moving + instant kiting strike',
  );
  code = assertReplace(
    code,
    ',f.type!=="self"&&(t.facing=Math.atan2(d.dir.y,d.dir.x)),xy(n,t);const m=h?h.castTime:0,x=c.lockTime??m;x>0&&(o.lockUntil=r+x),h&&m>0&&!c.noAnim&&eu(n,t,`cast_${i}`,m,!0);',
    ';const _af=f.type!=="self"?Math.atan2(d.dir.y,d.dir.x):t.facing;f.type!=="self"&&(t.facing=_af);t.aimFacing=_af;xy(n,t);const _cp=t.isPlayer&&!l?tsConfig.combatFeel.getPlayerCastProfile(kitOf(t.heroId),i):null,m=h?h.castTime:0,x=_cp?_cp.lockTime:c.lockTime??m;x>0&&(o.lockUntil=r+x);h&&m>0&&!c.noAnim&&(_cp?(o.actMobile=_cp.mobile,eu(n,t,`cast_${i}`,_cp.actDur,!1)):(o.actMobile=!1,eu(n,t,`cast_${i}`,m,!0)));',
    'hS Honor of Kings mobile-cast & crisp planted cast profiles',
  );
  code = assertReplace(
    code,
    'function PO(){return{anim:"idle",p:0,t:0,time:0,stride:0,speed:0,variant:0,seed:0,hp:1,windup:.35,mode:0,deathT:-1,spawnT:-1,hitT:99,team:0}}class of{constructor(t,e=0){this.def=t,this.pose=new sw(t.rig.count),this.from=new sw(t.rig.count),this.skeleton=new bU(t.rig,e),this.input.seed=e}def;input=PO();output={glow:1,tint:0,tintColor:16777215};pose;skeleton;from;blendT=0;blendDur=0;lastAnim=null;lastKey=NaN;snap(){this.lastAnim=null,this.blendDur=0,this.skeleton.resetChains()}update(t,e,s,i,a,o,r=1){const l=this.input,c=this.def;if(this.lastAnim!==null&&(l.anim!==this.lastAnim||t!==this.lastKey)&&(this.from.copy(this.pose),this.blendT=0,this.blendDur=c.blend(this.lastAnim,l.anim)),this.lastAnim=l.anim,this.lastKey=t,this.output.glow=1,this.output.tint=0,this.pose.reset(),c.animate(this.pose,l,this.output),this.blendT<this.blendDur){',
    'function PO(){return{anim:"idle",p:0,t:0,time:0,stride:0,speed:0,variant:0,seed:0,hp:1,windup:.35,mode:0,deathT:-1,spawnT:-1,hitT:99,team:0,moveBlend:0,upperTwist:0}}class of{constructor(t,e=0){this.def=t,this.pose=new sw(t.rig.count),this.from=new sw(t.rig.count),this.skeleton=new bU(t.rig,e),this.input.seed=e,this.lower=new sw(t.rig.count),this._loIn=PO(),this._loOut={glow:1,tint:0,tintColor:16777215};const _rn=t.rig.names;this.lowerIds=["hips","thighL","shinL","footL","thighR","shinR","footR"].map(k=>_rn.indexOf(k)).filter(k=>k>=0),this.hipsId=_rn.indexOf("hips"),this.rootId=_rn.indexOf("root"),this.twistIds=[_rn.indexOf("spine"),_rn.indexOf("chest"),_rn.indexOf("neck")]}def;input=PO();output={glow:1,tint:0,tintColor:16777215};pose;skeleton;from;lower;_loIn;_loOut;lowerIds;hipsId=-1;rootId=-1;twistIds;blendT=0;blendDur=0;lastAnim=null;lastKey=NaN;snap(){this.lastAnim=null,this.blendDur=0,this.skeleton.resetChains()}update(t,e,s,i,a,o,r=1){const l=this.input,c=this.def;if(this.lastAnim!==null&&(l.anim!==this.lastAnim||t!==this.lastKey)){this.from.copy(this.pose);this.blendT=0;this.blendDur=c.blend(this.lastAnim,l.anim)}this.lastAnim=l.anim;this.lastKey=t;this.output.glow=1;this.output.tint=0;this.pose.reset();c.animate(this.pose,l,this.output);if(this.lowerIds.length>=7&&l.moveBlend>.02&&(l.anim==="attack"||l.anim==="spin"||l.anim.startsWith("cast_"))){Object.assign(this._loIn,l,{anim:"move",moveBlend:0,upperTwist:0});this.lower.reset();c.animate(this.lower,this._loIn,this._loOut);const w=l.moveBlend;if(l.anim==="spin"&&this.rootId>=0&&this.twistIds[0]>=0){Ua(this.pose.q,this.rootId*4,this.pose.q,this.twistIds[0]*4,this.pose.q,this.twistIds[0]*4);this.pose.rot(this.rootId,0,0,0)}if(l.anim!=="spin"&&Math.abs(l.upperTwist)>.4){const _tw=l.upperTwist*w,_w=tsConfig.combatFeel.upperLower.twistWeights;this.twistIds[0]>=0&&this.pose.pre(this.twistIds[0],0,_tw*_w[0],0);this.twistIds[1]>=0&&this.pose.pre(this.twistIds[1],0,_tw*_w[1],0);this.twistIds[2]>=0&&this.pose.pre(this.twistIds[2],0,_tw*_w[2],0)}for(const jid of this.lowerIds)S0(this.pose.q,jid*4,this.lower.q,jid*4,1-w);if(this.hipsId>=0){const _hi=this.hipsId*3;this.pose.t[_hi]+=(this.lower.t[_hi]-this.pose.t[_hi])*w;this.pose.t[_hi+1]+=(this.lower.t[_hi+1]-this.pose.t[_hi+1])*w;this.pose.t[_hi+2]+=(this.lower.t[_hi+2]-this.pose.t[_hi+2])*w}}if(this.blendT<this.blendDur){',
    'PO + class of Upper/Lower Body Skeletal Compositor',
  );
  code = assertReplace(
    code,
    'yaw:0,hasYaw:!1,opacity:0,',
    'yaw:0,hasYaw:!1,moveYaw:0,hasMoveYaw:!1,aimYaw:0,moveBlend:0,opacity:0,',
    'renderer unit ot moveYaw/aimYaw/moveBlend',
  );
  code = assertReplace(
    code,
    'D.lastStart=Q.animStart,D.lastAnim=Q.anim,O.anim=Q.anim;const gt=Math.max(0,V-Q.animStart);if(O.t=gt,O.p=Q.animDur>0?Math.min(1,gt/Q.animDur):0,O.hp=D.hp,O.windup=D.windup,',
    'D.aimYaw=f0[Q.kind]?0:Math.PI/2-(Q.aimFacing??Q.facing),D.lastStart=Q.animStart,D.lastAnim=Q.anim,O.anim=Q.anim;const gt=Math.max(0,V-Q.animStart);if(O.t=gt,O.p=Q.animDur>0?Math.min(1,gt/Q.animDur):0,O.hp=D.hp,O.windup=D.isPlayer&&Q.anim==="attack"&&Q.animDur>0?Math.min(.45,tsConfig.combatFeel.getPlayerAttackWindup(Math.min(1/Math.max(.1,Q.stats.attackSpeed),.7),D.windup)/Q.animDur):D.windup,',
    'H sync D.aimYaw & compressed player windup fraction',
  );
  code = assertReplace(
    code,
    'const ot=D.puppet.input;ot.time=g,ot.stride=D.stride,ot.speed=D.speed,D.dying>=0&&(ot.anim="dead",ot.t=D.dying,ot.p=Number.isFinite(D.deathDur)?Math.min(1,D.dying/D.deathDur):Math.min(1,D.dying/3),ot.deathT=D.dying,ot.hp=0,ot.spawnT=-1,ot.hitT=99),(D.culled||D.fresh)&&D.puppet.snap(),D.culled=!1,D.fresh=!1,D.puppet.update(D.lastStart+D.mode*1e-4+(ot.spawnT>=0?5e-4:0),$,D.x,D.y+D.lift,D.z,D.yaw,D.scale);',
    'if(Z<3&&$>0&&D.kind==="hero"&&Z>.004){const _my=Math.atan2(N,J);if(D.hasMoveYaw){let _dm=_my-D.moveYaw;_dm-=Math.round(_dm/(Math.PI*2))*Math.PI*2;D.moveYaw+=_dm*(1-Math.exp(-20*$))}else{D.moveYaw=_my;D.hasMoveYaw=!0}}const ot=D.puppet.input;ot.time=g;ot.stride=D.stride;ot.speed=D.speed;let _ry=D.yaw;if(D.kind==="hero"&&D.dying<0){const _ul=tsConfig.combatFeel.upperLower,_isUp=ot.anim==="spin"||ot.anim==="cast_s1"||ot.anim==="cast_s2"||ot.anim==="cast_ult"||(ot.anim==="attack"&&ot.p>Math.min(.44,ot.windup*.95)),_tgtMb=_isUp&&D.hasMoveYaw?Math.max(0,Math.min(1,(D.speed-_ul.minSpeed)/(_ul.fullSpeed-_ul.minSpeed))):0;D.moveBlend+=(_tgtMb-D.moveBlend)*Math.min(1,$*16);if(D.moveBlend>.01&&D.hasMoveYaw){let _dy=D.moveYaw-D.yaw;_dy-=Math.round(_dy/(Math.PI*2))*Math.PI*2;_ry=D.yaw+_dy*D.moveBlend}let _tw=0;if(D.moveBlend>.01&&ot.anim!=="spin"){let _da=D.aimYaw-_ry;_da-=Math.round(_da/(Math.PI*2))*Math.PI*2;_tw=Math.max(-_ul.maxTwistDeg,Math.min(_ul.maxTwistDeg,_da*180/Math.PI))}ot.moveBlend=D.moveBlend;ot.upperTwist=_tw}else{D.moveBlend=0;ot.moveBlend=0;ot.upperTwist=0}D.dying>=0&&(ot.anim="dead",ot.t=D.dying,ot.p=Number.isFinite(D.deathDur)?Math.min(1,D.dying/D.deathDur):Math.min(1,D.dying/3),ot.deathT=D.dying,ot.hp=0,ot.spawnT=-1,ot.hitT=99);(D.culled||D.fresh)&&D.puppet.snap();D.culled=!1;D.fresh=!1;D.puppet.update(D.lastStart+D.mode*1e-4+(ot.spawnT>=0?5e-4:0),$,D.x,D.y+D.lift,D.z,_ry,D.scale);',
    'tt hero moveYaw, moveBlend, upperTwist & anti-skating skeletal update',
  );
  code = assertReplace(
    code,
    'it={name:"units",get instanceCount(){return y},update(D){',
    'it={name:"units",get instanceCount(){return y},getPuppet:id=>e.get(id)?.puppet??null,update(D){',
    'units module expose getPuppet helper',
  );
  code = assertReplace(
    code,
    'getStats(){return s.getStats()},',
    'getStats(){return s.getStats()},getUnitPuppet(L){return u.find(G=>G.name==="units")?.getPuppet?.(L)??null},getTerrainCounts(){return u.find(G=>G.name==="terrain")?.counts??null},refreshTextCache(){u.find(G=>G.name==="overlay")?.refreshTextCache?.()},',
    'renderer expose getUnitPuppet & refreshTextCache helpers',
  );

  // ── 14. 全站品牌、野怪与旧文案清零 ──
  const textSwaps = [
    ['王者农药', '唐宋荣耀', 2],
    ['WANGZHE', 'TANG · SONG', 1],
    ['历代英杰 · 峡谷争锋 · 5v5 对决', '__TS_TAGLINE__', 1],
    ['王者高原的坠星之力，召来了不同时代的英杰。', '__TS_SELECT_LEAD__', 1],
    ['铺展王者高原…', '铺展《千里江山》汴京演武场…', 1],
    ['王者高原', '汴京演武', 1],
    ['王者巨灵', '镇岳神兽', 5],
    ['王者祝福', '九州定鼎', 2],
    ['苔背獾', '负碑灵龟', 1],
    ['荧翅蛾', '提灯青鸟', 1],
    ['霜晶巨鹿', '九色玄鹿', 1],
    ['炽焰巨熊', '赤炎狻猊', 1],
    ['河道巨龙', '青金应龙', 1],
    ['沉渊鳞龙', '沧溟应龙', 1],
    ['五杀·王者降临', '五杀·名垂青史', 1],
    ['星芒乍现', '锐不可当', 1],
    ['星火燎原', '气吞万里', 1],
    ['王者传说', '千古风流', 1],
    ['全部美术与音效均为程序化生成', '六大唐宋名士 · 真国风视听 5v5 演武', 1],
    ['"v1.0"', 'tsConfig.brand.versionStamp', 1],
    ['panyue_passive:{name:"覆盾震地",kind:"buff"},panyue_bulwark:{name:"拥盾怒目",kind:"buff"},chijin_ember:{name:"越砍越勇",kind:"buff"},chijin_blaze:{name:"半路杀出 · 攻速",kind:"buff"},chijin_spin:{name:"抡圆了砍",kind:"buff"},xingli_mark:{name:"余音",kind:"debuff"},fengling_gale:{name:"连射",kind:"buff"},fengling_crit:{name:"下一箭必暴",kind:"buff"},yeque_shadow:{name:"得手",kind:"buff"}',
      'panyue_passive:{name:"玄甲镇岳",kind:"buff"},panyue_bulwark:{name:"双锏护身",kind:"buff"},chijin_ember:{name:"花影剑意",kind:"buff"},chijin_blaze:{name:"凌波突进 · 攻速",kind:"buff"},chijin_spin:{name:"惊鸿剑舞",kind:"buff"},xingli_mark:{name:"余音 / 定局",kind:"debuff"},fengling_gale:{name:"锦弦连韵",kind:"buff"},fengling_crit:{name:"下一箭必暴",kind:"buff"},yeque_shadow:{name:"一骑当千",kind:"buff"}', 1],
    ['程咬金的斧、樊哙的盾', '花蕊夫人的剑、秦琼的锏', 1],
    ['与樊哙漆盾同形的贴地轮廓', '与秦琼玄甲盾同形的贴地轮廓', 1],
    ['樊哙', '秦琼', 1],
    ['程咬金', '花蕊夫人', 1],
    ['王昭君', '苏轼', 1],
    ['李广', '文成公主', 1],
    ['荆轲', '辛弃疾', 1],
    ['摧毁<em>敌方水晶</em>就赢。你在左下角的蓝色方，敌方水晶在右上角。', '摧毁<em>敌方玉玺</em>就赢。你在左下角的青玉方，敌方玉玺在右上角。', 1],
    ['>◣ 我方水晶<', '>◣ 我方玉玺<', 1],
    ['>敌方水晶 ◥<', '>敌方玉玺 ◥<', 1],
    ['才打得动水晶', '才打得动玉玺', 1],
    ['敌方水晶已被摧毁', '敌方玉玺已被摧毁', 1],
    ['我方水晶被摧毁', '我方玉玺被摧毁', 2],
    ['敌方水晶已摧毁', '敌方玉玺已摧毁', 1],
    ['敌方水晶', '敌方玉玺', 3],
    ['我方水晶', '我方玉玺', 1],
    ['守住水晶！', '守住玉玺！', 1],
    ['去打水晶！', '去攻玉玺！', 1],
    ['就能打水晶。水晶爆了就赢！', '就能攻玉玺。玉玺碎了就赢！', 1],
    ['蓝色方', '青玉方', 1],
    ['红色方', '朱红方', 1],
  ];

  const ghStart = code.indexOf('GH=[');
  const ghEnd = code.indexOf('],VH=', ghStart);
  if (ghStart < 0 || ghEnd < 0) throw new Error('[build-core] 未找到 GH 加载贴士数组');
  code = code.slice(0, ghStart) + 'GH=[...tsConfig.brand.loadingTips]' + code.slice(ghEnd + 1);

  for (const [from, to, minCnt] of textSwaps) {
    if (to === '__TS_TAGLINE__') {
      code = replaceAllChecked(code, `"${from}"`, 'tsConfig.brand.tagLine', from, 1);
    } else if (to === '__TS_SELECT_LEAD__') {
      code = replaceAllChecked(code, `"${from}"`, 'tsConfig.brand.selectLead', from, 1);
    } else if (to === 'tsConfig.brand.versionStamp') {
      code = replaceAllChecked(code, from, to, 'versionStamp', 1);
    } else {
      code = replaceAllChecked(code, from, to, from, minCnt);
    }
  }

  // ── 14B. 唐宋牌手卷风全新开场架构替换 BH ──
  code = replaceBetween(
    code,
    'function BH(n){',
    'dispose:()=>window.removeEventListener("keydown",d)}}',
    'function BH(n){return tsConfig.createLobbyScreen({host:n.host,root:n.root,onStart:n.onStart,onPickHero:n.onPickHero,openHowto:()=>zH(n.root),openSettings:cb=>ny(n.root,{get:()=>n.host.getSettings(),update:h=>{n.host.updateSettings(h),cb?.()},audio:n.host.audio,mode:"menu"}),getTutorial:()=>Xc(n.host.getSettings(),"tutorial"),setTutorial:v=>E3(n.host,"tutorial",v),isInputFocused:Sf,hasOpenDialog:Xx})}',
    'BH Tang-Song handscroll opening screen replacement',
  );

  // ── 14C. 布料弹簧帧率一致性：弹簧项按 h² 缩放，与阻尼/重力/风力量纲一致（60fps 下与原版逐位等效） ──
  code = assertReplace(
    code,
    'y=1-Math.exp(-m.stiffness*h)',
    'y=1-Math.exp(-m.stiffness*h*h*60)',
    'cloth chain spring frame-rate scaling',
  );

  code = patchCoreHooks(code);

  // ── 15. 包装为 ES Module 并强制静态语法/禁词检查 ──
  const output = [
    '// AUTO-GENERATED by scripts/build-core.mjs from ../wzry.html (read-only).',
    '// Do not hand-edit this file; re-run `npm run build:core` to regenerate.',
    '/* eslint-disable */',
    '',
    'export function bootTangSongGlory(tsConfig) {',
    prelude,
    code,
    '}',
    '',
  ].join('\n');

  const FORBIDDEN = [
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
    '王者',
  ];
  for (const word of FORBIDDEN) {
    const cnt = countOccurrences(output, word);
    if (cnt > 0) {
      const idx = output.indexOf(word);
      throw new Error(
        `[build-core] 残余旧文案 "${word}" (${cnt} 处), 首个位于 @${idx}: ${output.slice(Math.max(0, idx - 30), idx + 60)}`,
      );
    }
  }

  new vm.Script(output.replace(/^export function /m, 'function '), { filename: 'mobaCore.js' });

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, output, 'utf8');
  console.log(
    `[build-core] OK -> ${path.relative(PROJECT_ROOT, OUT_FILE)} (${(Buffer.byteLength(output, 'utf8') / 1024).toFixed(1)} KB, 0 forbidden terms)`,
  );
}

main();
