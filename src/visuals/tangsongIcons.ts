/**
 * tangsongIcons.ts — 为 6 位唐宋名士（含苏轼与刘娥完全独立绘制）定制 24 枚唐宋意象 SVG 技能图标 + 3 枚通用技能图标
 */

function wrapIconSvg(bg: [string, string, string], defs: string, body: string): string {
  const cleanDefs = defs.replaceAll('@', 'ts_');
  const cleanBody = body.replaceAll('@', 'ts_');
  return (
    `<svg viewBox="0 0 64 64" class="sf-ico" aria-hidden="true">` +
    `<defs>` +
    `<radialGradient id="ts_bg" cx="32" cy="26" r="46" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0" stop-color="${bg[0]}"/>` +
    `<stop offset="0.52" stop-color="${bg[1]}"/>` +
    `<stop offset="1" stop-color="${bg[2]}"/>` +
    `</radialGradient>` +
    `<radialGradient id="ts_vg" cx="32" cy="32" r="44" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0.58" stop-color="#000" stop-opacity="0"/>` +
    `<stop offset="1" stop-color="#000" stop-opacity="0.52"/>` +
    `</radialGradient>` +
    `<linearGradient id="ts_gl" x1="0" y1="0" x2="0" y2="28" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0" stop-color="#fff8e6" stop-opacity="0.22"/>` +
    `<stop offset="1" stop-color="#fff8e6" stop-opacity="0"/>` +
    `</linearGradient>` +
    cleanDefs +
    `</defs>` +
    `<rect width="64" height="64" fill="url(#ts_bg)"/>` +
    // 古典暗纹铜镜细圈
    `<circle cx="32" cy="32" r="27" fill="none" stroke="#f3cf85" stroke-width="0.8" opacity="0.24"/>` +
    cleanBody +
    `<rect width="64" height="64" fill="url(#ts_vg)"/>` +
    `<path d="M0 0H64V18Q32 29 0 18Z" fill="url(#ts_gl)"/>` +
    `</svg>`
  );
}

const gMetal = (id: string, c1: string, c2: string, c3: string) =>
  `<linearGradient id="@${id}" x1="12" y1="8" x2="52" y2="56" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${c1}"/><stop offset="0.5" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/></linearGradient>`;

const gGlow = (id: string, color: string, opacity = 0.85) =>
  `<radialGradient id="@${id}"><stop offset="0" stop-color="${color}" stop-opacity="${opacity}"/><stop offset="0.5" stop-color="${color}" stop-opacity="${(opacity * 0.3).toFixed(2)}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`;

