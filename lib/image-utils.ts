import { deskewReceipt } from './image-preprocessing';

/**
 * Enhances contrast for faded receipts (especially thermal paper).
 * Only applies enhancement if the image has low contrast.
 */
function enhanceContrast(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Find luminance range to detect low contrast
  let min = 255;
  let max = 0;

  for (let i = 0; i < data.length; i += 4) {
    // Calculate luminance using standard weights
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    min = Math.min(min, lum);
    max = Math.max(max, lum);
  }

  // Only apply contrast stretching if the image has low contrast
  const range = max - min;
  if (range < 200) {
    const factor = 255 / Math.max(range, 1);

    for (let i = 0; i < data.length; i += 4) {
      // Apply contrast stretch to each channel
      data[i] = Math.min(255, Math.max(0, (data[i] - min) * factor));
      data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - min) * factor));
      data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - min) * factor));
      // Alpha channel (data[i + 3]) remains unchanged
    }

    ctx.putImageData(imageData, 0, 0);
  }
}

/**
 * Callback for tracking preprocessing progress
 */
export type PreprocessingProgressCallback = (stage: 'deskewing' | 'optimizing') => void;

/**
 * Compresses and resizes an image for faster upload and OCR processing.
 * Includes auto-deskew and contrast enhancement for improved OCR accuracy.
 *
 * Processing pipeline:
 * 1. Auto-detect and deskew receipt (opencv.js)
 * 2. Resize to max 1600x1600 while maintaining aspect ratio
 * 3. Enhance contrast for faded receipts
 * 4. Compress to JPEG at 85% quality
 *
 * @param imageDataUrl - The input image as a base64 data URL
 * @param onProgress - Optional callback for progress updates
 * @returns Optimized image as a base64 data URL
 */
export async function optimizeImageForOCR(
  imageDataUrl: string,
  onProgress?: PreprocessingProgressCallback
): Promise<string> {
  // Step 1: Auto-detect and deskew receipt
  onProgress?.('deskewing');
  const deskewed = await deskewReceipt(imageDataUrl);

  // Step 2: Resize, enhance contrast, and compress
  onProgress?.('optimizing');
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

      // Step 3: Enhance contrast for faded receipts
      enhanceContrast(ctx, width, height);

      // Step 4: Compress to JPEG with 85% quality (good balance for OCR)
      const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

      resolve(optimizedDataUrl);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for optimization'));
    };

    img.src = deskewed;
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
