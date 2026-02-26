import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface DiagramTypeSelectorProps {
  diagramType: string;
  isGenerating: boolean;
  onDiagramTypeChange: (type: string) => void;
  onGenerate: () => void;
}

export const DiagramTypeSelector: React.FC<DiagramTypeSelectorProps> = ({
  diagramType,
  isGenerating,
  onDiagramTypeChange,
  onGenerate,
}) => {
  return (
    <Card className="mb-6 bg-[#1a1f2e] border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Select Diagram Type</CardTitle>
        <CardDescription className="text-gray-400">
          Choose the type of diagram you want to generate
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={diagramType} onValueChange={onDiagramTypeChange}>
          <SelectTrigger className="bg-[#0f1318] border-gray-600 text-white">
            <SelectValue placeholder="Select diagram type" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1f2e] border-gray-700">
            <SelectItem value="hld" className="text-white hover:bg-gray-700">
              High-Level Design (HLD)
            </SelectItem>
            <SelectItem value="lld" className="text-white hover:bg-gray-700">
              Low-Level Design (LLD)
            </SelectItem>
            <SelectItem value="erd" className="text-white hover:bg-gray-700">
              Entity Relationship Diagram (ERD)
            </SelectItem>
          </SelectContent>
        </Select>

        <Button
          onClick={onGenerate}
          disabled={!diagramType || isGenerating}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Diagram...
            </>
          ) : (
            'Generate Diagram'
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

