import { describe, expect, it } from 'vitest';
import { anonymousName, nameKey, normalizeName, validateName } from '../src/names';
import { HAWAIIAN_NAMES } from './hawaiianNames';

describe('name rules', () => {
  it('length', () => {
    expect(validateName('ab')).toEqual({ ok: false, error: 'too_short' });
    expect(validateName('a'.repeat(19))).toEqual({ ok: false, error: 'too_long' });
    expect(validateName('abc').ok).toBe(true);
  });
  it('characters', () => {
    expect(validateName('Kai ʻŌmaʻo').ok).toBe(true);
    expect(validateName('kai_kea.1-2').ok).toBe(true);
    expect(validateName('kai<script>')).toEqual({ ok: false, error: 'bad_chars' });
    expect(validateName('kai 😀')).toEqual({ ok: false, error: 'bad_chars' });
  });
  it('normalizes and keys', () => {
    expect(normalizeName('  Kai   Kea ')).toBe('Kai Kea');
    expect(nameKey("Ka'iulani")).toBe(nameKey('Kaʻiulani'));
    expect(nameKey('Ka‘iulani')).toBe(nameKey('Kaʻiulani'));
    expect(nameKey('KAI')).toBe('kai');
  });
  it('reserved', () => {
    for (const n of ['admin', 'Admin1', 'Moderator', 'official', 'Kilo team', 'kilo staff']) {
      expect(validateName(n), n).toEqual({ ok: false, error: 'reserved' });
    }
  });
  it('profanity, including tricks', () => {
    for (const n of ['fuck', 'f u c k', 'fuuuck', 'sh1t head', 'a55hole', 'kys']) {
      expect(validateName(n), n).toEqual({ ok: false, error: 'profane' });
    }
  });
  it('anonymous names are stable', () => {
    expect(anonymousName('abc')).toBe(anonymousName('abc'));
    expect(anonymousName('abc')).toMatch(/^Player \d{4}$/);
  });
});

describe('Hawaiian names and words all pass', () => {
  it(`has at least 200 names`, () => expect(HAWAIIAN_NAMES.length).toBeGreaterThanOrEqual(200));
  for (const n of HAWAIIAN_NAMES) {
    it(n, () => {
      const r = validateName(n);
      expect(r.ok, `${n} -> ${JSON.stringify(r)}`).toBe(true);
    });
  }
});
