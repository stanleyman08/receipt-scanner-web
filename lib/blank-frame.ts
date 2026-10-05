// A camera can hand over solid black frames for a moment after it starts, before its picture comes through. A photo
// taken then reads as nothing, and still costs a Textract call, so the camera waits for a real frame.

// The brightest a pixel can be and still count as black, allowing for JPEG noise. Any real picture, even a dim one,
// has something brighter.
const BLACK_LUMINANCE = 24;
// Sampled small: telling black from a picture doesn't need the full photo.
const SAMPLE_SIZE = 32;

/** Whether RGBA pixels, as a canvas returns them, are all black. */
export function isBlankFrame(pixels: Uint8ClampedArray): boolean {
  for (let i = 0; i < pixels.length; i += 4) {
    const luminance = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
    if (luminance > BLACK_LUMINANCE) return false;
  }
  return true;
}

let sampleContext: CanvasRenderingContext2D | null | undefined;

/**
 * Whether a video's current frame is all black, sampled on one small canvas kept for every check. A frame that can't
 * be drawn yet counts as black. Without a canvas to check on, it never counts as black, so the camera is never held.
 */
export function isBlankSource(source: CanvasImageSource): boolean {
  if (sampleContext === undefined) {
    const canvas = document.createElement("canvas");
    canvas.width = SAMPLE_SIZE;
    canvas.height = SAMPLE_SIZE;
    sampleContext = canvas.getContext("2d", { willReadFrequently: true });
  }
  if (!sampleContext) return false;
  sampleContext.clearRect(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  sampleContext.drawImage(source, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  return isBlankFrame(sampleContext.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data);
}
