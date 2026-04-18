import React from 'react';
import { Message, User } from '../App';

interface MessageBubbleProps {
  message: Message;
  onUserClick: (user: User) => void;
}

export function MessageBubble({ message, onUserClick }: MessageBubbleProps) {
  const isCurrentUser = message.isCurrentUser;

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const renderTextWithTags = (text: string) => {
    const parts = text.split(/(#\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('#')) {
        return (
          <span key={index} className="text-blue-600 font-medium">
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <button
        onClick={() => onUserClick(message.user)}
        className="flex-shrink-0 hover:opacity-80 transition-opacity"
      >
        <img
          src={message.user.avatar}
          alt={message.user.username}
          className="w-10 h-10 rounded-full"
        />
      </button>

      {/* Message Content */}
      <div className={`flex flex-col max-w-md ${isCurrentUser ? 'items-end' : 'items-start'}`}>
        <button
          onClick={() => onUserClick(message.user)}
          className="text-sm text-gray-600 hover:text-gray-800 mb-1"
        >
          {message.user.username}
        </button>

        {/* Reply Preview */}
        {message.replyTo && (
          <div className={`mb-1 px-3 py-1 bg-gray-100 rounded-lg text-xs text-gray-600 border-l-2 border-gray-400 ${isCurrentUser ? 'mr-2' : 'ml-2'}`}>
            <div className="opacity-70">
              Replying to {message.replyTo.username}
            </div>
            <div className="truncate max-w-xs">
              {message.replyTo.text}
            </div>
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={`px-4 py-2 rounded-2xl ${
            isCurrentUser
              ? 'bg-blue-600 text-white rounded-tr-sm'
              : 'bg-white text-gray-800 rounded-tl-sm shadow-sm border border-gray-200'
          }`}
        >
          <p className="whitespace-pre-wrap break-words">
            {renderTextWithTags(message.text)}
          </p>
        </div>

        {/* Timestamp */}
        <span className="text-xs text-gray-400 mt-1 px-2">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}
