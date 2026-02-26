
import React, { useState, useRef, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, Check, TestTube, Loader2, File, CheckCircle, CheckCircle2, ChevronRight } from "lucide-react";
import { FaGithub } from 'react-icons/fa';
import CodeRefactor from "./CodeRefactor";
import CodeQuality from "./CodeQuality";
import TestCase from "./TestCase";
import RepositorySelection from "./InspectRepoSelector";
import { useRepoFileSelector } from "./hooks/InspectRepoSelectorHook";
import { GitHubRepo } from "@/types/github";
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext';
import {
  generateRepoEmbeddings,
  getFileFromEmbeddings,
  generatePklFilename,
  checkEmbeddingFile,
  getFilesListFromEmbeddings,
  ensureRepoEmbeddings
} from '@/utils/repoEmbeddingApi';

interface UnifiedAgentProps {
  fileContent?: string | null;
  fileName?: string | null;
}

export default function UnifiedAgent({ fileContent, fileName }: UnifiedAgentProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("refactor");
  const [selectedRepository, setSelectedRepository] = useState<GitHubRepo | null>(null);
  const [showAnalysisOptions, setShowAnalysisOptions] = useState(false);
  const [fileSearchTerm, setFileSearchTerm] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState("all");
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [isAnalyzingRepo, setIsAnalyzingRepo] = useState(false);
  const [repoAnalyzed, setRepoAnalyzed] = useState(false);
  const [fileSectionCollapsed, setFileSectionCollapsed] = useState(false);
  const [embeddingPklFile, setEmbeddingPklFile] = useState<string | null>(null);
  const [generatingEmbeddings, setGeneratingEmbeddings] = useState(false);
  const analysisOptionsRef = useRef<HTMLDivElement>(null);
  const loadingEmbeddingsRef = useRef<Set<string>>(new Set()); // Track which repos are currently loading

  // Use custom hook for repo & file handling
  const selector = useRepoFileSelector(fileContent ?? null, fileName ?? null);

  // Load persisted repository and embeddings on mount
  useEffect(() => {
    let isMounted = true;
    
    const loadPersistedRepo = async () => {
      try {
        const persistedRepo = localStorage.getItem('code_inspector_repository');
        const persistedEmbeddings = localStorage.getItem('code_inspector_embeddings');
        
        if (persistedEmbeddings) {
          setEmbeddingPklFile(persistedEmbeddings);
        }
        
        if (persistedRepo && isMounted) {
          const repo = JSON.parse(persistedRepo);
          // Only load if we don't already have a selected repository
          if (!selectedRepository) {
            await handleRepositorySelect(repo);
          }
        }
      } catch (error) {
        console.error('Error loading persisted repository:', error);
        localStorage.removeItem('code_inspector_repository');
        localStorage.removeItem('code_inspector_embeddings');
      }
    };
    
    loadPersistedRepo();
    
    return () => {
      isMounted = false;
    };
  }, []); // Empty deps - only run on mount

  // Click outside handler for analysis options modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (analysisOptionsRef.current && !analysisOptionsRef.current.contains(event.target as Node)) {
        setShowAnalysisOptions(false);
      }
    };

    if (showAnalysisOptions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAnalysisOptions]);

  // Check for uploaded file content from localStorage
  useEffect(() => {
    // Check for uploaded folder data first (new format)
    const uploadedFolderData = localStorage.getItem('uploaded_folder_data');
    
    if (uploadedFolderData) {
      try {
        const folderData = JSON.parse(uploadedFolderData);
        localStorage.removeItem('uploaded_folder_data');
        
        // Create a synthetic repository for the uploaded folder
        const syntheticRepo: GitHubRepo = {
          id: Date.now(),
          name: folderData.projectName || 'Uploaded Project',
          full_name: `uploaded/project`,
          private: false,
          html_url: '',
          description: folderData.filteredOut > 0 
            ? `Uploaded project folder with ${folderData.relevantFileCount} relevant code files (filtered out ${folderData.filteredOut} non-code files)`
            : `Uploaded project folder with ${folderData.relevantFileCount} files`,
          language: null,
          stargazers_count: 0,
          forks_count: 0,
          updated_at: new Date().toISOString(),
          repoFiles: folderData.files.map((file: any) => ({
            path: file.path,
            type: 'blob',
            size: file.content.length,
            content: file.content,
            selected: false
          })),
          firstFileContent: folderData.files[0]?.content || null,
          firstFileName: folderData.files[0]?.name || null,
          isUploadedFolder: true
        };
        
        setSelectedRepository(syntheticRepo);
        return;
      } catch (error) {
        console.error('Error parsing uploaded folder data:', error);
        localStorage.removeItem('uploaded_folder_data');
      }
    }
    
    // Fallback: Check for old single file upload format
    const uploadedContent = localStorage.getItem('uploaded_file_content');
    const uploadedFileName = localStorage.getItem('uploaded_file_name');
    
    if (uploadedContent && uploadedFileName) {
      // Clear the localStorage
      localStorage.removeItem('uploaded_file_content');
      localStorage.removeItem('uploaded_file_name');
      
      // Create a synthetic repository for the uploaded file
      const syntheticRepo: GitHubRepo = {
        id: Date.now(),
        name: uploadedFileName,
        full_name: `uploaded/${uploadedFileName}`,
        private: false,
        html_url: '',
        description: `Uploaded file: ${uploadedFileName}`,
        language: null,
        stargazers_count: 0,
        forks_count: 0,
        updated_at: new Date().toISOString(),
        repoFiles: [{
          path: uploadedFileName,
          type: 'file',
          content: uploadedContent,
          selected: false
        }],
        firstFileContent: uploadedContent,
        firstFileName: uploadedFileName
      };
      
      setSelectedRepository(syntheticRepo);
    }
  }, []);

  // The code to display for the agents
  const effectiveFileContent = selector.selectedFileContent ?? fileContent;
  const effectiveFileName = selector.selectedFileName ?? fileName;

  const handleRepositorySelect = async (repo: GitHubRepo) => {
    setSelectedRepository(repo);
    setLoadingFiles(true);
    setRepoAnalyzed(false);
    toast.loading('Loading repository files...', { id: 'unified-repo-loading' });
    
    try {
      let fileEntries: any[] = [];
      let repoUrl = repo.html_url;
      let pklFilename: string | null = null;
      
      // Check for embeddings first if we have a GitHub URL
      if (repoUrl && !repo.isUploadedFolder) {
        try {
          // Extract owner and repo from URL
          const githubRegex = /github\.com\/([^\/]+)\/([^\/]+)/;
          const matches = repoUrl.match(githubRegex);
          
          if (matches) {
            const owner = matches[1];
            const repoName = matches[2].replace('.git', '');
            pklFilename = generatePklFilename(owner, repoName);
            
            // Check if we already have files loaded for this repo
            if (selector.repoFiles.length > 0 && embeddingPklFile === pklFilename) {
              console.log('Files already loaded for this repo, skipping API calls');
              fileEntries = selector.repoFiles.map((file: any) => ({
                path: file.path,
                type: 'file' as const,
                size: file.size || 0,
                content: file.content,
                selected: false
              }));
              toast.dismiss('unified-repo-loading');
              // Continue to set files and complete the function
            } else if (loadingEmbeddingsRef.current.has(pklFilename)) {
              console.log('Already loading embeddings for this repo, skipping duplicate call');
              // Wait a bit and check if files are loaded, otherwise fall through to GitHub
              await new Promise(resolve => setTimeout(resolve, 500));
              if (selector.repoFiles.length > 0) {
                fileEntries = selector.repoFiles.map((file: any) => ({
                  path: file.path,
                  type: 'file' as const,
                  size: file.size || 0,
                  content: file.content,
                  selected: false
                }));
                toast.dismiss('unified-repo-loading');
              } else {
                // Still loading, skip embedding calls but continue
                pklFilename = null;
              }
            } else {
              // Mark as loading
              loadingEmbeddingsRef.current.add(pklFilename);
              
              // Ensure embeddings exist - will generate if they don't
              const token = localStorage.getItem('token');
              try {
                toast.loading('Checking embeddings...', { id: 'unified-repo-loading' });
                
                const embeddingResult = await ensureRepoEmbeddings(
                  repoUrl,
                  pklFilename,
                  true, // auto-generate if missing
                  token || undefined
                );
                
                if (embeddingResult.generated) {
                  toast.success(`Generated embeddings for ${embeddingResult.fileCount} files`, { id: 'unified-repo-loading' });
                }
                
                // Load files from embeddings
                setEmbeddingPklFile(pklFilename);
                toast.loading('Loading files from embeddings...', { id: 'unified-repo-loading' });
                
                const filesList = await getFilesListFromEmbeddings(pklFilename, token || undefined);
                
                // Convert to file entries format
                fileEntries = filesList.files.map((file: any) => ({
                  path: file.path,
                  type: 'file' as const,
                  size: file.size || 0,
                  content: undefined, // Content will be loaded on demand
                  selected: false
                }));
                
                // Use the new method to set repository files
                selector.setRepositoryFiles(fileEntries);
                
                toast.success(`Loaded ${fileEntries.length} files from embeddings`, { id: 'unified-repo-loading' });
                
                // Persist embeddings filename to localStorage
                try {
                  localStorage.setItem('code_inspector_embeddings', pklFilename);
                } catch (storageError) {
                  console.error('Error persisting embeddings to localStorage:', storageError);
                }
              } catch (embeddingError) {
                console.warn('Error ensuring/loading embeddings, falling back to GitHub:', embeddingError);
                toast.error('Failed to load embeddings, using GitHub API', { id: 'unified-repo-loading' });
                pklFilename = null; // Reset so we fall through to GitHub loading
              } finally {
                // Remove from loading set when done
                loadingEmbeddingsRef.current.delete(pklFilename);
              }
            }
          }
        } catch (embeddingError) {
          console.warn('Error checking/loading embeddings, falling back to GitHub:', embeddingError);
          // Fall through to GitHub loading
        }
      }
      
      // If no embeddings found or error, load from GitHub or use existing repo files
      // IMPORTANT: Only load from GitHub if we don't have embeddings (pklFilename is null)
      if (fileEntries.length === 0 && !pklFilename) {
        // If the repo has already been processed with files and content, 
        // we can use the existing data
        if (repo.repoFiles && repo.repoFiles.length > 0) {
          // Convert the repo files to the format expected by the selector
          fileEntries = repo.repoFiles.map((file: any) => ({
            path: file.path,
            type: 'file' as const,
            size: file.size,
            content: file.content,
            selected: false
          }));
          
          // Use the new method to set repository files
          selector.setRepositoryFiles(fileEntries);
          
          toast.success(`Loaded ${fileEntries.length} files from repository`, { id: 'unified-repo-loading' });
        } else if (repoUrl && !repo.isUploadedFolder) {
          // Only load from GitHub if we don't have embeddings
          // Set the GitHub URL to trigger file fetching
          selector.setGithubUrl(repo.html_url);
          
          // Manually trigger the file fetching process
          const syntheticEvent = {
            preventDefault: () => {}
          } as React.FormEvent<HTMLFormElement>;
          
          await selector.handleGithubRepoInput(syntheticEvent);
          
          // Get the loaded files from the selector
          fileEntries = selector.repoFiles.map((file: any) => ({
            path: file.path,
            type: 'file' as const,
            size: file.size,
            content: file.content,
            selected: false
          }));
          
          toast.dismiss('unified-repo-loading');
        }
      } else if (fileEntries.length === 0 && pklFilename) {
        // This shouldn't happen, but if it does, show an error
        toast.error('Failed to load files from embeddings', { id: 'unified-repo-loading' });
      }
      
      // Note: Embeddings are now automatically generated in the ensure step above
      // This section is kept for backward compatibility but should not be needed
      
      // Persist repository to localStorage
      try {
        localStorage.setItem('code_inspector_repository', JSON.stringify(repo));
      } catch (storageError) {
        console.error('Error persisting repository to localStorage:', storageError);
      }
      
    } catch (error) {
      console.error('Error loading repository:', error);
      toast.error('Failed to load repository files', { id: 'unified-repo-loading' });
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleGoToActivities = () => {
    // Navigate to activities page or show activities modal
    // console.log('Navigate to activities');
  };

  const handleBackToRepositorySelection = () => {
    setSelectedRepository(null);
    selector.handleClearFile();
    setFileSearchTerm("");
    setFileTypeFilter("all");
    setRepoAnalyzed(false);
    setIsAnalyzingRepo(false);
    setEmbeddingPklFile(null);
    // Clear loading ref to allow reloading if needed
    loadingEmbeddingsRef.current.clear();
    // Clear persisted repository and embeddings from localStorage
    try {
      localStorage.removeItem('code_inspector_repository');
      localStorage.removeItem('code_inspector_embeddings');
    } catch (error) {
      console.error('Error clearing persisted repository:', error);
    }
  };

  // Show repository selection if no repository is selected
  if (!selectedRepository) {
    return (
      <div className="p-4 h-full flex flex-col relative">
        <RepositorySelection 
          onRepositorySelect={handleRepositorySelect}
          onGoToActivities={handleGoToActivities}
        />
      </div>
    );
  }

  // Get the files to display (either from selector or from repository)
  const displayFiles = selector.repoFiles.length > 0 ? selector.repoFiles : 
    (selectedRepository.repoFiles?.map((file: any) => ({
      path: file.path,
      type: 'file' as const,
      size: file.size,
      content: file.content,
      selected: selector.selectedFiles.some(selectedFile => selectedFile.path === file.path)
    })) || []);

  // Filter files based on search and type
  const filteredFiles = displayFiles.filter(file => {
    // Search filter
    const matchesSearch = fileSearchTerm === "" || 
      file.path.toLowerCase().includes(fileSearchTerm.toLowerCase());
    
    // File type filter
    let matchesType = true;
    if (fileTypeFilter === "code") {
      const codeExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.go', '.rb', '.rs', '.php', '.sh', '.sql'];
      matchesType = codeExtensions.some(ext => file.path.toLowerCase().endsWith(ext));
    } else if (fileTypeFilter === "config") {
      const configExtensions = ['.json', '.yaml', '.yml', '.toml', '.ini', '.conf', '.config', '.env'];
      matchesType = configExtensions.some(ext => file.path.toLowerCase().endsWith(ext)) || 
                   file.path.toLowerCase().includes('package.json') ||
                   file.path.toLowerCase().includes('webpack') ||
                   file.path.toLowerCase().includes('babel') ||
                   file.path.toLowerCase().includes('tsconfig');
    } else if (fileTypeFilter === "docs") {
      const docExtensions = ['.md', '.txt', '.rst', '.adoc', '.doc', '.docx'];
      matchesType = docExtensions.some(ext => file.path.toLowerCase().endsWith(ext)) ||
                   file.path.toLowerCase().includes('readme') ||
                   file.path.toLowerCase().includes('license') ||
                   file.path.toLowerCase().includes('changelog');
    }
    
    return matchesSearch && matchesType;
  });

  // Get selected files
  const selectedFiles = selector.selectedFiles;

  // Handle file selection toggle
  const toggleFileSelection = async (file: any) => {
    try {
      // If file doesn't have content and we have embeddings, try to load from embeddings
      if (!file.content && embeddingPklFile) {
        try {
          const token = localStorage.getItem('token');
          const fileResult = await getFileFromEmbeddings(
            embeddingPklFile,
            file.path,
            token || undefined
          );
          
          if (fileResult.file) {
            // Update the file with content from embeddings
            file.content = fileResult.file.content;
            
            // Update in displayFiles
            const updatedFiles = displayFiles.map(f =>
              f.path === file.path ? { ...f, content: fileResult.file.content } : f
            );
            
            // Update in repository
            if (selectedRepository.repoFiles) {
              const updatedRepoFiles = selectedRepository.repoFiles.map((f: any) =>
                f.path === file.path ? { ...f, content: fileResult.file.content } : f
              );
              setSelectedRepository({
                ...selectedRepository,
                repoFiles: updatedRepoFiles
              });
            }
          }
        } catch (embeddingError) {
          console.warn('Could not load file from embeddings, using fallback:', embeddingError);
          // Fall through to use existing hook method
        }
      }
      
      // Use the existing hook method for file selection
      await selector.toggleFileSelection(file);
    } catch (error) {
      console.error('Error toggling file selection:', error);
      // If the hook method fails (e.g., no GitHub URL), handle it locally
      const updatedFiles = displayFiles.map(f =>
        f.path === file.path ? { ...f, selected: !f.selected } : f
      );
      
      // Update the repository files directly
      if (selectedRepository.repoFiles) {
        const updatedRepoFiles = selectedRepository.repoFiles.map((f: any) =>
          f.path === file.path ? { ...f, selected: !f.selected } : f
        );
        setSelectedRepository({
          ...selectedRepository,
          repoFiles: updatedRepoFiles
        });
      }
    }
  };

  // Handle bulk selection
  const selectAllFiltered = async () => {
    // Select all filtered files using the existing hook method
    for (const file of filteredFiles) {
      if (!file.selected) {
        try {
          await selector.toggleFileSelection(file);
        } catch (error) {
          // Handle locally if hook method fails
          console.error('Error selecting file:', error);
        }
      }
    }
  };

  const deselectAllFiltered = async () => {
    // Deselect all filtered files using the existing hook method
    for (const file of filteredFiles) {
      if (file.selected) {
        try {
          await selector.toggleFileSelection(file);
        } catch (error) {
          // Handle locally if hook method fails
          console.error('Error deselecting file:', error);
        }
      }
    }
  };

  // Handle analysis start
  const handleStartAnalysis = () => {
    setShowAnalysisOptions(false);
    
    if (selectedFiles.length === 0) {
      toast.error("Please select at least one file");
      return;
    }
    
    // console.log(`Starting ${activeTab} analysis for`, selectedFiles);
    
    // Here you would trigger the actual analysis based on the active tab
    switch (activeTab) {
      case "refactor":
        // Trigger refactoring
        break;
      case "quality":
        // Trigger quality analysis
        break;
      case "test":
        // Trigger test generation
        break;
    }
  };

  // Prepare data for agents
  const getSelectedFileContent = () => {
    if (selectedFiles.length === 1) {
      return selectedFiles[0].content || null;
    }
    return null;
  };

  const getSelectedFileName = () => {
    if (selectedFiles.length === 1) {
      return selectedFiles[0].path || null;
    }
    return null;
  };

  const getRepoFilesForAgents = () => {
    return selectedFiles.map(file => ({
      path: file.path,
      content: file.content || ''
    }));
  };

  const getAllRepoFiles = () => {
    // Return all repository files with content
    return displayFiles
      .filter(file => file.content && file.content.trim().length > 0)
      .map(file => ({
        path: file.path,
        content: file.content || ''
      }));
  };

  return (
    <div className="bg-[#010409] h-full flex flex-col relative">
      {/* Header */}
      <div className="bg-[#010409] h-14 flex items-center justify-between px-6 py-2">
        <div className="flex items-center gap-3">
          {/* <div className="w-4 h-4"> */}
            {/* <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#99a2ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="#99a2ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="#99a2ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg> */}
          {/* </div> */}
          <div className="flex items-center gap-2">
            <FaGithub className="w-5 h-5 text-white" />
            <span className="text-white text-base">
              <span className="text-[#c9d1d9]">{selectedRepository.full_name.split('/')[0]}</span>
              <span> / </span>
              <span>{selectedRepository.name}</span>
              <p className="text-sm text-squadrun-gray mt-1">
                {selectedRepository.repoFiles.length} files loaded
              </p>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackToRepositorySelection}
            className="text-squadrun-primary hover:text-white text-sm flex items-center gap-1"
          >
            ← Back to Repository Selection
          </button>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <div className="flex-1 flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          {/* Tab Navigation */}
          <div className="px-6">
            <TabsList className="grid w-full grid-cols-3 bg-transparent">
              <TabsTrigger 
                value="refactor" 
                className="flex items-center gap-2 data-[state=active]:bg-[#1e284f] data-[state=active]:text-[#99a2ff]"
              >
                <Code className="w-4 h-4" />
                Refactor
              </TabsTrigger>
              <TabsTrigger 
                value="quality" 
                className="flex items-center gap-2 data-[state=active]:bg-[#1e284f] data-[state=active]:text-[#99a2ff]"
              >
                <CheckCircle className="w-4 h-4" />
                Quality
              </TabsTrigger>
              <TabsTrigger 
                value="test" 
                className="flex items-center gap-2 data-[state=active]:bg-[#1e284f] data-[state=active]:text-[#99a2ff]"
              >
                <TestTube className="w-4 h-4" />
                Test Cases
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Content - Only render active tab */}
          <div className="flex-1 flex flex-col">
            {activeTab === "refactor" && (
              <div className="flex-1 flex flex-col">
                {/* File Selection Section */}
                <div className="bg-transparent mx-6 mt-6">
                  <div className="px-5 py-4">
                    <div className="mb-4">
                      <h2 className="text-[#c9d1d9] text-xl font-medium mb-2">
                        Select files to refactor code
                      </h2>
                      <p className="text-[#c9d1d9] text-sm">
                        Apply AI refactoring to rewrite and improve your code
                      </p>
                    </div>

                    {/* File Selection UI */}
                    <FileSelectionUI 
                      displayFiles={displayFiles}
                      filteredFiles={filteredFiles}
                      selectedFiles={selectedFiles}
                      fileSearchTerm={fileSearchTerm}
                      setFileSearchTerm={setFileSearchTerm}
                      fileTypeFilter={fileTypeFilter}
                      setFileTypeFilter={setFileTypeFilter}
                      toggleFileSelection={toggleFileSelection}
                      selectAllFiltered={selectAllFiltered}
                      deselectAllFiltered={deselectAllFiltered}
                      loadingFiles={loadingFiles}
                      fileSectionCollapsed={fileSectionCollapsed}
                      setFileSectionCollapsed={setFileSectionCollapsed}
                    />
                  </div>
                </div>

                {/* Refactor Agent */}
                <div className="flex-1 mx-6 mt-6">
                  {selectedFiles.length === 1 ? (
                    <CodeRefactor 
                      fileContent={getSelectedFileContent()}
                      fileName={getSelectedFileName()}
                    />
                  ) : selectedFiles.length > 1 ? (
                    <div className="bg-transparent p-6">
                      <div className="text-center">
                        <Code className="h-12 w-12 text-[#99a2ff] mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-white mb-2">Multiple Files Selected</h3>
                        <p className="text-[#c9d1d9] mb-4">
                          Please select only one file for refactoring. Currently {selectedFiles.length} files are selected.
                        </p>
                        <div className="text-sm text-[#7d8590]">
                          Selected files: {selectedFiles.map(f => f.path).join(', ')}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-transparent">
                      <div className="text-center">
                        <Code className="h-12 w-12 text-[#99a2ff] mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-white mb-2">No File Selected</h3>
                        <p className="text-[#c9d1d9]">
                          Please select a file from the list above to start refactoring.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {activeTab === "quality" && (
              <div className="flex-1 flex flex-col">
                  {/* File Selection Section */}
                  <div className="bg-transparent mx-6 mt-6">
                    <div className="px-5 py-4">
                      <div className="mb-4">
                        <h2 className="text-[#c9d1d9] text-xl font-medium mb-2">
                          Select files for quality analysis
                        </h2>
                        <p className="text-[#c9d1d9] text-sm">
                          Analyze code quality, completeness, and identify potential improvements
                        </p>
                      </div>

                      {/* File Selection UI */}
                      <FileSelectionUI 
                        displayFiles={displayFiles}
                        filteredFiles={filteredFiles}
                        selectedFiles={selectedFiles}
                        fileSearchTerm={fileSearchTerm}
                        setFileSearchTerm={setFileSearchTerm}
                        fileTypeFilter={fileTypeFilter}
                        setFileTypeFilter={setFileTypeFilter}
                        toggleFileSelection={toggleFileSelection}
                        selectAllFiltered={selectAllFiltered}
                        deselectAllFiltered={deselectAllFiltered}
                        loadingFiles={loadingFiles}
                        fileSectionCollapsed={fileSectionCollapsed}
                        setFileSectionCollapsed={setFileSectionCollapsed}
                      />
                    </div>
                  </div>

                {/* Quality Agent */}
                <div className="flex-1 mx-6 mt-6">
                  <CodeQuality 
                    fileContent={getSelectedFileContent()}
                    fileName={getSelectedFileName()}
                    repoFiles={getRepoFilesForAgents()}
                    allRepoFiles={getAllRepoFiles()}
                    selectedFiles={selectedFiles}
                    repoUrl={selectedRepository.html_url}
                    hasRepoUrl={!!selectedRepository.html_url}
                    githubUrl={selectedRepository.html_url}
                  />
                </div>
              </div>
            )}

            {activeTab === "test" && (
              <div className="flex-1 flex flex-col">
                {/* File Selection Section */}
                <div className="bg-transparent mx-6 mt-6">
                  <div className="px-5 py-4">
                    <div className="mb-4">
                      <h2 className="text-[#c9d1d9] text-xl font-medium mb-2">
                        Select files to generate test cases
                      </h2>
                      <p className="text-[#c9d1d9] text-sm">
                        Generate test cases for your code with AI assistance
                      </p>
                    </div>

                    {/* File Selection UI */}
                    <FileSelectionUI 
                      displayFiles={displayFiles}
                      filteredFiles={filteredFiles}
                      selectedFiles={selectedFiles}
                      fileSearchTerm={fileSearchTerm}
                      setFileSearchTerm={setFileSearchTerm}
                      fileTypeFilter={fileTypeFilter}
                      setFileTypeFilter={setFileTypeFilter}
                      toggleFileSelection={toggleFileSelection}
                      selectAllFiltered={selectAllFiltered}
                      deselectAllFiltered={deselectAllFiltered}
                      loadingFiles={loadingFiles}
                      fileSectionCollapsed={fileSectionCollapsed}
                      setFileSectionCollapsed={setFileSectionCollapsed}
                    />
                  </div>
                </div>
                {/* Test Case Agent */}
                <div className="flex-1 mx-6 mt-6">
                  {selectedFiles.length === 1 ? (
                    <TestCase 
                      fileContent={getSelectedFileContent()}
                      fileName={getSelectedFileName()}
                    />
                  ) : selectedFiles.length > 1 ? (
                    <div className="bg-transparent p-6">
                      <div className="text-center">
                        <TestTube className="h-12 w-12 text-[#99a2ff] mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-white mb-2">Multiple Files Selected</h3>
                        <p className="text-[#c9d1d9] mb-4">
                          Please select only one file for test case generation. Currently {selectedFiles.length} files are selected.
                        </p>
                        <div className="text-sm text-[#7d8590]">
                          Selected files: {selectedFiles.map(f => f.path).join(', ')}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-transparent">
                      <div className="text-center">
                        <TestTube className="h-12 w-12 text-[#99a2ff] mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-white mb-2">No File Selected</h3>
                        <p className="text-[#c9d1d9]">
                          Please select a file from the list above to start test case generation.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );
}

// File Selection UI Component
interface FileSelectionUIProps {
  displayFiles: any[];
  filteredFiles: any[];
  selectedFiles: any[];
  fileSearchTerm: string;
  setFileSearchTerm: (term: string) => void;
  fileTypeFilter: string;
  setFileTypeFilter: (filter: string) => void;
  toggleFileSelection: (file: any) => Promise<void>;
  selectAllFiltered: () => Promise<void>;
  deselectAllFiltered: () => Promise<void>;
  loadingFiles: boolean;
  fileSectionCollapsed: boolean;
  setFileSectionCollapsed: (collapsed: boolean) => void;
}

function FileSelectionUI({
  displayFiles,
  filteredFiles,
  selectedFiles,
  fileSearchTerm,
  setFileSearchTerm,
  fileTypeFilter,
  setFileTypeFilter,
  toggleFileSelection,
  selectAllFiltered,
  deselectAllFiltered,
  loadingFiles,
  fileSectionCollapsed,
  setFileSectionCollapsed
}: FileSelectionUIProps) {
  return (
    <>
      {/* File Selection Summary */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-[18px] h-[18px]">
          <File className="w-5 h-5 text-white" />
        </div>
        <span className="text-[#c9d1d9] text-sm">
          {selectedFiles.length > 0 
            ? `${selectedFiles.length} file(s) selected`
            : 'No files selected'
          }
        </span>
        {selectedFiles.length > 0 && (
          <span className="text-[#5ba0fa] text-sm">
            {/* ({selectedFiles.length} files selected) */}
          </span>
        )}
      </div>

      <div className="h-px bg-[#21262d] mb-4"></div>

      {/* Collapsible File Section */}
      <div className="mb-4 max-h-96 mr-8 ml-8 overflow-y-auto">
        <button
          onClick={() => setFileSectionCollapsed(!fileSectionCollapsed)}
          className="flex items-center gap-2 text-[#c9d1d9] text-sm hover:text-white transition-colors mb-3"
        >
          <ChevronRight className={`w-4 h-4 transition-transform ${fileSectionCollapsed ? 'rotate-90' : ''}`} />
          {fileSectionCollapsed ? 'Show Files' : 'Hide Files'}
        </button>
        
        {!fileSectionCollapsed && (
          <>
            {/* File Search and Filter */}
            <div className="mb-4 flex justify-start">
              <div className="w-full max-w-xl mx-4 sm:mx-8 md:mx-4">
                <input
                  type="text"
                  placeholder="Search files..."
                  value={fileSearchTerm}
                  onChange={(e) => setFileSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 bg-transparent text-[#c9d1d9] placeholder-[#7d8590] focus:outline-none focus:border-[#5ba0fa]"
                />
              </div>
            </div>

            {/* File List with Selection */}
            <div className="space-y-2 max-h-30 overflow-y-auto mr-6 ml-6 px-4 sm:px-10 md:px-4">
              {loadingFiles ? (
                <div className="text-left py-8">
                  <Loader2 className="w-6 h-6 text-[#99a2ff] animate-spin mb-2" />
                  <div className="text-[#c9d1d9] text-sm">Loading repository files...</div>
                </div>
              ) : filteredFiles.length > 0 ? (
                filteredFiles.map((file, index) => (
                  <div
                    key={index} 
                    className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                      file.selected 
                        ? 'bg-[#1e284f] border border-[#99a2ff]' 
                        : 'hover:bg-[#21262d]'
                    }`}
                    onClick={async () => await toggleFileSelection(file)}
                  >
                    <div className="w-[18px] h-[18px] flex items-center justify-center">
                      {file.selected ? (
                        <CheckCircle className="w-4 h-4 text-[#99a2ff] rounded-full" />
                      ) : (
                        <div className="w-3 h-3 border border-[#99a2ff] rounded-full" />
                      )}
                    </div>
                    <span className={`text-sm flex-1 ${file.selected ? 'text-white' : 'text-[#c9d1d9]'}`}>
                      {file.path}
                    </span>
                    {file.content && (
                      <span className="text-[#5ba0fa] text-xs">✓ Loaded</span>
                    )}
                    <span className="text-[#7d8590] text-xs">
                      {file.size ? `${(file.size / 1024).toFixed(1)} KB` : ''}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-left py-8">
                  <div className="text-[#c9d1d9] text-sm">
                    {displayFiles.length === 0 ? 'No files found in repository' : 'No files match the current filter'}
                  </div>
                </div>
              )}
            </div>

            {/* File Selection Actions */}
            {filteredFiles.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[#21262d]">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                  </div>
                  <div className="text-[#c9d1d9] text-sm text-left">
                    {selectedFiles.length} of {displayFiles.length} files selected
                    {(fileSearchTerm || fileTypeFilter !== "all") && (
                      <span className="text-[#7d8590] ml-2">
                        ({filteredFiles.length} filtered)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
