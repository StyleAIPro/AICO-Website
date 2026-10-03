const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'../../AICO-Harness-Plugin/node_modules/playwright-core');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
 try{for(const mode of ['first-frame-fails','bundle-fails','slow-frames']){
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));let count=0;
  await page.route('**/*.bin',r=>mode==='first-frame-fails'?r.continue():r.abort());
  await page.route('**/*.webp',async r=>{count++;if(mode==='first-frame-fails'&&count===1)return r.abort();if(mode==='slow-frames')await new Promise(resolve=>setTimeout(resolve,180));await r.continue().catch(()=>{});});
  await page.goto(process.argv[2]||'http://127.0.0.1:8766/docs/index.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Number(document.querySelector('#clip').dataset.renders)>0,{},{timeout:12000});
  const frames=[];
  for(const progress of [.29,.5,.87,.29,0]){
   await page.evaluate(p=>window.scrollTo({top:window.AICOStory.range()*p,behavior:'instant'}),progress);
   await page.waitForTimeout(1800);
   await page.waitForFunction(()=>{const c=document.querySelector('#clip');const expected=Math.min(1,scrollY/window.AICOStory.range())*240;return getComputedStyle(c).display!=='none'&&Math.abs(Number(c.dataset.frame)-expected)<2},{},{timeout:12000});
   frames.push(await page.locator('#clip').getAttribute('data-frame'));
  }
  console.log(mode,frames);
  assert.ok(new Set(frames).size>=3);assert.ok(Number(frames.at(-1))<Number(frames[2]));assert.deepEqual(errors,[]);
  console.log('PASS',mode,JSON.stringify({frames,requests:count}));await page.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
