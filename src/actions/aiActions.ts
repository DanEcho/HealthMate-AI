
// src/actions/aiActions.ts
'use server';

import { assessSymptomSeverity, type AssessSymptomSeverityOutput } from '@/ai/flows/assess-symptom-severity';
import { suggestPotentialConditions, type SuggestPotentialConditionsOutput } from '@/ai/flows/suggest-potential-conditions';
import { refineDiagnosis, type RefineDiagnosisInput, type RefineDiagnosisOutput } from '@/ai/flows/refineDiagnosisWithVisualFlow';


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
      errorMessage = `Failed to get AI insights: ${error.message}. Check server logs for more details.`;
    }
    throw new Error(errorMessage);
  }
}

export async function refineDiagnosisWithVisual(input: RefineDiagnosisInput): Promise<RefineDiagnosisOutput> {
  if (!input.originalSymptoms.trim() || !input.selectedCondition.trim()) {
    console.warn('[aiActions] refineDiagnosisWithVisual called with empty symptoms or condition.');
    throw new Error('Original symptoms and selected condition cannot be empty.');
  }
  console.log(`[aiActions] refineDiagnosisWithVisual initiated with: ${JSON.stringify(input)}`);
  try {
    const refinedResponse = await refineDiagnosis(input);
    console.log('[aiActions] Successfully received refinedDiagnosis:', JSON.stringify(refinedResponse, null, 2));
    if (!refinedResponse) {
       console.error('[aiActions] Refined diagnosis response was unexpectedly empty.', { refinedResponse });
       throw new Error('Received empty response from refined diagnosis service.');
    }
    return refinedResponse;
  } catch (error) {
    console.error(`[aiActions] Error fetching refined AI response. Details:`, error);
    let errorMessage = 'Failed to get refined AI insights. Please try again.';
    if (error instanceof Error) {
      errorMessage = `Failed to get refined AI insights: ${error.message}. Check server logs for more details.`;
    }
    throw new Error(errorMessage);
  }
}
