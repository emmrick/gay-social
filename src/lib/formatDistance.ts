/**
 * Format a distance in kilometers for display.
 * - < 1 km → "850 m"
 * - < 10 km → "1,2 km" (FR comma)
 * - >= 10 km → "12 km"
 * - null/undefined/NaN/0 → null (caller decides fallback)
 */
export const formatDistance = (km: number | null | undefined): string | null => {
  if (km === null || km === undefined) return null;
  if (typeof km !== 'number' || Number.isNaN(km)) return null;
  if (km <= 0) return null;

  if (km < 1) {
    const meters = Math.round(km * 1000);
    return `${meters} m`;
  }

  if (km < 10) {
    // 1 decimal, comma as decimal separator (FR)
    return `${km.toFixed(1).replace('.', ',')} km`;
  }

  return `${Math.round(km)} km`;
};

/**
 * Same as formatDistance, but always returns a string (with fallback label).
 */
export const formatDistanceWithFallback = (
  km: number | null | undefined,
  fallback = 'Distance inconnue'
): string => formatDistance(km) ?? fallback;
