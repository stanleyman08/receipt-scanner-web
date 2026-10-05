// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import EditReceiptModal from "@/components/EditReceiptModal";
import type { Receipt } from "@/types/receipt";

const MARCH_2026_SUPPLY = { company: "Carino", year: 2026, month: 3, category: "Supply" } as const;

const UNDATED: Receipt = {
  id: "receipt-1",
  bucket_id: "bucket-1",
  created_at: "2026-03-20T00:00:00Z",
  vendor: "Corner Grocery",
  receipt_date: null,
  invoice_number: null,
  subtotal_cents: 1000,
  gst_cents: 50,
  total_cents: 1050,
};

function renderDialog(receipt: Receipt) {
  const user = userEvent.setup();
  render(
    <EditReceiptModal
      receipt={receipt}
      receiptBucket={MARCH_2026_SUPPLY}
      buckets={[]}
      isSaving={false}
      onClose={vi.fn()}
      onSave={vi.fn()}
    />,
  );
  return { user };
}

describe("EditReceiptModal", () => {
  it("opens an empty date on the receipt's bucket month by filling in its 1st", async () => {
    const { user } = renderDialog(UNDATED);

    await user.click(screen.getByLabelText("Date"));

    expect(screen.getByLabelText("Date")).toHaveValue("2026-03-01");
  });

  it("leaves a date that's already filled in as it is", async () => {
    const { user } = renderDialog({ ...UNDATED, receipt_date: "2026-03-18" });

    await user.click(screen.getByLabelText("Date"));

    expect(screen.getByLabelText("Date")).toHaveValue("2026-03-18");
  });
});
