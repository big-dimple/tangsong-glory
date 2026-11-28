/**
 * tangsongItems.ts — 王者荣耀式多阶装备合成系统（T1 小件 → T2 中件 → T3 神装）
 *
 * 原则：
 * 1. 保留现有 13 件 T3 神装与 4 双鞋的 ID、价格、属性、被动与推荐出装列表（Se[heroId].build）零偏差。
 * 2. 新增 9 件 T1 基础散件与 7 件 T2 过渡中件，全部附带独立唐宋器物 SVG 图标、属性、递归合成表与折价合成算法。
 * 3. 已拥有的下级部件 100% 折抵上级装备售价，且在背包满 6 格时也可原地吃掉已有散件升级成中件/神装。
 */

export interface ItemStatsLike {
  hp?: number;
  mana?: number;
  ad?: number;
  ap?: number;
  apPct?: number;
  armor?: number;
  mr?: number;
  attackSpeedPct?: number;
  moveSpeed?: number;
  cdr?: number;
  lifesteal?: number;
  critChance?: number;
  critDamage?: number;
  armorPen?: number;
  magicPen?: number;
  hpRegen?: number;
  manaRegen?: number;
}

export interface ItemDefLike {
  id: string;
  name: string;
  brief: string;
  category: 'boots' | 'attack' | 'magic' | 'defense';
  tier: 1 | 2 | 3;
  cost: number;
  from?: string[];
  stats: ItemStatsLike;
  passive?: { id: string; name: string; desc: string; value: number; value2?: number };
  color: string;
}

export interface HeroBuildTableLike {
  [heroId: string]: { build: string[] };
}

