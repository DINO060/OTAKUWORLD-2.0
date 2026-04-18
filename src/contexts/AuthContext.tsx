import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User as AppUser } from '../types';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

// ============================================
// AUTH CONTEXT - Supabase Authentication
// ============================================

interface AuthContextType {
  // Auth state
  user: SupabaseUser | null;
  session: Session | null;
  profile: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isBanned: boolean;
  banReason: string | null;
  isMuted: boolean;
  mutedUntil: string | null;

  // Auth actions
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
  signUpWithEmail: (email: string, password: string, username: string) => Promise<{ error?: string; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;

  // Profile actions
  updateProfile: (updates: Partial<AppUser>) => Promise<{ error?: string }>;

  // Auth gate
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  authModalMessage: string;
  requireAuth: (message?: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMessage, setAuthModalMessage] = useState('Sign in to continue');
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [mutedUntil, setMutedUntil] = useState<string | null>(null);

  // Check if user is banned or muted
  const checkBanStatus = async (userId: string) => {
    try {
      const now = new Date().toISOString();
      // Check active bans (permanent or not yet expired)
      const { data: banData } = await supabase
        .from('bans')
        .select('reason, expires_at')
        .eq('user_id', userId)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .limit(1)
        .maybeSingle();

      if (banData) {
        setIsBanned(true);
        setBanReason(banData.reason || 'Vous avez été banni.');
        // Sign out banned users
        supabase.auth.signOut();
        return true; // banned
      }

      setIsBanned(false);
      setBanReason(null);

      // Check active mutes
      const { data: muteData } = await supabase
        .from('mutes')
        .select('muted_until')
        .eq('user_id', userId)
        .gt('muted_until', now)
        .limit(1)
        .maybeSingle();

      if (muteData) {
        setIsMuted(true);
        setMutedUntil(muteData.muted_until);
      } else {
        setIsMuted(false);
        setMutedUntil(null);
      }

      return false; // not banned
    } catch (err) {
      console.error('Error checking ban status:', err);
      return false;
    }
  };

  // Generate deterministic avatar color based on user ID
  const getColorForId = (id: string) => {
    const colors = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash) + id.charCodeAt(i);
      hash |= 0;
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Fetch user profile from database
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      if (data) {
        const appUser: AppUser = {
          id: data.id,
          username: data.username,
          handle: data.handle || undefined,
          displayName: data.username,
          avatarColor: getColorForId(data.id),
          avatarImage: data.avatar_url || undefined,
          bio: data.bio || '',
          isCurrentUser: true,
          isActive: true,
          allowDms: data.allow_dms !== false, // default true if null
          isAdmin: data.is_admin === true,
          matureFilter: data.mature_filter || 'blur',
        };
        setProfile(appUser);
        // Check ban/mute status (fire-and-forget)
        checkBanStatus(data.id);
        return appUser;
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    }
    return null;
  };

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Don't await - let it load in background
        fetchProfile(session.user.id);
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    // IMPORTANT: Do NOT use async/await here - it blocks Supabase auth flow
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'SIGNED_IN' && session?.user) {
          // Don't await - let it load in background
          fetchProfile(session.user.id);
          setShowAuthModal(false);
        }

        if (event === 'SIGNED_OUT') {
          setProfile(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sign in with Google OAuth
  const signInWithGoogle = useCallback(async () => {
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
      throw err;
    }
  }, []);

  // Sign in with email/password
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    console.log('🔐 Starting sign in for:', email);
    setError(null);
    setIsLoading(true);

    try {
      console.log('📡 Sending request to Supabase...');

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('📥 Response received:', { data: !!data, error: error?.message });

      if (error) {
        // Provide more helpful error messages
        let errorMessage = error.message;
        console.log('❌ Auth error:', error.message);

        if (error.message === 'Invalid login credentials') {
          errorMessage = 'Email ou mot de passe incorrect. Vérifiez aussi que votre email est confirmé.';
        } else if (error.message === 'Email not confirmed') {
          errorMessage = 'Veuillez confirmer votre email avant de vous connecter.';
        }
        setError(errorMessage);
        setIsLoading(false);
        return { error: errorMessage };
      }

      if (data?.user) {
        console.log('✅ User authenticated:', data.user.id);
        await fetchProfile(data.user.id);
      }

      setIsLoading(false);
      return {};
    } catch (err: any) {
      console.error('💥 Exception during sign in:', err);
      const message = err.message || 'Failed to sign in';
      setError(message);
      setIsLoading(false);
      return { error: message };
    }
  }, []);

  // Sign up with email/password
  const signUpWithEmail = useCallback(async (email: string, password: string, username: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          },
        },
      });

      if (error) {
        // Provide more helpful error messages
        let errorMessage = error.message;
        if (error.message.includes('rate limit')) {
          errorMessage = 'Trop de tentatives. Attendez quelques minutes avant de réessayer.';
        }
        setError(errorMessage);
        return { error: errorMessage };
      }

      // Profile is auto-created by trigger, but we can update username + generate default handle
      if (data.user) {
        const defaultHandle = username.toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + Math.random().toString(36).substring(2, 6);
        await supabase
          .from('profiles')
          .update({ username, handle: defaultHandle })
          .eq('id', data.user.id);
      }

      // Check if email confirmation is required
      // If session is null but user exists, email confirmation is pending
      if (data.user && !data.session) {
        return { needsEmailConfirmation: true };
      }

      return {};
    } catch (err: any) {
      const message = err.message || 'Failed to create account';
      setError(message);
      return { error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    setError(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setProfile(null);
    } catch (err: any) {
      setError(err.message || 'Failed to sign out');
    }
  }, []);

  // Reset password
  const resetPassword = useCallback(async (email: string) => {
    setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to send reset email' };
    }
  }, []);

  // Update profile
  const updateProfile = useCallback(async (updates: Partial<AppUser>) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.username    !== undefined) dbUpdates.username   = updates.username;
      if (updates.handle      !== undefined) dbUpdates.handle     = updates.handle || null;
      if (updates.bio         !== undefined) dbUpdates.bio        = updates.bio;
      if (updates.avatarImage !== undefined) dbUpdates.avatar_url = updates.avatarImage;
      if (updates.allowDms    !== undefined) dbUpdates.allow_dms  = updates.allowDms;
      if (updates.matureFilter !== undefined) dbUpdates.mature_filter = updates.matureFilter;

      const { error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('id', user.id);

      if (error) {
        return { error: error.message };
      }

      setProfile(prev => prev ? { ...prev, ...updates } : null);
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to update profile' };
    }
  }, [user]);

  // Auth gate - check if user is authenticated, show modal if not
  const requireAuth = useCallback((message?: string): boolean => {
    if (user) return true;

    setAuthModalMessage(message || 'Sign in to continue');
    setShowAuthModal(true);
    return false;
  }, [user]);

  const value: AuthContextType = {
    user,
    session,
    profile,
    isAuthenticated: !!user,
    isLoading,
    error,
    isBanned,
    banReason,
    isMuted,
    mutedUntil,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    resetPassword,
    updateProfile,
    showAuthModal,
    setShowAuthModal,
    authModalMessage,
    requireAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
