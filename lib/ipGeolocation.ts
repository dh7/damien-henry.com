import geoip from 'geoip-lite';
import { getCountryName as getCountryNameHelper } from './countryNames';

/**
 * Get country code from IP address
 * @param ip IP address (can be comma-separated list from x-forwarded-for header)
 * @returns Country code (e.g., 'US', 'FR') or null if not found
 */
export function getCountryFromIP(ip: string | string[] | undefined): string | null {
  if (!ip) return null;
  
  // Handle x-forwarded-for header which can be comma-separated
  const ipAddress = Array.isArray(ip) ? ip[0] : ip.split(',')[0].trim();
  
  // Skip localhost and private IPs
  if (ipAddress === '::1' || ipAddress === '127.0.0.1' || ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.') || ipAddress.startsWith('172.')) {
    return null;
  }
  
  try {
    const geo = geoip.lookup(ipAddress);
    return geo?.country || null;
  } catch (error: any) {
    // Handle missing data files gracefully (common in serverless environments)
    if (error.code === 'ENOENT' || error.message?.includes('geoip-country.dat')) {
      console.warn('GeoIP data files not found, skipping country lookup');
      return null;
    }
    console.error('Error looking up IP geolocation:', error);
    return null;
  }
}

/**
 * Get country name from country code (re-exported from countryNames for convenience)
 */
export { getCountryNameHelper as getCountryName };

