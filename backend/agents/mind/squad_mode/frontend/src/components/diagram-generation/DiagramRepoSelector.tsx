import { useState, useEffect } from 'react';
import { ArrowRight, Loader2, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { GitHubRepo } from '@/types/github';
import { FaGithub } from 'react-icons/fa';
import { 
  fetchUserRepos, 
  fetchRepoBranches, 
  fetchRepoFilesForBranch, 
  fetchFilesContents 
} from '@/utils/githubApi';
import { 
  generatePklFilename, 
  ensureRepoEmbeddings, 
  getFilesListFromEmbeddings 
} from '@/utils/repoEmbeddingApi';
import { filterRelevantCodeFiles } from '@/utils/fileFilters';

interface DiagramRepoSelectorProps {
  onRepositorySelect: (repo: GitHubRepo & { repoFiles?: any[]; repoUrl?: string }) => void;
}

export default function DiagramRepoSelector({ onRepositorySelect }: DiagramRepoSelectorProps) {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notConnected, setNotConnected] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [githubUrl, setGithubUrl] = useState('');
  const [loadingRepository, setLoadingRepository] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });
  const [availableBranches, setAvailableBranches] = useState<{ name: string; commitSha?: string }[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [moreOptionsCollapsed, setMoreOptionsCollapsed] = useState(true);
  const { user } = useAuth();

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
          toast.success(`Generated embeddings for ${embeddingResult.fileCount} files - ready for diagram generation!`, { id: 'repo-loading' });
        } else {
          toast.info('Using existing embeddings', { id: 'repo-loading' });
        }
        
        loadedFromEmbeddings = true;
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
          const relevantFiles = filterRelevantCodeFiles(allFiles);
          
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

      // Make sure we have embeddings loaded
      if (!loadedFromEmbeddings) {
        toast.info('Repository loaded. Embeddings are ready.', { id: 'repo-loading' });
      }

      const enhancedRepo = {
        ...repo,
        repoFiles: allFilesWithContent,
        repoUrl: repoUrl,
        branchPreferred: branchToUse,
        pklFilename: pklFilename
      };
      
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

      const pklFilename = generatePklFilename(owner, repo);
      const token = localStorage.getItem('token');
      const repoUrl = `https://github.com/${owner}/${repo}`;
      
      try {
        toast.loading('Checking embeddings...', { id: 'repo-loading-url' });
        
        const embeddingResult = await ensureRepoEmbeddings(
          repoUrl,
          pklFilename,
          true,
          token || undefined
        );
        
        if (embeddingResult.generated) {
          toast.success(`Generated embeddings for ${embeddingResult.fileCount} files - ready for diagram generation!`, { id: 'repo-loading-url' });
        } else {
          toast.info('Using existing embeddings', { id: 'repo-loading-url' });
        }
        
        loadedFromEmbeddings = true;
        toast.loading('Loading files from embeddings...', { id: 'repo-loading-url' });
        
        const filesList = await getFilesListFromEmbeddings(pklFilename, token || undefined);
        
        allFilesWithContent = filesList.files.map((file: any) => ({
          path: file.path,
          type: 'blob',
          size: file.size || 0,
          content: undefined
        }));
        
        toast.success(`Loaded ${allFilesWithContent.length} files from embeddings`, { id: 'repo-loading-url' });
      } catch (embeddingError) {
        console.warn('Error ensuring/loading embeddings, falling back to GitHub:', embeddingError);
        const githubToken = localStorage.getItem('github_token');

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
          const relevantFiles = filterRelevantCodeFiles(allFiles);
          
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

      // Make sure we have embeddings loaded
      if (!loadedFromEmbeddings) {
        toast.info('Repository loaded. Embeddings are ready.', { id: 'repo-loading-url' });
      }

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
        repoUrl: repoUrl,
        branchPreferred: branchToUse,
        pklFilename: pklFilename
      };

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

  const handleRepoClick = (repo: GitHubRepo) => {
    setSelectedRepo(repo);
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
        
        {/* Search Bar */}
        <div className="flex items-center gap-3 mb-4 ml-8 mr-8 mt-4">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search repositories..."
            className="flex-1 px-3 py-2 rounded bg-transparent text-white placeholder:text-squadrun-gray outline-none"
          />
        </div>

        {/* Repository List */}
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
              className={`cursor-pointer transition-all duration-200 border-none ${
                selectedRepo?.id === repo.id ? 'rounded-none mt-2 ml-6 mr-6 bg-squadrun-darker' : 'bg-transparent'
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

                {/* Show Load Repository button when repository is selected */}
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
                        handleLoadRepositoryFromRepo(repo);
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

      {/* Collapsible Advanced Options */}
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
        </div>
      </div>
    </div>
  );
}

