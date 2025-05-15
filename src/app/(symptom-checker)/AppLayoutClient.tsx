
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
  title?: string; // Will now be ensured to be unique
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
    setSymptomsForDoctorSearch(keepSymptomsAndImage ? currentSymptomsInput : undefined);
    setIsDoctorMapSectionVisible(false);
    setUserLocation(null);
    setIsDefaultLocationUsed(false);

    setIsLoadingAI(false);
    setIsLoadingVisualFollowUp(false);
    setIsLoadingChatResponse(false);
    setIsLocatingDoctorsMap(false);
    setIsRefreshingLocation(false);
  };

  const getSessionTitleForDisplay = (session: Partial<ChatSession>): string => {
    if (session.title) return session.title; // This should be the primary source
    if (session.currentSymptoms && session.currentSymptoms.trim().length > 0) {
      const title = session.currentSymptoms.substring(0, 35);
      return title.length < session.currentSymptoms.length ? title + '...' : title;
    }
    // Consistent timestamp format for fallback
    return session.timestamp ? `Chat from ${new Date(session.timestamp).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : 'New Chat';
  };

  const startNewSession = () => {
    resetCurrentInteractionState();
    setActiveSessionId(null);
    toast({ title: "New Chat Started", description: "Please enter your symptoms." });
  };

  const loadSession = async (sessionId: string) => {
    const sessionToLoad = chatSessions.find(s => s.id === sessionId);
    if (sessionToLoad) {
      resetCurrentInteractionState(true); 

      setActiveSessionId(sessionToLoad.id);
      setCurrentSymptomsInput(sessionToLoad.currentSymptoms);
      setCurrentImageDataUri(sessionToLoad.currentImageDataUri);
      setAiResponse(sessionToLoad.aiResponse);
      setVisualFollowUpResult(sessionToLoad.visualFollowUpResult);
      setChatMessages(sessionToLoad.chatMessages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })));
      setSymptomsForDoctorSearch(sessionToLoad.currentSymptoms);

      const mapVisibleInSession = sessionToLoad.isDoctorMapSectionVisible || false;
      setIsDoctorMapSectionVisible(mapVisibleInSession);

      if (mapVisibleInSession) {
        if (sessionToLoad.sessionUserLocation) {
          setUserLocation(sessionToLoad.sessionUserLocation);
          setIsDefaultLocationUsed(false); 
        } else {
          await fetchUserLocation(true, sessionToLoad.id);
        }
      } else {
        setUserLocation(null);
        setIsDefaultLocationUsed(false);
      }

      toast({ title: "Chat Loaded", description: `Switched to chat: ${getSessionTitleForDisplay(sessionToLoad)}` });
    } else {
      toast({ title: "Error", description: "Could not load the selected chat session.", variant: "destructive" });
    }
  };

  const deleteSession = (sessionId: string) => {
    setChatSessions(prevSessions => prevSessions.filter(s => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      startNewSession();
    }
    toast({ title: "Chat Deleted", description: "The chat session has been removed." });
  };

  const handleSymptomSubmit = async (data: SymptomFormData) => {
    resetCurrentInteractionState(true);
    setIsLoadingAI(true);
    setCurrentSymptomsInput(data.symptoms);
    setSymptomsForDoctorSearch(data.symptoms);

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
        processedImageDataUri = undefined;
        setCurrentImageDataUri(undefined);
      }
    } else {
      setCurrentImageDataUri(undefined);
    }

    // --- Generate Unique Title ---
    let baseTitle = '';
    if (data.symptoms && data.symptoms.trim().length > 0) {
      const firstPart = data.symptoms.substring(0, 35);
      baseTitle = firstPart.length < data.symptoms.length ? firstPart + '...' : firstPart;
    } else {
      baseTitle = `Chat from ${new Date().toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
    }

    let sessionTitle = baseTitle;
    let counter = 1;
    // Check against current chatSessions state
    const currentSessions = chatSessions; // Capture current state
    while (currentSessions.some(s => s.title === sessionTitle)) {
      sessionTitle = `${baseTitle} (${counter})`;
      counter++;
    }
    // --- End Generate Unique Title ---

    const newSessionId = `session_${Date.now()}`;
    const initialTimestamp = new Date().toISOString();

    const initialSessionObject: ChatSession = {
      id: newSessionId,
      timestamp: initialTimestamp,
      currentSymptoms: data.symptoms,
      currentImageDataUri: processedImageDataUri,
      aiResponse: null,
      visualFollowUpResult: null,
      chatMessages: [],
      isDoctorMapSectionVisible: false,
      sessionUserLocation: null,
      title: sessionTitle, // Use the generated unique title
    };

    setChatSessions(prevSessions => [initialSessionObject, ...prevSessions.filter(s => s.id !== newSessionId)].slice(0, 19));
    setActiveSessionId(newSessionId);
    setAiResponse(null);
    setVisualFollowUpResult(null);
    setChatMessages([]);

    try {
      const response = await getAIResponse(data.symptoms, processedImageDataUri);
      const finalSessionObject: ChatSession = {
        ...initialSessionObject, // This includes the unique title
        aiResponse: response,
      };
      setAiResponse(response);
      setChatSessions(prev =>
        prev.map(s =>
          s.id === newSessionId ? finalSessionObject : s
        )
      );
    } catch (error) {
      toast({ title: 'AI Analysis Error', description: (error as Error).message || 'Failed to get AI response.', variant: 'destructive'});
      setAiResponse(null);
      setChatSessions(prev =>
        prev.map(s =>
          s.id === newSessionId ? {...s, aiResponse: null} : s
        )
      );
    } finally {
      setIsLoadingAI(false);
    }
  };

  const fetchUserLocation = async (isForLoadedSessionContext = false, sessionIdForUpdate?: string) => {
    const targetSessionId = sessionIdForUpdate || activeSessionId;
    // if (!targetSessionId && !isForLoadedSessionContext) {
    //   console.warn("fetchUserLocation called without active session ID and not for loaded session context.");
    // }

    setIsLocatingDoctorsMap(true);
    setIsDefaultLocationUsed(false);
    let fetchedLocation: UserLocation | null = null;
    try {
      fetchedLocation = await fetchUserLocationUtil();
      setUserLocation(fetchedLocation);
      if (targetSessionId) {
         updateActiveSession(session => ({
          ...session,
          sessionUserLocation: fetchedLocation,
        }));
      }
    } catch (error) {
      fetchedLocation = DEFAULT_MELBOURNE_LOCATION;
      setUserLocation(fetchedLocation);
      setIsDefaultLocationUsed(true);
      if (targetSessionId) {
        updateActiveSession(session => ({
          ...session,
          sessionUserLocation: fetchedLocation,
        }));
      }
      toast({
        title: 'Location Error',
        description: `${(error as Error).message || 'Could not fetch your location.'} Showing results for Melbourne.`,
        variant: 'destructive',
      });
    } finally {
      setIsLocatingDoctorsMap(false);
      return fetchedLocation;
    }
  };

  const handleLocateDoctors = async () => {
    if (!activeSessionId) {
        toast({ title: "No Active Chat", description: "Please start a new chat or load one before finding doctors.", variant: "destructive"});
        return;
    }
    const location = await fetchUserLocation(false, activeSessionId);
    if (location) {
      setIsDoctorMapSectionVisible(true);
      updateActiveSession(session => ({
        ...session,
        isDoctorMapSectionVisible: true,
      }));
    }
  };

  const handleRefreshMapAndLocation = async () => {
    if (!activeSessionId) {
      toast({ title: "No Active Chat", description: "Cannot refresh map without an active chat.", variant: "destructive" });
      return;
    }
    setIsRefreshingLocation(true);
    const currentFetchedLocation = await fetchUserLocationUtil(); 
    setUserLocation(currentFetchedLocation); 
    updateActiveSession(session => ({
      ...session,
      sessionUserLocation: currentFetchedLocation,
    }));
    setIsRefreshingLocation(false);
    toast({ title: "Map Refreshed", description: "Map updated to your current location." });
  };


  const handleVisualChoiceSelected = async (selectedCondition: string) => {
    const activeSession = chatSessions.find(s => s.id === activeSessionId);
    if (!activeSession || !activeSession.currentSymptoms) {
      toast({ title: 'Error', description: 'Active session or original symptoms not found.', variant: 'destructive' });
      return;
    }
    setIsLoadingVisualFollowUp(true);
    setVisualFollowUpResult(null);
    try {
      const result = await refineDiagnosisWithVisual({
        selectedCondition,
        originalSymptoms: activeSession.currentSymptoms,
      });
      setVisualFollowUpResult(result);

      const aiMessageForChat: ChatMessage = {
        id: Date.now().toString() + 'refined',
        role: 'ai',
        text: `Okay, focusing on ${selectedCondition}. Here's some refined advice: ${result.refinedAdvice}${result.confidence ? ` (Confidence: ${result.confidence})` : ''}`,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, aiMessageForChat]);
      updateActiveSession(session => ({
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
    setChatMessages(prev => [...prev, newUserMessage]);
    setIsLoadingChatResponse(true);

    updateActiveSession(session => ({
      ...session,
      chatMessages: [...(session.chatMessages || []), newUserMessage],
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
      setChatMessages(prev => [...prev, aiChatMessage]);

      let updatedAiResponseForSession = activeSession.aiResponse;
      if (clarificationResult.updatedSeverityAssessment || clarificationResult.updatedPotentialConditions) {
        updatedAiResponseForSession = {
          ...(activeSession.aiResponse!),
          severityAssessment: clarificationResult.updatedSeverityAssessment || activeSession.aiResponse!.severityAssessment,
          potentialConditions: clarificationResult.updatedPotentialConditions || activeSession.aiResponse!.potentialConditions,
          doctorSpecialtySuggestion: activeSession.aiResponse!.doctorSpecialtySuggestion
        };
        setAiResponse(updatedAiResponseForSession);
        toast({ title: "AI Insights Updated", description: "The AI has updated its assessment based on your chat." });
      }

      updateActiveSession(session => ({
        ...session,
        aiResponse: updatedAiResponseForSession,
        chatMessages: [...(session.chatMessages || []), aiChatMessage],
      }));
    } catch (error) {
      const errorMessage = (error as Error).message || 'Failed to get AI follow-up response.';
      toast({ title: 'Chat Error', description: errorMessage, variant: 'destructive' });
      const errorAiMessage: ChatMessage = { id: Date.now().toString() + 'aiError', role: 'ai', text: `Sorry, I encountered an error: ${errorMessage}`, timestamp: new Date() };
      setChatMessages(prev => [...prev, errorAiMessage]);
      updateActiveSession(session => ({
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
      className="bg-accent text-accent-foreground hover:bg-accent/90"
    >
      <PanelLeft className="h-5 w-5" />
    </Button>
  );

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

        {(isLoadingAI && !aiResponse) && (
          <div className="mt-8 text-center">
            <LoadingSpinner size={48} />
            <p className="text-muted-foreground mt-2">Analyzing your symptoms...</p>
          </div>
        )}

        {currentImageDataUri && !isLoadingAI && (
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
              chatMessages={chatMessages}
              onSendMessage={handleSendChatMessage}
              isLoading={isLoadingChatResponse}
              isContextAvailable={isChatContextAvailable}
            />

            <DoctorMapSection
              userLocation={userLocation}
              onLocateDoctors={handleLocateDoctors}
              onRefreshLocation={handleRefreshMapAndLocation}
              isLocatingDoctors={isLocatingDoctorsMap}
              isRefreshingLocation={isRefreshingLocation}
              symptoms={symptomsForDoctorSearch}
              isDefaultLocationUsed={isDefaultLocationUsed}
              aiSuggestedSpecialty={aiResponse.doctorSpecialtySuggestion}
              isVisible={isDoctorMapSectionVisible}
            />
          </div>
        )}
        {!activeSessionId && !isLoadingAI && !aiResponse && (
          <div className="mt-12 text-center text-muted-foreground">
            <p className="text-lg">Welcome to HealthAssist AI!</p>
            <p>Please describe your symptoms in the form above to get started, or load a previous chat from the history.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}

