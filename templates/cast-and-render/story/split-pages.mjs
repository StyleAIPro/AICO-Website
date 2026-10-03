// Split the composed candidate so the typography, content and navigation remain shared.
export function splitStoryPages(html,css,navigation){
  function extract(start){
    const from=html.indexOf(start);if(from<0)throw Error('Missing section: '+start);
    let depth=0;
    for(const match of html.slice(from).matchAll(/<\/?section\b[^>]*>/g)){
      depth+=match[0].startsWith('</')?-1:1;
      if(!depth)return html.slice(from,from+match.index+match[0].length);
    }
    throw Error('Unclosed section: '+start);
  }
  const install=extract('<section class="install-section"');
  const developers=extract('<section id="developers"');
  const faq='';
  const ids=markup=>[...markup.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  const installIds=new Set([...ids(install),...ids(faq)]),developerIds=new Set(ids(developers));
  const style=html.match(/<style>([\s\S]*?)<\/style>/)[1];
  const fonts=html.match(/<link[^>]+href="https:\/\/fonts.googleapis.com\/css2[^>]+>/)?.[0]||'';
  const header=html.match(/<header class="chrome">[\s\S]*?<\/header>/)[0];
  const dock=html.match(/<nav class="chapter-dock"[^>]*>[\s\S]*?<\/nav>/)[0];
  const footer=html.match(/<footer class="story-footer">[\s\S]*?<\/footer>/)[0];
  function route(markup,page){
    return markup.replace(/href="#([^"\s]+)"/g,(all,id)=>{
      const target=installIds.has(id)?'install-next.html':developerIds.has(id)?'developers-next.html':'index-next.html';
      return target===page?all:`href="${target}#${id}"`;
    }).replaceAll('../../docs/','./');
  }
  const pages={};
  for(const [page,title,body] of [['install-next.html','下载与安装',install+faq],['developers-next.html','开发者',developers]]){
    let top=route(header,page),bottom=route(dock,page).replace('class="chapter-dock"','class="chapter-dock is-visible"');
    const target=page==='install-next.html'?'install':'developers';
    for(const kind of ['top','bottom']){
      let nav=kind==='top'?top:bottom;
      nav=nav.replace(`href="#${target}"`,`href="#${target}" aria-current="page"`);
      if(kind==='top')top=nav;else bottom=nav;
    }
    const content=route(body,page).replace(page==='install-next.html'?'<h2 id="install-title">':'<h2 id="developer-title">',page==='install-next.html'?'<h1 id="install-title">':'<h1 id="developer-title">');
    const heading=page==='install-next.html'?'install-title':'developer-title';
    const promoted=content.replace(new RegExp('(<h1 id="'+heading+'">[\\s\\S]*?)</h2>'),'$1</h1>');
    pages[page]=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AICO · ${title}</title><meta name="description" content="${page==='install-next.html'?'AICO Windows 组件下载、历史版本、安装命令与首次使用指导。':'AICO 原装宿主插件开发、源码与构建说明。'}">${fonts}<style>${style}\n${css}</style></head><body id="top" class="aico-subpage"><a class="skip-story" href="#main">跳到主要内容</a>${top}${bottom}<main id="main">${promoted}</main>${route(footer,page)}<script>${navigation}</script><script type="module" src="./aico-release.mjs"></script><script type="module" src="./component-downloads.mjs"></script></body></html>`;
  }
  let home=html.replace(install,'').replace(developers,'').replace(faq,'');
  // Keep the template preview and Pages candidate linked to the same new pages.
  home=home.replace(/href="#([^"\s]+)"/g,(all,id)=>installIds.has(id)?`href="../../docs/install-next.html#${id}"`:developerIds.has(id)?`href="../../docs/developers-next.html#${id}"`:all);
  home=home.replace('</body>',`<script>${navigation}</script></body>`);
  return {home,pages};
}
