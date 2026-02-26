import { RefactoringOptions } from './index';

/**
 * Refactor JavaScript/TypeScript code to follow best practices
 * with enhanced security and code smell detection
 */
export const refactorJavaScript = (code: string, options?: RefactoringOptions): string => {
  let refactored = code;
  
  // Security: Replace potentially unsafe eval usage
  refactored = refactored.replace(
    /eval\s*\((.*?)\)/g,
    '/* Security Issue: eval() is unsafe */ Function($1)'
  );
  
  // Security: Replace innerHTML with safer alternatives
  refactored = refactored.replace(
    /\.innerHTML\s*=\s*/g,
    '.textContent = '
  );
  
  // Security: Add input sanitization for user inputs
  refactored = refactored.replace(
    /(const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*([a-zA-Z0-9_]+)\.value/g,
    '$1 $2 = sanitizeInput($3.value)'
  );
  
  // Security: Add CSRF token to fetch requests
  refactored = refactored.replace(
    /fetch\s*\(\s*(['"`][^'"`]+['"`])/g,
    'fetch($1, { headers: { "X-CSRF-Token": getCsrfToken() } }'
  );
  
  // Code Smell: Replace magic numbers with named constants
  const magicNumbers = new Set<string>();
  refactored = refactored.replace(/\b(\d{3,})\b/g, (match, number) => {
    if (!magicNumbers.has(number)) {
      magicNumbers.add(number);
      const constantName = `CONSTANT_${number}`;
      refactored = `const ${constantName} = ${number};\n${refactored}`;
      return constantName;
    }
    return match;
  });
  
  // Code Smell: Break down large functions
  refactored = refactored.replace(
    /function\s+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*{([^}]{500,})}/g,
    (match, funcName, body) => {
      const lines = body.split('\n');
      const chunks = [];
      let currentChunk = [];
      
      for (const line of lines) {
        currentChunk.push(line);
        if (currentChunk.length === 20) {
          chunks.push(currentChunk);
          currentChunk = [];
        }
      }
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
      }
      
      const helperFunctions = chunks.map((chunk, i) => 
        `function ${funcName}Part${i + 1}() {\n${chunk.join('\n')}\n}`
      ).join('\n\n');
      
      return `${helperFunctions}\n\nfunction ${funcName}() {\n${
        chunks.map((_, i) => `  ${funcName}Part${i + 1}();`).join('\n')
      }\n}`;
    }
  );

  // Code Smell: Remove duplicate code blocks
  const codeBlocks = new Map<string, number>();
  refactored = refactored.replace(/\{([^{}]{50,})\}/g, (match, block) => {
    const trimmedBlock = block.trim();
    const count = codeBlocks.get(trimmedBlock) || 0;
    codeBlocks.set(trimmedBlock, count + 1);
    
    if (count > 0) {
      const functionName = `extractedFunction${count}`;
      refactored = `function ${functionName}() {\n${trimmedBlock}\n}\n${refactored}`;
      return `{ ${functionName}(); }`;
    }
    return match;
  });
  
  // Add type safety checks for function parameters
  refactored = refactored.replace(
    /function\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)/g,
    (match, funcName, params) => {
      const paramsList = params.split(',').map(p => p.trim());
      const typeChecks = paramsList.map(param => 
        `  if (typeof ${param} === 'undefined') throw new Error('${param} is required');`
      ).join('\n');
      
      return `function ${funcName}(${params}) {\n${typeChecks}\n`;
    }
  );
  
  // Add error boundaries around async operations
  refactored = refactored.replace(
    /async\s+function\s+([a-zA-Z0-9_]+)/g,
    `async function $1(...args) {\n  try {\n    const result = await (async () => {`
  );
  refactored = refactored.replace(
    /}\s*\/\/\s*end\s+async/g,
    `    })(...args);\n    return result;\n  } catch (error) {\n    console.error('Error in $1:', error);\n    throw error;\n  }\n}`
  );

  // Replace var with const/let
  refactored = refactored.replace(/var\s+([a-zA-Z0-9_]+)\s*=\s*([^;]+);/g, (match, varName, value) => {
    // Use const by default unless there's evidence of reassignment
    const isReassigned = new RegExp(`${varName}\\s*=\\s*`, 'g').test(code);
    return isReassigned ? `let ${varName} = ${value};` : `const ${varName} = ${value};`;
  });
  
  // Convert function declarations to arrow functions for non-method functions
  refactored = refactored.replace(
    /function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*{(?!\s*this)/g, 
    'const $1 = ($2) => {'
  );
  
  // Replace traditional for loops with array methods where possible
  refactored = refactored.replace(
    /for\s*\(\s*(?:let|var|const)?\s+([a-zA-Z0-9_]+)\s*=\s*0;\s*\1\s*<\s*([a-zA-Z0-9_]+)\.length;\s*\1\+\+\s*\)\s*{\s*([^}]*?)([a-zA-Z0-9_]+)\.push\(([^;]*)\);\s*}/g,
    '$2.map(item => $5)'
  );
  
  refactored = refactored.replace(
    /for\s*\(\s*(?:let|var|const)?\s+([a-zA-Z0-9_]+)\s*=\s*0;\s*\1\s*<\s*([a-zA-Z0-9_]+)\.length;\s*\1\+\+\s*\)\s*{(?!\s*return)([^}]*)}/g,
    '$2.forEach((item, index) => {$3})'
  );
  
  // Replace filter operations in loops
  refactored = refactored.replace(
    /const\s+([a-zA-Z0-9_]+)\s*=\s*\[\];\s*for\s*\(\s*(?:let|var|const)?\s+([a-zA-Z0-9_]+)\s*=\s*0;\s*\2\s*<\s*([a-zA-Z0-9_]+)\.length;\s*\2\+\+\s*\)\s*{\s*if\s*\(([^}]*?)\)\s*{\s*\1\.push\(([^;]*)\);\s*}\s*}/g,
    'const $1 = $3.filter((item, index) => $4).map((item) => $5)'
  );
  
  // Convert callbacks to async/await style when possible
  refactored = refactored.replace(
    /([a-zA-Z0-9_]+)\s*\.\s*then\s*\(\s*(?:function\s*\(([^)]*)\)|(?:\(([^)]*)\)\s*=>))\s*{([^}]*)}\s*\)\.catch\s*\(\s*(?:function\s*\((?:[^)]*)\)|(?:\(([^)]*)\)\s*=>))\s*{([^}]*)}\s*\)/g,
    'try {\n  const $2$3 = await $1;\n  $4\n} catch ($5error) {\n  $6\n}'
  );
  
  // Replace string concatenation with template literals
  refactored = refactored.replace(/(['"])([^'"]*?)\1\s*\+\s*([a-zA-Z0-9_\.]+)(?!\s*\+)/g, '`$2${$3}`');
  refactored = refactored.replace(/([a-zA-Z0-9_\.]+)\s*\+\s*(['"])([^'"]*?)\2(?!\s*\+)/g, '`${$1}$3`');
  refactored = refactored.replace(/(['"])([^'"]*?)\1\s*\+\s*([a-zA-Z0-9_\.]+)\s*\+\s*(['"])([^'"]*?)\4/g, '`$2${$3}$5`');
  
  // Replace traditional conditionals with ternary and nullish coalescing where appropriate
  refactored = refactored.replace(
    /if\s*\(([^)]+)\)\s*{\s*return\s+([^;]+);\s*}\s*else\s*{\s*return\s+([^;]+);\s*}/g,
    'return $1 ? $2 : $3;'
  );
  
  refactored = refactored.replace(
    /([a-zA-Z0-9_]+)\s*=\s*(?:([a-zA-Z0-9_]+)\s*!==\s*(?:null|undefined|''|""|false|0))?\s*\?\s*\2\s*:\s*([^;]+);/g,
    '$1 = $2 ?? $3;'
  );
  
  // Use object property shorthand
  refactored = refactored.replace(/{\s*([a-zA-Z0-9_]+)\s*:\s*([a-zA-Z0-9_]+)\s*(?:,)?/g, (match, key, value) => {
    if (key === value) {
      return `{ ${key}`;
    }
    return match;
  });
  
  // Convert to ES6 import/export syntax
  refactored = refactored.replace(/const\s+([a-zA-Z0-9_]+)\s*=\s*require\(['"]([^'"]+)['"]\);/g, 'import $1 from "$2";');
  refactored = refactored.replace(/module\.exports\s*=\s*([a-zA-Z0-9_]+);/g, 'export default $1;');
  refactored = refactored.replace(/exports\.([a-zA-Z0-9_]+)\s*=\s*([a-zA-Z0-9_]+);/g, 'export const $1 = $2;');
  
  // Replace anonymous functions with named functions for better stack traces
  refactored = refactored.replace(
    /const\s+([a-zA-Z0-9_]+)\s*=\s*function\s*\(/g,
    'const $1 = function $1('
  );
  
  // Add proper JSDoc comments to functions
  refactored = refactored.replace(
    /(?:export\s+)?(?:const|function)\s+([a-zA-Z0-9_]+)\s*(?:=\s*(?:\([^)]*\)|function[^(]*)\s*=>|\([^)]*\))\s*(?:=>)?\s*[{]/g,
    (match, funcName) => {
      if (!match.includes('/**')) {
        return `/**\n * ${funcName} function\n * @returns {any} Result\n */\n${match}`;
      }
      return match;
    }
  );
  
  // Use optional chaining for nested object access
  refactored = refactored.replace(
    /if\s*\(\s*([a-zA-Z0-9_]+)(?:\.[a-zA-Z0-9_]+)+\s*(?:!==\s*(?:undefined|null)\s*)?\)\s*{/g,
    (match, objName) => {
      if (match.includes('.') && objName) {
        const chain = match.match(/([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+)/);
        if (chain) {
          return match.replace(chain[0], chain[0].replace(/\./g, '?.'));
        }
      }
      return match;
    }
  );
  
  // Add semicolons where missing
  refactored = refactored.replace(/([a-zA-Z0-9_\)`}])\s*\n(?!\s*[)}\],;.])/g, '$1;\n');
  
  return refactored;
};

// Add necessary utility functions
const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '')  // Remove potential HTML
    .trim()                // Remove whitespace
    .substring(0, 1000);   // Limit length
};

const getCsrfToken = (): string => {
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
};
