import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { writeWebsiteApproval } from '../scripts/approve-aico-website.mjs'

test('website approval binds exact public bytes and advances only to a newer sequence', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'aico-website-approval-'))
  const receipt = { schema: 1, channel: 'preview', sequence: 1, releaseId: 'preview.1',
    channelSha256: 'a'.repeat(64), snapshotSha256: 'b'.repeat(64), verifiedAt: '2026-09-20T00:00:00.000Z' }
  try {
    const first = await writeWebsiteApproval(receipt, directory)
    assert.deepEqual(JSON.parse(await readFile(first.path, 'utf8')), first.value)
    const repeated = await writeWebsiteApproval({ ...receipt, verifiedAt: '2026-09-20T01:00:00.000Z' }, directory)
    assert.deepEqual(repeated.value, first.value)
    await assert.rejects(writeWebsiteApproval({ ...receipt, channelSha256: 'c'.repeat(64) }, directory), /different bytes/)
    const next = await writeWebsiteApproval({ ...receipt, sequence: 2, releaseId: 'preview.2', channelSha256: 'c'.repeat(64) }, directory)
    assert.equal(next.value.sequence, 2)
    await assert.rejects(writeWebsiteApproval(receipt, directory), /roll back/)
  } finally { await rm(directory, { recursive: true, force: true }) }
})
