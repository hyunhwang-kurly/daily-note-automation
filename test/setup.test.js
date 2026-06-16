import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { vaultNameFromRoot, findObsidianRoot, configPath, defaultVaultCandidates } from '../src/paths.js'
import { buildConfig } from '../src/config-store.js'

test('vaultNameFromRoot: 볼트 루트의 basename', () => {
  assert.equal(vaultNameFromRoot('/Users/me/.../Documents/xtring'), 'xtring')
})

test('findObsidianRoot: 상위로 올라가며 .obsidian 탐지', () => {
  const vaultRoot = '/Users/me/Documents/xtring'
  const noteDir = `${vaultRoot}/00.Personal/데일리 노트/2026`
  const existing = new Set([`${vaultRoot}/.obsidian`])
  const found = findObsidianRoot(noteDir, (p) => existing.has(p))
  assert.equal(found, vaultRoot)
})

test('findObsidianRoot: 없으면 null', () => {
  const found = findObsidianRoot('/tmp/a/b/c', () => false)
  assert.equal(found, null)
})

test('configPath: Application Support 경로', () => {
  assert.equal(
    configPath('/Users/me'),
    '/Users/me/Library/Application Support/RON/config.json',
  )
})

test('defaultVaultCandidates: iCloud Obsidian 경로 포함', () => {
  const c = defaultVaultCandidates('/Users/me')
  assert.ok(c[0].includes('iCloud~md~obsidian/Documents'))
})

test('buildConfig: answers → 저장 구조', () => {
  const cfg = buildConfig({
    vaultRoot: '/v/notes',
    vaultName: 'xtring',
    email: { enabled: true, to: 'a@b.com' },
  })
  assert.equal(cfg.vaultRoot, '/v/notes')
  assert.equal(cfg.obsidian.vaultName, 'xtring')
  assert.deepEqual(cfg.email, { enabled: true, to: 'a@b.com', from: 'a@b.com' })
})

test('buildConfig: 이메일 미사용 시 enabled=false', () => {
  const cfg = buildConfig({ vaultRoot: '/v', vaultName: 'x', email: { enabled: false } })
  assert.equal(cfg.email.enabled, false)
})
