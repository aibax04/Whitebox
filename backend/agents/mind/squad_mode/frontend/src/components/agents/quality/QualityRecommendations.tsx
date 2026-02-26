import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb } from 'lucide-react';

interface QualityRecommendationsProps {
  recommendations: string[];
}

export function QualityRecommendations({ recommendations }: QualityRecommendationsProps) {
  if (!recommendations.length) return null;

  return (
    <Card className="bg-squadrun-darker/50 border border-squadrun-primary/20">
      <CardHeader>
        <CardTitle className="text-squadrun-primary">Recommendations</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {recommendations.map((recommendation, index) => (
            <li key={index} className="flex items-start gap-2 text-white">
              <Lightbulb className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
              <span>{recommendation}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
} 