/**
 * tangsongTransitions.ts — 移植自 5MB 视觉工程的四套纯正 WebGL2 GLSL 高级转场引擎
 *
 * 彻底移除旧版「高频晃动 slam」与「锯齿撕扯 tear」，全部采用干净克制的物理/光学手法（空闲零消耗）：
 *   1. flaps    (5MB 3D 机械百叶翻牌矩阵) — 匹配寻将 → 点将殿堂
 *   2. daybreak (5MB 40-tap 黄金角猫眼散景光学焦外虚化 + 星芒粒子) — 点将锁定 → 加载 / 胜利 → 结算
 *   3. portal   (5MB 光学窗框透视推进揭幕：金漆宫阙框顺滑扩开直通实机 3D 战场) — 加载 → 实机 3D 战场
 *   4. wash     (水墨青绿波浪冲刷 + Worley 泡沫蕾丝) — 战败 → 结算
 */
import { HEROES, type HeroId } from '../config/heroes';
import { cinematicFlowEnabled } from '../ui/tangsongMotion';

export type TransitionKind = 'flaps' | 'daybreak' | 'portal' | 'wash';
export type TransitionKindOrAlias = TransitionKind | 'slam' | 'tear';

export interface SnapshotContext {
  scene: 'lobby' | 'matchmake' | 'select' | 'loading' | 'match' | 'result';
  heroId?: string;
  teams?: { blue: string[]; red: string[] };
  difficultyLabel?: string;
  win?: boolean;
  sourceCanvas?: HTMLCanvasElement | null;
}

