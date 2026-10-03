// Compose v12; previous standalone pages and the approved opening stay untouched.
import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {splitStoryPages} from '../templates/cast-and-render/story/split-pages.mjs';
import {officialContent} from '../templates/cast-and-render/story/official-content.mjs';
const base=new URL('../templates/cast-and-render/',import.meta.url);
let html=await readFile(new URL('archive/aico-material-v6.1/index.html',base),'utf8');
const read=name=>readFile(new URL('story/'+name,base),'utf8');
const logo=await readFile(new URL('../docs/assets/aico-brand/aico-wordmark.svg',import.meta.url));
const assets={};
const gitcodeIcon='data:image/png;base64,'+(await readFile(new URL('../docs/assets/aico-brand/gitcode-icon-transparent.png',import.meta.url))).toString('base64');
const repositories={harness:'AICO-Harness-Plugin',ppt:'AICO-PPT',profile:'AICO-Profile',wiki:'AICO-wiki'};
for(const id of ['intro','harness','ppt','profile','wiki'])assets[id]='data:image/png;base64,'+(await readFile(new URL('story/'+(id==='intro'?'assets':'assets-v9')+'/'+id+'.png',base))).toString('base64');
let content=(await read('content.html')).replaceAll('{{WORDMARK}}','data:image/svg+xml;base64,'+logo.toString('base64'));
for(const [id,name] of [['harness','Harness'],['ppt','PPT'],['profile','Profile'],['wiki','Wiki']]){
  const pattern=new RegExp('<p class="product-name">AICO '+name+'(.*?)</p>');
  if(!pattern.test(content))throw new Error('Missing product title: '+id);
  const repo=repositories[id];
  const sourceLink=repo?`<a class="repository-link" href="https://gitcode.com/AICO-Ascend/${repo}" target="_blank" rel="noopener noreferrer" aria-label="查看 AICO ${name} 的 GitCode 源码（新标签页）" title="查看 AICO ${name} 源码 · GitCode"><img src="${gitcodeIcon}" width="28" height="28" alt="" aria-hidden="true"></a>`:'';
  content=content.replace(pattern,(_,extra)=>'<p class="product-name chapter-identity"><img class="chapter-wordmark" src="'+assets[id]+'" alt="AICO '+name+'">'+sourceLink+extra+'</p>');
}
const installContent=await read('install-content.html');
const developerContent=await read('developers-content.html');
// Dedicated page sources were extracted from the current candidate, not the old site.
content=content.replace(/<section class="install-section"[\s\S]*?<\/section>/,()=>installContent);
const footer='<footer class="story-footer">';
content=content.replace(footer,()=>developerContent+'\n'+footer);
const style=(await read('style.css'))+'\n'+await read('natural.css')+'\n'+await read('downloads.css')+'\n'+await read('developers.css')+'\n'+await read('official.css')+'\n'+await read('next-phase.css')+'\n'+await read('collaboration.css')+'\n'+await read('usability.css')+'\n'+await read('wiki-demo.css')+'\n'+await read('opening-loader.css');
const motion=await read('motion.js');
const runtime=(await read('natural.js'))+'\n'+await read('intro-settle-stable.js')+'\n'+await read('next-phase.js')+'\n'+await read('collaboration.js')+'\n'+await read('wiki-demo.js');
function replaceOnce(from,to){if(!html.includes(from))throw new Error('Missing v6 integration seam: '+from.slice(0,80));html=html.replace(from,()=>to);}
replaceOnce('<html lang="en">','<html lang="zh-CN">');
html=html.replace(/<title>[^<]*<\/title>/,'<title>AICO · 对话、工具与成果</title>');
replaceOnce('<body>','<body id="top">');
replaceOnce('<div class="boot" id="boot" role="status" aria-label="Loading studio film">\n    <div class="bar"><i id="bootBar"></i></div>\n    <p id="bootPct">LOADING 0%</p>\n  </div>',
  '<div class="boot" id="boot" aria-label="正在加载 AICO 开场"><p class="boot-title">正在准备 AICO</p><div class="bar" id="bootProgress" role="progressbar" aria-label="原画下载进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i id="bootBar"></i></div><p id="bootPct">加载原画 0%</p><p id="bootDetail" class="boot-detail" role="status">正在连接</p><button id="bootRetry" class="boot-retry" type="button" hidden>重新加载</button><a class="boot-guide" href="#install">查看安装指南</a></div><noscript><style>.boot{display:none}</style></noscript>');
