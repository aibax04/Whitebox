import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  createChatSession as apiCreateChatSession, 
  getChatSession as apiGetChatSession, 
  getChatSessions as apiGetChatSessions, 
  deleteChatSession as apiDeleteChatSession,
  addBotMessage as apiAddBotMessage,
  updateChatTitle as apiUpdateChatTitle,
  type BackendChatSession 
} from '@/utils/prdChatApi';
import { Message, ConversationState } from '../types';

export const useChatSessions = () => {
  const [chatSessions, setChatSessions] = useState<BackendChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<BackendChatSession | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState('');

  // Load chat sessions from backend on mount
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const sessions = await apiGetChatSessions();
        setChatSessions(sessions);
        if (sessions.length > 0) {
          await loadChatSession(sessions[0].sessionId);
        } else {
          await createNewChat();
        }
      } catch (err) {
        console.warn('Failed to fetch PRD chat sessions. Creating a new one.', err);
        await createNewChat();
      }
    };
    loadSessions();
  }, []);


  const createNewChat = async () => {
    const sessionId = Date.now().toString();
    
    try {
      // Create session in MongoDB
      const newSession = await apiCreateChatSession(sessionId);
      
      // Update local state
      setCurrentSessionId(sessionId);
      setCurrentSession(newSession);
      
      // Convert backend messages to frontend format (empty array for new session)
      const frontendMessages: Message[] = [];

      // Refresh sessions list
      const sessions = await apiGetChatSessions();
      setChatSessions(sessions);
      
      return { sessionId, frontendMessages };
    } catch (e) {
      console.warn('Could not create backend PRD chat session:', e);
      toast.error('Failed to create new chat session');
      throw e;
    }
  };

  const loadChatSession = async (sessionId: string) => {
    try {
      const backendSession: BackendChatSession | null = await apiGetChatSession(sessionId);
      if (backendSession) {
        setCurrentSessionId(sessionId);
        setCurrentSession(backendSession);
        
        // Convert backend messages to frontend format
        const frontendMessages = (backendSession.messages || []).map((m, idx) => ({
          id: m._id || `${sessionId}-${idx}-${m.timestamp || Date.now()}`,
          type: (m.sender === 'user' ? 'user' : 'bot') as 'user' | 'bot',
          content: m.content,
          timestamp: m.timestamp ? new Date(m.timestamp) : new Date()
        }));
        
        return {
          frontendMessages,
          conversationState: {
            questionsAsked: backendSession.questionsAsked || [],
            aspectQuestionCounts: backendSession.aspectQuestionCounts || {}
          },
          uploadedFile: backendSession.uploadedFile,
          uploadedTemplate: backendSession.uploadedTemplate
        };
      } else {
        console.warn('Session not found:', sessionId);
        toast.error('Chat session not found');
        return null;
      }
    } catch (e) {
      console.error('Error loading chat session:', e);
      toast.error('Failed to load chat session');
      return null;
    }
  };

  const deleteChatSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      // Delete from MongoDB
      await apiDeleteChatSession(sessionId);
      
      // Update local state
      setChatSessions(prev => prev.filter(s => s.sessionId !== sessionId));
    
      if (currentSessionId === sessionId) {
        const remainingSessions = chatSessions.filter(s => s.sessionId !== sessionId);
        if (remainingSessions.length > 0) {
          await loadChatSession(remainingSessions[0].sessionId);
        } else {
          await createNewChat();
        }
      }
    } catch (err) {
      console.error('Failed to delete chat session:', err);
      toast.error('Failed to delete chat session');
    }
  };

  const handleStartRename = (sessionId: string, currentTitle: string) => {
    setEditingTitle(sessionId);
    setEditingTitleValue(currentTitle);
  };

  const handleCancelRename = () => {
    setEditingTitle(null);
    setEditingTitleValue('');
  };

  const handleSaveRename = async (sessionId: string) => {
    if (!editingTitleValue.trim()) {
      toast.error('Title cannot be empty');
      return;
    }

    try {
      await apiUpdateChatTitle(sessionId, editingTitleValue.trim());
      
      // Refresh sessions list from MongoDB to ensure we have the latest data
      const sessions = await apiGetChatSessions();
      setChatSessions(sessions);
      
      // Update current session if it's the one being renamed
      if (currentSessionId === sessionId) {
        const updatedSession = sessions.find(s => s.sessionId === sessionId);
        if (updatedSession) {
          setCurrentSession(updatedSession);
        }
      }
      
      setEditingTitle(null);
      setEditingTitleValue('');
      toast.success('Chat renamed successfully');
    } catch (error) {
      console.error('Error renaming chat:', error);
      toast.error('Failed to rename chat');
    }
  };

  const filteredSessions = chatSessions.filter(session => {
    // Use stored title or default to 'New Chat'
    const title = session.title || 'New Chat';
    return title.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return {
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
  };
};
