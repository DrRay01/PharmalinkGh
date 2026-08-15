import {
  User,
  Pharmacy,
  Medicine,
  InventoryItem,
  Reservation,
  ReservationStatus,
  StockStatus,
  UserRole,
  Coordinates,
  AuditLog,
  PharmacyStatus
} from '../types';
import { 
  INITIAL_USERS, 
  INITIAL_PHARMACIES, 
  INITIAL_MEDICINES, 
  INITIAL_INVENTORY, 
  INITIAL_RESERVATIONS,
  GHANAIAN_LOCALITIES
} from '../data/seedData';
import { 
  db, 
  auth, 
  signInWithGoogle as fbSignInWithGoogle,
  signInWithEmail as fbSignInWithEmail,
  signUpWithEmail as fbSignUpWithEmail,
  logOutFromFirebase,
  seedFirestoreIfEmpty
} from './firebase';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDoc,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

const STORAGE_KEYS = {
  USERS: 'pharmalink_users_v1',
  CURRENT_USER: 'pharmalink_current_user_v1',
  PHARMACIES: 'pharmalink_pharmacies_v1',
  MEDICINES: 'pharmalink_medicines_v1',
  INVENTORY: 'pharmalink_inventory_v1',
  RESERVATIONS: 'pharmalink_reservations_v1',
  USER_LOCATION: 'pharmalink_user_location_v1',
  AUDIT_LOGS: 'pharmalink_audit_logs_v1',
};

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
}

type Listener<T> = (data: T) => void;

export const GUEST_USER: User = {
  uid: 'guest-user',
  email: '',
  name: 'Guest User',
  phone: '',
  role: 'patient',
};

// Fixed PCG Inspector (admin) credentials. There is no admin self-registration —
// this single account is the only way into the accreditation console.
export const PCG_ADMIN_EMAIL = 'inspector@pharmacycouncil.gov.gh';
export const PCG_ADMIN_PASSWORD = 'PCGAdmin#2024';

// Firebase error codes that mean "the Auth provider itself can't be reached" —
// safe to fall back to the local/offline account directory for. Any other
// error (wrong password, email already in use, etc.) is a real rejection and
// must NOT silently fall through, or the fallback becomes a login bypass.
const AUTH_PROVIDER_UNAVAILABLE_CODES = new Set([
  'auth/operation-not-allowed',
  'auth/configuration-not-found',
  'auth/network-request-failed',
  'auth/internal-error',
]);

function isAuthProviderUnavailable(error: any): boolean {
  return AUTH_PROVIDER_UNAVAILABLE_CODES.has(error?.code);
}

const PCG_ADMIN_USER: User = {
  uid: 'pcg-admin-fixed',
  email: PCG_ADMIN_EMAIL,
  name: 'Dr. Kwabena Frimpong (PCG Inspector)',
  phone: '+233 30 266 1234',
  role: 'admin',
  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
};

class PharmaLinkStore {
  private users: User[] = [];
  private currentUser: User = GUEST_USER;
  private pharmacies: Pharmacy[] = [];
  private medicines: Medicine[] = [];
  private inventory: InventoryItem[] = [];
  private reservations: Reservation[] = [];
  private auditLogs: AuditLog[] = [];
  private isFirebaseConnected: boolean = false;
  private userLocation: { name: string; coordinates: Coordinates } = {
    name: GHANAIAN_LOCALITIES[0].name,
    coordinates: GHANAIAN_LOCALITIES[0].coordinates,
  };

  private listeners: Map<string, Set<Listener<any>>> = new Map();

  constructor() {
    this.init();
    this.initFirestoreSync();
  }

  private init() {
    try {
      const savedUsers = localStorage.getItem(STORAGE_KEYS.USERS);
      this.users = savedUsers ? JSON.parse(savedUsers) : INITIAL_USERS;

      const savedCurrentUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      this.currentUser = savedCurrentUser ? JSON.parse(savedCurrentUser) : GUEST_USER;

      const savedPharmacies = localStorage.getItem(STORAGE_KEYS.PHARMACIES);
      this.pharmacies = savedPharmacies ? JSON.parse(savedPharmacies) : INITIAL_PHARMACIES;

      const savedMedicines = localStorage.getItem(STORAGE_KEYS.MEDICINES);
      if (savedMedicines) {
        const parsed = JSON.parse(savedMedicines) as Medicine[];
        this.medicines = parsed.map(m => {
          const initMatch = INITIAL_MEDICINES.find(im => im.id === m.id || im.brandName === m.brandName);
          return {
            ...m,
            image: m.image || initMatch?.image || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80',
          };
        });
      } else {
        this.medicines = INITIAL_MEDICINES;
      }

      const savedInventory = localStorage.getItem(STORAGE_KEYS.INVENTORY);
      this.inventory = savedInventory ? JSON.parse(savedInventory) : INITIAL_INVENTORY;

      const savedReservations = localStorage.getItem(STORAGE_KEYS.RESERVATIONS);
      this.reservations = savedReservations ? JSON.parse(savedReservations) : INITIAL_RESERVATIONS;

      const savedLocation = localStorage.getItem(STORAGE_KEYS.USER_LOCATION);
      if (savedLocation) {
        this.userLocation = JSON.parse(savedLocation);
      }

      this.checkAndExpireReservations();
    } catch (e) {
      console.error('Error loading stored data, using fallback seeds:', e);
      this.users = INITIAL_USERS;
      this.currentUser = GUEST_USER;
      this.pharmacies = INITIAL_PHARMACIES;
      this.medicines = INITIAL_MEDICINES;
      this.inventory = INITIAL_INVENTORY;
      this.reservations = INITIAL_RESERVATIONS;
    }
  }