const brand=html.match(/<div class="mark">([\s\S]*?)<\/div>/);
if(!brand)throw new Error('Missing header brand');
replaceOnce(brand[0],'<a class="mark" href="#top" aria-label="AICO，回到顶部">'+brand[1]+'</a>');
replaceOnce('</style>',style+'\n</style>');
replaceOnce('<main class="panels">','<div class="panels" role="region" aria-label="品牌开场">');
replaceOnce('</main>','</div>');
replaceOnce('<nav class="nav" aria-label="Studio navigation">\n      <a href="#board">Works</a>\n      <a href="#visit">About</a>\n      <a class="pill" href="#order">Start a brief</a>\n    </nav>',
  '<nav class="nav" aria-label="主导航"><details class="product-menu"><summary>探索产品</summary><div><a href="#harness">Harness · 工作台</a><a href="#harness-tools">迁移调优工具</a><a href="#ppt">PPT · 演示创作</a><a href="#profile">Profile · 性能分析</a><a href="#wiki">Wiki · 个人工作记忆</a><a class="mobile-developer" href="#developers">开发者文档</a></div></details><a href="#developers">开发者</a><a class="pill" href="#install">开始使用</a></nav>');
replaceOnce('<div class="track" aria-hidden="true"></div>','<div class="track" aria-hidden="true"></div>\n'+content);
replaceOnce('<script>','<script>\n'+motion+'\n'+runtime+'\n');
replaceOnce('range=document.documentElement.scrollHeight-height;','range=window.AICOStory.range();');
// Commit a complete interpolation pair atomically: upper-only decode must never
// display a future frame and then visually rewind when the lower frame arrives.
replaceOnce('if(!a&&!b)return;','if(!a||!b)return;');
replaceOnce('var CACHE_LIMIT = 12, JOB_LIMIT = 3;','var CACHE_LIMIT = 24, JOB_LIMIT = 3;');
replaceOnce('for(var d=1;d<=4;d++)','for(var d=1;d<=8;d++)');
replaceOnce('    queue=queue.filter(function(i,at,all){', '    if(openingState==="preparing")openingInitial=queue.filter(function(i,at,all){return i>=0&&i<FILM.frames.length&&all.indexOf(i)===at;});\n    queue=queue.filter(function(i,at,all){');
replaceOnce('target=(motion.matches?0:progress)*(FILM.frames.length-1);','target=(motion.matches?(window.pageYOffset>range?1:0):progress)*(FILM.frames.length-1);');
replaceOnce('var o=enter*(1-leave),y=', 'var o=enter*(1-leave)*(1-window.AICOStory.exit()),y=');
// The legacy .foot is removed by officialContent; do not access it while painting.
replaceOnce('var key=target.toFixed(4)+":"+Boolean(a)+":"+Boolean(b);','var composition=window.AICOStory.composition();\n    var key=target.toFixed(4)+":"+Boolean(a)+":"+Boolean(b)+":"+JSON.stringify(composition);');
replaceOnce('function drawFrame(image){','function drawFrame(image){\n      if(composition){\n        var alpha=ctx.globalAlpha;\n        ctx.drawImage(image,0,0,1,FILM.height,0,0,width,height);\n        ctx.globalAlpha=alpha*(1-composition.fade);\n        ctx.drawImage(image,x,y,w,h);ctx.globalAlpha=alpha;return;\n      }');
replaceOnce('var destinations={"#board":.29,"#visit":.50,"#order":.92};','var destinations={"#board":.29,"#visit":.50};');
// Preserve the original CTA text while its destination now opens the real install chapter.
html=html.replaceAll('href="#order"','href="#install"');
replaceOnce('</body>','<script type="module" src="../../docs/aico-release.mjs"></script></body>');
html=officialContent(html);
// Keep the approved opening sequence; externalize its identical frames for on-demand caching.
html=html.replace(/<link[^>]*href="https:\/\/fonts\.(?:googleapis|gstatic)\.com[^>]*>/g,'');
const assetRoot=new URL('../docs/assets/story/',import.meta.url);
await mkdir(assetRoot,{recursive:true});
async function asset(bytes,extension){const name=createHash('sha256').update(bytes).digest('hex').slice(0,20)+'.'+extension;await writeFile(new URL(name,assetRoot),bytes);return '../../docs/assets/story/'+name;}
const filmMatch=html.match(/var FILM = (\{[^\n]+\});/);
if(!filmMatch)throw Error('Missing approved opening film');
const film=JSON.parse(filmMatch[1]);
const frameBytes=film.frames.map(frame=>Buffer.from(frame,'base64'));
let offset=0;film.offsets=frameBytes.map(bytes=>{const start=offset;offset+=bytes.length;return [start,offset]});
film.bundle=await asset(Buffer.concat(frameBytes),'bin');
film.frames=await Promise.all(frameBytes.map(bytes=>asset(bytes,'webp')));
html=html.replace(filmMatch[0],'var FILM = '+JSON.stringify(film)+';\n'+await read('opening-loader.js'));
html=html.replace(/    var raw=atob\(FILM.frames\[index\]\)[\s\S]*?    if\(typeof createImageBitmap/,`    return openingFrame(index).then(function(blob){
    if(typeof createImageBitmap`);
replaceOnce('            if(!ready){ready=true;setLoading(1);boot.classList.add("done");}\n', '');
replaceOnce('if(failed||document.hidden)return;', 'if(failed||document.hidden||(openingState!=="preparing"&&openingState!=="ready"))return;');
replaceOnce('cache.set(index,{image:image,used:++clock});trim();', 'cache.set(index,{image:image,used:++clock});trim();openingDecoded();');
replaceOnce('(function(index){\n        decode(index).then(function(image){', '(function(index,attempt){\n        decode(index).then(function(image){\n          if(attempt!==openingAttempt){if(image.close)image.close();return;}');
replaceOnce('})(id);', '})(id,openingAttempt);');
replaceOnce('setLoading(.2);', 'setLoading(0);');
replaceOnce('try{ctx=clip.getContext("2d",{alpha:false,desynchronized:true});if(!ctx)fail();}catch(error){fail();}\n  measure();', 'try{ctx=clip.getContext("2d",{alpha:false,desynchronized:true});if(!ctx)fail();}catch(error){fail();}\n  measure();\n  startOpening();');
html=html.replace(/  function fail\(\)\{[\s\S]*?\n  function pump/, '  function fail(){showOpeningError();}\n  function pump');
html=html.replace('}).catch(function(){jobs.delete(index);fail();});','}).catch(function(){if(attempt===openingAttempt){jobs.delete(index);showOpeningError();}});');
// Render only original-resolution interpolation pairs from the downloaded film.
html=html.replace('var lower=Math.floor(target),upper=Math.ceil(target),a=cache.get(lower),b=cache.get(upper);', 'var lower=Math.floor(target),upper=Math.ceil(target),pair=openingPair(lower,upper);\n    if(!pair)return;\n    var a=pair.a,b=pair.b;');
html=html.replace('var key=target.toFixed(4)+":"+Boolean(a)+":"+Boolean(b)+":"+JSON.stringify(composition);', 'var key=target.toFixed(4)+":"+JSON.stringify(composition);');
html=html.replace('ctx.globalAlpha=target-lower;', 'ctx.globalAlpha=pair.mix;');
html=html.replace('if(a&&b&&upper!==lower)', 'if(a&&b&&pair.mix>0)');
html=html.replace('ctx.drawImage(image,0,0,1,FILM.height,', 'ctx.drawImage(image,0,0,1,image.height,');
html=html.replace('ctx.drawImage(image,0,0,FILM.width,1,', 'ctx.drawImage(image,0,0,image.width,1,');
html=html.replace('ctx.drawImage(image,0,FILM.height-1,FILM.width,1,', 'ctx.drawImage(image,0,image.height-1,image.width,1,');
html=html.replace('clip.dataset.frame=target.toFixed(3);', 'clip.dataset.frame=target.toFixed(3);clip.dataset.quality="full";finishOpening();');
html=html.replace('image.src=url;\n    });','image.src=url;\n    });\n    });');
html=html.replace('"url(data:image/webp;base64,"+FILM.frames[0]+")"','"url("+FILM.frames[0]+")"');
const embedded=[...new Set(html.match(/data:image\/(?:png|webp|svg\+xml);base64,[A-Za-z0-9+/=]+/g)||[])];
for(const data of embedded){const [header,encoded]=data.split(',');const ext=header.includes('svg')?'svg':header.includes('webp')?'webp':'png';html=html.replaceAll(data,await asset(Buffer.from(encoded,'base64'),ext));}

html=html.replace('</head>','<meta name="description" content="AICO 连接 AI 对话、专业工具与工作成果。在原版 DSH Desktop 中按需使用 Harness、PPT、Profile 与 Wiki。Windows 优先，公开版本以下载核验为准。"></head>');
const split=splitStoryPages(html,await read('subpages.css'),await read('page-navigation.js'));
html=split.home;
for(const [name,page] of Object.entries(split.pages))await writeFile(new URL('../docs/'+name,import.meta.url),page);
const output=new URL('v21.html',base),pending=new URL('v21.pending.html',base);
await writeFile(pending,html);await rename(pending,output);
// Stage a Pages-compatible candidate without replacing the live homepage.
const candidate=html.replaceAll('../../docs/','./');
await writeFile(new URL('../docs/index-next.html',import.meta.url),candidate);
console.log(JSON.stringify({output:fileURLToPath(output),bytes:Buffer.byteLength(html),film:'unchanged v6.1',chapters:7},null,2));
