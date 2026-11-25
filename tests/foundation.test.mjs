import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
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
test('extension can read the active tab without permanent site access', () => {
  assert.deepEqual([...manifest.permissions].sort(), ['activeTab', 'scripting']);
  assert.equal(manifest.host_permissions, undefined);
  assert.equal(manifest.optional_permissions, undefined);
  assert.equal(manifest.optional_host_permissions, undefined);
  assert.equal(manifest.content_scripts, undefined);
});

test('manifest opens a popup with a React mount point', () => {
  assert.ok(manifest.action?.default_popup);
  const popup = readFileSync(new URL(manifest.action.default_popup, buildDirectory), 'utf8');
  assert.match(popup, /<div\b[^>]*\bid=["']root["']/);
});

test('popup loads its JavaScript and CSS from the extension bundle', () => {
  const popup = readFileSync(new URL(manifest.action.default_popup, buildDirectory), 'utf8');
  const popupUrl = new URL(manifest.action.default_popup, 'chrome-extension://bootda-test/');
  const assets = [
    ['JavaScript', /<script\b(?=[^>]*\btype=["']module["'])[^>]*\bsrc=["']([^"']+)["']/g, '.js'],
    ['CSS', /<link\b(?=[^>]*\brel=["']stylesheet["'])[^>]*\bhref=["']([^"']+)["']/g, '.css'],
  ];

  for (const [name, pattern, extension] of assets) {
    const references = [...popup.matchAll(pattern)];
    assert.ok(references.length > 0, `Missing popup ${name} bundle`);

    for (const [, reference] of references) {
      const asset = new URL(reference, popupUrl);
      assert.equal(asset.protocol, popupUrl.protocol, reference);
      assert.equal(asset.host, popupUrl.host, reference);
      assert.ok(asset.pathname.endsWith(extension), reference);
      const file = statSync(new URL(`.${asset.pathname}`, buildDirectory));
      assert.ok(file.isFile() && file.size > 0, reference);
    }
  }
});

test('release notes include the package version', () => {
  const releaseNotes = readFileSync(new URL('../docs/extension-release-notes.md', import.meta.url), 'utf8');
  assert.ok(releaseNotes.includes(`## ${pkg.version} —`));
});
