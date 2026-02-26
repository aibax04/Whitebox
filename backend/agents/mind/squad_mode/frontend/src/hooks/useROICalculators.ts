import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { roiApiService } from '@/utils/roiApi';
import { ROICalculatorData, CreateCalculatorRequest } from '@/types/roi';

export const useROICalculators = () => {
  const [calculators, setCalculators] = useState<ROICalculatorData[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchCalculators = async () => {
    setLoading(true);
    try {
      const data = await roiApiService.fetchCalculators();
      setCalculators(data);
    } catch (error) {
      console.error('Error fetching calculators:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch calculators",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createCalculator = async (data: CreateCalculatorRequest) => {
    try {
      const newCalculator = await roiApiService.createCalculator(data);
      setCalculators(prev => [...prev, newCalculator]);
      toast({
        title: "Success",
        description: "Calculator saved successfully",
      });
      return newCalculator;
    } catch (error) {
      console.error('Error creating calculator:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save calculator",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteCalculator = async (calculatorId: string) => {
    const shouldDelete = window.confirm('Delete this calculator? This cannot be undone.');
    if (!shouldDelete) return;

    try {
      await roiApiService.deleteCalculator(calculatorId);
      setCalculators(prev => prev.filter(c => c._id !== calculatorId));
      toast({ 
        title: 'Deleted', 
        description: 'Calculator deleted successfully' 
      });
    } catch (error) {
      console.error('Error deleting calculator:', error);
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to delete calculator', 
        variant: 'destructive' 
      });
    }
  };

  useEffect(() => {
    fetchCalculators();
  }, []);

  return {
    calculators,
    loading,
    fetchCalculators,
    createCalculator,
    deleteCalculator,
  };
};
