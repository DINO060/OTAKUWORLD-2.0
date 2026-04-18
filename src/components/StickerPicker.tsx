import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { STICKER_PACKS } from '../data/stickers';

interface StickerPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onStickerSelect: (stickerId: string) => void;
}

export default function StickerPicker({ isOpen, onClose, onStickerSelect }: StickerPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null);
  const [activePack, setActivePack] = useState(STICKER_PACKS[0]?.id || '');

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 100);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const currentPack = STICKER_PACKS.find(p => p.id === activePack) || STICKER_PACKS[0];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={pickerRef}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-[80px] left-2 right-2 sm:left-4 sm:right-auto sm:w-[360px] z-50 bg-[#1a1a1a] border border-gray-800 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.5)] overflow-hidden"
        >
          {/* Pack tabs */}
          <div className="flex gap-1 p-2 border-b border-gray-800 overflow-x-auto scrollbar-hide">
            {STICKER_PACKS.map(pack => (
              <button
                key={pack.id}
                onClick={() => setActivePack(pack.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  activePack === pack.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-[#252525] text-gray-400 hover:bg-[#303030]'
                }`}
              >
                {pack.icon} {pack.name}
              </button>
            ))}
          </div>

          {/* Sticker grid */}
          <div className="h-[280px] overflow-y-auto p-3">
            {currentPack && (
              <div className="grid grid-cols-4 gap-2">
                {currentPack.stickers.map(sticker => (
                  <button
                    key={sticker.id}
                    onClick={() => onStickerSelect(sticker.id)}
                    title={sticker.alt}
                    className="w-full aspect-square flex items-center justify-center rounded-xl hover:bg-[#252525] hover:scale-110 active:scale-95 transition-all text-4xl"
                  >
                    {sticker.emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
