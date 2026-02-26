import React from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Send, Upload, FileText, Sparkles, Eye } from 'lucide-react';
import files_1 from '@/assets/images/requirement_asst/files_1.png';
import attachment from '@/assets/images/requirement_asst/attachment.png';
import sent from '@/assets/images/requirement_asst/sent.png';
import { Textarea } from '@/components/ui/textarea';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  attachedFile: File | null;
  prdTemplate: File | null;
  selectedTemplate: any;
  isAnalyzingTemplate: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  templateInputRef: React.RefObject<HTMLInputElement>;
  onSendMessage: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onTemplateUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onTemplateSelectorOpen: () => void;
  onGeneratePRD: () => void;
  onClearFile: () => void;
  onClearTemplate: () => void;
  onTemplatePreview: () => void;
  calculateProgress: () => number;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  isLoading,
  attachedFile,
  prdTemplate,
  selectedTemplate,
  isAnalyzingTemplate,
  fileInputRef,
  templateInputRef,
  onSendMessage,
  onKeyPress,
  onFileUpload,
  onTemplateUpload,
  onTemplateSelectorOpen,
  onGeneratePRD,
  onClearFile,
  onClearTemplate,
  onTemplatePreview,
  calculateProgress
}) => {
  return (
    <div className="border-t border-squadrun-primary/20 p-4">
      <div className="flex flex-col gap-3">
        {/* File Upload Indicators */}
        {attachedFile && (
          <div className="flex items-center gap-2 p-2 bg-squadrun-primary/20 rounded border border-squadrun-primary/30">
            <FileText className="w-4 h-4 text-squadrun-primary" />
            <span className="text-sm text-white">File: {attachedFile.name}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFile}
              className="ml-auto h-6 w-6 p-0 text-squadrun-gray hover:text-white"
              title="Clear"
            >
              ×
            </Button>
          </div>
        )}
        
        {/* PRD Template Upload Indicator */}
        {(prdTemplate || selectedTemplate) && (
          <div className="flex items-center gap-2 p-2 bg-green-500/20 rounded border border-green-500/30">
            <FileText className="w-4 h-4 text-green-400" />
            <span className="text-sm text-white">
              PRD Template: {selectedTemplate ? selectedTemplate.name : prdTemplate?.name}
              {selectedTemplate && <span className="text-xs text-green-300 ml-1"></span>}
            </span>
            {isAnalyzingTemplate && (
              <div className="flex items-center gap-1 text-green-400 text-xs">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-400"></div>
                <span>Analyzing...</span>
              </div>
            )}
            <div className="flex items-center gap-1 ml-auto">
              {selectedTemplate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onTemplatePreview}
                  className="h-6 w-6 p-0 hover:bg-green-400/20"
                  title="Preview template"
                >
                  <Eye className="h-4 w-4 text-green-400" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearTemplate}
                className="h-6 w-6 p-0 text-squadrun-gray hover:text-white"
                title="Clear"
              >
                ×
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons with Progress */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4">
            <Button
              onClick={onGeneratePRD}
              disabled={isLoading}
              className="bg-squadrun-primary hover:bg-squadrun-primary/80 text-white"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate PRD
            </Button>
            {/* Progress Bar */}
            <div className="flex-1 flex items-center gap-3 justify-end">
              <span className="text-sm text-squadrun-gray whitespace-nowrap">
                PRD Progress:
              </span>
              <div className="flex-1 max-w-xs">
                <Progress 
                  value={calculateProgress()} 
                  className="h-2"
                />
              </div>
              <span className="text-sm text-squadrun-gray whitespace-nowrap">
                {Math.round(calculateProgress())}%
              </span>
            </div>
          </div>
        </div>

        {/* Input Field */}
        <div className="relative">
          <div className="bg-[#181D23] border-none rounded-xl p-1">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={onKeyPress}
            placeholder="Ask about your product requirements, upload documents, or request specific features..."
            className="w-full bg-transparent text-white placeholder-[#C9D1D9] border-none outline-none"
          />
              {/* Input area with icons */}
              <div className="flex items-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={onFileUpload}
                  accept=".txt,.md,.doc,.docx,.pdf"
                  className="hidden"
                />
                <input
                  ref={templateInputRef}
                  type="file"
                  onChange={onTemplateUpload}
                  accept=".txt,.md,.doc,.docx,.pdf"
                  className="hidden"
                />
                
                {/* Upload icon */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  title="Upload a document"
                >
                  <img src={attachment} className="w-4 h-4" />
                </Button>
                
                {/* Template icon with text */}
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onTemplateSelectorOpen}
                    disabled={isLoading}
                    title="Select PRD template"
                  >
                    <img src={files_1} className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Spacer to push send button to the right */}
                <div className="flex-1" />
                
                {/* Send button */}
                <Button
                  onClick={onSendMessage}
                  disabled={isLoading || (!input.trim() && !attachedFile)}
                  size="sm"
                  className="h-8 w-8 p-0 bg-[#4F52B2] hover:bg-[#4F52B2]/80 rounded-md"
                >
                  <img src={sent} className="w-4 h-4" />
                </Button>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};
