// Attire design tokens, taken from the VirtualFit spatial try-on design prompt.
export const colors = {
  background: '#e9e4dc',
  ink: '#111111',
  inkSoft: 'rgba(30,30,32,0.72)',
  inkIcon: 'rgba(30,30,32,0.8)',
  icon: '#222222',
  white: '#ffffff',
  pill: 'rgba(255,255,255,0.92)',
  chip: 'rgba(255,255,255,0.22)',
  thumb: 'rgba(255,255,255,0.3)',
  hover: 'rgba(255,255,255,0.35)',
  ghostText: 'rgba(255,255,255,0.3)',
  textShadow: 'rgba(0,0,0,0.18)',
  shadow: 'rgba(40,30,20,0.45)',
  scrim: 'rgba(40,30,20,0.25)',
  danger: '#a3271b',
  outline: 'rgba(0,0,0,0.12)',
} as const;

// Frosted glass material (.glass), rendered by src/components/Glass.tsx.
export const glass = {
  intensity: 40,
  gradient: ['rgba(250,248,245,0.30)', 'rgba(150,144,136,0.20)', 'rgba(205,200,192,0.24)'],
  gradientStops: [0, 0.48, 1],
  gradientAngle: 155,
  blur: 22,
  border: 'rgba(255,255,255,0.5)',
  highlight: 'rgba(255,255,255,0.7)',
} as const;

// Inter, loaded in src/app/_layout.tsx. Each weight is its own family name.
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  black: 'Inter_900Black',
} as const;

export const fontSizes = {
  label: 10,
  xs: 12,
  sm: 14,
  md: 16,
} as const;

export const spacing = {
  xxs: 2,
  xs: 5,
  sm: 8,
  md: 12,
  lg: 18,
  xl: 22,
} as const;

export const radius = {
  thumb: 14,
  card: 22,
  sheet: 24,
  pill: 999,
} as const;

export const sizes = {
  chip: 30,
  tab: 38,
  railButton: 42,
  arrow: 46,
  thumb: 64,
} as const;

export const motion = {
  ease: [0.2, 0.8, 0.2, 1],
  scanEase: [0.65, 0, 0.35, 1],
  pillMs: 600,
  rollMs: 620,
  scanMs: 950,
} as const;
