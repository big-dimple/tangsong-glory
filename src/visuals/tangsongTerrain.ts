/**
 * tangsongTerrain.ts — 唐宋御道青石纹理 / 地表与建筑古风着色器 / 古画青绿舆图小地图
 *
 * 1. buildTangSongStoneTexture(sunDir, size, maxAniso, helpers):
 *    将原版西式破碎 Voronoi 鹅卵石地砖替换为「唐宋工字错缝青石条板御道」（8 行 × 4 列交错条石），
 *    严格保持 RGBA 贴图通道契约 (R=明暗, G=石面蒙版, B=石板ID, A=倒角受光 / 法线 RG=切线法线, B=高度, A=青苔)。
 * 2. TANGSONG_MF_SHADER_BODY:
 *    重写地图贴花着色器 MF：彻底删除西式六/八角星与异星符文，改用唐宋「莲瓣浮雕 / 八卦太极爻 / 古铜回纹」。
 * 3. TANGSONG_WO_SHIELD_SHADER_BODY:
 *    重写塔与基地保护罩 WO：彻底删除科幻青色六边形蜂窝网，改为柔雅透明的「鎏金云纹御阵薄纱」。
 * 4. TANGSONG_GF_PLAZA_PATCH & TANGSONG_GF_RIVER_PATCH:
 *    将基地发光电光线改为白玉丹陛与古铜鎏金边线；将河床发光星屑改为温柔金波微光。
 * 5. drawTangSongMinimapBase(...):
 *    以宋代青绿设色古绢舆图风格绘制小地图底图（陈旧宣绢边、石青碧玉汴河、青石古道、青绿/朱红皇庭）。
 */

export interface StoneTexHelpers {
  ke: new (seed: number) => {
    range(a: number, b: number): number;
    next(): number;
    chance(p: number): boolean;
  };
  g3: (buf: Uint8Array, size: number, aniso: number) => unknown;
  lh: (x: number) => number;
  Vc: (a: number, b: number, x: number) => number;
  un: (x: number, y: number, oct: number, seed: number, period?: number) => number;
  u1: (x: number, y: number, seed: number, period?: number) => number;
  so: (x: number) => number;
}

/**
 * 1. 错缝唐宋青石条板御道纹理生成器（替代 Voronoi 五边形石块 FF）
 */
export function buildTangSongStoneTexture(
  sunDir: { x: number; y: number; z: number },
  size: number,
  maxAniso: number,
  helpers: StoneTexHelpers,
) {
  const { ke, g3, lh, Vc, un, u1, so } = helpers;
  const rng = new ke(4127);

  const ROWS = 8;
  const COLS = 4;
  const count = ROWS * COLS;

  // 每块条石预设垂直缝隙微偏移与固有深浅
  const seamJitterX = new Float32Array(count);
  const seamJitterY = new Float32Array(ROWS);
  const slabTone = new Float32Array(count);
  const slabId = new Float32Array(count);
  const tiltX = new Float32Array(count);
  const tiltY = new Float32Array(count);
  const hasCrack = new Uint8Array(count);

  for (let r = 0; r < ROWS; r++) {
    seamJitterY[r] = rng.range(-0.04, 0.04);
    for (let c = 0; c < COLS; c++) {
      const idx = r * COLS + c;
      seamJitterX[idx] = rng.range(-0.08, 0.08);
      slabTone[idx] = rng.range(-0.9, 0.9);
      slabId[idx] = rng.range(0.14, 0.98);
      tiltX[idx] = rng.range(-0.9, 0.9);
      tiltY[idx] = rng.range(-0.9, 0.9);
      hasCrack[idx] = rng.chance(0.14) ? 1 : 0;
    }
  }

  const total = size * size;
  const heightArr = new Float32Array(total);
  const toneArr = new Float32Array(total);
  const faceArr = new Float32Array(total);
  const idxArr = new Uint16Array(total);
  const mossArr = new Float32Array(total);

  const rowH = 1 / ROWS;
  const colW = 1 / COLS;
  const bevelW = 0.011;

  for (let py = 0; py < size; py++) {
    const v = py / size;
    const grY = v * ROWS;
    let rIdx = Math.floor(grY) % ROWS;
    const fy = grY - Math.floor(grY);

    // 相邻行横缝微错落
    const yBound0 = seamJitterY[rIdx];
    const nextR = (rIdx + 1) % ROWS;
    const yBound1 = 1 + seamJitterY[nextR];
    if (fy < yBound0) {
      rIdx = (rIdx + ROWS - 1) % ROWS;
    } else if (fy > yBound1) {
      rIdx = nextR;
    }

    const rowStagger = (rIdx % 2) * 0.5;
    const dRow = Math.min(Math.abs(fy - yBound0), Math.abs(yBound1 - fy)) * rowH;

    for (let px = 0; px < size; px++) {
      const u = px / size;
      // 水平方向做工字错缝
      const shiftedU = ((u * COLS - rowStagger) % COLS + COLS) % COLS;
      const baseC = Math.floor(shiftedU);

      let bestDistX = 1.0;
      let cIdx = baseC;
      for (let dc = -1; dc <= 1; dc++) {
        const cc = (baseC + dc + COLS) % COLS;
        const seam = cc + seamJitterX[rIdx * COLS + cc];
        let diff = shiftedU - seam;
        if (diff > COLS * 0.5) diff -= COLS;
        if (diff < -COLS * 0.5) diff += COLS;
        if (diff >= 0 && diff < 1.35) {
          const prevSeamDist = diff;
          const nextCC = (cc + 1) % COLS;
          const nextSeam = cc + 1 + seamJitterX[rIdx * COLS + nextCC];
          let rightDiff = nextSeam - shiftedU;
          if (rightDiff > COLS * 0.5) rightDiff -= COLS;
          if (rightDiff < -COLS * 0.5) rightDiff += COLS;
          if (rightDiff >= 0) {
            cIdx = cc;
            bestDistX = Math.min(prevSeamDist, rightDiff) * colW;
            break;
          }
        }
      }

      const id = rIdx * COLS + cIdx;
      let dSeam = Math.min(dRow, bestDistX);

      // 多频自然石材肌理（保留青石錾凿感）
      const macro = un(u * 6, v * 6, 3, 5, 6);
      const mid = u1(u * 26, v * 26, 9, 26);
      const micro = u1(u * 84, v * 84, 13, 84);
      dSeam += (mid - 0.5) * 0.0022;

      const jointHalf = 0.0034 + (macro - 0.5) * 0.0012;
      const pIdx = py * size + px;
      const faceMask = lh((dSeam - jointHalf) / 0.0032);
      const bev = lh((dSeam - jointHalf) / bevelW);

      let h = (1 - (1 - bev) * (1 - bev)) * (0.87 + (macro - 0.5) * 0.22 + (micro - 0.5) * 0.06);
      let t = 0.5 + slabTone[id] * 0.055 + (macro - 0.5) * 0.08 + (micro - 0.5) * 0.03;

      // 偶发细微古石风化线纹
      const pit = Vc(0.8, 0.93, u1(u * 18 + 3.1, v * 18, 31, 18)) * (1 - Vc(0.01, 0.06, dSeam - jointHalf));
      h -= pit * 0.25;
      t -= pit * 0.04;
      if (hasCrack[id] && dSeam > jointHalf + 0.012) {
        const cr = un(u * 7 + slabId[id] * 11, v * 7 + slabId[id] * 5, 2, 77, 7);
        const ck = 1 - Vc(0.003, 0.01, Math.abs(cr - 0.5));
        h -= ck * 0.36;
        t -= ck * 0.08;
      }

      heightArr[pIdx] = faceMask > 0 ? Math.max(0.03, h) * faceMask : 0;
      toneArr[pIdx] = t;
      faceArr[pIdx] = faceMask;
      idxArr[pIdx] = id;
      mossArr[pIdx] = lh(un(u * 4 + 9.3, v * 4 + 2.1, 3, 41, 4) * 0.78 + (1 - Vc(0, 0.055, dSeam - jointHalf)) * 0.36 - 0.06);
    }
  }

  const dataBuf = new Uint8Array(total * 4);
  const normBuf = new Uint8Array(total * 4);
  const H = (x: number, y: number) => heightArr[((y + size) % size) * size + ((x + size) % size)];
  const slopeScale = 2.9 / (800 / size) / 2;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const i = py * size + px;
      const id = idxArr[i];
      const f = faceArr[i];
      let nx = -(H(px + 1, py) - H(px - 1, py)) * slopeScale + tiltX[id] * 0.025 * f;
      let nz = -(H(px, py + 1) - H(px, py - 1)) * slopeScale + tiltY[id] * 0.025 * f;
      const ny = 1 / Math.hypot(nx, nz, 1);
      nx *= ny;
      nz *= ny;
      const bevelLight = (nx * sunDir.x + ny * sunDir.y + nz * sunDir.z) / sunDir.y;

      dataBuf[i * 4] = so(toneArr[i] * 255);
      dataBuf[i * 4 + 1] = so(f * 255);
      dataBuf[i * 4 + 2] = so(slabId[id] * 255);
      dataBuf[i * 4 + 3] = so(bevelLight * 127.5);

      normBuf[i * 4] = so((nx * 0.5 + 0.5) * 255);
      normBuf[i * 4 + 1] = so((nz * 0.5 + 0.5) * 255);
      normBuf[i * 4 + 2] = so(heightArr[i] * 255);
      normBuf[i * 4 + 3] = so(mossArr[i] * 255);
    }
  }

  return { data: g3(dataBuf, size, maxAniso), normal: g3(normBuf, size, maxAniso) };
}

