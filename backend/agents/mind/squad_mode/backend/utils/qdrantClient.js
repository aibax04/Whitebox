/**
 * Qdrant Client Utility
 * 
 * Manages connection to Qdrant vector database
 */

const { QdrantClient } = require('@qdrant/js-client-rest');
const path = require('path');

// Initialize Qdrant client
// Supports both local and cloud Qdrant instances
const getQdrantClient = () => {
  const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
  const qdrantApiKey = process.env.QDRANT_API_KEY || null;

  const config = {
    url: qdrantUrl,
  };

  if (qdrantApiKey) {
    config.apiKey = qdrantApiKey;
  }

  return new QdrantClient(config);
};

// Get collection name for a repository
const getCollectionName = (owner, repo) => {
  return `repo_${owner}_${repo}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');
};

// Generate collection name from repo URL or path
const getCollectionNameFromRepo = (repoUrlOrPath) => {
  // Try to extract owner/repo from GitHub URL
  const match = repoUrlOrPath.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (match) {
    const [, owner, repo] = match;
    return getCollectionName(owner, repo.replace('.git', ''));
  }
  
  // For local paths, use a hash or sanitized path
  const path = require('path');
  const crypto = require('crypto');
  const sanitized = repoUrlOrPath.replace(/[^a-zA-Z0-9]/g, '_');
  const hash = crypto.createHash('md5').update(repoUrlOrPath).digest('hex').substring(0, 8);
  return `repo_local_${hash}`;
};

// Ensure collection exists with proper configuration
const ensureCollection = async (collectionName, vectorSize = 384) => {
  const client = getQdrantClient();
  
  try {
    // Check if collection exists
    const collections = await client.getCollections();
    const exists = collections.collections.some(c => c.name === collectionName);
    
    if (!exists) {
      // Create collection with proper configuration
      await client.createCollection(collectionName, {
        vectors: {
          size: vectorSize,
          distance: 'Cosine', // or 'Euclidean', 'Dot'
        },
      });
      console.log(`Created Qdrant collection: ${collectionName}`);
    }
    
    return true;
  } catch (error) {
    console.error(`Error ensuring collection ${collectionName}:`, error);
    throw error;
  }
};

// Delete collection (for cleanup)
const deleteCollection = async (collectionName) => {
  const client = getQdrantClient();
  
  try {
    await client.deleteCollection(collectionName);
    console.log(`Deleted Qdrant collection: ${collectionName}`);
    return true;
  } catch (error) {
    // Collection might not exist, that's okay
    if (error.status === 404) {
      return true;
    }
    console.error(`Error deleting collection ${collectionName}:`, error);
    throw error;
  }
};

// Check if collection exists
const collectionExists = async (collectionName) => {
  const client = getQdrantClient();
  
  try {
    const collections = await client.getCollections();
    return collections.collections.some(c => c.name === collectionName);
  } catch (error) {
    console.error(`Error checking collection ${collectionName}:`, error);
    return false;
  }
};

module.exports = {
  getQdrantClient,
  getCollectionName,
  getCollectionNameFromRepo,
  ensureCollection,
  deleteCollection,
  collectionExists,
};

