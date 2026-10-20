export const MAX_PRIVATE_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const PRIVATE_DOCUMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp';

export type PrivateDocumentMimeType =
  | 'application/pdf'
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp';

const MIME_BY_EXTENSION: Record<string, PrivateDocumentMimeType> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const ALLOWED_MIME_TYPES = new Set<string>(Object.values(MIME_BY_EXTENSION));

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.onload = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      if (comma < 0) reject(new Error('Could not read the selected file.'));
      else resolve(result.slice(comma + 1));
    };
    reader.readAsDataURL(file);
  });
}

export async function preparePrivateDocumentUpload(file: File) {
  const fileName = file.name.trim();
  const extension = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() : '';
  const declaredMimeType = String(file.type || '').trim().toLowerCase();
  const mimeType = ALLOWED_MIME_TYPES.has(declaredMimeType)
    ? (declaredMimeType as PrivateDocumentMimeType)
    : MIME_BY_EXTENSION[String(extension || '')];
  if (!fileName || !mimeType) {
    throw new Error('Choose a PDF, JPEG, PNG, or WebP document.');
  }
  if (file.size < 1 || file.size > MAX_PRIVATE_DOCUMENT_BYTES) {
    throw new Error('Documents must be between 1 byte and 10 MB.');
  }
  return {
    fileName,
    mimeType,
    byteSize: file.size,
    base64Content: await fileToBase64(file),
  };
}

export function downloadPrivateDocument(input: {
  fileName: string;
  mimeType: string;
  base64Content: string;
}) {
  const binary = atob(input.base64Content);
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  const blobUrl = URL.createObjectURL(new Blob([bytes], { type: input.mimeType }));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = input.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
}
