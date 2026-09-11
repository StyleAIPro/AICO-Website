# AICO 官网发布件

本仓库只托管 AICO 官网静态发布文件，使用 GitHub Pages 从 `main` 分支的 `/docs` 发布。

- [AICO-Harness 源码](https://gitcode.com/AICO-Ascend/AICO-Harness)
- [AICO-PPT 源码](https://gitcode.com/AICO-Ascend/AICO-PPT)
- [AICO-Profile 源码](https://gitcode.com/AICO-Ascend/AICO-Profile)
- [安装包与独立 Skill 下载](https://gitcode.com/AICO-Ascend/AICO-Harness/releases)

官网生成器维护在 AICO-Harness 的 `scripts/aico/release-hosting.mjs`；本仓库不复制产品源码、安装包或私有发布配置。

更新时先由产品发布流程生成并验收网站，然后将 `index.html`、`release.json` 和 `media/` 同步到 `docs/`，保留 `.nojekyll`。媒体路径相对于网页，支持 Pages 项目子路径。`edgeone.json` 为原托管平台专用配置，不在此发布。

当前版本：Harness 0.1.0-alpha.2、PPT 0.1.8、Profile 0.2.6。录屏来自真实插件操作，Profile 演示使用合成数据。下载链接与 SHA-256 保留 GitCode 已验证发布记录。
