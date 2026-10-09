import type { IconLibKey, NewNode, Pt, SchemaNode } from '@/types/schema';
import { createNodeId } from '@/state/schemaStore';
import { getRegisteredComponent } from './componentRegistry';

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

  if (spec.kind === 'icon') {
    return {
      id: createNodeId(),
      kind: 'icon',
      lib: spec.lib as IconLibKey,
      name: spec.name,
      x: spec.x,
      y: spec.y,
      size: DEFAULT_ICON_SIZE,
      rotation: 0,
    };
  }

  const registered = getRegisteredComponent(spec.ref);
  return {
    id: createNodeId(),
    kind: 'component',
    ref: spec.ref,
    x: spec.x,
    y: spec.y,
    size: registered?.meta.defaultSize ?? DEFAULT_ICON_SIZE,
    rotation: 0,
  };
}
