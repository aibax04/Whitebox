import { useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import * as Diff from 'diff';
import { QualityResults } from '@/types/codeQuality';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface HighlightedCodeCompareProps {
  originalCode: string;
  refactoredCode: string;
  language: string;
  originalScore?: QualityResults | null;
  refactoredScore?: QualityResults | null;
}

// Map file extensions to SyntaxHighlighter language support
const languageMap: Record<string, string> = {
  'py': 'python',
  'js': 'javascript',
  'ts': 'typescript',
  'jsx': 'jsx',
  'tsx': 'tsx',
  'html': 'html',
  'css': 'css',
  'java': 'java',
  'cpp': 'cpp',
  'c': 'c',
  'cs': 'csharp',
  'go': 'go',
  'rb': 'ruby',
  'rs': 'rust',
  'php': 'php',
  'sh': 'bash',
  'sql': 'sql',
  'json': 'json',
  'md': 'markdown',
  'xml': 'xml',
  'yaml': 'yaml',
  'yml': 'yaml',
};

export default function HighlightedCodeCompare({ 
  originalCode, 
  refactoredCode, 
  language, 
  originalScore, 
  refactoredScore 
}: HighlightedCodeCompareProps) {
  const [highlightLanguage, setHighlightLanguage] = useState<string>('javascript');
  const [originalHighlightedLines, setOriginalHighlightedLines] = useState<number[]>([]);
  const [refactoredHighlightedLines, setRefactoredHighlightedLines] = useState<number[]>([]);
  
  // Helper function to get score color based on score value
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  // Helper function to get score text color
  const getScoreTextColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };
  
  // Process the code to find which lines were modified
  useEffect(() => {
    // Determine the language for syntax highlighting
    if (language) {
      const lang = languageMap[language.toLowerCase()] || 'javascript';
      setHighlightLanguage(lang);
    }

    // Calculate which lines were changed
    const originalLines = originalCode.split('\n');
    const refactoredLines = refactoredCode.split('\n');
    
    // Use Diff to find changes between the two files
    const diff = Diff.diffLines(originalCode, refactoredCode);
    
    const changedOriginalLines: number[] = [];
    const changedRefactoredLines: number[] = [];
    
    let originalLineNumber = 0;
    let refactoredLineNumber = 0;
    
    diff.forEach(part => {
      if (part.removed) {
        // This part was in the original but removed in the refactored
        part.value.split('\n').forEach((_, i) => {
          if (part.value.split('\n')[i] !== '') {
            changedOriginalLines.push(originalLineNumber + i);
          }
        });
        originalLineNumber += part.count || 0;
      } else if (part.added) {
        // This part was added in the refactored
        part.value.split('\n').forEach((_, i) => {
          if (part.value.split('\n')[i] !== '') {
            changedRefactoredLines.push(refactoredLineNumber + i);
          }
        });
        refactoredLineNumber += part.count || 0;
      } else {
        // This part is unchanged
        originalLineNumber += part.count || 0;
        refactoredLineNumber += part.count || 0;
      }
    });
    
    setOriginalHighlightedLines(changedOriginalLines);
    setRefactoredHighlightedLines(changedRefactoredLines);
  }, [originalCode, refactoredCode, language]);

  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-squadrun-gray text-sm font-medium">Original Code</h4>
          {originalScore && (
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={`${getScoreTextColor(originalScore.score)} border-current`}
              >
                Score: {originalScore.score}
              </Badge>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="w-full h-full overflow-auto bg-transparent rounded-md">
            <SyntaxHighlighter
              language={highlightLanguage}
              style={vscDarkPlus}
              customStyle={{
                margin: 0,
                padding: '16px',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                lineHeight: '1.5rem',
                height: '100%',
                background: 'transparent',
              }}
              showLineNumbers
              wrapLongLines
              lineProps={(lineNumber) => {
                const style = originalHighlightedLines.includes(lineNumber - 1) 
                  ? { backgroundColor: 'rgba(255, 70, 70, 0.2)', display: 'block', width: '100%' } 
                  : { display: 'block' };
                return { style };
              }}
            >
              {originalCode}
            </SyntaxHighlighter>
          </div>
        </div>
        {/* Card with breakdown is removed as requested */}
      </div>
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-squadrun-gray text-sm font-medium">Refactored Code</h4>
          {refactoredScore && (
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={`${getScoreTextColor(refactoredScore.score)} border-current`}
              >
                Score: {refactoredScore.score}
              </Badge>
              {originalScore && (
                <Badge 
                  variant="outline" 
                  className={`${
                    refactoredScore.score > originalScore.score 
                      ? 'text-green-400 border-green-400' 
                      : refactoredScore.score < originalScore.score 
                        ? 'text-red-400 border-red-400' 
                        : 'text-yellow-400 border-yellow-400'
                  }`}
                >
                  {refactoredScore.score > originalScore.score ? '↗' : 
                   refactoredScore.score < originalScore.score ? '↘' : '→'} 
                  {Math.abs(refactoredScore.score - originalScore.score)}
                </Badge>
              )}
            </div>
          )}
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="w-full h-full overflow-auto bg-transparent rounded-md">
            <SyntaxHighlighter
              language={highlightLanguage}
              style={vscDarkPlus}
              customStyle={{
                margin: 0,
                padding: '16px',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                lineHeight: '1.5rem',
                height: '100%',
                background: 'transparent',
              }}
              showLineNumbers
              wrapLongLines
              lineProps={(lineNumber) => {
                const style = refactoredHighlightedLines.includes(lineNumber - 1)
                  ? { backgroundColor: 'rgba(70, 255, 70, 0.2)', display: 'block', width: '100%' }
                  : { display: 'block' };
                return { style };
              }}
            >
              {refactoredCode}
            </SyntaxHighlighter>
          </div>
        </div>
        {/* {refactoredScore && (
          <Card className="mt-2 bg-squadrun-darker/50 border-squadrun-primary/20">
            <CardContent className="p-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-squadrun-gray">Readability:</span>
                  <span className={getScoreTextColor(refactoredScore.readabilityScore)}>
                    {refactoredScore.readabilityScore}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-squadrun-gray">Maintainability:</span>
                  <span className={getScoreTextColor(refactoredScore.maintainabilityScore)}>
                    {refactoredScore.maintainabilityScore}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-squadrun-gray">Performance:</span>
                  <span className={getScoreTextColor(refactoredScore.performanceScore)}>
                    {refactoredScore.performanceScore}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-squadrun-gray">Security:</span>
                  <span className={getScoreTextColor(refactoredScore.securityScore)}>
                    {refactoredScore.securityScore}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )} */}
      </div>
    </div>
  );
}
