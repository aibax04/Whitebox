import React from 'react';
import mermaid from 'mermaid';
import { useNavigate } from 'react-router-dom';
import AppSidebar from '@/components/Sidebar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, LogOut, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  FileUploadCard,
  DiagramTypeSelector,
  DiagramDisplay,
} from '@/components/diagram-generation';
import { useDiagramGeneration } from '@/hooks/diagram/useDiagramGeneration';
import Frame_4 from '@/assets/images/Frame_4.png';
import Admin from '@/assets/images/Dashboard/Admin.png';

// Initialize mermaid
mermaid.initialize({
  startOnLoad: true,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'monospace',
  fontSize: 14,
});

const DiagramGenerationPRD = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const {
    uploadedFile,
    diagramType,
    isGenerating,
    generatedDiagram,
    error,
    showCodeEditor,
    editableDiagram,
    setDiagramType,
    setError,
    setShowCodeEditor,
    setEditableDiagram,
    setInputMode,
    handleFileUpload,
    generateDiagram,
    applyManualEdit,
    clearDiagram,
    resetEditableCode,
    handleAiEdit,
    generateRealisticDiagram,
    isGeneratingRealistic,
    realisticDiagram,
  } = useDiagramGeneration();

  // Set input mode to PRD
  React.useEffect(() => {
    setInputMode('prd');
  }, [setInputMode]);

  return (
    <div className="flex h-screen bg-[#010409] w-full">
      <AppSidebar />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-14 border-b border-[#21262d] flex items-center justify-between px-6 py-[11px] bg-[#010409]">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/diagram-generation')}
              className="text-gray-400 hover:text-white hover:bg-[#161b22]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <img src={Frame_4} className="w-5 h-5" alt="Diagram" />
              <h1 className="text-gray-300 text-l">Diagram Generation - Upload PRD</h1>
            </div>
          </div>
          
          {/* Right Side */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              className="h-[34px] px-[13px] py-[7px] bg-[#0d1117] border-[#21262d] text-[#c9d1d9] hover:bg-[#161b22] rounded-[22px]"
              onClick={logout}
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
            
            {/* Admin Panel */}
            {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'user') && (
              <Button
                variant="outline"
                className="h-[34px] px-[13px] py-[7px] bg-[#0d1117] border-[#21262d] text-[#c9d1d9] hover:bg-[#161b22] rounded-[22px]"
                onClick={() => navigate('/admin')}
              >
                <img src={Admin} className="w-4 h-4" alt="Admin" />
                Admin Panel
              </Button>
            )}
            
            {/* User Avatar */}
            <div className="w-[34px] h-[34px] rounded-full overflow-hidden">
              <img
                src={user?.picture}
                alt={user?.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-[#010409] p-8">
          <div className="max-w-6xl mx-auto">
            <FileUploadCard uploadedFile={uploadedFile} onFileUpload={handleFileUpload} />

            {uploadedFile && (
              <DiagramTypeSelector
                diagramType={diagramType}
                isGenerating={isGenerating}
                onDiagramTypeChange={setDiagramType}
                onGenerate={generateDiagram}
              />
            )}

            {error && (
              <Alert className="mb-6 bg-red-900/20 border-red-800">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-red-300">{error}</AlertDescription>
              </Alert>
            )}

            {generatedDiagram && (
              <DiagramDisplay
                generatedDiagram={generatedDiagram}
                diagramType={diagramType}
                showCodeEditor={showCodeEditor}
                editableDiagram={editableDiagram}
                error={error}
                onToggleCodeEditor={() => {
                  setShowCodeEditor(!showCodeEditor);
                  if (!showCodeEditor) {
                    setEditableDiagram(generatedDiagram);
                  }
                }}
                onCodeChange={setEditableDiagram}
                onApplyEdit={applyManualEdit}
                onResetEdit={resetEditableCode}
                onClearDiagram={clearDiagram}
                onSetError={setError}
                onAiEdit={handleAiEdit}
                onGenerateRealisticDiagram={generateRealisticDiagram}
                isGeneratingRealistic={isGeneratingRealistic}
                realisticDiagram={realisticDiagram}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DiagramGenerationPRD;

