'use client';
import type {
  SchemaNode,
  TriangleNode
}                           from '../types/schema';
import {
  Button,
  NumberInput,
  VStack,
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
import { ColorPickerField } from './ColorPickerField';
import styles               from './sb-node-inspector.module.scss';

const DEFAULT_STACK_SPACING = 10;

export default function NodeInspector() {
  const { state, dispatch } = useSchema();
  const selectedNodes = state.nodes.filter((item) => state.selectedIds.includes(item.id));

  if (!selectedNodes.length) return null;

  const canGroup = selectedNodes.length >= 2 && selectedNodes.every((item) => item.kind !== 'group');
  const node = selectedNodes[0];
  const isMoreThanOneSelected = selectedNodes.length > 1;
  const isGroup = node.kind === 'group';

  // -------------------------------------------------------------------

  const update = (mutate: (current: SchemaNode) => SchemaNode) => {
    dispatch({ type: 'update-node', id: node.id, mutate });
  }

  // -------------------------------------------------------------------

  const asTriangle = (mutate: (current: TriangleNode) => TriangleNode) => {
    update((current) => (current.kind === 'triangle' ? mutate(current) : current));
  }

  // -------------------------------------------------------------------

  if (isMoreThanOneSelected) {
    return (
      <div className={styles.root}>
        <div className={styles.title}>
          Выбрано узлов: {selectedNodes.length}
        </div>
        <div className={styles.section}>
          <div className={styles.section_title}>
            Действия
          </div>
          <VStack
            className={styles.section_content}
            spacing={DEFAULT_STACK_SPACING}
          >
            <Button
              size="xs"
              block
              appearance="primary"
              disabled={!canGroup}
              onClick={() => dispatch({ type: 'group-selected' })}
            >
              Сгруппировать
            </Button>

            <Button
              size="xs"
              color="red"
              block
              onClick={() => dispatch({ type: 'remove-selected' })}
            >
              Удалить выбранные
            </Button>
          </VStack>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------

  if (isGroup) {
    return (
      <div className={styles.root}>
        <div className={styles.title}>
          Свойства группы
        </div>

        <div className={styles.section}>
          <div className={styles.section_title}>
            Параметры
          </div>

          <VStack
            className={styles.section_content}
            spacing={DEFAULT_STACK_SPACING}
          >
            <div>
              Дочерних узлов: {node.children.length}
            </div>

            <div className={styles.property}>
              <label>Масштаб, %</label>
              <NumberInput
                min={MIN_GROUP_SCALE * 100}
                max={MAX_GROUP_SCALE * 100}
                size="sm"
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
            </div>

            <div className={styles.property}>
              <label>Поворот, °</label>
              <NumberInput
                min={-360}
                max={360}
                size="sm"
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
            </div>
          </VStack>
        </div>
        
        <div className={styles.section}>
          <div className={styles.section_title}>
            Действия
          </div>
          
          <VStack
            className={styles.section_content}
            spacing={DEFAULT_STACK_SPACING}
          >
            <Button
              size="xs"
              appearance="primary"
              block
              onClick={() => dispatch({ type: 'ungroup', id: node.id })}
            >
              Разгруппировать
            </Button>

            <Button
              size="xs"
              block
              onClick={() => dispatch({ type: 'reorder', id: node.id, to: 'front' })}
            >
              На передний план
            </Button>

            <Button
              size="xs"
              block
              onClick={() => dispatch({ type: 'reorder', id: node.id, to: 'back' })}
            >
              На задний план
            </Button>

            <Button
              size="xs"
              color="red"
              appearance="primary"
              block
              onClick={() => dispatch({ type: 'remove-node', id: node.id })}
            >
              Удалить группу
            </Button>
          </VStack>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------

  return (
    <div className={styles.root}>
      <div className={styles.title}>
        Свойства элемента
      </div>

      <div className={styles.section}>
        <div className={styles.section_title}>
          Параметры
        </div>

        <VStack
          className={styles.section_content}
          spacing={DEFAULT_STACK_SPACING}
        >
          {node.kind !== 'triangle' && (
            <>
              <div className={styles.property}>
                <label>Размер</label>
                <NumberInput
                  min={MIN_NODE_SIZE}
                  max={MAX_NODE_SIZE}
                  size="sm"
                  step={2}
                  value={node.size}
                  onChange={(value) => {
                    const size = Number(value);

                    if (!Number.isFinite(size)) return;

                    update((current) => (current.kind === 'triangle' ? current : { ...current, size }));
                  }}
                />
              </div>
              
              <div className={styles.property}>
                <label>Поворот, °</label>
                <NumberInput
                  min={-360}
                  max={360}
                  size="sm"
                  step={15}
                  value={node.rotation}
                  onChange={(value) => {
                    const rotation = Number(value);

                    if (!Number.isFinite(rotation)) return;

                    update((current) => (current.kind === 'triangle' ? current : { ...current, rotation }));
                  }}
                />
              </div>
            </>
          )}

          {node.kind === 'item' && (
            <>
              <div className={styles.property}>
                <label>Цвет</label>
                <ColorPickerField
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
              </div>
            </>
          )}

          {node.kind === 'triangle' && (
            <>
              <div className={styles.property}>
                <label>Цвет заливки</label>
                <ColorPickerField
                  value={node.fill}
                  fallback={DEFAULT_TRIANGLE_FILL}
                  onChange={(color) => asTriangle((current) => ({ ...current, fill: color }))}
                />
              </div>

              <div className={styles.property}>
                <label>Цвет контура</label>
                <ColorPickerField
                  value={node.stroke}
                  fallback={DEFAULT_TRIANGLE_STROKE}
                  onChange={(color) => asTriangle((current) => ({ ...current, stroke: color }))}
                />
              </div>

              <div className={styles.property}>
                <label>Толщина контура</label>
                <NumberInput
                  min={0}
                  max={40}
                  size="sm"
                  step={1}
                  value={node.strokeWidth}
                  onChange={(value) => {
                    const strokeWidth = Number(value);
                    if (!Number.isFinite(strokeWidth)) return;
                    asTriangle((current) => ({ ...current, strokeWidth }));
                  }}
                />
              </div>
            </>
          )}
        </VStack>
      </div>

      <div className={styles.section}>
        <div className={styles.section_title}>
          Действия
        </div>

        <VStack
          className={styles.section_content}
          spacing={DEFAULT_STACK_SPACING}
        >
          {node.kind === 'item' && (
            <>
              <Button
                size="xs"
                block
                appearance={node.flipX ? 'primary' : 'default'}
                onClick={() =>
                  update((current) => (current.kind === 'item' ? { ...current, flipX: !current.flipX } : current))
                }
              >
                Отразить по горизонтали
              </Button>
              <Button
                size="xs"
                block
                appearance={node.flipY ? 'primary' : 'default'}
                onClick={() =>
                  update((current) => (current.kind === 'item' ? { ...current, flipY: !current.flipY } : current))
                }
              >
                Отразить по вертикали
              </Button>
            </>
          )}
          <Button
            size="xs"
            block
            onClick={() => dispatch({ type: 'reorder', id: node.id, to: 'front' })}
          >
            На передний план
          </Button>

          <Button
            size="xs"
            block
            onClick={() => dispatch({ type: 'reorder', id: node.id, to: 'back' })}
          >
            На задний план
          </Button>

          <Button
            size="xs"
            color="red"
            appearance="primary"
            block
            onClick={() => dispatch({ type: 'remove-node', id: node.id })}
          >
            Удалить
          </Button>
        </VStack>
      </div>
    </div>
  );
}
