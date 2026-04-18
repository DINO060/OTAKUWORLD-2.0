OTAKU WORLD
Design Specification Document
Comment Live Platform
Wireframes + Specs + Figma Guidelines


Mobile-First Design
Dark + Light Mode
Février 2026

1. Vision & Overview
Otaku World est le réseau social ultime des otakus, intégré dans Comment Live. C'est un mélange de Discord (communautés/groupes), X/Twitter (feed social, posts, likes, comments), et Crunchyroll/MangaDex (streaming manga/anime).

Sections principales de la page Otaku:
•📰 Feed Social — Timeline de posts, likes, comments, reposts (style X)
•📖 Bibliothèque — Catalogue manga/anime/webtoon avec reader intégré et player vidéo
•🧠 Quiz — Créer et jouer des quiz manga/anime, classements
•💬 Groupes — Communautés thématiques style Discord (channels, rôles)

Navigation dans Otaku World:
La page Otaku utilise des TABS en haut (mobile) ou une sub-sidebar (desktop) pour naviguer entre Feed, Bibliothèque, Quiz, et Groupes. L'utilisateur reste dans la page Otaku du sidebar principal de Comment Live.
2. Design System
2.1 Couleurs
Le thème suit le design system de Comment Live avec des accents violets.

Dark Mode:
Background Primary: Dark #0c0c14  |  Light #ffffff
Background Secondary: Dark #111119  |  Light #f7f7fa
Background Tertiary: Dark #1a1a25  |  Light #eeeef3
Background Hover: Dark #1f1f2e  |  Light #e8e8ed
Background Active: Dark #262638  |  Light #dddde5
Text Primary: Dark #e8e8ed  |  Light #1a1a2e
Text Secondary: Dark #8888a0  |  Light #6b6b80
Text Muted: Dark #555570  |  Light #9999aa
Accent (violet): Dark #6c5ce7  |  Light #6c5ce7
Accent Soft: Dark rgba(108,92,231,0.12)  |  Light rgba(108,92,231,0.10)
Red (danger/notif): Dark #ef4444  |  Light #ef4444
Green (success): Dark #22c55e  |  Light #22c55e
Orange (warning): Dark #f59e0b  |  Light #f59e0b
Border: Dark rgba(255,255,255,0.06)  |  Light rgba(0,0,0,0.07)

Couleurs spécifiques Otaku:
Manga Pink: Dark #f093fb  |  Light #f093fb
Anime Blue: Dark #4facfe  |  Light #4facfe
Webtoon Green: Dark #43e97b  |  Light #43e97b
Quiz Gold: Dark #ffd200  |  Light #f7971e
2.2 Typographie
•Font principale: DM Sans (400, 500, 600, 700, 800)
•Font monospace (timer, chiffres): Space Grotesk (500, 700)
•Tailles mobile: 11px (caption), 12px (small), 13px (body), 15px (title), 18px (h2), 22px (h1)
•Tailles desktop: +2px sur chaque niveau
•Line height: 1.4 (titres), 1.5 (body), 1.6 (paragraphes longs)
2.3 Composants partagés
•Avatar: Carré arrondi (borderRadius 10-12px), gradient background, initiale ou image
•Boutons: borderRadius 10px, padding 10px 16px, font-weight 600-700
•Cards: borderRadius 14px, border 1px solid border-color, hover: translateY(-4px) + shadow
•Input: borderRadius 12px, background bg3, border 1px solid border-input
•Badge/Pill: borderRadius 20px, padding 3px 10px, fontSize 10-11px, fontWeight 600
•Tabs: Pill-shaped buttons, borderRadius 20px, active = accent color
•Bottom Sheet (mobile): borderRadius 20px 20px 0 0, drag handle en haut
2.4 Espacements
•Padding page mobile: 16px
•Padding page desktop: 20-24px
•Gap entre cards: 12px (mobile), 14px (desktop)
•Gap entre sections: 20px (mobile), 24px (desktop)
•Padding card interne: 12px
2.5 Animations
•fadeIn: opacity 0 > 1, translateY 6px > 0 (0.3s ease)
•Hover cards: translateY(-4px), box-shadow 0 8px 24px rgba(0,0,0,0.3)
•Tab switch: 0.15s ease transition
•Like button: scale bounce 1 > 1.2 > 1 (0.2s)
•Pull to refresh (mobile): rotate spinner + translateY
3. Navigation Architecture
3.1 Mobile (< 768px)
Bottom tabs fixed en bas de la page Otaku avec 4 onglets:
┌─────────────────────────────────────┐
│          [Header: Otaku World]       │
│                                      │
│          [CONTENU DE LA PAGE]         │
│                                      │
├─────────────────────────────────────┤
│  📰 Feed  │ 📖 Biblio │ 🧠 Quiz │ 💬 Grp │
└─────────────────────────────────────┘

