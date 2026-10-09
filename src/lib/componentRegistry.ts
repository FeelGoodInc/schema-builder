import type { ComponentType } from 'react';

export interface RegisteredComponentMeta {
  id: string;
  title: string;
  defaultSize: number;
}

export interface RegisteredComponent {
  component: ComponentType<{ size: number }>;
  meta: RegisteredComponentMeta;
}

const registry = new Map<string, RegisteredComponent>();

export function registerComponent(
  id: string,
  component: ComponentType<{ size: number }>,
  meta: Omit<RegisteredComponentMeta, 'id'>
): void {
  registry.set(id, { component, meta: { ...meta, id } });
}

export function getRegisteredComponent(id: string): RegisteredComponent | undefined {
  return registry.get(id);
}

export function listRegisteredComponents(): RegisteredComponentMeta[] {
  return [...registry.values()].map((item) => item.meta).sort((a, b) => a.id.localeCompare(b.id));
}
