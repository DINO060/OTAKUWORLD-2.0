# 📤 PublishChapter System

**Module de publication de chapitres manga/anime/webtoon pour Otaku World**

## 🎯 Vue d'ensemble

Le système PublishChapter est un wizard en 5 étapes permettant aux utilisateurs de publier du contenu sur la plateforme Comment Live.

## 🚀 Points d'entrée

1. **Bibliothèque principale** → Bouton `[+]` en haut à droite
2. **Page détaillée manga** → Bouton `[📤 Publier]` dans la section Chapitres

## 📋 Structure du Wizard

### Step 0 - Choix du mode
- **Nouvelle œuvre** : Créer une œuvre + premier chapitre
- **Œuvre existante** : Ajouter un chapitre à une œuvre déjà publiée

### Step 1 - Informations
- Titre de l'œuvre
- Numéro du chapitre
- Description (optionnel)
- Tags (max 8)
- Cover image (optionnel)

**Détections intelligentes** :
- ✅ Matching work : Bannière bleue si le titre correspond à une œuvre existante
- ❌ Duplicate chapter : Bordure rouge + erreur si chapitre déjà existant

### Step 2 - Contenu

**4 types de contenu** :

1. **📝 Texte** : Textarea pour écrire directement
2. **🖼️ Images** : Upload multiple d'images (scans manga)
3. **📄 Fichier** : Upload PDF ou CBZ unique
4. **📦 Batch** : Upload multiple de PDF/CBZ (max 20) = 20 chapitres

**Mode "add-chapter"** :
- Résumé locked en haut avec bouton Edit
- Métadonnées pré-remplies automatiquement
- Numéro auto-incrémenté

### Step 3 - Validation

Vérifications automatiques :
- ❌ Titre requis
- ❌ Numéro requis
- ❌ Chapitre doublon
- ❌ Type de contenu requis
- ❌ Contenu requis selon le type

Si **0 erreurs** → passage automatique au Step 4

### Step 4 - Publication

**États** :
1. **Ready** : 🚀 Bouton "PUBLIER" avec gradient violet
2. **Publishing** : ⏳ Animation pulse + "Publication en cours..."
3. **Batch Progress** : Barre de progression pour batch (X/N chapitres)
4. **Success** : ✅ Animation bounceIn + auto-reset après 2.5s

## 🔄 Navigation Back

| Depuis | Condition | Destination |
|--------|-----------|-------------|
| Step 0 | - | onBack() (retour catalogue) |
| Step 1 | - | Step 0 |
| Step 2 | add-chapter + locked | Step 0 |
| Step 2 | new-work | Step 1 |
| Step 3 | - | Step 2 |
| Step 4 | - | Step 3 |

## 🎨 Design

### Header Wizard
- Bouton back `←`
- Titre : "📤 Publier un chapitre"
- Sous-titre : "Étape X/5 — [Nom]"
- **Step indicators** : 5 dots (8px × 8px, 20px si actif)
  - Actif/passé : `#6c5ce7`
  - Futur : `rgba(108,92,231,0.25)`
  - Transition : 0.3s

### Composants clés
- **NewWorkCard** : Gradient violet + icône ✨
- **WorkCard** : Icône emoji + titre + stats
- **ContentTypeButton** : 4 boutons en grille 2×2
- **Upload zones** : Border dashed + hover violet
- **TagPill** : Badge avec bouton ×
- **ValidationCard** : Résumé des infos
- **ErrorBlock** : Background rouge soft
- **ProgressBar** : Height 6px, transition 0.3s

## 🔧 État du composant

```typescript
{
  // Navigation
  step: 0-4,
  mode: 'choose' | 'new-work' | 'add-chapter',
  
  // Metadata
  workTitle: string,
  chapterNumber: number,
  description: string,
  tags: string[],
  coverFile: File | null,
  coverPreview: string | null,
  
  // Content
  contentType: 'text' | 'images' | 'file' | 'batch' | null,
  textContent: string,
  imageFiles: File[],
  chapterFile: File | null,
  batchFiles: File[],
  
  // State
  metadataLocked: boolean,
  selectedWork: Work | null,
  publishing: boolean,
  publishProgress: number,
  publishDone: boolean,
  errors: string[],
  matchingWork: Work | null,
  duplicateChapter: boolean
}
```

## 💾 Backend (À implémenter avec Supabase)

### Tables requises
- `chapters` : id, title, description, chapter_number, content_type, cover_url, file_url...
- `chapter_tags` : id, chapter_id, tag
- `chapter_files` : id, chapter_id, file_url, page_number

### Storage paths
- Cover : `chapters/{chapterId}/cover.jpg`
- Pages : `chapters/{chapterId}/pages/page-1.jpg`
- Fichier : `chapters/{chapterId}/chapter.pdf`

### Timeouts
- Cover upload : 15s
- Pages/fichier upload : 60s
- DB insert : 10s

## 🎯 Prochaines étapes

1. [ ] Intégration Supabase Storage
2. [ ] Système de permissions (qui peut publier)
3. [ ] Validation côté serveur
4. [ ] Compression automatique des images
5. [ ] Preview avant publication
6. [ ] Draft system (brouillons)
7. [ ] Notifications aux followers
8. [ ] Analytics de publication

## 📝 Notes

- Version actuelle : **Frontend-only** avec mock data
- Simulation de publication : 2s (single) / 800ms par fichier (batch)
- Les œuvres existantes sont hardcodées (4 titres)
- Pas de persistance réelle pour le moment
