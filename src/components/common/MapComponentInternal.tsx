
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
}

export interface MapComponentProps {
  center: UserLocation;
  zoom?: number;
  markers?: MapMarker[];
  style?: React.CSSProperties;
  className?: string;
}

const DEFAULT_ZOOM = 13;

// Configure Leaflet's default icon paths for vanilla Leaflet
// This is important for Next.js/webpack environments
if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const LIconDefault = L.Icon.Default.prototype as any;
    if (LIconDefault._getIconUrl) {
        delete LIconDefault._getIconUrl;
    }
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: '/leaflet/marker-icon-2x.png', // Ensure these paths are correct if using default icons
        iconUrl: '/leaflet/marker-icon.png',
        shadowUrl: '/leaflet/marker-shadow.png',
    });
}

const iconCache: { [key: string]: LeafletDivIconType | null } = {};

function createLeafletIcon(type: MapMarker['type']): LeafletDivIconType | LeafletIconType.Default {
  // Fallback to default icon if window is not defined (e.g. during SSR icon path resolution)
  // or if custom icon creation fails. This requires public/leaflet assets to be set up.
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
      iconAnchor: [12, 24], // Point of the icon which will correspond to marker's location
      popupAnchor: [0, -24], // Point from which the popup should open relative to the iconAnchor
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

  // Effect for initializing and cleaning up the map
  useEffect(() => {
    if (!mapContainerRef.current) return; // Div not yet rendered
    if (mapInstanceRef.current) return; // Map already initialized

    mapInstanceRef.current = L.map(mapContainerRef.current);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(mapInstanceRef.current);

    markersLayerRef.current = L.layerGroup().addTo(mapInstanceRef.current);

    // Set initial view from props if center is available
    if (center) {
      mapInstanceRef.current.setView([center.lat, center.lng], zoom);
    }
    
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []); // Empty dependency array ensures this runs once on mount and cleanup on unmount

  // Effect for updating map view (center/zoom) when props change
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      mapInstanceRef.current.setView([center.lat, center.lng], zoom);
    }
  }, [center, zoom]);

  // Effect for updating markers when markers prop changes
  useEffect(() => {
    if (mapInstanceRef.current && markersLayerRef.current) {
      markersLayerRef.current.clearLayers(); // Clear previous markers
      markers.forEach(markerData => {
        const icon = createLeafletIcon(markerData.type);
        const leafletMarker = L.marker([markerData.position.lat, markerData.position.lng], { icon });
        if (markerData.title) {
          leafletMarker.bindPopup(markerData.title);
        }
        leafletMarker.addTo(markersLayerRef.current!);
      });
    }
  }, [markers]);

  if (!center && !mapInstanceRef.current) { // Show placeholder if no center and map not yet init
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
      // Leaflet map will be initialized inside this div
    />
  );
}
