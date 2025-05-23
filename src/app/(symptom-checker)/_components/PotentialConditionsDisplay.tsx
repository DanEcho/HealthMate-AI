
import type { SuggestPotentialConditionsOutput } from '@/ai/flows/suggest-potential-conditions';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListChecks, Lightbulb } from 'lucide-react';

interface PotentialConditionsDisplayProps {
  conditions: SuggestPotentialConditionsOutput;
}

export function PotentialConditionsDisplay({ conditions }: PotentialConditionsDisplayProps) {
  if (!conditions || conditions.length === 0) {
    return (
      <Card className="mt-6 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <ListChecks className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl font-semibold">Potential Conditions</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No specific conditions could be identified based on the symptoms provided, or the AI chose not to list any.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6 shadow-lg">
      <CardHeader>
         <div className="flex items-center gap-3">
            <ListChecks className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl font-semibold">Potential Conditions</CardTitle>
          </div>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {conditions.map((item, index) => (
            <AccordionItem value={`item-${index}`} key={item.condition + index}>
              <AccordionTrigger className="text-lg font-medium hover:text-primary">
                {item.condition}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed space-y-3">
                <p>{item.explanation}</p>
                {item.distinguishingSymptoms && item.distinguishingSymptoms.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-1 mb-1">
                      <Lightbulb className="h-4 w-4 text-accent" />
                      Key Distinguishing Symptoms:
                    </h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5 pl-2">
                      {item.distinguishingSymptoms.map((symptom, i) => (
                        <li key={i}>{symptom}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}

