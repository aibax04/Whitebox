
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RecommendationsCardProps {
  recommendations: string[];
}

/**
 * Component displaying code quality improvement recommendations
 */
const RecommendationsCard = ({ recommendations }: RecommendationsCardProps) => {
  return (
    <Card className="border border-squadrun-primary/20 bg-squadrun-darker/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Recommendations</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="list-disc pl-5 space-y-2 text-squadrun-gray">
          {recommendations.map((rec, index) => (
            <li key={index} className="text-sm">{rec}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default RecommendationsCard;
