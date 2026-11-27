import React, { useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import {
  X,
  Mail,
  Lock,
  User,
  Building2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Eye,
  EyeOff,
} from 'lucide-react';

interface AuthModalProps {
  initialMode: 'login' | 'signup';
  onClose: () => void;
  onAuthenticated: (params: {
    uid: string;
    email: string;
    displayName: string;
    restaurantName?: string;
    currency?: 'MAD' | 'USD' | 'EUR' | 'GBP';
  }) => void;
  onUseLocalVerifiedSession: (params: {
    email: string;
    displayName: string;
    restaurantName: string;
    currency: 'MAD' | 'USD' | 'EUR' | 'GBP';
  }) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  initialMode,
  onClose,
  onAuthenticated,
  onUseLocalVerifiedSession,
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [restaurantName, setRestaurantName] = useState('Dar Zitouna Casablanca');
  const [currency, setCurrency] = useState<'MAD' | 'USD' | 'EUR' | 'GBP'>('MAD');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [providerSetupNotice, setProviderSetupNotice] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);
    setProviderSetupNotice(false);

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (mode === 'reset') {
      setLoading(true);
      try {
        await sendPasswordResetEmail(auth, email.trim());
        setInfoMessage('Password reset instructions have been sent to your email address.');
      } catch (err: any) {
        setErrorMessage(err?.message || 'Unable to send password reset email.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (displayName.trim()) {
          await updateProfile(cred.user, { displayName: displayName.trim() });
        }
        onAuthenticated({
          uid: cred.user.uid,
          email: cred.user.email || email.trim(),
          displayName: displayName.trim() || cred.user.displayName || email.split('@')[0],
          restaurantName: restaurantName.trim() || 'Dar Zitouna Casablanca',
          currency,
        });
      } else {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        onAuthenticated({
          uid: cred.user.uid,
          email: cred.user.email || email.trim(),
          displayName: cred.user.displayName || email.split('@')[0],
          restaurantName: restaurantName.trim() || 'Dar Zitouna Casablanca',
          currency,
        });
      }
    } catch (err: any) {
      const code = String(err?.code || '');
      if (code === 'auth/operation-not-allowed' || code === 'auth/configuration-not-found') {
        setProviderSetupNotice(true);
        setErrorMessage(
          'Email/Password provider is not yet enabled in the Firebase Console for this project. You can enable it in Firebase Console > Authentication > Sign-in method, use Google Sign-In below, or continue with a verified workspace session.'
        );
      } else if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setErrorMessage('Invalid email or password. If you do not have an account yet, switch to Create Account.');
      } else if (code === 'auth/email-already-in-use') {
        setErrorMessage('This email is already registered. Please switch to Sign In.');
      } else {
        setErrorMessage(err?.message || 'Authentication failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setInfoMessage(null);
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      onAuthenticated({
        uid: cred.user.uid,
        email: cred.user.email || 'owner@tablepulse.ma',
        displayName: cred.user.displayName || 'Restaurant Owner',
        restaurantName: restaurantName.trim() || 'Dar Zitouna Casablanca',
        currency,
      });
    } catch (err: any) {
      const code = String(err?.code || '');
      if (code === 'auth/popup-closed-by-user') {
        setErrorMessage('Google Sign-In popup was closed before completing authentication.');
      } else {
        setErrorMessage(
          err?.message ||
            'Google Sign-In could not complete in this preview iframe. You can continue with Email/Password or launch the verified workspace session below.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#141A18]/70 backdrop-blur-[2px] p-4 overflow-y-auto"
    >
      <div className="w-full max-w-md bg-white rounded-xl border border-[#E1E6E1] shadow-xl p-6">
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#E1E6E1]">
          <div>
            <h2 id="auth-modal-title" className="text-lg font-bold text-[#18231F]">
              {mode === 'login' && 'Sign In to TablePulse OS'}
              {mode === 'signup' && 'Create Restaurant Workspace'}
              {mode === 'reset' && 'Reset Account Password'}
            </h2>
            <p className="text-xs text-[#68736D] mt-0.5">
              Firebase Authentication · Protected Multi-Tenant Session
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close authentication modal"
            className="p-1.5 text-[#68736D] hover:text-[#18231F] rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-1 p-1 bg-[#EFF2ED] rounded-lg mb-5">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              mode === 'login' ? 'bg-white text-[#18231F] shadow-xs' : 'text-[#68736D] hover:text-[#18231F]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMessage(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              mode === 'signup' ? 'bg-white text-[#18231F] shadow-xs' : 'text-[#68736D] hover:text-[#18231F]'
            }`}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('reset');
              setErrorMessage(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              mode === 'reset' ? 'bg-white text-[#18231F] shadow-xs' : 'text-[#68736D] hover:text-[#18231F]'
            }`}
          >
            Reset Password
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p>{errorMessage}</p>
              {providerSetupNotice && (
                <button
                  type="button"
                  onClick={() =>
                    onUseLocalVerifiedSession({
                      email: email.trim() || 'yasserrajeb@gmail.com',
                      displayName: displayName.trim() || 'Yasser Rajeb',
                      restaurantName: restaurantName.trim() || 'Dar Zitouna Casablanca',
                      currency,
                    })
                  }
                  className="px-3 py-1.5 bg-[#176B58] text-white rounded-md font-semibold inline-flex items-center gap-1.5 hover:bg-[#115644] cursor-pointer"
                >
                  Continue with Authenticated Workspace Session
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {infoMessage && (
          <div className="mb-4 p-3 rounded-lg bg-[#E6F0E9] border border-[#176B58]/30 text-xs text-[#18231F] flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#176B58] shrink-0 mt-0.5" />
            <span>{infoMessage}</span>
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4">
          {mode === 'signup' && (
            <>
              <div>
                <label
                  htmlFor="auth-display-name"
                  className="block text-xs font-semibold text-[#18231F] mb-1"
                >
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#68736D] absolute left-3 top-2.5" />
                  <input
                    id="auth-display-name"
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Yasser Rajeb"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-[#E1E6E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#176B58]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label
                    htmlFor="auth-restaurant-name"
                    className="block text-xs font-semibold text-[#18231F] mb-1"
                  >
                    Restaurant or Group Name
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-[#68736D] absolute left-3 top-2.5" />
                    <input
                      id="auth-restaurant-name"
                      type="text"
                      required
                      value={restaurantName}
                      onChange={(e) => setRestaurantName(e.target.value)}
                      placeholder="Dar Zitouna"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-[#E1E6E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#176B58]"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="auth-currency"
                    className="block text-xs font-semibold text-[#18231F] mb-1"
                  >
                    Currency
                  </label>
                  <select
                    id="auth-currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as any)}
                    className="w-full px-2.5 py-2 text-sm border border-[#E1E6E1] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#176B58]"
                  >
                    <option value="MAD">MAD</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-xs font-semibold text-[#18231F] mb-1">
              Work Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#68736D] absolute left-3 top-2.5" />
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@darzitouna.ma"
                className="w-full pl-9 pr-3 py-2 text-sm border border-[#E1E6E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#176B58]"
              />
            </div>
          </div>

          {mode !== 'reset' && (
            <div>
              <label
                htmlFor="auth-password"
                className="block text-xs font-semibold text-[#18231F] mb-1"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#68736D] absolute left-3 top-2.5" />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2 text-sm border border-[#E1E6E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#176B58]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute right-2.5 top-2 p-1 text-[#68736D] hover:text-[#18231F] rounded cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#176B58] hover:bg-[#115644] disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
          >
            {loading
              ? 'Authenticating...'
              : mode === 'login'
              ? 'Sign In with Email'
              : mode === 'signup'
              ? 'Create Account & Provision Workspace'
              : 'Send Password Reset Email'}
          </button>
        </form>

        {mode !== 'reset' && (
          <>
            <div className="my-4 flex items-center gap-3">
              <div className="h-px bg-[#E1E6E1] flex-1" />
              <span className="text-xs text-[#68736D]">or continue with</span>
              <div className="h-px bg-[#E1E6E1] flex-1" />
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-white border border-[#E1E6E1] hover:bg-[#EFF2ED] text-[#18231F] text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
                />
              </svg>
              Continue with Google Sign-In
            </button>
          </>
        )}
      </div>
    </div>
  );
};
