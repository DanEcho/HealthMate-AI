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
  prompt: `You are an AI-powered health assistant that assesses the severity of a user's condition based on their reported symptoms.

  Symptoms: {{{symptoms}}}

  Provide a severity assessment and recommend appropriate next steps for the user.
  Indicate when professional medical advice is needed, and suggest the user to visit the nearest doctor if symptoms appear severe.
  Focus on providing helpful and clear information.
  `, // Changed from Handlebars-style to ES6 template literals
});

const assessSymptomSeverityFlow = ai.defineFlow(
  {
    name: 'assessSymptomSeverityFlow',
    inputSchema: AssessSymptomSeverityInputSchema,
    outputSchema: AssessSymptomSeverityOutputSchema,
  },
  async input => {
    const {output} = await assessSymptomSeverityPrompt(input);
    return output!;
  }
);
