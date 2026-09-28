import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createBucketAction,
  deleteReceiptAction,
  saveReceiptAction,
  selectCompanyAction,
  updateReceiptAction,
} from "@/app/actions";
import { auth } from "@/lib/auth";
import type { ReceiptDetails } from "@/types/receipt";

// Mocked at the boundaries: Better Auth finds no session unless a test signs in, the database fails the test if it's
// reached, and cookies and redirects are recorded. Like Next's own redirect, the mock throws.
const { getSql, cookieStore, redirect } = vi.hoisted(() => ({
  getSql: vi.fn(),
  cookieStore: { get: vi.fn(), set: vi.fn() },
  redirect: vi.fn((): never => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
vi.mock("@/lib/db/sql", () => ({ getSql }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn(async () => null) } } }));
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()), cookies: vi.fn(async () => cookieStore) }));
vi.mock("next/navigation", () => ({ redirect, RedirectType: { push: "push", replace: "replace" } }));

beforeEach(() => {
  vi.clearAllMocks();
});

const bucket = { company: "Carino" as const, year: 2026, month: 3, category: "Food" as const };
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
    ["selectCompanyAction", () => selectCompanyAction("Peko Peko")],
  ])("%s refuses and never touches the database", async (_name, run) => {
    await expect(run()).resolves.toEqual({ ok: false, error: expect.stringContaining("Sign in") });
    expect(getSql).not.toHaveBeenCalled();
  });
});

describe("server actions with a signed-in session", () => {
  // One cent more than the database's integer amount columns can hold ($21,474,836.47).
  const tooLarge: ReceiptDetails = { ...details, total_cents: 2_147_483_648 };

  it.each([
    ["saveReceiptAction", () => saveReceiptAction(tooLarge, bucket)],
    ["updateReceiptAction", () => updateReceiptAction(receiptId, tooLarge, bucket)],
  ])("%s refuses an amount too large to store, before touching the database", async (_name, run) => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ session: {}, user: {} } as never);
    await expect(run()).resolves.toEqual({ ok: false, error: expect.stringContaining("details look wrong") });
    expect(getSql).not.toHaveBeenCalled();
  });

  it("selectCompanyAction refuses a company that isn't one of the two", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ session: {}, user: {} } as never);
    await expect(selectCompanyAction("Carino Bakery" as never)).resolves.toEqual({
      ok: false,
      error: expect.stringContaining("details look wrong"),
    });
    expect(cookieStore.set).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("selectCompanyAction remembers the company on this device and moves the tab to that company's address", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({ session: {}, user: {} } as never);
    await expect(selectCompanyAction("Peko Peko")).rejects.toThrow("NEXT_REDIRECT");
    expect(cookieStore.set).toHaveBeenCalledWith("company", "Peko Peko", expect.objectContaining({ httpOnly: true }));
    expect(redirect).toHaveBeenCalledWith("/?company=Peko+Peko", "replace");
  });
});
