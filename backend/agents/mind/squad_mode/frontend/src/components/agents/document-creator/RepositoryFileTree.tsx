import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Folder, 
  File, 
  ChevronRight, 
  ChevronDown,
  Package,
  FileCode,
  ExternalLink,
  Code2
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { getFileFromEmbeddings, generatePklFilename } from "@/utils/repoEmbeddingApi";
import { Loader2 } from "lucide-react";

interface FileData {
  path: string;
  content: string;
}

interface TreeNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: TreeNode[];
  isExpanded?: boolean;
  extension?: string;
  content?: string;
}

interface RepositoryFileTreeProps {
  repoFiles: FileData[];
  repoUrl?: string;
}

interface FileDetails {
  path: string;
  name: string;
  extension: string;
  libraries: string[];
  imports: string[];
  importedFunctions: { from: string; items: string[] }[];
  exports: string[];
  linesOfCode: number;
  fileSize: number;
}

const EXTENSION_COLORS: Record<string, string> = {
  'ts': '#3178C6',
  'tsx': '#61DAFB',
  'js': '#F7DF1E',
  'jsx': '#61DAFB',
  'py': '#3776AB',
  'java': '#ED8B00',
  'cpp': '#00599C',
  'c': '#A8B9CC',
  'css': '#1572B6',
  'html': '#E34F26',
  'json': '#292929',
  'md': '#083FA1',
  'yml': '#CB171E',
  'yaml': '#CB171E',
  'go': '#00ADD8',
  'rs': '#CE422B',
  'default': '#6B7280'
};

