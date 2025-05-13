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
import { getUserLocation as fetchUserLocationUtil, DEFAULT_MELBOURNE_LOCATION } from '@/lib/geolocation';

export function AppLayoutClient() {
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [symptomsForDoctorSearch, setSymptomsForDoctorSearch] = useState<string | undefined>(undefined);
  const [isDefaultLocationUsed, setIsDefaultLocationUsed] = useState(false);

  const { toast } = useToast();

  const fetchUserLocation = async () => {
    setIsLocating(true);
    setIsDefaultLocationUsed(false);
    try {
      const location = await fetchUserLocationUtil();
      setUserLocation(location);
    } catch (error) {
      setUserLocation(DEFAULT_MELBOURNE_LOCATION);
      setIsDefaultLocationUsed(true);
      toast({
        title: 'Location Error',
        description: `${(error as Error).message || 'Could not fetch your location.'} Showing doctors for a default location in Melbourne.`,
        variant: 'destructive',
      });
    } finally {
      setIsLocating(false);
    }
  };
  
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
    // Always fetch/re-fetch location when this button is clicked,
    // to give user a chance to enable permissions or get a better fix.
    await fetchUserLocation();
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
            isLocatingDoctors={isLocating} 
            symptoms={symptomsForDoctorSearch}
            isDefaultLocationUsed={isDefaultLocationUsed}
          />
        </div>
      )}
    </div>
  );
}
