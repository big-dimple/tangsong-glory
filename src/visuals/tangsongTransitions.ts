/**
 * tangsongTransitions.ts — 移植自 5MB 视觉工程的四大原生 WebGL2 GLSL 物理/光学转场引擎
 *
 * 包含 4 套全 GPU 真实着色器转场（零运行时额外 npm 依赖，空闲时停机且常驻开销 = 0）：
 *   1. wash     (水墨青绿波浪冲刷 + Worley 泡沫蕾丝 + 折射悬挂水珠) — 大厅 → 寻将/点将，战败 → 结算
 *   2. slam     (雕版重印冲击：压印前径向空气暗角变焦 + 纸齿吃墨前沿 + 湿墨浮雕 + 61+37 飞散纤维) — 锁定 → 加载
 *   3. tear     (真实 3D 宣纸自上而下撕裂双半卷边 + 透光纤维毛边 + 36 片飘飞纸屑 + 双层投影) — 加载 → 实机 3D 战场
 *   4. daybreak (破晓 40-tap 黄金角猫眼散景 + 12-tap 清理 + Instanced 金色散景星芒粒子) — 胜利 → 结算殿堂
 */
import { HEROES, type HeroId } from '../config/heroes';
import { cinematicFlowEnabled } from '../ui/tangsongMotion';

export type TransitionKind = 'wash' | 'slam' | 'tear' | 'daybreak';

