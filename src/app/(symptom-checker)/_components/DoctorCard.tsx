
'use client';

import type { MapMarker } from '@/components/common/MapComponent';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Phone, MapPin as MapPinIcon, BadgeCheck } from 'lucide-react';

interface DoctorCardProps {
  doctor: MapMarker;
  isRecommended?: boolean;
}

export function DoctorCard({ doctor, isRecommended }: DoctorCardProps) {
  return (
    <Card className={`shadow-md hover:shadow-lg transition-shadow ${isRecommended ? 'border-2 border-accent bg-accent/10' : 'border-border'}`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-lg font-semibold">{doctor.title}</CardTitle>
          {isRecommended && (
            <Badge variant="default" className="bg-accent text-accent-foreground flex items-center gap-1 shrink-0">
              <BadgeCheck className="h-4 w-4" /> Recommended
            </Badge>
          )}
        </div>
        {doctor.specialty && <CardDescription className="text-sm text-primary font-medium">{doctor.specialty}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-1.5 text-sm">
        {doctor.description && <p className="text-xs text-muted-foreground mb-2">{doctor.description}</p>}
        
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPinIcon className="h-4 w-4 text-gray-500 shrink-0" />
          <span>{doctor.distance || 'Distance not available'}</span>
        </div>
        
        {doctor.phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-gray-500 shrink-0" />
            <a href={`tel:${doctor.phone.replace(/\s/g, '')}`} className="hover:underline text-primary">{doctor.phone}</a>
          </div>
        )}
        
        {doctor.website && doctor.website !== '#' && (
          <div className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-gray-500 shrink-0" />
            <a href={doctor.website} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary truncate">
              Visit Website
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
