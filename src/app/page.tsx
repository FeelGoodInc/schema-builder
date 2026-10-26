'use client';

import { useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import SchemaBuilderClient from '../components/SchemaBuilderClient';
import type { SchemaAvailableItem, SchemaCustomAction, SchemaItemData, SchemaItemProps } from '../components/SchemaBuilder/types/builder';
import type { SchemaDocument, SchemaNode } from '../components/SchemaBuilder/types/schema';
import { MdInfo, MdOutlineSensors } from "react-icons/md";
import { GiCctvCamera } from "react-icons/gi";
import { FaLocationDot, FaCircle } from 'react-icons/fa6'

function CounterCard({ size, item, updateCustomData }: SchemaItemProps) {
  const count = typeof item.customData.count === 'number' ? item.customData.count : 0;
  const stop = (event: ReactPointerEvent<HTMLButtonElement>) => event.stopPropagation();

  return (
    <div
      style={{
        width: size,
        height: size,
        border: '2px solid #1677ff',
        borderRadius: 8,
        background: 'rgba(22,119,255,0.08)',
        color: '#0d3a7a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        fontSize: Math.max(12, size * 0.22),
      }}
    >
      <span>{count}</span>
      <button
        type="button"
        onPointerDown={stop}
        onClick={() => updateCustomData({ ...item.customData, count: count + 1 })}
        style={{ fontSize: Math.max(10, size * 0.16) }}
      >
        +1
      </button>
    </div>
  );
}

const DEMO_ITEMS: SchemaAvailableItem[] = [
  {
    alias: 'sensor',
    title: 'Датчик',
    icon: MdOutlineSensors
  },
  {
    alias: 'marker',
    title: 'Маркер',
    icon: FaLocationDot,
  },
  {
    alias: 'dot',
    title: 'Круг',
    icon: FaCircle,
  },
  // {
  //   alias: 'counter',
  //   title: 'Счётчик',
  //   component: CounterCard,
  //   defaultSize: 96
  // },
  {
    alias: 'camera',
    title: 'Камера',
    icon: GiCctvCamera,
    onClick: (item) => console.log('[demo] item onClick', item.alias)
  },
];

const DEMO_ACTIONS: SchemaCustomAction[] = [
  {
    title: 'Логи схемы',
    icon: MdInfo,
    onClick: (context) => {
      console.log('[demo] schema action', {
        mode: context.mode,
        nodesCount: context.nodes.length,
        groupsCount: context.groups.length,
        selectedIds: context.selectedIds,
        selectedItems: context.selectedItems,
      });
    },
  },
];

const DEMO_DOCUMENT: SchemaDocument = {
  version: 5,
  nodes: [
    
  ],
  viewport: { scale: 1, tx: 0, ty: 0 },
};

export default function Home() {
  const [ schema, setSchema ] = useState<SchemaDocument>(DEMO_DOCUMENT);
  const [ acitveItem, setActiveItem ] = useState<SchemaItemData | null>(null);

  const handleItemClick = (item: SchemaItemData) => { setActiveItem(item) };

  return (
    <SchemaBuilderClient
      isEditable
      canAddTriangle
      availableItems={DEMO_ITEMS}
      activeItem={acitveItem}
      actions={DEMO_ACTIONS}
      customActions={<button>123</button>}
      onItemClick={handleItemClick}
      onChange={setSchema}
    />
  );
}
