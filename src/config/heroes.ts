export const HERO_ORDER = [
  'qinqiong',
  'xinqiji',
  'sushi',
  'wencheng',
  'huarui',
  'liue',
] as const;

export type HeroId = (typeof HERO_ORDER)[number];
export type KitId = 'panyue' | 'chijin' | 'xingli' | 'fengling' | 'yeque';
export type AssetId = 'touye' | 'laohuan' | 'amo' | 'azao' | 'xiemu' | 'erxiang';

export interface SkillTextOverride {
  name: string;
  brief: string;
  desc: string;
}

export interface HeroUiPalette {
  primary: string;
  secondary: string;
  accent: string;
  glow: string;
}

export interface HeroVfxPalette {
  glow: number;
  hot: number;
  deep: number;
  accent: number;
  dark: number;
}

export interface HeroAssetPaths {
  avatar: string;
  focus: string;
  portrait: string;
  selection: string;
  pc: string;
  eyes: string;
}

export interface HeroOverrideConfig {
  id: HeroId;
  kitId: KitId;
  assetId: AssetId;
  name: string;
  title: string;
  era: string;
  motto: string;
  lore: string;
  tips: string;
  look: string;
  palette: HeroUiPalette;
  vfxPalette: HeroVfxPalette;
  costumePalette: Record<string, number>;
  passive: SkillTextOverride;
  skills: {
    s1: SkillTextOverride;
    s2: SkillTextOverride;
    ult: SkillTextOverride;
  };
  assets: HeroAssetPaths;
}

function makeAssets(heroId: HeroId, assetId: AssetId): HeroAssetPaths {
  return {
    avatar: `/assets/heroes/portraits/${assetId}.avatar.webp`,
    focus: `/assets/heroes/portraits/${assetId}.focus.webp`,
    portrait: `/assets/heroes/portraits/${assetId}.portrait.webp`,
    selection: `/assets/heroes/portraits/${assetId}.selection.webp`,
    pc: `/assets/heroes/pc/${assetId}.pc.webp`,
    eyes: `/assets/heroes/eyes/${heroId}.eyes.webp`,
  };
}

