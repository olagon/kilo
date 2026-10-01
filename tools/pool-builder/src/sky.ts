/**
 * Builds the Sky spot pool from OpenStreetMap via Overpass.
 * Run: pnpm --filter @huli/pool-builder build:pool
 * Writes out/spots.json (daily pool), out/report.txt, and apps/mobile/public/practice-pack.json.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ISLANDS, ISLAND_BY_ID, haversineKm, islandForPoint, type IslandId, type Spot } from '@huli/shared';

const HERE = dirname(fileURLToPath(import.meta.url));
const CACHE = join(HERE, '..', 'cache');
const OUT = join(HERE, '..', 'out');
const PRACTICE_OUT = join(HERE, '..', '..', '..', 'apps', 'mobile', 'public', 'practice-pack.json');
const BBOX = '(18.9,-160.3,22.3,-154.8)';
const UA = 'huli-pool-builder/0.1 (olin.lagon@gmail.com)';

export const EXCLUDE_NAME =
  /heiau|burial|cemetery|grave|church|temple|mission|puʻuhonua|pu'uhonua|sacred|shrine|memorial park|mortuary|military|naval|\bbase\b|barracks|army|air force|camp smith|pearl harbor|hickam|schofield|kāneʻohe bay marine|bellows|prison|correctional|jail|detention|refuge\b.*wildlife|niʻihau|ni'ihau|kahoʻolawe|kaho'olawe/i;

type Tags = Record<string, string>;
interface Feature { lat: number; lon: number; tags: Tags; }

export function isExcluded(name: string, tags: Tags): boolean {
  if (EXCLUDE_NAME.test(name)) return true;
  if (tags.historic === 'archaeological_site') return true;
  if (/^(place_of_worship|grave_yard|prison)$/.test(tags.amenity ?? '')) return true;
  if (/^(cemetery|military)$/.test(tags.landuse ?? '')) return true;
  if (tags.military || tags.religion) return true;
  return false;
}

const HAWAIIAN = /^[aeiouhklmnpwāēīōūʻ\s'‘-]+$/i; // Hawaiian alphabet only
export function fixOkina(name: string): string {
  return HAWAIIAN.test(name) ? name.replace(/['‘]/g, 'ʻ') : name;
}
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯʻ'‘]/g, '').toLowerCase();

/** Kind decides interest (dedupe priority), difficulty, and zoom. */
interface Kind { key: string; rank: number; difficulty: number; zoom: number; }
const KINDS: [string, RegExp, Kind][] = [
  ['place', /^(city|town)$/, { key: 'town', rank: 0, difficulty: 1, zoom: 15.5 }],
  ['place', /^village$/, { key: 'village', rank: 0, difficulty: 2, zoom: 15.5 }],
  ['place', /^(hamlet|suburb|neighbourhood|locality)$/, { key: 'hamlet', rank: 0, difficulty: 3, zoom: 15.5 }],
  ['aeroway', /^(aerodrome|heliport)$/, { key: 'airport', rank: 1, difficulty: 1, zoom: 15.5 }],
  ['leisure', /^stadium$/, { key: 'stadium', rank: 1, difficulty: 1, zoom: 16.5 }],
  ['shop', /^(mall|supermarket)$/, { key: 'mall', rank: 2, difficulty: 1, zoom: 16.5 }],
  ['natural', /^(beach|bay|cape|reef)$/, { key: 'beach', rank: 1, difficulty: 2, zoom: 15.5 }],
  ['natural', /^(peak|volcano|crater|ridge|cliff|valley|waterfall|spring)$/, { key: 'peak', rank: 1, difficulty: 4, zoom: 15 }],
  ['tourism', /^(viewpoint|attraction|museum|picnic_site|camp_site)$/, { key: 'viewpoint', rank: 1, difficulty: 3, zoom: 16.5 }],
  ['leisure', /^(park|nature_reserve|golf_course|marina|sports_centre)$/, { key: 'park', rank: 2, difficulty: 2, zoom: 15.5 }],
  ['amenity', /^(school|college|university|hospital|marketplace|community_centre|library|fire_station|townhall)$/, { key: 'school', rank: 2, difficulty: 3, zoom: 16.5 }],
  ['man_made', /^(lighthouse|pier|tower|breakwater|water_tower)$/, { key: 'structure', rank: 2, difficulty: 3, zoom: 16.5 }],
  ['historic', /^(monument|memorial|fort|battlefield|ship)$/, { key: 'historic', rank: 2, difficulty: 3, zoom: 16.5 }],
  ['highway', /^(rest_area|trailhead)$/, { key: 'trailhead', rank: 2, difficulty: 3, zoom: 16.5 }],
  ['harbour', /./, { key: 'harbour', rank: 2, difficulty: 2, zoom: 15.5 }],
  ['waterway', /^dam$/, { key: 'dam', rank: 2, difficulty: 4, zoom: 16.5 }],
  ['power', /^(plant|generator)$/, { key: 'power', rank: 2, difficulty: 3, zoom: 15.5 }],
  ['sport', /surfing/, { key: 'surf', rank: 2, difficulty: 3, zoom: 16.5 }],
  ['landuse', /^(farmland|orchard|quarry|vineyard|forest)$/, { key: 'land', rank: 3, difficulty: 4, zoom: 15 }],
];
function kindOf(tags: Tags): Kind | null {
  for (const [k, re, kind] of KINDS) if (tags[k] && re.test(tags[k]!)) return kind;
  return null;
}

