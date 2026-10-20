import type { NewNode, Pt, SchemaNode } from '@/types/schema';
import { createNodeId } from '@/state/schemaStore';

export const DEFAULT_ICON_SIZE = 64;
export const DEFAULT_TRIANGLE_SIDE = 140;

export function triangleVertices(center: Pt, side: number): [Pt, Pt, Pt] {
  const radius = side / Math.sqrt(3);
  const angles = [-90, 30, 150];
  return angles.map((deg) => {
    const rad = (deg * Math.PI) / 180;
    return { x: center.x + Math.cos(rad) * radius, y: center.y + Math.sin(rad) * radius };
  }) as [Pt, Pt, Pt];
}

export function createNode(spec: NewNode): SchemaNode {
  if (spec.kind === 'triangle') {
    return {
      id: createNodeId(),
      kind: 'triangle',
      vertices: triangleVertices({ x: spec.x, y: spec.y }, DEFAULT_TRIANGLE_SIDE),
      fill: '#5c6bc0',
      stroke: '#272e3a',
      strokeWidth: 2,
    };
  }

  return {
    id: createNodeId(),
    kind: 'item',
    alias: spec.alias,
    x: spec.x,
    y: spec.y,
    size: spec.size ?? DEFAULT_ICON_SIZE,
    rotation: 0,
  };
}
