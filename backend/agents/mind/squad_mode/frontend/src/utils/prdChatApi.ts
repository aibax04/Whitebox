export interface BackendMessage {
  _id?: string
  sender: 'user' | 'bot'
  content: string
  timestamp?: string
}

export interface BackendChatSession {
  _id?: string
  sessionId: string
  userId?: string
  title?: string
  messages: BackendMessage[]
  progress?: number
  aspectQuestionCounts?: Record<string, number>
  questionsAsked?: string[]
  uploadedFile?: {
    fileName: string
    fileType: string
  }
  uploadedTemplate?: {
    fileName: string
    fileType: string
  }
  createdAt: string
  updatedAt: string
}

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function createChatSession(sessionId: string): Promise<BackendChatSession> {
  const res = await fetch('/api/prd-chats', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ sessionId })
  });
  if (!res.ok) throw new Error('Failed to create chat session');
  return res.json();
}

export async function getChatSession(sessionId: string): Promise<BackendChatSession | null> {
  const res = await fetch(`/api/prd-chats/${encodeURIComponent(sessionId)}`, {
    headers: {
      ...getAuthHeaders()
    }
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to get chat session');
  return res.json();
}

export async function getChatSessions(): Promise<BackendChatSession[]> {
  const res = await fetch('/api/prd-chats', {
    headers: {
      ...getAuthHeaders()
    }
  });
  if (!res.ok) throw new Error('Failed to list chat sessions');
  return res.json();
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  const res = await fetch(`/api/prd-chats/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders()
    }
  });
  if (!res.ok) throw new Error('Failed to delete chat session');
}

export async function addUserMessage(sessionId: string, content: string, aspect?: string): Promise<BackendChatSession> {
  const res = await fetch(`/api/prd-chats/${encodeURIComponent(sessionId)}/messages`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ content, aspect })
  });
  if (!res.ok) throw new Error('Failed to add message');
  return res.json();
}

export async function addBotMessage(sessionId: string, content: string, aspect?: string): Promise<BackendChatSession> {
  const res = await fetch(`/api/prd-chats/${encodeURIComponent(sessionId)}/bot`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ content, aspect })
  });
  if (!res.ok) throw new Error('Failed to add bot message');
  return res.json();
}

export async function updateConversationState(
  sessionId: string, 
  conversationState: {
    questionsAsked?: string[];
    aspectQuestionCounts?: Record<string, number>;
  }
): Promise<BackendChatSession> {
  const res = await fetch(`/api/prd-chats/${encodeURIComponent(sessionId)}/conversation-state`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(conversationState)
  });
  if (!res.ok) throw new Error('Failed to update conversation state');
  return res.json();
}

export async function updateUploadedData(
  sessionId: string,
  uploadedData: {
    uploadedFile?: {
      fileName: string;
      fileType: string;
    };
    uploadedTemplate?: {
      fileName: string;
      fileType: string;
    };
  }
): Promise<BackendChatSession> {
  const res = await fetch(`/api/prd-chats/${encodeURIComponent(sessionId)}/uploaded-data`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(uploadedData)
  });
  if (!res.ok) throw new Error('Failed to update uploaded data');
  return res.json();
}

export async function updateChatTitle(sessionId: string, title: string): Promise<BackendChatSession> {
  const res = await fetch(`/api/prd-chats/${encodeURIComponent(sessionId)}/title`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ title })
  });
  if (!res.ok) throw new Error('Failed to update chat title');
  return res.json();
}


