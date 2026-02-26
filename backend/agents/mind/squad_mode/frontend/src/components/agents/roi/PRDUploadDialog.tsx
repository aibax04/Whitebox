import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Upload, X, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ROICalculatorData, Factor, SubmitScoresRequest } from '@/types/roi';
import upload from '@/assets/images/upload.png';
import analytics_white from '@/assets/images/roi/analytics_white.png';

interface PRDUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  calculators: ROICalculatorData[];
  selectedCalculator: ROICalculatorData | null;
  calcFactors: Factor[];
  scores: { [key: string]: number };
  roi: number | null;
  loading: boolean;
  isAttachingToPDF: boolean;
  onFileChange: (file: File | null, name: string) => void;
  onCalculatorSelect: (calculator: ROICalculatorData) => void;
  onScoreChange: (factorName: string, value: string) => void;
  onCalculate: (data: SubmitScoresRequest) => Promise<void>;
  onAttachToPDF: (file: File, name: string) => Promise<void>;
  onReset: () => void;
  computeMaxScore: (factors: Factor[]) => number;
}

export const PRDUploadDialog: React.FC<PRDUploadDialogProps> = ({
  isOpen,
  onClose,
  calculators,
  selectedCalculator,
  calcFactors,
  scores,
  roi,
  loading,
  isAttachingToPDF,
  onFileChange,
  onCalculatorSelect,
  onScoreChange,
  onCalculate,
  onAttachToPDF,
  onReset,
  computeMaxScore,
}) => {
  const [prdFile, setPrdFile] = useState<File | null>(null);
  const [prdName, setPrdName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    // Validate file type
    if (!file.type.includes('pdf')) {
      toast({ 
        title: 'Invalid File Type', 
        description: 'Please select a PDF file', 
        variant: 'destructive' 
      });
      return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({ 
        title: 'File Too Large', 
        description: 'Please select a PDF file smaller than 10MB', 
        variant: 'destructive' 
      });
      return;
    }
    
    setPrdFile(file);
    setPrdName(file.name);
    onFileChange(file, file.name);
    
    toast({ 
      title: 'File Selected', 
      description: `${file.name} uploaded successfully` 
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleChooseFile = () => {
    fileInputRef.current?.click();
  };

  const handleCalculate = async () => {
    if (!prdName || !selectedCalculator) {
      return toast({ 
        title: 'Error', 
        description: 'Please complete all steps first', 
        variant: 'destructive' 
      });
    }

    try {
      await onCalculate({
        prdName,
        fileUrl: prdName,
        calculatorId: selectedCalculator._id,
        scores
      });
    } catch (error) {
      // Error handling is done in the parent component
    }
  };

  const handleAttachToPDF = async () => {
    if (!prdFile) {
      toast({ 
        title: 'Error', 
        description: 'Please select a PRD file first', 
        variant: 'destructive' 
      });
      return;
    }

    await onAttachToPDF(prdFile, prdName);
  };

  const resetForm = () => {
    // Reset local state
    setPrdFile(null);
    setPrdName('');
    setIsDragOver(false);
    
    // Reset parent component state
    onFileChange(null, '');
    onReset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-auto max-h-[80vh] overflow-y-auto bg-[#0D1117] border-none flex flex-col">
        <DialogHeader className="relative flex-shrink-0">
          <DialogTitle className="text-md font-light text-white flex items-center">
            <img src={analytics_white} className="w-5 h-5 mr-2" />
            ROI CALCULATION
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              isDragOver 
                ? 'border-[#4F52B2] bg-[#4F52B2]/10' 
                : 'border-gray-600 hover:border-gray-500'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <img src={upload} className="w-16 h-14 mx-auto mb-4" />
            <p className="text-white text-lg mb-2">Drag and drop your PRD here</p>
            <p className="text-gray-400 text-sm mb-6">Supported file type: PDF</p>
            <Button
              onClick={handleChooseFile}
              className="bg-[#4F52B2] hover:bg-[#4F52B2]/90 text-white px-5 py-2 rounded-full"
            >
              Choose a File
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* File Selected Display */}
          {prdFile && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center mr-3">
                  <span className="text-green-500 text-sm">✓</span>
                </div>
                <div>
                  <p className="text-white font-medium">{prdFile.name}</p>
                  <p className="text-green-400 text-sm">File uploaded successfully</p>
                </div>
              </div>
            </div>
          )}

          {/* Calculator Selection */}
          {prdFile && calculators.length > 0 && !selectedCalculator && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Select a Calculator</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {calculators.map((calculator) => (
                  <div
                    key={calculator._id}
                    className="p-4 rounded-lg border border-gray-600 hover:border-gray-500 cursor-pointer transition-colors"
                    onClick={() => onCalculatorSelect(calculator)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">{calculator.name}</h4>
                        <p className="text-gray-400 text-sm">{calculator.factors.length} factors</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scoring Table */}
          {selectedCalculator && calcFactors.length > 0 && (
            <div className="bg-transparent rounded-lg p-1 border-none">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-white mb-2">Score Your PRD</h3>
              </div>
              
              <div className="space-y-4">
                {calcFactors.map((factor, index) => (
                  <div key={index} className="bg-gray-900/50 rounded-lg p-4 border border-gray-600">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-[#79C0FF] font-bold">{factor.name}</h4>
                        <p className="text-gray-400 text-sm">Scale: {factor.scaleMin} - {factor.scaleMax}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[#79C0FF] text-sm font-bold">Weight: {factor.weight}%</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <span className="text-gray-400 text-sm min-w-[60px]">Score:</span>
                      <Input
                        type="number"
                        min={factor.scaleMin}
                        max={factor.scaleMax}
                        value={scores[factor.name] || ''}
                        onChange={e => onScoreChange(factor.name, e.target.value)}
                        className="w-18 h-10 bg-gray-800 border-none rounded-lg text-white focus:none"
                        placeholder="0"
                      />
                      <div className="flex-1">
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-[#79C0FF] to-[#4F52B2] h-2 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${Math.min(100, Math.max(0, ((scores[factor.name] || 0) - factor.scaleMin) / (factor.scaleMax - factor.scaleMin) * 100))}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6">
                <div className="flex items-center justify-end">
                  <Button
                    onClick={handleCalculate}
                    disabled={loading}
                    className="bg-[#4F52B2] rounded-full hover:bg-[#4F52B2]/90 text-white px-6"
                  >
                    {loading ? 'Calculating...' : 'Calculate ROI Score'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ROI Calculation Results */}
          {roi !== null && (
            <div className="bg-[#4F52B2]/10 border border-none rounded-lg p-6 text-center">
              <h3 className="text-xl font-bold text-white mb-2">ROI Score: {roi.toFixed(1)} / {computeMaxScore(calcFactors)}</h3>
              <p className="text-gray-400 mb-4">Calculation completed for {prdName}</p>
              <Button
                onClick={handleAttachToPDF}
                disabled={isAttachingToPDF}
                className="bg-[#4F52B2] rounded-full hover:bg-[#4F52B2]/90 text-white px-6"
              >
                {isAttachingToPDF ? 'Attaching...' : 'Attach to PRD'}
              </Button>
            </div>
          )}
          {/* Action Buttons */}
          <div className="my-4 border-t border-gray-700"></div>
          <div className="flex justify-end">
            <Button
              onClick={resetForm}
              className="bg-[#4F52B2] mr-2 rounded-full hover:bg-[#4F52B2]/90 text-white px-6"
            >
              Reset
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
