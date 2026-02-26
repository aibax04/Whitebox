/**
 * Extracts Mermaid code from text/markdown
 */
export const extractMermaidCode = (text: string): string => {
  if (!text) return '';

  // 1. Try to extract from markdown code blocks first (more flexible regex)
  const mermaidRegex = /```mermaid\s*([\s\S]*?)```/i;
  const match = text.match(mermaidRegex);

  if (match && match[1]) {
    return sanitizeMermaidCode(match[1].trim());
  }

  // 2. Try generic code blocks if "mermaid" tag is missing
  const genericRegex = /```\s*([\s\S]*?)```/i;
  const genericMatch = text.match(genericRegex);
  if (genericMatch && genericMatch[1]) {
    const code = genericMatch[1].trim();
    if (isMermaidCode(code)) {
      return sanitizeMermaidCode(code);
    }
  }

  // 3. Fallback: try to find the start of a mermaid diagram and extract to the end
  const keywords = ['graph', 'flowchart', 'erDiagram', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'pie', 'gantt'];
  for (const keyword of keywords) {
    const index = text.indexOf(keyword);
    if (index !== -1) {
      // Assuming the diagram goes to the end or until another block starts
      const code = text.substring(index).trim();
      // Basic check: does it look like mermaid?
      if (isMermaidCode(code)) {
        return sanitizeMermaidCode(code);
      }
    }
  }

  return '';
};

/**
 * Checks if a string looks like Mermaid code
 */
const isMermaidCode = (text: string): boolean => {
  const code = text.trim();
  return (
    code.startsWith('graph') ||
    code.startsWith('flowchart') ||
    code.startsWith('erDiagram') ||
    code.startsWith('sequenceDiagram') ||
    code.startsWith('classDiagram') ||
    code.startsWith('stateDiagram') ||
    code.startsWith('pie') ||
    code.startsWith('gantt') ||
    code.startsWith('mindmap') ||
    code.startsWith('timeline')
  );
};

/**
 * Sanitizes common Mermaid syntax errors
 */
