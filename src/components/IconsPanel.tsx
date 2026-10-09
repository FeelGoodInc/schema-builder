'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, IconButton, Tabs, Tab, Input, VStack } from 'rsuite';
import { RiRefreshLine } from 'react-icons/ri';
import type { DragEvent } from 'react';
import type { IconLibKey, NewNode } from '@/types/schema';
import { ensureIconPack, getIconComponent, sampleIconNames } from '@/lib/iconsRegistry';
import { listRegisteredComponents } from '@/lib/componentRegistry';
import '@/lib/demoComponents';
import { useSchema } from '@/state/schemaStore';
import { createNode } from '@/lib/nodes';
import { DROP_MIME } from './SchemaCanvas';

const LIBS: IconLibKey[] = ['md', 'gi', 'tb'];
const PER_LIB = 20;

type IconItem = { lib: IconLibKey; name: string };

export default function IconsPanel() {
  const { state, dispatch } = useSchema();
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [items, setItems] = useState<IconItem[]>([]);
  const [query, setQuery] = useState('');
  const [ready, setReady] = useState(false);

  const sample = useCallback(async (nextSeed: number) => {
    await Promise.all(LIBS.map((lib) => ensureIconPack(lib)));
    return LIBS.flatMap((lib) =>
      sampleIconNames(lib, PER_LIB, nextSeed + LIBS.indexOf(lib) * 7919).map((name) => ({ lib, name }))
    );
  }, []);

  useEffect(() => {
    let active = true;
    void sample(seed).then((sampled) => {
      if (!active) return;
      setItems(sampled);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [seed, sample]);

  const visibleItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => item.name.toLowerCase().includes(needle));
  }, [items, query]);

  const components = useMemo(() => listRegisteredComponents(), []);

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
        <Tabs appearance="subtle" activeKey="icons">
          <Tab eventKey="icons" title="Иконки">
            <div className="sb-panel-controls">
              <Input
                size="sm"
                placeholder="Фильтр по имени"
                value={query}
                onChange={(value) => setQuery(value)}
              />
              <IconButton
                size="sm"
                icon={<RiRefreshLine />}
                onClick={() => setSeed(Math.floor(Math.random() * 1e9))}
              />
            </div>
            {!ready ? <div className="sb-panel-hint">Загрузка набора иконок…</div> : null}
            <div className="sb-icon-grid">
              {visibleItems.map((item) => {
                const Icon = getIconComponent(item.lib, item.name);
                return (
                  <div
                    key={`${item.lib}:${item.name}`}
                    className="sb-icon-tile"
                    title={item.name}
                    draggable
                    onDragStart={(event) =>
                      setPayload(event, { kind: 'icon', lib: item.lib, name: item.name, x: 0, y: 0 })
                    }
                    onDoubleClick={() =>
                      addAtCenter({ kind: 'icon', lib: item.lib, name: item.name, x: 0, y: 0 })
                    }
                  >
                    {Icon ? <Icon size={24} /> : null}
                  </div>
                );
              })}
            </div>
            <div className="sb-panel-hint">
              Перетащите иконку на холст или дважды кликните, чтобы добавить в центр.
            </div>
          </Tab>
          <Tab eventKey="components" title="Компоненты">
            <div className="sb-component-list">
              {components.map((meta) => (
                <div
                  key={meta.id}
                  className="sb-component-item"
                  draggable
                  onDragStart={(event) =>
                    setPayload(event, { kind: 'component', ref: meta.id, x: 0, y: 0 })
                  }
                  onDoubleClick={() => addAtCenter({ kind: 'component', ref: meta.id, x: 0, y: 0 })}
                >
                  {meta.title}
                </div>
              ))}
            </div>
            <div className="sb-panel-hint">
              Свои компоненты добавляются через registerComponent(id, Component, meta) в
              src/lib/componentRegistry.ts
            </div>
          </Tab>
        </Tabs>
        <Button size="sm" appearance="primary" onClick={() => dispatch({ type: 'clear-nodes' })}>
          Очистить узлы
        </Button>
      </VStack>
    </div>
  );
}
