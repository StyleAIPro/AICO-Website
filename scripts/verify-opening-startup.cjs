// Isolated-browser regression: the optional film must not block first paint.
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'../../AICO-Harness-Plugin/node_modules/playwright-core');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox']});
 try{
  for(const mode of ['bundle-stalled','all-frames-stalled','bundle-failed']){
   const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*.bin',route=>mode==='bundle-failed'?route.abort():undefined);
   if(mode==='all-frames-stalled')await page.route('**/*.webp',()=>{});
   await page.goto(process.argv[2]||'http://127.0.0.1:8766/docs/index.html',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#boot').classList.contains('done'),{},{timeout:4000});
   if(mode!=='all-frames-stalled')await page.waitForFunction(()=>Number(document.querySelector('#clip').dataset.renders)>0,{},{timeout:1000});
   await page.waitForTimeout(400);
   const link=page.locator('.chrome a[href*="install.html"]').first();await link.click();await page.waitForURL('**/install.html*');
   assert.deepEqual(errors,[]);console.log('PASS',mode,'— home visible and installation navigation usable');await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
