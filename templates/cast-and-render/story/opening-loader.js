// Paint the first frame independently; keep scroll targets ahead of prefetches.
var filmBlob=null,filmStarted=false,frameRequests=new Map(),frameRetryTimer=0;
function fetchOpening(url,timeout,controller,priority){
  controller=controller||new AbortController();
  var timer=setTimeout(function(){controller.abort();},timeout);
  return fetch(url,{signal:controller.signal,priority:priority||'low'}).then(function(response){
    if(!response.ok)throw new Error('Opening asset unavailable');
    return response.blob();
  }).finally(function(){clearTimeout(timer);});
}
function warmFilm(){
  if(filmStarted||(navigator.connection&&navigator.connection.saveData))return;
  filmStarted=true;
  setTimeout(function(){
    fetchOpening(FILM.bundle,120000).then(function(blob){
      filmBlob=blob;
      // Release stale network work and decode the current scroll position now.
      frameRequests.forEach(function(controller){controller.abort();});
      requestImages();schedule();
    }).catch(function(){filmStarted=false;/* Individual frames continue working. */});
  },1000);
}
function openingFrame(index){
  if(filmBlob){var span=FILM.offsets[index];return Promise.resolve(filmBlob.slice(span[0],span[1],'image/webp'));}
  var controller=new AbortController();frameRequests.set(index,controller);
  return fetchOpening(FILM.frames[index],8000,controller,'high').finally(function(){
    if(frameRequests.get(index)===controller)frameRequests.delete(index);
  });
}
function prioritizeFrames(){
  frameRequests.forEach(function(controller,index){
    if(Math.abs(index-target)>2)controller.abort();
  });
}
function retryOpeningFrame(index){
  // Network errors must never switch the renderer permanently to a still image.
  jobs.delete(index);pump();
  if(Math.abs(index-target)<=1&&!frameRetryTimer){
    frameRetryTimer=setTimeout(function(){frameRetryTimer=0;requestImages();},750);
  }
}
// An optional visual must not indefinitely cover navigation or product content.
var openingDeadline=setTimeout(function(){
  document.getElementById('boot').classList.add('done');
},2500);

// All preview samples arrive with the document, so scrolling never races HTTP.
var previewFrames=new Map();
Promise.all(FILM.preview.frames.map(function(frame){
  var raw=atob(frame.data),bytes=new Uint8Array(raw.length);
  for(var i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  var blob=new Blob([bytes],{type:'image/webp'});
  function imageFallback(){return new Promise(function(resolve,reject){
    var image=new Image(),url=URL.createObjectURL(blob);
    image.onload=function(){URL.revokeObjectURL(url);resolve(image);};
    image.onerror=function(){URL.revokeObjectURL(url);reject(new Error('Preview unavailable'));};image.src=url;
  });}
  return (typeof createImageBitmap==='function'?createImageBitmap(blob).catch(imageFallback):imageFallback()).then(function(image){
    previewFrames.set(frame.index,{image:image,used:0});
  });
})).then(function(){
  clearTimeout(openingDeadline);setLoading(1);boot.classList.add('done');warmFilm();drawn=-1;schedule();
}).catch(function(){/* Full-resolution frame loading remains independent. */});
function openingPair(lower,upper){
  var a=cache.get(lower),b=cache.get(upper);
  if(a&&b)return {a:a,b:b,mix:target-lower,preview:false};
  var start=Math.floor(target/FILM.preview.step)*FILM.preview.step;
  var end=Math.min(start+FILM.preview.step,FILM.frames.length-1);
  a=previewFrames.get(start);b=previewFrames.get(end);
  if(!a||!b)return null;
  return {a:a,b:b,mix:end===start?0:(target-start)/(end-start),preview:true};
}
