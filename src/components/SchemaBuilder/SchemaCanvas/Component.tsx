'use client';

import {
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
}                          from 'react';
import type {
  NewNode,
  Pt,
  SchemaNode
}                          from '../types/schema';
import {
  useBuilderConfig,
  useSchema
}                          from '../state/schemaStore';
import { itemDataOf }      from '../lib/itemData';
import { createNode }      from '../lib/nodes';
import {
  anchorOf,
  screenToWorld,
  translateNode
}                          from '../lib/transform';
import {
  type DragSession,
  startPointerDrag,
}                          from '../lib/drag';
import NodeView, {
  type ActivateModifiers
}                          from './NodeView';
import HandlesLayer        from './HandlesLayer';
import SelectionLayer      from './SelectionLayer';
import cns                 from 'classnames';
import styles              from './sb-canvas.module.scss';

export const DROP_MIME = 'application/x-schema-node';
const ZOOM_STEP = 1.12;

export default function SchemaCanvas() {
  const { state, dispatch, updateCustomData } = useSchema();
  const config = useBuilderConfig();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panMovedRef = useRef(false);
  const panSessionRef = useRef<DragSession | null>(null);
  const [panning, setPanning] = useState(false);

  const toLocal = useCallback((clientX: number, clientY: number): Pt => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: clientX, y: clientY };
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const selectedNodes = useMemo(
    () => state.nodes.filter((node) => state.selectedIds.includes(node.id)),
    [state.nodes, state.selectedIds]
  );
  const primarySelected = selectedNodes.length === 1 ? selectedNodes[0] : null;
  const selectedTriangleId = useMemo(() => {
    if (state.mode !== 'edit' || selectedNodes.length !== 1) return null;
    return selectedNodes[0].kind === 'triangle' ? selectedNodes[0].id : null;
  }, [selectedNodes, state.mode]);

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

  const [pointer, setPointer] = useState<Pt | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || !selectedTriangleId) return;
    const handlePointerMove = (event: PointerEvent) => {
      setPointer(toLocal(event.clientX, event.clientY));
    };
    element.addEventListener('pointermove', handlePointerMove);
    return () => element.removeEventListener('pointermove', handlePointerMove);
  }, [selectedTriangleId, toLocal]);

  useEffect(() => {
    panMovedRef.current = false;
  }, [state.mode]);

  const moveNode = useCallback(
    (id: string, anchor: Pt) => {
      dispatch({
        type: 'update-node',
        id,
        mutate: (node) => {
          const current = anchorOf(node);
          return translateNode(node, anchor.x - current.x, anchor.y - current.y);
        },
      });
    },
    [dispatch]
  );

  const activateNode = useCallback(
    (node: SchemaNode, modifiers: ActivateModifiers) => {
      if (state.mode === 'edit') {
        if (modifiers.shiftKey || modifiers.ctrlKey || modifiers.metaKey) {
          dispatch({ type: 'toggle-select', id: node.id });
        } else {
          dispatch({ type: 'select', ids: [node.id] });
        }
        return;
      }
      if (panMovedRef.current) {
        panMovedRef.current = false;
        return;
      }
      const itemData = itemDataOf(node);
      const handler = config.current.onItemClick ?? config.findItem(itemData.alias)?.onClick;
      handler?.(itemData);
    },
    [config, dispatch, state.mode]
  );

  const handleCanvasPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.button !== 1) return;

    const target = event.target as Element;
    if (target.closest('.sb-handle')) return;
    if (state.mode === 'edit' && target.closest('.sb-node')) return;

    if (event.button === 1) event.preventDefault();
    event.stopPropagation();

    panMovedRef.current = false;
    setPanning(true);

    const start = toLocal(event.clientX, event.clientY);
    let previous = start;
    panSessionRef.current = startPointerDrag({
      event,
      capture: false,
      onMove: (client) => {
        const current = toLocal(client.x, client.y);
        dispatch({ type: 'pan', delta: { x: current.x - previous.x, y: current.y - previous.y } });
        previous = current;
      },
      onEnd: ({ moved }) => {
        setPanning(false);
        panMovedRef.current = moved;
        panSessionRef.current = null;
        if (!moved && state.mode === 'edit') {
          dispatch({ type: 'select', ids: [] });
        }
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

  const background = state.background;
  const world = background
    ? { width: background.width, height: background.height }
    : { width: state.viewportSize.width || 1200, height: state.viewportSize.height || 800 };
  const editable = state.mode === 'edit';
  const showSelectionLayer = editable && selectedNodes.length > 1;
  const showHandles = editable && !!primarySelected;

  return (
    <div
      ref={containerRef}
      className={cns(styles.root, {
        [styles.panning]: panning,
      })}
      onPointerDown={handleCanvasPointerDown}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <svg className={styles.layer} width="100%" height="100%">
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
          className={styles.hit}
        />
      </svg>

      <div
        className={styles.nodes_layer}
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
            onUpdateCustomData={updateCustomData}
          />
        ))}
      </div>

      {showSelectionLayer || showHandles ? (
        <div className={cns(styles.layer, styles.handles_layer)}>
          {showSelectionLayer ? <SelectionLayer nodes={selectedNodes} viewport={state.viewport} /> : null}
          {showHandles && primarySelected ? (
          <HandlesLayer
            node={primarySelected}
            viewport={state.viewport}
            toLocal={toLocal}
            pointer={pointer}
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
            onSetGroupScale={(id, scale) =>
              dispatch({
                type: 'update-node',
                id,
                mutate: (node) => (node.kind === 'group' ? { ...node, scale } : node),
              })
            }
            onSetGroupRotation={(id, rotation) =>
              dispatch({
                type: 'update-node',
                id,
                mutate: (node) => (node.kind === 'group' ? { ...node, rotation } : node),
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
          ) : null}
        </div>
      ) : null}

      <div className={styles.hud}>
        {Math.round(state.viewport.scale * 100)}%
      </div>
    </div>
  );
}
