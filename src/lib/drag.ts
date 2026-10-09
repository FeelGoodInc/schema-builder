import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Pt } from '@/types/schema';

export interface DragSession {
  cancel: () => void;
}

export function startPointerDrag(options: {
  event: ReactPointerEvent<Element>;
  onMove: (client: Pt, native: PointerEvent) => void;
  onEnd?: (info: { moved: boolean }) => void;
  capture?: boolean;
}): DragSession {
  const { event, onMove, onEnd, capture = true } = options;
  const target = event.currentTarget as Element;
  const pointerId = event.pointerId;
  const start = { x: event.clientX, y: event.clientY };
  const source: EventTarget = capture ? target : window;
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
    source.removeEventListener('pointermove', handleMove);
    source.removeEventListener('pointerup', handleFinish);
    source.removeEventListener('pointercancel', handleFinish);
    if (capture && target.hasPointerCapture?.(pointerId)) target.releasePointerCapture(pointerId);
    onEnd?.({ moved });
  };

  if (capture) target.setPointerCapture?.(pointerId);
  source.addEventListener('pointermove', handleMove);
  source.addEventListener('pointerup', handleFinish);
  source.addEventListener('pointercancel', handleFinish);

  return { cancel: handleFinish };
}
