'use client';

import 'leaflet/dist/leaflet.css';
import type { Icon as LeafletIconType } from 'leaflet';
import L from 'leaflet'; // Import Leaflet core directly
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'; // Removed useMap
import type { UserLocation } from '@/lib/geolocation';
import { Hospital, Stethoscope, MapPin } from 'lucide-react';
import { useEffect, useRef } from 'react'; // Removed useState as mapCenter state is not used
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
    className: 'bg-transparent border-none',
    iconSize: [24, 24], 
    iconAnchor: [12, 24], 
    popupAnchor: [0, -24], 
  });

  iconCache[cacheKey] = newIcon;
  return newIcon;
}

// ChangeView component is removed as MapContainer will be keyed by center/zoom,
// forcing re-initialization with new center/zoom values directly.
// function ChangeView({ center, zoom }: { center: L.LatLngExpression; zoom: number }) {
//   const map = useMap();
//   useEffect(() => {
//     if (map) {
//       map.setView(center, zoom);
//     }
//   }, [center, zoom, map]);
//   return null;
// }

export function ActualLeafletMap({
  center,
  zoom = DEFAULT_ZOOM,
  markers = [],
  style,
  className,
}: MapComponentProps) {
  const mapInstanceRef = useRef<L.Map | null>(null); // To store the map instance if needed, passed to whenCreated

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
    return <div className={cn("flex items-center justify-center h-full w-full bg-muted", className)} style={style}><p>Map center not provided.</p></div>;
  }
  
  return (
    // The outer div does not need a key if MapContainer is keyed correctly.
    <div className={cn("h-96 w-full rounded-lg overflow-hidden shadow-md border", className)} style={style}>
      <MapContainer
        // Keying MapContainer by center and zoom.
        // This forces React to create a new MapContainer instance (and thus a new Leaflet map)
        // whenever the center or zoom fundamentally changes, avoiding the "already initialized" error.
        key={`${center.lat}-${center.lng}-${zoom}`}
        center={[center.lat, center.lng]}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        whenCreated={(mapInstance) => { 
          mapInstanceRef.current = mapInstance; 
          // If any post-creation setup is needed, it can be done here.
          // For example, mapInstance.invalidateSize() if the container size might change after map init.
        }}
      >
        {/* ChangeView is removed because the key on MapContainer handles re-centering/re-zooming by re-initializing */}
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
