/**
 * Repository Embedding Utilities
 * 
 * Native Node.js implementation using @xenova/transformers and Qdrant
 */

const {
  generateRepoStore: generateRepoStoreNative,
  getCollectionNameFromRepo,
} = require('./repoEmbeddingNative');

const {
  searchRepo: searchRepoNative,
  searchRepoByKeyword: searchRepoByKeywordNative,
  searchRepoCombined: searchRepoCombinedNative,
  getFileByPath: getFileByPathNative,
  getFilesListFromEmbeddings: getFilesListFromEmbeddingsNative,
  getCollectionName,
  collectionExists,
} = require('./repoSearchNative');

/**
 * Convert pkl filename to collection name
 * Handles backward compatibility with old pkl file naming
 */
function pklFileToCollectionName(pklFile) {
  // Remove .pkl extension
  let name = pklFile.replace(/\.pkl$/, '');
  
  // If it's in format "owner_repo", use it directly
  // Otherwise, try to extract from the name
  if (name.includes('_') && !name.startsWith('repo_')) {
    // Already in owner_repo format
    return `repo_${name}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  }
  
  // Try to extract owner/repo from common patterns
  const match = name.match(/([^\/_]+)_([^\/_]+)/);
  if (match) {
    const [, owner, repo] = match;
    return getCollectionName(owner, repo);
  }
  
  // Fallback: use the name as-is with repo_ prefix
  return `repo_${name}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');
}

/**
 * Generate repository embeddings and save to Qdrant
 * @param {string} repoUrlOrPath - GitHub URL or local directory path
 * @param {string} outputFile - Collection name (for backward compatibility, treated as collection name)
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Result with success status and message
 */
async function generateRepoStore(repoUrlOrPath, outputFile = null, options = {}) {
  if (!repoUrlOrPath) {
    throw new Error('repoUrlOrPath is required');
  }

  // Determine collection name
  let collectionName;
  if (outputFile) {
    // If outputFile is provided, treat it as collection name (or convert from pkl name)
    collectionName = pklFileToCollectionName(outputFile);
  } else {
    // Generate collection name from repo URL/path
    collectionName = getCollectionNameFromRepo(repoUrlOrPath);
  }

  try {
    const result = await generateRepoStoreNative(repoUrlOrPath, collectionName, options);
    
    return {
      success: true,
      outputFile: collectionName, // Return collection name for backward compatibility
      collectionName: collectionName,
      message: 'Repository embeddings generated successfully',
      fileCount: result.fileCount,
      embeddingDim: result.embeddingDim,
    };
  } catch (error) {
    throw new Error(`Failed to generate repository embeddings: ${error.message}`);
  }
}

/**
 * Search repository embeddings
 * @param {string} pklFile - Collection name (converted from pkl filename for backward compatibility)
 * @param {string} query - Search query
 * @param {number} topK - Number of results to return (default: 5)
 * @returns {Promise<Array>} - Array of search results
 */
async function searchRepo(pklFile, query, topK = 5) {
  if (!pklFile || !query) {
    throw new Error('pklFile and query are required');
  }

  const collectionName = pklFileToCollectionName(pklFile);
  
  try {
    const results = await searchRepoNative(collectionName, query, topK);
    return results;
  } catch (error) {
    throw new Error(`Search failed: ${error.message}`);
  }
}

/**
 * Search repository by keyword
 * @param {string} pklFile - Collection name
 * @param {string} keyword - Keyword to search for
 * @param {number} topK - Number of results
 * @returns {Promise<Array>} - Array of search results
 */
async function searchRepoByKeyword(pklFile, keyword, topK = 5) {
  if (!pklFile || !keyword) {
    throw new Error('pklFile and keyword are required');
  }

  const collectionName = pklFileToCollectionName(pklFile);
  
  try {
    const results = await searchRepoByKeywordNative(collectionName, keyword, topK);
    return results;
  } catch (error) {
    throw new Error(`Keyword search failed: ${error.message}`);
  }
}

/**
 * Combined vector and keyword search
 * @param {string} pklFile - Collection name
 * @param {string} query - Vector search query
 * @param {string} keyword - Keyword search term
 * @param {number} topK - Number of results
 * @param {number} vectorWeight - Weight for vector search (0-1)
 * @returns {Promise<Array>} - Array of search results
 */
async function searchRepoCombined(pklFile, query, keyword, topK = 5, vectorWeight = 0.7) {
  if (!pklFile || !query) {
    throw new Error('pklFile and query are required');
  }

  const collectionName = pklFileToCollectionName(pklFile);
  
  try {
    const results = await searchRepoCombinedNative(collectionName, query, keyword, topK, vectorWeight);
    return results;
  } catch (error) {
    throw new Error(`Combined search failed: ${error.message}`);
  }
}

/**
 * Get file by exact path
 * @param {string} pklFile - Collection name
 * @param {string} filePath - Exact file path
 * @returns {Promise<Object|null>} - File object or null if not found
 */
async function getFileByPath(pklFile, filePath) {
  if (!pklFile || !filePath) {
    throw new Error('pklFile and filePath are required');
  }

  const collectionName = pklFileToCollectionName(pklFile);
  
  try {
    const result = await getFileByPathNative(collectionName, filePath);
    return result;
  } catch (error) {
    throw new Error(`Failed to get file by path: ${error.message}`);
  }
}

/**
 * Get list of all files from embeddings
 * @param {string} pklFile - Collection name
 * @returns {Promise<Array>} - Array of file objects with path and size
 */
async function getFilesListFromEmbeddings(pklFile) {
  if (!pklFile) {
    throw new Error('pklFile is required');
  }

  const collectionName = pklFileToCollectionName(pklFile);
  
  try {
    const files = await getFilesListFromEmbeddingsNative(collectionName);
    return files;
  } catch (error) {
    throw new Error(`Failed to get files list: ${error.message}`);
  }
}

/**
 * Check if embedding collection exists
 * @param {string} pklFile - Collection name (converted from pkl filename)
 * @returns {Promise<boolean>}
 */
async function embeddingFileExists(pklFile) {
  if (!pklFile) {
    return false;
  }

  try {
    const collectionName = pklFileToCollectionName(pklFile);
    const exists = await collectionExists(collectionName);
    return exists;
  } catch {
    return false;
  }
}

/**
 * Search across multiple repositories
 * @param {Array<string>} pklFiles - Array of collection names (converted from pkl filenames)
 * @param {string} query - Search query
 * @param {number} topK - Number of results to return (default: 5)
 * @returns {Promise<Array>} - Array of search results
 */
async function searchMultipleRepos(pklFiles, query, topK = 5) {
  if (!Array.isArray(pklFiles) || pklFiles.length === 0) {
    throw new Error('pklFiles must be a non-empty array');
  }

  if (!query) {
    throw new Error('query is required');
  }

  const collectionNames = pklFiles.map(pklFile => pklFileToCollectionName(pklFile));
  
  try {
    const { searchMultipleRepos: searchMultipleReposNative } = require('./repoSearchNative');
    const results = await searchMultipleReposNative(collectionNames, query, topK);
    return results;
  } catch (error) {
    throw new Error(`Multi-repo search failed: ${error.message}`);
  }
}

// Alias for backward compatibility
const searchRepoJSON = searchRepo;

module.exports = {
  generateRepoStore,
  searchRepo,
  searchRepoJSON,
  searchRepoByKeyword,
  searchRepoCombined,
  searchMultipleRepos,
  getFileByPath,
  getFilesListFromEmbeddings,
  embeddingFileExists,
  // Export helper functions for direct use
  pklFileToCollectionName,
  getCollectionName,
  collectionExists,
};
