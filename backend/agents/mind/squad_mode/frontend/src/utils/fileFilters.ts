/**
 * Utility functions for filtering relevant code files
 */

interface FileItem {
  path: string;
  type: string;
  size?: number;
}

/**
 * Patterns to skip (binaries, dependencies, build artifacts, etc.)
 */
const SKIP_PATTERNS = [
  'node_modules/',
  '.git/',
  'dist/',
  'build/',
  'out/',
  'target/',
  'bin/',
  'obj/',
  '.next/',
  '.nuxt/',
  'coverage/',
  '__pycache__/',
  '.pytest_cache/',
  '.mypy_cache/',
  'venv/',
  'env/',
  '.env/',
  'vendor/',
  '.idea/',
  '.vscode/',
  '.vs/',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lockb',
  'Cargo.lock',
  'poetry.lock',
  'Pipfile.lock',
  '.DS_Store',
  'Thumbs.db',
  'Desktop.ini',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.ico',
  '.svg',
  '.webp',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.otf',
  '.mp4',
  '.mp3',
  '.avi',
  '.mov',
  '.pdf',
  '.zip',
  '.tar',
  '.gz',
  '.rar',
  '.7z'
];

/**
 * Valid code file extensions
 */
const CODE_EXTENSIONS = [
  // Web
  '.html', '.htm', '.css', '.scss', '.sass', '.less', '.styl',
  '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte', '.astro',
  
  // Backend
  '.py', '.pyw', '.java', '.class', '.cpp', '.cc', '.cxx', '.c', '.h', '.hpp',
  '.cs', '.vb', '.fs', '.go', '.rs', '.rb', '.php', '.pl', '.pm',
  '.swift', '.dart', '.kt', '.scala', '.clj', '.hs', '.ml', '.f90', '.sql',
  '.r', '.m', '.mat', '.jl', '.d', '.nim', '.zig', '.v',
  
];

/**
 * Important directory patterns that likely contain code
 */
const CODE_DIRECTORY_PATTERNS = [
  '/src/',
  '/lib/',
  '/app/',
  '/components/',
  '/utils/',
  '/helpers/',
  '/services/',
  '/models/',
  '/controllers/',
  '/views/',
  '/pages/',
  '/api/',
  '/routes/',
  '/middleware/',
  '/hooks/',
  '/store/',
  '/reducers/',
  '/actions/'
];

/**
 * Check if a file path should be skipped
 */
export function shouldSkipFile(path: string): boolean {
  const lowerPath = path.toLowerCase();
  return SKIP_PATTERNS.some(pattern => lowerPath.includes(pattern));
}

/**
 * Check if a file is a relevant code file
 */
export function isRelevantCodeFile(path: string): boolean {
  const lowerPath = path.toLowerCase();
  
  // Skip files that match skip patterns
  if (shouldSkipFile(lowerPath)) {
    return false;
  }
  
  // Only allow files with valid code extensions
  const hasCodeExtension = CODE_EXTENSIONS.some(ext => 
    lowerPath.endsWith(ext) || path.endsWith(ext)
  );
  
  return hasCodeExtension;
}

/**
 * Filter a list of files to only include relevant code files
 */
export function filterRelevantCodeFiles(files: FileItem[]): FileItem[] {
  return files.filter(file => {
    // Only process blob types (actual files, not directories)
    if (file.type !== 'blob') {
      return false;
    }
    
    return isRelevantCodeFile(file.path);
  });
}

/**
 * Get statistics about filtered files
 */
export function getFilterStats(originalFiles: FileItem[], filteredFiles: FileItem[]): {
  total: number;
  relevant: number;
  skipped: number;
  percentage: number;
} {
  const total = originalFiles.length;
  const relevant = filteredFiles.length;
  const skipped = total - relevant;
  const percentage = total > 0 ? Math.round((relevant / total) * 100) : 0;
  
  return { total, relevant, skipped, percentage };
}

