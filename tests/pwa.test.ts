import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// What a phone needs to install the game as an app and to show a link preview: a manifest Chrome accepts, every icon
// it names on disk at the size it claims, the iOS home screen icon, a service worker with a fetch handler, and a
// share card of the size the page says it is.

const ROOT = new URL('..', import.meta.url).pathname;
const PUBLIC = join(ROOT, 'public');
const manifest = JSON.parse(readFileSync(join(PUBLIC, 'manifest.webmanifest'), 'utf8'));
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');

function pngSize(file: string): string {
  assert.ok(existsSync(file), `${file} exists`);
  const b = readFileSync(file);
  assert.equal(b.toString('latin1', 1, 4), 'PNG', `${file} is a PNG`);
  return `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`;
}

/** The file under public/ that an index.html URL points at, once Vite fills in the base and the site URL. */
const publicFile = (url: string): string => join(PUBLIC, url.replace(/^%BASE_URL%|^%VITE_SITE_URL%\//, ''));

const metaContent = (attr: 'property' | 'name', key: string): string => {
  const m = new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`).exec(html);
  assert.ok(m, `index.html has ${key}`);
  return m[1];
};

const linkHref = (rel: string): string => {
  const m = new RegExp(`<link rel="${rel}" href="([^"]*)"`).exec(html);
  assert.ok(m, `index.html links ${rel}`);
  return m[1];
};

test('the manifest has what Chrome needs to install the game', () => {
  for (const key of ['name', 'short_name', 'start_url', 'scope', 'background_color', 'theme_color']) {
    assert.equal(typeof manifest[key], 'string', key);
    assert.ok(manifest[key].length > 0, key);
  }
  assert.ok(['fullscreen', 'standalone', 'minimal-ui'].includes(manifest.display), manifest.display);
  // Relative, so one build works at the site's root and under a project folder.
  assert.ok(manifest.start_url.startsWith('.'), 'start_url is relative');
  assert.ok(manifest.scope.startsWith('.'), 'scope is relative');
  assert.equal(linkHref('manifest'), '%BASE_URL%manifest.webmanifest');
});

test('every icon in the manifest is on disk at the size it claims', () => {
  for (const icon of manifest.icons) {
    assert.equal(pngSize(join(PUBLIC, icon.src)), icon.sizes, icon.src);
    assert.equal(icon.type, 'image/png');
  }
});

test('the manifest offers 192 and 512 icons, and a separate maskable one', () => {
  const sizes = (purpose: string): string[] => manifest.icons.filter((i: { purpose: string }) => i.purpose === purpose).map((i: { sizes: string }) => i.sizes);
  assert.ok(sizes('any').includes('192x192'));
  assert.ok(sizes('any').includes('512x512'));
  assert.ok(sizes('maskable').includes('512x512'));
  // A maskable icon has to be its own picture: the plain one has sparkles in the corners that a mask would cut.
  const maskable = manifest.icons.find((i: { purpose: string }) => i.purpose === 'maskable').src;
  for (const icon of manifest.icons.filter((i: { purpose: string }) => i.purpose === 'any')) assert.notEqual(icon.src, maskable);
});

test('the page points at the home screen icon for iOS and the tab icon', () => {
  assert.equal(pngSize(publicFile(linkHref('apple-touch-icon'))), '180x180');
  assert.ok(existsSync(publicFile(linkHref('icon'))), 'favicon.ico exists');
  assert.equal(metaContent('name', 'apple-mobile-web-app-capable'), 'yes');
});

test('the service worker has a fetch handler, which Chrome wants before it offers to install', () => {
  const sw = readFileSync(join(PUBLIC, 'sw.js'), 'utf8');
  assert.match(sw, /addEventListener\('fetch'/);
});

test('the link preview card is the size the page says it is, on Open Graph and Twitter', () => {
  const og = metaContent('property', 'og:image');
  assert.equal(metaContent('name', 'twitter:image'), og);
  assert.equal(metaContent('name', 'twitter:card'), 'summary_large_image');
  assert.equal(pngSize(publicFile(og)), `${metaContent('property', 'og:image:width')}x${metaContent('property', 'og:image:height')}`);
  assert.equal(metaContent('name', 'twitter:title'), metaContent('property', 'og:title'));
  assert.equal(metaContent('name', 'twitter:description'), metaContent('property', 'og:description'));
});
