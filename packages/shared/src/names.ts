import {
  DataSet,
  englishDataset,
  englishRecommendedTransformers,
  parseRawPattern,
  RegExpMatcher,
} from 'obscenity';
import { NAME_MAX, NAME_MIN } from './constants';
import { ALLOW, EXTRA_BLOCK, RESERVED_PATTERNS } from './wordlists';

const OKINA = 'ʻ';
const OKINA_LOOKALIKES = /[‘’'`´]/g;

/** Letters (any script, so ā ē ī ō ū and friends pass), digits, spaces, and ʻ ' . _ - */
const ALLOWED_CHARS = /^[\p{L}\p{M}\p{N} ʻ'._-]+$/u;

export type NameError = 'too_short' | 'too_long' | 'bad_chars' | 'reserved' | 'profane';

/** NFC, collapsed spaces, trimmed. This is the name we store and show. */
export function normalizeName(raw: string): string {
  return raw.normalize('NFC').replace(/\s+/g, ' ').trim();
}

/** Lowercased, ʻ-folded key used for uniqueness. */
export function nameKey(raw: string): string {
  return normalizeName(raw)
    .replace(OKINA_LOOKALIKES, OKINA)
    .toLocaleLowerCase('en-US');
}

/** Strip diacritics and ʻokina so the English swear filter sees plain letters. */
function foldForFilter(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ʻ‘’'`]/g, '')
    .toLowerCase();
}

const dataset = new DataSet<{ originalWord: string }>().addAll(englishDataset);
for (const word of EXTRA_BLOCK) {
  dataset.addPhrase((p) => p.setMetadata({ originalWord: word }).addPattern(parseRawPattern(word)));
}
for (const word of ALLOW) {
  dataset.addPhrase((p) => p.setMetadata({ originalWord: word }).addWhitelistedTerm(foldForFilter(word)));
}

const matcher = new RegExpMatcher({ ...dataset.build(), ...englishRecommendedTransformers });

export function isProfane(name: string): boolean {
  const folded = foldForFilter(name);
  // Check as typed, with separators removed (f u c k, f.u.c.k), and the raw lowercase form.
  return (
    matcher.hasMatch(folded) ||
    matcher.hasMatch(folded.replace(/[\s._-]+/g, '')) ||
    matcher.hasMatch(name.toLowerCase())
  );
}

export function validateName(raw: string): { ok: true; name: string; key: string } | { ok: false; error: NameError } {
  const name = normalizeName(raw);
  if (name.length < NAME_MIN) return { ok: false, error: 'too_short' };
  if (name.length > NAME_MAX) return { ok: false, error: 'too_long' };
  if (!ALLOWED_CHARS.test(name)) return { ok: false, error: 'bad_chars' };
  const key = nameKey(name);
  if (RESERVED_PATTERNS.some((re) => re.test(key))) return { ok: false, error: 'reserved' };
  if (isProfane(name)) return { ok: false, error: 'profane' };
  return { ok: true, name, key };
}

/** What hidden players are called on the boards. */
export function anonymousName(playerId: string): string {
  let h = 0;
  for (const c of playerId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `Player ${1000 + (h % 9000)}`;
}
