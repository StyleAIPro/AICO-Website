import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const page=new URL('../docs/index-next.html',import.meta.url);
const html=readFileSync(page,'utf8');
const original=readFileSync(new URL('../templates/cast-and-render/archive/aico-material-v6.1/index.html',import.meta.url),'utf8');
test('bundled opening frames are byte-identical to the approved original',()=>{
 const before=JSON.parse(original.match(/var FILM = (\{[^\n]+\});/)[1]);
 const after=JSON.parse(html.match(/var FILM = (\{[^\n]+\});/)[1]);
 assert.equal(after.frames.length,before.frames.length);
 assert.equal(after.width,before.width);assert.equal(after.height,before.height);
 const bundle=readFileSync(new URL(after.bundle,page));
 for(let i=0;i<after.frames.length;i++){
  const expected=Buffer.from(before.frames[i],'base64');
  assert.deepEqual(readFileSync(new URL(after.frames[i],page)),expected,`frame ${i}`);
  assert.deepEqual(bundle.subarray(...after.offsets[i]),expected,`bundled frame ${i}`);
 }
 assert.ok(Buffer.byteLength(html)<200000,'homepage no longer embeds a low-resolution preview');
 assert.equal(after.preview,undefined);
 assert.ok(!html.includes('setLoading(.2)'));
 assert.ok(html.includes('id="bootProgress"'));
 assert.ok(html.includes('id="bootRetry"'));
 assert.ok(!html.includes('href="https://fonts.googleapis.com'));
 assert.ok(html.includes('href="#studio-title" data-intro-stop="1"'));
 assert.ok(html.includes('href="#surface-title" data-intro-stop="2"'));
});
