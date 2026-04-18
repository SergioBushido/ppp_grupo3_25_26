import * as Location from 'expo-location';

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('La obtencion de ubicacion ha tardado demasiado.')), timeoutMs);
    }),
  ]);
}

export async function requestForegroundLocationPermission() {
  return Location.requestForegroundPermissionsAsync();
}

export async function getCurrentAttendanceLocation({ timeoutMs = 12000 } = {}) {
  const permission = await requestForegroundLocationPermission();
  if (!permission.granted) {
    const error = new Error('No se ha concedido permiso de ubicacion.');
    error.code = 'LOCATION_PERMISSION_DENIED';
    throw error;
  }

  const position = await withTimeout(
    Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      mayShowUserSettingsDialog: true,
    }),
    timeoutMs
  );

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy_meters: position.coords.accuracy,
  };
}

export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const earthRadius = 6371000;
  const toRadians = (value) => (value * Math.PI) / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(toRadians(lat1))
    * Math.cos(toRadians(lat2))
    * Math.sin(dLon / 2)
    * Math.sin(dLon / 2);

  return earthRadius * 2 * Math.asin(Math.sqrt(a));
}
