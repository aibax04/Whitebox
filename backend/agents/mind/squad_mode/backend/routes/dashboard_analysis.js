const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./documents');
const { searchRepo, embeddingFileExists } = require('../utils/repoEmbeddingUtils');
const path = require('path');

// Helper function to get embeddings context for dashboard
async function getEmbeddingsContextForDashboard(repoUrl, analysisType) {
  try {
    // Extract owner and repo from URL
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      return null;
    }
    
    const [, owner, repo] = match;
    const pklFilename = `${owner}_${repo}.pkl`;
    
    // Check if embeddings exist
    const exists = await embeddingFileExists(pklFilename);
    if (!exists) {
      return null;
    }
    
    // Build search query based on analysis type
    let searchQuery = '';
    if (analysisType === 'business') {
      searchQuery = 'business logic features functionality user interface API endpoints data models business value';
    } else {
      searchQuery = 'technical architecture implementation patterns code structure dependencies technology stack';
    }
    
    // Search for relevant code sections
    const searchResults = await searchRepo(pklFilename, searchQuery, 8);
    
    // Format results for context
    // Qdrant returns similarity scores (higher is better), not distances
    return searchResults.map(result => ({
      path: result.path,
      content: result.content.substring(0, 1500), // Limit content length
      relevance: result.score ? result.score.toFixed(3) : (result.distance ? (1 / (1 + result.distance)).toFixed(3) : '1.0')
    }));
  } catch (error) {
    console.error('Error getting embeddings context for dashboard:', error);
    return null;
  }
}

// Business Dashboard Analysis
router.post('/business-analysis', authMiddleware, async (req, res) => {
  try {
    const { repoFiles, repoUrl } = req.body;

    if (!repoFiles || !Array.isArray(repoFiles)) {
      return res.status(400).json({ error: 'repoFiles array is required' });
    }

    const repoContext = repoFiles.map(file => ({
      path: file.path,
      contentPreview: file.content ? file.content.slice(0, 1000) : ''
    }));

    // Get embeddings context if available
    let embeddingsContext = null;
    if (repoUrl) {
      embeddingsContext = await getEmbeddingsContextForDashboard(repoUrl, 'business');
    }

    let embeddingsSection = '';
    if (embeddingsContext && embeddingsContext.length > 0) {
      embeddingsSection = `

SEMANTICALLY RELEVANT CODE SECTIONS (from vector search):
${embeddingsContext.map((ctx, idx) => `
[${idx + 1}] ${ctx.path} (Relevance: ${ctx.relevance})
${ctx.content}
`).join('\n')}
`;
    }

    const businessAnalysisPrompt = `
You are a business analysis API. Your response MUST be valid JSON only. No explanations, no markdown, no code blocks, no text before or after the JSON.

Analyze this repository for business insights:

Repository URL: ${repoUrl || 'N/A'}
Files: ${JSON.stringify(repoContext, null, 2)}
${embeddingsSection}

CRITICAL: You MUST respond with ONLY a valid JSON object. Start your response with { and end with }. Do not include any other text.

Required JSON structure:
{
  "projectOverview": {
    "points": [
      "Concise 40-60 word business description of main project capabilities and market value",
      "Brief 40-60 word summary of key value propositions and target audience", 
      "Short 40-60 word overview of scalability potential and business model"
    ]
  },
  "targetUserGroups": {
    "Small Business Owners": 35,
    "E-commerce Retailers": 25,
    "Enterprise IT Teams": 20,
    "Freelance Developers": 20
  }
}

Requirements:
- Each point in projectOverview.points must be exactly 40-60 words
- For targetUserGroups, provide SPECIFIC target groups based on the code analysis
- DO NOT use generic terms like "Primary Users" or "Secondary Users"
- Base target groups on actual functionality and features found in the code

Your response must be valid JSON starting with { and ending with }. No other text allowed.
`;

    // Call the internal /api/generate endpoint with JSON response format
    const PORT = process.env.PORT || 3000;
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    
    const aiResponse = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: businessAnalysisPrompt,
        requestType: 'chatbot',
        responseFormat: 'json' // Signal that we expect JSON
      })
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json().catch(() => ({}));
      return res.status(500).json({ error: 'Failed to analyze business aspects', details: errorData });
    }

    const aiData = await aiResponse.json();
    const content = aiData?.content;

    if (!content) {
      return res.status(500).json({ error: 'No content generated from AI' });
    }

    res.json({ content });
  } catch (error) {
    console.error('Business analysis error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Technical Dashboard Analysis
router.post('/technical-analysis', authMiddleware, async (req, res) => {
  try {
    const { repoFiles, repoUrl } = req.body;

    if (!repoFiles || !Array.isArray(repoFiles)) {
      return res.status(400).json({ error: 'repoFiles array is required' });
    }

    const repoContext = repoFiles.map(file => ({
      path: file.path,
      extension: file.path.split('.').pop()?.toLowerCase(),
      linesOfCode: file.content ? file.content.split('\n').length : 0,
      contentPreview: file.content ? file.content.slice(0, 800) : ''
    }));

    // Get embeddings context if available
    let embeddingsContext = null;
    if (repoUrl) {
      embeddingsContext = await getEmbeddingsContextForDashboard(repoUrl, 'technical');
    }

    let embeddingsSection = '';
    if (embeddingsContext && embeddingsContext.length > 0) {
      embeddingsSection = `

SEMANTICALLY RELEVANT CODE SECTIONS (from vector search):
${embeddingsContext.map((ctx, idx) => `
[${idx + 1}] ${ctx.path} (Relevance: ${ctx.relevance})
${ctx.content}
`).join('\n')}
`;
    }

    const technicalAnalysisPrompt = `
You are a technical analysis API. Your response MUST be valid JSON only. No explanations, no markdown, no code blocks, no text before or after the JSON.

Analyze this repository for technical insights:

Repository URL: ${repoUrl || 'N/A'}
Files: ${JSON.stringify(repoContext, null, 2)}
${embeddingsSection}

CRITICAL: You MUST respond with ONLY a valid JSON object. Start your response with { and end with }. Do not include any other text.

Required JSON structure:
{
  "techStack": [
    {"name": "Technology Name", "value": percentage_number, "color": "#hexcolor"},
    ...
  ],
  "qualityMetrics": [
    {"metric": "Metric Name", "score": number_0_to_100, "fullMark": 100},
    ...
  ]
}

Analyze the repository and provide:
1. Technology stack distribution (based on file extensions and content analysis)
2. Code quality metrics (Maintainability, Security, Performance, Test Coverage, Documentation)

Your response must be valid JSON starting with { and ending with }. No other text allowed.
`;

    // Call the internal /api/generate endpoint with JSON response format
    const PORT = process.env.PORT || 3000;
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    
    const aiResponse = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: technicalAnalysisPrompt,
        requestType: 'chatbot',
        responseFormat: 'json' // Signal that we expect JSON
      })
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json().catch(() => ({}));
      return res.status(500).json({ error: 'Failed to analyze technical aspects', details: errorData });
    }

    const aiData = await aiResponse.json();
    const content = aiData?.content;

    if (!content) {
      return res.status(500).json({ error: 'No content generated from AI' });
    }

    res.json({ content });
  } catch (error) {
    console.error('Technical analysis error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

module.exports = router;

