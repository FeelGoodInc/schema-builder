'use client';
import type {
  SchemaNode,
  Viewport
}                 from '../../types/schema';
import {
  boundsOfNode,
  worldToScreen
}                 from '../../lib/transform';
import styles     from './sb-selection-layer.module.scss';

interface SelectionLayerProps {
  nodes: SchemaNode[];
  viewport: Viewport;
}

export const SelectionLayer = ({
  nodes,
  viewport
}: SelectionLayerProps): React.ReactNode => {
  return (
    <>
      {nodes.map((node) => {
        const bounds = boundsOfNode(node);
        const topLeft = worldToScreen(viewport, { x: bounds.x, y: bounds.y });

        return (
          <div
            key={node.id}
            className={styles.outline}
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

export default SelectionLayer;
