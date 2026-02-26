// TODO: Import prompts from backend instead of defining them locally
// The prompts have been moved to backend/prompts/document-generation/
// Update this file to fetch prompts from backend API endpoints

//import { callGeminiApi } from './geminiApi';

interface FileData {
  path: string;
  content: string;
}

export const generateBusinessDocument = async (
  files: FileData[],
  repoUrl: string,
  options?: { repoData?: any; fileContents?: any[] }
): Promise<string> => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Please sign in to generate documents');
    }

    const payload: any = {
      files,
      repoUrl
    };
    if (options?.repoData) payload.repoData = options.repoData;
    if (options?.fileContents && options.fileContents.length > 0) payload.fileContents = options.fileContents;

    const response = await fetch('/api/document-generation/generate-business', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    return typeof data.content === 'string' ? data.content : '';
  } catch (error) {
    console.error('Error generating business document:', error);
    throw new Error('Failed to generate business document');
  }
};

export const generateTechnicalDocument = async (
  files: FileData[],
  repoUrl: string,
  options?: { repoData?: any; fileContents?: any[] }
): Promise<string> => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Please sign in to generate documents');
    }

    const payload: any = {
      files,
      repoUrl
    };
    if (options?.repoData) payload.repoData = options.repoData;
    if (options?.fileContents && options.fileContents.length > 0) payload.fileContents = options.fileContents;

    const response = await fetch('/api/document-generation/generate-technical', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    return typeof data.content === 'string' ? data.content : '';
  } catch (error) {
    console.error('Error generating technical document:', error);
    throw new Error('Failed to generate technical document');
  }
};

export const generateCodeQualityDocument = async (
  files: FileData[],
  repoUrl: string,
  options?: { repoData?: any; fileContents?: any[] }
): Promise<string> => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Please sign in to generate documents');
    }

    const payload: any = {
      files,
      repoUrl
    };
    if (options?.repoData) payload.repoData = options.repoData;
    if (options?.fileContents && options.fileContents.length > 0) payload.fileContents = options.fileContents;

    const response = await fetch('/api/document-generation/generate-quality', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    return typeof data.content === 'string' ? data.content : '';
  } catch (error) {
    console.error('Error generating code quality document:', error);
    throw new Error('Failed to generate code quality document');
  }
};

export const generateFeatureReadme = async (
  files: FileData[],
  repoUrl: string,
  options?: { repoData?: any; fileContents?: any[]; repoUrls?: string[] }
): Promise<string> => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Please sign in to generate documents');
    }

    const payload: any = {
      files,
      repoUrl
    };
    if (options?.repoData) payload.repoData = options.repoData;
    if (options?.fileContents && options.fileContents.length > 0) payload.fileContents = options.fileContents;
    if (options?.repoUrls && options.repoUrls.length > 0) payload.repoUrls = options.repoUrls;

    const response = await fetch('/api/document-generation/generate-feature-readme', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to generate Feature README');
    }

    const data = await response.json();
    return typeof data.content === 'string' ? data.content : '';
  } catch (error) {
    console.error('Error generating Feature README:', error);
    throw new Error('Failed to generate Feature README');
  }
};

// /**
//  * Extract business features from codebase
//  */
const extractBusinessFeatures = (files: FileData[]): any => {
  const features = {
    authentication: files.some(f => f.path.includes('auth') || f.content.toLowerCase().includes('login')),
    dashboard: files.some(f => f.path.includes('dashboard') || f.path.includes('admin')),
    reporting: files.some(f => f.path.includes('report') || f.path.includes('document')),
    payments: files.some(f => f.path.includes('payment') || f.content.toLowerCase().includes('payment')),
    userManagement: files.some(f => f.path.includes('user') || f.content.toLowerCase().includes('profile')),
    dataAnalytics: files.some(f => f.path.includes('analytics') || f.content.includes('chart')),
    fileManagement: files.some(f => f.path.includes('file') || f.content.includes('upload')),
    notifications: files.some(f => f.path.includes('notification') || f.content.includes('toast'))
  };
  return features;
};

