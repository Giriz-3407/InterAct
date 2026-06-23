import React from 'react';
import { useNavigate } from 'react-router-dom';

/* ─────────────────────────────────────────────────────────
   Feature visual panels — pure JSX illustrations
───────────────────────────────────────────────────────── */

/** Feature 1: Latency monitor */
const LatencyVisual: React.FC = () => {
  const peers = [
    { name: 'Alex',   ms: 142, pct: 72 },
    { name: 'Jordan', ms: 156, pct: 78 },
    { name: 'Sam',    ms: 138, pct: 69 },
    { name: 'Maya',   ms: 161, pct: 81 },
  ];
  return (
    <div className="bg-[#0d0d10] border border-[#1e1e21] rounded-xl p-5 sm:p-6 h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[11px] font-semibold font-geist text-zinc-400 uppercase tracking-widest">
          Live Latency Monitor
        </span>
      </div>
      <div className="space-y-4">
        {peers.map(p => (
          <div key={p.name}>
            <div className="flex justify-between items-baseline mb-1.5">
              <span className="text-sm font-geist text-zinc-300">{p.name}</span>
              <span className="text-sm font-mono font-bold text-[#c0c1ff]">{p.ms}ms</span>
            </div>
            <div className="h-1.5 bg-[#1e1e21] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#c0c1ff] to-[#8083ff] rounded-full transition-all"
                style={{ width: `${p.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 pt-4 border-t border-[#1a1a1d] flex items-center justify-between">
        <span className="text-xs text-zinc-500 font-geist">Avg. round-trip</span>
        <span className="text-xl font-black font-geist text-[#c0c1ff]">{'< 160ms'}</span>
      </div>
    </div>
  );
};

/** Feature 2: Multi-participant grid */
const ScreenShareVisual: React.FC = () => {
  const tiles = [
    { initials: 'AH', label: 'SHARING', color: 'bg-rose-500', accent: 'border-rose-500/40 bg-rose-500/5' },
    { initials: 'JK', label: 'Active',  color: 'bg-emerald-500', accent: 'border-[#1e1e21]' },
    { initials: 'SR', label: 'Active',  color: 'bg-violet-500', accent: 'border-[#1e1e21]' },
    { initials: 'MC', label: 'Active',  color: 'bg-amber-500', accent: 'border-[#1e1e21]' },
  ];
  return (
    <div className="bg-[#0d0d10] border border-[#1e1e21] rounded-xl p-4 h-full">
      <div className="flex items-center gap-2 mb-4">
        <svg className="text-zinc-400" width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </svg>
        <span className="text-[11px] font-semibold font-geist text-zinc-400 uppercase tracking-widest">4 Participants</span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] font-geist text-zinc-500">REC</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {tiles.map(t => (
          <div
            key={t.initials}
            className={`aspect-video rounded-lg border flex flex-col items-center justify-center gap-1.5 ${t.accent}`}
          >
            <div className={`w-8 h-8 rounded-full ${t.color} flex items-center justify-center text-xs font-bold font-geist text-white`}>
              {t.initials}
            </div>
            {t.label === 'SHARING' ? (
              <span className="text-[9px] font-bold font-geist text-rose-400 uppercase tracking-wider">● Sharing</span>
            ) : (
              <span className="text-[9px] font-geist text-zinc-600">{t.label}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

/** Feature 3: AI summary panel */
const AIVisual: React.FC = () => (
  <div className="bg-[#0d0d10] border border-[#1e1e21] rounded-xl overflow-hidden h-full">
    <div className="px-4 py-3 border-b border-[#1a1a1d] flex items-center gap-2">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L14.5 9H22L16 13.5L18.5 20.5L12 16L5.5 20.5L8 13.5L2 9H9.5L12 2Z"
          fill="#c0c1ff" />
      </svg>
      <span className="text-[11px] font-semibold font-geist text-[#c0c1ff] uppercase tracking-widest">AI Insights</span>
      <span className="ml-auto text-[9px] font-geist text-zinc-600">Live</span>
    </div>
    <div className="p-4 space-y-4">
      <div>
        <p className="text-[10px] font-semibold font-geist text-zinc-500 uppercase tracking-wider mb-2">Summary</p>
        <p className="text-sm text-zinc-300 leading-relaxed">
          Team reviewed the design system token structure. Agreed on a new color scale approach for dark mode.
        </p>
      </div>
      <div className="h-px bg-[#1a1a1d]" />
      <div>
        <p className="text-[10px] font-semibold font-geist text-zinc-500 uppercase tracking-wider mb-2">Action Items (2)</p>
        <div className="space-y-1.5">
          {['Update token schema in Figma', 'Open PR for Button component refactor'].map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="w-4 h-4 rounded border border-[#27272a] flex-shrink-0 mt-0.5" />
              <span className="text-sm text-zinc-400">{item}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="h-px bg-[#1a1a1d]" />
      <div>
        <p className="text-[10px] font-semibold font-geist text-zinc-500 uppercase tracking-wider mb-2">Key Decisions</p>
        <div className="flex items-start gap-2">
          <svg className="flex-shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="#10b981" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="text-sm text-zinc-400">Adopt v2 token schema across all components</span>
        </div>
      </div>
    </div>
  </div>
);

/** Feature 4: Ephemeral room lifecycle */
const EphemeralVisual: React.FC = () => {
  const steps = [
    { icon: '⚡', label: 'Create',    sub: 'Instant link',     active: false, done: true  },
    { icon: '🔗', label: 'Join',      sub: 'Share link',       active: false, done: true  },
    { icon: '▶', label: 'Collaborate',sub: 'Work together',   active: true,  done: false },
    { icon: '✓', label: 'Closes',    sub: 'Auto-deleted',     active: false, done: false },
  ];
  return (
    <div className="bg-[#0d0d10] border border-[#1e1e21] rounded-xl p-5 sm:p-6 h-full">
      <div className="flex items-center gap-2 mb-6">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="#c0c1ff" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span className="text-[11px] font-semibold font-geist text-zinc-400 uppercase tracking-widest">Session Lifecycle</span>
      </div>

      {/* Vertical timeline */}
      <div className="relative pl-6">
        {/* Connecting line */}
        <div className="absolute left-[11px] top-2 bottom-8 w-px bg-[#1e1e21]" />

        <div className="space-y-6">
          {steps.map((step, i) => (
            <div key={i} className="relative flex items-start gap-4">
              {/* Node */}
              <div
                className={`absolute -left-6 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 z-10 text-[9px] ${
                  step.done
                    ? 'border-emerald-500 bg-emerald-500/15'
                    : step.active
                    ? 'border-[#c0c1ff] bg-[#c0c1ff]/15'
                    : 'border-[#27272a] bg-[#0d0d10]'
                }`}
              >
                {step.done && (
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none"
                    stroke="#10b981" strokeWidth="3" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {step.active && <span className="w-1.5 h-1.5 rounded-full bg-[#c0c1ff]" />}
              </div>

              {/* Content */}
              <div>
                <p className={`text-sm font-semibold font-geist mb-0.5 ${
                  step.active ? 'text-[#c0c1ff]' : step.done ? 'text-zinc-300' : 'text-zinc-500'
                }`}>
                  {step.label}
                  {step.active && <span className="ml-2 text-[9px] bg-[#c0c1ff]/10 text-[#c0c1ff] px-1.5 py-0.5 rounded-full font-geist">Now</span>}
                </p>
                <p className="text-xs text-zinc-500">{step.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-[#1a1a1d]">
        <p className="text-xs text-zinc-500 leading-relaxed">
          When the last participant leaves, the room and all session data are{' '}
          <span className="text-zinc-300">permanently deleted</span>. Zero cleanup required.
        </p>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   Feature data
───────────────────────────────────────────────────────── */
interface FeatureShowcase {
  eyebrow: string;
  headline: string;
  body: string;
  bullets: string[];
  visual: React.FC;
  flip: boolean; // if true: visual left, text right
}

const showcases: FeatureShowcase[] = [
  {
    eyebrow: 'Performance',
    headline: "Feel like you\u2019re in the same room.",
    body: 'Built on WebRTC with optimal peer-to-peer routing. Every keystroke, cursor move and click is transmitted in under 200ms — so collaboration feels natural, not laggy.',
    bullets: [
      'Under 160ms average P2P latency',
      'WebRTC with STUN/TURN for any network',
      'Adaptive bitrate for stable connections',
    ],
    visual: LatencyVisual,
    flip: false,
  },
  {
    eyebrow: 'Screen + Voice',
    headline: 'See exactly what they see.',
    body: 'Crystal-clear screen sharing with synchronized voice. Every scroll, click and cursor movement is shared in real time — so you can point at things instead of describing them.',
    bullets: [
      'HD screen share with zero plugin required',
      'Spatial voice tied to cursor position',
      'Click indicators visible to all participants',
    ],
    visual: ScreenShareVisual,
    flip: true,
  },
  {
    eyebrow: 'AI Intelligence',
    headline: 'Your AI that actually pays attention.',
    body: 'InterAct listens, understands and surfaces what matters. Action items, decisions and context are captured automatically — so your team can focus on the work, not the notes.',
    bullets: [
      'Auto-generated session summaries',
      'Action items detected in real time',
      'Key decisions logged with context',
    ],
    visual: AIVisual,
    flip: false,
  },
  {
    eyebrow: 'Privacy First',
    headline: 'Zero clutter. Every session.',
    body: 'Rooms exist only as long as you need them. The moment everyone leaves, the room and all its data are permanently deleted. No meeting history, no lingering data — by design.',
    bullets: [
      'Rooms auto-delete when empty',
      'No recordings stored by default',
      'No persistent user accounts required',
    ],
    visual: EphemeralVisual,
    flip: true,
  },
];

/* ─────────────────────────────────────────────────────────
   Main section
───────────────────────────────────────────────────────── */
export const FeaturesSection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section id="features" className="lp-section border-t border-[#1e1e21]">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16 lp-reveal">
          <span className="lp-badge mb-4 inline-flex">Features</span>
          <h2
            className="font-geist font-black text-white tracking-tight leading-tight mb-4"
            style={{ fontSize: 'clamp(28px, 4vw, 44px)' }}
          >
            Built for{' '}
            <span className="lp-gradient-text">how teams actually work.</span>
          </h2>
          <p className="text-zinc-400 text-base max-w-md mx-auto leading-relaxed">
            Every feature is designed around one principle: remove friction between an idea and getting it done.
          </p>
        </div>

        {/* Alternating feature blocks */}
        <div className="space-y-20 sm:space-y-28">
          {showcases.map((item, i) => {
            const Visual = item.visual;
            return (
              <div
                key={i}
                className={`lp-reveal flex flex-col ${
                  item.flip ? 'lg:flex-row-reverse' : 'lg:flex-row'
                } gap-10 lg:gap-16 items-center`}
              >
                {/* Text */}
                <div className="flex-1 min-w-0">
                  <span className="lp-badge mb-4 inline-flex">{item.eyebrow}</span>
                  <h3
                    className="font-geist font-black text-white tracking-tight leading-tight mb-4"
                    style={{ fontSize: 'clamp(22px, 3vw, 34px)' }}
                  >
                    {item.headline}
                  </h3>
                  <p className="text-zinc-400 text-base leading-relaxed mb-6">{item.body}</p>
                  <ul className="space-y-3">
                    {item.bullets.map((b, bi) => (
                      <li key={bi} className="flex items-start gap-3 text-sm text-zinc-300">
                        <svg className="flex-shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24"
                          fill="none" stroke="#c0c1ff" strokeWidth="2.5" strokeLinecap="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {b}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="lp-btn-ghost text-sm mt-8"
                  >
                    Try it now
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Visual */}
                <div className="flex-1 min-w-0 w-full">
                  <Visual />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
