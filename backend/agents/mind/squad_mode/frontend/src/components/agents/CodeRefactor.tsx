import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowRightCircle, 
  Download, 
  RefreshCw,
  Cpu,
  X,
  Copy,
  Check
} from "lucide-react";
import CodeDisplay from "@/components/CodeDisplay";
import { toast } from "sonner";
import { refactorCodeWithAI } from "@/utils/aiUtils";
import { analyzeCodeWithAI } from "@/utils/aiUtils/codeAnalysis";
import { QualityResults } from "@/types/codeQuality";
import HighlightedCodeCompare from "@/components/HighlightedCodeCompare";

interface CodeRefactorProps {
  fileContent: string | null;
  fileName: string | null;
  onClearFile?: () => void;
}

export default function CodeRefactor({ fileContent, fileName, onClearFile }: CodeRefactorProps) {
  const [refactoredCode, setRefactoredCode] = useState<string | null>(null);
  const [isRefactoring, setIsRefactoring] = useState(false);
  const [language, setLanguage] = useState<string>('js');
  const [originalScore, setOriginalScore] = useState<QualityResults | null>(null);
  const [refactoredScore, setRefactoredScore] = useState<QualityResults | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    setRefactoredCode(null);
    setOriginalScore(null);
    setRefactoredScore(null);
    setIsCopied(false);
    if (fileName) {
      const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
      setLanguage(fileExtension);
    }
  }, [fileContent, fileName]);

  const handleRefactor = async () => {
    if (!fileContent) return;
    
    setIsRefactoring(true);
    setIsAnalyzing(true);
    
    try {
      toast.info("Starting AI-powered refactoring", {
        description: "This may take a moment for larger files."
      });
      
      // Calculate original code quality score
      const originalQuality = await analyzeCodeWithAI(fileContent, language, false);
      setOriginalScore(originalQuality);
      
      // Refactor the code
      const result = await refactorCodeWithAI(fileContent, language);
      
      // Calculate refactored code quality score (pass true to indicate this is refactored code)
      const refactoredQuality = await analyzeCodeWithAI(result, language, true);
      setRefactoredScore(refactoredQuality);
      
      toast.success("AI-powered refactoring complete", {
        description: `Quality improved from ${originalQuality.score} to ${refactoredQuality.score}`
      });
      
      setRefactoredCode(result);
      
    } catch (error) {
      console.error("Refactoring error:", error);
      toast.error("Refactoring failed", {
        description: error instanceof Error ? error.message : "An error occurred during refactoring."
      });
    } finally {
      setIsRefactoring(false);
      setIsAnalyzing(false);
    }
  };

  const handleCopy = async () => {
    if (!refactoredCode) return;
    
    try {
      await navigator.clipboard.writeText(refactoredCode);
      setIsCopied(true);
      toast.success("Code copied to clipboard", {
        description: "Refactored code has been copied successfully"
      });
      
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Failed to copy code", {
        description: "Please try again or copy manually"
      });
    }
  };

  const handleDownload = () => {
    if (!refactoredCode || !fileName) return;
    
    const element = document.createElement("a");
    const file = new Blob([refactoredCode], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    
    const fileNameParts = fileName.split(".");
    const extension = fileNameParts.pop();
    const newFileName = fileNameParts.join(".") + "-refactored." + extension;
    
    element.download = newFileName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    toast.success("Download started", {
      description: `File saved as ${newFileName}`
    });
  };

  const handleClear = () => {
    setRefactoredCode(null);
    setOriginalScore(null);
    setRefactoredScore(null);
    setIsCopied(false);
    if (onClearFile) {
      onClearFile();
    } else {
      toast.success("Refactoring cleared", {
        description: "You can now upload a new file."
      });
    }
  };

  if (!fileContent) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <Cpu className="h-16 w-16 text-squadrun-primary mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">No Code Selected</h2>
        <p className="text-squadrun-gray text-center">
          Please upload a file or select a file from a repository to start refactoring.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 h-full flex flex-col gap-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          {/* <h2 className="text-xl font-bold text-white">AI-Powered Code Refactoring</h2> */}
          {/* <p className="text-sm text-squadrun-gray">Using advanced AI to improve your code quality</p> */}
          {fileName && (
            <p className="text-xl text-squadrun-gray mt-1">
              File: <span className="text-white font-semibold">{fileName}</span>
            </p>
          )}
          <p className="text-sm text-squadrun-gray mb-2">
            {/* Language Detected: <span className="text-white font-semibold">{language.toUpperCase()}</span> */}
          </p>
        </div>
        <div className="flex justify-end">
          <Button 
                onClick={handleRefactor} 
                className="bg-squadrun-primary hover:bg-squadrun-vivid text-white"
                disabled={isRefactoring || isAnalyzing}
              >
                {(isRefactoring || isAnalyzing) ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    {isAnalyzing ? "Analyzing..." : "Refactoring..."}
                  </>
                ) : (
                  <>
                    <ArrowRightCircle className="mr-2 h-4 w-4" />
                    Refactor Code
                  </>
                )}
          </Button>
        </div>
      </div>
      
      {!refactoredCode ? (
        <div className="border border-squadrun-primary/20">
        </div>
      ) : (
        <div className="flex flex-row gap-4 items-center">
          <Button 
            onClick={handleCopy} 
            variant="outline"
            className="border-squadrun-primary text-squadrun-primary hover:bg-squadrun-primary/10"
          >
            {isCopied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy Refactored Code
              </>
            )}
          </Button>
          <Button 
            onClick={handleDownload} 
            variant="outline"
            className="border-squadrun-primary text-squadrun-primary hover:bg-squadrun-primary/10"
          >
            <Download className="mr-2 h-4 w-4" />
            Download Refactored Code
          </Button>
          <Button 
            onClick={handleClear}
            variant="destructive"
          >
            <X className="mr-2 h-4 w-4" />
            Clear 
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {refactoredCode ? (
          <HighlightedCodeCompare 
            originalCode={fileContent} 
            refactoredCode={refactoredCode} 
            language={language}
            originalScore={originalScore}
            refactoredScore={refactoredScore}
          />
        ) : (
          <CodeDisplay code={fileContent} language={language} />
        )}
      </div>
    </div>
  );
}
