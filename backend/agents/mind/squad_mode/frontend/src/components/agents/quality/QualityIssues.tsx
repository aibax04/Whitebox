import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface QualityIssuesProps {
  issues: string[];
}

export function QualityIssues({ issues }: QualityIssuesProps) {
  if (!issues.length) return null;

  return (
    <Card className="bg-squadrun-darker/50 border border-squadrun-primary/20">
      <CardHeader>
        <CardTitle className="text-squadrun-primary">Issues Identified</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {issues.map((issue, index) => (
            <li key={index} className="flex items-start gap-2 text-white">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <span>{issue}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
} 