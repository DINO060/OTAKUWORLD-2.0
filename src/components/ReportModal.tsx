import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flag, X, Loader2, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportedUserId: string;
  reportedUsername: string;
  reportedMessageId?: string;
  reportedMessageText?: string;
  reportedChapterId?: string;
  reportedChapterTitle?: string;
}

const REASONS = [
  'Spam ou publicité',
  'Harcèlement ou intimidation',
  'Contenu haineux ou discriminatoire',
  'Contenu violent ou dangereux',
  'Usurpation d\'identité',
  'Contenu sexuel inapproprié',
  'Autre',
];

export default function ReportModal({
  isOpen,
  onClose,
  reportedUserId,
  reportedUsername,
  reportedMessageId,
  reportedMessageText,
  reportedChapterId,
  reportedChapterTitle,
}: ReportModalProps) {
  const { user } = useAuth();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async () => {
    if (!user || !selectedReason) return;

    const reason = selectedReason === 'Autre' ? customReason.trim() : selectedReason;
    if (!reason) return;

    setStatus('sending');
    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      reported_user_id: reportedUserId,
      reported_message_id: reportedMessageId || null,
      reported_chapter_id: reportedChapterId || null,
      reason,
    });

    if (error) {
      setStatus('error');
      setErrorMsg(error.message);
    } else {
      setStatus('success');
      setTimeout(() => {
        setStatus('idle');
        setSelectedReason(null);
        setCustomReason('');
        onClose();
      }, 1500);
    }
  };

  const handleClose = () => {
    setStatus('idle');
    setSelectedReason(null);
    setCustomReason('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 z-[60]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 28, stiffness: 360 }}
            className="fixed bottom-0 left-0 right-0 z-[70] sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-[380px]"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Flag className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-bold text-foreground">Signaler @{reportedUsername}</span>
                </div>
                <button onClick={handleClose} className="p-1 hover:bg-secondary rounded-lg transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="p-4 space-y-3">
                {/* Message preview */}
                {reportedMessageText && (
                  <div className="bg-secondary rounded-lg px-3 py-2 text-xs text-muted-foreground border-l-2 border-border">
                    <span className="text-foreground/60">Message : </span>
                    <span className="truncate">{reportedMessageText.slice(0, 80)}{reportedMessageText.length > 80 ? '…' : ''}</span>
                  </div>
                )}

                {/* Chapter preview */}
                {reportedChapterTitle && (
                  <div className="bg-secondary rounded-lg px-3 py-2 text-xs text-muted-foreground border-l-2 border-purple-500/50">
                    <span className="text-foreground/60">Chapitre : </span>
                    <span className="text-foreground font-medium">{reportedChapterTitle}</span>
                  </div>
                )}

                {/* Reason selection */}
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Motif du signalement</p>
                <div className="space-y-1.5">
                  {REASONS.map(reason => (
                    <button
                      key={reason}
                      onClick={() => setSelectedReason(reason)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedReason === reason
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                          : 'bg-secondary text-foreground hover:bg-accent'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>

                {/* Custom reason input */}
                {selectedReason === 'Autre' && (
                  <textarea
                    value={customReason}
                    onChange={e => setCustomReason(e.target.value)}
                    maxLength={300}
                    rows={2}
                    placeholder="Décrivez le problème..."
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-red-500 resize-none"
                  />
                )}

                {/* Error */}
                {status === 'error' && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <X className="w-3 h-3" />{errorMsg}
                  </p>
                )}

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={!selectedReason || status === 'sending' || status === 'success' || (selectedReason === 'Autre' && !customReason.trim())}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  {status === 'sending' ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Envoi...</>
                  ) : status === 'success' ? (
                    <><Check className="w-4 h-4" /> Signalement envoyé</>
                  ) : (
                    <><Flag className="w-4 h-4" /> Envoyer le signalement</>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
