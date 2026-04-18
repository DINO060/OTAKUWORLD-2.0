import React, { useState, useRef } from 'react';
import { X, Image as ImageIcon, BookOpen, Brain, BarChart3, Plus, Trash2, Paperclip, Loader2, Gamepad2 } from 'lucide-react';

interface User { id: string; username: string; handle: string; avatar: string; }

interface PostEmbed {
  type: 'chapter' | 'quiz' | 'game';
  title: string;
  subtitle: string;
  icon: string;
}

interface PollData {
  question: string;
  options: string[];
}

interface ComposePostProps {
  currentUser: User | null;
  onClose: () => void;
  onPost: (content: string, images?: string[], embed?: PostEmbed, poll?: PollData) => void | Promise<void>;
}

export function ComposePost({ currentUser, onClose, onPost }: ComposePostProps) {
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [embed, setEmbed] = useState<PostEmbed | null>(null);
  const [showPoll, setShowPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [showChapterForm, setShowChapterForm] = useState(false);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [showGameForm, setShowGameForm] = useState(false);
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterSubtitle, setChapterSubtitle] = useState('');
  const [quizTitle, setQuizTitle] = useState('');
  const [quizSubtitle, setQuizSubtitle] = useState('');
  const [gamePlayerCount, setGamePlayerCount] = useState('8');
  const [gameMode, setGameMode] = useState<'normal' | 'chaos'>('normal');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const popularTags = ['#manga', '#anime', '#webtoon', '#onepiece', '#jjk', '#naruto'];

  const canPost = content.trim() || images.length > 0 || embed || (showPoll && pollOptions.filter(o => o.trim()).length >= 2);

  const handlePost = async () => {
    if (!canPost || publishing) return;
    setPublishing(true);
    const pollData = showPoll && pollOptions.filter(o => o.trim()).length >= 2
      ? { question: content.trim() || 'Sondage', options: pollOptions.filter(o => o.trim()) }
      : undefined;
    await onPost(
      content.trim(),
      images.length > 0 ? images : undefined,
      embed || undefined,
      pollData,
    );
    setPublishing(false);
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
    const filesToRead = Array.from(files).slice(0, 4 - images.length).filter(f => {
      if (f.type.startsWith('video/')) {
        if (f.size > MAX_VIDEO_SIZE) {
          alert(`La vidéo "${f.name}" dépasse la limite de 50MB. Utilisez une vidéo plus courte (max ~5 minutes).`);
          return false;
        }
      }
      return f.type.startsWith('image/') || f.type.startsWith('video/');
    });
    filesToRead.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setImages((prev) => [...prev, reader.result as string].slice(0, 4));
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChapterConfirm = () => {
    if (chapterTitle.trim()) {
      setEmbed({
        type: 'chapter',
        title: chapterTitle.trim(),
        subtitle: chapterSubtitle.trim() || 'Nouveau chapitre',
        icon: '⚔️',
      });
      setShowChapterForm(false);
      setShowPoll(false);
    }
  };

  const handleQuizConfirm = () => {
    if (quizTitle.trim()) {
      setEmbed({
        type: 'quiz',
        title: quizTitle.trim(),
        subtitle: quizSubtitle.trim() || 'Quiz',
        icon: '🧠',
      });
      setShowQuizForm(false);
      setShowPoll(false);
    }
  };

  const handleGameConfirm = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const count = Math.min(30, Math.max(4, parseInt(gamePlayerCount) || 8));
    setEmbed({
      type: 'game',
      title: `🐺 Loup-Garou — ${gameMode === 'chaos' ? 'Chaos' : 'Normal'}`,
      subtitle: `${count} joueurs · Code: ${code}`,
      icon: '🐺',
    });
    setShowGameForm(false);
    setShowPoll(false);
  };

  const addPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const updatePollOption = (index: number, value: string) => {
    setPollOptions(pollOptions.map((o, i) => i === index ? value : o));
  };

  if (!currentUser) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleImageSelect}
        style={{ display: 'none' }}
      />

      {/* Bottom Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300"
        style={{
          background: '#111119',
          borderRadius: '20px 20px 0 0',
          maxHeight: '90vh',
        }}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div
            className="w-10 h-1 rounded-full"
            style={{ background: '#555570' }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#e8e8ed' }}>
            Nouveau Post
          </h2>
          <button
            onClick={handlePost}
            disabled={!canPost || publishing}
            className="px-4 py-2 rounded-lg transition-opacity flex items-center gap-2"
            style={{
              background: canPost && !publishing ? '#6c5ce7' : '#1f1f2e',
              fontSize: '13px',
              fontWeight: 700,
              color: canPost && !publishing ? '#ffffff' : '#555570',
              opacity: canPost && !publishing ? 1 : 0.5,
            }}
          >
            {publishing && <Loader2 size={14} className="animate-spin" />}
            {publishing ? 'Publication...' : 'Publier'}
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          {/* User Info */}
          <div className="flex items-center gap-3 px-4 py-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden"
              style={{ background: '#6c5ce7' }}
            >
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>
                  {currentUser.username[0].toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>
                {currentUser.username}
              </p>
            </div>
          </div>

          {/* Text Input */}
          <div className="px-4 pb-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={showPoll ? "Question du sondage..." : "Quoi de neuf dans le monde otaku?"}
              className="w-full bg-transparent border-none outline-none resize-none"
              style={{
                fontSize: '14px',
                lineHeight: '1.5',
                color: '#e8e8ed',
                minHeight: '80px',
              }}
              autoFocus
              maxLength={280}
            />
            <div className="flex justify-end mt-2">
              <span style={{ fontSize: '11px', color: '#8888a0' }}>
                {content.length}/280
              </span>
            </div>
          </div>

          {/* Image Previews */}
          {images.length > 0 && (
            <div className="px-4 pb-4">
              <div className={`grid gap-2 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {images.map((img, i) => (
                  <div key={i} className="relative rounded-xl overflow-hidden" style={{ aspectRatio: images.length === 1 ? '16/10' : '1' }}>
                    {img.startsWith('data:video/') || img.match(/\.(mp4|webm|mov)$/i) ? (
                      <video src={img} controls className="w-full h-full object-cover" style={{ background: '#000' }} />
                    ) : (
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    )}
                    <div
                      onClick={() => removeImage(i)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer"
                      style={{ background: 'rgba(0,0,0,0.7)' }}
                    >
                      <X size={14} color="#fff" />
                    </div>
                  </div>
                ))}
              </div>
              {images.length < 4 && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 flex items-center justify-center gap-2 py-2 rounded-lg cursor-pointer hover:bg-[#1f1f2e] transition-colors"
                  style={{ border: '1px dashed rgba(255,255,255,0.1)' }}
                >
                  <Plus size={14} style={{ color: '#8888a0' }} />
                  <span style={{ fontSize: '12px', color: '#8888a0' }}>Ajouter ({images.length}/4)</span>
                </div>
              )}
            </div>
          )}

          {/* Embed Preview */}
          {embed && (
            <div className="px-4 pb-4">
              <div
                className="p-3 rounded-2xl border flex items-center justify-between"
                style={{ background: '#0c0c14', borderColor: 'rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: embed.type === 'chapter' ? 'rgba(240,147,251,0.12)' : 'rgba(255,210,0,0.12)' }}
                  >
                    <span style={{ fontSize: '20px' }}>{embed.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>{embed.title}</p>
                    <p style={{ fontSize: '12px', color: '#8888a0' }}>{embed.subtitle}</p>
                  </div>
                </div>
                <div
                  onClick={() => setEmbed(null)}
                  className="p-2 rounded-lg cursor-pointer hover:bg-[#1f1f2e] transition-colors"
                >
                  <X size={16} style={{ color: '#8888a0' }} />
                </div>
              </div>
            </div>
          )}

          {/* Chapter Form */}
          {showChapterForm && !embed && (
            <div className="px-4 pb-4">
              <div className="p-3 rounded-2xl" style={{ background: '#0c0c14', border: '1px solid rgba(108,92,231,0.3)' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#6c5ce7', marginBottom: '10px' }}>
                  📖 Lier un chapitre
                </p>
                <input
                  type="text"
                  value={chapterTitle}
                  onChange={(e) => setChapterTitle(e.target.value)}
                  placeholder="Titre du manga/webtoon"
                  className="w-full outline-none mb-2"
                  style={{
                    background: '#1a1a25',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    color: '#e8e8ed',
                  }}
                />
                <input
                  type="text"
                  value={chapterSubtitle}
                  onChange={(e) => setChapterSubtitle(e.target.value)}
                  placeholder="Ex: Chapitre 201 - Final"
                  className="w-full outline-none mb-3"
                  style={{
                    background: '#1a1a25',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    color: '#e8e8ed',
                  }}
                />
                <div className="flex gap-2 justify-end">
                  <div
                    onClick={() => setShowChapterForm(false)}
                    className="px-3 py-1.5 rounded-lg cursor-pointer hover:bg-[#1f1f2e] transition-colors"
                    style={{ fontSize: '12px', color: '#8888a0' }}
                  >
                    Annuler
                  </div>
                  <div
                    onClick={handleChapterConfirm}
                    className="px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      background: chapterTitle.trim() ? '#6c5ce7' : '#1f1f2e',
                      color: chapterTitle.trim() ? '#fff' : '#555570',
                    }}
                  >
                    Ajouter
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quiz Form */}
          {showQuizForm && !embed && (
            <div className="px-4 pb-4">
              <div className="p-3 rounded-2xl" style={{ background: '#0c0c14', border: '1px solid rgba(255,210,0,0.3)' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#ffd200', marginBottom: '10px' }}>
                  🧠 Lier un quiz
                </p>
                <input
                  type="text"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  placeholder="Titre du quiz"
                  className="w-full outline-none mb-2"
                  style={{
                    background: '#1a1a25',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    color: '#e8e8ed',
                  }}
                />
                <input
                  type="text"
                  value={quizSubtitle}
                  onChange={(e) => setQuizSubtitle(e.target.value)}
                  placeholder="Ex: 10 questions · Naruto"
                  className="w-full outline-none mb-3"
                  style={{
                    background: '#1a1a25',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    color: '#e8e8ed',
                  }}
                />
                <div className="flex gap-2 justify-end">
                  <div
                    onClick={() => setShowQuizForm(false)}
                    className="px-3 py-1.5 rounded-lg cursor-pointer hover:bg-[#1f1f2e] transition-colors"
                    style={{ fontSize: '12px', color: '#8888a0' }}
                  >
                    Annuler
                  </div>
                  <div
                    onClick={handleQuizConfirm}
                    className="px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      background: quizTitle.trim() ? '#ffd200' : '#1f1f2e',
                      color: quizTitle.trim() ? '#000' : '#555570',
                    }}
                  >
                    Ajouter
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Game Form */}
          {showGameForm && !embed && (
            <div className="px-4 pb-4">
              <div className="p-3 rounded-2xl" style={{ background: '#0c0c14', border: '1px solid rgba(239,68,68,0.3)' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#ef4444', marginBottom: '10px' }}>
                  🐺 Créer une partie Loup-Garou
                </p>
                <div className="flex gap-2 mb-2">
                  <input
                    type="number"
                    value={gamePlayerCount}
                    onChange={(e) => setGamePlayerCount(e.target.value)}
                    placeholder="Joueurs"
                    min={4}
                    max={30}
                    className="flex-1 outline-none"
                    style={{
                      background: '#1a1a25',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      fontSize: '13px',
                      color: '#e8e8ed',
                    }}
                  />
                  <div className="flex gap-1">
                    {(['normal', 'chaos'] as const).map(mode => (
                      <div
                        key={mode}
                        onClick={() => setGameMode(mode)}
                        className="px-3 py-2 rounded-lg cursor-pointer transition-colors flex items-center"
                        style={{
                          background: gameMode === mode ? (mode === 'chaos' ? '#ef4444' : '#22c55e') : '#1a1a25',
                          color: gameMode === mode ? '#fff' : '#8888a0',
                          fontSize: '12px',
                          fontWeight: 600,
                          border: '1px solid rgba(255,255,255,0.1)',
                        }}
                      >
                        {mode === 'normal' ? '🏡 Normal' : '🔥 Chaos'}
                      </div>
                    ))}
                  </div>
                </div>
                <p style={{ fontSize: '11px', color: '#555570', marginBottom: '8px' }}>
                  Un code de room sera généré automatiquement
                </p>
                <div className="flex gap-2 justify-end">
                  <div
                    onClick={() => setShowGameForm(false)}
                    className="px-3 py-1.5 rounded-lg cursor-pointer hover:bg-[#1f1f2e] transition-colors"
                    style={{ fontSize: '12px', color: '#8888a0' }}
                  >
                    Annuler
                  </div>
                  <div
                    onClick={handleGameConfirm}
                    className="px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      background: '#ef4444',
                      color: '#fff',
                    }}
                  >
                    🐺 Créer la partie
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Poll Options */}
          {showPoll && (
            <div className="px-4 pb-4">
              <div className="p-3 rounded-2xl" style={{ background: '#0c0c14', border: '1px solid rgba(79,172,254,0.3)' }}>
                <div className="flex items-center justify-between mb-3">
                  <p style={{ fontSize: '12px', fontWeight: 700, color: '#4facfe' }}>
                    📊 Options du sondage
                  </p>
                  <div
                    onClick={() => { setShowPoll(false); setPollOptions(['', '']); }}
                    className="cursor-pointer p-1 rounded hover:bg-[#1f1f2e]"
                  >
                    <X size={14} style={{ color: '#8888a0' }} />
                  </div>
                </div>
                {pollOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => updatePollOption(i, e.target.value)}
                      placeholder={`Option ${i + 1}`}
                      className="flex-1 outline-none"
                      style={{
                        background: '#1a1a25',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '10px',
                        padding: '8px 12px',
                        fontSize: '13px',
                        color: '#e8e8ed',
                      }}
                    />
                    {pollOptions.length > 2 && (
                      <div
                        onClick={() => removePollOption(i)}
                        className="cursor-pointer p-1.5 rounded-lg hover:bg-[#1f1f2e]"
                      >
                        <Trash2 size={14} style={{ color: '#ef4444' }} />
                      </div>
                    )}
                  </div>
                ))}
                {pollOptions.length < 4 && (
                  <div
                    onClick={addPollOption}
                    className="flex items-center justify-center gap-2 py-2 rounded-lg cursor-pointer hover:bg-[#1f1f2e] transition-colors mt-1"
                    style={{ border: '1px dashed rgba(255,255,255,0.1)' }}
                  >
                    <Plus size={14} style={{ color: '#4facfe' }} />
                    <span style={{ fontSize: '12px', color: '#4facfe' }}>Ajouter une option</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tags */}
          <div className="px-4 pb-4">
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#8888a0', marginBottom: '8px' }}>
              Tags populaires:
            </p>
            <div className="flex flex-wrap gap-2">
              {popularTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className="px-3 py-1 rounded-full transition-colors"
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    background: selectedTags.includes(tag)
                      ? 'rgba(108,92,231,0.12)'
                      : '#1a1a25',
                    color: selectedTags.includes(tag) ? '#6c5ce7' : '#8888a0',
                    border: selectedTags.includes(tag)
                      ? '1px solid #6c5ce7'
                      : '1px solid transparent',
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div
          className="flex items-center gap-4 px-4 py-3 border-t"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <div className="relative" style={{ zIndex: showAttachMenu ? 60 : 'auto' }}>
            <div
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-[#1f1f2e] transition-colors cursor-pointer"
              style={{ opacity: images.length >= 4 ? 0.4 : 1 }}
            >
              <Paperclip size={18} style={{ color: images.length > 0 ? '#6c5ce7' : '#8888a0' }} />
            </div>
            {showAttachMenu && (
              <>
                <div className="fixed inset-0" style={{ zIndex: 55 }} onClick={() => setShowAttachMenu(false)} />
                <div
                  className="absolute left-0 rounded-xl overflow-hidden shadow-2xl"
                  style={{ background: '#1a1a25', border: '1px solid rgba(255,255,255,0.1)', minWidth: '200px', bottom: '100%', marginBottom: '8px', zIndex: 60 }}
                >
                  <div
                    onClick={() => {
                      setShowAttachMenu(false);
                      if (images.length < 4) fileInputRef.current?.click();
                    }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-[#252535] transition-colors cursor-pointer"
                  >
                    <ImageIcon size={16} style={{ color: '#8888a0' }} />
                    <span style={{ fontSize: '13px', color: '#e8e8ed' }}>Photo ou vidéo</span>
                  </div>
                </div>
              </>
            )}
          </div>
          <div
            onClick={() => {
              setShowChapterForm(true);
              setShowQuizForm(false);
              setShowPoll(false);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#1f1f2e] transition-colors cursor-pointer"
          >
            <BookOpen size={18} style={{ color: embed?.type === 'chapter' ? '#6c5ce7' : '#8888a0' }} />
            <span style={{ fontSize: '12px', color: embed?.type === 'chapter' ? '#6c5ce7' : '#8888a0' }}>Chapter</span>
          </div>
          <div
            onClick={() => {
              setShowQuizForm(true);
              setShowChapterForm(false);
              setShowPoll(false);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#1f1f2e] transition-colors cursor-pointer"
          >
            <Brain size={18} style={{ color: embed?.type === 'quiz' ? '#ffd200' : '#8888a0' }} />
            <span style={{ fontSize: '12px', color: embed?.type === 'quiz' ? '#ffd200' : '#8888a0' }}>Quiz</span>
          </div>
          <div
            onClick={() => {
              setShowGameForm(true);
              setShowChapterForm(false);
              setShowQuizForm(false);
              setShowPoll(false);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#1f1f2e] transition-colors cursor-pointer"
          >
            <Gamepad2 size={18} style={{ color: embed?.type === 'game' ? '#ef4444' : '#8888a0' }} />
            <span style={{ fontSize: '12px', color: embed?.type === 'game' ? '#ef4444' : '#8888a0' }}>Jeu</span>
          </div>
          <div
            onClick={() => {
              setShowPoll(!showPoll);
              setShowChapterForm(false);
              setShowQuizForm(false);
              setShowGameForm(false);
              setEmbed(null);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#1f1f2e] transition-colors cursor-pointer"
          >
            <BarChart3 size={18} style={{ color: showPoll ? '#4facfe' : '#8888a0' }} />
            <span style={{ fontSize: '12px', color: showPoll ? '#4facfe' : '#8888a0' }}>Poll</span>
          </div>
        </div>
      </div>
    </>
  );
}
