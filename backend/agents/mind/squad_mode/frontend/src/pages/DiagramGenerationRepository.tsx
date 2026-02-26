import mermaid from 'mermaid';
import { useNavigate } from 'react-router-dom';
import AppSidebar from '@/components/Sidebar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, LogOut, ArrowLeft, GitBranch } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  DiagramTypeSelector,
  DiagramDisplay,
} from '@/components/diagram-generation';
import DiagramRepoSelector from '@/components/diagram-generation/DiagramRepoSelector';
import { useDiagramGeneration } from '@/hooks/diagram/useDiagramGeneration';
import Frame_4 from '@/assets/images/Frame_4.png';
import Admin from '@/assets/images/Dashboard/Admin.png';
import React from 'react';

// Initialize mermaid
mermaid.initialize({
  startOnLoad: true,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'monospace',
  fontSize: 14,
});

const DiagramGenerationRepository = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const {
    diagramType,
    isGenerating,
    generatedDiagram,
    error,
    showCodeEditor,
    editableDiagram,
    selectedRepo,
    setDiagramType,
    setError,
    setShowCodeEditor,
    setEditableDiagram,
    setInputMode,
    generateDiagram,
    applyManualEdit,
    clearDiagram,
    resetEditableCode,
    handleRepositorySelect,
    clearRepository,
    handleAiEdit,
    generateRealisticDiagram,
    isGeneratingRealistic,
    realisticDiagram,
  } = useDiagramGeneration();

  const [showDiagramGeneration, setShowDiagramGeneration] = React.useState(false);

  // Set input mode to repository
  React.useEffect(() => {
    setInputMode('repo');
  }, [setInputMode]);

  // Handle repository selection and move to generation screen
  const handleRepoSelect = (repo: any) => {
    handleRepositorySelect(repo);
    setShowDiagramGeneration(true);
  };

  // Handle back to repository selection
  const handleBackToRepoSelection = () => {
    setShowDiagramGeneration(false);
    clearRepository();
    setDiagramType('');
    clearDiagram();
  };

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
              <h1 className="text-gray-300 text-l">Diagram Generation - Load Repository</h1>
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
            {!showDiagramGeneration ? (
              /* Repository Selection Screen */
              <DiagramRepoSelector onRepositorySelect={handleRepoSelect} />
            ) : (
              /* Diagram Generation Screen */
              <>
                {/* Repository Info Card */}
                {selectedRepo && (
                  <div className="mb-6">
                    <Button
                      onClick={handleBackToRepoSelection}
                      variant="ghost"
                      size="sm"
                      className="mb-4 text-gray-400 hover:text-white hover:bg-[#161b22]"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Change Repository
                    </Button>
                    
                    <div className="p-6 bg-[#1a1f2e] border border-gray-700 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center flex-shrink-0">
                            <GitBranch className="w-6 h-6 text-purple-500" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-white mb-1">
                              {selectedRepo.full_name}
                            </h3>
                            {selectedRepo.description && (
                              <p className="text-gray-400 text-sm mb-2">
                                {selectedRepo.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              {selectedRepo.language && (
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                  {selectedRepo.language}
                                </span>
                              )}
                              {selectedRepo.repoFiles && (
                                <span>
                                  {selectedRepo.repoFiles.length} files loaded
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Diagram Type Selector */}
                <DiagramTypeSelector
                  diagramType={diagramType}
                  isGenerating={isGenerating}
                  onDiagramTypeChange={setDiagramType}
                  onGenerate={generateDiagram}
                />

                {/* Error Display */}
                {error && (
                  <Alert className="mb-6 bg-red-900/20 border-red-800">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <AlertDescription className="text-red-300">{error}</AlertDescription>
                  </Alert>
                )}

                {/* Generated Diagram Display */}
                {generatedDiagram && (
                  <DiagramDisplay
                    generatedDiagram={generatedDiagram}
                    diagramType={diagramType}
                    showCodeEditor={showCodeEditor}
                    editableDiagram={editableDiagram}
                    error={error}
                    repoUrl={selectedRepo?.repoUrl}
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
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DiagramGenerationRepository;