Chaque tab a un label + icône. L'onglet actif a la couleur accent + indicator dot ou underline.
3.2 Desktop (>= 768px)
Sub-sidebar à gauche dans la zone de contenu (pas dans le sidebar principal de Comment Live):
┌──────┬──────────┬──────────────────────┐
│      │ 📰 Feed  │                       │
│ Main │ 📖 Biblio│   [CONTENU PAGE]      │
│ Side │ 🧠 Quiz  │                       │
│ bar  │ 💬 Groups│                       │
│      │          │                       │
└──────┴──────────┴──────────────────────┘
4. 📰 Feed Social
Le feed est une timeline verticale style X/Twitter mélangée avec des images style Instagram. Les utilisateurs peuvent poster du texte, des images, des liens, et partager des chapitres/épisodes.
4.1 Mobile - Feed
┌─────────────────────────────────────┐
│ Otaku World              🔔  ✏️      │
├─────────────────────────────────────┤
│ [Trending] [Following] [Latest]     │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ 🟣 Alex @alex_manga    · 2h     │ │
│ │                                  │ │
│ │ Le dernier chapitre de One Piece │ │
│ │ était INSANE!! 🔥🏴‍☠️              │ │
│ │                                  │ │
│ │ ┌──────────────────────────────┐ │ │
│ │ │     [IMAGE/PANEL MANGA]      │ │ │
│ │ │     cover du chapitre         │ │ │
│ │ └──────────────────────────────┘ │ │
│ │                                  │ │
│ │  💬 24   🔄 12   ❤️ 156   🔗    │ │
│ └─────────────────────────────────┘ │
│                                      │
│ ┌─────────────────────────────────┐ │
│ │ 🟢 Marie @marie_ht     · 45min  │ │
│ │                                  │ │
│ │ Quiz time! 🧠 Qui peut nommer   │ │
│ │ les 5 Kage dans Naruto?          │ │
│ │                                  │ │
│ │ [▶️ JOUER AU QUIZ]               │ │
│ │                                  │ │
│ │  💬 48   🔄 5    ❤️ 89    🔗    │ │
│ └─────────────────────────────────┘ │
│                                      │
│ ┌─────────────────────────────────┐ │
│ │ 🔵 Sophie @sophie_dev  · 1h     │ │
│ │                                  │ │
│ │ 📖 Nouveau chapitre publié!      │ │
│ │ Solo Leveling Ch. 201            │ │
│ │                                  │ │
│ │ ┌──────────────────────────────┐ │ │
│ │ │ ⚔️ Solo Leveling             │ │ │
│ │ │ Chapitre 201 - Final         │ │ │
│ │ │ [LIRE MAINTENANT →]          │ │ │
│ │ └──────────────────────────────┘ │ │
│ │                                  │ │
│ │  💬 156  🔄 89   ❤️ 420   🔗   │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ 📰 Feed │ 📖 Biblio │ 🧠 Quiz │ 💬 │
└─────────────────────────────────────┘
4.2 Composer un post (Bottom Sheet mobile)
┌─────────────────────────────────────┐
│ ──── (drag handle)                   │
│                                      │
│ Nouveau Post           [Publier]     │
├─────────────────────────────────────┤
│ 🟣 DINO                              │
│                                      │
│ Quoi de neuf dans le monde otaku?    │
│ |                                    │
│                                      │
│                                      │
│                                      │
├─────────────────────────────────────┤
│ 🖼️ Image  📖 Chapter  🧠 Quiz  📊 Poll │
│                                      │
│ Tags: #manga #anime #webtoon ...     │
└─────────────────────────────────────┘
4.3 Vue détaillée post + commentaires
┌─────────────────────────────────────┐
│ ← Retour                             │
├─────────────────────────────────────┤
│ 🟣 Alex @alex_manga                  │
│                                      │
│ Le dernier chapitre de One Piece     │
│ était INSANE!! 🔥🏴‍☠️                   │
│                                      │
│ [IMAGE FULL WIDTH]                   │
│                                      │
│ 14:30 · 15 Fév 2026                  │
│                                      │
│ 💬 24   🔄 12   ❤️ 156               │
├─────────────────────────────────────┤
│ COMMENTAIRES                          │
├─────────────────────────────────────┤
│ 🟢 Jean · 1h                         │
│ Tellement d'accord!! Oda est un      │
│ génie 🐐                              │
│ ❤️ 12   ↩️ Répondre                   │
│                                      │
│   🔵 Marie · 45min (réponse)         │
│   Le GOAT fr fr 🏴‍☠️                   │
│   ❤️ 5                                │
│                                      │
│ 🟡 Sophie · 30min                    │
│ Ce panel en double page... 😭         │
│ ❤️ 8   ↩️ Répondre                    │
├─────────────────────────────────────┤
│ [Avatar] Ajouter un commentaire...   │
└─────────────────────────────────────┘
4.4 Specs du Feed
Post card:
•Avatar (36px) + nom (bold 13px) + @username (12px muted) + temps relatif
•Contenu texte: 14px, line-height 1.5, max 280 caractères, expandable
•Images: borderRadius 14px, max 4 images en grille 2x2, aspect ratio préservé
•Chapter embed: Card spéciale avec icône manga, titre, bouton 'Lire'
•Quiz embed: Card spéciale avec icône quiz, question preview, bouton 'Jouer'
•Actions: 💬 Comment, 🔄 Repost, ❤️ Like, 🔗 Share — espacement égal, 12px, color muted
•Séparateur: 1px border-color entre chaque post

