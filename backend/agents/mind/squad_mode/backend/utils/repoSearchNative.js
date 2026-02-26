/**
 * Native Node.js Repository Search Utilities
 * 
 * Uses Qdrant for vector search and @xenova/transformers for query embedding
 */

const { getQdrantClient, getCollectionName, collectionExists } = require('./qdrantClient');

// Model name - same as embedding model
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

let embeddingModel = null;
let transformersModule = null;

/**
 * Load transformers module (ES module, must use dynamic import)
 */
async function getTransformersModule() {
  if (!transformersModule) {
    transformersModule = await import('@xenova/transformers');
  }
  return transformersModule;
}

/**
 * Initialize the embedding model (lazy loading)
 */
async function getEmbeddingModel() {
  if (!embeddingModel) {
    console.log(`Loading embedding model: ${MODEL_NAME}`);
    const { pipeline } = await getTransformersModule();
    embeddingModel = await pipeline('feature-extraction', MODEL_NAME);
    console.log('Embedding model loaded');
  }
  return embeddingModel;
}

/**
 * Embed a query string
 */
async function embedQuery(query) {
  const model = await getEmbeddingModel();
  const output = await model(query, {
    pooling: 'mean',
    normalize: false,
  });
  return Array.from(output.data);
}

/**
 * Vector search in Qdrant
 */
async function searchRepo(collectionName, query, topK = 5) {
  if (!query) {
    throw new Error('Query is required');
  }
  
  // Check if collection exists
  const exists = await collectionExists(collectionName);
  if (!exists) {
    throw new Error(`Collection ${collectionName} does not exist`);
  }
  
  // Embed query
  const queryVector = await embedQuery(query);
  
  // Search in Qdrant
  const client = getQdrantClient();
  const searchResult = await client.search(collectionName, {
    vector: queryVector,
    limit: topK,
    with_payload: true,
  });
  
  // Format results
  const results = searchResult.map((hit, index) => ({
    path: hit.payload.path,
    content: hit.payload.content,
    distance: hit.score, // Qdrant returns similarity score (higher is better)
    score: hit.score,
  }));
  
  return results;
}

/**
 * Keyword search (searches in payload)
 */
async function searchRepoByKeyword(collectionName, keyword, topK = 5) {
  if (!keyword) {
    throw new Error('Keyword is required');
  }
  
  // Check if collection exists
  const exists = await collectionExists(collectionName);
  if (!exists) {
    throw new Error(`Collection ${collectionName} does not exist`);
  }
  
  const client = getQdrantClient();
  
  // Use scroll to get all points and filter by keyword
  const keywordLower = keyword.toLowerCase();
  const allPoints = [];
  let offset = null;
  
  do {
    const scrollResult = await client.scroll(collectionName, {
      limit: 100,
      offset: offset,
      with_payload: true,
      with_vector: false,
    });
    
    allPoints.push(...scrollResult.points);
    offset = scrollResult.next_page_offset;
  } while (offset !== null);
  
  // Filter and score by keyword matches
  const scored = allPoints.map(point => {
    const path = point.payload.path || '';
    const content = point.payload.content || '';
    
    let score = 0;
    
    // Path matches (higher weight)
    if (path.toLowerCase().includes(keywordLower)) {
      score += 10;
      if (path.toLowerCase().endsWith(keywordLower)) {
        score += 5;
      }
    }
    
    // Content matches
    const contentLower = content.toLowerCase();
    const matches = (contentLower.match(new RegExp(keywordLower, 'g')) || []).length;
    if (matches > 0) {
      score += Math.min(matches, 5);
    }
    
    return {
      id: point.id,
      path: path,
      content: content,
      score: score,
    };
  }).filter(item => item.score > 0);
  
  // Sort by score and return top K
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map(item => ({
    path: item.path,
    content: item.content,
    score: item.score,
    distance: null, // Not applicable for keyword search
  }));
}

/**
 * Combined vector and keyword search
 */
