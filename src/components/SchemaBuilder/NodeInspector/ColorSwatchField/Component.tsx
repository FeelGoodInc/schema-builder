'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { HexAlphaColorPicker } from 'react-colorful';
import { normalizeHexAlpha } from '../../lib/color';

interface ColorSwatchFieldProps {
  label: string;
  value?: string;
  fallback: string;
  onChange: (color: string) => void;
  onClear?: () => void;
}

export default function ColorSwatchField({ label, value, fallback, onChange, onClear }: ColorSwatchFieldProps) {
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
      <span className="sb-color-label">{label}</span>
      <div className="sb-color-control">
        <button
          type="button"
          className="sb-color-swatch"
          style={swatchStyle}
          aria-label={label}
          title={label}
          onClick={togglePicker}
        />
        {onClear ? (
          <button type="button" className="sb-color-clear" onClick={onClear}>
            Сбросить
          </button>
        ) : null}
      </div>
      {open ? (
        <div className="sb-color-popover">
          <HexAlphaColorPicker
            color={color}
            style={{ width: '100%' }}
            onChange={(next) => {
              const safe = normalizeHexAlpha(next, color);
              setDraft(safe);
              onChange(safe);
            }}
            onChangeEnd={closePicker}
          />
        </div>
      ) : null}
    </div>
  );
}