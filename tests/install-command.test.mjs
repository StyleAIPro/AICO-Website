import test from 'node:test'
import assert from 'node:assert/strict'
import { localInstallCommand } from '../docs/aico-release.mjs'
test('install command quotes Windows directories and uses the verified filename', () => {
  assert.equal(localInstallCommand('C:/My Downloads/', 'aico-harness-2.0.0.tgz'), 'dsh plugin add "C:\\My Downloads\\aico-harness-2.0.0.tgz" --ignore-scripts')
  for (const path of ['Downloads', 'C:\\a";whoami', 'C:\\$env:TEMP', 'C:\\`whoami`', 'C:\\%TEMP%', 'C:\\x\ny']) assert.equal(localInstallCommand(path,'aico.tgz'),null)
  assert.equal(localInstallCommand('C:\\Downloads', '../outside.tgz'), null)
})
