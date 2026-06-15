export const Colors = {
  light: {
    bg: '#f9f9f8',
    surface: '#ffffff',
    surface2: '#f5f4f0',
    text: '#1a1a18',
    textMuted: '#6b6b67',
    textDim: '#a8a89f',
    border: 'rgba(0,0,0,0.08)',
    borderMd: 'rgba(0,0,0,0.13)',
    accent: '#d97757',
    accentHover: '#c96644',
    accentDim: 'rgba(217,119,87,0.10)',
    success: '#1d9e75',
    successDim: 'rgba(29,158,117,0.10)',
    successBorder: 'rgba(29,158,117,0.25)',
    danger: '#e24b4a',
    dangerDim: 'rgba(226,75,74,0.10)',
    dangerBorder: 'rgba(226,75,74,0.25)',
    warning: '#ba7517',
    warningDim: 'rgba(186,117,23,0.10)',
    warningBorder: 'rgba(186,117,23,0.25)',
    info: '#185fa5',
    infoDim: 'rgba(24,95,165,0.10)',
    infoBorder: 'rgba(24,95,165,0.25)',
  },
  dark: {
    bg: '#0f0f0e',
    surface: '#1a1a18',
    surface2: '#222220',
    text: '#eceae4',
    textMuted: '#8a8880',
    textDim: '#4a4a46',
    border: 'rgba(255,255,255,0.07)',
    borderMd: 'rgba(255,255,255,0.12)',
    accent: '#e08060',
    accentHover: '#ea9070',
    accentDim: 'rgba(224,128,96,0.12)',
    success: '#34c97a',
    successDim: 'rgba(52,201,122,0.10)',
    successBorder: 'rgba(52,201,122,0.25)',
    danger: '#f26b6a',
    dangerDim: 'rgba(242,107,106,0.10)',
    dangerBorder: 'rgba(242,107,106,0.25)',
    warning: '#ef9f27',
    warningDim: 'rgba(239,159,39,0.10)',
    warningBorder: 'rgba(239,159,39,0.25)',
    info: '#378add',
    infoDim: 'rgba(55,138,221,0.12)',
    infoBorder: 'rgba(55,138,221,0.25)',
  },
} as const;

export type ColorSchemeColors = typeof Colors.light;

export function useColors(dark: boolean): ColorSchemeColors {
  return dark ? Colors.dark : Colors.light;
}

export const Radius = {
  sm: 8,
  md: 10,
  lg: 14,
} as const;

export const Fonts = {
  doom: 'AmazDoom',
  sans: undefined, // System sans-serif
  mono: 'monospace',
} as const;
