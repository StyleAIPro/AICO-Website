// Real-browser regression: original pixels, byte progress, failure and retry.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'../../AICO-Harness-Plugin/node_modules/playwright-core');
const root=path.resolve(__dirname,'../docs');
let mode='stream',sent=0,complete=false,frameRequests=0;
const types={'.html':'text/html; charset=utf-8','.mjs':'text/javascript','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json','.bin':'application/octet-stream'};
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const file=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 let body;try{body=fs.readFileSync(file)}catch{res.writeHead(404).end();return}
 const bundle=file.endsWith('.bin'),frame=file.endsWith('.webp');if(frame)frameRequests++;
 res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');
 if(mode==='unavailable'&&(bundle||frame)){res.writeHead(503).end();return}
 if(mode==='fallback'&&bundle){res.writeHead(404).end();return}
 if(mode==='truncated'&&bundle){res.end(body.subarray(0,100000));return}
 if(mode==='stalled'&&bundle){res.write(body.subarray(0,65536));return}
 if(bundle&&mode==='stream'){
  let at=0;const timer=setInterval(()=>{const chunk=body.subarray(at,at+65536);res.write(chunk);at+=chunk.length;sent=at;if(at===body.length){clearInterval(timer);complete=true;res.end()}},18);
  res.on('close',()=>clearInterval(timer));return;
 }
 res.end(body);
});
const snapshot=page=>page.evaluate(()=>{
 const b=document.getElementById('boot'),c=document.getElementById('clip');
 return {state:b.dataset.state,visible:!b.classList.contains('done'),percent:Number(document.getElementById('bootProgress').getAttribute('aria-valuenow')),received:Number(b.dataset.received),total:Number(b.dataset.total),quality:c.dataset.quality,frame:Number(c.dataset.frame),renders:Number(c.dataset.renders),dimensions:window.decodedOpeningFrames};
});
async function newPage(browser,options={}){
 const page=await browser.newPage(options);page.errors=[];page.on('pageerror',error=>page.errors.push(error.message));
 await page.addInitScript(()=>{
  window.decodedOpeningFrames=[];const decode=window.createImageBitmap;
  if(decode)window.createImageBitmap=async function(...args){const image=await decode.apply(this,args);window.decodedOpeningFrames.push([image.width,image.height]);return image;};
 });
 return page;
}
async function ready(page){
 await page.waitForFunction(()=>document.getElementById('boot').dataset.state==='ready',null,{timeout:25000});
 const result=await snapshot(page);assert.equal(result.visible,false);assert.equal(result.percent,100);assert.equal(result.received,result.total);assert.equal(result.quality,'full');assert.ok(result.renders>0);
 assert.ok(result.dimensions.length>=9);assert.ok(result.dimensions.every(([w,h])=>w===1280&&h===720),'Only unchanged original frames may be decoded');assert.deepEqual(page.errors,[]);return result;
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url=`http://127.0.0.1:${server.address().port}/index.html`;
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
 try{
  const page=await newPage(browser,{viewport:{width:1440,height:900}});await page.goto(url,{waitUntil:'domcontentloaded'});
  const percents=[];
  for(let i=0;i<100;i++){
   await page.waitForTimeout(35);const state=await snapshot(page);
   if(state.state==='loading'){
    assert.equal(state.visible,true);assert.equal(state.percent,Math.floor(state.received/state.total*100));assert.equal(state.dimensions.length,0,'Do not reveal a partial or preview opening');percents.push(state.percent);
    if(state.percent>=20&&state.percent<60&&process.env.OPENING_SCREENSHOTS)await page.screenshot({path:path.join(process.env.OPENING_SCREENSHOTS,'loading.png')});
   }
   if(state.state==='ready')break;
  }
  assert.ok(new Set(percents).size>=8,'Byte progress must advance across more than one fixed percentage');assert.equal(complete,true);await ready(page);assert.equal(frameRequests,0,'Bundle path must avoid duplicate individual frame requests');
  if(process.env.OPENING_SCREENSHOTS)await page.screenshot({path:path.join(process.env.OPENING_SCREENSHOTS,'ready.png')});
  console.log('PASS streamed original bundle',JSON.stringify({samples:[...new Set(percents)],bytes:sent,quality:'1280x720 only'}));await page.close();
  for(const scenario of ['fallback','truncated','stalled']){
   mode=scenario;frameRequests=0;const page=await newPage(browser);await page.goto(url,{waitUntil:'domcontentloaded'});await ready(page);assert.ok(frameRequests>=241);console.log('PASS',scenario,'— original frame fallback');await page.close();
  }
  mode='unavailable';const retry=await newPage(browser,{viewport:{width:390,height:844}});await retry.goto(url,{waitUntil:'domcontentloaded'});
  await retry.getByRole('button',{name:'重新加载',exact:true}).waitFor();assert.equal((await snapshot(retry)).visible,true);assert.equal(await retry.locator('#boot').getAttribute('data-state'),'error');
  if(process.env.OPENING_SCREENSHOTS)await retry.screenshot({path:path.join(process.env.OPENING_SCREENSHOTS,'error-mobile.png')});
  mode='normal';await retry.getByRole('button',{name:'重新加载',exact:true}).click();await ready(retry);console.log('PASS failed load → retry → original mobile opening');await retry.close();
  mode='unavailable';const guide=await newPage(browser);await guide.goto(url,{waitUntil:'domcontentloaded'});await guide.getByRole('link',{name:'查看安装指南',exact:true}).click();await guide.waitForURL('**/install.html*');assert.deepEqual(guide.errors,[]);console.log('PASS installation navigation remains available');await guide.close();
  mode='normal';const reduced=await newPage(browser,{reducedMotion:'reduce'});await reduced.goto(url,{waitUntil:'domcontentloaded'});await ready(reduced);assert.deepEqual(reduced.errors,[]);console.log('PASS reduced motion uses original frame');await reduced.close();
 }finally{await browser.close();server.closeAllConnections();server.close()}
})().catch(error=>{console.error(error);server.closeAllConnections();server.close();process.exitCode=1});
