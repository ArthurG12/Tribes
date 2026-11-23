interface EventMapLocation {
  location: string;
  lat?: number | null;
  lon?: number | null;
}

export function googleMapsSearchUrl({ location, lat, lon }: EventMapLocation) {
  const hasCoordinates = typeof lat === "number" && Number.isFinite(lat) && lat >= -90 && lat <= 90 &&
    typeof lon === "number" && Number.isFinite(lon) && lon >= -180 && lon <= 180;
  const query = hasCoordinates ? `${lat},${lon}` : location.trim();

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
