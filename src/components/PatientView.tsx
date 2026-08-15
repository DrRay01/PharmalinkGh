import React, { useState, useMemo, useEffect } from 'react';
import { Medicine, Pharmacy, InventoryItem, Reservation, User, TherapeuticCategory } from '../types';
import { store } from '../services/store';
import { HeroSearch } from './HeroSearch';
import { PharmacyCard } from './PharmacyCard';
import { ReserveModal } from './ReserveModal';
import { PharmacyDetailModal } from './PharmacyDetailModal';
import { PrescriptionViewerModal } from './PrescriptionViewerModal';
import { CountdownTimer } from './CountdownTimer';
import { formatGHS, calculateHaversineDistance, formatTimeAgo, whatsappLink } from '../utils/geo';
import { categoryAccent } from '../utils/colors';
import { WhatsAppIcon } from './icons/WhatsAppIcon';
import { 
  BookmarkCheck, 
  MapPin, 
  Phone, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  ArrowUpDown, 
  Search, 
  SlidersHorizontal,
  FileText,
  ExternalLink,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PatientViewProps {
  currentUser: User;
  medicines: Medicine[];
  pharmacies: Pharmacy[];
  inventory: InventoryItem[];
  reservations: Reservation[];
  userLocation: { name: string; coordinates: any };
  activeSubTab: 'search' | 'reservations';
  setActiveSubTab: (tab: 'search' | 'reservations') => void;
  onOpenAuth?: (mode?: 'login' | 'signup') => void;
}

export const PatientView: React.FC<PatientViewProps> = ({
  currentUser,
  medicines,
  pharmacies,
  inventory,
  reservations,
  userLocation,
  activeSubTab,
  setActiveSubTab,
  onOpenAuth,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'distance' | 'price'>('distance');
  const [selectedMedicineId, setSelectedMedicineId] = useState<string | 'ALL'>('ALL');

  // Modals state
  const [reserveModalState, setReserveModalState] = useState<{
    isOpen: boolean;
    medicine: Medicine | null;
    pharmacy: Pharmacy | null;
    inventoryItem: InventoryItem | null;
  }>({
    isOpen: false,
    medicine: null,
    pharmacy: null,
    inventoryItem: null,
  });

  const [selectedPharmacyForDetail, setSelectedPharmacyForDetail] = useState<Pharmacy | null>(null);

  const [prescriptionViewerState, setPrescriptionViewerState] = useState<{
    isOpen: boolean;
    imageUrl?: string;
    fileName?: string;
    patientName: string;
    medicineName: string;
    reservationCode: string;
  }>({
    isOpen: false,
    patientName: '',
    medicineName: '',
    reservationCode: '',
  });

  const isGuest = !currentUser.email || currentUser.uid === 'guest-user';

  // Extract distinct categories
  const categories = useMemo(() => {
    const set = new Set<TherapeuticCategory>();
    medicines.forEach(m => set.add(m.category));
    return Array.from(set);
  }, [medicines]);

  // Filter medicines matching search criteria
  const filteredMedicines = useMemo(() => {
    return medicines.filter(m => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        m.brandName.toLowerCase().includes(q) ||
        m.genericName.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.commonIndications.some(ind => ind.toLowerCase().includes(q));

      const matchesCategory = selectedCategory === 'ALL' || m.category === selectedCategory;
      const matchesEmergency = !emergencyOnly || m.isEmergencyCritical;

      return matchesSearch && matchesCategory && matchesEmergency;
    });
  }, [medicines, searchQuery, selectedCategory, emergencyOnly]);

  // If the currently selected medicine is no longer in filtered list, reset to 'ALL'
  useEffect(() => {
    if (selectedMedicineId !== 'ALL' && !filteredMedicines.some(m => m.id === selectedMedicineId)) {
      setSelectedMedicineId('ALL');
    }
  }, [filteredMedicines, selectedMedicineId]);

  // Map medicine to available pharmacy listings
  const searchResults = useMemo(() => {
    const results: Array<{
      medicine: Medicine;
      pharmacy: Pharmacy;
      inventory: InventoryItem;
      distance: number;
    }> = [];

    const targetMedicines =
      selectedMedicineId === 'ALL'
        ? filteredMedicines
        : filteredMedicines.filter(m => m.id === selectedMedicineId);

    targetMedicines.forEach(med => {
      // Find all inventory entries for this medicine
      const invEntries = inventory.filter(i => i.medicineId === med.id);

      invEntries.forEach(inv => {
        const pharma = pharmacies.find(p => p.id === inv.pharmacyId);
        if (pharma && pharma.status === 'APPROVED') {
          const dist = calculateHaversineDistance(userLocation.coordinates, pharma.coordinates);
          results.push({
            medicine: med,
            pharmacy: pharma,
            inventory: inv,
            distance: dist,
          });
        }
      });
    });

    // Sort results
    return results.sort((a, b) => {
      if (sortBy === 'distance') {
        return a.distance - b.distance;
      }
      return a.inventory.unitPriceGHS - b.inventory.unitPriceGHS;
    });
  }, [filteredMedicines, selectedMedicineId, inventory, pharmacies, userLocation, sortBy]);

  // Active reservations for current patient
  const patientReservations = useMemo(() => {
    if (isGuest) return [];
    return reservations.filter(r => r.patientUid === currentUser.uid);
  }, [reservations, currentUser, isGuest]);

  const handleOpenReserve = (medicine: Medicine, pharmacy: Pharmacy, inventoryItem: InventoryItem) => {
    if (isGuest) {
      store.showToast('info', 'Sign In Required', 'Please sign in or create a patient account to reserve a 2-hour hold.');
      if (onOpenAuth) {
        onOpenAuth('login');
      }
      return;
    }

    setReserveModalState({
      isOpen: true,
      medicine,
      pharmacy,
      inventoryItem,
    });
  };

  const handleCancelReservation = (reservationId: string) => {
    if (window.confirm('Are you sure you want to cancel this 2-hour hold? The reserved stock will be released back immediately.')) {
      store.cancelReservation(reservationId);
    }
  };

  const selectedMedObj = medicines.find(m => m.id === selectedMedicineId);

  return (
    <div className="min-h-[calc(100vh-4rem)] pb-16">
      {/* Sub Tabs Toggle (if in reservations mode) */}
      {activeSubTab === 'reservations' ? (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-950 font-display">My Medication Holds</h2>
              <p className="text-xs text-slate-500 mt-1">Live status of your active 2-hour pharmacy reservations</p>
            </div>

            <button
              onClick={() => setActiveSubTab('search')}
              className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors"
            >
              ← Back to Search
            </button>
          </div>

          {/* Reservations List */}
          {patientReservations.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xs">
              <BookmarkCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-800 text-base">No active reservations</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-6">
                When you place a 2-hour hold on out-of-stock medication, track its status and countdown timer here.
              </p>
              <button
                onClick={() => setActiveSubTab('search')}
                className="px-6 py-2.5 rounded-full bg-slate-950 text-white text-xs font-bold shadow-md hover:bg-slate-800 transition-colors"
              >
                Search Emergency Drugs Now
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {patientReservations.map(res => {
                const isPending = res.status === 'PENDING';
                const isConfirmed = res.status === 'CONFIRMED';
                const isCollected = res.status === 'COLLECTED';
                const isExpired = res.status === 'EXPIRED';
                const isCancelled = res.status === 'CANCELLED';
                const isRejected = res.status === 'REJECTED';

                return (
                  <div
                    key={res.id}
                    className="bg-white rounded-3xl border border-slate-200/90 p-5 md:p-6 shadow-xs transition-all space-y-4"
                  >
                    {/* Top Status Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold bg-slate-100 text-slate-900 px-2.5 py-1 rounded-md">
                          {res.reservationCode}
                        </span>

                        {isPending && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Pending Dispenser Confirmation
                          </span>
                        )}

                        {isConfirmed && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Hold Confirmed by Pharmacy
                          </span>
                        )}

                        {isCollected && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                            Collected & Dispensed
                          </span>
                        )}

                        {isExpired && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full">
                            Hold Expired
                          </span>
                        )}

                        {isCancelled && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-50 px-2.5 py-0.5 rounded-full">
                            Cancelled by Patient
                          </span>
                        )}

                        {isRejected && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full">
                            Declined by Pharmacy
                          </span>
                        )}
                      </div>

                      {/* Expiry Countdown (if still active) */}
                      {(isPending || isConfirmed) && (
                        <CountdownTimer expiresAt={res.expiresAt} />
                      )}
                    </div>

                    {/* Body Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reserved Drug</span>
                        <h4 className="font-bold text-slate-900 text-base mt-0.5">{res.medicineName}</h4>
                        <p className="text-slate-500 font-medium">{res.genericName} • {res.dosageForm}</p>
                        <p className="mt-2 text-slate-700">
                          Qty: <strong className="font-mono">{res.quantity} unit(s)</strong> • Unit: <span className="font-mono font-semibold">{formatGHS(res.unitPriceGHS)}</span>
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pickup Pharmacy</span>
                        <h4 className="font-bold text-slate-900 text-sm mt-0.5 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-sky-600" />
                          {res.pharmacyName}
                        </h4>
                        <p className="text-slate-500 mt-0.5">{res.pharmacyAddress}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <a href={`tel:${res.pharmacyPhone}`} className="font-mono font-semibold text-sky-700 hover:underline">
                            {res.pharmacyPhone}
                          </a>
                          <a
                            href={whatsappLink(res.pharmacyPhone, `Hi ${res.pharmacyName}, following up on my hold ${res.reservationCode} for ${res.medicineName}.`)}
                            target="_blank"
                            rel="noreferrer"
                            title={`WhatsApp ${res.pharmacyName}`}
                            className="p-1 rounded-full border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition-colors"
                          >
                            <WhatsAppIcon className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Prescription file note if attached */}
                    {(res.prescriptionImageUrl || res.prescriptionFileName) && (
                      <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-sky-600" />
                          <span className="font-medium text-slate-700">Attached Prescription: {res.prescriptionFileName || 'Doctor_Slip.pdf'}</span>
                        </div>
                        <button
                          onClick={() => {
                            setPrescriptionViewerState({
                              isOpen: true,
                              imageUrl: res.prescriptionImageUrl,
                              fileName: res.prescriptionFileName,
                              patientName: res.patientName,
                              medicineName: res.medicineName,
                              reservationCode: res.reservationCode,
                            });
                          }}
                          className="font-bold text-sky-700 hover:underline"
                        >
                          View Document
                        </button>
                      </div>
                    )}

                    {/* Rejection note */}
                    {res.rejectionReason && (
                      <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                        <strong>Reason from Dispenser:</strong> {res.rejectionReason}
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                      <div className="text-xs">
                        <span className="text-slate-400">Total Payable: </span>
                        <strong className="text-slate-900 font-mono text-sm">{formatGHS(res.totalPriceGHS)}</strong>
                      </div>

                      <div className="flex items-center gap-2">
                        {(isPending || isConfirmed) && (
                          <button
                            id={`cancel-res-${res.id}`}
                            onClick={() => handleCancelReservation(res.id)}
                            className="px-3.5 py-1.5 rounded-full border border-slate-200 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            Cancel Hold
                          </button>
                        )}

                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(res.pharmacyAddress)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-1.5 rounded-full bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
                        >
                          <span>Get Directions</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Discovery / Search Mode */
        <div>
          {/* Hero Search Box */}
          <HeroSearch
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            emergencyOnly={emergencyOnly}
            setEmergencyOnly={setEmergencyOnly}
            categories={categories}
          />

          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-10">
            {/* --- STEP 1: MATCHED DRUG OPTIONS --- */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-2 border-b border-slate-200/80">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-950 font-display flex items-center gap-2">
                    <span>1. Matched Medication Options</span>
                    <span className="text-xs font-bold font-mono text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                      {filteredMedicines.length} {filteredMedicines.length === 1 ? 'drug' : 'drugs'} found
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Click any medication to see its real packaging, Ghana FDA registration, and live stocking pharmacies below.
                  </p>
                </div>

                {selectedMedicineId !== 'ALL' && (
                  <button
                    id="show-all-drugs-btn"
                    onClick={() => setSelectedMedicineId('ALL')}
                    className="px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                  >
                    Show Sellers for All Drugs
                  </button>
                )}
              </div>

              {filteredMedicines.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-xs">
                  <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                  <h3 className="font-bold text-slate-800 text-sm font-display">No matching medicines in catalogue</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                    No Ghana FDA-registered medication matches "{searchQuery}". Try searching generic names like "Amoxicillin", "Salbutamol", or "Insulin".
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('ALL');
                      setEmergencyOnly(false);
                    }}
                    className="px-5 py-2 rounded-full bg-slate-950 text-white text-xs font-bold"
                  >
                    Clear Search Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredMedicines.map(med => {
                    const isSelected = selectedMedicineId === med.id;
                    const stockItems = inventory.filter(i => i.medicineId === med.id && i.status !== 'OUT_OF_STOCK');
                    const minPrice = stockItems.length > 0 
                      ? Math.min(...stockItems.map(i => i.unitPriceGHS))
                      : null;
                    const stockingPharmaciesCount = new Set(stockItems.map(i => i.pharmacyId)).size;
                    const accent = categoryAccent(med.category);

                    return (
                      <div
                        key={med.id}
                        id={`drug-option-card-${med.id}`}
                        onClick={() => setSelectedMedicineId(isSelected ? 'ALL' : med.id)}
                        className={`cursor-pointer rounded-3xl p-4 transition-all flex flex-col justify-between border border-t-4 ${accent.border} ${
                          isSelected
                            ? 'bg-sky-50/60 border-sky-600 shadow-md ring-2 ring-sky-500/20'
                            : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
                        }`}
                      >
                        <div>
                          {/* Image Container with FDA Badge */}
                          <div className="relative w-full h-36 rounded-2xl overflow-hidden bg-slate-100 mb-3 border border-slate-200/60">
                            {med.image ? (
                              <img
                                src={med.image}
                                alt={med.brandName}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xs">
                                Verified Medication
                              </div>
                            )}

                            <div className="absolute top-2 left-2 flex items-center gap-1 flex-wrap">
                              {med.isEmergencyCritical && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white shadow-xs">
                                  Critical
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900/80 text-white backdrop-blur-xs">
                                {med.category}
                              </span>
                            </div>

                            <div className="absolute bottom-2 right-2">
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-white/95 text-slate-800 shadow-xs border border-slate-200">
                                {med.ghanaFdaRegNo}
                              </span>
                            </div>
                          </div>

                          {/* Drug Identity */}
                          <h3 className="font-bold text-slate-900 text-base font-display leading-tight">{med.brandName}</h3>
                          <p className="text-xs text-slate-500 font-medium mt-0.5 line-clamp-1">{med.genericName}</p>
                          <p className="text-[11px] text-slate-600 mt-1 font-mono">{med.dosageForm}</p>
                        </div>

                        {/* Stocking Overview & Action */}
                        <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <div className="text-xs">
                            {stockingPharmaciesCount > 0 ? (
                              <div>
                                <span className="font-bold text-emerald-700 block text-[11px]">
                                  {stockingPharmaciesCount} {stockingPharmaciesCount === 1 ? 'Pharmacy' : 'Pharmacies'} Stocking
                                </span>
                                {minPrice && (
                                  <span className="text-slate-500 text-[10px] font-mono">
                                    from <strong className="text-slate-800">{formatGHS(minPrice)}</strong>
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] font-medium text-rose-600">Currently scarce</span>
                            )}
                          </div>

                          <button
                            type="button"
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                              isSelected
                                ? 'bg-sky-700 text-white shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            {isSelected ? 'Viewing Sellers' : 'View Sellers'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* --- STEP 2: POPULATED SELLERS / PHARMACIES --- */}
            <div id="sellers-results-section" className="pt-4">
              {/* Header bar for populated sellers */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200/80">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-950 font-display flex items-center gap-2">
                    <span>2. Stocking Pharmacies & Drug Sellers</span>
                    <span className="text-xs font-bold font-mono text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                      {searchResults.length} {searchResults.length === 1 ? 'seller' : 'sellers'} available
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedMedObj ? (
                      <>
                        Showing verified sellers stocking <strong className="text-slate-900">{selectedMedObj.brandName}</strong> near <strong className="text-slate-800">{userLocation.name}</strong>.
                      </>
                    ) : (
                      <>
                        Listing stocking sellers across all search matches near <strong className="text-slate-800">{userLocation.name}</strong>.
                      </>
                    )}
                  </p>
                </div>

                {/* Sorting Filter Controls */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Sort by:</span>
                  <button
                    id="sort-distance-btn"
                    onClick={() => setSortBy('distance')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      sortBy === 'distance'
                        ? 'bg-slate-950 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Nearest First
                  </button>
                  <button
                    id="sort-price-btn"
                    onClick={() => setSortBy('price')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      sortBy === 'price'
                        ? 'bg-slate-950 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Lowest Price
                  </button>
                </div>
              </div>

              {/* Sellers Grid */}
              {searchResults.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xs">
                  <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                  <h3 className="font-bold text-slate-800 text-base font-display">No stocking sellers available</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6">
                    {selectedMedObj 
                      ? `No community pharmacy currently reports verified stock for ${selectedMedObj.brandName} within range of ${userLocation.name}.`
                      : `No verified pharmacy currently reports stock for the filtered medications within ${userLocation.name}.`
                    }
                  </p>
                  <button
                    onClick={() => {
                      setSelectedMedicineId('ALL');
                      setSearchQuery('');
                      setSelectedCategory('ALL');
                      setEmergencyOnly(false);
                    }}
                    className="px-6 py-2.5 rounded-full bg-slate-950 text-white text-xs font-bold shadow-md hover:bg-slate-800 transition-colors"
                  >
                    Show All Stocking Pharmacies
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {searchResults.map(item => (
                    <PharmacyCard
                      key={`${item.pharmacy.id}-${item.medicine.id}`}
                      medicine={item.medicine}
                      pharmacy={item.pharmacy}
                      inventory={item.inventory}
                      userCoords={userLocation.coordinates}
                      onReserve={handleOpenReserve}
                      onViewPharmacy={setSelectedPharmacyForDetail}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Reserve Modal */}
      {reserveModalState.medicine && reserveModalState.pharmacy && (
        <ReserveModal
          isOpen={reserveModalState.isOpen}
          onClose={() => setReserveModalState(prev => ({ ...prev, isOpen: false }))}
          medicine={reserveModalState.medicine}
          pharmacy={reserveModalState.pharmacy}
          inventoryItem={reserveModalState.inventoryItem || undefined}
          currentUser={currentUser}
          onSuccess={(code) => {
            setActiveSubTab('reservations');
          }}
        />
      )}

      {/* Pharmacy Detail Modal */}
      <PharmacyDetailModal
        isOpen={!!selectedPharmacyForDetail}
        onClose={() => setSelectedPharmacyForDetail(null)}
        pharmacy={selectedPharmacyForDetail}
        userCoords={userLocation.coordinates}
      />

      {/* Prescription Viewer Modal */}
      <PrescriptionViewerModal
        isOpen={prescriptionViewerState.isOpen}
        onClose={() => setPrescriptionViewerState(prev => ({ ...prev, isOpen: false }))}
        imageUrl={prescriptionViewerState.imageUrl}
        fileName={prescriptionViewerState.fileName}
        patientName={prescriptionViewerState.patientName}
        medicineName={prescriptionViewerState.medicineName}
        reservationCode={prescriptionViewerState.reservationCode}
      />
    </div>
  );
};
