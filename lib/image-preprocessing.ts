/**
 * Receipt image preprocessing using OpenCV.js
 * Provides auto-detection and deskewing of receipts for improved OCR accuracy
 *
 * OpenCV.js is loaded from CDN on first use to avoid bundling the large (~8MB) file
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cv: any = null;
let loadingPromise: Promise<void> | null = null;

// OpenCV.js CDN URL (version 4.10.0)
const OPENCV_CDN_URL = 'https://docs.opencv.org/4.10.0/opencv.js';

interface Point {
  x: number;
  y: number;
}

/**
 * Lazily loads OpenCV.js (~8MB) from CDN only when needed
 */
async function loadOpenCV(): Promise<void> {
  // Return immediately if already loaded
  if (cv) return;

  // If already loading, wait for it
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise((resolve, reject) => {
    // Check if OpenCV is already available globally (e.g., from a previous load)
    if (typeof window !== 'undefined' && (window as typeof window & { cv?: unknown }).cv) {
      cv = (window as typeof window & { cv: unknown }).cv;
      resolve();
      return;
    }

    // Create script tag to load from CDN
    const script = document.createElement('script');
    script.src = OPENCV_CDN_URL;
    script.async = true;

    script.onload = () => {
      // Wait for OpenCV to initialize
      const checkReady = () => {
        const windowCv = (window as typeof window & { cv?: { Mat?: unknown; onRuntimeInitialized?: () => void } }).cv;
        if (windowCv && windowCv.Mat) {
          cv = windowCv;
          resolve();
        } else if (windowCv && windowCv.onRuntimeInitialized !== undefined) {
          windowCv.onRuntimeInitialized = () => {
            cv = windowCv;
            resolve();
          };
        } else {
          // Check again in 100ms
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
    };

    script.onerror = () => {
      loadingPromise = null;
      reject(new Error('Failed to load OpenCV.js from CDN'));
    };

    document.head.appendChild(script);
  });

  return loadingPromise;
}

/**
 * Loads an image data URL into an OpenCV Mat
 */
function loadImageToMat(imageDataUrl: string): Promise<typeof cv.Mat> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const mat = cv.matFromImageData(imageData);
      resolve(mat);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageDataUrl;
  });
}

/**
 * Converts an OpenCV Mat to a data URL
 */
function matToDataUrl(mat: typeof cv.Mat, quality = 0.92): string {
  const canvas = document.createElement('canvas');
  cv.imshow(canvas, mat);
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Extracts corner points from an approximated contour
 */
function extractPoints(approx: typeof cv.Mat): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < approx.rows; i++) {
    points.push({
      x: approx.data32S[i * 2],
      y: approx.data32S[i * 2 + 1],
    });
  }
  return points;
}

/**
 * Orders corner points as: top-left, top-right, bottom-right, bottom-left
 */
function orderCorners(points: Point[]): Point[] {
  // Sort by sum of coordinates (top-left has smallest, bottom-right has largest)
  const sorted = [...points].sort((a, b) => (a.x + a.y) - (b.x + b.y));
  const topLeft = sorted[0];
  const bottomRight = sorted[3];

  // Sort remaining by difference (top-right has largest x-y, bottom-left has smallest)
  const remaining = [sorted[1], sorted[2]];
  remaining.sort((a, b) => (a.x - a.y) - (b.x - b.y));
  const bottomLeft = remaining[0];
  const topRight = remaining[1];

  return [topLeft, topRight, bottomRight, bottomLeft];
}

/**
 * Calculates Euclidean distance between two points
 */
function distance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * Finds the largest quadrilateral contour in the image (likely the receipt)
 */
function findLargestQuadContour(
  contours: typeof cv.MatVector,
  width: number,
  height: number
): Point[] | null {
  const minArea = width * height * 0.1; // At least 10% of image area
  let best: { points: Point[]; area: number } | null = null;

  for (let i = 0; i < contours.size(); i++) {
    const contour = contours.get(i);
    const peri = cv.arcLength(contour, true);
    const approx = new cv.Mat();
    cv.approxPolyDP(contour, approx, 0.02 * peri, true);

    if (approx.rows === 4) {
      const area = cv.contourArea(approx);
      if (area > minArea && (!best || area > best.area)) {
        best = { points: extractPoints(approx), area };
      }
    }
    approx.delete();
  }

  return best ? orderCorners(best.points) : null;
}

/**
 * Applies perspective transform to straighten the receipt
 */
function applyPerspectiveTransform(
  src: typeof cv.Mat,
  corners: Point[]
): typeof cv.Mat {
  // Calculate output dimensions based on the receipt's actual proportions
  const widthTop = distance(corners[0], corners[1]);
  const widthBottom = distance(corners[3], corners[2]);
  const width = Math.round(Math.max(widthTop, widthBottom));

  const heightLeft = distance(corners[0], corners[3]);
  const heightRight = distance(corners[1], corners[2]);
  const height = Math.round(Math.max(heightLeft, heightRight));

  // Source points from detected corners
  const srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
    corners[0].x, corners[0].y,
    corners[1].x, corners[1].y,
    corners[2].x, corners[2].y,
    corners[3].x, corners[3].y,
  ]);

  // Destination points for the straightened image
  const dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0, 0,
    width - 1, 0,
    width - 1, height - 1,
    0, height - 1,
  ]);

  const M = cv.getPerspectiveTransform(srcPts, dstPts);
  const dst = new cv.Mat();
  cv.warpPerspective(src, dst, M, new cv.Size(width, height));

  // Cleanup
  srcPts.delete();
  dstPts.delete();
  M.delete();

  return dst;
}

/**
 * Auto-detects and deskews a receipt image using edge detection and perspective transform.
 * If no receipt contour is found, returns the original image unchanged.
 *
 * @param imageDataUrl - The input image as a base64 data URL
 * @returns The processed image as a base64 data URL
 */
export async function deskewReceipt(imageDataUrl: string): Promise<string> {
  try {
    await loadOpenCV();

    const img = await loadImageToMat(imageDataUrl);

    // Convert to grayscale
    const gray = new cv.Mat();
    cv.cvtColor(img, gray, cv.COLOR_RGBA2GRAY);

    // Apply Gaussian blur to reduce noise
    const blurred = new cv.Mat();
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

    // Edge detection using Canny
    const edges = new cv.Mat();
    cv.Canny(blurred, edges, 75, 200);

    // Find contours
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    // Find the largest quadrilateral (the receipt)
    const receiptCorners = findLargestQuadContour(contours, img.cols, img.rows);

    let result: typeof cv.Mat;
    if (receiptCorners) {
      // Apply perspective transform to straighten the receipt
      result = applyPerspectiveTransform(img, receiptCorners);
    } else {
      // No receipt detected - return original image
      result = img.clone();
    }

    const outputDataUrl = matToDataUrl(result);

    // Cleanup OpenCV objects
    img.delete();
    gray.delete();
    blurred.delete();
    edges.delete();
    contours.delete();
    hierarchy.delete();
    result.delete();

    return outputDataUrl;
  } catch (error) {
    console.error('Deskew failed, returning original image:', error);
    // Return original image on any error
    return imageDataUrl;
  }
}

/**
 * Checks if OpenCV is loaded (useful for preloading)
 */
export function isOpenCVLoaded(): boolean {
  return cv !== null;
}

/**
 * Preloads OpenCV.js without performing any operation
 * Call this during idle time to speed up first capture
 */
export async function preloadOpenCV(): Promise<void> {
  await loadOpenCV();
}
