import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../constants/routes';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';
import interactLogo from '../assets/branding/interact-icon-dark-mode.svg';

export const SignupPage: React.FC = () => {
  const { register, authError, setAuthError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setAuthError(null);

    // Basic Validation
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setLocalError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register(fullName.trim(), email.trim(), password, confirmPassword, rememberMe);
      const fromState = (location.state as { from?: Location })?.from;
      const targetUrl = fromState
        ? `${fromState.pathname}${fromState.search || ''}`
        : sessionStorage.getItem('redirect_after_login');

      sessionStorage.removeItem('redirect_after_login');
      navigate(targetUrl || ROUTES.DASHBOARD, { replace: true });
    } catch (err: any) {
      console.error('Signup error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-on-surface flex flex-col justify-center items-center px-4 relative overflow-hidden select-none font-inter">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[420px] z-10">
        {/* Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 shadow-lg">
            <img src={interactLogo} alt="InterAct" className="h-6 w-auto" />
          </div>
          <h1 className="text-2xl font-black font-geist text-white tracking-tight leading-none mb-2">Create your account</h1>
          <p className="text-sm text-zinc-400 font-inter">Start collaborating in real-time today</p>
        </div>

        {/* Card */}
        <div className="glass-panel p-8 border border-zinc-800 bg-zinc-950/40 rounded-2xl shadow-2xl relative">
          {(localError || authError) && (
            <div className="mb-5 flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400 font-inter animate-shake">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{localError || authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label htmlFor="fullName" className="text-xs font-semibold text-zinc-400 font-geist">Full Name</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
                  <User size={16} />
                </span>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  disabled={isSubmitting}
                  className="w-full bg-[#131315] border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition-all font-inter"
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-semibold text-zinc-400 font-geist">Email Address</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
                  <Mail size={16} />
                </span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  disabled={isSubmitting}
                  className="w-full bg-[#131315] border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition-all font-inter"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-zinc-400 font-geist">Password (min. 6 chars)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
                  <Lock size={16} />
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  className="w-full bg-[#131315] border border-zinc-800 rounded-xl py-2.5 pl-10 pr-11 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition-all font-inter"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1 bg-transparent border-none cursor-pointer rounded"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="text-xs font-semibold text-zinc-400 font-geist">Confirm Password</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
                  <Lock size={16} />
                </span>
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  className="w-full bg-[#131315] border border-zinc-800 rounded-xl py-2.5 pl-10 pr-11 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition-all font-inter"
                />
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2 pt-1">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-800 bg-[#131315] text-indigo-500 accent-[#c0c1ff] focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <label htmlFor="remember" className="text-xs text-zinc-400 font-inter cursor-pointer select-none">
                Remember my session on this device
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="lp-btn-primary w-full h-11 text-sm rounded-xl font-semibold flex items-center justify-center gap-2 mt-5 cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-[#09090b] border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Register
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-xs text-zinc-500 font-inter">
          Already have an account?{' '}
          <Link to={ROUTES.LOGIN} state={location.state} className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};
