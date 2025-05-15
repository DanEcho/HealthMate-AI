
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
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
const MAX_CHAT_SESSIONS = 20;


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

  const [isUpdateOrNewDialogVisible, setIsUpdateOrNewDialogVisible] = useState(false);
  const [pendingSymptomData, setPendingSymptomData] = useState<SymptomFormData | null>(null);


  const { toast } = useToast();

  useEffect(() => {
    try {
      const storedSessions = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedSessions) {
        const parsedSessions: ChatSession[] = JSON.parse(storedSessions);
        setChatSessions(parsedSessions);
        if (parsedSessions.length > 0 && !activeSessionId) {
          // Optionally auto-load the most recent session, or leave it to manual load
        }
      }
    } catch (error) {
      console.error("Failed to load chat sessions from localStorage:", error);
      toast({ title: "Error", description: "Could not load previous chat sessions.", variant: "destructive" });
    }
  }, [toast, activeSessionId]);

  useEffect(() => {
    if (chatSessions.length > 0 || localStorage.getItem(LOCAL_STORAGE_KEY) !== null) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(chatSessions));
      } catch (error) {
        console.error("Failed to save chat sessions to localStorage:", error);
         toast({ title: "Storage Warning", description: "Could not save all session data. Images might be too large, or storage is full.", variant: "destructive" });
      }
    }
  }, [chatSessions, toast]);


  const updateActiveSessionInStorage = useCallback((updater: (session: ChatSession) => ChatSession) => {
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
    // userLocation and isDefaultLocationUsed are preserved for app persistence
    // but reset for a *truly new* session via startNewSession
    
    setIsLoadingAI(false);
    setIsLoadingVisualFollowUp(false);
    setIsLoadingChatResponse(false);
  };
  
  const getSessionTitleForDisplay = (session: Partial<ChatSession>): string => {
    if (session.title) return session.title;
    if (session.currentSymptoms && session.currentSymptoms.trim().length > 0) {
      const title = session.currentSymptoms.substring(0, 35);
      return title.length < session.currentSymptoms.length ? title + '...' : title;
    }
    return session.timestamp ? `Chat from ${new Date(session.timestamp).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : 'New Chat';
  };

  const startNewSession = useCallback(() => {
    resetCurrentInteractionState(); 
    setActiveSessionId(null); 
    // Reset map related states for a truly new session
    setUserLocation(null);
    setIsDefaultLocationUsed(false);
    setIsDoctorMapSectionVisible(false);
    toast({ title: "New Chat Started", description: "Please enter your symptoms." });
  }, [toast]); // Dependencies can be added if it uses other state setters from AppLayoutClient

  const fetchUserLocationForSession = async (sessionIdToUpdate?: string): Promise<UserLocation | null> => {
    const targetSessionId = sessionIdToUpdate || activeSessionId;
    
    setIsLocatingDoctorsMap(true); 
    setIsDefaultLocationUsed(false);
    let fetchedLocation: UserLocation | null = null;
    try {
      fetchedLocation = await fetchUserLocationUtil();
      setUserLocation(fetchedLocation); // Update main UI
      if (targetSessionId) { // Also save to session if a session context exists
        updateActiveSessionInStorage(session => ({
          ...session,
          sessionUserLocation: fetchedLocation,
          isDoctorMapSectionVisible: true, // This implies map should be visible
        }));
      }
    } catch (error) {
      fetchedLocation = DEFAULT_MELBOURNE_LOCATION;
      setUserLocation(fetchedLocation); // Update main UI
      setIsDefaultLocationUsed(true);
      if (targetSessionId) { // Also save to session if a session context exists
        updateActiveSessionInStorage(session => ({
          ...session,
          sessionUserLocation: fetchedLocation,
          isDoctorMapSectionVisible: true, // This implies map should be visible
        }));
      }
      toast({
        title: 'Location Error',
        description: `${(error as Error).message || 'Could not fetch your location.'} Showing results for Melbourne.`,
        variant: 'destructive',
      });
    } finally {
      setIsLocatingDoctorsMap(false);
    }
    return fetchedLocation;
  };


  const loadSession = async (sessionId: string) => {
    const sessionToLoad = chatSessions.find(s => s.id === sessionId);
    if (sessionToLoad) {
      setActiveSessionId(sessionToLoad.id);
      setCurrentSymptomsInput(sessionToLoad.currentSymptoms);
      setSymptomsForDoctorSearch(sessionToLoad.currentSymptoms); // For doctor search context
      setCurrentImageDataUri(sessionToLoad.currentImageDataUri);
      setAiResponse(sessionToLoad.aiResponse);
      setVisualFollowUpResult(sessionToLoad.visualFollowUpResult);
      setChatMessages(sessionToLoad.chatMessages.map(m => ({ ...m, timestamp: new Date(m.timestamp) }))); 
      
      const mapVisibleInSession = sessionToLoad.isDoctorMapSectionVisible || false;
      setIsDoctorMapSectionVisible(mapVisibleInSession);

      if (mapVisibleInSession) {
        if (sessionToLoad.sessionUserLocation) {
          setUserLocation(sessionToLoad.sessionUserLocation); // Use location stored in session
           setIsDefaultLocationUsed(sessionToLoad.sessionUserLocation.lat === DEFAULT_MELBOURNE_LOCATION.lat && sessionToLoad.sessionUserLocation.lng === DEFAULT_MELBOURNE_LOCATION.lng);
        } else {
          // If map was visible in session but no location stored (older session), fetch current
          await fetchUserLocationForSession(sessionToLoad.id); 
        }
      } else {
        setUserLocation(null); // If map wasn't meant to be visible, clear current location
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
      startNewSession(); // If active session is deleted, start a new one
    }
    toast({ title: "Chat Deleted", description: "The chat session has been removed." });
  };

  const _processChatData = async (symptoms: string, imageDataUri?: string): Promise<FullAIResponse | null> => {
    setIsLoadingAI(true);
    let response: FullAIResponse | null = null;
    try {
      response = await getAIResponse(symptoms, imageDataUri);
    } catch (error) {
      toast({ title: 'AI Analysis Error', description: (error as Error).message || 'Failed to get AI response.', variant: 'destructive'});
    } finally {
      setIsLoadingAI(false);
    }
    return response;
  };

  const _initiateAndProcessNewChat = async (data: SymptomFormData) => {
    setCurrentSymptomsInput(data.symptoms); // Set for current view
    setSymptomsForDoctorSearch(data.symptoms); // For doctor search context

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
        } catch (error) {
            toast({ title: 'Image Error', description: (error as Error).message || 'Could not process image.', variant: 'destructive'});
            // Keep processedImageDataUri as undefined
        }
    }
    setCurrentImageDataUri(processedImageDataUri); // Set for current view

    // Reset follow-ups for a new analysis
    setVisualFollowUpResult(null);
    setChatMessages([]);

    const newAIResponse = await _processChatData(data.symptoms, processedImageDataUri);
    
    if (!newAIResponse) { // If AI processing failed (e.g. empty symptoms caught by getAIResponse, or other errors)
        // Toast for error already shown by _processChatData or getAIResponse
        setIsLoadingAI(false); // Ensure loading state is reset
        return; // Do not proceed to create/save session
    }
    setAiResponse(newAIResponse); // Update main AI response state for UI

    const newSessionId = `session_${Date.now()}`;
    const initialTimestamp = new Date().toISOString();
    
    let baseTitle = '';
    if (data.symptoms && data.symptoms.trim().length > 0) {
      const firstPart = data.symptoms.substring(0, 35);
      baseTitle = firstPart.length < data.symptoms.length ? firstPart + '...' : firstPart;
    } else { // Should not happen if symptom check is done before calling this
      baseTitle = `Chat from ${new Date(initialTimestamp).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
    }
    
    let sessionTitle = baseTitle;
    let titleCounter = 1;
    const currentSessionsForTitleCheck = [...chatSessions]; 
    while (currentSessionsForTitleCheck.some(s => s.title === sessionTitle)) {
      sessionTitle = `${baseTitle} (${titleCounter})`;
      titleCounter++;
    }
    
    const newSession: ChatSession = {
      id: newSessionId,
      timestamp: initialTimestamp,
      title: sessionTitle,
      currentSymptoms: data.symptoms,
      currentImageDataUri: processedImageDataUri,
      aiResponse: newAIResponse,
      visualFollowUpResult: null, 
      chatMessages: [], 
      isDoctorMapSectionVisible: false,
      sessionUserLocation: null, 
    };

    setChatSessions(prevSessions => [newSession, ...prevSessions.slice(0, MAX_CHAT_SESSIONS -1)]);
    setActiveSessionId(newSessionId);
    
    // Reset map visibility for this new session context
    setIsDoctorMapSectionVisible(false);
    setUserLocation(null);
    setIsDefaultLocationUsed(false);

    toast({ title: "New Chat Started", description: "AI insights generated."});
  };

  const _fetchAndUpdateCurrentSession = async (data: SymptomFormData) => {
    if (!activeSessionId) return;

    setCurrentSymptomsInput(data.symptoms);
    setSymptomsForDoctorSearch(data.symptoms);

    let processedImageDataUri: string | undefined = currentImageDataUri; 
    if (data.image && data.image.length > 0) {
        const file = data.image[0];
        try {
            processedImageDataUri = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = (error) => reject(new Error('Failed to read image file: ' + error));
                reader.readAsDataURL(file);
            });
        } catch (error) {
            toast({ title: 'Image Error', description: (error as Error).message || 'Could not process image.', variant: 'destructive'});
        }
    } else if (data.image === undefined) { 
        processedImageDataUri = undefined;
    }
    setCurrentImageDataUri(processedImageDataUri);

    setVisualFollowUpResult(null);
    setChatMessages([]); // Reset chat for re-analysis

    const newAIResponse = await _processChatData(data.symptoms, processedImageDataUri);
    setAiResponse(newAIResponse); // Update main UI state

    setChatSessions(prevSessions =>
        prevSessions.map(session => {
            if (session.id === activeSessionId) {
                return {
                    ...session,
                    currentSymptoms: data.symptoms,
                    currentImageDataUri: processedImageDataUri,
                    aiResponse: newAIResponse, 
                    visualFollowUpResult: null, 
                    chatMessages: [], 
                    timestamp: new Date().toISOString(), 
                    // isDoctorMapSectionVisible and sessionUserLocation are preserved
                };
            }
            return session;
        })
    );
    toast({ title: "Chat Updated", description: "Current chat insights have been refreshed."});
  };


  const handleSymptomSubmit = async (data: SymptomFormData) => {
    if (activeSessionId) {
        if (!data.symptoms.trim() && (!data.image || data.image.length === 0)) {
            toast({ title: "Empty Input", description: "Please provide symptoms or an image to update the chat.", variant: "destructive" });
            return;
        }
        setPendingSymptomData(data);
        setIsUpdateOrNewDialogVisible(true);
    } else {
        if (!data.symptoms.trim() && (!data.image || data.image.length === 0)) {
            toast({ title: "Empty Input", description: "Please enter your symptoms or provide an image to start a new chat.", variant: "destructive" });
            return;
        }
        await _initiateAndProcessNewChat(data);
    }
  };

  const handleConfirmUpdateCurrent = async () => {
    if (pendingSymptomData) {
        await _fetchAndUpdateCurrentSession(pendingSymptomData);
    }
    setIsUpdateOrNewDialogVisible(false);
    setPendingSymptomData(null);
  };

  const handleConfirmStartNewFromDialog = async () => {
    if (pendingSymptomData) {
        if (!pendingSymptomData.symptoms.trim() && (!pendingSymptomData.image || pendingSymptomData.image.length === 0)) {
            toast({ title: "Empty Input", description: "Please enter your symptoms or provide an image to start a new chat.", variant: "destructive" });
            setIsUpdateOrNewDialogVisible(false);
            setPendingSymptomData(null);
            return;
        }
        startNewSession(); 
        await new Promise(resolve => setTimeout(resolve, 0)); 
        await _initiateAndProcessNewChat(pendingSymptomData);
    }
    setIsUpdateOrNewDialogVisible(false);
    setPendingSymptomData(null);
  };
  
  const handleLocateDoctors = async () => {
    if (!activeSessionId) {
        toast({ title: "No Active Chat", description: "Please start or load a chat before finding doctors.", variant: "destructive"});
        return;
    }
    const location = await fetchUserLocationForSession(activeSessionId);
    if (location) {
      setIsDoctorMapSectionVisible(true); 
      // updateActiveSessionInStorage for sessionUserLocation and isDoctorMapSectionVisible already handled
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
    updateActiveSessionInStorage(session => ({ 
      ...session,
      sessionUserLocation: currentFetchedLocation,
      isDoctorMapSectionVisible: true, 
    }));
    setIsRefreshingLocation(false);
    toast({ title: "Map Refreshed", description: "Map updated to your current location." });
  };

  const handleVisualChoiceSelected = async (selectedCondition: string) => {
    const activeSess = chatSessions.find(s => s.id === activeSessionId);
    if (!activeSess || !activeSess.currentSymptoms) {
      toast({ title: 'Error', description: 'Active session or original symptoms not found for visual follow-up.', variant: 'destructive' });
      return;
    }
    setIsLoadingVisualFollowUp(true);
    setVisualFollowUpResult(null); 
    try {
      const result = await refineDiagnosisWithVisual({
        selectedCondition,
        originalSymptoms: activeSess.currentSymptoms,
      });
      setVisualFollowUpResult(result); 

      const aiMessageForChat: ChatMessage = {
        id: Date.now().toString() + 'refined',
        role: 'ai',
        text: `Okay, focusing on ${selectedCondition}. Here's some refined advice: ${result.refinedAdvice}${result.confidence ? ` (Confidence: ${result.confidence})` : ''}`,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, aiMessageForChat]); 
      
      updateActiveSessionInStorage(session => ({ 
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
    const activeSess = chatSessions.find(s => s.id === activeSessionId); 
    if (!activeSess || !activeSess.aiResponse || !activeSess.currentSymptoms) {
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

    updateActiveSessionInStorage(session => ({
      ...session,
      chatMessages: [...(session.chatMessages || []), newUserMessage],
    }));

    try {
      const clarificationResult: ClarificationOutput = await getAIFollowUpResponse({
        originalSymptoms: activeSess.currentSymptoms,
        imageDataUri: activeSess.currentImageDataUri,
        currentSeverityAssessment: activeSess.aiResponse.severityAssessment, 
        currentPotentialConditions: activeSess.aiResponse.potentialConditions, 
        userQuestion: userMessageText,
      });

      const aiChatMessage: ChatMessage = { id: Date.now().toString() + 'ai', role: 'ai', text: clarificationResult.clarificationText, timestamp: new Date() };
      setChatMessages(prev => [...prev, aiChatMessage]); 

      let updatedAiResponseForSession = activeSess.aiResponse;
      if (clarificationResult.updatedSeverityAssessment || clarificationResult.updatedPotentialConditions) {
        updatedAiResponseForSession = {
          ...(activeSess.aiResponse!), 
          severityAssessment: clarificationResult.updatedSeverityAssessment || activeSess.aiResponse!.severityAssessment,
          potentialConditions: clarificationResult.updatedPotentialConditions || activeSess.aiResponse!.potentialConditions,
          doctorSpecialtySuggestion: activeSess.aiResponse!.doctorSpecialtySuggestion 
        };
        setAiResponse(updatedAiResponseForSession); 
        toast({ title: "AI Insights Updated", description: "The AI has updated its assessment based on your chat." });
      }
      
      updateActiveSessionInStorage(session => ({
        ...session,
        aiResponse: updatedAiResponseForSession, 
        chatMessages: [...(session.chatMessages || []), aiChatMessage], 
      }));

    } catch (error) {
      const errorMessage = (error as Error).message || 'Failed to get AI follow-up response.';
      toast({ title: 'Chat Error', description: errorMessage, variant: 'destructive' });
      const errorAiMessage: ChatMessage = { id: Date.now().toString() + 'aiError', role: 'ai', text: `Sorry, I encountered an error: ${errorMessage}`, timestamp: new Date() };
      setChatMessages(prev => [...prev, errorAiMessage]); 
      
      updateActiveSessionInStorage(session => ({
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

  const activeSessionForChatContext = chatSessions.find(s => s.id === activeSessionId);
  const isChatContextAvailable = !!(activeSessionForChatContext && activeSessionForChatContext.aiResponse && activeSessionForChatContext.currentSymptoms.trim());


  return (
    <AppShell headerLeftAction={chatHistoryTrigger} onNavigateHome={startNewSession}>
      <AlertDialog open={isUpdateOrNewDialogVisible} onOpenChange={setIsUpdateOrNewDialogVisible}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update or Start New Chat?</AlertDialogTitle>
            <AlertDialogDescription>
              You have an existing chat loaded. Do you want to update it with the new symptoms/image,
              or start a completely new chat session?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingSymptomData(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmStartNewFromDialog} className="bg-slate-100 text-slate-900 hover:bg-slate-200 focus-visible:ring-slate-500 ring-offset-background">Start as New Chat</AlertDialogAction>
            <AlertDialogAction onClick={handleConfirmUpdateCurrent}>Update Current Chat</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

        {(isLoadingAI && !aiResponse && !activeSessionId) && ( 
          <div className="mt-8 text-center">
            <LoadingSpinner size={48} />
            <p className="text-muted-foreground mt-2">Analyzing your symptoms...</p>
          </div>
        )}

        {currentImageDataUri && ( 
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

        {aiResponse && ( 
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

