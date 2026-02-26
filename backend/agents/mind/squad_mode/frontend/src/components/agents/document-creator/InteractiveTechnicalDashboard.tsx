import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from "recharts";
//import { callGeminiApi } from "@/utils/aiUtils/geminiApi";
import { Loader2, Code2, Shield, Layers, FileCode, GitBranch } from "lucide-react";
import { toast } from "sonner";
// import InteractiveCodeMaps from "./InteractiveCodeMaps";
import RepositoryFileTree from "./RepositoryFileTree";

interface FileData {
  path: string;
  content: string;
}

interface TechnicalDashboardProps {
  repoFiles: FileData[];
  repoUrl: string;
  onLoadingChange?: (loading: boolean) => void;
  shouldAnalyze?: boolean;
}

interface TechStackData {
  name: string;
  value: number;
  color: string;
}

interface QualityMetrics {
  metric: string;
  score: number;
  fullMark: number;
}

const COLORS = [
  "#8B5CF6", "#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#EC4899",
  "#3B82F6", "#8B5A2B", "#6366F1", "#84CC16", "#F97316", "#E11D48"
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-squadrun-darker border border-squadrun-primary/30 p-3 rounded-lg shadow-xl backdrop-blur-sm">
        <p className="text-white font-medium">
          {data.dataKey === 'score' 
            ? `${data.payload.metric}: ${data.value}/100`
            : `${data.payload.name}: ${data.value}%`
          }
        </p>
      </div>
    );
  }
  return null;
};

// Helper function to clean API response and extract JSON
const cleanApiResponse = (response: string): string | null => {
  if (!response || typeof response !== 'string') {
    return null;
  }
  
  let cleaned = response.trim();
  
  // Remove markdown code blocks
  cleaned = cleaned.replace(/^```json\s*/i, '');
  cleaned = cleaned.replace(/^```\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/g, '');
  
  // Try to find JSON object
  const jsonStart = cleaned.indexOf('{');
  if (jsonStart < 0) {
    // No opening brace found - not valid JSON
    return null;
  }
  
  if (jsonStart > 0) {
    cleaned = cleaned.substring(jsonStart);
  }
  
  // Find matching closing brace (accounting for nested braces)
  let braceCount = 0;
  let lastBrace = -1;
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === '{') braceCount++;
    if (cleaned[i] === '}') {
      braceCount--;
      if (braceCount === 0) {
        lastBrace = i;
        break;
      }
    }
  }
  
  if (lastBrace > 0) {
    cleaned = cleaned.substring(0, lastBrace + 1);
  }
  
  cleaned = cleaned.trim();
  
  // Validate it's potentially valid JSON by checking it starts and ends with braces
  if (!cleaned.startsWith('{') || !cleaned.endsWith('}')) {
    return null;
  }
  
  return cleaned;
};

