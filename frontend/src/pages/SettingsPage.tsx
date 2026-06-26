import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { useAuth } from '../context/AuthContext';
import { useDesktopAgent } from '../hooks/useDesktopAgent';
import { User, Monitor, Sliders, Info, LogOut, Check, AlertCircle, RefreshCw } from 'lucide-react';

type TabType = 'profile' | 'agent' | 'preferences' | 'about';

export const SettingsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, logout } = useAuth();
  const { status, agentInfo, isOutdated, latestVersion, isLoading, refresh } = useDesktopAgent();

  const activeTab = (searchParams.get('tab') as TabType) || 'profile';

  // State for change password placeholder inputs
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);

  const handleTabChange = (tab: TabType) => {
    setSearchParams({ tab });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordStatus('error: Please fill out all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus('error: New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordStatus('error: New password must be at least 6 characters.');
      return;
    }
    
    // Simulate successful password change placeholder
    setPasswordStatus('success: Password successfully changed! (Placeholder integration only)');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const formattedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Unknown';

  const downloadUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/download/windows`;

  return (
    <AppLayout context="dashboard">
      <div className="flex-1 overflow-y-auto bg-bg p-4 sm:p-6 md:p-8 font-inter select-none">
        <div className="max-w-[1400px] mx-auto space-y-6">
          
          {/* Header */}
          <div>
            <h1 className="text-xl md:text-2xl font-black font-geist text-white tracking-tight">Settings</h1>
            <p className="text-xs md:text-sm text-zinc-500 mt-1">Manage your account profile and InterAct applications</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
            
            {/* Sidebar Tabs Selector */}
            <div className="md:col-span-1 flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible gap-1 pb-2 md:pb-0 border-b md:border-none border-[#1e1e21]">
              <button
                onClick={() => handleTabChange('profile')}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold font-geist cursor-pointer transition-all whitespace-nowrap ${
                  activeTab === 'profile'
                    ? 'bg-[#c0c1ff]/10 text-[#c0c1ff]'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#1a1a1d]'
                }`}
              >
                <User size={15} />
                Profile
              </button>
              <button
                onClick={() => handleTabChange('agent')}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold font-geist cursor-pointer transition-all whitespace-nowrap ${
                  activeTab === 'agent'
                    ? 'bg-[#c0c1ff]/10 text-[#c0c1ff]'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#1a1a1d]'
                }`}
              >
                <Monitor size={15} />
                Desktop Agent
              </button>
              <button
                onClick={() => handleTabChange('preferences')}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold font-geist cursor-pointer transition-all whitespace-nowrap ${
                  activeTab === 'preferences'
                    ? 'bg-[#c0c1ff]/10 text-[#c0c1ff]'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#1a1a1d]'
                }`}
              >
                <Sliders size={15} />
                Preferences
              </button>
              <button
                onClick={() => handleTabChange('about')}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold font-geist cursor-pointer transition-all whitespace-nowrap ${
                  activeTab === 'about'
                    ? 'bg-[#c0c1ff]/10 text-[#c0c1ff]'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#1a1a1d]'
                }`}
              >
                <Info size={15} />
                About
              </button>
            </div>

            {/* Content Tabs Pane */}
            <div className="md:col-span-3">
              
              {/* Tab: Profile (Profile Manager) */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  {/* Profile info card */}
                  <div className="db-card p-5 sm:p-6 space-y-4">
                    <h2 className="text-sm font-bold font-geist text-white tracking-tight border-b border-[#1e1e21] pb-2">Profile Information</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider font-geist">Full Name</span>
                        <p className="text-sm text-zinc-200 font-inter font-semibold">{user?.fullName}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider font-geist">Email Address</span>
                        <p className="text-sm text-zinc-200 font-inter font-semibold">{user?.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Change password card */}
                  <div className="db-card p-5 sm:p-6 space-y-4">
                    <h2 className="text-sm font-bold font-geist text-white tracking-tight border-b border-[#1e1e21] pb-2">Change Password</h2>
                    
                    {passwordStatus && (
                      <div className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                        passwordStatus.startsWith('error') 
                          ? 'bg-red-500/10 border border-red-500/20 text-red-400' 
                          : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                      }`}>
                        {passwordStatus.startsWith('error') ? <AlertCircle size={15} className="shrink-0 mt-0.5" /> : <Check size={15} className="shrink-0 mt-0.5" />}
                        <span>{passwordStatus.split(': ')[1]}</span>
                      </div>
                    )}

                    <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
                      <div className="space-y-1">
                        <label className="text-xs text-zinc-400 font-geist">Current Password</label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={e => setCurrentPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-[#131315] border border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-zinc-700 transition-all font-inter"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-zinc-400 font-geist">New Password</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-[#131315] border border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-zinc-700 transition-all font-inter"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-zinc-400 font-geist">Confirm New Password</label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-[#131315] border border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-zinc-700 transition-all font-inter"
                        />
                      </div>
                      <button
                        type="submit"
                        className="lp-btn-primary px-4 py-2 text-xs font-semibold rounded-lg shrink-0 cursor-pointer"
                      >
                        Save Password
                      </button>
                    </form>
                  </div>

                  {/* Account Metadata info card */}
                  <div className="db-card p-5 sm:p-6 space-y-4">
                    <h2 className="text-sm font-bold font-geist text-white tracking-tight border-b border-[#1e1e21] pb-2">Account Status</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider font-geist">Member Since</span>
                        <p className="text-sm text-zinc-200 font-inter font-semibold">{formattedDate}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider font-geist">Account Actions</span>
                        <div>
                          <button
                            onClick={() => logout()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600/10 border border-red-500/20 rounded-lg text-xs font-bold font-geist text-red-400 hover:bg-red-600/20 cursor-pointer transition-colors"
                          >
                            <LogOut size={13} />
                            Log Out Session
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Desktop Agent */}
              {activeTab === 'agent' && (
                <div className="db-card p-5 sm:p-6 space-y-5">
                  <h2 className="text-sm font-bold font-geist text-white tracking-tight border-b border-[#1e1e21] pb-2">Desktop Agent Management</h2>
                  
                  {/* Status Indicator */}
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-zinc-900/60 p-4 border border-[#1e1e21] rounded-xl">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider font-geist">Connection Status</span>
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${
                          status === 'connected' 
                            ? 'bg-emerald-500 animate-pulse' 
                            : status === 'connecting' 
                            ? 'bg-amber-400 animate-pulse' 
                            : status === 'incompatible' 
                            ? 'bg-amber-500' 
                            : 'bg-rose-500'
                        }`} />
                        <span className="text-sm text-zinc-200 font-inter font-bold uppercase tracking-wide">
                          {status === 'connected' 
                            ? 'Connected' 
                            : status === 'connecting' 
                            ? 'Connecting...' 
                            : status === 'incompatible' 
                            ? 'Protocol Version Mismatch' 
                            : 'Offline / Disconnected'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={refresh}
                        disabled={isLoading}
                        className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white text-xs font-bold font-geist border border-zinc-700 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                      >
                        <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
                        Check for Updates
                      </button>
                      {status !== 'connected' && (
                        <a
                          href={downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-2 bg-[#c0c1ff] text-[#09090b] hover:bg-[#d0d1ff] text-xs font-bold font-geist rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
                        >
                          Download Desktop Agent
                        </a>
                      )}
                      {status === 'connected' && isOutdated && (
                        <a
                          href={downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-2 bg-amber-600 text-white hover:bg-amber-500 text-xs font-bold font-geist rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
                        >
                          Update Agent
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Diagnostic details */}
                  <div className="space-y-3.5 pt-1">
                    <h3 className="text-xs font-bold text-zinc-400 font-geist uppercase tracking-wider">Device Diagnostics</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                      <div className="p-3 bg-zinc-900/40 border border-zinc-800/60 rounded-xl space-y-0.5">
                        <span className="text-[10px] text-zinc-500 font-geist uppercase tracking-wider font-semibold">Installed Version</span>
                        <p className="text-zinc-200 font-mono">{agentInfo ? `v${agentInfo.version}` : 'N/A'}</p>
                      </div>
                      <div className="p-3 bg-zinc-900/40 border border-zinc-800/60 rounded-xl space-y-0.5">
                        <span className="text-[10px] text-zinc-500 font-geist uppercase tracking-wider font-semibold">Latest Release Available</span>
                        <p className="text-zinc-200 font-mono">{latestVersion ? `v${latestVersion}` : 'Checking...'}</p>
                      </div>
                      <div className="p-3 bg-zinc-900/40 border border-zinc-800/60 rounded-xl space-y-0.5">
                        <span className="text-[10px] text-zinc-500 font-geist uppercase tracking-wider font-semibold">Local Port Bind</span>
                        <p className="text-zinc-200 font-mono">{agentInfo ? `127.0.0.1:${agentInfo.agentPort}` : 'N/A'}</p>
                      </div>
                      <div className="p-3 bg-zinc-900/40 border border-zinc-800/60 rounded-xl space-y-0.5">
                        <span className="text-[10px] text-zinc-500 font-geist uppercase tracking-wider font-semibold">System Platform</span>
                        <p className="text-zinc-200 font-mono capitalize">{agentInfo ? agentInfo.platform : 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Preferences (Placeholder) */}
              {activeTab === 'preferences' && (
                <div className="db-card p-5 sm:p-6 space-y-5">
                  <h2 className="text-sm font-bold font-geist text-white tracking-tight border-b border-[#1e1e21] pb-2">User Preferences</h2>
                  <div className="space-y-4 opacity-50">
                    <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
                      <div>
                        <h3 className="text-xs font-semibold text-zinc-200 font-geist">Theme Appearance</h3>
                        <p className="text-[10px] text-zinc-500 font-inter">Switch between dark mode and system theme settings.</p>
                      </div>
                      <select disabled className="bg-zinc-900 border border-zinc-800 rounded-lg text-xs py-1.5 px-3 text-zinc-400 font-geist">
                        <option>Dark Theme (Default)</option>
                        <option>System Theme</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
                      <div>
                        <h3 className="text-xs font-semibold text-zinc-200 font-geist">Desktop Notifications</h3>
                        <p className="text-[10px] text-zinc-500 font-inter">Receive browser alert notifications for new activity and updates.</p>
                      </div>
                      <input type="checkbox" checked disabled className="w-4 h-4 accent-[#c0c1ff]" />
                    </div>
                    <div className="flex items-center justify-between pb-1">
                      <div>
                        <h3 className="text-xs font-semibold text-zinc-200 font-geist">Default Transcription Language</h3>
                        <p className="text-[10px] text-zinc-500 font-inter">Set the preferred speech recognition model locale.</p>
                      </div>
                      <select disabled className="bg-zinc-900 border border-zinc-800 rounded-lg text-xs py-1.5 px-3 text-zinc-400 font-geist">
                        <option>English (US)</option>
                        <option>English (UK)</option>
                        <option>Spanish</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-500 italic font-inter text-center">Preference settings are mock placeholders and will be saved in a future profile preference system.</p>
                </div>
              )}

              {/* Tab: About */}
              {activeTab === 'about' && (
                <div className="db-card p-5 sm:p-6 space-y-4">
                  <h2 className="text-sm font-bold font-geist text-white tracking-tight border-b border-[#1e1e21] pb-2">About InterAct</h2>
                  <div className="space-y-3.5 text-xs text-zinc-400 font-inter leading-relaxed">
                    <p>
                      <strong>InterAct</strong> is a state-of-the-art real-time collaborative screen-sharing and media streaming platform, engineered for developers and teams. It merges secure low-latency WebRTC streaming with WebSocket communication to deliver instant workspace collaboration.
                    </p>
                    <div className="grid grid-cols-2 gap-4 pt-3.5 max-w-sm">
                      <div className="space-y-0.5">
                        <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider font-geist">App Version</span>
                        <p className="text-zinc-200 font-mono font-semibold">v1.1.0</p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider font-geist">Release Date</span>
                        <p className="text-zinc-200 font-mono font-semibold">June 2026</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