async function searchRepoCombined(collectionName, query, keyword = null, topK = 5, vectorWeight = 0.7) {
  const vectorResults = await searchRepo(collectionName, query, topK * 2);
  let keywordResults = [];
  
  if (keyword) {
    keywordResults = await searchRepoByKeyword(collectionName, keyword, topK * 2);
  }
  
  // Normalize scores
  if (vectorResults.length > 0) {
    const maxScore = Math.max(...vectorResults.map(r => r.score || 0));
    if (maxScore > 0) {
      vectorResults.forEach(r => {
        r.normalized_score = (r.score || 0) / maxScore;
      });
    }
  }
  
  if (keywordResults.length > 0) {
    const maxScore = Math.max(...keywordResults.map(r => r.score || 0));
    if (maxScore > 0) {
      keywordResults.forEach(r => {
        r.normalized_score = (r.score || 0) / maxScore;
      });
    }
  }
  
  // Combine results
  const combined = new Map();
  
  vectorResults.forEach(r => {
    if (!combined.has(r.path)) {
      combined.set(r.path, {
        path: r.path,
        content: r.content,
        vector_score: r.normalized_score || 0,
        keyword_score: 0,
        combined_score: 0,
      });
    } else {
      combined.get(r.path).vector_score = r.normalized_score || 0;
    }
  });
  
  keywordResults.forEach(r => {
    if (!combined.has(r.path)) {
      combined.set(r.path, {
        path: r.path,
        content: r.content,
        vector_score: 0,
        keyword_score: r.normalized_score || 0,
        combined_score: 0,
      });
    } else {
      combined.get(r.path).keyword_score = r.normalized_score || 0;
    }
  });
  
  // Calculate combined scores
  const finalResults = Array.from(combined.values()).map(result => {
    result.combined_score = (
      vectorWeight * result.vector_score +
      (1 - vectorWeight) * result.keyword_score
    );
    return result;
  });
  
  // Sort by combined score and return top K
  finalResults.sort((a, b) => b.combined_score - a.combined_score);
  return finalResults.slice(0, topK);
}

/**
 * Get file by exact path
 */
async function getFileByPath(collectionName, filePath) {
  const exists = await collectionExists(collectionName);
  if (!exists) {
    throw new Error(`Collection ${collectionName} does not exist`);
  }
  
  const client = getQdrantClient();
  
  // Use scroll to find the file
  let offset = null;
  
  do {
    const scrollResult = await client.scroll(collectionName, {
      limit: 100,
      offset: offset,
      with_payload: true,
      with_vector: false,
    });
    
    const found = scrollResult.points.find(
      point => point.payload.path === filePath
    );
    
    if (found) {
      return {
        path: found.payload.path,
        content: found.payload.content,
        distance: 0,
        score: 100,
      };
    }
    
    offset = scrollResult.next_page_offset;
  } while (offset !== null);
  
  return null;
}

/**
 * Get list of all files in collection
 */
async function getFilesListFromEmbeddings(collectionName) {
  const exists = await collectionExists(collectionName);
  if (!exists) {
    throw new Error(`Collection ${collectionName} does not exist`);
  }
  
  const client = getQdrantClient();
  
  const files = [];
  let offset = null;
  
  do {
    const scrollResult = await client.scroll(collectionName, {
      limit: 100,
      offset: offset,
      with_payload: true,
      with_vector: false,
    });
    
    scrollResult.points.forEach(point => {
      files.push({
        path: point.payload.path,
        size: point.payload.content_length || 0,
      });
    });
    
    offset = scrollResult.next_page_offset;
  } while (offset !== null);
  
  return files;
}

/**
 * Search across multiple repository collections
 * Searches each collection and combines results, then returns top K overall
 */
async function searchMultipleRepos(collectionNames, query, topK = 5) {
  if (!Array.isArray(collectionNames) || collectionNames.length === 0) {
    throw new Error('collectionNames must be a non-empty array');
  }
  
  if (!query) {
    throw new Error('Query is required');
  }
  
  // Embed query once for all searches
  const queryVector = await embedQuery(query);
  
  const client = getQdrantClient();
  const allResults = [];
  
  // Search each collection
  for (const collectionName of collectionNames) {
    const exists = await collectionExists(collectionName);
    if (!exists) {
      console.warn(`Collection ${collectionName} does not exist, skipping`);
      continue;
    }
    
    try {
      // Search in this collection, get more results than needed to allow for better ranking across repos
      const searchResult = await client.search(collectionName, {
        vector: queryVector,
        limit: topK * 2, // Get more results from each repo
        with_payload: true,
      });
      
      // Add collection name to results for tracking
      searchResult.forEach(hit => {
        allResults.push({
          path: hit.payload.path,
          content: hit.payload.content,
          score: hit.score,
          distance: hit.score,
          collectionName: collectionName, // Track which repo this came from
        });
      });
    } catch (error) {
      console.warn(`Error searching collection ${collectionName}:`, error.message);
      continue;
    }
  }
  
  // Sort all results by score (higher is better in Qdrant)
  allResults.sort((a, b) => b.score - a.score);
  
  // Return top K results
  return allResults.slice(0, topK);
}

module.exports = {
  searchRepo,
  searchRepoByKeyword,
  searchRepoCombined,
  searchMultipleRepos,
  getFileByPath,
  getFilesListFromEmbeddings,
  getCollectionName,
  collectionExists,
};

