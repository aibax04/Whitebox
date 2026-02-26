
import { RefactoringOptions } from './refactors';

/**
 * Refactor Python code to follow best practices
 * with enhanced security and code smell detection
 */
export const refactorPython = (code: string, options?: RefactoringOptions): string => {
  // Check if this is a Jupyter Notebook file (JSON format)
  if (code.trim().startsWith('{') && code.includes('"cell_type"') && code.includes('"source"')) {
    return refactorJupyterNotebook(code, options);
  }
  
  let refactored = code;
  
  // Security: Replace unsafe eval usage
  refactored = refactored.replace(
    /eval\s*\((.*?)\)/g,
    'ast.literal_eval($1)  # Safer alternative to eval'
  );
  
  // Security: Add input validation
  refactored = refactored.replace(
    /input\s*\((.*?)\)/g,
    'validate_input(input($1))'
  );
  
  // Security: Replace shell=True in subprocess calls
  refactored = refactored.replace(
    /subprocess\.(?:call|run|Popen)\s*\((.*?),\s*shell\s*=\s*True/g,
    'subprocess.run($1, shell=False'
  );

  // Security: Add sanitization for database queries
  refactored = refactored.replace(
    /cursor\.execute\s*\(\s*["'`]([^"'`]+)["'`]\s*(?:,\s*\(([^)]+)\))?\s*\)/g,
    'cursor.execute(sql_sanitize("$1"), ($2))'
  );

  // Security: Add HTML escaping for web output
  refactored = refactored.replace(
    /render_template\s*\(\s*["'`]([^"'`]+)["'`]\s*,([^)]+)\)/g,
    'render_template("$1", **html_escape_dict($2))'
  );

  // Security: Add CSRF protection
  if (refactored.includes('flask') && !refactored.includes('CSRFProtect')) {
    refactored = refactored.replace(
      /(from\s+flask\s+import\s+[^)]+)/g,
      '$1\nfrom flask_wtf.csrf import CSRFProtect\n\ncsrf = CSRFProtect()'
    );
    refactored = refactored.replace(
      /(app\s*=\s*Flask\s*\([^)]+\))/g,
      '$1\ncsrf.init_app(app)'
    );
  }
  
  // Code Smell: Replace magic numbers with named constants
  const magicNumbers = new Set<string>();
  refactored = refactored.replace(/\b(\d{3,})\b/g, (match, number) => {
    if (!magicNumbers.has(number)) {
      magicNumbers.add(number);
      const constantName = `CONSTANT_${number}`;
      refactored = `${constantName} = ${number}\n${refactored}`;
      return constantName;
    }
    return match;
  });

  // Code Smell: Improve variable naming
  refactored = refactored.replace(/\b([a-z])\b(?!\s*=)/g, (match, variable) => {
    if (variable === 'i' || variable === 'j' || variable === 'k') {
      return variable; // Common loop variables, leave as is
    }
    const betterNames: Record<string, string> = {
      'a': 'array_val',
      'b': 'boolean_val',
      'c': 'count',
      'd': 'data',
      'e': 'element',
      'f': 'file_obj',
      'l': 'list_val',
      'm': 'map_val',
      'n': 'number',
      'o': 'object',
      'p': 'param',
      'q': 'queue',
      'r': 'result',
      's': 'string',
      't': 'temp',
      'u': 'user',
      'v': 'value',
      'x': 'x_coord',
      'y': 'y_coord',
      'z': 'z_coord'
    };
    return betterNames[variable] || variable;
  });
  
  // Code Smell: Add type hints
  refactored = refactored.replace(
    /def\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\):/g,
    (match, funcName, params) => {
      const paramsList = params.split(',').map(p => p.trim());
      const typedParams = paramsList.map(param => 
        param ? `${param}: Any` : ''
      ).join(', ');
      return `def ${funcName}(${typedParams}) -> Any:`;
    }
  );
  
  // Code Smell: Break down large functions
  refactored = refactored.replace(
    /def\s+([a-zA-Z0-9_]+)\s*\([^)]*\):[^def]*?(?=def|\Z)/g,
    (match, funcName) => {
      if (match.split('\n').length > 20) {
        const parts = match.split('\n').reduce((acc, line, i) => {
          const partIndex = Math.floor(i / 20);
          if (!acc[partIndex]) acc[partIndex] = [];
          acc[partIndex].push(line);
          return acc;
        }, [] as string[][]);
        
        const helperFunctions = parts.map((part, i) => 
          `def ${funcName}_part${i + 1}():\n    ${part.join('\n    ')}`
        ).join('\n\n');
        
        return `${helperFunctions}\n\ndef ${funcName}():\n    ${
          parts.map((_, i) => `${funcName}_part${i + 1}()`).join('\n    ')
        }`;
      }
      return match;
    }
  );

  // Add docstrings to functions and classes
  refactored = refactored.replace(
    /def\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\):/g,
    (match, funcName, params) => {
      if (!match.includes('"""')) {
        const formattedParams = params.split(',')
          .filter(p => p.trim())
          .map(p => `        ${p.trim().split('=')[0].trim()}: Parameter description`)
          .join('\n');
        
        const docstring = `def ${funcName}(${params}):\n    """${funcName} function.\n    \n    Args:\n${formattedParams}\n    \n    Returns:\n        Result description\n    """\n`;
        return docstring;
      }
      return match;
    }
  );
  
  refactored = refactored.replace(
    /class\s+([a-zA-Z0-9_]+)(?:\s*\(([^)]*)\))?:/g,
    (match, className, parent) => {
      if (!match.includes('"""')) {
        const parentInfo = parent ? ` inheriting from ${parent}` : '';
        const docstring = `class ${className}${parent ? '('+parent+')' : ''}:\n    """${className} class${parentInfo}.\n    """\n`;
        return docstring;
      }
      return match;
    }
  );
  
  // Maintainability: Replace old-style string formatting with f-strings
  refactored = refactored.replace(/(['"])([^'"]*?)%\s*(\([^)]+\))/g, 'f$1$2$3');
  refactored = refactored.replace(/(['"])([^'"]*?)%\s*([a-zA-Z0-9_]+)/g, 'f$1$2{$3}$1');
  
  // Maintainability: Convert string concatenation to f-strings
  refactored = refactored.replace(/(['"])([^'"]*)\1\s*\+\s*str\(([^)]+)\)(?:\s*\+\s*(['"])([^'"]*)\4)?/g, 'f$1$2{$3}$5$1');
  
  // Maintainability: Convert traditional for loops to list comprehensions or generators when suitable
  refactored = refactored.replace(
    /([a-zA-Z0-9_]+)\s*=\s*\[\]\s*\n\s*for\s+([a-zA-Z0-9_]+)\s+in\s+([^:]+):\s*\n\s+([a-zA-Z0-9_]+)\.append\(([^)]+)\)/g, 
    '$1 = [$5 for $2 in $3]'
  );
  
  // Performance: Use enumerate instead of manual indexing
  refactored = refactored.replace(
    /for\s+i\s+in\s+range\(len\(([a-zA-Z0-9_]+)\)\):/g,
    'for i, item in enumerate($1):'
  );
  
  // Code Smell: Replace if x == True/False with better syntax
  refactored = refactored.replace(/if\s+([a-zA-Z0-9_]+)\s*==\s*True/g, 'if $1');
  refactored = refactored.replace(/if\s+([a-zA-Z0-9_]+)\s*==\s*False/g, 'if not $1');
  
  // Security: Use context managers (with statements) for file operations
  refactored = refactored.replace(
    /([a-zA-Z0-9_]+)\s*=\s*open\(([^)]+)\)\s*\n([^]*?)([a-zA-Z0-9_]+)\.close\(\)/gs,
    'with open($2) as $1:\n$3'
  );
  
  // Performance: Replace traditional index loops with for-each loops when possible
  refactored = refactored.replace(
    /for\s+i\s+in\s+range\(len\(([a-zA-Z0-9_]+)\)\):\s*\n\s+([a-zA-Z0-9_]+)\s*=\s*\1\[i\]/g,
    'for $2 in $1:'
  );
  
  // Maintainability: Use list comprehensions for filtering
  refactored = refactored.replace(
    /([a-zA-Z0-9_]+)\s*=\s*\[\]\s*\n\s*for\s+([a-zA-Z0-9_]+)\s+in\s+([^:]+):\s*\n\s+if\s+([^:]+):\s*\n\s+([a-zA-Z0-9_]+)\.append\(([^)]+)\)/g,
    '$1 = [$6 for $2 in $3 if $4]'
  );
  
  // Maintainability: Use dictionary comprehensions
  refactored = refactored.replace(
    /([a-zA-Z0-9_]+)\s*=\s*{}\s*\n\s*for\s+([a-zA-Z0-9_]+)\s+in\s+([^:]+):\s*\n\s+([a-zA-Z0-9_]+)\[([^]]+)\]\s*=\s*([^#\n]+)/g,
    '$1 = {$5: $6 for $2 in $3}'
  );
  
  // Performance: Replace range(len()) with direct enumeration
  refactored = refactored.replace(
    /for\s+([a-zA-Z0-9_]+)\s+in\s+range\(len\(([a-zA-Z0-9_]+)\)\):/g,
    'for $1, item in enumerate($2):'
  );
  
  // Maintainability: Add type hints (for Python 3.6+)
  refactored = refactored.replace(
    /def\s+([a-zA-Z0-9_]+)\s*\(([^:)]*)\):/g,
    (match, funcName, params) => {
      if (!params.includes(':')) {
        // Only add type hints if they don't exist
        const typedParams = params.split(',')
          .filter(p => p.trim())
          .map(p => {
            const paramName = p.trim().split('=')[0].trim();
            if (paramName.toLowerCase().includes('str') || paramName.endsWith('name') || paramName.endsWith('text')) {
              return `${paramName}: str`;
            } else if (paramName.toLowerCase().includes('num') || paramName.endsWith('count') || paramName.endsWith('id')) {
              return `${paramName}: int`;
            } else if (paramName.toLowerCase().includes('list') || paramName.endsWith('s')) {
              return `${paramName}: list`;
            } else if (paramName.toLowerCase().includes('dict')) {
              return `${paramName}: dict`;
            } else if (paramName.toLowerCase().includes('bool') || paramName.startsWith('is_') || paramName.startsWith('has_')) {
              return `${paramName}: bool`;
            }
            return `${paramName}: any`;
          })
          .join(', ');
        
        return `def ${funcName}(${typedParams}) -> any:`;
      }
      return match;
    }
  );
  
  // Security: Add error handling where appropriate
  refactored = refactored.replace(
    /([a-zA-Z0-9_]+)\s*=\s*json\.loads\(([^)]+)\)/g,
    'try:\n    $1 = json.loads($2)\nexcept json.JSONDecodeError as e:\n    print(f"Error decoding JSON: {e}")\n    $1 = {}'
  );
  
  // Security: Add input validation function if not present
  if (refactored.includes('validate_input(') && !refactored.includes('def validate_input(')) {
    refactored = `def validate_input(input_data):\n    """Validate and sanitize user input.\n    \n    Args:\n        input_data: The input string to validate\n        \n    Returns:\n        Sanitized input string\n    """\n    if isinstance(input_data, str):\n        # Remove potential XSS/command injection characters\n        sanitized = input_data.replace('<', '').replace('>', '').replace(';', '')\n        # Limit input length for DoS protection\n        return sanitized[:1000]\n    return str(input_data)[:1000]\n\n${refactored}`;
  }
  
  // Security: Add SQL sanitization function if not present
  if (refactored.includes('sql_sanitize(') && !refactored.includes('def sql_sanitize(')) {
    refactored = `def sql_sanitize(sql_query):\n    """Sanitize SQL queries to prevent SQL injection.\n    \n    Args:\n        sql_query: The SQL query string\n        \n    Returns:\n        Sanitized SQL query\n    """\n    # Simple sanitization - in real code, use parameterized queries instead\n    return sql_query.replace("'", "''").replace(";", "")\n\n${refactored}`;
  }
  
  // Security: Add HTML escaping function if not present
  if (refactored.includes('html_escape_dict(') && !refactored.includes('def html_escape_dict(')) {
    refactored = `import html\n\ndef html_escape_dict(data_dict):\n    """Escape HTML characters in all string values of a dictionary.\n    \n    Args:\n        data_dict: Dictionary with values to escape\n        \n    Returns:\n        Dictionary with escaped values\n    """\n    result = {}\n    for key, value in data_dict.items():\n        if isinstance(value, str):\n            result[key] = html.escape(value)\n        else:\n            result[key] = value\n    return result\n\n${refactored}`;
  }
  
  // Security: Add missing import for ast module if literal_eval is used
  if (refactored.includes('ast.literal_eval') && !refactored.includes('import ast')) {
    refactored = `import ast\n${refactored}`;
  }

  // Maintainability: Add missing typing import if type hints are used
  if ((refactored.includes(': str') || refactored.includes(': int') || 
       refactored.includes(': list') || refactored.includes(': dict') || 
       refactored.includes('-> ')) && !refactored.includes('from typing import')) {
    refactored = `from typing import Any, Dict, List, Optional, Union, Tuple\n${refactored}`;
  }
  
  return refactored;
};

/**
 * Refactor Python code in Jupyter Notebook (.ipynb) files
 * 
 * @param code The JSON content of the notebook file
 * @param options Refactoring options
 * @returns The refactored notebook as a JSON string
 */
const refactorJupyterNotebook = (code: string, options?: RefactoringOptions): string => {
  try {
    // Parse the notebook JSON
    const notebook = JSON.parse(code);
    
    // Check if this is a valid notebook structure
    if (!Array.isArray(notebook.cells)) {
      return code; // Not a valid notebook, return as is
    }
    
    // Extract all code cells to identify common patterns and code smells
    const allCodeCells = notebook.cells
      .filter((cell: any) => cell.cell_type === 'code')
      .map((cell: any) => Array.isArray(cell.source) ? cell.source.join('') : cell.source);
    
    // Identify magic numbers across the notebook
    const magicNumbers = new Set<string>();
    allCodeCells.forEach((cellCode: string) => {
      const matches = cellCode.match(/\b(\d{3,})\b/g);
      if (matches) {
        matches.forEach(num => magicNumbers.add(num));
      }
    });
    
    // Create constants for magic numbers
    const constantDefinitions: string[] = [];
    magicNumbers.forEach(number => {
      if (!['100', '1000'].includes(number)) { // Skip common values
        constantDefinitions.push(`${getConstantName(number)} = ${number}`);
      }
    });
    
    // Check if we need to add constants
    if (constantDefinitions.length > 0) {
      // Create a new cell at the beginning for constants
      const constantsCell = {
        cell_type: 'code',
        metadata: {},
        source: [
          '# Constants - extracted to improve code quality and maintainability\n',
          ...constantDefinitions.map(def => `${def}\n`)
        ]
      };
      
      // Add markdown cell explaining the constants
      const explanationCell = {
        cell_type: 'markdown',
        metadata: {},
        source: [
          '## Code Quality Improvements\n',
          'This notebook has been refactored for better code quality. Magic numbers have been extracted as constants.\n',
          'This improves readability and maintainability of the code.\n'
        ]
      };
      
      // Add the cells at the beginning
      notebook.cells.unshift(constantsCell);
      notebook.cells.unshift(explanationCell);
    }
    
    // Process each code cell
    notebook.cells = notebook.cells.map((cell: any) => {
      if (cell.cell_type === 'code') {
        // Join the source lines to form a complete code block
        const cellCode = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
        
        // Apply Python refactoring to the code
        const refactoredCode = refactorNotebookCell(cellCode, options, magicNumbers);
        
        // Split the refactored code back into lines
        cell.source = refactoredCode.split('\n').map((line: string, i: number, arr: string[]) => 
          i < arr.length - 1 ? line + '\n' : line
        );
      }
      return cell;
    });
    
    // Check for long cells and break them down
    if (options?.focus?.codeSmell) {
      notebook.cells = breakDownLongCells(notebook.cells);
    }
    
    // Check for code duplication across cells
    if (options?.focus?.codeSmell) {
      notebook.cells = extractDuplicatedCode(notebook.cells);
    }
    
    // Convert back to JSON string with proper formatting
    return JSON.stringify(notebook, null, 2);
  } catch (error) {
    console.error('Error refactoring Jupyter notebook:', error);
    return code; // Return original on error
  }
};

/**
 * Break down long code cells into smaller ones
 */
const breakDownLongCells = (cells: any[]): any[] => {
  const newCells: any[] = [];
  
  cells.forEach(cell => {
    if (cell.cell_type === 'code') {
      const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
      const lines = source.split('\n');
      
      // If cell is very long, break it down
      if (lines.length > 40) {
        // Look for logical break points (imports, function definitions, comments)
        const breakPoints = findLogicalBreakPoints(lines);
        
        if (breakPoints.length > 1) {
          // Add markdown cell explaining the split
          newCells.push({
            cell_type: 'markdown',
            metadata: {},
            source: ['## Cell Split\nThe following code has been split into multiple cells for better readability and maintainability.']
          });
          
          // Create new cells based on break points
          for (let i = 0; i < breakPoints.length - 1; i++) {
            const start = breakPoints[i];
            const end = breakPoints[i + 1];
            const sectionLines = lines.slice(start, end);
            
            newCells.push({
              cell_type: 'code',
              metadata: {},
              source: sectionLines.map(line => `${line}\n`)
            });
          }
        } else {
          newCells.push(cell);
        }
      } else {
        newCells.push(cell);
      }
    } else {
      newCells.push(cell);
    }
  });
  
  return newCells;
};

/**
 * Find logical break points in code for splitting long cells
 */
const findLogicalBreakPoints = (lines: string[]): number[] => {
  const breakPoints: number[] = [0]; // Always start at the beginning
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Break on import statements
    if (line.startsWith('import ') || line.startsWith('from ')) {
      if (i > breakPoints[breakPoints.length - 1] + 5) {
        breakPoints.push(i);
      }
    }
    
    // Break on function definitions
    if (line.startsWith('def ') || line.startsWith('class ')) {
      if (i > breakPoints[breakPoints.length - 1] + 5) {
        breakPoints.push(i);
      }
    }
    
    // Break on section comments
    if (line.startsWith('# ') && line.length > 5 && 
        !lines[i-1]?.trim().startsWith('# ')) {
      if (i > breakPoints[breakPoints.length - 1] + 10) {
        breakPoints.push(i);
      }
    }
    
    // Break on empty lines after substantive code blocks
    if (line === '' && i > breakPoints[breakPoints.length - 1] + 15) {
      // Check if there's actual code above, not just whitespace and comments
      const hasCodeAbove = lines
        .slice(breakPoints[breakPoints.length - 1], i)
        .some(l => l.trim() !== '' && !l.trim().startsWith('#'));
      
      if (hasCodeAbove) {
        breakPoints.push(i);
      }
    }
  }
  
  // Add the end of the file
  breakPoints.push(lines.length);
  
  return breakPoints;
};

/**
 * Extract duplicated code into helper functions
 */
const extractDuplicatedCode = (cells: any[]): any[] => {
  // Extract all code blocks
  const codeBlocks: string[] = [];
  cells.forEach(cell => {
    if (cell.cell_type === 'code') {
      const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
      codeBlocks.push(source);
    }
  });
  
  // Find duplicated code patterns (simplistic approach)
  const duplicates = findDuplicatedPatterns(codeBlocks);
  
  // If we found duplications, extract them to helper functions
  if (Object.keys(duplicates).length > 0) {
    // Create a helper functions cell
    const helperFunctions: string[] = [];
    helperFunctions.push('# Helper functions extracted to reduce code duplication\n');
    
    // Create a helper function for each duplicated pattern
    let idx = 1;
    for (const pattern in duplicates) {
      if (pattern.split('\n').length > 2) { // Only extract if it's more than 2 lines
        const funcName = `helper_function_${idx}`;
        helperFunctions.push(`def ${funcName}():\n    """Helper function extracted to reduce code duplication."""\n`);
        helperFunctions.push(pattern.split('\n').map(line => `    ${line}`).join('\n'));
        helperFunctions.push('\n');
        idx++;
      }
    }
    
    // If we created helper functions, add them to the notebook
    if (idx > 1) {
      const helperCell = {
        cell_type: 'code',
        metadata: {},
        source: helperFunctions.map(line => `${line}\n`)
      };
      
      // Add explanation
      const explanationCell = {
        cell_type: 'markdown',
        metadata: {},
        source: ['## Code Deduplication\nThe following helper functions have been extracted to reduce code duplication.']
      };
      
      // Find a good position (after imports and constants, before main code)
      let insertPosition = 0;
      for (let i = 0; i < cells.length; i++) {
        if (cells[i].cell_type === 'code') {
          const source = Array.isArray(cells[i].source) ? cells[i].source.join('') : cells[i].source;
          if (!source.includes('import ') && !source.includes('CONSTANT_')) {
            insertPosition = i;
            break;
          }
        }
      }
      
      // Insert the new cells
      cells.splice(insertPosition, 0, helperCell);
      cells.splice(insertPosition, 0, explanationCell);
    }
  }
  
  return cells;
};

/**
 * Find duplicated code patterns across cells
 */
const findDuplicatedPatterns = (codeBlocks: string[]): Record<string, number> => {
  const patterns: Record<string, number> = {};
  
  // Look for multiline patterns that repeat
  for (let i = 0; i < codeBlocks.length; i++) {
    const lines = codeBlocks[i].split('\n');
    
    // Slide through with a window of 3-10 lines
    for (let windowSize = 3; windowSize <= 10; windowSize++) {
      if (windowSize >= lines.length) continue;
      
      for (let j = 0; j <= lines.length - windowSize; j++) {
        const pattern = lines.slice(j, j + windowSize).join('\n');
        if (pattern.trim().length < 40) continue; // Skip small patterns
        
        // Count occurrences across all code blocks
        let count = 0;
        for (let k = 0; k < codeBlocks.length; k++) {
          count += countOccurrences(codeBlocks[k], pattern);
        }
        
        if (count > 1) {
          patterns[pattern] = count;
        }
      }
    }
  }
  
  return patterns;
};

/**
 * Count occurrences of a pattern in a string
 */
const countOccurrences = (text: string, pattern: string): number => {
  let count = 0;
  let pos = text.indexOf(pattern);
  while (pos !== -1) {
    count++;
    pos = text.indexOf(pattern, pos + 1);
  }
  return count;
};

/**
 * Generate a meaningful constant name from a number
 */
const getConstantName = (number: string): string => {
  // Check if number might represent common values
  const num = parseInt(number);
  if (num === 60) return 'SECONDS_PER_MINUTE';
  if (num === 24) return 'HOURS_PER_DAY';
  if (num === 7) return 'DAYS_PER_WEEK';
  if (num === 365) return 'DAYS_PER_YEAR';
  if (num === 1024) return 'BYTES_PER_KB';
  if (num === 1000) return 'FACTOR_THOUSAND';
  if (num === 100) return 'FACTOR_HUNDRED';
  
  // Default name
  return `CONSTANT_${number}`;
};

/**
 * Refactor Python code in a Jupyter cell
 * This is a specialized version that handles Jupyter-specific patterns
 */
const refactorNotebookCell = (code: string, options?: RefactoringOptions, magicNumbers?: Set<string>): string => {
  let refactored = code;
  
  // Replace magic numbers with constants
  if (options?.focus?.codeSmell && magicNumbers) {
    magicNumbers.forEach(number => {
      if (!['100', '1000'].includes(number)) { // Skip common values
        const constantName = getConstantName(number);
        refactored = refactored.replace(new RegExp(`\\b${number}\\b`, 'g'), constantName);
      }
    });
  }
  
  // Improve variable naming
  if (options?.techniques?.improveNaming) {
    refactored = refactored.replace(/\b([a-z])\b(?!\s*=)/g, (match, variable) => {
      if (variable === 'i' || variable === 'j' || variable === 'k') {
        return variable; // Common loop variables, leave as is
      }
      const betterNames: Record<string, string> = {
        'a': 'array_val',
        'b': 'boolean_val',
        'c': 'count',
        'd': 'data',
        'e': 'element',
        'f': 'file_obj',
        'l': 'list_val',
        'm': 'map_val',
        'n': 'number',
        'o': 'object',
        'p': 'param',
        'q': 'queue',
        'r': 'result',
        's': 'string',
        't': 'temp',
        'u': 'user',
        'v': 'value',
        'x': 'x_coord',
        'y': 'y_coord',
        'z': 'z_coord'
      };
      return betterNames[variable] || variable;
    });
  }
  
  // Replace old string formatting with f-strings
  if (options?.techniques?.formatCode) {
    refactored = refactored.replace(/(['"])([^'"]*?)%\s*(\([^)]+\))/g, 'f$1$2$3');
    refactored = refactored.replace(/(['"])([^'"]*?)%\s*([a-zA-Z0-9_]+)/g, 'f$1$2{$3}$1');
  }
  
  // Convert string concatenation to f-strings
  if (options?.techniques?.formatCode) {
    refactored = refactored.replace(/(['"])([^'"]*)\1\s*\+\s*str\(([^)]+)\)(?:\s*\+\s*(['"])([^'"]*)\4)?/g, 'f$1$2{$3}$5$1');
  }
  
  // Replace if x == True/False with better syntax
  if (options?.focus?.codeSmell) {
    refactored = refactored.replace(/if\s+([a-zA-Z0-9_]+)\s*==\s*True/g, 'if $1');
    refactored = refactored.replace(/if\s+([a-zA-Z0-9_]+)\s*==\s*False/g, 'if not $1');
  }
  
  // Use list comprehensions for simple for loops
  if (options?.focus?.codeSmell) {
    refactored = refactored.replace(
      /([a-zA-Z0-9_]+)\s*=\s*\[\]\s*\n\s*for\s+([a-zA-Z0-9_]+)\s+in\s+([^:]+):\s*\n\s+([a-zA-Z0-9_]+)\.append\(([^)]+)\)/g, 
      '$1 = [$5 for $2 in $3]'
    );
  }
  
  // Use enumerate instead of range(len())
  if (options?.focus?.performance) {
    refactored = refactored.replace(
      /for\s+([a-zA-Z0-9_]+)\s+in\s+range\(len\(([a-zA-Z0-9_]+)\)\):/g,
      'for $1, item in enumerate($2):'
    );
  }
  
  // Convert dictionary creation to dict comprehensions
  if (options?.focus?.codeSmell) {
    refactored = refactored.replace(
      /([a-zA-Z0-9_]+)\s*=\s*{}\s*\n\s*for\s+([a-zA-Z0-9_]+)\s+in\s+([^:]+):\s*\n\s+([a-zA-Z0-9_]+)\[([^]]+)\]\s*=\s*([^#\n]+)/g,
      '$1 = {$5: $6 for $2 in $3}'
    );
  }
  
  // Add simple type hints to function parameters
  if (options?.techniques?.addTyping) {
    refactored = refactored.replace(
      /def\s+([a-zA-Z0-9_]+)\s*\(([^:)]*)\):/g,
      (match, funcName, params) => {
        if (!params.includes(':')) {
          // Only add type hints if they don't exist
          const typedParams = params.split(',')
            .filter(p => p.trim())
            .map(p => {
              const paramName = p.trim().split('=')[0].trim();
              if (paramName.toLowerCase().includes('str') || paramName.endsWith('name') || paramName.endsWith('text')) {
                return `${paramName}: str`;
              } else if (paramName.toLowerCase().includes('num') || paramName.endsWith('count') || paramName.endsWith('id')) {
                return `${paramName}: int`;
              } else if (paramName.toLowerCase().includes('list') || paramName.endsWith('s')) {
                return `${paramName}: list`;
              } else if (paramName.toLowerCase().includes('dict')) {
                return `${paramName}: dict`;
              } else if (paramName.toLowerCase().includes('bool') || paramName.startsWith('is_') || paramName.startsWith('has_')) {
                return `${paramName}: bool`;
              }
              return `${paramName}: any`;
            })
            .join(', ');
          
          return `def ${funcName}(${typedParams}):`;
        }
        return match;
      }
    );
  }
  
  // Add docstrings, but more concise for notebooks
  if (options?.techniques?.addComments) {
    refactored = refactored.replace(
      /def\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\):/g,
      (match, funcName, params) => {
        if (!match.includes('"""')) {
          return `def ${funcName}(${params}):\n    """${funcName} function."""\n`;
        }
        return match;
      }
    );
  }
  
  // Make sure imports are at the top
  if (options?.techniques?.formatCode) {
    const lines = refactored.split('\n');
    const importLines: string[] = [];
    const nonImportLines: string[] = [];
    
    for (const line of lines) {
      if (line.trim().startsWith('import ') || line.trim().startsWith('from ')) {
        importLines.push(line);
      } else {
        nonImportLines.push(line);
      }
    }
    
    if (importLines.length > 0) {
      refactored = [...importLines, '', ...nonImportLines].join('\n');
    }
  }
  
  // Use context managers for file operations and resource handling
  if (options?.focus?.security) {
    refactored = refactored.replace(
      /([a-zA-Z0-9_]+)\s*=\s*open\(([^)]+)\)\s*\n([^]*?)([a-zA-Z0-9_]+)\.close\(\)/gs,
      'with open($2) as $1:\n$3'
    );
  }
  
  // Improve pandas operations
  if (refactored.includes('import pandas') || refactored.includes('from pandas')) {
    // Use more efficient pandas operations
    refactored = refactored.replace(
      /for\s+index\s*,\s*row\s+in\s+([a-zA-Z0-9_]+)\.iterrows\(\):/g,
      '# Vectorized operations are more efficient than row iterations\n# Original: for index, row in $1.iterrows():'
    );
  }
  
  // Jupyter-specific: Add Markdown comments above cells with complex operations
  if (options?.techniques?.addComments) {
    if (refactored.includes('plt.') && !refactored.includes('# Visualization:')) {
      refactored = '# Visualization: Data plot\n' + refactored;
    }
    
    if ((refactored.includes('.groupby(') || refactored.includes('.agg(')) && 
        !refactored.includes('# Data Aggregation:')) {
      refactored = '# Data Aggregation: Group and summarize data\n' + refactored;
    }
    
    if (refactored.includes('model.fit(') && !refactored.includes('# Model Training:')) {
      refactored = '# Model Training: Fit model to training data\n' + refactored;
    }
  }
  
  return refactored;
};

// Used for testing
const validate_input = (input: string): string => {
  if (input.length > 1000) {
    throw new Error('Input too long');
  }
  return input.replace(/[<>]/g, '').trim();
};

