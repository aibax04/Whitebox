const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authMiddleware } = require('./documents');
const {
  buildIndividualFileAnalysisPrompt,
  buildRepositoryAnalysisPrompt,
  buildMessageProcessingPrompt,
  buildMessageWithContextPrompt
} = require('../prompts/squadbot/promptTemplates');

// Analyze individual file
router.post('/analyze-file', authMiddleware, async (req, res) => {
  try {
    const { filePath, fileContent } = req.body;

    if (!filePath || !fileContent) {
      return res.status(400).json({ error: 'filePath and fileContent are required' });
    }

    const prompt = buildIndividualFileAnalysisPrompt(filePath, fileContent);

    // Call the internal /api/generate endpoint
    const PORT = process.env.PORT || 3000;
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    
    const aiResponse = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        requestType: 'chatbot'
      })
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json().catch(() => ({}));
      return res.status(500).json({ error: 'Failed to analyze file', details: errorData });
    }

    const aiData = await aiResponse.json();
    const content = aiData?.content;

    if (!content) {
      return res.status(500).json({ error: 'No content generated from AI' });
    }

    res.json({ content });
  } catch (error) {
    console.error('File analysis error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Analyze overall repository
router.post('/analyze-repository', authMiddleware, async (req, res) => {
  try {
    const { repoUrl, totalFiles, fileStructure, repositoryContent } = req.body;

    if (!repoUrl || !totalFiles || !fileStructure) {
      return res.status(400).json({ error: 'repoUrl, totalFiles, and fileStructure are required' });
    }

    const prompt = buildRepositoryAnalysisPrompt(repoUrl, totalFiles, fileStructure, repositoryContent);

    // Call the internal /api/generate endpoint
    const PORT = process.env.PORT || 3000;
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    
    const aiResponse = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        requestType: 'chatbot'
      })
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json().catch(() => ({}));
      return res.status(500).json({ error: 'Failed to analyze repository', details: errorData });
    }

    const aiData = await aiResponse.json();
    const content = aiData?.content;

    if (!content) {
      return res.status(500).json({ error: 'No content generated from AI' });
    }

    res.json({ content });
  } catch (error) {
    console.error('Repository analysis error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Process user message with repository context
router.post('/process-message', authMiddleware, async (req, res) => {
  try {
    const { userMessage, repositoryContext, repoUrl, conversationHistory, documents } = req.body;

    if (!userMessage || !repositoryContext) {
      return res.status(400).json({ error: 'userMessage and repositoryContext are required' });
    }

    // Check if it's a greeting
    const isGreeting = /^(hi|hello|hey|good morning|good afternoon|good evening|how are you|what's up)$/i.test(userMessage.trim());

    if (isGreeting) {
      const documentInfo = documents && documents.length > 0 
        ? `\n• Analyzing uploaded documents (${documents.length} document${documents.length > 1 ? 's' : ''})`
        : '';
      
      return res.json({
        content: `Hi there! I'm SquadBot, your AI repository assistant.

I've analyzed all ${repositoryContext.totalFiles || 0} files in your repository${documentInfo} and can help you with:
• Understanding any specific file's purpose and functionality
• Explaining the overall codebase structure and architecture
• Analyzing relationships between different components
• Discussing implementation details and design patterns
• Answering questions about specific functions or features${documentInfo ? '\n• Answering questions based on uploaded documents and how they relate to the code' : ''}

What would you like to know about this repository?`
      });
    }

    const recentHistory = Array.isArray(conversationHistory) ? conversationHistory.slice(-6) : [];
    const historyContext = recentHistory.length > 0 
      ? `\nRECENT CONVERSATION:\n${recentHistory.map(h => `${h.type.toUpperCase()}: ${h.content}`).join('\n')}\n`
      : '';

    const prompt = buildMessageProcessingPrompt(userMessage, repositoryContext, repoUrl, historyContext, documents || []);

    // Call the internal /api/generate endpoint
    const PORT = process.env.PORT || 3000;
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    
    const aiResponse = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        requestType: 'chatbot'
      })
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json().catch(() => ({}));
      return res.status(500).json({ error: 'Failed to process message', details: errorData });
    }

    const aiData = await aiResponse.json();
    let content = aiData?.content;

    if (!content) {
      return res.status(500).json({ error: 'No content generated from AI' });
    }

    // Clean up any remaining markdown symbols
    content = content
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#{1,6}\s/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .trim();

    res.json({ content });
  } catch (error) {
    console.error('Message processing error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Analyze uploaded document
router.post('/analyze-document', authMiddleware, async (req, res) => {
  try {
    const { fileName, fileType, content } = req.body;

    if (!fileName || !content) {
      return res.status(400).json({ error: 'fileName and content are required' });
    }

    const prompt = `Analyze the following document and provide a comprehensive summary.

DOCUMENT NAME: ${fileName}
DOCUMENT TYPE: ${fileType || 'other'}
DOCUMENT CONTENT:
${content}

Provide a detailed analysis including:
1. MAIN_PURPOSE: What is the primary purpose of this document?
2. KEY_POINTS: What are the most important points or requirements? (list as comma-separated)
3. TECHNICAL_DETAILS: Any technical specifications, architecture details, or technical requirements mentioned
4. BUSINESS_CONTEXT: Business goals, value propositions, or business requirements
5. ACTION_ITEMS: Any action items, tasks, or deliverables mentioned
6. DEPENDENCIES: Any dependencies, prerequisites, or related systems mentioned

Format your response as:
MAIN_PURPOSE: [purpose]
KEY_POINTS: [point1, point2, point3]
TECHNICAL_DETAILS: [details]
BUSINESS_CONTEXT: [context]
ACTION_ITEMS: [items]
DEPENDENCIES: [dependencies]`;

    const PORT = process.env.PORT || 3000;
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    
    const aiResponse = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        requestType: 'chatbot'
      })
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json().catch(() => ({}));
      return res.status(500).json({ error: 'Failed to analyze document', details: errorData });
    }

    const aiData = await aiResponse.json();
    const analysis = aiData?.content || '';

    res.json({ analysis });
  } catch (error) {
    console.error('Document analysis error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Process user message with context data from vector/keyword search
router.post('/process-message-with-context', authMiddleware, async (req, res) => {
  try {
    const { userMessage, contextData, repoUrl, conversationHistory, documents } = req.body;

    if (!userMessage) {
      return res.status(400).json({ error: 'userMessage is required' });
    }

    // Check if it's a greeting
    const isGreeting = /^(hi|hello|hey|good morning|good afternoon|good evening|how are you|what's up)$/i.test(userMessage.trim());

    if (isGreeting) {
      return res.json({
        content: `Hi there! I'm SquadBot, your AI repository assistant.

I can help you with:
• Understanding any specific file's purpose and functionality
• Explaining the overall codebase structure and architecture
• Analyzing relationships between different components
• Discussing implementation details and design patterns
• Answering questions about specific functions or features

What would you like to know about this repository?`
      });
    }

    const recentHistory = Array.isArray(conversationHistory) ? conversationHistory.slice(-6) : [];
    const historyContext = recentHistory.length > 0 
      ? `\nRECENT CONVERSATION:\n${recentHistory.map(h => `${h.type.toUpperCase()}: ${h.content}`).join('\n')}\n`
      : '';

    const prompt = buildMessageWithContextPrompt(userMessage, contextData, repoUrl, historyContext, documents || []);

    // Call the internal /api/generate endpoint
    const PORT = process.env.PORT || 3000;
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    
    try {
      const aiResponse = await axios.post(`${baseUrl}/api/generate`, {
        prompt,
        requestType: 'chatbot'
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      let content = aiResponse.data?.content;

      if (!content) {
        console.error('No content in AI response:', aiResponse.data);
        return res.status(500).json({ error: 'No content generated from AI', details: aiResponse.data });
      }

      // Clean up any remaining markdown symbols
      content = content
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/#{1,6}\s/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .trim();

      res.json({ content });
    } catch (axiosError) {
      console.error('Axios error when calling /api/generate:', axiosError);
      const errorMessage = axiosError.response?.data?.error || axiosError.message || 'Unknown error';
      const errorDetails = axiosError.response?.data || { message: axiosError.message };
      return res.status(500).json({ 
        error: 'Failed to connect to AI service', 
        details: errorDetails,
        message: errorMessage
      });
    }
  } catch (error) {
    console.error('Message processing error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;

