import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { generatePRDPDF } from '@/utils/prdPdfGenerator';
import { generatePRDDOCX } from '@/utils/prdDocxGenerator';
import { updateUploadedData as apiUpdateUploadedData, addBotMessage as apiAddBotMessage } from '@/utils/prdChatApi';
import RichTextEditorModal from '../document-creator/RichTextEditorModal';
import TemplateSelector from '../../TemplateSelector';
import { readFileContent, cleanAndStructureRTF } from './utils/fileUtils';
import { analyzePRDTemplate } from './utils/analysisUtils';
import { useChatSessions } from './hooks/useChatSessions';
import { useMessages } from './hooks/useMessages';
import { ChatSidebar } from './components/ChatSidebar';
import { ChatMessages } from './components/ChatMessages';
import { ChatInput } from './components/ChatInput';
import { LivePRDPreview } from './components/LivePRDPreview';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, X } from 'lucide-react';

// Helper function to generate template analysis success message
const generateTemplateAnalysisSuccessMessage = (templateName: string, analysis: string): string => {
  // Extract key factors from the analysis
  const factors = extractAnalysisFactors(analysis);
  
  let message = `Template Analysis Complete!\n\n`;
  message += `I've successfully analyzed the "${templateName}" template. Here's what I identified:\n\n`;
  
  if (factors.length > 0) {
    message += `Key Factors Identified:\n`;
    factors.forEach((factor, index) => {
      message += `${index + 1}. ${factor}\n`;
    });
  } else {
    message += `Analysis Summary:\n`;
    message += `The template has been analyzed and its structure, style, and requirements have been understood. I'm now ready to help you create a PRD following this template's format and approach.\n\n`;
  }
  
  message += `\nI'm now ready to assist you in creating a PRD that follows this template's structure and style. What would you like to discuss about your product requirements?`;
  
  return message;
};

// Helper function to extract key factors from analysis text
const extractAnalysisFactors = (analysis: string): string[] => {
  const factors: string[] = [];
  
  // Look for common analysis patterns and extract key points
  const lines = analysis.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let currentSection = '';
  let factorCount = 0;
  
  for (const line of lines) {
    // Look for numbered items or bullet points
    if (line.match(/^\d+\./) || line.match(/^[-•*]/)) {
      const factor = line.replace(/^\d+\.\s*/, '').replace(/^[-•*]\s*/, '').trim();
      if (factor.length > 10 && factorCount < 5) { // Limit to top 5 factors
        factors.push(factor);
        factorCount++;
      }
    }
    // Look for section headers
    else if (line.match(/^[A-Z][A-Z\s]+:$/) || line.match(/^[A-Z][a-z\s]+:$/)) {
      currentSection = line.replace(':', '').trim();
    }
    // Look for key descriptive sentences
    else if (line.length > 20 && line.length < 150 && factorCount < 5) {
      // Check if it contains key analysis keywords
      const keywords = ['structure', 'style', 'format', 'sections', 'requirements', 'organization', 'approach', 'methodology'];
      if (keywords.some(keyword => line.toLowerCase().includes(keyword))) {
        factors.push(line);
        factorCount++;
      }
    }
  }
  
  return factors.slice(0, 5); // Return maximum 5 factors
};

