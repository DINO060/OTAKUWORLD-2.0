import React from 'react';
import { Users } from 'lucide-react';
import type { Group } from './types';

interface GroupCardProps {
  group: Group;
  isJoined: boolean;
  onJoin: () => void;
  onClick: () => void;
}

export function GroupCard({ group, isJoined, onJoin, onClick }: GroupCardProps) {
  const formatCount = (count: number) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count;
  };

  return (
    <div
      className="p-4 rounded-2xl border hover:bg-[#1f1f2e] transition-all cursor-pointer"
      style={{
        background: '#111119',
        borderColor: 'rgba(255,255,255,0.06)',
      }}
      onClick={onClick}
    >
      {/* Cover Image */}
      {group.coverImage && (
        <div
          className="w-full h-24 rounded-xl overflow-hidden mb-3"
          style={{
            background: 'linear-gradient(135deg, #6c5ce7 0%, #4facfe 100%)',
          }}
        >
          <img
            src={group.coverImage}
            alt={group.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #6c5ce7 0%, #4facfe 100%)',
          }}
        >
          <span style={{ fontSize: '24px' }}>{group.icon}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="mb-1" style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>
            {group.icon} {group.name}
          </h4>
          <p className="mb-2" style={{ fontSize: '11px', color: '#8888a0' }}>
            {formatCount(group.membersCount)} membres · {group.onlineCount} en ligne
          </p>
          <p
            className="mb-3"
            style={{
              fontSize: '12px',
              color: '#8888a0',
              lineHeight: '1.5',
            }}
          >
            {group.description}
          </p>
        </div>

        {/* Join Button */}
        {!isJoined && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onJoin();
            }}
            className="px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
            style={{
              background: '#6c5ce7',
              fontSize: '12px',
              fontWeight: 700,
              color: '#ffffff',
            }}
          >
            Rejoindre
          </button>
        )}
        {isJoined && (
          <div
            className="px-4 py-2 rounded-lg"
            style={{
              background: 'rgba(34,197,94,0.12)',
              fontSize: '12px',
              fontWeight: 700,
              color: '#22c55e',
            }}
          >
            ✓ Membre
          </div>
        )}
      </div>
    </div>
  );
}
