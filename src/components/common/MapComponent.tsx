'use client';

import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import type { MapComponentProps as InternalMapProps, MapMarker as InternalMapMarker } from './MapComponentInternal';
import type { UserLocation as LibUserLocation } from '@/lib/geolocation';

// Re-export types for consumers of DynamicMapComponent
export type MapMarker = InternalMapMarker;
export type MapComponentProps = InternalMapProps;
export type UserLocation = LibUserLocation;

// Default zoom value used in MapComponentInternal and for key generation
const DEFAULT_MAP_ZOOM = 13;

const LoadedMap = dynamic(
  () => import('./MapComponentInternal').then(mod => mod.ActualLeafletMap),
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

  // Keying LoadedMap (which is ActualLeafletMap) with center and zoom.
  // This forces React to create a new instance of ActualLeafletMap (and thus MapContainer)
  // if the center or zoom fundamentally changes. This is the standard way to handle
  // the "Map container is already initialized" error by ensuring a clean unmount and remount.
  const mapKey = `${props.center.lat}-${props.center.lng}-${props.zoom || DEFAULT_MAP_ZOOM}`;
  
  return <LoadedMap key={mapKey} {...props} />;
}
