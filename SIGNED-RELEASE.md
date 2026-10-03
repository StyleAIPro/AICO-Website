# 后续签名渠道维护

当前 beta0.1 采用手动完整包下载，以下生产签名渠道尚未发布。工具和协议继续保留；不能把手动 Beta JSON 当作签名目录，不能因已有 Beta 附件而跳过验签或当前包资格检查。

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