const VERT_FULL = `#version 300 es
precision highp float;
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const GLSL_SHARED = `
float hash12(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float hash13(vec3 p3){p3=fract(p3*.1031);p3+=dot(p3,p3.zyx+31.32);return fract((p3.x+p3.y)*p3.z);}
vec2 hash22(vec2 p){vec3 p3=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973));p3+=dot(p3,p3.yzx+33.33);return fract((p3.xx+p3.yz)*p3.zy);}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*f*(f*(f*6.-15.)+10.);return mix(mix(hash12(i),hash12(i+vec2(1,0)),f.x),mix(hash12(i+vec2(0,1)),hash12(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;mat2 m=mat2(.8,.6,-.6,.8);for(int i=0;i<4;i++){s+=a*vnoise(p);p=m*p*2.03;a*=.5;}return s;}
vec3 toLin(vec3 c){return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(.04045,c));}
vec3 toSrgb(vec3 c){c=max(c,0.);return mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(.0031308,c));}
float luma(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
`;

// ── 1. flaps（移植自 5MB transitions-physical.js：3D 百叶机械翻牌阵列）──
const FLAPS_DUR_SEC = 1.45;
const FLAPS_TIMING = `
${GLSL_SHARED}
uniform vec2 uGrid;
uniform float uT;
float tileStart(vec2 id){
  vec2 c = (id + .5) / uGrid;
  float d = (c.x * 1.15 + (1. - c.y) * .85) / 2.;
  float h = hash12(id + 3.7);
  return .05 + d * .74 + h * .09 + .025 * sin(c.x * 8. + c.y * 5.);
}
int tileN(vec2 id){ return hash12(id + 17.3) > .62 ? 3 : 2; }
float flipDur(int k, int n){ return k == n - 1 ? .25 : (k == 0 ? .16 : .14); }
vec3 tileState(vec2 id){
  float t = uT - tileStart(id);
  int n = tileN(id);
  if (t <= 0.) return vec3(-1., 0., t);
  for (int k = 0; k < n; k++) {
    float d = flipDur(k, n);
    if (t < d) {
      float x = t / d, a;
      if (k == n - 1) {
        x = t / (d * .64);
        if (x < 1.) a = x * x * (1.35 - .35 * x);
        else {
          float y = (t - d * .64) / (d * .36);
          a = 1. - .075 * sin(y * 3.14159) * (1. - y);
        }
      } else {
        a = pow(x, 1.7);
      }
      return vec3(float(k), a * 3.14159265, 0.);
    }
    t -= d;
  }
  return vec3(float(n), 0., t);
}
vec3 midCard(vec2 f, vec2 id){
  float h = hash12(id + 8.1);
  vec3 obsidian = vec3(.014, .022, .026) * (.82 + .36 * h);
  float outerB = step(abs(f.x - .5), .46) * step(abs(f.y - .5), .45);
  float innerB = step(abs(f.x - .5), .44) * step(abs(f.y - .5), .43);
  float rim = outerB * (1. - innerB);
  vec3 sheen = obsidian * (1.0 + .35 * (1. - f.y));
  vec3 gold = vec3(.45, .32, .12);
  return mix(sheen, gold, rim * .78);
}
`;

const FLAPS_BG_FRAG = `#version 300 es
precision highp float;
precision highp int;
in vec2 vUv;
out vec4 o;
uniform sampler2D tA, tB;
uniform vec2 uRes;
uniform float uHasB;
${FLAPS_TIMING}
vec4 faceSample(int k, vec2 f, vec2 id){
  int n = tileN(id);
  vec2 uv = (id + f) / uGrid;
  if (k <= 0) return vec4(toLin(clamp(textureLod(tA, uv, 0.).rgb, 0., 1.)), 1.);
  if (k >= n) {
    if (uHasB < .5) return vec4(0.);
    return vec4(toLin(clamp(textureLod(tB, uv, 0.).rgb, 0., 1.)), 1.);
  }
  if (k == 1) return vec4(midCard(f, id), 1.);
  vec2 sh = floor(hash22(id + float(k)) * vec2(uGrid));
  vec2 j = mod(id + sh, uGrid);
  return vec4(toLin(clamp(textureLod(tA, (j + f) / uGrid, 0.).rgb, 0., 1.)) * .72, 1.);
}
void main(){
  vec2 g = vUv * uGrid;
  vec2 id = min(floor(g), uGrid - 1.);
  vec2 f = g - id;
  vec3 st = tileState(id);
  int n = tileN(id);
  float gap = st.x < -.5 ? smoothstep(-.08, 0., st.z)
            : st.x > float(n) - .5 ? 1. - smoothstep(0., .12, st.z)
            : 1.;
  vec2 tp = uRes / uGrid;
  if (st.x < -.5 && gap <= 0.) {
    vec3 c0 = toLin(clamp(textureLod(tA, vUv, 0.).rgb, 0., 1.));
    o = vec4(toSrgb(c0), 1.);
    return;
  }
  if (st.x > float(n) - .5 && gap <= 0.) {
    if (uHasB < .5) { o = vec4(0.); return; }
    o = vec4(textureLod(tB, vUv, 0.).rgb, 1.);
    return;
  }
  vec2 e = min(f, 1. - f) * tp;
  float line = smoothstep(.1, 1.1, min(e.x, e.y) - .25);
  float mid = smoothstep(.2, .9, abs(f.y - .5) * tp.y);
  vec4 smp;
  float sh = 1.;
  if (st.x < -.5) {
    smp = faceSample(0, f, id);
  } else if (st.x > float(n) - .5) {
    smp = faceSample(n, f, id);
  } else {
    int k = int(st.x + .5);
    float th = st.y, s = sin(th), q = cos(th);
    bool top = f.y > .5;
    float d = abs(f.y - .5) * 2.;
    if (top) {
      smp = faceSample(k + 1, f, id);
      float open = smoothstep(0., 1.35, th);
      sh = mix(.22, 1., open) * (1. - .35 * (1. - smoothstep(1.4, 3.1, th)) * exp(-d * 3.));
    } else {
      smp = faceSample(k, f, id);
      float len = s * .95 + max(-q, 0.) * 1.05;
      float soft = .10 + .22 * s;
      float shade = 1. - smoothstep(len - soft, len + soft * .6, d);
      sh = 1. - .62 * shade * smoothstep(.05, .8, th);
    }
  }
  if (smp.a <= .002) {
    float hinge = gap * (1. - mid) * .45;
    o = vec4(0., 0., 0., hinge);
    return;
  }
  vec3 c = smp.rgb * sh;
  c *= mix(1., mix(.10, 1., line), gap);
  c *= mix(1., mix(.55, 1., mid), gap);
  o = vec4(toSrgb(clamp(c, 0., 1.)), smp.a);
}`;

const FLAPS_LEAF_VERT = `#version 300 es
precision highp float;
precision highp int;
in vec2 aPos;
out vec2 vF;
flat out vec2 vId;
flat out vec3 vSt;
uniform float uAsp;
${FLAPS_TIMING}
void main(){
  int c = int(uGrid.x);
  vec2 id = vec2(float(gl_InstanceID % c), float(gl_InstanceID / c));
  vec3 st = tileState(id);
  vId = id;
  vSt = st;
  if (st.x < -.5 || st.x > float(tileN(id)) - .5) {
    gl_Position = vec4(2., 2., 2., 1.);
    return;
  }
  vF = vec2(aPos.x, .5 + aPos.y * .5);
  vec2 ctr = ((id + vec2(aPos.x, .5)) / uGrid * 2. - 1.) * vec2(uAsp, 1.);
  float hh = 1. / uGrid.y;
  float y = aPos.y * hh;
  float th = st.y;
  vec3 w = vec3(ctr.x, ctr.y + y * cos(th), y * sin(th));
  const float D = 2.1;
  float k = (D - w.z) / D;
  gl_Position = vec4(w.x / uAsp, w.y, (.5 - w.z) * k * .5, k);
}`;

const FLAPS_LEAF_FRAG = `#version 300 es
precision highp float;
precision highp int;
in vec2 vF;
flat in vec2 vId;
flat in vec3 vSt;
out vec4 o;
uniform sampler2D tA, tB;
uniform vec2 uRes;
uniform float uHasB;
${FLAPS_TIMING}
vec4 faceSample(int k, vec2 f, vec2 id){
  int n = tileN(id);
  vec2 uv = (id + f) / uGrid;
  if (k <= 0) return vec4(toLin(clamp(textureLod(tA, uv, 0.).rgb, 0., 1.)), 1.);
  if (k >= n) {
    if (uHasB < .5) return vec4(0.);
    return vec4(toLin(clamp(textureLod(tB, uv, 0.).rgb, 0., 1.)), 1.);
  }
  if (k == 1) return vec4(midCard(f, id), 1.);
  vec2 sh = floor(hash22(id + float(k)) * vec2(uGrid));
  vec2 j = mod(id + sh, uGrid);
  return vec4(toLin(clamp(textureLod(tA, (j + f) / uGrid, 0.).rgb, 0., 1.)) * .72, 1.);
}
void main(){
  float th = vSt.y;
  int k = int(vSt.x + .5);
  float s = sin(th), c = cos(th);
  float d = (vF.y - .5) * 2.;
  vec2 tp = uRes / uGrid;
  float gx = min(vF.x, 1. - vF.x) * tp.x;
  if (gx < .9) discard;
  bool front = gl_FrontFacing;
  vec4 smp;
  float e;
  if (front) {
    smp = faceSample(k, vF, vId);
    float l = .8 * c - .6 * s;
    e = .32 + .68 * max(l, 0.) / .8;
    e *= 1. - .18 * s * (1. - d);
  } else {
    smp = faceSample(k + 1, vec2(vF.x, 1. - vF.y), vId);
    float l = .6 * s - .8 * c;
    e = .32 + .68 * max(l, 0.) / .8;
    float sp = smoothstep(.12, .0, abs(th - 2.25));
    e = mix(1., e, s);
    smp.rgb += vec3(.05) * sp * s;
  }
  if (smp.a <= .002) discard;
  float tip = smoothstep(2.2, .6, (1. - d) * tp.y * .5);
  vec3 col = mix(smp.rgb, smp.rgb * .55 + vec3(.14, .11, .08), tip * s * .75);
  o = vec4(toSrgb(min(col * e, vec3(1.))) * smp.a, smp.a);
}`;

// ── 2. portal（移植自 5MB 光学窗框透视推进揭幕：宫阙金框顺滑扩开，内部直通实时 3D 战场）──
const PORTAL_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D tA, tB;
uniform float uP, uAsp, uHasB;
${GLSL_SHARED}
float sm5(float t){ t = clamp(t, 0., 1.); return t * t * t * (t * (t * 6. - 15.) + 10.); }
float sdBox(vec2 p, vec2 b, float r){
  vec2 d = abs(p) - b + vec2(r);
  return length(max(d, 0.)) + min(max(d.x, d.y), 0.) - r;
}
void main(){
  if (uP <= .001) { o = texture(tA, vUv); return; }
  if (uP >= .995) { o = vec4(0.); return; }
  float k = sm5(uP);
  float ease = pow(k, 1.42);
  vec2 asp = vec2(uAsp, 1.);
  vec2 p = (vUv - .5) * asp;
  // 窗框从中央稳稳扩开直至越出屏幕四角（绝不震颤、绝不撕扯图像）
  vec2 halfMin = vec2(.18 * uAsp, .14);
  vec2 halfMax = vec2(.82 * uAsp, .82);
  vec2 boxB = mix(halfMin, halfMax, ease);
  float cornerR = mix(.032, .012, ease);
  float sd = sdBox(p, boxB, cornerR);
  float px = max(fwidth(sd), .002);
  float insideMask = 1. - smoothstep(-px * 1.4, px * 1.4, sd);
  float rimFade = 1. - smoothstep(.72, .97, uP);

  // 框外旧画平缓对称向外推远消隐（刚性均匀缩放，零模糊重影）
  float zoom = 1. + k * .38;
  vec2 uvA = clamp((vUv - .5) / zoom + .5, .001, .999);
  vec3 cA = toLin(clamp(texture(tA, uvA).rgb, 0., 1.));
  float outerDim = 1. - .38 * k;
  cA *= outerDim;

  // 框缘鎏金宫阙双线边框 + 柔和内阴影，营造"步入画境"的景深层次
  float outerGold = exp(-abs(sd - .009) * 145.) * .95;
  float innerGold = exp(-abs(sd + .007) * 210.) * .55;
  float rimShadow = exp(min(sd, 0.) * 28.) * smoothstep(-.16, -.002, sd) * .42;
  vec3 goldTint = vec3(.92, .72, .34);

  if (uHasB > .5) {
    vec3 cB = toLin(clamp(texture(tB, vUv).rgb, 0., 1.));
    cB = mix(cB, cB * .55, rimShadow * (1. - smoothstep(.55, .92, uP)));
    vec3 col = mix(cA, cB, insideMask);
    col += goldTint * (outerGold + innerGold) * rimFade;
    float aOut = 1. - smoothstep(.86, .99, uP);
    o = vec4(toSrgb(clamp(col, 0., 1.)) * aOut, aOut);
    return;
  }

  // 无 tB：窗框内部 100% 透明直通真实 3D 战场，仅留边框柔和过渡
  float outerAlpha = (1. - insideMask) * (1. - smoothstep(.70, .95, uP));
  float rimAlpha = clamp((outerGold + innerGold + rimShadow) * rimFade, 0., 1.);
  float aOut = clamp(max(outerAlpha, rimAlpha), 0., 1.);
  vec3 outCol = mix(goldTint * .4, cA, outerAlpha / max(aOut, .001));
  outCol += goldTint * (outerGold + innerGold) * rimFade;
  o = vec4(toSrgb(clamp(outCol, 0., 1.)) * aOut, aOut);
}`;

// ── 3. daybreak（5MB 40-tap 黄金角猫眼散景 + 暖金浮光散景粒子）──
const DAYBREAK_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D tA, tB;
uniform float uP, uAsp, uHasB;
${GLSL_SHARED}
float ss(float a, float b, float x){ return smoothstep(a, b, x); }
vec3 bokehSample(sampler2D tex, vec2 uv, float r, float hiBoost, float expBoost, vec2 drift){
  if (r <= .0015) return toLin(clamp(texture(tex, uv).rgb, 0., 1.));
  float j = hash12(gl_FragCoord.xy) * 6.2831;
  vec2 fc = uv - .5;
  float cat = clamp(length(fc * vec2(1., .8)) * 1.15, 0., .75);
  vec2 cd = normalize(fc + 1e-5);
  vec3 s = vec3(0.); float w = 0.;
  for (int i = 0; i < 40; i++) {
    float f = (float(i) + .5) / 40., a = float(i) * 2.399963 + j;
    vec2 d = vec2(cos(a), sin(a)) * sqrt(f);
    d -= cd * dot(d, cd) * cat * .45;
    vec3 c = toLin(clamp(texture(tex, clamp(uv + drift + d * r * vec2(1. / uAsp, 1.), 0., 1.)).rgb, 0., 1.));
    float l = luma(c), k = 1. + hiBoost * l * l * l;
    c *= 1. + expBoost * l * l;
    s += c * k; w += k;
  }
  return s / max(w, 1e-4);
}
void main(){
  if (uP <= .001) { o = texture(tA, vUv); return; }
  if (uP >= .995) { o = vec4(0.); return; }
  float p = uP;
  float t1 = clamp((p - .03) / .47, 0., 1.), blurA = t1 * t1 * t1 * (t1 * (t1 * 6. - 15.) + 10.);
  float t2 = clamp((p - .50) / .48, 0., 1.), blurB = 1. - t2 * t2 * t2 * (t2 * (t2 * 6. - 15.) + 10.);
  float radA = .072 * blurA, radB = .058 * blurB;
  float wA = 1. - ss(.24, .64, p), wB = ss(.40, .82, p);
  vec3 c = vec3(0.);
  if (wA > 0.) c += bokehSample(tA, vUv, radA, 14. * blurA, 1.1 * blurA, vec2(-.018 * blurA, 0.)) * wA * mix(1., .65, ss(.2, .6, p));
  if (wB > 0. && uHasB > .5) c += bokehSample(tB, vUv, radB, 18. * blurB, 3.2 * blurB, vec2(.012 * blurB, 0.)) * wB;
  float glowEnv = ss(.04, .34, p) * (1. - ss(.34, .75, p));
  for (int layer = 0; layer < 2; layer++) {
    float scale = layer == 0 ? 5.2 : 9.6;
    vec2 uvG = (vUv * vec2(uAsp, 1.) + vec2(-p * (.06 + .04 * float(layer)), -p * (.09 + .05 * float(layer)))) * scale;
    vec2 gid = floor(uvG), gf = fract(uvG) - .5;
    vec2 h = hash22(gid + float(layer) * 31.7 + 13.0);
    vec2 h2 = hash22(gid + float(layer) * 19.3 + 5.1);
    if (h.x > (layer == 0 ? .58 : .64)) {
      vec2 ce = (h2 - .5) * .62;
      vec2 dv = gf - ce;
      vec2 fc = vUv - .5;
      float cat = clamp(length(fc * vec2(1., .8)) * 1.05, 0., .55);
      vec2 cd = normalize(fc + 1e-5);
      dv += cd * dot(dv, cd) * cat * .45;
      float d = length(dv);
      float life = sin(clamp((p - .05 * h.y) / .82, 0., 1.) * 3.14159);
      float rad = (layer == 0 ? .24 + .18 * h.y : .14 + .14 * h.y) * life;
      float bokeh = ss(rad, rad * .08, d) * (.68 + .32 * ss(rad * .52, rad * .90, d));
      vec3 spCol = mix(vec3(1.0, .82, .42), vec3(.62, .94, .88), h2.x * .65);
      c += spCol * bokeh * (layer == 0 ? .72 : .95) * glowEnv * (.45 + .55 * h2.y);
    }
  }
  c += vec3(1.0, .86, .58) * .14 * glowEnv;
  float k = ss(0., .12, p) * (1. - ss(.86, .985, p));
  vec3 soft = c / (1. + max(max(c.r, max(c.g, c.b)) - .82, 0.));
  c = mix(c, min(soft, 1.), k);
  float aOut = clamp(uHasB > .5 ? (1. - ss(.82, .98, p)) : (1. - ss(.24, .78, p)), 0., 1.);
  o = vec4(toSrgb(clamp(c, 0., 1.)) * aOut, aOut);
}`;

// ── 4. wash（战败结算专用：青绿水墨冲刷 + Worley 泡沫蕾丝 + 清晰不折叠折射）──
const WASH_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D tA, tB;
uniform float uP, uAsp, uHasB, uMood;
${GLSL_SHARED}
float ss(float a, float b, float x){ return smoothstep(a, b, x); }
vec2 worley(vec2 x){
  vec2 n = floor(x), f = fract(x);
  float d1 = 9., d2 = 9.;
  for (int j = -1; j <= 1; j++)
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(i, j), o2 = .15 + .7 * hash22(n + g);
      float d = dot(g + o2 - f, g + o2 - f);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
    }
  return sqrt(vec2(d1, d2));
}
float beads(vec2 q, float n, float seed, float d, float big, float p){
  vec2 x = q * n; x.x += .5 * mod(floor(x.y), 2.);
  vec2 id = floor(x), f = fract(x) - .5, r = hash22(id + seed), r2 = hash22(id + seed + 9.);
  if (r.x < big) return 0.;
  float dry = .60 + .36 * r.y;
  float rad = (.13 + .28 * r2.y * r2.y) * (1. - ss(dry - .20, dry, p)) * ss(.0, .10, d - .05 * r2.x);
  vec2 e = f - (r2 - .5) * .34;
  float h = rad * rad - dot(e, e);
  return h > 0. ? sqrt(h) / n * 1.5 : 0.;
}
float lip(vec2 q, float p){
  float k = clamp(p / .36, 0., 1.); k = k * (.55 + .45 * k);
  float s = dot(q, normalize(vec2(.34, 1.)));
  float F = mix(-.30, 2.05 + .30 * (uAsp - 1.78), k);
  return F - s + .10 * (fbm(q * 2.3 + vec2(p * 2., 0.)) - .5) * 2. + .030 * sin(q.x * 9. + p * 20.);
}
float drain(vec2 q, float p){
  float k = clamp((p - .40) / .46, 0., 1.); k = k * k * (3. - 2. * k);
  float L = mix(1.32, -.55, k);
  float col = .28 * (fbm(vec2(q.x * 2.1, 3.)) - .5) * 2. + .16 * (vnoise(vec2(q.x * 9. + .35 * sin(q.y * 5.), 9.)) - .5) * 2. * ss(.40, .6, p);
  return q.y - L - col;
}
vec2 evalHeight(vec2 q, float p, out float a, out float d){
  a = lip(q, p); d = p > .36 ? drain(q, p) : -1.;
  float c = ss(-.005, .16, a) * ss(.02, -.14, d);
  vec2 fl = vec2(p * 1.6, p > .4 ? (p - .4) * 3.2 : -p * 2.2);
  float wv = fbm(q * vec2(3.2, 2.2) + fl * 1.3) + .35 * vnoise(q * vec2(17., 8.) + fl * 3.2);
  float lipB = ss(0., .05, a) * ss(.22, .05, a) * .55 + ss(.02, -.02, d) * ss(-.10, -.02, d) * .28;
  float s = (a > -.02 && d < .05) ? (c * (.35 + .85 * wv) + lipB * c) * .085 : 0.;
  float w = 0.;
  if (p > .40 && d > -.05) {
    w = max(w, beads(q, 17., 1., d, .45, p));
    w = max(w, beads(q, 38., 4., d, .50, p));
  }
  return vec2(s, w);
}
void main(){
  if (uP <= .001) { o = texture(tA, vUv); return; }
  if (uP >= .995) { o = vec4(0.); return; }
  vec2 q = vUv * vec2(uAsp, 1.);
  float a, d;
  vec2 h0 = evalHeight(q, uP, a, d);
  if (a < -.012 && uP < .4) {
    float sh = exp((a + .012) * 16.);
    vec3 colA = toLin(clamp(texture(tA, vUv).rgb, 0., 1.));
    colA *= 1. - .30 * sh * ss(0., .08, uP);
    o = vec4(toSrgb(colA), 1.);
    return;
  }
  float eps = .0035;
  float a1, d1;
  vec2 hx = evalHeight(q + vec2(eps, 0.), uP, a1, d1);
  vec2 hy = evalHeight(q + vec2(0., eps), uP, a1, d1);
  vec2 gs = (vec2(hx.x, hy.x) - h0.x) / eps;
  vec2 gw = (vec2(hx.y, hy.y) - h0.y) / eps;
  float isW = ss(0., .0012, h0.y);
  vec3 n = normalize(vec3(-(gs + gw), 1.));
  float thick = clamp(h0.x / .085, 0., 2.);
  vec2 refractOff = clamp(-gs * .045 * clamp(.5 + thick, 0., 1.4) - clamp(gw, -2.0, 2.0) * .060 * isW, -.14, .14) / vec2(max(uAsp, .85), 1.);
  vec2 uv = clamp(vUv + refractOff, .002, .998);
  float sw = ss(.34, .46, uP + .02 * (vnoise(q * 4.) - .5));
  vec3 ca = uP < .48 ? toLin(clamp(texture(tA, uv).rgb, 0., 1.)) : vec3(0.);
  vec3 cb = uHasB > .5 && uP > .32 ? toLin(clamp(texture(tB, uv).rgb, 0., 1.)) : vec3(.06, .13, .14);
  vec3 c = mix(ca, cb, sw);
  float depth = thick * ss(0., .3, a) * ss(.03, -.25, d);
  float murk = ss(.18, .36, uP) * (1. - ss(.45, .66, uP));
  vec3 ab = exp(-depth * vec3(1.25, .36, .30) * (.55 + 1.6 * murk));
  vec3 jadeDeep = mix(vec3(.014, .11, .13), vec3(.02, .03, .05), uMood);
  vec3 jadeBright = mix(vec3(.07, .35, .36), vec3(.08, .12, .16), uMood);
  vec3 sc = mix(jadeDeep, jadeBright, ss(.2, 1.1, thick + n.y * .6));
  c = c * ab + sc * (1. - ab.g) * mix(1.35, .92, murk);
  vec3 hv = normalize(normalize(vec3(-.35, .75, .55)) + vec3(0., 0., 1.));
  float fr = pow(1. - n.z, 3.5);
  c = mix(c, mix(vec3(.25, .44, .48), vec3(.95, 1., 1.), ss(-.3, .9, n.y)), clamp(fr * .72, 0., .58));
  c += vec3(1., .98, .92) * pow(max(dot(n, hv), 0.), isW > .5 ? 90. : 130.) * (isW > .5 ? .85 : .5 * ss(0., .3, thick));
  float foam = 0.;
  if (d < .06 && a > -.02 && uP < .84) {
    vec2 fq = q + vec2(-uP * .55, uP < .4 ? -uP * 1.1 : (uP - .4) * 1.5);
    vec2 wq = fq + .16 * vec2(fbm(fq * 3.1), fbm(fq * 3.1 + 9.));
    float ht = ss(.28, .66, fbm(fq * 4.7 + 11.));
    vec2 w1 = worley(wq * 13.), w2 = worley(wq * 31. + 3.);
    float lace = ss(.03 + .22 * ht, .0, w1.y - w1.x) * .80 + ss(.04 + .28 * ht, .0, w2.y - w2.x) * .65 * (.35 + .65 * ht);
    float pat = fbm(fq * vec2(3.4, 4.2) + 2.);
    float nearLip = exp(-max(a, 0.) * 9.5);
    float trail = exp(-max(a, 0.) * 2.4) * ss(.38, .68, pat);
    float edgeD = exp(-abs(d + .05) * 15.) * ss(.42, .5, uP) * (1. - ss(.66, .82, uP)) * ss(.35, .6, pat);
    float amt = (nearLip * 1.25 + trail * .72 + murk * .75 * ss(.42, .68, pat) + edgeD * .55) * ss(-.012, .02, a) * ss(.03, -.03, d);
    float brk = .35 + 1.1 * ss(.32, .64, fbm(fq * 9.));
    foam = clamp(amt * (.22 + lace * brk) - .24, 0., 1.);
    foam = max(foam, ss(.035, .0, a) * ss(-.012, .004, a) * .72);
    float fs = .72 + .28 * clamp(vnoise(fq * 30.) + .6 * n.y + .25 * w2.x, 0., 1.);
    c = mix(c, mix(vec3(.92, .95, .92), vec3(.65, .72, .76), uMood) * fs, foam * .92);
  }
  float cover = ss(-.012, .0, a);
  float wet = uP < .4 ? cover : clamp(ss(0., .0010, h0.x + h0.y), 0., 1.);
  wet = max(wet, foam);
  float revealFilm = clamp((1. - ab.g) * .52 + foam * .88 + fr * .38, .16, .84) * wet * (1. - ss(.74, .95, uP));
  float alpha = uHasB > .5
    ? (uP < .4 ? 1. : wet * (1. - ss(.82, .97, uP)))
    : mix(1., revealFilm, sw);
  float aOut = clamp(alpha, 0., 1.);
  vec3 outC = mix(uP < .4 ? toLin(texture(tA, vUv).rgb) : c, c, wet);
  o = vec4(toSrgb(min(outC, vec3(1.))) * aOut, aOut);
}`;

interface ProgramRecord {
  prog: WebGLProgram;
  vao: WebGLVertexArrayObject;
  uniforms: Record<string, WebGLUniformLocation | null>;
}

const DURATIONS: Record<TransitionKind, number> = {
  flaps: 880,
  daybreak: 1050,
  portal: 820,
  wash: 920,
};

let overlayCanvas: HTMLCanvasElement | null = null;
let gl: WebGL2RenderingContext | null = null;
let texA: WebGLTexture | null = null;
let texB: WebGLTexture | null = null;
let programs: Partial<Record<TransitionKind | 'flapsLeaf', ProgramRecord>> = {};
let activeRaf = 0;
let activeStop: (() => void) | null = null;
const imgCache = new Map<string, HTMLImageElement>();

function normalizeKind(kind: TransitionKindOrAlias): TransitionKind {
  if (kind === 'slam') return 'flaps';
  if (kind === 'tear') return 'portal';
  return kind;
}

function preloadImage(src: string): HTMLImageElement | null {
  if (!src) return null;
  const cached = imgCache.get(src);
  if (cached) return cached;
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  imgCache.set(src, img);
  return img;
}

export function warmTransitionImages(): void {
  if (typeof document === 'undefined') return;
  for (const src of [
    '/assets/art/lobby-scroll.webp',
    '/assets/art/select-pavilion.webp',
    '/assets/art/loading-bg.webp',
    '/assets/art/victory-bg.webp',
    '/assets/art/defeat-bg.webp',
  ]) {
    preloadImage(src);
  }
}

function compileShader(g: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const s = g.createShader(type)!;
  g.shaderSource(s, src);
  g.compileShader(s);
  if (!g.getShaderParameter(s, g.COMPILE_STATUS)) {
    const log = g.getShaderInfoLog(s);
    g.deleteShader(s);
    throw new Error(`[tangsongTransitions] shader error: ${log}`);
  }
  return s;
}

function linkProgram(g: WebGL2RenderingContext, vsSrc: string, fsSrc: string): WebGLProgram {
  const vs = compileShader(g, g.VERTEX_SHADER, vsSrc);
  const fs = compileShader(g, g.FRAGMENT_SHADER, fsSrc);
  const prog = g.createProgram()!;
  g.attachShader(prog, vs);
  g.attachShader(prog, fs);
  g.linkProgram(prog);
  g.deleteShader(vs);
  g.deleteShader(fs);
  if (!g.getProgramParameter(prog, g.LINK_STATUS)) {
    throw new Error(`[tangsongTransitions] link error: ${g.getProgramInfoLog(prog)}`);
  }
  return prog;
}

function getLocations(g: WebGL2RenderingContext, prog: WebGLProgram, names: string[]) {
  const out: Record<string, WebGLUniformLocation | null> = {};
  for (const n of names) out[n] = g.getUniformLocation(prog, n);
  return out;
}

function createFullscreenVao(g: WebGL2RenderingContext, prog: WebGLProgram): WebGLVertexArrayObject {
  const vao = g.createVertexArray()!;
  g.bindVertexArray(vao);
  const buf = g.createBuffer()!;
  g.bindBuffer(g.ARRAY_BUFFER, buf);
  g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), g.STATIC_DRAW);
  const loc = g.getAttribLocation(prog, 'aPos');
  g.enableVertexAttribArray(loc);
  g.vertexAttribPointer(loc, 2, g.FLOAT, false, 0, 0);
  g.bindVertexArray(null);
  return vao;
}

