import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { GitHubRepo, FileData } from '@/types/github';
import { fetchRepoFilesForBranch } from '@/utils/githubApi';
import { isRelevantCodeFile } from '@/utils/fileFilters';
import { checkEmbeddingFile, getFilesListFromEmbeddings, generatePklFilename, ensureRepoEmbeddings } from '@/utils/repoEmbeddingApi';

export const useGitHubRepoSelector = () => {
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [selectedRepos, setSelectedRepos] = useState<GitHubRepo[]>([]);
  const [repoFiles, setRepoFiles] = useState<FileData[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const handleRepoSelect = useCallback(async (repo: GitHubRepo) => {
    setSelectedRepo(repo);
    setRepoFiles([]);
    setFetchError(null);
    setLoadingFiles(true);

    try {
      // Check if this is an uploaded folder with existing files
      if ((repo as any).isUploadedFolder && (repo as any).repoFiles && Array.isArray((repo as any).repoFiles)) {
        // For uploaded folders, use the existing files directly
        const files: FileData[] = (repo as any).repoFiles.map((file: any) => ({
          path: file.path,
          content: file.content || ''
        }));
        
        setRepoFiles(files);
        setLoadingFiles(false);
        toast.success(`Loaded ${files.length} files from uploaded folder`);
        return;
      }

      // For regular GitHub repositories, ensure embeddings exist
      // Extract owner and repo name from full_name
      const [owner, repoName] = repo.full_name.split('/');
      
      // Ensure embeddings exist - will generate if they don't
      const pklFilename = generatePklFilename(owner, repoName);
      const token = localStorage.getItem('token');
      const repoUrl = repo.html_url || `https://github.com/${owner}/${repoName}`;
      
      try {
        const embeddingResult = await ensureRepoEmbeddings(
          repoUrl,
          pklFilename,
          true, // auto-generate if missing
          token || undefined
        );
        
        if (embeddingResult.generated) {
          toast.success(`Generated embeddings for ${embeddingResult.fileCount} files`, { id: 'doc-repo-hook-loading' });
        }
        
        // Load from embeddings instead of GitHub - skip all GitHub API calls
        const filesList = await getFilesListFromEmbeddings(pklFilename, token || undefined);
        
        // Convert to the expected format
        const files: FileData[] = filesList.files.map((file: any) => ({
          path: file.path,
          content: '' // Content will be loaded on demand from embeddings
        }));
        
        if (files.length === 0) {
          toast.error(`No files found in embeddings for ${repo.full_name}`);
          setLoadingFiles(false);
          return;
        }
        
        setRepoFiles(files);
        toast.success(`Loaded ${files.length} files from embeddings for ${repo.full_name}`);
        return;
      } catch (embeddingError) {
        console.warn('Error ensuring/loading embeddings, falling back to GitHub:', embeddingError);
        // Fall through to GitHub API
      }
      
      // No embeddings, load from GitHub API
      // Get stored GitHub token
      const githubToken = localStorage.getItem('github_token');

      // Call the server's GitHub API to fetch repository files
      const branch = repo.branchPreferred || undefined;
      const data = await fetchRepoFilesForBranch(owner, repoName, branch || 'main', githubToken || undefined).catch(async (err) => {
        // If explicit preferred branch fails and wasn't set, retry master
        if (!branch) {
          return await fetchRepoFilesForBranch(owner, repoName, 'master', githubToken || undefined);
        }
        throw err;
      });
      
      // Process the repository files
      const files: FileData[] = [];
      if (data.tree && Array.isArray(data.tree)) {
        const allFiles = data.tree.filter((item: any) => item.type === 'blob');
        
        for (const item of data.tree) {
          if (item.type === 'blob' && item.path && isRelevantCodeFile(item.path)) {
            files.push({
              path: item.path,
              content: '' // Content will be fetched when needed
            });
          }
        }
        
        const filteredCount = allFiles.length - files.length;
        // console.log(`Filtered out ${filteredCount} non-code files, keeping ${files.length} relevant code files`);
      }
      
      if (files.length === 0) {
        toast.error(`No relevant code files found in ${repo.full_name}`);
        setLoadingFiles(false);
        return;
      }
      
      setRepoFiles(files);
      toast.success(`Loaded ${files.length} files from ${repo.full_name}`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch repository files';
      setFetchError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoadingFiles(false);
    }
  }, []);

  const handleRepoSelectMultiple = useCallback(async (repos: GitHubRepo[]) => {
    setSelectedRepos(repos);
    // Use first repo as primary for backward compatibility
    setSelectedRepo(repos[0] || null);
    setRepoFiles([]);
    setFetchError(null);
    setLoadingFiles(true);

    try {
      const allFiles: FileData[] = [];
      const token = localStorage.getItem('token');
      
      // Process each repository
      for (const repo of repos) {
        try {
          // Check if this is an uploaded folder with existing files
          if ((repo as any).isUploadedFolder && (repo as any).repoFiles && Array.isArray((repo as any).repoFiles)) {
            const files: FileData[] = (repo as any).repoFiles.map((file: any) => ({
              path: `${repo.full_name}/${file.path}`, // Prefix with repo name to avoid conflicts
              content: file.content || ''
            }));
            allFiles.push(...files);
            continue;
          }

          // For regular GitHub repositories, ensure embeddings exist
          const [owner, repoName] = repo.full_name.split('/');
          const pklFilename = generatePklFilename(owner, repoName);
          const repoUrl = repo.html_url || `https://github.com/${owner}/${repoName}`;
          
          try {
            // Ensure embeddings exist
            const embeddingResult = await ensureRepoEmbeddings(
              repoUrl,
              pklFilename,
              true,
              token || undefined
            );
            
            if (embeddingResult.generated) {
              toast.success(`Generated embeddings for ${repo.full_name}`, { id: `doc-repo-loading-${repo.id}` });
            }
            
            // Load from embeddings
            const filesList = await getFilesListFromEmbeddings(pklFilename, token || undefined);
            
            // Convert to the expected format with repo prefix to avoid path conflicts
            const files: FileData[] = filesList.files.map((file: any) => ({
              path: `${repo.full_name}/${file.path}`, // Prefix with repo name
              content: '' // Content will be loaded on demand from embeddings
            }));
            
            allFiles.push(...files);
          } catch (embeddingError) {
            console.warn(`Error loading embeddings for ${repo.full_name}, skipping:`, embeddingError);
            // Continue with next repo
          }
        } catch (repoError) {
          console.warn(`Error processing repo ${repo.full_name}:`, repoError);
          // Continue with next repo
        }
      }
      
      if (allFiles.length === 0) {
        toast.error('No files found in selected repositories');
        setLoadingFiles(false);
        return;
      }
      
      setRepoFiles(allFiles);
      toast.success(`Loaded ${allFiles.length} files from ${repos.length} repository${repos.length > 1 ? 'ies' : ''}`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch repository files';
      setFetchError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoadingFiles(false);
    }
  }, []);

  const clearSelectedRepo = useCallback(() => {
    setSelectedRepo(null);
    setSelectedRepos([]);
    setRepoFiles([]);
    setFetchError(null);
  }, []);

  return {
    selectedRepo,
    selectedRepos,
    repoFiles,
    loadingFiles,
    fetchError,
    handleRepoSelect,
    handleRepoSelectMultiple,
    clearSelectedRepo
  };
};
