import { UserProfile } from '../types';

export const USA_ONLY_ACCOUNT_UIDS = new Set<string>([
  'DymxtSU8YvealNGNXP4ASDLVw9D3'
]);

export const USA_ONLY_ACCOUNT_EMAILS = new Set<string>([
  'yates_3@msn.com'
]);

export class GeoAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeoAccessError';
  }
}

export function isUsaOnlyRestrictedAccount(
  profile?: Partial<UserProfile> | null,
  fallbackEmail?: string
): boolean {
  if (profile?.usaOnlyLogin === true) return true;
  if (profile?.usaOnlyLogin === false) return false;

  if (profile?.uid && USA_ONLY_ACCOUNT_UIDS.has(profile.uid.trim())) {
    return true;
  }

  const email = (profile?.email || fallbackEmail || '').toLowerCase().trim();
  if (email && USA_ONLY_ACCOUNT_EMAILS.has(email)) {
    return true;
  }

  return false;
}

export interface UsaGeoVerificationResult {
  allowed: boolean;
  countryCode?: string;
  countryName?: string;
  reason?: string;
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 4000): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Verifies whether the current device/phone attempting to sign in is physically
 * located in the United States (ISO country code "US") using redundant HTTPS
 * IP geolocation providers.
 */
export async function verifyUserInUSA(): Promise<UsaGeoVerificationResult> {
  let detectedCode = '';
  let detectedName = '';

  // 1. Primary: api.country.is
  const countryIs = await fetchJsonWithTimeout('https://api.country.is/');
  if (countryIs && typeof countryIs.country === 'string' && countryIs.country.trim().length === 2) {
    detectedCode = countryIs.country.trim().toUpperCase();
  }

  // 2. Fallback: GeoJS
  if (!detectedCode) {
    const geoJs = await fetchJsonWithTimeout('https://get.geojs.io/v1/ip/country.json');
    if (geoJs && typeof geoJs.country === 'string' && geoJs.country.trim().length === 2) {
      detectedCode = geoJs.country.trim().toUpperCase();
      if (typeof geoJs.name === 'string') {
        detectedName = geoJs.name.trim();
      }
    }
  }

  // 3. Fallback: ipwho.is
  if (!detectedCode) {
    const ipWho = await fetchJsonWithTimeout('https://ipwho.is/');
    if (ipWho && ipWho.success !== false && typeof ipWho.country_code === 'string' && ipWho.country_code.trim().length === 2) {
      detectedCode = ipWho.country_code.trim().toUpperCase();
      if (typeof ipWho.country === 'string') {
        detectedName = ipWho.country.trim();
      }
    }
  }

  if (!detectedCode) {
    return {
      allowed: false,
      reason: 'Invalid email or password. Please verify your credentials.'
    };
  }

  if (detectedCode === 'US') {
    return {
      allowed: true,
      countryCode: 'US',
      countryName: detectedName || 'United States'
    };
  }

  return {
    allowed: false,
    countryCode: detectedCode,
    countryName: detectedName || detectedCode,
    reason: 'Invalid email or password. Please verify your credentials.'
  };
}
