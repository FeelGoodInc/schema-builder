import type { Pt, Viewport } from '@/types/schema';

export const MIN_SCALE = 0.1;
export const MAX_SCALE = 20;
export const MIN_NODE_SIZE = 8;
export const MAX_NODE_SIZE = 4000;
export const SNAP_STEP_DEG = 15;

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const clampScale = (scale: number): number => clamp(scale, MIN_SCALE, MAX_SCALE);

export const isFinitePoint = (p: Pt): boolean => Number.isFinite(p.x) && Number.isFinite(p.y);

export function screenToWorld(viewport: Viewport, p: Pt): Pt {
  return { x: (p.x - viewport.tx) / viewport.scale, y: (p.y - viewport.ty) / viewport.scale };
}

export function worldToScreen(viewport: Viewport, p: Pt): Pt {
  return { x: p.x * viewport.scale + viewport.tx, y: p.y * viewport.scale + viewport.ty };
}

export function fitViewport(
  view: { width: number; height: number },
  world: { width: number; height: number }
): Viewport {
  if (!view.width || !view.height || !world.width || !world.height) {
    return { scale: 1, tx: 0, ty: 0 };
  }
  const scale = clampScale(Math.min(view.width / world.width, view.height / world.height));
  return {
    scale,
    tx: (view.width - world.width * scale) / 2,
    ty: (view.height - world.height * scale) / 2,
  };
}

export function zoomAtPoint(viewport: Viewport, focus: Pt, factor: number): Viewport {
  const scale = clampScale(viewport.scale * factor);
  const ratio = scale / viewport.scale;
  return {
    scale,
    tx: focus.x - (focus.x - viewport.tx) * ratio,
    ty: focus.y - (focus.y - viewport.ty) * ratio,
  };
}

export function panBy(viewport: Viewport, delta: Pt): Viewport {
  return { ...viewport, tx: viewport.tx + delta.x, ty: viewport.ty + delta.y };
}

export function rotatePoint(p: Pt, center: Pt, radians: number): Pt {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = p.x - center.x;
  const dy = p.y - center.y;
  return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos };
}

export function rotateOffset(offset: Pt, degrees: number): Pt {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return { x: offset.x * cos - offset.y * sin, y: offset.x * sin + offset.y * cos };
}

export function centroid(points: Pt[]): Pt {
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

export function boundsOfPoints(points: Pt[]): { x: number; y: number; width: number; height: number } {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, width: Math.max(maxX - minX, 1), height: Math.max(maxY - minY, 1) };
}

export function normalizeDegrees(degrees: number): number {
  let value = degrees % 360;
  if (value > 180) value -= 360;
  if (value < -180) value += 360;
  return Math.round(value * 100) / 100;
}

export function snapDegrees(degrees: number, step = SNAP_STEP_DEG): number {
  return Math.round(degrees / step) * step;
}

export function degreesFromCenter(center: Pt, point: Pt): number {
  return (Math.atan2(point.y - center.y, point.x - center.x) * 180) / Math.PI;
}

export function maxDistance(points: Pt[], center: Pt): number {
  return Math.max(
    ...points.map((p) => Math.hypot(p.x - center.x, p.y - center.y))
  );
}

export function nodeScreenFrame(
  viewport: Viewport,
  node: { x: number; y: number; size: number }
): { center: Pt; half: number } {
  const center = worldToScreen(viewport, { x: node.x, y: node.y });
  return { center, half: (node.size * viewport.scale) / 2 };
}

export function triangleLocalPoints(vertices: Pt[], origin: Pt): Pt[] {
  return vertices.map((v) => ({ x: v.x - origin.x, y: v.y - origin.y }));
}
