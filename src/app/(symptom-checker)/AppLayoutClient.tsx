
'use client';

import { useState, useEffect, useCallback } from 'react';
import { SymptomForm, type SymptomFormData } from './_components/SymptomForm';
import { SeverityAssessmentDisplay } from './_components/SeverityAssessmentDisplay';
import { PotentialConditionsDisplay } from './_components/PotentialConditionsDisplay';
import { DoctorMapSection } from './_components/DoctorMapSection';
import { VisualFollowUpChoices } from './_components/VisualFollowUpChoices';
import { RefinedDiagnosisDisplay } from './_components/RefinedDiagnosisDisplay';
import { FollowUpSection } from './_components/FollowUpSection';
import { ChatHistoryPanel } from './_components/ChatHistoryPanel';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { PanelLeft } from 'lucide-react';
import { getAIResponse, type FullAIResponse, refineDiagnosisWithVisual, getAIFollowUpResponse } from '@/actions/aiActions';
import type { ClarificationOutput } from '@/ai/flows/clarificationFlow';
import type { AssessSymptomSeverityOutput } from '@/ai/flows/assess-symptom-severity';
import type { SuggestPotentialConditionsOutput } from '@/ai/flows/suggest-potential-conditions';
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

export interface ChatSession {
  id: string;
  timestamp: string; // ISO string
  title?: string; 
  currentSymptoms: string;
  currentImageDataUri?: string;
  aiResponse: FullAIResponse | null;
  visualFollowUpResult: RefineDiagnosisOutput | null;
  chatMessages: ChatMessage[];
}

const LOCAL_STORAGE_KEY = 'HEALTH_ASSIST_CHAT_SESSIONS_V1';

