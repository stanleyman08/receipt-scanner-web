/**
 * Compresses and resizes an image for faster upload and OCR processing.
 * Reduces file size by 60-80% while maintaining OCR quality.
 */
export async function optimizeImageForOCR(imageDataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      // Target dimensions - 1600px max is plenty for OCR
      const maxWidth = 1600;
      const maxHeight = 1600;

      let { width, height } = img;

      // Calculate new dimensions while maintaining aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      // Create canvas and draw resized image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Use better image smoothing for resize
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Compress to JPEG with 85% quality (good balance for OCR)
      const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

      resolve(optimizedDataUrl);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for optimization'));
    };

    img.src = imageDataUrl;
  });
}

/**
 * Gets the approximate size of a base64 data URL in bytes
 */
export function getBase64Size(dataUrl: string): number {
  // Remove data URL prefix to get just the base64 part
  const base64 = dataUrl.split(',')[1] || dataUrl;
  // Base64 encodes 3 bytes as 4 characters
  return Math.round((base64.length * 3) / 4);
}

/**
 * Formats bytes as human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
