import type {
  ChildNode,
  GroupNode,
  Pt,
  SchemaNode,
  Viewport
} from '../types/schema';

export const MIN_SCALE = 0.1;
export const MAX_SCALE = 20;
export const MIN_NODE_SIZE = 8;
export const MAX_NODE_SIZE = 4000;
export const MIN_GROUP_SCALE = 0.05;
export const MAX_GROUP_SCALE = 20;
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

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function boundsOfRects(rects: Bounds[]): Bounds {
  if (!rects.length) return { x: 0, y: 0, width: 1, height: 1 };
  const minX = Math.min(...rects.map((r) => r.x));
  const minY = Math.min(...rects.map((r) => r.y));
  const maxX = Math.max(...rects.map((r) => r.x + r.width));
  const maxY = Math.max(...rects.map((r) => r.y + r.height));
  return { x: minX, y: minY, width: Math.max(maxX - minX, 1), height: Math.max(maxY - minY, 1) };
}

export function boundsOfNode(node: SchemaNode): Bounds {
  if (node.kind === 'triangle') return boundsOfPoints(node.vertices);

  if (node.kind === 'group') {
    const base = groupBaseBounds(node);
    if (node.scale === 1 && node.rotation === 0) return base;
    const pivot = { x: base.x + base.width / 2, y: base.y + base.height / 2 };
    const corners: Pt[] = [
      { x: base.x, y: base.y },
      { x: base.x + base.width, y: base.y },
      { x: base.x + base.width, y: base.y + base.height },
      { x: base.x, y: base.y + base.height },
    ].map((corner) => transformPoint(corner, pivot, node.scale, node.rotation));
    return boundsOfPoints(corners);
  }

  const half = node.size / 2;
  const corners: Pt[] = [
    { x: -half, y: -half },
    { x: half, y: -half },
    { x: half, y: half },
    { x: -half, y: half },
  ]
    .map((offset) => rotateOffset(offset, node.rotation))
    .map((offset) => ({ x: node.x + offset.x, y: node.y + offset.y }));

  return boundsOfPoints(corners);
}

export function groupBaseBounds(node: GroupNode): Bounds {
  return boundsOfRects(node.children.map(boundsOfNode));
}

export function groupPivot(node: GroupNode): Pt {
  const base = groupBaseBounds(node);
  return { x: base.x + base.width / 2, y: base.y + base.height / 2 };
}

export function transformPoint(p: Pt, pivot: Pt, scale: number, degrees: number): Pt {
  const scaled = { x: pivot.x + (p.x - pivot.x) * scale, y: pivot.y + (p.y - pivot.y) * scale };
  return rotatePoint(scaled, pivot, (degrees * Math.PI) / 180);
}

export function bakeGroupTransform(node: GroupNode): ChildNode[] {
  if (node.scale === 1 && node.rotation === 0) return node.children.map((child) => ({ ...child }));
  const pivot = groupPivot(node);
  return node.children.map((child) => {
    if (child.kind === 'triangle') {
      return {
        ...child,
        vertices: child.vertices.map((v) =>
          transformPoint(v, pivot, node.scale, node.rotation)
        ) as [Pt, Pt, Pt],
      };
    }
    const position = transformPoint({ x: child.x, y: child.y }, pivot, node.scale, node.rotation);
    return {
      ...child,
      x: position.x,
      y: position.y,
      size: clamp(child.size * node.scale, MIN_NODE_SIZE, MAX_NODE_SIZE),
      rotation: normalizeDegrees(child.rotation + node.rotation),
    };
  });
}

export function anchorOf(node: SchemaNode): Pt {
  if (node.kind === 'triangle') return centroid(node.vertices);
  if (node.kind === 'group') {
    const bounds = boundsOfNode(node);
    return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  }
  return { x: node.x, y: node.y };
}

export function translateNode(node: SchemaNode, dx: number, dy: number): SchemaNode {
  if (node.kind === 'triangle') {
    return {
      ...node,
      vertices: node.vertices.map((v) => ({ x: v.x + dx, y: v.y + dy })) as [Pt, Pt, Pt],
    };
  }

  if (node.kind === 'group') {
    return {
      ...node,
      children: node.children.map((child) => translateNode(child, dx, dy)) as ChildNode[],
    };
  }

  return { ...node, x: node.x + dx, y: node.y + dy };
}
