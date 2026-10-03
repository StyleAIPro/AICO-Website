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
