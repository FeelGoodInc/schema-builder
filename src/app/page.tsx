'use client';

import { useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { FaPlus } from 'react-icons/fa6';
import SchemaBuilderClient from '@/components/SchemaBuilderClient';
import type { SchemaAvailableItem, SchemaItemData, SchemaItemProps } from '@/types/builder';
import type { SchemaDocument } from '@/types/schema';

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
  { alias: 'plus', title: 'Плюс', icon: FaPlus },
  { alias: 'counter', title: 'Счётчик', component: CounterCard, defaultSize: 96 },
  { alias: 'signal', title: 'Сигнал без иконки', onClick: (item) => console.log('[demo] item onClick', item.alias) },
];

const DEMO_DOCUMENT: SchemaDocument = {
  version: 5,
  nodes: [
    { id: 'demo-plus', kind: 'item', alias: 'plus', x: 260, y: 220, size: 56, rotation: 0 },
    {
      id: 'demo-counter',
      kind: 'item',
      alias: 'counter',
      x: 420,
      y: 240,
      size: 96,
      rotation: 0,
      customData: { count: 1 },
    },
  ],
  viewport: { scale: 1, tx: 0, ty: 0 },
};

const handleItemClick = (item: SchemaItemData) => console.log('[demo] click', item.alias, item.customData);

export default function Home() {
  const [schema, setSchema] = useState<SchemaDocument>(DEMO_DOCUMENT);

  return (
    <SchemaBuilderClient
      data={schema}
      onChange={setSchema}
      backgroundImage="/demo-plan.svg"
      canAddTriangle
      availableItems={DEMO_ITEMS}
      onItemClick={handleItemClick}
    />
  );
}
