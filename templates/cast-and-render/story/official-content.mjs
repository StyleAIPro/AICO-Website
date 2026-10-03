// Product claims are based on the workspace READMEs, not release qualification.
export function officialContent(html) {
  const swaps = [
    ['<p class="eyebrow">Objects studio <span>&middot;</span> No. 112 Render Lane</p>',''],
    ['Built at four.<br />Out by seven.','从一个想法，<br />到一份成果。'],
    ['Six kinds of mesh, one render farm, and a queue that starts before the sun does.','在原版 DSH Desktop 中连接 AI 对话与专业工具。<br>让创作、分析和工作记忆，围绕同一项工作展开。'],
    ['View the reel','探索 AICO'],
    ['<p class="eyebrow">Across the studio</p>',''],
    ['Flat, never bent.','让工具，接住想法。'],
    ['The mesh should still be clean when it reaches the viewport. We export to order, never before.','内网知识查询、发 Wiki、发稼先，<br>写 PPT、分析 Profiling 性能、积累零散知识经验。'],
    ['Tour our space','了解产品'],
    ['<p class="eyebrow">The surface</p>',''],
    ['Smooth enough to<br />hold a light pass.','不止于对话，<br />更能完成工作。'],
    ['Custom surface shaders whipped every morning, spread to the edge and weighed by the quarter pound.','与 AI 一起创作、分析，把想法变成实际成果。<br>随时查看、修改，让成果真正用起来。'],
    ['Start a brief','查看安装指引'],
    ['<footer class="foot">112 Render Lane &nbsp;&middot;&nbsp; Tue–Sun, 9am till sold out</footer>',''],
    ['Loading studio film','正在加载 AICO 开场'],
    ['LOADING ','加载 '],
    ['href="#board"','href="#harness"'],
    ['href="#visit"','href="#harness"'],
  ];
  for(const [from,to] of swaps) html=html.replaceAll(from,to);
  // The opening is a sequence, not a shortcut to the lower product chapters.
  html=html.replace('<a class="pill" href="#harness">探索 AICO</a>','<a class="pill" href="#studio-title" data-intro-stop="1">探索 AICO</a>')
    .replace('<a class="pill" href="#harness">了解产品</a>','<a class="pill" href="#surface-title" data-intro-stop="2">继续探索</a>')
    .replace('<a class="pill" href="#install">查看安装指引</a>','<a class="pill" href="#harness">探索产品</a>');
  // One primary heading; retain the original animation selectors and typography.
  html=html.replace(/<h1 id="(studio|surface)-title">([\s\S]*?)<\/h1>/g,'<h2 class="opening-heading" id="$1-title">$2</h2>');
  const details={
    harness:[['常驻工作台','通过原版插件接口连接业务视图与会话，保留原装插件。'],['模型连接可选','使用本机连接，或通过 WSL 连接模型；Agent、工具和文件仍在 Windows。'],['插件与资源管理','集中查看 AICO 插件与资源状态。可用版本请查看安装页。']],
    ppt:[['从材料开始','围绕汇报、授课、技术分享、任职材料和项目评审组织演示。'],['边讨论，边编辑','支持区域标注、直接文字编辑、移动缩放，以及撤销与重做。'],['演示与交付','预览 HTML 演示，导出可编辑或高清图片模式的 PPTX；导出后仍需核对版式。']],
    profile:[['选区就是上下文','在 MindStudio Insight 中选择事件或区间，再发起分析。'],['沿证据定位','查询真实后端数据，定位事件、查看详情，核对计算与通信关系。'],['随时接管视图','联动定位可暂停；也可使用直接定位，避免干扰手动操作。']],
    wiki:[['主题 Wiki','通过 Markdown、双链、来源和局部关系图，阅读与维护工作知识。'],['个人画像','从授权用户会话中整理性能要求、格式偏好与工作习惯。'],['记忆由你控制','可纠正内容、不再记忆或暂停整理；无需预先创建知识库。']]
  };
  for(const [id,items] of Object.entries(details)) {
    const pattern=new RegExp(`(<section class="story-chapter [^"]+" id="${id}"[\\s\\S]*?<p class="story-lead">[\\s\\S]*?</p>)`);
    if(!pattern.test(html)) throw new Error('Missing product detail seam: '+id);
    const list='<dl class="capability-list">'+items.map(([title,copy])=>`<div><dt>${title}</dt><dd>${copy}</dd></div>`).join('')+'</dl><p class="product-availability">'+(id==='wiki'?'独立插件 · 下载状态见安装页':'功能按开发版说明展示 · 正式插件包待发布核验')+'</p>';
    html=html.replace(pattern,match=>match+list);
  }
  const wikiStart=html.indexOf('<section class="story-chapter wiki-chapter"');
  const wikiEnd=html.indexOf('</section>',wikiStart);
  let wiki=html.slice(wikiStart,wikiEnd);
  for(const [from,to] of [
    ['让这次讨论，<br>成为下次的起点。','让工作经验，<br>成为下一次的起点。'],
    ['从空库开始，把资料、会话和知识页连接起来。审阅之后再沉淀，让知识逐渐属于你。','从授权会话中持续整理主题知识与个人画像。让有用的经验可阅读、可追溯，也可纠正和暂停。'],
    ['>收集</button>','>知识</button>'],['>关联</button>','>画像</button>'],['>审阅</button>','>控制</button>'],
    ['Wiki 开发中流程示意','Wiki 个人工作记忆示意'],['我的知识库','我的工作记忆'],['待审阅','自动整理'],
    ['一次有价值的讨论','你的工作偏好'],['问题 → 分析 → 待验证事项','性能要求 · 格式偏好 · 工作习惯'],
    ['将讨论整理成候选知识页，<br>核对内容与来源，再决定保存。','从授权会话持续融合主题知识，<br>保留来源，更新已有内容。'],
    ['人工审阅后，成为可回看的知识。','纠正内容 · 不再记忆 · 暂停整理'],
    ['Wiki 流程设计示意 · 重构开发中','个人工作记忆示意 · 开发中，非实机录屏']
  ]) wiki=wiki.replaceAll(from,to);
  html=html.slice(0,wikiStart)+wiki+html.slice(wikiEnd);
  // Replace the obsolete first-use guide in the embedded canonical download copy.
  html=html.replace(/<section([^>]*id="knowledge-library"[^>]*)>[\s\S]*?<\/section>/,`<section$1><h3 id="knowledge-library-title">个人工作记忆，无需预先建库。</h3><p>Wiki 已有独立代码仓，安装包可用状态见上方组件卡片。授权会话范围后，可持续整理主题 Wiki 与个人画像；提供来源、版本恢复、纠正、不再记忆与暂停入口。</p><p>安装包不包含知识内容，不要求下载旧知识仓。升级前备份完整状态目录；旧数据和权限保留，不能直接用旧版覆盖升级后的存储。</p></section>`);
  html=html.replaceAll('Wiki 可直接创建空知识库；旧知识库资料可单独下载并导入。','Wiki 当前采用个人工作记忆机制，无需预先建库。')
    .replaceAll('Wiki 可从空知识库开始；旧 Knowledge 插件需要另备完整知识资料。两者的数据准备流程不同。','Wiki 无需预先建库；旧 Knowledge 插件的数据准备流程不同。');
  const faq=`<section class="product-faq" aria-labelledby="questions-title"><h2 id="questions-title">开始之前，你可能想知道。</h2>
    <details><summary>AICO 是一个新的桌面客户端吗？</summary><p>不是。AICO 通过适配插件与业务插件加入原版 DSH Desktop，不替换宿主核心或原装插件。</p></details>
    <details><summary>所有插件都需要安装吗？</summary><p>桌面使用先准备匹配的原版 Desktop 与 Harness，再按需选择 PPT、Profile 或 Wiki。PPT、Profile 的独立 Skill 路线见各自源码说明，不等同于桌面插件安装。</p></details>

    <details><summary>现在能下载正式版本吗？</summary><p>请以本页下载核验结果为准。源码能力展示不代表正式交付；未通过版本、附件与发布核验的 AICO 插件不开放下载。macOS 暂未提供。</p></details>
    <details><summary>页面中的演示是真实录屏吗？</summary><p>页面中的联动动画是流程示意；点击“观看实操视频”可查看开发版真实录屏，带中文字幕和旁白。示意数据不代表性能基准，视频不代替安装验收。</p></details>
  </section>`;
  html=html.replace('<div class="question-list">','<div class="question-list">'+[...faq.matchAll(/<details>[\s\S]*?<\/details>/g)].map(match=>match[0]).join(''));
  return html;
}
