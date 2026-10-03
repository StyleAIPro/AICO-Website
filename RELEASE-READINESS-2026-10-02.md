# AICO 2.0 发布准备 · 2026-10-02

> 本文件保留当日检查证据；其中“未发布/待上传”是当时状态。当前 beta0.1 与官网已发布，现行发布步骤和未完成项见 [README](README.md)。

当前结论：已修复本轮复现的问题并准备本地候选包，尚未达到正式公开发行条件。没有推送官网、上传 GitCode 附件、生成生产签名或升级用户日常 Profile。不得以本文件将开发版本宣传为稳定版。

## 固定产品与宿主

原装 anywhere-labs 社区版 DSH Desktop **2.0.13**，配套 DSH **0.1.5-rc.2**。不更新或修改宿主。Windows 执行 Agent、工具和业务；WSL 仅作为模型通信网关，macOS 暂缓。

| 产品 | 本轮候选 | 文件 |
| --- | --- | --- |
| Harness | 2.0.0-dev.61 | `.verification/release-readiness-20261002/final-packages/aico-harness.tgz` |
| Wiki | 0.1.0-alpha.31 | `.verification/release-readiness-20261002/final-packages/aico-wiki.tgz` |
| PPT | 0.1.26 | `AICO-PPT/dist/aico-ppt-skill-0.1.26-win32-x64.tgz` |
| Profile | 0.2.24 | `aico-profile/dist/aico-profile-0.2.24-win32-x64.tgz` |

路径相对于 AICO-2.0。使用 PPT／Profile 完整 Windows 包，不以同目录基础包替代。包摘要、字节数与发布条件见同一验证目录下的 `candidate.json`；该文件不是签名发行索引。签名组装会给 Harness 注入正式发现配置并改变包摘要，最终安装验收必须针对组装后的包重新核对。

旧 `upstream-pristine/dsh-desktop` 仍是部分测试的只读依赖，不代表日常 Desktop 版本。2.0.13 来源材料与安装回执保留在 `.migration`；本轮未改变任何原装源码。

## 已修复

1. Harness 服务身份不再硬编码旧 dev.40，改为读取随包清单版本；源码、锁文件、打包示例与中英文总览已同步。
2. Harness 清单原来同时存在 `bundledDependencies` 和 `bundleDependencies`，真实包会被归档校验拒绝。保留单一规范字段；不放宽拒绝冲突或替换宿主依赖的检查。
3. Wiki 的单会话明确请求在来源忙碌时持久等待，结束后继续；重启恢复、等待期间新增正文和取消均有回归。日常会话事件不会自动对所有来源调用模型。
4. Wiki 不再用不包含本次来源的活动任务冒充受理；不同范围返回 REFRESH_BUSY / accepted=false，可等当前任务完成后重试。同范围同模式保持复用。
5. 历史文本在冻结、来源文件写入与模型请求之前遮蔽引号键、环境变量、认证头、Cookie 和 PEM 私钥。未删除或重写既有历史快照与用户知识。
6. 官网解析器按渠道 URL 识别 preview／stable，开发者状态展示真实渠道，本地预览保持所选渠道；原有摘要、来源、时效及网站核验记录要求保留。
7. 更新总览、迁移表和开发说明中的旧版本、已实现图片传输及旧 WSL executor 描述。旧时间线保持历史含义。

## 本轮验证

- Harness 组件：326 通过、3 跳过；依赖字段修复后，归档、打包、组装、发布边界及资格脚本定向回归 21 项通过。
- Wiki：Linux 首轮 140 通过；Windows Node 24.19.0 最终 140 通过。
- Windows 原装 DSH 控制器／插件注册／卸载及 Chromium 执行页面：3 项通过。模型是受控适配器，不冒充真实模型验收。
- Windows 原装模块加载器、三个业务 Client 视图共存与卸载、版本身份：1 项通过；3 个 DSH 模块字节与原始归档比对。JSDOM／React 属于测试依赖，测试不修改宿主。
- 官网：71 通过、17 跳过。跳过项仅针对此前已移除的 v7/v8/v9 历史设计原型，当前 v21、发布页、241 帧及打包动画字节一致性仍执行；原 v15 帧测试已指向当前 v21。
- Harness／Wiki 新包、PPT／Profile 完整 Windows 包均执行普通插件归档检查；具体摘要在 `candidate.json`。
- Windows 原装 Desktop 2.0.13 的 CLI 使用上述四个精确候选包完成隔离 Profile 安装、文件逐项核对、反向卸载，原装 bundles 和测试数据保留，1 项通过（约 67 秒）。日志 `stock-package-install.log`；不等同日常 Desktop 窗口或双模型连接验收。

日志在 `../.verification/release-readiness-20261002/`。10 月 2 日更早的真实模型联测仍见 `../.verification/model-business-20261002/README.md`：它使用 Harness dev.60／Wiki alpha.29，不能替代本轮修复包的全部验收。

## 正式发布尚缺

1. **WSL 通用交付**：包仍默认 Ubuntu-26.04/root，依赖预先准备的 Linux Node 和所选用户模型依赖目录；独立模型 worker 依赖准备、发行版／用户选择仍未交付。不允许要求用户安装完整 Linux DSH 代替，也未将此需求删除。
2. **同一最终包联合验收**：最终带签名发现配置的 Windows 包，在同一 Windows 工作区验证本机／WSL 流式响应、取消、Windows 工具回传、三业务、原装插件共存、升级与卸载清理。本轮组件、归档、隔离 CLI 和历史实测不能拼接成已完成。
3. **正式发行身份与签名**：确认最终版本、GitCode Release 位置、生产 Ed25519 密钥与受信公钥；不复用 `.migration/local-release*-private` 的临时测试签名。当前仓库存在大量既有未提交工作，正式源码需要形成可追溯提交／标签；本轮没有替用户提交其他工作。
4. **公网链路**：本轮匿名检查官网首页 HTTP 200，但 install.html、preview/stable channel 均为 HTTP 404。需部署安装页与签名索引、上传真实附件并匿名重新下载校验，之后才生成匹配的 website-ready 记录。
5. **当前环境业务限制**：此前 RAG 远端联测被内网阻断；图片模型、远程 SSH、真实大型 Profile 等未测范围仍按各专项记录处理，不能在正式说明中写成全量可用。

## 已有发布工具的执行顺序

1. 完成上述实现与验收，固定源码、版本、完整插件／资源包及摘要。
2. 使用 Harness 的 `scripts/assemble-release.mjs` 和真实生产配置生成附件及 stable 签名索引；示例配置仍不能直接运行。
3. 上传 GitCode Release 附件并下载核验；通过官网 `scripts/import-aico-release.mjs` 导入签名索引。
4. 发布 Pages 安装页及索引，执行 `scripts/verify-public-aico-release.mjs` 匿名核对所有附件。
5. 使用 `scripts/approve-aico-website.mjs` 重新核验并生成 website-ready，部署核验记录；将公开下载入口切换到 stable，并复测从官网下载安装的完整路径。

不得手写虚假的核验成功记录或提前启用下载链接。没有独立模型网关交付与最终包证据时，发布状态保持待完成。
