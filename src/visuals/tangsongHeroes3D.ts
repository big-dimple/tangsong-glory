/**
 * tangsongHeroes3D.ts — 《唐宋荣耀》v5.0 全 6 名唐宋名士脱胎换骨级 3D 精雕重构 + 专属伴生灵宠
 *
 * 彻底肃清原作痕迹：
 * 1. 全新修长东方工笔×武侠身段骨架与精致 0.78x 头身比，全面告别原作 1:3.5 塑料大头 Q 版；
 * 2. 自研唐宋精雕面容构建器 buildTangSongFace（丹凤明眸、描黑眼尾、黛眉、花钿、点绛唇、垂鬓碎发）；
 * 3. 秦琼 (buildQinQiongFull) 100% 推倒重塑——彻底抛弃旧版矮胖身材与红漩涡方盾，化身初唐明光玄甲大将，
 *    手执四棱鎏金熟铜双锏与浮雕吞兽玄金御盾，伴生【鎏金镇岳小瑞狮】；
 * 4. 苏轼 (buildMageFull/'sushi') ——北宋青墨渐变直裰长袍、展脚乌纱幞头、紫檀仲尼七弦古琴、伴生【翩跹白仙鹤】；
 * 5. 刘娥 (buildMageFull/'liue') ——北宋朱紫织金分层祎衣、点翠九龙凤冠、悬空凤诏玉玺画轴、伴生【鎏金青鸾凤雏】；
 * 6. 文成公主 (buildWenchengFull) ——盛唐三色渐变齐胸襦裙、敦煌飞天双环披帛、凤翼牛角弓、伴生【踏云小雪狐】；
 * 7. 花蕊夫人 (buildHuaRuiWarriorFull) ——后蜀绯金海棠花瓣裂裾舞裙、双鬟红梅步摇、凌风玉锋剑、伴生【大宋小狸奴】；
 * 8. 辛弃疾 (buildXinQijiAssassinFull) ——南宋山文玄铁半甲、冲天朱红雉鸡翎战盔、环首单刀与军令图、伴生【墨羽海东青】。
 */

export interface HeroModelApi {
  m: {
    crease?: number;
    bone(id: number): HeroModelApi['m'];
    bind(fn: unknown): HeroModelApi['m'];
    paint(hex: number, opts?: Record<string, unknown>): HeroModelApi['m'];
    g(mat: unknown, fn: () => void): void;
    sym(fn: (side: number) => void): void;
    lathe(pts: number[][], opts?: Record<string, unknown>): void;
    tube(pts: number[][], opts?: Record<string, unknown>): void;
    ball(x: number, y: number, z: number, rx: number, ry: number, rz: number, flat?: number, deg?: number): void;
    box(x: number, y: number, z: number, w: number, h: number, d: number, bevel?: number): void;
    extrude(poly: number[][], depth: number, bevel?: number): void;
    torus(r: number, r1: number, r2?: number, seg?: number, tseg?: number, opts?: Record<string, unknown>): void;
    limb(p0: number[], p1: number[], r0: number, r1: number, opts?: Record<string, unknown>): void;
    sheet(nu: number, nv: number, fn: (u: number, v: number) => number[], doubleSided?: boolean): void;
    crystal(r: number, h: number, seg: number, taper?: number, sharp?: number): void;
    bakeGrounding(h?: number, minAo?: number, groundDark?: number): void;
  };
  K: Record<string, number>;
  pt: (
    x?: number,
    y?: number,
    z?: number,
    rx?: number,
    ry?: number,
    rz?: number,
    sx?: number,
    sy?: number,
    sz?: number,
  ) => { elements: number[] };
  Zi: (joints: number[], pts: number[][], baseBone: number) => unknown;
  af: (m: unknown, pos: number[], dir: number[], len: number, r: number, opts?: Record<string, unknown>) => void;
  bt: (a: number, b: number, t: number) => number;
}

export interface FullHeroEngineApi extends HeroModelApi {
  Gh: (spec: Record<string, number>) => {
    rig: {
      add: (name: string, parent: number, x: number, y: number, z: number) => number;
      addChain: (name: string, parent: number, pts: number[][]) => number[];
      chain: (opts: Record<string, unknown>) => void;
    };
    J: Record<string, number>;
    d: Record<string, number>;
  };
  Am: Record<string, number>;
  OU: Record<string, number>;
  RU: Record<string, number>;
  GU: Record<string, number>;
  kU: Record<string, number>;
  DU?: Record<string, number>;
  Ra: { tip: number; string: number };
  Co: { head: number; butt: number };
  io: number;
  Sp: number;
  Ls: new () => HeroModelApi['m'];
  En: { scale: unknown; weave?: unknown };
  Bl: (h: unknown) => unknown;
  Ox: (m: unknown, h: unknown, side: number, opts: Record<string, unknown>) => void;
  Ko: (m: unknown, h: unknown, side: number, r?: number, longSleeve?: boolean) => void;
  Js: (m: unknown, pts: number[][], opts: { width?: number | ((t: number) => number); [k: string]: unknown }) => void;
  Li: (pts: number[][], t: number) => number[];
  Wd: (m: unknown, x: number, y: number, z: number, rx: number, rz: number, r1?: number, r2?: number, seg?: number) => void;
  qh: (m: unknown, h: unknown, skinHex: number, scale?: number, neckOff?: number, widthScale?: number) => HeadObj;
  Xh?: (m: unknown, h: unknown, headObj: HeadObj, opts: Record<string, unknown>) => void;
  Cm: (m: unknown, h: unknown, headObj: HeadObj, opts: { line?: (v: number) => number; [k: string]: unknown }) => void;
  bc?: (m: unknown, opts: Record<string, unknown>) => void;
}

export interface HeroCompanionMeta {
  kind: 'lion' | 'crane' | 'phoenix' | 'fox' | 'cat' | 'hawk';
  root: number;
  a: number;
  b: number;
  c: number;
}

export interface HeroPoseWriter {
  pos(bone: number, x: number, y: number, z: number): void;
  rot(bone: number, x: number, y: number, z: number): void;
  scale(bone: number, s: number): void;
}

export interface HeroAnimState {
  anim: string;
  t: number;
  p: number;
  time: number;
  seed: number;
}

interface HeadObj {
  cy: number;
  s: number;
  ring: (offsetY: number) => [number, number, number];
  surf: (x: number, y: number) => number;
}

const clamp01 = (v: number) => (v <= 0 ? 0 : v >= 1 ? 1 : v);
const mixVal = (a: number, b: number, t: number) => a + (b - a) * clamp01(t);

// ─────────────────────────────────────────────────────────────────────────────
// 四套东方高挑写意骨架比例（1 : 6.0 英雄身段，完全兼容原版足部与上肢 IK）
// ─────────────────────────────────────────────────────────────────────────────
const TS_FEMALE_RIG = {
  ankleY: 0.09,
  kneeY: 0.48,
  hipY: 0.87,
  hipX: 0.098,
  pelvisY: 0.91,
  spineY: 1.07,
  chestY: 1.24,
  neckY: 1.48,
  headY: 1.53,
  clavX: 0.074,
  shoulderX: 0.252,
  shoulderY: 1.42,
  elbowY: 1.13,
  wristY: 0.86,
  handY: 0.77,
};

const TS_SCHOLAR_RIG = {
  ankleY: 0.09,
  kneeY: 0.48,
  hipY: 0.87,
  hipX: 0.115,
  pelvisY: 0.91,
  spineY: 1.07,
  chestY: 1.24,
  neckY: 1.49,
  headY: 1.54,
  clavX: 0.086,
  shoulderX: 0.28,
  shoulderY: 1.43,
  elbowY: 1.14,
  wristY: 0.87,
  handY: 0.78,
};

const TS_ASSASSIN_RIG = {
  ankleY: 0.09,
  kneeY: 0.48,
  hipY: 0.87,
  hipX: 0.115,
  pelvisY: 0.91,
  spineY: 1.07,
  chestY: 1.24,
  neckY: 1.49,
  headY: 1.54,
  clavX: 0.086,
  shoulderX: 0.286,
  shoulderY: 1.43,
  elbowY: 1.13,
  wristY: 0.85,
  handY: 0.76,
};

const TS_GENERAL_RIG = {
  ankleY: 0.1,
  kneeY: 0.47,
  hipY: 0.85,
  hipX: 0.155,
  pelvisY: 0.9,
  spineY: 1.08,
  chestY: 1.27,
  neckY: 1.54,
  headY: 1.59,
  clavX: 0.125,
  shoulderX: 0.378,
  shoulderY: 1.46,
  elbowY: 1.12,
  wristY: 0.8,
  handY: 0.69,
};

// ─────────────────────────────────────────────────────────────────────────────
// 国风精雕丹凤面容构建器（彻底替代 Xh 圆圈玩具眼，打造含蓄隽秀的东方神采）
// ─────────────────────────────────────────────────────────────────────────────
function buildTangSongFace(
  api: FullHeroEngineApi,
  m: HeroModelApi['m'],
  h: ReturnType<FullHeroEngineApi['Gh']>,
  opts: {
    skin: number;
    hair: number;
    hairHi: number;
    iris: number;
    lip: number;
    headScale: number;
    jawWidth?: number;
    female?: boolean;
    huadian?: number;
    moustache?: boolean;
    beard?: boolean;
    sideLocks?: boolean;
  },
): HeadObj {
  const { qh, Cm, K, pt, bt } = api;
  const s = opts.headScale;
  const head = qh(m, h, opts.skin, s, 0.215, opts.jawWidth ?? (opts.female ? 0.94 : 1.02));
  const cy = head.cy;
  const headBone = h.J.head;

  m.bone(headBone);

  // 精致双耳
  m.sym(() => {
    m.paint(opts.skin, { ao: 0.8, mat: K.skin });
    const ey = cy - 0.02 * s;
    const earX = head.ring(-0.02 * s)[0] + 0.008 * s;
    m.ball(earX, ey, -0.01 * s, 0.024 * s, 0.048 * s, 0.028 * s, 0);
  });

  // 丹凤明眸 + 轻巧眼线 + 微雕鼻尖 + 柳叶/剑眉（温和东方神采，拒绝木偶粗线）
  const eyeY = cy - 0.014 * s;
  const eyeX = 0.084 * s;
  const eyeRing = head.ring(eyeY - cy);
  const eyeZ = eyeRing[2] + eyeRing[1] * Math.sqrt(Math.max(0, 1 - (eyeX / eyeRing[0]) ** 2));
  const eyeYaw = Math.atan2(eyeX / (eyeRing[0] * eyeRing[0]), (eyeZ - eyeRing[2]) / (eyeRing[1] * eyeRing[1])) * (180 / Math.PI);
  const ew = (opts.female ? 0.038 : 0.036) * s;
  const eh = (opts.female ? 0.021 : 0.017) * s;

  m.sym(() => {
    m.g(pt(eyeX, eyeY, eyeZ - 0.005 * s, 0, eyeYaw * 0.72, opts.female ? 6 : 3), () => {
      // 柔和象牙白眼白
      m.paint(0xf6efe6, { line: 0 });
      m.ball(0, 0, 0.003 * s, ew, eh, 0.01 * s, 1);
      // 瞳眸居中（拒绝内斜视/斗鸡眼）
      m.paint(opts.iris, { glow: 0.12, line: 0 });
      m.ball(0, -eh * 0.04, 0.0085 * s, eh * 0.72, eh * 0.78, 0.006 * s, 1);
      m.paint(0x141010, { line: 0 });
      m.ball(0, -eh * 0.06, 0.0115 * s, eh * 0.36, eh * 0.38, 0.004 * s, 1);
      m.paint(0xffffff, { glow: 0.55, line: 0 });
      m.ball(ew * 0.14, eh * 0.24, 0.0138 * s, eh * 0.18, eh * 0.18, 0.0025 * s, 0);
      // 纤细上眼线与凤尾轻挑
      m.paint(0x1f191b, { line: 0 });
      m.tube(
        [
          [-ew * 0.96, 0.002 * s, 0.009 * s, 0.0032 * s],
          [0, eh * 0.85, 0.011 * s, 0.0036 * s],
          [ew * 1.02, eh * 0.32, 0.009 * s, 0.0032 * s],
          [ew * 1.24, eh * 0.62, 0.0045 * s, 0.002 * s],
        ],
        { seg: 4, up: [0, 0, 1] },
      );
      if (opts.female) {
        m.paint(0xd46a6a, { line: 0 });
        m.ball(ew * 1.05, eh * 0.14, 0.006 * s, 0.01 * s, 0.004 * s, 0.003 * s, 0);
      }
    });

    // 柔和柳叶眉 / 剑眉
    const browY = eyeY + eh + 0.022 * s;
    const browZ = head.surf(eyeX, browY) + 0.002 * s;
    m.paint(opts.hair, { line: 0 });
    m.g(pt(eyeX * 0.95, browY, browZ, -8, eyeYaw * 0.62, opts.female ? 5 : 9), () => {
      m.tube(
        [
          [-ew * 0.92, -0.002 * s, 0, 0.0042 * s, 0.0032 * s],
          [0, 0.006 * s, 0.002 * s, 0.0048 * s, 0.0035 * s],
          [ew * 1.05, opts.female ? -0.002 * s : 0.005 * s, -0.003 * s, 0.0026 * s, 0.0025 * s],
        ],
        { seg: 4 },
      );
    });
  });

  // 微浮雕清秀小鼻头（彻底取消粗香肠鼻管）
  const noseY = eyeY - 0.048 * s;
  m.paint(opts.skin, { ao: 0.88, mat: K.skin, line: 0 });
  m.ball(0, noseY, head.surf(0, noseY) + 0.009 * s, 0.012 * s, 0.02 * s, 0.013 * s, 0);

  // 樱桃点绛 / 俊朗浅唇
  const lipY = cy - 0.114 * s;
  const lipZ = head.surf(0, lipY) + 0.002 * s;
  m.paint(opts.lip, { line: 0 });
  const mw = (opts.female ? 0.024 : 0.028) * s;
  m.ball(0, lipY + 0.003 * s, lipZ, mw, 0.0065 * s, 0.008 * s, 0);
  m.ball(0, lipY - 0.004 * s, lipZ - 0.001 * s, mw * 0.8, 0.007 * s, 0.008 * s, 0);

  // 唐宋额间金钿花饰
  if (opts.huadian) {
    const hY = cy + 0.072 * s;
    const hZ = head.surf(0, hY) + 0.004 * s;
    m.paint(opts.huadian, { c2: 0xffeba8, glow: 0.25, line: 0 });
    m.g(pt(0, hY, hZ, -14, 0, 0), () =>
      m.extrude(
        [
          [0, 0.016 * s],
          [0.01 * s, 0.003 * s],
          [0.006 * s, -0.012 * s],
          [-0.006 * s, -0.012 * s],
          [-0.01 * s, 0.003 * s],
        ],
        0.0035 * s,
        0,
      ),
    );
  }

  // 文士儒雅轻须 / 俊将短颌须（无描边、纤细柔和）
  if (opts.moustache) {
    m.paint(opts.hair, { c2: opts.hairHi, mat: K.fur, line: 0 });
    m.sym(() => {
      m.tube(
        [
          [0.008 * s, lipY + 0.016 * s, head.surf(0.01 * s, lipY + 0.016 * s) + 0.005 * s, 0.0065 * s],
          [0.038 * s, lipY + 0.007 * s, head.surf(0.038 * s, lipY + 0.007 * s) + 0.004 * s, 0.005 * s],
          [0.056 * s, lipY - 0.025 * s, head.surf(0.056 * s, lipY - 0.025 * s) + 0.003 * s, 0.002 * s],
        ],
        { seg: 5 },
      );
    });
  }
  if (opts.beard) {
    m.paint(opts.hair, { c2: opts.hairHi, mat: K.fur, line: 0 });
    const bz = head.surf(0, cy - 0.16 * s) + 0.005 * s;
    m.tube(
      [
        [0, cy - 0.15 * s, bz, 0.013 * s, 0.008 * s],
        [0, cy - 0.25 * s, bz + 0.008 * s, 0.008 * s, 0.006 * s],
        [0, cy - 0.31 * s, bz + 0.01 * s, 0.002 * s, 0.002 * s],
      ],
      { seg: 5 },
    );
  }

  // 完整乌发发冠基底层（无脱发边缘）
  Cm(m, h, head, {
    c: opts.hair,
    c2: opts.hairHi,
    thick: 0.024 * s,
    gloss: 0.16,
    line: (v: number) => (v < 0.85 ? 0.145 - 0.02 * Math.sin((v / 0.85) * Math.PI * 0.5) : v < 1.36 ? bt(0.125, -0.09, (v - 0.85) / 0.51) : -0.28),
  });

  // 贴合耳际后侧的柔和鬓发（彻底消除脸颊两侧垂直黑墨条）
  if (opts.sideLocks !== false) {
    m.paint(opts.hair, { c2: opts.hairHi, mat: K.fur, line: 0 });
    m.sym(() => {
      const fx = 0.168 * s;
      const fz = -0.01 * s;
      const endY = opts.female ? cy - 0.2 : cy - 0.04;
      m.tube(
        [
          [fx * 0.94, cy + 0.09 * s, fz + 0.015 * s, 0.013 * s, 0.01 * s],
          [fx * 1.0, cy - 0.01 * s, fz - 0.015 * s, 0.011 * s, 0.008 * s],
          [fx * 0.94, endY, fz - 0.03 * s, 0.004 * s, 0.004 * s],
        ],
        { seg: 4, crease: 180 },
      );
      if (opts.female) {
        m.tube(
          [
            [0.025 * s, cy + 0.165 * s, head.surf(0.025 * s, cy + 0.165 * s) + 0.008 * s, 0.013 * s, 0.008 * s],
            [0.105 * s, cy + 0.105 * s, head.surf(0.105 * s, cy + 0.105 * s) + 0.006 * s, 0.011 * s, 0.006 * s],
            [0.158 * s, cy + 0.02 * s, fz + 0.01 * s, 0.005 * s, 0.004 * s],
          ],
          { seg: 4, crease: 180 },
        );
      }
    });
  }

  return head;
}

