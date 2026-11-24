# 《唐宋荣耀》工程架构与发布设计 (`ENGINEERING.md`)

## 一、前端分层架构

本项目通过 `window.__TANGSONG_CONFIG__`（见 [`src/main.ts`](./src/main.ts)）将视觉、UI、音频与配置从 MOBA 核心引擎中解耦，入口通过 Vite 统一构建输出到 `dist/`（含 `dist/build-info.json`）：

| 层级 | 关键模块 | 职责说明 |
|---|---|---|
| 配置层 | `src/config/brand.ts`、`camera.ts`、`combatFeel.ts`、`heroes.ts` | 品牌版本戳（`v5.1`）、近/中/远三档视角参数、跑打出手容错手感、6 位唐宋英雄完整配置与技能资源映射 |
| 视觉与着色器层 | `src/visuals/tangsong*.ts` | 英雄 3D 模型与伴生灵宠、兵线与野怪建模、地图地貌/河流木栏杆/防御塔、青绿山水材质纹理与技能特效着色器 |
| 界面层 | `src/ui/tangsongLobby.ts`、`src/styles/tangsong-theme.css` | 宣纸画卷大厅、选将亭、大招眼神特写 Cut-in（`triggerEyesCutin`）与游戏 HUD 主题样式 |
| 音频层 | `src/audio/tangsongAudio.ts` | WebAudio 实时合成五声音阶背景乐与战斗打击音效 |
| 引擎与核心层 | `src/engine/mobaCore.js` | MOBA 5v5 状态机、帧循环、技能施放、碰撞物理与 `window.__moba` 调试接口 |
| 构建元数据层 | `src/platform/buildMetadata.ts`、`scripts/build-info.ts`、`vite.config.ts` | 生成包含 `version`、`revision`、`builtAt`、`sourceStatus`、`modified` 的 `dist/build-info.json` 并在编译期注入 `__BUILD_INFO__` |

对战加载时，`src/platform/matchAssets.ts` 与场景构建、WebGL 预热并行准备本局图片和字体。HUD 图片解码完成后才开始对局。下载或解码失败时保留当前阵容与已完成资源，在加载页退避重试。断网后等待网络恢复，也可以手动立即重试。

技能施放事件经 HUD 交给 `src/visuals/skillInk.ts` 绘制水墨笔势，不参与技能数值或命中判定。`src/engine/teamTactics.ts` 处理队友支援和局内指令；`scripts/patch-core-hooks.mjs` 为生成引擎接入 AI 与英雄专属音效钩子，`build-core.mjs` 重建时会自动应用。

程序化拨弦使用 SFX Brew 的 MIT 授权物理建模算法，许可见 `THIRD_PARTY_NOTICES.md`。音乐验收使用当前曲目累计调度的音符数，避免将乐句间的空队列误判为静音；六位英雄的三项施法音效通过离线渲染检查。

战斗、小地图与野区状态共用己方英雄、兵线和建筑的视野。草丛按同丛、近身或显形状态判断。移动镜头只改变观察位置，阵亡拖镜会保持观察点，复活后恢复跟随。

英雄的披风、披摆、长披帛、腰间飘带与发带按布料轻重分级调校：待机时靠弱弹簧与重力自然下垂贴腿，奔跑时向后拖曳并随步伐小幅起伏，急停、转身和出招后最多回摆一两次就静止，只随风轻摆不反弹。布料弹簧的刚度、阻尼与风力均按帧率归一，30/60/144Hz 下手感一致。

战场把会投下阴影的建筑和植被分成较小的区块。开启阴影时，裁剪范围也包含从镜头外投进画面的阴影。不透明景物先写入深度，地面只对露出的部分着色。持续低帧率会逐档降低 3D 渲染分辨率，帧率稳定回升后逐档恢复。HUD 始终按屏幕尺寸布局。

### 资产与辅助构建脚本（`scripts/`）