function createFlapLeafVao(g: WebGL2RenderingContext, prog: WebGLProgram): WebGLVertexArrayObject {
  const vao = g.createVertexArray()!;
  g.bindVertexArray(vao);
  const vbo = g.createBuffer()!;
  g.bindBuffer(g.ARRAY_BUFFER, vbo);
  g.bufferData(g.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), g.STATIC_DRAW);
  const loc = g.getAttribLocation(prog, 'aPos');
  g.enableVertexAttribArray(loc);
  g.vertexAttribPointer(loc, 2, g.FLOAT, false, 0, 0);
  const ibo = g.createBuffer()!;
  g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, ibo);
  g.bufferData(g.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), g.STATIC_DRAW);
  g.bindVertexArray(null);
  return vao;
}

function createTex(g: WebGL2RenderingContext): WebGLTexture {
  const tex = g.createTexture()!;
  g.bindTexture(g.TEXTURE_2D, tex);
  g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR);
  g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR);
  g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
  g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
  g.texImage2D(
    g.TEXTURE_2D,
    0,
    g.RGBA,
    2,
    2,
    0,
    g.RGBA,
    g.UNSIGNED_BYTE,
    new Uint8Array([14, 24, 26, 255, 14, 24, 26, 255, 14, 24, 26, 255, 14, 24, 26, 255]),
  );
  return tex;
}

