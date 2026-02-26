/**
 * Repository Embedding Routes
 * 
 * API endpoints for repository embedding and semantic search
 */

const express = require('express');
const router = express.Router();
const { generateRepoStore, searchRepo, searchRepoByKeyword, searchRepoCombined, searchMultipleRepos, getFileByPath, getFilesListFromEmbeddings, embeddingFileExists } = require('../utils/repoEmbeddingUtils');
const { authMiddleware } = require('./documents');

/**
 * POST /api/repo-embedding/generate
 * Generate embeddings for a repository (GitHub URL or local path)
 * 
 * Body:
 *   - repoUrlOrPath: string (required) - GitHub URL or local directory path
 *   - outputFile: string (optional) - Output pickle file name (default: repo_store.pkl)
 */
router.post('/generate', authMiddleware, async (req, res) => {
    try {
        const { repoUrlOrPath, outputFile } = req.body;

        if (!repoUrlOrPath) {
            return res.status(400).json({ 
                error: 'repoUrlOrPath is required',
                message: 'Please provide either a GitHub URL or local directory path'
            });
        }

        const outputFileName = outputFile || `repo_store_${Date.now()}.pkl`;
        
        // Track progress
        const progressMessages = [];
        const onProgress = (message) => {
            progressMessages.push(message.trim());
        };

        const result = await generateRepoStore(repoUrlOrPath, outputFileName, { onProgress });

        res.json({
            success: true,
            message: result.message,
            outputFile: result.outputFile,
            fileCount: result.fileCount,
            progress: progressMessages
        });

    } catch (error) {
        console.error('Error generating repository embeddings:', error);
        res.status(500).json({ 
            error: 'Failed to generate repository embeddings',
            message: error.message,
            details: error.stderr || error.stdout
        });
    }
});

/**
 * POST /api/repo-embedding/search
 * Search repository embeddings
 * 
 * Body:
 *   - pklFile: string (required) - Path to the pickle file
 *   - query: string (required) - Search query
 *   - topK: number (optional) - Number of results (default: 5)
 */
router.post('/search', authMiddleware, async (req, res) => {
    try {
        const { pklFile, query, topK } = req.body;

        if (!pklFile || !query) {
            return res.status(400).json({ 
                error: 'pklFile and query are required'
            });
        }

        const topKValue = topK && topK > 0 ? Math.min(topK, 50) : 5; // Limit to 50 results

        const results = await searchRepo(pklFile, query, topKValue);

        res.json({
            success: true,
            query,
            results,
            count: results.length
        });

    } catch (error) {
        console.error('Error searching repository:', error);
        res.status(500).json({ 
            error: 'Failed to search repository',
            message: error.message
        });
    }
});

/**
 * GET /api/repo-embedding/check/:filename
 * Check if an embedding file exists
 */
router.get('/check/:filename', authMiddleware, async (req, res) => {
    try {
        const { filename } = req.params;
        const exists = await embeddingFileExists(filename);

        res.json({
            exists,
            filename
        });

    } catch (error) {
        console.error('Error checking embedding file:', error);
        res.status(500).json({ 
            error: 'Failed to check embedding file',
            message: error.message
        });
    }
});

/**
 * POST /api/repo-embedding/ensure
 * Ensure embeddings exist for a repository - generates them if they don't exist
 * 
 * Body:
 *   - repoUrl: string (required) - GitHub repository URL
 *   - pklFilename: string (optional) - Custom pkl filename (default: auto-generated from repo)
 *   - autoGenerate: boolean (optional) - Whether to auto-generate if missing (default: true)
 */
