import jsPDF from 'jspdf';
import { generateBusinessDocument, generateTechnicalDocument, generateCodeQualityDocument } from '@/utils/aiUtils/documentGeneration';

interface FileData {
  path: string;
  content: string;
}
/**
 * Enhanced text cleaning and formatting for professional PDF output
 */
const formatTextForPDF = (text: string): { sections: Array<{ type: 'heading' | 'paragraph' | 'list'; content: string; level?: number; items?: string[] }> } => {
  const lines = text.split('\n').filter(line => line.trim());
  const sections: Array<{ type: 'heading' | 'paragraph' | 'list'; content: string; level?: number; items?: string[] }> = [];
  
  let currentParagraph = '';
  let currentList: string[] = [];
  
  lines.forEach((line, index) => {
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
export const addFormattedContent = (doc: jsPDF, content: string, startY: number): number => {
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
        currentY += section.level === 1 ? 18 : 12;
        // Set heading style based on level
        let fontSize = 12;
        let color: [number, number, number] = [139, 92, 246]; // Always purple for headings
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(color[0], color[1], color[2]);
        doc.text(section.content, leftMargin, currentY);
        doc.setTextColor(0, 0, 0); // Reset to black
        currentY += fontSize + 8;
        break;
      }
      case 'paragraph': {
        doc.setFontSize(10);
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
        currentY += 10; // More paragraph spacing
        break;
      }
      case 'list': {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        section.items?.forEach((item, index) => {
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
        currentY += 8; // List spacing
        break;
      }
    }
  });
  return currentY;
};

/**
 * Enhanced table formatting with better styling
 */
const addEnhancedTable = (doc: jsPDF, headers: string[], rows: string[][], startY: number, title?: string): number => {
  let currentY = startY;
  
  if (title) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(139, 92, 246); 
    doc.text(title, 20, currentY);
    currentY += 20;
  }
  
  const columnWidth = (170 / headers.length);
  const rowHeight = 12;
  
  // Draw header with gradient-like effect
  doc.rect(20, currentY - 8, columnWidth * headers.length, rowHeight, 'F');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  
  headers.forEach((header, index) => {
    const text = doc.splitTextToSize(header, columnWidth - 4);
    doc.text(text[0] || '', 22 + (index * columnWidth), currentY);
  });
  currentY += rowHeight;
  
  // Draw rows with alternating colors
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  
  rows.forEach((row, rowIndex) => {
    if (currentY > 270) {
      doc.addPage();
      currentY = 20;
    }
    
    // Alternating row colors
    if (rowIndex % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(20, currentY - 8, columnWidth * headers.length, rowHeight, 'F');
    }
    
    // Draw border
    doc.setDrawColor(200, 200, 200);
    doc.rect(20, currentY - 8, columnWidth * headers.length, rowHeight, 'S');
    
    row.forEach((cell, cellIndex) => {
      const cellText = doc.splitTextToSize(cell, columnWidth - 4);
      doc.text(cellText[0] || '', 22 + (cellIndex * columnWidth), currentY);
    });
    currentY += rowHeight;
  });
  
  return currentY + 15;
};

/**
 * Create professional PDF header
 */
