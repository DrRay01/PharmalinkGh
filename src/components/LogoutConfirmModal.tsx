import React, { useState, useEffect, useMemo } from 'react';
import { User, Reservation } from '../types';
import { store } from '../services/store';
import { formatGHS } from '../utils/geo';
import { 
  LogOut, 
  AlertTriangle, 
  Clock, 
  Store, 
  Pill, 
  ShieldAlert, 
  CheckCircle2, 
  X, 
  ArrowRight,
  BookmarkCheck,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  reservations: Reservation[];
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  reservations,
}) => {
  // Find active holds for this patient
  const activeHolds = useMemo(
    () => reservations.filter(
      r => r.patientUid === currentUser.uid && (r.status === 'PENDING' || r.status === 'CONFIRMED')
    ),
    [reservations, currentUser.uid]
  );

  const [timeRemainingMap, setTimeRemainingMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;

    const updateTimes = () => {
      const newMap: Record<string, string> = {};
      activeHolds.forEach(hold => {
        const diff = new Date(hold.expiresAt).getTime() - Date.now();
        if (diff <= 0) {
          newMap[hold.id] = 'Expired';
        } else {
          const mins = Math.floor(diff / 60000);
          const hrs = Math.floor(mins / 60);
          const remMins = mins % 60;
          newMap[hold.id] = hrs > 0 ? `${hrs}h ${remMins}m remaining` : `${remMins}m remaining`;
        }
      });
      setTimeRemainingMap(newMap);
    };

    updateTimes();
    const interval = setInterval(updateTimes, 30000);
    return () => clearInterval(interval);
  }, [isOpen, activeHolds]);

  if (!isOpen) return null;

  const handleKeepHoldsAndLogout = () => {
    store.logoutUser();
    onClose();
  };

  const handleCancelHoldsAndLogout = () => {
    // Release all active holds for this user
    activeHolds.forEach(hold => {
      store.cancelReservation(hold.id);
    });
    store.logoutUser();
    onClose();
  };

  const handleStandardLogout = () => {
    store.logoutUser();
    onClose();
  };

  const hasHolds = activeHolds.length > 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-md max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200"
        >
          {/* Header */}
          <div className={`p-6 border-b ${hasHolds ? 'bg-amber-50/70 border-amber-200/80' : 'bg-slate-50 border-slate-100'} flex items-start justify-between gap-4`}>
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-md flex items-center justify-center shrink-0 ${
                hasHolds ? 'bg-amber-500 text-white shadow-md' : 'bg-slate-900 text-white'
              }`}>
                {hasHolds ? <AlertTriangle className="w-6 h-6" /> : <LogOut className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 font-display">
                  {hasHolds ? 'Active Medication Holds Detected' : 'Confirm Sign Out'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Signed in as <strong className="text-slate-800">{currentUser.name}</strong> ({currentUser.email || currentUser.role})
                </p>
              </div>
            </div>

            <button
              id="close-logout-modal-btn"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-4">
            {hasHolds ? (
              <>
                <div className="p-3.5 rounded-md bg-amber-50 border border-amber-200/80 text-xs text-amber-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-amber-950">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>You have {activeHolds.length} active 2-hour hold{activeHolds.length > 1 ? 's' : ''} in progress</span>
                  </p>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Would you like to <strong>keep your reservation codes active</strong> at the dispensaries so you can pick up your medication, or release the hold stock?
                  </p>
                </div>

                {/* List of Active Holds */}
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {activeHolds.map(hold => (
                    <div
                      key={hold.id}
                      className="p-3 rounded-md border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 font-display">{hold.medicineName}</span>
                          <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-extrabold bg-sky-100 text-sky-800 border border-sky-200">
                            {hold.reservationCode}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                          <Store className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{hold.pharmacyName}</span>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-bold font-mono text-amber-700 block">
                          {timeRemainingMap[hold.id] || 'Active'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {hold.quantity} units • {formatGHS(hold.totalPriceGHS)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Options Info */}
                <div className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-md border border-slate-100">
                  <p>
                    💡 <strong>Tip:</strong> If you keep your holds, your reservation codes remain valid at the pharmacy until their 2-hour timer runs out. You can also sign back in at any time to view them.
                  </p>
                </div>
              </>
            ) : (
              <div className="py-2 text-slate-600 text-xs leading-relaxed space-y-2">
                <p>
                  Are you sure you want to sign out? You will be switched to <strong>Guest Mode</strong> where you can still search medicines and locate pharmacies.
                </p>
                <div className="p-3 bg-slate-50 rounded-md border border-slate-100 text-[11px] text-slate-500">
                  You can sign back into your account at any time using your registered email address.
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
            <button
              id="cancel-logout-btn"
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors order-last sm:order-first"
            >
              Stay Signed In
            </button>

            {hasHolds ? (
              <>
                <button
                  id="release-holds-logout-btn"
                  type="button"
                  onClick={handleCancelHoldsAndLogout}
                  className="px-4 py-2.5 rounded-md border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Release Holds & Sign Out</span>
                </button>

                <button
                  id="confirm-keep-holds-logout-btn"
                  type="button"
                  onClick={handleKeepHoldsAndLogout}
                  className="px-5 py-2.5 rounded-md bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Keep Holds & Sign Out</span>
                </button>
              </>
            ) : (
              <button
                id="confirm-logout-btn"
                type="button"
                onClick={handleStandardLogout}
                className="px-6 py-2.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Yes, Sign Out</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
