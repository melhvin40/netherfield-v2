// Colour schemes. Each scheme is three colours and a plan for where they go:
//   light  – the page and the light surfaces
//   dark   – text, and the surfaces the plan makes dark
//   accent – used fully (buttons, italic words, labels, fine lines) or quietly (labels and fine lines only)
// The plan decides, per surface, whether it is light, a warm tint of the light, or dark:
//   header (header and mobile menu), band (featured listings, Golden Visa steps, the promise),
//   footer, tile (location and Street View tiles on property pages).
// Films and photos are never tinted: everything laid over them is neutral black (see src/css).
// Every shade is derived from the three colours at build time; small text keeps WCAG AA contrast.
//
// While more than one scheme is listed, every page offers a small switcher to compare them
// (also ?palette=<id> in the address). Keep a single scheme to remove the switcher.
export const PALETTES = [
  { id: 'ivory', name: 'Ivory & Black', light: '#F5F2ED', dark: '#171615', accent: '#8C8279',
    plan: { header: 'light', band: 'tint', footer: 'dark', tile: 'tint' }, accentUse: 'quiet' },
  { id: 'midnight', name: 'Midnight & Champagne', light: '#F5F2EC', dark: '#121A29', accent: '#C2AB82',
    plan: { header: 'dark', band: 'dark', footer: 'dark', tile: 'dark' }, accentUse: 'full' },
  { id: 'sand', name: 'Sand & Espresso', light: '#F3EDE4', dark: '#2B231E', accent: '#B08A5E',
    plan: { header: 'dark', band: 'tint', footer: 'dark', tile: 'tint' }, accentUse: 'full', tint: 0.11 }
];
export const DEFAULT_PALETTE = 'ivory';

