'use client';

import type { SchemaNode, Viewport } from '@/types/schema';
import { boundsOfNode, worldToScreen } from '@/lib/transform';

interface SelectionLayerProps {
  nodes: SchemaNode[];
  viewport: Viewport;
}

export default function SelectionLayer({ nodes, viewport }: SelectionLayerProps) {
  return (
    <>
      {nodes.map((node) => {
        const bounds = boundsOfNode(node);
        const topLeft = worldToScreen(viewport, { x: bounds.x, y: bounds.y });
        return (
          <div
            key={node.id}
            className="sb-selection-outline"
            style={{
              left: topLeft.x,
              top: topLeft.y,
              width: bounds.width * viewport.scale,
              height: bounds.height * viewport.scale,
            }}
          />
        );
      })}
    </>
  );
}
