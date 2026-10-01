/**
 * Local additions to the swear filter.
 * EXTRA_BLOCK: words to block on top of the English dataset. Plain lowercase words, one per entry.
 * ALLOW: words the English dataset wrongly flags. Hawaiian words and place names go here.
 * Keep both lists short and honest. Every entry is a judgment call made by a person.
 */
export const EXTRA_BLOCK: string[] = ['haole scum', 'kill yourself', 'kys'];

export const ALLOW: string[] = [
  // Hawaiian words that trip English patterns
  'paki', 'pākī', 'kiki', 'kīkī', 'kikihale', 'hoe', 'hoea', 'pupu', 'pūpū', 'pupukea', 'pūpūkea',
  'kahuku', 'honokohau', 'hookipa', 'hoʻokipa', 'kahoolawe', 'kahoʻolawe', 'puna', 'punaluu', 'punaluʻu',
  'ass', 'assn', 'poʻo', 'poo', 'poopoo', 'kuku', 'kukui', 'niu', 'cumming', 'anal', 'kanalu', 'tit', 'kahana',
  'hana', 'hanalei', 'hanapepe', 'hanapēpē', 'nanakuli', 'nānākuli', 'wahiawa', 'wahiawā', 'spa', 'kokee', 'kōkeʻe',
];

/** Names that pretend to be staff. Compared against the lowercased name key. */
export const RESERVED_PATTERNS: RegExp[] = [
  /\badmin/i, /\bmod(erator)?\b/i, /\bofficial\b/i, /\bhuli\s*(team|staff|official|admin)\b/i, /\bstaff\b/i, /\bsupport\b/i,
];