Tabs du feed:
•Trending: Posts les plus likés/commentés des dernières 24h
•Following: Posts des utilisateurs suivis
•Latest: Tous les posts par ordre chronologique
5. 📖 Bibliothèque
La bibliothèque est le catalogue de manga/anime/webtoon/light novel. Les utilisateurs peuvent publier des chapitres, lire en streaming, et regarder des épisodes d'anime.
5.1 Mobile - Catalogue
┌─────────────────────────────────────┐
│ 📖 Bibliothèque          🔍         │
├─────────────────────────────────────┤
│ [Manga] [Anime] [Webtoon] [LN]     │
├─────────────────────────────────────┤
│ Tendances 🔥                         │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│ │cover│ │cover│ │cover│ │cover│ →  │
│ │     │ │     │ │     │ │     │    │
│ │ ⚔️  │ │ 👹  │ │ 🏴‍☠️ │ │ 🪚  │    │
│ └─────┘ └─────┘ └─────┘ └─────┘   │
│ Solo L.  JJK    One P.  CSM        │
│                                      │
│ Dernières mises à jour 📢             │
│ ┌─────────────────────────────────┐ │
│ │ ⚔️ Solo Leveling                │ │
│ │ Ch. 201 · il y a 2h · ⭐ 4.8    │ │
│ │ par @sophie_dev                  │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 👹 Jujutsu Kaisen               │ │
│ │ Ch. 271 · il y a 5h · ⭐ 4.7    │ │
│ │ par @alex_manga                  │ │
│ └─────────────────────────────────┘ │
│                                      │
│ Tous les titres A-Z                  │
│ [Grille de cards 2 colonnes]         │
├─────────────────────────────────────┤
│ 📰 Feed │ 📖 Biblio │ 🧠 Quiz │ 💬 │
└─────────────────────────────────────┘
5.2 Page détaillée manga/anime
┌─────────────────────────────────────┐
│ ← Retour                             │
├─────────────────────────────────────┤
│ ┌────────────────────────────────┐  │
│ │                                 │  │
│ │    [BANNER / COVER IMAGE]       │  │
│ │         gradient overlay         │  │
│ │                                 │  │
│ │  ⚔️ Solo Leveling               │  │
│ │  ⭐ 4.8 · Action · 201 ch.     │  │
│ └────────────────────────────────┘  │
│                                      │
│ [❤️ Favoris] [📖 Lire Ch.1] [🔔]    │
│                                      │
│ Synopsis:                             │
│ Dans un monde où des portails...     │
│ [Voir plus]                           │
│                                      │
│ Tags: #action #fantasy #leveling     │
│                                      │
│ ── Chapitres ────────────────────    │
│                                      │
│ [Trier: Récent ▼]   [📤 Publier]    │
│                                      │
│ Ch. 201 - Final        @sophie  2h  │
│ Ch. 200 - Le combat   @alex    1j   │
│ Ch. 199 - L'armée     @jean    3j   │
│ Ch. 198 - Réveil      @marie   5j   │
│ ...                                   │
│                                      │
│ ── Commentaires (156) ────────────   │
│                                      │
│ [Section commentaires comme le feed] │
└─────────────────────────────────────┘
5.3 Manga Reader
┌─────────────────────────────────────┐
│ ← Solo Leveling Ch.201    ⚙️  📖    │
├─────────────────────────────────────┤
│                                      │
│ ┌──────────────────────────────────┐│
│ │                                   ││
│ │                                   ││
│ │      [PAGE MANGA FULL WIDTH]      ││
│ │      scroll vertical continu      ││
│ │                                   ││
│ │                                   ││
│ │                                   ││
│ └──────────────────────────────────┘│
│                                      │
│ Tap au centre = toggle header/footer  │
│                                      │
├─────────────────────────────────────┤
│ ◀ Ch.200  │  Page 5/32  │  Ch.202 ▶│
└─────────────────────────────────────┘

