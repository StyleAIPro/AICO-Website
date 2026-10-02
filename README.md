# AICO 官网发布件

当前公开版本为 **beta0.1**：四个插件各自在 GitCode 仓库 Release 发布一个 Windows 安装包，官网 `docs/install.html` 提供手动下载、安装命令、包内版本和 SHA-256。`docs/beta0.1.json` 记录已通过匿名下载校验的附件和源码提交。首页、安装页和开发者页使用明确的 `manual-beta` 模式，不读取尚未发布的签名渠道，也不宣称自动安装或稳定版验收已完成。

本次页面部署文件为 `scripts/beta-site-files.json` 所列生产页面、运行脚本及发布说明；历史素材继续使用线上已有文件。`*-next.html` 与 templates 为独立设计候选，不随本次主页面更新。

下文的 schema 3 导入、签名和公网校验流程保留用于后续签名目录发布；Beta 手动下载清单不作为客户端受信任的自动安装索引。


> 当前产品口径（2026-09-19）：平台只分 Windows／macOS，macOS 暂缓。Windows Harness 内含可选 WSL 模型网关，业务插件和运行时只准备 Windows；不发布 Linux 业务平台包或修改版宿主。README 描述源码机制，不能替代当前最终包验收与匿名公网发布回执。

本仓库只托管 AICO 官网静态发布文件，使用 GitHub Pages 从 `main` 分支的 `/docs` 发布。

- [AICO-Harness 源码](https://gitcode.com/AICO-Ascend/AICO-Harness-Plugin)
- [AICO-PPT 源码](https://gitcode.com/AICO-Ascend/AICO-PPT)
- [AICO-Profile 源码](https://gitcode.com/AICO-Ascend/AICO-Profile)
- [beta0.1 插件下载](https://styleaipro.github.io/AICO-Website/install.html)

官网首页、Windows 安装指南、开发者页和历史记录在本仓库维护；历史发行素材由 AICO-Harness 的 `scripts/aico/release-hosting.mjs` 生成。本仓库不保存产品源码、安装包或私有发布配置。

更新发行时核验并同步元数据和媒体，保留 `.nojekyll`、本仓库首页与 `install.html`，不要用旧版生成器覆盖新下载流程。媒体路径相对于网页，支持 Pages 项目子路径。官网、文档和签名版本索引统一使用现有 GitHub Pages 站点。

AICO 2.0 分为 AICO-Harness 适配插件与独立业务插件两条产品线。当前 beta0.1 使用原装 DSH Desktop 2.0.13，通过原装插件机制安装，不发布修改版宿主。Windows x64 插件采用手动下载，安装页列出四个 GitCode 附件与校验值；macOS 暂缓。`docs/beta-release.mjs` 仅增强安装命令编辑与复制，关闭 JavaScript 仍能下载。`docs/aico-release.mjs` 的签名渠道加载器在明确标记的手动 Beta 页面不启动，继续保留供后续签名渠道使用。

新 schema 3 签名发现文档保存在 `docs/aico/channels/` 和 `docs/aico/releases/`，不覆盖历史 `docs/release.json`。只有经过构建、平台验收及下载验证的附件才进入签名索引和可用下载按钮；不能用占位 URL 或未签名的占位索引宣称新发布已就绪。二进制附件存放 GitCode Release，不提交到 Pages 仓库。

发布者上传并重新下载核验全部 GitCode 附件后，使用网站仓库自带的导入器写入 Pages 源码：

```bash
node scripts/import-aico-release.mjs /安全位置/website-import.json
```

配置文件使用 schema 1，提供组装器的绝对 `sourceDirectory`（`site/`）、绝对 `artifactDirectory`（从 GitCode 重新下载的完整附件目录）、本站目标 `siteDirectory`（正式发布时为本仓库 `docs/aico`）、`https://styleaipro.github.io/AICO-Website/aico/`、`preview` 或 `stable`，以及由发布负责人独立配置的受信 Ed25519 公钥映射。工具验证 channel/snapshot 原始字节签名、时间、同源不可变路径、所有 GitCode URL、附件字节数和 SHA-256，并拒绝缺失、多余、链接或特殊文件。它先原子加入不可变 snapshot，再推进 channel；既有 release 不允许改写，既有 channel 只允许完全相同的幂等导入或更大的 sequence。私钥和二进制附件不会写入网站仓库。

Pages 部署完成后，必须匿名重新验证公网实际返回的字节：

```bash
node scripts/verify-public-aico-release.mjs public-verification.json
```

配置可从 [public-verification.example.json](public-verification.example.json) 复制，只填写正式 channel、渠道名、生产公钥路径和单附件上限。验证器匿名下载 channel、两份签名、snapshot 和其中声明的全部 GitCode 附件，检查 Ed25519、有效期、HTTPS、长度及 SHA-256，成功后在标准输出生成可保存的 JSON 回执。重定向只能继续使用 HTTPS；缺件、篡改、超限和 HTTP 降级都会失败。

公网复验完成后，运行 `node scripts/approve-aico-website.mjs /安全位置/public-verification.json docs/aico`。此命令会再次执行完整公网复验，再原子写入 `docs/aico/website-ready/<channel>.json`；将该文件部署到 Pages 后，网页仅在它与当前 channel 的 sequence、releaseId、channel SHA-256、snapshot SHA-256 全部匹配时启用插件下载。新 channel 推进后旧放行记录自动失效；同一 sequence 不允许用不同字节覆盖。放行记录只控制官网按钮，不替代签名索引、客户端验签或最终包实机验收。

旧版 AICO 0.1.x 附件属于历史发行记录。当前手动 Beta 版本由 `docs/beta0.1.json` 记录；未来自动安装渠道仍需独立的签名与验收流程。全站共用 `docs/site.css`；首页唯一的分步滚动展示由可在本地文件预览中执行的 `docs/site-motion.js` 驱动，并遵循浏览器“减少动态效果”设置。
