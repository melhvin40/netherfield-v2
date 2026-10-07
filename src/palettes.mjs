// Colour palettes. Each palette is three colours and nothing else:
//   light  – the page and every light surface
//   dark   – text, headings, the header and the dark bands
//   accent – buttons and fine details (eyebrows, rules, the italic word in a heading)
// Every other shade on the site (hover, muted text, card, rule, overlay) is derived from these three
// at build time, so a palette never brings in a fourth colour. tools/build.mjs writes the CSS.
//
// While more than one palette is listed, every page offers a small switcher to compare them
// (also ?palette=<id> in the address). Keep a single palette to remove the switcher.
export const PALETTES = [
  { id: 'ivory', name: 'Ivory & Ink', light: '#F2EEE6', dark: '#1A1917', accent: '#A88A5C' },
  { id: 'midnight', name: 'Midnight & Champagne', light: '#F4F1EA', dark: '#131B2B', accent: '#BCA37A' },
  { id: 'olive', name: 'Limestone & Olive', light: '#EDE9E0', dark: '#24261F', accent: '#9E9467' }
];
export const DEFAULT_PALETTE = 'ivory';

// ---- colour maths (OKLab, as CSS color-mix uses), only needed at build time ----
const lin = v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
const gam = v => v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
const hexRGB = h => [0, 2, 4].map(i => parseInt(h.slice(1).slice(i, i + 2), 16) / 255);
const rgbHex = c => '#' + c.map(v => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
function toLab(hex) {
  const [r, g, b] = hexRGB(hex).map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
}
function fromLab([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return rgbHex([4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s].map(v => gam(Math.min(1, Math.max(0, v)))));
}
// share t of colour b mixed into a
const mix = (a, b, t) => { const A = toLab(a), B = toLab(b); return fromLab(A.map((x, i) => x * (1 - t) + B[i] * t)); };
// same hue and chroma, lighter (+) or darker (-)
const shift = (hex, dl) => { const [L, a, b] = toLab(hex); return fromLab([L + dl, a, b]); };
const lum = hex => { const [r, g, b] = hexRGB(hex).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const rgb = hex => hexRGB(hex).map(v => Math.round(v * 255)).join(' ');

// The full set of shades for one palette. Small text keeps WCAG AA contrast (4.5:1) on every light surface.
export function shades(p) {
  const s = {
    paper: p.light, 'paper-2': mix(p.light, p.dark, 0.035), 'paper-3': mix(p.light, p.dark, 0.07), white: mix(p.light, '#FFFFFF', 0.6),
    dark: p.dark, 'dark-2': mix(p.dark, p.light, 0.06), 'dark-3': mix(p.dark, p.light, 0.1), 'dark-hover': mix(p.dark, p.light, 0.16),
    accent: p.accent, 'accent-hi': mix(p.accent, p.light, 0.2), 'accent-wash': mix(p.accent, p.light, 0.78),
    'ink-2': mix(p.dark, p.light, 0.22)
  };
  let t = 0;
  while (contrast(shift(p.accent, -t), s['paper-3']) < 4.8) t += 0.005;
  s['accent-ink'] = shift(p.accent, -t);          // accent as small text on light
  t = 0;
  while (contrast(shift(p.accent, t), p.dark) < 6.5) t += 0.005;
  s['accent-lite'] = shift(p.accent, t);          // accent as text on dark
  t = 0.5;
  while (contrast(mix(p.dark, p.light, t), s['paper-3']) < 4.8) t -= 0.01;
  s['ink-3'] = mix(p.dark, p.light, t);           // muted text
  return s;
}

// CSS custom properties for one palette. The names are the ones the stylesheets use.
export function paletteVars(p) {
  const s = shades(p);
  const svg = (body, stroke) => `url("data:image/svg+xml,${encodeURIComponent(body.replace(/STROKE/g, stroke))}")`;
  const arrow = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='STROKE' stroke-width='1.4' stroke-linecap='round'><path d='M6 9l6 6 6-6'/></svg>`;
  const plan = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 180' fill='none' stroke='STROKE' stroke-width='1' opacity='.55'><path d='M20 20h200v140H20zM20 90h70V20M90 120v40M120 90h100M120 90v30M160 20v40h60M60 160v-40h30'/><path d='M90 90a22 22 0 0 1 22-22M120 120a14 14 0 0 1 14 14' stroke-dasharray='3 3'/></svg>`;
  return {
    '--c-light': p.light, '--c-dark': p.dark, '--c-accent': p.accent,
    '--navy-950': s.dark, '--navy-900': s['dark-2'], '--navy-850': s['dark-3'], '--navy-800': s['dark-hover'],
    '--gold': s.accent, '--gold-hi': s['accent-hi'], '--gold-300': s['accent-lite'], '--gold-ink': s['accent-ink'], '--gold-wash': s['accent-wash'],
    '--paper': s.paper, '--paper-2': s['paper-2'], '--paper-3': s['paper-3'], '--white': s.white,
    '--ink': s.dark, '--ink-2': s['ink-2'], '--ink-3': s['ink-3'],
    '--dark-rgb': rgb(s.dark), '--paper-rgb': rgb(s.paper), '--white-rgb': rgb(s.white),
    '--accent-rgb': rgb(s.accent), '--accent-lite-rgb': rgb(s['accent-lite']), '--accent-ink-rgb': rgb(s['accent-ink']),
    '--arrow-svg': svg(arrow, s.dark), '--plan-svg': svg(plan, s['accent-ink'])
  };
}

export function paletteCSS() {
  const block = (sel, p) => `${sel}{${Object.entries(paletteVars(p)).map(([k, v]) => `${k}:${v}`).join('; ')}}`;
  const def = PALETTES.find(p => p.id === DEFAULT_PALETTE) || PALETTES[0];
  return [block(':root', def), ...PALETTES.filter(p => p !== def).map(p => block(`html[data-palette="${p.id}"]`, p))].join('\n') + '\n';
}

export function defaultPalette() { return PALETTES.find(p => p.id === DEFAULT_PALETTE) || PALETTES[0]; }
