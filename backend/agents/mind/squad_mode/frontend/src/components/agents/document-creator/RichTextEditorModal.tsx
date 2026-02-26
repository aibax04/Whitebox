import React, { useState, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import jsPDF from 'jspdf';
import S3SaveButton from '@/components/S3SaveButton';
import { generatePRDPDF, generatePRDPDFBlob } from '@/utils/prdPdfGenerator';

interface RichTextEditorModalProps {
  visible: boolean;
  initialContent: string;
  title?: string;
  repoUrl?: string;
  onClose: () => void;
  onDownloadPDF?: (content: string) => void;
  onSaveToS3?: (content: string) => void;
  s3Uploading?: boolean;
  s3Success?: boolean;
  s3Error?: string | null;
  generatePDFBlob?: (content: string, title: string) => Blob;
}

/**
 * Clean text for PDF formatting (removes markdown and special characters)
 */
const cleanTextForPDF = (text: string): string => {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/```[\s\S]*?```/g, '[Code Block]')
    .replace(/[^\x20-\x7E]/g, ' ')
    .trim();
};

/**
 * Enhanced text cleaning and formatting for professional PDF output
 */
export const formatTextForPDF = (text: string): { sections: Array<{ type: 'heading' | 'paragraph' | 'list'; content: string; level?: number; items?: string[] }> } => {
  const lines = text.split('\n').filter(line => line.trim());
  const sections: Array<{ type: 'heading' | 'paragraph' | 'list'; content: string; level?: number; items?: string[] }> = [];
  
  let currentParagraph = '';
  let currentList: string[] = [];
  
  lines.forEach((line) => {
    const trimmedLine = line.trim();
    
    // Skip lines that contain only markdown indicators or meta text
    if (trimmedLine.match(/^(markdown|```|---|\*\*\*|####+)$/i) || 
        trimmedLine.toLowerCase().includes('markdown') ||
        trimmedLine.match(/^```[\w]*$/)) {
      return;
    }
    
    // Detect headings (markdown style)
    const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      // Flush current content
      if (currentParagraph) {
        sections.push({ type: 'paragraph', content: currentParagraph.trim() });
        currentParagraph = '';
      }
      if (currentList.length > 0) {
        sections.push({ type: 'list', content: '', items: [...currentList] });
        currentList = [];
      }
      
      const cleanHeading = headingMatch[2]
        .replace(/\*\*/g, '')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/markdown/gi, '')
        .trim();
      
      if (cleanHeading) {
        sections.push({
          type: 'heading',
          content: cleanHeading,
          level: headingMatch[1].length
        });
      }
      return;
    }
    
    // Detect list items
    const listMatch = trimmedLine.match(/^[-*+•]\s+(.+)$/) || trimmedLine.match(/^\d+\.\s+(.+)$/);
    if (listMatch) {
      // Flush paragraph if any
      if (currentParagraph) {
        sections.push({ type: 'paragraph', content: currentParagraph.trim() });
        currentParagraph = '';
      }
      
      const cleanListItem = listMatch[1]
        .replace(/\*\*/g, '')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/markdown/gi, '')
        .trim();
      
      if (cleanListItem) {
        currentList.push(cleanListItem);
      }
      return;
    }
    
    // Regular text
    if (trimmedLine && !trimmedLine.toLowerCase().includes('markdown')) {
      // Flush list if any
      if (currentList.length > 0) {
        sections.push({ type: 'list', content: '', items: currentList });
        currentList = [];
      }
      
      // Clean markdown formatting and meta text
      const cleanText = trimmedLine
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`(.*?)`/g, '$1')
        .replace(/```[\s\S]*?```/g, '[Code Block]')
        .replace(/markdown/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (cleanText && cleanText.length > 0) {
        if (currentParagraph) {
          currentParagraph += ' ' + cleanText;
        } else {
          currentParagraph = cleanText;
        }
      }
    }
  });
  
  // Flush remaining content
  if (currentParagraph && currentParagraph.trim()) {
    sections.push({ type: 'paragraph', content: currentParagraph.trim() });
  }
  if (currentList.length > 0) {
    sections.push({ type: 'list', content: '', items: currentList });
  }
  
  return { sections };
};

/**
 * Add properly formatted sections to PDF with enhanced styling and visual dividers
 */
