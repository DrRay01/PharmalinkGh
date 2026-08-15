import { Coordinates } from '../types';

/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula.
 * @returns distance in kilometers (km)
 */
export function calculateHaversineDistance(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(coord2.lat - coord1.lat);
  const dLon = toRad(coord2.lng - coord1.lng);
  
  const lat1 = toRad(coord1.lat);
  const lat2 = toRad(coord2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Formats a number as Ghana Cedis (GH₵)
 */
export function formatGHS(amount: number): string {
  return `GH₵ ${amount.toFixed(2)}`;
}

/**
 * Format remaining time in MM:SS or HH:MM:SS format
 */
export function formatRemainingTime(expiresAtIso: string): {
  isExpired: boolean;
  formatted: string;
  minutesLeft: number;
  urgencyLevel: 'normal' | 'warning' | 'critical' | 'expired';
} {
  const now = Date.now();
  const expiry = new Date(expiresAtIso).getTime();
  const diffMs = expiry - now;

  if (diffMs <= 0) {
    return {
      isExpired: true,
      formatted: 'Expired',
      minutesLeft: 0,
      urgencyLevel: 'expired',
    };
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  let formatted = '';
  if (hours > 0) {
    formatted = `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  } else {
    formatted = `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  }

  let urgencyLevel: 'normal' | 'warning' | 'critical' | 'expired' = 'normal';
  if (totalMinutes < 15) {
    urgencyLevel = 'critical';
  } else if (totalMinutes < 45) {
    urgencyLevel = 'warning';
  }

  return {
    isExpired: false,
    formatted,
    minutesLeft: totalMinutes,
    urgencyLevel,
  };
}

/**
 * Builds a WhatsApp click-to-chat deep link (wa.me) for a Ghana phone number.
 * Strips formatting so numbers like "+233 20 812 3456" resolve correctly.
 */
export function whatsappLink(phone: string, message?: string): string {
  const digits = phone.replace(/\D/g, '');
  const query = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${digits}${query}`;
}

/**
 * Human-readable relative time (e.g. "12 mins ago", "Just now")
 */
export function formatTimeAgo(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 45) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}
