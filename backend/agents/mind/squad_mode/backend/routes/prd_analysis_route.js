const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./documents');
const prompts = require('../prompts');

// Analyze PRD template
router.post('/analyze-template', authMiddleware, async (req, res) => {
  try {
    const { content, fileName } = req.body;

    if (!content || !fileName) {
      return res.status(400).json({ error: 'content and fileName are required' });
    }

    // Generate prompt using backend prompt template
    const prompt = prompts.prdChatbot.promptTemplates.buildTemplateAnalysisPrompt(content, fileName);

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
      return res.status(500).json({ error: 'Failed to analyze template', details: errorData });
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData?.content;

    if (!aiContent) {
      return res.status(500).json({ error: 'No content generated from AI' });
    }

    res.json({ content: aiContent });
  } catch (error) {
    console.error('Template analysis error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Analyze uploaded file
router.post('/analyze-file', authMiddleware, async (req, res) => {
  try {
    const { content, fileName } = req.body;

    if (!content || !fileName) {
      return res.status(400).json({ error: 'content and fileName are required' });
    }

    // Generate prompt using backend prompt template
    const prompt = prompts.prdChatbot.promptTemplates.buildFileAnalysisPrompt(content, fileName);

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
    const aiContent = aiData?.content;

    if (!aiContent) {
      return res.status(500).json({ error: 'No content generated from AI' });
    }

    res.json({ content: aiContent });
  } catch (error) {
    console.error('File analysis error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Generate next question
router.post('/next-question', authMiddleware, async (req, res) => {
  try {
    const { conversationHistory, currentState, templateAnalysis } = req.body;

    if (!conversationHistory || !currentState) {
      return res.status(400).json({ error: 'conversationHistory and currentState are required' });
    }

    // Generate prompt using backend prompt template
    const prompt = prompts.prdChatbot.promptTemplates.buildNextQuestionPrompt(
      conversationHistory,
      currentState,
      templateAnalysis || ''
    );

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
      return res.status(500).json({ error: 'Failed to generate question', details: errorData });
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData?.content;

    if (!aiContent) {
      return res.status(500).json({ error: 'No content generated from AI' });
    }

    res.json({ content: aiContent });
  } catch (error) {
    console.error('Question generation error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Generate comprehensive PRD (non-streaming)
router.post('/generate-prd', authMiddleware, async (req, res) => {
  try {
    const { conversationHistory, selectedTemplate } = req.body;

    if (!conversationHistory || !Array.isArray(conversationHistory)) {
      return res.status(400).json({ error: 'conversationHistory array is required' });
    }

    // Generate prompt using backend prompt template
    const prompt = prompts.prdChatbot.promptTemplates.buildComprehensivePRDPrompt(
      conversationHistory,
      selectedTemplate
    );

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
      return res.status(500).json({ error: 'Failed to generate PRD', details: errorData });
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData?.content;

    if (!aiContent) {
      return res.status(500).json({ error: 'No content generated from AI' });
    }

    res.json({ content: aiContent });
  } catch (error) {
    console.error('PRD generation error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Generate comprehensive PRD with streaming
router.post('/generate-prd-stream', authMiddleware, async (req, res) => {
  try {
    const { conversationHistory, selectedTemplate } = req.body;

    if (!conversationHistory || !Array.isArray(conversationHistory)) {
      return res.status(400).json({ error: 'conversationHistory array is required' });
    }

    // Generate prompt using backend prompt template
    const prompt = prompts.prdChatbot.promptTemplates.buildComprehensivePRDPrompt(
      conversationHistory,
      selectedTemplate
    );

    const systemInstruction = prompts.chatbot.systemInstructions.CHATBOT_SYSTEM_INSTRUCTION;

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Call Gemini Streaming API
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const GEMINI_MODEL = 'gemini-2.0-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192,
      },
      systemInstruction: { parts: [{ text: systemInstruction }] }
    };

    const aiResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.text();
      console.error('Gemini API error:', errorData);
      res.write(`data: ${JSON.stringify({ error: 'Failed to generate PRD' })}\n\n`);
      res.end();
      return;
    }

    // Stream the response
    const reader = aiResponse.body;
    
    for await (const chunk of reader) {
      const text = new TextDecoder().decode(chunk);
      const lines = text.split('\n').filter(line => line.trim() !== '');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.substring(6);
          try {
            const data = JSON.parse(jsonStr);
            const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (content) {
              res.write(`data: ${JSON.stringify({ content })}\n\n`);
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error) {
    console.error('PRD streaming error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Internal server error' })}\n\n`);
    res.end();
  }
});

// Generate PRD from template (non-streaming)
router.post('/generate-prd-from-template', authMiddleware, async (req, res) => {
  try {
    const { conversationHistory, prdTemplateContent, templateAnalysis } = req.body;

    if (!conversationHistory || !Array.isArray(conversationHistory)) {
      return res.status(400).json({ error: 'conversationHistory array is required' });
    }

    if (!prdTemplateContent) {
      return res.status(400).json({ error: 'prdTemplateContent is required' });
    }

    // Generate prompt using backend prompt template
    const prompt = prompts.prdChatbot.promptTemplates.buildPRDFromTemplatePrompt(
      conversationHistory,
      prdTemplateContent,
      templateAnalysis || ''
    );

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
      return res.status(500).json({ error: 'Failed to generate PRD from template', details: errorData });
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData?.content;

    if (!aiContent) {
      return res.status(500).json({ error: 'No content generated from AI' });
    }

    res.json({ content: aiContent });
  } catch (error) {
    console.error('PRD from template generation error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Generate PRD from template with streaming
router.post('/generate-prd-from-template-stream', authMiddleware, async (req, res) => {
  try {
    const { conversationHistory, prdTemplateContent, templateAnalysis } = req.body;

    if (!conversationHistory || !Array.isArray(conversationHistory)) {
      return res.status(400).json({ error: 'conversationHistory array is required' });
    }

    if (!prdTemplateContent) {
      return res.status(400).json({ error: 'prdTemplateContent is required' });
    }

    // Generate prompt using backend prompt template
    const prompt = prompts.prdChatbot.promptTemplates.buildPRDFromTemplatePrompt(
      conversationHistory,
      prdTemplateContent,
      templateAnalysis || ''
    );

    const systemInstruction = prompts.chatbot.systemInstructions.CHATBOT_SYSTEM_INSTRUCTION;

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Call Gemini Streaming API
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const GEMINI_MODEL = 'gemini-2.0-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192,
      },
      systemInstruction: { parts: [{ text: systemInstruction }] }
    };

    const aiResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.text();
      console.error('Gemini API error:', errorData);
      res.write(`data: ${JSON.stringify({ error: 'Failed to generate PRD' })}\n\n`);
      res.end();
      return;
    }

    // Stream the response
    const reader = aiResponse.body;
    
    for await (const chunk of reader) {
      const text = new TextDecoder().decode(chunk);
      const lines = text.split('\n').filter(line => line.trim() !== '');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.substring(6);
          try {
            const data = JSON.parse(jsonStr);
            const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (content) {
              res.write(`data: ${JSON.stringify({ content })}\n\n`);
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error) {
    console.error('PRD template streaming error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Internal server error' })}\n\n`);
    res.end();
  }
});

module.exports = router;

