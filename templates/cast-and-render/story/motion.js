(function(root){
  'use strict';
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  function poseAt(y,points,height,reduced=false){
    if(y<=points[0].at)return points[0];
    for(let i=1;i<points.length;i++){
      const b=points[i],a=points[i-1];
      if(y>b.at)continue;
      const start=Math.max(a.at,b.at-height*.9);
      let t=reduced?(y>=b.at?1:0):clamp((y-start)/Math.max(1,b.at-start));
      t=t*t*(3-2*t);
      return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,scale:a.scale+(b.scale-a.scale)*t};
    }
    return points[points.length-1];
  }
  function phaseAt(progress){return Math.min(2,Math.floor(clamp(progress)*3));}
  function fragmentAt(a,b,cloud,t,seed,spread){
    const n=i=>{const v=Math.sin(i*127.1+91.7)*43758.5453;return v-Math.floor(v);};
    const u=clamp(t),v=1-u,angle=n(seed+12)*Math.PI*2;
    const dx=Math.cos(angle)*spread*(.3+n(seed+2)*.7),dy=Math.sin(angle)*spread*.45;
    // A shared direction, with modest local separation, avoids a central vortex.
    const c={x:a.x+(b.x-a.x)*.30+dx,y:a.y+(b.y-a.y)*.30+dy};
    const d={x:a.x+(b.x-a.x)*.76+dx*.55,y:a.y+(b.y-a.y)*.76+dy*.55};
    return {x:v*v*v*a.x+3*v*v*u*c.x+3*v*u*u*d.x+u*u*u*b.x,y:v*v*v*a.y+3*v*v*u*c.y+3*v*u*u*d.y+u*u*u*b.y};
  }
  function fragmentPresence(t,first=false){return 1-(first?.78:.88)*Math.sin(Math.PI*clamp(t))**2;}
  function streamAt(a,b,t,bend=140){
    const u=clamp(t),v=1-u,dx=b.x-a.x;
    const c={x:a.x+dx*.32,y:a.y-bend},d={x:b.x-dx*.22,y:b.y-bend*.72};
    return {x:v*v*v*a.x+3*v*v*u*c.x+3*v*u*u*d.x+u*u*u*b.x,y:v*v*v*a.y+3*v*v*u*c.y+3*v*u*u*d.y+u*u*u*b.y};
  }
  const api={clamp,poseAt,phaseAt,fragmentAt,fragmentPresence,streamAt};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.AICOStoryMath=api;
})(typeof window!=='undefined'?window:this);
