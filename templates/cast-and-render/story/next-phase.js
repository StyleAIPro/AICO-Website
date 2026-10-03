(function(){
  'use strict';
  const scenes=[
    ['内网中路知识库查询','查询这次模型迁移相关的适配经验。','检索知识，返回依据','经验与来源，一起带回会话。','结合检索内容梳理适配思路，再核对原始文档。'],
    ['基线数据查询','找到相关模型的基线，先核对测试条件。','查询基线，对照条件','让比较建立在相同条件上。','先检查模型、硬件与测试配置，再讨论结果；此处不展示虚构的性能数字。'],
    ['远程服务器连接与命令执行','连接已授权的测试服务器，检查运行环境。','确认目标与命令，再执行','执行反馈，留在当前上下文。','核对目标、权限与命令范围，查看返回输出；当前示意不会连接服务器。'],
    ['发布到企业 Wiki','把这次迁移经验整理为 Wiki 草稿。','准备内容，进入浏览器核对','整理好的经验，准备分享。','在获授权的目标中检查标题、正文与公开范围，再确认发表。'],
    ['稼先发表','整理本次调优记录，准备发表到稼先。','整理记录，进入浏览器核对','让工作记录成为可回看的内容。','核对目标、内容和可见范围，再完成发表；示意不会提交任何内容。']
  ];
  const toolSection=document.querySelector('#harness-tools');
  toolSection.querySelectorAll('[data-tool]').forEach(button=>button.addEventListener('click',()=>{
    const scene=scenes[Number(button.dataset.tool)];
    ['name','request','route','result','detail'].forEach((key,i)=>toolSection.querySelector('[data-tool-'+key+']').textContent=scene[i]);
    toolSection.querySelectorAll('[data-tool]').forEach(other=>other.setAttribute('aria-pressed',String(other===button)));
  }));
  // CSS animations run only while their scene is visible and the tab is active.
  const visible=new Set(),flowSections=[...document.querySelectorAll('#harness,#harness-tools,#wiki')];
  function motionState(){flowSections.forEach(section=>section.classList.toggle('is-in-view',visible.has(section)&&!document.hidden));}
  if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>entry.isIntersecting?visible.add(entry.target):visible.delete(entry.target));motionState();},{threshold:.1});flowSections.forEach(section=>observer.observe(section));}
  document.addEventListener('visibilitychange',motionState);

  // Reviewed real recordings for the local candidate; public deployment is separate.
  // Captions are burned into these reviewed recordings; no subtitle toggle is required.
  const approvedVideos=[
    {group:'tools',title:'Harness · 查询、远程操作与知识发布',src:'../../docs/assets/videos/aico-harness-workflow-20260929.mp4?v=4',poster:'../../docs/assets/videos/aico-harness-workflow-20260929.jpg',chapters:[[0,'知识库查询'],[7.5,'基线查询'],[23,'远程连接'],[48.5,'企业 Wiki'],[76,'稼先发表']],summary:'1 分 44 秒 · 知识与基线、NPU 与容器、对话发起 Wiki 与稼先发布'},
    {group:'ppt',title:'PPT · 从创建到三处批量修改',src:'../../docs/assets/videos/aico-ppt-workflow-20260929-v2.mp4',poster:'../../docs/assets/videos/aico-ppt-workflow-20260929-v2.jpg',summary:'1 分 16 秒 · 创建、三处圈选、一次发送、导出'},
    {group:'profile',title:'Profile · 从选区到证据',src:'../../docs/assets/videos/aico-profile-workflow-20260929-v2.mp4',poster:'../../docs/assets/videos/aico-profile-workflow-20260929-v2.jpg',summary:'46 秒 · 导入、选区、联动缩放、回到全局'}
  ];
  const dialog=document.querySelector('.video-dialog'),video=dialog.querySelector('video'),switcher=dialog.querySelector('.video-switcher'),error=dialog.querySelector('.video-error');
  const chapterNav=document.createElement('div');chapterNav.className='video-chapters';chapterNav.setAttribute('role','group');chapterNav.setAttribute('aria-label','视频章节');dialog.querySelector('video').before(chapterNav);
  let pendingSeek=0;
  video.addEventListener('loadedmetadata',()=>{if(pendingSeek)video.currentTime=pendingSeek});
  video.addEventListener('timeupdate',()=>{const buttons=[...chapterNav.querySelectorAll('button')];const active=buttons.findLast(button=>video.currentTime>=Number(button.dataset.time));buttons.forEach(button=>button.setAttribute('aria-pressed',String(button===active)))});
  const playback=dialog.querySelector('[data-video-play]');
  playback.addEventListener('click',async()=>{
    if(!video.paused){video.pause();return;}
    video.muted=false;video.volume=1;error.textContent='';
    try{await video.play();}catch{error.textContent='播放未能开始，请点击播放重试。';}
  });
  video.addEventListener('play',()=>{playback.textContent='暂停视频';});
  video.addEventListener('pause',()=>{playback.textContent='播放并开启旁白';});
  let trigger=null,position=0,previousOverflow='';
  function unload(){video.pause();video.removeAttribute('src');video.removeAttribute('poster');video.replaceChildren();video.load();}
  function selectVideo(item,start=0){
    unload();playback.textContent='播放并开启旁白';error.textContent='';dialog.querySelector('#video-title').textContent=item.title;
    pendingSeek=start;chapterNav.replaceChildren();chapterNav.hidden=!item.chapters;
    (item.chapters||[]).forEach(([time,label])=>{const button=document.createElement('button');button.type='button';button.dataset.time=time;button.textContent=label;button.setAttribute('aria-pressed',String(time===start));button.addEventListener('click',()=>{pendingSeek=time;if(video.readyState>=1)video.currentTime=time});chapterNav.append(button)});
    if(item.poster)video.poster=item.poster;
    if(item.track){const track=document.createElement('track');Object.assign(track,{kind:'subtitles',srclang:'zh',label:'中文字幕',src:item.track,default:true});video.append(track);}
    video.src=item.src;video.load();
    switcher.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.textContent===item.title)));
  }
  function openVideos(items,button){
    trigger=button;position=scrollY;previousOverflow=document.documentElement.style.overflow;
    switcher.hidden=items.length<2;switcher.replaceChildren();items.forEach(item=>{const choice=document.createElement('button');choice.type='button';choice.textContent=item.title;choice.addEventListener('click',()=>selectVideo(item));switcher.append(choice);});
    document.body.dataset.videoOpen='true';dialog.showModal();document.documentElement.style.overflow='hidden';selectVideo(items[0],items[0].group==='tools'?(items[0].chapters?.[Number(toolSection.querySelector('[data-tool][aria-pressed=true]')?.dataset.tool)||0]?.[0]||0):0);dialog.querySelector('[data-video-close]').focus({preventScroll:true});
  }
  document.querySelectorAll('[data-video-group]').forEach(slot=>{
    const items=approvedVideos.filter(item=>item.group===slot.dataset.videoGroup);if(!items.length)return;
    const button=document.createElement('button');button.type='button';button.className='video-card';const poster=document.createElement('img');poster.src=items[0].poster;poster.alt='';poster.width=90;poster.height=60;poster.loading='lazy';const label=document.createElement('span');label.textContent='▶ 观看 '+({ppt:'PPT',profile:'Profile',wiki:'Wiki',tools:'工具协作'}[slot.dataset.videoGroup])+' 实操视频';const detail=document.createElement('small');detail.textContent=items[0].summary||'真实操作 · 中文字幕与旁白';label.append(detail);button.append(poster,label);button.addEventListener('click',()=>openVideos(items,button));slot.replaceChildren(button);
  });
  dialog.querySelector('[data-video-close]').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{const box=dialog.getBoundingClientRect();if(event.target===dialog&&(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom))dialog.close();});
  dialog.addEventListener('close',()=>{unload();document.documentElement.style.overflow=previousOverflow;delete document.body.dataset.videoOpen;window.scrollTo({top:position,behavior:'instant'});trigger?.focus({preventScroll:true});});
  video.addEventListener('error',()=>{if(video.getAttribute('src'))error.textContent='视频暂时无法加载，请稍后重试或选择其他片段。';});
})();
