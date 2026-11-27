import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';

const patches = [
  [
    'this.brain.update(t),this.sense(),this.lastThink=this.time,!this.idle()',
    'this.brain.update(t),this.sense(),this.lastThink=this.time,(!this.idle()||tsConfig.teamTactics?.isUrgent(this))',
  ],
  [
    'this.dodge()||this.survive()||(this.finish(),!this.sustain()&&(this.combat()||this.assist()||this.doTask()))',
    'this.dodge()||this.survive()||(this.finish(),!this.sustain()&&(tsConfig.teamTactics?.respond(this)||this.combat()||this.assist()||this.doTask()))',
  ],
  [
    '`cast_${kitOf(c.heroId)}_${c.slot}`',
    '`cast_${r1["cast_"+c.heroId+"_"+c.slot]?c.heroId:kitOf(c.heroId)}_${c.slot}`',
  ],
  // K3 结算阶段通知：原先只有 loading / match 会通知表现层，朱印落款需要知道结算页何时挂上
  ['a="result",rt.disposeHud()', 'a="result",tsConfig.onPhaseChange?.("result"),rt.disposeHud()'],
  // K1 合成着色器注入：表现层拿到原文做锚点替换（水墨阵亡），自己的锚点失配时原样返回
  [
    'fragmentShader:yI,uniforms:{tDiffuse:{value:null},tBloom:{value:null},',
    'fragmentShader:tsConfig.filmShaders?.final?.(yI)??yI,uniforms:{tDiffuse:{value:null},tBloom:{value:null},',
  ],
  // K2 每帧钩子：阵亡色调推进之后、渲染之前，表现层在这里写成片参数与入画镜头
  ['q(lt.dt),d?.render(v,lt.alpha,lt.dt);', 'q(lt.dt),tsConfig.onFrame?.(d,lt.dt,v),d?.render(v,lt.alpha,lt.dt);'],
  // K4 加载页关闭时长：收卷转场需要比 0.4s 淡出更长的窗口，由表现层按是否播放演出决定
  [
    'f.classList.add("is-closing"),window.setTimeout(()=>{d.dispose(),f.remove()},400)',
    'f.classList.add("is-closing"),window.setTimeout(()=>{d.dispose(),f.remove()},tsConfig.loadingCloseMs?.()??400)',
  ],
  // K5 选将去 3D 演武（纯国风立绘舞台，省掉菜单侧多余 WebGL 预览并允许触屏滑动整块舞台切将）
  [
    'const h=z("canvas","sf-select__canvas"),pcImg=document.createElement("img");pcImg.className="ts-select__pc-art";pcImg.draggable=!1;const pcWrap=z("div","ts-select__pc-wrap",pcImg);let stageMode="pc";const btnPc=z("button",null,"立绘"),btn3d=z("button",null,"3D演武");btnPc.type=btn3d.type="button";btnPc.classList.add("is-active");const stageToggle=z("div","ts-stage-toggle",btnPc,btn3d),u=z("div","sf-select__plate"),m=z("div","sf-select__stage",z("div","sf-select__glow"),z("div","sf-select__rings",z("div","sf-select__ring"),z("div","sf-select__ring sf-select__ring--in")),h,pcWrap,stageToggle,u,',
    'const pcImg=document.createElement("img");pcImg.className="ts-select__pc-art";pcImg.draggable=!1;const pcWrap=z("div","ts-select__pc-wrap",pcImg),u=z("div","sf-select__plate"),m=z("div","sf-select__stage",z("div","sf-select__glow"),z("div","sf-select__rings",z("div","sf-select__ring"),z("div","sf-select__ring sf-select__ring--in")),pcWrap,u,',
  ],
  [
    'x.textContent=hh[s].desc;const setStageMode=md=>{stageMode=md,m.classList.toggle("is-3d-mode",md==="3d"),btnPc.classList.toggle("is-active",md==="pc"),btn3d.classList.toggle("is-active",md==="3d"),md==="3d"&&a?.resize?.()};btnPc.addEventListener("click",()=>{t.audio.ui("select"),setStageMode("pc")});btn3d.addEventListener("click",()=>{t.audio.ui("select"),setStageMode("3d")});const g=po(',
    'x.textContent=hh[s].desc;const g=po(',
  ],
  [
    'const C=typeof ResizeObserver<"u"?new ResizeObserver(()=>a?.resize()):null,R=()=>a?.resize();let I=0;const P=()=>{if(!h.isConnected||h.clientWidth===0){I=requestAnimationFrame(P);return}try{a=t.createHeroPreview(h,e),a.resize()}catch{a=null}C?.observe(m),window.addEventListener("resize",R)},F=window.setTimeout(()=>{I=requestAnimationFrame(P)},280);let L=null;const B=q=>{q.pointerType!=="mouse"&&q.target===h&&(L=q.clientX)}',
    'const C=null,R=()=>{};let I=0;const F=0;let L=null;const B=q=>{q.pointerType!=="mouse"&&!q.target?.closest?.("button")&&(L=q.clientX)}',
  ],
  // K6 设置「演出动效」开关（默认开启，不受系统减少动态静默关停，改设置即时同步 body）
  [
    'const dk={quality:"high",cameraPreset:tsConfig.getInitialCameraPresetKey(),eyesCutin:!0,',
    'const dk={quality:"high",cameraPreset:tsConfig.getInitialCameraPresetKey(),eyesCutin:!0,cinematicFlow:!0,',
  ],
  [
    'typeof e.eyesCutin=="boolean"&&(t.eyesCutin=e.eyesCutin)),t}function vH(n){Wx(hk,JSON.stringify(n)),n?.cameraPreset&&tsConfig.saveCameraPreset(n.cameraPreset)}',
    'typeof e.eyesCutin=="boolean"&&(t.eyesCutin=e.eyesCutin),typeof e.cinematicFlow=="boolean"&&(t.cinematicFlow=e.cinematicFlow)),t}function vH(n){Wx(hk,JSON.stringify(n)),n?.cameraPreset&&tsConfig.saveCameraPreset(n.cameraPreset),tsConfig.onSettingsChange?.(n)}',
  ],
  [
    'const ec=r("大招特写切镜",Vt("star"),"eyesCutin","施放终极技能或连杀时，在屏幕上方呈现英雄眼神高光切镜。",ecPreview),',
    'const ec=r("大招特写切镜",Vt("star"),"eyesCutin","施放终极技能或连杀时，在屏幕上方呈现英雄眼神高光切镜。",ecPreview),cf=r("演出动效",Vt("star"),"cinematicFlow","开启展卷转场、入画镜头、大招聚光、落印与水墨阵亡演出；关闭可减轻画面动态。"),',
  ],
  [
    'fsRow,_fsHint,l.row,c.row,ec.row,ec.hint),',
    'fsRow,_fsHint,l.row,c.row,ec.row,ec.hint,cf.row,cf.hint),',
  ],
  [
    'c.toggle.set(w.cameraShake),ec.toggle.set(w.eyesCutin!==!1),',
    'c.toggle.set(w.cameraShake),ec.toggle.set(w.eyesCutin!==!1),cf.toggle.set(w.cinematicFlow!==!1),',
  ],
  // K7 草丛颜色/着色器钩子、进草翠叶青雾粒子与英雄青墨隐蔽描边
  [
    'RF=yt(Yt.env.reedDark),lp=yt(Yt.env.reed),CF=yt(Yt.env.reedTip),cp=yt(15129774);',
    'RF=yt(Yt.env.reedDark),lp=yt(Yt.env.reed),CF=yt(Yt.env.reedTip),cp=yt(0xc8e4d4);',
  ],
  [
    'vertexShader:EF,fragmentShader:AF,lights:!0,fog:!0,side:fi',
    'vertexShader:tsConfig.terrainShaders?.bushVert?.(EF)??EF,fragmentShader:tsConfig.terrainShaders?.bushFrag?.(AF)??AF,lights:!0,fog:!0,side:fi',
  ],
  [
    'if(o.kind==="hero"&&r.bush!==o.bushId){const m=l,x=c,p=e.particles.use(Mt.broadleaf);for(let g=0;g<e.n(6);g++){const y=e.rnd.next()*oe;p.spawn(m+Math.cos(y)*f*.8,e.rnd.range(.4,1.1),x+Math.sin(y)*f*.8,Math.cos(y)*e.rnd.range(1,2.4),e.rnd.range(1.5,3),Math.sin(y)*e.rnd.range(1,2.4),e.rnd.range(.6,.9),.26,.2)}r.bush=o.bushId}',
    'if(o.kind==="hero"&&r.bush!==o.bushId){const m=l,x=c,p=e.particles.use(Mt.broadleaf).tint(Lt(0x52ad86),Lt(0x1d4d3e));for(let g=0;g<e.n(10);g++){const y=e.rnd.next()*oe;p.spawn(m+Math.cos(y)*f*.8,e.rnd.range(.4,1.1),x+Math.sin(y)*f*.8,Math.cos(y)*e.rnd.range(1,2.4),e.rnd.range(1.5,3),Math.sin(y)*e.rnd.range(1,2.4),e.rnd.range(.6,.95),.28,.2)}if(o.bushId>=0){const sm=e.particles.use(Mt.smoke).tint(Lt(0x28645c),Lt(0x102828));for(let g=0;g<e.n(3);g++){const y=e.rnd.next()*oe;sm.spawn(m+Math.cos(y)*f*.45,e.rnd.range(.22,.6),x+Math.sin(y)*f*.45,Math.cos(y)*.35,e.rnd.range(.4,.9),Math.sin(y)*.35,e.rnd.range(.55,.85),.85,1.3)}}r.bush=o.bushId}',
  ],
  [
    'const Rt=Q.team===$.playerTeam||Q.visible[$.playerTeam];let kt=Rt?1:0;if(Rt){Q.bushId>=0&&(kt=.62);for(let ft=0;ft<Q.buffs.length;ft++)if(Q.buffs[ft].id==="untargetable"){kt=Math.min(kt,.42);break}}const V=ut.time-(1-N)*xo;',
    'const V=ut.time-(1-N)*xo;const Rt=Q.team===$.playerTeam||Q.visible[$.playerTeam];D.inBush=Rt&&Q.bushId>=0?(Q.rt.revealUntil>V?2:1):0;let kt=Rt?1:0;if(Rt){Q.bushId>=0&&(kt=Q.rt.revealUntil>V?.84:.56);for(let ft=0;ft<Q.buffs.length;ft++)if(Q.buffs[ft].id==="untargetable"){kt=Math.min(kt,.42);break}}',
  ],
  [
    'D.rimLeft>0&&(D.rimLeft-=$,D.rimLeft>0&&(U=Math.max(U,Math.min(1,D.rimLeft/D.rimDur*3)))),j.rim=U,',
    'D.rimLeft>0&&(D.rimLeft-=$,D.rimLeft>0&&(U=Math.max(U,Math.min(1,D.rimLeft/D.rimDur*3)))),D.inBush===1&&(j.tintAmount<.26&&(j.tint.setHex(0x3a8c82),j.tintAmount=.26),U=Math.max(U,.65)),j.rim=U,',
  ],
  // K8 汴河水体片元着色器钩子
  [
    'vertexShader:cU,fragmentShader:fU,lights:!0,fog:!0,transparent:!0,depthWrite:!1,side:fi',
    'vertexShader:cU,fragmentShader:tsConfig.terrainShaders?.waterFrag?.(fU)??fU,lights:!0,fog:!0,transparent:!0,depthWrite:!1,side:fi',
  ],
];

// Keep integration hooks reproducible when the optional read-only source exists.
export function patchCoreHooks(source) {
  for (const [before, after] of patches) {
    if (source.includes(after)) continue;
    const pieces = source.split(before);
    if (pieces.length !== 2) throw new Error(`core hook expected one anchor, found ${pieces.length - 1}`);
    source = pieces.join(after);
  }
  return source;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const core = path.join(root, 'src/engine/mobaCore.js');
  const output = patchCoreHooks(fs.readFileSync(core, 'utf8'));
  new vm.Script(output.replace(/^export function /m, 'function '), { filename: 'mobaCore.js' });
  fs.writeFileSync(core, output);
  console.log('[patch-core-hooks] integration hooks ready');
}
