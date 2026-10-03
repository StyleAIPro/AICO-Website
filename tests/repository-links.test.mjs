import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../templates/cast-and-render/v21.html',import.meta.url),'utf8');
test('product titles link to verified GitCode repositories with accessible new-tab labels',()=>{
 const links=[...html.matchAll(/<a class="repository-link"[^>]+>/g)].map(m=>m[0]);
 assert.equal(links.length,4);
 for(const [i,repo] of ['AICO-Harness-Plugin','AICO-PPT','AICO-Profile','AICO-wiki'].entries()){
  assert.ok(links[i].includes('https://gitcode.com/AICO-Ascend/'+repo));
  assert.match(links[i],/target="_blank" rel="noopener noreferrer"/);
  assert.match(links[i],/aria-label="[^\"]+新标签页/);
 }
 assert.ok(!html.includes('https://gitcode.com/AICO-Ascend/AICO-Wiki'));
 assert.ok(html.includes('href="../../docs/developers-next.html#developers"'));
});
