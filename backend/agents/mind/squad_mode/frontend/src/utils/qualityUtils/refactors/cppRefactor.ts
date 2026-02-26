
import { RefactoringOptions } from './index';

/**
 * Refactor C/C++ code to follow best practices
 */
export const refactorCPP = (code: string, options?: RefactoringOptions): string => {
  let refactored = code;
  
  // Use nullptr instead of NULL
  refactored = refactored.replace(/\bNULL\b/g, 'nullptr');
  
  // Use auto for variable declarations where type is obvious from initialization
  refactored = refactored.replace(
    /(std::)?([a-zA-Z0-9_:]+)<[^>]+>\s+([a-zA-Z0-9_]+)\s*=\s*/g, 
    'auto $3 = '
  );
  
  // Replace raw for loops with range-based for loops when iterating over containers
  refactored = refactored.replace(
    /for\s*\(\s*(?:int|size_t)\s+([a-zA-Z0-9_]+)\s*=\s*0\s*;\s*\1\s*<\s*([a-zA-Z0-9_]+)\.size\(\)\s*;\s*\1\+\+\s*\)/g, 
    'for (const auto& element : $2)'
  );
  
  // Convert raw pointers to smart pointers
  refactored = refactored.replace(
    /([a-zA-Z0-9_]+)\s*\*\s*([a-zA-Z0-9_]+)\s*=\s*new\s+([a-zA-Z0-9_<>]+)(\([^)]*\))?;/g,
    'std::unique_ptr<$1> $2 = std::make_unique<$3>$4;'
  );
  
  // Add comprehensive error handling
  refactored = refactored.replace(
    /try\s*{([^}]*)}(\s*)catch\s*\(([^)]*)\)\s*{([^}]*)}/g,
    'try {\n$1\n}$2catch (const $3& e) {\n    std::cerr << "Error: " << e.what() << std::endl;\n$4\n}'
  );
  
  // Use explicit constructors
  refactored = refactored.replace(
    /class\s+([a-zA-Z0-9_]+)(?:\s*:\s*(?:public|private|protected)\s+[a-zA-Z0-9_]+)?\s*{\s*public:\s*([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*(?!explicit)/g,
    'class $1 {\npublic:\n    explicit $2($3)'
  );
  
  // Use noexcept where appropriate
  refactored = refactored.replace(
    /virtual\s+~([a-zA-Z0-9_]+)\s*\(\s*\)\s*(?!noexcept)/g,
    'virtual ~$1() noexcept'
  );
  
  // Use override for virtual methods
  refactored = refactored.replace(
    /virtual\s+([a-zA-Z0-9_]+)\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*(?!override|final)/g,
    'virtual $1 $2($3) override'
  );
  
  // Add const correctness
  refactored = refactored.replace(
    /([a-zA-Z0-9_]+)\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)(?!\s*const)\s*{\s*(?!.*?=)/g,
    (match, returnType, funcName, params) => {
      // Only add const if this seems to be a getter method
      if (funcName.startsWith('get') || 
          funcName.startsWith('is') || 
          funcName.startsWith('has') || 
          params.trim() === '') {
        return `${returnType} ${funcName}(${params}) const {`;
      }
      return match;
    }
  );
  
  // Use brace initialization
  refactored = refactored.replace(
    /([a-zA-Z0-9_]+)\s+([a-zA-Z0-9_]+)\s*=\s*([a-zA-Z0-9_]+)\(\);/g,
    '$1 $2{};'
  );
  
  // Add bounds checking for vector access
  refactored = refactored.replace(
    /([a-zA-Z0-9_]+)\[([^[\]]+)\]/g,
    (match, varName, index) => {
      // This is a simplistic approach, but helps catch some cases
      if (varName.includes('vector') || 
          varName.includes('array') || 
          varName.includes('list')) {
        return `${varName}.at(${index})`;
      }
      return match;
    }
  );
  
  // Add const for function parameters that aren't modified
  refactored = refactored.replace(
    /\(\s*(?:const\s+)?([a-zA-Z0-9_]+)&\s+([a-zA-Z0-9_]+)\s*(?:,|$|\))/g,
    '(const $1& $2$3'
  );
  
  // Add descriptive comments
  refactored = refactored.replace(
    /\/\/\s*([A-Za-z0-9_]+)/g,
    '// $1: Explanation about this comment'
  );
  
  return refactored;
};
