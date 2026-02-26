import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, ArrowDown, File, Loader2, Upload, Key, Github, CheckSquare } from "lucide-react";
import React, { useState, useEffect } from "react";
import type { FileEntry } from "./hooks/InspectRepoSelectorHook";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import TokenCountDisplay from "./TokenCountDisplay";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface GitHubRepo {
  full_name: string;
  html_url: string;
  private: boolean;
}

interface RepoFileSelectorProps {
  githubUrl: string;
  setGithubUrl: (url: string) => void;
  repoFiles: FileEntry[];
  selectedFile: FileEntry | null;
  selectedFiles?: FileEntry[];
  setSelectedFile: (file: FileEntry | null) => void;
  fetchFileContent: (file: FileEntry) => Promise<void>;
  fileDropdownOpen: boolean;
  setFileDropdownOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  fetchingFileContent: boolean;
  fetchError: string | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleLocalFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleGithubRepoInput: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  loadingFiles: boolean;
  handleClearFile: () => void;
  toggleFileSelection?: (file: FileEntry) => void;
  allRepoFilesWithContent?: FileEntry[];
  localFileContent?: string | null;
  handleClearGithubToken: () => void;
  hideFileSelection?: boolean;
  hideBrowseFiles?: boolean;
}

export default function RepoFileSelector({
  githubUrl,
  setGithubUrl,
  repoFiles,
  selectedFile,
  selectedFiles = [],
  setSelectedFile,
  fetchFileContent,
  fileDropdownOpen,
  setFileDropdownOpen,
  fetchingFileContent,
  fetchError,
  fileInputRef,
  handleLocalFileChange,
  handleGithubRepoInput,
  loadingFiles,
  handleClearFile,
  toggleFileSelection,
  allRepoFilesWithContent = [],
  localFileContent,
  handleClearGithubToken,
  hideFileSelection = false,
  hideBrowseFiles = false
}: RepoFileSelectorProps) {
  const [githubToken, setGithubToken] = useState("");
  const [showTokenInput, setShowTokenInput] = useState(true);
  const [userRepos, setUserRepos] = useState<GitHubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repoError, setRepoError] = useState<string | null>(null);

  const handleTokenAccept = async () => {
    if (githubToken.trim()) {
      // Store token in localStorage
      localStorage.setItem('github_token', githubToken);
      setShowTokenInput(false);
      
      // Fetch user repositories
      await fetchUserRepos();
    }
  };

  const fetchUserRepos = async () => {
    setLoadingRepos(true);
    setRepoError(null);
    try {
      const response = await fetch('/api/github/user-repos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ githubToken })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch repositories');
      }
      const repos = await response.json();
      setUserRepos(repos);
      setShowTokenInput(false);
    } catch (error) {``
      setRepoError(error instanceof Error ? error.message : 'Failed to fetch repositories');
      toast.error('Failed to fetch repositories');
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleRepoSelect = async (repoUrl: string) => {
    setGithubUrl(repoUrl);
    
    // Create a synthetic form event to trigger the file fetching
    const syntheticEvent = {
      preventDefault: () => {},
    } as React.FormEvent<HTMLFormElement>;
    
    // Trigger the file fetching process
    await handleGithubRepoInput(syntheticEvent);
  };

  const handleFileSelect = async (entry: FileEntry) => {
    if (toggleFileSelection) {
      try {
        // Store the current selection state before toggling
        const wasSelected = entry.selected;
        
        // Toggle the selection
        toggleFileSelection(entry);
        
        // If the file is being selected (not deselected), fetch its content
        if (!wasSelected) {
          // Fetch content for the newly selected file
          await fetchFileContent(entry);
          
          // Show a toast to indicate successful selection
          toast.success(`Selected and loaded content for ${entry.path}`);
        } else {
          // Show a toast when deselecting
          toast.info(`Deselected ${entry.path}`);
        }
      } catch (error) {
        // If there's an error fetching content, deselect the file
        toggleFileSelection(entry);
        toast.error(`Failed to load content for ${entry.path}`);
      }
    }
  };

  return (
    <div>
      <form onSubmit={handleGithubRepoInput} className="mb-4 flex gap-2 items-center relative">
        <Input
          value={githubUrl}
          onChange={e => setGithubUrl(e.target.value)}
          placeholder="Enter GitHub repository URL (public repo)..."
          className="text-base flex-1"
        />
        <Button 
          type="submit" 
          variant="secondary"
          disabled={loadingFiles}
        >
          {loadingFiles ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Loading...
            </>
          ) : "Load Files"}
        </Button>
        {!hideBrowseFiles && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="*"
              onChange={handleLocalFileChange}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="ml-2 flex items-center gap-1 px-2"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Browse local files"
            >
              <Upload className="w-4 h-4" />
              Browse Files
            </Button>
          </>
        )}
        {(repoFiles.length > 0 || localFileContent) && (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="ml-2 flex items-center gap-1 px-2"
            onClick={handleClearFile}
            aria-label="Clear all files"
          >
            <AlertCircle className="w-4 h-4" />
            Clear Files
          </Button>
        )}
      </form>

      {showTokenInput && (
        <div className="mb-4 flex gap-2 items-center">
          <Input
            value={githubToken}
            onChange={e => setGithubToken(e.target.value)}
            placeholder="GitHub Token"
            type="password"
            className="text-base w-[200px]"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={handleTokenAccept}
            disabled={!githubToken.trim()}
          >
            <Key className="w-4 h-4" />
            Accept
          </Button>
        </div>
      )}

      {!showTokenInput && userRepos.length > 0 && (
        <div className="mb-4 flex gap-2 items-center">
          <Select onValueChange={handleRepoSelect}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select your repository" />
            </SelectTrigger>
            <SelectContent>
              {userRepos.map((repo) => (
                <SelectItem key={repo.full_name} value={repo.html_url}>
                  <div className="flex items-center gap-2">
                    <Github className="w-4 h-4" />
                    <span>{repo.full_name}</span>
                    {repo.private && (
                      <span className="text-xs text-squadrun-gray">(private)</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="flex items-center gap-1 px-2"
            onClick={() => {
              handleClearGithubToken();
              setShowTokenInput(true);
            }}
            aria-label="Clear GitHub Token"
          >
            <Key className="w-4 h-4" />
            Clear Token
          </Button>
        </div>
      )}

      {loadingRepos && (
        <div className="mb-4 flex items-center gap-2 text-sm text-squadrun-gray">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading your repositories...
        </div>
      )}

      {repoError && (
        <Alert variant="destructive" className="mb-4 py-2 bg-destructive/10 border-destructive/30">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription className="text-sm ml-2">{repoError}</AlertDescription>
        </Alert>
      )}

      {fetchError && (
        <Alert variant="destructive" className="mb-4 py-2 bg-destructive/10 border-destructive/30">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription className="text-sm ml-2">{fetchError}</AlertDescription>
        </Alert>
      )}

      {!hideFileSelection && repoFiles.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => setFileDropdownOpen(open => !open)}
              aria-expanded={fileDropdownOpen}
            >
              <ArrowDown className={`transition-transform ${fileDropdownOpen ? "rotate-180" : ""}`} />
              <span>
                {selectedFiles && selectedFiles.length > 0 
                  ? `${selectedFiles.length} files selected` 
                  : "Select files from repo" }
              </span>
            </Button>

            {/* Show selected files token count when files are selected */}
            {selectedFiles && selectedFiles.length > 0 && (
              <TokenCountDisplay 
                files={selectedFiles} 
                label="Selected Files" 
              />
            )}
          </div>
          
          {fileDropdownOpen && (
            <div className="max-h-64 overflow-auto rounded border bg-popover mt-2 shadow z-10 absolute w-[400px]">
              {repoFiles.map(entry => (
                <div
                  key={entry.path}
                  tabIndex={0}
                  className={`flex items-center px-3 py-2 cursor-pointer hover:bg-squadrun-primary/10 ${
                    entry.selected ? "bg-squadrun-primary/20" : ""
                  }`}
                >
                  <div 
                    className="mr-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFileSelect(entry);
                    }}
                  >
                    <Checkbox 
                      checked={entry.selected} 
                      onCheckedChange={() => handleFileSelect(entry)}
                      aria-label={`Select ${entry.path}`}
                    />
                  </div>
                  <File className="mr-2 w-4 h-4" />
                  <span className="truncate">{entry.path}</span>
                  {entry.selected && entry.content && (
                    <span className="ml-2 text-xs text-squadrun-gray">(loaded)</span>
                  )}
                </div>
              ))}
            </div>
          )}
          {fetchingFileContent && (
            <div className="text-xs text-squadrun-gray mt-1 flex items-center">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Loading file content...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
