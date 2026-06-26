import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface JoinRoomModalProps {
  isOpen: boolean;
  mode: 'create' | 'join';
  onClose: () => void;
  onSubmit: (displayName: string, roomCode?: string) => void;
  initialRoomCode?: string;
}

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({
  isOpen,
  mode,
  onClose,
  onSubmit,
  initialRoomCode = '',
}) => {
  const { user } = useAuth();
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [displayName, setDisplayName] = useState(user?.fullName || '');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setRoomCode(initialRoomCode);
      setDisplayName(user?.fullName || '');
      setError('');
    }
  }, [isOpen, initialRoomCode, user]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!displayName.trim()) {
      setError('Display Name is required.');
      return;
    }

    if (mode === 'join') {
      if (!roomCode.trim()) {
        setError('Room Code is required.');
        return;
      }
      if (roomCode.trim().length !== 6) {
        setError('Room Code must be exactly 6 characters.');
        return;
      }
    }

    setError('');
    onSubmit(displayName.trim(), mode === 'join' ? roomCode.trim().toUpperCase() : undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="glass-panel w-full max-w-[95vw] sm:max-w-sm rounded-2xl p-4 sm:p-6 shadow-2xl relative flex flex-col gap-4 animate-scale-up">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300"
        >
          <span className="material-symbols-outlined text-[20px] block">close</span>
        </button>

        <div className="mb-2">
          <h2 className="text-base font-bold font-geist text-white">
            {mode === 'create' ? 'Create Collaboration Room' : 'Join Collaboration Room'}
          </h2>
          <p className="text-xs text-zinc-500 mt-1 font-inter">
            {mode === 'create' 
              ? 'Enter a display name to host a new session' 
              : 'Enter display name and unique room code'}
          </p>
        </div>

        {error && (
          <div className="text-xs text-rose-400 font-inter bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'join' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-zinc-400 font-geist uppercase tracking-wider">Room Code</label>
              <input
                type="text"
                maxLength={6}
                placeholder="e.g. K7P4XQ"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="px-3 py-2 bg-zinc-900 border border-zinc-850 rounded-lg text-xs text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all font-mono uppercase"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-zinc-400 font-geist uppercase tracking-wider">Display Name</label>
            <input
              type="text"
              placeholder="Your Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="px-3 py-2 bg-zinc-900 border border-zinc-850 rounded-lg text-xs text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all font-inter"
            />
          </div>

          <div className="flex gap-2.5 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-zinc-800 hover:bg-zinc-900 text-xs font-semibold font-geist text-zinc-300 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-semibold font-geist hover:opacity-95 shadow-lg shadow-indigo-500/10 rounded-lg transition-all"
            >
              {mode === 'create' ? 'Create Room' : 'Join Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
