import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { motion, AnimatePresence } from 'motion/react';

interface EmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onEmojiSelect: (emoji: string) => void;
}

export default function EmojiPicker({ isOpen, onEmojiSelect }: EmojiPickerProps) {
  const handleEmojiSelect = (emoji: any) => {
    onEmojiSelect(emoji.native);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'tween', duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="fixed left-0 right-0 z-50 overflow-hidden rounded-t-2xl"
          style={{ bottom: 56, maxHeight: 300 }}
        >
          <Picker
            data={data}
            onEmojiSelect={handleEmojiSelect}
            theme="dark"
            locale="fr"
            previewPosition="none"
            skinTonePosition="search"
            maxFrequentRows={2}
            perLine={8}
            emojiSize={28}
            emojiButtonSize={36}
            icons="auto"
            set="native"
            categories={[
              'frequent', 'people', 'nature', 'foods',
              'activity', 'places', 'objects', 'symbols', 'flags',
            ]}
            navPosition="bottom"
            searchPosition="sticky"
            dynamicWidth={false}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
