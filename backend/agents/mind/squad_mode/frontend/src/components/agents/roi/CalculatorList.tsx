import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calculator, Trash2, BarChart3, RefreshCw } from 'lucide-react';
import { ROICalculatorData } from '@/types/roi';
import deleteicon from '@/assets/images/roi/deleteicon.png';
import calc_image from '@/assets/images/roi/calc_image.png';

interface CalculatorListProps {
  calculators: ROICalculatorData[];
  onDelete: (calculatorId: string) => void;
  onRefresh?: () => void;
  loading?: boolean;
}

export const CalculatorList: React.FC<CalculatorListProps> = ({ calculators, onDelete, onRefresh, loading = false }) => {
  const [expandedCalculator, setExpandedCalculator] = useState<string | null>(null);

  const toggleFactors = (calculatorId: string) => {
    setExpandedCalculator(expandedCalculator === calculatorId ? null : calculatorId);
  };
  if (calculators.length === 0) {
    return (
      <div className="relative overflow-hidden">
        <div className="rounded-xl" />
        <div className="text-center py-12 border-none">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <img src={calc_image} className="w-26 h-26" />
          </div>
          <h3 className="text-xl font-normal text-squadrun-gray mt-6">No calculator found</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <hr className="border-t border-primary/20 flex-1" />
        {onRefresh && (
          <Button
            onClick={onRefresh}
            disabled={loading}
            variant="ghost"
            size="sm"
            className="ml-4 text-gray-400 hover:text-white hover:bg-gray-800 transition-all duration-200"
            title="Refresh calculators"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>
      {calculators.map((calculator) => (
        <div
          key={calculator._id}
          className="relative overflow-hidden group"
        >
          <div className="group-hover:opacity-100 transition-opacity duration-200" />
          <div className="border-none hover:border-primary/40 transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">{calculator.name}</h3>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div 
                  className="px-4 py-1 bg-transparent border border-[#79C0FF] rounded-full cursor-pointer hover:bg-[#79C0FF]/10 transition-colors"
                  onClick={() => toggleFactors(calculator._id)}
                >
                  <span className="text-sm text-[#79C0FF] font-medium">
                    {calculator.factors.length} Factors
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(calculator._id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/20 h-10 w-10 p-0 transition-opacity duration-200"
                  title="Delete Calculator"
                >
                  <img src={deleteicon} className="w-6 h-6" />
                </Button>
              </div>
            </div>
            {expandedCalculator === calculator._id && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {calculator.factors.map((factor, index) => (
                  <div key={index} className="bg-card/30 rounded-lg p-3 border-none">
                    <div className="text-sm font-bold text-[#79C0FF] mb-1">{factor.name}</div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Scale: {factor.scaleMin}-{factor.scaleMax}</span>
                      <span>Weight: {factor.weight}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