export const HEROES: Record<HeroId, HeroOverrideConfig> = {
  qinqiong: {
    id: 'qinqiong',
    kitId: 'panyue',
    assetId: 'touye',
    name: '秦琼',
    title: '踏破山河',
    era: '隋末唐初',
    motto: '跃马冲阵，我先上！',
    lore: '秦琼字叔宝，隋末唐初名将。《旧唐书》载其多次跃马冲入敌阵、先登破敌；演武场上披玄甲持重盾，为全队劈开前阵。',
    tips: '你是队伍的门板：用「跃马冲阵」撞进去把人顶飞。被集火就开「双锏护身」，有护盾还能减速身边的人。大招跳进人堆砸地开团，别忘了每第三下普攻自带减速。',
    look: '威猛豪迈的初唐玄甲猛将：高马尾鎏金束发冠，玄铁密排札甲配吞口鎏金狮头护肩与护心，血红破损大披风衬水墨白黑灯笼战裤，双手执带刺玄铁流星大锤。',
    palette: {
      primary: '#9a7a38',
      secondary: '#343a46',
      accent: '#e4b856',
      glow: '#f3cf85',
    },
    vfxPalette: {
      glow: 0xf0be4a,
      hot: 0xfff0b8,
      deep: 0x8c5212,
      accent: 0xd94828,
      dark: 0x261810,
    },
    costumePalette: {
      ironLight: 0x525a68,
      ironDark: 0x22262e,
      bronze: 0xdead48,
      bronzeDark: 0x8a5f1c,
      lacquer: 0x1a1e26,
      lacquerHi: 0x3b4252,
      red: 0xb3201b,
      redDark: 0x6b1210,
      cloth: 0x2e323c,
      clothDark: 0x24272f,
      clothLight: 0xded9cf,
      skirt: 0x2b2e38,
      skirtDark: 0x1b1e25,
      steel: 0xdde4ed,
      steelDark: 0x626b7a,
      skin: 0xdca580,
      hair: 0x1c191a,
      hairHi: 0x3d3638,
      leather: 0x453124,
      leatherDark: 0x261a14,
      amber: 0xffe08a,
    },
    passive: {
      name: '玄甲镇岳',
      brief: '每第三下普攻更疼，还带减速',
      desc: '每第三次普攻改用重盾震地，对目标额外造成自身 4% 最大生命的法术伤害并减速 30%，持续 1 秒。',
    },
    skills: {
      s1: {
        name: '跃马冲阵',
        brief: '举盾冲过去，撞到人就击飞',
        desc: '侧起玄甲大盾向指定方向冲撞，撞到第一个敌方英雄或冲到终点时震开周围，造成 {damage}(+{adRatio%}物攻) 点物理伤害并击飞 {knockup} 秒。',
      },
      s2: {
        name: '双锏护身',
        brief: '给自己加护盾，减速身边敌人',
        desc: '立定护持，获得 {shield}(+{hpRatio%}最大生命) 点护盾，持续 {duration} 秒；同时震慑周围敌人，造成 {damage} 点法术伤害并减速 {slow%}，持续 {slowDur} 秒。',
      },
      ult: {
        name: '破阵坠岳',
        brief: '跳进人堆砸地，击飞一大片',
        desc: '提气纵跃，连人带甲砸向目标区域，落地造成 {damage}(+{hpRatio%}最大生命) 点物理伤害并击飞 {knockup} 秒，随后留下持续 {zoneDur} 秒的震裂地面，使其中敌人减速 {slow%}。跃起期间免疫控制。',
      },
    },
    assets: makeAssets('qinqiong', 'touye'),
  },

  xinqiji: {
    id: 'xinqiji',
    kitId: 'yeque',
    assetId: 'laohuan',
    name: '辛弃疾',
    title: '单刀破敌营',
    era: '南宋',
    motto: '壮岁旌旗拥万夫，单骑破营！',
    lore: '南宋词人兼抗金猛将，二十余岁曾率五十骑直闯五万金营生擒叛贼，壮志凌云。演武中化身赤甲铁骑刺客，单刀破阵、伺机绝杀。',
    tips: '先在野区刷野发育，再用「单骑直入」切入各路抓残血。敌人血量低于四成时你斩杀极快，拿到击杀或助攻立刻刷新一、二技能连追下一个。切忌先手硬闯人堆，等队友开团后再开大「五十骑破营」收割脆皮。',
    look: '冷峻凌厉的南宋少年词将：高丸子发髻系飘扬暗红发带、披散乌黑长发，朱红挽袖短袍配玄铁山文护胸甲与月白灯笼武裤，腰悬红黑破损战摆，手执修长唐宋横刀。',
    palette: {
      primary: '#b83226',
      secondary: '#262328',
      accent: '#e5a443',
      glow: '#ff7034',
    },
    vfxPalette: {
      glow: 0xff7034,
      hot: 0xffd088,
      deep: 0xa82418,
      accent: 0xf2a640,
      dark: 0x241312,
    },
    costumePalette: {
      suit: 0x2b2f3a,
      suitHi: 0x4c5262,
      suitDark: 0x191b22,
      sash: 0xa62520,
      sashDark: 0x5c1312,
      scarf: 0xb82b24,
      scarfShade: 0x6e1614,
      ink: 0x1b1517,
      leather: 0x3b2820,
      leatherLight: 0x634536,
      bronze: 0xdca040,
      bronzeDark: 0x8a5d1c,
      steel: 0xdde5f0,
      steelDark: 0x6f7a8c,
      edge: 0xffd782,
      plain: 0xcbd2de,
      skin: 0xe6b694,
      hair: 0x1a181c,
      hairHi: 0x3f3a44,
      tube: 0x5c221b,
      tubeDark: 0x33110d,
      silk: 0xe8e2d5,
      silkShade: 0xb8b0a0,
    },
    passive: {
      name: '一骑当千',
      brief: '斩杀残血更疼，得手刷新技能',
      desc: '单刀直入势不可挡：对生命值低于 40% 的敌人造成的伤害提高 18%。参与击杀英雄后，立即刷新一、二技能冷却并回复 8% 最大生命。对野怪造成的伤害提高 25%。',
    },
    skills: {
      s1: {
        name: '单骑直入',
        brief: '长驱穿刺敌人，命中英雄快转好',
        desc: '提刀疾刺穿过前方敌阵，对路径上所有敌人造成 {damage}(+{adRatio%}物攻) 点物理伤害。若命中敌方英雄，此招冷却立即返还 {refund%}。',
      },
      s2: {
        name: '挑灯飞刃',
        brief: '扇形掷出三柄军刺，命中减速',
        desc: '抬腕扇形掷出 3 枚破阵短刃，每枚对命中的第一个敌人造成 {damage}(+{adRatio%}物攻) 点物理伤害并减速 {slow%}，持续 {slowDur} 秒(同一目标被多枚命中时，后续短刃只造成 50% 伤害)。',
      },
      ult: {
        name: '五十骑破营',
        brief: '展开破阵图直取敌首，斩杀重创',
        desc: '展开南宋破阵军令隐踪欺近目标(期间不可被选中)，现身时一刀贯斩：造成 {damage}(+{adRatio%}物攻) 外加目标 {missingRatio%} 已损生命的物理伤害。',
      },
    },
    assets: makeAssets('xinqiji', 'laohuan'),
  },

  sushi: {
    id: 'sushi',
    kitId: 'xingli',
    assetId: 'amo',
    name: '苏轼',
    title: '风起赤壁',
    era: '北宋',
    motto: '余音袅袅，不绝如缕。',
    lore: '北宋文学家、书画家；1082 年黄州时期写就《前赤壁赋》，舟中扣舷而歌。此局中挥袖抚弦、引大江清音破阵，步法从容。',
    tips: '技能每打中一次留下一层「余音」，同一个人叠满三层就会眩晕。先放「回澜聚浪」把人圈住拉回来，再把大招盖上去。你很脆，站在队友身后弹奏，别让人近身。',
    look: '清逸潇洒的北宋风流文豪：束发高髻系青墨飘带，水墨竹叶暗金玄青大广袖外罩月白百褶长袍，腰悬醉翁双节酒葫芦，右手执狼毫大毛笔、左手抱竹简诗卷。',
    palette: {
      primary: '#2d7276',
      secondary: '#eef3ee',
      accent: '#79d0c2',
      glow: '#9fece0',
    },
    vfxPalette: {
      glow: 0x3b8a84,
      hot: 0xfff1c4,
      deep: 0x132426,
      accent: 0xe6bc58,
      dark: 0x0c1214,
    },
    costumePalette: {
      cloak: 0x2c3b4a,
      cloakDark: 0x1a222b,
      cloakLight: 0x4f6478,
      fur: 0xf3f1ea,
      furShade: 0xc8ccd0,
      robe: 0xf3f1ea,
      robeShade: 0xc8ccd0,
      hem: 0x7a8f9e,
      trim: 0x1e2833,
      trimDark: 0x11171f,
      skin: 0xecc09c,
      hair: 0x1a1a20,
      hairHi: 0x3c3e4a,
      gold: 0xd4b678,
      goldDark: 0x8f7440,
      lip: 0xb8705e,
      wood: 0xc49f68,
      woodShade: 0x9c7648,
      woodDark: 0x7d5c34,
      woodDeep: 0x4f381e,
      string: 0xfef5d4,
    },
    passive: {
      name: '余音袅袅',
      brief: '技能打中同一人三次就眩晕',
      desc: '技能命中敌人会留下一层余音(持续 5 秒)。叠满 3 层时清音共振：造成目标 6% 最大生命的法术伤害(对非英雄上限 300)并眩晕 0.75 秒。',
    },
    skills: {
      s1: {
        name: '大江东去',
        brief: '弹出一道音波，穿透一整条线',
        desc: '拨弦挥袖，弹出一道穿透江风的清音，对沿途所有敌人造成 {damage}(+{apRatio%}法强) 点法术伤害。',
      },
      s2: {
        name: '回澜聚浪',
        brief: '圈住一片，稍后把人拉到中间',
        desc: '在目标位置拨出一圈回旋水澜，{delay} 秒后收束：造成 {damage}(+{apRatio%}法强) 点法术伤害，将敌人拉向中心并减速 {slow%}，持续 {slowDur} 秒。',
      },
      ult: {
        name: '赤壁惊涛',
        brief: '波涛一波波俯冲，覆盖一大片',
        desc: '一曲引得惊涛坠落目标区域：{duration} 秒内连涌 {waves} 波音浪，每波对区域内敌人造成 {damage}(+{apRatio%}法强) 点法术伤害并减速 {slow%}。每波都会附加一层余音。',
      },
    },
    assets: makeAssets('sushi', 'amo'),
  },

  wencheng: {
    id: 'wencheng',
    kitId: 'fengling',
    assetId: 'azao',
    name: '文成公主',
    title: '藏地迎宾',
    era: '唐',
    motto: '远赴吐蕃，结两地之好。',
    lore: '唐宗室公主，公元 641 年远赴吐蕃与松赞干布成婚，成唐蕃交往史上熟识的身影。演武中张弦连发，步履轻灵沉稳。',
    tips: '站住了不停连射，越射越快，叠满五层还会加移速和伤害。被近身就用「轻袖腾云」翻开，落地后的下一箭必定暴击。大招箭雨能减速一大片，开团、断后都好用。',
    look: '温婉华贵的盛唐和亲公主：高云盘发戴鎏金红宝凤冠与绿松石耳坠，象牙米白织金团花大广袖长裙滚宽厚朱红宝相花锦边，玄黑鎏金腰封配满身飘逸朱红金穗飞天丝带，执象牙朱金凤弓。',
    palette: {
      primary: '#1e5078',
      secondary: '#eee7d6',
      accent: '#dfb252',
      glow: '#8ad8ff',
    },
    vfxPalette: {
      glow: 0xebb446,
      hot: 0xfff3cc,
      deep: 0x7d4c14,
      accent: 0xe66a3c,
      dark: 0x26180d,
    },
    costumePalette: {
      robe: 0xf4ecdc,
      robeDark: 0x7d1c14,
      pants: 0x8f2218,
      pantsDark: 0x52120e,
      wrap: 0xe4b54c,
      wrapDark: 0x9e7122,
      leather: 0x6b4b32,
      leatherDark: 0x402c1c,
      leatherLight: 0x8f6748,
      iron: 0x4f6880,
      ironLight: 0x87a3bd,
      brass: 0xe4b54c,
      brassDark: 0x9c7626,
      skin: 0xf5ceb4,
      hair: 0x1e1a1e,
      hairHi: 0x463d46,
      cap: 0x261a18,
      capHi: 0x4d342f,
      pheasant: 0xd9a13b,
      pheasantTip: 0x7d1c14,
      lining: 0xf4ecdc,
      liningShade: 0xd6c4a4,
      lacquer: 0x261a18,
      lacquerDark: 0x171114,
      bone: 0xf4ecdc,
      silk: 0xc43622,
      shaft: 0xdfba78,
      head: 0xe4b54c,
      feather: 0xfffaf2,
      featherShade: 0xd6c8b4,
      jade: 0x3ba89e,
    },
    passive: {
      name: '锦弦连韵',
      brief: '连续普攻，越射越快越疼',
      desc: '普攻命中获得一层连韵(最多 5 层，持续 3 秒)，每层提高 6% 攻速。满层时移速提高 10%，且普攻额外造成 20(+每级 4) 点物理伤害。',
    },
    skills: {
      s1: {
        name: '穿云凤矢',
        brief: '一支能穿兵的重箭，射中减速',
        desc: '引满长弓射出一支穿云重箭，贯穿沿途小兵，命中的第一个敌方英雄受到 {damage}(+{adRatio%}物攻) 点物理伤害并减速 {slow%}，持续 {slowDur} 秒(对沿途小兵/野怪造成 60% 伤害)。',
      },
      s2: {
        name: '轻袖腾云',
        brief: '翻身拉开距离，下一箭必暴击',
        desc: '向指定方向轻步腾跃，落地后获得 {haste%} 移速加成持续 {hasteDur} 秒，且下一次普攻必定暴击。',
      },
      ult: {
        name: '天音流雨',
        brief: '箭雨盖住一大片，持续减速',
        desc: '仰射流云羽箭，令箭雨封锁目标区域 {duration} 秒：每 {tick} 秒造成 {damage}(+{adRatio%}物攻) 点物理伤害并减速 {slow%}。',
      },
    },
    assets: makeAssets('wencheng', 'azao'),
  },

  huarui: {
    id: 'huarui',
    kitId: 'chijin',
    assetId: 'xiemu',
    name: '花蕊夫人',
    title: '执剑凌风',
    era: '后蜀·宋初',
    motto: '赏赐已备，这一手尽兴。',
    lore: '取材五代后蜀才女花蕊夫人宫词意象，演绎为绯袍鎏金、执剑旋舞破阵的巾帼剑侠战士：攻守兼备，愈战愈勇。',
    tips: '三个剑招衔接紧凑，每放完一招立刻补一下普攻，重劈伤害高还能回血续航。用「凌波突进」贴近敌阵，再开大招「惊鸿剑舞」边走边旋斩一大片，残血对拼也毫不逊色，注意别一人深入高地塔下。',
    look: '冷艳英气的后蜀绯衣剑侠：高盘云髻簪淡粉海棠金步摇、脑后长卷乌发与红带翻飞，绯红织金海棠大广袖外袍衬红白黑金三色交错垂地大舞裙，右手执百炼清冷长剑。',
    palette: {
      primary: '#9e2646',
      secondary: '#f0ece6',
      accent: '#f092aa',
      glow: '#ff6f94',
    },
    vfxPalette: {
      glow: 0xd13242,
      hot: 0xffd9be,
      deep: 0x6b121b,
      accent: 0xf2c15a,
      dark: 0x240b0e,
    },
    costumePalette: {
      red: 0xb2342c,
      redDark: 0x6e1a18,
      redLight: 0xf2b5b8,
      ironLight: 0xf0e9dc,
      ironDark: 0x222024,
      brass: 0xe2b350,
      brassDark: 0x996c24,
      steel: 0xecf2f8,
      steelDark: 0x768296,
      beard: 0x1c171e,
      beardHi: 0x423648,
      skin: 0xf5ceb4,
      robe: 0xf0e9dc,
      robeDark: 0x222024,
      leather: 0x4a1d24,
      leatherDark: 0x261418,
      shaft: 0x6e2436,
      edge: 0xfff0f2,
    },
    passive: {
      name: '花影剑意',
      brief: '放完剑招下一击更疼还回血',
      desc: '施放技能后，4 秒内的下一次普攻变为惊艳重劈：额外造成 80(+50%物攻) 点物理伤害，并回复自身 5% 最大生命。',
    },
    skills: {
      s1: {
        name: '落红横扫',
        brief: '向前横扫一大片，砍中减速',
        desc: '振剑横扫前方扇形区域，造成 {damage}(+{adRatio%}物攻) 点物理伤害并减速 {slow%}，持续 {slowDur} 秒。',
      },
      s2: {
        name: '凌波突进',
        brief: '冲上去砍一路，攻速变快',
        desc: '踏步凌波向指定方向突斩，对路径上的敌人造成 {damage}(+{adRatio%}物攻) 点物理伤害，并获得 {asBonus%} 攻速加成，持续 {asDur} 秒。',
      },
      ult: {
        name: '惊鸿剑舞',
        brief: '旋身转圈持续砍，可以边转边走',
        desc: '衣袂翻飞旋身连斩，持续 {duration} 秒：每 {tick} 秒对周围敌人造成 {damage}(+{adRatio%}物攻) 点物理伤害。期间可以移动，免疫减速并获得 {reduction%} 减伤。',
      },
    },
    assets: makeAssets('huarui', 'xiemu'),
  },

  liue: {
    id: 'liue',
    kitId: 'xingli',
    assetId: 'erxiang',
    name: '刘娥',
    title: '大宋之母',
    era: '北宋',
    motto: '帘后听政，这一局由我定。',
    lore: '北宋章献明肃皇后，宋仁宗年幼即位期间垂帘决断军国庶政。一期以朱紫皇金法器稳控中路全局，兼具反手拉扯与大范围压制。',
    tips: '技能每打中一次留下一层「定局」印记，同一个人叠满三层就会眩晕。先放「合围统御」把人圈住拉到中心，再把「大宋气象」盖上去。站在队友身后统筹全局，别让人近身。',
    look: '雍容威仪的北宋摄政太后：高盘发髻缀鎏金珠花凤钗与垂珠步摇，身披正朱红织金凤纹大广袖礼服、两条玄黑织金云纹垂地宽领襟与象牙白百褶长裙，腰悬青玉佩双穗，胸前悬浮纤巧朱金凤印玉圭。',
    palette: {
      primary: '#6d2d8a',
      secondary: '#f5ead6',
      accent: '#f0b840',
      glow: '#e08aff',
    },
    vfxPalette: {
      glow: 0xd46aff,
      hot: 0xf7dcff,
      deep: 0x6b2294,
      accent: 0xffcf5c,
      dark: 0x26103a,
    },
    costumePalette: {
      cloak: 0x9e1f1c,
      cloakDark: 0x5c0f10,
      cloakLight: 0xc43228,
      fur: 0xf3eadc,
      furShade: 0xd2c4ad,
      robe: 0xf3eadc,
      robeShade: 0xd2c4ad,
      hem: 0xe8b84e,
      trim: 0x202328,
      trimDark: 0x14161a,
      skin: 0xf4cdb4,
      hair: 0x1b181f,
      hairHi: 0x403847,
      gold: 0xe8b84e,
      goldDark: 0xa67c22,
      lip: 0xb83834,
      wood: 0xd1a256,
      woodShade: 0xa67b36,
      woodDark: 0x7d5821,
      woodDeep: 0x4d3411,
      string: 0xffeeb5,
    },
    passive: {
      name: '帘后定局',
      brief: '技能打中同一人三次就眩晕',
      desc: '技能命中敌人会留下一层定局印记(持续 5 秒)。叠满 3 层时印记共振：造成目标 6% 最大生命的法术伤害(对非英雄上限 300)并眩晕 0.75 秒。',
    },
    skills: {
      s1: {
        name: '凤诏宣威',
        brief: '发出一道紫金光波，穿透一整条线',
        desc: '扬袖宣威，弹出一道穿透敌阵的皇金诏波，对沿途所有敌人造成 {damage}(+{apRatio%}法强) 点法术伤害。',
      },
      s2: {
        name: '合围统御',
        brief: '圈住一片，稍后把人拉到中间',
        desc: '在目标位置布下紫金合围法阵，{delay} 秒后收束：造成 {damage}(+{apRatio%}法强) 点法术伤害，将敌人拉向中心并减速 {slow%}，持续 {slowDur} 秒。',
      },
      ult: {
        name: '大宋气象',
        brief: '法阵星光一波波落下，覆盖一大片',
        desc: '御印震落，{duration} 秒内连续落下 {waves} 波气象玄光，每波对区域内敌人造成 {damage}(+{apRatio%}法强) 点法术伤害并减速 {slow%}。每波都会附加一层定局印记。',
      },
    },
    assets: makeAssets('liue', 'erxiang'),
  },
};

