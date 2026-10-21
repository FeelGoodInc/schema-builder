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
  ChildNode,
  CustomData,
  EditorMode,
  GroupNode,
  Pt,
  SchemaDocument,
  SchemaNode,
  Viewport,
} from '@/types/schema';
import type { SchemaAvailableItem, SchemaBuilderConfig } from '@/types/builder';
import {
  bakeGroupTransform,
  clampScale,
  fitViewport,
  panBy,
  rotatePoint,
  zoomAtPoint,
} from '@/lib/transform';

export interface SchemaState {
  mode: EditorMode;
  nodes: SchemaNode[];
  viewport: Viewport;
  background: BackgroundImage | null;
  selectedIds: string[];
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
  | { type: 'remove-selected' }
  | { type: 'select'; ids: string[] }
  | { type: 'toggle-select'; id: string }
  | { type: 'group-selected' }
  | { type: 'ungroup'; id: string }
  | { type: 'reorder'; id: string; to: 'front' | 'back' }
  | { type: 'set-background'; background: BackgroundImage | null }
  | { type: 'import'; document: SchemaDocument }
  | { type: 'clear-nodes' };

export const initialState: SchemaState = {
  mode: 'edit',
  nodes: [],
  viewport: { scale: 1, tx: 0, ty: 0 },
  background: null,
  selectedIds: [],
  viewportSize: { width: 0, height: 0 },
};

export function worldSizeOf(state: SchemaState): { width: number; height: number } {
  if (state.background) return { width: state.background.width, height: state.background.height };
  return { width: state.viewportSize.width || 1200, height: state.viewportSize.height || 800 };
}

function reducer(state: SchemaState, action: SchemaAction): SchemaState {
  switch (action.type) {
    case 'set-mode':
      return { ...state, mode: action.mode, selectedIds: [] };

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
      return { ...state, nodes: [...state.nodes, action.node], selectedIds: [action.node.id] };

    case 'update-node': {
      let changed = false;
      const nodes = state.nodes.map((node) => {
        if (node.id !== action.id) return node;
        changed = true;
        return action.mutate(node);
      });
      return changed ? { ...state, nodes } : state;
    }

    case 'remove-node': {
      const nodes = state.nodes.filter((node) => node.id !== action.id);
      return {
        ...state,
        nodes,
        selectedIds: state.selectedIds.filter((id) => nodes.some((node) => node.id === id)),
      };
    }

    case 'remove-selected': {
      const selected = new Set(state.selectedIds);
      return { ...state, nodes: state.nodes.filter((node) => !selected.has(node.id)), selectedIds: [] };
    }

    case 'select': {
      const ids = action.ids.filter((id) => state.nodes.some((node) => node.id === id));
      return { ...state, selectedIds: Array.from(new Set(ids)) };
    }

    case 'toggle-select': {
      if (!state.nodes.some((node) => node.id === action.id)) return state;
      const selectedIds = state.selectedIds.includes(action.id)
        ? state.selectedIds.filter((id) => id !== action.id)
        : [...state.selectedIds, action.id];
      return { ...state, selectedIds };
    }

    case 'group-selected': {
      const selected = new Set(state.selectedIds);
      const selectedNodes = state.nodes.filter((node) => selected.has(node.id));
      if (selectedNodes.length !== selected.size || selectedNodes.length < 2) return state;
      if (selectedNodes.some((node) => node.kind === 'group')) return state;

      const insertAt = Math.min(
        ...state.nodes.reduce<number[]>((acc, node, index) => (selected.has(node.id) ? [...acc, index] : acc), [])
      );
      const group: GroupNode = {
        id: createNodeId(),
        kind: 'group',
        children: selectedNodes as ChildNode[],
        scale: 1,
        rotation: 0,
      };
      const nodes = state.nodes.filter((node) => !selected.has(node.id));
      nodes.splice(insertAt, 0, group);
      return { ...state, nodes, selectedIds: [group.id] };
    }

    case 'ungroup': {
      const index = state.nodes.findIndex((node) => node.id === action.id && node.kind === 'group');
      if (index < 0) return state;
      const group = state.nodes[index] as GroupNode;
      const nodes = [
        ...state.nodes.slice(0, index),
        ...bakeGroupTransform(group),
        ...state.nodes.slice(index + 1),
      ];
      return { ...state, nodes, selectedIds: group.children.map((node) => node.id) };
    }

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
        selectedIds: [],
      };

    case 'clear-nodes':
      return { ...state, nodes: [], selectedIds: [] };

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
  updateCustomData: (id: string, customData: CustomData) => void;
}

const SchemaContext = createContext<SchemaContextValue | null>(null);

export interface SchemaProviderProps {
  document?: SchemaDocument | null;
  background?: BackgroundImage | null;
  mode?: EditorMode;
  children: ReactNode;
}

type InitialSchemaInput = Pick<SchemaProviderProps, 'document' | 'background' | 'mode'>;

function createInitialState(props: InitialSchemaInput): SchemaState {
  const document = props.document ?? null;
  return {
    ...initialState,
    mode: props.mode ?? initialState.mode,
    nodes: document?.nodes ?? [],
    viewport: document
      ? { ...document.viewport, scale: clampScale(document.viewport.scale) }
      : initialState.viewport,
    background: props.background ?? null,
  };
}

export function SchemaProvider({ document, background, mode, children }: SchemaProviderProps) {
  const [state, dispatch] = useReducer(reducer, { document, background, mode }, createInitialState);

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

  const updateCustomData = useCallback(
    (id: string, customData: CustomData) => {
      dispatch({
        type: 'update-node',
        id,
        mutate: (node) => (node.kind === 'item' ? { ...node, customData } : node),
      });
    },
    [dispatch]
  );

  const value = useMemo(
    () => ({ state, dispatch, rotatePolygon, updateCustomData }),
    [state, dispatch, rotatePolygon, updateCustomData]
  );
  return <SchemaContext.Provider value={value}>{children}</SchemaContext.Provider>;
}

export function useSchema(): SchemaContextValue {
  const ctx = useContext(SchemaContext);
  if (!ctx) throw new Error('useSchema must be used within SchemaProvider');
  return ctx;
}

export interface BuilderConfigHandle {
  readonly current: SchemaBuilderConfig;
  findItem: (alias: string) => SchemaAvailableItem | undefined;
}

const BuilderConfigContext = createContext<BuilderConfigHandle | null>(null);

export function BuilderConfigProvider({ config, children }: { config: SchemaBuilderConfig; children: ReactNode }) {
  const handle = useMemo<BuilderConfigHandle>(
    () => ({
      current: config,
      findItem: (alias: string) => config.availableItems.find((item) => item.alias === alias),
    }),
    [config]
  );

  return <BuilderConfigContext.Provider value={handle}>{children}</BuilderConfigContext.Provider>;
}

export function useBuilderConfig(): BuilderConfigHandle {
  const ctx = useContext(BuilderConfigContext);
  if (!ctx) throw new Error('useBuilderConfig must be used within BuilderConfigProvider');
  return ctx;
}