const SKILL_SVGS: Record<string, Record<'passive' | 's1' | 's2' | 'ult', () => string>> = {
  // ─── 1. 秦琼（鎏金玄甲 + 虎纹重盾 + 四棱熟铜双锏） ───
  qinqiong: {
    passive: () =>
      wrapIconSvg(
        ['#8e6e35', '#3e2d16', '#140e08'],
        gMetal('sh', '#58606d', '#2d333d', '#161920') + gMetal('gd', '#fff3c4', '#e4b856', '#8f621b') + gGlow('gl', '#ffcf66', 0.7),
        `<circle cx="32" cy="34" r="24" fill="url(#@gl)"/>` +
          // 玄甲虎盾
          `<path d="M16 14Q32 10 48 14L50 31Q48 47 32 54Q16 47 14 31Z" fill="url(#@sh)" stroke="url(#@gd)" stroke-width="2.2" stroke-linejoin="round"/>` +
          `<path d="M21 19Q32 16 43 19L44 30Q42 42 32 47Q22 42 20 30Z" fill="none" stroke="#e4b856" stroke-width="1.2" opacity="0.65"/>` +
          // 盾心兽面浮雕金钮 + 三点破甲金星
          `<circle cx="32" cy="31" r="6.5" fill="url(#@gd)" stroke="#1a1208" stroke-width="1.2"/>` +
          `<path d="M27 30L32 23L37 30L32 39Z" fill="#fff7da"/>` +
          `<circle cx="20" cy="54" r="2.2" fill="#ffdf8a"/><circle cx="32" cy="57" r="2.2" fill="#ffdf8a"/><circle cx="44" cy="54" r="2.6" fill="#ff9f43"/>`,
      ),
    s1: () =>
      wrapIconSvg(
        ['#997434', '#422c14', '#160d07'],
        gMetal('gd', '#fff5cc', '#e5b34c', '#8c5d19') + gGlow('gl', '#ffd875', 0.8),
        `<circle cx="38" cy="32" r="22" fill="url(#@gl)"/>` +
          // 冲锋气浪弧线
          `<path d="M8 22H26M6 32H24M10 42H26" stroke="#ffdf8a" stroke-width="2.5" stroke-linecap="round" opacity="0.85"/>` +
          // 前倾撞击重盾
          `<path d="M27 12L49 18L54 32L47 48L25 50L31 31Z" fill="#2e3542" stroke="url(#@gd)" stroke-width="2.4" stroke-linejoin="round"/>` +
          `<path d="M36 22L48 32L36 42L40 32Z" fill="url(#@gd)"/>`,
      ),
    s2: () =>
      wrapIconSvg(
        ['#916a2e', '#3c2912', '#130c06'],
        gMetal('gd', '#fff7d4', '#ebb950', '#946218') + gGlow('gl', '#ffe08a', 0.75),
        `<circle cx="32" cy="32" r="24" fill="url(#@gl)"/>` +
          `<circle cx="32" cy="32" r="21" fill="none" stroke="#ffd875" stroke-width="1.8" stroke-dasharray="6 4" opacity="0.75"/>` +
          // 交叉四棱双金锏
          `<g transform="rotate(42 32 32)">` +
          `<rect x="29" y="8" width="6" height="40" rx="1.5" fill="url(#@gd)" stroke="#241608" stroke-width="1.2"/>` +
          `<rect x="27" y="42" width="10" height="3.5" rx="1" fill="#8f291c"/><rect x="30" y="45" width="4" height="10" rx="1" fill="#4e3018"/>` +
          `</g>` +
          `<g transform="rotate(-42 32 32)">` +
          `<rect x="29" y="8" width="6" height="40" rx="1.5" fill="url(#@gd)" stroke="#241608" stroke-width="1.2"/>` +
          `<rect x="27" y="42" width="10" height="3.5" rx="1" fill="#8f291c"/><rect x="30" y="45" width="4" height="10" rx="1" fill="#4e3018"/>` +
          `</g>`,
      ),
    ult: () =>
      wrapIconSvg(
        ['#b87c2a', '#4a260f', '#170a05'],
        gMetal('gd', '#fffbe3', '#f5c255', '#9e6214') + gGlow('gl', '#ffae38', 0.9),
        `<circle cx="32" cy="35" r="25" fill="url(#@gl)"/>` +
          // 裂地金波纹
          `<ellipse cx="32" cy="48" rx="24" ry="8" fill="none" stroke="#ffd875" stroke-width="2.2"/>` +
          `<ellipse cx="32" cy="48" rx="15" ry="4.5" fill="none" stroke="#fff3c4" stroke-width="1.6"/>` +
          `<path d="M10 47L17 42M54 47L47 42M18 55L24 50M46 55L40 50" stroke="#ffb84d" stroke-width="2" stroke-linecap="round"/>` +
          // 凌空砸落重盾与金锏芒
          `<path d="M20 12H44L47 29Q45 41 32 47Q19 41 17 29Z" fill="#2c3240" stroke="url(#@gd)" stroke-width="2.5" stroke-linejoin="round"/>` +
          `<path d="M32 16L35 28L32 41L29 28Z" fill="#fff3be"/>`,
      ),
  },

  // ─── 2. 辛弃疾（南宋刺客：单刀直入 + 挑灯飞刃 + 五十骑破营） ───
  xinqiji: {
    passive: () =>
      wrapIconSvg(
        ['#992e22', '#47120e', '#170606'],
        gMetal('rd', '#fff0b8', '#f0a63e', '#8f1b14') + gGlow('gl', '#ff7a36', 0.85),
        `<circle cx="32" cy="32" r="24" fill="url(#@gl)"/>` +
          // 孤胆破营单刀断月徽记
          `<path d="M46 14A18 18 0 1 0 48 48A14 14 0 1 1 46 14Z" fill="#ffbe6b" opacity="0.88"/>` +
          `<path d="M16 50L44 12L51 16L22 52Z" fill="#f3f7fc" stroke="#240b08" stroke-width="1.3"/>` +
          `<path d="M15 41L27 49" stroke="#e6b64c" stroke-width="3.2" stroke-linecap="round"/>` +
          `<circle cx="38" cy="24" r="3" fill="#ff6a38"/>`,
      ),
    s1: () =>
      wrapIconSvg(
        ['#a32a20', '#48100d', '#160505'],
        gMetal('arc', '#fff5d1', '#ff7b3b', '#9e1915') + gGlow('gl', '#ff6e36', 0.85),
        `<circle cx="32" cy="32" r="24" fill="url(#@gl)"/>` +
          // 单骑直入疾刺掠影
          `<path d="M10 38L44 12L49 16L15 43Z" fill="#ffd9a8" opacity="0.52"/>` +
          `<path d="M12 48L52 16L55 21L17 53Z" fill="#f5f8ff" stroke="#210805" stroke-width="1.3"/>` +
          `<path d="M8 28H24M14 20H28" stroke="#ff9a52" stroke-width="2.2" stroke-linecap="round"/>`,
      ),
    s2: () =>
      wrapIconSvg(
        ['#99301e', '#43120b', '#170605'],
        gMetal('bl', '#fff9e6', '#ffd27a', '#b82e1e') + gGlow('gl', '#ff8e42', 0.85),
        `<circle cx="32" cy="38" r="24" fill="url(#@gl)"/>` +
          // 挑灯三柄扇形军刺
          [
            [-28, 32, 36],
            [0, 32, 32],
            [28, 32, 36],
          ]
            .map(
              ([rot, cx, cy]) =>
                `<g transform="rotate(${rot} ${cx} ${cy})"><path d="M32 10Q36 22 33 38H31Q28 22 32 10Z" fill="url(#@bl)" stroke="#240b06" stroke-width="1.1"/><circle cx="32" cy="40" r="2.2" fill="#ff7338"/></g>`,
            )
            .join(''),
      ),
    ult: () =>
      wrapIconSvg(
        ['#b0281c', '#4a0f0c', '#180505'],
        gMetal('fl', '#fff4c4', '#ff6430', '#8f1310') + gGlow('gl', '#ff5b2e', 0.92),
        `<circle cx="32" cy="32" r="25" fill="url(#@gl)"/>` +
          // 五十骑夜闯金营十字绝杀
          `<rect x="14" y="14" width="36" height="36" rx="5" fill="none" stroke="#ffd885" stroke-width="1.6" stroke-dasharray="7 4" opacity="0.72"/>` +
          `<path d="M13 13L51 51M51 13L13 51" stroke="url(#@fl)" stroke-width="4.4" stroke-linecap="round"/>` +
          `<circle cx="32" cy="32" r="4.5" fill="#fffbe8"/>`,
      ),
  },

  // ─── 3. 苏轼（青绿碧水古琴 + 三叠余音 + 赤壁惊涛） ───
  sushi: {
    passive: () =>
      wrapIconSvg(
        ['#2a7375', '#133d42', '#07171a'],
        gMetal('jd', '#e6fffb', '#62d9ce', '#1d696b') + gGlow('gl', '#7ef2e3', 0.8),
        `<circle cx="32" cy="32" r="24" fill="url(#@gl)"/>` +
          // 三圈共振古琴余音（青玉+淡金）
          `<circle cx="32" cy="32" r="22" fill="none" stroke="#7de8db" stroke-width="1.4" opacity="0.45"/>` +
          `<circle cx="32" cy="32" r="15" fill="none" stroke="#aaf7ed" stroke-width="1.8" opacity="0.72"/>` +
          `<circle cx="32" cy="32" r="8" fill="none" stroke="#f7e2a8" stroke-width="2.2"/>` +
          `<circle cx="32" cy="32" r="3" fill="#fffbe9"/>` +
          `<circle cx="17" cy="17" r="2" fill="#f7e2a8"/><circle cx="47" cy="17" r="2" fill="#f7e2a8"/><circle cx="32" cy="52" r="2.2" fill="#f7e2a8"/>`,
      ),
    s1: () =>
      wrapIconSvg(
        ['#297a7e', '#113c40', '#061518'],
        gMetal('wv', '#eafffb', '#5dd4c7', '#1a5f63') + gGlow('gl', '#78ebd9', 0.8),
        `<circle cx="32" cy="32" r="23" fill="url(#@gl)"/>` +
          // 大江东去琴弦水波
          `<path d="M8 22Q20 14 32 22T56 22" fill="none" stroke="#f4dfaa" stroke-width="2" stroke-linecap="round"/>` +
          `<path d="M6 33Q20 22 33 33T58 32" fill="none" stroke="url(#@wv)" stroke-width="4.2" stroke-linecap="round"/>` +
          `<path d="M10 44Q22 36 34 44T54 44" fill="none" stroke="#85e6da" stroke-width="2.2" stroke-linecap="round"/>` +
          `<path d="M44 25L56 32L44 39Z" fill="#fffbe8"/>`,
      ),
    s2: () =>
      wrapIconSvg(
        ['#276c74', '#10353b', '#061417'],
        gMetal('sw', '#d8fff8', '#5ccfc3', '#195c61') + gGlow('gl', '#6ee3d4', 0.8),
        `<circle cx="32" cy="32" r="24" fill="url(#@gl)"/>` +
          // 回澜水漩太极阵
          `<path d="M12 32A20 20 0 0 1 50 24" fill="none" stroke="url(#@sw)" stroke-width="3.2" stroke-linecap="round"/>` +
          `<path d="M52 32A20 20 0 0 1 14 40" fill="none" stroke="#f4dfaa" stroke-width="3" stroke-linecap="round"/>` +
          `<path d="M20 32A12 12 0 0 1 42 26" fill="none" stroke="#b8fff4" stroke-width="2.2" stroke-linecap="round"/>` +
          `<path d="M44 32A12 12 0 0 1 22 38" fill="none" stroke="#b8fff4" stroke-width="2.2" stroke-linecap="round"/>` +
          `<circle cx="32" cy="32" r="4.5" fill="#fff8de"/>`,
      ),
    ult: () =>
      wrapIconSvg(
        ['#26767a', '#0f363c', '#051216'],
        gMetal('tb', '#e8fffb', '#66d9cd', '#165257') + gGlow('gl', '#82f2e4', 0.9),
        `<circle cx="32" cy="30" r="24" fill="url(#@gl)"/>` +
          // 弯月与赤壁惊涛拍岸
          `<circle cx="46" cy="16" r="5" fill="#fae5a5"/>` +
          `<path d="M8 46Q18 22 34 30Q44 36 56 26V52H8Z" fill="url(#@tb)" stroke="#d9fff8" stroke-width="1.5" stroke-linejoin="round"/>` +
          `<path d="M14 40Q26 18 42 34" fill="none" stroke="#fff9e3" stroke-width="2.4" stroke-linecap="round"/>` +
          `<circle cx="24" cy="24" r="1.8" fill="#fff"/><circle cx="36" cy="20" r="1.6" fill="#fff"/>`,
      ),
  },

  // ─── 4. 文成公主（盛唐天青琉璃 + 凤首长弓 + 飘飞丝帛） ───
  wencheng: {
    passive: () =>
      wrapIconSvg(
        ['#1e5682', '#102c47', '#06111e'],
        gMetal('bw', '#fff3c4', '#dfb252', '#8f6420') + gGlow('gl', '#8ad8ff', 0.8),
        `<circle cx="32" cy="32" r="23" fill="url(#@gl)"/>` +
          // 凤翼弦弓与五连珠羽箭印记
          `<path d="M22 10Q42 32 22 54" fill="none" stroke="url(#@bw)" stroke-width="3.6" stroke-linecap="round"/>` +
          `<line x1="22" y1="12" x2="22" y2="52" stroke="#d8f5ff" stroke-width="1.3"/>` +
          `<line x1="12" y1="32" x2="50" y2="32" stroke="#fff6d4" stroke-width="2.4"/>` +
          `<path d="M46 27L55 32L46 37L49 32Z" fill="#8ee3ff"/>` +
          `<circle cx="16" cy="18" r="2" fill="#ffe299"/><circle cx="20" cy="15" r="2" fill="#ffe299"/><circle cx="24" cy="18" r="2" fill="#ffe299"/>`,
      ),
    s1: () =>
      wrapIconSvg(
        ['#1f5e8f', '#103152', '#061322'],
        gMetal('ar', '#ffffff', '#8ee2ff', '#257bb8') + gGlow('gl', '#70d2ff', 0.85),
        `<circle cx="36" cy="28" r="22" fill="url(#@gl)"/>` +
          // 穿云破甲重凤矢
          `<line x1="10" y1="54" x2="48" y2="16" stroke="#f4d075" stroke-width="3" stroke-linecap="round"/>` +
          `<path d="M40 14L54 10L50 24L45 19Z" fill="url(#@ar)" stroke="#0e243a" stroke-width="1.2"/>` +
          `<path d="M10 46L17 47L16 54M14 42L21 43L20 50" fill="none" stroke="#ff7a6b" stroke-width="2" stroke-linecap="round"/>` +
          `<path d="M26 22Q36 22 42 28M34 40Q40 34 40 24" fill="none" stroke="#bceeff" stroke-width="1.8" stroke-linecap="round"/>`,
      ),
    s2: () =>
      wrapIconSvg(
        ['#205882', '#0f2d47', '#07121f'],
        gMetal('rb', '#fff4d4', '#dfb252', '#b83e4b') + gGlow('gl', '#9ee6ff', 0.78),
        `<circle cx="32" cy="32" r="23" fill="url(#@gl)"/>` +
          // 轻袖腾云飞天绸带
          `<path d="M12 46Q18 24 34 26Q44 28 52 14" fill="none" stroke="url(#@rb)" stroke-width="5" stroke-linecap="round"/>` +
          `<path d="M10 34Q22 14 44 18" fill="none" stroke="#bceeff" stroke-width="2.2" stroke-linecap="round"/>` +
          `<path d="M46 10L55 12L52 21" fill="none" stroke="#fff6d4" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
      ),
    ult: () =>
      wrapIconSvg(
        ['#1e5b8a', '#0e2d4a', '#05101e'],
        gMetal('rn', '#ffffff', '#8ee3ff', '#1c6ca8') + gGlow('gl', '#80d8ff', 0.88),
        `<circle cx="32" cy="30" r="24" fill="url(#@gl)"/>` +
          // 天音流雨漫天金羽箭阵
          [
            [18, 12, 12, 34],
            [32, 8, 25, 34],
            [46, 12, 38, 36],
            [24, 24, 17, 50],
            [39, 24, 32, 50],
            [52, 24, 45, 50],
          ]
            .map(
              ([x1, y1, x2, y2]) =>
                `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ffe8a6" stroke-width="2" stroke-linecap="round"/>` +
                `<path d="M${x2 - 2.5} ${y2 - 3}L${x2 - 1} ${y2 + 3}L${x2 + 3.5} ${y2 - 1}Z" fill="#99e8ff"/>`,
            )
            .join(''),
      ),
  },

  // ─── 5. 花蕊夫人（后蜀战士：落红横扫 + 凌波突进 + 惊鸿剑舞） ───
  huarui: {
    passive: () =>
      wrapIconSvg(
        ['#992446', '#450e20', '#16040a'],
        gMetal('sw', '#ffffff', '#f0a6bb', '#911f3f') + gGlow('gl', '#ff7599', 0.85),
        `<circle cx="32" cy="32" r="24" fill="url(#@gl)"/>` +
          // 红梅花影重剑愈战愈勇
          `<path d="M32 10C39 18 42 26 39 34C37 40 32 45 32 45C32 45 27 40 25 34C22 26 25 18 32 10Z" fill="#ff7d9e" opacity="0.72"/>` +
          `<path d="M32 8L35 20L34 42H30L29 20Z" fill="url(#@sw)" stroke="#240812" stroke-width="1.2"/>` +
          `<path d="M23 42H41L38 46H26Z" fill="#f0c36e"/><rect x="30" y="46" width="4" height="9" rx="1" fill="#701730"/>`,
      ),
    s1: () =>
      wrapIconSvg(
        ['#a12548', '#470e21', '#18050b'],
        gMetal('arc', '#fff5f8', '#ff7aa0', '#961e42') + gGlow('gl', '#ff6991', 0.88),
        `<circle cx="32" cy="32" r="24" fill="url(#@gl)"/>` +
          // 落红横扫绯瓣剑弧
          `<path d="M12 42Q14 14 48 16Q28 24 22 46Z" fill="url(#@arc)" stroke="#ffe0ea" stroke-width="1.5" stroke-linejoin="round"/>` +
          `<path d="M24 46L50 18L53 21L28 49Z" fill="#ffffff" stroke="#210710" stroke-width="1.2"/>` +
          `<circle cx="22" cy="48" r="3" fill="#f0c36e"/>`,
      ),
    s2: () =>
      wrapIconSvg(
        ['#992344', '#400c1d', '#140409'],
        gMetal('sw', '#ffffff', '#ff9db8', '#991b3d') + gGlow('gl', '#ff6e96', 0.85),
        `<circle cx="32" cy="32" r="24" fill="url(#@gl)"/>` +
          // 凌波踏浪突剑加速
          `<path d="M8 22L28 22M12 32L32 32M8 42L28 42" stroke="#ffb3c8" stroke-width="2.2" stroke-linecap="round"/>` +
          `<path d="M18 48L44 16L51 14L49 21L23 53Z" fill="url(#@sw)" stroke="#240812" stroke-width="1.3"/>` +
          `<path d="M20 40L32 50" stroke="#f3cb6d" stroke-width="3.2" stroke-linecap="round"/>` +
          `<path d="M40 12Q52 12 52 24" fill="none" stroke="#ff9db8" stroke-width="2" stroke-linecap="round"/>`,
      ),
    ult: () =>
      wrapIconSvg(
        ['#ab234a', '#4a0b22', '#17040a'],
        gMetal('cr', '#fff5f7', '#ff7096', '#8f1336') + gGlow('gl', '#ff5784', 0.92),
        `<circle cx="32" cy="32" r="25" fill="url(#@gl)"/>` +
          // 惊鸿剑舞绯花旋剑轮
          `<circle cx="32" cy="32" r="19" fill="none" stroke="url(#@cr)" stroke-width="4.4" stroke-dasharray="22 8"/>` +
          `<circle cx="32" cy="32" r="12" fill="none" stroke="#ffd8e4" stroke-width="2.2" stroke-dasharray="12 6"/>` +
          `<path d="M12 18Q28 10 46 20L39 24Q28 18 18 23Z" fill="#fff0f5"/>` +
          `<path d="M52 46Q36 54 18 44L25 40Q36 46 46 41Z" fill="#ffffff"/>` +
          `<circle cx="32" cy="32" r="5" fill="#ffe6ee"/>`,
      ),
  },

  // ─── 6. 刘娥（北宋章献太后：独立朱紫皇金御印 & 大宋气象阵） ───
  liue: {
    passive: () =>
      wrapIconSvg(
        ['#7a2e94', '#381247', '#13051b'],
        gMetal('im', '#fff2c4', '#e8b343', '#7a2e94') + gGlow('gl', '#dc7aff', 0.85),
        `<circle cx="32" cy="32" r="24" fill="url(#@gl)"/>` +
          // 朱紫玉印定局篆章
          `<rect x="17" y="17" width="30" height="30" rx="5" fill="#4f1863" stroke="url(#@im)" stroke-width="2.4"/>` +
          `<path d="M23 24H41M32 24V42M24 33H40" stroke="#ffe7a8" stroke-width="2.2" stroke-linecap="round"/>` +
          `<circle cx="18" cy="12" r="2" fill="#ffe7a8"/><circle cx="32" cy="10" r="2.2" fill="#e89eff"/><circle cx="46" cy="12" r="2" fill="#ffe7a8"/>`,
      ),
    s1: () =>
      wrapIconSvg(
        ['#7c2c96', '#3a1149', '#14051c'],
        gMetal('bm', '#fff7db', '#e28fff', '#6b1f8c') + gGlow('gl', '#df80ff', 0.88),
        `<circle cx="32" cy="32" r="24" fill="url(#@gl)"/>` +
          // 凤诏宣威紫金长波与凤翎尾翼
          `<path d="M6 34L44 16L54 19L48 30L10 46Z" fill="url(#@bm)" stroke="#240a30" stroke-width="1.2"/>` +
          `<path d="M10 26Q28 18 52 12" fill="none" stroke="#ffd875" stroke-width="2" stroke-linecap="round"/>` +
          `<path d="M16 46Q34 38 56 32" fill="none" stroke="#ffd875" stroke-width="1.8" stroke-linecap="round"/>`,
      ),
    s2: () =>
      wrapIconSvg(
        ['#76288f', '#351044', '#120519'],
        gMetal('gd', '#fff5d1', '#efc054', '#9c6a1c') + gGlow('gl', '#d678ff', 0.85),
        `<circle cx="32" cy="32" r="24" fill="url(#@gl)"/>` +
          // 皇城八方合围法阵
          `<polygon points="32,10 48,17 54,32 48,47 32,54 16,47 10,32 16,17" fill="none" stroke="url(#@gd)" stroke-width="2.4"/>` +
          `<circle cx="32" cy="32" r="12" fill="none" stroke="#e9a3ff" stroke-width="2" stroke-dasharray="5 3"/>` +
          `<path d="M32 14V23M32 41V50M14 32H23M41 32H50" stroke="#ffe599" stroke-width="2.2" stroke-linecap="round"/>` +
          `<circle cx="32" cy="32" r="4" fill="#fff6d4"/>`,
      ),
    ult: () =>
      wrapIconSvg(
        ['#82299e', '#3c0f4d', '#15051f'],
        gMetal('cn', '#fff6d4', '#f2bd4e', '#82299e') + gGlow('gl', '#e587ff', 0.92),
        `<circle cx="32" cy="30" r="25" fill="url(#@gl)"/>` +
          // 宋廷九龙金凤冠与落星御印阵
          `<path d="M14 42L18 22L26 30L32 14L38 30L46 22L50 42Z" fill="url(#@cn)" stroke="#24092e" stroke-width="1.5" stroke-linejoin="round"/>` +
          `<rect x="13" y="42" width="38" height="6" rx="2" fill="#6b1d87" stroke="#ffd875" stroke-width="1.4"/>` +
          `<circle cx="32" cy="24" r="3" fill="#fff6db"/><circle cx="20" cy="34" r="2" fill="#e9a3ff"/><circle cx="44" cy="34" r="2" fill="#e9a3ff"/>` +
          `<path d="M10 12L10 20M54 12L54 20M22 8L22 14M42 8L42 14" stroke="#ffe599" stroke-width="1.8" stroke-linecap="round"/>`,
      ),
  },
};

