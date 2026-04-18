import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, X } from 'lucide-react';
import { QuizResultPage } from './QuizResultPage';
import type { Quiz, QuizQuestion } from './types';

interface QuizPlayPageProps {
  quiz: Quiz;
  onBack: () => void;
}

export function QuizPlayPage({ quiz, onBack }: QuizPlayPageProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);

  // Mock questions
  const questions: QuizQuestion[] = [
    {
      id: '1',
      question: 'Qui est le 4ème Hokage?',
      answers: [
        { id: 'a', text: 'Hiruzen Sarutobi', isCorrect: false },
        { id: 'b', text: 'Minato Namikaze', isCorrect: true },
        { id: 'c', text: 'Tobirama Senju', isCorrect: false },
        { id: 'd', text: 'Tsunade', isCorrect: false },
      ],
    },
    {
      id: '2',
      question: 'Quel est le nom du village de Naruto?',
      answers: [
        { id: 'a', text: 'Sunagakure', isCorrect: false },
        { id: 'b', text: 'Kirigakure', isCorrect: false },
        { id: 'c', text: 'Konohagakure', isCorrect: true },
        { id: 'd', text: 'Kumogakure', isCorrect: false },
      ],
    },
    {
      id: '3',
      question: 'Combien de queues a Kurama?',
      answers: [
        { id: 'a', text: '7 queues', isCorrect: false },
        { id: 'b', text: '8 queues', isCorrect: false },
        { id: 'c', text: '9 queues', isCorrect: true },
        { id: 'd', text: '10 queues', isCorrect: false },
      ],
    },
  ];

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;

  // Timer
  useEffect(() => {
    if (timeLeft > 0 && !selectedAnswer) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !selectedAnswer) {
      handleAnswer(null);
    }
  }, [timeLeft, selectedAnswer]);

  const handleAnswer = (answerId: string | null) => {
    if (selectedAnswer) return;

    setSelectedAnswer(answerId);

    const isCorrect = answerId
      ? currentQuestion.answers.find((a) => a.id === answerId)?.isCorrect
      : false;

    const newAnswers = [...answers, isCorrect || false];
    setAnswers(newAnswers);

    if (isCorrect) {
      const basePoints = 100;
      const speedBonus = timeLeft > 10 ? 50 : 0;
      const newStreak = streak + 1;
      const multiplier = newStreak >= 5 ? 5 : newStreak >= 3 ? 3 : newStreak >= 2 ? 2 : 1;
      setScore(score + (basePoints + speedBonus) * multiplier);
      setStreak(newStreak);
    } else {
      setStreak(0);
    }

    // Next question after 1.5s
    setTimeout(() => {
      if (currentQuestionIndex < totalQuestions - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setSelectedAnswer(null);
        setTimeLeft(15);
      } else {
        setShowResult(true);
      }
    }, 1500);
  };

  if (showResult) {
    return (
      <QuizResultPage
        quiz={quiz}
        score={score}
        maxScore={totalQuestions * 100}
        correctAnswers={answers.filter((a) => a).length}
        totalQuestions={totalQuestions}
        bestStreak={Math.max(...answers.map((_, i) => {
          let s = 0;
          for (let j = i; j < answers.length && answers[j]; j++) s++;
          return s;
        }))}
        onBack={onBack}
      />
    );
  }

  const timerPercentage = (timeLeft / 15) * 100;
  const timerColor = timeLeft <= 5 ? '#ef4444' : '#6c5ce7';

  return (
    <div className="h-full flex flex-col" style={{ background: '#0c0c14' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{
          background: '#111119',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-[#1f1f2e] transition-colors"
        >
          <ArrowLeft size={20} style={{ color: '#e8e8ed' }} />
        </button>
        <h2 style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>
          Quiz: {quiz.title}
        </h2>
        <div style={{ width: '40px' }} />
      </div>

      {/* Progress */}
      <div
        className="px-4 py-3 border-b"
        style={{
          background: '#111119',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#e8e8ed' }}>
            Question {currentQuestionIndex + 1}/{totalQuestions}
          </span>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: timeLeft <= 5 ? '#ef4444' : '#ffd200',
            }}
          >
            ⏱️ {timeLeft}s
          </span>
        </div>
        {/* Timer bar */}
        <div
          className="w-full h-1 rounded-full overflow-hidden"
          style={{ background: '#1a1a25' }}
        >
          <div
            className="h-full transition-all duration-1000"
            style={{
              width: `${timerPercentage}%`,
              background: `linear-gradient(90deg, ${timerColor} 0%, ${timerColor} 100%)`,
            }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <h3
          className="mb-6 text-center"
          style={{ fontSize: '18px', fontWeight: 700, color: '#e8e8ed', lineHeight: '1.4' }}
        >
          {currentQuestion.question}
        </h3>

        {/* Answers */}
        <div className="space-y-3 max-w-md mx-auto">
          {currentQuestion.answers.map((answer) => {
            const isSelected = selectedAnswer === answer.id;
            const isCorrect = answer.isCorrect;
            const showFeedback = selectedAnswer !== null;

            let bgColor = '#111119';
            let borderColor = 'rgba(255,255,255,0.06)';
            let icon = null;

            if (showFeedback) {
              if (isSelected && isCorrect) {
                bgColor = 'rgba(34,197,94,0.12)';
                borderColor = '#22c55e';
                icon = <Check size={20} style={{ color: '#22c55e' }} />;
              } else if (isSelected && !isCorrect) {
                bgColor = 'rgba(239,68,68,0.12)';
                borderColor = '#ef4444';
                icon = <X size={20} style={{ color: '#ef4444' }} />;
              } else if (!isSelected && isCorrect) {
                bgColor = 'rgba(34,197,94,0.12)';
                borderColor = '#22c55e';
                icon = <Check size={20} style={{ color: '#22c55e' }} />;
              }
            }

            return (
              <button
                key={answer.id}
                onClick={() => handleAnswer(answer.id)}
                disabled={selectedAnswer !== null}
                className="w-full p-4 rounded-2xl border text-left transition-all hover:bg-[#1f1f2e] disabled:cursor-not-allowed flex items-center gap-3"
                style={{
                  background: bgColor,
                  borderColor: borderColor,
                }}
              >
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#e8e8ed' }}>
                  {answer.id.toUpperCase()}.
                </span>
                <span className="flex-1" style={{ fontSize: '13px', fontWeight: 600, color: '#e8e8ed' }}>
                  {answer.text}
                </span>
                {icon}
              </button>
            );
          })}
        </div>
      </div>

      {/* Score Footer */}
      <div
        className="px-4 py-3 border-t flex items-center justify-between"
        style={{
          background: '#111119',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <div style={{ fontSize: '13px', color: '#8888a0' }}>
          Score: <span style={{ fontWeight: 700, color: '#e8e8ed' }}>{score} pts</span>
        </div>
        <div style={{ fontSize: '13px', color: '#8888a0' }}>
          Série: <span style={{ fontWeight: 700, color: streak > 0 ? '#ffd200' : '#e8e8ed' }}>
            {streak > 0 ? `🔥 x${streak}` : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}
