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

  const S = {
    bg: '#0c0c14',
    card: '#111119',
    border: 'rgba(255,255,255,0.06)',
    text: '#e8e8ed',
    muted: '#8888a0',
    purple: '#6c5ce7',
  };

  const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`rounded-2xl overflow-hidden mx-4 ${className}`} style={{ background: S.card, border: `1px solid ${S.border}` }}>
      {children}
    </div>
  );

  const CardRow = ({ icon, iconBg, label, sublabel, right, onClick, danger }: {
    icon: React.ReactNode; iconBg: string; label: string; sublabel?: string;
    right?: React.ReactNode; onClick?: () => void; danger?: boolean;
  }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-4 py-3.5 transition-colors text-left ${onClick ? 'hover:bg-white/5 active:bg-white/10' : 'cursor-default'}`}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: danger ? '#ff6b6b' : S.text }}>{label}</p>
        {sublabel && <p className="text-xs mt-0.5" style={{ color: S.muted }}>{sublabel}</p>}
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </button>
  );

  const Divider = () => <div style={{ height: '1px', background: S.border, margin: '0 16px' }} />;

  const Label = ({ text }: { text: string }) => (
    <p className="px-4 pb-1.5 pt-5 text-xs font-semibold uppercase tracking-wider" style={{ color: S.muted }}>{text}</p>
  );

  return (
    <div className="h-full flex flex-col overflow-y-auto" style={{ background: S.bg }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-3 flex-shrink-0">
        <motion.button
          onClick={onBack}
          whileTap={{ scale: 0.9 }}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: S.card, border: `1px solid ${S.border}` }}
        >
          <ArrowLeft size={18} style={{ color: S.text }} />
        </motion.button>
        <h1 className="text-lg font-bold" style={{ color: S.text }}>Paramètres</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-10">

        {/* ══ PROFILE BANNER ══ */}

        {isAuthenticated ? (
          <>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />

            {/* Profile Card */}
            <div className="mx-4 rounded-2xl overflow-hidden" style={{ background: S.card, border: `1px solid ${S.border}` }}>
              {/* Banner */}
              <div className="h-20 relative" style={{ background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)' }} />
              {/* Avatar + info */}
              <div className="px-4 pb-4">
                <div className="flex items-end gap-3 -mt-8 mb-3">
                  <button onClick={() => avatarInputRef.current?.click()} disabled={avatarUploading} className="relative group flex-shrink-0">
                    {profile?.avatarImage ? (
                      <img src={profile.avatarImage} alt="avatar" className="w-16 h-16 rounded-2xl object-cover ring-4" style={{ ringColor: S.card }} />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold ring-4" style={{ backgroundColor: profile?.avatarColor || S.purple }}>
                        {profile?.username?.slice(0, 2).toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {avatarUploading ? <Loader2 size={20} className="text-white animate-spin" /> : <Camera size={20} className="text-white" />}
                    </div>
                  </button>
                  <div className="flex-1 min-w-0 pb-1">
                    <p className="font-bold truncate" style={{ color: S.text, fontSize: '15px' }}>{profile?.username || 'User'}</p>
                    <p className="text-xs truncate" style={{ color: '#a29bfe' }}>@{profile?.handle || profile?.username}</p>
                  </div>
                  <div className="flex items-center gap-1 pb-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-xs text-green-500">En ligne</span>
                  </div>
                </div>
                {profile?.bio && <p className="text-xs mb-2" style={{ color: S.muted }}>{profile.bio}</p>}
                <p className="text-xs" style={{ color: S.muted }}>{user?.email}</p>
                {avatarMsg && <p className={`text-xs mt-1.5 flex items-center gap-1 ${avatarMsg.ok ? 'text-green-400' : 'text-red-400'}`}>{avatarMsg.ok ? <Check size={12} /> : <X size={12} />} {avatarMsg.text}</p>}
              </div>
            </div>

            {/* Edit Profile */}
            <Label text="Compte" />
            <Card>
              <CardRow
                icon={<Pencil size={16} className="text-white" />}
                iconBg={S.purple}
                label="Modifier le profil"
                sublabel="Nom, @handle, bio"
                right={<motion.div animate={{ rotate: editPanel === 'profile' ? 180 : 0 }}><ChevronDown size={16} style={{ color: S.muted }} /></motion.div>}
                onClick={() => openPanel('profile')}
              />
              <AnimatePresence>
                {editPanel === 'profile' && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="px-4 pb-4 pt-1 space-y-3" style={{ borderTop: `1px solid ${S.border}` }}>
                      <div>
                        <label className="text-xs mb-1 block" style={{ color: S.muted }}>Nom d'affichage</label>
                        <input type="text" value={editName} onChange={e => setEditName(e.target.value)} maxLength={30} placeholder="Ton nom" className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ background: '#1a1a28', border: `1px solid ${S.border}`, color: S.text }} />
                      </div>
                      <div>
                        <label className="text-xs mb-1 block" style={{ color: S.muted }}>@Username <span style={{ color: '#a29bfe' }}>(unique)</span></label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: S.muted }}>@</span>
                          <input type="text" value={editHandle} onChange={e => setEditHandle(e.target.value.replace(/^@/, '').replace(/[^a-z0-9_]/gi, '').toLowerCase())} maxLength={20} placeholder="ton_username" className="w-full pl-7 pr-3 py-2 rounded-xl text-sm outline-none" style={{ background: '#1a1a28', border: `1px solid ${S.border}`, color: S.text }} />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs mb-1 block" style={{ color: S.muted }}>Bio</label>
                        <textarea value={editBio} onChange={e => setEditBio(e.target.value)} maxLength={200} rows={2} placeholder="Parle de toi..." className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none" style={{ background: '#1a1a28', border: `1px solid ${S.border}`, color: S.text }} />
                      </div>
                      <Feedback msg={profileMsg} />
                      <button onClick={handleSaveProfile} disabled={profileSaving} className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: S.purple }}>
                        {profileSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                        {profileSaving ? 'Sauvegarde...' : 'Enregistrer'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <Divider />
              <CardRow
                icon={<LogOut size={16} className="text-white" />}
                iconBg="#e74c3c"
                label="Déconnexion"
                danger
                right={isSigningOut ? <Loader2 size={16} className="text-red-400 animate-spin" /> : undefined}
                onClick={handleSignOut}
              />
            </Card>

            {/* Security */}
            <Label text="Sécurité" />
            <Card>
              <CardRow
                icon={<Mail size={16} className="text-white" />}
                iconBg="#3498db"
                label="Changer l'email"
                sublabel={user?.email || ''}
                right={<motion.div animate={{ rotate: editPanel === 'email' ? 180 : 0 }}><ChevronDown size={16} style={{ color: S.muted }} /></motion.div>}
                onClick={() => openPanel('email')}
              />
              <AnimatePresence>
                {editPanel === 'email' && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="px-4 pb-4 pt-1 space-y-3" style={{ borderTop: `1px solid ${S.border}` }}>
                      <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Nouvelle adresse email" className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ background: '#1a1a28', border: `1px solid ${S.border}`, color: S.text }} />
                      <Feedback msg={emailMsg} />
                      <button onClick={handleChangeEmail} disabled={emailSaving || !newEmail.trim()} className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: S.purple }}>
                        {emailSaving ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                        {emailSaving ? 'Envoi...' : "Modifier l'email"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <Divider />
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#f39c12' }}>
                  <KeyRound size={16} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: S.text }}>Réinitialiser le mot de passe</p>
                  <p className="text-xs" style={{ color: S.muted }}>Lien envoyé à {user?.email}</p>
                  {passwordResetMsg && <p className={`text-xs mt-0.5 flex items-center gap-1 ${passwordResetMsg.ok ? 'text-green-400' : 'text-red-400'}`}>{passwordResetMsg.ok ? <Check size={12} /> : <X size={12} />} {passwordResetMsg.text}</p>}
                </div>
                <button onClick={handlePasswordReset} disabled={passwordResetSaving} className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5" style={{ background: '#1a1a28', color: S.text }}>
                  {passwordResetSaving ? <Loader2 size={12} className="animate-spin" /> : <Lock size={12} />}
                  {passwordResetSaving ? '...' : 'Envoyer'}
                </button>
              </div>
            </Card>

            {/* Privacy */}
            <Label text="Confidentialité" />
            <Card>
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#27ae60' }}>
                  <MessageCircle size={16} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: S.text }}>Messages privés</p>
                  <p className="text-xs" style={{ color: S.muted }}>Autoriser les autres à t'envoyer des DMs</p>
                </div>
                <button onClick={handleToggleDms} disabled={dmsSaving} className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${dmsSaving ? 'opacity-50' : ''}`} style={{ background: allowDms ? S.purple : '#2a2a3e' }}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${allowDms ? 'translate-x-6' : ''}`} />
                </button>
              </div>
            </Card>
          </>
        ) : (
          <Card className="mt-2">
            <div className="flex flex-col items-center py-8 gap-3">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: '#1a1a28' }}>
                <User size={28} style={{ color: S.muted }} />
              </div>
              <p className="text-sm font-medium" style={{ color: S.text }}>Non connecté</p>
              <p className="text-xs" style={{ color: S.muted }}>Connecte-toi pour accéder à toutes les fonctionnalités</p>
            </div>
          </Card>
        )}

        {/* Appearance */}
        <Label text="Apparence" />
        <Card>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#8e44ad' }}>
              <Moon size={16} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: S.text }}>Thème</p>
            </div>
            <div className="flex gap-1.5">
              {[{ v: 'dark' as const, label: 'Sombre', Icon: Moon }, { v: 'system' as const, label: 'Système', Icon: Monitor }].map(({ v, label, Icon }) => (
                <button key={v} onClick={() => updateSetting('theme', v)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all" style={{ background: settings.theme === v ? S.purple : '#1a1a28', color: settings.theme === v ? '#fff' : S.muted }}>
                  <Icon size={12} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Content */}
        <Label text="Contenu" />
        <Card>
          <div className="flex items-center gap-3 px-4 py-3.5 flex-wrap gap-y-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#e67e22' }}>
              <EyeOff size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: S.text }}>Contenu mature</p>
            </div>
            <div className="flex gap-1.5">
              {[{ v: 'show' as const, label: 'Afficher' }, { v: 'blur' as const, label: 'Flouter' }, { v: 'hide' as const, label: 'Masquer' }].map(({ v, label }) => (
                <button key={v} onClick={() => handleMatureFilterChange(v)} className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all" style={{ background: matureFilter === v ? S.purple : '#1a1a28', color: matureFilter === v ? '#fff' : S.muted }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* About */}
        <Label text="À propos" />
        <Card>
          <div className="px-4 py-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #6c5ce7, #3498db)' }}>
              <Globe size={22} className="text-white" />
            </div>
            <div>
              <p className="font-bold" style={{ color: S.text }}>Comment Live</p>
              <p className="text-xs" style={{ color: S.muted }}>Version 1.0.0 · par DINO</p>
            </div>
          </div>
          <Divider />
          <div className="p-3 grid grid-cols-2 gap-2">
            <a href="mailto:support@commentlive.app" className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium" style={{ background: '#1a1a28', color: S.text }}>
              <Send size={14} /> Support
            </a>
            <a href="mailto:ads@commentlive.app" className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium" style={{ background: 'rgba(108,92,231,0.15)', color: '#a29bfe', border: '1px solid rgba(108,92,231,0.3)' }}>
              <Megaphone size={14} /> Pub / Ads
            </a>
          </div>
          <div className="px-3 pb-3">
            <button onClick={() => setShowFeedbackModal(true)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium" style={{ background: '#1a1a28', color: '#74b9ff' }}>
              <MessageSquare size={14} /> Envoyer un feedback
            </button>
          </div>
          <Divider />
          <div className="flex items-center justify-center gap-4 px-4 py-3">
            <button onClick={() => setLegalPage('terms')} className="flex items-center gap-1 text-xs" style={{ color: S.muted }}>
              <FileText size={12} /> CGU
            </button>
            <span style={{ color: S.border }}>·</span>
            <button onClick={() => setLegalPage('privacy')} className="flex items-center gap-1 text-xs" style={{ color: S.muted }}>
              <ShieldCheck size={12} /> Confidentialité
            </button>
          </div>
        </Card>

        {/* ══════════ ADMINISTRATION ══════════ (admins only) */}
        {profile?.isAdmin && onAdminClick && (
          <>
            <Label text="Administration" />
            <Card>
              <CardRow
                icon={<ShieldAlert size={16} className="text-white" />}
                iconBg="#e74c3c"
                label="Panneau d'administration"
                sublabel="Signalements · Feedbacks · Pubs · Bans"
                onClick={onAdminClick}
              />
            </Card>
          </>
        )}

        <div className="h-8" />

      </div>

      {/* Feedback Modal */}
      <FeedbackModal isOpen={showFeedbackModal} onClose={() => setShowFeedbackModal(false)} />
    </div>
  );
}
