import React, { useState, useEffect } from 'react';
import { store } from './services/store';
import { User, Pharmacy, Medicine, InventoryItem, Reservation, AuditLog, UserRole } from './types';
import { Navbar } from './components/Navbar';
import { PatientView } from './components/PatientView';
import { PharmacistDashboard } from './components/PharmacistDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthModal } from './components/AuthModal';
import { LogoutConfirmModal } from './components/LogoutConfirmModal';
import { ToastContainer } from './components/ToastContainer';
import { WelcomeGateway } from './components/WelcomeGateway';
import { AdminGateway } from './components/AdminGateway';
import { HelpGuideModal } from './components/HelpGuideModal';
import { ShieldCheck, HeartHandshake, PhoneCall, Building2, ExternalLink, Activity, HelpCircle } from 'lucide-react';

const TUTORIAL_SEEN_KEY = 'plgh_tutorial_seen_v1';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User>(() => store.getCurrentUser());
  const [users, setUsers] = useState<User[]>(() => store.getUsers());
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>(() => store.getPharmacies());
  const [medicines, setMedicines] = useState<Medicine[]>(() => store.getMedicines());
  const [inventory, setInventory] = useState<InventoryItem[]>(() => store.getInventory());
  const [reservations, setReservations] = useState<Reservation[]>(() => store.getReservations());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => store.getAuditLogs());
  const [userLocation, setUserLocation] = useState(() => store.getUserLocation());

  // Auth modal state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'signup'>('login');
  const [authInitialRole, setAuthInitialRole] = useState<UserRole>('patient');

  // Logout confirm modal state
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Help / quick-tutorial guide modal state
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Whether the visitor has deliberately entered the app (signed in, or skipped the welcome gateway as a guest)
  const [hasEnteredApp, setHasEnteredApp] = useState(() => {
    const initial = store.getCurrentUser();
    return !!initial.email && initial.uid !== 'guest-user';
  });

  // Patient sub-tab ('search' | 'reservations')
  const [patientSubTab, setPatientSubTab] = useState<'search' | 'reservations'>('search');

  // Active top-level tab
  const [activeTab, setActiveTab] = useState<'patient-search' | 'patient-reservations' | 'pharmacist' | 'admin'>('patient-search');

  // Lightweight path-based routing — no router library. The admin console lives at its
  // own URL (/admin) so it has a distinct, bookmarkable entry point from the rest of the app.
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setPathname(path);
  };

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const isAdminRoute = pathname === '/admin' || pathname === '/admin/';

  // Keep an admin session anchored at /admin regardless of which URL they signed in from.
  useEffect(() => {
    if (currentUser.role === 'admin' && !isAdminRoute) {
      navigate('/admin');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.role]);

  useEffect(() => {
    const unsubUser = store.subscribe('currentUser', (u: User) => {
      setCurrentUser(u);
      if (u.role === 'pharmacist') {
        setActiveTab('pharmacist');
      } else if (u.role === 'admin') {
        setActiveTab('admin');
      } else {
        setActiveTab('patient-search');
      }
    });

    const unsubUsers = store.subscribe('users', (uList: User[]) => setUsers(uList));
    const unsubPharmacies = store.subscribe('pharmacies', (p: Pharmacy[]) => setPharmacies(p));
    const unsubMedicines = store.subscribe('medicines', (m: Medicine[]) => setMedicines(m));
    const unsubInventory = store.subscribe('inventory', (i: InventoryItem[]) => setInventory(i));
    const unsubReservations = store.subscribe('reservations', (r: Reservation[]) => setReservations(r));
    const unsubAudits = store.subscribe('auditLogs', (a: AuditLog[]) => setAuditLogs(a));
    const unsubLocation = store.subscribe('userLocation', (loc: any) => setUserLocation(loc));

    return () => {
      unsubUser();
      unsubUsers();
      unsubPharmacies();
      unsubMedicines();
      unsubInventory();
      unsubReservations();
      unsubAudits();
      unsubLocation();
    };
  }, []);

  const openAuth = (mode: 'login' | 'signup' = 'login', role: UserRole = 'patient') => {
    setAuthInitialMode(mode);
    setAuthInitialRole(role);
    setIsAuthOpen(true);
  };

  // Pharmacist's assigned pharmacy
  const currentPharmacy = pharmacies.find(p => p.id === (currentUser.pharmacyId || 'pharma-01')) || pharmacies[0];

  // Active patient reservation count
  const activePatientReservationsCount = reservations.filter(
    r => r.patientUid === currentUser.uid && (r.status === 'PENDING' || r.status === 'CONFIRMED')
  ).length;

  const isGuest = !currentUser.email || currentUser.uid === 'guest-user';
  const showWelcomeGateway = isGuest && !hasEnteredApp;

  // Auto-open the quick guide the first time anyone lands in the app in this browser.
  // It stays reachable afterwards via the floating help button.
  useEffect(() => {
    if (showWelcomeGateway || isAdminRoute) return;
    if (localStorage.getItem(TUTORIAL_SEEN_KEY)) return;
    localStorage.setItem(TUTORIAL_SEEN_KEY, '1');
    setIsHelpOpen(true);
  }, [showWelcomeGateway, isAdminRoute]);

  const helpGuideRole = currentUser.role === 'pharmacist' || currentUser.role === 'admin'
    ? currentUser.role
    : isGuest ? 'guest' : 'patient';

  const handleNavTabChange = (tab: any) => {
    if (tab === 'patient-search') {
      setActiveTab('patient-search');
      setPatientSubTab('search');
    } else if (tab === 'patient-reservations') {
      setActiveTab('patient-reservations');
      setPatientSubTab('reservations');
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-900 selection:bg-slate-900 selection:text-white">
      {isAdminRoute && currentUser.role !== 'admin' ? (
        /* 1a. /admin, not signed in as the PCG Inspector — dedicated admin sign-in, distinct from the citizen-facing gateway */
        <AdminGateway onBack={() => navigate('/')} />
      ) : !isAdminRoute && showWelcomeGateway ? (
        /* 1b. Welcome Gateway — shown until the visitor signs in or explicitly skips to guest search */
        <WelcomeGateway
          onOpenAuth={(mode, role) => openAuth(mode, role)}
          onContinueAsGuest={() => setHasEnteredApp(true)}
          onGoToAdmin={() => navigate('/admin')}
          onOpenHelp={() => setIsHelpOpen(true)}
        />
      ) : (
        <>
          {/* 2. Top Navigation */}
          <Navbar
            currentUser={currentUser}
            activeTab={activeTab}
            setActiveTab={handleNavTabChange}
            activeReservationsCount={activePatientReservationsCount}
            userLocation={userLocation}
            onOpenAuth={openAuth}
            onOpenLogout={() => setIsLogoutModalOpen(true)}
          />

          {/* 3. Main Views */}
          <main className="flex-1">
            {isAdminRoute ? (
              <AdminDashboard
                currentUser={currentUser}
                users={users}
                pharmacies={pharmacies}
                medicines={medicines}
                inventory={inventory}
                reservations={reservations}
                auditLogs={auditLogs}
              />
            ) : (
              <>
                {currentUser.role === 'patient' && (
                  <PatientView
                    currentUser={currentUser}
                    medicines={medicines}
                    pharmacies={pharmacies}
                    inventory={inventory}
                    reservations={reservations}
                    userLocation={userLocation}
                    activeSubTab={patientSubTab}
                    setActiveSubTab={setPatientSubTab}
                    onOpenAuth={openAuth}
                  />
                )}

                {currentUser.role === 'pharmacist' && (
                  <PharmacistDashboard
                    currentUser={currentUser}
                    pharmacy={currentPharmacy}
                    medicines={medicines}
                    inventory={inventory}
                    reservations={reservations}
                  />
                )}
              </>
            )}
          </main>

          {/* 4. Footer */}
          <footer className="bg-white border-t border-slate-200/80 py-8 px-4 sm:px-6 lg:px-8 text-xs text-slate-500 mt-auto">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="font-bold text-slate-800">PharmaLink GH</span>
                <span>— Emergency Medication & Out-of-Stock Locator Network</span>
              </div>

              <div className="flex items-center gap-4 text-[11px] text-slate-400">
                <span>Pharmacy Council Ghana (PCG) Compliant</span>
                <span>•</span>
                <span>Ghana FDA Register Cross-Referenced</span>
                <span>•</span>
                <span>Haversine Spatial Proximity</span>
              </div>
            </div>
          </footer>

          {/* 4b. Floating quick-guide trigger */}
          <button
            id="open-help-guide-btn"
            onClick={() => setIsHelpOpen(true)}
            className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 px-4 py-3 rounded-md bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold shadow-lg transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Quick Guide</span>
          </button>
        </>
      )}

      {/* 5. Auth Modal (Sign In / Register) */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialMode={authInitialMode}
        initialRole={authInitialRole}
      />

      {/* 6. Logout Confirmation Modal (with Holds Checker) */}
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        currentUser={currentUser}
        reservations={reservations}
      />

      {/* 6b. Quick Guide / Tutorial Modal */}
      <HelpGuideModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        role={helpGuideRole}
        userName={!isGuest ? currentUser.name : undefined}
      />

      {/* 7. Toast Notifications */}
      <ToastContainer />
    </div>
  );
}
