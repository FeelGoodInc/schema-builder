import type { SchemaNode } from '../types/schema';
import type { SchemaItemData } from '../types/builder';
import { anchorOf, boundsOfNode } from '../lib/transform';

export const TRIANGLE_ALIAS = 'triangle';
export const GROUP_ALIAS = 'group';

export function itemDataOf(node: SchemaNode): SchemaItemData {
  const anchor = anchorOf(node);

  if (node.kind === 'item') {
    return {
      alias: node.alias,
      id: node.id,
      kind: node.kind,
      x: anchor.x,
      y: anchor.y,
      size: node.size,
      rotation: node.rotation,
      color: node.color,
      flipX: node.flipX ?? false,
      flipY: node.flipY ?? false,
      customData: node.customData ?? {},
      node,
    };
  }

  const bounds = boundsOfNode(node);
  return {
    alias: node.kind === 'triangle' ? TRIANGLE_ALIAS : GROUP_ALIAS,
    id: node.id,
    kind: node.kind,
    x: anchor.x,
    y: anchor.y,
    size: Math.max(bounds.width, bounds.height),
    rotation: node.kind === 'group' ? node.rotation : 0,
    flipX: false,
    flipY: false,
    customData: {},
    node,
  };
}
