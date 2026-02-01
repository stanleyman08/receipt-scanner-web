'use client';

import { ProcessingStage } from '@/types/capture-flow';

interface ProcessingScreenProps {
  imageData: string;
  stage: ProcessingStage;
  onCancel: () => void;
}

const stages: { key: ProcessingStage; label: string }[] = [
  { key: 'optimizing', label: 'Optimizing image' },
  { key: 'analyzing', label: 'Analyzing receipt' },
  { key: 'extracting', label: 'Extracting data' },
];

function getStageStatus(currentStage: ProcessingStage, stageKey: ProcessingStage): 'complete' | 'current' | 'pending' {
  const currentIndex = stages.findIndex(s => s.key === currentStage);
  const stageIndex = stages.findIndex(s => s.key === stageKey);

  if (stageIndex < currentIndex) return 'complete';
  if (stageIndex === currentIndex) return 'current';
  return 'pending';
}

export default function ProcessingScreen({ imageData, stage, onCancel }: ProcessingScreenProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4">
      {/* Dimmed image background */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageData}
          alt="Processing receipt"
          className="max-h-full max-w-full object-contain opacity-40"
        />
      </div>

      {/* Progress card overlay */}
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-slide-up">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <h3 className="text-lg font-semibold text-gray-900">Processing Receipt</h3>
        </div>

        <ul className="space-y-3">
          {stages.map(({ key, label }) => {
            const status = getStageStatus(stage, key);
            return (
              <li key={key} className="flex items-center gap-3">
                {status === 'complete' && (
                  <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-xs">
                    ✓
                  </span>
                )}
                {status === 'current' && (
                  <span className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                )}
                {status === 'pending' && (
                  <span className="w-5 h-5 rounded-full border-2 border-gray-300" />
                )}
                <span className={`text-sm ${status === 'pending' ? 'text-gray-400' : 'text-gray-700'}`}>
                  {label}
                </span>
              </li>
            );
          })}
        </ul>

        <button
          onClick={onCancel}
          className="mt-6 w-full py-2 text-gray-500 hover:text-gray-700 text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
