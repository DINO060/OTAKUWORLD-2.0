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
            <div style={{ background: '#13131f', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 48px rgba(0,0,0,0.7)', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Flag style={{ width: 16, height: 16, color: '#ef4444' }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#e8e8ed' }}>Signaler @{reportedUsername}</span>
                </div>
                <button onClick={handleClose} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X style={{ width: 16, height: 16, color: '#8899aa' }} />
                </button>
              </div>

              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Message preview */}
                {reportedMessageText && (
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#8899aa', borderLeft: '2px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ color: '#aaa' }}>Message : </span>
                    {reportedMessageText.slice(0, 80)}{reportedMessageText.length > 80 ? '…' : ''}
                  </div>
                )}

                {/* Reason selection */}
                <p style={{ fontSize: 11, fontWeight: 600, color: '#8899aa', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Motif du signalement</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {REASONS.map(reason => (
                    <button
                      key={reason}
                      onClick={() => setSelectedReason(reason)}
                      style={{ width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer', border: selectedReason === reason ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.06)', background: selectedReason === reason ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)', color: selectedReason === reason ? '#f87171' : '#c8d0dc', transition: 'all 0.15s' }}
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
                    style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#e8e8ed', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
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
