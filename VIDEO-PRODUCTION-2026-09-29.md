# PPT / Profile 实操视频交付（本地候选）

录制日期：2026-09-29。原装 DSH Desktop 2.0.13；已安装的 PPT 0.1.26、Profile 0.2.24。两段素材来自真实插件操作，主页面原有 HTML 动效继续作为功能示意，实操视频从独立入口在同页弹窗播放。

| 视频 | 时长 | 内容 |
| --- | --- | --- |
| [PPT](docs/assets/videos/aico-ppt-workflow-20260929-v2.mp4) | 1:16 | 创建项目、需求确认、两章大纲、五页规划、生成启动与初版；修改模式三处框选、分别填写要求、一次发送同一批次；三项完成、撤销/重做、固化、全屏与可编辑 PPTX 导出 |
| [Profile](docs/assets/videos/aico-profile-workflow-20260929-v2.mp4) | 0:46 | 导入公开示例 Trace、概况与泳道、手选事件、读取选区、联动定位与详情、起点前后各 1 ms 的连续缩放、人工恢复全局 |

## 剪辑与字幕

- H.264 / AAC MP4，1920 × 1280 / 30 fps。上下留出剪辑说明和字幕空间，不拉伸原始画面。
- 中文合成旁白已混入 AAC 音轨；中文字幕永久压入画面，播放和全屏均不依赖字幕轨。保留独立 [PPT VTT](docs/assets/videos/aico-ppt-workflow-20260929-v2.vtt) / [Profile VTT](docs/assets/videos/aico-profile-workflow-20260929-v2.vtt) 供取用，网页不重复叠加。点击“播放并开启旁白”会取消静音、设为正常音量并开始播放，播放中可暂停或使用原生音量控制。
- 第二版按旁白重新剪辑：PPT 从 190 秒压至 76 秒，Profile 从 117 秒压至 46 秒。Agent 输出、输入和等待大幅快进或剪除；三次圈选和一次批量发送均保留。三个文字修改的瞬间各留 5 秒原速并裁切放大右侧；Profile 两次真实缩放分别留 7 秒、8 秒原速。快进显示实际倍率，等待剪除有标识。
- PPT 创建原片的录制进程中断，因此生成启动之后以“生成与验证等待已省略”切至同一份文稿的真实初版画面，不声称是不中断的全程录像。导出结束使用同次实操的结果截图，画面明确注明“实机结果截图”。
- 自动提示里的本地连接参数完整遮挡，公开候选只包含成片、封面、字幕；原片、工具日志和私有连接状态均留在仓库外的制作目录。
- Profile 使用仓库公开测试 Trace 的独立副本；数据不是性能基准，视频不据此宣称性能收益。首次展开泳道的未确认调用不当作已验证控制；录入的是后续实际可见状态，以及返回 verified 的定位与缩放。

## 实操结果核对

PPT Draft 最终为 revision 19 / ready，需求、大纲、页面规划均有确认版本。三个标注属于同一个 Agent 批次，三项均 completed；最终编辑状态 revision 11、一个固化检查点、三条固化操作。导出的 PPTX 已实际保存并通过 ZIP 完整性检查（五个 HTML 页面，目录的独立层使导出为六张幻灯片）。

Profile 实际执行了 analyze、读取当前事件、investigate（navigation=verified）和控制缩放（confirmation=verified），并在录屏中手动 Reset 恢复全局。

## 网页与检查

视频清单在 `templates/cast-and-render/story/next-phase.js`，构建命令：

```sh
node scripts/build-story-template.mjs
node scripts/serve-preview.mjs 8766
```

打开 `http://127.0.0.1:8766/docs/index-next.html#ppt` 或 `#profile`。使用带字节范围响应的预览服务器，保证原生播放器可拖动进度条；普通不支持 Range 的静态服务器可能只能从头播放。

```sh
node scripts/verify-next-phase-browser.mjs http://127.0.0.1:8766/docs/index-next.html --real-videos
node scripts/verify-next-phase-browser.mjs http://127.0.0.1:8766/docs/index-next.html --no-screenshots
```

实片检查覆盖 1440 / 390 px：媒体按需加载、键盘入口、原生模态焦点、播放暂停、准确跳转到指定片段、烧录字幕像素、旁白按钮取消静音并恢复音量、音量/静音、全屏、关闭后卸载、恢复触发按钮焦点与滚动位置。页面回归覆盖 1440 / 768 / 390 / 320 px、桌面左右布局、无横向溢出、动画暂停/继续、离屏暂停和减少动态效果。实际截图已核对。第二版使用 `-v2` 新资源地址，避免复用旧视频缓存；旧版源成片保留供回溯。音轨解码与响度检查不能代替用户设备扬声器的听感确认。

当前拆页、正式内容、安装与开发者的 9 项相关测试通过。额外尝试的旧 `story-template.test.mjs` 依赖缺失的历史 `v7.html`，无法运行；没有用当前页面替造历史文件。真实手机硬件和其他浏览器未另行测试。

只更新候选页面 `docs/index-next.html` 和候选模板，未替换正式首页、未提交或推送、未发布 GitHub Pages。录屏及 DSH Desktop 控制已结束。
