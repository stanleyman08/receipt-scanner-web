"use client";

import { COMPANIES, type Company } from "@/types/company";

interface CompanySwitcherProps {
  company: Company;
  isSwitching: boolean;
  onSwitch: (company: Company) => void;
}

// The company the whole screen shows. Each company keeps its own buckets, receipts and exports.
export default function CompanySwitcher({ company, isSwitching, onSwitch }: CompanySwitcherProps) {
  return (
    <fieldset className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
      <legend className="sr-only">Company</legend>
      {COMPANIES.map((option) => {
        const isSelected = option === company;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={isSelected}
            disabled={isSwitching}
            onClick={() => onSwitch(option)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:cursor-wait ${
              isSelected ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {option}
          </button>
        );
      })}
    </fieldset>
  );
}
