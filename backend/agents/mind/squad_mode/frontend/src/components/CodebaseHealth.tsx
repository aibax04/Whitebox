import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import shield from '@/assets/images/Dashboard/shield.png';

interface QualityScore {
  id: string;
  qualityScore: number;
  createdAt: string;
}

interface CodebaseHealthData {
  qualityScores: QualityScore[];
  averageScore: number;
  latestScore: number;
  totalAnalyses: number;
}

interface ChartData {
  date: string;
  qualityScore: number;
}

export default function CodebaseHealth() {
  const [data, setData] = useState<CodebaseHealthData>({
    qualityScores: [],
    averageScore: 0,
    latestScore: 0,
    totalAnalyses: 0
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Fetch quality scores data
        const scoresResponse = await fetch('/api/quality-scores', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (scoresResponse.ok) {
          const scoresData = await scoresResponse.json();
          setData(scoresData);
        }

        // Fetch chart data
        const chartResponse = await fetch('/api/quality-scores/chart', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (chartResponse.ok) {
          const chartData = await chartResponse.json();
          setChartData(chartData);
        }
      } catch (error) {
        console.error('Error fetching codebase health data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getScoreDescription = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Very Good';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Acceptable';
    if (score >= 50) return 'Mediocre';
    if (score >= 40) return 'Poor';
    return 'Critical';
  };

  const getTrendIcon = () => {
    if (chartData.length < 2) return <Minus className="w-4 h-4" />;
    
    const latest = chartData[chartData.length - 1]?.qualityScore || 0;
    const previous = chartData[chartData.length - 2]?.qualityScore || 0;
    
    if (latest > previous) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (latest < previous) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const getTrendText = () => {
    if (chartData.length < 2) return 'No trend data';
    
    const latest = chartData[chartData.length - 1]?.qualityScore || 0;
    const previous = chartData[chartData.length - 2]?.qualityScore || 0;
    const difference = latest - previous;
    
    if (difference > 0) return `+${difference} from last analysis`;
    if (difference < 0) return `${difference} from last analysis`;
    return 'No change from last analysis';
  };

  if (isLoading) {
    return (
      <div className="bg-[#0d1117] rounded-lg p-5">
        <div className="flex flex-col gap-[18px]">
          <div className="flex items-center gap-2">
            <img src={shield} className="w-5 h-5 text-[#c9d1d9]" />
            <h3 className="text-[#c9d1d9] text-xs font-bold">CODEBASE HEALTH</h3>
          </div>
          <div className="h-px bg-[#21262d] w-full" />
          <div className="text-[#8b949e] text-sm">Loading health data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0d1117] rounded-lg p-5">
      <div className="flex flex-col gap-[18px]">
        <div className="flex items-center gap-2">
          <img src={shield} className="w-5 h-5 text-[#c9d1d9]" />
          <h3 className="text-[#c9d1d9] text-xs font-bold">CODEBASE HEALTH</h3>
        </div>
        <div className="h-px bg-[#21262d] w-full" />
        
        {data.totalAnalyses === 0 ? (
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-[#8b949e] mb-2">0</div>
              <div className="text-[#8b949e] text-sm">No analyses yet</div>
            </div>
            <div className="text-[#8b949e] text-xs text-center">
              Run code quality analysis to see your codebase health metrics
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Main Score Display */}
            <div className="text-center">
              <div className={`text-4xl font-bold ${getScoreColor(data.averageScore)} mb-2`}>
                {data.averageScore}
              </div>
              <div className="text-[#c9d1d9] text-sm mb-1">
                {getScoreDescription(data.averageScore)}
              </div>
              <div className="text-[#8b949e] text-xs">
                Average Quality Score
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[#c9d1d9]">Quality Score</span>
                <span className="text-[#c9d1d9]">{data.averageScore}/100</span>
              </div>
              <Progress 
                value={data.averageScore} 
                className="h-2 bg-[#21262d]"
              />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-[#c9d1d9]">{data.latestScore}</div>
                <div className="text-[#8b949e] text-xs">Latest Quality Score</div>
              </div>
              <div>
                <div className="text-lg font-bold text-[#c9d1d9]">{data.totalAnalyses}</div>
                <div className="text-[#8b949e] text-xs">Total Analyses</div>
              </div>
            </div>

            {/* Trend */}
            {chartData.length > 1 && (
              <div className="flex items-center justify-center gap-2 text-xs">
                {getTrendIcon()}
                <span className="text-[#8b949e]">{getTrendText()}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
