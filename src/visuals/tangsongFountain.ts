/**
 * tangsongFountain.ts — 瑶池仙雾泉水圣地 · 双掌抵背内力疗伤 · 头顶翠绿 +++ 浮字
 *
 * 1. 瑶池仙泉结界（createFountainSanctuary）：
 *    - 在双方泉水四周升起双层流动的碧玉青雾与金色仙雾帷幔，明确标示治疗/护盾边界；
 *    - 地表叠加柔亮翠玉仙雾晕环与环绕灵点，既有《千里江山》神韵又不挡脚下战斗读取；
 *    - 英雄回泉水且未满血/满蓝时，自动在英雄身后半步悬浮凝出一双碧玉金纹手掌（「双掌抵背 · 内力运功」），
 *      绝无五官怪脸违和感，配缓慢旋转八卦灵环与直抵后心的翠金内力气柱。
 * 2. 头顶翠绿 +++ 飘字（tickFountainPopups）：
 *    - 在泉水内持续治疗时，每隔 ~0.26s 在英雄头顶随机飘出 `+` / `++` / `+++` 与阶段回血数字。
 */
import { prefersReducedMotion } from '../ui/tangsongMotion';

export interface FountainThreeVec3 {
  x: number;
  y: number;
  z: number;
  set(x: number, y: number, z: number): void;
}

export interface FountainObject3D {
  name: string;
  visible: boolean;
  position: { x: number; y: number; z: number; set(x: number, y: number, z: number): void };
  rotation: { x: number; y: number; z: number; set(x: number, y: number, z: number): void };
  scale: { x: number; y: number; z: number; set(x: number, y: number, z: number): void; setScalar(s: number): void };
  add(child: FountainObject3D): void;
  material?: { opacity: number; dispose?: () => void };
  geometry?: { dispose?: () => void };
}

export interface FountainApi {
  Ji: new () => FountainObject3D;
  Sn: new (geo: unknown, mat: unknown) => FountainObject3D;
  Gl: new (w?: number, h?: number, ws?: number, hs?: number) => {
    rotateX(rad: number): void;
    dispose(): void;
  };
  uf: new (
    rt?: number,
    rb?: number,
    h?: number,
    rs?: number,
    hs?: number,
    openEnded?: boolean,
  ) => { dispose(): void };
  yM: new (opts: Record<string, unknown>) => { opacity: number; dispose(): void };
  Z7: new (canvas: HTMLCanvasElement) => {
    wrapS: number;
    wrapT: number;
    repeat: { set(x: number, y: number): void };
    offset: { x: number; y: number; set(x: number, y: number): void };
    needsUpdate: boolean;
    dispose(): void;
  };
  fi: number;
  Qc?: unknown;
  gn?: unknown;
  yt?: unknown;
  map: {
    bases: {
      team: number;
      fountain: { x: number; y: number };
      fountainRadius: number;
    }[];
  };
}

export interface FountainHeroLike {
  id: number;
  team: number;
  alive: boolean;
  hp: number;
  mana: number;
  facing: number;
  radius: number;
  stats: { maxHp: number; maxMana: number };
  pos: { x: number; y: number };
  visible: Record<number, boolean>;
}

export interface FountainStateLike {
  playerId?: number;
  playerTeam?: number;
  over?: boolean;
  heroes: FountainHeroLike[];
}

export interface FountainPopupSystemLike {
  text: {
    get(
      text: string,
      size: number,
      color: string,
      stroke: string,
      weight?: number,
    ): unknown;
  };
  spawn(
    targetId: number,
    world: unknown,
    wx: number,
    wy: number,
    style: number,
    text: string,
    scale: number,
    alpha: number,
    crit: boolean,
  ): {
    sprite: unknown;
    ox: number;
    oy: number;
    life: number;
    dir: number;
  } | null;
}

const TAU = Math.PI * 2;
const REPEAT_WRAPPING = 1000;
const NORMAL_BLENDING = 1;
const ADDITIVE_BLENDING = 2;

