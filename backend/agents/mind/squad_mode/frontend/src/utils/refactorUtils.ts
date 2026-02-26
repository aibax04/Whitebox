/**
 * Advanced Code Refactoring Utilities
 * 
 * This module provides comprehensive code refactoring capabilities with language-specific
 * optimizations, dependency management, and code quality improvements.
 */

import { refactorJavaScript, refactorPython, refactorCPP, refactorJava, refactorGeneric } from "@/utils/qualityUtils/refactors";

/**
 * Main entry point for code refactoring
 * 
 * @param code The source code to refactor
 * @param language The programming language identifier
 * @param instructions Optional user instructions for custom refactoring
 * @returns The refactored code with improved quality
 */
export const refactorCode = (code: string, language: string, instructions?: string): string => {
  // Apply language-specific basic refactoring first
  let refactored = applyLanguageSpecificRefactoring(code, language);
  
  // Apply dependency organization
  refactored = organizeDependencies(refactored, language);
  
  // Apply general code quality improvements
  refactored = applyCommonRefactoring(refactored, language);
  
  // Apply user-requested specific refactorings if provided
  if (instructions?.trim()) {
    refactored = applyCustomInstructions(refactored, instructions, language);
  }
  
  return refactored;
};

/**
 * Apply language-specific refactoring rules
 */
const applyLanguageSpecificRefactoring = (code: string, language: string): string => {
  const normalizedLanguage = language.toLowerCase().trim();
  
  switch(normalizedLanguage) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
    case 'javascript':
    case 'typescript':
      return refactorJavaScript(code);
      
    case 'py':
    case 'python':
    case 'ipynb':
      return refactorPython(code);
      
    case 'cpp':
    case 'c':
    case 'h':
    case 'hpp':
    case 'c++':
      return refactorCPP(code);
      
    case 'java':
      return refactorJava(code);
      
    default:
      return refactorGeneric(code);
  }
};

/**
 * Organize and structure imports/dependencies based on language
 */
const organizeDependencies = (code: string, language: string): string => {
  const normalizedLanguage = language.toLowerCase().trim();
  
  if (['js', 'jsx', 'ts', 'tsx', 'javascript', 'typescript'].includes(normalizedLanguage)) {
    return organizeJavaScriptDependencies(code);
  } else if (['py', 'python', 'ipynb'].includes(normalizedLanguage)) {
    return organizePythonDependencies(code);
  } else if (['cpp', 'c', 'h', 'hpp', 'c++'].includes(normalizedLanguage)) {
    return organizeCPPDependencies(code);
  } else if (normalizedLanguage === 'java') {
    return organizeJavaDependencies(code);
  }
  
  return code;
};

/**
 * Organize JavaScript/TypeScript imports by category
 */
