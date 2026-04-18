// ─── Manual Promotion Banners ────────────────────────────────────────────────
// Edit this file to add/remove/update your own promotional banners.
// These show when AdSense is not configured or as additional placements.

export interface Promo {
  id: string;
  label: string;       // Small tag above title (e.g. "NEW", "PROMO")
  title: string;
  body: string;
  cta: string;         // Button text
  href: string;        // URL to open on click
  gradient: string;    // Tailwind gradient classes
  emoji: string;
}

const promotions: Promo[] = [
  {
    id: 'discord',
    label: 'COMMUNAUTÉ',
    title: 'Rejoins notre Discord',
    body: 'Discute avec la communauté, partage tes lectures et reçois les dernières news.',
    cta: 'Rejoindre',
    href: 'https://discord.gg/VOTRE_INVITE',
    gradient: 'from-indigo-500 to-purple-600',
    emoji: '💬',
  },
  {
    id: 'upload',
    label: 'AUTEURS',
    title: 'Publie ton manga',
    body: 'Tu dessines ? Partage tes créations avec notre communauté passionnée.',
    cta: 'Publier',
    href: '#publish',
    gradient: 'from-pink-500 to-rose-600',
    emoji: '✏️',
  },
  {
    id: 'premium',
    label: 'BIENTÔT',
    title: 'Comment Live Premium',
    body: 'Sans pub, réactions exclusives, badge Premium et lecture prioritaire.',
    cta: 'En savoir plus',
    href: '#premium',
    gradient: 'from-amber-500 to-orange-600',
    emoji: '⭐',
  },
];

export default promotions;

// ─── AdSense config ───────────────────────────────────────────────────────────
// Replace these with your real AdSense values once your account is approved.
export const ADSENSE_PUBLISHER_ID = 'ca-pub-XXXXXXXXXXXXXXXX';
export const ADSENSE_SLOT_FEED    = 'XXXXXXXXXX';  // Ad slot for the chat feed
export const ADSENSE_SLOT_BROWSE  = 'XXXXXXXXXX';  // Ad slot for chapters browse
