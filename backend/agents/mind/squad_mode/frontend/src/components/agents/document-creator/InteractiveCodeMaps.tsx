import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Map, FileText, Folder, Code, Search, ZoomIn, ZoomOut, Filter, Eye, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";

interface FileData {
  path: string;
  content: string;
}

interface CodeMapNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  extension: string;
  size: number;
  x: number;
  y: number;
  children?: CodeMapNode[];
  dependencies?: string[];
  complexity?: number;
  lines?: number;
}

interface InteractiveCodeMapsProps {
  repoFiles?: FileData[] | null;
  repoUrl?: string | null;
}

const EXTENSION_COLORS = {
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
  'json': '#000000',
  'md': '#083FA1',
  'yml': '#CB171E',
  'yaml': '#CB171E',
  'default': '#6B7280'
};

export default function InteractiveCodeMaps({ repoFiles, repoUrl }: InteractiveCodeMapsProps) {
  const [selectedExtension, setSelectedExtension] = useState<string>('all');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<'tree' | 'circular'>('tree');

  const calculateComplexity = (content: string, extension: string): number => {
    // Simple complexity calculation based on control structures
    const complexityPatterns = {
      'ts': /\b(if|for|while|switch|catch|function|class|interface)\b/g,
      'tsx': /\b(if|for|while|switch|catch|function|class|interface|useState|useEffect)\b/g,
      'js': /\b(if|for|while|switch|catch|function|class)\b/g,
      'jsx': /\b(if|for|while|switch|catch|function|class|useState|useEffect)\b/g,
      'py': /\b(if|for|while|try|def|class|lambda)\b/g,
      'java': /\b(if|for|while|switch|catch|try|class|interface|method)\b/g,
      'default': /\b(if|for|while|function|class)\b/g
    };

    const pattern = complexityPatterns[extension as keyof typeof complexityPatterns] || complexityPatterns.default;
    const matches = content.match(pattern);
    return matches ? matches.length : 1;
  };

  const extractDependencies = (content: string, extension: string): string[] => {
    const dependencies: string[] = [];
    
    // Extract imports/includes based on file type
    if (['ts', 'tsx', 'js', 'jsx'].includes(extension)) {
      const importMatches = content.match(/(?:import.*from\s+['"`]([^'"`]+)['"`]|require\(['"`]([^'"`]+)['"`]\))/g);
      if (importMatches) {
        importMatches.forEach(match => {
          const dep = match.match(/['"`]([^'"`]+)['"`]/)?.[1];
          if (dep && !dep.startsWith('.')) {
            dependencies.push(dep);
          }
        });
      }
    } else if (extension === 'py') {
      const importMatches = content.match(/(?:import\s+(\w+)|from\s+(\w+)\s+import)/g);
      if (importMatches) {
        importMatches.forEach(match => {
          const dep = match.replace(/(?:import\s+|from\s+|\s+import.*)/g, '');
          if (dep && !dep.startsWith('.')) {
            dependencies.push(dep);
          }
        });
      }
    }
    
    return dependencies.slice(0, 5); // Limit to top 5 dependencies
  };

  // Analyze repository structure and create code map data
  const codeMapData = useMemo(() => {
    if (!repoFiles || repoFiles.length === 0) return null;

    const nodes: CodeMapNode[] = [];
    const folderMap = new globalThis.Map<string, CodeMapNode>();
    
    // Get available extensions
    const extensions: string[] = [];
    
    repoFiles.forEach((file) => {
      const pathParts = file.path.split('/');
      const fileName = pathParts[pathParts.length - 1];
      const extension = fileName.split('.').pop()?.toLowerCase() || 'unknown';
      if (!extensions.includes(extension)) {
        extensions.push(extension);
      }
      
      // Calculate file metrics
      const lines = file.content.split('\n').length;
      const complexity = calculateComplexity(file.content, extension);
      
      // Create folder structure
      let currentPath = '';
      for (let i = 0; i < pathParts.length - 1; i++) {
        currentPath += (currentPath ? '/' : '') + pathParts[i];
        
        if (!folderMap.has(currentPath)) {
          const folderNode: CodeMapNode = {
            id: currentPath,
            name: pathParts[i],
            type: 'folder',
            extension: 'folder',
            size: 0,
            x: 0,
            y: 0,
            children: []
          };
          folderMap.set(currentPath, folderNode);
          nodes.push(folderNode);
        }
      }
      
      // Create file node
      const fileNode: CodeMapNode = {
        id: file.path,
        name: fileName,
        type: 'file',
        extension,
        size: file.content.length,
        x: 0,
        y: 0,
        complexity,
        lines,
        dependencies: extractDependencies(file.content, extension)
      };
      
      nodes.push(fileNode);
      
      // Add file to parent folder
      const parentPath = file.path.substring(0, file.path.lastIndexOf('/'));
      if (parentPath && folderMap.has(parentPath)) {
        folderMap.get(parentPath)!.children!.push(fileNode);
        folderMap.get(parentPath)!.size += file.content.length;
      }
    });

    return {
      nodes: nodes.filter(node => 
        selectedExtension === 'all' || 
        node.extension === selectedExtension ||
        node.type === 'folder'
      ),
      extensions: extensions.sort(),
      totalFiles: repoFiles.length,
      totalSize: repoFiles.reduce((sum, file) => sum + file.content.length, 0)
    };
  }, [repoFiles, selectedExtension]);

  const positionNodes = (nodes: CodeMapNode[], style: string) => {
    if (!nodes.length) return;

    const containerWidth = 1000;
    const containerHeight = 700;
    
    switch (style) {
      case 'tree':
        positionTreeLayout(nodes, containerWidth, containerHeight);
        break;
      case 'circular':
        positionCircularLayout(nodes, containerWidth, containerHeight);
        break;
    }
  };

  const positionTreeLayout = (nodes: CodeMapNode[], width: number, height: number) => {
    const folders = nodes.filter(n => n.type === 'folder');
    const files = nodes.filter(n => n.type === 'file');
    
    folders.forEach((folder, index) => {
      folder.x = 100 + (index % 5) * 180;
      folder.y = 50 + Math.floor(index / 5) * 120;
    });
    
    files.forEach((file, index) => {
      file.x = 150 + (index % 7) * 130;
      file.y = 200 + Math.floor(index / 7) * 90;
    });
  };

  const positionCircularLayout = (nodes: CodeMapNode[], width: number, height: number) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.4;
    
    nodes.forEach((node, index) => {
      const angle = (index / nodes.length) * 2 * Math.PI;
      node.x = centerX + Math.cos(angle) * radius;
      node.y = centerY + Math.sin(angle) * radius;
    });
  };

  const getNodeColor = (node: CodeMapNode): string => {
    if (node.type === 'folder') return '#8B7355';
    return EXTENSION_COLORS[node.extension as keyof typeof EXTENSION_COLORS] || EXTENSION_COLORS.default;
  };

  const getNodeSize = (node: CodeMapNode): number => {
    if (node.type === 'folder') return 45;
    const baseSize = 25;
    const sizeMultiplier = Math.log(node.size || 1) / 10;
    return Math.max(baseSize, baseSize + sizeMultiplier * 12);
  };

  const filteredNodes = useMemo(() => {
    if (!codeMapData) return [];
    
    let filtered = codeMapData.nodes;
    
    if (searchTerm) {
      filtered = filtered.filter(node => 
        node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [codeMapData, searchTerm]);

  // Position nodes when data changes
  useMemo(() => {
    if (filteredNodes.length > 0) {
      positionNodes(filteredNodes, mapStyle);
    }
  }, [filteredNodes, mapStyle]);

  if (!repoFiles || repoFiles.length === 0) {
    return (
      <Card className="bg-squadrun-darker border-squadrun-primary/20 shadow-xl">
        <CardContent className="p-12 text-center">
          <div className="flex flex-col items-center space-y-6">
            <div className="p-6 rounded-full bg-squadrun-primary/10">
              <Map className="w-16 h-16 text-squadrun-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">No Repository Data</h3>
              <p className="text-squadrun-gray max-w-md">Upload a repository or select files to visualize the codebase structure with interactive code maps.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!codeMapData) {
    return (
      <Card className="bg-squadrun-darker border-squadrun-primary/20 shadow-xl">
        <CardContent className="p-12 text-center">
          <div className="flex flex-col items-center space-y-6">
            <div className="p-6 rounded-full bg-squadrun-primary/10">
              <Map className="w-16 h-16 text-squadrun-primary animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Generating Code Maps</h3>
              <p className="text-squadrun-gray">Analyzing repository structure and creating interactive visualizations...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Card className="bg-gradient-to-r from-squadrun-darker to-squadrun-dark border-squadrun-primary/30 shadow-xl">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-xl bg-squadrun-primary/20">
                <Map className="w-8 h-8 text-squadrun-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
                  Code Map
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    <Layers className="w-4 h-4 mr-1" />
                    {filteredNodes.length} nodes
                  </Badge>
                </CardTitle>
                <p className="text-squadrun-gray text-lg mt-1">
                  Explore {codeMapData.totalFiles} files across {codeMapData.extensions.length} file types • {(codeMapData.totalSize / 1024).toFixed(1)} KB total
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-squadrun-primary border-squadrun-primary/50">
                <Eye className="w-3 h-3 mr-1" />
                {mapStyle} layout
              </Badge>
              <Badge variant="outline" className="text-squadrun-primary border-squadrun-primary/50">
                {Math.round(zoomLevel * 100)}% zoom
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Controls Section */}
      <Card className="bg-squadrun-darker border-squadrun-primary/20 shadow-lg">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white flex items-center gap-2">
                <Filter className="w-4 h-4" />
                File Extension
              </label>
              <Select value={selectedExtension} onValueChange={setSelectedExtension}>
                <SelectTrigger className="bg-squadrun-dark border-squadrun-primary/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-squadrun-dark border-squadrun-primary/30">
                  <SelectItem value="all" className="text-white">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
                      All Extensions
                    </div>
                  </SelectItem>
                  {codeMapData.extensions.map(ext => (
                    <SelectItem key={ext} value={ext} className="text-white">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full shadow-sm"
                          style={{ backgroundColor: getNodeColor({ extension: ext } as CodeMapNode) }}
                        />
                        .{ext}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-white flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Layout Style
              </label>
              <Select value={mapStyle} onValueChange={(value: 'tree' | 'circular') => setMapStyle(value)}>
                <SelectTrigger className="bg-squadrun-dark border-squadrun-primary/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-squadrun-dark border-squadrun-primary/30">
                  <SelectItem value="tree" className="text-white">Tree Layout</SelectItem>
                  <SelectItem value="circular" className="text-white">Circular Layout</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-white flex items-center gap-2">
                <Search className="w-4 h-4" />
                Search Files
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-squadrun-gray" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search files..."
                  className="pl-10 bg-squadrun-dark border-squadrun-primary/30 text-white placeholder:text-squadrun-gray"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Zoom Level</label>
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setZoomLevel(prev => Math.max(prev - 0.2, 0.5))}
                  className="border-squadrun-primary/30 hover:border-squadrun-primary text-white hover:bg-squadrun-primary/10"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm text-squadrun-gray min-w-16 text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setZoomLevel(prev => Math.min(prev + 0.2, 2))}
                  className="border-squadrun-primary/30 hover:border-squadrun-primary text-white hover:bg-squadrun-primary/10"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visualization Section */}
      <Card className="bg-squadrun-darker border-squadrun-primary/20 shadow-xl overflow-hidden">
        <CardContent className="p-0">
          <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300" style={{ height: '600px' }}>
            <svg 
              width="100%" 
              height="100%" 
              viewBox="0 0 1000 700"
              className="transition-transform duration-300 ease-in-out"
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center' }}
            >
              {/* Grid Background */}
              <defs>
                <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                  <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e5e7eb" strokeWidth="1" opacity="0.3"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              
              {/* Render connections for dependencies */}
              {filteredNodes.map(node => 
                node.dependencies?.map((dep, index) => {
                  const targetNode = filteredNodes.find(n => n.name.includes(dep));
                  if (!targetNode) return null;
                  
                  return (
                    <line
                      key={`${node.id}-${dep}-${index}`}
                      x1={node.x}
                      y1={node.y}
                      x2={targetNode.x}
                      y2={targetNode.y}
                      stroke="#8B7355"
                      strokeWidth="2"
                      strokeOpacity="0.4"
                      strokeDasharray="4,4"
                      className="transition-all duration-200"
                    />
                  );
                })
              )}
              
              {/* Render nodes */}
              {filteredNodes.map(node => {
                const nodeSize = getNodeSize(node);
                const nodeColor = getNodeColor(node);
                const isSelected = selectedNode === node.id;
                
                return (
                  <g key={node.id} className="transition-all duration-200">
                    {/* Node shadow */}
                    <circle
                      cx={node.x + 2}
                      cy={node.y + 2}
                      r={nodeSize}
                      fill="rgba(0,0,0,0.1)"
                      opacity="0.3"
                    />
                    
                    {/* Main node */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={nodeSize}
                      fill={nodeColor}
                      stroke={isSelected ? "#8B5CF6" : "#fff"}
                      strokeWidth={isSelected ? 4 : 2}
                      opacity={node.type === 'folder' ? 0.8 : 0.95}
                      className="cursor-pointer transition-all duration-200 hover:stroke-purple-400 hover:stroke-4"
                      onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                    />
                    
                    {/* Node icon */}
                    <text
                      x={node.x}
                      y={node.y + 5}
                      textAnchor="middle"
                      fontSize="14"
                      fill="white"
                      className="pointer-events-none font-medium"
                    >
                      {node.type === 'folder' ? '📁' : '📄'}
                    </text>
                    
                    {/* Node label */}
                    <text
                      x={node.x}
                      y={node.y + nodeSize + 20}
                      textAnchor="middle"
                      fontSize="11"
                      fill="#374151"
                      className="pointer-events-none font-medium"
                    >
                      {node.name.length > 12 ? `${node.name.substring(0, 10)}...` : node.name}
                    </text>
                    
                    {/* Complexity indicator for files */}
                    {node.type === 'file' && node.complexity && node.complexity > 10 && (
                      <circle
                        cx={node.x + nodeSize - 10}
                        cy={node.y - nodeSize + 10}
                        r="8"
                        fill="#EF4444"
                        stroke="#fff"
                        strokeWidth="2"
                        className="pointer-events-none"
                      />
                    )}
                    
                    {/* Selection glow effect */}
                    {isSelected && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={nodeSize + 8}
                        fill="none"
                        stroke="#8B5CF6"
                        strokeWidth="2"
                        opacity="0.3"
                        className="animate-pulse"
                      />
                    )}
                  </g>
                );
              })}
            </svg>
            
            {/* Overlay gradient */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-transparent to-white/5" />
          </div>
        </CardContent>
      </Card>

      {/* Selected Node Details */}
      {selectedNode && (
        <Card className="bg-gradient-to-r from-squadrun-darker to-squadrun-dark border-squadrun-primary/30 shadow-xl">
          <CardContent className="p-6">
            {(() => {
              const node = filteredNodes.find(n => n.id === selectedNode);
              if (!node) return null;
              
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xl font-semibold text-white flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-squadrun-primary/20">
                        {node.type === 'folder' ? <Folder className="w-5 h-5 text-squadrun-primary" /> : <FileText className="w-5 h-5 text-squadrun-primary" />}
                      </div>
                      {node.name}
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedNode(null)}
                      className="text-squadrun-gray hover:text-white"
                    >
                      ✕
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <h5 className="text-sm font-medium text-squadrun-primary uppercase tracking-wide">Basic Info</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-squadrun-gray">Type:</span>
                          <Badge variant="outline" className="text-white border-squadrun-primary/50">
                            {node.type}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-squadrun-gray">Extension:</span>
                          <span className="text-white font-mono">.{node.extension}</span>
                        </div>
                        {node.lines && (
                          <div className="flex justify-between">
                            <span className="text-squadrun-gray">Lines:</span>
                            <span className="text-white font-mono">{node.lines.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <h5 className="text-sm font-medium text-squadrun-primary uppercase tracking-wide">Metrics</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-squadrun-gray">Size:</span>
                          <span className="text-white font-mono">{(node.size / 1024).toFixed(1)} KB</span>
                        </div>
                        {node.complexity && (
                          <div className="flex justify-between">
                            <span className="text-squadrun-gray">Complexity:</span>
                            <Badge 
                              variant={node.complexity > 15 ? "destructive" : node.complexity > 8 ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {node.complexity}
                            </Badge>
                          </div>
                        )}
                        {node.children && (
                          <div className="flex justify-between">
                            <span className="text-squadrun-gray">Children:</span>
                            <span className="text-white font-mono">{node.children.length}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <h5 className="text-sm font-medium text-squadrun-primary uppercase tracking-wide">Dependencies</h5>
                      {node.dependencies && node.dependencies.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {node.dependencies.map((dep, index) => (
                            <Badge key={index} variant="outline" className="text-xs text-white border-squadrun-primary/30">
                              {dep}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-squadrun-gray text-sm">No dependencies found</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
