import { supabase } from './supabase';

export interface DetectedPostcode {
  postalCode: string;
  city: string;
  country: string;
  countryCode: string;
}

const getBrowserPosition = (): Promise<{ latitude: number; longitude: number }> =>
  new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Location is not supported in this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      (error) => reject(new Error(
        error.code === error.PERMISSION_DENIED
          ? 'Location permission denied. Allow location access or enter your postcode manually.'
          : 'Unable to detect your location. Please enter your postcode manually.',
      )),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 },
    );
  });

/** Asks the buyer's browser for permission, then resolves the postcode through the detect-postcode edge function. */
export async function detectPostcodeFromCurrentLocation(): Promise<DetectedPostcode> {
  const { latitude, longitude } = await getBrowserPosition();
  const { data, error } = await supabase.functions.invoke('detect-postcode', {
    body: { latitude, longitude },
  });

  const resolved = data?.data;
  if (error || !resolved?.country) {
    throw new Error('Could not look up your postcode. Please enter it manually.');
  }

  return {
    postalCode: String(resolved.postalCode || '').trim(),
    city: String(resolved.city || '').trim(),
    country: String(resolved.country || '').trim(),
    countryCode: String(resolved.countryCode || '').trim().toUpperCase(),
  };
}
