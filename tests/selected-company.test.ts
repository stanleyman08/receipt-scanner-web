import { describe, expect, it, vi } from "vitest";
import { companyPath, getSelectedCompany } from "@/lib/selected-company";
import { COMPANIES } from "@/types/company";

const { cookieStore } = vi.hoisted(() => ({ cookieStore: { get: vi.fn() } }));
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => cookieStore) }));

describe("the company a device opens on", () => {
  it.each([
    ["the one it last switched to", { value: "Peko Peko" }, "Peko Peko"],
    ["Carino before it has switched", undefined, "Carino"],
    ["Carino when the cookie names no company", { value: "Acme" }, "Carino"],
  ])("is %s", async (_case, cookie, expected) => {
    cookieStore.get.mockReturnValueOnce(cookie);
    await expect(getSelectedCompany()).resolves.toBe(expected);
  });
});

describe("a company's address", () => {
  it.each(COMPANIES)("is the main page with %s in it", (company) => {
    const address = new URL(companyPath(company), "https://receipts.example");
    expect(address.pathname).toBe("/");
    expect(address.searchParams.get("company")).toBe(company);
  });
});
