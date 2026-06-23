import React from 'react';

const steps = [
  {
    number: '01',
    headline: 'Create a Room',
    body: 'One click generates an instant collaboration room with a unique link. No account needed, no configuration, no waiting.',
    detail: 'Ready in under 3 seconds',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
  },
  {
    number: '02',
    headline: 'Invite Participants',
    body: 'Share the link via any channel — Slack, email, or just paste it. Recipients join instantly from their browser.',
    detail: 'No downloads, no sign-ups',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
  {
    number: '03',
    headline: 'Collaborate Live',
    body: 'Share your screen, talk with spatial voice, point with live cursors and annotate in real time. AI captures everything.',
    detail: 'All features active instantly',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
  },
  {
    number: '04',
    headline: 'Done — Room Deletes',
    body: 'When the last participant leaves, the room and all its data are permanently and automatically erased. No cleanup, ever.',
    detail: 'Zero data persistence by design',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
];

export const HowItWorksSection: React.FC = () => (
  <section id="how-it-works" className="lp-section border-t border-[#1e1e21]">
    <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="text-center mb-14 lp-reveal">
        <span className="lp-badge mb-4 inline-flex">How It Works</span>
        <h2
          className="font-geist font-black text-white tracking-tight leading-tight mb-4"
          style={{ fontSize: 'clamp(28px, 4vw, 44px)' }}
        >
          From zero to{' '}
          <span className="lp-gradient-text">collaborating in seconds.</span>
        </h2>
        <p className="text-zinc-400 text-base max-w-sm mx-auto leading-relaxed">
          No setup, no training, no waiting. InterAct gets out of the way so your team can focus on the work.
        </p>
      </div>

      {/* Steps — horizontal on desktop, vertical on mobile */}

      {/* Desktop: 4-column grid with connector lines */}
      <div className="hidden lg:grid lg:grid-cols-4 gap-0 lp-reveal lp-reveal-d1">
        {steps.map((step, i) => (
          <div key={i} className="relative flex flex-col items-start px-6 first:pl-0 last:pr-0">
            {/* Connector line */}
            {i < steps.length - 1 && (
              <div
                className="absolute top-[22px] left-1/2 right-0 h-px"
                style={{
                  background: 'linear-gradient(to right, #27272a 0%, #1e1e21 100%)',
                }}
              />
            )}

            {/* Step icon circle */}
            <div className="relative z-10 w-11 h-11 rounded-full border border-[#27272a] bg-[#111113] flex items-center justify-center text-zinc-400 mb-5 flex-shrink-0">
              {step.icon}
            </div>

            {/* Number */}
            <span className="text-[11px] font-black font-geist text-zinc-600 tracking-widest mb-2 uppercase">
              {step.number}
            </span>

            {/* Headline */}
            <h3 className="text-base font-bold font-geist text-zinc-100 mb-2 leading-snug">
              {step.headline}
            </h3>

            {/* Body */}
            <p className="text-sm text-zinc-500 leading-relaxed mb-3">
              {step.body}
            </p>

            {/* Detail tag */}
            <span className="text-[11px] font-geist text-[#c0c1ff] bg-[#c0c1ff]/8 border border-[#c0c1ff]/15 px-2 py-0.5 rounded-full">
              {step.detail}
            </span>
          </div>
        ))}
      </div>

      {/* Mobile / Tablet: vertical timeline */}
      <div className="lg:hidden space-y-0 lp-reveal lp-reveal-d1">
        {steps.map((step, i) => (
          <div key={i} className="relative flex gap-5 pb-8 last:pb-0">
            {/* Vertical connector line */}
            {i < steps.length - 1 && (
              <div className="absolute left-[21px] top-11 bottom-0 w-px bg-[#1e1e21]" />
            )}

            {/* Icon */}
            <div className="relative z-10 w-11 h-11 rounded-full border border-[#27272a] bg-[#111113] flex items-center justify-center text-zinc-400 flex-shrink-0">
              {step.icon}
            </div>

            {/* Content */}
            <div className="flex-1 pt-1.5">
              <span className="text-[10px] font-black font-geist text-zinc-600 tracking-widest uppercase">
                {step.number}
              </span>
              <h3 className="text-base font-bold font-geist text-zinc-100 mt-0.5 mb-1.5 leading-snug">
                {step.headline}
              </h3>
              <p className="text-sm text-zinc-500 leading-relaxed mb-2.5">
                {step.body}
              </p>
              <span className="text-[11px] font-geist text-[#c0c1ff] bg-[#c0c1ff]/8 border border-[#c0c1ff]/15 px-2 py-0.5 rounded-full">
                {step.detail}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);
