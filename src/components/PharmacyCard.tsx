import React from 'react';
import { Medicine, Pharmacy, InventoryItem, Coordinates } from '../types';
import { calculateHaversineDistance, formatGHS, formatTimeAgo, whatsappLink } from '../utils/geo';
import { ShieldCheck, MapPin, Phone, Clock, ArrowUpRight, Navigation, Sparkles, AlertCircle } from 'lucide-react';
import { WhatsAppIcon } from './icons/WhatsAppIcon';

interface PharmacyCardProps {
  medicine: Medicine;
  pharmacy: Pharmacy;
  inventory: InventoryItem;
  userCoords: Coordinates;
  onReserve: (medicine: Medicine, pharmacy: Pharmacy, inventory: InventoryItem) => void;
  onViewPharmacy: (pharmacy: Pharmacy) => void;
}

export const PharmacyCard: React.FC<PharmacyCardProps> = ({
  medicine,
  pharmacy,
  inventory,
  userCoords,
  onReserve,
  onViewPharmacy,
}) => {
  const distance = calculateHaversineDistance(userCoords, pharmacy.coordinates);
  const isInStock = inventory.status === 'IN_STOCK';
  const isLowStock = inventory.status === 'LOW_STOCK';
  const isOutOfStock = inventory.status === 'OUT_OF_STOCK';

  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${pharmacy.name}, ${pharmacy.address}`
  )}`;

  const stockAccent = isInStock
    ? 'border-l-4 border-l-emerald-400'
    : isLowStock
    ? 'border-l-4 border-l-amber-400'
    : 'border-l-4 border-l-slate-300';

  return (
    <div className={`bg-white rounded-3xl border border-slate-200/90 ${stockAccent} p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group`}>
      <div>
        {/* Top Badges & Status */}
        <div className="flex items-center justify-between gap-2 mb-3.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            {isInStock && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                In Stock ({inventory.quantity} units)
              </span>
            )}
            {isLowStock && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Low Stock ({inventory.quantity} left)
              </span>
            )}
            {isOutOfStock && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                Out of Stock
              </span>
            )}

            {pharmacy.isVerified && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                <ShieldCheck className="w-3 h-3" />
                PCG Verified
              </span>
            )}
          </div>

          <span className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
            {distance} km
          </span>
        </div>

        {/* Pharmacy & Location Details */}
        <div className="mb-4">
          <button
            onClick={() => onViewPharmacy(pharmacy)}
            className="text-left font-bold text-slate-900 text-base md:text-lg group-hover:text-sky-700 transition-colors font-display"
          >
            {pharmacy.name}
          </button>
          
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{pharmacy.locality} • {pharmacy.address}</span>
          </div>

          <div className="flex items-center gap-2.5 mt-2 text-xs text-slate-500 flex-wrap">
            <span className="flex items-center gap-1 text-slate-600 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {pharmacy.openingHours}
            </span>
            <span>•</span>
            <span className="text-slate-400 text-[11px]">
              Updated {formatTimeAgo(inventory.lastUpdatedAt)}
            </span>
          </div>
        </div>

        {/* Medicine Highlight with Packaging Photo */}
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {medicine.image && (
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-white border border-slate-200 shrink-0">
                <img
                  src={medicine.image}
                  alt={medicine.brandName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">{medicine.brandName}</p>
              <p className="text-[11px] text-slate-500 font-medium truncate">{medicine.dosageForm}</p>
              <p className="text-[10px] font-mono text-slate-400 truncate">{medicine.ghanaFdaRegNo}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Unit Price</span>
            <span className="text-sm font-extrabold font-mono text-slate-900">{formatGHS(inventory.unitPriceGHS)}</span>
          </div>
        </div>
      </div>

      {/* Action Footer - Call, Directions & Hold 2h */}
      <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-1.5">
          <a
            id={`call-pharma-${pharmacy.id}`}
            href={`tel:${pharmacy.phone}`}
            title={`Call ${pharmacy.name}`}
            className="px-3 py-2 rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <Phone className="w-3.5 h-3.5 text-slate-500" />
            <span>Call</span>
          </a>

          <a
            id={`whatsapp-pharma-${pharmacy.id}`}
            href={whatsappLink(pharmacy.phone, `Hi ${pharmacy.name}, I'm enquiring about ${medicine.brandName} availability via PharmaLink GH.`)}
            target="_blank"
            rel="noreferrer"
            title={`WhatsApp ${pharmacy.name}`}
            className="p-2 rounded-full border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition-colors"
          >
            <WhatsAppIcon className="w-3.5 h-3.5" />
          </a>

          <a
            id={`directions-pharma-${pharmacy.id}`}
            href={directionsUrl}
            target="_blank"
            rel="noreferrer"
            title="Open Google Maps Directions"
            className="px-3 py-2 rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <Navigation className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Directions</span>
          </a>
        </div>

        <button
          id={`reserve-btn-${pharmacy.id}-${medicine.id}`}
          onClick={() => onReserve(medicine, pharmacy, inventory)}
          disabled={isOutOfStock}
          className={`px-4 sm:px-5 py-2.5 rounded-full text-xs font-bold tracking-wide transition-all flex items-center gap-1.5 ${
            isOutOfStock
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-slate-950 hover:bg-slate-800 text-white shadow-xs group-hover:shadow-md'
          }`}
        >
          <span>{isOutOfStock ? 'Out of Stock' : 'Hold 2h'}</span>
          {!isOutOfStock && <ArrowUpRight className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
};
