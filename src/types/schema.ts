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
