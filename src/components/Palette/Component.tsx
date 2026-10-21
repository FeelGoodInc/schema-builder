'use client';

import type { DragEvent }              from 'react';
import { Button, ButtonToolbar }       from 'rsuite';
import type { NewNode }                from '@/types/schema';
import { useBuilderConfig, useSchema } from '@/state/schemaStore';
import { createNode }                  from '@/lib/nodes';
import { DROP_MIME }                   from './../SchemaCanvas';
import cns                             from 'classnames';
import {
  MdChangeHistory,
  MdCenterFocusStrong,
  MdLayers,
  MdLayersClear,
  MdDeleteSweep
}                                      from 'react-icons/md';
import styles                          from './schema-builder-palette.module.scss';

export const Palette = (): React.ReactNode => {
  const { state, dispatch } = useSchema();
  const config = useBuilderConfig();
  const items = config.current.availableItems;

  // ----------------------------------------------------------------------------

  const worldCenter = () => ({
    x: (state.viewportSize.width / 2 - state.viewport.tx) / state.viewport.scale,
    y: (state.viewportSize.height / 2 - state.viewport.ty) / state.viewport.scale,
  });

  // ----------------------------------------------------------------------------

  const itemSpec = (alias: string, defaultSize?: number): NewNode => ({
    kind: 'item',
    alias,
    x: 0,
    y: 0,
    ...(defaultSize ? { size: defaultSize } : {}),
  });

  // ----------------------------------------------------------------------------

  const triangleSpec = (): NewNode => ({ kind: 'triangle', x: 0, y: 0 });

  // ----------------------------------------------------------------------------

  const setPayload = (event: DragEvent<HTMLElement>, spec: NewNode) => {
    event.dataTransfer.setData(DROP_MIME, JSON.stringify(spec));
    event.dataTransfer.effectAllowed = 'copy';
  };

  // ----------------------------------------------------------------------------

  const addAtCenter = (spec: NewNode) => {
    const center = worldCenter();

    dispatch({ type: 'add-node', node: createNode({ ...spec, x: center.x, y: center.y }) });
  };

  // ----------------------------------------------------------------------------

  const selectedNodes = state.nodes.filter((node) => state.selectedIds.includes(node.id));
  const canGroup = selectedNodes.length >= 2 && selectedNodes.every((node) => node.kind !== 'group');
  const selectedGroup = selectedNodes.length === 1 && selectedNodes[0].kind === 'group' ? selectedNodes[0] : null;

  // ----------------------------------------------------------------------------

  return (
    <div className={styles.root}>
      <section className={styles.group}>
        <ButtonToolbar className={styles.row}>
          <Button
            title="Сгруппировать"
            size="sm"
            disabled={!canGroup}
            onClick={() => dispatch({ type: 'group-selected' })}
          >
            <MdLayers />
          </Button>

          <Button
            title="Разгруппировать"
            size="sm"
            disabled={!selectedGroup}
            onClick={() => selectedGroup && dispatch({ type: 'ungroup', id: selectedGroup.id })}
          >
            <MdLayersClear />
          </Button>

          <Button
            title="Вписать в холст"
            size="sm"
            onClick={() => dispatch({ type: 'fit' })}
          >
            <MdCenterFocusStrong/>
          </Button>

          <Button
            title="Очистить схему"
            size="sm"
            onClick={() => dispatch({ type: 'clear-nodes' })}
          >
            <MdDeleteSweep />
          </Button>
        </ButtonToolbar>
      </section>

      <div className={styles.divider} />

      <section className={cns(styles.group, styles.components)}>
        <div className={styles.row}>
          {
            config.current.canAddTriangle
              ? (
                <div
                  className={styles.component}
                  title="Треугольник"
                  draggable
                  onDragStart={(event) => setPayload(event, triangleSpec())}
                  onClick={() => addAtCenter(triangleSpec())}
                >
                  <MdChangeHistory />
                </div>
              )
              : null
          }

          {
            items.length === 0
              ? (
                <div className={styles.empty}>Нет доступных элементов</div>
              )
              : (
                items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.alias}
                      className={styles.component}
                      title={item.title}
                      draggable
                      onDragStart={(event) => setPayload(event, itemSpec(item.alias, item.defaultSize))}
                      onDoubleClick={() => addAtCenter(itemSpec(item.alias, item.defaultSize))}
                    >
                      {Icon ? <Icon size={24} /> : <span>{item.title}</span>}
                    </div>
                  );
                })
              )
          }
        </div>
      </section>
    </div>
  );
}
