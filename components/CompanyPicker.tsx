"use client";

import { COMPANIES, type Company } from "@/types/company";

interface CompanyPickerProps {
  id: string;
  value: Company;
  onChange: (company: Company) => void;
  className?: string;
}

// Which company's books a receipt goes into, on the review screen and in the edit dialog.
export default function CompanyPicker({ id, value, onChange, className }: CompanyPickerProps) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => {
        const picked = COMPANIES.find((company) => company === e.target.value);
        if (picked) onChange(picked);
      }}
      className={className}
    >
      {COMPANIES.map((company) => (
        <option key={company} value={company}>
          {company}
        </option>
      ))}
    </select>
  );
}
