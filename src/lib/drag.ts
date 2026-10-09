import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Pt } from '@/types/schema';

export interface DragSession {
  cancel: () => void;
}

export function startPointerDrag(options: {
  event: ReactPointerEvent<Element>;
  onMove: (client: Pt, native: PointerEvent) => void;
  onEnd?: (info: { moved: boolean }) => void;
}): DragSession {
  const { event, onMove, onEnd } = options;
  const target = event.currentTarget as Element;
  const pointerId = event.pointerId;
  const start = { x: event.clientX, y: event.clientY };
  let moved = false;
  let finished = false;

  const handleMove = (nativeEvent: Event) => {
    const native = nativeEvent as PointerEvent;
    if (!moved && (Math.abs(native.clientX - start.x) > 2 || Math.abs(native.clientY - start.y) > 2)) {
      moved = true;
    }
    onMove({ x: native.clientX, y: native.clientY }, native);
  };

  const handleFinish = () => {
    if (finished) return;
    finished = true;
    target.removeEventListener('pointermove', handleMove);
    target.removeEventListener('pointerup', handleFinish);
    target.removeEventListener('pointercancel', handleFinish);
    if (target.hasPointerCapture?.(pointerId)) target.releasePointerCapture(pointerId);
    onEnd?.({ moved });
  };

  target.setPointerCapture?.(pointerId);
  target.addEventListener('pointermove', handleMove);
  target.addEventListener('pointerup', handleFinish);
  target.addEventListener('pointercancel', handleFinish);

  return { cancel: handleFinish };
}
