
import { QualityResults, CategoryScore, CodeSnippet } from "@/types/codeQuality";
import { 
  BookOpen, 
  FileCode, 
  Zap, 
  Shield, 
  AlertTriangle 
} from "lucide-react";

/**
 * Parse Jupyter Notebook JSON content and extract code cells
 */
const extractCodeFromNotebook = (code: string): string => {
  try {
    const notebook = JSON.parse(code);
    
    if (!Array.isArray(notebook.cells)) {
      return code; // Not a valid notebook, return as is
    }
    
    // Extract only code cells and join their content
    const codeCells = notebook.cells
      .filter((cell: any) => cell.cell_type === 'code')
      .map((cell: any) => {
        const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
        return source;
      })
      .join('\n\n');
    
    return codeCells;
  } catch (error) {
    console.error('Error extracting code from notebook:', error);
    return code; // Return original on error
  }
};

const calculateReadabilityScore = (code: string, isNotebook: boolean = false): number => {
  // Process notebook if needed
  const processedCode = isNotebook ? extractCodeFromNotebook(code) : code;
  
  // Analyze code for readability
  let score = 80; // Base score
  
  // Check for code complexity indicators
  const longLines = processedCode.split('\n').filter(line => line.length > 100).length;
  const longFunctions = (processedCode.match(/function\s+\w+\s*\([^)]*\)\s*{[^}]*}/g) || []).filter(fn => fn.length > 200).length;
  const deepNesting = (processedCode.match(/\{\s*\{\s*\{\s*\{/g) || []).length;
  
  // Each of these issues reduces the score
  score -= longLines * 2; // -2 points per long line
  score -= longFunctions * 5; // -5 points per long function
  score -= deepNesting * 8; // -8 points per deeply nested code block
  
  // Check for readability improvements
  const hasComments = (processedCode.match(/\/\/|\/\*|\*\/|#/g) || []).length > 0;
  const usesDescriptiveNames = (processedCode.match(/[a-zA-Z][a-zA-Z0-9]+[A-Z][a-zA-Z0-9]*/g) || []).length > 0;
  
  // For notebooks, check if cells have markdown explanations
  if (isNotebook) {
    try {
      const notebook = JSON.parse(code);
      const markdownCells = notebook.cells.filter((cell: any) => cell.cell_type === 'markdown').length;
      const codeCells = notebook.cells.filter((cell: any) => cell.cell_type === 'code').length;
      
      // Reward notebooks with good documentation
      if (markdownCells > 0 && codeCells > 0) {
        const docRatio = markdownCells / codeCells;
        if (docRatio >= 0.5) score += 15;
        else if (docRatio >= 0.25) score += 10;
        else score += 5;
      }
    } catch (error) {
      // Skip notebook-specific scoring on error
    }
  }
  
  // These improve the score
  if (hasComments) score += 10;
  if (usesDescriptiveNames) score += 10;
  
  // Ensure score is within range
  return Math.max(0, Math.min(100, score));
};

const calculateMaintainabilityScore = (code: string, isNotebook: boolean = false): number => {
  // Process notebook if needed
  const processedCode = isNotebook ? extractCodeFromNotebook(code) : code;
  
  // Analyze code for maintainability
  let score = 75; // Base score
  
  // Check for code maintainability indicators
  const duplicatedCodePatterns = (processedCode.match(/(.{50,})\1+/g) || []).length;
  const longFunctions = (processedCode.match(/function\s+\w+\s*\([^)]*\)\s*{[^}]*}/g) || []).filter(fn => fn.length > 250).length;
  const pythonFunctions = (processedCode.match(/def\s+\w+\s*\([^)]*\):/g) || []);
  const longPythonFunctions = pythonFunctions.filter(fn => {
    const fnIndex = processedCode.indexOf(fn);
    const nextFnIndex = processedCode.indexOf('def ', fnIndex + 1);
    const fnBody = nextFnIndex > -1 ? 
      processedCode.substring(fnIndex, nextFnIndex) : 
      processedCode.substring(fnIndex);
    return fnBody.split('\n').length > 25;
  }).length;
  
  const missingComments = processedCode.length > 500 && (processedCode.match(/\/\/|\/\*|\*\/|#/g) || []).length < 5;
  
  // Each of these issues reduces the score
  score -= duplicatedCodePatterns * 10; // -10 points per duplicated code
  score -= longFunctions * 5; // -5 points per long function
  score -= longPythonFunctions * 5; // -5 points per long Python function
  if (missingComments) score -= 15;
  
  // Check for maintainability improvements
  const hasStructuredCode = (processedCode.match(/class|module|namespace|export/g) || []).length > 0;
  const hasFunctionDocumentation = (processedCode.match(/\/\*\*[\s\S]*?\*\/\s*function/g) || []).length > 0;
  const hasPythonDocstrings = (processedCode.match(/def\s+\w+\s*\([^)]*\):\s*['"]{3}/g) || []).length > 0;
  
  // For notebooks, check for cell organization
  if (isNotebook) {
    try {
      const notebook = JSON.parse(code);
      
      // Check if cells are logically organized (e.g., imports at top, functions, then usage)
      let importCellsAtStart = false;
      let functionsBeforeUsage = false;
      
      const importCells = notebook.cells.filter((cell: any) => 
        cell.cell_type === 'code' && 
        Array.isArray(cell.source) && 
        cell.source.join('').includes('import ')
      );
      
      if (importCells.length > 0) {
        // Check if import cells are at the beginning
        const firstImportIndex = notebook.cells.indexOf(importCells[0]);
        importCellsAtStart = firstImportIndex < 3; // Within first 3 cells
        
        // Function definitions before usage
        const functionCells = notebook.cells.filter((cell: any) => 
          cell.cell_type === 'code' && 
          Array.isArray(cell.source) && 
          cell.source.join('').includes('def ')
        );
        
        if (functionCells.length > 0) {
          const usageCells = notebook.cells.filter((cell: any) => 
            cell.cell_type === 'code' && 
            !importCells.includes(cell) && 
            !functionCells.includes(cell)
          );
          
          if (usageCells.length > 0) {
            const lastFunctionIndex = notebook.cells.indexOf(functionCells[functionCells.length - 1]);
            const firstUsageIndex = notebook.cells.indexOf(usageCells[0]);
            functionsBeforeUsage = lastFunctionIndex < firstUsageIndex;
          }
        }
      }
      
      // Reward well-organized notebooks
      if (importCellsAtStart) score += 5;
      if (functionsBeforeUsage) score += 10;
    } catch (error) {
      // Skip notebook-specific scoring on error
    }
  }
  
  // These improve the score
  if (hasStructuredCode) score += 10;
  if (hasFunctionDocumentation || hasPythonDocstrings) score += 15;
  
  // Ensure score is within range
  return Math.max(0, Math.min(100, score));
};

const calculatePerformanceScore = (code: string, isNotebook: boolean = false): number => {
  // Process notebook if needed
  const processedCode = isNotebook ? extractCodeFromNotebook(code) : code;
  
  // Analyze code for performance
  let score = 85; // Base score
  
  // Check for performance issues
  const nestedLoops = (processedCode.match(/for\s*\([^)]*\)\s*\{[^}]*for\s*\([^)]*\)/g) || []).length + 
                     (processedCode.match(/for\s+\w+\s+in\s+.+:\s*\n[^]*?for\s+\w+\s+in/g) || []).length;
  
  const largeArrayOperations = (processedCode.match(/\.map\(|\.filter\(|\.reduce\(/g) || []).length > 10;
  const inefficientQueries = (processedCode.match(/SELECT\s+\*\s+FROM|db\.find\({}\)/gi) || []).length;
  
  // Each of these issues reduces the score
  score -= nestedLoops * 8; // -8 points per nested loop
  if (largeArrayOperations) score -= 10;
  score -= inefficientQueries * 12; // -12 points per inefficient query
  
  // Check for performance optimizations
  const usesMemoization = (processedCode.match(/useMemo|memo|cache|memoize/g) || []).length > 0;
  const usesAsyncAwait = (processedCode.match(/async|await/g) || []).length > 0;
  
  // Python-specific optimizations
  const usesListComprehension = (processedCode.match(/\[\s*\w+\s+for\s+\w+\s+in/g) || []).length > 0;
  const usesNumpy = processedCode.includes('import numpy') || processedCode.includes('from numpy');
  
  // For notebooks, check for memory management patterns
  if (isNotebook) {
    try {
      const notebook = JSON.parse(code);
      
      // Check for specific notebook performance patterns
      let usesGarbageCollection = false;
      let managedMemoryUsage = false;
      
      for (const cell of notebook.cells) {
        if (cell.cell_type === 'code') {
          const cellContent = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
          
          // Check for memory management
          if (cellContent.includes('gc.collect()') || 
              cellContent.includes('del ') || 
              cellContent.includes('%reset_selective')) {
            usesGarbageCollection = true;
          }
          
          // Check for efficient data usage
          if ((cellContent.includes('.head(') || cellContent.includes('.sample(')) && 
              (cellContent.includes('pd.read_') || cellContent.includes('pandas'))) {
            managedMemoryUsage = true;
          }
        }
      }
      
      // Reward notebooks with performance considerations
      if (usesGarbageCollection) score += 5;
      if (managedMemoryUsage) score += 5;
      
    } catch (error) {
      // Skip notebook-specific scoring on error
    }
  }
  
  // These improve the score
  if (usesMemoization) score += 10;
  if (usesAsyncAwait) score += 5;
  if (usesListComprehension) score += 5;
  if (usesNumpy) score += 10;
  
  // Ensure score is within range
  return Math.max(0, Math.min(100, score));
};

const calculateSecurityScore = (code: string, isNotebook: boolean = false): number => {
  // Process notebook if needed
  const processedCode = isNotebook ? extractCodeFromNotebook(code) : code;
  
  // Analyze code for security issues
  let score = 90; // Base score
  
  // Check for security issues
  const unsafeEval = (processedCode.match(/eval\s*\(/g) || []).length;
  const unsafeInnerHTML = (processedCode.match(/innerHTML|dangerouslySetInnerHTML/g) || []).length;
  const sqlInjectionVulnerabilities = (processedCode.match(/executeQuery\s*\(\s*["'`]SELECT.+\$|db\.query\s*\(\s*["'`]SELECT/g) || []).length;
  const pythonOSCommands = (processedCode.match(/os\.system\s*\(|subprocess\.call\s*\(|exec\s*\(/g) || []).length;
  const passwordInCode = (processedCode.match(/password\s*=\s*["'][^"']*["']|api[_\-]?key\s*=\s*["'][^"']*["']/gi) || []).length;
  
  // Each of these issues reduces the score
  score -= unsafeEval * 25; // -25 points per eval use
  score -= unsafeInnerHTML * 15; // -15 points per unsafe inner HTML
  score -= sqlInjectionVulnerabilities * 30; // -30 points per SQL injection vulnerability
  score -= pythonOSCommands * 15; // -15 points per unsafe OS command
  score -= passwordInCode * 30; // -30 points per hardcoded password/API key
  
  // Check for security improvements
  const inputValidation = (processedCode.match(/validate|sanitize|escape/g) || []).length > 0;
  const usesTryCatch = (processedCode.match(/try\s*\{[\s\S]*\}\s*catch/g) || []).length > 0;
  const usesPythonTryExcept = (processedCode.match(/try:\s*\n[\s\S]*?except/g) || []).length > 0;
  const usesParameterizedQueries = (processedCode.match(/\?|%s|execute\s*\([^,)]+,\s*\[/g) || []).length > 0;
  
  // For notebooks, check for security patterns
  if (isNotebook) {
    try {
      const notebook = JSON.parse(code);
      
      // Check for credential hiding
      let exposesCredentials = false;
      let usesSecureCredentials = false;
      
      for (const cell of notebook.cells) {
        if (cell.cell_type === 'code') {
          const cellContent = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
          
          // Check for exposed credentials
          if (cellContent.match(/password\s*=\s*["'][^"']*["']|api[_\-]?key\s*=\s*["'][^"']*["']/i)) {
            exposesCredentials = true;
          }
          
          // Check for secure credential management
          if (cellContent.includes('os.environ.get(') || 
              cellContent.includes('dotenv') || 
              cellContent.includes('config.get(') ||
              cellContent.includes('getpass.getpass')) {
            usesSecureCredentials = true;
          }
        }
      }
      
      // Penalize exposed credentials
      if (exposesCredentials) score -= 25;
      // Reward secure credential management
      if (usesSecureCredentials) score += 15;
      
    } catch (error) {
      // Skip notebook-specific scoring on error
    }
  }
  
  // These improve the score
  if (inputValidation) score += 10;
  if (usesTryCatch || usesPythonTryExcept) score += 5;
  if (usesParameterizedQueries) score += 15;
  
  // Ensure score is within range
  return Math.max(0, Math.min(100, score));
};

const calculateCodeSmellScore = (code: string, isNotebook: boolean = false): number => {
  // Process notebook if needed
  const processedCode = isNotebook ? extractCodeFromNotebook(code) : code;
  
  // Analyze code for "code smells"
  let score = 85; // Base score
  
  // Check for code smell indicators
  const magicNumbers = (processedCode.match(/\W\d{2,}\W/g) || []).length;
  const longMethods = (processedCode.match(/function\s+\w+\s*\([^)]*\)\s*{[\s\S]{500,}?}/g) || []).length;
  const longPythonMethods = (processedCode.match(/def\s+\w+\s*\([^)]*\):/g) || []).filter(m => {
    const index = processedCode.indexOf(m);
    const next = processedCode.indexOf('def ', index + 1);
    const body = next > -1 ? processedCode.substring(index, next) : processedCode.substring(index);
    return body.split('\n').length > 30;
  }).length;
  
  const globalVariables = (processedCode.match(/var\s+\w+\s*=|let\s+\w+\s*=|const\s+\w+\s*=(?!\s*function)/g) || []).length;
  const pythonGlobals = (processedCode.match(/^[A-Z0-9_]+\s*=/gm) || []).length;
  
  // Notebook-specific code smells
  if (isNotebook) {
    try {
      const notebook = JSON.parse(code);
      
      // Check for notebook-specific code smells
      let hasLongCells = false;
      let hasDuplicatedCode = false;
      let hasUndefinedVariables = new Set();
      let definedVariables = new Set();
      
      // First pass: collect defined variables
      for (const cell of notebook.cells) {
        if (cell.cell_type === 'code') {
          const cellContent = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
          
          // Find variable definitions
          const variableDefinitions = cellContent.match(/^(\w+)\s*=/gm) || [];
          for (const def of variableDefinitions) {
            const varName = def.replace(/\s*=/, '').trim();
            definedVariables.add(varName);
          }
          
          // Check for long cells
          if (cellContent.split('\n').length > 40) {
            hasLongCells = true;
          }
        }
      }
      
      // Second pass: check for duplicate code and undefined vars
      const codeCellContents: string[] = [];
      for (const cell of notebook.cells) {
        if (cell.cell_type === 'code') {
          const cellContent = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
          codeCellContents.push(cellContent);
          
          // Check for variable usage before definition
          const variableUses = cellContent.match(/\b([a-zA-Z_]\w*)\b(?!\s*=|^\s*def|\s*in\b)/gm) || [];
          for (const use of variableUses) {
            if (!definedVariables.has(use) && 
                !['print', 'range', 'len', 'str', 'int', 'float', 'list', 'dict', 'set', 'tuple'].includes(use)) {
              hasUndefinedVariables.add(use);
            }
          }
        }
      }
      
      // Check for duplicated code blocks
      for (let i = 0; i < codeCellContents.length; i++) {
        for (let j = i + 1; j < codeCellContents.length; j++) {
          if (codeCellContents[i].length > 50 && 
              codeCellContents[i].trim() === codeCellContents[j].trim()) {
            hasDuplicatedCode = true;
            break;
          }
        }
        if (hasDuplicatedCode) break;
      }
      
      // Adjust score based on notebook-specific smells
      if (hasLongCells) score -= 15;
      if (hasDuplicatedCode) score -= 20;
      if (hasUndefinedVariables.size > 0) score -= Math.min(25, hasUndefinedVariables.size * 5);
      
    } catch (error) {
      // Skip notebook-specific scoring on error
    }
  }
  
  // Each of these issues reduces the score
  score -= magicNumbers * 3; // -3 points per magic number
  score -= longMethods * 10; // -10 points per long method
  score -= longPythonMethods * 10; // -10 points per long Python method
  score -= Math.max(0, globalVariables - 5) * 2; // -2 points per global variable beyond 5
  score -= Math.max(0, pythonGlobals - 5) * 2; // -2 points per Python global beyond 5
  
  // Check for code smell improvements
  const usesConstants = (processedCode.match(/const\s+[A-Z_][A-Z0-9_]*\s*=/g) || []).length > 0;
  const usesPythonConstants = (processedCode.match(/^[A-Z_][A-Z0-9_]*\s*=/gm) || []).length > 0;
  const usesFunctions = (processedCode.match(/function\s+\w+|const\s+\w+\s*=\s*\([^)]*\)\s*=>/g) || []).length > 2;
  const usesPythonFunctions = (processedCode.match(/def\s+\w+\s*\(/g) || []).length > 2;
  
  // These improve the score
  if (usesConstants || usesPythonConstants) score += 10;
  if (usesFunctions || usesPythonFunctions) score += 5;
  
  // Ensure score is within range
  return Math.max(0, Math.min(100, score));
};

/**
 * Analyze code quality using various metrics
 */
export const analyzeCodeQuality = (code: string, language: string): QualityResults => {
  // Check if this is a Jupyter Notebook
  const isNotebook = language === 'ipynb' || 
                    (code.trim().startsWith('{') && code.includes('"cell_type"') && code.includes('"source"'));
  
  // Calculate individual scores
  const readabilityScore = calculateReadabilityScore(code, isNotebook);
  const maintainabilityScore = calculateMaintainabilityScore(code, isNotebook);
  const performanceScore = calculatePerformanceScore(code, isNotebook);
  const securityScore = calculateSecurityScore(code, isNotebook);
  const codeSmellScore = calculateCodeSmellScore(code, isNotebook);
  
  // Calculate overall score (weighted average)
  const overallScore = Math.round(
    (readabilityScore * 0.25) +
    (maintainabilityScore * 0.25) +
    (performanceScore * 0.2) +
    (securityScore * 0.2) +
    (codeSmellScore * 0.1)
  );
  
  // Generate results with categories
  const categories: CategoryScore[] = [
    {
      name: "Readability",
      score: readabilityScore,
      icon: BookOpen
    },
    {
      name: "Maintainability",
      score: maintainabilityScore,
      icon: FileCode
    },
    {
      name: "Performance",
      score: performanceScore,
      icon: Zap
    },
    {
      name: "Security",
      score: securityScore,
      icon: Shield
    },
    {
      name: "Code Smell",
      score: codeSmellScore,
      icon: AlertTriangle
    }
  ];
  
  // Generate code snippets with issues for notebooks
  const snippets: CodeSnippet[] = [];
  
  if (isNotebook) {
    try {
      const notebook = JSON.parse(code);
      
      // Check issues in notebook cells
      for (let i = 0; i < notebook.cells.length; i++) {
        const cell = notebook.cells[i];
        if (cell.cell_type === 'code') {
          const cellContent = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
          
          // Look for long lines (Readability issue)
          cellContent.split('\n').forEach((line: string, idx: number) => {
            if (line.length > 100) {
              snippets.push({
                title: `Cell ${i+1}: Line too long (exceeds 100 characters)`,
                code: line,
                suggestion: line.substring(0, 50) + "...\n# Consider breaking this line into multiple statements"
              });
            }
          });
          
          // Look for magic numbers (Code Smell)
          const magicNumberMatches = cellContent.match(/\W\d{3,}\W/g) || [];
          if (magicNumberMatches.length > 0) {
            snippets.push({
              title: `Cell ${i+1}: Magic numbers should be named constants (Code Smell)`,
              code: cellContent.substring(0, 200) + (cellContent.length > 200 ? '...' : ''),
              suggestion: "# Create constants at the top of your notebook or cell\nMAX_COUNT = 1000\nTHRESHOLD = 500\n# Then use these constants instead of raw numbers"
            });
          }
          
          // Look for nested loops (Performance issue)
          if (cellContent.match(/for\s+\w+\s+in\s+.+:\s*\n[^]*?for\s+\w+\s+in/)) {
            snippets.push({
              title: `Cell ${i+1}: Nested loops may impact performance`,
              code: cellContent.substring(0, 200) + (cellContent.length > 200 ? '...' : ''),
              suggestion: "# Consider vectorizing operations or extracting inner loop\n# to a separate function:\ndef process_item(item):\n    # Inner loop logic here\n    return result\n\nresults = [process_item(x) for x in items]"
            });
          }
          
          // Look for long cell (Code Smell)
          if (cellContent.split('\n').length > 40) {
            snippets.push({
              title: `Cell ${i+1}: Cell is too long (Code Smell)`,
              code: cellContent.substring(0, 100) + "...",
              suggestion: "# Break this cell into multiple cells, each with a specific purpose\n# For example:\n# Cell 1: Data loading\n# Cell 2: Data preprocessing\n# Cell 3: Model training\n# Cell 4: Evaluation"
            });
          }
          
          // Look for suspicious variable access (Security)
          if (cellContent.match(/os\.environ|\.secret|password|token|key/i) && 
              !cellContent.match(/os\.environ\.get|getpass\.getpass/)) {
            snippets.push({
              title: `Cell ${i+1}: Potential credential exposure (Security issue)`,
              code: cellContent.substring(0, 150) + (cellContent.length > 150 ? '...' : ''),
              suggestion: "# Use secure methods for handling credentials\nimport os\n\n# Instead of direct assignment:\n# api_key = \"your_secret_key\"\n\n# Use environment variables:\napi_key = os.environ.get(\"API_KEY\")"
            });
          }
          
          // Look for hardcoded configurations (Maintainability)
          if (cellContent.match(/filepath\s*=\s*["']|url\s*=\s*["']http/)) {
            snippets.push({
              title: `Cell ${i+1}: Hardcoded paths or URLs (Maintainability issue)`,
              code: cellContent.substring(0, 150) + (cellContent.length > 150 ? '...' : ''),
              suggestion: "# Define configuration at the top of your notebook\n\n# Configuration\nCONFIG = {\n    \"data_path\": \"./data/\",\n    \"api_url\": \"https://api.example.com/\",\n    \"output_dir\": \"./results/\"\n}\n\n# Then use CONFIG['data_path'] instead of hardcoded paths"
            });
          }
          
          // Look for single-letter variable names (Code Smell)
          const singleLetterVars = (cellContent.match(/\b([a-zA-Z])\s*=(?!\s*lambda)/g) || [])
            .filter(v => !['i=', 'j=', 'k=', 'x=', 'y=', 'z='].includes(v.trim()));
          
          if (singleLetterVars.length > 0) {
            snippets.push({
              title: `Cell ${i+1}: Non-descriptive variable names (Code Smell)`,
              code: cellContent.substring(0, 150) + (cellContent.length > 150 ? '...' : ''),
              suggestion: "# Use descriptive variable names\n# Instead of:\n# a = [1, 2, 3]\n# s = 0\n# for i in a:\n#     s += i\n\n# Write:\n# numbers = [1, 2, 3]\n# total_sum = 0\n# for number in numbers:\n#     total_sum += number"
            });
          }
        }
      }
      
      // If no issues were found but we know it's a notebook, add generic suggestions
      if (snippets.length === 0) {
        snippets.push({
          title: "General notebook organization (Best practice)",
          code: "# Notebook structure\n# Current organization could be improved",
          suggestion: "# Recommended notebook structure:\n\n# 1. Imports and setup\nimport pandas as pd\nimport numpy as np\n\n# 2. Configuration and constants\nCONFIG = {\n    \"data_path\": \"./data/\"\n}\n\n# 3. Helper functions\ndef process_data(df):\n    # Processing logic\n    return df\n\n# 4. Data loading and processing\n# 5. Analysis and visualization\n# 6. Results and conclusions"
        });
      }
    } catch (error) {
      // Fallback for invalid notebook
      snippets.push({
        title: "Invalid notebook format",
        code: code.substring(0, 100) + "...",
        suggestion: "# The notebook format appears to be invalid.\n# Ensure it's a valid .ipynb JSON structure."
      });
    }
  } else {
    // Regular code file analysis
    // Look for long lines
    code.split('\n').forEach((line, index) => {
      if (line.length > 100) {
        snippets.push({
          title: "Line too long (exceeds 100 characters)",
          code: line,
          suggestion: line.substring(0, 50) + "...\n// Consider breaking this line into multiple statements"
        });
      }
    });
    
    // Look for complex nested code
    const nestedMatches = code.match(/(?:if|for|while)[\s\S]*?(?:if|for|while)[\s\S]*?(?:if|for|while)/g) || [];
    nestedMatches.slice(0, 2).forEach(match => {
      const contextLines = match.split('\n').slice(0, 3).join('\n');
      
      snippets.push({
        title: "Deeply nested code structures (Code Smell)",
        code: contextLines + '...',
        suggestion: "// Consider extracting nested conditions into named functions\n" +
                    "function checkConditionA() { /* first condition */ }\n" +
                    "function checkConditionB() { /* second condition */ }\n" +
                    "if (checkConditionA() && checkConditionB()) { /* code */ }"
      });
    });
    
    // Look for magic numbers
    const magicNumberMatches = code.match(/\W\d{3,}\W/g) || [];
    if (magicNumberMatches && magicNumberMatches.length > 0) {
      magicNumberMatches.slice(0, 3).forEach(match => {
        if (typeof match === 'string') {
          const context = code.substring(
            Math.max(0, code.indexOf(match) - 20),
            Math.min(code.length, code.indexOf(match) + match.length + 20)
          );
          
          snippets.push({
            title: "Magic number should be a named constant (Code Smell)",
            code: context,
            suggestion: "const MEANINGFUL_CONSTANT_NAME = " + match.trim() + ";\n// Then use MEANINGFUL_CONSTANT_NAME instead"
          });
        }
      });
    }
    
    // Look for large functions (Code Smell)
    const largeFunctions = code.match(/function\s+(\w+)\s*\([^)]*\)\s*{[\s\S]{500,}?}/g) || [];
    largeFunctions.slice(0, 2).forEach(match => {
      const functionName = match.match(/function\s+(\w+)/)?.[1] || 'function';
      
      snippets.push({
        title: `Function "${functionName}" is too large (Code Smell)`,
        code: match.substring(0, 150) + "...",
        suggestion: "// Break down large functions into smaller, focused ones\n" +
                  `function ${functionName}() {\n` +
                  `  doFirstTask();\n` +
                  `  doSecondTask();\n` +
                  `  return combineResults();\n` +
                  `}\n\n` +
                  `function doFirstTask() {\n` +
                  `  // First part of the original function\n` +
                  `}`
      });
    });
  }
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (readabilityScore < 70) {
    recommendations.push("Improve code readability by adding comments and using descriptive variable names");
    recommendations.push("Break down complex functions into smaller, more focused ones");
  }
  
  if (maintainabilityScore < 70) {
    recommendations.push("Modularize code into smaller, reusable components");
    recommendations.push("Add documentation to functions explaining their purpose and parameters");
  }
  
  if (performanceScore < 70) {
    recommendations.push("Avoid nested loops and optimize repeated operations");
    recommendations.push("Consider memoization for expensive calculations");
    if (isNotebook) {
      recommendations.push("Use vectorized operations with NumPy/Pandas instead of explicit loops");
    }
  }
  
  if (securityScore < 80) {
    recommendations.push("Avoid using eval() and innerHTML for security reasons");
    recommendations.push("Implement proper input validation for all user inputs");
    if (isNotebook) {
      recommendations.push("Store sensitive information in environment variables, not in notebook cells");
    }
  }
  
  if (codeSmellScore < 70) {
    recommendations.push("Replace magic numbers with named constants");
    recommendations.push("Refactor long methods into smaller, focused functions");
    if (isNotebook) {
      recommendations.push("Break long notebook cells into multiple smaller, focused cells");
      recommendations.push("Ensure all variables are properly defined before use");
    }
  }
  
  // Generate a simple refactored code example
  let refactoredCode = code;
  
  if (isNotebook) {
    try {
      const notebook = JSON.parse(code);
      
      // Basic refactoring for demonstration - add constants section
      if (codeSmellScore < 70) {
        // Find first code cell to add constants
        const firstCodeCellIndex = notebook.cells.findIndex((cell: any) => cell.cell_type === 'code');
        
        if (firstCodeCellIndex >= 0) {
          // Extract magic numbers
          const allCode = notebook.cells
            .filter((cell: any) => cell.cell_type === 'code')
            .map((cell: any) => Array.isArray(cell.source) ? cell.source.join('') : cell.source)
            .join('\n');
          
          const magicNumbers = Array.from(new Set(allCode.match(/\W\d{3,}\W/g) || []));
          
          if (magicNumbers.length > 0) {
            const constantsCell = {
              cell_type: 'code',
              metadata: {},
              source: ['# Constants for improved code quality\n']
            };
            
            magicNumbers.slice(0, 5).forEach((num: string, index: number) => {
              const cleanNum = num.replace(/\W/g, '');
              const constantName = `CONSTANT_${cleanNum}`;
              constantsCell.source.push(`${constantName} = ${cleanNum}\n`);
            });
            
            // Add markdown explanation
            const explainCell = {
              cell_type: 'markdown',
              metadata: {},
              source: ['## Code Quality Improvement\n', 
                       'This cell defines constants to replace magic numbers in the code.\n',
                       'Using named constants improves readability and maintainability.']
            };
            
            // Insert at beginning
            notebook.cells.splice(firstCodeCellIndex, 0, constantsCell);
            notebook.cells.splice(firstCodeCellIndex, 0, explainCell);
            
            refactoredCode = JSON.stringify(notebook, null, 2);
          }
        }
      }
    } catch (error) {
      // Keep original if refactoring fails
      refactoredCode = code;
    }
  } else {
    // Regular code refactoring
    const magicNumbers = Array.from(new Set(code.match(/\W\d{3,}\W/g) || []));
    
    if (magicNumbers.length > 0) {
      let refactoredLines = code.split('\n');
      const constantDefinitions: string[] = [];
      
      magicNumbers.forEach((num, index) => {
        if (typeof num === 'string') {
          const cleanNum = num.replace(/\W/g, '');
          const constantName = `CONSTANT_${cleanNum}`;
          
          // Add constant definition
          constantDefinitions.push(`const ${constantName} = ${cleanNum};`);
          
          // Replace in code (only first occurrence to avoid over-refactoring)
          for (let i = 0; i < refactoredLines.length; i++) {
            if (refactoredLines[i].includes(cleanNum)) {
              refactoredLines[i] = refactoredLines[i].replace(
                new RegExp(`\\b${cleanNum}\\b`), 
                constantName
              );
              break;
            }
          }
        }
      });
      
      // Add constants at the beginning
      if (constantDefinitions.length > 0) {
        refactoredLines = [...constantDefinitions, '', ...refactoredLines];
      }
      
      refactoredCode = refactoredLines.join('\n');
    }
  }
  
  // Add a summary based on the overall score
  let summary = "";
  if (isNotebook) {
    if (overallScore >= 90) {
      summary = "Excellent notebook quality. Well-structured, documented, and maintainable.";
    } else if (overallScore >= 75) {
      summary = "Good notebook quality with some room for improvement in organization and documentation.";
    } else if (overallScore >= 60) {
      summary = "Moderate notebook quality. Consider adding more markdown cells and organizing code better.";
    } else {
      summary = "Poor notebook quality. Significant restructuring and documentation recommended.";
    }
  } else {
    if (overallScore >= 90) {
      summary = "Excellent code quality. Well-structured and maintainable.";
    } else if (overallScore >= 75) {
      summary = "Good code quality with some room for improvement.";
    } else if (overallScore >= 60) {
      summary = "Moderate code quality. Several areas need attention.";
    } else {
      summary = "Poor code quality. Significant refactoring recommended.";
    }
  }
  
  return {
    score: overallScore,
    readabilityScore,
    maintainabilityScore,
    performanceScore,
    securityScore,
    codeSmellScore,
    issues: recommendations,
    recommendations: recommendations,
    summary,
    categories,
    snippets,
    refactoredCode
  };
};
