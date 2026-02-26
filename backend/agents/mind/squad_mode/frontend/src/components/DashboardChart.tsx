import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

interface DashboardStats {
  docsGenerated: number;
  roadmapsCreated: number;
  filesShared: number;
  roisCalculated: number;
}

interface HistoricalData {
  date: string;
  docsGenerated: number;
  roadmapsCreated: number;
  filesShared: number;
  roisCalculated: number;
}

interface DashboardChartProps {
  stats: DashboardStats;
  historicalData: HistoricalData[];
  isLoading: boolean;
}

export default function DashboardChart({ stats, historicalData, isLoading }: DashboardChartProps) {
  const [activeChart, setActiveChart] = useState<'line' | 'bar' | 'doughnut'>('line');
  
  // Use real historical data for time series
  const getTimeSeriesData = () => {
    if (!historicalData || historicalData.length === 0) {
      return { days: [], docsData: [], roadmapsData: [], filesData: [], roisData: [] };
    }

    const days = historicalData.map(item => {
      const date = new Date(item.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    const docsData = historicalData.map(item => item.docsGenerated);
    const roadmapsData = historicalData.map(item => item.roadmapsCreated);
    const filesData = historicalData.map(item => item.filesShared);
    const roisData = historicalData.map(item => item.roisCalculated);

    return { days, docsData, roadmapsData, filesData, roisData };
  };

  const { days, docsData, roadmapsData, filesData, roisData } = getTimeSeriesData();

  // Line chart data for activity over time
  const lineChartData = {
    labels: days,
    datasets: [
      {
        label: 'Saved Documents',
        data: docsData,
        borderColor: '#0c8ce9',
        backgroundColor: 'rgba(12, 140, 233, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#0c8ce9',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Roadmaps Created',
        data: roadmapsData,
        borderColor: '#f65009',
        backgroundColor: 'rgba(246, 80, 9, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#f65009',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Files Shared',
        data: filesData,
        borderColor: '#8a38f5',
        backgroundColor: 'rgba(138, 56, 245, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#8a38f5',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'ROIs Calculated',
        data: roisData,
        borderColor: '#794dc5',
        backgroundColor: 'rgba(121, 77, 197, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#794dc5',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  // Bar chart data for current totals
  const barChartData = {
    labels: ['Documents', 'Roadmaps', 'Files Shared', 'ROIs'],
    datasets: [
      {
        label: 'Total Count',
        data: [stats.docsGenerated, stats.roadmapsCreated, stats.filesShared, stats.roisCalculated],
        backgroundColor: [
          'rgba(12, 140, 233, 0.8)',
          'rgba(246, 80, 9, 0.8)',
          'rgba(138, 56, 245, 0.8)',
          'rgba(121, 77, 197, 0.8)',
        ],
        borderColor: [
          '#0c8ce9',
          '#f65009',
          '#8a38f5',
          '#794dc5',
        ],
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  };

  // Doughnut chart data for distribution
  const total = stats.docsGenerated + stats.roadmapsCreated + stats.filesShared + stats.roisCalculated;
  const doughnutChartData = {
    labels: ['Documents', 'Roadmaps', 'Files Shared', 'ROIs'],
    datasets: [
      {
        data: [
          stats.docsGenerated,
          stats.roadmapsCreated,
          stats.filesShared,
          stats.roisCalculated,
        ],
        backgroundColor: [
          'rgba(12, 140, 233, 0.8)',
          'rgba(246, 80, 9, 0.8)',
          'rgba(138, 56, 245, 0.8)',
          'rgba(121, 77, 197, 0.8)',
        ],
        borderColor: [
          '#0c8ce9',
          '#f65009',
          '#8a38f5',
          '#794dc5',
        ],
        borderWidth: 2,
        cutout: '60%',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#c9d1d9',
          font: {
            size: 12,
          },
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: '#0d1117',
        titleColor: '#f0f6fc',
        bodyColor: '#c9d1d9',
        borderColor: '#21262d',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        titleFont: {
          size: 14,
          weight: 'bold',
        },
        bodyFont: {
          size: 12,
        },
        padding: 12,
      },
    },
    scales: {
      x: {
        grid: {
          color: '#21262d',
          drawBorder: false,
        },
        ticks: {
          color: '#8b949e',
          font: {
            size: 11,
          },
        },
        border: {
          color: '#21262d',
        },
      },
      y: {
        grid: {
          color: '#21262d',
          drawBorder: false,
        },
        ticks: {
          color: '#8b949e',
          font: {
            size: 11,
          },
          stepSize: 1,
        },
        border: {
          color: '#21262d',
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#c9d1d9',
          font: {
            size: 11,
            weight: 'normal',
          },
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 15,
        },
      },
      tooltip: {
        backgroundColor: '#0d1117',
        titleColor: '#f0f6fc',
        bodyColor: '#c9d1d9',
        borderColor: '#21262d',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed;
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  if (isLoading) {
    return (
      <div className="w-full h-[400px] bg-[#141a23] rounded-md flex items-center justify-center">
        <div className="text-[#8b949e] text-sm">Loading chart data...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-[400px] bg-transparent rounded-md p-4">
      <div className="flex flex-col h-full">
        {/* Chart Type Selector */}
        <div className="flex gap-2 mb-4">
          <button
            className="px-3 py-1 text-xs bg-[#0d1117] text-[#c9d1d9] rounded border border-[#21262d] hover:bg-[#161b22] transition-colors"
            onClick={() => setActiveChart('line')}
          >
            Activity Trend
          </button>
          <button
            className="px-3 py-1 text-xs bg-[#0d1117] text-[#c9d1d9] rounded border border-[#21262d] hover:bg-[#161b22] transition-colors"
            onClick={() => setActiveChart('bar')}
          >
            Total Counts
          </button>
          <button
            className="px-3 py-1 text-xs bg-[#0d1117] text-[#c9d1d9] rounded border border-[#21262d] hover:bg-[#161b22] transition-colors"
            onClick={() => setActiveChart('doughnut')}
          >
            Distribution
          </button>
        </div>

        {/* Chart Container */}
        <div className="flex-1 relative">
          {activeChart === 'line' && (
            <Line data={lineChartData} options={chartOptions as any} />
          )}
          {activeChart === 'bar' && (
            <Bar data={barChartData} options={chartOptions as any} />
          )}
          {activeChart === 'doughnut' && (
            <Doughnut data={doughnutChartData} options={doughnutOptions as any} />
          )}
        </div>
      </div>
    </div>
  );
}
