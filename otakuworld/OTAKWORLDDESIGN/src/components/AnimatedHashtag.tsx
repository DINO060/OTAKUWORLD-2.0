import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface AnimatedHashtagProps {
  onClick: () => void;
}

export function AnimatedHashtag({ onClick }: AnimatedHashtagProps) {
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    // Trigger animation on mount
    const timer = setTimeout(() => {
      setHasAnimated(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <button
      onClick={onClick}
      className="fixed bottom-24 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center z-40 hover:scale-110 active:scale-95"
      aria-label="View tags"
    >
      <div className="relative w-6 h-6">
        {/* First vertical bar */}
        <motion.div
          className="absolute bg-white rounded-full"
          initial={{ width: 2, height: 0, left: 6, top: 12 }}
          animate={
            hasAnimated
              ? { height: 20, top: 2 }
              : { width: 2, height: 0, left: 6, top: 12 }
          }
          transition={{ duration: 0.3, delay: 0 }}
        />

        {/* Second vertical bar */}
        <motion.div
          className="absolute bg-white rounded-full"
          initial={{ width: 2, height: 0, left: 18, top: 12 }}
          animate={
            hasAnimated
              ? { height: 20, top: 2 }
              : { width: 2, height: 0, left: 18, top: 12 }
          }
          transition={{ duration: 0.3, delay: 0.15 }}
        />

        {/* First horizontal bar */}
        <motion.div
          className="absolute bg-white rounded-full"
          initial={{ width: 0, height: 2, left: 12, top: 7 }}
          animate={
            hasAnimated
              ? { width: 20, left: 2 }
              : { width: 0, height: 2, left: 12, top: 7 }
          }
          transition={{ duration: 0.3, delay: 0.3 }}
        />

        {/* Second horizontal bar */}
        <motion.div
          className="absolute bg-white rounded-full"
          initial={{ width: 0, height: 2, left: 12, top: 16 }}
          animate={
            hasAnimated
              ? { width: 20, left: 2 }
              : { width: 0, height: 2, left: 12, top: 16 }
          }
          transition={{ duration: 0.3, delay: 0.45 }}
        />
      </div>
    </button>
  );
}
