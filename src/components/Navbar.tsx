import React, { useState } from 'react';
import { User, LocalityPreset } from '../types';
import { GHANAIAN_LOCALITIES } from '../data/seedData';
import { store } from '../services/store';
import { MapPin, BookmarkCheck, Store, Shield, Activity, ChevronDown, LogIn, UserPlus, UserCircle, LogOut } from 'lucide-react';
import pharmalinkMonogram from '../assets/logos/pharmalink-logo-monogram.png';

interface NavbarProps {
  currentUser: User;
  activeTab: 'patient-search' | 'patient-reservations' | 'pharmacist' | 'admin';
  setActiveTab: (tab: any) => void;
  activeReservationsCount: number;
  userLocation: { name: string; coordinates: any };
  onOpenAuth: (mode?: 'login' | 'signup') => void;
  onOpenLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  activeReservationsCount,
  userLocation,
  onOpenAuth,
  onOpenLogout,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const isGuest = !currentUser.email || currentUser.uid === 'guest-user';

  const handleLocationSelect = (loc: LocalityPreset) => {
    store.setUserLocation(loc.name, loc.coordinates);
  };

  const handleTriggerLogout = () => {
    setIsUserMenuOpen(false);
    onOpenLogout();
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div 
            onClick={() => setActiveTab(currentUser.role === 'patient' ? 'patient-search' : currentUser.role)} 
            className="cursor-pointer flex items-center gap-2.5 group"
          >
            <div className="w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-transform">
              <img src={pharmalinkMonogram} alt="PharmaLink GH logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 tracking-tight text-lg font-display">PharmaLink</span>
                <span className="bg-emerald-500/10 text-emerald-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md font-mono">GH</span>
              </div>
              <span className="text-[10px] text-slate-400 tracking-wider block font-medium">Emergency Out-of-Stock Locator</span>
            </div>
          </div>
        </div>

        {/* Locality Selector Dropdown — patients only; pharmacists/admin don't search by proximity */}
        {currentUser.role === 'patient' && (
          <div className="hidden lg:flex items-center gap-2">
            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/80 hover:bg-slate-200/80 text-xs font-semibold text-slate-700 transition-colors border border-slate-200/60">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span className="max-w-[170px] truncate">{userLocation.name}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {/* Dropdown Menu */}
              <div className="absolute left-0 mt-1.5 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 hidden group-hover:block z-50">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Simulate Location (Haversine Calc)
                </div>
                {GHANAIAN_LOCALITIES.map(loc => (
                  <button
                    key={loc.name}
                    onClick={() => handleLocationSelect(loc)}
                    className={`w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 flex items-center justify-between ${
                      loc.name === userLocation.name ? 'font-bold text-sky-700 bg-sky-50/50' : 'text-slate-700'
                    }`}
                  >
                    <span className="truncate">{loc.name}</span>
                    <span className="text-[10px] text-slate-400 shrink-0 font-medium ml-2">{loc.region}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Tabs based on Role */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {currentUser.role === 'patient' && (
            <>
              <button
                id="nav-tab-search"
                onClick={() => setActiveTab('patient-search')}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  activeTab === 'patient-search'
                    ? 'bg-slate-950 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Search Medicine
              </button>

              {/* Requirement 3: Only visible when patient is logged in (not guest) */}
              {!isGuest && (
                <button
                  id="nav-tab-reservations"
                  onClick={() => setActiveTab('patient-reservations')}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all relative flex items-center gap-1.5 ${
                    activeTab === 'patient-reservations'
                      ? 'bg-slate-950 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <BookmarkCheck className="w-3.5 h-3.5" />
                  <span>My Holds</span>
                  {activeReservationsCount > 0 && (
                    <span className="bg-emerald-500 text-white text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full">
                      {activeReservationsCount}
                    </span>
                  )}
                </button>
              )}
            </>
          )}

          {currentUser.role === 'pharmacist' && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200/80">
                <Store className="w-3.5 h-3.5 text-emerald-600" />
                <span>{currentUser.pharmacyName || 'Dispenser Console'}</span>
              </span>
            </div>
          )}

          {currentUser.role === 'admin' && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200/80">
                <Shield className="w-3.5 h-3.5 text-amber-600" />
                <span>Pharmacy Council Accreditation Console</span>
              </span>
            </div>
          )}
        </nav>

        {/* User Account Controls */}
        <div className="flex items-center gap-2">
          {isGuest ? (
            <div className="flex items-center gap-1.5">
              <button
                id="nav-auth-login-btn"
                onClick={() => onOpenAuth('login')}
                className="px-3.5 py-1.5 rounded-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-2xs"
              >
                Sign In
              </button>
              <button
                id="nav-auth-signup-btn"
                onClick={() => onOpenAuth('signup')}
                className="hidden sm:inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Register</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {/* User Profile Dropdown */}
              <div className="relative">
                <button
                  id="nav-user-menu-btn"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1 pl-2 rounded-full hover:bg-slate-100 transition-colors border border-slate-200"
                >
                  <span className="text-xs font-bold text-slate-700 hidden md:inline max-w-[100px] truncate">
                    {currentUser.name.split(' ')[0]}
                  </span>
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {currentUser.avatar ? (
                      <img
                        src={currentUser.avatar}
                        alt={currentUser.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      currentUser.name.charAt(0)
                    )}
                  </div>
                  <ChevronDown className="w-3 h-3 text-slate-400 mr-1" />
                </button>

                {isUserMenuOpen && (
                  <div 
                    className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="font-bold text-xs text-slate-900">{currentUser.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                        {currentUser.role === 'patient' ? 'Verified Patient' : currentUser.role === 'pharmacist' ? 'Community Dispenser' : 'PCG Inspector'}
                      </span>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => onOpenAuth('login')}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <LogIn className="w-3.5 h-3.5 text-slate-400" />
                        <span>Switch Account</span>
                      </button>

                      <div className="border-t border-slate-100 mt-1 pt-1">
                        <button
                          id="dropdown-logout-btn"
                          onClick={handleTriggerLogout}
                          className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                        >
                          <LogOut className="w-3.5 h-3.5 text-rose-500" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

