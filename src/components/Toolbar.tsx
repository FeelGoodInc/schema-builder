'use client';

import { useRef } from 'react';
import { Button, ButtonToolbar, Message, SegmentedControl, toaster } from 'rsuite';
import { useSchema } from '@/state/schemaStore';
import { createNode } from '@/lib/nodes';
import { downloadSchema, readSchemaFile } from '@/lib/persistence';

const MODE_ITEMS = [
  { label: 'Создание схемы', value: 'edit' },
  { label: 'Просмотр', value: 'view' },
];

export default function Toolbar() {
  const { state, dispatch } = useSchema();
  const backgroundInputRef = useRef<HTMLInputElement | null>(null);
  const schemaInputRef = useRef<HTMLInputElement | null>(null);
  const previousUrlRef = useRef<string | null>(null);

  const worldCenter = () => ({
    x: (state.viewportSize.width / 2 - state.viewport.tx) / state.viewport.scale,
    y: (state.viewportSize.height / 2 - state.viewport.ty) / state.viewport.scale,
  });

  const handleBackgroundFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.type !== 'image/png' && file.type !== 'image/jpeg') {
      toaster.push(<Message type="error">Подложка должна быть PNG или JPEG</Message>, { placement: 'topCenter' });
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      if (previousUrlRef.current) URL.revokeObjectURL(previousUrlRef.current);
      previousUrlRef.current = url;
      dispatch({
        type: 'set-background',
        background: { src: url, width: image.naturalWidth, height: image.naturalHeight, name: file.name },
      });
      dispatch({ type: 'fit' });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      toaster.push(<Message type="error">Не удалось прочитать изображение</Message>, { placement: 'topCenter' });
    };
    image.src = url;
  };

  const handleSchemaFile = async (file: File | undefined) => {
    if (!file) return;
    const result = await readSchemaFile(file);
    if (!result.ok) {
      toaster.push(<Message type="error">Импорт отменён: {result.error}</Message>, { placement: 'topCenter' });
      return;
    }
    dispatch({ type: 'import', document: result.document });
    toaster.push(<Message type="success">Схема импортирована</Message>, { placement: 'topCenter' });
  };

  return (
    <div className="sb-toolbar">
      <SegmentedControl
        size="sm"
        data={MODE_ITEMS}
        value={state.mode}
        onChange={(value) => dispatch({ type: 'set-mode', mode: value === 'view' ? 'view' : 'edit' })}
      />
      <ButtonToolbar className="sb-toolbar-group">
        <Button size="sm" onClick={() => backgroundInputRef.current?.click()}>
          Загрузить подложку
        </Button>
        <Button size="sm" onClick={() => dispatch({ type: 'fit' })}>
          Вписать в холст
        </Button>
        <Button size="sm" onClick={() => dispatch({ type: 'zoom', focus: { x: state.viewportSize.width / 2, y: state.viewportSize.height / 2 }, factor: 1.25 })}>
          Приблизить
        </Button>
        <Button size="sm" onClick={() => dispatch({ type: 'zoom', focus: { x: state.viewportSize.width / 2, y: state.viewportSize.height / 2 }, factor: 1 / 1.25 })}>
          Отдалить
        </Button>
        {state.background ? (
          <Button size="sm" appearance="subtle" onClick={() => {
            if (previousUrlRef.current) URL.revokeObjectURL(previousUrlRef.current);
            previousUrlRef.current = null;
            dispatch({ type: 'set-background', background: null });
          }}>
            Убрать подложку
          </Button>
        ) : null}
      </ButtonToolbar>
      <ButtonToolbar className="sb-toolbar-group">
        <Button
          size="sm"
          appearance="primary"
          disabled={state.mode !== 'edit'}
          onClick={() => dispatch({ type: 'add-node', node: createNode({ kind: 'triangle', x: worldCenter().x, y: worldCenter().y }) })}
        >
          Добавить треугольник
        </Button>
        <Button
          size="sm"
          onClick={() => downloadSchema({ version: 2, nodes: state.nodes, viewport: state.viewport })}
        >
          Экспорт схемы
        </Button>
        <Button size="sm" onClick={() => schemaInputRef.current?.click()}>
          Импорт схемы
        </Button>
      </ButtonToolbar>
      <input
        ref={backgroundInputRef}
        type="file"
        accept="image/png,image/jpeg"
        hidden
        onChange={(event) => {
          void handleBackgroundFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      <input
        ref={schemaInputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => {
          void handleSchemaFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
    </div>
  );
}
