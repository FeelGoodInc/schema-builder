import type { ComponentType, Dispatch } from 'react';
import type { IconType } from 'react-icons';
import type {
  BackgroundImage,
  CustomData,
  EditorMode,
  GroupNode,
  SchemaAction,
  SchemaDocument,
  SchemaNode,
  Viewport,
} from './schema';

export interface SchemaItemData {
  alias: string;
  id: string;
  kind: SchemaNode['kind'];
  x: number;
  y: number;
  size: number;
  rotation: number;
  color?: string;
  flipX: boolean;
  flipY: boolean;
  customData: CustomData;
  node: SchemaNode;
}

export interface SchemaItemProps {
  size: number;
  item: SchemaItemData;
  updateCustomData: (next: CustomData) => void;
}

export interface SchemaAvailableItem {
  title: string;
  alias: string;
  icon?: IconType;
  component?: ComponentType<SchemaItemProps>;
  defaultSize?: number;
  onClick?: (item: SchemaItemData) => void;
}

export interface SchemaCustomActionContext {
  mode: EditorMode;
  document: SchemaDocument;
  nodes: SchemaNode[];
  groups: GroupNode[];
  selectedIds: string[];
  selectedNodes: SchemaNode[];
  selectedGroups: GroupNode[];
  selectedItems: SchemaItemData[];
  viewport: Viewport;
  viewportSize: { width: number; height: number };
  background: BackgroundImage | null;
  availableItems: SchemaAvailableItem[];
  canAddTriangle: boolean;
  findItem: (alias: string) => SchemaAvailableItem | undefined;
  dispatch: Dispatch<SchemaAction>;
}

export interface SchemaCustomAction {
  title: string;
  icon?: IconType;
  onClick: (context: SchemaCustomActionContext) => void;
}

export interface SchemaBuilderConfig {
  availableItems: SchemaAvailableItem[];
  actions: SchemaCustomAction[];
  onItemClick?: (item: SchemaItemData) => void;
  onChange?: (document: SchemaDocument) => void;
  canAddTriangle: boolean;
}

export interface SchemaBuilderProps {
  /** Начальный режим: true — редактирование, false — просмотр. Переключение кнопками в тулбаре доступно всегда. */
  isEditable?: boolean;
  data?: SchemaDocument;
  backgroundImage?: string;
  canAddTriangle?: boolean;
  availableItems?: SchemaAvailableItem[];
  actions?: SchemaCustomAction[];
  onItemClick?: (item: SchemaItemData) => void;
  onChange?: (document: SchemaDocument) => void;
}
