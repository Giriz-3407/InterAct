import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { TopBar } from '../components/TopBar';
import { RoomCard } from '../components/RoomCard';
import { JoinRoomModal } from '../components/JoinRoomModal';
import { MOCK_ROOMS } from '../data/mockData';
import { apiClient } from '../lib/axios';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'join'>('create');
  const [apiError, setApiError] = useState('');
  const [selectedRoomCode, setSelectedRoomCode] = useState('');
  const [jumpBackRooms, setJumpBackRooms] = useState<{ roomCode: string; active: boolean; participantCount: number }[]>([]);

  // Aggregate stats
  const totalActiveRooms = MOCK_ROOMS.length;

  useEffect(() => {
    const fetchJumpBackRooms = async () => {
      try {
        const stored = JSON.parse(localStorage.getItem('joinedRooms') || '[]');
        if (stored.length === 0) return;

        const promises = stored.map(async (code: string) => {
          try {
            const data = await apiClient.get<{ roomCode: string; active: boolean; participantCount: number }>(
              `/api/rooms/${code}`
            );
            return data;
          } catch (err) {
            return null;
          }
        });

        const results = await Promise.all(promises);
        const validRooms = results.filter((r): r is { roomCode: string; active: boolean; participantCount: number } => r !== null);
        
        setJumpBackRooms(validRooms);

        const validCodes = validRooms.map(r => r.roomCode);
        localStorage.setItem('joinedRooms', JSON.stringify(validCodes));
      } catch (err) {
        console.error('Failed to load jump back rooms:', err);
      }
    };

    fetchJumpBackRooms();
  }, []);

  const handleJumpBackIn = (roomCode: string) => {
    setSelectedRoomCode(roomCode);
    setModalMode('join');
    setModalOpen(true);
  };

  useEffect(() => {
    const handleTriggerCreate = () => {
      setModalMode('create');
      setModalOpen(true);
    };

    window.addEventListener('trigger-create-room', handleTriggerCreate);
    return () => {
      window.removeEventListener('trigger-create-room', handleTriggerCreate);
    };
  }, []);

  useEffect(() => {
    if (apiError) {
      const timer = setTimeout(() => {
        setApiError('');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [apiError]);

  const handleModalSubmit = async (displayName: string, roomCode?: string) => {
    setApiError('');
    try {
      if (modalMode === 'create') {
        const data = await apiClient.post<{ roomCode: string }>('/api/rooms', {});
        if (data && data.roomCode) {
          navigate(`/room/${data.roomCode}?name=${encodeURIComponent(displayName)}`);
        }
      } else {
        if (!roomCode) return;
        try {
          const roomData = await apiClient.get<{ roomCode: string; active: boolean }>(
            `/api/rooms/${roomCode}`
          );
          if (roomData && roomData.active) {
            navigate(`/room/${roomCode}?name=${encodeURIComponent(displayName)}`);
          } else {
            setApiError('Room is inactive.');
            setModalOpen(false);
          }
        } catch (err) {
          setApiError('Room not found. Please verify the code.');
          setModalOpen(false);
        }
      }
    } catch (err: any) {
      console.error(err);
      setApiError('Server error. Please try again.');
      setModalOpen(false);
    }
  };

  const handleCreateTrigger = () => {
    setSelectedRoomCode('');
    setModalMode('create');
    setModalOpen(true);
  };

  const handleJoinTrigger = () => {
    setSelectedRoomCode('');
    setModalMode('join');
    setModalOpen(true);
  };

  return (
    <AppLayout context="dashboard">
      <TopBar 
        title="Workspace" 
        showSearch={true} 
        searchPlaceholder="Search active rooms..." 
      />
      
      {/* Floating Toast Notification */}
      {apiError && (
        <div className="fixed top-4 right-4 z-50 w-80 glass-panel border-rose-500/30 bg-rose-500/10 p-3.5 rounded-xl shadow-2xl flex items-start gap-3 animate-fade-in">
          <span className="material-symbols-outlined text-rose-400 text-sm mt-0.5">error</span>
          <div className="flex-1 flex flex-col gap-0.5">
            <span className="text-xs font-bold font-geist text-rose-350">Room Error</span>
            <span className="text-2xs text-zinc-300 font-inter leading-relaxed">{apiError}</span>
          </div>
          <button onClick={() => setApiError('')} className="text-zinc-500 hover:text-zinc-300 shrink-0 cursor-pointer">
            <span className="material-symbols-outlined text-[16px] block">close</span>
          </button>
        </div>
      )}

      {/* Main Grid Content */}
      <main className="flex-1 p-4 sm:p-6 flex flex-col lg:flex-row gap-4 sm:gap-6 overflow-y-auto overflow-x-hidden custom-scrollbar max-w-[1600px] w-full mx-auto relative">
        
        {/* Left Column: Actions & Recent Activity */}
        <div className="flex-grow flex flex-col gap-4 sm:gap-6 lg:w-2/3 min-w-0">
          
          {/* Welcome / Workspace Header */}
          <section className="bg-gradient-to-r from-indigo-950/20 to-zinc-950/20 border border-zinc-850/80 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <div>
              <h2 className="text-sm sm:text-base font-bold font-geist text-white tracking-tight">Collaboration Workspace</h2>
              <p className="text-[11px] sm:text-xs text-zinc-400 font-inter mt-1 leading-normal">
                Create temporary rooms, share screens, and collaborate with your team instantly.
              </p>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[10px] sm:text-2xs bg-zinc-900 border border-zinc-800 text-zinc-450 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full shrink-0">
              <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Workspace Connected</span>
            </div>
          </section>

          {/* Quick Session Launch Grid */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Create Room Card */}
            <div
              onClick={handleCreateTrigger}
              className="bg-indigo-600/5 hover:bg-indigo-600/10 border border-indigo-500/10 hover:border-indigo-500/30 p-4 sm:p-5 rounded-2xl flex flex-col justify-between min-h-[130px] sm:h-40 transition-all cursor-pointer group shadow-lg shadow-indigo-950/5"
            >
              <div className="flex items-center justify-between">
                <span className="material-symbols-outlined text-[24px] sm:text-[28px] text-indigo-400">add_circle</span>
                <span className="material-symbols-outlined text-[16px] text-zinc-500 group-hover:text-white transition-all transform group-hover:translate-x-1">arrow_forward</span>
              </div>
              <div className="mt-3">
                <h3 className="text-[10px] sm:text-xs font-bold font-geist text-white uppercase tracking-wider mb-1">Start New Session</h3>
                <p className="text-[10px] sm:text-[11px] text-zinc-400 font-inter leading-relaxed">
                  Initialize a temporary room instantly. Invite teammates via link to stream.
                </p>
              </div>
            </div>

            {/* Join Room Card */}
            <div
              onClick={handleJoinTrigger}
              className="bg-zinc-900/15 hover:bg-zinc-900/30 border border-zinc-850 hover:border-zinc-700 p-4 sm:p-5 rounded-2xl flex flex-col justify-between min-h-[130px] sm:h-40 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="material-symbols-outlined text-[24px] sm:text-[28px] text-zinc-400">group</span>
                <span className="material-symbols-outlined text-[16px] text-zinc-500 group-hover:text-white transition-all transform group-hover:translate-x-1">arrow_forward</span>
              </div>
              <div className="mt-3">
                <h3 className="text-[10px] sm:text-xs font-bold font-geist text-zinc-300 uppercase tracking-wider mb-1">Join with Code</h3>
                <p className="text-[10px] sm:text-[11px] text-zinc-400 font-inter leading-relaxed">
                  Enter an existing 6-character room code to join an active stream.
                </p>
              </div>
            </div>
          </section>

          {/* Jump Back In Section */}
          <section className="flex flex-col gap-3">
            <h2 className="text-[10px] font-bold font-geist text-zinc-500 tracking-wider uppercase">
              Resume Session (Recently Visited)
            </h2>
            {jumpBackRooms.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {jumpBackRooms.map((room) => (
                  <div
                    key={room.roomCode}
                    onClick={() => handleJumpBackIn(room.roomCode)}
                    className="bg-zinc-900/20 hover:bg-zinc-900/40 border border-zinc-850 hover:border-zinc-700/60 p-4 rounded-xl flex flex-col justify-between h-28 transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold font-geist text-zinc-300">Room: {room.roomCode}</span>
                        <span className="text-[10px] text-zinc-500 font-inter mt-0.5">
                          {room.participantCount > 0
                            ? `${room.participantCount} active now`
                            : '0 active participants'}
                        </span>
                      </div>
                      <span className="material-symbols-outlined text-[16px] text-zinc-500 group-hover:text-[#c0c1ff] transition-colors">launch</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-zinc-900/80 pt-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${room.participantCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-655 bg-zinc-600'}`} />
                        <span className="text-[9px] font-mono text-zinc-550 uppercase">
                          {room.participantCount > 0 ? 'Active Stream' : 'Retained'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 py-5 text-center border border-dashed border-zinc-850/60 rounded-xl text-zinc-500 font-inter text-xs leading-normal">
                No active session history. Launch a new room above to begin.
              </div>
            )}
          </section>

        </div>

        {/* Right Column: Active Live Rooms & Workspace Status */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4 sm:gap-6 shrink-0 min-w-0">
          
          {/* Active Status Panel */}
          <section className="bg-zinc-900/20 border border-zinc-850 p-4 rounded-2xl flex flex-col gap-3">
            <h2 className="text-[10px] font-bold font-geist text-zinc-500 tracking-wider uppercase">
              Workspace Overview
            </h2>
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/40 border border-zinc-900">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-indigo-400">meeting_room</span>
                <span className="text-xs text-zinc-300 font-inter">Live Room Count</span>
              </div>
              <span className="text-xs font-mono font-bold text-white bg-zinc-900 px-2.5 py-0.5 rounded border border-zinc-800">
                {totalActiveRooms}
              </span>
            </div>
          </section>

          {/* Live Rooms List */}
          <section className="flex flex-col gap-3">
            <h2 className="text-[10px] font-bold font-geist text-zinc-500 tracking-wider uppercase">
              Active Streams ({MOCK_ROOMS.length})
            </h2>
            <div className="flex flex-col gap-3">
              {MOCK_ROOMS.map((room) => (
                <RoomCard
                  key={room.id}
                  id={room.id}
                  name={room.name}
                  hostName={room.hostName}
                  duration={room.id === 'ABC-123' ? '45 min' : '12 min'}
                  participants={room.participants}
                />
              ))}
            </div>
          </section>

        </div>

      </main>

      {/* Join/Create Room Modal */}
      <JoinRoomModal
        isOpen={modalOpen}
        mode={modalMode}
        initialRoomCode={selectedRoomCode}
        onClose={() => {
          setModalOpen(false);
          setSelectedRoomCode('');
        }}
        onSubmit={handleModalSubmit}
      />
    </AppLayout>
  );
};
