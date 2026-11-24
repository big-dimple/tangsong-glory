import { HEROES, type HeroId } from '../config/heroes';

interface Point { x: number; y: number }
interface ScreenPoint extends Point { visible: boolean }
interface SkillEvent {
  type?: string;
  unitId?: number;
  heroId?: string;
  slot?: string;
  pos?: Point;
  dir?: Point;
}
interface VisibleHero { id?: number; team?: number; heroId?: string; visible?: boolean[]; pos?: Point }
export interface SkillInkHud {
  root?: HTMLElement;
  me?: VisibleHero;
  hero?: (id: number) => VisibleHero | undefined;
  host?: { worldToScreen?: (point: Point, height?: number) => ScreenPoint };
}
interface StrokeEffect {
  heroId: HeroId;
  slot: 's1' | 's2' | 'ult';
  pos: Point;
  dir: Point;
  start: number;
  duration: number;
  drawn?: boolean;
}

const layers = new WeakMap<HTMLElement, ReturnType<typeof createLayer>>();
const clamp = (value: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, value));

function brushTitle(hud: SkillInkHud, event: SkillEvent, label: string) {
  const root = hud.root;
  const project = hud.host?.worldToScreen;
  if (!root || !project || !event.pos) return;
  const point = project(event.pos, 2.6);
  if (!point.visible) return;
  root.querySelectorAll('.ts-brush-title').forEach((old) => old.remove());
  const title = document.createElement('div');
  title.className = 'ts-brush-title';
  title.setAttribute('aria-hidden', 'true');
  for (const [index, character] of Array.from(label).entries()) {
    const glyph = document.createElement('span');
    glyph.className = 'ts-brush-title__char';
    glyph.style.setProperty('--index', String(index));
    glyph.textContent = character;
    title.append(glyph);
  }
  root.append(title);
  const place = () => {
    const actor = typeof event.unitId === 'number' ? hud.hero?.(event.unitId) : undefined;
    const screen = project(actor?.pos ?? event.pos!, 2.6);
    const hiddenEnemy = actor && actor.team !== hud.me?.team && !actor.visible?.[hud.me?.team ?? 0];
    title.style.visibility = screen.visible && !hiddenEnemy ? 'visible' : 'hidden';
    if (!screen.visible || hiddenEnemy || !title.isConnected) return;
    const bounds = root.getBoundingClientRect();
    const width = title.offsetWidth;
    const x = screen.x - bounds.left;
    const y = screen.y - bounds.top;
    title.style.left = `${clamp(x + (x > bounds.width * 0.62 ? -width - 24 : 24), 8, Math.max(8, bounds.width - width - 8))}px`;
    title.style.top = `${clamp(y - 38, Math.min(112, bounds.height * 0.24), bounds.height * 0.58)}px`;
  };
  place();
  let frame = 0;
  const started = performance.now();
  const follow = () => {
    if (!title.isConnected || performance.now() - started >= 3000) {
      title.remove();
      return;
    }
    place();
    frame = requestAnimationFrame(follow);
  };
  frame = requestAnimationFrame(follow);
  title.addEventListener('animationend', (event) => {
    if (event.target === title) {
      cancelAnimationFrame(frame);
      title.remove();
    }
  });
}

function stroke(ctx: CanvasRenderingContext2D, color: string, width: number, draw: () => void) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  draw();
  ctx.stroke();
}

