import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { TopBar } from '../components/TopBar';
import { StatCard } from '../components/StatCard';
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
    // Listen for custom trigger-create-room event from L2 sidebar
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
        // Lookup room
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

  const topBarActions = (
    <div className="flex gap-2.5">
      <button
        onClick={() => {
          setSelectedRoomCode('');
          setModalMode('join');
          setModalOpen(true);
        }}
        className="px-3.5 py-1.5 rounded-full text-xs font-semibold font-geist border border-zinc-850 text-zinc-300 hover:bg-zinc-900 transition-colors cursor-pointer"
      >
        Join Room
      </button>
      <button
        onClick={() => {
          setSelectedRoomCode('');
          setModalMode('create');
          setModalOpen(true);
        }}
        className="px-3.5 py-1.5 rounded-full text-xs font-semibold font-geist bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:opacity-95 shadow-lg shadow-indigo-500/10 transition-all cursor-pointer"
      >
        Create Room
      </button>
    </div>
  );

  return (
    <AppLayout context="dashboard">
      <TopBar 
        title="Dashboard" 
        showSearch={true} 
        searchPlaceholder="Search rooms, features..." 
        actions={topBarActions}
      />
      
      {/* Floating Toast Notification */}
      {apiError && (
        <div className="fixed top-4 right-4 z-50 w-80 glass-panel border-rose-500/30 bg-rose-500/10 p-3.5 rounded-xl shadow-2xl flex items-start gap-3 animate-fade-in">
          <span className="material-symbols-outlined text-rose-455 text-sm mt-0.5">error</span>
          <div className="flex-1 flex flex-col gap-0.5">
            <span className="text-xs font-bold font-geist text-rose-350">Room Error</span>
            <span className="text-2xs text-zinc-300 font-inter leading-relaxed">{apiError}</span>
          </div>
          <button onClick={() => setApiError('')} className="text-zinc-500 hover:text-zinc-300 shrink-0 cursor-pointer">
            <span className="material-symbols-outlined text-[16px] block">close</span>
          </button>
        </div>
      )}

      {/* Content Canvas */}
      <main className="flex-1 p-6 flex flex-col xl:flex-row gap-6 overflow-y-auto custom-scrollbar max-w-[1600px] w-full mx-auto relative">

        <div className="flex-1 flex flex-col gap-6">
          {/* Stats Grid */}
          <section className="grid grid-cols-1 gap-4">
            <StatCard label="Active Rooms" value={totalActiveRooms} icon="meeting_room" accentColor="primary" />
          </section>

          {/* Jump Back In Section */}
          <section className="mt-2">
            <h2 className="text-sm font-bold font-geist text-white tracking-tight mb-4 uppercase tracking-wider text-zinc-500">
              Jump Back In
            </h2>
            {jumpBackRooms.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {jumpBackRooms.map((room) => (
                  <div
                    key={room.roomCode}
                    onClick={() => handleJumpBackIn(room.roomCode)}
                    className="glass-panel p-4 rounded-xl flex flex-col justify-between h-36 border border-zinc-855 hover:border-zinc-700/80 transition-all cursor-pointer"
                  >
                    <div>
                      <h3 className="text-xs font-bold font-geist text-white">Room: {room.roomCode}</h3>
                      <p className="text-[10px] text-zinc-500 font-inter mt-1">
                        {room.participantCount > 0
                          ? `${room.participantCount} participant(s) active`
                          : 'Empty / Inactive'}
                      </p>
                    </div>
                    <div className="flex justify-between items-center mt-4 border-t border-zinc-900 pt-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${room.participantCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
                        <span className="text-[10px] text-zinc-400 font-mono capitalize">
                          {room.participantCount > 0 ? 'Live' : 'Retained'}
                        </span>
                      </div>
                      <span className="material-symbols-outlined text-[16px] text-zinc-500">arrow_forward</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center glass-panel rounded-xl border border-zinc-850 text-zinc-500 font-inter text-xs">
                No recently joined rooms. Create or join a room to get started.
              </div>
            )}
          </section>

          {/* Active Rooms Grid */}
          <section className="mt-2">
            <h2 className="text-sm font-bold font-geist text-white tracking-tight mb-4 uppercase tracking-wider text-zinc-500">
              Live Rooms
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
