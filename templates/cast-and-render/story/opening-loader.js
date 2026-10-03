// Download the unchanged original frames before revealing the opening.
var filmBlob=null,openingFrames=[],openingState='idle',openingAttempt=0;
var openingControllers=new Set(),openingInitial=[],openingLocked=[];
var openingTotal=FILM.offsets[FILM.offsets.length-1][1];
var openingRetry=document.getElementById('bootRetry');
var openingDetail=document.getElementById('bootDetail');
var openingProgress=document.getElementById('bootProgress');
function lockOpening(){
  document.documentElement.setAttribute('data-opening-loading','');
  Array.from(document.body.children).forEach(function(element){
    if(element.id!=='boot'&&element.tagName!=='SCRIPT'&&!element.inert){element.inert=true;openingLocked.push(element);}
  });
}
function unlockOpening(){
  document.documentElement.removeAttribute('data-opening-loading');
  openingLocked.forEach(function(element){element.inert=false;});openingLocked=[];
}
function openingDownloaded(bytes,label){
  var percent=Math.min(100,Math.floor(bytes/openingTotal*100));
  bootBar.style.transform='scaleX('+(bytes/openingTotal)+')';
  openingProgress.setAttribute('aria-valuenow',String(percent));
  bootPct.textContent='加载原画 '+percent+'%';
  openingDetail.textContent=label+' · '+(bytes/1048576).toFixed(1)+' / '+(openingTotal/1048576).toFixed(1)+' MB';
  boot.dataset.received=String(bytes);boot.dataset.total=String(openingTotal);
}
function abortOpeningRequests(){
  openingControllers.forEach(function(controller){controller.abort();});openingControllers.clear();
}
async function fetchOpening(url,expected,onProgress,attempt){
  var controller=new AbortController(),timer;openingControllers.add(controller);
  // A slow but advancing transfer is allowed; a silent connection is not endless.
  function arm(){clearTimeout(timer);timer=setTimeout(function(){controller.abort();},15000);}
  arm();
  try{
    var response=await fetch(url,{signal:controller.signal,priority:'high'});
    if(!response.ok)throw new Error('Opening asset unavailable');
    var chunks=[],received=0;
    if(response.body&&response.body.getReader){
      var reader=response.body.getReader();
      while(true){
        var part=await reader.read();if(part.done)break;
        received+=part.value.byteLength;if(received>expected)throw new Error('Unexpected opening asset size');
        chunks.push(part.value);arm();if(attempt===openingAttempt)onProgress(received);
      }
    }else{
      var bytes=await response.arrayBuffer();chunks=[bytes];received=bytes.byteLength;
      if(attempt===openingAttempt)onProgress(received);
    }
    if(received!==expected)throw new Error('Incomplete opening asset');
    return new Blob(chunks,{type:'application/octet-stream'});
  }finally{clearTimeout(timer);controller.abort();openingControllers.delete(controller);}
}
async function downloadOpening(attempt){
  try{
    var bundle=await fetchOpening(FILM.bundle,openingTotal,function(bytes){openingDownloaded(bytes,'正在下载');},attempt);
    if(attempt!==openingAttempt)return;filmBlob=bundle;
  }catch(error){
    if(attempt!==openingAttempt)return;
    // Static hosts may reject .bin: the identical WebP frames remain usable.
    var next=0,received=new Array(FILM.frames.length).fill(0);openingDownloaded(0,'正在逐帧加载');
    async function worker(){
      while(next<FILM.frames.length&&attempt===openingAttempt){
        var index=next++,span=FILM.offsets[index];
        var blob=await fetchOpening(FILM.frames[index],span[1]-span[0],function(bytes){
          received[index]=bytes;openingDownloaded(received.reduce(function(sum,value){return sum+value;},0),'正在逐帧加载');
        },attempt);
        if(attempt===openingAttempt)openingFrames[index]=blob;
      }
    }
    await Promise.all([worker(),worker(),worker(),worker()]);
  }
}
function showOpeningError(message){
  openingAttempt++;abortOpeningRequests();openingState='error';failed=true;queue=[];
  boot.dataset.state='error';boot.classList.remove('done');
  if(!document.documentElement.hasAttribute('data-opening-loading'))lockOpening();
  bootPct.textContent='原画加载未完成';openingDetail.textContent=message||'连接中断或资源暂时不可用，请重试。';
  openingRetry.hidden=false;openingRetry.disabled=false;
}
function openingFrame(index){
  if(filmBlob){var span=FILM.offsets[index];return Promise.resolve(filmBlob.slice(span[0],span[1],'image/webp'));}
  if(openingFrames[index])return Promise.resolve(openingFrames[index].slice(0,undefined,'image/webp'));
  return Promise.reject(new Error('Original opening frame not loaded'));
}
function openingDecoded(){
  if(openingState!=='preparing')return;
  var count=openingInitial.filter(function(index){return cache.has(index);}).length;
  openingDetail.textContent='原画已下载，正在准备播放 · '+count+' / '+openingInitial.length;
  drawn=-1;schedule();
}
function finishOpening(){
  if(openingState!=='preparing'||!openingInitial.every(function(index){return cache.has(index);}))return;
  openingState='ready';ready=true;boot.dataset.state='ready';bootPct.textContent='加载完成 100%';openingDetail.textContent='原画已就绪';
  boot.classList.add('done');unlockOpening();
  if(document.activeElement===openingRetry)document.querySelector('[data-intro-stop]')?.focus({preventScroll:true});
}
function openingPair(lower,upper){
  var a=cache.get(lower),b=cache.get(upper);return a&&b?{a:a,b:b,mix:target-lower}:null;
}
function startOpening(){
  var attempt=++openingAttempt;abortOpeningRequests();
  cache.forEach(function(item){if(item.image.close)item.image.close();});cache.clear();jobs.clear();queue=[];
  filmBlob=null;openingFrames=[];failed=false;ready=false;drawn=-1;
  openingState='loading';boot.dataset.state='loading';boot.classList.remove('done');
  openingRetry.hidden=true;openingRetry.disabled=true;openingDownloaded(0,'正在连接');
  if(!document.documentElement.hasAttribute('data-opening-loading'))lockOpening();
  if(!ctx){showOpeningError('浏览器无法显示开场，请更新浏览器后重试，或直接查看安装指南。');return;}
  downloadOpening(attempt).then(function(){
    if(attempt!==openingAttempt)return;
    openingState='preparing';boot.dataset.state='preparing';openingDownloaded(openingTotal,'原画已下载');
    var lower=Math.floor(target),upper=Math.ceil(target);openingInitial=[];
    for(var index=Math.max(0,lower-8);index<=Math.min(FILM.frames.length-1,upper+8);index++)openingInitial.push(index);
    requestImages();openingDecoded();
  }).catch(function(){if(attempt===openingAttempt)showOpeningError();});
}
openingRetry.addEventListener('click',startOpening);
