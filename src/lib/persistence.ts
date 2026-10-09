import type { IconLibKey, Pt, SchemaDocument, SchemaNode, TriangleNode } from '@/types/schema';

const ICON_LIBS: IconLibKey[] = ['md', 'gi', 'tb'];

const num = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const str = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

const point = (value: unknown): Pt | undefined => {
  if (typeof value !== 'object' || value === null) return undefined;
  const record = value as Record<string, unknown>;
  const x = num(record.x);
  const y = num(record.y);
  if (x === undefined || y === undefined) return undefined;
  return { x, y };
};

export function serializeSchema(doc: SchemaDocument): string {
  return JSON.stringify(doc, null, 2);
}

export function downloadSchema(doc: SchemaDocument, filename = 'schema.json'): void {
  const blob = new Blob([serializeSchema(doc)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export type ValidationResult =
  | { ok: true; document: SchemaDocument }
  | { ok: false; error: string };

export function validateSchema(raw: unknown): ValidationResult {
  if (typeof raw !== 'object' || raw === null) return { ok: false, error: 'Файл не является объектом JSON' };
  const doc = raw as Record<string, unknown>;
  if (doc.version !== 2) return { ok: false, error: 'Неподдерживаемая версия схемы' };
  if (!Array.isArray(doc.nodes)) return { ok: false, error: 'Отсутствует массив nodes' };

  const nodes: SchemaNode[] = [];
  for (let i = 0; i < doc.nodes.length; i += 1) {
    const item = doc.nodes[i] as Record<string, unknown>;
    const id = str(item?.id);
    const kind = str(item?.kind);
    if (!id || !kind) return { ok: false, error: `Узел ${i}: нет id или kind` };

    if (kind === 'icon') {
      const lib = str(item.lib) as IconLibKey | undefined;
      const name = str(item.name);
      const x = num(item.x);
      const y = num(item.y);
      const size = num(item.size);
      if (!lib || !ICON_LIBS.includes(lib) || !name || x === undefined || y === undefined || size === undefined) {
        return { ok: false, error: `Узел ${i}: некорректная иконка` };
      }
      nodes.push({
        id,
        kind: 'icon',
        lib,
        name,
        x,
        y,
        size,
        rotation: num(item.rotation) ?? 0,
      });
      continue;
    }

    if (kind === 'component') {
      const ref = str(item.ref);
      const x = num(item.x);
      const y = num(item.y);
      const size = num(item.size);
      if (!ref || x === undefined || y === undefined || size === undefined) {
        return { ok: false, error: `Узел ${i}: некорректный компонент` };
      }
      nodes.push({
        id,
        kind: 'component',
        ref,
        x,
        y,
        size,
        rotation: num(item.rotation) ?? 0,
      });
      continue;
    }

    if (kind === 'triangle') {
      const rawVertices = item.vertices;
      if (!Array.isArray(rawVertices) || rawVertices.length !== 3) {
        return { ok: false, error: `Узел ${i}: треугольник должен иметь 3 вершины` };
      }
      const vertices = rawVertices.map(point) as [Pt, Pt, Pt];
      if (vertices.some((v) => v === undefined)) {
        return { ok: false, error: `Узел ${i}: некорректные координаты вершины` };
      }
      nodes.push({
        id,
        kind: 'triangle',
        vertices,
        fill: str(item.fill) ?? '#5c6bc0',
        stroke: str(item.stroke) ?? '#272e3a',
        strokeWidth: num(item.strokeWidth) ?? 2,
      } satisfies TriangleNode);
      continue;
    }

    return { ok: false, error: `Узел ${i}: неизвестный kind "${kind}"` };
  }

  const viewportRaw = doc.viewport as Record<string, unknown> | undefined;
  const scale = num(viewportRaw?.scale) ?? 1;
  const tx = num(viewportRaw?.tx) ?? 0;
  const ty = num(viewportRaw?.ty) ?? 0;

  return { ok: true, document: { version: 2, nodes, viewport: { scale, tx, ty } } };
}

export async function readSchemaFile(file: File): Promise<ValidationResult> {
  try {
    const text = await file.text();
    return validateSchema(JSON.parse(text));
  } catch {
    return { ok: false, error: 'Не удалось разобрать JSON' };
  }
}