export const EXTRA_ITEMS: ItemDefLike[] = [
  // ── T1 物理 / 通用散件 ──
  {
    id: 'iron_sword',
    name: '玄铁短匕',
    brief: '便宜好用的基础物理攻击散件',
    category: 'attack',
    tier: 1,
    cost: 250,
    stats: { ad: 20 },
    color: '#d9b578',
  },
  {
    id: 'swift_dagger',
    name: '疾风箭镞',
    brief: '提升攻速的基础散件',
    category: 'attack',
    tier: 1,
    cost: 290,
    stats: { attackSpeedPct: 0.1 },
    color: '#e6c565',
  },
  {
    id: 'crit_gloves',
    name: '搏虎护手',
    brief: '提供暴击率，搏一搏额外伤害',
    category: 'attack',
    tier: 1,
    cost: 320,
    stats: { critChance: 0.08 },
    color: '#cf74e8',
  },
  {
    id: 'blood_fang',
    name: '饮血牙刃',
    brief: '前期对线赖线用的小吸血镰',
    category: 'attack',
    tier: 1,
    cost: 410,
    stats: { ad: 15, lifesteal: 0.08 },
    color: '#e0584f',
  },

  // ── T1 法术散件 ──
  {
    id: 'spell_scroll',
    name: '太学残卷',
    brief: '立竿见影加一点法术伤害',
    category: 'magic',
    tier: 1,
    cost: 300,
    stats: { ap: 40 },
    color: '#6ec4ff',
  },
  {
    id: 'jade_pendant',
    name: '灵泉玉佩',
    brief: '扩充法力上限，释放技能更宽裕',
    category: 'magic',
    tier: 1,
    cost: 220,
    stats: { mana: 200 },
    color: '#66ded4',
  },

  // ── T1 防御散件 ──
  {
    id: 'ruby_stone',
    name: '红玛瑙印',
    brief: '出门最实惠的一截生命值',
    category: 'defense',
    tier: 1,
    cost: 300,
    stats: { hp: 300 },
    color: '#eb6468',
  },
  {
    id: 'cloth_vest',
    name: '熟铜护心',
    brief: '对线抗住物理普攻的基础甲片',
    category: 'defense',
    tier: 1,
    cost: 220,
    stats: { armor: 70 },
    color: '#9db1c4',
  },
  {
    id: 'resist_shawl',
    name: '避尘轻裘',
    brief: '抵御法师消耗的轻便披帛',
    category: 'defense',
    tier: 1,
    cost: 220,
    stats: { mr: 70 },
    color: '#7ed1c2',
  },

  // ── T2 物理过渡中件 ──
  {
    id: 'meteor_blade',
    name: '破阵长剑',
    brief: '高性价比物攻+减冷却过渡装',
    category: 'attack',
    tier: 2,
    cost: 1080,
    from: ['iron_sword', 'iron_sword'],
    stats: { ad: 45, cdr: 0.1 },
    color: '#f2a44c',
  },
  {
    id: 'storm_blade',
    name: '惊鸿双刃',
    brief: '同时补攻速与暴击的过渡锋刃',
    category: 'attack',
    tier: 2,
    cost: 910,
    from: ['swift_dagger', 'crit_gloves'],
    stats: { attackSpeedPct: 0.2, critChance: 0.1 },
    color: '#ffd966',
  },
  {
    id: 'vampiric_edge',
    name: '青血弯刀',
    brief: '中前期清野偷塔续航利器',
    category: 'attack',
    tier: 2,
    cost: 860,
    from: ['iron_sword', 'blood_fang'],
    stats: { ad: 40, lifesteal: 0.12 },
    color: '#e85648',
  },

  // ── T2 法术过渡中件 ──
  {
    id: 'frost_wand',
    name: '冰玉手炉',
    brief: '兼顾血量与法强的中期法师件',
    category: 'magic',
    tier: 2,
    cost: 880,
    from: ['spell_scroll', 'ruby_stone'],
    stats: { ap: 65, hp: 350 },
    color: '#8ae2ff',
  },
  {
    id: 'arcane_tome',
    name: '星宿秘笈',
    brief: '法强、法力与减冷却三合一中件',
    category: 'magic',
    tier: 2,
    cost: 900,
    from: ['spell_scroll', 'jade_pendant'],
    stats: { ap: 85, mana: 200, cdr: 0.05 },
    color: '#73b2ff',
  },

  // ── T2 防御过渡中件 ──
  {
    id: 'iron_buckler',
    name: '玄甲护盾',
    brief: '生命与护甲双修的前排中件',
    category: 'defense',
    tier: 2,
    cost: 820,
    from: ['cloth_vest', 'ruby_stone'],
    stats: { hp: 400, armor: 110 },
    color: '#889fb5',
  },
  {
    id: 'spirit_belt',
    name: '紫貂暖带',
    brief: '抗法术爆发并大幅撑血的披带',
    category: 'defense',
    tier: 2,
    cost: 820,
    from: ['resist_shawl', 'ruby_stone'],
    stats: { hp: 500, mr: 100 },
    color: '#6dd1c2',
  },
];

export const ITEM_RECIPES: Record<string, { tier: 1 | 2 | 3; from?: string[] }> = {
  // 鞋类
  boots: { tier: 1 },
  boots_guard: { tier: 2, from: ['boots'] },
  boots_arcane: { tier: 2, from: ['boots'] },
  boots_fury: { tier: 2, from: ['boots'] },
  // T3 攻击神装
  starfall_blade: { tier: 3, from: ['meteor_blade', 'iron_sword'] },
  sunchaser_bow: { tier: 3, from: ['storm_blade', 'swift_dagger'] },
  blood_scythe: { tier: 3, from: ['vampiric_edge', 'iron_sword'] },
  piercing_spear: { tier: 3, from: ['meteor_blade', 'iron_sword'] },
  phantom_edge: { tier: 3, from: ['storm_blade', 'iron_sword', 'crit_gloves'] },
  // T3 法术神装
  astral_staff: { tier: 3, from: ['arcane_tome', 'spell_scroll'] },
  void_crown: { tier: 3, from: ['arcane_tome', 'spell_scroll'] },
  winter_scepter: { tier: 3, from: ['frost_wand', 'spell_scroll'] },
  sage_codex: { tier: 3, from: ['arcane_tome', 'spell_scroll', 'spell_scroll'] },
  // T3 防御神装
  guardian_plate: { tier: 3, from: ['iron_buckler', 'cloth_vest'] },
  starweave_cloak: { tier: 3, from: ['spirit_belt', 'resist_shawl'] },
  undying_heart: { tier: 3, from: ['spirit_belt', 'ruby_stone', 'ruby_stone'] },
  thorn_mail: { tier: 3, from: ['iron_buckler', 'cloth_vest'] },
};

