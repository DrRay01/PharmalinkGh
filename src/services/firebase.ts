import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  where,
  writeBatch
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-config.json';
import { 
  User, 
  Pharmacy, 
  Medicine, 
  InventoryItem, 
  Reservation, 
  AuditLog, 
  UserRole 
} from '../types';
import { 
  INITIAL_USERS, 
  INITIAL_PHARMACIES, 
  INITIAL_MEDICINES, 
  INITIAL_INVENTORY, 
  INITIAL_RESERVATIONS 
} from '../data/seedData';

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore with custom database ID from config if present.
// ignoreUndefinedProperties is essential here: every optional field on our domain
// types (Pharmacy.image, Pharmacy.emergencyPhone, Reservation.notes, etc.) ends up
// `undefined` rather than omitted when unset, and Firestore's setDoc() otherwise
// throws a hard client-side error for any `undefined` field value — which silently
// aborted the write (caught and only console.warn'd by call sites) before this fix.
export const db = (() => {
  const settings = { ignoreUndefinedProperties: true };
  try {
    return firebaseConfig.firestoreDatabaseId
      ? initializeFirestore(app, settings, firebaseConfig.firestoreDatabaseId)
      : initializeFirestore(app, settings);
  } catch {
    // Already initialized (e.g. a dev-server HMR re-run of this module) — reuse it.
    return firebaseConfig.firestoreDatabaseId
      ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
      : getFirestore(app);
  }
})();

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

/**
 * Sign In with Google
 */
export async function signInWithGoogle(): Promise<{ user: User; isNewUser: boolean }> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const fbUser = result.user;

    // Check if user already has a document in Firestore
    const userDocRef = doc(db, 'users', fbUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const existingUser = userDoc.data() as User;
      return { user: existingUser, isNewUser: false };
    } else {
      // Create new patient user record
      const newUser: User = {
        uid: fbUser.uid,
        email: fbUser.email || '',
        name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
        phone: fbUser.phoneNumber || '',
        role: 'patient',
        avatar: fbUser.photoURL || undefined,
      };
      await setDoc(userDocRef, {
        ...newUser,
        createdAt: new Date().toISOString(),
      });
      return { user: newUser, isNewUser: true };
    }
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

/**
 * Sign In with Email & Password
 */
export async function signInWithEmail(email: string, password: string): Promise<User> {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const fbUser = credential.user;

    // Fetch user profile from Firestore
    const userDocRef = doc(db, 'users', fbUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      return userDoc.data() as User;
    } else {
      // Fallback
      const newUser: User = {
        uid: fbUser.uid,
        email: fbUser.email || email,
        name: fbUser.displayName || email.split('@')[0],
        phone: '',
        role: 'patient',
      };
      await setDoc(userDocRef, { ...newUser, createdAt: new Date().toISOString() });
      return newUser;
    }
  } catch (error: any) {
    console.error('Email Sign-In Error:', error);
    throw error;
  }
}

/**
 * Register / Sign Up with Email & Password
 */
export async function signUpWithEmail(params: {
  email: string;
  password: string;
  name: string;
  phone: string;
  role: UserRole;
  pharmacyId?: string;
  pharmacyName?: string;
}): Promise<User> {
  try {
    const credential = await createUserWithEmailAndPassword(auth, params.email, params.password);
    const fbUser = credential.user;

    const newUser: User = {
      uid: fbUser.uid,
      email: params.email,
      name: params.name,
      phone: params.phone,
      role: params.role,
      pharmacyId: params.pharmacyId,
      pharmacyName: params.pharmacyName,
      avatar: params.role === 'pharmacist' 
        ? 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80'
        : params.role === 'admin'
        ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    };

    await setDoc(doc(db, 'users', fbUser.uid), {
      ...newUser,
      createdAt: new Date().toISOString(),
    });

    return newUser;
  } catch (error: any) {
    console.error('Email Sign-Up Error:', error);
    throw error;
  }
}

/**
 * Sign Out
 */
export async function logOutFromFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Firebase Sign-Out Error:', error);
  }
}

/**
 * Seed initial Firestore collections if they are empty
 */
export async function seedFirestoreIfEmpty(): Promise<void> {
  try {
    // Check if medicines collection has any data
    const medsSnap = await getDocs(collection(db, 'medicines'));
    if (medsSnap.empty) {
      console.log('Seeding initial medicines to Firestore...');
      const batch = writeBatch(db);
      
      INITIAL_MEDICINES.forEach(med => {
        const medRef = doc(db, 'medicines', med.id);
        batch.set(medRef, med);
      });

      INITIAL_PHARMACIES.forEach(pharma => {
        const pharmaRef = doc(db, 'pharmacies', pharma.id);
        batch.set(pharmaRef, pharma);
      });

      INITIAL_INVENTORY.forEach(inv => {
        const invRef = doc(db, 'inventory', inv.id);
        batch.set(invRef, inv);
      });

      INITIAL_RESERVATIONS.forEach(res => {
        const resRef = doc(db, 'reservations', res.id);
        batch.set(resRef, res);
      });

      INITIAL_USERS.forEach(u => {
        const userRef = doc(db, 'users', u.uid);
        batch.set(userRef, {
          ...u,
          createdAt: new Date().toISOString(),
        });
      });

      await batch.commit();
      console.log('Firestore seed data successfully initialized.');
    }
  } catch (error) {
    console.warn('Firestore initial check/seed error (continuing with local data):', error);
  }
}
