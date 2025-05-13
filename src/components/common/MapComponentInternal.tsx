'use client';

import 'leaflet/dist/leaflet.css';
import type { Icon as LeafletIconType } from 'leaflet';
import L from 'leaflet'; // Import Leaflet core directly
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import type { UserLocation } from '@/lib/geolocation';
import { Hospital, Stethoscope, MapPin } from 'lucide-react';
import { useEffect } from 'react'; // Removed useRef
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
  let colorClass = 'text-primary'; // Default color

  switch (type) {
    case 'hospital':
      iconComponent = <Hospital className="h-5 w-5" />;
      colorClass = 'text-red-600';
      break;
    case 'doctor':
      iconComponent = <Stethoscope className="h-5 w-5" />;
      colorClass = 'text-blue-600';
      break;
    default: // general
      iconComponent = <MapPin className="h-5 w-5" />;
      colorClass = 'text-gray-700';
  }

  const iconHtml = ReactDOMServer.renderToString(
    <span className={colorClass}>{iconComponent}</span>
  );

  const newIcon = L.divIcon({
    html: iconHtml,
    className: 'bg-transparent border-none',
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
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
  // const mapInstanceRef = useRef<L.Map | null>(null); // Removed

 useEffect(() => {
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


  if (!center) {
    return (
        <div className={cn("flex items-center justify-center h-full w-full bg-muted", className)} style={style}>
            <p>Map center not provided.</p>
        </div>
    );
  }

  return (
    <div
      className={cn("h-96 w-full rounded-lg overflow-hidden shadow-md border", className)}
      style={style}
    >
      <MapContainer
        key={`${center.lat}-${center.lng}-${zoom}`}
        center={[center.lat, center.lng]}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        // whenCreated={(mapInstance) => { // Removed
        //   mapInstanceRef.current = mapInstance;
        // }}
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