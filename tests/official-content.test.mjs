import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const page=new URL('../docs/index-next.html',import.meta.url);
const html=readFileSync(page,'utf8');
test('opening removes eyebrows and uses clear outcome copy',()=>{
 for(const text of ['AICO 2.0 · 对话、工具与成果','按需扩展的专业能力','你的工作，你来掌握','不止回答。','继续完成。'])assert.ok(!html.includes(text),text);
 assert.ok(html.includes('不止于对话，<br />更能完成工作。'));
 assert.ok(html.includes('随时查看、修改，让成果真正用起来。'));
 for(const text of ['Objects studio','Across the studio','The surface'])assert.ok(!html.includes(`<p class="eyebrow">${text}`));
});
test('opening CTA sequence advances through both snap points before Harness',()=>{
 assert.match(html,/<a class="pill" href="#studio-title" data-intro-stop="1">探索 AICO<\/a>/);
 assert.match(html,/<a class="pill" href="#surface-title" data-intro-stop="2">继续探索<\/a>/);
 assert.match(html,/<a class="pill" href="#harness">探索产品<\/a>/);
 assert.ok(!html.includes('>查看安装指引</a>'));
});
test('bottom navigation includes home and developer destinations',()=>{
 const dock=html.match(/<nav class="chapter-dock"[^>]*>([\s\S]*?)<\/nav>/)[1];
 assert.deepEqual([...dock.matchAll(/href="([^"]+)">([^<]+)<\/a>/g)].map(m=>[m[1],m[2]]),[['#top','首页'],['#ppt','PPT'],['#profile','Profile'],['#wiki','Wiki'],['./install-next.html#install','安装'],['./developers-next.html#developers','开发者']]);
 assert.match(html, /class="product-menu"/);
 assert.match(html, /href="#harness-tools">迁移调优工具/);
});
test('official candidate replaces studio placeholders and includes product detail',()=>{
 for(const text of ['Built at four','Flat, never bent','112 Render Lane','Start a brief','安装插件即可建库','候选知识页'])assert.ok(!html.includes(text),text);
 for(const text of ['从一个想法','常驻工作台','可编辑或高清图片模式','沿证据定位','个人画像','不再记忆','正式插件包待发布核验'])assert.ok(html.includes(text),text);
 assert.equal((html.match(/<h1\b/g)||[]).length,1);
 assert.equal((html.match(/class="capability-list"/g)||[]).length,4);
});
test('candidate local resources and fragment destinations resolve under Pages docs root',()=>{
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(new Set(ids).size,ids.length,'duplicate element IDs');
 for(const m of html.matchAll(/(?:href|src)="([^"\s]+)"/g)){
  const url=m[1];
  if(url.startsWith('#'))assert.ok(ids.includes(url.slice(1)),url);
  else if(!/^(data:|https?:)/.test(url))assert.ok(existsSync(new URL(url.split("#")[0],page)),url);
 }
 assert.ok(!html.includes('id="aico2-adapter"'));
 assert.ok(html.includes('src="./aico-release.mjs"'));
 assert.ok(!html.includes('../../docs/'));
});
