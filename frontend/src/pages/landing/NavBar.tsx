import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import interactLogo from '../../assets/branding/interact-icon-dark-mode.svg';
import { useAuth } from '../../context/AuthContext';

const NAV_LINKS = [
  { label: 'Features',     href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Use Cases',    href: '#use-cases' },
  { label: 'Docs',         href: '#' },
];

export const NavBar: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [scrolled,    setScrolled]    = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 48);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNav = (href: string) => {
    setMobileOpen(false);
    if (href.startsWith('#')) {
      const el = document.querySelector(href);
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#09090b]/90 backdrop-blur-md border-b border-[#1e1e21]'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">

        {/* ── Logo ── */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 flex-shrink-0 cursor-pointer"
          aria-label="InterAct home"
        >
          <img src={interactLogo} alt="InterAct" className="h-6 w-auto object-contain" />
        </button>

        {/* ── Centre nav — desktop ── */}
        <nav className="hidden md:flex items-center gap-7" aria-label="Main navigation">
          {NAV_LINKS.map(link => (
            <button
              key={link.label}
              onClick={() => handleNav(link.href)}
              className="text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors duration-150 cursor-pointer bg-transparent border-none p-0"
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* ── Right CTAs — desktop ── */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="lp-btn-primary text-sm"
            >
              Go to Dashboard
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                className="text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors duration-150 px-3 py-1.5 cursor-pointer bg-transparent border-none"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/login')}
                className="lp-btn-primary text-sm"
              >
                Create Room
              </button>
            </>
          )}
        </div>

        {/* ── Hamburger — mobile ── */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 -mr-1 text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer bg-transparent border-none rounded-md"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6"  x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="md:hidden border-b border-[#1e1e21] bg-[#09090b]/97 backdrop-blur-md px-4 pt-2 pb-5 flex flex-col">
          {NAV_LINKS.map(link => (
            <button
              key={link.label}
              onClick={() => handleNav(link.href)}
              className="text-sm font-medium text-zinc-300 hover:text-white transition-colors py-3 text-left cursor-pointer bg-transparent border-none border-b border-[#1a1a1d] last:border-b-0"
            >
              {link.label}
            </button>
          ))}
          <div className="pt-4 flex flex-col gap-2.5">
            {isAuthenticated ? (
              <button
                onClick={() => { setMobileOpen(false); navigate('/dashboard'); }}
                className="lp-btn-primary w-full text-sm"
              >
                Go to Dashboard
              </button>
            ) : (
              <>
                <button
                  onClick={() => { setMobileOpen(false); navigate('/login'); }}
                  className="lp-btn-ghost w-full text-sm"
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setMobileOpen(false); navigate('/login'); }}
                  className="lp-btn-primary w-full text-sm"
                >
                  Create Free Room
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
