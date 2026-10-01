import { expect, it } from 'vitest';
import { fixOkina, isExcluded } from './sky';

it('blocks wahi pana and sensitive places', () => {
  expect(isExcluded('Puʻukoholā Heiau', {})).toBe(true);
  expect(isExcluded('Punchbowl Cemetery', {})).toBe(true);
  expect(isExcluded('Some Park', { historic: 'archaeological_site' })).toBe(true);
  expect(isExcluded('Lanikai Beach', { natural: 'beach' })).toBe(false);
});

it('turns apostrophes into the ʻokina in Hawaiian names', () => {
  expect(fixOkina("Ka'a'awa")).toBe('Kaʻaʻawa');
  expect(fixOkina("McDonald's")).toBe("McDonald's");
});
