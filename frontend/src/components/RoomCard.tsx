import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassPanel } from './GlassPanel';
import { Badge } from './Badge';
import { AvatarStack } from './AvatarStack';

interface RoomCardProps {
  id: string;
  name: string;
  hostName: string;
  duration: string;
  participants: { name: string; avatarColor?: string }[];
}

export const RoomCard: React.FC<RoomCardProps> = ({
  id,
  name,
  hostName,
  duration,
  participants,
}) => {
  const navigate = useNavigate();

  return (
    <GlassPanel hoverGlow className="flex flex-col justify-between h-auto min-h-[176px] sm:h-44">
      <div>
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-sm font-bold font-geist text-white tracking-tight">{name}</h3>
          <Badge variant="live" />
        </div>
        
        <div className="flex flex-col gap-1 text-xs text-zinc-400 font-inter mt-3">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px] text-zinc-500">person</span>
            <span>Host: {hostName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px] text-zinc-500">schedule</span>
            <span>Duration: {duration}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-4 border-t border-zinc-800/60 pt-3 gap-3 sm:gap-2">
        <div className="flex items-center">
          <AvatarStack users={participants} limit={3} />
        </div>
        
        <button
          onClick={() => navigate(`/room/${id}`)}
          className="w-full sm:w-auto text-center px-3.5 py-2 sm:py-1.5 text-xs font-semibold font-geist bg-indigo-600/20 text-[#c0c1ff] hover:bg-indigo-600 hover:text-zinc-950 rounded-lg transition-colors border border-indigo-600/30 cursor-pointer"
        >
          Join Room
        </button>
      </div>
    </GlassPanel>
  );
};
