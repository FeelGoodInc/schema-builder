import type { ChildNode, CustomData, Pt, SchemaDocument, SchemaNode, TriangleNode } from '@/types/schema';

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

const customData = (value: unknown): CustomData | undefined => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  return value as CustomData;
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

type NodeValidation = { ok: true; node: SchemaNode } | { ok: false; error: string };

function validateNode(item: unknown, label: string, allowGroup: boolean): NodeValidation {
  if (typeof item !== 'object' || item === null) return { ok: false, error: `${label}: не объект` };
  const record = item as Record<string, unknown>;
  const id = str(record.id);
  const kind = str(record.kind);
  if (!id || !kind) return { ok: false, error: `${label}: нет id или kind` };

  if (kind === 'item') {
    const alias = str(record.alias);
    const x = num(record.x);
    const y = num(record.y);
    const size = num(record.size);
    if (!alias || x === undefined || y === undefined || size === undefined) {
      return { ok: false, error: `${label}: некорректный элемент` };
    }
    const data = customData(record.customData);
    return {
      ok: true,
      node: {
        id,
        kind: 'item',
        alias,
        x,
        y,
        size,
        rotation: num(record.rotation) ?? 0,
        ...(data ? { customData: data } : {}),
      },
    };
  }

  if (kind === 'triangle') {
    const rawVertices = record.vertices;
    if (!Array.isArray(rawVertices) || rawVertices.length !== 3) {
      return { ok: false, error: `${label}: треугольник должен иметь 3 вершины` };
    }
    const vertices = rawVertices.map(point) as [Pt, Pt, Pt];
    if (vertices.some((v) => v === undefined)) {
      return { ok: false, error: `${label}: некорректные координаты вершины` };
    }
    return {
      ok: true,
      node: {
        id,
        kind: 'triangle',
        vertices,
        fill: str(record.fill) ?? '#5c6bc0',
        stroke: str(record.stroke) ?? '#272e3a',
        strokeWidth: num(record.strokeWidth) ?? 2,
      } satisfies TriangleNode,
    };
  }

  if (kind === 'group') {
    if (!allowGroup) return { ok: false, error: `${label}: группа не может быть вложенной` };
    const rawChildren = record.children;
    if (!Array.isArray(rawChildren) || rawChildren.length < 2) {
      return { ok: false, error: `${label}: группа должна содержать минимум 2 узла` };
    }

    const children: ChildNode[] = [];
    for (let i = 0; i < rawChildren.length; i += 1) {
      const result = validateNode(rawChildren[i], `${label}.children[${i}]`, false);
      if (!result.ok) return result;
      if (result.node.kind === 'group') return { ok: false, error: `${label}.children[${i}]: группа не может быть вложенной` };
      children.push(result.node);
    }

    const rawScale = num(record.scale);
    const scale = rawScale !== undefined && rawScale > 0 ? rawScale : 1;
    const rotation = num(record.rotation) ?? 0;

    return { ok: true, node: { id, kind: 'group', children, scale, rotation } };
  }

  return { ok: false, error: `${label}: неизвестный kind "${kind}"` };
}

export function validateSchema(raw: unknown): ValidationResult {
  if (typeof raw !== 'object' || raw === null) return { ok: false, error: 'Файл не является объектом JSON' };
  const doc = raw as Record<string, unknown>;
  if (doc.version !== 5) {
    return { ok: false, error: 'Неподдерживаемая версия схемы' };
  }
  if (!Array.isArray(doc.nodes)) return { ok: false, error: 'Отсутствует массив nodes' };

  const nodes: SchemaNode[] = [];
  for (let i = 0; i < doc.nodes.length; i += 1) {
    const result = validateNode(doc.nodes[i], `Узел ${i}`, true);
    if (!result.ok) return result;
    nodes.push(result.node);
  }

  const viewportRaw = doc.viewport as Record<string, unknown> | undefined;
  const scale = num(viewportRaw?.scale) ?? 1;
  const tx = num(viewportRaw?.tx) ?? 0;
  const ty = num(viewportRaw?.ty) ?? 0;

  return { ok: true, document: { version: 5, nodes, viewport: { scale, tx, ty } } };
}

export function parseSchemaDocument(raw: unknown): SchemaDocument | null {
  const result = validateSchema(raw);
  return result.ok ? result.document : null;
}

export async function readSchemaFile(file: File): Promise<ValidationResult> {
  try {
    const text = await file.text();
    return validateSchema(JSON.parse(text));
  } catch {
    return { ok: false, error: 'Не удалось разобрать JSON' };
  }
}
