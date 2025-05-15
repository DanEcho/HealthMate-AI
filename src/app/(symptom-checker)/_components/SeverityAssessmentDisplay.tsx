
import type { AssessSymptomSeverityOutput } from '@/ai/flows/assess-symptom-severity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, Info, HelpCircle } from 'lucide-react';

interface SeverityAssessmentDisplayProps {
  assessment: AssessSymptomSeverityOutput;
}

function getSeverityIcon(severityText: string) {
  const lowerSeverity = severityText.toLowerCase();
  if (lowerSeverity.includes('severe') || lowerSeverity.includes('urgent') || lowerSeverity.includes('critical') || lowerSeverity.includes('serious')) {
    return <AlertTriangle className="h-6 w-6 text-destructive" />;
  }
  if (lowerSeverity.includes('moderate')) {
    return <Info className="h-6 w-6 text-yellow-500" />;
  }
  if (lowerSeverity.includes('mild') || lowerSeverity.includes('low')) {
     return <CheckCircle className="h-6 w-6 text-green-500" />;
  }
  return <HelpCircle className="h-6 w-6 text-primary" />; // Default for general info
}


export function SeverityAssessmentDisplay({ assessment }: SeverityAssessmentDisplayProps) {
  return (
    <Card className="mt-6 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          {getSeverityIcon(assessment.severityAssessment)}
          <CardTitle className="text-2xl font-semibold">Initial AI Thoughts</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-medium text-lg text-foreground">Perspective on Symptoms:</h3>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{assessment.severityAssessment}</p>
        </div>
        <div>
          <h3 className="font-medium text-lg text-foreground">Recommended Next Steps:</h3>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{assessment.nextStepsRecommendation}</p>
        </div>
        {assessment.questionsToConsider && assessment.questionsToConsider.length > 0 && (
          <div>
            <h3 className="font-medium text-lg text-foreground flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-accent"/>
              Questions to Consider:
            </h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 pl-5 mt-1">
              {assessment.questionsToConsider.map((question, index) => (
                <li key={index}>{question}</li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground mt-2">Thinking about these questions might be helpful if you consult a healthcare professional.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
