'use server';

import { assessSymptomSeverity, type AssessSymptomSeverityOutput } from '@/ai/flows/assess-symptom-severity';
import { suggestPotentialConditions, type SuggestPotentialConditionsOutput } from '@/ai/flows/suggest-potential-conditions';

export interface AIResponse {
  severityAssessment: AssessSymptomSeverityOutput;
  potentialConditions: SuggestPotentialConditionsOutput;
}

export async function getAIResponse(symptoms: string): Promise<AIResponse> {
  if (!symptoms.trim()) {
    throw new Error('Symptoms cannot be empty.');
  }

  try {
    const [severityAssessment, potentialConditions] = await Promise.all([
      assessSymptomSeverity({ symptoms }),
      suggestPotentialConditions({ symptoms }),
    ]);

    return { severityAssessment, potentialConditions };
  } catch (error) {
    console.error('Error fetching AI response:', error);
    throw new Error('Failed to get AI response. Please try again.');
  }
}
