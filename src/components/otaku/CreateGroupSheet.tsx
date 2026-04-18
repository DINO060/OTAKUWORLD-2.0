import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

interface CreateGroupSheetProps {
  onClose: () => void;
}

export function CreateGroupSheet({ onClose }: CreateGroupSheetProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('🏴‍☠️');
  const [isPublic, setIsPublic] = useState(true);
  const [channels, setChannels] = useState([
    { id: '1', name: 'général', checked: true },
    { id: '2', name: 'annonces', checked: true },
    { id: '3', name: 'off-topic', checked: false },
  ]);

  const emojiOptions = ['🏴‍☠️', '👹', '⚔️', '🎨', '🔥', '💎', '🌟', '🎮', '📚', '🎭'];

  const toggleChannel = (id: string) => {
    setChannels(
      channels.map((ch) =>
        ch.id === id ? { ...ch, checked: !ch.checked } : ch
      )
    );
  };

  const addChannel = () => {
    const newId = String(channels.length + 1);
    setChannels([...channels, { id: newId, name: '', checked: true }]);
  };

  const updateChannelName = (id: string, name: string) => {
    setChannels(
      channels.map((ch) => (ch.id === id ? { ...ch, name } : ch))
    );
  };

  const removeChannel = (id: string) => {
    setChannels(channels.filter((ch) => ch.id !== id));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center"
      style={{ background: 'rgba(0,0,0,0.8)' }}
      onClick={onClose}
    >
      <div
        className="w-full md:max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-3xl md:rounded-2xl"
        style={{ background: '#111119' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle */}
        <div className="flex justify-center py-2 md:hidden">
          <div
            className="w-10 h-1 rounded-full"
            style={{ background: '#555570' }}
          />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#e8e8ed' }}>
            Créer un Groupe
          </h3>
          <div className="flex items-center gap-2">
            <button
              className="px-4 py-2 rounded-lg transition-colors"
              style={{
                background: '#6c5ce7',
                fontSize: '13px',
                fontWeight: 700,
                color: '#ffffff',
              }}
            >
              Créer
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[#1f1f2e] transition-colors"
            >
              <X size={20} style={{ color: '#e8e8ed' }} />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#8888a0',
                marginBottom: '8px',
                display: 'block',
              }}
            >
              Nom:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: One Piece Fans"
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
                fontSize: '12px',
                fontWeight: 600,
                color: '#8888a0',
                marginBottom: '8px',
                display: 'block',
              }}
            >
              Description:
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décris ton groupe..."
              rows={3}
              className="w-full px-3 py-2 rounded-xl border outline-none focus:border-[#6c5ce7] transition-colors resize-none"
              style={{
                background: '#1a1a25',
                borderColor: 'rgba(255,255,255,0.06)',
                fontSize: '13px',
                color: '#e8e8ed',
              }}
            />
          </div>

          {/* Icon */}
          <div>
            <label
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#8888a0',
                marginBottom: '8px',
                display: 'block',
              }}
            >
              Icône:
            </label>
            <div className="flex flex-wrap gap-2">
              {emojiOptions.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setIcon(emoji)}
                  className="w-12 h-12 rounded-xl flex items-center justify-center transition-all"
                  style={{
                    background: icon === emoji ? '#6c5ce7' : '#1a1a25',
                    fontSize: '24px',
                    border: icon === emoji ? '2px solid #6c5ce7' : 'none',
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Visibility */}
          <div>
            <label
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#8888a0',
                marginBottom: '8px',
                display: 'block',
              }}
            >
              Visibilité:
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setIsPublic(true)}
                className="flex-1 p-3 rounded-xl border transition-all"
                style={{
                  background: isPublic ? 'rgba(108,92,231,0.12)' : '#1a1a25',
                  borderColor: isPublic ? '#6c5ce7' : 'rgba(255,255,255,0.06)',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: isPublic ? '#6c5ce7' : '#8888a0',
                }}
              >
                <span style={{ fontSize: '18px', marginBottom: '4px', display: 'block' }}>
                  🌍
                </span>
                Public
              </button>
              <button
                onClick={() => setIsPublic(false)}
                className="flex-1 p-3 rounded-xl border transition-all"
                style={{
                  background: !isPublic ? 'rgba(108,92,231,0.12)' : '#1a1a25',
                  borderColor: !isPublic ? '#6c5ce7' : 'rgba(255,255,255,0.06)',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: !isPublic ? '#6c5ce7' : '#8888a0',
                }}
              >
                <span style={{ fontSize: '18px', marginBottom: '4px', display: 'block' }}>
                  🔒
                </span>
                Privé
              </button>
            </div>
          </div>

          {/* Channels */}
          <div>
            <label
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#8888a0',
                marginBottom: '8px',
                display: 'block',
              }}
            >
              Channels par défaut:
            </label>
            <div className="space-y-2">
              {channels.map((channel) => (
                <div key={channel.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={channel.checked}
                    onChange={() => toggleChannel(channel.id)}
                    className="w-4 h-4"
                    style={{
                      accentColor: '#6c5ce7',
                    }}
                  />
                  <span style={{ fontSize: '12px', color: '#8888a0' }}>#</span>
                  <input
                    type="text"
                    value={channel.name}
                    onChange={(e) => updateChannelName(channel.id, e.target.value)}
                    placeholder="nom-du-channel"
                    className="flex-1 px-3 py-2 rounded-xl border outline-none focus:border-[#6c5ce7] transition-colors"
                    style={{
                      background: '#1a1a25',
                      borderColor: 'rgba(255,255,255,0.06)',
                      fontSize: '12px',
                      color: '#e8e8ed',
                    }}
                  />
                  {channels.length > 1 && (
                    <button
                      onClick={() => removeChannel(channel.id)}
                      className="p-2 rounded-lg hover:bg-[#1f1f2e] transition-colors"
                    >
                      <Trash2 size={14} style={{ color: '#ef4444' }} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={addChannel}
              className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl border transition-colors hover:bg-[#1f1f2e]"
              style={{
                borderColor: 'rgba(255,255,255,0.06)',
                fontSize: '12px',
                fontWeight: 600,
                color: '#8888a0',
              }}
            >
              <Plus size={14} />
              Ajouter un channel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