function createMistWallTexture(Z7: FountainApi['Z7']) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d');
  if (g) {
    // 底部翠玉光带（清楚圈定仙泉边界）
    const baseGrad = g.createLinearGradient(0, 256, 0, 0);
    baseGrad.addColorStop(0.0, 'rgba(90, 245, 178, 0.88)');
    baseGrad.addColorStop(0.14, 'rgba(128, 248, 198, 0.52)');
    baseGrad.addColorStop(0.45, 'rgba(205, 255, 232, 0.24)');
    baseGrad.addColorStop(0.82, 'rgba(232, 252, 240, 0.06)');
    baseGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
    g.fillStyle = baseGrad;
    g.fillRect(0, 0, 512, 256);

    // 水平可平铺青绿金边祥云雾团（x 轴 0 & 512 成对出现确保无缝接缝）
    for (let i = 0; i < 18; i++) {
      const cx = ((i * 512) / 18 + (i % 3) * 14) % 512;
      const cy = 110 + Math.sin(i * 1.9) * 52;
      const rx = 54 + (i % 4) * 18;
      const ry = 22 + (i % 3) * 9;
      for (const ox of [-512, 0, 512]) {
        const rg = g.createRadialGradient(cx + ox, cy, 4, cx + ox, cy, rx);
        rg.addColorStop(0, i % 3 === 0 ? 'rgba(255, 236, 176, 0.28)' : 'rgba(126, 255, 200, 0.34)');
        rg.addColorStop(0.55, 'rgba(176, 250, 220, 0.14)');
        rg.addColorStop(1, 'rgba(176, 250, 220, 0)');
        g.save();
        g.translate(cx + ox, cy);
        g.scale(1, ry / rx);
        g.fillStyle = rg;
        g.beginPath();
        g.arc(0, 0, rx, 0, TAU);
        g.fill();
        g.restore();
      }
    }

    // 细碎金碧灵尘点缀
    for (let i = 0; i < 36; i++) {
      const px = (i * 73 + 29) % 512;
      const py = 56 + ((i * 47) % 175);
      const pr = 1.6 + (i % 3) * 1.2;
      g.fillStyle = i % 4 === 0 ? 'rgba(255, 230, 148, 0.72)' : 'rgba(136, 255, 205, 0.65)';
      g.beginPath();
      g.arc(px, py, pr, 0, TAU);
      g.fill();
    }
  }
  const tex = new Z7(c);
  tex.wrapS = REPEAT_WRAPPING;
  tex.repeat.set(2, 1);
  tex.needsUpdate = true;
  return tex;
}

function createGroundSanctuaryTexture(Z7: FountainApi['Z7']) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  if (g) {
    const cx = 128;
    const cy = 128;
    const rg = g.createRadialGradient(cx, cy, 18, cx, cy, 124);
    rg.addColorStop(0, 'rgba(120, 255, 202, 0.22)');
    rg.addColorStop(0.58, 'rgba(72, 228, 165, 0.09)');
    rg.addColorStop(0.84, 'rgba(98, 248, 182, 0.36)');
    rg.addColorStop(0.91, 'rgba(255, 224, 140, 0.56)');
    rg.addColorStop(0.97, 'rgba(90, 240, 175, 0.16)');
    rg.addColorStop(1, 'rgba(90, 240, 175, 0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, 256, 256);

    // 外缘云气瓣纹
    g.strokeStyle = 'rgba(170, 255, 220, 0.42)';
    g.lineWidth = 2;
    for (let i = 0; i < 16; i++) {
      const a0 = (i / 16) * TAU;
      const a1 = a0 + 0.26;
      g.beginPath();
      g.arc(cx, cy, 108 + (i % 2) * 5, a0, a1);
      g.stroke();
    }
  }
  const tex = new Z7(c);
  tex.needsUpdate = true;
  return tex;
}