// ─────────────────────────────────────────────────────────────────────────────
// 伴生灵宠共建工坊与实时动画控制器
// ─────────────────────────────────────────────────────────────────────────────
function addHeroCompanion(
  m: HeroModelApi['m'],
  rig: ReturnType<FullHeroEngineApi['Gh']>['rig'],
  rootBone: number,
  K: Record<string, number>,
  pt: HeroModelApi['pt'],
  kind: HeroCompanionMeta['kind'],
): HeroCompanionMeta {
  const isBird = kind === 'crane' || kind === 'phoenix' || kind === 'hawk';
  const bx = kind === 'phoenix' ? -0.54 : kind === 'lion' ? 0.56 : isBird ? 0.56 : 0.52;
  const by = isBird ? 1.54 : 0.42;
  const bz = isBird ? -0.1 : 0.14;

  const petRoot = rig.add('petRoot', rootBone, bx, by, bz);

  if (isBird) {
    const wingL = rig.add('petWingL', petRoot, bx + 0.04, by + 0.02, bz + 0.01);
    const wingR = rig.add('petWingR', petRoot, bx - 0.04, by + 0.02, bz + 0.01);
    const tail = rig.add('petTail', petRoot, bx, by - 0.02, bz - 0.14);

    if (kind === 'crane') {
      // 宋画白仙鹤：修长曲颈 + 雪白羽躯 + 丹顶朱冠 + 墨尖展翅
      m.bone(petRoot).paint(0xfaf8f2, { c2: 0xdce4e6, mat: K.fur });
      m.tube(
        [
          [bx, by - 0.03, bz - 0.12, 0.038, 0.034],
          [bx, by, bz, 0.072, 0.068],
          [bx, by + 0.03, bz + 0.12, 0.046, 0.046],
          [bx, by + 0.11, bz + 0.15, 0.024, 0.024],
          [bx, by + 0.19, bz + 0.13, 0.02, 0.02],
          [bx, by + 0.24, bz + 0.16, 0.028, 0.03],
        ],
        { seg: 8 },
      );
      m.paint(0xd9362e, { glow: 0.2, line: 0 });
      m.ball(bx, by + 0.27, bz + 0.16, 0.022, 0.016, 0.024, 0);
      m.paint(0x1d1f24, { line: 0 });
      m.ball(bx + 0.02, by + 0.25, bz + 0.18, 0.008, 0.008, 0.008, 0);
      m.ball(bx - 0.02, by + 0.25, bz + 0.18, 0.008, 0.008, 0.008, 0);
      m.paint(0xe6b450, { c2: 0x3b2c1a, mat: K.leather });
      m.tube([[bx, by + 0.24, bz + 0.185, 0.014], [bx, by + 0.23, bz + 0.285, 0.003]], { seg: 5 });
      m.paint(0xd64838, { mat: K.leather });
      m.tube([[bx + 0.025, by - 0.05, bz - 0.04, 0.008], [bx + 0.03, by - 0.16, bz - 0.19, 0.005]], { seg: 4 });
      m.tube([[bx - 0.025, by - 0.05, bz - 0.04, 0.008], [bx - 0.03, by - 0.16, bz - 0.19, 0.005]], { seg: 4 });
      for (const [wb, sgn] of [
        [wingL, 1],
        [wingR, -1],
      ] as [number, number][]) {
        m.bone(wb).paint(0xfaf8f2, { c2: 0x1c2026, by: (u: number) => clamp01((Math.abs(u - bx) - 0.16) / 0.18), mat: K.fur });
        m.sheet(
          6,
          3,
          (u, v) => [
            bx + sgn * (0.04 + u * 0.34),
            by + 0.02 + Math.sin(u * Math.PI) * 0.06 - v * 0.015,
            bz + 0.05 - v * 0.19 - u * u * 0.08,
          ],
          true,
        );
      }
      m.bone(tail).paint(0x1f242c, { c2: 0xf4f4f0, mat: K.fur });
      m.sheet(4, 3, (u, v) => [bx + (u - 0.5) * (0.06 + v * 0.08), by - 0.01 - v * 0.05, bz - 0.12 - v * 0.16], true);
    } else if (kind === 'phoenix') {
      // 刘娥：鎏金青鸾凤雏（青碧点金双翼 + 金冠 + 三翎飘逸尾羽）
      m.bone(petRoot).paint(0x28857d, { c2: 0xf0c965, mat: K.fur });
      m.tube(
        [
          [bx, by - 0.02, bz - 0.1, 0.038, 0.036],
          [bx, by + 0.01, bz + 0.01, 0.068, 0.062],
          [bx, by + 0.08, bz + 0.11, 0.038, 0.038],
          [bx, by + 0.17, bz + 0.14, 0.036, 0.038],
        ],
        { seg: 8 },
      );
      m.paint(0xf0c456, { c2: 0xfff0b2, glow: 0.25, gloss: 0.9, mat: K.metal });
      m.tube([[bx, by + 0.17, bz + 0.17, 0.015], [bx, by + 0.16, bz + 0.23, 0.004]], { seg: 5 });
      m.tube([[bx, by + 0.2, bz + 0.14, 0.01], [bx, by + 0.27, bz + 0.06, 0.006], [bx, by + 0.28, bz - 0.04, 0.002]], { seg: 4 });
      for (const [wb, sgn] of [
        [wingL, 1],
        [wingR, -1],
      ] as [number, number][]) {
        m.bone(wb).paint(0x257a78, { c2: 0xf4cf6b, glow: 0.18, by: (u: number) => clamp01((Math.abs(u - bx) - 0.06) / 0.28), mat: K.fur });
        m.sheet(
          6,
          3,
          (u, v) => [
            bx + sgn * (0.04 + u * 0.32),
            by + 0.03 + Math.sin(u * Math.PI * 0.85) * 0.075,
            bz + 0.06 - v * 0.18 - u * 0.1,
          ],
          true,
        );
      }
      m.bone(tail).paint(0xeec458, { c2: 0x2aa39a, glow: 0.24, mat: K.fur });
      for (const ang of [-0.22, 0, 0.22]) {
        m.tube(
          [
            [bx, by - 0.02, bz - 0.1, 0.016, 0.006],
            [bx + ang * 0.18, by - 0.05, bz - 0.25, 0.022, 0.005],
            [bx + ang * 0.28, by - 0.02, bz - 0.4, 0.008, 0.004],
          ],
          { seg: 4, up: [0, 1, 0] },
        );
      }
    } else {
      // 辛弃疾：墨羽金睛海东青（锐利黑金战鹰）
      m.bone(petRoot).paint(0x1f222a, { c2: 0x5c6475, mat: K.fur });
      m.tube(
        [
          [bx, by - 0.03, bz - 0.11, 0.04, 0.038],
          [bx, by + 0.01, bz + 0.01, 0.074, 0.066],
          [bx, by + 0.06, bz + 0.1, 0.054, 0.052],
          [bx, by + 0.13, bz + 0.13, 0.044, 0.046],
        ],
        { seg: 8 },
      );
      m.paint(0xebe4d4, { mat: K.fur });
      m.ball(bx, by - 0.01, bz + 0.03, 0.052, 0.048, 0.048, 0);
      m.paint(0xe6a83e, { glow: 0.3, gloss: 0.9, mat: K.metal });
      m.tube([[bx, by + 0.13, bz + 0.17, 0.018], [bx, by + 0.1, bz + 0.22, 0.004]], { seg: 5 });
      m.paint(0xffb838, { glow: 0.55, line: 0 });
      m.ball(bx + 0.026, by + 0.14, bz + 0.155, 0.01, 0.01, 0.01, 0);
      m.ball(bx - 0.026, by + 0.14, bz + 0.155, 0.01, 0.01, 0.01, 0);
      for (const [wb, sgn] of [
        [wingL, 1],
        [wingR, -1],
      ] as [number, number][]) {
        m.bone(wb).paint(0x1b1e26, { c2: 0xd99e3a, by: (u: number) => clamp01((Math.abs(u - bx) - 0.22) / 0.14), mat: K.fur });
        m.sheet(
          6,
          3,
          (u, v) => [
            bx + sgn * (0.04 + u * 0.35),
            by + 0.02 + Math.sin(u * Math.PI * 0.7) * 0.055,
            bz + 0.06 - v * 0.17 - u * 0.14,
          ],
          true,
        );
      }
      m.bone(tail).paint(0x282d38, { c2: 0xd8a24a, mat: K.fur });
      m.sheet(4, 2, (u, v) => [bx + (u - 0.5) * (0.08 + v * 0.08), by - 0.03 - v * 0.04, bz - 0.11 - v * 0.18], true);
    }

    return { kind, root: petRoot, a: wingL, b: wingR, c: tail };
  }

  // 踩祥云伴生小瑞兽（狮、狐、狸奴）
  const head = rig.add('petHead', petRoot, bx, by + 0.15, bz + 0.08);
  const tail = rig.add('petTail', petRoot, bx, by + 0.08, bz - 0.12);
  const dummy = rig.add('petAux', petRoot, bx, by, bz);

  // 底层承载祥云 / 花瓣云托座
  m.bone(petRoot).paint(kind === 'lion' ? 0xf2d99b : kind === 'cat' ? 0xf7cfd6 : 0xdcf0f5, { c2: 0xffffff, glow: 0.16, mat: K.cloth });
  m.ball(bx, by - 0.02, bz, 0.14, 0.045, 0.16, 1);
  m.ball(bx + 0.09, by - 0.015, bz + 0.04, 0.085, 0.038, 0.085, 1);
  m.ball(bx - 0.09, by - 0.015, bz - 0.03, 0.085, 0.038, 0.085, 1);

  if (kind === 'lion') {
    // 秦琼：鎏金镇岳小瑞狮
    m.bone(petRoot).paint(0xe6b64c, { c2: 0xa66a1e, gloss: 0.5, mat: K.fur });
    m.tube([[bx, by + 0.08, bz - 0.11, 0.068, 0.062], [bx, by + 0.09, bz + 0.04, 0.082, 0.075]], { seg: 8 });
    for (const sgn of [-1, 1]) {
      m.ball(bx + sgn * 0.046, by + 0.025, bz + 0.078, 0.026, 0.02, 0.032, 0);
    }
    m.paint(0xb82e24, { mat: K.cloth });
    m.g(pt(bx, by + 0.11, bz + 0.04, 80, 0, 0), () => m.torus(0.078, 0.014, 0.014, 10, 4));
    m.paint(0xffe188, { gloss: 1, glow: 0.25, mat: K.metal });
    m.ball(bx, by + 0.065, bz + 0.105, 0.024, 0.024, 0.024, 0);

    m.bone(head).paint(0xf0c258, { c2: 0xc97e24, mat: K.fur });
    m.ball(bx, by + 0.17, bz + 0.08, 0.088, 0.082, 0.088, 0);
    m.paint(0xc4601c, { c2: 0xffe08a, mat: K.fur });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      m.ball(bx + Math.cos(a) * 0.078, by + 0.17 + Math.sin(a) * 0.078, bz + 0.055, 0.032, 0.032, 0.026, 0);
    }
    m.paint(0x161210, { line: 0 });
    m.ball(bx + 0.036, by + 0.185, bz + 0.155, 0.015, 0.015, 0.012, 0);
    m.ball(bx - 0.036, by + 0.185, bz + 0.155, 0.015, 0.015, 0.012, 0);
    m.paint(0xffffff, { glow: 0.5, line: 0 });
    m.ball(bx + 0.04, by + 0.19, bz + 0.165, 0.006, 0.006, 0.005, 0);
    m.ball(bx - 0.04, by + 0.19, bz + 0.165, 0.006, 0.006, 0.005, 0);

    m.bone(tail).paint(0xd99c38, { c2: 0xb82e24, mat: K.fur });
    m.tube([[bx, by + 0.09, bz - 0.11, 0.016], [bx, by + 0.18, bz - 0.2, 0.022], [bx, by + 0.25, bz - 0.16, 0.032]], { seg: 6 });
  } else if (kind === 'fox') {
    // 文成公主：踏云九尾感小雪狐
    m.bone(petRoot).paint(0xfafcff, { c2: 0xd4eaf0, mat: K.fur });
    m.tube([[bx, by + 0.06, bz - 0.11, 0.054, 0.05], [bx, by + 0.08, bz + 0.04, 0.064, 0.058]], { seg: 8 });
    for (const sgn of [-1, 1]) {
      m.ball(bx + sgn * 0.038, by + 0.02, bz + 0.072, 0.02, 0.016, 0.026, 0);
    }
    m.paint(0x4cb0a8, { mat: K.cloth });
    m.g(pt(bx, by + 0.1, bz + 0.04, 80, 0, 0), () => m.torus(0.062, 0.012, 0.012, 10, 4));
    m.paint(0xffe084, { gloss: 1, glow: 0.25, mat: K.metal });
    m.ball(bx, by + 0.055, bz + 0.095, 0.018, 0.018, 0.018, 0);

    m.bone(head).paint(0xffffff, { c2: 0xe6f2f6, mat: K.fur });
    m.ball(bx, by + 0.16, bz + 0.08, 0.072, 0.066, 0.078, 0);
    m.ball(bx, by + 0.145, bz + 0.145, 0.034, 0.026, 0.042, 0);
    // 尖尖狐耳 + 粉耳廓
    for (const sgn of [-1, 1]) {
      m.paint(0xffffff, { mat: K.fur });
      m.g(pt(bx + sgn * 0.046, by + 0.22, bz + 0.065, 0, 0, -sgn * 22), () => m.crystal(0.024, 0.072, 4, 0.65, 0.1));
      m.paint(0xf296a8, { line: 0 });
      m.g(pt(bx + sgn * 0.046, by + 0.215, bz + 0.072, 0, 0, -sgn * 22), () => m.crystal(0.013, 0.045, 4, 0.65, 0.1));
    }
    m.paint(0x285675, { line: 0 });
    m.ball(bx + 0.032, by + 0.172, bz + 0.145, 0.013, 0.013, 0.01, 0);
    m.ball(bx - 0.032, by + 0.172, bz + 0.145, 0.013, 0.013, 0.01, 0);

    m.bone(tail).paint(0xffffff, { c2: 0xdaf2f8, glow: 0.12, mat: K.fur });
    for (const ang of [-0.055, 0.055]) {
      m.tube(
        [
          [bx, by + 0.07, bz - 0.1, 0.02],
          [bx + ang * 1.4, by + 0.14, bz - 0.2, 0.044],
          [bx + ang * 1.9, by + 0.21, bz - 0.24, 0.014],
        ],
        { seg: 6 },
      );
    }
  } else {
    // 花蕊夫人：大宋宫廷小狸奴（奶油三花灵猫）
    m.bone(petRoot).paint(0xfcf4e8, { c2: 0xe69854, by: (x: number) => clamp01((x - bx) * 6 + 0.4), mat: K.fur });
    m.tube([[bx, by + 0.06, bz - 0.1, 0.056, 0.052], [bx, by + 0.08, bz + 0.04, 0.064, 0.06]], { seg: 8 });
    for (const sgn of [-1, 1]) {
      m.ball(bx + sgn * 0.038, by + 0.02, bz + 0.07, 0.021, 0.016, 0.025, 0);
    }
    m.paint(0xd43844, { mat: K.cloth });
    m.g(pt(bx, by + 0.1, bz + 0.04, 80, 0, 0), () => m.torus(0.062, 0.012, 0.012, 10, 4));
    m.paint(0xffe18a, { gloss: 1, glow: 0.25, mat: K.metal });
    m.ball(bx, by + 0.06, bz + 0.095, 0.018, 0.018, 0.018, 0);

    m.bone(head).paint(0xfcf4e8, { c2: 0x332b2e, by: (x: number) => clamp01((bx - x) * 7 + 0.2), mat: K.fur });
    m.ball(bx, by + 0.16, bz + 0.075, 0.074, 0.068, 0.072, 0);
    for (const sgn of [-1, 1]) {
      m.paint(sgn > 0 ? 0xe08a42 : 0x2a2428, { mat: K.fur });
      m.g(pt(bx + sgn * 0.048, by + 0.22, bz + 0.065, 0, 0, -sgn * 20), () => m.crystal(0.022, 0.06, 4, 0.7, 0.1));
      m.paint(0xf296a8, { line: 0 });
      m.g(pt(bx + sgn * 0.048, by + 0.215, bz + 0.07, 0, 0, -sgn * 20), () => m.crystal(0.012, 0.036, 4, 0.7, 0.1));
    }
    m.paint(0x2d8a68, { glow: 0.2, line: 0 });
    m.ball(bx + 0.032, by + 0.172, bz + 0.142, 0.015, 0.015, 0.01, 0);
    m.ball(bx - 0.032, by + 0.172, bz + 0.142, 0.015, 0.015, 0.01, 0);
    m.paint(0xf28296, { line: 0 });
    m.ball(bx, by + 0.15, bz + 0.148, 0.008, 0.006, 0.006, 0);

    m.bone(tail).paint(0xe08a42, { c2: 0x2d2629, mat: K.fur });
    m.tube([[bx, by + 0.07, bz - 0.09, 0.016], [bx, by + 0.18, bz - 0.17, 0.02], [bx + 0.03, by + 0.25, bz - 0.13, 0.016]], { seg: 6 });
  }

  return { kind, root: petRoot, a: head, b: tail, c: dummy };
}

