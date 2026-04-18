import React, { useState } from 'react';
import { ArrowLeft, Users, Settings, Hash, Send } from 'lucide-react';
import type { Group, GroupChannel, GroupMessage } from './types';

interface GroupDetailPageProps {
  group: Group;
  onBack: () => void;
}

export function GroupDetailPage({ group, onBack }: GroupDetailPageProps) {
  const [selectedChannel, setSelectedChannel] = useState<string>('general');
  const [messageText, setMessageText] = useState('');
  const [showChannels, setShowChannels] = useState(true);

  // Mock data
  const channels: GroupChannel[] = [
    { id: 'general', name: 'général', unreadCount: 12 },
    { id: 'theories', name: 'théories', unreadCount: 0 },
    { id: 'spoilers', name: 'spoilers', unreadCount: 3 },
    { id: 'fanart', name: 'fan-art', unreadCount: 0 },
    { id: 'offtopic', name: 'off-topic', unreadCount: 0 },
  ];

  const messages: GroupMessage[] = [
    {
      id: '1',
      author: 'Alex',
      authorColor: '#f093fb',
      content: 'Yo le chapitre de cette semaine!!',
      timestamp: '14:30',
      avatar: '🟣',
    },
    {
      id: '2',
      author: 'Marie',
      authorColor: '#43e97b',
      content: 'INSANE!! Le Gear 6 😱',
      timestamp: '14:32',
      avatar: '🟢',
    },
    {
      id: '3',
      author: 'Jean',
      authorColor: '#4facfe',
      content: 'Oda est le GOAT, point final 🐐',
      timestamp: '14:35',
      avatar: '🔵',
    },
    {
      id: '4',
      author: 'Sophie',
      authorColor: '#ffd200',
      content: 'Quelqu\'un a des théories sur le prochain arc?',
      timestamp: '14:42',
      avatar: '🟡',
    },
  ];

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    // TODO: Send message
    setMessageText('');
  };

  const currentChannel = channels.find((c) => c.id === selectedChannel);

  return (
    <div className="h-full flex flex-col" style={{ background: '#0c0c14' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{
          background: '#111119',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-[#1f1f2e] transition-colors"
          >
            <ArrowLeft size={20} style={{ color: '#e8e8ed' }} />
          </button>
          <span style={{ fontSize: '18px' }}>{group.icon}</span>
          <h2 style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>
            {group.name}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg hover:bg-[#1f1f2e] transition-colors">
            <Users size={18} style={{ color: '#8888a0' }} />
          </button>
          <button className="p-2 rounded-lg hover:bg-[#1f1f2e] transition-colors">
            <Settings size={18} style={{ color: '#8888a0' }} />
          </button>
        </div>
      </div>

      {/* Mobile: Toggle Channels */}
      <div className="md:hidden">
        <button
          onClick={() => setShowChannels(!showChannels)}
          className="w-full px-4 py-2 text-left border-b"
          style={{
            background: '#111119',
            borderColor: 'rgba(255,255,255,0.06)',
            fontSize: '12px',
            fontWeight: 600,
            color: '#8888a0',
          }}
        >
          {showChannels ? '▼' : '►'} CHANNELS
        </button>
      </div>

      {/* Channels List (Mobile Collapsible) */}
      {showChannels && (
        <div
          className="md:hidden px-4 py-2 border-b space-y-1"
          style={{
            background: '#111119',
            borderColor: 'rgba(255,255,255,0.06)',
          }}
        >
          {channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => {
                setSelectedChannel(channel.id);
                setShowChannels(false);
              }}
              className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-[#1f1f2e] transition-colors"
              style={{
                background: selectedChannel === channel.id ? '#1f1f2e' : 'transparent',
              }}
            >
              <div className="flex items-center gap-2">
                <Hash size={14} style={{ color: '#8888a0' }} />
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: selectedChannel === channel.id ? '#e8e8ed' : '#8888a0',
                  }}
                >
                  {channel.name}
                </span>
              </div>
              {channel.unreadCount > 0 && (
                <div
                  className="px-2 py-0.5 rounded-full"
                  style={{
                    background: '#ef4444',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#ffffff',
                  }}
                >
                  {channel.unreadCount}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Current Channel Header */}
      <div
        className="px-4 py-3 border-b"
        style={{
          background: '#111119',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-2">
          <Hash size={16} style={{ color: '#8888a0' }} />
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>
            {currentChannel?.name}
          </h3>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className="flex items-start gap-3">
            {/* Avatar */}
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #6c5ce7 0%, #4facfe 100%)',
              }}
            >
              <span style={{ fontSize: '18px' }}>{message.avatar}</span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-1">
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: message.authorColor,
                  }}
                >
                  {message.author}
                </span>
                <span style={{ fontSize: '11px', color: '#555570' }}>
                  {message.timestamp}
                </span>
              </div>
              <p
                style={{
                  fontSize: '13px',
                  color: '#e8e8ed',
                  lineHeight: '1.5',
                }}
              >
                {message.content}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Message Input */}
      <div
        className="px-4 py-3 border-t"
        style={{
          background: '#111119',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={`Message #${currentChannel?.name}...`}
            className="flex-1 px-4 py-2 rounded-xl border outline-none focus:border-[#6c5ce7] transition-colors"
            style={{
              background: '#1a1a25',
              borderColor: 'rgba(255,255,255,0.06)',
              fontSize: '13px',
              color: '#e8e8ed',
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!messageText.trim()}
            className="p-2 rounded-xl transition-colors disabled:opacity-50"
            style={{
              background: '#6c5ce7',
            }}
          >
            <Send size={18} style={{ color: '#ffffff' }} />
          </button>
        </div>
      </div>
    </div>
  );
}
