
'use client';

import type { RefineDiagnosisOutput } from '@/ai/flows/refineDiagnosisWithVisualFlow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BrainCircuit } from 'lucide-react'; // Using a different icon for refined advice

interface RefinedDiagnosisDisplayProps {
  result: RefineDiagnosisOutput;
}

export function RefinedDiagnosisDisplay({ result }: RefinedDiagnosisDisplayProps) {
  return (
    <Card className="mt-6 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <BrainCircuit className="h-6 w-6 text-accent" />
          <CardTitle className="text-2xl font-semibold">Refined AI Insights</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-medium text-lg text-foreground">Further Advice:</h3>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{result.refinedAdvice}</p>
        </div>
        {result.confidence && (
           <div>
            <h3 className="font-medium text-lg text-foreground">Confidence:</h3>
            <p className="text-muted-foreground leading-relaxed">{result.confidence}</p>
          </div>
        )}
         <p className="mt-4 text-xs text-muted-foreground">
          This refined insight is based on your selection. Always consult with a healthcare professional for medical advice.
        </p>
      </CardContent>
    </Card>
  );
}
