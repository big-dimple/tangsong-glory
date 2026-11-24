interface Point { x: number; y: number }
interface Hero {
  id: number;
  team: number;
  alive: boolean;
  pos: Point;
  hp: number;
  stats: { maxHp: number };
  visible: boolean[];
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
  hpR: number;
  foes: Hero[];
  forceFightId: number;
  label: string;
  brain: { callFocus: (id: number, time: number) => void };
  v: {
    state: TeamState;
    enemyHeroes: () => Hero[];
    enemyStructureCovering: (point: Point, margin?: number) => unknown;
    busy: () => boolean;
  };
  act: { halt: () => void };
  advantageAt: (x: number, y: number) => number;
  combat: () => boolean;
  travel: (x: number, y: number, tolerance?: number) => void;
}
type TeamOrder = 'gather' | 'attack';
interface Order { kind: TeamOrder; until: number }

const orders = new WeakMap<TeamState, Order>();
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const ORDER_DURATION = 8;
const HELP_DISTANCE = 34;

export function issueTeamOrder(state: TeamState, kind: TeamOrder): void {
  if (!state.over) orders.set(state, { kind, until: state.time + ORDER_DURATION });
}

function situation(bot: Bot) {
  const { state } = bot.v;
  const player = state.heroes.find((hero) => hero.id === state.playerId);
  if (!player?.alive || player.team !== bot.team || player.id === bot.me.id || bot.hpR < 0.4) return null;
  const order = orders.get(state);
  const activeOrder = order && state.time < order.until ? order : undefined;
  const recentAction = player.animStart !== undefined && state.time - player.animStart < 1.4 &&
    (player.anim === 'attack' || player.anim === 'dash' || player.anim === 'leap' || player.anim?.startsWith('cast_'));
  const engaged = player.inCombat || player.h?.atkOrder || recentAction;
  if (!activeOrder && !engaged) return null;
  if (distance(bot.me.pos, player.pos) > HELP_DISTANCE || bot.v.enemyStructureCovering(player.pos, 1)) return null;

  const attackTarget = player.h?.atkTargetId;
  const preferred = attackTarget !== undefined && attackTarget >= 0 ? attackTarget : player.targetId;
  const enemies = bot.v.enemyHeroes().filter((enemy) =>
    enemy.alive && enemy.visible[bot.team] && distance(enemy.pos, player.pos) <= 12 &&
    !bot.v.enemyStructureCovering(enemy.pos, 0.5),
  );
  enemies.sort((a, b) =>
    (a.id === preferred ? -20 : 0) + distance(a.pos, player.pos) -
    ((b.id === preferred ? -20 : 0) + distance(b.pos, player.pos)),
  );
  const target = (engaged || activeOrder?.kind === 'attack') ? enemies[0] : undefined;
  if (!activeOrder && !target) return null;
  return { player, target, order: activeOrder };
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
      // Do not ask a lone or weakened ally to take a clearly losing fight.
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
    if (distance(bot.me.pos, player.pos) > 5.5) {
      bot.travel(player.pos.x, player.pos.y, 2.5);
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
  for (const [kind, label, description] of [
    ['gather', '集合', '呼叫附近队友集合'],
    ['attack', '进攻', '呼叫附近队友支援进攻'],
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
      if (!player?.alive || state.over || root.classList.contains('is-locked') || root.querySelector('.sf-dialog-scrim')) return;
      issueTeamOrder(state, kind);
      feedback.textContent = kind === 'gather' ? '正在呼叫集合' : '正在呼叫支援';
      window.clearTimeout(feedbackTimer);
      feedbackTimer = window.setTimeout(() => { feedback.textContent = ''; }, 2200);
    });
    controls.append(button);
  }
  controls.append(feedback);
  shopBar.insertBefore(controls, shopBar.querySelector('.sf-hud__quick'));
}
