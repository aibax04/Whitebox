
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Building2, Code2, CheckSquare, Github, Zap, CheckCircle, CheckCircle2, CheckCircle2Icon, CheckCircleIcon, LucideCheckCircle2, BookOpen } from "lucide-react";
import BusinessDocumentGenerator from "./document-creator/BusinessDocumentGenerator";
import TechnicalDocumentGenerator from "./document-creator/TechnicalDocumentGenerator";
import CodeQualityCompletenessCheck from "./document-creator/CodeQualityCompletenessCheck";
import FeatureReadmeGenerator from "./document-creator/FeatureReadmeGenerator";
import NoCodeMessage from "./quality/NoCodeMessage";
import GitHubRepoSelector from "./DocRepoSelector";
import { useGitHubRepoSelector } from "./hooks/DocRepoSelectorHook";
import { GitHubRepo } from "@/types/github";
import { FaGithub } from "react-icons/fa";

interface DocumentCreatorProps {
  fileContent?: string | null;
  fileName?: string | null;
}

export default function DocumentCreator({ 
  fileContent, 
  fileName
}: DocumentCreatorProps) {
  const [activeTab, setActiveTab] = useState("business");
  const [showRepoSelector, setShowRepoSelector] = useState(true);
  const [useAdvancedAnalysis, setUseAdvancedAnalysis] = useState(false);

  // Use custom hook for GitHub repo handling
  const repoSelector = useGitHubRepoSelector();

  // Load persisted repository on mount
  useEffect(() => {
    try {
      // Try to load multiple repos first, then fall back to single repo
      const persistedRepos = localStorage.getItem('documentation_repositories');
      const persistedRepo = localStorage.getItem('documentation_repository');
      const persistedAdvancedAnalysis = localStorage.getItem('documentation_advanced_analysis');
      
      if (persistedRepos) {
        try {
          const repos = JSON.parse(persistedRepos);
          if (Array.isArray(repos) && repos.length > 0) {
            if (persistedAdvancedAnalysis) {
              setUseAdvancedAnalysis(persistedAdvancedAnalysis === 'true');
            }
            handleRepoSelect(repos, persistedAdvancedAnalysis === 'true');
            return;
          }
        } catch (e) {
          console.error('Error parsing persisted repositories:', e);
        }
      }
      
      if (persistedRepo) {
        const repo = JSON.parse(persistedRepo);
        if (persistedAdvancedAnalysis) {
          setUseAdvancedAnalysis(persistedAdvancedAnalysis === 'true');
        }
        handleRepoSelect(repo, persistedAdvancedAnalysis === 'true');
      }
    } catch (error) {
      console.error('Error loading persisted repository:', error);
      localStorage.removeItem('documentation_repository');
      localStorage.removeItem('documentation_repositories');
      localStorage.removeItem('documentation_advanced_analysis');
    }
  }, []);

  // The code to display for the agents
  const effectiveFileContent = fileContent;
  const effectiveFileName = fileName;

  const handleRepoSelect = (repo: GitHubRepo | GitHubRepo[], advancedAnalysis?: boolean) => {
    setUseAdvancedAnalysis(advancedAnalysis || false);
    
    // Handle both single repo and array of repos
    if (Array.isArray(repo)) {
      // Multiple repos selected - handle first repo and store all
      if (repo.length > 0) {
        repoSelector.handleRepoSelectMultiple(repo);
        setShowRepoSelector(false);
        
        // Persist repositories to localStorage
        try {
          localStorage.setItem('documentation_repositories', JSON.stringify(repo));
          localStorage.setItem('documentation_advanced_analysis', String(advancedAnalysis || false));
        } catch (storageError) {
          console.error('Error persisting repositories to localStorage:', storageError);
        }
      }
    } else {
      // Single repo (backward compatibility)
      repoSelector.handleRepoSelect(repo);
      setShowRepoSelector(false);
      
      // Persist repository to localStorage
      try {
        localStorage.setItem('documentation_repository', JSON.stringify(repo));
        localStorage.setItem('documentation_advanced_analysis', String(advancedAnalysis || false));
      } catch (storageError) {
        console.error('Error persisting repository to localStorage:', storageError);
      }
    }
  };

  const handleBackToRepos = () => {
    setShowRepoSelector(true);
    repoSelector.clearSelectedRepo();
    
    // Clear persisted repository from localStorage
    try {
      localStorage.removeItem('documentation_repository');
      localStorage.removeItem('documentation_repositories');
      localStorage.removeItem('documentation_advanced_analysis');
    } catch (error) {
      console.error('Error clearing persisted repository:', error);
    }
  };

  // Show repository selector if no files are loaded and selector is active
  if (showRepoSelector && (!repoSelector.repoFiles || repoSelector.repoFiles.length === 0)) {
    return (
      <div className="p-4 h-full flex flex-col">
          <GitHubRepoSelector 
            onRepoSelect={handleRepoSelect}
            selectedRepo={repoSelector.selectedRepo}
          />
      </div>
    );
  }

  // Show file selection interface after repository is selected
  if (!showRepoSelector && (repoSelector.selectedRepo || (repoSelector.selectedRepos && repoSelector.selectedRepos.length > 0)) && repoSelector.repoFiles.length > 0) {
    const reposToDisplay = repoSelector.selectedRepos && repoSelector.selectedRepos.length > 0 
      ? repoSelector.selectedRepos 
      : (repoSelector.selectedRepo ? [repoSelector.selectedRepo] : []);
    
    return (
      <div className="p-4 h-full flex flex-col">
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              {/* <Zap className="w-6 h-6 text-purple-500" />
              Document Creator */}
            </h1>
            <button
              onClick={handleBackToRepos}
              className="text-squadrun-primary hover:text-squadrun-primary/80 text-sm"
            >
              ← Back to Repository Selection
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {reposToDisplay.map((repo, idx) => (
              <div key={repo.id || idx} className="flex items-center gap-2">
                <FaGithub className="w-5 h-5 text-white" />
                <span className="text-white text-base">
                  <span className="text-[#c9d1d1d9]">{repo.full_name.split('/')[0]}</span>
                  <span> / </span>
                  <span>{repo.name}</span>
                </span>
              </div>
            ))}
            <p className="text-sm text-squadrun-gray mt-1">
              {repoSelector.repoFiles.length} files loaded from {reposToDisplay.length} repository{reposToDisplay.length > 1 ? 'ies' : ''}
            </p>
          </div>
        </div>
        {repoSelector.loadingFiles ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-squadrun-gray">Loading repository files...</div>
          </div>
        ) : repoSelector.fetchError ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-red-400 text-center">
              <div className="mb-4">{repoSelector.fetchError}</div>
              <button
                onClick={() => repoSelector.handleRepoSelect(repoSelector.selectedRepo)}
                className="text-squadrun-primary hover:text-squadrun-primary/80"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="mb-4 bg-transparent border-b border-[#21262d] p-0 h-auto w-full justify-center flex gap-4">
              <TabsTrigger 
                value="business" 
                className="flex items-center gap-2 bg-transparent border-none text-[#8b949e] hover:text-[#c9d1d9] data-[state=active]:bg-[#794dc5] data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-[#794dc5] rounded-sm px-4 py-2 relative"
              >
                <Building2 className="h-4 w-4" />
                Business Document
                {activeTab === "business" && (
                  <CheckCircle2 className="h-4 w-4 ml-1" />
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="technical" 
                className="flex items-center gap-2 bg-transparent border-none text-[#8b949e] hover:text-[#c9d1d9] data-[state=active]:bg-[#794dc5] data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-[#794dc5] rounded-sm px-4 py-2 relative"
              >
                <Code2 className="h-4 w-4" />
                Technical Document
                {activeTab === "technical" && (
                  <CheckCircle2 className="h-4 w-4 ml-1" />
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="quality" 
                className="flex items-center gap-2 bg-transparent border-none text-[#8b949e] hover:text-[#c9d1d9] data-[state=active]:bg-[#794dc5] data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-[#794dc5] rounded-sm px-4 py-2 relative"
              >
                <CheckSquare className="h-4 w-4" />
                Code Completeness Check
                {activeTab === "quality" && (
                  <CheckCircle2 className="h-4 w-4 ml-1" />
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="feature-readme" 
                className="flex items-center gap-2 bg-transparent border-none text-[#8b949e] hover:text-[#c9d1d9] data-[state=active]:bg-[#794dc5] data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-[#794dc5] rounded-sm px-4 py-2 relative"
              >
                <BookOpen className="h-4 w-4" />
                Feature README
                {activeTab === "feature-readme" && (
                  <CheckCircle2 className="h-4 w-4 ml-1" />
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="business" className="flex-1 mt-0">
              <BusinessDocumentGenerator 
                fileContent={effectiveFileContent}
                fileName={effectiveFileName}
                repoFiles={repoSelector.repoFiles.map(file => ({
                  path: file.path,
                  content: file.content || ''
                }))}
                repoUrl={repoSelector.selectedRepo?.html_url || repoSelector.selectedRepo?.full_name}
                repoUrls={repoSelector.selectedRepos && repoSelector.selectedRepos.length > 0 
                  ? repoSelector.selectedRepos.map(r => r.html_url || r.full_name)
                  : undefined}
                useAdvancedAnalysis={useAdvancedAnalysis}
              />
            </TabsContent>
            
            <TabsContent value="technical" className="flex-1 mt-0">
              <TechnicalDocumentGenerator 
                fileContent={effectiveFileContent}
                fileName={effectiveFileName}
                repoFiles={repoSelector.repoFiles.map(file => ({
                  path: file.path,
                  content: file.content || ''
                }))}
                repoUrl={repoSelector.selectedRepo?.html_url || repoSelector.selectedRepo?.full_name}
                repoUrls={repoSelector.selectedRepos && repoSelector.selectedRepos.length > 0 
                  ? repoSelector.selectedRepos.map(r => r.html_url || r.full_name)
                  : undefined}
                useAdvancedAnalysis={useAdvancedAnalysis}
              />
            </TabsContent>

            <TabsContent value="quality" className="flex-1 mt-0">
              <CodeQualityCompletenessCheck 
                fileContent={effectiveFileContent}
                fileName={effectiveFileName}
                repoFiles={repoSelector.repoFiles.map(file => ({
                  path: file.path,
                  content: file.content || ''
                }))}
                repoUrl={repoSelector.selectedRepo?.html_url || repoSelector.selectedRepo?.full_name}
                repoUrls={repoSelector.selectedRepos && repoSelector.selectedRepos.length > 0 
                  ? repoSelector.selectedRepos.map(r => r.html_url || r.full_name)
                  : undefined}
                useAdvancedAnalysis={useAdvancedAnalysis}
              />
            </TabsContent>

            <TabsContent value="feature-readme" className="flex-1 mt-0">
              <FeatureReadmeGenerator 
                fileContent={effectiveFileContent}
                fileName={effectiveFileName}
                repoFiles={repoSelector.repoFiles.map(file => ({
                  path: file.path,
                  content: file.content || ''
                }))}
                repoUrl={repoSelector.selectedRepo?.html_url || repoSelector.selectedRepo?.full_name}
                repoUrls={repoSelector.selectedRepos && repoSelector.selectedRepos.length > 0 
                  ? repoSelector.selectedRepos.map(r => r.html_url || r.full_name)
                  : undefined}
                useAdvancedAnalysis={useAdvancedAnalysis}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    );
  }

  // Fallback to original interface if no repository is selected
  return (
    <div className="p-4 h-full flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <Zap className="w-6 h-6 text-purple-500" />
          Documentation
        </h1>
        <p className="text-squadrun-gray">
          Select a GitHub repository to analyze code directly from your repositories.
        </p>
      </div>

      {!effectiveFileContent ? (
        <NoCodeMessage />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="mb-4 bg-transparent border-b border-gray-700 p-0 h-auto">
            <TabsTrigger 
              value="business" 
              className="flex items-center gap-2 bg-transparent border-none text-gray-400 hover:text-white data-[state=active]:bg-purple-500 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-purple-500 rounded-none px-4 py-2"
            >
              <Building2 className="h-4 w-4" />
              Business Document
            </TabsTrigger>
            <TabsTrigger 
              value="technical" 
              className="flex items-center gap-2 bg-transparent border-none text-gray-400 hover:text-white data-[state=active]:bg-purple-500 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-purple-500 rounded-none px-4 py-2"
            >
              <Code2 className="h-4 w-4" />
              Technical Document
            </TabsTrigger>
            <TabsTrigger 
              value="quality" 
              className="flex items-center gap-2 bg-transparent border-none text-gray-400 hover:text-white data-[state=active]:bg-purple-500 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-purple-500 rounded-none px-4 py-2"
            >
              <CheckSquare className="h-4 w-4" />
              Code Completeness Check
            </TabsTrigger>
            <TabsTrigger 
              value="feature-readme" 
              className="flex items-center gap-2 bg-transparent border-none text-gray-400 hover:text-white data-[state=active]:bg-purple-500 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-purple-500 rounded-none px-4 py-2"
            >
              <BookOpen className="h-4 w-4" />
              Feature README
            </TabsTrigger>
          </TabsList>

          <TabsContent value="business" className="flex-1 mt-0">
            <BusinessDocumentGenerator 
              fileContent={effectiveFileContent}
              fileName={effectiveFileName}
              repoFiles={[]}
              repoUrl={null}
            />
          </TabsContent>
          
          <TabsContent value="technical" className="flex-1 mt-0">
            <TechnicalDocumentGenerator 
              fileContent={effectiveFileContent}
              fileName={effectiveFileName}
              repoFiles={[]}
              repoUrl={null}
            />
          </TabsContent>

          <TabsContent value="quality" className="flex-1 mt-0">
            <CodeQualityCompletenessCheck 
              fileContent={effectiveFileContent}
              fileName={effectiveFileName}
              repoFiles={[]}
              repoUrl={null}
            />
          </TabsContent>

          <TabsContent value="feature-readme" className="flex-1 mt-0">
            <FeatureReadmeGenerator 
              fileContent={effectiveFileContent}
              fileName={effectiveFileName}
              repoFiles={[]}
              repoUrl={null}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
