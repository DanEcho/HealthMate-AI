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
});

const assessSymptomSeverityFlow = ai.defineFlow(
  {
    name: 'assessSymptomSeverityFlow',
    inputSchema: AssessSymptomSeverityInputSchema,
    outputSchema: AssessSymptomSeverityOutputSchema,
  },
  async input => {
    const {output} = await assessSymptomSeverityPrompt(input);
    if (!output) {
      throw new Error('AI failed to generate severity assessment.');
    }
    return output;
  }
);

