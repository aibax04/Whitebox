import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface ROICalculationData {
  calculatorName: string;
  factors: Array<{
    name: string;
    scale: string;
    score: number;
    weight: number;
  }>;
  roiScore: number;
  prdName: string;
}

/**
 * Appends ROI calculation data as a new page to an existing PDF
 */
export const appendROIToPDF = async (
  originalPdfBuffer: ArrayBuffer,
  roiData: ROICalculationData
): Promise<Uint8Array> => {
  try {
    // Load the existing PDF
    const pdfDoc = await PDFDocument.load(originalPdfBuffer);
    
    // Validate that it's a valid PDF
    if (pdfDoc.getPageCount() === 0) {
      throw new Error('Invalid PDF file: No pages found');
    }
    
    // Add a new page
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    const { width, height } = page.getSize();
    
    // Get fonts
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Define colors
    const primaryColor = rgb(0.545, 0.361, 0.965); // Purple
    const secondaryColor = rgb(0.2, 0.2, 0.2); // Dark gray
    const lightGray = rgb(0.8, 0.8, 0.8);
    
    let yPosition = height - 100; // Start from top with margin
    
    // Header
    page.drawText('ROI Calculation', {
      x: 50,
      y: yPosition,
      size: 24,
      font: helveticaBold,
      color: primaryColor,
    });
    yPosition -= 100;

    // Compute max possible score based on percentage weights and factor max scales
    const maxScore = roiData.factors.reduce((sum, factor) => {
      const parts = factor.scale.split(' - ');
      const scaleMax = Number(parts[1]);
      const weightPct = Number(factor.weight);
      if (!isFinite(scaleMax) || !isFinite(weightPct)) return sum;
      return sum + scaleMax * (weightPct / 10);
    }, 0);

    const roiScoreText = `${roiData.roiScore.toFixed(1)} / ${maxScore.toFixed(1)}`;
    page.drawText(`ROI Score: ${roiScoreText}`, {
        x: 50,
        y: yPosition,
        size: 18,
        font: helveticaBold,
        color: primaryColor,
      });
      yPosition -= 50;
    // PRD Name
    page.drawText(`PRD: ${roiData.prdName}`, {
      x: 50,
      y: yPosition,
      size: 14,
      font: helveticaBold,
      color: secondaryColor,
    });
    yPosition -= 25;
    
    // Calculator Name
    page.drawText(`Calculator: ${roiData.calculatorName}`, {
      x: 50,
      y: yPosition,
      size: 14,
      font: helveticaBold,
      color: secondaryColor,
    });
    yPosition -= 50;
    
    
    // const roiScoreWidth = helveticaBold.widthOfTextAtSize(roiScoreText, 48);
    
    // Draw background rectangle for ROI score
    // page.drawRectangle({
    //   x: 45,
    //   y: yPosition - 55,
    //   width: roiScoreWidth + 20,
    //   height: 60,
    //   color: rgb(0.98, 0.98, 0.98), // Light gray background
    //   borderColor: primaryColor,
    //   borderWidth: 2,
    // });
    
   
    
    // Large ROI score
    // page.drawText(roiScoreText, {
    //   x: 55,
    //   y: yPosition,
    //   size: 40,
    //   font: helveticaBold,
    //   color: primaryColor,
    // });
    // yPosition -= 25;
    
    // Summary section
    const weightedScore = roiData.factors.reduce((sum, factor) => {
      const scaleMax = parseInt(factor.scale.split(' - ')[1]);
      return sum + (factor.score / scaleMax) * factor.weight;
    }, 0);
    
    // page.drawText('Calculation Summary', {
    //   x: 50,
    //   y: yPosition,
    //   size: 16,
    //   font: helveticaBold,
    //   color: primaryColor,
    // });
    // yPosition -= 50;
    
    // page.drawText(`Total Weight: ${totalWeight}`, {
    //   x: 50,
    //   y: yPosition,
    //   size: 12,
    //   font: helveticaFont,
    //   color: secondaryColor,
    // });
    // yPosition -= 25;
    
    // page.drawText(`Weighted Score: ${weightedScore.toFixed(1)}`, {
    //   x: 50,
    //   y: yPosition,
    //   size: 12,
    //   font: helveticaFont,
    //   color: secondaryColor,
    // });
    // yPosition -= 50;
    
    // Factors table header
    page.drawText('Evaluation Factors', {
      x: 50,
      y: yPosition,
      size: 16,
      font: helveticaBold,
      color: primaryColor,
    });
    yPosition -= 25;
    
    // Draw table header
    const tableStartX = 50;
    const tableWidth = width - 100;
    const colWidth = tableWidth / 4;
    
    // Table header background
    page.drawRectangle({
      x: tableStartX,
      y: yPosition - 20,
      width: tableWidth,
      height: 25,
      color: primaryColor,
    });
    
    // Table header text
    const headers = ['Factor', 'Scale', 'Score', 'Weight'];
    headers.forEach((header, index) => {
      page.drawText(header, {
        x: tableStartX + (index * colWidth) + 5,
        y: yPosition - 10,
        size: 12,
        font: helveticaBold,
        color: rgb(1, 1, 1), // White text
      });
    });
    yPosition -= 35;
    
    // Draw table rows
    roiData.factors.forEach((factor, index) => {
      // Alternating row colors
      if (index % 2 === 0) {
        page.drawRectangle({
          x: tableStartX,
          y: yPosition - 20,
          width: tableWidth,
          height: 25,
          color: rgb(0.98, 0.98, 0.98), // Light gray
        });
      }
      
      // Row border
      page.drawRectangle({
        x: tableStartX,
        y: yPosition - 20,
        width: tableWidth,
        height: 25,
        borderColor: lightGray,
        borderWidth: 1,
      });
      
      // Factor data
      page.drawText(factor.name, {
        x: tableStartX + 5,
        y: yPosition - 10,
        size: 10,
        font: helveticaFont,
        color: secondaryColor,
      });
      
      page.drawText(factor.scale, {
        x: tableStartX + colWidth + 5,
        y: yPosition - 10,
        size: 10,
        font: helveticaFont,
        color: secondaryColor,
      });
      
      page.drawText(factor.score.toString(), {
        x: tableStartX + (colWidth * 2) + 5,
        y: yPosition - 10,
        size: 10,
        font: helveticaFont,
        color: secondaryColor,
      });
      
      page.drawText(factor.weight.toString(), {
        x: tableStartX + (colWidth * 3) + 5,
        y: yPosition - 10,
        size: 10,
        font: helveticaFont,
        color: secondaryColor,
      });
      
      yPosition -= 30;
    });
    
    // Save the modified PDF
    return await pdfDoc.save();
  } catch (error) {
    console.error('Error appending ROI to PDF:', error);
    if (error instanceof Error) {
      throw new Error(`PDF processing failed: ${error.message}`);
    }
    throw new Error('PDF processing failed: Unknown error');
  }
};

/**
 * Downloads a PDF blob as a file
 */
export const downloadPDF = (pdfBytes: Uint8Array, filename: string) => {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
