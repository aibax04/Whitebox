import { useState, useEffect, useCallback, useRef } from "react";
import { MessageCircle, X, Send, Loader2, Bot, User, Sparkles, Github, Zap, Minimize2, Maximize2, FileSearch, Upload, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { analyzeRepositoryContext, processUserMessage } from "@/utils/aiUtils/chatbotAnalysis";
import { FaGithub } from "react-icons/fa";

interface FileData {
  path: string;
  content: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

interface RepositoryContext {
  summary: string;
  techStack: string[];
  keyFeatures: string[];
  architecture: string;
  businessValue: string;
  fileMap: Record<string, any>;
  totalFiles: number;
  analyzedAt: Date;
}

interface UploadedDocument {
  _id?: string;
  fileName: string;
  fileType: 'business_requirement' | 'technical_overview' | 'code_completeness' | 'product_requirement' | 'other';
  content: string;
  analysis?: string;
  uploadedAt: Date;
}

interface SquadBotProps {
  repoFiles?: FileData[] | null;
  repoUrl?: string | null;
  fileContent?: string | null;
  fileName?: string | null;
}

export default function SquadBot({
  repoFiles,
  repoUrl,
  fileContent,
  fileName
}: SquadBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [repositoryContext, setRepositoryContext] = useState<RepositoryContext | null>(null);
  const [isAnalyzingRepo, setIsAnalyzingRepo] = useState(false);
  const [repoAnalyzed, setRepoAnalyzed] = useState(false);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [showDocumentPanel, setShowDocumentPanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasRepoData = repoFiles && repoFiles.length > 0;
  const hasAnyData = hasRepoData || fileContent;
  
  // Only show the chatbot if repository files are loaded or we have individual file content
  const shouldShowChatbot = hasAnyData && (hasRepoData ? repoAnalyzed : true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Analyze repository when files are loaded
  useEffect(() => {
    const analyzeRepository = async () => {
      if (!hasRepoData || !repoUrl || repoAnalyzed || isAnalyzingRepo) return;
      
      setIsAnalyzingRepo(true);
      try {
        // console.log(`Starting deep analysis of ${repoFiles.length} files...`);
        const context = await analyzeRepositoryContext(repoFiles, repoUrl);
        setRepositoryContext(context);
        setRepoAnalyzed(true);
        toast.success(`SquadBot has deeply analyzed all ${context.totalFiles} files and is ready to answer detailed questions!`);
      } catch (error) {
        console.error("Failed to analyze repository:", error);
        toast.error("Failed to analyze repository for SquadBot");
      } finally {
        setIsAnalyzingRepo(false);
      }
    };

    analyzeRepository();
  }, [hasRepoData, repoUrl, repoAnalyzed, isAnalyzingRepo, repoFiles]);

  // Reset state when repository changes
  useEffect(() => {
    if (repoUrl) {
      setRepoAnalyzed(false);
      setRepositoryContext(null);
      setMessages([]);
    }
  }, [repoUrl]);

  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    const allowedTypes = ['text/plain', 'application/pdf', 'text/markdown', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(txt|md|pdf|doc|docx)$/i)) {
      toast.error('Please upload a text, markdown, or PDF document');
      return;
    }

    setIsUploadingDoc(true);
    try {
      const content = await readFileContent(file);
      
      // Detect document type from filename or let user specify
      const fileType = detectDocumentType(file.name);
      
      const newDocument: UploadedDocument = {
        fileName: file.name,
        fileType,
        content,
        uploadedAt: new Date()
      };

      setDocuments(prev => [...prev, newDocument]);
      toast.success(`Document "${file.name}" uploaded successfully!`);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const detectDocumentType = (fileName: string): UploadedDocument['fileType'] => {
    const lowerName = fileName.toLowerCase();
    if (lowerName.includes('brd') || lowerName.includes('business') || lowerName.includes('requirement')) {
      return 'business_requirement';
    } else if (lowerName.includes('tech') || lowerName.includes('architecture')) {
      return 'technical_overview';
    } else if (lowerName.includes('prd') || lowerName.includes('product')) {
      return 'product_requirement';
    } else if (lowerName.includes('completeness') || lowerName.includes('checklist')) {
      return 'code_completeness';
    }
    return 'other';
  };

  const handleRemoveDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
    toast.success('Document removed');
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      let response: string;

      if (hasRepoData && repositoryContext) {
        // Use repository context for smarter responses
        const conversationHistory = messages.map(msg => ({
          content: msg.content,
          type: msg.type
        }));
        
        response = await processUserMessage(
          userMessage.content,
          repositoryContext,
          repoUrl || "",
          conversationHistory,
          documents
        );
      } else if (fileContent) {
        // Fallback for single file analysis
        response = `I can see you've loaded a file (${fileName}). While I work best with full repositories, I can help you understand this file. What would you like to know about it?`;
      } else {
        response = "I don't have any code or repository data to analyze. Please load a repository or file first, and I'll be happy to help!";
      }

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("SquadBot error:", error);
      toast.error("SquadBot encountered an error. Please try again.");
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: "I apologize, but I encountered an error while processing your message. Please try again.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Enhanced quick action suggestions
  const quickActions = [
    "Show me the main components",
    "Explain the file structure",
    "What utility functions exist?",
    "How does authentication work?",
    "Show me the API endpoints"
  ];

  const handleQuickAction = (action: string) => {
    setInputMessage(action);
    textareaRef.current?.focus();
  };

  // Show enhanced loading indicator while analyzing repository
  if (hasRepoData && isAnalyzingRepo) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <div className="bg-squadrun-darker border border-squadrun-primary/20 rounded-lg p-4 shadow-lg max-w-sm">
          <div className="flex items-center gap-3 text-squadrun-primary mb-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">Analyzing Repository...</span>
          </div>
          <div className="text-xs text-squadrun-gray">
            <div className="flex items-center gap-2 mb-1">
              <FileSearch className="w-3 h-3" />
              Analyzing {repoFiles?.length || 0} files...
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-3 h-3" />
              This may take a few moments, please wait...
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Don't show chatbot until conditions are met
  if (!shouldShowChatbot) {
    return null;
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 rounded-full bg-gradient-to-r from-squadrun-primary to-purple-500 hover:from-squadrun-primary/80 hover:to-purple-500/80 shadow-xl hover:shadow-2xl transition-all duration-300 group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-squadrun-primary/20 to-squadrun-darker/80 rounded-full"></div>
          <div className="relative flex items-center justify-center">
            {/* <Sparkles className="w-6 h-6 absolute animate-ping" /> */}
            <Bot className="w-7 h-7 group-hover:scale-110 transition-transform duration-200" />
          </div>
        </Button>
        <div className="absolute -top-16 right-0 bg-squadrun-darker border border-squadrun-primary/20 text-squadrun-gray text-sm px-3 py-2 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-squadrun-primary" />
            Ask about any file
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${
      isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
    }`}>
      <Card className="h-full bg-transparent border-squadrun-primary/20 shadow-2xl flex flex-col">
        <CardHeader className="bg-[#1e284f] border-b border-squadrun-primary/20 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white">
              <div className="relative">
                <Bot className="w-5 h-5 text-squadrun-primary" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              <div>
                <span className="bg-gradient-to-r from-squadrun-primary to-purple-400 bg-clip-text text-white font-bold text-base">
                  SquadBot
                </span>
                <div className="text-sm text-squadrun-gray font-normal">
                  AI Assistant
                </div>
              </div>
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-squadrun-gray hover:text-white hover:bg-squadrun-primary/10 h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
          {repoUrl && repositoryContext && !isMinimized && (
            <div className="flex items-center gap-2 mt-1">
              <FaGithub className="w-3 h-3 text-squadrun-gray" />
              <p className="text-xs text-squadrun-gray truncate flex-1">
                {repoUrl}
              </p>
              <Badge variant="outline" className="text-xs bg-squadrun-primary/50 text-white border-squadrun-primary/30 px-1 py-0">
                {repositoryContext.totalFiles} files
              </Badge>
              {documents.length > 0 && (
                <Badge variant="outline" className="text-xs bg-purple-500/50 text-white border-purple-500/30 px-1 py-0">
                  {documents.length} doc{documents.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          )}
        </CardHeader>
        
        {!isMinimized && (
          <CardContent className="flex bg-squadrun-darker flex-col flex-1 p-4 min-h-0 gap-4">
            {/* Document Upload Panel */}
            {showDocumentPanel && (
              <div className="bg-squadrun-dark border border-squadrun-primary/20 rounded-lg p-3 mb-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-white flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Uploaded Documents ({documents.length})
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDocumentPanel(false)}
                    className="h-6 w-6 p-0 text-squadrun-gray hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {documents.length === 0 ? (
                    <p className="text-xs text-squadrun-gray">No documents uploaded yet</p>
                  ) : (
                    documents.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between bg-squadrun-darker p-2 rounded text-xs">
                        <div className="flex-1 min-w-0">
                          <p className="text-white truncate">{doc.fileName}</p>
                          <p className="text-squadrun-gray text-[10px]">{doc.fileType.replace(/_/g, ' ')}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDocument(index)}
                          className="h-6 w-6 p-0 text-squadrun-gray hover:text-red-400 ml-2"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            
            <ScrollArea className="flex-1 pr-2">
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="text-center text-squadrun-darker py-6">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center">
                      <FileSearch className="w-8 h-8 text-squadrun-primary" />
                    </div>
                    <h3 className="font-semibold text-white mb-3 text-base">Repository Expert Ready!</h3>
                    <p className="text-sm mb-4 text-white leading-relaxed">
                      {repositoryContext 
                        ? `I've analyzed all ${repositoryContext.totalFiles} files in your repository${documents.length > 0 ? ` and ${documents.length} uploaded document${documents.length > 1 ? 's' : ''}` : ''}. Ask me about any specific file, function, component, or implementation detail!`
                        : `I'm your intelligent code assistant, ready to help with your development questions.`
                      }
                    </p>
                    {repositoryContext && (
                      <div className="space-y-3 text-sm">
                        <div className="grid grid-cols-1 gap-2 mt-4">
                          {quickActions.slice(0, 4).map((action, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuickAction(action)}
                              className="text-xs bg-squadrun-dark/50 border-squadrun-primary/30 text-squadrun-gray hover:bg-squadrun-primary/10 hover:text-white h-8"
                            >
                              {action}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.type === 'bot' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-squadrun-primary/20 to-purple-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                        <Bot className="w-4 h-4 text-squadrun-primary" />
                      </div>
                    )}
                    
                    <div className={`max-w-[85%] ${message.type === 'user' ? 'order-first' : ''}`}>
                      <div
                        className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${
                          message.type === 'user'
                            ? 'bg-gradient-to-r from-squadrun-primary to-purple-500 text-white'
                            : 'bg-squadrun-dark border border-squadrun-primary/20 text-squadrun-gray'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-2 px-1">
                        <span className="text-xs text-squadrun-gray/60">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    
                    {message.type === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                        <User className="w-4 h-4 text-blue-400" />
                      </div>
                    )}
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-squadrun-primary/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <Loader2 className="w-4 h-4 text-squadrun-primary animate-spin" />
                    </div>
                    <div className="bg-squadrun-dark border border-squadrun-primary/20 text-squadrun-gray rounded-xl px-4 py-3 text-sm">
                      <div className="flex items-center gap-3">
                        <span>Thinking</span>
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-squadrun-primary rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                          <div className="w-2 h-2 bg-squadrun-primary rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                          <div className="w-2 h-2 bg-squadrun-primary rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            
            <div className="flex flex-col gap-2 flex-shrink-0">
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.pdf,.doc,.docx"
                  onChange={handleDocumentUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingDoc}
                  className="bg-squadrun-dark border-squadrun-primary/30 text-squadrun-gray hover:text-white hover:bg-squadrun-primary/10 h-8 px-2 text-xs"
                >
                  {isUploadingDoc ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Upload className="w-3 h-3 mr-1" />
                  )}
                  Upload Doc
                </Button>
                {documents.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDocumentPanel(!showDocumentPanel)}
                    className="bg-squadrun-dark border-squadrun-primary/30 text-squadrun-gray hover:text-white hover:bg-squadrun-primary/10 h-8 px-2 text-xs"
                  >
                    <FileText className="w-3 h-3 mr-1" />
                    {documents.length} Doc{documents.length > 1 ? 's' : ''}
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                <Textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about any file, function, or implementation detail..."
                  className="resize-none bg-squadrun-dark border border-none text-white placeholder-squadrun-gray/70 focus:border-none transition-colors text-sm min-h-[44px] max-h-[100px]"
                  rows={2}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="bg-gradient-to-r from-squadrun-primary to-purple-500 hover:from-squadrun-primary/80 hover:to-purple-500/80 self-end h-11 w-11 p-0 flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
