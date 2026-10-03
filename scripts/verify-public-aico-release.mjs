/** Anonymously re-download and verify one published AICO channel and every advertised artifact. */
import { createHash, createPublicKey, verify } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const digestPattern = /^[a-f0-9]{64}$/
const releasePattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/
function exact(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) throw new Error(`Invalid ${label}`)
  return value
}
function anonymousHttps(value, label) {
  const url = value instanceof URL ? new URL(value) : new URL(value)
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) throw new Error(`Invalid ${label}`)
  return url
}
async function download(fetcher, initial, maximum, redirects = 5) {
  let url = anonymousHttps(initial, 'download URL')
  for (let count = 0; ; count += 1) {
    const response = await fetcher(url, { cache: 'no-store', credentials: 'omit', redirect: 'manual' })
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (count >= redirects) throw new Error('Release download has too many redirects')
      const location = response.headers.get('location')
      if (!location) throw new Error('Release redirect has no location')
      url = anonymousHttps(new URL(location, url), 'release redirect')
      continue
    }
    if (!response.ok || response.body === null) throw new Error(`Release download failed: ${response.status}`)
    const declared = Number(response.headers.get('content-length'))
    if (Number.isFinite(declared) && declared > maximum) throw new Error('Release download exceeds its limit')
    const chunks = []; let length = 0
    for await (const chunk of response.body) {
      const bytes = Buffer.from(chunk); length += bytes.length
      if (length > maximum) throw new Error('Release download exceeds its limit')
      chunks.push(bytes)
    }
    if (!length) throw new Error('Release download is empty')
    return { bytes: Buffer.concat(chunks, length), finalUrl: url.href }
  }
}
function envelope(bytes, trustedKeys) {
  const value = exact(JSON.parse(bytes), ['schema', 'algorithm', 'keyId', 'signature'], 'signature envelope')
  if (value.schema !== 1 || value.algorithm !== 'ed25519' || typeof value.keyId !== 'string' || typeof value.signature !== 'string'
    || !Object.hasOwn(trustedKeys, value.keyId)) throw new Error('Release signature uses an untrusted key')
  return value
}
function authenticate(bytes, signature, trustedKeys) {
  const key = createPublicKey(trustedKeys[signature.keyId])
  if (key.asymmetricKeyType !== 'ed25519' || !verify(null, bytes, key, Buffer.from(signature.signature, 'base64'))) throw new Error('Invalid release signature')
}
function digest(bytes) { return createHash('sha256').update(bytes).digest('hex') }