const QUERIES: Record<string, string> = {
  place: 'nwr["place"~"^(city|town|village|hamlet|suburb|neighbourhood|locality)$"]["name"]',
  natural: 'nwr["natural"~"^(beach|peak|bay|cape|volcano|crater|waterfall|valley|ridge|cliff|reef|spring)$"]["name"]',
  tourism: 'nwr["tourism"~"^(viewpoint|attraction|picnic_site|camp_site|museum)$"]["name"]',
  leisure: 'nwr["leisure"~"^(park|nature_reserve|golf_course|marina|stadium|sports_centre)$"]["name"]',
  amenity: 'nwr["amenity"~"^(school|college|university|hospital|marketplace|community_centre|library|fire_station|townhall)$"]["name"]',
  misc: [
    'nwr["aeroway"~"^(aerodrome|heliport)$"]["name"]', 'nwr["man_made"~"^(lighthouse|pier|tower|breakwater|water_tower)$"]["name"]',
    'nwr["historic"~"^(monument|memorial|fort|battlefield|ship)$"]["name"]', 'nwr["highway"~"^(rest_area|trailhead)$"]["name"]',
    'nwr["shop"~"^(mall|supermarket)$"]["name"]', 'nwr["harbour"]["name"]', 'nwr["waterway"="dam"]["name"]',
    'nwr["power"~"^(plant|generator)$"]["name"]', 'nwr["sport"~"surfing"]["name"]',
  ].join(`${BBOX};`),
  landuse: 'nwr["landuse"~"^(farmland|orchard|quarry|vineyard|forest)$"]["name"]',
};

async function overpass(name: string, body: string): Promise<Feature[]> {
  const q = `[out:json][timeout:180];(${body}${BBOX};);out center tags;`;
  const file = join(CACHE, `${name}-${createHash('sha1').update(q).digest('hex').slice(0, 8)}.json`);
  if (!existsSync(file)) {
    for (let attempt = 0; ; attempt++) {
      process.stdout.write(`fetching ${name}... `);
      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
        body: 'data=' + encodeURIComponent(q),
      });
      if (res.ok) { writeFileSync(file, await res.text()); console.log('ok'); break; }
      console.log(`HTTP ${res.status}`);
      if (attempt >= 5 || ![429, 503, 504].includes(res.status)) throw new Error(`Overpass ${name} failed: ${res.status}`);
      await new Promise((r) => setTimeout(r, 30_000));
    }
  }
  await new Promise((r) => setTimeout(r, 5_000)); // be polite between queries
  const json = JSON.parse(readFileSync(file, 'utf8')) as { elements: { lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Tags }[] };
  return json.elements
    .map((e) => ({ lat: e.lat ?? e.center?.lat, lon: e.lon ?? e.center?.lon, tags: e.tags ?? {} }))
    .filter((e): e is Feature => e.lat !== undefined && e.lon !== undefined && !!e.tags.name);
}

