(function(){
  const section=document.querySelector('[data-wiki-demo]');if(!section)return;
  const demo=section.querySelector('.wiki-workbench'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const steps=[
    ['待整理 · 2 个会话','等待手动或定时整理','会话变化只做标记，不立即调用模型。','会话变化进入待整理队列'],
    ['确认整理范围','同步完成，确认本次选项','核对来源、模型与预算，确认后开始。','确认范围后再发起整理'],
    ['正在整理','Agent 按需读取来源','搜索目录，读取原文，比较已有知识与画像。','读取来源与已有记忆'],
    ['知识已更新','融合知识，保留依据','相关知识建立关联，可回到原文核对。','图谱关联与知识页同步更新'],
    ['画像已更新','单独整理个人偏好','画像以用户原句为依据，可纠正或不再记忆。','知识与个人画像分别整理'],
    ['整理完成','结果与来源可追溯','在记录中查看本次整理；设置管理后续使用。','查看整理记录与控制入口']
  ];
  const duration=[1200,1700,1600,2300,2300,1800];let beat=0,paused=false,visible=false,timer=0,started=0,remaining=duration[0];
  const put=(selector,text)=>demo.querySelector(selector).textContent=text;
  function stop(){if(timer){clearTimeout(timer);timer=0;remaining=Math.max(0,remaining-(performance.now()-started))}}
  function sync(){
    const playing=visible&&!paused&&!reduced.matches&&!document.hidden&&!document.body.hasAttribute('data-video-open');
    demo.dataset.playing=String(playing);
    put('[data-wiki-play]',reduced.matches?'下一步':paused?'继续演示':'暂停演示');
    if(!playing){stop();return}if(!timer){started=performance.now();timer=setTimeout(()=>{timer=0;render((beat+1)%steps.length);sync()},remaining)}
  }
  function render(index){stop();beat=index;remaining=duration[beat];demo.dataset.wikiBeat=String(beat);
    ['state','agent','action','caption'].forEach((key,i)=>put('[data-wiki-'+key+']',steps[beat][i]));put('[data-wiki-count]',`${beat+1} / ${steps.length}`);
    demo.querySelector('.wiki-graph-panel').hidden=beat>=4;demo.querySelector('.wiki-persona-panel').hidden=beat!==4;demo.querySelector('.wiki-record-panel').hidden=beat!==5;demo.querySelector('.wiki-confirm-panel').hidden=beat!==1;
    put('[data-wiki-graph-status]',beat<2?'已有知识 · 等待更新':beat===2?'正在关联来源':'新增关联 · 可追溯');
    demo.querySelectorAll('.wiki-source small').forEach(node=>node.textContent=beat>=3?'本次已整理':'来源有更新');
    const selected=beat<4?0:beat===4?1:2;
    section.querySelectorAll('[data-step]').forEach((button,i)=>button.setAttribute('aria-pressed',String(i===selected)));
    demo.querySelectorAll('[data-wiki-view]').forEach((button,i)=>button.setAttribute('aria-pressed',String(i===selected)));
    const caption=section.querySelector('.step-caption');caption.setAttribute('aria-live','off');caption.textContent=steps[beat][3];
    demo.querySelector('.wiki-demo-progress i').style.transform=`scaleX(${(beat+1)/steps.length})`;
  }
  function select(index){paused=true;render(index);sync()}
  section.querySelectorAll('[data-step]').forEach((button,i)=>button.addEventListener('click',()=>select([3,4,5][i])));
  demo.querySelectorAll('[data-wiki-view]').forEach(button=>button.addEventListener('click',()=>select(Number(button.dataset.wikiView)===2?3:Number(button.dataset.wikiView))));
  demo.querySelector('[data-wiki-play]').addEventListener('click',()=>{if(reduced.matches){paused=true;render((beat+1)%steps.length)}else paused=!paused;sync()});
  demo.querySelector('[data-wiki-replay]').addEventListener('click',()=>{paused=false;render(0);sync()});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync()},{threshold:.15}).observe(demo);
  document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['data-video-open']});render(0);sync();
})();
