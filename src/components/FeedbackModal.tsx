import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, MessageSquare, Check, Loader2, Bug, Lightbulb, HelpCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  { id: 'general', label: 'Général',       icon: MessageSquare, color: 'text-blue-400',   bg: 'bg-blue-500/20 border-blue-500/40' },
  { id: 'bug',     label: 'Bug / Erreur',  icon: Bug,           color: 'text-red-400',    bg: 'bg-red-500/20 border-red-500/40' },
  { id: 'feature', label: 'Suggestion',    icon: Lightbulb,     color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/40' },
  { id: 'other',   label: 'Autre',         icon: HelpCircle,    color: 'text-purple-400', bg: 'bg-purple-500/20 border-purple-500/40' },
] as const;
type Category = typeof CATEGORIES[number]['id'];

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { user, profile } = useAuth();
  const [category, setCategory] = useState<Category>('general');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setMessage('');
      setCategory('general');
      setStatus('idle');
      setErrorMsg('');
    }, 300);
  };

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setStatus('sending');

    const { error } = await supabase.from('feedbacks').insert({
      user_id: user?.id ?? null,
      username: profile?.username ?? 'Anonyme',
      message: message.trim(),
      category,
    });

    if (error) {
      setErrorMsg(error.message);
      setStatus('error');
      return;
    }

    setStatus('success');
    setTimeout(handleClose, 1800);
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/70 z-[9998]"
          />
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[9999] sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-[420px]"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl p-5 space-y-4">

              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-blue-400" />
                  </div>
                  <h2 className="text-base font-bold text-foreground">Envoyer un feedback</h2>
                </div>
                <button onClick={handleClose} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {status === 'success' ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center py-8 gap-3"
                >
                  <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center">
                    <Check className="w-7 h-7 text-green-400" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">Merci pour votre feedback !</p>
                  <p className="text-xs text-muted-foreground text-center">Nous l'avons bien reçu et le lirons avec attention.</p>
                </motion.div>
              ) : (
                <>
                  {/* Category */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Catégorie</p>
                    <div className="grid grid-cols-2 gap-2">
                      {CATEGORIES.map(cat => {
                        const Icon = cat.icon;
                        const isSelected = category === cat.id;
                        return (
                          <button
                            key={cat.id}
                            onClick={() => setCategory(cat.id)}
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                              isSelected ? `${cat.bg} text-foreground` : 'bg-background border-border text-muted-foreground hover:bg-secondary'
                            }`}
                          >
                            <Icon className={`w-4 h-4 ${isSelected ? cat.color : ''}`} />
                            {cat.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Message</p>
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Décrivez votre feedback, bug ou suggestion..."
                      rows={4}
                      maxLength={1000}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-blue-500 resize-none transition-colors"
                    />
                    <div className="flex justify-end mt-1">
                      <span className={`text-[10px] ${message.length > 900 ? 'text-red-400' : 'text-muted-foreground'}`}>
                        {message.length}/1000
                      </span>
                    </div>
                  </div>

                  {status === 'error' && (
                    <p className="text-xs text-red-400 flex items-center gap-1">
                      <X className="w-3 h-3" /> {errorMsg}
                    </p>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={status === 'sending' || !message.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    {status === 'sending'
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <MessageSquare className="w-4 h-4" />
                    }
                    {status === 'sending' ? 'Envoi en cours...' : 'Envoyer le feedback'}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
