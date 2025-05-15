
'use client';

import { useState, useEffect } from 'react';
import { SymptomForm, type SymptomFormData } from './_components/SymptomForm';
import { SeverityAssessmentDisplay } from './_components/SeverityAssessmentDisplay';
import { PotentialConditionsDisplay } from './_components/PotentialConditionsDisplay';
import { DoctorMapSection } from './_components/DoctorMapSection';
import { VisualFollowUpChoices } from './_components/VisualFollowUpChoices';
import { RefinedDiagnosisDisplay } from './_components/RefinedDiagnosisDisplay';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { getAIResponse, type FullAIResponse, refineDiagnosisWithVisual } from '@/actions/aiActions';
import type { RefineDiagnosisOutput } from '@/ai/flows/refineDiagnosisWithVisualFlow';
import { useToast } from '@/hooks/use-toast';
import type { UserLocation } from '@/lib/geolocation';
import { getUserLocation as fetchUserLocationUtil, DEFAULT_MELBOURNE_LOCATION } from '@/lib/geolocation';

export function AppLayoutClient() {
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiResponse, setAiResponse] = useState<FullAIResponse | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [symptomsForDoctorSearch, setSymptomsForDoctorSearch] = useState<string | undefined>(undefined);
  const [isDefaultLocationUsed, setIsDefaultLocationUsed] = useState(false);

  const [isLoadingVisualFollowUp, setIsLoadingVisualFollowUp] = useState(false);
  const [visualFollowUpResult, setVisualFollowUpResult] = useState<RefineDiagnosisOutput | null>(null);
  const [currentSymptoms, setCurrentSymptoms] = useState<string>('');


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
    setVisualFollowUpResult(null); 
    setCurrentSymptoms(data.symptoms); 
    setSymptomsForDoctorSearch(data.symptoms);

    let imageDataUri: string | undefined = undefined;
    if (data.image && data.image.length > 0) {
      const file = data.image[0];
      try {
        imageDataUri = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(new Error('Failed to read image file: ' + error));
          reader.readAsDataURL(file);
        });
        toast({ title: 'Image Processing', description: 'Image selected and will be sent for analysis.' });
      } catch (error) {
        toast({
          title: 'Image Error',
          description: (error as Error).message || 'Could not process the image. Proceeding without it.',
          variant: 'destructive',
        });
        imageDataUri = undefined; // Ensure it's undefined if reading fails
      }
    }

    try {
      const response = await getAIResponse(data.symptoms, imageDataUri);
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
    await fetchUserLocation();
  };

  const handleVisualChoiceSelected = async (selectedCondition: string) => {
    if (!currentSymptoms) {
      toast({
        title: 'Error',
        description: 'Original symptoms not found. Please submit symptoms again.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoadingVisualFollowUp(true);
    setVisualFollowUpResult(null);
    try {
      // Note: The refineDiagnosisWithVisual flow currently doesn't use an image by default.
      // If the initially uploaded image should be used here, refineDiagnosisWithVisual action and flow would need modification.
      const result = await refineDiagnosisWithVisual({
        selectedCondition,
        originalSymptoms: currentSymptoms,
      });
      setVisualFollowUpResult(result);
    } catch (error) {
      toast({
        title: 'Refined AI Analysis Error',
        description: (error as Error).message || 'Failed to get refined AI response.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingVisualFollowUp(false);
    }
  };


  return (
    <div className="flex flex-col items-center w-full space-y-8">
      <SymptomForm onSubmit={handleSymptomSubmit} isLoading={isLoadingAI || isLoadingVisualFollowUp} />

      {(isLoadingAI || isLoadingVisualFollowUp) && (
        <div className="mt-8 text-center">
          <LoadingSpinner size={48} />
          <p className="text-muted-foreground mt-2">
            {isLoadingAI ? 'Analyzing your symptoms and finding recommendations...' : 'Getting refined insights...'}
          </p>
        </div>
      )}

      {aiResponse && !isLoadingAI && (
        <div className="w-full max-w-3xl space-y-6">
          <SeverityAssessmentDisplay assessment={aiResponse.severityAssessment} />
          
          {aiResponse.potentialConditions && aiResponse.potentialConditions.length > 0 && (
            <PotentialConditionsDisplay conditions={aiResponse.potentialConditions} />
          )}

          {!visualFollowUpResult && aiResponse.potentialConditions && aiResponse.potentialConditions.length > 0 && !isLoadingVisualFollowUp && (
            <VisualFollowUpChoices
              conditions={aiResponse.potentialConditions}
              onChoiceSelect={handleVisualChoiceSelected}
              isLoading={isLoadingVisualFollowUp}
            />
          )}

          {visualFollowUpResult && !isLoadingVisualFollowUp && (
            <RefinedDiagnosisDisplay result={visualFollowUpResult} />
          )}
          
          <DoctorMapSection 
            userLocation={userLocation} 
            onLocateDoctors={handleLocateDoctors}
            isLocatingDoctors={isLocating} 
            symptoms={symptomsForDoctorSearch}
            isDefaultLocationUsed={isDefaultLocationUsed}
            aiSuggestedSpecialty={aiResponse.doctorSpecialtySuggestion}
          />
        </div>
      )}
    </div>
  );
}
