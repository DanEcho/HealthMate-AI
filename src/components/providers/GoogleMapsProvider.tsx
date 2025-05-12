'use client';

import type { ReactNode } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';

interface GoogleMapsProviderProps {
  children: ReactNode;
}

export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // The MapComponent itself will render an error if the key is missing,
  // so no need to log an error here or prevent rendering.
  // If no key is provided, the APIProvider might still work for basic map loads
  // but certain features might be limited or fail.

  return (
    <APIProvider apiKey={apiKey || ""}>
      {children}
    </APIProvider>
  );
}
