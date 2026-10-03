/** Verify one assembled AICO release and publish only its signed site documents into GitHub Pages sources. */
import { createHash, createPublicKey, randomUUID, verify } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { copyFile, lstat, mkdir, open, readFile, readdir, rename, rm } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

const digestPattern = /^[a-f0-9]{64}$/
const releasePattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/
function exact(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key))) throw new Error(`Invalid ${label}`)
  return value
}
async function regular(path, maximum, label) {
  const info = await lstat(path)
  if (!info.isFile() || info.size < 1 || info.size > maximum) throw new Error(`Invalid ${label}`)
  return readFile(path)
}
function signatureEnvelope(bytes) {
  const value = exact(JSON.parse(bytes), ['schema', 'algorithm', 'keyId', 'signature'], 'signature envelope')
  if (value.schema !== 1 || value.algorithm !== 'ed25519' || typeof value.keyId !== 'string' || typeof value.signature !== 'string') throw new Error('Invalid signature envelope')
  return value
}
function authenticate(bytes, envelope, trustedKeys) {
  if (!Object.hasOwn(trustedKeys, envelope.keyId)) throw new Error('Release signature uses an untrusted key')
  const input = trustedKeys[envelope.keyId], key = input?.type === 'public' ? input : createPublicKey(input)
  if (key.asymmetricKeyType !== 'ed25519' || !verify(null, bytes, key, Buffer.from(envelope.signature, 'base64'))) throw new Error('Invalid release signature')
}
async function digest(path, maximum) {
  const info = await lstat(path)
  if (!info.isFile() || info.size < 1 || info.size > maximum) throw new Error('Invalid release artifact')
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  return { bytes: info.size, sha256: hash.digest('hex') }
}
async function filesBelow(root) {
  const result = []
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) await visit(path)
      else if (entry.isFile()) result.push(relative(root, path).split(sep).join('/'))
      else throw new Error('Release site input contains a link or special file')
    }
  }
  await visit(root)
  return result.sort()
}
async function durableCopy(source, target) {
  const temporary = join(dirname(target), `.${basename(target)}-${randomUUID()}.partial`)
  await copyFile(source, temporary)
  const file = await open(temporary, 'r')
  try { await file.sync() } finally { await file.close() }
  await rename(temporary, target)
}