const addFormattedContent = (doc: jsPDF, content: string, startY: number): number => {
  let currentY = startY;
  const { sections } = formatTextForPDF(content);
  const pageHeight = 280;
  const leftMargin = 20;
  const rightMargin = 190;
  const lineHeight = 6;

  sections.forEach((section, idx) => {
    // Check for page break
    if (currentY > pageHeight - 40) {
      doc.addPage();
      currentY = 20;
    }

    switch (section.type) {
      case 'heading': {
        // Add spacing before heading
        currentY += section.level === 1 ? 15 : 10;
        
        // Set heading style based on level
        const fontSize = section.level === 1 ? 16 : 14;
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', 'bold');
        
        // All headings use purple text color (no background)
        doc.setTextColor(139, 92, 246); // Purple text
        
        doc.text(section.content, leftMargin, currentY);
        doc.setTextColor(0, 0, 0); // Reset to black
        currentY += fontSize + 8;
        break;
      }
      case 'paragraph': {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        
        const wrappedText = doc.splitTextToSize(section.content, rightMargin - leftMargin);
        wrappedText.forEach((line: string) => {
          if (currentY > pageHeight - 10) {
            doc.addPage();
            currentY = 20;
          }
          doc.text(line, leftMargin, currentY);
          currentY += lineHeight;
        });
        
        currentY += 5; // Paragraph spacing
        break;
      }
      case 'list': {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        
        section.items?.forEach((item) => {
          if (currentY > pageHeight - 10) {
            doc.addPage();
            currentY = 20;
          }
          
          // Add bullet point
          doc.setFont('helvetica', 'bold');
          doc.text('•', leftMargin + 5, currentY);
          doc.setFont('helvetica', 'normal');
          
          // Wrap item text
          const wrappedItem = doc.splitTextToSize(item, rightMargin - leftMargin - 15);
          wrappedItem.forEach((line: string, lineIndex: number) => {
            if (currentY > pageHeight - 10) {
              doc.addPage();
              currentY = 20;
            }
            doc.text(line, leftMargin + 15, currentY);
            if (lineIndex < wrappedItem.length - 1) {
              currentY += lineHeight;
            }
          });
          
          currentY += lineHeight + 2;
        });
        
        currentY += 6; // List spacing
        break;
      }
    }
  });
  return currentY;
};

