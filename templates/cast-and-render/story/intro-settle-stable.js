(function(){
  'use strict';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  // Film choreography: spin ends .36, fracture starts .48, sealing ends .975.
  const stops=[0,.44,1];
  let raf=0,active=false,skip=false,held=false,timer=0,direction=0;
  function cancel(){clearTimeout(timer);timer=0;cancelAnimationFrame(raf);raf=0;active=false;}
  function settle(){
    if(active)return;
    if(skip){skip=false;return;}
    if(held||document.hidden||reduced.matches)return;
    const range=window.AICOStory.range(),from=scrollY,p=from/range;
    if(p<0||p>1)return;
    const candidates=direction>0?stops.filter(value=>value>=p-.002):direction<0?stops.filter(value=>value<=p+.002):stops;
    const nearest=candidates.reduce((best,value)=>Math.abs(value-p)<Math.abs(best-p)?value:best);
    moveTo(Math.round(nearest*range));
  }
  function moveTo(to){
    const from=scrollY,distance=to-from;
    if(reduced.matches){window.scrollTo({top:to,behavior:'instant'});return;}
    if(Math.abs(distance)<3)return;
    const duration=Math.min(1800,1200+Math.abs(distance)*.4),start=performance.now();
    active=true;
    function tick(now){
      if(document.hidden||held||reduced.matches){cancel();return;}
      const t=Math.min(1,(now-start)/duration);
      // Sine ease-in-out: gentle launch and landing, no overshoot or opacity fade.
      window.scrollTo({top:from+distance*((1-Math.cos(Math.PI*t))/2),behavior:'instant'});
      if(t<1)raf=requestAnimationFrame(tick);
      else {raf=0;active=false;}
    }
    raf=requestAnimationFrame(tick);
  }
  // scrollend can fire after each mouse-wheel detent: require a quiet period.
  function queue(){if(active||held)return;clearTimeout(timer);timer=setTimeout(()=>{timer=0;settle();},100);}
  if('onscrollend' in window)addEventListener('scrollend',queue);
  addEventListener('scroll',()=>{if(!active)clearTimeout(timer);},{passive:true});
  addEventListener('wheel',event=>{if(!event.deltaY)return;skip=false;cancel();direction=Math.sign(event.deltaY);},{passive:true});
  addEventListener('pointerdown',()=>{held=true;skip=false;direction=0;cancel();},{passive:true});
  addEventListener('pointerup',()=>{held=false;},{passive:true});
  addEventListener('pointercancel',()=>{held=false;},{passive:true});
  addEventListener('keydown',()=>{skip=true;direction=0;cancel();});
  document.addEventListener('click',event=>{
    const next=event.target.closest('a[data-intro-stop]');
    if(next){
      if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button>0)return;
      const index=Number(next.getAttribute('data-intro-stop'));
      if(index!==1&&index!==2)return;
      event.preventDefault();event.stopPropagation();
      cancel();held=false;direction=0;skip=true;
      moveTo(Math.round(window.AICOStory.range()*stops[index]));
      return;
    }
    if(event.target.closest('a[href^="#"]')){skip=true;cancel();}
  },true);
  addEventListener('resize',()=>{skip=true;cancel();});
  addEventListener('blur',()=>{held=false;skip=true;cancel();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});
  reduced.addEventListener('change',cancel);
})();
