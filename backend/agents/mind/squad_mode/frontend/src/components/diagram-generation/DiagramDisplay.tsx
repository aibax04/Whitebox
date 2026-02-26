import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Download, X, Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { CodeEditor } from './CodeEditor';

interface DiagramDisplayProps {
  generatedDiagram: string;
  diagramType: string;
  showCodeEditor: boolean;
  editableDiagram: string;
  error: string;
  repoUrl?: string;
  onToggleCodeEditor: () => void;
  onCodeChange: (code: string) => void;
  onApplyEdit: () => void;
  onResetEdit: () => void;
  onClearDiagram: () => void;
  onSetError: (error: string) => void;
  onAiEdit?: (prompt: string) => Promise<void>;
  onGenerateRealisticDiagram?: () => Promise<void>;
  isGeneratingRealistic?: boolean;
  realisticDiagram?: string;
}

export const DiagramDisplay: React.FC<DiagramDisplayProps> = ({
  generatedDiagram,
  diagramType,
  showCodeEditor,
  editableDiagram,
  error,
  repoUrl,
  onToggleCodeEditor,
  onCodeChange,
  onApplyEdit,
  onResetEdit,
  onClearDiagram,
  onSetError,
  onAiEdit,
  onGenerateRealisticDiagram,
  isGeneratingRealistic,
  realisticDiagram,
}) => {
  const diagramRef = useRef<HTMLDivElement>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isApplyingAiChanges, setIsApplyingAiChanges] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showRealisticView, setShowRealisticView] = useState(false);

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [aiPrompt]);

  const handleApplyAiChanges = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please enter a prompt for AI changes');
      return;
    }

    if (!onAiEdit) {
      toast.error('AI editing is not available');
      return;
    }

    setIsApplyingAiChanges(true);
    try {
      await onAiEdit(aiPrompt);
      setAiPrompt('');
      toast.success('AI changes applied successfully!');
    } catch (error) {
      console.error('AI editing error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to apply AI changes');
    } finally {
      setIsApplyingAiChanges(false);
    }
  };

  const downloadDiagram = () => {
    if (!diagramRef.current) return;

    const svg = diagramRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${diagramType}-diagram.svg`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Diagram downloaded successfully!');
  };

  // Render mermaid diagram when it changes
  useEffect(() => {
    if (generatedDiagram && diagramRef.current) {
      diagramRef.current.innerHTML = '';
      const uniqueId = `mermaid-${Date.now()}`;

      mermaid
        .render(uniqueId, generatedDiagram)
        .then(({ svg }) => {
          if (diagramRef.current) {
            diagramRef.current.innerHTML = svg;
          }
        })
        .catch((error) => {
          console.error('Mermaid rendering error:', error);
          console.error('Failed Mermaid code:', generatedDiagram);

          // Show detailed error message
          const errorMsg = error.message || 'Unknown error';
          onSetError(`Failed to render diagram: ${errorMsg}. Please try regenerating the diagram.`);
          toast.error('Diagram rendering failed. Please try again.');

          // Show the code in the diagram area for debugging
          if (diagramRef.current) {
            diagramRef.current.innerHTML = `
              <div class="text-red-400 p-4 rounded bg-red-900/20 border border-red-800">
                <h3 class="font-bold mb-2">Rendering Error</h3>
                <p class="mb-4">${errorMsg}</p>
                <details class="text-sm">
                  <summary class="cursor-pointer mb-2">View Generated Code</summary>
                  <pre class="bg-black/30 p-3 rounded overflow-auto">${generatedDiagram}</pre>
                </details>
              </div>
            `;
          }
        });
    }
  }, [generatedDiagram, onSetError]);

  return (
    <Card className="bg-[#1a1f2e] border-gray-700">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-white">Generated Diagram</CardTitle>
          <CardDescription className="text-gray-400">
            {diagramType.toUpperCase()} - {showCodeEditor ? 'Edit the code below' : 'View or download your diagram'}
          </CardDescription>
        </div>
        <div className="flex gap-2">
          {onGenerateRealisticDiagram && (
            <Button
              onClick={() => {
                onGenerateRealisticDiagram();
                setShowRealisticView(true);
              }}
              disabled={isGeneratingRealistic || !!error}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
            >
              {isGeneratingRealistic ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Realistic Diagram
                </>
              )}
            </Button>
          )}
          {/* <Button
            onClick={onToggleCodeEditor}
            variant="outline"
            className="border-gray-600 text-white hover:bg-gray-700"
          >
            <FileText className="w-4 h-4 mr-2" />
            {showCodeEditor ? 'Hide Code' : 'View Code'}
          </Button> */}
          <Button
            onClick={onClearDiagram}
            variant="outline"
            className="border-gray-600 text-white hover:bg-gray-700"
            disabled={!generatedDiagram}
          >
            <X className="w-4 h-4 mr-1" />
            Clear Diagram
          </Button>
          <Button
            onClick={downloadDiagram}
            variant="outline"
            className="border-gray-600 text-white hover:bg-gray-700"
            disabled={!!error}
          >
            <Download className="w-4 h-4 mr-2" />
            Download SVG
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* AI Prompt Section */}
        {onAiEdit && !showCodeEditor && (
          <Card className="bg-[#0f1318] border-gray-700 mb-4">
            <CardContent className="p-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <label className="text-sm font-medium text-white">
                    Ask AI to modify the diagram:
                  </label>
                </div>
                <div className="flex gap-2">
                  <Textarea
                    ref={textareaRef}
                    value={aiPrompt}
                    onChange={(e) => {
                      setAiPrompt(e.target.value);
                      adjustTextareaHeight();
                    }}
                    onInput={adjustTextareaHeight}
                    placeholder="e.g., Add a cache layer between API and database, or Show error handling flows..."
                    className="flex-1 bg-[#1a1f2e] border-gray-600 text-white resize-none overflow-hidden min-h-[60px]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        handleApplyAiChanges();
                      }
                    }}
                    disabled={isApplyingAiChanges}
                  />
                  <Button
                    onClick={handleApplyAiChanges}
                    disabled={isApplyingAiChanges || !aiPrompt.trim()}
                    className="bg-purple-600 hover:bg-purple-700 text-white self-end"
                  >
                    {isApplyingAiChanges ? (
                      <>
                        <Sparkles className="w-4 h-4 animate-spin" />
                      </>
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-400">
                  Press Ctrl+Enter to apply changes
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Toggle between Mermaid and Realistic views */}
        {realisticDiagram && (
          <div className="mb-4 flex gap-2 justify-center">
            <Button
              onClick={() => setShowRealisticView(false)}
              variant={!showRealisticView ? 'default' : 'outline'}
              size="sm"
              className={!showRealisticView ? 'bg-purple-600' : 'border-gray-600 text-white'}
            >
              Mermaid View
            </Button>
            <Button
              onClick={() => setShowRealisticView(true)}
              variant={showRealisticView ? 'default' : 'outline'}
              size="sm"
              className={showRealisticView ? 'bg-green-600' : 'border-gray-600 text-white'}
            >
              Realistic View
            </Button>
          </div>
        )}

        {showCodeEditor ? (
          <CodeEditor
            editableDiagram={editableDiagram}
            onCodeChange={onCodeChange}
            onApply={onApplyEdit}
            onReset={onResetEdit}
          />
        ) : showRealisticView && realisticDiagram ? (
          <div className="bg-white rounded-lg overflow-hidden">
            <iframe 
              src={realisticDiagram} 
              title="Realistic System Design Diagram"
              className="w-full border-0"
              style={{ minHeight: '600px', height: '80vh' }}
              sandbox="allow-same-origin"
            />
          </div>
        ) : (
          <div
            ref={diagramRef}
            className="bg-transparent rounded-lg p-6 overflow-auto"
            style={{ minHeight: '400px' }}
          />
        )}
      </CardContent>
    </Card>
  );
};