const addPDFHeader = (doc: jsPDF, title: string, subtitle?: string, repoUrl?: string): number => {
  let yPosition = 30;

  // Main title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(139, 92, 246); 
  doc.text(title, 20, yPosition);
  yPosition += 15;

  // Subtitle
  if (subtitle) {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
    doc.text(subtitle, 20, yPosition);
    yPosition += 12;
  }

  // Repository info
  if (repoUrl) {
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(`Repository: ${repoUrl}`, 20, yPosition);
    yPosition += 8;
  }

  // Generation date
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric'
  })}`, 20, yPosition);
  yPosition += 15;

  // Add separator line
  doc.setDrawColor(139, 92, 246); 
  doc.setLineWidth(0.5);
  doc.line(20, yPosition, 190, yPosition);
  yPosition += 15;

  return yPosition;
};

const getRepoNameForFilename = (repoUrl?: string) => {
  if (!repoUrl) return 'local-files';
  // Try to extract repo name from URL or fallback to sanitized string
  const match = repoUrl.match(/([\w-]+)(?:\.git)?$/);
  const name = match ? match[1] : repoUrl;
  return name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
};

/**
 * Add a footer with page numbers 
 */
const addFooter = (doc: jsPDF) => {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128); // Gray color
    doc.text(`Page ${i} of ${pageCount}`, 190, 290, { align: 'right' });
  }
};

const RichTextEditorModal: React.FC<RichTextEditorModalProps> = ({
  visible,
  initialContent,
  title = 'Edit Document',
  repoUrl,
  onClose,
  onDownloadPDF,
  onSaveToS3,
  s3Uploading,
  s3Success,
  s3Error,
  generatePDFBlob: customGeneratePDFBlob
}) => {
  const [editorContent, setEditorContent] = useState<string>('');
  const [structuredHtml, setStructuredHtml] = useState<string>('');
  const quillRef = useRef<any>(null);

  // Render the structured content as HTML for the editor
  useEffect(() => {
    if (!initialContent) {
      setEditorContent('');
      setStructuredHtml('');
      return;
    }
    
    // Use marked to parse markdown exactly like the preview does
    const parseContent = async () => {
      const { marked } = await import('marked');
      
      marked.setOptions({
        breaks: true,
        gfm: true,
      });
      
      // marked.parse() is synchronous, not a promise
      const html = marked.parse(initialContent) as string;
      
      // Remove trailing colons from headings in HTML
      const cleanedHtml = html.replace(
        /(<h[1-6][^>]*>)(.*?)(:|\u003A)(\s*)((?:<\/h[1-6]>))/gi,
        '$1$2$4$5'
      );
      
      setEditorContent(initialContent);
      setStructuredHtml(cleanedHtml);
    };
    
    parseContent();
  }, [initialContent]);

  // When the modal opens, set the editor content to the structured HTML
  useEffect(() => {
    if (visible && quillRef.current && structuredHtml) {
      const quill = quillRef.current.getEditor();
      quill.clipboard.dangerouslyPasteHTML(structuredHtml);
    }
  }, [visible, structuredHtml]);

  /**
   * Convert HTML to formatted plain text for PDF generation
   */
  const htmlToFormattedText = (html: string): string => {
    if (!html) return '';
    // Create a DOM parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    let result = '';

    const walk = (node: Node, depth = 0) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.replace(/\s+/g, ' ').trim();
        if (text) result += text + ' ';
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as HTMLElement;
      switch (el.tagName) {
        case 'H1':
        case 'H2':
        case 'H3':
        case 'H4':
        case 'H5':
        case 'H6': {
          const level = Number(el.tagName[1]);
          result += `\n${'#'.repeat(level)} ${el.textContent?.trim() || ''}\n`;
          break;
        }
        case 'UL':
          Array.from(el.children).forEach(li => {
            result += `\n- ${(li as HTMLElement).innerText.trim()}`;
          });
          result += '\n';
          break;
        case 'OL':
          Array.from(el.children).forEach((li, idx) => {
            result += `\n${idx + 1}. ${(li as HTMLElement).innerText.trim()}`;
          });
          result += '\n';
          break;
        case 'LI':
          result += `\n- ${el.innerText.trim()}`;
          break;
        case 'P':
          result += `\n${el.innerText.trim()}\n`;
          break;
        case 'BR':
          result += '\n';
          break;
        case 'BLOCKQUOTE':
          result += `\n> ${el.innerText.trim()}\n`;
          break;
        case 'PRE':
          result += `\n[Code Block]\n`;
          break;
        default:
          Array.from(el.childNodes).forEach(child => walk(child, depth + 1));
          break;
      }
    };
    Array.from(doc.body.childNodes).forEach(node => walk(node));
    return result.replace(/\n{3,}/g, '\n\n').trim();
  };

  /**
   * Generate PDF blob using EXACT SAME formatting as download
   * Uses custom generator if provided, otherwise falls back to default PRD generator
   */
  const generatePDFBlob = (): Blob => {
    const quill = quillRef.current ? quillRef.current.getEditor() : null;
    const html = quill ? quill.root.innerHTML : editorContent;
    const formattedText = htmlToFormattedText(html);
    
    // Use custom PDF generator if provided (ensures same formatting as download)
    // Otherwise use default PRD generator
    if (customGeneratePDFBlob) {
      return customGeneratePDFBlob(formattedText, title);
    }
    
    return generatePRDPDFBlob(formattedText, title);
  };

  const handleDownloadPDF = () => {
    // Get the current HTML from the editor
    const quill = quillRef.current ? quillRef.current.getEditor() : null;
    const html = quill ? quill.root.innerHTML : editorContent;
    const formattedText = htmlToFormattedText(html);

    if (onDownloadPDF) {
      // Always pass plain text to the callback
      onDownloadPDF(formattedText);
      return;
    }
    
    // Use the shared PDF generation logic
    const pdfBlob = generatePDFBlob();
    const timestamp = new Date().toISOString().split('T')[0];
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '-').toLowerCase()}-${repoUrl || 'document'}-${timestamp}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // S3 Save handler
  const handleSaveToS3 = async () => {
    const quill = quillRef.current ? quillRef.current.getEditor() : null;
    const html = quill ? quill.root.innerHTML : editorContent;
    const formattedText = htmlToFormattedText(html);
    if (onSaveToS3) {
      onSaveToS3(formattedText);
    }
  };

  return (
    <div>
      {visible && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#181d23', // squadrun primary darker
            padding: 24,
            maxWidth: 900,
            width: '100%',
            maxHeight: '90vh',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 24, color: '#8b5cf6', margin: 0 }}>{title}</h2>
              <button 
                onClick={onClose} 
                style={{ 
                  background: 'transparent', 
                  color: '#8b949e', 
                  border: 'none', 
                  padding: '8px', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: 'bold'
                }}
              >
                ×
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'scroll', scrollbarWidth: 'none', scrollBehavior: 'smooth' }}>
              <style>
                {`
                  /* Match PRD Preview Formatting */
                  .ql-editor {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif !important;
                    color: #C9D1D9 !important;
                    line-height: 1.6 !important;
                    font-size: 14px !important;
                  }
                  
                  /* Headings - Match Preview */
                  .ql-editor h1 {
                    font-size: 1.75rem !important;
                    font-weight: 600 !important;
                    color: #fff !important;
                    margin-top: 2rem !important;
                    margin-bottom: 1rem !important;
                    padding-bottom: 0.5rem !important;
                    border-bottom: 1px solid #23272F !important;
                    line-height: 1.2 !important;
                  }
                  
                  .ql-editor h2 {
                    font-size: 1.5rem !important;
                    font-weight: 600 !important;
                    color: #fff !important;
                    margin-top: 1.75rem !important;
                    margin-bottom: 0.875rem !important;
                    line-height: 1.2 !important;
                  }
                  
                  .ql-editor h3 {
                    font-size: 1.25rem !important;
                    font-weight: 500 !important;
                    color: #fff !important;
                    margin-top: 1.5rem !important;
                    margin-bottom: 0.75rem !important;
                    line-height: 1.2 !important;
                  }
                  
                  .ql-editor h4 {
                    font-size: 1.125rem !important;
                    font-weight: 500 !important;
                    color: #fff !important;
                    margin-top: 1.25rem !important;
                    margin-bottom: 0.625rem !important;
                    line-height: 1.2 !important;
                  }
                  
                  .ql-editor h5 {
                    font-size: 1rem !important;
                    font-weight: 500 !important;
                    color: #fff !important;
                    margin-top: 1rem !important;
                    margin-bottom: 0.5rem !important;
                    line-height: 1.2 !important;
                  }
                  
                  .ql-editor h6 {
                    font-size: 0.875rem !important;
                    font-weight: 500 !important;
                    color: #fff !important;
                    margin-top: 0.875rem !important;
                    margin-bottom: 0.5rem !important;
                    line-height: 1.2 !important;
                  }
                  
                  /* Paragraphs */
                  .ql-editor p {
                    color: #C9D1D9 !important;
                    line-height: 1.7 !important;
                    margin-bottom: 1rem !important;
                    font-size: 0.875rem !important;
                  }
                  
                  /* Lists */
                  .ql-editor ul,
                  .ql-editor ol {
                    color: #C9D1D9 !important;
                    margin-bottom: 1rem !important;
                    padding-left: 1.5rem !important;
                    font-size: 0.875rem !important;
                  }
                  
                  .ql-editor ul {
                    list-style-type: disc !important;
                  }
                  
                  .ql-editor ol {
                    list-style-type: decimal !important;
                  }
                  
                  .ql-editor li {
                    color: #C9D1D9 !important;
                    margin-bottom: 0.5rem !important;
                    line-height: 1.6 !important;
                  }
                  
                  /* Nested lists */
                  .ql-editor ul ul,
                  .ql-editor ol ul,
                  .ql-editor ul ol,
                  .ql-editor ol ol {
                    margin-top: 0.5rem !important;
                    margin-bottom: 0.5rem !important;
                  }
                  
                  /* Tables */
                  .ql-editor table {
                    border-collapse: collapse !important;
                    width: 100% !important;
                    margin-bottom: 1.5rem !important;
                    font-size: 0.875rem !important;
                  }
                  
                  .ql-editor th {
                    background-color: #161B22 !important;
                    border: 1px solid #23272F !important;
                    padding: 0.75rem !important;
                    text-align: left !important;
                    font-weight: 600 !important;
                    color: #fff !important;
                  }
                  
                  .ql-editor td {
                    border: 1px solid #23272F !important;
                    padding: 0.75rem !important;
                    color: #C9D1D9 !important;
                  }
                  
                  /* Blockquotes */
                  .ql-editor blockquote {
                    border-left: 4px solid #58A6FF !important;
                    padding-left: 1rem !important;
                    padding-top: 0.5rem !important;
                    padding-bottom: 0.5rem !important;
                    margin-bottom: 1rem !important;
                    color: #8B949E !important;
                    font-style: italic !important;
                  }
                  
                  /* Code blocks */
                  .ql-editor pre {
                    background-color: #161B22 !important;
                    border: 1px solid #23272F !important;
                    border-radius: 0.5rem !important;
                    padding: 1rem !important;
                    margin-bottom: 1rem !important;
                    overflow-x: auto !important;
                  }
                  
                  .ql-editor pre.ql-syntax {
                    background-color: #161B22 !important;
                    color: #C9D1D9 !important;
                  }
                  
                  .ql-editor code {
                    background-color: #161B22 !important;
                    color: #58A6FF !important;
                    padding: 0.125rem 0.375rem !important;
                    border-radius: 0.25rem !important;
                    font-size: 0.8125rem !important;
                    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Consolas', monospace !important;
                  }
                  
                  .ql-editor pre code {
                    background-color: transparent !important;
                    padding: 0 !important;
                    color: #C9D1D9 !important;
                  }
                  
                  /* Links */
                  .ql-editor a {
                    color: #58A6FF !important;
                    text-decoration: none !important;
                  }
                  
                  .ql-editor a:hover {
                    text-decoration: underline !important;
                  }
                  
                  /* Strong and emphasis */
                  .ql-editor strong {
                    font-weight: 600 !important;
                    color: #fff !important;
                  }
                  
                  .ql-editor em {
                    font-style: italic !important;
                    color: #C9D1D9 !important;
                  }
                  
                  .ql-editor u {
                    text-decoration: underline !important;
                  }
                  
                  .ql-editor s {
                    text-decoration: line-through !important;
                  }
                  
                  /* Images */
                  .ql-editor img {
                    max-width: 100% !important;
                    height: auto !important;
                    border-radius: 0.5rem !important;
                    margin: 1rem 0 !important;
                  }
                  
                  /* Horizontal rules */
                  .ql-editor hr {
                    border: none !important;
                    border-top: 1px solid #23272F !important;
                    margin: 2rem 0 !important;
                  }
                  
                  /* First element no top margin */
                  .ql-editor > *:first-child {
                    margin-top: 0 !important;
                  }
                `}
              </style>
              <>
                <style>
                  {`
                    .ql-toolbar .ql-picker-label,
                    .ql-toolbar .ql-picker-item.ql-selected,
                    .ql-toolbar button.ql-active,
                    .ql-toolbar button:focus,
                    .ql-toolbar button:hover,
                    .ql-toolbar .ql-picker.ql-expanded .ql-picker-label,
                    .ql-toolbar .ql-picker.ql-expanded .ql-picker-options {
                      color: #fffff !important; 
                    }
                    .ql-toolbar .ql-picker-label.ql-active,
                    .ql-toolbar .ql-picker-item.ql-selected {
                    }
                    .ql-toolbar .ql-stroke.ql-active,
                    .ql-toolbar .ql-stroke.ql-selected {
                      stroke: #3b82f6 !important;
                    }
                    .ql-toolbar .ql-fill.ql-active,
                    .ql-toolbar .ql-fill.ql-selected {
                      fill: #3b82f6 !important;
                    }
                  `}
                </style>
                <ReactQuill
                  ref={quillRef}
                  value={editorContent}
                  onChange={setEditorContent}
                  theme="snow"    
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      [{ 'color': [] }, { 'background': [] }],
                      [{ 'align': [] }],
                      ['link', 'image'],
                      ['clean']
                    ]
                  }}
                  style={{ height: 'calc(90vh)', background: '#181d23', color: '#ffffff' }}
                />
              </>
            </div>
            
            {/* Footer with Action Buttons */}
            <div style={{
              padding: '10px 3px',
              borderTop: '1px solid #ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'transparent'
            }}>
              <div style={{ flex: 1 }}></div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={handleDownloadPDF} 
                  style={{ 
                    background: '#8b5cf6',
                    color: '#fff', 
                    border: 'none', 
                    padding: '8px 16px', 
                    borderRadius: 4, 
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Download PDF
                </button>
                {/* S3 Save Button - Pass function to generate PDF blob on-demand with exact same formatting */}
                <span>
                   <S3SaveButton
                     documentContent={generatePDFBlob}
                     documentName={title.toLowerCase().includes('product requirements document') 
                       ? `PRD-${new Date().toISOString().split('T')[0]}.pdf`
                       : `${title.replace(/\s+/g, '-').toLowerCase()}-${repoUrl ? repoUrl.replace(/[^a-zA-Z0-9-_]/g, '-') : 'repo'}-${new Date().toISOString().split('T')[0]}.pdf`
                     }
                     mimeType="application/pdf"
                   />
                 </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RichTextEditorModal;