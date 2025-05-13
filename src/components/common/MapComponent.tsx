'use client';

import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import type { MapComponentProps as InternalMapProps, MapMarker as InternalMapMarker } from './MapComponentInternal';
import type { UserLocation as LibUserLocation } from '@/lib/geolocation';

// Re-export types for consumers of DynamicMapComponent
export type MapMarker = InternalMapMarker;
export type MapComponentProps = InternalMapProps;
export type UserLocation = LibUserLocation;

// Default zoom value used in MapComponentInternal
const DEFAULT_MAP_ZOOM = 13;

const LoadedMap = dynamic(
  () => import('./MapComponentInternal').then(mod => mod.ActualLeafletMap), // Corrected: mod => mod.ActualLeafletMap
  {
    ssr: false, // Crucial for Leaflet to prevent window errors
    loading: () => (
      <div className={cn("flex items-center justify-center h-96 w-full bg-muted rounded-lg")}>
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    )
  }
);

export function DynamicMapComponent(props: MapComponentProps) {
  // Ensure the center prop is always valid before rendering LoadedMap
  if (!props.center) {
     return (
      <div className={cn("flex items-center justify-center h-96 w-full bg-muted rounded-lg", props.className)} style={props.style}>
        <p className="text-muted-foreground">Map center location not available.</p>
      </div>
    );
  }

  // Keying LoadedMap (ActualLeafletMap) with center and zoom.
  // This forces a new instance if the center/zoom fundamentally changes.
  const mapKey = `${props.center.lat}-${props.center.lng}-${props.zoom || DEFAULT_MAP_ZOOM}`;
  
  // The ActualLeafletMap component (LoadedMap) internally keys its MapContainer.
  // By also keying LoadedMap here, we ensure that if DynamicMapComponent
  // receives new center/zoom, it forces a full re-mount of ActualLeafletMap.
  return <LoadedMap key={mapKey} {...props} />;
}

