// TODO: Import prompts from backend instead of defining them locally
// The prompts have been moved to backend/prompts/chatbot/
// Update this file to fetch prompts from backend API endpoints

import { toast } from "sonner";

interface FileData {
  path: string;
  content: string;
}

interface RepositoryContext {
  summary: string;
  techStack: string[];
  keyFeatures: string[];
  architecture: string;
  businessValue: string;
  fileMap: Record<string, FileAnalysis>;
  totalFiles: number;
  analyzedAt: Date;
}

interface FileAnalysis {
  purpose: string;
  keyFunctions: string[];
  dependencies: string[];
  exports: string[];
  complexity: 'low' | 'medium' | 'high';
  category: string;
}

/**
 * Analyze repository comprehensively including all files
 */
export const analyzeRepositoryContext = async (
  files: FileData[],
  repoUrl: string
): Promise<RepositoryContext> => {
  // First, analyze individual files in batches
  const fileAnalyses = await analyzeAllFiles(files);
  
  // Then create overall repository context
  const overallContext = await analyzeOverallRepository(files, repoUrl, fileAnalyses);
  
  return {
    ...overallContext,
    fileMap: fileAnalyses,
    totalFiles: files.length,
    analyzedAt: new Date()
  };
};

/**
 * Analyze all files individually to understand their purpose and structure
 */
const analyzeAllFiles = async (files: FileData[]): Promise<Record<string, FileAnalysis>> => {
  const analyses: Record<string, FileAnalysis> = {};
  const batchSize = 5; // Process files in smaller batches
  
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    
    const batchAnalyses = await Promise.all(
      batch.map(async (file) => {
        try {
          const analysis = await analyzeIndividualFile(file);
          return { path: file.path, analysis };
        } catch (error) {
          console.error(`Error analyzing file ${file.path}:`, error);
          return {
            path: file.path,
            analysis: {
              purpose: "File analysis unavailable",
              keyFunctions: [],
              dependencies: [],
              exports: [],
              complexity: 'low' as const,
              category: getFileCategory(file.path)
            }
          };
        }
      })
    );
    
    batchAnalyses.forEach(({ path, analysis }) => {
      analyses[path] = analysis;
    });
    
    // Small delay between batches
    if (i + batchSize < files.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return analyses;
};

/**
 * Analyze individual file to understand its purpose and structure
 */
const analyzeIndividualFile = async (file: FileData): Promise<FileAnalysis> => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Please sign in to analyze files');
    }

    const response = await fetch('/api/chatbot-analysis/analyze-file', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        filePath: file.path,
        fileContent: file.content
      })
    });

    const data = await response.json();
    return parseFileAnalysis(typeof data.content === 'string' ? data.content : '', file.path);
  } catch (error) {
    console.error(`Error analyzing file ${file.path}:`, error);
    throw error;
  }
};

/**
 * Parse the AI response into structured file analysis
 */
const parseFileAnalysis = (response: string, filePath: string): FileAnalysis => {
  const lines = response.split('\n');
  let purpose = '';
  let keyFunctions: string[] = [];
  let dependencies: string[] = [];
  let exports: string[] = [];
  let complexity: 'low' | 'medium' | 'high' = 'low';
  let category = getFileCategory(filePath);

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('PURPOSE:')) {
      purpose = trimmedLine.replace('PURPOSE:', '').trim();
    } else if (trimmedLine.startsWith('KEY_FUNCTIONS:')) {
      const functionsText = trimmedLine.replace('KEY_FUNCTIONS:', '').trim();
      keyFunctions = functionsText ? functionsText.split(',').map(s => s.trim()).filter(s => s) : [];
    } else if (trimmedLine.startsWith('DEPENDENCIES:')) {
      const depsText = trimmedLine.replace('DEPENDENCIES:', '').trim();
      dependencies = depsText ? depsText.split(',').map(s => s.trim()).filter(s => s) : [];
    } else if (trimmedLine.startsWith('EXPORTS:')) {
      const exportsText = trimmedLine.replace('EXPORTS:', '').trim();
      exports = exportsText ? exportsText.split(',').map(s => s.trim()).filter(s => s) : [];
    } else if (trimmedLine.startsWith('COMPLEXITY:')) {
      const complexityText = trimmedLine.replace('COMPLEXITY:', '').trim().toLowerCase();
      complexity = (['low', 'medium', 'high'].includes(complexityText) ? complexityText : 'low') as 'low' | 'medium' | 'high';
    } else if (trimmedLine.startsWith('CATEGORY:')) {
      const categoryText = trimmedLine.replace('CATEGORY:', '').trim().toLowerCase();
      category = categoryText || category;
    }
  }

  return {
    purpose: purpose || `${category} file`,
    keyFunctions,
    dependencies,
    exports,
    complexity,
    category
  };
};

