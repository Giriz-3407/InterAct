import React from 'react';

/* ─────────────────────────────────────────────────────────
   Comparison data
───────────────────────────────────────────────────────── */
type Mark = 'yes' | 'no' | 'partial';

interface Feature {
  label: string;
  interact: Mark;
  zoom: Mark;
  meet: Mark;
  teams: Mark;
}

const features: Feature[] = [
  { label: 'Live cursor tracking',         interact: 'yes', zoom: 'no',      meet: 'no',  teams: 'no' },
  { label: 'Click-to-highlight indicators',interact: 'yes', zoom: 'no',      meet: 'no',  teams: 'no' },
  { label: 'Ephemeral auto-delete rooms',  interact: 'yes', zoom: 'no',      meet: 'no',  teams: 'no' },
  { label: 'No account required to join',  interact: 'yes', zoom: 'no',      meet: 'no',  teams: 'no' },
  { label: 'Real-time screen annotation',  interact: 'yes', zoom: 'partial', meet: 'no',  teams: 'partial' },
  { label: 'AI session insights',          interact: 'yes', zoom: 'partial', meet: 'no',  teams: 'partial' },
  { label: 'Zero data persistence',        interact: 'yes', zoom: 'no',      meet: 'no',  teams: 'no' },
  { label: 'Sub-200ms collaboration',      interact: 'yes', zoom: 'no',      meet: 'no',  teams: 'no' },
  { label: 'Instant room creation',        interact: 'yes', zoom: 'no',      meet: 'no',  teams: 'no' },
];

/* ─────────────────────────────────────────────────────────
   Cell mark component
───────────────────────────────────────────────────────── */
const Mark: React.FC<{ value: Mark; highlight?: boolean }> = ({ value, highlight }) => {
  if (value === 'yes') {
    return (
      <div className="flex justify-center">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${highlight ? 'bg-[#c0c1ff]/15' : 'bg-emerald-500/10'}`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke={highlight ? '#c0c1ff' : '#10b981'} strokeWidth="2.5" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      </div>
    );
  }
  if (value === 'partial') {
    return (
      <div className="flex justify-center">
        <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center">
          <span className="text-amber-500 text-xs font-bold leading-none">~</span>
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-center">
      <div className="w-6 h-6 rounded-full bg-zinc-800/40 flex items-center justify-center">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
          stroke="#52525b" strokeWidth="2.5" strokeLinecap="round">
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   Legend row
───────────────────────────────────────────────────────── */
const LegendItem: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div className="flex items-center gap-1.5">
    <span className="inline-block w-2 h-2 rounded-full" style={{ background: color }} />
    <span className="text-xs text-zinc-500">{label}</span>
  </div>
);

/* ─────────────────────────────────────────────────────────
   Main section
───────────────────────────────────────────────────────── */
export const ComparisonSection: React.FC = () => (
  <section id="comparison" className="lp-section border-t border-[#1e1e21]">
    <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="text-center mb-12 lp-reveal">
        <span className="lp-badge mb-4 inline-flex">Positioning</span>
        <h2
          className="font-geist font-black text-white tracking-tight leading-tight mb-4"
          style={{ fontSize: 'clamp(28px, 4vw, 44px)' }}
        >
          Not another{' '}
          <span className="lp-gradient-text">meeting tool.</span>
        </h2>
        <p className="text-zinc-400 text-base max-w-md mx-auto leading-relaxed">
          Every meeting tool focuses on video calls. InterAct was built from scratch for{' '}
          <span className="text-zinc-200">real-time collaboration</span> — the work that happens between the talking.
        </p>
      </div>

      {/* Comparison table — scrollable on mobile */}
      <div className="lp-reveal lp-reveal-d1 overflow-x-auto -mx-4 sm:mx-0">
        <div className="min-w-[600px] sm:min-w-0 px-4 sm:px-0">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_100px_100px_100px_100px] gap-0 mb-2">
            <div /> {/* Feature label column */}
            {/* InterAct — highlighted */}
            <div className="flex flex-col items-center gap-1 px-2 py-3 rounded-t-lg bg-[#c0c1ff]/5 border-x border-t border-[#c0c1ff]/15">
              <span className="text-[11px] font-black font-geist text-[#c0c1ff] tracking-wide">InterAct</span>
              <span className="text-[9px] text-[#c0c1ff]/60 font-geist">You're here</span>
            </div>
            {['Zoom', 'Google Meet', 'Teams'].map(tool => (
              <div key={tool} className="flex flex-col items-center gap-1 px-2 py-3">
                <span className="text-[11px] font-semibold font-geist text-zinc-400">{tool}</span>
                <span className="text-[9px] text-zinc-600 font-geist">Legacy</span>
              </div>
            ))}
          </div>

          {/* Feature rows */}
          <div className="rounded-xl overflow-hidden border border-[#1e1e21]">
            {features.map((feature, i) => (
              <div
                key={feature.label}
                className={`grid grid-cols-[1fr_100px_100px_100px_100px] gap-0 items-center ${
                  i !== features.length - 1 ? 'border-b border-[#1a1a1d]' : ''
                }`}
              >
                {/* Label */}
                <div className="px-4 py-3 text-sm text-zinc-300 font-inter">
                  {feature.label}
                </div>
                {/* InterAct — highlighted column bg */}
                <div className="py-3 bg-[#c0c1ff]/[0.03] border-x border-[#c0c1ff]/10">
                  <Mark value={feature.interact} highlight />
                </div>
                <div className="py-3">
                  <Mark value={feature.zoom} />
                </div>
                <div className="py-3">
                  <Mark value={feature.meet} />
                </div>
                <div className="py-3">
                  <Mark value={feature.teams} />
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5 mt-4 px-1">
            <LegendItem color="#10b981" label="Supported" />
            <LegendItem color="#f59e0b" label="Partial" />
            <LegendItem color="#3f3f46" label="Not available" />
          </div>
        </div>
      </div>

      {/* Bottom callout */}
      <div className="lp-reveal lp-reveal-d2 mt-10 bg-[#111113] border border-[#1e1e21] rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8">
        <div className="flex-1">
          <p className="text-base font-semibold font-geist text-zinc-200 mb-1">
            The difference is in what happens during the call.
          </p>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Live cursors, click indicators and AI insights aren't features Zoom can bolt on — they require a platform designed for collaboration first.
          </p>
        </div>
        <div className="flex-shrink-0">
          <a
            href="#features"
            onClick={e => {
              e.preventDefault();
              document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="lp-btn-ghost text-sm whitespace-nowrap"
          >
            See all features
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  </section>
);
