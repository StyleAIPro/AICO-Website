// The first paint never waits for the full animation download.
var filmBlob=null,filmStarted=false;
function fetchOpening(url,timeout){
  var controller=new AbortController(),timer=setTimeout(function(){controller.abort();},timeout);
  return fetch(url,{signal:controller.signal}).then(function(response){
    if(!response.ok)throw new Error('Opening asset unavailable');
    return response.blob();
  }).finally(function(){clearTimeout(timer);});
}
function warmFilm(){
  if(filmStarted||(navigator.connection&&navigator.connection.saveData))return;
  filmStarted=true;
  setTimeout(function(){
    fetchOpening(FILM.bundle,30000).then(function(blob){filmBlob=blob;}).catch(function(){/* Individual frames remain available. */});
  },1000);
}
function openingFrame(index){
  if(filmBlob){var span=FILM.offsets[index];return Promise.resolve(filmBlob.slice(span[0],span[1],'image/webp'));}
  return fetchOpening(FILM.frames[index],8000);
}
// An optional visual must not indefinitely cover navigation or product content.
var openingDeadline=setTimeout(function(){
  document.getElementById('boot').classList.add('done');
},2500);