export const sanitizeMermaidCode = (code: string): string => {
  if (!code) return '';

  let sanitized = code;

  // 1. Remove any leading/trailing non-mermaid text that might have survived
  const startKeywords = ['graph', 'flowchart', 'erDiagram', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'pie', 'gantt', 'mindmap', 'timeline'];
  let startIndex = -1;
  for (const kw of startKeywords) {
    const idx = sanitized.indexOf(kw);
    if (idx !== -1 && (startIndex === -1 || idx < startIndex)) {
      startIndex = idx;
    }
  }
  if (startIndex > 0) {
    sanitized = sanitized.substring(startIndex);
  }

  // 2. Fix subgraphs without proper identifier[Label] syntax
  // Pattern: subgraph SomeName (without brackets) -> subgraph SomeName[SomeName]
  sanitized = sanitized.replace(/^(\s*)subgraph\s+([a-zA-Z0-9_-]+)\s*$/gm, (match, space, name) => {
    const identifier = name.replace(/[^a-zA-Z0-9_]/g, '_');
    const label = name.replace(/_/g, ' ').replace(/-/g, ' ');
    return `${space}subgraph ${identifier}[${label}]`;
  });

  sanitized = sanitized.replace(/^(\s*)subgraph\s+([a-zA-Z0-9_-]+)\s*\n/gm, (match, space, name) => {
    const identifier = name.replace(/[^a-zA-Z0-9_]/g, '_');
    const label = name.replace(/_/g, ' ').replace(/-/g, ' ');
    return `${space}subgraph ${identifier}[${label}]\n`;
  });

  sanitized = sanitized.replace(/subgraph\s+"([^"]+)"/g, (match, label) => {
    const identifier = label.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    return `subgraph ${identifier}[${label}]`;
  });

  // 3. Fix common sequence diagram arrow errors
  if (sanitized.includes('sequenceDiagram')) {
    // Fix "--> >" or "-- >>" or "- ->" to "-->>" (response arrow)
    sanitized = sanitized.replace(/--?>\s*>/g, '-->>');
    sanitized = sanitized.replace(/--\s+>>/g, '-->>');
    
    // Fix "-> >" or "- >>" to "->>" (call arrow)
    sanitized = sanitized.replace(/-?>\s*>/g, '->>');
    sanitized = sanitized.replace(/-\s+>>/g, '->>');

    // Fix participant declarations if they have spaces or special chars
    // participant "User Interface" as UI -> participant UI[User Interface]
    // Note: older mermaid used "as", newer can use brackets
  }

  // 4. Fix ERD attribute order and remove SQL junk
  if (sanitized.includes('erDiagram')) {
    const lines = sanitized.split('\n');
    const fixedLines = lines.map((line) => {
      // Remove SQL constraints that Mermaid doesn't support inside entity block
      if (line.match(/^\s*(PRIMARY KEY|FOREIGN KEY|CONSTRAINT|UNIQUE|CHECK|INDEX)\s*\(/i)) {
        return '';
      }
      if (line.match(/^\s*(ALTER TABLE|CREATE TABLE|DROP TABLE|INSERT INTO|SELECT|UPDATE|DELETE)/i)) {
        return '';
      }

      // Match pattern: whitespace + DATATYPE + attribute_name + optional constraints
      // OR whitespace + attribute_name + DATATYPE + optional constraints
      
      // Case A: DATATYPE attribute_name (e.g., INT user_id)
      const typeFirstMatch = line.match(
        /^(\s+)(INT|VARCHAR|TEXT|DATETIME|BOOLEAN|DECIMAL|FLOAT|DOUBLE|CHAR|DATE|TIME|TIMESTAMP|BLOB|ENUM|STRING)(\([^)]+\))?\s+([a-zA-Z0-9_]+)(\s+.+)?$/i
      );

      if (typeFirstMatch) {
        const [, whitespace, dataType, typeParam, attributeName, constraints] = typeFirstMatch;
        const fullDataType = dataType + (typeParam || '');
        // Swap to: attribute_name data_type
        return `${whitespace}${attributeName} ${fullDataType}${constraints || ''}`;
      }
      
      return line;
    });
    sanitized = fixedLines.filter(l => l !== '').join('\n');
  }

  // 5. Sequence Diagram: Ensure all participants are declared
  if (sanitized.includes('sequenceDiagram')) {
    const lines = sanitized.split('\n');
    const participants = new Set<string>();
    const usedParticipants = new Set<string>();

    lines.forEach((line) => {
      const participantMatch = line.match(/^\s*(participant|actor)\s+([a-zA-Z0-9_]+)/);
      if (participantMatch) {
        participants.add(participantMatch[2]);
      }
    });

    lines.forEach((line) => {
      const arrowMatch = line.match(/^\s*([a-zA-Z0-9_]+)\s*(->>|-->>|->|-->)\s*([a-zA-Z0-9_]+)/);
      if (arrowMatch) {
        usedParticipants.add(arrowMatch[1]);
        usedParticipants.add(arrowMatch[3]);
      }
    });

    const missingParticipants = Array.from(usedParticipants).filter((p) => !participants.has(p));
    if (missingParticipants.length > 0) {
      const sequenceDiagramIndex = lines.findIndex((line) => line.includes('sequenceDiagram'));
      if (sequenceDiagramIndex !== -1) {
        const newParticipants = missingParticipants.map((p) => `    participant ${p}`);
        lines.splice(sequenceDiagramIndex + 1, 0, ...newParticipants);
        sanitized = lines.join('\n');
      }
    }
  }

  // 6. Final Cleanup
  // Remove any remaining markdown artifacts
  sanitized = sanitized.replace(/```mermaid/gi, '');
  sanitized = sanitized.replace(/```/g, '');
  
  return sanitized.trim();
};

/**
 * Extracts text from a PDF file
 */
export const extractPDFText = async (file: File, apiUrl: string): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${apiUrl}/api/parse-pdf`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to extract PDF text');
    }

    const data = await response.json();
    return data.text || '';
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF');
  }
};

