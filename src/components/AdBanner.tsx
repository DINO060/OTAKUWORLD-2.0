import { useEffect, useRef, useState } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import promotions, { ADSENSE_PUBLISHER_ID, type Promo } from '../data/promotions';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdBannerProps {
  /** Which AdSense slot to use (from promotions.ts) */
  slot: string;
  /** Override which promo to show (default: random from list) */
  promoId?: string;
  /** Compact single-line style vs full card */
  variant?: 'card' | 'strip';
}

// ─── AdSense detection ────────────────────────────────────────────────────────

function isAdSenseReady(): boolean {
  return typeof (window as any).adsbygoogle !== 'undefined';
}

// ─── AdSense unit ─────────────────────────────────────────────────────────────

function AdSenseUnit({ slot }: { slot: string }) {
  const ref = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (!pushed.current && ref.current) {
      try {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        pushed.current = true;
      } catch { /* adsbygoogle not loaded */ }
    }
  }, []);

  return (
    <ins
      ref={ref}
      className="adsbygoogle block"
      style={{ minHeight: 80 }}
      data-ad-client={ADSENSE_PUBLISHER_ID}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}

// ─── Manual promo card ────────────────────────────────────────────────────────

function PromoCard({ promo, onDismiss, variant }: { promo: Promo; onDismiss: () => void; variant: 'card' | 'strip' }) {
  const handleClick = () => {
    if (promo.href.startsWith('#')) return; // internal link placeholder
    window.open(promo.href, '_blank', 'noopener,noreferrer');
  };

  if (variant === 'strip') {
    return (
      <div className={`relative flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r ${promo.gradient} rounded-xl overflow-hidden`}>
        <span className="text-xl">{promo.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-bold truncate">{promo.title}</p>
          <p className="text-white/80 text-[10px] truncate">{promo.body}</p>
        </div>
        <button
          onClick={handleClick}
          className="flex-shrink-0 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1 rounded-lg transition-colors"
        >
          {promo.cta}
        </button>
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-0.5 hover:bg-white/20 rounded-full transition-colors"
        >
          <X className="w-3 h-3 text-white/70" />
        </button>
      </div>
    );
  }

  // card variant
  return (
    <div className={`relative bg-gradient-to-br ${promo.gradient} rounded-2xl p-4 overflow-hidden`}>
      {/* Dismiss */}
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 p-1 bg-black/20 hover:bg-black/30 rounded-full transition-colors"
      >
        <X className="w-3 h-3 text-white/80" />
      </button>

      {/* Label */}
      <span className="inline-block bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 tracking-wide">
        {promo.label}
      </span>

      <div className="flex items-start gap-3">
        <span className="text-3xl">{promo.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm leading-snug">{promo.title}</p>
          <p className="text-white/80 text-xs mt-1 leading-relaxed">{promo.body}</p>
          <button
            onClick={handleClick}
            className="mt-2.5 flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            {promo.cta}
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Sponsored tag */}
      <p className="absolute bottom-1.5 right-3 text-[9px] text-white/40">Sponsorisé</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

// Track dismissed promos in memory (resets on reload — intentional)
const dismissed = new Set<string>();

export default function AdBanner({ slot, promoId, variant = 'card' }: AdBannerProps) {
  const [visible, setVisible] = useState(true);
  const adsenseReady = isAdSenseReady();

  // Pick promo
  const available = promotions.filter(p => !dismissed.has(p.id));
  const promo = promoId
    ? promotions.find(p => p.id === promoId) ?? available[0]
    : available[Math.floor(Math.random() * Math.max(available.length, 1))];

  const handleDismiss = () => {
    if (promo) dismissed.add(promo.id);
    setVisible(false);
  };

  if (!visible || !promo) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25 }}
        className="my-3"
      >
        {adsenseReady ? (
          // AdSense is loaded → show real ad
          <AdSenseUnit slot={slot} />
        ) : (
          // Fallback → show manual promo
          <PromoCard promo={promo} onDismiss={handleDismiss} variant={variant} />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
