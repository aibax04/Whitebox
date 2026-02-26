/**
 * Advanced Document Generation Utilities
 * Handles the new workflow with individual file analysis and context aggregation
 */

interface FileData {
  path: string;
  content: string;
}

interface FileContext {
  filePath: string;
  fileContext: {
    purpose: string;
    keyComponents: string[];
    dependencies: string[];
    businessLogic: string;
    technicalPatterns: string[];
    apis: string[];
    dataModels: string[];
    securityFeatures: string[];
    configuration: string;
    category: string;
  };
  analysisSuccess: boolean;
  error?: string;
}

/**
 * Fetch file contents from GitHub API
 */
const fetchFileContents = async (files: FileData[], repoUrl: string): Promise<FileData[]> => {
  try {
    // Extract owner and repo from URL
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      throw new Error('Invalid GitHub repository URL');
    }
    
    const [, owner, repo] = match;
    const paths = files.map(file => file.path);
    
    // Get stored GitHub token (if available)
    const githubToken = localStorage.getItem('github_token');
    
    // console.log('Fetching file contents for:', { owner, repo, pathsCount: paths.length, hasGithubToken: !!githubToken });
    
    const response = await fetch('/api/github/files-contents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        owner,
        repo,
        paths,
        githubToken: githubToken || null // Let backend use stored token if null
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('File content fetching failed:', errorData);
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // console.log('File content fetching successful:', { resultsCount: data.results?.length });
    
    // Map the results back to files with content
    const filesWithContent: FileData[] = files.map(file => {
      const result = data.results.find((r: any) => r.path === file.path);
      if (result && result.content && result.encoding === 'base64') {
        return {
          path: file.path,
          content: atob(result.content)
        };
      } else if (result && result.content) {
        return {
          path: file.path,
          content: result.content
        };
      } else {
        return {
          path: file.path,
          content: file.content || '' // Use existing content if available
        };
      }
    });

    return filesWithContent;
  } catch (error) {
    console.error('Error fetching file contents:', error);
    // Return original files if fetching fails
    return files;
  }
};

/**
 * Analyze individual files and generate contexts
 */
export const analyzeFilesForContext = async (files: FileData[], repoUrl?: string, onProgress?: (stage: string) => void): Promise<FileContext[]> => {
  try {
    // First, fetch file contents if repoUrl is provided and files don't have content
    let filesToAnalyze = files;
    if (repoUrl && files.some(f => !f.content || f.content.trim() === '')) {
      onProgress?.('Fetching file contents...');
      filesToAnalyze = await fetchFileContents(files, repoUrl);
    }

    onProgress?.('Analyzing files...');
    const response = await fetch('/api/advanced-analysis/analyze-files', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ files: filesToAnalyze })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.fileContexts;
  } catch (error) {
    console.error('Error analyzing files for context:', error);
    throw new Error('Failed to analyze files for context');
  }
};

/**
 * Generate document from aggregated contexts
 */
export const generateDocumentFromContexts = async (
  fileContexts: FileContext[],
  documentType: string,
  repoUrl: string
): Promise<string> => {
  try {
    const response = await fetch('/api/advanced-analysis/generate-document-from-contexts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        fileContexts,
        documentType,
        repoUrl
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.documentContent;
  } catch (error) {
    console.error('Error generating document from contexts:', error);
    throw new Error('Failed to generate document from contexts');
  }
};

/**
 * Advanced Business Document Generation
 */
export const generateAdvancedBusinessDocument = async (
  files: FileData[],
  repoUrl: string,
  onProgress?: (stage: string) => void
): Promise<string> => {
  try {
    // Step 1: Analyze all files to generate contexts (with file content fetching)
    const fileContexts = await analyzeFilesForContext(files, repoUrl, onProgress);
    
    // Step 2: Generate document from aggregated contexts
    onProgress?.('Generating document...');
    const documentContent = await generateDocumentFromContexts(
      fileContexts,
      'business-document',
      repoUrl
    );
    
    return documentContent;
  } catch (error) {
    console.error('Error generating advanced business document:', error);
    throw new Error('Failed to generate advanced business document');
  }
};

/**
 * Advanced Technical Document Generation
 */
export const generateAdvancedTechnicalDocument = async (
  files: FileData[],
  repoUrl: string,
  onProgress?: (stage: string) => void
): Promise<string> => {
  try {
    // Step 1: Analyze all files to generate contexts (with file content fetching)
    const fileContexts = await analyzeFilesForContext(files, repoUrl, onProgress);
    
    // Step 2: Generate document from aggregated contexts
    onProgress?.('Generating document...');
    const documentContent = await generateDocumentFromContexts(
      fileContexts,
      'technical-document',
      repoUrl
    );
    
    return documentContent;
  } catch (error) {
    console.error('Error generating advanced technical document:', error);
    throw new Error('Failed to generate advanced technical document');
  }
};

/**
 * Advanced Code Quality Document Generation
 */
export const generateAdvancedCodeQualityDocument = async (
  files: FileData[],
  repoUrl: string,
  onProgress?: (stage: string) => void
): Promise<string> => {
  try {
    // Step 1: Analyze all files to generate contexts (with file content fetching)
    const fileContexts = await analyzeFilesForContext(files, repoUrl, onProgress);
    
    // Step 2: Generate document from aggregated contexts
    onProgress?.('Generating document...');
    const documentContent = await generateDocumentFromContexts(
      fileContexts,
      'code-quality',
      repoUrl
    );
    
    return documentContent;
  } catch (error) {
    console.error('Error generating advanced code quality document:', error);
    throw new Error('Failed to generate advanced code quality document');
  }
};

/**
 * Get analysis progress for UI updates
 */
export const getAnalysisProgress = (current: number, total: number): number => {
  return Math.round((current / total) * 100);
};
