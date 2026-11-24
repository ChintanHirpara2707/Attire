// Attire design tokens.
// Palette sampled from assets/logo.png: ember orange -> terracotta -> wine -> plum
// on warm cream, with the logo's near-black ink for text.

export const palette = {
  cream: '#F9F6F0', // logo background
  creamDeep: '#F1E8DC',
  ink: '#2D2727', // "Attire" wordmark
  gold: '#EEAB5F',
  apricot: '#E2A273',
  ember: '#CE7445',
  terracotta: '#B05946',
  rust: '#8A3930',
  wine: '#763840',
  plum: '#5A334B',
  plumDeep: '#54314F',
} as const;

// Semantic colors. Text colors keep at least 4.5:1 contrast on cream.
export const colors = {
  background: palette.cream,
  ink: palette.ink,
  inkSoft: '#6B5F5C', // ~5.6:1 on cream
  inkIcon: 'rgba(45,39,39,0.8)',
  icon: palette.ink,
  white: '#ffffff',
  accent: palette.terracotta, // white text on it is ~4.6:1
  accentDeep: palette.plum,
  pill: 'rgba(255,252,247,0.92)',
  chip: 'rgba(255,250,244,0.6)',
  thumb: 'rgba(255,250,244,0.55)',
  hover: 'rgba(255,255,255,0.45)',
  ghostText: 'rgba(255,255,255,0.3)',
  textShadow: 'rgba(45,39,39,0.12)',
  shadow: 'rgba(90,51,75,0.28)', // plum-tinted shadow
  scrim: 'rgba(45,39,39,0.32)',
  danger: '#9E3328',
  outline: 'rgba(45,39,39,0.12)',
} as const;

export const gradients = {
  // Brand sweep used for primary actions and avatars.
  brand: [palette.terracotta, palette.wine, palette.plum] as const,
  // Aurora blobs behind the content (kept soft; text never sits on them directly).
  aurora: [palette.gold, palette.ember, palette.wine, palette.plum] as const,
};

// Frosted glass material, rendered by src/components/Glass.tsx.
export const glass = {
  intensity: 30,
  tint: 'rgba(255,250,244,0.55)',
  gradient: ['rgba(255,255,255,0.55)', 'rgba(255,250,244,0.18)', 'rgba(255,250,244,0.08)'],
  gradientStops: [0, 0.5, 1],
  gradientAngle: 155,
  blur: 22,
  border: 'rgba(255,255,255,0.7)',
  highlight: 'rgba(255,255,255,0.9)',
} as const;

// Inter for UI text, Fraunces (serif) for display headings.
// Each weight is its own family name; both are loaded in src/app/_layout.tsx.
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  black: 'Inter_900Black',
  display: 'Fraunces_600SemiBold',
  displayItalic: 'Fraunces_400Regular_Italic',
} as const;

export const fontSizes = {
  label: 10,
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  display: 34,
} as const;

export const spacing = {
  xxs: 2,
  xs: 5,
  sm: 8,
  md: 12,
  lg: 18,
  xl: 22,
  xxl: 32,
} as const;

export const radius = {
  thumb: 14,
  card: 24,
  sheet: 28,
  pill: 999,
} as const;

export const sizes = {
  chip: 30,
  tab: 38,
  railButton: 42,
  arrow: 46,
  thumb: 64,
  avatar: 52,
} as const;

export const motion = {
  ease: [0.2, 0.8, 0.2, 1],
  scanEase: [0.65, 0, 0.35, 1],
  pillMs: 600,
  rollMs: 620,
  scanMs: 950,
  staggerMs: 70,
} as const;

// Spring presets for react-native-reanimated's withSpring.
export const springs = {
  // Press feedback: quick and slightly bouncy.
  press: { damping: 15, stiffness: 320, mass: 0.6 },
  // Entrances: soft settle.
  gentle: { damping: 18, stiffness: 140, mass: 1 },
  // Floating elements.
  float: { damping: 12, stiffness: 90, mass: 1 },
} as const;
