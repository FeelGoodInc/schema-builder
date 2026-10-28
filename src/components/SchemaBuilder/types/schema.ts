export type Pt = { x: number; y: number };

export type Viewport = { scale: number; tx: number; ty: number };

export type EditorMode = 'edit' | 'view';

export type CustomData = Record<string, unknown>;

export interface NodeBase {
  id: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
}

export interface ItemNode extends NodeBase {
  kind: 'item';
  alias: string;
  customData?: CustomData;
  color?: string;
  flipX?: boolean;
  flipY?: boolean;
}

export interface TriangleNode {
  id: string;
  kind: 'triangle';
  vertices: [Pt, Pt, Pt];
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export type ChildNode = ItemNode | TriangleNode;

export interface GroupNode {
  id: string;
  kind: 'group';
  alias?: string;
  children: ChildNode[];
  scale: number;
  rotation: number;
}

export type SchemaNode = ChildNode | GroupNode;

export interface SchemaDocument {
  version: 5;
  nodes: SchemaNode[];
  viewport: Viewport;
}

export interface BackgroundImage {
  src: string;
  width: number;
  height: number;
  name: string;
}

export type NewNode =
  | { kind: 'item'; alias: string; x: number; y: number; size?: number }
  | { kind: 'triangle'; x: number; y: number };

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
