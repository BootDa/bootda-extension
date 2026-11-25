import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const json = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const manifest = json('../extension/public/manifest.json');
const pkg = json('../package.json');
test('Manifest V3, version matches package', () => {
  assert.equal(manifest.manifest_version,3);
  assert.equal(manifest.version,pkg.version);
});
test('foundation requests no site or API permissions', () => {
  assert.equal(manifest.permissions,undefined);
  assert.equal(manifest.host_permissions,undefined);
  assert.equal(manifest.content_scripts,undefined);
});
test('popup entry and release note exist', () => {
  assert.ok(existsSync(new URL('../extension/'+manifest.action.default_popup,import.meta.url)));
  assert.match(readFileSync(new URL('../docs/extension-release-notes.md',import.meta.url),'utf8'),/0\.1\.0/);
});
