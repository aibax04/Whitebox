
import { useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import * as Diff from 'diff';

interface DiffViewerProps {
  originalCode: string;
  newCode: string;
  language: string;
}

// Map file extensions to SyntaxHighlighter language support
const languageMap: Record<string, string> = {
  'py': 'python',
  'js': 'javascript',
  'ts': 'typescript',
  'jsx': 'jsx',
  'tsx': 'tsx',
  'html': 'html',
  'css': 'css',
  'java': 'java',
  'cpp': 'cpp',
  'c': 'c',
  'cs': 'csharp',
  'go': 'go',
  'rb': 'ruby',
  'rs': 'rust',
  'php': 'php',
  'sh': 'bash',
  'sql': 'sql',
  'json': 'json',
  'md': 'markdown',
  'xml': 'xml',
  'yaml': 'yaml',
  'yml': 'yaml',
};

export default function DiffViewer({ originalCode, newCode, language }: DiffViewerProps) {
  const [highlightLanguage, setHighlightLanguage] = useState<string>('javascript');
  const [diffContent, setDiffContent] = useState<JSX.Element[]>([]);

  useEffect(() => {
    // Determine the language for syntax highlighting
    if (language) {
      const lang = languageMap[language.toLowerCase()] || 'javascript';
      setHighlightLanguage(lang);
    }
  }, [language]);

  useEffect(() => {
    if (!originalCode || !newCode) return;

    // Split the code into lines
    const originalLines = originalCode.split('\n');
    const newLines = newCode.split('\n');

    // Generate line by line diff
    const diffResult = Diff.diffLines(originalCode, newCode);
    
    // Process diff into JSX elements
    const elements: JSX.Element[] = [];
    let lineNumber = 1;

    diffResult.forEach((part, index) => {
      const prefix = part.added ? '+ ' : part.removed ? '- ' : '  ';
      const color = part.added ? 'bg-green-900/30' : part.removed ? 'bg-red-900/30' : '';
      
      // Split the part into lines
      const lines = part.value.split('\n');
      
      // Remove empty trailing line that's common in diffs
      if (lines[lines.length - 1] === '') {
        lines.pop();
      }
      
      lines.forEach((line) => {
        elements.push(
          <div key={`${index}-${lineNumber}`} className={`flex ${color}`}>
            <span className="w-12 text-right px-2 select-none text-gray-500 border-r border-gray-700">
              {!part.removed ? lineNumber++ : ' '}
            </span>
            <span className="flex-1 px-4 whitespace-pre">
              <span className="text-white/70">{prefix}</span>
              <span className="font-mono">{line}</span>
            </span>
          </div>
        );
      });
    });

    setDiffContent(elements);
  }, [originalCode, newCode]);

  return (
    <div className="w-full h-full overflow-auto bg-[#1E1E1E] rounded-md">
      <div className="bg-[#1E1E1E] text-white p-2 border-b border-gray-700">
        <h3 className="text-sm font-medium">Code Changes Highlighted</h3>
      </div>
      <div className="p-0 overflow-y-auto">
        {diffContent.length > 0 ? (
          <div className="font-mono text-sm">{diffContent}</div>
        ) : (
          <SyntaxHighlighter
            language={highlightLanguage}
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              padding: '16px',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              lineHeight: '1.5rem',
              height: '100%',
              background: '#1E1E1E',
            }}
            showLineNumbers
            wrapLongLines
          >
            {newCode}
          </SyntaxHighlighter>
        )}
      </div>
    </div>
  );
}