export interface GroundTexHelpers {
  fx: (
    w: number,
    h: number,
    draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
    opts?: Record<string, unknown>,
  ) => unknown;
  k8: (
    ctx: CanvasRenderingContext2D,
    size: number,
    tile: number,
    fn: (u: number, v: number) => [number, number, number],
  ) => void;
  ke: new (seed: number) => {
    range(a: number, b: number): number;
    next(): number;
    int(n: number): number;
    chance(p: number): boolean;
  };
  un: (x: number, y: number, oct: number, seed: number, px?: number, py?: number) => number;
  nh: (
    size: number,
    x: number,
    y: number,
    pad: number,
    fn: (cx: number, cy: number) => void,
  ) => void;
}

export interface CliffTexHelpers {
  fL: (key: string, fn: () => unknown) => unknown;
  fx: GroundTexHelpers['fx'];
  ke: GroundTexHelpers['ke'];
  un: GroundTexHelpers['un'];
  nh: GroundTexHelpers['nh'];
  Og: (v: number) => number;
}

/**
 * 1B. 石绿罩染草地纹理 DF：底色往偏黄的石绿收敛并拉开大块明度起伏；秋叶朱橙只留作点 (维持线性均值 ~0.18 匹配 GF * 5.5)
 */
export function buildTangSongGroundTexture(size: number, helpers: GroundTexHelpers) {
  const { fx, k8, ke, un, nh } = helpers;
  return fx(
    size,
    size,
    (ctx) => {
      const s = size / 512;
      k8(ctx, size, 256, (u, v) => {
        const patch = un(u * 3 + 1.9, v * 3 + 4.3, 3, 7, 3);
        const macro = un(u * 7, v * 7, 4, 13, 7);
        const grain = un(u * 48, v * 48, 2, 29, 48);
        const grit = un(u * 96 + 3.1, v * 96 + 1.7, 2, 41, 96);
        const d = Math.max(
          68,
          Math.min(178, 122 + (patch - 0.5) * 34 + (macro - 0.5) * 58 + (grain - 0.5) * 18 + (grit - 0.5) * 8),
        );
        return [d * 0.97, d * 1.03, d * 0.94];
      });

      const rng = new ke(2026);
      ctx.lineCap = 'round';

      // 成簇斜倾草叶梢（暖石绿与深草影交错，破除地毯均一感）
      const drawBlade = (
        rx: number,
        ry: number,
        ang: number,
        len: number,
        halfW: number,
        bend: number,
        lum: number,
        alpha: number,
        warm: boolean,
      ) => {
        const ex = rx + Math.cos(ang) * len;
        const ey = ry + Math.sin(ang) * len;
        const nx = Math.cos(ang + Math.PI / 2);
        const ny = Math.sin(ang + Math.PI / 2);
        const mx = (rx + ex) / 2 + nx * bend * len;
        const my = (ry + ey) / 2 + ny * bend * len;
        const grad = ctx.createLinearGradient(rx, ry, ex, ey);
        const base = Math.round(lum * 0.54);
        const tipB = warm ? 0.87 : 0.91;
        grad.addColorStop(0, `rgba(${Math.round(base * 0.9)},${Math.round(base * 1.0)},${Math.round(base * 0.88)},${alpha * 0.5})`);
        grad.addColorStop(
          1,
          `rgba(${Math.round(lum * (warm ? 1.0 : 0.9))},${Math.round(Math.min(255, lum * 1.04))},${Math.round(lum * tipB)},${alpha})`,
        );
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(rx - nx * halfW, ry - ny * halfW);
        ctx.quadraticCurveTo(mx - nx * halfW * 0.6, my - ny * halfW * 0.6, ex, ey);
        ctx.quadraticCurveTo(mx + nx * halfW * 0.6, my + ny * halfW * 0.6, rx + nx * halfW, ry + ny * halfW);
        ctx.closePath();
        ctx.fill();
      };

      const tufts = Math.round(145 * s * s);
      for (let r = 0; r < tufts; r++) {
        const x = rng.range(0, size);
        const y = rng.range(0, size);
        const baseAng = -Math.PI / 2 + rng.range(-0.75, 0.75);
        const blades = 4 + rng.int(5);
        const warm = rng.chance(0.58);
        const lenMax = rng.range(20, 42) * s;
        nh(size, x, y, lenMax * 1.3, (cx, cy) => {
          const ao = ctx.createRadialGradient(cx, cy, 0, cx, cy, lenMax * 0.54);
          ao.addColorStop(0, 'rgba(26, 36, 30, 0.34)');
          ao.addColorStop(1, 'rgba(26, 36, 30, 0)');
          ctx.fillStyle = ao;
          ctx.beginPath();
          ctx.arc(cx, cy, lenMax * 0.54, 0, Math.PI * 2);
          ctx.fill();
        });
        for (let m = 0; m < blades; m++) {
          const ang = baseAng + ((m + 0.5) / blades - 0.5) * 1.5 + rng.range(-0.1, 0.1);
          const len = lenMax * rng.range(0.62, 1.08);
          const w = rng.range(2.0, 3.4) * s;
          const bend = rng.range(-0.22, 0.22);
          const lum = warm ? rng.range(168, 216) : rng.range(98, 142);
          const al = rng.range(0.36, 0.58);
          nh(size, x, y, len + 6, (cx, cy) => drawBlade(cx, cy, ang, len, w, bend, lum, al, warm));
        }
      }

      // 细密枯草碎毫
      const fine = Math.round((size * size) / (460 * s * s));
      for (let r = 0; r < fine; r++) {
        const x = rng.range(0, size);
        const y = rng.range(0, size);
        const baseAng = -Math.PI / 2 + rng.range(-0.9, 0.9);
        const bright = rng.chance(0.52);
        const cnt = 3 + rng.int(4);
        for (let u = 0; u < cnt; u++) {
          const bx = x + rng.range(-7, 7) * s;
          const by = y + rng.range(-5, 5) * s;
          const len = rng.range(7, 15) * s;
          const ang = baseAng + rng.range(-0.45, 0.45);
          const lum = bright ? rng.range(150, 198) : rng.range(72, 108);
          const al = rng.range(0.18, 0.36);
          ctx.strokeStyle = `rgba(${Math.round(lum * 0.96)},${Math.round(Math.min(255, lum * 1.03))},${Math.round(lum * 0.88)},${al})`;
          ctx.lineWidth = rng.range(1.1, 2.2) * s;
          nh(size, bx, by, len + 4, (cx, cy) => {
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
            ctx.stroke();
          });
        }
      }

      // 散落地面银杏金扇叶与丹枫残瓣（带柔和落地暗影）
      const leaves = Math.round(280 * s * s);
      for (let i = 0; i < leaves; i++) {
        const x = rng.range(0, size);
        const y = rng.range(0, size);
        const ang = rng.range(0, Math.PI * 2);
        const rad = rng.range(3.2, 6.8) * s;
        const isCrimson = rng.chance(0.28);
        const tone = rng.range(148, 198);
        nh(size, x, y, rad + 4, (cx, cy) => {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(ang);
          ctx.fillStyle = 'rgba(34, 24, 16, 0.28)';
          ctx.beginPath();
          ctx.ellipse(0.9 * s, 1.1 * s, rad * 0.85, rad * 0.56, 0, 0, Math.PI * 2);
          ctx.fill();

          if (isCrimson) {
            ctx.fillStyle = `rgba(${Math.round(tone * 1.08)},${Math.round(tone * 0.54)},${Math.round(tone * 0.4)},0.74)`;
          } else {
            ctx.fillStyle = `rgba(${Math.round(tone * 1.1)},${Math.round(tone * 0.92)},${Math.round(tone * 0.44)},0.76)`;
          }
          ctx.beginPath();
          ctx.moveTo(-rad * 0.5, 0);
          ctx.quadraticCurveTo(0, -rad * 0.72, rad * 0.8, -rad * 0.12);
          ctx.lineTo(rad * 0.42, 0);
          ctx.lineTo(rad * 0.8, rad * 0.18);
          ctx.quadraticCurveTo(0, rad * 0.72, -rad * 0.5, 0);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        });
      }
    },
    { repeat: true, anisotropy: 8 },
  );
}

