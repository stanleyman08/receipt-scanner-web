import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/scan-receipt/route";
import type { ReceiptDetails } from "@/types/receipt";

// Mocked at the boundaries: a signed-in session, Textract, and the database. `after` callbacks are collected so a
// test can run them once the response is back, as Next does.
const { analyzeReceipt, saveScan, afterCallbacks } = vi.hoisted(() => ({
  analyzeReceipt: vi.fn(),
  saveScan: vi.fn(),
  afterCallbacks: [] as (() => Promise<unknown>)[],
}));
vi.mock("@/lib/auth-session", () => ({ getSession: vi.fn(async () => ({ user: {} })), SIGNED_OUT_MESSAGE: "" }));
vi.mock("@/lib/textract", () => ({ analyzeReceipt }));
vi.mock("@/lib/receipt-store", () => ({ saveScan }));
vi.mock("@/lib/db/sql", () => ({ getSql: vi.fn(() => "sql") }));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (callback: () => Promise<unknown>) => afterCallbacks.push(callback),
}));

const details: ReceiptDetails = {
  vendor: "Corner Grocery",
  receipt_date: "2026-03-28",
  invoice_number: "A-1042",
  subtotal_cents: 2000,
  gst_cents: 100,
  total_cents: 2100,
};
// Made-up: only its shape matters.
const textract = { ExpenseDocuments: [{ SummaryFields: [] }] };
const photo = Buffer.from("not really a jpeg");

function scan() {
  const body = JSON.stringify({ image: `data:image/jpeg;base64,${photo.toString("base64")}` });
  return POST(new Request("http://localhost/api/scan-receipt", { method: "POST", body }) as NextRequest);
}

async function runAfterCallbacks() {
  for (const callback of afterCallbacks.splice(0)) await callback();
}

beforeEach(() => {
  vi.clearAllMocks();
  afterCallbacks.length = 0;
  analyzeReceipt.mockResolvedValue({ details, textract });
  saveScan.mockResolvedValue(undefined);
});

describe("scanning a receipt", () => {
  it("answers with the details read, then keeps what Textract returned and the photo's size", async () => {
    const response = await scan();
    expect(await response.json()).toEqual({ success: true, details });
    expect(saveScan).not.toHaveBeenCalled();

    await runAfterCallbacks();

    expect(saveScan).toHaveBeenCalledWith("sql", textract, photo.length);
  });

  it("still answers when keeping the scan fails, and logs why", async () => {
    saveScan.mockRejectedValue(new Error("database is down"));
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await scan();
    await runAfterCallbacks();

    expect(await response.json()).toEqual({ success: true, details });
    expect(logged).toHaveBeenCalledWith(
      "Error keeping scan:",
      expect.objectContaining({ message: "database is down" }),
    );
  });
});
