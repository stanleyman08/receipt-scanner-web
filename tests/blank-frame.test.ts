import { describe, expect, it } from "vitest";
import { isBlankFrame } from "@/lib/blank-frame";

// RGBA pixels, as a canvas returns them: every pixel the given colour, with an optional brighter pixel among them.
function pixels(count: number, [r, g, b]: [number, number, number], bright?: [number, number, number]) {
  const data = new Uint8ClampedArray(count * 4);
  for (let i = 0; i < data.length; i += 4) data.set([r, g, b, 255], i);
  if (bright) data.set([...bright, 255], data.length - 4);
  return data;
}

describe("isBlankFrame", () => {
  it("is blank when every pixel is black, as a camera's frames are before its picture starts", () => {
    expect(isBlankFrame(pixels(64, [0, 0, 0]))).toBe(true);
  });

  it("is blank when the black has a little JPEG noise in it", () => {
    expect(isBlankFrame(pixels(64, [6, 4, 8]))).toBe(true);
  });

  it("isn't blank when any part of the picture shows something, like the edge of a white receipt", () => {
    expect(isBlankFrame(pixels(64, [0, 0, 0], [230, 230, 225]))).toBe(false);
  });

  it("isn't blank for a dim but real picture", () => {
    expect(isBlankFrame(pixels(64, [60, 55, 50]))).toBe(false);
  });

  it("is blank when there are no pixels at all", () => {
    expect(isBlankFrame(new Uint8ClampedArray(0))).toBe(true);
  });
});