const SUMMONER_SVGS: Record<'recall' | 'heal' | 'flash', () => string> = {
  recall: () =>
    wrapIconSvg(
      ['#2a8074', '#12423d', '#061a18'],
      gMetal('jd', '#e8fffb', '#67dfd0', '#1f6e64') + gGlow('gl', '#70ebd9', 0.88),
      `<ellipse cx="32" cy="49" rx="22" ry="6.5" fill="none" stroke="#85f0e0" stroke-width="2"/>` +
        `<ellipse cx="32" cy="40" rx="14" ry="4" fill="none" stroke="#ffd87d" stroke-width="1.4" opacity="0.8"/>` +
        `<circle cx="32" cy="26" r="16" fill="url(#@gl)"/>` +
        // 八卦玉玦与返城光柱
        `<path d="M32 7L41 25L32 45L23 25Z" fill="url(#@jd)" stroke="#0f2b28" stroke-width="1.3"/>` +
        `<circle cx="32" cy="25" r="4" fill="#ffe6a3"/>`,
    ),
  heal: () =>
    wrapIconSvg(
      ['#368f68', '#154731', '#061c12'],
      gMetal('pl', '#fffbe6', '#8de8b8', '#2a7d58') + gGlow('gl', '#9dffcb', 0.85),
      `<circle cx="32" cy="32" r="24" fill="url(#@gl)"/>` +
        // 青莲妙药丹炉与双叶
        `<path d="M27 14H37V27H50V37H37V50H27V37H14V27H27Z" fill="url(#@pl)" stroke="#0d291d" stroke-width="1.5" stroke-linejoin="round"/>` +
        `<circle cx="32" cy="32" r="6" fill="#ffd980" opacity="0.85"/>` +
        `<path d="M12 16Q18 10 22 18M42 48Q48 54 52 44" fill="none" stroke="#ffe299" stroke-width="1.8" stroke-linecap="round"/>`,
    ),
  flash: () =>
    wrapIconSvg(
      ['#cc9135', '#6b3e12', '#211005'],
      gMetal('st', '#ffffff', '#ffd980', '#b86814') + gGlow('gl', '#ffe9a8', 0.92),
      `<circle cx="44" cy="20" r="20" fill="url(#@gl)"/>` +
        // 祥云缩地金芒
        `<path d="M12 46Q20 40 28 32T46 18" fill="none" stroke="url(#@st)" stroke-width="5" stroke-linecap="round"/>` +
        `<path d="M45 8L48 17L57 20L48 23L45 32L42 23L33 20L42 17Z" fill="#fffbe8"/>` +
        `<path d="M10 38Q16 32 22 36Q28 32 30 39" fill="none" stroke="#ffe599" stroke-width="1.6" stroke-linecap="round"/>`,
    ),
};

export function getSkillIcon(heroId: string, slot: 'passive' | 's1' | 's2' | 'ult'): string {
  const heroSet = SKILL_SVGS[heroId] ?? SKILL_SVGS.sushi;
  return heroSet[slot]();
}

export function getSummonerIcon(key: string): string {
  const fn = SUMMONER_SVGS[key as keyof typeof SUMMONER_SVGS];
  return fn ? fn() : SUMMONER_SVGS.recall();
}
