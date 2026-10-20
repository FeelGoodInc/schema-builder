'use client';

import { memo } from 'react';
import type { CSSProperties, MouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import type { CustomData, Pt, SchemaNode, Viewport } from '@/types/schema';
import { useBuilderConfig } from '@/state/schemaStore';
import { itemDataOf } from '@/lib/itemData';
import { anchorOf, boundsOfPoints, groupBaseBounds, groupPivot, screenToWorld, triangleLocalPoints } from '@/lib/transform';
import { startPointerDrag } from '@/lib/drag';

export interface ActivateModifiers {
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
}

const noop = () => {};
const noopCustomData = noop;

interface NodeViewProps {
  node: SchemaNode;
  viewport: Viewport;
  editable: boolean;
  interactive?: boolean;
  toLocal: (clientX: number, clientY: number) => Pt;
  onMoveAnchor: (id: string, anchor: Pt) => void;
  onActivate: (node: SchemaNode, modifiers: ActivateModifiers) => void;
  onUpdateCustomData: (id: string, data: CustomData) => void;
}

function NodeView({
  node,
  viewport,
  editable,
  interactive = true,
  toLocal,
  onMoveAnchor,
  onActivate,
  onUpdateCustomData,
}: NodeViewProps) {
  const config = useBuilderConfig();

  const handlePointerDown = (event: ReactPointerEvent<Element>) => {
    if (!interactive || !editable || event.button !== 0) return;
    event.stopPropagation();
    const modifiers = { shiftKey: event.shiftKey, ctrlKey: event.ctrlKey, metaKey: event.metaKey };
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
        if (!moved) onActivate(node, modifiers);
      },
    });
  };

  const handleClick = (event: MouseEvent) => {
    if (!interactive || editable) return;
    event.stopPropagation();
    onActivate(node, { shiftKey: event.shiftKey, ctrlKey: event.ctrlKey, metaKey: event.metaKey });
  };

  const interactiveProps = interactive
    ? editable
      ? { onPointerDown: handlePointerDown }
      : { onClick: handleClick }
    : {};

  if (node.kind === 'group') {
    const base = groupBaseBounds(node);
    const pivot = groupPivot(node);
    const groupTransform =
      `translate(${pivot.x}px, ${pivot.y}px) rotate(${node.rotation}deg) scale(${node.scale}) translate(${-pivot.x}px, ${-pivot.y}px)`;
    return (
      <div
        className="sb-node sb-node--group"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 0,
          height: 0,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 0,
            height: 0,
            transform: groupTransform,
          }}
        >
          {node.children.map((child) => (
            <NodeView
              key={child.id}
              node={child}
              viewport={viewport}
              editable={false}
              interactive={false}
              toLocal={toLocal}
              onMoveAnchor={onMoveAnchor}
              onActivate={noop}
              onUpdateCustomData={noopCustomData}
            />
          ))}
        </div>
        {interactive ? (
          <div
            className="sb-group-hit"
            style={{
              position: 'absolute',
              left: base.x,
              top: base.y,
              width: base.width,
              height: base.height,
              transform: groupTransform,
              transformOrigin: `${-base.x}px ${-base.y}px`,
              pointerEvents: 'auto',
              cursor: editable ? 'move' : 'pointer',
            }}
            {...interactiveProps}
          />
        ) : null}
      </div>
    );
  }

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
            style={{ pointerEvents: interactive ? 'auto' : 'none', cursor: editable ? 'move' : 'pointer' }}
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
    pointerEvents: interactive ? undefined : 'none',
    cursor: editable ? 'move' : 'pointer',
  };

  const available = config.findItem(node.alias);
  const CustomComponent = available?.component;
  const Icon = available?.icon;

  return (
    <div className="sb-node" style={frameStyle} {...interactiveProps}>
      {CustomComponent ? (
        <CustomComponent
          size={node.size}
          item={itemDataOf(node)}
          updateCustomData={(next) => onUpdateCustomData(node.id, next)}
        />
      ) : Icon ? (
        <Icon size={node.size} />
      ) : (
        <UnknownNode label={node.alias} size={node.size} />
      )}
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
