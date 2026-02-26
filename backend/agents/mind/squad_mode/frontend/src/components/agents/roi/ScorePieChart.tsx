import React from 'react';

interface ScorePieChartProps {
  score: number;
  maxScore: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export const ScorePieChart: React.FC<ScorePieChartProps> = ({
  score,
  maxScore,
  size = 24,
  strokeWidth = 2,
  className = ''
}) => {
  const percentage = Math.min((score / maxScore) * 100, 100);
  const radius = size / 2 - 1;
  const centerX = size / 2;
  const centerY = size / 2;

  // Determine color based on percentage
  const getColor = (percent: number) => {
    if (percent >= 75) return '#22c55e'; // green
    if (percent >= 55) return '#eab308'; // yellow  
    if (percent >= 30) return '#f97316'; // orange
    if (percent >= 10) return '#ef4444'; // red
    return '#ef4444'; // red
  };

  const color = getColor(percentage);

  // Calculate the end angle for the pie slice (starting from top, going clockwise)
  const endAngle = (percentage / 100) * 360;
  const endAngleRad = (endAngle * Math.PI) / 180;

  // Create the pie slice path
  const createPieSlice = () => {
    if (percentage === 0) return '';
    
    // Start from top (12 o'clock position) - angle -90 degrees
    const startAngle = -Math.PI / 2;
    const x1 = centerX + radius * Math.cos(startAngle);
    const y1 = centerY + radius * Math.sin(startAngle);
    const x2 = centerX + radius * Math.cos(startAngle + endAngleRad);
    const y2 = centerY + radius * Math.sin(startAngle + endAngleRad);
    
    const largeArcFlag = endAngle > 180 ? 1 : 0;
    
    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius}
          fill="rgba(255, 255, 255, 0.1)"
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth="1"
        />
        {/* Filled pie slice */}
        <path
          d={createPieSlice()}
          fill={color}
          className="transition-all duration-300 ease-in-out"
        />
      </svg>
    </div>
  );
};

interface ScoreDisplayProps {
  score: number;
  maxScore: number;
  title?: string;
  showTitle?: boolean;
  size?: number;
  className?: string;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  score,
  maxScore,
  title = "Score",
  showTitle = true,
  size = 24,
  className = ''
}) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <ScorePieChart score={score} maxScore={maxScore} size={size} />
      <div className="flex flex-col">
        <div>
          <span  className="text-2xl font-bold text-white">{score.toFixed(1)}</span>
          <span> </span>
          <span className="text-gray-400">(out of {maxScore.toFixed(0)})</span>
        </div>
      </div>
    </div>
  );
};