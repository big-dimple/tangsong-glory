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
type TeamOrder = 'gather' | 'attack' | 'retreat';
interface Order {
  kind: TeamOrder;
  until: number;
}

const orders = new WeakMap<TeamState, Order>();
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const ORDER_DURATION = 8;
const RETREAT_DURATION = 5;
const AUTO_HELP_DISTANCE = 22;
const MANUAL_ORDER_DISTANCE = 38;

export function issueTeamOrder(state: TeamState, kind: TeamOrder): void {
  if (state.over) return;
  const duration = kind === 'retreat' ? RETREAT_DURATION : ORDER_DURATION;
  orders.set(state, { kind, until: state.time + duration });
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

  if (activeOrder?.kind === 'retreat') {
    if (distance(bot.me.pos, player.pos) > MANUAL_ORDER_DISTANCE && distance(bot.me.pos, bot.home) < 24) {
      return null;
    }
    return { player, target: undefined, order: activeOrder };
  }

  if (bot.hpR < 0.38) return null;

  // 若队友自身正被敌方英雄缠斗且无手动指令，交还给原版 combat() 处理，不强行拉走
  if (!activeOrder && (bot.heroesOnMe > 0 || bot.foes.some((foe) => distance(foe.pos, bot.me.pos) <= 8.5))) {
    return null;
  }

  const maxDist = activeOrder ? MANUAL_ORDER_DISTANCE : AUTO_HELP_DISTANCE;
  if (distance(bot.me.pos, player.pos) > maxDist || bot.v.enemyStructureCovering(player.pos, 1)) {
    return null;
  }

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

  const target = engaged || activeOrder?.kind === 'attack' ? enemies[0] : undefined;
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

    if (order?.kind === 'retreat') {
      const threatened =
        bot.hpR < 0.65 ||
        !!bot.v.enemyStructureCovering(bot.me.pos, 2) ||
        bot.v.enemyHeroes().some((enemy) => enemy.alive && enemy.visible[bot.team] && distance(enemy.pos, bot.me.pos) <= 16);
      if (!threatened) return false;
      bot.forceFightId = -1;
      bot.fightUntil = 0;
      bot.diving = false;
      bot.travel(bot.home.x, bot.home.y, 6, true);
      bot.label = 'retreat-order';
      return true;
    }

    if (target) {
      // 不要求残血或孤立队友强打必输团战
      if (bot.advantageAt(target.pos.x, target.pos.y) < 0.7) return false;
      bot.brain.callFocus(target.id, bot.time);
      if (bot.foes.some((enemy) => enemy.id === target.id)) {
        bot.forceFightId = target.id;
        if (bot.combat()) return true;
      }
      bot.travel(target.pos.x, target.pos.y, 2.5);
      bot.label = 'assist-player';
      return true;
    }

    if (!order) return false;
    const distToPlayer = distance(bot.me.pos, player.pos);
    if (distToPlayer > 6.5) {
      bot.travel(player.pos.x, player.pos.y, 2.5);
      bot.label = 'gather-player';
      return true;
    }

    // 集合到位后主动参战或协助清线推塔，避免原地罚站
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
      bot.act.moveTo(player.pos.x, player.pos.y);
      bot.label = 'gather-player';
    } else {
      bot.act.halt();
      bot.label = 'hold-gather';
    }
    return true;
  },
};

export function mountTeamCommands(root: HTMLElement, state: TeamState): void {
  if (root.querySelector('.ts-team-orders')) return;
  const shopBar = root.querySelector('.sf-hud__shopbar');
  if (!shopBar) return;
  const controls = document.createElement('div');
  controls.className = 'ts-team-orders';
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', '队友指令');
  controls.setAttribute('data-hud-hit', '');
  const feedback = document.createElement('span');
  feedback.className = 'ts-team-orders__feedback';
  feedback.setAttribute('role', 'status');
  let feedbackTimer = 0;

  const buttons: HTMLButtonElement[] = [];
  for (const [kind, label, description, notice] of [
    ['gather', '集合', '呼叫附近队友集合', '已呼叫集合'],
    ['attack', '进攻', '呼叫附近队友支援进攻', '已呼叫进攻'],
    ['retreat', '撤退', '呼叫附近队友撤退自保', '已呼叫撤退'],
  ] as const) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.setAttribute('aria-label', description);
    button.dataset.order = kind;
    button.addEventListener('pointerdown', (event) => event.stopPropagation());
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const player = state.heroes.find((hero) => hero.id === state.playerId);
      if (!player?.alive || state.over || root.classList.contains('is-locked') || root.querySelector('.sf-dialog-scrim')) {
        return;
      }
      issueTeamOrder(state, kind);
      (window as { __moba?: { audio?: { ui?: (k: string) => void } } }).__moba?.audio?.ui?.(`order_${kind}`);
      for (const b of buttons) b.classList.toggle('is-active', b === button);
      feedback.textContent = notice;
      window.clearTimeout(feedbackTimer);
      feedbackTimer = window.setTimeout(() => {
        feedback.textContent = '';
        for (const b of buttons) b.classList.remove('is-active');
      }, 2200);
    });
    buttons.push(button);
    controls.append(button);
  }
  controls.append(feedback);
  shopBar.insertBefore(controls, shopBar.querySelector('.sf-hud__quick'));
}
