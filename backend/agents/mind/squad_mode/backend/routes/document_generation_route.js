const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./documents');
const { buildFeatureReadmePrompt, buildFeatureReadmeEditPrompt } = require('../prompts/feature-readme/promptTemplates');

// Generate business document
router.post('/generate-business', authMiddleware, async (req, res) => {
  try {
    const { files, repoUrl, repoData, fileContents } = req.body;

    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ error: 'files array is required' });
    }

    const repoContext = files.map(file => ({
      path: file.path,
      contentPreview: file.content ? file.content.slice(0, 1000) : ''
    }));

    const businessAnalysisPrompt = `Generate a Business Requirements Document (BRD) for this repository. Include stakeholder-friendly language and avoid technical jargon.\n\nRepository URL: ${repoUrl || 'N/A'}\nFiles: ${JSON.stringify(repoContext, null, 2)}`;

    const payload = {
      prompt: businessAnalysisPrompt,
      requestType: 'business-document'
    };
    if (repoData) payload.repoData = repoData;
    if (fileContents && fileContents.length > 0) payload.fileContents = fileContents;

    // Call the internal /api/generate endpoint
    const PORT = process.env.PORT || 3000;
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    
    const aiResponse = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json().catch(() => ({}));
      return res.status(500).json({ error: 'Failed to generate business document', details: errorData });
    }

    const aiData = await aiResponse.json();
    const content = aiData?.content;

    if (!content) {
      return res.status(500).json({ error: 'No content generated from AI' });
    }

    res.json({ content });
  } catch (error) {
    console.error('Business document generation error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Generate technical document
router.post('/generate-technical', authMiddleware, async (req, res) => {
  try {
    const { files, repoUrl, repoData, fileContents } = req.body;

    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ error: 'files array is required' });
    }

    const repoContext = files.map(file => ({
      path: file.path,
      contentPreview: file.content ? file.content.slice(0, 1000) : ''
    }));

    const technicalAnalysisPrompt = `Generate technical overview document for this repository. Focus on architecture, APIs, databases, and operations.\n\nRepository URL: ${repoUrl || 'N/A'}\nFiles: ${JSON.stringify(repoContext, null, 2)}`;

    const payload = {
      prompt: technicalAnalysisPrompt,
      requestType: 'technical-document'
    };
    if (repoData) payload.repoData = repoData;
    if (fileContents && fileContents.length > 0) payload.fileContents = fileContents;

    // Call the internal /api/generate endpoint
    const PORT = process.env.PORT || 3000;
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    
    const aiResponse = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json().catch(() => ({}));
      return res.status(500).json({ error: 'Failed to generate technical document', details: errorData });
    }

    const aiData = await aiResponse.json();
    const content = aiData?.content;

    if (!content) {
      return res.status(500).json({ error: 'No content generated from AI' });
    }

    res.json({ content });
  } catch (error) {
    console.error('Technical document generation error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Generate code quality document
router.post('/generate-quality', authMiddleware, async (req, res) => {
  try {
    const { files, repoUrl, repoData, fileContents } = req.body;

    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ error: 'files array is required' });
    }

    const repoContext = files.map(file => ({
      path: file.path,
      contentPreview: file.content ? file.content.slice(0, 1000) : ''
    }));

    const codeQualityAnalysisPrompt = `Perform a comprehensive code completeness and quality analysis for this repository.\n\nRepository URL: ${repoUrl || 'N/A'}\nFiles: ${JSON.stringify(repoContext, null, 2)}`;

    const payload = {
      prompt: codeQualityAnalysisPrompt,
      requestType: 'code-quality'
    };
    if (repoData) payload.repoData = repoData;
    if (fileContents && fileContents.length > 0) payload.fileContents = fileContents;

    // Call the internal /api/generate endpoint
    const PORT = process.env.PORT || 3000;
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    
    const aiResponse = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json().catch(() => ({}));
      return res.status(500).json({ error: 'Failed to generate quality document', details: errorData });
    }

    const aiData = await aiResponse.json();
    const content = aiData?.content;

    if (!content) {
      return res.status(500).json({ error: 'No content generated from AI' });
    }

    res.json({ content });
  } catch (error) {
    console.error('Quality document generation error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Generate Feature README
router.post('/generate-feature-readme', authMiddleware, async (req, res) => {
  try {
    const { files, repoUrl, repoUrls, repoData, fileContents } = req.body;

    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ error: 'files array is required' });
    }

    const repoContext = files.map(file => ({
      path: file.path,
      contentPreview: file.content ? file.content.slice(0, 1000) : ''
    }));

    // Support both single repoUrl (backward compatibility) and multiple repoUrls
    const reposToUse = repoUrls || (repoUrl ? [repoUrl] : []);
    const displayRepoUrl = reposToUse.length > 0 ? reposToUse.join(', ') : repoUrl || '';

    const featureReadmePrompt = buildFeatureReadmePrompt(displayRepoUrl, repoContext);

    const payload = {
      prompt: featureReadmePrompt,
      requestType: 'feature-readme'
    };
    if (repoData) payload.repoData = repoData;
    if (fileContents && fileContents.length > 0) payload.fileContents = fileContents;

    // Call the internal /api/generate endpoint
    const PORT = process.env.PORT || 3000;
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    
    const aiResponse = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json().catch(() => ({}));
      return res.status(500).json({ error: 'Failed to generate Feature README', details: errorData });
    }

    const aiData = await aiResponse.json();
    const content = aiData?.content;

    if (!content) {
      return res.status(500).json({ error: 'No content generated from AI' });
    }

    res.json({ content });
  } catch (error) {
    console.error('Feature README generation error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Apply AI changes to existing README
router.post('/apply-ai-changes', authMiddleware, async (req, res) => {
  try {
    const { currentContent, userPrompt, files, repoUrl, repoData, fileContents } = req.body;

    if (!currentContent || !userPrompt) {
      return res.status(400).json({ error: 'currentContent and userPrompt are required' });
    }

    const repoContext = files && Array.isArray(files) ? files.map(file => ({
      path: file.path,
      contentPreview: file.content ? file.content.slice(0, 1000) : ''
    })) : [];

    const aiChangePrompt = buildFeatureReadmeEditPrompt(userPrompt, currentContent, repoUrl, repoContext);

    const payload = {
      prompt: aiChangePrompt,
      requestType: 'feature-readme-edit'
    };
    if (repoData) payload.repoData = repoData;
    if (fileContents && fileContents.length > 0) payload.fileContents = fileContents;

    // Call the internal /api/generate endpoint
    const PORT = process.env.PORT || 3000;
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    
    const aiResponse = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json().catch(() => ({}));
      return res.status(500).json({ error: 'Failed to apply AI changes', details: errorData });
    }

    const aiData = await aiResponse.json();
    let content = aiData?.content;

    // Clean up the content - remove markdown code blocks and extra formatting
    if (content && typeof content === 'string') {
      // Remove markdown code block wrappers if present
      content = content.replace(/^```markdown\n?/g, '').replace(/^```\n?/g, '').replace(/\n?```$/g, '');
      // Remove extra asterisks that might be escaped or duplicated
      content = content.replace(/\*\*\*/g, '**'); // Replace triple asterisks with double
      content = content.replace(/\*\*\*\*/g, '**'); // Replace quadruple asterisks with double
      // Remove asterisks at the start of lines that shouldn't be there (except for list items)
      content = content.replace(/^(\s*)\*\s+([^*])/gm, '$1- $2'); // Convert list items with * to use -
      // Clean up any escaped markdown characters
      content = content.replace(/\\\*/g, '*'); // Remove escaped asterisks
      content = content.trim();
    }

    if (!content) {
      return res.status(500).json({ error: 'No content generated from AI' });
    }

    res.json({ content });
  } catch (error) {
    console.error('AI changes application error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

module.exports = router;

