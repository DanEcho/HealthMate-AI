'use client';

import type { ReactNode } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';

interface GoogleMapsProviderProps {
  children: ReactNode;
}

export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.error("Google Maps API key is missing. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable.");
    // Optionally render a fallback or just the children without the provider
    // return <>{children}</>; 
  }

  return (
    <APIProvider apiKey={apiKey || ""}>
      {children}
    </APIProvider>
  );
}
