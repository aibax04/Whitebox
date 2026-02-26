/**
 * Repository Embedding API Utilities
 * 
 * Functions to interact with the repository embedding API
 */

interface GenerateEmbeddingsResponse {
  success: boolean;
  message: string;
  outputFile: string;
  fileCount: number;
  progress?: string[];
}

interface SearchResponse {
  success: boolean;
  query?: string;
  keyword?: string;
  results: Array<{
    path: string;
    content: string;
    distance?: number;
    score?: number;
    combined_score?: number;
  }>;
  count: number;
}

interface FileResponse {
  success: boolean;
  file: {
    path: string;
    content: string;
    distance?: number;
    score?: number;
  };
}

/**
 * Generate embeddings for a repository
 */
export async function generateRepoEmbeddings(
  repoUrlOrPath: string,
  outputFile?: string,
  token?: string
): Promise<GenerateEmbeddingsResponse> {
  const response = await fetch('/api/repo-embedding/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({
      repoUrlOrPath,
      outputFile,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to generate embeddings');
  }

  return response.json();
}

/**
 * Search repository using vector search
 */
export async function searchRepoEmbeddings(
  pklFile: string,
  query: string,
  topK: number = 5,
  token?: string
): Promise<SearchResponse> {
  const response = await fetch('/api/repo-embedding/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({
      pklFile,
      query,
      topK,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to search repository');
  }

  return response.json();
}

/**
 * Search repository by keyword
 */
export async function searchRepoByKeyword(
  pklFile: string,
  keyword: string,
  topK: number = 5,
  token?: string
): Promise<SearchResponse> {
  const response = await fetch('/api/repo-embedding/search-by-keyword', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({
      pklFile,
      keyword,
      topK,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to search by keyword');
  }

  return response.json();
}

/**
 * Combined vector and keyword search
 */
export async function searchRepoCombined(
  pklFile: string,
  query: string,
  keyword?: string,
  topK: number = 5,
  vectorWeight: number = 0.7,
  token?: string
): Promise<SearchResponse> {
  const response = await fetch('/api/repo-embedding/search-combined', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({
      pklFile,
      query,
      keyword,
      topK,
      vectorWeight,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to perform combined search');
  }

  return response.json();
}

/**
 * Get file by exact path from embeddings
 */
export async function getFileFromEmbeddings(
  pklFile: string,
  filePath: string,
  token?: string
): Promise<FileResponse> {
  const encodedPath = encodeURIComponent(filePath);
  const response = await fetch(
    `/api/repo-embedding/file/${pklFile}?path=${encodedPath}`,
    {
      method: 'GET',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('File not found in embeddings');
    }
    const error = await response.json();
    throw new Error(error.message || 'Failed to get file');
  }

  return response.json();
}

/**
 * Check if embedding file exists
 */
export async function checkEmbeddingFile(
  filename: string,
  token?: string
): Promise<{ exists: boolean; filename: string }> {
  const response = await fetch(`/api/repo-embedding/check/${filename}`, {
    method: 'GET',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to check embedding file');
  }

  return response.json();
}

/**
 * Ensure embeddings exist for a repository - generates them if they don't exist
 */
export async function ensureRepoEmbeddings(
  repoUrl: string,
  pklFilename?: string,
  autoGenerate: boolean = true,
  token?: string
): Promise<{
  success: boolean;
  exists: boolean;
  filename: string;
  collectionName?: string;
  fileCount?: number;
  message: string;
  generated: boolean;
  progress?: string[];
}> {
  const response = await fetch('/api/repo-embedding/ensure', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({
      repoUrl,
      pklFilename,
      autoGenerate,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to ensure embeddings');
  }

  return response.json();
}

/**
 * Get list of all files from embeddings (paths only, no content)
 */
export async function getFilesListFromEmbeddings(
  pklFile: string,
  token?: string
): Promise<{ success: boolean; files: Array<{ path: string; size: number }>; count: number }> {
  const response = await fetch(`/api/repo-embedding/files/${pklFile}`, {
    method: 'GET',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get files list from embeddings');
  }

  return response.json();
}

/**
 * Generate a unique pkl filename from repository info
 */
export function generatePklFilename(owner: string, repo: string, branch?: string): string {
  const branchSuffix = branch ? `_${branch.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
  return `${owner}_${repo}${branchSuffix}.pkl`;
}

