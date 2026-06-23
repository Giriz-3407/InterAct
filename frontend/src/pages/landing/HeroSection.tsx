import React from 'react';
import { useNavigate } from 'react-router-dom';

/* ─────────────────────────────────────────────────────────
   Waveform bars — animated voice indicator
───────────────────────────────────────────────────────── */
const WaveformBars: React.FC<{ color?: string }> = ({ color = '#c0c1ff' }) => (
  <div className="flex items-end gap-[2px]" style={{ height: '14px', width: '22px' }}>
    {[0, 100, 220, 340, 220, 100, 0].map((delay, i) => (
      <div
        key={i}
        style={{
          width: '2px',
          height: '100%',
          background: color,
          borderRadius: '1px',
          transformOrigin: 'bottom',
          animation: `waveform 0.85s ease-in-out ${delay}ms infinite`,
          transform: 'scaleY(0.3)',
        }}
      />
    ))}
  </div>
);

/* ─────────────────────────────────────────────────────────
   Live cursor SVG
───────────────────────────────────────────────────────── */
const CursorIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={color}>
    <path d="M4 2L20 10.5L12.5 13L9.5 20L4 2Z" />
  </svg>
);

/* ─────────────────────────────────────────────────────────
   Workspace mockup — shown inside the hero
───────────────────────────────────────────────────────── */
const participants = [
  { initials: 'AH', name: 'Alex H.',   color: '#f43f5e', bgColor: 'bg-rose-500/20',    textColor: 'text-rose-400',    speaking: true  },
  { initials: 'JK', name: 'Jordan K.', color: '#10b981', bgColor: 'bg-emerald-500/20', textColor: 'text-emerald-400', speaking: false },
  { initials: 'SR', name: 'Sam R.',    color: '#8b5cf6', bgColor: 'bg-violet-500/20',  textColor: 'text-violet-400',  speaking: false },
  { initials: 'MC', name: 'Maya C.',   color: '#f59e0b', bgColor: 'bg-amber-500/20',   textColor: 'text-amber-400',   speaking: false },
];

const chatMessages = [
  { initials: 'AH', color: 'bg-rose-500',    name: 'Alex',   text: 'Can everyone see my screen?',        time: '2:14 PM' },
  { initials: 'JK', color: 'bg-emerald-500', name: 'Jordan', text: 'Yes! Moving cursor to line 8 →',     time: '2:14 PM' },
  { initials: 'SR', color: 'bg-violet-500',  name: 'Sam',    text: 'Looks great. Annotating now 🔥',     time: '2:15 PM' },
];

