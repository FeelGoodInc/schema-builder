import type { IconType } from 'react-icons';
import type { IconLibKey } from '@/types/schema';

export type IconPack = Record<string, IconType>;

const LOADERS: Record<IconLibKey, () => Promise<IconPack>> = {
  md: () => import('react-icons/md').then((m) => m as unknown as IconPack),
  gi: () => import('react-icons/gi').then((m) => m as unknown as IconPack),
  tb: () => import('react-icons/tb').then((m) => m as unknown as IconPack),
};

const PREFIXES: Record<IconLibKey, string> = { md: 'Md', gi: 'Gi', tb: 'Tb' };

export const ICON_LIBS: IconLibKey[] = ['md', 'gi', 'tb'];

const packCache = new Map<IconLibKey, IconPack>();
const nameCache = new Map<IconLibKey, string[]>();

function isIconExport(value: unknown): value is IconType {
  return typeof value === 'function' || (typeof value === 'object' && value !== null);
}

export async function ensureIconPack(lib: IconLibKey): Promise<IconPack> {
  const cached = packCache.get(lib);
  if (cached) return cached;
  const raw = await LOADERS[lib]();
  const prefix = PREFIXES[lib];
  const pack: IconPack = {};
  const names: string[] = [];
  for (const [key, value] of Object.entries(raw)) {
    if (key.startsWith(prefix) && isIconExport(value)) {
      pack[key] = value as IconType;
      names.push(key);
    }
  }
  names.sort();
  packCache.set(lib, names.length ? pack : {});
  nameCache.set(lib, names);
  return packCache.get(lib) ?? {};
}

export function getCachedIconPack(lib: IconLibKey): IconPack | undefined {
  return packCache.get(lib);
}

export function getIconComponent(lib: IconLibKey, name: string): IconType | undefined {
  return packCache.get(lib)?.[name];
}

export function getCachedIconNames(lib: IconLibKey): string[] {
  return nameCache.get(lib) ?? [];
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function sampleIconNames(lib: IconLibKey, count: number, seed: number): string[] {
  const names = getCachedIconNames(lib);
  const random = mulberry32(seed);
  const copy = [...names];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}
