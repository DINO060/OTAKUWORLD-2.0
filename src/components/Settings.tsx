import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Sun,
  Moon,
  Monitor,
  Eye,
  EyeOff,
  Sparkles,
  User,
  LogOut,
  Loader2,
  Mail,
  Lock,
  Pencil,
  Check,
  X,
  ChevronDown,
  KeyRound,
  Camera,
  MessageCircle,
  ShieldCheck,
  Info,
  Globe,
  Send,
  Megaphone,
  MessageSquare,
  FileText,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { validateAvatar } from '../lib/fileValidation';
import FeedbackModal from './FeedbackModal';

interface SettingsProps {
  onBack: () => void;
  onAdminClick?: () => void;
}

type Theme = 'light' | 'dark' | 'system';
type MatureContent = 'show' | 'blur' | 'hide';

interface UserSettings {
  theme: Theme;
  matureContent: MatureContent;
}

const defaultSettings: UserSettings = {
  theme: 'dark',
  matureContent: 'blur',
};

const loadSettings = (): UserSettings => {
  try {
    const saved = localStorage.getItem('user_settings');
    if (saved) return { ...defaultSettings, ...JSON.parse(saved) };
  } catch { /* ignore */ }
  return defaultSettings;
};

export default function Settings({ onBack, onAdminClick }: SettingsProps) {
  const { user, profile, isAuthenticated, signOut, updateProfile } = useAuth();
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [settings, setSettings] = useState<UserSettings>(loadSettings);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Avatar upload
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Privacy: allow DMs toggle
  const [allowDms, setAllowDms] = useState<boolean>(profile?.allowDms !== false);
  const [dmsSaving, setDmsSaving] = useState(false);

  // Content filter: mature content preference (synced with DB)
  const [matureFilter, setMatureFilter] = useState<MatureContent>(
    (profile?.matureFilter as MatureContent) || settings.matureContent
  );
  const [matureFilterSaving, setMatureFilterSaving] = useState(false);

  // Sync with profile when it loads
  useEffect(() => {
    if (profile) setAllowDms(profile.allowDms !== false);
  }, [profile?.allowDms]);

  useEffect(() => {
    if (profile?.matureFilter) setMatureFilter(profile.matureFilter as MatureContent);
  }, [profile?.matureFilter]);

  const handleToggleDms = async () => {
    const next = !allowDms;
    setAllowDms(next);
    setDmsSaving(true);
    await updateProfile({ allowDms: next });
    setDmsSaving(false);
  };

  const handleMatureFilterChange = async (value: MatureContent) => {
    setMatureFilter(value);
    updateSetting('matureContent', value); // also keep localStorage in sync
    if (isAuthenticated) {
      setMatureFilterSaving(true);
      await updateProfile({ matureFilter: value });
      setMatureFilterSaving(false);
    }
  };

  // Account edit panels
  const [editPanel, setEditPanel] = useState<'profile' | 'email' | null>(null);
  const [legalPage, setLegalPage] = useState<'terms' | 'privacy' | null>(null);

  // Profile edit
  const [editName, setEditName] = useState('');
  const [editHandle, setEditHandle] = useState('');
  const [editBio, setEditBio] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Email change
  const [newEmail, setNewEmail] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Password reset
  const [passwordResetSaving, setPasswordResetSaving] = useState(false);
  const [passwordResetMsg, setPasswordResetMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    localStorage.setItem('user_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const root = document.documentElement;
    // Always force dark — light mode not fully supported (hardcoded dark colors in OtakuWorld)
    root.classList.add('dark');
  }, [settings.theme]);

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try { await signOut(); onBack(); } catch { /* ignore */ } finally { setIsSigningOut(false); }
  };

  const openPanel = (panel: typeof editPanel) => {
    setEditPanel(prev => prev === panel ? null : panel);
    setProfileMsg(null); setEmailMsg(null);
    if (panel === 'profile') {
      setEditName(profile?.username || '');
      setEditHandle(profile?.handle || '');
      setEditBio(profile?.bio || '');
    }
    if (panel === 'email') setNewEmail('');
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) return;
    setProfileSaving(true);
    setProfileMsg(null);

    // Check handle uniqueness if changed
    const cleanHandle = editHandle.trim().replace(/^@/, '').replace(/[^a-z0-9_]/gi, '').toLowerCase();
    if (cleanHandle && cleanHandle !== (profile?.handle || '')) {
      const { data: taken } = await supabase
        .from('profiles')
        .select('id')
        .eq('handle', cleanHandle)
        .neq('id', user!.id)
        .maybeSingle();
      if (taken) {
        setProfileSaving(false);
        setProfileMsg({ ok: false, text: `@${cleanHandle} est déjà pris` });
        return;
      }
    }

    const { error } = await updateProfile({
      username: editName.trim(),
      handle: cleanHandle || undefined,
      bio: editBio,
    });
    setProfileSaving(false);
    setProfileMsg(error ? { ok: false, text: error } : { ok: true, text: 'Profil mis à jour !' });
    if (!error) setTimeout(() => { setEditPanel(null); setProfileMsg(null); }, 1500);
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim()) return;
    setEmailSaving(true);
    setEmailMsg(null);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setEmailSaving(false);
    setEmailMsg(error ? { ok: false, text: error.message } : { ok: true, text: 'Email de confirmation envoyé à ' + newEmail });
    if (!error) setTimeout(() => { setEditPanel(null); setEmailMsg(null); setNewEmail(''); }, 3000);
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setPasswordResetSaving(true);
    setPasswordResetMsg(null);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email);
    setPasswordResetSaving(false);
    setPasswordResetMsg(error
      ? { ok: false, text: error.message }
      : { ok: true, text: `Lien envoyé à ${user.email}` }
    );
    if (!error) setTimeout(() => setPasswordResetMsg(null), 4000);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const validation = await validateAvatar(file);
    if (!validation.ok) {
      setAvatarMsg({ ok: false, text: validation.error! });
      e.target.value = '';
      return;
    }

    setAvatarUploading(true);
    setAvatarMsg(null);

    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `avatars/${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('chapters')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('chapters').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      const { error: profileError } = await updateProfile({ avatarImage: publicUrl });
      if (profileError) throw new Error(profileError);

      setAvatarMsg({ ok: true, text: 'Avatar updated!' });
      setTimeout(() => setAvatarMsg(null), 2000);
    } catch (err: any) {
      setAvatarMsg({ ok: false, text: err.message || 'Upload failed' });
    } finally {
      setAvatarUploading(false);
      // Reset file input so same file can be re-selected
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  // ── Sub-components ──

  const SectionHeader = ({ icon: Icon, title }: { icon: typeof Sun; title: string }) => (
    <div className="flex items-center gap-2 px-4 py-3 bg-card border-b border-border">
      <Icon className="w-4 h-4 text-purple-500" />
      <span className="text-sm font-semibold text-foreground">{title}</span>
    </div>
  );

  const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-purple-600' : 'bg-secondary'}`}
    >
      <motion.div
        animate={{ x: enabled ? 20 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md"
      />
    </button>
  );

  const RadioOption = ({ selected, label, icon: Icon, onClick }: { selected: boolean; label: string; icon?: typeof Sun; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${selected ? 'bg-purple-600 text-white' : 'bg-secondary text-muted-foreground hover:bg-accent'}`}
    >
      {Icon && <Icon className="w-4 h-4" />}
      <span className="text-xs font-medium">{label}</span>
      {selected && <Check className="w-3 h-3 ml-1" />}
    </button>
  );

  const AccountRow = ({ icon: Icon, label, panel }: { icon: typeof Mail; label: string; panel: 'profile' | 'email' }) => (
    <button
      onClick={() => openPanel(panel)}
      className="flex items-center justify-between w-full px-4 py-3 bg-background hover:bg-card transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <motion.div animate={{ rotate: editPanel === panel ? 180 : 0 }} transition={{ duration: 0.2 }}>
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </motion.div>
    </button>
  );

  const Feedback = ({ msg }: { msg: { ok: boolean; text: string } | null }) =>
    msg ? (
      <p className={`text-xs mt-1.5 flex items-center gap-1 ${msg.ok ? 'text-green-400' : 'text-red-400'}`}>
        {msg.ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
        {msg.text}
      </p>
    ) : null;

  // ── Legal Pages ──────────────────────────────────────────────────────
  if (legalPage) {
    const isTerms = legalPage === 'terms';
    return (
      <div className="h-full flex flex-col bg-background overflow-y-auto">
        <header className="flex-shrink-0 bg-card border-b border-border px-4 py-4">
          <div className="flex items-center gap-3">
            <motion.button onClick={() => setLegalPage(null)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-10 h-10 bg-secondary hover:bg-accent rounded-xl flex items-center justify-center transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </motion.button>
            <h1 className="text-xl font-bold text-foreground">{isTerms ? "Conditions d'utilisation" : 'Politique de confidentialité'}</h1>
          </div>
        </header>
        <div className="flex-1 p-4 sm:p-6 max-w-3xl mx-auto w-full">
          <div className="prose prose-invert prose-sm max-w-none space-y-4">
            <p className="text-muted-foreground text-xs">Dernière mise à jour : 19 mars 2026</p>
            {isTerms ? (
              <>
                <section className="space-y-2">
                  <h2 className="text-lg font-bold text-foreground">1. Acceptation des conditions</h2>
                  <p className="text-sm text-muted-foreground">En accédant et en utilisant Comment Live (ci-après « la Plateforme »), vous acceptez d'être lié par les présentes conditions d'utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser la Plateforme.</p>
                </section>
                <section className="space-y-2">
                  <h2 className="text-lg font-bold text-foreground">2. Description du service</h2>
                  <p className="text-sm text-muted-foreground">Comment Live est une plateforme communautaire permettant de :</p>
                  <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                    <li>Participer à un chat en direct public</li>
                    <li>Envoyer et recevoir des messages privés</li>
                    <li>Publier et lire des chapitres de mangas/webtoons (PDF, CBZ, images)</li>
                    <li>Participer à des quiz et des jeux (Loup-Garou)</li>
                    <li>Interagir via le feed social OtakuWorld</li>
                  </ul>
                </section>
                <section className="space-y-2">
                  <h2 className="text-lg font-bold text-foreground">3. Inscription et compte</h2>
                  <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                    <li>Vous devez fournir une adresse e-mail valide pour créer un compte.</li>
                    <li>Vous êtes responsable de la confidentialité de vos identifiants de connexion.</li>
                    <li>Un seul compte par personne est autorisé.</li>
                    <li>Les comptes créés dans le but de nuire ou de contourner un ban seront supprimés.</li>
                  </ul>
                </section>
                <section className="space-y-2">
                  <h2 className="text-lg font-bold text-foreground">4. Règles de conduite</h2>
                  <p className="text-sm text-muted-foreground">Il est interdit de :</p>
                  <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                    <li>Publier du contenu illégal, diffamatoire, harcelant ou menaçant</li>
                    <li>Partager du contenu à caractère sexuel impliquant des mineurs</li>
                    <li>Usurper l'identité d'un autre utilisateur</li>
                    <li>Spammer ou inonder le chat de messages répétitifs</li>
                    <li>Tenter de pirater, exploiter ou perturber le fonctionnement de la Plateforme</li>
                    <li>Publier des liens malveillants ou du contenu trompeur</li>
                    <li>Contourner les bans ou restrictions imposées par les administrateurs</li>
                  </ul>
                </section>
                <section className="space-y-2">
                  <h2 className="text-lg font-bold text-foreground">5. Contenu utilisateur</h2>
                  <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                    <li>Vous conservez la propriété du contenu que vous publiez (messages, chapitres, images).</li>
                    <li>En publiant du contenu, vous accordez à Comment Live une licence non exclusive pour l'afficher sur la Plateforme.</li>
                    <li>Le contenu marqué 16+ ou 18+ doit être correctement classifié par l'auteur.</li>
                    <li>Les administrateurs se réservent le droit de supprimer tout contenu enfreignant ces conditions.</li>
                  </ul>
                </section>
                <section className="space-y-2">
                  <h2 className="text-lg font-bold text-foreground">6. Propriété intellectuelle</h2>
                  <p className="text-sm text-muted-foreground">Les utilisateurs publiant des chapitres de mangas/webtoons doivent être les auteurs originaux ou détenir les droits de publication. Le partage de contenu protégé par le droit d'auteur sans autorisation est interdit et entraînera la suppression du contenu et potentiellement du compte.</p>
                </section>
                <section className="space-y-2">
                  <h2 className="text-lg font-bold text-foreground">7. Modération et sanctions</h2>
                  <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                    <li>Les administrateurs peuvent avertir, suspendre temporairement ou bannir définitivement un utilisateur.</li>
                    <li>Les signalements sont examinés par l'équipe de modération.</li>
                    <li>Les décisions de modération sont prises à la discrétion de l'équipe et sont définitives.</li>
                  </ul>
                </section>
                <section className="space-y-2">
                  <h2 className="text-lg font-bold text-foreground">8. Limitation de responsabilité</h2>
                  <p className="text-sm text-muted-foreground">La Plateforme est fournie « en l'état ». Comment Live ne garantit pas la disponibilité permanente du service et ne peut être tenu responsable des pertes de données, interruptions de service ou dommages résultant de l'utilisation de la Plateforme.</p>
                </section>
                <section className="space-y-2">
                  <h2 className="text-lg font-bold text-foreground">9. Modifications</h2>
                  <p className="text-sm text-muted-foreground">Nous nous réservons le droit de modifier ces conditions à tout moment. Les utilisateurs seront notifiés des changements significatifs. L'utilisation continue de la Plateforme après modification vaut acceptation des nouvelles conditions.</p>
                </section>
                <section className="space-y-2">
                  <h2 className="text-lg font-bold text-foreground">10. Contact</h2>
                  <p className="text-sm text-muted-foreground">Pour toute question concernant ces conditions, utilisez la fonctionnalité « Envoyer un feedback » dans les paramètres ou contactez l'équipe via le Discord de la communauté.</p>
                </section>
              </>
            ) : (
              <>
                <section className="space-y-2">
                  <h2 className="text-lg font-bold text-foreground">1. Introduction</h2>
                  <p className="text-sm text-muted-foreground">Comment Live (« nous », « notre ») s'engage à protéger la vie privée de ses utilisateurs. Cette politique explique quelles données nous collectons, comment nous les utilisons et quels sont vos droits.</p>
                </section>
                <section className="space-y-2">
                  <h2 className="text-lg font-bold text-foreground">2. Données collectées</h2>
                  <p className="text-sm font-semibold text-foreground mt-2">Données fournies par l'utilisateur :</p>
                  <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                    <li>Adresse e-mail (inscription)</li>
                    <li>Nom d'utilisateur et @handle</li>
                    <li>Photo de profil (avatar)</li>
                    <li>Biographie</li>
                    <li>Messages publics et privés</li>
                    <li>Chapitres publiés (textes, images, PDF, CBZ)</li>
                  </ul>
                  <p className="text-sm font-semibold text-foreground mt-2">Données collectées automatiquement :</p>
                  <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                    <li>Statut de connexion (en ligne / hors ligne)</li>
                    <li>Date de création du compte</li>
                    <li>Statistiques d'utilisation (nombre de vues, likes)</li>
                  </ul>
                </section>
                <section className="space-y-2">
                  <h2 className="text-lg font-bold text-foreground">3. Utilisation des données</h2>
                  <p className="text-sm text-muted-foreground">Vos données sont utilisées pour :</p>
                  <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                    <li>Fournir et améliorer les services de la Plateforme</li>
                    <li>Gérer votre compte et authentification</li>
                    <li>Afficher votre profil public aux autres utilisateurs</li>
                    <li>Permettre la messagerie privée entre utilisateurs</li>
                    <li>Modérer le contenu et assurer la sécurité de la communauté</li>
                    <li>Générer des statistiques anonymisées d'utilisation</li>
                  </ul>
                </section>
                <section className="space-y-2">
                  <h2 className="text-lg font-bold text-foreground">4. Stockage et sécurité</h2>
                  <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                    <li>Les données sont stockées sur les serveurs Supabase (infrastructure cloud sécurisée).</li>
                    <li>Les fichiers (images, PDF, CBZ) sont stockés sur Supabase Storage et/ou Cloudflare R2.</li>
                    <li>Les mots de passe sont hachés et ne sont jamais stockés en clair.</li>
                    <li>Les communications avec les serveurs sont chiffrées via HTTPS/TLS.</li>
                    <li>L'accès aux données est protégé par des politiques de sécurité au niveau des lignes (RLS).</li>
                  </ul>
                </section>
                <section className="space-y-2">
                  <h2 className="text-lg font-bold text-foreground">5. Partage des données</h2>
                  <p className="text-sm text-muted-foreground">Nous ne vendons jamais vos données personnelles. Vos données peuvent être partagées avec :</p>
                  <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                    <li><strong>Supabase</strong> — hébergement de la base de données et authentification</li>
                    <li><strong>Cloudflare</strong> — stockage de fichiers et CDN</li>
                    <li><strong>Tenor/GIPHY</strong> — recherche de GIFs (aucune donnée personnelle transmise)</li>
                    <li><strong>Autorités légales</strong> — uniquement en cas d'obligation légale</li>
                  </ul>
                </section>
                <section className="space-y-2">
                  <h2 className="text-lg font-bold text-foreground">6. Vos droits</h2>
                  <p className="text-sm text-muted-foreground">Conformément au RGPD et aux réglementations applicables, vous disposez des droits suivants :</p>
                  <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                    <li><strong>Accès</strong> — consulter les données que nous détenons sur vous</li>
                    <li><strong>Rectification</strong> — modifier vos informations personnelles via les paramètres</li>
                    <li><strong>Suppression</strong> — demander la suppression de votre compte et données associées</li>
                    <li><strong>Portabilité</strong> — demander une copie de vos données dans un format standard</li>
                    <li><strong>Opposition</strong> — vous opposer au traitement de vos données</li>
                  </ul>
                  <p className="text-sm text-muted-foreground">Pour exercer ces droits, contactez-nous via le système de feedback ou le Discord communautaire.</p>
                </section>
                <section className="space-y-2">
                  <h2 className="text-lg font-bold text-foreground">7. Cookies et stockage local</h2>
                  <p className="text-sm text-muted-foreground">La Plateforme utilise le localStorage du navigateur pour stocker :</p>
                  <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                    <li>Vos préférences (thème, filtre de contenu mature)</li>
                    <li>Votre session d'authentification (gérée par Supabase)</li>
                  </ul>
                  <p className="text-sm text-muted-foreground">Aucun cookie tiers de tracking n'est utilisé.</p>
                </section>
                <section className="space-y-2">
                  <h2 className="text-lg font-bold text-foreground">8. Contenu des mineurs</h2>
                  <p className="text-sm text-muted-foreground">La Plateforme n'est pas destinée aux enfants de moins de 13 ans. Si nous apprenons qu'un enfant de moins de 13 ans a créé un compte, celui-ci sera supprimé.</p>
                </section>
                <section className="space-y-2">
                  <h2 className="text-lg font-bold text-foreground">9. Modifications</h2>
                  <p className="text-sm text-muted-foreground">Cette politique peut être mise à jour. La date de dernière modification est indiquée en haut de cette page. Nous vous encourageons à la consulter régulièrement.</p>
                </section>
                <section className="space-y-2">
                  <h2 className="text-lg font-bold text-foreground">10. Contact</h2>
                  <p className="text-sm text-muted-foreground">Pour toute question relative à la confidentialité de vos données, utilisez la fonctionnalité « Envoyer un feedback » dans les paramètres.</p>
                </section>
              </>
            )}
          </div>
          <div className="h-8" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background overflow-y-auto">
      {/* Header */}
      <header className="flex-shrink-0 bg-card border-b border-border px-4 py-4">
        <div className="flex items-center gap-3">
          <motion.button
            onClick={onBack}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 bg-secondary hover:bg-accent rounded-xl flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </motion.button>
          <h1 className="text-xl font-bold text-foreground">Settings</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-8">

        {/* ══════════ ACCOUNT ══════════ */}
        <SectionHeader icon={User} title="Compte" />

        {isAuthenticated ? (
          <>
            {/* Hidden file input for avatar */}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />

            {/* User Info */}
            <div className="px-4 py-4 bg-background">
              <div className="flex items-center gap-4">
                {/* Avatar — click to upload */}
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="relative flex-shrink-0 group"
                  title="Change avatar"
                >
                  {profile?.avatarImage ? (
                    <img
                      src={profile.avatarImage}
                      alt="avatar"
                      className="w-14 h-14 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold"
                      style={{ backgroundColor: profile?.avatarColor || '#7c3aed' }}
                    >
                      {profile?.username?.slice(0, 2).toUpperCase() || 'U'}
                    </div>
                  )}
                  {/* Camera overlay */}
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {avatarUploading
                      ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                      : <Camera className="w-5 h-5 text-white" />}
                  </div>
                </button>

                <div className="flex-1 min-w-0">
                  <h3 className="text-foreground font-semibold text-base truncate">{profile?.username || 'User'}</h3>
                  <p className="text-purple-400/80 text-xs font-medium truncate">@{profile?.handle || profile?.username}</p>
                  {profile?.bio && (
                    <p className="text-muted-foreground text-xs truncate mt-0.5">{profile.bio}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1">
                    <p className="text-muted-foreground text-xs truncate">{user?.email || 'No email'}</p>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-xs text-green-500">Connecté</span>
                  </div>
                  {avatarMsg && (
                    <p className={`text-xs mt-1 flex items-center gap-1 ${avatarMsg.ok ? 'text-green-400' : 'text-red-400'}`}>
                      {avatarMsg.ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      {avatarMsg.text}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Edit Profile */}
            <AccountRow icon={Pencil} label="Modifier le profil" panel="profile" />
            <AnimatePresence>
              {editPanel === 'profile' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden bg-card border-t border-border"
                >
                  <div className="px-4 py-3 space-y-2">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Nom d'affichage</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        maxLength={30}
                        placeholder="Ton nom visible dans le chat"
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">@Username <span className="text-purple-400">(unique)</span></label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                        <input
                          type="text"
                          value={editHandle}
                          onChange={e => setEditHandle(e.target.value.replace(/^@/, '').replace(/[^a-z0-9_]/gi, '').toLowerCase())}
                          maxLength={20}
                          placeholder="ton_username"
                          className="w-full bg-background border border-border rounded-lg pl-7 pr-3 py-2 text-sm text-foreground focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Lettres, chiffres et _ uniquement. Permet d'être trouvé par @mention.</p>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Bio</label>
                      <textarea
                        value={editBio}
                        onChange={e => setEditBio(e.target.value)}
                        maxLength={200}
                        rows={2}
                        placeholder="Parle de toi..."
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-purple-500 resize-none"
                      />
                    </div>
                    <Feedback msg={profileMsg} />
                    <button
                      onClick={handleSaveProfile}
                      disabled={profileSaving}
                      className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      {profileSaving ? 'Sauvegarde...' : 'Enregistrer'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="border-t border-border" />

            {/* Sign Out */}
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="flex items-center justify-between w-full px-4 py-3 bg-background hover:bg-red-500/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <LogOut className="w-4 h-4 text-red-500" />
                </div>
                <span className="text-sm text-red-500 font-medium">Déconnexion</span>
              </div>
              {isSigningOut && <Loader2 className="w-4 h-4 text-red-500 animate-spin" />}
            </button>
          </>
        ) : (
          <div className="px-4 py-6 bg-background text-center">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-3">
              <User className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm mb-1">Non connecté</p>
            <p className="text-muted-foreground/60 text-xs">Connecte-toi pour accéder à toutes les fonctionnalités</p>
          </div>
        )}

        <div className="h-4" />

        {/* ══════════ SECURITY ══════════ */}
        {isAuthenticated && (
          <>
            <SectionHeader icon={KeyRound} title="Sécurité" />

            {/* Change Email */}
            <AccountRow icon={Mail} label="Changer l'email" panel="email" />
            <AnimatePresence>
              {editPanel === 'email' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden bg-card border-t border-border"
                >
                  <div className="px-4 py-3 space-y-2">
                    <p className="text-xs text-muted-foreground">Actuel : <span className="text-foreground">{user?.email}</span></p>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      placeholder="Nouvelle adresse email"
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-purple-500"
                    />
                    <Feedback msg={emailMsg} />
                    <button
                      onClick={handleChangeEmail}
                      disabled={emailSaving || !newEmail.trim()}
                      className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      {emailSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                      {emailSaving ? 'Envoi...' : 'Modifier l\'email'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>


            <div className="border-t border-border" />

            {/* Password Reset */}
            <div className="flex items-center justify-between px-4 py-3 bg-background">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center">
                  <KeyRound className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-foreground">Réinitialiser le mot de passe</p>
                  <p className="text-xs text-muted-foreground">Un lien sera envoyé par email</p>
                  {passwordResetMsg && (
                    <p className={`text-xs mt-0.5 flex items-center gap-1 ${passwordResetMsg.ok ? 'text-green-400' : 'text-red-400'}`}>
                      {passwordResetMsg.ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      {passwordResetMsg.text}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handlePasswordReset}
                disabled={passwordResetSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-accent rounded-lg text-xs font-medium text-foreground transition-colors disabled:opacity-50 flex-shrink-0"
              >
                {passwordResetSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lock className="w-3 h-3" />}
                {passwordResetSaving ? '...' : 'Envoyer'}
              </button>
            </div>

            <div className="h-4" />
          </>
        )}

        {/* ══════════ PRIVACY ══════════ */}
        {isAuthenticated && (
          <>
            <SectionHeader icon={ShieldCheck} title="Confidentialité" />
            <div className="flex items-center justify-between px-4 py-3 bg-background">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-foreground">Accepter les messages privés</p>
                  <p className="text-xs text-muted-foreground">Les autres users peuvent vous envoyer des DMs</p>
                </div>
              </div>
              <button
                onClick={handleToggleDms}
                disabled={dmsSaving}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                  allowDms ? 'bg-purple-600' : 'bg-secondary border border-border'
                } ${dmsSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                    allowDms ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <div className="h-4" />
          </>
        )}

        {/* ══════════ APPEARANCE ══════════ */}
        <SectionHeader icon={Sparkles} title="Apparence" />

        <div className="flex items-center justify-between px-4 py-3 bg-background">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center">
              <Sun className="w-4 h-4 text-muted-foreground" />
            </div>
            <span className="text-sm text-foreground">Thème</span>
          </div>
          <div className="flex gap-2">
            <RadioOption selected={settings.theme === 'dark'} label="Sombre" icon={Moon} onClick={() => updateSetting('theme', 'dark')} />
            <RadioOption selected={settings.theme === 'system'} label="Système" icon={Monitor} onClick={() => updateSetting('theme', 'system')} />
          </div>
        </div>

        <div className="h-4" />

        {/* ══════════ CONTENT ══════════ */}
        <SectionHeader icon={Eye} title="Contenu" />

        <div className="flex items-center justify-between px-4 py-3 bg-background">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center">
              <EyeOff className="w-4 h-4 text-muted-foreground" />
            </div>
            <span className="text-sm text-foreground">Contenu mature</span>
          </div>
          <div className="flex gap-2">
            <RadioOption selected={matureFilter === 'show'} label="Afficher" onClick={() => handleMatureFilterChange('show')} />
            <RadioOption selected={matureFilter === 'blur'} label="Flouter" onClick={() => handleMatureFilterChange('blur')} />
            <RadioOption selected={matureFilter === 'hide'} label="Masquer" onClick={() => handleMatureFilterChange('hide')} />
          </div>
        </div>

        <div className="h-4" />

        {/* ══════════ ABOUT ══════════ */}
        <SectionHeader icon={Info} title="À propos" />

        <div className="px-4 py-4 bg-background space-y-4">
          {/* Logo + Name */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-md">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-base font-bold text-foreground">Comment Live</p>
              <p className="text-xs text-muted-foreground">Version 1.0.0</p>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            Une plateforme de chat en direct pour partager, commenter et découvrir des mangas et webtoons avec une communauté passionnée.
          </p>

          {/* Info rows */}
          <div className="space-y-2 border-t border-border pt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Développé par</span>
              <span className="text-xs text-foreground font-medium">DINO</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Stack</span>
              <span className="text-xs text-foreground font-medium">React</span>
            </div>
          </div>

          {/* Contact buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <a
              href="mailto:support@commentlive.app"
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-secondary hover:bg-accent rounded-xl transition-colors"
            >
              <Send className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">Support</span>
            </a>
            <a
              href="mailto:ads@commentlive.app?subject=Partenariat publicitaire - Comment Live&body=Bonjour,%0D%0A%0D%0AJe souhaite me renseigner sur les opportunités publicitaires disponibles sur Comment Live.%0D%0A%0D%0ANom / Entreprise :%0D%0ABudget estimé :%0D%0AType de publicité souhaité :%0D%0A%0D%0AMerci."
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-purple-600/20 to-blue-600/20 hover:from-purple-600/30 hover:to-blue-600/30 border border-purple-500/30 rounded-xl transition-colors"
            >
              <Megaphone className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-medium text-purple-400">Pub / Ads</span>
            </a>
          </div>

          {/* Feedback button */}
          <button
            onClick={() => setShowFeedbackModal(true)}
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-secondary hover:bg-accent rounded-xl transition-colors w-full"
          >
            <MessageSquare className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-medium text-blue-400">Envoyer un feedback</span>
          </button>

          {/* Legal links */}
          <div className="flex items-center justify-center gap-4 pt-2 border-t border-border">
            <button
              onClick={() => setLegalPage('terms')}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              Conditions d'utilisation
            </button>
            <span className="text-border text-xs">·</span>
            <button
              onClick={() => setLegalPage('privacy')}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Politique de confidentialité
            </button>
          </div>
        </div>

        <div className="h-8" />

        {/* ══════════ ADMINISTRATION ══════════ (admins only) */}
        {profile?.isAdmin && onAdminClick && (
          <>
            <SectionHeader icon={ShieldAlert} title="Administration" />
            <div className="px-4 py-4 bg-background">
              <button
                onClick={onAdminClick}
                className="w-full flex items-center gap-4 px-4 py-3.5 bg-gradient-to-r from-red-600/20 to-red-700/10 hover:from-red-600/30 hover:to-red-700/20 border border-red-500/30 rounded-xl transition-colors"
              >
                <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                  <ShieldAlert className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">Panneau d'administration</p>
                  <p className="text-xs text-muted-foreground">Signalements · Feedbacks · Pubs · Bans</p>
                </div>
              </button>
            </div>
            <div className="h-8" />
          </>
        )}

      </div>

      {/* Feedback Modal */}
      <FeedbackModal isOpen={showFeedbackModal} onClose={() => setShowFeedbackModal(false)} />
    </div>
  );
}
