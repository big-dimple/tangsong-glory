# 《唐宋荣耀》协作与开发规范

本仓库是独立的开源工程项目（`v5.1`），请所有人类开发者与 AI Agent 在提交改动前严格遵守以下约定：

## 一、目录边界与模块职责

- **`src/config/`**：品牌文案（`brand.ts`）、镜头预设（`camera.ts`）、跑打操作手感参数（`combatFeel.ts`）、六位英雄资料与技能配置（`heroes.ts`）。所有英雄配置以 `heroes.ts` 为唯一真相源，严禁在 UI 或渲染层硬编码英雄名、台词或属性。
- **`src/visuals/`**：唐宋建筑（`tangsongArchitecture.ts`）、植被（`tangsongFlora.ts`）、3D 英雄与灵宠骨骼（`tangsongHeroes3D.ts`）、矿彩技能图标映射（`tangsongIcons.ts`）、兵线/野怪/生态（`tangsongMinions3D.ts`、`tangsongMonsters3D.ts`、`tangsongWildlife.ts`）、地表/成片/水墨特效着色器（`tangsongTerrain.ts`、`tangsongFilm.ts`、`tangsongVfx.ts`、`tangsongProps.ts`、`tangsongWorld.ts`）。
- **`src/ui/` & `src/styles/`**：唐宋手卷开场大厅（`tangsongLobby.ts`）、转场演出开关（`tangsongMotion.ts`）、朱印/墨印落款（`tangsongSeal.ts`）与宣纸主题样式。
- **`src/audio/`**：4 首实录原声背景配乐随机轮播（`public/assets/audio/bgm/*.ogg|mp3`）、纯程序化 WebAudio 音效控制器（`tangsongAudio.ts`）与山谷/城阙混响空间生成（`tangsongSpace.ts`）；不得引入额外外置 SFX 音频包。
- **`src/platform/buildMetadata.ts` & `scripts/build-info.ts`**：构建元数据与 git 工作区洁净度校验。
- **`src/engine/mobaCore.js`**：核心 MOBA 模拟、物理、AI 与 HUD 运行时桥接；改动任何数值或技能判定前，须确认 `harness/verify.mjs` 的技能基线比对仍保持零偏差。

## 二、本地开发与门禁要求

提交任何改动前，必须确保以下检查全部通过且不改动已跟踪源码的哈希快照（`scripts/check-runner.mjs` 会在每步前后校验工作区洁净度）：

1. `npm run typecheck` —— TypeScript 严格类型校验无错误。
2. `npm run verify:content` —— 6 英雄、84 项美术/图标/字体与 BGM 资产齐备、无旧作遗留命名或敏感信息泄露。
3. `python3 -B -m unittest discover -s tests -p "test_*.py"` —— 发布清单打包、下载重试边界、GitHub Release 编排与服务端接收逻辑单元测试全部通过。
4. `npm run build` —— 输出洁净 `dist/` 与 `dist/build-info.json`。
5. `npm run verify:smoke` —— 无头 Chromium WebGL2 启动、字体加载、实录 BGM 随机轮播与程序化 WebAudio SFX、6 英雄与野怪/小兵 3D 模型三角面检查、对局 3 档视角及关键场景截图全部通过。

## 三、CI 与发布铁律

- `.github/workflows/ci.yml` 在 PR 与特性分支上拆分运行 `domain` 与 `browser` 门禁。
- `.github/workflows/release-candidate.yml` 在 `main` 分支执行全量校验、打包单一候选构建（`dist.tar.gz` + `dist.tar.gz.sha256` + `manifest.json`），经动作 `.github/actions/download-release-candidate` 二次校验并比对远端 `main` 未漂移后，方才发布正式 Release `v<40位SHA>`。
- 生产部署脚本仅下载并校验已发布的 GitHub Release 产物，永不在生产主机执行 `npm install` 或 `vite build`。
- **隐私与凭据红线**：严禁向代码、脚本、测试、文档或 git 提交历史写入任何私钥、API Token、IP 地址或本机用户目录路径；`verify-content.mjs` 会在每次校验时自动扫描全仓文本文件。
