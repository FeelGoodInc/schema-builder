import { registerComponent } from './componentRegistry';

function SignalLamp({ size }: { size: number }) {
  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          inset: '30%',
          borderRadius: '50%',
          background: '#f76808',
          boxShadow: '0 0 0 2px #fff inset',
        }}
      />
      <div className="sb-lamp-ring" style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `${Math.max(1, size * 0.06)}px solid #f76808` }} />
    </div>
  );
}

function ZoneMarker({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size * 0.6,
        borderRadius: size * 0.12,
        background: '#5c6bc0',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.max(8, size * 0.22),
        fontWeight: 700,
        letterSpacing: 1,
      }}
    >
      ZONE
    </div>
  );
}

function Barrier({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size * 0.35,
        border: `${Math.max(1, size * 0.03)}px solid #272e3a`,
        background:
          'repeating-linear-gradient(45deg, #ffb400 0 8px, #272e3a 8px 16px)',
      }}
    />
  );
}

function Gauge({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="46" fill="#eef3f8" stroke="#272e3a" strokeWidth="4" />
      <line x1="50" y1="50" x2="80" y2="30" stroke="#d62828" strokeWidth="5" strokeLinecap="round" />
      <circle cx="50" cy="50" r="6" fill="#272e3a" />
    </svg>
  );
}

registerComponent('demo.signal-lamp', SignalLamp, { title: 'Сигнальная лампа', defaultSize: 64 });
registerComponent('demo.zone-marker', ZoneMarker, { title: 'Маркер зоны', defaultSize: 120 });
registerComponent('demo.barrier', Barrier, { title: 'Барьер', defaultSize: 140 });
registerComponent('demo.gauge', Gauge, { title: 'Манометр', defaultSize: 80 });

export {};
