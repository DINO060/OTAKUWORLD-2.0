# 🚀 QUICK START - Configuration Supabase

## 📝 ÉTAPES RAPIDES (15 minutes)

### 1️⃣ Créer le projet Supabase

```bash
# 1. Aller sur https://supabase.com
# 2. Cliquer "Start your project"
# 3. Créer un nouveau projet :
#    - Name: comment-live-app
#    - Database Password: [générer un mot de passe fort]
#    - Region: choisir le plus proche (ex: Europe West)
```

### 2️⃣ Obtenir les credentials

```bash
# Dans votre projet Supabase :
# 1. Aller dans Settings → API
# 2. Copier :
#    - Project URL
#    - anon/public key
```

### 3️⃣ Configurer le projet

```bash
# Créer le fichier .env à la racine du projet
cp .env.example .env

# Éditer .env et remplacer avec vos vraies valeurs
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-anon-key
```

### 4️⃣ Exécuter le SQL

```bash
# 1. Dans Supabase → SQL Editor
# 2. Cliquer "New Query"
# 3. Copier tout le contenu de supabase-schema.sql
# 4. Coller et cliquer "Run"
# 5. Faire pareil avec supabase-anon-policy.sql
```

### 5️⃣ Activer Realtime

```bash
# Dans Supabase → Database → Replication
# Activer la réplication pour :
- live_messages
- private_messages
- chapters
```

### 6️⃣ Configurer Storage

```sql
-- Dans SQL Editor, exécuter :

-- Créer les buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('chapter-covers', 'chapter-covers', true),
  ('chapter-content', 'chapter-content', false);

-- Policies pour chapter-covers (public)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'chapter-covers');

CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chapter-covers' 
  AND auth.role() = 'authenticated'
);

-- Policies pour chapter-content (privé)
CREATE POLICY "Owner Access"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chapter-content'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### 7️⃣ Configurer Auth

```bash
# Dans Supabase → Authentication → Providers
# 1. Email : activé par défaut ✅
# 2. (Optionnel) Activer Google/GitHub OAuth
```

### 8️⃣ Tester la connexion

```bash
# Redémarrer le serveur dev
npm run dev

# Le frontend devrait maintenant se connecter à Supabase !
```

---

## 🧪 TESTER QUE TOUT FONCTIONNE

### Test 1: Connexion à Supabase
```typescript
// Ouvrir la console du navigateur (F12)
// Le message "Supabase client initialized" devrait apparaître
```

### Test 2: Créer un utilisateur
```bash
# Dans l'app :
# 1. Aller dans la page d'inscription
# 2. Créer un compte
# 3. Vérifier dans Supabase → Authentication → Users
```

### Test 3: Envoyer un message live
```bash
# Dans l'app :
# 1. Envoyer un message dans le chat
# 2. Vérifier dans Supabase → Table Editor → live_messages
```

### Test 4: Realtime fonctionne
```bash
# Ouvrir 2 onglets de l'app
# Envoyer un message dans l'un
# Le message devrait apparaître instantanément dans l'autre ✅
```

---

## ❓ TROUBLESHOOTING

### Erreur: "Invalid API key"
```bash
# Vérifier que vous avez bien copié l'anon key
# Vérifier que le fichier .env est à la racine du projet
# Redémarrer npm run dev après modification du .env
```

### Erreur: "Failed to create auth client"
```bash
# Vérifier l'URL du projet (doit commencer par https://)
# Vérifier qu'il n'y a pas d'espaces dans .env
```

### Les messages ne s'affichent pas en temps réel
```bash
# Vérifier que Realtime est activé sur la table
# Vérifier la console pour les erreurs de subscription
```

---

## 📞 SUPPORT

- Documentation: https://supabase.com/docs
- Discord: https://discord.supabase.com
- GitHub Issues: https://github.com/supabase/supabase/issues
