const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./documents');
const { Diagram } = require('../data_models/diagram');
const {
  HLD_SYSTEM_INSTRUCTION,
  LLD_SYSTEM_INSTRUCTION,
  ERD_SYSTEM_INSTRUCTION,
} = require('../prompts/diagram-generation/systemInstructions');
const {
  buildHLDPrompt,
  buildLLDPrompt,
  buildERDPrompt,
} = require('../prompts/diagram-generation/promptTemplates');

// Generate diagram by internally calling /api/generate
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const { type, prdContent, repoUrl, useRepoContext, fileList, pklFilename } = req.body;

    if (!type) {
      return res.status(400).json({ error: 'Diagram type is required' });
    }

    // Validate that either PRD content or repo URL is provided
    if (!prdContent && !repoUrl) {
      return res.status(400).json({ error: 'Either PRD content or repository URL is required' });
    }

    let contextContent = '';

    // If using repository context, search for relevant files
    if (useRepoContext && repoUrl) {
      try {
        // Extract owner and repo name from URL
        const repoMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (!repoMatch) {
          return res.status(400).json({ error: 'Invalid GitHub repository URL' });
        }

        const owner = repoMatch[1];
        let repoName = repoMatch[2];
        repoName = repoName.replace(/\.git$/, '').replace(/\/$/, '');
        
        console.log(`Diagram generation for repo: ${owner}/${repoName}`);
        
        const { getCollectionName, collectionExists } = require('../utils/qdrantClient');
        const { searchRepo } = require('../utils/repoSearchNative');
        
        const collectionName = getCollectionName(owner, repoName);
        const exists = await collectionExists(collectionName);
        
        if (!exists) {
          return res.status(400).json({ 
            error: `Repository embeddings not found. Please load the repository first.`,
            details: `Collection "${collectionName}" does not exist in the virtual vector store.`
          });
        }

        let searchQuery = '';
        switch (type) {
          case 'hld': searchQuery = 'system architecture main components services API database'; break;
          case 'lld': searchQuery = 'class methods functions implementation business logic'; break;
          case 'erd': searchQuery = 'database models schema entities relationships data structure'; break;
          default: searchQuery = 'code structure architecture';
        }

        const searchResults = await searchRepo(collectionName, searchQuery, 10);
        
        if (searchResults && searchResults.length > 0) {
          contextContent = 'Repository Context (relevant files):\n\n';
          searchResults.forEach((file, index) => {
            contextContent += `File ${index + 1}: ${file.path}\n`;
            contextContent += `${file.content}\n\n`;
          });
        } else if (fileList && fileList.length > 0) {
          contextContent = 'Repository Structure:\n\n' + fileList.map(f => `- ${f.path}`).join('\n');
        } else {
          contextContent = `Repository: ${repoUrl}\n\nPlease analyze the repository structure and generate an appropriate diagram.`;
        }

      } catch (error) {
        console.error('Error searching repository:', error);
        contextContent = `Repository: ${repoUrl}\n\n`;
        if (fileList && fileList.length > 0) {
          contextContent += 'Files in repository:\n' + fileList.map(f => `- ${f.path}`).join('\n');
        }
      }
    } else {
      contextContent = prdContent;
    }

    let systemInstruction = '';
    let prompt = '';

    switch (type) {
      case 'hld':
        systemInstruction = HLD_SYSTEM_INSTRUCTION;
        prompt = buildHLDPrompt(contextContent);
        break;
      case 'lld':
        systemInstruction = LLD_SYSTEM_INSTRUCTION;
        prompt = buildLLDPrompt(contextContent);
        break;
      case 'erd':
        systemInstruction = ERD_SYSTEM_INSTRUCTION;
        prompt = buildERDPrompt(contextContent);
        break;
      default:
        return res.status(400).json({ error: 'Invalid diagram type' });
    }

    const PORT = process.env.PORT || 3003;
    const baseUrl = `http://localhost:${PORT}`;
    
    const aiResponse = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, systemInstruction })
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json().catch(() => ({}));
      return res.status(500).json({ error: 'Failed to generate diagram', details: errorData });
    }

    const aiData = await aiResponse.json();
    res.json({ content: aiData?.content });
  } catch (error) {
    console.error('Diagram generation error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Save generated diagram
router.post('/save', authMiddleware, async (req, res) => {
  try {
    const { type, prdContent, mermaidCode, title } = req.body;

    if (!type || !prdContent || !mermaidCode) {
      return res.status(400).json({ error: 'Type, PRD content, and Mermaid code are required' });
    }

    const diagram = await Diagram.create({
      userId: req.user.id,
      type,
      prdContent,
      mermaidCode,
      title: title || `${type.toUpperCase()} - ${new Date().toLocaleDateString()}`
    });

    res.json({ success: true, diagram });
  } catch (error) {
    console.error('Error saving diagram:', error);
    res.status(500).json({ error: 'Failed to save diagram' });
  }
});

// Get user's diagrams
router.get('/list', authMiddleware, async (req, res) => {
  try {
    const diagrams = await Diagram.findAll({ 
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    res.json({ diagrams });
  } catch (error) {
    console.error('Error fetching diagrams:', error);
    res.status(500).json({ error: 'Failed to fetch diagrams' });
  }
});

// Get specific diagram
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const diagram = await Diagram.findOne({ where: { id: req.params.id, userId: req.user.id } });
    
    if (!diagram) {
      return res.status(404).json({ error: 'Diagram not found' });
    }

    res.json({ diagram });
  } catch (error) {
    console.error('Error fetching diagram:', error);
    res.status(500).json({ error: 'Failed to fetch diagram' });
  }
});

// Delete diagram
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const deleted = await Diagram.destroy({ where: { id: req.params.id, userId: req.user.id } });
    
    if (!deleted) {
      return res.status(404).json({ error: 'Diagram not found' });
    }

    res.json({ success: true, message: 'Diagram deleted successfully' });
  } catch (error) {
    console.error('Error deleting diagram:', error);
    res.status(500).json({ error: 'Failed to delete diagram' });
  }
});

// Generate realistic system design diagram
router.post('/generate-realistic', authMiddleware, async (req, res) => {
  try {
    const { mermaidCode, diagramType } = req.body;

    if (!mermaidCode || !diagramType) {
      return res.status(400).json({ error: 'Mermaid code and diagram type are required' });
    }

    const prompt = `Based on this Mermaid ${diagramType.toUpperCase()} diagram, create a professional, realistic system design diagram as an HTML page with embedded SVG.\n\nMERMAID:\n${mermaidCode}`;
    const systemInstruction = `You are an expert system design architect. Generate a standalone HTML page with embedded SVG that looks modern and professional. Output ONLY the HTML.`;

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const GEMINI_MODEL = 'gemini-2.0-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    
    const requestBody = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
      systemInstruction: { parts: [{ text: systemInstruction }] }
    };

    const aiResponse = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!aiResponse.ok) {
      return res.status(500).json({ error: 'Failed to generate realistic diagram' });
    }

    const aiData = await aiResponse.json();
    let htmlContent = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (htmlContent.includes('```html')) {
      htmlContent = htmlContent.split('```html')[1].split('```')[0].trim();
    }

    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
    res.json({ htmlContent, dataUrl });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
