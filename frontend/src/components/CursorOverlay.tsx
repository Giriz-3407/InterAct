import React from 'react';
import type { RemoteCursor } from '../hooks/useCursorPresence';

// ---------------------------------------------------------------------------
// Stable colour palette — one colour per participant, assigned by index
// ---------------------------------------------------------------------------
const CURSOR_COLORS = [
  '#22d3ee', // cyan-400
  '#fb923c', // orange-400
  '#f472b6', // pink-400
  '#a3e635', // lime-400
  '#818cf8', // indigo-400
  '#34d399', // emerald-400
  '#fbbf24', // amber-400
  '#e879f9', // fuchsia-400
];

// Build a deterministic colour from participantId so the colour never flickers
// across re-renders even if the cursors Map key-order changes.
function colorForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return CURSOR_COLORS[hash % CURSOR_COLORS.length];
}

// ---------------------------------------------------------------------------
// SVG cursor arrow
// ---------------------------------------------------------------------------
function CursorSVG({ color }: { color: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))' }}
    >
      {/* Arrow outline */}
      <path
        d="M3 2L17 9.5L10.5 11L7.5 17.5L3 2Z"
        fill={color}
        stroke="rgba(0,0,0,0.5)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface CursorOverlayProps {
  cursors: Map<string, RemoteCursor>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const CursorOverlay: React.FC<CursorOverlayProps> = ({ cursors }) => {
  // [Runtime] log 6 — fires on every render of this component
  console.log('[Runtime] rendering', cursors.size, 'cursors');

  if (cursors.size === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 20,
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      {Array.from(cursors.values()).map((cursor) => {
        const color = colorForId(cursor.participantId);
        return (
          <div
            key={cursor.participantId}
            style={{
              position: 'absolute',
              left: `${cursor.x * 100}%`,
              top: `${cursor.y * 100}%`,
              transform: 'translate(0, 0)',
              transition: 'left 50ms linear, top 50ms linear',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '2px',
            }}
          >
            {/* Arrow */}
            <CursorSVG color={color} />

            {/* Name badge */}
            <span
              style={{
                marginLeft: '4px',
                padding: '1px 6px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 600,
                fontFamily: 'Inter, sans-serif',
                color: '#0d1117',
                backgroundColor: color,
                whiteSpace: 'nowrap',
                lineHeight: '16px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
              }}
            >
              {cursor.displayName}
            </span>
          </div>
        );
      })}
    </div>
  );
};
