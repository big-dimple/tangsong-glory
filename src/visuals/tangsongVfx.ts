/**
 * tangsongVfx.ts — 唐宋风格地面战阵符印着色器（替换 FI 着色器中的西式星印与欧美符文）
 *
 * 1. fiRune (Xt.rune, type 3.5..4.5): 唐宋八卦太极莲花法阵（八角爻象 + 金边回纹 + 八瓣莲心）
 * 2. fiStar (Xt.star, type 10.5..11.5): 盛唐宝相花印（多瓣仰覆莲瓣 + 珠璧双环，消灭西式锐角五芒星）
 * 3. fiSigil (Xt.sigil, type 14.5..15.5): 寒梅六瓣纹 / 三焰纹 / 大宋如意云头金轮 / 盘龙鳞纹
 */

export const TANGSONG_VFX_SHADERS = {
  fiRune: `} else if (type < 4.5) {
    // ── 唐宋八卦太极莲花法阵（替代西式 sdStar + runes）──
    float n = max(4.0, p0);
    float appear = persist > 0.5 ? 1.0 : smoothstep(0.0, 0.1, t) * (1.0 - smoothstep(0.65, 1.0, t));
    float grow = 1.0 - min(1.0, t * 5.0);
    float sc = persist > 0.5 ? 1.0 : 1.0 - 0.28 * grow * grow;
    float rs = r / sc;
    float spin = now * p1 * 0.55;
    float aRot = ang - spin * 0.5;
    float aIn = ang + spin * 0.35;

    // 外圈双轨鎏金边环 + 古铜回纹断节
    float ln = band(rs - 0.955, 0.022, aa) + band(rs - 0.845, 0.01, aa) * 0.85 + band(rs - 0.655, 0.01, aa) * 0.78;
    float fretSeg = abs(fract(aRot / TAU * (n * 2.0)) - 0.5);
    ln += band(rs - 0.90, 0.022, 0.012) * smoothstep(0.28, 0.36, fretSeg) * 0.65;

    // 中环八卦爻画（3 道乾坤阴断阳连爻纹围绕 r=0.75）
    float trigSector = fract((ang + PI - spin * 0.4) / TAU * 8.0);
    float trigMask = step(0.14, trigSector) * step(trigSector, 0.86);
    float midBreak = smoothstep(0.06, 0.12, abs(trigSector - 0.5));
    float cellIdx = floor((ang + PI - spin * 0.4) / TAU * 8.0);
    float yao0 = band(rs - 0.79, 0.011, 0.008) * (mod(cellIdx, 2.0) < 0.5 ? 1.0 : midBreak);
    float yao1 = band(rs - 0.75, 0.011, 0.008) * (mod(floor(cellIdx * 0.5), 2.0) < 0.5 ? 1.0 : midBreak);
    float yao2 = band(rs - 0.71, 0.011, 0.008) * (mod(floor(cellIdx * 0.25), 2.0) < 0.5 ? 1.0 : midBreak);
    ln += (yao0 + yao1 + yao2) * trigMask * 0.88;

    // 内心八瓣盛唐宝相莲华 + 太极玉璧小环
    float petalRad = 0.41 + 0.14 * abs(cos(aIn * 4.0));
    float dPetal = rs - petalRad;
    ln += band(dPetal, 0.012, aa * 1.3) * 0.95;
    ln += band(rs - 0.22, 0.01, aa) * 0.7;

    float inside = 1.0 - smoothstep(0.975, 1.0, rs);
    float petalFill = 1.0 - smoothstep(-0.02, 0.01, dPetal);
    fil = ((1.0 - rs) * 0.06 + petalFill * 0.09 + 0.02) * appear * inside;
    e = ln * appear * inside;
    hot = ln * 0.2 * appear * inside;
    cov = (min(ln, 1.0) * 0.72 + 0.06) * appear * inside;
  } else if (type < 5.5) {`,

  fiStar: `} else if (type < 11.5) {
    // ── 盛唐宝相花印（尖瓣八/六瓣莲印 + 玉璧内环，消灭西式五/八角星）──
    float n = clamp(floor(p0 + 0.5), 4.0, 12.0);
    float pop = 1.0 - pow(1.0 - min(1.0, t * 5.0), 3.0);
    float sc = persist > 0.5 ? 1.0 : mix(0.28, 1.0, pop);
    float rs = r / sc;
    float theta = ang - t * (p1 > 0.5 ? 0.45 : 0.22);
    float petalRad = 0.56 + 0.34 * abs(cos(theta * n * 0.5));
    float dPetal = rs - petalRad;
    float outline = band(dPetal, 0.018, aa * 1.4);
    float innerRing = band(rs - 0.36, 0.012, aa) * 0.85 + band(rs - 0.21, 0.01, aa) * 0.65;
    float vein = band(abs(sin(theta * n * 0.5)), 0.06, 0.03) * step(0.22, rs) * (1.0 - smoothstep(0.68, 0.86, rs)) * 0.55;
    float fill = 1.0 - smoothstep(-0.018, 0.012, dPetal);
    float fade = persist > 0.5 ? 1.0 : 1.0 - smoothstep(0.3, 1.0, t);
    float inside = 1.0 - smoothstep(0.985, 1.0, rs);
    fil = fill * (0.3 + 0.35 * (1.0 - t)) * fade * inside;
    e = (outline * 1.25 + innerRing + vein) * fade * inside;
    hot = outline * 0.28 * fade * inside;
    cov = (fill * 0.36 + outline * 0.48 + innerRing * 0.3) * fade * inside;
  } else if (type < 12.5) {`,

  fiSigil: `} else if (type < 15.5) {
    // ── 唐宋四象吉纹细环：寒梅六出 / 三昧离火 / 大宋如意云头 / 盘龙金鳞 ──
    float pat = floor(p0 + 0.5);
    float unfold = persist > 0.5 ? 1.0 : 1.0 - pow(1.0 - min(1.0, t * 3.0), 3.0);
    float sc = mix(clamp(p1, 0.05, 1.0), 1.0, unfold);
    float rs = r / sc;
    float fade = persist > 0.5 ? 1.0 : 1.0 - smoothstep(0.55, 1.0, t);
    float inside = 1.0 - smoothstep(0.985, 1.0, rs);
    float ln = band(rs - 0.955, 0.024, aa) + band(rs - 0.79, 0.013, aa) * 0.8;
    float motif = 0.0;
    if (pat < 0.5) {
      // 寒梅六瓣冰花纹：六瓣圆润寒梅拱弧 + 花蕊点缀
      float plumR = 0.865 + 0.048 * abs(cos(ang * 3.0));
      motif = band(rs - plumR, 0.016, aa);
      float a6 = mod(ang + PI / 6.0, PI / 3.0) - PI / 6.0;
      float budDist = length(vec2(rs * cos(a6), rs * sin(a6)) - vec2(0.87, 0.0));
      motif = max(motif, (1.0 - smoothstep(0.032, 0.048, budDist)) + band(budDist - 0.075, 0.012, 0.008) * 0.75);
    } else if (pat < 1.5) {
      // 三昧离火纹：三朵古钟祥火舌 + 弧线
      float a3 = mod(ang + PI / 3.0, 2.0 * PI / 3.0) - PI / 3.0;
      float x = rs - 0.8;
      float flame = band(a3 * (0.9 + x * 1.6), 0.1 * (1.0 - smoothstep(0.0, 0.2, x)) + 0.006, 0.02) * step(-0.05, x) * (1.0 - smoothstep(0.18, 0.21, x));
      motif = max(flame, band(rs - 0.88, 0.014, aa) * smoothstep(0.35, 0.55, abs(a3)));
    } else if (pat < 2.5) {
      // 大宋如意云头金轮纹（替换西式八芒星轨，如意云拱 + 珠璧节点 + 柔和金脉）
      float ruyiR = 0.845 + 0.055 * abs(sin(ang * 4.0));
      motif = band(rs - ruyiR, 0.016, aa);
      float a8 = mod(ang + PI / 8.0, PI / 4.0) - PI / 8.0;
      float beadDist = length(vec2(rs * cos(a8), rs * sin(a8)) - vec2(0.895, 0.0));
      motif = max(motif, (1.0 - smoothstep(0.022, 0.036, beadDist)) * 0.9);
      float pr = fract(now * 0.5 + seed);
      float pulseR = mix(0.8, 0.99, pr);
      ln += band(rs - pulseR, 0.009, aa) * (1.0 - pr) * 0.85;
    } else {
      // 盘龙金鳞纹
      float row = rs > 0.88 ? 1.0 : 0.0;
      float n = 22.0;
      float u = ang / TAU * n + row * 0.5;
      float fu = fract(u) - 0.5;
      float y = (rs - mix(0.83, 0.92, row)) / 0.06;
      float sd = length(vec2(fu * 1.3, y + fu * fu * 1.4)) - 0.48;
      motif = band(sd, 0.08, 0.05) * step(abs(y), 1.3);
    }
    ln += motif;
    fil = (motif * 0.15 + band(rs - 0.875, 0.085, 0.04) * 0.1) * fade * inside;
    e = ln * fade * inside;
    hot = ln * 0.18 * fade * inside;
    cov = (min(ln, 1.0) * 0.55) * fade * inside;
  } else if (type < 16.5) {`,
} as const;

