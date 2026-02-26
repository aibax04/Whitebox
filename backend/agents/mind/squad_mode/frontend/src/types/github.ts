export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  // Optional properties added when loading repository
  repoFiles?: any[];
  firstFileContent?: string | null;
  firstFileName?: string | null;
  // Additional properties for uploaded folders
  isUploadedFolder?: boolean;
  // Optional preferred branch for loading
  branchPreferred?: string;
}

export interface FileData {
  path: string;
  content: string;
}

export interface GitHubRepoSelectorProps {
  onRepoSelect: (repo: GitHubRepo | GitHubRepo[], useAdvancedAnalysis?: boolean) => void;
  selectedRepo?: GitHubRepo | null;
}
