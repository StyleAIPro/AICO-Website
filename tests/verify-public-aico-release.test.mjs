import assert from 'node:assert/strict'
import { createHash, generateKeyPairSync, sign } from 'node:crypto'
import test from 'node:test'
import { verifyPublicAicoRelease } from '../scripts/verify-public-aico-release.mjs'

const base = 'https://styleaipro.github.io/AICO-Website/aico/'
function fixture(change = () => {}) {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519')
  const artifact = Buffer.from('qualified adapter')
  const artifactUrl = 'https://gitcode.com/AICO-Ascend/AICO-Harness/releases/download/release-1/adapter.tgz'
  const snapshotValue = { schema: 3, releaseId: 'release-1', createdAt: '2026-09-16T00:00:00.000Z', compatibility: [{}], products: [
    { id: 'aico-harness', artifacts: [{ id: 'adapter', url: artifactUrl, bytes: artifact.length, sha256: createHash('sha256').update(artifact).digest('hex') }] },
  ] }
  change({ snapshotValue, artifact })
  const snapshot = Buffer.from(JSON.stringify(snapshotValue))
  const channel = Buffer.from(JSON.stringify({ schema: 3, channel: 'preview', sequence: 7, issuedAt: '2026-09-16T00:00:00.000Z', expiresAt: '2026-09-18T00:00:00.000Z',
    snapshot: { url: base + 'releases/release-1/index.json', bytes: snapshot.length, sha256: createHash('sha256').update(snapshot).digest('hex') } }))
  const signature = bytes => Buffer.from(JSON.stringify({ schema: 1, algorithm: 'ed25519', keyId: 'production', signature: sign(null, bytes, privateKey).toString('base64') }))
  const responses = new Map([
    [base + 'channels/preview.json', channel], [base + 'channels/preview.json.sig', signature(channel)],
    [base + 'releases/release-1/index.json', snapshot], [base + 'releases/release-1/index.json.sig', signature(snapshot)], [artifactUrl, artifact],
  ])
  const requests = []
  const fetcher = async (url, options) => { requests.push({ url: url.href, options }); return responses.has(url.href) ? new Response(responses.get(url.href)) : new Response('', { status: 404 }) }
  return { config: { schema: 1, channelUrl: base + 'channels/preview.json', expectedChannel: 'preview', trustedKeys: { production: publicKey.export({ type: 'spki', format: 'pem' }).toString() }, maxArtifactBytes: 1024 }, fetcher, requests, responses }
}

test('anonymous verifier authenticates Pages documents and every GitCode artifact', async () => {
  const value = fixture()
  const receipt = await verifyPublicAicoRelease(value.config, { fetcher: value.fetcher, now: Date.parse('2026-09-17T00:00:00.000Z') })
  assert.equal(receipt.releaseId, 'release-1')
  assert.equal(receipt.artifacts.length, 1)
  assert.equal(receipt.artifacts[0].filename, 'adapter.tgz')
  assert.ok(value.requests.every(request => request.options.credentials === 'omit' && request.options.redirect === 'manual'))
})

test('anonymous verifier rejects changed, missing, oversized and downgraded public bytes', async () => {
  const changed = fixture(); changed.responses.set('https://gitcode.com/AICO-Ascend/AICO-Harness/releases/download/release-1/adapter.tgz', Buffer.from('changed adapter'))
  await assert.rejects(verifyPublicAicoRelease(changed.config, { fetcher: changed.fetcher, now: Date.parse('2026-09-17T00:00:00.000Z') }), /mismatch/)
  const missing = fixture(); missing.responses.delete(base + 'releases/release-1/index.json.sig')
  await assert.rejects(verifyPublicAicoRelease(missing.config, { fetcher: missing.fetcher, now: Date.parse('2026-09-17T00:00:00.000Z') }), /failed/)
  const oversized = fixture(); oversized.config.maxArtifactBytes = 4
  await assert.rejects(verifyPublicAicoRelease(oversized.config, { fetcher: oversized.fetcher, now: Date.parse('2026-09-17T00:00:00.000Z') }), /artifact/)
  const downgrade = fixture(); downgrade.responses.set(base + 'channels/preview.json', undefined)
  downgrade.fetcher = async url => url.href === base + 'channels/preview.json'
    ? new Response('', { status: 302, headers: { location: 'http://example.com/channel.json' } })
    : new Response(downgrade.responses.get(url.href))
  await assert.rejects(verifyPublicAicoRelease(downgrade.config, { fetcher: downgrade.fetcher, now: Date.parse('2026-09-17T00:00:00.000Z') }), /redirect/)
})
