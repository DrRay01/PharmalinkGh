import React, { useState } from 'react';
import { store, PCG_ADMIN_EMAIL, PCG_ADMIN_PASSWORD } from '../services/store';
import { ShieldCheck, Lock, ArrowRight, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import pharmalinkMonogram from '../assets/logos/pharmalink-logo-monogram.png';

interface AdminGatewayProps {
  onBack: () => void;
}

export const AdminGateway: React.FC<AdminGatewayProps> = ({ onBack }) => {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const user = await store.loginUser(PCG_ADMIN_EMAIL, password);
      if (!user) {
        setErrorMessage('Incorrect PCG Inspector password.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Sign in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 px-4 sm:px-6 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -left-24 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 -right-24 w-96 h-96 rounded-full bg-sky-500/10 blur-3xl" />

      <button
        id="admin-gateway-back-btn"
        onClick={onBack}
        className="absolute top-6 left-6 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to PharmaLink GH</span>
      </button>

      <div className="relative z-10 w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-white/95 flex items-center justify-center shadow-lg mb-4">
            <img src={pharmalinkMonogram} alt="PharmaLink GH" className="w-9 h-9 object-contain" />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold tracking-wide mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            Pharmacy Council of Ghana
          </span>
          <h1 className="text-xl font-bold text-white font-display">Admin Portal</h1>
          <p className="text-xs text-slate-400 mt-1">Restricted to authorized PCG Inspectors</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Inspector Email</label>
            <input
              type="email"
              value={PCG_ADMIN_EMAIL}
              readOnly
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                id="admin-gateway-password-input"
                type="password"
                required
                autoFocus
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 font-medium text-slate-900"
              />
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
            Default password: <strong className="font-mono">{PCG_ADMIN_PASSWORD}</strong>
          </div>

          <button
            id="admin-gateway-submit-btn"
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-2xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs tracking-wide shadow-md transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Sign In to Console</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-[10px] text-slate-500 text-center mt-4">
          There is no self-registration for this role — this is a single fixed account issued by the platform.
        </p>
      </div>
    </div>
  );
};