function wrapIcon(accent: string, body: string): string {
  return (
    `<svg viewBox="0 0 64 64" width="64" height="64" xmlns="http://www.w3.org/2000/svg">` +
    `<defs><radialGradient id="g" cx="50%" cy="35%" r="65%"><stop offset="0%" stop-color="${accent}" stop-opacity="0.34"/><stop offset="100%" stop-color="#17100c" stop-opacity="0.96"/></radialGradient></defs>` +
    `<rect x="3" y="3" width="58" height="58" rx="11" fill="url(#g)" stroke="${accent}" stroke-opacity="0.72" stroke-width="2.2"/>` +
    `<rect x="7" y="7" width="50" height="50" rx="8" fill="none" stroke="#f7e2b2" stroke-opacity="0.16" stroke-width="1"/>` +
    body +
    `</svg>`
  );
}

export const EXTRA_ITEM_ICONS: Record<string, (c: string) => string> = {
  iron_sword: (c) =>
    wrapIcon(
      c,
      `<path d="M46 16L24 38l4 4 22-22 2-6-6 2z" fill="#f7ebd2" stroke="${c}" stroke-width="2"/><path d="M19 36l9 9M15 47l7-7" stroke="#e9bd62" stroke-width="3.2" stroke-linecap="round"/>`,
    ),
  swift_dagger: (c) =>
    wrapIcon(
      c,
      `<path d="M48 16L18 32l12 4 4 12L48 16z" fill="${c}" stroke="#fff4d6" stroke-width="1.8" stroke-linejoin="round"/><path d="M16 48l11-11" stroke="#e9bd62" stroke-width="2.6" stroke-linecap="round"/>`,
    ),
  crit_gloves: (c) =>
    wrapIcon(
      c,
      `<path d="M22 46V28c0-3 2-5 5-5h10c3 0 5 2 5 5v18H22z" fill="#3b2638" stroke="${c}" stroke-width="2.2"/><path d="M25 23v-5m5 5v-6m5 6v-5m5 5v-3" stroke="#ffe599" stroke-width="2.8" stroke-linecap="round"/><path d="M24 39h16" stroke="#e9bd62" stroke-width="2.5"/>`,
    ),
  blood_fang: (c) =>
    wrapIcon(
      c,
      `<path d="M46 16c-6 14-14 22-28 28 12-2 22-10 28-28z" fill="${c}" stroke="#ffd7cf" stroke-width="1.8"/><path d="M17 45l7-7" stroke="#e9bd62" stroke-width="3" stroke-linecap="round"/>`,
    ),
  spell_scroll: (c) =>
    wrapIcon(
      c,
      `<rect x="18" y="16" width="28" height="32" rx="4" fill="#f5ead4" stroke="${c}" stroke-width="2"/><path d="M24 25h16M24 32h16M24 39h10" stroke="#2c4a63" stroke-width="2.5" stroke-linecap="round"/><circle cx="18" cy="18" r="3" fill="#e9bd62"/><circle cx="46" cy="46" r="3" fill="#e9bd62"/>`,
    ),
  jade_pendant: (c) =>
    wrapIcon(
      c,
      `<circle cx="32" cy="34" r="14" fill="none" stroke="${c}" stroke-width="6"/><circle cx="32" cy="34" r="14" fill="none" stroke="#e6fff9" stroke-opacity="0.65" stroke-width="1.5"/><path d="M32 13v7" stroke="#e9bd62" stroke-width="3" stroke-linecap="round"/>`,
    ),
  ruby_stone: (c) =>
    wrapIcon(
      c,
      `<polygon points="32,14 48,26 42,48 22,48 16,26" fill="${c}" stroke="#ffe0db" stroke-width="2"/><polygon points="32,20 40,28 36,42 28,42 24,28" fill="#ffb3b0" fill-opacity="0.45"/>`,
    ),
  cloth_vest: (c) =>
    wrapIcon(
      c,
      `<path d="M22 17l10 5 10-5 7 9-5 6v16H20V32l-5-6 7-9z" fill="#3a4552" stroke="${c}" stroke-width="2.2" stroke-linejoin="round"/><path d="M32 22v26M23 33h18" stroke="#e9bd62" stroke-width="2"/>`,
    ),
  resist_shawl: (c) =>
    wrapIcon(
      c,
      `<path d="M16 36c6-14 26-16 34-6-6 12-20 18-34 6z" fill="${c}" fill-opacity="0.82" stroke="#e6fff9" stroke-width="2"/><path d="M22 28c6 3 14 2 22-4" stroke="#ffe5a3" stroke-width="2.2" stroke-linecap="round"/>`,
    ),
  meteor_blade: (c) =>
    wrapIcon(
      c,
      `<path d="M49 14L23 40l4 4L51 18l-2-4z" fill="#fff3d6" stroke="${c}" stroke-width="2.2"/><path d="M17 35l12 12M14 50l8-8" stroke="#e9bd62" stroke-width="3.6" stroke-linecap="round"/><circle cx="44" cy="20" r="4" fill="#ffb84d"/>`,
    ),
  storm_blade: (c) =>
    wrapIcon(
      c,
      `<path d="M46 15L20 41M18 15l26 26" stroke="#fff4c4" stroke-width="3.4" stroke-linecap="round"/><path d="M46 15L35 18M18 15l11 3" stroke="${c}" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="29" r="4.5" fill="${c}"/>`,
    ),
  vampiric_edge: (c) =>
    wrapIcon(
      c,
      `<path d="M48 15C44 30 33 41 18 45c9-8 17-18 22-32l8 2z" fill="${c}" stroke="#ffe0db" stroke-width="2"/><path d="M15 49l9-9M20 36l8 8" stroke="#e9bd62" stroke-width="3.2" stroke-linecap="round"/>`,
    ),
  frost_wand: (c) =>
    wrapIcon(
      c,
      `<path d="M20 48l18-18" stroke="#c99f58" stroke-width="3.6" stroke-linecap="round"/><polygon points="43,14 50,21 43,28 36,21" fill="${c}" stroke="#ffffff" stroke-width="1.8"/><circle cx="43" cy="21" r="3" fill="#fff"/>`,
    ),
  arcane_tome: (c) =>
    wrapIcon(
      c,
      `<path d="M16 18h14c2 0 2 2 2 2v26s0-2-2-2H16V18zm32 0H34c-2 0-2 2-2 2v26s0-2 2-2h14V18z" fill="#233c59" stroke="${c}" stroke-width="2.2"/><circle cx="32" cy="30" r="6" fill="none" stroke="#ffd878" stroke-width="2"/>`,
    ),
  iron_buckler: (c) =>
    wrapIcon(
      c,
      `<path d="M32 14l16 7v12c0 10-7 16-16 19-9-3-16-9-16-19V21l16-7z" fill="#2f3f4f" stroke="${c}" stroke-width="2.4"/><path d="M32 19v27M21 29h22" stroke="#e9bd62" stroke-width="2.4"/>`,
    ),
  spirit_belt: (c) =>
    wrapIcon(
      c,
      `<ellipse cx="32" cy="34" rx="18" ry="11" fill="none" stroke="${c}" stroke-width="6"/><rect x="26" y="38" width="12" height="9" rx="2" fill="#e9bd62" stroke="#3a2012" stroke-width="1.6"/>`,
    ),
};

