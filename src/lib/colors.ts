/**
 * Color preview: detect hex, rgb(), hsl(), oklch() and return all format conversions.
 */

export type ColorFormat = {
  label: string;
  value: string;
};

export type ColorResult = {
  cssColor: string;
  formats: ColorFormat[];
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360; s /= 100; l /= 100;
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

// sRGB → linear
function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

// Linear sRGB → OKLab
function linearRgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const l_ = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m_ = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s_ = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l = Math.cbrt(l_);
  const m = Math.cbrt(m_);
  const s = Math.cbrt(s_);

  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
}

// OKLab → OKLCH
function oklabToOklch(L: number, a: number, b: number): [number, number, number] {
  const C = Math.sqrt(a * a + b * b);
  let h = Math.atan2(b, a) * 180 / Math.PI;
  if (h < 0) h += 360;
  return [L, C, h];
}

function rgbToOklch(r: number, g: number, b: number): [number, number, number] {
  const lr = srgbToLinear(r / 255);
  const lg = srgbToLinear(g / 255);
  const lb = srgbToLinear(b / 255);
  const [L, a, bVal] = linearRgbToOklab(lr, lg, lb);
  return oklabToOklch(L, a, bVal);
}

// OKLCH → OKLab → linear RGB → sRGB
function oklchToRgb(L: number, C: number, h: number): [number, number, number] {
  const hRad = h * Math.PI / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const rLin = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  return [
    clamp(Math.round(linearToSrgb(rLin) * 255), 0, 255),
    clamp(Math.round(linearToSrgb(gLin) * 255), 0, 255),
    clamp(Math.round(linearToSrgb(bLin) * 255), 0, 255),
  ];
}

function linearToSrgb(c: number): number {
  if (c <= 0) return 0;
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function rd(n: number, d: number): string {
  return parseFloat(n.toFixed(d)).toString();
}

// ─── Parsers ─────────────────────────────────────────────────────

const HEX3 = /^#([0-9a-f]{3})$/i;
const HEX6 = /^#([0-9a-f]{6})$/i;
const RGB = /^rgba?\(\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*(?:[,/]\s*[\d.]+%?\s*)?\)$/i;
const HSL = /^hsla?\(\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})%?\s*[,\s]\s*(\d{1,3})%?\s*(?:[,/]\s*[\d.]+%?\s*)?\)$/i;
const OKLCH = /^oklch\(\s*([\d.]+)%?\s+[\s,]*([\d.]+)\s+[\s,]*([\d.]+)\s*(?:[,/]\s*[\d.]+%?\s*)?\)$/i;

function parseToRgb(input: string): [number, number, number] | null {
  const trimmed = input.trim();
  let m: RegExpMatchArray | null;

  if ((m = trimmed.match(HEX3))) {
    const [c1, c2, c3] = m[1].split("");
    return [parseInt(c1 + c1, 16), parseInt(c2 + c2, 16), parseInt(c3 + c3, 16)];
  }
  if ((m = trimmed.match(HEX6))) {
    return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)];
  }
  if ((m = trimmed.match(RGB))) {
    return [clamp(parseInt(m[1]), 0, 255), clamp(parseInt(m[2]), 0, 255), clamp(parseInt(m[3]), 0, 255)];
  }
  if ((m = trimmed.match(HSL))) {
    return hslToRgb(clamp(parseInt(m[1]), 0, 360), clamp(parseInt(m[2]), 0, 100), clamp(parseInt(m[3]), 0, 100));
  }
  if ((m = trimmed.match(OKLCH))) {
    const L = clamp(parseFloat(m[1]) / 100, 0, 1);
    const C = clamp(parseFloat(m[2]), 0, 0.4);
    const h = parseFloat(m[3]) % 360;
    return oklchToRgb(L, C, h);
  }
  return null;
}

// ─── Public ──────────────────────────────────────────────────────

export function tryColorParse(input: string): ColorResult | null {
  const rgb = parseToRgb(input);
  if (!rgb) return null;

  const [r, g, b] = rgb;
  const hex = toHex(r, g, b);
  const [h, s, l] = rgbToHsl(r, g, b);
  const [okL, okC, okH] = rgbToOklch(r, g, b);

  return {
    cssColor: hex,
    formats: [
      { label: "HEX",   value: hex },
      { label: "RGB",   value: `rgb(${r}, ${g}, ${b})` },
      { label: "HSL",   value: `hsl(${h}, ${s}%, ${l}%)` },
      { label: "OKLCH", value: `oklch(${rd(okL * 100, 2)}% ${rd(okC, 4)} ${rd(okH, 2)})` },
    ],
  };
}