function drawAccent(ctx: CanvasRenderingContext2D, effect: StrokeEffect, age: number, size: number) {
  const p = clamp(age / effect.duration, 0, 1);
  const open = 1 - Math.pow(1 - clamp(p / 0.26, 0, 1), 3);
  const fade = Math.min(1, p * 8) * (1 - clamp((p - 0.58) / 0.42, 0, 1));
  const hero = HEROES[effect.heroId];
  const gold = hero.palette.accent;
  const light = hero.palette.glow;
  const broad = effect.slot === 'ult' ? 1.3 : effect.slot === 's2' ? 0.92 : 1;
  ctx.globalAlpha = fade * 0.88;
  ctx.scale(size * broad * open, size * broad * open);
  ctx.shadowColor = light;
  ctx.shadowBlur = 5;
  const brush = (color: string, width: number, draw: () => void) => stroke(ctx, color, width, draw);

  switch (effect.heroId) {
    case 'qinqiong': // 山岳重墨与鎏金碎石
      brush('#27231d', 0.1, () => {
        ctx.moveTo(-1.12, 0.2); ctx.lineTo(-0.65, -0.3); ctx.lineTo(-0.37, -0.03);
        ctx.lineTo(0.05, -0.7); ctx.lineTo(0.4, -0.18); ctx.lineTo(0.74, -0.48); ctx.lineTo(1.1, 0.16);
      });
      brush(gold, 0.035, () => { ctx.moveTo(-1, 0.27); ctx.quadraticCurveTo(0, 0.02, 1.05, 0.28); });
      break;
    case 'xinqiji': // 夜袭墨锋与朱红军旗
      for (let i = 0; i < 3; i++) brush(i === 1 ? gold : '#30211f', 0.045 + i * 0.012, () => {
        ctx.moveTo(-1.08, 0.25 + i * 0.12); ctx.quadraticCurveTo(-0.1, -0.42 + i * 0.13, 1.16, -0.52 + i * 0.14);
      });
      ctx.fillStyle = hero.palette.primary;
      ctx.fillRect(0.56, -0.69, 0.16, 0.28);
      break;
    case 'sushi': // 江浪、远山与飞白墨痕
      for (let i = 0; i < 3; i++) brush(i === 1 ? light : '#203d3a', 0.04 + i * 0.012, () => {
        ctx.moveTo(-1.15, 0.12 + i * 0.18);
        ctx.bezierCurveTo(-0.6, -0.42 + i * 0.18, -0.25, 0.45 + i * 0.18, 0.23, -0.05 + i * 0.18);
        ctx.quadraticCurveTo(0.73, -0.45 + i * 0.18, 1.12, 0.08 + i * 0.18);
      });
      brush(gold, 0.025, () => { ctx.moveTo(-0.8, -0.23); ctx.lineTo(-0.37, -0.58); ctx.lineTo(-0.08, -0.33); ctx.lineTo(0.17, -0.64); ctx.lineTo(0.51, -0.29); });
      break;
    case 'wencheng': // 飞天披帛与凤羽
      for (let i = 0; i < 3; i++) brush(i === 1 ? light : gold, 0.035 + i * 0.01, () => {
        ctx.moveTo(-1.05, 0.42 - i * 0.17); ctx.bezierCurveTo(-0.65, -0.52, 0.12, 0.62 - i * 0.2, 1.05, -0.48 + i * 0.1);
      });
      brush('#fff2db', 0.035, () => { ctx.moveTo(0.44, -0.38); ctx.quadraticCurveTo(0.76, -0.9, 0.95, -0.73); ctx.quadraticCurveTo(0.93, -0.46, 0.44, -0.38); });
      break;
    case 'huarui': // 剑弧与海棠落英
      brush(light, 0.06, () => { ctx.arc(0, 0.15, 0.88, Math.PI * 1.12, Math.PI * 1.92); });
      brush(gold, 0.025, () => { ctx.arc(0, 0.15, 0.72, Math.PI * 1.18, Math.PI * 1.88); });
      break;
    case 'liue': // 宫廷印玺与垂帘金线
      ctx.save(); ctx.translate(0.53, -0.27); ctx.rotate(0.12);
      ctx.strokeStyle = gold; ctx.lineWidth = 0.055; ctx.strokeRect(-0.22, -0.22, 0.44, 0.44);
      brush(light, 0.035, () => { ctx.moveTo(-0.13, -0.04); ctx.lineTo(0.13, -0.04); ctx.moveTo(0, -0.14); ctx.lineTo(0, 0.14); });
      ctx.restore();
      for (let i = 0; i < 2; i++) brush(i ? gold : '#ba4a48', 0.04, () => {
        ctx.moveTo(-0.95, -0.55 + i * 0.17); ctx.bezierCurveTo(-0.5, 0.32, 0.2, -0.38, 1.05, 0.42 + i * 0.1);
      });
      break;
  }

  // 同一英雄的三招保留共同笔意，再用不同笔势区分出手、护身与大招。
  if (effect.slot === 's1') {
    brush(light, 0.025, () => {
      ctx.moveTo(-0.8, 0.53); ctx.quadraticCurveTo(0.12, 0.31 - p * 0.15, 1.03, -0.08);
    });
  } else if (effect.slot === 's2') {
    brush(gold, 0.025, () => { ctx.arc(0, 0.13, 0.58 + p * 0.12, Math.PI * 1.05, Math.PI * 1.95); });
  } else {
    brush(light, 0.04, () => {
      ctx.moveTo(-1.14, 0.5); ctx.bezierCurveTo(-0.3, 0.22, 0.37, 0.65, 1.15, 0.14);
    });
  }

  const count = effect.slot === 'ult' ? 9 : 5;
  for (let i = 0; i < count; i++) {
    const angle = i * 2.4 + (effect.heroId.length % 3);
    const radius = 0.42 + p * (0.7 + (i % 3) * 0.14);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius - p * 0.3;
    ctx.fillStyle = i % 2 ? light : gold;
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle + p * 2);
    ctx.beginPath();
    if (effect.heroId === 'huarui') ctx.ellipse(0, 0, 0.08, 0.04, 0, 0, Math.PI * 2);
    else if (effect.heroId === 'wencheng') ctx.ellipse(0, 0, 0.1, 0.025, 0, 0, Math.PI * 2);
    else ctx.arc(0, 0, 0.025 + (i % 2) * 0.012, 0, Math.PI * 2);
    ctx.fill(); ctx.restore();
  }
}