/**
 * Determine file category based on path
 */
const getFileCategory = (path: string): string => {
  if (path.includes('/components/')) return 'component';
  if (path.includes('/utils/')) return 'utility';
  if (path.includes('/hooks/')) return 'hook';
  if (path.includes('/services/')) return 'service';
  if (path.includes('/types/')) return 'types';
  if (path.includes('/pages/')) return 'page';
  if (path.includes('.test.') || path.includes('/__tests__/')) return 'test';
  if (path.endsWith('.md') || path.includes('/docs/')) return 'documentation';
  if (path.includes('config') || path.endsWith('.config.js') || path.endsWith('.config.ts')) return 'config';
  return 'other';
};

/**
 * Analyze overall repository structure and context
 */
const analyzeOverallRepository = async (
  files: FileData[],
  repoUrl: string,
  fileAnalyses: Record<string, FileAnalysis>
): Promise<Omit<RepositoryContext, 'fileMap' | 'totalFiles' | 'analyzedAt'>> => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Please sign in to analyze repository');
    }

    const fileStructure = Object.entries(fileAnalyses).map(([path, analysis]) => 
      `${path}: ${analysis.purpose} (${analysis.category})`
    ).join('\n');

    const repositoryContent = formatRepositoryContent(files.slice(0, 20));

    const response = await fetch('/api/chatbot-analysis/analyze-repository', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        repoUrl,
        totalFiles: files.length,
        fileStructure,
        repositoryContent
      })
    });

    const data = await response.json();
    const lines = (typeof data.content === 'string' ? data.content : '').split('\n');
    let summary = '';
    let techStack: string[] = [];
    let keyFeatures: string[] = [];
    let architecture = '';
    let businessValue = '';

    let currentSection = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('SUMMARY:')) {
        currentSection = 'summary';
        summary = trimmedLine.replace('SUMMARY:', '').trim();
      } else if (trimmedLine.startsWith('TECH_STACK:')) {
        currentSection = 'techStack';
        const stackText = trimmedLine.replace('TECH_STACK:', '').trim();
        techStack = stackText.split(',').map(s => s.trim()).filter(s => s);
      } else if (trimmedLine.startsWith('KEY_FEATURES:')) {
        currentSection = 'keyFeatures';
        const featuresText = trimmedLine.replace('KEY_FEATURES:', '').trim();
        keyFeatures = featuresText.split(',').map(s => s.trim()).filter(s => s);
      } else if (trimmedLine.startsWith('ARCHITECTURE:')) {
        currentSection = 'architecture';
        architecture = trimmedLine.replace('ARCHITECTURE:', '').trim();
      } else if (trimmedLine.startsWith('BUSINESS_VALUE:')) {
        currentSection = 'businessValue';
        businessValue = trimmedLine.replace('BUSINESS_VALUE:', '').trim();
      } else if (trimmedLine && currentSection) {
        // Continue building the current section
        switch (currentSection) {
          case 'summary':
            summary += ' ' + trimmedLine;
            break;
          case 'architecture':
            architecture += ' ' + trimmedLine;
            break;
          case 'businessValue':
            businessValue += ' ' + trimmedLine;
            break;
        }
      }
    }

    return {
      summary: summary || 'Repository analysis available',
      techStack: techStack.length > 0 ? techStack : ['Unknown'],
      keyFeatures: keyFeatures.length > 0 ? keyFeatures : ['Features analysis available'],
      architecture: architecture || 'Architecture details available',
      businessValue: businessValue || 'Business value analysis available'
    };
  } catch (error) {
    console.error("Repository analysis error:", error);
    throw error;
  }
};

/**
 * Process user message with comprehensive repository context
 */