export interface SynthesisResolution {
  consumedIndices: number[];
  discount: number;
  netCost: number;
  fits: boolean;
  replacesLabel: string | null;
}

const BOOT_UPGRADES = ['boots_guard', 'boots_arcane', 'boots_fury'];

function cloneAvailable(items: (string | null)[]): (string | null)[] {
  return [...items];
}

/**
 * 递归计算购买 targetId 时可被吃掉并全额抵扣的下级装备槽位。
 * 优先匹配直接子件（即先消耗更高级中件，避免多吃多余散件）。
 */
export function resolveSynthesis(
  items: (string | null)[],
  targetId: string,
  catalog: Record<string, ItemDefLike>,
): SynthesisResolution {
  const def = catalog[targetId];
  if (!def) {
    return { consumedIndices: [], discount: 0, netCost: 0, fits: false, replacesLabel: null };
  }

  // 鞋子特殊规则：每人最多穿 1 双鞋；进阶鞋可替换背包里任意已有鞋子（或基础草鞋）并抵扣
  if (def.category === 'boots') {
    const bootIdx = items.findIndex((id) => id && catalog[id]?.category === 'boots');
    if (bootIdx >= 0) {
      const ownedBootId = items[bootIdx]!;
      const ownedBoot = catalog[ownedBootId];
      if (ownedBootId === targetId || def.tier === 1) {
        return { consumedIndices: [], discount: 0, netCost: def.cost, fits: false, replacesLabel: null };
      }
      const discount = Math.floor((ownedBoot?.cost ?? 0) * 0.6);
      const netCost = Math.max(0, def.cost - discount);
      return {
        consumedIndices: [bootIdx],
        discount,
        netCost,
        fits: true,
        replacesLabel: ownedBoot?.name ?? null,
      };
    }
    return {
      consumedIndices: [],
      discount: 0,
      netCost: def.cost,
      fits: items.indexOf(null) >= 0,
      replacesLabel: null,
    };
  }

  const avail = cloneAvailable(items);
  const consumed: number[] = [];
  let discount = 0;

  const consumeRecursive = (needId: string) => {
    const directIdx = avail.findIndex((x) => x === needId);
    if (directIdx >= 0) {
      avail[directIdx] = null;
      consumed.push(directIdx);
      discount += catalog[needId]?.cost ?? 0;
      return;
    }
    const needDef = catalog[needId];
    if (!needDef?.from?.length) return;
    for (const childId of needDef.from) {
      consumeRecursive(childId);
    }
  };

  if (def.from?.length) {
    for (const childId of def.from) {
      consumeRecursive(childId);
    }
  }

  const netCost = Math.max(0, def.cost - discount);
  const hasEmpty = items.indexOf(null) >= 0;
  const fits = consumed.length > 0 || hasEmpty;
  return {
    consumedIndices: consumed,
    discount,
    netCost,
    fits,
    replacesLabel:
      consumed.length > 0 ? consumed.map((idx) => catalog[items[idx]!]?.name ?? '').filter(Boolean).join('+') : null,
  };
}

