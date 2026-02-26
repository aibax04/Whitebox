import { useState, useEffect, useRef } from 'react';
import { Github, Edit3, ArrowRight, Info, Link, Key, Upload, Loader2, FolderOpen, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { GitHubRepo } from '@/types/github';
import { FaGithub } from 'react-icons/fa';
import { FileEntry } from './hooks/InspectRepoSelectorHook';
import React from 'react';
import { fetchUserRepos, fetchRepoFiles, fetchFileContent, fetchFilesContents, fetchRepoBranches, fetchRepoFilesForBranch } from '@/utils/githubApi';
import { checkEmbeddingFile, getFilesListFromEmbeddings, generatePklFilename, ensureRepoEmbeddings } from '@/utils/repoEmbeddingApi';
import { filterRelevantCodeFiles, getFilterStats } from '@/utils/fileFilters';

interface RepositorySelectionProps {
  onRepositorySelect: (repo: GitHubRepo) => void;
  onGoToActivities?: () => void;
}

export default function RepositorySelection({ onRepositorySelect, onGoToActivities }: RepositorySelectionProps) {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notConnected, setNotConnected] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [githubUrl, setGithubUrl] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [loadingRepository, setLoadingRepository] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });
  const [availableBranches, setAvailableBranches] = useState<{ name: string; commitSha?: string }[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [moreOptionsCollapsed, setMoreOptionsCollapsed] = useState(true);
  
  // Ensure uploaded folder data is never persisted; clear on unmount/back navigation
  useEffect(() => {
    return () => {
      try {
        localStorage.removeItem('uploaded_folder_data');
      } catch {}
    };
  }, []);

  const fetchRepos = async () => {
    setLoading(true);
    setError(null);
    setNotConnected(false);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required. Please sign in first.');
        return;
      }

      try {
        const data = await fetchUserRepos();
        setRepos(Array.isArray(data) ? data : []);
      } catch (err) {
        setNotConnected(true);
        setRepos([]);
        return;
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch repositories');
      toast.error('Failed to fetch repositories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepos();
  }, []);

  // Fetch branches when a repo from the list is selected
  useEffect(() => {
    const fetchBranchesForSelected = async () => {
      if (!selectedRepo) return;
      try {
        const [owner, repo] = (selectedRepo.full_name || '').split('/');
        if (!owner || !repo) return;
        const githubToken = localStorage.getItem('github_token');
        const branches = await fetchRepoBranches(owner, repo, githubToken || null);
        setAvailableBranches(branches);
        const defaultBranch = branches.find(b => b.name === 'main')?.name || branches[0]?.name || '';
        setSelectedBranch(defaultBranch);
      } catch (e) {
        setAvailableBranches([]);
      }
    };
    fetchBranchesForSelected();
  }, [selectedRepo]);

  const filteredRepos = repos.filter((repo) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    const name = (repo.full_name || repo.name || '').toLowerCase();
    const desc = (repo.description || '').toLowerCase();
    return name.includes(query) || desc.includes(query);
  });

  const handleConnectGitHub = () => {
    window.location.href = '/api/auth/github/login';
  };

  const handleEditAccount = () => {
    toast.info('Account editing functionality coming soon');
  };

  const handleLoadRepositoryFromRepo = async (repo: GitHubRepo) => {
    setLoadingRepository(true);
    toast.loading('Loading repository files...', { id: 'repo-loading' });
    try {
      const githubRegex = /github\.com\/([^\/]+)\/([^\/]+)/;
      const matches = repo.html_url.match(githubRegex);
      if (!matches) {
        throw new Error('Invalid GitHub repository URL');
      }
      const owner = matches[1];
      const repoName = matches[2].replace('.git', '');

      let allFilesWithContent: any[] = [];
      let branchToUse = selectedBranch || 'main';
      let loadedFromEmbeddings = false;

      // Ensure embeddings exist - will generate if they don't
      const pklFilename = generatePklFilename(owner, repoName);
      const token = localStorage.getItem('token');
      const repoUrl = repo.html_url;
      
      try {
        toast.loading('Checking embeddings...', { id: 'repo-loading' });
        
        const embeddingResult = await ensureRepoEmbeddings(
          repoUrl,
          pklFilename,
          true, // auto-generate if missing
          token || undefined
        );
        
        if (embeddingResult.generated) {
          toast.success(`Generated embeddings for ${embeddingResult.fileCount} files`, { id: 'repo-loading' });
        }
        
        loadedFromEmbeddings = true;
        // Load from embeddings instead of GitHub - skip all GitHub API calls
        toast.loading('Loading files from embeddings...', { id: 'repo-loading' });
        
        const filesList = await getFilesListFromEmbeddings(pklFilename, token || undefined);
        
        // Convert to the expected format
        allFilesWithContent = filesList.files.map((file: any) => ({
          path: file.path,
          type: 'blob',
          size: file.size || 0,
          content: undefined // Content will be loaded on demand from embeddings
        }));
        
        toast.success(`Loaded ${allFilesWithContent.length} files from embeddings`, { id: 'repo-loading' });
      } catch (embeddingError) {
        console.warn('Error ensuring/loading embeddings, falling back to GitHub:', embeddingError);
        // Fall back to GitHub API
        const githubToken = localStorage.getItem('github_token');

          // Only fetch branches if we don't have embeddings
          try {
            const branches = await fetchRepoBranches(owner, repoName, githubToken || null);
            setAvailableBranches(branches);
            if (!selectedBranch && branches.length > 0) {
              const defaultBranch = branches.find(b => b.name === 'main')?.name || branches[0].name;
              setSelectedBranch(defaultBranch);
            }
          } catch {}

          branchToUse = selectedBranch || 'main';
          const repoFilesData = await fetchRepoFilesForBranch(owner, repoName, branchToUse, githubToken || null);

          if (repoFilesData.tree && repoFilesData.tree.length > 0) {
            const allFiles = repoFilesData.tree.filter((item: any) => item.type === 'blob');
            
            // Filter to only relevant code files
            const relevantFiles = filterRelevantCodeFiles(allFiles);
            
            // Get statistics for user feedback
            const stats = getFilterStats(allFiles, relevantFiles);
            
            if (relevantFiles.length === 0) {
              toast.error('No relevant code files found in repository', { id: 'repo-loading' });
              return;
            }
            
            const paths = relevantFiles.map((f: any) => f.path);
            const results = await fetchFilesContents(owner, repoName, paths, githubToken || null);
            allFilesWithContent = results.map((r, index) => {
              let content = '';
              if (r.content && r.encoding === 'base64') content = atob(r.content);
              else content = r.content || '';
            return { ...relevantFiles[index], path: r.path || relevantFiles[index].path, content };
          });
        }
      }

      const firstFile = allFilesWithContent.find((file: any) => file.content);
      const firstFileContent = firstFile?.content || null;
      const firstFileName = firstFile?.path || null;

      const enhancedRepo = {
        ...repo,
        repoFiles: allFilesWithContent,
        firstFileContent,
        firstFileName,
        branchPreferred: branchToUse
      };
      
      // Only show success message if we loaded from GitHub (not embeddings)
      if (!loadedFromEmbeddings) {
        toast.success(`Successfully loaded ${allFilesWithContent.length} files from repository`, { id: 'repo-loading' });
      }
      
      onRepositorySelect(enhancedRepo);
    } catch (error) {
      console.error('Error loading repository:', error);
      toast.error('Failed to load repository', { id: 'repo-loading' });
    } finally {
      setLoadingRepository(false);
    }
  };

  const handleLoadRepository = async () => {
    if (!githubUrl.trim()) {
      toast.error('Please enter a GitHub repository URL');
      return;
    }
    setLoadingRepository(true);
    toast.loading('Loading repository files...', { id: 'repo-loading-url' });
    try {
      const githubRegex = /github\.com\/([^\/]+)\/([^\/]+)/;
      const matches = githubUrl.match(githubRegex);
      if (!matches) {
        throw new Error('Invalid GitHub repository URL');
      }
      const owner = matches[1];
      const repo = matches[2].replace('.git', '');

      let allFilesWithContent: any[] = [];
      let branchToUse = selectedBranch || 'main';
      let loadedFromEmbeddings = false;

      // Ensure embeddings exist - will generate if they don't
      const pklFilename = generatePklFilename(owner, repo);
      const token = localStorage.getItem('token');
      const repoUrl = `https://github.com/${owner}/${repo}`;
      
      try {
        toast.loading('Checking embeddings...', { id: 'repo-loading-url' });
        
        const embeddingResult = await ensureRepoEmbeddings(
          repoUrl,
          pklFilename,
          true, // auto-generate if missing
          token || undefined
        );
        
        if (embeddingResult.generated) {
          toast.success(`Generated embeddings for ${embeddingResult.fileCount} files`, { id: 'repo-loading-url' });
        }
        
        loadedFromEmbeddings = true;
        // Load from embeddings instead of GitHub - skip all GitHub API calls
        toast.loading('Loading files from embeddings...', { id: 'repo-loading-url' });
        
        const filesList = await getFilesListFromEmbeddings(pklFilename, token || undefined);
        
        // Convert to the expected format
        allFilesWithContent = filesList.files.map((file: any) => ({
          path: file.path,
          type: 'blob',
          size: file.size || 0,
          content: undefined // Content will be loaded on demand from embeddings
        }));
        
        toast.success(`Loaded ${allFilesWithContent.length} files from embeddings`, { id: 'repo-loading-url' });
      } catch (embeddingError) {
        console.warn('Error ensuring/loading embeddings, falling back to GitHub:', embeddingError);
        // Fall back to GitHub API
        const githubToken = localStorage.getItem('github_token');

        // Only fetch branches if we don't have embeddings
        try {
          const branches = await fetchRepoBranches(owner, repo, githubToken || null);
          setAvailableBranches(branches);
          if (!selectedBranch && branches.length > 0) {
            const defaultBranch = branches.find(b => b.name === 'main')?.name || branches[0].name;
            setSelectedBranch(defaultBranch);
          }
        } catch {}

        branchToUse = selectedBranch || 'main';
        const repoFilesData = await fetchRepoFilesForBranch(owner, repo, branchToUse, githubToken || null);

        if (repoFilesData.tree && repoFilesData.tree.length > 0) {
          const allFiles = repoFilesData.tree.filter((item: any) => item.type === 'blob');
          
          // Filter to only relevant code files
          const relevantFiles = filterRelevantCodeFiles(allFiles);
          
          // Get statistics for user feedback
          const stats = getFilterStats(allFiles, relevantFiles);
          
          if (relevantFiles.length === 0) {
            toast.error('No relevant code files found in repository', { id: 'repo-loading-url' });
            setLoadingRepository(false);
            return;
          }
          
          const paths = relevantFiles.map((f: any) => f.path);
          const results = await fetchFilesContents(owner, repo, paths, githubToken || null);
          allFilesWithContent = results.map((r, index) => {
            let content = '';
            if (r.content && r.encoding === 'base64') content = atob(r.content);
            else content = r.content || '';
            return { ...relevantFiles[index], path: r.path || relevantFiles[index].path, content };
          });
        }
      }

      const firstFile = allFilesWithContent.find((file: any) => file.content);
      const firstFileContent = firstFile?.content || null;
      const firstFileName = firstFile?.path || null;

      const repoInfo = {
        id: Date.now(),
        name: repo,
        full_name: `${owner}/${repo}`,
        private: false,
        html_url: githubUrl,
        description: null,
        language: null,
        stargazers_count: 0,
        forks_count: 0,
        updated_at: new Date().toISOString(),
        repoFiles: allFilesWithContent,
        firstFileContent,
        firstFileName,
        branchPreferred: branchToUse
      };

      // Only show success message if we loaded from GitHub (not embeddings)
      if (!loadedFromEmbeddings) {
        toast.success(`Successfully loaded ${allFilesWithContent.length} files from repository`, { id: 'repo-loading-url' });
      }
      
      onRepositorySelect(repoInfo);
    } catch (error) {
      console.error('Error loading repository:', error);
      toast.error('Failed to load repository', { id: 'repo-loading-url' });
    } finally {
      setLoadingRepository(false);
    }
  };

  const handleAcceptToken = () => {
    if (githubToken.trim()) {
      localStorage.setItem('github_token', githubToken);
      toast.success('GitHub token accepted');
      fetchRepos();
    } else {
      toast.error('Please enter a GitHub token');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.items) {
      const items = Array.from(e.dataTransfer.items);
      const files: File[] = [];

      const processEntry = async (entry: any, path = '') => {
        if (entry.isFile) {
          return new Promise<void>((resolve) => {
            entry.file((file: File) => {
              (file as any).relativePath = path + file.name;
              files.push(file);
              resolve();
            });
          });
        } else if (entry.isDirectory) {
          const reader = entry.createReader();
          return new Promise<void>((resolve) => {
            const readEntries = () => {
              reader.readEntries(async (entries: any[]) => {
                if (entries.length === 0) {
                  resolve();
                  return;
                }
                await Promise.all(entries.map(entry =>
                  processEntry(entry, path + entry.name + '/')
                ));
                readEntries();
              });
            };
            readEntries();
          });
        }
      };

      Promise.all(items.map(item => {
        if (item.webkitGetAsEntry) {
          const entry = item.webkitGetAsEntry();
          if (entry) return processEntry(entry);
        }
        return Promise.resolve();
      })).then(() => {
        if (files.length > 0) {
          setUploadedFiles(files);
          handleFolderUpload(files);
        }
      });
    }
  };

  const handleFolderUpload = async (files: File[]) => {
    if (files.length === 0) {
      toast.error('No files selected');
      return;
    }

    setUploading(true);
    try {
      const relevantFiles = files.filter(file => {
        const path = (file as any).relativePath || file.name;
        const lowerPath = path.toLowerCase();

        const skipPatterns = [
          '/node_modules/', '/dist/', '/build/', '/target/', '/out/', '/bin/', '/obj/',
          '/.git/', '/.svn/', '/.hg/', '/.vscode/', '/.idea/', '/.vs/',
          '/coverage/', '/.nyc_output/', '/.next/', '/.nuxt/', '/.output/',
          '/.cache/', '/.parcel-cache/', '/.rollup.cache/', '/.eslintcache/',
          'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'composer.lock',
          'Gemfile.lock', 'Pipfile.lock', 'poetry.lock', 'Cargo.lock',
          '.env', '.env.local', '.env.production', '.env.development',
          '.gitignore', '.gitattributes', '.editorconfig', '.prettierignore',
          '.eslintignore', '.dockerignore', '.npmrc', '.yarnrc',
          '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.bmp', '.tiff',
          '.mp3', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm',
          '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2',
          '.exe', '.dll', '.so', '.dylib', '.a', '.lib',
          '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
          '.txt', '.rtf', '.odt', '.ods', '.odp',
          '.DS_Store', 'Thumbs.db', '.Spotlight-V100', '.Trashes',
          'ehthumbs.db', 'Desktop.ini'
        ];

        if (skipPatterns.some(pattern => lowerPath.includes(pattern))) {
          return false;
        }

        const codeExtensions = [
          '.html', '.htm', '.css', '.scss', '.sass', '.less', '.styl',
          '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte', '.astro',
          '.py', '.pyw', '.java', '.class', '.cpp', '.cc', '.cxx', '.c', '.h', '.hpp',
          '.cs', '.vb', '.fs', '.go', '.rs', '.rb', '.php', '.pl', '.pm',
          '.swift', '.kt', '.scala', '.clj', '.hs', '.ml', '.fs', '.f90',
          '.r', '.m', '.mat', '.jl', '.d', '.nim', '.zig', '.v',
          '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd',
          '.sql', '.plsql', '.tsql', '.mysql', '.psql',
          '.xml', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf',
          '.json', '.jsonc', '.json5', '.jsonl',
          '.md', '.markdown', '.rst', '.tex', '.adoc', '.wiki',
          '.gradle', '.maven', '.pom', '.csproj', '.vbproj', '.vcxproj',
          '.sln', '.xcodeproj', '.pbxproj', '.pro', '.pri',
          '.cmake', '.make', '.mk', '.ninja', '.bazel', '.buck',
          'Dockerfile', '.dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
          '.github/workflows/', '.gitlab-ci.yml', '.travis.yml', '.circleci/',
          '.jenkins', '.drone.yml', '.appveyor.yml'
        ];

        return codeExtensions.some(ext => lowerPath.endsWith(ext)) ||
          lowerPath.includes('/src/') || lowerPath.includes('/lib/') ||
          lowerPath.includes('/app/') || lowerPath.includes('/components/') ||
          lowerPath.includes('/utils/') || lowerPath.includes('/helpers/') ||
          lowerPath.includes('/services/') || lowerPath.includes('/models/') ||
          lowerPath.includes('/controllers/') || lowerPath.includes('/views/');
      });

      if (relevantFiles.length === 0) {
        toast.error('No relevant code files found in the selected folder');
        setUploading(false);
        return;
      }

      const filePromises = relevantFiles.map(async (file) => {
        return new Promise<{ path: string; content: string; name: string }>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const content = e.target?.result as string;
            resolve({
              path: (file as any).relativePath || file.name,
              content,
              name: file.name
            });
          };
          reader.readAsText(file);
        });
      });

      const filesWithContent = await Promise.all(filePromises);

      const totalFiles = files.length;
      const relevantFileCount = relevantFiles.length;
      const filteredOut = totalFiles - relevantFileCount;

      const repoInfo = {
        id: Date.now(),
        name: 'Uploaded Project',
        full_name: 'uploaded/project',
        private: false,
        html_url: '',
        description: `Uploaded project folder with ${relevantFileCount} relevant code files`,
        language: null,
        stargazers_count: 0,
        forks_count: 0,
        updated_at: new Date().toISOString(),
        repoFiles: filesWithContent.map(file => ({
          path: file.path,
          name: file.name,
          type: 'blob',
          content: file.content
        })),
        firstFileContent: filesWithContent[0]?.content || null,
        firstFileName: filesWithContent[0]?.name || null,
        isUploadedFolder: true
      };

      // Do not persist uploaded folder data to localStorage

      if (filteredOut > 0) {
        toast.success(`Successfully uploaded ${relevantFileCount} relevant code files (filtered out ${filteredOut} non-code files)`);
      } else {
        toast.success(`Successfully uploaded ${relevantFileCount} files from project folder`);
      }
      onRepositorySelect(repoInfo);
    } catch (error) {
      console.error('Error processing folder upload:', error);
      toast.error('Failed to process folder upload');
    } finally {
      setUploading(false);
    }
  };

  const handleFolderInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const filesWithPaths = files.map(file => {
        const fullPath = (file as any).webkitRelativePath || file.name;
        (file as any).relativePath = fullPath;
        return file;
      });

      setUploadedFiles(filesWithPaths);
      handleFolderUpload(filesWithPaths);
    }
  };

  const handleRepoClick = (repo: GitHubRepo) => {
    setSelectedRepo(repo);
  };

  const handleStartAnalyzing = async (repo: GitHubRepo) => {
    await handleLoadRepositoryFromRepo(repo);
  };

  if (notConnected) {
    return (
      <div className="p-6 mt-10 bg-transparent border border-none mx-10">
        <div className="text-center">
          <FaGithub className="w-12 h-12 text-squadrun-primary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Connect GitHub Account</h3>
          <p className="text-squadrun-gray mb-4">
            To access your repositories, please connect your GitHub account first.
          </p>
          <Button
            onClick={handleConnectGitHub}
            className="bg-squadrun-primary hover:bg-squadrun-primary/80 text-white"
          >
            <FaGithub className="w-4 h-4 mr-2" />
            Connect GitHub
          </Button>
        </div>

        <div>
          <p className="text-squadrun-gray text-center text-sm my-5">OR</p>
        </div>

        <div className="mx-auto ml-20 mr-20">
          <h3 className="text-lg text-center font-semibold text-white mb-4">ENTER A PUBLIC GITHUB REPOSITORY URL</h3>
          {/* GitHub Repository URL Input */}
          <div className="flex items-center gap-3 mb-4">
            <Link className="w-4 h-4 text-squadrun-gray" />
            <Input
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="Enter a public GitHub repository URL"
              className="flex-1 bg-squadrun-darker/60 border-squadrun-primary/20 text-white placeholder:text-squadrun-gray"
            />
            <Button
              onClick={handleLoadRepository}
              disabled={loadingRepository}
              variant="outline"
              size="sm"
              className="bg-squadrun-gray/20 border-squadrun-gray/30 text-white hover:bg-squadrun-gray/30"
            >
              {loadingRepository ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {loadingProgress.total > 0
                    ? `Loading Files (${loadingProgress.current}/${loadingProgress.total})`
                    : 'Loading Repository'
                  }
                </>
              ) : (
                'Load Repository'
              )}
            </Button>
          </div>
        </div>
        <div>
          <p className="text-squadrun-gray text-center text-sm my-5">OR</p>
        </div>
        {/* UPLOAD FILES Card */}
        <div className="border border-squadrun-gray/20 rounded-md mt-4 mb-4">
            <Card className="bg-squadrun-transparent border border-none">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">UPLOAD A PROJECT FOLDER</h3>

                {/* Drag and Drop Area */}
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive
                    ? 'border-squadrun-primary bg-squadrun-primary/10'
                    : 'border-squadrun-gray/30 bg-squadrun-darker/60'
                    }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <FolderOpen className="w-8 h-8 text-squadrun-gray mx-auto mb-4" />
                  <p className="text-squadrun-gray mb-2">Drag and drop your project folder here</p>
                  <p className="text-squadrun-gray text-sm">or use the browse button below</p>
                </div>

                {/* Upload Status */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-4 p-3 bg-squadrun-primary/20 border border-squadrun-primary/30 rounded-lg">
                    <p className="text-white text-sm">
                      {uploading ? 'Processing files...' : `Ready to analyze ${uploadedFiles.length} files`}
                    </p>
                    {uploading && (
                      <p className="text-squadrun-gray text-xs mt-1">
                        Filtering for relevant code files...
                      </p>
                    )}
                    {uploadedFiles.length > 0 && !uploading && (
                      <div className="mt-2 max-h-32 overflow-y-auto">
                        {uploadedFiles.slice(0, 10).map((file, index) => (
                          <div key={index} className="text-squadrun-gray text-xs truncate">
                            {(file as any).relativePath || file.name}
                          </div>
                        ))}
                        {uploadedFiles.length > 10 && (
                          <div className="text-squadrun-gray text-xs">
                            ... and {uploadedFiles.length - 10} more files
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Browse for Folder Button */}
                <div className="mt-4 flex justify-center">
                  <Button
                    onClick={() => folderInputRef.current?.click()}
                    variant="default"
                    disabled={uploading}
                    className="bg-squadrun-primary hover:bg-squadrun-primary/80 text-white"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <FolderOpen className="w-4 h-4 mr-2" />
                        Browse Folder
                      </>
                    )}
                  </Button>
                  <input
                    ref={folderInputRef}
                    type="file"
                    className="hidden"
                    {...{ webkitdirectory: '', directory: '' } as any}
                    multiple
                    onChange={handleFolderInputChange}
                  />
                </div>
              </CardContent>
            </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto ">
      <div className="border border-squadrun-gray/20 rounded-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 p-4 border border-squadrun-gray/20 rounded-none bg-squadrun-darker/40">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold ml-2 text-white/80">REPOSITORY SELECTION</h2>
          </div>
          <div className="flex items-center gap-2 text-white/80 mr-2">
            <FaGithub className="w-4 h-4" />
            <span>Connected account: <span className="font-bold text-white/80">{user?.name || 'Unknown'}</span></span>
          </div>
        </div>

        {/* Main Content */}
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-white/80 mb-2 ml-6">Select a repository</h3>
          <p className="text-squadrun-gray ml-6">Analyze code directly from your repositories.</p>
        </div>
        <div className="border border-squadrun-gray/20 ml-8 mr-8 mb-1"></div>
        {/* Repository List */}
        {/* Search Bar for filtering repositories */}
        <div className="flex items-center gap-3 mb-4 ml-8 mr-8 mt-4">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search repositories..."
            className="flex-1 px-3 py-2 rounded bg-transparent text-white placeholder:text-squadrun-gray outline-none"
          />
        </div>
        <div className="space-y-2 max-h-80 ml-8 mr-8 overflow-y-auto">
          {loading && (
            <div className="text-center py-8">
              <div className="text-squadrun-gray">Loading repositories...</div>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <div className="text-red-400 mb-4">{error}</div>
              <Button onClick={fetchRepos} variant="outline" className="text-squadrun-primary border-squadrun-primary">
                Try Again
              </Button>
            </div>
          )}

          {!loading && !error && repos.length === 0 && (
            <div className="text-center py-8">
              <div className="text-squadrun-gray">No repositories found.</div>
            </div>
          )}

          {!loading && !error && repos.length > 0 && filteredRepos.length === 0 && (
            <div className="text-center py-8">
              <div className="text-squadrun-gray">No repositories match your search.</div>
            </div>
          )}

          {filteredRepos.map((repo) => (
            <Card
              key={repo.id}
              className={`cursor-pointer transition-all duration-200 border-none ${selectedRepo?.id === repo.id ? 'rounded-none mt-2 ml-6 mr-6 bg-squadrun-darker' : 'bg-transparent'
                }`}
              onClick={() => handleRepoClick(repo)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <FaGithub className="w-5 h-5 text-white/80 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-white/80 font-medium truncate">{repo.full_name}</div>
                    {repo.description ? (
                      <div className="text-squadrun-gray text-sm truncate mt-1">
                        {repo.description}
                      </div>
                    ) : null}
                    <div className="text-squadrun-gray text-sm truncate mt-1">
                      {repo.language ? repo.language : 'No language'}
                    </div>
                  </div>
                  {repo.private && (
                    <div className="text-xs text-squadrun-gray bg-squadrun-primary/20 px-2 py-1 rounded-md">
                      Private
                    </div>
                  )}
                </div>

                {/* Show Start Analyzing button when repository is selected */}
                {selectedRepo?.id === repo.id && (
                  <div className="mt-3 flex px-2 py-2 justify-start">
                      <select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className="mr-5 w-1/5 bg-transparent border border-none text-white text-sm px-2 py-1"
                      >
                        <option value="" disabled>
                          Select a branch
                        </option>
                        {availableBranches.map((b) => (
                          <option key={b.name} value={b.name}>{b.name}</option>
                        ))}
                      </select>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartAnalyzing({ ...repo, branchPreferred: selectedBranch || 'main' } as any);
                      }}
                      className="bg-squadrun-primary rounded-full border-none hover:bg-squadrun-primary/80 text-white/80 px-4 py-2 flex items-center gap-2"
                    >
                      Load Repository
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Refresh Repositories Button */}
        {!loading && !error && repos.length > 0 && (
          <div className="mt-6 mb-1 flex justify-end">
            <Button
              onClick={fetchRepos}
              variant="outline"
              size="sm"
              className="text-squadrun-primary hover:text-squadrun-gray/80 border-squadrun-primary hover:bg-squadrun-primary/20 mb-7 mr-6"
            >
              Refresh Repositories
            </Button>
          </div>
        )}
      </div>
      {/*
      Collapsible Advanced Options and Upload Project Folder section.
      We'll use a local state to control collapse/expand.
    */}
      <div>
        {/* Collapsible Header */}
        <div
          className="flex items-center justify-between cursor-pointer select-none px-2 py-3 group mt-2"
          onClick={() => setMoreOptionsCollapsed((prev) => !prev)}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-squadrun-gray hover:text-squadrun-gray/80">More Options</span>
          </div>
          <button
            className="transition-transform duration-200 text-squadrun-gray group-hover:text-squadrun-gray/80"
            aria-label={moreOptionsCollapsed ? "Expand" : "Collapse"}
            tabIndex={-1}
            type="button"
          >
            <svg
              className={`w-5 h-5 transition-transform duration-200 ${moreOptionsCollapsed ? "" : "rotate-180"}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Collapsible Content */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out`}
          style={{
            maxHeight: moreOptionsCollapsed ? 0 : 2000,
            opacity: moreOptionsCollapsed ? 0 : 1,
            pointerEvents: moreOptionsCollapsed ? "none" : "auto",
          }}
        >
          {/* ADVANCED OPTIONS Card */}
          <div className="mt-1">
            <Card className="bg-transparent mt-1 border border-squadrun-gray/20 rounded-md">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">ADVANCED OPTIONS</h3>

                {/* GitHub Repository URL Input */}
                <div className="flex items-center gap-3 mb-4">
                  <Link className="w-4 h-4 text-squadrun-gray" />
                  <Input
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="Enter a public GitHub repository URL"
                    className="flex-1 bg-squadrun-darker/60 border-none text-white placeholder:text-squadrun-gray"
                  />
                  <Button
                    onClick={handleLoadRepository}
                    disabled={loadingRepository}
                    variant="outline"
                    size="sm"
                    className="bg-squadrun-gray/20 border-squadrun-gray/30 text-white hover:bg-squadrun-gray/30"
                  >
                    {loadingRepository ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {loadingProgress.total > 0
                          ? `Loading Files (${loadingProgress.current}/${loadingProgress.total})`
                          : 'Loading Repository'
                        }
                      </>
                    ) : (
                      'Load Repository'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* UPLOAD FILES Card */}
          <div className="border border-squadrun-gray/20 rounded-md mt-4 mb-4">
            <Card className="bg-squadrun-transparent border border-none">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">UPLOAD A PROJECT FOLDER</h3>

                {/* Drag and Drop Area */}
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive
                    ? 'border-squadrun-primary bg-squadrun-primary/10'
                    : 'border-squadrun-gray/30 bg-squadrun-darker/60'
                    }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <FolderOpen className="w-8 h-8 text-squadrun-gray mx-auto mb-4" />
                  <p className="text-squadrun-gray mb-2">Drag and drop your project folder here</p>
                  <p className="text-squadrun-gray text-sm">or use the browse button below</p>
                </div>

                {/* Upload Status */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-4 p-3 bg-squadrun-primary/20 border border-squadrun-primary/30 rounded-lg">
                    <p className="text-white text-sm">
                      {uploading ? 'Processing files...' : `Ready to analyze ${uploadedFiles.length} files`}
                    </p>
                    {uploading && (
                      <p className="text-squadrun-gray text-xs mt-1">
                        Filtering for relevant code files...
                      </p>
                    )}
                    {uploadedFiles.length > 0 && !uploading && (
                      <div className="mt-2 max-h-32 overflow-y-auto">
                        {uploadedFiles.slice(0, 10).map((file, index) => (
                          <div key={index} className="text-squadrun-gray text-xs truncate">
                            {(file as any).relativePath || file.name}
                          </div>
                        ))}
                        {uploadedFiles.length > 10 && (
                          <div className="text-squadrun-gray text-xs">
                            ... and {uploadedFiles.length - 10} more files
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Browse for Folder Button */}
                <div className="mt-4 flex justify-center">
                  <Button
                    onClick={() => folderInputRef.current?.click()}
                    variant="default"
                    disabled={uploading}
                    className="bg-squadrun-primary hover:bg-squadrun-primary/80 text-white"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <FolderOpen className="w-4 h-4 mr-2" />
                        Browse Folder
                      </>
                    )}
                  </Button>
                  <input
                    ref={folderInputRef}
                    type="file"
                    className="hidden"
                    {...{ webkitdirectory: '', directory: '' } as any}
                    multiple
                    onChange={handleFolderInputChange}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