export interface SpriteAtlasApi {
  Oc: (ctx: CanvasRenderingContext2D, width: number, drawFn: () => void) => void;
  qu: (ctx: CanvasRenderingContext2D, points: number, outerR: number, innerR: number, rot?: number) => void;
  Ro: number;
}

export interface SpriteEntry {
  core?: number;
  path?: (alphaCtx: CanvasRenderingContext2D, shadeCtx: CanvasRenderingContext2D) => void;
  pix?: unknown;
}

/**
 * 4. 重绘 DI() 粒子图集中的 6 枚西式符号 (rune1/rune2/rune3/star/hex/leaf)，
 *    改用唐宋毛笔汉字书法「破」「风」「令」、五瓣盛唐宝相樱梅、开元通宝方孔铜钱与丹枫杏叶。
 *    全部采用 Canvas2D 确定性矢量笔画绘制，第 0 帧即可 crisp 显影，不受外部字体异步加载时机影响。
 */
export function patchTangSongSpriteAtlas(
  vb: Record<number, SpriteEntry>,
  Ft: Record<string, number>,
  api: SpriteAtlasApi,
): void {
  const { Oc, Ro } = api;

  // Ft.rune1 -> 狂草毛笔字「破」（石 + 皮）
  vb[Ft.rune1] = {
    core: 0.62,
    path: (s) => {
      Oc(s, 0.13, () => {
        s.beginPath();
        // 左半「石」：横、撇、方口
        s.moveTo(-0.76, 0.44);
        s.quadraticCurveTo(-0.46, 0.48, -0.18, 0.43);
        s.moveTo(-0.44, 0.44);
        s.quadraticCurveTo(-0.56, 0.04, -0.78, -0.34);
        s.moveTo(-0.6, -0.02);
        s.lineTo(-0.24, -0.02);
        s.lineTo(-0.26, -0.44);
        s.lineTo(-0.62, -0.44);
        s.closePath();

        // 右半「皮」：横钩、竖撇、中竖、又字交叉捺
        s.moveTo(-0.04, 0.42);
        s.quadraticCurveTo(0.02, -0.16, -0.18, -0.68);
        s.moveTo(-0.04, 0.42);
        s.lineTo(0.58, 0.44);
        s.quadraticCurveTo(0.54, 0.24, 0.44, 0.15);
        s.moveTo(0.24, 0.72);
        s.lineTo(0.24, 0.06);
        s.moveTo(0.06, 0.06);
        s.lineTo(0.54, 0.08);
        s.quadraticCurveTo(0.36, -0.34, -0.02, -0.68);
        s.moveTo(0.08, -0.04);
        s.quadraticCurveTo(0.36, -0.42, 0.7, -0.68);
      });
      s.fillStyle = '#fff';
      s.beginPath();
      s.arc(0.48, 0.64, 0.085, 0, Ro);
      s.fill();
    },
  };

  // Ft.rune2 -> 潇洒行草「风」（苏轼江风书法飞白）
  vb[Ft.rune2] = {
    core: 0.62,
    path: (s) => {
      Oc(s, 0.13, () => {
        s.beginPath();
        // 左撇弧
        s.moveTo(-0.48, 0.62);
        s.quadraticCurveTo(-0.48, -0.06, -0.72, -0.68);
        // 顶横折竖弯钩
        s.moveTo(-0.48, 0.62);
        s.quadraticCurveTo(0.04, 0.68, 0.46, 0.64);
        s.quadraticCurveTo(0.34, -0.28, 0.62, -0.68);
        s.lineTo(0.76, -0.46);
        // 腹内交叉撇点
        s.moveTo(0.24, 0.34);
        s.quadraticCurveTo(0.04, -0.06, -0.34, -0.46);
        s.moveTo(-0.24, 0.28);
        s.quadraticCurveTo(0.06, -0.08, 0.34, -0.44);
      });
      s.fillStyle = '#fff';
      for (const [dx, dy, dr] of [
        [-0.64, 0.22, 0.065],
        [0.62, 0.18, 0.075],
      ]) {
        s.beginPath();
        s.arc(dx, dy, dr, 0, Ro);
        s.fill();
      }
    },
  };

  // Ft.rune3 -> 御印篆书框「令」（刘娥诏书敕印）
  vb[Ft.rune3] = {
    core: 0.64,
    path: (s) => {
      Oc(s, 0.1, () => {
        s.beginPath();
        // 外印方框
        s.rect(-0.74, -0.74, 1.48, 1.48);
        // 人字御盖顶
        s.moveTo(-0.54, 0.2);
        s.lineTo(0, 0.56);
        s.lineTo(0.54, 0.2);
        // 中点与敕令横折竖
        s.moveTo(-0.08, 0.28);
        s.lineTo(0.08, 0.14);
        s.moveTo(-0.38, -0.02);
        s.lineTo(0.38, -0.02);
        s.lineTo(0.24, -0.32);
        s.moveTo(0, -0.02);
        s.lineTo(0, -0.56);
        s.lineTo(0.2, -0.44);
      });
      s.fillStyle = '#fff';
      s.beginPath();
      s.arc(0, 0.56, 0.065, 0, Ro);
      s.fill();
    },
  };

  // Ft.star -> 五瓣盛唐梅樱花印（取代西式五角星）
  vb[Ft.star] = {
    core: 0.22,
    path: (s, i) => {
      s.fillStyle = '#fff';
      for (let p = 0; p < 5; p++) {
        const ang = (p / 5) * Ro + Math.PI / 2;
        const cx = Math.cos(ang) * 0.48;
        const cy = Math.sin(ang) * 0.48;
        s.beginPath();
        s.ellipse(cx, cy, 0.34, 0.24, ang, 0, Ro);
        s.fill();
      }
      s.beginPath();
      s.arc(0, 0, 0.28, 0, Ro);
      s.fill();

      const grad = i.createRadialGradient(0, 0, 0.06, 0, 0, 0.9);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.24, '#9a9a9a');
      grad.addColorStop(0.82, '#ffffff');
      grad.addColorStop(1, '#cfcfcf');
      i.fillStyle = grad;
      i.fillRect(-1.2, -1.2, 2.4, 2.4);
    },
  };

  // Ft.hex -> 开元通宝方孔铜钱（取代科幻六边形）
  vb[Ft.hex] = {
    core: 0.45,
    path: (s, i) => {
      s.fillStyle = 'rgba(255,255,255,0.88)';
      s.beginPath();
      s.arc(0, 0, 0.82, 0, Ro);
      // 逆时针内方孔配合 evenodd 挖空
      s.moveTo(-0.32, -0.32);
      s.lineTo(0.32, -0.32);
      s.lineTo(0.32, 0.32);
      s.lineTo(-0.32, 0.32);
      s.closePath();
      s.fill('evenodd');

      Oc(s, 0.11, () => {
        s.beginPath();
        s.arc(0, 0, 0.78, 0, Ro);
        s.moveTo(-0.34, -0.34);
        s.lineTo(-0.34, 0.34);
        s.lineTo(0.34, 0.34);
        s.lineTo(0.34, -0.34);
        s.closePath();
      });

      const grad = i.createRadialGradient(0, 0, 0.3, 0, 0, 0.86);
      grad.addColorStop(0, '#b5b5b5');
      grad.addColorStop(0.75, '#ffffff');
      grad.addColorStop(1, '#d4d4d4');
      i.fillStyle = grad;
      i.fillRect(-1.2, -1.2, 2.4, 2.4);
    },
  };

  // Ft.leaf -> 雕琢花瓣 / 银杏扇叶剪影（花蕊夫人落英与秋叶通用）
  vb[Ft.leaf] = {
    core: 0.12,
    path: (s, i) => {
      s.fillStyle = '#fff';
      s.beginPath();
      s.moveTo(-0.78, 0);
      s.quadraticCurveTo(-0.18, 0.68, 0.76, 0.24);
      s.lineTo(0.5, 0);
      s.lineTo(0.76, -0.24);
      s.quadraticCurveTo(-0.18, -0.68, -0.78, 0);
      s.closePath();
      s.fill();

      const grad = i.createLinearGradient(-0.75, 0, 0.75, 0.2);
      grad.addColorStop(0, '#9e9e9e');
      grad.addColorStop(0.6, '#ffffff');
      grad.addColorStop(1, '#e8e8e8');
      i.fillStyle = grad;
      i.fillRect(-1.2, -1.2, 2.4, 2.4);
    },
  };
}
