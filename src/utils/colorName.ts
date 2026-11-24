// Turns a #RRGGBB hex into a plain clothing color name ("navy", "beige", "olive"...).
// Works in HSL: lightness/saturation pick neutrals first, then hue picks the family.

type Hsl = { h: number; s: number; l: number }; // h 0-360, s and l 0-100

export function hexToHsl(hex: string): Hsl | null {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) return null;
  const [r, g, b] = [m[1], m[2], m[3]].map((x) => parseInt(x, 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l: l * 100 };

  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return { h, s: s * 100, l: l * 100 };
}

export function hexToColorName(hex: string): string {
  const hsl = hexToHsl(hex);
  if (!hsl) return 'unknown';
  const { h, s, l } = hsl;

  // Neutrals: very dark, very light or nearly grey.
  if (l < 15) return 'black';
  if (l > 93 && s < 60) return 'white';
  if (s < 12) {
    if (l < 30) return 'charcoal';
    if (l < 70) return 'grey';
    return 'light grey';
  }

  // Warm earthy tones (oranges/yellows with low saturation or low lightness).
  if (h >= 15 && h < 55) {
    if (l > 80) return 'cream';
    if (s < 45 && l > 60) return 'beige';
    if (s < 50 && l > 40) return 'tan';
    if (l < 40) return 'brown';
  }
  if (h >= 55 && h < 85 && l < 40 && s < 70) return 'olive';
  if (h >= 85 && h < 165 && s < 35 && l > 40) return 'sage';

  // Hue families.
  if (h < 12 || h >= 345) return l < 30 ? 'burgundy' : l > 75 ? 'pink' : 'red';
  if (h < 40) return l > 75 ? 'peach' : 'orange';
  if (h < 65) return l > 80 ? 'butter' : l < 45 ? 'mustard' : 'yellow';
  if (h < 165) return l < 25 ? 'forest green' : l > 75 ? 'mint' : 'green';
  if (h < 195) return 'teal';
  if (h < 255) {
    if (l < 30) return 'navy';
    if (l > 70) return 'sky blue';
    return 'blue';
  }
  if (h < 290) return l > 70 ? 'lavender' : 'purple';
  return l > 70 ? 'pink' : 'magenta';
}
