// Validate actual intermediate canvas pixels, not just the final scroll pose.
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'../../AICO-Harness-Plugin/node_modules/playwright-core');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
try{for(const width of [1440,390]){const page=await browser.newPage({viewport:{width,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));

 for(let attempt=0;;attempt++){try{await page.goto(process.argv[2]||'http://127.0.0.1:8766/docs/index.html',{waitUntil:'domcontentloaded'});break}catch(e){if(attempt>=2||!e.message.includes('ERR_NETWORK_CHANGED'))throw e}}
 await page.waitForFunction(()=>document.querySelector('#boot').dataset.state==='ready');
 for(const name of ['探索 AICO','继续探索']){
  await page.getByRole('link',{name,exact:true}).click();const samples=[];
  for(let n=0;n<25;n++){await page.waitForTimeout(60);samples.push(await page.evaluate(()=>{
   const c=document.querySelector('#clip'),small=document.createElement('canvas');small.width=96;small.height=54;const ctx=small.getContext('2d');ctx.drawImage(c,0,0,96,54);let hash=0;
   for(const value of ctx.getImageData(0,0,96,54).data)hash=(Math.imul(hash,31)+value)|0;
   return {frame:c.dataset.frame,hash,quality:c.dataset.quality};
  }))}
  assert.ok(samples.every(s=>s.quality==='full'),'Every intermediate frame must be original resolution');
  const frames=new Set(samples.map(s=>s.frame)).size,pixels=new Set(samples.map(s=>s.hash)).size;
  assert.ok(frames>=18,`${name}: only ${frames} intermediate frames`);assert.ok(pixels>=18,`${name}: only ${pixels} actual canvas changes`);
  console.log('PASS',JSON.stringify({width,name,frames,pixels,quality:'full'}));await page.waitForTimeout(600);
 }
 for(const progress of [.7,.25,.9,0]){
  await page.evaluate(p=>window.scrollTo({top:window.AICOStory.range()*p,behavior:'instant'}),progress);
  await page.waitForFunction(()=>{const canvas=document.querySelector('#clip');return canvas.dataset.quality==='full'&&Math.abs(Number(canvas.dataset.frame)-Math.min(1,scrollY/window.AICOStory.range())*240)<.6});
  assert.ok(Number(await page.locator('#clip').getAttribute('data-cache'))<=24);
 }
 console.log('PASS',JSON.stringify({width,reverseScroll:'full-resolution current frame',cacheLimit:24}));
 assert.deepEqual(errors,[]);await page.close();
}}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