router.post('/ensure', authMiddleware, async (req, res) => {
    try {
        const { repoUrl, pklFilename, autoGenerate = true } = req.body;

        if (!repoUrl) {
            return res.status(400).json({ 
                error: 'repoUrl is required',
                message: 'Please provide a GitHub repository URL'
            });
        }

        // Extract owner and repo from URL
        const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (!match) {
            return res.status(400).json({ 
                error: 'Invalid GitHub repository URL',
                message: 'URL must be in format: https://github.com/owner/repo'
            });
        }

        const [, owner, repo] = match;
        const finalPklFilename = pklFilename || `${owner}_${repo}.pkl`;

        // Check if embeddings exist
        const exists = await embeddingFileExists(finalPklFilename);

        if (exists) {
            return res.json({
                success: true,
                exists: true,
                filename: finalPklFilename,
                message: 'Embeddings already exist',
                generated: false
            });
        }

        // If embeddings don't exist and autoGenerate is true, generate them
        if (autoGenerate) {
            try {
                const progressMessages = [];
                const onProgress = (message) => {
                    progressMessages.push(message.trim());
                };

                const result = await generateRepoStore(repoUrl, finalPklFilename, { onProgress });

                return res.json({
                    success: true,
                    exists: true,
                    filename: finalPklFilename,
                    collectionName: result.collectionName,
                    fileCount: result.fileCount,
                    message: 'Embeddings generated successfully',
                    generated: true,
                    progress: progressMessages
                });
            } catch (generateError) {
                console.error('Error generating embeddings:', generateError);
                return res.status(500).json({ 
                    error: 'Failed to generate embeddings',
                    message: generateError.message,
                    exists: false,
                    generated: false
                });
            }
        } else {
            // Embeddings don't exist and autoGenerate is false
            return res.json({
                success: true,
                exists: false,
                filename: finalPklFilename,
                message: 'Embeddings do not exist',
                generated: false
            });
        }

    } catch (error) {
        console.error('Error ensuring embeddings:', error);
        res.status(500).json({ 
            error: 'Failed to ensure embeddings',
            message: error.message
        });
    }
});

/**
 * GET /api/repo-embedding/files/:pklFile
 * Get list of all files from embeddings (paths only, no content)
 */
router.get('/files/:pklFile', authMiddleware, async (req, res) => {
    try {
        const { pklFile } = req.params;
        const files = await getFilesListFromEmbeddings(pklFile);

        res.json({
            success: true,
            files,
            count: files.length
        });

    } catch (error) {
        console.error('Error getting files list from embeddings:', error);
        res.status(500).json({ 
            error: 'Failed to get files list',
            message: error.message
        });
    }
});

/**
 * POST /api/repo-embedding/search-by-keyword
 * Search repository by keyword
 * 
 * Body:
 *   - pklFile: string (required)
 *   - keyword: string (required)
 *   - topK: number (optional)
 */
router.post('/search-by-keyword', authMiddleware, async (req, res) => {
    try {
        const { pklFile, keyword, topK } = req.body;

        if (!pklFile || !keyword) {
            return res.status(400).json({ 
                error: 'pklFile and keyword are required'
            });
        }

        const topKValue = topK && topK > 0 ? Math.min(topK, 50) : 5;

        const results = await searchRepoByKeyword(pklFile, keyword, topKValue);

        res.json({
            success: true,
            keyword,
            results,
            count: results.length
        });

    } catch (error) {
        console.error('Error searching repository by keyword:', error);
        res.status(500).json({ 
            error: 'Failed to search repository by keyword',
            message: error.message
        });
    }
});

/**
 * POST /api/repo-embedding/search-multiple
 * Search across multiple repositories
 * 
 * Body:
 *   - pklFiles: array of strings (required) - Array of pkl filenames/collection names
 *   - query: string (required) - Search query
 *   - topK: number (optional) - Number of results (default: 5)
 */
