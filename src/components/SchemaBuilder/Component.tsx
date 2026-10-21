'use client';
import type {
  SchemaBuilderConfig,
  SchemaBuilderProps
}                              from './types/builder';
import {
  useEffect,
  useMemo,
  useRef,
  useState
}                              from 'react';
import {
  Message,
  toaster
}                              from 'rsuite';
import {
  BuilderConfigProvider,
  SchemaProvider,
  useSchema
}                              from './state/schemaStore';

import { parseSchemaDocument } from './lib/persistence';
import Toolbar                 from './Toolbar';
import SchemaCanvas            from './SchemaCanvas';
import { Palette }             from './Palette';
import NodeInspector           from './NodeInspector';
import styles                  from './schema-builder.module.scss';

const EMPTY_ITEMS: SchemaBuilderConfig['availableItems'] = [];
const EMPTY_ACTIONS: SchemaBuilderConfig['actions'] = [];

function InvalidDataNotice({ shown }: { shown: boolean }) {
  const reportedRef = useRef(false);
  useEffect(() => {
    if (!shown || reportedRef.current) return;
    reportedRef.current = true;
    toaster.push(<Message type="error">Начальная схема некорректна: использована пустая схема</Message>, {
      placement: 'topCenter',
    });
  }, [shown]);
  return null;
}

function BackgroundLoader({ url }: { url?: string }) {
  const { dispatch } = useSchema();

  useEffect(() => {
    if (!url) return;
    let active = true;
    const image = new Image();
    image.onload = () => {
      if (!active) return;
      dispatch({
        type: 'set-background',
        background: { src: url, width: image.naturalWidth, height: image.naturalHeight, name: url },
      });
      dispatch({ type: 'fit' });
    };
    image.onerror = () => {
      if (!active) return;
      toaster.push(<Message type="error">Не удалось загрузить фоновое изображение</Message>, {
        placement: 'topCenter',
      });
    };
    image.src = url;
    return () => {
      active = false;
    };
  }, [dispatch, url]);

  return null;
}

function SchemaEmitter({ onChange }: { onChange?: SchemaBuilderProps['onChange'] }) {
  const { state } = useSchema();
  const onChangeRef = useRef(onChange);
  const skipRef = useRef(true);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (skipRef.current) {
      skipRef.current = false;
      return;
    }
    onChangeRef.current?.({ version: 5, nodes: state.nodes, viewport: state.viewport });
  }, [state.nodes, state.viewport]);

  return null;
}

function Workspace() {
  const { state, dispatch } = useSchema();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      if (event.key === 'Escape') {
        dispatch({ type: 'select', ids: [] });
        return;
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && state.selectedIds.length) {
        event.preventDefault();
        dispatch({ type: 'remove-selected' });
        return;
      }
      if (state.mode === 'edit' && event.ctrlKey && event.key.toLowerCase() === 'g') {
        event.preventDefault();
        if (event.shiftKey) {
          const selectedGroup = state.nodes.find(
            (node) => node.id === state.selectedIds[0] && node.kind === 'group' && state.selectedIds.length === 1
          );
          if (selectedGroup) dispatch({ type: 'ungroup', id: selectedGroup.id });
        } else {
          dispatch({ type: 'group-selected' });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, state.mode, state.nodes, state.selectedIds]);

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <Toolbar />
      </header>
      <div className={styles.content}>
        <div className={styles.canvas_wrapper}>
          <SchemaCanvas />
          {state.mode === 'edit' ? <Palette /> : null}
          {state.mode === 'edit' && state.selectedIds.length ? <NodeInspector /> : null}
        </div>
      </div>
    </div>
  );
}

export const SchemaBuilder = ({
  isEditable,
  data,
  backgroundImage,
  canAddTriangle = false,
  availableItems = EMPTY_ITEMS,
  actions = EMPTY_ACTIONS,
  onItemClick,
  onChange,
}: SchemaBuilderProps): React.ReactNode => {
  const config = useMemo<SchemaBuilderConfig>(
    () => ({ availableItems, actions, onItemClick, onChange, canAddTriangle }),
    [availableItems, actions, onItemClick, onChange, canAddTriangle]
  );

  const [initialDocument] = useState(() => (data === undefined ? null : parseSchemaDocument(data)));

  return (
    <SchemaProvider document={initialDocument ?? undefined} mode={isEditable ? 'edit' : 'view'}>
      <BuilderConfigProvider config={config}>
        <InvalidDataNotice shown={data !== undefined && initialDocument === null} />
        <BackgroundLoader url={backgroundImage} />
        <SchemaEmitter onChange={onChange} />
        <Workspace />
      </BuilderConfigProvider>
    </SchemaProvider>
  );
}

export default SchemaBuilder;