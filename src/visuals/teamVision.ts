interface Point { x: number; y: number }
interface SightUnit { team: number; alive: boolean; pos: Point; rt: { sight: number }; bushId: number }
interface MapInfo { bound: number }
interface BattleState { sightTick: number; map: MapInfo; units: SightUnit[] }
type BushAt = (map: MapInfo, point: Point) => number;

function inSight(unit: SightUnit, x: number, y: number, bush: number, revealSq: number) {
  const distanceSq = (unit.pos.x - x) ** 2 + (unit.pos.y - y) ** 2;
  return distanceSq <= unit.rt.sight ** 2 && (bush < 0 || unit.bushId === bush || distanceSq <= revealSq);
}

export function hasTeamSight(sources: readonly SightUnit[], x: number, y: number, bush: number, revealSq: number) {
  return sources.some((unit) => inSight(unit, x, y, bush, revealSq));
}

const SIZE = 144;

function makeMask(state: BattleState, bushAt: BushAt) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  const pixels = ctx.createImageData(SIZE, SIZE);
  const bushes = new Int16Array(SIZE * SIZE);
  const bound = state.map.bound;
  const cell = 2 * bound / SIZE;
  const world = (i: number) => (i + 0.5) * cell - bound;
  const grid = (v: number) => Math.max(0, Math.min(SIZE - 1, Math.floor((v + bound) / cell)));
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const i = y * SIZE + x;
    bushes[i] = bushAt(state.map, { x: world(x), y: world(y) });
    pixels.data.set([16, 19, 30, 150], i * 4);
  }
  let lastTick = -Infinity;
  const sources: SightUnit[] = [];
  let nearSq = 0;
  return {
    canvas,
    get version() { return lastTick; },
    update(team: number, revealSq: number) {
      if (state.sightTick === lastTick) return;
      lastTick = state.sightTick;
      nearSq = revealSq;
      sources.length = 0;
      for (let i = 3; i < pixels.data.length; i += 4) pixels.data[i] = 150;
      for (const unit of state.units) {
        if (unit.team !== team || !unit.alive || unit.rt.sight <= 0) continue;
        sources.push(unit);
        const r = unit.rt.sight, pos = unit.pos;
        const x0 = grid(pos.x - r), x1 = grid(pos.x + r);
        const y0 = grid(pos.y - r), y1 = grid(pos.y + r);
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
          const i = y * SIZE + x;
          if (inSight(unit, world(x), world(y), bushes[i], revealSq)) pixels.data[i * 4 + 3] = 0;
        }
      }
      ctx.putImageData(pixels, 0, 0);
    },
    visible(pos: Point) {
      return hasTeamSight(sources, pos.x, pos.y, bushAt(state.map, pos), nearSq);
    },
  };
}

const masks = new WeakMap<BattleState, Map<number, ReturnType<typeof makeMask>>>();

export function teamVision(state: BattleState, team: number, bushAt: BushAt, revealRadius: number) {
  let teams = masks.get(state);
  if (!teams) masks.set(state, teams = new Map());
  let mask = teams.get(team);
  if (!mask) teams.set(team, mask = makeMask(state, bushAt));
  mask.update(team, revealRadius * revealRadius);
  return mask;
}
