interface Point {
  x: number;
  y: number;
}
interface UnitLike {
  id: number;
  team: number;
  kind?: string;
  alive: boolean;
  pos: Point;
  radius?: number;
  hp: number;
  stats: { maxHp: number };
  visible: boolean[];
}
interface Hero extends UnitLike {
  inCombat?: boolean;
  targetId?: number;
  anim?: string;
  animStart?: number;
  h?: { atkOrder?: boolean; atkTargetId?: number };
}
export interface TeamState {
  time: number;
  over: boolean;
  playerId: number;
  heroes: Hero[];
}
interface Bot {
  team: number;
  time: number;
  me: Hero;
  home: Point;
  hpR: number;
  heroesOnMe: number;
  foes: Hero[];
  foeMinions: UnitLike[];
  forceFightId: number;
  fightUntil: number;
  diving: boolean;
  label: string;
  brain: { callFocus: (id: number, time: number) => void };
  v: {
    state: TeamState;
    enemies: () => UnitLike[];
    enemyHeroes: () => Hero[];
    monsters: () => UnitLike[];
    enemyStructureCovering: (point: Point, margin?: number) => unknown;
    busy: () => boolean;
  };
  act: {
    halt: () => void;
    attack: (targetId: number) => void;
    moveTo: (x: number, y: number, urgent?: boolean) => void;
  };
  advantageAt: (x: number, y: number) => number;
  combat: () => boolean;
  travel: (x: number, y: number, tolerance?: number, urgent?: boolean) => void;
}
type TeamOrder = 'gather';
interface Order {
  kind: TeamOrder;
  until: number;
}

const orders = new WeakMap<TeamState, Order>();
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const ORDER_DURATION = 10;
const AUTO_HELP_DISTANCE = 22;
const PASSIVE_HP_FLOOR = 0.38;
const ORDER_HP_FLOOR = 0.32;

export function issueTeamOrder(state: TeamState, kind: TeamOrder = 'gather'): void {
  if (state.over) return;
  orders.set(state, { kind, until: state.time + ORDER_DURATION });
}

function isRealHeroEngagement(player: Hero, state: TeamState, enemiesNearPlayer: Hero[]): boolean {
  if (enemiesNearPlayer.length === 0) return false;
  const attackTarget = player.h?.atkTargetId;
  const targetId = attackTarget !== undefined && attackTarget >= 0 ? attackTarget : player.targetId;
  if (targetId !== undefined && enemiesNearPlayer.some((enemy) => enemy.id === targetId)) {
    return true;
  }
  const nearFight = enemiesNearPlayer.some((enemy) => distance(enemy.pos, player.pos) <= 11);
  if (player.inCombat && nearFight) return true;
  const recentSkill =
    player.animStart !== undefined &&
    state.time - player.animStart < 1.4 &&
    (player.anim === 'dash' || player.anim === 'leap' || !!player.anim?.startsWith('cast_'));
  return recentSkill && enemiesNearPlayer.some((enemy) => distance(enemy.pos, player.pos) <= 13);
}

function situation(bot: Bot) {
  const { state } = bot.v;
  const player = state.heroes.find((hero) => hero.id === state.playerId);
  if (!player?.alive || player.team !== bot.team || player.id === bot.me.id) return null;

  const order = orders.get(state);
  const activeOrder = order && state.time < order.until ? order : undefined;
  if (bot.hpR < (activeOrder ? ORDER_HP_FLOOR : PASSIVE_HP_FLOOR)) return null;

  // 被动援护时若队友自身正被敌方英雄缠斗，交还原版 combat() 处理；全图手动「集合」令则优先响应
  if (!activeOrder && (bot.heroesOnMe > 0 || bot.foes.some((foe) => distance(foe.pos, bot.me.pos) <= 8.5))) {
    return null;
  }

  const distToPlayer = distance(bot.me.pos, player.pos);
  if (!activeOrder && distToPlayer > AUTO_HELP_DISTANCE) return null;
  if (bot.v.enemyStructureCovering(player.pos, 1)) return null;

  const attackTarget = player.h?.atkTargetId;
  const preferred = attackTarget !== undefined && attackTarget >= 0 ? attackTarget : player.targetId;
  const enemies = bot.v
    .enemyHeroes()
    .filter(
      (enemy) =>
        enemy.alive &&
        enemy.visible[bot.team] &&
        distance(enemy.pos, player.pos) <= 14 &&
        !bot.v.enemyStructureCovering(enemy.pos, 0.5),
    );
  enemies.sort(
    (a, b) =>
      (a.id === preferred ? -20 : 0) +
      distance(a.pos, player.pos) -
      ((b.id === preferred ? -20 : 0) + distance(b.pos, player.pos)),
  );

  const engaged = isRealHeroEngagement(player, state, enemies);
  if (!activeOrder && !engaged) return null;

  // 远距离回应全图「集合」时优先全速向玩家靠拢，靠拢至近处再接管战局
  const target = engaged || (activeOrder && distToPlayer <= 12) ? enemies[0] : undefined;
  if (!activeOrder && !target) return null;
  return { player, target, order: activeOrder };
}

