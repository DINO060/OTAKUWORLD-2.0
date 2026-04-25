import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { motion, AnimatePresence } from 'motion/react';

interface EmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onEmojiSelect: (emoji: string) => void;
}

export default function EmojiPicker({ isOpen, onEmojiSelect }: EmojiPickerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'tween', duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{
            position: 'fixed', left: 0, right: 0, bottom: 56, zIndex: 50,
            height: 260,
            overflow: 'hidden',
            borderRadius: '16px 16px 0 0',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.5)',
          }}
        >
          <Picker
            data={data}
            onEmojiSelect={(emoji: any) => onEmojiSelect(emoji.native)}
            theme="dark"
            locale="fr"
            previewPosition="none"
            skinTonePosition="none"
            maxFrequentRows={1}
            perLine={8}
            emojiSize={24}
            emojiButtonSize={32}
            icons="auto"
            set="native"
            categories={['frequent', 'people', 'nature', 'foods', 'activity', 'places', 'objects', 'symbols', 'flags']}
            navPosition="bottom"
            searchPosition="sticky"
            dynamicWidth={false}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
