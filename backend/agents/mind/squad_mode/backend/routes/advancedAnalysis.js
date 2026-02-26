const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./documents');
const { buildFileAnalysisPrompt, buildContextAggregationPrompt } = require('../prompts/analysis/fileAnalysisPrompts');
const { searchRepo, getFileByPath, embeddingFileExists } = require('../utils/repoEmbeddingUtils');
const path = require('path');

// Helper function to determine file type
const getFileType = (filePath) => {
  const extension = filePath.split('.').pop()?.toLowerCase();
  const path = filePath.toLowerCase();
  
  if (path.includes('test') || path.includes('spec')) return 'test';
  if (path.includes('config') || path.includes('setting')) return 'config';
  if (path.includes('readme') || path.includes('.md')) return 'documentation';
  if (path.includes('package.json') || path.includes('requirements.txt')) return 'dependency';
  if (path.includes('dockerfile') || path.includes('docker-compose')) return 'deployment';
  if (path.includes('api') || path.includes('route')) return 'api';
  if (path.includes('auth') || path.includes('login')) return 'auth';
  if (path.includes('model') || path.includes('schema')) return 'data-model';
  if (path.includes('component') || path.includes('ui')) return 'frontend';
  if (path.includes('service') || path.includes('controller')) return 'backend';
  if (path.includes('util') || path.includes('helper')) return 'utility';
  
  // Default based on extension
  const codeExtensions = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'go', 'rs', 'php', 'rb'];
  if (codeExtensions.includes(extension)) return 'source-code';
  
  return 'other';
};

// API 1: Analyze individual file content and generate context
router.post('/analyze-file', authMiddleware, async (req, res) => {
  try {
    const { filePath, fileContent } = req.body;
    
    if (!filePath || !fileContent) {
      return res.status(400).json({ error: 'filePath and fileContent are required' });
    }

    const fileType = getFileType(filePath);
    const analysisPrompt = buildFileAnalysisPrompt(filePath, fileContent, fileType);

    // Call Gemini API for file analysis
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const GEMINI_MODEL = 'gemini-2.0-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: analysisPrompt }]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      return res.status(500).json({ error: 'Failed to analyze file content' });
    }

    // Try to parse the JSON response
    let fileContext;
    try {
      // Clean the response to extract JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        fileContext = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      // Fallback: create a basic context structure
      fileContext = {
        purpose: content.substring(0, 200) + '...',
        keyComponents: [],
        dependencies: [],
        businessLogic: 'Analysis failed to parse properly',
        technicalPatterns: [],
        apis: [],
        dataModels: [],
        securityFeatures: [],
        configuration: '',
        category: fileType
      };
    }

    res.json({ 
      filePath, 
      fileContext,
      analysisSuccess: true 
    });

  } catch (error) {
    console.error('Error analyzing file:', error);
    res.status(500).json({ error: 'Internal server error during file analysis' });
  }
});

// API 2: Analyze multiple files and generate contexts
router.post('/analyze-files', authMiddleware, async (req, res) => {
  try {
    const { files } = req.body;
    
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'files array is required and must not be empty' });
    }

    const fileContexts = [];
    const errors = [];

    // Process files in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (file) => {
        try {
          const fileType = getFileType(file.path);
          const analysisPrompt = buildFileAnalysisPrompt(file.path, file.content, fileType);

          const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
          const GEMINI_MODEL = 'gemini-2.0-flash';
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

          const requestBody = {
            contents: [
              {
                role: 'user',
                parts: [{ text: analysisPrompt }]
              }
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 2048,
            }
          };

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': GEMINI_API_KEY,
              'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody)
          });

          const data = await response.json();
          const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;

          if (!content) {
            throw new Error('No content generated');
          }

          // Try to parse the JSON response
          let fileContext;
          try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              fileContext = JSON.parse(jsonMatch[0]);
            } else {
              throw new Error('No JSON found in response');
            }
          } catch (parseError) {
            // Fallback: create a basic context structure
            fileContext = {
              purpose: content.substring(0, 200) + '...',
              keyComponents: [],
              dependencies: [],
              businessLogic: 'Analysis failed to parse properly',
              technicalPatterns: [],
              apis: [],
              dataModels: [],
              securityFeatures: [],
              configuration: '',
              category: getFileType(file.path)
            };
          }

          return {
            filePath: file.path,
            fileContext,
            analysisSuccess: true
          };

        } catch (error) {
          console.error(`Error analyzing file ${file.path}:`, error);
          return {
            filePath: file.path,
            fileContext: {
              purpose: 'Analysis failed',
              keyComponents: [],
              dependencies: [],
              businessLogic: 'Error during analysis',
              technicalPatterns: [],
              apis: [],
              dataModels: [],
              securityFeatures: [],
              configuration: '',
              category: getFileType(file.path)
            },
            analysisSuccess: false,
            error: error.message
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      fileContexts.push(...batchResults);

      // Add a small delay between batches to be respectful to the API
      if (i + batchSize < files.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    res.json({ 
      fileContexts,
      totalFiles: files.length,
      successfulAnalyses: fileContexts.filter(fc => fc.analysisSuccess).length,
      failedAnalyses: fileContexts.filter(fc => !fc.analysisSuccess).length
    });

  } catch (error) {
    console.error('Error analyzing files:', error);
    res.status(500).json({ error: 'Internal server error during batch file analysis' });
  }
});