/** Verify an assembler site/assets pair, then add its immutable snapshot and advance one signed channel. */
export async function importAicoRelease(config, { now = Date.now() } = {}) {
  exact(config, ['schema', 'sourceDirectory', 'artifactDirectory', 'siteDirectory', 'siteBaseUrl', 'channel', 'trustedKeys'], 'AICO website release import')
  if (config.schema !== 1 || !isAbsolute(config.sourceDirectory ?? '') || !isAbsolute(config.artifactDirectory ?? '') || !isAbsolute(config.siteDirectory ?? '')
    || !['preview', 'stable'].includes(config.channel) || !config.trustedKeys || !Object.keys(config.trustedKeys).length) throw new Error('Invalid AICO website release import')
  const base = new URL(config.siteBaseUrl)
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || !base.pathname.endsWith('/')) throw new Error('Invalid AICO website base URL')
  const channelRelative = `channels/${config.channel}.json`, channelPath = join(config.sourceDirectory, ...channelRelative.split('/'))
  const channelBytes = await regular(channelPath, 2 * 1024 * 1024, 'release channel')
  const channelSignatureBytes = await regular(channelPath + '.sig', 4096, 'release channel signature')
  const channelSignature = signatureEnvelope(channelSignatureBytes); authenticate(channelBytes, channelSignature, config.trustedKeys)
  const channel = exact(JSON.parse(channelBytes), ['schema', 'channel', 'sequence', 'issuedAt', 'expiresAt', 'snapshot'], 'release channel')
  if (channel.schema !== 3 || channel.channel !== config.channel || !Number.isSafeInteger(channel.sequence) || channel.sequence < 0
    || !Number.isFinite(Date.parse(channel.issuedAt)) || !Number.isFinite(Date.parse(channel.expiresAt)) || Date.parse(channel.issuedAt) > now || Date.parse(channel.expiresAt) <= now) throw new Error('Invalid or expired release channel')
  const snapshot = exact(channel.snapshot, ['url', 'sha256', 'bytes'], 'snapshot reference'), snapshotUrl = new URL(snapshot.url)
  if (snapshotUrl.origin !== base.origin || !snapshotUrl.pathname.startsWith(base.pathname + 'releases/') || snapshotUrl.search || snapshotUrl.hash
    || !snapshotUrl.pathname.endsWith('/index.json') || !digestPattern.test(snapshot.sha256) || !Number.isSafeInteger(snapshot.bytes) || snapshot.bytes < 1 || snapshot.bytes > 2 * 1024 * 1024) throw new Error('Invalid release snapshot reference')
  const snapshotRelative = snapshotUrl.pathname.slice(base.pathname.length), segments = snapshotRelative.split('/')
  if (segments.length !== 3 || segments[0] !== 'releases' || !releasePattern.test(segments[1]) || segments[2] !== 'index.json') throw new Error('Invalid release snapshot path')
  const snapshotPath = join(config.sourceDirectory, ...segments), snapshotBytes = await regular(snapshotPath, 2 * 1024 * 1024, 'release snapshot')
  if (snapshotBytes.length !== snapshot.bytes || createHash('sha256').update(snapshotBytes).digest('hex') !== snapshot.sha256) throw new Error('Release snapshot digest mismatch')
  const snapshotSignatureBytes = await regular(snapshotPath + '.sig', 4096, 'release snapshot signature')
  const snapshotSignature = signatureEnvelope(snapshotSignatureBytes); authenticate(snapshotBytes, snapshotSignature, config.trustedKeys)
  if (snapshotSignature.keyId !== channelSignature.keyId) throw new Error('Channel and snapshot use different signing keys')
  const index = exact(JSON.parse(snapshotBytes), ['schema', 'releaseId', 'createdAt', 'compatibility', 'products'], 'release snapshot')
  if (index.schema !== 3 || index.releaseId !== segments[1] || !Array.isArray(index.compatibility) || !index.compatibility.length || !Array.isArray(index.products) || !index.products.length) throw new Error('Invalid release snapshot identity')
  if (index.products.some(product => !Array.isArray(product?.artifacts) || !product.artifacts.length)) throw new Error('Release product has no artifacts')
  const artifacts = index.products.flatMap(product => product.artifacts)
  if (!artifacts.length) throw new Error('Release snapshot has no artifacts')
  const names = new Set()
  for (const artifact of artifacts) {
    const url = new URL(artifact?.url)
    const name = basename(url.pathname)
    if (url.protocol !== 'https:' || url.hostname !== 'gitcode.com' || !url.pathname.startsWith('/AICO-Ascend/AICO-Harness/releases/download/') || url.search || url.hash
      || name !== decodeURIComponent(name) || names.has(name) || !digestPattern.test(artifact.sha256) || !Number.isSafeInteger(artifact.bytes) || artifact.bytes < 1) throw new Error('Invalid or duplicate release artifact')
    names.add(name)
    const measured = await digest(join(config.artifactDirectory, name), artifact.bytes)
    if (measured.bytes !== artifact.bytes || measured.sha256 !== artifact.sha256) throw new Error(`Release artifact mismatch: ${name}`)
  }
  const expectedFiles = [channelRelative, channelRelative + '.sig', snapshotRelative, snapshotRelative + '.sig'].sort()
  if (JSON.stringify(await filesBelow(config.sourceDirectory)) !== JSON.stringify(expectedFiles)) throw new Error('Release site input contains missing or extra files')
  await mkdir(config.siteDirectory, { recursive: true })
  const lock = join(config.siteDirectory, '.publish-lock')
  await mkdir(lock)
  try {
    const channelDirectory = join(config.siteDirectory, 'channels'); await mkdir(channelDirectory, { recursive: true })
    const publishedChannelPath = join(channelDirectory, `${config.channel}.json`), publishedSignaturePath = publishedChannelPath + '.sig'
    try {
      const publishedChannelBytes = await regular(publishedChannelPath, 2 * 1024 * 1024, 'published release channel')
      const publishedSignatureBytes = await regular(publishedSignaturePath, 4096, 'published release channel signature')
      if (!publishedChannelBytes.equals(channelBytes) || !publishedSignatureBytes.equals(channelSignatureBytes)) {
        const publishedSignature = signatureEnvelope(publishedSignatureBytes); authenticate(publishedChannelBytes, publishedSignature, config.trustedKeys)
        const publishedChannel = exact(JSON.parse(publishedChannelBytes), ['schema', 'channel', 'sequence', 'issuedAt', 'expiresAt', 'snapshot'], 'published release channel')
        if (publishedChannel.schema !== 3 || publishedChannel.channel !== config.channel || !Number.isSafeInteger(publishedChannel.sequence) || publishedChannel.sequence < 0) throw new Error('Invalid published release channel')
        if (channel.sequence <= publishedChannel.sequence) throw new Error('Release channel sequence must increase')
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      const exists = async path => {
        try { await lstat(path); return true } catch (entryError) { if (entryError.code === 'ENOENT') return false; throw entryError }
      }
      if ((await exists(publishedChannelPath)) || (await exists(publishedSignaturePath))) throw new Error('Published release channel is incomplete')
    }
    const releaseDirectory = join(config.siteDirectory, 'releases', index.releaseId)
    try {
      await lstat(releaseDirectory)
      const existing = await Promise.all([readFile(join(releaseDirectory, 'index.json')), readFile(join(releaseDirectory, 'index.json.sig'))])
      if (!existing[0].equals(snapshotBytes) || !existing[1].equals(snapshotSignatureBytes)) throw new Error('Immutable release snapshot already exists with different bytes')
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      const staging = join(config.siteDirectory, 'releases', `.${index.releaseId}-${randomUUID()}.partial`)
      await mkdir(staging, { recursive: true })
      try {
        await copyFile(snapshotPath, join(staging, 'index.json'))
        await copyFile(snapshotPath + '.sig', join(staging, 'index.json.sig'))
        await rename(staging, releaseDirectory)
      } catch (error) { await rm(staging, { recursive: true, force: true }); throw error }
    }
    await durableCopy(channelPath + '.sig', publishedSignaturePath)
    await durableCopy(channelPath, publishedChannelPath)
    return Object.freeze({ releaseId:index.releaseId, channel:config.channel, sequence:channel.sequence, artifacts:artifacts.length, snapshot:join(releaseDirectory, 'index.json') })
  } finally { await rm(lock, { recursive: true }) }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (!process.argv[2]) throw new Error('Usage: node scripts/import-aico-release.mjs <config.json>')
  const configPath = resolve(process.argv[2]), value = JSON.parse(await readFile(configPath, 'utf8'))
  const absolute = key => isAbsolute(value[key] ?? '') ? value[key] : resolve(dirname(configPath), value[key])
  const result = await importAicoRelease({ ...value, sourceDirectory:absolute('sourceDirectory'), artifactDirectory:absolute('artifactDirectory'), siteDirectory:absolute('siteDirectory') })
  process.stdout.write(JSON.stringify(result) + '\n')
}
