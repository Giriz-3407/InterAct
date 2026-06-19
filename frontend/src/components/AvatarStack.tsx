import React from 'react';
import { Avatar } from './Avatar.FC';

interface AvatarStackProps {
  users: { name: string; avatarColor?: string }[];
  limit?: number;
}

export const AvatarStack: React.FC<AvatarStackProps> = ({ users, limit = 3 }) => {
  const visibleUsers = users.slice(0, limit);
  const extraCount = users.length - limit;

  return (
    <div className="flex -space-x-2 overflow-hidden">
      {visibleUsers.map((user, idx) => (
        <Avatar
          key={idx}
          name={user.name}
          size="sm"
          color={user.avatarColor || 'bg-zinc-600'}
        />
      ))}
      {extraCount > 0 && (
        <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-zinc-800 border border-zinc-700 text-[11px] sm:text-xs font-semibold text-zinc-300 font-geist">
          +{extraCount}
        </div>
      )}
    </div>
  );
};
