import React from 'react';
import { Calculator, FileText, BarChart3 } from 'lucide-react';
import { ROICalculatorData, PRDDocument } from '@/types/roi';
import calculate from '@/assets/images/roi/calculate.png';
import document from '@/assets/images/roi/document.png';
import analytics from '@/assets/images/roi/analytics.png';

interface DashboardCardsProps {
  calculators: ROICalculatorData[];
  documents: PRDDocument[];
}

export const DashboardCards: React.FC<DashboardCardsProps> = ({ calculators, documents }) => {
  const averageROI = documents.length > 0 
    ? (documents.reduce((sum, doc) => sum + (doc.finalScore || 0), 0) / documents.length).toFixed(1)
    : '0.0';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 mb-8">
      <div className="relative overflow-hidden">
        {/* <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-xl" /> */}
        <div className="rounded-lg bg-[#0D1117] p-6 border-none transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
              <div className="text-2xl font-bold text-white">{calculators.length}</div>
            <img src={calculate} className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Active ROI calculators</p>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden">
        {/* <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-transparent rounded-xl" /> */}
        <div className="rounded-lg bg-[#0D1117] p-6 border-none transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
          <div className="text-2xl font-bold text-white">{documents.length}</div>
            <img src={document} className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Analyzed PRDs</p>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden">
        {/* <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-transparent rounded-xl" /> */}
        <div className="rounded-lg bg-[#0D1117] p-6 border-none transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="text-2xl font-bold text-white">{averageROI}</div>
            <img src={analytics} className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Average ROI score</p>
          </div>
        </div>
      </div>
    </div>
  );
};
