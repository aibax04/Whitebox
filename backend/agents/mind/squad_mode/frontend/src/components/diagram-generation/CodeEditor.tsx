import React from 'react';
import { Button } from '@/components/ui/button';

interface CodeEditorProps {
  editableDiagram: string;
  onCodeChange: (code: string) => void;
  onApply: () => void;
  onReset: () => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  editableDiagram,
  onCodeChange,
  onApply,
  onReset,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm text-gray-400 mb-2 block">Edit Mermaid Code:</label>
        <textarea
          value={editableDiagram}
          onChange={(e) => onCodeChange(e.target.value)}
          className="w-full h-96 bg-[#0f1318] border border-gray-600 rounded-lg p-4 text-white font-mono text-sm"
          spellCheck={false}
        />
      </div>
      <div className="flex gap-2">
        <Button
          onClick={onApply}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          Apply Changes & Render
        </Button>
        <Button onClick={onReset} variant="outline" className="border-gray-600 text-white hover:bg-gray-700">
          Reset to Original
        </Button>
      </div>
    </div>
  );
};

