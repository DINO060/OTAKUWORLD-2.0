import React, { useState } from 'react';
import { Smile, Send, Hash } from 'lucide-react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

interface ComposerProps {
  onSendMessage: (text: string, tags: string[], replyTo?: any) => void;
  isAuthenticated: boolean;
}

export function Composer({ onSendMessage, isAuthenticated }: ComposerProps) {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleSend = () => {
    if (!message.trim()) return;
    
    if (!isAuthenticated) {
      alert('Please sign in to send messages');
      return;
    }

    // Extract tags from message
    const tagRegex = /#(\w+)/g;
    const tags: string[] = [];
    let match;
    while ((match = tagRegex.exec(message)) !== null) {
      tags.push(match[1]);
    }

    onSendMessage(message, tags);
    setMessage('');
    setShowEmojiPicker(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const addHashtag = () => {
    setMessage(prev => prev + '#');
  };

  const onEmojiSelect = (emoji: any) => {
    setMessage(prev => prev + emoji.native);
  };

  return (
    <div className="bg-white border-t border-gray-200 px-4 py-3 relative">
      {showEmojiPicker && (
        <div className="absolute bottom-full left-4 mb-2 z-10">
          <Picker
            data={data}
            onEmojiSelect={onEmojiSelect}
            theme="light"
            onClickOutside={() => setShowEmojiPicker(false)}
          />
        </div>
      )}

      <div className="flex items-center gap-2 max-w-4xl mx-auto">
        {/* Emoji Button */}
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
          aria-label="Add emoji"
        >
          <Smile size={24} />
        </button>

        {/* Hashtag Button */}
        <button
          onClick={addHashtag}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
          aria-label="Add hashtag"
        >
          <Hash size={24} />
        </button>

        {/* Input Field */}
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={isAuthenticated ? "Type your message..." : "Sign in to send messages..."}
          disabled={!isAuthenticated}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        />

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!message.trim() || !isAuthenticated}
          className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          aria-label="Send message"
        >
          <Send size={24} />
        </button>
      </div>
    </div>
  );
}