export function animateHeroCompanion(
  pose: HeroPoseWriter,
  pet: HeroCompanionMeta | undefined,
  st: HeroAnimState,
): void {
  if (!pet) return;
  if (st.anim === 'dead') {
    const s = Math.max(0.001, 1 - Math.min(1, st.t * 1.4));
    pose.scale(pet.root, s);
    pose.pos(pet.root, 0, -0.35 * (1 - s), 0);
    return;
  }
  const active =
    st.anim === 'attack' || st.anim === 'spin' || st.anim === 'dash' || st.anim.startsWith('cast_');
  const spd = active ? 9.5 : 3.2;
  const ph = st.time * spd + st.seed * 6.28;
  const bob = Math.sin(ph * 0.72) * (active ? 0.085 : 0.048);

  if (pet.kind === 'crane' || pet.kind === 'phoenix' || pet.kind === 'hawk') {
    const flap = Math.sin(ph) * (active ? 34 : 22) + 8;
    pose.pos(pet.root, Math.cos(ph * 0.4) * 0.03, bob, Math.sin(ph * 0.4) * 0.03);
    pose.rot(pet.root, active ? -10 : Math.sin(ph * 0.5) * 4, Math.cos(ph * 0.35) * 6, 0);
    pose.rot(pet.a, 0, 0, flap); // wingL
    pose.rot(pet.b, 0, 0, -flap); // wingR
    pose.rot(pet.c, Math.sin(ph * 0.8) * 10 - 6, 0, 0); // tail
  } else {
    const bounce = Math.abs(Math.sin(ph * 0.65)) * (active ? 0.09 : 0.032);
    pose.pos(pet.root, 0, bounce, 0);
    pose.rot(pet.root, active ? -6 : 0, Math.sin(ph * 0.3) * 5, 0);
    pose.rot(pet.a, Math.sin(ph * 0.55) * 6 + (active ? -10 : 0), Math.sin(ph * 0.35) * 14, Math.cos(ph * 0.4) * 5); // head
    pose.rot(pet.b, Math.sin(ph * 1.1) * 12, Math.sin(ph * 1.4) * 28, Math.cos(ph * 1.2) * 8); // tail
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. 秦琼 (100% 推倒重建！彻底告别旧版模型，初唐明光玄甲大将 + 双金锏 + 吞兽玄盾 + 小瑞狮)
// ─────────────────────────────────────────────────────────────────────────────
export function buildQinQiongFull(api: FullHeroEngineApi, pal: Record<string, number>) {
  const { Gh, Ls, K, En, pt, bt, Zi, Bl, Ox, Ko, Js, Wd, af, bc } = api;
  const n = Gh(TS_GENERAL_RIG);
  const { rig: t, J: e, d: s } = n;
  const i = new Ls();
  i.crease = 36;

  // 严格兼容 FU() 的骨骼：shield (于 foreL 挂左盾) + mane + cloak + tab
  const shieldBone = t.add('shield', e.foreL, s.shoulderX + 0.14, 0.94, 0.04);

  const tabPts = [
    [0, 0.9, 0.21],
    [0, 0.68, 0.24],
    [0, 0.46, 0.26],
    [0, 0.28, 0.26],
  ];
  const tabChain = t.addChain('tab', e.hips, tabPts.slice(0, 3));
  t.chain({ joints: tabChain, tip: [0, -0.18, 0], stiffness: 8, drag: 0.86, gravity: 10, maxAngle: 48 });

  const cloakPts = [
    [0, 1.46, -0.16],
    [0, 1.18, -0.32],
    [0, 0.88, -0.4],
    [0, 0.58, -0.45],
    [0, 0.32, -0.48],
  ];
  const cloakChain = t.addChain('tail', e.chest, cloakPts.slice(0, 4));
  t.chain({
    joints: cloakChain,
    tip: [0, -0.22, -0.02],
    stiffness: 3.4,
    drag: 0.92,
    gravity: 7,
    maxAngle: 70,
    wind: 2.5,
    colliders: [{ joint: e.chest, x: 0, y: 0, z: 0, r: 0.32 }],
  });

  const headScale = 0.84;
  const cyRef = s.headY + 0.215 * headScale;
  const manePts = [
    [0, cyRef + 0.3 * headScale, -0.04],
    [0, cyRef + 0.45 * headScale, -0.18],
    [0, cyRef + 0.56 * headScale, -0.34],
  ];
  const maneChain = t.addChain('mane', e.head, manePts.slice(0, 2));
  t.chain({ joints: maneChain, tip: [0, 0.06, -0.2], stiffness: 12, drag: 0.84, gravity: 5, maxAngle: 36, wind: 1.8 });

  // 1. 修健玄铁长靴与札甲护胫（带护膝无缝叠接）
  i.sym((side) => {
    const hx = s.hipX;
    i.bone(side > 0 ? e.thighL : e.thighR).paint(pal.clothDark, { c2: pal.cloth, ao: 0.88, mat: K.cloth });
    i.limb([hx, s.hipY + 0.05, 0], [hx, s.kneeY - 0.04, 0], 0.142, 0.108, { seg: 8 });
    i.bone(side > 0 ? e.shinL : e.shinR).paint(pal.ironDark, { c2: pal.ironLight, gloss: 0.72, mat: K.metal });
    i.lathe(
      [
        [s.ankleY - 0.02, 0.095, 0.105, hx, 0],
        [0.28, 0.11, 0.118, hx, 0],
        [s.kneeY + 0.04, 0.112, 0.116, hx, 0],
      ],
      { seg: 8 },
    );
    i.paint(pal.ironLight, { c2: pal.bronze, gloss: 0.85, mat: K.metal });
    i.ball(hx, s.kneeY, 0, 0.105, 0.095, 0.105, 0);
    i.paint(pal.bronze, { c2: pal.amber, gloss: 1, mat: K.metal });
    i.ball(hx, s.kneeY + 0.02, 0.115, 0.048, 0.056, 0.028, 0);
  });
  for (const side of [1, -1]) {
    i.paint(pal.leatherDark, { c2: pal.leather, gloss: 0.35, mat: K.leather });
    Ox(i, n, side, { top: 0.3, rTop: 0.102, rAnkle: 0.082, len: 0.28, toe: 0.024 });
  }

  // 2. 分层初唐玄甲腿裙（札甲片裙摆 + 朱红锦袍底摆 + 前垂锦绶）
  const skirtBind = (sideX: number, y: number) => {
    const th = sideX >= 0 ? e.thighL : e.thighR;
    return y >= 0.9 ? [e.hips, e.hips, 1] : [e.hips, th, clamp01((y - 0.5) / 0.4)];
  };
  i.bind(skirtBind).paint(pal.redDark, { c2: pal.red, mat: K.cloth });
  i.lathe(
    [
      [0.44, 0.29, 0.25],
      [0.68, 0.245, 0.21],
      [0.92, 0.23, 0.185],
    ],
    { seg: 14, cap0: false, cap1: false },
  );
  i.paint(pal.ironDark, { c2: pal.bronze, gloss: 0.78, mat: K.metal, pattern: En.scale, patternScale: 12, patternAmt: 0.3 });
  if (bc) {
    bc(i, { yTop: 0.94, yBot: 0.58, top: [0.24, 0.2], bot: [0.31, 0.26], a0: -62, a1: 62, n: 6, double: true });
    bc(i, { yTop: 0.94, yBot: 0.58, top: [0.24, 0.2], bot: [0.31, 0.26], a0: 118, a1: 242, n: 6, double: true });
  }
  i.bind(Zi(tabChain, tabPts, e.hips)).paint(pal.red, { c2: pal.bronze, mat: K.cloth });
  Js(i, tabPts, { width: (tVal: number) => mixVal(0.14, 0.19, tVal), bow: [0, 0, 0.02], nu: 3, nv: 6, tail: 'swallow', tailLen: 0.12 });

  // 3. 初唐明光玄铁胸铠 + 标志性双枚鎏金明光圆护镜 + 金兽腰扣
  i.bind(Bl(n)).paint(pal.ironDark, { c2: pal.ironLight, gloss: 0.78, mat: K.metal, pattern: En.scale, patternScale: 11, patternAmt: 0.25 });
  i.lathe(
    [
      [0.88, 0.225, 0.175],
      [1.0, 0.205, 0.158],
      [1.15, 0.255, 0.185],
      [1.34, 0.31, 0.21],
      [1.46, 0.22, 0.15],
      [1.51, 0.115, 0.105],
    ],
    { seg: 14 },
  );
  i.bone(e.neck).paint(pal.skin, { ao: 0.75, mat: K.skin });
  i.lathe([[1.48, 0.088, 0.088], [1.62, 0.084, 0.084]], { seg: 10, cap0: false });

  // 明光甲左右双圆护镜 & 鎏金抱肚
  i.bone(e.chest).paint(pal.bronze, { c2: pal.amber, gloss: 1, glow: 0.15, mat: K.metal });
  i.sym(() => {
    i.g(pt(0.115, 1.32, 0.205, 84, 18, 0), () =>
      i.lathe([[0, 0.088], [0.018, 0.084], [0.032, 0.038]], { seg: 12, cap0: false }),
    );
  });
  i.paint(pal.red, { c2: pal.redDark, mat: K.cloth });
  i.g(pt(0, 1.48, 0, 8, 0, 0), () => i.torus(0.125, 0.028, 0.026, 12, 4));
  i.bone(e.spine).paint(pal.leatherDark, { c2: pal.leather, mat: K.leather });
  i.lathe([[0.93, 0.232, 0.184], [1.04, 0.212, 0.168]], { seg: 12 });
  i.paint(pal.bronze, { c2: pal.amber, gloss: 1, mat: K.metal });
  i.g(pt(0, 0.99, 0.188), () => i.box(0, 0, 0, 0.14, 0.095, 0.036, 0.01));

  // 4. 咆哮吞肩兽鎏金双肩 + 无缝甲臂 + 猎猎帅袍（sym 内保持正侧坐标与正角度）
  i.sym((side) => {
    const sx = s.shoulderX;
    i.bone(side > 0 ? e.clavL : e.clavR).paint(pal.bronze, { c2: pal.amber, gloss: 0.95, mat: K.metal });
    i.g(pt(0.36, 1.5, 0, 0, 0, -20), () => {
      i.lathe(
        [
          [-0.08, 0.175, 0.165],
          [0, 0.195, 0.18],
          [0.11, 0.13, 0.125],
          [0.16, 0.04, 0.04],
        ],
        { seg: 10 },
      );
    });
    i.paint(pal.red, { mat: K.cloth });
    i.g(pt(0.39, 1.52, 0.01, 0, 90, 0), () => i.torus(0.14, 0.02, 0.02, 10, 4));
    i.bone(side > 0 ? e.armL : e.armR).paint(pal.clothDark, { c2: pal.ironLight, mat: K.cloth });
    i.ball(sx, s.shoulderY, 0, 0.115, 0.105, 0.115, 0);
    i.limb([sx, s.shoulderY + 0.04, 0], [sx, s.elbowY - 0.04, 0], 0.105, 0.088, { seg: 8 });
    i.bone(side > 0 ? e.foreL : e.foreR).paint(pal.clothDark, { c2: pal.ironLight, mat: K.cloth });
    i.limb([sx, s.elbowY + 0.04, 0], [sx, s.wristY - 0.02, 0], 0.09, 0.076, { seg: 8 });
    i.paint(pal.ironLight, { c2: pal.bronze, gloss: 0.85, mat: K.metal });
    i.ball(sx, s.elbowY, 0, 0.096, 0.086, 0.096, 0);
    i.lathe(
      [
        [s.wristY - 0.02, 0.078, 0.078, sx, 0],
        [s.wristY + 0.06, 0.092, 0.092, sx, 0],
        [s.elbowY - 0.04, 0.096, 0.096, sx, 0],
      ],
      { seg: 8 },
    );
  });
  i.paint(pal.skin, { ao: 0.88, mat: K.skin });
  Ko(i, n, 1, 0.072);
  Ko(i, n, -1, 0.072);

  i.bind(Zi(cloakChain, cloakPts, e.chest)).paint(pal.red, { c2: pal.redDark, mat: K.cloth });
  Js(i, cloakPts, { width: (tVal: number) => mixVal(0.28, 0.44, tVal), bow: [0, 0, -0.06], wave: 0.26, nu: 5, nv: 10, tail: 'swallow', tailLen: 0.2 });

  // 5. 秦琼精雕威武面庞 + 初唐鎏金凤翅兜鍪 + 朱红马尾缨
  const head = buildTangSongFace(api, i, n, {
    skin: pal.skin,
    hair: pal.hair,
    hairHi: pal.hairHi,
    iris: 0x2a1812,
    lip: 0xb05f4d,
    headScale,
    jawWidth: 1.06,
    moustache: true,
    beard: true,
  });
  buildQinQiongHeadAndMace({ m: i, K, pt, bt, Zi, af }, pal, e.head, e.propR, head, headScale, maneChain, manePts, s.shoulderX, s.handY);

  // 6. 左手全新雕塑级【吞兽玄金御盾】（挂于 shieldBone，对齐 FU() 前臂旋转 [0, 90, 90]）
  i.bone(shieldBone);
  i.g(pt(s.shoulderX + 0.14, 0.94, 0.04, 0, 90, 90), () => {
    i.paint(pal.ironDark, { c2: pal.ironLight, gloss: 0.72, mat: K.metal });
    i.extrude(
      [
        [0, 0.56],
        [0.24, 0.44],
        [0.34, 0.1],
        [0.28, -0.34],
        [0, -0.58],
        [-0.28, -0.34],
        [-0.34, 0.1],
        [-0.24, 0.44],
      ],
      0.055,
      0.015,
    );
    i.paint(pal.bronze, { c2: pal.amber, gloss: 1, glow: 0.18, mat: K.metal });
    // 八角凸起金框与吞兽浮雕中心虎头盾脐
    for (const [bx, by] of [
      [-0.2, 0.24],
      [0.2, 0.24],
      [-0.22, -0.18],
      [0.22, -0.18],
    ]) {
      i.ball(bx, by, 0.06, 0.032, 0.032, 0.025, 0);
    }
    i.g(pt(0, 0.04, 0.06, 90, 0, 0), () => i.lathe([[0, 0.16], [0.024, 0.14], [0.048, 0.075], [0.06, 0.01]], { seg: 10 }));
    i.paint(pal.amber, { c2: 0xffffff, glow: 0.45, mat: K.crystal, line: 0 });
    i.ball(0, 0.04, 0.118, 0.042, 0.042, 0.024, 0);
  });

  // 左腰侧副熟铜短锏（体现秦琼“双锏”英风，独立挂于 e.hips 不受盾牌平移影响）
  i.bone(e.hips);
  i.paint(pal.bronze, { c2: pal.amber, gloss: 1, mat: K.metal });
  i.g(pt(-0.24, 0.82, -0.02, -32, 0, -14), () => {
    i.tube([[0, -0.22, 0, 0.026], [0, 0.36, 0, 0.034]], { seg: 4 });
  });

  // 7. 伴生灵宠：鎏金镇岳小瑞狮
  const pet = addHeroCompanion(i, t, e.root, K, pt, 'lion');

  i.bakeGrounding(2.1, 0.76, 0.9);
  return { h: n, b: i, extra: { shield: shieldBone, mane: maneChain, pet } };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. 苏轼 & 刘娥：修长身段 + 精雕面容 + 古琴/凤诏卷 + 白仙鹤/金凤青鸾
// ─────────────────────────────────────────────────────────────────────────────
export function buildMageFull(api: FullHeroEngineApi, pal: Record<string, number>, variant: string) {
  const { Gh, Ls, K, pt, bt, Zi, Bl, Ox, Ko, Js, Li, Wd, af } = api;
  const isEmpress = variant === 'liue';
  const rigSpec = isEmpress ? TS_FEMALE_RIG : TS_SCHOLAR_RIG;
  const n = Gh(rigSpec);
  const { rig: t, J: e, d: s } = n;
  const i = new Ls();

  // 严格匹配 $U() 动画控制器骨骼（跟随全新修长 chestY=1.24 同步抬高琴位）
  const pipaOrigin: [number, number, number] = isEmpress ? [-0.08, 1.11, 0.255] : [-0.1, 1.1, 0.245];
  const o = pt(pipaOrigin[0], pipaOrigin[1], pipaOrigin[2], -14, 8, -52, 1.08);
  const r = o.elements;
  const localToChest = (x: number, y: number, z: number): [number, number, number] => [
    r[0] * x + r[4] * y + r[8] * z,
    r[1] * x + r[5] * y + r[9] * z,
    r[2] * x + r[6] * y + r[10] * z,
  ];
  const c = t.add('pipa', e.chest, pipaOrigin[0], pipaOrigin[1], pipaOrigin[2]);
  const f = t.add('pipaPos', e.chest, 0, s.chestY, 0);
  const d = t.add('pluck', e.chest, 0, s.chestY, 0);
  const h = t.add('free', e.chest, 0, s.chestY, 0);

  const uScale = isEmpress ? 0.78 : 0.81;
  const topY = s.headY + 0.215 * uScale;
  const hairPts = isEmpress
    ? [
        [0, topY - 0.08, -0.18],
        [0, 1.44, -0.27],
        [0, 1.2, -0.31],
        [0, 0.98, -0.32],
      ]
    : [
        [0, topY - 0.1, -0.15],
        [0, 1.48, -0.18],
        [0, 1.38, -0.19],
      ];
  const hairChain = t.addChain('hair', e.head, hairPts.slice(0, hairPts.length - 1));
  t.chain({
    joints: hairChain,
    tip: [0, -0.18, -0.01],
    stiffness: 7.5,
    drag: 0.88,
    gravity: 10,
    maxAngle: 45,
    wind: 1.0,
    colliders: [{ joint: e.chest, x: 0, y: 0.05, z: -0.04, r: 0.24 }],
  });

  const makeRib = (side: number) => [
    [side * 0.11, 1.04, 0.14],
    [side * 0.14, 0.8, 0.19],
    [side * 0.15, 0.56, 0.22],
    [side * 0.15, 0.34, 0.24],
  ];
  const ribL = t.addChain('ribL', e.hips, makeRib(1).slice(0, 3));
  const ribR = t.addChain('ribR', e.hips, makeRib(-1).slice(0, 3));
  for (const rb of [ribL, ribR]) {
    t.chain({ joints: rb, tip: [0, -0.2, 0.04], stiffness: 4.5, drag: 0.92, gravity: 7, maxAngle: 64, wind: 2.0 });
  }

  const cloakPts = isEmpress
    ? [
        [0, 1.38, -0.08],
        [0, 1.1, -0.18],
        [0, 0.8, -0.25],
        [0, 0.52, -0.3],
        [0, 0.26, -0.33],
      ]
    : [
        [0, 1.38, -0.09],
        [0, 1.08, -0.17],
        [0, 0.78, -0.22],
        [0, 0.48, -0.25],
      ];
  const cloakChain = t.addChain('cloak', e.chest, cloakPts.slice(0, cloakPts.length - 1));
  t.chain({
    joints: cloakChain,
    tip: [0, -0.22, -0.03],
    stiffness: 3.8,
    drag: 0.92,
    gravity: 8,
    maxAngle: 62,
    wind: 2.2,
    colliders: [
      { joint: e.hips, x: 0, y: -0.1, z: 0.1, r: 0.3 },
      { joint: e.chest, x: 0, y: 0, z: 0.08, r: 0.26 },
    ],
  });

  if (!isEmpress) {
    // ────────── 【苏轼：修长清逸北宋文士 · 山水直裰长衫 + 诗卷葫芦 + 白仙鹤】 ──────────
    i.sym((side) => {
      const hx = s.hipX;
      i.bone(side > 0 ? e.thighL : e.thighR).paint(pal.trimDark, { c2: pal.trim, mat: K.cloth });
      i.limb([hx, s.hipY + 0.04, 0], [hx, s.kneeY, 0], 0.106, 0.084, { seg: 8 });
      i.bone(side > 0 ? e.shinL : e.shinR).paint(pal.trimDark, { c2: pal.trim, mat: K.cloth });
      i.limb([hx, s.kneeY, 0], [hx, s.ankleY, 0], 0.08, 0.062, { seg: 8 });
    });
    for (const side of [1, -1]) {
      i.paint(0x161920, { c2: 0x333946, gloss: 0.35, mat: K.leather });
      Ox(i, n, side, { top: 0.28, rTop: 0.084, rAnkle: 0.068, len: 0.24, toe: 0.026 });
    }

    // 修长直裰青墨渐变长衫（墨韵下摆渐淡青白）
    const robeBind = (sideX: number, y: number) => {
      const th = sideX >= 0 ? e.thighL : e.thighR;
      const sh = sideX >= 0 ? e.shinL : e.shinR;
      if (y >= 0.92) return [e.hips, e.hips, 1];
      if (y >= 0.5) return [e.hips, th, clamp01(1 - (0.92 - y) / 0.42)];
      return [th, sh, clamp01(1 - clamp01((0.5 - y) / 0.38) * 0.5)];
    };
    i.bind(robeBind).paint(pal.cloakDark, { c2: pal.robe, ao: 0.9, mat: K.cloth, by: (_u: number, yVal: number) => clamp01((yVal - 0.14) / 0.85) });
    i.lathe(
      [
        [0.14, 0.255, 0.225],
        [0.36, 0.23, 0.195],
        [0.64, 0.208, 0.172],
        [0.88, 0.195, 0.158],
        [1.0, 0.185, 0.146],
      ],
      { seg: 14, cap0: false, cap1: false },
    );
    i.paint(pal.gold, { c2: pal.hem, mat: K.cloth });
    i.lathe([[0.132, 0.26, 0.23], [0.162, 0.254, 0.224]], { seg: 14, cap0: false, cap1: false });

    // 上身交领直裰 + 黑犀金銙革带 + 腰悬诗卷与朱漆酒葫芦
    i.bind(Bl(n)).paint(pal.robe, { c2: pal.cloakLight, ao: 0.9, mat: K.cloth });
    i.lathe(
      [
        [0.92, 0.192, 0.152],
        [1.04, 0.172, 0.136],
        [1.16, 0.195, 0.148],
        [1.3, 0.232, 0.165],
        [1.42, 0.178, 0.132],
        [1.49, 0.088, 0.082],
      ],
      { seg: 12 },
    );
    i.bone(e.neck).paint(pal.skin, { ao: 0.78, mat: K.skin });
    i.lathe([[1.46, 0.064, 0.064], [1.58, 0.062, 0.062]], { seg: 8, cap0: false });

    i.bone(e.chest).paint(pal.trim, { c2: pal.trimDark, mat: K.cloth });
    i.g(pt(0, 1.47, 0, 8, 0, 0), () => i.torus(0.098, 0.02, 0.02, 10, 4));
    i.tube(
      [
        [0.075, 1.46, 0.052, 0.028, 0.012],
        [0.04, 1.35, 0.152, 0.03, 0.012],
        [-0.06, 1.2, 0.172, 0.028, 0.012],
      ],
      { seg: 4, up: [1, 0.4, 0] },
    );

    i.bone(e.spine).paint(0x1b1716, { c2: 0x3b302b, gloss: 0.35, mat: K.leather });
    i.lathe([[0.98, 0.195, 0.156], [1.08, 0.18, 0.144]], { seg: 12 });
    i.paint(pal.gold, { c2: 0xe6fcf8, gloss: 1, glow: 0.14, mat: K.metal });
    for (const ang of [0, 34, -34, 180]) {
      const rad = (ang * Math.PI) / 180;
      i.g(pt(Math.sin(rad) * 0.184, 1.03, Math.cos(rad) * 0.148, 0, ang, 0), () => i.box(0, 0, 0, 0.056, 0.048, 0.018, 0.004));
    }
    // 腰悬朱漆醉翁酒葫芦 + 诗卷
    i.bone(e.hips).paint(0x9e3222, { c2: 0xd96e32, gloss: 0.6, mat: K.leather });
    i.g(pt(0.21, 0.95, 0.06, 10, 0, -14), () => {
      i.ball(0, -0.06, 0, 0.046, 0.052, 0.046, 0);
      i.ball(0, 0.02, 0, 0.032, 0.036, 0.032, 0);
    });
    i.paint(0xe6dec8, { c2: pal.gold, mat: K.cloth });
    i.g(pt(-0.2, 0.94, 0.02, 48, 12, 16), () => i.tube([[0, -0.12, 0, 0.026], [0, 0.12, 0, 0.026]], { seg: 8 }));

    for (const [rb, side] of [
      [ribL, 1],
      [ribR, -1],
    ] as [number[], number][]) {
      const pts = makeRib(side);
      i.bind(Zi(rb, pts, e.hips)).paint(pal.cloak, { c2: pal.cloakDark, mat: K.cloth });
      Js(i, pts, { width: (tVal: number) => bt(0.03, 0.042, tVal), axis: [1, 0, 0], bow: [0, 0, 0.01], nu: 2, nv: 6, tail: 'swallow', tailLen: 0.08, wave: 0.3 });
    }

    // 潇洒广袖
    i.sym((side) => {
      const sx = s.shoulderX;
      i.bone(side > 0 ? e.armL : e.armR).paint(pal.cloak, { c2: pal.cloakLight, mat: K.cloth });
      i.limb([sx, s.shoulderY + 0.02, 0], [sx, s.elbowY + 0.02, 0], 0.09, 0.105, { seg: 8 });
      i.bone(side > 0 ? e.foreL : e.foreR).paint(pal.cloakDark, { c2: pal.cloak, mat: K.cloth });
      i.lathe(
        [
          [s.wristY - 0.06, 0.132, 0.132, sx, 0],
          [s.wristY + 0.02, 0.12, 0.12, sx, 0],
          [s.elbowY + 0.02, 0.075, 0.075, sx, 0],
        ],
        { seg: 10, cap0: false },
      );
      i.paint(pal.gold, { c2: pal.hem, mat: K.cloth });
      i.lathe([[s.wristY - 0.065, 0.135, 0.135, sx, 0], [s.wristY - 0.035, 0.128, 0.128, sx, 0]], { seg: 10, cap0: false, cap1: false });
    });
    i.paint(pal.skin, { mat: K.skin });
    Ko(i, n, 1, 0.05);
    Ko(i, n, -1, 0.05);

    i.bind(Zi(cloakChain, cloakPts, e.chest)).paint(pal.cloakDark, { c2: pal.cloak, mat: K.cloth });
    Js(i, cloakPts, { width: (tVal: number) => mixVal(0.22, 0.33, tVal), bow: [0, 0, -0.07], wave: 0.16, nu: 5, nv: 6, tail: 'flat' });

    const head = buildTangSongFace(api, i, n, {
      skin: pal.skin,
      hair: pal.hair,
      hairHi: pal.hairHi,
      iris: 0x261d18,
      lip: 0xb06a56,
      headScale: uScale,
      moustache: true,
      beard: true,
    });
    buildSuShiHeadAndGuqin({ m: i, K, pt, bt, Zi, af }, pal, e.head, c, o, head, uScale);
    const pet = addHeroCompanion(i, t, e.root, K, pt, 'crane');
    i.bakeGrounding(2.05, 0.78, 0.9);
    return {
      h: n,
      b: i,
      extra: {
        pipa: c,
        pipaPos: f,
        pluck: d,
        free: h,
        ax: [localToChest(1, 0, 0), localToChest(0, 1, 0), localToChest(0, 0, 1)],
        handR: (() => {
          const p = localToChest(-0.09, -0.02, 0.11);
          return [p[0] - 0.02, p[1] + 0.03, p[2] + 0.01];
        })(),
        handL: (() => {
          const p = localToChest(0, 0.3, 0);
          return [p[0] + 0.03, p[1] - 0.06, p[2] + 0.02];
        })(),
        face: localToChest(0, -0.04, 0.07),
        pet,
      },
    };
  }

  // ────────── 【刘娥：北宋垂帘皇太后 · 分层祎衣凤尾裙 + 点翠九龙冠 + 凤诏玉玺卷 + 青鸾】 ──────────
  const legBind = (sideX: number, y: number) => {
    const thigh = sideX >= 0 ? e.thighL : e.thighR;
    const shin = sideX >= 0 ? e.shinL : e.shinR;
    if (y >= 0.92) return [e.hips, e.hips, 1];
    if (y >= 0.5) return [e.hips, thigh, 1 - (0.92 - y) / 0.42];
    return [thigh, shin, 1 - clamp01((0.5 - y) / 0.4) * 0.6];
  };
  i.sym((side) => {
    i.bone(side > 0 ? e.footL : e.footR).paint(pal.cloakDark, { c2: pal.gold, mat: K.cloth });
    i.tube(
      [
        [s.hipX, 0.05, -0.06, 0.052, 0.04],
        [s.hipX, 0.06, 0.07, 0.06, 0.048],
        [s.hipX, 0.08, 0.2, 0.04, 0.028],
        [s.hipX, 0.13, 0.24, 0.024, 0.018],
      ],
      { seg: 6 },
    );
  });

  // 优雅纤腰分层礼裙（告别呆板圆桶）
  i.bind(legBind).paint(pal.cloak, { c2: pal.cloakDark, ao: 0.88, mat: K.cloth, by: (_u: number, v: number) => clamp01((v - 0.1) / 0.4) });
  i.lathe(
    [
      [0.08, 0.4, 0.38],
      [0.34, 0.32, 0.3],
      [0.64, 0.24, 0.215],
      [0.9, 0.175, 0.145],
      [1.04, 0.155, 0.125],
    ],
    { seg: 16, cap0: false, cap1: false, shape: (ang: number, idx: number) => 1 + (idx < 3 ? 0.05 * Math.sin(ang * 10) : 0) },
  );
  i.paint(pal.gold, { c2: pal.goldDark, gloss: 0.9, mat: K.metal });
  i.lathe([[0.07, 0.41, 0.39], [0.11, 0.405, 0.385]], { seg: 16, cap0: false, cap1: false });
  // 外层翟衣绣金花瓣上裳
  i.paint(pal.cloakLight ?? pal.cloak, { c2: pal.gold, mat: K.cloth });
  i.lathe(
    [
      [0.44, 0.33, 0.31],
      [0.72, 0.24, 0.215],
      [0.98, 0.178, 0.146],
    ],
    { seg: 12, cap0: false, cap1: false, shape: (ang: number, idx: number) => 1 + (idx === 0 ? 0.075 * Math.sin(ang * 6) : 0) },
  );

  i.bind(Bl(n)).paint(pal.cloakDark, { c2: pal.cloak, mat: K.cloth });
  i.lathe(
    [
      [0.92, 0.165, 0.132],
      [1.05, 0.136, 0.106],
      [1.22, 0.18, 0.138],
      [1.36, 0.195, 0.136],
      [1.46, 0.11, 0.09],
    ],
    { seg: 12 },
  );
  i.bone(e.neck).paint(pal.skin, { ao: 0.78, mat: K.skin });
  i.lathe([[1.44, 0.052, 0.052], [1.56, 0.05, 0.05]], { seg: 8, cap0: false });

  // 如意云肩 + 紫金霞帔
  i.bone(e.chest).paint(pal.gold, { c2: 0xffeba8, gloss: 1, glow: 0.2, mat: K.metal });
  i.g(pt(0, 1.42, 0, 12, 0, 0), () => i.torus(0.18, 0.024, 0.032, 12, 4));
  i.paint(pal.cloak, { c2: pal.gold, mat: K.cloth });
  i.g(pt(0, 1.38, 0.01, 14, 0, 0), () => i.torus(0.205, 0.016, 0.022, 12, 4));
  i.bone(e.spine).paint(pal.gold, { c2: pal.goldDark, gloss: 1, mat: K.metal });
  i.lathe([[1.0, 0.162, 0.13], [1.08, 0.146, 0.116]], { seg: 12 });

  for (const [rb, side] of [
    [ribL, 1],
    [ribR, -1],
  ] as [number[], number][]) {
    const pts = makeRib(side);
    i.bind(Zi(rb, pts, e.hips)).paint(pal.cloak, { c2: pal.gold, mat: K.cloth });
    Js(i, pts, { width: (tVal: number) => bt(0.042, 0.064, tVal), axis: [1, 0, 0], bow: [0, 0, 0.012], nu: 2, nv: 6, tail: 'swallow', tailLen: 0.1, wave: 0.45 });
  }

  i.sym((side) => {
    const sx = s.shoulderX;
    i.bone(side > 0 ? e.armL : e.armR).paint(pal.cloak, { c2: pal.gold, mat: K.cloth });
    i.limb([sx, s.shoulderY + 0.02, 0], [sx, s.elbowY + 0.02, 0], 0.08, 0.092, { seg: 8 });
    i.bone(side > 0 ? e.foreL : e.foreR).paint(pal.cloakDark, { c2: pal.cloak, mat: K.cloth });
    i.lathe(
      [
        [s.wristY - 0.05, 0.118, 0.118, sx, 0],
        [s.wristY + 0.02, 0.105, 0.105, sx, 0],
        [s.elbowY + 0.02, 0.068, 0.068, sx, 0],
      ],
      { seg: 10, cap0: false },
    );
    i.paint(pal.gold, { c2: 0xffeba8, gloss: 0.95, mat: K.metal });
    i.lathe([[s.wristY - 0.055, 0.122, 0.122, sx, 0], [s.wristY - 0.025, 0.116, 0.116, sx, 0]], { seg: 10, cap0: false, cap1: false });
  });
  i.paint(pal.skin, { mat: K.skin });
  Ko(i, n, 1, 0.046, true);
  Ko(i, n, -1, 0.046, true);

  i.bind(Zi(cloakChain, cloakPts, e.chest)).paint(pal.cloak, { c2: pal.cloakDark, mat: K.cloth });
  const E = [0, 0.25, 0.5, 0.75, 0.92].map((tVal) => Li(cloakPts, tVal));
  Js(i, E, { width: (tVal: number) => mixVal(0.24, 0.38, tVal), bow: [0, 0, -0.15], wave: 0.18, nu: 6, nv: 8, tail: 'flat' });
  i.paint(pal.gold, { c2: 0xffea9c, gloss: 0.9, mat: K.metal });
  Js(i, [Li(cloakPts, 0.92), Li(cloakPts, 1)], { width: (tVal: number) => mixVal(0.36, 0.4, tVal), bow: [0, 0, -0.15], nu: 6, nv: 1, tail: 'flat' });

  const headEmp = buildTangSongFace(api, i, n, {
    skin: pal.skin,
    hair: pal.hair,
    hairHi: pal.hairHi,
    iris: 0x3b1f4a,
    lip: pal.lip,
    headScale: uScale,
    female: true,
    huadian: pal.gold,
  });
  buildLiuEHeadAndDecree({ m: i, K, pt, bt, Zi, af }, pal, e.head, c, o, headEmp, uScale);
  i.bind(Zi(hairChain, hairPts, e.head)).paint(pal.hair, { c2: pal.hairHi, mat: K.fur });
  i.tube(
    [
      [0, topY - 0.04, -0.16, 0.075, 0.04],
      [0, 1.44, -0.26, 0.068, 0.042],
      [0, 1.2, -0.31, 0.056, 0.036],
      [0, 0.98, -0.32, 0.036, 0.025],
      [0, 0.82, -0.325, 0.008, 0.008],
    ],
    { seg: 7, up: [1, 0, 0], crease: 180 },
  );

  const pet = addHeroCompanion(i, t, e.root, K, pt, 'phoenix');
  i.bakeGrounding(2.05, 0.78, 0.9);
  return {
    h: n,
    b: i,
    extra: {
      pipa: c,
      pipaPos: f,
      pluck: d,
      free: h,
      ax: [localToChest(1, 0, 0), localToChest(0, 1, 0), localToChest(0, 0, 1)],
      handR: (() => {
        const p = localToChest(-0.09, -0.02, 0.11);
        return [p[0] - 0.02, p[1] + 0.03, p[2] + 0.01];
      })(),
      handL: (() => {
        const p = localToChest(0, 0.3, 0);
        return [p[0] + 0.03, p[1] - 0.06, p[2] + 0.02];
      })(),
      face: localToChest(0, -0.04, 0.07),
      pet,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. 文成公主：修长窈窕盛唐公主 + 三层齐胸襦裙 + 敦煌飞天弧形披帛 + 凤翼角弓 + 小雪狐
// ─────────────────────────────────────────────────────────────────────────────
export function buildWenchengFull(api: FullHeroEngineApi, pal: Record<string, number>) {
  const { Gh, Ra, Ls, K, pt, bt, Zi, Bl, Ox, Ko, Js, Li, Wd, af } = api;
  const n = Gh(TS_FEMALE_RIG);
  const { rig: t, J: e, d: s } = n;
  const i = new Ls();
  const a = s.shoulderX;
  const o = s.handY;
  const headScale = 0.77;

  // 完全匹配 PU() 拉弦射箭骨骼
  const l = t.add('bowUp', e.propL, a, o, 0.12);
  const c = t.add('bowDn', e.propL, a, o, -0.12);
  const f = t.add('nock', e.propL, a, o + Ra.string, 0);
  const d = t.add('arrow', f, a, o + Ra.string, 0);

  const makeRibbon = (side: number) => [
    [side * 0.15, 1.42, -0.12],
    [side * 0.24, 1.18, -0.24],
    [side * 0.28, 0.92, -0.32],
    [side * 0.3, 0.66, -0.36],
  ];
  const uChain = t.addChain('capeL', e.chest, makeRibbon(1).slice(0, 3));
  const mChain = t.addChain('capeR', e.chest, makeRibbon(-1).slice(0, 3));
  for (const rb of [uChain, mChain]) {
    t.chain({
      joints: rb,
      tip: [0, -0.22, -0.03],
      stiffness: 3.6,
      drag: 0.91,
      gravity: 7,
      maxAngle: 72,
      wind: 2.6,
      colliders: [
        { joint: e.hips, x: 0, y: -0.02, z: 0, r: 0.24 },
        { joint: e.chest, x: 0, y: 0, z: 0, r: 0.2 },
      ],
    });
  }

  // 1. 绣花翘头丝履
  i.sym((side) => {
    const hx = s.hipX;
    i.bone(side > 0 ? e.thighL : e.thighR).paint(pal.liningShade, { c2: pal.lining, mat: K.cloth });
    i.limb([hx, s.hipY + 0.04, 0], [hx, s.kneeY, 0], 0.08, 0.066, { seg: 8 });
  });
  for (const side of [1, -1]) {
    i.paint(pal.silk, { c2: pal.brass, gloss: 0.4, mat: K.cloth });
    Ox(i, n, side, { top: 0.22, rTop: 0.062, rAnkle: 0.05, len: 0.21, toe: 0.03 });
    i.bone(side > 0 ? e.shinL : e.shinR).paint(pal.lining, { c2: pal.liningShade, mat: K.cloth });
    i.limb([side * s.hipX, s.kneeY, 0], [side * s.hipX, s.ankleY, 0], 0.06, 0.048, { seg: 6 });
  }

  // 2. 盛唐层叠三色齐胸襦裙（轻盈柔顺腰臀收束 + 典雅绯金锦带 + 花瓣外裙）
  const skirtBind = (sideX: number, y: number) => {
    const th = sideX >= 0 ? e.thighL : e.thighR;
    const sh = sideX >= 0 ? e.shinL : e.shinR;
    if (y >= 0.94) return [e.chest, e.chest, 1];
    if (y >= 0.5) return [e.hips, th, clamp01(1 - (0.94 - y) / 0.44)];
    return [th, sh, clamp01(1 - clamp01((0.5 - y) / 0.38) * 0.5)];
  };
  i.bind(skirtBind).paint(pal.robe, { c2: 0x3b8ea6, ao: 0.9, mat: K.cloth, by: (_u: number, v: number) => clamp01((v - 0.14) / 0.9) });
  i.lathe(
    [
      [0.14, 0.34, 0.34],
      [0.42, 0.27, 0.26],
      [0.76, 0.19, 0.17],
      [1.04, 0.162, 0.132],
      [1.14, 0.158, 0.128],
      [1.21, 0.168, 0.132],
    ],
    { seg: 16, cap0: false, cap1: false, shape: (ang: number, idx: number) => 1 + (idx < 3 ? 0.048 * Math.sin(ang * 12) : 0) },
  );
  // 中层柔金杏花瓣外裙
  i.paint(pal.silk, { c2: pal.brass, mat: K.cloth });
  i.lathe(
    [
      [0.5, 0.265, 0.255],
      [0.82, 0.19, 0.172],
      [1.12, 0.164, 0.134],
    ],
    { seg: 14, cap0: false, cap1: false, shape: (ang: number, idx: number) => 1 + (idx === 0 ? 0.07 * Math.sin(ang * 6) : 0) },
  );
  i.paint(pal.brass, { c2: pal.silk, mat: K.cloth });
  i.lathe([[0.135, 0.346, 0.346], [0.168, 0.338, 0.338]], { seg: 16, cap0: false, cap1: false });

  i.bone(e.chest).paint(0xb82e38, { c2: pal.silk, mat: K.cloth });
  i.lathe([[1.16, 0.168, 0.134], [1.21, 0.172, 0.136]], { seg: 14 });
  i.paint(pal.brass, { c2: 0xffe49c, gloss: 1, mat: K.metal });
  i.ball(0, 1.185, 0.14, 0.022, 0.022, 0.014, 0);
  i.paint(pal.silk, { c2: 0xe66573, mat: K.cloth });
  i.tube([[0.02, 1.18, 0.144, 0.018, 0.006], [0.042, 0.96, 0.178, 0.022, 0.005], [0.055, 0.74, 0.205, 0.024, 0.004]], { seg: 4, up: [1, 0, 0] });
  i.tube([[-0.02, 1.18, 0.144, 0.018, 0.006], [-0.042, 0.96, 0.178, 0.022, 0.005], [-0.055, 0.74, 0.205, 0.024, 0.004]], { seg: 4, up: [1, 0, 0] });

  // 3. 纤美短襦上衣 + 敦煌镂空如意金云肩 + 肩背凌空飞天彩帛（沉至肩背不贴耳畔）
  i.bind(Bl(n)).paint(pal.lining, { c2: pal.robe, ao: 0.9, mat: K.cloth });
  i.lathe([[1.18, 0.164, 0.13], [1.3, 0.184, 0.136], [1.4, 0.17, 0.122], [1.47, 0.095, 0.082]], { seg: 12 });
  i.bone(e.neck).paint(pal.skin, { ao: 0.75, mat: K.skin });
  i.lathe([[1.45, 0.05, 0.05], [1.56, 0.048, 0.048]], { seg: 8, cap0: false });

  i.bone(e.chest).paint(pal.brass, { c2: 0xffe49c, gloss: 0.95, glow: 0.14, mat: K.metal });
  i.g(pt(0, 1.43, 0, 10, 0, 0), () => i.torus(0.176, 0.018, 0.024, 12, 4));
  // 敦煌壁画式肩背半月飞天彩帛
  i.paint(pal.silk, { c2: 0xffe49c, glow: 0.2, mat: K.cloth });
  i.g(pt(0, 1.32, -0.18, 12, 0, 0), () =>
    i.sheet(
      14,
      2,
      (u, v) => {
        const ang = (u - 0.5) * Math.PI * 1.15;
        const r = 0.42 + v * 0.055;
        return [Math.sin(ang) * r, Math.cos(ang) * r * 0.85, -Math.cos(ang) * 0.06 + (v - 0.5) * 0.02];
      },
      true,
    ),
  );

  // 4. 纤细水袖 + 金臂钏（肘部无缝叠接）
  i.sym((side) => {
    const sx = s.shoulderX;
    i.bone(side > 0 ? e.armL : e.armR).paint(pal.robe, { c2: 0x3a8aa3, ao: 0.9, mat: K.cloth });
    i.ball(sx, s.shoulderY, 0, 0.06, 0.058, 0.06, 1);
    i.limb([sx, s.shoulderY + 0.02, 0], [sx, s.elbowY - 0.03, 0], 0.056, 0.052, { seg: 8 });
    i.paint(pal.brass, { c2: 0xffe8a6, gloss: 1, mat: K.metal });
    Wd(i, sx, s.elbowY + 0.06, 0, 0.058, 0.058, 0.009, 0.015, 8);
    i.bone(side > 0 ? e.foreL : e.foreR).paint(pal.lining, { c2: pal.robe, mat: K.cloth });
    i.ball(sx, s.elbowY, 0, 0.054, 0.052, 0.054, 0);
    i.limb([sx, s.elbowY + 0.03, 0], [sx, s.wristY - 0.02, 0], 0.054, 0.066, { seg: 8 });
  });
  i.paint(pal.skin, { mat: K.skin });
  Ko(i, n, 1, 0.045);
  Ko(i, n, -1, 0.045);

  for (const [rb, side] of [
    [uChain, 1],
    [mChain, -1],
  ] as [number[], number][]) {
    const pts = makeRibbon(side);
    const widthFn = (tVal: number) => mixVal(0.075, 0.135, Math.sin(tVal * Math.PI * 0.7));
    i.bind(Zi(rb, pts, e.chest)).paint(pal.brass, { c2: pal.silk, glow: 0.16, mat: K.cloth });
    Js(i, pts, { width: widthFn, axis: [1, 0, side * 0.3], bow: [0, 0, -0.04], nu: 3, nv: 7, tail: 'swallow', tailLen: 0.14, wave: 0.35 });
    const mid = [0, 0.35, 0.7, 1].map((tVal) => Li(pts, tVal));
    i.paint(pal.lining, { c2: pal.jade, mat: K.cloth });
    Js(i, mid.map((p) => [p[0], p[1], p[2] + 0.008]), {
      width: (tVal: number) => widthFn(tVal) * 0.52,
      axis: [1, 0, side * 0.3],
      bow: [0, 0, -0.04],
      nu: 2,
      nv: 5,
      tail: 'swallow',
      tailLen: 0.12,
    });
  }

  // 5. 绣金箭箙
  i.bone(e.hips);
  i.g(pt(-0.21, 0.92, -0.1, -30, 0, 22), () => {
    i.paint(pal.silk, { c2: pal.lacquerDark, gloss: 0.45, mat: K.leather });
    i.lathe([[-0.28, 0.03, 0.026], [0.14, 0.068, 0.052], [0.2, 0.074, 0.056]], { seg: 8, cap1: false });
    i.paint(pal.brass, { c2: 0xffe49c, gloss: 1, mat: K.metal });
    Wd(i, 0, 0.18, 0, 0.076, 0.06, 0.009, 0.014, 8);
    for (let b = 0; b < 5; b++) {
      const w = bt(-0.04, 0.04, b / 4);
      const zOff = b % 2 ? 0.014 : -0.012;
      i.paint(pal.shaft, { mat: K.leather });
      i.tube([[w, 0.1, zOff, 0.006], [w * 1.1, 0.42, zOff, 0.006]], { seg: 3 });
      i.paint(pal.feather, { mat: K.fur, line: 0 });
      i.g(pt(w * 1.1, 0.37, zOff, 0, 60 + b * 24, 0), () =>
        i.extrude([[-0.032, -0.08], [0.032, -0.08], [0.036, 0.05], [0, 0.08], [-0.036, 0.05]], 0.005, 0),
      );
    }
  });

  // 6. 公主娇容 + 盛唐双环高云髻凤冠步摇
  const head = buildTangSongFace(api, i, n, {
    skin: pal.skin,
    hair: pal.hair,
    hairHi: pal.hairHi,
    iris: 0x2a1e24,
    lip: 0xc94858,
    headScale,
    female: true,
    huadian: 0xe66470,
  });
  buildWenchengHead({ m: i, K, pt, bt, Zi, af }, pal, e.head, head);

  // 7. 鎏金凤翼牛角反曲弓
  const bowZCurve = (b: number) => -0.04 + (Ra.string + 0.04) * (b * b * 0.7 + 0.3 * Math.pow(b, 4));
  const bowLimbPts = (dir: number, t0: number, t1: number) => {
    const out: number[][] = [];
    for (let idx = 0; idx <= 6; idx++) {
      const C = bt(t0, t1, idx / 6);
      out.push([0, bowZCurve(C), dir * (0.06 + C * (Ra.tip - 0.06)), bt(0.024, 0.014, C), bt(0.032, 0.017, C)]);
    }
    return out;
  };
  i.g(pt(a, o, 0), () => {
    i.bone(e.propL).paint(pal.brass, { c2: 0xffe49c, gloss: 0.9, mat: K.metal });
    i.tube([[0, -0.04, -0.1, 0.022, 0.026], [0, -0.045, 0, 0.026, 0.03], [0, -0.04, 0.1, 0.022, 0.026]], { seg: 6 });
    for (const dir of [1, -1]) {
      const limbBone = dir > 0 ? l : c;
      i.bind((_x: number, _y: number, zVal: number) => [limbBone, e.propL, clamp01((Math.abs(zVal) - 0.1) / 0.14)]);
      i.paint(pal.silk, { c2: pal.lacquerDark, gloss: 0.65, mat: K.leather });
      i.tube(bowLimbPts(dir, 0, 1), { seg: 5, up: [1, 0, 0] });
      i.bone(limbBone).paint(pal.brass, { c2: 0xfff0ba, gloss: 1, glow: 0.22, mat: K.metal });
      const A = dir * Ra.tip;
      i.tube([[0, Ra.string, A - dir * 0.03, 0.014, 0.018], [0, Ra.string - 0.02, A + dir * 0.06, 0.012, 0.016], [0, Ra.string - 0.08, A + dir * 0.14, 0.007, 0.009]], {
        seg: 4,
        up: [1, 0, 0],
      });
    }
    const strBind = (_x: number, _y: number, zVal: number) => [zVal >= 0 ? l : c, f, clamp01(Math.abs(zVal) / Ra.tip)];
    i.bind(strBind).paint(0xffeeb5, { line: 0, glow: 0.25, mat: K.cloth });
    const strPts: number[][] = [];
    for (let idx = 0; idx <= 8; idx++) strPts.push([0, Ra.string, bt(-0.86, Ra.tip, idx / 8), 0.005]);
    i.tube(strPts, { seg: 3, up: [1, 0, 0] });

    i.bone(d).paint(pal.shaft, { c2: 0xa17d45, mat: K.leather });
    i.tube([[0, Ra.string, 0, 0.0085], [0, -0.78, 0, 0.0085]], { seg: 4 });
    i.paint(pal.brass, { c2: 0xffe49c, gloss: 1, glow: 0.25, mat: K.metal });
    i.g(pt(0, -0.78, 0, 180, 0, 0), () => i.crystal(0.026, 0.11, 4, 0.75, 0.05));
    i.paint(pal.feather, { mat: K.fur, line: 0 });
    for (let T = 0; T < 3; T++) {
      i.g(pt(0, 0.1, 0, 0, T * 120, 0), () => i.extrude([[0, -0.06], [0.036, -0.035], [0.036, 0.045], [0, 0.06]], 0.005, 0));
    }
  });

  const pet = addHeroCompanion(i, t, e.root, K, pt, 'fox');
  i.bakeGrounding(2.05, 0.78, 0.9);
  return { h: n, b: i, extra: { bowUp: l, bowDn: c, nock: f, arrow: d, pet } };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. 花蕊夫人：后蜀绯金海棠剑舞女侠 + 丝履 + 八瓣裂裾舞裙 + 双鬟红梅步摇 + 小狸奴
// ─────────────────────────────────────────────────────────────────────────────
export function buildHuaRuiWarriorFull(api: FullHeroEngineApi, pal: Record<string, number>) {
  const { Gh, Ls, K, pt, bt, Zi, Bl, Ox, Ko, Js, Li, af } = api;
  const n = Gh(TS_FEMALE_RIG);
  const { rig: t, J: e, d: s } = n;
  const i = new Ls();
  const headScale = 0.77;

  // 严格匹配 AU()/TU() 握持骨骼
  const a = t.add('gripR', e.chest, 0, s.chestY, 0);
  const o = t.add('aim', e.chest, 0, s.chestY, 0);
  const r = t.add('gripL', e.chest, 0, s.chestY, 0);

  const ponyPts = [
    [0, s.headY + 0.21, -0.15],
    [0, s.headY + 0.08, -0.27],
    [0, s.headY - 0.07, -0.31],
  ];
  const fChain = t.addChain('pony', e.head, ponyPts.slice(0, 2));
  t.chain({ joints: fChain, tip: [0, -0.18, -0.04], stiffness: 7, drag: 0.88, gravity: 7, maxAngle: 54, wind: 2.0 });

  const scarfPts = [
    [0, 1.44, -0.14],
    [0, 1.2, -0.27],
    [0, 0.94, -0.34],
    [0, 0.7, -0.37],
    [0, 0.46, -0.39],
  ];
  const hChain = t.addChain('scarf', e.chest, scarfPts.slice(0, 4));
  t.chain({
    joints: hChain,
    tip: [0, -0.22, -0.01],
    stiffness: 3.2,
    drag: 0.92,
    gravity: 7,
    maxAngle: 72,
    wind: 2.6,
    colliders: [
      { joint: e.chest, x: 0, y: 0, z: 0.02, r: 0.24 },
      { joint: e.hips, x: 0, y: 0, z: 0, r: 0.24 },
    ],
  });

  const sashPts = [
    [0.18, 0.96, 0.07],
    [0.22, 0.74, 0.09],
    [0.24, 0.54, 0.08],
    [0.24, 0.34, 0.07],
  ];
  const mChain = t.addChain('sash', e.hips, sashPts.slice(0, 3));
  t.chain({ joints: mChain, tip: [0, -0.18, -0.01], stiffness: 6, drag: 0.88, gravity: 10, maxAngle: 60, wind: 1.2 });

  const tabPts = [
    [0, 0.94, 0.15],
    [0, 0.72, 0.18],
    [0, 0.52, 0.19],
    [0, 0.34, 0.19],
  ];
  const pChain = t.addChain('tab', e.hips, tabPts.slice(0, 3));
  t.chain({ joints: pChain, tip: [0, -0.16, 0], stiffness: 8, drag: 0.86, gravity: 10, maxAngle: 50, wind: 0.9 });

  const tailPts = [
    [0, 0.94, -0.15],
    [0, 0.7, -0.2],
    [0, 0.46, -0.21],
    [0, 0.28, -0.21],
  ];
  const gChain = t.addChain('tail', e.hips, tailPts.slice(0, 3));
  t.chain({ joints: gChain, tip: [0, -0.16, 0], stiffness: 6, drag: 0.88, gravity: 10, maxAngle: 60, wind: 1.1 });

  const tasselPts = [
    [-s.shoulderX, s.handY - 0.03, -0.38],
    [-s.shoulderX, s.handY - 0.17, -0.38],
    [-s.shoulderX, s.handY - 0.31, -0.38],
  ];
  const tasselChain = t.addChain('tassel', e.propR, tasselPts.slice(0, 2));
  t.chain({ joints: tasselChain, tip: [0, -0.14, 0], stiffness: 2.5, drag: 0.9, gravity: 14, maxAngle: 150, wind: 1.3 });

  // 1. 纤细修长剑舞双腿 + 精细翘头绣金丝履（膝盖无缝叠接）
  i.sym((side) => {
    const hx = s.hipX;
    i.bone(side > 0 ? e.thighL : e.thighR).paint(0xf2e4e8, { c2: pal.skin, by: (_u: number, yVal: number) => clamp01((yVal - 0.62) / 0.2), mat: K.skin });
    i.limb([hx, s.hipY + 0.04, 0], [hx, s.kneeY - 0.035, 0], 0.084, 0.066, { seg: 8 });
    i.bone(side > 0 ? e.shinL : e.shinR).paint(pal.skin, { c2: pal.redDark, by: (_u: number, yVal: number) => clamp01((0.36 - yVal) / 0.2), mat: K.skin });
    i.ball(hx, s.kneeY, 0, 0.066, 0.062, 0.066, 0);
    i.limb([hx, s.kneeY + 0.035, 0], [hx, s.ankleY - 0.02, 0], 0.064, 0.048, { seg: 8 });
  });
  for (const side of [1, -1]) {
    i.paint(pal.redDark, { c2: pal.brass, gloss: 0.45, mat: K.leather });
    Ox(i, n, side, { top: 0.25, rTop: 0.056, rAnkle: 0.048, len: 0.22, toe: 0.028 });
  }

  // 2. 不对称八瓣海棠剑舞裂裾裙（灵动高挑，裙摆呈花瓣绽放而非圆桶！）
  const skirtBind = (sideX: number, y: number) => {
    const th = sideX >= 0 ? e.thighL : e.thighR;
    return y >= 0.94 ? [e.hips, e.hips, 1] : [e.hips, th, clamp01((y - 0.5) / 0.44)];
  };
  i.bind(skirtBind).paint(pal.redDark, { c2: pal.redLight, ao: 0.9, mat: K.cloth });
  i.lathe(
    [
      [0.44, 0.295, 0.275],
      [0.68, 0.215, 0.195],
      [0.95, 0.155, 0.128],
    ],
    {
      seg: 16,
      cap0: false,
      cap1: false,
      shape: (ang: number, idx: number) => 1 + (idx === 0 ? 0.12 * Math.sin(ang * 8) : 0.02 * Math.sin(ang * 8)),
    },
  );
  i.paint(pal.brass, { c2: 0xffe49c, gloss: 0.95, mat: K.metal });
  i.lathe([[0.435, 0.3, 0.28], [0.46, 0.296, 0.276]], { seg: 16, cap0: false, cap1: false, shape: (ang: number) => 1 + 0.12 * Math.sin(ang * 8) });

  i.bone(e.hips).paint(pal.redLight, { c2: pal.red, mat: K.cloth });
  i.ball(0.18, 0.97, 0.07, 0.04, 0.036, 0.036, 1);
  i.bind(Zi(mChain, sashPts, e.hips)).paint(pal.red, { c2: pal.redDark, mat: K.cloth });
  Js(i, sashPts, { width: (tVal: number) => mixVal(0.038, 0.06, tVal), axis: [0, 0, 1], bow: [0.02, 0, 0], nu: 2, nv: 5, tail: 'swallow', tailLen: 0.09 });
  i.bind(Zi(pChain, tabPts, e.hips)).paint(0xfff0f4, { c2: pal.redLight, mat: K.cloth });
  Js(i, tabPts, { width: (tVal: number) => mixVal(0.095, 0.075, tVal), bow: [0, 0, 0.022], nu: 4, nv: 5, tail: 'swallow', tailLen: 0.1 });
  i.bind(Zi(gChain, tailPts, e.hips)).paint(pal.red, { c2: pal.redDark, mat: K.cloth });
  Js(i, tailPts, { width: (tVal: number) => mixVal(0.12, 0.095, tVal), bow: [0, 0, -0.022], nu: 4, nv: 5, tail: 'swallow', tailLen: 0.1 });

  // 3. 柳腰绯金海棠绣胸衣 + 镂空金护胸
  i.bind(Bl(n)).paint(pal.redDark, { c2: pal.red, ao: 0.88, mat: K.cloth });
  i.lathe(
    [
      [0.9, 0.155, 0.124],
      [1.04, 0.132, 0.104],
      [1.18, 0.165, 0.126],
      [1.32, 0.192, 0.138],
      [1.42, 0.16, 0.115],
      [1.47, 0.085, 0.074],
    ],
    { seg: 12 },
  );
  i.bone(e.neck).paint(pal.skin, { ao: 0.75, mat: K.skin });
  i.lathe([[1.45, 0.05, 0.05], [1.56, 0.048, 0.048]], { seg: 8, cap0: false });
  i.bind(Bl(n)).paint(pal.brass, { c2: 0xffe49c, gloss: 0.92, mat: K.metal });
  i.lathe([[1.12, 0.152, 0.118], [1.26, 0.194, 0.14], [1.34, 0.184, 0.13]], { seg: 12, cap0: false });
  i.bone(e.chest).paint(0xfff0f5, { c2: pal.redLight, mat: K.cloth });
  i.g(pt(0, 1.47, 0, 8, 0, 0), () => i.torus(0.088, 0.022, 0.022, 10, 4));
  i.bone(e.spine).paint(pal.brass, { c2: 0xffe49c, gloss: 1, mat: K.metal });
  i.g(pt(0, 1.0, 0.118), () => i.extrude([[0, 0.045], [0.052, 0.01], [0.03, -0.042], [-0.03, -0.042], [-0.052, 0.01]], 0.015, 0.004));

  // 4. 纤细臂袖 + 绯雪丝巾披风（修正 sym 正侧肩甲与肘关节重叠）
  i.sym((side) => {
    const sx = s.shoulderX;
    i.bone(side > 0 ? e.clavL : e.clavR).paint(pal.red, { c2: pal.brass, gloss: 0.85, mat: K.metal });
    i.g(pt(0.26, 1.43, 0, 0, 0, -24), () => i.lathe([[-0.04, 0.085, 0.085], [0, 0.095, 0.095], [0.05, 0.06, 0.06]], { seg: 8 }));
    i.bone(side > 0 ? e.armL : e.armR).paint(pal.red, { c2: pal.redDark, mat: K.cloth });
    i.ball(sx, s.shoulderY, 0, 0.062, 0.06, 0.062, 0);
    i.limb([sx, s.shoulderY + 0.02, 0], [sx, s.elbowY - 0.035, 0], 0.058, 0.05, { seg: 8 });
    i.bone(side > 0 ? e.foreL : e.foreR).paint(pal.redDark, { c2: pal.red, mat: K.cloth });
    i.ball(sx, s.elbowY, 0, 0.054, 0.052, 0.054, 0);
    i.limb([sx, s.elbowY + 0.035, 0], [sx, s.wristY - 0.01, 0], 0.052, 0.052, { seg: 8 });
    i.paint(pal.brass, { c2: 0xffdf8c, gloss: 1, mat: K.metal });
    i.lathe([[s.wristY - 0.02, 0.05, 0.05, sx, 0], [s.wristY + 0.1, 0.058, 0.058, sx, 0]], { seg: 8 });
  });
  i.paint(pal.skin, { mat: K.skin });
  Ko(i, n, 1, 0.046);
  Ko(i, n, -1, 0.046);

  i.bind(Zi(hChain, scarfPts, e.chest)).paint(0xfff0f4, { c2: pal.redLight, mat: K.cloth });
  Js(i, [0, 0.25, 0.5, 0.75, 0.9].map((tVal) => Li(scarfPts, tVal)), { width: (tVal: number) => mixVal(0.15, 0.26, Math.sin(tVal * Math.PI * 0.5)), bow: [0, 0, -0.05], nu: 5, nv: 8, tail: 'swallow', tailLen: 0.15 });

  // 5. 后蜀明艳娇容 + 双鬟高花髻 + 红梅金步摇
  const hairCol = pal.hair ?? pal.beard ?? 0x1e1820;
  const hairHi = pal.hairHi ?? pal.beardHi ?? 0x45384a;
  const head = buildTangSongFace(api, i, n, {
    skin: pal.skin,
    hair: hairCol,
    hairHi,
    iris: 0x3b1b26,
    lip: 0xd13a52,
    headScale,
    female: true,
    huadian: 0xeb4c68,
  });
  const yH = head.cy;
  i.bone(e.head).paint(hairCol, { c2: hairHi, gloss: 0.2, mat: K.fur });
  i.ball(0, yH + 0.115, -0.008, 0.17, 0.12, 0.17, 1);
  i.sym(() => {
    i.ball(0.125, yH + 0.175, -0.025, 0.075, 0.075, 0.07, 1);
    i.paint(pal.redLight, { c2: 0xffc2d4, glow: 0.55, mat: K.crystal, line: 0 });
    i.g(pt(0.175, yH + 0.185, 0.025, 0, 12, -22), () => {
      for (let pIdx = 0; pIdx < 5; pIdx++) {
        const ang = (pIdx / 5) * Math.PI * 2;
        i.ball(Math.cos(ang) * 0.028, Math.sin(ang) * 0.028, 0, 0.02, 0.02, 0.011, 0);
      }
    });
    i.paint(pal.brass, { c2: 0xffe4a0, gloss: 1, mat: K.metal });
    i.ball(0.175, yH + 0.185, 0.03, 0.014, 0.014, 0.014, 0);
  });
  i.bind(Zi(fChain, ponyPts, e.head)).paint(pal.redLight, { c2: pal.red, mat: K.cloth });
  Js(i, ponyPts, { width: (tVal: number) => mixVal(0.036, 0.056, tVal), nu: 2, nv: 5, tail: 'swallow', tailLen: 0.08 });

  // 6. 右手兵器：「凌风芙蓉玉锋剑」(沿 +Z 精确对齐 AU() 双手握剑，修长秀逸比例)
  i.bone(e.propR);
  i.g(pt(-s.shoulderX, s.handY, 0), () => {
    i.paint(pal.leatherDark, { c2: pal.redDark, gloss: 0.25, mat: K.leather });
    i.tube([[0, 0, -0.3, 0.015], [0, 0, 0.2, 0.017]], { seg: 8 });
    i.paint(pal.brass, { c2: 0xffe49c, gloss: 1, mat: K.metal });
    i.tube([[0, 0, -0.35, 0.007], [0, 0, -0.3, 0.028], [0, 0, -0.26, 0.021]], { seg: 8, crease: 30 });
    i.g(pt(0, 0, 0.21), () => {
      i.box(0, 0, 0, 0.034, 0.17, 0.04, 0.01);
      i.ball(0, 0, 0.02, 0.028, 0.032, 0.02, 0);
    });
    i.paint(pal.steel, { c2: 0xffffff, gloss: 1, mat: K.metal });
    i.tube([[0, 0, 0.24, 0.011, 0.036], [0, 0, 0.72, 0.01, 0.034], [0, 0, 0.98, 0.008, 0.026], [0, 0, 1.14, 0.002, 0.003]], { seg: 4, up: [1, 0, 0], crease: 12 });
    i.paint(pal.edge, { c2: 0xffffff, glow: 0.55, gloss: 1, mat: K.metal, line: 0 });
    i.tube([[0, 0, 0.25, 0.012, 0.012], [0, 0, 0.98, 0.009, 0.009]], { seg: 4, up: [1, 0, 0], crease: 0 });
  });
  i.bind(Zi(tasselChain, tasselPts, e.propR)).paint(pal.redLight, { c2: 0xffc4d4, mat: K.fur });
  for (let idx = 0; idx < 4; idx++) {
    const ang = (idx / 4) * Math.PI * 2 + 0.6;
    af(i, [-s.shoulderX + Math.cos(ang) * 0.02, s.handY - 0.03, -0.38 + Math.sin(ang) * 0.02], [Math.cos(ang) * 0.22, -1, Math.sin(ang) * 0.22], 0.22, 0.026, { n: 3, seg: 4, tip: 0.28 });
  }

  const pet = addHeroCompanion(i, t, e.root, K, pt, 'cat');
  i.bakeGrounding(2.05, 0.78, 0.9);
  return { h: n, b: i, extra: { gripR: a, aim: o, gripL: r, pet } };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. 辛弃疾：修长精悍南宋夜袭青年将领 + 冲天朱红雉鸡翎翼盔 + 环首单刀 + 海东青战鹰
// ─────────────────────────────────────────────────────────────────────────────
export function buildXinQijiAssassinFull(api: FullHeroEngineApi, pal: Record<string, number>) {
  const { Gh, io, Sp, Ls, K, En, pt, bt, Zi, Bl, Ox, Ko, Js, Wd, af } = api;
  const n = Gh(TS_ASSASSIN_RIG);
  const { rig: t, J: e, d: s } = n;
  const i = new Ls();
  const headScale = 0.8;

  // 严格匹配 jU() 大招军令图展开骨骼
  const scarfPts = [
    [0.04, 1.44, -0.14],
    [0.09, 1.24, -0.32],
    [0.11, 0.96, -0.44],
    [0.1, 0.68, -0.5],
    [0.07, 0.4, -0.53],
  ];
  const rChain = t.addChain('scarf', e.chest, scarfPts.slice(0, 4));
  t.chain({ joints: rChain, tip: [-0.02, -0.26, -0.04], stiffness: 3.0, drag: 0.92, gravity: 7, maxAngle: 78, wind: 3.0, colliders: [{ joint: e.chest, x: 0, y: 0, z: 0, r: 0.24 }] });

  const scarfBPts = [
    [-0.08, 1.44, -0.13],
    [-0.16, 1.22, -0.3],
    [-0.2, 0.96, -0.4],
    [-0.2, 0.7, -0.44],
  ];
  const cChain = t.addChain('scarfB', e.chest, scarfBPts.slice(0, 3));
  t.chain({ joints: cChain, tip: [0, -0.22, -0.05], stiffness: 3.5, drag: 0.92, gravity: 7, maxAngle: 76, wind: 2.8, colliders: [{ joint: e.chest, x: 0, y: 0, z: 0, r: 0.24 }] });

  const sashPts = [
    [-0.18, 0.98, -0.04],
    [-0.24, 0.74, -0.1],
    [-0.27, 0.5, -0.13],
    [-0.28, 0.3, -0.15],
  ];
  const dChain = t.addChain('sash', e.hips, sashPts.slice(0, 3));
  t.chain({ joints: dChain, tip: [0, -0.2, -0.02], stiffness: 5, drag: 0.9, gravity: 9, maxAngle: 64, wind: 1.5 });

  const h = t.add('furl', e.handL, s.shoulderX, s.handY, 0);
  const furlFn = (b: number) => [s.shoulderX, s.handY - 0.02 - b * Sp, 0.05 + 0.3 * Math.sin(b * Math.PI * 0.55)];
  const m = Array.from({ length: io + 1 }, (_v, idx) => furlFn(idx / io));
  const x = m.slice(1).map((p, idx) => t.add(`furl${idx + 1}`, h, p[0], p[1], p[2]));

  // 1. 玄铁轻靴与实心小腿护胫（左右完全实心对接，零断裂）
  i.sym((side) => {
    const hx = s.hipX;
    i.bone(side > 0 ? e.thighL : e.thighR).paint(pal.suitDark, { c2: pal.suit, ao: 0.9, mat: K.cloth });
    i.limb([hx, s.hipY + 0.04, 0], [hx, s.kneeY - 0.035, 0], 0.114, 0.088, { seg: 8 });
    i.bone(side > 0 ? e.shinL : e.shinR).paint(pal.suitDark, { c2: pal.suit, mat: K.cloth });
    i.ball(hx, s.kneeY, 0, 0.082, 0.075, 0.082, 0);
    i.limb([hx, s.kneeY + 0.035, 0], [hx, s.ankleY - 0.02, 0], 0.086, 0.072, { seg: 8 });
  });
  for (const side of [1, -1]) {
    i.paint(0x181b22, { c2: pal.leather, mat: K.leather, gloss: 0.3 });
    Ox(i, n, side, { top: 0.34, rTop: 0.088, rAnkle: 0.07, len: 0.24, toe: 0.022 });
    i.bone(side > 0 ? e.shinL : e.shinR).paint(pal.suit, { c2: pal.steelDark, gloss: 0.7, mat: K.metal });
    i.sheet(3, 2, (u, v) => {
      const ang = bt(40, 140, u) * (Math.PI / 180);
      const rad = bt(0.082, 0.102, v);
      return [side * s.hipX + Math.cos(ang) * rad, bt(0.18, 0.46, v), Math.sin(ang) * rad];
    }, true);
    i.paint(pal.bronze, { c2: 0xffd978, gloss: 1, mat: K.metal });
    i.ball(side * s.hipX, s.kneeY + 0.02, 0.098, 0.032, 0.038, 0.02, 0);
  }

  // 2. 分片赤血战裙摆
  const flapBind = (sideX: number, y: number) => {
    const th = sideX >= 0 ? e.thighL : e.thighR;
    return y >= 0.94 ? [e.hips, e.hips, 1] : [e.hips, th, clamp01((y - 0.56) / 0.38)];
  };
  i.bind(flapBind).paint(pal.sashDark, { c2: pal.sash, mat: K.cloth });
  i.lathe([[0.54, 0.21, 0.18], [0.74, 0.195, 0.165], [0.95, 0.19, 0.155]], { seg: 12, cap0: false, cap1: false });
  i.paint(pal.suitDark, { c2: pal.suitHi, gloss: 0.68, mat: K.metal, pattern: En.scale, patternScale: 12, patternAmt: 0.26 });
  i.sym(() => {
    i.sheet(4, 2, (u, v) => {
      const ang = bt(-56, 56, u) * (Math.PI / 180);
      const rad = bt(0.21, 0.238, v);
      return [Math.cos(ang) * rad, bt(0.95, 0.64, v), Math.sin(ang) * rad * 0.85];
    });
  });

  // 3. 山文玄铁半甲 + 鎏金龙纹护心镜 + 犀皮红绶腰带
  i.bind(Bl(n)).paint(pal.suitDark, { c2: pal.suit, ao: 0.9, mat: K.cloth });
  i.lathe([[0.9, 0.19, 0.15], [1.04, 0.168, 0.132], [1.18, 0.21, 0.152], [1.34, 0.238, 0.165], [1.46, 0.16, 0.122], [1.5, 0.088, 0.082]], { seg: 12 });
  i.bone(e.neck).paint(pal.skin, { ao: 0.75, mat: K.skin });
  i.lathe([[1.46, 0.065, 0.065], [1.58, 0.064, 0.064]], { seg: 8, cap0: false });
  i.bind(Bl(n)).paint(pal.suitDark, { c2: pal.suitHi, gloss: 0.72, mat: K.metal, pattern: En.scale, patternScale: 14, patternAmt: 0.3 });
  i.lathe([[1.08, 0.178, 0.14], [1.2, 0.22, 0.16], [1.34, 0.246, 0.174], [1.41, 0.195, 0.142]], { seg: 12, cap0: false });

  i.bone(e.chest).paint(pal.bronze, { c2: 0xffe296, gloss: 1, glow: 0.14, mat: K.metal });
  i.g(pt(0, 1.28, 0.178, 90, 0, 0), () => i.lathe([[0, 0.064], [0.018, 0.06], [0.026, 0.02]], { seg: 12, cap0: false }));
  i.paint(pal.sash, { c2: pal.sashDark, mat: K.cloth });
  i.tube([[0.18, 1.42, 0.06, 0.028, 0.012], [0.05, 1.28, 0.18, 0.03, 0.012], [-0.09, 1.1, 0.16, 0.028, 0.012]], { seg: 4, up: [0, 0.6, 0.8] });

  i.bone(e.spine).paint(pal.leatherDark, { c2: pal.leather, mat: K.leather });
  i.lathe([[0.95, 0.2, 0.158], [1.05, 0.188, 0.148]], { seg: 12 });
  i.paint(pal.bronze, { c2: 0xffe092, gloss: 1, mat: K.metal });
  i.g(pt(0, 1.0, 0.16), () => i.box(0, 0, 0, 0.1, 0.076, 0.03, 0.008));

  // 4. 吞兽半甲 + 飞舞赤血大披风（修正 sym 正侧肩甲与肘关节实心衔接）
  i.sym((side) => {
    const sx = s.shoulderX;
    i.bone(side > 0 ? e.clavL : e.clavR).paint(pal.suitDark, { c2: pal.bronze, gloss: 0.78, mat: K.metal });
    i.g(pt(0.295, 1.46, 0, 0, 0, -18), () => i.lathe([[-0.05, 0.125, 0.12], [0, 0.135, 0.13], [0.07, 0.088, 0.088]], { seg: 9 }));
    i.bone(side > 0 ? e.armL : e.armR).paint(pal.sashDark, { c2: pal.sash, mat: K.cloth });
    i.ball(sx, s.shoulderY, 0, 0.082, 0.078, 0.082, 0);
    i.limb([sx, s.shoulderY + 0.02, 0], [sx, s.elbowY - 0.03, 0], 0.078, 0.066, { seg: 8 });
    i.bone(side > 0 ? e.foreL : e.foreR).paint(pal.sashDark, { c2: pal.suitDark, mat: K.cloth });
    i.ball(sx, s.elbowY, 0, 0.072, 0.068, 0.072, 0);
    i.limb([sx, s.elbowY + 0.03, 0], [sx, s.wristY - 0.02, 0], 0.07, 0.058, { seg: 8 });
    i.paint(pal.suitDark, { c2: pal.suitHi, gloss: 0.72, mat: K.metal });
    i.lathe([[s.wristY - 0.01, 0.06, 0.06, sx, 0], [s.wristY + 0.04, 0.07, 0.07, sx, 0], [s.wristY + 0.18, 0.076, 0.076, sx, 0]], { seg: 8 });
    i.paint(pal.bronze, { c2: 0xffdf8a, gloss: 1, mat: K.metal });
    Wd(i, sx, s.wristY + 0.04, 0, 0.072, 0.072, 0.01, 0.016, 8);
  });
  i.paint(pal.skin, { mat: K.skin });
  Ko(i, n, 1, 0.054);
  Ko(i, n, -1, 0.054);

  i.bind(Zi(rChain, scarfPts, e.chest)).paint(pal.sash, { c2: pal.sashDark, mat: K.cloth });
  Js(i, scarfPts, { width: (tVal: number) => mixVal(0.22, 0.34, tVal), bow: [0, 0.02, -0.05], wave: 0.28, nu: 5, nv: 10, tail: 'swallow', tailLen: 0.22 });
  i.bind(Zi(cChain, scarfBPts, e.chest)).paint(pal.sashDark, { c2: pal.suitDark, mat: K.cloth });
  Js(i, scarfBPts, { width: (tVal: number) => 0.14 * (1 - 0.25 * tVal), bow: [0, 0.02, 0], wave: 0.3, nu: 3, nv: 7, tail: 'swallow', tailLen: 0.18 });
  i.bind(Zi(dChain, sashPts, e.hips)).paint(pal.scarf, { c2: pal.sashDark, mat: K.cloth });
  Js(i, sashPts, { width: (tVal: number) => mixVal(0.05, 0.072, tVal), axis: [0, 0, 1], bow: [0.02, 0, 0], nu: 2, nv: 6, tail: 'point', tailLen: 0.1 });

  // 5. 冷峻英武面容 + 铁浮屠鎏金翼盔 + 冲天双雉鸡翎 (标志性国风武将廓形)
  const g = buildTangSongFace(api, i, n, {
    skin: pal.skin,
    hair: pal.hair,
    hairHi: pal.hairHi,
    iris: 0x261612,
    lip: 0xb05d4e,
    headScale,
    jawWidth: 1.03,
  });
  const cy = g.cy;
  const hrRing = (dy: number, off: number) => {
    const ring = g.ring(dy * headScale);
    return [cy + dy * headScale, ring[0] + off, ring[1] + off, 0, ring[2]];
  };
  i.bone(e.head).paint(pal.suitDark, { c2: pal.suitHi, gloss: 0.78, mat: K.metal });
  i.lathe([hrRing(0.08, 0.042), hrRing(0.12, 0.032), hrRing(0.18, 0.028), hrRing(0.24, 0.03), [cy + 0.28 * headScale, 0.098, 0.1, 0, -0.014], [cy + 0.31 * headScale, 0.036, 0.036, 0, -0.015]], {
    seg: 14,
    cap0: false,
  });
  i.paint(pal.bronze, { c2: 0xffe49c, gloss: 1, mat: K.metal });
  i.lathe([hrRing(0.095, 0.038), hrRing(0.115, 0.05), hrRing(0.132, 0.038)], { seg: 14, cap0: false, cap1: false, crease: 30 });
  i.lathe([[cy + 0.3 * headScale, 0.052], [cy + 0.34 * headScale, 0.038], [cy + 0.37 * headScale, 0.022]], { seg: 8, cap0: false });
  i.sym(() => {
    i.paint(pal.bronze, { c2: 0xffdf84, gloss: 1, mat: K.metal });
    i.g(pt(0.13, cy + 0.18 * headScale, -0.02, -10, 16, -20), () => i.extrude([[0, 0], [0.12, 0.14], [0.08, 0.19], [0.01, 0.1], [-0.02, 0.03]], 0.014, 0.004));
    // 两根飒爽冲天朱红雉鸡长翎
    i.paint(pal.scarf, { c2: 0xffe084, by: (_u: number, yVal: number) => clamp01((yVal - cy - 0.4) / 0.36), mat: K.fur });
    i.tube(
      [
        [0.035, cy + 0.34 * headScale, -0.02, 0.01],
        [0.14, cy + 0.48, -0.14, 0.012, 0.005],
        [0.24, cy + 0.56, -0.34, 0.009, 0.004],
        [0.3, cy + 0.5, -0.54, 0.002, 0.002],
      ],
      { seg: 4, up: [1, 0, 0] },
    );
  });
  i.paint(pal.scarf, { c2: pal.sashDark, mat: K.fur });
  af(i, [0, cy + 0.36 * headScale, -0.02], [0, 0.9, -0.4], 0.2, 0.044, { n: 3, seg: 5, curl: [0, -0.1, -0.26], tip: 0.3 });

  // 6. 右手环首单刀 (-Z) & 左手袖刃 + 山河军令图
  const buildSabre = (boneId: number, xPos: number, bladeLen: number, bladeW: number, isMain: boolean) => {
    i.bone(boneId);
    i.g(pt(xPos, s.handY, 0), () => {
      i.paint(pal.leather, { c2: pal.suitDark, mat: K.leather });
      i.tube([[0, 0, -0.06, 0.02], [0, 0, 0.12, 0.018]], { seg: 6 });
      i.paint(pal.bronze, { c2: pal.bronzeDark, gloss: 1, mat: K.metal });
      i.tube([[0, 0, -0.06, 0.028, 0.054], [0, 0, -0.08, 0.028, 0.054]], { seg: 6, crease: 30 });
      if (isMain) i.g(pt(0, 0, 0.16, 0, 90, 0), () => i.torus(0.036, 0.009, 0.01, 8, 3, { crease: 30 }));
      i.paint(isMain ? pal.steel : pal.plain, { c2: pal.steelDark, gloss: 1, mat: K.metal });
      const bPts: number[][] = [];
      for (let idx = 0; idx <= 6; idx++) {
        const tVal = idx / 6;
        const width = bladeW * 0.55 * Math.pow(Math.sin(Math.PI * (0.22 + tVal * 0.78)), 0.7);
        bPts.push([0, 0, -0.08 - tVal * bladeLen, 0.011 * (1 - tVal * 0.55), Math.max(0.005, width)]);
      }
      i.tube(bPts, { seg: 4, up: [0, 1, 0], crease: 0 });
      if (isMain) {
        i.paint(pal.edge, { glow: 0.42, gloss: 1, mat: K.metal, line: 0 });
        i.tube(bPts.slice(1).map((p) => [p[0], p[1] - p[4] * 0.92, p[2], 0.004, 0.006]), { seg: 3, up: [0, 1, 0], crease: 0 });
      }
    });
  };
  buildSabre(e.propR, -s.shoulderX, 0.64, 0.09, true);
  buildSabre(e.propL, s.shoulderX, 0.34, 0.062, false);

  i.bone(h);
  const M = (idx: number) => (idx <= 0 ? h : x[Math.min(io, idx) - 1]);
  const furlBind = (_x: number, yVal: number) => {
    const fIdx = clamp01((s.handY - 0.02 - yVal) / Sp) * io;
    const baseIdx = Math.min(io - 1, Math.floor(fIdx + 1e-4));
    return [M(baseIdx), M(baseIdx + 1), clamp01(1 - (fIdx - baseIdx))];
  };
  i.g(pt(s.shoulderX, s.handY - 0.02, 0), () => {
    i.paint(pal.tube, { c2: pal.tubeDark, gloss: 0.55, mat: K.leather });
    i.tube([[-0.22, 0, 0.03, 0.02], [0.22, 0, 0.03, 0.02]], { seg: 5 });
    const scrollPt = (u: number, v: number, dz = 0) => [bt(-0.2, 0.2, u), -v * Sp, 0.05 + 0.3 * Math.sin(v * Math.PI * 0.55) + dz];
    i.bind(furlBind).paint(pal.silk, { c2: pal.silkShade, mat: K.cloth, by: (_u: number, yVal: number) => clamp01((s.handY - 0.02 - yVal) / Sp) });
    i.sheet(2, io, (u, v) => scrollPt(u, v));
    i.paint(pal.sash, { mat: K.cloth, line: 0 });
    for (const [yv, amp] of [
      [0.3, 0.06],
      [0.55, 0.04],
    ]) {
      const pts: number[][] = [];
      for (let C = 0; C <= 6; C++) {
        const p = scrollPt(0.1 + (C / 6) * 0.8, yv - amp * Math.abs(Math.sin(C * 1.7)), 0.006);
        pts.push([p[0], p[1], p[2], 0.006, 0.003]);
      }
      i.tube(pts, { seg: 3, up: [0, 0, 1] });
    }
    i.bone(x[io - 1]).paint(pal.tube, { c2: pal.tubeDark, gloss: 0.5, mat: K.leather });
    const bot = scrollPt(0.5, 1);
    i.tube([[-0.21, bot[1], bot[2], 0.022], [0.21, bot[1], bot[2], 0.022]], { seg: 5 });
  });

  const pet = addHeroCompanion(i, t, e.root, K, pt, 'hawk');
  i.bakeGrounding(2.05, 0.76, 0.88);
  return { h: n, b: i, extra: { furl: h, furlRows: x, furlPts: m, pet } };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. 分部件头冠与兵器精雕：文成、秦琼、苏轼、刘娥
// ─────────────────────────────────────────────────────────────────────────────
export function buildWenchengHead(api: HeroModelApi, pal: Record<string, number>, headBone: number, headObj: HeadObj) {
  const { m, K, pt } = api;
  const k = headObj.cy;
  const s = headObj.s;

  m.bone(headBone);
  m.paint(pal.hair, { c2: pal.hairHi, gloss: 0.16, mat: K.fur });
  m.ball(0, k + 0.11 * s, -0.005, 0.18, 0.13, 0.18, 1);
  m.ball(0, k + 0.21 * s, -0.04, 0.125, 0.1, 0.12, 1);
  m.sym(() => {
    m.g(pt(0.108, k + 0.248 * s, -0.025, 90, 0, -16), () => m.torus(0.078, 0.034, 0.032, 14, 5, { crease: 60 }));
  });
  m.paint(pal.brass, { c2: 0xffe49c, gloss: 1, glow: 0.2, mat: K.metal });
  m.g(pt(0, k + 0.135 * s, 0.012, -14, 0, 0), () => m.torus(0.168, 0.015, 0.02, 14, 4, { crease: 30 }));
  m.g(pt(0, k + 0.25 * s, 0.085, -6, 0, 0), () =>
    m.extrude([[0, 0.11], [0.045, 0.03], [0.11, 0.055], [0.035, -0.03], [-0.035, -0.03], [-0.11, 0.055], [-0.045, 0.03]], 0.015, 0.004),
  );
  m.paint(pal.silk, { c2: 0xffd2d8, glow: 0.35, mat: K.crystal, line: 0 });
  m.ball(0, k + 0.25 * s, 0.105, 0.02, 0.024, 0.015, 0);
  m.sym(() => {
    m.paint(pal.brass, { c2: 0xffe9a6, gloss: 1, mat: K.metal });
    m.tube([[0.115, k + 0.24 * s, -0.02, 0.006], [0.195, k + 0.2 * s, 0.03, 0.005]], { seg: 4 });
    m.paint(pal.jade, { c2: 0xffffff, glow: 0.45, mat: K.crystal, line: 0 });
    m.ball(0.195, k + 0.14 * s, 0.035, 0.015, 0.02, 0.015, 0);
    m.ball(0.195, k + 0.08 * s, 0.035, 0.012, 0.015, 0.012, 0);
  });
}

export function buildQinQiongHeadAndMace(
  api: HeroModelApi,
  pal: Record<string, number>,
  headBone: number,
  propRBone: number,
  headObj: HeadObj,
  fScale: number,
  maneJoints: number[],
  manePts: number[][],
  shoulderX: number,
  handY: number,
) {
  const { m, K, pt, Zi, af } = api;
  const vRing = headObj.ring(0.135 * fScale);
  const C = headObj.cy + 0.135 * fScale;

  m.bone(headBone);
  m.paint(pal.ironLight, { c2: pal.ironDark, gloss: 0.85, mat: K.metal });
  const R = (dy: number, off: number) => {
    const r = headObj.ring(dy * fScale);
    return [headObj.cy + dy * fScale, r[0] + off, r[1] + off, 0, r[2]];
  };
  m.lathe([R(0.08, 0.044), R(0.135, 0.034), R(0.19, 0.03), [headObj.cy + 0.26 * fScale, 0.102, 0.108, 0, -0.014], [headObj.cy + 0.3 * fScale, 0.04, 0.04, 0, -0.015]], {
    seg: 14,
    cap0: false,
  });
  m.paint(pal.bronze, { c2: 0xffe49c, gloss: 1, mat: K.metal });
  m.lathe([R(0.095, 0.038), R(0.115, 0.05), R(0.135, 0.04)], { seg: 14, cap0: false, cap1: false, crease: 30 });
  m.g(pt(0, C, vRing[2], 12, 0, 0), () => m.torus(vRing[0] + 0.038, 0.014, 0.018, 14, 4, { crease: 30 }));
  m.ball(0, C + 0.035, headObj.surf(0, C + 0.035) + 0.036, 0.038, 0.046, 0.022, 0, 180);
  m.sym(() => {
    m.paint(pal.bronze, { c2: 0xffe49c, gloss: 1, mat: K.metal });
    m.g(pt(0.135, headObj.cy + 0.18 * fScale, -0.02, -8, 16, -22), () => m.extrude([[0, 0], [0.13, 0.14], [0.095, 0.19], [0.025, 0.1], [-0.025, 0.035]], 0.014, 0.004));
  });

  m.bind(Zi(maneJoints, manePts, headBone));
  m.paint(pal.red, { c2: pal.redDark, mat: K.fur });
  m.ball(0, headObj.cy + 0.31 * fScale, -0.035, 0.048, 0.042, 0.048, 1);
  af(m, [0, headObj.cy + 0.31 * fScale, -0.05], [0, 0.65, -0.75], 0.24, 0.052, { n: 3, seg: 5, curl: [0, -0.14, -0.28], tip: 0.3 });

  // 右手主兵器：熟铜四棱鎏金大锏 (严格沿 +Z 生成，消除任何 lathe 轴错位!)
  m.bone(propRBone);
  m.g(pt(-shoulderX, handY, 0), () => {
    m.paint(pal.leather, { c2: pal.leatherDark, mat: K.leather });
    m.tube([[0, 0, -0.22, 0.022], [0, 0, 0.16, 0.024]], { seg: 8 });
    m.paint(pal.bronze, { c2: 0xffdf8a, gloss: 1, mat: K.metal });
    m.tube([[0, 0, -0.26, 0.014], [0, 0, -0.22, 0.038], [0, 0, -0.18, 0.028]], { seg: 8, crease: 30 });
    m.tube([[0, 0, 0.15, 0.035], [0, 0, 0.18, 0.068], [0, 0, 0.21, 0.052]], { seg: 8, crease: 30 });
    m.tube([[0, 0, 0.21, 0.034, 0.034], [0, 0, 1.04, 0.046, 0.046], [0, 0, 1.24, 0.036, 0.036], [0, 0, 1.38, 0.004, 0.004]], { seg: 4, up: [1, 0, 0], crease: 0 });
    m.paint(pal.amber, { glow: 0.35, gloss: 1, mat: K.metal, line: 0 });
    for (const knotZ of [0.35, 0.53, 0.71, 0.89, 1.07]) {
      m.g(pt(0, 0, knotZ), () => m.box(0, 0, 0, 0.078, 0.078, 0.024, 0.005));
    }
  });
}

export function buildSuShiHeadAndGuqin(
  api: HeroModelApi,
  pal: Record<string, number>,
  headBone: number,
  pipaBone: number,
  pipaMat: unknown,
  headObj: HeadObj,
  uScale: number,
) {
  const { m, K, pt } = api;
  const C = headObj.cy;

  m.bone(headBone);
  m.paint(0x16181e, { c2: 0x262b36, gloss: 0.12, mat: K.fur });
  m.ball(0, C + 0.12 * uScale, -0.004, 0.18, 0.135, 0.18, 1);

  m.paint(0x14161c, { c2: 0x262b38, gloss: 0.14, mat: K.cloth });
  m.lathe(
    [
      [C + 0.1 * uScale, 0.18, 0.188, 0, -0.005],
      [C + 0.21 * uScale, 0.158, 0.168, 0, -0.015],
      [C + 0.31 * uScale, 0.136, 0.148, 0, -0.026],
      [C + 0.38 * uScale, 0.106, 0.115, 0, -0.035],
      [C + 0.41 * uScale, 0.03, 0.03, 0, -0.035],
    ],
    { seg: 12, crease: 36 },
  );
  m.paint(pal.gold, { c2: 0xf0fcf9, gloss: 1, glow: 0.16, mat: K.metal });
  m.g(pt(0, C + 0.13 * uScale, 0.008, -8, 0, 0), () => m.torus(0.175, 0.012, 0.016, 14, 4));
  m.ball(0, C + 0.16 * uScale, headObj.surf(0, C + 0.16 * uScale) + 0.02, 0.02, 0.028, 0.015, 0);

  // 修长展脚双翅（略微下垂飘逸，宋官袍文豪风姿）
  m.sym(() => {
    m.paint(0x151820, { c2: 0x2d3544, gloss: 0.24, mat: K.leather });
    m.g(pt(0.155, C + 0.21 * uScale, -0.025, 0, -10, -8), () => {
      m.box(0.2, 0, 0, 0.4, 0.044, 0.018, 0.005);
      m.paint(pal.gold, { c2: 0xdafcf7, gloss: 1, mat: K.metal });
      m.box(0.02, 0, 0, 0.042, 0.052, 0.024, 0.004);
      m.box(0.39, 0, 0, 0.026, 0.048, 0.02, 0.004);
    });
  });

  // 仲尼七弦紫檀玉徽古琴
  m.bone(pipaBone);
  m.g(pipaMat, () => {
    m.paint(pal.woodDeep, { c2: pal.woodDark, gloss: 0.65, mat: K.leather });
    m.tube([[0, -0.34, 0.01, 0.075, 0.022], [0, -0.18, 0.01, 0.092, 0.026], [0, 0.16, 0.01, 0.106, 0.028], [0, 0.46, 0.01, 0.118, 0.026], [0, 0.58, 0.01, 0.088, 0.02]], {
      seg: 8,
      up: [0, 0, 1],
    });
    m.paint(pal.gold, { c2: 0xe6fcf8, gloss: 1, glow: 0.24, mat: K.crystal, line: 0 });
    m.box(0, 0.48, 0.036, 0.19, 0.018, 0.018, 0.004);
    m.box(0, -0.24, 0.036, 0.135, 0.018, 0.018, 0.004);
    for (let i = -3; i <= 4; i++) m.ball(0.068, i * 0.08 + 0.1, 0.035, 0.007, 0.007, 0.005, 0);
    m.paint(0xb8fff4, { c2: 0xffffff, glow: 0.55, gloss: 1, mat: K.metal, line: 0 });
    for (let i = -3; i <= 3; i++) {
      const sx = i * 0.017;
      m.tube([[sx, -0.24, 0.042, 0.0036], [sx, 0.48, 0.042, 0.0036]], { seg: 3 });
    }
  });
}

export function buildLiuEHeadAndDecree(
  api: HeroModelApi,
  pal: Record<string, number>,
  headBone: number,
  pipaBone: number,
  pipaMat: unknown,
  headObj: HeadObj,
  uScale: number,
) {
  const { m, K, pt } = api;
  const C = headObj.cy;

  m.bone(headBone);
  m.paint(pal.hair, { c2: pal.hairHi, mat: K.fur });
  m.ball(0, C + 0.12 * uScale, -0.015, 0.175, 0.12, 0.175, 1);

  // 点翠九龙四凤大冠
  m.paint(0x286e82, { c2: pal.gold, gloss: 0.85, mat: K.metal });
  m.lathe([[C + 0.14 * uScale, 0.155, 0.16, 0, -0.015], [C + 0.27 * uScale, 0.16, 0.16, 0, -0.025], [C + 0.37 * uScale, 0.125, 0.125, 0, -0.032], [C + 0.42 * uScale, 0.045, 0.045, 0, -0.032]], {
    seg: 12,
    crease: 34,
  });
  m.paint(pal.gold, { c2: 0xffeba8, gloss: 1, glow: 0.25, mat: K.metal });
  m.g(pt(0, C + 0.19 * uScale, 0.008, -10, 0, 0), () => m.torus(0.162, 0.015, 0.018, 12, 4));
  m.g(pt(0, C + 0.42 * uScale, 0.018, -8, 0, 0), () =>
    m.extrude([[0, 0.12], [0.042, 0.035], [0.12, 0.07], [0.042, -0.035], [-0.042, -0.035], [-0.12, 0.07], [-0.042, 0.035]], 0.018, 0.004),
  );
  m.paint(0xea9cff, { c2: 0xffffff, glow: 0.65, mat: K.crystal, line: 0 });
  m.ball(0, C + 0.32 * uScale, 0.145, 0.024, 0.032, 0.018, 0);

  m.sym(() => {
    m.paint(pal.gold, { c2: 0x2a8896, gloss: 1, glow: 0.16, mat: K.metal });
    // 向后掠展的点翠凤羽博鬓（告别呆板蓝方片）
    m.g(pt(0.135, C + 0.21 * uScale, -0.04, 0, -46, -12), () =>
      m.extrude([[0, 0.045], [0.11, 0.065], [0.18, 0.02], [0.13, -0.035], [0, -0.025]], 0.011, 0.003),
    );
    m.paint(0xf7dcff, { c2: pal.gold, glow: 0.38, mat: K.crystal, line: 0 });
    m.ball(0.19, C + 0.04 * uScale, 0.016, 0.013, 0.018, 0.013, 0);
    m.ball(0.19, C - 0.02 * uScale, 0.016, 0.011, 0.016, 0.011, 0);
  });

  // 紫金展开凤诏圣旨画卷（织金杏黄卷芯 + 朱红锦缘边框 + 紫檀卷轴金穗）
  m.bone(pipaBone);
  m.g(pipaMat, () => {
    m.paint(0xf2d99b, { c2: pal.gold, gloss: 0.4, mat: K.cloth });
    m.box(0, 0.12, 0.01, 0.22, 0.54, 0.02, 0.006);
    m.paint(0x9e2426, { c2: pal.gold, gloss: 0.65, mat: K.cloth });
    m.box(-0.115, 0.12, 0.012, 0.026, 0.54, 0.022, 0.004);
    m.box(0.115, 0.12, 0.012, 0.026, 0.54, 0.022, 0.004);
    // 顶部底部紫檀雕金卷轴横杆
    m.paint(pal.cloakDark, { c2: pal.gold, gloss: 0.85, mat: K.leather });
    m.tube([[-0.16, 0.41, 0.014, 0.023], [0.16, 0.41, 0.014, 0.023]], { seg: 8 });
    m.tube([[-0.16, -0.17, 0.014, 0.023], [0.16, -0.17, 0.014, 0.023]], { seg: 8 });
    m.paint(pal.gold, { c2: 0xffefa8, gloss: 1, glow: 0.25, mat: K.metal });
    for (const yPos of [0.41, -0.17]) {
      m.ball(-0.17, yPos, 0.014, 0.025, 0.026, 0.026, 0);
      m.ball(0.17, yPos, 0.014, 0.025, 0.026, 0.026, 0);
    }
    m.tube([[-0.16, -0.18, 0.014, 0.012], [-0.16, -0.29, 0.014, 0.004]], { seg: 4 });
    m.tube([[0.16, -0.18, 0.014, 0.012], [0.16, -0.29, 0.014, 0.004]], { seg: 4 });
    // 卷中帝王朱砂玉玺印与金光
    m.paint(0xb8242c, { c2: 0xffd27a, glow: 0.48, mat: K.crystal, line: 0 });
    m.box(0, 0.12, 0.024, 0.095, 0.095, 0.012, 0.003);
    m.paint(0xe694ff, { c2: 0xffffff, glow: 0.82, mat: K.crystal, line: 0 });
    m.ball(0, 0.12, 0.042, 0.032, 0.032, 0.016, 0);
  });
}
