/**
 * Code Refactoring Utilities
 * 
 * This module provides language-specific code refactoring capabilities
 * to improve code quality, readability, and adherence to best practices.
 */

import { refactorJavaScript } from './javascriptRefactor';
import { refactorPython } from './pythonRefactor';
import { refactorCPP } from './cppRefactor';
import { refactorJava } from './javaRefactor';
import { refactorGeneric } from './genericRefactor';
import { refactorSQL } from './sqlRefactor';

export interface RefactoringOptions {
  /**
   * Enable aggressive refactoring (more changes)
   */
  aggressive?: boolean;
  
  /**
   * Focus on specific aspects of code quality
   */
  focus?: {
    readability?: boolean;
    maintainability?: boolean;
    performance?: boolean;
    security?: boolean;
    codeSmell?: boolean;
  };
  
  /**
   * Apply specific refactoring techniques
   */
  techniques?: {
    extractConstants?: boolean;
    extractFunctions?: boolean;
    improveNaming?: boolean;
    addTyping?: boolean;
    addComments?: boolean;
    addErrorHandling?: boolean;
    formatCode?: boolean;
  };
}

/**
 * Refactor code based on the programming language with quality metrics
 * 
 * @param code The source code to refactor
 * @param language The programming language identifier (e.g., 'js', 'py', 'cpp')
 * @param options Optional refactoring options to customize the process
 * @returns The refactored code with improved quality
 */
export const refactorCode = (
  code: string, 
  language: string, 
  options?: RefactoringOptions
): string => {
  // Set default options if not provided
  const refactoringOptions: RefactoringOptions = {
    aggressive: false,
    focus: {
      readability: true,
      maintainability: true,
      performance: true,
      security: true,
      codeSmell: true
    },
    techniques: {
      extractConstants: true,
      extractFunctions: true,
      improveNaming: true,
      addTyping: false,
      addComments: true,
      addErrorHandling: false,
      formatCode: true
    },
    ...options
  };

  // Switch based on language to use the appropriate refactoring function
  switch(language.toLowerCase()) {
    case 'sql':
    case 'pgsql':
    case 'plsql':
    case 'mysql':
      return refactorSQL(code, refactoringOptions);
      
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
    case 'javascript':
    case 'typescript':
      return refactorJavaScript(code, refactoringOptions);
      
    case 'py':
    case 'python':
    case 'ipynb': // Added support for Jupyter Notebook files
      return refactorPython(code, refactoringOptions);
      
    case 'cpp':
    case 'c':
    case 'h':
    case 'hpp':
    case 'c++':
      return refactorCPP(code, refactoringOptions);
      
    case 'java':
      return refactorJava(code, refactoringOptions);
      
    default:
      return refactorGeneric(code, refactoringOptions);
  }
};

/**
 * Calculate metrics for code quality assessment
 * 
 * @param code The source code to analyze
 * @param language The programming language identifier
 * @returns Object containing different quality metrics
 */
export const calculateCodeQualityMetrics = (code: string, language: string) => {
  return {
    readabilityScore: calculateReadabilityScore(code),
    maintainabilityScore: calculateMaintainabilityScore(code),
    performanceScore: calculatePerformanceScore(code),
    securityScore: calculateSecurityScore(code),
    codeSmellScore: calculateCodeSmellScore(code),
  };
};

/**
 * Calculate readability score for given code
 */
