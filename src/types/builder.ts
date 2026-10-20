import type { ComponentType } from 'react';
import type { IconType } from 'react-icons';
import type { CustomData, SchemaDocument, SchemaNode } from './schema';

export interface SchemaItemData {
  alias: string;
  id: string;
  kind: SchemaNode['kind'];
  x: number;
  y: number;
  size: number;
  rotation: number;
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

export interface SchemaBuilderConfig {
  availableItems: SchemaAvailableItem[];
  onItemClick?: (item: SchemaItemData) => void;
  onChange?: (document: SchemaDocument) => void;
  canAddTriangle: boolean;
}

export interface SchemaBuilderProps {
  data?: SchemaDocument;
  backgroundImage?: string;
  canAddTriangle?: boolean;
  availableItems?: SchemaAvailableItem[];
  onItemClick?: (item: SchemaItemData) => void;
  onChange?: (document: SchemaDocument) => void;
}