/**
 * Extract user interfaces from codebase
 */
// const extractUserInterfaces = (files: FileData[]): any => {
//   const uiComponents = files.filter(f => 
//     f.path.includes('component') || 
//     f.path.includes('ui/') || 
//     f.content.includes('jsx') || 
//     f.content.includes('tsx')
//   );
  
//   return {
//     totalComponents: uiComponents.length,
//     forms: uiComponents.filter(f => f.content.toLowerCase().includes('form')).length,
//     modals: uiComponents.filter(f => f.content.toLowerCase().includes('modal')).length,
//     tables: uiComponents.filter(f => f.content.toLowerCase().includes('table')).length,
//     charts: uiComponents.filter(f => f.content.toLowerCase().includes('chart')).length
//   };
// };

/**
 * Extract data models from codebase
 */
// const extractDataModels = (files: FileData[]): any => {
//   const modelFiles = files.filter(f => 
//     f.path.includes('model') || 
//     f.path.includes('schema') || 
//     f.content.includes('interface') ||
//     f.content.includes('type')
//   );
  
//   return {
//     totalModels: modelFiles.length,
//     hasTypeScript: files.some(f => f.path.endsWith('.ts') || f.path.endsWith('.tsx')),
//     hasValidation: files.some(f => f.content.includes('zod') || f.content.includes('yup')),
//     hasDatabase: files.some(f => f.content.includes('prisma') || f.content.includes('mongoose'))
//   };
// };

/**
 * Extract business logic from codebase
 */
// const extractBusinessLogic = (files: FileData[]): any => {
//   return {
//     hasStateManagement: files.some(f => f.content.includes('useState') || f.content.includes('redux')),
//     hasApiCalls: files.some(f => f.content.includes('fetch') || f.content.includes('axios')),
//     hasErrorHandling: files.some(f => f.content.includes('try') && f.content.includes('catch')),
//     hasValidation: files.some(f => f.content.includes('validate') || f.content.includes('schema'))
//   };
// };

/**
 * Extract integrations from codebase
 */
// const extractIntegrations = (files: FileData[]): any => {
//   return {
//     hasThirdPartyAPIs: files.some(f => f.content.includes('api.') || f.content.includes('fetch(')),
//     hasPaymentIntegration: files.some(f => f.content.includes('stripe') || f.content.includes('paypal')),
//     hasAuthProviders: files.some(f => f.content.includes('google') || f.content.includes('auth0')),
//     hasCloudServices: files.some(f => f.content.includes('aws') || f.content.includes('supabase'))
//   };
// };

/**
 * Analyze architecture of codebase
 */
// const analyzeArchitecture = (files: FileData[]): any => {
//   return {
//     hasComponentArchitecture: files.some(f => f.path.includes('component')),
//     hasServiceLayer: files.some(f => f.path.includes('service') || f.path.includes('api')),
//     hasUtilityLayer: files.some(f => f.path.includes('util') || f.path.includes('helper')),
//     hasConfigLayer: files.some(f => f.path.includes('config')),
//     hasTesting: files.some(f => f.path.includes('test') || f.path.includes('spec')),
//     hasDocumentation: files.some(f => f.path.endsWith('.md'))
//   };
// };

/**
 * Extract API endpoints from files
 */
// const extractApis = (files: FileData[]): any => {
//   const apiFiles = files.filter(f => f.path.includes('api') || f.content.includes('endpoint'));
//   return {
//     totalApiFiles: apiFiles.length,
//     hasRESTEndpoints: files.some(f => f.content.includes('GET') || f.content.includes('POST')),
//     hasGraphQL: files.some(f => f.content.includes('graphql') || f.content.includes('apollo')),
//     hasWebSocket: files.some(f => f.content.includes('websocket') || f.content.includes('socket.io'))
//   };
// };

/**
 * Extract database information from files
 */
