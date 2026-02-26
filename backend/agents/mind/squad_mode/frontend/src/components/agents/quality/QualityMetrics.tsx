import { QualityResults } from '@/types/codeQuality';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface QualityMetricsProps {
  results: QualityResults;
}

export function QualityMetrics({ results }: QualityMetricsProps) {
  const metrics = [
    { label: 'Overall Score', value: results.score },
    { label: 'Readability', value: results.readabilityScore || 0 },
    { label: 'Maintainability', value: results.maintainabilityScore || 0 },
    { label: 'Performance', value: results.performanceScore || 0 },
    { label: 'Security', value: results.securityScore || 0 },
    { label: 'Code Smell', value: results.codeSmellScore || 0 }
  ];

  return (
    <Card className="bg-squadrun-darker/50 border border-squadrun-primary/20">
      <CardHeader>
        <CardTitle className="text-squadrun-primary">Quality Metrics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white">{metric.label}</span>
              <span className="text-squadrun-primary">{metric.value}/100</span>
            </div>
            <Progress 
              value={metric.value} 
              className="h-2 bg-squadrun-darker [&>div]:bg-squadrun-primary"
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
} 