/**
 * 1C. 唐宋野径夯土与碎青石碴纹理 zF：降饱和的暖灰赭绢色 (线性均值 ~126 匹配 GF * 4.9)
 */
export function buildTangSongDirtTexture(
  size: number,
  sx: number,
  sz: number,
  helpers: GroundTexHelpers,
) {
  const { fx, k8, ke, un, nh } = helpers;
  const lx = -sx;
  const ly = sz;
  return fx(
    size,
    size,
    (ctx) => {
      k8(ctx, size, 256, (u, v) => {
        const strata = un(u * 5, v * 5, 4, 51, 5);
        const dust = un(u * 56, v * 56, 2, 63, 56);
        const vein = un(u * 11 + 4.1, v * 11, 3, 77, 11);
        let c = 126 + (strata - 0.5) * 44 + (dust - 0.5) * 26;
        if (Math.abs(vein - 0.5) < 0.016) c -= 26;
        return [c * 1.07, c * 0.99, c * 0.88];
      });

      const rng = new ke(808);
      // 夯土风化干裂纹
      ctx.strokeStyle = 'rgba(54, 42, 30, 0.22)';
      ctx.lineCap = 'round';
      for (let i = 0; i < 42; i++) {
        const x = rng.range(0, size);
        const y = rng.range(0, size);
        const a = rng.range(0, Math.PI * 2);
        const len = rng.range(10, 26) * (size / 512);
        ctx.lineWidth = rng.range(0.8, 1.5);
        nh(size, x, y, len + 2, (cx, cy) => {
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.quadraticCurveTo(
            cx + Math.cos(a + 0.35) * len * 0.5,
            cy + Math.sin(a + 0.35) * len * 0.5,
            cx + Math.cos(a) * len,
            cy + Math.sin(a) * len,
          );
          ctx.stroke();
        });
      }

      // 棱角青石碎碴与古瓦残片
      const chips = Math.round((size * size) / 3600);
      for (let i = 0; i < chips; i++) {
        const x = rng.range(0, size);
        const y = rng.range(0, size);
        const r = rng.range(2.2, 6.2) * (rng.chance(0.14) ? 1.75 : 1);
        const ang = rng.range(0, Math.PI * 2);
        const tone = rng.range(122, 178);
        const isWarmTile = rng.chance(0.25);
        nh(size, x, y, r + 4, (cx, cy) => {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(ang);
          ctx.fillStyle = 'rgba(34, 28, 22, 0.3)';
          ctx.beginPath();
          ctx.moveTo(-r + lx * r * 0.35, -r * 0.55 + ly * r * 0.35);
          ctx.lineTo(r * 0.75 + lx * r * 0.35, -r * 0.7 + ly * r * 0.35);
          ctx.lineTo(r + lx * r * 0.35, r * 0.45 + ly * r * 0.35);
          ctx.lineTo(-r * 0.65 + lx * r * 0.35, r * 0.65 + ly * r * 0.35);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = isWarmTile
            ? `rgb(${Math.round(tone * 1.06)},${Math.round(tone * 0.88)},${Math.round(tone * 0.76)})`
            : `rgb(${Math.round(tone * 0.96)},${Math.round(tone * 0.95)},${Math.round(tone * 0.9)})`;
          ctx.beginPath();
          ctx.moveTo(-r, -r * 0.5);
          ctx.lineTo(r * 0.72, -r * 0.68);
          ctx.lineTo(r, r * 0.44);
          ctx.lineTo(-r * 0.62, r * 0.62);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        });
      }
    },
    { repeat: true, anisotropy: 8 },
  );
}

/**
 * 1D. 宋画山岩纹理 hL (512x512 沉积岩层 + 斧劈皴 / 披麻皴 / 点苔；只管笔触与明暗，色相由顶点色给)
 */
