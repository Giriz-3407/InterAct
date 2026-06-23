import React from 'react';
import { useNavigate } from 'react-router-dom';

const useCases = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    label: 'Remote Engineering',
    headline: 'Debug and ship together.',
    body: 'Pair on bugs, walk through PRs, and review architecture with live cursors pointing at exactly the right lines of code.',
    tag: 'Engineering',
    color: 'text-violet-400',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    label: 'Pair Programming',
    headline: 'Code like you are side by side.',
    body: 'Real-time screen sharing with click indicators so your pair always knows what you are looking at. No more file-sharing loops.',
    tag: 'Development',
    color: 'text-sky-400',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
    label: 'Product Demos',
    headline: 'Show, not tell.',
    body: 'Walk prospects through your product in real time. Annotate, highlight, and demonstrate with live cursor presence that makes the value clear.',
    tag: 'Sales',
    color: 'text-emerald-400',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    ),
    label: 'Educator Sessions',
    headline: 'Teach with full context.',
    body: 'Students see exactly what you see. Share your terminal, browser, or whiteboard. Track confusion with cursor positions and click activity.',
    tag: 'Education',
    color: 'text-amber-400',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    label: 'Customer Support',
    headline: 'Resolve issues instantly.',
    body: 'See the customer screen, guide their cursor, and solve problems in real time. No more back-and-forth descriptions.',
    tag: 'Support',
    color: 'text-rose-400',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
    label: 'Design Reviews',
    headline: 'Point at pixels, not descriptions.',
    body: 'Annotate mockups, share Figma screens, and collect feedback with live cursors that eliminate ambiguity from design critiques.',
    tag: 'Design',
    color: 'text-[#c0c1ff]',
  },
];

export const UseCasesSection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section id="use-cases" className="lp-section border-t border-[#1e1e21]">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12 lp-reveal">
          <span className="lp-badge mb-4 inline-flex">Use Cases</span>
          <h2
            className="font-geist font-black text-white tracking-tight leading-tight mb-4"
            style={{ fontSize: 'clamp(28px, 4vw, 44px)' }}
          >
            Works for{' '}
            <span className="lp-gradient-text">every kind of team.</span>
          </h2>
          <p className="text-zinc-400 text-base max-w-md mx-auto leading-relaxed">
            Whether you are shipping code, teaching students, or closing deals — InterAct adapts to how you work.
          </p>
        </div>

        {/* Use case grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {useCases.map((uc, i) => (
            <div
              key={i}
              className={`lp-use-card lp-reveal lp-reveal-d${Math.min(i + 1, 6)}`}
            >
              {/* Icon + tag row */}
              <div className="flex items-start justify-between mb-4">
                <div className={uc.color}>
                  {uc.icon}
                </div>
                <span className="text-[10px] font-semibold font-geist text-zinc-600 uppercase tracking-wider bg-[#1a1a1d] px-2 py-1 rounded-md">
                  {uc.tag}
                </span>
              </div>

              {/* Label */}
              <p className="text-[11px] font-semibold font-geist text-zinc-500 uppercase tracking-widest mb-1.5">
                {uc.label}
              </p>

              {/* Headline */}
              <h3 className="text-base font-bold font-geist text-zinc-100 leading-snug mb-2">
                {uc.headline}
              </h3>

              {/* Body */}
              <p className="text-sm text-zinc-500 leading-relaxed">
                {uc.body}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12 lp-reveal">
          <p className="text-zinc-500 text-sm mb-4">
            Your use case not listed? InterAct works for any scenario where pointing matters.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="lp-btn-primary text-sm"
          >
            Start for free
          </button>
        </div>
      </div>
    </section>
  );
};