/** 绘画「双掌抵背 · 内力输功」纯意象光掌纹理（无任何人物五官） */
function createDualPalmTexture(Z7: FountainApi['Z7']) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  if (g) {
    // 柔亮翠金真气背景晕
    const bg = g.createRadialGradient(128, 132, 16, 128, 132, 118);
    bg.addColorStop(0, 'rgba(255, 244, 190, 0.5)');
    bg.addColorStop(0.36, 'rgba(92, 248, 176, 0.38)');
    bg.addColorStop(0.76, 'rgba(42, 184, 138, 0.12)');
    bg.addColorStop(1, 'rgba(42, 184, 138, 0)');
    g.fillStyle = bg;
    g.fillRect(0, 0, 256, 256);

    const drawPalm = (side: -1 | 1) => {
      g.save();
      g.translate(128 + side * 44, 138);
      g.rotate(side * 0.14);

      // 广袖余岚
      const sleeve = g.createLinearGradient(0, 20, 0, 92);
      sleeve.addColorStop(0, 'rgba(110, 248, 192, 0.56)');
      sleeve.addColorStop(1, 'rgba(64, 196, 152, 0)');
      g.fillStyle = sleeve;
      g.beginPath();
      g.moveTo(-20, 24);
      g.quadraticCurveTo(-24, 62, -32, 92);
      g.lineTo(28, 92);
      g.quadraticCurveTo(22, 62, 18, 24);
      g.closePath();
      g.fill();

      // 掌心金翠辉光
      const palmGlow = g.createRadialGradient(0, 0, 4, 0, 0, 44);
      palmGlow.addColorStop(0, 'rgba(255, 248, 198, 0.96)');
      palmGlow.addColorStop(0.55, 'rgba(66, 232, 156, 0.72)');
      palmGlow.addColorStop(1, 'rgba(24, 138, 96, 0)');
      g.fillStyle = palmGlow;
      g.beginPath();
      g.arc(0, 0, 44, 0, TAU);
      g.fill();

      // 手掌轮廓 + 五指（深翠描边 + 亮碧玉掌面 + 鎏金掌缘，从俯视角一眼认出双掌抵背）
      g.fillStyle = 'rgba(132, 252, 192, 0.96)';
      g.strokeStyle = 'rgba(10, 58, 36, 0.96)';
      g.lineWidth = 3.2;
      g.beginPath();
      g.ellipse(0, 8, 21, 24, 0, 0, TAU);
      g.fill();
      g.stroke();

      const fingers: [number, number, number, number, number][] = [
        [-18 * side, 4, 4.8, 15, -0.46 * side],
        [-11.5 * side, -22, 4.3, 19, -0.14 * side],
        [-2 * side, -28, 4.5, 22, -0.03 * side],
        [7.5 * side, -24, 4.2, 19.5, 0.08 * side],
        [15.5 * side, -17, 3.8, 15.5, 0.2 * side],
      ];
      for (const [fx, fy, rx, ry, rot] of fingers) {
        g.save();
        g.translate(fx, fy);
        g.rotate(rot);
        g.beginPath();
        g.ellipse(0, 0, rx, ry, 0, 0, TAU);
        g.fill();
        g.stroke();
        g.restore();
      }
      g.strokeStyle = 'rgba(255, 222, 128, 0.92)';
      g.lineWidth = 1.6;
      g.beginPath();
      g.ellipse(0, 8, 18, 21, 0, 0, TAU);
      g.stroke();

      // 劳宫穴暖金气核
      const core = g.createRadialGradient(0, 6, 1, 0, 6, 13);
      core.addColorStop(0, '#fffce6');
      core.addColorStop(0.45, '#86ffbe');
      core.addColorStop(1, 'rgba(134, 255, 190, 0)');
      g.fillStyle = core;
      g.beginPath();
      g.arc(0, 6, 13, 0, TAU);
      g.fill();

      g.restore();
    };

    drawPalm(-1);
    drawPalm(1);
  }
  const tex = new Z7(c);
  tex.needsUpdate = true;
  return tex;
}