const calculateReadabilityScore = (code: string): number => {
  const lines = code.split('\n');
  const nonEmptyLines = lines.filter(line => line.trim().length > 0);
  
  // Calculate metrics
  const longLines = nonEmptyLines.filter(line => line.length > 80).length;
  const longLineRatio = longLines / nonEmptyLines.length;
  
  // Calculate comment ratio
  const commentLines = (code.match(/\/\/|\/\*|\*\/|#|"""/g) || []).length;
  const commentRatio = commentLines / nonEmptyLines.length;
  
  // Large indentation levels
  const highIndentationLines = nonEmptyLines.filter(line => {
    const indentation = line.search(/\S/);
    return indentation > 16; // More than 4 levels of indentation (4 spaces each)
  }).length;
  
  const highIndentationRatio = highIndentationLines / nonEmptyLines.length;
  
  // Calculate score
  let score = 100;
  score -= longLineRatio * 40; // Up to -40 points for long lines
  score -= highIndentationRatio * 30; // Up to -30 points for high indentation
  
  if (commentRatio < 0.05) {
    score -= 15; // Penalize lack of comments
  }
  
  return Math.max(0, Math.min(100, Math.round(score)));
};

/**
 * Calculate maintainability score for given code
 */
const calculateMaintainabilityScore = (code: string): number => {
  // Calculate function length
  const functionMatches = code.match(/function\s+\w+\s*\([^)]*\)\s*{|const\s+\w+\s*=\s*(\([^)]*\)|[^=]+)\s*=>|def\s+\w+\s*\([^)]*\)\s*:|(?:public|private|protected|static|\s) +[\w<>\[\]]+\s+(\w+) *\([^\)]*\) *(?:throws [^{]+)? *\{/g) || [];
  
  const functionCount = functionMatches.length;
  const codeLines = code.split('\n').filter(line => line.trim().length > 0).length;
  
  // Average lines per function
  const avgLinesPerFunction = functionCount > 0 ? codeLines / functionCount : codeLines;
  
  // Duplicated code (simplified)
  const codeBlocks = code.split('\n\n').map(block => block.trim());
  const duplicateBlocks = codeBlocks.filter((block, index) => 
    block.length > 20 && codeBlocks.findIndex(b => b === block) !== index
  );
  
  // Calculate score
  let score = 100;
  
  if (avgLinesPerFunction > 50) {
    score -= 30; // Large functions
  } else if (avgLinesPerFunction > 25) {
    score -= 15; // Medium functions
  }
  
  score -= duplicateBlocks.length * 15; // Penalize duplicated code blocks
  
  if (functionCount === 0 && codeLines > 30) {
    score -= 25; // No functions in a large file
  }
  
  return Math.max(0, Math.min(100, Math.round(score)));
};

/**
 * Calculate performance score for given code
 */
const calculatePerformanceScore = (code: string): number => {
  let score = 100;
  
  // Check for nested loops
  const nestedLoops = (code.match(/for\s*\([^)]*\)[^{]*{[^}]*for\s*\(/g) || []).length;
  score -= nestedLoops * 10; // Each nested loop costs 10 points
  
  // Check for inefficient array operations
  const arrayOperations = (code.match(/\.map\(|\.filter\(|\.reduce\(|\.forEach\(/g) || []).length;
  const chainingOperations = (code.match(/\.map\([^)]*\)\.(?:filter|map|reduce|forEach)\(/g) || []).length;
  
  score -= chainingOperations * 5; // Each chained operation costs 5 points
  
  // Check for large data structures
  const largeArrays = (code.match(/new Array\(\d{4,}\)/g) || []).length;
  score -= largeArrays * 10;
  
  // Check for DOM manipulation in loops
  const domInLoops = (code.match(/for\s*\([^)]*\)[^{]*{[^}]*document\.|for\s*\([^)]*\)[^{]*{[^}]*innerHTML/g) || []).length;
  score -= domInLoops * 15;
  
  return Math.max(0, Math.min(100, Math.round(score)));
};

/**
 * Calculate security score for given code
 */
const calculateSecurityScore = (code: string): number => {
  let score = 100;
  
  // Check for common security issues
  if (code.includes('eval(')) {
    score -= 30; // eval is evil
  }
  
  if (code.includes('innerHTML')) {
    score -= 20; // Potential XSS
  }
  
  if (code.includes('dangerouslySetInnerHTML')) {
    score -= 15; // React's dangerous prop
  }
  
  // SQL injection vulnerabilities
  const sqlInjectionRisks = (code.match(/executeQuery\s*\(\s*["'`]SELECT.+\$|db\.query\s*\(\s*["'`]SELECT/g) || []).length;
  score -= sqlInjectionRisks * 25;
  
  // Check for input validation
  const userInputs = (code.match(/\.value|\.body|\[['"][^'"]+['"]\]|params\./g) || []).length;
  const validations = (code.match(/validate|sanitize|trim\(|escape/g) || []).length;
  
  if (userInputs > validations && userInputs > 0) {
    score -= Math.min(25, (userInputs - validations) * 5); // Penalize lack of validation
  }
  
  return Math.max(0, Math.min(100, Math.round(score)));
};

/**
 * Calculate code smell score for given code
 */
const calculateCodeSmellScore = (code: string): number => {
  let score = 100;
  
  // Magic numbers
  const magicNumbers = (code.match(/\b\d{2,}\b/g) || [])
    .filter(num => !['100', '200', '300', '400', '500', '1000'].includes(num)).length;
  
  score -= Math.min(30, magicNumbers * 3); // Up to -30 points for magic numbers
  
  // Long methods
  const longMethods = (code.match(/function\s+\w+\s*\([^)]*\)\s*{[^}]{500,}}/g) || []).length;
  score -= longMethods * 15;
  
  // Deeply nested conditionals
  const deepNesting = (code.match(/if\s*\([^)]*\)\s*{[^}]*if\s*\([^)]*\)\s*{[^}]*if\s*\([^)]*\)/g) || []).length;
  score -= deepNesting * 10;
  
  // Long parameter lists
  const longParams = (code.match(/function\s+\w+\s*\([^)]{50,}\)/g) || []).length;
  score -= longParams * 5;
  
  return Math.max(0, Math.min(100, Math.round(score)));
};

export {
  refactorJavaScript,
  refactorPython,
  refactorCPP,
  refactorJava,
  refactorGeneric,
  refactorSQL,
  calculateReadabilityScore,
  calculateMaintainabilityScore,
  calculatePerformanceScore,
  calculateSecurityScore,
  calculateCodeSmellScore
};
