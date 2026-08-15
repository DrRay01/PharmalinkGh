import React from 'react';
import { X, FileText, Download, CheckCircle, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PrescriptionViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string;
  fileName?: string;
  patientName: string;
  medicineName: string;
  reservationCode: string;
}

export const PrescriptionViewerModal: React.FC<PrescriptionViewerModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  fileName,
  patientName,
  medicineName,
  reservationCode,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-700">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm md:text-base">Prescription Reference</h3>
                <p className="text-xs text-slate-500">Hold Code: <span className="font-mono font-bold text-slate-800">{reservationCode}</span> • Patient: {patientName}</p>
              </div>
            </div>

            <button
              id="prescription-modal-close"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="mb-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <div>
                <p className="font-medium text-slate-800">Target Medication</p>
                <p className="text-slate-500 font-semibold">{medicineName}</p>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full font-medium">
                <ShieldCheck className="w-4 h-4" />
                Dispenser Reference Copy
              </div>
            </div>

            {imageUrl ? (
              <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center max-h-96">
                <img
                  src={imageUrl}
                  alt="Prescription document"
                  className="w-full h-auto max-h-96 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-700">Digital Prescription Attached</p>
                <p className="text-xs text-slate-400 mt-1">{fileName || 'Prescription_Document.pdf'}</p>
              </div>
            )}

            <div className="mt-5 flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
              <span>Verified under Pharmacy Council of Ghana guidelines</span>
              <button
                id="prescription-download-btn"
                onClick={() => {
                  window.open(imageUrl || '#', '_blank');
                }}
                className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 font-semibold underline underline-offset-2"
              >
                <Download className="w-3.5 h-3.5" />
                Open High-Res Document
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