Reader settings (⚙️):
•Mode lecture: Vertical scroll (défaut) / Page par page / Double page (desktop)
•Qualité: Auto / HD / Data Saver
•Direction: Gauche-à-droite (webtoon) / Droite-à-gauche (manga)
•Background: Noir / Blanc / Gris
5.4 Publier un chapitre (Bottom Sheet)
┌─────────────────────────────────────┐
│ ──── (drag handle)                   │
│ Publier un chapitre     [Publier]    │
├─────────────────────────────────────┤
│ Manga: [Solo Leveling ▼]             │
│ Chapitre: [202]                       │
│ Titre: [Le nouveau monde]             │
│                                      │
│ Pages: (drag & drop)                  │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐       │
│ │ p1 │ │ p2 │ │ p3 │ │ +  │       │
│ └────┘ └────┘ └────┘ └────┘       │
│                                      │
│ ⚠️ Respectez les droits d'auteur      │
└─────────────────────────────────────┘
5.5 Specs Bibliothèque
Cover card (catalogue):
•Taille mobile: 2 colonnes, gap 12px, aspect ratio 3:4
•Taille desktop: auto-fill minmax(170px, 1fr), gap 14px
•Cover: gradient placeholder avec emoji si pas d'image
•Titre: 13px bold, 1 ligne, ellipsis
•Info: ⭐ rating + nb chapitres, 11px, color t2
•Badge status: pill 'En cours' (vert) ou 'Terminé' (violet)
•Badge genre: pill gris, 10px

