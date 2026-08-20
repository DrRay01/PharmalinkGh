import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole } from '../types';
import { store, PCG_ADMIN_EMAIL, PCG_ADMIN_PASSWORD } from '../services/store';
import { GHANAIAN_LOCALITIES } from '../data/seedData';
import { fileToCompressedDataUrl } from '../utils/image';
import {
  X,
  LogIn,
  UserPlus,
  ShieldCheck,
  Store,
  User as UserIcon,
  Lock,
  Mail,
  Phone,
  Building2,
  BadgeCheck,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Loader2,
  AlertCircle,
  Camera,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import pharmalinkMonogram from '../assets/logos/pharmalink-logo-monogram.png';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
  initialRole?: UserRole;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  initialRole = 'patient',
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [role, setRole] = useState<UserRole>(initialRole);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sign up form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+233 ');
  const [password, setPassword] = useState('');
  
  // Pharmacist specific fields
  const [pharmacyName, setPharmacyName] = useState('');
  const [pharmacyLicense, setPharmacyLicense] = useState('PCG/GAR/2024/');
  const [superintendentName, setSuperintendentName] = useState('');
  const [superintendentPin, setSuperintendentPin] = useState('PCG-PIN-');
  const [locality, setLocality] = useState(GHANAIAN_LOCALITIES[0].name);
  const [address, setAddress] = useState('');
  const [pharmacyPhoto, setPharmacyPhoto] = useState('');
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Pharmacist registration is a 2-step wizard: 1 = personal details, 2 = pharmacy details + photo
  const [signupStep, setSignupStep] = useState<1 | 2>(1);
  const [stepOneError, setStepOneError] = useState<string | null>(null);

  const users = store.getUsers();

  // Re-sync mode/role each time the modal is opened, and prefill the fixed
  // PCG Inspector email when arriving via the "Sign In" path on that role.
  useEffect(() => {
    if (!isOpen) return;
    setMode(initialMode);
    setRole(initialRole === 'admin' && initialMode === 'signup' ? 'patient' : initialRole);
    setErrorMessage(null);
    setSignupStep(1);
    setStepOneError(null);
    if (initialRole === 'admin' && initialMode === 'login') {
      setLoginEmail(PCG_ADMIN_EMAIL);
      setLoginPassword('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialMode, initialRole]);

  const handlePhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingPhoto(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      setPharmacyPhoto(dataUrl);
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not process that photo. Try a different file.');
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const handleNextStep = () => {
    if (!name.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      setStepOneError('Fill in your name, email, phone, and password before continuing.');
      return;
    }
    if (password.trim().length < 6) {
      setStepOneError('Password must be at least 6 characters.');
      return;
    }
    setStepOneError(null);
    setSignupStep(2);
  };

  const handleQuickLogin = (u: User) => {
    store.switchUser(u.uid);
    onClose();
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await store.loginWithGoogle();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Google Sign-In failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const loggedUser = await store.loginUser(loginEmail.trim(), loginPassword.trim());
      if (loggedUser) {
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Pressing Enter on step 1 of the pharmacist wizard should advance, not submit early.
    if (role === 'pharmacist' && signupStep === 1) {
      handleNextStep();
      return;
    }
    if (!name.trim() || !email.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);
    try {
      await store.registerUser({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role,
        password: password.trim() || undefined,
        pharmacyName: role === 'pharmacist' ? pharmacyName.trim() : undefined,
        pharmacyLicense: role === 'pharmacist' ? pharmacyLicense.trim() : undefined,
        superintendentName: role === 'pharmacist' ? superintendentName.trim() || name.trim() : undefined,
        superintendentPin: role === 'pharmacist' ? superintendentPin.trim() : undefined,
        locality: role === 'pharmacist' ? locality : undefined,
        address: role === 'pharmacist' ? address.trim() : undefined,
        pharmacyImage: role === 'pharmacist' ? pharmacyPhoto || undefined : undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please check your details.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-md max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden my-8"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 pb-4 relative">
          <button
            id="close-auth-modal-btn"
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-md bg-white/95 flex items-center justify-center shrink-0 shadow-sm">
              <img src={pharmalinkMonogram} alt="PharmaLink GH" className="w-6 h-6 object-contain" />
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold tracking-wide">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Firebase Auth & Cloud Firestore
            </span>
          </div>

          <h2 className="text-xl font-bold font-display text-white">
            {mode === 'login' ? 'Sign In to PharmaLink GH' : 'Create an Account'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'login'
              ? 'Access real-time emergency medication locator & 2-hour holds'
              : 'Join as a patient/carer, or register your pharmacy for PCG accreditation'}
          </p>

          {/* Mode Switcher */}
          <div className="flex rounded-md bg-slate-800/90 p-1 mt-4">
            <button
              id="auth-tab-login"
              onClick={() => { setMode('login'); setErrorMessage(null); }}
              className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'login'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              id="auth-tab-signup"
              onClick={() => { setMode('signup'); setErrorMessage(null); setSignupStep(1); if (role === 'admin') setRole('patient'); }}
              className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'signup'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register New</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Primary Google Sign-In Action */}
          <button
            id="google-signin-btn"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-md border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-3 group"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider absolute">
              or use email & password
            </span>
          </div>

          {mode === 'login' ? (
            <div className="space-y-5">
              {/* Login Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="login-email-input"
                      type="email"
                      required
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      placeholder="kofi.mensah@gmail.com"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 font-medium text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700">Password</label>
                    <span className="text-[11px] text-slate-400">Secure Firebase authentication</span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="login-password-input"
                      type="password"
                      required
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 font-medium text-slate-900"
                    />
                  </div>
                </div>

                {loginEmail.trim().toLowerCase() === PCG_ADMIN_EMAIL.toLowerCase() && (
                  <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      Fixed PCG Inspector account — there is no self-registration for this role. Default password: <strong className="font-mono">{PCG_ADMIN_PASSWORD}</strong>
                    </span>
                  </div>
                )}

                <button
                  id="login-submit-btn"
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-md bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs tracking-wide shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Sign In with Email</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Accounts created earlier this session */}
              {users.length > 0 && (
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Quick Switch:
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                      This Session's Accounts
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {users.slice(0, 4).map(u => (
                      <button
                        key={u.uid}
                        type="button"
                        onClick={() => handleQuickLogin(u)}
                        className="p-2.5 rounded-md border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-left transition-all flex items-center gap-2.5 group"
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                          {u.role === 'patient' && <UserIcon className="w-4 h-4 text-sky-600" />}
                          {u.role === 'pharmacist' && <Store className="w-4 h-4 text-emerald-600" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs text-slate-900 truncate group-hover:text-sky-700">{u.name}</p>
                          <p className="text-[10px] text-slate-400 capitalize truncate">{u.role} {u.pharmacyName ? `• ${u.pharmacyName}` : ''}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Registration Form */
            <form onSubmit={handleSignupSubmit} className="space-y-4 text-xs">
              {/* Role Selection Pill — step 1 only */}
              {signupStep === 1 && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Account Role</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('patient')}
                      className={`py-2 px-2 rounded-md text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                        role === 'patient'
                          ? 'bg-sky-50 border-sky-500 text-sky-900 ring-1 ring-sky-500'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <UserIcon className="w-4 h-4" />
                      <span>Patient / Carer</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole('pharmacist')}
                      className={`py-2 px-2 rounded-md text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                        role === 'pharmacist'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-1 ring-emerald-500'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Store className="w-4 h-4" />
                      <span>Pharmacist</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    PCG Inspector accounts are not self-registered — see the Sign In tab for the fixed inspector login.
                  </p>
                </div>
              )}

              {/* Step indicator for the pharmacist wizard */}
              {role === 'pharmacist' && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      signupStep >= 1 ? 'bg-slate-950 text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {signupStep > 1 ? <Check className="w-3 h-3" /> : '1'}
                    </span>
                    <span className={`font-bold ${signupStep === 1 ? 'text-slate-900' : 'text-slate-400'}`}>Your Details</span>
                  </div>
                  <div className="flex-1 h-px bg-slate-200" />
                  <div className="flex items-center gap-1.5">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      signupStep >= 2 ? 'bg-slate-950 text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      2
                    </span>
                    <span className={`font-bold ${signupStep === 2 ? 'text-slate-900' : 'text-slate-400'}`}>Pharmacy Details</span>
                  </div>
                </div>
              )}

              {/* Step 1: Personal details (both roles) */}
              {signupStep === 1 && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Full Legal Name</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder={role === 'pharmacist' ? 'Pharm. Kwame Asante, MPharm' : 'Akua Osei'}
                        className="w-full p-2.5 rounded-md border border-slate-200 font-medium text-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full p-2.5 rounded-md border border-slate-200 font-medium text-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Ghana Phone Number</label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+233 24 000 0000"
                        className="w-full p-2.5 rounded-md border border-slate-200 font-mono font-medium text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Password</label>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className="w-full p-2.5 rounded-md border border-slate-200 font-medium text-slate-900"
                      />
                    </div>
                  </div>

                  {stepOneError && (
                    <div className="p-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-[11px]">
                      {stepOneError}
                    </div>
                  )}
                </>
              )}

              {/* Step 2: Pharmacy details + photo (pharmacist only) */}
              {role === 'pharmacist' && signupStep === 2 && (
                <div className="p-4 rounded-md bg-emerald-50/70 border border-emerald-200/80 space-y-3">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                    <BadgeCheck className="w-4 h-4 text-emerald-600" />
                    <span>Pharmacy Council of Ghana Accreditation Info</span>
                  </div>
                  <p className="text-[11px] text-emerald-800/80 -mt-2">
                    These details are submitted to the PCG for review. Your dispensary console unlocks once a PCG Inspector approves your pharmacy.
                  </p>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Pharmacy Facility Name</label>
                    <input
                      type="text"
                      required
                      value={pharmacyName}
                      onChange={e => setPharmacyName(e.target.value)}
                      placeholder="e.g. Ridge Care 24/7 Pharmacy"
                      className="w-full p-2 rounded-md border border-slate-300 font-semibold text-slate-900 bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">PCG License No.</label>
                      <input
                        type="text"
                        required
                        value={pharmacyLicense}
                        onChange={e => setPharmacyLicense(e.target.value)}
                        placeholder="PCG/GAR/2024/9912"
                        className="w-full p-2 rounded-md border border-slate-300 font-mono text-slate-900 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Superintendent PIN</label>
                      <input
                        type="text"
                        required
                        value={superintendentPin}
                        onChange={e => setSuperintendentPin(e.target.value)}
                        placeholder="PCG-PIN-48291"
                        className="w-full p-2 rounded-md border border-slate-300 font-mono text-slate-900 bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Locality Region</label>
                      <select
                        value={locality}
                        onChange={e => setLocality(e.target.value)}
                        className="w-full p-2 rounded-md border border-slate-300 font-medium text-slate-900 bg-white"
                      >
                        {GHANAIAN_LOCALITIES.map(loc => (
                          <option key={loc.name} value={loc.name}>
                            {loc.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Street Address</label>
                      <input
                        type="text"
                        required
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        placeholder="e.g. Ring Road Central, Accra"
                        className="w-full p-2 rounded-md border border-slate-300 font-medium text-slate-900 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Pharmacy Photo (optional)</label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="w-16 h-16 rounded-md border-2 border-dashed border-slate-300 bg-white flex items-center justify-center overflow-hidden shrink-0 hover:border-emerald-400 transition-colors"
                      >
                        {isProcessingPhoto ? (
                          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                        ) : pharmacyPhoto ? (
                          <img src={pharmacyPhoto} alt="Pharmacy" className="w-full h-full object-cover" />
                        ) : (
                          <Camera className="w-5 h-5 text-slate-400" />
                        )}
                      </button>
                      <div className="flex-1">
                        <button
                          type="button"
                          onClick={() => photoInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 font-semibold text-[11px] hover:bg-slate-50 transition-colors"
                        >
                          {pharmacyPhoto ? 'Change Photo' : 'Upload Photo'}
                        </button>
                        <p className="text-[10px] text-slate-500 mt-1">Storefront or signage photo, shown on your pharmacy's public listing.</p>
                      </div>
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoSelected}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Footer navigation */}
              {role === 'pharmacist' && signupStep === 1 ? (
                <button
                  id="signup-next-btn"
                  type="button"
                  onClick={handleNextStep}
                  className="w-full py-3 rounded-md bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs tracking-wide shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <span>Next: Pharmacy Details</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : role === 'pharmacist' && signupStep === 2 ? (
                <div className="flex items-center gap-2">
                  <button
                    id="signup-back-btn"
                    type="button"
                    onClick={() => setSignupStep(1)}
                    className="px-4 py-3 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs tracking-wide transition-all flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <button
                    id="signup-submit-btn"
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-3 rounded-md bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs tracking-wide shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Submit Pharmacy for PCG Approval</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <button
                  id="signup-submit-btn"
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-md bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs tracking-wide shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Create & Activate Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