/** 从一棵配方树中找出最适合当下优先购入的一件（先中/大件实惠直买，买不起就拆解为下一颗未拥小件/中件）。 */
function pickComponentToBuy(
  avail: (string | null)[],
  targetId: string,
  gold: number,
  catalog: Record<string, ItemDefLike>,
): { id: string; cost: number; fits: boolean } | null {
  const idx = avail.findIndex((x) => x === targetId);
  if (idx >= 0) {
    avail[idx] = null;
    return null;
  }
  const syn = resolveSynthesis(avail, targetId, catalog);
  if (syn.fits && gold >= syn.netCost) {
    return { id: targetId, cost: syn.netCost, fits: true };
  }
  const def = catalog[targetId];
  if (def?.from?.length) {
    // 拷贝一份供探测子节点时顺次扣除已占有部位
    const probe = cloneAvailable(avail);
    let firstMissing: { id: string; cost: number; fits: boolean } | null = null;
    for (const childId of def.from) {
      const childPick = pickComponentToBuy(probe, childId, gold, catalog);
      if (childPick && childPick.fits) {
        if (!firstMissing) firstMissing = childPick;
        if (gold >= childPick.cost) return childPick;
      }
    }
    if (firstMissing) return firstMissing;
  }
  return { id: targetId, cost: syn.netCost, fits: syn.fits };
}

