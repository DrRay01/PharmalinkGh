import React from 'react';
import { Pharmacy, Coordinates } from '../types';
import { calculateHaversineDistance, whatsappLink } from '../utils/geo';
import { X, ShieldCheck, MapPin, Phone, Clock, ExternalLink, Star, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WhatsAppIcon } from './icons/WhatsAppIcon';

interface PharmacyDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  pharmacy: Pharmacy | null;
  userCoords: Coordinates;
}

export const PharmacyDetailModal: React.FC<PharmacyDetailModalProps> = ({
  isOpen,
  onClose,
  pharmacy,
  userCoords,
}) => {
  if (!isOpen || !pharmacy) return null;

  const distance = calculateHaversineDistance(userCoords, pharmacy.coordinates);

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${pharmacy.coordinates.lat},${pharmacy.coordinates.lng}`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200"
        >
          {/* Pharmacy Image Banner */}
          <div className="relative h-44 bg-slate-800 overflow-hidden">
            {pharmacy.image ? (
              <img
                src={pharmacy.image}
                alt={pharmacy.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full bg-linear-to-tr from-slate-900 to-slate-800" />
            )}
            <div className="absolute inset-0 bg-linear-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

            <button
              id="pharmacy-detail-close"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="absolute bottom-4 left-5 right-5 text-white">
              <div className="flex items-center gap-2 mb-1">
                {pharmacy.isVerified ? (
                  <span className="inline-flex items-center gap-1 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                    <ShieldCheck className="w-3 h-3" />
                    PCG Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                    Pending Review
                  </span>
                )}
                <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-300 fill-amber-300" />
                  {pharmacy.rating}
                </span>
                <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                  {distance} km away
                </span>
              </div>
              <h3 className="font-bold text-lg font-display text-white">{pharmacy.name}</h3>
            </div>
          </div>

          {/* Details Content */}
          <div className="p-6 space-y-5">
            {/* Accreditation Badge Box */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pharmacy Council License</span>
                <p className="font-mono text-xs font-bold text-slate-800 mt-0.5">{pharmacy.licenseNumber}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Superintendent Pharmacist</span>
                <p className="text-xs font-semibold text-slate-800 mt-0.5">{pharmacy.superintendentName}</p>
              </div>
            </div>

            {/* Contact & Address Rows */}
            <div className="space-y-3 text-xs text-slate-700">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900">{pharmacy.address}</p>
                  <p className="text-slate-500">{pharmacy.locality}, {pharmacy.region} Region, Ghana</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-slate-500">Dispatch / Pharmacy Phone: </span>
                  <a href={`tel:${pharmacy.phone}`} className="font-mono font-semibold text-sky-700 hover:underline">
                    {pharmacy.phone}
                  </a>
                  <a
                    href={whatsappLink(pharmacy.phone, `Hi ${pharmacy.name}, I'm enquiring about medication availability via PharmaLink GH.`)}
                    target="_blank"
                    rel="noreferrer"
                    title={`WhatsApp ${pharmacy.name}`}
                    className="p-1.5 rounded-full border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition-colors"
                  >
                    <WhatsAppIcon className="w-3 h-3" />
                  </a>
                  {pharmacy.emergencyPhone && (
                    <span className="text-slate-500">
                      (Hotline: <strong className="font-mono text-slate-800">{pharmacy.emergencyPhone}</strong>)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-slate-500">Operating Hours: </span>
                  <span className="font-medium text-slate-800">{pharmacy.openingHours}</span>
                  {pharmacy.is24Hours && (
                    <span className="ml-2 inline-flex text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      24/7 OPEN
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <a
                id="pharmacy-open-maps-btn"
                href={googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Google Maps</span>
              </a>

              <div className="flex items-center gap-2">
                <a
                  id="pharmacy-whatsapp-btn"
                  href={whatsappLink(pharmacy.phone, `Hi ${pharmacy.name}, I'm enquiring about medication availability via PharmaLink GH.`)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs font-bold transition-colors"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>

                <a
                  id="pharmacy-call-direct-btn"
                  href={`tel:${pharmacy.phone}`}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Pharmacy</span>
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
