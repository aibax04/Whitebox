
import { RefactoringOptions } from './';

export const refactorSQL = (code: string, options: RefactoringOptions): string => {
  let refactoredCode = code;

  // Format SQL keywords to uppercase
  const keywords = [
    'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER',
    'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'INSERT', 'UPDATE',
    'DELETE', 'CREATE', 'ALTER', 'DROP', 'TABLE', 'INDEX', 'VIEW', 'TRIGGER',
    'FUNCTION', 'PROCEDURE', 'AS', 'AND', 'OR', 'IN', 'NOT', 'NULL', 'IS',
    'DISTINCT', 'UNION', 'ALL', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END'
  ];

  // Convert keywords to uppercase
  keywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    refactoredCode = refactoredCode.replace(regex, keyword.toUpperCase());
  });

  // Add proper indentation for common SQL structures
  refactoredCode = refactoredCode
    // Add newline before main clauses
    .replace(/\b(SELECT|FROM|WHERE|GROUP BY|HAVING|ORDER BY)\b/gi, '\n$1')
    // Add newline and indent for JOIN clauses
    .replace(/\b(LEFT|RIGHT|INNER|OUTER)?\s*JOIN\b/gi, '\n  JOIN')
    // Add indentation for individual columns in SELECT
    .replace(/,\s*([^,\n]+)/g, ',\n  $1');

  // If aggressive refactoring is enabled, apply additional formatting
  if (options.aggressive) {
    // Split subqueries onto new lines
    refactoredCode = refactoredCode.replace(/\((SELECT[^)]+)\)/gi, '(\n  $1\n)');
    
    // Add comments for complex parts if enabled
    if (options.techniques?.addComments) {
      // Add comments for joins
      if (refactoredCode.includes('JOIN')) {
        refactoredCode = '-- Joining tables\n' + refactoredCode;
      }
      // Add comments for aggregations
      if (refactoredCode.match(/COUNT|SUM|AVG|MIN|MAX/i)) {
        refactoredCode = '-- Query includes aggregations\n' + refactoredCode;
      }
    }
  }

  return refactoredCode;
};

