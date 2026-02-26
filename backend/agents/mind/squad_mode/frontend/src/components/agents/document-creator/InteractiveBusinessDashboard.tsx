import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
//import { callGeminiApi } from "@/utils/aiUtils/geminiApi";
import { Loader2, Building2, Users, Lightbulb, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface FileData {
  path: string;
  content: string;
}

interface BusinessDashboardProps {
  repoFiles: FileData[];
  repoUrl: string;
  onLoadingChange?: (loading: boolean) => void;
  shouldAnalyze?: boolean;
}

interface ProjectOverview {
  points: string[];
}

interface TargetUserGroups {
  [key: string]: number;
}

const COLORS = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-squadrun-darker border border-squadrun-primary/30 p-3 rounded-lg shadow-xl backdrop-blur-sm">
        <p className="text-white font-medium">{`${data.name}: ${data.value}%`}</p>
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

export default function InteractiveBusinessDashboard({ repoFiles, repoUrl, onLoadingChange, shouldAnalyze = true }: BusinessDashboardProps) {
  const [projectOverview, setProjectOverview] = useState<ProjectOverview | null>(null);
  const [targetUserGroups, setTargetUserGroups] = useState<TargetUserGroups | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  useEffect(() => {
    if (!shouldAnalyze) return;
    
    const analyzeRepository = async () => {
      setLoading(true);
      onLoadingChange?.(true);
      setError(null);
      setAnalysisProgress(0);
      
      try {
        setAnalysisProgress(20);

        const repoContext = repoFiles.map(file => ({
          path: file.path,
          contentPreview: file.content.slice(0, 1000)
        }));

        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Please sign in to analyze repository');
        }

        // Call backend endpoint which internally calls /api/generate
        const response = await fetch('/api/dashboard-analysis/business-analysis', {
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
          throw new Error(errorData.error || 'Failed to analyze business aspects');
        }
        
        // Parse Gemini response as JSON and extract .content
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
        
        if (analysis.projectOverview) {
          setProjectOverview(analysis.projectOverview);
        }
        
        if (analysis.targetUserGroups) {
          setTargetUserGroups(analysis.targetUserGroups);
        }

        setAnalysisProgress(100);
        
        // Properly set loading to false and notify parent
        setLoading(false);
        onLoadingChange?.(false);
        toast.success("Business analysis completed successfully!");

      } catch (e: any) {
        console.error('Business analysis error:', e);
        setError(e.message || "Failed to analyze repository");
        toast.error("Failed to analyze repository for business insights");
        setLoading(false);
        onLoadingChange?.(false);
      }
    };

    if (repoFiles.length > 0) {
      analyzeRepository();
    }
  }, [repoFiles, repoUrl, onLoadingChange, shouldAnalyze]);

  const userGroupData = targetUserGroups ? Object.entries(targetUserGroups).map(([name, value]) => ({ name, value })) : [];

  if (loading) {
    return (
      <div className="space-y-8 p-8 min-h-screen">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-squadrun-primary/20 to-purple-500/20 rounded-2xl mb-6 shadow-2xl">
            <Building2 className="w-10 h-10 text-squadrun-primary" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">Analyzing Business Intelligence</h2>
          <p className="text-squadrun-gray max-w-2xl mx-auto text-lg">
            Extracting strategic insights and market analysis from your repository...
          </p>
        </div>

        <Card className="bg-squadrun-darker/90 border-squadrun-primary/30 shadow-2xl backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="flex items-center justify-center mb-8">
              <Loader2 className="w-16 h-16 text-squadrun-primary animate-spin" />
            </div>
            <div className="space-y-6">
              <div className="w-full bg-squadrun-darker/80 rounded-xl h-4 overflow-hidden shadow-inner">
                <div 
                  className="bg-gradient-to-r from-squadrun-primary via-purple-500 to-cyan-500 h-4 rounded-xl transition-all duration-1000 shadow-lg"
                  style={{ width: `${analysisProgress}%` }}
                />
              </div>
              <p className="text-center text-white font-semibold text-xl">{analysisProgress}% Complete</p>
              <div className="flex justify-center space-x-8 text-squadrun-gray">
                <div className="flex items-center gap-3 bg-squadrun-darker/60 px-4 py-2 rounded-lg">
                  <Building2 className="w-5 h-5" />
                  <span className="font-medium">{repoFiles.length} files analyzed</span>
                </div>
                <div className="flex items-center gap-3 bg-squadrun-darker/60 px-4 py-2 rounded-lg">
                  <Users className="w-5 h-5" />
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
      <div className="space-y-6 p-8 min-h-screen">
        <Card className="bg-red-500/10 border-red-500/30 shadow-2xl">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-xl font-semibold text-red-400 mb-3">Analysis Error</h3>
            <p className="text-red-300 text-lg">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8 min-h-screen">
      {/* Enhanced Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-squadrun-primary/20 to-purple-500/20 rounded-2xl mb-6 shadow-2xl">
          <Building2 className="w-10 h-10 text-squadrun-primary" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-3">Business Intelligence Dashboard</h2>
        <p className="text-squadrun-gray max-w-3xl mx-auto text-lg">
          AI-powered strategic insights and market analysis for your project.
        </p>
      </div>

      {/* Main Content Grid - Both Cards Next to Each Other */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Strategic Overview */}
        <Card className="bg-squadrun-darker/40 border-squadrun-primary/30 shadow-2xl backdrop-blur-sm hover:shadow-squadrun-primary/20 transition-all duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-white flex items-center gap-4 text-xl">
              <div className="p-3 bg-squadrun-primary/20 rounded-xl shadow-lg">
                <Lightbulb className="w-6 h-6 text-squadrun-primary" />
              </div>
              Strategic Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {projectOverview?.points.map((point, index) => (
              <div 
                key={index}
                className={`p-5 bg-squadrun-darker/60 rounded-xl border border-squadrun-primary/20 hover:border-squadrun-primary/40 transition-all duration-300 cursor-pointer transform hover:scale-[1.02] ${
                  hoveredPoint === index ? 'shadow-xl shadow-squadrun-primary/10 bg-squadrun-darker/80' : ''
                }`}
                onMouseEnter={() => setHoveredPoint(index)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-3 h-3 rounded-full mt-2 transition-all duration-300 shadow-lg ${
                    hoveredPoint === index ? 'bg-squadrun-primary shadow-squadrun-primary/50' : 'bg-squadrun-primary/60'
                  }`} />
                  <p className="text-squadrun-gray text-sm leading-relaxed hover:text-white transition-colors font-medium">
                    {point}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Target User Groups */}
        <Card className="bg-squadrun-darker/40 border-cyan-500/30 shadow-2xl backdrop-blur-sm hover:shadow-cyan-500/20 transition-all duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-white flex items-center gap-4 text-xl">
              <div className="p-3 bg-cyan-500/20 rounded-xl shadow-lg">
                <Users className="w-6 h-6 text-cyan-400" />
              </div>
              Target User Groups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={userGroupData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={90}
                    innerRadius={35}
                    fill="#8884d8"
                    dataKey="value"
                    onMouseEnter={(data) => setSelectedSegment(data.name)}
                    onMouseLeave={() => setSelectedSegment(null)}
                  >
                    {userGroupData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]}
                        stroke={selectedSegment === entry.name ? "#FFFFFF" : "transparent"}
                        strokeWidth={selectedSegment === entry.name ? 3 : 0}
                        className="drop-shadow-lg"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              
              <div className="space-y-3">
                {userGroupData.map((entry, index) => (
                  <div 
                    key={entry.name}
                    className={`flex items-center justify-between p-4 rounded-xl transition-all duration-300 cursor-pointer transform hover:scale-[1.02] ${
                      selectedSegment === entry.name 
                        ? 'bg-cyan-500/20 border border-cyan-500/40 shadow-lg shadow-cyan-500/10' 
                        : 'bg-squadrun-darker/40 hover:bg-squadrun-darker/60 border border-transparent'
                    }`}
                    onMouseEnter={() => setSelectedSegment(entry.name)}
                    onMouseLeave={() => setSelectedSegment(null)}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full shadow-lg"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-white font-medium">{entry.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400 font-bold text-lg">{entry.value}%</span>
                      <TrendingUp className="w-4 h-4 text-cyan-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