const organizeJavaScriptDependencies = (code: string): string => {
  // Extract all import statements
  const importRegex = /import\s+.*?from\s+['"].*?['"]/g;
  const imports = code.match(importRegex) || [];
  
  if (imports.length === 0) return code;
  
  // Remove existing imports
  let codeWithoutImports = code.replace(importRegex, '');
  
  // Clean up multiple empty lines after removing imports
  codeWithoutImports = codeWithoutImports.replace(/^\s*\n+/g, '');
  
  // Group imports by type
  const reactImports: string[] = [];
  const stdLibImports: string[] = [];
  const thirdPartyImports: string[] = [];
  const relativeImports: string[] = [];
  const styleImports: string[] = [];
  
  imports.forEach(imp => {
    if (imp.includes('from "react') || imp.includes("from 'react")) {
      reactImports.push(imp);
    } else if (imp.includes('.css') || imp.includes('.scss') || imp.includes('.less')) {
      styleImports.push(imp);
    } else if (imp.includes('from "./') || imp.includes("from './") || 
               imp.includes('from "../') || imp.includes("from '../")) {
      relativeImports.push(imp);
    } else if (imp.includes('from "node:') || imp.includes("from 'node:") ||
               imp.includes('from "fs') || imp.includes("from 'fs") ||
               imp.includes('from "path') || imp.includes("from 'path") ||
               imp.includes('from "crypto') || imp.includes("from 'crypto") ||
               imp.includes('from "http') || imp.includes("from 'http") ||
               imp.includes('from "util') || imp.includes("from 'util")) {
      stdLibImports.push(imp);
    } else {
      thirdPartyImports.push(imp);
    }
  });
  
  // Add standard React imports for components if needed
  if (reactImports.length === 0 && 
      (code.includes('extends Component') || 
       code.includes('extends React.Component') || 
       code.includes('JSX') || 
       (code.includes('<') && code.includes('/>')))) {
    reactImports.push("import React from 'react'");
  }
  
  // Sort imports alphabetically within their groups
  const sortedImports = [
    ...reactImports.sort(),
    reactImports.length > 0 ? '' : null, // Empty line between groups
    ...stdLibImports.sort(),
    stdLibImports.length > 0 ? '' : null, // Empty line between groups
    ...thirdPartyImports.sort(),
    thirdPartyImports.length > 0 ? '' : null, // Empty line between groups
    ...relativeImports.sort(),
    relativeImports.length > 0 ? '' : null, // Empty line between groups
    ...styleImports.sort()
  ].filter(Boolean); // Remove empty strings if there are no imports in a group
  
  // Assemble the final code with organized imports
  return sortedImports.length > 0 
    ? sortedImports.join('\n') + '\n\n' + codeWithoutImports
    : codeWithoutImports;
};

/**
 * Organize Python imports by category (stdlib, third-party, local)
 */
const organizePythonDependencies = (code: string): string => {
  // Extract all import statements
  const importLines = code.split('\n').filter(line => 
    line.trim().startsWith('import ') || line.trim().startsWith('from ')
  );
  
  if (importLines.length === 0) return code;
  
  // Remove imports from original code
  const codeLines = code.split('\n');
  const codeWithoutImports = codeLines.filter(line => 
    !(line.trim().startsWith('import ') || line.trim().startsWith('from '))
  ).join('\n');
  
  // Group imports
  const stdlibImports = [];
  const thirdPartyImports = [];
  const localImports = [];
  
  // Standard library modules
  const stdlibModules = [
    'abc', 'argparse', 'array', 'ast', 'asyncio', 'base64', 'collections', 
    'concurrent', 'contextlib', 'copy', 'csv', 'datetime', 'decimal', 'difflib',
    'enum', 'fileinput', 'fnmatch', 'functools', 'glob', 'gzip', 'hashlib',
    'heapq', 'hmac', 'html', 'http', 'importlib', 'inspect', 'io', 'ipaddress',
    'itertools', 'json', 'logging', 'math', 'mimetypes', 'multiprocessing',
    'operator', 'os', 'pathlib', 'pickle', 'platform', 'pprint', 'queue',
    'random', 're', 'shutil', 'signal', 'socket', 'sqlite3', 'statistics',
    'string', 'subprocess', 'sys', 'tempfile', 'threading', 'time', 'traceback',
    'typing', 'unittest', 'urllib', 'uuid', 'warnings', 'weakref', 'xml', 'zipfile'
  ];
  
  importLines.forEach(line => {
    const moduleName = line.includes(' import ') 
      ? line.split('from ')[1].split(' import ')[0].trim()
      : line.split('import ')[1].split(' as ')[0].trim();
    
    if (moduleName.startsWith('.') || moduleName.startsWith('src.') || moduleName.startsWith('app.')) {
      localImports.push(line);
    } else if (stdlibModules.includes(moduleName.split('.')[0])) {
      stdlibImports.push(line);
    } else {
      thirdPartyImports.push(line);
    }
  });
  
  // Sort each group
  stdlibImports.sort();
  thirdPartyImports.sort();
  localImports.sort();
  
  // Combine with appropriate spacing
  const allImports = [
    ...stdlibImports,
    stdlibImports.length > 0 && thirdPartyImports.length > 0 ? '' : null,
    ...thirdPartyImports,
    (stdlibImports.length > 0 || thirdPartyImports.length > 0) && localImports.length > 0 ? '' : null,
    ...localImports,
    ''  // Add blank line after imports
  ].filter(Boolean);
  
  return allImports.join('\n') + '\n' + codeWithoutImports;
};

/**
 * Organize C/C++ includes by category
 */
const organizeCPPDependencies = (code: string): string => {
  // Extract all include statements
  const includeRegex = /#include\s+["<][^">]+[">]/g;
  const includes = code.match(includeRegex) || [];
  
  if (includes.length === 0) return code;
  
  // Remove existing includes
  let codeWithoutIncludes = code.replace(includeRegex, '');
  
  // Clean up multiple empty lines
  codeWithoutIncludes = codeWithoutIncludes.replace(/^\s*\n+/g, '');
  
  // Group includes
  const standardIncludes = [];
  const systemIncludes = [];
  const projectIncludes = [];
  
  includes.forEach(inc => {
    if (inc.includes('<') && !inc.includes('/')) {
      // Standard library includes like <iostream>
      standardIncludes.push(inc);
    } else if (inc.includes('<') && inc.includes('/')) {
      // System includes like <sys/socket.h>
      systemIncludes.push(inc);
    } else {
      // Project includes like "myheader.h"
      projectIncludes.push(inc);
    }
  });
  
  // Sort includes within groups
  standardIncludes.sort();
  systemIncludes.sort();
  projectIncludes.sort();
  
  // Combine with appropriate spacing
  const allIncludes = [
    ...standardIncludes,
    standardIncludes.length > 0 && systemIncludes.length > 0 ? '' : null,
    ...systemIncludes,
    (standardIncludes.length > 0 || systemIncludes.length > 0) && projectIncludes.length > 0 ? '' : null,
    ...projectIncludes,
    ''  // Add blank line after includes
  ].filter(Boolean);
  
  return allIncludes.join('\n') + codeWithoutIncludes;
};

/**
 * Organize Java imports by category
 */
const organizeJavaDependencies = (code: string): string => {
  // Extract all import statements
  const importRegex = /import\s+[a-zA-Z0-9_.]+;/g;
  const imports = code.match(importRegex) || [];
  
  if (imports.length === 0) return code;
  
  // Remove existing imports
  let codeWithoutImports = code.replace(importRegex, '');
  codeWithoutImports = codeWithoutImports.replace(/^\s*\n+/g, '');
  
  // Group imports
  const javaImports = [];
  const javaxImports = [];
  const thirdPartyImports = [];
  
  imports.forEach(imp => {
    if (imp.includes('import java.')) {
      javaImports.push(imp);
    } else if (imp.includes('import javax.')) {
      javaxImports.push(imp);
    } else {
      thirdPartyImports.push(imp);
    }
  });
  
  // Sort imports alphabetically within groups
  javaImports.sort();
  javaxImports.sort();
  thirdPartyImports.sort();
  
  // Combine with appropriate spacing
  const allImports = [
    ...javaImports,
    javaImports.length > 0 && javaxImports.length > 0 ? '' : null,
    ...javaxImports,
    (javaImports.length > 0 || javaxImports.length > 0) && thirdPartyImports.length > 0 ? '' : null,
    ...thirdPartyImports,
    ''  // Add blank line after imports
  ].filter(Boolean);
  
  return allImports.join('\n') + codeWithoutImports;
};

/**
 * Apply common refactoring improvements applicable to most languages
 */
const applyCommonRefactoring = (code: string, language: string): string => {
  let refactored = code;

  // Extract magic numbers and string literals into named constants
  refactored = extractConstants(refactored, language);
  
  // Improve variable names to be more descriptive
  refactored = improveVariableNames(refactored);
  
  // Add consistent spacing and line breaks
  refactored = improveFormatting(refactored, language);
  
  // Apply function modularization
  refactored = modularizeFunctions(refactored, language);
  
  // Improve error handling
  refactored = enhanceErrorHandling(refactored, language);
  
  return refactored;
};

/**
 * Apply user-requested specific refactoring instructions
 */
const applyCustomInstructions = (code: string, instructions: string, language: string): string => {
  let refactored = code;
  const lowercaseInstructions = instructions.toLowerCase();
  
  // Remove comments if requested
  if (lowercaseInstructions.includes('remove comments')) {
    refactored = removeAllComments(refactored, language);
  }
  
  // Add type hints if requested
  if (lowercaseInstructions.includes('add type') || 
      lowercaseInstructions.includes('type hints') || 
      lowercaseInstructions.includes('types')) {
    refactored = addTypeAnnotations(refactored, language);
  }
  
  // Extract constants if explicitly requested
  if (lowercaseInstructions.includes('extract constant') || 
      lowercaseInstructions.includes('constants')) {
    refactored = extractConstants(refactored, language, true);
  }
  
  // Break down functions if requested
  if (lowercaseInstructions.includes('modularize') || 
      lowercaseInstructions.includes('break down') || 
      lowercaseInstructions.includes('split function')) {
    refactored = modularizeFunctions(refactored, language, true);
  }
  
  // Add error handling if requested
  if (lowercaseInstructions.includes('error handling') || 
      lowercaseInstructions.includes('handle errors') || 
      lowercaseInstructions.includes('add try')) {
    refactored = enhanceErrorHandling(refactored, language, true);
  }
  
  return refactored;
};

/**
 * Extract magic numbers and string literals into named constants
 */
const extractConstants = (code: string, language: string, aggressive = false): string => {
  let refactored = code;
  
  // Extract numeric literals that appear multiple times
  const numberRegex = /\b(\d+(\.\d+)?)\b/g;
  const numbers = new Map();
  
  let match;
  const codeToScan = code.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  
  while ((match = numberRegex.exec(codeToScan)) !== null) {
    const num = match[0];
    // Ignore common numbers like 0, 1 that are natural in code
    if (num !== '0' && num !== '1' && num !== '2' && num.length > 1) {
      numbers.set(num, (numbers.get(num) || 0) + 1);
    }
  }
  
  // Extract string literals that appear multiple times
  const stringRegex = /(['"])((?:(?!\1).)*)\1/g;
  const strings = new Map();
  
  while ((match = stringRegex.exec(codeToScan)) !== null) {
    const str = match[0];
    // Only extract non-trivial strings
    if (str.length > 8 && !str.includes('\\n')) {
      strings.set(str, (strings.get(str) || 0) + 1);
    }
  }
  
  // Determine where to insert constants
  let insertPosition = 0;
  
  if (language === 'js' || language === 'jsx' || language === 'ts' || language === 'tsx') {
    // For JS/TS, insert after imports
    const importEnd = refactored.lastIndexOf('import ');
    if (importEnd >= 0) {
      insertPosition = refactored.indexOf('\n', importEnd) + 1;
      while (refactored.charAt(insertPosition) === '\n') insertPosition++;
    }
  } else if (language === 'py' || language === 'python') {
    // For Python, insert after imports and docstrings
    const docstringEnd = refactored.indexOf('"""', refactored.indexOf('"""') + 3);
    const importEnd = refactored.lastIndexOf('import ');
    insertPosition = Math.max(
      docstringEnd > 0 ? refactored.indexOf('\n', docstringEnd) + 1 : 0,
      importEnd > 0 ? refactored.indexOf('\n', importEnd) + 1 : 0
    );
    while (refactored.charAt(insertPosition) === '\n') insertPosition++;
  } else if (language === 'java') {
    // For Java, insert after package and imports, before class definition
    const classStart = refactored.indexOf('class ');
    if (classStart > 0) {
      insertPosition = refactored.lastIndexOf('\n', classStart) + 1;
    }
  } else if (language === 'cpp' || language === 'c' || language === 'h') {
    // For C/C++, insert after includes
    const includeEnd = refactored.lastIndexOf('#include');
    if (includeEnd >= 0) {
      insertPosition = refactored.indexOf('\n', includeEnd) + 1;
      while (refactored.charAt(insertPosition) === '\n') insertPosition++;
    }
  }
  
  // Generate constant definitions
  let constantsCode = '';
  
  // Add number constants
  numbers.forEach((count, num) => {
    if (count > (aggressive ? 1 : 2)) {
      let constName = `CONSTANT_${num.replace('.', '_')}`;
      
      // Make the name more meaningful if possible
      if (num.match(/^\d{3,4}$/)) constName = 'MAX_COUNT';
      else if (num === '100') constName = 'PERCENTAGE_100';
      else if (num === '1000') constName = 'MILLISECONDS_IN_SECOND';
      else if (num === '60') constName = 'SECONDS_IN_MINUTE';
      else if (num === '24') constName = 'HOURS_IN_DAY';
      else if (num === '365') constName = 'DAYS_IN_YEAR';
      else if (num === '3.14' || num === '3.1415' || num === '3.14159') constName = 'PI';
      else if (num === '2.71' || num === '2.718') constName = 'E';
      else if (num === '9.8' || num === '9.81') constName = 'GRAVITY';
      
      // Different syntax for different languages
      if (language === 'js' || language === 'jsx' || language === 'ts' || language === 'tsx') {
        constantsCode += `const ${constName} = ${num};\n`;
      } else if (language === 'py' || language === 'python') {
        constantsCode += `${constName} = ${num}\n`;
      } else if (language === 'java') {
        constantsCode += `private static final ${num.includes('.') ? 'double' : 'int'} ${constName} = ${num};\n`;
      } else if (language === 'cpp' || language === 'c' || language === 'h') {
        constantsCode += `const ${num.includes('.') ? 'double' : 'int'} ${constName} = ${num};\n`;
      }
      
      // Replace occurrences with constant name
      refactored = refactored.replace(new RegExp(`\\b${num}\\b`, 'g'), constName);
    }
  });
  
  // Add string constants
  strings.forEach((count, str) => {
    if (count > (aggressive ? 1 : 2)) {
      // Generate a meaningful name
      const content = str.substring(1, str.length - 1);
      let constName = `STRING_${content.substring(0, Math.min(content.length, 10))
        .replace(/[^a-zA-Z0-9]/g, '_')
        .toUpperCase()}`;
      
      // Different syntax for different languages
      if (language === 'js' || language === 'jsx' || language === 'ts' || language === 'tsx') {
        constantsCode += `const ${constName} = ${str};\n`;
      } else if (language === 'py' || language === 'python') {
        constantsCode += `${constName} = ${str}\n`;
      } else if (language === 'java') {
        constantsCode += `private static final String ${constName} = ${str};\n`;
      } else if (language === 'cpp' || language === 'c' || language === 'h') {
        constantsCode += `const std::string ${constName} = ${str};\n`;
      }
      
      // Replace occurrences with constant name
      refactored = refactored.replace(new RegExp(str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), constName);
    }
  });
  
  // Insert constants if any were defined
  if (constantsCode) {
    refactored = refactored.substring(0, insertPosition) + 
                 (insertPosition > 0 ? '\n' : '') +
                 '// Constants\n' + 
                 constantsCode + 
                 '\n' + 
                 refactored.substring(insertPosition);
  }
  
  return refactored;
};

/**
 * Improve variable names for better readability
 */
const improveVariableNames = (code: string): string => {
  let refactored = code;
  
  // Replace short variable names with more descriptive ones
  // Only replace isolated occurrences
  const singleCharVars = [
    { from: /\bi\b/g, to: 'index', check: (c) => c.includes('for') },
    { from: /\bj\b/g, to: 'nestedIndex', check: (c) => c.includes('for') },
    { from: /\bn\b/g, to: 'count', check: () => true },
    { from: /\bs\b/g, to: 'string', check: () => true },
    { from: /\ba\b/g, to: 'array', check: () => true },
    { from: /\bo\b/g, to: 'object', check: () => true },
    { from: /\bf\b/g, to: 'func', check: () => true },
    { from: /\be\b/g, to: 'error', check: (c) => c.includes('catch') || c.includes('try') },
    { from: /\br\b/g, to: 'result', check: () => true },
    { from: /\bv\b/g, to: 'value', check: () => true },
    { from: /\bk\b/g, to: 'key', check: () => true },
    { from: /\bp\b/g, to: 'position', check: () => true },
    { from: /\bt\b/g, to: 'temp', check: () => true },
    { from: /\bx\b/g, to: 'xCoord', check: () => true },
    { from: /\by\b/g, to: 'yCoord', check: () => true },
    { from: /\bz\b/g, to: 'zCoord', check: () => true },
    { from: /\bm\b/g, to: 'map', check: () => true },
    { from: /\bc\b/g, to: 'char', check: () => true },
    { from: /\bd\b/g, to: 'data', check: () => true },
  ];
  
  singleCharVars.forEach(({ from, to, check }) => {
    if (check(code)) {
      refactored = refactored.replace(from, to);
    }
  });
  
  // Improve common ambiguous variable names
  const ambiguousVars = [
    { from: /\btmp\b/g, to: 'temporary' },
    { from: /\btemp\b/g, to: 'temporary' },
    { from: /\bval\b/g, to: 'value' },
    { from: /\bvar\b/g, to: 'variable' },
    { from: /\bobj\b/g, to: 'object' },
    { from: /\barr\b/g, to: 'array' },
    { from: /\belm\b/g, to: 'element' },
    { from: /\belem\b/g, to: 'element' },
    { from: /\btxt\b/g, to: 'text' },
    { from: /\bnum\b/g, to: 'number' },
    { from: /\bpos\b/g, to: 'position' },
    { from: /\bidx\b/g, to: 'index' },
    { from: /\bctx\b/g, to: 'context' },
    { from: /\bres\b/g, to: 'result' },
    { from: /\bresp\b/g, to: 'response' },
    { from: /\breq\b/g, to: 'request' },
    { from: /\berr\b/g, to: 'error' },
    { from: /\bsrc\b/g, to: 'source' },
    { from: /\bdest\b/g, to: 'destination' },
    { from: /\bconfig\b/g, to: 'configuration' },
    { from: /\bconf\b/g, to: 'configuration' },
  ];
  
  ambiguousVars.forEach(({ from, to }) => {
    refactored = refactored.replace(from, to);
  });
  
  return refactored;
};

/**
 * Improve code formatting consistently across languages
 */
const improveFormatting = (code: string, language: string): string => {
  let refactored = code;
  
  // Ensure consistent spacing around operators
  refactored = refactored.replace(/([a-zA-Z0-9_])([\+\-\*\/=<>!&|%])/g, '$1 $2');
  refactored = refactored.replace(/([\+\-\*\/=<>!&|%])([a-zA-Z0-9_])/g, '$1 $2');
  
  // Fix multiple spaces
  refactored = refactored.replace(/\s{2,}/g, ' ');
  
  // Ensure spacing after commas
  refactored = refactored.replace(/,([^\s])/g, ', $1');
  
  // Remove trailing whitespace
  refactored = refactored.replace(/[ \t]+$/gm, '');
  
  // Limit blank lines to maximum of 2
  refactored = refactored.replace(/\n{3,}/g, '\n\n');
  
  // Improve if-else formatting
  if (language === 'js' || language === 'jsx' || language === 'ts' || language === 'tsx' || 
      language === 'java' || language === 'cpp' || language === 'c') {
    // Ensure consistent brace style
    refactored = refactored.replace(/if\s*\([^)]+\)\s*\n\s*{/g, 'if ($1) {');
    refactored = refactored.replace(/}\s*else\s*{/g, '} else {');
    refactored = refactored.replace(/}\s*else\s+if\s*\([^)]+\)\s*{/g, '} else if ($1) {');
  }
  
  return refactored;
};

/**
 * Break down large functions into smaller, more focused ones
 */
const modularizeFunctions = (code: string, language: string, aggressive = false): string => {
  // This is a simplified approach - real modularization requires AST parsing
  // For comprehensive refactoring, we'd need a full language parser
  
  let refactored = code;
  const lineCountThreshold = aggressive ? 15 : 25;
  
  if (language === 'js' || language === 'jsx' || language === 'ts' || language === 'tsx') {
    // Identify JavaScript/TypeScript functions
    const functionRegex = /(?:function\s+([a-zA-Z0-9_]+)|const\s+([a-zA-Z0-9_]+)\s*=\s*(?:function|\([^)]*\)\s*=>))\s*[{]([^}]+)[}]/gs;
    let match;
    
    while ((match = functionRegex.exec(code)) !== null) {
      const functionName = match[1] || match[2];
      const functionBody = match[3];
      
      // If function is large enough to warrant splitting
      const lineCount = functionBody.split('\n').length;
      if (lineCount > lineCountThreshold) {
        // Look for logical blocks in the function body
        const blocks = functionBody.split(/\n\s*\n/);
        
        if (blocks.length > 1) {
          // Create helper functions for identified blocks
          const helpers = [];
          let modifiedBody = functionBody;
          
          blocks.forEach((block, index) => {
            if (block.trim() && index > 0 && block.length > 80) {
              const helperName = `${functionName}Helper${index}`;
              
              // Create a helper function
              const helperFunction = `const ${helperName} = () => {\n${block}\n};\n\n`;
              helpers.push(helperFunction);
              
              // Replace the block with a call to the helper
              modifiedBody = modifiedBody.replace(block, `${helperName}();`);
            }
          });
          
          // Replace the original function with modified version and helpers
          if (helpers.length > 0) {
            const originalFunction = match[0];
            const modifiedFunction = originalFunction.replace(functionBody, modifiedBody);
            const replacement = helpers.join('') + modifiedFunction;
            
            refactored = refactored.replace(originalFunction, replacement);
          }
        }
      }
    }
  } else if (language === 'py' || language === 'python') {
    // Identify Python functions
    const functionRegex = /def\s+([a-zA-Z0-9_]+)\s*\([^)]*\):\s*(?:"""[^"""]*""")?([^]*?)(?=\n\S|$)/gs;
    let match;
    
    while ((match = functionRegex.exec(code)) !== null) {
      const functionName = match[1];
      const functionBody = match[2] || '';
      
      // If function is large enough to warrant splitting
      const lineCount = functionBody.split('\n').length;
      if (lineCount > lineCountThreshold) {
        // Look for logical blocks with consistent indentation
        const lines = functionBody.split('\n');
        const blocks = [];
        let currentBlock = [];
        let indentLevel = -1;
        
        lines.forEach(line => {
          if (line.trim()) {
            const currentIndent = line.search(/\S/);
            if (indentLevel === -1) {
              indentLevel = currentIndent;
            }
            
            if (currentIndent === indentLevel && currentBlock.length > 0) {
              blocks.push(currentBlock.join('\n'));
              currentBlock = [line];
            } else {
              currentBlock.push(line);
            }
          } else if (currentBlock.length > 0) {
            currentBlock.push(line);
          }
        });
        
        if (currentBlock.length > 0) {
          blocks.push(currentBlock.join('\n'));
        }
        
        // Create helper functions if blocks can be extracted
        if (blocks.length > 1) {
          const helpers = [];
          let modifiedBody = functionBody;
          
          blocks.forEach((block, index) => {
            if (block.trim() && index > 0 && block.length > 100) {
              const helperName = `_${functionName}_helper_${index}`;
              
              // Create a helper function with the same indentation level
              const helperFunction = `def ${helperName}():\n${block}\n\n`;
              helpers.push(helperFunction);
              
              // Replace the block with a call to the helper
              modifiedBody = modifiedBody.replace(block, `${helperName}()`);
            }
          });
          
          // Replace the original function with modified version and helpers
          if (helpers.length > 0) {
            const originalFunction = match[0];
            const modifiedFunction = originalFunction.replace(functionBody, modifiedBody);
            const replacement = helpers.join('') + modifiedFunction;
            
            refactored = refactored.replace(originalFunction, replacement);
          }
        }
      }
    }
  }
  
  return refactored;
};

/**
 * Enhance error handling throughout the code
 */
const enhanceErrorHandling = (code: string, language: string, aggressive = false): string => {
  let refactored = code;
  
  if (language === 'js' || language === 'jsx' || language === 'ts' || language === 'tsx') {
    // Add try-catch around risky operations in JavaScript/TypeScript
    
    // File operations
    refactored = refactored.replace(
      /(?<!try\s*{\s*)(?:fs\.(?:read|write|append|unlink|mkdir)(?:File|Dir|Sync)?|require)\s*\([^)]+\)/g,
      (match) => !match.includes('try') ? `try {\n  ${match}\n} catch (error) {\n  console.error("Error:", error);\n}` : match
    );
    
    // Fetch operations
    refactored = refactored.replace(
      /(?<!try\s*{\s*)(?:const|let|var)?\s*([a-zA-Z0-9_]+)\s*=\s*await\s+fetch\s*\([^)]+\)/g,
      (match, varName) => !match.includes('try') ? 
        `try {\n  ${match}\n} catch (error) {\n  console.error("Error fetching data:", error);\n}` : match
    );
    
    // JSON operations
    refactored = refactored.replace(
      /(?<!try\s*{\s*)JSON\.parse\s*\(([^)]+)\)/g,
      (match, arg) => !match.includes('try') ? 
        `try {\n  JSON.parse(${arg})\n} catch (error) {\n  console.error("Error parsing JSON:", error);\n  return {};\n}` : match
    );
    
  } else if (language === 'py' || language === 'python') {
    // Add try-except around risky operations in Python
    
    // File operations
    refactored = refactored.replace(
      /(?<!try:\s*)(?:open|with\s+open)\s*\([^)]+\)/g,
      (match) => !match.includes('try') ? 
        `try:\n    ${match}\nexcept Exception as e:\n    print(f"Error: {e}")` : match
    );
    
    // JSON operations
    refactored = refactored.replace(
      /(?<!try:\s*)json\.loads\s*\(([^)]+)\)/g,
      (match, arg) => !match.includes('try') ? 
        `try:\n    json.loads(${arg})\nexcept json.JSONDecodeError as e:\n    print(f"Error parsing JSON: {e}")\n    return {}` : match
    );
    
    // Database operations
    refactored = refactored.replace(
      /(?<!try:\s*)(?:cursor\.execute|connection\.commit)\s*\([^)]*\)/g,
      (match) => !match.includes('try') ? 
        `try:\n    ${match}\nexcept Exception as e:\n    print(f"Database error: {e}")` : match
    );
  }
  
  return refactored;
};

/**
 * Remove all comments from code
 */
const removeAllComments = (code: string, language: string): string => {
  let result = code;
  
  // Remove multi-line comments
  if (language !== 'py' && language !== 'python') {
    result = result.replace(/\/\*[\s\S]*?\*\//g, '');
  }
  
  // Remove single-line comments
  if (language === 'py' || language === 'python') {
    result = result.replace(/\s*#.*$/gm, '');
  } else {
    result = result.replace(/\s*\/\/.*$/gm, '');
  }
  
  // Remove doc comments in Python
  if (language === 'py' || language === 'python') {
    result = result.replace(/"""[\s\S]*?"""/g, '');
    result = result.replace(/'''[\s\S]*?'''/g, '');
  }
  
  // Clean up excessive blank lines after removing comments
  result = result.replace(/\n{3,}/g, '\n\n');
  
  return result;
};

/**
 * Add type annotations to code when appropriate
 */
const addTypeAnnotations = (code: string, language: string): string => {
  let refactored = code;
  
  if (language === 'ts' || language === 'tsx') {
    // TypeScript already has types, no need to add more
    return refactored;
  } else if (language === 'js' || language === 'jsx') {
    // Add JSDoc type annotations to JavaScript
    
    // Add return types to functions
    refactored = refactored.replace(
      /function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*{/g,
      (match, funcName, params) => {
        if (!match.includes('/**')) {
          const paramNames = params.split(',').map(p => p.trim().split('=')[0].trim());
          const paramsDoc = paramNames.length > 0 && paramNames[0] !== '' ? 
            paramNames.map(p => ` * @param {*} ${p}`).join('\n') + '\n' : '';
          
          return `/**\n * ${funcName} function\n${paramsDoc} * @returns {*}\n */\nfunction ${funcName}(${params}) {`;
        }
        return match;
      }
    );
    
    // Add types to arrow functions
    refactored = refactored.replace(
      /const\s+([a-zA-Z0-9_]+)\s*=\s*(\([^)]*\)|\w+)\s*=>/g,
      (match, funcName, params) => {
        if (!match.includes('/**')) {
          const paramStr = params.replace(/[\(\)]/g, '');
          const paramNames = paramStr.split(',').map(p => p.trim().split('=')[0].trim());
          const paramsDoc = paramNames.length > 0 && paramNames[0] !== '' ? 
            paramNames.map(p => ` * @param {*} ${p}`).join('\n') + '\n' : '';
          
          return `/**\n * ${funcName} function\n${paramsDoc} * @returns {*}\n */\nconst ${funcName} = ${params} =>`;
        }
        return match;
      }
    );
    
  } else if (language === 'py' || language === 'python') {
    // Add Python type hints (Python 3.6+)
    
    // Add return types to functions
    refactored = refactored.replace(
      /def\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\):/g,
      (match, funcName, params) => {
        // Only add if no return type exists
        if (!match.includes(' -> ')) {
          // Add parameter type hints if they don't exist
          const typedParams = params.split(',')
            .filter(p => p.trim())
            .map(p => {
              if (p.includes(':')) return p.trim(); // Already has type
              
              const paramName = p.trim().split('=')[0].trim();
              if (paramName.toLowerCase().includes('str') || paramName.endsWith('name') || paramName.endsWith('text')) {
                return `${paramName}: str`;
              } else if (paramName.toLowerCase().includes('num') || paramName.endsWith('count') || paramName.endsWith('id')) {
                return `${paramName}: int`;
              } else if (paramName.toLowerCase().includes('list') || paramName.endsWith('s')) {
                return `${paramName}: list`;
              } else if (paramName.toLowerCase().includes('dict')) {
                return `${paramName}: dict`;
              } else if (paramName.toLowerCase().includes('bool') || paramName.startsWith('is_')) {
                return `${paramName}: bool`;
              }
              return `${paramName}: Any`;
            })
            .join(', ');
          
          // Determine return type based on function name and content
          let returnType = 'Any';
          if (funcName.startsWith('get_') || funcName.startsWith('fetch_') || funcName.startsWith('find_')) {
            returnType = 'Optional[Any]';
          } else if (funcName.startsWith('is_') || funcName.startsWith('has_') || funcName.startsWith('check_')) {
            returnType = 'bool';
          } else if (funcName.startsWith('count_') || funcName.endsWith('_count')) {
            returnType = 'int';
          }
          
          return `def ${funcName}(${typedParams}) -> ${returnType}:`;
        }
        return match;
      }
    );
    
    // Add imports for typing module if using type hints
    if (refactored.includes(' -> ') && !refactored.includes('from typing import')) {
      // Find appropriate place to add import (after existing imports)
      const importEnd = refactored.lastIndexOf('import ');
      let insertPosition = importEnd > 0 ? refactored.indexOf('\n', importEnd) + 1 : 0;
      
      // Add typing import
      const importStatement = 'from typing import Any, Dict, List, Optional, Union\n';
      refactored = refactored.substring(0, insertPosition) + importStatement + refactored.substring(insertPosition);
    }
  }
  
  return refactored;
};

// Re-export the utility functions
export { 
  extractConstants, 
  improveVariableNames, 
  modularizeFunctions, 
  enhanceErrorHandling,
  addTypeAnnotations,
  removeAllComments
};
