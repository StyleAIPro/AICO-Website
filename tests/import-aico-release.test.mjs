import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash, generateKeyPairSync, sign } from 'node:crypto'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { importAicoRelease } from '../scripts/import-aico-release.mjs'

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'aico-site-import-')), source = join(root, 'source'), assets = join(root, 'assets'), site = join(root, 'docs/aico')
  t.after(() => rm(root, { recursive:true, force:true }))
  const releaseId = '2026.09.16-test.1', base = 'https://styleaipro.github.io/AICO-Website/aico/'
  await mkdir(join(source, 'channels'), { recursive:true }); await mkdir(join(source, 'releases', releaseId), { recursive:true }); await mkdir(assets)
  const artifact = Buffer.from('qualified ordinary plugin archive'), artifactName = 'adapter-test.tgz'
  await writeFile(join(assets, artifactName), artifact)
  const hash = bytes => createHash('sha256').update(bytes).digest('hex')
  const indexBytes = Buffer.from(JSON.stringify({ schema:3, releaseId, createdAt:'2026-09-16T00:00:00.000Z', compatibility:[{desktopPackage:'dsh-plugin-desktop-beta',desktopVersion:'2.0.10-beta.1',dshVersion:'0.1.5-rc.2'}], products:[{id:'aico-harness',line:'adapter',version:'2.0.0',resources:[],artifacts:[{id:'adapter',kind:'bundle',target:'all',url:`https://gitcode.com/AICO-Ascend/AICO-Harness/releases/download/${releaseId}/${artifactName}`,sha256:hash(artifact),bytes:artifact.length}]}] }))
  const channelBytes = Buffer.from(JSON.stringify({ schema:3, channel:'preview', sequence:7, issuedAt:'2026-09-16T00:01:00.000Z', expiresAt:'2026-09-23T00:01:00.000Z', snapshot:{url:`${base}releases/${releaseId}/index.json`,sha256:hash(indexBytes),bytes:indexBytes.length} }))
  const { privateKey, publicKey } = generateKeyPairSync('ed25519')
  const envelope = bytes => Buffer.from(JSON.stringify({schema:1,algorithm:'ed25519',keyId:'test',signature:sign(null,bytes,privateKey).toString('base64')}))
  await writeFile(join(source,'channels/preview.json'),channelBytes); await writeFile(join(source,'channels/preview.json.sig'),envelope(channelBytes))
  await writeFile(join(source,'releases',releaseId,'index.json'),indexBytes); await writeFile(join(source,'releases',releaseId,'index.json.sig'),envelope(indexBytes))
  return { root, source, assets, site, releaseId, artifactName, channelBytes, envelope, config:{schema:1,sourceDirectory:source,artifactDirectory:assets,siteDirectory:site,siteBaseUrl:base,channel:'preview',trustedKeys:{test:publicKey}}, now:Date.parse('2026-09-16T01:00:00.000Z') }
}

test('verified assembler output publishes immutable snapshot before the signed channel', async t => {
  const f = await fixture(t)
  const first = await importAicoRelease(f.config,{now:f.now})
  assert.deepEqual({...first},{releaseId:f.releaseId,channel:'preview',sequence:7,artifacts:1,snapshot:join(f.site,'releases',f.releaseId,'index.json')})
  assert.deepEqual(await readFile(join(f.site,'channels/preview.json')),await readFile(join(f.source,'channels/preview.json')))
  assert.deepEqual(await readFile(first.snapshot),await readFile(join(f.source,'releases',f.releaseId,'index.json')))
  assert.equal((await importAicoRelease(f.config,{now:f.now})).releaseId,f.releaseId)
})

test('bad signatures, artifact drift, extra site files and immutable replacement are refused', async t => {
  const cases = [
    async f => writeFile(join(f.source,'channels/preview.json.sig'),'{}'),
    async f => writeFile(join(f.assets,f.artifactName),'changed'),
    async f => writeFile(join(f.source,'extra.json'),'{}'),
  ]
  for (const mutate of cases) {
    const f = await fixture(t); await mutate(f)
    await assert.rejects(importAicoRelease(f.config,{now:f.now}))
  }
  const f = await fixture(t); await importAicoRelease(f.config,{now:f.now})
  await writeFile(join(f.site,'releases',f.releaseId,'index.json'),'different')
  await assert.rejects(importAicoRelease(f.config,{now:f.now}),/different bytes/)
})

test('a signed channel cannot replace the same or a newer published sequence', async t => {
  const f = await fixture(t); await importAicoRelease(f.config,{now:f.now})
  for (const sequence of [7, 6]) {
    const channel = JSON.parse(f.channelBytes)
    channel.sequence = sequence
    channel.issuedAt = '2026-09-16T00:02:00.000Z'
    const bytes = Buffer.from(JSON.stringify(channel))
    await writeFile(join(f.source,'channels/preview.json'),bytes)
    await writeFile(join(f.source,'channels/preview.json.sig'),f.envelope(bytes))
    await assert.rejects(importAicoRelease(f.config,{now:f.now}),/sequence must increase/)
  }
})

test('an incomplete published channel is refused in either direction', async t => {
  for (const filename of ['preview.json', 'preview.json.sig']) {
    const f = await fixture(t)
    await mkdir(join(f.site,'channels'),{recursive:true})
    await writeFile(join(f.site,'channels',filename),'incomplete')
    await assert.rejects(importAicoRelease(f.config,{now:f.now}),/incomplete/)
  }
})
