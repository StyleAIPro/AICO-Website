"""Promote the approved story pages, adding the verified manual Beta catalogue."""
from pathlib import Path
import json,re,html
root=Path(__file__).resolve().parent.parent
docs=root/'docs'; catalog=json.loads((docs/'beta0.1.json').read_text())
old_install=(docs/'install.html').read_text()
for name in ['index','install','developers']:
 s=(docs/f'{name}-next.html').read_text().replace('<html lang="zh-CN">','<html lang="zh-CN" data-release-mode="manual-beta">')
 s=s.replace('../../docs/','./')
 for dest in ['index','install','developers']:s=s.replace(dest+'-next.html',dest+'.html')
 s=s.replace('功能按开发版说明展示 · 正式插件包待发布核验','Windows beta0.1 已发布 · 功能演示以开发版为准')
 if name=='install':
  for p in catalog['products']:
   pattern=r'(<article[^>]*data-component="'+re.escape(p['id'])+r'"[^>]*>)(.*?)(</article>)'
   def replace(m):
    body=m[2].replace('最新公开版 · 待发布','beta0.1 · Windows x64')
    a=body.index('<div data-component-latest>');b=body.index('<details class="component-history">',a)
    content=f'''<div data-component-latest><a class="button" href="{p['url']}">下载 beta0.1 ↗</a><p class="component-help">Windows x64 · {p['bytes']/1048576:.1f} MiB · 包内版本 {p['version']}<br>每个插件一个完整安装包。</p><div data-beta-command="{p['filename']}" class="component-command"><code>dsh plugin add "&lt;下载目录&gt;\\{p['filename']}" --ignore-scripts</code></div><details><summary>版本说明与 SHA-256</summary><p><a href="https://gitcode.com/{p['repository']}/releases/tag/beta0.1">查看发布说明 ↗</a></p><p style="overflow-wrap:anywhere">{p['filename']}<br>SHA-256：{p['sha256']}</p></details></div>'''
    return m[1]+body[:a]+content+body[b:]+m[3]
   s,n=re.subn(pattern,replace,s,flags=re.S);assert n==1,p['id']
  s=s.replace('<script type="module" src="./component-downloads.mjs"></script>','<script type="module" src="./beta-release.mjs"></script>')
  s=s.replace('请以本页下载核验结果为准。源码能力展示不代表正式交付；未通过版本、附件与发布核验的 AICO 插件不开放下载。macOS 暂未提供。','当前提供 beta0.1 公开测试版，四个 Windows 插件附件已通过匿名下载与 SHA-256 核验。完整 Desktop 业务联合验收和生产签名尚未完成；macOS 暂未提供。')
  s=s.replace('插件公开后，怎样执行安装命令？','怎样执行安装命令？')
  s=s.replace('<aside class="browser-setup-note">','<aside class="browser-setup-note"><p><strong>beta0.1 公开测试版：</strong>建议先使用本机模型连接。WSL 模型网关独立运行依赖尚未完整交付，新 WSL 环境暂不能即装即用。完整业务联合验收及生产签名尚未完成。</p>',1)
  faq=re.search(r'<details><summary>WSL 模型网关如何工作，需要准备什么？</summary>.*?</details>',old_install,re.S)
  if faq:s=s.replace('<details><summary>授权会从 Windows 自动带到 WSL 吗？',faq[0]+'<details><summary>授权会从 Windows 自动带到 WSL 吗？')
  s=s.replace('</head>','<style>.component-command input{display:block;width:100%;min-height:44px;margin:12px 0;padding:10px}.component-command pre{white-space:pre-wrap;overflow-wrap:anywhere}.component-command button{min-height:44px;padding:8px 14px;margin:12px 0}.component-card details{margin-top:16px}</style></head>')
 if name=='developers':
  rows=''.join(f'<tr><td><a href="https://gitcode.com/{p["repository"]}/releases/tag/beta0.1">{p["id"]}</a></td><td>{p["version"]}</td><td><a href="https://gitcode.com/{p["repository"]}/commit/{p["commit"]}">{p["commit"][:12]}</a></td></tr>' for p in catalog['products'])
  release=f'<div id="beta-release"><h3>beta0.1 源码与安装包</h3><p>每个插件仓库使用 beta0.1 标签，包内版本独立。<a href="./beta0.1.json">完整版本与校验清单 ↗</a></p><div class="table-wrap"><table><thead><tr><th scope="col">插件</th><th scope="col">包内版本</th><th scope="col">源码提交</th></tr></thead><tbody>{rows}</tbody></table></div><p class="note">四个 Windows 插件附件已通过匿名下载与 SHA-256 校验。完整 Desktop 业务联合验收及生产签名尚未完成；WSL 独立运行依赖仍待完整交付。</p></div>'
  s=re.sub(r'<p data-dev-release>.*?</p>',lambda _:release,s,count=1)
  s=s.replace('源码可供开发参考 · 可复现发布组合待提供','beta0.1 · 源码标签与 Windows 安装包已发布')
  s=s.replace('正式组合需要切换到发布清单指定的 tag / commit。当前尚未发布包含源码提交、依赖与资源版本的完整清单，无法承诺外部开发者复现同一交付版本。下面命令用于本地开发；正式安装请使用安装页通过核验的包。','复现 beta0.1 源码时，请在各仓库切换到 beta0.1 标签；具体提交与包内版本见下方“验证与发布”。下面命令用于本地开发，安装请使用安装页已核验的 Windows 包。')
 (docs/f'{name}.html').write_text('\n'.join(line.rstrip() for line in s.splitlines())+'\n')
files=json.loads((root/'scripts/beta-site-files.json').read_text())
files=[p for p in files if not p.startswith('docs/assets/')]
assets=set()
for name in ['index','install','developers']:
 assets.update('docs/'+ref for ref in re.findall(r'''["']\./(assets/[^"'?]+)''',(docs/f'{name}.html').read_text()))
for ref in assets:assert (root/ref).is_file(),ref
files+=['scripts/publish-beta-pages.py']+sorted(assets)
(root/'scripts/beta-site-files.json').write_text(json.dumps(sorted(set(files)),indent=2)+'\n')
