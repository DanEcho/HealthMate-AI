
'use client';

import { useState, useEffect } from 'react';
import { SymptomForm, type SymptomFormData } from './_components/SymptomForm';
import { SeverityAssessmentDisplay } from './_components/SeverityAssessmentDisplay';
import { PotentialConditionsDisplay } from './_components/PotentialConditionsDisplay';
import { DoctorMapSection } from './_components/DoctorMapSection';
import { VisualFollowUpChoices } from './_components/VisualFollowUpChoices';
import { RefinedDiagnosisDisplay } from './_components/RefinedDiagnosisDisplay';
import { FollowUpSection } from './_components/FollowUpSection'; // Will be updated to ChatSection essentially
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { getAIResponse, type FullAIResponse, refineDiagnosisWithVisual, getAIFollowUpResponse } from '@/actions/aiActions';
import type { ClarificationOutput } from '@/ai/flows/clarificationFlow';
import type { RefineDiagnosisOutput } from '@/ai/flows/refineDiagnosisWithVisualFlow';
import { useToast } from '@/hooks/use-toast';
import type { UserLocation } from '@/lib/geolocation';
import { getUserLocation as fetchUserLocationUtil, DEFAULT_MELBOURNE_LOCATION } from '@/lib/geolocation';

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

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
  const [currentImageDataUri, setCurrentImageDataUri] = useState<string | undefined>(undefined);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoadingChatResponse, setIsLoadingChatResponse] = useState(false);

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
    setChatMessages([]); // Reset chat on new symptom submission
    setCurrentSymptoms(data.symptoms); 
    setSymptomsForDoctorSearch(data.symptoms);

    let imageDataUriSubmission: string | undefined = undefined;
    if (data.image && data.image.length > 0) {
      const file = data.image[0];
      try {
        imageDataUriSubmission = await new Promise((resolve, reject) => {
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
        imageDataUriSubmission = undefined;
      }
    }
    setCurrentImageDataUri(imageDataUriSubmission);

    try {
      const response = await getAIResponse(data.symptoms, imageDataUriSubmission);
      setAiResponse(response);
      // Add initial AI summary to chat if needed, or wait for first user follow-up
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
      const result = await refineDiagnosisWithVisual({
        selectedCondition,
        originalSymptoms: currentSymptoms,
      });
      setVisualFollowUpResult(result);
      // Add refined diagnosis to chat history as an AI message
      setChatMessages(prevMessages => [
        ...prevMessages,
        { id: Date.now().toString() + 'refined', role: 'ai', text: `Refined advice for ${selectedCondition}: ${result.refinedAdvice} ${result.confidence ? `(Confidence: ${result.confidence})` : ''}`, timestamp: new Date() }
      ]);

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

  const handleSendChatMessage = async (userMessageText: string) => {
    if (!currentSymptoms || !aiResponse) {
      toast({ title: 'Error', description: 'Initial AI analysis is not available for follow-up.', variant: 'destructive'});
      return;
    }
    if (!userMessageText.trim()) {
      toast({ title: 'Empty Message', description: 'Please type your message.', variant: 'destructive' });
      return;
    }

    const newUserMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: userMessageText,
      timestamp: new Date()
    };
    setChatMessages(prevMessages => [...prevMessages, newUserMessage]);
    setIsLoadingChatResponse(true);

    try {
      const clarificationResult: ClarificationOutput = await getAIFollowUpResponse({
        originalSymptoms: currentSymptoms,
        imageDataUri: currentImageDataUri,
        currentSeverityAssessment: aiResponse.severityAssessment,
        currentPotentialConditions: aiResponse.potentialConditions,
        userQuestion: userMessageText,
      });

      const aiChatMessage: ChatMessage = {
        id: Date.now().toString() + 'ai',
        role: 'ai',
        text: clarificationResult.clarificationText,
        timestamp: new Date()
      };
      setChatMessages(prevMessages => [...prevMessages, aiChatMessage]);

      // Update main aiResponse if the follow-up provided new structured data
      if (clarificationResult.updatedSeverityAssessment || clarificationResult.updatedPotentialConditions) {
        setAiResponse(prev => {
          if (!prev) return null;
          return {
            ...prev,
            severityAssessment: clarificationResult.updatedSeverityAssessment || prev.severityAssessment,
            potentialConditions: clarificationResult.updatedPotentialConditions || prev.potentialConditions,
            // Note: Doctor specialty is not updated in this iteration.
          };
        });
        toast({title: "AI Insights Updated", description: "The AI has updated its assessment based on your chat."});
      }

    } catch (error) {
      const errorMessage = (error as Error).message || 'Failed to get AI follow-up response.';
      toast({ title: 'Chat Error', description: errorMessage, variant: 'destructive' });
      const errorAiMessage: ChatMessage = {
        id: Date.now().toString() + 'aiError',
        role: 'ai',
        text: `Sorry, I encountered an error: ${errorMessage}`,
        timestamp: new Date()
      };
      setChatMessages(prevMessages => [...prevMessages, errorAiMessage]);
    } finally {
      setIsLoadingChatResponse(false);
    }
  };


  return (
    <div className="flex flex-col items-center w-full space-y-8">
      <SymptomForm onSubmit={handleSymptomSubmit} isLoading={isLoadingAI || isLoadingVisualFollowUp || isLoadingChatResponse} />

      {(isLoadingAI || isLoadingVisualFollowUp) && !isLoadingChatResponse && ( // Don't show this spinner if chat is loading
        <div className="mt-8 text-center">
          <LoadingSpinner size={48} />
          <p className="text-muted-foreground mt-2">
            {isLoadingAI ? 'Analyzing your symptoms and finding recommendations...' : 
             (isLoadingVisualFollowUp ? 'Getting refined insights...' : 'Processing...')}
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
          
          <FollowUpSection
            chatMessages={chatMessages}
            onSendMessage={handleSendChatMessage}
            isLoading={isLoadingChatResponse}
          />
          
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

