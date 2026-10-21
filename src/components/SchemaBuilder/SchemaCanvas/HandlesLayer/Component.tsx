'use client';

import { useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { ChildNode, GroupNode, Pt, TriangleNode, Viewport } from '../../types/schema';
import { startPointerDrag } from '../../lib/drag';
import {
  MAX_GROUP_SCALE,
  MAX_NODE_SIZE,
  MIN_GROUP_SCALE,
  MIN_NODE_SIZE,
  centroid,
  clamp,
  degreesFromCenter,
  groupBaseBounds,
  groupPivot,
  normalizeDegrees,
  rotateOffset,
  rotatePoint,
  snapDegrees,
  worldToScreen,
  screenToWorld,
} from '../../lib/transform';

const HANDLE_SIZE = 12;
const ROTATE_OFFSET = 26;
const TRIANGLE_PIN_DISTANCE = 28;

interface HandlesLayerProps {
  node: ChildNode | GroupNode;
  viewport: Viewport;
  toLocal: (clientX: number, clientY: number) => Pt;
  pointer: Pt | null;
  onResize: (id: string, size: number) => void;
  onSetRotation: (id: string, degrees: number) => void;
  onSetGroupScale: (id: string, scale: number) => void;
  onSetGroupRotation: (id: string, degrees: number) => void;
  onSetVertex: (id: string, index: number, world: Pt) => void;
  onSetVertices: (id: string, vertices: [Pt, Pt, Pt]) => void;
}

export default function HandlesLayer({
  node,
  viewport,
  toLocal,
  pointer,
  onResize,
  onSetRotation,
  onSetGroupScale,
  onSetGroupRotation,
  onSetVertex,
  onSetVertices,
}: HandlesLayerProps) {
  if (node.kind === 'group') {
    return (
      <GroupHandles
        node={node}
        viewport={viewport}
        toLocal={toLocal}
        onSetGroupScale={onSetGroupScale}
        onSetGroupRotation={onSetGroupRotation}
      />
    );
  }

  if (node.kind === 'triangle') {
    return (
      <TriangleHandles
        node={node}
        viewport={viewport}
        toLocal={toLocal}
        pointer={pointer}
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

function GroupHandles({
  node,
  viewport,
  toLocal,
  onSetGroupScale,
  onSetGroupRotation,
}: {
  node: GroupNode;
  viewport: Viewport;
  toLocal: (clientX: number, clientY: number) => Pt;
  onSetGroupScale: (id: string, scale: number) => void;
  onSetGroupRotation: (id: string, degrees: number) => void;
}) {
  const base = groupBaseBounds(node);
  const center = worldToScreen(viewport, groupPivot(node));
  const halfW = (base.width * node.scale * viewport.scale) / 2;
  const halfH = (base.height * node.scale * viewport.scale) / 2;

  const startResize = () => (event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    const startScale = node.scale;
    const startHalfW = (base.width * startScale * viewport.scale) / 2;
    const startHalfH = (base.height * startScale * viewport.scale) / 2;
    startPointerDrag({
      event,
      onMove: (client) => {
        const local = toLocal(client.x, client.y);
        const rotated = rotateOffset({ x: local.x - center.x, y: local.y - center.y }, -node.rotation);
        const factor = Math.max(
          Math.abs(rotated.x) / Math.max(startHalfW, 1),
          Math.abs(rotated.y) / Math.max(startHalfH, 1)
        );
        onSetGroupScale(node.id, clamp(startScale * factor, MIN_GROUP_SCALE, MAX_GROUP_SCALE));
      },
    });
  };

  const startRotate = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    const startRotation = node.rotation;
    const startAngle = degreesFromCenter(center, toLocal(event.clientX, event.clientY));
    startPointerDrag({
      event,
      onMove: (client, native) => {
        const local = toLocal(client.x, client.y);
        let delta = degreesFromCenter(center, local) - startAngle;
        if (native.shiftKey) delta = snapDegrees(delta);
        onSetGroupRotation(node.id, normalizeDegrees(startRotation + delta));
      },
    });
  };

  const corners: Array<{ x: number; y: number }> = [
    { x: -halfW, y: -halfH },
    { x: halfW, y: -halfH },
    { x: halfW, y: halfH },
    { x: -halfW, y: halfH },
  ];

  const rotateHandleOffset = rotateOffset({ x: 0, y: -halfH - ROTATE_OFFSET }, node.rotation);

  return (
    <>
      <div
        className="sb-selection-frame"
        style={{
          position: 'absolute',
          left: center.x - halfW,
          top: center.y - halfH,
          width: halfW * 2,
          height: halfH * 2,
          transform: `rotate(${node.rotation}deg)`,
        }}
      />
      <svg className="sb-handles-svg" width="100%" height="100%">
        <line
          x1={center.x + rotateOffset({ x: 0, y: -halfH }, node.rotation).x}
          y1={center.y + rotateOffset({ x: 0, y: -halfH }, node.rotation).y}
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

function distance(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function nearestVertexIndex(vertices: Pt[], reference: Pt): number {
  let index = 0;
  let best = Number.POSITIVE_INFINITY;
  vertices.forEach((vertex, i) => {
    const value = distance(vertex, reference);
    if (value < best) {
      best = value;
      index = i;
    }
  });
  return index;
}

function outwardDirection(from: Pt, to: Pt): Pt {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length < 1e-6) return { x: 0, y: -1 };
  return { x: dx / length, y: dy / length };
}

function TriangleHandles({
  node,
  viewport,
  toLocal,
  pointer,
  onSetVertex,
  onSetVertices,
}: {
  node: TriangleNode;
  viewport: Viewport;
  toLocal: (clientX: number, clientY: number) => Pt;
  pointer: Pt | null;
  onSetVertex: (id: string, index: number, world: Pt) => void;
  onSetVertices: (id: string, vertices: [Pt, Pt, Pt]) => void;
}) {
  const [pinnedVertex, setPinnedVertex] = useState<number | null>(null);

  const screenVertices = node.vertices.map((v) => worldToScreen(viewport, v));
  const centerWorld = centroid(node.vertices);
  const centerScreen = worldToScreen(viewport, centerWorld);

  const anchorIndex = pinnedVertex ?? nearestVertexIndex(screenVertices, pointer ?? centerScreen);
  const anchor = screenVertices[anchorIndex];
  const direction = outwardDirection(centerScreen, anchor);
  const pin = {
    x: anchor.x + direction.x * TRIANGLE_PIN_DISTANCE,
    y: anchor.y + direction.y * TRIANGLE_PIN_DISTANCE,
  };

  const startVertexDrag = (index: number) => (event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    setPinnedVertex(index);
    startPointerDrag({
      event,
      onMove: (client) => {
        onSetVertex(node.id, index, screenToWorld(viewport, toLocal(client.x, client.y)));
      },
      onEnd: () => setPinnedVertex(null),
    });
  };

  const startRotate = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    setPinnedVertex(anchorIndex);
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
      onEnd: () => setPinnedVertex(null),
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
          x1={anchor.x}
          y1={anchor.y}
          x2={pin.x}
          y2={pin.y}
          stroke="#1677ff"
          strokeWidth={1}
        />
        <circle cx={centerScreen.x} cy={centerScreen.y} r={3} fill="#1677ff" />
      </svg>
      {screenVertices.map((vertex, index) => (
        <div
          key={index}
          className="sb-handle sb-handle--vertex"
          style={{ left: vertex.x - HANDLE_SIZE / 2, top: vertex.y - HANDLE_SIZE / 2 }}
          onPointerDown={startVertexDrag(index)}
        />
      ))}
      <div
        className="sb-handle sb-handle--rotate"
        style={{ left: pin.x - HANDLE_SIZE / 2, top: pin.y - HANDLE_SIZE / 2 }}
        onPointerDown={startRotate}
      />
    </>
  );
}
