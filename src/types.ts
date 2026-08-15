export type UserRole = 'patient' | 'pharmacist' | 'admin';

export interface User {
  uid: string;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  pharmacyId?: string;
  pharmacyName?: string;
  avatar?: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export type PharmacyStatus = 'PENDING' | 'APPROVED' | 'SUSPENDED';

export interface Pharmacy {
  id: string;
  name: string;
  licenseNumber: string; // e.g. PCG/GAR/2024/0412
  superintendentName: string;
  superintendentPin: string;
  region: string;
  locality: string;
  address: string;
  phone: string;
  emergencyPhone?: string;
  coordinates: Coordinates;
  status: PharmacyStatus;
  isVerified: boolean;
  openingHours: string;
  is24Hours: boolean;
  rating: number;
  image?: string;
  createdAt: string;
}

// Free-form string so pharmacists can create new categories when registering a drug.
// KNOWN_THERAPEUTIC_CATEGORIES (seedData.ts) lists the built-in defaults offered as suggestions.
export type TherapeuticCategory = string;

export interface Medicine {
  id: string;
  brandName: string;
  genericName: string;
  category: TherapeuticCategory;
  therapeuticClass: string;
  dosageForm: string; // e.g., '625mg Film-coated Tablets', '100mcg Inhaler', '100IU/ml Vial'
  strength: string;
  description: string;
  prescriptionRequired: boolean;
  ghanaFdaRegNo: string;
  isEmergencyCritical: boolean;
  commonIndications: string[];
  image?: string;
}

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export interface InventoryItem {
  id: string;
  pharmacyId: string;
  medicineId: string;
  status: StockStatus;
  quantity: number;
  unitPriceGHS: number;
  lastUpdatedAt: string;
  batchNumber?: string;
  expiryDate?: string;
}

export type ReservationStatus = 
  | 'PENDING' 
  | 'CONFIRMED' 
  | 'COLLECTED' 
  | 'REJECTED' 
  | 'EXPIRED' 
  | 'CANCELLED';

export interface Reservation {
  id: string;
  reservationCode: string; // e.g. PH-2981
  patientUid: string;
  patientName: string;
  patientPhone: string;
  pharmacyId: string;
  pharmacyName: string;
  pharmacyPhone: string;
  pharmacyAddress: string;
  medicineId: string;
  medicineName: string;
  genericName: string;
  dosageForm: string;
  quantity: number;
  unitPriceGHS: number;
  totalPriceGHS: number;
  prescriptionImageUrl?: string;
  prescriptionFileName?: string;
  status: ReservationStatus;
  createdAt: string;
  expiresAt: string;
  rejectionReason?: string;
  collectedAt?: string;
  notes?: string;
}

export interface LocalityPreset {
  name: string;
  region: string;
  coordinates: Coordinates;
  isMajorHub?: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  details: string;
}
