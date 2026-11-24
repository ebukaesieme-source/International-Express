export interface PreparedAttachment {
  url: string;
  type: 'image' | 'video' | 'document';
  name: string;
  sizeKB: number;
}

const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif)$/i;
const VIDEO_EXTENSIONS = /\.(mp4|mov|webm|m4v|3gp|avi)$/i;

export function isImageFile(file: File): boolean {
  if (file.type && file.type.startsWith('image/')) return true;
  return IMAGE_EXTENSIONS.test(file.name || '');
}

export function isVideoFile(file: File): boolean {
  if (file.type && file.type.startsWith('video/')) return true;
  return VIDEO_EXTENSIONS.test(file.name || '');
}

export function isImageAttachment(
  url?: string,
  attachmentType?: string,
  attachmentName?: string
): boolean {
  if (!url) return false;
  if (url.startsWith('data:image/')) return true;
  if (attachmentType === 'image') return true;
  if (attachmentName && IMAGE_EXTENSIONS.test(attachmentName)) return true;
  return false;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Could not read file data.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read selected file.'));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode image file.'));
    img.src = src;
  });
}

/**
 * Compresses any image or photo receipt via HTML5 Canvas so the resulting Base64 data URL
 * is guaranteed to fit comfortably inside Firestore's 1MB document size limit while staying
 * sharp and legible for payment receipts and cargo waybills.
 */
export async function compressImageToDataUrl(
  file: File,
  maxDataUrlBytes: number = 480_000
): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    let img: HTMLImageElement;
    try {
      img = await loadImageElement(objectUrl);
    } catch {
      const fallbackDataUrl = await readFileAsDataUrl(file);
      img = await loadImageElement(fallbackDataUrl);
    }

    const origW = img.naturalWidth || img.width || 1200;
    const origH = img.naturalHeight || img.height || 1200;

    // Fast path: if original file is already small (< 240 KB raw) and standard web image, keep it crisp
    if (file.size <= 240_000 && /^image\/(jpeg|jpg|png|webp)$/i.test(file.type)) {
      const directUrl = await readFileAsDataUrl(file);
      if (directUrl.length <= maxDataUrlBytes) {
        return directUrl;
      }
    }

    const dimensionSteps = [1600, 1280, 1024, 840, 680, 520];
    const qualitySteps = [0.84, 0.74, 0.64, 0.52, 0.42, 0.32];

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      const directUrl = await readFileAsDataUrl(file);
      if (directUrl.length <= maxDataUrlBytes) return directUrl;
      throw new Error('Browser canvas unavailable for image compression.');
    }

    let bestDataUrl = '';

    for (const maxDim of dimensionSteps) {
      const scale = Math.min(1, maxDim / Math.max(origW, origH));
      const targetW = Math.max(1, Math.round(origW * scale));
      const targetH = Math.max(1, Math.round(origH * scale));

      canvas.width = targetW;
      canvas.height = targetH;

      // White background ensures transparent PNG screenshots/receipts stay clear in JPEG
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.drawImage(img, 0, 0, targetW, targetH);

      for (const quality of qualitySteps) {
        const candidate = canvas.toDataURL('image/jpeg', quality);
        bestDataUrl = candidate;
        if (candidate.length <= maxDataUrlBytes) {
          return candidate;
        }
      }
    }

    if (bestDataUrl && bestDataUrl.length <= 820_000) {
      return bestDataUrl;
    }

    throw new Error('This image is too large to process. Please try taking a screenshot or smaller photo.');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function prepareChatAttachment(
  file: File,
  forcedType?: 'image' | 'video' | 'document'
): Promise<PreparedAttachment> {
  const isPdfOrDoc =
    file.type === 'application/pdf' ||
    /\.(pdf|docx?|xlsx?|txt|csv)$/i.test(file.name || '');
  const isImg = !isPdfOrDoc && (isImageFile(file) || (forcedType === 'image' && !isVideoFile(file)));
  const isVid = !isImg && !isPdfOrDoc && (isVideoFile(file) || forcedType === 'video');

  if (isImg) {
    const compressedUrl = await compressImageToDataUrl(file, 480_000);
    const sizeKB = Math.max(1, Math.round((compressedUrl.length * 0.75) / 1024));
    return {
      url: compressedUrl,
      type: 'image',
      name: file.name || 'receipt_photo.jpg',
      sizeKB
    };
  }

  // PDF, document, or video: ensure total Base64 fits safely within Firestore's 1MB document limit
  const MAX_RAW_NON_IMAGE_BYTES = 560 * 1024; // ~747 KB Base64 -> leaves generous room for message metadata
  if (file.size > MAX_RAW_NON_IMAGE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    throw new Error(
      `This ${isVid ? 'video' : 'document'} (${sizeMB} MB) exceeds the 550 KB direct upload limit. Please take a photo/screenshot of the receipt and send it as an image, or upload a smaller file.`
    );
  }

  const dataUrl = await readFileAsDataUrl(file);
  if (dataUrl.length > 820_000) {
    throw new Error(
      'This file is slightly too large for direct attachment. Please send a photo/screenshot of the receipt instead.'
    );
  }

  return {
    url: dataUrl,
    type: isVid ? 'video' : 'document',
    name: file.name || (isVid ? 'video_clip.mp4' : 'receipt_document.pdf'),
    sizeKB: Math.max(1, Math.round(file.size / 1024))
  };
}

/**
 * Safely downloads a data: URL or remote URL on mobile Safari, Android Chrome, desktop browsers, and iframes.
 */
export function downloadAttachmentFile(url: string, filename: string = 'receipt_attachment'): void {
  if (!url) return;
  try {
    if (url.startsWith('data:')) {
      const parts = url.split(',');
      const mimeMatch = parts[0].match(/data:([^;]+);/);
      const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
      const byteString = atob(parts[1] || '');
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      return;
    }

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('Download attachment error:', err);
  }
}
