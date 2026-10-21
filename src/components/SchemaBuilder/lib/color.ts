export const DEFAULT_ITEM_COLOR = '#1f2733ff';
export const DEFAULT_TRIANGLE_FILL = '#5c6bc0ff';
export const DEFAULT_TRIANGLE_STROKE = '#272e3aff';

interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const toHex2 = (value: number): string => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0');

const parseAlpha = (raw: string | undefined): number => {
  if (raw === undefined) return 1;
  if (raw.endsWith('%')) return clamp(parseFloat(raw) / 100, 0, 1);
  return clamp(parseFloat(raw), 0, 1);
};

const parseChannel = (raw: string, max: number): number => {
  if (raw.endsWith('%')) return clamp((parseFloat(raw) / 100) * max, 0, max);
  return clamp(parseFloat(raw), 0, max);
};

const parseHex = (value: string): Rgba | undefined => {
  if (!value.startsWith('#')) return undefined;
  const hex = value.slice(1);
  if (!/^[0-9a-f]+$/i.test(hex)) return undefined;

  if (hex.length === 3 || hex.length === 4) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    const a = hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1;
    return { r, g, b, a };
  }

  if (hex.length === 6 || hex.length === 8) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }

  return undefined;
};

const parseRgb = (value: string): Rgba | undefined => {
  const match = value.match(/^rgba?\(([^)]+)\)$/i);
  if (!match) return undefined;
  const parts = match[1].split(/[,\s/]+/).filter(Boolean);
  if (parts.length < 3) return undefined;
  return {
    r: parseChannel(parts[0], 255),
    g: parseChannel(parts[1], 255),
    b: parseChannel(parts[2], 255),
    a: parseAlpha(parts[3]),
  };
};

const hueToRgb = (p: number, q: number, t: number): number => {
  let value = t;
  if (value < 0) value += 1;
  if (value > 1) value -= 1;
  if (value < 1 / 6) return p + (q - p) * 6 * value;
  if (value < 1 / 2) return q;
  if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
  return p;
};

const hslToRgb = (h: number, s: number, l: number): { r: number; g: number; b: number } => {
  const hue = ((h % 360) + 360) % 360 / 360;
  if (s === 0) {
    const gray = l * 255;
    return { r: gray, g: gray, b: gray };
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: hueToRgb(p, q, hue + 1 / 3) * 255,
    g: hueToRgb(p, q, hue) * 255,
    b: hueToRgb(p, q, hue - 1 / 3) * 255,
  };
};

const parseHsl = (value: string): Rgba | undefined => {
  const match = value.match(/^hsla?\(([^)]+)\)$/i);
  if (!match) return undefined;
  const parts = match[1].split(/[,\s/]+/).filter(Boolean);
  if (parts.length < 3) return undefined;
  const h = parseFloat(parts[0]);
  const s = parts[1].endsWith('%') ? parseFloat(parts[1]) / 100 : parseFloat(parts[1]);
  const l = parts[2].endsWith('%') ? parseFloat(parts[2]) / 100 : parseFloat(parts[2]);
  if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l)) return undefined;
  const rgb = hslToRgb(h, clamp(s, 0, 1), clamp(l, 0, 1));
  return { ...rgb, a: parseAlpha(parts[3]) };
};

const rgbaToHexAlpha = ({ r, g, b, a }: Rgba): string =>
  `#${toHex2(r)}${toHex2(g)}${toHex2(b)}${toHex2(clamp(a, 0, 1) * 255)}`;

export function normalizeHexAlpha(value?: string | null, fallback = DEFAULT_ITEM_COLOR): string {
  if (!value) return fallback;
  const input = value.trim().toLowerCase();
  const parsed = parseHex(input) ?? parseRgb(input) ?? parseHsl(input);
  return parsed ? rgbaToHexAlpha(parsed) : normalizeHexAlpha(fallback, DEFAULT_ITEM_COLOR);
}