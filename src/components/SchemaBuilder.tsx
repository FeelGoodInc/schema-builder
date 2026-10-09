'use client';

import { useEffect } from 'react';
import { SchemaProvider, useSchema } from '@/state/schemaStore';
import Toolbar from './Toolbar';
import SchemaCanvas from './SchemaCanvas';
import IconsPanel from './IconsPanel';
import NodeInspector from './NodeInspector';

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
    <div className="sb-app">
      <header className="sb-header">
        <Toolbar />
      </header>
      <div className="sb-body">
        <div className="sb-canvas-wrap">
          <SchemaCanvas />
          {state.mode === 'edit' && state.selectedIds.length ? <NodeInspector /> : null}
        </div>
        {state.mode === 'edit' ? (
          <aside className="sb-side">
            <IconsPanel />
          </aside>
        ) : null}
      </div>
    </div>
  );
}

export default function SchemaBuilder() {
  return (
    <SchemaProvider>
      <Workspace />
    </SchemaProvider>
  );
}
