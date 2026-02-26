import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { 
  addUserMessage as apiAddUserMessage, 
  addBotMessage as apiAddBotMessage, 
  updateConversationState as apiUpdateConversationState,
  updateUploadedData as apiUpdateUploadedData
} from '@/utils/prdChatApi';
import { Message, ConversationState } from '../types';
import { 
  analyzeUploadedFile, 
  generateNextQuestion, 
  generateComprehensivePRD, 
  generatePRDFromTemplate,
  analyzePRDTemplate,
  generateComprehensivePRDStream,
  generatePRDFromTemplateStream
} from '../utils/analysisUtils';
import { readFileContent, cleanAndStructureRTF } from '../utils/fileUtils';

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

export const useMessages = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationState, setConversationState] = useState<ConversationState>({
    questionsAsked: [],
    aspectQuestionCounts: {}
  });
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [prdTemplate, setPrdTemplate] = useState<File | null>(null);
  const [prdTemplateContent, setPrdTemplateContent] = useState<string>('');
  const [templateAnalysis, setTemplateAnalysis] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isAnalyzingTemplate, setIsAnalyzingTemplate] = useState(false);
  const [isPRDModalOpen, setIsPRDModalOpen] = useState(false);
  const [editablePRDContent, setEditablePRDContent] = useState('');
  const [livePreviewContent, setLivePreviewContent] = useState('');
  const [isGeneratingPRD, setIsGeneratingPRD] = useState(false);
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, currentSessionId: string | null) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'text/plain', 'text/markdown', 'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.md') && !file.name.endsWith('.txt')) {
      toast.error('Please upload a text file (.txt, .md, .doc, .docx, or .pdf)');
      return;
    }

    try {
      const content = await readFileContent(file);
      setAttachedFile(file);
      setFileContent(content);
      
      // Save file data to MongoDB
      if (currentSessionId) {
        await apiUpdateUploadedData(currentSessionId, {
          uploadedFile: {
            fileName: file.name,
            fileType: file.type
          }
        });
      }
      
      toast.success(`File "${file.name}" uploaded successfully`);
    } catch (error) {
      toast.error('Failed to read file content');
      console.error('File read error:', error);
    }
  };

  const handleTemplateUpload = async (event: React.ChangeEvent<HTMLInputElement>, currentSessionId: string | null) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'text/plain', 'text/markdown', 'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.md') && !file.name.endsWith('.txt')) {
      toast.error('Please upload a PRD template file (.txt, .md, .doc, .docx, or .pdf)');
      return;
    }

    try {
      setIsAnalyzingTemplate(true);
      const rawContent = await readFileContent(file);
      
      // Clean RTF and markup formatting from the content
      const cleanedContent = cleanAndStructureRTF(rawContent);
      
      setPrdTemplate(file);
      setPrdTemplateContent(cleanedContent);
      
      // Analyze the cleaned template
      const analysis = await analyzePRDTemplate(cleanedContent, file.name);
      setTemplateAnalysis(analysis);
      
      // Save template data to MongoDB
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
        const newMessage: Message = {
          id: Date.now().toString(),
          type: 'bot',
          content: successMessage,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, newMessage]);
      }
      
      toast.success(`PRD template "${file.name}" uploaded, cleaned, and analyzed successfully`);
    } catch (error) {
      toast.error('Failed to read, clean, or analyze template file');
      console.error('Template file error:', error);
    } finally {
      setIsAnalyzingTemplate(false);
    }
  };

  const handleTemplateSelect = async (template: any, currentSessionId: string | null) => {
    try {
      setIsAnalyzingTemplate(true);
      setSelectedTemplate(template);
      
      // Analyze the selected template
      const analysis = await analyzePRDTemplate(template.content, template.name);
      setTemplateAnalysis(analysis);
      
      // Also set the template content for consistency
      setPrdTemplateContent(template.content);
      
      // Save template data to MongoDB
      if (currentSessionId) {
        await apiUpdateUploadedData(currentSessionId, {
          uploadedTemplate: {
            fileName: template.name,
            fileType: 'template'
          }
        });
      }
      
      // Generate success message with analysis summary
      const successMessage = generateTemplateAnalysisSuccessMessage(template.name, analysis);
      
      // Add the success message to chat
      if (currentSessionId) {
        await apiAddBotMessage(currentSessionId, successMessage);
        
        // Update local messages state
        const newMessage: Message = {
          id: Date.now().toString(),
          type: 'bot',
          content: successMessage,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, newMessage]);
      }
      
      toast.success(`Template "${template.name}" selected and analyzed successfully`);
    } catch (error) {
      toast.error('Failed to analyze selected template');
      console.error('Template analysis error:', error);
    } finally {
      setIsAnalyzingTemplate(false);
    }
  };

  const handleSendMessage = async (input: string, currentSessionId: string | null) => {
    if (!input.trim() && !attachedFile) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
      fileAttachment: attachedFile ? {
        name: attachedFile.name,
        content: fileContent
      } : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Persist user message to backend (ignore errors silently)
      if (currentSessionId && userMessage.content.trim()) {
        try {
          await apiAddUserMessage(currentSessionId, userMessage.content.trim());
        } catch (err) {
          console.warn('Failed to persist user message:', err);
        }
      }

      let botResponse = '';
      const updatedMessages = [...messages, userMessage];

      // If file was attached, analyze it first
      if (attachedFile && fileContent) {
        const fileAnalysis = await analyzeUploadedFile(fileContent, attachedFile.name);
        botResponse = `I've analyzed your uploaded file "${attachedFile.name}". Here's what I found:\n\n${fileAnalysis}\n\nBased on this analysis, let me ask you some follow-up questions to complete your PRD.`;
        // Clear file attachment after processing
        setAttachedFile(null);
        setFileContent('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        // Generate next question based on conversation
        botResponse = await generateNextQuestion(updatedMessages, conversationState, templateAnalysis);
      }

      // Check if all 24 questions (3 per 8 aspects) have been asked
      const aspects = [
        'Product vision and goals',
        'User needs and requirements',
        'Target users and use cases',
        'Key features and functionality',
        'Success metrics and KPIs',
        'Technical requirements',
        'Business constraints',
        'Timeline and priorities'
      ];
      // Calculate how many questions have been asked (including this one)
      const totalQuestions = aspects.reduce((sum, aspect) => sum + (conversationState.aspectQuestionCounts[aspect] || 0), 0) + 1;
      const closingText = 'Thank you for answering all the questions! We have now gathered all the information needed for your PRD. You can now generate and download your Product Requirements Document (PRD).';
      let isClosing = false;
      if (totalQuestions >= 24 && !messages.some(m => m.type === 'bot' && m.content === closingText)) {
        isClosing = true;
      }

      // If closing, only send the closing message as the last bot message and persist it
      if (isClosing) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: closingText,
          timestamp: new Date()
        }]);
        // Persist bot closing message
        if (currentSessionId) {
          try {
            await apiAddBotMessage(currentSessionId, closingText);
          } catch (err) {
            console.warn('Failed to persist bot message:', err);
          }
        }
      } else {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: botResponse,
          timestamp: new Date()
        }]);
        // Persist bot message
        if (currentSessionId) {
          try {
            // Determine current aspect being asked based on counts
            const aspects = [
              'Product vision and goals',
              'User needs and requirements',
              'Target users and use cases',
              'Key features and functionality',
              'Success metrics and KPIs',
              'Technical requirements',
              'Business constraints',
              'Timeline and priorities'
            ];
            const aspectToUpdate = aspects.find(a => (conversationState.aspectQuestionCounts[a] || 0) < 3);
            await apiAddBotMessage(currentSessionId, botResponse, aspectToUpdate);
          } catch (err) {
            console.warn('Failed to persist bot message:', err);
          }
        }
      }

      // Update conversation state
      const aspectToUpdate = aspects.find(aspect => (conversationState.aspectQuestionCounts[aspect] || 0) < 3);
      const newAspectCounts = { ...conversationState.aspectQuestionCounts };
      if (aspectToUpdate) {
        newAspectCounts[aspectToUpdate] = (newAspectCounts[aspectToUpdate] || 0) + 1;
      }
    
      const newConversationState = {
        ...conversationState,
        questionsAsked: [...conversationState.questionsAsked, botResponse],
        aspectQuestionCounts: newAspectCounts
      };
    
      setConversationState(newConversationState);
      
      // Save conversation state to MongoDB
      if (currentSessionId) {
        try {
          await apiUpdateConversationState(currentSessionId, newConversationState);
        } catch (err) {
          console.warn('Failed to update conversation state:', err);
        }
      }

    } catch (error) {
      console.error('Error processing message:', error);
      toast.error('Failed to process your message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePRD = async () => {
    if (messages.length < 4) {
      toast.error('Please have more conversation before generating the PRD');
      return;
    }
    
    // Show preview panel if hidden and clear previous content
    setIsPreviewVisible(true);
    setLivePreviewContent('');
    setIsGeneratingPRD(true);
    setIsLoading(true);
    
    let accumulatedContent = '';
    
    const onChunk = (chunk: string) => {
      accumulatedContent += chunk;
      setLivePreviewContent(accumulatedContent);
    };
    
    const onComplete = () => {
      setIsGeneratingPRD(false);
      setIsLoading(false);
      setEditablePRDContent(accumulatedContent);
      toast.success('PRD generated successfully!');
    };
    
    const onError = (error: Error) => {
      console.error('PRD generation error:', error);
      setIsGeneratingPRD(false);
      setIsLoading(false);
      toast.error('Failed to generate PRD. Please try again.');
    };
    
    try {
      // Choose the appropriate PRD generation method based on whether a template is uploaded
      // If a template is uploaded and analyzed, use template-based generation
      // Otherwise, use standard generation from scratch
      if (prdTemplate && templateAnalysis) {
        await generatePRDFromTemplateStream(
          messages, 
          prdTemplateContent, 
          templateAnalysis,
          onChunk,
          onComplete,
          onError
        );
      } else {
        await generateComprehensivePRDStream(
          messages, 
          selectedTemplate,
          onChunk,
          onComplete,
          onError
        );
      }
    } catch (error) {
      onError(error as Error);
    }
  };
  
  const handleTogglePreviewVisibility = () => {
    setIsPreviewVisible(!isPreviewVisible);
  };
  
  const handleOpenEditModal = () => {
    setIsPRDModalOpen(true);
  };

  const calculateProgress = (): number => {
    const aspects = [
      'Product vision and goals',
      'User needs and requirements',
      'Target users and use cases',
      'Key features and functionality',
      'Success metrics and KPIs',
      'Technical requirements',
      'Business constraints',
      'Timeline and priorities'
    ];
    const completedAspects = aspects.filter(
      aspect => (conversationState.aspectQuestionCounts[aspect] || 0) >= 3
    ).length;
    return Math.min(completedAspects * 12.5, 100);
  };

  return {
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
  };
};
