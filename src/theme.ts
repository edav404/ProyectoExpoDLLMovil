export const colors = {
  primary: '#126B63',
  primaryDark: '#084B45',
  primarySoft: '#DDF5F0',
  accent: '#1677B8',
  accentSoft: '#E5F2FB',
  background: '#F3F8F8',
  backgroundTint: '#EAF5F3',
  surface: '#FFFFFF',
  surfaceGlass: 'rgba(255, 255, 255, 0.78)',
  surfaceRaised: 'rgba(255, 255, 255, 0.92)',
  text: '#163432',
  muted: '#5C7471',
  border: '#D5E5E2',
  borderStrong: '#B8D6D0',
  danger: '#B42318',
  dangerSoft: '#FDEDEC',
  warning: '#8A5A00',
  warningSoft: '#FFF4D6',
  success: '#067647',
  successSoft: '#E7F6EC',
  white: '#FFFFFF',
  transparent: 'transparent',
} as const;

export const glass = {
  tint: 'light' as const,
  intensity: 34,
  intensityStrong: 58,
  border: 'rgba(255, 255, 255, 0.72)',
  borderStrong: 'rgba(255, 255, 255, 0.8)',
} as const;

export const spacing = { xxs: 2, xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 40 } as const;
export const radii = { xs: 8, sm: 12, md: 18, lg: 24, xl: 32, pill: 999 } as const;
export const motion = { fast: 140, base: 220, slow: 320 } as const;
export const shadows = {
  card: { shadowColor: '#0A403B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.07, shadowRadius: 18, elevation: 3 },
  floating: { shadowColor: '#0A403B', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.14, shadowRadius: 24, elevation: 8 },
} as const;
