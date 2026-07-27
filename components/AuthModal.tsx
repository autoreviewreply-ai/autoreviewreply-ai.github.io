'use client'

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User, Calendar, Image as ImageIcon, Sparkles, Building, KeyRound, Check } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode: 'login' | 'signup';
  onAuthSuccess: (user: any) => void;
  onContinueWithGoogle: () => void; 
}

export default function AuthModal({ isOpen, onClose, initialMode, onAuthSuccess, onContinueWithGoogle }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [birthday, setBirthday] = useState('');
  const [avatar, setAvatar] = useState('');
  const [avatarFile, setAvatarFile] = useState<string | null>(null);

  const cleanForm = () => {
    setFullName('');
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setBirthday('');
    setAvatar('');
    setAvatarFile(null);
    setError(null);
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarFile(reader.result as string);
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'signup') {
      if (!fullName || !username || !email || !password || !confirmPassword || !birthday) {
        setError('All standard registration fields are required.');
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        setLoading(false);
        return;
      }
    } else {
      if (!email || !password) {
        setError('Please provide email and password.');
        setLoading(false);
        return;
      }
    }

    try {
      const payload = {
        action: mode,
        fullName,
        username,
        email,
        password,
        birthday,
        avatar: avatar || avatarFile || undefined
      };

      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      onAuthSuccess(data.user);
      cleanForm();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto" id="auth-modal">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden w-full max-w-lg relative p-8 space-y-6"
        >
          {/* Close trigger */}
          <button
            onClick={onClose}
            className="absolute right-6 top-6 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
            id="close-auth-modal"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Title */}
          <div className="text-center space-y-2">
            <div className="h-12 w-12 bg-[#2563eb] text-white flex items-center justify-center rounded-2xl mx-auto shadow-md">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-display font-extrabold text-[#1e293b] tracking-tight">
              {mode === 'login' ? 'Welcome Back!' : 'Create Your Account'}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {mode === 'login' 
                ? 'Manage reviews and auto-response strategies in real-time.' 
                : 'Complete the form to register your professional business account.'}
            </p>
          </div>

          {/* Errors */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-xl text-xs font-semibold leading-relaxed" id="auth-error">
              {error}
            </div>
          )}

          {/* Social Sign In Button */}
          <button
            type="button"
            onClick={() => {
              onContinueWithGoogle();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer hover:border-slate-300 transition"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.54 14.98 1 12 1 7.35 1 3.37 3.68 1.48 7.6l3.87 3C6.27 7.6 8.9 5.04 12 5.04z"
              />
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.43 3.58l3.77 2.92c2.2-2.03 3.69-5.02 3.69-8.65z"
              />
              <path
                fill="#FBBC05"
                d="M5.35 14.4c-.23-.69-.36-1.43-.36-2.2s.13-1.51.36-2.2L1.48 7.01C.53 8.9 0 11.01 0 13.2s.53 4.3 1.48 6.19l3.87-3c-.23-.7-.36-1.44-.36-2.21z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.24 0 5.95-1.08 7.93-2.92l-3.77-2.92c-1.1.74-2.52 1.18-4.16 1.18-3.1 0-5.73-2.56-6.65-5.56l-3.87 3C3.37 20.32 7.35 23 12 23z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-x-0 h-px bg-slate-100" />
            <span className="relative px-3 bg-white text-[10px] uppercase font-bold tracking-widest text-slate-400">
              Or Use Credentials
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                {/* Profile Pic Upload (Optional) */}
                <div className="flex items-center gap-4 bg-slate-50 border border-slate-200/60 p-3.5 rounded-2xl">
                  <div className="h-12 w-12 rounded-xl bg-slate-200 flex items-center justify-center overflow-hidden border border-slate-300 relative shrink-0">
                    {avatarFile ? (
                      <img src={avatarFile} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-700 block">Avatar Photo (Optional)</span>
                    <label className="inline-block px-3 py-1 bg-white border border-slate-200 text-[10px] font-bold rounded-lg cursor-pointer hover:bg-slate-50 transition">
                      Upload Image
                      <input type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
                    </label>
                  </div>
                </div>

                {/* Full Name & Username in 2 columns */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Full Name</label>
                    <div className="relative">
                      <User className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Dr. Evelyn Carter"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full text-xs font-semibold px-4 py-3 pl-10 border border-slate-200 rounded-xl focus:outline-none focus:border-[#2563eb]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Username</label>
                    <div className="relative">
                      <KeyRound className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="evelyncarter"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full text-xs font-semibold px-4 py-3 pl-10 border border-slate-200 rounded-xl focus:outline-none focus:border-[#2563eb]"
                      />
                    </div>
                  </div>
                </div>

                {/* Birthday Input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Birthday</label>
                  <div className="relative">
                    <Calendar className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="date"
                      value={birthday}
                      onChange={(e) => setBirthday(e.target.value)}
                      className="w-full text-xs font-semibold px-4 py-3 pl-10 border border-slate-200 rounded-xl focus:outline-none focus:border-[#2563eb]"
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 leading-normal">Required for your personalized birthday celebration greetings dashboard banner.</p>
                </div>
              </>
            )}

            {/* Email Address */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Email Address</label>
              <div className="relative">
                <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  placeholder="evelyn.carter@pearlsmiledental.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs font-semibold px-4 py-3 pl-10 border border-slate-200 rounded-xl focus:outline-none focus:border-[#2563eb]"
                />
              </div>
            </div>

            {/* Passwords */}
            <div className={`grid ${mode === 'signup' ? 'grid-cols-2 gap-4' : 'grid-cols-1'}`}>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Password</label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-xs font-semibold px-4 py-3 pl-10 border border-slate-200 rounded-xl focus:outline-none focus:border-[#2563eb]"
                  />
                </div>
              </div>

              {mode === 'signup' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Confirm Password</label>
                  <div className="relative">
                    <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full text-xs font-semibold px-4 py-3 pl-10 border border-slate-200 rounded-xl focus:outline-none focus:border-[#2563eb]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Submit Trigger */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-xs rounded-2xl shadow-lg shadow-[#2563eb]/20 active:scale-98 transition duration-150 cursor-pointer disabled:opacity-50"
              id="submit-auth-btn"
            >
              {loading ? 'Processing Workspace...' : (mode === 'login' ? 'Sign In to Workspace' : 'Complete Registration & Sign Up')}
            </button>
          </form>

          {/* Toggle Trigger */}
          <div className="text-center text-xs font-medium pt-2">
            <span className="text-slate-500">
              {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
            </span>{' '}
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setError(null);
              }}
              className="text-[#2563eb] font-bold hover:underline ml-1 cursor-pointer"
              id="toggle-auth-mode"
            >
              {mode === 'login' ? 'Sign Up' : 'Log In'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
