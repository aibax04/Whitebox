
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle } from "lucide-react";
import { TestResults } from '../types';

interface TestResultsSummaryProps {
  testResults: TestResults;
}

export default function TestResultsSummary({ testResults }: TestResultsSummaryProps) {
  return (
    <Card className="border border-none bg-transparent h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Test Results</CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100%-60px)] overflow-auto">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-transparent rounded-md p-4">
            <h3 className="text-sm font-medium text-white mb-1">Test Summary</h3>
            <div className="flex justify-between text-sm text-squadrun-gray mb-3">
              <span>Passed: {testResults.passed}/{testResults.total}</span>
              <span>Failed: {testResults.failed}/{testResults.total}</span>
            </div>
            <Progress value={testResults.passed / testResults.total * 100} className="h-2 bg-squadrun-darker" />
          </div>
          
          <div className="bg-transparent rounded-md p-4">
            <h3 className="text-sm font-medium text-white mb-1">Code Coverage</h3>
            <div className="flex justify-between text-sm text-squadrun-gray mb-3">
              <span>Coverage: {testResults.coverage}%</span>
            </div>
            <Progress value={testResults.coverage} className="h-2 bg-squadrun-darker" />
          </div>
        </div>
        
        <div className="space-y-2">
          {testResults.details.map((result) => (
            <div 
              key={result.id} 
              className={`border p-3 rounded-md ${result.passed ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"}`}
            >
              <div className="flex items-center">
                {result.passed ? 
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" /> : 
                  <XCircle className="h-5 w-5 text-red-500 mr-2" />
                }
                <div>
                  <h3 className="font-medium text-white">{result.name}</h3>
                  <p className="text-xs text-squadrun-gray">{result.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
