
import { useState } from 'react';
import { getCodeCompletion } from '@/utils/aiUtils';
import { toast } from 'sonner';

export interface CompletionResult {
  code: string;
  metrics?: {
    readabilityScore?: number;
    maintainabilityScore?: number;
    performanceScore?: number;
    securityScore?: number;
    codeSmellScore?: number;
  };
  improvements?: string[];
}

export const useCodeCompletion = (language: string = 'typescript') => {
  const [isLoading, setIsLoading] = useState(false);
  const [completion, setCompletion] = useState<CompletionResult | null>(null);

  const complete = async (prompt: string): Promise<CompletionResult | null> => {
    setIsLoading(true);
    try {
      const result = await getCodeCompletion(prompt, language);
      
      // Create a completion result with metrics
      const completionResult: CompletionResult = {
        code: result,
        metrics: {
          readabilityScore: calculateReadabilityScore(result),
          maintainabilityScore: calculateMaintainabilityScore(result),
          performanceScore: calculatePerformanceScore(result),
          securityScore: calculateSecurityScore(result),
          codeSmellScore: calculateCodeSmellScore(result),
        },
        improvements: generateImprovementSuggestions(result)
      };
      
      setCompletion(completionResult);
      return completionResult;
    } catch (error) {
      toast.error("Failed to get code completion", {
        description: error instanceof Error ? error.message : "An error occurred"
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Simple scoring functions - in a real implementation these would be more sophisticated
  const calculateReadabilityScore = (code: string): number => {
    const lines = code.split('\n');
    const longLines = lines.filter(line => line.length > 80).length;
    const longLinePercentage = longLines / lines.length;
    return Math.round(100 - (longLinePercentage * 100));
  };

  const calculateMaintainabilityScore = (code: string): number => {
    const functionMatches = code.match(/function\s+\w+\s*\(|const\s+\w+\s*=\s*\(.*\)\s*=>/g) || [];
    const commentLines = (code.match(/\/\/|\/\*|\*\//g) || []).length;
    const codeLines = code.split('\n').length;
    
    const commentRatio = commentLines / codeLines;
    const functionCount = functionMatches.length;
    
    let score = 90; // Base score
    
    if (commentRatio > 0.1) score += 15;
    if (functionCount > 0 && codeLines / functionCount < 30) score += 15;
    
    return Math.min(100, score);
  };

  const calculatePerformanceScore = (code: string): number => {
    // Check for common performance issues
    const nestedLoops = (code.match(/for\s*\([^)]*\)[^{]*{[^}]*for\s*\(/g) || []).length;
    const largeArrayOperations = (code.match(/\.map\(|\.filter\(|\.reduce\(/g) || []).length;
    
    let score = 90; // Base score
    
    score -= nestedLoops * 10; // Nested loops are performance intensive
    score -= Math.max(0, largeArrayOperations - 2) * 5; // Too many array operations
    
    return Math.max(50, score);
  };

  const calculateSecurityScore = (code: string): number => {
    let score = 95; // Base score
    
    // Check for common security issues
    if (code.includes('eval(')) score -= 30;
    if (code.includes('innerHTML')) score -= 20;
    if (code.includes('dangerouslySetInnerHTML')) score -= 15;
    
    // Check for input sanitization
    const hasInputs = code.includes('input') || code.includes('form');
    const hasSanitization = code.includes('sanitize') || code.includes('trim') || 
                            code.includes('validate') || code.includes('escape');
    
    if (hasInputs && !hasSanitization) score -= 15;
    
    return Math.max(40, score);
  };

  const calculateCodeSmellScore = (code: string): number => {
    let score = 85; // Base score
    
    // Look for code smells
    const magicNumbers = (code.match(/\b\d+\b/g) || [])
      .filter(num => num !== '0' && num !== '1' && num.length > 1).length;
    
    const longFunctions = (code.match(/function\s+\w+\s*\([^)]*\)\s*{[^}]{500,}}/g) || []).length;
    const duplicatedStringLiterals = new Set(code.match(/"[^"]{5,}"/g) || []).size;
    
    score -= magicNumbers * 2;
    score -= longFunctions * 15;
    score -= Math.max(0, duplicatedStringLiterals - 3) * 5;
    
    return Math.max(50, score);
  };

  const generateImprovementSuggestions = (code: string): string[] => {
    const suggestions: string[] = [];
    
    // Look for magic numbers
    if ((code.match(/\b\d+\b/g) || []).filter(num => num !== '0' && num !== '1' && num.length > 1).length > 2) {
      suggestions.push("Replace magic numbers with named constants");
    }
    
    // Look for long functions
    if ((code.match(/function\s+\w+\s*\([^)]*\)\s*{[^}]{200,}}/g) || []).length > 0) {
      suggestions.push("Break down long functions into smaller ones");
    }
    
    // Look for inadequate comments
    const commentLines = (code.match(/\/\/|\/\*|\*\//g) || []).length;
    const codeLines = code.split('\n').length;
    
    if (codeLines > 50 && commentLines / codeLines < 0.1) {
      suggestions.push("Add more comments to explain complex logic");
    }
    
    // Look for nested conditionals
    if ((code.match(/if\s*\([^)]*\)\s*{[^}]*if\s*\(/g) || []).length > 1) {
      suggestions.push("Refactor nested conditionals with early returns or guard clauses");
    }
    
    return suggestions;
  };

  return {
    complete,
    isLoading,
    completion,
    clearCompletion: () => setCompletion(null)
  };
};
