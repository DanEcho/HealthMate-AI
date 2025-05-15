
'use server';
/**
 * @fileOverview Handles user follow-up questions to an initial AI health assessment.
 *
 * - clarifySymptoms - A function that takes original symptoms, initial AI assessment, an optional image, and a user's follow-up question, then returns a textual clarification and potentially updated assessments.
 * - ClarificationInput - The input type for the clarifySymptoms function.
 * - ClarificationOutput - The return type for the clarifySymptoms function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
// Import TypeScript types (these are compile-time and fine to import from 'use server' files)
import type { AssessSymptomSeverityOutput } from './assess-symptom-severity';
import type { SuggestPotentialConditionsOutput } from './suggest-potential-conditions';


// Define Zod schemas locally as they cannot be imported from other 'use server' files.

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

const SuggestedConditionSchema = z.object({
  condition: z.string().describe('The name of the potential medical condition.'),
  explanation: z.string().describe('A concise explanation of the condition and its relevance to the symptoms and image (if provided).'),
  distinguishingSymptoms: z.array(z.string()).describe('Up to 3 key symptoms that help distinguish this condition, especially from other conditions that might present similarly based on the initial user input. Be concise.'),
});

const SuggestPotentialConditionsOutputSchema = z.array(SuggestedConditionSchema).describe('A list of potential medical conditions, their explanations, and distinguishing symptoms.');


export const ClarificationInputSchema = z.object({
  originalSymptoms: z
    .string()
    .describe('The initial symptoms reported by the user.'),
  imageDataUri: z
    .string()
    .optional()
    .describe("The optional image data URI initially provided by the user. Format: 'data:<mimetype>;base64,<encoded_data>'."),
  currentSeverityAssessment: AssessSymptomSeverityOutputSchema.describe("The AI's most recent severity assessment prior to this follow-up question."),
  currentPotentialConditions: SuggestPotentialConditionsOutputSchema.describe("The AI's most recent list of potential conditions suggested prior to this follow-up question."),
  userQuestion: z
    .string()
    .describe("The user's follow-up question regarding their symptoms or the AI's previous assessment."),
});
export type ClarificationInput = z.infer<typeof ClarificationInputSchema>;

export const ClarificationOutputSchema = z.object({
  clarificationText: z
    .string()
    .describe("The AI's textual answer to the user's follow-up question, taking into account all prior context."),
  updatedSeverityAssessment: AssessSymptomSeverityOutputSchema
    .optional()
    .describe("An optional, complete, updated severity assessment if the user's question or new information significantly changes the AI's perspective on severity. If no significant change, this field should be omitted."),
  updatedPotentialConditions: SuggestPotentialConditionsOutputSchema
    .optional()
    .describe("An optional, complete, updated list of potential conditions if the user's question or new information significantly changes the AI's perspective on conditions. If no significant change, this field should be omitted."),
});
export type ClarificationOutput = z.infer<typeof ClarificationOutputSchema>;

export async function clarifySymptoms(input: ClarificationInput): Promise<ClarificationOutput> {
  return clarificationFlow(input);
}

const clarificationPrompt = ai.definePrompt({
  name: 'clarificationPrompt',
  input: {schema: ClarificationInputSchema},
  output: {schema: ClarificationOutputSchema},
  prompt: `You are an AI health assistant engaging in a follow-up conversation.
The user initially reported:
Symptoms: "{{originalSymptoms}}"
{{#if imageDataUri}}An image was provided with these symptoms.{{else}}No image was provided with the initial symptoms.{{/if}}

Your previous assessment based on that was:
Severity Assessment: "{{currentSeverityAssessment.severityAssessment}}"
Recommended Next Steps: "{{currentSeverityAssessment.nextStepsRecommendation}}"
{{#if currentSeverityAssessment.questionsToConsider}}
Questions you suggested for the user to consider:
{{#each currentSeverityAssessment.questionsToConsider}}
- {{this}}
{{/each}}
{{/if}}

Potential Conditions You Suggested:
{{#if currentPotentialConditions}}
{{#each currentPotentialConditions}}
- Condition: {{condition}}
  Explanation: {{explanation}}
  Distinguishing Symptoms: {{#if distinguishingSymptoms}}{{#each distinguishingSymptoms}}{{this}}; {{/each}}{{else}}Not specified{{/if}}
{{/each}}
{{else}}
You did not list any specific potential conditions previously.
{{/if}}

Now, the user has a follow-up question: "{{userQuestion}}"

Your Task:
1.  Provide a 'clarificationText' that directly and helpfully answers the user's question. Be conversational and refer to the context above.
2.  If the user's question or the information they provide in it significantly changes your perspective on the *severity* of their condition, provide a complete 'updatedSeverityAssessment' object. If your perspective on severity hasn't changed significantly, omit the 'updatedSeverityAssessment' field entirely.
3.  If the user's question or the information they provide in it significantly changes your perspective on the *potential conditions*, provide a complete 'updatedPotentialConditions' array (even if it's an empty array, if you now think no conditions are likely). If your perspective on potential conditions hasn't changed significantly, omit the 'updatedPotentialConditions' field entirely.

For example, if the user asks "What about a rash?" and they didn't mention a rash before, this might lead to an update. If they ask "Can you explain 'X' condition more?", it might only need clarificationText.

Ensure your response is a single, valid JSON object adhering to the ClarificationOutput schema.
Focus on being helpful, clear, and responsible. Do not provide a definitive diagnosis.
If you update the structured assessments, you can briefly mention why in the 'clarificationText'.
`,
  config: {
    safetySettings: [ // Consistent safety settings
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  },
});

const clarificationFlow = ai.defineFlow(
  {
    name: 'clarificationFlow',
    inputSchema: ClarificationInputSchema,
    outputSchema: ClarificationOutputSchema,
  },
  async (input: ClarificationInput) => {
    console.log(`[clarificationFlow] Starting with input: ${JSON.stringify(input, null, 2)}`);
    try {
      const result = await clarificationPrompt(input);
      console.log(`[clarificationFlow] Raw prompt result object: ${JSON.stringify(result, null, 2)}`);
      
      if (!result.output || typeof result.output.clarificationText !== 'string') {
        console.error(`[clarificationFlow] AI failed to generate structured output or missing clarificationText. Input: ${JSON.stringify(input, null, 2)}. Full response: ${JSON.stringify(result, null, 2)}`);
        throw new Error('AI failed to generate clarification. The model response was empty or malformed.');
      }

      // Validate optional updated fields if they exist
      if (result.output.updatedSeverityAssessment && (typeof result.output.updatedSeverityAssessment.severityAssessment !== 'string' || typeof result.output.updatedSeverityAssessment.nextStepsRecommendation !== 'string')) {
         console.error(`[clarificationFlow] Optional updatedSeverityAssessment is malformed: ${JSON.stringify(result.output.updatedSeverityAssessment, null, 2)}`);
         throw new Error('AI provided a malformed updated severity assessment.');
      }
      if (result.output.updatedPotentialConditions && !Array.isArray(result.output.updatedPotentialConditions)) {
         console.error(`[clarificationFlow] Optional updatedPotentialConditions is not an array: ${JSON.stringify(result.output.updatedPotentialConditions, null, 2)}`);
         throw new Error('AI provided malformed updated potential conditions (not an array).');
      }


      console.log(`[clarificationFlow] Successfully generated structured output: ${JSON.stringify(result.output, null, 2)}`);
      return result.output;
    } catch (err) {
      const error = err as Error;
      console.error(`[clarificationFlow] Error during flow execution: ${error.message}`, error.stack);
      throw new Error(`Error in clarifying symptoms: ${error.message || 'Unknown error'}`);
    }
  }
);

