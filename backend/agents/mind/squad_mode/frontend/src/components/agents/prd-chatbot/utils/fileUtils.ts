import * as mammoth from 'mammoth/mammoth.browser';
import { cleanAndStructureRTF } from '../../../../utils/rtfCleaner';

// Re-export for use in other files
export { cleanAndStructureRTF };

export const readFileContent = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Handle PDF files by using backend PDF parsing
    if (file.name.toLowerCase().endsWith('.pdf')) {
      const formData = new FormData();
      formData.append('file', file);
      
      fetch('/api/parse-pdf', {
        method: 'POST',
        body: formData,
      })
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to parse PDF');
        }
        return res.json();
      })
      .then(data => {
        const content = (data?.text || '').trim();
        if (!content) {
          throw new Error('No text extracted from PDF');
        }
        resolve(content);
      })
      .catch(error => {
        console.error('PDF parsing error:', error);
        reject(new Error('Failed to extract text from PDF'));
      });
      return;
    }

    // Use Mammoth for .docx to extract human-readable text
    if (file.name.toLowerCase().endsWith('.docx')) {
      const fallbackToText = () => {
        const textReader = new FileReader();
        textReader.onload = (ev) => {
          const content = ev.target?.result as string;
          // Try to clean as RTF/markup just in case the file was mislabeled
          resolve(cleanAndStructureRTF(content));
        };
        textReader.onerror = reject;
        textReader.readAsText(file);
      };

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer | null;
          if (!arrayBuffer) {
            fallbackToText();
            return;
          }
          const bytes = new Uint8Array(arrayBuffer);
          // ZIP signature check: 'PK' => 0x50 0x4B
          const looksLikeZip = bytes.length > 3 && bytes[0] === 0x50 && bytes[1] === 0x4B;
          if (!looksLikeZip) {
            fallbackToText();
            return;
          }
          const result = await mammoth.extractRawText({ arrayBuffer });
          resolve(result.value?.trim() || '');
        } catch (err) {
          console.warn('Could not extract text from .docx. Attempting fallback.');
          fallbackToText();
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
      return;
    }

    // Check if it's an RTF file for automated processing
    if (file.name.toLowerCase().endsWith('.rtf')) {
      // Use browser-based RTF parsing approach
      const tryRTFParser = async () => {
        try {
          // Read RTF file as text and use the enhanced cleanRTFAndMarkup function
          // This approach is more reliable than trying to parse RTF in the browser
          const reader = new FileReader();
          reader.onload = (e) => {
            const content = e.target?.result as string;
            const cleaned = cleanAndStructureRTF(content);
            resolve(cleaned);
          };
          reader.onerror = () => tryTextFallback();
          reader.readAsText(file, 'utf-8');
        } catch (error) {
          console.warn('RTF parsing failed, using text fallback:', error);
          tryTextFallback();
        }
      };

      // Fallback method using text reading
      const tryTextFallback = () => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          const cleaned = cleanAndStructureRTF(content);
          resolve(cleaned);
        };
        reader.onerror = reject;
        reader.readAsText(file);
      };

      // Start with RTF parser attempt
      tryRTFParser();
    } else {
      // For non-RTF files, read as text
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      reader.onerror = reject;
      reader.readAsText(file);
    }
  });
};

export const cleanTextFromMarkdown = (text: string): string => {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/[-*+]\s/g, '• ')
    .replace(/\d+\.\s/g, '• ')
    .trim();
};

