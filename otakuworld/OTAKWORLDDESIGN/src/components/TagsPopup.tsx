import React, { useState } from 'react';
import { X, Hash, Search } from 'lucide-react';

interface TagsPopupProps {
  tags: string[];
  selectedTag: string | null;
  onTagClick: (tag: string) => void;
  onClose: () => void;
}

export function TagsPopup({ tags, selectedTag, onTagClick, onClose }: TagsPopupProps) {
  const [filter, setFilter] = useState('');

  const filteredTags = tags.filter(tag =>
    tag.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Hash className="text-blue-600" size={24} />
            <h2 className="text-xl">Tags</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Filter Input */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search tags..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Tags List */}
        <div className="flex-1 overflow-y-auto">
          {filteredTags.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No tags found
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => onTagClick(tag)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-2 ${
                    selectedTag === tag
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-800'
                  }`}
                >
                  <Hash size={18} />
                  <span>{tag}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-500 text-center">
          Click on a tag to filter messages
        </div>
      </div>
    </div>
  );
}