export default function RepositoryFileTree({ repoFiles, repoUrl }: RepositoryFileTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));
  const [selectedFile, setSelectedFile] = useState<FileDetails | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);

  // Build tree structure from repoFiles
  const treeData = useMemo(() => {
    if (!repoFiles || repoFiles.length === 0) return null;

    const root: TreeNode = {
      id: 'root',
      name: repoUrl ? repoUrl.split('/').pop()?.replace('.git', '') || 'Repository' : 'Repository',
      type: 'folder',
      path: '',
      children: [],
      isExpanded: true
    };

    const folderMap = new Map<string, TreeNode>();
    folderMap.set('', root);

    // Sort files for consistent ordering
    const sortedFiles = [...repoFiles].sort((a, b) => a.path.localeCompare(b.path));

    sortedFiles.forEach(file => {
      const pathParts = file.path.split('/').filter(Boolean);
      let currentPath = '';
      let currentParent = root;

      // Create folder nodes
      for (let i = 0; i < pathParts.length - 1; i++) {
        currentPath += (currentPath ? '/' : '') + pathParts[i];
        
        if (!folderMap.has(currentPath)) {
          const folderNode: TreeNode = {
            id: currentPath,
            name: pathParts[i],
            type: 'folder',
            path: currentPath,
            children: [],
            isExpanded: false
          };
          
          currentParent.children!.push(folderNode);
          folderMap.set(currentPath, folderNode);
        }
        
        currentParent = folderMap.get(currentPath)!;
      }

      // Create file node
      const fileName = pathParts[pathParts.length - 1];
      const extension = fileName.split('.').pop()?.toLowerCase() || '';
      
      const fileNode: TreeNode = {
        id: file.path,
        name: fileName,
        type: 'file',
        path: file.path,
        extension,
        content: file.content
      };

      currentParent.children!.push(fileNode);
    });

    // Sort children: folders first, then files
    const sortChildren = (node: TreeNode) => {
      if (node.children) {
        node.children.sort((a, b) => {
          if (a.type !== b.type) {
            return a.type === 'folder' ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });
        node.children.forEach(sortChildren);
      }
    };
    sortChildren(root);

    return root;
  }, [repoFiles, repoUrl]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const extractFileDetails = (filePath: string, content: string): FileDetails => {
    const fileName = filePath.split('/').pop() || '';
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    
    const libraries: string[] = [];
    const imports: string[] = [];
    const importedFunctions: { from: string; items: string[] }[] = [];
    const exports: string[] = [];

    // Extract imports and libraries based on file type
    if (['js', 'jsx', 'ts', 'tsx'].includes(extension)) {
      // Extract ES6 imports with named imports
      // Match: import { item1, item2 } from 'path'
      // Match: import * as name from 'path'
      // Match: import defaultName from 'path'
      // Match: import defaultName, { item1 } from 'path'
      const importRegex = /import\s+(?:(\w+)\s*,\s*)?(?:\{([^}]*)\}|\*\s+as\s+(\w+)|\w+)?\s+from\s+['"]([^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const defaultImport = match[1];
        const namedImports = match[2];
        const namespaceImport = match[3];
        const importPath = match[4];
        
        const items: string[] = [];
        if (defaultImport) items.push(defaultImport);
        if (namespaceImport) items.push(`* as ${namespaceImport}`);
        if (namedImports) {
          const namedItems = namedImports.split(',').map(item => {
            const trimmed = item.trim();
            // Handle 'item as alias' syntax
            return trimmed.split(' as ')[0].trim();
          });
          items.push(...namedItems);
        }
        
        if (importPath.startsWith('.')) {
          imports.push(importPath);
          if (items.length > 0) {
            importedFunctions.push({ from: importPath, items });
          }
        } else {
          libraries.push(importPath);
        }
      }

      // Extract simple imports without from clause
      const simpleImportRegex = /import\s+['"]([^'"]+)['"]/g;
      while ((match = simpleImportRegex.exec(content)) !== null) {
        const importPath = match[1];
        if (importPath.startsWith('.')) {
          if (!imports.includes(importPath)) {
            imports.push(importPath);
          }
        } else {
          if (!libraries.includes(importPath)) {
            libraries.push(importPath);
          }
        }
      }

      // Extract require statements
      const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
      while ((match = requireRegex.exec(content)) !== null) {
        const requirePath = match[1];
        if (requirePath.startsWith('.')) {
          if (!imports.includes(requirePath)) {
            imports.push(requirePath);
          }
        } else {
          if (!libraries.includes(requirePath)) {
            libraries.push(requirePath);
          }
        }
      }

      // Extract require with destructuring: const { item1, item2 } = require('path')
      const requireDestructRegex = /(?:const|let|var)\s+\{([^}]+)\}\s*=\s*require\(['"]([^'"]+)['"]\)/g;
      while ((match = requireDestructRegex.exec(content)) !== null) {
        const items = match[1].split(',').map(item => item.trim().split(' as ')[0].trim());
        const requirePath = match[2];
        if (requirePath.startsWith('.')) {
          if (!imports.includes(requirePath)) {
            imports.push(requirePath);
          }
          importedFunctions.push({ from: requirePath, items });
        } else {
          if (!libraries.includes(requirePath)) {
            libraries.push(requirePath);
          }
        }
      }

      // Extract exports - multiple patterns
      // export function/const/class
      let exportMatch;
      const exportFuncRegex = /export\s+(?:default\s+)?(?:function|const|class|let|var|interface|type|enum)\s+(\w+)/g;
      while ((exportMatch = exportFuncRegex.exec(content)) !== null) {
        exports.push(exportMatch[1]);
      }

      // export { item1, item2 }
      const exportNamedRegex = /export\s+\{([^}]+)\}/g;
      while ((exportMatch = exportNamedRegex.exec(content)) !== null) {
        const items = exportMatch[1].split(',').map(item => item.trim().split(' as ')[0].trim());
        exports.push(...items);
      }

      // export default
      const exportDefaultRegex = /export\s+default\s+(?:function|const|class)?\s*(\w+)?/g;
      while ((exportMatch = exportDefaultRegex.exec(content)) !== null) {
        if (exportMatch[1]) {
          exports.push(exportMatch[1]);
        } else {
          exports.push('default');
        }
      }
    } else if (extension === 'py') {
      // Python imports
      // from module import item1, item2
      const fromImportRegex = /from\s+([\w.]+)\s+import\s+([\w\s,()*]+)/g;
      let match;
      while ((match = fromImportRegex.exec(content)) !== null) {
        const module = match[1];
        const items = match[2].split(',').map(item => item.trim().split(' as ')[0].trim());
        
        if (module.startsWith('.')) {
          if (!imports.includes(module)) {
            imports.push(module);
          }
          importedFunctions.push({ from: module, items });
        } else {
          if (!libraries.includes(module)) {
            libraries.push(module);
          }
        }
      }

      // import module
      const importRegex = /^import\s+([\w.]+)/gm;
      while ((match = importRegex.exec(content)) !== null) {
        const module = match[1];
        if (module.startsWith('.')) {
          if (!imports.includes(module)) {
            imports.push(module);
          }
        } else {
          if (!libraries.includes(module)) {
            libraries.push(module);
          }
        }
      }
    } else if (extension === 'java') {
      // Java imports
      const importRegex = /import\s+(?:static\s+)?([\w.]+);/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        libraries.push(match[1]);
      }
    }

    // Remove duplicates
    const uniqueLibraries = [...new Set(libraries)];
    const uniqueImports = [...new Set(imports)];
    const uniqueExports = [...new Set(exports.filter(e => e))];

    return {
      path: filePath,
      name: fileName,
      extension,
      libraries: uniqueLibraries,
      imports: uniqueImports,
      importedFunctions,
      exports: uniqueExports,
      linesOfCode: content.split('\n').length,
      fileSize: content.length
    };
  };

  const extractRepoInfo = (url: string) => {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (match) {
      return { owner: match[1], repo: match[2].replace('.git', '') };
    }
    const pathParts = url.split('/');
    return { 
      owner: pathParts[pathParts.length - 2] || 'local',
      repo: pathParts[pathParts.length - 1].replace('.git', '') || 'repo'
    };
  };

  // Helper function to extract repo info and original path from prefixed path
  // Only considers it a repo prefix if it matches GitHub username patterns
  const extractRepoAndPath = (filePath: string, repoUrl?: string): { owner: string; repo: string; originalPath: string } | null => {
    // For single repo scenarios, if repoUrl exists, don't try to extract from path
    // Only extract from path if we're in a multi-repo scenario (no repoUrl or path looks like owner/repo/...)
    const parts = filePath.split('/');
    
    // Only consider it a repo prefix if:
    // 1. Path has at least 3 parts (owner/repo/path...)
    // 2. First part doesn't look like a common folder name (frontend, backend, src, etc.)
    // 3. Second part doesn't look like a common folder name
    const commonFolderNames = ['frontend', 'backend', 'src', 'dist', 'build', 'public', 'components', 'utils', 'lib', 'app', 'pages', 'api', 'config'];
    const potentialOwner = parts[0];
    const potentialRepo = parts[1];
    
    // If repoUrl exists and the first parts look like common folder names, it's probably not a repo prefix
    if (repoUrl && potentialOwner && potentialRepo) {
      if (commonFolderNames.includes(potentialOwner.toLowerCase()) || 
          commonFolderNames.includes(potentialRepo.toLowerCase())) {
        return null; // This is likely just a folder structure, not a repo prefix
      }
    }
    
    // Check if path looks like owner/repo format
    if (parts.length >= 3 && potentialOwner && potentialRepo) {
      // More strict check: owner/repo should not contain dots or look like file paths
      if (!potentialOwner.includes('.') && !potentialRepo.includes('.') &&
          potentialOwner.length > 0 && potentialRepo.length > 0 &&
          !commonFolderNames.includes(potentialOwner.toLowerCase()) &&
          !commonFolderNames.includes(potentialRepo.toLowerCase())) {
        const originalPath = parts.slice(2).join('/');
        return {
          owner: potentialOwner,
          repo: potentialRepo,
          originalPath: originalPath
        };
      }
    }
    return null;
  };

  const handleFileClick = async (e: React.MouseEvent, node: TreeNode) => {
    e.stopPropagation();
    
    if (node.type === 'file') {
      setLoadingFile(true);
      setShowDetails(true); // Open dialog immediately to show loading state
      
      try {
        let fileContent = node.content;
        
        // First try to get from node or repoFiles
        if (!fileContent || fileContent.trim() === '') {
          const fileData = repoFiles.find(f => f.path === node.path);
          fileContent = fileData?.content || '';
        }
        
        // If still no content, try fetching from embeddings
        // For single repo, always use repoUrl. For multi-repo, check if path has repo prefix
        let owner = '';
        let repo = '';
        let searchPath = node.path;
        
        if (repoUrl) {
          // Single repo: use repoUrl to get owner/repo, use path as-is
          const repoInfo = extractRepoInfo(repoUrl);
          owner = repoInfo.owner;
          repo = repoInfo.repo;
          searchPath = node.path; // Use path as-is for single repo
        } else {
          // Multi-repo scenario (no repoUrl): try to extract from path
          const repoPathInfo = extractRepoAndPath(node.path);
          if (repoPathInfo) {
            owner = repoPathInfo.owner;
            repo = repoPathInfo.repo;
            searchPath = repoPathInfo.originalPath;
          }
        }
        
        // Only try embeddings if we have repo info (either from path or repoUrl)
        if ((!fileContent || fileContent.trim() === '') && (owner && repo)) {
          try {
            const token = localStorage.getItem('token');
            let pklFilename: string | null = null;
            
            // For single repo (when repoUrl exists), always generate from repo info
            // For multi-repo, check stored embeddings first
            if (repoUrl) {
              // Single repo: generate from repo info (more reliable)
              pklFilename = generatePklFilename(owner, repo);
            } else {
              // Multi-repo: try stored embedding filename first, then generate
              const storedEmbedding = localStorage.getItem('code_inspector_embeddings') || 
                                     localStorage.getItem('documentation_embeddings');
              if (storedEmbedding) {
                pklFilename = storedEmbedding;
              } else {
                // Generate filename from repo info
                pklFilename = generatePklFilename(owner, repo);
              }
            }
            
            toast.info(`Fetching file from embeddings...`);
            const fileResult = await getFileFromEmbeddings(
              pklFilename,
              searchPath, // Use original path without repo prefix
              token || undefined
            );
            
            if (fileResult.success && fileResult.file && fileResult.file.content) {
              fileContent = fileResult.file.content;
              toast.success(`File content loaded from embeddings`);
            }
          } catch (embeddingError: any) {
            console.warn('Could not load file from embeddings:', embeddingError);
            // Try to get from GitHub API as fallback (only if we have repo info)
            if (owner && repo) {
              try {
                // Use the searchPath which is already the correct path (with or without prefix removed)
                const githubPath = searchPath;
                
                const githubToken = localStorage.getItem('github_token');
                const token = localStorage.getItem('token');
                
                const response = await fetch('/api/github/file-content', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(token && { Authorization: `Bearer ${token}` })
                  },
                  body: JSON.stringify({
                    owner,
                    repo,
                    path: githubPath, // Use original path without repo prefix
                    githubToken
                  })
                });
                
                if (response.ok) {
                  const data = await response.json();
                  if (data.content) {
                    // Handle base64 encoded content
                    if (data.encoding === 'base64') {
                      fileContent = atob(data.content);
                    } else {
                      fileContent = data.content;
                    }
                    toast.success(`File content loaded from GitHub`);
                  }
                }
              } catch (githubError) {
                console.warn('Could not load file from GitHub:', githubError);
              }
            }
          }
        }
        
        // Process the file content
        if (fileContent && fileContent.trim() !== '') {
          try {
            const details = extractFileDetails(node.path, fileContent);
            setSelectedFile(details);
          } catch (error) {
            console.error('Error extracting file details:', error);
            toast.error('Failed to extract file details');
            // Still show basic info
            const fileName = node.path.split('/').pop() || '';
            const extension = fileName.split('.').pop()?.toLowerCase() || '';
            setSelectedFile({
              path: node.path,
              name: fileName,
              extension,
              libraries: [],
              imports: [],
              importedFunctions: [],
              exports: [],
              linesOfCode: fileContent.split('\n').length,
              fileSize: fileContent.length
            });
          }
        } else {
          console.warn('File content not available for:', node.path);
          toast.warning(`File content not available for: ${node.name}`);
          // Still show basic file info even without content
          const fileName = node.path.split('/').pop() || '';
          const extension = fileName.split('.').pop()?.toLowerCase() || '';
          setSelectedFile({
            path: node.path,
            name: fileName,
            extension,
            libraries: [],
            imports: [],
            importedFunctions: [],
            exports: [],
            linesOfCode: 0,
            fileSize: 0
          });
        }
      } catch (error: any) {
        console.error('Error loading file:', error);
        toast.error(error.message || 'Failed to load file content');
        // Show basic file info on error
        const fileName = node.path.split('/').pop() || '';
        const extension = fileName.split('.').pop()?.toLowerCase() || '';
        setSelectedFile({
          path: node.path,
          name: fileName,
          extension,
          libraries: [],
          imports: [],
          importedFunctions: [],
          exports: [],
          linesOfCode: 0,
          fileSize: 0
        });
      } finally {
        setLoadingFile(false);
      }
    } else if (node.type === 'folder') {
      toggleNode(node.id);
    }
  };

  const renderTreeNode = (node: TreeNode, depth: number = 0): JSX.Element => {
    const isExpanded = expandedNodes.has(node.id);
    const isFolder = node.type === 'folder';
    const indent = depth * 20;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center py-1.5 px-2 rounded transition-all duration-200 ${
            isFolder 
              ? 'cursor-pointer hover:bg-squadrun-darker/60' 
              : 'cursor-pointer hover:bg-squadrun-darker/60 hover:shadow-md hover:shadow-cyan-500/10 active:bg-squadrun-darker/80'
          } ${
            selectedFile?.path === node.path ? 'bg-squadrun-primary/20 border border-squadrun-primary/40' : ''
          }`}
          style={{ paddingLeft: `${8 + indent}px` }}
          onClick={(e) => handleFileClick(e, node)}
          title={isFolder ? `Click to ${isExpanded ? 'collapse' : 'expand'}` : 'Click to view file details'}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleFileClick(e as any, node);
            }
          }}
        >
          {isFolder ? (
            <>
              <button
                className="mr-1 p-0.5 hover:bg-squadrun-darker/40 rounded pointer-events-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNode(node.id);
                }}
                aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </button>
              <Folder className="w-4 h-4 mr-2 text-amber-500 pointer-events-none" />
            </>
          ) : (
            <div className="w-5 mr-2 flex items-center justify-center pointer-events-none">
              <File 
                className="w-4 h-4" 
                style={{ 
                  color: EXTENSION_COLORS[node.extension || 'default'] || EXTENSION_COLORS.default 
                }} 
              />
            </div>
          )}
          <span className="text-sm text-gray-300 flex-1 truncate hover:text-cyan-400 transition-colors pointer-events-none">{node.name}</span>
          {!isFolder && node.extension && (
            <Badge
              variant="outline"
              className="ml-2 text-xs px-1.5 py-0 pointer-events-none"
              style={{
                borderColor: `${EXTENSION_COLORS[node.extension] || EXTENSION_COLORS.default}50`,
                color: EXTENSION_COLORS[node.extension] || EXTENSION_COLORS.default,
                backgroundColor: `${EXTENSION_COLORS[node.extension] || EXTENSION_COLORS.default}10`
              }}
            >
              {node.extension}
            </Badge>
          )}
        </div>
        {isFolder && isExpanded && node.children && (
          <div>
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!treeData) {
    return (
      <Card className="bg-squadrun-darker/90 border-cyan-500/30 shadow-2xl">
        <CardContent className="p-8 text-center">
          <Code2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">No repository files available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-squadrun-darker/90 border-cyan-500/30 shadow-2xl backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-white flex items-center gap-4 text-xl">
            <div className="p-3 bg-cyan-500/20 rounded-xl shadow-lg">
              <Folder className="w-6 h-6 text-cyan-400" />
            </div>
            Repository Structure
            <Badge variant="secondary" className="ml-auto text-sm px-3 py-1 bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
              {repoFiles.length} files
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-squadrun-dark/50 rounded-lg border border-squadrun-darker/50 p-4 max-h-[600px] overflow-auto">
            {renderTreeNode(treeData)}
          </div>
        </CardContent>
      </Card>

      {/* File Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto bg-squadrun-darker border-cyan-500/30">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-3">
              <FileCode className="w-5 h-5 text-cyan-400" />
              {loadingFile && !selectedFile ? 'Loading File...' : selectedFile?.name || 'File Details'}
            </DialogTitle>
          </DialogHeader>
          
          {loadingFile && !selectedFile && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-4" />
              <p className="text-gray-300">Loading file content from embeddings...</p>
            </div>
          )}
          
          {selectedFile && (
            <div className="space-y-6 mt-4">
              {/* Basic Info */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <File className="w-4 h-4 text-cyan-400" />
                  File Information
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-squadrun-dark/50 p-4 rounded-lg">
                  <div>
                    <span className="text-gray-400 text-sm">Path:</span>
                    <span className="text-white text-sm font-mono mt-1 break-all"> {selectedFile.path}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">Lines of Code:</span>
                    <span className="text-white text-sm font-semibold mt-1"> {selectedFile.linesOfCode.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Libraries */}
              {selectedFile.libraries.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Package className="w-4 h-4 text-purple-400" />
                    External Libraries ({selectedFile.libraries.length})
                  </h3>
                  <div className="bg-squadrun-dark/50 p-4 rounded-lg">
                    <div className="flex flex-wrap gap-2">
                      {selectedFile.libraries.map((lib, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-purple-300 border-purple-500/50 bg-purple-500/10"
                        >
                          {lib}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Imported Functions */}
              {selectedFile.importedFunctions.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-green-400" />
                    Imported Functions/Variables ({selectedFile.importedFunctions.length} files)
                  </h3>
                  <div className="space-y-3">
                    {selectedFile.importedFunctions.map((imp, index) => (
                      <div key={index} className="bg-squadrun-dark/50 p-4 rounded-lg">
                        <div className="text-green-300 font-mono text-xs mb-2 font-semibold">
                          from {imp.from}:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {imp.items.map((item, itemIndex) => (
                            <Badge
                              key={itemIndex}
                              variant="outline"
                              className="text-green-300 border-green-500/50 bg-green-500/10 text-xs"
                            >
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Other Local Imports */}
              {selectedFile.imports.filter(imp => !selectedFile.importedFunctions.some(ifunc => ifunc.from === imp)).length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-green-400" />
                    Other Local Imports ({selectedFile.imports.filter(imp => !selectedFile.importedFunctions.some(ifunc => ifunc.from === imp)).length})
                  </h3>
                  <div className="bg-squadrun-dark/50 p-4 rounded-lg">
                    <div className="flex flex-wrap gap-2">
                      {selectedFile.imports
                        .filter(imp => !selectedFile.importedFunctions.some(ifunc => ifunc.from === imp))
                        .map((imp, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="text-green-300 border-green-500/50 bg-green-500/10 font-mono text-xs"
                          >
                            {imp}
                          </Badge>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Exports */}
              {selectedFile.exports.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-blue-400" />
                    Exports ({selectedFile.exports.length})
                  </h3>
                  <div className="bg-squadrun-dark/50 p-4 rounded-lg">
                    <div className="flex flex-wrap gap-2">
                      {selectedFile.exports.map((exp, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-blue-300 border-blue-500/50 bg-blue-500/10"
                        >
                          {exp}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {selectedFile.libraries.length === 0 && 
               selectedFile.importedFunctions.length === 0 && 
               selectedFile.imports.length === 0 && 
               selectedFile.exports.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <p>No imports, exports, or libraries found in this file.</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

