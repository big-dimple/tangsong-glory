# 《唐宋荣耀》 (Tang-Song Glory v5.1)

唐风宋韵 5v5 网页 MOBA 游戏，使用 TypeScript、Three.js WebGL2、程序化 WebAudio 与 Vite 构建，在线游玩地址：<https://t.hp666.cc/>。

## 核心特性

- **六位唐宋名士与伴生灵宠**：秦琼（`qinqiong`）、辛弃疾（`xinqiji`）、苏轼（`sushi`）、文成公主（`wencheng`）、花蕊夫人（`huarui`）、刘娥（`liue`），各自具备独立 3D 建模骨骼、古风肖像原画与专属灵宠。
- **宋代青绿山水战场**：基于 Three.js 自定义着色器与程序化砖石/水墨地表纹理构建汴京演武场，包含木桥河道、城门、亭台防御塔、唐宋阵营兵线、野怪与野生动物生态。
- **纯程序化五声调式音效与配乐**：`src/audio/tangsongAudio.ts` 通过 WebAudio 实时合成大厅古琴配乐、战斗鼓点与技能打击音效，零外置音频包依赖。
- **手绘描金技能与行动图标**：24 枚英雄专属技能图标与 4 枚召唤师/普攻图标统一采用矿彩鎏金古风绘卷切图（`.webp`），搭配 `TangSongBrush` / `TangSongSerif` 与去伪粗体的清晰局内小号角标。
- **水墨技能与队友协作**：六位英雄施法各有山水、笔墨或剑舞动效；苏轼大招逐字展现书法。附近队友会支援玩家，也可在小地图下方重复点击“集合”或“进攻”，队友仍会判断血量和敌方防御塔风险。
- **手卷式开场大厅与字体**：融合宣纸水墨主题（`src/ui/tangsongLobby.ts`、`src/styles/tangsong-theme.css`）与 `TangSongBrush` / `TangSongSerif` 子集化字体。
- **可审计的 CI 与发布管线**：每次推送至 `main` 均通过域校验、单元测试、WebGL2 无头浏览器冒烟与构建产物签名校验，生成不可变 GitHub Release 后由边缘发布节点零构建拉取部署。

## 快速开始

需要 Node.js 24+（浏览器冒烟需本机安装 Chrome / Chromium / Edge，可通过 `SMOKE_CHROMIUM_EXECUTABLE_PATH` 指定可执行路径）。

```bash
npm ci
npm run dev
```

常用校验命令：

```bash
npm run typecheck       # TypeScript 类型检查
npm run verify:content  # 资产完整性与隐私/静态扫描
npm run verify          # typecheck + verify:content + vite build
npm run verify:smoke    # 无头浏览器 WebGL2 启动与全场景冒烟（含 ?smoke=1 演武）
npm run verify:ci       # 完整运行 domain + browser 全部门禁并输出 shots/ci/all.json
```

## 文档导航

- [工程架构与发布设计 (`ENGINEERING.md`)](./ENGINEERING.md)
- [协作与 AI Agent 开发规范 (`AGENTS.md`)](./AGENTS.md)
- [后续演进清单 (`TODO.md`)](./TODO.md)
- [开源协议 (`LICENSE`)](./LICENSE)
