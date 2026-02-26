import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calculator, Upload, FileText, BarChart3, Plus, Search } from 'lucide-react';
import { useROICalculators } from '@/hooks/useROICalculators';
import { usePRDDocuments } from '@/hooks/usePRDDocuments';
import { useROICalculation } from '@/hooks/useROICalculation';
import { CalculatorForm, PRDUploadDialog, CalculatorList, DocumentList, DashboardCards } from './roi';
import { CreateCalculatorRequest, SubmitScoresRequest } from '@/types/roi';
import header_image from '@/assets/images/header_image.png';
import calculate from '@/assets/images/roi/calculate.png';
import document from '@/assets/images/roi/document.png';
import calculator_white from '@/assets/images/roi/calculator_white.png';
import files from '@/assets/images/roi/files.png';

export default function ROICalculator() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPRDDialogOpen, setIsPRDDialogOpen] = useState(false);
  const [prdFile, setPrdFile] = useState<File | null>(null);
  const [prdName, setPrdName] = useState('');
  const [calculatorSearchTerm, setCalculatorSearchTerm] = useState('');
  const [documentSearchTerm, setDocumentSearchTerm] = useState('');

  // Custom hooks for data management
  const { calculators, createCalculator, deleteCalculator, fetchCalculators, loading: calculatorsLoading } = useROICalculators();
  const { documents, submitScores, deleteDocument, fetchDocuments, loading: documentsLoading } = usePRDDocuments();
  const {
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
  } = useROICalculation();

  // Handler functions
  const handleCreateCalculator = async (data: CreateCalculatorRequest) => {
    await createCalculator(data);
  };

  const handleFileChange = (file: File | null, name: string) => {
    setPrdFile(file);
    setPrdName(name);
  };

  const handleCalculate = async (data: SubmitScoresRequest) => {
    await calculateROI(data);
  };

  const handleAttachToPDFWrapper = async (file: File, name: string) => {
    await handleAttachToPDF(file, name);
  };

  const resetPRDForm = () => {
    setPrdFile(null);
    setPrdName('');
    resetCalculation();
  };

  // Filter calculators based on search term
  const filteredCalculators = calculators.filter(calculator =>
    calculator.name.toLowerCase().includes(calculatorSearchTerm.toLowerCase())
  );

  // Filter documents based on search term
  const filteredDocuments = documents.filter(document =>
    document.name.toLowerCase().includes(documentSearchTerm.toLowerCase())
  );

  return (
    <div className="h-auto bg-squadrun-darker/10 p-4">
      {/* Enhanced Header */}
      <div className="bg-transparent rounded-md relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2.5">
              <h1 className="text-white text-2xl ml-6 font-bold">
                ROI Calculator
              </h1>
            </div>
            <p className=" text-squadrun-gray text-md ml-6">
              Create and manage ROI calculators for your projects.
            </p>
          </div>
          <div className="w-1/2 h-[136px]">
            <img src={header_image} alt="dashboard-header" />
          </div>
        </div>
      </div>
      <hr className="my-8 border-t border-squadrun-gray/20" />

      {/* Dashboard Overview Cards */}
      <DashboardCards calculators={calculators} documents={documents} />

      {/* Calculator Form Dialog */}
      <CalculatorForm
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSubmit={handleCreateCalculator}
      />

      {/* PRD Upload Dialog */}
      <PRDUploadDialog
        isOpen={isPRDDialogOpen}
        onClose={() => setIsPRDDialogOpen(false)}
        calculators={calculators}
        selectedCalculator={selectedCalculator}
        calcFactors={calcFactors}
        scores={scores}
        roi={roi}
        loading={loading}
        isAttachingToPDF={isAttachingToPDF}
        onFileChange={handleFileChange}
        onCalculatorSelect={selectCalculator}
        onScoreChange={handleScoreChange}
        onCalculate={handleCalculate}
        onAttachToPDF={handleAttachToPDFWrapper}
        onReset={resetCalculation}
        computeMaxScore={computeMaxScore}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Enhanced My Calculators Section */}
        <div className="max-h-[53vh] overflow-y-auto mb-8 bg-[#0D1117] rounded-lg p-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <img src={calculator_white} className="w-6 h-6" />
              <div>
                <h2 className="text-md text-white">MY CALCULATORS</h2>
              </div>
              <div className="relative ml-52">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search calculators..."
                  value={calculatorSearchTerm}
                  onChange={(e) => setCalculatorSearchTerm(e.target.value)}
                  className="pl-10 bg-transparent border-none text-white placeholder-gray-400 focus:border-none focus:ring-none"
                />
              </div>
            </div>
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="bg-[#4F52B2] rounded-full hover:opacity-50 hover:text-white text-white transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              Add New Calculator
            </Button>
          </div>
          <CalculatorList
            calculators={filteredCalculators}
            onDelete={deleteCalculator}
            onRefresh={fetchCalculators}
            loading={calculatorsLoading}
          />
        </div>
        {/* Enhanced My Documents Section */}
        <div className="max-h-[53vh] overflow-y-auto mb-8 bg-[#0D1117] rounded-lg p-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <img src={files} className="w-6 h-6" />
              <div>
                <h2 className="text-md text-white">MY DOCUMENTS</h2>
              </div>
              <div className="relative ml-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search documents..."
                  value={documentSearchTerm}
                  onChange={(e) => setDocumentSearchTerm(e.target.value)}
                  className="pl-10 bg-transparent border-none text-white placeholder-gray-400 focus:border-none focus:ring-none"
                />
              </div>
            </div>
            <Button
              onClick={() => {
                resetPRDForm();
                setIsPRDDialogOpen(true);
              }}
              className="bg-[#4F52B2] rounded-full hover:opacity-50 hover:text-white text-white transition-all duration-200"
            >
              <Upload className="w-4 h-4" />
              Upload a PRD
            </Button>
          </div>
          <DocumentList
            documents={filteredDocuments}
            calculators={calculators}
            onDelete={deleteDocument}
            computeMaxScore={computeMaxScore}
            onRefresh={fetchDocuments}
            loading={documentsLoading}
          />
        </div>
      </div>
    </div>
  );
}