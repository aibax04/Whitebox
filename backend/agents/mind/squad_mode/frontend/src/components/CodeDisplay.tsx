import { useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeDisplayProps {
  code: string;
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

export default function CodeDisplay({ code, language }: CodeDisplayProps) {
  const [highlightLanguage, setHighlightLanguage] = useState<string>('javascript');

  useEffect(() => {
    // Determine the language for syntax highlighting
    if (language) {
      const lang = languageMap[language.toLowerCase()] || 'javascript';
      setHighlightLanguage(lang);
    }
  }, [language]);

  return (
    <div className="w-full bg-transparent rounded-md">
      <div className="p-4 bgtransparent h-[300px] w-full overflow-auto">
        <div className="w-full bg-transparent rounded-md flex items-center gap-2 text-squadrun-gray">
          Lines of code: 
          <span className="text-white">{code.split('\n').length}</span>
        </div>
        <div className="w-full h-px bg-transparent my-2" />
        <div className="min-w-full inline-block">
          <SyntaxHighlighter
            language={highlightLanguage}
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              padding: '8px',
              borderRadius: '0.375rem',
              width: '100%',
              maxWidth: '75vw',
              overflowX: 'auto',
              overflowY: 'hidden',
              fontSize: '0.875rem',
              lineHeight: '1.5rem',
              background: 'transparent',
              display: 'inline-block',
            }}
            showLineNumbers
            wrapLongLines={false}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  );
}
