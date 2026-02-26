import { useState, useEffect, useRef } from 'react';
import { ArrowRight, Loader2, Link, FolderOpen, ToggleLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle, CardHeader } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { GitHubRepo, GitHubRepoSelectorProps } from '@/types/github';
import { FaGithub } from 'react-icons/fa';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { fetchUserRepos, fetchRepoFiles, fetchFilesContents, fetchRepoBranches, fetchRepoFilesForBranch } from '@/utils/githubApi';
import { filterRelevantCodeFiles, getFilterStats } from '@/utils/fileFilters';
import { checkEmbeddingFile, getFilesListFromEmbeddings, generatePklFilename, ensureRepoEmbeddings } from '@/utils/repoEmbeddingApi';
import { Toggle } from '@radix-ui/react-toggle';

export default function GitHubRepoSelector({ onRepoSelect, selectedRepo }: GitHubRepoSelectorProps) {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notConnected, setNotConnected] = useState(false);
  const [localSelectedRepo, setLocalSelectedRepo] = useState<GitHubRepo | null>(selectedRepo || null);
  const [githubUrl, setGithubUrl] = useState('');
  const [loadingRepository, setLoadingRepository] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ total: 0, current: 0 });
  const [availableBranches, setAvailableBranches] = useState<{ name: string; commitSha?: string }[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadCollapsed, setUploadCollapsed] = useState(true);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  // Pasted code analysis state
  const [codebase, setCodebase] = useState('');
  const [codeAnalysis, setCodeAnalysis] = useState<{
    totalChars: number;
    totalLines: number;
    files: { path: string; content: string }[];
  } | null>(null);
  const [analyzingCodebase, setAnalyzingCodebase] = useState(false);
  
  // New workflow toggle state
  const [useAdvancedAnalysis, setUseAdvancedAnalysis] = useState(false);
  
  // Multi-select state
  const [selectedRepos, setSelectedRepos] = useState<Set<number>>(new Set());

  // Clear uploaded files when navigating away (e.g., back) so nothing persists
  useEffect(() => {
    return () => {
      setUploadedFiles([]);
      setUploading(false);
    };
  }, []);

  const fetchRepos = async () => {
    setLoading(true);
    setError(null);
    setNotConnected(false);
    try {
      try {
        const data = await fetchUserRepos();
        setRepos(Array.isArray(data) ? data : []);
      } catch (resError: any) {
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

  useEffect(() => {
    setLocalSelectedRepo(selectedRepo);
  }, [selectedRepo]);

  const filteredRepos = repos.filter((repo) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    const name = (repo.full_name || repo.name || '').toLowerCase();
    const desc = (repo.description || '').toLowerCase();
    return name.includes(query) || desc.includes(query);
  });

  const handleRepoClick = (repo: GitHubRepo) => {
    setLocalSelectedRepo(repo);
  };

  const handleStartAnalyzing = (repo: GitHubRepo) => {
    onRepoSelect(repo, useAdvancedAnalysis);
  };

  // Multi-select handlers
  const handleRepoToggle = (repo: GitHubRepo, event: React.MouseEvent) => {
    event.stopPropagation();
    const newSelected = new Set(selectedRepos);
    if (newSelected.has(repo.id)) {
      newSelected.delete(repo.id);
    } else {
      newSelected.add(repo.id);
    }
    setSelectedRepos(newSelected);
  };

  const handleLoadSelectedRepos = async () => {
    if (selectedRepos.size === 0) {
      toast.error('Please select at least one repository');
      return;
    }
    
    const reposToLoad = repos.filter(repo => selectedRepos.has(repo.id));
    if (reposToLoad.length > 0) {
      // Pass array of repos to onRepoSelect
      onRepoSelect(reposToLoad, useAdvancedAnalysis);
    }
  };

  const isRepoSelected = (repoId: number) => selectedRepos.has(repoId);

  const handleConnectGitHub = () => {
    window.location.href = '/api/auth/github/login';
  };

  // Fetch branches when a repo from the list is selected
  useEffect(() => {
    const fetchBranchesForSelected = async () => {
      if (!localSelectedRepo) return;
      try {
        const [owner, repo] = (localSelectedRepo.full_name || '').split('/');
        if (!owner || !repo) return;
        const branches = await fetchRepoBranches(owner, repo, null);
        setAvailableBranches(branches);
        const defaultBranch = branches.find(b => b.name === 'main')?.name || branches[0]?.name || '';
        setSelectedBranch(defaultBranch);
      } catch (e) {
        setAvailableBranches([]);
      }
    };
    fetchBranchesForSelected();
  }, [localSelectedRepo]);

  const handleLoadRepository = async () => {
    if (!githubUrl.trim()) {
      toast.error('Please enter a GitHub repository URL');
      return;
    }

    setLoadingRepository(true);
    setLoadingProgress({ total: 0, current: 0 });
    toast.loading('Loading repository files...', { id: 'doc-repo-loading' });

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
        toast.loading('Checking embeddings...', { id: 'doc-repo-loading' });
        
        const embeddingResult = await ensureRepoEmbeddings(
          repoUrl,
          pklFilename,
          true, // auto-generate if missing
          token || undefined
        );
        
        if (embeddingResult.generated) {
          toast.success(`Generated embeddings for ${embeddingResult.fileCount} files`, { id: 'doc-repo-loading' });
        }
        
        loadedFromEmbeddings = true;
        // Load from embeddings instead of GitHub - skip all GitHub API calls
        toast.loading('Loading files from embeddings...', { id: 'doc-repo-loading' });
        
        const filesList = await getFilesListFromEmbeddings(pklFilename, token || undefined);
        
        // Convert to the expected format
        allFilesWithContent = filesList.files.map((file: any) => ({
          path: file.path,
          type: 'blob',
          size: file.size || 0,
          content: undefined // Content will be loaded on demand from embeddings
        }));
        
        setLoadingProgress({ current: allFilesWithContent.length, total: allFilesWithContent.length });
        toast.success(`Loaded ${allFilesWithContent.length} files from embeddings`, { id: 'doc-repo-loading' });
      } catch (embeddingError) {
        console.warn('Error ensuring/loading embeddings, falling back to GitHub:', embeddingError);
        // Fall back to GitHub API
        // No embeddings, load from GitHub
        // fetch branches first
        try {
          const branches = await fetchRepoBranches(owner, repo, null);
          setAvailableBranches(branches);
          if (!selectedBranch && branches.length > 0) {
            const defaultBranch = branches.find(b => b.name === 'main')?.name || branches[0].name;
            setSelectedBranch(defaultBranch);
          }
        } catch {}

        branchToUse = selectedBranch || 'main';
        const repoFilesData = await fetchRepoFilesForBranch(owner, repo, branchToUse, null);

        if (repoFilesData.tree && repoFilesData.tree.length > 0) {
          const allFiles = repoFilesData.tree.filter((item: any) => item.type === 'blob');
          
          // Filter to only relevant code files
          const relevantFiles = filterRelevantCodeFiles(allFiles);
          
          // Get statistics for user feedback
          const stats = getFilterStats(allFiles, relevantFiles);
          
          if (relevantFiles.length === 0) {
            toast.error('No relevant code files found in repository', { id: 'doc-repo-loading' });
            setLoadingRepository(false);
            return;
          }
          
          setLoadingProgress({ current: 0, total: relevantFiles.length });

          const paths = relevantFiles.map((f: any) => f.path);
          const results = await fetchFilesContents(owner, repo, paths, null);
          allFilesWithContent = results.map((r, index) => {
            let content = '';
            if (r.content && r.encoding === 'base64') content = atob(r.content);
            else content = r.content || '';
            return { ...relevantFiles[index], path: r.path || relevantFiles[index].path, content };
          });
          setLoadingProgress({ current: relevantFiles.length, total: relevantFiles.length });
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
        description: `Public repository: ${owner}/${repo}`,
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
        toast.success(`Successfully loaded ${allFilesWithContent.length} files from repository`, { id: 'doc-repo-loading' });
      }
      
      onRepoSelect(repoInfo, useAdvancedAnalysis);
    } catch (error) {
      console.error('Error loading repository:', error);
      toast.error('Failed to load repository', { id: 'doc-repo-loading' });
    } finally {
      setLoadingRepository(false);
      setLoadingProgress({ current: 0, total: 0 });
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
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
        if ((item as any).webkitGetAsEntry) {
          const entry = (item as any).webkitGetAsEntry();
          if (entry) return processEntry(entry);
        }
        return Promise.resolve();
      })).then(() => {
        if (files.length > 0) {
          setUploadedFiles(files);
          handleFolderUpload(files);
        }
      });
    } else {
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const filesWithPaths = Array.from(files).map(file => {
          const fullPath = (file as any).webkitRelativePath || (file as any).relativePath || file.name;
          (file as any).relativePath = fullPath;
          return file;
        });
        setUploadedFiles(filesWithPaths);
        handleFolderUpload(filesWithPaths);
      }
    }
  };

  const handleFolderInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const filesWithPaths = Array.from(files).map(file => {
        const fullPath = (file as any).webkitRelativePath || (file as any).relativePath || file.name;
        (file as any).relativePath = fullPath;
        return file;
      });
      setUploadedFiles(filesWithPaths);
      handleFolderUpload(filesWithPaths);
    }
  };

  const handleFolderUpload = async (files: File[]) => {
    if (!files || files.length === 0) {
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
          '.rtf',
          '.DS_Store', 'Thumbs.db', '.Spotlight-V100', '.Trashes',
          'ehthumbs.db', 'Desktop.ini'
        ];

        if (skipPatterns.some(pattern => lowerPath.includes(pattern))) {
          return false;
        }

        const codeExtensions = [
          '.html', '.htm', '.css', '.scss', '.sass', '.less', '.styl',
          '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte', '.astro',
          '.py', '.pyw', '.java', '.cpp', '.cc', '.cxx', '.c', '.h', '.hpp',
          '.cs', '.go', '.rs', '.rb', '.php', '.pl',
          '.swift', '.kt', '.scala', '.clj', '.hs', '.ml', '.f90',
          '.r', '.m', '.jl', '.d', '.nim', '.zig', '.v',
          '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd',
          '.sql', '.plsql', '.tsql', '.mysql', '.psql',
          '.xml', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf',
          '.json', '.jsonc', '.json5', '.jsonl',
          '.md', '.markdown', '.rst', '.tex', '.adoc', '.wiki',
          '.cmake', '.make', '.mk',
          'Dockerfile', '.dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
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

      const repoInfo = {
        id: Date.now(),
        name: 'Uploaded Project',
        full_name: 'uploaded/project',
        private: false,
        html_url: '',
        description: `Uploaded project folder with ${filesWithContent.length} relevant code files`,
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
      } as any;

      toast.success(`Successfully uploaded ${filesWithContent.length} files from project folder`);
      onRepoSelect(repoInfo, useAdvancedAnalysis);
    } catch (error) {
      console.error('Error processing folder upload:', error);
      toast.error('Failed to process folder upload');
    } finally {
      setUploading(false);
    }
  };

  // --------- Pasted code handlers ---------
  const parsePastedCodeIntoFiles = (text: string): { path: string; content: string }[] => {
    const files: { path: string; content: string }[] = [];
    const fenceRegex = /```([a-zA-Z0-9_+\-]*)\n([\s\S]*?)```/g;
    let match: RegExpExecArray | null;
    let index = 1;
    const seen: Set<string> = new Set();

    while ((match = fenceRegex.exec(text)) !== null) {
      const lang = (match[1] || 'txt').toLowerCase();
      const content = match[2] || '';
      const ext = lang ? `.${lang}` : '.txt';
      const pathBase = `pasted/part_${index}${ext}`;
      const unique = seen.has(pathBase) ? `pasted/part_${index}_${Date.now()}${ext}` : pathBase;
      files.push({ path: unique, content });
      seen.add(unique);
      index += 1;
    }

    if (files.length === 0) {
      // Fallback: treat entire paste as a single file
      files.push({ path: 'pasted/code.txt', content: text });
    }
    return files;
  };

  const handleCodebaseAnalyze = async () => {
    const text = codebase?.trim();
    if (!text) {
      toast.error('Please paste some code first');
      return;
    }
    try {
      setAnalyzingCodebase(true);
      const files = parsePastedCodeIntoFiles(text);
      const totalLines = files.reduce((sum, f) => sum + (f.content?.split('\n').length || 0), 0);
      const totalChars = files.reduce((sum, f) => sum + (f.content?.length || 0), 0);
      setCodeAnalysis({ totalChars, totalLines, files });
      toast.success(`Parsed ${files.length} file(s) from pasted code`);
    } catch (e) {
      console.error(e);
      toast.error('Failed to analyze pasted code');
    } finally {
      setAnalyzingCodebase(false);
    }
  };

  const buildRepoFromPastedCode = (files: { path: string; content: string }[]) => {
    const repoInfo = {
      id: Date.now(),
      name: 'Pasted Codebase',
      full_name: 'pasted/codebase',
      private: false,
      html_url: '',
      description: `Created from pasted input with ${files.length} file(s)`,
      language: null,
      stargazers_count: 0,
      forks_count: 0,
      updated_at: new Date().toISOString(),
      repoFiles: files.map(f => ({ path: f.path, name: f.path.split('/').pop() || 'file', type: 'blob', content: f.content })),
      firstFileContent: files[0]?.content || null,
      firstFileName: files[0]?.path || null,
      isUploadedFolder: true
    } as any;
    return repoInfo;
  };

  const handleCodebaseClear = () => {
    setCodebase('');
    setCodeAnalysis(null);
  };

  if (notConnected) {
    return (
      <div className="p-6 mt-10 bg-transparent border border-none mx-10">
        <div className="text-center">
          <FaGithub className="w-12 h-12 text-squadrun-primary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text_white mb-2">Connect GitHub Account</h3>
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
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="border border-squadrun-gray/20 rounded-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 p-4 border border-squadrun-gray/20 rounded-none bg-squadrun-darker/40">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold ml-2 text-white/80">REPOSITORY SELECTION</h2>
          </div>
          <div className="flex items-center gap-4 text-white/80 mr-2">
            <div className="flex items-center gap-2">
              <Switch
                id="advanced-analysis"
                checked={useAdvancedAnalysis}
                onCheckedChange={setUseAdvancedAnalysis}
                className="data-[state=checked]:bg-squadrun-primary"
              />
              <Label htmlFor="advanced-analysis" className="text-sm text-white/80 cursor-pointer">
                Advanced Analysis
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <FaGithub className="w-4 h-4" />
              <span>Connected account: <span className="font-bold text-white/80">{user?.name || 'Unknown'}</span></span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-white/80 mb-2 ml-6">Select repositories</h3>
          <p className="text-squadrun-gray ml-6">Generate comprehensive documentation based on one or more repository analyses. Select multiple repositories to generate combined embeddings.</p>
          {useAdvancedAnalysis && (
            <div className="ml-8 mr-8 mt-2 p-3 bg-squadrun-primary/20 border border-none rounded-lg">
              <p className="text-squadrun-primary text-sm">
                <strong>Advanced Analysis Mode:</strong> Each file will be individually analyzed to generate detailed context summaries before document generation. This provides more comprehensive and accurate documentation.
              </p>
            </div>
          )}
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
              className={`cursor-pointer transition-all duration-200 border-none ${localSelectedRepo?.id === repo.id || isRepoSelected(repo.id) ? 'rounded-none mt-2 ml-6 mr-6 bg-squadrun-darker' : 'bg-transparent'
                }`}
              onClick={() => handleRepoClick(repo)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isRepoSelected(repo.id)}
                    onChange={(e) => handleRepoToggle(repo, e as any)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 text-squadrun-primary bg-transparent border-squadrun-gray rounded focus:ring-squadrun-primary focus:ring-2 cursor-pointer"
                  />
                  <FaGithub className="w-5 h-5 text-white/80 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-white/80 font-medium truncate">{repo.full_name}</div>
                    {repo.description ? (
                      <div className="text-squadrun-gray text-sm truncate mt-1">
                        {repo.description}
                      </div>
                    ) : (
                      <div className="text-squadrun-gray text-sm truncate mt-1">
                        No description
                      </div>
                    )}
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

                {/* Show Start Analyzing button when repository is selected (but not if it's in multi-select) */}
                {localSelectedRepo?.id === repo.id && !isRepoSelected(repo.id) && (
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

        {/* Load Selected Repositories Button */}
        {selectedRepos.size > 0 && (
          <div className="mt-4 ml-8 mr-8 mb-4">
            <Button
              onClick={handleLoadSelectedRepos}
              className="bg-squadrun-primary hover:bg-squadrun-primary/80 text-white w-full"
            >
              Load {selectedRepos.size} Selected Repository{selectedRepos.size > 1 ? 'ies' : ''}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Refresh Button */}
        {!loading && !error && repos.length > 0 && (
          <div className="mt-6 flex justify-end">
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
      <div>
      <div
            className="flex items-center justify-between cursor-pointer select-none px-4 py-3 group"
            onClick={() => setUploadCollapsed((prev) => !prev)}
          >
            <h3 className="text-lg font-semibold justify-start mt-4 text-squadrun-gray group-hover:text-squadrun-gray/80">More Options</h3>
            <button
              className="transition-transform duration-200 text-squadrun-gray group-hover:text-squadrun-gray/80"
              aria-label={uploadCollapsed ? "Expand" : "Collapse"}
              tabIndex={-1}
              type="button"
            >
              <svg
                className={`w-5 h-5 transition-transform duration-200 ${uploadCollapsed ? "" : "rotate-180"}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        <div>
          {/* Collapsible Content */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out`}
            style={{
              maxHeight: uploadCollapsed ? 0 : 2000,
              opacity: uploadCollapsed ? 0 : 1,
              pointerEvents: uploadCollapsed ? "none" : "auto",
            }}
          >
            <Card className="bg-squadrun-transparent border border-none">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-white">UPLOAD A PROJECT FOLDER</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
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
            <div className="flex items-center gap-2 mb-8 ml-8 mr-8">
            <Input type="text" className="text-squadrun-gray focus:border-none focus:ring-0" placeholder="Paste your codebase here" value={codebase} onChange={(e) => setCodebase(e.target.value)} />
            <Button onClick={handleCodebaseAnalyze} disabled={analyzingCodebase} className="text-white">
              {analyzingCodebase ? 'Analyzing…' : 'Analyze'}
            </Button>
            <Button onClick={handleCodebaseClear} variant="outline" className="text-squadrun-gray">Clear</Button>
          </div>
          {codeAnalysis && (
            <div className="mt-3 flex items-center gap-2 text-sm text-squadrun-gray ml-8">
              <span>
                {codeAnalysis.files.length} file(s), {codeAnalysis.totalLines} lines
              </span>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}