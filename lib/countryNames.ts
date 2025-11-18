import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';

// Initialize English locale for country names
countries.registerLocale(enLocale);

/**
 * Get country name from country code (client-safe)
 * @param countryCode Two-letter country code (e.g., 'US', 'FR')
 * @returns Full country name (e.g., 'United States', 'France') or the code if not found
 */
export function getCountryName(countryCode: string | null | undefined): string | null {
  if (!countryCode) return null;
  try {
    const name = countries.getName(countryCode, 'en');
    return name || countryCode;
  } catch (error) {
    return countryCode;
  }
}

