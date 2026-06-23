import React from 'react';
import { useNavigate } from 'react-router-dom';

/* ─────────────────────────────────────────────────────────
   AI panel mock — simulated transcript + insights
───────────────────────────────────────────────────────── */
const transcriptLines = [
  { speaker: 'Alex',   color: 'bg-rose-500',    text: 'The new token system makes the codebase way cleaner.' },
  { speaker: 'Jordan', color: 'bg-emerald-500', text: 'Agreed — should we update the Button component first?' },
  { speaker: 'Sam',    color: 'bg-violet-500',  text: 'Yes, and I think we need to address the dark mode tokens.' },
  { speaker: 'Alex',   color: 'bg-rose-500',    text: "Good point. I'll open a PR after this session." },
];

const AIInsightsPanel: React.FC = () => (
  <div className="bg-[#0d0d10] border border-[#1e1e21] rounded-xl overflow-hidden">
    {/* Header */}
    <div className="px-4 py-3 border-b border-[#1a1a1d] flex items-center gap-2.5 bg-[#0f0f12]">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L14.5 9H22L16 13.5L18.5 20.5L12 16L5.5 20.5L8 13.5L2 9H9.5L12 2Z"
          fill="#c0c1ff" />
      </svg>
      <span className="text-sm font-semibold font-geist text-[#c0c1ff]">InterAct AI</span>
      <div className="ml-auto flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[10px] font-geist text-zinc-500">Listening</span>
      </div>
    </div>

    {/* Transcript */}
    <div className="p-4 space-y-3 border-b border-[#1a1a1d]">
      <p className="text-[10px] font-semibold font-geist text-zinc-600 uppercase tracking-widest mb-3">Live Transcript</p>
      {transcriptLines.map((line, i) => (
        <div key={i} className="flex gap-2.5 items-start">
          <div className={`w-5 h-5 rounded-full ${line.color} flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0 mt-0.5`}>
            {line.speaker[0]}
          </div>
          <div>
            <span className="text-[10px] font-semibold font-geist text-zinc-400">{line.speaker} </span>
            <span className="text-[10px] text-zinc-500 leading-relaxed">{line.text}</span>
          </div>
        </div>
      ))}
      {/* Typing indicator */}
      <div className="flex items-center gap-2 pl-7">
        <div className="flex gap-1">
          {[0, 150, 300].map(d => (
            <span
              key={d}
              className="w-1.5 h-1.5 rounded-full bg-zinc-600"
              style={{ animation: `pulse-subtle 1s ease ${d}ms infinite` }}
            />
          ))}
        </div>
        <span className="text-[10px] text-zinc-600">Maya is speaking...</span>
      </div>
    </div>

    {/* Action items */}
    <div className="p-4 space-y-3 border-b border-[#1a1a1d]">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold font-geist text-zinc-600 uppercase tracking-widest">Action Items</p>
        <span className="text-[9px] bg-[#c0c1ff]/10 text-[#c0c1ff] px-1.5 py-0.5 rounded-full font-geist font-semibold">2 detected</span>
      </div>
      {[
        { text: 'Open PR for Button component refactor', owner: 'Alex' },
        { text: 'Address dark mode token gaps', owner: 'Sam' },
      ].map((item, i) => (
        <div key={i} className="flex items-start gap-2.5">
          <div className="w-4 h-4 rounded border border-[#27272a] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-zinc-300 leading-snug">{item.text}</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">→ {item.owner}</p>
          </div>
        </div>
      ))}
    </div>

    {/* Key decision */}
    <div className="p-4">
      <p className="text-[10px] font-semibold font-geist text-zinc-600 uppercase tracking-widest mb-2">Decision Logged</p>
      <div className="flex items-start gap-2">
        <svg className="flex-shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="#10b981" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Adopt new token system across all components starting with Button and Card
        </p>
      </div>
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────
   Main section
───────────────────────────────────────────────────────── */
export const AISection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section id="ai" className="lp-section border-t border-[#1e1e21]">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-center">

          {/* Left: Text */}
          <div className="flex-1 min-w-0 lp-reveal">
            <span className="lp-badge mb-4 inline-flex">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L14.5 9H22L16 13.5L18.5 20.5L12 16L5.5 20.5L8 13.5L2 9H9.5L12 2Z"
                  fill="#c0c1ff" />
              </svg>
              AI Intelligence
            </span>

            <h2
              className="font-geist font-black text-white tracking-tight leading-tight mb-5"
              style={{ fontSize: 'clamp(28px, 3.5vw, 42px)' }}
            >
              Your AI that{' '}
              <span className="lp-gradient-text">actually pays attention.</span>
            </h2>

            <p className="text-zinc-400 text-base leading-relaxed mb-6">
              InterAct listens throughout your session and surfaces the moments that matter — without interrupting the flow of work. When you close the room, your team already has everything they need.
            </p>

            <ul className="space-y-4 mb-8">
              {[
                {
                  headline: 'Live transcription',
                  body: 'Every word attributed to the right speaker, in real time.',
                },
                {
                  headline: 'Action items detected',
                  body: 'AI identifies commitments and assigns them to the right person automatically.',
                },
                {
                  headline: 'Decisions logged',
                  body: 'Key decisions are flagged and summarized so nothing gets forgotten.',
                },
                {
                  headline: 'Session summary',
                  body: 'A clean, shareable recap generated the moment the room closes.',
                },
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#c0c1ff]/12 border border-[#c0c1ff]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                      stroke="#c0c1ff" strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold font-geist text-zinc-200 mb-0.5">{item.headline}</p>
                    <p className="text-sm text-zinc-500 leading-relaxed">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>

            <button
              onClick={() => navigate('/dashboard')}
              className="lp-btn-primary text-sm"
            >
              Try AI insights
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Right: AI panel */}
          <div className="flex-1 min-w-0 w-full lp-reveal lp-reveal-d1">
            <AIInsightsPanel />
          </div>
        </div>
      </div>
    </section>
  );
};
