import type { CardColor } from '../types';

export interface ColorTheme {
  /** Display name for pickers. */
  label: string;
  /** Solid fill for dots and swatches. */
  swatch: string;
  /** Solid label tab for cluster headers. */
  tab: string;
  /** Translucent wash for cluster regions. */
  region: string;
  /** Border for cluster regions. */
  regionBorder: string;
  /** Soft fill for sticky notes. */
  soft: string;
  /** Coloured text on light/dark surfaces. */
  text: string;
  /** Raw colour for SVG / minimap. */
  accent: string;
}

/**
 * Colour tokens per card / cluster tint. Classes are written out in full so
 * Tailwind can see them.
 */
export const COLOR_MAP: Record<CardColor, ColorTheme> = {
  default: {
    label: 'Graphite',
    swatch: 'bg-ink-500',
    tab: 'bg-ink-800 text-white dark:bg-ink-200 dark:text-ink-950',
    region: 'bg-ink-500/[0.05] dark:bg-ink-300/[0.04]',
    regionBorder: 'border-ink-400/30 dark:border-ink-400/20',
    soft: 'bg-ink-100 dark:bg-ink-800',
    text: 'text-ink-700 dark:text-ink-300',
    accent: '#6b7090',
  },
  blue: {
    label: 'Cobalt',
    swatch: 'bg-brand-500',
    tab: 'bg-brand-600 text-white',
    region: 'bg-brand-500/[0.06] dark:bg-brand-400/[0.07]',
    regionBorder: 'border-brand-500/30 dark:border-brand-400/25',
    soft: 'bg-brand-100 dark:bg-brand-500/20',
    text: 'text-brand-700 dark:text-brand-300',
    accent: '#3d5afe',
  },
  green: {
    label: 'Mint',
    swatch: 'bg-emerald-500',
    tab: 'bg-emerald-600 text-white',
    region: 'bg-emerald-500/[0.06] dark:bg-emerald-400/[0.06]',
    regionBorder: 'border-emerald-500/30 dark:border-emerald-400/25',
    soft: 'bg-emerald-100 dark:bg-emerald-500/20',
    text: 'text-emerald-700 dark:text-emerald-300',
    accent: '#10b981',
  },
  yellow: {
    label: 'Sunflower',
    swatch: 'bg-sun-400',
    tab: 'bg-sun-400 text-ink-950',
    region: 'bg-sun-400/[0.10] dark:bg-sun-400/[0.06]',
    regionBorder: 'border-sun-500/40 dark:border-sun-400/25',
    soft: 'bg-sun-200 dark:bg-sun-400/20',
    text: 'text-amber-700 dark:text-sun-300',
    accent: '#ffc93c',
  },
  purple: {
    label: 'Violet',
    swatch: 'bg-violet-500',
    tab: 'bg-violet-600 text-white',
    region: 'bg-violet-500/[0.06] dark:bg-violet-400/[0.07]',
    regionBorder: 'border-violet-500/30 dark:border-violet-400/25',
    soft: 'bg-violet-100 dark:bg-violet-500/20',
    text: 'text-violet-700 dark:text-violet-300',
    accent: '#8b5cf6',
  },
  pink: {
    label: 'Bubblegum',
    swatch: 'bg-pink-500',
    tab: 'bg-pink-500 text-white',
    region: 'bg-pink-500/[0.06] dark:bg-pink-400/[0.07]',
    regionBorder: 'border-pink-500/30 dark:border-pink-400/25',
    soft: 'bg-pink-100 dark:bg-pink-500/20',
    text: 'text-pink-700 dark:text-pink-300',
    accent: '#ec4899',
  },
  amber: {
    label: 'Tangerine',
    swatch: 'bg-orange-500',
    tab: 'bg-orange-500 text-white',
    region: 'bg-orange-500/[0.06] dark:bg-orange-400/[0.07]',
    regionBorder: 'border-orange-500/30 dark:border-orange-400/25',
    soft: 'bg-orange-100 dark:bg-orange-500/20',
    text: 'text-orange-700 dark:text-orange-300',
    accent: '#f97316',
  },
  rose: {
    label: 'Cherry',
    swatch: 'bg-rose-500',
    tab: 'bg-rose-600 text-white',
    region: 'bg-rose-500/[0.06] dark:bg-rose-400/[0.07]',
    regionBorder: 'border-rose-500/30 dark:border-rose-400/25',
    soft: 'bg-rose-100 dark:bg-rose-500/20',
    text: 'text-rose-700 dark:text-rose-300',
    accent: '#f43f5e',
  },
};

export const COLOR_ORDER: CardColor[] = ['blue', 'green', 'yellow', 'amber', 'rose', 'pink', 'purple', 'default'];

export const colorTheme = (c: string | undefined): ColorTheme =>
  COLOR_MAP[(c as CardColor) in COLOR_MAP ? (c as CardColor) : 'default'];
