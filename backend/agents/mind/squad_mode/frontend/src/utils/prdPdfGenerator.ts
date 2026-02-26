import jsPDF from 'jspdf';
import { cleanRTFContent } from './rtfCleaner';

/**
 * Clean text for PDF formatting (removes markdown, RTF encodings, and special characters)
 */
const cleanTextForPDF = (text: string): string => {
  // First clean RTF content
  const rtfCleaned = cleanRTFContent(text);
  
  return rtfCleaned
    // Remove markdown formatting
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/```[\s\S]*?```/g, '[Code Block]')
    .replace(/#{1,6}\s/g, '')
    // Remove non-printable characters
    .replace(/[^\x20-\x7E\u00A0-\u00FF]/g, ' ')
    .trim();
};

/**
 * Parse and format text for professional PDF output
 */
const formatTextForPDF = (text: string): Array<{ type: 'heading' | 'paragraph' | 'list'; content: string; level?: number; items?: string[] }> => {
  const lines = text.split('\n').filter(line => line.trim());
  const sections: Array<{ type: 'heading' | 'paragraph' | 'list'; content: string; level?: number; items?: string[] }> = [];
  
  let currentParagraph = '';
  let currentList: string[] = [];
  
  lines.forEach((line) => {
    const trimmedLine = line.trim();
    
    // Skip empty lines or meta content
    if (!trimmedLine || trimmedLine.toLowerCase().includes('markdown')) {
      return;
    }
    
    // Detect headings (check for all caps or numbered sections)
    if (trimmedLine.match(/^[0-9]+\.\s*[A-Z][A-Z\s]+$/) || 
        (trimmedLine.length < 100 && trimmedLine === trimmedLine.toUpperCase() && trimmedLine.includes(' '))) {
      // Flush current content
      if (currentParagraph) {
        sections.push({ type: 'paragraph', content: currentParagraph.trim() });
        currentParagraph = '';
      }
      if (currentList.length > 0) {
        sections.push({ type: 'list', content: '', items: [...currentList] });
        currentList = [];
      }
      
      const cleanHeading = cleanTextForPDF(trimmedLine);
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
      // Flush paragraph if any
      if (currentParagraph) {
        sections.push({ type: 'paragraph', content: currentParagraph.trim() });
        currentParagraph = '';
      }
      
      const cleanListItem = cleanTextForPDF(trimmedLine.replace(/^[•\-\d\.\s]+/, ''));
      if (cleanListItem) {
        currentList.push(cleanListItem);
      }
      return;
    }
    
    // Regular paragraph text
    if (trimmedLine) {
      // Flush list if any
      if (currentList.length > 0) {
        sections.push({ type: 'list', content: '', items: currentList });
        currentList = [];
      }
      
      const cleanText = cleanTextForPDF(trimmedLine);
      if (cleanText) {
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
  
  return sections;
};

/**
 * Add professional PDF header
 */
const addPDFHeader = (doc: jsPDF, title: string): number => {
  let yPosition = 30;
  
  // Main title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(139, 92, 246); // Purple color
  doc.text(title, 20, yPosition);
  yPosition += 15;
  
  // Generation date
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128); // Gray color
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

/**
 * Add formatted content sections to PDF
 */
const addFormattedContent = (doc: jsPDF, sections: Array<{ type: 'heading' | 'paragraph' | 'list'; content: string; level?: number; items?: string[] }>, startY: number): number => {
  let currentY = startY;
  const pageHeight = 280;
  const leftMargin = 20;
  const rightMargin = 190;
  const lineHeight = 6;
  
  sections.forEach((section) => {
    // Check for page break
    if (currentY > pageHeight - 40) {
      doc.addPage();
      currentY = 20;
    }
    
    switch (section.type) {
      case 'heading':
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
        
      case 'paragraph':
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
        
      case 'list':
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
  });
  
  return currentY;
};

/**
 * Generate PDF document (returns jsPDF instance for reuse)
 */
const generatePDFDocument = (content: string, title: string): jsPDF => {
  const doc = new jsPDF();
  
  // Add professional header
  let yPosition = addPDFHeader(doc, title);
  
  // Format and add content
  const sections = formatTextForPDF(content);
  addFormattedContent(doc, sections, yPosition);
  
  // Add page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(`Page ${i} of ${pageCount}`, 190, 290, { align: 'right' });
  }
  
  return doc;
};

/**
 * Generate and download PRD as PDF
 */
export const generatePRDPDF = async (content: string, title: string): Promise<void> => {
  try {
    const doc = generatePDFDocument(content, title);
    
    // Save with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    doc.save(`PRD-${timestamp}.pdf`);
  } catch (error) {
    console.error('Error generating PRD PDF:', error);
    throw error;
  }
};

/**
 * Generate PRD as PDF Blob (for S3 upload) - EXACT SAME FORMATTING AS DOWNLOAD
 */
export const generatePRDPDFBlob = (content: string, title: string): Blob => {
  const doc = generatePDFDocument(content, title);
  return doc.output('blob');
};
