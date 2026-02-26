import { Document, Packer, Paragraph, HeadingLevel, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, Numbering, SectionType } from 'docx';
import { cleanRTFContent } from './rtfCleaner';

/**
 * Parse and format text for professional DOCX output
 */
const formatTextForDOCX = (text: string): Array<{ type: 'heading' | 'paragraph' | 'list'; content: string; level?: number; items?: string[] }> => {
  const lines = text.split('\n').filter(line => line.trim());
  const sections: Array<{ type: 'heading' | 'paragraph' | 'list'; content: string; level?: number; items?: string[] }> = [];
  let currentParagraph = '';
  let currentList: string[] = [];
  lines.forEach((line) => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.toLowerCase().includes('markdown')) {
      return;
    }
    // Detect headings (check for all caps or numbered sections)
    if (trimmedLine.match(/^[0-9]+\.\s*[A-Z][A-Z\s]+$/) || 
        (trimmedLine.length < 100 && trimmedLine === trimmedLine.toUpperCase() && trimmedLine.includes(' '))) {
      if (currentParagraph) {
        sections.push({ type: 'paragraph', content: currentParagraph.trim() });
        currentParagraph = '';
      }
      if (currentList.length > 0) {
        sections.push({ type: 'list', content: '', items: [...currentList] });
        currentList = [];
      }
      const cleanHeading = cleanRTFContent(trimmedLine);
      if (cleanHeading) {
        sections.push({
          type: 'heading',
          content: cleanHeading,
          level: trimmedLine.match(/^[0-9]+\./) ? 1 : 2
        });
      }
      return;
    }
    // Detect list items (bullet points)
    if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || trimmedLine.match(/^\d+\.\s/)) {
      if (currentParagraph) {
        sections.push({ type: 'paragraph', content: currentParagraph.trim() });
        currentParagraph = '';
      }
      const cleanListItem = cleanRTFContent(trimmedLine.replace(/^[•\-\d\.\s]+/, ''));
      if (cleanListItem) {
        currentList.push(cleanListItem);
      }
      return;
    }
    // Regular paragraph text
    if (trimmedLine) {
      if (currentList.length > 0) {
        sections.push({ type: 'list', content: '', items: currentList });
        currentList = [];
      }
      const cleanText = cleanRTFContent(trimmedLine);
      if (cleanText) {
        if (currentParagraph) {
          currentParagraph += ' ' + cleanText;
        } else {
          currentParagraph = cleanText;
        }
      }
    }
  });
  if (currentParagraph && currentParagraph.trim()) {
    sections.push({ type: 'paragraph', content: currentParagraph.trim() });
  }
  if (currentList.length > 0) {
    sections.push({ type: 'list', content: '', items: currentList });
  }
  return sections;
};

/**
 * Generate and download PRD as DOCX
 */
export const generatePRDDOCX = async (content: string, title: string): Promise<void> => {
  try {
    const sections = formatTextForDOCX(content);
    const docSections: any[] = [];
    // Add Title
    docSections.push(new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      thematicBreak: true,
    }));
    // Add Generation Date
    docSections.push(new Paragraph({
      text: `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      style: 'dateStyle',
    }));
    // Add a separator
    docSections.push(new Paragraph({
      text: '',
      border: { bottom: { color: '8B5CF6', space: 1, size: 6, style: 'single' } },
      spacing: { after: 300 },
    }));
    // Add Content Sections
    sections.forEach(section => {
      switch (section.type) {
        case 'heading':
          docSections.push(new Paragraph({
            text: section.content,
            heading: section.level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 },
            thematicBreak: section.level === 1,
          }));
          break;
        case 'paragraph':
          docSections.push(new Paragraph({
            text: section.content,
            spacing: { after: 200 },
          }));
          break;
        case 'list':
          section.items?.forEach(item => {
            docSections.push(new Paragraph({
              text: item,
              bullet: { level: 0 },
              spacing: { after: 100 },
            }));
          });
          docSections.push(new Paragraph({ text: '', spacing: { after: 200 } }));
          break;
      }
    });
    // Create Document
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: docSections,
        },
      ],
    });
    // Download
    const blob = await Packer.toBlob(doc);
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `PRD-${timestamp}.docx`;
    // For browser download
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error generating PRD DOCX:', error);
    throw error;
  }
};
