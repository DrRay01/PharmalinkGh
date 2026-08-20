import React, { useState, useMemo } from 'react';
import { User, Pharmacy, Medicine, InventoryItem, Reservation, AuditLog, TherapeuticCategory, PharmacyStatus, ReservationStatus } from '../types';
import { store } from '../services/store';
import { formatTimeAgo, formatGHS } from '../utils/geo';
import {
  ShieldCheck,
  Building2,
  Pill,
  Activity,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
  FileText,
  Award,
  AlertTriangle,
  History,
  TrendingUp,
  MapPin,
  ChevronDown,
  ChevronUp,
  Store,
  Phone,
  Package,
  Clock,
  Users,
  BookmarkCheck,
  Trash2,
  Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminDashboardProps {
  currentUser: User;
  users: User[];
  pharmacies: Pharmacy[];
  medicines: Medicine[];
  inventory?: InventoryItem[];
  reservations: Reservation[];
  auditLogs: AuditLog[];
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  users,
  pharmacies,
  medicines,
  inventory = [],
  reservations,
  auditLogs,
}) => {
  const [activeTab, setActiveTab] = useState<'accreditation' | 'users' | 'holdings' | 'catalogue' | 'audits'>('accreditation');
  const [isAddMedModalOpen, setIsAddMedModalOpen] = useState(false);
  const [expandedVendorId, setExpandedVendorId] = useState<string | null>(null);
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');
  const [vendorFilterStatus, setVendorFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'SUSPENDED'>('ALL');
  const [holdingsStatusFilter, setHoldingsStatusFilter] = useState<'ALL' | ReservationStatus>('ALL');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // New drug form state
  const [newBrand, setNewBrand] = useState('');
  const [newGeneric, setNewGeneric] = useState('');
  const [newCategory, setNewCategory] = useState<TherapeuticCategory>('Emergency & ICU');
  const [newClass, setNewClass] = useState('');
  const [newDosage, setNewDosage] = useState('');
  const [newStrength, setNewStrength] = useState('');
  const [newFdaNo, setNewFdaNo] = useState('FDA/EM.24-');
  const [newDesc, setNewDesc] = useState('');
  const [newImage, setNewImage] = useState('');
  const [isCritical, setIsCritical] = useState(true);
  const [rxReq, setRxReq] = useState(true);

  // Metrics
  const totalVerifiedPharmacies = pharmacies.filter(p => p.status === 'APPROVED').length;
  const pendingAccreditations = pharmacies.filter(p => p.status === 'PENDING').length;
  const totalReservations = reservations.length;
  const fulfilledRate = reservations.length > 0
    ? Math.round((reservations.filter(r => r.status === 'COLLECTED').length / reservations.length) * 100)
    : 100;
  const totalUsers = users.length;
  const activeHoldings = reservations.filter(r => r.status === 'PENDING' || r.status === 'CONFIRMED').length;

  const filteredPharmacies = useMemo(() => {
    return pharmacies.filter(p => {
      const q = vendorSearchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.licenseNumber.toLowerCase().includes(q) ||
        p.superintendentName.toLowerCase().includes(q) ||
        p.locality.toLowerCase().includes(q);

      const matchesStatus = vendorFilterStatus === 'ALL' || p.status === vendorFilterStatus;

      return matchesQuery && matchesStatus;
    });
  }, [pharmacies, vendorSearchQuery, vendorFilterStatus]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const q = userSearchQuery.toLowerCase().trim();
      return (
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.pharmacyName || '').toLowerCase().includes(q)
      );
    });
  }, [users, userSearchQuery]);

  const filteredHoldings = useMemo(() => {
    if (holdingsStatusFilter === 'ALL') return reservations;
    return reservations.filter(r => r.status === holdingsStatusFilter);
  }, [reservations, holdingsStatusFilter]);

  const handleSetPharmacyStatus = (pharmaId: string, status: PharmacyStatus) => {
    store.setPharmacyStatus(pharmaId, status);
  };

  const handleDeleteUser = (u: User) => {
    if (window.confirm(`Delete ${u.name}'s account (${u.email})? This cannot be undone.${u.role === 'pharmacist' ? ' Their pharmacy license will also be suspended.' : ''}`)) {
      store.deleteUser(u.uid);
    }
  };

  const handleCreateMedicine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrand.trim() || !newGeneric.trim() || !newDosage.trim()) {
      alert('Please provide required medicine details');
      return;
    }

    const defaultImages: Record<string, string> = {
      'Antibiotics': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=80',
      'Respiratory & Asthma': 'https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=800&auto=format&fit=crop&q=80',
      'Antidiabetic & Insulin': 'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=800&auto=format&fit=crop&q=80',
      'Emergency & ICU': 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&auto=format&fit=crop&q=80',
    };

    store.addMedicine({
      brandName: newBrand.trim(),
      genericName: newGeneric.trim(),
      category: newCategory,
      therapeuticClass: newClass.trim() || 'Emergency & Critical Care',
      dosageForm: newDosage.trim(),
      strength: newStrength.trim() || 'Standard Clinical',
      ghanaFdaRegNo: newFdaNo.trim() || 'FDA/REG.24-0001',
      description: newDesc.trim() || 'Prescription drug registered with Ghana FDA.',
      commonIndications: ['Critical Care', 'Out-of-Stock Escalation'],
      isEmergencyCritical: isCritical,
      prescriptionRequired: rxReq,
      image: newImage.trim() || defaultImages[newCategory] || 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=800&auto=format&fit=crop&q=80',
    });

    setIsAddMedModalOpen(false);
    // Reset form
    setNewBrand('');
    setNewGeneric('');
    setNewClass('');
    setNewDosage('');
    setNewStrength('');
    setNewImage('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="rounded-md bg-slate-900 text-white p-6 sm:p-8 shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-500/20 text-amber-300 text-[11px] font-bold tracking-wide">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              Pharmacy Council of Ghana Oversight
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display text-white">
            Accreditation & Registry Console
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xl leading-relaxed">
            Manage pharmacy licensing, verify superintendent practitioner PINs, maintain canonical FDA drug registers, and monitor national out-of-stock triage telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="admin-add-master-drug-btn"
            onClick={() => setIsAddMedModalOpen(true)}
            className="px-5 py-2.5 rounded-md bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold transition-all shadow-md flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>Register FDA Drug</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-md p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Verified Pharmacies</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-extrabold text-slate-900 font-display">{totalVerifiedPharmacies}</span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              Active PCG
            </span>
          </div>
        </div>

        <div className="bg-white rounded-md p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Accreditation</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-extrabold text-slate-900 font-display">{pendingAccreditations}</span>
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
              Review Queue
            </span>
          </div>
        </div>

        <div className="bg-white rounded-md p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Catalogue Medications</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-extrabold text-slate-900 font-display">{medicines.length}</span>
            <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md">
              FDA Approved
            </span>
          </div>
        </div>

        <div className="bg-white rounded-md p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Fulfillment Efficiency</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-extrabold text-slate-900 font-display">{fulfilledRate}%</span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              Total: {totalReservations}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-md p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Registered Users</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-extrabold text-slate-900 font-display">{totalUsers}</span>
            <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
              Patients & Pharmacists
            </span>
          </div>
        </div>

        <div className="bg-white rounded-md p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Holdings</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-extrabold text-slate-900 font-display">{activeHoldings}</span>
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
              2-hr Locks Live
            </span>
          </div>
        </div>
      </div>

      {/* Main Tabs Container */}
      <div className="bg-white rounded-md border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 pt-5 pb-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              id="admin-tab-accreditation"
              onClick={() => setActiveTab('accreditation')}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
                activeTab === 'accreditation'
                  ? 'bg-slate-950 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Pharmacy Accreditation Queue ({pharmacies.length})
            </button>

            <button
              id="admin-tab-users"
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
                activeTab === 'users'
                  ? 'bg-slate-950 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Platform Users ({users.length})
            </button>

            <button
              id="admin-tab-holdings"
              onClick={() => setActiveTab('holdings')}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
                activeTab === 'holdings'
                  ? 'bg-slate-950 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Holdings ({reservations.length})
            </button>

            <button
              id="admin-tab-catalogue"
              onClick={() => setActiveTab('catalogue')}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
                activeTab === 'catalogue'
                  ? 'bg-slate-950 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Master Drug Register ({medicines.length})
            </button>

            <button
              id="admin-tab-audits"
              onClick={() => setActiveTab('audits')}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
                activeTab === 'audits'
                  ? 'bg-slate-950 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Audit Trail
            </button>
          </div>
        </div>

        {/* Tab 1: Pharmacy Accreditation & Vendor Control */}
        {activeTab === 'accreditation' && (
          <div className="p-6">
            {/* Vendor Controls Header: Search & Filter */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="flex-1 min-w-[240px] relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search vendor name, license number, superintendent, locality..."
                  value={vendorSearchQuery}
                  onChange={e => setVendorSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-md bg-slate-50 border border-slate-200 text-xs focus:outline-hidden focus:border-slate-900 focus:bg-white transition-all"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 font-medium mr-1">Status:</span>
                {(['ALL', 'PENDING', 'APPROVED', 'SUSPENDED'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setVendorFilterStatus(st)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      vendorFilterStatus === st
                        ? 'bg-slate-950 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st === 'ALL' ? 'All Vendors' : st === 'PENDING' ? 'Pending Review' : st === 'APPROVED' ? 'Approved Only' : 'Suspended'}
                  </button>
                ))}
              </div>
            </div>

            {/* Vendor List */}
            <div className="space-y-4">
              {filteredPharmacies.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <Store className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  No registered pharmacies match your filter query.
                </div>
              ) : (
                filteredPharmacies.map(pharma => {
                  const isExpanded = expandedVendorId === pharma.id;
                  const pharmaInventory = inventory.filter(i => i.pharmacyId === pharma.id);
                  const inStockCount = pharmaInventory.filter(i => i.status === 'IN_STOCK').length;
                  const owner = users.find(u => u.pharmacyId === pharma.id);
                  const cardAccent = pharma.status === 'APPROVED'
                    ? 'border-l-4 border-l-emerald-400 border-y border-r border-y-slate-200/80 border-r-slate-200/80 bg-emerald-50/20 hover:border-r-emerald-300 hover:border-y-emerald-300'
                    : pharma.status === 'PENDING'
                    ? 'border-l-4 border-l-amber-400 border-y border-r border-y-amber-200/70 border-r-amber-200/70 bg-amber-50/30 hover:border-r-amber-300 hover:border-y-amber-300'
                    : 'border-l-4 border-l-rose-400 border-y border-r border-y-rose-200/70 border-r-rose-200/70 bg-rose-50/30 hover:border-r-rose-300 hover:border-y-rose-300';

                  return (
                    <div
                      key={pharma.id}
                      className={`rounded-md p-4 pl-5 transition-all ${cardAccent}`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-slate-900 text-base font-display">{pharma.name}</h4>
                            {pharma.status === 'APPROVED' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                PCG Verified License
                              </span>
                            )}
                            {pharma.status === 'PENDING' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                                <Clock className="w-3.5 h-3.5" />
                                Pending Review
                              </span>
                            )}
                            {pharma.status === 'SUSPENDED' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-200">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Suspended — Sales Revoked
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                            <span>License: <strong className="font-mono text-slate-700">{pharma.licenseNumber}</strong></span>
                            <span>•</span>
                            <span>Superintendent: <strong className="text-slate-700">{pharma.superintendentName}</strong></span>
                            <span>•</span>
                            <span className="font-mono text-[11px]">PIN: {pharma.superintendentPin}</span>
                            <span>•</span>
                            <span>Tel: <a href={`tel:${pharma.phone}`} className="text-sky-700 font-bold underline">{pharma.phone}</a></span>
                          </div>

                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{pharma.address} ({pharma.locality}, {pharma.region})</span>
                            <span className="text-slate-400 ml-2">• Hours: {pharma.openingHours}</span>
                          </p>

                          {owner && (
                            <p className="text-xs text-slate-500 flex items-center gap-1.5 pt-1">
                              <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>
                                Registered by <strong className="text-slate-700">{owner.name}</strong>
                                <span className="text-slate-400"> • {owner.email} • {owner.phone}</span>
                              </span>
                            </p>
                          )}
                        </div>

                        {/* Inspector Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            id={`inspect-stock-${pharma.id}`}
                            onClick={() => setExpandedVendorId(isExpanded ? null : pharma.id)}
                            className="px-3.5 py-2 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors flex items-center gap-1.5"
                          >
                            <Package className="w-3.5 h-3.5 text-slate-500" />
                            <span>Inspect Stocks ({pharmaInventory.length})</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          {pharma.status === 'APPROVED' ? (
                            <button
                              id={`suspend-pharma-${pharma.id}`}
                              onClick={() => handleSetPharmacyStatus(pharma.id, 'SUSPENDED')}
                              className="px-4 py-2 rounded-md text-xs font-bold transition-all shadow-xs border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100"
                            >
                              Suspend / Revoke Sales
                            </button>
                          ) : (
                            <button
                              id={`approve-pharma-${pharma.id}`}
                              onClick={() => handleSetPharmacyStatus(pharma.id, 'APPROVED')}
                              className="px-4 py-2 rounded-md text-xs font-bold transition-all shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              {pharma.status === 'PENDING' ? 'Approve Pharmacy' : 'Reinstate Pharmacy'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expanded Stock & Pricing Inspection */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-slate-200/80 bg-white rounded-md p-3.5">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                              <Package className="w-3.5 h-3.5 text-sky-600" />
                              <span>Live Shelf Inventory & Pricing Audit ({pharmaInventory.length} line items)</span>
                            </h5>
                            <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                              {inStockCount} active in stock
                            </span>
                          </div>

                          {pharmaInventory.length === 0 ? (
                            <p className="text-xs text-slate-400 py-3 text-center">No inventory items listed for this dispensary yet.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-bold">
                                    <th className="py-2 px-2">Medication</th>
                                    <th className="py-2 px-2">Batch #</th>
                                    <th className="py-2 px-2">Stock Level</th>
                                    <th className="py-2 px-2">Unit Price</th>
                                    <th className="py-2 px-2">Last Reported</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {pharmaInventory.map(item => {
                                    const med = medicines.find(m => m.id === item.medicineId);
                                    return (
                                      <tr key={item.id} className="hover:bg-slate-50/60">
                                        <td className="py-2.5 px-2 font-medium text-slate-900">
                                          {med?.brandName || item.medicineId}
                                          <span className="text-slate-400 text-[11px] block">{med?.dosageForm}</span>
                                        </td>
                                        <td className="py-2.5 px-2 font-mono text-slate-600">{item.batchNumber}</td>
                                        <td className="py-2.5 px-2">
                                          {item.status === 'IN_STOCK' ? (
                                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold text-[10px]">
                                              {item.quantity} units
                                            </span>
                                          ) : item.status === 'LOW_STOCK' ? (
                                            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-bold text-[10px]">
                                              Low ({item.quantity})
                                            </span>
                                          ) : (
                                            <span className="text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md text-[10px]">
                                              Out of stock
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-2.5 px-2 font-bold font-mono text-slate-900">
                                          {formatGHS(item.unitPriceGHS)}
                                        </td>
                                        <td className="py-2.5 px-2 text-slate-400 text-[11px]">
                                          {formatTimeAgo(item.lastUpdatedAt)}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab: Platform Users */}
        {activeTab === 'users' && (
          <div className="p-6">
            <div className="flex-1 min-w-[240px] relative mb-6 pb-4 border-b border-slate-100">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search user name, email, or pharmacy..."
                value={userSearchQuery}
                onChange={e => setUserSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-md bg-slate-50 border border-slate-200 text-xs focus:outline-hidden focus:border-slate-900 focus:bg-white transition-all"
              />
            </div>

            {filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                {users.length === 0 ? 'No patients or pharmacists have registered yet.' : 'No users match your search.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                      <th className="py-3 px-3">User</th>
                      <th className="py-3 px-3">Role</th>
                      <th className="py-3 px-3">Contact</th>
                      <th className="py-3 px-3">Pharmacy</th>
                      <th className="py-3 px-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map(u => (
                      <tr key={u.uid} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center font-bold text-slate-500">
                              {u.avatar ? (
                                <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                u.name.charAt(0)
                              )}
                            </div>
                            <span className="font-bold text-slate-900 text-sm">{u.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md capitalize ${
                            u.role === 'pharmacist' ? 'text-emerald-700 bg-emerald-50' : 'text-sky-700 bg-sky-50'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{u.email}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span className="font-mono">{u.phone}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-slate-600">
                          {u.pharmacyName || <span className="text-slate-300">—</span>}
                        </td>
                        <td className="py-3.5 px-3">
                          <button
                            id={`delete-user-${u.uid}`}
                            onClick={() => handleDeleteUser(u)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 text-xs font-bold transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab: All Holdings */}
        {activeTab === 'holdings' && (
          <div className="p-6">
            <div className="flex flex-wrap items-center gap-1.5 mb-6 pb-4 border-b border-slate-100">
              <span className="text-xs text-slate-400 font-medium mr-1">Status:</span>
              {(['ALL', 'PENDING', 'CONFIRMED', 'COLLECTED', 'REJECTED', 'EXPIRED', 'CANCELLED'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setHoldingsStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    holdingsStatusFilter === st
                      ? 'bg-slate-950 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st === 'ALL' ? 'All' : st.charAt(0) + st.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            {filteredHoldings.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <BookmarkCheck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                No holdings match this filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                      <th className="py-3 px-3">Code</th>
                      <th className="py-3 px-3">Patient</th>
                      <th className="py-3 px-3">Medicine</th>
                      <th className="py-3 px-3">Pharmacy</th>
                      <th className="py-3 px-3">Qty / Total</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredHoldings.map(res => (
                      <tr key={res.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-3 font-mono font-bold text-slate-800">{res.reservationCode}</td>
                        <td className="py-3.5 px-3">
                          <p className="font-semibold text-slate-800">{res.patientName}</p>
                          <p className="text-slate-400 font-mono text-[11px]">{res.patientPhone}</p>
                        </td>
                        <td className="py-3.5 px-3">
                          <p className="font-semibold text-slate-800">{res.medicineName}</p>
                          <p className="text-slate-400 text-[11px]">{res.genericName}</p>
                        </td>
                        <td className="py-3.5 px-3 text-slate-600">{res.pharmacyName}</td>
                        <td className="py-3.5 px-3">
                          <span className="font-mono text-slate-700">{res.quantity}</span>
                          <span className="text-slate-400"> • </span>
                          <span className="font-mono font-bold text-slate-900">{formatGHS(res.totalPriceGHS)}</span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            res.status === 'COLLECTED' ? 'text-emerald-700 bg-emerald-50'
                            : res.status === 'CONFIRMED' ? 'text-sky-700 bg-sky-50'
                            : res.status === 'PENDING' ? 'text-amber-700 bg-amber-50'
                            : res.status === 'REJECTED' || res.status === 'EXPIRED' ? 'text-rose-700 bg-rose-50'
                            : 'text-slate-500 bg-slate-100'
                          }`}>
                            {res.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-slate-400 text-[11px]">{formatTimeAgo(res.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Master Drug Register */}
        {activeTab === 'catalogue' && (
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                    <th className="py-3 px-3">Medication & Packaging</th>
                    <th className="py-3 px-3">FDA Reg Number</th>
                    <th className="py-3 px-3">Therapeutic Class</th>
                    <th className="py-3 px-3">Dosage / Strength</th>
                    <th className="py-3 px-3">Emergency Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {medicines.map(med => (
                    <tr key={med.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          {med.image && (
                            <div className="w-10 h-10 rounded-md overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
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
                            <p className="text-[11px] text-slate-500">{med.genericName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-mono font-bold text-slate-700">
                        {med.ghanaFdaRegNo}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md">
                          {med.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-600">
                        {med.dosageForm} ({med.strength})
                      </td>
                      <td className="py-3.5 px-3">
                        {med.isEmergencyCritical ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                            Critical Triage
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-500">
                            Standard Rx
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: System Audit Trail */}
        {activeTab === 'audits' && (
          <div className="p-6">
            {auditLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <History className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                No audit events recorded yet. Actions like reservations, verification toggles, and stock updates will stream here.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 font-mono text-xs">
                {auditLogs.map(log => (
                  <div key={log.id} className="py-3 flex items-start justify-between gap-4">
                    <div>
                      <span className="font-bold text-slate-900 uppercase">[{log.action}]</span>
                      <p className="text-slate-600 mt-0.5">{log.details}</p>
                    </div>
                    <div className="text-right text-[11px] text-slate-400 shrink-0">
                      <span>{log.actorName}</span>
                      <span className="block">{formatTimeAgo(log.timestamp)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Master Medicine Modal */}
      {isAddMedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-md p-6 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base font-display">Register Ghana FDA Master Medicine</h3>
              <button onClick={() => setIsAddMedModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMedicine} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Brand Name</label>
                  <input
                    type="text"
                    value={newBrand}
                    onChange={e => setNewBrand(e.target.value)}
                    placeholder="e.g. Rocephin 1g"
                    required
                    className="w-full p-2.5 rounded-md border border-slate-200 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Generic Name</label>
                  <input
                    type="text"
                    value={newGeneric}
                    onChange={e => setNewGeneric(e.target.value)}
                    placeholder="e.g. Ceftriaxone Sodium"
                    required
                    className="w-full p-2.5 rounded-md border border-slate-200 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as TherapeuticCategory)}
                    className="w-full p-2.5 rounded-md border border-slate-200 bg-white"
                  >
                    <option value="Emergency & ICU">Emergency & ICU</option>
                    <option value="Antibiotics">Antibiotics</option>
                    <option value="Respiratory & Asthma">Respiratory & Asthma</option>
                    <option value="Antidiabetic & Insulin">Antidiabetic & Insulin</option>
                    <option value="Cardiovascular & Hypertensive">Cardiovascular</option>
                    <option value="Antimalarial">Antimalarial</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Ghana FDA Reg No.</label>
                  <input
                    type="text"
                    value={newFdaNo}
                    onChange={e => setNewFdaNo(e.target.value)}
                    placeholder="FDA/SD.24-001"
                    required
                    className="w-full p-2.5 rounded-md border border-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Dosage Form</label>
                  <input
                    type="text"
                    value={newDosage}
                    onChange={e => setNewDosage(e.target.value)}
                    placeholder="e.g. 1g IV Vial"
                    required
                    className="w-full p-2.5 rounded-md border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Strength</label>
                  <input
                    type="text"
                    value={newStrength}
                    onChange={e => setNewStrength(e.target.value)}
                    placeholder="e.g. 1000mg/vial"
                    required
                    className="w-full p-2.5 rounded-md border border-slate-200"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isCritical}
                    onChange={e => setIsCritical(e.target.checked)}
                    className="rounded-md text-slate-900"
                  />
                  <span>Mark as Emergency Critical</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={rxReq}
                    onChange={e => setRxReq(e.target.checked)}
                    className="rounded-md text-slate-900"
                  />
                  <span>Prescription Mandatory</span>
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddMedModalOpen(false)}
                  className="px-4 py-2 rounded-md font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-md bg-slate-950 text-white font-bold hover:bg-slate-800"
                >
                  Save to FDA Register
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
