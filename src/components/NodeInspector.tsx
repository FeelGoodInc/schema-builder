'use client';

import { Button, ButtonToolbar, InputPicker, NumberInput, Panel, VStack } from 'rsuite';
import { useSchema } from '@/state/schemaStore';
import { ICON_LIBS, getCachedIconNames } from '@/lib/iconsRegistry';
import { listRegisteredComponents } from '@/lib/componentRegistry';
import { MAX_GROUP_SCALE, MAX_NODE_SIZE, MIN_GROUP_SCALE, MIN_NODE_SIZE } from '@/lib/transform';
import type { IconLibKey, SchemaNode, TriangleNode } from '@/types/schema';

const COLORS = [
  '#5c6bc0',
  '#1677ff',
  '#2bb673',
  '#f76808',
  '#d62828',
  '#ffb400',
  '#272e3a',
  '#ffffff',
];

export default function NodeInspector() {
  const { state, dispatch } = useSchema();
  const selectedNodes = state.nodes.filter((item) => state.selectedIds.includes(item.id));

  if (!selectedNodes.length) return null;

  const canGroup = selectedNodes.length >= 2 && selectedNodes.every((item) => item.kind !== 'group');

  if (selectedNodes.length > 1) {
    return (
      <div className="sb-inspector">
        <Panel bordered header={`Выбрано узлов: ${selectedNodes.length}`}>
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

  const node = selectedNodes[0];

  if (node.kind === 'group') {
    return (
      <div className="sb-inspector">
        <Panel bordered header="Свойства: group">
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

  const iconOptions = ICON_LIBS.flatMap((lib) =>
    getCachedIconNames(lib).map((name) => ({ label: `${lib}/${name}`, value: `${lib}/${name}` }))
  );

  const componentOptions = listRegisteredComponents().map((meta) => ({
    label: `${meta.title} (${meta.id})`,
    value: meta.id,
  }));

  const update = (mutate: (current: SchemaNode) => SchemaNode) =>
    dispatch({ type: 'update-node', id: node.id, mutate });

  const asTriangle = (mutate: (current: TriangleNode) => TriangleNode) =>
    update((current) => (current.kind === 'triangle' ? mutate(current) : current));

  const colorOptions = COLORS.map((color) => ({ label: color, value: color }));

  return (
    <div className="sb-inspector">
      <Panel bordered header={`Свойства: ${node.kind}`}>
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
              <InputPicker
                label="Заменить на иконку"
                searchable
                virtualized
                data={iconOptions}
                value={node.kind === 'icon' ? `${node.lib}/${node.name}` : undefined}
                onChange={(value) => {
                  const raw = String(value ?? '');
                  const [lib, name] = raw.split('/');
                  if (!lib || !name) return;
                  update((current) => {
                    if (current.kind === 'icon') return { ...current, lib: lib as IconLibKey, name };
                    if (current.kind === 'component') {
                      return { ...current, kind: 'icon', lib: lib as IconLibKey, name };
                    }
                    return current;
                  });
                }}
              />
              <InputPicker
                label="Заменить на компонент"
                data={componentOptions}
                value={node.kind === 'component' ? node.ref : undefined}
                onChange={(value) => {
                  const ref = String(value ?? '');
                  if (!ref) return;
                  update((current) => {
                    if (current.kind === 'icon') return { ...current, kind: 'component', ref };
                    if (current.kind === 'component') return { ...current, ref };
                    return current;
                  });
                }}
              />
            </>
          ) : (
            <>
              <InputPicker
                label="Заливка"
                data={colorOptions}
                value={node.fill}
                onChange={(value) => asTriangle((current) => ({ ...current, fill: String(value) }))}
              />
              <InputPicker
                label="Контур"
                data={colorOptions}
                value={node.stroke}
                onChange={(value) => asTriangle((current) => ({ ...current, stroke: String(value) }))}
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