export default function InteractiveTechnicalDashboard({ repoFiles, repoUrl, onLoadingChange, shouldAnalyze = true }: TechnicalDashboardProps) {
  const [techStack, setTechStack] = useState<TechStackData[]>([]);
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [selectedTech, setSelectedTech] = useState<string | null>(null);
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);

  useEffect(() => {
    if (!shouldAnalyze) return;
    
    const analyzeTechnicalAspects = async () => {
      setLoading(true);
      onLoadingChange?.(true);
      setError(null);
      setAnalysisProgress(0);

      try {
        setAnalysisProgress(20);

        const repoContext = repoFiles.map(file => ({
          path: file.path,
          extension: file.path.split('.').pop()?.toLowerCase(),
          linesOfCode: file.content.split('\n').length,
          contentPreview: file.content.slice(0, 800)
        }));

        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Please sign in to analyze repository');
        }

        // Call backend endpoint which internally calls /api/generate
        const response = await fetch('/api/dashboard-analysis/technical-analysis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            repoFiles: repoContext,
            repoUrl
          })
        });

        setAnalysisProgress(70);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to analyze technical aspects');
        }
        
        const data = await response.json();
        const cleanedResponse = cleanApiResponse(data.content);
        
        // If cleaned response is null, the response is not valid JSON
        if (!cleanedResponse) {
          console.error('Invalid JSON response from API. Raw content:', data.content?.substring(0, 200));
          throw new Error('AI returned invalid JSON format. Please try again.');
        }

        let analysis;
        try {
          analysis = JSON.parse(cleanedResponse);
        } catch (parseError) {
          console.error('JSON parse error. Cleaned response:', cleanedResponse?.substring(0, 200));
          throw new Error('Failed to parse analysis results. The AI response was not in the expected JSON format.');
        }
        
        // Validate the structure
        if (!analysis || (typeof analysis !== 'object')) {
          throw new Error('Analysis result is not a valid object');
        }
        
        if (analysis.techStack && Array.isArray(analysis.techStack)) {
          setTechStack(analysis.techStack);
        }
        
        if (analysis.qualityMetrics && Array.isArray(analysis.qualityMetrics)) {
          setQualityMetrics(analysis.qualityMetrics);
        }

        setAnalysisProgress(100);

        // Properly set loading to false and notify parent
        setLoading(false);
        onLoadingChange?.(false);
        toast.success("Technical analysis completed successfully!");

      } catch (e: any) {
        console.error('Technical analysis error:', e);
        setError(e.message || "Failed to analyze technical aspects");
        toast.error("Failed to analyze repository for technical insights");
        setLoading(false);
        onLoadingChange?.(false);
      }
    };

    if (repoFiles.length > 0) {
      analyzeTechnicalAspects();
    }
  }, [repoFiles, repoUrl, onLoadingChange, shouldAnalyze]);

  const sourceFileCount = repoFiles.filter(f => 
    f.path.endsWith('.ts') || f.path.endsWith('.tsx') || 
    f.path.endsWith('.js') || f.path.endsWith('.jsx')
  ).length;

  if (loading) {
    return (
      <div className="space-y-8 p-8 min-h-screen bg-transparent">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl mb-6 shadow-2xl">
            <Code2 className="w-10 h-10 text-cyan-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">Analyzing Technical Architecture</h2>
          <p className="text-squadrun-gray max-w-2xl mx-auto text-lg">
            Performing deep technical analysis of your codebase architecture and quality...
          </p>
        </div>

        <Card className="bg-squadrun-darker/90 border-cyan-500/30 shadow-2xl backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="flex items-center justify-center mb-8">
              <Loader2 className="w-16 h-16 text-cyan-400 animate-spin" />
            </div>
            <div className="space-y-6">
              <div className="w-full bg-squadrun-darker/80 rounded-xl h-4 overflow-hidden shadow-inner">
                <div 
                  className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 h-4 rounded-xl transition-all duration-1000 shadow-lg"
                  style={{ width: `${analysisProgress}%` }}
                />
              </div>
              <p className="text-center text-white font-semibold text-xl">{analysisProgress}% Complete</p>
              <div className="flex justify-center space-x-8 text-squadrun-gray">
                <div className="flex items-center gap-3 bg-squadrun-darker/60 px-4 py-2 rounded-lg">
                  <FileCode className="w-5 h-5" />
                  <span className="font-medium">{sourceFileCount} source files</span>
                </div>
                <div className="flex items-center gap-3 bg-squadrun-darker/60 px-4 py-2 rounded-lg">
                  <GitBranch className="w-5 h-5" />
                  <span className="font-medium">{repoUrl || 'Local Repository'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-8 min-h-screen bg-gradient-to-br from-squadrun-dark via-squadrun-darker to-squadrun-dark">
        <Card className="bg-red-500/10 border-red-500/30 shadow-2xl">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Code2 className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-xl font-semibold text-red-400 mb-3">Technical Analysis Error</h3>
            <p className="text-red-300 text-lg">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const averageQualityScore = qualityMetrics.length > 0 
    ? Math.round(qualityMetrics.reduce((sum, metric) => sum + metric.score, 0) / qualityMetrics.length)
    : 0;

  return (
    <div className="space-y-8 p-8 min-h-screen bg-transparent">
      {/* Enhanced Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl mb-6 shadow-2xl">
          <Code2 className="w-10 h-10 text-cyan-400" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-3">Technical Architecture Dashboard</h2>
        <p className="text-squadrun-gray max-w-3xl mx-auto text-lg">
          AI-powered technical analysis and code quality assessment for{' '}
          <span className="text-cyan-400 font-semibold">{repoUrl || 'your project'}</span>
        </p>
      </div>

      {/* Main Content Grid - Technology Stack and Code Quality side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Technology Stack */}
        <Card className="bg-squadrun-darker/90 border-cyan-500/30 shadow-2xl backdrop-blur-sm hover:shadow-cyan-500/10 transition-all duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-white flex items-center gap-4 text-xl">
              <div className="p-3 bg-cyan-500/20 rounded-xl shadow-lg">
                <Layers className="w-6 h-6 text-cyan-400" />
              </div>
              Technology Stack
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={techStack}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={90}
                    innerRadius={35}
                    fill="#8884d8"
                    dataKey="value"
                    onMouseEnter={(data) => setSelectedTech(data.name)}
                    onMouseLeave={() => setSelectedTech(null)}
                  >
                    {techStack.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        stroke={selectedTech === entry.name ? "#FFFFFF" : "transparent"}
                        strokeWidth={selectedTech === entry.name ? 3 : 0}
                        className="drop-shadow-lg"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              
              <div className="space-y-3">
                {techStack.map((entry, index) => (
                  <div 
                    key={entry.name}
                    className={`flex items-center justify-between p-4 rounded-xl transition-all duration-300 cursor-pointer transform hover:scale-[1.02] ${
                      selectedTech === entry.name 
                        ? 'bg-cyan-500/20 border border-cyan-500/40 shadow-lg shadow-cyan-500/10' 
                        : 'bg-squadrun-darker/40 hover:bg-squadrun-darker/60 border border-transparent'
                    }`}
                    onMouseEnter={() => setSelectedTech(entry.name)}
                    onMouseLeave={() => setSelectedTech(null)}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full shadow-lg"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-white font-medium">{entry.name}</span>
                    </div>
                    <span className="text-cyan-400 font-bold text-lg">{entry.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Code Quality Assessment */}
        <Card className="bg-squadrun-darker/90 border-purple-500/30 shadow-2xl backdrop-blur-sm hover:shadow-purple-500/10 transition-all duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-white flex items-center gap-4 text-xl">
              <div className="p-3 bg-purple-500/20 rounded-xl shadow-lg">
                <Shield className="w-6 h-6 text-purple-400" />
              </div>
              Code Quality Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={qualityMetrics}>
                  <PolarGrid stroke="#374151" strokeWidth={1} />
                  <PolarAngleAxis 
                    dataKey="metric" 
                    tick={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 500 }} 
                  />
                  <PolarRadiusAxis 
                    domain={[0, 100]} 
                    tick={{ fill: '#6B7280', fontSize: 9 }}
                    tickCount={4}
                  />
                  <Radar
                    name="Quality Score"
                    dataKey="score"
                    stroke="#8B5CF6"
                    fill="#8B5CF6"
                    fillOpacity={0.3}
                    strokeWidth={2}
                    dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 3 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
              
              <div className="space-y-3">
                {qualityMetrics.map((metric, index) => (
                  <div 
                    key={metric.metric}
                    className={`p-4 rounded-xl transition-all duration-300 cursor-pointer transform hover:scale-[1.02] ${
                      hoveredMetric === metric.metric 
                        ? 'bg-purple-500/20 border border-purple-500/40 shadow-lg shadow-purple-500/10' 
                        : 'bg-squadrun-darker/40 hover:bg-squadrun-darker/60 border border-transparent'
                    }`}
                    onMouseEnter={() => setHoveredMetric(metric.metric)}
                    onMouseLeave={() => setHoveredMetric(null)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">{metric.metric}</span>
                      <span className="text-purple-400 font-bold text-lg">{metric.score}/100</span>
                    </div>
                    <div className="w-full bg-squadrun-darker/60 rounded-full h-2 shadow-inner">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500 shadow-sm"
                        style={{ width: `${metric.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Code Maps at the bottom - full width */}
      {/* <div>
        <InteractiveCodeMaps repoFiles={repoFiles} repoUrl={repoUrl} />
      </div> */}

      {/* Repository File Tree */}
      <div>
        <RepositoryFileTree repoFiles={repoFiles} repoUrl={repoUrl} />
      </div>
    </div>
  );
}
