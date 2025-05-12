'use client';

import { useState, useEffect } from 'react';
// Import the dynamically loaded map component
import { DynamicMapComponent, type MapMarker } from '@/components/common/MapComponent';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { getUserLocation, type UserLocation } from '@/lib/geolocation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function HospitalsPage() {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchLocationAndHospitals() {
      setIsLoading(true);
      setError(null);
      try {
        const location = await getUserLocation();
        setUserLocation(location);
      } catch (e) {
        const errorMessage = (e as Error).message || 'Failed to fetch location.';
        setError(errorMessage);
        toast({
          title: 'Location Error',
          description: errorMessage,
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchLocationAndHospitals();
  }, [toast]);

  // Placeholder: In a real app, these would come from an API
  const MOCK_HOSPITALS: MapMarker[] = userLocation ? [
    { id: 'hosp1', position: { lat: userLocation.lat + 0.02, lng: userLocation.lng - 0.01 }, title: 'City General Hospital', type: 'hospital' },
    { id: 'hosp2', position: { lat: userLocation.lat - 0.015, lng: userLocation.lng + 0.015 }, title: 'Community Medical Center', type: 'hospital' },
    { id: 'hosp3', position: { lat: userLocation.lat - 0.005, lng: userLocation.lng - 0.02 }, title: 'St. Luke\'s Emergency Care', type: 'hospital' },
  ] : [];

  return (
    <div className="w-full">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-primary">Nearby Hospitals</CardTitle>
          <CardDescription>Find hospitals near your current location.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-64">
              <LoadingSpinner size={48} />
              <p className="mt-4 text-muted-foreground">Fetching your location and nearby hospitals...</p>
            </div>
          )}
          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center h-64 bg-destructive/10 p-6 rounded-md">
              <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
              <p className="text-destructive font-semibold text-lg">Could not load hospital data.</p>
              <p className="text-destructive/80">{error}</p>
              <p className="mt-4 text-sm text-muted-foreground">Please ensure location services are enabled in your browser and try again.</p>
            </div>
          )}
          {!isLoading && !error && userLocation && (
            // Use the DynamicMapComponent here, ensuring userLocation is valid
            <DynamicMapComponent
              center={userLocation} // Pass the valid userLocation
              zoom={13}
              markers={MOCK_HOSPITALS}
              className="h-[600px] w-full rounded-lg overflow-hidden shadow-md border"
            />
          )}
           {!isLoading && !error && !userLocation && (
             <div className="flex flex-col items-center justify-center h-64">
                <p className="text-muted-foreground">Your location is not available. Cannot display hospitals.</p>
             </div>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