export function findNextBuyItem(
  unit: { heroId: string; items: (string | null)[]; gold: number },
  builds: HeroBuildTableLike,
  catalog: Record<string, ItemDefLike>,
): string | null {
  const build = builds[unit.heroId]?.build ?? [];
  const items = unit.items;
  const avail = cloneAvailable(items);

  for (const targetId of build) {
    const def = catalog[targetId];
    if (!def) continue;

    if (def.category === 'boots') {
      const bootId = items.find((id) => id && catalog[id]?.category === 'boots') ?? null;
      if (bootId) {
        const bootDef = catalog[bootId];
        if (bootDef && (bootDef.tier >= 2 || def.tier === 1)) continue;
      }
      const syn = resolveSynthesis(items, targetId, catalog);
      if (syn.fits) return targetId;
      continue;
    }

    const ownedIdx = avail.findIndex((x) => x === targetId);
    if (ownedIdx >= 0) {
      avail[ownedIdx] = null;
      continue;
    }

    const picked = pickComponentToBuy(avail, targetId, unit.gold, catalog);
    if (picked && picked.fits) return picked.id;
    return targetId;
  }
  return null;
}

export interface RecommendCardEntry {
  finalId: string;
  baseId: string | null;
  stage: 'todo' | 'base' | 'done';
  buyId: string | null;
  cost: number;
  next: boolean;
  order: number;
  ownedParts: number;
  totalParts: number;
}

function countOwnedParts(avail: (string | null)[], itemId: string, catalog: Record<string, ItemDefLike>): { owned: number; total: number } {
  const direct = avail.findIndex((x) => x === itemId);
  if (direct >= 0) {
    avail[direct] = null;
    return { owned: 1, total: 1 };
  }
  const def = catalog[itemId];
  if (!def?.from?.length) return { owned: 0, total: 1 };
  let owned = 0;
  let total = 0;
  for (const c of def.from) {
    const r = countOwnedParts(avail, c, catalog);
    owned += r.owned;
    total += r.total;
  }
  return { owned, total };
}

