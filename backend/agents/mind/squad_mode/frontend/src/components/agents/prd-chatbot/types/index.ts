export interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  fileAttachment?: {
    name: string;
    content: string;
  };
}

export interface ConversationState {
  questionsAsked: string[];
  aspectQuestionCounts: Record<string, number>;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  lastUpdated: Date;
}

export interface BackendChatSession {
  sessionId: string;
  title?: string;
  messages: Array<{
    _id?: string;
    sender: 'user' | 'bot';
    content: string;
    timestamp?: number;
  }>;
  questionsAsked?: string[];
  aspectQuestionCounts?: Record<string, number>;
  uploadedFile?: {
    fileName: string;
    fileType: string;
  };
  uploadedTemplate?: {
    fileName: string;
    fileType: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface UploadedData {
  uploadedFile?: {
    fileName: string;
    fileType: string;
  };
  uploadedTemplate?: {
    fileName: string;
    fileType: string;
  };
}

export interface Template {
  name: string;
  content: string;
  type?: string;
}
