import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Flag, Megaphone, ShieldBan, Check, X, Loader2,
  Trash2, Plus, Eye, EyeOff, Clock, Ban, RefreshCw, MessageSquare, Bug, Lightbulb, HelpCircle,
  Image, Video, Search, Save, RotateCcw, ChevronDown, ChevronUp,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface AdminPanelProps {
  onBack: () => void;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  reported_message_id: string | null;
  reason: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  created_at: string;
  reporter?: { username: string };
  reported_user?: { username: string };
}

interface Ban {
  id: string;
  user_id: string;
  reason: string | null;
  ban_type: 'temp' | 'permanent';
  expires_at: string | null;
  created_at: string;
  profile?: { username: string };
}

interface ManagedAd {
  id: string;
  label: string;
  title: string;
  body: string | null;
  cta: string;
  href: string;
  gradient: string;
  emoji: string;
  is_active: boolean;
  created_at: string;
  media_type: string;
  media_url: string | null;
}

// ─── Mute type ───────────────────────────────────────────────────────────────

interface Mute {
  id: string;
  user_id: string;
  muted_by: string;
  reason: string | null;
  muted_until: string;
  profile?: { username: string };
}

// ─── Feedback type ────────────────────────────────────────────────────────────

interface Feedback {
  id: string;
  user_id: string | null;
  username: string;
  message: string;
  category: 'general' | 'bug' | 'feature' | 'other';
  status: 'new' | 'read' | 'done';
  created_at: string;
}

const FEEDBACK_CATEGORIES: Record<string, { label: string; icon: typeof MessageSquare; color: string }> = {
  general: { label: 'Général',      icon: MessageSquare, color: 'text-blue-400' },
  bug:     { label: 'Bug',          icon: Bug,           color: 'text-red-400' },
  feature: { label: 'Suggestion',   icon: Lightbulb,     color: 'text-yellow-400' },
  other:   { label: 'Autre',        icon: HelpCircle,    color: 'text-purple-400' },
};

// ─── Game Notification Template type ──────────────────────────────────────────

interface GameNotifTemplate {
  id: string;
  notification_key: string;
  category: string;
  default_message: string;
  custom_message: string | null;
  icon: string;
  media_type: string;
  media_url: string | null;
  is_active: boolean;
  updated_at: string;
}

const NOTIF_CATEGORIES: Record<string, { label: string; emoji: string; color: string }> = {
  kills:       { label: 'Kills',           emoji: '💀', color: 'text-red-400' },
  lynch:       { label: 'Lynch',           emoji: '⚖️', color: 'text-yellow-400' },
  transforms:  { label: 'Transformations', emoji: '🎭', color: 'text-purple-400' },
  protections: { label: 'Protections',     emoji: '🛡️', color: 'text-blue-400' },
  info:        { label: 'Info / Reveals',   emoji: '🔮', color: 'text-cyan-400' },
  victory:     { label: 'Victoires',       emoji: '🏆', color: 'text-amber-400' },
  phase:       { label: 'Phases',          emoji: '🌙', color: 'text-indigo-400' },
};

// ─── Tab header ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'feedbacks', label: 'Feedbacks',    icon: MessageSquare },
  { id: 'reports',   label: 'Signalements', icon: Flag },
  { id: 'ads',       label: 'Pubs',         icon: Megaphone },
  { id: 'bans',      label: 'Bans',         icon: ShieldBan },
] as const;

const GAME_TAB = { id: 'loupgarou' as const, label: '🐺 Jeu', icon: ShieldBan };
type Tab = typeof TABS[number]['id'] | 'loupgarou';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// ─── BAN_DURATIONS ───────────────────────────────────────────────────────────

const BAN_DURATIONS = [
  { label: '1 heure',   hours: 1 },
  { label: '6 heures',  hours: 6 },
  { label: '24 heures', hours: 24 },
  { label: '7 jours',   hours: 24 * 7 },
  { label: '30 jours',  hours: 24 * 30 },
  { label: 'Permanent', hours: null },
];

// ─── GRADIENTS ───────────────────────────────────────────────────────────────

