import React, { useState } from 'react';
import { ArrowLeft, Send, Image, Smile } from 'lucide-react';
import type { Conversation, PrivateMessage } from './types';

interface PrivateChatPageProps {
  conversation: Conversation;
  onBack: () => void;
}

export function PrivateChatPage({ conversation, onBack }: PrivateChatPageProps) {
  const [messageText, setMessageText] = useState('');

  // Mock messages
  const messages: PrivateMessage[] = [
    {
      id: '1',
      senderId: conversation.user.id,
      content: 'Salut! T\'as vu le dernier chapitre de One Piece?',
      timestamp: '14:20',
      isOwn: false,
    },
    {
      id: '2',
      senderId: 'me',
      content: 'Oui!! C\'était incroyable 🔥',
      timestamp: '14:22',
      isOwn: true,
    },
    {
      id: '3',
      senderId: conversation.user.id,
      content: 'Je sais!! Oda est un génie',
      timestamp: '14:25',
      isOwn: false,
    },
    {
      id: '4',
      senderId: 'me',
      content: 'Tu penses que Luffy va...',
      timestamp: '14:28',
      isOwn: true,
    },
    {
      id: '5',
      senderId: conversation.user.id,
      content: 'T\'as vu le dernier chapitre? 🔥',
      timestamp: '14:30',
      isOwn: false,
    },
  ];

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    // TODO: Send message
    setMessageText('');
  };

  return (
    <div className="h-full flex flex-col" style={{ background: '#0c0c14' }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b"
        style={{
          background: '#111119',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-[#1f1f2e] transition-colors"
        >
          <ArrowLeft size={20} style={{ color: '#e8e8ed' }} />
        </button>

        {/* User Info */}
        <div className="relative">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #6c5ce7 0%, #4facfe 100%)',
            }}
          >
            <span style={{ fontSize: '20px' }}>{conversation.user.avatar}</span>
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

        <div className="flex-1">
          <h2 style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>
            {conversation.user.name}
          </h2>
          <p style={{ fontSize: '11px', color: '#8888a0' }}>
            {conversation.user.isOnline ? 'En ligne' : 'Hors ligne'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className="flex"
            style={{
              justifyContent: message.isOwn ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              className="max-w-[75%] rounded-2xl px-4 py-2"
              style={{
                background: message.isOwn
                  ? '#6c5ce7'
                  : '#1a1a25',
                borderBottomRightRadius: message.isOwn ? '4px' : '16px',
                borderBottomLeftRadius: message.isOwn ? '16px' : '4px',
              }}
            >
              <p
                style={{
                  fontSize: '13px',
                  color: '#e8e8ed',
                  lineHeight: '1.5',
                }}
              >
                {message.content}
              </p>
              <p
                className="mt-1"
                style={{
                  fontSize: '10px',
                  color: message.isOwn ? 'rgba(232,232,237,0.7)' : '#8888a0',
                  textAlign: 'right',
                }}
              >
                {message.timestamp}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div
        className="px-4 py-3 border-t"
        style={{
          background: '#111119',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-end gap-2">
          <button className="p-2 rounded-lg hover:bg-[#1f1f2e] transition-colors">
            <Image size={20} style={{ color: '#8888a0' }} />
          </button>

          <div className="flex-1 flex items-center gap-2 px-4 py-2 rounded-xl border"
            style={{
              background: '#1a1a25',
              borderColor: 'rgba(255,255,255,0.06)',
            }}
          >
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
              placeholder="Message..."
              className="flex-1 outline-none"
              style={{
                background: 'transparent',
                fontSize: '13px',
                color: '#e8e8ed',
              }}
            />
            <button className="p-1 rounded-lg hover:bg-[#1f1f2e] transition-colors">
              <Smile size={18} style={{ color: '#8888a0' }} />
            </button>
          </div>

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
