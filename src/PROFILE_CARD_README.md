# ProfileCard Component - Documentation

## ✨ Overview

The **ProfileCard** component is a fully responsive, Twitter-style profile popup/modal that displays user information with two variants: "owner" (My Profile) and "user" (Other User Profile).

## 🎯 Features

### ✅ Fully Responsive
- **Mobile**: Bottom sheet style (slides up from bottom)
- **Desktop**: Centered modal
- **Never clips**: Internal scrolling with `max-h-[90vh]`
- **Safe area**: iOS notch support

### ✅ Twitter-Style Layout
- Cover image with gradient overlay
- Circular avatar overlapping cover (bottom-left)
- Close button (top-right, always visible)
- Display name + online status
- Pronouns, badge, bio
- Social links (TikTok, Instagram, Telegram, X)

### ✅ Two Variants

#### A) Variant "owner" - My Profile
- "Edit Profile" button
- Edit mode with "Save Changes" and "Cancel"
- Editable fields: Display name, Pronouns, Bio
- Upload cover image and avatar
- Edit social links (tap icon → edit link modal)
- Helper text: "Tap any icon to edit its link"

#### B) Variant "user" - Other User Profile
- "Message" button (opens private chat)
- Read-only mode
- Social icons open URLs (not editable)

## 📋 Usage

### Basic Example

```tsx
import ProfileCard from './components/ProfileCard';

function App() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsProfileOpen(true)}>
        Open Profile
      </button>

      <ProfileCard
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        variant="owner" // or "user"
        user={{
          id: '1',
          username: 'you',
          displayName: 'NeolJova',
          avatarColor: '#3b82f6',
          isActive: true,
        }}
      />
    </>
  );
}
```

### Props

```typescript
interface ProfileCardProps {
  isOpen: boolean;              // Show/hide modal
  onClose: () => void;          // Close handler
  variant: 'owner' | 'user';    // Profile variant
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarColor: string;
    isActive: boolean;
  };
  onMessage?: () => void;       // For variant="user" - Message button handler
}
```

### Example with Message Handler

```tsx
<ProfileCard
  isOpen={isProfileOpen}
  onClose={() => setIsProfileOpen(false)}
  variant="user"
  user={{
    id: '2',
    username: 'sakura_dev',
    displayName: 'Sakura Dev',
    avatarColor: '#ec4899',
    isActive: true,
  }}
  onMessage={() => {
    setIsProfileOpen(false);
    setCurrentPage('private-chat');
  }}
/>
```

## 🎨 Design System

### Overlay
```css
bg-black/20 backdrop-blur-sm z-[100]
```
- 20% opacity
- Subtle blur
- High z-index

### Cover Image
```css
h-32 sm:h-36 md:h-40
bg-gradient-to-b from-black/20 to-black/40
```
- Responsive height
- Dark gradient overlay for readability
- Real image support via upload

### Avatar
```css
w-20 h-20 sm:w-24 sm:h-24
-mt-10
border-4 border-white shadow-xl ring-2 ring-gray-100
```
- Overlaps cover (Twitter-style)
- Border + shadow + ring
- Camera button for editing

### Close Button
```css
absolute top-3 right-3
w-9 h-9 bg-black/40 backdrop-blur-md
rounded-full z-20
```
- Always visible top-right
- Glass effect
- High z-index

## 🔧 Features in Detail

### Image Upload
- **Cover image**: Click "Change Cover" button (edit mode)
- **Avatar**: Click camera icon on avatar (edit mode)
- **FileReader**: Converts to base64 for instant preview
- **Format**: Accepts all image formats

### Social Link Editing
1. Enter edit mode
2. Tap any social icon
3. Input modal appears
4. Enter/Save to confirm, Escape/Cancel to dismiss
5. Updated link is saved to state

### Animations
- **Mobile**: Slide up from bottom
- **Desktop**: Fade + scale from center
- **Spring animations**: Smooth, natural motion
- **Transitions**: 200-300ms for hovers

## 📱 Responsive Breakpoints

| Screen Size | Behavior |
|-------------|----------|
| < 768px | Bottom sheet, full width, `max-h-[90vh]` |
| ≥ 768px | Centered modal, `w-[480px]`, `max-h-[85vh]` |

## ✅ Anti-Clip Features

1. **Max Height**: `max-h-[90vh]` on mobile, `max-h-[85vh]` on desktop
2. **Internal Scroll**: Content area has `overflow-y-auto`
3. **Fixed Elements**: Header and action buttons are `flex-shrink-0`
4. **Safe Area**: `padding-bottom: env(safe-area-inset-bottom)`
5. **Consistent Padding**: `px-4 sm:px-5` throughout

## 🎯 Integration in App.tsx

### My Profile (Owner Variant)
```tsx
// In header menu
<button onClick={() => setIsProfileCardOpen(true)}>
  <User className="w-5 h-5" />
</button>

// In render
<ProfileCard
  isOpen={isProfileCardOpen}
  onClose={() => setIsProfileCardOpen(false)}
  variant="owner"
  user={{
    id: '1',
    username: 'you',
    displayName: 'NeolJova',
    avatarColor: '#3b82f6',
    isActive: true,
  }}
/>
```

### User Profile (User Variant)
```tsx
// When clicking on a user avatar
<div onClick={() => setSelectedUserProfile(userId)}>
  {/* Avatar */}
</div>

// In render
{selectedUserProfile && (
  <ProfileCard
    isOpen={true}
    onClose={() => setSelectedUserProfile(null)}
    variant="user"
    user={getUserById(selectedUserProfile)}
    onMessage={() => {
      setSelectedUserProfile(null);
      setCurrentPage('private-chat');
    }}
  />
)}
```

## 🚀 Performance

- **Lazy loading**: Only renders when `isOpen={true}`
- **AnimatePresence**: Smooth mount/unmount
- **Optimized scrollbar**: Custom webkit scrollbar (6px width)
- **No layout shift**: Fixed positioning

## 🎨 Customization

### Colors
```tsx
// In component file
avatarColor: '#3b82f6' // Change avatar background
coverGradient: 'from-blue-500 via-purple-500 to-pink-500' // Change cover
```

### Social Links
```tsx
// Add more social icons
socialLinks: {
  tiktok: '...',
  instagram: '...',
  telegram: '...',
  twitter: '...',
  // Add more...
}
```

## 📦 Dependencies

- `motion/react`: Animations
- `lucide-react`: Icons (X, Camera, Edit2, MessageCircle, Check, AlertCircle)
- Tailwind CSS v4: Styling

## 🐛 Troubleshooting

### Modal is clipped on mobile
- Check `max-h-[90vh]` is applied
- Ensure parent has no `overflow: hidden`
- Verify z-index is high enough

### Avatar not visible
- Check `z-index` on avatar container
- Verify negative margin `-mt-10`
- Ensure `border-4 border-white` is applied

### Close button not clickable
- Check z-index: should be `z-20` or higher
- Verify `fixed` or `absolute` positioning
- Ensure not covered by overlay

## 📝 Notes

- The old profile card code in App.tsx has been disabled with `{false && ...}`
- You can safely delete the old code block (lines 789-1253 in App.tsx)
- Custom scrollbar CSS is in `/styles/globals.css`
- Safe area padding is included for iOS devices

## 🎉 Credits

Created for the Comment Live chat application with a mobile-first, responsive design philosophy.
