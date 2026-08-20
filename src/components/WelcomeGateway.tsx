import React, { useEffect, useState } from 'react';
import { UserRole } from '../types';
import {
  ShieldCheck,
  User as UserIcon,
  Store,
  Search,
  Phone,
  ArrowRight,
  LogIn,
  Sparkles,
  Pill,
  Building2,
  Clock3,
  HelpCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import pharmalinkMonogram from '../assets/logos/pharmalink-logo-monogram.png';

interface WelcomeGatewayProps {
  onOpenAuth: (mode: 'login' | 'signup', role: UserRole) => void;
  onContinueAsGuest: () => void;
  onGoToAdmin: () => void;
  onOpenHelp: () => void;
}

const ROLE_CARDS: Array<{
  role: UserRole;
  title: string;
  blurb: string;
  icon: React.ReactNode;
  accent: string;
}> = [
  {
    role: 'patient',
    title: 'Patient / Carer',
    blurb: 'Search live stock, place a 2-hour hold, and track pickup at verified pharmacies.',
    icon: <UserIcon className="w-5 h-5" />,
    accent: 'sky',
  },
  {
    role: 'pharmacist',
    title: 'Pharmacist',
    blurb: 'Manage your pharmacy inventory, confirm holds, and dispense to patients.',
    icon: <Store className="w-5 h-5" />,
    accent: 'emerald',
  },
  {
    role: 'admin',
    title: 'PCG Inspector',
    blurb: 'Verify pharmacy accreditation and audit the national compliance network.',
    icon: <ShieldCheck className="w-5 h-5" />,
    accent: 'amber',
  },
];

const ACCENT_CLASSES: Record<string, { ring: string; iconBg: string; iconText: string; btn: string }> = {
  sky: {
    ring: 'hover:border-sky-300 hover:shadow-sky-100',
    iconBg: 'bg-sky-50 border-sky-200',
    iconText: 'text-sky-600',
    btn: 'bg-sky-600 hover:bg-sky-700',
  },
  emerald: {
    ring: 'hover:border-emerald-300 hover:shadow-emerald-100',
    iconBg: 'bg-emerald-50 border-emerald-200',
    iconText: 'text-emerald-600',
    btn: 'bg-emerald-600 hover:bg-emerald-700',
  },
  amber: {
    ring: 'hover:border-amber-300 hover:shadow-amber-100',
    iconBg: 'bg-amber-50 border-amber-200',
    iconText: 'text-amber-600',
    btn: 'bg-amber-600 hover:bg-amber-700',
  },
};

const LIVE_TICKER_MESSAGES = [
  'PL-4821 hold confirmed at Adabraka Care Community Pharmacy',
  'Ceftriaxone 1g Injection restocked at Airport MedPlus Specialty Chemist',
  'Bantama Heritage Pharmacy (KATH Front) just verified by PCG',
  'Ventolin Evohaler now in stock at American House 24/7 Chemist',
];

export const WelcomeGateway: React.FC<WelcomeGatewayProps> = ({ onOpenAuth, onContinueAsGuest, onGoToAdmin, onOpenHelp }) => {
  const [tickerIndex, setTickerIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setTickerIndex(i => (i + 1) % LIVE_TICKER_MESSAGES.length);
    }, 3600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative min-h-screen bg-slate-950">
      {/* Full-page fixed background photo with dark overlay for legibility */}
      <div className="fixed inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1580281657527-47f249e8f4df?w=1920&auto=format&fit=crop&q=80"
          alt="Pharmacist retrieving medication from a pharmacy shelf"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-slate-950/70" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-10 lg:py-14">
        {/* ===== Hero: description left, role picker right — directly on the background photo ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-8 mb-14 lg:mb-20">
          {/* Left: brand + headline + ticker */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45 }}
            className="lg:col-span-2 flex flex-col justify-center"
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-11 h-11 flex items-center justify-center shrink-0 bg-white/95 rounded-md p-1.5 shadow-md">
                <img src={pharmalinkMonogram} alt="PharmaLink GH logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-white tracking-tight text-xl font-display">PharmaLink</span>
                <span className="bg-emerald-500/20 text-emerald-300 text-xs font-extrabold px-2 py-0.5 rounded-md font-mono">GH</span>
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-[2.6rem] font-extrabold text-white font-display leading-[1.08] tracking-tight mb-4 [text-shadow:0_2px_20px_rgba(0,0,0,0.35)]">
              Emergency medicine,
              <br />
              <span className="text-sky-300">
                located in minutes.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-200/90 max-w-md mb-6">
              Ghana's real-time out-of-stock locator network. Sign in to your role, or search first — no account needed to find and call a pharmacy.
            </p>

            {/* Rotating live activity ticker */}
            <div className="h-9 mb-6 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tickerIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-md px-3.5 py-1.5 w-fit"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="text-[11px] font-semibold text-slate-100 truncate max-w-[280px] sm:max-w-none">
                    {LIVE_TICKER_MESSAGES[tickerIndex]}
                  </span>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Stat pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-100 bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-md">
                <Pill className="w-3.5 h-3.5 text-sky-300" />
                FDA-registered medicines
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-100 bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-md">
                <Building2 className="w-3.5 h-3.5 text-emerald-300" />
                PCG-verified pharmacies
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-100 bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-md">
                <Clock3 className="w-3.5 h-3.5 text-amber-300" />
                2-hour hold guarantee
              </span>
            </div>
          </motion.div>

          {/* Right: role picker */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="lg:col-span-3 flex flex-col justify-center"
          >
            <div className="mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-white font-display">Choose how you'll use PharmaLink GH</h2>
              <p className="text-xs text-slate-200/80 mt-1">Pick a role to sign in or register — or skip below to search as a guest.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {ROLE_CARDS.map((card, i) => {
                const accent = ACCENT_CLASSES[card.accent];
                return (
                  <motion.div
                    key={card.role}
                    id={`welcome-role-card-${card.role}`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.25 + i * 0.08 }}
                    whileHover={{ y: -3 }}
                    className={`bg-white rounded-md border border-white/60 p-4 shadow-xl transition-all flex flex-col ${accent.ring}`}
                  >
                    <div className={`w-9 h-9 rounded-md border flex items-center justify-center mb-2.5 ${accent.iconBg} ${accent.iconText}`}>
                      {card.icon}
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm font-display">{card.title}</h3>
                    <p className="text-xs text-slate-500 mt-1 mb-4 flex-1">{card.blurb}</p>
                    {card.role === 'admin' ? (
                      <>
                        <button
                          id={`welcome-signin-${card.role}`}
                          onClick={onGoToAdmin}
                          className={`w-full px-3 py-2 rounded-md text-white text-xs font-bold transition-colors ${accent.btn}`}
                        >
                          Go to Admin Portal
                        </button>
                        <p className="text-[10px] text-slate-400 text-center mt-1.5">PCG staff only — opens at /admin</p>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          id={`welcome-signin-${card.role}`}
                          onClick={() => onOpenAuth('login', card.role)}
                          className="flex-1 px-3 py-2 rounded-md border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors"
                        >
                          Sign In
                        </button>
                        <button
                          id={`welcome-register-${card.role}`}
                          onClick={() => onOpenAuth('signup', card.role)}
                          className={`flex-1 px-3 py-2 rounded-md text-white text-xs font-bold transition-colors ${accent.btn}`}
                        >
                          Register
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center mb-6 max-w-4xl mx-auto">
          <div className="border-t border-white/20 w-full" />
          <span className="px-3 text-[10px] font-bold text-slate-300 uppercase tracking-wider absolute bg-slate-950/70 rounded-md">
            or
          </span>
        </div>

        {/* Guest Skip Path */}
        <div className="bg-white/95 backdrop-blur-md rounded-md border border-white/60 p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 max-w-4xl mx-auto">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
              <Search className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm font-display">Just looking for a drug?</h3>
              <p className="text-xs text-slate-500 mt-0.5 max-w-sm">
                Search medicines and call pharmacies as a guest — no account needed. Sign in only when you want to place a 2-hour hold.
              </p>
            </div>
          </div>
          <button
            id="welcome-continue-guest-btn"
            onClick={onContinueAsGuest}
            className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition-colors"
          >
            <span>Continue as Guest</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick guide trigger */}
        <div className="flex justify-center mt-6">
          <button
            id="welcome-open-help-btn"
            onClick={onOpenHelp}
            className="relative inline-flex items-center gap-2.5 px-6 py-3.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-extrabold shadow-lg shadow-emerald-900/40 ring-2 ring-emerald-300/50 transition-colors"
          >
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950/60"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-950"></span>
            </span>
            <HelpCircle className="w-4 h-4" />
            New here? Take the 60-second tour
          </button>
        </div>

        {/* Reassurance strip */}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-8 text-[11px] text-slate-300">
          <span className="flex items-center gap-1.5">
            <Phone className="w-3 h-3" />
            Call vendors directly as a guest
          </span>
          <span className="flex items-center gap-1.5">
            <LogIn className="w-3 h-3" />
            Sign in required only for holds
          </span>
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            Pharmacy Council of Ghana compliant
          </span>
        </div>
      </div>
    </div>
  );
};
