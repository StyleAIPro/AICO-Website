(function(){
  history.scrollRestoration='manual';
  // Keep ordinary links and browser history. Remember the exact reading position
  // for cross-page returns after fonts and layout are ready.
  let leaving=false;
  function remember(){history.replaceState({...history.state,aicoScroll:scrollY},'');}
  document.addEventListener('click',event=>{
    const link=event.target.closest('a[href]');
    if(!link||event.defaultPrevented||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button>0)return;
    const target=new URL(link.href,location.href);
    if(target.origin===location.origin){remember();leaving=target.pathname!==location.pathname;}
  });
  addEventListener('pagehide',()=>{if(!leaving)remember();});
  addEventListener('popstate',()=>{
    const position=history.state?.aicoScroll;
    if(Number.isFinite(position))window.scrollTo({top:position,behavior:'instant'});
    else if(location.hash)document.getElementById(location.hash.slice(1))?.scrollIntoView({behavior:'instant'});
  });
  addEventListener('pageshow',async event=>{
    leaving=false;
    if(!event.persisted&&performance.getEntriesByType('navigation')[0]?.type!=='back_forward')return;
    const position=history.state?.aicoScroll;if(!Number.isFinite(position))return;
    if(document.fonts)await document.fonts.ready;
    requestAnimationFrame(()=>window.scrollTo({top:position,behavior:'instant'}));
  });
})();

// Product directory and command feedback work identically on all pages.
(function(){
  const menus=[...document.querySelectorAll('.product-menu')];
  document.addEventListener('click',event=>menus.forEach(menu=>{if(!menu.contains(event.target)||event.target.closest('a'))menu.open=false}));
  document.addEventListener('keydown',event=>{if(event.key==='Escape')menus.forEach(menu=>{if(menu.open){menu.open=false;menu.querySelector('summary').focus()}})});
  document.querySelectorAll('.developer-section pre').forEach(pre=>{
    const button=document.createElement('button');button.type='button';button.className='code-copy';button.textContent='复制命令';
    const status=document.createElement('span');status.setAttribute('role','status');
    button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(pre.textContent);status.textContent=' 已复制';}catch{status.textContent=' 无法复制，请手动选择上方命令。'}});
    pre.after(button,status);
  });
})();
