import { getRedirectUrl, isRewrite, unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { config, proxy } from "@/proxy";

const ORIGIN = "https://receipts.example";

// Whether Next runs the proxy for a request, read from its matcher the way Next reads it. The helper still has the
// name from before middleware became proxy.
function isChecked(url: string, headers?: Record<string, string>): boolean {
  return unstable_doesMiddlewareMatch({ config, url, headers });
}

describe("which requests the proxy checks", () => {
  it.each(["/", "/?company=Peko+Peko"])("checks the receipts page, %s", (url) => {
    expect(isChecked(url)).toBe(true);
  });

  it.each([
    "/login",
    "/api/auth/get-session",
    "/api/scan-receipt",
    "/_next/static/chunks/app.js",
    "/favicon.ico",
    "/receipt.png",
  ])("leaves %s alone: it's the sign-in page, checks the session itself, or is a static file", (url) => {
    expect(isChecked(url)).toBe(false);
  });

  it("leaves server actions alone, so a save can answer that the session ended", () => {
    expect(isChecked("/?company=Carino", { "next-action": "7f3a9c" })).toBe(false);
  });
});

describe("the proxy", () => {
  it("sends a visitor without a session cookie to the sign-in page", () => {
    const response = proxy(new NextRequest(`${ORIGIN}/?company=Carino`));
    expect(getRedirectUrl(response)).toBe(`${ORIGIN}/login`);
  });

  it("lets a visitor with a session cookie through, leaving the page to check the session", () => {
    const request = new NextRequest(`${ORIGIN}/?company=Carino`, {
      headers: { cookie: "__Secure-better-auth.session_token=token.signature" },
    });
    const response = proxy(request);
    expect(getRedirectUrl(response)).toBeNull();
    expect(isRewrite(response)).toBe(false);
  });
});
