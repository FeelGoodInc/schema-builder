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
        dispatch({ type: 'select', id: null });
        return;
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && state.selectedId) {
        event.preventDefault();
        dispatch({ type: 'remove-node', id: state.selectedId });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, state.selectedId]);

  return (
    <div className="sb-app">
      <header className="sb-header">
        <Toolbar />
      </header>
      <div className="sb-body">
        <div className="sb-canvas-wrap">
          <SchemaCanvas />
          {state.mode === 'edit' && state.selectedId ? <NodeInspector /> : null}
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
