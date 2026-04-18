import React, { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { Message, User } from '../App';
import { X } from 'lucide-react';

interface MessageFeedProps {
  messages: Message[];
  onUserClick: (user: User) => void;
  selectedTag: string | null;
  onClearFilter: () => void;
}

export function MessageFeed({ messages, onUserClick, selectedTag, onClearFilter }: MessageFeedProps) {
  const feedEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 p-4">
        {selectedTag ? (
          <>
            <p className="text-lg mb-2">No messages with #{selectedTag}</p>
            <button
              onClick={onClearFilter}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Clear Filter
            </button>
          </>
        ) : (
          <>
            <p className="text-lg">No messages yet</p>
            <p className="text-sm mt-2">Be the first to say something!</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-4">
      {selectedTag && (
        <div className="mb-4 flex items-center justify-center gap-2">
          <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full flex items-center gap-2">
            <span>Filtering by: #{selectedTag}</span>
            <button
              onClick={onClearFilter}
              className="hover:bg-blue-200 rounded-full p-1 transition-colors"
              aria-label="Clear filter"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
      
      <div className="space-y-4 max-w-4xl mx-auto">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onUserClick={onUserClick}
          />
        ))}
        <div ref={feedEndRef} />
      </div>
    </div>
  );
}
