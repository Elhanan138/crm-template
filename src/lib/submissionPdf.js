import { api } from '@/api/client';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { formatDate } from '@/lib/formatDate';

/**
 * Generate a PDF blob from a rendered FormSubmissionPdf DOM element.
 * Uses html2canvas → jsPDF pipeline. Hebrew/RTL safe.
 */
export async function generateSubmissionPdfBlob(pdfElement) {
  const canvas = await html2canvas(pdfElement, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
  });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgW = pageW;
  const imgH = (canvas.height * imgW) / canvas.width;
  let heightLeft = imgH;
  let position = 0;
  pdf.addImage(imgData, 'PNG', 0, position, imgW, imgH);
  heightLeft -= pageH;
  while (heightLeft > 0) {
    position -= pageH;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgW, imgH);
    heightLeft -= pageH;
  }
  return pdf.output('blob');
}

/**
 * Download a blob as a file.
 */
export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Upload a PDF blob and return the file URL.
 */
export async function uploadSubmissionPdf(blob, fileName) {
  const file = new File([blob], `${fileName}.pdf`, { type: 'application/pdf' });
  const { file_url } = await api.integrations.Core.UploadFile({ file });
  return file_url;
}

/**
 * Parse project.document_url JSON into an array of doc objects.
 */
export function parseProjectDocs(documentUrl) {
  if (!documentUrl) return [];
  try {
    const parsed = JSON.parse(documentUrl);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Attach (or replace) a form submission PDF in a project's document list.
 * If a doc with the same submission_id already exists, its URL is replaced.
 */
export async function attachSubmissionToProject(projectId, submission, pdfUrl) {
  const project = await api.entities.Project.get(projectId);
  if (!project) return;
  const docs = parseProjectDocs(project.document_url);
  const docName = `טופס: ${submission.template_title || 'טופס'} — ${formatDate(submission.created_date || new Date(), 'short')}`;

  const existingIdx = docs.findIndex(d => d.submission_id === submission.id);
  if (existingIdx >= 0) {
    docs[existingIdx] = { ...docs[existingIdx], url: pdfUrl, name: docName, submission_id: submission.id, uploaded_at: new Date().toISOString() };
  } else {
    docs.push({ url: pdfUrl, name: docName, submission_id: submission.id, uploaded_at: new Date().toISOString() });
  }

  await api.entities.Project.update(projectId, { document_url: JSON.stringify(docs) });
}

/**
 * Remove a form submission document from a project by submission_id.
 */
export async function removeSubmissionFromProject(projectId, submissionId) {
  const project = await api.entities.Project.get(projectId);
  if (!project) return;
  const docs = parseProjectDocs(project.document_url);
  const filtered = docs.filter(d => d.submission_id !== submissionId);
  await api.entities.Project.update(projectId, {
    document_url: filtered.length > 0 ? JSON.stringify(filtered) : null,
  });
}