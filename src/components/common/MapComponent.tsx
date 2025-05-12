'use client';

import { Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import type { UserLocation } from '@/lib/geolocation';
import { Hospital, Stethoscope, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface MapMarker {
  id: string;
  position: UserLocation;
  title?: string;
  type?: 'hospital' | 'doctor' | 'general';
}

interface MapComponentProps {
  center?: UserLocation;
  zoom?: number;
  markers?: MapMarker[];
  style?: React.CSSProperties;
  className?: string;
}

const DEFAULT_CENTER = { lat: 37.7749, lng: -122.4194 }; // Default to San Francisco
const DEFAULT_ZOOM = 12;

export function MapComponent({
  center: initialCenter,
  zoom = DEFAULT_ZOOM,
  markers = [],
  style,
  className,
}: MapComponentProps) {
  const [mapCenter, setMapCenter] = useState<UserLocation | undefined>(initialCenter);

  useEffect(() => {
    setMapCenter(initialCenter);
  }, [initialCenter]);

  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return (
      <div className="flex items-center justify-center h-full bg-muted rounded-lg">
        <p className="text-destructive-foreground p-4 bg-destructive rounded-md">
          Google Maps API key is not configured. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
        </p>
      </div>
    );
  }
  
  if (!mapCenter) {
     // Can show a loading state or a message
     return (
      <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
        <p className="text-muted-foreground">Loading map data...</p>
      </div>
    );
  }

  return (
    <div
      className={className ?? "h-96 w-full rounded-lg overflow-hidden shadow-md border"}
      style={style}
    >
      <Map
        defaultCenter={DEFAULT_CENTER}
        center={mapCenter}
        defaultZoom={DEFAULT_ZOOM}
        zoom={zoom}
        gestureHandling={'greedy'}
        disableDefaultUI={false}
        mapId="healthassist-map" // Optional: for cloud-based map styling
      >
        {markers.map((marker) => (
          <AdvancedMarker key={marker.id} position={marker.position} title={marker.title}>
             <Pin background={'hsl(var(--primary))'} borderColor={'hsl(var(--primary-foreground))'} glyphColor={'hsl(var(--primary-foreground))'}>
              {marker.type === 'hospital' && <Hospital className="h-5 w-5" />}
              {marker.type === 'doctor' && <Stethoscope className="h-5 w-5" />}
              {(!marker.type || marker.type === 'general') && <MapPin className="h-5 w-5" />}
            </Pin>
          </AdvancedMarker>
        ))}
      </Map>
    </div>
  );
}
