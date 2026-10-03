# AICO-Harness 综合实操视频

2026-09-29 完成：一个 103.5 秒视频已接入当前官网候选页面 `docs/index-next.html#harness-tools`。本次未推送公开站点，也未替换正式首页 `docs/index.html`。

## 实际操作与证据

在原装 DSH Desktop 2.0.13 与 AICO-Harness 2.0.0-dev.59 中执行并录制：

- 知识与基线：会话调用 aico-rag、aico-baseline，RAG 返回 5 条，基线 totalCount=33、returnedCount=2。
- 远程操作：使用用户指定服务器与明确批准的会话权限，执行 `npu-smi info`、`docker ps`；两条命令退出码均为 0，SSH_EXIT=0，演示终端已关闭。命令由 Windows 工具执行，保留 SSH 主机密钥检查。
- Wiki 与稼先：按用户要求分别发布“666”，插入对应页面截图，保存后重新打开正式详情核对。未改动其他文章。编辑与发布调用 DSH 生产浏览器工具；辅助操作包括调整窗口宽度、按本次内容回答原创属性，以及选中详情标签用于录制。

该视频证明上述开发版实际工作流，不代替完整安装、卸载、插件共存及两种模型连接方式的系统验收。

## 成片

| 时间 | 内容 |
| --- | --- |
| 00:00–00:07.5 | 知识库查询 |
| 00:07.5–00:23 | 基线数据查询 |
| 00:23–00:48.5 | SSH、NPU 状态与 Docker 容器 |
| 00:48.5–01:16 | DSH 指令、浏览器工具与 Wiki 发表 |
| 01:16–01:43.5 | DSH 指令、打开浏览器与稼先发表 |

Agent 输出与等待大幅快进，结果画面保留重点停留。视频内嵌中文字幕和中文合成旁白；按用户要求移除 Wiki、稼先片段的画面遮挡；登录密码与包含密码的原始录制不进入网站资源。每个功能以 1.5 秒黑底标题页开场，标题页不叠加上一段字幕。

资源：`docs/assets/videos/aico-harness-workflow-20260929.mp4`，同名 JPG 封面和 VTT 字幕；SHA-256 清单为 `recordings-harness-20260929.json`。保留原有 PPT、Profile 视频。

原片、工具审计、发布链接及制作工程位于仓库外 `AICO-Recording-Production/2026-09-29/`。查询与远程审计在 `harness-demo/`，综合剪辑方案为 `edits/harness-combined-v4.json`。私有会话原文不进入网站。

## 验证

- 最终 MP4 全量解码成功，103.5 秒、1920×1280、H.264、AAC 双声道 48 kHz；重点结果与固定字幕抽帧核对。
- `node scripts/build-story-template.mjs` 构建通过。
- `verify-next-phase-browser.mjs --real-videos`：三部视频在 1440 / 390 宽度下播放、定位、字幕像素、开启旁白、音量、全屏、关闭后焦点和滚动恢复均通过，无控制台错误。
- `verify-next-phase-browser.mjs --no-screenshots`：1440 / 768 / 390 / 320 宽度无横向溢出，场景切换、减少动态效果、离屏暂停通过。
- 用户当前浏览器实际打开综合视频，播放进度推进、duration=103.5、muted=false、readyState=4。

机器验证结果保存于制作目录 `evidence/harness-website-video-check.json` 和 `evidence/harness-website-layout-check.json`。

## 旁白发音修正

“去重资料”的“重”通过 SSML 语音别名明确读为 chóng，字幕保留“去重”。重生成查询旁白与综合音轨，并更新网站视频及缓存版本。

## 第三版补录

原装 DSH 的同一会话真实执行 NPU 与容器查询，保留命令输出、两个 exit=0 与 SSH_EXIT=0。Windows 终端已关闭。原片为 `raw/harness-06-npu-docker.mkv`，审计为 `harness-demo/remote-npu-docker-audit.json`；补录结果画面剪辑放大，容器结果延长停留供阅读。最终全片解码通过。

## 第四版对话与浏览器衔接

从同次双路原片补入 DSH 对话、发布要求与浏览器工具调用，随后衔接真实网页操作。Wiki 展示打开目录的对话记录、发布指令发送和浏览器接管；目录在录制开始时已经打开，不将其描述为重新启动浏览器。稼先展示发布指令、browser_open_tab 调用及目标页面加载。沿用已完成发布的素材，没有再次创建文章。新增镜头约 20 秒，等待依然快进。
