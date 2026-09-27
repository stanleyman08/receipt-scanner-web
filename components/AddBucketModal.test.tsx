// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AddBucketModal from "@/components/AddBucketModal";
import type { Bucket } from "@/types/bucket";

async function openModal(existingBuckets: Bucket[] = []) {
  const user = userEvent.setup();
  const onAdd = vi.fn();
  render(<AddBucketModal isOpen existingBuckets={existingBuckets} onClose={vi.fn()} onAdd={onAdd} />);
  // The modal resets its fields and focuses the year one tick after opening.
  await waitFor(() => expect(screen.getByLabelText("Year")).toHaveFocus());
  return { user, onAdd };
}

async function submitBucketForm(user: UserEvent, year: string, month: string, category: string) {
  await user.clear(screen.getByLabelText("Year"));
  await user.type(screen.getByLabelText("Year"), year);
  await user.selectOptions(screen.getByLabelText("Month"), month);
  await user.selectOptions(screen.getByLabelText("Category"), category);
  await user.click(screen.getByRole("button", { name: "Create Bucket" }));
}

describe("AddBucketModal", () => {
  it("creates a bucket for the chosen year, month and category", async () => {
    const { user, onAdd } = await openModal();

    await submitBucketForm(user, "2025", "March", "Supply");

    expect(onAdd).toHaveBeenCalledWith(2025, 3, "Supply");
  });

  it("refuses a bucket that already exists", async () => {
    const march2025Supply: Bucket = {
      id: "2025-03-supply",
      year: 2025,
      month: 3,
      category: "Supply",
      created_at: "2026-01-01T00:00:00Z",
    };
    const { user, onAdd } = await openModal([march2025Supply]);

    await submitBucketForm(user, "2025", "March", "Supply");

    expect(screen.getByText("This bucket already exists")).toBeInTheDocument();
    expect(onAdd).not.toHaveBeenCalled();
  });
});