router.post('/search-multiple', authMiddleware, async (req, res) => {
    try {
        const { pklFiles, query, topK } = req.body;

        if (!pklFiles || !Array.isArray(pklFiles) || pklFiles.length === 0) {
            return res.status(400).json({ 
                error: 'pklFiles array is required and must not be empty'
            });
        }

        if (!query) {
            return res.status(400).json({ 
                error: 'query is required'
            });
        }

        const topKValue = topK && topK > 0 ? Math.min(topK, 50) : 5;

        const results = await searchMultipleRepos(pklFiles, query, topKValue);

        res.json({
            success: true,
            query,
            results,
            count: results.length,
            repositoriesSearched: pklFiles.length
        });

    } catch (error) {
        console.error('Error searching multiple repositories:', error);
        res.status(500).json({ 
            error: 'Failed to search multiple repositories',
            message: error.message
        });
    }
});

/**
 * POST /api/repo-embedding/search-combined
 * Combined vector and keyword search
 * 
 * Body:
 *   - pklFile: string (required)
 *   - query: string (required) - Semantic search query
 *   - keyword: string (optional) - Keyword for keyword search
 *   - topK: number (optional)
 *   - vectorWeight: number (optional) - Weight for vector search (0-1, default 0.7)
 */
router.post('/search-combined', authMiddleware, async (req, res) => {
    try {
        const { pklFile, query, keyword, topK, vectorWeight } = req.body;

        if (!pklFile || !query) {
            return res.status(400).json({ 
                error: 'pklFile and query are required'
            });
        }

        const topKValue = topK && topK > 0 ? Math.min(topK, 50) : 5;
        const weight = vectorWeight && vectorWeight >= 0 && vectorWeight <= 1 ? vectorWeight : 0.7;

        const results = await searchRepoCombined(pklFile, query, keyword || null, topKValue, weight);

        res.json({
            success: true,
            query,
            keyword: keyword || null,
            results,
            count: results.length
        });

    } catch (error) {
        console.error('Error in combined search:', error);
        res.status(500).json({ 
            error: 'Failed to perform combined search',
            message: error.message
        });
    }
});

/**
 * GET /api/repo-embedding/file/:pklFile
 * Get file by exact path from embeddings
 * 
 * Query params:
 *   - path: string (required) - Exact file path
 */
router.get('/file/:pklFile', authMiddleware, async (req, res) => {
    try {
        const { pklFile } = req.params;
        const { path: filePath } = req.query;

        if (!filePath) {
            return res.status(400).json({ 
                error: 'path query parameter is required'
            });
        }

        const result = await getFileByPath(pklFile, filePath);

        if (!result) {
            return res.status(404).json({ 
                error: 'File not found',
                path: filePath
            });
        }

        res.json({
            success: true,
            file: result
        });

    } catch (error) {
        console.error('Error getting file by path:', error);
        res.status(500).json({ 
            error: 'Failed to get file',
            message: error.message
        });
    }
});

/**
 * POST /api/repo-embedding/generate-and-search
 * Generate embeddings and immediately perform a search
 * 
 * Body:
 *   - repoUrlOrPath: string (required)
 *   - query: string (required)
 *   - outputFile: string (optional)
 *   - topK: number (optional)
 */
router.post('/generate-and-search', authMiddleware, async (req, res) => {
    try {
        const { repoUrlOrPath, query, outputFile, topK } = req.body;

        if (!repoUrlOrPath || !query) {
            return res.status(400).json({ 
                error: 'repoUrlOrPath and query are required'
            });
        }

        const outputFileName = outputFile || `repo_store_${Date.now()}.pkl`;
        const topKValue = topK && topK > 0 ? Math.min(topK, 50) : 5;

        // Generate embeddings
        const generateResult = await generateRepoStore(repoUrlOrPath, outputFileName);

        // Perform search
        const searchResults = await searchRepo(outputFileName, query, topKValue);

        res.json({
            success: true,
            embedding: {
                outputFile: generateResult.outputFile,
                fileCount: generateResult.fileCount
            },
            search: {
                query,
                results: searchResults,
                count: searchResults.length
            }
        });

    } catch (error) {
        console.error('Error in generate-and-search:', error);
        res.status(500).json({ 
            error: 'Failed to generate embeddings and search',
            message: error.message,
            details: error.stderr || error.stdout
        });
    }
});

module.exports = router;

