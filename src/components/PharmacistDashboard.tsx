import React, { useState, useMemo } from 'react';
import { User, Pharmacy, Medicine, InventoryItem, Reservation, StockStatus } from '../types';
import { store } from '../services/store';
import { KNOWN_THERAPEUTIC_CATEGORIES } from '../data/seedData';
import { CountdownTimer } from './CountdownTimer';
import { PrescriptionViewerModal } from './PrescriptionViewerModal';
import { formatGHS, formatTimeAgo } from '../utils/geo';
import {
  Store,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Plus,
  AlertTriangle,
  TrendingUp,
  Package,
  ShieldCheck,
  Search,
  Phone,
  ArrowRight,
  Filter,
  Eye,
  Check,
  X,
  Sparkles,
  Sliders,
  DollarSign,
  Trash2,
  Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';

interface PharmacistDashboardProps {
  currentUser: User;
  pharmacy: Pharmacy;
  medicines: Medicine[];
  inventory: InventoryItem[];
  reservations: Reservation[];
}

export const PharmacistDashboard: React.FC<PharmacistDashboardProps> = ({
  currentUser,
  pharmacy,
  medicines,
  inventory,
  reservations,
}) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'inventory'>('queue');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Rejection modal
  const [rejectModalState, setRejectModalState] = useState<{
    isOpen: boolean;
    reservationId: string;
    reservationCode: string;
    patientName: string;
    reason: string;
  }>({
    isOpen: false,
    reservationId: '',
    reservationCode: '',
    patientName: '',
    reason: '',
  });

  // Prescription modal
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

  // Add item modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addDrugMode, setAddDrugMode] = useState<'existing' | 'new'>('existing');
  const [selectedMedId, setSelectedMedId] = useState(medicines[0]?.id || '');
  const [newQty, setNewQty] = useState(20);
  const [newPrice, setNewPrice] = useState(120.00);

  // "Register new drug" sub-form (adds to the shared FDA catalogue, then stocks it here)
  const [newDrugBrand, setNewDrugBrand] = useState('');
  const [newDrugGeneric, setNewDrugGeneric] = useState('');
  const [newDrugCategory, setNewDrugCategory] = useState('');
  const [newDrugDosage, setNewDrugDosage] = useState('');
  const [newDrugStrength, setNewDrugStrength] = useState('');
  const [newDrugFda, setNewDrugFda] = useState('');
  const [newDrugCritical, setNewDrugCritical] = useState(false);
  const [newDrugRx, setNewDrugRx] = useState(true);

  const knownCategories = useMemo(() => {
    const set = new Set<string>(KNOWN_THERAPEUTIC_CATEGORIES);
    medicines.forEach(m => set.add(m.category));
    return Array.from(set);
  }, [medicines]);

  // Pharmacy's inventory
  const pharmacyInventory = useMemo(() => {
    return inventory.filter(i => i.pharmacyId === pharmacy.id);
  }, [inventory, pharmacy]);

  // Pharmacy's reservations
  const pharmacyReservations = useMemo(() => {
    return reservations.filter(r => r.pharmacyId === pharmacy.id);
  }, [reservations, pharmacy]);

  // Filtered reservations
  const filteredReservations = useMemo(() => {
    return pharmacyReservations.filter(r => {
      if (statusFilter === 'ACTIVE') {
        return r.status === 'PENDING' || r.status === 'CONFIRMED';
      }
      if (statusFilter === 'ALL') return true;
      return r.status === statusFilter;
    });
  }, [pharmacyReservations, statusFilter]);

  // Metrics
  const activeHoldsCount = pharmacyReservations.filter(r => r.status === 'PENDING' || r.status === 'CONFIRMED').length;
  const fulfilledTodayCount = pharmacyReservations.filter(r => r.status === 'COLLECTED').length;
  const lowStockCount = pharmacyInventory.filter(i => i.status === 'LOW_STOCK' || i.status === 'OUT_OF_STOCK').length;
  const totalRevenueToday = pharmacyReservations
    .filter(r => r.status === 'COLLECTED')
    .reduce((sum, r) => sum + r.totalPriceGHS, 0);

  // Actions
  const handleApprove = (reservationId: string) => {
    store.updateReservationStatus(reservationId, 'CONFIRMED');
  };

  const handleDispense = (reservationId: string) => {
    store.updateReservationStatus(reservationId, 'COLLECTED');
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#10B981', '#0284C7'],
    });
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalState.reason.trim()) return;
    store.updateReservationStatus(
      rejectModalState.reservationId, 
      'REJECTED', 
      rejectModalState.reason.trim()
    );
    setRejectModalState({ isOpen: false, reservationId: '', reservationCode: '', patientName: '', reason: '' });
  };

  const handleToggleStock = (invId: string, currentStatus: StockStatus) => {
    const nextStatus: StockStatus = 
      currentStatus === 'IN_STOCK' ? 'LOW_STOCK' : 
      currentStatus === 'LOW_STOCK' ? 'OUT_OF_STOCK' : 'IN_STOCK';
    
    store.updateStockStatus(invId, nextStatus);
  };

  const resetAddDrugModal = () => {
    setIsAddModalOpen(false);
    setAddDrugMode('existing');
    setNewDrugBrand('');
    setNewDrugGeneric('');
    setNewDrugCategory('');
    setNewDrugDosage('');
    setNewDrugStrength('');
    setNewDrugFda('');
    setNewDrugCritical(false);
    setNewDrugRx(true);
  };

  const handleAddStockItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addDrugMode === 'new') {
      if (!newDrugBrand.trim() || !newDrugGeneric.trim() || !newDrugCategory.trim() || !newDrugDosage.trim()) return;
      const med = await store.addMedicine({
        brandName: newDrugBrand.trim(),
        genericName: newDrugGeneric.trim(),
        category: newDrugCategory.trim(),
        therapeuticClass: newDrugCategory.trim(),
        dosageForm: newDrugDosage.trim(),
        strength: newDrugStrength.trim() || 'Standard Clinical',
        description: `Registered by ${pharmacy.name}.`,
        prescriptionRequired: newDrugRx,
        ghanaFdaRegNo: newDrugFda.trim() || `FDA/REG.${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        isEmergencyCritical: newDrugCritical,
        commonIndications: [],
      });
      await store.addInventoryItem(pharmacy.id, med.id, newQty, newPrice);
    } else {
      await store.addInventoryItem(pharmacy.id, selectedMedId, newQty, newPrice);
    }
    resetAddDrugModal();
  };

  const handleDeleteInventoryItem = (item: InventoryItem) => {
    const med = medicines.find(m => m.id === item.medicineId);
    if (window.confirm(`Remove ${med?.brandName || 'this drug'} from your pharmacy shelf? Patients will no longer see it in your stock.`)) {
      store.deleteInventoryItem(item.id);
    }
  };

  // Gate the operational console until the Pharmacy Council of Ghana approves this pharmacy
  if (pharmacy.status !== 'APPROVED') {
    const isSuspended = pharmacy.status === 'SUSPENDED';
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className={`bg-white rounded-3xl border shadow-xs p-8 text-center ${isSuspended ? 'border-rose-200' : 'border-amber-200'}`}>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isSuspended ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
            {isSuspended ? <AlertTriangle className="w-7 h-7" /> : <Clock className="w-7 h-7" />}
          </div>
          <h1 className="text-xl font-bold text-slate-900 font-display mb-1">
            {isSuspended ? 'Pharmacy License Suspended' : 'Application Under PCG Review'}
          </h1>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            {isSuspended
              ? 'Your pharmacy license has been suspended by the Pharmacy Council of Ghana and sales are revoked. Contact PCG support to resolve this before you can dispense again.'
              : `Thanks for registering, ${currentUser.name}. ${pharmacy.name} has been submitted to the Pharmacy Council of Ghana for accreditation review. You'll be able to manage inventory and patient holds as soon as a PCG Inspector approves your license.`}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left text-xs bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <div>
              <span className="text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Pharmacy</span>
              <span className="font-semibold text-slate-800">{pharmacy.name}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold uppercase tracking-wider block mb-0.5">License No.</span>
              <span className="font-mono font-semibold text-slate-800">{pharmacy.licenseNumber}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Locality</span>
              <span className="font-semibold text-slate-800">{pharmacy.locality}, {pharmacy.region}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Submitted</span>
              <span className="font-semibold text-slate-800">{formatTimeAgo(pharmacy.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Hero SaaS Banner - Inspired directly by Image 2 */}
      <div className="relative rounded-3xl bg-linear-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-6 sm:p-8 shadow-xl shadow-blue-900/15 overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-32 h-32 bg-sky-400/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[11px] font-bold tracking-wide">
                <Store className="w-3.5 h-3.5" />
                {pharmacy.name}
              </span>
              <span className="text-[11px] text-blue-100 font-mono">
                {pharmacy.licenseNumber}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display text-white">
              Welcome, {currentUser.name}
            </h1>
            <p className="text-blue-100/90 text-xs sm:text-sm mt-1 max-w-xl leading-relaxed">
              Active triage and emergency dispensary console. Review incoming patient holds, verify doctor prescriptions, and manage inventory stock levels in real time.
            </p>
          </div>

          {/* Quick Action Icons Banner (Inspired by Image 2) */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="pharmacist-add-stock-btn"
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-white text-blue-900 hover:bg-blue-50 text-xs font-bold transition-all shadow-md flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Stock New Drug</span>
            </button>

            <button
              onClick={() => setActiveTab(activeTab === 'queue' ? 'inventory' : 'queue')}
              className="px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white backdrop-blur-md text-xs font-bold transition-all flex items-center gap-2"
            >
              <Sliders className="w-4 h-4" />
              <span>{activeTab === 'queue' ? 'Inventory Manager' : 'Reservations Queue'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Micro-KPI Metrics Grid - Inspired by Image 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Holds */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Holds</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900 font-display">{activeHoldsCount}</span>
            <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              2-hr Locks
            </span>
          </div>
        </div>

        {/* Fulfilled Today */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Dispensed Today</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900 font-display">{fulfilledTodayCount}</span>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              +{fulfilledTodayCount} / today
            </span>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Low Stock Items</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900 font-display">{lowStockCount}</span>
            <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
              Attention needed
            </span>
          </div>
        </div>

        {/* Fulfilled Value */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Dispensary Value</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900 font-mono">{formatGHS(totalRevenueToday)}</span>
            <span className="text-[10px] text-slate-400 font-medium">Recorded in-store</span>
          </div>
        </div>
      </div>

      {/* 3. Main Operational Sections (Tabs) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Navigation Tabs */}
        <div className="px-6 pt-5 pb-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              id="pharmacist-tab-queue"
              onClick={() => setActiveTab('queue')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                activeTab === 'queue'
                  ? 'bg-slate-950 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Patient Reservation Holds ({activeHoldsCount})
            </button>

            <button
              id="pharmacist-tab-inventory"
              onClick={() => setActiveTab('inventory')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                activeTab === 'inventory'
                  ? 'bg-slate-950 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Pharmacy Inventory Catalog ({pharmacyInventory.length})
            </button>
          </div>

          {activeTab === 'queue' && (
            <div className="flex items-center gap-1.5">
              {['ACTIVE', 'COLLECTED', 'ALL'].map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                    statusFilter === f
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f === 'ACTIVE' ? 'Active Holds' : f === 'COLLECTED' ? 'Fulfilled' : 'All History'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tab 1: Reservations Queue */}
        {activeTab === 'queue' ? (
          <div className="p-6">
            {filteredReservations.length === 0 ? (
              <div className="py-16 text-center">
                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No reservations matching filter</p>
                <p className="text-xs text-slate-400 mt-1">New 2-hour holds placed by patients will appear in this queue immediately.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredReservations.map(res => {
                  const isPending = res.status === 'PENDING';
                  const isConfirmed = res.status === 'CONFIRMED';
                  const isCollected = res.status === 'COLLECTED';
                  const isExpired = res.status === 'EXPIRED';
                  const isRejected = res.status === 'REJECTED';
                  const liveStock = pharmacyInventory.find(i => i.medicineId === res.medicineId);
                  const rowAccent = isPending
                    ? 'border-l-4 border-l-amber-400 bg-amber-50/40 hover:bg-amber-50/70'
                    : isConfirmed
                    ? 'border-l-4 border-l-sky-400 bg-sky-50/40 hover:bg-sky-50/70'
                    : isCollected
                    ? 'border-l-4 border-l-emerald-400 bg-emerald-50/30 hover:bg-emerald-50/60'
                    : isExpired || isRejected
                    ? 'border-l-4 border-l-rose-300 bg-rose-50/30 hover:bg-rose-50/50'
                    : 'border-l-4 border-l-slate-200 hover:bg-slate-50/60';

                  return (
                    <div key={res.id} className={`py-4.5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-3 pl-4 rounded-2xl transition-colors ${rowAccent}`}>
                      {/* Left: Code, Patient, Medication */}
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                          {res.reservationCode.split('-')[1]}
                        </div>

                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm font-display">{res.medicineName}</span>
                            <span className="text-xs font-mono font-semibold text-slate-500">
                              (Qty: {res.quantity})
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                              {formatGHS(res.totalPriceGHS)}
                            </span>
                            {liveStock && (
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isCollected
                                    ? 'text-slate-500 bg-slate-100'
                                    : liveStock.status === 'OUT_OF_STOCK'
                                    ? 'text-rose-700 bg-rose-50'
                                    : liveStock.status === 'LOW_STOCK'
                                    ? 'text-amber-700 bg-amber-50'
                                    : 'text-emerald-700 bg-emerald-50'
                                }`}
                              >
                                {isCollected ? 'Picked Up' : `Stock left: ${liveStock.quantity} units`}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                            <span className="font-semibold text-slate-800">{res.patientName}</span>
                            <span>•</span>
                            <a href={`tel:${res.patientPhone}`} className="font-mono text-sky-700 hover:underline flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {res.patientPhone}
                            </a>
                            <span>•</span>
                            <span className="text-slate-400 text-[11px]">{formatTimeAgo(res.createdAt)}</span>
                          </div>

                          {res.notes && (
                            <p className="text-[11px] text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 inline-block">
                              <strong>Note:</strong> {res.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Expiry + Prescription + Actions */}
                      <div className="flex items-center gap-3 flex-wrap lg:justify-end">
                        {(isPending || isConfirmed) && (
                          <CountdownTimer expiresAt={res.expiresAt} compact />
                        )}

                        {/* Prescription Button if attached */}
                        {(res.prescriptionImageUrl || res.prescriptionFileName) && (
                          <button
                            id={`view-rx-btn-${res.id}`}
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
                            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5 text-sky-600" />
                            <span>Prescription</span>
                          </button>
                        )}

                        {/* Status Pills for Completed states */}
                        {isCollected && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                            ✓ Dispensed
                          </span>
                        )}

                        {isExpired && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200">
                            Hold Expired
                          </span>
                        )}

                        {isRejected && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold text-slate-500 bg-slate-100">
                            Declined
                          </span>
                        )}

                        {/* Action buttons for pending/confirmed */}
                        {isPending && (
                          <div className="flex items-center gap-1.5">
                            <button
                              id={`approve-btn-${res.id}`}
                              onClick={() => handleApprove(res.id)}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve Hold</span>
                            </button>

                            <button
                              id={`reject-btn-${res.id}`}
                              onClick={() => {
                                setRejectModalState({
                                  isOpen: true,
                                  reservationId: res.id,
                                  reservationCode: res.reservationCode,
                                  patientName: res.patientName,
                                  reason: 'Out of stock in cold chain storage',
                                });
                              }}
                              className="px-3 py-1.5 rounded-xl border border-slate-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors"
                            >
                              Decline
                            </button>
                          </div>
                        )}

                        {isConfirmed && (
                          <button
                            id={`dispense-btn-${res.id}`}
                            onClick={() => handleDispense(res.id)}
                            className="px-4 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Mark Dispensed & Collected</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Tab 2: Pharmacy Inventory Manager */
          <div className="p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base font-display">Inventory Availability Matrix</h3>
                <p className="text-xs text-slate-500">Click any stock status pill to toggle availability instantly for patients.</p>
              </div>

              <button
                id="add-stock-inventory-btn"
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 rounded-full bg-slate-950 text-white hover:bg-slate-800 text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Drug</span>
              </button>
            </div>

            {/* Inventory Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                    <th className="py-3 px-3">Medication Name</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Stock Status (Click to Toggle)</th>
                    <th className="py-3 px-3">Quantity</th>
                    <th className="py-3 px-3">Unit Price (GHS)</th>
                    <th className="py-3 px-3">Last Updated</th>
                    <th className="py-3 px-3">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pharmacyInventory.map(item => {
                    const med = medicines.find(m => m.id === item.medicineId);
                    if (!med) return null;

                    const isInStock = item.status === 'IN_STOCK';
                    const isLowStock = item.status === 'LOW_STOCK';
                    const isOut = item.status === 'OUT_OF_STOCK';
                    const rowAccent = isInStock
                      ? 'border-l-4 border-l-emerald-400 bg-emerald-50/20'
                      : isLowStock
                      ? 'border-l-4 border-l-amber-400 bg-amber-50/30'
                      : 'border-l-4 border-l-slate-300 bg-slate-50/40';

                    return (
                      <tr key={item.id} className={`hover:brightness-95 transition-all ${rowAccent}`}>
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-3">
                            {med.image && (
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                                <img
                                  src={med.image}
                                  alt={med.brandName}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-slate-900 text-sm">{med.brandName}</p>
                              <p className="text-[11px] text-slate-500">{med.genericName} • {med.dosageForm}</p>
                              <span className="text-[10px] font-mono text-slate-400">Batch: {item.batchNumber}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md">
                            {med.category}
                          </span>
                        </td>

                        {/* Interactive stock status toggle button */}
                        <td className="py-3.5 px-3">
                          <button
                            id={`toggle-stock-${item.id}`}
                            onClick={() => handleToggleStock(item.id, item.status)}
                            title="Click to toggle status"
                            className={`px-3 py-1 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 ${
                              isInStock
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : isLowStock
                                ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isInStock ? 'bg-emerald-500' : isLowStock ? 'bg-amber-500' : 'bg-slate-400'
                              }`}
                            />
                            <span>{item.status.replace('_', ' ')}</span>
                          </button>
                        </td>

                        <td className="py-3.5 px-3 font-mono font-bold text-slate-800 text-sm">
                          {item.quantity} units
                        </td>

                        <td className="py-3.5 px-3 font-mono font-bold text-slate-900 text-sm">
                          {formatGHS(item.unitPriceGHS)}
                        </td>

                        <td className="py-3.5 px-3 text-slate-400 text-[11px]">
                          {formatTimeAgo(item.lastUpdatedAt)}
                        </td>

                        <td className="py-3.5 px-3">
                          <button
                            id={`delete-inventory-${item.id}`}
                            onClick={() => handleDeleteInventoryItem(item)}
                            title="Remove from my pharmacy"
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Reject Reason Modal */}
      {rejectModalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Decline Hold {rejectModalState.reservationCode}</h3>
              <button
                onClick={() => setRejectModalState(prev => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Provide a clear reason for patient {rejectModalState.patientName}:
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <textarea
                value={rejectModalState.reason}
                onChange={e => setRejectModalState(prev => ({ ...prev, reason: e.target.value }))}
                rows={3}
                required
                className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-slate-900"
                placeholder="e.g. Batch allocated for in-hospital ICU transfer..."
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectModalState(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
                >
                  Confirm Decline
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Add Medicine to Inventory Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base font-display">Add Medication to Pharmacy</h3>
              <button onClick={resetAddDrugModal} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Existing catalogue drug vs. brand new drug */}
            <div className="flex rounded-xl bg-slate-100 p-1 text-xs">
              <button
                type="button"
                id="add-drug-mode-existing"
                onClick={() => setAddDrugMode('existing')}
                className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                  addDrugMode === 'existing' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Existing Catalogue Drug
              </button>
              <button
                type="button"
                id="add-drug-mode-new"
                onClick={() => setAddDrugMode('new')}
                className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                  addDrugMode === 'new' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Register New Drug
              </button>
            </div>

            <form onSubmit={handleAddStockItem} className="space-y-4 text-xs">
              {addDrugMode === 'existing' ? (
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Select Master Drug
                  </label>
                  <select
                    value={selectedMedId}
                    onChange={e => setSelectedMedId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-medium text-slate-900 bg-white"
                  >
                    {medicines.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.brandName} ({m.genericName} - {m.dosageForm})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200/80 space-y-3">
                  <div className="flex items-center gap-1.5 text-sky-800 font-bold">
                    <Tag className="w-4 h-4 text-sky-600" />
                    <span>New Drug Details</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Brand Name</label>
                      <input
                        type="text"
                        required
                        value={newDrugBrand}
                        onChange={e => setNewDrugBrand(e.target.value)}
                        placeholder="e.g. Panadol Extra"
                        className="w-full p-2 rounded-lg border border-slate-300 font-semibold text-slate-900 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Generic Name</label>
                      <input
                        type="text"
                        required
                        value={newDrugGeneric}
                        onChange={e => setNewDrugGeneric(e.target.value)}
                        placeholder="e.g. Paracetamol + Caffeine"
                        className="w-full p-2 rounded-lg border border-slate-300 text-slate-900 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Category</label>
                    <input
                      type="text"
                      required
                      list="pharmacist-category-options"
                      value={newDrugCategory}
                      onChange={e => setNewDrugCategory(e.target.value)}
                      placeholder="Pick an existing category or type a new one"
                      className="w-full p-2 rounded-lg border border-slate-300 text-slate-900 bg-white"
                    />
                    <datalist id="pharmacist-category-options">
                      {knownCategories.map(c => <option key={c} value={c} />)}
                    </datalist>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Dosage Form</label>
                      <input
                        type="text"
                        required
                        value={newDrugDosage}
                        onChange={e => setNewDrugDosage(e.target.value)}
                        placeholder="e.g. 500mg Tablets (24s)"
                        className="w-full p-2 rounded-lg border border-slate-300 text-slate-900 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Strength</label>
                      <input
                        type="text"
                        value={newDrugStrength}
                        onChange={e => setNewDrugStrength(e.target.value)}
                        placeholder="e.g. 500mg/65mg"
                        className="w-full p-2 rounded-lg border border-slate-300 text-slate-900 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Ghana FDA Reg No. (optional)</label>
                    <input
                      type="text"
                      value={newDrugFda}
                      onChange={e => setNewDrugFda(e.target.value)}
                      placeholder="Auto-generated if left blank"
                      className="w-full p-2 rounded-lg border border-slate-300 font-mono text-slate-900 bg-white"
                    />
                  </div>

                  <div className="flex items-center gap-4 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                      <input type="checkbox" checked={newDrugRx} onChange={e => setNewDrugRx(e.target.checked)} className="rounded-md text-slate-900" />
                      <span>Prescription required</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                      <input type="checkbox" checked={newDrugCritical} onChange={e => setNewDrugCritical(e.target.checked)} className="rounded-md text-slate-900" />
                      <span>Emergency critical</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Initial Quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newQty}
                    onChange={e => setNewQty(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Unit Price (GH₵)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min={1}
                    value={newPrice}
                    onChange={e => setNewPrice(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={resetAddDrugModal}
                  className="px-4 py-2 rounded-full font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-full bg-slate-950 text-white font-bold hover:bg-slate-800"
                >
                  {addDrugMode === 'new' ? 'Register & Stock Drug' : 'Save to Inventory'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

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
