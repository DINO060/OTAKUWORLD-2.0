import React, { useState } from 'react';
import { X, Image as ImageIcon } from 'lucide-react';

interface CreateGroupModalProps {
  onClose: () => void;
  onCreate: (group: {
    name: string;
    description: string;
    icon: string;
    isPublic: boolean;
    defaultChannels: string[];
  }) => void;
}

export function CreateGroupModal({ onClose, onCreate }: CreateGroupModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('🏴‍☠️');
  const [isPublic, setIsPublic] = useState(true);
  const [channels, setChannels] = useState([
    { id: 'general', name: 'général', checked: true },
    { id: 'announcements', name: 'annonces', checked: true },
    { id: 'off-topic', name: 'off-topic', checked: false },
  ]);
  const [newChannelName, setNewChannelName] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const emojiOptions = ['🏴‍☠️', '👹', '🎨', '⚔️', '⚡', '🔥', '💎', '🌸', '🐉', '🎭', '🎮', '📺', '🎬', '🎵'];

  // Suggestions de channels prédéfinis
  const channelSuggestions = [
    '📰 général',
    '📢 annonces',
    '🧠 théories',
    '⚠️ spoilers',
    '🎨 fan-art',
    '😂 memes',
    '🎮 gaming',
    '📺 anime',
    '📖 manga',
    '💬 discussion',
    '🎵 musique',
    '🎬 films',
    '❓ questions',
    '💡 suggestions',
    '🔧 support',
  ];

  const handleCreate = () => {
    if (!name.trim()) return;

    const selectedChannels = channels.filter((ch) => ch.checked).map((ch) => ch.name);

    onCreate({
      name: name.trim(),
      description: description.trim(),
      icon,
      isPublic,
      defaultChannels: selectedChannels,
    });

    onClose();
  };

  const addChannel = () => {
    if (!newChannelName.trim()) return;
    setChannels([
      ...channels,
      {
        id: Date.now().toString(),
        name: newChannelName.trim(),
        checked: true,
      },
    ]);
    setNewChannelName('');
    setShowSuggestions(false);
  };

  const toggleChannel = (id: string) => {
    setChannels(channels.map((ch) => (ch.id === id ? { ...ch, checked: !ch.checked } : ch)));
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        style={{
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
        }}
        onClick={onClose}
      />

      {/* Modal - Bottom Sheet Style */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up"
        style={{
          background: '#111119',
          borderRadius: '20px 20px 0 0',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div
            style={{
              width: '40px',
              height: '4px',
              background: '#555570',
              borderRadius: '2px',
            }}
          />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b sticky top-0 z-10"
          style={{
            background: '#111119',
            borderColor: 'rgba(255,255,255,0.06)',
          }}
        >
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#e8e8ed' }}>Créer un Groupe</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreate}
              disabled={!name.trim()}
              className="px-4 py-2 rounded-lg transition-colors"
              style={{
                background: name.trim() ? '#6c5ce7' : '#555570',
                fontSize: '13px',
                fontWeight: 700,
                color: '#ffffff',
                opacity: name.trim() ? 1 : 0.5,
                cursor: name.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              Créer
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[#1f1f2e] transition-colors"
            >
              <X size={18} style={{ color: '#8888a0' }} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-4 space-y-4">
          {/* Nom */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: '#8888a0',
                marginBottom: '6px',
              }}
            >
              Nom du groupe *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="One Piece Fans"
              maxLength={50}
              className="w-full px-3 py-2 rounded-xl border outline-none focus:border-[#6c5ce7] transition-colors"
              style={{
                background: '#1a1a25',
                borderColor: 'rgba(255,255,255,0.06)',
                fontSize: '13px',
                color: '#e8e8ed',
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: '#8888a0',
                marginBottom: '6px',
              }}
            >
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Le groupe #1 des fans de One Piece!"
              maxLength={200}
              rows={3}
              className="w-full px-3 py-2 rounded-xl border outline-none focus:border-[#6c5ce7] transition-colors resize-none"
              style={{
                background: '#1a1a25',
                borderColor: 'rgba(255,255,255,0.06)',
                fontSize: '13px',
                color: '#e8e8ed',
                lineHeight: 1.5,
              }}
            />
          </div>

          {/* Cover Image */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: '#8888a0',
                marginBottom: '6px',
              }}
            >
              Cover
            </label>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-xl border transition-colors hover:border-[#6c5ce7]"
              style={{
                background: '#1a1a25',
                borderColor: 'rgba(255,255,255,0.06)',
              }}
            >
              <ImageIcon size={16} style={{ color: '#8888a0' }} />
              <span style={{ fontSize: '13px', color: '#8888a0' }}>Ajouter une image</span>
            </button>
          </div>

          {/* Icône Emoji */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: '#8888a0',
                marginBottom: '6px',
              }}
            >
              Icône du groupe
            </label>
            <div className="flex flex-wrap gap-2">
              {emojiOptions.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setIcon(emoji)}
                  className="w-12 h-12 rounded-xl flex items-center justify-center transition-all"
                  style={{
                    background: icon === emoji ? 'rgba(108,92,231,0.12)' : '#1a1a25',
                    border: icon === emoji ? '2px solid #6c5ce7' : '1px solid rgba(255,255,255,0.06)',
                    fontSize: '24px',
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Visibilité */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: '#8888a0',
                marginBottom: '8px',
              }}
            >
              Visibilité
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setIsPublic(true)}
                className="flex-1 px-4 py-3 rounded-xl border transition-all"
                style={{
                  background: isPublic ? 'rgba(108,92,231,0.12)' : '#1a1a25',
                  borderColor: isPublic ? '#6c5ce7' : 'rgba(255,255,255,0.06)',
                }}
              >
                <div
                  className="w-5 h-5 rounded-full border-2 mx-auto mb-2 flex items-center justify-center"
                  style={{
                    borderColor: isPublic ? '#6c5ce7' : '#555570',
                  }}
                >
                  {isPublic && (
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: '#6c5ce7' }}
                    />
                  )}
                </div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#e8e8ed' }}>Public</p>
                <p style={{ fontSize: '11px', color: '#8888a0', marginTop: '4px' }}>
                  Tout le monde peut rejoindre
                </p>
              </button>

              <button
                onClick={() => setIsPublic(false)}
                className="flex-1 px-4 py-3 rounded-xl border transition-all"
                style={{
                  background: !isPublic ? 'rgba(108,92,231,0.12)' : '#1a1a25',
                  borderColor: !isPublic ? '#6c5ce7' : 'rgba(255,255,255,0.06)',
                }}
              >
                <div
                  className="w-5 h-5 rounded-full border-2 mx-auto mb-2 flex items-center justify-center"
                  style={{
                    borderColor: !isPublic ? '#6c5ce7' : '#555570',
                  }}
                >
                  {!isPublic && (
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: '#6c5ce7' }}
                    />
                  )}
                </div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#e8e8ed' }}>Privé</p>
                <p style={{ fontSize: '11px', color: '#8888a0', marginTop: '4px' }}>
                  Sur invitation uniquement
                </p>
              </button>
            </div>
          </div>

          {/* Channels par défaut */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: '#8888a0',
                marginBottom: '8px',
              }}
            >
              Channels par défaut
            </label>
            <div className="space-y-2">
              {channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => toggleChannel(channel.id)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#1f1f2e] transition-colors"
                  style={{
                    background: 'transparent',
                  }}
                >
                  <div
                    className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0"
                    style={{
                      borderColor: channel.checked ? '#6c5ce7' : '#555570',
                      background: channel.checked ? '#6c5ce7' : 'transparent',
                    }}
                  >
                    {channel.checked && (
                      <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                        <path
                          d="M1 5L4.5 8.5L11 1.5"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <span style={{ fontSize: '13px', color: '#e8e8ed' }}>
                    # {channel.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Add Channel */}
            <div className="mt-3 relative">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addChannel();
                    }
                  }}
                  placeholder="Ex: général, théories, spoilers..."
                  className="flex-1 px-3 py-2 rounded-lg border outline-none focus:border-[#6c5ce7] transition-colors"
                  style={{
                    background: '#1a1a25',
                    borderColor: showSuggestions ? '#6c5ce7' : 'rgba(255,255,255,0.06)',
                    fontSize: '12px',
                    color: '#e8e8ed',
                  }}
                />
                <button
                  onClick={addChannel}
                  disabled={!newChannelName.trim()}
                  className="px-4 py-2 rounded-lg transition-colors"
                  style={{
                    background: newChannelName.trim() ? '#6c5ce7' : '#555570',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#ffffff',
                    opacity: newChannelName.trim() ? 1 : 0.5,
                    cursor: newChannelName.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  + Ajouter
                </button>
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && (
                <div
                  className="absolute top-full left-0 right-12 mt-1 rounded-lg border overflow-hidden z-10"
                  style={{
                    background: '#1a1a25',
                    borderColor: '#6c5ce7',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}
                >
                  <div
                    className="px-3 py-2 border-b"
                    style={{
                      background: '#111119',
                      borderColor: 'rgba(255,255,255,0.06)',
                    }}
                  >
                    <p style={{ fontSize: '10px', fontWeight: 700, color: '#8888a0', textTransform: 'uppercase' }}>
                      Suggestions de channels
                    </p>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {channelSuggestions.map((suggestion) => {
                      const [emoji, ...nameParts] = suggestion.split(' ');
                      const channelName = nameParts.join(' ');
                      return (
                        <button
                          key={suggestion}
                          onClick={() => {
                            setNewChannelName(channelName);
                            setShowSuggestions(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-[#1f1f2e] transition-colors flex items-center gap-2"
                        >
                          <span style={{ fontSize: '16px' }}>{emoji}</span>
                          <span style={{ fontSize: '12px', color: '#e8e8ed' }}>
                            #{channelName}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Padding */}
        <div className="h-8" />
      </div>
    </>
  );
}