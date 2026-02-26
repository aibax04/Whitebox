import { cleanTextFromMarkdown } from './fileUtils';
import { Message, ConversationState } from '../types';

export const analyzePRDTemplate = async (content: string, fileName: string): Promise<string> => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Please sign in to analyze templates');
    }

    // Call backend endpoint - it generates prompt and calls /api/generate internally
    const response = await fetch('/api/prd-analysis/analyze-template', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        content,
        fileName
      })
    });
    const data = await response.json();
    return cleanTextFromMarkdown(data.content);
  } catch (error) {
    console.error('Template analysis error:', error);
    throw error;
  }
};

export const analyzeUploadedFile = async (content: string, fileName: string): Promise<string> => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Please sign in to analyze files');
    }

    // Call backend endpoint - it generates prompt and calls /api/generate internally
    const response = await fetch('/api/prd-analysis/analyze-file', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        content,
        fileName
      })
    });
    const data = await response.json();
    return cleanTextFromMarkdown(data.content);
  } catch (error) {
    console.error('File analysis error:', error);
    throw error;
  }
};

export const generateNextQuestion = async (
  conversationHistory: Message[], 
  currentState: ConversationState,
  templateAnalysis: string
): Promise<string> => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      return "Could you tell me more about the key features you envision for this product?";
    }

    // Call backend endpoint - it generates prompt and calls /api/generate internally
    const response = await fetch('/api/prd-analysis/next-question', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        conversationHistory,
        currentState,
        templateAnalysis
      })
    });
    const data = await response.json();
    return cleanTextFromMarkdown(data.content);
  } catch (error) {
    console.error('Question generation error:', error);
    return "Could you tell me more about the key features you envision for this product?";
  }
};

export const generateComprehensivePRD = async (
  conversationHistory: Message[],
  selectedTemplate?: any
): Promise<string> => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Please sign in to generate PRD');
    }

    // Call backend endpoint - it generates prompt and calls /api/generate internally
    const response = await fetch('/api/prd-analysis/generate-prd', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        conversationHistory,
        selectedTemplate
      })
    });
    const data = await response.json();
    return cleanTextFromMarkdown(data.content);
  } catch (error) {
    console.error('PRD generation error:', error);
    throw error;
  }
};

export const generatePRDFromTemplate = async (
  conversationHistory: Message[],
  prdTemplateContent: string,
  templateAnalysis: string
): Promise<string> => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Please sign in to generate PRD');
    }

    // Call backend endpoint - it generates prompt and calls /api/generate internally
    const response = await fetch('/api/prd-analysis/generate-prd-from-template', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        conversationHistory,
        prdTemplateContent,
        templateAnalysis
      })
    });
    const data = await response.json();
    return cleanTextFromMarkdown(data.content);
  } catch (error) {
    console.error('PRD generation error:', error);
    throw error;
  }
};

// Streaming version of generateComprehensivePRD
export const generateComprehensivePRDStream = async (
  conversationHistory: Message[],
  selectedTemplate: any,
  onChunk: (chunk: string) => void,
  onComplete: () => void,
  onError: (error: Error) => void
): Promise<void> => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Please sign in to generate PRD');
    }

    const response = await fetch('/api/prd-analysis/generate-prd-stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        conversationHistory,
        selectedTemplate
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate PRD');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        onComplete();
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      
      // Keep the last incomplete line in the buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.substring(6);
          try {
            const data = JSON.parse(jsonStr);
            if (data.error) {
              onError(new Error(data.error));
              return;
            }
            if (data.done) {
              onComplete();
              return;
            }
            if (data.content) {
              onChunk(data.content);
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  } catch (error) {
    console.error('PRD streaming error:', error);
    onError(error as Error);
  }
};

// Streaming version of generatePRDFromTemplate
export const generatePRDFromTemplateStream = async (
  conversationHistory: Message[],
  prdTemplateContent: string,
  templateAnalysis: string,
  onChunk: (chunk: string) => void,
  onComplete: () => void,
  onError: (error: Error) => void
): Promise<void> => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Please sign in to generate PRD');
    }

    const response = await fetch('/api/prd-analysis/generate-prd-from-template-stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        conversationHistory,
        prdTemplateContent,
        templateAnalysis
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate PRD from template');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        onComplete();
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      
      // Keep the last incomplete line in the buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.substring(6);
          try {
            const data = JSON.parse(jsonStr);
            if (data.error) {
              onError(new Error(data.error));
              return;
            }
            if (data.done) {
              onComplete();
              return;
            }
            if (data.content) {
              onChunk(data.content);
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  } catch (error) {
    console.error('PRD template streaming error:', error);
    onError(error as Error);
  }
};
