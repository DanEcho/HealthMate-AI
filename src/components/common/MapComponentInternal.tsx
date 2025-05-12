// src/components/common/MapComponentInternal.tsx
'use client';

import 'leaflet/dist/leaflet.css';
import type { Icon as LeafletIconType } from 'leaflet'; // Renamed to avoid conflict if Icon is used elsewhere
import L from 'leaflet'; // Import Leaflet core directly
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import type { UserLocation } from '@/lib/geolocation';
import { Hospital, Stethoscope, MapPin } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import ReactDOMServer from 'react-dom/server';

export interface MapMarker {
  id: string;
  position: UserLocation; // Assuming UserLocation is { lat: number; lng: number }
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
  if (typeof window === 'undefined') { // Should not be strictly necessary here due to 'use client' and dynamic import of this module
    return null;
  }

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
    className: 'bg-transparent border-none', // Important for custom HTML icons
    iconSize: [24, 24],
    iconAnchor: [12, 24], // Adjust as needed
    popupAnchor: [0, -24], // Adjust as needed
  });

  iconCache[cacheKey] = newIcon;
  return newIcon;
}

function ChangeView({ center, zoom }: { center: L.LatLngExpression; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (map) {
      map.setView(center, zoom);
    }
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
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    // Set default icon paths for Leaflet. These files need to be in `public/leaflet/`
    // This is important if default Leaflet markers are ever used or if react-leaflet relies on them.
    if (typeof window !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
        iconRetinaUrl: '/leaflet/marker-icon-2x.png',
        iconUrl: '/leaflet/marker-icon.png',
        shadowUrl: '/leaflet/marker-shadow.png',
        });
    }
  }, []);

  return (
    <div className={cn("h-96 w-full rounded-lg overflow-hidden shadow-md border", className)} style={style}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        whenCreated={(mapInstance) => { mapRef.current = mapInstance; }}
      >
        <ChangeView center={[center.lat, center.lng]} zoom={zoom} />
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