export function computeRecommendCards(
  unit: { heroId: string; items: (string | null)[]; gold: number },
  builds: HeroBuildTableLike,
  catalog: Record<string, ItemDefLike>,
): RecommendCardEntry[] {
  const build = builds[unit.heroId]?.build ?? [];
  const items = unit.items;
  const nextId = findNextBuyItem(unit, builds, catalog);
  const out: RecommendCardEntry[] = [];

  let bootT1: string | null = null;
  let bootT2: string | null = null;
  for (const id of build) {
    const d = catalog[id];
    if (d?.category === 'boots') {
      if (d.tier === 1) bootT1 = bootT1 ?? id;
      else bootT2 = id;
    }
  }
  const ownedBoot = items.find((id) => id && catalog[id]?.category === 'boots') ?? null;
  if (bootT1 || bootT2) {
    const finalId = bootT2 ?? bootT1!;
    const hasUpgrade = bootT2 !== null;
    const stage: 'todo' | 'base' | 'done' =
      ownedBoot && ((catalog[ownedBoot]?.tier ?? 1) >= 2 || !hasUpgrade)
        ? 'done'
        : ownedBoot
          ? 'base'
          : 'todo';
    const buyId = stage === 'done' ? null : stage === 'base' ? finalId : (bootT1 ?? finalId);
    const syn = buyId ? resolveSynthesis(items, buyId, catalog) : null;
    out.push({
      finalId,
      baseId: hasUpgrade ? bootT1 : null,
      stage,
      buyId,
      cost: syn?.netCost ?? 0,
      next: false,
      order: 1,
      ownedParts: stage === 'done' ? 2 : stage === 'base' ? 1 : 0,
      totalParts: hasUpgrade ? 2 : 1,
    });
  }

  const avail = cloneAvailable(items);
  for (const id of build) {
    const d = catalog[id];
    if (!d || d.category === 'boots') continue;
    const exactIdx = avail.findIndex((x) => x === id);
    if (exactIdx >= 0) {
      avail[exactIdx] = null;
      out.push({
        finalId: id,
        baseId: null,
        stage: 'done',
        buyId: null,
        cost: 0,
        next: false,
        order: out.length + 1,
        ownedParts: 2,
        totalParts: 2,
      });
      continue;
    }
    const probe = cloneAvailable(avail);
    const parts = countOwnedParts(probe, id, catalog);
    const syn = resolveSynthesis(avail, id, catalog);
    out.push({
      finalId: id,
      baseId: null,
      stage: parts.owned > 0 ? 'base' : 'todo',
      buyId: id,
      cost: syn.netCost,
      next: false,
      order: out.length + 1,
      ownedParts: parts.owned,
      totalParts: Math.max(1, parts.total),
    });
  }

  if (nextId) {
    const directCard = out.find((c) => c.buyId === nextId);
    if (directCard) {
      directCard.next = true;
    } else {
      // 下一件购买的是某个神装的T1/T2散件，把对应神装卡标记为下一件并提示优先散件
      const ownerCard = out.find((c) => c.stage !== 'done' && isRecursiveChild(c.finalId, nextId, catalog));
      if (ownerCard) {
        ownerCard.next = true;
        ownerCard.buyId = nextId;
        ownerCard.cost = resolveSynthesis(items, nextId, catalog).netCost;
      }
    }
  }
  return out;
}

function isRecursiveChild(parentId: string, childId: string, catalog: Record<string, ItemDefLike>): boolean {
  if (parentId === childId) return true;
  const p = catalog[parentId];
  if (!p?.from?.length) return false;
  return p.from.some((sub) => isRecursiveChild(sub, childId, catalog));
}

export function isRecommendedOrPart(
  heroId: string,
  itemId: string,
  builds: HeroBuildTableLike,
  catalog: Record<string, ItemDefLike>,
): boolean {
  const build = builds[heroId]?.build ?? [];
  if (build.includes(itemId)) return true;
  return build.some((targetId) => isRecursiveChild(targetId, itemId, catalog));
}

export function initTangSongItems(
  ln: Record<string, ItemDefLike>,
  tH: Record<string, (c: string) => string>,
  IB: ItemDefLike[],
): void {
  for (const item of EXTRA_ITEMS) {
    ln[item.id] = { ...item };
    if (EXTRA_ITEM_ICONS[item.id]) {
      tH[item.id] = EXTRA_ITEM_ICONS[item.id];
    }
  }
  for (const [id, meta] of Object.entries(ITEM_RECIPES)) {
    if (ln[id]) {
      ln[id].tier = meta.tier;
      if (meta.from) ln[id].from = [...meta.from];
    }
  }
  IB.splice(0, IB.length, ...Object.values(ln));
}

export function getUpgradesFor(itemId: string, catalog: Record<string, ItemDefLike>): string[] {
  return Object.values(catalog)
    .filter((d) => Array.isArray(d.from) && d.from.includes(itemId))
    .map((d) => d.id);
}

