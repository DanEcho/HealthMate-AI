
// This is an AI-powered function that takes a user's symptoms as input and returns a list of potential medical conditions.

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestPotentialConditionsInputSchema = z.object({
  symptoms: z.string().describe('The symptoms described by the user.'),
  imageDataUri: z
    .string()
    .optional()
    .describe("An optional image of the symptom or injury, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type SuggestPotentialConditionsInput = z.infer<typeof SuggestPotentialConditionsInputSchema>;

const SuggestedConditionSchema = z.object({
  condition: z.string().describe('The name of the potential medical condition.'),
  explanation: z.string().describe('A concise explanation of the condition and its relevance to the symptoms and image (if provided).'),
  distinguishingSymptoms: z.array(z.string()).describe('Up to 3 key symptoms that help distinguish this condition, especially from other conditions that might present similarly based on the initial user input. Be concise.'),
});

const SuggestPotentialConditionsOutputSchema = z.array(SuggestedConditionSchema).describe('A list of potential medical conditions, their explanations, and distinguishing symptoms.');
export type SuggestPotentialConditionsOutput = z.infer<typeof SuggestPotentialConditionsOutputSchema>;

export async function suggestPotentialConditions(input: SuggestPotentialConditionsInput): Promise<SuggestPotentialConditionsOutput> {
  return suggestPotentialConditionsFlow(input);
}

const suggestPotentialConditionsPrompt = ai.definePrompt({
  name: 'suggestPotentialConditionsPrompt',
  input: {schema: SuggestPotentialConditionsInputSchema},
  output: {schema: SuggestPotentialConditionsOutputSchema},
  prompt: `You are a medical AI assistant. A user has described the following symptoms: {{{symptoms}}}.
  {{#if imageDataUri}}
  They have also provided an image related to their symptoms:
  {{media url=imageDataUri}}
  {{/if}}
  Based on all this information, suggest a list of potential medical conditions that could be related.
  For each condition, provide:
  1.  "condition": The name of the potential medical condition (string).
  2.  "explanation": A concise explanation of the condition and its relevance to the symptoms, also mentioning how the image (if provided) aligns or contributes to this thought (string).
  3.  "distinguishingSymptoms": An array of up to 3 key symptoms (strings) that help distinguish this condition from others that might present similarly based on the initial user input. Be concise.

  Return your response *only* as a JSON array of objects. Each object in the array must adhere to this structure.
  Example of a single object:
  {
    "condition": "Common Cold",
    "explanation": "A viral infection of the upper respiratory tract, often causing runny nose, sore throat, and cough, which aligns with some of the reported symptoms. If an image was provided showing a red throat, this would be consistent.",
    "distinguishingSymptoms": ["Runny or stuffy nose", "Mild body aches", "Sneezing"]
  }
  Prioritize conditions that are most likely to be related to the symptoms and image (if any). Limit your response to the top 3 most relevant potential conditions.
  Ensure your entire output strictly adheres to this JSON array format and the specified object structure.
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

const suggestPotentialConditionsFlow = ai.defineFlow(
  {
    name: 'suggestPotentialConditionsFlow',
    inputSchema: SuggestPotentialConditionsInputSchema,
    outputSchema: SuggestPotentialConditionsOutputSchema,
  },
  async (input: SuggestPotentialConditionsInput) => {
    console.log(`[suggestPotentialConditionsFlow] Starting with input: ${JSON.stringify(input, null, 2)}`);
    try {
      const result = await suggestPotentialConditionsPrompt(input);
      console.log(`[suggestPotentialConditionsFlow] Raw prompt result object: ${JSON.stringify(result, null, 2)}`);

      if (result.response && result.response.candidates && result.response.candidates.length > 0) {
        const candidate = result.response.candidates[0];
        console.log(`[suggestPotentialConditionsFlow] Candidate finish reason: ${candidate.finishReason}, message: ${candidate.finishMessage}`);
        if (candidate.safetyRatings) {
            console.log(`[suggestPotentialConditionsFlow] Safety ratings: ${JSON.stringify(candidate.safetyRatings, null, 2)}`);
        }
        if (candidate.text) {
            console.log(`[suggestPotentialConditionsFlow] Candidate raw text response: ${candidate.text}`);
        }
      } else if (result.response) {
        console.log(`[suggestPotentialConditionsFlow] Prompt response did not contain candidates: ${JSON.stringify(result.response, null, 2)}`);
      }

      if (!result.output) {
        console.error(`[suggestPotentialConditionsFlow] AI failed to generate structured output. Input was: ${JSON.stringify(input, null, 2)}. Full prompt response object: ${JSON.stringify(result, null, 2)}`);
        throw new Error('AI failed to suggest potential conditions. The model response was empty or did not conform to the expected output structure.');
      }
      
      for (const condition of result.output) {
        if (!Array.isArray(condition.distinguishingSymptoms)) {
          console.warn(`[suggestPotentialConditionsFlow] Condition "${condition.condition}" missing 'distinguishingSymptoms' array, setting to empty. Output was: ${JSON.stringify(condition, null, 2)}`);
          condition.distinguishingSymptoms = [];
        }
      }

      console.log(`[suggestPotentialConditionsFlow] Successfully generated structured output: ${JSON.stringify(result.output, null, 2)}`);
      return result.output;
    } catch (err) {
      const error = err as Error;
      console.error(`[suggestPotentialConditionsFlow] Error during flow execution: ${error.message}`, error.stack);
      throw new Error(`Error in suggesting potential conditions: ${error.message || 'Unknown error'}`);
    }
  }
);
