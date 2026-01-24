# Quick Test Guide - Refined Profile Card

## 🚀 Quick Start

### Test with Demo Page (30 seconds)

1. **Open `/App.tsx`** and scroll to the bottom

2. **Temporarily add** (at the very bottom):
```tsx
// TEMP: Testing ProfileCard
import Demo from './Demo';
export { default } from './Demo';
```

3. **Comment out** the original export:
```tsx
// export default function App() { ... }
```

4. **Refresh browser** → You'll see the demo landing page

5. **Click buttons**:
   - "My Profile" → Owner variant (with Edit Profile)
   - "User Profile" → User variant (with Message button)
   - "Private Chat" → Private chat UI

6. **Test responsiveness**:
   - Resize browser window
   - Open DevTools → Device toolbar (Ctrl+Shift+M)
   - Test iPhone 12, iPad, Desktop

7. **When done**, restore original App.tsx export

---

## ✅ What to Check

### Visual Balance
- [ ] Modal feels **compact** (not oversized)
- [ ] Cover is a **background layer** (not a solid block)
- [ ] Avatar **clearly sits on top** of cover
- [ ] Social icons are **subtle** (not dominant)
- [ ] Buttons are **balanced** (not overwhelming)
- [ ] Typography feels **refined** (not bulky)
- [ ] Overall feel: **clean and lightweight**

### Sizing
- [ ] Modal width: ~380px desktop, ~324-360px mobile
- [ ] Cover height: 80px (small, background-like)
- [ ] Avatar: 56px (layered on top)
- [ ] Social icons: ~32-36px (subtle)
- [ ] Buttons: ~28px height (compact)
- [ ] Close button: 28px (small, minimal)

### Responsiveness
- [ ] Mobile: bottom sheet with rounded top corners
- [ ] Desktop: centered modal, fully rounded
- [ ] Always has margins (never touches screen edges)
- [ ] max-h-[82vh] prevents overflow
- [ ] Internal scrolling works if content is long
- [ ] Background doesn't scroll when modal is open

### Edit Mode (My Profile only)
- [ ] Click "Edit Profile" → enters edit mode
- [ ] Display name becomes input (15px font)
- [ ] Pronouns input appears (12px font)
- [ ] Bio becomes textarea (12px font)
- [ ] "Change Cover" button appears (tiny, 10px)
- [ ] Camera icon on avatar (tiny, w-2 h-2)
- [ ] Tap social icon → link edit modal
- [ ] Enter URL → Save → link updates
- [ ] Cancel → exits edit mode

### User Profile (Other User)
- [ ] Same visual layout as "My Profile"
- [ ] NO "Edit Profile" button
- [ ] Shows "Message" button instead
- [ ] Click "Message" → opens private chat
- [ ] Social icons open URLs (not editable)

### Cover & Avatar Structure
- [ ] Cover feels like a **layer**, not a block
- [ ] Avatar has clear **border** (3px white)
- [ ] Avatar has subtle **shadow** (not heavy)
- [ ] Avatar overlap is **clear** (-28px)
- [ ] No ring on avatar (cleaner look)
- [ ] Decorative shapes are subtle (not distracting)

### Typography
- [ ] Display name: 15px, semibold
- [ ] Status: 12px, gray-500
- [ ] Badge: 10px, orange-800
- [ ] Bio: 12px, leading-relaxed
- [ ] Social label: 10px, uppercase
- [ ] All text is **readable** (not too small)
- [ ] Hierarchy is **clear** (name > status > badge > bio)

### Spacing
- [ ] Horizontal padding: 14px (px-3.5)
- [ ] Vertical spacing: 4-10px (tight but readable)
- [ ] Social grid gap: 6px (compact)
- [ ] Button gap: 6px (clean)
- [ ] No excessive whitespace
- [ ] Everything feels **intentional**

---

## 🎯 Key Comparisons

### Before vs After

| Element | Before | After | Better? |
|---------|--------|-------|---------|
| Modal feel | Oversized, zoomed | Compact, refined | ✅ |
| Cover | Solid block | Background layer | ✅ |
| Avatar | Competing | Layered on top | ✅ |
| Social icons | Dominant | Subtle, secondary | ✅ |
| Buttons | Overwhelming | Balanced | ✅ |
| Typography | Bulky | Refined | ✅ |
| Spacing | Excessive | Tight, intentional | ✅ |

---

## 📱 Device Tests (Quick)

### iPhone 12 (390 x 844)
- [ ] Modal width: ~360px (fits nicely)
- [ ] Bottom sheet style
- [ ] Rounded top corners
- [ ] 15px margins each side
- [ ] No clipping

### iPad (768 x 1024)
- [ ] Modal width: 380px
- [ ] Centered perfectly
- [ ] Fully rounded corners
- [ ] Plenty of margin
- [ ] Clean appearance

### Desktop 1920 x 1080
- [ ] Modal width: 380px
- [ ] Centered in viewport
- [ ] Fully rounded
- [ ] Massive margins
- [ ] Professional look

---

## 🐛 Bug Check

### Common Issues
- [ ] Modal too wide? → Should be 380px max
- [ ] Cover too tall? → Should be 80px
- [ ] Avatar hidden? → Should be -28px overlap, clearly visible
- [ ] Icons too big? → Should be 14px (w-3.5 h-3.5)
- [ ] Buttons too tall? → Should be ~28px
- [ ] Background scrolls? → Should be locked when modal open
- [ ] Modal clipped? → max-h-[82vh] should prevent this

### Visual Issues
- [ ] Cover feels blocky? → Should feel like a layer
- [ ] Avatar competes with cover? → Should sit clearly on top
- [ ] Social icons dominate? → Should be subtle
- [ ] Typography too big? → Most should be 10-12px
- [ ] Spacing excessive? → Should feel tight and modern

---

## ✨ Success Criteria

✅ **The modal should feel:**
- Clean (minimal, intentional)
- Lightweight (nothing oversized)
- Well-structured (clear hierarchy)
- Visually balanced (everything proportionate)
- Modern (refined, professional)
- Responsive (adapts naturally, not zoomed)

✅ **Specific goals:**
- Cover is a background layer ✓
- Avatar sits on top ✓
- Social icons are subtle ✓
- Buttons are compact ✓
- Typography is refined ✓
- Spacing is intentional ✓

---

## 🔄 Restore App

When done testing:

1. Remove the temp lines from `/App.tsx`:
```tsx
// Delete these:
import Demo from './Demo';
export { default } from './Demo';
```

2. Uncomment the original export:
```tsx
export default function App() { ... }
```

3. Refresh browser → Back to Comment Live app

---

## 📸 Screenshot Checklist

Take screenshots of:
- [ ] My Profile (view mode)
- [ ] My Profile (edit mode)
- [ ] User Profile
- [ ] Mobile view (iPhone 12)
- [ ] Desktop view (1920x1080)
- [ ] Social icons closeup
- [ ] Cover + avatar structure

---

## 🎉 Done!

If everything looks **clean, lightweight, and well-balanced**, the ProfileCard is ready for production! 🚀

**Total test time: 3-5 minutes**