function findGatherPushTarget(bot: Bot, player: Hero): UnitLike | undefined {
  const candidates: UnitLike[] = [];
  const seen = new Set<number>();
  for (const unit of [...bot.foeMinions, ...bot.v.enemies(), ...bot.v.monsters()]) {
    if (!unit.alive || unit.kind === 'hero' || seen.has(unit.id)) continue;
    seen.add(unit.id);
    if (distance(unit.pos, player.pos) > 9.5 && distance(unit.pos, bot.me.pos) > 9.5) continue;
    if (bot.v.enemyStructureCovering(unit.pos, 0.5)) continue;
    candidates.push(unit);
  }
  candidates.sort((a, b) => distance(a.pos, bot.me.pos) - distance(b.pos, bot.me.pos));
  return candidates[0];
}

export const teamTactics = {
  isUrgent(bot: Bot): boolean {
    return situation(bot) !== null;
  },
  respond(bot: Bot): boolean {
    const help = situation(bot);
    if (!help || bot.v.busy()) return false;
    const { player, target, order } = help;

    if (target) {
      if (bot.advantageAt(target.pos.x, target.pos.y) < 0.7) {
        if (!order) return false;
      } else {
        bot.brain.callFocus(target.id, bot.time);
        if (bot.foes.some((enemy) => enemy.id === target.id)) {
          bot.forceFightId = target.id;
          if (bot.combat()) return true;
        }
        bot.travel(target.pos.x, target.pos.y, 2.5);
        bot.label = 'assist-player';
        return true;
      }
    }

    if (!order) return false;
    const distToPlayer = distance(bot.me.pos, player.pos);
    if (distToPlayer > 6.5) {
      bot.travel(player.pos.x, player.pos.y, 2.5, true);
      bot.label = 'gather-player';
      return true;
    }

    // 集合到位后主动参战或协助清线打野，避免原地罚站
    if (bot.foes.length > 0 && bot.advantageAt(bot.me.pos.x, bot.me.pos.y) >= 0.7 && bot.combat()) {
      return true;
    }
    const pushTarget = findGatherPushTarget(bot, player);
    if (pushTarget) {
      bot.act.attack(pushTarget.id);
      bot.label = 'gather-push';
      return true;
    }
    if (distToPlayer > 4.2) {
      bot.act.moveTo(player.pos.x, player.pos.y, true);
      bot.label = 'gather-player';
    } else {
      bot.act.halt();
      bot.label = 'hold-gather';
    }
    return true;
  },
};

function createRallyFlagIcon(): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 28 28');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('ts-rally-btn__ico');

  const pole = document.createElementNS(ns, 'path');
  pole.setAttribute('d', 'M8 4.5v19M6.5 4.5h3M6.5 23.5h3');
  pole.setAttribute('stroke', 'currentColor');
  pole.setAttribute('stroke-width', '2');
  pole.setAttribute('stroke-linecap', 'round');

  const banner = document.createElementNS(ns, 'path');
  banner.setAttribute('d', 'M9 5.5c4.8-.6 8.2 1.2 12.6-.3l-2.3 4.3 2.5 4c-4.5 1.1-8-.6-12.8.2z');
  banner.setAttribute('fill', 'currentColor');
  banner.setAttribute('fill-opacity', '0.92');

  const arrows = document.createElementNS(ns, 'path');
  arrows.setAttribute('d', 'M14.5 17.5L18 20.5 14.5 23.5M21.5 17.5L18 20.5 21.5 23.5');
  arrows.setAttribute('fill', 'none');
  arrows.setAttribute('stroke', 'currentColor');
  arrows.setAttribute('stroke-width', '1.8');
  arrows.setAttribute('stroke-linecap', 'round');
  arrows.setAttribute('stroke-linejoin', 'round');

  svg.append(pole, banner, arrows);
  return svg;
}

