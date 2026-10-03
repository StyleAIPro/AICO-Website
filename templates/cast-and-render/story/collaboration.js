(function(){
  'use strict';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const beatDurations=[650,1450,1650,1800,1650,900];
  const scripts={
    ppt:[
      ['组织需求','先搭建三页简报：背景、发现、行动。','建立演示结构','需求已整理，准备生成页面。','等待生成','研究简报','背景、发现与下一步行动。','等待 AI 下发生成指令。'],
      ['生成首页','生成封面，突出这次研究的主题。','生成第 1 页','插件接收指令，标题与正文进入画布。','正在生成 · 1 / 3','从研究出发，\n把问题讲清楚。','围绕项目评审，明确背景与研究目标。','封面已生成，继续补充后续页面。'],
      ['补充内容','把发现与依据展开，再补充下一步行动。','生成第 2、3 页','页面缩略图逐步补齐，内容形成结构。','内容已生成 · 3 / 3','发现与依据，\n一页一条主线。','先写清楚观察，再附上需要核对的依据。','三页结构已就绪，接下来修改局部标题。'],
      ['圈选三处','进入修改模式：标题更聚焦、正文更简短、图形缩小。','合并 3 处要求 · 一次发送','三个修改位置已标记，一次提交给 Agent。','修改模式 · 3 处标注','发现与依据，\n一页一条主线。','先写清楚观察，再附上需要核对的依据。','已圈选标题、正文、图形；合并发送，等待批量修改。'],
      ['批量修改完成','按这三处要求完成修改，保留其他页面。','更新标题、正文与图形','Agent 已完成三处修改，回到插件核对结果。','已完成 · 3 / 3','让迁移发现，\n成为行动依据。','核对证据，再形成行动。','标题已聚焦、正文已精简、图形已缩小；可继续修改。'],
      ['继续协作','整份演示已准备好，随时可以继续修改。','返回演示首页','生成不是终点，成果留在工作区。','可继续编辑','从研究出发，\n把问题讲清楚。','围绕项目评审，明确背景与研究目标。','流程示意完成；导出前仍需逐页核对。']
    ],
    profile:[
      ['查看全局','先看完整时间线，保留计算与通信的上下文。','显示 0–30 ms','时间线处于全局视图。','全局视图','查看完整时间线','等待选区','先查看轨道分布，再选择需要分析的区间。'],
      ['选择区间','选取 10–20 ms，作为这次分析的上下文。','框选 10–20 ms','关注范围已标记在时间线上。','选区已建立','选区成为上下文','10–20 ms 选区','选区带入会话，下一步放大并查看相关事件。'],
      ['放大时间线','放大选区，保留各轨道之间的相对位置。','缩放至选区 · 3×','事件在同一时间轴上展开，概览条保留位置。','选区放大 · 3×','放大关注区间','当前范围：10–20 ms','时间刻度同步更新；下方概览显示选区在全局中的位置。'],
      ['定位事件','定位选区里的计算事件，关联同区间通信。','定位与高亮事件','关联事件亮起，便于返回原始数据核对。','事件已定位','定位计算与通信事件','Compute ↔ Communication','高亮表示待核对的时间关系，不代表已确认性能瓶颈。'],
      ['核对详情','检查事件详情，再判断是否需要进一步分析。','查看关联详情','结论回到数据，保留待验证的问题。','查看事件详情','回到数据核对','关联事件 · 待验证','结合原始详情核对事件关系与关键路径，不凭示意数据下诊断。'],
      ['回看全局','恢复全局视图，确认局部观察的位置。','恢复 0–30 ms','缩放回到起点，可以继续选择新的区间。','已恢复全局','回到完整时间线','保留分析上下文','局部观察回到完整过程，继续核对下一项问题。']
    ]
  };
  document.querySelectorAll('[data-collaboration]').forEach(section=>{
    const kind=section.dataset.collaboration,scene=section.querySelector('.collab-demo'),steps=scripts[kind];
    const play=scene.querySelector('[data-playback]'),replay=scene.querySelector('[data-replay]');
    let beat=0,visible=false,paused=false,timer=0,started=0,remaining=beatDurations[0],animations=[];
    const put=(selector,value)=>{scene.querySelector(selector).textContent=value;};
    const active=()=>visible&&!paused&&!reduced.matches&&!document.hidden&&!document.body.hasAttribute('data-video-open');
    function animate(node,frames,options){if(reduced.matches||paused)return;const animation=node.animate(frames,{duration:380,easing:'cubic-bezier(.22,1,.36,1)',...options});animations.push(animation);if(!active())animation.pause();}
    function transform(node,to){const from=getComputedStyle(node).transform;node.style.transform=to;animate(node,[{transform:from==='none'?'none':from},{transform:to}],{});}
    function stopClock(){if(timer){clearTimeout(timer);timer=0;remaining=Math.max(0,remaining-(performance.now()-started));}animations.forEach(animation=>{if(animation.playState==='running')animation.pause();});}
    function sync(){
      if(active()){
        animations.forEach(animation=>{if(animation.playState==='paused')animation.play();});
        if(!timer){started=performance.now();timer=setTimeout(()=>{timer=0;render((beat+1)%steps.length);sync();},remaining);}
      }else stopClock();
      play.textContent=reduced.matches?'下一步':paused?'继续演示':'暂停演示';
      play.setAttribute('aria-label',reduced.matches?'查看下一步联动示意':paused?'继续联动演示':'暂停联动演示');
      put('[data-playback-label]',reduced.matches?'减少动态效果 · 可逐步查看':paused?'已暂停 · 可切换步骤':active()?'自动演示 · 指令与插件同步':'进入视口后播放');
      scene.dataset.playing=String(active());
    }
    function render(index){
      stopClock();
      // Snapshot current transforms before cancelling so interrupted zooms retarget.
      const lanes=[...scene.querySelectorAll('.zoom-lane,.trace-minimap>div')];
      const transforms=lanes.map(node=>getComputedStyle(node).transform);
      animations.forEach(animation=>animation.cancel());animations=[];
      lanes.forEach((node,i)=>node.style.transform=transforms[i]);
      beat=index;remaining=beatDurations[index];scene.dataset.beat=String(beat);
      const data=steps[beat];
      ['stage','text','action','feedback'].forEach((key,i)=>put('[data-command-'+key+']',data[i]));
      put('[data-plugin-status]',data[4]);put('[data-result-title]',data[5]);put('[data-result-detail]',data[7]);
      const coarse=kind==='ppt'?(beat<3?0:beat===3?1:2):(beat<2?0:beat<4?1:2);
      section.dataset.phase=String(coarse);
      section.querySelectorAll('[data-step]').forEach((button,i)=>button.setAttribute('aria-pressed',String(i===coarse)));
      // Auto playback is not a repeatedly announcing live region.
      const caption=section.querySelector('.step-caption');caption.setAttribute('aria-live','off');caption.textContent=data[3];
      if(kind==='ppt'){
        put('[data-slide-copy]',data[6]);const page=beat>=2&&beat<=4?1:0;
        put('[data-slide-number]',String(page+1).padStart(2,'0')+' / 03');
        scene.querySelectorAll('[data-thumb]').forEach((node,i)=>{node.classList.toggle('is-generated',beat>=2||(beat===1&&i===0));node.classList.toggle('is-selected',beat>0&&i===page);});
        if(beat>0){animate(scene.querySelector('[data-result-title]'),[{opacity:.2,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:300,delay:60});animate(scene.querySelector('[data-slide-copy]'),[{opacity:0},{opacity:1}],{duration:280,delay:140});}
      }else{
        put('[data-event-title]',data[6]);const zoomed=beat>=2&&beat<=4;
        put('[data-zoom-label]',zoomed?'3× · 10–20 ms':'1× · 0–30 ms');
        scene.querySelectorAll('.zoom-ruler span').forEach((node,i)=>node.textContent=(zoomed?['10 ms','13.3 ms','16.7 ms','20 ms']:['0 ms','10 ms','20 ms','30 ms'])[i]);
        scene.querySelectorAll('.zoom-lane').forEach(node=>transform(node,zoomed?'matrix(3,0,0,1,0,0) translateX(-33.3333%)':'matrix(1,0,0,1,0,0)'));
        transform(scene.querySelector('.trace-minimap>div'),zoomed?'scaleX(.333333)':'scaleX(1)');
        scene.querySelector('.zoom-selection').style.opacity=beat===1?'1':'0';
        if(beat===1)animate(scene.querySelector('.zoom-selection'),[{transform:'scaleX(.05)',opacity:.2},{transform:'scaleX(1)',opacity:1}],{duration:380});
      }
      animate(scene.querySelector('.command-transfer i'),[{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration:320});
      put('[data-playback-count]',(beat+1)+' / '+steps.length);
      scene.querySelector('.playback-progress i').style.transform='scaleX('+(beat+1)/steps.length+')';
      animate(scene.querySelector('.playback-progress i'),[{transform:'scaleX('+beat/steps.length+')'},{transform:'scaleX('+(beat+1)/steps.length+')'}],{duration:beatDurations[beat],easing:'linear'});
    }
    play.addEventListener('click',()=>{if(reduced.matches){paused=true;render((beat+1)%steps.length);}else paused=!paused;sync();});
    replay.addEventListener('click',()=>{paused=false;render(0);sync();});
    section.querySelectorAll('[data-step]').forEach((button,i)=>button.addEventListener('click',()=>{paused=true;render((kind==='ppt'?[0,3,5]:[0,2,4])[i]);sync();}));
    document.addEventListener('visibilitychange',sync);
    reduced.addEventListener('change',()=>{render(beat);sync();});
    new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['data-video-open']});
    if('IntersectionObserver' in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:.15}).observe(scene);
    render(0);sync();
  });
})();
