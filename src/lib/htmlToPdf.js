// Render a DOM node to a paginated A4 PDF. Used for proposals and forms so the
// exported file matches what the print layout shows, RTL included.
export async function elementToPdf(element, filename = 'document.pdf') {
  if (!element) throw new Error('אין תוכן לייצוא');

  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
    windowWidth: element.scrollWidth,
  });

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgHeight = (canvas.height * pageWidth) / canvas.width;

  const image = canvas.toDataURL('image/jpeg', 0.95);
  let remaining = imgHeight;
  let offset = 0;

  pdf.addImage(image, 'JPEG', 0, 0, pageWidth, imgHeight, undefined, 'FAST');
  remaining -= pageHeight;

  // Long documents: shift the same bitmap up one page at a time.
  while (remaining > 0) {
    offset -= pageHeight;
    pdf.addPage();
    pdf.addImage(image, 'JPEG', 0, offset, pageWidth, imgHeight, undefined, 'FAST');
    remaining -= pageHeight;
  }

  pdf.save(filename);
}

/** Filename-safe slug that keeps Hebrew characters readable. */
export const pdfFileName = (...parts) =>
  parts.filter(Boolean).join('-').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '-') + '.pdf';
