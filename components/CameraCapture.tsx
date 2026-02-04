'use client';

import { useCallback, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { Bucket, formatBucketLabel } from '@/types/bucket';

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onOpenCamera: () => void;
  isLoading: boolean;
  isCameraOpen: boolean;
  onCloseCamera: () => void;
  disabled?: boolean;
  selectedBucket?: Bucket | null;
}

// Overlay margin (10% on each side = 80% capture area)
const OVERLAY_MARGIN = 0.1;

/**
 * Crops the captured image to the overlay area (center 80%)
 */
function cropToOverlay(imageDataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const cropX = img.width * OVERLAY_MARGIN;
      const cropY = img.height * OVERLAY_MARGIN;
      const cropWidth = img.width * (1 - 2 * OVERLAY_MARGIN);
      const cropHeight = img.height * (1 - 2 * OVERLAY_MARGIN);

      canvas.width = cropWidth;
      canvas.height = cropHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = () => {
      // On error, return original image
      resolve(imageDataUrl);
    };
    img.src = imageDataUrl;
  });
}

export default function CameraCapture({
  onCapture,
  onOpenCamera,
  isLoading,
  isCameraOpen,
  onCloseCamera,
  disabled = false,
  selectedBucket,
}: CameraCaptureProps) {
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showFlash, setShowFlash] = useState(false);

  const videoConstraints = {
    facingMode: 'environment',
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  };

  const handleCapture = useCallback(() => {
    if (webcamRef.current) {
      // Trigger flash effect
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 150);

      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        // Crop to overlay area before passing to parent
        cropToOverlay(imageSrc).then(croppedImage => {
          onCapture(croppedImage);
        });
      }
    }
  }, [onCapture]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        onCapture(result);
      };
      reader.readAsDataURL(file);
    }
    // Reset input so the same file can be selected again
    event.target.value = '';
  };

  const handleCameraError = () => {
    setCameraError('Unable to access camera. Please use the file upload option.');
    onCloseCamera();
  };

  const handleStartCamera = () => {
    setCameraError(null);
    onOpenCamera();
  };

  if (isCameraOpen) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={videoConstraints}
          onUserMediaError={handleCameraError}
          className="flex-1 object-cover w-full h-full"
        />

        {/* Receipt positioning overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Darkened background outside frame */}
          <div
            className="absolute inset-0 bg-black/50"
            style={{
              clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, 10% 10%, 10% 90%, 90% 90%, 90% 10%, 10% 10%)',
            }}
          />

          {/* Receipt frame with corner markers */}
          <div className="absolute left-[10%] right-[10%] top-[10%] bottom-[10%] border-2 border-white/70 rounded-lg">
            {/* Top-left corner */}
            <div className="absolute -top-0.5 -left-0.5 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
            {/* Top-right corner */}
            <div className="absolute -top-0.5 -right-0.5 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
            {/* Bottom-left corner */}
            <div className="absolute -bottom-0.5 -left-0.5 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
            {/* Bottom-right corner */}
            <div className="absolute -bottom-0.5 -right-0.5 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
          </div>

          {/* Instruction text */}
          <p className="absolute top-4 left-0 right-0 text-center text-white text-sm font-medium drop-shadow-lg">
            Position receipt within the frame
          </p>
        </div>

        {/* Flash overlay */}
        {showFlash && (
          <div className="absolute inset-0 bg-white animate-flash pointer-events-none" />
        )}

        <div className="absolute bottom-0 left-0 right-0 pb-8 pt-4 bg-gradient-to-t from-black/70 to-transparent">
          <div className="flex justify-center gap-6">
            <button
              onClick={onCloseCamera}
              className="bg-gray-600 text-white px-6 py-4 rounded-full font-medium shadow-lg hover:bg-gray-700 text-lg"
            >
              Close
            </button>
            <button
              onClick={handleCapture}
              disabled={isLoading}
              className="bg-white text-gray-800 px-8 py-4 rounded-full font-medium shadow-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              Capture
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full md:max-w-md mx-auto">
      <div className="md:bg-gray-100 md:rounded-lg overflow-hidden">
        <div className="md:p-8 md:text-center">
          {cameraError && (
            <p className="text-red-600 mb-4 text-sm text-center">{cameraError}</p>
          )}
          {/* Bucket indicator - hidden on mobile */}
          {selectedBucket && (
            <p className="hidden md:block text-gray-600 mb-4 text-sm">
              Scanning into: {formatBucketLabel(selectedBucket)}
            </p>
          )}
          <div className="flex md:flex-col gap-3 md:space-y-4 md:gap-0">
            <button
              onClick={handleStartCamera}
              disabled={isLoading || disabled}
              className="flex-1 md:flex-none md:w-full bg-blue-600 text-white px-4 md:px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:hidden" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              <span className="md:hidden">{disabled ? 'Select Bucket' : 'Camera'}</span>
              <span className="hidden md:inline">{disabled ? 'Select a Bucket First' : 'Open Camera'}</span>
            </button>
            {/* Divider - hidden on mobile */}
            <div className="hidden md:block relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-100 text-gray-500">or</span>
              </div>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || disabled}
              className="flex-1 md:flex-none md:w-full bg-gray-200 text-gray-800 px-4 md:px-6 py-3 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:hidden" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="md:hidden">Upload</span>
              <span className="hidden md:inline">Upload Photo</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
