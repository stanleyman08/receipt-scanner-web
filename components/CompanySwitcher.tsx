"use client";

import { useEffect, useRef } from "react";
import { COMPANIES, type Company } from "@/types/company";

interface CompanySwitcherProps {
  /** The company the screen shows, or the one it's switching to. */
  company: Company;
  isSwitching: boolean;
  onSwitch: (company: Company) => void;
}

// A switch starts the whole screen afresh, switcher included, so the new switcher puts focus back on the company
// that was chosen. Kept outside the component because the component itself is replaced.
let isFocusPending = false;

// The company the whole screen shows. Each company keeps its own buckets, receipts and exports.
export default function CompanySwitcher({ company, isSwitching, onSwitch }: CompanySwitcherProps) {
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isFocusPending) return;
    isFocusPending = false;
    selectedRef.current?.focus();
  }, []);

  const handleClick = (option: Company) => {
    if (isSwitching || option === company) return;
    isFocusPending = true;
    onSwitch(option);
  };

  return (
    <fieldset aria-busy={isSwitching} className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
      <legend className="sr-only">Company</legend>
      {COMPANIES.map((option) => {
        const isSelected = option === company;
        return (
          <button
            key={option}
            ref={isSelected ? selectedRef : undefined}
            type="button"
            translate="no"
            aria-pressed={isSelected}
            aria-disabled={isSwitching}
            onClick={() => handleClick(option)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              isSelected ? "bg-gray-900 text-white" : "text-gray-600"
            } ${isSwitching ? "cursor-wait" : isSelected ? "" : "hover:bg-gray-100"}`}
          >
            {option}
          </button>
        );
      })}
      <span role="status" className="sr-only">
        {isSwitching ? `Switching to ${company}…` : ""}
      </span>
    </fieldset>
  );
}