function createQiHaloTexture(Z7: FountainApi['Z7']) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  if (g) {
    const cx = 128;
    const cy = 128;
    g.strokeStyle = 'rgba(255, 224, 136, 0.78)';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(cx, cy, 98, 0, TAU);
    g.stroke();

    g.strokeStyle = 'rgba(104, 255, 190, 0.65)';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(cx, cy, 78, 0, TAU);
    g.stroke();

    // 八卦方位断弧装饰
    for (let i = 0; i < 8; i++) {
      const a0 = (i / 8) * TAU + 0.08;
      const a1 = a0 + TAU / 8 - 0.16;
      g.strokeStyle = i % 2 === 0 ? 'rgba(255, 232, 166, 0.82)' : 'rgba(116, 255, 198, 0.78)';
      g.lineWidth = 3.2;
      g.beginPath();
      g.arc(cx, cy, 88, a0, a1);
      g.stroke();
    }
  }
  const tex = new Z7(c);
  tex.needsUpdate = true;
  return tex;
}

function createQiBeamTexture(Z7: FountainApi['Z7']) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const g = c.getContext('2d');
  if (g) {
    const grad = g.createLinearGradient(0, 0, 128, 0);
    grad.addColorStop(0, 'rgba(255, 236, 166, 0.86)');
    grad.addColorStop(0.45, 'rgba(98, 252, 182, 0.68)');
    grad.addColorStop(1, 'rgba(140, 255, 206, 0)');
    g.fillStyle = grad;
    const vFade = g.createRadialGradient(64, 32, 4, 64, 32, 64);
    vFade.addColorStop(0, 'rgba(120, 255, 192, 0.85)');
    vFade.addColorStop(0.55, 'rgba(255, 232, 152, 0.45)');
    vFade.addColorStop(1, 'rgba(120, 255, 192, 0)');
    g.fillStyle = vFade;
    g.fillRect(0, 0, 128, 64);
  }
  const tex = new Z7(c);
  tex.needsUpdate = true;
  return tex;
}