export const addPDFHeader = (doc: jsPDF, title: string, subtitle?: string, repoUrl?: string): number => {
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

// Utility to get a safe repo name for filenames
const getRepoNameForFilename = (repoUrl?: string) => {
  if (!repoUrl) return 'local-files';
  // Try to extract repo name from URL or fallback to sanitized string
  const match = repoUrl.match(/([\w-]+)(?:\.git)?$/);
  const name = match ? match[1] : repoUrl;
  return name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
};

/**
 * Export business document with enhanced formatting
 */
export const exportBusinessToPDF = async (files: FileData[], repoUrl: string, cachedContent?: string | null): Promise<void> => {
  try {
    // console.log('Generating business document PDF...');
    
    const documentContent = cachedContent || await generateBusinessDocument(files, repoUrl);
    const doc = new jsPDF();
    
    // Add professional header
    let yPosition = addPDFHeader(
      doc, 
      'Business Requirements Document',
      '',
      repoUrl
    );
    
    // Add formatted document content
    if (yPosition > 200) {
      doc.addPage();
      yPosition = 20;
    }
    
    addFormattedContent(doc, documentContent, yPosition);
    addFooter(doc);
    // Save with enhanced filename
    const timestamp = new Date().toISOString().split('T')[0];
    const repoName = getRepoNameForFilename(repoUrl);
    doc.save(`business-requirements-${repoName}-${timestamp}.pdf`);
    // console.log('Business document PDF generated successfully');
  } catch (error) {
    console.error('Error generating business PDF:', error);
    throw error;
  }
};

/**
 * Export technical document with enhanced formatting
 */
export const exportTechnicalToPDF = async (files: FileData[], repoUrl: string, cachedContent?: string | null): Promise<void> => {
  try {
    // console.log('Generating technical document PDF...');
    
    const documentContent = cachedContent || await generateTechnicalDocument(files, repoUrl);
    const doc = new jsPDF();
    
    // Add professional header
    let yPosition = addPDFHeader(
      doc, 
      'Technical Overview Document',
      '',
      repoUrl
    );
    
    // Add technical metrics table
    const techHeaders = ['Component', 'Count', 'Percentage'];
    const extensions = files.map(f => f.path.split('.').pop()?.toLowerCase()).filter(Boolean);
    const extCounts = extensions.reduce((acc: any, ext) => {
      acc[ext] = (acc[ext] || 0) + 1;
      return acc;
    }, {});
    
    const techRows = Object.entries(extCounts)
      .map(([ext, count]) => [
        ext.toUpperCase(),
        count.toString(),
        `${((count as number / files.length) * 100).toFixed(1)}%`
      ])
      .slice(0, 8);
    
    yPosition = addEnhancedTable(doc, techHeaders, techRows, yPosition, 'Technology Stack Breakdown');
    
    // Add formatted document content
    if (yPosition > 200) {
      doc.addPage();
      yPosition = 20;
    }
    
    addFormattedContent(doc, documentContent, yPosition);
    addFooter(doc);
    
    const timestamp = new Date().toISOString().split('T')[0];
    const repoName = getRepoNameForFilename(repoUrl);
    doc.save(`technical-documentation-${repoName}-${timestamp}.pdf`);
    // console.log('Technical document PDF generated successfully');
  } catch (error) {
    console.error('Error generating technical PDF:', error);
    throw error;
  }
};

/**
 * Export code quality document with enhanced formatting
 */
export const exportCodeQualityToPDF = async (files: FileData[], repoUrl: string, cachedContent?: string | null): Promise<void> => {
  try {
    // console.log('Generating code completeness document PDF...');
    
    const documentContent = cachedContent || await generateCodeQualityDocument(files, repoUrl);
    const doc = new jsPDF();
    
    // Add professional header
    let yPosition = addPDFHeader(
      doc, 
      'Code Completeness Assessment',
      '',
      repoUrl
    );
    

    // Add formatted document content
    if (yPosition > 200) {
      doc.addPage();
      yPosition = 20;
    }
    
    addFormattedContent(doc, documentContent, yPosition);
    addFooter(doc);
    const timestamp = new Date().toISOString().split('T')[0];
    const repoName = getRepoNameForFilename(repoUrl);
    doc.save(`code-completeness-assessment-${repoName}-${timestamp}.pdf`);
    // console.log('Code completeness document PDF generated successfully');
  } catch (error) {
    console.error('Error generating code completeness PDF:', error);
    throw error;
  } 
};

// Add a footer with page numbers and copyright
export const addFooter = (doc: jsPDF) => {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(180, 180, 180);
    doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'right' });
  }
};

/**
 * Generate Business Document PDF Blob (for S3 upload) - EXACT SAME FORMATTING AS DOWNLOAD
 */
export const generateBusinessPDFBlob = (content: string, title: string, repoUrl?: string): Blob => {
  const doc = new jsPDF();
  
  // Add professional header - use same title as exportBusinessToPDF for consistency
  let yPosition = addPDFHeader(
    doc, 
    'Business Requirements Document',
    '',
    repoUrl
  );
  
  // Add formatted document content
  if (yPosition > 200) {
    doc.addPage();
    yPosition = 20;
  }
  
  addFormattedContent(doc, content, yPosition);
  addFooter(doc);
  
  return doc.output('blob');
};

/**
 * Generate Technical Document PDF Blob (for S3 upload) - EXACT SAME FORMATTING AS DOWNLOAD
 */
export const generateTechnicalPDFBlob = (content: string, title: string, repoUrl?: string, files?: FileData[]): Blob => {
  const doc = new jsPDF();
  
  // Add professional header - use same title as exportTechnicalToPDF for consistency
  let yPosition = addPDFHeader(
    doc, 
    'Technical Overview Document',
    '',
    repoUrl
  );
  
  // Add technical metrics table if files provided
  if (files && files.length > 0) {
    const techHeaders = ['Component', 'Count', 'Percentage'];
    const extensions = files.map(f => f.path.split('.').pop()?.toLowerCase()).filter(Boolean);
    const extCounts = extensions.reduce((acc: any, ext) => {
      acc[ext] = (acc[ext] || 0) + 1;
      return acc;
    }, {});
    
    const techRows = Object.entries(extCounts)
      .map(([ext, count]) => [
        ext.toUpperCase(),
        count.toString(),
        `${((count as number / files.length) * 100).toFixed(1)}%`
      ])
      .slice(0, 8);
    
    yPosition = addEnhancedTable(doc, techHeaders, techRows, yPosition, 'Technology Stack Breakdown');
  }
  
  // Add formatted document content
  if (yPosition > 200) {
    doc.addPage();
    yPosition = 20;
  }
  
  addFormattedContent(doc, content, yPosition);
  addFooter(doc);
  
  return doc.output('blob');
};

/**
 * Generate Code Quality Document PDF Blob (for S3 upload) - EXACT SAME FORMATTING AS DOWNLOAD
 */
export const generateCodeQualityPDFBlob = (content: string, title: string, repoUrl?: string): Blob => {
  const doc = new jsPDF();
  
  // Add professional header - use same title as exportCodeQualityToPDF for consistency
  let yPosition = addPDFHeader(
    doc, 
    'Code Completeness Assessment',
    '',
    repoUrl
  );
  
  // Add formatted document content
  if (yPosition > 200) {
    doc.addPage();
    yPosition = 20;
  }
  
  addFormattedContent(doc, content, yPosition);
  addFooter(doc);
  
  return doc.output('blob');
};
