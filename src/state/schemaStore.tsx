'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';
import type {
  BackgroundImage,
  EditorMode,
  Pt,
  SchemaDocument,
  SchemaNode,
  Viewport,
} from '@/types/schema';
import { clampScale, fitViewport, panBy, rotatePoint, zoomAtPoint } from '@/lib/transform';

export interface SchemaState {
  mode: EditorMode;
  nodes: SchemaNode[];
  viewport: Viewport;
  background: BackgroundImage | null;
  selectedId: string | null;
  viewportSize: { width: number; height: number };
}

export type SchemaAction =
  | { type: 'set-mode'; mode: EditorMode }
  | { type: 'set-viewport-size'; width: number; height: number }
  | { type: 'set-viewport'; viewport: Viewport }
  | { type: 'fit' }
  | { type: 'zoom'; focus: Pt; factor: number }
  | { type: 'pan'; delta: Pt }
  | { type: 'add-node'; node: SchemaNode }
  | { type: 'update-node'; id: string; mutate: (node: SchemaNode) => SchemaNode }
  | { type: 'remove-node'; id: string }
  | { type: 'select'; id: string | null }
  | { type: 'reorder'; id: string; to: 'front' | 'back' }
  | { type: 'set-background'; background: BackgroundImage | null }
  | { type: 'import'; document: SchemaDocument }
  | { type: 'clear-nodes' };

export const initialState: SchemaState = {
  mode: 'edit',
  nodes: [],
  viewport: { scale: 1, tx: 0, ty: 0 },
  background: null,
  selectedId: null,
  viewportSize: { width: 0, height: 0 },
};

export function worldSizeOf(state: SchemaState): { width: number; height: number } {
  if (state.background) return { width: state.background.width, height: state.background.height };
  return { width: state.viewportSize.width || 1200, height: state.viewportSize.height || 800 };
}

function reducer(state: SchemaState, action: SchemaAction): SchemaState {
  switch (action.type) {
    case 'set-mode':
      return { ...state, mode: action.mode, selectedId: null };

    case 'set-viewport-size':
      if (state.viewportSize.width === action.width && state.viewportSize.height === action.height) {
        return state;
      }
      return { ...state, viewportSize: { width: action.width, height: action.height } };

    case 'set-viewport':
      return { ...state, viewport: { ...action.viewport, scale: clampScale(action.viewport.scale) } };

    case 'fit':
      return { ...state, viewport: fitViewport(state.viewportSize, worldSizeOf(state)) };

    case 'zoom':
      return { ...state, viewport: zoomAtPoint(state.viewport, action.focus, action.factor) };

    case 'pan':
      return { ...state, viewport: panBy(state.viewport, action.delta) };

    case 'add-node':
      return { ...state, nodes: [...state.nodes, action.node], selectedId: action.node.id };

    case 'update-node': {
      let changed = false;
      const nodes = state.nodes.map((node) => {
        if (node.id !== action.id) return node;
        changed = true;
        return action.mutate(node);
      });
      return changed ? { ...state, nodes } : state;
    }

    case 'remove-node':
      return {
        ...state,
        nodes: state.nodes.filter((node) => node.id !== action.id),
        selectedId: state.selectedId === action.id ? null : state.selectedId,
      };

    case 'select':
      return { ...state, selectedId: action.id };

    case 'reorder': {
      const node = state.nodes.find((item) => item.id === action.id);
      if (!node) return state;
      const rest = state.nodes.filter((item) => item.id !== action.id);
      return { ...state, nodes: action.to === 'front' ? [...rest, node] : [node, ...rest] };
    }

    case 'set-background':
      return { ...state, background: action.background };

    case 'import':
      return {
        ...state,
        nodes: action.document.nodes,
        viewport: { ...action.document.viewport, scale: clampScale(action.document.viewport.scale) },
        selectedId: null,
      };

    case 'clear-nodes':
      return { ...state, nodes: [], selectedId: null };

    default:
      return state;
  }
}

export function createNodeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `n_${Math.random().toString(36).slice(2, 12)}`;
}

interface SchemaContextValue {
  state: SchemaState;
  dispatch: Dispatch<SchemaAction>;
  rotatePolygon: (id: string, radians: number) => void;
}

const SchemaContext = createContext<SchemaContextValue | null>(null);

export function SchemaProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const rotatePolygon = useCallback(
    (id: string, radians: number) => {
      dispatch({
        type: 'update-node',
        id,
        mutate: (node) => {
          if (node.kind !== 'triangle') return node;
          const center = {
            x: (node.vertices[0].x + node.vertices[1].x + node.vertices[2].x) / 3,
            y: (node.vertices[0].y + node.vertices[1].y + node.vertices[2].y) / 3,
          };
          const vertices = node.vertices.map((v) => rotatePoint(v, center, radians)) as [Pt, Pt, Pt];
          return { ...node, vertices };
        },
      });
    },
    [dispatch]
  );

  const value = useMemo(() => ({ state, dispatch, rotatePolygon }), [state, dispatch, rotatePolygon]);
  return <SchemaContext.Provider value={value}>{children}</SchemaContext.Provider>;
}

export function useSchema(): SchemaContextValue {
  const ctx = useContext(SchemaContext);
  if (!ctx) throw new Error('useSchema must be used within SchemaProvider');
  return ctx;
}
