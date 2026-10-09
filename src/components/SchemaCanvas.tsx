'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { DragEvent, PointerEvent as ReactPointerEvent } from 'react';
import type { NewNode, Pt, SchemaNode } from '@/types/schema';
import { useSchema } from '@/state/schemaStore';
import { createNode } from '@/lib/nodes';
import { centroid, screenToWorld } from '@/lib/transform';
import { startPointerDrag } from '@/lib/drag';
import NodeView from './NodeView';
import HandlesLayer from './HandlesLayer';

const DROP_MIME = 'application/x-schema-node';
const ZOOM_STEP = 1.12;

export default function SchemaCanvas() {
  const { state, dispatch } = useSchema();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const toLocal = useCallback((clientX: number, clientY: number): Pt => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: clientX, y: clientY };
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      dispatch({
        type: 'set-viewport-size',
        width: Math.round(entry.contentRect.width),
        height: Math.round(entry.contentRect.height),
      });
    });
    observer.observe(element);

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const factor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      dispatch({ type: 'zoom', focus: toLocal(event.clientX, event.clientY), factor });
    };
    element.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      observer.disconnect();
      element.removeEventListener('wheel', handleWheel);
    };
  }, [dispatch, toLocal]);

  const moveNode = useCallback(
    (id: string, anchor: Pt) => {
      dispatch({
        type: 'update-node',
        id,
        mutate: (node) => {
          if (node.kind === 'triangle') {
            const current = centroid(node.vertices);
            const dx = anchor.x - current.x;
            const dy = anchor.y - current.y;
            return {
              ...node,
              vertices: node.vertices.map((v) => ({ x: v.x + dx, y: v.y + dy })) as [Pt, Pt, Pt],
            };
          }
          return { ...node, x: anchor.x, y: anchor.y };
        },
      });
    },
    [dispatch]
  );

  const activateNode = useCallback(
    (node: SchemaNode) => {
      if (state.mode === 'edit') {
        dispatch({ type: 'select', id: node.id });
        return;
      }
      console.log('[schema:view]', node);
    },
    [dispatch, state.mode]
  );

  const handleBackgroundPointerDown = (event: ReactPointerEvent<SVGRectElement>) => {
    const panEnabled = event.button === 1 || (event.button === 0 && event.altKey);
    if (!panEnabled) {
      dispatch({ type: 'select', id: null });
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const start = toLocal(event.clientX, event.clientY);
    let previous = start;
    startPointerDrag({
      event,
      onMove: (client) => {
        const current = toLocal(client.x, client.y);
        dispatch({ type: 'pan', delta: { x: current.x - previous.x, y: current.y - previous.y } });
        previous = current;
      },
    });
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (state.mode !== 'edit') return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    if (state.mode !== 'edit') return;
    event.preventDefault();
    const raw = event.dataTransfer.getData(DROP_MIME);
    if (!raw) return;
    try {
      const spec = JSON.parse(raw) as NewNode;
      const world = screenToWorld(state.viewport, toLocal(event.clientX, event.clientY));
      dispatch({ type: 'add-node', node: createNode({ ...spec, x: world.x, y: world.y }) });
    } catch {
      console.warn('[schema] unsupported drop payload');
    }
  };

  const selectedNode = state.nodes.find((node) => node.id === state.selectedId) ?? null;
  const background = state.background;
  const world = background
    ? { width: background.width, height: background.height }
    : { width: state.viewportSize.width || 1200, height: state.viewportSize.height || 800 };
  const editable = state.mode === 'edit';

  return (
    <div
      ref={containerRef}
      className="sb-canvas"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <svg className="sb-canvas-layer" width="100%" height="100%">
        <defs>
          <pattern id="sb-grid" width={40} height={40} patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#d9dee7" strokeWidth={1} />
          </pattern>
        </defs>
        <g transform={`translate(${state.viewport.tx},${state.viewport.ty}) scale(${state.viewport.scale})`}>
          {background ? (
            <image
              href={background.src}
              x={0}
              y={0}
              width={background.width}
              height={background.height}
              preserveAspectRatio="none"
            />
          ) : (
            <rect x={0} y={0} width={world.width} height={world.height} fill="url(#sb-grid)" />
          )}
        </g>
        <rect
          x={0}
          y={0}
          width="100%"
          height="100%"
          fill="transparent"
          style={{ cursor: 'default' }}
          onPointerDown={handleBackgroundPointerDown}
        />
      </svg>

      <div
        className="sb-nodes-layer"
        style={{
          transform: `matrix(${state.viewport.scale},0,0,${state.viewport.scale},${state.viewport.tx},${state.viewport.ty})`,
        }}
      >
        {state.nodes.map((node) => (
          <NodeView
            key={node.id}
            node={node}
            viewport={state.viewport}
            editable={editable}
            toLocal={toLocal}
            onMoveAnchor={moveNode}
            onActivate={activateNode}
          />
        ))}
      </div>

      {editable && selectedNode ? (
        <div className="sb-canvas-layer sb-handles-layer">
          <HandlesLayer
            node={selectedNode}
            viewport={state.viewport}
            toLocal={toLocal}
            onResize={(id, size) =>
              dispatch({
                type: 'update-node',
                id,
                mutate: (node) => (node.kind === 'triangle' ? node : { ...node, size }),
              })
            }
            onSetRotation={(id, rotation) =>
              dispatch({
                type: 'update-node',
                id,
                mutate: (node) => (node.kind === 'triangle' ? node : { ...node, rotation }),
              })
            }
            onSetVertex={(id, index, worldPoint) =>
              dispatch({
                type: 'update-node',
                id,
                mutate: (node) =>
                  node.kind === 'triangle'
                    ? {
                        ...node,
                        vertices: node.vertices.map((v, i) =>
                          i === index ? worldPoint : v
                        ) as [Pt, Pt, Pt],
                      }
                    : node,
              })
            }
            onSetVertices={(id, vertices) =>
              dispatch({
                type: 'update-node',
                id,
                mutate: (node) => (node.kind === 'triangle' ? { ...node, vertices } : node),
              })
            }
          />
        </div>
      ) : null}

      <div className="sb-canvas-hud">масштаб {Math.round(state.viewport.scale * 100)}%</div>
    </div>
  );
}

export { DROP_MIME };
