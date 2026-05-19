// Design tokens — single source of truth. Pull from here, don't hard-code.

export const tokens = {
  bg:        '#FAFAF7',
  panel:     '#FFFFFF',
  ink:       '#0F0F0E',
  mid:       '#6E6E68',
  soft:      '#9A9A92',
  rule:      '#E8E4D8',
  soft_rule: '#F1EEE2',
  yellow:    '#E5FF00',
  code_bg:   '#FBFAF3',
  code_hl:   '#FFF7B8',
  ok:        '#1F7A4F',
  warn:      '#A8761A',
  fail:      '#B5331A',
};

export const fonts = {
  serifDisplay: '"Instrument Serif", serif',
  serifBody:    '"Newsreader", "Georgia", serif',
  sans:         '"Geist", system-ui, sans-serif',
  mono:         '"JetBrains Mono", "SF Mono", Menlo, monospace',
};

// Default color export — every page does `import { C } from '../tokens'`.
export const C = tokens;
