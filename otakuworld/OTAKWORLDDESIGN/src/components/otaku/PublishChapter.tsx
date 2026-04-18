import React, { useState, useRef } from 'react';
import { ArrowLeft, Plus, X, Image as ImageIcon, Upload, FileText, Package, Edit2, Check } from 'lucide-react';

type PublishMode = 'choose' | 'new-work' | 'add-chapter';
type ContentType = 'text' | 'images' | 'file' | 'batch' | null;

interface Work {
  id: string;
  title: string;
  icon: string;
  chaptersCount: number;
  status: 'En cours' | 'Terminé';
  coverUrl?: string;
  description?: string;
  tags?: string[];
}

interface PublishChapterProps {
  onBack: () => void;
  onPublishComplete?: () => void;
}

export function PublishChapter({ onBack, onPublishComplete }: PublishChapterProps) {
  // Step & Mode
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<PublishMode>('choose');

  // Metadata
  const [workTitle, setWorkTitle] = useState('');
  const [chapterNumber, setChapterNumber] = useState(1);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [existingCoverUrl, setExistingCoverUrl] = useState<string | null>(null);

  // Content
  const [contentType, setContentType] = useState<ContentType>(null);
  const [textContent, setTextContent] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [chapterFile, setChapterFile] = useState<File | null>(null);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);

  // State
  const [metadataLocked, setMetadataLocked] = useState(false);
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState(0);
  const [publishDone, setPublishDone] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [matchingWork, setMatchingWork] = useState<Work | null>(null);
  const [duplicateChapter, setDuplicateChapter] = useState(false);

  // Refs
  const coverInputRef = useRef<HTMLInputElement>(null);
  const imageFilesInputRef = useRef<HTMLInputElement>(null);
  const chapterFileInputRef = useRef<HTMLInputElement>(null);
  const batchFilesInputRef = useRef<HTMLInputElement>(null);

  // Mock data - existing works
  const existingWorks: Work[] = [
    {
      id: '1',
      title: 'Solo Leveling',
      icon: '⚔️',
      chaptersCount: 201,
      status: 'Terminé',
      coverUrl: 'https://images.unsplash.com/photo-1618519764620-7403abdbdfe9?w=200&h=300&fit=crop',
      description: 'L\'histoire de Sung Jin-Woo...',
      tags: ['#action', '#fantasy', '#leveling'],
    },
    {
      id: '2',
      title: 'Jujutsu Kaisen',
      icon: '👹',
      chaptersCount: 271,
      status: 'Terminé',
      description: 'Le monde des exorcistes...',
      tags: ['#shonen', '#action', '#supernatural'],
    },
    {
      id: '3',
      title: 'One Piece',
      icon: '🏴‍☠️',
      chaptersCount: 1120,
      status: 'En cours',
      description: 'Les aventures de Luffy...',
      tags: ['#shonen', '#aventure', '#pirates'],
    },
    {
      id: '4',
      title: 'Chainsaw Man',
      icon: '🪚',
      chaptersCount: 180,
      status: 'En cours',
      description: 'Denji devient Chainsaw Man...',
      tags: ['#action', '#gore', '#demons'],
    },
  ];

  // Check for matching work
  const checkMatching = (title: string) => {
    if (!title.trim()) {
      setMatchingWork(null);
      return;
    }
    const match = existingWorks.find(
      (w) => w.title.toLowerCase() === title.toLowerCase().trim()
    );
    setMatchingWork(match || null);
  };

  // Check for duplicate chapter
  const checkDuplicate = () => {
    if (!workTitle.trim() || !chapterNumber) {
      setDuplicateChapter(false);
      return;
    }
    // Mock: check if chapter exists
    // In real app: query database
    const isDuplicate = false; // Mock: always false for now
    setDuplicateChapter(isDuplicate);
  };

  // Add tag
  const addTag = () => {
    if (!tagInput.trim()) return;
    if (tags.length >= 8) return;
    
    let tag = tagInput.trim();
    if (!tag.startsWith('#')) {
      tag = '#' + tag;
    }
    
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setTagInput('');
  };

  // Remove tag
  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  // Handle cover file
  const handleCoverFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  // Handle image files
  const handleImageFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImageFiles(files);
  };

  // Handle chapter file
  const handleChapterFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setChapterFile(file);
    }
  };

  // Handle batch files
  const handleBatchFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 20);
    setBatchFiles(files);
  };

  // Select existing work (Step 0)
  const selectExistingWork = (work: Work) => {
    setSelectedWork(work);
    setMode('add-chapter');
    setWorkTitle(work.title);
    setDescription(work.description || '');
    setTags(work.tags || []);
    setChapterNumber(work.chaptersCount + 1);
    setExistingCoverUrl(work.coverUrl || null);
    setMetadataLocked(true);
    setStep(2); // Skip Step 1
  };

  // Select new work (Step 0)
  const selectNewWork = () => {
    setMode('new-work');
    setStep(1);
  };

  // Unlock metadata (edit button in Step 2)
  const unlockMetadata = () => {
    setMetadataLocked(false);
    setStep(1);
  };

  // Validate
  const validate = (): string[] => {
    const errs: string[] = [];
    
    if (!workTitle.trim()) errs.push('Titre requis');
    if (!chapterNumber || chapterNumber < 1) errs.push('Numéro de chapitre requis');
    if (duplicateChapter) errs.push('Ce chapitre existe déjà!');
    if (!contentType) errs.push('Choisissez un type de contenu');
    
    if (contentType === 'text' && !textContent.trim()) {
      errs.push('Contenu texte requis');
    }
    if (contentType === 'images' && imageFiles.length === 0) {
      errs.push('Ajoutez des images');
    }
    if (contentType === 'file' && !chapterFile) {
      errs.push('Ajoutez un fichier');
    }
    if (contentType === 'batch' && batchFiles.length === 0) {
      errs.push('Ajoutez des fichiers');
    }
    
    return errs;
  };

  // Go to next step
  const goNext = () => {
    if (step === 1) {
      checkDuplicate();
    }
    
    if (step === 2) {
      const errs = validate();
      setErrors(errs);
      if (errs.length === 0) {
        setStep(4); // Skip validation step if no errors
        return;
      }
      setStep(3);
      return;
    }
    
    if (step === 3) {
      const errs = validate();
      setErrors(errs);
      if (errs.length > 0) return;
      setStep(4);
      return;
    }
    
    setStep(step + 1);
  };

  // Go back
  const goBack = () => {
    if (step === 0) {
      onBack();
      return;
    }
    
    if (step === 2 && mode === 'add-chapter' && metadataLocked) {
      setStep(0);
      return;
    }
    
    setStep(step - 1);
  };

  // Publish
  const handlePublish = async () => {
    setPublishing(true);
    setPublishProgress(0);
    
    if (contentType === 'batch') {
      // Simulate batch upload
      for (let i = 0; i < batchFiles.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        setPublishProgress(i + 1);
      }
    } else {
      // Simulate single upload
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    
    setPublishing(false);
    setPublishDone(true);
    
    // Reset after 2.5s
    setTimeout(() => {
      setPublishDone(false);
      onPublishComplete?.();
    }, 2500);
  };

  // Step names
  const stepNames = ['Mode', 'Infos', 'Contenu', 'Validation', 'Publication'];
  const currentStepName = stepNames[step];

  return (
    <div className="h-full flex flex-col" style={{ background: '#0c0c14' }}>
      {/* Header */}
      <div
        className="flex flex-col border-b"
        style={{
          background: '#111119',
          borderColor: 'rgba(255,255,255,0.06)',
          padding: '12px 16px',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={goBack}
            className="flex items-center gap-2 hover:opacity-70 transition-opacity"
          >
            <ArrowLeft size={18} style={{ color: '#8888a0' }} />
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#e8e8ed' }}>
              📤 Publier un chapitre
            </span>
          </button>
        </div>
        
        <div className="flex items-center justify-between">
          <span style={{ fontSize: '10px', color: '#555570' }}>
            Étape {step + 1}/5 — {currentStepName}
          </span>
          
          {/* Step indicators */}
          <div className="flex gap-1.5">
            {[0, 1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className="rounded transition-all"
                style={{
                  width: s === step ? '20px' : '8px',
                  height: '8px',
                  background: s <= step ? '#6c5ce7' : 'rgba(108,92,231,0.25)',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* STEP 0 - Mode */}
        {step === 0 && (
          <div className="px-4 py-6 space-y-4">
            <div className="text-center mb-6">
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>📤</div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#e8e8ed' }}>
                Comment publier?
              </h3>
            </div>

            {/* New Work */}
            <button
              onClick={selectNewWork}
              className="w-full flex items-center gap-4 p-4 rounded-xl border transition-all hover:border-[#6c5ce7]"
              style={{
                background: '#1a1a25',
                borderColor: 'rgba(255,255,255,0.06)',
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #6c5ce7 0%, #a78bfa 100%)',
                }}
              >
                <span style={{ fontSize: '24px' }}>✨</span>
              </div>
              <div className="flex-1 text-left">
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#e8e8ed' }}>
                  Nouvelle œuvre
                </h4>
                <p style={{ fontSize: '11px', color: '#8888a0', marginTop: '2px' }}>
                  Créer + premier chapitre
                </p>
              </div>
            </button>

            {/* Existing Works */}
            <div>
              <p
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#8888a0',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                }}
              >
                Œuvre existante:
              </p>
              <div className="space-y-2">
                {existingWorks.map((work) => (
                  <button
                    key={work.id}
                    onClick={() => selectExistingWork(work)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all hover:border-[#6c5ce7]"
                    style={{
                      background: '#1a1a25',
                      borderColor: 'rgba(255,255,255,0.06)',
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        background: '#111119',
                      }}
                    >
                      <span style={{ fontSize: '20px' }}>{work.icon}</span>
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#e8e8ed' }}>
                        {work.title}
                      </h4>
                      <p style={{ fontSize: '10px', color: '#8888a0' }}>
                        {work.chaptersCount} ch. · {work.status}
                      </p>
                    </div>
                    <ArrowLeft
                      size={14}
                      style={{ color: '#8888a0', transform: 'rotate(180deg)' }}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 1 - Informations */}
        {step === 1 && (
          <div className="px-4 py-6 space-y-4">
            {/* Title */}
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
                Titre de l'œuvre *
              </label>
              <input
                type="text"
                value={workTitle}
                onChange={(e) => {
                  setWorkTitle(e.target.value);
                  checkMatching(e.target.value);
                }}
                placeholder="Ex: Solo Leveling"
                className="w-full px-3 py-2 rounded-xl border outline-none focus:border-[#6c5ce7] transition-colors"
                style={{
                  background: '#1a1a25',
                  borderColor: 'rgba(255,255,255,0.06)',
                  fontSize: '13px',
                  color: '#e8e8ed',
                }}
              />
              
              {/* Matching Work Banner */}
              {matchingWork && (
                <div
                  className="mt-2 p-3 rounded-lg border flex items-start gap-2"
                  style={{
                    background: 'rgba(59,130,246,0.08)',
                    borderColor: 'rgba(59,130,246,0.2)',
                  }}
                >
                  <span style={{ fontSize: '16px' }}>ℹ️</span>
                  <div className="flex-1">
                    <p style={{ fontSize: '11px', fontWeight: 600, color: '#60a5fa' }}>
                      {matchingWork.icon} Œuvre existante!
                    </p>
                    <p style={{ fontSize: '11px', color: '#8888a0', marginTop: '2px' }}>
                      Voulez-vous ajouter un chapitre à "{matchingWork.title}"?
                    </p>
                    <button
                      onClick={() => selectExistingWork(matchingWork)}
                      className="mt-2 px-3 py-1 rounded-lg"
                      style={{
                        background: '#60a5fa',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#ffffff',
                      }}
                    >
                      Oui, ajouter un chapitre
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Chapter Number */}
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
                Numéro de chapitre *
              </label>
              <input
                type="number"
                value={chapterNumber}
                onChange={(e) => {
                  setChapterNumber(parseInt(e.target.value) || 1);
                  checkDuplicate();
                }}
                min={1}
                className="w-full px-3 py-2 rounded-xl border outline-none focus:border-[#6c5ce7] transition-colors"
                style={{
                  background: '#1a1a25',
                  borderColor: duplicateChapter ? '#ef4444' : 'rgba(255,255,255,0.06)',
                  fontSize: '13px',
                  color: '#e8e8ed',
                }}
              />
              
              {duplicateChapter && (
                <p
                  style={{
                    fontSize: '11px',
                    color: '#ef4444',
                    marginTop: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  ⚠️ Ce chapitre existe déjà!
                </p>
              )}
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
                placeholder="Synopsis..."
                rows={4}
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

            {/* Tags */}
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
                Tags
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Ex: action, fantasy..."
                  className="flex-1 px-3 py-2 rounded-lg border outline-none focus:border-[#6c5ce7] transition-colors"
                  style={{
                    background: '#1a1a25',
                    borderColor: 'rgba(255,255,255,0.06)',
                    fontSize: '12px',
                    color: '#e8e8ed',
                  }}
                />
                <button
                  onClick={addTag}
                  disabled={!tagInput.trim() || tags.length >= 8}
                  className="px-4 py-2 rounded-lg transition-colors"
                  style={{
                    background: tagInput.trim() && tags.length < 8 ? '#6c5ce7' : '#555570',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#ffffff',
                    opacity: tagInput.trim() && tags.length < 8 ? 1 : 0.5,
                  }}
                >
                  <Plus size={16} />
                </button>
              </div>
              
              {/* Tag Pills */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <div
                      key={tag}
                      className="flex items-center gap-1 px-3 py-1 rounded-full"
                      style={{
                        background: 'rgba(108,92,231,0.12)',
                        border: '1px solid rgba(108,92,231,0.3)',
                      }}
                    >
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#e8e8ed' }}>
                        {tag}
                      </span>
                      <button
                        onClick={() => removeTag(tag)}
                        className="hover:opacity-70 transition-opacity"
                      >
                        <X size={12} style={{ color: '#8888a0' }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cover */}
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
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverFile}
                style={{ display: 'none' }}
              />
              <button
                onClick={() => coverInputRef.current?.click()}
                className="border-2 border-dashed rounded-xl transition-colors hover:border-[#6c5ce7] overflow-hidden"
                style={{
                  width: '120px',
                  height: '160px',
                  borderColor: 'rgba(255,255,255,0.1)',
                  background: coverPreview
                    ? `url(${coverPreview}) center/cover`
                    : existingCoverUrl
                    ? `url(${existingCoverUrl}) center/cover`
                    : '#1a1a25',
                }}
              >
                {!coverPreview && !existingCoverUrl && (
                  <div className="flex flex-col items-center justify-center h-full">
                    <ImageIcon size={24} style={{ color: '#8888a0', marginBottom: '8px' }} />
                    <span style={{ fontSize: '11px', color: '#8888a0' }}>Ajouter</span>
                  </div>
                )}
              </button>
            </div>

            {/* Next Button */}
            <button
              onClick={goNext}
              disabled={!workTitle.trim() || !chapterNumber || duplicateChapter}
              className="w-full py-3 rounded-xl transition-all"
              style={{
                background: workTitle.trim() && chapterNumber && !duplicateChapter ? '#6c5ce7' : '#555570',
                fontSize: '14px',
                fontWeight: 700,
                color: '#ffffff',
                opacity: workTitle.trim() && chapterNumber && !duplicateChapter ? 1 : 0.5,
              }}
            >
              Suivant →
            </button>
          </div>
        )}

        {/* STEP 2 - Content */}
        {step === 2 && (
          <div className="px-4 py-6 space-y-4">
            {/* Locked Metadata Summary */}
            {metadataLocked && selectedWork && (
              <div
                className="p-3 rounded-xl border flex items-center justify-between mb-4"
                style={{
                  background: '#1a1a25',
                  borderColor: 'rgba(255,255,255,0.06)',
                }}
              >
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: '24px' }}>{selectedWork.icon}</span>
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>
                      {workTitle}
                    </h4>
                    <p style={{ fontSize: '11px', color: '#8888a0' }}>
                      Chapitre {chapterNumber}
                    </p>
                  </div>
                </div>
                <button
                  onClick={unlockMetadata}
                  className="p-2 rounded-lg hover:bg-[#1f1f2e] transition-colors"
                >
                  <Edit2 size={16} style={{ color: '#8888a0' }} />
                </button>
              </div>
            )}

            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#e8e8ed' }}>
              📦 Contenu du chapitre
            </h3>

            {/* Content Type Selection */}
            {!contentType && (
              <div className="grid grid-cols-2 gap-2">
                {/* Text */}
                <button
                  onClick={() => setContentType('text')}
                  className="p-4 rounded-xl border-2 transition-all"
                  style={{
                    background: '#1a1a25',
                    borderColor: 'rgba(255,255,255,0.06)',
                  }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>📝</div>
                  <h5 style={{ fontSize: '12px', fontWeight: 700, color: '#e8e8ed' }}>Texte</h5>
                  <p style={{ fontSize: '10px', color: '#8888a0', marginTop: '2px' }}>
                    Écrire
                  </p>
                </button>

                {/* Images */}
                <button
                  onClick={() => setContentType('images')}
                  className="p-4 rounded-xl border-2 transition-all"
                  style={{
                    background: '#1a1a25',
                    borderColor: 'rgba(255,255,255,0.06)',
                  }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>🖼️</div>
                  <h5 style={{ fontSize: '12px', fontWeight: 700, color: '#e8e8ed' }}>Images</h5>
                  <p style={{ fontSize: '10px', color: '#8888a0', marginTop: '2px' }}>
                    Scans
                  </p>
                </button>

                {/* File */}
                <button
                  onClick={() => setContentType('file')}
                  className="p-4 rounded-xl border-2 transition-all"
                  style={{
                    background: '#1a1a25',
                    borderColor: 'rgba(255,255,255,0.06)',
                  }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>📄</div>
                  <h5 style={{ fontSize: '12px', fontWeight: 700, color: '#e8e8ed' }}>Fichier</h5>
                  <p style={{ fontSize: '10px', color: '#8888a0', marginTop: '2px' }}>
                    PDF/CBZ
                  </p>
                </button>

                {/* Batch */}
                <button
                  onClick={() => setContentType('batch')}
                  className="p-4 rounded-xl border-2 transition-all"
                  style={{
                    background: '#1a1a25',
                    borderColor: 'rgba(255,255,255,0.06)',
                  }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>📦</div>
                  <h5 style={{ fontSize: '12px', fontWeight: 700, color: '#e8e8ed' }}>Batch</h5>
                  <p style={{ fontSize: '10px', color: '#8888a0', marginTop: '2px' }}>
                    Multi
                  </p>
                </button>
              </div>
            )}

            {/* Text Content */}
            {contentType === 'text' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#8888a0' }}>
                    📝 Contenu texte
                  </label>
                  <button
                    onClick={() => setContentType(null)}
                    className="text-xs"
                    style={{ color: '#ef4444' }}
                  >
                    Changer
                  </button>
                </div>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Contenu du chapitre..."
                  rows={12}
                  className="w-full px-3 py-2 rounded-xl border outline-none focus:border-[#6c5ce7] transition-colors resize-vertical"
                  style={{
                    background: '#1a1a25',
                    borderColor: 'rgba(255,255,255,0.06)',
                    fontSize: '13px',
                    color: '#e8e8ed',
                    lineHeight: 1.6,
                    minHeight: '200px',
                  }}
                />
              </div>
            )}

            {/* Images Content */}
            {contentType === 'images' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#8888a0' }}>
                    🖼️ Images (scans)
                  </label>
                  <button
                    onClick={() => setContentType(null)}
                    className="text-xs"
                    style={{ color: '#ef4444' }}
                  >
                    Changer
                  </button>
                </div>
                
                <input
                  ref={imageFilesInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageFiles}
                  style={{ display: 'none' }}
                />
                
                {imageFiles.length === 0 ? (
                  <button
                    onClick={() => imageFilesInputRef.current?.click()}
                    className="w-full p-8 border-2 border-dashed rounded-xl transition-colors hover:border-[#6c5ce7]"
                    style={{
                      background: '#1a1a25',
                      borderColor: 'rgba(255,255,255,0.1)',
                    }}
                  >
                    <Upload size={32} style={{ color: '#8888a0', margin: '0 auto 12px' }} />
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#e8e8ed' }}>
                      Sélectionner des images
                    </p>
                    <p style={{ fontSize: '11px', color: '#8888a0', marginTop: '4px' }}>
                      JPG, PNG, WebP
                    </p>
                  </button>
                ) : (
                  <div>
                    <div className="space-y-2 mb-3">
                      {imageFiles.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 p-2 rounded-lg"
                          style={{
                            background: '#1a1a25',
                            border: '1px solid rgba(255,255,255,0.06)',
                          }}
                        >
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#8888a0' }}>
                            P{idx + 1}
                          </span>
                          <span
                            className="flex-1 truncate"
                            style={{ fontSize: '11px', color: '#e8e8ed' }}
                          >
                            {file.name}
                          </span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => imageFilesInputRef.current?.click()}
                      className="w-full py-2 rounded-lg border transition-colors hover:border-[#6c5ce7]"
                      style={{
                        background: '#1a1a25',
                        borderColor: 'rgba(255,255,255,0.06)',
                        fontSize: '12px',
                        color: '#8888a0',
                      }}
                    >
                      Modifier les images
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* File Content */}
            {contentType === 'file' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#8888a0' }}>
                    📄 Fichier PDF/CBZ
                  </label>
                  <button
                    onClick={() => setContentType(null)}
                    className="text-xs"
                    style={{ color: '#ef4444' }}
                  >
                    Changer
                  </button>
                </div>
                
                <input
                  ref={chapterFileInputRef}
                  type="file"
                  accept=".pdf,.cbz"
                  onChange={handleChapterFile}
                  style={{ display: 'none' }}
                />
                
                {!chapterFile ? (
                  <button
                    onClick={() => chapterFileInputRef.current?.click()}
                    className="w-full p-8 border-2 border-dashed rounded-xl transition-colors hover:border-[#6c5ce7]"
                    style={{
                      background: '#1a1a25',
                      borderColor: 'rgba(255,255,255,0.1)',
                    }}
                  >
                    <FileText size={32} style={{ color: '#8888a0', margin: '0 auto 12px' }} />
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#e8e8ed' }}>
                      Sélectionner un fichier
                    </p>
                    <p style={{ fontSize: '11px', color: '#8888a0', marginTop: '4px' }}>
                      PDF ou CBZ
                    </p>
                  </button>
                ) : (
                  <div
                    className="p-4 rounded-xl border"
                    style={{
                      background: '#1a1a25',
                      borderColor: 'rgba(255,255,255,0.06)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Check size={20} style={{ color: '#22c55e' }} />
                      <span
                        className="flex-1 truncate"
                        style={{ fontSize: '12px', color: '#e8e8ed' }}
                      >
                        {chapterFile.name}
                      </span>
                    </div>
                    <button
                      onClick={() => chapterFileInputRef.current?.click()}
                      className="mt-3 w-full py-2 rounded-lg border transition-colors hover:border-[#6c5ce7]"
                      style={{
                        background: 'transparent',
                        borderColor: 'rgba(255,255,255,0.06)',
                        fontSize: '12px',
                        color: '#8888a0',
                      }}
                    >
                      Modifier le fichier
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Batch Content */}
            {contentType === 'batch' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#8888a0' }}>
                    📦 Batch (max 20 fichiers)
                  </label>
                  <button
                    onClick={() => setContentType(null)}
                    className="text-xs"
                    style={{ color: '#ef4444' }}
                  >
                    Changer
                  </button>
                </div>
                
                <input
                  ref={batchFilesInputRef}
                  type="file"
                  accept=".pdf,.cbz"
                  multiple
                  onChange={handleBatchFiles}
                  style={{ display: 'none' }}
                />
                
                {batchFiles.length === 0 ? (
                  <button
                    onClick={() => batchFilesInputRef.current?.click()}
                    className="w-full p-8 border-2 border-dashed rounded-xl transition-colors hover:border-[#6c5ce7]"
                    style={{
                      background: '#1a1a25',
                      borderColor: 'rgba(255,255,255,0.1)',
                    }}
                  >
                    <Package size={32} style={{ color: '#8888a0', margin: '0 auto 12px' }} />
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#e8e8ed' }}>
                      Sélectionner des fichiers
                    </p>
                    <p style={{ fontSize: '11px', color: '#8888a0', marginTop: '4px' }}>
                      PDF ou CBZ (max 20)
                    </p>
                  </button>
                ) : (
                  <div>
                    <div className="space-y-2 mb-3">
                      {batchFiles.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 p-2 rounded-lg"
                          style={{
                            background: '#1a1a25',
                            border: '1px solid rgba(255,255,255,0.06)',
                          }}
                        >
                          <span
                            className="px-2 py-0.5 rounded"
                            style={{
                              background: 'rgba(108,92,231,0.12)',
                              fontSize: '10px',
                              fontWeight: 700,
                              color: '#e8e8ed',
                            }}
                          >
                            Ch.{chapterNumber + idx}
                          </span>
                          <span
                            className="flex-1 truncate"
                            style={{ fontSize: '11px', color: '#e8e8ed' }}
                          >
                            {file.name}
                          </span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => batchFilesInputRef.current?.click()}
                      className="w-full py-2 rounded-lg border transition-colors hover:border-[#6c5ce7]"
                      style={{
                        background: '#1a1a25',
                        borderColor: 'rgba(255,255,255,0.06)',
                        fontSize: '12px',
                        color: '#8888a0',
                      }}
                    >
                      Modifier les fichiers
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Next Button */}
            {contentType && (
              <button
                onClick={goNext}
                className="w-full py-3 rounded-xl transition-all"
                style={{
                  background: '#6c5ce7',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#ffffff',
                }}
              >
                Suivant →
              </button>
            )}
          </div>
        )}

        {/* STEP 3 - Validation */}
        {step === 3 && (
          <div className="px-4 py-6 space-y-4">
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#e8e8ed' }}>
              ✅ Validation
            </h3>

            {/* Summary */}
            <div
              className="p-4 rounded-xl border"
              style={{
                background: '#1a1a25',
                borderColor: 'rgba(255,255,255,0.06)',
              }}
            >
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed', marginBottom: '8px' }}>
                📖 {workTitle}
              </h4>
              <p style={{ fontSize: '12px', color: '#8888a0', marginBottom: '8px' }}>
                Chapitre {chapterNumber}
              </p>
              <p style={{ fontSize: '12px', color: '#8888a0', marginBottom: '8px' }}>
                Type: {contentType === 'text' && '📝 Texte'}
                {contentType === 'images' && `🖼️ ${imageFiles.length} images`}
                {contentType === 'file' && '📄 Fichier'}
                {contentType === 'batch' && `📦 ${batchFiles.length} fichiers`}
              </p>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded"
                      style={{
                        background: 'rgba(108,92,231,0.12)',
                        fontSize: '10px',
                        fontWeight: 600,
                        color: '#e8e8ed',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Errors */}
            {errors.length > 0 && (
              <div
                className="p-4 rounded-xl border"
                style={{
                  background: 'rgba(239,68,68,0.06)',
                  borderColor: 'rgba(239,68,68,0.2)',
                }}
              >
                {errors.map((error, idx) => (
                  <p
                    key={idx}
                    style={{
                      fontSize: '11px',
                      color: '#ef4444',
                      marginBottom: idx < errors.length - 1 ? '4px' : 0,
                    }}
                  >
                    ❌ {error}
                  </p>
                ))}
              </div>
            )}

            {/* Validate Button */}
            <button
              onClick={goNext}
              disabled={errors.length > 0}
              className="w-full py-3 rounded-xl transition-all"
              style={{
                background: errors.length === 0 ? '#22c55e' : '#555570',
                fontSize: '14px',
                fontWeight: 700,
                color: '#ffffff',
                opacity: errors.length === 0 ? 1 : 0.5,
              }}
            >
              ✅ Valider
            </button>
          </div>
        )}

        {/* STEP 4 - Publication */}
        {step === 4 && (
          <div className="px-4 py-12 text-center">
            {!publishing && !publishDone && (
              <>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>🚀</div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#e8e8ed', marginBottom: '8px' }}>
                  Prêt à publier!
                </h3>
                <p style={{ fontSize: '12px', color: '#8888a0', marginBottom: '24px' }}>
                  {workTitle} - Chapitre {chapterNumber}
                </p>
                <button
                  onClick={handlePublish}
                  className="px-8 py-4 rounded-xl transition-all hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, #6c5ce7 0%, #a78bfa 100%)',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#ffffff',
                    boxShadow: '0 4px 20px rgba(108,92,231,0.4)',
                  }}
                >
                  📤 PUBLIER
                </button>
              </>
            )}

            {publishing && (
              <>
                <div
                  className="inline-block"
                  style={{
                    fontSize: '40px',
                    marginBottom: '16px',
                    animation: 'pulse 1s infinite',
                  }}
                >
                  ⏳
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#e8e8ed', marginBottom: '8px' }}>
                  Publication en cours...
                </h3>
                
                {contentType === 'batch' && batchFiles.length > 0 && (
                  <>
                    <p style={{ fontSize: '12px', color: '#8888a0', marginBottom: '16px' }}>
                      {publishProgress} / {batchFiles.length} chapitres
                    </p>
                    <div
                      className="w-full rounded-full overflow-hidden"
                      style={{
                        height: '6px',
                        background: '#1a1a25',
                        maxWidth: '300px',
                        margin: '0 auto',
                      }}
                    >
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${(publishProgress / batchFiles.length) * 100}%`,
                          background: '#6c5ce7',
                        }}
                      />
                    </div>
                  </>
                )}
              </>
            )}

            {publishDone && (
              <>
                <div
                  style={{
                    fontSize: '52px',
                    marginBottom: '16px',
                    animation: 'bounceIn 0.5s',
                  }}
                >
                  ✅
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#22c55e' }}>
                  Publié avec succès!
                </h3>
              </>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes bounceIn {
          0% { transform: scale(0); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
