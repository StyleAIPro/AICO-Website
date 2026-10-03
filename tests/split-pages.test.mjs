import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const root=new URL('../docs/',import.meta.url);
const files=['index-next.html','install-next.html','developers-next.html'];
const pages=Object.fromEntries(files.map(file=>[file,readFileSync(new URL(file,root),'utf8')]));
test('candidate pages share navigation and every local destination resolves',()=>{
 for(const [file,html] of Object.entries(pages)){
  assert.equal((html.match(/<h1\b/g)||[]).length,1,file);
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,new Set(ids).size,file);
  for(const match of html.matchAll(/href="([^"\s]+)"/g)){
   if(/^(https?:|data:)/.test(match[1]))continue;
   const target=new URL(match[1],new URL(file,root));
   assert.ok(existsSync(new URL(target.pathname,'file:')),match[1]);
   if(target.hash){const content=pages[target.pathname.split('/').at(-1)]||readFileSync(new URL(target.pathname,'file:'),'utf8');assert.ok(content.includes(`id="${target.hash.slice(1)}"`),`${file}: ${match[1]}`);}
  }
  assert.ok(html.includes('aria-label="产品章节"'));
 }
});
test('long content lives only on its dedicated page and retains setup guidance',()=>{
 assert.ok(!pages['index-next.html'].includes('id="aico2-adapter"'));
 assert.ok(!pages['index-next.html'].includes('id="dev-source"'));
 assert.ok(pages['install-next.html'].includes('浏览器助手只需首次配置一次'));
 assert.ok(pages['install-next.html'].includes('href="#install" aria-current="page"'));
 assert.ok(pages['developers-next.html'].includes('href="#developers" aria-current="page"'));
 for(const file of files.slice(1)){assert.ok(!pages[file].includes('href="site.css"'));assert.ok(!pages[file].includes('var FILM ='));}
});
