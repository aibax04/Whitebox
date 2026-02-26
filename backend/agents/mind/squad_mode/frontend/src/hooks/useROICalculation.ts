import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { roiApiService } from '@/utils/roiApi';
import { appendROIToPDF, downloadPDF, ROICalculationData } from '@/utils/addROItopdfUtils';
import { ROICalculatorData, Factor, SubmitScoresRequest } from '@/types/roi';

export const useROICalculation = () => {
  const [selectedCalculator, setSelectedCalculator] = useState<ROICalculatorData | null>(null);
  const [calcFactors, setCalcFactors] = useState<Factor[]>([]);
  const [scores, setScores] = useState<{ [key: string]: number }>({});
  const [roi, setROI] = useState<number | null>(null);
  const [isAttachingToPDF, setIsAttachingToPDF] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const selectCalculator = async (calculator: ROICalculatorData) => {
    setSelectedCalculator(calculator);
    try {
      const data = await roiApiService.getCalculator(calculator._id);
      setCalcFactors(data.factors);
      const initialScores: { [key: string]: number } = {};
      data.factors.forEach((f: Factor) => { 
        initialScores[f.name] = 0; 
      });
      setScores(initialScores);
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'Failed to fetch calculator details', 
        variant: 'destructive' 
      });
    }
  };

  const handleScoreChange = (factorName: string, value: string) => {
    setScores({ ...scores, [factorName]: Number(value) });
  };

  const calculateROI = async (data: SubmitScoresRequest) => {
    setLoading(true);
    try {
      const result = await roiApiService.submitScores(data);
      setROI(result.finalScore);
      return result;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleAttachToPDF = async (prdFile: File, prdName: string) => {
    if (!prdFile || !selectedCalculator || roi === null) {
      toast({ 
        title: 'Error', 
        description: 'Please complete ROI calculation first', 
        variant: 'destructive' 
      });
      return;
    }

    // Validate file type
    if (!prdFile.type.includes('pdf')) {
      toast({ 
        title: 'Error', 
        description: 'Please select a valid PDF file', 
        variant: 'destructive' 
      });
      return;
    }

    setIsAttachingToPDF(true);
    try {
      // Read the original PDF file
      const arrayBuffer = await prdFile.arrayBuffer();
      
      // Prepare ROI data
      const roiData: ROICalculationData = {
        calculatorName: selectedCalculator.name,
        factors: calcFactors.map(factor => ({
          name: factor.name,
          scale: `${factor.scaleMin} - ${factor.scaleMax}`,
          score: scores[factor.name] || 0,
          weight: factor.weight
        })),
        roiScore: roi,
        prdName: prdName
      };

      // Append ROI data to PDF
      const modifiedPdfBytes = await appendROIToPDF(arrayBuffer, roiData);
      
      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${prdName.replace(/\.[^/.]+$/, '')}_with_ROI_${timestamp}.pdf`;
      
      // Download the modified PDF
      downloadPDF(modifiedPdfBytes, filename);
      
      toast({ 
        title: 'Success', 
        description: 'ROI data attached to PDF and downloaded successfully!' 
      });
    } catch (error) {
      console.error('Error attaching ROI to PDF:', error);
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to attach ROI to PDF', 
        variant: 'destructive' 
      });
    } finally {
      setIsAttachingToPDF(false);
    }
  };

  const resetCalculation = () => {
    setSelectedCalculator(null);
    setCalcFactors([]);
    setScores({});
    setROI(null);
  };

  const computeMaxScore = (factorList: Factor[]): number => {
    return factorList.reduce((sum, factor) => sum + factor.scaleMax * (factor.weight / 10), 0);
  };

  return {
    selectedCalculator,
    calcFactors,
    scores,
    roi,
    isAttachingToPDF,
    loading,
    selectCalculator,
    handleScoreChange,
    calculateROI,
    handleAttachToPDF,
    resetCalculation,
    computeMaxScore,
  };
};
