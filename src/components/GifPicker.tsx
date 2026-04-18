import { useState, useEffect, useRef } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { searchGifs, getTrendingGifs, type TenorGif } from '../lib/tenor';

interface GifPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onGifSelect: (gifUrl: string) => void;
}

export default function GifPicker({ isOpen, onClose, onGifSelect }: GifPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<TenorGif[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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

  // Load trending on open
  useEffect(() => {
    if (isOpen && gifs.length === 0 && !query) {
      setIsLoading(true);
      getTrendingGifs(20).then(results => {
        setGifs(results);
        setIsLoading(false);
      });
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      getTrendingGifs(20).then(setGifs);
      return;
    }
    const timer = setTimeout(() => {
      setIsLoading(true);
      searchGifs(query, 20).then(results => {
        setGifs(results);
        setIsLoading(false);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

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
          {/* Header */}
          <div className="p-3 border-b border-gray-800">
            <div className="flex items-center gap-2 bg-[#252525] rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search GIFs..."
                autoFocus
                className="bg-transparent border-none outline-none text-gray-200 text-sm w-full placeholder-gray-500"
              />
            </div>
          </div>

          {/* Grid */}
          <div className="h-[300px] overflow-y-auto p-2">
            {isLoading && gifs.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
              </div>
            ) : gifs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                {query ? 'No GIFs found' : 'No Tenor API key configured'}
              </div>
            ) : (
              <div className="columns-2 gap-1.5">
                {gifs.map(gif => (
                  <button
                    key={gif.id}
                    onClick={() => onGifSelect(gif.url)}
                    className="w-full mb-1.5 rounded-lg overflow-hidden hover:ring-2 hover:ring-purple-500 transition-all block"
                  >
                    <img
                      src={gif.previewUrl}
                      alt={gif.title}
                      loading="lazy"
                      className="w-full object-cover rounded-lg"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tenor attribution */}
          <div className="px-3 py-1.5 border-t border-gray-800 text-center">
            <span className="text-[10px] text-gray-600">Powered by Tenor</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
