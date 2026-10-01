#!/usr/bin/env node
// Usage: API_BASE=https://huli-api.example.workers.dev ADMIN_TOKEN=... node scripts/seed-spots.mjs [spots.json]
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const file = process.argv[2] ?? resolve(here, '../../../tools/pool-builder/out/spots.json');
const base = (process.env.API_BASE ?? 'http://localhost:8787').replace(/\/$/, '');
const token = process.env.ADMIN_TOKEN;
if (!token) throw new Error('ADMIN_TOKEN is required');

const spots = JSON.parse(await readFile(file, 'utf8'));
let done = 0;
for (let i = 0; i < spots.length; i += 500) {
  const batch = spots.slice(i, i + 500);
  const res = await fetch(`${base}/admin/spots`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(batch),
  });
  if (!res.ok) throw new Error(`batch ${i}: ${res.status} ${await res.text()}`);
  done += batch.length;
  console.log(`${done}/${spots.length}`);
}
