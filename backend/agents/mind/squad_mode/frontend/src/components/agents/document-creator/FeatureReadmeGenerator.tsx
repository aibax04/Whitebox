import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, RefreshCw, ArrowRight, Download, Copy, Check, Send, GitBranch, Upload, GitFork } from "lucide-react";
import { generateFeatureReadme } from "@/utils/aiUtils/documentGeneration";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

interface FileData {
  path: string;
  content: string;
}

interface FeatureReadmeGeneratorProps {
  fileContent?: string | null;
  fileName?: string | null;
  repoFiles?: FileData[] | null;
  repoUrl?: string | null;
  repoUrls?: string[] | null;
  useAdvancedAnalysis?: boolean;
}

export default function FeatureReadmeGenerator({
  fileContent,
  fileName,
  repoFiles,
  repoUrl,
  repoUrls,
  useAdvancedAnalysis = false
}: FeatureReadmeGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [readmeContent, setReadmeContent] = useState<string>("");
  const [isCopied, setIsCopied] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isApplyingAiChanges, setIsApplyingAiChanges] = useState(false);
  const [branches, setBranches] = useState<Array<{ name: string; commitSha?: string }>>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [isPushing, setIsPushing] = useState(false);
  const [isFetchingBranches, setIsFetchingBranches] = useState(false);
  const [repoBranches, setRepoBranches] = useState<Record<string, Array<{ name: string; commitSha?: string }>>>({});
  const [repoSelectedBranches, setRepoSelectedBranches] = useState<Record<string, string>>({});
  const [selectedReposToPush, setSelectedReposToPush] = useState<string[]>([]);
  const [pushProgress, setPushProgress] = useState<Record<string, { status: 'pending' | 'pushing' | 'success' | 'error'; message?: string }>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasData = (repoFiles && repoFiles.length > 0) || fileContent;

  // Auto-resize textarea function
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  // Auto-resize on content change
  useEffect(() => {
    adjustTextareaHeight();
  }, [aiPrompt]);

  // Fetch branches from GitHub for a specific repository
  const fetchBranchesForRepo = async (repoUrl: string) => {
    try {
      setIsFetchingBranches(true);
      const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!match) {
        return;
      }
      
      const [, owner, repo] = match;
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/github/branches?owner=${owner}&repo=${repo}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch branches');
      }
      
      const data = await response.json();
      if (data.branches && data.branches.length > 0) {
        // Store branches for this repository
        setRepoBranches(prev => ({
          ...prev,
          [repoUrl]: data.branches
        }));
        
        // Set default branch for this repository
        const defaultBranch = data.branches.find((b: { name: string }) => b.name === 'main') 
          || data.branches.find((b: { name: string }) => b.name === 'master')
          || data.branches[0];
        if (defaultBranch) {
          setRepoSelectedBranches(prev => ({
            ...prev,
            [repoUrl]: defaultBranch.name
          }));
        }
        
        // For backward compatibility with single repoUrl
        if (repoUrl === repoUrl && !repoUrls) {
          setBranches(data.branches);
          if (defaultBranch) {
            setSelectedBranch(defaultBranch.name);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
      toast.error(`Failed to fetch branches for ${repoUrl}`);
    } finally {
      setIsFetchingBranches(false);
    }
  };

  // Push README to GitHub
  const handlePushToGitHub = async () => {
    if (!readmeContent) {
      toast.error('No README content to push');
      return;
    }

    // Determine which repositories to push to
    const reposToPush: string[] = [];
    if (repoUrls && repoUrls.length > 0 && selectedReposToPush.length > 0) {
      reposToPush.push(...selectedReposToPush);
    } else if (repoUrl) {
      reposToPush.push(repoUrl);
    } else {
      toast.error('No repository selected for pushing');
      return;
    }

    if (reposToPush.length === 0) {
      toast.error('Please select at least one repository to push to');
      return;
    }

    try {
      setIsPushing(true);
      const token = localStorage.getItem('token');
      const results: Array<{ repo: string; success: boolean; error?: string }> = [];

      // Initialize progress tracking
      const initialProgress: Record<string, { status: 'pending' | 'pushing' | 'success' | 'error'; message?: string }> = {};
      reposToPush.forEach(repo => {
        initialProgress[repo] = { status: 'pending' };
      });
      setPushProgress(initialProgress);

      // Push to each selected repository
      for (const repoUrl of reposToPush) {
        try {
          const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
          if (!match) {
            throw new Error('Invalid GitHub repository URL');
          }
          
          const [, owner, repo] = match;
          
          // Get branch for this repository
          let branch = repoSelectedBranches[repoUrl] || selectedBranch;
          if (!branch) {
            // Try to get from repoBranches or use default
            const branchesForRepo = repoBranches[repoUrl];
            if (branchesForRepo && branchesForRepo.length > 0) {
              branch = branchesForRepo.find((b: { name: string }) => b.name === 'main')?.name
                || branchesForRepo.find((b: { name: string }) => b.name === 'master')?.name
                || branchesForRepo[0]?.name;
            }
          }
          // Fallback to main if still no branch
          branch = branch || 'main';
          
          // Update progress to pushing
          setPushProgress(prev => ({
            ...prev,
            [repoUrl]: { status: 'pushing' }
          }));
          
          const response = await fetch('/api/github/push-file', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              owner,
              repo,
              path: 'README.md',
              content: readmeContent,
              message: 'docs: Updated README.md using Squadmode AI',
              branch: branch
            })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to push file to GitHub');
          }
          
          const data = await response.json();
          results.push({ repo: repoUrl, success: true });
          
          // Update progress to success
          setPushProgress(prev => ({
            ...prev,
            [repoUrl]: { status: 'success', message: 'Pushed successfully' }
          }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to push README to GitHub';
          results.push({ repo: repoUrl, success: false, error: errorMessage });
          
          // Update progress to error
          setPushProgress(prev => ({
            ...prev,
            [repoUrl]: { status: 'error', message: errorMessage }
          }));
        }
      }

      // Show summary toast
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;
      
      if (errorCount === 0) {
        toast.success(`README.md pushed successfully to ${successCount} repository${successCount > 1 ? 'ies' : ''}!`);
      } else if (successCount > 0) {
        toast.warning(`Pushed to ${successCount} repository${successCount > 1 ? 'ies' : ''}, ${errorCount} failed`);
      } else {
        toast.error(`Failed to push to all repositories`);
      }
    } catch (error) {
      console.error('Error pushing to GitHub:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to push README to GitHub');
    } finally {
      setIsPushing(false);
    }
  };

  // Toggle repository selection for pushing
  const toggleRepoSelection = (repoUrl: string) => {
    setSelectedReposToPush(prev => {
      if (prev.includes(repoUrl)) {
        return prev.filter(r => r !== repoUrl);
      } else {
        return [...prev, repoUrl];
      }
    });
  };

  // Get all available repositories
  const getAllRepos = (): string[] => {
    const repos: string[] = [];
    if (repoUrl) repos.push(repoUrl);
    if (repoUrls && repoUrls.length > 0) repos.push(...repoUrls);
    return [...new Set(repos)]; // Remove duplicates
  };

  // Clean markdown content to remove extra asterisks and formatting issues
  const cleanMarkdown = (content: string): string => {
    if (!content) return content;
    
    // Remove markdown code block wrappers if present
    let cleaned = content.replace(/^```markdown\n?/g, '').replace(/^```\n?/g, '').replace(/\n?```$/g, '');
    
    // Remove extra asterisks (triple or more)
    cleaned = cleaned.replace(/\*\*\*/g, '**'); // Replace triple asterisks with double
    cleaned = cleaned.replace(/\*\*\*\*/g, '**'); // Replace quadruple asterisks with double
    
    // Remove escaped asterisks
    cleaned = cleaned.replace(/\\\*/g, '*');
    
    // Clean up any double spaces or extra newlines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    
    return cleaned.trim();
  };

  const handleGenerateReadme = async () => {
    setIsGenerating(true);
    try {
      let filesToAnalyze: FileData[] = [];
      if (repoFiles && repoFiles.length > 0) {
        filesToAnalyze = repoFiles;
      } else if (fileContent) {
        filesToAnalyze = [{ path: fileName || "file", content: fileContent }];
      } else {
        throw new Error("No files available for analysis");
      }

      const content = await generateFeatureReadme(
        filesToAnalyze, 
        repoUrl || "",
        { repoUrls: repoUrls && repoUrls.length > 0 ? repoUrls : undefined }
      );
      const cleanedContent = cleanMarkdown(content);
      setReadmeContent(cleanedContent);
      toast.success("Feature README generated successfully!");
      
      // Fetch branches for all repositories
      const reposToFetch: string[] = [];
      if (repoUrl) {
        reposToFetch.push(repoUrl);
      }
      if (repoUrls && repoUrls.length > 0) {
        reposToFetch.push(...repoUrls);
      }
      
      // Fetch branches for each repository
      for (const repo of reposToFetch) {
        await fetchBranchesForRepo(repo);
      }
      
      // Auto-select all repositories for pushing
      if (reposToFetch.length > 0) {
        setSelectedReposToPush(reposToFetch);
        // Also set for single repo compatibility
        if (reposToFetch.length === 1 && repoUrl) {
          const singleRepo = reposToFetch[0];
          const branchesForRepo = repoBranches[singleRepo];
          if (branchesForRepo && branchesForRepo.length > 0) {
            const defaultBranch = branchesForRepo.find((b: { name: string }) => b.name === 'main') 
              || branchesForRepo.find((b: { name: string }) => b.name === 'master')
              || branchesForRepo[0];
            if (defaultBranch) {
              setSelectedBranch(defaultBranch.name);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error generating Feature README:", error);
      toast.error("Failed to generate Feature README. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!readmeContent) {
      toast.error("No README content to download");
      return;
    }

    const blob = new Blob([readmeContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    const repoName = repoUrl 
      ? repoUrl.split('/').pop()?.replace('.git', '') || 'repository'
      : 'repository';
    link.download = `README-${repoName}-${new Date().toISOString().split('T')[0]}.md`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success("README.md downloaded successfully!");
  };

  const handleCopy = async () => {
    if (!readmeContent) {
      toast.error("No README content to copy");
      return;
    }

    try {
      await navigator.clipboard.writeText(readmeContent);
      setIsCopied(true);
      toast.success("README content copied to clipboard!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Failed to copy content. Please try again.");
    }
  };

  const handleApplyAiChanges = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Please enter a prompt for AI changes");
      return;
    }

    if (!readmeContent) {
      toast.error("Please generate a README first");
      return;
    }

    setIsApplyingAiChanges(true);
    try {
      let filesToAnalyze: FileData[] = [];
      if (repoFiles && repoFiles.length > 0) {
        filesToAnalyze = repoFiles;
      } else if (fileContent) {
        filesToAnalyze = [{ path: fileName || "file", content: fileContent }];
      }

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Please sign in to apply AI changes');
      }

      const response = await fetch('/api/document-generation/apply-ai-changes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentContent: readmeContent,
          userPrompt: aiPrompt,
          files: filesToAnalyze,
          repoUrl: repoUrl || ""
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to apply AI changes');
      }

      const data = await response.json();
      if (data.content) {
        const cleanedContent = cleanMarkdown(data.content);
        setReadmeContent(cleanedContent);
        setAiPrompt("");
        toast.success("AI changes applied successfully!");
      } else {
        throw new Error("No content returned from AI");
      }
    } catch (error) {
      console.error("Error applying AI changes:", error);
      toast.error(error instanceof Error ? error.message : "Failed to apply AI changes. Please try again.");
    } finally {
      setIsApplyingAiChanges(false);
    }
  };

  return (
    <div className="bg-transparent border-none justify-center w-full mx-auto">
      <style>{`
        .markdown-preview h1 {
          font-size: 1.75rem;
          font-weight: 600;
          color: #fff;
          margin-top: 2rem;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #23272F;
          line-height: 1.2;
        }
        .markdown-preview h2 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #fff;
          margin-top: 1.75rem;
          margin-bottom: 0.875rem;
          line-height: 1.2;
        }
        .markdown-preview h3 {
          font-size: 1.25rem;
          font-weight: 500;
          color: #fff;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          line-height: 1.2;
        }
        .markdown-preview h4 {
          font-size: 1.125rem;
          font-weight: 500;
          color: #fff;
          margin-top: 1.25rem;
          margin-bottom: 0.625rem;
          line-height: 1.2;
        }
        .markdown-preview h5 {
          font-size: 1rem;
          font-weight: 500;
          color: #fff;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          line-height: 1.2;
        }
        .markdown-preview h6 {
          font-size: 0.875rem;
          font-weight: 500;
          color: #fff;
          margin-top: 0.875rem;
          margin-bottom: 0.5rem;
          line-height: 1.2;
        }
        .markdown-preview p {
          color: #C9D1D9;
          line-height: 1.7;
          margin-bottom: 1rem;
          font-size: 0.875rem;
        }
        .markdown-preview ul,
        .markdown-preview ol {
          color: #C9D1D9;
          margin-bottom: 1rem;
          padding-left: 1.5rem;
          font-size: 0.875rem;
        }
        .markdown-preview ul {
          list-style-type: disc;
        }
        .markdown-preview ol {
          list-style-type: decimal;
        }
        .markdown-preview li {
          color: #C9D1D9;
          margin-bottom: 0.5rem;
          line-height: 1.6;
        }
        .markdown-preview code {
          background-color: #161B22;
          color: #8b5cf6;
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-size: 0.8125rem;
          font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Consolas', monospace;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .markdown-preview pre {
          background-color: #161B22;
          border: 1px solid #23272F;
          border-radius: 0.5rem;
          padding: 1rem;
          margin-bottom: 1rem;
          overflow-x: auto;
          overflow-wrap: break-word;
          word-wrap: break-word;
          white-space: pre-wrap;
        }
        .markdown-preview pre code {
          background-color: transparent;
          padding: 0;
          color: #C9D1D9;
        }
        .markdown-preview a {
          color: #58A6FF;
          text-decoration: none;
        }
        .markdown-preview a:hover {
          text-decoration: underline;
        }
        .markdown-preview strong,
        .markdown-preview b,
        .markdown-preview p strong,
        .markdown-preview p b,
        .markdown-preview li strong,
        .markdown-preview li b,
        .markdown-preview h1 strong,
        .markdown-preview h2 strong,
        .markdown-preview h3 strong,
        .markdown-preview h4 strong,
        .markdown-preview h5 strong,
        .markdown-preview h6 strong {
          font-weight: 700 !important;
          color: #fff !important;
          font-style: normal !important;
        }
        .markdown-preview em,
        .markdown-preview i,
        .markdown-preview p em,
        .markdown-preview p i,
        .markdown-preview li em,
        .markdown-preview li i {
          font-style: italic !important;
          color: #C9D1D9 !important;
        }
        .markdown-preview blockquote {
          border-left: 4px solid #58A6FF;
          padding-left: 1rem;
          padding-top: 0.5rem;
          padding-bottom: 0.5rem;
          margin-bottom: 1rem;
          color: #8B949E;
          font-style: italic;
        }
        .markdown-preview table {
          border-collapse: collapse;
          width: 100%;
          margin-bottom: 1.5rem;
          font-size: 0.875rem;
        }
        .markdown-preview th {
          background-color: #161B22;
          border: 1px solid #23272F;
          padding: 0.75rem;
          text-align: left;
          font-weight: 600;
          color: #fff;
        }
        .markdown-preview td {
          border: 1px solid #23272F;
          padding: 0.75rem;
          color: #C9D1D9;
        }
        .markdown-preview hr {
          border: none;
          border-top: 1px solid #23272F;
          margin: 2rem 0;
        }
        .markdown-preview > *:first-child {
          margin-top: 0;
        }
        .markdown-preview {
          word-wrap: break-word;
          overflow-wrap: break-word;
          max-width: 100%;
        }
        .markdown-preview * {
          max-width: 100%;
        }
      `}</style>
      <Card className="bg-transparent border-none justify-center w-full max-w-5xl mx-auto">
        <CardContent className="p-6 mt-4">
          <p className="text-gray-200 mb-6 text-sm leading-relaxed text-center">
            Generate a comprehensive Feature README with feature list based on your repository analysis.
          </p>
          
          <div className="flex justify-end gap-5">
            <Button 
              onClick={handleGenerateReadme}
              disabled={isGenerating || !hasData}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isGenerating ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              {isGenerating ? "Generating..." : "Generate README"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {readmeContent && (
        <div className="flex-1 flex flex-col gap-4">
          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                onClick={handleCopy}
                variant="outline"
                className="border-squadrun-primary text-squadrun-primary hover:bg-squadrun-primary/10"
              >
                {isCopied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Content
                  </>
                )}
              </Button>
              <Button
                onClick={handleDownload}
                variant="outline"
                className="border-squadrun-primary text-squadrun-primary hover:bg-squadrun-primary/10"
              >
                <Download className="w-4 h-4 mr-2" />
                Download MD
              </Button>
            </div>
            
            {/* Push to GitHub Section */}
            {(repoUrl || (repoUrls && repoUrls.length > 0)) && (
              <div className="flex flex-col gap-3">
                {/* Repository Selection */}
                {getAllRepos().length > 1 && (
                  <Card className="bg-squadrun-darker/40 border-squadrun-primary/20 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <GitFork className="w-4 h-4 text-squadrun-primary" />
                      <label className="text-sm font-medium text-white">
                        Select repositories to push to:
                      </label>
                    </div>
                    <div className="flex flex-col gap-2">
                      {getAllRepos().map((repo) => {
                        const repoName = repo.split('/').pop() || repo;
                        const isSelected = selectedReposToPush.includes(repo);
                        return (
                          <div key={repo} className="flex items-center gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleRepoSelection(repo)}
                              className="border-squadrun-primary data-[state=checked]:bg-squadrun-primary"
                            />
                            <span className="text-sm text-gray-300 flex-1">{repoName}</span>
                            {isSelected && repoBranches[repo] && repoBranches[repo].length > 1 && (
                              <Select 
                                value={repoSelectedBranches[repo] || ''} 
                                onValueChange={(value) => setRepoSelectedBranches(prev => ({ ...prev, [repo]: value }))}
                              >
                                <SelectTrigger className="w-[150px] bg-squadrun-darker border-squadrun-primary/20 text-white text-xs h-8">
                                  <div className="flex items-center gap-1">
                                    <GitBranch className="w-3 h-3" />
                                    <SelectValue placeholder="Branch" />
                                  </div>
                                </SelectTrigger>
                                <SelectContent className="bg-squadrun-darker border-squadrun-primary/20">
                                  {repoBranches[repo].map((branch) => (
                                    <SelectItem 
                                      key={branch.name} 
                                      value={branch.name}
                                      className="text-white hover:bg-squadrun-primary/20 focus:bg-squadrun-primary/20"
                                    >
                                      {branch.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            {isSelected && repoBranches[repo] && repoBranches[repo].length === 1 && (
                              <div className="flex items-center gap-1 text-xs text-gray-400">
                                <GitBranch className="w-3 h-3" />
                                <span>{repoSelectedBranches[repo] || repoBranches[repo][0]?.name}</span>
                              </div>
                            )}
                            {pushProgress[repo] && (
                              <div className="flex items-center gap-1">
                                {pushProgress[repo].status === 'pushing' && (
                                  <RefreshCw className="w-3 h-3 animate-spin text-blue-400" />
                                )}
                                {pushProgress[repo].status === 'success' && (
                                  <Check className="w-3 h-3 text-green-400" />
                                )}
                                {pushProgress[repo].status === 'error' && (
                                  <span className="text-xs text-red-400">Error</span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                )}
                
                {/* Single Repository or Branch Selection for Single Repo */}
                {getAllRepos().length === 1 && (
                  <div className="flex items-center gap-2">
                    {isFetchingBranches ? (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Loading branches...</span>
                      </div>
                    ) : (() => {
                      const singleRepo = getAllRepos()[0];
                      const repoBranchesList = repoBranches[singleRepo] || branches;
                      const selectedBranchForRepo = repoSelectedBranches[singleRepo] || selectedBranch;
                      
                      if (repoBranchesList.length > 1) {
                        return (
                          <Select value={selectedBranchForRepo} onValueChange={(value) => {
                            setRepoSelectedBranches(prev => ({ ...prev, [singleRepo]: value }));
                            setSelectedBranch(value);
                          }}>
                            <SelectTrigger className="w-[180px] bg-squadrun-darker border-squadrun-primary/20 text-white">
                              <div className="flex items-center gap-2">
                                <GitBranch className="w-4 h-4" />
                                <SelectValue placeholder="Select branch" />
                              </div>
                            </SelectTrigger>
                            <SelectContent className="bg-squadrun-darker border-squadrun-primary/20">
                              {repoBranchesList.map((branch) => (
                                <SelectItem 
                                  key={branch.name} 
                                  value={branch.name}
                                  className="text-white hover:bg-squadrun-primary/20 focus:bg-squadrun-primary/20"
                                >
                                  {branch.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        );
                      } else if (repoBranchesList.length === 1) {
                        return (
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <GitBranch className="w-4 h-4" />
                            <span>{selectedBranchForRepo || repoBranchesList[0]?.name}</span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
                
                {/* Push Button */}
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handlePushToGitHub}
                    disabled={
                      isPushing || 
                      isFetchingBranches || 
                      selectedReposToPush.length === 0
                    }
                    className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                  >
                    {isPushing ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Pushing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Push to GitHub {selectedReposToPush.length > 1 ? `(${selectedReposToPush.length})` : ''}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* AI Prompt Section */}
          <Card className="bg-squadrun-darker/60 border-squadrun-primary/20">
            <CardContent className="p-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-white">
                  Ask AI to make changes to the README:
                </label>
                <div className="flex gap-2">
                  <Textarea
                    ref={textareaRef}
                    value={aiPrompt}
                    onChange={(e) => {
                      setAiPrompt(e.target.value);
                      adjustTextareaHeight();
                    }}
                    onInput={adjustTextareaHeight}
                    placeholder="e.g., Add more details about the authentication feature..."
                    className="flex-1 bg-squadrun-darker border-squadrun-primary/20 text-white resize-none overflow-hidden"
                    style={{ minHeight: '40px' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        handleApplyAiChanges();
                      }
                    }}
                  />
                  <Button
                    onClick={handleApplyAiChanges}
                    disabled={isApplyingAiChanges || !aiPrompt.trim()}
                    className="bg-squadrun-primary hover:bg-squadrun-primary/80 text-white"
                  >
                    {isApplyingAiChanges ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-squadrun-gray">
                  Press Ctrl+Enter to apply changes
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Side-by-side README Editor and Preview */}
          <Card className="flex-1 bg-squadrun-darker/60 border-squadrun-primary/20">
            <CardContent className="p-4 h-full flex flex-col">
              <div className="flex-1 grid grid-cols-2 gap-4 h-full">
                {/* Left Side - Markdown Editor */}
                <div className="flex flex-col h-full">
                  <label className="text-sm font-medium text-white mb-2">
                    Markdown Editor
                  </label>
                  <Textarea
                    value={readmeContent}
                    onChange={(e) => setReadmeContent(e.target.value)}
                    className="flex-1 font-mono text-sm bg-squadrun-darker border border-squadrun-primary/20 text-white resize-none rounded p-4"
                    placeholder="Edit your README markdown here..."
                  />
                </div>

                {/* Right Side - Rendered Preview */}
                <div className="flex flex-col h-full">
                  <label className="text-sm font-medium text-white mb-2">
                    Preview
                  </label>
                  <div 
                    className="flex-1 overflow-y-auto overflow-x-hidden p-4 bg-squadrun-darker rounded border border-squadrun-primary/20 markdown-preview"
                    style={{
                      color: '#C9D1D9',
                      lineHeight: '1.6',
                      fontSize: '14px',
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word'
                    }}
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkBreaks]}
                    >
                      {readmeContent}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!hasData && (
        <Card className="bg-gray-900 border border-gray-700 flex-1">
          <CardContent className="p-8 text-center flex flex-col justify-center">
            <FileText className="w-12 h-12 text-purple-500 mx-auto mb-4" />
            <p className="text-gray-400">
              No code files available for Feature README generation. Please upload files or select a repository.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

