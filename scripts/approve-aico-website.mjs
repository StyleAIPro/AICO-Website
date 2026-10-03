/** Reverify the public release, then write the exact website download gate. */
import { readFile, mkdir, writeFile, rename, rm } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { verifyPublicAicoRelease } from './verify-public-aico-release.mjs'

const digest = /^[a-f0-9]{64}$/

export async function writeWebsiteApproval(receipt, siteDirectory) {
  if (!receipt || receipt.schema !== 1 || !['preview', 'stable'].includes(receipt.channel)
    || !Number.isSafeInteger(receipt.sequence) || receipt.sequence < 1
    || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(receipt.releaseId ?? '')
    || !digest.test(receipt.channelSha256 ?? '') || !digest.test(receipt.snapshotSha256 ?? '')
    || !Number.isFinite(Date.parse(receipt.verifiedAt))) throw new Error('Invalid public verification receipt')
  const value = { schema: 1, channel: receipt.channel, sequence: receipt.sequence, releaseId: receipt.releaseId,
    channelSha256: receipt.channelSha256, snapshotSha256: receipt.snapshotSha256, verifiedAt: receipt.verifiedAt }
  const directory = join(siteDirectory, 'website-ready')
  const target = join(directory, `${receipt.channel}.json`)
  await mkdir(directory, { recursive: true })
  let previous
  try { previous = JSON.parse(await readFile(target, 'utf8')) }
  catch (error) { if (error.code !== 'ENOENT') throw error }
  if (previous) {
    if (previous.sequence > value.sequence) throw new Error('Cannot roll back website approval sequence')
    if (previous.sequence === value.sequence) {
      if (previous.releaseId !== value.releaseId || previous.channelSha256 !== value.channelSha256
        || previous.snapshotSha256 !== value.snapshotSha256) throw new Error('Cannot approve different bytes at the same sequence')
      return { path: target, value: previous }
    }
  }
  const temporary = join(directory, `.${receipt.channel}-${randomUUID()}.tmp`)
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx', mode: 0o644 })
    await rename(temporary, target)
  } finally { await rm(temporary, { force: true }) }
  return { path: target, value }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length !== 4) throw new Error('Usage: node scripts/approve-aico-website.mjs <public-verification-config.json> <docs/aico directory>')
  const configPath = resolve(process.argv[2])
  const config = JSON.parse(await readFile(configPath, 'utf8'))
  for (const [id, key] of Object.entries(config.trustedKeys ?? {})) {
    if (typeof key === 'string' && key.startsWith('./')) config.trustedKeys[id] = await readFile(resolve(dirname(configPath), key), 'utf8')
  }
  const receipt = await verifyPublicAicoRelease(config)
  const result = await writeWebsiteApproval(receipt, resolve(process.argv[3]))
  process.stdout.write(`${JSON.stringify({ ...receipt, websiteApproval: result.path })}\n`)
}
