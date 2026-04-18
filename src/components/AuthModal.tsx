import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User, Eye, EyeOff, Loader2, Sparkles, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type AuthTab = 'signin' | 'signup' | 'forgot';

export default function AuthModal() {
  const {
    showAuthModal,
    setShowAuthModal,
    authModalMessage,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    signInWithGoogle,
    isLoading,
    error,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<AuthTab>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Rate limiting: max 5 failed sign-in attempts → 60s cooldown
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [lockoutSecondsLeft, setLockoutSecondsLeft] = useState(0);
  const lockoutTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (lockoutUntil === null) return;
    lockoutTimerRef.current = setInterval(() => {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockoutUntil(null);
        setLockoutSecondsLeft(0);
        setFailedAttempts(0);
        clearInterval(lockoutTimerRef.current!);
      } else {
        setLockoutSecondsLeft(remaining);
      }
    }, 1000);
    return () => clearInterval(lockoutTimerRef.current!);
  }, [lockoutUntil]);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setUsername('');
    setLocalError(null);
    setSuccessMessage(null);
  };

  const handleClose = () => {
    setShowAuthModal(false);
    resetForm();
  };

  const handleTabChange = (tab: AuthTab) => {
    setActiveTab(tab);
    resetForm();
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (lockoutUntil && Date.now() < lockoutUntil) {
      setLocalError(`Too many failed attempts. Try again in ${lockoutSecondsLeft}s.`);
      return;
    }

    if (!email || !password) {
      setLocalError('Please fill in all fields');
      return;
    }

    const result = await signInWithEmail(email, password);
    if (result.error) {
      const next = failedAttempts + 1;
      setFailedAttempts(next);
      if (next >= 5) {
        const until = Date.now() + 60_000;
        setLockoutUntil(until);
        setLockoutSecondsLeft(60);
        setLocalError('Too many failed attempts. Please wait 60 seconds.');
      } else {
        setLocalError(`${result.error} (${5 - next} attempt${5 - next === 1 ? '' : 's'} left)`);
      }
    } else {
      setFailedAttempts(0);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !password || !username) {
      setLocalError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    if (username.length < 2) {
      setLocalError('Le nom doit contenir au moins 2 caractères');
      return;
    }

    const result = await signUpWithEmail(email, password, username);
    if (result.error) {
      setLocalError(result.error);
    } else if (result.needsEmailConfirmation) {
      setSuccessMessage('Compte créé! Vérifiez votre email pour confirmer votre compte.');
    } else {
      setSuccessMessage('Compte créé avec succès! Vous êtes connecté.');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email) {
      setLocalError('Entrez votre adresse email');
      return;
    }

    const result = await resetPassword(email);
    if (result.error) {
      setLocalError(result.error);
    } else {
      setSuccessMessage('Email de réinitialisation envoyé! Vérifiez votre boîte de réception.');
    }
  };

  if (!showAuthModal) return null;

  return (
    <AnimatePresence>
      {showAuthModal && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 mx-auto max-w-[340px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-b from-gray-900 to-gray-950 rounded-2xl shadow-2xl border border-gray-800 overflow-hidden">
              {/* Header with gradient */}
              <div className="relative bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 px-5 py-4">
                <button
                  onClick={handleClose}
                  className="absolute top-3 right-3 p-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>

                <div className="flex items-center gap-2 mb-1">
                  {activeTab === 'forgot' && (
                    <button
                      onClick={() => handleTabChange('signin')}
                      className="p-1 hover:bg-white/20 rounded-full transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4 text-white" />
                    </button>
                  )}
                  <Sparkles className="w-5 h-5 text-yellow-300" />
                  <h2 className="text-lg font-bold text-white">
                    {activeTab === 'signin' ? 'Welcome back!' : activeTab === 'signup' ? 'Join us!' : 'Reset password'}
                  </h2>
                </div>
                <p className="text-white/80 text-xs">{authModalMessage}</p>
              </div>

              {/* Tabs (hidden for forgot password) */}
              {activeTab !== 'forgot' && (
                <div className="px-5 pt-4">
                  <div className="flex bg-gray-800/50 rounded-xl p-1 border border-gray-700">
                    <button
                      onClick={() => handleTabChange('signin')}
                      className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                        activeTab === 'signin'
                          ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-lg'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Sign in
                    </button>
                    <button
                      onClick={() => handleTabChange('signup')}
                      className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                        activeTab === 'signup'
                          ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-lg'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Sign up
                    </button>
                  </div>
                </div>
              )}

              {/* Form */}
              <form
                onSubmit={activeTab === 'signin' ? handleEmailSignIn : activeTab === 'signup' ? handleEmailSignUp : handleForgotPassword}
                className="px-5 py-4 space-y-4"
              >
                {/* Error Message */}
                <AnimatePresence>
                  {(localError || error) && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl"
                    >
                      <p className="text-xs text-red-400 font-medium">{localError || error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Success Message */}
                <AnimatePresence>
                  {successMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-3 bg-green-500/20 border border-green-500/40 rounded-xl"
                    >
                      <p className="text-xs text-green-400 font-medium">{successMessage}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Forgot password description */}
                {activeTab === 'forgot' && (
                  <p className="text-xs text-gray-400">
                    Entrez votre email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
                  </p>
                )}

                {/* Name (Sign up only) */}
                {activeTab === 'signup' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-2">
                      Nom
                    </label>
                    <div className="relative">
                      <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center bg-gray-800 rounded-l-xl border-r border-gray-700">
                        <User className="w-4 h-4 text-purple-400" />
                      </div>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Votre nom"
                        className="w-full bg-gray-800/50 border-2 border-gray-700 rounded-xl pl-12 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                      />
                    </div>
                  </div>
                )}

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center bg-gray-800 rounded-l-xl border-r border-gray-700">
                      <Mail className="w-4 h-4 text-purple-400" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full bg-gray-800/50 border-2 border-gray-700 rounded-xl pl-12 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Password (not for forgot) */}
                {activeTab !== 'forgot' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center bg-gray-800 rounded-l-xl border-r border-gray-700">
                        <Lock className="w-4 h-4 text-purple-400" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-gray-800/50 border-2 border-gray-700 rounded-xl pl-12 pr-10 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4 text-gray-400" />
                        ) : (
                          <Eye className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Confirm Password (Sign up only) */}
                {activeTab === 'signup' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center bg-gray-800 rounded-l-xl border-r border-gray-700">
                        <Lock className="w-4 h-4 text-purple-400" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-gray-800/50 border-2 border-gray-700 rounded-xl pl-12 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                      />
                    </div>
                  </div>
                )}

                {/* Forgot Password (Sign in only) */}
                {activeTab === 'signin' && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => handleTabChange('forgot')}
                      className="text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={isLoading || (lockoutUntil !== null && Date.now() < lockoutUntil)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:from-purple-500 hover:via-violet-500 hover:to-indigo-500 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/30"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Please wait...</span>
                    </>
                  ) : lockoutUntil !== null && Date.now() < lockoutUntil ? (
                    `Wait ${lockoutSecondsLeft}s`
                  ) : activeTab === 'signin' ? (
                    'Sign in'
                  ) : activeTab === 'signup' ? (
                    'Create account'
                  ) : (
                    'Send reset link'
                  )}
                </motion.button>

                {/* Divider + Google Sign-in */}
                {activeTab !== 'forgot' && (
                  <>
                    <div className="flex items-center gap-3 py-1">
                      <div className="flex-1 h-px bg-gray-700" />
                      <span className="text-xs text-gray-500">or</span>
                      <div className="flex-1 h-px bg-gray-700" />
                    </div>

                    <button
                      type="button"
                      onClick={signInWithGoogle}
                      className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-transparent border-2 border-cyan-500 hover:bg-cyan-500/10 text-white text-sm font-semibold rounded-xl transition-all"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Continue with Google
                    </button>
                  </>
                )}

                {/* Switch Tab Link */}
                {activeTab !== 'forgot' && (
                  <p className="text-center text-xs text-gray-500 pt-2">
                    {activeTab === 'signin' ? (
                      <>
                        Don&apos;t have an account?{' '}
                        <button
                          type="button"
                          onClick={() => handleTabChange('signup')}
                          className="text-purple-400 hover:text-purple-300 font-semibold"
                        >
                          Sign up
                        </button>
                      </>
                    ) : (
                      <>
                        Already have an account?{' '}
                        <button
                          type="button"
                          onClick={() => handleTabChange('signin')}
                          className="text-purple-400 hover:text-purple-300 font-semibold"
                        >
                          Sign in
                        </button>
                      </>
                    )}
                  </p>
                )}
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
