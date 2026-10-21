'use client';
import type {
  SchemaNode,
  TriangleNode
}                           from '../types/schema';
import {
  Button,
  ButtonToolbar,
  NumberInput,
  Panel,
  VStack
}                           from 'rsuite';
import { useSchema }        from '../state/schemaStore';
import {
  MAX_GROUP_SCALE,
  MAX_NODE_SIZE,
  MIN_GROUP_SCALE,
  MIN_NODE_SIZE
}                           from '../lib/transform';
import {
  DEFAULT_ITEM_COLOR,
  DEFAULT_TRIANGLE_FILL,
  DEFAULT_TRIANGLE_STROKE
}                           from '../lib/color';
import ColorSwatchField     from './ColorSwatchField';
import styles               from './sb-node-inspector.module.scss';

export default function NodeInspector() {
  const { state, dispatch } = useSchema();
  const selectedNodes = state.nodes.filter((item) => state.selectedIds.includes(item.id));

  if (!selectedNodes.length) return null;

  const canGroup = selectedNodes.length >= 2 && selectedNodes.every((item) => item.kind !== 'group');
  const node = selectedNodes[0];

  if (selectedNodes.length > 1) {
    return (
      <div className={styles.root}>
        <Panel header={`Выбрано узлов: ${selectedNodes.length}`}>
          <VStack spacing={10}>
            <ButtonToolbar>
              <Button size="sm" appearance="primary" disabled={!canGroup} onClick={() => dispatch({ type: 'group-selected' })}>
                Сгруппировать
              </Button>
              <Button size="sm" color="red" onClick={() => dispatch({ type: 'remove-selected' })}>
                Удалить выбранные
              </Button>
            </ButtonToolbar>
          </VStack>
        </Panel>
      </div>
    );
  }

  if (node.kind === 'group') {
    return (
      <div className={styles.root}>
        <Panel header="Свойства: group">
          <VStack spacing={10}>
            <div>Дочерних узлов: {node.children.length}</div>
            <NumberInput
              label="Масштаб, %"
              min={MIN_GROUP_SCALE * 100}
              max={MAX_GROUP_SCALE * 100}
              step={5}
              value={Math.round(node.scale * 100)}
              onChange={(value) => {
                const percent = Number(value);
                if (!Number.isFinite(percent) || percent <= 0) return;
                dispatch({
                  type: 'update-node',
                  id: node.id,
                  mutate: (current) => (current.kind === 'group' ? { ...current, scale: percent / 100 } : current),
                });
              }}
            />
            <NumberInput
              label="Поворот, °"
              min={-360}
              max={360}
              step={15}
              value={node.rotation}
              onChange={(value) => {
                const rotation = Number(value);
                if (!Number.isFinite(rotation)) return;
                dispatch({
                  type: 'update-node',
                  id: node.id,
                  mutate: (current) => (current.kind === 'group' ? { ...current, rotation } : current),
                });
              }}
            />
            <ButtonToolbar>
              <Button size="sm" appearance="primary" onClick={() => dispatch({ type: 'ungroup', id: node.id })}>
                Разгруппировать
              </Button>
              <Button size="sm" onClick={() => dispatch({ type: 'reorder', id: node.id, to: 'front' })}>
                На передний план
              </Button>
              <Button size="sm" onClick={() => dispatch({ type: 'reorder', id: node.id, to: 'back' })}>
                На задний план
              </Button>
              <Button size="sm" color="red" onClick={() => dispatch({ type: 'remove-node', id: node.id })}>
                Удалить группу
              </Button>
            </ButtonToolbar>
          </VStack>
        </Panel>
      </div>
    );
  }

  const update = (mutate: (current: SchemaNode) => SchemaNode) => {
    dispatch({ type: 'update-node', id: node.id, mutate });
  }

  const asTriangle = (mutate: (current: TriangleNode) => TriangleNode) => {
    update((current) => (current.kind === 'triangle' ? mutate(current) : current));
  }

  return (
    <div className={styles.root}>
      <Panel header={`Свойства: ${node.kind}`}>
        <VStack spacing={10}>
          {node.kind !== 'triangle' ? (
            <>
              <NumberInput
                label="Размер"
                min={MIN_NODE_SIZE}
                max={MAX_NODE_SIZE}
                step={2}
                value={node.size}
                onChange={(value) => {
                  const size = Number(value);
                  if (!Number.isFinite(size)) return;
                  update((current) => (current.kind === 'triangle' ? current : { ...current, size }));
                }}
              />
              <NumberInput
                label="Поворот, °"
                min={-360}
                max={360}
                step={15}
                value={node.rotation}
                onChange={(value) => {
                  const rotation = Number(value);
                  if (!Number.isFinite(rotation)) return;
                  update((current) => (current.kind === 'triangle' ? current : { ...current, rotation }));
                }}
              />
              {node.kind === 'item' ? (
                <>
                  <ColorSwatchField
                    label="Цвет"
                    value={node.color}
                    fallback={DEFAULT_ITEM_COLOR}
                    onChange={(color) => update((current) => (current.kind === 'item' ? { ...current, color } : current))}
                    onClear={
                      node.color
                        ? () =>
                            update((current) => {
                              if (current.kind !== 'item') return current;
                              const next = { ...current };
                              delete next.color;
                              return next;
                            })
                        : undefined
                    }
                  />
                  <ButtonToolbar>
                    <Button
                      size="sm"
                      appearance={node.flipX ? 'primary' : 'default'}
                      onClick={() =>
                        update((current) => (current.kind === 'item' ? { ...current, flipX: !current.flipX } : current))
                      }
                    >
                      Отразить по горизонтали
                    </Button>
                    <Button
                      size="sm"
                      appearance={node.flipY ? 'primary' : 'default'}
                      onClick={() =>
                        update((current) => (current.kind === 'item' ? { ...current, flipY: !current.flipY } : current))
                      }
                    >
                      Отразить по вертикали
                    </Button>
                  </ButtonToolbar>
                </>
              ) : null}
            </>
          ) : (
            <>
              <ColorSwatchField
                label="Заливка"
                value={node.fill}
                fallback={DEFAULT_TRIANGLE_FILL}
                onChange={(color) => asTriangle((current) => ({ ...current, fill: color }))}
              />
              <ColorSwatchField
                label="Контур"
                value={node.stroke}
                fallback={DEFAULT_TRIANGLE_STROKE}
                onChange={(color) => asTriangle((current) => ({ ...current, stroke: color }))}
              />
              <NumberInput
                label="Толщина контура"
                min={0}
                max={40}
                step={1}
                value={node.strokeWidth}
                onChange={(value) => {
                  const strokeWidth = Number(value);
                  if (!Number.isFinite(strokeWidth)) return;
                  asTriangle((current) => ({ ...current, strokeWidth }));
                }}
              />
            </>
          )}

          <ButtonToolbar>
            <Button size="sm" onClick={() => dispatch({ type: 'reorder', id: node.id, to: 'front' })}>
              На передний план
            </Button>
            <Button size="sm" onClick={() => dispatch({ type: 'reorder', id: node.id, to: 'back' })}>
              На задний план
            </Button>
            <Button size="sm" color="red" onClick={() => dispatch({ type: 'remove-node', id: node.id })}>
              Удалить
            </Button>
          </ButtonToolbar>
        </VStack>
      </Panel>
    </div>
  );
}
