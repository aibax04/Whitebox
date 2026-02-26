import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, RefreshCw, BarChart3, ArrowRight, Code2 } from "lucide-react";
import jsPDF from 'jspdf';
import { addPDFHeader, addFormattedContent, addFooter, generateTechnicalPDFBlob } from './PDFExporter';
import InteractiveTechnicalDashboard from "./InteractiveTechnicalDashboard";
import { exportTechnicalToPDF } from "./PDFExporter";
import { generateTechnicalDocument } from "@/utils/aiUtils/documentGeneration";
import { generateAdvancedTechnicalDocument } from "@/utils/aiUtils/advancedDocumentGeneration";
import { toast } from "sonner";
import RichTextEditorModal from './RichTextEditorModal';
import { FaGithub } from "react-icons/fa";


interface FileData {
  path: string;
  content: string;
}

interface TechnicalDocumentGeneratorProps {
  fileContent?: string | null;
  fileName?: string | null;
  repoFiles?: FileData[] | null;
  repoUrl?: string | null;
  repoUrls?: string[] | null;
  useAdvancedAnalysis?: boolean;
}

export default function TechnicalDocumentGenerator({
  fileContent,
  fileName,
  repoFiles,
  repoUrl,
  useAdvancedAnalysis = false
}: TechnicalDocumentGeneratorProps) {
  const [isGeneratingDashboard, setIsGeneratingDashboard] = useState(false);
  const [isGeneratingDocument, setIsGeneratingDocument] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [dashboardAnalyzed, setDashboardAnalyzed] = useState(false);
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

  const handleGenerateDashboard = async () => {
    setIsGeneratingDashboard(true);
    try {
      setShowDashboard(true);
    } catch (error) {
      console.error("Error generating dashboard:", error);
      toast.error("Failed to generate technical dashboard. Please try again.");
      setIsGeneratingDashboard(false);
    }
  };

  const handleGenerateDocument = async () => {
    setIsGeneratingDocument(true);
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
        documentContent = await generateAdvancedTechnicalDocument(filesToAnalyze, repoUrl || "", progressCallback);
        setAnalysisProgress(null);
      } else {
        documentContent = await generateTechnicalDocument(filesToAnalyze, repoUrl || "");
      }
      
      setCachedDocumentContent(documentContent);
      setEditorContent(documentContent);
      const doc = new jsPDF();
      let yPosition = addPDFHeader(doc, 'Technical Overview Document', '', repoUrl);
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
      toast.success(`Technical document generated successfully using ${useAdvancedAnalysis ? 'advanced' : 'standard'} analysis!`);
    } catch (error) {
      console.error("Error generating technical document:", error);
      toast.error("Failed to generate technical document. Please try again.");
    } finally {
      setIsGeneratingDocument(false);
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
      await exportTechnicalToPDF(filesToAnalyze, repoUrl || "", content);
      toast.success("Technical report downloaded successfully!");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Failed to download PDF. Please try again.");
    }
  };

  const handleDashboardComplete = () => {
    setIsGeneratingDashboard(false);
    setDashboardAnalyzed(true);
    toast.success("Technical dashboard generated successfully!");
  };

  const hasData = (repoFiles && repoFiles.length > 0) || fileContent;

  return (
    <div className="space-y-4 h-full flex flex-col">
      <Card className="bg-transparent border-none justify-center w-full max-w-5xl mx-auto">
        <CardContent className="p-6 mt-4">
          <p className="text-gray-200 mb-6 text-sm leading-relaxed text-center">
            Generate comprehensive technical analysis including technology stack, code quality metrics, 
            and project insights based on your repository analysis.
          </p>
          
          <div className="flex justify-end gap-5">
            <Button 
              onClick={handleGenerateDashboard}
              disabled={!hasData || isGeneratingDashboard}
              className="bg-gray-800 hover:bg-gray-700 text-white border"
            >
              {isGeneratingDashboard ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <BarChart3 className="w-4 h-4 mr-2" />
              )}
              {isGeneratingDashboard ? "Generating..." : "Generate Dashboard"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            
            <Button 
              onClick={handleGenerateDocument}
              disabled={isGeneratingDocument || !hasData}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isGeneratingDocument ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              {isGeneratingDocument ? "Generating..." : "Generate Document"}
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

      {showDashboard && hasData && (
        <div className="flex-1 overflow-auto">
          <InteractiveTechnicalDashboard 
            repoFiles={repoFiles || []}
            repoUrl={repoUrl || ""}
            onLoadingChange={handleDashboardComplete}
            shouldAnalyze={!dashboardAnalyzed}
          />
        </div>
      )}

      {!hasData && (
        <Card className="bg-gray-900 border border-gray-700 flex-1">
          <CardContent className="p-8 text-center flex flex-col justify-center">
            <Code2 className="w-12 h-12 text-purple-500 mx-auto mb-4" />
            <p className="text-gray-400">
              No code files available for technical analysis. Please upload files or select a repository.
            </p>
          </CardContent>
        </Card>
      )}
      
      <RichTextEditorModal
        visible={showEditorModal}
        initialContent={editorContent || ''}
        title="Technical Document"
        repoUrl={repoUrl || ''}
        onClose={() => setShowEditorModal(false)}
        onDownloadPDF={handleEditorDownloadPDF}
        generatePDFBlob={(content, title) => {
          const filesToUse = repoFiles && repoFiles.length > 0 
            ? repoFiles 
            : (fileContent ? [{ path: fileName || "file", content: fileContent }] : []);
          return generateTechnicalPDFBlob(content, title, repoUrl || '', filesToUse);
        }}
      />
    </div>
  );
}
