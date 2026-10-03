(function(){
  'use strict';
  const {clamp}=window.AICOStoryMath;
  const track=document.querySelector('.track');
  const sections=Array.from(document.querySelectorAll('[data-story]'));
  const dock=document.querySelector('.chapter-dock');
  const links=Array.from(dock.querySelectorAll('a'));
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const captions={
    harness:['从一项明确的任务开始。','把具体工作交给相应的专业工具。','成果留在工作区，可以检查，也可以继续编辑。'],
    ppt:['先确定主题和表达目标。','调整其中一页，让内容与表达更贴合。','回到完整演示，检查每一页的叙事。'],
    profile:['先看完整过程，再选择关注的片段。','聚焦选区，观察计算与通信的事件关系。','把分析带回时间线，核对证据与待验证判断。'],
    wiki:['从授权会话中整理主题 Wiki，保留知识来源。','将用户表达的格式偏好、性能要求与工作习惯独立整理。','发现记忆不准确时，可以纠正、不再记忆或暂停整理。']
  };
  let bounds=[],raf=0;
  const titles=Array.from(document.querySelectorAll('.chapter-identity'));
  const animations=new Set();
  sections.filter(s=>captions[s.id]).forEach(section=>{
    if(section.dataset.collaboration||section.dataset.wikiDemo)return;
    const buttons=Array.from(section.querySelectorAll('[data-step]'));
    if(!buttons.length)return;
    function select(phase){
      section.dataset.phase=String(phase);
      buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===phase)));
      section.querySelector('.step-caption').textContent=captions[section.id][phase];
    }
    buttons.forEach((button,phase)=>button.addEventListener('click',()=>select(phase)));
    select(0);
  });
  // Reveal once, without hiding content before JS or making scroll wait for animation.
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(!entry.isIntersecting)return;
      observer.unobserve(entry.target);
      if(reduced.matches||!entry.target.animate)return;
      const animation=entry.target.animate([{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'translateY(0)'}],{duration:480,easing:'cubic-bezier(.22,1,.36,1)'});
      animations.add(animation);animation.onfinish=()=>animations.delete(animation);
    }),{rootMargin:'0px 0px -10% 0px',threshold:.15});
    titles.forEach(title=>observer.observe(title));
  }
  function render(){
    raf=0;if(document.hidden)return;
    const y=scrollY,h=innerHeight;
    const past=titles.map(title=>title.getBoundingClientRect().bottom<110);
    dock.classList.toggle('is-visible',y>window.AICOStory.range()-h*.25);
    let current='top';bounds.forEach((top,i)=>{if(y+h*.42>=top)current=sections[i].id;});
    links.forEach(a=>{if(a.hash==='#'+current)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});
    titles.forEach((title,i)=>title.classList.toggle('is-past',past[i]));
  }
  function schedule(){if(!raf&&!document.hidden)raf=requestAnimationFrame(render);}
  function measure(){bounds=sections.map(section=>section.getBoundingClientRect().top+scrollY);schedule();}
  window.AICOStory={
    range:()=>Math.max(1,track.offsetHeight-innerHeight),
    exit:()=>reduced.matches?(scrollY>window.AICOStory.range()?1:0):clamp((scrollY-window.AICOStory.range())/(innerHeight*.5)),
    composition:()=>scrollY<=window.AICOStory.range()?null:{fade:window.AICOStory.exit()}
  };
  addEventListener('scroll',schedule,{passive:true});addEventListener('resize',measure);
  reduced.addEventListener('change',()=>{animations.forEach(animation=>animation.cancel());animations.clear();measure();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else measure();});
  if(document.fonts)document.fonts.ready.then(measure);
  measure();
})();
