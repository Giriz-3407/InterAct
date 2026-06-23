import React from 'react';
import { useNavigate } from 'react-router-dom';

export const FinalCTASection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="lp-section relative overflow-hidden border-t border-[#1e1e21]">
      {/* Dot grid background */}
      <div className="absolute inset-0 lp-dot-grid opacity-30 pointer-events-none" />

      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.12) 0%, transparent 65%)',
        }}
      />

      {/* Top border accent */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-px"
        style={{
          background: 'linear-gradient(to right, transparent, rgba(192,193,255,0.4), transparent)',
        }}
      />

      <div className="relative max-w-3xl mx-auto text-center lp-reveal">
        {/* Badge */}
        <div className="flex justify-center mb-6">
          <span className="lp-badge">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Free to start — no credit card
          </span>
        </div>

        {/* Headline */}
        <h2
          className="font-geist font-black text-white tracking-tight leading-[1.08] mb-5"
          style={{ fontSize: 'clamp(32px, 5vw, 60px)' }}
        >
          Your team can start{' '}
          <span className="lp-gradient-text">collaborating in 30 seconds.</span>
        </h2>

        {/* Sub */}
        <p className="text-zinc-400 text-base sm:text-lg leading-relaxed max-w-xl mx-auto mb-8">
          No setup. No downloads. No accounts for participants.{' '}
          <span className="text-zinc-300">Just a link and a room that works.</span>
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="lp-btn-primary w-full sm:w-auto"
            style={{ padding: '12px 28px', fontSize: '15px' }}
          >
            Create Free Room
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="lp-btn-ghost w-full sm:w-auto"
            style={{ padding: '12px 28px', fontSize: '15px' }}
          >
            Schedule a Demo
          </button>
        </div>

        {/* Trust strip */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8">
          {[
            'No sign-up required',
            'Rooms auto-delete',
            'Zero data persistence',
            '< 200ms latency',
          ].map((item, i) => (
            <span key={i} className="flex items-center gap-1.5 text-xs text-zinc-600 font-geist">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                stroke="#52525b" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};