// Helper function to get embeddings context for document generation
// Supports both single repo URL (string) or multiple repo URLs (array)
async function getEmbeddingsContext(repoUrlOrUrls, documentType) {
  try {
    // Support both single URL (backward compatibility) and array of URLs
    const repoUrls = Array.isArray(repoUrlOrUrls) ? repoUrlOrUrls : [repoUrlOrUrls];
    
    const pklFilenames = [];
    
    // Extract owner and repo from each URL
    for (const repoUrl of repoUrls) {
      if (!repoUrl) continue;
      
      const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!match) {
        continue;
      }
      
      const [, owner, repo] = match;
      const pklFilename = `${owner}_${repo}.pkl`;
      
      // Check if embeddings exist
      const exists = await embeddingFileExists(pklFilename);
      if (exists) {
        pklFilenames.push(pklFilename);
      }
    }
    
    if (pklFilenames.length === 0) {
      return null;
    }
    
    // Build search query based on document type
    let searchQuery = '';
    switch (documentType) {
      case 'business-document':
        searchQuery = 'business logic features functionality user interface API endpoints data models';
        break;
      case 'technical-document':
        searchQuery = 'technical architecture implementation patterns code structure dependencies';
        break;
      case 'code-quality':
        searchQuery = 'code quality best practices error handling testing security performance';
        break;
      default:
        searchQuery = 'main functionality core features implementation';
    }
    
    // Search for relevant code sections (using multi-repo search if multiple repos)
    let searchResults;
    if (pklFilenames.length === 1) {
      // Single repo - use existing search function
      searchResults = await searchRepo(pklFilenames[0], searchQuery, 10);
    } else {
      // Multiple repos - use multi-repo search
      const { searchMultipleRepos } = require('../utils/repoEmbeddingUtils');
      searchResults = await searchMultipleRepos(pklFilenames, searchQuery, 15); // Get more results for multiple repos
    }
    
    // Format results for context
    // Qdrant returns similarity scores (higher is better), not distances
    const embeddingsContext = searchResults.map(result => ({
      path: result.path,
      content: result.content,
      relevance: result.score ? result.score.toFixed(3) : (result.distance ? (1 / (1 + result.distance)).toFixed(3) : '1.0'),
      collectionName: result.collectionName || null, // Include which repo it came from
    }));
    
    return embeddingsContext;
  } catch (error) {
    console.error('Error getting embeddings context:', error);
    return null;
  }
}

// API 3: Generate document from aggregated contexts
router.post('/generate-document-from-contexts', authMiddleware, async (req, res) => {
  try {
    const { fileContexts, documentType, repoUrl, repoUrls } = req.body;
    
    if (!fileContexts || !Array.isArray(fileContexts) || fileContexts.length === 0) {
      return res.status(400).json({ error: 'fileContexts array is required and must not be empty' });
    }

    if (!documentType) {
      return res.status(400).json({ error: 'documentType is required' });
    }

    // Get embeddings context if available
    // Support both single repoUrl (backward compatibility) and multiple repoUrls
    let embeddingsContext = null;
    const reposToSearch = repoUrls || (repoUrl ? [repoUrl] : null);
    if (reposToSearch && reposToSearch.length > 0) {
      embeddingsContext = await getEmbeddingsContext(reposToSearch, documentType);
    }

    const { systemInstruction, userPrompt } = buildContextAggregationPrompt(
      fileContexts, 
      documentType, 
      reposToSearch ? reposToSearch.join(', ') : '',
      embeddingsContext
    );

    // Call Gemini API for document generation
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const GEMINI_MODEL = 'gemini-2.0-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192,
      }
    };

    // Add system instruction if available
    if (systemInstruction) {
      requestBody.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      return res.status(500).json({ error: 'Failed to generate document from contexts' });
    }

    res.json({ 
      documentContent: content,
      documentType,
      repoUrl: reposToSearch ? reposToSearch.join(', ') : repoUrl,
      repoUrls: reposToSearch,
      contextsUsed: fileContexts.length,
      embeddingsContextUsed: embeddingsContext ? embeddingsContext.length : 0,
      generationSuccess: true
    });

  } catch (error) {
    console.error('Error generating document from contexts:', error);
    res.status(500).json({ error: 'Internal server error during document generation' });
  }
});

module.exports = router;
