"use client";

import { COMPANIES, type Company, isCompany } from "@/types/company";

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
        if (isCompany(e.target.value)) onChange(e.target.value);
      }}
      className={className}
    >
      {COMPANIES.map((company) => (
        <option key={company} value={company} translate="no">
          {company}
        </option>
      ))}
    </select>
  );
}
