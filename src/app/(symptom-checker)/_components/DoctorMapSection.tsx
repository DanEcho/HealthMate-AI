'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DynamicMapComponent, type MapMarker } from '@/components/common/MapComponent';
import type { UserLocation } from '@/lib/geolocation';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, InfoIcon } from 'lucide-react';

interface DoctorMapSectionProps {
  userLocation: UserLocation | null;
  onLocateDoctors: () => void;
  isLocatingDoctors: boolean;
  symptoms?: string;
  isDefaultLocationUsed: boolean;
}

export function DoctorMapSection({
  userLocation,
  onLocateDoctors,
  isLocatingDoctors,
  symptoms,
  isDefaultLocationUsed,
}: DoctorMapSectionProps) {
  const [showMap, setShowMap] = useState(false);

  const MOCK_DOCTORS: MapMarker[] = userLocation ? [
    { id: 'doc1', position: { lat: userLocation.lat + 0.01, lng: userLocation.lng + 0.01 }, title: 'General Clinic North', type: 'doctor' },
    { id: 'doc2', position: { lat: userLocation.lat - 0.005, lng: userLocation.lng - 0.015 }, title: 'City Health Center', type: 'doctor' },
    { id: 'doc3', position: { lat: userLocation.lat + 0.002, lng: userLocation.lng - 0.008 }, title: 'Wellness Practice South', type: 'doctor' },
  ] : [];

  const handleShowMap = () => {
    onLocateDoctors(); 
    setShowMap(true);
  };

  return (
    <Card className="mt-6 shadow-lg">
      <CardHeader>
         <div className="flex items-center gap-3">
          <MapPin className="h-6 w-6 text-accent" />
          <CardTitle className="text-2xl font-semibold">Find Nearby Doctors</CardTitle>
        </div>
        {isDefaultLocationUsed && showMap && (
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground bg-secondary p-3 rounded-md">
            <InfoIcon className="h-5 w-5 text-primary" />
            <span>Showing doctors for a default location in Melbourne as your precise location could not be determined.</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="text-center">
        {!showMap && (
          <>
            <p className="mb-4 text-muted-foreground">
              Would you like to find doctors near your location?
            </p>
            <Button onClick={handleShowMap} disabled={isLocatingDoctors} className="bg-accent hover:bg-accent/90">
              {isLocatingDoctors ? <LoadingSpinner size={20} className="mr-2" /> : <MapPin className="mr-2 h-5 w-5" />}
              {isLocatingDoctors ? 'Locating...' : 'Show Doctors Near Me'}
            </Button>
          </>
        )}
        {showMap && (
          <>
            {isLocatingDoctors && !userLocation && <LoadingSpinner className="my-4" /> /* Show spinner only if still locating AND no location yet */}

            {userLocation && (
              <DynamicMapComponent
                center={userLocation}
                zoom={14}
                markers={MOCK_DOCTORS}
                className="h-[400px] w-full rounded-lg overflow-hidden shadow-md border mt-4"
              />
            )}

            {!isLocatingDoctors && !userLocation && ( // This case now less likely if default is set, but good fallback
              <p className="text-destructive mt-4">
                Could not determine your location. Please enable location services and try again.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
