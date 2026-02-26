import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Calculator, Save, Check, X } from 'lucide-react';
import { Factor, CreateCalculatorRequest } from '@/types/roi';
import deleteicon from '@/assets/images/roi/deleteicon.png';

interface CalculatorFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCalculatorRequest) => Promise<void>;
}

export const CalculatorForm: React.FC<CalculatorFormProps> = ({ isOpen, onClose, onSubmit }) => {
  const [calculatorName, setCalculatorName] = useState('');
  const [factors, setFactors] = useState<Factor[]>([{ name: '', scaleMin: 1, scaleMax: 10, weight: 10 }]);
  const [loading, setLoading] = useState(false);

  const addFactor = () => {
    setFactors([...factors, { name: '', scaleMin: 1, scaleMax: 10, weight: 10 }]);
  };

  const removeFactor = (index: number) => {
    if (factors.length > 1) {
      setFactors(factors.filter((_, i) => i !== index));
    }
  };

  const updateFactor = (index: number, field: keyof Factor, value: string | number) => {
    const updatedFactors = [...factors];
    updatedFactors[index] = {
      ...updatedFactors[index],
      [field]: field === 'scaleMin' || field === 'scaleMax' || field === 'weight' ? Number(value) : value
    };
    setFactors(updatedFactors);
  };

  const handleSubmit = async () => {
    if (!calculatorName.trim()) {
      return;
    }

    if (factors.some(factor => !factor.name.trim())) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        name: calculatorName,
        factors: factors
      });
      resetForm();
      onClose();
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCalculatorName('');
    setFactors([{ name: '', scaleMin: 1, scaleMax: 10, weight: 10 }]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogTrigger asChild>
      </DialogTrigger>
      <DialogContent className="bg-[#0D1117] max-w-7xl max-h-[90vh] overflow-y-auto border-none">
        <DialogHeader className="border-b border-primary/20 pb-4">
          <DialogTitle className="text-sm text-white flex items-center">
            <div className="w-10 h-10 flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" />
            </div>
            ADD NEW CALCULATOR
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-8 pt-6">
          <div className="space-y-3">
            <Label htmlFor="calculator-name" className="text-base font-medium text-white">
              Calculator Name
            </Label>
            <Input
              id="calculator-name"
              value={calculatorName}
              onChange={(e) => setCalculatorName(e.target.value)}
              placeholder="Enter a calculator name (e.g., Product Development ROI Calculator)"
              className="h-12 text-lg border-none focus:none bg-[#181D23] rounded-full"
            />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium text-white">Evaluation Factors</Label>
                <p className="text-sm text-muted-foreground mt-1">Define the criteria and their weights for calculating ROI</p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={addFactor}
                className="border-none bg-transparent text-primary hover:bg-primary/20 hover:border-primary"
              >
                <Plus className="w-4 h-4" />
                Add Factor
              </Button>
            </div>
            <div className="border-none rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-none hover:bg-transparent">
                    <TableHead className="text-white font-medium">Factor Name</TableHead>
                    <TableHead className="text-white font-medium">Scale Min</TableHead>
                    <TableHead className="text-white font-medium">Scale Max</TableHead>
                    <TableHead className="text-white font-medium">Weight (%)</TableHead>
                    <TableHead className="text-white font-medium w-16">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {factors.map((factor, index) => (
                    <TableRow key={index} className="border-primary/10 hover:bg-card/20">
                      <TableCell>
                        <Input
                          value={factor.name}
                          onChange={(e) => updateFactor(index, 'name', e.target.value)}
                          placeholder="Enter a factor name (e.g., Market Impact)"
                          className="border-none focus:none h-8 bg-[#181D23] rounded-full"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          value={factor.scaleMin}
                          onChange={(e) => updateFactor(index, 'scaleMin', e.target.value)}
                          className="border-none focus:none h-8 w-20 bg-[#181D23] rounded-full"
                          placeholder="Enter min scale value (e.g., 1)"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={factor.scaleMin}
                          value={factor.scaleMax}
                          onChange={(e) => updateFactor(index, 'scaleMax', e.target.value)}
                          className="border-none focus:none h-8 w-20 bg-[#181D23] rounded-full"
                          placeholder="Enter max scale value (e.g., 10)"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          step="1"
                          value={factor.weight}
                          onChange={(e) => updateFactor(index, 'weight', e.target.value)}
                          className="border-none focus:none h-8 w-20 bg-[#181D23] rounded-full"
                          placeholder="Enter weight value (%)"
                        />
                      </TableCell>
                      <TableCell>
                        {factors.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFactor(index)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/20 h-8 w-8 p-0"
                          >
                            <img src={deleteicon} className="w-5 h-5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-primary/20">
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="hover:bg-primary/90 text-white bg-[#4F52B2] rounded-full"
            >
              <Check className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save Calculator'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
