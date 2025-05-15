
'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
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
import type { RefineDiagnosisOutput } from '@/ai/flows/refineDiagnosisWithVisualFlow';
import { useToast } from '@/hooks/use-toast';
import type { UserLocation } from '@/lib/geolocation';
import { getUserLocation as fetchUserLocationUtil, DEFAULT_MELBOURNE_LOCATION } from '@/lib/geolocation';
import { AppShell } from '@/components/layout/AppShell';

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
  isDoctorMapSectionVisible?: boolean;
  sessionUserLocation?: UserLocation | null;
}

const LOCAL_STORAGE_KEY = 'HEALTH_ASSIST_CHAT_SESSIONS_V1';

export function AppLayoutClient() {
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiResponse, setAiResponse] = useState<FullAIResponse | null>(null);
  const [visualFollowUpResult, setVisualFollowUpResult] = useState<RefineDiagnosisOutput | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentSymptomsInput, setCurrentSymptomsInput] = useState<string>('');
  const [currentImageDataUri, setCurrentImageDataUri] = useState<string | undefined>(undefined);

  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLocatingDoctorsMap, setIsLocatingDoctorsMap] = useState(false);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const [symptomsForDoctorSearch, setSymptomsForDoctorSearch] = useState<string | undefined>(undefined);
  const [isDefaultLocationUsed, setIsDefaultLocationUsed] = useState(false);
  const [isDoctorMapSectionVisible, setIsDoctorMapSectionVisible] = useState(false);

  const [isLoadingVisualFollowUp, setIsLoadingVisualFollowUp] = useState(false);
  const [isLoadingChatResponse, setIsLoadingChatResponse] = useState(false);

  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    try {
      const storedSessions = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedSessions) {
        const parsedSessions: ChatSession[] = JSON.parse(storedSessions);
        setChatSessions(parsedSessions);
        // If there are sessions, potentially load the most recent one or none
        // For now, let's not auto-load to avoid complexity, user can select from panel.
      }
    } catch (error) {
      console.error("Failed to load chat sessions from localStorage:", error);
      toast({ title: "Error", description: "Could not load previous chat sessions.", variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    if (chatSessions.length > 0 || localStorage.getItem(LOCAL_STORAGE_KEY) !== null) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(chatSessions));
      } catch (error) {
        console.error("Failed to save chat sessions to localStorage:", error);
        // Optionally, inform the user if saving fails critically
      }
    }
  }, [chatSessions]);


  const updateActiveSession = useCallback((updater: (session: ChatSession) => ChatSession) => {
    setChatSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === activeSessionId ? updater(session) : session
      )
    );
  }, [activeSessionId]);

  const resetCurrentInteractionState = (keepSymptomsAndImage: boolean = false) => {
    setAiResponse(null);
    setVisualFollowUpResult(null);
    setChatMessages([]);
    if (!keepSymptomsAndImage) {
      setCurrentSymptomsInput('');
      setCurrentImageDataUri(undefined);
    }
    // symptomsForDoctorSearch should reflect the current context if kept
    setSymptomsForDoctorSearch(keepSymptomsAndImage ? currentSymptomsInput : undefined);
    setIsDoctorMapSectionVisible(false); // Reset map visibility
    setUserLocation(null); // Reset map location data
    setIsDefaultLocationUsed(false);

    // Reset loading states
    setIsLoadingAI(false);
    setIsLoadingVisualFollowUp(false);
    setIsLoadingChatResponse(false);
    setIsLocatingDoctorsMap(false);
    setIsRefreshingLocation(false);
  };

  const getSessionTitle = (session: Partial<ChatSession>): string => {
    if (session.title) return session.title;
    if (session.currentSymptoms && session.currentSymptoms.trim().length > 0) {
      const title = session.currentSymptoms.substring(0, 35);
      return title.length < session.currentSymptoms.length ? title + '...' : title;
    }
    return session.timestamp ? `Chat from ${new Date(session.timestamp).toLocaleDateString()}` : 'New Chat';
  };

  const startNewSession = () => {
    resetCurrentInteractionState(); // Clears all current interaction states
    setActiveSessionId(null); // No active session
    toast({ title: "New Chat Started", description: "Please enter your symptoms." });
  };

  const loadSession = async (sessionId: string) => {
    const sessionToLoad = chatSessions.find(s => s.id === sessionId);
    if (sessionToLoad) {
      resetCurrentInteractionState(true); // Keep inputs for now, will be overwritten

      setActiveSessionId(sessionToLoad.id);
      setCurrentSymptomsInput(sessionToLoad.currentSymptoms);
      setCurrentImageDataUri(sessionToLoad.currentImageDataUri);
      setAiResponse(sessionToLoad.aiResponse);
      setVisualFollowUpResult(sessionToLoad.visualFollowUpResult);
      setChatMessages(sessionToLoad.chatMessages.map(m => ({ ...m, timestamp: new Date(m.timestamp) }))); // Rehydrate dates
      setSymptomsForDoctorSearch(sessionToLoad.currentSymptoms); // For DoctorMapSection context

      const mapVisibleInSession = sessionToLoad.isDoctorMapSectionVisible || false;
      setIsDoctorMapSectionVisible(mapVisibleInSession);

      if (mapVisibleInSession) {
        if (sessionToLoad.sessionUserLocation) {
          setUserLocation(sessionToLoad.sessionUserLocation); // Use stored location for the map
          setIsDefaultLocationUsed(false); // Assuming stored location is not the default unless it was
        } else {
          // If map was visible but no location stored (older session), fetch current
          await fetchUserLocation(true, sessionToLoad.id);
        }
      } else {
        setUserLocation(null); // Ensure map location is cleared if not visible in session
        setIsDefaultLocationUsed(false);
      }

      toast({ title: "Chat Loaded", description: `Switched to chat: ${getSessionTitle(sessionToLoad)}` });
    } else {
      toast({ title: "Error", description: "Could not load the selected chat session.", variant: "destructive" });
    }
  };

  const deleteSession = (sessionId: string) => {
    setChatSessions(prevSessions => prevSessions.filter(s => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      startNewSession(); // If active session is deleted, start a new one
    }
    toast({ title: "Chat Deleted", description: "The chat session has been removed." });
  };

  const handleSymptomSubmit = async (data: SymptomFormData) => {
    resetCurrentInteractionState(true); // Keep symptom input for now
    setIsLoadingAI(true);
    setCurrentSymptomsInput(data.symptoms); // Update current input state
    setSymptomsForDoctorSearch(data.symptoms); // For DoctorMapSection

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
        setCurrentImageDataUri(processedImageDataUri);
      } catch (error) {
        toast({ title: 'Image Error', description: (error as Error).message || 'Could not process image.', variant: 'destructive'});
        processedImageDataUri = undefined; // Ensure it's undefined on error
        setCurrentImageDataUri(undefined);
      }
    } else {
      setCurrentImageDataUri(undefined); // Clear if no image submitted
    }

    const newSessionId = `session_${Date.now()}`;
    const initialSessionObject: ChatSession = {
      id: newSessionId,
      timestamp: new Date().toISOString(),
      currentSymptoms: data.symptoms,
      currentImageDataUri: processedImageDataUri,
      aiResponse: null, // AI response will be filled after the call
      visualFollowUpResult: null,
      chatMessages: [],
      isDoctorMapSectionVisible: false,
      sessionUserLocation: null,
      title: getSessionTitle({ currentSymptoms: data.symptoms, timestamp: new Date().toISOString() })
    };

    // Add new session immediately, set it active
    setChatSessions(prevSessions => [initialSessionObject, ...prevSessions.filter(s => s.id !== newSessionId)].slice(0, 19)); // Limit to 20 sessions
    setActiveSessionId(newSessionId);
    // Clear previous AI display states for the new session context
    setAiResponse(null);
    setVisualFollowUpResult(null);
    setChatMessages([]);


    try {
      const response = await getAIResponse(data.symptoms, processedImageDataUri);

      const finalSessionObject: ChatSession = {
        ...initialSessionObject, // Use the same ID and initial data
        aiResponse: response,
        title: getSessionTitle({ currentSymptoms: data.symptoms, aiResponse: response, timestamp: initialSessionObject.timestamp })
      };

      setAiResponse(response); // Update current display state
      // Update the session in chatSessions array with the full AI response
      setChatSessions(prev =>
        prev.map(s =>
          s.id === newSessionId ? finalSessionObject : s
        )
      );

    } catch (error) {
      toast({ title: 'AI Analysis Error', description: (error as Error).message || 'Failed to get AI response.', variant: 'destructive'});
      setAiResponse(null); // Clear AI response on error for current display
      // Update session in array to reflect error (e.g., aiResponse remains null or set explicitly)
      setChatSessions(prev =>
        prev.map(s =>
          s.id === newSessionId ? {...s, aiResponse: null} : s // Ensure aiResponse is null in stored session too
        )
      );
    } finally {
      setIsLoadingAI(false);
    }
  };

  const fetchUserLocation = async (isForLoadedSessionContext = false, sessionIdForUpdate?: string) => {
    const targetSessionId = sessionIdForUpdate || activeSessionId;
    if (!targetSessionId && !isForLoadedSessionContext) {
        // This can happen if user clicks map button before any session exists.
        // Or if a loaded session didn't have map visible and this is called directly.
        // Consider if we need a toast or different handling here.
        // For now, it will proceed but might not save to a session if targetSessionId is null.
        console.warn("fetchUserLocation called without active session ID and not for loaded session context.");
    }

    setIsLocatingDoctorsMap(true);
    setIsDefaultLocationUsed(false);
    let fetchedLocation: UserLocation | null = null;
    try {
      fetchedLocation = await fetchUserLocationUtil();
      setUserLocation(fetchedLocation); // Update main state for map
      if (targetSessionId) { // If there's a session to associate this location with
         updateActiveSession(session => ({
          ...session,
          sessionUserLocation: fetchedLocation, // Save to the *active* session being worked on
        }));
      }
    } catch (error) {
      fetchedLocation = DEFAULT_MELBOURNE_LOCATION; // Fallback
      setUserLocation(fetchedLocation);
      setIsDefaultLocationUsed(true);
      if (targetSessionId) { // Also save fallback to session
        updateActiveSession(session => ({
          ...session,
          sessionUserLocation: fetchedLocation, // Save default to session
        }));
      }
      toast({
        title: 'Location Error',
        description: `${(error as Error).message || 'Could not fetch your location.'} Showing results for Melbourne.`,
        variant: 'destructive',
      });
    } finally {
      setIsLocatingDoctorsMap(false);
      return fetchedLocation; // Return for immediate use if needed
    }
  };

  const handleLocateDoctors = async () => {
    if (!activeSessionId) {
        toast({ title: "No Active Chat", description: "Please start a new chat or load one before finding doctors.", variant: "destructive"});
        return;
    }
    const location = await fetchUserLocation(false, activeSessionId); // Pass activeSessionId to save to it
    if (location) { // Location (real or default) was obtained
      setIsDoctorMapSectionVisible(true);
      updateActiveSession(session => ({
        ...session,
        isDoctorMapSectionVisible: true,
        // sessionUserLocation is already set by fetchUserLocation if activeSessionId was passed
      }));
    }
    // No else needed, fetchUserLocation handles errors/defaults
  };

  const handleRefreshMapAndLocation = async () => {
    if (!activeSessionId) {
      toast({ title: "No Active Chat", description: "Cannot refresh map without an active chat.", variant: "destructive" });
      return;
    }
    setIsRefreshingLocation(true);
    const currentFetchedLocation = await fetchUserLocationUtil(); // This fetches fresh location
    setUserLocation(currentFetchedLocation); // Update display
    updateActiveSession(session => ({ // Update active session's stored location
      ...session,
      sessionUserLocation: currentFetchedLocation, // Save newly fetched location to current session
    }));
    setIsRefreshingLocation(false);
    toast({ title: "Map Refreshed", description: "Map updated to your current location." });
  };


  const handleVisualChoiceSelected = async (selectedCondition: string) => {
    const activeSession = chatSessions.find(s => s.id === activeSessionId);
    if (!activeSession || !activeSession.currentSymptoms) { // Check activeSession directly
      toast({ title: 'Error', description: 'Active session or original symptoms not found.', variant: 'destructive' });
      return;
    }
    setIsLoadingVisualFollowUp(true);
    setVisualFollowUpResult(null); // Clear previous visual result for UI
    try {
      const result = await refineDiagnosisWithVisual({
        selectedCondition,
        originalSymptoms: activeSession.currentSymptoms, // Use from activeSession
      });
      setVisualFollowUpResult(result); // Update current display state

      const aiMessageForChat: ChatMessage = {
        id: Date.now().toString() + 'refined',
        role: 'ai',
        text: `Okay, focusing on ${selectedCondition}. Here's some refined advice: ${result.refinedAdvice}${result.confidence ? ` (Confidence: ${result.confidence})` : ''}`,
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, aiMessageForChat]); // Update current chat display
      updateActiveSession(session => ({ // Save to active session
        ...session,
        visualFollowUpResult: result,
        chatMessages: [...(session.chatMessages || []), aiMessageForChat],
      }));

    } catch (error) {
      toast({ title: 'Refined AI Analysis Error', description: (error as Error).message || 'Failed to get refined AI response.', variant: 'destructive' });
    } finally {
      setIsLoadingVisualFollowUp(false);
    }
  };

  const handleSendChatMessage = async (userMessageText: string) => {
    const activeSession = chatSessions.find(s => s.id === activeSessionId);
    if (!activeSession || !activeSession.aiResponse || !activeSession.currentSymptoms) {
      toast({ title: 'Error', description: 'Initial AI analysis or session context is not available for follow-up.', variant: 'destructive' });
      return;
    }
    if (!userMessageText.trim()) {
      toast({ title: 'Empty Message', description: 'Please type your message.', variant: 'destructive' });
      return;
    }

    const newUserMessage: ChatMessage = { id: Date.now().toString(), role: 'user', text: userMessageText, timestamp: new Date() };
    setChatMessages(prev => [...prev, newUserMessage]); // Update current chat display
    setIsLoadingChatResponse(true);

    updateActiveSession(session => ({ // Save user message to active session
      ...session,
      chatMessages: [...(session.chatMessages || []), newUserMessage],
    }));

    try {
      const clarificationResult: ClarificationOutput = await getAIFollowUpResponse({
        originalSymptoms: activeSession.currentSymptoms,
        imageDataUri: activeSession.currentImageDataUri,
        currentSeverityAssessment: activeSession.aiResponse.severityAssessment, // Ensured by check above
        currentPotentialConditions: activeSession.aiResponse.potentialConditions, // Ensured by check above
        userQuestion: userMessageText,
      });

      const aiChatMessage: ChatMessage = { id: Date.now().toString() + 'ai', role: 'ai', text: clarificationResult.clarificationText, timestamp: new Date() };
      setChatMessages(prev => [...prev, aiChatMessage]); // Update current chat display

      let updatedAiResponseForSession = activeSession.aiResponse;
      if (clarificationResult.updatedSeverityAssessment || clarificationResult.updatedPotentialConditions) {
        updatedAiResponseForSession = {
          ...(activeSession.aiResponse!), // aiResponse is guaranteed to be non-null here
          severityAssessment: clarificationResult.updatedSeverityAssessment || activeSession.aiResponse!.severityAssessment,
          potentialConditions: clarificationResult.updatedPotentialConditions || activeSession.aiResponse!.potentialConditions,
          // doctorSpecialtySuggestion remains from initial assessment for now
          doctorSpecialtySuggestion: activeSession.aiResponse!.doctorSpecialtySuggestion
        };
        setAiResponse(updatedAiResponseForSession); // Update main display state
        toast({ title: "AI Insights Updated", description: "The AI has updated its assessment based on your chat." });
      }

      updateActiveSession(session => ({ // Save AI message and potentially updated AIResponse to active session
        ...session,
        aiResponse: updatedAiResponseForSession, // Save the potentially updated AI response
        chatMessages: [...(session.chatMessages || []), aiChatMessage], // Ensure user message is already there
      }));

    } catch (error) {
      const errorMessage = (error as Error).message || 'Failed to get AI follow-up response.';
      toast({ title: 'Chat Error', description: errorMessage, variant: 'destructive' });
      const errorAiMessage: ChatMessage = { id: Date.now().toString() + 'aiError', role: 'ai', text: `Sorry, I encountered an error: ${errorMessage}`, timestamp: new Date() };
      setChatMessages(prev => [...prev, errorAiMessage]); // Update current chat display

      updateActiveSession(session => ({ // Save error message to active session
        ...session,
        chatMessages: [...(session.chatMessages || []), errorAiMessage],
      }));
    } finally {
      setIsLoadingChatResponse(false);
    }
  };

  const chatHistoryTrigger = (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setIsHistoryPanelOpen(true)}
      aria-label="View chat history"
      className="bg-accent text-accent-foreground hover:bg-accent/90" // Ensure styling matches other header buttons
    >
      <PanelLeft className="h-5 w-5" />
    </Button>
  );

  // Determine if chat context is available for the FollowUpSection
  // Based on the currently displayed `aiResponse` and `currentSymptomsInput` which reflect active session or new input
  const isChatContextAvailable = !!(aiResponse && currentSymptomsInput.trim());


  return (
    <AppShell headerLeftAction={chatHistoryTrigger}>
      <div className="flex flex-col items-center w-full space-y-6">
        <ChatHistoryPanel
          isOpen={isHistoryPanelOpen}
          onOpenChange={setIsHistoryPanelOpen}
          sessions={chatSessions}
          activeSessionId={activeSessionId}
          onLoadSession={loadSession}
          onStartNewSession={startNewSession}
          onDeleteSession={deleteSession}
        />

        <SymptomForm onSubmit={handleSymptomSubmit} isLoading={isLoadingAI} currentSymptoms={currentSymptomsInput} />

        {(isLoadingAI && !aiResponse) && ( // Show loading only if no aiResponse yet for current interaction
          <div className="mt-8 text-center">
            <LoadingSpinner size={48} />
            <p className="text-muted-foreground mt-2">Analyzing your symptoms...</p>
          </div>
        )}

        {currentImageDataUri && !isLoadingAI && ( // Display image if available for the current context (new or loaded)
          <div className="w-full max-w-md mx-auto my-4 p-2 border rounded-lg shadow-md bg-card">
            <h3 className="text-sm font-medium text-card-foreground mb-2 text-center">Symptom Image Provided:</h3>
            <Image
              src={currentImageDataUri}
              alt="Uploaded symptom image"
              width={400}
              height={300}
              className="rounded-md object-contain max-h-[300px] w-auto mx-auto"
            />
          </div>
        )}

        {aiResponse && !isLoadingAI && ( // Main content area, shown if AI response available for current interaction
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
             {isLoadingVisualFollowUp && (
                <div className="mt-4 text-center">
                    <LoadingSpinner size={32} />
                    <p className="text-muted-foreground mt-2">Getting refined advice...</p>
                </div>
            )}

            {visualFollowUpResult && !isLoadingVisualFollowUp && (
              <RefinedDiagnosisDisplay result={visualFollowUpResult} />
            )}

            <FollowUpSection
              chatMessages={chatMessages} // Display chat messages from current interaction
              onSendMessage={handleSendChatMessage}
              isLoading={isLoadingChatResponse}
              isContextAvailable={isChatContextAvailable} // Controls chat input usability
            />

            <DoctorMapSection
              userLocation={userLocation} // From current interaction's map state
              onLocateDoctors={handleLocateDoctors}
              onRefreshLocation={handleRefreshMapAndLocation}
              isLocatingDoctors={isLocatingDoctorsMap}
              isRefreshingLocation={isRefreshingLocation}
              symptoms={symptomsForDoctorSearch} // From current interaction
              isDefaultLocationUsed={isDefaultLocationUsed}
              aiSuggestedSpecialty={aiResponse.doctorSpecialtySuggestion} // From current AI response
              isVisible={isDoctorMapSectionVisible} // From current interaction's map state
            />
          </div>
        )}
        {!activeSessionId && !isLoadingAI && !aiResponse && ( // Welcome message if no active session AND no AI analysis process ongoing
          <div className="mt-12 text-center text-muted-foreground">
            <p className="text-lg">Welcome to HealthAssist AI!</p>
            <p>Please describe your symptoms in the form above to get started, or load a previous chat from the history.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}

