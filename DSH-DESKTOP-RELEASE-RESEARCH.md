# DSH Desktop 发布版本调查

核实日期：2026-09-20。只使用项目发布页、GitHub API 与固定 tag 源码。本次未下载安装器、未运行安装验收、未修改原装工作区。

## 结论

DSH Desktop 已有项目维护方发布的 Windows 安装器。建议以 **DSH Desktop v2.0.13 稳定通道 Windows x64 原版安装器**作为下一轮 AICO 适配候选，完成实机验收后才标记“AICO 已验证”。这是设计建议，并非已验证兼容的结论。

“官方”应限定为 **DSH Desktop 项目维护方原版**：该项目在发布说明中明确声明由社区维护，不是 DeepSeek 官方产品。官网宜显示“下载 DSH Desktop 原版”，并标明来源 anywhere-labs。见[稳定版发布说明](https://github.com/anywhere-labs/dsh-desktop/releases/tag/v2.0.13)。

## 维护方当前发布

| 项目 | 稳定通道 | Beta 通道 |
| --- | --- | --- |
| Desktop tag | v2.0.13 | v2.0.13-beta.1 |
| GitHub prerelease | false，Latest | true |
| 发布时刻（UTC） | 2026-09-19 12:36:53 | 2026-09-19 12:36:51 |
| 发布时刻（北京时间） | 2026-09-19 20:36:53 | 2026-09-19 20:36:51 |
| 内置 DSH | 0.1.5-rc.2 | 0.1.6-alpha.2 |
| 默认数据目录 | `~/.dsh` | `~/.dsh-beta` |
| Desktop commit | `a7825021a227bc5776525996fc5a794b23d707ac` | 相同 |

来源：[最新稳定版 API](https://api.github.com/repos/anywhere-labs/dsh-desktop/releases/latest)、[Beta API](https://api.github.com/repos/anywhere-labs/dsh-desktop/releases/tags/v2.0.13-beta.1)、[稳定版说明](https://github.com/anywhere-labs/dsh-desktop/releases/tag/v2.0.13)、[Beta 说明](https://github.com/anywhere-labs/dsh-desktop/releases/tag/v2.0.13-beta.1)。稳定 Desktop 内部的 DSH 仍是 RC，不能把它写为“所有组件都是正式稳定版”。

### Windows 安装器

稳定版：

- 文件：`DSH-Desktop-2.0.13-x64-Setup.exe`
- 大小：156,056,465 bytes。
- GitHub API 所列 SHA-256：`3aa0c75b891470d1621f5589574530c7509b68d854859b059164fbfb7cd93490`
- [原版固定下载地址](https://github.com/anywhere-labs/dsh-desktop/releases/download/v2.0.13/DSH-Desktop-2.0.13-x64-Setup.exe)

Beta：

- 文件：`DSH-Desktop-Beta-2.0.13-beta.1-x64-Setup.exe`
- 大小：301,673,620 bytes。
- GitHub API 所列 SHA-256：`1424579259baff418d844c0559f529eeddb45d6b6bf1179c0a81bdc206abaaad`
- [原版固定下载地址](https://github.com/anywhere-labs/dsh-desktop/releases/download/v2.0.13-beta.1/DSH-Desktop-Beta-2.0.13-beta.1-x64-Setup.exe)

以上文件名、大小、摘要来自各通道发布 API，尚未通过下载后本地计算复核。上游同时提供 macOS 资产，但 AICO 当前 macOS 交付仍暂缓。上游发布说明提供 ModelScope 镜像，可作为网站的辅助入口；正式 AICO 推荐入口须绑定固定版本，不使用动态 `latest/download` 自动漂移。

## 开发者必须区分的源码绑定

同一个 Desktop commit 中同时维护 Stable 与 Beta。各自 `package.json` 明确指定不同 DSH 依赖：

- [Stable package.json](https://github.com/anywhere-labs/dsh-desktop/blob/v2.0.13/dsh-plugin-desktop/package.json)：`@deepseek-ai/dsh = 0.1.5-rc.2`。
- [Beta package.json](https://github.com/anywhere-labs/dsh-desktop/blob/v2.0.13/dsh-plugin-desktop-beta/package.json)：`@deepseek-ai/dsh = 0.1.6-alpha.2`。

运行时来源由 Desktop 仓库 vendor 清单记录：

| 通道 | DSH 版本 | vendor manifest 记录的源 commit |
| --- | --- | --- |
| Stable | 0.1.5-rc.2 | `fb2c4b9e698e30edb738bca4cf0618587db7d203` |
| Beta | 0.1.6-alpha.2 | `ddefc45fbc7f8e46dd73185e68295696d1297887` |

来源：[Stable runtime manifest](https://github.com/anywhere-labs/dsh-desktop/blob/v2.0.13/vendor/dsh-runtime/0.1.5-rc.2/manifest.json)、[Beta runtime manifest](https://github.com/anywhere-labs/dsh-desktop/blob/v2.0.13/vendor/dsh-runtime/0.1.6-alpha.2/manifest.json)。这些是维护方声明的源版本信息，本次未验证二进制可重现性。

**不能直接把 Desktop 的子模块 SHA 当作 Stable 运行时 SHA。** v2.0.13 的 `deepseek-harness` gitlink 指向 `ddefc45fbc7f8e46dd73185e68295696d1297887`，对应 Beta 清单。见[固定 tag 子模块元数据](https://api.github.com/repos/anywhere-labs/dsh-desktop/contents/deepseek-harness?ref=v2.0.13)。此外，[根 package.json](https://github.com/anywhere-labs/dsh-desktop/blob/v2.0.13/package.json)通过 resolutions 选择 vendor 包及维护方补丁；因此真实原版发行安装器才是验收对象，不能只用独立 DSH 源码启动代替。

本地只读查询发现 `upstream-pristine/dsh-desktop` 当前 HEAD 为 `d61b6f9614ed070b1f3ddcca3f08f80ac929b5ea`，与此次最新发行 commit 不同。下一轮应另建固定发行版验证环境，保留现有已验收固定工作区，不把既有验证结果自动继承到 v2.0.13。

## 网站落地建议

普通用户页签显示一套已验证组合：Desktop 原版安装器、匹配的 AICO-Harness 插件、业务插件及资源。Desktop 直接链接维护方固定资产；若未来需要 AICO 镜像，应保留原文件、来源和 SHA-256，不重打包为 AICO 宿主。当前 v2.0.13 只能显示“适配候选 / 待验证”。

开发者页签记录精确绑定：Desktop tag/commit/资产 hash、内置 DSH 版本与 vendor 源 commit、AICO-Harness tag/commit、各业务插件 tag/commit、资源版本、接口能力及验收报告。Beta 单列实验兼容行，避免用户认为两种通道可互换。

适配验收至少包括：原版 Windows 安装、AICO 插件安装与卸载、原装插件共存、真实 PPT/Profile/Knowledge 流程、本机/WSL 模型连接切换、流式响应和取消、WSL 模型工具调用在 Windows 执行，以及升级后数据保留。此处列的是下一轮工作范围，本次调查没有完成这些验收。

### 维护方国内镜像补充

稳定版发布正文给出的 [ModelScope Windows x64 镜像](https://modelscope.cn/models/t4wefan/deepseek-harness-desktop/resolve/master/DSH-Desktop-2.0.13-x64-Setup.exe)，文件名同为 `DSH-Desktop-2.0.13-x64-Setup.exe`。该链接的路径使用 `master`；本次仅确认维护方发布正文提供此链接，未下载比对镜像字节。纳入 AICO 推荐组合前，镜像下载内容必须与 GitHub 资产 SHA-256 `3aa0c75b891470d1621f5589574530c7509b68d854859b059164fbfb7cd93490` 比对一致；不能把这个预期摘要表述为已验证的镜像摘要。
