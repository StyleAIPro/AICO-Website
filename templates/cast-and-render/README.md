# 当前官网模板

当前官网由 `scripts/build-story-template.mjs` 生成三个 `*-next.html` 中间页，再由 `scripts/publish-beta-pages.py` 接入 Beta 清单并输出正式首页、安装页和开发者页。新版已经部署，v21 不再是“尚未上线的候选”。命令和发布检查见[网站 README](../../README.md)。

## 维护入口

- `story/content.html`：产品内容；`install-content.html`、`developers-content.html`：独立页面内容源。
- `story/split-pages.mjs`、`page-navigation.js`：三页拆分与导航。
- `story/style.css` 及当前生成器读取的专题 CSS：排版与各模块样式。
- `story/motion.js`、`natural.js`、`intro-settle-stable.js`：开场进度与自然滚动。
- `story/opening-loader.js`、`opening-preview.json`：弱网预览、高清帧加载和恢复。
- `story/next-phase.js`、`collaboration.js`、`wiki-demo.js`：实操视频及产品交互演示。

## 当前行为约束

保留白色 O-chip、旋转变金、组合成 AICO 的完整开场和三个落点，按钮可推进，用户输入可打断。后续章节自然滚动，保留 PPT/Profile 联动演示、Wiki 记忆流程示意与三段真实实操视频。交互示意不能称为后台真实操作。

媒体按需加载，切换/关闭暂停视频，保留键盘入口、手机排版及减少动态效果。原 241 帧高清素材保持不变；61 帧内嵌轻量预览确保网络未就绪时仍能连续呈现同一动作，高清就绪后在同一进度替换。

## 构建输入与旧实验

`archive/aico-material-v6.1/index.html` 是当前原始动画输入，不是可删的过期文档。标题图使用 `story/assets/intro.png` 和 `story/assets-v9/` 的四个产品字标；实际文件集合由 `scripts/beta-source-files.json` 固定。

v1–v20 等旧 HTML 和素材不作为当前编辑入口；本轮只清理失效说明，不删除仍被测试或构建引用的页面/素材。旧版本演进叙述已删除，不另建归档文档。