function bearing(from: [number, number], to: { lat: number; lon: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const φ1 = toRad(from[1]), φ2 = toRad(to.lat), Δλ = toRad(to.lon - from[0]);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.round((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360;
}

/** Greedy farthest-point pick of n items; keeps the best spread. */
function spread<T extends { lat: number; lon: number }>(items: T[], n: number, must: (t: T) => boolean): T[] {
  if (items.length <= n) return items;
  const picked: T[] = items.filter(must);
  if (!picked.length) picked.push(items[0]!);
  const minD = items.map((it) => Math.min(...picked.map((p) => haversineKm(it, p))));
  while (picked.length < n) {
    let best = -1, bestD = -1;
    for (let i = 0; i < items.length; i++) if (minD[i]! > bestD) { bestD = minD[i]!; best = i; }
    const p = items[best]!;
    picked.push(p);
    for (let i = 0; i < items.length; i++) minD[i] = Math.min(minD[i]!, haversineKm(items[i]!, p));
  }
  return picked;
}

const FUN_FACTS: [RegExp, IslandId, string][] = [
  [/^(lēʻahi|diamond head|diamond head state monument)$/i, 'oahu', 'Lēʻahi, better known as Diamond Head, is a tuff cone that formed in a single eruption long after the rest of Oʻahu was built.'],
  [/^haleakalā( national park)?$/i, 'maui', 'Haleakalā means "house of the sun." Its summit is where the demigod Māui is said to have snared the sun to slow its path.'],
  [/^waimea canyon( state park)?$/i, 'kauai', 'Waimea Canyon on Kauaʻi was carved by the Waimea River and by a collapse of the island\'s central volcano.'],
  [/^hanauma bay/i, 'oahu', 'Hanauma Bay is a flooded volcanic crater and became Hawaiʻi\'s first marine life conservation district.'],
  [/^h[aā]na$/i, 'maui', 'Hāna sits at the end of a winding coastal road with dozens of one lane bridges and is one of the most isolated towns in Hawaiʻi.'],
  [/^kalaupapa$/i, 'molokai', 'Kalaupapa, on a peninsula below sea cliffs, was the settlement where people with Hansen\'s disease were sent from 1866 onward.'],
  [/^mauna kea$/i, 'hawaii', 'Mauna Kea rises more than ten thousand meters from its base on the seafloor, which makes it the tallest mountain on Earth measured that way.'],
  [/^hilo$/i, 'hawaii', 'Hilo is one of the wettest cities in the United States and was rebuilt after tsunamis in 1946 and 1960.'],
  [/^(lahaina|lāhainā)$/i, 'maui', 'Lāhainā was the capital of the Hawaiian Kingdom before Honolulu and later a whaling port.'],
  [/^kailua$/i, 'oahu', 'Kailua on Oʻahu sits between the Koʻolau cliffs and a long white sand bay facing the trade winds.'],
  [/^waikīkī$/i, 'oahu', 'Waikīkī means "spouting water." Before the hotels it was wetlands, taro fields, and fishponds fed by mountain streams.'],
  [/^pearl city$/i, 'oahu', 'Pearl City takes its name from Puʻuloa, the pearl oysters that once grew in the harbor.'],
  [/^līhuʻe$/i, 'kauai', 'Līhuʻe is the county seat of Kauaʻi and grew up around a sugar plantation and its mill.'],
  [/^kaunakakai$/i, 'molokai', 'Kaunakakai is the main town on Molokaʻi and has a long wharf built for shipping pineapple.'],
  [/^lānaʻi city$/i, 'lanai', 'Lānaʻi City was built in the 1920s as a plantation town when the island was planted in pineapple.'],
  [/^k[iī]lauea$/i, 'hawaii', 'Kīlauea is one of the most active volcanoes on Earth and is home to Pele in Hawaiian tradition.'],
  [/^kailua-kona$/i, 'hawaii', 'Kailua-Kona was a seat of Hawaiian royalty and is where Kamehameha I spent his final years.'],
  [/^hanalei$/i, 'kauai', 'Hanalei means "crescent bay." Its valley is one of the largest taro growing areas in Hawaiʻi.'],
];

async function main() {
  mkdirSync(CACHE, { recursive: true });
  mkdirSync(OUT, { recursive: true });
  const raw: Feature[] = [];
  for (const [name, body] of Object.entries(QUERIES)) raw.push(...(await overpass(name, body)));
  console.log(`raw features: ${raw.length}`);

  const excluded: string[] = [];
  const settlements: { lat: number; lon: number; name: string; island: IslandId }[] = [];
  const kept: { lat: number; lon: number; name: string; kind: Kind; island: IslandId }[] = [];
  const seen = new Set<string>();
  for (const f of raw) {
    const kind = kindOf(f.tags);
    if (!kind) continue;
    let name = fixOkina(f.tags.name!.trim());
    const haw = f.tags['name:haw'];
    if (haw && fold(haw) === fold(name)) name = haw;
    const island = islandForPoint(f.lat, f.lon);
    if (isExcluded(name, f.tags) || !island.inPool) { excluded.push(name); continue; }
    if (/^(city|town|village|hamlet|suburb|neighbourhood)$/.test(f.tags.place ?? '')) settlements.push({ lat: f.lat, lon: f.lon, name, island: island.id });
    const k = `${island.id}|${fold(name)}|${kind.key}`;
    if (seen.has(k)) continue;
    seen.add(k);
    kept.push({ lat: f.lat, lon: f.lon, name, kind, island: island.id });
  }

  // Dedupe within 250 m, more interesting kinds win. ponytail: O(n^2) on a few thousand points, fine.
  kept.sort((a, b) => a.kind.rank - b.kind.rank);
  const deduped: typeof kept = [];
  for (const c of kept) if (!deduped.some((d) => Math.abs(d.lat - c.lat) < 0.004 && haversineKm(d, c) < 0.25)) deduped.push(c);
  console.log(`after exclude/dedupe: ${deduped.length} (excluded ${excluded.length})`);

  // Island caps for a 3,000 pool, keep the best spread where over cap.
  const byIsland = new Map<IslandId, typeof deduped>();
  for (const d of deduped) byIsland.set(d.island, [...(byIsland.get(d.island) ?? []), d]);
  const selected: typeof deduped = [];
  for (const island of ISLANDS) {
    const list = byIsland.get(island.id) ?? [];
    const cap = Math.max(1, Math.round(3000 * island.weight));
    selected.push(...spread(list, cap, (t) => ['town', 'village'].includes(t.kind.key) || FUN_FACTS.some(([re, isl]) => isl === t.island && re.test(t.name))));
    console.log(`${island.name}: ${list.length} candidates, kept ${Math.min(list.length, cap)}`);
  }

  const spots: Spot[] = selected.map((s, i) => {
    const island = ISLAND_BY_ID[s.island];
    const sameIsland = settlements.filter((t) => t.island === s.island);
    let near: string | null = null, nearKm = Infinity;
    for (const t of sameIsland) { const d = haversineKm(s, t); if (d < nearKm) { nearKm = d; near = t.name; } }
    if (nearKm > 15) near = island.name;
    const difficulty = Math.min(5, s.kind.difficulty + (nearKm > 3 ? 1 : 0)) as Spot['difficulty'];
    const [w, so, e, n] = island.bbox;
    const far = haversineKm(s, { lat: island.center[1], lon: island.center[0] }) > haversineKm({ lat: so, lon: w }, { lat: n, lon: e }) / 4; // ponytail: quarter of the bbox diagonal counts as "coastal"
    const b = far ? bearing(island.center, s) : bearing([s.lon, s.lat], { lat: island.center[1], lon: island.center[0] });
    const fact = FUN_FACTS.find(([re, isl]) => isl === s.island && re.test(s.name))?.[2] ?? null;
    return { id: i + 1, mode: 'sky', lat: +s.lat.toFixed(6), lon: +s.lon.toFixed(6), island: s.island, placeName: s.name, near, zoom: s.kind.zoom, pitch: 55, bearing: b, imageId: null, credit: null, funFact: fact, difficulty, status: 'approved' };
  });

  // Practice pack: 300 spots, round robin over island x difficulty buckets.
  const buckets = new Map<string, Spot[]>();
  for (const s of spots) { const k = `${s.island}|${s.difficulty}`; buckets.set(k, [...(buckets.get(k) ?? []), s]); }
  let seed = 7;
  const rnd = () => { seed = (seed * 48271) % 2147483647; return seed / 2147483647; };
  for (const list of buckets.values()) list.sort(() => rnd() - 0.5);
  const practice: Spot[] = [];
  const lists = [...buckets.values()];
  for (let round = 0; practice.length < 300 && lists.some((l) => l.length > round); round++)
    for (const l of lists) if (practice.length < 300 && l[round]) practice.push({ ...l[round]!, status: 'practice' });
  const practiceIds = new Set(practice.map((p) => p.id));
  const daily = spots.filter((s) => !practiceIds.has(s.id));

  writeFileSync(join(OUT, 'spots.json'), JSON.stringify(daily));
  writeFileSync(PRACTICE_OUT, JSON.stringify({ version: 1, updated: new Date().toISOString().slice(0, 10), spots: practice }));

  const count = (list: Spot[], key: (s: Spot) => string) => { const m = new Map<string, number>(); for (const s of list) m.set(key(s), (m.get(key(s)) ?? 0) + 1); return [...m].map(([k, v]) => `  ${k}: ${v}`).join('\n'); };
  const report = [
    `Daily pool: ${daily.length} spots. Practice pack: ${practice.length}. Excluded by filter: ${excluded.length}.`,
    'Daily per island:', count(daily, (s) => ISLAND_BY_ID[s.island].name),
    'Daily per difficulty:', count(daily, (s) => String(s.difficulty)),
    'Practice per island:', count(practice, (s) => ISLAND_BY_ID[s.island].name),
    `Fun facts attached: ${spots.filter((s) => s.funFact).length}`,
    'Excluded names (first 100):', ...excluded.slice(0, 100).map((n) => `  ${n}`),
  ].join('\n');
  writeFileSync(join(OUT, 'report.txt'), report);
  console.log(report.split('Excluded names')[0]);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().catch((e) => { console.error(e); process.exit(1); });