const GRADIENTS = [
  'from-purple-500 to-blue-600',
  'from-pink-500 to-rose-600',
  'from-amber-500 to-orange-600',
  'from-green-500 to-emerald-600',
  'from-indigo-500 to-violet-600',
  'from-cyan-500 to-blue-500',
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminPanel({ onBack }: AdminPanelProps) {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<Tab>('feedbacks');

  // Feedbacks
  const [feedbacks, setFeedbacks]         = useState<Feedback[]>([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'new' | 'read' | 'done'>('all');

  // Reports
  const [reports, setReports]         = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [banTarget, setBanTarget]     = useState<{ userId: string; username: string; reportId: string } | null>(null);
  const [banReason, setBanReason]     = useState('');
  const [banDuration, setBanDuration] = useState<number | null>(24);
  const [banning, setBanning]         = useState(false);

  // Ads
  const [ads, setAds]           = useState<ManagedAd[]>([]);
  const [loadingAds, setLoadingAds] = useState(false);
  const [showAdForm, setShowAdForm] = useState(false);
  const [adForm, setAdForm] = useState({ label: 'PROMO', title: '', body: '', cta: '', href: '', gradient: GRADIENTS[0], emoji: '📢', media_type: 'none', media_url: '' });
  const [savingAd, setSavingAd] = useState(false);

  // Bans
  const [bans, setBans]           = useState<Ban[]>([]);
  const [loadingBans, setLoadingBans] = useState(false);

  // Mutes
  const [mutes, setMutes]             = useState<Mute[]>([]);
  const [loadingMutes, setLoadingMutes] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const showToast = (ok: boolean, text: string) => {
    setToast({ ok, text });
    setTimeout(() => setToast(null), 3000);
  };

  // Inline delete confirm for ads
  const [confirmDeleteAdId, setConfirmDeleteAdId] = useState<string | null>(null);

  // Game Notifications
  const [notifTemplates, setNotifTemplates] = useState<GameNotifTemplate[]>([]);
  const [loadingNotifs, setLoadingNotifs]   = useState(false);
  const [notifFilter, setNotifFilter]       = useState<string>('all');
  const [notifSearch, setNotifSearch]       = useState('');
  const [editingNotif, setEditingNotif]     = useState<string | null>(null);
  const [editForm, setEditForm]             = useState<{ custom_message: string; media_type: string; media_url: string }>({ custom_message: '', media_type: 'none', media_url: '' });
  const [savingNotif, setSavingNotif]       = useState(false);
  const [expandedCats, setExpandedCats]     = useState<Set<string>>(new Set(Object.keys(NOTIF_CATEGORIES)));

  // ── Load feedbacks ──────────────────────────────────────────────────────────

  const loadFeedbacks = useCallback(async () => {
    setLoadingFeedbacks(true);
    const { data } = await supabase
      .from('feedbacks')
      .select('*')
      .order('created_at', { ascending: false });
    setFeedbacks(data || []);
    setLoadingFeedbacks(false);
  }, []);

  const updateFeedbackStatus = async (id: string, status: Feedback['status']) => {
    await supabase.from('feedbacks').update({ status }).eq('id', id);
    setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status } : f));
  };

  // ── Load reports ────────────────────────────────────────────────────────────

  const loadReports = useCallback(async () => {
    setLoadingReports(true);
    const { data } = await supabase
      .from('reports')
      .select('*, reporter:reporter_id(username), reported_user:reported_user_id(username), reported_chapter:reported_chapter_id(title)')
      .order('created_at', { ascending: false });
    setReports((data as any) || []);
    setLoadingReports(false);
  }, []);

  // ── Load ads ────────────────────────────────────────────────────────────────

  const loadAds = useCallback(async () => {
    setLoadingAds(true);
    const { data } = await supabase.from('managed_ads').select('*').order('created_at', { ascending: false });
    setAds(data || []);
    setLoadingAds(false);
  }, []);

  // ── Load bans ────────────────────────────────────────────────────────────────

  const loadBans = useCallback(async () => {
    setLoadingBans(true);
    const { data } = await supabase
      .from('bans')
      .select('*, profile:user_id(username)')
      .order('created_at', { ascending: false });
    setBans((data as any) || []);
    setLoadingBans(false);
  }, []);

  // ── Load mutes ────────────────────────────────────────────────────────────────

  const loadMutes = useCallback(async () => {
    setLoadingMutes(true);
    const { data } = await supabase
      .from('mutes')
      .select('*, profile:user_id(username)')
      .order('muted_until', { ascending: true });
    setMutes((data as any) || []);
    setLoadingMutes(false);
  }, []);

  // ── Load game notification templates ───────────────────────────────────────

  const loadNotifs = useCallback(async () => {
    setLoadingNotifs(true);
    const { data } = await supabase
      .from('game_notification_templates')
      .select('*')
      .order('category', { ascending: true });
    setNotifTemplates((data as GameNotifTemplate[]) || []);
    setLoadingNotifs(false);
  }, []);

  useEffect(() => {
    if (tab === 'feedbacks')  loadFeedbacks();
    if (tab === 'reports')    loadReports();
    if (tab === 'ads')        loadAds();
    if (tab === 'bans')       { loadBans(); loadMutes(); }
    if (tab === 'loupgarou')  loadNotifs();
  }, [tab, loadFeedbacks, loadReports, loadAds, loadBans, loadMutes, loadNotifs]);

  // ── Admin guard (AFTER all hooks) ─────────────────────────────────────────

  if (!profile?.isAdmin) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">Accès refusé — admins uniquement</p>
      </div>
    );
  }

  // ── Dismiss report ──────────────────────────────────────────────────────────

  const dismissReport = async (reportId: string) => {
    const { error } = await supabase.from('reports').update({ status: 'dismissed' }).eq('id', reportId);
    if (error) { showToast(false, 'Erreur : ' + error.message); return; }
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'dismissed' } : r));
    showToast(true, 'Signalement ignoré');
  };

  // ── Ban user ────────────────────────────────────────────────────────────────

  const handleBan = async () => {
    if (!banTarget || !user) return;
    setBanning(true);

    const expiresAt = banDuration
      ? new Date(Date.now() + banDuration * 3_600_000).toISOString()
      : null;

    // Upsert ban (replace existing)
    const { error } = await supabase.from('bans').upsert({
      user_id: banTarget.userId,
      admin_id: user.id,
      reason: banReason || 'Violation des règles',
      ban_type: banDuration ? 'temp' : 'permanent',
      expires_at: expiresAt,
    }, { onConflict: 'user_id' });

    if (error) { showToast(false, 'Erreur ban : ' + error.message); setBanning(false); return; }

    // Mark report as reviewed
    await supabase.from('reports').update({ status: 'reviewed' }).eq('id', banTarget.reportId);
    setReports(prev => prev.map(r => r.id === banTarget.reportId ? { ...r, status: 'reviewed' } : r));

    setBanning(false);
    setBanTarget(null);
    setBanReason('');
    setBanDuration(24);
    showToast(true, `@${banTarget.username} banni`);
  };

  // ── Unban ───────────────────────────────────────────────────────────────────

  const unban = async (banId: string) => {
    const { error } = await supabase.from('bans').delete().eq('id', banId);
    if (error) { showToast(false, 'Erreur : ' + error.message); return; }
    setBans(prev => prev.filter(b => b.id !== banId));
    showToast(true, 'Utilisateur débanni');
  };

  // ── Mute user (temporary) ──────────────────────────────────────────────────

  const handleMute = async (userId: string, username: string, durationHours: number) => {
    if (!user) return;
    const mutedUntil = new Date(Date.now() + durationHours * 3_600_000).toISOString();
    const { error } = await supabase.from('mutes').upsert({
      user_id: userId,
      muted_by: user.id,
      reason: `Muted by admin for ${durationHours}h`,
      muted_until: mutedUntil,
    }, { onConflict: 'user_id' });

    if (error) { showToast(false, 'Erreur mute : ' + error.message); return; }
    showToast(true, `@${username} muté pour ${durationHours}h`);
  };

  const unmute = async (userId: string, username: string) => {
    const { error } = await supabase.from('mutes').delete().eq('user_id', userId);
    if (error) { showToast(false, 'Erreur : ' + error.message); return; }
    setMutes(prev => prev.filter(m => m.user_id !== userId));
    showToast(true, `@${username} unmuté`);
  };

  // ── Toggle ad ───────────────────────────────────────────────────────────────

  const toggleAd = async (adId: string, current: boolean) => {
    const { error } = await supabase.from('managed_ads').update({ is_active: !current }).eq('id', adId);
    if (error) { showToast(false, 'Erreur : ' + error.message); return; }
    setAds(prev => prev.map(a => a.id === adId ? { ...a, is_active: !current } : a));
    showToast(true, current ? 'Pub désactivée' : 'Pub activée');
  };

  const deleteAd = async (adId: string) => {
    const { error } = await supabase.from('managed_ads').delete().eq('id', adId);
    if (error) { showToast(false, 'Erreur : ' + error.message); setConfirmDeleteAdId(null); return; }
    setAds(prev => prev.filter(a => a.id !== adId));
    setConfirmDeleteAdId(null);
    showToast(true, 'Publicité supprimée');
  };

  const saveAd = async () => {
    const hasMedia = adForm.media_type !== 'none' && adForm.media_url.trim() !== '';
    if (!adForm.title || !adForm.cta || !adForm.href) return;
    if (!hasMedia && !adForm.body) return; // body required only when no media
    setSavingAd(true);
    const payload = {
      ...adForm,
      body: adForm.body || null,
      media_url: adForm.media_url || null,
    };
    const { data, error } = await supabase.from('managed_ads').insert(payload).select().single();
    if (error) { showToast(false, 'Erreur pub : ' + error.message); setSavingAd(false); return; }
    if (data) setAds(prev => [data, ...prev]);
    setAdForm({ label: 'PROMO', title: '', body: '', cta: '', href: '', gradient: GRADIENTS[0], emoji: '📢', media_type: 'none', media_url: '' });
    setShowAdForm(false);
    setSavingAd(false);
  };

  // ── Save notification template ──────────────────────────────────────────────

  const saveNotifTemplate = async (templateId: string) => {
    setSavingNotif(true);
    const payload: any = {
      custom_message: editForm.custom_message.trim() || null,
      media_type: editForm.media_type,
      media_url: editForm.media_url.trim() || null,
      updated_at: new Date().toISOString(),
      updated_by: user?.id || null,
    };
    const { error } = await supabase.from('game_notification_templates').update(payload).eq('id', templateId);
    if (error) { showToast(false, 'Erreur : ' + error.message); setSavingNotif(false); return; }
    setNotifTemplates(prev => prev.map(t => t.id === templateId ? { ...t, ...payload } : t));
    setEditingNotif(null);
    setSavingNotif(false);
    showToast(true, 'Template sauvegardé');
  };

  const resetNotifTemplate = async (templateId: string) => {
    const { error } = await supabase.from('game_notification_templates').update({
      custom_message: null, media_type: 'none', media_url: null,
      updated_at: new Date().toISOString(), updated_by: user?.id || null,
    }).eq('id', templateId);
    if (error) { showToast(false, 'Erreur : ' + error.message); return; }
    setNotifTemplates(prev => prev.map(t => t.id === templateId ? { ...t, custom_message: null, media_type: 'none', media_url: null } : t));
    showToast(true, 'Template réinitialisé');
  };

  const toggleNotifActive = async (templateId: string, current: boolean) => {
    const { error } = await supabase.from('game_notification_templates').update({ is_active: !current }).eq('id', templateId);
    if (error) { showToast(false, 'Erreur : ' + error.message); return; }
    setNotifTemplates(prev => prev.map(t => t.id === templateId ? { ...t, is_active: !current } : t));
    showToast(true, current ? 'Notification désactivée' : 'Notification activée');
  };

  const startEditNotif = (template: GameNotifTemplate) => {
    setEditingNotif(template.id);
    setEditForm({
      custom_message: template.custom_message || '',
      media_type: template.media_type || 'none',
      media_url: template.media_url || '',
    });
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col bg-background overflow-y-auto">
      {/* Header */}
      <header className="flex-shrink-0 bg-card border-b border-border px-4 py-4">
        <div className="flex items-center gap-3">
          <motion.button onClick={onBack} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            className="w-10 h-10 bg-secondary hover:bg-accent rounded-xl flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </motion.button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
            <p className="text-xs text-muted-foreground">Connecté en tant que @{profile.username}</p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-border bg-card overflow-x-auto">
        {[...TABS, GAME_TAB].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as Tab)}
            className={`flex-1 min-w-0 flex items-center justify-center gap-1 py-3 text-[11px] font-semibold transition-colors whitespace-nowrap px-2 ${
              tab === t.id ? 'text-purple-400 border-b-2 border-purple-500' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.id === 'loupgarou' ? <span className="text-sm">🐺</span> : <t.icon className="w-3.5 h-3.5" />}
            {t.label}
            {t.id === 'feedbacks' && feedbacks.filter(f => f.status === 'new').length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-blue-500 text-white text-[10px] rounded-full">
                {feedbacks.filter(f => f.status === 'new').length}
              </span>
            )}
            {t.id === 'reports' && reports.filter(r => r.status === 'pending').length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full">
                {reports.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* ══════════ FEEDBACKS TAB ══════════ */}
        {tab === 'feedbacks' && (
          <div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              {/* Filter pills */}
              <div className="flex gap-1.5">
                {(['all', 'new', 'read', 'done'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFeedbackFilter(f)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                      feedbackFilter === f
                        ? 'bg-blue-600 text-white'
                        : 'bg-secondary text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    {f === 'all' ? 'Tous' : f === 'new' ? 'Nouveau' : f === 'read' ? 'Lu' : 'Traité'}
                    {f === 'new' && feedbacks.filter(fb => fb.status === 'new').length > 0 && (
                      <span className="ml-1 text-[10px]">({feedbacks.filter(fb => fb.status === 'new').length})</span>
                    )}
                  </button>
                ))}
              </div>
              <button onClick={loadFeedbacks} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
                <RefreshCw className={`w-4 h-4 text-muted-foreground ${loadingFeedbacks ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loadingFeedbacks ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : (() => {
              const filtered = feedbackFilter === 'all' ? feedbacks : feedbacks.filter(f => f.status === feedbackFilter);
              if (filtered.length === 0) {
                return <div className="text-center py-12 text-muted-foreground text-sm">Aucun feedback</div>;
              }
              return filtered.map(fb => {
                const cat = FEEDBACK_CATEGORIES[fb.category] ?? FEEDBACK_CATEGORIES.general;
                const CatIcon = cat.icon;
                return (
                  <div key={fb.id} className={`px-4 py-3 border-b border-border ${fb.status === 'done' ? 'opacity-50' : ''}`}>
                    <div className="flex items-start gap-2">
                      <div className="w-7 h-7 bg-secondary rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CatIcon className={`w-3.5 h-3.5 ${cat.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-foreground">@{fb.username}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            fb.status === 'new' ? 'bg-blue-500/20 text-blue-400' :
                            fb.status === 'read' ? 'bg-secondary text-muted-foreground' :
                            'bg-green-500/20 text-green-400'
                          }`}>
                            {fb.status === 'new' ? 'NOUVEAU' : fb.status === 'read' ? 'LU' : 'TRAITÉ'}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full bg-secondary ${cat.color}`}>
                            {cat.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground ml-auto">{formatDate(fb.created_at)}</span>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{fb.message}</p>
                      </div>
                    </div>
                    {fb.status !== 'done' && (
                      <div className="flex gap-2 mt-2 ml-9">
                        {fb.status === 'new' && (
                          <button
                            onClick={() => updateFeedbackStatus(fb.id, 'read')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-accent text-muted-foreground text-xs font-medium rounded-lg transition-colors"
                          >
                            <Eye className="w-3 h-3" /> Marquer lu
                          </button>
                        )}
                        <button
                          onClick={() => updateFeedbackStatus(fb.id, 'done')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs font-medium rounded-lg transition-colors"
                        >
                          <Check className="w-3 h-3" /> Traité
                        </button>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        )}

        {/* ══════════ REPORTS TAB ══════════ */}
        {tab === 'reports' && (
          <div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-xs text-muted-foreground">{reports.filter(r => r.status === 'pending').length} en attente</span>
              <button onClick={loadReports} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
                <RefreshCw className={`w-4 h-4 text-muted-foreground ${loadingReports ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loadingReports ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : reports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">Aucun signalement</div>
            ) : (
              reports.map(report => (
                <div key={report.id} className={`px-4 py-3 border-b border-border ${report.status !== 'pending' ? 'opacity-50' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          report.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          report.status === 'reviewed' ? 'bg-green-500/20 text-green-400' :
                          'bg-secondary text-muted-foreground'
                        }`}>
                          {report.status === 'pending' ? 'EN ATTENTE' : report.status === 'reviewed' ? 'TRAITÉ' : 'IGNORÉ'}
                        </span>
                        <span className="text-xs text-muted-foreground">{formatDate(report.created_at)}</span>
                      </div>
                      <p className="text-sm text-foreground">
                        <span className="font-semibold text-blue-400">@{(report.reporter as any)?.username ?? '?'}</span>
                        {' '}a signalé{' '}
                        <span className="font-semibold text-red-400">@{(report.reported_user as any)?.username ?? '?'}</span>
                      </p>
                      {(report as any).reported_chapter && (
                        <p className="text-xs text-orange-400 mt-0.5">
                          📖 Chapitre signalé : <span className="font-semibold">{(report as any).reported_chapter.title}</span>
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">Motif : {report.reason}</p>
                    </div>
                  </div>

                  {report.status === 'pending' && (
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => setBanTarget({ userId: report.reported_user_id!, username: (report.reported_user as any)?.username ?? '?', reportId: report.id })}
                        disabled={!report.reported_user_id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-medium rounded-lg transition-colors disabled:opacity-40"
                      >
                        <Ban className="w-3 h-3" /> Bannir
                      </button>
                      <button
                        onClick={() => { if (report.reported_user_id) handleMute(report.reported_user_id, (report.reported_user as any)?.username ?? '?', 1); }}
                        disabled={!report.reported_user_id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 text-xs font-medium rounded-lg transition-colors disabled:opacity-40"
                      >
                        <Clock className="w-3 h-3" /> Mute 1h
                      </button>
                      <button
                        onClick={() => { if (report.reported_user_id) handleMute(report.reported_user_id, (report.reported_user as any)?.username ?? '?', 24); }}
                        disabled={!report.reported_user_id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 text-xs font-medium rounded-lg transition-colors disabled:opacity-40"
                      >
                        <Clock className="w-3 h-3" /> Mute 24h
                      </button>
                      <button
                        onClick={() => dismissReport(report.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-accent text-muted-foreground text-xs font-medium rounded-lg transition-colors"
                      >
                        <X className="w-3 h-3" /> Ignorer
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ══════════ ADS TAB ══════════ */}
        {tab === 'ads' && (
          <div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-xs text-muted-foreground">{ads.filter(a => a.is_active).length} actives</span>
              <button onClick={() => setShowAdForm(!showAdForm)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition-colors">
                <Plus className="w-3 h-3" /> Nouvelle pub
              </button>
            </div>

            {/* Add Ad Form */}
            <AnimatePresence>
              {showAdForm && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-b border-border bg-card">
                  <div className="p-4 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nouvelle publicité</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Emoji (ex: 🎉)" value={adForm.emoji} onChange={e => setAdForm(p => ({...p, emoji: e.target.value}))}
                        className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-purple-500" />
                      <input placeholder="Label (ex: PROMO)" value={adForm.label} onChange={e => setAdForm(p => ({...p, label: e.target.value}))}
                        className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-purple-500" />
                    </div>
                    <input placeholder="Titre *" value={adForm.title} onChange={e => setAdForm(p => ({...p, title: e.target.value}))}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-purple-500" />
                    <textarea placeholder="Description *" value={adForm.body} onChange={e => setAdForm(p => ({...p, body: e.target.value}))}
                      rows={2} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-purple-500 resize-none" />
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Bouton (ex: Voir plus)" value={adForm.cta} onChange={e => setAdForm(p => ({...p, cta: e.target.value}))}
                        className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-purple-500" />
                      <input placeholder="URL destination *" value={adForm.href} onChange={e => setAdForm(p => ({...p, href: e.target.value}))}
                        className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-purple-500" />
                    </div>

                    {/* Media section */}
                    <div className="space-y-2 pt-1 border-t border-border">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Média (optionnel)</p>
                      <div className="flex gap-2">
                        {(['none', 'image', 'video'] as const).map(type => (
                          <button key={type}
                            onClick={() => setAdForm(p => ({ ...p, media_type: type, media_url: '' }))}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                              adForm.media_type === type
                                ? 'bg-purple-600 text-white'
                                : 'bg-secondary text-muted-foreground hover:bg-accent'
                            }`}>
                            {type === 'none' ? <X className="w-3 h-3" /> : type === 'image' ? <Image className="w-3 h-3" /> : <Video className="w-3 h-3" />}
                            {type === 'none' ? 'Aucun' : type === 'image' ? 'Image' : 'Vidéo'}
                          </button>
                        ))}
                      </div>
                      {adForm.media_type !== 'none' && (
                        <input
                          placeholder={adForm.media_type === 'image' ? "URL de l'image (https://...)" : 'URL YouTube ou MP4 direct'}
                          value={adForm.media_url}
                          onChange={e => setAdForm(p => ({ ...p, media_url: e.target.value }))}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-purple-500"
                        />
                      )}
                      {adForm.media_type === 'image' && adForm.media_url && (
                        <img src={adForm.media_url} alt="preview" className="w-full h-28 object-cover rounded-lg" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      )}
                      {adForm.media_type === 'video' && adForm.media_url && (
                        <div className="w-full h-12 bg-black/20 rounded-lg flex items-center gap-2 px-3">
                          <Video className="w-4 h-4 text-purple-400 flex-shrink-0" />
                          <span className="text-xs text-muted-foreground truncate">{adForm.media_url}</span>
                        </div>
                      )}
                    </div>

                    {/* Gradient picker */}
                    <div className="flex gap-2">
                      {GRADIENTS.map(g => (
                        <button key={g} onClick={() => setAdForm(p => ({...p, gradient: g}))}
                          className={`w-8 h-8 rounded-lg bg-gradient-to-r ${g} ${adForm.gradient === g ? 'ring-2 ring-white ring-offset-1 ring-offset-card' : ''}`} />
                      ))}
                    </div>
                    {/* Preview */}
                    <div className={`bg-gradient-to-r ${adForm.gradient} rounded-xl px-3 py-2 flex items-center gap-2`}>
                      <span className="text-lg">{adForm.emoji || '📢'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-bold truncate">{adForm.title || 'Titre'}</p>
                        <p className="text-white/80 text-[10px] truncate">{adForm.body || 'Description'}</p>
                      </div>
                      <span className="text-white text-xs bg-white/20 px-2 py-0.5 rounded-lg">{adForm.cta || 'CTA'}</span>
                    </div>
                    <button onClick={saveAd} disabled={savingAd || !adForm.title || !adForm.cta || !adForm.href || (adForm.media_type === 'none' && !adForm.body)}
                      className="w-full flex items-center justify-center gap-2 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
                      {savingAd ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      {savingAd ? 'Sauvegarde...' : 'Publier'}
                    </button>
                    {(!adForm.title || !adForm.cta || !adForm.href || (adForm.media_type === 'none' && !adForm.body)) && (
                      <p className="text-[10px] text-red-400 mt-1 text-center">
                        Champs requis : {[!adForm.title && 'Titre', !adForm.body && adForm.media_type === 'none' && 'Description', !adForm.cta && 'CTA', !adForm.href && 'URL destination'].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {loadingAds ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : ads.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">Aucune publicité</div>
            ) : (
              ads.map(ad => (
                <div key={ad.id} className="px-4 py-3 border-b border-border">
                  {/* Media preview */}
                  {ad.media_type === 'image' && ad.media_url && (
                    <div className={`mb-2 rounded-xl overflow-hidden ${!ad.is_active ? 'opacity-40' : ''}`}>
                      <img src={ad.media_url} alt={ad.title} className="w-full h-28 object-cover" />
                    </div>
                  )}
                  {ad.media_type === 'video' && ad.media_url && (
                    <div className={`mb-2 flex items-center gap-2 px-3 py-2 bg-secondary rounded-xl ${!ad.is_active ? 'opacity-40' : ''}`}>
                      <Video className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      <span className="text-xs text-muted-foreground truncate">{ad.media_url}</span>
                    </div>
                  )}
                  <div className={`bg-gradient-to-r ${ad.gradient} rounded-xl px-3 py-2 flex items-center gap-2 ${!ad.is_active ? 'opacity-40' : ''}`}>
                    <span className="text-lg">{ad.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-bold truncate">{ad.title}</p>
                      {ad.body && <p className="text-white/80 text-[10px] truncate">{ad.body}</p>}
                    </div>
                    {ad.media_type !== 'none' && (
                      <span className="flex items-center gap-1 text-white/70 text-[10px] bg-white/10 px-1.5 py-0.5 rounded-md flex-shrink-0">
                        {ad.media_type === 'image' ? <Image className="w-2.5 h-2.5" /> : <Video className="w-2.5 h-2.5" />}
                        {ad.media_type === 'image' ? 'IMG' : 'VID'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-muted-foreground">{formatDate(ad.created_at)}</span>
                    <div className="flex gap-2">
                      <button onClick={() => toggleAd(ad.id, ad.is_active)}
                        className="flex items-center gap-1 px-2 py-1 bg-secondary hover:bg-accent text-xs text-muted-foreground rounded-lg transition-colors">
                        {ad.is_active ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {ad.is_active ? 'Désactiver' : 'Activer'}
                      </button>
                      {confirmDeleteAdId === ad.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => deleteAd(ad.id)}
                            className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded-lg transition-colors">
                            <Check className="w-3 h-3" /> Confirmer
                          </button>
                          <button onClick={() => setConfirmDeleteAdId(null)}
                            className="flex items-center gap-1 px-2 py-1 bg-secondary hover:bg-accent text-xs text-muted-foreground rounded-lg transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDeleteAdId(ad.id)}
                          className="flex items-center gap-1 px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-xs text-red-400 rounded-lg transition-colors">
                          <Trash2 className="w-3 h-3" /> Suppr.
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ══════════ BANS TAB ══════════ */}
        {tab === 'bans' && (
          <div>
            {/* Bans section */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-xs text-muted-foreground">{bans.length} bans actifs</span>
              <button onClick={() => { loadBans(); loadMutes(); }} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
                <RefreshCw className={`w-4 h-4 text-muted-foreground ${loadingBans ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loadingBans ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : bans.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">Aucun ban actif</div>
            ) : (
              bans.map(ban => (
                <div key={ban.id} className="px-4 py-3 border-b border-border">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">@{(ban.profile as any)?.username ?? '?'}</p>
                      <p className="text-xs text-muted-foreground">{ban.reason || 'Aucune raison'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${ban.ban_type === 'permanent' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                          {ban.ban_type === 'permanent' ? 'PERMANENT' : 'TEMPORAIRE'}
                        </span>
                        {ban.expires_at && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="w-3 h-3" /> Expire : {formatDate(ban.expires_at)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => unban(ban.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs font-medium rounded-lg transition-colors flex-shrink-0">
                      <Check className="w-3 h-3" /> Débannir
                    </button>
                  </div>
                </div>
              ))
            )}

            {/* Mutes section */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-secondary/40 border-y border-border mt-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Mutes actifs — {mutes.length}
              </span>
            </div>

            {loadingMutes ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : mutes.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">Aucun mute actif</div>
            ) : (
              mutes.map(mute => (
                <div key={mute.id} className="px-4 py-3 border-b border-border">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">@{(mute.profile as any)?.username ?? '?'}</p>
                      <p className="text-xs text-muted-foreground">{mute.reason || 'Aucune raison'}</p>
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                        <Clock className="w-3 h-3" /> Expire : {formatDate(mute.muted_until)}
                      </span>
                    </div>
                    <button onClick={() => unmute(mute.user_id, (mute.profile as any)?.username ?? '?')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 text-xs font-medium rounded-lg transition-colors flex-shrink-0">
                      <Check className="w-3 h-3" /> Unmute
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ══════════ LOUP-GAROU TAB ══════════ */}
        {tab === 'loupgarou' && (
          <div>
            {/* Header + Search */}
            <div className="px-4 py-3 border-b border-border space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-foreground">🐺 Notifications du Jeu</p>
                  <p className="text-[10px] text-muted-foreground">{notifTemplates.length} templates · {notifTemplates.filter(t => t.custom_message).length} personnalisés</p>
                </div>
                <button onClick={loadNotifs} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
                  <RefreshCw className={`w-4 h-4 text-muted-foreground ${loadingNotifs ? 'animate-spin' : ''}`} />
                </button>
              </div>
              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  placeholder="Rechercher une notification..."
                  value={notifSearch}
                  onChange={e => setNotifSearch(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:border-purple-500"
                />
              </div>
              {/* Category filter pills */}
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={() => setNotifFilter('all')}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors ${
                    notifFilter === 'all' ? 'bg-purple-600 text-white' : 'bg-secondary text-muted-foreground hover:bg-accent'
                  }`}
                >Tous</button>
                {Object.entries(NOTIF_CATEGORIES).map(([key, cat]) => (
                  <button
                    key={key}
                    onClick={() => setNotifFilter(key)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors ${
                      notifFilter === key ? 'bg-purple-600 text-white' : 'bg-secondary text-muted-foreground hover:bg-accent'
                    }`}
                  >{cat.emoji} {cat.label}</button>
                ))}
              </div>
            </div>

            {loadingNotifs ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : notifTemplates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                <p>Aucun template trouvé.</p>
                <p className="text-[10px] mt-1">Exécutez la migration SQL pour créer les templates par défaut.</p>
              </div>
            ) : (() => {
              // Group by category
              const search = notifSearch.toLowerCase();
              const filtered = notifTemplates.filter(t => {
                if (notifFilter !== 'all' && t.category !== notifFilter) return false;
                if (search && !t.default_message.toLowerCase().includes(search) && !t.notification_key.toLowerCase().includes(search) && !(t.custom_message || '').toLowerCase().includes(search)) return false;
                return true;
              });

              const grouped: Record<string, GameNotifTemplate[]> = {};
              for (const t of filtered) {
                if (!grouped[t.category]) grouped[t.category] = [];
                grouped[t.category].push(t);
              }

              if (Object.keys(grouped).length === 0) {
                return <div className="text-center py-8 text-muted-foreground text-sm">Aucun résultat</div>;
              }

              return Object.entries(grouped).map(([catKey, templates]) => {
                const cat = NOTIF_CATEGORIES[catKey] || { label: catKey, emoji: '📋', color: 'text-muted-foreground' };
                const isExpanded = expandedCats.has(catKey);

                return (
                  <div key={catKey}>
                    {/* Category header */}
                    <button
                      onClick={() => setExpandedCats(prev => {
                        const next = new Set(prev);
                        if (next.has(catKey)) next.delete(catKey); else next.add(catKey);
                        return next;
                      })}
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-secondary/50 border-b border-border hover:bg-secondary transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{cat.emoji}</span>
                        <span className={`text-xs font-bold uppercase tracking-wide ${cat.color}`}>{cat.label}</span>
                        <span className="text-[10px] text-muted-foreground">({templates.length})</span>
                      </div>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                    </button>

                    {/* Templates in this category */}
                    {isExpanded && templates.map(template => {
                      const isEditing = editingNotif === template.id;
                      const isCustomized = !!template.custom_message || template.media_type !== 'none';
                      const displayMessage = template.custom_message || template.default_message;

                      return (
                        <div key={template.id} className={`px-4 py-3 border-b border-border ${!template.is_active ? 'opacity-40' : ''}`}>
                          {/* Template display */}
                          <div className="flex items-start gap-2">
                            <span className="text-lg flex-shrink-0 mt-0.5">{template.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{template.notification_key}</span>
                                {isCustomized && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400">CUSTOM</span>
                                )}
                                {template.media_type !== 'none' && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 flex items-center gap-0.5">
                                    {template.media_type === 'image' ? <Image className="w-2.5 h-2.5" /> : template.media_type === 'gif' ? '🎞️' : <Video className="w-2.5 h-2.5" />}
                                    {template.media_type.toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-foreground">{displayMessage}</p>
                              {template.custom_message && (
                                <p className="text-[10px] text-muted-foreground mt-0.5 line-through">{template.default_message}</p>
                              )}
                              {/* Media preview */}
                              {template.media_type === 'image' && template.media_url && (
                                <img src={template.media_url} alt="" className="mt-2 w-full max-h-24 object-cover rounded-lg" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              )}
                              {template.media_type === 'gif' && template.media_url && (
                                <img src={template.media_url} alt="" className="mt-2 w-32 h-20 object-cover rounded-lg" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              )}
                              {template.media_type === 'video' && template.media_url && (
                                <div className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-lg">
                                  <Video className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                                  <span className="text-[10px] text-muted-foreground truncate">{template.media_url}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action buttons (when NOT editing) */}
                          {!isEditing && (
                            <div className="flex gap-1.5 mt-2 ml-8">
                              <button onClick={() => startEditNotif(template)}
                                className="flex items-center gap-1 px-2.5 py-1 bg-secondary hover:bg-accent text-muted-foreground text-[11px] font-medium rounded-lg transition-colors">
                                ✏️ Modifier
                              </button>
                              <button onClick={() => toggleNotifActive(template.id, template.is_active)}
                                className="flex items-center gap-1 px-2.5 py-1 bg-secondary hover:bg-accent text-muted-foreground text-[11px] font-medium rounded-lg transition-colors">
                                {template.is_active ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                {template.is_active ? 'Désactiver' : 'Activer'}
                              </button>
                              {isCustomized && (
                                <button onClick={() => resetNotifTemplate(template.id)}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 text-[11px] font-medium rounded-lg transition-colors">
                                  <RotateCcw className="w-3 h-3" /> Reset
                                </button>
                              )}
                            </div>
                          )}

                          {/* Edit form */}
                          {isEditing && (
                            <div className="mt-3 ml-8 space-y-2 p-3 bg-secondary/30 rounded-xl border border-border">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Message personnalisé</p>
                              <textarea
                                placeholder={template.default_message}
                                value={editForm.custom_message}
                                onChange={e => setEditForm(p => ({ ...p, custom_message: e.target.value }))}
                                rows={2}
                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-purple-500 resize-none"
                              />
                              <p className="text-[10px] text-muted-foreground">Variables : <code className="text-purple-400">{'{{player}}'}</code> <code className="text-purple-400">{'{{role}}'}</code> <code className="text-purple-400">{'{{target}}'}</code></p>

                              {/* Media type selector */}
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide pt-1">Média (optionnel)</p>
                              <div className="flex gap-1.5">
                                {(['none', 'image', 'gif', 'video'] as const).map(type => (
                                  <button key={type}
                                    onClick={() => setEditForm(p => ({ ...p, media_type: type, media_url: type === 'none' ? '' : p.media_url }))}
                                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] rounded-lg font-medium transition-colors ${
                                      editForm.media_type === type
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-secondary text-muted-foreground hover:bg-accent'
                                    }`}>
                                    {type === 'none' ? <X className="w-3 h-3" /> : type === 'image' ? <Image className="w-3 h-3" /> : type === 'gif' ? '🎞️' : <Video className="w-3 h-3" />}
                                    {type === 'none' ? 'Aucun' : type === 'image' ? 'Image' : type === 'gif' ? 'GIF' : 'Vidéo'}
                                  </button>
                                ))}
                              </div>
                              {editForm.media_type !== 'none' && (
                                <input
                                  placeholder={editForm.media_type === 'image' ? "URL de l'image" : editForm.media_type === 'gif' ? "URL du GIF" : 'URL YouTube ou MP4'}
                                  value={editForm.media_url}
                                  onChange={e => setEditForm(p => ({ ...p, media_url: e.target.value }))}
                                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-purple-500"
                                />
                              )}
                              {/* Preview media */}
                              {editForm.media_type === 'image' && editForm.media_url && (
                                <img src={editForm.media_url} alt="preview" className="w-full max-h-24 object-cover rounded-lg" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              )}
                              {editForm.media_type === 'gif' && editForm.media_url && (
                                <img src={editForm.media_url} alt="preview" className="w-32 h-20 object-cover rounded-lg" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              )}

                              {/* Save / Cancel */}
                              <div className="flex gap-2 pt-1">
                                <button onClick={() => setEditingNotif(null)}
                                  className="flex-1 py-1.5 bg-secondary hover:bg-accent text-foreground text-xs rounded-lg transition-colors">
                                  Annuler
                                </button>
                                <button onClick={() => saveNotifTemplate(template.id)} disabled={savingNotif}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors">
                                  {savingNotif ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                  {savingNotif ? '...' : 'Sauvegarder'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>

      {/* ── Ban Modal ── */}
      <AnimatePresence>
        {banTarget && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setBanTarget(null)} className="fixed inset-0 bg-black/60 z-[60]" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed bottom-0 left-0 right-0 z-[70] sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-[360px]"
              onClick={e => e.stopPropagation()}>
              <div className="bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl p-4 space-y-3">
                <p className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Ban className="w-4 h-4 text-red-400" /> Bannir @{banTarget.username}
                </p>
                <input placeholder="Raison du ban" value={banReason} onChange={e => setBanReason(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-red-500" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Durée</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {BAN_DURATIONS.map(d => (
                    <button key={d.label} onClick={() => setBanDuration(d.hours)}
                      className={`py-1.5 text-xs rounded-lg font-medium transition-colors ${banDuration === d.hours ? 'bg-red-500 text-white' : 'bg-secondary text-muted-foreground hover:bg-accent'}`}>
                      {d.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setBanTarget(null)} className="flex-1 py-2 bg-secondary hover:bg-accent text-foreground text-sm rounded-xl transition-colors">
                    Annuler
                  </button>
                  <button onClick={handleBan} disabled={banning}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                    {banning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                    {banning ? '...' : 'Bannir'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 pointer-events-none"
            style={{ background: toast.ok ? '#16a34a' : '#dc2626', minWidth: '180px' }}
          >
            {toast.ok
              ? <Check className="w-4 h-4 text-white flex-shrink-0" />
              : <X className="w-4 h-4 text-white flex-shrink-0" />
            }
            <span className="text-sm font-medium text-white">{toast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
