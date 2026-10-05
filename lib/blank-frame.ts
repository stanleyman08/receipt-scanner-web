// A camera can hand over solid black frames for a moment after it starts, before its picture comes through. A photo
// taken then reads as nothing, and still costs a Textract call, so the camera waits for a real frame and a black
// photo is never sent.

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

/** Whether a video's current frame, or an image, is all black. Counts as black when it can't be drawn yet. */
export function isBlankSource(source: CanvasImageSource): boolean {
  const canvas = document.createElement("canvas");
  canvas.width = SAMPLE_SIZE;
  canvas.height = SAMPLE_SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return true;
  ctx.drawImage(source, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  return isBlankFrame(ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data);
}

/** Whether a photo, as a data URL, is all black. */
export function isBlankPhoto(imageDataUrl: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(isBlankSource(img));
    img.onerror = () => reject(new Error("The photo couldn't be opened"));
    img.src = imageDataUrl;
  });
}
