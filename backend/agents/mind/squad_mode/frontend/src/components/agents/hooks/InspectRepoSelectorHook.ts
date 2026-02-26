import { useState, useRef } from "react";
import { toast } from "sonner";
import { calculateTotalTokens } from "@/utils/aiUtils/tokenCounter";
import { isRelevantCodeFile } from "@/utils/fileFilters";

export interface FileEntry {
  path: string;
  type: "file" | "dir";
  size?: number;
  content?: string;
  selected?: boolean; // New property to track selection state
}

export const useRepoFileSelector = (initialFileContent: string | null, initialFileName: string | null) => {
  const [githubUrl, setGithubUrl] = useState("");
  const [repoFiles, setRepoFiles] = useState<FileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileEntry[]>([]); // New state for multiple selected files
  const [selectedFileContent, setSelectedFileContent] = useState<string | null>(initialFileContent);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(initialFileName);
  const [fileDropdownOpen, setFileDropdownOpen] = useState(false);
  const [fetchingFileContent, setFetchingFileContent] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track repository files with content for bulk analysis
  const [allRepoFilesWithContent, setAllRepoFilesWithContent] = useState<FileEntry[]>([]);
  const [repositoryName, setRepositoryName] = useState<string | null>(null);

  // Extract owner and repo from GitHub URL
  const extractRepoInfo = (url: string): { owner: string; repo: string } | null => {
    try {
      // Parse different GitHub URL formats
      const githubRegex = /github\.com\/([^\/]+)\/([^\/]+)/;
      const matches = url.match(githubRegex);

      if (matches && matches.length >= 3) {
        const owner = matches[1];
        // Remove .git suffix if present
        let repo = matches[2];
        if (repo.endsWith('.git')) {
          repo = repo.slice(0, -4);
        }
        return { owner, repo };
      }
      return null;
    } catch (error) {
      console.error("Error parsing GitHub URL:", error);
      return null;
    }
  };

  const handleGithubRepoInput = async (e) => {
    e.preventDefault();
    if (!githubUrl.trim()) {
      toast.error("Please enter a GitHub repository URL");
      return;
    }

    setLoadingFiles(true);
    setRepoFiles([]);
    setSelectedFile(null);
    setSelectedFileContent(null);
    setSelectedFileName(null);
    setFetchError(null);
    setAllRepoFilesWithContent([]);

    try {
      const repoInfo = extractRepoInfo(githubUrl);
      if (!repoInfo) {
        throw new Error("Invalid GitHub repository URL");
      }

      const { owner, repo } = repoInfo;
      setRepositoryName(`${owner}/${repo}`);

      // Check if we have cached repository data for this URL
      const cachedRepoData = sessionStorage.getItem(`repo_data_${githubUrl}`);
      if (cachedRepoData) {
        try {
          const parsedData = JSON.parse(cachedRepoData);
          if (parsedData.allFilesWithContent && parsedData.allFilesWithContent.length > 0) {
            // Use cached data with all files and their content
            await processRepoFilesWithContent(parsedData.allFilesWithContent, owner, repo, parsedData.branch || 'main');
            return;
          } else if (parsedData.repoFiles && parsedData.firstFileContent) {
            // Fallback to old cached data format
            await processRepoFiles(parsedData, owner, repo, parsedData.branch || 'main');
            return;
          }
        } catch (error) {
          console.warn('Failed to parse cached repo data:', error);
        }
      }

      // Get stored GitHub token
      const githubToken = localStorage.getItem('github_token');

      // Call your server's GitHub API
      const response = await fetch('/api/github/repo-files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          owner,
          repo,
          githubToken
        })
      });

      if (!response.ok) {
        if (response.status === 401 || 403) {
          toast.error("Github API rate limit exceeded");
        } else {
          const errorData = await response.json();
          toast.error(errorData.error || "Failed to fetch repository files");
        }
        throw new Error("Failed to fetch repository files");
      }

      const data = await response.json();
      await processRepoFiles(data, owner, repo, data.branch);

    } catch (error) {
      setFetchError(error instanceof Error ? error.message : "Failed to fetch repository files");
      toast.error("Failed to fetch repository files");
    } finally {
      setLoadingFiles(false);
    }
  };

  // Helper function to fetch individual file content (if needed)
  const fetchFileContent = async (file: FileEntry) => {
    const repoInfo = extractRepoInfo(githubUrl);
    if (!repoInfo || !file.path) {
      toast.error("Owner, repo, and path are required to fetch file content");
      throw new Error("Owner, repo, and path are required");
    }
    const { owner, repo } = repoInfo;
    try {
      const githubToken = localStorage.getItem('github_token');
      const response = await fetch('/api/github/file-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          owner,
          repo,
          path: file.path,
          githubToken
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch file content");
      }
      const data = await response.json();
      // Decode base64 content if it exists
      if (data.content && data.encoding === 'base64') {
        file.content = atob(data.content);
      } else {
        file.content = data.content || '';
      }
      // Optionally update selectedFileContent and selectedFileName if this is the selected file
      setSelectedFileContent(file.content);
      setSelectedFileName(file.path.split('/').pop() || file.path);
    } catch (error) {
      console.error('Error fetching file content:', error);
      throw error;
    }
  };

  // Process repository files from GitHub API response
  const processRepoFiles = async (data: any, owner: string, repo: string, branch: string) => {
    if (!data.tree || !Array.isArray(data.tree)) {
      setFetchError("Invalid repository data structure");
      return;
    }

    // Filter only relevant code files
    const allFiles = data.tree.filter((item: any) => item.type === "blob");
    
    const files = allFiles
      .filter((item: any) => isRelevantCodeFile(item.path))
      .map((item: any) => ({
        path: item.path,
        type: item.type === "blob" ? "file" : "dir",
        size: item.size,
        selected: false
      }));

    const filteredCount = allFiles.length - files.length;
    // console.log(`Filtered out ${filteredCount} non-code files, keeping ${files.length} relevant code files`);

    if (files.length === 0) {
      setFetchError("No relevant code files found in repository");
      toast.error("No relevant code files found in repository");
      return;
    }

    setRepoFiles(files);
    toast.success(`${files.length} relevant code files loaded successfully`);
    setFileDropdownOpen(true);

    // Load file contents for bulk analysis
    const filesToAnalyze = files.slice(0, 50);

    let filesWithContent: FileEntry[] = [];
    let loadedCount = 0;

    // Get stored GitHub token
    const githubToken = localStorage.getItem('github_token');

    // Process files in batches to avoid rate limiting
    const batchSize = 10;
    for (let i = 0; i < filesToAnalyze.length; i += batchSize) {
      const batch = filesToAnalyze.slice(i, i + batchSize);
      const batchPromises = batch.map(async (file) => {
        try {
          // Use backend API to get file content
          const response = await fetch('/api/github/file-content', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              owner,
              repo,
              path: file.path,
              githubToken
            })
          });

          if (response.ok) {
            const fileData = await response.json();
            let content = '';
            if (fileData.content && fileData.encoding === 'base64') {
              content = atob(fileData.content);
            } else {
              content = fileData.content || '';
            }
            loadedCount++;
            if (loadedCount % 10 === 0) {
              toast.info(`Loaded ${loadedCount}/${filesToAnalyze.length} files for analysis...`);
            }
            return { ...file, content };
          }
          return file;
        } catch (error) {
          console.error(`Error fetching content for ${file.path}:`, error);
          return file;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      filesWithContent = [
        ...filesWithContent,
        ...batchResults.filter(file => file && file.content !== undefined)
      ];

      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < filesToAnalyze.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setAllRepoFilesWithContent(filesWithContent);

    if (filesWithContent.length > 0) {
      const totalTokens = calculateTotalTokens(filesWithContent);
      toast.success(`Loaded content for ${filesWithContent.length} files (${totalTokens.toLocaleString()} tokens)`);
    }
  };

  // Process repository files that already have content
  const processRepoFilesWithContent = async (filesWithContent: any[], owner: string, repo: string, branch: string) => {
    try {
      const files: FileEntry[] = [];
      const processedFilesWithContent: FileEntry[] = [];

      for (const item of filesWithContent) {
        // Only process relevant code files
        if (item.type === 'blob' && isRelevantCodeFile(item.path)) {
          const fileEntry: FileEntry = {
            path: item.path,
            type: 'file',
            size: item.size,
            content: item.content || undefined,
            selected: false
          };
          files.push(fileEntry);
          
          if (item.content) {
            processedFilesWithContent.push(fileEntry);
          }
        }
      }

      const totalFiles = filesWithContent.filter(item => item.type === 'blob').length;
      const filteredCount = totalFiles - files.length;
      // console.log(`Filtered out ${filteredCount} non-code files from cached data, keeping ${files.length} relevant code files`);

      setRepoFiles(files);
      setAllRepoFilesWithContent(processedFilesWithContent);
      setRepositoryName(`${owner}/${repo}`);
      
      // Set the first file with content as selected
      if (processedFilesWithContent.length > 0) {
        const firstFile = processedFilesWithContent[0];
        setSelectedFile(firstFile);
        setSelectedFileContent(firstFile.content || null);
        setSelectedFileName(firstFile.path);
      }

      toast.success(`Loaded ${processedFilesWithContent.length} relevant code files with content from cache`);
    } catch (error) {
      console.error('Error processing repository files with content:', error);
      throw error;
    }
  };

  // Check if file is a code file - retained but not used for filtering anymore
  const isCodeFile = (path: string) => {
    const codeExtensions = [
      '.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.cpp', '.c', '.cs', '.go',
      '.rb', '.rs', '.php', '.sh', '.sql', '.html', '.css', '.json', '.md'
    ];
    return codeExtensions.some(ext => path.endsWith(ext));
  };

    const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset GitHub-related state
    setRepoFiles([]);
    setSelectedFile(null);
    setGithubUrl("");
    setRepositoryName(null);
    setAllRepoFilesWithContent([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setSelectedFileContent(content);
      setSelectedFileName(file.name);
      toast.success(`File "${file.name}" loaded successfully`);
    };

    reader.onerror = () => {
      toast.error("Error reading file");
    };

    reader.readAsText(file);
  };

  // Function to clear the currently selected file
  const handleClearFile = () => {
    setSelectedFileContent(null);
    setSelectedFileName(null);
    setSelectedFile(null);
    setRepoFiles([]);
    setSelectedFiles([]);
    setGithubUrl("");
    setRepositoryName(null);
    setAllRepoFilesWithContent([]);
    setFetchError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast.success("All files cleared successfully");
  };

  // Function to clear the GitHub token and related states
  const handleClearGithubToken = () => {
    localStorage.removeItem('github_token');
    setGithubUrl("");
    setRepoFiles([]);
    setSelectedFiles([]);
    setSelectedFile(null);
    setSelectedFileContent(null);
    setSelectedFileName(null);
    setAllRepoFilesWithContent([]);
    setRepositoryName(null);
    setFetchError(null);
    toast.success("GitHub token cleared successfully");
  };

  // New function to toggle selection of a file
  const toggleFileSelection = async (file: FileEntry) => {
    try {
      // If file is being selected and doesn't have content, try to fetch it
      if (!file.selected && !file.content) {
        setFetchingFileContent(true);
        
        // First, check if we have embeddings available
        const embeddingPklFile = localStorage.getItem('code_inspector_embeddings');
        if (embeddingPklFile) {
          try {
            // Try to load from embeddings first
            const token = localStorage.getItem('token');
            const { getFileFromEmbeddings } = await import('@/utils/repoEmbeddingApi');
            const fileResult = await getFileFromEmbeddings(
              embeddingPklFile,
              file.path,
              token || undefined
            );
            
            if (fileResult.file && fileResult.file.content) {
              file.content = fileResult.file.content;
              setFetchingFileContent(false);
              // Continue to update file state below
            } else {
              throw new Error('File not found in embeddings');
            }
          } catch (embeddingError) {
            // If embedding load fails, fall back to GitHub API
            console.warn('Could not load file from embeddings, falling back to GitHub:', embeddingError);
            const repoInfo = extractRepoInfo(githubUrl);
            if (!repoInfo) {
              throw new Error("Invalid GitHub repository URL");
            }

            const { owner, repo } = repoInfo;
            const githubToken = localStorage.getItem('github_token');
            // Use backend API to get file content
            const response = await fetch('/api/github/file-content', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                owner,
                repo,
                path: file.path,
                githubToken
              })
            });
            if (response.ok) {
              const fileData = await response.json();
              let content = '';
              if (fileData.content && fileData.encoding === 'base64') {
                content = atob(fileData.content);
              } else {
                content = fileData.content || '';
              }
              file.content = content;
            }
          }
        } else {
          // No embeddings, use GitHub API
          const repoInfo = extractRepoInfo(githubUrl);
          if (!repoInfo) {
            throw new Error("Invalid GitHub repository URL");
          }

          const { owner, repo } = repoInfo;
          const githubToken = localStorage.getItem('github_token');
          // Use backend API to get file content
          const response = await fetch('/api/github/file-content', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              owner,
              repo,
              path: file.path,
              githubToken
            })
          });
          if (response.ok) {
            const fileData = await response.json();
            let content = '';
            if (fileData.content && fileData.encoding === 'base64') {
              content = atob(fileData.content);
            } else {
              content = fileData.content || '';
            }
            file.content = content;
          }
        }
      }

      // Update the file's selected state and content in repoFiles
      const updatedFiles = repoFiles.map(f =>
        f.path === file.path ? { ...f, selected: !f.selected, content: file.content } : f
      );

      setRepoFiles(updatedFiles);

      // Update selectedFiles array with all selected files
      const newSelectedFiles = updatedFiles.filter(f => f.selected);
      setSelectedFiles(newSelectedFiles);

      // If files were selected, show a toast with token count
      if (newSelectedFiles.length > 0) {
        const totalTokens = calculateTotalTokens(newSelectedFiles);
        toast.success(`${newSelectedFiles.length} files selected (${totalTokens.toLocaleString()} tokens)`);
      } else {
        toast.info("No files selected");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch file content");
      throw error; // Re-throw to handle in the component
    } finally {
      setFetchingFileContent(false);
    }
  };

  // Function to set repository files when they're already loaded
  const setRepositoryFiles = (files: FileEntry[]) => {
    setRepoFiles(files);
    setSelectedFiles([]);
    setSelectedFile(null);
    setSelectedFileContent(null);
    setSelectedFileName(null);
  };

  return {
    githubUrl,
    setGithubUrl,
    repoFiles,
    selectedFile,
    setSelectedFile,
    selectedFiles,
    selectedFileContent,
    selectedFileName,
    fileDropdownOpen,
    setFileDropdownOpen,
    fetchingFileContent,
    fetchError,
    fileInputRef,
    handleLocalFileChange,
    handleGithubRepoInput,
    fetchFileContent,
    loadingFiles,
    handleClearFile,
    allRepoFilesWithContent,
    repositoryName,
    toggleFileSelection,
    handleClearGithubToken,
    setRepositoryFiles
  };
};