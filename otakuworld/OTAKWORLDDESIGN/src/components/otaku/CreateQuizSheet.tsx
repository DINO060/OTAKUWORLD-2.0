import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

interface CreateQuizSheetProps {
  onClose: () => void;
}

interface QuizQuestionDraft {
  id: string;
  question: string;
  answers: {
    id: string;
    text: string;
    isCorrect: boolean;
  }[];
}

export function CreateQuizSheet({ onClose }: CreateQuizSheetProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Naruto');
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
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#e8e8ed' }}>
            Créer un Quiz
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
              Publier
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
          {/* Title */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#8888a0', marginBottom: '8px', display: 'block' }}>
              Titre:
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
              Catégorie:
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border outline-none focus:border-[#6c5ce7] transition-colors"
              style={{
                background: '#1a1a25',
                borderColor: 'rgba(255,255,255,0.06)',
                fontSize: '13px',
                color: '#e8e8ed',
              }}
            >
              <option>Naruto</option>
              <option>One Piece</option>
              <option>JJK</option>
              <option>Attack on Titan</option>
              <option>Demon Slayer</option>
            </select>
          </div>

          {/* Questions */}
          {questions.map((question, qIndex) => (
            <div
              key={question.id}
              className="p-4 rounded-2xl border"
              style={{
                background: '#0c0c14',
                borderColor: 'rgba(255,255,255,0.06)',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>
                  Question {qIndex + 1}
                </h4>
              </div>

              <input
                type="text"
                value={question.question}
                onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                placeholder="Ex: Qui est le 4ème Hokage?"
                className="w-full px-3 py-2 rounded-xl border outline-none focus:border-[#6c5ce7] transition-colors mb-3"
                style={{
                  background: '#1a1a25',
                  borderColor: 'rgba(255,255,255,0.06)',
                  fontSize: '13px',
                  color: '#e8e8ed',
                }}
              />

              {question.answers.map((answer, aIndex) => (
                <div key={answer.id} className="flex items-center gap-2 mb-2">
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#8888a0', width: '20px' }}>
                    {answer.id.toUpperCase()}:
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
                  <button
                    onClick={() => toggleCorrectAnswer(qIndex, aIndex)}
                    className="px-2 py-1 rounded-lg transition-colors"
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      background: answer.isCorrect ? '#22c55e' : '#1a1a25',
                      color: answer.isCorrect ? '#ffffff' : '#8888a0',
                    }}
                  >
                    {answer.isCorrect ? '✓' : ' '}
                  </button>
                </div>
              ))}
            </div>
          ))}

          {/* Add Question */}
          <button
            onClick={addQuestion}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-colors hover:bg-[#1f1f2e]"
            style={{
              borderColor: 'rgba(255,255,255,0.06)',
              fontSize: '13px',
              fontWeight: 600,
              color: '#8888a0',
            }}
          >
            <Plus size={16} />
            Ajouter une question
          </button>
        </div>
      </div>
    </div>
  );
}
