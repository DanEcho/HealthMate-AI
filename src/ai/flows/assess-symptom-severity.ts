
// This is an AI-powered health assessment tool.
'use server';

/**
 * @fileOverview Assesses the severity of symptoms provided by the user, optionally with an image.
 *
 * - assessSymptomSeverity - A function that takes user-reported symptoms (and optionally an image) and returns an AI assessment of potential severity and questions to consider.
 * - AssessSymptomSeverityInput - The input type for the assessSymptomSeverity function.
 * - AssessSymptomSeverityOutput - The return type for the assessSymptomSeverity function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AssessSymptomSeverityInputSchema = z.object({
  symptoms: z
    .string()
    .describe('The symptoms reported by the user, described in their own words.'),
  imageDataUri: z
    .string()
    .optional()
    .describe("An optional image of the symptom or injury, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type AssessSymptomSeverityInput = z.infer<typeof AssessSymptomSeverityInputSchema>;

// Schema is defined here but NOT exported directly
const AssessSymptomSeverityOutputSchema = z.object({
  severityAssessment: z
    .string()
    .describe(
      'An AI-generated perspective on the potential seriousness of the condition based on the symptoms and image (if provided). This is not a diagnosis.'
    ),
  nextStepsRecommendation: z
    .string()
    .describe(
      'Recommendations for the user on what to do next, based on the severity assessment. Should emphasize consulting a healthcare professional.'
    ),
  questionsToConsider: z.array(z.string()).optional().describe(
    "A list of questions a healthcare professional might ask, or points the user should consider observing further about their symptoms."
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
  prompt: `You are an AI-powered health assistant. Your task is to analyze user-reported symptoms and any provided image.
  Your response should be consultative, not a definitive diagnosis.
  Based on this information, you must return a JSON object with:
  1. "severityAssessment": A string providing a perspective on the potential seriousness. Use cautious language like "The described symptoms might suggest..." or "It could be helpful to consider..."
  2. "nextStepsRecommendation": A string containing actionable next steps. Always prioritize professional medical advice.
  3. "questionsToConsider": An optional array of strings. These should be pertinent questions a doctor might ask, or things the user could observe more closely (e.g., "Does the pain change with activity?", "Have you noticed any swelling?").

  If the symptoms appear potentially serious, your "nextStepsRecommendation" must strongly advise seeking professional medical attention.
  Focus on providing clear, helpful, and responsible information. Ensure your entire response is a single, valid JSON object adhering to this structure.

  User Symptoms:
  {{{symptoms}}}
  {{#if imageDataUri}}
  Visual Information Provided:
  {{media url=imageDataUri}}
  {{/if}}
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
      
      if (typeof result.output.severityAssessment !== 'string' || typeof result.output.nextStepsRecommendation !== 'string') {
        console.error(`[assessSymptomSeverityFlow] AI output is missing required fields or has incorrect types. Output: ${JSON.stringify(result.output, null, 2)}`);
        throw new Error('AI response for severity assessment is incomplete or malformed.');
      }
      if (result.output.questionsToConsider && !Array.isArray(result.output.questionsToConsider)) {
        console.warn(`[assessSymptomSeverityFlow] 'questionsToConsider' is not an array, setting to empty. Output was: ${JSON.stringify(result.output.questionsToConsider, null, 2)}`);
        result.output.questionsToConsider = [];
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

