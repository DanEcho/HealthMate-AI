'use client';

import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import type { MapComponentProps as InternalMapProps, MapMarker as InternalMapMarker } from './MapComponentInternal';
import type { UserLocation as LibUserLocation } from '@/lib/geolocation';

// Re-export types for consumers of DynamicMapComponent
export type MapMarker = InternalMapMarker;
export type MapComponentProps = InternalMapProps;
export type UserLocation = LibUserLocation;


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
  return <LoadedMap {...props} />;
}
