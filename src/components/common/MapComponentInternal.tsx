'use client';

import 'leaflet/dist/leaflet.css';
import type { Icon as LeafletIconType } from 'leaflet';
import L from 'leaflet'; // Import Leaflet core directly
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import type { UserLocation } from '@/lib/geolocation';
import { Hospital, Stethoscope, MapPin } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import ReactDOMServer from 'react-dom/server';

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

const iconCache: { [key: string]: LeafletIconType | null } = {};

function createLeafletIcon(type: MapMarker['type']): LeafletIconType | null {
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

  const newIcon = L.divIcon({
    html: iconHtml,
    className: 'bg-transparent border-none', // Ensure icon background is transparent
    iconSize: [24, 24], // Adjust size as needed
    iconAnchor: [12, 24], // Point of the icon which will correspond to marker's location
    popupAnchor: [0, -24], // Point from which the popup should open relative to the iconAnchor
  });

  iconCache[cacheKey] = newIcon;
  return newIcon;
}


export function ActualLeafletMap({
  center,
  zoom = DEFAULT_ZOOM,
  markers = [],
  style,
  className,
}: MapComponentProps) {
  const mapInstanceRef = useRef<L.Map | null>(null);

 useEffect(() => {
    // This effect addresses an issue where default Leaflet icon paths might not resolve correctly with bundlers like Webpack.
    // It should run only once.
    if (typeof window !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
        iconRetinaUrl: '/leaflet/marker-icon-2x.png', // Ensure these paths are correct and files are in /public/leaflet/
        iconUrl: '/leaflet/marker-icon.png',
        shadowUrl: '/leaflet/marker-shadow.png',
        });
    }
  }, []);


  if (!center) {
    // This check should ideally be handled by the calling component (DynamicMapComponent)
    // but added here as a safeguard.
    return (
        <div className={cn("flex items-center justify-center h-full w-full bg-muted", className)} style={style}>
            <p>Map center not provided.</p>
        </div>
    );
  }

  // Keying the MapContainer directly: This forces React to create a new MapContainer instance
  // (and thus a new Leaflet map) whenever the center or zoom fundamentally changes.
  // This is the standard way to ensure cleanup and prevent "already initialized" errors.
  return (
    <div
      className={cn("h-96 w-full rounded-lg overflow-hidden shadow-md border", className)}
      style={style}
    >
      <MapContainer
        key={`${center.lat}-${center.lng}-${zoom}`} // Key moved here
        center={[center.lat, center.lng]}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        whenCreated={(mapInstance) => {
          mapInstanceRef.current = mapInstance;
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((marker) => {
          const icon = createLeafletIcon(marker.type);
          if (!icon) return null;
          return (
            <Marker
              key={marker.id}
              position={[marker.position.lat, marker.position.lng]}
              icon={icon}
            >
              {marker.title && <Popup>{marker.title}</Popup>}
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
