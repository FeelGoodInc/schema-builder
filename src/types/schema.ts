export type Pt = { x: number; y: number };

export type Viewport = { scale: number; tx: number; ty: number };

export type EditorMode = 'edit' | 'view';

export type IconLibKey = 'md' | 'gi' | 'tb';

export interface NodeBase {
  id: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
}

export interface IconNode extends NodeBase {
  kind: 'icon';
  lib: IconLibKey;
  name: string;
}

export interface CustomComponentNode extends NodeBase {
  kind: 'component';
  ref: string;
}

export interface TriangleNode {
  id: string;
  kind: 'triangle';
  vertices: [Pt, Pt, Pt];
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export type ChildNode = IconNode | CustomComponentNode | TriangleNode;

export interface GroupNode {
  id: string;
  kind: 'group';
  children: ChildNode[];
}

export type SchemaNode = ChildNode | GroupNode;

export interface SchemaDocument {
  version: 3;
  nodes: SchemaNode[];
  viewport: Viewport;
}

export interface BackgroundImage {
  src: string;
  width: number;
  height: number;
  name: string;
}

export type IconDescriptor = { lib: IconLibKey; name: string };

export type NewNode =
  | { kind: 'icon'; lib: IconLibKey; name: string; x: number; y: number }
  | { kind: 'component'; ref: string; x: number; y: number }
  | { kind: 'triangle'; x: number; y: number };
