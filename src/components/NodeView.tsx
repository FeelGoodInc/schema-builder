'use client';

import { createElement, memo, useEffect, useState } from 'react';
import type { CSSProperties, MouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import type { IconType } from 'react-icons';
import type { IconLibKey, Pt, SchemaNode, Viewport } from '@/types/schema';
import { ensureIconPack, getIconComponent } from '@/lib/iconsRegistry';
import { getRegisteredComponent } from '@/lib/componentRegistry';
import '@/lib/demoComponents';
import { boundsOfPoints, centroid, screenToWorld, triangleLocalPoints } from '@/lib/transform';
import { startPointerDrag } from '@/lib/drag';

export function anchorOf(node: SchemaNode): Pt {
  if (node.kind === 'triangle') return centroid(node.vertices);
  return { x: node.x, y: node.y };
}

function useIconComponent(lib: IconLibKey, name: string): IconType | undefined {
  const key = `${lib}/${name}`;
  const cached = getIconComponent(lib, name);
  const [resolved, setResolved] = useState<{ key: string; component?: IconType }>({ key: '' });

  useEffect(() => {
    if (cached || !name) return;
    let active = true;
    void ensureIconPack(lib).then((pack) => {
      if (active) setResolved({ key, component: pack[name] });
    });
    return () => {
      active = false;
    };
  }, [cached, key, lib, name]);

  if (!name) return undefined;
  return cached ?? (resolved.key === key ? resolved.component : undefined);
}

interface NodeViewProps {
  node: SchemaNode;
  viewport: Viewport;
  editable: boolean;
  toLocal: (clientX: number, clientY: number) => Pt;
  onMoveAnchor: (id: string, anchor: Pt) => void;
  onActivate: (node: SchemaNode) => void;
}

function NodeView({
  node,
  viewport,
  editable,
  toLocal,
  onMoveAnchor,
  onActivate,
}: NodeViewProps) {
  const isIcon = node.kind === 'icon';
  const Icon = useIconComponent(
    isIcon ? node.lib : 'md',
    isIcon ? node.name : ''
  );

  const handlePointerDown = (event: ReactPointerEvent<Element>) => {
    if (!editable || event.button !== 0) return;
    event.stopPropagation();
    const anchor = anchorOf(node);
    const startWorld = screenToWorld(viewport, toLocal(event.clientX, event.clientY));
    const grabOffset = { x: startWorld.x - anchor.x, y: startWorld.y - anchor.y };

    startPointerDrag({
      event,
      onMove: (client) => {
        const world = screenToWorld(viewport, toLocal(client.x, client.y));
        onMoveAnchor(node.id, { x: world.x - grabOffset.x, y: world.y - grabOffset.y });
      },
      onEnd: ({ moved }) => {
        if (!moved) onActivate(node);
      },
    });
  };

  const handleClick = (event: MouseEvent) => {
    if (editable) return;
    event.stopPropagation();
    onActivate(node);
  };

  const interactiveProps = editable
    ? { onPointerDown: handlePointerDown }
    : { onClick: handleClick };

  if (node.kind === 'triangle') {
    const bounds = boundsOfPoints(node.vertices);
    const local = triangleLocalPoints(node.vertices, bounds);
    return (
      <div
        className="sb-node"
        style={{
          position: 'absolute',
          left: bounds.x,
          top: bounds.y,
          width: bounds.width,
          height: bounds.height,
          pointerEvents: 'none',
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${bounds.width} ${bounds.height}`}
          preserveAspectRatio="none"
          style={{ overflow: 'visible', display: 'block' }}
        >
          <polygon
            points={local.map((p) => `${p.x},${p.y}`).join(' ')}
            fill={node.fill}
            stroke={node.stroke}
            strokeWidth={node.strokeWidth}
            strokeLinejoin="round"
            style={{ pointerEvents: 'auto', cursor: editable ? 'move' : 'pointer' }}
            {...interactiveProps}
          />
        </svg>
      </div>
    );
  }

  const frameStyle: CSSProperties = {
    position: 'absolute',
    left: node.x - node.size / 2,
    top: node.y - node.size / 2,
    width: node.size,
    height: node.size,
    transform: `rotate(${node.rotation}deg)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: editable ? 'move' : 'pointer',
  };

  if (node.kind === 'icon') {
    return (
      <div className="sb-node" style={frameStyle} {...interactiveProps}>
        {Icon ? createElement(Icon, { size: node.size }) : <UnknownNode label={node.name} size={node.size} />}
      </div>
    );
  }

  const registered = getRegisteredComponent(node.ref);
  const CustomComponent = registered?.component;

  return (
    <div className="sb-node" style={frameStyle} {...interactiveProps}>
      {CustomComponent ? createElement(CustomComponent, { size: node.size }) : <UnknownNode label={node.ref} size={node.size} />}
    </div>
  );
}

export default memo(NodeView);

function UnknownNode({ label, size }: { label: string; size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        border: '2px dashed #d9a441',
        borderRadius: 6,
        background: 'rgba(217,164,65,0.12)',
        color: '#8a5a00',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.max(9, size * 0.16),
        overflow: 'hidden',
        textAlign: 'center',
        padding: 4,
      }}
    >
      {label}
    </div>
  );
}
