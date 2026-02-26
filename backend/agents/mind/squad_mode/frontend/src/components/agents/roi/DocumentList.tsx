import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Trash2, RefreshCw } from 'lucide-react';
import { PRDDocument, ROICalculatorData } from '@/types/roi';
import files_image from '@/assets/images/roi/files_image.png';
import deleteicon from '@/assets/images/roi/deleteicon.png';
import { ScoreDisplay } from './ScorePieChart';

interface DocumentListProps {
  documents: PRDDocument[];
  calculators: ROICalculatorData[];
  onDelete: (prdId: string) => void;
  computeMaxScore: (factors: any[]) => number;
  onRefresh?: () => void;
  loading?: boolean;
}

export const DocumentList: React.FC<DocumentListProps> = ({ 
  documents, 
  calculators, 
  onDelete, 
  computeMaxScore,
  onRefresh,
  loading = false
}) => {
  if (documents.length === 0) {
    return (
      <div className="relative overflow-hidden">
        <div className="rounded-xl" />
        <div className="text-center py-12 border-none">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <img src={files_image} className="w-26 h-26" />
          </div>
          <h3 className="text-xl font-normal text-squadrun-gray mt-6">No documents found</h3>
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
            title="Refresh documents"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>
      {documents.map((document) => (
        <div
          key={document._id}
          className="relative overflow-hidden group"
        >
          <div className="group-hover:opacity-100 transition-opacity duration-200" />
          <div className="border-none hover:border-primary/40 transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-full flex items-center gap-4">
                <div className="w-full flex items-center justify-between gap-4">
                  <h3 className="text-md font-semibold text-white mb-1">{document.name}</h3>
                  <div>
                  <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(document._id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/20 h-10 w-10 p-0 transition-opacity duration-200"
                  title="Delete PRD"
                >
                  <img src={deleteicon} className="w-6 h-6" />
                  </Button>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {document.finalScore != null ? (
                <ScoreDisplay
                  score={document.finalScore}
                  maxScore={(() => { 
                    const calc = calculators.find(c => c._id === document.calculatorId); 
                    return calc ? computeMaxScore(calc.factors) : 100; 
                  })()}
                  showTitle={false}
                  size={32}
                />
              ) : (
                <div className="text-3xl font-normal text-white">N/A</div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