// const extractDatabaseInfo = (files: FileData[]): any => {
//   return {
//     hasPrisma: files.some(f => f.content.includes('prisma')),
//     hasMongoose: files.some(f => f.content.includes('mongoose')),
//     hasSQL: files.some(f => f.content.includes('sql') || f.path.includes('.sql')),
//     hasSupabase: files.some(f => f.content.includes('supabase')),
//     hasMigrations: files.some(f => f.path.includes('migration'))
//   };
// };

/**
 * Extract security features from codebase
 */
// const extractSecurityFeatures = (files: FileData[]): any => {
//   return {
//     hasAuthentication: files.some(f => f.content.includes('auth') || f.content.includes('login')),
//     hasAuthorization: files.some(f => f.content.includes('role') || f.content.includes('permission')),
//     hasEncryption: files.some(f => f.content.includes('encrypt') || f.content.includes('bcrypt')),
//     hasJWT: files.some(f => f.content.includes('jwt') || f.content.includes('token')),
//     hasHTTPS: files.some(f => f.content.includes('https') || f.content.includes('ssl'))
//   };
// };

/**
 * Extract testing information from files
 */
// const extractTestingInfo = (files: FileData[]): any => {
//   const testFiles = files.filter(f => f.path.includes('test') || f.path.includes('spec'));
//   return {
//     totalTestFiles: testFiles.length,
//     hasUnitTests: testFiles.some(f => f.content.includes('describe') || f.content.includes('it(')),
//     hasIntegrationTests: testFiles.some(f => f.content.includes('request') || f.content.includes('supertest')),
//     hasE2ETests: testFiles.some(f => f.content.includes('cypress') || f.content.includes('playwright')),
//     testCoverage: (testFiles.length / files.length) * 100
//   };
// };

/**
 * Extract deployment information from files
 */
// const extractDeploymentInfo = (files: FileData[]): any => {
//   return {
//     hasDockerfile: files.some(f => f.path.includes('Dockerfile')),
//     hasCI_CD: files.some(f => f.path.includes('.github') || f.path.includes('.gitlab')),
//     hasVercel: files.some(f => f.content.includes('vercel')),
//     hasNetlify: files.some(f => f.content.includes('netlify')),
//     hasAWS: files.some(f => f.content.includes('aws'))
//   };
// };

/**
 * Analyze performance of codebase
 */
// const analyzePerformance = (files: FileData[]): any => {
//   return {
//     hasLazyLoading: files.some(f => f.content.includes('lazy') || f.content.includes('Suspense')),
//     hasCaching: files.some(f => f.content.includes('cache') || f.content.includes('redis')),
//     hasOptimization: files.some(f => f.content.includes('memo') || f.content.includes('useMemo')),
//     hasCodeSplitting: files.some(f => f.content.includes('dynamic') || f.content.includes('loadable'))
//   };
// };

/**
 * Extract technical implementation details
 */
const extractTechnicalImplementation = (files: FileData[]) => {
  return {
    hasErrorHandling: files.some(f => f.content.includes('try') && f.content.includes('catch')),
    hasValidation: files.some(f => f.content.includes('validate') || f.content.includes('schema')),
    hasLogging: files.some(f => f.content.includes('console.log') || f.content.includes('logger')),
    hasTypeScript: files.some(f => f.path.endsWith('.ts') || f.path.endsWith('.tsx')),
    hasTests: files.some(f => f.path.includes('test') || f.path.includes('spec')),
    hasDocumentation: files.some(f => f.path.toLowerCase().includes('readme') || f.path.endsWith('.md')),
    apiEndpoints: extractApiEndpoints(files),
    databases: extractDatabaseUsage(files)
  };
};

/**
 * Assess quality indicators
 */
const assessQualityIndicators = (files: FileData[]) => {
  const totalLines = files.reduce((total, file) => total + file.content.split('\n').length, 0);
  const avgLinesPerFile = Math.round(totalLines / files.length);
  
  return {
    avgLinesPerFile,
    complexityScore: avgLinesPerFile > 200 ? 'High' : avgLinesPerFile > 100 ? 'Medium' : 'Low',
    testCoverage: files.filter(f => f.path.includes('test')).length / files.length,
    documentationRatio: files.filter(f => f.path.endsWith('.md')).length / files.length,
    typeScriptUsage: files.filter(f => f.path.endsWith('.ts') || f.path.endsWith('.tsx')).length / files.length
  };
};