function createLayer(root: HTMLElement, hud: SkillInkHud) {
  const canvas = document.createElement('canvas');
  canvas.className = 'ts-skill-ink';
  canvas.setAttribute('aria-hidden', 'true');
  root.append(canvas);
  const ctx = canvas.getContext('2d');
  const effects: StrokeEffect[] = [];
  let frame = 0;

  const draw = (now: number) => {
    frame = 0;
    if (!root.isConnected || !ctx) { effects.length = 0; return; }
    const bounds = root.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(bounds.width * dpr));
    const height = Math.max(1, Math.round(bounds.height * dpr));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, bounds.width, bounds.height);
    const project = hud.host?.worldToScreen;
    for (let index = effects.length - 1; index >= 0; index--) {
      const effect = effects[index];
      const elapsed = now - effect.start;
      if (!effect.drawn && elapsed < 10000) {
        // Give a delayed first frame a visible opening, without replaying stale
        // effects after a long background pause.
        effect.start = now - clamp(elapsed, 45, 100);
        effect.drawn = true;
      }
      const age = (now - effect.start) / 1000;
      if (age >= effect.duration) { effects.splice(index, 1); continue; }
      if (!project) continue;
      const origin = project(effect.pos, 1.1);
      if (!origin.visible) continue;
      const forward = project({ x: effect.pos.x + effect.dir.x * 2, y: effect.pos.y + effect.dir.y * 2 }, 1.1);
      const dx = forward.x - origin.x, dy = forward.y - origin.y;
      const size = clamp(Math.hypot(dx, dy) * 0.9, 24, 82);
      ctx.save();
      ctx.translate(origin.x - bounds.left, origin.y - bounds.top);
      ctx.rotate(Math.atan2(dy, dx) * 0.22);
      drawAccent(ctx, effect, age, size);
      ctx.restore();
    }
    if (effects.length) frame = requestAnimationFrame(draw);
  };
  return {
    add(effect: StrokeEffect) {
      if (effects.length >= 18) effects.shift();
      effects.push(effect);
      if (!frame) frame = requestAnimationFrame(draw);
    },
  };
}

export function showSkillInk(events: readonly SkillEvent[], hud: SkillInkHud): void {
  if (!hud.root || !hud.host?.worldToScreen || !hud.me) return;
  for (const event of events) {
    if (event.type !== 'skillCast' || !event.pos || typeof event.unitId !== 'number' ||
        (event.slot !== 's1' && event.slot !== 's2' && event.slot !== 'ult')) continue;
    const actor = hud.hero?.(event.unitId);
    const id = event.heroId ?? actor?.heroId;
    if (!id || !(id in HEROES) || !actor || (actor.team !== hud.me.team && !actor.visible?.[hud.me.team ?? 0])) continue;
    const heroId = id as HeroId;
    let layer = layers.get(hud.root);
    if (!layer) { layer = createLayer(hud.root, hud); layers.set(hud.root, layer); }
    layer.add({ heroId, slot: event.slot, pos: { ...event.pos }, dir: event.dir ?? { x: 1, y: 0 }, start: performance.now(), duration: event.slot === 'ult' ? 1.25 : 0.9 });
    if (heroId === 'sushi' && event.slot === 'ult') brushTitle(hud, event, HEROES[heroId].skills.ult.name);
  }
}
