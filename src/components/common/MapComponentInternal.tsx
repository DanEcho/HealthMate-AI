
'use client';

import 'leaflet/dist/leaflet.css';
import L, { type Map as LeafletMapType, type LayerGroup as LeafletLayerGroupType, type DivIcon as LeafletDivIconType, type Icon as LeafletIconType, type CircleMarker as LeafletCircleMarkerType } from 'leaflet';
import type { UserLocation } from '@/lib/geolocation';
import { Hospital, Stethoscope, MapPin as MapPinIconLucide } from 'lucide-react'; // Renamed MapPin to avoid conflict
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
    default:
      iconComponent = <MapPinIconLucide className="h-5 w-5" />;
      colorClass = 'text-gray-700';
  }

  const iconHtml = ReactDOMServer.renderToString(
    <span className={colorClass}>{iconComponent}</span>
  );

  try {
    const newIcon = L.divIcon({
      html: iconHtml,
      className: 'bg-transparent border-none leaflet-custom-div-icon', // Ensures no default Leaflet styling interferes
      iconSize: [24, 24], // Adjust as needed
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
  const userLocationMarkerRef = useRef<LeafletCircleMarkerType | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) {
      // If no container or map already initialized by this instance, do nothing.
      // The key on DynamicMapComponent > LoadedMap (ActualLeafletMap) handles re-mounts.
      return;
    }
    
    mapInstanceRef.current = L.map(mapContainerRef.current); // Initialize on the current div
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(mapInstanceRef.current);

    markersLayerRef.current = L.layerGroup().addTo(mapInstanceRef.current);

    // Set initial view and user location marker are handled in the next useEffect
    
    return () => {
      // Cleanup function for when ActualLeafletMap component unmounts
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.remove();
        userLocationMarkerRef.current = null;
      }
      if (markersLayerRef.current) {
        markersLayerRef.current.clearLayers(); // Clear layers from the group
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove(); // This is Leaflet's own cleanup method
        mapInstanceRef.current = null;
      }
    };
  }, []); // Empty dependency array: runs once on mount, cleanup on unmount.

  // Effect to update map view and user location marker when center or zoom changes
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      mapInstanceRef.current.setView([center.lat, center.lng], zoom);

      // Add or update user location marker
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.setLatLng([center.lat, center.lng]);
      } else {
        userLocationMarkerRef.current = L.circleMarker([center.lat, center.lng], {
          radius: 8,
          fillColor: 'hsl(var(--primary))', // Blue, from theme
          color: 'hsl(var(--card))',      // White, from theme
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8,
        }).addTo(mapInstanceRef.current);
      }
      userLocationMarkerRef.current.bindPopup('Your Location');
    }
  }, [center, zoom]); // Re-run if center or zoom props change

  // Effect to update POI markers when `markers` prop changes
  useEffect(() => {
    if (mapInstanceRef.current && markersLayerRef.current) {
      markersLayerRef.current.clearLayers(); // Clear previous POI markers

      markers.forEach(markerData => {
        const icon = createLeafletIcon(markerData.type);
        const leafletMarker = L.marker([markerData.position.lat, markerData.position.lng], { icon });
        
        let popupContent = `<b>${markerData.title || 'Unnamed Location'}</b>`;
        if (markerData.specialty) popupContent += `<br>Specialty: ${markerData.specialty}`;
        if (markerData.description) popupContent += `<br>${markerData.description}`;
        if (markerData.distance) popupContent += `<br>Distance: ${markerData.distance}`; // Assuming distance is pre-calculated
        if (markerData.phone) popupContent += `<br>Phone: <a href="tel:${markerData.phone.replace(/\s/g, '')}">${markerData.phone}</a>`;
        if (markerData.website && markerData.website !== '#') {
          popupContent += `<br><a href="${markerData.website}" target="_blank" rel="noopener noreferrer" style="color:hsl(var(--primary));text-decoration:underline;">Visit Website</a>`;
        }
        leafletMarker.bindPopup(popupContent);
        
        leafletMarker.addTo(markersLayerRef.current!);
      });
    }
  }, [markers]); // Re-run if markers array changes

  if (!center && !mapInstanceRef.current) {
    // This case should ideally be handled by the parent DynamicMapComponent's loading state
    // or by ensuring `center` is always provided before this component renders.
    return (
      <div className={cn("flex items-center justify-center h-96 w-full bg-muted rounded-lg", className)} style={style}>
        <p className="text-muted-foreground">Map initializing or center location not available.</p>
      </div>
    );
  }
  
  // The div that Leaflet will attach to.
  // Its existence is managed by React's lifecycle.
  // The key on DynamicMapComponent > LoadedMap (ActualLeafletMap) ensures this div is fresh if needed.
  return (
    <div
      ref={mapContainerRef}
      className={cn("h-96 w-full rounded-lg overflow-hidden shadow-md border", className)}
      style={style}
    />
  );
}