export function buildTangSongCliffTexture(helpers: CliffTexHelpers) {
  const { fL, fx, ke, un, nh, Og } = helpers;
  return fL('rock', () =>
    fx(
      512,
      512,
      (ctx, w) => {
        const img = ctx.createImageData(w, w);
        const data = img.data;
        for (let py = 0; py < w; py++) {
          for (let px = 0; px < w; px++) {
            const u = px / w;
            const v = py / w;
            const warp = un(u * 4, v * 4, 3, 3, 4);
            // 倾斜沉积岩层与宋画斧劈折带
            const strata = un(u * 2 + warp * 0.55, v * 11 + warp * 1.4, 3, 11, 2, 11);
            const crackBand = Math.abs(((v * 8 + u * 1.5 + warp * 1.35) % 1) - 0.5);
            const chisel = un(u * 7 - v * 3.5, v * 7 + warp * 0.9, 2, 19, 7, 7);
            const micro = un(u * 52, v * 52, 2, 23, 52);

            let c = 186 + (strata - 0.5) * 64 + (chisel - 0.5) * 32 + (micro - 0.5) * 28;
            if (crackBand < 0.055) {
              c -= 46 * (1 - crackBand / 0.055);
            }
            const ochre = Math.max(0, chisel - 0.52) * 24;
            const idx = (py * w + px) * 4;
            data[idx] = Og(c * 1.0 + ochre * 0.4);
            data[idx + 1] = Og(c * 0.995 + ochre * 0.15);
            data[idx + 2] = Og(c * 0.965 - ochre * 0.2);
            data[idx + 3] = 255;
          }
        }
        ctx.putImageData(img, 0, 0);

        // 斧劈皴刚劲侧锋刷笔与暗墨石隙
        const rng = new ke(1099);
        ctx.lineCap = 'butt';
        for (let i = 0; i < 86; i++) {
          const rx = rng.range(0, w);
          const ry = rng.range(0, w);
          const len = rng.range(24, 78);
          const ang = rng.range(-0.34, 0.22);
          const isHighlight = rng.chance(0.45);
          ctx.strokeStyle = isHighlight ? 'rgba(248, 238, 218, 0.2)' : 'rgba(34, 28, 24, 0.22)';
          ctx.lineWidth = rng.range(2.2, 6.4);
          nh(w, rx, ry, len, (cx, cy) => {
            ctx.beginPath();
            ctx.moveTo(cx - Math.cos(ang) * len * 0.5, cy - Math.sin(ang) * len * 0.5);
            ctx.lineTo(cx + Math.cos(ang) * len * 0.5, cy + Math.sin(ang) * len * 0.5);
            ctx.stroke();
          });
        }

        // 斧劈皴：侧锋一刀，一边硬一边虚的楔形墨面（受光一侧留白，背光一侧压墨）
        for (let i = 0; i < 54; i++) {
          const rx = rng.range(0, w);
          const ry = rng.range(0, w);
          const len = rng.range(26, 64);
          const wid = rng.range(7, 18);
          const ang = rng.range(-0.5, 0.12);
          const dark = rng.chance(0.62);
          nh(w, rx, ry, len, (cx, cy) => {
            const dx = Math.cos(ang);
            const dy = Math.sin(ang);
            const grad = ctx.createLinearGradient(cx, cy, cx - dy * wid, cy + dx * wid);
            grad.addColorStop(0, dark ? 'rgba(30, 30, 30, 0.3)' : 'rgba(250, 244, 230, 0.24)');
            grad.addColorStop(1, dark ? 'rgba(30, 30, 30, 0)' : 'rgba(250, 244, 230, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(cx - dx * len * 0.5, cy - dy * len * 0.5);
            ctx.lineTo(cx + dx * len * 0.5, cy + dy * len * 0.5);
            ctx.lineTo(cx + dx * len * 0.22 - dy * wid, cy + dy * len * 0.22 + dx * wid);
            ctx.closePath();
            ctx.fill();
          });
        }

        // 披麻皴：顺着山势往下披的细长淡墨线，成组出现
        ctx.lineCap = 'round';
        for (let i = 0; i < 46; i++) {
          const gx = rng.range(0, w);
          const gy = rng.range(0, w);
          const lean = rng.range(-0.28, 0.28);
          const count = 3 + rng.int(4);
          for (let k = 0; k < count; k++) {
            const sx = gx + (k - count / 2) * rng.range(5, 9);
            const sy = gy + rng.range(-10, 10);
            const len = rng.range(34, 86);
            const bow = rng.range(-9, 9);
            ctx.strokeStyle = `rgba(36, 34, 32, ${rng.range(0.1, 0.2)})`;
            ctx.lineWidth = rng.range(0.9, 1.9);
            nh(w, sx, sy, len, (cx, cy) => {
              ctx.beginPath();
              ctx.moveTo(cx, cy);
              ctx.quadraticCurveTo(cx + lean * len * 0.5 + bow, cy + len * 0.5, cx + lean * len, cy + len);
              ctx.stroke();
            });
          }
        }

        // 点苔：石隙里成簇的浓墨小点
        for (let i = 0; i < 30; i++) {
          const gx = rng.range(0, w);
          const gy = rng.range(0, w);
          const dots = 4 + rng.int(6);
          for (let k = 0; k < dots; k++) {
            const px = gx + rng.range(-12, 12);
            const py = gy + rng.range(-7, 7);
            const r = rng.range(1.2, 2.6);
            ctx.fillStyle = `rgba(28, 34, 32, ${rng.range(0.22, 0.4)})`;
            nh(w, px, py, r + 1, (cx, cy) => {
              ctx.beginPath();
              ctx.ellipse(cx, cy, r * 1.3, r * 0.8, 0, 0, Math.PI * 2);
              ctx.fill();
            });
          }
        }
      },
      { repeat: true, anisotropy: 4 },
    ),
  );
}

/**
 * 2. 唐宋地面坛台贴花着色器主体 (替换 MF 中 const float TAU ... 至 gl_FragColor 之前)
 *    用「莲瓣 / 八卦爻 / 古铜回纹 / 八角汉白玉碧玉莲池」全面取代西式六/八角星与异星符文。
 */
export const TANGSONG_MF_SHADER_BODY = `
const float TAU = 6.2831853;

float band(float x, float c, float w, float aa) {
  return 1.0 - smoothstep(w - aa, w + aa, abs(x - c));
}

// 重瓣莲花刻纹：n 瓣圆拱莲瓣边线 (x) 与瓣内凹浮雕填充 (y)
vec2 lotusPetals(float r, float a, float n, float rIn, float rOut, float aa) {
  float sec = fract(a / TAU * n);
  float arch = mix(rIn, rOut, pow(sin(sec * 3.141593), 0.72));
  float stroke = (1.0 - smoothstep(0.007, 0.007 + aa * 1.4, abs(r - arch))) * step(rIn * 0.86, r);
  float fill = smoothstep(rIn - aa, rIn + aa, r) * (1.0 - smoothstep(arch - aa, arch + aa, r));
  return vec2(stroke, fill);
}

// 宋代八角玉坛正多边形刻线
float sdOctagon(vec2 p, float rad) {
  vec2 ap = abs(p);
  float d = max(max(ap.x, ap.y), (ap.x + ap.y) * 0.70710678);
  return d - rad;
}

// 八卦三爻古铜纹环：n 格方位绘制阳爻/阴爻三道横杠
float baguaTrigrams(float r, float a, float r0, float w, float n, float seed, float aa) {
  float cell = floor(a / TAU * n);
  float fa = fract(a / TAU * n) - 0.5;
  float fr = (r - r0) / w;
  if (abs(fr) > 1.0) return 0.0;
  float mask = step(abs(fa), 0.34);
  float g = 0.0;
  for (int i = 0; i < 3; i++) {
    float barY = (float(i) - 1.0) * 0.56;
    float barLine = 1.0 - smoothstep(0.11, 0.19, abs(fr - barY));
    float yinBit = step(0.5, hash12(vec2(cell * 3.0 + float(i), seed)));
    float split = yinBit > 0.5 ? step(0.075, abs(fa)) : 1.0;
    g = max(g, barLine * split * mask);
  }
  return g;
}

// 回纹几何连续边带
float keyFret(float r, float a, float r0, float w, float n, float aa) {
  float fa = fract(a / TAU * n) - 0.5;
  float fr = (r - r0) / w;
  if (abs(fr) > 1.0) return 0.0;
  float topB = (1.0 - smoothstep(0.1, 0.18, abs(fr - 0.65))) * step(abs(fa + 0.08), 0.34);
  float botB = (1.0 - smoothstep(0.1, 0.18, abs(fr + 0.65))) * step(abs(fa - 0.08), 0.34);
  float sideB = (1.0 - smoothstep(0.08, 0.15, abs(abs(fa) - 0.28))) * step(abs(fr), 0.68);
  float inner = (1.0 - smoothstep(0.09, 0.16, abs(fr))) * step(abs(fa), 0.18);
  return clamp(topB + botB + sideB + inner, 0.0, 1.0);
}

// 环形石板：返回 (明暗, 接缝蒙版)
vec2 stoneRings(float r, float a, float seed) {
  float ringI = r < 0.42 ? 0.0 : (r < 0.7 ? 1.0 : 2.0);
  float n = ringI < 0.5 ? 8.0 : (ringI < 1.5 ? 12.0 : 16.0);
  float aa = a + ringI * 0.37 + seed;
  float cell = floor(aa / TAU * n);
  float fa = abs(fract(aa / TAU * n) - 0.5);
  float tone = 0.87 + 0.24 * hash12(vec2(cell, ringI + seed * 7.0));
  float jointA = smoothstep(0.5, 0.5 - 0.032 / max(r, 0.08) / n * 6.0, fa);
  float jr = min(min(abs(r - 0.42), abs(r - 0.7)), abs(r - 0.965));
  float jointR = smoothstep(0.0, 0.014, jr);
  return vec2(tone, jointA * jointR);
}

void main() {
  float type = vParam.x;
  float seed = vParam.y;
  float t = uTime;
  vec2 p = vUv;
  float r = length(p);
  if (r > 1.0) discard;
  if (type > 6.5 && type < 7.5) {
    float k = 1.0 - r;
    gl_FragColor = vec4(0.0, 0.0, 0.0, vParam.w * k * k);
    return;
  }
  if (type < 2.5 && (abs(vWorldPos.x) > uBound || abs(vWorldPos.z) > uBound)) discard;
  float a = atan(p.y, p.x) + 3.141593;
  float aa = fwidth(r) * 1.3 + 1e-4;
  vec3 paint = vec3(0.0);
  float alpha = 0.0;
  vec3 glow = vec3(0.0);
  float goldInlay = 0.0;
  float teamInlay = 0.0;
  float nz = 0.5;
  float nz2 = 0.5;
  if (type < 5.5 || type > 8.5) {
    nz = vnoise(vWorldPos.xz * 2.3 + seed);
    nz2 = vnoise(vWorldPos.xz * 7.1 + seed * 3.0);
  }
  vec3 imperialGold = vec3(0.86, 0.68, 0.28);

  if (type < 0.5) {
    // ── 箭楼台基：八角须弥青石座 + 八瓣雕刻莲花纹 + 鎏金回纹圈 ──
    vec2 sr = stoneRings(r, a, seed);
    paint = vColorB * sr.x * mix(0.62, 1.0, sr.y) * (0.92 + 0.16 * nz2);
    float oct = sdOctagon(p, 0.82);
    float octLine = 1.0 - smoothstep(0.008, 0.01 + aa * 1.5, abs(oct));
    vec2 lot = lotusPetals(r, a, 8.0, 0.34, 0.58, aa);
    paint = mix(paint, vColorB * 1.12, lot.y * 0.28);
    goldInlay = max(goldInlay, lot.x * 0.92 + octLine * 0.85);
    goldInlay = max(goldInlay, keyFret(r, a, 0.72, 0.04, 16.0, aa) * 0.8);
    alpha = 1.0 - smoothstep(0.96, 1.0, r + (nz - 0.5) * 0.025);
    float pulse = 0.65 + 0.35 * sin(t * 1.4 + seed * 5.0);
    teamInlay += band(r, 0.88, 0.009, aa) * 0.55 * pulse;
  } else if (type < 1.5) {
    // ── 皇帝玉玺御坛：天坛同心白玉台阶 + 双层重瓣莲花 + 八卦铜环（无六芒/八芒西式法阵） ──
    vec2 sr = stoneRings(r * 1.02, a, seed);
    paint = vColorB * sr.x * mix(0.6, 1.0, sr.y) * (0.92 + 0.16 * nz2);
    vec2 lotOuter = lotusPetals(r, a, 12.0, 0.44, 0.68, aa);
    vec2 lotInner = lotusPetals(r, a + 0.26, 8.0, 0.22, 0.44, aa);
    float oct = sdOctagon(p, 0.88);
    float octLine = 1.0 - smoothstep(0.008, 0.01 + aa * 1.5, abs(oct));
    paint = mix(paint, vColorB * 1.15, (lotOuter.y + lotInner.y) * 0.24);
    goldInlay = max(goldInlay, lotOuter.x * 0.95 + lotInner.x * 0.9 + octLine * 0.85);
    goldInlay = max(goldInlay, baguaTrigrams(r, a, 0.79, 0.045, 8.0, seed, aa) * 0.92);
    goldInlay = max(goldInlay, band(r, 0.93, 0.007, aa) * 0.95);
    alpha = 1.0 - smoothstep(0.975, 1.0, r + (nz - 0.5) * 0.02);
    float pulse = 0.72 + 0.28 * sin(t * 1.2);
    teamInlay += band(r, 0.71, 0.006, aa) * 0.48 * pulse;
    float rays = pow(abs(sin(a * 4.0)), 28.0) * smoothstep(0.42, 0.5, r) * (1.0 - smoothstep(0.62, 0.7, r));
    goldInlay = max(goldInlay, rays * 0.7);
  } else if (type < 2.5) {
    // ── 泉水玉池：汉白玉池沿 + 碧玉雕刻双莲泉底 + 水波焦散 ──
    float alert = seed < 0.75 ? uAlert.x : uAlert.y;
    float rimM = smoothstep(0.86, 0.875, r);
    vec2 sr = stoneRings(0.99, a, seed);
    vec3 rimCol = vColorB * sr.x * mix(0.6, 1.0, smoothstep(0.0, 0.02, abs(fract(a / TAU * 24.0) - 0.5) - 0.03)) * (0.9 + 0.2 * nz2);
    rimCol = mix(rimCol, imperialGold, band(r, 0.93, 0.008, aa));
    vec2 fr = stoneRings(r * 1.14, a + 0.3, seed + 2.0);
    vec3 floorCol = vColorB * 0.82 * fr.x * mix(0.64, 1.0, fr.y);
    vec2 lot = lotusPetals(r, a, 8.0, 0.18, 0.52, aa);
    floorCol = mix(floorCol, vColorB * 1.1, lot.y * 0.35);
    floorCol = mix(floorCol, imperialGold, lot.x * 0.78);
    floorCol = mix(floorCol, imperialGold, baguaTrigrams(r, a, 0.74, 0.04, 8.0, seed, aa) * 0.65);

    float depth = smoothstep(0.86, 0.2, r);
    vec3 waterTint = mix(vColorA, vec3(1.0, 0.28, 0.14), alert);
    vec3 pool = floorCol * mix(vec3(0.92, 0.98, 0.96), vec3(0.45, 0.78, 0.76), depth) + waterTint * 0.08 * depth;
    vec2 cq = vWorldPos.xz * 1.5;
    float c1 = vnoise(cq + vec2(t * 0.22, t * 0.13));
    float c2 = vnoise(cq * 1.3 - vec2(t * 0.17, -t * 0.19) + 3.7);
    float caust = pow(clamp(1.0 - abs(c1 - c2) * 3.2, 0.0, 1.0), 5.0);
    pool += vec3(0.8, 0.98, 0.88) * caust * (0.1 + 0.14 * depth);
    float rip = sin(r * mix(44.0, 28.0, alert) - t * mix(2.0, 6.8, alert) + nz * 3.0);
    pool += vec3(0.95, 0.98, 0.92) * smoothstep(0.87, 1.0, rip) * (1.0 - r) * mix(0.1, 0.28, alert);
    pool = mix(pool, pool * vec3(1.24, 0.52, 0.45) + vec3(0.12, 0.0, 0.0), alert * 0.7);
    paint = mix(pool, rimCol, rimM);
    alpha = (1.0 - smoothstep(0.985, 1.0, r)) * mix(0.95, 1.0, rimM);
    float inside = 1.0 - rimM;
    glow += waterTint * (1.0 - smoothstep(0.0, 0.34, r)) * 0.16;
    teamInlay += band(r, 0.84, 0.012, aa) * 1.6 * alert * (0.6 + 0.4 * sin(t * 9.0)) * inside;
  } else if (type < 3.5) {
    // ── 野怪石环：古风风化碎石圈与篆刻凹线 ──
    float broken = smoothstep(0.42, 0.6, vnoise(vec2(a * 2.2, seed * 9.0)) * 0.7 + nz * 0.3);
    float ringM = band(r, 0.86, 0.075, aa * 2.0) * broken;
    float joint = smoothstep(0.02, 0.05, abs(fract(a / TAU * 16.0 + seed) - 0.5) - 0.02);
    paint = vColorB * (0.8 + 0.28 * hash12(vec2(floor(a / TAU * 16.0 + seed), seed))) * mix(0.6, 1.0, joint);
    alpha = ringM * 0.92;
    goldInlay = keyFret(r, a, 0.72, 0.035, 12.0, aa) * broken * 0.45;
  } else if (type < 4.5) {
    // ── 红/蓝雕饰兽坛：霜寒石台或灼炎铜坛 + 八卦双环与莲纹 ──
    float ember = step(0.5, vParam.w);
    float pulse = 0.7 + 0.3 * sin(t * 1.4 + seed * 3.0);
    float patchM = 1.0 - smoothstep(0.55, 0.95, r + (nz - 0.5) * 0.3);
    vec3 scorched = vec3(0.08, 0.06, 0.055);
    vec3 frost = vec3(0.7, 0.84, 0.82) * (0.75 + 0.28 * nz2);
    paint = mix(frost, scorched, ember);
    alpha = patchM * mix(0.18 * smoothstep(0.35, 0.65, nz + (1.0 - r) * 0.3), 0.28, ember);
    vec2 lot = lotusPetals(r, a, 6.0, 0.28, 0.52, aa);
    goldInlay = max(goldInlay, lot.x * 0.78 + baguaTrigrams(r, a, 0.82, 0.045, 8.0, seed, aa) * 0.75);
    goldInlay = max(goldInlay, band(r, 0.9, 0.008, aa) * 0.75);
    teamInlay += band(r, 0.72, 0.006, aa) * 0.45 * pulse;
  } else if (type < 5.5) {
    // ── 苍龙潭 / 镇岳坛深潭纹：古铜浑天八卦水下石刻 ──
    float pulse = 0.65 + 0.35 * sin(t * 1.1 + seed);
    float ca = cos(t * 0.05);
    float sa = sin(t * 0.05);
    float rotA = a - t * 0.04;
    vec2 lot = lotusPetals(r, rotA, 8.0, 0.32, 0.62, aa);
    goldInlay = max(goldInlay, lot.x * 0.85 + baguaTrigrams(r, rotA, 0.78, 0.048, 8.0, seed, aa) * 0.9);
    goldInlay = max(goldInlay, keyFret(r, -rotA, 0.9, 0.036, 16.0, aa) * 0.75);
    teamInlay += band(r, 0.94, 0.008, aa) * 0.55 * pulse;
    glow += vColorA * (1.0 - smoothstep(0.2, 1.0, r)) * 0.06 * pulse;
    paint = vColorB;
    alpha = (1.0 - smoothstep(0.3, 1.0, r)) * 0.18;
  } else if (type < 6.5) {
    float f = 1.0 - r;
    glow += vColorA * f * f * (0.8 + 0.2 * sin(t * 1.3 + seed * 6.0)) * vParam.w;
  } else if (type < 8.5) {
    float period = 4.0 + 3.0 * fract(seed * 7.31);
    for (int i = 0; i < 2; i++) {
      float ph = fract(t / period + seed + float(i) * 0.5);
      float ring = band(r, 0.12 + ph * 0.82, 0.018 + 0.012 * ph, aa * 1.5) * (1.0 - ph) * smoothstep(0.0, 0.12, ph);
      glow += vColorA * ring * 0.34;
      alpha = max(alpha, ring * 0.12);
    }
    paint = vColorA;
  } else {
    vec2 hq = vec2(p.x, p.y * 1.25);
    float hr = length(hq) + (nz - 0.5) * 0.12;
    float hole = 1.0 - smoothstep(0.42, 0.56, hr);
    float mound = (1.0 - smoothstep(0.62, 0.98, hr)) * (0.55 + 0.45 * nz2);
    paint = mix(vColorB * (0.75 + 0.5 * nz2), vec3(0.012, 0.01, 0.012), hole);
    paint *= mix(1.0, 0.55, smoothstep(0.75, 0.5, hr) * (1.0 - hole));
    alpha = max(hole, mound * 0.9);
  }

  float gm = clamp(goldInlay, 0.0, 1.0);
  float tm = clamp(teamInlay, 0.0, 1.0);
  paint = mix(paint, imperialGold, gm * 0.9);
  paint = mix(paint, vColorA * 0.55, tm * 0.8);
  alpha = max(alpha, max(gm * 0.9, tm * 0.82));
  glow += imperialGold * gm * 0.14 + vColorA * tm * 0.24;

  vec3 N = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
  float shadow = kitShadow();
  vec3 irr = kitTintAmbient(kitAmbient(N), kitLightTint(vWorldPos.xz)) + kitSunColor() * max(dot(N, kitSunDir()), 0.0) * shadow + kitPointLights(N, -vViewPosition);
  paint *= mix(uShadeTintGround, vec3(1.0), shadow);
`;

/**
 * 3. 建筑护盾薄纱着色器 WO 替换（消除箭楼/玉玺罩上的六边形青色科幻蜂窝，改为温润鎏金云纹薄纱）
 */
export const TANGSONG_WO_SHIELD_BODY = `
void main() {
  float t = vT.x;
  float crack = vT.z;
  // 横竖交替的唐宋丝绸回纹格（极细微薄纱感，绝不遮盖建筑飞檐红柱）
  vec2 uv = vCell;
  float fretA = abs(fract(uv.x * 0.5 + uv.y * 0.35 - uTime * 0.06) - 0.5);
  float fretB = abs(fract(uv.x * 0.5 - uv.y * 0.35 + uTime * 0.06) - 0.5);
  float silkGrid = max(1.0 - smoothstep(0.02, 0.065, fretA), 1.0 - smoothstep(0.02, 0.065, fretB));
  float eaveBand = 1.0 - smoothstep(0.015, 0.045, abs(fract(t * 4.0) - 0.5));
  float fres = pow(1.0 - abs(dot(normalize(vN), normalize(cameraPosition - vW))), 2.2);
  float sweep = fract(uTime * 0.38);
  float wave = exp(-pow((t - sweep) * 6.0, 2.0)) * smoothstep(0.0, 0.12, sweep) * (1.0 - smoothstep(0.85, 1.0, sweep));
  float fade = smoothstep(0.02, 0.1, t) * (1.0 - smoothstep(0.8, 1.0, t)) * vT.y * (1.0 - crack);
  vec3 wardTint = mix(vCol, vec3(0.95, 0.78, 0.42), 0.58);
  float glow = (silkGrid * (0.14 + 0.38 * wave + 0.2 * fres) + eaveBand * 0.18 + 0.9 * crack) * fade;
  float alpha = (silkGrid * 0.09 + fres * 0.11 + 0.02) * fade * 0.48;
  if (glow + alpha < 0.004) discard;
  gl_FragColor = vec4(wardTint * alpha * 0.45 + kitAdditive(wardTint * glow), alpha);
`;

/**
 * 4. 基地地面中轴御道着色器补丁 (替换 GF 中的激光脉冲青线为御道白玉金边台阶)
 */
export const TANGSONG_GF_PLAZA_PATCH = `
    // 御道丹陛：温润汉白玉主阶 + 两侧古铜鎏金嵌线（去除科幻霓虹激光）
    plaza = mix(plaza, bStone * 1.18 * (0.84 + 0.32 * sd.r), axisBand * 0.92);
    plaza = mix(plaza, bTrim, axisEdge * 0.88);
    plaza = mix(plaza, mix(bTrim, bGlow, 0.35), axis * 0.78);
    emissive += bTrim * axis * (0.06 + 0.05 * flowK) * plazaMask;
  }
  // 地台边缘：深色压边青石 + 古铜金边线
  float rimB = smoothstep(-1.0, -0.85, dBase) * (1.0 - smoothstep(-0.12, 0.0, dBase));
  float rimLine = smoothstep(-0.62, -0.55, dBase) * (1.0 - smoothstep(-0.47, -0.4, dBase));
  plaza = mix(plaza, bStone * 0.72 * (0.55 + 0.9 * sd.r) * mix(0.6, 1.0, face), rimB);
  plaza = mix(plaza, bTrim, rimLine);
  // 御街门槛：进出基地处雕花御金石槛（柔和暖金，不刺眼）
  float inLane = 1.0 - smoothstep(-0.9, -0.4, dLane);
  float sill = (1.0 - smoothstep(0.05, 0.09, abs(dBase + 0.28))) * inLane;
  float chevP = dBase + 0.45 * max(0.0, uLaneHalf - abs(dLane + uLaneHalf));
  float chev = (1.0 - smoothstep(0.05, 0.1, abs(fract(chevP / 0.85) - 0.5))) * smoothstep(0.25, 0.5, dBase) * (1.0 - smoothstep(2.2, 2.8, chevP)) * inLane;
  emissive += bTrim * sill * 0.14;

  albedo = mix(albedo, pave, stoneMask * (1.0 - plazaMask));
  albedo = mix(albedo, albedo * 0.74 + bTrim * 0.08, chev * (1.0 - plazaMask) * 0.82);
  albedo = mix(albedo, mix(pave, bStone * tone * mix(0.6, 1.0, face), 0.65), padMask * face);
  plaza = mix(plaza, bTrim * 0.85, sill * 0.75);
  albedo = mix(albedo, plaza, plazaMask);
`;

export const TANGSONG_GF_RIVER_PATCH = `
  // 汴河水底碎金日影（取代科幻发光晶屑）
  if (under > 0.001) {
    vec4 sp4 = texture2D(tNoise, wp * 0.094 + 0.63);
    float cluster = smoothstep(0.64, 0.78, nA.b * 0.6 + nB.r * 0.5);
    float spark = smoothstep(0.07, 0.02, sp4.a) * cluster;
    emissive += vec3(0.92, 0.78, 0.44) * spark * (0.45 + 0.35 * sin(t * 1.5 + sp4.g * 40.0 + wp.x)) * 0.36 * under;
  }
  #endif
  col += emissive;
`;

/**
 * 5. 《宋代青绿舆图》古风小地图底图绘制函数（替换 mG 中的 A()）
 */
export function drawTangSongMinimapBase(
  canvas: HTMLCanvasElement,
  map: {
    bound: number;
    river: { x: number; y: number }[];
    riverWidth: number;
    laneWidth: number;
    lanes: { top: { x: number; y: number }[]; bot: { x: number; y: number }[]; mid: { x: number; y: number }[] };
    bases: { team: number; area: { x: number; y: number }[]; fountain: { x: number; y: number }; fountainRadius: number }[];
    bushes: { x: number; y: number }[][];
    walls: { x: number; y: number }[][];
  },
  c: number,
  f: number,
  d: number,
  bx: (x: number) => number,
  by: (y: number) => number,
  polyFn: (ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[]) => void,
  lineFn: (ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[]) => void,
): void {
  canvas.width = canvas.height = c;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const J = map.bound;
  ctx.fillStyle = '#1b140f';
  ctx.fillRect(0, 0, c, c);

  const Z = bx(-J);
  const ot = by(-J);
  const j = 2 * J * f;
  const at = 4 * f;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(Z + at, ot);
  ctx.arcTo(Z + j, ot, Z + j, ot + j, at);
  ctx.arcTo(Z + j, ot + j, Z, ot + j, at);
  ctx.arcTo(Z, ot + j, Z, ot, at);
  ctx.arcTo(Z, ot, Z + j, ot, at);
  ctx.closePath();
  ctx.clip();

  // 青绿设色古绢底色（石绿罩染，四周收向石青墨色；与战场草地同一套色相）
  const groundGrad = ctx.createRadialGradient(c / 2, c / 2, c * 0.05, c / 2, c / 2, c * 0.74);
  groundGrad.addColorStop(0, '#526b58');
  groundGrad.addColorStop(0.65, '#3a5244');
  groundGrad.addColorStop(1, '#223029');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, 0, c, c);

  // 古舆图纵横暗丝经纬格
  ctx.strokeStyle = 'rgba(222, 198, 144, 0.08)';
  ctx.lineWidth = Math.max(0.5, 0.7 * d);
  const gridStep = c / 8;
  for (let i = 1; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(i * gridStep, 0);
    ctx.lineTo(i * gridStep, c);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * gridStep);
    ctx.lineTo(c, i * gridStep);
    ctx.stroke();
  }

  // 汴河靛蓝水墨玉带（暖土岸缘 + 靛青河水）
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  lineFn(ctx, map.river);
  ctx.strokeStyle = '#7d6a49';
  ctx.lineWidth = map.riverWidth * f * 1.12;
  ctx.stroke();
  lineFn(ctx, map.river);
  ctx.strokeStyle = '#274c5e';
  ctx.lineWidth = map.riverWidth * f * 0.92;
  ctx.stroke();
  lineFn(ctx, map.river);
  ctx.strokeStyle = 'rgba(145, 190, 212, 0.42)';
  ctx.lineWidth = map.riverWidth * f * 0.44;
  ctx.stroke();

  // 唐宋条石御道（古铜压边 + 暖宣青石色）
  for (const lane of [map.lanes.top, map.lanes.bot, map.lanes.mid]) {
    lineFn(ctx, lane);
    ctx.strokeStyle = '#736144';
    ctx.lineWidth = map.laneWidth * f * 0.82;
    ctx.stroke();
    lineFn(ctx, lane);
    ctx.strokeStyle = '#cbb688';
    ctx.lineWidth = map.laneWidth * f * 0.56;
    ctx.stroke();
  }

  // 盛唐靛青鎏金 / 赤壁朱丹皇城台地
  for (const b of map.bases) {
    const rgb = b.team === 0 ? '78, 148, 202' : '214, 78, 58';
    polyFn(ctx, b.area);
    ctx.fillStyle = `rgba(${rgb}, 0.3)`;
    ctx.fill();
    ctx.strokeStyle = b.team === 0 ? 'rgba(222, 188, 108, 0.88)' : 'rgba(236, 146, 98, 0.88)';
    ctx.lineWidth = Math.max(1, 1.3 * d);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(bx(b.fountain.x), by(b.fountain.y), b.fountainRadius * f, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${rgb}, 0.52)`;
    ctx.fill();
  }

  // 青翠竹苇伏兵区（呼应局内青绿草丛）
  ctx.fillStyle = 'rgba(54, 134, 102, 0.86)';
  for (const bush of map.bushes) {
    polyFn(ctx, bush);
    ctx.fill();
  }

  // 水墨山崖与金石勾线轮廓
  for (const wall of map.walls) {
    polyFn(ctx, wall);
    ctx.fillStyle = '#1c2526';
    ctx.fill();
    ctx.strokeStyle = '#b59356';
    ctx.lineWidth = Math.max(1, 1.15 * d);
    ctx.stroke();
  }

  ctx.restore();

  // 古画四周暗茶墨晕影
  const vig = ctx.createRadialGradient(c / 2, c / 2, c * 0.42, c / 2, c / 2, c * 0.74);
  vig.addColorStop(0, 'rgba(18, 12, 8, 0)');
  vig.addColorStop(1, 'rgba(18, 12, 8, 0.62)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, c, c);
}

function replaceShaderOnce(source: string, anchor: string, replacement: string): string {
  const parts = source.split(anchor);
  return parts.length === 2 ? parts.join(replacement) : source;
}

/** K7：草丛顶点着色器——把“整片压秃成枯坑”改为“随身形温柔拨开并轻伏”，并向片元传递拨开权重。 */
export function patchTangSongBushVert(source: string): string {
  const varyingAnchor = 'varying float vTip;';
  const layAnchor =
    '  // 玩家附近的草整片伏低：aFx.y 是每片叶的随机阈值，离玩家越近倒伏的叶越多、伏得越低\n' +
    '  float rv = (1.0 - smoothstep(uReveal.z * 0.45, uReveal.z, length(worldPosition.xz - uReveal.xy))) * uReveal.w;\n' +
    '  float lay = smoothstep(aFx.y * 0.7, aFx.y * 0.7 + 0.3, rv);\n' +
    '  worldPosition.y = mix(worldPosition.y, -0.03 + (worldPosition.y + 0.03) * (0.14 + 0.2 * aFx.y), lay);';
  if (!source.includes(varyingAnchor) || !source.includes(layAnchor)) return source;

  let out = replaceShaderOnce(source, varyingAnchor, `${varyingAnchor}\nvarying float vReveal;`);
  out = replaceShaderOnce(
    out,
    layAnchor,
    '  vec2 rDelta = worldPosition.xz - uReveal.xy;\n' +
      '  float rDist = length(rDelta);\n' +
      '  float rv = (1.0 - smoothstep(uReveal.z * 0.35, uReveal.z, rDist)) * uReveal.w;\n' +
      '  float lay = smoothstep(aFx.y * 0.65, aFx.y * 0.65 + 0.3, rv);\n' +
      '  worldPosition.xz += (rDelta / max(rDist, 0.05)) * 0.44 * w * lay;\n' +
      '  worldPosition.y = mix(worldPosition.y, -0.02 + (worldPosition.y + 0.02) * (0.52 + 0.22 * aFx.y), lay);\n' +
      '  vReveal = lay;',
  );
  return out;
}

/** K7：草丛片元着色器——拨开内层染青墨隐蔽影，叶尖改为柔润露青逆光而非枯黄。 */
export function patchTangSongBushFrag(source: string): string {
  const varyingAnchor = 'varying float vTip;';
  const tipAnchor = '  // 叶尖的逆光金边\n  col += vColor * sun * RECIPROCAL_PI * vTip * vTip * 0.14 * shadow;';
  if (!source.includes(varyingAnchor) || !source.includes(tipAnchor)) return source;

  let out = replaceShaderOnce(source, varyingAnchor, `${varyingAnchor}\nvarying float vReveal;`);
  out = replaceShaderOnce(
    out,
    tipAnchor,
    '  col = mix(col, col * vec3(0.56, 0.78, 0.82), vReveal * 0.45);\n' +
      '  // 叶尖青露微光\n' +
      '  col += mix(vColor, vec3(0.76, 0.96, 0.84), 0.35) * sun * RECIPROCAL_PI * vTip * vTip * 0.16 * shadow;',
  );
  return out;
}

/** K8：汴河水体片元着色器——强化天光远山渐变倒影与日照细碎金波（浮光跃金）。 */
export function patchTangSongWaterFrag(source: string): string {
  const skyAnchor =
    '  // 天光反射\n' +
    '  col = mix(col, cSky * (0.55 + 0.45 * shadow), fres * 0.5);\n' +
    '  alpha = mix(alpha, 0.85, fres * 0.6);';
  const glintAnchor =
    '  float glint = smoothstep(0.3, 0.8, sp) * shadow * (0.25 + 0.75 * band);\n' +
    '  col += sun * glint * 0.9;';
  if (!source.includes(skyAnchor) || !source.includes(glintAnchor)) return source;

  let out = replaceShaderOnce(
    source,
    skyAnchor,
    '  // 天光与淡青岚影反射\n' +
      '  vec3 tsSkyRef = mix(vec3(0.42, 0.64, 0.68), cSky, smoothstep(-0.22, 0.58, Nw.z + Nw.x * 0.5));\n' +
      '  col = mix(col, tsSkyRef * (0.58 + 0.42 * shadow), fres * 0.68);\n' +
      '  alpha = mix(alpha, 0.88, fres * 0.65);',
  );
  out = replaceShaderOnce(
    out,
    glintAnchor,
    '  float glint = smoothstep(0.28, 0.78, sp) * shadow * (0.28 + 0.72 * band);\n' +
      '  float sheen = pow(max(dot(N, H), 0.0), 38.0) * shadow * (0.14 + 0.16 * band);\n' +
      '  col += sun * (glint * 1.15 + sheen);',
  );
  return out;
}