export function createFountainSanctuary(api: FountainApi) {
  const { Ji, Sn, Gl, uf, yM, Z7, fi, map } = api;
  const group = new Ji();
  group.name = 'tangsong-fountain-sanctuary';

  const mistTex = createMistWallTexture(Z7);
  const groundTex = createGroundSanctuaryTexture(Z7);
  const palmTex = createDualPalmTexture(Z7);
  const haloTex = createQiHaloTexture(Z7);
  const beamTex = createQiBeamTexture(Z7);

  const outerMistMats: { opacity: number; dispose(): void }[] = [];
  const innerMistMats: { opacity: number; dispose(): void }[] = [];
  const groundMats: { opacity: number; dispose(): void }[] = [];
  const disposables: { dispose(): void }[] = [mistTex, groundTex, palmTex, haloTex, beamTex];

  const outerCyls: { mesh: FountainObject3D; r: number; cx: number; cz: number }[] = [];
  const innerCyls: FountainObject3D[] = [];
  const orbRings: { cx: number; cz: number; r: number; baseA: number; mesh: FountainObject3D }[] = [];

  // 仙泉灵点共用材质与八角灵珠几何
  const orbGeo = new uf(0.08, 0.08, 0.14, 6, 1, false);
  const orbMat = new yM({
    color: 0x76ffbe,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: ADDITIVE_BLENDING,
  });
  disposables.push(orbGeo, orbMat);

  for (const base of map.bases) {
    const cx = base.fountain.x;
    const cz = base.fountain.y;
    const r = base.fountainRadius;

    const groundGeo = new Gl(r * 2.24, r * 2.24, 1, 1);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new yM({
      map: groundTex,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      blending: ADDITIVE_BLENDING,
      side: fi,
    });
    const groundMesh = new Sn(groundGeo, groundMat);
    groundMesh.name = `fountain-ground-${base.team}`;
    groundMesh.position.set(cx, 0.08, cz);
    group.add(groundMesh);
    groundMats.push(groundMat);
    disposables.push(groundGeo, groundMat);

    const outerGeo = new uf(r * 1.01, r * 0.96, 1.38, 36, 1, true);
    const outerMat = new yM({
      map: mistTex,
      transparent: true,
      opacity: 0.56,
      depthWrite: false,
      blending: ADDITIVE_BLENDING,
      side: fi,
    });
    const outerMesh = new Sn(outerGeo, outerMat);
    outerMesh.name = `fountain-mist-outer-${base.team}`;
    outerMesh.position.set(cx, 0.74, cz);
    group.add(outerMesh);
    outerCyls.push({ mesh: outerMesh, r, cx, cz });
    outerMistMats.push(outerMat);
    disposables.push(outerGeo, outerMat);

    const innerGeo = new uf(r * 0.89, r * 0.92, 0.76, 28, 1, true);
    const innerMat = new yM({
      map: mistTex,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
      blending: ADDITIVE_BLENDING,
      side: fi,
    });
    const innerMesh = new Sn(innerGeo, innerMat);
    innerMesh.name = `fountain-mist-inner-${base.team}`;
    innerMesh.position.set(cx, 0.42, cz);
    group.add(innerMesh);
    innerCyls.push(innerMesh);
    innerMistMats.push(innerMat);
    disposables.push(innerGeo, innerMat);

    for (let i = 0; i < 3; i++) {
      const m = new Sn(orbGeo, orbMat);
      m.name = `fountain-mote-${base.team}-${i}`;
      group.add(m);
      orbRings.push({ cx, cz, r: r * 0.91, baseA: (i / 3) * TAU + base.team * 0.7, mesh: m });
    }
  }

  // 双掌抵背内力运功池（预分配 5 套，零 GC 分配）
  interface PalmRig {
    root: FountainObject3D;
    palmMesh: FountainObject3D;
    haloMesh: FountainObject3D;
    beamMesh: FountainObject3D;
    palmMat: { opacity: number; dispose(): void };
    haloMat: { opacity: number; dispose(): void };
    beamMat: { opacity: number; dispose(): void };
    fade: number;
  }
  const palmGeo = new Gl(1.24, 1.24, 1, 1);
  const haloGeo = new Gl(1.48, 1.48, 1, 1);
  const beamGeo = new Gl(0.96, 0.64, 1, 1);
  disposables.push(palmGeo, haloGeo, beamGeo);

  const palmRigs: PalmRig[] = [];
  for (let i = 0; i < 5; i++) {
    const rigRoot = new Ji();
    rigRoot.name = `fountain-palm-rig-${i}`;
    rigRoot.visible = false;

    const palmMat = new yM({
      map: palmTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: NORMAL_BLENDING,
      side: fi,
    });
    const haloMat = new yM({
      map: haloTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: ADDITIVE_BLENDING,
      side: fi,
    });
    const beamMat = new yM({
      map: beamTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: ADDITIVE_BLENDING,
      side: fi,
    });
    disposables.push(palmMat, haloMat, beamMat);

    const haloMesh = new Sn(haloGeo, haloMat);
    haloMesh.rotation.set(-0.48, 0, 0);
    haloMesh.position.set(0, 0.04, -0.08);
    rigRoot.add(haloMesh);

    const palmMesh = new Sn(palmGeo, palmMat);
    palmMesh.rotation.set(-0.48, 0, 0);
    palmMesh.position.set(0, 0.04, 0.02);
    rigRoot.add(palmMesh);

    const beamMesh = new Sn(beamGeo, beamMat);
    beamMesh.rotation.set(0, Math.PI / 2, 0);
    beamMesh.position.set(0, -0.02, 0.42);
    rigRoot.add(beamMesh);

    group.add(rigRoot);
    palmRigs.push({ root: rigRoot, palmMesh, haloMesh, beamMesh, palmMat, haloMat, beamMat, fade: 0 });
  }

  let time = 0;
  let lowQuality = false;

  return {
    group,
    setQuality(q: { groundDetail?: number; particles?: number }) {
      lowQuality = (q?.groundDetail ?? 1) === 0 || (q?.particles ?? 1) < 0.5;
      for (const m of innerCyls) m.visible = !lowQuality;
      for (const mat of outerMistMats) mat.opacity = lowQuality ? 0.34 : 0.56;
      for (const mat of groundMats) mat.opacity = lowQuality ? 0.45 : 0.72;
    },
    update(
      dt: number,
      state: FountainStateLike,
      playerTeam: number,
      unitQuery: { getPosition: (id: number, out: FountainThreeVec3) => boolean },
      tmpPos: FountainThreeVec3,
    ) {
      time += dt;
      const reduced = prefersReducedMotion();
      const spin = reduced ? 0 : time * 0.24;

      if (!reduced) {
        mistTex.offset.x = (time * 0.045) % 1;
      }
      for (let i = 0; i < outerCyls.length; i++) {
        outerCyls[i].mesh.rotation.y = spin * 0.55;
      }
      for (let i = 0; i < innerCyls.length; i++) {
        innerCyls[i].rotation.y = -spin * 0.85;
      }
      for (const orb of orbRings) {
        orb.mesh.visible = !lowQuality;
        if (!lowQuality) {
          const a = orb.baseA + (reduced ? 0 : time * 0.52);
          orb.mesh.position.set(
            orb.cx + Math.cos(a) * orb.r,
            1.02 + Math.sin(time * 2.1 + orb.baseA) * 0.18,
            orb.cz + Math.sin(a) * orb.r,
          );
          orb.mesh.rotation.y = -a;
        }
      }

      let rigIdx = 0;
      if (!state?.over && Array.isArray(state?.heroes)) {
        for (const h of state.heroes) {
          if (rigIdx >= palmRigs.length) break;
          if (!h.alive) continue;
          if (h.team !== playerTeam && !h.visible[playerTeam]) continue;
          const base = map.bases[h.team];
          if (!base) continue;
          const dx = h.pos.x - base.fountain.x;
          const dz = h.pos.y - base.fountain.y;
          if (dx * dx + dz * dz > base.fountainRadius * base.fountainRadius) continue;

          const activeHeal = h.hp < h.stats.maxHp * 0.995 || h.mana < h.stats.maxMana * 0.995;
          if (!activeHeal) continue;

          if (!unitQuery.getPosition(h.id, tmpPos)) continue;
          const rig = palmRigs[rigIdx++];
          rig.root.visible = true;
          rig.fade = Math.min(1, rig.fade + dt * 5.2);

          const hx = tmpPos.x;
          const hy = tmpPos.y;
          const hz = tmpPos.z;
          const dirX = Math.cos(h.facing);
          const dirZ = Math.sin(h.facing);
          const thrust = reduced ? 0 : Math.sin(time * 5.2 + h.id) * 0.09;
          const backDist = (h.radius || 0.6) + 0.72 - thrust;
          const bx = hx - dirX * backDist;
          const bz = hz - dirZ * backDist;

          rig.root.position.set(bx, hy + 1.24 + (reduced ? 0 : Math.sin(time * 3.1 + h.id) * 0.04), bz);
          rig.root.rotation.set(0, Math.atan2(hx - bx, hz - bz), 0);

          const pulse = 0.88 + 0.12 * Math.sin(time * 6.4 + h.id);
          rig.palmMat.opacity = 0.94 * rig.fade;
          rig.haloMat.opacity = 0.72 * pulse * rig.fade;
          rig.beamMat.opacity = 0.78 * pulse * rig.fade;
          rig.haloMesh.rotation.z = reduced ? 0 : time * 1.1;
          rig.palmMesh.scale.setScalar(0.96 + 0.06 * pulse);
          rig.beamMesh.scale.set(0.9 + 0.16 * pulse, 0.92 + 0.08 * pulse, 1);
        }
      }

      for (let i = rigIdx; i < palmRigs.length; i++) {
        const rig = palmRigs[i];
        if (rig.root.visible) {
          rig.fade = Math.max(0, rig.fade - dt * 4.0);
          rig.palmMat.opacity = 0.94 * rig.fade;
          rig.haloMat.opacity = 0.72 * rig.fade;
          rig.beamMat.opacity = 0.78 * rig.fade;
          if (rig.fade <= 0.01) {
            rig.root.visible = false;
            rig.fade = 0;
          }
        }
      }
    },
    dispose() {
      for (const d of disposables) {
        try {
          d.dispose();
        } catch {
          // ignore
        }
      }
    },
  };
}

