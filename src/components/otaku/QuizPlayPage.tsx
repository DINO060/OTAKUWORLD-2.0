import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { QuizResultPage } from './QuizResultPage';
import type { Quiz, QuizQuestion } from './types';

interface QuizPlayPageProps {
  quiz: Quiz;
  onBack: () => void;
}

export function QuizPlayPage({ quiz, onBack }: QuizPlayPageProps) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const timerMax = quiz.timerSeconds || 15;
  const [timeLeft, setTimeLeft] = useState(timerMax);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [answers, setAnswers] = useState<{ questionId: string; chosen: string | null; isCorrect: boolean; timeTaken: number }[]>([]);
  const [resultSaved, setResultSaved] = useState(false);

  // Load questions from DB
  useEffect(() => {
    const loadQuestions = async () => {
      // If quiz already has questions attached (from create), use them
      if (quiz.questions && quiz.questions.length > 0) {
        setQuestions(quiz.questions);
        setLoadingQuestions(false);
        return;
      }

      const { data, error } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quiz.id)
        .order('sort_order', { ascending: true });

      if (error || !data || data.length === 0) {
        console.error('Failed to load questions:', error);
        setLoadingQuestions(false);
        return;
      }

      const mapped: QuizQuestion[] = data.map((q: any) => ({
        id: q.id,
        question: q.question,
        imageUrl: q.image_url || undefined,
        answers: q.answers || [],
      }));

      setQuestions(mapped);
      setLoadingQuestions(false);
    };

    loadQuestions();
  }, [quiz]);

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;

  // Timer
  useEffect(() => {
    if (loadingQuestions || !currentQuestion || showResult) return;
    if (timeLeft > 0 && !selectedAnswer) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !selectedAnswer) {
      handleAnswer(null);
    }
  }, [timeLeft, selectedAnswer, loadingQuestions, currentQuestion, showResult]);

  // Save result to DB when quiz is finished
  useEffect(() => {
    if (!showResult || resultSaved || !user) return;

    const saveResult = async () => {
      const correctCount = answers.filter(a => a.isCorrect).length;
      const { error } = await supabase.from('quiz_results').upsert({
        quiz_id: quiz.id,
        user_id: user.id,
        score,
        correct_answers: correctCount,
        total_questions: totalQuestions,
        best_streak: bestStreak,
      }, { onConflict: 'quiz_id,user_id' });

      if (error) {
        console.error('Failed to save quiz result:', error);
      }
      setResultSaved(true);
    };

    saveResult();
  }, [showResult, resultSaved, user]);

  const handleAnswer = (answerId: string | null) => {
    if (selectedAnswer || !currentQuestion) return;
    setSelectedAnswer(answerId);

    const isCorrect = answerId
      ? currentQuestion.answers.find((a) => a.id === answerId)?.isCorrect || false
      : false;

    const timeTaken = (timerMax - timeLeft) * 1000;
    const newAnswers = [...answers, { questionId: currentQuestion.id, chosen: answerId, isCorrect, timeTaken }];
    setAnswers(newAnswers);

    if (isCorrect) {
      const basePoints = 100;
      const speedBonus = timeLeft > (timerMax * 0.66) ? 50 : timeLeft > (timerMax * 0.33) ? 25 : 0;
      const newStreak = streak + 1;
      const multiplier = newStreak >= 5 ? 5 : newStreak >= 3 ? 3 : newStreak >= 2 ? 2 : 1;
      setScore(score + (basePoints + speedBonus) * multiplier);
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);
    } else {
      setStreak(0);
    }

    setTimeout(() => {
      if (currentQuestionIndex < totalQuestions - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setSelectedAnswer(null);
        setTimeLeft(timerMax);
      } else {
        setShowResult(true);
      }
    }, 1500);
  };

  if (loadingQuestions) {
    return (
      <div className="h-full flex flex-col items-center justify-center" style={{ background: '#0c0c14' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#6c5ce7', marginBottom: '12px' }} />
        <p style={{ fontSize: '14px', color: '#8888a0' }}>Chargement des questions...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center" style={{ background: '#0c0c14' }}>
        <span style={{ fontSize: '48px', marginBottom: '12px' }}>😕</span>
        <p style={{ fontSize: '14px', color: '#8888a0', marginBottom: '16px' }}>Aucune question trouvée</p>
        <button onClick={onBack} className="px-4 py-2 rounded-lg" style={{ background: '#6c5ce7', color: '#fff', fontSize: '13px', fontWeight: 600 }}>
          Retour
        </button>
      </div>
    );
  }

  if (showResult) {
    return (
      <QuizResultPage
        quiz={quiz}
        score={score}
        maxScore={totalQuestions * 150}
        correctAnswers={answers.filter((a) => a.isCorrect).length}
        totalQuestions={totalQuestions}
        bestStreak={bestStreak}
        answers={answers}
        questions={questions}
        onBack={onBack}
      />
    );
  }

  const timerPercentage = (timeLeft / timerMax) * 100;
  const timerColor = timeLeft <= 5 ? '#ef4444' : timeLeft <= (timerMax * 0.33) ? '#f59e0b' : '#6c5ce7';

  return (
    <div className="h-full flex flex-col" style={{ background: '#0c0c14' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ background: '#111119', borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-[#1f1f2e] transition-colors">
          <ArrowLeft size={20} style={{ color: '#e8e8ed' }} />
        </button>
        <h2 style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>
          Quiz: {quiz.title}
        </h2>
        <div style={{ width: '40px' }} />
      </div>

      {/* Progress */}
      <div className="px-4 py-3 border-b flex-shrink-0" style={{ background: '#111119', borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#e8e8ed' }}>
            Question {currentQuestionIndex + 1}/{totalQuestions}
          </span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: timeLeft <= 5 ? '#ef4444' : '#ffd200' }}>
            ⏱️ {timeLeft}s
          </span>
        </div>
        <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: '#1a1a25' }}>
          <div
            className="h-full transition-all duration-1000"
            style={{
              width: `${timerPercentage}%`,
              background: `linear-gradient(90deg, ${timerColor}, ${timerColor})`,
            }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {currentQuestion.imageUrl && (
          <div className="mb-4 rounded-2xl overflow-hidden mx-auto" style={{ maxWidth: '480px', maxHeight: '200px' }}>
            <img
              src={currentQuestion.imageUrl}
              alt=""
              className="w-full h-full object-cover"
              style={{ maxHeight: '200px' }}
            />
          </div>
        )}

        <h3
          className="mb-6 text-center"
          style={{ fontSize: '18px', fontWeight: 700, color: '#e8e8ed', lineHeight: '1.4' }}
        >
          {currentQuestion.question}
        </h3>

        <div className="space-y-3 max-w-md mx-auto">
          {currentQuestion.answers.map((answer) => {
            const isSelected = selectedAnswer === answer.id;
            const isCorrect = answer.isCorrect;
            const showFeedback = selectedAnswer !== null;

            let bgColor = '#111119';
            let borderColor = 'rgba(255,255,255,0.06)';
            let icon = null;

            if (showFeedback) {
              if (isCorrect) {
                bgColor = 'rgba(34,197,94,0.12)';
                borderColor = '#22c55e';
                icon = <Check size={20} style={{ color: '#22c55e' }} />;
              } else if (isSelected && !isCorrect) {
                bgColor = 'rgba(239,68,68,0.12)';
                borderColor = '#ef4444';
                icon = <X size={20} style={{ color: '#ef4444' }} />;
              }
            }

            return (
              <button
                key={answer.id}
                onClick={() => handleAnswer(answer.id)}
                disabled={selectedAnswer !== null}
                className="w-full p-4 rounded-2xl border text-left transition-all hover:bg-[#1f1f2e] disabled:cursor-not-allowed flex items-center gap-3"
                style={{ background: bgColor, borderColor }}
              >
                <span
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: isSelected ? (isCorrect ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)') : 'rgba(255,255,255,0.05)',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: showFeedback && isCorrect ? '#22c55e' : showFeedback && isSelected ? '#ef4444' : '#8888a0',
                  }}
                >
                  {answer.id.toUpperCase()}
                </span>
                <span className="flex-1" style={{ fontSize: '14px', fontWeight: 600, color: '#e8e8ed' }}>
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
        className="px-4 py-3 border-t flex items-center justify-between flex-shrink-0"
        style={{ background: '#111119', borderColor: 'rgba(255,255,255,0.06)' }}
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
