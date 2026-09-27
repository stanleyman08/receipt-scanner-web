import { describe, expect, it, vi } from "vitest";
import { createBucketAction, deleteReceiptAction, saveReceiptAction, updateReceiptAction } from "@/app/actions";
import type { ReceiptDetails } from "@/types/receipt";

// Mocked at the boundaries: Better Auth finds no session, and the database fails the test if it's reached.
const { getSql } = vi.hoisted(() => ({ getSql: vi.fn() }));
vi.mock("@/lib/db/sql", () => ({ getSql }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn(async () => null) } } }));
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));

const bucket = { year: 2026, month: 3, category: "Food" as const };
const details: ReceiptDetails = {
  vendor: "Corner Grocery",
  receipt_date: "2026-03-28",
  invoice_number: null,
  subtotal_cents: 2000,
  gst_cents: 100,
  total_cents: 2100,
};
const receiptId = "3f6c1a9e-5b1d-4c8e-9a2f-1e2d3c4b5a69";

describe("server actions without a signed-in session", () => {
  it.each([
    ["createBucketAction", () => createBucketAction(bucket)],
    ["saveReceiptAction", () => saveReceiptAction(details, bucket)],
    ["updateReceiptAction", () => updateReceiptAction(receiptId, details, bucket)],
    ["deleteReceiptAction", () => deleteReceiptAction(receiptId)],
  ])("%s refuses and never touches the database", async (_name, run) => {
    await expect(run()).resolves.toEqual({ ok: false, error: expect.stringContaining("Sign in") });
    expect(getSql).not.toHaveBeenCalled();
  });
});
