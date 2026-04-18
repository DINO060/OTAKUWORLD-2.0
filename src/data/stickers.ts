export interface Sticker {
  id: string;
  emoji: string;
  alt: string;
}

export interface StickerPack {
  id: string;
  name: string;
  icon: string;
  stickers: Sticker[];
}

export const STICKER_PACKS: StickerPack[] = [
  {
    id: 'smileys',
    name: 'Smileys',
    icon: '😀',
    stickers: [
      { id: 'smileys:grin', emoji: '😁', alt: 'Grin' },
      { id: 'smileys:joy', emoji: '😂', alt: 'Joy' },
      { id: 'smileys:rofl', emoji: '🤣', alt: 'ROFL' },
      { id: 'smileys:heart-eyes', emoji: '😍', alt: 'Heart Eyes' },
      { id: 'smileys:star-eyes', emoji: '🤩', alt: 'Star Eyes' },
      { id: 'smileys:thinking', emoji: '🤔', alt: 'Thinking' },
      { id: 'smileys:shush', emoji: '🤫', alt: 'Shush' },
      { id: 'smileys:zany', emoji: '🤪', alt: 'Zany' },
      { id: 'smileys:cool', emoji: '😎', alt: 'Cool' },
      { id: 'smileys:angry', emoji: '😡', alt: 'Angry' },
      { id: 'smileys:crying', emoji: '😭', alt: 'Crying' },
      { id: 'smileys:shocked', emoji: '😱', alt: 'Shocked' },
      { id: 'smileys:pleading', emoji: '🥺', alt: 'Pleading' },
      { id: 'smileys:skull', emoji: '💀', alt: 'Skull' },
      { id: 'smileys:clown', emoji: '🤡', alt: 'Clown' },
      { id: 'smileys:ghost', emoji: '👻', alt: 'Ghost' },
    ],
  },
  {
    id: 'gestures',
    name: 'Gestures',
    icon: '👋',
    stickers: [
      { id: 'gestures:wave', emoji: '👋', alt: 'Wave' },
      { id: 'gestures:thumbsup', emoji: '👍', alt: 'Thumbs Up' },
      { id: 'gestures:thumbsdown', emoji: '👎', alt: 'Thumbs Down' },
      { id: 'gestures:clap', emoji: '👏', alt: 'Clap' },
      { id: 'gestures:fire', emoji: '🔥', alt: 'Fire' },
      { id: 'gestures:100', emoji: '💯', alt: '100' },
      { id: 'gestures:pray', emoji: '🙏', alt: 'Pray' },
      { id: 'gestures:muscle', emoji: '💪', alt: 'Muscle' },
      { id: 'gestures:heart', emoji: '❤️', alt: 'Heart' },
      { id: 'gestures:broken-heart', emoji: '💔', alt: 'Broken Heart' },
      { id: 'gestures:star', emoji: '⭐', alt: 'Star' },
      { id: 'gestures:sparkles', emoji: '✨', alt: 'Sparkles' },
      { id: 'gestures:eyes', emoji: '👀', alt: 'Eyes' },
      { id: 'gestures:cap', emoji: '🧢', alt: 'Cap' },
      { id: 'gestures:crown', emoji: '👑', alt: 'Crown' },
      { id: 'gestures:money', emoji: '💰', alt: 'Money' },
    ],
  },
  {
    id: 'animals',
    name: 'Animals',
    icon: '🐱',
    stickers: [
      { id: 'animals:cat', emoji: '🐱', alt: 'Cat' },
      { id: 'animals:dog', emoji: '🐶', alt: 'Dog' },
      { id: 'animals:wolf', emoji: '🐺', alt: 'Wolf' },
      { id: 'animals:fox', emoji: '🦊', alt: 'Fox' },
      { id: 'animals:bear', emoji: '🐻', alt: 'Bear' },
      { id: 'animals:panda', emoji: '🐼', alt: 'Panda' },
      { id: 'animals:unicorn', emoji: '🦄', alt: 'Unicorn' },
      { id: 'animals:dragon', emoji: '🐉', alt: 'Dragon' },
      { id: 'animals:butterfly', emoji: '🦋', alt: 'Butterfly' },
      { id: 'animals:octopus', emoji: '🐙', alt: 'Octopus' },
      { id: 'animals:shark', emoji: '🦈', alt: 'Shark' },
      { id: 'animals:monkey', emoji: '🐵', alt: 'Monkey' },
    ],
  },
  {
    id: 'food',
    name: 'Food & Drink',
    icon: '🍕',
    stickers: [
      { id: 'food:pizza', emoji: '🍕', alt: 'Pizza' },
      { id: 'food:burger', emoji: '🍔', alt: 'Burger' },
      { id: 'food:ramen', emoji: '🍜', alt: 'Ramen' },
      { id: 'food:sushi', emoji: '🍣', alt: 'Sushi' },
      { id: 'food:cake', emoji: '🎂', alt: 'Cake' },
      { id: 'food:ice-cream', emoji: '🍦', alt: 'Ice Cream' },
      { id: 'food:coffee', emoji: '☕', alt: 'Coffee' },
      { id: 'food:boba', emoji: '🧋', alt: 'Boba Tea' },
      { id: 'food:beer', emoji: '🍺', alt: 'Beer' },
      { id: 'food:wine', emoji: '🍷', alt: 'Wine' },
      { id: 'food:popcorn', emoji: '🍿', alt: 'Popcorn' },
      { id: 'food:donut', emoji: '🍩', alt: 'Donut' },
    ],
  },
];

export function getStickerById(stickerId: string): Sticker | undefined {
  for (const pack of STICKER_PACKS) {
    const sticker = pack.stickers.find(s => s.id === stickerId);
    if (sticker) return sticker;
  }
  return undefined;
}