export const processUserMessage = async (
  userMessage: string,
  repositoryContext: RepositoryContext,
  repoUrl: string,
  conversationHistory: Array<{content: string, type: 'user' | 'bot'}>,
  documents?: Array<{fileName: string, fileType: string, content: string, analysis?: string}>
): Promise<string> => {
  
  // Check if it's a greeting or general message
  const isGreeting = /^(hi|hello|hey|good morning|good afternoon|good evening|how are you|what's up)$/i.test(userMessage.trim());

  if (isGreeting) {
    const documentInfo = documents && documents.length > 0 
      ? `\n• Analyzing uploaded documents (${documents.length} document${documents.length > 1 ? 's' : ''})`
      : '';
    
    return `Hi there! I'm SquadBot, your AI repository assistant.

I've analyzed all ${repositoryContext.totalFiles} files in your repository${documentInfo} and can help you with:
• Understanding any specific file's purpose and functionality
• Explaining the overall codebase structure and architecture
• Analyzing relationships between different components
• Discussing implementation details and design patterns
• Answering questions about specific functions or features${documentInfo ? '\n• Answering questions based on uploaded documents and how they relate to the code' : ''}

What would you like to know about this repository?`;
  }

  // Check if user is asking about specific files
  const fileQuestion = detectFileSpecificQuestion(userMessage, repositoryContext);
  
  const recentHistory = conversationHistory.slice(-6);
  const historyContext = recentHistory.length > 0 
    ? `\nRECENT CONVERSATION:\n${recentHistory.map(h => `${h.type.toUpperCase()}: ${h.content}`).join('\n')}\n`
    : '';

  let contextualInfo = '';
  if (fileQuestion.isFileSpecific && fileQuestion.relevantFiles.length > 0) {
    contextualInfo = `\nRELEVANT FILES:\n${fileQuestion.relevantFiles.map(path => {
      const analysis = repositoryContext.fileMap[path];
      return `${path}: ${analysis?.purpose || 'File analysis'}\n  Functions: ${analysis?.keyFunctions.join(', ') || 'N/A'}\n  Dependencies: ${analysis?.dependencies.join(', ') || 'N/A'}`;
    }).join('\n\n')}\n`;
  }

  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Please sign in to use chatbot');
    }

    const response = await fetch('/api/chatbot-analysis/process-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        userMessage,
        repositoryContext,
        repoUrl,
        conversationHistory,
        documents: documents || []
      })
    });

    const data = await response.json();
    return typeof data.content === 'string' ? data.content : '';
  } catch (error) {
    console.error("User message processing error:", error);
    throw error;
  }
};

/**
 * Detect if user is asking about specific files and find relevant ones
 */
const detectFileSpecificQuestion = (
  userMessage: string,
  repositoryContext: RepositoryContext
): { isFileSpecific: boolean; relevantFiles: string[] } => {
  const message = userMessage.toLowerCase();
  const relevantFiles: string[] = [];
  
  // Check for direct file mentions
  Object.keys(repositoryContext.fileMap).forEach(filePath => {
    const fileName = filePath.split('/').pop()?.toLowerCase();
    const pathSegments = filePath.toLowerCase().split('/');
    
    if (fileName && (message.includes(fileName) || pathSegments.some(segment => message.includes(segment)))) {
      relevantFiles.push(filePath);
    }
  });

  // Check for component or function mentions
  Object.entries(repositoryContext.fileMap).forEach(([filePath, analysis]) => {
    analysis.keyFunctions.forEach(func => {
      if (message.includes(func.toLowerCase())) {
        relevantFiles.push(filePath);
      }
    });
  });

  // Check for category-based questions
  const categoryKeywords = {
    'component': ['component', 'ui', 'interface'],
    'utility': ['util', 'helper', 'function'],
    'service': ['service', 'api', 'request'],
    'hook': ['hook', 'use'],
    'page': ['page', 'route', 'screen']
  };

  Object.entries(categoryKeywords).forEach(([category, keywords]) => {
    if (keywords.some(keyword => message.includes(keyword))) {
      Object.entries(repositoryContext.fileMap).forEach(([filePath, analysis]) => {
        if (analysis.category === category && !relevantFiles.includes(filePath)) {
          relevantFiles.push(filePath);
        }
      });
    }
  });

  return {
    isFileSpecific: relevantFiles.length > 0,
    relevantFiles: relevantFiles.slice(0, 10) // Limit to most relevant files
  };
};

/**
 * Format repository content for AI analysis (unchanged from original)
 */
const formatRepositoryContent = (files: FileData[]): string => {
  const maxContentLength = 15000;
  let totalLength = 0;
  
  const formattedFiles = files
    .filter(file => {
      const isBinary = /\.(jpg|jpeg|png|gif|bmp|ico|svg|pdf|zip|tar|gz|exe|dll|so|dylib)$/i.test(file.path);
      const isVeryLarge = file.content.length > 5000;
      return !isBinary && !isVeryLarge;
    })
    .map(file => {
      if (totalLength >= maxContentLength) return null;
      
      const content = file.content.length > 2000 
        ? file.content.substring(0, 2000) + '\n... [truncated]'
        : file.content;
      
      totalLength += content.length;
      
      return `
FILE: ${file.path}
CONTENT:
${content}
---`;
    })
    .filter(Boolean)
    .join('\n');

  return formattedFiles || "No suitable files found for analysis.";
};
