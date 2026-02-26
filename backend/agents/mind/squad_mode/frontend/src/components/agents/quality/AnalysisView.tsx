
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Code2, Zap, Shield, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { QualityResults } from "@/types/codeQuality";
import { useEffect, useState } from "react";

interface AnalysisViewProps {
  qualityResults: QualityResults;
  fileName: string | null;
  isRepositoryAnalysis?: boolean;
  repositoryName?: string | null;
}

export default function AnalysisView({ 
  qualityResults, 
  fileName, 
  isRepositoryAnalysis = false,
  repositoryName = null
}: AnalysisViewProps) {
  const [isIssuesCollapsed, setIsIssuesCollapsed] = useState(true);
  const [isRecommendationsCollapsed, setIsRecommendationsCollapsed] = useState(true);

  // Save quality score to backend when component mounts
  useEffect(() => {
    const saveQualityScore = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        await fetch('/api/quality-scores', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            qualityScore: qualityResults.score
          })
        });
      } catch (error) {
        console.error('Error saving quality score:', error);
      }
    };

    saveQualityScore();
  }, [qualityResults.score]);

  return (
    <div className="space-y-4 flex-1 overflow-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-squadrun-primary/20 bg-squadrun-darker/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Overall Quality Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center mb-4">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle
                    className="text-squadrun-darker stroke-current"
                    strokeWidth="10"
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                  />
                  <circle
                    className={`text-${getScoreColor(qualityResults.score)} stroke-current`}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${qualityResults.score * 2.51} 251`}
                    strokeDashoffset="0"
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl font-bold text-white">
                    {qualityResults.score}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-center text-squadrun-gray text-sm">
              {getScoreDescription(qualityResults.score)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-squadrun-primary/20 bg-squadrun-darker/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Quality Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center mb-1">
                <BookOpen className="h-4 w-4 text-blue-400 mr-2" />
                <span className="text-sm text-squadrun-gray">Readability</span>
                <span className="ml-auto text-sm font-medium">{qualityResults.readabilityScore}%</span>
              </div>
              <Progress value={qualityResults.readabilityScore} className="h-2" />
            </div>
            
            <div>
              <div className="flex items-center mb-1">
                <Code2 className="h-4 w-4 text-green-400 mr-2" />
                <span className="text-sm text-squadrun-gray">Maintainability</span>
                <span className="ml-auto text-sm font-medium">{qualityResults.maintainabilityScore}%</span>
              </div>
              <Progress value={qualityResults.maintainabilityScore} className="h-2" />
            </div>
            
            <div>
              <div className="flex items-center mb-1">
                <Zap className="h-4 w-4 text-yellow-400 mr-2" />
                <span className="text-sm text-squadrun-gray">Performance</span>
                <span className="ml-auto text-sm font-medium">{qualityResults.performanceScore}%</span>
              </div>
              <Progress value={qualityResults.performanceScore} className="h-2" />
            </div>
            
            <div>
              <div className="flex items-center mb-1">
                <Shield className="h-4 w-4 text-purple-400 mr-2" />
                <span className="text-sm text-squadrun-gray">Security</span>
                <span className="ml-auto text-sm font-medium">{qualityResults.securityScore}%</span>
              </div>
              <Progress value={qualityResults.securityScore} className="h-2" />
            </div>
            
            <div>
              <div className="flex items-center mb-1">
                <AlertTriangle className="h-4 w-4 text-red-400 mr-2" />
                <span className="text-sm text-squadrun-gray">Code Smell</span>
                <span className="ml-auto text-sm font-medium">{qualityResults.codeSmellScore}%</span>
              </div>
              <Progress value={qualityResults.codeSmellScore} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-squadrun-primary/20 bg-squadrun-darker/50">
          <CardHeader 
            className="pb-2 cursor-pointer hover:bg-squadrun-primary/5 transition-colors"
            onClick={() => setIsIssuesCollapsed(!isIssuesCollapsed)}
          >
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                Issues Identified ({qualityResults.issues.length})
              </span>
              {isIssuesCollapsed ? (
                <ChevronDown className="h-5 w-5 text-squadrun-gray" />
              ) : (
                <ChevronUp className="h-5 w-5 text-squadrun-gray" />
              )}
            </CardTitle>
          </CardHeader>
          {!isIssuesCollapsed && (
            <CardContent>
              <ul className="space-y-2">
                {qualityResults.issues.map((issue, index) => (
                  <li key={index} className="flex items-start">
                    <AlertTriangle className="h-4 w-4 text-red-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-squadrun-gray">{issue}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          )}
        </Card>

        <Card className="border-squadrun-primary/20 bg-squadrun-darker/50">
          <CardHeader 
            className="pb-2 cursor-pointer hover:bg-squadrun-primary/5 transition-colors"
            onClick={() => setIsRecommendationsCollapsed(!isRecommendationsCollapsed)}
          >
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-green-400" />
                Recommendations ({qualityResults.recommendations.length})
              </span>
              {isRecommendationsCollapsed ? (
                <ChevronDown className="h-5 w-5 text-squadrun-gray" />
              ) : (
                <ChevronUp className="h-5 w-5 text-squadrun-gray" />
              )}
            </CardTitle>
          </CardHeader>
          {!isRecommendationsCollapsed && (
            <CardContent>
              <ul className="space-y-2">
                {qualityResults.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start">
                    <Zap className="h-4 w-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-squadrun-gray">{recommendation}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}

function getScoreColor(score: number): string {
  if (score >= 80) return "green-500";
  if (score >= 60) return "yellow-500";
  if (score >= 40) return "orange-500";
  return "red-500";
}

function getScoreDescription(score: number): string {
  if (score >= 90) return "Excellent quality code. Well structured and maintainable.";
  if (score >= 80) return "Very good quality code with minor improvement opportunities.";
  if (score >= 70) return "Good quality code with several areas for improvement.";
  if (score >= 60) return "Acceptable code quality but needs attention.";
  if (score >= 50) return "Mediocre code quality. Consider refactoring.";
  if (score >= 40) return "Poor code quality. Significant refactoring needed.";
  return "Critical issues found. Major refactoring required.";
}