function ensureGl(): boolean {
  if (typeof document === 'undefined') return false;
  if (gl && overlayCanvas && overlayCanvas.isConnected) return true;
  if (!overlayCanvas) {
    overlayCanvas = document.createElement('canvas');
    overlayCanvas.className = 'ts-transition-canvas';
    overlayCanvas.setAttribute('aria-hidden', 'true');
  }
  if (!overlayCanvas.isConnected) {
    document.body.appendChild(overlayCanvas);
  }
  if (!gl) {
    gl = overlayCanvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false });
    if (!gl) return false;
    texA = createTex(gl);
    texB = createTex(gl);

    const flapsBgProg = linkProgram(gl, VERT_FULL, FLAPS_BG_FRAG);
    programs.flaps = {
      prog: flapsBgProg,
      vao: createFullscreenVao(gl, flapsBgProg),
      uniforms: getLocations(gl, flapsBgProg, ['tA', 'tB', 'uGrid', 'uT', 'uRes', 'uHasB']),
    };

    const flapsLeafProg = linkProgram(gl, FLAPS_LEAF_VERT, FLAPS_LEAF_FRAG);
    programs.flapsLeaf = {
      prog: flapsLeafProg,
      vao: createFlapLeafVao(gl, flapsLeafProg),
      uniforms: getLocations(gl, flapsLeafProg, ['tA', 'tB', 'uGrid', 'uT', 'uAsp', 'uRes', 'uHasB']),
    };

    const portalProg = linkProgram(gl, VERT_FULL, PORTAL_FRAG);
    programs.portal = {
      prog: portalProg,
      vao: createFullscreenVao(gl, portalProg),
      uniforms: getLocations(gl, portalProg, ['tA', 'tB', 'uP', 'uAsp', 'uHasB']),
    };

    const dayProg = linkProgram(gl, VERT_FULL, DAYBREAK_FRAG);
    programs.daybreak = {
      prog: dayProg,
      vao: createFullscreenVao(gl, dayProg),
      uniforms: getLocations(gl, dayProg, ['tA', 'tB', 'uP', 'uAsp', 'uHasB']),
    };

    const washProg = linkProgram(gl, VERT_FULL, WASH_FRAG);
    programs.wash = {
      prog: washProg,
      vao: createFullscreenVao(gl, washProg),
      uniforms: getLocations(gl, washProg, ['tA', 'tB', 'uP', 'uAsp', 'uHasB', 'uMood']),
    };
  }
  return true;
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
  posX = 0.5,
  posY = 0.5,
): void {
  if (!img.complete || img.naturalWidth <= 0) return;
  const ir = img.naturalWidth / img.naturalHeight;
  const cr = w / h;
  let dw = w;
  let dh = h;
  if (ir > cr) {
    dh = h;
    dw = h * ir;
  } else {
    dw = w;
    dh = w / ir;
  }
  ctx.drawImage(img, (w - dw) * posX, (h - dh) * posY, dw, dh);
}

