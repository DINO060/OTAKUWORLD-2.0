import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Moon,
  Monitor,
  Eye,
  EyeOff,
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

  // Privacy
  const [allowDms, setAllowDms] = useState<boolean>(profile?.allowDms !== false);
  const [dmsSaving, setDmsSaving] = useState(false);

  // Content filter
  const [matureFilter, setMatureFilter] = useState<MatureContent>(
    (profile?.matureFilter as MatureContent) || settings.matureContent
  );
  const [matureFilterSaving, setMatureFilterSaving] = useState(false);

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
    updateSetting('matureContent', value);
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
    document.documentElement.classList.add('dark');
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
    const cleanHandle = editHandle.trim().replace(/^@/, '').replace(/[^a-z0-9_]/gi, '').toLowerCase();
    if (cleanHandle && cleanHandle !== (profile?.handle || '')) {
      const { data: taken } = await supabase
        .from('profiles').select('id')
        .eq('handle', cleanHandle).neq('id', user!.id).maybeSingle();
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
      const { error: uploadError } = await supabase.storage.from('chapters').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('chapters').getPublicUrl(path);
      const { error: profileError } = await updateProfile({ avatarImage: urlData.publicUrl });
      if (profileError) throw new Error(profileError);
      setAvatarMsg({ ok: true, text: 'Avatar mis à jour !' });
      setTimeout(() => setAvatarMsg(null), 2000);
    } catch (err: any) {
      setAvatarMsg({ ok: false, text: err.message || 'Upload failed' });
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  // ── Legal Pages ──────────────────────────────────────────────────────
  if (legalPage) {
    const isTerms = legalPage === 'terms';
    return (
      <div className="h-full flex flex-col bg-background overflow-y-auto">
        <header className="flex-shrink-0 bg-card border-b border-border px-4 py-4">
          <div className="flex items-center gap-3">
            <motion.button onClick={() => setLegalPage(null)} whileTap={{ scale: 0.95 }} className="w-10 h-10 bg-secondary hover:bg-accent rounded-xl flex items-center justify-center transition-colors">
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
                    <li>Vous conservez la propriété du contenu que vous publiez.</li>
                    <li>En publiant du contenu, vous accordez à Comment Live une licence non exclusive pour l'afficher.</li>
                    <li>Le contenu marqué 16+ ou 18+ doit être correctement classifié par l'auteur.</li>
                    <li>Les administrateurs se réservent le droit de supprimer tout contenu enfreignant ces conditions.</li>
                  </ul>
                </section>
                <section className="space-y-2">
                  <h2 className="text-lg font-bold text-foreground">6. Propriété intellectuelle</h2>
                  <p className="text-sm text-muted-foreground">Les utilisateurs publiant des chapitres de mangas/webtoons doivent être les auteurs originaux ou détenir les droits de publication. Le partage de contenu protégé par le droit d'auteur sans autorisation est interdit.</p>
                </section>
                <section className="space-y-2">
                  <h2 className="text-lg font-bold text-foreground">7. Modération et sanctions</h2>
                  <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                    <li>Les administrateurs peuvent avertir, suspendre ou bannir un utilisateur.</li>
                    <li>Les signalements sont examinés par l'équipe de modération.</li>
                    <li>Les décisions de modération sont définitives.</li>
                  </ul>
                </section>
                <section className="space-y-2">
                  <h2 className="text-lg font-bold text-foreground">8. Limitation de responsabilité</h2>
                  <p className="text-sm text-muted-foreground">La Plateforme est fournie « en l'état ». Comment Live ne peut être tenu responsable des pertes de données ou interruptions de service.</p>
                </section>
                <section className="space-y-2">
                  <h2 className="text-lg font-bold text-foreground">9. Modifications</h2>
                  <p className="text-sm text-muted-foreground">Nous nous réservons le droit de modifier ces conditions. L'utilisation continue de la Plateforme vaut acceptation des nouvelles conditions.</p>
                </section>
                <section className="space-y-2">
                  <h2 className="text-lg font-bold text-foreground">10. Contact</h2>
                  <p className="text-sm text-muted-foreground">Pour toute question, utilisez la fonctionnalité « Envoyer un feedback » dans les paramètres.</p>
                </section>
              </>
            ) : (
              <>
                <section className="space-y-2">
                  <h2 className="text-lg font-bold text-foreground">1. Introduction</h2>
                  <p className="text-sm text-muted-foreground">Comment Live s'engage à protéger la vie privée de ses utilisateurs. Cette politique explique quelles données nous collectons et comment nous les utilisons.</p>
                </section>
                <section className="space-y-2">
                  <h2 className="text-lg font-bold text-foreground">2. Données collectées</h2>
                  <p className="text-sm font-semibold text-foreground mt-2">Données fournies par l'utilisateur :</p>
                  <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                    <li>Adresse e-mail, nom d'utilisateur et @handle</li>
                    <li>Photo de profil (avatar) et biographie</li>
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
                  <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                    <li>Fournir et améliorer les services de la Plateforme</li>
                    <li>Gérer votre compte et authentification</li>
                    <li>Afficher votre profil public aux autres utilisateurs</li>
                    <li>Permettre la messagerie privée entre utilisateurs</li>
                    <li>Modérer le contenu et assurer la sécurité de la communauté</li>
                  </ul>
                </section>
                <section className="space-y-2">
                  <h2 className="text-lg font-bold text-foreground">4. Stockage et sécurité</h2>
                  <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                    <li>Les données sont stockées sur les serveurs Supabase.</li>
                    <li>Les mots de passe sont hachés et ne sont jamais stockés en clair.</li>
                    <li>Les communications sont chiffrées via HTTPS/TLS.</li>
                    <li>L'accès aux données est protégé par des politiques RLS.</li>
                  </ul>
                </section>
                <section className="space-y-2">
                  <h2 className="text-lg font-bold text-foreground">5. Partage des données</h2>
                  <p className="text-sm text-muted-foreground">Nous ne vendons jamais vos données personnelles. Elles peuvent être partagées avec Supabase, Cloudflare, Tenor/GIPHY et les autorités légales uniquement.</p>
                </section>
                <section className="space-y-2">
                  <h2 className="text-lg font-bold text-foreground">6. Vos droits</h2>
                  <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                    <li><strong>Accès</strong> — consulter vos données</li>
                    <li><strong>Rectification</strong> — modifier vos informations via les paramètres</li>
                    <li><strong>Suppression</strong> — demander la suppression de votre compte</li>
                    <li><strong>Portabilité</strong> — demander une copie de vos données</li>
                  </ul>
                </section>
                <section className="space-y-2">
                  <h2 className="text-lg font-bold text-foreground">7. Cookies et stockage local</h2>
                  <p className="text-sm text-muted-foreground">La Plateforme utilise le localStorage pour vos préférences et votre session. Aucun cookie tiers de tracking n'est utilisé.</p>
                </section>
                <section className="space-y-2">
                  <h2 className="text-lg font-bold text-foreground">8. Contenu des mineurs</h2>
                  <p className="text-sm text-muted-foreground">La Plateforme n'est pas destinée aux enfants de moins de 13 ans.</p>
                </section>
                <section className="space-y-2">
                  <h2 className="text-lg font-bold text-foreground">9. Contact</h2>
                  <p className="text-sm text-muted-foreground">Pour toute question, utilisez la fonctionnalité « Envoyer un feedback » dans les paramètres.</p>
                </section>
              </>
            )}
          </div>
          <div className="h-8" />
        </div>
      </div>
    );
  }

  // ── Design tokens ──────────────────────────────────────────────────────

  const C = {
    bg: '#0d0d1a',
    card: '#1a1a2e',
    accent: '#6c5ce7',
    accentLight: 'rgba(108,92,231,0.15)',
    accentGlow: 'rgba(108,92,231,0.3)',
    danger: '#e74c3c',
    dangerLight: 'rgba(231,76,60,0.12)',
    success: '#00b894',
    text: '#ffffff',
    textMuted: 'rgba(255,255,255,0.45)',
    textSub: 'rgba(255,255,255,0.65)',
    border: 'rgba(255,255,255,0.06)',
  };

  // ── Sub-components ─────────────────────────────────────────────────────

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: C.textMuted, textTransform: 'uppercase', padding: '20px 0 8px' }}>
      {children}
    </div>
  );

  const Card = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
    <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden', ...style }}>
      {children}
    </div>
  );

  const SettingRow = ({
    icon, iconBg, label, sub, right, danger = false, onClick, noBorder = false,
  }: {
    icon: React.ReactNode; iconBg?: string; label: string; sub?: string;
    right?: React.ReactNode; danger?: boolean; onClick?: () => void; noBorder?: boolean;
  }) => (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '13px 16px',
        cursor: onClick ? 'pointer' : 'default',
        borderBottom: noBorder ? 'none' : `1px solid ${C.border}`,
        borderRadius: noBorder ? '0 0 12px 12px' : 0,
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 10, background: iconBg || C.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: danger ? C.danger : C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </div>
        {sub && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>}
      </div>
      {right !== undefined && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  );

  const SegmentControl = ({ options, value, onChange }: {
    options: { label: string; value: string }[];
    value: string;
    onChange: (v: string) => void;
  }) => (
    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 3, gap: 2 }}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
            background: value === opt.value ? C.accent : 'transparent',
            color: value === opt.value ? '#fff' : C.textMuted,
            transition: 'all 0.2s', cursor: 'pointer',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  const CSSToggle = ({ enabled, onChange, disabled = false }: { enabled: boolean; onChange: () => void; disabled?: boolean }) => (
    <div
      onClick={!disabled ? onChange : undefined}
      style={{
        width: 48, height: 26, borderRadius: 13,
        background: enabled ? C.accent : 'rgba(255,255,255,0.15)',
        position: 'relative', cursor: disabled ? 'default' : 'pointer',
        transition: 'background 0.25s', flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: enabled ? 25 : 3,
        width: 20, height: 20, borderRadius: '50%',
        background: '#fff', transition: 'left 0.25s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
      }} />
    </div>
  );

  const InlineMsg = ({ msg }: { msg: { ok: boolean; text: string } | null }) =>
    msg ? (
      <p style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, color: msg.ok ? C.success : C.danger, margin: '6px 0 0' }}>
        {msg.ok ? <Check size={12} /> : <X size={12} />}
        {msg.text}
      </p>
    ) : null;

  // ── Main render ────────────────────────────────────────────────────────

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: C.bg, color: C.text, overflow: 'hidden' }}>

      {/* Sticky header */}
      <header style={{
        flexShrink: 0,
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(13,13,26,0.9)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${C.border}`,
        padding: '0 16px',
        display: 'flex', alignItems: 'center',
        height: 56, gap: 12,
      }}>
        <motion.button
          onClick={onBack}
          whileTap={{ scale: 0.9 }}
          style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <ArrowLeft size={18} style={{ color: C.text }} />
        </motion.button>
        <span style={{ fontSize: 17, fontWeight: 700, color: C.text }}>Paramètres</span>
      </header>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '12px 16px 40px' }}>

          {/* ── PROFILE CARD ── */}
          {isAuthenticated ? (
            <>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />

              <div style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid ${C.border}`, marginBottom: 8 }}>
                {/* Banner */}
                <div style={{ height: 80, background: 'linear-gradient(135deg, #6c5ce7 0%, #a29bfe 50%, #fd79a8 100%)' }} />
                {/* Avatar + info */}
                <div style={{ background: C.card, padding: '0 16px 16px' }}>
                  <div style={{ position: 'relative', display: 'inline-block', marginTop: -28 }}>
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={avatarUploading}
                      className="group"
                      style={{ display: 'block', position: 'relative' }}
                    >
                      {profile?.avatarImage ? (
                        <img src={profile.avatarImage} alt="avatar" style={{ width: 64, height: 64, borderRadius: 16, objectFit: 'cover', border: `3px solid ${C.card}`, display: 'block' }} />
                      ) : (
                        <div style={{ width: 64, height: 64, borderRadius: 16, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#fff', border: `3px solid ${C.card}` }}>
                          {profile?.username?.slice(0, 2).toUpperCase() || 'U'}
                        </div>
                      )}
                      {/* Status dot */}
                      <div style={{ position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: '50%', background: C.success, border: `2px solid ${C.card}` }} />
                      {/* Camera hover overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ borderRadius: 16, background: 'rgba(0,0,0,0.55)' }}>
                        {avatarUploading ? <Loader2 size={18} className="text-white animate-spin" /> : <Camera size={18} className="text-white" />}
                      </div>
                    </button>
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.username || 'User'}</div>
                      <div style={{ fontSize: 13, color: C.textMuted }}>@{profile?.handle || profile?.username}</div>
                    </div>
                    {profile?.bio && (
                      <div style={{ padding: '4px 10px', borderRadius: 20, background: 'rgba(108,92,231,0.15)', color: '#a29bfe', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                        ✨ OtakuWorld
                      </div>
                    )}
                  </div>
                  {profile?.bio && <div style={{ marginTop: 6, fontSize: 13, color: C.textSub }}>{profile.bio}</div>}
                  <div style={{ marginTop: 4, fontSize: 12, color: C.textMuted }}>{user?.email}</div>
                  <InlineMsg msg={avatarMsg} />
                </div>
              </div>

              {/* ── COMPTE ── */}
              <SectionLabel>Compte</SectionLabel>
              <Card>
                <SettingRow
                  icon={<Pencil size={15} color="#fff" />}
                  iconBg={C.accent}
                  label="Modifier le profil"
                  sub="Nom, @handle, bio"
                  right={
                    <motion.div animate={{ rotate: editPanel === 'profile' ? 180 : 0 }}>
                      <ChevronDown size={16} style={{ color: C.textMuted }} />
                    </motion.div>
                  }
                  noBorder={editPanel !== 'profile'}
                  onClick={() => openPanel('profile')}
                />
                <AnimatePresence>
                  {editPanel === 'profile' && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                      <div style={{ padding: '12px 16px 16px', borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div>
                          <label style={{ fontSize: 12, color: C.textMuted, display: 'block', marginBottom: 4 }}>Nom d'affichage</label>
                          <input type="text" value={editName} onChange={e => setEditName(e.target.value)} maxLength={30} placeholder="Ton nom"
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 10, fontSize: 14, outline: 'none', background: '#0d0d1a', border: `1px solid ${C.border}`, color: C.text, boxSizing: 'border-box' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, color: C.textMuted, display: 'block', marginBottom: 4 }}>Username <span style={{ color: '#a29bfe' }}>(unique)</span></label>
                          <div style={{ display: 'flex', alignItems: 'center', borderRadius: 10, overflow: 'hidden', background: '#0d0d1a', border: `1px solid ${C.border}` }}>
                            <span style={{ paddingLeft: 12, paddingRight: 4, fontSize: 14, color: C.textMuted, flexShrink: 0 }}>@</span>
                            <input type="text" value={editHandle}
                              onChange={e => setEditHandle(e.target.value.replace(/^@/, '').replace(/[^a-z0-9_]/gi, '').toLowerCase())}
                              maxLength={20} placeholder="ton_username"
                              style={{ flex: 1, background: 'transparent', padding: '8px 12px 8px 4px', fontSize: 14, outline: 'none', color: C.text }} />
                          </div>
                        </div>
                        <div>
                          <label style={{ fontSize: 12, color: C.textMuted, display: 'block', marginBottom: 4 }}>Bio</label>
                          <textarea value={editBio} onChange={e => setEditBio(e.target.value)} maxLength={200} rows={2} placeholder="Parle de toi..."
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 10, fontSize: 14, outline: 'none', background: '#0d0d1a', border: `1px solid ${C.border}`, color: C.text, resize: 'none', boxSizing: 'border-box' }} />
                        </div>
                        <InlineMsg msg={profileMsg} />
                        <button onClick={handleSaveProfile} disabled={profileSaving}
                          style={{ width: '100%', padding: '10px 0', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#fff', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: profileSaving ? 0.6 : 1 }}>
                          {profileSaving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                          {profileSaving ? 'Sauvegarde...' : 'Enregistrer'}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>

              {/* ── SÉCURITÉ ── */}
              <SectionLabel>Sécurité</SectionLabel>
              <Card>
                <SettingRow
                  icon={<Mail size={15} color="#fff" />}
                  iconBg="rgba(52,152,219,0.9)"
                  label="Changer l'email"
                  sub={user?.email || ''}
                  right={
                    <motion.div animate={{ rotate: editPanel === 'email' ? 180 : 0 }}>
                      <ChevronDown size={16} style={{ color: C.textMuted }} />
                    </motion.div>
                  }
                  onClick={() => openPanel('email')}
                />
                <AnimatePresence>
                  {editPanel === 'email' && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                      <div style={{ padding: '12px 16px 16px', borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Nouvelle adresse email"
                          style={{ width: '100%', padding: '8px 12px', borderRadius: 10, fontSize: 14, outline: 'none', background: '#0d0d1a', border: `1px solid ${C.border}`, color: C.text, boxSizing: 'border-box' }} />
                        <InlineMsg msg={emailMsg} />
                        <button onClick={handleChangeEmail} disabled={emailSaving || !newEmail.trim()}
                          style={{ width: '100%', padding: '10px 0', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#fff', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: (emailSaving || !newEmail.trim()) ? 0.5 : 1 }}>
                          {emailSaving ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
                          {emailSaving ? 'Envoi...' : "Modifier l'email"}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <SettingRow
                  icon={<KeyRound size={15} color="#fff" />}
                  iconBg="rgba(241,196,15,0.85)"
                  label="Réinitialiser le mot de passe"
                  sub={passwordResetMsg ? undefined : `Lien envoyé à ${user?.email}`}
                  noBorder
                  right={
                    passwordResetMsg ? (
                      <span style={{ fontSize: 12, color: passwordResetMsg.ok ? C.success : C.danger, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {passwordResetMsg.ok ? <Check size={12} /> : <X size={12} />}
                        {passwordResetMsg.ok ? 'Envoyé !' : 'Erreur'}
                      </span>
                    ) : (
                      <button onClick={handlePasswordReset} disabled={passwordResetSaving}
                        style={{ padding: '6px 14px', borderRadius: 8, background: C.accentLight, border: `1px solid ${C.accentGlow}`, color: C.accent, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', opacity: passwordResetSaving ? 0.6 : 1 }}>
                        {passwordResetSaving ? <Loader2 size={12} className="animate-spin" /> : <Lock size={12} />}
                        {passwordResetSaving ? '...' : 'Envoyer'}
                      </button>
                    )
                  }
                />
              </Card>

              {/* ── CONFIDENTIALITÉ ── */}
              <SectionLabel>Confidentialité</SectionLabel>
              <Card>
                <SettingRow
                  icon={<MessageCircle size={15} color="#fff" />}
                  iconBg="rgba(0,184,148,0.85)"
                  label="Messages privés"
                  sub="Autoriser les autres à t'envoyer des DMs"
                  noBorder
                  right={<CSSToggle enabled={allowDms} onChange={handleToggleDms} disabled={dmsSaving} />}
                />
              </Card>
            </>
          ) : (
            <div style={{ borderRadius: 12, background: C.card, border: `1px solid ${C.border}`, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px', gap: 12 }}>
                <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={28} style={{ color: C.textMuted }} />
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>Non connecté</p>
                <p style={{ fontSize: 13, color: C.textMuted, margin: 0, textAlign: 'center' }}>Connecte-toi pour accéder à toutes les fonctionnalités</p>
              </div>
            </div>
          )}

          {/* ── APPARENCE ── */}
          <SectionLabel>Apparence</SectionLabel>
          <Card>
            <SettingRow
              icon={<Moon size={15} color="#fff" />}
              iconBg="rgba(108,92,231,0.85)"
              label="Thème"
              noBorder
              right={
                <SegmentControl
                  value={settings.theme}
                  onChange={v => updateSetting('theme', v as Theme)}
                  options={[
                    { label: 'Sombre', value: 'dark' },
                    { label: 'Système', value: 'system' },
                  ]}
                />
              }
            />
          </Card>

          {/* ── CONTENU ── */}
          <SectionLabel>Contenu</SectionLabel>
          <Card>
            <SettingRow
              icon={<EyeOff size={15} color="#fff" />}
              iconBg="rgba(231,76,60,0.85)"
              label="Contenu mature"
              noBorder
              right={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {matureFilterSaving && <Loader2 size={13} className="animate-spin" style={{ color: C.textMuted }} />}
                  <SegmentControl
                    value={matureFilter}
                    onChange={v => handleMatureFilterChange(v as MatureContent)}
                    options={[
                      { label: 'Afficher', value: 'show' },
                      { label: 'Flouter', value: 'blur' },
                      { label: 'Masquer', value: 'hide' },
                    ]}
                  />
                </div>
              }
            />
          </Card>

          {/* ── À PROPOS ── */}
          <SectionLabel>À propos</SectionLabel>
          <Card>
            <SettingRow
              icon={<Globe size={15} color="#fff" />}
              iconBg="rgba(108,92,231,0.85)"
              label="Comment Live"
              sub="Version 1.0.0 · par DINO"
              noBorder
            />
          </Card>

          {/* ── ADMINISTRATION ── */}
          {profile?.isAdmin && onAdminClick && (
            <>
              <SectionLabel>Administration</SectionLabel>
              <Card>
                <SettingRow
                  icon={<ShieldAlert size={15} color="#fff" />}
                  iconBg={C.danger}
                  label="Panneau d'administration"
                  sub="Signalements · Feedbacks · Pubs · Bans"
                  noBorder
                  onClick={onAdminClick}
                />
              </Card>
            </>
          )}

          {/* ── BOTTOM ACTIONS ── */}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <a
              href="mailto:support@commentlive.app"
              style={{ flex: 1, height: 44, borderRadius: 10, background: C.card, border: `1px solid ${C.border}`, color: C.textSub, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none' }}
            >
              <Send size={14} /> Support
            </a>
            <a
              href="mailto:ads@commentlive.app"
              style={{ flex: 1, height: 44, borderRadius: 10, background: C.card, border: `1px solid ${C.border}`, color: C.textSub, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none' }}
            >
              <Megaphone size={14} /> Pub / Ads
            </a>
          </div>

          <button
            onClick={() => setShowFeedbackModal(true)}
            style={{ width: '100%', height: 44, borderRadius: 10, background: C.accentLight, border: `1px solid ${C.accentGlow}`, color: C.accent, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <MessageSquare size={14} /> Envoyer un feedback
          </button>

          {isAuthenticated && (
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              style={{ width: '100%', height: 44, borderRadius: 10, background: C.dangerLight, border: '1px solid rgba(231,76,60,0.25)', color: C.danger, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: isSigningOut ? 0.6 : 1, transition: 'opacity 0.15s' }}
            >
              {isSigningOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
              {isSigningOut ? 'Déconnexion...' : 'Se déconnecter'}
            </button>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 20, fontSize: 12, color: C.textMuted }}>
            <span style={{ cursor: 'pointer' }} onClick={() => setLegalPage('terms')}>
              <FileText size={11} style={{ display: 'inline', marginRight: 3, verticalAlign: 'middle' }} />CGU
            </span>
            <span style={{ color: C.border }}>·</span>
            <span style={{ cursor: 'pointer', color: C.accent }} onClick={() => setLegalPage('privacy')}>
              <ShieldCheck size={11} style={{ display: 'inline', marginRight: 3, verticalAlign: 'middle' }} />Confidentialité
            </span>
          </div>

        </div>
      </div>

      <FeedbackModal isOpen={showFeedbackModal} onClose={() => setShowFeedbackModal(false)} />
    </div>
  );
}
