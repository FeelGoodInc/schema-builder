'use client';
import type { GroupNode, NewNode }        from '../types/schema';
import type { SchemaCustomActionContext } from '../types/builder';
import {
  type DragEvent,
  useRef,
}                                         from 'react';
import {
  useBuilderConfig,
  useSchema
}                                         from '../state/schemaStore';
import {
  Button,
  ButtonToolbar,
  Message,
  SegmentedControl,
  toaster
}                                         from 'rsuite';
import { createNode }                     from '../lib/nodes';
import { itemDataOf }                     from '../lib/itemData';
import {
  downloadSchema,
  readSchemaFile
}                                         from '../lib/persistence';
import { DROP_MIME }                      from '../SchemaCanvas';
import isNil                              from 'lodash/isNil';
import cns                                from 'classnames';
import {
  MdModeEdit,
  MdOutlineVisibility,
  MdChangeHistory,
  MdCenterFocusStrong,
  MdLayers,
  MdLayersClear,
  MdDeleteSweep,
  MdOutlineFileDownload,
  MdOutlineFileUpload,
  MdOutlineImageSearch,
  MdOutlineImageNotSupported
}                                         from 'react-icons/md';
import styles                             from './schema-builder-palette.module.scss';

export const Palette = (): React.ReactNode => {
  const { state, dispatch } = useSchema();
  const config = useBuilderConfig();
  const schemaInputRef = useRef<HTMLInputElement | null>(null);
  const backgroundInputRef = useRef<HTMLInputElement | null>(null);
  const previousUrlRef = useRef<string | null>(null);
  const items = config.current.availableItems ?? [];
  const actions = config.current.actions ?? [];
  const customActions = config.current.customActions;
  const isEditable = config.current.isEditable;
  const isEditMode = isEditable && state.mode === 'edit';

  // ----------------------------------------------------------------------------

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
        background: {
          src: url,
          width: image.naturalWidth,
          height: image.naturalHeight,
          name: file.name
        },
      });
      dispatch({ type: 'fit' });
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);

      toaster.push(
        <Message type="error">Не удалось прочитать изображение</Message>,
        { placement: 'topCenter' }
      );
    };

    image.src = url;
  };

  // ----------------------------------------------------------------------------

  const handleSchemaFile = async (file: File | undefined) => {
    if (!file) return;

    const result = await readSchemaFile(file);

    if (!result.ok) {
      toaster.push(
        <Message type="error">Импорт отменён: {result.error}</Message>,
        { placement: 'topCenter' }
      );

      return;
    }

    dispatch({ type: 'import', document: result.document });
    toaster.push(
      <Message type="success">Схема импортирована</Message>,
      { placement: 'topCenter' }
    );
  };

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

  const buildActionContext = (): SchemaCustomActionContext => {
    const groups = state.nodes.filter((node): node is GroupNode => node.kind === 'group');
    const selectedGroups = selectedNodes.filter((node): node is GroupNode => node.kind === 'group');

    return {
      mode: state.mode,
      document: { version: 5, nodes: state.nodes, viewport: state.viewport },
      nodes: state.nodes,
      groups,
      selectedIds: [...state.selectedIds],
      selectedNodes,
      selectedGroups,
      selectedItems: selectedNodes.map(itemDataOf),
      viewport: state.viewport,
      viewportSize: { ...state.viewportSize },
      background: state.background,
      availableItems: config.current.availableItems ?? [],
      canAddTriangle: config.current.canAddTriangle ?? false,
      findItem: config.findItem,
      dispatch,
    };
  };

  // ----------------------------------------------------------------------------

  return (
    <div className={styles.root}>
      {isEditable && (
        <>
          <SegmentedControl
            className={cns(styles.group, styles.toggle_mode)}
            size="sm"
            data={[
              { label: <MdModeEdit />, value: 'edit' },
              { label: <MdOutlineVisibility />, value: 'view' },
            ]}
            value={state.mode}
            onChange={(value) => dispatch({ type: 'set-mode', mode: value === 'view' ? 'view' : 'edit' })}
          />

          <div className={styles.divider} />
        </>
      )}
      
      {isEditMode && (
        <>
          <ButtonToolbar className={styles.group}>
            <Button
              title="Загрузить подложку"
              size="sm"
              onClick={() => backgroundInputRef.current?.click()}
            >
              <MdOutlineImageSearch />
            </Button>

            {state.background && (
              <Button
                title="Убрать подложку"
                size="sm"
                onClick={() => {
                  if (previousUrlRef.current) URL.revokeObjectURL(previousUrlRef.current);

                  previousUrlRef.current = null;

                  dispatch({ type: 'set-background', background: null });
                }}
              >
                <MdOutlineImageNotSupported />
              </Button>
            )}
          </ButtonToolbar>
          
          <div className={styles.divider} />
        </>
      )}
      
      <ButtonToolbar className={styles.group}>
        {isEditMode && (
          <Button
            title="Импорт схемы"
            size="sm"
            onClick={() => schemaInputRef.current?.click()}
          >
            <MdOutlineFileDownload />
          </Button>
        )}

        <Button
          title="Экспорт схемы"
          size="sm"
          onClick={() => downloadSchema({ version: 5, nodes: state.nodes, viewport: state.viewport })}
        >
          <MdOutlineFileUpload />
        </Button>

        {isEditMode && (
          <>
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
          </>
        )}

        <Button
          title="Вписать в холст"
          size="sm"
          onClick={() => dispatch({ type: 'fit' })}
        >
          <MdCenterFocusStrong/>
        </Button>

        {isEditMode && (
          <Button
            title="Очистить схему"
            size="sm"
            onClick={() => dispatch({ type: 'clear-nodes' })}
          >
            <MdDeleteSweep />
          </Button>
        )}

        {(isEditMode && actions.length > 0) && actions.map((action, index) => {
          const Icon = action.icon;
          
          return (
            <Button
              key={`${action.title}-${index}`}
              title={action.title}
              size="sm"
              onClick={() => action.onClick(buildActionContext())}
            >
              {Icon ? <Icon /> : action.title}
            </Button>
          );
        })}
      </ButtonToolbar>

      {isEditMode && (
        <>
          <div className={styles.divider} />
        
          <ButtonToolbar className={cns(styles.group, styles.components)}>
            {
              config.current.canAddTriangle
                ? (
                  <Button
                    className={styles.component}
                    title="Треугольник"
                    draggable
                    onDragStart={(event) => setPayload(event, triangleSpec())}
                    onClick={() => addAtCenter(triangleSpec())}
                  >
                    <MdChangeHistory />
                  </Button>
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
                      <Button
                        key={item.alias}
                        className={styles.component}
                        title={item.title}
                        draggable
                        onDragStart={(event) => setPayload(event, itemSpec(item.alias, item.defaultSize))}
                        onDoubleClick={() => addAtCenter(itemSpec(item.alias, item.defaultSize))}
                      >
                        {Icon ? <Icon size={24} /> : <span>{item.title}</span>}
                      </Button>
                    );
                  })
                )
            }
          </ButtonToolbar>
        </>
      )}

      {!isNil(customActions) && (
        <>
          <div className={styles.divider} />
        
          <div className={cns(styles.group)}>
            {customActions}
          </div>
        </>
      )}

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
    </div>
  );
}
