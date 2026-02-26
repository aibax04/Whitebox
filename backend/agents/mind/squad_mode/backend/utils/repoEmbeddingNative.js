/**
 * Native Node.js Repository Embedding Utilities
 * 
 * Uses @xenova/transformers for embeddings and Qdrant for storage
 */

const fs = require('fs').promises;
const path = require('path');
const simpleGit = require('simple-git');
const { getQdrantClient, getCollectionNameFromRepo, ensureCollection } = require('./qdrantClient');

// Allowed file extensions
const ALLOWED_EXTENSIONS = new Set([
  '.py', '.js', '.ts', '.tsx', '.jsx', '.java', '.sql', '.json', '.md'
]);

// Directories to skip
const SKIP_DIRS = new Set([
  '.git', 'node_modules', '__pycache__', '.venv', 'venv', 'dist', 'build', '.next', '.nuxt'
]);

// Model name - same as Python version
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
const EMBEDDING_DIM = 384; // Dimension for all-MiniLM-L6-v2

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
 * Check if a file is binary
 */
async function isBinaryFile(filePath) {
  try {
    const buffer = await fs.readFile(filePath);
    // Check for null bytes
    if (buffer.includes(0)) {
      return true;
    }
    // Try to decode as UTF-8
    buffer.toString('utf-8');
    return false;
  } catch (error) {
    return true;
  }
}

/**
 * Clone a GitHub repository
 */
async function cloneRepo(repoUrl, targetDir = null) {
  const tempDir = require('os').tmpdir();
  const target = targetDir || path.join(tempDir, `repo_clone_${Date.now()}`);
  
  // Check if already cloned
  if (await fs.access(path.join(target, '.git')).then(() => true).catch(() => false)) {
    console.log(`Repository already exists at ${target}, skipping clone.`);
    return target;
  }
  
  try {
    await fs.mkdir(target, { recursive: true });
    console.log(`Cloning repository from ${repoUrl} to ${target}...`);
    
    const git = simpleGit();
    await git.clone(repoUrl, target, ['--depth', '1']);
    
    console.log(`Successfully cloned repository to ${target}`);
    return target;
  } catch (error) {
    throw new Error(`Failed to clone repository: ${error.message}`);
  }
}

/**
 * Recursively load all code/documentation files from a directory
 */
async function loadRepoFiles(repoPath) {
  const files = [];
  const repoPathAbs = path.resolve(repoPath);
  
  if (!(await fs.access(repoPathAbs).then(() => true).catch(() => false))) {
    throw new Error(`Path does not exist: ${repoPath}`);
  }
  
  const stats = await fs.stat(repoPathAbs);
  if (!stats.isDirectory()) {
    throw new Error(`Path is not a directory: ${repoPath}`);
  }
  
  console.log(`Loading files from ${repoPathAbs}...`);
  
  async function walkDir(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(repoPathAbs, fullPath);
      
      // Skip directories
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) {
          continue;
        }
        await walkDir(fullPath);
        continue;
      }
      
      // Check extension
      const ext = path.extname(entry.name).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        continue;
      }
      
      // Skip binary files
      if (await isBinaryFile(fullPath)) {
        continue;
      }
      
      // Read file content
      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        files.push({
          path: relativePath.replace(/\\/g, '/'), // Normalize path separators
          content: content
        });
      } catch (error) {
        console.warn(`Could not read file ${fullPath}: ${error.message}`);
      }
    }
  }
  
  await walkDir(repoPathAbs);
  console.log(`Successfully loaded ${files.length} files.`);
  return files;
}

/**
 * Generate embeddings for files
 */
async function embedFiles(files) {
  if (files.length === 0) {
    throw new Error('No files provided for embedding');
  }
  
  const model = await getEmbeddingModel();
  console.log(`Generating embeddings for ${files.length} files...`);
  
  const contents = files.map(f => f.content);
  const embeddings = [];
  
  // Process in batches to avoid memory issues
  const batchSize = 32;
  for (let i = 0; i < contents.length; i += batchSize) {
    const batch = contents.slice(i, i + batchSize);
    
    // Process each item in the batch
    const batchPromises = batch.map(async (text) => {
      const output = await model(text, {
        pooling: 'mean',
        normalize: false,
      });
      return Array.from(output.data);
    });
    
    const batchEmbeddings = await Promise.all(batchPromises);
    embeddings.push(...batchEmbeddings);
    
    if ((i + batchSize) % 100 === 0 || i + batchSize >= contents.length) {
      console.log(`Processed ${Math.min(i + batchSize, contents.length)}/${contents.length} files`);
    }
  }
  
  console.log(`Generated embeddings with dimension ${embeddings[0]?.length || 0}`);
  return embeddings;
}

