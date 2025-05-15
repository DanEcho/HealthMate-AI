
// src/actions/aiActions.ts
'use server';

import { assessSymptomSeverity, type AssessSymptomSeverityOutput } from '@/ai/flows/assess-symptom-severity';
import { suggestPotentialConditions, type SuggestPotentialConditionsOutput } from '@/ai/flows/suggest-potential-conditions';
import { refineDiagnosis, type RefineDiagnosisInput, type RefineDiagnosisOutput } from '@/ai/flows/refineDiagnosisWithVisualFlow';
import { suggestDoctorSpecialty, type SuggestDoctorSpecialtyOutput } from '@/ai/flows/suggest-doctor-specialty';
import { clarifySymptoms, type ClarificationInput, type ClarificationOutput } from '@/ai/flows/clarificationFlow';


export interface AIResponse {
  severityAssessment: AssessSymptomSeverityOutput;
  potentialConditions: SuggestPotentialConditionsOutput;
}

export interface FullAIResponse extends AIResponse {
  doctorSpecialtySuggestion?: SuggestDoctorSpecialtyOutput;
}

export async function getAIResponse(symptoms: string, imageDataUri?: string): Promise<FullAIResponse> {
  if (!symptoms.trim()) {
    console.warn('[aiActions] getAIResponse called with empty symptoms.');
    throw new Error('Symptoms cannot be empty.');
  }

  console.log(`[aiActions] getAIResponse initiated with symptoms: "${symptoms}" ${imageDataUri ? 'and an image.' : 'without an image.'}`);

  try {
    // Using Promise.allSettled to ensure all promises complete, even if some reject
    const [severityAssessmentResult, potentialConditionsResult, doctorSpecialtySuggestionResult] = await Promise.allSettled([
      assessSymptomSeverity({ symptoms, imageDataUri }),
      suggestPotentialConditions({ symptoms, imageDataUri }),
      suggestDoctorSpecialty({ symptoms }), // Image not typically used for specialty suggestion
    ]);

    // Process severity assessment
    let severityAssessment: AssessSymptomSeverityOutput;
    if (severityAssessmentResult.status === 'fulfilled') {
      severityAssessment = severityAssessmentResult.value;
      console.log('[aiActions] Successfully received severityAssessment:', JSON.stringify(severityAssessment, null, 2));
    } else {
      console.error('[aiActions] Failed to get severityAssessment:', severityAssessmentResult.reason);
      throw new Error(`Failed to get severity assessment: ${(severityAssessmentResult.reason as Error).message || 'Unknown error'}`);
    }

    // Process potential conditions
    let potentialConditions: SuggestPotentialConditionsOutput;
    if (potentialConditionsResult.status === 'fulfilled') {
      potentialConditions = potentialConditionsResult.value;
      console.log('[aiActions] Successfully received potentialConditions:', JSON.stringify(potentialConditions, null, 2));
    } else {
      console.error('[aiActions] Failed to get potentialConditions:', potentialConditionsResult.reason);
      throw new Error(`Failed to get potential conditions: ${(potentialConditionsResult.reason as Error).message || 'Unknown error'}`);
    }
    
    // Process doctor specialty suggestion (optional, so don't throw if it fails)
    let doctorSpecialtySuggestion: SuggestDoctorSpecialtyOutput | undefined = undefined;
    if (doctorSpecialtySuggestionResult.status === 'fulfilled') {
      doctorSpecialtySuggestion = doctorSpecialtySuggestionResult.value;
      console.log('[aiActions] Successfully received doctorSpecialtySuggestion:', JSON.stringify(doctorSpecialtySuggestion, null, 2));
    } else {
      console.warn(`[aiActions] Failed to get doctor specialty suggestion for symptoms: "${symptoms}". Error:`, doctorSpecialtySuggestionResult.reason);
      // Not throwing an error here as it's considered non-critical for the initial response
    }

    if (!severityAssessment || !potentialConditions) {
      // This case should ideally be caught by individual promise rejections above
      console.error('[aiActions] One or more critical AI responses were unexpectedly empty even after Promise.allSettled handling.', { severityAssessment, potentialConditions });
      throw new Error('Received incomplete AI response from one or more services.');
    }
    
    return { severityAssessment, potentialConditions, doctorSpecialtySuggestion };

  } catch (error) {
    console.error(`[aiActions] Error fetching AI response for symptoms: "${symptoms}". Details:`, error);
    
    let errorMessage = 'Failed to get AI insights. Please try again.';
    if (error instanceof Error) {
      // Use the specific error message if available
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

export async function getAIFollowUpResponse(input: ClarificationInput): Promise<ClarificationOutput> {
  if (!input.originalSymptoms.trim() || !input.userQuestion.trim()) {
    console.warn('[aiActions] getAIFollowUpResponse called with empty original symptoms or user question.');
    throw new Error('Original symptoms and user question cannot be empty for follow-up.');
  }
   if (!input.currentSeverityAssessment || !input.currentPotentialConditions) {
    console.warn('[aiActions] getAIFollowUpResponse called without current AI assessment context (severity or conditions).');
    // Providing default empty objects for schemas if they are missing, though the prompt expects them.
    // Ideally, the caller (AppLayoutClient) should ensure these are populated from `aiResponse`.
    input.currentSeverityAssessment = input.currentSeverityAssessment || { severityAssessment: "Not available", nextStepsRecommendation: "Not available", questionsToConsider: []};
    input.currentPotentialConditions = input.currentPotentialConditions || [];
    // This indicates a potential logic error in the calling code if these are missing.
  }

  console.log(`[aiActions] getAIFollowUpResponse initiated with: ${JSON.stringify(input, null, 2)}`);
  try {
    const clarificationResponse = await clarifySymptoms(input);
    console.log('[aiActions] Successfully received AI clarification:', JSON.stringify(clarificationResponse, null, 2));
    if (!clarificationResponse || !clarificationResponse.clarificationText) {
       console.error('[aiActions] AI clarification response was unexpectedly empty or missing text.', { clarificationResponse });
       throw new Error('Received empty or incomplete response from AI clarification service.');
    }
    return clarificationResponse;
  } catch (error) {
    console.error(`[aiActions] Error fetching AI follow-up response. Details:`, error);
    let errorMessage = 'Failed to get AI follow-up insights. Please try again.';
    if (error instanceof Error) {
      errorMessage = `Failed to get AI follow-up insights: ${error.message}. Check server logs for more details.`;
    }
    throw new Error(errorMessage);
  }
}