// Where each surface lives in the markup. Inside a surface, the stylesheets read the --s-* colours.
const SURFACES = {
  header: ['.hdr', '.drawer'],
  band: ['.es', '.gv-steps', '.promise'],
  footer: ['.ftr'],
  tile: ['.pd-tile-map', '.pd-tile-street', '.pd-street-card'],
  film: ['.hh', '.ph-cinema', '.pd-tile-video', '.gvb-panel', '.vw', '.toast']
};

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
const mix = (a, b, t) => { const A = toLab(a), B = toLab(b); return fromLab(A.map((x, i) => x * (1 - t) + B[i] * t)); };   // share t of b
const shift = (hex, dl) => { const [L, a, b] = toLab(hex); return fromLab([L + dl, a, b]); };                                // same hue, lighter/darker
const lum = hex => { const [r, g, b] = hexRGB(hex).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const rgb = hex => hexRGB(hex).map(v => Math.round(v * 255)).join(' ');
const alpha = (hex, a) => `rgb(${rgb(hex)} / ${a})`;
// move a colour toward `toward` until it reaches the contrast `min` against `bg`
function until(from, toward, bg, min) {
  for (let t = 0; t <= 1; t += 0.01) { const c = mix(from, toward, t); if (contrast(c, bg) >= min) return c; }
  return toward;
}
function accentFor(accent, bg, min) {   // the accent's own hue, lightened or darkened until it reads on bg
  const dir = lum(bg) > 0.3 ? -1 : 1;
  for (let t = 0; t <= 0.6; t += 0.005) { const c = shift(accent, dir * t); if (contrast(c, bg) >= min) return c; }
  return dir < 0 ? '#000000' : '#FFFFFF';
}

// The colours of one surface: background, text in three strengths, rules, label, italic, line accent, button.
function surface(p, tone) {
  const full = p.accentUse === 'full';
  if (tone === 'dark' || tone === 'film') {
    const bg = tone === 'film' ? '#0B0B0B' : p.dark;
    const label = accentFor(p.accent, bg, 6);
    const ctaBg = full ? p.accent : p.light;
    return {
      bg: tone === 'film' ? 'transparent' : bg, 'bg-2': mix(p.dark, p.light, 0.08),
      fg: p.light, text: mix(p.light, bg, 0.14), muted: mix(p.light, bg, 0.28), faint: until(mix(p.light, bg, 0.5), p.light, bg, 4.8),
      line: alpha(p.light, 0.16), 'line-2': alpha(p.light, 0.3), hover: alpha(p.light, 0.07),
      label, em: full ? label : p.light, rule: full ? p.accent : alpha(p.light, 0.55), mark: full ? p.accent : p.light,
      'cta-bg': ctaBg, 'cta-fg': p.dark, 'cta-hover': mix(ctaBg, p.light, full ? 0.2 : 0.6),
      logo: 'none'
    };
  }
  const bg = tone === 'tint' ? mix(p.light, p.accent, p.tint ?? 0.16) : p.light;
  const label = accentFor(p.accent, bg, 4.8);
  const ctaBg = full ? p.accent : p.dark;
  const ctaFg = full ? (contrast(p.dark, ctaBg) >= contrast(p.light, ctaBg) ? p.dark : p.light) : p.light;
  return {
    bg, 'bg-2': mix(bg, p.dark, 0.06),
    fg: p.dark, text: mix(p.dark, bg, 0.22), muted: mix(p.dark, bg, 0.22), faint: until(mix(p.dark, bg, 0.5), p.dark, bg, 4.8),
    line: alpha(p.dark, 0.12), 'line-2': alpha(p.dark, 0.22), hover: alpha(p.dark, 0.05),
    label, em: full ? label : p.dark, rule: full ? p.accent : alpha(p.dark, 0.5), mark: full ? p.accent : p.dark,
    'cta-bg': ctaBg, 'cta-fg': ctaFg, 'cta-hover': full ? mix(ctaBg, p.light, 0.2) : mix(ctaBg, p.light, 0.16),
    logo: 'brightness(0)'
  };
}

// Page-wide colours (names as the stylesheets use them) plus the page surface itself.
function pageVars(p) {
  const tint = mix(p.light, p.accent, p.tint ?? 0.16);
  const page = surface(p, 'light');
  const onDark = surface(p, 'dark');
  const ink3 = until(mix(p.dark, p.light, 0.5), p.dark, mix(p.light, p.dark, 0.07), 4.8);   // muted text, AA on every light surface
  const svg = (body, stroke) => `url("data:image/svg+xml,${encodeURIComponent(body.replace(/STROKE/g, stroke))}")`;
  const arrow = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='STROKE' stroke-width='1.4' stroke-linecap='round'><path d='M6 9l6 6 6-6'/></svg>`;
  const plan = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 180' fill='none' stroke='STROKE' stroke-width='1' opacity='.55'><path d='M20 20h200v140H20zM20 90h70V20M90 120v40M120 90h100M120 90v30M160 20v40h60M60 160v-40h30'/><path d='M90 90a22 22 0 0 1 22-22M120 120a14 14 0 0 1 14 14' stroke-dasharray='3 3'/></svg>`;
  const hl = p.accentUse === 'full' ? p.accent : p.dark;          // highlights: focus, selection marks, saved
  return {
    '--c-light': p.light, '--c-dark': p.dark, '--c-accent': p.accent, '--hl': hl,
    '--navy-950': p.dark, '--navy-900': mix(p.dark, p.light, 0.06), '--navy-850': mix(p.dark, p.light, 0.1), '--navy-800': mix(p.dark, p.light, 0.16),
    '--gold': p.accent, '--gold-hi': mix(p.accent, p.light, 0.2), '--gold-300': onDark.label, '--gold-ink': page.label, '--gold-wash': mix(p.accent, p.light, 0.78),
    '--paper': p.light, '--paper-2': mix(p.light, p.dark, 0.035), '--paper-3': mix(p.light, p.dark, 0.07), '--white': mix(p.light, '#FFFFFF', 0.6), '--tint': tint,
    '--ink': p.dark, '--ink-2': mix(p.dark, p.light, 0.22), '--ink-3': ink3,
    '--dark-rgb': rgb(p.dark), '--paper-rgb': rgb(p.light), '--white-rgb': rgb(mix(p.light, '#FFFFFF', 0.6)),
    '--accent-rgb': rgb(p.accent), '--accent-lite-rgb': rgb(onDark.label), '--accent-ink-rgb': rgb(page.label),
    '--media-bg': mix(p.light, p.dark, 0.1),
    '--arrow-svg': svg(arrow, p.dark), '--plan-svg': svg(plan, page.label),
    ...surfaceVars(page)
  };
}
const surfaceVars = s => Object.fromEntries(Object.entries(s).map(([k, v]) => [`--s-${k}`, v]));

function schemeCSS(p, scope) {
  const block = (sel, vars) => `${sel}{${Object.entries(vars).map(([k, v]) => `${k}:${v}`).join('; ')}}`;
  const out = [block(scope || ':root', pageVars(p))];
  for (const [name, sels] of Object.entries(SURFACES)) {
    const tone = name === 'film' ? 'film' : p.plan[name];
    out.push(block(`${scope ? scope + ' ' : ''}:is(${sels.join(', ')})`, surfaceVars(surface(p, tone))));
  }
  return out.join('\n');
}

export function paletteCSS() {
  const def = defaultPalette();
  return [schemeCSS(def), ...PALETTES.filter(p => p !== def).map(p => schemeCSS(p, `html[data-palette="${p.id}"]`))].join('\n') + '\n';
}

export function defaultPalette() { return PALETTES.find(p => p.id === DEFAULT_PALETTE) || PALETTES[0]; }

// For the build log and tests: every text colour against its surface.
export function contrastReport() {
  const rows = [];
  for (const p of PALETTES) {
    for (const tone of ['light', 'tint', 'dark', 'film']) {
      const s = surface(p, tone), bg = tone === 'film' ? '#0B0B0B' : s.bg;
      for (const k of ['fg', 'text', 'muted', 'faint', 'label']) rows.push({ palette: p.id, tone, key: k, ratio: +contrast(s[k], bg).toFixed(2) });
      if (/^#/.test(s['cta-bg'])) rows.push({ palette: p.id, tone, key: 'cta', ratio: +contrast(s['cta-fg'], s['cta-bg']).toFixed(2) });
    }
  }
  return rows;
}
