import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { User, AuthState } from '../types';

// ============================================
// AUTH CONTEXT - User Authentication State
// ============================================

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string, username: string) => Promise<void>;
  updateProfile: (updates: Partial<User>) => void;
  currentUser: User | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock current user for development
const mockCurrentUser: User = {
  id: '1',
  username: 'you',
  displayName: 'NeolJova',
  avatarColor: '#3b82f6',
  bio: 'Live chat enthusiast | Love connecting with people 🌟',
  pronouns: 'they/them',
  isCurrentUser: true,
  isActive: true,
  socialLinks: {
    tiktok: 'https://tiktok.com/@neoljova',
    instagram: 'https://instagram.com/neoljova',
    telegram: 'https://t.me/neoljova',
    twitter: 'https://twitter.com/neoljova',
  },
  badge: {
    name: 'New Cadet',
    icon: '★',
    color: 'orange',
  },
};

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(mockCurrentUser);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // TODO: Replace with Supabase auth
      // const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      setUser(mockCurrentUser);
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    // TODO: Replace with Supabase auth
    // await supabase.auth.signOut();
    setUser(null);
  }, []);

  const register = useCallback(async (email: string, password: string, username: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // TODO: Replace with Supabase auth
      // const { data, error } = await supabase.auth.signUp({ email, password });
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      setUser({ ...mockCurrentUser, username, displayName: username });
    } catch (err) {
      setError('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateProfile = useCallback((updates: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
    // TODO: Sync with Supabase
    // await supabase.from('users').update(updates).eq('id', user.id);
  }, []);

  const value: AuthContextType = {
    user: user ? { id: user.id, email: '', username: user.username, isAuthenticated: true } : null,
    currentUser: user,
    isLoading,
    error,
    login,
    logout,
    register,
    updateProfile,
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