const WorkspaceMockup: React.FC = () => (
  <div
    className="w-full rounded-xl overflow-hidden bg-[#0d0d10]"
    style={{
      border: '1px solid #1e1e21',
      boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 32px 64px -16px rgba(0,0,0,0.8)',
    }}
  >
    {/* Browser chrome */}
    <div className="h-9 bg-[#111113] border-b border-[#1e1e21] flex items-center px-3 gap-3 flex-shrink-0">
      {/* Traffic lights */}
      <div className="flex gap-1.5 flex-shrink-0">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
      </div>
      {/* URL bar */}
      <div className="flex-1 min-w-0 mx-auto max-w-[220px] sm:max-w-xs">
        <div className="bg-[#09090b] rounded-md px-3 h-5 flex items-center overflow-hidden">
          <span className="text-[10px] text-zinc-500 font-mono truncate">interact.app/room/design-q2</span>
        </div>
      </div>
      {/* LIVE indicator */}
      <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        <span className="text-[10px] font-semibold font-geist text-zinc-400 hidden sm:block">REC</span>
        <span className="hidden sm:block text-[10px] text-zinc-600">·</span>
        <span className="text-[10px] font-semibold font-geist text-emerald-400">LIVE</span>
      </div>
    </div>

    {/* Workspace panels */}
    <div className="flex" style={{ height: 'clamp(280px, 40vw, 420px)' }}>

      {/* Left: Participants — hidden on mobile */}
      <div className="hidden sm:flex w-40 lg:w-48 flex-shrink-0 border-r border-[#1a1a1d] flex-col bg-[#0d0d10]">
        {/* Room label */}
        <div className="px-3 pt-3 pb-2 border-b border-[#1a1a1d]">
          <p className="text-[9px] font-semibold font-geist text-zinc-500 uppercase tracking-widest mb-1">Room</p>
          <p className="text-[11px] font-semibold font-geist text-zinc-200 truncate">design-q2</p>
        </div>

        {/* Participants list */}
        <div className="px-2 pt-2 flex-1 overflow-hidden">
          <p className="text-[9px] font-semibold font-geist text-zinc-500 uppercase tracking-widest px-1 mb-2">Participants (4)</p>
          <div className="flex flex-col gap-0.5">
            {participants.map(p => (
              <div
                key={p.initials}
                className={`flex items-center gap-2 px-1.5 py-1.5 rounded-md ${p.speaking ? 'bg-[#1a1a1d]' : ''}`}
              >
                {/* Avatar */}
                <div
                  className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold font-geist ${p.bgColor} ${p.textColor}`}
                >
                  {p.initials}
                </div>
                {/* Name + status */}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium font-geist text-zinc-300 truncate">{p.name}</p>
                  {p.speaking ? (
                    <p className="text-[9px] text-[#c0c1ff] font-geist">Speaking</p>
                  ) : (
                    <p className="text-[9px] text-zinc-600 font-geist">Active</p>
                  )}
                </div>
                {/* Waveform or mute */}
                {p.speaking
                  ? <WaveformBars color={p.color} />
                  : (
                    <svg className="flex-shrink-0 opacity-30" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2">
                      <path d="M12 2c-1.7 0-3 1.3-3 3v7c0 1.7 1.3 3 3 3s3-1.3 3-3V5c0-1.7-1.3-3-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    </svg>
                  )
                }
              </div>
            ))}
          </div>
        </div>

        {/* Voice section header */}
        <div className="px-3 py-2 mt-auto border-t border-[#1a1a1d]">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[9px] font-geist text-zinc-400">Voice connected</span>
          </div>
        </div>
      </div>

      {/* Centre: Screen share canvas */}
      <div className="flex-1 bg-[#0a0a0c] relative overflow-hidden flex flex-col">
        {/* Screen share header bar */}
        <div className="h-7 bg-[#0d0d10] border-b border-[#1a1a1d] flex items-center px-3 gap-2 flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-rose-500/70" />
          <span className="text-[10px] font-geist text-zinc-400">Alex H. is sharing screen</span>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-[9px] font-geist text-zinc-600">design-system.tsx</span>
          </div>
        </div>

        {/* Code editor simulation */}
        <div className="flex-1 overflow-hidden relative">
          {/* Line numbers */}
          <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-9 bg-[#0d0d10] border-r border-[#1a1a1d] flex flex-col pt-3 select-none hidden sm:flex">
            {Array.from({ length: 14 }, (_, i) => (
              <div key={i} className="flex items-center justify-end pr-2 text-[9px] font-mono text-zinc-700 leading-5">
                {i + 1}
              </div>
            ))}
          </div>

          {/* Code content */}
          <div className="absolute inset-0 sm:left-9 pt-3 pb-2 px-3 font-mono text-[10px] sm:text-[11px] leading-5 overflow-hidden select-none">
            <div className="text-zinc-600">{'// design-system.tsx'}</div>
            <div className="mt-1">
              <span className="text-violet-400">import</span>
              <span className="text-zinc-300"> React </span>
              <span className="text-violet-400">from</span>
              <span className="text-emerald-400"> 'react'</span>
            </div>
            <div>
              <span className="text-violet-400">import</span>
              <span className="text-zinc-300">{' { '}</span>
              <span className="text-sky-400">tokens</span>
              <span className="text-zinc-300">{' } '}</span>
              <span className="text-violet-400">from</span>
              <span className="text-emerald-400"> './tokens'</span>
            </div>
            <div className="mt-2">
              <span className="text-violet-400">export const</span>
              <span className="text-yellow-400"> Button</span>
              <span className="text-zinc-300"> = (</span>
              <span className="text-orange-400">{'{ variant, children }'}</span>
              <span className="text-zinc-300">) </span>
              <span className="text-violet-400">=&gt;</span>
              <span className="text-zinc-300"> {'{'}</span>
            </div>
            <div>
              <span className="text-zinc-300">{'  '}</span>
              <span className="text-violet-400">const</span>
              <span className="text-zinc-300"> styles </span>
              <span className="text-zinc-400">=</span>
              <span className="text-zinc-300"> {'{'}</span>
            </div>
            <div>
              <span className="text-zinc-300">{'    primary: { bg: '}</span>
              <span className="text-emerald-400">tokens.violet</span>
              <span className="text-zinc-300"> {'}'}</span>
            </div>
            <div>
              <span className="text-zinc-300">{'    ghost:   { border: '}</span>
              <span className="text-emerald-400">tokens.zinc</span>
              <span className="text-zinc-300"> {'}'}</span>
            </div>
            <div className="text-zinc-300">{'  }'}</div>
            <div className="mt-1">
              <span className="text-zinc-300">{'  '}</span>
              <span className="text-violet-400">return</span>
              <span className="text-zinc-300"> (</span>
            </div>
            <div>
              <span className="text-zinc-300">{'    '}</span>
              <span className="text-zinc-500">{'<'}</span>
              <span className="text-sky-400">button</span>
              <span className="text-yellow-400"> style</span>
              <span className="text-zinc-300">={'{'}</span>
              <span className="text-zinc-400">styles[variant]</span>
              <span className="text-zinc-300">{'}'}</span>
              <span className="text-zinc-500">{'>'}</span>
            </div>
            <div>
              <span className="text-zinc-300">{'      '}</span>
              <span className="text-zinc-500">{'{'}</span>
              <span className="text-zinc-400">children</span>
              <span className="text-zinc-500">{'}'}</span>
            </div>
            <div>
              <span className="text-zinc-300">{'    '}</span>
              <span className="text-zinc-500">{'</'}</span>
              <span className="text-sky-400">button</span>
              <span className="text-zinc-500">{'>'}</span>
            </div>
            <div className="text-zinc-300">{'  )'}</div>
            <div className="text-zinc-300">{'}'}</div>
          </div>

          {/* Live cursors */}
          <div
            className="absolute flex items-center gap-1"
            style={{ top: '38%', left: '48%' }}
          >
            <CursorIcon color="#f43f5e" />
            <span className="text-[9px] font-semibold font-geist bg-rose-500 text-white px-1.5 py-0.5 rounded-full whitespace-nowrap">
              Alex
            </span>
          </div>
          <div
            className="absolute flex items-center gap-1 hidden sm:flex"
            style={{ top: '64%', left: '28%' }}
          >
            <CursorIcon color="#10b981" />
            <span className="text-[9px] font-semibold font-geist bg-emerald-500 text-white px-1.5 py-0.5 rounded-full whitespace-nowrap">
              Jordan
            </span>
          </div>
        </div>
      </div>

      {/* Right: Chat + AI — hidden on small screens */}
      <div className="hidden lg:flex w-52 xl:w-60 flex-shrink-0 border-l border-[#1a1a1d] flex-col bg-[#0d0d10]">
        {/* Chat tab */}
        <div className="px-3 pt-3 pb-2 border-b border-[#1a1a1d] flex items-center gap-2">
          <span className="text-[10px] font-semibold font-geist text-zinc-200">Chat</span>
          <span className="ml-auto bg-[#c0c1ff]/15 text-[#c0c1ff] text-[9px] font-semibold font-geist px-1.5 py-0.5 rounded-full">3</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-hidden px-2 py-2 flex flex-col gap-2">
          {chatMessages.map((msg, i) => (
            <div key={i} className="flex gap-1.5 items-start">
              <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[8px] font-bold font-geist text-white ${msg.color}`}>
                {msg.initials}
              </div>
              <div>
                <div className="flex items-baseline gap-1.5 mb-0.5">
                  <span className="text-[10px] font-semibold font-geist text-zinc-300">{msg.name}</span>
                  <span className="text-[9px] text-zinc-600">{msg.time}</span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-relaxed">{msg.text}</p>
              </div>
            </div>
          ))}
        </div>

        {/* AI insights strip */}
        <div className="border-t border-[#1a1a1d] px-3 py-2.5 bg-[#0d0d10]">
          <div className="flex items-center gap-1.5 mb-2">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L14.5 9H22L16 13.5L18.5 20.5L12 16L5.5 20.5L8 13.5L2 9H9.5L12 2Z"
                fill="#c0c1ff" />
            </svg>
            <span className="text-[9px] font-semibold font-geist text-[#c0c1ff] uppercase tracking-wider">AI Insights</span>
          </div>
          <div className="flex flex-col gap-1">
            {['Design tokens reviewed', '2 action items found', 'PR review suggested'].map((item, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="text-[#c0c1ff] text-[9px] mt-0.5 flex-shrink-0">◈</span>
                <span className="text-[10px] text-zinc-400 leading-tight">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────
   Hero Section
───────────────────────────────────────────────────────── */
export const HeroSection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="relative pt-24 sm:pt-28 lg:pt-32 pb-0 overflow-hidden">
      {/* Ambient background radials */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center top, rgba(99,102,241,0.14) 0%, transparent 70%)',
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Text block ── */}
        <div className="max-w-3xl mx-auto text-center mb-10 sm:mb-14">
          {/* Badge */}
          <div className="flex justify-center mb-5" style={{ animation: 'lp-slide-up 0.5s ease forwards' }}>
            <span className="lp-badge">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c0c1ff] animate-pulse" />
              Now with AI Meeting Intelligence
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </span>
          </div>

          {/* Headline */}
          <h1
            className="font-geist font-black tracking-tight text-white leading-[1.08] mb-5"
            style={{
              fontSize: 'clamp(36px, 6vw, 68px)',
              animation: 'lp-slide-up 0.5s ease 0.08s both',
            }}
          >
            Real-time collaboration,{' '}
            <span className="lp-gradient-text block sm:inline">minus the overhead.</span>
          </h1>

          {/* Sub-headline */}
          <p
            className="text-base sm:text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed mb-8"
            style={{ animation: 'lp-slide-up 0.5s ease 0.16s both' }}
          >
            Instant rooms. Live cursors. Screen sharing and voice. AI that captures what matters.{' '}
            <span className="text-zinc-300">Ready in under 10 seconds.</span>
          </p>

          {/* CTAs */}
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
            style={{ animation: 'lp-slide-up 0.5s ease 0.24s both' }}
          >
            <button
              onClick={() => navigate('/dashboard')}
              className="lp-btn-primary w-full sm:w-auto text-sm"
            >
              Create Free Room
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="lp-btn-ghost w-full sm:w-auto text-sm"
            >
              Join with a link
            </button>
          </div>

          {/* Trust strip */}
          <div
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 mt-6"
            style={{ animation: 'lp-slide-up 0.5s ease 0.32s both' }}
          >
            {['No sign-up required', 'No credit card', 'Rooms auto-delete'].map((item, i) => (
              <span key={i} className="flex items-center gap-1.5 text-xs text-zinc-500 font-geist">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="#10b981" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* ── Workspace mockup ── */}
        <div
          className="relative max-w-5xl mx-auto"
          style={{ animation: 'lp-fade-in 0.6s ease 0.4s both' }}
        >
          {/* Subtle ambient glow behind mockup */}
          <div
            className="absolute inset-x-8 -top-4 h-24 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.12) 0%, transparent 70%)',
              filter: 'blur(24px)',
            }}
          />
          <WorkspaceMockup />
          {/* Bottom fade to blend into next section */}
          <div
            className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
            style={{
              background: 'linear-gradient(to top, #09090b 0%, transparent 100%)',
            }}
          />
        </div>
      </div>
    </section>
  );
};
