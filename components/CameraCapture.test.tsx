// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { forwardRef, useEffect, useImperativeHandle } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CameraCapture from "@/components/CameraCapture";

const { isBlankSource } = vi.hoisted(() => ({ isBlankSource: vi.fn() }));
vi.mock("@/lib/blank-frame", () => ({ isBlankSource }));

// A stand-in for the camera: it starts its stream as it mounts, and its screenshot is a made-up photo.
vi.mock("react-webcam", () => ({
  default: forwardRef<unknown, { onUserMedia?: () => void }>(function FakeWebcam({ onUserMedia }, ref) {
    useImperativeHandle(ref, () => ({ video: {}, getScreenshot: () => "data:image/jpeg;base64," }));
    useEffect(() => onUserMedia?.(), [onUserMedia]);
    return null;
  }),
}));

function renderCamera() {
  render(
    <CameraCapture onCapture={vi.fn()} onOpenCamera={vi.fn()} isLoading={false} isCameraOpen onCloseCamera={vi.fn()} />,
  );
}

describe("CameraCapture", () => {
  beforeEach(() => {
    isBlankSource.mockReset();
  });

  it("holds the shutter while the camera's frames are still black", () => {
    isBlankSource.mockReturnValue(true);
    renderCamera();

    expect(screen.getByRole("button", { name: "Starting camera…" })).toBeDisabled();
  });

  it("offers the shutter once the camera shows a picture", async () => {
    isBlankSource.mockReturnValueOnce(true).mockReturnValue(false);
    renderCamera();

    expect(await screen.findByRole("button", { name: "Capture" })).toBeEnabled();
  });
});