Chapter list item:
•Titre chapitre (13px bold) + auteur (@username 11px muted) + temps relatif
•Hover/tap: background bgHover
•New chapter indicator: petit dot violet à gauche
6. 🧠 Quiz
Section quiz où tout le monde peut créer et jouer des quiz sur le manga, l'anime, etc. Classements, badges, et partage dans le feed.
6.1 Mobile - Liste des Quiz
┌─────────────────────────────────────┐
│ 🧠 Quiz                  [+ Créer]  │
├─────────────────────────────────────┤
│ [Populaires] [Récents] [Mes Quiz]   │
├─────────────────────────────────────┤
│ 🏆 Top joueurs cette semaine         │
│ 1. 🥇 Alex    2450 pts              │
│ 2. 🥈 DINO    2180 pts              │
│ 3. 🥉 Sophie  1920 pts              │
│                                      │
│ ── Quiz populaires ──────────────    │
│                                      │
│ ┌─────────────────────────────────┐ │
│ │ 🧠 Connais-tu les Kage?         │ │
│ │ par @marie · 10 questions       │ │
│ │ 🎯 Naruto · 👥 2.4k joueurs     │ │
│ │ ⭐⭐⭐⭐☆                        │ │
│ │                    [▶️ Jouer]    │ │
│ └─────────────────────────────────┘ │
│                                      │
│ ┌─────────────────────────────────┐ │
│ │ 🧠 Quel perso es-tu? (JJK)     │ │
│ │ par @alex · 15 questions        │ │
│ │ 🎯 JJK · 👥 1.8k joueurs        │ │
│ │ ⭐⭐⭐⭐⭐                       │ │
│ │                    [▶️ Jouer]    │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ 📰 Feed │ 📖 Biblio │ 🧠 Quiz │ 💬 │
└─────────────────────────────────────┘
6.2 Jouer un Quiz
┌─────────────────────────────────────┐
│ ← Quiz: Connais-tu les Kage?        │
├─────────────────────────────────────┤
│ Question 3/10         ⏱️ 15s         │
│ ████████░░░░░░░░░░░░  (timer bar)   │
├─────────────────────────────────────┤
│                                      │
│ Qui est le 4ème Hokage?              │
│                                      │
│ ┌─────────────────────────────────┐ │
│ │ A. Hiruzen Sarutobi             │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ B. Minato Namikaze    ✅         │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ C. Tobirama Senju               │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ D. Tsunade                       │ │
│ └─────────────────────────────────┘ │
│                                      │
│ Score: 200 pts  |  Série: 🔥 x3      │
└─────────────────────────────────────┘
6.3 Créer un Quiz
┌─────────────────────────────────────┐
│ ← Créer un Quiz        [Publier]    │
├─────────────────────────────────────┤
│ Titre: [________________________]    │
│ Catégorie: [Naruto ▼]                │
│ Cover: [📷 Ajouter image]            │
│ Timer par question: [15s ▼]          │
│                                      │
│ ── Question 1 ──────────────────    │
│ [Qui est le 4ème Hokage?        ]    │
│ A: [Hiruzen Sarutobi    ]            │
│ B: [Minato Namikaze     ] ✅ correct │
│ C: [Tobirama Senju      ]            │
│ D: [Tsunade             ]            │
│                                      │
│ [+ Ajouter une question]              │
│                                      │
│ ── Question 2 ──────────────────    │
│ [...]                                 │
└─────────────────────────────────────┘
6.4 Résultat Quiz
┌─────────────────────────────────────┐
│              🎉                       │
│         Quiz terminé!                 │
│                                      │
│      Score: 800/1000 pts              │
│      8/10 bonnes réponses             │
│                                      │
│   ┌──────────────────────────────┐   │
│   │   🏆 Tu es un OTAKU EXPERT!  │   │
│   │        Badge débloqué         │   │
│   └──────────────────────────────┘   │
│                                      │
│   Top 5% des joueurs                  │
│   Meilleur série: 🔥 x5               │
│                                      │
│   [📰 Partager]  [🔄 Rejouer]        │
│   [📊 Classement]                     │
└─────────────────────────────────────┘
6.5 Specs Quiz
•Quiz card: borderRadius 14px, padding 14px, border 1px
•Timer bar: hauteur 4px, gradient accent > rouge quand < 5s
•Réponse correcte: background vert soft, border vert, check icon
•Réponse incorrecte: background rouge soft, border rouge, X icon
•Scoring: +100 pts base, +50 bonus vitesse (< 5s), streak multiplier x2/x3/x5
•Badges: Bronze (50%), Silver (70%), Gold (90%), Diamond (100%)
7. 💬 Groupes / Communautés
Les groupes sont des mini-Discord dans Otaku World. Chaque groupe a des channels de discussion, des rôles, et un feed dédié.
7.1 Mobile - Liste des Groupes
┌─────────────────────────────────────┐
│ 💬 Groupes              [+ Créer]   │
├─────────────────────────────────────┤
│ [Découvrir] [Mes Groupes]            │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ 🏴‍☠️ One Piece Fans               │ │
│ │ 2.4k membres · 45 en ligne      │ │
│ │ Le groupe #1 des fans de OP!    │ │
│ │                     [Rejoindre]  │ │
│ └─────────────────────────────────┘ │
│                                      │
│ ┌─────────────────────────────────┐ │
│ │ 👹 JJK Theory Crafters          │ │
│ │ 890 membres · 12 en ligne       │ │
│ │ Théories et discussions JJK      │ │
│ │                     [Rejoindre]  │ │
│ └─────────────────────────────────┘ │
│                                      │
│ ┌─────────────────────────────────┐ │
│ │ 🎨 Manga Artists                │ │
│ │ 456 membres · 8 en ligne        │ │
│ │ Partagez vos créations!          │ │
│ │                     [Rejoindre]  │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ 📰 Feed │ 📖 Biblio │ 🧠 Quiz │ 💬 │
└─────────────────────────────────────┘
7.2 Vue intérieure d'un Groupe
┌─────────────────────────────────────┐
│ ← 🏴‍☠️ One Piece Fans    👥 ⚙️       │
├─────────────────────────────────────┤
│ CHANNELS                              │
│  # général           (12 new)        │
│  # théories                          │
│  # spoilers          (3 new)         │
│  # fan-art                            │
│  # off-topic                          │
├─────────────────────────────────────┤
│ # général                             │
├─────────────────────────────────────┤
│                                      │
│ 🟣 Alex · 14:30                      │
│ Yo le chapitre de cette semaine!!    │
│                                      │
│ 🟢 Marie · 14:32                     │
│ INSANE!! Le Gear 6 😱                │
│                                      │
│ 🔵 Jean · 14:35                      │
│ Oda est le GOAT, point final 🐐      │
│                                      │
├─────────────────────────────────────┤
│ [💬 Message #général...]              │
└─────────────────────────────────────┘
7.3 Créer un Groupe
┌─────────────────────────────────────┐
│ ──── (drag handle)                   │
│ Créer un Groupe         [Créer]      │
├─────────────────────────────────────┤
│ Nom: [________________________]      │
│ Description: [_________________]     │
│ Cover: [📷 Ajouter]                  │
│ Icône: [🏴‍☠️ Choisir emoji]            │
│                                      │
│ Visibilité:                           │
│ (●) Public   ( ) Privé (invitation)  │
│                                      │
│ Channels par défaut:                  │
│ ☑ # général                           │
│ ☑ # annonces                          │
│ ☐ # off-topic                         │
│ [+ Ajouter channel]                   │
└─────────────────────────────────────┘
7.4 Specs Groupes
•Group card: même style que les autres cards (14px radius, border)
•Channel list: indent 8px gauche, # prefix, badge unread count
•Messages dans channel: même composant que Global Chat (avatar, nom, temps, reactions)
•Rôles: Admin, Modérateur, Membre — couleurs distinctes sur le nom
•Limite: Max 50 channels par groupe, max 10k membres
8. Profil Utilisateur Otaku
┌─────────────────────────────────────┐
│ ┌──────────────────────────────────┐│
│ │      [BANNER IMAGE]              ││
│ │                                   ││
│ │  🟣                               ││
│ │  DINO @dino                       ││
│ └──────────────────────────────────┘│
│                                      │
│ 📊 Stats:                             │
│ 42 Posts · 156 Likes · 12 Quiz créés │
│ 🏆 Rang: Otaku Expert                │
│ 🎖️ Badges: 🥇🥈🥉💎                  │
│                                      │
│ [Posts] [Favoris] [Quiz] [Groupes]   │
│                                      │
│ [Liste des posts/favoris/etc]        │
└─────────────────────────────────────┘
9. Adaptations Desktop
Sur desktop (>= 768px), le layout change significativement:

Feed:
•Colonne centrale max-width 600px, avec sidebar droite pour trending/suggestions
•Composer un post: inline en haut du feed au lieu de bottom sheet

Bibliothèque:
•Grille: auto-fill minmax(170px, 1fr) au lieu de 2 colonnes fixes
•Reader: Option double page côte-à-côte
•Page détaillée: Layout 2 colonnes (cover + info à gauche, chapitres à droite)

Quiz:
•Cards en grille 3 colonnes au lieu de liste
•Leaderboard en sidebar droite pendant le jeu

Groupes:
•Layout 3 panneaux: channels (220px) + chat (flex) + membres (200px)
•Exactement comme Discord desktop
10. User Flows principaux

Flow 1: Lire un manga
1.Feed/Biblio > Tap sur manga card > Page détaillée > Tap chapitre > Reader

Flow 2: Poster dans le feed
2.Feed > Tap ✏️ > Bottom sheet compose > Écrire + attach > Publier

Flow 3: Jouer un quiz
3.Quiz tab > Tap quiz card > Jouer > Répondre aux questions > Résultat > Partager

Flow 4: Rejoindre un groupe
4.Groupes tab > Découvrir > Tap groupe > Rejoindre > Channel #général

Flow 5: Publier un chapitre
5.Biblio > Page manga > 📤 Publier > Upload pages > Titre > Publier
11. Instructions Figma

Organisation des frames:
•1 page par section (Feed, Bibliothèque, Quiz, Groupes, Profil)
•Frame mobile: 390 x 844 (iPhone 14)
•Frame desktop: 1440 x 900
•Nommer les frames: 'Mobile/Feed/Timeline', 'Desktop/Feed/Timeline', etc.

Auto Layout:
•Utiliser Auto Layout partout pour le responsive
•Cards: padding 12px, gap 8px, fill container
•Listes: direction verticale, gap 8px/12px

Composants à créer en premier:
•PostCard (avec variantes: text only, image, chapter embed, quiz embed)
•MangaCard (cover + info)
•QuizCard (titre + meta + bouton)
•GroupCard (icône + info + bouton join)
•CommentItem (avatar + text + actions)
•ChapterListItem (titre + auteur + temps)
•BottomTab (icône + label, état actif/inactif)
•BottomSheet (drag handle + contenu)
•PillTab (actif/inactif)
•Avatar (tailles: 24, 32, 36, 44)
•Badge/Pill (status, genre, role)

Variables Figma (pour dark/light toggle):
•Créer une collection 'Theme' avec modes 'Dark' et 'Light'
•Ajouter toutes les couleurs du section 2.1 comme variables
•Appliquer les variables aux composants pour switch automatique