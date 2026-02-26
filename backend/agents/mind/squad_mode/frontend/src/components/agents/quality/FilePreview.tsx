import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QualityResults, CodeIssue } from "@/types/codeQuality";
import { AlertTriangle, Lightbulb, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FilePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  fileContent: string;
  qualityResults: QualityResults;
}

export default function FilePreview({
  isOpen,
  onClose,
  fileName,
  fileContent,
  qualityResults
}: FilePreviewProps) {
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);

  // Use structured data if available, otherwise fall back to parsing
  const hasStructuredData = qualityResults.structuredIssues && qualityResults.structuredRecommendations;

  // Helper function to expand line ranges into individual lines
  const expandLineRange = (issue: CodeIssue): number[] => {
    if (issue.lineRange) {
      const lines: number[] = [];
      for (let i = issue.lineRange.start; i <= issue.lineRange.end; i++) {
        lines.push(i);
      }
      return lines;
    } else if (issue.line) {
      return [issue.line];
    }
    return [];
  };

  // Create line-to-issue/recommendation maps
  const lineToIssues = new Map<number, CodeIssue[]>();
  const lineToRecommendations = new Map<number, CodeIssue[]>();

  if (hasStructuredData) {
    // Use structured data
    qualityResults.structuredIssues?.forEach(issue => {
      const lines = expandLineRange(issue);
      lines.forEach(line => {
        const existing = lineToIssues.get(line) || [];
        lineToIssues.set(line, [...existing, issue]);
      });
    });

    qualityResults.structuredRecommendations?.forEach(recommendation => {
      const lines = expandLineRange(recommendation);
      lines.forEach(line => {
        const existing = lineToRecommendations.get(line) || [];
        lineToRecommendations.set(line, [...existing, recommendation]);
      });
    });
  } else {
    // Fall back to parsing text (legacy support)
    const parseLineNumbers = (text: string): number[] => {
      const lineNumbers: number[] = [];
      
      const patterns = [
        /[Ll]ine\s+(\d+)/g,
        /[Ll]ines\s+(\d+)-(\d+)/g,
        /:(\d+)[-:]/g,
        /\bat\s+line\s+(\d+)/gi,
      ];
      
      patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(text)) !== null) {
          if (match[2]) {
            const start = parseInt(match[1]);
            const end = parseInt(match[2]);
            for (let i = start; i <= end; i++) {
              if (!lineNumbers.includes(i)) {
                lineNumbers.push(i);
              }
            }
          } else if (match[1]) {
            const lineNum = parseInt(match[1]);
            if (!lineNumbers.includes(lineNum)) {
              lineNumbers.push(lineNum);
            }
          }
        }
      });
      
      return lineNumbers;
    };

    qualityResults.issues.forEach(issue => {
      const lines = parseLineNumbers(issue);
      lines.forEach(line => {
        const existing = lineToIssues.get(line) || [];
        const issueObj: CodeIssue = { message: issue, severity: 'error' };
        lineToIssues.set(line, [...existing, issueObj]);
      });
    });

    qualityResults.recommendations.forEach(recommendation => {
      const lines = parseLineNumbers(recommendation);
      lines.forEach(line => {
        const existing = lineToRecommendations.get(line) || [];
        const recObj: CodeIssue = { message: recommendation, severity: 'warning' };
        lineToRecommendations.set(line, [...existing, recObj]);
      });
    });
  }

  // Get all lines with issues/recommendations for the summary
  const totalIssueLines = lineToIssues.size;
  const totalRecommendationLines = lineToRecommendations.size;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] bg-[#0d1117] border-squadrun-primary/30">
        <DialogHeader className="space-y-3 pb-4 border-b border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <span className="text-squadrun-primary">📄</span>
                {fileName}
              </DialogTitle>
              <div className="flex gap-4 text-sm">
                {totalIssueLines > 0 && (
                  <div className="flex items-center gap-1.5 text-red-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{totalIssueLines} line{totalIssueLines !== 1 ? 's' : ''} with issues</span>
                  </div>
                )}
                {totalRecommendationLines > 0 && (
                  <div className="flex items-center gap-1.5 text-yellow-400">
                    <Lightbulb className="h-4 w-4" />
                    <span>{totalRecommendationLines} line{totalRecommendationLines !== 1 ? 's' : ''} with recommendations</span>
                  </div>
                )}
                {totalIssueLines === 0 && totalRecommendationLines === 0 && (
                  <div className="text-green-400">✓ No issues found</div>
                )}
              </div>
            </div>
            {/* <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <X className="h-5 w-5" />
            </Button> */}
          </div>
        </DialogHeader>

        <div className="relative font-mono text-sm bg-[#0d1117] rounded-md overflow-auto max-h-[calc(85vh-12rem)] border border-gray-800">
          <div className="sticky top-0 z-10 bg-[#161b22] border-b border-gray-700 px-2 py-1 text-xs text-gray-400">
            <span className="mr-4">Hover over highlighted lines to see details</span>
            <span className="text-red-400">● Issues</span>
            <span className="mx-2">•</span>
            <span className="text-yellow-400">● Recommendations</span>
          </div>
          
          {fileContent.split('\n').map((line, index) => {
            const lineNumber = index + 1;
            const issues = lineToIssues.get(lineNumber) || [];
            const recommendations = lineToRecommendations.get(lineNumber) || [];
            const hasIssues = issues.length > 0;
            const hasRecommendations = recommendations.length > 0;
            
            return (
              <div
                key={index}
                className={`relative group border-l-4 ${
                  hasIssues 
                    ? 'bg-red-900/20 border-red-500 hover:bg-red-900/30' 
                    : hasRecommendations 
                      ? 'bg-yellow-900/15 border-yellow-500 hover:bg-yellow-900/25' 
                      : 'border-transparent hover:bg-[#161b22]'
                } transition-all duration-150`}
                onMouseEnter={() => setHoveredLine(lineNumber)}
                onMouseLeave={() => setHoveredLine(null)}
              >
                <div className="flex items-center px-2 py-1.5">
                  <span className={`w-14 text-right pr-4 select-none flex-shrink-0 text-xs ${
                    hasIssues 
                      ? 'text-red-400 font-bold' 
                      : hasRecommendations 
                        ? 'text-yellow-400 font-semibold' 
                        : 'text-gray-500'
                  }`}>
                    {lineNumber}
                  </span>
                  <pre className="flex-1 overflow-x-auto whitespace-pre text-[#c9d1d9] text-[13px] leading-relaxed">
                    {line || ' '}
                  </pre>
                  {(hasIssues || hasRecommendations) && (
                    <div className="ml-3 flex items-center gap-1.5 flex-shrink-0">
                      {hasIssues && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/20 border border-red-500/30">
                          <AlertTriangle className="h-3 w-3 text-red-400" />
                          <span className="text-xs text-red-300">{issues.length}</span>
                        </div>
                      )}
                      {hasRecommendations && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-500/20 border border-yellow-500/30">
                          <Lightbulb className="h-3 w-3 text-yellow-400" />
                          <span className="text-xs text-yellow-300">{recommendations.length}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {hoveredLine === lineNumber && (hasIssues || hasRecommendations) && (
                  <div className="absolute left-16 right-4 top-full mt-1 z-50 bg-[#1c2128] border-2 border-squadrun-primary/50 rounded-lg shadow-2xl max-w-3xl">
                    <div className="p-4 max-h-64 overflow-y-auto">
                      {hasIssues && issues.length > 0 && (
                        <div className="mb-3">
                          <div className="flex items-center gap-2 mb-2 text-red-400 font-semibold text-sm">
                            <AlertTriangle className="h-4 w-4" />
                            <span>Issues ({issues.length})</span>
                          </div>
                          <div className="space-y-2 pl-6">
                            {issues.map((issue, idx) => (
                              <div key={idx} className="text-sm text-gray-300 leading-relaxed border-l-2 border-red-500/30 pl-3 py-1">
                                {issue.message}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {hasRecommendations && recommendations.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2 text-yellow-400 font-semibold text-sm">
                            <Lightbulb className="h-4 w-4" />
                            <span>Recommendations ({recommendations.length})</span>
                          </div>
                          <div className="space-y-2 pl-6">
                            {recommendations.map((rec, idx) => (
                              <div key={idx} className="text-sm text-gray-300 leading-relaxed border-l-2 border-yellow-500/30 pl-3 py-1">
                                {rec.message}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
} 