export default function PRDChatbot() {
  const [input, setInput] = useState('');
  const [isTemplateSelectorOpen, setIsTemplateSelectorOpen] = useState(false);
  const [isTemplatePreviewOpen, setIsTemplatePreviewOpen] = useState(false);

  // Use custom hooks
  const {
    chatSessions,
    currentSessionId,
    currentSession,
    searchTerm,
    setSearchTerm,
    editingTitle,
    editingTitleValue,
    setEditingTitleValue,
    filteredSessions,
    createNewChat,
    loadChatSession,
    deleteChatSession,
    handleStartRename,
    handleCancelRename,
    handleSaveRename
  } = useChatSessions();

  const {
    messages,
    setMessages,
    isLoading,
    conversationState,
    setConversationState,
    attachedFile,
    setAttachedFile,
    fileContent,
    setFileContent,
    prdTemplate,
    setPrdTemplate,
    prdTemplateContent,
    setPrdTemplateContent,
    templateAnalysis,
    setTemplateAnalysis,
    selectedTemplate,
    setSelectedTemplate,
    isAnalyzingTemplate,
    isPRDModalOpen,
    setIsPRDModalOpen,
    editablePRDContent,
    setEditablePRDContent,
    livePreviewContent,
    isGeneratingPRD,
    isPreviewVisible,
    fileInputRef,
    templateInputRef,
    messagesEndRef,
    handleFileUpload,
    handleTemplateUpload,
    handleTemplateSelect,
    handleSendMessage,
    handleGeneratePRD,
    handleTogglePreviewVisibility,
    handleOpenEditModal,
    calculateProgress
  } = useMessages();

  // Load current session data when currentSessionId changes
  useEffect(() => {
    if (currentSessionId) {
      loadChatSession(currentSessionId);
    }
  }, [currentSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle session loading
  const handleLoadSession = async (sessionId: string) => {
    const result = await loadChatSession(sessionId);
    if (result) {
      setMessages(result.frontendMessages);
      setConversationState(result.conversationState);
      
      // Load uploaded file and template data
      if (result.uploadedFile) {
        setFileContent(result.uploadedFile.fileName);
      }
      if (result.uploadedTemplate) {
        setPrdTemplateContent(result.uploadedTemplate.fileName);
      }
      
      // Clear local file states
      setInput('');
      setAttachedFile(null);
      setPrdTemplate(null);
    }
  };

  // Handle new chat creation
  const handleCreateNewChat = async () => {
    const result = await createNewChat();
    if (result) {
      setMessages(result.frontendMessages);
      setInput('');
      setAttachedFile(null);
      setFileContent('');
      setPrdTemplate(null);
      setPrdTemplateContent('');
      setTemplateAnalysis('');
      setConversationState({
        questionsAsked: [],
        aspectQuestionCounts: {}
      });
    }
  };

  // Handle sending messages
  const handleSend = async () => {
    await handleSendMessage(input, currentSessionId);
    setInput('');
  };

  // Handle file upload
  const handleFileUploadWrapper = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(event, currentSessionId);
  };

  // Handle template upload
  const handleTemplateUploadWrapper = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleTemplateUpload(event, currentSessionId);
  };

  // Handle template selection
  const handleTemplateSelectWrapper = (template: any) => {
    handleTemplateSelect(template, currentSessionId);
  };

  // Handle template upload from selector
  const handleTemplateUploadFromSelector = async (file: File) => {
    try {
      const rawContent = await readFileContent(file);
      const cleanedContent = cleanAndStructureRTF(rawContent);
      
      setPrdTemplate(file);
      setPrdTemplateContent(cleanedContent);
      
      const analysis = await analyzePRDTemplate(cleanedContent, file.name);
      setTemplateAnalysis(analysis);
      
      if (currentSessionId) {
        await apiUpdateUploadedData(currentSessionId, {
          uploadedTemplate: {
            fileName: file.name,
            fileType: file.type
          }
        });
      }
      
      // Generate success message with analysis summary
      const successMessage = generateTemplateAnalysisSuccessMessage(file.name, analysis);
      
      // Add the success message to chat
      if (currentSessionId) {
        await apiAddBotMessage(currentSessionId, successMessage);
        
        // Update local messages state
        const newMessage = {
          id: Date.now().toString(),
          type: 'bot' as const,
          content: successMessage,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, newMessage]);
      }
      
      toast.success(`Template "${file.name}" uploaded and analyzed successfully`);
    } catch (error) {
      toast.error('Failed to analyze uploaded template');
      console.error('Template analysis error:', error);
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Clear file
  const handleClearFile = () => {
    setAttachedFile(null);
    setFileContent('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Clear template
  const handleClearTemplate = () => {
    setPrdTemplate(null);
    setPrdTemplateContent('');
    setTemplateAnalysis('');
    setSelectedTemplate(null);
    if (templateInputRef.current) templateInputRef.current.value = '';
  };

  // Handle template preview
  const handleTemplatePreview = () => {
    setIsTemplatePreviewOpen(true);
  };

  return (
    <div className="flex h-full bg-transparent">
      {/* Sidebar */}
      <ChatSidebar
        chatSessions={chatSessions as any}
        currentSessionId={currentSessionId}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filteredSessions={filteredSessions as any}
        editingTitle={editingTitle}
        editingTitleValue={editingTitleValue}
        setEditingTitleValue={setEditingTitleValue}
        createNewChat={handleCreateNewChat}
        loadChatSession={handleLoadSession}
        deleteChatSession={deleteChatSession}
        handleStartRename={handleStartRename}
        handleCancelRename={handleCancelRename}
        handleSaveRename={handleSaveRename}
      />

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isPreviewVisible ? 'mr-0' : 'mr-0'}`}>
        {/* Chat Messages */}
        <ChatMessages
          messages={messages}
          isLoading={isLoading}
          messagesEndRef={messagesEndRef}
          onFileUpload={() => fileInputRef.current?.click()}
          onTemplateSelect={() => setIsTemplateSelectorOpen(true)}
        />

        {/* Input Area */}
        <ChatInput
          input={input}
          setInput={setInput}
          isLoading={isLoading}
          attachedFile={attachedFile}
          prdTemplate={prdTemplate}
          selectedTemplate={selectedTemplate}
          isAnalyzingTemplate={isAnalyzingTemplate}
          fileInputRef={fileInputRef}
          templateInputRef={templateInputRef}
          onSendMessage={handleSend}
          onKeyPress={handleKeyPress}
          onFileUpload={handleFileUploadWrapper}
          onTemplateUpload={handleTemplateUploadWrapper}
          onTemplateSelectorOpen={() => setIsTemplateSelectorOpen(true)}
          onGeneratePRD={handleGeneratePRD}
          onClearFile={handleClearFile}
          onClearTemplate={handleClearTemplate}
          onTemplatePreview={handleTemplatePreview}
          calculateProgress={calculateProgress}
        />
      </div>

      {/* Live PRD Preview Panel */}
      <div className={`transition-all duration-300 ${isPreviewVisible ? 'w-[600px]' : 'w-0'} flex-shrink-0`}>
        <LivePRDPreview
          content={livePreviewContent}
          isGenerating={isGeneratingPRD}
          onEdit={handleOpenEditModal}
          isVisible={isPreviewVisible}
          onToggleVisibility={handleTogglePreviewVisibility}
        />
      </div>

      {/* PRD Modal */}
      {isPRDModalOpen && (
        <RichTextEditorModal
          visible={isPRDModalOpen}
          initialContent={editablePRDContent}
          title="Product Requirements Document"
          onClose={() => setIsPRDModalOpen(false)}
          onDownloadPDF={async (finalContent: string) => {
            await generatePRDPDF(finalContent, 'Product Requirements Document');
            setIsPRDModalOpen(false);
            toast.success('PRD PDF generated and downloaded successfully!');
          }}
          onSaveToS3={async (finalContent: string) => {
            await generatePRDDOCX(finalContent, 'Product Requirements Document');
            setIsPRDModalOpen(false);
            toast.success('PRD DOCX generated and downloaded successfully!');
          }}
        />
      )}
      
      {/* Template Selector */}
      <TemplateSelector
        isOpen={isTemplateSelectorOpen}
        onClose={() => setIsTemplateSelectorOpen(false)}
        onTemplateSelect={handleTemplateSelectWrapper}
        onTemplateUpload={handleTemplateUploadFromSelector}
      />

      {/* Template Preview Modal */}
      <Dialog open={isTemplatePreviewOpen} onOpenChange={setIsTemplatePreviewOpen}>
        <DialogContent className="max-w-4xl h-4/5 overflow-hidden bg-[#0D1117] border-none flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-white text-sm font-light">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  TEMPLATE PREVIEW
                </div>
              </DialogTitle>
            </div>
            <div className="border-b border-[#23272F] w-full mb-4 mt-4" />
          </DialogHeader>
          
          {selectedTemplate && (
            <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
              <div className="space-y-2">
                <h3 className="text-white text-2xl font-light">{selectedTemplate.name}</h3>
                <p className="text-[#8B949E] text-sm">{selectedTemplate.description}</p>
                {selectedTemplate.tags && (
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.tags.map((tag: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs text-[#C9D1D9] border-white">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="border-b border-[#23272F]" />
              
              <ScrollArea className="flex-1">
                <div className="bg-[#181D23] rounded-lg p-6">
                  <pre className="text-[#C9D1D9] text-sm whitespace-pre-wrap font-mono">
                    {selectedTemplate.content}
                  </pre>
                </div>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
