import { useThemeStore } from '../store/themeStore'

// SVG presentation attributes cannot use CSS variables, so charts read these per theme.
const PALETTES = {
  light: { line: '#d5dce8', text: '#64748b', brand: '#dc2626', success: '#15803d', cursor: 'rgba(148,163,184,.18)' },
  dark: { line: 'rgba(255,255,255,.12)', text: '#98a3b8', brand: '#ef4444', success: '#4ade80', cursor: 'rgba(255,255,255,.06)' },
}

export const useChartColors = () => PALETTES[useThemeStore((s) => s.theme)] || PALETTES.light
