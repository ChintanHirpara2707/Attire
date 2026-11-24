// Color rules for outfits, all in HSL (see colorName.ts):
// - neutrals (black, white, grey, beige/tan/brown, navy) go with anything
// - monochrome: same hue (within ~15°)
// - analogous: neighbouring hues (within ~45°, centred on 30°)
// - complementary: opposite hues (180° ± 30°)
// - at most one bright color per outfit

import { hexToHsl } from './colorName';

type Hsl = NonNullable<ReturnType<typeof hexToHsl>>;

export type ColorItem = { id: string; category: string | null; color_hex: string | null };

export type OutfitRule = 'neutral' | 'accent' | 'monochrome' | 'analogous' | 'complementary' | 'mixed';

export type OutfitScore = { score: number; rule: OutfitRule };

export type Suggestion<T extends ColorItem> = OutfitScore & { items: T[] };

export const RULE_LABELS: Record<OutfitRule, string> = {
  neutral: 'All neutrals',
  accent: 'Neutrals + one accent',
  monochrome: 'Monochrome',
  analogous: 'Analogous',
  complementary: 'Complementary',
  mixed: 'Mixed colors',
};

export const CORE_CATEGORIES = ['top', 'bottom', 'shoes'] as const;

export function isNeutral({ h, s, l }: Hsl): boolean {
  if (s < 15 || l < 15 || l > 90) return true; // black, white, greys
  if (h >= 15 && h < 55 && s < 55) return true; // beige, tan, camel, brown
  if (h >= 200 && h < 250 && l < 30) return true; // navy
  return false;
}

export function isBright(c: Hsl): boolean {
  return !isNeutral(c) && c.s >= 60 && c.l >= 35 && c.l <= 75;
}

function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

type PairRule = 'monochrome' | 'analogous' | 'complementary' | 'clash';

function pairRule(a: Hsl, b: Hsl): PairRule {
  const d = hueDistance(a.h, b.h);
  if (d <= 15) return 'monochrome';
  if (d <= 45) return 'analogous';
  if (Math.abs(d - 180) <= 30) return 'complementary';
  return 'clash';
}

const PAIR_SCORE: Record<PairRule, number> = {
  monochrome: 0.9,
  analogous: 0.85,
  complementary: 0.8,
  clash: 0.25,
};

// Scores 0..1. Items without a valid color are ignored.
export function scoreOutfit(items: ColorItem[]): OutfitScore {
  const hsls = items.flatMap((i) => {
    const hsl = i.color_hex ? hexToHsl(i.color_hex) : null;
    return hsl ? [hsl] : [];
  });
  const colored = hsls.filter((c) => !isNeutral(c));
  const brights = colored.filter(isBright).length;
  const brightPenalty = brights > 1 ? 0.4 : 1;

  if (colored.length === 0) return { score: hsls.length ? 0.75 : 0, rule: 'neutral' };
  if (colored.length === 1) return { score: 0.85, rule: 'accent' };

  const rules: PairRule[] = [];
  let total = 0;
  for (let i = 0; i < colored.length; i++) {
    for (let j = i + 1; j < colored.length; j++) {
      const r = pairRule(colored[i], colored[j]);
      rules.push(r);
      let s = PAIR_SCORE[r];
      // Monochrome looks better with some light/dark contrast.
      if (r === 'monochrome' && Math.abs(colored[i].l - colored[j].l) >= 15) s = 0.95;
      total += s;
    }
  }
  // Neutrals soften any colour combination a little.
  const neutralShare = (hsls.length - colored.length) / hsls.length;
  const score = Math.min(1, (total / rules.length) * (1 + 0.1 * neutralShare)) * brightPenalty;

  const rule: OutfitRule = rules.every((r) => r === 'monochrome')
    ? 'monochrome'
    : rules.every((r) => r === 'monochrome' || r === 'analogous')
      ? 'analogous'
      : rules.every((r) => r !== 'clash')
        ? 'complementary'
        : 'mixed';
  return { score, rule };
}

const MAX_COMBOS = 20000;

// Best top + bottom + shoes combinations. `jitter` (0..1) adds randomness so
// "Shuffle" gives different but still good results.
export function suggestOutfits<T extends ColorItem>(
  items: T[],
  n = 5,
  jitter = 0,
): { suggestions: Suggestion<T>[]; missing: string[] } {
  const usable = items.filter((i) => i.category && i.color_hex && hexToHsl(i.color_hex));
  const [tops, bottoms, shoes] = CORE_CATEGORIES.map((c) => usable.filter((i) => i.category === c));
  const missing = CORE_CATEGORIES.filter((_, k) => [tops, bottoms, shoes][k].length === 0);
  if (missing.length > 0) return { suggestions: [], missing: [...missing] };

  const total = tops.length * bottoms.length * shoes.length;
  const pick = <U>(list: U[]) => list[Math.floor(Math.random() * list.length)];
  const combos: T[][] = [];
  if (total <= MAX_COMBOS) {
    for (const t of tops) for (const b of bottoms) for (const s of shoes) combos.push([t, b, s]);
  } else {
    for (let k = 0; k < MAX_COMBOS; k++) combos.push([pick(tops), pick(bottoms), pick(shoes)]);
  }

  const seen = new Set<string>();
  const ranked = combos
    .map((combo) => {
      const s = scoreOutfit(combo);
      return { ...s, items: combo, rank: s.score + Math.random() * jitter };
    })
    .sort((a, b) => b.rank - a.rank)
    .filter((c) => {
      const key = c.items.map((i) => i.id).join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, n)
    .map(({ score, rule, items: combo }) => ({ score, rule, items: combo }));

  return { suggestions: ranked, missing: [] };
}
