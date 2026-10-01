import strings from './strings.en.json';

type Entry = string | { text: string; review?: boolean };
const table = strings as Record<string, Entry>;

/** Look up copy by key. `{name}` placeholders are filled from vars. */
export function t(key: string, vars?: Record<string, string | number>): string {
  const e = table[key];
  let s = e === undefined ? key : typeof e === 'string' ? e : e.text;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}
