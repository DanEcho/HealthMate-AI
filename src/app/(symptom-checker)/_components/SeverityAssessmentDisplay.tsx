import type { AssessSymptomSeverityOutput } from '@/ai/flows/assess-symptom-severity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface SeverityAssessmentDisplayProps {
  assessment: AssessSymptomSeverityOutput;
}

function getSeverityIcon(severityText: string) {
  const lowerSeverity = severityText.toLowerCase();
  if (lowerSeverity.includes('severe') || lowerSeverity.includes('urgent') || lowerSeverity.includes('critical')) {
    return <AlertTriangle className="h-6 w-6 text-destructive" />;
  }
  if (lowerSeverity.includes('moderate')) {
    return <Info className="h-6 w-6 text-yellow-500" />;
  }
  return <CheckCircle className="h-6 w-6 text-green-500" />;
}


export function SeverityAssessmentDisplay({ assessment }: SeverityAssessmentDisplayProps) {
  return (
    <Card className="mt-6 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          {getSeverityIcon(assessment.severityAssessment)}
          <CardTitle className="text-2xl font-semibold">Symptom Severity Assessment</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-medium text-lg text-foreground">Assessment:</h3>
          <p className="text-muted-foreground leading-relaxed">{assessment.severityAssessment}</p>
        </div>
        <div>
          <h3 className="font-medium text-lg text-foreground">Recommended Next Steps:</h3>
          <p className="text-muted-foreground leading-relaxed">{assessment.nextStepsRecommendation}</p>
        </div>
      </CardContent>
    </Card>
  );
}