- `scripts/convert-art.mjs` / `scripts/sync-assets.mjs`：通过环境变量（`ART_SOURCE_DIR` / `TANGSONGPAI_PUBLIC_ASSETS`）或命令行参数转换立绘与字体资产至 `public/assets/`（CI 运行不需要外置素材仓）。
- `scripts/build-fonts.mjs`：基于 `subset-font` 生成常用汉字子集 `.woff2` 字体。
- `scripts/build-core.mjs`：从 `MOBA_MOTHER_HTML` 环境变量或上级母体包同步核心引擎模块（日常独立开发无需执行）。

## 二、可信校验门禁（Verification Gate）

[`scripts/verify-ci.mjs`](./scripts/verify-ci.mjs) 通过 [`scripts/check-runner.mjs`](./scripts/check-runner.mjs) 执行严格门禁；任何一步如果修改了已跟踪源码或工作区索引，门禁会立即判败：

- **`domain` 门禁**：`typecheck` → `test:deployment` → `verify:content`，输出 `shots/ci/domain.json`。
- **`browser` 门禁**：`build` → `verify:smoke`（`harness/verify.mjs`），输出 `shots/ci/browser.json`。
- **`all` 门禁**（发布前唯一门槛）：顺序执行 `['typecheck', 'test:deployment', 'verify:content', 'build', 'verify:smoke']`，输出 `shots/ci/all.json`。

## 三、不可变构建、GitHub Release 与零构建部署链路

发布流程坚持「**一次构建、逐字节校验、零构建上线**」原则：

```text
push to main
  └─► [candidate job] (.github/workflows/release-candidate.yml)
        1. python3 -B -m unittest discover -s tests -p 'test_*release*.py'
        2. npm run verify:ci -- --scope=all
        3. scripts/prepare-release-artifact.py
             ├─ 验证 shots/ci/all.json 通过、源码快照未变更、dist/build-info.json 为 clean
             └─ 生成 shots/deploy/<sha>/{dist.tar.gz, dist.tar.gz.sha256, manifest.json}
        4. scripts/verify-release-artifact.py 本地预检 + upload-artifact + download-release-candidate 回环校验
  └─► [publish job] (needs: candidate, if: refs/heads/main)
        1. 通过 artifact-id 下载同一候选包并再次验包
        2. scripts/publish-release.py：创建轻量 tag v<sha> → 创建 Draft Release 上传 3 件产物
           → 下载远端草稿产物逐字节比对（filecmp） → 确认 main 未移动 → 晋升为正式 latest Release
  └─► [边缘接收节点] (cron: /usr/local/bin/tangsong-glory-autodeploy.sh)
        1. 拉取 origin/main 最新 40 位 SHA；与 deployed-revision 一致则直接退出
        2. 仅当存在对应 v<sha> 正式 Release 且资产完整时下载并调用 verify-release-artifact.py 安全解包
        3. 通过 Cloudflare Pages Direct Upload API（tangsong-glory-upload-cloudflare.py）部署增量资产
        4. 检查公网 https://t.hp666.cc/build-info.json 与 / 返回预期 revision 且 HTTP 200；若超时不健康则自动回滚上一生产版本
```

### 发布安全单元测试（`tests/`）

- `tests/test_release_candidate.py`：校验包缺失步骤拦截、损坏压缩包拦截、目录穿越路径（`../outside`）拦截、符号链接拦截及错误 commit 拦截。
- `tests/test_publish_release.py`：通过 Fake GitHub API 验证字节对比失败不转正、`main` 漂移不转正、草稿恢复与 tag 严格对齐。
- `tests/test_release_workflow.py`：校验复合下载动作的 `artifact-id` 正则边界与 3 次有界隔离重试结构。
- `tests/test_artifact_receiver.py`：校验生产接收端不信任草稿/错位 tag、验包失败不调用 Pages API、公网未就绪时保持 pending 以及异常时仅回滚匹配的异常版本。
