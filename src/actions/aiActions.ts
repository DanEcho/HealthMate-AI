// src/actions/aiActions.ts
'use server';

import { assessSymptomSeverity, type AssessSymptomSeverityOutput } from '@/ai/flows/assess-symptom-severity';
import { suggestPotentialConditions, type SuggestPotentialConditionsOutput } from '@/ai/flows/suggest-potential-conditions';

export interface AIResponse {
  severityAssessment: AssessSymptomSeverityOutput;
  potentialConditions: SuggestPotentialConditionsOutput;
}

export async function getAIResponse(symptoms: string): Promise<AIResponse> {
  if (!symptoms.trim()) {
    console.warn('[aiActions] getAIResponse called with empty symptoms.');
    throw new Error('Symptoms cannot be empty.');
  }

  console.log(`[aiActions] getAIResponse initiated with symptoms: "${symptoms}"`);

  try {
    const [severityAssessment, potentialConditions] = await Promise.all([
      assessSymptomSeverity({ symptoms }),
      suggestPotentialConditions({ symptoms }),
    ]);

    console.log('[aiActions] Successfully received severityAssessment:', JSON.stringify(severityAssessment, null, 2));
    console.log('[aiActions] Successfully received potentialConditions:', JSON.stringify(potentialConditions, null, 2));

    if (!severityAssessment || !potentialConditions) {
      console.error('[aiActions] One or more AI responses were unexpectedly empty.', { severityAssessment, potentialConditions });
      throw new Error('Received incomplete AI response from one or more services.');
    }

    return { severityAssessment, potentialConditions };
  } catch (error) {
    console.error(`[aiActions] Error fetching AI response for symptoms: "${symptoms}". Details:`, error);
    
    let errorMessage = 'Failed to get AI insights. Please try again.';
    if (error instanceof Error) {
      // We can customize the message based on known error types or messages if needed
      errorMessage = `Failed to get AI insights: ${error.message}. Check server logs for more details.`;
    }
    throw new Error(errorMessage);
  }
}

