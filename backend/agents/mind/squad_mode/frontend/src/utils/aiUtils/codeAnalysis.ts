// TODO: Import prompts from backend instead of defining them locally
// The prompts have been moved to backend/prompts/analysis/
// Update this file to fetch prompts from backend API endpoints

import { QualityResults } from '@/types/codeQuality';
import { toast } from "sonner";
//import { callGeminiApi, getGeminiConfig } from './geminiApi';

interface FileData {
  path: string;
  content: string;
}

/**
 * Valid file extensions for code analysis
 */
const VALID_EXTENSIONS = ['js', 'ts', 'txt', 'md', 'mdx', 'bin', 'gitignore', 'tsx', 'jsx', 'sql', 'sqlx', 'sqlx-migrations', 'sqlite', 'sqlite3', 'json', 'yaml', 'yml', 'toml', 'php', 'css', 'html', 'py', 'java', 'c', 'cpp', 'go', 'rb'];

/**
 * Logging utility for debugging
 */
const log = {
  info: (message: string, data?: any) => {
    // console.log(`[Code Analysis] ${message}`, data ? data : '');
  },
  error: (message: string, error?: any) => {
    console.error(`[Code Analysis] ${message}`, error ? error : '');
    if (error instanceof Error) {
      console.error(`[Code Analysis] Stack trace:`, error.stack);
    }
  },
  warn: (message: string, data?: any) => {
    console.warn(`[Code Analysis] ${message}`, data ? data : '');
  },
  debug: (message: string, data?: any) => {
    console.debug(`[Code Analysis] ${message}`, data ? data : '');
  }
};

/**
 * Validate file data before analysis
 */
const validateFileData = (file: FileData): boolean => {
  try {
    if (!file) {
      log.error('File is null or undefined');
      return false;
    }

    if (!file.path || !file.content) {
      log.error('Invalid file data', { 
        path: file.path,
        hasContent: !!file.content,
        contentLength: file.content?.length
      });
      return false;
    }
    
    const extension = file.path.split('.').pop()?.toLowerCase();
    if (!VALID_EXTENSIONS.includes(extension || '')) {
      log.warn('Invalid file extension', { 
        path: file.path, 
        extension,
        validExtensions: VALID_EXTENSIONS 
      });
      return false;
    }
    
    if (file.content.length > 100000) {
      log.warn('File too large', { 
        path: file.path, 
        size: file.content.length,
        maxSize: 100000
      });
      return false;
    }
    
    return true;
  } catch (error) {
    log.error('Error validating file data', { error, file });
    return false;
  }
};

/**
 * Analyze a single code file with AI to assess code quality
 */
