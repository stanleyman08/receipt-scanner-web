'use client';

interface ErrorScreenProps {
  imageData: string;
  error: string;
  onRetake: () => void;
  onRetry: () => void;
}

export default function ErrorScreen({ imageData, error, onRetake, onRetry }: ErrorScreenProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md">
        {/* Error header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-amber-500 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Couldn&apos;t Read Receipt</h2>
          <p className="text-gray-400 text-center text-sm">{error}</p>
        </div>

        {/* Thumbnail with error overlay */}
        <div className="relative rounded-2xl overflow-hidden mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageData}
            alt="Failed receipt"
            className="w-full h-48 object-cover opacity-50"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-black/60 px-4 py-2 rounded-full">
              <span className="text-white text-sm">Image may be unclear</span>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-gray-900 rounded-xl p-4 mb-6">
          <p className="text-gray-400 text-sm font-medium mb-3">Tips for better results:</p>
          <ul className="space-y-2 text-sm text-gray-500">
            <li className="flex items-start gap-2">
              <span className="text-gray-600">•</span>
              <span>Ensure the receipt is flat and not crumpled</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-600">•</span>
              <span>Make sure there&apos;s good lighting</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-600">•</span>
              <span>Hold the camera steady to avoid blur</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-600">•</span>
              <span>Include the entire receipt in frame</span>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={onRetake}
            className="flex-1 px-6 py-4 rounded-full font-medium text-gray-300 border-2 border-gray-600 hover:bg-gray-800 transition-colors"
          >
            Retake Photo
          </button>
          <button
            onClick={onRetry}
            className="flex-1 px-6 py-4 rounded-full font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