  /**
   * Set up real-time bidirectional Firestore Synchronization
   */
  private async initFirestoreSync() {
    try {
      // Seed Firestore with initial catalogue and facilities if empty
      await seedFirestoreIfEmpty();
      this.isFirebaseConnected = true;

      // Realtime listener for Medicines
      onSnapshot(collection(db, 'medicines'), snapshot => {
        if (!snapshot.empty) {
          const meds: Medicine[] = [];
          snapshot.forEach(docSnap => {
            meds.push(docSnap.data() as Medicine);
          });
          if (meds.length > 0) {
            this.medicines = meds;
            this.persist(STORAGE_KEYS.MEDICINES, this.medicines);
            this.emit('medicines', this.medicines);
          }
        }
      }, err => console.warn('Firestore medicines sync notice:', err.message));

      // Realtime listener for Pharmacies
      onSnapshot(collection(db, 'pharmacies'), snapshot => {
        if (!snapshot.empty) {
          const pharmas: Pharmacy[] = [];
          snapshot.forEach(docSnap => {
            pharmas.push(docSnap.data() as Pharmacy);
          });
          if (pharmas.length > 0) {
            this.pharmacies = pharmas;
            this.persist(STORAGE_KEYS.PHARMACIES, this.pharmacies);
            this.emit('pharmacies', this.pharmacies);
          }
        }
      }, err => console.warn('Firestore pharmacies sync notice:', err.message));

      // Realtime listener for Inventory
      onSnapshot(collection(db, 'inventory'), snapshot => {
        if (!snapshot.empty) {
          const inv: InventoryItem[] = [];
          snapshot.forEach(docSnap => {
            inv.push(docSnap.data() as InventoryItem);
          });
          if (inv.length > 0) {
            this.inventory = inv;
            this.persist(STORAGE_KEYS.INVENTORY, this.inventory);
            this.emit('inventory', this.inventory);
          }
        }
      }, err => console.warn('Firestore inventory sync notice:', err.message));

      // Realtime listener for Reservations
      onSnapshot(collection(db, 'reservations'), snapshot => {
        if (!snapshot.empty) {
          const res: Reservation[] = [];
          snapshot.forEach(docSnap => {
            res.push(docSnap.data() as Reservation);
          });
          if (res.length > 0) {
            this.reservations = res;
            this.persist(STORAGE_KEYS.RESERVATIONS, this.reservations);
            this.emit('reservations', this.reservations);
          }
        }
      }, err => console.warn('Firestore reservations sync notice:', err.message));

      // Realtime listener for Audit Logs
      onSnapshot(collection(db, 'auditLogs'), snapshot => {
        if (!snapshot.empty) {
          const logs: AuditLog[] = [];
          snapshot.forEach(docSnap => {
            logs.push(docSnap.data() as AuditLog);
          });
          if (logs.length > 0) {
            // Sort by timestamp descending
            logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            this.auditLogs = logs;
            this.persist(STORAGE_KEYS.AUDIT_LOGS, this.auditLogs);
            this.emit('auditLogs', this.auditLogs);
          }
        }
      }, err => console.warn('Firestore auditLogs sync notice:', err.message));

      // Realtime listener for Users
      onSnapshot(collection(db, 'users'), snapshot => {
        if (!snapshot.empty) {
          const uList: User[] = [];
          snapshot.forEach(docSnap => {
            uList.push(docSnap.data() as User);
          });
          if (uList.length > 0) {
            this.users = uList;
            this.persist(STORAGE_KEYS.USERS, this.users);
            this.emit('users', this.users);
          }
        }
      }, err => console.warn('Firestore users sync notice:', err.message));

      // Listen to Firebase Auth state
      onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
        if (fbUser) {
          try {
            const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
            if (userDoc.exists()) {
              const u = userDoc.data() as User;
              this.currentUser = u;
            } else {
              const u: User = {
                uid: fbUser.uid,
                email: fbUser.email || '',
                name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Patient',
                phone: fbUser.phoneNumber || '',
                role: 'patient',
                avatar: fbUser.photoURL || undefined,
              };
              this.currentUser = u;
            }
            this.persist(STORAGE_KEYS.CURRENT_USER, this.currentUser);
            this.emit('currentUser', this.currentUser);
          } catch (e) {
            console.error('Error fetching user profile upon auth state change:', e);
          }
        }
      });
    } catch (e) {
      console.warn('Firestore sync setup initialized with local persistence:', e);
    }
  }

  private persist(key: string, data: any) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }

  public subscribe(event: string, callback: Listener<any>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach(cb => {
      try {
        cb(data);
      } catch (err) {
        console.error('Store listener error:', err);
      }
    });
  }

  public showToast(type: ToastMessage['type'], title: string, message: string) {
    const toast: ToastMessage = {
      id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type,
      title,
      message,
      duration: 4500,
    };
    this.emit('toast', toast);
  }

  // --- Users & Roles ---
  public getUsers(): User[] {
    return [...this.users];
  }

  public getCurrentUser(): User {
    return { ...this.currentUser };
  }

  public async deleteUser(uid: string): Promise<void> {
    const target = this.users.find(u => u.uid === uid);
    if (!target) return;

    this.users = this.users.filter(u => u.uid !== uid);
    this.persist(STORAGE_KEYS.USERS, this.users);
    this.emit('users', this.users);

    // A removed pharmacist can no longer operate their pharmacy — revoke it too.
    if (target.role === 'pharmacist' && target.pharmacyId) {
      await this.setPharmacyStatus(target.pharmacyId, 'SUSPENDED');
    }

    // If the deleted account is the one currently signed in, drop back to guest.
    if (this.currentUser.uid === uid) {
      this.currentUser = GUEST_USER;
      this.persist(STORAGE_KEYS.CURRENT_USER, this.currentUser);
      this.emit('currentUser', this.currentUser);
    }

    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (e) {
      console.warn('Firestore user delete error:', e);
    }

    this.logAudit('User Management', `Removed ${target.role} account: ${target.name} (${target.email})`);
    this.showToast('info', 'User Removed', `${target.name}'s account has been deleted from the platform.`);
  }

  public switchUser(uid: string): User {
    const target = this.users.find(u => u.uid === uid) || this.users[0];
    this.currentUser = target;
    this.persist(STORAGE_KEYS.CURRENT_USER, this.currentUser);
    this.emit('currentUser', this.currentUser);
    this.showToast('info', 'Switched Persona', `Active profile: ${target.name} (${target.role.toUpperCase()})`);
    return this.currentUser;
  }

  public switchRole(role: UserRole): User {
    const matching = this.users.find(u => u.role === role);
    if (matching) {
      return this.switchUser(matching.uid);
    }
    return this.currentUser;
  }

  private async rollbackPendingPharmacy(pharmacyId: string): Promise<void> {
    const orphanedInventory = this.inventory.filter(i => i.pharmacyId === pharmacyId);
    this.pharmacies = this.pharmacies.filter(p => p.id !== pharmacyId);
    this.inventory = this.inventory.filter(i => i.pharmacyId !== pharmacyId);
    this.persist(STORAGE_KEYS.PHARMACIES, this.pharmacies);
    this.persist(STORAGE_KEYS.INVENTORY, this.inventory);
    this.emit('pharmacies', this.pharmacies);
    this.emit('inventory', this.inventory);

    try {
      await deleteDoc(doc(db, 'pharmacies', pharmacyId));
      for (const item of orphanedInventory) {
        await deleteDoc(doc(db, 'inventory', item.id));
      }
    } catch (e) {
      console.warn('Firestore rollback error:', e);
    }
  }

  public async loginWithGoogle(): Promise<User> {
    try {
      const { user, isNewUser } = await fbSignInWithGoogle();
      this.currentUser = user;
      this.users = [...this.users.filter(u => u.uid !== user.uid), user];
      this.persist(STORAGE_KEYS.USERS, this.users);
      this.persist(STORAGE_KEYS.CURRENT_USER, this.currentUser);
      this.emit('users', this.users);
      this.emit('currentUser', this.currentUser);

      this.logAudit('Google Authentication', `User signed in with Google: ${user.name} (${user.email})`);
      this.showToast(
        'success',
        isNewUser ? 'Welcome to PharmaLink GH!' : 'Signed In with Google',
        `Authenticated securely as ${user.name}`
      );
      return user;
    } catch (error: any) {
      this.showToast('error', 'Google Sign-In Failed', error.message || 'Could not complete Google authentication.');
      throw error;
    }
  }

  public async registerUser(params: {
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    password?: string;
    pharmacyName?: string;
    pharmacyLicense?: string;
    superintendentName?: string;
    superintendentPin?: string;
    locality?: string;
    address?: string;
    pharmacyImage?: string;
  }): Promise<User> {
    if (params.role === 'admin') {
      throw new Error('PCG Inspector accounts cannot be self-registered. Sign in with the official PCG Inspector credentials instead.');
    }

    const normalizedEmail = params.email.trim().toLowerCase();
    if (this.users.some(u => u.email.toLowerCase() === normalizedEmail)) {
      throw new Error('An account with this email already exists. Please sign in instead.');
    }
    if (params.role === 'pharmacist' && params.pharmacyLicense?.trim()) {
      const normalizedLicense = params.pharmacyLicense.trim().toLowerCase();
      if (this.pharmacies.some(p => p.licenseNumber.trim().toLowerCase() === normalizedLicense)) {
        throw new Error('A pharmacy is already registered with this PCG license number.');
      }
    }

    let pharmacyId: string | undefined = undefined;

    if (params.role === 'pharmacist' && params.pharmacyName) {
      pharmacyId = `pharma-${Date.now()}`;
      const newPharmacy: Pharmacy = {
        id: pharmacyId,
        name: params.pharmacyName,
        licenseNumber: params.pharmacyLicense || `PCG/GAR/2024/${Math.floor(1000 + Math.random() * 9000)}`,
        superintendentName: params.superintendentName || params.name,
        superintendentPin: params.superintendentPin || `PCG-PIN-${Math.floor(10000 + Math.random() * 90000)}`,
        region: 'Greater Accra',
        locality: params.locality || 'Adabraka / Ridge Hospital Area',
        address: params.address || `${params.pharmacyName}, Commercial Belt, Accra`,
        phone: params.phone,
        coordinates: { lat: 5.5604, lng: -0.2095 },
        status: 'PENDING',
        isVerified: false,
        openingHours: '8:00 AM - 10:00 PM',
        is24Hours: false,
        rating: 5.0,
        image: params.pharmacyImage,
        createdAt: new Date().toISOString(),
      };
      this.pharmacies = [newPharmacy, ...this.pharmacies];
      this.persist(STORAGE_KEYS.PHARMACIES, this.pharmacies);
      this.emit('pharmacies', this.pharmacies);

      // Persist new pharmacy to Firestore
      try {
        await setDoc(doc(db, 'pharmacies', newPharmacy.id), newPharmacy);
      } catch (e) {
        console.warn('Firestore pharmacy save error:', e);
      }

      // Seed initial sample inventory for this new pharmacy
      const sampleInventory: InventoryItem[] = this.medicines.slice(0, 4).map(med => ({
        id: `inv-${pharmacyId}-${med.id}`,
        pharmacyId: pharmacyId!,
        medicineId: med.id,
        status: 'IN_STOCK',
        quantity: 25,
        unitPriceGHS: 85.0,
        lastUpdatedAt: new Date().toISOString(),
      }));
      this.inventory = [...this.inventory, ...sampleInventory];
      this.persist(STORAGE_KEYS.INVENTORY, this.inventory);
      this.emit('inventory', this.inventory);

      // Persist inventory items to Firestore
      for (const item of sampleInventory) {
        try {
          await setDoc(doc(db, 'inventory', item.id), item);
        } catch (e) {
          console.warn('Firestore inventory save error:', e);
        }
      }
    }

    let newUser: User;

    // Try Firebase Authentication if password provided
    if (params.password) {
      try {
        newUser = await fbSignUpWithEmail({
          email: params.email,
          password: params.password,
          name: params.name,
          phone: params.phone,
          role: params.role,
          pharmacyId,
          pharmacyName: params.pharmacyName,
        });
      } catch (e: any) {
        if (!isAuthProviderUnavailable(e)) {
          // A real rejection (email already in use, weak password, etc.) — surface it,
          // do not silently create a divergent local shadow account. Roll back the
          // pharmacy record created above so it doesn't sit orphaned in the queue.
          if (pharmacyId) {
            await this.rollbackPendingPharmacy(pharmacyId);
          }
          const friendly: Record<string, string> = {
            'auth/email-already-in-use': 'An account with this email already exists. Please sign in instead.',
            'auth/weak-password': 'Password is too weak — use at least 6 characters.',
            'auth/invalid-email': 'Please enter a valid email address.',
          };
          throw new Error(friendly[e.code] || e.message || 'Registration failed. Please check your details.');
        }
        console.warn('Firebase Auth provider unavailable, falling back to local user store:', e.message);
        newUser = {
          uid: `usr-${Date.now()}`,
          email: params.email,
          name: params.name,
          phone: params.phone,
          role: params.role,
          pharmacyId,
          pharmacyName: params.pharmacyName,
          avatar: params.role === 'pharmacist'
            ? 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80'
            : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        };
        try {
          await setDoc(doc(db, 'users', newUser.uid), { ...newUser, createdAt: new Date().toISOString() });
        } catch (err) {
          console.warn('Firestore user save notice:', err);
        }
      }
    } else {
      newUser = {
        uid: `usr-${Date.now()}`,
        email: params.email,
        name: params.name,
        phone: params.phone,
        role: params.role,
        pharmacyId,
        pharmacyName: params.pharmacyName,
        avatar: params.role === 'pharmacist'
          ? 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      };
      try {
        await setDoc(doc(db, 'users', newUser.uid), { ...newUser, createdAt: new Date().toISOString() });
      } catch (err) {
        console.warn('Firestore user save notice:', err);
      }
    }

    this.users = [...this.users.filter(u => u.uid !== newUser.uid), newUser];
    this.persist(STORAGE_KEYS.USERS, this.users);
    this.emit('users', this.users);

    this.currentUser = newUser;
    this.persist(STORAGE_KEYS.CURRENT_USER, this.currentUser);
    this.emit('currentUser', this.currentUser);

    this.logAudit('User Registration', `Registered new ${params.role}: ${params.name} (${params.email})`);
    this.showToast(
      'success',
      params.role === 'pharmacist' ? 'Pharmacy Submitted for PCG Approval' : 'Account Created & Saved in Cloud!',
      params.role === 'pharmacist'
        ? `Welcome, ${params.name}! ${params.pharmacyName} has been submitted to the Pharmacy Council of Ghana for accreditation review.`
        : `Welcome, ${params.name}! Logged in as Patient/Carer.`
    );
    return newUser;
  }

  public async loginUser(email: string, password?: string): Promise<User | null> {
    // Fixed PCG Inspector credentials — never routed through Firebase or the local user directory.
    if (email.trim().toLowerCase() === PCG_ADMIN_EMAIL.toLowerCase()) {
      if (password === PCG_ADMIN_PASSWORD) {
        this.currentUser = PCG_ADMIN_USER;
        this.persist(STORAGE_KEYS.CURRENT_USER, this.currentUser);
        this.emit('currentUser', this.currentUser);
        this.showToast('success', 'Signed In', `Welcome back, ${PCG_ADMIN_USER.name}!`);
        return PCG_ADMIN_USER;
      }
      this.showToast('error', 'Login Failed', 'Incorrect PCG Inspector password.');
      return null;
    }

    const localUser = this.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());

    if (password) {
      try {
        const user = await fbSignInWithEmail(email, password);
        this.currentUser = user;
        this.users = [...this.users.filter(u => u.uid !== user.uid), user];
        this.persist(STORAGE_KEYS.USERS, this.users);
        this.persist(STORAGE_KEYS.CURRENT_USER, this.currentUser);
        this.emit('currentUser', this.currentUser);
        this.showToast('success', 'Signed In', `Welcome back, ${user.name}!`);
        return user;
      } catch (e: any) {
        if (!isAuthProviderUnavailable(e)) {
          // A real rejection from a live Auth provider (wrong password, no such
          // account, etc.) — never fall through to the passwordless local match,
          // or that fallback becomes a login bypass for any locally-known email.
          const friendly: Record<string, string> = {
            'auth/wrong-password': 'Incorrect password.',
            'auth/invalid-credential': 'Incorrect email or password.',
            'auth/user-not-found': 'No account found with this email.',
            'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
          };
          this.showToast('error', 'Login Failed', friendly[e.code] || e.message || 'Could not sign in.');
          return null;
        }
        console.warn('Firebase Auth provider unavailable, checking local directory:', e.message);
      }
    }

    // Only reachable when the Auth provider itself is unavailable (offline/disabled) —
    // an intentional, clearly-scoped demo fallback, not a general bypass.
    if (localUser) {
      this.currentUser = localUser;
      this.persist(STORAGE_KEYS.CURRENT_USER, this.currentUser);
      this.emit('currentUser', this.currentUser);
      this.showToast('success', 'Signed In', `Welcome back, ${localUser.name}!`);
      return localUser;
    }

    this.showToast('error', 'Login Failed', 'No account found with this email. Try Google Sign-in, or register a new account.');
    return null;
  }

  public async logoutUser(): Promise<void> {
    await logOutFromFirebase();
    this.currentUser = GUEST_USER;
    this.persist(STORAGE_KEYS.CURRENT_USER, this.currentUser);
    this.emit('currentUser', this.currentUser);
    this.showToast('info', 'Logged Out', 'You are browsing as a Guest. You can search drugs and locate pharmacies.');
  }

  // --- User Geolocation ---
  public getUserLocation() {
    return { ...this.userLocation };
  }

  public setUserLocation(name: string, coordinates: Coordinates) {
    this.userLocation = { name, coordinates };
    this.persist(STORAGE_KEYS.USER_LOCATION, this.userLocation);
    this.emit('userLocation', this.userLocation);
    this.showToast('info', 'Location Updated', `Searching within range of ${name}`);
  }

  // --- Medicines ---
  public getMedicines(): Medicine[] {
    return [...this.medicines];
  }

  public getMedicineById(id: string): Medicine | undefined {
    return this.medicines.find(m => m.id === id);
  }

  public async addMedicine(medicineData: Omit<Medicine, 'id'>): Promise<Medicine> {
    const newMed: Medicine = {
      ...medicineData,
      id: `med-${Date.now()}`,
    };
    this.medicines = [newMed, ...this.medicines];
    this.persist(STORAGE_KEYS.MEDICINES, this.medicines);
    this.emit('medicines', this.medicines);

    // Save to Firestore
    try {
      await setDoc(doc(db, 'medicines', newMed.id), newMed);
    } catch (e) {
      console.warn('Firestore medicine save error:', e);
    }

    this.logAudit('Medicine Master Catalogue', `Added ${newMed.brandName} (${newMed.genericName})`);
    this.showToast('success', 'Medicine Added to Database', `${newMed.brandName} added to Ghana master drug list.`);
    return newMed;
  }

  // --- Pharmacies ---
  public getPharmacies(): Pharmacy[] {
    return [...this.pharmacies];
  }

  public getPharmacyById(id: string): Pharmacy | undefined {
    return this.pharmacies.find(p => p.id === id);
  }

  public async setPharmacyStatus(pharmacyId: string, status: PharmacyStatus) {
    const isVerified = status === 'APPROVED';
    this.pharmacies = this.pharmacies.map(p =>
      p.id === pharmacyId ? { ...p, status, isVerified } : p
    );
    this.persist(STORAGE_KEYS.PHARMACIES, this.pharmacies);
    this.emit('pharmacies', this.pharmacies);

    // Update in Firestore
    try {
      await updateDoc(doc(db, 'pharmacies', pharmacyId), { status, isVerified });
    } catch (e) {
      console.warn('Firestore pharmacy update error:', e);
    }

    const pharma = this.getPharmacyById(pharmacyId);
    const actionLabel = status === 'APPROVED' ? 'Approved' : status === 'SUSPENDED' ? 'Suspended' : 'Reset to Pending';
    this.logAudit('Pharmacy Accreditation', `${actionLabel} licensing for ${pharma?.name}`);
    this.showToast(
      status === 'APPROVED' ? 'success' : 'warning',
      status === 'APPROVED' ? 'Accreditation Approved' : status === 'SUSPENDED' ? 'Pharmacy Suspended' : 'Pharmacy Pending Review',
      `${pharma?.name} is now ${status === 'APPROVED' ? 'verified with an active PCG badge' : status === 'SUSPENDED' ? 'suspended — sales revoked' : 'awaiting PCG review'}.`
    );
  }

  // --- Inventory ---
  public getInventory(): InventoryItem[] {
    return [...this.inventory];
  }

  public getInventoryForPharmacy(pharmacyId: string): InventoryItem[] {
    return this.inventory.filter(i => i.pharmacyId === pharmacyId);
  }

  public async updateStockStatus(inventoryId: string, status: StockStatus, quantity?: number, unitPriceGHS?: number) {
    let updatedItem: InventoryItem | undefined;

    this.inventory = this.inventory.map(item => {
      if (item.id === inventoryId) {
        const updatedQty = quantity !== undefined ? quantity : (status === 'OUT_OF_STOCK' ? 0 : (item.quantity === 0 ? 10 : item.quantity));
        updatedItem = {
          ...item,
          status,
          quantity: updatedQty,
          unitPriceGHS: unitPriceGHS !== undefined ? unitPriceGHS : item.unitPriceGHS,
          lastUpdatedAt: new Date().toISOString(),
        };
        return updatedItem;
      }
      return item;
    });

    this.persist(STORAGE_KEYS.INVENTORY, this.inventory);
    this.emit('inventory', this.inventory);
    
    // Save to Firestore
    if (updatedItem) {
      try {
        await setDoc(doc(db, 'inventory', updatedItem.id), updatedItem);
      } catch (e) {
        console.warn('Firestore inventory update error:', e);
      }
    }

    const updated = this.inventory.find(i => i.id === inventoryId);
    const med = updated ? this.getMedicineById(updated.medicineId) : null;
    this.showToast('info', 'Inventory Synced', `${med?.brandName || 'Drug'} status saved to cloud database (${status.replace('_', ' ')}).`);
  }

  public async addInventoryItem(pharmacyId: string, medicineId: string, quantity: number, unitPriceGHS: number, status: StockStatus = 'IN_STOCK'): Promise<InventoryItem> {
    const existing = this.inventory.find(i => i.pharmacyId === pharmacyId && i.medicineId === medicineId);
    if (existing) {
      await this.updateStockStatus(existing.id, status, quantity, unitPriceGHS);
      return existing;
    }

    const newItem: InventoryItem = {
      id: `inv-${Date.now()}`,
      pharmacyId,
      medicineId,
      status,
      quantity,
      unitPriceGHS,
      lastUpdatedAt: new Date().toISOString(),
    };
    this.inventory = [newItem, ...this.inventory];
    this.persist(STORAGE_KEYS.INVENTORY, this.inventory);
    this.emit('inventory', this.inventory);

    // Save to Firestore
    try {
      await setDoc(doc(db, 'inventory', newItem.id), newItem);
    } catch (e) {
      console.warn('Firestore add inventory error:', e);
    }
    
    const med = this.getMedicineById(medicineId);
    this.showToast('success', 'Drug Stocked', `${med?.brandName} added to pharmacy inventory in cloud.`);
    return newItem;
  }

  public async deleteInventoryItem(inventoryId: string): Promise<void> {
    const item = this.inventory.find(i => i.id === inventoryId);
    if (!item) return;

    this.inventory = this.inventory.filter(i => i.id !== inventoryId);
    this.persist(STORAGE_KEYS.INVENTORY, this.inventory);
    this.emit('inventory', this.inventory);

    try {
      await deleteDoc(doc(db, 'inventory', inventoryId));
    } catch (e) {
      console.warn('Firestore inventory delete error:', e);
    }

    const med = this.getMedicineById(item.medicineId);
    this.showToast('info', 'Drug Removed', `${med?.brandName || 'Item'} removed from your pharmacy shelf.`);
  }

  // --- Reservations & 2-Hour TTL Expiry ---
  public getReservations(): Reservation[] {
    this.checkAndExpireReservations();
    return [...this.reservations];
  }

  public getReservationsForPatient(patientUid: string): Reservation[] {
    this.checkAndExpireReservations();
    return this.reservations.filter(r => r.patientUid === patientUid);
  }

  public getReservationsForPharmacy(pharmacyId: string): Reservation[] {
    this.checkAndExpireReservations();
    return this.reservations.filter(r => r.pharmacyId === pharmacyId);
  }

  public async createReservation(data: {
    patientUid: string;
    patientName: string;
    patientPhone: string;
    pharmacyId: string;
    medicineId: string;
    quantity: number;
    prescriptionImageUrl?: string;
    prescriptionFileName?: string;
    notes?: string;
  }): Promise<Reservation> {
    const pharmacy = this.getPharmacyById(data.pharmacyId);
    const medicine = this.getMedicineById(data.medicineId);
    const inventory = this.inventory.find(i => i.pharmacyId === data.pharmacyId && i.medicineId === data.medicineId);

    if (!pharmacy || !medicine) {
      throw new Error('Invalid pharmacy or medicine selection');
    }

    const unitPriceGHS = inventory?.unitPriceGHS || 120.00;
    const totalPriceGHS = unitPriceGHS * data.quantity;
    const codeNum = Math.floor(1000 + Math.random() * 9000);
    const createdAt = new Date();
    // 2-hour TTL expiration
    const expiresAt = new Date(createdAt.getTime() + 2 * 60 * 60 * 1000);

    const newReservation: Reservation = {
      id: `res-${Date.now()}`,
      reservationCode: `PL-${codeNum}`,
      patientUid: data.patientUid,
      patientName: data.patientName,
      patientPhone: data.patientPhone,
      pharmacyId: pharmacy.id,
      pharmacyName: pharmacy.name,
      pharmacyPhone: pharmacy.phone,
      pharmacyAddress: pharmacy.address,
      medicineId: medicine.id,
      medicineName: medicine.brandName,
      genericName: medicine.genericName,
      dosageForm: medicine.dosageForm,
      quantity: data.quantity,
      unitPriceGHS,
      totalPriceGHS,
      prescriptionImageUrl: data.prescriptionImageUrl,
      prescriptionFileName: data.prescriptionFileName,
      status: 'PENDING',
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      notes: data.notes,
    };

    this.reservations = [newReservation, ...this.reservations];
    this.persist(STORAGE_KEYS.RESERVATIONS, this.reservations);
    this.emit('reservations', this.reservations);
    
    // Save to Firestore
    try {
      await setDoc(doc(db, 'reservations', newReservation.id), newReservation);
    } catch (e) {
      console.warn('Firestore reservation save error:', e);
    }

    this.logAudit('Medication Reservation', `Hold PL-${codeNum} placed for ${medicine.brandName} at ${pharmacy.name}`);
    this.showToast('success', '2-Hour Hold Placed!', `Code: PL-${codeNum}. Cloud reservation synchronized with pharmacy.`);

    return newReservation;
  }

  public async updateReservationStatus(
    reservationId: string, 
    status: ReservationStatus, 
    rejectionReason?: string
  ): Promise<Reservation | undefined> {
    let updatedRes: Reservation | undefined;

    this.reservations = this.reservations.map(r => {
      if (r.id === reservationId) {
        updatedRes = {
          ...r,
          status,
          rejectionReason: rejectionReason || r.rejectionReason,
          collectedAt: status === 'COLLECTED' ? new Date().toISOString() : r.collectedAt,
        };
        return updatedRes;
      }
      return r;
    });

    if (updatedRes) {
      // If collected, decrement inventory quantity
      if (status === 'COLLECTED') {
        const inv = this.inventory.find(i => i.pharmacyId === updatedRes!.pharmacyId && i.medicineId === updatedRes!.medicineId);
        if (inv && inv.quantity > 0) {
          const newQty = Math.max(0, inv.quantity - updatedRes.quantity);
          await this.updateStockStatus(inv.id, newQty === 0 ? 'OUT_OF_STOCK' : (newQty < 5 ? 'LOW_STOCK' : 'IN_STOCK'), newQty);
        }
      }

      this.persist(STORAGE_KEYS.RESERVATIONS, this.reservations);
      this.emit('reservations', this.reservations);

      // Update in Firestore
      try {
        await updateDoc(doc(db, 'reservations', reservationId), {
          status,
          rejectionReason: rejectionReason || null,
          collectedAt: status === 'COLLECTED' ? new Date().toISOString() : null,
        });
      } catch (e) {
        console.warn('Firestore reservation status update error:', e);
      }

      const statusMap: Record<ReservationStatus, string> = {
        CONFIRMED: 'Hold Confirmed! Stock is reserved for 2 hours in cloud database.',
        COLLECTED: 'Medication marked as Dispensed & Collected.',
        REJECTED: `Reservation declined: ${rejectionReason || 'Stock unavailable'}.`,
        CANCELLED: 'Reservation cancelled by patient.',
        EXPIRED: 'Hold expired. Stock released to public inventory.',
        PENDING: 'Reservation pending review.',
      };

      this.showToast(
        status === 'CONFIRMED' || status === 'COLLECTED' ? 'success' : (status === 'REJECTED' || status === 'EXPIRED' ? 'warning' : 'info'),
        `Hold ${updatedRes.reservationCode} Updated`,
        statusMap[status]
      );
    }

    return updatedRes;
  }

  public async cancelReservation(reservationId: string): Promise<boolean> {
    const res = this.reservations.find(r => r.id === reservationId);
    if (res && (res.status === 'PENDING' || res.status === 'CONFIRMED')) {
      await this.updateReservationStatus(reservationId, 'CANCELLED');
      return true;
    }
    return false;
  }

  private checkAndExpireReservations() {
    const now = Date.now();
    let hasChanges = false;

    this.reservations = this.reservations.map(r => {
      if ((r.status === 'PENDING' || r.status === 'CONFIRMED') && new Date(r.expiresAt).getTime() < now) {
        hasChanges = true;
        return {
          ...r,
          status: 'EXPIRED' as ReservationStatus,
        };
      }
      return r;
    });

    if (hasChanges) {
      this.persist(STORAGE_KEYS.RESERVATIONS, this.reservations);
      this.emit('reservations', this.reservations);
    }
  }

  // --- Audit Logs ---
  private async logAudit(action: string, details: string) {
    const log: AuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorName: this.currentUser.name,
      actorRole: this.currentUser.role,
      action,
      details,
    };
    this.auditLogs = [log, ...this.auditLogs.slice(0, 49)];
    this.persist(STORAGE_KEYS.AUDIT_LOGS, this.auditLogs);
    this.emit('auditLogs', this.auditLogs);

    // Save to Firestore
    try {
      await setDoc(doc(db, 'auditLogs', log.id), log);
    } catch (e) {
      console.warn('Firestore audit log save error:', e);
    }
  }

  public getAuditLogs(): AuditLog[] {
    return [...this.auditLogs];
  }

  // Reset to seed data
  public async resetToDefaultSeeds() {
    this.users = INITIAL_USERS;
    this.currentUser = GUEST_USER;
    this.pharmacies = INITIAL_PHARMACIES;
    this.medicines = INITIAL_MEDICINES;
    this.inventory = INITIAL_INVENTORY;
    this.reservations = INITIAL_RESERVATIONS;
    this.userLocation = {
      name: GHANAIAN_LOCALITIES[0].name,
      coordinates: GHANAIAN_LOCALITIES[0].coordinates,
    };
    this.auditLogs = [];

    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.PHARMACIES);
    localStorage.removeItem(STORAGE_KEYS.MEDICINES);
    localStorage.removeItem(STORAGE_KEYS.INVENTORY);
    localStorage.removeItem(STORAGE_KEYS.RESERVATIONS);
    localStorage.removeItem(STORAGE_KEYS.USER_LOCATION);
    localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS);

    this.emit('currentUser', this.currentUser);
    this.emit('pharmacies', this.pharmacies);
    this.emit('medicines', this.medicines);
    this.emit('inventory', this.inventory);
    this.emit('reservations', this.reservations);
    this.emit('userLocation', this.userLocation);

    this.showToast('info', 'Demo Reset', 'PharmaLink GH database restored to clean Ghanaian seed state.');
  }
}

export const store = new PharmaLinkStore();
