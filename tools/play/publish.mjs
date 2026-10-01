#!/usr/bin/env node
// Upload the Kilo bundle, listing, and images with the Google Play Developer API. No dependencies.
import { createSign } from 'node:crypto';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] ?? true : d; };
const PKG = 'com.olinlagon.kilo';
const TRACK = flag('--track', 'internal');
const DRY = args.includes('--dry-run');
const LISTING = !args.includes('--no-listing');
const keyPath = process.env.PLAY_SERVICE_ACCOUNT;
if (!keyPath) { console.error('Set PLAY_SERVICE_ACCOUNT to the service account JSON path'); process.exit(1); }
const sa = JSON.parse(readFileSync(keyPath.replace(/^~/, process.env.HOME), 'utf8'));

async function token() {
  const now = Math.floor(Date.now() / 1000);
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })}`;
  const sig = createSign('RSA-SHA256').update(unsigned).sign(sa.private_key).toString('base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${unsigned}.${sig}` });
  if (!r.ok) throw new Error(`token: ${r.status} ${await r.text()}`);
  return (await r.json()).access_token;
}

const T = await token();
const base = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PKG}`;
async function api(path, init = {}, upload = false) {
  const url = (upload ? base.replace('androidpublisher/v3', 'upload/androidpublisher/v3') : base) + path;
  const r = await fetch(url, { ...init, headers: { authorization: `Bearer ${T}`, ...(init.headers ?? {}) } });
  if (!r.ok) throw new Error(`${init.method ?? 'GET'} ${path}: ${r.status} ${await r.text()}`);
  return r.json();
}

const edit = await api('/edits', { method: 'POST' });
const E = `/edits/${edit.id}`;
console.log('edit', edit.id);

const aab = resolve(root, 'apps/mobile/android/app/build/outputs/bundle/release/app-release.aab');
if (!existsSync(aab)) throw new Error(`missing ${aab}; run ./gradlew bundleRelease`);
const bundle = await api(`${E}/bundles?uploadType=media`, { method: 'POST', headers: { 'content-type': 'application/octet-stream' }, body: readFileSync(aab) }, true);
console.log('bundle versionCode', bundle.versionCode);

const notes = readFileSync(resolve(root, 'store/listing/en-US/changelogs/1.txt'), 'utf8').trim();
await api(`${E}/tracks/${TRACK}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ track: TRACK, releases: [{ status: TRACK === 'production' ? 'completed' : 'completed', versionCodes: [String(bundle.versionCode)], releaseNotes: [{ language: 'en-US', text: notes }] }] }) });
console.log('track', TRACK, 'updated');

if (LISTING) {
  const L = (f) => readFileSync(resolve(root, 'store/listing/en-US', f), 'utf8').trim();
  await api(`${E}/listings/en-US`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ language: 'en-US', title: L('title.txt'), shortDescription: L('short_description.txt'), fullDescription: L('full_description.txt'), video: existsSync(resolve(root, 'store/listing/en-US/video.txt')) ? L('video.txt') : undefined }) });
  console.log('listing text updated');
  const img = async (type, file) => {
    await api(`${E}/listings/en-US/${type}?uploadType=media`, { method: 'POST', headers: { 'content-type': 'image/png' }, body: readFileSync(file) }, true);
    console.log('uploaded', type, file.split('/').pop());
  };
  const images = resolve(root, 'store/images');
  for (const [type, file] of [['icon', 'icon.png'], ['featureGraphic', 'featureGraphic.png']]) {
    if (existsSync(resolve(images, file))) await img(type, resolve(images, file));
  }
  const shots = resolve(images, 'phoneScreenshots');
  if (existsSync(shots)) {
    await api(`${E}/listings/en-US/phoneScreenshots`, { method: 'DELETE' }).catch(() => {});
    for (const f of readdirSync(shots).filter((f) => f.endsWith('.png')).sort()) await img('phoneScreenshots', resolve(shots, f));
  }
}

if (DRY) {
  await api(`${E}:validate`, { method: 'POST' });
  console.log('validated, not committed (dry run)');
} else {
  await api(`${E}:commit`, { method: 'POST' });
  console.log('committed. Check the Console for review status.');
}
