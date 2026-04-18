import React, { useState, useRef } from 'react';
import { X, Plus, Clock, Users, Image, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Quiz, QuizCategory } from './types';
import { QUIZ_CATEGORIES, TIMER_OPTIONS } from './types';

interface CreateQuizSheetProps {
  onClose: () => void;
  onCreate: (quiz: Quiz) => void;
}

interface QuizQuestionDraft {
  id: string;
  question: string;
  imageUrl?: string;
  answers: {
    id: string;
    text: string;
    isCorrect: boolean;
  }[];
}

const DURATION_OPTIONS = [
  { value: 1, label: '1 heure' },
  { value: 3, label: '3 heures' },
  { value: 6, label: '6 heures' },
  { value: 12, label: '12 heures' },
  { value: 24, label: '24 heures' },
  { value: 72, label: '3 jours' },
  { value: 168, label: '1 semaine' },
];

async function uploadImageToStorage(dataUrl: string, path: string): Promise<string | null> {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const { error } = await supabase.storage.from('chapters').upload(path, blob, {
      contentType: blob.type,
      upsert: true,
    });
    if (error) return null;
    const { data: urlData } = supabase.storage.from('chapters').getPublicUrl(path);
    return urlData.publicUrl;
  } catch {
    return null;
  }
}

export function CreateQuizSheet({ onClose, onCreate }: CreateQuizSheetProps) {
  const { user, profile } = useAuth();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<QuizCategory>('Anime');
  const [coverImage, setCoverImage] = useState<string | undefined>();
  const [timerSeconds, setTimerSeconds] = useState(15);
  const [duration, setDuration] = useState(24);
  const [maxPlayers, setMaxPlayers] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestionDraft[]>([
    {
      id: '1',
      question: '',
      answers: [
        { id: 'a', text: '', isCorrect: false },
        { id: 'b', text: '', isCorrect: false },
        { id: 'c', text: '', isCorrect: false },
        { id: 'd', text: '', isCorrect: false },
      ],
    },
  ]);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const questionImageRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setCoverImage(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleQuestionImageSelect = (qIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const newQuestions = [...questions];
        newQuestions[qIndex] = { ...newQuestions[qIndex], imageUrl: reader.result };
        setQuestions(newQuestions);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: String(questions.length + 1),
        question: '',
        answers: [
          { id: 'a', text: '', isCorrect: false },
          { id: 'b', text: '', isCorrect: false },
          { id: 'c', text: '', isCorrect: false },
          { id: 'd', text: '', isCorrect: false },
        ],
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const updateQuestion = (index: number, field: string, value: string) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setQuestions(newQuestions);
  };

  const updateAnswer = (qIndex: number, aIndex: number, text: string) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].answers[aIndex].text = text;
    setQuestions(newQuestions);
  };

  const toggleCorrectAnswer = (qIndex: number, aIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].answers.forEach((a, i) => {
      a.isCorrect = i === aIndex;
    });
    setQuestions(newQuestions);
  };

  const canPublish = title.trim() && questions.every(q =>
    q.question.trim() &&
    q.answers.some(a => a.isCorrect) &&
    q.answers.filter(a => a.text.trim()).length >= 2
  ) && !publishing;

  const handlePublish = async () => {
    if (!canPublish || !user) return;
    setPublishing(true);

    try {
      const categoryObj = QUIZ_CATEGORIES.find(c => c.value === category);
      const quizId = crypto.randomUUID();

      // Upload cover image if exists
      let coverUrl: string | undefined;
      if (coverImage?.startsWith('data:')) {
        coverUrl = await uploadImageToStorage(coverImage, `quiz/${quizId}/cover.webp`) || undefined;
      }

      // Insert quiz
      const { error: quizError } = await supabase.from('quizzes').insert({
        id: quizId,
        author_id: user.id,
        title: title.trim(),
        category,
        category_emoji: categoryObj?.emoji || '🎯',
        cover_image: coverUrl,
        timer_seconds: timerSeconds,
        duration_hours: duration,
        max_players: maxPlayers ? parseInt(maxPlayers) : null,
        status: 'active',
      });

      if (quizError) throw quizError;

      // Upload question images and insert questions
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        let qImageUrl: string | null = null;
        if (q.imageUrl?.startsWith('data:')) {
          qImageUrl = await uploadImageToStorage(q.imageUrl, `quiz/${quizId}/q${i}.webp`);
        }

        const { error: qError } = await supabase.from('quiz_questions').insert({
          quiz_id: quizId,
          question: q.question.trim(),
          image_url: qImageUrl,
          answers: q.answers.filter(a => a.text.trim()),
          sort_order: i,
        });

        if (qError) throw qError;
      }

      // Build local Quiz object for optimistic UI
      const quiz: Quiz = {
        id: quizId,
        title: title.trim(),
        author: profile?.username || 'vous',
        authorId: user.id,
        questionsCount: questions.length,
        category,
        categoryEmoji: categoryObj?.emoji || '🎯',
        playersCount: 0,
        maxPlayers: maxPlayers ? parseInt(maxPlayers) : undefined,
        rating: 0,
        coverImage: coverUrl,
        timerSeconds,
        duration,
        createdAt: new Date(),
        status: 'active',
        questions: questions.map((q, i) => ({
          id: `q${i}`,
          question: q.question,
          imageUrl: q.imageUrl,
          answers: q.answers.filter(a => a.text.trim()),
        })),
      };
      onCreate(quiz);
    } catch (err) {
      console.error('Failed to create quiz:', err);
      alert('Erreur lors de la création du quiz');
    } finally {
      setPublishing(false);
    }
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
          <div className="w-10 h-1 rounded-full" style={{ background: '#555570' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#e8e8ed' }}>
            Créer un Quiz
          </h3>
          <div className="flex items-center gap-2">
            <div
              onClick={canPublish ? handlePublish : undefined}
              className="px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-2"
              style={{
                background: canPublish ? '#6c5ce7' : '#1f1f2e',
                fontSize: '13px',
                fontWeight: 700,
                color: canPublish ? '#ffffff' : '#555570',
                opacity: canPublish ? 1 : 0.5,
              }}
            >
              {publishing && <Loader2 size={14} className="animate-spin" />}
              {publishing ? 'Publication...' : 'Publier'}
            </div>
            <div
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[#1f1f2e] transition-colors cursor-pointer"
            >
              <X size={20} style={{ color: '#e8e8ed' }} />
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#8888a0', marginBottom: '8px', display: 'block' }}>
              Titre du quiz
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Connais-tu les Kage?"
              className="w-full px-3 py-2 rounded-xl border outline-none focus:border-[#6c5ce7] transition-colors"
              style={{
                background: '#1a1a25',
                borderColor: 'rgba(255,255,255,0.06)',
                fontSize: '13px',
                color: '#e8e8ed',
              }}
            />
          </div>

          {/* Category */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#8888a0', marginBottom: '8px', display: 'block' }}>
              Catégorie
            </label>
            <div className="flex flex-wrap gap-2">
              {QUIZ_CATEGORIES.map((cat) => (
                <div
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className="px-3 py-1.5 rounded-full cursor-pointer transition-colors"
                  style={{
                    background: category === cat.value ? 'rgba(108,92,231,0.15)' : '#1a1a25',
                    border: `1px solid ${category === cat.value ? '#6c5ce7' : 'rgba(255,255,255,0.06)'}`,
                    fontSize: '12px',
                    fontWeight: 600,
                    color: category === cat.value ? '#6c5ce7' : '#8888a0',
                  }}
                >
                  {cat.emoji} {cat.value}
                </div>
              ))}
            </div>
          </div>

          {/* Cover Image */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#8888a0', marginBottom: '8px', display: 'block' }}>
              Image de couverture (optionnel)
            </label>
            <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverSelect} className="hidden" />
            {coverImage ? (
              <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '16/9', maxHeight: '160px' }}>
                <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                <div
                  onClick={() => setCoverImage(undefined)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg cursor-pointer"
                  style={{ background: 'rgba(0,0,0,0.7)' }}
                >
                  <X size={14} style={{ color: '#fff' }} />
                </div>
              </div>
            ) : (
              <div
                onClick={() => coverInputRef.current?.click()}
                className="flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed cursor-pointer hover:bg-[#1a1a25] transition-colors"
                style={{ borderColor: 'rgba(255,255,255,0.08)' }}
              >
                <Image size={16} style={{ color: '#555570' }} />
                <span style={{ fontSize: '12px', color: '#555570' }}>Ajouter une cover (16:9)</span>
              </div>
            )}
          </div>

          {/* Timer & Duration */}
          <div
            className="p-4 rounded-2xl border"
            style={{ background: '#0c0c14', borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Clock size={16} style={{ color: '#ffd200' }} />
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>
                Timer par question
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {TIMER_OPTIONS.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => setTimerSeconds(opt.value)}
                  className="px-4 py-2 rounded-lg cursor-pointer transition-colors"
                  style={{
                    background: timerSeconds === opt.value ? 'rgba(255,210,0,0.12)' : '#1a1a25',
                    border: `1px solid ${timerSeconds === opt.value ? '#ffd200' : 'rgba(255,255,255,0.06)'}`,
                    fontSize: '13px',
                    fontWeight: 600,
                    color: timerSeconds === opt.value ? '#ffd200' : '#8888a0',
                  }}
                >
                  {opt.label}
                </div>
              ))}
            </div>

            {/* Duration */}
            <div className="mb-3">
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#8888a0', marginBottom: '6px', display: 'block' }}>
                Le quiz se termine automatiquement après :
              </label>
              <div className="flex flex-wrap gap-2">
                {DURATION_OPTIONS.map((opt) => (
                  <div
                    key={opt.value}
                    onClick={() => setDuration(opt.value)}
                    className="px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                    style={{
                      background: duration === opt.value ? 'rgba(108,92,231,0.12)' : '#1a1a25',
                      border: `1px solid ${duration === opt.value ? '#6c5ce7' : 'rgba(255,255,255,0.06)'}`,
                      fontSize: '11px',
                      fontWeight: 600,
                      color: duration === opt.value ? '#6c5ce7' : '#8888a0',
                    }}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Max players */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#8888a0', marginBottom: '6px', display: 'block' }}>
                Max de participants (optionnel) :
              </label>
              <div className="flex items-center gap-2">
                <Users size={14} style={{ color: '#8888a0' }} />
                <input
                  type="number"
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(e.target.value)}
                  placeholder="Illimité"
                  min="2"
                  className="flex-1 px-3 py-2 rounded-xl border outline-none focus:border-[#6c5ce7] transition-colors"
                  style={{
                    background: '#1a1a25',
                    borderColor: 'rgba(255,255,255,0.06)',
                    fontSize: '12px',
                    color: '#e8e8ed',
                  }}
                />
              </div>
            </div>

            {/* Info */}
            <div className="mt-3 p-2 rounded-lg" style={{ background: 'rgba(79,172,254,0.08)' }}>
              <p style={{ fontSize: '11px', color: '#4facfe', lineHeight: '1.4' }}>
                Le quiz se termine automatiquement quand le temps est écoulé, même sans participants. Vous pouvez aussi le terminer manuellement à tout moment.
              </p>
            </div>
          </div>

          {/* Questions */}
          {questions.map((question, qIndex) => (
            <div
              key={question.id}
              className="p-4 rounded-2xl border"
              style={{ background: '#0c0c14', borderColor: 'rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>
                  Question {qIndex + 1}
                </h4>
                {questions.length > 1 && (
                  <div
                    onClick={() => removeQuestion(qIndex)}
                    className="p-1.5 rounded-lg cursor-pointer hover:bg-[#1f1f2e] transition-colors"
                  >
                    <X size={14} style={{ color: '#ef4444' }} />
                  </div>
                )}
              </div>

              <input
                type="text"
                value={question.question}
                onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                placeholder="Ex: Qui est le 4ème Hokage?"
                className="w-full px-3 py-2 rounded-xl border outline-none focus:border-[#6c5ce7] transition-colors mb-2"
                style={{
                  background: '#1a1a25',
                  borderColor: 'rgba(255,255,255,0.06)',
                  fontSize: '13px',
                  color: '#e8e8ed',
                }}
              />

              {/* Question Image */}
              <input
                ref={(el) => { questionImageRefs.current[question.id] = el; }}
                type="file"
                accept="image/*"
                onChange={(e) => handleQuestionImageSelect(qIndex, e)}
                className="hidden"
              />
              {question.imageUrl ? (
                <div className="relative rounded-xl overflow-hidden mb-3" style={{ maxHeight: '140px' }}>
                  <img src={question.imageUrl} alt="" className="w-full object-cover rounded-xl" style={{ maxHeight: '140px' }} />
                  <div
                    onClick={() => {
                      const nq = [...questions];
                      nq[qIndex] = { ...nq[qIndex], imageUrl: undefined };
                      setQuestions(nq);
                    }}
                    className="absolute top-2 right-2 p-1 rounded-lg cursor-pointer"
                    style={{ background: 'rgba(0,0,0,0.7)' }}
                  >
                    <Trash2 size={12} style={{ color: '#ef4444' }} />
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => questionImageRefs.current[question.id]?.click()}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-[#1a1a25] transition-colors mb-3"
                  style={{ border: '1px dashed rgba(255,255,255,0.08)' }}
                >
                  <Image size={14} style={{ color: '#555570' }} />
                  <span style={{ fontSize: '11px', color: '#555570' }}>Ajouter image/GIF (optionnel)</span>
                </div>
              )}

              <p style={{ fontSize: '11px', color: '#8888a0', marginBottom: '6px' }}>
                Cliquez ✓ pour marquer la bonne réponse
              </p>

              {question.answers.map((answer, aIndex) => (
                <div key={answer.id} className="flex items-center gap-2 mb-2">
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#8888a0', width: '20px' }}>
                    {answer.id.toUpperCase()}.
                  </span>
                  <input
                    type="text"
                    value={answer.text}
                    onChange={(e) => updateAnswer(qIndex, aIndex, e.target.value)}
                    placeholder="Réponse..."
                    className="flex-1 px-3 py-2 rounded-xl border outline-none focus:border-[#6c5ce7] transition-colors"
                    style={{
                      background: '#1a1a25',
                      borderColor: 'rgba(255,255,255,0.06)',
                      fontSize: '12px',
                      color: '#e8e8ed',
                    }}
                  />
                  <div
                    onClick={() => toggleCorrectAnswer(qIndex, aIndex)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                    style={{
                      background: answer.isCorrect ? '#22c55e' : '#1a1a25',
                      border: `1px solid ${answer.isCorrect ? '#22c55e' : 'rgba(255,255,255,0.06)'}`,
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 700, color: answer.isCorrect ? '#ffffff' : '#555570' }}>
                      ✓
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* Add Question */}
          <div
            onClick={addQuestion}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed transition-colors hover:bg-[#1f1f2e] cursor-pointer"
            style={{ borderColor: 'rgba(255,255,255,0.08)', fontSize: '13px', fontWeight: 600, color: '#8888a0' }}
          >
            <Plus size={16} />
            Ajouter une question
          </div>

          {/* Summary */}
          <div className="p-3 rounded-xl flex items-center justify-between" style={{ background: 'rgba(108,92,231,0.08)' }}>
            <span style={{ fontSize: '12px', color: '#8888a0' }}>
              {questions.length} question{questions.length > 1 ? 's' : ''} · Timer: {timerSeconds}s · Durée: {DURATION_OPTIONS.find(o => o.value === duration)?.label}
              {maxPlayers ? ` · Max ${maxPlayers} joueurs` : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
