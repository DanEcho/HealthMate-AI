
'use server';
/**
 * @fileOverview Suggests a medical specialty based on user symptoms.
 *
 * - suggestDoctorSpecialty - A function that takes user-reported symptoms and returns a suggested medical specialty and reasoning.
 * - SuggestDoctorSpecialtyInput - The input type.
 * - SuggestDoctorSpecialtyOutput - The return type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestDoctorSpecialtyInputSchema = z.object({
  symptoms: z.string().describe('The symptoms reported by the user.'),
});
export type SuggestDoctorSpecialtyInput = z.infer<typeof SuggestDoctorSpecialtyInputSchema>;

const SuggestDoctorSpecialtyOutputSchema = z.object({
  suggestedSpecialty: z.string().describe('The suggested medical specialty (e.g., General Practitioner, Cardiologist). Prioritize General Practitioner for common or vague symptoms.'),
  reasoning: z.string().describe('A brief explanation for why this specialty is suggested based on the symptoms.'),
});
export type SuggestDoctorSpecialtyOutput = z.infer<typeof SuggestDoctorSpecialtyOutputSchema>;

export async function suggestDoctorSpecialty(input: SuggestDoctorSpecialtyInput): Promise<SuggestDoctorSpecialtyOutput> {
  return suggestDoctorSpecialtyFlow(input);
}

const suggestDoctorSpecialtyPrompt = ai.definePrompt({
  name: 'suggestDoctorSpecialtyPrompt',
  input: {schema: SuggestDoctorSpecialtyInputSchema},
  output: {schema: SuggestDoctorSpecialtyOutputSchema},
  prompt: `You are an AI medical assistant. Based on the following symptoms: "{{symptoms}}", suggest a single, most relevant type of medical specialist a user might consider seeing.
  
  Your primary goal is to guide the user appropriately.
  - For common, vague, or multi-system symptoms (e.g., fatigue, general malaise, mild fever with cough), strongly lean towards suggesting "General Practitioner" as the first point of contact.
  - For symptoms clearly pointing to a specific system and potentially requiring specialized care (e.g., persistent chest pain, sudden vision loss, severe joint swelling with no injury), you may suggest a more specific specialist (e.g., Cardiologist, Ophthalmologist, Rheumatologist).
  - Only suggest one specialty.
  
  Provide your suggestion in a JSON object with exactly two keys:
  1. "suggestedSpecialty": The name of the specialty.
  2. "reasoning": A brief (1-2 sentences) explanation for your suggestion.

  Example for common symptoms:
  User Symptoms: "I have a slight fever, a cough, and I'm tired."
  Output:
  {
    "suggestedSpecialty": "General Practitioner",
    "reasoning": "A General Practitioner can assess common symptoms like fever, cough, and fatigue to determine the cause and recommend initial treatment or refer to a specialist if needed."
  }

  Example for more specific symptoms:
  User Symptoms: "I've been having sharp pains in my chest and shortness of breath, especially when I exercise."
  Output:
  {
    "suggestedSpecialty": "Cardiologist",
    "reasoning": "Chest pain and shortness of breath, particularly with exertion, can be related to heart conditions, making a consultation with a Cardiologist advisable."
  }

  User symptoms: {{{symptoms}}}
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

const suggestDoctorSpecialtyFlow = ai.defineFlow(
  {
    name: 'suggestDoctorSpecialtyFlow',
    inputSchema: SuggestDoctorSpecialtyInputSchema,
    outputSchema: SuggestDoctorSpecialtyOutputSchema,
  },
  async (input) => {
    console.log(`[suggestDoctorSpecialtyFlow] Starting with input: ${JSON.stringify(input, null, 2)}`);
    try {
      const {output} = await suggestDoctorSpecialtyPrompt(input);
      if (!output) {
        console.error(`[suggestDoctorSpecialtyFlow] AI failed to generate structured output. Input was: ${JSON.stringify(input, null, 2)}.`);
        throw new Error('AI failed to suggest a doctor specialty.');
      }
      console.log(`[suggestDoctorSpecialtyFlow] Successfully generated structured output: ${JSON.stringify(output, null, 2)}`);
      return output;
    } catch (err) {
      const error = err as Error;
      console.error(`[suggestDoctorSpecialtyFlow] Error during flow execution: ${error.message}`, error.stack);
      throw new Error(`Error in suggesting doctor specialty: ${error.message || 'Unknown error'}`);
    }
  }
);