export const KIT_MAP: Record<HeroId, KitId> = {
  qinqiong: 'panyue',
  xinqiji: 'yeque',
  sushi: 'xingli',
  wencheng: 'fengling',
  huarui: 'chijin',
  liue: 'xingli',
};

export function kitOf(heroId: string): KitId {
  return (KIT_MAP as Record<string, KitId>)[heroId] ?? (heroId as KitId);
}

/**
 * 从 6 名唐宋英雄中按确定性种子挑选蓝红双方各 5 名阵容：
 * - 蓝方必定包含玩家所选英雄且位于 index 0；
 * - 两队均保证完整 5 职业覆盖（坦克/战士/射手/刺客 + 1 名中路法师，不抢线）；
 * - 蓝方未上场的那位法师自动分配至红方首发，保证每场对局 6 位唐宋名士全部同台亮相。
 */
export function selectMatchTeams(
  playerHeroId: HeroId,
  seed = 0,
): { blue: HeroId[]; red: HeroId[] } {
  const coreFour: HeroId[] = ['qinqiong', 'xinqiji', 'wencheng', 'huarui'];
  const pickBlueMage: HeroId =
    playerHeroId === 'sushi' || playerHeroId === 'liue'
      ? playerHeroId
      : (seed >>> 0) % 2 === 0
        ? 'sushi'
        : 'liue';
  const redMage: HeroId = pickBlueMage === 'sushi' ? 'liue' : 'sushi';

  const blueFivePool: HeroId[] = [pickBlueMage, ...coreFour];
  const blue: HeroId[] = [
    playerHeroId,
    ...blueFivePool.filter((id) => id !== playerHeroId),
  ];

  const redBase: HeroId[] = [redMage, ...coreFour];
  const shift = ((seed >>> 3) % redBase.length + redBase.length) % redBase.length;
  const red: HeroId[] = redBase.map((_, idx) => redBase[(idx + shift) % redBase.length]);

  return { blue, red };
}
