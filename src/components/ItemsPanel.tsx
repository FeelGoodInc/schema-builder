'use client';

import { useState } from 'react';
import { Button, Input, VStack } from 'rsuite';
import type { DragEvent } from 'react';
import type { NewNode } from '@/types/schema';
import { useBuilderConfig, useSchema } from '@/state/schemaStore';
import { createNode } from '@/lib/nodes';
import { DROP_MIME } from './SchemaCanvas';

export default function ItemsPanel() {
  const { state, dispatch } = useSchema();
  const config = useBuilderConfig();
  const [query, setQuery] = useState('');

  const needle = query.trim().toLowerCase();
  const items = needle
    ? config.current.availableItems.filter(
        (item) => item.title.toLowerCase().includes(needle) || item.alias.toLowerCase().includes(needle)
      )
    : config.current.availableItems;

  const specOf = (alias: string, defaultSize?: number): NewNode => ({
    kind: 'item',
    alias,
    x: 0,
    y: 0,
    ...(defaultSize ? { size: defaultSize } : {}),
  });

  const setPayload = (event: DragEvent<HTMLElement>, spec: NewNode) => {
    event.dataTransfer.setData(DROP_MIME, JSON.stringify(spec));
    event.dataTransfer.effectAllowed = 'copy';
  };

  const addAtCenter = (spec: NewNode) => {
    const center = {
      x: (state.viewportSize.width / 2 - state.viewport.tx) / state.viewport.scale,
      y: (state.viewportSize.height / 2 - state.viewport.ty) / state.viewport.scale,
    };
    dispatch({ type: 'add-node', node: createNode({ ...spec, x: center.x, y: center.y }) });
  };

  return (
    <div className="sb-panel">
      <VStack spacing={10}>
        <div className="sb-panel-controls">
          <Input
            size="sm"
            placeholder="Фильтр по названию"
            value={query}
            onChange={(value) => setQuery(value)}
          />
        </div>
        {items.length === 0 ? (
          <div className="sb-panel-hint">Нет доступных элементов</div>
        ) : (
          <div className="sb-icon-grid">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.alias}
                  className={Icon ? 'sb-icon-tile' : 'sb-icon-tile sb-icon-tile--text'}
                  title={`${item.title} (${item.alias})`}
                  draggable
                  onDragStart={(event) => setPayload(event, specOf(item.alias, item.defaultSize))}
                  onDoubleClick={() => addAtCenter(specOf(item.alias, item.defaultSize))}
                >
                  {Icon ? <Icon size={24} /> : <span>{item.title}</span>}
                </div>
              );
            })}
          </div>
        )}
        <div className="sb-panel-hint">
          Перетащите элемент на холст или дважды кликните, чтобы добавить в центр.
        </div>
        <Button size="sm" appearance="primary" onClick={() => dispatch({ type: 'clear-nodes' })}>
          Очистить узлы
        </Button>
      </VStack>
    </div>
  );
}
