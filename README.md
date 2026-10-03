# AICO 官网

当前公开版本 **beta0.1**。官网在 [GitHub Pages](https://styleaipro.github.io/AICO-Website/)，从 `main` 分支 `/docs` 部署。四个插件分别在 GitCode Release 提供一个完整 Windows x64 安装包；附件不放进网站仓库。

## 当前页面与版本

- `docs/index.html`：当前新版首页，包含品牌开场、产品演示与实操视频。
- `docs/install.html`：下载、依赖、安装命令及 WSL 模型网关说明。
- `docs/developers.html`：原装宿主开发边界、源码标签与验证范围。
- `docs/beta0.1.json`：已匿名回下载核验的附件、SHA-256、包内版本和源码提交。

页面使用 `manual-beta`，`beta-release.mjs` 只增强命令编辑和复制，关闭 JavaScript 仍能下载。固定原装社区版 Desktop 2.0.13 + DSH 0.1.5-rc.2；不发布修改版宿主。WSL 只连接模型，macOS 暂缓。生产签名自动安装渠道和最终包联合验收尚未完成，后续渠道维护见 [SIGNED-RELEASE.md](SIGNED-RELEASE.md)。

## 编辑与生成

当前源码入口为 `templates/cast-and-render/story/`，构建说明见[模板说明](templates/cast-and-render/README.md)。页面样式与运行脚本由生成器组合并内联；`docs/site.css`、`site-motion.js` 不是当前三页的主要维护入口。

运行环境：Node.js 22+、Python 3。已有轻量开场数据可直接构建；只有修改原开场时才需要 Pillow 重新生成预览。

```bash
node scripts/build-story-template.mjs
python3 scripts/publish-beta-pages.py
node --test tests/opening-assets.test.mjs tests/split-pages.test.mjs tests/install-command.test.mjs tests/official-content.test.mjs tests/repository-links.test.mjs
node scripts/serve-preview.mjs 8766
```

预览 `http://127.0.0.1:8766/docs/index.html`。第一条命令生成 `v21.html` 与三个 `*-next.html` 中间页；第二条接入真实 Beta 清单，生成正式三个入口。发布时使用正式入口，不把中间页或旧网站直接覆盖线上。

修改开场原素材后，先运行 `python3 scripts/build-opening-preview.py`。开场使用原版动画的内嵌轻量预览，高清帧后台加载；保留预览与原始素材摘要校验。不要通过跳到末帧或关闭动画解决首次加载问题。

## 源码、资源与部署

`scripts/beta-source-files.json` 列出当前生成所需的源码、原始素材、文档与基础检查；`scripts/beta-site-files.json` 是最终部署文件集合，包含这些源文件和页面实际引用资源。此前 main 只发布页面产物、缺少生成器的问题由这份明确的源码清单补齐；推送 main 时必须一并带上清单内文件。

每次发布前，在空目录按清单复制文件，按上面的命令完成生成与检查，确认没有依赖工作区外的文件。原始开场 `templates/cast-and-render/archive/aico-material-v6.1/index.html` 虽然路径含 archive，仍是生成器的实际输入，必须保留。无需把所有旧实验页面、渲染缓存或原片加入部署。

发布顺序：修改源码/元数据 → 生成 → 自动检查与本地浏览器检查 → 将清单中的变更提交并推送 main → 等待 Pages 成功 → 核对公网三页和下载链接。保留 `.nojekyll` 及项目子路径。二进制 Beta 附件和既有标签不可覆盖；网站文档更新不等于插件重发。

浏览器验收包含前两段开场、反向滚动、弱网、手机、减少动态效果、视频打开/关闭与下载命令。`verify-opening-continuity.cjs` 会阻断高清请求并检查实际画布像素；执行前准备该脚本所需的 Playwright/浏览器路径，不能只用加载成功证明动效连续。

## 文档维护

已完成改版计划、旧信息架构和交接清单直接删除。当前使用规则保存在本页与模板说明；视频来源/制作记录、原装 Desktop 来源研究和版本化发布检查记录保留其证据范围。记录里的“当时未发布”是历史观察，当前发布状态以本页及 Beta 清单为准。
