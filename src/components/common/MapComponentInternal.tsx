'use client';

import 'leaflet/dist/leaflet.css';
import type { Icon as LeafletIconType } from 'leaflet';
import L from 'leaflet'; // Import Leaflet core directly
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
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
  // This function runs on the client due to 'use client' and dynamic import of this module.
  const cacheKey = type || 'general';
  if (iconCache[cacheKey]) {
    return iconCache[cacheKey];
  }

  let iconComponent;
  let colorClass = 'text-primary'; // Default color

  switch (type) {
    case 'hospital':
      iconComponent = <Hospital className="h-5 w-5" />;
      colorClass = 'text-red-600'; // Example: Red for hospitals
      break;
    case 'doctor':
      iconComponent = <Stethoscope className="h-5 w-5" />;
      colorClass = 'text-blue-600'; // Example: Blue for doctors
      break;
    default: // General marker
      iconComponent = <MapPin className="h-5 w-5" />;
      colorClass = 'text-gray-700'; // Example: Grey for general
  }

  const iconHtml = ReactDOMServer.renderToString(
    // Apply color directly to the SVG wrapper
    <span className={colorClass}>{iconComponent}</span>
  );

  const newIcon = L.divIcon({
    html: iconHtml,
    className: 'bg-transparent border-none', // Important for custom HTML icons
    iconSize: [24, 24], // Adjust as needed
    iconAnchor: [12, 24], // Point of the icon that corresponds to marker's location
    popupAnchor: [0, -24], // Point from which the popup should open relative to the iconAnchor
  });

  iconCache[cacheKey] = newIcon;
  return newIcon;
}

// Component to handle map view changes (center, zoom)
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
    // This effect ensures Leaflet's default icon paths are set up.
    // These files (marker-icon.png, marker-icon-2x.png, marker-shadow.png)
    // would need to be placed in the `public/leaflet/` directory by the user.
    if (typeof window !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (L.Icon.Default.prototype as any)._getIconUrl; // Necessary to override default behavior
        L.Icon.Default.mergeOptions({
        iconRetinaUrl: '/leaflet/marker-icon-2x.png',
        iconUrl: '/leaflet/marker-icon.png',
        shadowUrl: '/leaflet/marker-shadow.png',
        });
    }
  }, []);


  if (!center) {
    // This case should ideally be handled by the DynamicMapComponent wrapper
    return <div className={cn("flex items-center justify-center h-full w-full bg-muted", className)} style={style}><p>Map center not provided.</p></div>;
  }
  
  // MapContainer itself handles prop updates like 'center' and 'zoom' reactively.
  // No need for a key on the div wrapper to force re-mounts for center changes.
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
          if (!icon) return null; // Safety check, though createLeafletIcon should always return an icon
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
