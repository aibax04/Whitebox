export const cleanRTFContent = (text: string): string => {
  // Step 1: Remove RTF header and control information
  let cleaned = text
    // Add name of the document
    .replace(/\\title\s*\{[^}]*\}/g, 'Product Requirements Document')
    // Remove RTF document declaration
    .replace(/\\rtf\d+/g, '')
    // Remove ANSI code page declarations
    .replace(/\\ansi\\ansicpg\d+/g, '')
    .replace(/\\ansi/g, '')
    .replace(/\\ansicpg\d+/g, '')
    // Remove font table declarations
    .replace(/\{\\fonttbl[^}]*\}/g, '')
    // Remove color table declarations
    .replace(/\{\\colortbl[^}]*\}/g, '')
    // Remove stylesheet declarations
    .replace(/\{\\stylesheet[^}]*\}/g, '')
    // Remove info declarations
    .replace(/\{\\info[^}]*\}/g, '')
    // Remove generator declarations
    .replace(/\{\\generator[^}]*\}/g, '');

  // Step 2: Remove specific RTF encodings and formatting artifacts
  cleaned = cleaned
    // Remove specific RTF encodings mentioned in user query
    .replace(/disc\d+;;-\d+;/g, '')
    .replace(/eftab\d+-\d+irnaturallvl\d+/g, '')
    .replace(/eftab\d+irnaturallvl\d+/g, '')
    .replace(/a\d+/g, '')
    .replace(/none/g, '')
    // Remove additional RTF artifacts
    .replace(/[a-z]+\d+[a-z]*\d*[a-z]*\d*/g, '')
    .replace(/[a-z]+\d+[a-z]*/g, '')
    .replace(/[a-z]+\d+/g, '')
    // Remove font formatting controls
    .replace(/\\f\d+/g, '')
    .replace(/\\fs\d+/g, '')
    .replace(/\\cf\d+/g, '')
    .replace(/\\cb\d+/g, '')
    // Remove paragraph formatting
    .replace(/\\pard/g, '')
    .replace(/\\sa\d+/g, '')
    .replace(/\\sb\d+/g, '')
    .replace(/\\sl\d+/g, '')
    .replace(/\\slmult\d+/g, '')
    .replace(/\\li\d+/g, '')
    .replace(/\\ri\d+/g, '')
    .replace(/\\fi\d+/g, '')
    // Remove text formatting
    .replace(/\\b\d*/g, '')
    .replace(/\\i\d*/g, '')
    .replace(/\\ul\d*/g, '')
    .replace(/\\ulnone/g, '')
    .replace(/\\strike\d*/g, '')
    .replace(/\\scaps\d*/g, '')
    .replace(/\\caps\d*/g, '')
    // Remove field codes
    .replace(/\{\\field[^}]*\}/g, '')
    .replace(/\{\\fldinst[^}]*\}/g, '')
    .replace(/\{\\fldrslt[^}]*\}/g, '')
    // Remove hyperlink codes
    .replace(/\{\\hyperlink[^}]*\}/g, '')
    // Remove other control words
    .replace(/\\[a-z]+\d*\s?/g, '')
    .replace(/\\[^a-z\s]/g, '');

  // Step 3: Handle Unicode escape sequences
  cleaned = cleaned
    // Convert Unicode bullet points and special characters
    .replace(/\\u8226\s*\\?[-']?\s*/g, '• ')
    .replace(/\\u8211\s*\\?[-']?\s*/g, '– ')
    .replace(/\\u8212\s*\\?[-']?\s*/g, '— ')
    .replace(/\\u8220\s*\\?[-']?\s*/g, '"')
    .replace(/\\u8221\s*\\?[-']?\s*/g, '"')
    .replace(/\\u8216\s*\\?[-']?\s*/g, "'")
    .replace(/\\u8217\s*\\?[-']?\s*/g, "'")
    .replace(/\\u8230\s*\\?[-']?\s*/g, '...')
    // Handle other Unicode sequences (convert to space if no clear equivalent)
    .replace(/\\u\d+\s*\\?[-']?\s*/g, ' ');

  // Step 4: Remove remaining RTF markup and control characters
  cleaned = cleaned
    // Remove all curly braces and their content if they contain backslashes
    .replace(/\{[^{}]*\\[^{}]*\}/g, '')
    // Remove remaining curly braces
    .replace(/[{}]/g, '')
    // Remove control character escapes
    .replace(/\\\\/g, '\\')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\n/g, '\n')
    .replace(/\\\r/g, '\r')
    .replace(/\\\t/g, '\t');

  // Step 5: Clean up whitespace and formatting
  cleaned = cleaned
    // Normalize line breaks
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove excessive whitespace
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    // Remove excessive line breaks
    .replace(/\n{3,}/g, '\n\n')
    // Trim whitespace from each line
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    // Remove empty lines at start and end
    .replace(/^\n+/, '')
    .replace(/\n+$/, '');

  // Step 6: Clean up common markdown/HTML if present
  cleaned = cleaned
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Clean markdown formatting but preserve structure
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/#{1,6}\s*/g, '')
    // Normalize bullet points
    .replace(/[-*+]\s+/g, '• ')
    .replace(/^\s*\d+\.\s+/gm, '• ')
    // Clean up any remaining escape sequences
    .replace(/\\./g, '');

  // Step 7: Final cleanup and validation
  cleaned = cleaned
    .trim()
    // Ensure proper paragraph spacing
    .replace(/\n\n\n+/g, '\n\n')
    // Remove any remaining non-printable characters except newlines and tabs
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return cleaned;
};

/**
 * Structure cleaned content with proper Markdown formatting
 */
export const structureContentWithMarkdown = (text: string): string => {
  // Split into lines and process each line
  const lines = text.split('\n');
  const structuredLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Skip lines that are just RTF artifacts or formatting
    if (/^[a-z0-9]+$/.test(line) && line.length < 10) continue;
    
    // Detect main headings (lines that are descriptive and not too long)
    if (/^[A-Z][a-z\s]+:?$/.test(line) && line.length > 5 && line.length < 80) {
      // Check if it's a main section heading
      if (line.toLowerCase().includes('overview') || 
          line.toLowerCase().includes('summary') || 
          line.toLowerCase().includes('analysis') || 
          line.toLowerCase().includes('features') || 
          line.toLowerCase().includes('flows') || 
          line.toLowerCase().includes('requirements') || 
          line.toLowerCase().includes('documentation') ||
          line.toLowerCase().includes('wireframes') ||
          line.toLowerCase().includes('mockups')) {
        structuredLines.push(`# ${line.replace(':', '')}`);
      } else {
        structuredLines.push(`## ${line.replace(':', '')}`);
      }
    }
    // Detect subheadings (shorter descriptive lines)
    else if (/^[A-Z][a-z\s]+:?$/.test(line) && line.length <= 50) {
      structuredLines.push(`### ${line.replace(':', '')}`);
    }
    // Detect numbered lists
    else if (/^\d+\.\s/.test(line)) {
      structuredLines.push(line);
    }
    // Detect bullet points
    else if (/^[-*•]\s/.test(line)) {
      structuredLines.push(line);
    }
    // Detect flow descriptions
    else if (/^Flow \d+:/.test(line)) {
      structuredLines.push(`## ${line}`);
    }
    // Detect endpoint descriptions
    else if (/^Endpoint \d+:/.test(line)) {
      structuredLines.push(`### ${line}`);
    }
    // Regular paragraph
    else {
      structuredLines.push(line);
    }
  }
  
  // Clean up the final result
  let result = structuredLines.join('\n\n');
  
  // Remove any remaining RTF artifacts
  result = result
    .replace(/eftab\d+-\d+irnaturallvl\d+/g, '')
    .replace(/eftab\d+irnaturallvl\d+/g, '')
    .replace(/disc\d+;;-\d+;/g, '')
    .replace(/a\d+/g, '')
    .replace(/none/g, '');
  
  // Clean up excessive whitespace
  result = result
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  return result;
};

/**
 * Complete RTF cleaning and structuring pipeline
 */
export const cleanAndStructureRTF = (text: string): string => {
  const cleaned = cleanRTFContent(text);
  return structureContentWithMarkdown(cleaned);
};
