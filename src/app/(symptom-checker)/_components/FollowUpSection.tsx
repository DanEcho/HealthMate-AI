
'use client';

import { useState } from 'react';
import type { FullAIResponse } from '@/actions/aiActions';
import type { ClarificationOutput } from '@/ai/flows/clarificationFlow'; // Will create this type
import { getAIFollowUpResponse } from '@/actions/aiActions';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquarePlus, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export type ClarificationResponse = ClarificationOutput;

interface FollowUpSectionProps {
  originalSymptoms: string;
  originalImageDataUri?: string;
  currentAIResponse: FullAIResponse;
  onFollowUpUpdate: (clarification: ClarificationResponse) => void;
}

export function FollowUpSection({
  originalSymptoms,
  originalImageDataUri,
  currentAIResponse,
  onFollowUpUpdate,
}: FollowUpSectionProps) {
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [isLoadingFollowUp, setIsLoadingFollowUp] = useState(false);
  const [clarificationResult, setClarificationResult] = useState<ClarificationResponse | null>(null);
  const { toast } = useToast();

  const handleFollowUpSubmit = async () => {
    if (!followUpQuestion.trim()) {
      toast({ title: 'Empty Question', description: 'Please type your follow-up question.', variant: 'destructive' });
      return;
    }
    setIsLoadingFollowUp(true);
    setClarificationResult(null);
    try {
      const result = await getAIFollowUpResponse({
        originalSymptoms,
        imageDataUri: originalImageDataUri,
        currentSeverityAssessment: currentAIResponse.severityAssessment,
        currentPotentialConditions: currentAIResponse.potentialConditions,
        userQuestion: followUpQuestion,
      });
      setClarificationResult(result);
      onFollowUpUpdate(result); // Notify parent if structured data was updated
      setFollowUpQuestion(''); // Clear input after successful submission
    } catch (error) {
      toast({
        title: 'Follow-up Error',
        description: (error as Error).message || 'Failed to get AI follow-up response.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingFollowUp(false);
    }
  };

  return (
    <Card className="mt-6 shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-3">
          <MessageSquarePlus className="h-6 w-6 text-primary" />
          <CardTitle className="text-2xl font-semibold">Ask a Follow-up Question</CardTitle>
        </div>
        <p className="text-muted-foreground">
          Have more questions or details to add about your symptoms or the AI's initial thoughts? Ask below.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Type your follow-up question here..."
          value={followUpQuestion}
          onChange={(e) => setFollowUpQuestion(e.target.value)}
          className="min-h-[100px]"
          disabled={isLoadingFollowUp}
        />
        <Button onClick={handleFollowUpSubmit} disabled={isLoadingFollowUp || !followUpQuestion.trim()} className="w-full">
          {isLoadingFollowUp ? (
            <> <LoadingSpinner size={20} className="mr-2" /> Asking AI...</>
          ) : (
            <> <Sparkles className="mr-2 h-5 w-5" /> Get Clarification </>
          )}
        </Button>

        {clarificationResult && !isLoadingFollowUp && (
          <Card className="mt-4 bg-accent/10 border-accent/30">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                <CardTitle className="text-md font-semibold text-accent">AI's Clarification</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="text-muted-foreground whitespace-pre-line">{clarificationResult.clarificationText}</p>
              {(clarificationResult.updatedSeverityAssessment || clarificationResult.updatedPotentialConditions) && (
                <p className="mt-3 text-xs font-medium text-primary">
                  Note: The AI has also updated its main assessment based on your follow-up. Check the sections above.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