export function AppLayoutClient() {
  // States for current interaction within an active session
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiResponse, setAiResponse] = useState<FullAIResponse | null>(null);
  const [visualFollowUpResult, setVisualFollowUpResult] = useState<RefineDiagnosisOutput | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentSymptoms, setCurrentSymptoms] = useState<string>(''); // Used to hold form input before session creation
  const [currentImageDataUri, setCurrentImageDataUri] = useState<string | undefined>(undefined); // Image for current session

  // Location related states
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [symptomsForDoctorSearch, setSymptomsForDoctorSearch] = useState<string | undefined>(undefined);
  const [isDefaultLocationUsed, setIsDefaultLocationUsed] = useState(false);
  
  // Loading states
  const [isLoadingVisualFollowUp, setIsLoadingVisualFollowUp] = useState(false);
  const [isLoadingChatResponse, setIsLoadingChatResponse] = useState(false);

  // Chat History states
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);

  const { toast } = useToast();

  // Load sessions from localStorage on mount
  useEffect(() => {
    try {
      const storedSessions = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedSessions) {
        setChatSessions(JSON.parse(storedSessions));
      }
    } catch (error) {
      console.error("Failed to load chat sessions from localStorage:", error);
      toast({ title: "Error", description: "Could not load previous chat sessions.", variant: "destructive" });
    }
  }, [toast]);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(chatSessions));
    } catch (error) {
      console.error("Failed to save chat sessions to localStorage:", error);
      // Potentially toast if this is critical, but might be too noisy
    }
  }, [chatSessions]);

  const updateActiveSession = useCallback((updater: (session: ChatSession) => ChatSession) => {
    setChatSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === activeSessionId ? updater(session) : session
      )
    );
  }, [activeSessionId]);


  const resetCurrentInteractionState = () => {
    setAiResponse(null);
    setVisualFollowUpResult(null);
    setChatMessages([]);
    setCurrentSymptoms('');
    setCurrentImageDataUri(undefined);
    setSymptomsForDoctorSearch(undefined);
    setIsLoadingAI(false);
    setIsLoadingVisualFollowUp(false);
    setIsLoadingChatResponse(false);
  };

  const startNewSession = () => {
    resetCurrentInteractionState();
    setActiveSessionId(null); 
    // The SymptomForm will be cleared by its own internal state or next submit
    // This function is primarily for clearing the display and active context
    toast({ title: "New Chat Started", description: "Please enter your symptoms."});
  };

  const loadSession = (sessionId: string) => {
    const sessionToLoad = chatSessions.find(s => s.id === sessionId);
    if (sessionToLoad) {
      setActiveSessionId(sessionToLoad.id);
      setAiResponse(sessionToLoad.aiResponse);
      setVisualFollowUpResult(sessionToLoad.visualFollowUpResult);
      setChatMessages(sessionToLoad.chatMessages.map(m => ({...m, timestamp: new Date(m.timestamp)}))); // Deserialize dates
      setCurrentSymptoms(sessionToLoad.currentSymptoms); // For context if needed later, not for re-populating form
      setCurrentImageDataUri(sessionToLoad.currentImageDataUri);
      setSymptomsForDoctorSearch(sessionToLoad.currentSymptoms); // For doctor map
      
      setIsLoadingAI(false);
      setIsLoadingVisualFollowUp(false);
      setIsLoadingChatResponse(false);
      toast({ title: "Chat Loaded", description: `Switched to chat from ${new Date(sessionToLoad.timestamp).toLocaleDateString()}.` });
    } else {
      toast({ title: "Error", description: "Could not load the selected chat session.", variant: "destructive" });
    }
  };

  const deleteSession = (sessionId: string) => {
    setChatSessions(prevSessions => prevSessions.filter(s => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      startNewSession(); // If active session is deleted, reset to a new chat state
    }
    toast({ title: "Chat Deleted", description: "The chat session has been removed." });
  };


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
        description: `${(error as Error).message || 'Could not fetch your location.'} Showing results for Melbourne.`,
        variant: 'destructive',
      });
    } finally {
      setIsLocating(false);
    }
  };
  
  const handleSymptomSubmit = async (data: SymptomFormData) => {
    // This always starts a new session
    resetCurrentInteractionState();
    
    const newSessionId = `session_${Date.now()}`;
    setActiveSessionId(newSessionId);
    setCurrentSymptoms(data.symptoms);
    setSymptomsForDoctorSearch(data.symptoms);
    setIsLoadingAI(true);

    let processedImageDataUri: string | undefined = undefined;
    if (data.image && data.image.length > 0) {
      const file = data.image[0];
      try {
        processedImageDataUri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(new Error('Failed to read image file: ' + error));
          reader.readAsDataURL(file);
        });
        setCurrentImageDataUri(processedImageDataUri); // Store for current session context
        toast({ title: 'Image Processing', description: 'Image ready for analysis.' });
      } catch (error) {
        toast({
          title: 'Image Error',
          description: (error as Error).message || 'Could not process image.',
          variant: 'destructive',
        });
      }
    } else {
        setCurrentImageDataUri(undefined);
    }
    
    // Create the new session object structure early
    const newSession: ChatSession = {
      id: newSessionId,
      timestamp: new Date().toISOString(),
      currentSymptoms: data.symptoms,
      currentImageDataUri: processedImageDataUri,
      aiResponse: null,
      visualFollowUpResult: null,
      chatMessages: [],
    };
    setChatSessions(prevSessions => [newSession, ...prevSessions]);


    try {
      const response = await getAIResponse(data.symptoms, processedImageDataUri);
      setAiResponse(response); // Update display state
      updateActiveSession(session => ({ ...session, aiResponse: response }));
    } catch (error) {
      toast({
        title: 'AI Analysis Error',
        description: (error as Error).message || 'Failed to get AI response.',
        variant: 'destructive',
      });
      // Optionally remove the partially created session or mark it as failed
      // For simplicity, we'll leave it for now, it will just have null aiResponse
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleLocateDoctors = async () => {
    await fetchUserLocation();
  };

  const handleVisualChoiceSelected = async (selectedCondition: string) => {
    if (!activeSessionId || !currentSymptoms) { // currentSymptoms here should be from the active session context
      toast({ title: 'Error', description: 'Active session or original symptoms not found.', variant: 'destructive' });
      return;
    }
    setIsLoadingVisualFollowUp(true);
    setVisualFollowUpResult(null); 
    try {
      const result = await refineDiagnosisWithVisual({
        selectedCondition,
        originalSymptoms: currentSymptoms, // Use currentSymptoms from the active session context
      });
      setVisualFollowUpResult(result); // Update display state
      
      const aiMessageForChat: ChatMessage = {
        id: Date.now().toString() + 'refined',
        role: 'ai',
        text: `Okay, focusing on ${selectedCondition}. Here's some refined advice: ${result.refinedAdvice}${result.confidence ? ` (Confidence: ${result.confidence})` : ''}`,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, aiMessageForChat]); // Update display state
      
      updateActiveSession(session => ({
        ...session,
        visualFollowUpResult: result,
        chatMessages: [...session.chatMessages, aiMessageForChat],
      }));

    } catch (error) {
      toast({ title: 'Refined AI Analysis Error', description: (error as Error).message || 'Failed to get refined AI response.', variant: 'destructive' });
    } finally {
      setIsLoadingVisualFollowUp(false);
    }
  };

  const handleSendChatMessage = async (userMessageText: string) => {
    const activeSession = chatSessions.find(s => s.id === activeSessionId);
    if (!activeSession || !activeSession.aiResponse) { // Check activeSession and its aiResponse
      toast({ title: 'Error', description: 'Initial AI analysis is not available for follow-up.', variant: 'destructive'});
      return;
    }
    if (!userMessageText.trim()) {
      toast({ title: 'Empty Message', description: 'Please type your message.', variant: 'destructive' });
      return;
    }

    const newUserMessage: ChatMessage = { id: Date.now().toString(), role: 'user', text: userMessageText, timestamp: new Date() };
    setChatMessages(prev => [...prev, newUserMessage]); // Update display state
    setIsLoadingChatResponse(true);

    // Immediately update the session in chatSessions state with the user message
    updateActiveSession(session => ({
      ...session,
      chatMessages: [...session.chatMessages, newUserMessage],
    }));

    try {
      const clarificationResult: ClarificationOutput = await getAIFollowUpResponse({
        originalSymptoms: activeSession.currentSymptoms,
        imageDataUri: activeSession.currentImageDataUri,
        currentSeverityAssessment: activeSession.aiResponse.severityAssessment,
        currentPotentialConditions: activeSession.aiResponse.potentialConditions,
        userQuestion: userMessageText,
      });

      const aiChatMessage: ChatMessage = { id: Date.now().toString() + 'ai', role: 'ai', text: clarificationResult.clarificationText, timestamp: new Date() };
      setChatMessages(prev => [...prev, aiChatMessage]); // Update display state

      let updatedAiResponse = activeSession.aiResponse;
      if (clarificationResult.updatedSeverityAssessment || clarificationResult.updatedPotentialConditions) {
        updatedAiResponse = {
          ...(activeSession.aiResponse!), // aiResponse is checked to exist
          severityAssessment: clarificationResult.updatedSeverityAssessment || activeSession.aiResponse!.severityAssessment,
          potentialConditions: clarificationResult.updatedPotentialConditions || activeSession.aiResponse!.potentialConditions,
        };
        setAiResponse(updatedAiResponse); // Update display state for current view
        toast({title: "AI Insights Updated", description: "The AI has updated its assessment based on your chat."});
      }
      
      updateActiveSession(session => ({
        ...session,
        aiResponse: updatedAiResponse,
        chatMessages: [...session.chatMessages, aiChatMessage], // Add AI message
      }));

    } catch (error) {
      const errorMessage = (error as Error).message || 'Failed to get AI follow-up response.';
      toast({ title: 'Chat Error', description: errorMessage, variant: 'destructive' });
      const errorAiMessage: ChatMessage = { id: Date.now().toString() + 'aiError', role: 'ai', text: `Sorry, I encountered an error: ${errorMessage}`, timestamp: new Date() };
      setChatMessages(prev => [...prev, errorAiMessage]); // Update display state

      updateActiveSession(session => ({
        ...session,
        chatMessages: [...session.chatMessages, errorAiMessage], // Add AI error message
      }));
    } finally {
      setIsLoadingChatResponse(false);
    }
  };


  return (
    <div className="flex flex-col items-center w-full space-y-6">
       <ChatHistoryPanel
        isOpen={isHistoryPanelOpen}
        onOpenChange={setIsHistoryPanelOpen}
        sessions={chatSessions}
        activeSessionId={activeSessionId}
        onLoadSession={loadSession}
        onStartNewSession={startNewSession}
        onDeleteSession={deleteSession}
        triggerButton={
          <Button 
            variant="outline" 
            onClick={() => setIsHistoryPanelOpen(true)} 
            className="self-start mt-0 mb-2" // Positioned top-leftish
            aria-label="View chat history"
          >
            <PanelLeft className="h-5 w-5 mr-2" />
            View Chat History
          </Button>
        }
      />

      <SymptomForm onSubmit={handleSymptomSubmit} isLoading={isLoadingAI} />

      {(isLoadingAI && !aiResponse) && ( // Show main loading spinner only if no AI response yet for active session
        <div className="mt-8 text-center">
          <LoadingSpinner size={48} />
          <p className="text-muted-foreground mt-2">Analyzing your symptoms...</p>
        </div>
      )}

      {/* Display content only if there's an active session and its AI response is available */}
      {activeSessionId && aiResponse && !isLoadingAI && (
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
            chatMessages={chatMessages} // Use chatMessages from the active session
            onSendMessage={handleSendChatMessage}
            isLoading={isLoadingChatResponse}
          />
          
          <DoctorMapSection 
            userLocation={userLocation} 
            onLocateDoctors={handleLocateDoctors}
            isLocatingDoctors={isLocating} 
            symptoms={symptomsForDoctorSearch} // This could be activeSession.currentSymptoms
            isDefaultLocationUsed={isDefaultLocationUsed}
            aiSuggestedSpecialty={aiResponse.doctorSpecialtySuggestion}
          />
        </div>
      )}
      {!activeSessionId && !isLoadingAI && (
         <div className="mt-12 text-center text-muted-foreground">
            <p className="text-lg">Welcome to HealthAssist AI!</p>
            <p>Please describe your symptoms in the form above to get started, or load a previous chat from the history.</p>
        </div>
      )}
    </div>
  );
}