// ── 泉水治疗头顶随机绿色 +++ 浮字 ──
interface PopupTrack {
  timer: number;
  seq: number;
  lastHp: number;
}

const popupTrackers = new Map<number, PopupTrack>();
const PLUS_GLYPHS = ['+++', '++', '+', '+++'] as const;

export function tickFountainPopups(
  popups: FountainPopupSystemLike,
  dt: number,
  state: FountainStateLike & {
    map?: { bases?: { fountain: { x: number; y: number }; fountainRadius: number }[] };
  },
  world: unknown,
): void {
  const bases = state?.map?.bases;
  if (!bases || state.over || dt <= 0 || !Array.isArray(state?.heroes)) {
    popupTrackers.clear();
    return;
  }

  const playerTeam = state.playerTeam === 1 ? 1 : 0;
  const activeIds = new Set<number>();

  for (const h of state.heroes) {
    if (!h.alive) continue;
    if (h.id !== state.playerId && h.team !== playerTeam && !h.visible[playerTeam]) continue;
    const base = bases[h.team];
    if (!base) continue;
    const dx = h.pos.x - base.fountain.x;
    const dz = h.pos.y - base.fountain.y;
    if (dx * dx + dz * dz > base.fountainRadius * base.fountainRadius) continue;

    const needsHeal = h.hp < h.stats.maxHp * 0.995 || h.mana < h.stats.maxMana * 0.995;
    if (!needsHeal) continue;

    activeIds.add(h.id);
    let tr = popupTrackers.get(h.id);
    if (!tr) {
      // 刚踏进泉水立刻冒第一簇 +++，反馈不等待
      tr = { timer: 0.28, seq: 0, lastHp: h.hp };
      popupTrackers.set(h.id, tr);
    }

    tr.timer += dt;
    const threshold = 0.25 + ((tr.seq * 37) % 10) * 0.012;
    if (tr.timer < threshold) continue;
    tr.timer = 0;
    tr.seq += 1;

    const p = popups.spawn(h.id, world, h.pos.x, h.pos.y, 4, '', 1.0, 1.0, false);
    if (p) {
      const gained = Math.round(h.hp - tr.lastHp);
      const showNum = tr.seq % 4 === 0 && gained >= 25;
      const glyph = showNum ? `+${gained}` : PLUS_GLYPHS[(tr.seq + h.id) % PLUS_GLYPHS.length];
      const colors = ['#68ffb5', '#44f09c', '#9effce'];
      const color = colors[(tr.seq + h.id) % colors.length];
      const size = showNum ? 17 : 16 + ((tr.seq * 3) % 6);
      p.sprite = popups.text.get(glyph, size, color, 'rgba(6, 44, 24, 0.95)', 900);
      p.ox = -32 + ((tr.seq * 29 + h.id * 13) % 64);
      p.oy = -42 - ((tr.seq * 17) % 24);
      p.life = 0.95;
      p.dir = tr.seq % 2 === 0 ? 1 : -1;
    }
    tr.lastHp = h.hp;
  }

  for (const id of popupTrackers.keys()) {
    if (!activeIds.has(id)) popupTrackers.delete(id);
  }
}