/** Verify public Pages documents and GitCode attachment bytes without credentials or local release inputs. */
export async function verifyPublicAicoRelease(config, { fetcher = fetch, now = Date.now() } = {}) {
  exact(config, ['schema', 'channelUrl', 'expectedChannel', 'trustedKeys', 'maxArtifactBytes'], 'public verification configuration')
  if (config.schema !== 1 || !['preview', 'stable'].includes(config.expectedChannel) || !config.trustedKeys
    || !Object.keys(config.trustedKeys).length || !Number.isSafeInteger(config.maxArtifactBytes) || config.maxArtifactBytes < 1) throw new Error('Invalid public verification configuration')
  const channelUrl = anonymousHttps(config.channelUrl, 'channel URL')
  const channelResult = await download(fetcher, channelUrl, 2 * 1024 * 1024)
  const channelSignatureResult = await download(fetcher, new URL(channelUrl.pathname + '.sig' + channelUrl.search, channelUrl), 4096)
  const channelSignature = envelope(channelSignatureResult.bytes, config.trustedKeys)
  authenticate(channelResult.bytes, channelSignature, config.trustedKeys)
  const channel = exact(JSON.parse(channelResult.bytes), ['schema', 'channel', 'sequence', 'issuedAt', 'expiresAt', 'snapshot'], 'channel')
  if (channel.schema !== 3 || channel.channel !== config.expectedChannel || !Number.isSafeInteger(channel.sequence) || channel.sequence < 1
    || !Number.isFinite(Date.parse(channel.issuedAt)) || !Number.isFinite(Date.parse(channel.expiresAt))
    || Date.parse(channel.issuedAt) > now || Date.parse(channel.expiresAt) <= now) throw new Error('Published channel is not currently valid')
  const reference = exact(channel.snapshot, ['url', 'sha256', 'bytes'], 'snapshot reference')
  const snapshotUrl = anonymousHttps(reference.url, 'snapshot URL')
  const root = channelUrl.pathname.replace(/channels\/[^/]+$/u, '')
  if (snapshotUrl.origin !== channelUrl.origin || !snapshotUrl.pathname.startsWith(root + 'releases/') || snapshotUrl.search || !digestPattern.test(reference.sha256)
    || !Number.isSafeInteger(reference.bytes) || reference.bytes < 1 || reference.bytes > 2 * 1024 * 1024) throw new Error('Invalid snapshot reference')
  const snapshotResult = await download(fetcher, snapshotUrl, reference.bytes)
  if (snapshotResult.bytes.length !== reference.bytes || digest(snapshotResult.bytes) !== reference.sha256) throw new Error('Published snapshot digest mismatch')
  const snapshotSignatureResult = await download(fetcher, new URL(snapshotUrl.pathname + '.sig', snapshotUrl), 4096)
  const snapshotSignature = envelope(snapshotSignatureResult.bytes, config.trustedKeys)
  if (snapshotSignature.keyId !== channelSignature.keyId) throw new Error('Published documents use different signing keys')
  authenticate(snapshotResult.bytes, snapshotSignature, config.trustedKeys)
  const index = exact(JSON.parse(snapshotResult.bytes), ['schema', 'releaseId', 'createdAt', 'compatibility', 'products'], 'snapshot')
  if (index.schema !== 3 || !releasePattern.test(index.releaseId ?? '') || !Array.isArray(index.compatibility) || !index.compatibility.length
    || !Array.isArray(index.products) || !index.products.length) throw new Error('Invalid published snapshot')
  const seen = new Set(); const artifacts = []
  for (const product of index.products) {
    if (!Array.isArray(product?.artifacts) || !product.artifacts.length) throw new Error('Published product has no artifacts')
    for (const artifact of product.artifacts) {
      const url = anonymousHttps(artifact?.url, 'artifact URL')
      const filename = decodeURIComponent(url.pathname.split('/').at(-1) ?? '')
      if (url.hostname !== 'gitcode.com' || !url.pathname.startsWith('/AICO-Ascend/AICO-Harness/releases/download/') || url.search
        || !filename || seen.has(filename) || !digestPattern.test(artifact.sha256) || !Number.isSafeInteger(artifact.bytes)
        || artifact.bytes < 1 || artifact.bytes > config.maxArtifactBytes) throw new Error('Invalid published artifact')
      seen.add(filename)
      const result = await download(fetcher, url, artifact.bytes)
      if (result.bytes.length !== artifact.bytes || digest(result.bytes) !== artifact.sha256) throw new Error(`Published artifact mismatch: ${filename}`)
      artifacts.push(Object.freeze({ id: artifact.id, filename, bytes: artifact.bytes, sha256: artifact.sha256, finalUrl: result.finalUrl }))
    }
  }
  return Object.freeze({ schema: 1, verifiedAt: new Date(now).toISOString(), channel: channel.channel, sequence: channel.sequence,
    releaseId: index.releaseId, keyId: channelSignature.keyId, channelSha256: digest(channelResult.bytes), snapshotSha256: digest(snapshotResult.bytes), artifacts: Object.freeze(artifacts) })
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (!process.argv[2]) throw new Error('Usage: node scripts/verify-public-aico-release.mjs <config.json>')
  const path = resolve(process.argv[2]); const config = JSON.parse(await readFile(path, 'utf8'))
  for (const [id, value] of Object.entries(config.trustedKeys ?? {})) {
    if (typeof value === 'string' && value.startsWith('./')) config.trustedKeys[id] = await readFile(resolve(dirname(path), value), 'utf8')
  }
  process.stdout.write(`${JSON.stringify(await verifyPublicAicoRelease(config))}\n`)
}
