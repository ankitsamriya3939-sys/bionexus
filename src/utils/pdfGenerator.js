// PDF Report Exporter Utility for BioNexus Studio
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function exportElementToPdf(elementId, title = 'BioNexus_Lab_Report') {
  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#0f172a'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${title}_${new Date().toISOString().slice(0, 10)}.pdf`);
  } catch (err) {
    console.error('PDF Generation Error:', err);
  }
}

export function generateQuickPdfReport({ title, sectionData }) {
  const doc = new jsPDF();
  
  // Header styling
  doc.setFillColor(15, 23, 42); // Dark slate
  doc.rect(0, 0, 210, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text('BIONEXUS STUDIO - LAB REPORT', 14, 18);
  
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 25);

  let y = 40;
  
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(14);
  doc.text(title || 'Analysis Report', 14, y);
  y += 10;

  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);

  if (Array.isArray(sectionData)) {
    sectionData.forEach(item => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFont(undefined, 'bold');
      doc.text(`${item.label}:`, 14, y);
      doc.setFont(undefined, 'normal');
      doc.text(`${item.value}`, 60, y);
      y += 7;
    });
  }

  doc.save(`${(title || 'BioNexus_Report').replace(/\s+/g, '_')}.pdf`);
}
