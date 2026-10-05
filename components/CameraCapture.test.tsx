// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { forwardRef, useImperativeHandle } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CameraCapture from "@/components/CameraCapture";

const { isBlankSource, getScreenshot } = vi.hoisted(() => ({ isBlankSource: vi.fn(), getScreenshot: vi.fn() }));
vi.mock("@/lib/blank-frame", () => ({ isBlankSource }));

// A stand-in for the camera, whose picture is whatever isBlankSource says it is.
vi.mock("react-webcam", () => ({
  default: forwardRef(function FakeWebcam(_props, ref) {
    useImperativeHandle(ref, () => ({ video: {}, getScreenshot }));
    return null;
  }),
}));

function renderCamera() {
  render(
    <CameraCapture onCapture={vi.fn()} onOpenCamera={vi.fn()} isLoading={false} isCameraOpen onCloseCamera={vi.fn()} />,
  );
}

// Past a few of the camera's checks on its picture.
function waitForFrames(ms = 300) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe("CameraCapture", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    isBlankSource.mockReset();
    getScreenshot.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("holds the shutter while the camera's frames are still black", () => {
    isBlankSource.mockReturnValue(true);
    renderCamera();

    waitForFrames();

    expect(screen.getByRole("button", { name: "Starting camera…" })).toBeDisabled();
  });

  it("offers the shutter once the camera shows a picture", () => {
    isBlankSource.mockReturnValueOnce(true).mockReturnValue(false);
    renderCamera();

    waitForFrames();

    expect(screen.getByRole("button", { name: "Capture" })).toBeEnabled();
  });

  it("takes the photo when the picture is still there as the shutter is pressed", () => {
    isBlankSource.mockReturnValue(false);
    renderCamera();
    waitForFrames();

    fireEvent.click(screen.getByRole("button", { name: "Capture" }));

    expect(getScreenshot).toHaveBeenCalled();
  });

  it("doesn't take the photo when the picture has gone black, and waits for it again", () => {
    isBlankSource.mockReturnValueOnce(false).mockReturnValue(true);
    renderCamera();
    waitForFrames(100);

    fireEvent.click(screen.getByRole("button", { name: "Capture" }));

    expect(getScreenshot).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Starting camera…" })).toBeDisabled();
  });

  it("says what to do when the camera shows no picture for a while", () => {
    isBlankSource.mockReturnValue(true);
    renderCamera();

    waitForFrames(5000);

    expect(
      screen.getByText("The camera isn't showing a picture. Close it and open it again, or reload the page."),
    ).toBeInTheDocument();
  });
});
