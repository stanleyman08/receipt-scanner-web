// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import EditScreen from "@/components/capture-flow/EditScreen";
import { reviewOfScan } from "@/lib/bucket";
import type { ReceiptReview } from "@/types/capture-flow";

const APRIL_2026_FOOD = { company: "Carino", year: 2026, month: 4, category: "Food" } as const;

const SCANNED: ReceiptReview = {
  details: {
    vendor: "Superstore",
    receipt_date: "2026-04-12",
    invoice_number: "448816",
    subtotal_cents: 1000,
    gst_cents: 50,
    total_cents: 1050,
  },
  bucket: APRIL_2026_FOOD,
  pickedByHand: false,
  selected: APRIL_2026_FOOD,
};

function renderReview(review: ReceiptReview = SCANNED) {
  const user = userEvent.setup();
  const onConfirm = vi.fn();
  const onRetake = vi.fn();
  render(
    <EditScreen
      imageData="data:image/jpeg;base64,"
      review={review}
      buckets={[]}
      onConfirm={onConfirm}
      onRetake={onRetake}
    />,
  );
  return { user, onConfirm, onRetake };
}

describe("EditScreen", () => {
  it("files the receipt under the company tapped", async () => {
    const { user, onConfirm } = renderReview();

    await user.click(screen.getByRole("radio", { name: "Peko Peko" }));
    await user.click(screen.getByRole("button", { name: "Save Receipt" }));

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ bucket: { ...APRIL_2026_FOOD, company: "Peko Peko" } }),
    );
  });

  it("keeps a scan in the bucket scanned into when its receipt date is in another month, even once corrected", async () => {
    const { user, onConfirm } = renderReview(
      reviewOfScan({ ...SCANNED.details, receipt_date: "2026-03-30" }, APRIL_2026_FOOD),
    );

    await user.clear(screen.getByLabelText("Date"));
    await user.type(screen.getByLabelText("Date"), "2026-02-14");
    await user.click(screen.getByRole("button", { name: "Save Receipt" }));

    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ bucket: APRIL_2026_FOOD }));
  });

  it("points out a receipt date in another month than the bucket", () => {
    renderReview(reviewOfScan({ ...SCANNED.details, receipt_date: "2026-03-30" }, APRIL_2026_FOOD));

    expect(screen.getByLabelText("Bucket")).toHaveAccessibleDescription(
      "The receipt date is in March 2026, not this bucket's month.",
    );
  });

  it("says nothing when the receipt date is in the bucket's month", () => {
    renderReview(reviewOfScan(SCANNED.details, APRIL_2026_FOOD));

    expect(screen.getByLabelText("Bucket")).not.toHaveAccessibleDescription();
  });

  it("refuses an amount that isn't a plain number", async () => {
    const { user, onConfirm } = renderReview();

    await user.clear(screen.getByLabelText("Total"));
    await user.type(screen.getByLabelText("Total"), "twelve");
    await user.click(screen.getByRole("button", { name: "Save Receipt" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Enter amounts as plain numbers, like 12.50.");
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("retakes without saving", async () => {
    const { user, onConfirm, onRetake } = renderReview();

    await user.click(screen.getByRole("button", { name: "Retake" }));

    expect(onRetake).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