export interface SnapshotContext {
  scene: 'lobby' | 'select' | 'loading' | 'match' | 'result';
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
vec2 hash21(float p){vec3 p3=fract(vec3(p)*vec3(.1031,.1030,.0973));p3+=dot(p3,p3.yzx+33.33);return fract((p3.xx+p3.yz)*p3.zy);}
vec2 hash22(vec2 p){vec3 p3=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973));p3+=dot(p3,p3.yzx+33.33);return fract((p3.xx+p3.yz)*p3.zy);}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*f*(f*(f*6.-15.)+10.);return mix(mix(hash12(i),hash12(i+vec2(1,0)),f.x),mix(hash12(i+vec2(0,1)),hash12(i+vec2(1,1)),f.x),f.y);}
float vnoise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*f*(f*(f*6.-15.)+10.);return mix(mix(mix(hash13(i),hash13(i+vec3(1,0,0)),f.x),mix(hash13(i+vec3(0,1,0)),hash13(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash13(i+vec3(0,0,1)),hash13(i+vec3(1,0,1)),f.x),mix(hash13(i+vec3(0,1,1)),hash13(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec2 p){float a=.5,s=0.;mat2 m=mat2(.8,.6,-.6,.8);for(int i=0;i<4;i++){s+=a*vnoise(p);p=m*p*2.03;a*=.5;}return s;}
float fbm3(vec3 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*vnoise3(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return s;}
vec3 toLin(vec3 c){return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(.04045,c));}
vec3 toSrgb(vec3 c){c=max(c,0.);return mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(.0031308,c));}
float luma(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
`;

// ── 1. wash（青绿水墨冲刷 + Worley 泡沫蕾丝 + 弯曲折射水珠）──
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
  vec2 uv = abs(vUv + clamp(-gs * .055 * clamp(.5 + thick, 0., 1.6) - clamp(gw, -2.5, 2.5) * .085 * isW, -.35, .35) / vec2(uAsp, 1.));
  uv = 1. - abs(1. - uv);
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
  float alpha = uP < .4 ? 1. : wet * (1. - ss(.82, .97, uP));
  vec3 outC = mix(uP < .4 ? toLin(texture(tA, vUv).rgb) : c, c, wet);
  o = vec4(toSrgb(min(outC, vec3(1.))), clamp(alpha, 0., 1.));
}`;

// ── 2. slam（雕版重印冲击：压印前变焦空气暗角 + 宣纸吃墨前沿 + 湿墨边缘 + 辐射墨尘 + 纸纤维）──
const SLAM_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D tA, tB;
uniform float uP, uAsp, uHasB;
${GLSL_SHARED}
float sm5(float t){ t = clamp(t, 0., 1.); return t * t * t * (t * (t * 6. - 15.) + 10.); }
vec3 paperTone(vec2 p){
  float f = fbm(p * vec2(70., 64.)) - .5, g = vnoise(p * 430.) - .5;
  return vec3(.86, .835, .78) * (1. + f * .05 + g * .03);
}
float fibre(vec2 q, float n, float seed, float tau, float px){
  float a = atan(q.y, q.x), u = (a / 6.28318 + .5) * n, acc = 0.;
  for (int j = -1; j <= 1; j++) {
    float id = mod(floor(u) + float(j), n);
    vec2 h = hash22(vec2(id, seed)), h2 = hash22(vec2(id + 40., seed * 3.));
    float rr = .05 + (.25 + 1.25 * h.x) * (1. - exp(-tau * (2.2 + 2. * h2.y)));
    float an = ((id + .2 + .6 * h.y) / n - .5) * 6.28318 + (h2.x - .5) * .25 * tau;
    vec2 d = q - rr * vec2(cos(an), sin(an));
    float ro = an + (h2.y - .5) * 3. + tau * (h.y - .5) * 16.;
    d = mat2(cos(ro), sin(ro), -sin(ro), cos(ro)) * d;
    float len = .006 + .020 * h2.x * h2.x, w = .0012 + .0008 * h2.y;
    float s = smoothstep(w + px, w - px * .4, abs(d.y)) * smoothstep(len, len * .6, abs(d.x));
    acc = max(acc, s * (.4 + .6 * h.y));
  }
  return acc;
}
void main(){
  if (uP <= .001) { o = texture(tA, vUv); return; }
  if (uP >= .995) { o = vec4(0.); return; }
  const float IMP = .285;
  vec2 asp = vec2(uAsp, 1.), uC = vec2(.5, .48);
  float preK = clamp(uP / IMP, 0., 1.);
  float tau = (uP - IMP) * 1.35;
  if (tau < 0.) {
    vec2 d = vUv - uC;
    float z = 1. + .16 * preK * preK + .52 * preK * preK * preK * preK;
    float blur = .15 * preK * preK * preK;
    vec3 c = vec3(0.); float j = hash12(gl_FragCoord.xy);
    for (int i = 0; i < 10; i++) {
      float f = (float(i) + j) / 10. - .5;
      c += toLin(clamp(texture(tA, clamp(uC + d / (z * (1. + blur * f)), 0., 1.)).rgb, 0., 1.));
    }
    c *= .1 * (1. - .62 * sm5(preK) * smoothstep(.22, .78, length(d * vec2(1., .8))));
    float face = smoothstep(.42, 1., preK) * smoothstep(.65, .05, length(d * asp));
    c = mix(c, paperTone(d * asp * (1.5 - .5 * preK)), face * .65);
    o = vec4(toSrgb(c), 1.);
    return;
  }
  float decay = exp(-tau * 6.5), phase = tau * 34.;
  vec2 shake = vec2(sin(phase + .4) * .007 * decay, cos(phase * 1.27) * .013 * decay);
  float rot = sin(phase * .9 + 1.) * .006 * decay, zoom = 1. + .035 * exp(-tau * 9.) * cos(tau * 26.);
  vec2 d0 = (vUv - .5) * asp;
  d0 = mat2(cos(rot), sin(rot), -sin(rot), cos(rot)) * d0 / zoom;
  vec2 uv = d0 / asp + .5 + shake, q = (uv - uC) * asp;
  float r = length(q); vec2 dir = q / max(r, 1e-4);
  float uRing = .06 + 1.75 * (1. - exp(-tau * 2.3)), uDust = 2.9 * (1. - exp(-tau * 2.6)) - .42;
  float uEnd = smoothstep(.82, .97, uP);
  float x = r - uRing, env = exp(-x * x * 38.) * exp(-tau * 2.6), wob = sin(x * 34.) * env;
  float g = (cos(x * 34.) * 34. - 2. * 38. * x * sin(x * 34.)) * env / 34.;
  vec2 bu = clamp(uv - dir * g * .0085 / asp, 0., 1.);
  vec3 b = uHasB > .5 ? toLin(clamp(texture(tB, bu).rgb, 0., 1.)) : vec3(.09, .06, .05);
  vec3 pt = paperTone(q);
  float n = fbm(q * 9.) * .5 + vnoise(q * 120.) * .25 + vnoise(q * 330.) * .25;
  float age = (uDust - r) * 2.1 + .55;
  float press = mix(smoothstep(n - .10, n + .34, age - .12), 1., uEnd);
  float take = mix(press, smoothstep(0., .7, press), 1. - luma(b));
  vec3 c = mix(pt, b, take);
  float fresh = press * (1. - smoothstep(.55, 2.1, age)) * (1. - uEnd);
  c *= 1. - .12 * fresh * (1. - n) + dot(dir, normalize(vec2(-.5, .85))) * g * .16 + wob * .03;
  float dr = .16 + 1.5 * (1. - exp(-tau * 2.4)), dx = (r - dr) / (.10 + .34 * tau);
  float re = exp(-dx * dx * (dx > 0. ? 3.2 : 1.1)) * exp(-tau * 2.7) * (1. - uEnd);
  if (re > .006) {
    float a = atan(q.y, q.x); vec2 pol = vec2(cos(a), sin(a)) * 2.2;
    float dn = fbm3(vec3(pol * 1.6, r * 5. - tau * 3.5));
    c = mix(c, vec3(.34, .30, .24) * (.7 + .7 * dn), clamp(re * smoothstep(.30, .72, dn) * .85, 0., .8));
  }
  float fade = exp(-tau * 1.5) * (1. - smoothstep(.65, .95, tau));
  if (fade > .01) {
    float pxr = 1.2 / 720.;
    c = mix(c, vec3(.52, .48, .44), max(fibre(q, 61., 3., tau, pxr), fibre(q, 37., 11., tau * .8, pxr)) * fade * .9);
  }
  float alpha = 1. - smoothstep(.78, .98, uP);
  o = vec4(toSrgb(clamp(c, 0., 1.)), alpha);
}`;

// ── 3. tear（3D 双半宣纸撕裂卷边 + 透光纤维撕牙 + 36 片飞散纸屑 + 双层柔影）──
const TEAR_COMMON = `
uniform float uAsp, uP, uYf, uW2;
const float CAM = 3.0;
float slow(float y){ return .075 * sin(y * 2.1 + .8) + .034 * sin(y * 5.3 + 2.) + .012 * sin(y * 13. + .5); }
float openAt(float y){ return max(0., y - uYf); }
vec3 curl(vec2 P, float sg, out float phi, out float over){
  float h = openAt(P.y), d = (P.x - slow(P.y)) * sg;
  float R = .21 + .10 * smoothstep(0., 1.6, uW2) + .03 * P.y;
  float w = .36 * pow(h, 1.5) + uW2 * smoothstep(0., .3, h) * (1. + sg * .045 + .10 * P.y);
  float s = w - d, pull = sg * (.010 * smoothstep(0., .10, h) + .050 * h + .02 * h * h);
  float x = P.x, z = 0.; phi = 0.;
  over = exp(-max(d - w, 0.) / (R * .9)) * smoothstep(.15, 1.5, w / R);
  if (s > 0.) {
    phi = s / R;
    float xc = slow(P.y) + sg * w;
    if (phi < 3.14159) { x = xc - sg * R * sin(phi); z = R * (1. - cos(phi)); }
    else { x = xc + sg * (s - 3.14159 * R); z = 2. * R + .06 * (s - 3.14159 * R); phi = 3.14159; }
  }
  z += .02 * sin(P.y * 4. + uP * 17. + sg) * smoothstep(0., 1., max(s, 0.)) * 1.5;
  return vec3(x + pull, P.y - .02 * max(s, 0.) * smoothstep(.2, 1., h), z);
}
vec4 proj(vec3 w){ float k = (CAM - w.z) / CAM; return vec4(w.x / uAsp, w.y, 0., k); }
`;

const TEAR_SHEET_VERT = `#version 300 es
precision highp float;
in vec3 aPos;
out vec2 vP;
out float vPhi, vOver;
flat out float vSg;
${TEAR_COMMON}
void main(){
  float sg = aPos.z, y = mix(-1., 1., aPos.y);
  float outer = sg * uAsp, inner = slow(y) - sg * .085;
  vP = vec2(mix(outer, inner, aPos.x), y);
  vSg = sg;
  gl_Position = proj(curl(vP, sg, vPhi, vOver));
}`;

const TEAR_SHEET_FRAG = `#version 300 es
precision highp float;
in vec2 vP;
in float vPhi, vOver;
flat in float vSg;
out vec4 o;
uniform sampler2D tA;
${GLSL_SHARED}
${TEAR_COMMON}
float tearFine(float y){ return .022*(fbm(vec2(y*9.,3.))-.5)*2. + .007*(vnoise(vec2(y*60.,7.))-.5); }
float fibres(float e, float y, float px, float seed){
  float a = 0.;
  for (int L = 0; L < 2; L++) {
    float n = L == 0 ? 70. : 160., c = floor(y * n);
    for (int j = -2; j <= 2; j++) {
      float id = c + float(j);
      vec2 h = hash22(vec2(id, seed + float(L) * 7.)), h2 = hash22(vec2(id + 31., seed + float(L) * 3.));
      float len = (L == 0 ? .030 : .014) * h.y * h.y * (.4 + .6 * h2.y);
      float y0 = (id + h.x) / n, k = clamp(-e / max(len, 1e-4), 0., 1.);
      float yy = y0 + (h2.x - .5) * len * 1.3 * k + (h2.y - .5) * len * 1.6 * k * k;
      float wd = (L == 0 ? .0013 : .0008) * (1. - .75 * k);
      a = max(a, smoothstep(px * .7, -px * .5, abs(y - yy) - wd) * smoothstep(0., .0025, len + e));
    }
  }
  return a;
}
void main(){
  float y = vP.y, h = openAt(y);
  float op = h > 0. ? smoothstep(.002, .05, h + .006 * (vnoise(vec2(y * 40., 1.)) - .5)) : 0.;
  float e0 = (vP.x - slow(y)) * vSg;
  bool nr = e0 < .15, front = gl_FrontFacing;
  vec2 uv = vec2(vP.x / uAsp, y) * .5 + .5;
  float e = nr ? (vP.x - slow(y) - tearFine(y)) * vSg : e0;
  float px = max(fwidth(e0), 1e-5);
  float al = 1.;
  if (e < .16) {
    float f = e < .004 ? fibres(e, y, max(px, fwidth(y)), vSg * 5.) : 0.;
    al = max(smoothstep(-px * .7, px * .7, e + mix(.02, 0., smoothstep(0., .012, h))), f * op);
  }
  if (al <= .003) discard;
  vec3 n = vec3(vSg * sin(vPhi), 0., cos(vPhi));
  const vec3 L = normalize(vec3(-.38, .42, .82));
  float core = 0.;
  if (nr && op > 0.) {
    float share = smoothstep(.38, .62, fbm(vec2(y * 5.5, 11.)));
    float wide = .008 + .052 * (vSg < 0. ? share : 1. - share) * (.55 + .9 * fbm(vec2(y * 14., vSg * 5.)));
    core = (wide + .010 * (fbm(vec2(y * 38., vSg * 9.)) - .5)) * op;
    if (!front) core *= .45;
  }
  vec3 ink = front ? toLin(clamp(texture(tA, uv).rgb, 0., 1.)) : vec3(.14, .12, .09) * (.75 + .5 * fbm(vP * vec2(70., 55.)));
  float edge = core > 0. ? smoothstep(-px, px, e - core) : 1.;
  vec3 c = ink; float tone = 1.;
  if (e < core + .02 && op > 0.) {
    float q = clamp(e / max(core, .001), 0., 1.);
    float str = vnoise(vec2(e * 70., y * 280.)) * .5 + vnoise(vec2(e * 150., y * 500.)) * .5;
    vec3 w = vec3(.95, .92, .84) * (.82 + .16 * str) * mix(.90, 1., smoothstep(0., .5, q));
    w *= 1. - .28 * exp(-max(core - e, 0.) / .0045);
    c = mix(w, ink, edge);
    tone = mix(1., 0., edge);
  }
  vec3 N = front ? n : -n;
  float dl = max(dot(N, L), 0.);
  c *= front ? mix(1., (.36 + .64 * dl / L.z), smoothstep(0., .25, vPhi)) : (.22 + 1.15 * dl * dl);
  c += vec3(1., .96, .88) * pow(max(dot(N, normalize(L + vec3(0., 0., 1.))), 0.), front ? 26. : 14.) * smoothstep(0., .35, vPhi) * .08 * (1. - tone * .75);
  c *= 1. - .72 * vOver * (1. - smoothstep(0., .9, vPhi));
  al *= 1. - smoothstep(.90, .99, uP);
  o = vec4(toSrgb(clamp(c, 0., 1.)) * al, al);
}`;

const TEAR_SCRAPS = 36;
const TEAR_SCRAP_VERT = `#version 300 es
precision highp float;
in vec2 aPos;
out vec2 vQ;
flat out vec4 vS;
out float vK;
uniform float uT;
${GLSL_SHARED}
${TEAR_COMMON}
void main(){
  float i = float(gl_InstanceID);
  vec2 h = hash21(i * 1.7 + 2.), h2 = hash21(i * 3.1 + 9.), h3 = hash21(i * 5.7 + 4.);
  float y0 = mix(-.98, 1.02, (i + h.x) / ${TEAR_SCRAPS}.);
  float t0 = (.02 + .54 * clamp((1.08 - y0) / 2.4, 0., 1.)) * 1.45 + h.y * .10;
  float t = uT - t0;
  if (t <= 0.) { gl_Position = vec4(2.); return; }
  float sz = mix(.009, .036, h2.x * h2.x), drag = 1. - exp(-t * 1.6);
  vec3 c = vec3(slow(y0) + (h2.y - .5) * 1.1 * drag, y0 + (.25 * h3.x + .05) * drag - (.55 + .5 * h3.y) * t * t, .05 + .5 * h3.x * drag);
  float a1 = t * (4. + 9. * h3.y) * (h.x > .5 ? 1. : -1.) + i, a2 = t * (5. + 8. * h.y) + i * 2.;
  vec2 q = aPos * sz * vec2(1., .75);
  float ca = cos(a1), sa = sin(a1), cb = cos(a2), sb = sin(a2);
  vec3 P = vec3(q.x * ca - q.y * sa, (q.x * sa + q.y * ca) * cb, (q.x * sa + q.y * ca) * sb);
  gl_Position = proj(c + P);
  vQ = aPos; vS = vec4(h, h2); vK = sb;
}`;

const TEAR_SCRAP_FRAG = `#version 300 es
precision highp float;
in vec2 vQ;
flat in vec4 vS;
in float vK;
out vec4 o;
uniform float uP;
${GLSL_SHARED}
void main(){
  float a = atan(vQ.y, vQ.x), r = length(vQ), sd = 3. + floor(vS.z * 2.99);
  float R = .50 / cos(mod(a + vS.w * 6.28, 6.2832 / sd) - 3.14159 / sd) + .24 * (vnoise(vec2(cos(a), sin(a)) * 2. + vS.xy * 40.) - .5);
  float px = fwidth(r), al = smoothstep(R + px, R - px, r) * (1. - smoothstep(.86, .99, uP));
  if (al < .01) discard;
  vec3 w = vec3(.93, .90, .82) * (.82 + .18 * vnoise(vQ * 9.));
  vec3 c = w * (.62 + .38 * abs(vK) + .25 * max(vK, 0.));
  o = vec4(c * al, al);
}`;

// ── 4. daybreak（破晓 40-tap 猫眼散景 + 暖金浮光散景粒子）──
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
  // 两层错频错位猫眼散景柔光晕（柔边、口径蚀、随亮度淡出，取代规则网格小圆点）
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
  float alpha = 1. - ss(.82, .98, p);
  o = vec4(toSrgb(clamp(c, 0., 1.)), alpha);
}`;

interface ProgramRecord {
  prog: WebGLProgram;
  vao: WebGLVertexArrayObject;
  uniforms: Record<string, WebGLUniformLocation | null>;
}

const DURATIONS: Record<TransitionKind, number> = {
  wash: 920,
  slam: 950,
  tear: 1350,
  daybreak: 1180,
};

let overlayCanvas: HTMLCanvasElement | null = null;
let gl: WebGL2RenderingContext | null = null;
let texA: WebGLTexture | null = null;
let texB: WebGLTexture | null = null;
let programs: Partial<Record<TransitionKind | 'tearScrap', ProgramRecord>> = {};
let tearSheetVertCount = 0;
let tearSheetIndexCount = 0;
let activeRaf = 0;
let activeStop: (() => void) | null = null;
const imgCache = new Map<string, HTMLImageElement>();

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

function linkProgram(g: WebGL2RenderingContext, vsSrc: string, fsSrc: string, uniformNames: string[]): WebGLProgram {
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
  void uniformNames;
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

function createTearSheetVao(g: WebGL2RenderingContext, prog: WebGLProgram): WebGLVertexArrayObject {
  const segX = 90;
  const segY = 72;
  const verts: number[] = [];
  const indices: number[] = [];
  for (const sg of [-1, 1]) {
    const base = verts.length / 3;
    for (let ix = 0; ix <= segX; ix++) {
      for (let iy = 0; iy <= segY; iy++) verts.push(ix / segX, iy / segY, sg);
    }
    for (let ix = 0; ix < segX; ix++) {
      for (let iy = 0; iy < segY; iy++) {
        const s = base + ix * (segY + 1) + iy;
        const m = s + segY + 1;
        if (sg < 0) indices.push(s, m, m + 1, s, m + 1, s + 1);
        else indices.push(s, m + 1, m, s, s + 1, m + 1);
      }
    }
  }
  tearSheetVertCount = verts.length / 3;
  tearSheetIndexCount = indices.length;

  const vao = g.createVertexArray()!;
  g.bindVertexArray(vao);
  const vbo = g.createBuffer()!;
  g.bindBuffer(g.ARRAY_BUFFER, vbo);
  g.bufferData(g.ARRAY_BUFFER, new Float32Array(verts), g.STATIC_DRAW);
  const loc = g.getAttribLocation(prog, 'aPos');
  g.enableVertexAttribArray(loc);
  g.vertexAttribPointer(loc, 3, g.FLOAT, false, 0, 0);
  const ibo = g.createBuffer()!;
  g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, ibo);
  g.bufferData(g.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), g.STATIC_DRAW);
  g.bindVertexArray(null);
  return vao;
}

function createTearScrapVao(g: WebGL2RenderingContext, prog: WebGLProgram): WebGLVertexArrayObject {
  const vao = g.createVertexArray()!;
  g.bindVertexArray(vao);
  const vbo = g.createBuffer()!;
  g.bindBuffer(g.ARRAY_BUFFER, vbo);
  g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]), g.STATIC_DRAW);
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
  g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, 2, 2, 0, g.RGBA, g.UNSIGNED_BYTE, new Uint8Array([14, 24, 26, 255, 14, 24, 26, 255, 14, 24, 26, 255, 14, 24, 26, 255]));
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

    const washProg = linkProgram(gl, VERT_FULL, WASH_FRAG, []);
    programs.wash = {
      prog: washProg,
      vao: createFullscreenVao(gl, washProg),
      uniforms: getLocations(gl, washProg, ['tA', 'tB', 'uP', 'uAsp', 'uHasB', 'uMood']),
    };

    const slamProg = linkProgram(gl, VERT_FULL, SLAM_FRAG, []);
    programs.slam = {
      prog: slamProg,
      vao: createFullscreenVao(gl, slamProg),
      uniforms: getLocations(gl, slamProg, ['tA', 'tB', 'uP', 'uAsp', 'uHasB']),
    };

    const tearProg = linkProgram(gl, TEAR_SHEET_VERT, TEAR_SHEET_FRAG, []);
    programs.tear = {
      prog: tearProg,
      vao: createTearSheetVao(gl, tearProg),
      uniforms: getLocations(gl, tearProg, ['tA', 'uAsp', 'uP', 'uYf', 'uW2']),
    };

    const scrapProg = linkProgram(gl, TEAR_SCRAP_VERT, TEAR_SCRAP_FRAG, []);
    programs.tearScrap = {
      prog: scrapProg,
      vao: createTearScrapVao(gl, scrapProg),
      uniforms: getLocations(gl, scrapProg, ['uAsp', 'uP', 'uYf', 'uW2', 'uT']),
    };

    const dayProg = linkProgram(gl, VERT_FULL, DAYBREAK_FRAG, []);
    programs.daybreak = {
      prog: dayProg,
      vao: createFullscreenVao(gl, dayProg),
      uniforms: getLocations(gl, dayProg, ['tA', 'tB', 'uP', 'uAsp', 'uHasB']),
    };
  }
  return true;
}

function drawCoverImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number, posX = 0.5, posY = 0.5): void {
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
      ctx.drawImage(snap.sourceCanvas, 0, 0, w, h);
      return cv;
    } catch {
      // 安全降级到下方绘卷合成
    }
  }

  const artMap: Record<SnapshotContext['scene'], string> = {
    lobby: '/assets/art/lobby-scroll.webp',
    select: '/assets/art/select-pavilion.webp',
    loading: '/assets/art/loading-bg.webp',
    match: '/assets/art/loading-bg.webp',
    result: snap.win === false ? '/assets/art/defeat-bg.webp' : '/assets/art/victory-bg.webp',
  };

  const bg = preloadImage(artMap[snap.scene]);
  if (bg) drawCoverImage(ctx, bg, w, h, snap.scene === 'lobby' ? (portrait ? 0.74 : 0.62) : 0.5, snap.scene === 'lobby' ? (portrait ? 0.5 : 0.38) : 0.5);

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(10, 14, 16, 0.45)');
  grad.addColorStop(0.45, 'rgba(10, 14, 16, 0.10)');
  grad.addColorStop(1, 'rgba(10, 14, 16, 0.72)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  if (snap.scene === 'lobby') {
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
      drawRow(blue, 210, '#6bb4db');
      drawRow(red, 540, '#f05a46');
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

const invLerp = (a: number, b: number, v: number) => Math.max(0, Math.min(1, (v - a) / (b - a)));
const smoothstep = (t: number) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};

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

  if (kind === 'tear') {
    let s = invLerp(0.02, 0.56, p);
    s = s + (smoothstep(s) - s) * 0.55;
    s += (0.012 * Math.sin(s * 26) + 0.005 * Math.sin(s * 61)) * Math.sin(Math.PI * s);
    const yf = 1.08 - 2.4 * s;
    const open = invLerp(0.37, 0.995, p);
    const w2 = (asp + 0.98) * Math.pow(open, 2.1) * (1.35 - 0.35 * open);

    // 双半投影叠加柔底阴影在实机战场画布上方
    const pr = programs.tear!;
    gl.useProgram(pr.prog);
    gl.bindVertexArray(pr.vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texA);
    gl.uniform1i(pr.uniforms.tA, 0);
    gl.uniform1f(pr.uniforms.uAsp, asp);
    gl.uniform1f(pr.uniforms.uP, p);
    gl.uniform1f(pr.uniforms.uYf, yf);
    gl.uniform1f(pr.uniforms.uW2, w2);
    gl.drawElements(gl.TRIANGLES, tearSheetIndexCount, gl.UNSIGNED_INT, 0);

    const sc = programs.tearScrap!;
    gl.useProgram(sc.prog);
    gl.bindVertexArray(sc.vao);
    gl.uniform1f(sc.uniforms.uAsp, asp);
    gl.uniform1f(sc.uniforms.uP, p);
    gl.uniform1f(sc.uniforms.uYf, yf);
    gl.uniform1f(sc.uniforms.uW2, w2);
    gl.uniform1f(sc.uniforms.uT, p * 1.45);
    gl.drawElementsInstanced(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0, TEAR_SCRAPS);
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

export function playTangSongTransition(kind: TransitionKind, opts: PlayTransitionOptions): Promise<void> {
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
    preview(kind: TransitionKind, p: number, opts?: Partial<PlayTransitionOptions>) {
      return playTangSongTransition(kind, {
        from: opts?.from ?? { scene: kind === 'tear' ? 'loading' : kind === 'daybreak' ? 'match' : kind === 'slam' ? 'select' : 'lobby', heroId: 'sushi' },
        to: opts?.to ?? { scene: kind === 'wash' ? 'select' : kind === 'slam' ? 'loading' : 'result', heroId: 'sushi', win: true },
        holdProgress: p,
        mood: opts?.mood ?? 0,
        force: true,
      });
    },
    stop: stopActiveTransition,
    clearTexCount: () => void tearSheetVertCount,
  };
}
