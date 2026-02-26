export interface SquadBotMessage {
  sender: 'user' | 'bot';
  content: string;
  timestamp?: string | Date;
  _id?: string;
}

export interface UploadedDocument {
  _id?: string;
  fileName: string;
  fileType: 'business_requirement' | 'technical_overview' | 'code_completeness' | 'product_requirement' | 'other';
  content: string;
  analysis?: string;
  uploadedAt: string | Date;
}

export interface SquadBotChatSession {
  _id?: string;
  sessionId: string;
  userId?: string;
  repoUrl: string;
  repoName: string;
  embeddingPklFile?: string | null;
  title?: string;
  messages: SquadBotMessage[];
  documents?: UploadedDocument[];
  createdAt: string | Date;
  updatedAt: string | Date;
  messageCount?: number;
}

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
}

// Create a new SquadBot chat session
export async function createSquadBotChatSession(
  sessionId: string,
  repoUrl: string,
  repoName: string,
  embeddingPklFile?: string | null,
  title?: string
): Promise<SquadBotChatSession> {
  const response = await fetch('/api/squadbot-chats', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      sessionId,
      repoUrl,
      repoName,
      embeddingPklFile: embeddingPklFile || null,
      title: title || 'New SquadBot Chat'
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create chat session' }));
    throw new Error(error.error || 'Failed to create chat session');
  }

  return response.json();
}

// Get a specific chat session
export async function getSquadBotChatSession(sessionId: string): Promise<SquadBotChatSession | null> {
  const response = await fetch(`/api/squadbot-chats/${sessionId}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to get chat session' }));
    throw new Error(error.error || 'Failed to get chat session');
  }

  return response.json();
}

// Get all chat sessions for a repository
export async function getSquadBotChatSessionsByRepo(repoUrl: string): Promise<SquadBotChatSession[]> {
  const encodedRepoUrl = encodeURIComponent(repoUrl);
  const response = await fetch(`/api/squadbot-chats/repo/${encodedRepoUrl}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to get chat sessions' }));
    throw new Error(error.error || 'Failed to get chat sessions');
  }

  return response.json();
}

// Get all SquadBot chat sessions for the user
export async function getSquadBotChatSessions(): Promise<SquadBotChatSession[]> {
  const response = await fetch('/api/squadbot-chats', {
    method: 'GET',
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to get chat sessions' }));
    throw new Error(error.error || 'Failed to get chat sessions');
  }

  return response.json();
}

// Delete a chat session
export async function deleteSquadBotChatSession(sessionId: string): Promise<void> {
  const response = await fetch(`/api/squadbot-chats/${sessionId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete chat session' }));
    throw new Error(error.error || 'Failed to delete chat session');
  }
}

// Add a message to chat session
export async function addSquadBotMessage(
  sessionId: string,
  content: string,
  sender: 'user' | 'bot'
): Promise<SquadBotChatSession> {
  const response = await fetch(`/api/squadbot-chats/${sessionId}/messages`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      content,
      sender
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to add message' }));
    throw new Error(error.error || 'Failed to add message');
  }

  return response.json();
}

// Update chat session title
export async function updateSquadBotChatTitle(sessionId: string, title: string): Promise<SquadBotChatSession> {
  const response = await fetch(`/api/squadbot-chats/${sessionId}/title`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ title })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update title' }));
    throw new Error(error.error || 'Failed to update title');
  }

  return response.json();
}

// Upload document to chat session
export async function uploadDocumentToSession(
  sessionId: string,
  fileName: string,
  fileType: UploadedDocument['fileType'],
  content: string
): Promise<SquadBotChatSession> {
  const response = await fetch(`/api/squadbot-chats/${sessionId}/documents`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      fileName,
      fileType,
      content
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to upload document' }));
    throw new Error(error.error || 'Failed to upload document');
  }

  return response.json();
}

// Get documents from chat session
export async function getSessionDocuments(sessionId: string): Promise<UploadedDocument[]> {
  const response = await fetch(`/api/squadbot-chats/${sessionId}/documents`, {
    method: 'GET',
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to get documents' }));
    throw new Error(error.error || 'Failed to get documents');
  }

  const data = await response.json();
  return data.documents || [];
}

// Delete document from chat session
export async function deleteSessionDocument(sessionId: string, documentId: string): Promise<void> {
  const response = await fetch(`/api/squadbot-chats/${sessionId}/documents/${documentId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete document' }));
    throw new Error(error.error || 'Failed to delete document');
  }
}

