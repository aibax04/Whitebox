import { useState } from 'react';
import { toast } from 'sonner';
import { extractMermaidCode, extractPDFText } from '@/utils/diagram/mermaidUtils';
import { GitHubRepo } from '@/types/github';

export const useDiagramGeneration = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [diagramType, setDiagramType] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDiagram, setGeneratedDiagram] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [prdContent, setPrdContent] = useState<string>('');
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [editableDiagram, setEditableDiagram] = useState<string>('');
  const [selectedRepo, setSelectedRepo] = useState<(GitHubRepo & { repoFiles?: any[]; repoUrl?: string }) | null>(null);
  const [inputMode, setInputMode] = useState<'prd' | 'repo'>('prd'); // Track whether using PRD or repo
  const [realisticDiagram, setRealisticDiagram] = useState<string>('');
  const [isGeneratingRealistic, setIsGeneratingRealistic] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const handleFileUpload = (file: File) => {
    const fileType = file.name.split('.').pop()?.toLowerCase();

    if (fileType !== 'pdf' && fileType !== 'txt') {
      setError('Only PDF and TXT files are allowed');
      toast.error('Only PDF and TXT files are allowed');
      return;
    }

    setUploadedFile(file);
    setError('');
    setGeneratedDiagram('');
    toast.success(`File "${file.name}" uploaded successfully`);

    // Read file content
    if (fileType === 'txt') {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPrdContent(e.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const generateDiagram = async () => {
    // Validate based on input mode
    if (inputMode === 'prd') {
      if (!uploadedFile || !diagramType) {
        toast.error('Please upload a PRD file and select a diagram type');
        return;
      }
    } else if (inputMode === 'repo') {
      if (!selectedRepo || !diagramType) {
        toast.error('Please select a repository and diagram type');
        return;
      }
    }

    setIsGenerating(true);
    setError('');
    setGeneratedDiagram('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please sign in to generate diagrams');
        return;
      }

      let requestBody: any = {
        type: diagramType,
      };

      if (inputMode === 'prd') {
        // Extract PRD content
        let content = prdContent;
        if (uploadedFile!.name.endsWith('.pdf')) {
          content = await extractPDFText(uploadedFile!, apiUrl);
          setPrdContent(content);
        }

        if (!content || content.trim().length === 0) {
          throw new Error('Could not extract content from the file');
        }

        requestBody.prdContent = content;
      } else if (inputMode === 'repo') {
        // Use repository context
        if (!selectedRepo?.repoUrl) {
          throw new Error('Repository URL is missing');
        }

        requestBody.repoUrl = selectedRepo.repoUrl;
        requestBody.useRepoContext = true;

        // Use pkl filename from selected repo if available
        if ((selectedRepo as any).pklFilename) {
          requestBody.pklFilename = (selectedRepo as any).pklFilename;
        } else {
          // Fallback: Extract owner and repo name for pkl filename
          const repoMatch = selectedRepo.repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
          if (repoMatch) {
            const owner = repoMatch[1];
            const repoName = repoMatch[2].replace(/\.git$/, '').replace(/\/$/, '');
            requestBody.pklFilename = `${owner}_${repoName}.pkl`;
          }
        }

        // Optionally include file list for better context
        if (selectedRepo.repoFiles && selectedRepo.repoFiles.length > 0) {
          requestBody.fileList = selectedRepo.repoFiles.map((f: any) => ({
            path: f.path,
            type: f.type
          }));
        }
      }

      // Call backend endpoint which internally calls /api/generate
      const response = await fetch(`${apiUrl}/api/diagrams/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate diagram');
      }

      const data = await response.json();
      const mermaidCode = extractMermaidCode(data.content);

      if (!mermaidCode) {
        throw new Error('No valid Mermaid diagram found in the response');
      }

      setGeneratedDiagram(mermaidCode);
      setEditableDiagram(mermaidCode);
      toast.success('Diagram generated successfully!');
    } catch (error: any) {
      console.error('Diagram generation error:', error);
      setError(error.message || 'Failed to generate diagram');
      toast.error(error.message || 'Failed to generate diagram');
    } finally {
      setIsGenerating(false);
    }
  };

  const applyManualEdit = () => {
    if (editableDiagram.trim()) {
      setGeneratedDiagram(editableDiagram);
      setShowCodeEditor(false);
      setError('');
      toast.success('Diagram updated with manual changes');
    }
  };

  const clearDiagram = () => {
    setGeneratedDiagram('');
    setEditableDiagram('');
    setError('');
    toast.info('Diagram cleared');
  };

  const resetEditableCode = () => {
    setEditableDiagram(generatedDiagram);
    toast.info('Changes discarded');
  };

  const handleRepositorySelect = (repo: GitHubRepo & { repoFiles?: any[]; repoUrl?: string }) => {
    setSelectedRepo(repo);
    setError('');
    setGeneratedDiagram('');
    toast.success(`Repository "${repo.name}" loaded successfully`);
  };

  const clearRepository = () => {
    setSelectedRepo(null);
    setGeneratedDiagram('');
    setEditableDiagram('');
    setError('');
    setRealisticDiagram('');
  };

  const generateRealisticDiagram = async () => {
    if (!generatedDiagram) {
      toast.error('Please generate a Mermaid diagram first');
      return;
    }

    setIsGeneratingRealistic(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please sign in to generate realistic diagrams');
        return;
      }

      toast.loading('Generating realistic diagram...', { id: 'realistic-generation' });

      const response = await fetch(`${apiUrl}/api/diagrams/generate-realistic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mermaidCode: generatedDiagram,
          diagramType: diagramType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate realistic diagram');
      }

      const data = await response.json();
      
      if (!data.dataUrl && !data.htmlContent) {
        throw new Error('No diagram data received from server');
      }

      // Use data URL or create one from HTML content
      const diagramUrl = data.dataUrl || `data:text/html;charset=utf-8,${encodeURIComponent(data.htmlContent)}`;
      setRealisticDiagram(diagramUrl);
      toast.success('Realistic diagram generated successfully!', { id: 'realistic-generation' });
    } catch (error: any) {
      console.error('Realistic diagram generation error:', error);
      setError(error.message || 'Failed to generate realistic diagram');
      toast.error(error.message || 'Failed to generate realistic diagram', { id: 'realistic-generation' });
    } finally {
      setIsGeneratingRealistic(false);
    }
  };

  const handleAiEdit = async (prompt: string) => {
    if (!generatedDiagram) {
      throw new Error('No diagram to edit');
    }

    if (!diagramType) {
      throw new Error('Diagram type is required');
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Please sign in to use AI editing');
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      const response = await fetch(`${apiUrl}/api/diagrams/apply-ai-changes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentDiagram: generatedDiagram,
          userPrompt: prompt,
          diagramType: diagramType,
          repoUrl: selectedRepo?.repoUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to apply AI changes');
      }

      const data = await response.json();
      const mermaidCode = extractMermaidCode(data.content);

      if (!mermaidCode) {
        throw new Error('No valid Mermaid diagram found in the response');
      }

      setGeneratedDiagram(mermaidCode);
      setEditableDiagram(mermaidCode);
    } catch (error: any) {
      console.error('AI editing error:', error);
      throw error;
    }
  };

  return {
    // State
    uploadedFile,
    diagramType,
    isGenerating,
    generatedDiagram,
    error,
    prdContent,
    showCodeEditor,
    editableDiagram,
    selectedRepo,
    inputMode,
    realisticDiagram,
    isGeneratingRealistic,

    // Setters
    setDiagramType,
    setError,
    setShowCodeEditor,
    setEditableDiagram,
    setGeneratedDiagram,
    setInputMode,

    // Actions
    handleFileUpload,
    generateDiagram,
    applyManualEdit,
    clearDiagram,
    resetEditableCode,
    handleRepositorySelect,
    clearRepository,
    handleAiEdit,
    generateRealisticDiagram,
  };
};

