'use client';

import { useState, useEffect } from 'react';
import { SymptomForm, type SymptomFormData } from './_components/SymptomForm';
import { SeverityAssessmentDisplay } from './_components/SeverityAssessmentDisplay';
import { PotentialConditionsDisplay } from './_components/PotentialConditionsDisplay';
import { DoctorMapSection } from './_components/DoctorMapSection';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { getAIResponse, type AIResponse } from '@/actions/aiActions';
import { useToast } from '@/hooks/use-toast';
import type { UserLocation } from '@/lib/geolocation';
import { getUserLocation as fetchUserLocationUtil } from '@/lib/geolocation';

export function AppLayoutClient() {
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false); // For both initial load and doctor search
  const [symptomsForDoctorSearch, setSymptomsForDoctorSearch] = useState<string | undefined>(undefined);

  const { toast } = useToast();

  const fetchUserLocation = async () => {
    setIsLocating(true);
    try {
      const location = await fetchUserLocationUtil();
      setUserLocation(location);
    } catch (error) {
      toast({
        title: 'Location Error',
        description: (error as Error).message || 'Could not fetch your location.',
        variant: 'destructive',
      });
      setUserLocation(null); // Ensure it's null if fetching fails
    } finally {
      setIsLocating(false);
    }
  };
  
  // Optionally fetch location on initial load, or make it on-demand
  // useEffect(() => {
  //   fetchUserLocation();
  // }, []);


  const handleSymptomSubmit = async (data: SymptomFormData) => {
    setIsLoadingAI(true);
    setAiResponse(null);
    setSymptomsForDoctorSearch(data.symptoms);
    try {
      const response = await getAIResponse(data.symptoms);
      setAiResponse(response);
    } catch (error) {
      toast({
        title: 'AI Analysis Error',
        description: (error as Error).message || 'Failed to get AI response.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleLocateDoctors = async () => {
    if (!userLocation) {
      await fetchUserLocation(); // Fetch location if not already available
    }
    // In a real app, you might pass symptomsForDoctorSearch to an API
    // For now, it just ensures location is fetched before showing map
  };

  return (
    <div className="flex flex-col items-center w-full space-y-8">
      <SymptomForm onSubmit={handleSymptomSubmit} isLoading={isLoadingAI} />

      {isLoadingAI && (
        <div className="mt-8">
          <LoadingSpinner size={48} />
          <p className="text-muted-foreground mt-2">Analyzing your symptoms...</p>
        </div>
      )}

      {aiResponse && (
        <div className="w-full max-w-2xl space-y-6">
          <SeverityAssessmentDisplay assessment={aiResponse.severityAssessment} />
          <PotentialConditionsDisplay conditions={aiResponse.potentialConditions} />
          <DoctorMapSection 
            userLocation={userLocation} 
            onLocateDoctors={handleLocateDoctors}
            isLocatingDoctors={isLocating && !userLocation} // Show locating for doctors only if userLocation isn't set yet
            symptoms={symptomsForDoctorSearch}
          />
        </div>
      )}
    </div>
  );
}