/**
 * Save embeddings to Qdrant
 */
async function saveEmbeddingsToQdrant(files, embeddings, collectionName) {
  if (files.length !== embeddings.length) {
    throw new Error(`Mismatch: ${files.length} files but ${embeddings.length} embeddings`);
  }
  
  // Ensure collection exists
  await ensureCollection(collectionName, EMBEDDING_DIM);
  
  const client = getQdrantClient();
  
  console.log(`Saving ${files.length} embeddings to Qdrant collection: ${collectionName}`);
  
  // Prepare points for Qdrant
  const points = files.map((file, index) => ({
    id: index,
    vector: embeddings[index],
    payload: {
      path: file.path,
      content: file.content,
      content_length: file.content.length,
    }
  }));
  
  // Upload in batches
  const batchSize = 100;
  for (let i = 0; i < points.length; i += batchSize) {
    const batch = points.slice(i, i + batchSize);
    await client.upsert(collectionName, {
      wait: true,
      points: batch,
    });
    
    if ((i + batchSize) % 500 === 0) {
      console.log(`Uploaded ${Math.min(i + batchSize, points.length)}/${points.length} points`);
    }
  }
  
  console.log(`Successfully saved ${files.length} embeddings to Qdrant`);
}

/**
 * Main function to generate repository embeddings and save to Qdrant
 */
async function generateRepoStore(repoUrlOrPath, collectionName = null, options = {}) {
  const { cleanup = true } = options;
  let tempCloneDir = null;
  
  try {
    // Determine if input is a URL or local path
    const isUrl = repoUrlOrPath.startsWith('http://') || 
                  repoUrlOrPath.startsWith('https://') || 
                  repoUrlOrPath.startsWith('git@');
    
    let repoPath;
    if (isUrl) {
      // Clone repository
      tempCloneDir = await cloneRepo(repoUrlOrPath);
      repoPath = tempCloneDir;
    } else {
      // Use local path
      repoPath = path.resolve(repoUrlOrPath);
      if (!(await fs.access(repoPath).then(() => true).catch(() => false))) {
        throw new Error(`Local path does not exist: ${repoPath}`);
      }
    }
    
    // Load files
    const files = await loadRepoFiles(repoPath);
    
    if (files.length === 0) {
      throw new Error('No files found to process. Check that the repository contains code/documentation files.');
    }
    
    // Generate embeddings
    const embeddings = await embedFiles(files);
    
    // Determine collection name
    const finalCollectionName = collectionName || getCollectionNameFromRepo(repoUrlOrPath);
    
    // Save to Qdrant
    await saveEmbeddingsToQdrant(files, embeddings, finalCollectionName);
    
    console.log(`\n✓ Successfully generated repository store: ${finalCollectionName}`);
    console.log(`  - Files processed: ${files.length}`);
    console.log(`  - Embedding dimensions: ${embeddings[0]?.length || 0}`);
    
    return {
      success: true,
      collectionName: finalCollectionName,
      fileCount: files.length,
      embeddingDim: embeddings[0]?.length || 0,
    };
    
  } finally {
    // Cleanup temporary clone directory if needed
    if (cleanup && tempCloneDir) {
      try {
        await fs.rm(tempCloneDir, { recursive: true, force: true });
        console.log(`Cleaned up temporary directory: ${tempCloneDir}`);
      } catch (error) {
        console.warn(`Failed to cleanup temporary directory: ${error.message}`);
      }
    }
  }
}

module.exports = {
  generateRepoStore,
  loadRepoFiles,
  embedFiles,
  getCollectionNameFromRepo,
  EMBEDDING_DIM,
};

