import jsPDF from 'jspdf';
import { format } from 'date-fns';
import type { Lead } from '@/api/leadApi';
import type { LeadProductionSheet } from '@/api/leadProductionApi';

interface DownloadProductionPdfOptions {
  lead: Lead;
  sheet: LeadProductionSheet;
}

const formatDate = (value?: string | null) => {
  if (!value) return 'N/A';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return format(parsed, 'dd/MM/yyyy');
};

const buildFilename = (leadName: string) => {
  const safeName = leadName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${safeName || 'lead'}-production-sheet.pdf`;
};

const loadImageAsDataUrl = async (path: string): Promise<string | null> => {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

export const downloadProductionPdf = async ({ lead, sheet }: DownloadProductionPdfOptions) => {
  const logoDataUrl = await loadImageAsDataUrl('/vivah-creations-logo.png');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const usableWidth = pageWidth - margin * 2;
  const bottomLimit = pageHeight - margin;

  const colProduction = 42;
  const colPreName = 53;
  const colPreQty = 18;
  const colPostName = 53;
  const colPostQty = usableWidth - colProduction - colPreName - colPreQty - colPostName;
  const headerY = margin + 32;

  let y = headerY;
  let currentPage = 1;

  const drawWatermark = () => {
    if (!logoDataUrl) {
      return;
    }

    const logoWidth = 120;
    const logoHeight = 70;
    const logoX = (pageWidth - logoWidth) / 2;
    const logoY = (pageHeight - logoHeight) / 2 + 12;

    const docAny = doc as any;
    const supportsGState = typeof docAny.setGState === 'function' && typeof docAny.GState === 'function';

    if (supportsGState) {
      docAny.setGState(new docAny.GState({ opacity: 0.07 }));
      doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoWidth, logoHeight);
      docAny.setGState(new docAny.GState({ opacity: 1 }));
      return;
    }

    // Fallback where opacity state is not available
    doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoWidth, logoHeight);
  };

  const drawPageFrame = () => {
    doc.setDrawColor(219, 229, 238);
    doc.setLineWidth(0.35);
    doc.roundedRect(margin - 2, margin - 2, usableWidth + 4, pageHeight - margin * 2 + 4, 2, 2);
  };

  const drawHeader = () => {
    doc.setFillColor(242, 247, 252);
    doc.roundedRect(margin, margin, usableWidth, 24, 2, 2, 'F');
    doc.setFillColor(30, 64, 92);
    doc.rect(margin, margin, usableWidth, 4, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text('Vivah Creations', margin + 3, margin + 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.2);
    doc.setTextColor(71, 85, 105);
    doc.text('Production Planning Sheet', margin + 3, margin + 17);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30, 64, 92);
    doc.text('PRODUCTION', pageWidth - margin - 2, margin + 13, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${format(new Date(), 'dd/MM/yyyy')}`, pageWidth - margin - 2, margin + 18, { align: 'right' });
  };

  const drawFooter = () => {
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - margin - 2, pageWidth - margin, pageHeight - margin - 2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Page ${currentPage}`, pageWidth - margin, pageHeight - margin + 2, { align: 'right' });
  };

  const drawDocumentDecor = () => {
    drawWatermark();
    drawPageFrame();
    drawHeader();
  };

  const ensureSpace = (heightNeeded: number, redrawOnBreak?: () => void) => {
    if (y + heightNeeded <= bottomLimit) return;
    drawFooter();
    doc.addPage();
    currentPage += 1;
    y = headerY;
    drawDocumentDecor();
    redrawOnBreak?.();
  };

  const drawLabelValue = (label: string, value: string) => {
    const labelWidth = 36;
    const valueLines = doc.splitTextToSize(value || 'N/A', usableWidth - labelWidth);
    const blockHeight = Math.max(7, valueLines.length * 5 + 1.5);
    ensureSpace(blockHeight);

    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, y);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    doc.text(valueLines, margin + labelWidth, y);
    y += blockHeight;
  };

  const drawScheduleRow = () => {
    ensureSpace(12);
    doc.setDrawColor(206, 220, 232);
    doc.setFillColor(245, 249, 253);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.2);
    doc.setTextColor(30, 41, 59);

    doc.roundedRect(margin, y, colProduction, 10, 1, 1, 'FD');
    doc.roundedRect(margin + colProduction, y, colPreName + colPreQty, 10, 1, 1, 'FD');
    doc.roundedRect(margin + colProduction + colPreName + colPreQty, y, colPostName + colPostQty, 10, 1, 1, 'FD');

    doc.text(`Date: ${formatDate(sheet.dates.productionDate)}`, margin + 2.4, y + 6.3);
    doc.text(`Date: ${formatDate(sheet.dates.preProductionDate)}`, margin + colProduction + 2.4, y + 6.3);
    doc.text(`Date: ${formatDate(sheet.dates.postProductionDate)}`, margin + colProduction + colPreName + colPreQty + 2.4, y + 6.3);
    y += 12;
  };

  const drawTableHeader = () => {
    ensureSpace(16);
    doc.setDrawColor(73, 104, 136);
    doc.setFillColor(59, 93, 126);
    doc.rect(margin, y, usableWidth, 10, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text('Production', margin + 2, y + 6.4);
    doc.text('Pre-Production', margin + colProduction + 2, y + 6.4);
    doc.text('Post-Production', margin + colProduction + colPreName + colPreQty + 2, y + 6.4);
    y += 10;

    doc.setDrawColor(206, 220, 232);
    doc.setFillColor(233, 241, 248);
    doc.rect(margin, y, colProduction, 6.5, 'FD');
    doc.rect(margin + colProduction, y, colPreName, 6.5, 'FD');
    doc.rect(margin + colProduction + colPreName, y, colPreQty, 6.5, 'FD');
    doc.rect(margin + colProduction + colPreName + colPreQty, y, colPostName, 6.5, 'FD');
    doc.rect(margin + colProduction + colPreName + colPreQty + colPostName, y, colPostQty, 6.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(51, 65, 85);
    doc.text('Particular', margin + 2, y + 4.4);
    doc.text('Item', margin + colProduction + 2, y + 4.4);
    doc.text('Qty', margin + colProduction + colPreName + colPreQty / 2, y + 4.4, { align: 'center' });
    doc.text('Item', margin + colProduction + colPreName + colPreQty + 2, y + 4.4);
    doc.text('Qty', margin + colProduction + colPreName + colPreQty + colPostName + colPostQty / 2, y + 4.4, { align: 'center' });
    y += 6.5;
  };

  drawDocumentDecor();

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y - 1.5, usableWidth, 30, 1.6, 1.6, 'F');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  drawLabelValue('Lead Name', lead.customer?.name || 'N/A');
  drawLabelValue('Venue', lead.customer?.venueName || 'N/A');

  const eventSummary = (lead.typesOfEvent || []).length
    ? lead.typesOfEvent!
        .map((event, index) => {
          const parts = [
            `${index + 1}. ${event.name || 'Event'}`,
            event.date ? formatDate(event.date) : null,
            event.dayNight ? event.dayNight : null,
          ].filter(Boolean);

          return parts.join(' | ');
        })
        .join('\n')
    : 'N/A';

  drawLabelValue('Events', eventSummary);
  y += 3;

  drawTableHeader();
  drawScheduleRow();

  const groups = sheet.productions.length > 0 ? sheet.productions : [];

  if (groups.length === 0) {
    ensureSpace(12, () => {
      drawTableHeader();
      drawScheduleRow();
    });
    doc.setDrawColor(208, 220, 230);
    doc.setFillColor(250, 252, 253);
    doc.roundedRect(margin, y, usableWidth, 10, 1, 1, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text('No production rows added.', margin + 2, y + 6.5);
    y += 10;
  } else {
    groups.forEach((group, groupIndex) => {
      const items = group.items.length > 0 ? group.items : [{ name: '', preProductionQuantity: '', postProductionQuantity: '' }];
      const measuredRows = items.map((item) => {
        const preNameLines = doc.splitTextToSize(item.name || '-', colPreName - 4);
        const preQtyLines = doc.splitTextToSize(item.preProductionQuantity || '-', colPreQty - 4);
        const postNameLines = doc.splitTextToSize(item.name || '-', colPostName - 4);
        const postQtyLines = doc.splitTextToSize(item.postProductionQuantity || '-', colPostQty - 4);

        const lineCount = Math.max(
          preNameLines.length || 1,
          preQtyLines.length || 1,
          postNameLines.length || 1,
          postQtyLines.length || 1
        );

        return {
          preNameLines,
          preQtyLines,
          postNameLines,
          postQtyLines,
          rowHeight: Math.max(8, lineCount * 4.8 + 2),
        };
      });

      const groupHeight = measuredRows.reduce((sum, row) => sum + row.rowHeight, 0);
      ensureSpace(groupHeight + 1, () => {
        drawTableHeader();
        drawScheduleRow();
      });

      const productionLines = doc.splitTextToSize(group.name || '-', colProduction - 4);
      doc.setDrawColor(206, 220, 232);
      doc.setFillColor(groupIndex % 2 === 0 ? 246 : 240, groupIndex % 2 === 0 ? 249 : 244, groupIndex % 2 === 0 ? 252 : 248);
      doc.rect(margin, y, colProduction, groupHeight, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(productionLines, margin + 2, y + 5);

      let rowY = y;
      measuredRows.forEach((row, rowIndex) => {
        let x = margin + colProduction;

        doc.setDrawColor(206, 220, 232);
        doc.setFillColor(rowIndex % 2 === 0 ? 250 : 255, rowIndex % 2 === 0 ? 252 : 255, rowIndex % 2 === 0 ? 254 : 255);
        doc.rect(x, rowY, colPreName, row.rowHeight, 'FD');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.8);
        doc.setTextColor(30, 41, 59);
        doc.text(row.preNameLines, x + 2, rowY + 5);
        x += colPreName;

        doc.setFillColor(rowIndex % 2 === 0 ? 250 : 255, rowIndex % 2 === 0 ? 252 : 255, rowIndex % 2 === 0 ? 254 : 255);
        doc.rect(x, rowY, colPreQty, row.rowHeight, 'FD');
        doc.text(row.preQtyLines, x + colPreQty / 2, rowY + 5, { align: 'center' });
        x += colPreQty;

        doc.setFillColor(rowIndex % 2 === 0 ? 250 : 255, rowIndex % 2 === 0 ? 252 : 255, rowIndex % 2 === 0 ? 254 : 255);
        doc.rect(x, rowY, colPostName, row.rowHeight, 'FD');
        doc.text(row.postNameLines, x + 2, rowY + 5);
        x += colPostName;

        doc.setFillColor(rowIndex % 2 === 0 ? 250 : 255, rowIndex % 2 === 0 ? 252 : 255, rowIndex % 2 === 0 ? 254 : 255);
        doc.rect(x, rowY, colPostQty, row.rowHeight, 'FD');
        doc.text(row.postQtyLines, x + colPostQty / 2, rowY + 5, { align: 'center' });

        rowY += row.rowHeight;
      });

      y += groupHeight;
    });
  }

  drawFooter();
  doc.save(buildFilename(lead.customer?.name || 'lead'));
};
