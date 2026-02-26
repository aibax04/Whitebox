
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle } from "lucide-react";
import CodeDisplay from "@/components/CodeDisplay";
import { TestCase, TestResult } from '../types';

interface TestCaseListProps {
  testCases: TestCase[];
  testResults: { details: TestResult[] } | null;
  fileName: string | null;
}

export default function TestCaseList({ testCases, testResults, fileName }: TestCaseListProps) {
  return (
    <Card className="border border-squadrun-primary/20 bg-squadrun-darker/50 h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Generated Test Cases</CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100%-60px)] overflow-auto">
        <div className="space-y-4">
          {testCases.map(test => (
            <div key={test.id} className="border border-squadrun-primary/10 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-medium text-white">{test.name}</h3>
                  <p className="text-xs text-squadrun-gray">{test.type}</p>
                  <p className="text-sm text-squadrun-gray mt-1">{test.description}</p>
                </div>
                {testResults && (
                  <div>
                    {testResults.details.find((r) => r.id === test.id)?.passed ? 
                      <CheckCircle className="h-5 w-5 text-green-500" /> : 
                      <XCircle className="h-5 w-5 text-red-500" />
                    }
                  </div>
                )}
              </div>
              <CodeDisplay code={test.code} language={fileName?.split('.').pop() || 'python'} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
