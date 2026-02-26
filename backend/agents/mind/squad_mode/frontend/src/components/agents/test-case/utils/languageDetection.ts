
export const getFileLanguage = (fileName: string | null): string => {
  if (!fileName) return 'python';
  const extension = fileName.split('.').pop()?.toLowerCase() || '';

  const extensionMap: Record<string, string> = {
    'py': 'python',
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'go': 'go',
    'rb': 'ruby',
    'rs': 'rust',
    'php': 'php',
    'sh': 'bash',
    'sql': 'sql',
    'pgsql': 'sql',
    'plsql': 'sql',
    'mysql': 'sql',
    'html': 'html',
    'css': 'css'
  };
  return extensionMap[extension] || 'python';
};

