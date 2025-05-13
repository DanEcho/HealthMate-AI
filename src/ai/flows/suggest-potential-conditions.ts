// This is an AI-powered function that takes a user's symptoms as input and returns a list of potential medical conditions.

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestPotentialConditionsInputSchema = z.object({
  symptoms: z.string().describe('The symptoms described by the user.'),
});
export type SuggestPotentialConditionsInput = z.infer<typeof SuggestPotentialConditionsInputSchema>;

const SuggestedConditionSchema = z.object({
  condition: z.string().describe('The name of the potential medical condition.'),
  explanation: z.string().describe('A concise explanation of the condition and its relevance to the symptoms.'),
});

const SuggestPotentialConditionsOutputSchema = z.array(SuggestedConditionSchema).describe('A list of potential medical conditions and their explanations.');
export type SuggestPotentialConditionsOutput = z.infer<typeof SuggestPotentialConditionsOutputSchema>;

export async function suggestPotentialConditions(input: SuggestPotentialConditionsInput): Promise<SuggestPotentialConditionsOutput> {
  return suggestPotentialConditionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestPotentialConditionsPrompt',
  input: {schema: SuggestPotentialConditionsInputSchema},
  output: {schema: SuggestPotentialConditionsOutputSchema},
  prompt: `You are a medical AI assistant. A user has described the following symptoms: {{{symptoms}}}.
Based on these symptoms, suggest a list of potential medical conditions that could be related.
For each condition, provide a concise explanation of the condition and its relevance to the symptoms.
Return your response *only* as a JSON array of objects. Each object in the array must have a "condition" property (string) and an "explanation" property (string).
Prioritize conditions that are most likely to be related to the symptoms. Limit your response to the top 3 most relevant potential conditions.
Ensure your entire output strictly adheres to this JSON array format and the specified object structure.
`,
});

const suggestPotentialConditionsFlow = ai.defineFlow(
  {
    name: 'suggestPotentialConditionsFlow',
    inputSchema: SuggestPotentialConditionsInputSchema,
    outputSchema: SuggestPotentialConditionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
     if (!output) {
      throw new Error('AI failed to suggest potential conditions.');
    }
    return output;
  }
);

