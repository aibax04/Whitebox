import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlayCircle, TestTube, X } from "lucide-react";
import NoCodeMessage from "@/components/agents/quality/NoCodeMessage";
import { getFileLanguage } from "./utils/languageDetection";
import { generateTestCasesForLanguage, getRandomFailureReason } from "./utils/testGenerator";
import { TestCase, TestCaseProps, TestResults } from "./types";
import TestCaseList from "./components/TestCaseList";
import OriginalCode from "./components/OriginalCode";
import TestResultsSummary from "./components/TestResultsSummary";
import { toast } from "sonner";

export default function TestCaseGenerator({ fileContent, fileName, onClearFile }: TestCaseProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [testCases, setTestCases] = useState<TestCase[] | null>(null);
  const [testResults, setTestResults] = useState<TestResults | null>(null);
  const [language, setLanguage] = useState<string>('js');

  useEffect(() => {
    if (fileContent) {
      setTestCases(null);
      setTestResults(null);
      setLanguage(getFileLanguage(fileName));
    }
  }, [fileContent, fileName]);

  const handleGenerateTests = async () => {
    if (!fileContent) return;
    setIsGenerating(true);

    try {
      const generatedTestCases = await generateTestCasesForLanguage(fileContent, fileName, language);
      setTestCases(generatedTestCases);
    } catch (error) {
      console.error('Error generating test cases:', error);
      toast.error('Failed to generate test cases', {
        description: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRunTests = () => {
    if (!testCases) return;
    setIsRunning(true);

    setTimeout(() => {
      const totalTests = testCases.length;
      const passedTests = Math.floor(totalTests * 0.7) + Math.floor(Math.random() * (totalTests * 0.3));
      const failedTests = totalTests - passedTests;

      const details = testCases.map((test, index) => {
        const passed = index < passedTests || Math.random() > 0.3;
        return {
          id: test.id,
          name: test.name,
          passed: passed,
          message: passed ? "Test passed" : getRandomFailureReason(test.type)
        };
      });

      const coverage = Math.floor(65 + passedTests / totalTests * 25 + Math.random() * 10);
      const mockResults = {
        passed: passedTests,
        failed: failedTests,
        total: totalTests,
        coverage: Math.min(100, coverage),
        details: details
      };
      setTestResults(mockResults);
      setIsRunning(false);
    }, 2000);
  };

  const handleClear = () => {
    setTestCases(null);
    setTestResults(null);
    setIsGenerating(false);
    setIsRunning(false);
    if (onClearFile) onClearFile();
  };

  // Function to clear only test cases and results, but not the loaded file
  const handleClearResultsOnly = () => {
    setTestCases(null);
    setTestResults(null);
    setIsGenerating(false);
    setIsRunning(false);
    // Do NOT call onClearFile here
  };

  if (!fileContent) {
    return <NoCodeMessage />;
  }

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="mb-4">
        {fileName && (
          <p className="text-xl text-squadrun-gray mt-1">
            File: <span className="text-white font-semibold">{fileName}</span> 
          </p>
        )}
        <p className="text-sm text-squadrun-gray mb-2">
        {/* Language Detected: <span className="text-white font-semibold">{language.toUpperCase()}</span> */}
        </p>
      </div>
      
      <div className="flex-1 flex flex-col">
        {!testCases ? (
          <div className="flex-1 flex flex-col">
            <div className="flex gap-2 mb-4 justify-end">
              <Button 
                onClick={handleGenerateTests} 
                className="bg-squadrun-primary hover:bg-squadrun-vivid text-white" 
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>Generating...</>
                ) : (
                  <>
                    <TestTube className="mr-2 h-4 w-4" /> Generate Test Cases
                  </>
                )}
              </Button>
              <Button 
                onClick={testResults ? handleClearResultsOnly : handleClear} // Use different clear function based on results
                variant="destructive"
              >
                <X className="mr-2 h-4 w-4" />
                Clear
              </Button>
            </div>
            <OriginalCode fileContent={fileContent} fileName={fileName} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="flex gap-2 mb-4 justify-end">
              {!testResults ? (
                <Button 
                  onClick={handleRunTests} 
                  className="bg-squadrun-primary hover:bg-squadrun-vivid text-white" 
                  disabled={isRunning}
                >
                  {isRunning ? (
                    <>Running tests...</>
                  ) : (
                    <>
                      <PlayCircle className="mr-2 h-4 w-4" /> Run Tests
                    </>
                  )}
                </Button>
              ) : (
                <Button 
                  onClick={handleRunTests} 
                  className="bg-squadrun-primary hover:bg-squadrun-vivid text-white" 
                  disabled={isRunning}
                >
                  {isRunning ? (
                    <>Running tests...</>
                  ) : (
                    <>
                      <PlayCircle className="mr-2 h-4 w-4" /> Run Tests Again
                    </>
                  )}
                </Button>
              )}
              <Button 
                onClick={testResults ? handleClearResultsOnly : handleClear} 
                variant="destructive"
              >
                <X className="mr-2 h-4 w-4" />
                Clear
              </Button>
            </div>

            <Tabs defaultValue="testcases" className="flex-1 flex flex-col">
              <TabsList className="mb-4 bg-transparent">
                <TabsTrigger value="testcases">Test Cases</TabsTrigger>
                <TabsTrigger value="original">Original Code</TabsTrigger>
                {testResults && <TabsTrigger value="results">Test Results</TabsTrigger>}
              </TabsList>
              
              <TabsContent value="original" className="flex-1 mt-0">
                <OriginalCode fileContent={fileContent} fileName={fileName} />
              </TabsContent>
              
              <TabsContent value="testcases" className="flex-1 mt-0">
                <TestCaseList testCases={testCases} testResults={testResults} fileName={fileName} />
              </TabsContent>
              
              {testResults && (
                <TabsContent value="results" className="flex-1 mt-0">
                  <TestResultsSummary testResults={testResults} />
                </TabsContent>
              )}
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
