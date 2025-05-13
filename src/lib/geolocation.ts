export type UserLocation = {
  lat: number;
  lng: number;
};

export const DEFAULT_MELBOURNE_LOCATION: UserLocation = {
  lat: -37.8136, // Melbourne CBD Latitude
  lng: 144.9631, // Melbourne CBD Longitude
};

export function getUserLocation(): Promise<UserLocation> {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && !navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        reject(new Error(`Geolocation error: ${error.message}`));
      }
    );
  });
}
