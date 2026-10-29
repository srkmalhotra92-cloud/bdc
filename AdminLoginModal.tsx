import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { getGoogleAccessToken } from '../../lib/googleAuth';
import { sendGmail, buildOtpEmailHtml } from '../../lib/gmail';
import {
  X,
  Mail,
  ShieldAlert,
  ArrowRight,
  AlertCircle,
  KeyRound,
  ArrowLeft,
  CheckCircle2,
  Send,
  Hash,
  ShieldCheck,
  Zap,
  Lock
} from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { login, loginWithGoogle } = useAuth();
  const [view, setView] = useState<'login' | 'forgot_request' | 'forgot_verify'>('login');

  // Login states
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // Forgot password states
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMaskedEmail, setForgotMaskedEmail] = useState('');
  const [otpPreview, setOtpPreview] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dispatchMethod, setDispatchMethod] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setError('Please provide your Administrator Email and Password');
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      await login(identifier.trim(), password, 'admin');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify administrator credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAdminLogin = async () => {
    setError(null);
    setSuccessMsg(null);
    setGoogleLoading(true);
    try {
      const user = await loginWithGoogle('admin');
      if (user.role !== 'admin') {
        setError('This Google account does not have administrator privileges. Please sign in with an administrator email.');
        return;
      }
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Google administrator sign-in failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSendAdminOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) {
      setError('Please enter your Administrator Email address');
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const token = await getGoogleAccessToken();
      const res = await api.sendAdminForgotPasswordOtp(forgotIdentifier.trim(), token || undefined);
      setForgotEmail(res.email);
      setForgotMaskedEmail(res.masked_email);
      setOtpPreview(res.otp_preview || null);
      setDispatchMethod(res.sent_via || 'gmail_api');
      setView('forgot_verify');
      setSuccessMsg(res.message);

      // If client has genuine Google token and otp is available, also ensure direct client-side delivery
      if (token && token.startsWith('ya29.') && res.otp_preview) {
        try {
          await sendGmail({
            to: res.email,
            subject: 'Begusarai Digital Center - Administrator Password Reset OTP',
            htmlBody: buildOtpEmailHtml({
              role: 'admin',
              recipientName: 'Administrator',
              otpCode: res.otp_preview
            }),
            token
          });
          console.log('[CLIENT GMAIL] Real email sent to', res.email);
        } catch (mailErr) {
          console.warn('[CLIENT GMAIL WARNING]', mailErr);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch verification code. Please check your Administrator email.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndResetAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const res = await api.verifyAdminResetPassword({
        email: forgotEmail,
        otp: otpCode.trim(),
        new_password: newPassword
      });

      setIdentifier(forgotEmail);
      setPassword('');
      setView('login');
      setOtpCode('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMsg(res.message || 'Administrator password updated successfully! Please sign in with your new password.');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please check your verification code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header - Staff / Admin Console Branding */}
        <div className="bg-slate-900 text-white p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Examiner & Admin Portal</h3>
              <p className="text-xs text-purple-300 font-medium">Restricted Controller Console</p>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-3 border-t border-slate-800 pt-2.5">
            Authorized examination invigilators, question authors, and system administrators only.
          </p>
        </div>

        {/* Back navigation button if in forgot password mode */}
        {view !== 'login' && (
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setView('login');
                setError(null);
                setSuccessMsg(null);
              }}
              className="text-xs font-bold text-slate-600 hover:text-purple-700 flex items-center space-x-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Admin Login</span>
            </button>
            <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
              Admin Password Recovery
            </span>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6">
          {/* Success Message Banner */}
          {successMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="font-semibold leading-relaxed">{successMsg}</div>
            </div>
          )}

          {/* Error Message Banner */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* VIEW 1: ADMIN LOGIN */}
          {view === 'login' && (
            <div className="space-y-4">
              {/* Official Google Sign-In for Admin */}
              <button
                type="button"
                onClick={handleGoogleAdminLogin}
                disabled={googleLoading || loading}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 shadow-2xs transition flex items-center justify-center space-x-2.5 cursor-pointer disabled:opacity-50"
              >
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
                <span>{googleLoading ? 'Signing in with Google...' : 'Sign In with Google (Admin)'}</span>
              </button>

              <div className="relative flex py-1 items-center">
                <div className="grow border-t border-slate-200"></div>
                <span className="shrink mx-3 text-[11px] text-slate-400 font-semibold uppercase">Or with Password</span>
                <div className="grow border-t border-slate-200"></div>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Administrator Email Address *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. rudrarock38@gmail.com or admin@cbt.com"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-hidden transition"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700">
                      Administrator Password *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setView('forgot_request');
                        setForgotIdentifier(identifier);
                        setError(null);
                        setSuccessMsg(null);
                      }}
                      className="text-[11px] font-semibold text-purple-600 hover:text-purple-800 cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter administrator password"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-hidden transition"
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    <span>{loading ? 'Authenticating Administrator...' : 'Sign In to Admin Console'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* VIEW 2: ADMIN FORGOT PASSWORD - STEP 1 (REQUEST OTP TO GMAIL) */}
          {view === 'forgot_request' && (
            <form onSubmit={handleSendAdminOtp} className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 space-y-1">
                <div className="font-bold flex items-center space-x-1.5">
                  <Mail className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Admin Verification OTP via Gmail</span>
                </div>
                <p className="text-[11px] text-purple-700 leading-relaxed">
                  Enter your Administrator Gmail address. A 6-digit verification code will be sent to your Gmail inbox.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Administrator Email Address *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    placeholder="e.g. rudrarock38@gmail.com or admin@cbt.com"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-hidden transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{loading ? 'Dispatching OTP to Gmail...' : 'Send Verification OTP to Gmail'}</span>
              </button>
            </form>
          )}

          {/* VIEW 3: ADMIN FORGOT PASSWORD - STEP 2 (VERIFY OTP & RESET) */}
          {view === 'forgot_verify' && (
            <form onSubmit={handleVerifyAndResetAdminPassword} className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>OTP Dispatched</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleSendAdminOtp}
                    disabled={loading}
                    className="text-[11px] font-bold text-purple-700 hover:underline cursor-pointer"
                  >
                    Resend Code
                  </button>
                </div>
                <p className="text-[11px] text-purple-800">
                  Gmail Account: <strong className="font-mono">{forgotMaskedEmail || forgotEmail}</strong>
                </p>

                {/* Instant Verification Code Card with 1-Click Auto-Fill */}
                {otpPreview && (
                  <div className="mt-2 pt-2 border-t border-purple-200 bg-white p-2.5 rounded-lg border flex items-center justify-between shadow-2xs">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
                        Live Verification OTP
                      </span>
                      <span className="font-mono text-base font-black text-purple-900 tracking-widest">
                        {otpPreview}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOtpCode(otpPreview)}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] rounded-lg shadow-2xs transition flex items-center space-x-1 cursor-pointer"
                    >
                      <Zap className="w-3 h-3 text-amber-300" />
                      <span>Auto-Fill OTP</span>
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  6-Digit Verification OTP *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Hash className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit OTP code"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl font-mono font-bold text-center tracking-widest text-sm text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-hidden transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  New Administrator Password (Minimum 6 characters) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new administrator password"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-hidden transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new administrator password"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-hidden transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{loading ? 'Verifying OTP & Updating...' : 'Verify OTP & Reset Admin Password'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