/**
 * Extract API endpoints from files
 */
const extractApiEndpoints = (files: FileData[]): string[] => {
  const endpoints = [];
  files.forEach(file => {
    const content = file.content.toLowerCase();
    if (content.includes('/api/') || content.includes('endpoint') || content.includes('route')) {
      // Simple extraction - could be enhanced
      const matches = file.content.match(/\/api\/[\w\/]+/g);
      if (matches) {
        endpoints.push(...matches);
      }
    }
  });
  return [...new Set(endpoints)];
};

/**
 * Extract database usage
 */
const extractDatabaseUsage = (files: FileData[]): string[] => {
  const databases = [];
  files.forEach(file => {
    const content = file.content.toLowerCase();
    if (content.includes('mongodb') || content.includes('mongoose')) databases.push('MongoDB');
    if (content.includes('postgresql') || content.includes('postgres')) databases.push('PostgreSQL');
    if (content.includes('mysql')) databases.push('MySQL');
    if (content.includes('sqlite')) databases.push('SQLite');
    if (content.includes('redis')) databases.push('Redis');
    if (content.includes('supabase')) databases.push('Supabase');
  });
  return [...new Set(databases)];
};

/**
 * Extract dependencies from package.json or similar files
 */
// const extractDependencies = (files: FileData[]): string[] => {
//   const packageJsonFile = files.find(f => f.path.includes('package.json'));
//   if (packageJsonFile) {
//     try {
//       const packageJson = JSON.parse(packageJsonFile.content);
//       return [
//         ...Object.keys(packageJson.dependencies || {}),
//         ...Object.keys(packageJson.devDependencies || {})
//       ];
//     } catch {
//       return [];
//     }
//   }
//   return [];
// };

/**
 * Check if file is a configuration file
 */
const isConfigFile = (path: string): boolean => {
  const configExtensions = ['.json', '.yaml', '.yml', '.toml', '.ini', '.env'];
  const configNames = ['config', 'package', 'tsconfig', 'vite.config', 'tailwind.config'];
  
  return configExtensions.some(ext => path.endsWith(ext)) ||
         configNames.some(name => path.toLowerCase().includes(name));
};

/**
 * Check if file is a source code file
 */
// const isSourceFile = (path: string): boolean => {
//   const sourceExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cpp', '.c', '.go', '.rs'];
//   return sourceExtensions.some(ext => path.endsWith(ext));
// };

// Utility to select and truncate relevant files for Gemini payload
function getLimitedFileContents(files: FileData[], maxFiles = 20, maxChars = 8000) {
  const priority = [
    (f: FileData) => /readme/i.test(f.path),
    (f: FileData) => /package\.json/i.test(f.path),
    (f: FileData) => /main\.(js|ts|py|tsx|jsx)$/i.test(f.path),
    (f: FileData) => /app\.(js|ts|py|tsx|jsx)$/i.test(f.path),
    (f: FileData) => /(config|settings|env)\.(yaml|yml|toml|ini|env)$/i.test(f.path),
    (f: FileData) => /\.(js|ts|tsx|jsx|py|java|go|cpp|c|cs)$/i.test(f.path),
    (f: FileData) => true // fallback: any file
  ];
  let selected: FileData[] = [];
  for (const rule of priority) {
    const add = files.filter(rule).filter(f => !selected.includes(f));
    selected = selected.concat(add);
    if (selected.length >= maxFiles) break;
  }
  // Deduplicate and limit
  selected = Array.from(new Set(selected)).slice(0, maxFiles);
  // Truncate content
  return selected.map(f => ({
    path: f.path,
    content: f.content.length > maxChars ? f.content.slice(0, maxChars) : f.content
  }));
}
