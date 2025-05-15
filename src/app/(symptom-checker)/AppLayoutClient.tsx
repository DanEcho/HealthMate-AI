
'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image'; // Added for displaying session image
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
// AssessSymptomSeverityOutput and SuggestPotentialConditionsOutput types are part of FullAIResponse
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
  currentImageDataUri?: string; // Ensure this is part of the session
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
  const [currentSymptomsInput, setCurrentSymptomsInput] = useState<string>(''); // Used for form before new session
  const [currentImageDataUri, setCurrentImageDataUri] = useState<string | undefined>(undefined); // Image for current active session

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
        const parsedSessions: ChatSession[] = JSON.parse(storedSessions);
        setChatSessions(parsedSessions);
        // Optionally, load the most recent session or a default state
        // if (parsedSessions.length > 0) {
        //   loadSession(parsedSessions[0].id); // Example: load the most recent
        // }
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
    setCurrentSymptomsInput(''); // Clear form input state
    setCurrentImageDataUri(undefined); // Clear active image URI
    setSymptomsForDoctorSearch(undefined);
    setIsLoadingAI(false);
    setIsLoadingVisualFollowUp(false);
    setIsLoadingChatResponse(false);
  };

  const startNewSession = () => {
    resetCurrentInteractionState();
    setActiveSessionId(null);
    toast({ title: "New Chat Started", description: "Please enter your symptoms." });
  };

  const loadSession = (sessionId: string) => {
    const sessionToLoad = chatSessions.find(s => s.id === sessionId);
    if (sessionToLoad) {
      setActiveSessionId(sessionToLoad.id);
      setAiResponse(sessionToLoad.aiResponse);
      setVisualFollowUpResult(sessionToLoad.visualFollowUpResult);
      setChatMessages(sessionToLoad.chatMessages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })));
      setCurrentSymptomsInput(sessionToLoad.currentSymptoms); // Set for context, form might not re-populate this directly
      setCurrentImageDataUri(sessionToLoad.currentImageDataUri); // Load image URI for the session
      setSymptomsForDoctorSearch(sessionToLoad.currentSymptoms);

      setIsLoadingAI(false);
      setIsLoadingVisualFollowUp(false);
      setIsLoadingChatResponse(false);
      toast({ title: "Chat Loaded", description: `Switched to chat: ${getSessionTitle(sessionToLoad)}` });
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

  const getSessionTitle = (session: ChatSession): string => {
    if (session.title) return session.title;
    if (session.currentSymptoms && session.currentSymptoms.trim().length > 0) {
      const title = session.currentSymptoms.substring(0, 35);
      return title.length < session.currentSymptoms.length ? title + '...' : title;
    }
    return `Chat from ${new Date(session.timestamp).toLocaleDateString()}`;
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
    resetCurrentInteractionState(); // Reset display states for a new analysis

    const newSessionId = `session_${Date.now()}`;
    setActiveSessionId(newSessionId);
    setCurrentSymptomsInput(data.symptoms); // Store for session
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
        setCurrentImageDataUri(processedImageDataUri); // Set for current active session display
        toast({ title: 'Image Processing', description: 'Image ready for analysis.' });
      } catch (error) {
        toast({
          title: 'Image Error',
          description: (error as Error).message || 'Could not process image.',
          variant: 'destructive',
        });
        // Don't halt submission if image processing fails, proceed without image
        processedImageDataUri = undefined;
        setCurrentImageDataUri(undefined);
      }
    } else {
      setCurrentImageDataUri(undefined);
    }

    const newSession: ChatSession = {
      id: newSessionId,
      timestamp: new Date().toISOString(),
      title: getSessionTitle({ currentSymptoms: data.symptoms, timestamp: new Date().toISOString(), id: newSessionId, currentImageDataUri: processedImageDataUri, aiResponse: null, visualFollowUpResult: null, chatMessages: [] }),
      currentSymptoms: data.symptoms,
      currentImageDataUri: processedImageDataUri, // Save image URI to the session
      aiResponse: null,
      visualFollowUpResult: null,
      chatMessages: [],
    };
    setChatSessions(prevSessions => [newSession, ...prevSessions.slice(0, 19)]); // Keep max 20 sessions for performance

    try {
      const response = await getAIResponse(data.symptoms, processedImageDataUri);
      setAiResponse(response);
      updateActiveSession(session => ({ ...session, aiResponse: response }));
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
    const activeSession = chatSessions.find(s => s.id === activeSessionId);
    if (!activeSession) {
      toast({ title: 'Error', description: 'Active session not found.', variant: 'destructive' });
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
    if (!activeSession || !activeSession.aiResponse) {
      toast({ title: 'Error', description: 'Initial AI analysis is not available for follow-up.', variant: 'destructive' });
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
      chatMessages: [...session.chatMessages, newUserMessage],
    }));

    try {
      const clarificationResult: ClarificationOutput = await getAIFollowUpResponse({
        originalSymptoms: activeSession.currentSymptoms,
        imageDataUri: activeSession.currentImageDataUri, // Pass image from session
        currentSeverityAssessment: activeSession.aiResponse.severityAssessment,
        currentPotentialConditions: activeSession.aiResponse.potentialConditions,
        userQuestion: userMessageText,
      });

      const aiChatMessage: ChatMessage = { id: Date.now().toString() + 'ai', role: 'ai', text: clarificationResult.clarificationText, timestamp: new Date() };
      setChatMessages(prev => [...prev, aiChatMessage]);

      let updatedAiResponse = activeSession.aiResponse;
      if (clarificationResult.updatedSeverityAssessment || clarificationResult.updatedPotentialConditions) {
        updatedAiResponse = {
          ...(activeSession.aiResponse!),
          severityAssessment: clarificationResult.updatedSeverityAssessment || activeSession.aiResponse!.severityAssessment,
          potentialConditions: clarificationResult.updatedPotentialConditions || activeSession.aiResponse!.potentialConditions,
        };
        setAiResponse(updatedAiResponse);
        toast({ title: "AI Insights Updated", description: "The AI has updated its assessment based on your chat." });
      }

      updateActiveSession(session => ({
        ...session,
        aiResponse: updatedAiResponse,
        chatMessages: [...session.chatMessages, aiChatMessage],
      }));

    } catch (error) {
      const errorMessage = (error as Error).message || 'Failed to get AI follow-up response.';
      toast({ title: 'Chat Error', description: errorMessage, variant: 'destructive' });
      const errorAiMessage: ChatMessage = { id: Date.now().toString() + 'aiError', role: 'ai', text: `Sorry, I encountered an error: ${errorMessage}`, timestamp: new Date() };
      setChatMessages(prev => [...prev, errorAiMessage]);

      updateActiveSession(session => ({
        ...session,
        chatMessages: [...session.chatMessages, errorAiMessage],
      }));
    } finally {
      setIsLoadingChatResponse(false);
    }
  };

  // Render ChatHistoryPanel directly here and control its open state
  const chatHistoryTrigger = (
    <Button
      variant="outline"
      onClick={() => setIsHistoryPanelOpen(true)}
      className="self-start mt-0 mb-2"
      aria-label="View chat history"
    >
      <PanelLeft className="h-5 w-5" />
      {/* Text removed, will be an icon button in Header */}
    </Button>
  );


  return (
    <div className="flex flex-col items-center w-full space-y-6">
      {/*
        The ChatHistoryPanel trigger is now passed to the Header component via AppShell.
        The ChatHistoryPanel itself is rendered here, controlled by isHistoryPanelOpen.
      */}
      <ChatHistoryPanel
        isOpen={isHistoryPanelOpen}
        onOpenChange={setIsHistoryPanelOpen}
        sessions={chatSessions}
        activeSessionId={activeSessionId}
        onLoadSession={loadSession}
        onStartNewSession={startNewSession}
        onDeleteSession={deleteSession}
        // Trigger is now external, managed via Header
      />

      <SymptomForm onSubmit={handleSymptomSubmit} isLoading={isLoadingAI} />

      {(isLoadingAI && !aiResponse) && (
        <div className="mt-8 text-center">
          <LoadingSpinner size={48} />
          <p className="text-muted-foreground mt-2">Analyzing your symptoms...</p>
        </div>
      )}
      
      {/* Display current session's image if available */}
      {activeSessionId && currentImageDataUri && aiResponse && !isLoadingAI && (
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
      {!activeSessionId && !isLoadingAI && (
        <div className="mt-12 text-center text-muted-foreground">
          <p className="text-lg">Welcome to HealthAssist AI!</p>
          <p>Please describe your symptoms in the form above to get started, or load a previous chat from the history.</p>
        </div>
      )}
    </div>
  );
}