/** 极速同步绘制各主要界面的 2D 快照纹理，供 WebGL2 转场着色器直接消费。 */
export function buildSceneSnapshotCanvas(snap: SnapshotContext): HTMLCanvasElement {
  const portrait = typeof window !== 'undefined' && window.innerHeight > window.innerWidth;
  const w = portrait ? 540 : 960;
  const h = portrait ? 960 : 540;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d');
  if (!ctx) return cv;

  ctx.fillStyle = '#0e1e21';
  ctx.fillRect(0, 0, w, h);

  if (snap.sourceCanvas && snap.sourceCanvas.width > 0 && snap.sourceCanvas.height > 0) {
    try {
      drawCoverImage(ctx, snap.sourceCanvas as unknown as HTMLImageElement, w, h, 0.5, 0.5);
      return cv;
    } catch {
      // 安全降级到下方绘卷合成
    }
  }

  const artMap: Record<SnapshotContext['scene'], string> = {
    lobby: '/assets/art/lobby-scroll.webp',
    matchmake: '/assets/art/lobby-scroll.webp',
    select: '/assets/art/select-pavilion.webp',
    loading: '/assets/art/loading-bg.webp',
    match: '/assets/art/loading-bg.webp',
    result: snap.win === false ? '/assets/art/defeat-bg.webp' : '/assets/art/victory-bg.webp',
  };

  const bg = preloadImage(artMap[snap.scene]);
  if (bg) {
    const isLobby = snap.scene === 'lobby' || snap.scene === 'matchmake';
    drawCoverImage(ctx, bg, w, h, isLobby ? (portrait ? 0.74 : 0.62) : 0.5, isLobby ? (portrait ? 0.5 : 0.38) : 0.5);
  }

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(10, 14, 16, 0.45)');
  grad.addColorStop(0.45, 'rgba(10, 14, 16, 0.10)');
  grad.addColorStop(1, 'rgba(10, 14, 16, 0.72)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  if (snap.scene === 'matchmake') {
    ctx.fillStyle = 'rgba(8, 14, 16, 0.78)';
    ctx.fillRect(0, 0, w, h);
    const cw = portrait ? w * 0.88 : 560;
    const ch = portrait ? 410 : 350;
    const cx = (w - cw) / 2;
    const cy = (h - ch) / 2;
    ctx.fillStyle = 'rgba(16, 28, 30, 0.96)';
    ctx.fillRect(cx, cy, cw, ch);
    ctx.strokeStyle = 'rgba(233, 189, 98, 0.58)';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx, cy, cw, ch);
    ctx.fillStyle = '#fce3a6';
    ctx.textAlign = 'center';
    ctx.font = 'bold 28px serif';
    ctx.fillText('汴京寻将 · 十方齐聚', w / 2, cy + 54);
    ctx.fillStyle = 'rgba(233, 189, 98, 0.85)';
    ctx.fillRect(cx + 30, cy + 84, cw - 60, 4);
    const seatW = (cw - 88) / 2;
    for (let i = 0; i < 5; i++) {
      const sy = cy + 114 + i * 44;
      ctx.fillStyle = 'rgba(42, 108, 128, 0.38)';
      ctx.fillRect(cx + 28, sy, seatW, 32);
      ctx.fillStyle = 'rgba(166, 56, 48, 0.38)';
      ctx.fillRect(cx + cw - 28 - seatW, sy, seatW, 32);
    }
  } else if (snap.scene === 'lobby') {
    ctx.fillStyle = '#fff4d9';
    if (portrait) {
      ctx.font = 'bold 52px serif';
      ctx.fillText('唐宋荣耀', 32, 148);
      ctx.fillStyle = '#f7e6bf';
      ctx.font = '18px serif';
      ctx.fillText('汴京演武 · 5v5 实时匹配', 34, 186);
    } else {
      ctx.font = 'bold 58px serif';
      ctx.fillText('唐宋荣耀', 56, h - 120);
      ctx.fillStyle = '#f7e6bf';
      ctx.font = '20px serif';
      ctx.fillText('汴京演武 · 5v5 实时匹配', 58, h - 82);
    }
  } else if (snap.scene === 'select') {
    const hero = HEROES[(snap.heroId as HeroId) ?? 'sushi'] ?? HEROES.sushi;
    const pcImg = preloadImage(hero.assets.pc);
    if (pcImg?.complete && pcImg.naturalWidth > 0) {
      const targetH = portrait ? h * 0.56 : h * 0.86;
      const ratio = pcImg.naturalWidth / pcImg.naturalHeight;
      const targetW = Math.min(w * 0.88, targetH * ratio);
      const drawH = targetW / ratio;
      ctx.drawImage(pcImg, (w - targetW) * 0.5, (portrait ? h * 0.68 : h) - drawH, targetW, drawH);
    }
    ctx.fillStyle = '#fff5dc';
    ctx.font = portrait ? 'bold 34px serif' : 'bold 42px serif';
    ctx.fillText(`${hero.era} · ${hero.name}`, portrait ? 28 : 36, portrait ? 72 : 92);
  } else if (snap.scene === 'loading') {
    ctx.fillStyle = '#fce3a6';
    ctx.textAlign = 'center';
    ctx.font = portrait ? 'bold 28px serif' : 'bold 34px serif';
    ctx.fillText('汴京演武 · 5v5 对阵', w / 2, portrait ? 72 : 58);
    ctx.font = 'bold 28px serif';
    ctx.fillStyle = '#e9bd62';
    ctx.fillText('VS', w / 2, portrait ? 488 : h / 2 + 12);
    const blue = snap.teams?.blue ?? ['sushi', 'qinqiong', 'xinqiji', 'wencheng', 'huarui'];
    const red = snap.teams?.red ?? ['liue', 'qinqiong', 'xinqiji', 'wencheng', 'huarui'];
    if (portrait) {
      const drawRow = (list: string[], y: number, color: string) => {
        list.slice(0, 5).forEach((id, i) => {
          const x = 24 + i * 100;
          ctx.fillStyle = 'rgba(28, 17, 12, 0.88)';
          ctx.fillRect(x, y, 92, 210);
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, 92, 210);
          const hero = HEROES[id as HeroId] ?? HEROES.sushi;
          const port = preloadImage(hero.assets.portrait);
          if (port?.complete && port.naturalWidth > 0) {
            ctx.drawImage(port, x + 2, y + 2, 88, 162);
          }
          ctx.fillStyle = '#fff2d2';
          ctx.font = 'bold 14px sans-serif';
          ctx.fillText(hero.name, x + 46, y + 190);
        });
      };
      drawRow(blue, 248, '#6bb4db');
      drawRow(red, 532, '#f05a46');
    } else {
      const drawTeam = (list: string[], startX: number, color: string) => {
        list.slice(0, 5).forEach((id, i) => {
          const x = startX + i * 74;
          const y = 128;
          ctx.fillStyle = 'rgba(28, 17, 12, 0.88)';
          ctx.fillRect(x, y, 64, 240);
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, 64, 240);
          const hero = HEROES[id as HeroId] ?? HEROES.sushi;
          const port = preloadImage(hero.assets.portrait);
          if (port?.complete && port.naturalWidth > 0) {
            ctx.drawImage(port, x + 2, y + 2, 60, 185);
          }
          ctx.fillStyle = '#fff2d2';
          ctx.font = 'bold 13px sans-serif';
          ctx.fillText(hero.name, x + 32, y + 216);
        });
      };
      drawTeam(blue, 44, '#6bb4db');
      drawTeam(red, w - 44 - 5 * 74 + 10, '#f05a46');
    }
  }
  return cv;
}

