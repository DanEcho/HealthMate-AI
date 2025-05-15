
'use client';

import { useState, useEffect } from 'react';
import { DynamicMapComponent, type MapMarker } from '@/components/common/MapComponent';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { getUserLocation, type UserLocation, DEFAULT_MELBOURNE_LOCATION } from '@/lib/geolocation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, InfoIcon } from 'lucide-react';

export default function HospitalsPage() {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDefaultLocationUsed, setIsDefaultLocationUsed] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchLocationAndHospitals() {
      setIsLoading(true);
      setError(null);
      setIsDefaultLocationUsed(false);
      try {
        const location = await getUserLocation();
        setUserLocation(location);
      } catch (e) {
        const errorMessage = (e as Error).message || 'Failed to fetch location.';
        setError(errorMessage); 
        setUserLocation(DEFAULT_MELBOURNE_LOCATION);
        setIsDefaultLocationUsed(true);
        toast({
          title: 'Location Error',
          description: `${errorMessage} Showing results for a default location in Melbourne.`,
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchLocationAndHospitals();
  }, [toast]);

  const MOCK_HOSPITALS: MapMarker[] = userLocation ? [
    { 
      id: 'hosp1', 
      position: { lat: userLocation.lat + 0.02, lng: userLocation.lng - 0.01 }, 
      title: 'City General Hospital', 
      type: 'hospital',
      description: 'Major public hospital with 24/7 emergency department.',
      distance: '3.5 km',
      website: 'https://example.com/citygeneral',
      phone: '(03) 9000 1000'
    },
    { 
      id: 'hosp2', 
      position: { lat: userLocation.lat - 0.015, lng: userLocation.lng + 0.015 }, 
      title: 'Community Medical Center', 
      type: 'hospital',
      description: 'Private hospital offering a range of surgical and medical services.',
      distance: '4.2 km',
      website: 'https://example.com/communitymedical',
      phone: '(03) 9000 2000'
    },
    { 
      id: 'hosp3', 
      position: { lat: userLocation.lat - 0.005, lng: userLocation.lng - 0.02 }, 
      title: 'St. Luke\'s Emergency Care', 
      type: 'hospital',
      description: 'Specialized emergency and trauma center.',
      distance: '2.1 km',
      website: 'https://example.com/stlukes',
      phone: '(03) 9000 3000'
    },
  ] : [];

  return (
    <div className="w-full">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-primary">Nearby Hospitals</CardTitle>
          <CardDescription>Find hospitals near your current location. Map popups show more details.</CardDescription>
           {isDefaultLocationUsed && (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground bg-secondary p-3 rounded-md">
              <InfoIcon className="h-5 w-5 text-primary" />
              <span>Using a default location in Melbourne as your precise location could not be determined.</span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-64">
              <LoadingSpinner size={48} />
              <p className="mt-4 text-muted-foreground">Fetching your location and nearby hospitals...</p>
            </div>
          )}
          {error && !isLoading && !isDefaultLocationUsed && ( 
            <div className="flex flex-col items-center justify-center h-64 bg-destructive/10 p-6 rounded-md">
              <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
              <p className="text-destructive font-semibold text-lg">Could not load hospital data.</p>
              <p className="text-destructive/80">{error}</p>
              <p className="mt-4 text-sm text-muted-foreground">Please ensure location services are enabled in your browser and try again.</p>
            </div>
          )}
          {!isLoading && userLocation && (
            <DynamicMapComponent
              center={userLocation}
              zoom={13}
              markers={MOCK_HOSPITALS}
              className="h-[600px] w-full rounded-lg overflow-hidden shadow-md border"
            />
          )}
           {!isLoading && !userLocation && ( 
             <div className="flex flex-col items-center justify-center h-64">
                <p className="text-muted-foreground">Your location is not available. Cannot display hospitals.</p>
             </div>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
