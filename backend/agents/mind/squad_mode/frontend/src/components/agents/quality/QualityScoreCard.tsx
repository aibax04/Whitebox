
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ThumbsUp, 
  ThumbsDown, 
  AlertTriangle, 
  AlertCircle, 
  BadgeCheck,
  Award,
  XCircle,
  Zap
} from "lucide-react";

interface QualityScoreCardProps {
  score: number;
  summary: string;
}

/**
 * Card displaying the overall quality score with color coding and icons
 */
const QualityScoreCard = ({ score, summary }: QualityScoreCardProps) => {
  // Determine color based on realistic score ranges
  const getScoreColor = () => {
    if (score >= 90) return "border-emerald-500";
    if (score >= 80) return "border-green-500";
    if (score >= 70) return "border-blue-500";
    if (score >= 60) return "border-yellow-500";
    if (score >= 50) return "border-amber-500";
    if (score >= 40) return "border-orange-500";
    if (score >= 30) return "border-red-400";
    if (score >= 20) return "border-red-500";
    return "border-red-600";
  };

  // Determine text color based on score
  const getTextColor = () => {
    if (score >= 90) return "text-emerald-500";
    if (score >= 80) return "text-green-500";
    if (score >= 70) return "text-blue-500";
    if (score >= 60) return "text-yellow-500";
    if (score >= 50) return "text-amber-500";
    if (score >= 40) return "text-orange-500";
    if (score >= 30) return "text-red-400";
    if (score >= 20) return "text-red-500";
    return "text-red-600";
  };

  // Get appropriate icon based on score
  const getScoreIcon = () => {
    if (score >= 90) return <Award className="h-8 w-8 text-emerald-500" />;
    if (score >= 80) return <BadgeCheck className="h-8 w-8 text-green-500" />;
    if (score >= 70) return <ThumbsUp className="h-8 w-8 text-blue-500" />;
    if (score >= 60) return <Zap className="h-8 w-8 text-yellow-500" />;
    if (score >= 50) return <AlertTriangle className="h-8 w-8 text-amber-500" />;
    if (score >= 40) return <AlertCircle className="h-8 w-8 text-orange-500" />;
    if (score >= 30) return <ThumbsDown className="h-8 w-8 text-red-400" />;
    if (score >= 20) return <XCircle className="h-8 w-8 text-red-500" />;
    return <XCircle className="h-8 w-8 text-red-600" />;
  };

  // Get score label based on score - more granular scale
  const getScoreLabel = () => {
    if (score >= 95) return "Exceptional";
    if (score >= 90) return "Outstanding";
    if (score >= 85) return "Excellent";
    if (score >= 80) return "Very Good";
    if (score >= 75) return "Good";
    if (score >= 70) return "Satisfactory";
    if (score >= 65) return "Adequate";
    if (score >= 60) return "Moderate";
    if (score >= 55) return "Fair";
    if (score >= 50) return "Borderline";
    if (score >= 45) return "Concerning";
    if (score >= 40) return "Needs Work";
    if (score >= 35) return "Problematic";
    if (score >= 30) return "Poor";
    if (score >= 25) return "Very Poor";
    if (score >= 20) return "Critical";
    if (score >= 10) return "Severe Issues";
    return "Major Failures";
  };

  return (
    <Card className="border border-squadrun-primary/20 bg-squadrun-darker/50 col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          Overall Score
          {getScoreIcon()}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center pt-4">
        <div className={`w-32 h-32 rounded-full border-8 ${getScoreColor()} flex flex-col items-center justify-center mb-4`}>
          <span className={`text-4xl font-bold ${getTextColor()}`}>{score}</span>
          <span className={`text-xs font-medium ${getTextColor()}`}>{getScoreLabel()}</span>
        </div>
        <p className="text-sm text-center text-squadrun-gray">
          {summary}
        </p>
      </CardContent>
    </Card>
  );
};

export default QualityScoreCard;
