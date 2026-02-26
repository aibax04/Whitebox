
import React from 'react';
import CodeDisplay from '@/components/CodeDisplay';
import { CompletionResult } from '@/hooks/useCodeCompletion';
import { 
  BookOpen, 
  Code2, 
  Zap, 
  Shield, 
  AlertTriangle 
} from 'lucide-react';

interface CodeComparisonProps {
  originalCode: string;
  refactoredCode: string | CompletionResult;
  language: string;
}

const CodeComparison = ({ originalCode, refactoredCode, language }: CodeComparisonProps) => {
  // Handle both string and CompletionResult types
  const refactoredCodeString = typeof refactoredCode === 'string' 
    ? refactoredCode 
    : refactoredCode.code;
  
  const metrics = typeof refactoredCode === 'object' && refactoredCode.metrics 
    ? refactoredCode.metrics 
    : null;
  
  const improvements = typeof refactoredCode === 'object' && refactoredCode.improvements 
    ? refactoredCode.improvements 
    : null;

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4 bg-squadrun-darker p-3 rounded-md">
        <div className="flex items-center">
          <h3 className="text-white font-medium">Code Comparison</h3>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 h-full">
        <div className="h-full flex flex-col">
          <h4 className="text-squadrun-gray mb-2 text-sm font-medium">Original Code</h4>
          <div className="flex-1 overflow-hidden">
            <CodeDisplay code={originalCode} language={language} />
          </div>
        </div>
        
        <div className="h-full flex flex-col">
          <h4 className="text-squadrun-gray mb-2 text-sm font-medium">Refactored Code</h4>
          
          {metrics && (
            <div className="mb-3 bg-squadrun-darker/30 p-2 rounded-md grid grid-cols-5 gap-1">
              <div className="flex flex-col items-center">
                <BookOpen className="h-4 w-4 text-blue-400 mb-1" />
                <div className="text-xs text-center">
                  <div className="font-semibold">{metrics.readabilityScore || 0}%</div>
                  <div className="text-squadrun-gray text-[10px]">Readability</div>
                </div>
              </div>
              
              <div className="flex flex-col items-center">
                <Code2 className="h-4 w-4 text-green-400 mb-1" />
                <div className="text-xs text-center">
                  <div className="font-semibold">{metrics.maintainabilityScore || 0}%</div>
                  <div className="text-squadrun-gray text-[10px]">Maintainability</div>
                </div>
              </div>
              
              <div className="flex flex-col items-center">
                <Zap className="h-4 w-4 text-yellow-400 mb-1" />
                <div className="text-xs text-center">
                  <div className="font-semibold">{metrics.performanceScore || 0}%</div>
                  <div className="text-squadrun-gray text-[10px]">Performance</div>
                </div>
              </div>
              
              <div className="flex flex-col items-center">
                <Shield className="h-4 w-4 text-purple-400 mb-1" />
                <div className="text-xs text-center">
                  <div className="font-semibold">{metrics.securityScore || 0}%</div>
                  <div className="text-squadrun-gray text-[10px]">Security</div>
                </div>
              </div>
              
              <div className="flex flex-col items-center">
                <AlertTriangle className="h-4 w-4 text-red-400 mb-1" />
                <div className="text-xs text-center">
                  <div className="font-semibold">{metrics.codeSmellScore || 0}%</div>
                  <div className="text-squadrun-gray text-[10px]">Code Smell</div>
                </div>
              </div>
            </div>
          )}
          
          {improvements && improvements.length > 0 && (
            <div className="mb-3 bg-squadrun-darker/30 p-2 rounded-md">
              <div className="text-xs text-squadrun-gray mb-1">Improvement Suggestions:</div>
              <ul className="text-xs list-disc list-inside">
                {improvements.map((improvement, index) => (
                  <li key={index} className="text-squadrun-gray">{improvement}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="flex-1 overflow-hidden">
            <CodeDisplay code={refactoredCodeString} language={language} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeComparison;
