
'use server';

/**
 * @fileOverview Refines a health diagnosis based on user's selection from visual cues.
 *
 * - refineDiagnosis - A function that takes original symptoms and a user-selected condition to provide more specific advice.
 * - RefineDiagnosisInput - The input type for the refineDiagnosis function.
 * - RefineDiagnosisOutput - The return type for the refineDiagnosis function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RefineDiagnosisInputSchema = z.object({
  originalSymptoms: z
    .string()
    .describe('The initial symptoms reported by the user.'),
  selectedCondition: z
    .string()
    .describe('The potential condition selected by the user from a list of suggestions, possibly after seeing a visual cue.'),
});
export type RefineDiagnosisInput = z.infer<typeof RefineDiagnosisInputSchema>;

const RefineDiagnosisOutputSchema = z.object({
  refinedAdvice: z
    .string()
    .describe(
      'More specific advice, questions, or next steps based on the selected condition and original symptoms.'
    ),
  confidence: z
    .string()
    .optional()
    .describe('An optional statement about the AI model\'s confidence or considerations for this refined advice.'),
});
export type RefineDiagnosisOutput = z.infer<typeof RefineDiagnosisOutputSchema>;

export async function refineDiagnosis(input: RefineDiagnosisInput): Promise<RefineDiagnosisOutput> {
  return refineDiagnosisFlow(input);
}

const refineDiagnosisPrompt = ai.definePrompt({
  name: 'refineDiagnosisPrompt',
  input: {schema: RefineDiagnosisInputSchema},
  output: {schema: RefineDiagnosisOutputSchema},
  prompt: `You are an AI-powered health assistant.
The user initially reported the following symptoms: "{{originalSymptoms}}".
From a list of potential conditions, the user has indicated that "{{selectedCondition}}" seems most relevant to them.

Based on this selection and the original symptoms, provide refined advice.
Consider the following:
- If "{{selectedCondition}}" is a common, mild issue (e.g., Common Cold, Mild Headache), you can suggest common self-care tips, things to watch out for, or when to see a doctor if it doesn't improve.
- If "{{selectedCondition}}" could be more serious or ambiguous (e.g., Pneumonia, Migraine with Aura), strongly reiterate the importance of consulting a healthcare professional for an accurate diagnosis and treatment. You can also suggest specific questions the user might ask their doctor.
- Avoid making a definitive diagnosis. Use cautious language.
- Your response should be helpful and actionable.

Return a JSON object with "refinedAdvice" and optionally "confidence". For example:
{
  "refinedAdvice": "Given your symptoms of '{{{originalSymptoms}}}' and your selection of '{{{selectedCondition}}}', it's important to monitor for X, Y, Z. If these occur, or if you're not improving, please see a doctor. You might consider trying [safe, general home remedy if appropriate for the selected condition].",
  "confidence": "This advice is based on common patterns. A professional medical diagnosis is essential."
}
Ensure your entire response is a single, valid JSON object adhering to the schema.
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

const refineDiagnosisFlow = ai.defineFlow(
  {
    name: 'refineDiagnosisFlow',
    inputSchema: RefineDiagnosisInputSchema,
    outputSchema: RefineDiagnosisOutputSchema,
  },
  async (input: RefineDiagnosisInput) => {
    console.log(`[refineDiagnosisFlow] Starting with input: ${JSON.stringify(input, null, 2)}`);
    try {
      const result = await refineDiagnosisPrompt(input);
      console.log(`[refineDiagnosisFlow] Raw prompt result object: ${JSON.stringify(result, null, 2)}`);
      
      if (!result.output) {
        console.error(`[refineDiagnosisFlow] AI failed to generate structured output. Input was: ${JSON.stringify(input, null, 2)}. Full prompt response object: ${JSON.stringify(result, null, 2)}`);
        throw new Error('AI failed to generate refined diagnosis. The model response was empty or did not conform to the expected output structure.');
      }
      
      if (typeof result.output.refinedAdvice !== 'string') {
        console.error(`[refineDiagnosisFlow] AI output is missing 'refinedAdvice' or has incorrect type. Output: ${JSON.stringify(result.output, null, 2)}`);
        throw new Error('AI response for refined diagnosis is incomplete or malformed.');
      }

      console.log(`[refineDiagnosisFlow] Successfully generated structured output: ${JSON.stringify(result.output, null, 2)}`);
      return result.output;
    } catch (err) {
      const error = err as Error;
      console.error(`[refineDiagnosisFlow] Error during flow execution: ${error.message}`, error.stack);
      throw new Error(`Error in refining diagnosis: ${error.message || 'Unknown error'}`);
    }
  }
);
