import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, RefreshCw, ArrowRight } from "lucide-react";
import jsPDF from 'jspdf';
import { addPDFHeader, addFormattedContent, addFooter, generateCodeQualityPDFBlob } from './PDFExporter';
import { generateCodeQualityDocument } from "@/utils/aiUtils/documentGeneration";
import { generateAdvancedCodeQualityDocument } from "@/utils/aiUtils/advancedDocumentGeneration";
import { exportCodeQualityToPDF } from "./PDFExporter";
import { toast } from "sonner";
import RichTextEditorModal from './RichTextEditorModal';
import { FaGithub } from "react-icons/fa";

interface FileData {
  path: string;
  content: string;
}

interface CodeQualityCompletenessCheckProps {
  fileContent?: string | null;
  fileName?: string | null;
  repoFiles?: FileData[] | null;
  repoUrl?: string | null;
  repoUrls?: string[] | null;
  useAdvancedAnalysis?: boolean;
}

export default function CodeQualityCompletenessCheck({
  fileContent,
  fileName,
  repoFiles,
  repoUrl,
  useAdvancedAnalysis = false
}: CodeQualityCompletenessCheckProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showDownloadButton, setShowDownloadButton] = useState(false);
  const [cachedDocumentContent, setCachedDocumentContent] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editorContent, setEditorContent] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<{ current: number; total: number; stage: string } | null>(null);
  const getRepoNameForFilename = (repoUrl?: string) => {
  if (!repoUrl) return 'local-files';
  const match = repoUrl.match(/[\w-]+(?:\.git)?$/);
  const name = match ? match[0].replace(/\.git$/, '') : repoUrl;
  return name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
};
  const repoName = getRepoNameForFilename(repoUrl);

  const handleGenerateDocument = async () => {
    setIsGenerating(true);
    try {
      let filesToAnalyze: FileData[] = [];
      if (repoFiles && repoFiles.length > 0) {
        filesToAnalyze = repoFiles;
      } else if (fileContent) {
        filesToAnalyze = [{ path: fileName || "file", content: fileContent }];
      } else {
        throw new Error("No files available for analysis");
      }

      // Use advanced analysis if toggle is enabled
      let documentContent: string;
      if (useAdvancedAnalysis) {
        let currentStep = 0;
        const totalSteps = 3; // Fetching files, Analyzing files, Generating document
        const progressCallback = (stage: string) => {
          currentStep++;
          setAnalysisProgress({ current: currentStep, total: totalSteps, stage });
        };
        documentContent = await generateAdvancedCodeQualityDocument(filesToAnalyze, repoUrl || "", progressCallback);
        setAnalysisProgress(null);
      } else {
        documentContent = await generateCodeQualityDocument(filesToAnalyze, repoUrl || "");
      }
      
      setCachedDocumentContent(documentContent);
      setEditorContent(documentContent);
      const doc = new jsPDF();
      let yPosition = addPDFHeader(doc, 'Code Completeness Assessment', '', repoUrl);
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 20;
      }
      addFormattedContent(doc, documentContent, yPosition);
      addFooter(doc);
      const pdfBlob = doc.output('blob');
      setPdfBlob(pdfBlob);
      setShowEditorModal(true);
      setShowDownloadButton(true);
      toast.success(`Code completeness document generated successfully using ${useAdvancedAnalysis ? 'advanced' : 'standard'} analysis!`);
    } catch (error) {
      console.error("Error generating code completeness document:", error);
      toast.error("Failed to generate code completeness document. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditorDownloadPDF = async (content: string) => {
    try {
      let filesToAnalyze: FileData[] = [];
      if (repoFiles && repoFiles.length > 0) {
        filesToAnalyze = repoFiles;
      } else if (fileContent) {
        filesToAnalyze = [{ path: fileName || "file", content: fileContent }];
      } else {
        throw new Error("No files available for analysis");
      }
      await exportCodeQualityToPDF(filesToAnalyze, repoUrl || "", content);
      toast.success("Code completeness report downloaded successfully!");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Failed to download PDF. Please try again.");
    }
  };

  const hasData = (repoFiles && repoFiles.length > 0) || fileContent;

  return (
    <div className="space-y-4 h-full flex flex-col">
      <Card className="bg-transparent border-none justify-center w-full max-w-5xl mx-auto">
        <CardContent className="p-6 mt-4">
        <p className="text-gray-200 mb-6 text-sm leading-relaxed text-center">
            Compare business requirements and technical specifications to identify gaps, 
            missing features, edge cases, and completeness issues.
          </p>
          
          <div className="flex justify-end gap-5">
            <Button 
              onClick={handleGenerateDocument}
              disabled={isGenerating || !hasData}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isGenerating ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckSquare className="w-4 h-4 mr-2" />
              )}
              {isGenerating ? "Analyzing..." : "Generate Document"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
          
          {/* Progress indicator for advanced analysis */}
          {analysisProgress && (
            <div className="mt-4 p-4 bg-squadrun-primary/20 border border-squadrun-primary/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-squadrun-primary text-sm font-medium">
                  {analysisProgress.stage}
                </span>
                <span className="text-squadrun-primary text-sm">
                  {analysisProgress.current}/{analysisProgress.total}
                </span>
              </div>
              <div className="w-full bg-squadrun-darker/60 rounded-full h-2">
                <div 
                  className="bg-squadrun-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(analysisProgress.current / analysisProgress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {!hasData && (
        <Card className="bg-gray-900 border border-gray-700 flex-1">
          <CardContent className="p-8 text-center flex flex-col justify-center">
            <CheckSquare className="w-12 h-12 text-purple-500 mx-auto mb-4" />
            <p className="text-gray-400">
              No code files available for quality completeness analysis. Please upload files or select a repository.
            </p>
          </CardContent>
        </Card>
      )}

      <RichTextEditorModal
        visible={showEditorModal}
        initialContent={editorContent || ''}
        title="Code Completeness Document"
        repoUrl={repoUrl || ''}
        onClose={() => setShowEditorModal(false)}
        onDownloadPDF={handleEditorDownloadPDF}
        generatePDFBlob={(content, title) => generateCodeQualityPDFBlob(content, title, repoUrl || '')}
      />
    </div>
  );
}
