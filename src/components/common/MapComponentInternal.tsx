'use client';

import 'leaflet/dist/leaflet.css';
import type { Icon as LeafletIconType } from 'leaflet';
import L from 'leaflet'; // Import Leaflet core directly
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import type { UserLocation } from '@/lib/geolocation';
import { Hospital, Stethoscope, MapPin } from 'lucide-react';
// useEffect is no longer needed here for icon setup if moved to module scope
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

// Perform Leaflet default icon path correction once when the module is loaded.
// This avoids issues if ActualLeafletMap remounts and tries to modify the prototype multiple times.
if (typeof window !== 'undefined' && L.Icon.Default.prototype._getIconUrl) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: '/leaflet/marker-icon-2x.png', // Ensure these files exist in public/leaflet
    iconUrl: '/leaflet/marker-icon.png',       // Ensure these files exist in public/leaflet
    shadowUrl: '/leaflet/marker-shadow.png',   // Ensure these files exist in public/leaflet
  });
}


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
      colorClass = 'text-red-600'; // Adjusted to a common Tailwind red
      break;
    case 'doctor':
      iconComponent = <Stethoscope className="h-5 w-5" />;
      colorClass = 'text-blue-600'; // Adjusted to a common Tailwind blue
      break;
    default: // general
      iconComponent = <MapPin className="h-5 w-5" />;
      colorClass = 'text-gray-700'; // Adjusted to a common Tailwind gray
  }

  const iconHtml = ReactDOMServer.renderToString(
    <span className={colorClass}>{iconComponent}</span>
  );

  try {
    const newIcon = L.divIcon({
      html: iconHtml,
      className: 'bg-transparent border-none leaflet-custom-div-icon', 
      iconSize: [24, 24], // Standard size
      iconAnchor: [12, 24], // Point of the icon that corresponds to marker's location
      popupAnchor: [0, -24], // Point from which the popup should open relative to the iconAnchor
    });
    iconCache[cacheKey] = newIcon;
    return newIcon;
  } catch (e) {
    console.error("Error creating Leaflet icon:", e);
    // Fallback to null, Leaflet will use its default icon if this happens.
    return null; 
  }
}


export function ActualLeafletMap({
  center,
  zoom = DEFAULT_ZOOM,
  markers = [],
  style,
  className,
}: MapComponentProps) {

  // Icon setup useEffect is removed as it's now handled at module scope.

  if (!center) {
    return (
        <div className={cn("flex items-center justify-center h-full w-full bg-muted", className)} style={style}>
            <p>Map center not provided.</p>
        </div>
    );
  }
  
  // The parent DynamicMapComponent keys this ActualLeafletMap component.
  // When that key changes (due to center/zoom prop changes), this entire component
  // instance is replaced, ensuring MapContainer gets re-initialized correctly.
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
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((marker) => {
          const icon = createLeafletIcon(marker.type);
          // If createLeafletIcon returns null (e.g., on error, or if type is general and we want default),
          // Leaflet's default icon will be used if 'icon' prop is not passed to Marker or is undefined.
          return (
            <Marker
              key={marker.id}
              position={[marker.position.lat, marker.position.lng]}
              {...(icon && { icon: icon })} // Use custom icon if available and successfully created
            >
              {marker.title && <Popup>{marker.title}</Popup>}
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

