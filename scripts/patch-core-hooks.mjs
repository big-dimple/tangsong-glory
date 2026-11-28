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
  // K3 结算阶段通知 + 5MB 胜负全屏 GPU 转场钩子（在销毁 HUD 前抓取实机末帧画布）
  [
    'a="result",rt.disposeHud()',
    'a="result",tsConfig.onBeforeResult?.(rt.stage?.querySelector?.("canvas"),mt.state),tsConfig.onPhaseChange?.("result"),rt.disposeHud()',
    'a="result",tsConfig.onPhaseChange?.("result"),rt.disposeHud()',
  ],
  // K1 合成着色器注入 + uTsTime 时间 uniform（Blender AgX + 暖色 Halation + 三角时间抖动 + 水墨阵亡）
  [
    'fragmentShader:yI,uniforms:{tDiffuse:{value:null},tBloom:{value:null},',
    'fragmentShader:tsConfig.filmShaders?.final?.(yI)??yI,uniforms:{tDiffuse:{value:null},tBloom:{value:null},',
  ],
  [
    'uDesaturate:{value:0},uDim:{value:0}',
    'uDesaturate:{value:0},uDim:{value:0},uTsTime:{value:0}',
  ],
  // K2 每帧钩子：阵亡色调推进之后、渲染之前，表现层在这里写成片参数、入画镜头与微顿帧 dt 缩放
  [
    'q(lt.dt),d?.render(v,lt.alpha,lt.dt);',
    'q(lt.dt),tsConfig.onFrame?.(d,lt.dt,v),d?.render(v,lt.alpha,tsConfig.impact?.scaleRenderDt?.(lt.dt)??lt.dt);',
    'q(lt.dt),tsConfig.onFrame?.(d,lt.dt,v),d?.render(v,lt.alpha,lt.dt);',
  ],
  // K4 加载页关闭时长
  [
    'f.classList.add("is-closing"),window.setTimeout(()=>{d.dispose(),f.remove()},400)',
    'f.classList.add("is-closing"),window.setTimeout(()=>{d.dispose(),f.remove()},tsConfig.loadingCloseMs?.()??400)',
  ],
  // K5 选将去 3D 演武（纯国风立绘舞台）
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
  // K6 设置「演出动效」开关
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
    'D.rimLeft>0&&(D.rimLeft-=$,D.rimLeft>0&&(U=Math.max(U,Math.min(1,D.rimLeft/D.rimDur*3)))),D.inBush===1&&(j.tintAmount<.26&&(j.tint.setHex(0x3a8c82),j.tintAmount=.26),U=Math.max(U,.65)),D.tsCcState==="petrify"?(j.tint.setHex(0x88929b),j.tintAmount=.88,j.body.setRGB(.64,.68,.72),U=Math.max(U,.62)):D.tsCcState==="ink_seal"?(j.tint.setHex(0x161d22),j.tintAmount=.86,j.body.setRGB(.28,.36,.38),U=Math.max(U,.92)):D.tsCcState==="chill"?(j.tintAmount<.28&&(j.tint.setHex(0x74dcff),j.tintAmount=.28),U=Math.max(U,.44)):D.tsFlightKind==="xinqiji"&&(j.tintAmount<.55&&(j.tint.setHex(0xff7834),j.tintAmount=.55),U=Math.max(U,.95)),j.rim=U,',
    'D.rimLeft>0&&(D.rimLeft-=$,D.rimLeft>0&&(U=Math.max(U,Math.min(1,D.rimLeft/D.rimDur*3)))),D.inBush===1&&(j.tintAmount<.26&&(j.tint.setHex(0x3a8c82),j.tintAmount=.26),U=Math.max(U,.65)),j.rim=U,',
  ],
  // K8 汴河水体片元着色器钩子
  [
    'vertexShader:cU,fragmentShader:fU,lights:!0,fog:!0,transparent:!0,depthWrite:!1,side:fi',
    'vertexShader:cU,fragmentShader:tsConfig.terrainShaders?.waterFrag?.(fU)??fU,lights:!0,fog:!0,transparent:!0,depthWrite:!1,side:fi',
  ],
  // K9 全面去除“AI/人机/对手难度”字样 + 赛场段位包装
  [
    'hh={easy:{label:"简单",desc:"敌人反应慢、技能不准、很少越线；队友也不强，输赢看你。适合第一次玩。"},normal:{label:"普通",desc:"AI 会补兵换血、游走抱团，接近普通玩家。"},hard:{label:"困难",desc:"AI 反应快，会集火、反蹲与连招收割。"}}',
    'hh={easy:{label:"初阶演武",desc:"匹配初入汴京的棋友，对线节奏舒缓，适合热身与熟悉新将。"},normal:{label:"名士争锋",desc:"匹配势均力敌的十方豪杰，补兵游走与团战博弈更趋紧凑。"},hard:{label:"宗师论道",desc:"匹配高阶劲旅，反蹲支援、技能衔接与集火收割皆极凌厉。"}}',
  ],
  [
    ".sf-select__diff-desc::before { content: '对手难度 · '; color: var(--sf-c-gold-300); }",
    ".sf-select__diff-desc::before { content: '赛场段位 · '; color: var(--sf-c-gold-300); }",
  ],
  [
    'p=V8({options:uH.map(q=>({value:q,label:hh[q].label})),value:s,label:"对手难度",onChange:q=>{s=q,x.textContent=hh[q].desc,n.onChange?.({heroId:e,difficulty:s})}});x.textContent=hh[s].desc;const g=po({label:"开始对战",variant:"primary",size:"lg",pulse:!0,sound:"ready",onClick:()=>S()}),y=z("div","sf-select__go",z("div","sf-select__diff",z("div","sf-select__diff-head",z("h3","sf-heading","对手难度"),p.el),x),g)',
    'p=V8({options:uH.map(q=>({value:q,label:hh[q].label})),value:s,label:"赛场段位",onChange:q=>{s=q,x.textContent=hh[q].desc,n.onChange?.({heroId:e,difficulty:s})}});x.textContent=hh[s].desc;const g=po({label:"锁定出战",variant:"primary",size:"lg",pulse:!0,sound:"ready",onClick:()=>S()}),y=z("div","sf-select__go",z("div","sf-select__diff",z("div","sf-select__diff-head",z("h3","sf-heading","赛场段位"),p.el),x),g)',
  ],
  // K10 选将殿堂接入 5v5 实时点将席位带 + 锁定等候 + GPU slam 转场
  [
    'l.append(c,z("div","sf-select__main",f,m,y,_));function k(q){const et=Ml.indexOf(e);M(Ml[(et+q+Ml.length)%Ml.length])}function M(q){if(q!==e){e=q,i="s1",E(!0);try{a?.setHero(q)}catch{}n.onChange?.({heroId:e,difficulty:s})}}function S(){o||(o=!0,g.disabled=!0,n.onConfirm({heroId:e,difficulty:s}))}',
    'l.append(c,z("div","sf-select__main",f,m,y,_));const _draft=tsConfig.mountDraftBar?.(l,e,q=>t.portrait(q,"avatar"));function k(q){const et=Ml.indexOf(e);M(Ml[(et+q+Ml.length)%Ml.length])}function M(q){if(q!==e){e=q,i="s1",E(!0);_draft?.updateHero(q);try{a?.setHero(q)}catch{}n.onChange?.({heroId:e,difficulty:s})}}function S(){if(o)return;o=!0,g.disabled=!0;const go=()=>{tsConfig.onBeforeSelectConfirm?.(e);n.onConfirm({heroId:e,difficulty:s})};if(_draft){_draft.lockPlayerAndFinish(()=>go(),snd=>t.audio.ui(snd))}else go()}',
    'l.append(c,z("div","sf-select__main",f,m,y,_));const _draft=tsConfig.mountDraftBar?.(l,e,q=>t.portrait(q,"avatar"));function k(q){const et=Ml.indexOf(e);M(Ml[(et+q+Ml.length)%Ml.length])}function M(q){if(q!==e){e=q,i="s1",E(!0);_draft?.updateHero(q);try{a?.setHero(q)}catch{}n.onChange?.({heroId:e,difficulty:s})}}function S(){if(o)return;o=!0,g.disabled=!0;const go=()=>{tsConfig.onBeforeSelectConfirm?.(e);n.onConfirm({heroId:e,difficulty:s})};if(_draft){_draft.lockPlayerAndFinish(()=>go(),t.audio.ui)}else go()}',
  ],
  [
    'for(const q of r.splice(0))q();try{a?.dispose()}catch{}a=null',
    '_draft?.dispose();for(const q of r.splice(0))q();try{a?.dispose()}catch{}a=null',
  ],
  // K11 寻将匹配弹窗 + wash 水波转场接入大厅 → 选将
  [
    ',p=()=>{c||x(BH({host:t,root:i,onStart:g,onPickHero:v=>{r={...r,heroId:v},I4(r),g()}}))},g=()=>{c||x(RH({host:t,root:i,initial:r,onBack:p,onChange:v=>{r=v,I4(v)},onConfirm:y}))}',
    ';let _cancelMm=null;const openSelect=()=>{c||x(RH({host:t,root:i,initial:r,onBack:p,onChange:v=>{r=v,I4(v)},onConfirm:y}))},enterDraft=()=>{if(c)return;if(tsConfig.startMatchmaking){_cancelMm?.();_cancelMm=tsConfig.startMatchmaking({root:i,heroId:r.heroId,onAudioUi:snd=>t.audio.ui(snd),onDone:()=>{_cancelMm=null;openSelect()},onCancel:()=>{_cancelMm=null}})}else openSelect()},p=()=>{_cancelMm?.(),_cancelMm=null,c||x(BH({host:t,root:i,onStart:enterDraft,onPickHero:v=>{r={...r,heroId:v},I4(r),enterDraft()}}))},g=openSelect',
    ';let _cancelMm=null;const openSelect=()=>{c||x(RH({host:t,root:i,initial:r,onBack:p,onChange:v=>{r=v,I4(v)},onConfirm:y}))},enterDraft=()=>{if(c)return;if(tsConfig.startMatchmaking){_cancelMm?.();_cancelMm=tsConfig.startMatchmaking({root:i,heroId:r.heroId,onAudioUi:t.audio.ui,onDone:()=>{_cancelMm=null;openSelect()},onCancel:()=>{_cancelMm=null}})}else openSelect()},p=()=>{_cancelMm?.(),_cancelMm=null,c||x(BH({host:t,root:i,onStart:enterDraft,onPickHero:v=>{r={...r,heroId:v},I4(r),enterDraft()}}))},g=openSelect',
  ],
  [
    'window.clearTimeout(d);for(const[v,_]of h)',
    '_cancelMm?.(),_cancelMm=null;window.clearTimeout(d);for(const[v,_]of h)',
  ],
  // K12 加载页去“AI”并注入拟真唐宋侠客雅号 + 同局 seed 延续 + 3D 撕纸 tear 转场揭幕战场
  [
    'z("span","sf-lcard__tag",s?za("你","me"):za("AI","mute"))',
    'z("span","sf-lcard__tag",s?za("你","me"):za(tsConfig.getMatchHandle?.(e,i,s)??"豪杰","mute"))',
  ],
  [
    'z("small",null,y===0?"我方":`敌方 · AI ${hh[t.difficulty].label}`)',
    'z("small",null,y===0?"我方阵营":`敌方阵营 · ${hh[t.difficulty].label}`)',
  ],
  [
    '`对手难度：${hh[t.difficulty].label}`',
    '`演武段位：${hh[t.difficulty].label}`',
  ],
  [
    'const matchSeed=e.seed??qq(),matchTeams=selectMatchTeams(t.heroId,matchSeed);',
    'const matchSeed=tsConfig.consumeMatchSeed?.()??e.seed??qq(),matchTeams=selectMatchTeams(t.heroId,matchSeed);',
  ],
  [
    'r.setProgress(1,"进入战场");const ht=e.fastLoad?0:Lq-(to()-l);return ht>0&&await X6(ht),await zc(),p()?null:(o.reset(),a.setMusic("battle"),r.close(),n.setPhase("match"),E=!0,A(),Q.start(),U)',
    'r.setProgress(1,"进入战场");const ht=e.fastLoad?0:Lq-(to()-l);return ht>0&&await X6(ht),await zc(),p()?null:(o.reset(),a.setMusic("battle"),tsConfig.onBeforeMatchReveal?.(t,matchTeams),r.close(),n.setPhase("match"),E=!0,A(),Q.start(),U)',
  ],
  // K13 结算战绩表展示真实匹配雅号，彻底一致无穿帮
  [
    'q=z("span","sf-rt__badges",F.isPlayer?za("你","me"):null,B?za("MVP","solid",Vt("crown")):null,G?za("败方最佳","mute"):null)',
    'q=z("span","sf-rt__badges",F.isPlayer?za("你","me"):za(tsConfig.getMatchHandle?.(E,C.indexOf(F),F.isPlayer)??"豪杰","mute"),B?za("MVP","solid",Vt("crown")):null,G?za("败方最佳","mute"):null)',
  ],
  // K14 全 6 种野怪攻击技能动效钩子
  [
    'case"attack":{if(!t.anchor(y.unitId)||!t.a.visible)return;const _=t.a.unit;if(!_||_.kind!=="hero"||Se[_.heroId].attackType!=="melee"||t.focusDist(t.a.x,t.a.z)>Jr)return;',
    'case"attack":{if(!t.anchor(y.unitId)||!t.a.visible)return;const _=t.a.unit;if(!_)return;if(_.kind==="monster"){tsConfig.onMonsterAttackVfx?.(t,_,y,{qo,bn,Lr,Ni,H0,U0,jo,vs,Lt,Mt,Xt,Ft,oe});return}if(_.kind!=="hero"||Se[_.heroId].attackType!=="melee"||t.focusDist(t.a.x,t.a.z)>Jr)return;',
  ],
  // K15 彻底去除沧溟应龙吐息/灼伤/赐福与提灯青鸟弹道的旧作紫色
  [
    ',KD={glow:W.moth,hot:Lt(16773312),deep:Lt(2062962)};',
    ',KD={glow:Lt(0xe89b38),hot:Lt(0xfff0b0),deep:Lt(0x8c4212)};',
  ],
  [
    'h.color(W.violetHot,1.25,0),h.add=.55,h.k=1.4;let u=0;n.track(f,l,(m,x,p)=>{if(!o3(n,f,i,a,Nn))return;const g=.12+.36*x*x;h.at(Nn.x,Nn.y,Nn.z).scale(g),h.a=.25+.5*x,u+=p*(14+30*x)*n.density;const y=n.particles.use(Mt.glint).tint(W.violetHot,W.abyssCyan);',
    'h.color(W.goldHot,1.25,0),h.add=.55,h.k=1.4;let u=0;n.track(f,l,(m,x,p)=>{if(!o3(n,f,i,a,Nn))return;const g=.12+.36*x*x;h.at(Nn.x,Nn.y,Nn.z).scale(g),h.a=.25+.5*x,u+=p*(14+30*x)*n.density;const y=n.particles.use(Mt.glint).tint(W.goldHot,W.abyssCyan);',
  ],
  [
    'x.color(W.violet,1.05,0),x.add=.4,x.k=2.6',
    'x.color(Lt(0x2fa89c),1.05,0),x.add=.4,x.k=2.6',
  ],
  [
    'n.sprites.draw(Ft.glow,Nn.x+T*.25,Nn.y-.05,Nn.z+E*.25,.55*P,0,W.violetHot,2.6,1,.85)',
    'n.sprites.draw(Ft.glow,Nn.x+T*.25,Nn.y-.05,Nn.z+E*.25,.55*P,0,W.goldHot,2.6,1,.85)',
  ],
  [
    '.tint(W.violetHot,W.abyssCyan).spawn(Nn.x,Nn.y,Nn.z,B*L*1.7',
    '.tint(W.goldHot,W.abyssCyan).spawn(Nn.x,Nn.y,Nn.z,B*L*1.7',
  ],
  [
    '.color(W.violetHot,1.45,.8).under(W.violetDeep,.18)}for(y+=S*16;y>=1;){y-=1;const F=w+_.signed()*l*.8,L=_.range(A+1.2,r*.95);n.decals.add(Xt.scorch,d+Math.cos(F)*L,h+Math.sin(F)*L,_.range(.9,1.5),1.5+(c-b)).params(1).color(W.abyssCyan,1.4).under(W.violetDeep,.8)}}};if(f>=0&&n.anchor(f))n.track(f,p,(M,S,b)=>k(S,b),()=>n.glow.release(x));else{n.glow.release(x);return}o3(n,f,a,o,Q0)&&(vs(n,Q0.x,Q0.y,Q0.z,1.8,W.violetHot,W.violet,a,o,6,le.flashSkill,9),n.light(Q0.x,Q0.z,Q0.y,W.violet,2.2,5.5,le.lightDur))',
    '.color(W.goldHot,1.45,.8).under(Lt(0x134a52),.18)}for(y+=S*16;y>=1;){y-=1;const F=w+_.signed()*l*.8,L=_.range(A+1.2,r*.95);n.decals.add(Xt.scorch,d+Math.cos(F)*L,h+Math.sin(F)*L,_.range(.9,1.5),1.5+(c-b)).params(1).color(W.abyssCyan,1.4).under(Lt(0x134a52),.8)}}};if(f>=0&&n.anchor(f))n.track(f,p,(M,S,b)=>k(S,b),()=>n.glow.release(x));else{n.glow.release(x);return}o3(n,f,a,o,Q0)&&(vs(n,Q0.x,Q0.y,Q0.z,1.8,W.goldHot,W.abyssCyan,a,o,6,le.flashSkill,9),n.light(Q0.x,Q0.z,Q0.y,W.abyssCyan,2.2,5.5,le.lightDur))',
  ],
  [
    'jo(n,a,r,o,3,2.5,W.violetHot,W.violet,.4,.26),n.anchors.flashTint?.(e,W.violet,.5,.3)',
    'jo(n,a,r,o,3,2.5,W.goldHot,W.abyssCyan,.4,.26),n.anchors.flashTint?.(e,W.abyssCyan,.5,.3)',
  ],
  [
    'if(i==="abyss_drake"){Lr(n,t,e,.5,7,.9,W.violet,1.3,.6),bn(n,t,e,6,.8,W.abyssCyan,1.4,.1,.25),n.light(t,e,3,W.violet,6,12,le.lightDur);let r=0;for(const l of a.heroes){if(l.team!==s||!l.alive||n.focusDist(l.pos.x,l.pos.y)>46)continue;const c=l.id;n.after(.15+r*.08,()=>NP(n,c,t,3,e,.8,W.violetHot,W.abyssCyan,()=>{if(!n.anchor(c))return;const f=n.a.radius;n.decals.add(Xt.sigil,n.a.x,n.a.z,f*2.1+.5,1.2).params(3,.3).color(W.violet,1.6,1).under(W.violetDeep,.35).follow(c),vs(n,n.a.x,n.a.y+n.a.height*.5,n.a.z,1.6,W.violetHot,W.violet,0,0,4,le.flashSkill,4)',
    'if(i==="abyss_drake"){Lr(n,t,e,.5,7,.9,W.abyssCyan,1.3,.6),bn(n,t,e,6,.8,W.goldHot,1.4,.1,.25),n.light(t,e,3,W.abyssCyan,6,12,le.lightDur);let r=0;for(const l of a.heroes){if(l.team!==s||!l.alive||n.focusDist(l.pos.x,l.pos.y)>46)continue;const c=l.id;n.after(.15+r*.08,()=>NP(n,c,t,3,e,.8,W.goldHot,W.abyssCyan,()=>{if(!n.anchor(c))return;const f=n.a.radius;n.decals.add(Xt.sigil,n.a.x,n.a.z,f*2.1+.5,1.2).params(3,.3).color(W.abyssCyan,1.6,1).under(Lt(0x134a52),.35).follow(c),vs(n,n.a.x,n.a.y+n.a.height*.5,n.a.z,1.6,W.goldHot,W.abyssCyan,0,0,4,le.flashSkill,4)',
  ],
  [
    'monster:{edge:W.amber,under:W.violetDeep}',
    'monster:{edge:W.amber,under:Lt(0x134a52)}',
  ],
  [
    'vs(n,d,h,u,2.6,W.violetHot,W.violet,0,0,10,le.flashBig,8),U0(n,d,h,u,10,6,5,W.violetHot,W.violet,.26),n.light(d,u,h,W.violet,6,10,le.lightDur)}),n.after(1.7,()=>{tf(n,e+l.signed()*1.5,s+l.signed()*1.5,2.2,14),n.shake(.2,e,s)}),n.after(2,()=>{const f=n.particles.use(Mt.scale).tint(W.violetHot,W.abyssCyan);for(let d=0;d<n.n(26);d++)f.orbit(e+l.signed()*2.5,l.range(.3,1.6),s+l.signed()*2.5,l.range(.1,.6),l.range(.2,.8),l.next()*oe,l.range(1,3),l.range(1.5,3),l.range(1,1.4),.22,.08,l.range(0,1));jo(n,e,1.5,s,10,2.5,W.abyssCyan,W.violet,1.2,.3)})',
    'vs(n,d,h,u,2.6,W.goldHot,W.abyssCyan,0,0,10,le.flashBig,8),U0(n,d,h,u,10,6,5,W.goldHot,W.abyssCyan,.26),n.light(d,u,h,W.abyssCyan,6,10,le.lightDur)}),n.after(1.7,()=>{tf(n,e+l.signed()*1.5,s+l.signed()*1.5,2.2,14),n.shake(.2,e,s)}),n.after(2,()=>{const f=n.particles.use(Mt.scale).tint(W.goldHot,W.abyssCyan);for(let d=0;d<n.n(26);d++)f.orbit(e+l.signed()*2.5,l.range(.3,1.6),s+l.signed()*2.5,l.range(.1,.6),l.range(.2,.8),l.next()*oe,l.range(1,3),l.range(1.5,3),l.range(1,1.4),.22,.08,l.range(0,1));jo(n,e,1.5,s,10,2.5,W.abyssCyan,W.gold,1.2,.3)})',
  ],
  [
    'case"abyss_drake":{n.decals.add(Xt.swirl,t,e,5.5,1.3).params(4,-2.5).color(W.abyssCyan,1.3,.9).under(W.violetDeep,.6)',
    'case"abyss_drake":{n.decals.add(Xt.swirl,t,e,5.5,1.3).params(4,-2.5).color(W.abyssCyan,1.3,.9).under(Lt(0x134a52),.6)',
  ],
  [
    'case"star_colossus":{n.decals.add(Xt.telegraph,t,e,4,1.05).y(.09).color(W.gold,1.5,.9).under(W.violetDeep,.4)',
    'case"star_colossus":{n.decals.add(Xt.telegraph,t,e,4,1.05).y(.09).color(W.gold,1.5,.9).under(Lt(0x3a2410),.4)',
  ],
  // K16 彻底清除苍溟应龙巢穴地印、河畔晶石与雾气的遗留紫色
  [
    'const rU={1:9427199,2:16742956,3:12114040,4:Yt.env.amber,5:Yt.env.violet,6:16764768},Z_=new Ut;',
    'const rU={1:9427199,2:16742956,3:12114040,4:Yt.env.amber,5:Yt.env.glowCyan,6:16764768},Z_=new Ut;',
  ],
  [
    'if(o.monsterType==="abyss_drake"&&r<11)return Pt(P_,[.6,.5,1],s.range(0,.4));if(o.monsterType==="star_colossus"&&r<11)return Pt(D_,[1,.95,.8],s.range(0,.4))}}return n.baseDist(t,e,14)<9?t-e<0?Pt(oh,jN,s.range(.4,.8)):Pt(zx,qN,s.range(.3,.7)):s.chance(.62)?Pt(oh,[.8,1,.95],s.range(0,.35)):Pt(P_,oh,s.range(0,.3))',
    'if(o.monsterType==="abyss_drake"&&r<11)return Pt(oh,[.55,.95,.9],s.range(0,.4));if(o.monsterType==="star_colossus"&&r<11)return Pt(D_,[1,.95,.8],s.range(0,.4))}}return n.baseDist(t,e,14)<9?t-e<0?Pt(oh,jN,s.range(.4,.8)):Pt(zx,qN,s.range(.3,.7)):s.chance(.62)?Pt(oh,[.8,1,.95],s.range(0,.35)):Pt(VN,oh,s.range(0,.3))',
  ],
  [
    'r.push({kind:"fog",x:p,y:Fn+.35,z:g,width:12,color:Pt(tl.cold,tl.violet,.3),alpha:.11}),r.push({kind:"beam",x:p-1.5,y:Fn,z:g+1,width:3.6,length:11,color:Pt(tl.warm,tl.violet,.35),alpha:.06})',
    'r.push({kind:"fog",x:p,y:Fn+.35,z:g,width:12,color:Pt(tl.cold,yt(Yt.env.glowCyan),.35),alpha:.11}),r.push({kind:"beam",x:p-1.5,y:Fn,z:g+1,width:3.6,length:11,color:Pt(tl.warm,yt(Yt.env.glowCyan),.3),alpha:.06})',
  ],
  [
    '      // 沉渊潭：潭底加深，紫色发光水藻纹\n      float pm = (1.0 - smoothstep(4.2, 6.4, cr)) * under;\n      albedo *= mix(vec3(1.0), vec3(0.42, 0.4, 0.62), pm);\n      #if DETAIL >= 1\n      float an = texture2D(tNoise, wp * 0.083 + vec2(t * 0.004, 0.61)).g;\n      float algae = (1.0 - smoothstep(0.008, 0.035, abs(an - 0.5))) * pm;\n      emissive += vec3(0.56, 0.3, 1.0) * algae * (0.35 + 0.4 * pulse);',
    '      // 苍龙潭：潭底石青加深，碧玉鎏金水脉纹\n      float pm = (1.0 - smoothstep(4.2, 6.4, cr)) * under;\n      albedo *= mix(vec3(1.0), vec3(0.28, 0.52, 0.56), pm);\n      #if DETAIL >= 1\n      float an = texture2D(tNoise, wp * 0.083 + vec2(t * 0.004, 0.61)).g;\n      float algae = (1.0 - smoothstep(0.008, 0.035, abs(an - 0.5))) * pm;\n      emissive += vec3(0.24, 0.86, 0.78) * algae * (0.35 + 0.4 * pulse);',
  ],
  [
    'ember_golem:"#ff5d5d",abyss_drake:"#c09bff",star_colossus:"#ffd76a"},_1=["#4da3ff","#ff5d5d"]',
    'ember_golem:"#ff5d5d",abyss_drake:"#4cc9ba",star_colossus:"#ffd76a"},_1=["#4da3ff","#ff5d5d"]',
  ],
  [
    'ember_golem:"#ff5d5d",abyss_drake:"#c09bff",star_colossus:"#ffd76a"},uG={',
    'ember_golem:"#ff5d5d",abyss_drake:"#4cc9ba",star_colossus:"#ffd76a"},uG={',
  ],
  // K17 王者荣耀式多阶装备合成系统（T1小件 → T2中件 → T3神装）与互动合成路线树
  [
    'function Po(n){return tH[n](ln[n].color)}',
    'function Po(n){return tH[n](ln[n].color)}tsConfig.items?.init?.(ln,tH,IB);',
  ],
  [
    'wG=["recommend","attack","magic","defense","boots"],MG={1:"基础鞋",2:"进阶鞋"},kG={attack:"攻击装备",magic:"法术装备",defense:"防御装备",boots:"鞋"}',
    'wG=["recommend","attack","magic","defense","boots"],MG={1:"小件",2:"中件",3:"神装"},kG={attack:"攻击装备",magic:"法术装备",defense:"防御装备",boots:"鞋"}',
  ],
  [
    'function $f(n){const t=Se[n.heroId].build,e=n.items,s=Dm(e),i=e.indexOf(null)<0,a=e.map(()=>!1);let o=!1;for(const r of t){const l=ln[r];if(l.category==="boots"){if(s&&(ln[s].tier===2||l.tier===1))continue;return o&&!s?null:r}let c=!1;for(let f=0;f<e.length;f++)if(!a[f]&&e[f]===r){a[f]=!0,c=!0;break}if(!c){if(!i)return r;o=!0}}return null}function Gf(n,t){const e=ln[t];if(e.category==="boots"){const s=Dm(n.items);if(s)return e.cost-Math.floor(ln[s].cost*Yh)}return e.cost}function zm(n,t){const e=ln[t];if(e.category==="boots"){const s=Dm(n.items);if(s)return e.tier!==1&&s!==t}return n.items.indexOf(null)>=0}function Tk(n,t){return Se[n].build.includes(t)}function Yd(n){const t=Se[n.heroId].build,e=n.items,s=Dm(e),i=$f(n),a=[];let o=null,r=null;for(const c of t){const f=ln[c];f.category==="boots"&&(f.tier===1?o=o??c:r=c)}if(o||r){const c=r??o,f=r!==null;let d;s&&(ln[s].tier===2||!f)?d="done":d=s?"base":"todo";const h=d==="done"?null:d==="base"?c:o??c;a.push({finalId:c,baseId:f?o:null,stage:d,buyId:h,cost:h?Gf(n,h):0,next:!1,order:1})}const l=e.map(()=>!1);for(const c of t){if(ln[c].category==="boots")continue;let f=!1;for(let d=0;d<e.length;d++)if(!l[d]&&e[d]===c){l[d]=!0,f=!0;break}a.push({finalId:c,baseId:null,stage:f?"done":"todo",buyId:f?null:c,cost:f?0:ln[c].cost,next:!1,order:a.length+1})}if(i){const c=a.find(f=>f.buyId===i);c&&(c.next=!0)}return a}',
    'function $f(n){return tsConfig.items?tsConfig.items.findNextBuyItem(n,Se,ln):null}function Gf(n,t){return tsConfig.items?tsConfig.items.resolveSynthesis(n.items,t,ln).netCost:ln[t].cost}function zm(n,t){return tsConfig.items?tsConfig.items.resolveSynthesis(n.items,t,ln).fits:n.items.indexOf(null)>=0}function Tk(n,t){return tsConfig.items?tsConfig.items.isRecommendedOrPart(n,t,Se,ln):Se[n].build.includes(t)}function Yd(n){return tsConfig.items?tsConfig.items.computeRecommendCards(n,Se,ln):[]}',
  ],
  [
    'function M1(n,t){const e=ln[t];let s=null;if(e.category==="boots"){const a=Ak(n);if(a){if(a===t)return{ok:!1,block:"boots_same",cost:e.cost,replaces:null};if(e.tier===1)return{ok:!1,block:"boots_owned",cost:e.cost,replaces:null};s=a}}const i=Gf(n,t);return zm(n,t)?n.gold<i?{ok:!1,block:"gold",cost:i,replaces:s}:{ok:!0,block:"ok",cost:i,replaces:s}:{ok:!1,block:"full",cost:i,replaces:s}}',
    'function M1(n,t){const e=ln[t];let s=null;if(e.category==="boots"){const a=Ak(n);if(a){if(a===t)return{ok:!1,block:"boots_same",cost:e.cost,replaces:null};if(e.tier===1)return{ok:!1,block:"boots_owned",cost:e.cost,replaces:null};s=a}}const syn=tsConfig.items?.resolveSynthesis(n.items,t,ln),i=syn?syn.netCost:Gf(n,t),fits=syn?syn.fits:zm(n,t),rep=s??syn?.replacesLabel??null;return fits?n.gold<i?{ok:!1,block:"gold",cost:i,replaces:rep}:{ok:!0,block:"ok",cost:i,replaces:rep}:{ok:!1,block:"full",cost:i,replaces:null}}',
  ],
  [
    'function cS(n,t,e,s=!1){const i=ln[e];if(!i)return!1;const a=t.items;let o=i.cost,r=-1;if(i.category==="boots"){const l=a.findIndex(c=>c!==null&&ln[c].category==="boots");if(l>=0){const c=ln[a[l]];if(i.tier===1||c.id===i.id)return Do(n,t,"full",s);r=l,o-=Math.floor(c.cost*Yh)}}return r<0&&(r=a.indexOf(null)),r<0?Do(n,t,"full",s):t.gold<o?Do(n,t,"gold",s):(t.gold-=o,a[r]=e,lS(n,t),s?n.emit({type:"itemBought",unitId:t.id,itemId:e,auto:!0}):n.emit({type:"itemBought",unitId:t.id,itemId:e}),!0)}',
    'function cS(n,t,e,s=!1){const i=ln[e];if(!i)return!1;const a=t.items;if(i.category==="boots"){const l=a.findIndex(c=>c!==null&&ln[c].category==="boots");if(l>=0){const c=ln[a[l]];if(i.tier===1||c.id===i.id)return Do(n,t,"full",s)}}const syn=tsConfig.items?tsConfig.items.resolveSynthesis(a,e,ln):null,o=syn?syn.netCost:i.cost,fits=syn?syn.fits:a.indexOf(null)>=0;if(!fits)return Do(n,t,"full",s);if(t.gold<o)return Do(n,t,"gold",s);t.gold-=o;if(syn&&syn.consumedIndices.length>0){for(const idx of syn.consumedIndices)a[idx]=null;a[syn.consumedIndices[0]]=e}else{const r=a.indexOf(null);a[r]=e}return lS(n,t),s?n.emit({type:"itemBought",unitId:t.id,itemId:e,auto:!0}):n.emit({type:"itemBought",unitId:t.id,itemId:e}),!0}',
  ],
  [
    ',i==="recommend")for(const Zt of Yd(Tt))r.push(gt(Zt.order,lt(Zt,Tt),ln[Zt.finalId].category==="boots"));else{const Zt=IB.filter(be=>be.category===i).sort((be,ce)=>be.cost-ce.cost);for(const be of Zt)r.push(gt(0,be.id,!1))}',
    ',i==="recommend")for(const Zt of Yd(Tt))r.push(gt(Zt.order,lt(Zt,Tt),ln[Zt.finalId].category==="boots"||(ln[Zt.finalId].from?.length??0)>0));else{const Zt=IB.filter(be=>be.category===i).sort((be,ce)=>(be.tier-ce.tier)||(be.cost-ce.cost));for(const be of Zt)r.push(gt(0,be.id,!1))}',
  ],
  [
    'Ze=z("div","sf-hud__dt-meta",z("span","sf-badge sf-badge--mute",u4[Zt.category]),Zt.category==="boots"?z("span",`sf-badge${Zt.tier===2?"":" sf-badge--mute"}`,MG[Zt.tier]):null)',
    'Ze=z("div","sf-hud__dt-meta",z("span","sf-badge sf-badge--mute",u4[Zt.category]),z("span",`sf-badge${Zt.tier>=2?"":" sf-badge--mute"}`,MG[Zt.tier]??(Zt.tier===3?"神装":"小件")))',
  ],
  [
    'if(Zt.passive?qs.appendChild(z("div","sf-hud__dt-passive",z("b",null,`被动 · ${Zt.passive.name}`),Zt.passive.desc)):qs.appendChild(z("div","sf-hud__dt-nopassive","(无被动)")),Ot=z("div","sf-hud__dt-note")',
    'if(Zt.passive?qs.appendChild(z("div","sf-hud__dt-passive",z("b",null,`被动 · ${Zt.passive.name}`),Zt.passive.desc)):qs.appendChild(z("div","sf-hud__dt-nopassive","(无被动)")),(()=>{const _rt=tsConfig.items?.renderRecipeTree?.(be,n.me,ln,Po,nid=>{i=e(nid).category,G.set(i),ft(),a={kind:"shop",id:nid},Ue()});_rt&&qs.appendChild(_rt)})(),Ot=z("div","sf-hud__dt-note")',
  ],
  [
    'if(Ze.replaces?(be.classList.add("is-good"),be.append(`替换${ln[Ze.replaces].name}，已抵 `,z("b","sf-num",String(ce.cost-Ze.cost))))',
    'if(Ze.replaces?(be.classList.add("is-good"),be.append(ln[Ze.replaces]?`替换${ln[Ze.replaces].name}，已抵 `:`已用 ${Ze.replaces} 抵扣 `,z("b","sf-num",String(ce.cost-Ze.cost))))',
  ],
  [
    ':Oe.stage==="base"&&Oe.baseId?[re,Te,De]=[`已有${K2(Oe.baseId)}`,"is-have"," · 稍后升级"]',
    ':Oe.stage==="base"?[re,Te,De]=[Oe.baseId?`已有${K2(Oe.baseId)}`:`已凑 ${Oe.ownedParts}/${Oe.totalParts}`,"is-have"," · 可抵扣"]',
  ],
  // K18 前期节奏、回蓝呼吸感与 220ms 技能冷却缓冲（全员公平、保留晋升乐趣）
  [
    'va={startGold:300,passiveGold:3.9,',
    'va={startGold:350,passiveGold:4.5,',
  ],
  [
    'function Z6(n){return n>=15?0:160+60*(n-1)}',
    'function Z6(n){return n>=15?0:n===1?105:n===2?165:n===3?225:160+60*(n-1)}',
  ],
  [
    'if(t.kind==="hero"){t.h.baseLevel!==t.level&&(e.base=f5(t.h.def,t.level),t.h.baseLevel=t.level);',
    'if(t.kind==="hero"){t.level<=5&&(pe.manaRegen+=(6-t.level)*.45),t.h.baseLevel!==t.level&&(e.base=f5(t.h.def,t.level),t.h.baseLevel=t.level);',
  ],
  [
    'if(a.cd>0)return Do(n,t,"cooldown",s);',
    'if(a.cd>0){if(t.isPlayer&&!s&&a.cd<=.22)return t.h.pendingCast=e,t.h.pendingUntil=r+.28,!1;return Do(n,t,"cooldown",s)}',
  ],
  [
    'if(a.pendingCast){const f=a.pendingCast;if(a.pendingCast=null,i<=a.pendingUntil&&(hS(n,t,f,!0),i<o.lockUntil||o.dash!==null))return}',
    'if(a.pendingCast){const f=a.pendingCast;if(i>a.pendingUntil)a.pendingCast=null;else if((t.skills[f.slot]?.cd??0)<=0&&(a.pendingCast=null,hS(n,t,f,!0),i<o.lockUntil||o.dash!==null))return}',
  ],
  // K19 商业 MOBA 音频分层：压低非玩家小兵噪底 + 局内背景音乐独立开关
  [
    'f.kind==="hero"?this.at(ET[kitOf(f.heroId)],f.pos,d?1:.6,{prio:d?2:1}):f.kind==="minion"?(f.minionType==="melee"||f.minionType==="super")&&this.at("minion_swing",f.pos,h?.8:.45,{pitch:f.minionType==="super"?.7:1})',
    'f.kind==="hero"?this.at(ET[kitOf(f.heroId)],f.pos,d?1:.42,{prio:d?2:1}):f.kind==="minion"?(f.minionType==="melee"||f.minionType==="super")&&this.at("minion_swing",f.pos,h?.65:.14,{pitch:f.minionType==="super"?.7:1})',
  ],
  [
    'h.kind==="minion"?h.minionType==="melee"?this.at("minion_melee_hit",c.pos,f?.75:x?.5:.3):h.minionType==="super"&&this.at("super_hit",c.pos,f?.85:x?.6:.4)',
    'h.kind==="minion"?h.minionType==="melee"?this.at("minion_melee_hit",c.pos,f?.65:x?.32:.12):h.minionType==="super"&&this.at("super_hit",c.pos,f?.78:x?.45:.18)',
  ],
  [
    'this.at(h,c.pos,f?1:.7,{prio:f?3:2});break}case"fx":',
    'this.at(h,c.pos,f?1:.5,{prio:f?3:2});break}case"fx":',
  ],
  [
    'const h=d!==void 0&&d.kind==="hero",u=f?1:h?.65:c.visual==="tower_bolt"||c.visual==="core_bolt"?.7:c.visual==="minion_siege"?.5:.38',
    'const h=d!==void 0&&d.kind==="hero",u=f?1:h?.48:c.visual==="tower_bolt"||c.visual==="core_bolt"?.62:c.visual==="minion_siege"?.24:.14',
  ],
  [
    'g=f||d?1:x?p?.5:.32:u?.65:.6',
    'g=f||d?1:x?p?.38:.14:u?.6:.48',
  ],
  [
    'musicVolume:.5,showFps:!1,cameraShake:!0,autoBuy:!0,tutorial:!0,objectiveHints:!0}',
    'musicVolume:.5,battleBgm:!0,showFps:!1,cameraShake:!0,autoBuy:!0,tutorial:!0,objectiveHints:!0}',
  ],
  [
    'typeof e.objectiveHints=="boolean"&&(t.objectiveHints=e.objectiveHints)',
    'typeof e.objectiveHints=="boolean"&&(t.objectiveHints=e.objectiveHints),typeof e.battleBgm=="boolean"&&(t.battleBgm=e.battleBgm)',
  ],
  [
    'g=p("主音量",Vt("volume"),"masterVolume"),y=p("音效",Vt("sfx"),"sfxVolume"),v=p("音乐",Vt("music"),"musicVolume"),_=z("div","sf-settings",z("section","sf-settings__group sf-settings__group--assist",z("h3","sf-heading","对战辅助"),h.row,h.hint,m.row,m.hint,x.row,x.hint),z("section","sf-settings__group",z("h3","sf-heading","画面"),z("div","sf-field",z("span","sf-field__label",_e(Vt("quality")),"画质"),z("span","sf-field__ctl sf-settings__quality",i.el)),s,z("div","sf-field",z("span","sf-field__label",_e(Vt("target")),"镜头视角"),z("span","sf-field__ctl sf-settings__quality",cp.el)),cpHint,fsRow,_fsHint,l.row,c.row,ec.row,ec.hint,cf.row,cf.hint),z("section","sf-settings__group",z("h3","sf-heading","声音"),g.row,y.row,v.row)),k=()=>{const w=n.get();i.set(w.quality),s.textContent=E4[w.quality],cp.set(w.cameraPreset),cpHint.textContent=tsConfig.getCameraPreset(w.cameraPreset).desc,l.toggle.set(w.showFps),c.toggle.set(w.cameraShake),ec.toggle.set(w.eyesCutin!==!1),cf.toggle.set(w.cinematicFlow!==!1),h.toggle.set(w.autoBuy),u(),m.toggle.set(w.objectiveHints),x.toggle.set(w.tutorial||a!==0),g.slider.set(w.masterVolume),g.val.textContent=e(w.masterVolume),y.slider.set(w.sfxVolume),y.val.textContent=e(w.sfxVolume),v.slider.set(w.musicVolume),v.val.textContent=e(w.musicVolume)}',
    'g=p("主音量",Vt("volume"),"masterVolume"),y=p("音效",Vt("sfx"),"sfxVolume"),v=p("音乐",Vt("music"),"musicVolume"),bBgm=r("局内背景音乐",Vt("music"),"battleBgm","对局中以轻音氛围铺底并随团战自动闪避；关闭则局内纯音效。"),_=z("div","sf-settings",z("section","sf-settings__group sf-settings__group--assist",z("h3","sf-heading","对战辅助"),h.row,h.hint,m.row,m.hint,x.row,x.hint),z("section","sf-settings__group",z("h3","sf-heading","画面"),z("div","sf-field",z("span","sf-field__label",_e(Vt("quality")),"画质"),z("span","sf-field__ctl sf-settings__quality",i.el)),s,z("div","sf-field",z("span","sf-field__label",_e(Vt("target")),"镜头视角"),z("span","sf-field__ctl sf-settings__quality",cp.el)),cpHint,fsRow,_fsHint,l.row,c.row,ec.row,ec.hint,cf.row,cf.hint),z("section","sf-settings__group",z("h3","sf-heading","声音"),g.row,y.row,v.row,bBgm.row,bBgm.hint)),k=()=>{const w=n.get();i.set(w.quality),s.textContent=E4[w.quality],cp.set(w.cameraPreset),cpHint.textContent=tsConfig.getCameraPreset(w.cameraPreset).desc,l.toggle.set(w.showFps),c.toggle.set(w.cameraShake),ec.toggle.set(w.eyesCutin!==!1),cf.toggle.set(w.cinematicFlow!==!1),h.toggle.set(w.autoBuy),u(),m.toggle.set(w.objectiveHints),x.toggle.set(w.tutorial||a!==0),g.slider.set(w.masterVolume),g.val.textContent=e(w.masterVolume),y.slider.set(w.sfxVolume),y.val.textContent=e(w.sfxVolume),v.slider.set(w.musicVolume),v.val.textContent=e(w.musicVolume),bBgm.toggle.set(w.battleBgm!==!1)}',
  ],
  [
    'k=()=>v.setVolumes({master:_.masterVolume,sfx:_.sfxVolume,music:_.musicVolume});k();',
    'k=()=>{v.setVolumes({master:_.masterVolume,sfx:_.sfxVolume,music:_.musicVolume});v.music?.setBattleBgmEnabled?.(_.battleBgm!==!1)};k();',
  ],
  // K20 召唤师技能全量更名：「闪现」→「闪身步」
  [
    'flash:{name:"闪现",brief:"朝一个方向瞬移一小段",desc:"向指定方向瞬移一小段距离，可穿越薄墙。",range:5,cooldown:110}',
    'flash:{name:"闪身步",brief:"朝一个方向凌波瞬移一小段",desc:"脚踏闪身步向指定方向瞬移一小段距离，可穿越薄墙。",range:5,cooldown:110}',
  ],
  [
    'cast_flash:At("技能施放","闪现·启动"',
    'cast_flash:At("技能施放","闪身步·启动"',
  ],
  [
    'fx_flash:At("状态与系统","闪现"',
    'fx_flash:At("状态与系统","闪身步"',
  ],
  [
    '<em>F</em> 闪现(朝鼠标) · <em>G</em> 疗伤 · <em>B</em> 回城',
    '<em>F</em> 闪身步(朝鼠标) · <em>G</em> 疗伤 · <em>B</em> 回城',
  ],
  [
    '闪现(可拖动选方向) · 疗伤 · 回城',
    '闪身步(可拖动选方向) · 疗伤 · 回城',
  ],
  [
    'z("span",null,...l("F","G","B"),"闪现 / 疗伤 / 回城")',
    'z("span",null,...l("F","G","B"),"闪身步 / 疗伤 / 回城")',
  ],
  [
    '/* 通用技能键的名字(闪现 / 疗伤 / 回城)：',
    '/* 通用技能键的名字(闪身步 / 疗伤 / 回城)：',
  ],
  // K21 王者风格英文高燃播报语音 + 首杀/连杀公屏公告（带英文大字副标）
  [
    'const MT={first_blood:"第一滴血",double_kill:"双杀",triple_kill:"三连破阵",quadra_kill:"四海惊雷",penta_kill:"五杀，名垂青史",killing_spree:"势如破竹",unstoppable:"锐不可当",legendary:"千古风流",shutdown:"终结连胜",ace:"敌军全灭",victory:"大获全胜",defeat:"败走沙场"},kT=[];function ST(n){const t=n.filter(e=>/^zh([-_]|$)/i.test(e.lang));return t[0]??null}',
    'const MT={first_blood:"First Blood!",double_kill:"Double Kill!",triple_kill:"Triple Kill!",quadra_kill:"Quadra Kill!",penta_kill:"Penta Kill!",killing_spree:"Killing Spree!",unstoppable:"Unstoppable!",legendary:"Legendary!",shutdown:"Shut Down!",ace:"Aced!",victory:"Victory!",defeat:"Defeat!"},kT=[];function ST(n){const e=n.filter(t=>/^en([-_]|$)/i.test(t.lang));if(!e.length)return null;const p=e.find(t=>/Aria|Jenny|Sonia|Libby|Emma|Guy|Google US English|Google UK English|Samantha|Zira|David|Natural/i.test(t.name));return p??e[0]}',
  ],
  [
    'o.lang=this.voice.lang,o.voice=this.voice,o.rate=.92,o.pitch=e?.5:.75,o.volume=this.volume',
    'o.lang=this.voice.lang,o.voice=this.voice,o.rate=.96,o.pitch=e?.88:1.03,o.volume=this.volume',
  ],
  [
    'E2={first_blood:"首杀",double_kill:"双杀",triple_kill:"三杀",quadra_kill:"四杀",penta_kill:"五杀·名垂青史",killing_spree:"锐不可当",unstoppable:"气吞万里",legendary:"千古风流",shutdown:"终结"};',
    'E2={first_blood:"首杀",double_kill:"双杀",triple_kill:"三连决胜",quadra_kill:"四连超凡",penta_kill:"五连绝世",killing_spree:"锋芒毕露",unstoppable:"天下无双",legendary:"超神",shutdown:"终结"};const _tsAnnEn={first_blood:"FIRST BLOOD",double_kill:"DOUBLE KILL",triple_kill:"TRIPLE KILL",quadra_kill:"QUADRA KILL",penta_kill:"PENTA KILL",killing_spree:"KILLING SPREE",unstoppable:"UNSTOPPABLE",legendary:"LEGENDARY",shutdown:"SHUT DOWN",ace:"ACE",victory:"VICTORY",defeat:"DEFEAT"};',
    'E2={first_blood:"首杀",double_kill:"双杀",triple_kill:"三连决胜",quadra_kill:"四连超凡",penta_kill:"五连绝世",killing_spree:"锋芒毕露",unstoppable:"天下无双",legendary:"超神",shutdown:"终结"};const _tsAnnEn={first_blood:"FIRST BLOOD",double_kill:"DOUBLE KILL",triple_kill:"TRIPLE KILL",quadra_kill:"QUADRA KILL",penta_kill:"PENTA KILL",killing_spree:"KILLING SPREE",unstoppable:"UNSTOPPABLE",legendary:"LEGENDARY",shutdown:"SHUT DOWN",ace:"ACED",victory:"VICTORY",defeat:"DEFEAT"};',
  ],
  [
    'p4={match_start:1,minions_spawn:1,super_minions:2,epic_spawn:2,first_blood:3,',
    'p4={match_start:1,minions_spawn:1,super_minions:2,epic_spawn:2,first_blood:4,',
  ],
  [
    'z("div","sf-hud__banner-text",z("div","sf-hud__banner-title sf-metal",p.title),p.sub?z("div","sf-hud__banner-sub",...p.sub):null)',
    'z("div","sf-hud__banner-text",p.en?z("div","ts-banner-en sf-metal",p.en):null,z("div","sf-hud__banner-title sf-metal",p.title),p.sub?z("div","sf-hud__banner-sub",...p.sub):null)',
    'z("div","sf-hud__banner-text",z("div","sf-hud__banner-title sf-metal",p.title),p.en?z("div","ts-banner-en",p.en):null,p.sub?z("div","sf-hud__banner-sub",...p.sub):null)',
  ],
  [
    'ight?"":" is-noface"}${p.wide?" is-wide":""}`',
    'ight?"":" is-noface"}${p.wide?" is-wide":""}${p.en?" has-en":""}`',
  ],
  [
    'if(!g&&(!k||v.isPlayer))return null;const M=Na(y.host,v,y.team,"is-dead");if(!_){const C=y.unit(p.killerId)?.kind,R=C==="tower"||C==="core"?"防御塔":C==="monster"?"野怪":C==="minion"?"小兵":"战场",I=Vt(C==="tower"||C==="core"?"tower":C==="monster"?"monster":"cs"),P=v.team===0?1:0;return{tier:2,tone:v.team===y.team?"foe":"ally",title:"助攻",sub:[h(v,y),`被${R}击杀`],left:Rl(I,Dl(P,y.team)),right:M,slain:!0}}const S=_.team===y.team?"ally":"foe",b=g?.key??null;let w=b?E2[b]??"击杀":_.isPlayer?"击杀":"助攻",T=b?p4[b]:2,E;return b==="shutdown"?E=[h(_,y),"终结了",h(v,y),"的连杀"]:b==="killing_spree"||b==="unstoppable"||b==="legendary"?E=[h(_,y),`已连续击杀 ${p.streak} 人`]:E=[h(_,y),"击杀了",h(v,y)],b==="legendary"&&p.streak>7&&(w=`${w}·${p.streak}连杀`),_.isPlayer&&T<4&&b&&(T=T+1),_.isPlayer&&p.bounty>0&&E.push(z("span","is-gold",_e(Vt("gold")),`+${Math.round(p.bounty)}`)),{tier:T,tone:S,title:w,sub:E,left:Na(y.host,_,y.team),right:M,slain:!0}',
    'const M=Na(y.host,v,y.team,"is-dead");if(!_){if(!g&&(!k||v.isPlayer))return null;const C=y.unit(p.killerId)?.kind,R=C==="tower"||C==="core"?"防御塔":C==="monster"?"野怪":C==="minion"?"小兵":"战场",I=Vt(C==="tower"||C==="core"?"tower":C==="monster"?"monster":"cs"),P=v.team===0?1:0;return{tier:2,tone:v.team===y.team?"foe":"ally",title:"助攻",en:null,sub:[h(v,y),`被${R}击杀`],left:Rl(I,Dl(P,y.team)),right:M,slain:!0}}const S=_.team===y.team?"ally":"foe",b=g?.key??null;if(!g&&!k)return{tier:1,tone:S,title:"击败",en:S==="ally"?"ENEMY SLAIN":"ALLY SLAIN",sub:[h(_,y),"击杀了",h(v,y)],left:Na(y.host,_,y.team),right:M,slain:!0};let w=b?E2[b]??"击杀":_.isPlayer?"击杀":"助攻",T=b?p4[b]:2,E;return b==="shutdown"?E=[h(_,y),"终结了",h(v,y),"的连杀"]:b==="killing_spree"||b==="unstoppable"||b==="legendary"?E=[h(_,y),`已连续击杀 ${p.streak} 人`]:E=[h(_,y),"击杀了",h(v,y)],b==="legendary"&&p.streak>7&&(w=`${w}·${p.streak}连杀`),_.isPlayer&&T<4&&b&&(T=T+1),_.isPlayer&&p.bounty>0&&E.push(z("span","is-gold",_e(Vt("gold")),`+${Math.round(p.bounty)}`)),{tier:T,tone:S,title:w,en:b?(_tsAnnEn[b]??null):(_.isPlayer?"ELIMINATED":null),sub:E,left:Na(y.host,_,y.team),right:M,slain:!0}',
  ],
  [
    'case"ace":return{...M,title:"团灭",sub:[y?"敌方全员阵亡，趁现在推塔！":"我方全员阵亡，守住玉玺！"]};case"victory":case"defeat":return{...M,title:y?"敌方玉玺已摧毁":"我方玉玺被摧毁",sub:[y?"我方获胜":"敌方获胜"]};',
    'case"ace":return{...M,title:"团灭",en:_tsAnnEn.ace,sub:[y?"敌方全员阵亡，趁现在推塔！":"我方全员阵亡，守住玉玺！"]};case"victory":case"defeat":return{...M,title:y?"敌方玉玺已摧毁":"我方玉玺被摧毁",en:y?_tsAnnEn.victory:_tsAnnEn.defeat,sub:[y?"我方获胜":"敌方获胜"]};',
  ],
  [
    'default:{const E=E2[p.key];if(!E)return null;const A=p.victimId!==void 0?g.hero(p.victimId):void 0;return{...M,title:E,sub:k&&A?[h(k,g),"击杀了",h(A,g)]:null,left:k?Na(g.host,k,g.team):null,right:A?Na(g.host,A,g.team,"is-dead"):null,slain:!!A}}',
    'default:{const E=E2[p.key];if(!E)return null;const A=p.victimId!==void 0?g.hero(p.victimId):void 0;return{...M,title:E,en:_tsAnnEn[p.key]??null,sub:k&&A?[h(k,g),"击杀了",h(A,g)]:null,left:k?Na(g.host,k,g.team):null,right:A?Na(g.host,A,g.team,"is-dead"):null,slain:!!A}}',
  ],
  // K22 大胆高燃技能打击感与硬控反馈（击飞/眩晕/石化/墨封/击退/聚拢 + 3D 抛空悬停 + 飘字 + 微顿帧）
  [
    'function Gj(n,t,e,s){return Wn(n,t,"stun",{duration:e,sourceId:s?s.id:-1})!==null}function yS(n,t,e,s){return Wn(n,t,"airborne",{duration:e,sourceId:s?s.id:-1})!==null}',
    'function Gj(n,t,e,s,cc="stun"){const r=Wn(n,t,"stun",{duration:e,sourceId:s?s.id:-1})!==null;return r&&t.kind==="hero"&&ds(n,"cc_impact",t.pos,s?s.team:t.team,{unitId:s?s.id:-1,targetId:t.id,cc}),r}function yS(n,t,e,s){const r=Wn(n,t,"airborne",{duration:e,sourceId:s?s.id:-1})!==null;return r&&t.kind==="hero"&&ds(n,"cc_impact",t.pos,s?s.team:t.team,{unitId:s?s.id:-1,targetId:t.id,cc:"airborne"}),r}',
    'function Gj(n,t,e,s){const r=Wn(n,t,"stun",{duration:e,sourceId:s?s.id:-1})!==null;return r&&t.kind==="hero"&&ds(n,"cc_impact",t.pos,s?s.team:t.team,{unitId:s?s.id:-1,targetId:t.id,cc:"stun"}),r}function yS(n,t,e,s){const r=Wn(n,t,"airborne",{duration:e,sourceId:s?s.id:-1})!==null;return r&&t.kind==="hero"&&ds(n,"cc_impact",t.pos,s?s.team:t.team,{unitId:s?s.id:-1,targetId:t.id,cc:"airborne"}),r}',
  ],
  [
    'function Yj(n,t,e,s,i=14){const a=e.x-t.pos.x,o=e.y-t.pos.y,r=Math.hypot(a,o);return r<.05?!1:dW(n,t,a,o,Math.min(s,r),i)}',
    'function Yj(n,t,e,s,i=14){const a=e.x-t.pos.x,o=e.y-t.pos.y,r=Math.hypot(a,o);if(r<.05)return!1;const ok=dW(n,t,a,o,Math.min(s,r),i);return ok&&t.kind==="hero"&&ds(n,"cc_impact",t.pos,t.team,{unitId:-1,targetId:t.id,cc:"pull",dx:a,dy:o}),ok}function _tsKb(n,t,e,s,i=15,c){if(!t||!t.alive)return!1;let a=t.pos.x-e.x,o=t.pos.y-e.y;const r=Math.hypot(a,o);r<.05?(a=c?Math.cos(c.facing):1,o=c?Math.sin(c.facing):0):(a/=r,o/=r);const ok=dW(n,t,a,o,s,i);return ok&&t.kind==="hero"&&ds(n,"cc_impact",t.pos,c?c.team:t.team,{unitId:c?c.id:-1,targetId:t.id,cc:"knockback",dx:a,dy:o}),ok}',
  ],
  [
    'ds(t,"panyue_s1_impact",e.pos,e.team,{unitId:e.id,radius:a});for(const r of Pr(t,e.pos,a,s))wo(n,r,o,"physical"),yS(t,r,n.val("knockup"),e)}})}});Oi("panyue","s2"',
    'ds(t,"panyue_s1_impact",e.pos,e.team,{unitId:e.id,radius:a}),ds(t,"skill_spectacle",e.pos,e.team,{unitId:e.id,style:"panyue_slam",radius:a});for(const r of Pr(t,e.pos,a,s))wo(n,r,o,"physical"),yS(t,r,Math.max(.85,n.val("knockup")),e),_tsKb(t,r,e.pos,1.8,14,e)}})}});Oi("panyue","s2"',
  ],
  [
    'for(const o of Pr(t,e.pos,n.radius,ia(e.team)))wo(n,o,a,"magic"),tr(t,o,n.val("slow"),n.val("slowDur"),e,"panyue_s2")}});',
    'for(const o of Pr(t,e.pos,n.radius,ia(e.team)))wo(n,o,a,"magic"),tr(t,o,n.val("slow"),n.val("slowDur"),e,"panyue_s2"),o.alive&&(_tsKb(t,o,e.pos,2.1,15,e),Math.hypot(o.pos.x-e.pos.x,o.pos.y-e.pos.y)<2.7&&Gj(t,o,.35,e))}});',
  ],
  [
    'ds(t,"panyue_ult_land",f,e.team,{unitId:e.id,radius:n.radius});for(const h of Pr(t,f,n.radius,a))wo(n,h,d,"physical"),yS(t,h,n.val("knockup"),e);',
    'ds(t,"panyue_ult_land",f,e.team,{unitId:e.id,radius:n.radius}),ds(t,"skill_spectacle",f,e.team,{unitId:e.id,style:"panyue_ult",radius:n.radius});for(const h of Pr(t,f,n.radius,a))wo(n,h,d,"physical"),yS(t,h,Math.max(1.05,n.val("knockup")),e),_tsKb(t,h,f,1.6,13,e);',
  ],
  [
    'ds(t,"chijin_s1_slash",e.pos,e.team,{unitId:e.id,dir:Cs(n.dir),radius:n.range,angle:n.angle});for(const i of $j(t,e.pos,n.dir,n.range,n.angle,ia(e.team)))wo(n,i,s,"physical"),tr(t,i,n.val("slow"),n.val("slowDur"),e,"chijin_s1")',
    'ds(t,"chijin_s1_slash",e.pos,e.team,{unitId:e.id,dir:Cs(n.dir),radius:n.range,angle:n.angle}),ds(t,"skill_spectacle",e.pos,e.team,{unitId:e.id,style:"chijin_wave",dir:Cs(n.dir),radius:n.range});for(const i of $j(t,e.pos,n.dir,n.range,n.angle,ia(e.team)))wo(n,i,s,"physical"),tr(t,i,n.val("slow"),n.val("slowDur"),e,"chijin_s1"),i.alive&&_tsKb(t,i,e.pos,2.0,15,e)',
  ],
  [
    'hitRadius:n.width*.5,filter:ia(e.team),onHit(i){wo(n,i,oa(n,"damage",{ad:"adRatio"}),"physical")}})}});Oi("chijin","ult"',
    'hitRadius:n.width*.5,filter:ia(e.team),onHit(i){wo(n,i,oa(n,"damage",{ad:"adRatio"}),"physical"),i.alive&&i.kind==="hero"&&yS(t,i,.45,e)}})}});Oi("chijin","ult"',
  ],
  [
    'ds(l,"chijin_ult_tick",c.pos,e.team,{unitId:e.id,radius:c.radius});for(const d of Pr(l,c.pos,c.radius,o))wo(n,d,f,"physical");Jj(l,e)',
    'ds(l,"chijin_ult_tick",c.pos,e.team,{unitId:e.id,radius:c.radius}),r===a&&ds(l,"skill_spectacle",c.pos,e.team,{unitId:e.id,style:"chijin_finisher",radius:c.radius});for(const d of Pr(l,c.pos,c.radius,o))wo(n,d,f,"physical"),r===a&&d.alive&&(_tsKb(l,d,c.pos,2.4,16,e),yS(l,d,.45,e));Jj(l,e)',
  ],
  [
    'onHit(i,a,o){zh(i,e,o,s,"magic",n.slot)}})})}});Oi("xingli","s2"',
    'onHit(i,a,o){zh(i,e,o,s,"magic",n.slot),o.alive&&o.kind==="hero"&&_tsKb(i,o,e.pos,1.4,13,e)}})})}});Oi("xingli","s2"',
  ],
  [
    'for(const c of Pr(a,o.pos,o.radius,ia(e.team)))wo(n,c,l,"magic"),c.alive&&(Yj(a,c,o.pos,n.val("pull")),tr(a,c,n.val("slow"),n.val("slowDur"),e,"xingli_s2"))',
    'ds(a,"skill_spectacle",o.pos,e.team,{unitId:e.id,style:"xingli_vortex",radius:o.radius});for(const c of Pr(a,o.pos,o.radius,ia(e.team)))wo(n,c,l,"magic"),c.alive&&(Yj(a,c,o.pos,n.val("pull")),yS(a,c,.55,e),tr(a,c,n.val("slow"),n.val("slowDur"),e,"xingli_s2"))',
  ],
  [
    'for(const r of Pr(a,e,s,ia(t.team)))wo(n,r,o,"magic"),tr(a,r,n.val("slow"),n.val("slowDur"),t,"xingli_ult")',
    'ds(a,"skill_spectacle",e,t.team,{unitId:t.id,style:"xingli_wave",radius:s});for(const r of Pr(a,e,s,ia(t.team)))wo(n,r,o,"magic"),tr(a,r,n.val("slow"),n.val("slowDur"),t,"xingli_ult")',
  ],
  [
    'onHit(i,a,o){return o.kind!=="hero"?(zh(i,e,o,s*n.val("minionRatio"),"physical",n.slot),!1):(zh(i,e,o,s,"physical",n.slot),tr(i,o,n.val("slow"),n.val("slowDur"),e,"fengling_s1"),!0)}',
    'onHit(i,a,o){return o.kind!=="hero"?(zh(i,e,o,s*n.val("minionRatio"),"physical",n.slot),!1):(zh(i,e,o,s,"physical",n.slot),tr(i,o,n.val("slow"),n.val("slowDur"),e,"fengling_s1"),o.alive&&(_tsKb(i,o,e.pos,2.4,16,e),Gj(i,o,.5,e),ds(i,"skill_spectacle",o.pos,e.team,{unitId:e.id,style:"fengling_pierce",dir:Cs(n.dir)})),!0)}',
  ],
  [
    'ds(t,"fengling_s2_dash",s,e.team,{unitId:e.id,from:s,to:by(t,e,n.dir,n.range),dir:Cs(n.dir)}),Hm(t,e,',
    'for(const _ch of Pr(t,s,3.2,ia(e.team)))_tsKb(t,_ch,s,2.2,16,e);ds(t,"fengling_s2_dash",s,e.team,{unitId:e.id,from:s,to:by(t,e,n.dir,n.range),dir:Cs(n.dir)}),Hm(t,e,',
  ],
  [
    'ds(t,"fengling_ult_tick",u.pos,e.team,{unitId:e.id,radius:u.radius});for(const x of Pr(t,u.pos,u.radius,ia(e.team)))wo(n,x,m,"physical"),tr(t,x,n.val("slow"),n.val("slowDur"),e,"fengling_ult")',
    'ds(t,"fengling_ult_tick",u.pos,e.team,{unitId:e.id,radius:u.radius}),f===1&&ds(t,"skill_spectacle",u.pos,e.team,{unitId:e.id,style:"fengling_rain",radius:u.radius});for(const x of Pr(t,u.pos,u.radius,ia(e.team)))wo(n,x,m,"physical"),f===1&&x.alive&&x.kind==="hero"&&yS(t,x,.45,e),tr(t,x,n.val("slow"),n.val("slowDur"),e,"fengling_ult")',
  ],
  [
    'onHit(a){const o=a.kind==="hero";wo(n,a,oa(n,"damage",{ad:"adRatio"}),"physical"),o&&!i&&(i=!0,tq(e,"s1",n.val("refund")))}',
    'onHit(a){const o=a.kind==="hero";wo(n,a,oa(n,"damage",{ad:"adRatio"}),"physical"),o&&a.alive&&(Gj(t,a,.35,e),_tsKb(t,a,e.pos,1.5,14,e)),o&&!i&&(i=!0,tq(e,"s1",n.val("refund")))}',
  ],
  [
    'onHit(f,d,h){const u=r.has(h.id)?n.val("repeatRatio"):1;r.add(h.id),zh(f,e,h,s*u,"physical",n.slot),tr(f,h,n.val("slow"),n.val("slowDur"),e,"yeque_s2")}',
    'onHit(f,d,h){const _rep=r.has(h.id),u=_rep?n.val("repeatRatio"):1;r.add(h.id),zh(f,e,h,s*u,"physical",n.slot),_rep&&h.alive&&h.kind==="hero"&&Gj(f,h,.55,e),tr(f,h,n.val("slow"),n.val("slowDur"),e,"yeque_s2")}',
  ],
  [
    'ds(t,"yeque_ult_strike",s.pos,e.team,{unitId:e.id,targetId:s.id,from:i,to:r});const l=oa(n,"damage",{ad:"adRatio"})+n.val("missingRatio")*(s.stats.maxHp-s.hp);wo(n,s,l,"physical")',
    'ds(t,"yeque_ult_strike",s.pos,e.team,{unitId:e.id,targetId:s.id,from:i,to:r}),ds(t,"skill_spectacle",s.pos,e.team,{unitId:e.id,style:"yeque_cross",targetId:s.id});const l=oa(n,"damage",{ad:"adRatio"})+n.val("missingRatio")*(s.stats.maxHp-s.hp);wo(n,s,l,"physical"),s.alive&&yS(t,s,.65,e)',
  ],
  [
    'D.mode=O.mode,Q.anim==="leap"?D.lift=4*3.4*O.p*(1-O.p):Q.anim==="airborne"?D.lift=4*Math.min(2.2,Math.max(.8,Q.animDur*1.7))*O.p*(1-O.p):D.lift=0',
    'D.mode=O.mode;const _tsVs=Q.kind==="hero"?tsConfig.skillsEx?.computeUnitVisualState?.(Q,V):null;D.tsCcState=_tsVs?_tsVs.ccState:"";D.tsFlightKind=_tsVs?_tsVs.flightKind:"";D.tsFlightLift=_tsVs?_tsVs.flightLift:0;Q.anim==="leap"?D.lift=Math.pow(Math.max(0,4*O.p*(1-O.p)),.72)*4.65:Q.anim==="airborne"?D.lift=Math.pow(Math.max(0,4*O.p*(1-O.p)),.78)*Math.min(3.1,Math.max(1.35,Q.animDur*2.8)):D.lift=0;D.tsFlightLift>0&&(D.lift=Math.max(D.lift,D.tsFlightLift))',
    'D.mode=O.mode,Q.anim==="leap"?D.lift=4*3.4*O.p*(1-O.p):Q.anim==="airborne"?D.lift=Math.pow(Math.max(0,4*O.p*(1-O.p)),.78)*Math.min(3.1,Math.max(1.35,Q.animDur*2.8)):D.lift=0',
  ],
  [
    'ot.moveBlend=D.moveBlend;ot.upperTwist=_tw}else{D.moveBlend=0;ot.moveBlend=0;ot.upperTwist=0}',
    'ot.moveBlend=D.moveBlend;ot.upperTwist=_tw}else{D.moveBlend=0;ot.moveBlend=0;ot.upperTwist=0}ot.anim==="airborne"&&(_ry+=ot.p*Math.PI*1.15);',
  ],
  [
    'case"levelUp":{if(this.hidden(s.unit(o.unitId),a))break;const r=this.spawn(o.unitId,s,0,0,Al.gold,"",1,1,!1);r&&(r.sprite=this.text.get(`升级 Lv.${o.level}`,17,"#ffe58a","rgba(60,34,0,0.95)",800),r.life=1.5,r.oy-=34);break}}}',
    'case"levelUp":{if(this.hidden(s.unit(o.unitId),a))break;const r=this.spawn(o.unitId,s,0,0,Al.gold,"",1,1,!1);r&&(r.sprite=this.text.get(`升级 Lv.${o.level}`,17,"#ffe58a","rgba(60,34,0,0.95)",800),r.life=1.5,r.oy-=34);break}case"fx":{if((o.key==="cc_impact"||o.key==="skill_spectacle")&&o.cc&&o.targetId!==void 0){const _u=s.unit(o.targetId);if(_u&&!this.hidden(_u,a)){const _cp=tsConfig.impact?.getCcPopup?.(o.cc);if(_cp){const _r=this.spawn(o.targetId,s,o.pos?.x??0,o.pos?.y??0,Al.gold,"",1.08,1,!1);_r&&(_r.sprite=this.text.get(_cp.text,_cp.size,_cp.color,_cp.stroke,900),_r.life=1.15,_r.oy-=46)}}}break}}}',
  ],
  [
    'x=y=>{const v=$D[y.key];v&&v(t,y,o)}',
    'x=y=>{if(y.key==="cc_impact"||y.key==="skill_spectacle"){tsConfig.impact?.playImpactFx?.(t,y,o,{qo,bn,Lr,Ni,H0,U0,jo,vs,Lt,Mt,Xt,Ft,oe,qe,sn,$n});return}if(y.key==="petrify_break"){tsConfig.skillsEx?.playPetrifyBreak?.(t,y,{Lt,Mt,Xt,Ft,oe,qe,sn,$n,bn,vs});return}if(y.key==="ink_break"){tsConfig.skillsEx?.playInkSealBreak?.(t,y,{Lt,Mt,Xt,Ft,oe,qe,sn,$n,bn,vs});return}const v=$D[y.key];v&&v(t,y,o)}',
    'x=y=>{if(y.key==="cc_impact"||y.key==="skill_spectacle"){tsConfig.impact?.playImpactFx?.(t,y,o,{qo,bn,Lr,Ni,H0,U0,jo,vs,Lt,Mt,Xt,Ft,oe});return}const v=$D[y.key];v&&v(t,y,o)}',
  ],
  [
    'case"damage":if(y.dtype==="magic"&&t.focusDist(y.pos.x,y.pos.y)<=Jr){const _=t.anchors.unit(y.sourceId);_&&_.kind==="monster"&&_.monsterType==="abyss_drake"&&PP(t,y.sourceId,y.targetId)}break',
    'case"damage":if(y.crit&&(y.sourceId===o.playerId||y.targetId===o.playerId))tsConfig.impact?.triggerHitStop?.(.036);if(y.dtype==="magic"&&t.focusDist(y.pos.x,y.pos.y)<=Jr){const _=t.anchors.unit(y.sourceId);_&&_.kind==="monster"&&_.monsterType==="abyss_drake"&&PP(t,y.sourceId,y.targetId)}break',
  ],
  [
    'onFx(t,e,s,i,a){const o=`fx_${t.key}`,r=t.unitId===s||t.targetId===s;switch(t.key){case"level_up":',
    'onFx(t,e,s,i,a){const o=`fx_${t.key}`,r=t.unitId===s||t.targetId===s;switch(t.key){case"skill_spectacle":case"ink_break":return;case"cc_impact":if(t.cc==="petrify"||t.cc==="ink_seal"||!r1[o])return;break;case"petrify_hit":case"petrify_break":case"ink_seal":case"qinggong_soar":if(!r1[o])return;break;case"level_up":',
    'onFx(t,e,s,i,a){const o=`fx_${t.key}`,r=t.unitId===s||t.targetId===s;switch(t.key){case"skill_spectacle":return;case"cc_impact":if(!r1[o])return;break;case"level_up":',
  ],
  // K23 瑶池仙雾泉水结界 + 治疗速度翻倍(24%/s) + 双掌抵背内力运功 + 头顶翠绿 +++ 浮字
  [
    'Xm={regenRatio:.12,enemyDamageRatio:.2}',
    'Xm={regenRatio:.24,enemyDamageRatio:.2}',
  ],
  [
    'const _tsWild=tsConfig.createWildlife?.({Be,Ji,Sn,Qc,gn,yt,ke,mapSdf:r,waterLevel:Fn})??null;_tsWild&&(d.add(_tsWild.group),e.wildlife=_tsWild.count);',
    'const _tsWild=tsConfig.createWildlife?.({Be,Ji,Sn,Qc,gn,yt,ke,mapSdf:r,waterLevel:Fn})??null;_tsWild&&(d.add(_tsWild.group),e.wildlife=_tsWild.count);const _tsFnt=tsConfig.createFountainSanctuary?.({Ji,Sn,Qc,gn,yt,Gl,uf,yM,Z7,fi,map:o})??null;_tsFnt&&d.add(_tsFnt.group);',
  ],
  [
    'mt.setFountainAlert(0,Z[0]),mt.setFountainAlert(1,Z[1]),_tsWild?.update?.(j.dt)',
    'mt.setFountainAlert(0,Z[0]),mt.setFountainAlert(1,Z[1]),_tsWild?.update?.(j.dt),_tsFnt?.update?.(j.dt,Rt,j.playerTeam,n.unitQuery,N)',
  ],
  [
    'D.setQuality(j),ct(j)},resize:J,dispose(){_tsWild?.dispose?.(),jM(d)',
    'D.setQuality(j),_tsFnt?.setQuality?.(j),ct(j)},resize:J,dispose(){_tsWild?.dispose?.(),_tsFnt?.dispose?.(),jM(d)',
  ],
  [
    'fountain:{update(n,t,e,s,i){const a=Fa(e.unit?e.unit.team:2);for(let o=oi(n,t,i,8);o>0;o--){const r=n.rnd.next()*oe;n.particles.use(Mt.glint).tint(a.glow,a.deep).spawn(e.x+Math.cos(r)*(e.radius+.3),e.y+.1,e.z+Math.sin(r)*(e.radius+.3),0,n.rnd.range(1,2.2),0,.9,.32,.08)}}},',
    'fountain:{create(n,t,e){const s=Ks(n,t,Xt.rune,.25);n.decals.at(s).params(6,1.2).color(Qg,1.25,.85).under(sz,.25)},update(n,t,e,s,i){n.decals.at(t.slots[0])?.at(e.x,e.z).radius(e.radius+1.15);const u=e.unit,act=!!u&&(u.hp<u.stats.maxHp*.995||u.mana<u.stats.maxMana*.995);act&&(Math.floor(t.age/.52)!==Math.floor((t.age-i)/.52)||t.age<=i)&&n.glow.spawn(qe.hoop,sn.hoop,.65).at(e.x,e.y+.25,e.z).vel(0,2.4,0).scale(e.radius+.45,e.radius+.18).color(Qg,1.1,.92).fade(.12,.45).opt(.32,2.2,1);const a=Fa(u?u.team:2);for(let o=oi(n,t,i,act?16:6);o>0;o--){const r=n.rnd.next()*oe,d=n.rnd.range(.4,e.radius+.55);act&&n.rnd.chance(.52)?n.particles.use(Mt.plus).tint(Lt(0x66ffb3),Lt(0x28c87a)).spawn(e.x+Math.cos(r)*d,e.y+n.rnd.range(.5,1.45),e.z+Math.sin(r)*d,0,n.rnd.range(1.1,2.1),0,.85,.28,.45):n.particles.use(Mt.glint).tint(act?Qg:a.glow,act?sz:a.deep).spawn(e.x+Math.cos(r)*(e.radius+.3),e.y+.1,e.z+Math.sin(r)*(e.radius+.3),0,n.rnd.range(1,2.2),0,.9,.32,.08)}}},',
  ],
  [
    'draw(t,e,s,i,a,o,r,l){if(this.now+=e,this.heals.size>0)',
    'draw(t,e,s,i,a,o,r,l){if(this.now+=e,tsConfig.fountain?.tickPopups?.(this,e,s,i),this.heals.size>0)',
  ],
  // K24 手机端可折叠小地图（默认紧凑半面积，轻点放大 / 再点收起）
  [
    'a.addEventListener("lostpointercapture",N=>{N.target===a&&Q(N)});const $=()=>{h=!0};window.addEventListener("resize",$);',
    'a.addEventListener("lostpointercapture",N=>{N.target===a&&Q(N)});const _tsMiniClean=tsConfig.enhanceMinimap?.(a,tt);const $=()=>{h=!0};window.addEventListener("resize",$);',
  ],
  [
    'dispose(){tt(),ut?.disconnect(),window.removeEventListener("resize",$),p.clear(),g.clear()}',
    'dispose(){_tsMiniClean?.(),tt(),ut?.disconnect(),window.removeEventListener("resize",$),p.clear(),g.clear()}',
  ],
  // K25 三大轻功飞天（花蕊御剑飞越薄墙 + 文成敦煌飞天 + 辛弃疾高空三影）与刘娥石化 / 苏轼墨封事件分流
  [
    'fj(n,e,s),ds(n,"xingli_passive_burst",e.pos,t.team,{unitId:t.id,targetId:e.id});let i=e.stats.maxHp*Ic.hpRatio;e.kind!=="hero"&&(i=Math.min(i,Ic.cap)),Gj(n,e,Ic.stun,t),gS(n,t,e,i,"magic")',
    'const _isLiue=t.heroId==="liue",_cc=_isLiue?"petrify":"ink_seal",_tid=e.id,_tpos=Cs(e.pos),_tm=t.team;fj(n,e,s),ds(n,"xingli_passive_burst",e.pos,_tm,{unitId:t.id,targetId:_tid});let i=e.stats.maxHp*Ic.hpRatio;e.kind!=="hero"&&(i=Math.min(i,Ic.cap));const _ok=Gj(n,e,Ic.stun,t,_cc);_ok&&(Wn(n,e,_isLiue?"ts_petrify":"ts_ink_seal",{duration:Ic.stun,sourceId:t.id,merge:"replace",onExpire(){ds(n,_isLiue?"petrify_break":"ink_break",e.alive?e.pos:_tpos,_tm,{unitId:t.id,targetId:_tid})}}),ds(n,_isLiue?"petrify_hit":"ink_seal",_tpos,_tm,{unitId:t.id,targetId:_tid})),gS(n,t,e,i,"magic")',
  ],
  [
    'ds(t,"fengling_ult_cast",e.pos,e.team,{unitId:e.id}),Zo(t,{visual:"telegraph",owner:e,pos:s',
    'Wn(t,e,"ts_qinggong_wencheng",{duration:1.85,sourceId:e.id,merge:"replace"}),ds(t,"fengling_ult_cast",e.pos,e.team,{unitId:e.id,targetPos:s}),ds(t,"qinggong_soar",e.pos,e.team,{unitId:e.id}),Zo(t,{visual:"telegraph",owner:e,pos:s',
  ],
  [
    'ds(t,"yeque_ult_vanish",i,e.team,{unitId:e.id,targetId:s.id}),Wn(t,e,"untargetable"',
    'ds(t,"yeque_ult_vanish",i,e.team,{unitId:e.id,targetId:s.id}),ds(t,"qinggong_soar",i,e.team,{unitId:e.id}),Wn(t,e,"untargetable"',
  ],
  [
    'ds(t,"chijin_ult_start",e.pos,e.team,{unitId:e.id}),Wn(t,e,"chijin_spin",{duration:s,sourceId:e.id,merge:"replace"})',
    'const _flyDrop=()=>{e.alive&&!t.nav.isFree(e.pos.x,e.pos.y,e.rt.navR)&&hy(t,e,e.pos.x,e.pos.y)};ds(t,"chijin_ult_start",e.pos,e.team,{unitId:e.id}),ds(t,"qinggong_soar",e.pos,e.team,{unitId:e.id}),Wn(t,e,"chijin_spin",{duration:s,sourceId:e.id,merge:"replace",onExpire:_flyDrop,onRemove:_flyDrop})',
  ],
  [
    'function cW(n,t,e){const s=t.rt;if(s.moveMode===Jh){const i=t.stats.moveSpeed*e,a=t.pos.x,o=t.pos.y;n.nav.moveWithCollision(t.pos,s.dirX*i,s.dirY*i,s.navR),t.facing=Math.atan2(s.dirY,s.dirX);const r=t.pos.x-a,l=t.pos.y-o,c=r*r+l*l;c>1e-10&&(s.moved=!0),c<i*i*b6*b6&&lW(n,t,i)&&(s.moved=!0)}else s.moveMode===Fm&&(s.path===null&&Ph(n,t,s.goalX,s.goalY,!1),Yk(n,t,e)||(s.moveMode=Qh))}function dy(n,t,e,s,i){const a=t.rt,o=n.state.time,r=e-a.goalX,l=s-a.goalY,c=o-a.pathTime,f=a.path;if(f===null){if(c<v6)return;Ph(n,t,e,s,!1)}else c>2||c>=v6&&r*r+l*l>y6*y6?Ph(n,t,e,s,!1):f.length===1&&a.pathIdx===0&&(f[0].x=e,f[0].y=s);Yk(n,t,i)}function Kk(n,t,e,s,i){const a=e-t.pos.x,o=s-t.pos.y,r=Math.hypot(a,o);if(r<.05)return!1;const l=Math.min(r,t.stats.moveSpeed*i),c=t.pos.x,f=t.pos.y;n.nav.moveWithCollision(t.pos,a/r*l,o/r*l,t.rt.navR);const d=t.pos.x-c,h=t.pos.y-f;return d*d+h*h>1e-10?(t.facing=Math.atan2(o,a),t.rt.moved=!0,!0):!1}',
    'function _tsCanFly(t){if(t.kind!=="hero")return!1;for(let i=0;i<t.buffs.length;i++)if(t.buffs[i].id==="chijin_spin")return!0;return!1}function _tsFlyStep(n,t,dx,dy){const nx=t.pos.x+dx,ny=t.pos.y+dy,lim=(n.map?.bound??48)-t.rt.navR-.9;if(Math.abs(nx)>lim||Math.abs(ny)>lim)return!1;if(n.nav.sample(n.nav.base,nx,ny)<-6.5)return!1;return t.pos.x=nx,t.pos.y=ny,!0}function cW(n,t,e){const s=t.rt;if(s.moveMode===Jh){const i=t.stats.moveSpeed*e,a=t.pos.x,o=t.pos.y;(_tsCanFly(t)&&_tsFlyStep(n,t,s.dirX*i,s.dirY*i))||n.nav.moveWithCollision(t.pos,s.dirX*i,s.dirY*i,s.navR),t.facing=Math.atan2(s.dirY,s.dirX);const r=t.pos.x-a,l=t.pos.y-o,c=r*r+l*l;c>1e-10&&(s.moved=!0),!_tsCanFly(t)&&c<i*i*b6*b6&&lW(n,t,i)&&(s.moved=!0)}else if(s.moveMode===Fm){if(_tsCanFly(t)){const dx=s.goalX-t.pos.x,dy=s.goalY-t.pos.y,dist=Math.hypot(dx,dy);if(dist<=.15)s.path=null,s.moveMode=Qh;else{const step=Math.min(dist,t.stats.moveSpeed*e),ux=dx/dist,uy=dy/dist;_tsFlyStep(n,t,ux*step,uy*step)||n.nav.moveWithCollision(t.pos,ux*step,uy*step,s.navR),t.facing=Math.atan2(uy,ux),s.moved=!0;if(dist<=step+.15)s.path=null,s.moveMode=Qh}}else s.path===null&&Ph(n,t,s.goalX,s.goalY,!1),Yk(n,t,e)||(s.moveMode=Qh)}}function dy(n,t,e,s,i){if(_tsCanFly(t)){const a=t.rt;a.goalX=e,a.goalY=s;const dx=e-t.pos.x,dy2=s-t.pos.y,dist=Math.hypot(dx,dy2);if(dist>.12){const step=Math.min(dist,t.stats.moveSpeed*i),ux=dx/dist,uy=dy2/dist;_tsFlyStep(n,t,ux*step,uy*step)||n.nav.moveWithCollision(t.pos,ux*step,uy*step,a.navR),t.facing=Math.atan2(uy,ux),a.moved=!0}return}const a=t.rt,o=n.state.time,r=e-a.goalX,l=s-a.goalY,c=o-a.pathTime,f=a.path;if(f===null){if(c<v6)return;Ph(n,t,e,s,!1)}else c>2||c>=v6&&r*r+l*l>y6*y6?Ph(n,t,e,s,!1):f.length===1&&a.pathIdx===0&&(f[0].x=e,f[0].y=s);Yk(n,t,i)}function Kk(n,t,e,s,i){const a=e-t.pos.x,o=s-t.pos.y,r=Math.hypot(a,o);if(r<.05)return!1;const l=Math.min(r,t.stats.moveSpeed*i),c=t.pos.x,f=t.pos.y;(_tsCanFly(t)&&_tsFlyStep(n,t,a/r*l,o/r*l))||n.nav.moveWithCollision(t.pos,a/r*l,o/r*l,t.rt.navR);const d=t.pos.x-c,h=t.pos.y-f;return d*d+h*h>1e-10?(t.facing=Math.atan2(o,a),t.rt.moved=!0,!0):!1}',
  ],
  // K26 3D 骨骼定格 + 石化/墨封/寒霜/刀影材质 + 奇观 VFX 桥接
  [
    'blendT=0;blendDur=0;lastAnim=null;lastKey=NaN;snap(){this.lastAnim=null,this.blendDur=0,this.skeleton.resetChains()}update(t,e,s,i,a,o,r=1){',
    'blendT=0;blendDur=0;lastAnim=null;lastKey=NaN;frozen=!1;snap(){this.lastAnim=null,this.blendDur=0,this.frozen=!1,this.skeleton.resetChains()}update(t,e,s,i,a,o,r=1){if(this.frozen&&this.lastAnim!==null){this.skeleton.solve(this.pose,s,i,a,o,r*this.def.scale);return}',
  ],
  [
    '(D.culled||D.fresh)&&D.puppet.snap();D.culled=!1;D.fresh=!1;D.puppet.update(D.lastStart+D.mode*1e-4+(ot.spawnT>=0?5e-4:0),$,D.x,D.y+D.lift,D.z,_ry,D.scale);',
    'const _tsFrz=D.dying<0&&(D.tsCcState==="petrify"||D.tsCcState==="ink_seal");_tsFrz?(D.puppet.frozen||(D.frozenYaw=_ry),_ry=D.frozenYaw,D.puppet.frozen=!0):D.puppet.frozen=!1;(D.culled||D.fresh)&&D.puppet.snap();D.culled=!1;D.fresh=!1;D.puppet.update(D.lastStart+D.mode*1e-4+(ot.spawnT>=0?5e-4:0),$,D.x,D.y+D.lift,D.z,_ry,D.scale);',
  ],
  [
    'panyue_ult_fissure:{create(n,t){ad(n,t,0,1,yc.dark);const g=Gd(n,t,Xt.rune,.08);n.decals.at(g).params(8,.35).color(yc.glow,1.6,.92).under(yc.dark,.35)},update(n,t,e){od(n,t);',
    'panyue_ult_fissure:{create(n,t){ad(n,t,0,1,yc.dark);const g=Gd(n,t,Xt.rune,.08);n.decals.at(g).params(8,.35).color(yc.glow,1.6,.92).under(yc.dark,.35);tsConfig.skillsEx?.initQinqiongArena?.(n,t,{Lt,Mt,Xt,Ft,oe,qe,sn,$n,bn,vs})},update(n,t,e){od(n,t);tsConfig.skillsEx?.updateQinqiongArena?.(t,{Lt,Mt,Xt,Ft,oe,qe,sn,$n,bn,vs});',
  ],
  [
    'chijin_ult_spin:{create(n,t){ad(n,t,0,2,rd.dark);const d=Gd(n,t,Xt.star,.08);n.decals.at(d).params(6,1).color(rd.accent,1.45,.88).under(rd.dark,.38);const e=n.glow.hold(qe.cone,sn.vortex);e.color(rd.deep,.75,0),e.add=.22,e.k=3.6,e.progress=.3,t.meshes.push(e);for(let s=0;s<3;s++){const i=n.glow.hold(qe.slash,sn.slash);i.color(s%2===0?rd.glow:rd.accent,1.3,0),i.add=.22,i.k=.58,i.progress=-2,t.meshes.push(i)}},update(n,t,e){od(n,t);t.slots.length>1&&n.decals.at(t.slots[1]).rot(-t.age*1.4,.12);const s=Math.min(1,t.age*4),i=Math.max(0,Math.min(1,(t.duration-t.age)*3)),a=t.radius*.55*s,o=t.meshes[0];o.at(t.x,.05,t.z).scale3(a,2.05*s,a).rot(0,t.age*7,0),o.a=(n.lowQ?.18:.34)*i;for(let r=1;r<t.meshes.length;r++){const l=t.meshes[r],c=t.radius*(.88+.08*r)*(.4+.6*s);l.at(t.x,.65+(r-1)*.4,t.z).scale(c).rot(r===1?.12:r===2?-.12:.04,t.phase+t.age*(11+r)+r*oe/3,0),l.a=.58*i}',
    'chijin_ult_spin:{create(n,t){ad(n,t,0,2,rd.dark);const d=Gd(n,t,Xt.star,.08);n.decals.at(d).params(6,1).color(rd.accent,1.45,.88).under(rd.dark,.38);const e=n.glow.hold(qe.cone,sn.vortex);e.color(rd.deep,.75,0),e.add=.22,e.k=3.6,e.progress=.3,t.meshes.push(e);for(let s=0;s<3;s++){const i=n.glow.hold(qe.slash,sn.slash);i.color(s%2===0?rd.glow:rd.accent,1.3,0),i.add=.22,i.k=.58,i.progress=-2,t.meshes.push(i)}tsConfig.skillsEx?.initChijinFlight?.(n,t,{Lt,Mt,Xt,Ft,oe,qe,sn,$n,bn,vs})},update(n,t,e){od(n,t);t.slots.length>1&&n.decals.at(t.slots[1]).rot(-t.age*1.4,.12);if(tsConfig.skillsEx?.updateChijinFlight){tsConfig.skillsEx.updateChijinFlight(n,t,e,{Lt,Mt,Xt,Ft,oe,qe,sn,$n,bn,vs})}else{const s=Math.min(1,t.age*4),i=Math.max(0,Math.min(1,(t.duration-t.age)*3)),a=t.radius*.55*s,o=t.meshes[0];o.at(t.x,.05,t.z).scale3(a,2.05*s,a).rot(0,t.age*7,0),o.a=(n.lowQ?.18:.34)*i;for(let r=1;r<t.meshes.length;r++){const l=t.meshes[r],c=t.radius*(.88+.08*r)*(.4+.6*s);l.at(t.x,.65+(r-1)*.4,t.z).scale(c).rot(r===1?.12:r===2?-.12:.04,t.phase+t.age*(11+r)+r*oe/3,0),l.a=.58*i}}',
  ],
  [
    'const s=n.glow.hold(qe.hoop,sn.hoop);s.color(_p.glow,1.2,.85),s.add=.3,t.meshes.push(s)},update(n,t,e){const _p=t._pal??Zr,s=1-.72*t.t*t.t;for(const sl of t.slots)n.decals.at(sl).at(t.x,t.z).radius(t.radius);const i=t.meshes[0];i.at(t.x,.7+t.t*.6,t.z).scale(t.radius*s),i.rot(0,t.age*3,0);',
    'const s=n.glow.hold(qe.hoop,sn.hoop);s.color(_p.glow,1.2,.85),s.add=.3,t.meshes.push(s);tsConfig.skillsEx?.initLiueSealWell?.(n,t,{Lt,Mt,Xt,Ft,oe,qe,sn,$n,bn,vs})},update(n,t,e){const _p=t._pal??Zr,s=1-.72*t.t*t.t;for(const sl of t.slots)n.decals.at(sl).at(t.x,t.z).radius(t.radius);const i=t.meshes[0];i.at(t.x,.7+t.t*.6,t.z).scale(t.radius*s),i.rot(0,t.age*3,0);tsConfig.skillsEx?.updateLiueSealWell?.(t);',
  ],
  [
    'n.shake(t.unitId===e.playerId?.15:.08,i,a)},TD=',
    'tsConfig.skillsEx?.playQinqiongTitanLeap?.(n,t,{Lt,Mt,Xt,Ft,oe,qe,sn,$n,bn,vs}),n.shake(t.unitId===e.playerId?.15:.08,i,a)},TD=',
  ],
  [
    'n.decals.add(Xt.star,e,s,2.2,1.1).params(8,1).color(di.accent,1.75,.95).under(di.dark,.35),_tsSilkBurst(n,e,1.4,s,12,1.4,5.5,di.accent,di.hot),n.light(e,s,2,di.glow,5,7,.3)},tD=',
    'n.decals.add(Xt.star,e,s,2.2,1.1).params(8,1).color(di.accent,1.75,.95).under(di.dark,.35),_tsSilkBurst(n,e,1.4,s,12,1.4,5.5,di.accent,di.hot),tsConfig.skillsEx?.playWenchengFlight?.(n,t,{Lt,Mt,Xt,Ft,oe,qe,sn,$n,bn,vs}),n.light(e,s,2,di.glow,5,7,.3)},tD=',
  ],
  [
    'n.particles.use(Mt.hitFlash).tint(W.white,Ci.hot).spawn(e,1.1,s,0,0,0,le.flashBasic,.6,1)},BD=',
    'n.particles.use(Mt.hitFlash).tint(W.white,Ci.hot).spawn(e,1.1,s,0,0,0,le.flashBasic,.6,1),tsConfig.skillsEx?.playXinqijiAerialShadows?.(n,t,{Lt,Mt,Xt,Ft,oe,qe,sn,$n,bn,vs})},BD=',
  ],
  [
    'n.shake(bo(t,e)?.4:.25,s,i)},HD=',
    'tsConfig.skillsEx?.playXinqijiCrossDive?.(n,t,{Lt,Mt,Xt,Ft,oe,qe,sn,$n,bn,vs}),n.shake(bo(t,e)?.4:.25,s,i)},HD=',
  ],
  [
    'function ut(N){C.length=0;for(const J of N.buffs){',
    'function ut(N){C.length=0;for(const J of N.buffs){if(!T3[J.id])continue;',
  ],
  [
    'function lH(n){return rH[n]()}',
    'function lH(n){return(rH[n]??rH.haste)()}',
  ],
  [
    'function UB(n){return FB[n.id](n)}',
    'function UB(n){return FB[n.id]?FB[n.id](n):""}',
  ],
];

// Keep integration hooks reproducible when the optional read-only source exists.
export function patchCoreHooks(source) {
  for (let idx = 0; idx < patches.length; idx++) {
    const [before, after, ...legacy] = patches[idx];
    if (source.includes(after)) continue;
    const candidates = [before, ...legacy];
    let applied = false;
    for (const anchor of candidates) {
      const pieces = source.split(anchor);
      if (pieces.length === 2) {
        source = pieces.join(after);
        applied = true;
        break;
      }
    }
    if (!applied) {
      throw new Error(`core hook #${idx} expected one anchor (${before.slice(0, 48)}...)`);
    }
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
