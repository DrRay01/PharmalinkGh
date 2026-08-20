import React, { useState } from 'react';
import { Medicine, Pharmacy, InventoryItem, User } from '../types';
import { store } from '../services/store';
import { formatGHS } from '../utils/geo';
import { X, Clock, ShieldCheck, Upload, AlertCircle, CheckCircle2, ChevronRight, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';

interface ReserveModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicine: Medicine;
  pharmacy: Pharmacy;
  inventoryItem?: InventoryItem;
  currentUser: User;
  onSuccess: (reservationCode: string) => void;
}

export const ReserveModal: React.FC<ReserveModalProps> = ({
  isOpen,
  onClose,
  medicine,
  pharmacy,
  inventoryItem,
  currentUser,
  onSuccess,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [patientPhone, setPatientPhone] = useState(currentUser.phone || '+233 24 ');
  const [notes, setNotes] = useState('');
  const [prescriptionImage, setPrescriptionImage] = useState<string | null>(null);
  const [prescriptionFileName, setPrescriptionFileName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const unitPrice = inventoryItem?.unitPriceGHS || 120.00;
  const totalPrice = unitPrice * quantity;
  const maxAvailable = inventoryItem?.quantity || 10;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPrescriptionFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setPrescriptionImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientPhone.trim() || patientPhone.length < 8) {
      setError('Please provide a valid Ghanaian contact number so the pharmacy can notify you.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const reservation = await store.createReservation({
        patientUid: currentUser.uid,
        patientName: currentUser.name,
        patientPhone: patientPhone.trim(),
        pharmacyId: pharmacy.id,
        medicineId: medicine.id,
        quantity,
        prescriptionImageUrl: prescriptionImage || undefined,
        prescriptionFileName: prescriptionFileName || (medicine.prescriptionRequired ? 'Patient_Prescription_Document.pdf' : undefined),
        notes: notes.trim() || undefined,
      });

      // Confetti burst for micro-delight
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#0284C7', '#10B981', '#F59E0B'],
      });

      setTimeout(() => {
        setIsSubmitting(false);
        onSuccess(reservation.reservationCode);
        onClose();
      }, 400);
    } catch (err: any) {
      setError(err.message || 'Failed to place reservation hold.');
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-md shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 my-8"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-emerald-500/10 text-emerald-700 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base font-display">Hold Medication (2 Hours)</h3>
                <p className="text-xs text-slate-500">Lock stock at accredited pharmacy before travel</p>
              </div>
            </div>

            <button
              id="reserve-modal-close"
              onClick={onClose}
              className="p-2 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Drug & Pharmacy Summary Banner */}
            <div className="p-4 rounded-md bg-slate-50 border border-slate-100 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md">
                    {medicine.category}
                  </span>
                  <h4 className="font-bold text-slate-900 text-base mt-1">{medicine.brandName}</h4>
                  <p className="text-xs text-slate-500 font-medium">{medicine.genericName} • {medicine.dosageForm}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Unit Price</p>
                  <p className="text-base font-bold text-slate-900 font-mono">{formatGHS(unitPrice)}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{pharmacy.name}</span>
                </div>
                <span className="text-slate-400 text-[11px]">{pharmacy.locality}</span>
              </div>
            </div>

            {/* Quantity Selector & Price Total */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Quantity Required
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="w-10 h-10 rounded-md border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-bold text-slate-900 font-mono text-base">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(q => Math.min(Math.max(1, maxAvailable), q + 1))}
                    disabled={quantity >= maxAvailable}
                    className="w-10 h-10 rounded-md border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">Max {maxAvailable} units available</span>
              </div>

              <div className="bg-slate-900 text-white p-3.5 rounded-md flex flex-col justify-center">
                <span className="text-[11px] text-slate-400 font-medium">Estimated Total</span>
                <span className="text-xl font-bold font-mono text-white mt-0.5">{formatGHS(totalPrice)}</span>
                <span className="text-[10px] text-emerald-400 mt-0.5">Pay in store upon collection</span>
              </div>
            </div>

            {/* Contact Phone for Notification */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Contact Phone (Ghana)
              </label>
              <input
                id="patient-reserve-phone"
                type="tel"
                value={patientPhone}
                onChange={e => setPatientPhone(e.target.value)}
                placeholder="+233 24 000 0000"
                required
                className="w-full px-4 py-2.5 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-medium text-slate-900"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Used by the dispenser to verify your pickup code.</span>
            </div>

            {/* Prescription Slip Upload (Optional/Recommended) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Prescription Note {medicine.prescriptionRequired && <span className="text-rose-500">*</span>}
                </label>
                <span className="text-[11px] text-slate-400">Photo / PDF</span>
              </div>

              {prescriptionImage ? (
                <div className="p-3 rounded-md border border-emerald-200 bg-emerald-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span className="text-xs font-medium text-slate-800 truncate">{prescriptionFileName || 'Prescription Attached'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPrescriptionImage(null);
                      setPrescriptionFileName('');
                    }}
                    className="text-xs text-rose-600 hover:text-rose-800 font-semibold ml-2"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer border-2 border-dashed border-slate-200 hover:border-sky-400 hover:bg-sky-50/20 transition-all rounded-md p-4 flex flex-col items-center justify-center gap-1.5 text-center">
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span className="text-xs font-medium text-slate-700">Upload prescription photo or doctor's slip</span>
                  <span className="text-[10px] text-slate-400">Helps the pharmacist prepare your dosage ahead of time</span>
                  <input
                    id="prescription-file-input"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Additional Patient Notes */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Notes for Pharmacist (Optional)
              </label>
              <input
                id="patient-reserve-notes"
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. On my way from Ridge Hospital, arriving in 30 mins."
                className="w-full px-4 py-2.5 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm text-slate-900 placeholder:text-slate-400"
              />
            </div>

            {/* Policy notice */}
            <div className="p-3 bg-amber-500/10 border border-amber-200/80 rounded-md text-[11px] text-amber-900 leading-relaxed flex items-start gap-2">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>2-Hour Auto-Expiry Rule:</strong> This medication will be locked for exactly 2 hours. If uncollected, it is automatically released back to emergency inventory.
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-md text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                id="submit-reserve-btn"
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-md bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold tracking-wide transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <span>Reserving...</span>
                ) : (
                  <>
                    <span>Confirm 2-Hour Hold</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
