
import { RefactoringOptions } from './index';

/**
 * Refactor Java code to follow best practices
 */
export const refactorJava = (code: string, options?: RefactoringOptions): string => {
  let refactored = code;
  
  // Replace traditional for loops with enhanced for loops when appropriate
  refactored = refactored.replace(
    /for\s*\(\s*int\s+([a-zA-Z0-9_]+)\s*=\s*0\s*;\s*\1\s*<\s*([a-zA-Z0-9_]+)\.(?:size|length)\(\)\s*;\s*\1\+\+\s*\)/g, 
    'for (var item : $2)'
  );
  
  // Use var instead of explicit types where possible (Java 10+)
  refactored = refactored.replace(/([A-Z][a-zA-Z0-9_<>]+(?:<[^>]+>)?)\s+([a-zA-Z0-9_]+)\s*=\s*new\s+\1/g, 'var $2 = new $1');
  
  // Convert loops to streams for filtering and mapping (Java 8+)
  refactored = refactored.replace(
    /List<([a-zA-Z0-9_]+)>\s+([a-zA-Z0-9_]+)\s*=\s*new\s+ArrayList<>\(\);[\s\n]*for\s*\(([a-zA-Z0-9_<>]+)\s+([a-zA-Z0-9_]+)\s*:\s*([a-zA-Z0-9_]+)\)\s*{\s*if\s*\(([^}]*)\)\s*{\s*([a-zA-Z0-9_]+)\.add\(([^;]*)\);\s*}\s*}/g,
    'List<$1> $2 = $5.stream()\n  .filter($4 -> $6)\n  .map($4 -> $8)\n  .collect(Collectors.toList());'
  );
  
  // Add robust javadoc to methods
  refactored = refactored.replace(
    /public\s+([a-zA-Z0-9_<>]+)\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/g,
    (match, returnType, methodName, params) => {
      if (!match.includes('/**')) {
        const paramDocs = params.split(',')
          .filter(p => p.trim())
          .map(p => {
            const paramType = p.trim().split(' ')[0];
            const paramName = p.trim().split(' ')[1];
            return ` * @param ${paramName} The ${paramName} parameter`;
          })
          .join('\n');
          
        return `/**\n * ${methodName} method\n *\n${paramDocs}\n * @return ${returnType} result\n */\npublic ${returnType} ${methodName}(${params})`;
      }
      return match;
    }
  );
  
  // Add null checks with Objects.requireNonNull or Optional
  refactored = refactored.replace(
    /public\s+([a-zA-Z0-9_<>]+)\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*{/g,
    (match, returnType, methodName, params) => {
      let updatedMethod = match;
      
      params.split(',').forEach(param => {
        if (param.trim() && !param.includes('primitive') && 
            !param.includes('int ') && !param.includes('long ') && 
            !param.includes('double ') && !param.includes('float ') && 
            !param.includes('boolean ') && !param.includes('char ') && 
            !param.includes('byte ') && !param.includes('short ')) {
          
          const paramName = param.trim().split(' ')[1];
          updatedMethod = updatedMethod.replace(
            '{',
            `{\n    Objects.requireNonNull(${paramName}, "${paramName} must not be null");`
          );
        }
      });
      
      return updatedMethod;
    }
  );
  
  // Use String.format instead of string concatenation
  refactored = refactored.replace(
    /"([^"]*)"\s*\+\s*([a-zA-Z0-9_\.]+)\s*\+\s*"([^]*)"/g, 
    'String.format("$1%s$3", $2)'
  );
  
  // Replace mutable collections with immutable ones when appropriate
  refactored = refactored.replace(
    /(private|protected|public)\s+(final\s+)?(List|Set|Map)<([^>]+)>\s+([a-zA-Z0-9_]+)\s*=\s*(?:new\s+ArrayList|Arrays\.asList|Collections\.singletonList)/g,
    '$1 $2$3<$4> $5 = Collections.unmodifiableList'
  );
  
  // Use StringBuilder for string concatenation in loops
  refactored = refactored.replace(
    /(String|var)\s+([a-zA-Z0-9_]+)\s*=\s*"";[\s\n]*for\s*\(.*?\)\s*{[\s\n]*\s*\2\s*\+=\s*([^;]+);/g,
    'StringBuilder $2Builder = new StringBuilder();\nfor (.*?) {\n    $2Builder.append($3);'
  );
  
  // Add @Override annotations
  refactored = refactored.replace(
    /public\s+([a-zA-Z0-9_<>]+)\s+(equals|hashCode|toString|compareTo)\s*\(/g,
    '@Override\npublic $1 $2('
  );
  
  // Use interface types for variable declarations when possible
  refactored = refactored.replace(
    /(private|protected|public)(\s+static)?(\s+final)?\s+(ArrayList|LinkedList|HashSet|HashMap)<([^>]+)>\s+([a-zA-Z0-9_]+)/g,
    '$1$2$3 $4<$5> $6'
  );
  
  return refactored;
};
