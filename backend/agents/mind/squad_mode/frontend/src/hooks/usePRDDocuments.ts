import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { roiApiService } from '@/utils/roiApi';
import { PRDDocument, SubmitScoresRequest } from '@/types/roi';

export const usePRDDocuments = () => {
  const [documents, setDocuments] = useState<PRDDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const data = await roiApiService.fetchDocuments();
      setDocuments(data);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const submitScores = async (data: SubmitScoresRequest) => {
    try {
      const newDocument = await roiApiService.submitScores(data);
      setDocuments(prev => [...prev, newDocument]);
      toast({ 
        title: 'Success', 
        description: 'ROI calculated successfully!' 
      });
      return newDocument;
    } catch (error) {
      console.error('Error submitting scores:', error);
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to calculate ROI', 
        variant: 'destructive' 
      });
      throw error;
    }
  };

  const deleteDocument = async (prdId: string) => {
    const shouldDelete = window.confirm('Delete this PRD? This cannot be undone.');
    if (!shouldDelete) return;

    try {
      await roiApiService.deleteDocument(prdId);
      setDocuments(prev => prev.filter(d => d._id !== prdId));
      toast({ 
        title: 'Deleted', 
        description: 'PRD deleted successfully' 
      });
    } catch (error) {
      console.error('Error deleting PRD:', error);
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to delete PRD', 
        variant: 'destructive' 
      });
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  return {
    documents,
    loading,
    fetchDocuments,
    submitScores,
    deleteDocument,
  };
};