function uploadTex(g: WebGL2RenderingContext, tex: WebGLTexture, source: HTMLCanvasElement): void {
  g.bindTexture(g.TEXTURE_2D, tex);
  g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL, true);
  g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, g.RGBA, g.UNSIGNED_BYTE, source);
}

function renderTransitionFrame(kind: TransitionKind, p: number, hasB: boolean, mood = 0): void {
  if (!gl || !overlayCanvas) return;
  const w = overlayCanvas.width;
  const h = overlayCanvas.height;
  const asp = w / Math.max(1, h);
  gl.viewport(0, 0, w, h);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  if (kind === 'flaps') {
    const rows = asp < 1 ? 12 : 9;
    const cols = asp < 1 ? Math.max(5, Math.round(asp * rows)) : Math.max(6, Math.round((asp * rows) / (16 / 9) * 1.45));
    const uT = p * FLAPS_DUR_SEC;

    const bg = programs.flaps!;
    gl.useProgram(bg.prog);
    gl.bindVertexArray(bg.vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texA);
    gl.uniform1i(bg.uniforms.tA, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texB);
    gl.uniform1i(bg.uniforms.tB, 1);
    gl.uniform2f(bg.uniforms.uGrid, cols, rows);
    gl.uniform1f(bg.uniforms.uT, uT);
    gl.uniform2f(bg.uniforms.uRes, w, h);
    gl.uniform1f(bg.uniforms.uHasB, hasB ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    const leaf = programs.flapsLeaf!;
    gl.useProgram(leaf.prog);
    gl.bindVertexArray(leaf.vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texA);
    gl.uniform1i(leaf.uniforms.tA, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texB);
    gl.uniform1i(leaf.uniforms.tB, 1);
    gl.uniform2f(leaf.uniforms.uGrid, cols, rows);
    gl.uniform1f(leaf.uniforms.uT, uT);
    gl.uniform1f(leaf.uniforms.uAsp, asp);
    gl.uniform2f(leaf.uniforms.uRes, w, h);
    gl.uniform1f(leaf.uniforms.uHasB, hasB ? 1 : 0);
    gl.drawElementsInstanced(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0, cols * rows);
    gl.bindVertexArray(null);
    return;
  }

  const pr = programs[kind]!;
  gl.useProgram(pr.prog);
  gl.bindVertexArray(pr.vao);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texA);
  gl.uniform1i(pr.uniforms.tA, 0);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, texB);
  gl.uniform1i(pr.uniforms.tB, 1);
  gl.uniform1f(pr.uniforms.uP, p);
  gl.uniform1f(pr.uniforms.uAsp, asp);
  gl.uniform1f(pr.uniforms.uHasB, hasB ? 1 : 0);
  if (kind === 'wash') gl.uniform1f(pr.uniforms.uMood, mood);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.bindVertexArray(null);
}

