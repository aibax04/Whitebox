import React, { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, Send, Loader2, Bot, User, FileSearch, History, Trash2, Plus, Edit2, Check, X, FileCode, Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { GitHubRepo } from "@/types/github";
import RepositorySelection from "./InspectRepoSelector";
import { FaGithub } from "react-icons/fa";
import {
  generatePklFilename,
  ensureRepoEmbeddings,
  getFilesListFromEmbeddings,
  searchRepoCombined,
  getFileFromEmbeddings
} from '@/utils/repoEmbeddingApi';
import {
  createSquadBotChatSession,
  getSquadBotChatSession,
  getSquadBotChatSessionsByRepo,
  addSquadBotMessage,
  deleteSquadBotChatSession,
  updateSquadBotChatTitle,
  uploadDocumentToSession,
  getSessionDocuments,
  deleteSessionDocument,
  type SquadBotChatSession,
  type UploadedDocument
} from '@/utils/squadbotChatApi';

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  collectedFiles?: Array<{
    path: string;
    content: string;
    score: number;
  }>;
}

export default function SquadBotAgent() {
  const [selectedRepository, setSelectedRepository] = useState<GitHubRepo | null>(null);
  const [embeddingPklFile, setEmbeddingPklFile] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingEmbeddings, setLoadingEmbeddings] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [previousChats, setPreviousChats] = useState<SquadBotChatSession[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');
  const [viewingFile, setViewingFile] = useState<{ path: string; content: string } | null>(null);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [showDocumentPanel, setShowDocumentPanel] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [s3Documents, setS3Documents] = useState<Array<{_id: string, fileName: string, content: string | null, size?: number, lastModified?: Date}>>([]);
  const [loadingS3Docs, setLoadingS3Docs] = useState(false);
  const [uploadSource, setUploadSource] = useState<'local' | 's3' | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const loadingEmbeddingsRef = useRef<Set<string>>(new Set());
  const titleInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Map file extensions to SyntaxHighlighter language support
  const languageMap: Record<string, string> = {
    'py': 'python',
    'js': 'javascript',
    'ts': 'typescript',
    'jsx': 'jsx',
    'tsx': 'tsx',
    'html': 'html',
    'css': 'css',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'go': 'go',
    'rb': 'ruby',
    'rs': 'rust',
    'php': 'php',
    'sh': 'bash',
    'sql': 'sql',
    'json': 'json',
    'md': 'markdown',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
  };

  // Detect language from file path
  const detectLanguage = (filePath: string): string => {
    const extension = filePath.split('.').pop()?.toLowerCase() || '';
    return languageMap[extension] || 'text';
  };

  // Load persisted repository and embeddings on mount
  useEffect(() => {
    let isMounted = true;

    const loadPersistedRepo = async () => {
      try {
        const persistedRepo = localStorage.getItem('squadbot_repository');
        const persistedEmbeddings = localStorage.getItem('squadbot_embeddings');

        if (persistedEmbeddings) {
          setEmbeddingPklFile(persistedEmbeddings);
        }

        if (persistedRepo && isMounted) {
          const repo = JSON.parse(persistedRepo);
          if (!selectedRepository) {
            await handleRepositorySelect(repo);
          }
        }
      } catch (error) {
        console.error('Error loading persisted repository:', error);
        localStorage.removeItem('squadbot_repository');
        localStorage.removeItem('squadbot_embeddings');
      }
    };

    loadPersistedRepo();

    return () => {
      isMounted = false;
    };
  }, []);

  // Load previous chats for repository
  const loadPreviousChats = useCallback(async (repoUrl: string) => {
    if (!repoUrl) return;
    setLoadingChats(true);
    try {
      const chats = await getSquadBotChatSessionsByRepo(repoUrl);
      setPreviousChats(chats);
      console.log('Loaded previous chats:', chats.length);
    } catch (error) {
      console.error('Error loading previous chats:', error);
      toast.error('Failed to load previous chats');
    } finally {
      setLoadingChats(false);
    }
  }, []);

  // Load previous chats when repository changes
  useEffect(() => {
    if (selectedRepository?.html_url) {
      loadPreviousChats(selectedRepository.html_url);
    }
  }, [selectedRepository?.html_url, loadPreviousChats]);

  // Check for uploaded file content from localStorage
  useEffect(() => {
    const uploadedFolderData = localStorage.getItem('uploaded_folder_data');

    if (uploadedFolderData) {
      try {
        const folderData = JSON.parse(uploadedFolderData);
        localStorage.removeItem('uploaded_folder_data');

        const syntheticRepo: GitHubRepo = {
          id: Date.now(),
          name: folderData.projectName || 'Uploaded Project',
          full_name: `uploaded/project`,
          private: false,
          html_url: '',
          description: folderData.filteredOut > 0
            ? `Uploaded project folder with ${folderData.relevantFileCount} relevant code files (filtered out ${folderData.filteredOut} non-code files)`
            : `Uploaded project folder with ${folderData.relevantFileCount} files`,
          language: null,
          stargazers_count: 0,
          forks_count: 0,
          updated_at: new Date().toISOString(),
          repoFiles: folderData.files.map((file: any) => ({
            path: file.path,
            type: 'blob',
            size: file.content.length,
            content: file.content,
            selected: false
          })),
          firstFileContent: folderData.files[0]?.content || null,
          firstFileName: folderData.files[0]?.name || null,
          isUploadedFolder: true
        };

        setSelectedRepository(syntheticRepo);
        return;
      } catch (error) {
        console.error('Error parsing uploaded folder data:', error);
        localStorage.removeItem('uploaded_folder_data');
      }
    }

    const uploadedContent = localStorage.getItem('uploaded_file_content');
    const uploadedFileName = localStorage.getItem('uploaded_file_name');

    if (uploadedContent && uploadedFileName) {
      localStorage.removeItem('uploaded_file_content');
      localStorage.removeItem('uploaded_file_name');

      const syntheticRepo: GitHubRepo = {
        id: Date.now(),
        name: uploadedFileName,
        full_name: `uploaded/${uploadedFileName}`,
        private: false,
        html_url: '',
        description: `Uploaded file: ${uploadedFileName}`,
        language: null,
        stargazers_count: 0,
        forks_count: 0,
        updated_at: new Date().toISOString(),
        repoFiles: [{
          path: uploadedFileName,
          type: 'file',
          content: uploadedContent,
          selected: false
        }],
        firstFileContent: uploadedContent,
        firstFileName: uploadedFileName
      };

      setSelectedRepository(syntheticRepo);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Generate session ID from repo URL
  const generateSessionId = (repoUrl: string): string => {
    if (!repoUrl) return `squadbot-${Date.now()}`;
    const urlHash = btoa(repoUrl).replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
    return `squadbot-${urlHash}-${Date.now()}`;
  };

  // Load a specific chat session
  const loadChatSession = async (sessionId: string) => {
    try {
      const session = await getSquadBotChatSession(sessionId);
      if (session) {
        setCurrentSessionId(session.sessionId);
        setMessages(session.messages.map((msg, idx) => ({
          id: msg._id || `msg-${idx}`,
          type: msg.sender as 'user' | 'bot',
          content: msg.content,
          timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
        })));
        
        // Load documents for this session
        try {
          const sessionDocs = await getSessionDocuments(sessionId);
          setDocuments(sessionDocs);
        } catch (docError) {
          console.error('Error loading documents:', docError);
          // Continue without documents
          setDocuments([]);
        }
        
        toast.success('Chat session loaded');
      }
    } catch (error) {
      console.error('Error loading chat session:', error);
      toast.error('Failed to load chat session');
    }
  };

  // Create or get existing chat session
  const initializeChatSession = async (repo: GitHubRepo, pklFilename: string | null) => {
    const repoUrl = repo.html_url || '';
    if (!repoUrl) return null;

    try {
      // Try to find existing sessions for this repo first
      const existingChats = await getSquadBotChatSessionsByRepo(repoUrl);

      // If there are existing chats, load the most recent one
      if (existingChats.length > 0) {
        const latestSession = existingChats[0];
        setCurrentSessionId(latestSession.sessionId);
        await loadChatSession(latestSession.sessionId);
        console.log('Loaded existing chat session:', latestSession.sessionId);
        return latestSession.sessionId;
      }

      // No existing session, create a new one
      const sessionId = generateSessionId(repoUrl);
      const session = await createSquadBotChatSession(
        sessionId,
        repoUrl,
        repo.full_name || repo.name || 'Unknown',
        pklFilename,
        `Chat with ${repo.full_name || repo.name || 'repository'}`
      );

      setCurrentSessionId(session.sessionId);
      setMessages([]);
      setDocuments([]); // Reset documents for new session

      // Reload previous chats
      await loadPreviousChats(repoUrl);

      console.log('Created new chat session:', session.sessionId);
      return session.sessionId;
    } catch (error: any) {
      console.error('Error initializing chat session:', error);
      // Try to continue without session persistence
      toast.error('Failed to initialize chat session, continuing without persistence');
      return null;
    }
  };

  const handleRepositorySelect = async (repo: GitHubRepo) => {
    setSelectedRepository(repo);
    setLoadingEmbeddings(true);
    setMessages([]);
    setCurrentSessionId(null);
    toast.loading('Loading repository and embeddings...', { id: 'squadbot-repo-loading' });

    try {
      let pklFilename: string | null = null;
      const repoUrl = repo.html_url;

      // Check for embeddings if we have a GitHub URL
      if (repoUrl && !repo.isUploadedFolder) {
        try {
          const githubRegex = /github\.com\/([^\/]+)\/([^\/]+)/;
          const matches = repoUrl.match(githubRegex);

          if (matches) {
            const owner = matches[1];
            const repoName = matches[2].replace('.git', '');
            pklFilename = generatePklFilename(owner, repoName);

            if (loadingEmbeddingsRef.current.has(pklFilename)) {
              console.log('Already loading embeddings for this repo');
              await new Promise(resolve => setTimeout(resolve, 500));
            } else {
              loadingEmbeddingsRef.current.add(pklFilename);

              const token = localStorage.getItem('token');
              try {
                toast.loading('Checking embeddings...', { id: 'squadbot-repo-loading' });

                const embeddingResult = await ensureRepoEmbeddings(
                  repoUrl,
                  pklFilename,
                  true, // auto-generate if missing
                  token || undefined
                );

                if (embeddingResult.generated) {
                  toast.success(`Generated embeddings for ${embeddingResult.fileCount} files`, { id: 'squadbot-repo-loading' });
                }

                setEmbeddingPklFile(pklFilename);

                // Persist embeddings filename to localStorage
                try {
                  localStorage.setItem('squadbot_embeddings', pklFilename);
                } catch (storageError) {
                  console.error('Error persisting embeddings to localStorage:', storageError);
                }
              } catch (embeddingError) {
                console.warn('Error ensuring/loading embeddings:', embeddingError);
                toast.error('Failed to load embeddings', { id: 'squadbot-repo-loading' });
                pklFilename = null;
              } finally {
                loadingEmbeddingsRef.current.delete(pklFilename);
              }
            }
          }
        } catch (embeddingError) {
          console.warn('Error checking/loading embeddings:', embeddingError);
        }
      }

      // Initialize chat session
      await initializeChatSession(repo, pklFilename);

      // Load previous chats for this repository (ensure it's called even if initializeChatSession fails)
      if (repoUrl) {
        await loadPreviousChats(repoUrl);
      }

      // Persist repository to localStorage
      try {
        localStorage.setItem('squadbot_repository', JSON.stringify(repo));
      } catch (storageError) {
        console.error('Error persisting repository to localStorage:', storageError);
      }

      toast.success('Repository loaded successfully! You can now ask questions about it.', { id: 'squadbot-repo-loading' });
    } catch (error) {
      console.error('Error loading repository:', error);
      toast.error('Failed to load repository', { id: 'squadbot-repo-loading' });
    } finally {
      setLoadingEmbeddings(false);
    }
  };

  const handleNewChat = async () => {
    if (!selectedRepository) return;

    try {
      const repoUrl = selectedRepository.html_url || '';
      if (repoUrl) {
        const sessionId = generateSessionId(repoUrl);
        const session = await createSquadBotChatSession(
          sessionId,
          repoUrl,
          selectedRepository.full_name || selectedRepository.name || 'Unknown',
          embeddingPklFile,
          `New Chat - ${new Date().toLocaleDateString()}`
        );
        setCurrentSessionId(session.sessionId);
        setMessages([]);
        setDocuments([]); // Reset documents for new chat
        await loadPreviousChats(repoUrl);
        toast.success('New chat started');
      }
    } catch (error) {
      console.error('Error creating new chat:', error);
      toast.error('Failed to create new chat');
    }
  };

  const handleStartRename = (chat: SquadBotChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(chat.sessionId);
    setEditingTitle(chat.title || 'Untitled Chat');
    setTimeout(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }, 0);
  };

  const handleCancelRename = () => {
    setEditingChatId(null);
    setEditingTitle('');
  };

  const handleSaveRename = async (chat: SquadBotChatSession) => {
    if (!editingTitle.trim()) {
      toast.error('Title cannot be empty');
      return;
    }

    try {
      await updateSquadBotChatTitle(chat.sessionId, editingTitle.trim());
      setPreviousChats(prev =>
        prev.map(c =>
          c.sessionId === chat.sessionId
            ? { ...c, title: editingTitle.trim() }
            : c
        )
      );
      setEditingChatId(null);
      setEditingTitle('');
      toast.success('Chat title updated');
    } catch (error) {
      console.error('Error updating chat title:', error);
      toast.error('Failed to update chat title');
    }
  };

  const handleBackToRepositorySelection = () => {
    setSelectedRepository(null);
    setEmbeddingPklFile(null);
    setMessages([]);
    setCurrentSessionId(null);
    setPreviousChats([]);
    setDocuments([]);
    loadingEmbeddingsRef.current.clear();
    try {
      localStorage.removeItem('squadbot_repository');
      localStorage.removeItem('squadbot_embeddings');
    } catch (error) {
      console.error('Error clearing persisted repository:', error);
    }
  };

  // Load S3 documents
  const loadS3Documents = async () => {
    setLoadingS3Docs(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/s3-documents', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch S3 documents');
      }

      const docs = await response.json();
      setS3Documents(docs);
    } catch (error) {
      console.error('Error loading S3 documents:', error);
      toast.error('Failed to load documents from S3');
    } finally {
      setLoadingS3Docs(false);
    }
  };

  // Handle upload dialog open
  const handleUploadDocClick = () => {
    if (!currentSessionId) {
      toast.error('Please create or load a chat session first');
      return;
    }
    setShowUploadDialog(true);
    setUploadSource(null);
    // Load S3 documents when dialog opens
    loadS3Documents();
  };

  // Handle local file upload
  const handleLocalFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!currentSessionId) {
      toast.error('Please create or load a chat session first');
      return;
    }

    // Check file type
    const allowedTypes = ['text/plain', 'application/pdf', 'text/markdown', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(txt|md|pdf|doc|docx)$/i)) {
      toast.error('Please upload a text, markdown, or PDF document');
      return;
    }

    setIsUploadingDoc(true);
    try {
      const content = await readFileContent(file);
      
      // Detect document type from filename
      const fileType = detectDocumentType(file.name);
      
      // Upload to backend
      const updatedSession = await uploadDocumentToSession(
        currentSessionId,
        file.name,
        fileType,
        content
      );

      // Update local state with documents from response
      if (updatedSession.documents) {
        setDocuments(updatedSession.documents);
      }
      
      toast.success(`Document "${file.name}" uploaded successfully!`);
      setShowUploadDialog(false);
      
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

  // Handle S3 document selection
  const handleSelectS3Document = async (doc: typeof s3Documents[0]) => {
    if (!currentSessionId) {
      toast.error('Please create or load a chat session first');
      return;
    }

    if (!doc.content || doc.content === '[Binary file - content not readable]') {
      toast.error('Cannot read document content. Please try another document.');
      return;
    }

    setIsUploadingDoc(true);
    try {
      // Detect document type from filename
      const fileType = detectDocumentType(doc.fileName);
      
      // Upload to backend
      const updatedSession = await uploadDocumentToSession(
        currentSessionId,
        doc.fileName,
        fileType,
        doc.content
      );

      // Update local state with documents from response
      if (updatedSession.documents) {
        setDocuments(updatedSession.documents);
      }
      
      toast.success(`Document "${doc.fileName}" added successfully!`);
      setShowUploadDialog(false);
    } catch (error) {
      console.error('Error adding S3 document:', error);
      toast.error('Failed to add document');
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

  const handleRemoveDocument = async (documentId: string) => {
    if (!currentSessionId) return;
    
    try {
      await deleteSessionDocument(currentSessionId, documentId);
      setDocuments(prev => prev.filter(doc => doc._id !== documentId));
      toast.success('Document removed');
    } catch (error) {
      console.error('Error removing document:', error);
      toast.error('Failed to remove document');
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    if (!selectedRepository) {
      toast.error('Please select a repository first');
      return;
    }

    if (!embeddingPklFile && selectedRepository.html_url && !selectedRepository.isUploadedFolder) {
      toast.error('Embeddings not loaded. Please wait for the repository to finish loading.');
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    // Save user message to chat session
    if (currentSessionId) {
      try {
        await addSquadBotMessage(currentSessionId, userMessage.content, 'user');
      } catch (error) {
        console.error('Error saving user message:', error);
      }
    }

    try {
      let response: string;

      if (embeddingPklFile && selectedRepository.html_url && !selectedRepository.isUploadedFolder) {
        // Use vector and keyword search from embeddings
        const token = localStorage.getItem('token');

        try {
          // Perform combined search (vector + keyword)
          const searchResults = await searchRepoCombined(
            embeddingPklFile,
            inputMessage.trim(), // Use as vector query
            inputMessage.trim(), // Use as keyword search
            10, // topK
            0.7, // vectorWeight
            token || undefined
          );

          if (searchResults.success && searchResults.results && searchResults.results.length > 0) {
            // Get full content for the top results
            const topResults = searchResults.results.slice(0, 5);
            const filesWithContent = await Promise.all(
              topResults.map(async (result) => {
                try {
                  const fileResult = await getFileFromEmbeddings(
                    embeddingPklFile!,
                    result.path,
                    token || undefined
                  );
                  return {
                    path: result.path,
                    content: fileResult.file.content,
                    score: result.combined_score || result.score || result.distance || 0
                  };
                } catch (error) {
                  console.warn(`Failed to load content for ${result.path}:`, error);
                  return {
                    path: result.path,
                    content: result.content || '',
                    score: result.combined_score || result.score || result.distance || 0
                  };
                }
              })
            );

            // Format context for Gemini - truncate each file to max 8000 chars to prevent token limit issues
            const contextData = filesWithContent
              .map(file => {
                const truncatedContent = file.content && file.content.length > 8000
                  ? file.content.substring(0, 8000) + '\n... [content truncated]'
                  : file.content || '';
                return `FILE: ${file.path}\nCONTENT:\n${truncatedContent}\n---`;
              })
              .join('\n\n');

            // Send to Gemini API
            response = await sendToGemini(inputMessage.trim(), contextData, selectedRepository.html_url || '');

            // Store collected files with the bot message
            const botMessage: ChatMessage = {
              id: (Date.now() + 1).toString(),
              type: 'bot',
              content: response,
              timestamp: new Date(),
              collectedFiles: filesWithContent
            };

            setMessages(prev => [...prev, botMessage]);

            // Save bot message to chat session
            if (currentSessionId) {
              try {
                await addSquadBotMessage(currentSessionId, botMessage.content, 'bot');
              } catch (error) {
                console.error('Error saving bot message:', error);
              }
            }

            // Return early to skip the default message creation below
            setIsLoading(false);
            return;
          } else {
            response = "I couldn't find relevant code in the repository for your query. Could you try rephrasing your question?";
          }
        } catch (searchError: any) {
          console.error('Search error:', searchError);
          // Fallback: try to use repository files if available
          if (selectedRepository.repoFiles && selectedRepository.repoFiles.length > 0) {
            const filesForContext = selectedRepository.repoFiles.slice(0, 5);
            const contextData = filesForContext
              .map((file: any) => {
                const truncatedContent = file.content && file.content.length > 8000
                  ? file.content.substring(0, 8000) + '\n... [content truncated]'
                  : file.content || '';
                return `FILE: ${file.path}\nCONTENT:\n${truncatedContent}\n---`;
              })
              .join('\n\n');
            response = await sendToGemini(inputMessage.trim(), contextData, selectedRepository.html_url || '');

            // Store collected files
            const botMessage: ChatMessage = {
              id: (Date.now() + 1).toString(),
              type: 'bot',
              content: response,
              timestamp: new Date(),
              collectedFiles: filesForContext.map((file: any) => ({
                path: file.path,
                content: file.content,
                score: 0.5 // Default score for fallback files
              }))
            };
            setMessages(prev => [...prev, botMessage]);
            if (currentSessionId) {
              try {
                await addSquadBotMessage(currentSessionId, botMessage.content, 'bot');
              } catch (error) {
                console.error('Error saving bot message:', error);
              }
            }
            setIsLoading(false);
            return;
          } else {
            throw new Error(`Search failed: ${searchError?.message || 'Unable to search repository'}`);
          }
        }
      } else if (selectedRepository.repoFiles && selectedRepository.repoFiles.length > 0) {
        // Fallback: use repository files directly (for uploaded folders)
        const filesForContext = selectedRepository.repoFiles.slice(0, 10);
        const contextData = filesForContext
          .map((file: any) => {
            const truncatedContent = file.content && file.content.length > 8000
              ? file.content.substring(0, 8000) + '\n... [content truncated]'
              : file.content || '';
            return `FILE: ${file.path}\nCONTENT:\n${truncatedContent}\n---`;
          })
          .join('\n\n');

        response = await sendToGemini(inputMessage.trim(), contextData, selectedRepository.html_url || '');

        // Store collected files
        const botMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: response,
          timestamp: new Date(),
          collectedFiles: filesForContext.map((file: any) => ({
            path: file.path,
            content: file.content,
            score: 0.5 // Default score for fallback files
          }))
        };
        setMessages(prev => [...prev, botMessage]);
        if (currentSessionId) {
          try {
            await addSquadBotMessage(currentSessionId, botMessage.content, 'bot');
          } catch (error) {
            console.error('Error saving bot message:', error);
          }
        }
        setIsLoading(false);
        return;
      } else {
        response = "I don't have any code or repository data to analyze. Please load a repository first, and I'll be happy to help!";
      }

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);

      // Save bot message to chat session
      if (currentSessionId) {
        try {
          await addSquadBotMessage(currentSessionId, botMessage.content, 'bot');
        } catch (error) {
          console.error('Error saving bot message:', error);
        }
      }
    } catch (error: any) {
      console.error("SquadBot error:", error);
      const errorMsg = error?.message || "SquadBot encountered an error. Please try again.";
      toast.error(errorMsg);

      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: `I apologize, but I encountered an error: ${errorMsg}. Please try again or rephrase your question.`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);

      // Save error message to chat session
      if (currentSessionId) {
        try {
          await addSquadBotMessage(currentSessionId, errorMessage.content, 'bot');
        } catch (error) {
          console.error('Error saving error message:', error);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const sendToGemini = async (userQuery: string, contextData: string, repoUrl: string): Promise<string> => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Please sign in to use SquadBot');
    }

    const conversationHistory = messages.slice(-6).map(msg => ({
      content: msg.content,
      type: msg.type
    }));

    // Format documents for the API
    const documentsForApi = documents.map(doc => ({
      fileName: doc.fileName,
      fileType: doc.fileType,
      content: doc.content,
      analysis: doc.analysis
    }));

    const response = await fetch('/api/chatbot-analysis/process-message-with-context', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        userMessage: userQuery,
        contextData,
        repoUrl,
        conversationHistory,
        documents: documentsForApi
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Backend error:', errorData);
      throw new Error(errorData.error || errorData.message || 'Failed to process message');
    }

    const data = await response.json();
    return typeof data.content === 'string' ? data.content : 'I apologize, but I could not generate a response.';
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

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

  // Show repository selection if no repository is selected
  if (!selectedRepository) {
    return (
      <div className="p-4 h-full flex flex-col relative">
        <RepositorySelection
          onRepositorySelect={handleRepositorySelect}
        />
      </div>
    );
  }

  return (
    <div className="bg-[#010409] h-full flex flex-col relative">
      {/* Header */}
      <div className="bg-[#010409] h-14 flex items-center justify-between px-6 py-2">
        <div className="flex items-center gap-3">
          <FaGithub className="w-5 h-5 text-white" />
          <span className="text-white text-base">
            <span className="text-[#c9d1d9]">{selectedRepository.full_name.split('/')[0]}</span>
            <span> / </span>
            <span>{selectedRepository.full_name.split('/')[1]}</span>
          </span>
          {documents.length > 0 && (
            <Badge variant="outline" className="text-xs bg-purple-500/50 text-white border-purple-500/30 px-2 py-0">
              <FileText className="w-3 h-3 mr-1" />
              {documents.length} Doc{documents.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
          <button
            onClick={handleBackToRepositorySelection}
            className="text-squadrun-primary hover:text-white text-sm flex items-center gap-1"
          >
            ← Back to Repository Selection
          </button>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 flex flex-col mx-6 my-6 gap-4">
        {/* Previous Chats Sidebar */}
        {selectedRepository && previousChats.length > 0 && (
          <div className="bg-transparent border border-squadrun-primary/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-squadrun-primary" />
                <h3 className="text-sm font-semibold text-white">Your Chats</h3>
              </div>
              <div className="flex items-center gap-2">
                {selectedRepository.html_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNewChat}
                    className="text-xs text-squadrun-gray hover:text-white border border-none rounded-full"
                  >
                    <Plus className="w-4 h-4" />
                    New Chat
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    if (selectedRepository.html_url) {
                      await loadPreviousChats(selectedRepository.html_url);
                    }
                  }}
                  className="text-xs text-squadrun-gray hover:text-white border border-none rounded-full"
                >
                  Refresh
                </Button>
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {previousChats.map((chat) => (
                <div
                  key={chat.sessionId}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors min-w-[200px] ${currentSessionId === chat.sessionId
                    ? 'bg-squadrun-primary/20 border-squadrun-primary'
                    : 'bg-squadrun-dark border-squadrun-primary/20 hover:border-squadrun-primary/40'
                    }`}
                  onClick={() => {
                    if (editingChatId !== chat.sessionId) {
                      loadChatSession(chat.sessionId);
                    }
                  }}
                >
                  <div className="flex-1 min-w-0">
                    {editingChatId === chat.sessionId ? (
                      <input
                        ref={titleInputRef}
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveRename(chat);
                          } else if (e.key === 'Escape') {
                            handleCancelRename();
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full px-2 py-1 text-xs font-medium text-white bg-squadrun-dark border border-squadrun-primary/40 rounded focus:outline-none focus:border-squadrun-primary"
                      />
                    ) : (
                      <p className="text-xs font-medium text-white truncate">
                        {chat.title || 'Untitled Chat'}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {editingChatId === chat.sessionId ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveRename(chat);
                          }}
                          className="h-6 w-6 p-0 text-green-400 hover:text-green-300"
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelRename();
                          }}
                          className="h-6 w-6 p-0 text-squadrun-gray hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleStartRename(chat, e)}
                          className="h-6 w-6 p-0 text-squadrun-gray hover:text-squadrun-primary"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (confirm('Delete this chat?')) {
                              try {
                                await deleteSquadBotChatSession(chat.sessionId);
                                if (selectedRepository.html_url) {
                                  await loadPreviousChats(selectedRepository.html_url);
                                }
                                if (currentSessionId === chat.sessionId) {
                                  setMessages([]);
                                  setCurrentSessionId(null);
                                }
                                toast.success('Chat deleted');
                              } catch (error) {
                                toast.error('Failed to delete chat');
                              }
                            }
                          }}
                          className="h-6 w-6 p-0 text-squadrun-gray hover:text-red-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Card className="h-full bg-transparent border-squadrun-primary/20 shadow-2xl flex flex-col">
          {/* <CardHeader className="bg-[#1e284f] border-b border-squadrun-primary/20 flex-shrink-0">
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
            </div>
            {selectedRepository.html_url && (
              <div className="flex items-center gap-2 mt-1">
                <FaGithub className="w-3 h-3 text-squadrun-gray" />
                <p className="text-xs text-squadrun-gray truncate flex-1">
                  {selectedRepository.html_url}
                </p>
                {embeddingPklFile && (
                  <Badge variant="outline" className="text-xs bg-squadrun-primary/50 text-white border-squadrun-primary/30 px-1 py-0">
                    Ready
                  </Badge>
                )}
              </div>
            )}
          </CardHeader> */}

          <CardContent className="flex bg-transparent flex-col flex-1 p-4 min-h-0 gap-4">
            <ScrollArea className="flex-1 pr-2">
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="bg-transparent text-center text-squadrun-darker py-6">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center">
                      <FileSearch className="w-8 h-8 text-squadrun-primary" />
                    </div>
                    <h3 className="font-semibold text-white mb-3 text-base">Squadbot!</h3>
                    <p className="text-sm mb-4 text-white leading-relaxed">
                      {embeddingPklFile
                        ? `Successfully loaded your repository${documents.length > 0 ? ` and ${documents.length} uploaded document${documents.length > 1 ? 's' : ''}` : ''}. Ask me about any specific file, function, component, or implementation detail!`
                        : `I'm your intelligent code assistant, ready to help with your development questions.`
                      }
                    </p>
                    {embeddingPklFile && (
                      <div className="space-y-3 flex flex-col items-center text-sm">
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
                        className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${message.type === 'user'
                          ? 'bg-gradient-to-r from-squadrun-primary to-purple-500 text-white'
                          : 'bg-squadrun-dark border border-squadrun-primary/20 text-squadrun-gray'
                          }`}
                      >
                        <div className="text-white whitespace-pre-wrap">{message.content}</div>
                      </div>

                      {/* Show collected files if available */}
                      {message.type === 'bot' && message.collectedFiles && message.collectedFiles.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <div className="text-xs text-squadrun-gray/80 font-medium px-1">
                            Collected Files ({message.collectedFiles.length}):
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {message.collectedFiles.map((file, idx) => (
                              <button
                                key={idx}
                                onClick={() => setViewingFile({ path: file.path, content: file.content })}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-squadrun-dark/80 border border-squadrun-primary/30 rounded-lg hover:bg-squadrun-primary/10 hover:border-squadrun-primary/50 transition-all text-xs text-squadrun-gray hover:text-white group"
                              >
                                <FileCode className="w-3.5 h-3.5 text-squadrun-primary group-hover:text-white" />
                                <span className="truncate max-w-[200px]">{file.path.split('/').pop()}</span>
                                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4 bg-squadrun-primary/20 text-squadrun-primary border-none">
                                  {(file.score * 100).toFixed(0)}%
                                </Badge>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

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
                          <div className="w-2 h-2 bg-squadrun-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-squadrun-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-squadrun-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Document Upload Panel */}
            {showDocumentPanel && documents.length > 0 && (
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
                  {documents.map((doc) => (
                    <div key={doc._id} className="flex items-center justify-between bg-squadrun-darker p-2 rounded text-xs">
                      <div className="flex-1 min-w-0">
                        <p className="text-white truncate">{doc.fileName}</p>
                        <p className="text-squadrun-gray text-[10px]">{doc.fileType.replace(/_/g, ' ')}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => doc._id && handleRemoveDocument(doc._id)}
                        className="h-6 w-6 p-0 text-squadrun-gray hover:text-red-400 ml-2"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 flex-shrink-0 border-t border-squadrun-primary/20 pt-4">
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.pdf,.doc,.docx"
                  onChange={handleLocalFileUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUploadDocClick}
                  disabled={isUploadingDoc || !currentSessionId}
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
                  disabled={isLoading || loadingEmbeddings}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading || loadingEmbeddings}
                  className="bg-gradient-to-r from-squadrun-primary to-purple-500 hover:from-squadrun-primary/80 hover:to-purple-500/80 self-end h-11 w-11 p-0 flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* File Viewer Dialog */}
      <Dialog open={!!viewingFile} onOpenChange={(open) => !open && setViewingFile(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] bg-squadrun-darker border-squadrun-primary/30">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FileCode className="w-5 h-5 text-squadrun-primary" />
              {viewingFile?.path}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] w-full rounded-md border border-squadrun-primary/20 bg-squadrun-dark p-4">
            {viewingFile && (
              <SyntaxHighlighter
                language={detectLanguage(viewingFile.path)}
                style={vscDarkPlus}
                customStyle={{
                  margin: 0,
                  padding: 0,
                  background: 'transparent',
                  fontSize: '0.75rem',
                  lineHeight: '1.5',
                }}
                showLineNumbers
                wrapLongLines
              >
                {viewingFile.content}
              </SyntaxHighlighter>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Document Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={(open) => {
        setShowUploadDialog(open);
        if (!open) {
          setUploadSource(null);
          setS3Documents([]);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] bg-squadrun-darker border-squadrun-primary/30">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-squadrun-primary" />
              Upload Document
            </DialogTitle>
            <DialogDescription className="text-squadrun-gray">
              Choose how you want to add a document to this chat session
            </DialogDescription>
          </DialogHeader>
          
          {!uploadSource ? (
            <div className="flex flex-col gap-4 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setUploadSource('local');
                  fileInputRef.current?.click();
                }}
                className="bg-squadrun-dark border-squadrun-primary/30 text-white hover:bg-squadrun-primary/10 h-16 flex items-center justify-start gap-3"
              >
                <Upload className="w-5 h-5 text-squadrun-primary" />
                <div className="text-left">
                  <div className="font-semibold">Upload from Local System</div>
                  <div className="text-xs text-squadrun-gray">Select a file from your computer</div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setUploadSource('s3')}
                className="bg-squadrun-dark border-squadrun-primary/30 text-white hover:bg-squadrun-primary/10 h-16 flex items-center justify-start gap-3"
              >
                <FileText className="w-5 h-5 text-squadrun-primary" />
                <div className="text-left">
                  <div className="font-semibold">Select from S3 Documents</div>
                  <div className="text-xs text-squadrun-gray">Choose from your saved documents</div>
                </div>
              </Button>
            </div>
          ) : uploadSource === 's3' ? (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">Your Documents</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setUploadSource(null);
                    loadS3Documents();
                  }}
                  className="text-squadrun-gray hover:text-white"
                >
                  ← Back
                </Button>
              </div>
              
              {loadingS3Docs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-squadrun-primary" />
                  <span className="ml-2 text-squadrun-gray">Loading documents...</span>
                </div>
              ) : s3Documents.length === 0 ? (
                <div className="text-center py-8 text-squadrun-gray">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No documents found in S3</p>
                  <p className="text-xs mt-1">Upload documents to S3 first to use them here</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[400px] pr-4">
                  <div className="space-y-2">
                    {s3Documents.map((doc) => (
                      <button
                        key={doc._id}
                        onClick={() => handleSelectS3Document(doc)}
                        disabled={!doc.content || doc.content === '[Binary file - content not readable]' || isUploadingDoc}
                        className="w-full p-3 bg-squadrun-dark border border-squadrun-primary/20 rounded-lg hover:bg-squadrun-primary/10 hover:border-squadrun-primary/40 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2 mb-1">
                              <FileText className="w-4 h-4 text-squadrun-primary flex-shrink-0 mt-0.5" />
                              <span className="text-white font-medium break-words">{doc.fileName}</span>
                            </div>
                            <div className="text-xs text-squadrun-gray ml-6">
                              {doc.size ? `${(doc.size / 1024).toFixed(1)} KB` : 'Size unknown'}
                              {doc.lastModified && ` • ${new Date(doc.lastModified).toLocaleDateString()}`}
                            </div>
                            {(!doc.content || doc.content === '[Binary file - content not readable]') && (
                              <div className="text-xs text-yellow-400 ml-6 mt-1">
                                Cannot read this file type
                              </div>
                            )}
                          </div>
                          {isUploadingDoc && (
                            <Loader2 className="w-4 h-4 animate-spin text-squadrun-primary ml-2" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          ) : null}
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.pdf,.doc,.docx"
            onChange={handleLocalFileUpload}
            className="hidden"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

