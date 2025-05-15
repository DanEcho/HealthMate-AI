
'use client';

// No local useState for showDoctors needed here anymore
import { Button } from '@/components/ui/button';
import { DynamicMapComponent, type MapMarker } from '@/components/common/MapComponent';
import type { UserLocation } from '@/lib/geolocation';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MapPin, InfoIcon, ListTree, MessageSquareQuote } from 'lucide-react';
import type { SuggestDoctorSpecialtyOutput } from '@/ai/flows/suggest-doctor-specialty';
import { DoctorCard } from './DoctorCard';

interface DoctorMapSectionProps {
  userLocation: UserLocation | null;
  onLocateDoctors: () => void; // This will be called when the button is clicked
  isLocatingDoctors: boolean;
  symptoms?: string; 
  isDefaultLocationUsed: boolean;
  aiSuggestedSpecialty?: SuggestDoctorSpecialtyOutput;
  isVisible: boolean; // New prop to control visibility from parent
}

export function DoctorMapSection({
  userLocation,
  onLocateDoctors,
  isLocatingDoctors,
  symptoms,
  isDefaultLocationUsed,
  aiSuggestedSpecialty,
  isVisible, // Use this prop
}: DoctorMapSectionProps) {
  // const [showDoctors, setShowDoctors] = useState(false); // Removed local state

  // Enhanced Mock Doctors Data
  const MOCK_DOCTORS: MapMarker[] = userLocation ? [
    { 
      id: 'doc1', 
      position: { lat: userLocation.lat + 0.01, lng: userLocation.lng + 0.01 }, 
      title: 'Northside General Clinic', 
      type: 'doctor',
      specialty: 'General Practitioner',
      distance: '1.2 km',
      website: 'https://example.com/northside',
      phone: '(03) 9123 4567',
      description: 'Accepting new patients. Bulk billing available for eligible patients.'
    },
    { 
      id: 'doc2', 
      position: { lat: userLocation.lat - 0.005, lng: userLocation.lng - 0.015 }, 
      title: 'City Heart Specialists', 
      type: 'doctor',
      specialty: 'Cardiologist',
      distance: '2.5 km',
      website: 'https://example.com/cityheart',
      phone: '(03) 9876 5432',
      description: 'Specialized cardiac care and diagnostics. Referral often required.'
    },
    { 
      id: 'doc3', 
      position: { lat: userLocation.lat + 0.002, lng: userLocation.lng - 0.008 }, 
      title: 'South Wellness Practice', 
      type: 'doctor',
      specialty: 'General Practitioner',
      distance: '0.8 km',
      website: 'https://example.com/southwellness',
      phone: '(03) 9555 0000',
      description: 'Family medicine and preventative care. Weekend appointments available.'
    },
    {
      id: 'doc4',
      position: { lat: userLocation.lat + 0.015, lng: userLocation.lng - 0.005 },
      title: 'Advanced Dermatology Clinic',
      type: 'doctor',
      specialty: 'Dermatologist',
      distance: '3.1 km',
      website: 'https://example.com/advancedderm',
      phone: '(03) 9222 3333',
      description: 'Comprehensive skin health services and cosmetic dermatology.'
    },
     {
      id: 'doc5',
      position: { lat: userLocation.lat - 0.01, lng: userLocation.lng + 0.005 },
      title: 'Eastside Physiotherapy & Sports Injury',
      type: 'doctor', 
      specialty: 'Physiotherapist',
      distance: '1.8 km',
      website: 'https://example.com/eastsidephysio',
      phone: '(03) 9444 7777',
      description: 'Musculoskeletal and sports injury rehabilitation.'
    }
  ] : [];

  // handleShowDoctorsClick is now just onLocateDoctors from props
  // const handleShowDoctorsClick = () => {
  //   onLocateDoctors(); 
  //   // setShowDoctors(true); // Parent (AppLayoutClient) will manage visibility
  // };

  const AIsuggestedSpecialtyCleaned = aiSuggestedSpecialty?.suggestedSpecialty?.toLowerCase().trim();

  return (
    <Card className="mt-6 shadow-lg">
      <CardHeader>
         <div className="flex items-center gap-3">
          <ListTree className="h-6 w-6 text-accent" />
          <CardTitle className="text-2xl font-semibold">Find Nearby Medical Professionals</CardTitle>
        </div>
        {isDefaultLocationUsed && isVisible && ( // Show warning if map is visible and location is default
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground bg-secondary p-3 rounded-md">
            <InfoIcon className="h-5 w-5 text-primary" />
            <span>Showing professionals for a default location in Melbourne as your precise location could not be determined.</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {!isVisible && ( // Use isVisible prop here
          <div className="text-center">
            <p className="mb-4 text-muted-foreground">
              See a map and list of medical professionals near you.
            </p>
            <Button onClick={onLocateDoctors} disabled={isLocatingDoctors} className="bg-accent hover:bg-accent/90">
              {isLocatingDoctors ? <LoadingSpinner size={20} className="mr-2" /> : <MapPin className="mr-2 h-5 w-5" />}
              {isLocatingDoctors ? 'Locating...' : 'Show Nearby Professionals'}
            </Button>
          </div>
        )}
        
        {isVisible && ( // Use isVisible prop here
          <>
            {isLocatingDoctors && !userLocation && <div className="text-center py-4"><LoadingSpinner size={32} /><p className="text-muted-foreground mt-2">Locating...</p></div>}

            {userLocation && (
              <>
                {aiSuggestedSpecialty && (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <MessageSquareQuote className="h-5 w-5 text-primary" />
                        <CardTitle className="text-md font-semibold text-primary">AI Recommendation for Specialist</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <p className="font-medium">Based on your symptoms, you might consider seeing a: <strong className="text-primary">{aiSuggestedSpecialty.suggestedSpecialty}</strong></p>
                      <p className="text-muted-foreground mt-1 text-xs">{aiSuggestedSpecialty.reasoning}</p>
                    </CardContent>
                  </Card>
                )}

                <DynamicMapComponent
                  center={userLocation}
                  zoom={14}
                  markers={MOCK_DOCTORS}
                  className="h-[300px] w-full rounded-lg overflow-hidden shadow-md border mt-4"
                />
                <div className="mt-6 space-y-4">
                  <h3 className="text-xl font-semibold text-foreground">Listed Professionals:</h3>
                  {MOCK_DOCTORS.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {MOCK_DOCTORS.map(doc => {
                        const isRecommended = AIsuggestedSpecialtyCleaned && doc.specialty && doc.specialty.toLowerCase().includes(AIsuggestedSpecialtyCleaned);
                        return <DoctorCard key={doc.id} doctor={doc} isRecommended={!!isRecommended} />;
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No professionals listed for this area.</p>
                  )}
                </div>
              </>
            )}

            {!isLocatingDoctors && !userLocation && !isDefaultLocationUsed && ( 
              <p className="text-destructive mt-4 text-center">
                Could not determine your location. Please enable location services and try again.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