/** 构建商店详情区的互动合成路径树（支持点击直跳任意下级散件或上级神装）。 */
export function buildRecipeTreeEl(
  itemId: string,
  unit: { items: (string | null)[] },
  catalog: Record<string, ItemDefLike>,
  renderIconSvg: (id: string) => string,
  onSelect: (id: string) => void,
): HTMLElement | null {
  const def = catalog[itemId];
  if (!def) return null;
  const hasFrom = Array.isArray(def.from) && def.from.length > 0;
  const upgrades = getUpgradesFor(itemId, catalog);
  if (!hasFrom && upgrades.length === 0) return null;

  const wrap = document.createElement('div');
  wrap.className = 'ts-recipe-tree';

  if (hasFrom && def.from) {
    const title = document.createElement('div');
    title.className = 'ts-recipe-title';
    const syn = resolveSynthesis(unit.items, itemId, catalog);
    title.textContent =
      syn.discount > 0 ? `合成路线（已有散件抵扣 ${syn.discount} 金）` : '合成路线（买齐可原地升级）';
    wrap.appendChild(title);

    const avail = cloneAvailable(unit.items);
    const row = document.createElement('div');
    row.className = 'ts-recipe-row';

    def.from.forEach((childId, idx) => {
      if (idx > 0) {
        const plus = document.createElement('span');
        plus.className = 'ts-recipe-op';
        plus.textContent = '+';
        row.appendChild(plus);
      }
      const cDef = catalog[childId];
      if (!cDef) return;
      const ownedIdx = avail.findIndex((x) => x === childId);
      const isOwned = ownedIdx >= 0;
      if (isOwned) avail[ownedIdx] = null;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `ts-recipe-node${isOwned ? ' is-owned' : ''}`;
      btn.dataset.sfSnd = 'select';
      btn.title = `查看 ${cDef.name}`;
      btn.addEventListener('click', () => onSelect(childId));

      const ico = document.createElement('span');
      ico.className = 'ts-recipe-ico';
      ico.innerHTML = renderIconSvg(childId);

      const meta = document.createElement('span');
      meta.className = 'ts-recipe-meta';
      const nm = document.createElement('span');
      nm.className = 'ts-recipe-name';
      nm.textContent = cDef.name;
      const pr = document.createElement('span');
      pr.className = 'ts-recipe-sub';
      const childNet = isOwned ? 0 : resolveSynthesis(unit.items, childId, catalog).netCost;
      pr.textContent = isOwned ? '✓ 已拥有' : `${childNet}金`;
      meta.append(nm, pr);

      btn.append(ico, meta);
      row.appendChild(btn);
    });

    wrap.appendChild(row);
  }

  if (upgrades.length > 0) {
    const upTitle = document.createElement('div');
    upTitle.className = 'ts-recipe-title';
    upTitle.textContent = '可合成上级装备';
    wrap.appendChild(upTitle);

    const upRow = document.createElement('div');
    upRow.className = 'ts-recipe-builds';
    for (const upId of upgrades) {
      const uDef = catalog[upId];
      if (!uDef) continue;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ts-recipe-node is-up';
      btn.dataset.sfSnd = 'select';
      btn.addEventListener('click', () => onSelect(upId));

      const ico = document.createElement('span');
      ico.className = 'ts-recipe-ico';
      ico.innerHTML = renderIconSvg(upId);

      const meta = document.createElement('span');
      meta.className = 'ts-recipe-meta';
      const nm = document.createElement('span');
      nm.className = 'ts-recipe-name';
      nm.textContent = uDef.name;
      const syn = resolveSynthesis(unit.items, upId, catalog);
      const pr = document.createElement('span');
      pr.className = 'ts-recipe-sub';
      pr.textContent = syn.discount > 0 ? `实付 ${syn.netCost}金` : `${uDef.cost}金`;
      meta.append(nm, pr);

      btn.append(ico, meta);
      upRow.appendChild(btn);
    }
    wrap.appendChild(upRow);
  }

  return wrap;
}

export const TANGSONG_ITEMS_API = {
  BOOT_UPGRADES,
  init: initTangSongItems,
  resolveSynthesis,
  findNextBuyItem,
  computeRecommendCards,
  isRecommendedOrPart,
  renderRecipeTree: buildRecipeTreeEl,
};