export interface PlayTransitionOptions {
  from: SnapshotContext;
  to?: SnapshotContext;
  durationMs?: number;
  mood?: number;
  holdProgress?: number;
  force?: boolean;
}

export function stopActiveTransition(): void {
  if (activeRaf) cancelAnimationFrame(activeRaf);
  activeRaf = 0;
  activeStop?.();
  activeStop = null;
  if (overlayCanvas) overlayCanvas.style.display = 'none';
}

export function playTangSongTransition(rawKind: TransitionKindOrAlias, opts: PlayTransitionOptions): Promise<void> {
  const kind = normalizeKind(rawKind);
  if (typeof window === 'undefined' || (!opts.force && !cinematicFlowEnabled())) {
    return Promise.resolve();
  }
  if (!ensureGl() || !gl || !overlayCanvas || !texA || !texB) {
    return Promise.resolve();
  }
  stopActiveTransition();

  const w = Math.max(320, Math.min(1600, Math.round(window.innerWidth * Math.min(window.devicePixelRatio || 1, 1.5))));
  const h = Math.max(240, Math.min(1600, Math.round(window.innerHeight * Math.min(window.devicePixelRatio || 1, 1.5))));
  overlayCanvas.width = w;
  overlayCanvas.height = h;
  overlayCanvas.style.display = 'block';

  const snapA = buildSceneSnapshotCanvas(opts.from);
  uploadTex(gl, texA, snapA);
  const hasB = !!opts.to;
  if (opts.to) {
    uploadTex(gl, texB, buildSceneSnapshotCanvas(opts.to));
  }

  if (typeof opts.holdProgress === 'number') {
    renderTransitionFrame(kind, opts.holdProgress, hasB, opts.mood ?? 0);
    return Promise.resolve();
  }

  const dur = opts.durationMs ?? DURATIONS[kind];
  const t0 = performance.now();
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      activeRaf = 0;
      activeStop = null;
      if (overlayCanvas) overlayCanvas.style.display = 'none';
      resolve();
    };
    activeStop = finish;
    const step = (now: number) => {
      if (done) return;
      const p = Math.min(1, (now - t0) / dur);
      renderTransitionFrame(kind, p, hasB, opts.mood ?? 0);
      if (p >= 1) {
        finish();
        return;
      }
      activeRaf = requestAnimationFrame(step);
    };
    renderTransitionFrame(kind, 0.004, hasB, opts.mood ?? 0);
    activeRaf = requestAnimationFrame(step);
  });
}

/** 安装窗口调试手柄：仅供 Vulkan 实机截图校验转场中间帧使用（无外网、只操作自身浮层）。 */
export function installTransitionDebugHandle(): void {
  if (typeof window === 'undefined') return;
  warmTransitionImages();
  (window as { __tsTransition?: unknown }).__tsTransition = {
    preview(rawKind: TransitionKindOrAlias, p: number, opts?: Partial<PlayTransitionOptions>) {
      const kind = normalizeKind(rawKind);
      const hasExplicitTo = opts ? Object.prototype.hasOwnProperty.call(opts, 'to') : false;
      return playTangSongTransition(kind, {
        from:
          opts?.from ?? {
            scene: kind === 'portal' ? 'loading' : kind === 'daybreak' ? 'select' : kind === 'flaps' ? 'matchmake' : 'match',
            heroId: 'sushi',
          },
        to: hasExplicitTo ? opts!.to : undefined,
        holdProgress: p,
        mood: opts?.mood ?? 0,
        force: true,
      });
    },
    stop: stopActiveTransition,
  };
}
