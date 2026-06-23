import React from 'react';
import { useNavigate } from 'react-router-dom';
import interactLogo from '../assets/branding/interact-icon-dark-mode.svg';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg text-on-surface font-inter flex flex-col selection:bg-indigo-500/30 selection:text-white">
      {/* Radial glow effect in background */}
      <div className="absolute top-0 left-0 w-full h-[700px] hero-gradient pointer-events-none z-0" />

      {/* Navbar */}
      <nav className="sticky top-0 w-full h-14 border-b border-slate-border bg-bg/85 backdrop-blur-md flex items-center justify-between px-6 md:px-12 z-20">
        <div className="flex items-center gap-2">
          <img src={interactLogo} alt="InterAct" className="h-6 w-auto object-contain" />
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-xs font-semibold font-geist text-zinc-400">
          <a href="#features" className="hover:text-zinc-200">Features</a>
          <a href="#pricing" className="hover:text-zinc-200">Pricing</a>
          <a href="#workflow" className="hover:text-zinc-200">How It Works</a>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-1.5 rounded-full text-xs font-semibold font-geist bg-indigo-600 text-zinc-950 hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/10 transition-all cursor-pointer"
        >
          Get Started
        </button>
      </nav>

      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-20 pb-16 md:pt-32 md:pb-28 max-w-4xl mx-auto z-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-3xs font-semibold font-geist bg-indigo-500/10 border border-indigo-500/20 text-[#c0c1ff] mb-6 tracking-wide uppercase">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
          InterAct Collaboration Platform v1.0
        </div>
        
        <h1 className="text-4xl md:text-5xl font-black font-geist text-white tracking-tight leading-[1.1] mb-6">
          Real-time Collaboration <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#c0c1ff] to-[#d0bcff]">
            Made Simple and Fast
          </span>
        </h1>

        <p className="text-sm md:text-base text-zinc-400 font-inter max-w-xl mb-10 leading-relaxed">
          Instantly share your screen, coordinate with live cursors, send real-time click indicators, and chat in temporary, zero-persistence rooms.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 rounded-xl text-sm font-semibold font-geist bg-indigo-600 text-zinc-950 hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/10 transition-all cursor-pointer"
          >
            Create Free Room
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 rounded-xl text-sm font-semibold font-geist bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all cursor-pointer"
          >
            Join with Link
          </button>
        </div>
      </section>

      {/* Product Preview Mockup Container */}
      <section className="px-6 pb-24 z-10">
        <div className="max-w-5xl mx-auto rounded-2xl glass-panel p-2 shadow-2xl">
          <div className="rounded-xl border border-zinc-800 overflow-hidden bg-[#0d1117] aspect-video flex flex-col">
            {/* Header window chrome */}
            <div className="h-8 border-b border-zinc-900 bg-zinc-950/60 px-4 flex items-center justify-between">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <span className="text-3xs font-mono text-zinc-500">interact-workspace-instance-01</span>
              <span className="w-4" />
            </div>
            
            {/* Mock Editor Canvas Content */}
            <div className="flex-1 flex items-center justify-center p-8 bg-zinc-950/20 relative">
              <div className="text-center flex flex-col items-center gap-4 max-w-sm">
                <span className="material-symbols-outlined text-[48px] text-zinc-700">cast_connected</span>
                <h3 className="text-sm font-bold font-geist text-zinc-400">Collaboration Workspace Preview</h3>
                <p className="text-xs text-zinc-500 leading-relaxed font-inter">
                  Launch a session to preview the multi-user screen canvas, synced annotations, chat, and participants controls.
                </p>
              </div>
              
              {/* Dummy live cursor overlays */}
              <div className="absolute top-[25%] left-[30%] flex items-center gap-1.5 px-2 py-1 bg-rose-500 text-zinc-950 font-bold font-geist text-4xs rounded-full rounded-tl-none shadow-lg shadow-rose-500/10">
                <span className="material-symbols-outlined text-[10px]">near_me</span>
                <span>Alex (Lead)</span>
              </div>

              <div className="absolute bottom-[30%] right-[35%] flex items-center gap-1.5 px-2 py-1 bg-emerald-500 text-zinc-950 font-bold font-geist text-4xs rounded-full rounded-tl-none shadow-lg shadow-emerald-500/10 animate-bounce">
                <span className="material-symbols-outlined text-[10px]">near_me</span>
                <span>Jordan</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section id="features" className="px-6 py-20 bg-zinc-950/30 border-t border-slate-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 max-w-xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-black font-geist text-white tracking-tight leading-none mb-4">
              Precision Engineered Features
            </h2>
            <p className="text-xs text-zinc-500 font-inter">
              Everything you need for zero-friction real-time alignment, designed specifically for rapid engineering teams.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Card 1 */}
            <div className="md:col-span-8 glass-panel p-6 rounded-2xl flex flex-col justify-between h-72">
              <span className="material-symbols-outlined text-[#c0c1ff] text-[28px] mb-4">screen_share</span>
              <div>
                <h3 className="text-sm font-bold font-geist text-white mb-2">Ultra Low-Latency Screen Sharing</h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-inter">
                  Fast Peer-to-Peer sharing powered by WebRTC and optimal STUN configs. Get smooth frame rates without lag.
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="md:col-span-4 glass-panel p-6 rounded-2xl flex flex-col justify-between h-72">
              <span className="material-symbols-outlined text-[#d0bcff] text-[28px] mb-4">draw</span>
              <div>
                <h3 className="text-sm font-bold font-geist text-white mb-2">Live Canvas Annotations</h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-inter">
                  Point, draw, highlight directly onto the screen. Cursors and click ripples synchronize in real-time.
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="md:col-span-4 glass-panel p-6 rounded-2xl flex flex-col justify-between h-72">
              <span className="material-symbols-outlined text-[#ffb783] text-[28px] mb-4">forum</span>
              <div>
                <h3 className="text-sm font-bold font-geist text-white mb-2">Real-time Room Chat</h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-inter">
                  Instant text messaging with quick emoji reactions. Keep communications locked to your active session.
                </p>
              </div>
            </div>

            {/* Card 4 */}
            <div className="md:col-span-8 glass-panel p-6 rounded-2xl flex flex-col justify-between h-72">
              <span className="material-symbols-outlined text-emerald-400 text-[28px] mb-4">delete_sweep</span>
              <div>
                <h3 className="text-sm font-bold font-geist text-white mb-2">Auto Room Cleanup</h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-inter">
                  Rooms exist temporarily and are automatically deleted when empty. No leftovers, no persistence.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 border-t border-slate-border text-center bg-zinc-950/20">
        <p className="text-xs text-zinc-650 font-inter">
          &copy; 2026 InterAct Collaboration. Built for high-speed alignment.
        </p>
      </footer>
    </div>
  );
};
