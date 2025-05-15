
'use client';

import 'leaflet/dist/leaflet.css';
import L, { type Map as LeafletMapType, type LayerGroup as LeafletLayerGroupType, type DivIcon as LeafletDivIconType, type Icon as LeafletIconType } from 'leaflet';
import type { UserLocation } from '@/lib/geolocation';
import { Hospital, Stethoscope, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactDOMServer from 'react-dom/server';
import React, { useEffect, useRef } from 'react';

export interface MapMarker {
  id: string;
  position: UserLocation;
  title?: string;
  type?: 'hospital' | 'doctor' | 'general';
  specialty?: string;
  distance?: string; 
  website?: string;
  phone?: string;
  description?: string;
}

export interface MapComponentProps {
  center: UserLocation;
  zoom?: number;
  markers?: MapMarker[];
  style?: React.CSSProperties;
  className?: string;
}

const DEFAULT_ZOOM = 13;

if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const LIconDefault = L.Icon.Default.prototype as any;
    if (LIconDefault._getIconUrl) {
        delete LIconDefault._getIconUrl;
    }
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: '/leaflet/marker-icon-2x.png',
        iconUrl: '/leaflet/marker-icon.png',
        shadowUrl: '/leaflet/marker-shadow.png',
    });
}

const iconCache: { [key: string]: LeafletDivIconType | null } = {};

function createLeafletIcon(type: MapMarker['type']): LeafletDivIconType | LeafletIconType.Default {
  const defaultIcon = new L.Icon.Default();
  if (typeof window === 'undefined') return defaultIcon;

  const cacheKey = type || 'general';
  if (iconCache[cacheKey]) {
    return iconCache[cacheKey]!;
  }

  let iconComponent;
  let colorClass = 'text-primary';

  switch (type) {
    case 'hospital':
      iconComponent = <Hospital className="h-5 w-5" />;
      colorClass = 'text-red-600'; // Hospitals typically red
      break;
    case 'doctor':
      iconComponent = <Stethoscope className="h-5 w-5" />;
      colorClass = 'text-blue-600'; // Doctors typically blue
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
    console.error("Error creating Leaflet divIcon:", e);
    return defaultIcon; 
  }
}

export function ActualLeafletMap({
  center,
  zoom = DEFAULT_ZOOM,
  markers = [],
  style,
  className,
}: MapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMapType | null>(null);
  const markersLayerRef = useRef<LeafletLayerGroupType | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    // Do NOT initialize if mapInstanceRef.current already exists.
    // This check is crucial to prevent re-initialization if the component itself
    // doesn't unmount but its parent causes a re-render with the same key.
    if (mapInstanceRef.current) {
      // If map exists, just update view and markers if necessary (handled by other useEffects)
      return;
    }
    
    mapInstanceRef.current = L.map(mapContainerRef.current);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(mapInstanceRef.current);

    markersLayerRef.current = L.layerGroup().addTo(mapInstanceRef.current);

    if (center) {
      mapInstanceRef.current.setView([center.lat, center.lng], zoom);
    }
    
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        // Also clear markersLayerRef when map is removed
        if (markersLayerRef.current) {
          markersLayerRef.current.clearLayers(); // Clear layers from the group
          markersLayerRef.current = null; // Nullify the ref
        }
      }
    };
  }, []); // Intentionally empty: map initialization and cleanup only.

  useEffect(() => {
    if (mapInstanceRef.current && center) {
      mapInstanceRef.current.setView([center.lat, center.lng], zoom);
    }
  }, [center, zoom]);

  useEffect(() => {
    if (mapInstanceRef.current && markersLayerRef.current) {
      markersLayerRef.current.clearLayers();
      markers.forEach(markerData => {
        const icon = createLeafletIcon(markerData.type);
        const leafletMarker = L.marker([markerData.position.lat, markerData.position.lng], { icon });
        
        let popupContent = `<b>${markerData.title || 'Unnamed Location'}</b>`;
        if (markerData.specialty) popupContent += `<br>Specialty: ${markerData.specialty}`;
        if (markerData.description) popupContent += `<br>${markerData.description}`;
        if (markerData.distance) popupContent += `<br>Distance: ${markerData.distance}`;
        if (markerData.phone) popupContent += `<br>Phone: ${markerData.phone}`;
        if (markerData.website && markerData.website !== '#') {
          popupContent += `<br><a href="${markerData.website}" target="_blank" rel="noopener noreferrer" style="color:hsl(var(--primary));text-decoration:underline;">Visit Website</a>`;
        }
        leafletMarker.bindPopup(popupContent);
        
        leafletMarker.addTo(markersLayerRef.current!);
      });
    }
  }, [markers]); // Re-run if markers array changes

  if (!center && !mapInstanceRef.current) {
    return (
      <div className={cn("flex items-center justify-center h-96 w-full bg-muted rounded-lg", className)} style={style}>
        <p className="text-muted-foreground">Map initializing or center location not available.</p>
      </div>
    );
  }
  
  return (
    <div
      ref={mapContainerRef}
      className={cn("h-96 w-full rounded-lg overflow-hidden shadow-md border", className)}
      style={style}
    />
  );
}
