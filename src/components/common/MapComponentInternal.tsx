'use client';

import 'leaflet/dist/leaflet.css';
import type { Icon as LeafletIconType } from 'leaflet';
import L from 'leaflet'; // Import Leaflet core directly
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import type { UserLocation } from '@/lib/geolocation';
import { Hospital, Stethoscope, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactDOMServer from 'react-dom/server';
import React, { useEffect } from 'react';

export interface MapMarker {
  id: string;
  position: UserLocation;
  title?: string;
  type?: 'hospital' | 'doctor' | 'general';
}

export interface MapComponentProps {
  center: UserLocation;
  zoom?: number;
  markers?: MapMarker[];
  style?: React.CSSProperties;
  className?: string;
}

const DEFAULT_ZOOM = 13;

// Configure Leaflet's default icon paths
if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (L.Icon.Default && L.Icon.Default.prototype && (L.Icon.Default.prototype as any)._getIconUrl) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (L.Icon.Default.prototype as any)._getIconUrl;
    }
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: '/leaflet/marker-icon-2x.png',
        iconUrl: '/leaflet/marker-icon.png',
        shadowUrl: '/leaflet/marker-shadow.png',
    });
}


const iconCache: { [key: string]: LeafletIconType | null } = {};

function createLeafletIcon(type: MapMarker['type']): LeafletIconType | null {
  if (typeof window === 'undefined') return null; 

  const cacheKey = type || 'general';
  if (iconCache[cacheKey]) {
    return iconCache[cacheKey];
  }

  let iconComponent;
  let colorClass = 'text-primary'; 

  switch (type) {
    case 'hospital':
      iconComponent = <Hospital className="h-5 w-5" />;
      colorClass = 'text-red-600'; 
      break;
    case 'doctor':
      iconComponent = <Stethoscope className="h-5 w-5" />;
      colorClass = 'text-blue-600'; 
      break;
    default: 
      iconComponent = <MapPin className="h-5 w-5" />;
      colorClass = 'text-gray-700'; 
  }

  const iconHtml = ReactDOMServer.renderToString(
    <span className={colorClass}>{iconComponent}</span>
  );

  try {
    const newIcon = L.divIcon({
      html: iconHtml,
      className: 'bg-transparent border-none leaflet-custom-div-icon', 
      iconSize: [24, 24], 
      iconAnchor: [12, 24], 
      popupAnchor: [0, -24], 
    });
    iconCache[cacheKey] = newIcon;
    return newIcon;
  } catch (e) {
    console.error("Error creating Leaflet icon:", e);
    return null; 
  }
}

// Helper component to update map view when props change (center, zoom)
function MapUpdater({ center, zoom }: { center: UserLocation; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom);
  }, [center, zoom, map]);
  return null;
}

export function ActualLeafletMap({
  center,
  zoom = DEFAULT_ZOOM,
  markers = [],
  style,
  className,
}: MapComponentProps) {

  if (!center) {
    return (
        <div className={cn("flex items-center justify-center h-full w-full bg-muted", className)} style={style}>
            <p>Map center not provided.</p>
        </div>
    );
  }
  
  // The outer div provides styling and dimensions for the map.
  // MapContainer itself should not be keyed here if its parent component (ActualLeafletMap,
  // when used as LoadedMap in DynamicMapComponent) is already being keyed.
  // Keying the parent (LoadedMap via DynamicMapComponent) ensures this whole component 
  // (including MapContainer) is new on key change.
  return (
    <div
      className={cn("h-96 w-full rounded-lg overflow-hidden shadow-md border", className)}
      style={style}
    >
      <MapContainer
        // No explicit key here; relying on parent component's (LoadedMap/ActualLeafletMap) key
        // to force re-mount when center/zoom props change fundamentally.
        center={[center.lat, center.lng]}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }} // MapContainer needs explicit dimensions
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((marker) => {
          const icon = createLeafletIcon(marker.type);
          return (
            <Marker
              key={marker.id} // Markers should be keyed by a stable ID
              position={[marker.position.lat, marker.position.lng]}
              {...(icon && { icon: icon })} 
            >
              {marker.title && <Popup>{marker.title}</Popup>}
            </Marker>
          );
        })}
        <MapUpdater center={center} zoom={zoom} />
      </MapContainer>
    </div>
  );
}
