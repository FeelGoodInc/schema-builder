'use client';

import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Pt, SchemaNode, TriangleNode, Viewport } from '@/types/schema';
import { startPointerDrag } from '@/lib/drag';
import {
  MAX_NODE_SIZE,
  MIN_NODE_SIZE,
  centroid,
  degreesFromCenter,
  maxDistance,
  normalizeDegrees,
  rotateOffset,
  rotatePoint,
  snapDegrees,
  worldToScreen,
  screenToWorld,
} from '@/lib/transform';

const HANDLE_SIZE = 12;
const ROTATE_OFFSET = 26;

interface HandlesLayerProps {
  node: SchemaNode;
  viewport: Viewport;
  toLocal: (clientX: number, clientY: number) => Pt;
  onResize: (id: string, size: number) => void;
  onSetRotation: (id: string, degrees: number) => void;
  onSetVertex: (id: string, index: number, world: Pt) => void;
  onSetVertices: (id: string, vertices: [Pt, Pt, Pt]) => void;
}

export default function HandlesLayer({
  node,
  viewport,
  toLocal,
  onResize,
  onSetRotation,
  onSetVertex,
  onSetVertices,
}: HandlesLayerProps) {
  if (node.kind === 'triangle') {
    return (
      <TriangleHandles
        node={node}
        viewport={viewport}
        toLocal={toLocal}
        onSetVertex={onSetVertex}
        onSetVertices={onSetVertices}
      />
    );
  }

  const center = worldToScreen(viewport, { x: node.x, y: node.y });
  const half = (node.size * viewport.scale) / 2;
  const corners: Array<{ x: number; y: number }> = [
    { x: -half, y: -half },
    { x: half, y: -half },
    { x: half, y: half },
    { x: -half, y: half },
  ];

  const startResize = () => (event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    startPointerDrag({
      event,
      onMove: (client) => {
        const local = toLocal(client.x, client.y);
        const rotated = rotateOffset(
          { x: local.x - center.x, y: local.y - center.y },
          -node.rotation
        );
        const newHalf = Math.max(rotated.x, rotated.y, -rotated.x, -rotated.y, MIN_NODE_SIZE / 2);
        onResize(node.id, Math.min(newHalf * 2, MAX_NODE_SIZE));
      },
    });
  };

  const startRotate = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    startPointerDrag({
      event,
      onMove: (client, native) => {
        const local = toLocal(client.x, client.y);
        const raw = degreesFromCenter(center, local) + 90;
        onSetRotation(node.id, normalizeDegrees(native.shiftKey ? snapDegrees(raw) : raw));
      },
    });
  };

  const rotateHandleOffset = rotateOffset({ x: 0, y: -half - ROTATE_OFFSET }, node.rotation);

  return (
    <>
      <div
        className="sb-selection-frame"
        style={{
          position: 'absolute',
          left: center.x - half,
          top: center.y - half,
          width: half * 2,
          height: half * 2,
          transform: `rotate(${node.rotation}deg)`,
        }}
      />
      <svg className="sb-handles-svg" width="100%" height="100%">
        <line
          x1={center.x + rotateOffset({ x: 0, y: -half }, node.rotation).x}
          y1={center.y + rotateOffset({ x: 0, y: -half }, node.rotation).y}
          x2={center.x + rotateHandleOffset.x}
          y2={center.y + rotateHandleOffset.y}
          stroke="#1677ff"
          strokeWidth={1}
        />
      </svg>
      {corners.map((corner, index) => {
        const offset = rotateOffset(corner, node.rotation);
        return (
          <div
            key={index}
            className="sb-handle sb-handle--resize"
            style={{
              left: center.x + offset.x - HANDLE_SIZE / 2,
              top: center.y + offset.y - HANDLE_SIZE / 2,
              cursor: index % 2 === 0 ? 'nwse-resize' : 'nesw-resize',
            }}
            onPointerDown={startResize()}
          />
        );
      })}
      <div
        className="sb-handle sb-handle--rotate"
        style={{
          left: center.x + rotateHandleOffset.x - HANDLE_SIZE / 2,
          top: center.y + rotateHandleOffset.y - HANDLE_SIZE / 2,
        }}
        onPointerDown={startRotate}
      />
    </>
  );
}

function TriangleHandles({
  node,
  viewport,
  toLocal,
  onSetVertex,
  onSetVertices,
}: {
  node: TriangleNode;
  viewport: Viewport;
  toLocal: (clientX: number, clientY: number) => Pt;
  onSetVertex: (id: string, index: number, world: Pt) => void;
  onSetVertices: (id: string, vertices: [Pt, Pt, Pt]) => void;
}) {
  const screenVertices = node.vertices.map((v) => worldToScreen(viewport, v));
  const centerWorld = centroid(node.vertices);
  const centerScreen = worldToScreen(viewport, centerWorld);
  const radius = maxDistance(screenVertices, centerScreen) + ROTATE_OFFSET;
  const baseAngle = (degreesFromCenter(centerScreen, screenVertices[0]) * Math.PI) / 180;
  const rotateHandle = {
    x: centerScreen.x + Math.cos(baseAngle) * radius,
    y: centerScreen.y + Math.sin(baseAngle) * radius,
  };

  const startVertexDrag = (index: number) => (event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    startPointerDrag({
      event,
      onMove: (client) => {
        onSetVertex(node.id, index, screenToWorld(viewport, toLocal(client.x, client.y)));
      },
    });
  };

  const startRotate = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    const snapshot = node.vertices.map((v) => ({ ...v })) as [Pt, Pt, Pt];
    const snapshotCenter = centroid(snapshot);
    const startCursor = screenToWorld(viewport, toLocal(event.clientX, event.clientY));
    const startCursorAngle = degreesFromCenter(snapshotCenter, startCursor);

    startPointerDrag({
      event,
      onMove: (client, native) => {
        const cursor = screenToWorld(viewport, toLocal(client.x, client.y));
        const cursorAngle = degreesFromCenter(snapshotCenter, cursor);
        let delta = cursorAngle - startCursorAngle;
        if (native.shiftKey) delta = snapDegrees(delta);
        const radians = (delta * Math.PI) / 180;
        onSetVertices(
          node.id,
          snapshot.map((v) => rotatePoint(v, snapshotCenter, radians)) as [Pt, Pt, Pt]
        );
      },
    });
  };

  return (
    <>
      <svg className="sb-handles-svg" width="100%" height="100%">
        <polygon
          points={screenVertices.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="#1677ff"
          strokeWidth={1}
          strokeDasharray="5 4"
        />
        <line
          x1={centerScreen.x}
          y1={centerScreen.y}
          x2={rotateHandle.x}
          y2={rotateHandle.y}
          stroke="#1677ff"
          strokeWidth={1}
        />
        <circle cx={centerScreen.x} cy={centerScreen.y} r={3} fill="#1677ff" />
      </svg>
      {screenVertices.map((point, index) => (
        <div
          key={index}
          className="sb-handle sb-handle--vertex"
          style={{ left: point.x - HANDLE_SIZE / 2, top: point.y - HANDLE_SIZE / 2 }}
          onPointerDown={startVertexDrag(index)}
        />
      ))}
      <div
        className="sb-handle sb-handle--rotate"
        style={{ left: rotateHandle.x - HANDLE_SIZE / 2, top: rotateHandle.y - HANDLE_SIZE / 2 }}
        onPointerDown={startRotate}
      />
    </>
  );
}
