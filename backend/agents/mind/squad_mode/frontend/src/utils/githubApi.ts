export interface RepoFilesResponse {
  branch: string;
  owner: string;
  repo: string;
  tree: Array<{ path: string; type: string; size?: number }>;
  savedFile?: string;
}

export async function fetchUserRepos(): Promise<any[]> {
  const token = localStorage.getItem('token');
  const res = await fetch('/api/github/user-repos', {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch repositories');
  }
  return res.json();
}

export async function fetchRepoFiles(owner: string, repo: string, githubToken?: string | null): Promise<RepoFilesResponse> {
  const token = localStorage.getItem('token');
  const res = await fetch('/api/github/repo-files', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ owner, repo, githubToken: githubToken ?? null })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch repository files');
  }
  return res.json();
}

export async function fetchRepoFilesForBranch(owner: string, repo: string, branch: string, githubToken?: string | null): Promise<RepoFilesResponse> {
  const token = localStorage.getItem('token');
  const res = await fetch('/api/github/repo-files', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ owner, repo, branch, githubToken: githubToken ?? null })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch repository files');
  }
  return res.json();
}

export async function fetchRepoBranches(owner: string, repo: string, githubToken?: string | null): Promise<{ name: string; commitSha?: string }[]> {
  const token = localStorage.getItem('token');
  const params = new URLSearchParams({ owner, repo });
  if (githubToken ?? '') params.append('githubToken', githubToken as string);
  const res = await fetch(`/api/github/branches?${params.toString()}`, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch branches');
  }
  const data = await res.json();
  return data.branches || [];
}

export async function fetchFileContent(owner: string, repo: string, path: string, githubToken?: string | null): Promise<{ content?: string; encoding?: string }> {
  const token = localStorage.getItem('token');
  const res = await fetch('/api/github/file-content', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ owner, repo, path, githubToken: githubToken ?? null })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch file content');
  }
  return res.json();
}

export async function fetchFilesContents(owner: string, repo: string, paths: string[], githubToken?: string | null): Promise<Array<{ path: string; content?: string; encoding?: string; error?: string }>> {
  const token = localStorage.getItem('token');
  const res = await fetch('/api/github/files-contents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ owner, repo, paths, githubToken: githubToken ?? null })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch files contents');
  }
  const data = await res.json();
  return data.results as Array<{ path: string; content?: string; encoding?: string; error?: string }>;
}
