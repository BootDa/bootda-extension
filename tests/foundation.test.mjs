import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const json = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const sourceManifest = json('../extension/public/manifest.json');
const buildDirectory = new URL('../extension/dist/chrome-mv3/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', buildDirectory), 'utf8'));
const pkg = json('../package.json');
test('Manifest V3, version matches package', () => {
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.manifest_version, sourceManifest.manifest_version);
  assert.equal(manifest.version, sourceManifest.version);
  assert.equal(manifest.version, pkg.version);
});
test('foundation requests no site or API permissions', () => {
  assert.equal(manifest.permissions, undefined);
  assert.equal(manifest.host_permissions, undefined);
  assert.equal(manifest.content_scripts, undefined);
});
test('popup entry and release note exist', () => {
  assert.ok(manifest.action?.default_popup);
  assert.ok(existsSync(new URL(manifest.action.default_popup, buildDirectory)));
  const releaseNotes = readFileSync(new URL('../docs/extension-release-notes.md', import.meta.url), 'utf8');
  assert.ok(releaseNotes.includes(`## ${pkg.version} —`));
});
