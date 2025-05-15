
'use client';

import type { SuggestPotentialConditionsOutput } from '@/ai/flows/suggest-potential-conditions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { ImageIcon, Zap, Lightbulb } from 'lucide-react';

interface VisualFollowUpChoicesProps {
  conditions: SuggestPotentialConditionsOutput;
  onChoiceSelect: (conditionName: string) => void;
  isLoading: boolean;
}

function getHintForCondition(conditionName: string): string {
  const name = conditionName.toLowerCase();
  if (name.includes('cold') || name.includes('flu')) return 'sick person';
  if (name.includes('headache') || name.includes('migraine')) return 'head pain';
  if (name.includes('rash') || name.includes('skin')) return 'skin rash';
  if (name.includes('stomach') || name.includes('digestive')) return 'stomach ache';
  if (name.includes('allergy')) return 'allergy symptoms';
  const words = name.split(/\s+/);
  if (words.length === 1) return words[0];
  if (words.length > 1) return `${words[0]} ${words[1]}`;
  return 'medical condition';
}


export function VisualFollowUpChoices({ conditions, onChoiceSelect, isLoading }: VisualFollowUpChoicesProps) {
  if (!conditions || conditions.length === 0) {
    return null;
  }

  return (
    <Card className="mt-6 shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-3">
          <ImageIcon className="h-6 w-6 text-primary" />
          <CardTitle className="text-2xl font-semibold">Refine Diagnosis</CardTitle>
        </div>
        <p className="text-muted-foreground">
          Click on a condition below that seems most relevant to get more specific insights. Consider the distinguishing symptoms listed.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {conditions.map((item, index) => (
            <Card 
              key={item.condition + index} 
              className="overflow-hidden transition-all hover:shadow-xl flex flex-col"
              // onClick={() => !isLoading && onChoiceSelect(item.condition)}
              // role="button"
              // tabIndex={0}
              // onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') !isLoading && onChoiceSelect(item.condition)}}
              // aria-disabled={isLoading}
              // aria-label={`Select ${item.condition}`}
            >
              <div className="relative h-40 w-full bg-muted">
                <Image
                  src={`https://placehold.co/300x200.png`}
                  alt={`Placeholder for ${item.condition}`}
                  layout="fill"
                  objectFit="cover"
                  data-ai-hint={getHintForCondition(item.condition)}
                />
              </div>
              <CardHeader className="p-4">
                <CardTitle className="text-lg font-medium">{item.condition}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 flex-grow flex flex-col justify-between">
                {item.distinguishingSymptoms && item.distinguishingSymptoms.length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                      <Lightbulb className="h-4 w-4 text-accent" />
                      Key Symptoms:
                    </h4>
                    <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                      {item.distinguishingSymptoms.map((symptom, i) => (
                        <li key={i}>{symptom}</li>
                      ))}
                    </ul>
                  </div>
                )}
                 <Button 
                    variant="outline" 
                    className="w-full mt-auto" 
                    disabled={isLoading}
                    onClick={(e) => { e.stopPropagation(); !isLoading && onChoiceSelect(item.condition); }}
                    aria-label={`Select ${item.condition}`}
                 >
                  <Zap className="mr-2 h-4 w-4" /> Select This Condition
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

