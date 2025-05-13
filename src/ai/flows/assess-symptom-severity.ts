// This is an AI-powered health assessment tool.
'use server';

/**
 * @fileOverview Assesses the severity of symptoms provided by the user.
 *
 * - assessSymptomSeverity - A function that takes user-reported symptoms and returns an AI assessment of the potential severity of the condition.
 * - AssessSymptomSeverityInput - The input type for the assessSymptomSeverity function.
 * - AssessSymptomSeverityOutput - The return type for the assessSymptomSeverity function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AssessSymptomSeverityInputSchema = z.object({
  symptoms: z
    .string()
    .describe('The symptoms reported by the user, described in their own words.'),
});
export type AssessSymptomSeverityInput = z.infer<typeof AssessSymptomSeverityInputSchema>;

const AssessSymptomSeverityOutputSchema = z.object({
  severityAssessment: z
    .string()
    .describe(
      'An AI assessment of the potential severity of the condition based on the symptoms provided.'
    ),
  nextStepsRecommendation: z
    .string()
    .describe(
      'Recommendation for the user, on what to do next, based on the severity assessment. Should include a suggestion to seek professional medical advice if needed.'
    ),
});
export type AssessSymptomSeverityOutput = z.infer<typeof AssessSymptomSeverityOutputSchema>;

export async function assessSymptomSeverity(input: AssessSymptomSeverityInput): Promise<AssessSymptomSeverityOutput> {
  return assessSymptomSeverityFlow(input);
}

const assessSymptomSeverityPrompt = ai.definePrompt({
  name: 'assessSymptomSeverityPrompt',
  input: {schema: AssessSymptomSeverityInputSchema},
  output: {schema: AssessSymptomSeverityOutputSchema},
  prompt: `You are an AI-powered health assistant. Your task is to analyze user-reported symptoms.
  Based on these symptoms, you must return a JSON object with exactly two keys:
  1. "severityAssessment": A string describing the potential severity of the condition.
  2. "nextStepsRecommendation": A string containing actionable next steps for the user.

  If the symptoms appear severe, your "nextStepsRecommendation" must strongly advise seeking professional medical attention, including visiting a doctor or emergency services as appropriate.
  Focus on providing clear, helpful, and responsible information. Ensure your entire response is a single, valid JSON object adhering to this structure.

  User Symptoms:
  {{{symptoms}}}
  `,
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
    ],
  },
});

const assessSymptomSeverityFlow = ai.defineFlow(
  {
    name: 'assessSymptomSeverityFlow',
    inputSchema: AssessSymptomSeverityInputSchema,
    outputSchema: AssessSymptomSeverityOutputSchema,
  },
  async (input: AssessSymptomSeverityInput) => {
    console.log(`[assessSymptomSeverityFlow] Starting with input: ${JSON.stringify(input, null, 2)}`);
    try {
      const result = await assessSymptomSeverityPrompt(input);
      console.log(`[assessSymptomSeverityFlow] Raw prompt result object: ${JSON.stringify(result, null, 2)}`);
      
      if (result.response && result.response.candidates && result.response.candidates.length > 0) {
        const candidate = result.response.candidates[0];
        console.log(`[assessSymptomSeverityFlow] Candidate finish reason: ${candidate.finishReason}, message: ${candidate.finishMessage}`);
        if (candidate.safetyRatings) {
            console.log(`[assessSymptomSeverityFlow] Safety ratings: ${JSON.stringify(candidate.safetyRatings, null, 2)}`);
        }
         if (candidate.text) {
            console.log(`[assessSymptomSeverityFlow] Candidate raw text response: ${candidate.text}`);
        }
      } else if (result.response) {
        console.log(`[assessSymptomSeverityFlow] Prompt response did not contain candidates: ${JSON.stringify(result.response, null, 2)}`);
      }


      if (!result.output) {
        console.error(`[assessSymptomSeverityFlow] AI failed to generate structured output. Input was: ${JSON.stringify(input, null, 2)}. Full prompt response object: ${JSON.stringify(result, null, 2)}`);
        throw new Error('AI failed to generate severity assessment. The model response was empty or did not conform to the expected output structure.');
      }
      
      // Zod parsing is handled by Genkit, but an explicit check for key fields can be useful for debugging.
      if (typeof result.output.severityAssessment !== 'string' || typeof result.output.nextStepsRecommendation !== 'string') {
        console.error(`[assessSymptomSeverityFlow] AI output is missing required fields or has incorrect types. Output: ${JSON.stringify(result.output, null, 2)}`);
        throw new Error('AI response for severity assessment is incomplete or malformed.');
      }

      console.log(`[assessSymptomSeverityFlow] Successfully generated structured output: ${JSON.stringify(result.output, null, 2)}`);
      return result.output;
    } catch (err) {
      const error = err as Error;
      console.error(`[assessSymptomSeverityFlow] Error during flow execution: ${error.message}`, error.stack);
      throw new Error(`Error in assessing symptom severity: ${error.message || 'Unknown error'}`);
    }
  }
);
