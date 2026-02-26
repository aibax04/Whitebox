import React, { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Eye, FileText, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { marked } from 'marked';

interface LivePRDPreviewProps {
  content: string;
  isGenerating: boolean;
  onEdit: () => void;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

// Configure marked for better rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});

export const LivePRDPreview: React.FC<LivePRDPreviewProps> = ({
  content,
  isGenerating,
  onEdit,
  isVisible,
  onToggleVisibility
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [htmlContent, setHtmlContent] = React.useState('');

  // Convert markdown to HTML
  useEffect(() => {
    const convertMarkdown = async () => {
      try {
        if (!content) {
          setHtmlContent('');
          return;
        }
        
        // Use marked with default settings
        let html = await marked.parse(content);
        
        // Remove trailing colons from headings
        html = html.replace(
          /(<h[1-6][^>]*>)(.*?)(:|\u003A)(\s*)((?:<\/h[1-6]>))/gi,
          '$1$2$4$5'
        );
        
        setHtmlContent(html as string);
      } catch (error) {
        console.error('Markdown conversion error:', error);
        // Fallback: preserve line breaks and escape HTML
        const escaped = content
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br/>');
        setHtmlContent(escaped);
      }
    };
    convertMarkdown();
  }, [content]);

  // Auto-scroll to bottom when content updates
  useEffect(() => {
    if (isGenerating && scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [htmlContent, isGenerating]);

  if (!isVisible) {
    return (
      <button
        onClick={onToggleVisibility}
        className="fixed right-0 top-1/2 -translate-y-1/2 bg-squadrun-primary hover:bg-squadrun-primary/80 text-white p-2 rounded-l-lg shadow-lg z-50 transition-all"
        title="Show PRD Preview"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0D1117] border-l border-[#23272F]">
      <style>{`
        .structured-prd-content {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
          color: #C9D1D9;
          line-height: 1.6;
        }
        
        /* Headings */
        .structured-prd-content h1 {
          font-size: 1.75rem;
          font-weight: 600;
          color: #fff;
          margin-top: 2rem;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #23272F;
        }
        
        .structured-prd-content h2 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #fff;
          margin-top: 1.75rem;
          margin-bottom: 0.875rem;
        }
        
        .structured-prd-content h3 {
          font-size: 1.25rem;
          font-weight: 500;
          color: #fff;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
        }
        
        .structured-prd-content h4 {
          font-size: 1.125rem;
          font-weight: 500;
          color: #fff;
          margin-top: 1.25rem;
          margin-bottom: 0.625rem;
        }
        
        .structured-prd-content h1:first-child,
        .structured-prd-content h2:first-child,
        .structured-prd-content h3:first-child {
          margin-top: 0 !important;
        }
        
        /* Paragraphs */
        .structured-prd-content p {
          color: #C9D1D9;
          line-height: 1.7;
          margin-bottom: 1rem;
          font-size: 0.875rem;
        }
        
        /* Lists */
        .structured-prd-content ul,
        .structured-prd-content ol {
          color: #C9D1D9;
          margin-bottom: 1rem;
          margin-left: 1.5rem;
          font-size: 0.875rem;
        }
        
        .structured-prd-content ul {
          list-style-type: disc;
        }
        
        .structured-prd-content ol {
          list-style-type: decimal;
        }
        
        .structured-prd-content li {
          margin-bottom: 0.5rem;
          line-height: 1.6;
        }
        
        .structured-prd-content li > p {
          margin-bottom: 0.5rem;
        }
        
        /* Nested lists */
        .structured-prd-content ul ul,
        .structured-prd-content ol ul,
        .structured-prd-content ul ol,
        .structured-prd-content ol ol {
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }
        
        /* Tables */
        .structured-prd-content table {
          border-collapse: collapse;
          width: 100%;
          margin-bottom: 1.5rem;
          font-size: 0.875rem;
        }
        
        .structured-prd-content th {
          background-color: #161B22;
          border: 1px solid #23272F;
          padding: 0.75rem;
          text-align: left;
          font-weight: 600;
          color: #fff;
        }
        
        .structured-prd-content td {
          border: 1px solid #23272F;
          padding: 0.75rem;
          color: #C9D1D9;
        }
        
        /* Code blocks */
        .structured-prd-content pre {
          background-color: #161B22;
          border: 1px solid #23272F;
          border-radius: 0.5rem;
          padding: 1rem;
          margin-bottom: 1rem;
          overflow-x: auto;
        }
        
        .structured-prd-content pre code {
          color: #C9D1D9;
          font-size: 0.8125rem;
          font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Consolas', monospace;
        }
        
        /* Inline code */
        .structured-prd-content code {
          background-color: #161B22;
          color: #58A6FF;
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-size: 0.8125rem;
          font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Consolas', monospace;
        }
        
        .structured-prd-content pre code {
          background-color: transparent;
          padding: 0;
          color: #C9D1D9;
        }
        
        /* Blockquotes */
        .structured-prd-content blockquote {
          border-left: 4px solid #58A6FF;
          padding-left: 1rem;
          padding-top: 0.5rem;
          padding-bottom: 0.5rem;
          margin-bottom: 1rem;
          color: #8B949E;
          font-style: italic;
        }
        
        /* Links */
        .structured-prd-content a {
          color: #58A6FF;
          text-decoration: none;
        }
        
        .structured-prd-content a:hover {
          text-decoration: underline;
        }
        
        /* Horizontal rules */
        .structured-prd-content hr {
          border: none;
          border-top: 1px solid #23272F;
          margin: 2rem 0;
        }
        
        /* Strong and emphasis */
        .structured-prd-content strong {
          font-weight: 600;
          color: #fff;
        }
        
        .structured-prd-content em {
          font-style: italic;
        }
        
        /* Images */
        .structured-prd-content img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1rem 0;
        }
      `}</style>
      {/* Header */}
      <div className="flex-shrink-0 border-b border-[#23272F] p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#58A6FF]" />
            <h3 className="text-white text-sm font-light">PRD PREVIEW</h3>
            {isGenerating && (
              <span className="flex items-center gap-2 text-xs text-[#58A6FF]">
                <Loader2 className="w-3 h-3 animate-spin" />
                Generating...
              </span>
            )}
          </div>
          <button
            onClick={onToggleVisibility}
            className="text-[#8B949E] hover:text-white transition-colors"
            title="Hide Preview"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        {/* Action Buttons */}
        {!isGenerating && content && (
          <div className="flex items-center gap-2 mt-3">
            <Button
              onClick={onEdit}
              className="bg-squadrun-primary hover:bg-squadrun-primary/80 text-white text-xs px-3 py-2 h-8 flex-1"
            >
              <Eye className="w-3 h-3 mr-1" />
              Edit & Export
            </Button>
          </div>
        )}
      </div>

      {/* Content Area */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-6">
          {/* Empty state - before generation */}
          {!content && !isGenerating && (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <FileText className="w-16 h-16 text-[#8B949E] mb-4 opacity-50" />
              <p className="text-[#8B949E] text-sm">
                Your PRD will appear here in real-time<br />when you click "Generate PRD"
              </p>
            </div>
          )}

          {/* Loading state - generation started but no content yet */}
          {!content && isGenerating && (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <Loader2 className="w-12 h-12 text-[#58A6FF] animate-spin mb-4" />
              <p className="text-white text-lg mb-2">Generating your PRD</p>
              <p className="text-[#8B949E] text-sm">This may take a few moments...</p>
            </div>
          )}

          {/* PRD Content */}
          {content && (
            <>
              <div 
                className="structured-prd-content"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
              
              {/* Loading indicator when generating */}
              {isGenerating && (
                <div className="flex items-center gap-2 text-[#58A6FF] text-sm mt-4 animate-pulse">
                  <div className="w-2 h-2 bg-[#58A6FF] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-[#58A6FF] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-[#58A6FF] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Footer Status */}
      {!isGenerating && content && (
        <div className="flex-shrink-0 border-t border-[#23272F] px-6 py-3 bg-[#0D1117]">
          <div className="flex items-center justify-between">
            <div className="text-[#8B949E] text-xs">
              ✓ PRD generated successfully
            </div>
            <div className="text-[#8B949E] text-xs">
              {Math.ceil(content.length / 5)} words
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

