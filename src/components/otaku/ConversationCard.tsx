import React from 'react';
import type { Conversation } from './types';

interface ConversationCardProps {
  conversation: Conversation;
  onClick: () => void;
}

export function ConversationCard({ conversation, onClick }: ConversationCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 border-b hover:bg-[#1f1f2e] transition-colors"
      style={{
        background: 'transparent',
        borderColor: 'rgba(255,255,255,0.06)',
      }}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #6c5ce7 0%, #4facfe 100%)',
          }}
        >
          <span style={{ fontSize: '24px' }}>{conversation.user.avatar}</span>
        </div>
        {conversation.user.isOnline && (
          <div
            className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
            style={{
              background: '#22c55e',
              borderColor: '#111119',
            }}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between mb-1">
          <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>
            {conversation.user.name}
          </h4>
          <span style={{ fontSize: '11px', color: '#8888a0' }}>
            {conversation.timestamp}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <p
            className="truncate"
            style={{
              fontSize: '12px',
              color: conversation.unreadCount > 0 ? '#e8e8ed' : '#8888a0',
              fontWeight: conversation.unreadCount > 0 ? 600 : 400,
            }}
          >
            {conversation.lastMessage}
          </p>
          {conversation.unreadCount > 0 && (
            <div
              className="ml-2 px-2 py-0.5 rounded-full flex-shrink-0"
              style={{
                background: '#6c5ce7',
                fontSize: '10px',
                fontWeight: 700,
                color: '#ffffff',
                minWidth: '20px',
                textAlign: 'center',
              }}
            >
              {conversation.unreadCount}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
