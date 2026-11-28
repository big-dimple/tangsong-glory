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
  // K2 每帧钩子：阵亡色调推进之后、渲染之前，表现层在这里写成片参数与入画镜头
  ['q(lt.dt),d?.render(v,lt.alpha,lt.dt);', 'q(lt.dt),tsConfig.onFrame?.(d,lt.dt,v),d?.render(v,lt.alpha,lt.dt);'],
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
