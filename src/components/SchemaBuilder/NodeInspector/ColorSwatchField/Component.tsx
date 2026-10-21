'use client';
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
}                              from 'react';
import { HexAlphaColorPicker } from 'react-colorful';
import { normalizeHexAlpha }   from '../../lib/color';

interface ColorSwatchFieldProps {
  value?: string;
  fallback: string;
  onChange: (color: string) => void;
  onClear?: () => void;
}

export const ColorSwatchField = ({
  value,
  fallback,
  onChange,
  onClear
}: ColorSwatchFieldProps): React.ReactNode => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const color = draft ?? normalizeHexAlpha(value, fallback);

  const closePicker = useCallback(() => {
    setOpen(false);
    setDraft(null);
  }, []);

  const togglePicker = () => {
    if (open) {
      closePicker();
      return;
    }
    setDraft(null);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        closePicker();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePicker();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, closePicker]);

  const swatchStyle = { '--sb-color': color } as CSSProperties;

  return (
    <div className="sb-color-field" ref={rootRef}>
      <div className="sb-color-control">
        <button
          type="button"
          className="sb-color-swatch"
          style={swatchStyle}
          onClick={togglePicker}
        />

        {onClear && (
          <button type="button" className="sb-color-clear" onClick={onClear}>
            Сбросить
          </button>
        )}
      </div>

      {open && (
        <div className="sb-color-popover">
          <HexAlphaColorPicker
            color={color}
            style={{ width: '100%' }}
            onChange={(next) => {
              const safe = normalizeHexAlpha(next, color);

              setDraft(safe);
              onChange(safe);
            }}
          />
        </div>
      )}
    </div>
  );
}

export default ColorSwatchField;