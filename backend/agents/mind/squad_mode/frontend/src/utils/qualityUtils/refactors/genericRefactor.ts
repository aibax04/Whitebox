
import { RefactoringOptions } from './index';

/**
 * Refactor generic code (for unsupported languages) to improve quality
 */
export const refactorGeneric = (code: string, options?: RefactoringOptions): string => {
  let refactored = code;
  
  // Add consistent spacing around operators
  refactored = refactored.replace(/([a-zA-Z0-9_])([\+\-\*\/=<>!&|%])/g, '$1 $2');
  refactored = refactored.replace(/([\+\-\*\/=<>!&|%])([a-zA-Z0-9_])/g, '$1 $2');
  
  // Fix double spaces between operators
  refactored = refactored.replace(/\s{2,}/g, ' ');
  
  // Fix spaces after commas
  refactored = refactored.replace(/,([^\s])/g, ', $1');
  
  // Remove trailing whitespace
  refactored = refactored.replace(/[ \t]+$/gm, '');
  
  // Remove multiple blank lines (keep maximum of 2)
  refactored = refactored.replace(/\n{3,}/g, '\n\n');
  
  // Add consistent indentation
  const lines = refactored.split('\n');
  let indentLevel = 0;
  const indentSize = 2;
  
  refactored = lines.map(line => {
    const trimmedLine = line.trim();
    
    // Adjust indent level for closing brackets before indenting the line
    if (/^[}\])]/.test(trimmedLine)) {
      indentLevel = Math.max(0, indentLevel - 1);
    }
    
    // Skip indentation for blank lines
    if (!trimmedLine) {
      return '';
    }
    
    const indentedLine = ' '.repeat(indentLevel * indentSize) + trimmedLine;
    
    // Increase indent level after opening brackets
    if (/[{[(]$/.test(trimmedLine) || /\b(?:if|for|while|switch|else if|else)\b.*[^;{]$/.test(trimmedLine)) {
      indentLevel += 1;
    }
    
    return indentedLine;
  }).join('\n');
  
  // Add block comments for logical sections (based on empty lines)
  const sectionMarker = /\n\n(?=[a-zA-Z])/g;
  
  let lastIndex = 0;
  let sections = [];
  let match;
  
  while ((match = sectionMarker.exec(refactored)) !== null) {
    sections.push(refactored.substring(lastIndex, match.index));
    lastIndex = match.index;
  }
  
  sections.push(refactored.substring(lastIndex));
  
  refactored = sections.map((section, index) => {
    if (index === 0 || section.trim().length < 30) return section;
    
    // Guess section purpose based on content
    const firstLine = section.trim().split('\n')[0];
    const words = firstLine.split(/\s+/).filter(w => w.length > 2);
    const sectionType = words.length > 0 ? words[0] : 'Section';
    
    const commentLine = `\n/* ${sectionType} section */\n`;
    return commentLine + section;
  }).join('');
  
  // Add descriptive comments to complex expressions
  refactored = refactored.replace(
    /([a-zA-Z0-9_]+)\s*=\s*([a-zA-Z0-9_]+)(?:[\+\-\*\/&|%][\(\)a-zA-Z0-9_\s]+){3,};/g,
    '$1 = $2$3; // Complex calculation'
  );
  
  return refactored;
};