export const analyzeCodeWithAI = async (
  code: string,
  language: string,
  isRefactored: boolean = false
): Promise<QualityResults> => {
  try {
    // Backend now handles large files with chunking, so no size limit on frontend
    if (!code || typeof code !== 'string') {
      const error = new Error('Invalid code input: Code must be a non-empty string');
      log.error('Code validation failed', { 
        hasCode: !!code,
        codeType: typeof code,
        codeLength: (code as any)?.length
      });
      throw error;
    }
    
    if (!language || typeof language !== 'string') {
      const error = new Error('Invalid language input: Language must be a non-empty string');
      log.error('Language validation failed', { 
        hasLanguage: !!language,
        languageType: typeof language
      });
      throw error;
    }

    // Call backend endpoint which internally calls /api/generate
    let response;
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Please sign in to analyze code');
      }

      const apiResponse = await fetch('/api/code-analysis/analyze-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          code,
          language,
          isRefactored
        })
      });
      const data = await apiResponse.json();
      response = typeof data.content === 'string' ? data.content : '';
    } catch (apiError) {
      log.error('Code analysis API call failed', { 
        error: apiError,
        language,
        codeLength: code.length
      });
      throw new Error('Failed to get analysis from code analysis API');
    }

    function extractAndParseJsonFromResponse(response: string): QualityResults {
      try {
        // First, try to parse the response directly as JSON
        if (response.trim().startsWith('{')) {
          const directParse = JSON.parse(response);
          return validateAndReturnResults(directParse);
        }

        // Clean up markdown formatting
        let clean = response.replace(/```json[\r\n]*|```[\r\n]*/g, '').trim();
        
        // Remove trailing commas before closing braces/brackets
        clean = clean.replace(/,\s*([}\]])/g, '$1');
        
        // Find JSON object in the response
        const jsonMatch = clean.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No valid JSON found in response');
        }
        
        let jsonString = jsonMatch[0];
        
        // Fix common JSON issues
        jsonString = fixJsonString(jsonString);
        
        // Try to parse the cleaned JSON
        const parsed = JSON.parse(jsonString);
        return validateAndReturnResults(parsed);
        
      } catch (error) {
        log.error('JSON parsing failed', { 
          error: error instanceof Error ? error.message : 'Unknown error',
          response: response.substring(0, 500) + '...' // Log first 500 chars for debugging
        });
        
        // Return fallback results instead of throwing
        return {
          score: 0,
          readabilityScore: 0,
          maintainabilityScore: 0,
          performanceScore: 0,
          securityScore: 0,
          codeSmellScore: 0,
          issues: ['Failed to parse AI response. Please try again.'],
          recommendations: ['The AI response could not be parsed. Please retry the analysis.']
        };
      }
    }

    function fixJsonString(jsonString: string): string {
      try {
        // Remove trailing commas before closing braces/brackets
        jsonString = jsonString.replace(/,\s*([}\]])/g, '$1');
        
        // Fix common escape sequence issues
        jsonString = jsonString.replace(/\\"/g, '"');
        jsonString = jsonString.replace(/\\'/g, "'");
        jsonString = jsonString.replace(/\\\\/g, '\\');
        
        // Fix newlines and tabs in string values
        jsonString = jsonString.replace(/"([^"]*)\n([^"]*)"/g, '"$1\\n$2"');
        jsonString = jsonString.replace(/"([^"]*)\t([^"]*)"/g, '"$1\\t$2"');
        jsonString = jsonString.replace(/"([^"]*)\r([^"]*)"/g, '"$1\\r$2"');
        
        // Fix unescaped quotes within string values (more robust approach)
        jsonString = jsonString.replace(/"([^"]*)"([^"]*)"([^"]*)":/g, (match, p1, p2, p3) => {
          return `"${p1}\\"${p2}\\"${p3}":`;
        });
        
        // Fix control characters
        jsonString = jsonString.replace(/[\x00-\x1F\x7F]/g, (char) => {
          const code = char.charCodeAt(0);
          return `\\u${code.toString(16).padStart(4, '0')}`;
        });
        
        return jsonString;
      } catch (error) {
        log.warn('Error fixing JSON string', { error: error instanceof Error ? error.message : 'Unknown error' });
        return jsonString; // Return original if fixing fails
      }
    }

    function validateAndReturnResults(parsed: any): QualityResults {
      // Validate and provide defaults for missing fields
      return {
        score: typeof parsed.score === 'number' ? parsed.score : 0,
        readabilityScore: typeof parsed.readabilityScore === 'number' ? parsed.readabilityScore : 0,
        maintainabilityScore: typeof parsed.maintainabilityScore === 'number' ? parsed.maintainabilityScore : 0,
        performanceScore: typeof parsed.performanceScore === 'number' ? parsed.performanceScore : 0,
        securityScore: typeof parsed.securityScore === 'number' ? parsed.securityScore : 0,
        codeSmellScore: typeof parsed.codeSmellScore === 'number' ? parsed.codeSmellScore : 0,
        issues: Array.isArray(parsed.issues) ? parsed.issues : ['No issues detected'],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : ['No recommendations available']
      };
    }

    const parsedResponse = extractAndParseJsonFromResponse(response);
    return parsedResponse;
  } catch (error: any) {
    log.error('Error during code analysis', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      language,
      codeLength: code?.length || 0
    });
    
    // Return a more informative error response
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred during analysis';
    return {
      score: 0,
      readabilityScore: 0,
      maintainabilityScore: 0,
      performanceScore: 0,
      securityScore: 0,
      codeSmellScore: 0,
      issues: [`Analysis failed: ${errorMessage}`],
      recommendations: [`Please check your code and try again. Error: ${errorMessage}`]
    };
  }
};
