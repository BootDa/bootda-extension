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
test('content script is scoped to Saramin posting routes', () => {
  assert.equal(manifest.permissions,undefined);
  assert.equal(manifest.host_permissions,undefined);
  assert.equal(manifest.content_scripts.length, 1);
  const [script] = manifest.content_scripts;
  assert.deepEqual(script.js, ['saramin.js']);
  assert.deepEqual(script.matches, [
    'https://www.saramin.co.kr/zf_user/jobs/relay/view*',
    'https://www.saramin.co.kr/zf_user/jobs/view/*',
    'https://www.saramin.co.kr/zf_user/jobs/view?*',
    'https://saramin.co.kr/zf_user/jobs/relay/view*',
    'https://saramin.co.kr/zf_user/jobs/view/*',
    'https://saramin.co.kr/zf_user/jobs/view?*',
  ]);
});
test('popup entry and release note exist', () => {
  assert.ok(existsSync(new URL('../extension/'+manifest.action.default_popup,import.meta.url)));
  assert.match(readFileSync(new URL('../docs/extension-release-notes.md',import.meta.url),'utf8'),new RegExp('## ' + manifest.version.replaceAll('.', '[.]')));
});