export function mountTeamCommands(root: HTMLElement, state: TeamState): void {
  if (root.querySelector('.ts-rally-wrap')) return;

  const wrap = document.createElement('div');
  wrap.className = 'ts-rally-wrap';
  wrap.setAttribute('role', 'group');
  wrap.setAttribute('aria-label', '全军集合指令');
  wrap.setAttribute('data-hud-hit', '');

  const feedback = document.createElement('span');
  feedback.className = 'ts-rally-feedback';
  feedback.setAttribute('role', 'status');
  feedback.setAttribute('aria-live', 'polite');

  const button = document.createElement('button');
  button.type = 'button';
  button.tabIndex = -1;
  button.className = 'ts-rally-btn';
  button.dataset.order = 'gather';
  button.setAttribute('aria-label', '呼叫全图队友向我集合');

  const ring = document.createElement('span');
  ring.className = 'ts-rally-btn__ring';
  ring.setAttribute('aria-hidden', 'true');

  const ripple = document.createElement('span');
  ripple.className = 'ts-rally-btn__ripple';
  ripple.setAttribute('aria-hidden', 'true');

  const face = document.createElement('span');
  face.className = 'ts-rally-btn__face';

  const label = document.createElement('span');
  label.className = 'ts-rally-btn__label';
  label.textContent = '集合';
  face.append(createRallyFlagIcon(), label);

  const keyHint = document.createElement('span');
  keyHint.className = 'sf-hud__key';
  keyHint.setAttribute('aria-hidden', 'true');
  keyHint.textContent = 'C';

  button.append(ring, ripple, face, keyHint);
  wrap.append(feedback, button);
  root.append(wrap);

  let feedbackTimer = 0;
  let activeTimer = 0;
  let lastPointerTrigger = -Infinity;

  const triggerRally = () => {
    if (!root.isConnected) return;
    const player = state.heroes.find((hero) => hero.id === state.playerId);
    if (!player?.alive || state.over || root.classList.contains('is-locked') || root.querySelector('.sf-dialog-scrim')) {
      return;
    }
    issueTeamOrder(state, 'gather');
    (window as { __moba?: { audio?: { ui?: (k: string) => void } } }).__moba?.audio?.ui?.('order_gather');

    button.classList.remove('is-active', 'is-pulsing');
    void button.offsetWidth;
    button.style.setProperty('--rally-dur', `${ORDER_DURATION}s`);
    button.classList.add('is-active', 'is-pulsing');

    feedback.textContent = '全军向我集合';
    window.clearTimeout(feedbackTimer);
    feedbackTimer = window.setTimeout(() => {
      if (root.isConnected) feedback.textContent = '';
    }, 2400);

    window.clearTimeout(activeTimer);
    activeTimer = window.setTimeout(() => {
      if (root.isConnected) button.classList.remove('is-active', 'is-pulsing');
    }, ORDER_DURATION * 1000);
  };

  button.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    lastPointerTrigger = performance.now();
    triggerRally();
  });

  button.addEventListener('click', (event) => {
    event.stopPropagation();
    if (event.isTrusted && performance.now() - lastPointerTrigger < 450) {
      lastPointerTrigger = -Infinity;
      return;
    }
    triggerRally();
  });

  const onKeyDown = (event: KeyboardEvent) => {
    if (!root.isConnected) {
      window.removeEventListener('keydown', onKeyDown);
      return;
    }
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.code !== 'KeyC' && event.key !== 'c' && event.key !== 'C') return;
    const target = event.target;
    if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable="true"]')) {
      return;
    }
    event.preventDefault();
    triggerRally();
  };
  window.addEventListener('keydown', onKeyDown);
}
